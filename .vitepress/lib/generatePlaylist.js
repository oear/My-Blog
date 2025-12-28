import fs from 'fs';
import path from 'path';

export function generatePlaylistJson() {
  const publicDir = path.resolve(import.meta.url, '../../../public');
  const songsDir = path.join(publicDir, 'songs');
  
  if (!fs.existsSync(songsDir)) {
    console.warn('Songs directory not found:', songsDir);
    return [];
  }

  const files = fs.readdirSync(songsDir);
  const audioExtensions = ['.flac', '.mp3', '.wav', '.aac', '.ogg'];
  const imageExtensions = ['.jpg', '.png', '.jpeg', '.webp'];

  const songMap = new Map();

  files.forEach(file => {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file, ext);
    
    if (audioExtensions.includes(ext)) {
      if (!songMap.has(basename)) {
        songMap.set(basename, { audio: null, cover: null });
      }
      songMap.get(basename).audio = file;
    } else if (imageExtensions.includes(ext)) {
      if (!songMap.has(basename)) {
        songMap.set(basename, { audio: null, cover: null });
      }
      songMap.get(basename).cover = file;
    }
  });

  const playlist = Array.from(songMap.entries())
    .filter(([, info]) => info.audio)
    .map(([basename, info]) => {
      const parts = basename.includes(' - ') ? basename.split(' - ') : [basename, 'Unknown'];
      return {
        name: basename,
        title: parts[0],
        artist: parts[1] || 'Unknown',
        url: `/songs/${info.audio}`,
        cover: info.cover ? `/songs/${info.cover}` : null,
        lrc: null
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, 'zh'));

  return playlist;
}
