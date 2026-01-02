<template>
  <aside class="blog-sidebar">
    <!-- 热门标签 -->
    <section class="sidebar-section">
      <h3 class="section-title">热门标签</h3>
      <div class="tag-cloud">
        <a
          v-for="(count, tag) in sortedTags"
          :key="tag"
          :href="`/tags/${tag}`"
          class="tag-item"
          :style="{ fontSize: getTagSize(tag) }"
          :title="`${count} 篇文章`"
        >
          {{ tag }}
        </a>
      </div>
    </section>

    <!-- 分类列表 -->
    <section class="sidebar-section">
      <h3 class="section-title">分类</h3>
      <ul class="category-list">
        <li v-for="(count, category) in sortedCategories" :key="category">
          <a :href="`/categories/${category}`">
            <span class="category-name">{{ category }}</span>
            <span class="category-count">{{ count }}</span>
          </a>
        </li>
      </ul>
    </section>

    <!-- 统计信息 -->
    <section class="sidebar-section stats">
      <h3 class="section-title">统计</h3>
      <div class="stats-grid">
        <div class="stat-item">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">篇文章</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.words }}</div>
          <div class="stat-label">个字</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.categories }}</div>
          <div class="stat-label">个分类</div>
        </div>
      </div>
    </section>

    <!-- 订阅 -->
    <section class="sidebar-section subscribe">
      <h3 class="section-title">订阅更新</h3>
      <form @submit.prevent="handleSubscribe" class="subscribe-form">
        <input
          v-model="email"
          type="email"
          placeholder="your@email.com"
          class="email-input"
          required
        />
        <button type="submit" class="subscribe-btn">
          订阅
        </button>
      </form>
    </section>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  tags: Record<string, number>
  categories: Record<string, number>
  stats: {
    total: number
    words: number
    categories: number
  }
}

const props = defineProps<Props>()

const email = ref('')

const sortedTags = computed(() => {
  return Object.entries(props.tags)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 20)
    .reduce((obj, [key, value]) => {
      obj[key] = value
      return obj
    }, {} as Record<string, number>)
})

const sortedCategories = computed(() => {
  return Object.entries(props.categories)
    .sort(([, a], [, b]) => b - a)
    .reduce((obj, [key, value]) => {
      obj[key] = value
      return obj
    }, {} as Record<string, number>)
})

const getTagSize = (tag: string) => {
  const count = props.tags[tag]
  const max = Math.max(...Object.values(props.tags))
  const min = Math.min(...Object.values(props.tags))
  
  const size = 12 + ((count - min) / (max - min)) * 20
  return `${size}px`
}

const handleSubscribe = () => {
  console.log('Subscribe:', email.value)
  email.value = ''
  // TODO: 实现订阅逻辑
}
</script>

<style scoped>
.blog-sidebar {
  position: sticky;
  top: 80px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sidebar-section {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--vp-c-text-1);
}

/* 标签云 */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 4px 12px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  border-radius: 4px;
  text-decoration: none;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tag-item:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  transform: scale(1.05);
}

/* 分类列表 */
.category-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.category-list li {
  margin-bottom: 8px;
}

.category-list li:last-child {
  margin-bottom: 0;
}

.category-list a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.category-list a:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  transform: translateX(4px);
}

.category-name {
  flex: 1;
  font-weight: 500;
}

.category-count {
  font-size: 12px;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg);
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
}

.category-list a:hover .category-count {
  background: rgba(59, 130, 246, 0.2);
  color: var(--vp-c-brand);
}

/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-item {
  text-align: center;
  padding: 8px;
  border-radius: 4px;
  background: var(--vp-c-bg-mute);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-brand);
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 订阅 */
.subscribe-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.email-input {
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  transition: border-color 0.2s ease;
}

.email-input:focus {
  outline: none;
  border-color: var(--vp-c-brand);
}

.subscribe-btn {
  padding: 8px 12px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.subscribe-btn:hover {
  background: var(--vp-c-brand-dark);
}

@media (max-width: 768px) {
  .blog-sidebar {
    position: static;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
