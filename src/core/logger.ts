/**
 * 统一的日志系统
 * 支持多个输出、日志级别、格式化
 * 遵循 VSCode 的日志设计
 */

import { LogLevel } from './constants'

export interface LogContext {
  module?: string
  traceId?: string
  userId?: string
  [key: string]: unknown
}

export interface LogMessage {
  level: LogLevel
  message: string
  timestamp: Date
  context: LogContext
  error: Error | undefined
}

export interface ILogger {
  debug(message: string, context?: LogContext): void
  info(message: string, context?: LogContext): void
  warn(message: string, context?: LogContext): void
  error(message: string, error?: Error | unknown, context?: LogContext): void
  setLevel(level: LogLevel): void
  getLevel(): LogLevel
}

/**
 * 日志处理器接口
 */
export interface LogHandler {
  handle(message: LogMessage): void | Promise<void>
}

/**
 * 控制台日志处理器
 */
export class ConsoleLogHandler implements LogHandler {
  private colorMap: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: '\x1b[36m', // 青色
    [LogLevel.INFO]: '\x1b[32m', // 绿色
    [LogLevel.WARN]: '\x1b[33m', // 黄色
    [LogLevel.ERROR]: '\x1b[31m', // 红色
  }

  private resetColor = '\x1b[0m'

  handle(message: LogMessage): void {
    const color = this.colorMap[message.level]
    const levelName = LogLevel[message.level].padEnd(5)
    const timestamp = message.timestamp.toISOString()

    const prefix = `${color}[${levelName}]${this.resetColor} ${timestamp}`
    const msg = `${prefix} ${message.message}`

    const method = message.level === LogLevel.ERROR ? 'error' : 'log'
    console[method as 'error' | 'log'](msg)

    if (message.context) {
      console.log('  Context:', message.context)
    }

    if (message.error) {
      console.error('  Error:', message.error)
    }
  }
}

/**
 * 内存日志处理器
 */
export class MemoryLogHandler implements LogHandler {
  private logs: LogMessage[] = []
  readonly maxLogs: number

  constructor(maxLogs = 1000) {
    this.maxLogs = maxLogs
  }

  handle(message: LogMessage): void {
    this.logs.push(message)
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
  }

  getLogs(level?: LogLevel): readonly LogMessage[] {
    if (level === undefined) {
      return [...this.logs]
    }
    return this.logs.filter((m) => m.level === level)
  }

  clear(): void {
    this.logs = []
  }
}

/**
 * 中心化日志服务
 */
export class Logger implements ILogger {
  private level: LogLevel = LogLevel.INFO
  private handlers: Set<LogHandler> = new Set()
  private context: LogContext = {}
  private static instance: Logger

  constructor() {
    // 默认添加控制台处理器
    this.handlers.add(new ConsoleLogHandler())
  }

  /**
   * 获取全局日志实例
   */
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }

  /**
   * 添加日志处理器
   */
  addHandler(handler: LogHandler): void {
    this.handlers.add(handler)
  }

  /**
   * 移除日志处理器
   */
  removeHandler(handler: LogHandler): void {
    this.handlers.delete(handler)
  }

  /**
   * 设置全局上下文
   */
  setContext(context: LogContext): void {
    this.context = { ...this.context, ...context }
  }

  /**
   * 设置日志级别
   */
  setLevel(level: LogLevel): void {
    this.level = level
  }

  /**
   * 获取日志级别
   */
  getLevel(): LogLevel {
    return this.level
  }

  /**
   * 调试日志
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, undefined, context)
  }

  /**
   * 信息日志
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, undefined, context)
  }

  /**
   * 警告日志
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, undefined, context)
  }

  /**
   * 错误日志
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const err = error instanceof Error ? error : undefined
    this.log(LogLevel.ERROR, message, err, context)
  }

  /**
   * 内部日志方法
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error,
    context?: LogContext
  ): void {
    // 检查日志级别
    if (level < this.level) {
      return
    }

    const logMessage: LogMessage = {
      level,
      message,
      timestamp: new Date(),
      context: { ...this.context, ...context },
      error: error ?? undefined,
    }

    // 分发给所有处理器
    for (const handler of this.handlers) {
      try {
        handler.handle(logMessage)
      } catch (err) {
        // 防止日志处理器的错误影响主程序
        console.error('Logger handler error:', err)
      }
    }
  }
}

/**
 * 创建模块级别的日志器
 */
export function createModuleLogger(moduleName: string): ILogger {
  const baseLogger = Logger.getInstance()

  return {
    debug: (msg, ctx) => baseLogger.debug(msg, { ...ctx, module: moduleName }),
    info: (msg, ctx) => baseLogger.info(msg, { ...ctx, module: moduleName }),
    warn: (msg, ctx) => baseLogger.warn(msg, { ...ctx, module: moduleName }),
    error: (msg, err, ctx) => baseLogger.error(msg, err, { ...ctx, module: moduleName }),
    setLevel: (level) => baseLogger.setLevel(level),
    getLevel: () => baseLogger.getLevel(),
  }
}

/**
 * 获取全局日志实例的便捷方法
 */
export const log = Logger.getInstance()
