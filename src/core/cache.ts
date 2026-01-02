/**
 * 缓存系统
 * 通用缓存抽象，支持多种缓存策略
 * 遵循 VSCode 的缓存设计
 */

import { createModuleLogger } from './logger'

const logger = createModuleLogger('Cache')

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  createdAt: number
  hits: number
}

export interface CacheStats {
  size: number
  hits: number
  misses: number
  hitRate: number
}

/**
 * 缓存驱逐策略
 */
export enum EvictionPolicy {
  LRU = 'lru', // Least Recently Used
  LFU = 'lfu', // Least Frequently Used
  FIFO = 'fifo', // First In First Out
}

/**
 * 缓存接口
 */
export interface ICache<T> {
  get(key: string): T | undefined
  set(key: string, value: T, expireMs?: number): void
  has(key: string): boolean
  delete(key: string): void
  clear(): void
  size(): number
  getStats(): CacheStats
}

/**
 * 内存缓存实现
 */
export class MemoryCache<T> implements ICache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private stats = {
    hits: 0,
    misses: 0,
  }
  private readonly defaultExpireMs: number
  private readonly maxSize: number
  private readonly evictionPolicy: EvictionPolicy

  constructor(
    defaultExpireMs = 3600000, // 1 hour
    maxSize = 1000,
    evictionPolicy = EvictionPolicy.LRU
  ) {
    this.defaultExpireMs = defaultExpireMs
    this.maxSize = maxSize
    this.evictionPolicy = evictionPolicy

    // 定期清理过期的条目
    this.startCleanupInterval()
  }

  /**
   * 获取缓存值
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return undefined
    }

    // 检查是否过期
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      this.stats.misses++
      return undefined
    }

    // 更新使用统计
    entry.hits++
    this.stats.hits++

    return entry.value
  }

  /**
   * 设置缓存值
   */
  set(key: string, value: T, expireMs = this.defaultExpireMs): void {
    // 检查缓存是否满
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evict()
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + expireMs,
      createdAt: Date.now(),
      hits: 0,
    })
  }

  /**
   * 检查缓存是否存在
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    // 检查是否过期
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0 }
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    }
  }

  /**
   * 驱逐策略
   */
  private evict(): void {
    if (this.cache.size === 0) {
      return
    }

    let keyToEvict: string | undefined

    if (this.evictionPolicy === EvictionPolicy.LRU) {
      // 驱逐最少最近使用
      let oldestTime = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < oldestTime) {
          oldestTime = entry.expiresAt
          keyToEvict = key
        }
      }
    } else if (this.evictionPolicy === EvictionPolicy.LFU) {
      // 驱逐最少使用
      let lowestHits = Infinity
      for (const [key, entry] of this.cache.entries()) {
        if (entry.hits < lowestHits) {
          lowestHits = entry.hits
          keyToEvict = key
        }
      }
    } else if (this.evictionPolicy === EvictionPolicy.FIFO) {
      // 驱逐最早插入
      let oldestCreated = Date.now()
      for (const [key, entry] of this.cache.entries()) {
        if (entry.createdAt < oldestCreated) {
          oldestCreated = entry.createdAt
          keyToEvict = key
        }
      }
    }

    if (keyToEvict) {
      this.cache.delete(keyToEvict)
      logger.debug(`Evicted cache entry: ${keyToEvict}`)
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now()
      let cleaned = 0

      for (const [key, entry] of this.cache.entries()) {
        if (entry.expiresAt < now) {
          this.cache.delete(key)
          cleaned++
        }
      }

      if (cleaned > 0) {
        logger.debug(`Cleaned ${cleaned} expired cache entries`)
      }
    }, 60000) // 每分钟清理一次
  }
}

/**
 * 创建缓存包装器
 */
export function createCacheWrapper<T>(
  fn: (key: string) => Promise<T>,
  cache: ICache<T>,
  expireMs: number = 3600000
): (key: string) => Promise<T> {
  return async (key: string): Promise<T> => {
    // 尝试从缓存获取
    const cached = cache.get(key)
    if (cached !== undefined) {
      logger.debug(`Cache hit: ${key}`)
      return cached
    }

    // 缓存未命中，执行函数
    logger.debug(`Cache miss: ${key}`)
    const result = await fn(key)

    // 缓存结果
    cache.set(key, result, expireMs)

    return result
  }
}

/**
 * 全局缓存实例
 */
const caches: Map<string, ICache<unknown>> = new Map()

/**
 * 获取或创建缓存
 */
export function getOrCreateCache<T>(
  name: string,
  defaultExpireMs?: number,
  maxSize?: number,
  evictionPolicy?: EvictionPolicy
): ICache<T> {
  if (!caches.has(name)) {
    const cache = new MemoryCache<T>(
      defaultExpireMs,
      maxSize,
      evictionPolicy
    )
    caches.set(name, cache)
  }

  return caches.get(name) as ICache<T>
}

/**
 * 清空所有缓存
 */
export function clearAllCaches(): void {
  for (const cache of caches.values()) {
    cache.clear()
  }
}

/**
 * 获取所有缓存统计
 */
export function getAllCacheStats(): Record<string, CacheStats> {
  const stats: Record<string, CacheStats> = {}
  for (const [name, cache] of caches.entries()) {
    stats[name] = cache.getStats()
  }
  return stats
}
