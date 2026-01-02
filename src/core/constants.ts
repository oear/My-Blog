/**
 * 共享常量定义
 * 所有模块共用的常量，避免重复定义
 */

// 文件扩展名
export const AUDIO_EXTENSIONS = ['.flac', '.mp3', '.wav', '.aac', '.ogg']
export const IMAGE_EXTENSIONS = ['.jpg', '.png', '.jpeg', '.webp', '.gif', '.svg']
export const LYRICS_EXTENSIONS = ['.lrc', '.vtt', '.srt']
export const MARKDOWN_EXTENSIONS = ['.md', '.mdx', '.markdown']

// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// 错误代码
export const ERROR_CODES = {
  // 通用错误
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  OPERATION_FAILED: 'OPERATION_FAILED',

  // 文件错误
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  FILE_READ_ERROR: 'FILE_READ_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',

  // 文章错误
  ARTICLE_INVALID: 'ARTICLE_INVALID',
  ARTICLE_PARSE_ERROR: 'ARTICLE_PARSE_ERROR',

  // 搜索错误
  SEARCH_ERROR: 'SEARCH_ERROR',
  INDEX_ERROR: 'INDEX_ERROR',

  // 插件错误
  PLUGIN_LOAD_ERROR: 'PLUGIN_LOAD_ERROR',
  PLUGIN_INIT_ERROR: 'PLUGIN_INIT_ERROR',
  PLUGIN_TIMEOUT: 'PLUGIN_TIMEOUT',
} as const

// 默认配置
export const DEFAULT_CONFIG = {
  maxArticles: 10000,
  maxQueryLength: 500,
  maxIndexSize: 100000,
  pluginTimeout: 10000,
  maxPlugins: 50,
  pageSize: 20,
} as const

// 缓存相关
export const CACHE_KEYS = {
  ARTICLES: 'blog:articles',
  SEARCH_INDEX: 'blog:search_index',
  ARTICLE_STATS: 'blog:stats',
} as const

// 事件名称
export const EVENT_NAMES = {
  BLOG_INITIALIZED: 'blog:initialized',
  ARTICLE_ADDED: 'article:added',
  ARTICLE_UPDATED: 'article:updated',
  ARTICLE_DELETED: 'article:deleted',
  SEARCH_EXECUTED: 'search:executed',
  PLUGIN_LOADED: 'plugin:loaded',
  PLUGIN_ERROR: 'plugin:error',
} as const
