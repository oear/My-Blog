/**
 * 核心工具库
 * 提供可重用的公共功能
 * 包含完整的输入验证和错误处理
 */

/**
 * 从 Markdown frontmatter 解析元数据
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>
  content: string
} {
  if (typeof content !== 'string' || !content.trim()) {
    return { data: {}, content: '' }
  }

  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!match) {
    return { data: {}, content }
  }

  const [, frontmatter, body] = match

  try {
    const data = parseFrontmatterYAML(frontmatter ?? '')
    return { data, content: (body ?? '').trim() }
  } catch (error) {
    console.warn('Failed to parse frontmatter:', error)
    return { data: {}, content }
  }
}

/**
 * 简易 YAML 解析器
 */
function parseFrontmatterYAML(content: string): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  const lines = content.split('\n')

  for (const line of lines) {
    if (line.match(/^\s*$/)) continue

    const match = line.match(/^(\w+)\s*:\s*(.*)$/)
    if (!match) continue

    const [, key, value] = match
    if (key && value) {
      data[key.trim()] = parseValue(value.trim())
    }
  }

  return data
}

/**
 * 解析 YAML 值
 */
function parseValue(value: string): unknown {
  if (!value) return null

  // 布尔值
  if (value === 'true') return true
  if (value === 'false') return false

  // 数字
  if (/^\d+$/.test(value)) return parseInt(value, 10)

  // 日期
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return new Date(value)

  // 数组
  if (value.startsWith('[') && value.endsWith(']')) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  // 对象
  if (value.startsWith('{') && value.endsWith('}')) {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  return value
}

/**
 * 计算阅读时间（分钟）
 */
export function calculateReadingTime(
  content: string,
  wordsPerMinute: number = 200
): number {
  if (typeof content !== 'string') return 0

  if (typeof wordsPerMinute !== 'number' || wordsPerMinute <= 0) {
    throw new RangeError('wordsPerMinute must be greater than 0')
  }

  const words = content.split(/\s+/).filter((w) => w.length > 0).length
  const minutes = Math.ceil(words / wordsPerMinute)

  return Math.max(1, minutes)
}

/**
 * 提取文章摘要
 */
export function extractSummary(content: string, length: number = 150): string {
  if (typeof content !== 'string') return ''

  if (typeof length !== 'number' || length <= 0) {
    throw new RangeError('length must be greater than 0')
  }

  // 移除 Markdown 格式
  const text = content
    .replace(/^#+\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\*\*([^\*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .trim()

  const summary = text.substring(0, length).trim()

  return summary.endsWith('.') || summary.endsWith('!') || summary.endsWith('?')
    ? summary
    : summary + '...'
}

/**
 * 将文本转为 slug
 */
export function slugify(text: string): string {
  if (typeof text !== 'string') return ''

  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * 格式化日期
 */
export function formatDate(
  date: Date | string | number,
  locale: string = 'en-US'
): string {
  try {
    const dateObj = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date

    if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) {
      return String(date)
    }

    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(dateObj)
  } catch (err) {
    console.debug('Date formatting error:', err)
    return String(date)
  }
}

/**
 * 按日期分组文章
 */
export function groupByDate(
  articles: readonly any[]
): Map<string, readonly any[]> {
  const groups = new Map<string, any[]>()

  if (!Array.isArray(articles)) {
    return groups
  }

  for (const article of articles) {
    try {
      if (!article || typeof article !== 'object') continue

      const date = article.date instanceof Date ? article.date : new Date(article.date)

      if (Number.isNaN(date.getTime())) {
        continue
      }

      const year = date.getFullYear().toString()

      if (!groups.has(year)) {
        groups.set(year, [])
      }

      groups.get(year)!.push(article)
    } catch (err) {
      console.debug('Error grouping article:', err)
    }
  }

  // 冻结内部数组
  for (const [key, value] of groups.entries()) {
    if (Array.isArray(value)) {
      groups.set(key, Object.freeze(value as any))
    }
  }

  return groups
}

/**
 * 排序文章
 */
export function sortArticles(
  articles: readonly any[],
  order: 'asc' | 'desc' = 'desc'
): readonly any[] {
  if (!Array.isArray(articles)) {
    return []
  }

  const sorted = [...articles].sort((a, b) => {
    const dateA = a?.date instanceof Date ? a.date : new Date(a?.date)
    const dateB = b?.date instanceof Date ? b.date : new Date(b?.date)

    const timeA = dateA.getTime()
    const timeB = dateB.getTime()

    if (Number.isNaN(timeA) || Number.isNaN(timeB)) {
      return 0
    }

    return order === 'asc' ? timeA - timeB : timeB - timeA
  })

  return Object.freeze(sorted)
}

/**
 * 过滤文章
 */
export function filterArticles(
  articles: readonly any[],
  filter?: {
    tag?: string
    category?: string
    year?: number
  }
): readonly any[] {
  if (!Array.isArray(articles)) {
    return []
  }

  if (!filter) {
    return articles
  }

  return Object.freeze(
    articles.filter((article) => {
      if (!article || typeof article !== 'object') {
        return false
      }

      if (filter.tag) {
        if (!Array.isArray(article.tags) ||
          !article.tags.some((t: any) => t === filter.tag)) {
          return false
        }
      }

      if (filter.category) {
        if (!Array.isArray(article.categories) ||
          !article.categories.some((c: any) => c === filter.category)) {
          return false
        }
      }

      if (filter.year) {
        const date = article.date instanceof Date ? article.date : new Date(article.date)
        if (Number.isNaN(date.getTime()) || date.getFullYear() !== filter.year) {
          return false
        }
      }

      return true
    })
  )
}

/**
 * 提取标签统计
 */
export function extractTags(
  articles: ReadonlyArray<{ tags?: readonly string[] }>
): Map<string, number> {
  const tags = new Map<string, number>()

  if (!Array.isArray(articles)) {
    return tags
  }

  for (const article of articles) {
    if (!article || typeof article !== 'object') continue

    if (Array.isArray(article.tags)) {
      for (const tag of article.tags) {
        if (typeof tag === 'string' && tag.trim()) {
          tags.set(tag, (tags.get(tag) || 0) + 1)
        }
      }
    }
  }

  return tags
}

/**
 * 提取分类统计
 */
export function extractCategories(
  articles: ReadonlyArray<{ categories?: readonly string[] }>
): Map<string, number> {
  const categories = new Map<string, number>()

  if (!Array.isArray(articles)) {
    return categories
  }

  for (const article of articles) {
    if (!article || typeof article !== 'object') continue

    if (Array.isArray(article.categories)) {
      for (const category of article.categories) {
        if (typeof category === 'string' && category.trim()) {
          categories.set(category, (categories.get(category) || 0) + 1)
        }
      }
    }
  }

  return categories
}

/**
 * 计算博客统计
 */
export function calculateStats(articles: ReadonlyArray<any>): {
  totalArticles: number
  totalTags: number
  totalCategories: number
  totalWords: number
} {
  if (!Array.isArray(articles)) {
    return {
      totalArticles: 0,
      totalTags: 0,
      totalCategories: 0,
      totalWords: 0,
    }
  }

  let totalWords = 0

  for (const article of articles) {
    if (!article || typeof article !== 'object') continue

    if (typeof article.content === 'string') {
      totalWords += article.content.split(/\s+/).filter((w: string) => w.length > 0).length
    }
  }

  const tags = extractTags(articles)
  const categories = extractCategories(articles)

  return Object.freeze({
    totalArticles: articles.length,
    totalTags: tags.size,
    totalCategories: categories.size,
    totalWords,
  })
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  if (typeof func !== 'function') {
    throw new TypeError('First argument must be a function')
  }

  if (typeof wait !== 'number' || wait < 0) {
    throw new RangeError('Wait must be a non-negative number')
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function debounced(...args: Parameters<T>) {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, wait)
  }
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  if (typeof func !== 'function') {
    throw new TypeError('First argument must be a function')
  }

  if (typeof limit !== 'number' || limit < 0) {
    throw new RangeError('Limit must be a non-negative number')
  }

  let inThrottle = false

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true

      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}
