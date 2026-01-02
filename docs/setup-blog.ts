/**
 * VitePress 集成示例
 * 在 .vitepress/config.mts 中使用
 */

import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { BlogCore, createBlog } from '../src/core'
import {
  codeHighlightPlugin,
  autoTocPlugin,
  wordCountPlugin,
  seoPlugin,
  categoryTreePlugin
} from '../src/core/PluginManager'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ============ 初始化博客核心 ============

let blog: BlogCore | null = null

async function initializeBlog() {
  if (blog) return blog

  blog = createBlog({
    includeDrafts: process.env['NODE_ENV'] === 'development',
    defaultAuthor: 'Your Name'
  })

  // 注册官方插件
  await blog.registerPlugin(codeHighlightPlugin)
  await blog.registerPlugin(autoTocPlugin)
  await blog.registerPlugin(wordCountPlugin)
  await blog.registerPlugin(seoPlugin)
  await blog.registerPlugin(categoryTreePlugin)

  // 加载文章
  const articlesDir = path.resolve(__dirname, '../docs/articles')
  const articleFiles: Array<{ id: string; content: string }> = []

  if (fs.existsSync(articlesDir)) {
    const files = fs.readdirSync(articlesDir)

    for (const file of files) {
      if (file.endsWith('.md')) {
        const filePath = path.join(articlesDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const id = file.replace(/\.md$/, '')

        articleFiles.push({ id, content })
      }
    }
  }

  // 初始化博客
  await blog.initialize(articleFiles)

  console.log('📝 Blog initialized:', blog.getStats())

  return blog
}

// ============ VitePress 配置 ============

export default defineConfig({
  title: 'My Blog',
  description: '一个融合高品质音乐播放、技术分享的个人博客平台',
  lang: 'zh-CN',

  head: [
    ['meta', { name: 'theme-color', content: '#3c366b' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }]
  ],

  themeConfig: {
    logo: '🎵',

    nav: [
      { text: '首页', link: '/' },
      { text: '📝 文章', link: '/articles' },
      { text: '🎵 音乐', link: '/music' },
      {
        text: '更多',
        items: [
          { text: '标签', link: '/tags' },
          { text: '分类', link: '/categories' },
          { text: '时间线', link: '/timeline' },
          { text: '关于', link: '/about' }
        ]
      }
    ],

    sidebar: {
      '/articles': [
        {
          text: '文章',
          items: [
            { text: '所有文章', link: '/articles' },
            { text: '标签', link: '/tags' },
            { text: '分类', link: '/categories' }
          ]
        }
      ]
    },

    footer: {
      message: '基于 VitePress 和自定义博客核心库构建',
      copyright: 'Copyright © 2024-present My Blog'
    }
  },

  vite: {
    ssr: {
      noExternal: ['aplayer']
    },

    define: {
      // 静态定义博客数据
      __BLOG_INITIALIZED__: 'false'
    },

    plugins: [
      {
        name: 'blog-loader',
        async resolveId(id) {
          if (id === 'virtual:blog-data') {
            return id
          }
          return null
        },

        async load(id) {
          if (id === 'virtual:blog-data') {
            const blog = await initializeBlog()
            const articles = blog.getArticles()
            const stats = blog.getStats()

            return `
              export const articles = ${JSON.stringify(articles)}
              export const stats = ${JSON.stringify(stats)}
            `
          }
          return null
        }
      }
    ]
  }
})

// ============ 导出供其他文件使用 ============

export async function getBlogInstance() {
  return await initializeBlog()
}

export async function getArticles() {
  const blog = await initializeBlog()
  return blog.getArticles()
}

export async function searchArticles(query: string) {
  const blog = await initializeBlog()
  return blog.findArticles(query)
}

export async function getBlogStats() {
  const blog = await initializeBlog()
  return blog.getStats()
}
