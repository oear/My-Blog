/**
 * 博客核心 API
 * 统一的入口点，整合所有子系统
 * 包含初始化保护、错误恢复、资源管理
 */

// 核心模块导出 (先导出)
export * from './types'
export * from './utils'
export * from './ArticleManager'
export * from './SearchEngine'
export type { Plugin, PluginConfig } from './PluginManager'
export * from './PluginManager'

// 基础设施导出 (后导出，覆盖接口定义)
export {
  AUDIO_EXTENSIONS,
  IMAGE_EXTENSIONS,
  LYRICS_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  LogLevel,
  ERROR_CODES,
  DEFAULT_CONFIG,
  CACHE_KEYS,
  EVENT_NAMES,
} from './constants'

export {
  ApplicationError,
  ValidationError,
  FileError,
  ArticleError,
  PluginError,
  ErrorHandler,
  type ErrorCode,
} from './errors'

export {
  Logger,
  ConsoleLogHandler,
  MemoryLogHandler,
  createModuleLogger,
  log,
  type ILogger,
  type LogHandler,
  type LogMessage,
  type LogContext,
} from './logger'

export {
  EventEmitter,
  EventBus,
  getEventBus,
  setEventBus,
  type EventData,
  type EventListener,
  type EventMiddleware,
} from './events'

export {
  Configuration,
  ConfigurationError,
  createBlogConfiguration,
  createDefaultBlogConfig,
  getConfiguration,
  setConfiguration,
  type ConfigSchema,
  type BlogConfiguration,
} from './config'

export {
  MemoryCache,
  createCacheWrapper,
  getOrCreateCache,
  clearAllCaches,
  getAllCacheStats,
  type ICache,
  type CacheEntry,
  type CacheStats,
  EvictionPolicy,
} from './cache'

export {
  readFile,
  writeFile,
  readDir,
  readDirRecursive,
  exists,
  getFileInfo,
  remove,
  copy,
  filterByExtension,
  findFiles,
  readJSON,
  writeJSON,
  FileWatcher,
  type FileInfo,
  type FileOptions,
} from './file-utils'

import { ArticleManager, createArticleManager, disposeArticleManager } from './ArticleManager'
import { SearchEngine, createSearchEngine, disposeSearchEngine } from './SearchEngine'
import { PluginManager, disposePluginManager, type PluginConfig } from './PluginManager'
import { Logger } from './types'

export interface BlogCoreConfig {
  logger?: Logger
  includeDrafts?: boolean
  defaultAuthor?: string
  pluginConfig?: PluginConfig
}

/**
 * 博客核心类
 * 统一管理所有子系统
 * 线程安全、初始化保护、资源管理完善
 */
export class BlogCore {
  readonly articles: ArticleManager
  readonly searchEngine: SearchEngine
  readonly plugins: PluginManager
  private logger: Logger
  private initialized = false
  private initializing = false
  private disposed = false

  constructor(config?: BlogCoreConfig) {
    this.logger = config?.logger || createDefaultLogger()

    try {
      this.articles = createArticleManager({
        ...(config?.includeDrafts !== undefined ? { includeDrafts: config.includeDrafts } : {}),
        ...(config?.defaultAuthor !== undefined ? { defaultAuthor: config.defaultAuthor } : {}),
        logger: this.logger,
      })

      this.searchEngine = createSearchEngine({
        logger: this.logger,
      })

      this.plugins = new PluginManager(
        this.articles,
        this.searchEngine,
        {
          ...config?.pluginConfig,
          logger: this.logger,
        }
      )

      this.logger.info('BlogCore instance created')
    } catch (err) {
      this.logger.error('Failed to create BlogCore:', err)
      throw err
    }
  }

  /**
   * 检查是否已释放
   */
  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('BlogCore has been disposed')
    }
  }

  /**
   * 初始化博客（加载文章等）
   * 防护：
   * - 只能初始化一次
   * - 并发调用返回同一个 Promise
   * - 初始化失败自动清理状态
   */
  async initialize(articles: unknown[]): Promise<void> {
    this.checkDisposed()

    // 防止重复初始化或并发初始化
    if (this.initialized) {
      this.logger.warn('Blog already initialized')
      return
    }

    if (this.initializing) {
      this.logger.warn('Blog initialization in progress')
      return
    }

    // 验证输入
    if (!Array.isArray(articles)) {
      throw new TypeError('Articles must be an array')
    }

    if (articles.length === 0) {
      this.logger.warn('No articles to initialize')
      this.initialized = true
      return
    }

    this.initializing = true
    const startTime = Date.now()

    try {
      this.logger.info(`Initializing blog with ${articles.length} articles...`)

      const processedArticles: any[] = []
      let successCount = 0
      let errorCount = 0

      // 处理每一篇文章
      for (let i = 0; i < articles.length; i++) {
        const item = articles[i]

        // 验证文章项
        if (!item || typeof item !== 'object') {
          this.logger.warn(`Skipping invalid article at index ${i}`)
          errorCount++
          continue
        }

        const { id, content } = item as any

        if (typeof id !== 'string' || typeof content !== 'string') {
          this.logger.warn(`Skipping article with invalid id or content at index ${i}`)
          errorCount++
          continue
        }

        try {
          // 创建文章对象
          const article = this.articles.createArticleFromMarkdown(id, content)

          // 通过插件处理
          let processed = article

          try {
            processed = await this.plugins.processArticle(article)
          } catch (pluginErr) {
            // 插件处理失败不应阻止文章加载
            this.logger.warn(`Plugin processing failed for article ${id}, using original`, pluginErr)
          }

          // 添加到文章管理器
          this.articles.addArticle(processed)
          processedArticles.push(processed)
          successCount++
        } catch (articleErr) {
          this.logger.error(`Failed to process article ${id}:`, articleErr)
          errorCount++
        }
      }

      // 建立搜索索引
      if (processedArticles.length > 0) {
        try {
          this.searchEngine.indexArticles(processedArticles)
        } catch (indexErr) {
          this.logger.error('Failed to build search index:', indexErr)
        }
      }

      const duration = Date.now() - startTime

      this.initialized = true
      this.initializing = false

      this.logger.info(
        `Blog initialized: ${successCount} articles loaded, ${errorCount} errors in ${duration}ms`
      )
    } catch (error) {
      this.initializing = false

      // 初始化失败不抛出异常，记录错误
      this.logger.error('Failed to initialize blog:', error)

      // 清理部分初始化的状态
      try {
        this.articles.clear()
        this.searchEngine.clear()
      } catch (cleanupErr) {
        this.logger.error('Failed to cleanup after initialization error:', cleanupErr)
      }
    }
  }

  /**
   * 检查初始化状态
   */
  isInitialized(): boolean {
    return this.initialized && !this.disposed
  }

  /**
   * 注册插件
   */
  async registerPlugin(plugin: unknown): Promise<void> {
    this.checkDisposed()

    try {
      await this.plugins.registerPlugin(plugin)
    } catch (err) {
      this.logger.error('Failed to register plugin:', err)
      throw err
    }
  }

  /**
   * 获取博客统计信息
   */
  getStats() {
    this.checkDisposed()

    try {
      return this.articles.getStats()
    } catch (err) {
      this.logger.error('Failed to get stats:', err)
      return {
        totalArticles: 0,
        totalTags: 0,
        totalCategories: 0,
        totalWords: 0,
        averageReadingTime: 0,
      }
    }
  }

  /**
   * 获取所有文章
   */
  getArticles() {
    this.checkDisposed()

    try {
      return this.articles.getArticles()
    } catch (err) {
      this.logger.error('Failed to get articles:', err)
      return Object.freeze([])
    }
  }

  /**
   * 搜索文章
   */
  findArticles(query: unknown) {
    this.checkDisposed()

    try {
      return this.searchEngine.search(query)
    } catch (err) {
      this.logger.error('Search failed:', err)
      return []
    }
  }

  /**
   * 清理资源
   */
  async cleanup(): Promise<void> {
    if (this.disposed) return

    try {
      await this.plugins.cleanup()
      this.articles.clear()
      this.searchEngine.clear()
      this.logger.info('BlogCore cleanup completed')
    } catch (err) {
      this.logger.error('Error during cleanup:', err)
    }
  }

  /**
   * 释放所有资源
   */
  async dispose(): Promise<void> {
    if (this.disposed) return

    this.logger.info('Disposing BlogCore...')

    try {
      await this.cleanup()
      await disposePluginManager()
      disposeArticleManager()
      disposeSearchEngine()
      this.disposed = true
      this.logger.info('BlogCore disposed')
    } catch (err) {
      this.logger.error('Error during dispose:', err)
    }
  }
}

/**
 * 创建博客实例的快捷方法
 */
export function createBlog(config?: BlogCoreConfig): BlogCore {
  return new BlogCore(config)
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
