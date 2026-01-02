/**
 * 博客配置文件示例
 * 放在项目根目录或 .vitepress 目录中
 */

import { BlogConfig } from './src/core'

export const blogConfig: BlogConfig = {
  // 基础信息
  title: 'My Blog',
  description: '一个融合高品质音乐播放、技术分享的个人博客平台',
  url: 'https://myblog.com',

  // 文件配置
  articlesDir: './docs/articles',
  includeDrafts: false,
  pageSize: 10,

  // 功能开关
  features: {
    search: true,
    categories: true,
    tags: true,
    timeline: true,
    relatedArticles: true,
  },

  // 插件配置
  plugins: [
    {
      name: 'code-highlight',
      options: {
        theme: 'github-dark'
      }
    },
    {
      name: 'auto-toc',
      options: {
        depth: [2, 3]
      }
    },
    {
      name: 'seo',
      options: {
        generateSitemap: true,
        generateRobots: true
      }
    },
    {
      name: 'word-count'
    },
    {
      name: 'category-tree'
    }
  ]
}

export default blogConfig
