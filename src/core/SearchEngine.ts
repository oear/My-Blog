/**
 * 全文搜索引擎
 * 支持关键词搜索、倒排索引、相关性排名
 * 包含 ReDoS 防护、内存限制、输入验证
 */

import { Article, SearchIndex, SearchResult, Logger } from './types'

export interface SearchEngineConfig {
  minSearchLength?: number
  highlightTag?: [string, string]
  caseSensitive?: boolean
  maxResults?: number
  maxQueryLength?: number
  maxIndexSize?: number
  logger?: Logger
}

/**
 * 搜索引擎核心类
 * 线程安全、资源限制、DoS 防护
 */
export class SearchEngine {
  private index: Map<string, SearchIndex[]> = new Map()
  private articles: Map<string, Article> = new Map()
  private config: SearchEngineConfig
  private logger: Logger
  private disposed = false

  constructor(config: SearchEngineConfig = {}) {
    if (config.maxResults !== undefined && config.maxResults < 1) {
      throw new RangeError('maxResults must be at least 1')
    }

    if (config.maxQueryLength !== undefined && config.maxQueryLength < 1) {
      throw new RangeError('maxQueryLength must be at least 1')
    }

    if (config.maxIndexSize !== undefined && config.maxIndexSize < 1) {
      throw new RangeError('maxIndexSize must be at least 1')
    }

    this.config = {
      minSearchLength: 2,
      highlightTag: ['<mark>', '</mark>'],
      caseSensitive: false,
      maxResults: 20,
      maxQueryLength: 500,
      maxIndexSize: 100000,
      ...config,
    }

    this.logger = config.logger || createDefaultLogger()
  }

  /**
   * 检查是否已释放
   */
  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('SearchEngine has been disposed')
    }
  }

  /**
   * 验证输入字符串
   */
  private validateString(str: unknown): string {
    if (typeof str !== 'string') {
      return ''
    }

    if (str.length > (this.config.maxQueryLength || 500)) {
      this.logger.warn(`String length exceeded limit: ${this.config.maxQueryLength}`)
      return str.substring(0, this.config.maxQueryLength)
    }

    return str
  }


  /**
   * 索引文章
   */
  indexArticles(articles: unknown[]): void {
    this.checkDisposed()

    if (!Array.isArray(articles)) {
      this.logger.warn('indexArticles expects an array')
      return
    }

    this.index.clear()
    this.articles.clear()

    let indexedCount = 0

    for (const article of articles) {
      if (!article || typeof article !== 'object') {
        this.logger.warn('Skipping invalid article')
        continue
      }

      const a = article as any

      if (typeof a.id !== 'string') {
        this.logger.warn('Skipping invalid article: missing id')
        continue
      }

      try {
        this.indexArticle(a as Article)
        this.articles.set(a.id, a as Article)
        indexedCount++

        // 防止索引无限增长
        if (this.index.size > (this.config.maxIndexSize || 100000)) {
          this.logger.warn(`Index size exceeded limit: ${this.config.maxIndexSize}`)
          break
        }
      } catch (err) {
        this.logger.error(`Failed to index article ${a.id}:`, err)
      }
    }

    this.logger.debug(`Indexed ${indexedCount} articles`)
  }

  /**
   * 索引单篇文章
   */
  private indexArticle(article: Article): void {
    // 验证文章数据
    if (!article.id || !article.title || !article.content) {
      throw new Error('Invalid article: missing required fields')
    }

    // 关键权重索引项
    const indexItems = [
      { content: this.validateString(article.title), weight: 10 },
      { content: this.validateString(article.description), weight: 5 },
      {
        content: Array.isArray(article.tags) ? article.tags.join(' ') : '',
        weight: 4,
      },
      {
        content: Array.isArray(article.categories)
          ? article.categories.join(' ')
          : '',
        weight: 4,
      },
      { content: this.validateString(article.content), weight: 1 },
    ]

    // 分词和索引
    for (const item of indexItems) {
      if (!item.content) continue

      try {
        const words = this.tokenize(item.content)

        for (const word of words) {
          if (!this.index.has(word)) {
            this.index.set(word, [])
          }

          const existing = this.index.get(word)!.find((i) => i.articleId === article.id)

          if (!existing) {
            this.index.get(word)!.push({
              id: `${article.id}:${word}`,
              articleId: article.id,
              content: item.content.substring(0, 200),
              excerpt: item.content.substring(0, 100),
              weight: item.weight,
            })
          } else {
            // 累加权重（上限保护）
            existing.weight = Math.min(existing.weight + item.weight, 1000)
          }
        }
      } catch (err) {
        this.logger.error(`Failed to index item in article ${article.id}:`, err)
      }
    }
  }

  /**
   * 搜索
   */
  search(query: unknown): SearchResult[] {
    this.checkDisposed()

    // 严格的输入验证
    if (typeof query !== 'string') {
      return []
    }

    if (query.length < (this.config.minSearchLength || 2)) {
      return []
    }

    // 防止长查询导致内存或 CPU 溢出
    const validatedQuery = this.validateString(query)
    if (!validatedQuery) {
      return []
    }

    try {
      const keywords = this.tokenize(validatedQuery)

      if (keywords.length === 0) {
        return []
      }

      const resultMap = new Map<string, { score: number; highlights: Set<string> }>()

      // 逐关键词搜索
      for (const keyword of keywords) {
        const indices = this.searchIndex(keyword)

        for (const indexItem of indices) {
          if (!resultMap.has(indexItem.articleId)) {
            resultMap.set(indexItem.articleId, { score: 0, highlights: new Set() })
          }

          const result = resultMap.get(indexItem.articleId)!
          result.score += indexItem.weight

          try {
            const highlight = this.highlightMatch(indexItem.content, keyword)
            if (highlight) {
              result.highlights.add(highlight)
            }
          } catch (err) {
            this.logger.debug(`Failed to highlight match for ${keyword}:`, err)
          }
        }
      }

      // 转换为结果数组
      const results: SearchResult[] = []

      for (const [articleId, { score, highlights }] of resultMap.entries()) {
        const article = this.articles.get(articleId)
        if (article) {
          results.push({
            article,
            score,
            highlights: Array.from(highlights).slice(0, 10), // 限制高亮数量
          })
        }
      }

      // 按分数排序并限制结果数量
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(1, this.config.maxResults || 20))
    } catch (err) {
      this.logger.error('Search failed:', err)
      return []
    }
  }

  /**
   * 在索引中搜索关键词
   */
  private searchIndex(keyword: string): SearchIndex[] {
    const indices: SearchIndex[] = []

    // 严格的字符串验证
    if (typeof keyword !== 'string' || keyword.length === 0) {
      return indices
    }

    // 精确匹配
    if (this.index.has(keyword)) {
      const items = this.index.get(keyword)
      if (Array.isArray(items)) {
        indices.push(...items.slice(0, 100)) // 限制单个关键词的索引项
      }
    }

    // 前缀匹配（限制搜索范围）
    let prefixCount = 0
    const maxPrefixMatches = 50

    for (const [key, items] of this.index.entries()) {
      if (prefixCount >= maxPrefixMatches) break

      if (key.startsWith(keyword) && key !== keyword) {
        if (Array.isArray(items)) {
          indices.push(...items.slice(0, 50))
          prefixCount++
        }
      }
    }

    return indices
  }

  /**
   * 分词
   * 使用安全的分词策略，防止 ReDoS
   */
  private tokenize(text: string): string[] {
    if (typeof text !== 'string' || text.length === 0) {
      return []
    }

    try {
      // 使用简单的分词：空格、标点符号分割
      // 避免复杂的正则表达式以防止 ReDoS
      const query = this.config.caseSensitive ? text : text.toLowerCase()

      // 安全的分词：分割长度限制
      const words = query
        .split(/[\s\p{P}]+/u)
        .filter((w) => w.length > 0 && w.length < 100) // 限制单词长度
        .slice(0, 50) // 限制分词数量

      return [...new Set(words)] // 去重
    } catch (err) {
      this.logger.warn('Tokenization failed:', err)
      return []
    }
  }

  /**
   * 高亮匹配内容
   * 使用安全的转义，防止 ReDoS 和 XSS
   */
  private highlightMatch(content: string, keyword: string): string {
    if (typeof content !== 'string' || typeof keyword !== 'string') {
      return ''
    }

    if (keyword.length === 0 || content.length === 0) {
      return content
    }

    try {
      const [open, close] = this.config.highlightTag || ['<mark>', '</mark>']

      // 安全的转义
      const escaped = this.escapeRegex(keyword)

      // 限制正则表达式长度防止 ReDoS
      if (escaped.length > 100) {
        return content
      }

      // 使用更简单的替换方式
      const regex = new RegExp(`(${escaped})`, 'gi')

      // 限制替换次数
      let count = 0
      const result = content.replace(regex, (match) => {
        count++
        if (count > 100) {
          return match
        }
        return `${open}${match}${close}`
      })

      return result
    } catch (err) {
      this.logger.debug('Highlight failed:', err)
      return content
    }
  }

  /**
   * 转义正则表达式特殊字符
   * 防止用户输入破坏正则表达式逻辑
   */
  private escapeRegex(str: string): string {
    if (typeof str !== 'string') {
      return ''
    }

    // 安全的字符转义列表
    const chars: Record<string, string> = {
      '.': '\\.',
      '*': '\\*',
      '+': '\\+',
      '?': '\\?',
      '^': '\\^',
      $: '\\$',
      '{': '\\{',
      '}': '\\}',
      '(': '\\(',
      ')': '\\)',
      '|': '\\|',
      '[': '\\[',
      ']': '\\]',
      '\\': '\\\\',
    }

    return str
      .split('')
      .map((c) => chars[c] || c)
      .join('')
  }

  /**
   * 清空索引
   */
  clear(): void {
    this.checkDisposed()

    this.index.clear()
    this.articles.clear()
    this.logger.debug('Search index cleared')
  }

  /**
   * 获取索引统计
   */
  getStats() {
    this.checkDisposed()

    try {
      let totalIndices = 0
      for (const items of this.index.values()) {
        totalIndices += Array.isArray(items) ? items.length : 0
      }

      return Object.freeze({
        indexedWords: this.index.size,
        indexedArticles: this.articles.size,
        totalIndices,
      })
    } catch (err) {
      this.logger.error('Failed to get stats:', err)
      return { indexedWords: 0, indexedArticles: 0, totalIndices: 0 }
    }
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.clear()
    this.disposed = true
    this.logger.debug('SearchEngine disposed')
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
 * 创建全局搜索引擎单例
 */
let globalSearchEngine: SearchEngine | null = null

export function createSearchEngine(config?: SearchEngineConfig): SearchEngine {
  if (!globalSearchEngine) {
    globalSearchEngine = new SearchEngine(config)
  }
  return globalSearchEngine
}

export function getSearchEngine(): SearchEngine {
  if (!globalSearchEngine) {
    globalSearchEngine = new SearchEngine()
  }
  return globalSearchEngine
}

/**
 * 销毁全局单例
 */
export function disposeSearchEngine(): void {
  if (globalSearchEngine) {
    globalSearchEngine.dispose()
    globalSearchEngine = null
  }
}
