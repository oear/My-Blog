<template>
  <article class="article-card" :class="{ featured }">
    <!-- 特色图像 -->
    <div v-if="article.image" class="article-image">
      <img :src="article.image" :alt="article.title" />
      <div v-if="featured" class="featured-badge">精选</div>
    </div>

    <!-- 内容区域 -->
    <div class="article-content">
      <!-- 元数据 -->
      <div class="article-meta">
        <time :datetime="article.date.toISOString()">
          {{ formatDate(article.date) }}
        </time>
        <span v-if="article.author" class="author">
          by {{ article.author }}
        </span>
        <span v-if="article.readingTime" class="reading-time">
          {{ article.readingTime }} min read
        </span>
      </div>

      <!-- 标题 -->
      <h3 class="article-title">
        <a :href="`/articles/${article.id}`">
          {{ article.title }}
        </a>
      </h3>

      <!-- 描述 -->
      <p class="article-description">
        {{ article.description }}
      </p>

      <!-- 标签 -->
      <div v-if="article.tags.length > 0" class="article-tags">
        <a
          v-for="tag in article.tags.slice(0, 3)"
          :key="tag"
          :href="`/tags/${tag}`"
          class="tag"
        >
          #{{ tag }}
        </a>
        <span v-if="article.tags.length > 3" class="more-tags">
          +{{ article.tags.length - 3 }}
        </span>
      </div>

      <!-- 分类 -->
      <div v-if="article.categories.length > 0" class="article-categories">
        <a
          v-for="cat in article.categories"
          :key="cat"
          :href="`/categories/${cat}`"
          class="category"
        >
          📁 {{ cat }}
        </a>
      </div>

      <!-- 操作按钮 -->
      <div class="article-actions">
        <a :href="`/articles/${article.id}`" class="read-more">
          阅读更多 →
        </a>
        <button class="action-btn" @click="toggleBookmark">
          <span>{{ isBookmarked ? '已收藏' : '收藏' }}</span>
        </button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Article } from '../core'

interface Props {
  article: Article
  featured?: boolean
}

withDefaults(defineProps<Props>(), {
  featured: false,
})

const isBookmarked = ref(false)

const formatDate = (date: Date | string) => {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const toggleBookmark = () => {
  isBookmarked.value = !isBookmarked.value
  // TODO: 保存到 localStorage
}
</script>

<style scoped>
.article-card {
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  height: 100%;
}

.article-card:hover {
  border-color: var(--vp-c-brand);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.12);
  transform: translateY(-2px);
}

.article-card.featured {
  border-color: var(--vp-c-brand);
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.05),
    rgba(168, 85, 247, 0.05)
  );
}

.article-image {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.article-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.article-card:hover .article-image img {
  transform: scale(1.05);
}

.featured-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  background: var(--vp-c-brand);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.article-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
}

.article-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--vp-c-text-3);
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.article-meta time {
  font-weight: 500;
}

.article-meta .author::before {
  content: '·';
  margin-right: 12px;
}

.article-meta .reading-time::before {
  content: '·';
  margin-right: 12px;
}

.article-title {
  margin: 0 0 12px 0;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
}

.article-title a {
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 0.2s ease;
}

.article-title a:hover {
  color: var(--vp-c-brand);
}

.article-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  flex: 1;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.tag {
  padding: 4px 10px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
  border-radius: 4px;
  font-size: 12px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.tag:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
}

.more-tags {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.article-categories {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.category {
  padding: 4px 12px;
  background: rgba(100, 150, 255, 0.1);
  color: var(--vp-c-brand);
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s ease;
}

.category:hover {
  background: rgba(100, 150, 255, 0.2);
}

.article-actions {
  display: flex;
  gap: 12px;
  margin-top: auto;
}

.read-more {
  flex: 1;
  padding: 10px 16px;
  background: var(--vp-c-brand);
  color: white;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  text-align: center;
  transition: all 0.2s ease;
}

.read-more:hover {
  background: var(--vp-c-brand-dark);
  transform: translateX(2px);
}

.action-btn {
  padding: 10px 16px;
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

@media (max-width: 640px) {
  .article-image {
    height: 150px;
  }

  .article-content {
    padding: 16px;
  }

  .article-title {
    font-size: 16px;
  }

  .article-actions {
    flex-direction: column;
  }

  .read-more,
  .action-btn {
    width: 100%;
  }
}
</style>
