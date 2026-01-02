/**
 * 文件操作工具
 * 统一文件系统操作，减少代码重复
 * 遵循 VSCode 的文件服务设计
 */

import { promises as fs } from 'fs'
import * as fsSync from 'fs'
import { join, resolve, extname, dirname } from 'path'
import { ErrorHandler } from './errors'
import { createModuleLogger } from './logger'

const logger = createModuleLogger('FileUtils')

export interface FileInfo {
  path: string
  name: string
  ext: string
  isDirectory: boolean
  size: number
  mtime: Date
}

export interface FileOptions {
  encoding?: BufferEncoding
  recursive?: boolean
}

/**
 * 读取文件
 */
export async function readFile(
  filePath: string,
  options?: FileOptions
): Promise<string> {
  const [content, error] = await ErrorHandler.safeExecute(
    async () => {
      const fullPath = resolve(filePath)
      return await fs.readFile(fullPath, options?.encoding ?? 'utf-8')
    },
    { context: `readFile:${filePath}` }
  )

  if (error) {
    logger.error(`Failed to read file: ${filePath}`, error)
    throw error
  }

  return content as string
}

/**
 * 写入文件
 */
export async function writeFile(
  filePath: string,
  content: string,
  options?: FileOptions
): Promise<void> {
  const [, error] = await ErrorHandler.safeExecute(
    async () => {
      const fullPath = resolve(filePath)
      const dir = dirname(fullPath)

      // 确保目录存在
      await fs.mkdir(dir, { recursive: true })
      await fs.writeFile(fullPath, content, options?.encoding ?? 'utf-8')
    },
    { context: `writeFile:${filePath}` }
  )

  if (error) {
    logger.error(`Failed to write file: ${filePath}`, error)
    throw error
  }
}

/**
 * 读取目录
 */
export async function readDir(dirPath: string): Promise<FileInfo[]> {
  const [entries, error] = await ErrorHandler.safeExecute(
    async () => {
      const fullPath = resolve(dirPath)
      const entries = await fs.readdir(fullPath, { withFileTypes: true })

      const results: FileInfo[] = []
      for (const entry of entries) {
        const stat = await fs.stat(join(fullPath, entry.name))
        results.push({
          path: join(fullPath, entry.name),
          name: entry.name,
          ext: entry.isFile() ? extname(entry.name) : '',
          isDirectory: entry.isDirectory(),
          size: stat.size,
          mtime: stat.mtime,
        })
      }

      return results
    },
    { context: `readDir:${dirPath}` }
  )

  if (error) {
    logger.error(`Failed to read directory: ${dirPath}`, error)
    throw error
  }

  return entries as FileInfo[]
}

/**
 * 递归读取目录
 */
export async function readDirRecursive(
  dirPath: string,
  pattern?: (info: FileInfo) => boolean
): Promise<FileInfo[]> {
  const [results, error] = await ErrorHandler.safeExecute(
    async () => {
      const fullPath = resolve(dirPath)
      const all: FileInfo[] = []

      async function traverse(dir: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          const fullEntryPath = join(dir, entry.name)
          const stat = await fs.stat(fullEntryPath)

          const info: FileInfo = {
            path: fullEntryPath,
            name: entry.name,
            ext: entry.isFile() ? extname(entry.name) : '',
            isDirectory: entry.isDirectory(),
            size: stat.size,
            mtime: stat.mtime,
          }

          if (!pattern || pattern(info)) {
            all.push(info)
          }

          if (entry.isDirectory()) {
            await traverse(fullEntryPath)
          }
        }
      }

      await traverse(fullPath)
      return all
    },
    { context: `readDirRecursive:${dirPath}` }
  )

  if (error) {
    logger.error(`Failed to recursively read directory: ${dirPath}`, error)
    throw error
  }

  return results as FileInfo[]
}

/**
 * 检查文件/目录是否存在
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    const fullPath = resolve(filePath)
    await fs.stat(fullPath)
    return true
  } catch {
    return false
  }
}

/**
 * 获取文件信息
 */
export async function getFileInfo(filePath: string): Promise<FileInfo | null> {
  const [info, error] = await ErrorHandler.safeExecute(
    async () => {
      const fullPath = resolve(filePath)
      const stat = await fs.stat(fullPath)

      return {
        path: fullPath,
        name: filePath.split('/').pop() ?? '',
        ext: extname(filePath),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        mtime: stat.mtime,
      }
    },
    { context: `getFileInfo:${filePath}` }
  )

  if (error) {
    logger.debug(`Failed to get file info: ${filePath}`)
    return null
  }

  return info as FileInfo
}

/**
 * 删除文件或目录
 */
export async function remove(filePath: string): Promise<void> {
  const [, error] = await ErrorHandler.safeExecute(
    async () => {
      const fullPath = resolve(filePath)
      const stat = await fs.stat(fullPath)

      if (stat.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true })
      } else {
        await fs.unlink(fullPath)
      }
    },
    { context: `remove:${filePath}` }
  )

  if (error) {
    logger.error(`Failed to remove: ${filePath}`, error)
    throw error
  }
}

/**
 * 复制文件
 */
export async function copy(src: string, dest: string): Promise<void> {
  const [, error] = await ErrorHandler.safeExecute(
    async () => {
      const srcPath = resolve(src)
      const destPath = resolve(dest)
      const destDir = dirname(destPath)

      // 确保目标目录存在
      await fs.mkdir(destDir, { recursive: true })
      await fs.copyFile(srcPath, destPath)
    },
    { context: `copy:${src}->${dest}` }
  )

  if (error) {
    logger.error(`Failed to copy: ${src} -> ${dest}`, error)
    throw error
  }
}

/**
 * 按扩展名过滤文件
 */
export function filterByExtension(files: FileInfo[], extensions: string[]): FileInfo[] {
  const exts = new Set(extensions.map((e) => e.toLowerCase()))
  return files.filter((f) => exts.has(f.ext.toLowerCase()))
}

/**
 * 按扩展名搜索文件
 */
export async function findFiles(
  dirPath: string,
  extensions: string[]
): Promise<FileInfo[]> {
  const files = await readDirRecursive(dirPath, (info) => !info.isDirectory)
  return filterByExtension(files, extensions)
}

/**
 * 读取 JSON 文件
 */
export async function readJSON<T = unknown>(filePath: string): Promise<T> {
  const content = await readFile(filePath)
  return JSON.parse(content) as T
}

/**
 * 写入 JSON 文件
 */
export async function writeJSON<T>(filePath: string, data: T, pretty = true): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  await writeFile(filePath, content)
}

/**
 * 文件监视器
 */
export class FileWatcher {
  private watchers: Map<string, any> = new Map()

  watch(filePath: string, callback: (eventType: string, filename: string | null) => void): void {
    const fullPath = resolve(filePath)
    try {
      // 使用 watchFile 替代 watch，更兼容
      const watcher = fsSync.watchFile(fullPath, (curr: any, prev: any) => {
        if (curr.mtime > prev.mtime) {
          callback('change', fullPath)
        }
      })
      this.watchers.set(fullPath, watcher)
    } catch (err) {
      logger.error(`Failed to watch file: ${filePath}`, err as Error)
    }
  }

  unwatch(filePath: string): void {
    const fullPath = resolve(filePath)
    try {
      fsSync.unwatchFile(fullPath)
      this.watchers.delete(fullPath)
    } catch (err) {
      logger.error(`Failed to unwatch file: ${filePath}`, err as Error)
    }
  }

  unwatchAll(): void {
    for (const filePath of this.watchers.keys()) {
      try {
        fsSync.unwatchFile(filePath)
      } catch (err) {
        logger.error(`Failed to unwatch file: ${filePath}`, err as Error)
      }
    }
    this.watchers.clear()
  }
}
