<template>
  <div class="music-trending-container">
    <div class="trending-header">
      <h3 class="trending-title">
        <span class="fire-icon">🔥</span>
        热门趋势
        <span class="trending-subtitle">实时更新</span>
      </h3>
      <button 
        class="refresh-btn" 
        @click="refreshTrending"
        :disabled="loading"
        :class="{ 'loading': loading }"
      >
        <span v-if="!loading">🔄 刷新</span>
        <span v-else>⏳ 加载中...</span>
      </button>
    </div>
    
    <!-- 热门歌曲列表 -->
    <div v-if="loading && songs.length === 0" class="trending-loading">
      <div class="spinner"></div>
      <p>加载热门趋势...</p>
    </div>
    
    <div v-else-if="songs.length === 0" class="trending-empty">
      <p class="empty-icon">🎵</p>
      <p>暂无热门歌曲数据</p>
      <p class="empty-tip">请先播放几首歌曲来生成趋势数据</p>
    </div>
    
    <div v-else class="trending-list">
      <div 
        v-for="(song, index) in songs" 
        :key="song.song_id" 
        class="trending-item"
        :class="{ 'top-3': index < 3 }"
        @click="playSong(song)"
      >
        <!-- 排名标识 -->
        <div class="rank-badge" :class="`rank-${index + 1}`">
          <span v-if="index < 3" class="rank-icon">
            {{ index === 0 ? '👑' : index === 1 ? '🥈' : '🥉' }}
          </span>
          <span v-else class="rank-number">{{ index + 1 }}</span>
        </div>
        
        <!-- 歌曲信息 -->
        <div class="song-info">
          <img 
            v-if="song.cover_image && coverMap[song.cover_image]" 
            :src="coverMap[song.cover_image]" 
            :alt="song.title"
            class="song-cover"
          />
          <div class="song-cover-placeholder" v-else>
            🎵
          </div>
          
          <div class="song-details">
            <h4 class="song-title">{{ song.title }}</h4>
            <p class="song-artist">{{ song.artist }}</p>
          </div>
        </div>
        
        <!-- 热度分数 -->
        <div class="hotness-score">
          <div class="score-bar" :style="{ width: getHotnessPercentage(song.hotness) + '%' }"></div>
          <span class="score-value">{{ song.hotness.toFixed(1) }}</span>
        </div>
      </div>
    </div>
    
    <!-- 加载更多 -->
    <div v-if="hasMore && !loading" class="load-more">
      <button class="load-more-btn" @click="loadMore">
        加载更多
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useMusicStore } from '@/stores/music'
import request from '@/utils/request'

// API URL 配置
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const musicStore = useMusicStore()

// 响应式数据
const songs = ref([])
const loading = ref(false)
const hasMore = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const maxHotness = ref(100) // 动态最大热度值
const coverMap = ref({}) // 封面图片缓存 map

// 计算热度百分比（用于进度条）
const getHotnessPercentage = (hotness) => {
  // 使用动态最大热度值，如果所有歌曲热度都很低，则使用默认值100
  const effectiveMax = maxHotness.value > hotness * 1.5 ? maxHotness.value : 100
  return Math.min((hotness / effectiveMax) * 100, 100)
}

// 批量获取图片数据
const loadCoversForSongs = async (songsToLoad) => {
  const coverNames = songsToLoad
    .map(song => song.cover_image)
    .filter(Boolean)
  
  if (coverNames.length === 0) return
  
  try {
    const response = await request.post('/api/music/images/batch', {
      filenames: coverNames
    })
    
    if (response.data && response.data.data) {
      // 后端返回格式: {data: {filename: "data:mime;base64,..."}}
      Object.keys(response.data.data).forEach(filename => {
        const base64Data = response.data.data[filename]
        if (base64Data) {
          coverMap.value[filename] = base64Data
        }
      })
    }
  } catch (error) {
    console.error('批量加载封面失败:', error)
  }
}

// 加载热门歌曲
const loadTrendingSongs = async (page = 1, reset = true) => {
  if (loading.value) return
  
  loading.value = true
  
  try {
    const response = await request.get('/api/music/trending', {
      params: {
        page,
        page_size: pageSize.value
      }
    })
    
    if (response.data && response.data.songs) {
      if (reset) {
        songs.value = response.data.songs
      } else {
        songs.value = [...songs.value, ...response.data.songs]
      }
      
      // 判断是否还有更多数据
      hasMore.value = response.data.songs.length === pageSize.value
      currentPage.value = page
      
      // 批量加载封面图片
      await loadCoversForSongs(response.data.songs)
    }
  } catch (error) {
    console.error('加载热门趋势失败:', error)
    // 如果后端接口不存在，使用模拟数据
    if (error.response?.status === 404) {
      loadMockTrending(reset)
    }
  } finally {
    loading.value = false
  }
}

// 加载模拟数据（用于演示）
const loadMockTrending = (reset = true) => {
  const mockSongs = [
    {
      song_id: 1,
      title: '星辰大海',
      artist: '黄霄雲',
      cover: '/images/星辰大海.jpg',
      hotness: 95.6
    },
    {
      song_id: 2,
      title: '山茶花读不懂白玫瑰',
      artist: '王忻辰',
      cover: '/images/山茶花读不懂白玫瑰.jpg',
      hotness: 88.3
    },
    {
      song_id: 3,
      title: '如果爱忘了',
      artist: '戚薇',
      cover: '/images/如果爱忘了.jpg',
      hotness: 82.7
    },
    {
      song_id: 4,
      title: '大海',
      artist: '张雨生',
      cover: '/images/大海.jpg',
      hotness: 76.5
    },
    {
      song_id: 5,
      title: '不得不爱',
      artist: '潘玮柏',
      cover: '/images/不得不爱.jpg',
      hotness: 71.2
    }
  ]
  
  if (reset) {
    songs.value = mockSongs
  } else {
    songs.value = [...songs.value, ...mockSongs]
  }
  
  hasMore.value = false
}

// 刷新热门趋势
const refreshTrending = async () => {
  await loadTrendingSongs(1, true)
}

// 加载更多
const loadMore = async () => {
  await loadTrendingSongs(currentPage.value + 1, false)
}

// 播放歌曲
const playSong = (song) => {
  musicStore.playSong({
    id: song.song_id,
    title: song.title,
    artist: song.artist,
    cover: song.cover,
    url: song.url || `/music/${song.song_id}.mp3`
  })
  
  // 发送播放事件到 Kafka（如果后端支持）
  sendPlayEvent(song.song_id)
}

// 发送播放事件
const sendPlayEvent = async (songId) => {
  try {
    await request.post('/api/music/play-event', {
      song_id: songId,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('发送播放事件失败:', error)
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadTrendingSongs()
})
</script>

<style scoped>
.music-trending-container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.trending-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.trending-title {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
}

.fire-icon {
  animation: fire-pulse 1.5s ease-in-out infinite;
}

@keyframes fire-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.2); }
}

.trending-subtitle {
  font-size: 12px;
  font-weight: normal;
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 8px;
  border-radius: 12px;
  margin-left: 8px;
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.refresh-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.trending-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trending-item {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  backdrop-filter: blur(10px);
}

.trending-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(8px);
}

.trending-item.top-3 {
  background: rgba(255, 215, 0, 0.15);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.rank-badge {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: bold;
  flex-shrink: 0;
}

.rank-icon {
  font-size: 24px;
}

.rank-number {
  color: white;
}

.song-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
}

.song-cover {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
}

.song-cover-placeholder {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.song-details {
  flex: 1;
  min-width: 0;
}

.song-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-artist {
  margin: 4px 0 0 0;
  font-size: 12px;
  opacity: 0.8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hotness-score {
  width: 100px;
  position: relative;
}

.score-bar {
  height: 4px;
  background: linear-gradient(90deg, #ff6b6b, #feca57);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.score-value {
  display: block;
  text-align: right;
  font-size: 12px;
  font-weight: bold;
  margin-top: 4px;
  color: #feca57;
}

.trending-loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.trending-empty {
  text-align: center;
  padding: 40px;
  opacity: 0.8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-tip {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 8px;
}

.load-more {
  text-align: center;
  margin-top: 16px;
}

.load-more-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  padding: 8px 24px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.load-more-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .trending-item {
    padding: 12px;
  }
  
  .rank-badge {
    width: 40px;
    height: 40px;
  }
  
  .song-cover {
    width: 40px;
    height: 40px;
  }
  
  .song-title {
    font-size: 14px;
  }
  
  .hotness-score {
    width: 80px;
  }
}
</style>
