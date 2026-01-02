/**
 * 统一的错误处理系统
 * 遵循 VSCode 的错误设计模式
 */

import { ERROR_CODES } from './constants'

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

/**
 * 应用错误类
 * 所有 ApplicationError 都应该被捕获和处理
 */
export class ApplicationError extends Error {
  readonly code: ErrorCode
  readonly context: Record<string, unknown>
  readonly statusCode: number
  readonly isOperational = true

  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.OPERATION_FAILED,
    statusCode = 500,
    context?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApplicationError'
    this.code = code
    this.statusCode = statusCode
    this.context = context ?? {}

    // 保留堆栈跟踪
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    }
  }
}

/**
 * 验证错误
 */
export class ValidationError extends ApplicationError {
  readonly fields: Record<string, string> = {}

  constructor(
    message: string,
    fields?: Record<string, string>,
    context?: Record<string, unknown>
  ) {
    super(message, ERROR_CODES.INVALID_INPUT, 400, context)
    this.name = 'ValidationError'
    if (fields) {
      this.fields = fields
    }
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      fields: this.fields,
    }
  }
}

/**
 * 文件操作错误
 */
export class FileError extends ApplicationError {
  readonly filePath: string

  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.FILE_READ_ERROR,
    filePath?: string,
    context?: Record<string, unknown>
  ) {
    super(message, code, 500, context)
    this.name = 'FileError'
    this.filePath = filePath ?? ''
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      filePath: this.filePath,
    }
  }
}

/**
 * 文章错误
 */
export class ArticleError extends ApplicationError {
  readonly articleId: string

  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.ARTICLE_INVALID,
    articleId?: string,
    context?: Record<string, unknown>
  ) {
    super(message, code, 400, context)
    this.name = 'ArticleError'
    this.articleId = articleId ?? ''
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      articleId: this.articleId,
    }
  }
}

/**
 * 插件错误
 */
export class PluginError extends ApplicationError {
  readonly pluginName: string

  constructor(
    message: string,
    code: ErrorCode = ERROR_CODES.PLUGIN_INIT_ERROR,
    pluginName?: string,
    context?: Record<string, unknown>
  ) {
    super(message, code, 500, context)
    this.name = 'PluginError'
    this.pluginName = pluginName ?? ''
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      pluginName: this.pluginName,
    }
  }
}

/**
 * 错误处理工具函数
 */
export const ErrorHandler = {
  /**
   * 将任意错误转换为 ApplicationError
   */
  normalize(error: unknown): ApplicationError {
    if (error instanceof ApplicationError) {
      return error
    }

    if (error instanceof Error) {
      return new ApplicationError(
        error.message,
        ERROR_CODES.OPERATION_FAILED,
        500,
        { originalError: error.name }
      )
    }

    return new ApplicationError(
      String(error),
      ERROR_CODES.OPERATION_FAILED,
      500,
      { originalValue: error }
    )
  },

  /**
   * 安全地执行函数，捕获任何错误
   */
  async safeExecute<T>(
    fn: () => Promise<T>,
    context?: Record<string, unknown>
  ): Promise<[T | null, ApplicationError | null]> {
    try {
      const result = await fn()
      return [result, null]
    } catch (err) {
      const error = this.normalize(err)
      if (context) {
        const newError = new ApplicationError(
          error.message,
          error.code,
          error.statusCode,
          { ...error.context, ...context }
        )
        return [null, newError]
      }
      return [null, error]
    }
  },

  /**
   * 同步版本
   */
  safeExecuteSync<T>(
    fn: () => T,
    context?: Record<string, unknown>
  ): [T | null, ApplicationError | null] {
    try {
      const result = fn()
      return [result, null]
    } catch (err) {
      const error = this.normalize(err)
      if (context) {
        const newError = new ApplicationError(
          error.message,
          error.code,
          error.statusCode,
          { ...error.context, ...context }
        )
        return [null, newError]
      }
      return [null, error]
    }
  },

  /**
   * 检查值的有效性
   */
  validate(
    condition: boolean,
    message: string,
    code: ErrorCode = ERROR_CODES.INVALID_INPUT
  ): void {
    if (!condition) {
      throw new ApplicationError(message, code, 400)
    }
  },

  /**
   * 检查值是否存在
   */
  required<T>(value: T | null | undefined, message: string): T {
    if (value === null || value === undefined) {
      throw new ApplicationError(message, ERROR_CODES.NOT_FOUND, 404)
    }
    return value
  },
}
