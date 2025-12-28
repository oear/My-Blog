<template>
  <div class="music-player-wrapper">
    <div class="music-player">
      <!-- 播放器头部 - 显示歌曲信息 -->
      <div class="player-header">
        <div class="song-info">
          <div class="song-title">{{ currentSong?.title || '未选择' }}</div>
          <div class="song-artist">{{ currentSong?.artist || '' }}</div>
        </div>
      </div>

      <!-- 进度条 -->
      <div class="player-progress">
        <div class="progress-time">{{ formatTime(currentTime) }}</div>
        <div 
          class="progress-bar-container"
          @click="seekTo"
          @mousedown="startDrag"
          @touchstart="startDrag"
        >
          <div
            class="progress-bar"
            :style="{ width: progressPercent + '%' }"
          />
        </div>
        <div class="progress-time">{{ formatTime(duration) }}</div>
      </div>

      <!-- 控制按钮 -->
      <div class="player-controls">
        <button class="control-btn" title="播放列表" @click="togglePlaylist">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.645-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
          </svg>
        </button>

        <button v-if="currentSong?.lrc" class="control-btn" title="歌词" @click="toggleLyrics">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
          </svg>
        </button>
        
        <button class="control-btn" title="上一首" @click="previousSong">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
          </svg>
        </button>

        <button class="control-btn play-btn" :title="isPlaying ? '暂停' : '播放'" @click="togglePlay">
          <svg v-if="!isPlaying" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        </button>

        <button class="control-btn" title="下一首" @click="nextSong">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 18h2V6h-2zm-11-7l8.5-6v12z" />
          </svg>
        </button>

        <button class="control-btn" :title="volume > 0 ? '静音' : '取消静音'" @click="toggleMute">
          <svg
            v-if="volume > 0"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM7 9H3v6h4l5 5V4L7 9zm13.5 3c0 .94-.2 1.82-.54 2.64l1.51 1.51C23.16 14.77 24 12.95 24 11c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C23.16 14.77 24 12.95 24 11c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71z" />
          </svg>
        </button>

        <div class="volume-control">
          <input
            type="range"
            min="0"
            max="100"
            :value="volume"
            @input="setVolume"
            class="volume-slider"
            title="音量"
          />
        </div>
      </div>
    </div>

    <!-- 歌词面板 -->
    <Transition name="slide">
      <div v-if="showLyrics && currentSong?.lrc" class="lyrics-panel">
        <div class="lyrics-header">
          <h3>{{ currentSong.title }} - {{ currentSong.artist }}</h3>
          <button class="close-btn" @click="showLyrics = false">✕</button>
        </div>
        <div class="lyrics-content">
          <div v-if="lyrics.length > 0" class="lyrics-text">
            <div
              v-for="(line, idx) in lyrics"
              :key="idx"
              class="lyric-line"
              :class="{ active: currentLyricIndex === idx }"
              @click="seekToLyric(line.time)"
              :title="`点击跳转到 ${formatTime(line.time)}`"
            >
              {{ line.text }}
            </div>
          </div>
          <div v-else class="lyrics-loading">
            加载歌词中...
          </div>
        </div>
      </div>
    </Transition>

    <!-- 播放列表面板 -->
    <Transition name="slide">
      <div v-if="showPlaylist" class="playlist-panel">
        <div class="playlist-header">
          <h3>播放列表 ({{ playlist.length }})</h3>
          <button class="close-btn" @click="showPlaylist = false">✕</button>
        </div>
        <div class="playlist-content">
          <div
            v-for="(song, index) in playlist"
            :key="index"
            class="playlist-item"
            :class="{ active: currentIndex === index }"
            @click="playSong(index)"
          >
            <div class="item-number">{{ index + 1 }}</div>
            <div class="item-info">
              <div class="item-title">{{ song.title }}</div>
              <div class="item-artist">{{ song.artist }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

declare const __PLAYLIST__: Array<{
  name: string
  title: string
  artist: string
  url: string
  cover?: string | null
  lrc?: string | null
}>

interface Song {
  name: string
  title: string
  artist: string
  url: string
  cover?: string | null
  lrc?: string | null
}

interface LyricLine {
  time: number
  text: string
}

// ============== 状态管理 ==============
const playlist = ref<Song[]>([]);
const currentIndex = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(80);
const showPlaylist = ref(false);
const showLyrics = ref(false);
const lyrics = ref<LyricLine[]>([]);
const currentLyricIndex = ref(0);

// ============== 私有变量 ==============
let audioElement: HTMLAudioElement | null = null;
let isDragging = false;
const lyricsCache = new Map<string, LyricLine[]>();

// 事件处理器引用（用于正确清理）
const eventHandlers = {
  onTimeUpdate: null as any,
  onLoadedMetadata: null as any,
  onEnded: null as any,
  onPlay: null as any,
  onPause: null as any,
  onError: null as any,
  onMouseMove: null as any,
  onMouseUp: null as any,
  onTouchEnd: null as any,
};

// ============== 计算属性 ==============
const currentSong = computed(() => {
  return playlist.value?.[currentIndex.value] ?? null;
});

const progressPercent = computed(() => {
  return duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0;
});

// ============== 初始化和清理 ==============
onMounted(() => {
  initPlaylist();
  initAudioElement();
  setupGlobalListeners();
});

onBeforeUnmount(() => {
  cleanup();
});

// ============== 初始化函数 ==============
function initPlaylist() {
  if (typeof __PLAYLIST__ !== 'undefined' && __PLAYLIST__?.length > 0) {
    playlist.value = __PLAYLIST__;
  }
}

function initAudioElement() {
  audioElement = new Audio();
  audioElement.crossOrigin = 'anonymous';
  
  // 创建事件处理器
  eventHandlers.onTimeUpdate = () => {
    if (!isDragging && audioElement) {
      currentTime.value = audioElement.currentTime;
      updateLyricIndex();
    }
  };
  
  eventHandlers.onLoadedMetadata = () => {
    if (audioElement) {
      duration.value = audioElement.duration;
    }
  };
  
  eventHandlers.onEnded = nextSong;
  eventHandlers.onPlay = () => { isPlaying.value = true; };
  eventHandlers.onPause = () => { isPlaying.value = false; };
  eventHandlers.onError = (e: Event) => {
    console.error('Audio playback error:', e);
    isPlaying.value = false;
  };
  
  // 添加音频事件监听器
  audioElement.addEventListener('timeupdate', eventHandlers.onTimeUpdate);
  audioElement.addEventListener('loadedmetadata', eventHandlers.onLoadedMetadata);
  audioElement.addEventListener('ended', eventHandlers.onEnded);
  audioElement.addEventListener('play', eventHandlers.onPlay);
  audioElement.addEventListener('pause', eventHandlers.onPause);
  audioElement.addEventListener('error', eventHandlers.onError);
}

function setupGlobalListeners() {
  if (!audioElement) return;
  
  eventHandlers.onMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const progressBar = document.querySelector('.progress-bar-container') as HTMLElement;
    if (!progressBar || !audioElement || !duration.value) return;
    
    const rect = progressBar.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioElement.currentTime = percent * duration.value;
    currentTime.value = audioElement.currentTime;
  };
  
  eventHandlers.onMouseUp = endDrag;
  eventHandlers.onTouchEnd = endDrag;
  
  window.addEventListener('mousemove', eventHandlers.onMouseMove);
  window.addEventListener('mouseup', eventHandlers.onMouseUp);
  window.addEventListener('touchend', eventHandlers.onTouchEnd);
}

function cleanup() {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    
    // 移除所有音频事件监听器
    audioElement.removeEventListener('timeupdate', eventHandlers.onTimeUpdate);
    audioElement.removeEventListener('loadedmetadata', eventHandlers.onLoadedMetadata);
    audioElement.removeEventListener('ended', eventHandlers.onEnded);
    audioElement.removeEventListener('play', eventHandlers.onPlay);
    audioElement.removeEventListener('pause', eventHandlers.onPause);
    audioElement.removeEventListener('error', eventHandlers.onError);
  }
  
  // 移除全局监听器
  window.removeEventListener('mousemove', eventHandlers.onMouseMove);
  window.removeEventListener('mouseup', eventHandlers.onMouseUp);
  window.removeEventListener('touchend', eventHandlers.onTouchEnd);
}

// ============== 播放控制 ==============
function togglePlay() {
  if (!audioElement || !currentSong.value) return;
  
  if (isPlaying.value) {
    audioElement.pause();
  } else {
    loadAndPlaySong();
  }
}

function playSong(index: number) {
  if (index < 0 || index >= playlist.value.length || !audioElement) return;
  
  currentIndex.value = index;
  resetLyricsState();
  loadAndPlaySong();
}

function loadAndPlaySong() {
  if (!audioElement || !currentSong.value) return;
  
  audioElement.src = currentSong.value.url;
  audioElement.volume = volume.value / 100;
  audioElement.currentTime = 0;
  
  audioElement.play().catch(error => {
    console.error('Failed to play audio:', error);
    isPlaying.value = false;
  });
}

function nextSong() {
  const nextIndex = (currentIndex.value + 1) % playlist.value.length;
  playSong(nextIndex);
}

function previousSong() {
  const prevIndex = (currentIndex.value - 1 + playlist.value.length) % playlist.value.length;
  playSong(prevIndex);
}

// ============== 进度条控制 ==============
function seekTo(event: MouseEvent | TouchEvent) {
  if (!audioElement || !duration.value) return;
  
  const container = event.currentTarget as HTMLElement;
  const rect = container.getBoundingClientRect();
  const clientX = getClientX(event);
  
  const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  audioElement.currentTime = percent * duration.value;
}

function seekToLyric(time: number) {
  if (!audioElement) return;
  audioElement.currentTime = Math.max(0, time);
}

function startDrag(event: MouseEvent | TouchEvent) {
  isDragging = true;
  seekTo(event);
}

function endDrag() {
  isDragging = false;
}

function getClientX(event: MouseEvent | TouchEvent): number {
  return event instanceof MouseEvent ? event.clientX : event.touches[0].clientX;
}

// ============== 音量控制 ==============
function toggleMute() {
  volume.value = volume.value > 0 ? 0 : 80;
  updateVolume();
}

function setVolume(event: Event) {
  volume.value = parseInt((event.target as HTMLInputElement).value);
  updateVolume();
}

function updateVolume() {
  if (audioElement) {
    audioElement.volume = volume.value / 100;
  }
}

// ============== 面板控制 ==============
function togglePlaylist() {
  showPlaylist.value = !showPlaylist.value;
  if (showPlaylist.value) {
    showLyrics.value = false;
  }
}

function toggleLyrics() {
  showLyrics.value = !showLyrics.value;
  if (showLyrics.value) {
    showPlaylist.value = false;
    loadLyrics();
  }
}

// ============== 歌词管理 ==============
async function loadLyrics() {
  if (!currentSong.value?.lrc) {
    lyrics.value = [];
    return;
  }

  const lrcPath = currentSong.value.lrc;
  
  // 检查缓存
  if (lyricsCache.has(lrcPath)) {
    lyrics.value = lyricsCache.get(lrcPath) || [];
    return;
  }

  try {
    const response = await fetch(lrcPath);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch lyrics`);
    }
    
    const lrcText = await response.text();
    const parsedLyrics = parseLyrics(lrcText);
    
    lyricsCache.set(lrcPath, parsedLyrics);
    lyrics.value = parsedLyrics;
  } catch (error) {
    console.error('Failed to load lyrics:', error);
    lyrics.value = [];
  }
}

function parseLyrics(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];

  lines.forEach(line => {
    const match = line.match(/\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
    if (!match) return;
    
    const [, minutesStr, secondsStr, millisecondsStr, text] = match;
    const time = parseTime(minutesStr, secondsStr, millisecondsStr);
    const trimmedText = text.trim();
    
    if (trimmedText) {
      result.push({ time, text: trimmedText });
    }
  });

  return result.sort((a, b) => a.time - b.time);
}

function parseTime(minutesStr: string, secondsStr: string, millisecondsStr: string): number {
  const minutes = parseInt(minutesStr, 10);
  const seconds = parseInt(secondsStr, 10);
  const milliseconds = parseInt(millisecondsStr.padEnd(3, '0'), 10);
  return minutes * 60 + seconds + milliseconds / 1000;
}

function updateLyricIndex() {
  if (lyrics.value.length === 0) return;
  
  // 二分查找当前时间对应的歌词
  let left = 0;
  let right = lyrics.value.length - 1;
  let index = 0;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (lyrics.value[mid].time <= currentTime.value) {
      index = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  currentLyricIndex.value = index;
}

function resetLyricsState() {
  lyrics.value = [];
  currentLyricIndex.value = 0;
}

// ============== 工具函数 ==============
function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.music-player-wrapper {
  position: relative;
  z-index: 100;
}

.music-player {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background: linear-gradient(135deg, var(--vp-c-bg) 0%, var(--vp-c-bg-soft) 100%);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.player-header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.player-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-time {
  font-size: 11px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.progress-bar-container {
  flex: 1;
  height: 4px;
  background: var(--vp-c-bg-mute);
  border-radius: 2px;
  cursor: pointer;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--vp-c-brand);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
}

.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.control-btn:hover {
  background: var(--vp-c-brand);
  color: white;
  transform: scale(1.05);
}

.control-btn svg {
  width: 18px;
  height: 18px;
}

.play-btn {
  width: 40px;
  height: 40px;
  background: var(--vp-c-brand);
  color: white;
}

.play-btn:hover {
  background: var(--vp-c-brand-dark);
  transform: scale(1.1);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 100px;
}

.volume-slider {
  flex: 1;
  height: 4px;
  border: none;
  border-radius: 2px;
  background: var(--vp-c-bg-mute);
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--vp-c-brand);
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--vp-c-brand);
  border: none;
  cursor: pointer;
}

.playlist-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 300px;
  max-height: 400px;
  margin-top: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.playlist-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: none;
  color: var(--vp-c-text-2);
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: var(--vp-c-text-1);
}

.playlist-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.playlist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.playlist-item:hover {
  background: var(--vp-c-bg-mute);
}

.playlist-item.active {
  background: var(--vp-c-brand-soft);
}

.item-number {
  width: 24px;
  text-align: center;
  font-size: 12px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-artist {
  font-size: 11px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-duration {
  font-size: 11px;
  color: var(--vp-c-text-3);
  flex-shrink: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .music-player {
    gap: 8px;
    padding: 8px;
  }

  .album-art {
    width: 48px;
    height: 48px;
  }

  .player-controls {
    gap: 4px;
  }

  .control-btn {
    width: 28px;
    height: 28px;
  }

  .play-btn {
    width: 36px;
    height: 36px;
  }

  .playlist-panel {
    width: 280px;
  }
}
</style>
