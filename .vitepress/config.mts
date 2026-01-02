import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 文件扩展名常量
const AUDIO_EXTENSIONS = ['.flac', '.mp3', '.wav', '.aac', '.ogg']
const IMAGE_EXTENSIONS = ['.jpg', '.png', '.jpeg', '.webp']
const LYRICS_EXTENSIONS = ['.lrc']

// 生成播放列表
function generatePlaylist() {
  const songsDir = path.resolve(__dirname, '../public/songs')
  
  if (!fs.existsSync(songsDir)) {
    return []
  }

  try {
    const files = fs.readdirSync(songsDir)
    const songMap = new Map<string, { audio: string | null; cover: string | null; lrc: string | null }>()

    // 首先收集所有文件
    files.forEach(file => {
      try {
        const ext = path.extname(file).toLowerCase()
        const basename = path.basename(file, ext)
        
        // 初始化entry（如果不存在）
        if (!songMap.has(basename)) {
          songMap.set(basename, { audio: null, cover: null, lrc: null })
        }
        
        const entry = songMap.get(basename)!
        if (AUDIO_EXTENSIONS.includes(ext)) {
          entry.audio = file
        } else if (IMAGE_EXTENSIONS.includes(ext)) {
          entry.cover = file
        } else if (LYRICS_EXTENSIONS.includes(ext)) {
          entry.lrc = file
        }
      } catch (err) {
        console.warn(`Failed to process file: ${file}`, err)
      }
    })

    return Array.from(songMap.entries())
      .filter(([, info]) => info.audio) // 只包含有音频文件的条目
      .map(([basename, info]) => {
        const parts = basename.includes(' - ') ? basename.split(' - ') : [basename, 'Unknown']
        return {
          name: basename,
          title: parts[0].trim(),
          artist: parts[1]?.trim() || 'Unknown',
          url: `/songs/${info.audio}`,
          cover: info.cover ? `/songs/${info.cover}` : null,
          lrc: info.lrc ? `/songs/${info.lrc}` : null
        }
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'zh'))
  } catch (err) {
    console.error('Failed to generate playlist:', err)
    return []
  }
}

const playlist = generatePlaylist()

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "My Blog",
  description: "一个融合音乐播放、技术分享的个人博客平台",
  lang: 'zh-CN',
  head: [
    ['meta', { name: 'theme-color', content: '#3c366b' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }]
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '🎵',
    nav: [
      { text: '首页', link: '/' },
      { text: '🎵 音乐', link: '/music' },
      { text: '📚 文档', link: '/markdown-examples' },
      {
        text: '更多',
        items: [
          { text: 'API 示例', link: '/api-examples' },
          { text: '关于', link: '/about' }
        ]
      }
    ],

    sidebar: {
      '/': [
        {
          text: '首页',
          items: [
            { text: '开始', link: '/' },
            { text: '音乐库', link: '/music' }
          ]
        }
      ],
      '/markdown-examples': [
        {
          text: '文档',
          items: [
            { text: 'Markdown 示例', link: '/markdown-examples' },
            { text: 'API 示例', link: '/api-examples' }
          ]
        }
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com' }
    ],

    footer: {
      message: '基于 VitePress 构建',
      copyright: 'Copyright © 2024-present My Blog'
    }
  },
  vite: {
    ssr: {
      noExternal: ['aplayer']
    },
    define: {
      __PLAYLIST__: JSON.stringify(playlist)
    }
  }
})
