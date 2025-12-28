import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const songsDir = path.join(__dirname, '../../public/songs');

// 获取所有音乐文件
const files = fs.readdirSync(songsDir);
const audioExtensions = ['.flac', '.mp3', '.wav', '.aac', '.ogg'];
const imageExtensions = ['.jpg', '.png', '.jpeg', '.webp'];

// 按歌曲名称分组
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

// 生成播放列表
const playlist = Array.from(songMap.entries())
  .filter(([, info]) => info.audio) // 只保留有音频文件的
  .map(([basename, info]) => ({
    name: basename,
    artist: basename.includes(' - ') ? basename.split(' - ')[1] : 'Unknown',
    title: basename.includes(' - ') ? basename.split(' - ')[0] : basename,
    url: `/songs/${info.audio}`,
    cover: info.cover ? `/songs/${info.cover}` : null,
    lrc: null // 暂未处理歌词
  }))
  .sort((a, b) => a.title.localeCompare(b.title));

// 输出JSON文件
const outputPath = path.join(__dirname, '../cache/playlist.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(playlist, null, 2));

console.log(`✓ Generated playlist with ${playlist.length} songs`);
