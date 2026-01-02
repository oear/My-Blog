/**
 * 核心类型定义
 * 遵循 VSCode 风格：清晰的接口、类型安全、可扩展
 */

// ============ 验证相关 ============

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// ============ 文章相关类型 ============

export interface Article {
  /** 文章唯一标识（通常是文件名） */
  readonly id: string
  /** 文章标题 */
  readonly title: string
  /** 文章描述/摘要 */
  readonly description: string
  /** 文章内容 */
  readonly content: string
  /** 发布日期 */
  readonly date: Date
  /** 最后修改日期 */
  readonly updated?: Date
  /** 文章作者 */
  readonly author?: string
  /** 文章标签 */
  readonly tags: readonly string[]
  /** 文章分类 */
  readonly categories: readonly string[]
  /** 特征图像 */
  readonly image?: string
  /** 是否为草稿 */
  readonly draft?: boolean
  /** 阅读时长（分钟） */
  readonly readingTime?: number
  /** 自定义元数据 */
  readonly meta?: ReadonlyRecord<string, unknown>
  /** 关键词 */
  readonly keywords?: readonly string[]
  /** 原始 frontmatter 内容 */
  readonly raw?: string
}

// 不可变的 Record 类型
type ReadonlyRecord<K extends string | number | symbol, V> = {
  readonly [P in K]: V
}

export interface ArticleFilter {
  tag?: string
  category?: string
  author?: string
  year?: number
  search?: string
}

export interface ArticleList {
  readonly items: readonly Article[]
  readonly total: number
  readonly filtered: number
}

// ============ 分类和标签 ============

export interface CategoryInfo {
  /** 分类名称 */
  name: string
  /** 分类描述 */
  description?: string
  /** 分类下的文章数 */
  count: number
  /** 分类色彩 */
  color?: string
  /** 分类图标 */
  icon?: string
}

export interface TagInfo {
  /** 标签名称 */
  name: string
  /** 标签下的文章数 */
  count: number
  /** 标签频率权重 */
  weight?: number
  /** 标签色彩 */
  color?: string
}

// ============ 搜索相关 ============

export interface SearchIndex {
  /** 索引项 ID */
  id: string
  /** 文章 ID */
  articleId: string
  /** 可搜索内容 */
  content: string
  /** 内容片段 */
  excerpt: string
  /** 搜索权重 */
  weight: number
  /** 搜索词位置 */
  positions?: number[]
}

export interface SearchResult {
  /** 文章 */
  article: Article
  /** 匹配得分 */
  score: number
  /** 高亮片段 */
  highlights?: string[]
}

// ============ 插件系统 ============

export interface PluginContext {
  /** 获取所有文章 */
  getArticles: () => Promise<Article[]>
  /** 添加文章钩子 */
  registerArticleProcessor: (fn: ArticleProcessor) => void
  /** 添加搜索扩展 */
  registerSearchExtension: (fn: SearchExtension) => void
  /** 日志记录 */
  logger: Logger
}

export type ArticleProcessor = (article: Article) => Article | Promise<Article>

export type SearchExtension = (
  query: string,
  articles: Article[]
) => SearchResult[] | Promise<SearchResult[]>

// ============ 日志系统 ============

export interface Logger {
  info(message: string, ...args: any[]): void
  warn(message: string, ...args: any[]): void
  error(message: string, ...args: any[]): void
  debug(message: string, ...args: any[]): void
}

// ============ 配置相关 ============

export interface BlogConfig {
  /** 博客标题 */
  title: string
  /** 博客描述 */
  description: string
  /** 网站 URL */
  url?: string
  /** 文章目录 */
  articlesDir: string
  /** 是否启用草稿 */
  includeDrafts?: boolean
  /** 分页大小 */
  pageSize?: number
  /** 启用的功能 */
  features?: {
    search?: boolean
    categories?: boolean
    tags?: boolean
    timeline?: boolean
    relatedArticles?: boolean
  }
  /** 插件列表 */
  plugins?: PluginConfig[]
}

export interface PluginConfig {
  /** 插件名称 */
  name: string
  /** 插件选项 */
  options?: Record<string, any>
}

// ============ 统计相关 ============

export interface BlogStats {
  /** 总文章数 */
  totalArticles: number
  /** 总标签数 */
  totalTags: number
  /** 总分类数 */
  totalCategories: number
  /** 总字数 */
  totalWords: number
  /** 平均阅读时长 */
  averageReadingTime: number
}

// ============ 事件系统 ============

export type BlogEvent =
  | { type: 'article:loaded'; data: Article }
  | { type: 'articles:updated'; data: Article[] }
  | { type: 'search:indexed'; data: { count: number } }

export interface EventEmitter {
  on(event: BlogEvent['type'], handler: (data: any) => void): void
  off(event: BlogEvent['type'], handler: (data: any) => void): void
  emit(event: BlogEvent): void
}
