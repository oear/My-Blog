/**
 * 文章管理系统
 * 负责文章的加载、解析、索引、查询
 * 线程安全、资源管理完善
 */

import { Article, ArticleFilter, ArticleList, Logger } from './types'
import {
  parseFrontmatter,
  calculateReadingTime,
  extractSummary,
  sortArticles,
  filterArticles,
} from './utils'

export interface ArticleManagerConfig {
  includeDrafts?: boolean
  defaultAuthor?: string
  logger?: Logger
  maxArticles?: number
}

/**
 * 文章管理核心类
 * 遵循单一职责原则，可扩展
 */
export class ArticleManager {
  private articles: Map<string, Article> = new Map()
  private config: ArticleManagerConfig
  private logger: Logger
  private disposed = false

  constructor(config: ArticleManagerConfig = {}) {
    if (config.maxArticles !== undefined && config.maxArticles <= 0) {
      throw new RangeError('maxArticles must be greater than 0')
    }

    this.config = {
      maxArticles: 10000,
      ...config,
    }
    this.logger = config.logger || createDefaultLogger()
  }

  /**
   * 检查是否已释放
   */
  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('ArticleManager has been disposed')
    }
  }

  /**
   * 添加文章
   */
  addArticle(article: Article): void {
    this.checkDisposed()

    if (!article || typeof article.id !== 'string') {
      throw new TypeError('Invalid article: id must be a non-empty string')
    }

    if (this.articles.size >= (this.config.maxArticles || 10000)) {
      this.logger.warn(`Article count exceeded limit: ${this.config.maxArticles}`)
    }

    this.articles.set(article.id, Object.freeze(article) as Article)
    this.logger.debug(`Article added: ${article.id}`)
  }

  /**
   * 从 Markdown 内容创建文章
   */
  createArticleFromMarkdown(
    id: string,
    content: string,
    _filePath?: string
  ): Article {
    if (typeof id !== 'string' || !id.trim()) {
      throw new TypeError('id must be a non-empty string')
    }

    if (typeof content !== 'string') {
      throw new TypeError('content must be a string')
    }

    const { data, content: body } = parseFrontmatter(content)

    // 类型安全的数据提取
    const title = String(data['title'] || id).trim()
    const description = String(data['description'] || extractSummary(body)).trim()
    const date = data['date'] ? new Date(data['date'] as string | number) : new Date()
    const author = data['author'] ? String(data['author']).trim() : this.config.defaultAuthor

    // 验证日期有效性
    if (Number.isNaN(date.getTime())) {
      this.logger.warn(`Invalid date for article ${id}, using current date`)
    }

    // 安全地转换数组字段
    const tags = Array.isArray(data['tags'])
      ? data['tags'].map((t) => String(t).trim()).filter((t) => t.length > 0)
      : []

    const categories = Array.isArray(data['categories'])
      ? data['categories'].map((c) => String(c).trim()).filter((c) => c.length > 0)
      : []

    const keywords = Array.isArray(data['keywords'])
      ? data['keywords'].map((k) => String(k).trim()).filter((k) => k.length > 0)
      : undefined

    const article: Article = {
      id,
      title: title || id,
      description,
      content: body,
      date,
      ...(data['updated'] 
        ? { updated: new Date(data['updated'] as string | number) } 
        : {}),
      ...(author 
        ? { author } 
        : {}),
      tags: Object.freeze(tags) as readonly string[],
      categories: Object.freeze(categories) as readonly string[],
      ...(data['image']
        ? { image: String(data['image']).trim() }
        : {}),
      draft: data['draft'] === true,
      ...(keywords 
        ? { keywords: Object.freeze(keywords) as readonly string[] } 
        : {}),
      ...(data['meta']
        ? { meta: Object.freeze(data['meta']) }
        : {}),
      raw: content,
      readingTime: calculateReadingTime(body),
    }

    return Object.freeze(article) as Article
  }

  /**
   * 获取所有文章
   */
  getArticles(): readonly Article[] {
    this.checkDisposed()

    let articles = Array.from(this.articles.values())

    if (!this.config.includeDrafts) {
      articles = articles.filter((a) => !a.draft)
    }

    return Object.freeze(articles) as readonly Article[]
  }

  /**
   * 按 ID 获取文章
   */
  getArticleById(id: string): Article | undefined {
    this.checkDisposed()

    if (typeof id !== 'string') {
      return undefined
    }

    return this.articles.get(id)
  }

  /**
   * 获取文章列表（带过滤和排序）
   */
  getArticleList(
    filter?: ArticleFilter,
    options?: {
      sort?: 'asc' | 'desc'
      page?: number
      pageSize?: number
    }
  ): ArticleList {
    this.checkDisposed()

    let articles = this.getArticles() as Article[]

    // 应用过滤
    if (filter) {
      const filterObj: { tag?: string; category?: string; year?: number } = {}
      if (filter.tag !== undefined) filterObj.tag = filter.tag
      if (filter.category !== undefined) filterObj.category = filter.category
      if (filter.year !== undefined) filterObj.year = filter.year
      
      articles = filterArticles(articles, filterObj) as Article[]

      // 搜索过滤
      if (filter.search && typeof filter.search === 'string') {
        const query = filter.search.toLowerCase()
        articles = articles.filter(
          (article) =>
            article.title.toLowerCase().includes(query) ||
            article.description.toLowerCase().includes(query) ||
            article.content.toLowerCase().includes(query)
        )
      }
    }

    const total = articles.length

    // 排序
    articles = sortArticles(articles, options?.sort || 'desc') as Article[]

    // 分页
    if (options?.page && options?.pageSize) {
      const page = Math.max(1, Math.floor(options.page))
      const pageSize = Math.max(1, Math.floor(options.pageSize))

      const start = (page - 1) * pageSize
      const end = start + pageSize

      articles = articles.slice(start, end)
    }

    return Object.freeze({
      items: Object.freeze(articles),
      total,
      filtered: articles.length,
    }) as ArticleList
  }

  /**
   * 获取相关文章
   */
  getRelatedArticles(articleId: string, limit: number = 3): readonly Article[] {
    this.checkDisposed()

    if (typeof articleId !== 'string') {
      return []
    }

    const article = this.articles.get(articleId)
    if (!article) return []

    limit = Math.max(1, Math.min(100, Math.floor(limit)))

    const candidates = this.getArticles().filter((a) => a.id !== articleId)

    // 计算相关性分数
    const scored = candidates.map((candidate) => {
      let score = 0

      // 相同标签
      for (const tag of article.tags) {
        if (candidate.tags.includes(tag)) {
          score += 10
        }
      }

      // 相同分类
      for (const cat of article.categories) {
        if (candidate.categories.includes(cat)) {
          score += 15
        }
      }

      // 相同作者
      if (article.author && article.author === candidate.author) {
        score += 5
      }

      return { article: candidate, score }
    })

    // 按分数排序并返回
    const related = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.article)

    return Object.freeze(related) as readonly Article[]
  }

  /**
   * 获取标签统计
   */
  getTagStats(): ReadonlyMap<string, number> {
    this.checkDisposed()

    const stats = new Map<string, number>()

    for (const article of this.getArticles()) {
      for (const tag of article.tags) {
        stats.set(tag, (stats.get(tag) || 0) + 1)
      }
    }

    return stats
  }

  /**
   * 获取分类统计
   */
  getCategoryStats(): ReadonlyMap<string, number> {
    this.checkDisposed()

    const stats = new Map<string, number>()

    for (const article of this.getArticles()) {
      for (const category of article.categories) {
        stats.set(category, (stats.get(category) || 0) + 1)
      }
    }

    return stats
  }

  /**
   * 获取博客统计
   */
  getStats() {
    this.checkDisposed()

    const articles = this.getArticles()
    let totalWords = 0
    let totalReadingTime = 0

    for (const article of articles) {
      totalWords += article.content.split(/\s+/).filter((w) => w.length > 0).length
      totalReadingTime += article.readingTime || 0
    }

    return Object.freeze({
      totalArticles: articles.length,
      totalTags: this.getTagStats().size,
      totalCategories: this.getCategoryStats().size,
      totalWords,
      averageReadingTime: articles.length > 0 ? Math.round(totalReadingTime / articles.length) : 0,
    })
  }

  /**
   * 清空所有文章
   */
  clear(): void {
    this.checkDisposed()

    this.articles.clear()
    this.logger.debug('All articles cleared')
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.clear()
    this.disposed = true
    this.logger.debug('ArticleManager disposed')
  }
}

/**
 * 默认日志器
 */
function createDefaultLogger(): Logger {
  return {
    info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
    warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
    error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
    debug: (message, ...args) => console.debug(`[DEBUG] ${message}`, ...args),
  }
}

/**
 * 创建全局文章管理器单例
 */
let globalArticleManager: ArticleManager | null = null

export function createArticleManager(config?: ArticleManagerConfig): ArticleManager {
  if (!globalArticleManager) {
    globalArticleManager = new ArticleManager(config)
  }
  return globalArticleManager
}

export function getArticleManager(): ArticleManager {
  if (!globalArticleManager) {
    globalArticleManager = new ArticleManager()
  }
  return globalArticleManager
}

/**
 * 销毁全局单例
 */
export function disposeArticleManager(): void {
  if (globalArticleManager) {
    globalArticleManager.dispose()
    globalArticleManager = null
  }
}
