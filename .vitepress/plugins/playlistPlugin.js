import fs from 'fs'
import path from 'path'

export function createPlaylistPlugin() {
  return {
    name: 'vitepress-music-playlist',
    resolveId(id) {
      if (id === 'virtual-playlist') {
        return id
      }
    },
    load(id) {
      if (id === 'virtual-playlist') {
        const songsDir = path.resolve(this.config.root, 'public/songs')
        const playlist = generatePlaylist(songsDir)
        return `export default ${JSON.stringify(playlist)}`
      }
    }
  }
}

function generatePlaylist(songsDir) {
  if (!fs.existsSync(songsDir)) {
    return []
  }

  const files = fs.readdirSync(songsDir)
  const audioExtensions = ['.flac', '.mp3', '.wav', '.aac', '.ogg']
  const imageExtensions = ['.jpg', '.png', '.jpeg', '.webp']

  const songMap = new Map()

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase()
    const basename = path.basename(file, ext)
    
    if (audioExtensions.includes(ext)) {
      if (!songMap.has(basename)) {
        songMap.set(basename, { audio: null, cover: null })
      }
      songMap.get(basename).audio = file
    } else if (imageExtensions.includes(ext)) {
      if (!songMap.has(basename)) {
        songMap.set(basename, { audio: null, cover: null })
      }
      songMap.get(basename).cover = file
    }
  })

  return Array.from(songMap.entries())
    .filter(([, info]) => info.audio)
    .map(([basename, info]) => {
      const parts = basename.includes(' - ') ? basename.split(' - ') : [basename, 'Unknown']
      return {
        name: basename,
        title: parts[0],
        artist: parts[1] || 'Unknown',
        url: `/songs/${info.audio}`,
        cover: info.cover ? `/songs/${info.cover}` : null,
        lrc: null
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'zh'))
}
