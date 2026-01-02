/**
 * 事件系统与中间件
 * 支持事件发射和订阅，以及中间件链
 * 遵循 VSCode 事件设计模式
 */

export interface EventData {
  [key: string]: unknown
}

export type EventListener<T extends EventData = EventData> = (data: T) => void | Promise<void>

export type EventMiddleware<T extends EventData = EventData> = (
  data: T,
  next: () => Promise<void>
) => Promise<void>

/**
 * 事件发射器
 */
export class EventEmitter<T extends EventData = EventData> {
  private listeners: Set<EventListener<T>> = new Set()
  private middlewares: EventMiddleware<T>[] = []

  /**
   * 监听事件
   */
  on(listener: EventListener<T>): () => void {
    this.listeners.add(listener)

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 一次性监听
   */
  once(listener: EventListener<T>): () => void {
    const wrappedListener: EventListener<T> = (data) => {
      unsubscribe()
      return listener(data)
    }

    const unsubscribe = this.on(wrappedListener)
    return unsubscribe
  }

  /**
   * 添加中间件
   */
  use(middleware: EventMiddleware<T>): void {
    this.middlewares.push(middleware)
  }

  /**
   * 发射事件
   */
  async emit(data: T): Promise<void> {
    // 执行中间件链
    if (this.middlewares.length > 0) {
      await this.executeMiddlewareChain(data)
    }

    // 执行所有监听器
    const promises: Promise<void>[] = []

    for (const listener of this.listeners) {
      try {
        const result = listener(data)
        if (result instanceof Promise) {
          promises.push(result)
        }
      } catch (err) {
        console.error('Event listener error:', err)
      }
    }

    // 等待所有异步监听器完成
    if (promises.length > 0) {
      await Promise.all(promises)
    }
  }

  /**
   * 执行中间件链
   */
  private async executeMiddlewareChain(data: T): Promise<void> {
    let index = 0

    const next = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        return
      }

      const middleware = this.middlewares[index++]

      if (!middleware) {
        return
      }

      try {
        await middleware(data, next)
      } catch (err) {
        console.error('Middleware error:', err)
        throw err
      }
    }

    await next()
  }

  /**
   * 移除所有监听器
   */
  clear(): void {
    this.listeners.clear()
    this.middlewares = []
  }

  /**
   * 获取监听器数量
   */
  listenerCount(): number {
    return this.listeners.size
  }
}

/**
 * 事件总线
 * 管理多个命名事件
 */
export class EventBus {
  private emitters: Map<string, EventEmitter<any>> = new Map()

  /**
   * 获取或创建事件发射器
   */
  private getOrCreateEmitter<T extends EventData = EventData>(event: string): EventEmitter<T> {
    if (!this.emitters.has(event)) {
      this.emitters.set(event, new EventEmitter<T>())
    }
    return this.emitters.get(event)!
  }

  /**
   * 监听事件
   */
  on<T extends EventData = EventData>(event: string, listener: EventListener<T>): () => void {
    return this.getOrCreateEmitter<T>(event).on(listener)
  }

  /**
   * 一次性监听
   */
  once<T extends EventData = EventData>(event: string, listener: EventListener<T>): () => void {
    return this.getOrCreateEmitter<T>(event).once(listener)
  }

  /**
   * 发射事件
   */
  async emit<T extends EventData = EventData>(event: string, data: T): Promise<void> {
    const emitter = this.emitters.get(event)
    if (emitter) {
      await emitter.emit(data)
    }
  }

  /**
   * 添加中间件
   */
  use<T extends EventData = EventData>(
    event: string,
    middleware: EventMiddleware<T>
  ): void {
    this.getOrCreateEmitter<T>(event).use(middleware)
  }

  /**
   * 移除事件
   */
  remove(event: string): void {
    const emitter = this.emitters.get(event)
    if (emitter) {
      emitter.clear()
      this.emitters.delete(event)
    }
  }

  /**
   * 清空所有事件
   */
  clear(): void {
    for (const emitter of this.emitters.values()) {
      emitter.clear()
    }
    this.emitters.clear()
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(event: string): number {
    const emitter = this.emitters.get(event)
    return emitter ? emitter.listenerCount() : 0
  }
}

/**
 * 全局事件总线
 */
let globalEventBus: EventBus

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus()
  }
  return globalEventBus
}

export function setEventBus(bus: EventBus): void {
  globalEventBus = bus
}
