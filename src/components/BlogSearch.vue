<template>
  <div class="blog-search">
    <div class="search-container">
      <div class="search-input-wrapper">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          v-model="query"
          type="text"
          class="search-input"
          :placeholder="placeholder"
          @input="handleSearch"
          @focus="showResults = true"
          @blur="closeResultsDelayed"
          @keydown.escape="showResults = false"
        />
        <button
          v-if="query"
          class="clear-btn"
          @click="clearSearch"
          title="清空搜索"
        >
          ✕
        </button>
      </div>

      <!-- 搜索结果 -->
      <Transition name="search-results">
        <div v-if="showResults && (query || hasSearched)" class="search-results">
          <template v-if="query">
            <template v-if="results.length > 0">
              <div class="results-header">
                找到 {{ results.length }} 篇文章
              </div>
              <a
                v-for="result in results"
                :key="result.article.id"
                :href="`/articles/${result.article.id}`"
                class="search-result-item"
                @click="selectResult(result.article)"
              >
                <div class="result-title">
                  {{ result.article.title }}
                </div>
                <div class="result-excerpt">
                  {{ result.article.description }}
                </div>
                <div class="result-meta">
                  <span class="result-date">
                    {{ formatDate(result.article.date) }}
                  </span>
                  <span class="result-score">
                    相关度: {{ (result.score / 10).toFixed(1) }}
                  </span>
                </div>
              </a>
            </template>
            <template v-else>
              <div class="no-results">
                没有找到匹配的文章
              </div>
            </template>
          </template>
          <template v-else>
            <div class="recent-searches">
              <div class="section-title">最近搜索</div>
              <div v-if="recentSearches.length > 0" class="search-tags">
                <button
                  v-for="tag in recentSearches"
                  :key="tag"
                  class="search-tag"
                  @click="searchFor(tag)"
                >
                  {{ tag }}
                </button>
              </div>
              <div v-else class="no-recent">暂无搜索历史</div>
            </div>
          </template>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { SearchResult } from '../core'

interface Props {
  placeholder?: string
  maxRecentSearches?: number
  autoFocus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '搜索文章...',
  maxRecentSearches: 5,
  autoFocus: false,
})

const emit = defineEmits<{
  search: [query: string]
  select: [articleId: string]
}>()

// 注入的搜索引擎
const search = inject<any>('search')

const query = ref('')
const showResults = ref(false)
const hasSearched = ref(false)
const results = ref<SearchResult[]>([])
const recentSearches = ref<string[]>([])

const handleSearch = (event: Event) => {
  const input = event.target as HTMLInputElement
  const q = input.value.trim()

  if (q) {
    results.value = search?.search(q) || []
    emit('search', q)
  } else {
    results.value = []
  }

  hasSearched.value = true
}

const searchFor = (tag: string) => {
  query.value = tag
  const q = tag.trim()
  results.value = search?.search(q) || []
  emit('search', q)
  addRecentSearch(tag)
}

const selectResult = (article: any) => {
  emit('select', article.id)
  addRecentSearch(query.value)
  showResults.value = false
}

const addRecentSearch = (q: string) => {
  if (!q) return
  const idx = recentSearches.value.indexOf(q)
  if (idx > -1) {
    recentSearches.value.splice(idx, 1)
  }
  recentSearches.value.unshift(q)
  recentSearches.value = recentSearches.value.slice(0, props.maxRecentSearches)
  localStorage.setItem('recentSearches', JSON.stringify(recentSearches.value))
}

const clearSearch = () => {
  query.value = ''
  results.value = []
  showResults.value = false
  hasSearched.value = false
}

const closeResultsDelayed = () => {
  setTimeout(() => {
    showResults.value = false
  }, 200)
}

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN')
}

// 加载最近搜索
const loadRecentSearches = () => {
  const saved = localStorage.getItem('recentSearches')
  if (saved) {
    recentSearches.value = JSON.parse(saved)
  }
}

// 初始化
loadRecentSearches()
</script>

<style scoped>
.blog-search {
  width: 100%;
}

.search-container {
  position: relative;
  width: 100%;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 8px 12px;
  transition: all 0.3s ease;
}

.search-input-wrapper:focus-within {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.search-icon {
  width: 20px;
  height: 20px;
  color: var(--vp-c-text-3);
  margin-right: 8px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--vp-c-text-1);
  font-family: inherit;
}

.search-input::placeholder {
  color: var(--vp-c-text-3);
}

.clear-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--vp-c-text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.clear-btn:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.results-header {
  padding: 12px 16px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  font-weight: 500;
  border-bottom: 1px solid var(--vp-c-divider);
}

.search-result-item {
  display: block;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  text-decoration: none;
  color: inherit;
  transition: background 0.2s ease;
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover {
  background: var(--vp-c-bg-soft);
}

.result-title {
  font-weight: 600;
  color: var(--vp-c-brand);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-excerpt {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.result-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.result-date {
  display: flex;
  align-items: center;
}

.result-score {
  display: flex;
  align-items: center;
  color: var(--vp-c-brand);
}

.no-results {
  padding: 24px 16px;
  text-align: center;
  color: var(--vp-c-text-3);
}

.recent-searches {
  padding: 12px 16px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.search-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.search-tag {
  padding: 4px 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-tag:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.no-recent {
  font-size: 12px;
  color: var(--vp-c-text-3);
  padding: 8px 0;
}

.search-results-enter-active,
.search-results-leave-active {
  transition: all 0.2s ease;
}

.search-results-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.search-results-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
