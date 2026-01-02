/**
 * 配置管理系统
 * 中央化配置，支持覆盖和验证
 * 遵循 VSCode 的配置系统设计
 */

import { DEFAULT_CONFIG } from './constants'

export interface ConfigSchema {
  [key: string]: unknown
}

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * 配置管理器
 */
export class Configuration<T extends ConfigSchema = ConfigSchema> {
  private values: T
  private defaults: T
  private validators: Map<string, (value: unknown) => boolean> = new Map()
  private observers: Map<string, Set<(value: unknown) => void>> = new Map()

  constructor(defaults: T) {
    this.defaults = JSON.parse(JSON.stringify(defaults))
    this.values = JSON.parse(JSON.stringify(defaults))
  }

  /**
   * 注册值验证器
   */
  registerValidator(path: string, validator: (value: unknown) => boolean): void {
    this.validators.set(path, validator)
  }

  /**
   * 验证值
   */
  private validate(path: string, value: unknown): void {
    const validator = this.validators.get(path)
    if (validator && !validator(value)) {
      throw new ConfigurationError(
        `Invalid value for config "${path}": ${JSON.stringify(value)}`
      )
    }
  }

  /**
   * 获取配置值
   */
  get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K] {
    if (key in this.values) {
      return this.values[key]
    }
    return defaultValue ?? this.defaults[key]
  }

  /**
   * 设置配置值
   */
  set<K extends keyof T>(key: K, value: T[K]): void {
    if (value === undefined) {
      delete this.values[key]
      return
    }

    this.validate(key as string, value)
    this.values[key] = value

    // 通知观察者
    this.notifyObservers(key as string, value)
  }

  /**
   * 批量更新配置
   */
  update(partial: Partial<T>): void {
    for (const [key, value] of Object.entries(partial)) {
      this.set(key as keyof T, value as T[keyof T])
    }
  }

  /**
   * 获取所有配置
   */
  getAll(): Readonly<T> {
    return Object.freeze(JSON.parse(JSON.stringify(this.values)))
  }

  /**
   * 重置为默认值
   */
  reset(): void {
    this.values = JSON.parse(JSON.stringify(this.defaults))
  }

  /**
   * 重置单个配置项
   */
  resetKey<K extends keyof T>(key: K): void {
    this.values[key] = this.defaults[key]
    this.notifyObservers(key as string, this.defaults[key])
  }

  /**
   * 监听配置变化
   */
  onDidChange<K extends keyof T>(key: K, callback: (value: T[K]) => void): () => void {
    const keyStr = key as string

    if (!this.observers.has(keyStr)) {
      this.observers.set(keyStr, new Set())
    }

    const callbacks = this.observers.get(keyStr)!
    callbacks.add(callback as (v: unknown) => void)

    // 返回取消订阅函数
    return () => {
      callbacks.delete(callback as (v: unknown) => void)
    }
  }

  /**
   * 通知观察者
   */
  private notifyObservers(key: string, value: unknown): void {
    const callbacks = this.observers.get(key)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(value)
        } catch (err) {
          console.error('Configuration observer error:', err)
        }
      }
    }
  }
}

/**
 * 博客配置
 */
export interface BlogConfiguration extends ConfigSchema {
  // 核心配置
  siteName: string
  siteDescription: string
  siteLang: string

  // 文章配置
  maxArticles: number
  pageSize: number
  includeDrafts: boolean

  // 搜索配置
  maxQueryLength: number
  maxIndexSize: number

  // 插件配置
  maxPlugins: number
  pluginTimeout: number

  // 日志配置
  logLevel: number
  enableLogging: boolean

  // 缓存配置
  enableCache: boolean
  cacheExpireMs: number
}

/**
 * 创建默认的博客配置
 */
export function createDefaultBlogConfig(): BlogConfiguration {
  return {
    siteName: 'My Blog',
    siteDescription: 'A blog platform',
    siteLang: 'en-US',

    maxArticles: DEFAULT_CONFIG.maxArticles,
    pageSize: DEFAULT_CONFIG.pageSize,
    includeDrafts: false,

    maxQueryLength: DEFAULT_CONFIG.maxQueryLength,
    maxIndexSize: DEFAULT_CONFIG.maxIndexSize,

    maxPlugins: DEFAULT_CONFIG.maxPlugins || 50,
    pluginTimeout: DEFAULT_CONFIG.pluginTimeout,

    logLevel: 1, // INFO
    enableLogging: true,

    enableCache: true,
    cacheExpireMs: 3600000, // 1 hour
  }
}

/**
 * 创建博客配置管理器
 */
export function createBlogConfiguration(
  overrides?: Partial<BlogConfiguration>
): Configuration<BlogConfiguration> {
  const config = new Configuration<BlogConfiguration>(createDefaultBlogConfig())

  // 注册验证器
  config.registerValidator('maxArticles', (v) => typeof v === 'number' && v > 0)
  config.registerValidator('pageSize', (v) => typeof v === 'number' && v > 0)
  config.registerValidator('maxQueryLength', (v) => typeof v === 'number' && v > 0)
  config.registerValidator('maxIndexSize', (v) => typeof v === 'number' && v > 0)
  config.registerValidator('pluginTimeout', (v) => typeof v === 'number' && v > 0)
  config.registerValidator('logLevel', (v) => typeof v === 'number' && v >= 0 && v <= 3)
  config.registerValidator('enableCache', (v) => typeof v === 'boolean')
  config.registerValidator('cacheExpireMs', (v) => typeof v === 'number' && v > 0)

  // 应用覆盖
  if (overrides) {
    config.update(overrides)
  }

  return config
}

/**
 * 全局配置实例
 */
let globalConfig: Configuration<BlogConfiguration>

export function getConfiguration(): Configuration<BlogConfiguration> {
  if (!globalConfig) {
    globalConfig = createBlogConfiguration()
  }
  return globalConfig
}

export function setConfiguration(config: Configuration<BlogConfiguration>): void {
  globalConfig = config
}
