/**
 * 插件系统
 * 遵循 VSCode 插件架构，支持扩展和定制
 * 包含错误隔离、超时保护、生命周期管理
 */

import { Article, PluginContext, Logger } from './types'
import { ArticleManager } from './ArticleManager'
import { SearchEngine } from './SearchEngine'

export interface Plugin {
  name: string
  version: string
  description?: string
  activate(context: PluginContext): void | Promise<void>
  deactivate?(): void | Promise<void>
}

export interface PluginConfig {
  timeout?: number
  maxProcessors?: number
  logger?: Logger
}

/**
 * 带超时保护的异步函数包装
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  logger: Logger
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Operation timeout after ${timeoutMs}ms`)),
      timeoutMs
    )
  )

  try {
    return await Promise.race([promise, timeoutPromise])
  } catch (err) {
    logger.error(`Timeout error:`, err)
    throw err
  }
}

/**
 * 插件管理器
 * 安全的插件注册、激活、执行和清理
 */
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private activePlugins: Set<string> = new Set()
  private articleProcessors: Array<{
    pluginName: string
    fn: (article: Article) => Article | Promise<Article>
  }> = []
  private searchExtensions: Array<{
    pluginName: string
    fn: (query: string, articles: Article[]) => any
  }> = []
  private articleManager: ArticleManager
  private logger: Logger
  private config: PluginConfig
  private disposed = false

  constructor(
    articleManager: ArticleManager,
    _searchEngine: SearchEngine,
    config: PluginConfig = {}
  ) {
    this.articleManager = articleManager
    this.config = {
      timeout: 10000,
      maxProcessors: 100,
      ...config,
    }
    this.logger = config.logger || createDefaultLogger()
  }

  /**
   * 检查是否已释放
   */
  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('PluginManager has been disposed')
    }
  }

  /**
   * 验证插件
   */
  private validatePlugin(plugin: unknown): plugin is Plugin {
    if (!plugin || typeof plugin !== 'object') {
      return false
    }

    const p = plugin as any
    return (
      typeof p.name === 'string' &&
      typeof p.version === 'string' &&
      typeof p.activate === 'function'
    )
  }

  /**
   * 注册插件
   */
  async registerPlugin(plugin: unknown): Promise<void> {
    this.checkDisposed()

    if (!this.validatePlugin(plugin)) {
      throw new TypeError('Invalid plugin: missing required fields')
    }

    if (this.plugins.has(plugin.name)) {
      this.logger.warn(`Plugin ${plugin.name} is already registered`)
      return
    }

    const context: PluginContext = {
      getArticles: () => Promise.resolve(Array.from(this.articleManager.getArticles())),
      registerArticleProcessor: (fn) => this.registerArticleProcessor(plugin.name, fn),
      registerSearchExtension: (fn) => this.registerSearchExtension(plugin.name, fn),
      logger: this.logger,
    }

    try {
      // 使用超时保护激活插件
      await withTimeout(
        Promise.resolve(plugin.activate(context)),
        this.config.timeout || 10000,
        this.logger
      )

      this.plugins.set(plugin.name, plugin)
      this.activePlugins.add(plugin.name)
      this.logger.info(`Plugin ${plugin.name} activated`)
    } catch (error) {
      this.logger.error(`Failed to activate plugin ${plugin.name}:`, error)
      throw error
    }
  }

  /**
   * 卸载插件
   */
  async unregisterPlugin(name: string): Promise<void> {
    this.checkDisposed()

    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('Plugin name must be a non-empty string')
    }

    const plugin = this.plugins.get(name)
    if (!plugin) {
      this.logger.warn(`Plugin ${name} not found`)
      return
    }

    try {
      // 使用超时保护卸载插件
      if (plugin.deactivate) {
        await withTimeout(
          Promise.resolve(plugin.deactivate()),
          this.config.timeout || 10000,
          this.logger
        )
      }

      this.plugins.delete(name)
      this.activePlugins.delete(name)

      // 移除该插件的所有处理器
      this.articleProcessors = this.articleProcessors.filter((p) => p.pluginName !== name)
      this.searchExtensions = this.searchExtensions.filter((p) => p.pluginName !== name)

      this.logger.info(`Plugin ${name} deactivated`)
    } catch (error) {
      this.logger.error(`Failed to deactivate plugin ${name}:`, error)
      throw error
    }
  }

  /**
   * 注册文章处理器（带错误隔离）
   */
  registerArticleProcessor(
    pluginName: string,
    fn: (article: Article) => Article | Promise<Article>
  ): void {
    this.checkDisposed()

    if (typeof fn !== 'function') {
      throw new TypeError('Processor must be a function')
    }

    if (this.articleProcessors.length >= (this.config.maxProcessors || 100)) {
      this.logger.warn(
        `Processor limit exceeded: ${this.config.maxProcessors}`
      )
      return
    }

    this.articleProcessors.push({
      pluginName: String(pluginName),
      fn,
    })

    this.logger.debug(`Article processor registered for plugin ${pluginName}`)
  }

  /**
   * 应用所有文章处理器（带错误隔离）
   */
  async processArticle(article: Article): Promise<Article> {
    this.checkDisposed()

    if (!article || typeof article.id !== 'string') {
      throw new TypeError('Invalid article')
    }

    let processed = article

    for (const processor of this.articleProcessors) {
      try {
        // 每个处理器都有单独的超时保护
        const result = await withTimeout(
          Promise.resolve(processor.fn(processed)),
          this.config.timeout || 10000,
          this.logger
        )

        if (result && typeof result === 'object' && result.id) {
          processed = result
        } else {
          this.logger.warn(
            `Processor from plugin ${processor.pluginName} returned invalid result`
          )
        }
      } catch (error) {
        // 单个处理器的错误不会导致整个链崩溃
        this.logger.error(
          `Article processor from plugin ${processor.pluginName} failed:`,
          error
        )
        // 继续处理下一个处理器
      }
    }

    return processed
  }

  /**
   * 注册搜索扩展
   */
  registerSearchExtension(
    pluginName: string,
    fn: (query: string, articles: Article[]) => any
  ): void {
    this.checkDisposed()

    if (typeof fn !== 'function') {
      throw new TypeError('Search extension must be a function')
    }

    if (this.searchExtensions.length >= (this.config.maxProcessors || 100)) {
      this.logger.warn(`Search extension limit exceeded: ${this.config.maxProcessors}`)
      return
    }

    this.searchExtensions.push({
      pluginName: String(pluginName),
      fn,
    })

    this.logger.debug(`Search extension registered for plugin ${pluginName}`)
  }

  /**
   * 执行所有搜索扩展
   */
  async executeSearchExtensions(query: string, articles: readonly Article[]): Promise<any[]> {
    this.checkDisposed()

    if (typeof query !== 'string') {
      return []
    }

    if (!Array.isArray(articles)) {
      return []
    }

    const results: any[] = []

    for (const extension of this.searchExtensions) {
      try {
        const result = await withTimeout(
          Promise.resolve(extension.fn(query, articles as Article[])),
          this.config.timeout || 10000,
          this.logger
        )

        if (result !== undefined) {
          results.push(result)
        }
      } catch (error) {
        this.logger.error(
          `Search extension from plugin ${extension.pluginName} failed:`,
          error
        )
      }
    }

    return results
  }

  /**
   * 获取所有已注册的插件
   */
  getPlugins(): readonly Plugin[] {
    this.checkDisposed()

    return Object.freeze(Array.from(this.plugins.values()))
  }

  /**
   * 获取活跃的插件
   */
  getActivePlugins(): readonly string[] {
    this.checkDisposed()

    return Object.freeze(Array.from(this.activePlugins))
  }

  /**
   * 获取插件信息
   */
  getPluginInfo(name: string): Plugin | undefined {
    this.checkDisposed()

    if (typeof name !== 'string') {
      return undefined
    }

    return this.plugins.get(name)
  }

  /**
   * 获取处理器统计
   */
  getProcessorStats() {
    this.checkDisposed()

    const processorsByPlugin = new Map<string, number>()

    for (const processor of this.articleProcessors) {
      const count = processorsByPlugin.get(processor.pluginName) || 0
      processorsByPlugin.set(processor.pluginName, count + 1)
    }

    return Object.freeze({
      totalProcessors: this.articleProcessors.length,
      totalSearchExtensions: this.searchExtensions.length,
      processorsByPlugin: Object.fromEntries(processorsByPlugin),
    })
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    // 卸载所有活跃的插件
    const pluginNames = Array.from(this.activePlugins)

    for (const name of pluginNames) {
      try {
        await this.unregisterPlugin(name)
      } catch (err) {
        this.logger.error(`Failed to unload plugin ${name}:`, err)
      }
    }

    this.articleProcessors = []
    this.searchExtensions = []
  }

  /**
   * 释放资源
   */
  async dispose(): Promise<void> {
    if (this.disposed) return

    await this.cleanup()
    this.disposed = true
    this.logger.debug('PluginManager disposed')
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
 * 创建全局插件管理器单例
 */
let globalPluginManager: PluginManager | null = null

export function createPluginManager(
  articleManager: ArticleManager,
  searchEngine: SearchEngine,
  config?: PluginConfig
): PluginManager {
  if (!globalPluginManager) {
    globalPluginManager = new PluginManager(articleManager, searchEngine, config)
  }
  return globalPluginManager
}

export function getPluginManager(): PluginManager {
  if (!globalPluginManager) {
    throw new Error('PluginManager not initialized')
  }
  return globalPluginManager
}

/**
 * 销毁全局单例
 */
export async function disposePluginManager(): Promise<void> {
  if (globalPluginManager) {
    await globalPluginManager.dispose()
    globalPluginManager = null
  }
}

/**
 * 官方插件示例：代码高亮插件
 * 添加了错误处理
 */
export const codeHighlightPlugin: Plugin = {
  name: 'code-highlight',
  version: '1.0.0',
  description: '为代码块添加语言标识',

  activate(context) {
    context.registerArticleProcessor((article) => {
      try {
        if (!article.content || typeof article.content !== 'string') {
          return article
        }

        // 为代码块添加语言类名
        const processed = article.content.replace(
          /```(\w+)?\n/g,
          (_match, lang) => {
            const language = lang || 'text'
            return `\`\`\`${language}\n`
          }
        )

        return { ...article, content: processed }
      } catch (err) {
        context.logger.error('Code highlight processor error:', err)
        return article
      }
    })

    context.logger.info('Code highlight plugin activated')
  },
}

/**
 * 官方插件示例：TOC 自动生成插件
 * 添加了错误处理和长度限制
 */
export const autoTocPlugin: Plugin = {
  name: 'auto-toc',
  version: '1.0.0',
  description: '自动为文章生成目录',

  activate(context) {
    context.registerArticleProcessor((article) => {
      try {
        if (!article.content || typeof article.content !== 'string') {
          return article
        }

        // 提取所有标题
        const headings: Array<{ level: number; text: string; id: string }> = []
        const headingRegex = /^(#+)\s+(.+)$/gm
        let match: RegExpExecArray | null = null
        let count = 0

        while ((match = headingRegex.exec(article.content)) && count < 100) {
          if (match[1] && match[2]) {
            const level = match[1].length
            const text = String(match[2]).substring(0, 200)
            const id = text.toLowerCase().replace(/\s+/g, '-').substring(0, 100)

            headings.push({ level, text, id })
            count++
          }
        }

        // 存储在元数据中
        const updated = { ...article }
        updated.meta = {
          ...(updated.meta || {}),
          toc: Object.freeze(headings),
        }

        return updated
      } catch (err) {
        context.logger.error('Auto TOC processor error:', err)
        return article
      }
    })

    context.logger.info('Auto TOC plugin activated')
  },
}

/**
 * 官方插件示例：文章字数统计插件
 * 添加了错误处理
 */
export const wordCountPlugin: Plugin = {
  name: 'word-count',
  version: '1.0.0',
  description: '统计文章字数和阅读时间',

  activate(context) {
    context.registerArticleProcessor((article) => {
      try {
        if (!article.content || typeof article.content !== 'string') {
          return article
        }

        const text = article.content.replace(/```[\s\S]*?```/g, '')
        const words = text.split(/\s+/).filter((w) => w.length > 0).length
        const readingTime = Math.max(1, Math.ceil(words / 200))

        const updated = { ...article }
        updated.meta = {
          ...(updated.meta || {}),
          wordCount: words,
          readingTime: readingTime,
        }

        return updated
      } catch (err) {
        context.logger.error('Word count processor error:', err)
        return article
      }
    })

    context.logger.info('Word count plugin activated')
  },
}

/**
 * 官方插件示例：SEO 优化插件
 * 添加了错误处理和验证
 */
export const seoPlugin: Plugin = {
  name: 'seo',
  version: '1.0.0',
  description: 'SEO 元数据优化',

  activate(context) {
    context.registerArticleProcessor((article) => {
      try {
        const updated = { ...article }
        updated.meta = {
          ...(updated.meta || {}),
          seo: Object.freeze({
            title: String(updated.title || '').substring(0, 200),
            description: String(updated.description || '').substring(0, 500),
            keywords: Array.isArray(updated.keywords) ? updated.keywords : Array.isArray(updated.tags) ? updated.tags : [],
            author: updated.author ? String(updated.author).substring(0, 100) : undefined,
          }),
        }

        return updated
      } catch (err) {
        context.logger.error('SEO processor error:', err)
        return article
      }
    })

    context.logger.info('SEO plugin activated')
  },
}

/**
 * 官方插件示例：目录树插件（统计分类）
 * 添加了错误处理
 */
export const categoryTreePlugin: Plugin = {
  name: 'category-tree',
  version: '1.0.0',
  description: '生成分类树结构',

  activate(context) {
    context.registerArticleProcessor((article) => {
      try {
        const updated = { ...article }

        // 标准化分类格式
        if (Array.isArray(updated.categories)) {
          updated.categories = Object.freeze(
            updated.categories
              .map((cat) => {
                if (typeof cat === 'string') {
                  return cat.trim().toLowerCase().substring(0, 100)
                }
                return ''
              })
              .filter((cat) => cat.length > 0)
          ) as readonly string[]
        }

        return updated
      } catch (err) {
        context.logger.error('Category tree processor error:', err)
        return article
      }
    })

    context.logger.info('Category tree plugin activated')
  },
}
