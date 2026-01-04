<template>
  <div class="music-rankings">
    <!-- 动态背景 -->
    <div class="bg" aria-hidden="true"></div>

    <!-- 头部标题区域 -->
    <div class="rankings-header reveal">
      <div class="header-badge">
        <span class="pulse-dot"></span>
        实时热度排行
      </div>
      <h1 class="rankings-title">
        <span class="title-main">音乐</span>
        <span class="title-gradient">排行榜</span>
      </h1>
      <p class="rankings-subtitle">探索最受欢迎的音乐，发现新的声音</p>

      <!-- 统计数据 -->
      <div class="stats-row">
        <div class="stat-item">
          <div class="stat-value">{{ totalSongs }}</div>
          <div class="stat-label">总歌曲</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ totalPlays }}</div>
          <div class="stat-label">总播放</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ updateCount }}</div>
          <div class="stat-label">今日更新</div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section reveal">
      <div class="time-range-selector">
        <button
          v-for="range in timeRanges"
          :key="range.value"
          :class="['time-btn', { active: timeRange === range.value }]"
          @click="changeTimeRange(range.value)"
        >
          {{ range.label }}
        </button>
      </div>

      <div class="compare-type-selector">
        <button
          v-for="type in compareTypes"
          :key="type.value"
          :class="['compare-btn', { active: compareType === type.value }]"
          @click="changeCompareType(type.value)"
        >
          {{ type.label }}
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container reveal">
      <div class="loading-spinner">
        <div class="spinner-ring"></div>
        <div class="spinner-ring inner"></div>
      </div>
      <p class="loading-text">加载中...</p>
    </div>

    <!-- 排行榜列表 -->
    <div v-else-if="rankings.length > 0" class="rankings-container">
      <div
        v-for="(song, index) in rankings"
        :key="song.song_id"
        class="ranking-item reveal"
        :class="{ 'top-3': song.rank <= 3 }"
        @click="playSong(song)"
      >
        <!-- 装饰光晕 -->
        <div class="item-glow"></div>

        <!-- 排名奖牌 -->
        <div class="rank-medal" :class="getRankClass(song.rank)">
          <template v-if="song.rank <= 3">
            <svg class="medal-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </template>
          <template v-else>{{ song.rank }}</template>
        </div>

        <!-- 封面 -->
        <div class="song-cover">
          <div class="cover-inner">
            <img
              v-if="song.cover_image"
              :src="`${apiUrl}/api/music/image/${song.cover_image}?token=${token}`"
              :alt="song.title"
              @error="handleImageError"
            />
            <div v-else class="no-cover">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
              </svg>
            </div>
          </div>
          <!-- 音符动画 -->
          <div class="music-notes">
            <span class="note note-1">🎵</span>
            <span class="note note-2">🎶</span>
          </div>
        </div>

        <!-- 歌曲信息 -->
        <div class="song-info">
          <h3 class="song-title">{{ song.title }}</h3>
          <p class="song-artist">{{ song.artist || '未知艺术家' }}</p>
          <div class="song-meta">
            <span class="meta-item">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
              {{ formatPlayCount(song.play_count) }}
            </span>
            <span class="meta-item duration">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
              </svg>
              {{ formatDuration(song.duration) }}
            </span>
          </div>
        </div>

        <!-- 排名变化 -->
        <div 
          v-if="song.rank_changes && song.rank_changes[compareType]" 
          class="rank-change"
          :class="getRankChangeClass(song.rank_changes[compareType])"
        >
          <div class="change-inner">
            <span class="change-icon">{{ getRankChangeIcon(song.rank_changes[compareType]) }}</span>
            <span class="change-value">{{ formatRankChange(song.rank_changes[compareType]) }}</span>
          </div>
        </div>

        <!-- 播放按钮 -->
        <button class="play-btn" @click.stop="playSong(song)">
          <div class="play-bg"></div>
          <div class="play-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state reveal">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
        </svg>
      </div>
      <h3 class="empty-title">暂无排行榜数据</h3>
      <p class="empty-desc">请稍后刷新或检查网络连接</p>
      <button @click="fetchRankings" class="retry-btn">重新加载</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import axios from 'axios';

export default {
  name: 'MusicRankingsView',
  setup() {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = ref(localStorage.getItem('token') || '');

    const timeRange = ref('all');
    const compareType = ref('update');
    const rankings = ref([]);
    const loading = ref(true);
    const totalSongs = ref(0);
    const totalPlays = ref(0);
    const updateCount = ref(0);

    const timeRanges = [
      { label: '全部时间', value: 'all' },
      { label: '今日', value: 'daily' },
      { label: '本周', value: 'weekly' },
      { label: '本月', value: 'monthly' }
    ];

    const compareTypes = [
      { label: '对比5分钟', value: 'update' },
      { label: '对比1小时', value: 'hourly' },
      { label: '对比1天', value: 'daily' }
    ];

    // 获取排行榜数据
    const fetchRankings = async () => {
      loading.value = true;
      try {
        const response = await axios.get(`${apiUrl}/api/music/rankings`, {
          params: {
            limit: 100,
            time_range: timeRange.value
          },
          headers: {
            'Authorization': `Bearer ${token.value}`
          }
        });

        if (response.data.success) {
          rankings.value = response.data.rankings;
          // 更新统计数据
          totalSongs.value = rankings.value.length;
          totalPlays.value = rankings.value.reduce((sum, song) => sum + (song.play_count || 0), 0);
          // 模拟今日更新数
          updateCount.value = Math.floor(rankings.value.filter(song => 
            song.rank_changes && song.rank_changes.update && song.rank_changes.update.change === 'new'
          ).length);
        }
      } catch (error) {
        console.error('获取排行榜失败:', error);
      } finally {
        loading.value = false;
      }
    };

    // 切换时间范围
    const changeTimeRange = (range) => {
      timeRange.value = range;
      fetchRankings();
    };

    // 切换对比类型
    const changeCompareType = (type) => {
      compareType.value = type;
    };

    // 获取排名变化图标
    const getRankChangeIcon = (change) => {
      switch(change.change) {
        case 'up':
          return '▲';
        case 'down':
          return '▼';
        case 'same':
          return '-';
        case 'new':
          return '✨';
        default:
          return '-';
      }
    };

    // 获取排名变化样式类
    const getRankChangeClass = (change) => {
      switch(change.change) {
        case 'up':
          return 'rank-change-up';
        case 'down':
          return 'rank-change-down';
        case 'same':
          return 'rank-change-same';
        case 'new':
          return 'rank-change-new';
        default:
          return 'rank-change-same';
      }
    };

    // 格式化排名变化数值
    const formatRankChange = (change) => {
      if (change.change === 'new') {
        return 'NEW';
      }
      return change.change === 'same' ? '0' : (change.value > 0 ? `+${change.value}` : change.value);
    };

    // 播放歌曲
    const playSong = (song) => {
      window.location.href = `/#/music?song_id=${song.song_id}`;
    };

    // 格式化播放次数
    const formatPlayCount = (count) => {
      if (count >= 100000) {
        return `${(count / 10000).toFixed(1)}万`;
      } else if (count >= 10000) {
        return `${(count / 10000).toFixed(1)}万`;
      }
      return count.toString();
    };

    // 格式化时长（秒 -> 分:秒）
    const formatDuration = (seconds) => {
      if (!seconds || seconds === 0) {
        return '未知';
      }
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // 获取排名样式类
    const getRankClass = (rank) => {
      if (rank === 1) return 'rank-first';
      if (rank === 2) return 'rank-second';
      if (rank === 3) return 'rank-third';
      return '';
    };

    // 处理图片加载错误
    const handleImageError = (e) => {
      e.target.style.display = 'none';
      e.target.parentElement.classList.add('error');
    };

    // 滚动动画观察器
    let observer = null;

    onMounted(() => {
      fetchRankings();
      
      // 自动刷新
      const refreshInterval = setInterval(() => {
        if (!loading.value) {
          fetchRankings();
        }
      }, 5 * 60 * 1000);

      // 初始化滚动动画
      observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('show');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      // 观察所有需要动画的元素
      setTimeout(() => {
        document.querySelectorAll('.reveal').forEach(el => {
          observer.observe(el);
        });
      }, 100);

      onUnmounted(() => {
        clearInterval(refreshInterval);
        if (observer) {
          observer.disconnect();
        }
      });
    });

    return {
      apiUrl,
      token,
      timeRange,
      compareType,
      timeRanges,
      compareTypes,
      rankings,
      loading,
      totalSongs,
      totalPlays,
      updateCount,
      fetchRankings,
      changeTimeRange,
      changeCompareType,
      playSong,
      formatPlayCount,
      formatDuration,
      getRankClass,
      getRankChangeIcon,
      getRankChangeClass,
      formatRankChange,
      handleImageError
    };
  }
};
</script>

<style scoped>
/* CSS 变量定义 - 参考 luxury_landing */
:root {
  --bg0: #070A12;
  --bg1: #0B1224;
  --card: rgba(255, 255, 255, 0.06);
  --card2: rgba(255, 255, 255, 0.08);
  --stroke: rgba(255, 255, 255, 0.10);
  --stroke2: rgba(255, 255, 255, 0.14);
  --text: rgba(255, 255, 255, 0.92);
  --muted: rgba(255, 255, 255, 0.66);
  --muted2: rgba(255, 255, 255, 0.52);
  --brand: #7C5CFF;
  --brand2: #2DE2E6;
  --brand3: #FF3D8D;
  --ok: #39D98A;
  --warn: #FFB020;
  --shadow: 0 30px 80px rgba(0, 0, 0, 0.55);
  --shadow2: 0 18px 60px rgba(0, 0, 0, 0.40);
  --radius: 22px;
  --radius2: 18px;
  --ease: cubic-bezier(0.22, 1, 0.36, 1);
  --ease2: cubic-bezier(0.16, 1, 0.3, 1);
}

.music-rankings {
  position: relative;
  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem 2rem 6rem;
  min-height: 100vh;
}

/* 动态背景 */
.bg {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: -3;
  background:
    radial-gradient(1200px 900px at 15% 18%, color-mix(in srgb, var(--brand) 25%, transparent), transparent 55%),
    radial-gradient(900px 700px at 80% 28%, color-mix(in srgb, var(--brand2) 22%, transparent), transparent 60%),
    radial-gradient(900px 700px at 60% 88%, color-mix(in srgb, var(--brand3) 18%, transparent), transparent 60%);
  filter: saturate(120%);
}

.bg::before {
  content: "";
  position: absolute;
  inset: -30vh -30vw;
  background:
    radial-gradient(closest-side, rgba(255, 255, 255, 0.06), transparent 65%) 10% 20% / 520px 520px,
    radial-gradient(closest-side, rgba(255, 255, 255, 0.05), transparent 66%) 78% 30% / 680px 680px,
    radial-gradient(closest-side, rgba(255, 255, 255, 0.04), transparent 68%) 60% 85% / 820px 820px;
  mix-blend-mode: overlay;
  opacity: 0.6;
  transform: translate3d(0, 0, 0);
  animation: drift 18s var(--ease) infinite alternate;
}

@keyframes drift {
  from { transform: translate3d(-2%, -1.5%, 0) scale(1); }
  to { transform: translate3d(2.5%, 1.6%, 0) scale(1.02); }
}

/* 头部区域 */
.rankings-header {
  text-align: center;
  margin-bottom: 3rem;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--card2) 72%, transparent);
  border: 1px solid var(--stroke);
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 1.5rem;
  animation: fadeInUp 0.6s var(--ease) forwards;
}

.pulse-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(180deg, color-mix(in srgb, var(--brand2) 85%, #fff), color-mix(in srgb, var(--brand) 85%, #000));
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--brand) 18%, transparent);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.rankings-title {
  margin: 0 0 1rem;
  font-size: clamp(40px, 5vw, 64px);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  animation: fadeInUp 0.6s var(--ease) 0.1s forwards;
  opacity: 0;
}

.title-main {
  color: var(--text);
}

.title-gradient {
  background: linear-gradient(90deg, 
    color-mix(in srgb, var(--brand) 92%, #fff), 
    color-mix(in srgb, var(--brand2) 86%, #fff), 
    color-mix(in srgb, var(--brand3) 70%, #fff));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.rankings-subtitle {
  color: var(--muted);
  font-size: 16px;
  margin: 0 0 2rem;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
  animation: fadeInUp 0.6s var(--ease) 0.2s forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 统计数据行 */
.stats-row {
  display: flex;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
  animation: fadeInUp 0.6s var(--ease) 0.3s forwards;
  opacity: 0;
}

.stat-item {
  text-align: center;
  padding: 1rem 2rem;
  border-radius: 18px;
  border: 1px solid var(--stroke);
  background: color-mix(in srgb, var(--card) 78%, transparent);
  box-shadow: var(--shadow2);
  min-width: 140px;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.03em;
  background: linear-gradient(90deg, var(--brand), var(--brand2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.stat-label {
  margin-top: 0.5rem;
  color: var(--muted);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 筛选区域 */
.filter-section {
  margin-bottom: 2rem;
  animation: fadeInUp 0.6s var(--ease) 0.4s forwards;
  opacity: 0;
}

.time-range-selector,
.compare-type-selector {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.time-btn,
.compare-btn {
  padding: 0.75rem 1.5rem;
  border: 2px solid var(--stroke);
  border-radius: 16px;
  background: color-mix(in srgb, var(--card) 85%, transparent);
  color: var(--muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s var(--ease);
  position: relative;
  overflow: hidden;
}

.time-btn:hover,
.compare-btn:hover {
  border-color: var(--stroke2);
  color: var(--text);
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.20);
}

.time-btn.active,
.compare-btn.active {
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--brand) 92%, #000),
    color-mix(in srgb, var(--brand2) 80%, #000));
  border-color: transparent;
  color: white;
  box-shadow: 0 18px 50px color-mix(in srgb, var(--brand) 26%, transparent);
}

.compare-btn {
  padding: 0.5rem 1.25rem;
  font-size: 13px;
}

/* 加载状态 */
.loading-container {
  text-align: center;
  padding: 4rem 2rem;
  animation: fadeInUp 0.6s var(--ease) forwards;
  opacity: 0;
}

.loading-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 1.5rem;
}

.spinner-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: var(--brand);
  animation: spin 1s linear infinite;
}

.spinner-ring.inner {
  inset: 12px;
  border-top-color: var(--brand2);
  animation: spin 0.8s linear infinite reverse;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--muted);
  font-size: 14px;
}

/* 排行榜容器 */
.rankings-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.ranking-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 1.25rem;
  border-radius: var(--radius);
  border: 1px solid var(--stroke);
  background: color-mix(in srgb, var(--card) 70%, transparent);
  box-shadow: var(--shadow2);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s var(--ease);
  opacity: 0;
  transform: translateY(20px);
}

.ranking-item.reveal.show {
  opacity: 1;
  transform: translateY(0);
}

.ranking-item:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: var(--stroke2);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
}

/* 装饰光晕 */
.item-glow {
  position: absolute;
  inset: -2px;
  background:
    radial-gradient(700px 320px at 10% 0%, color-mix(in srgb, var(--brand) 8%, transparent), transparent 50%),
    radial-gradient(600px 280px at 90% 12%, color-mix(in srgb, var(--brand2) 8%, transparent), transparent 50%);
  opacity: 0;
  transition: opacity 0.3s var(--ease);
  pointer-events: none;
}

.ranking-item:hover .item-glow {
  opacity: 1;
}

.ranking-item.top-3 .item-glow {
  opacity: 0.6;
}

/* 排名奖牌 */
.rank-medal {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  color: var(--muted2);
  background: color-mix(in srgb, var(--card2) 85%, transparent);
  border: 1px solid var(--stroke);
  border-radius: 16px;
  flex-shrink: 0;
  transition: all 0.3s var(--ease);
}

.medal-icon {
  width: 32px;
  height: 32px;
}

.rank-first {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 10px 30px color-mix(in srgb, #FFD700 30%, transparent);
  transform: scale(1.1);
}

.rank-second {
  background: linear-gradient(135deg, #C0C0C0 0%, #808080 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 10px 30px color-mix(in srgb, #C0C0C0 30%, transparent);
  transform: scale(1.05);
}

.rank-third {
  background: linear-gradient(135deg, #CD7F32 0%, #8B4513 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 10px 30px color-mix(in srgb, #CD7F32 30%, transparent);
  transform: scale(1.02);
}

/* 封面 */
.song-cover {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  transition: all 0.3s var(--ease);
}

.ranking-item:hover .song-cover {
  transform: scale(1.1) rotate(2deg);
}

.cover-inner {
  width: 100%;
  height: 100%;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.30);
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s var(--ease);
}

.no-cover,
.song-cover.error {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--brand) 0%, var(--brand2) 100%);
  color: white;
}

.no-cover svg {
  width: 40px;
  height: 40px;
  opacity: 0.9;
}

/* 音乐音符动画 */
.music-notes {
  position: absolute;
  inset: -5px;
  pointer-events: none;
}

.note {
  position: absolute;
  font-size: 16px;
  opacity: 0;
  animation: floatNote 2s ease-in-out infinite;
}

.note-1 {
  top: 0;
  right: 10px;
  animation-delay: 0s;
}

.note-2 {
  bottom: 0;
  left: 10px;
  animation-delay: 1s;
}

.ranking-item:hover .note {
  opacity: 1;
}

@keyframes floatNote {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
    opacity: 0;
  }
  50% {
    transform: translateY(-15px) rotate(15deg);
    opacity: 1;
  }
}

/* 歌曲信息 */
.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 0.5rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: -0.01em;
}

.song-artist {
  font-size: 14px;
  color: var(--muted);
  margin: 0 0 0.75rem 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-meta {
  display: flex;
  gap: 1.5rem;
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--muted2);
  font-size: 13px;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--card2) 72%, transparent);
  border: 1px solid var(--stroke);
}

.meta-item svg {
  width: 14px;
  height: 14px;
  opacity: 0.8;
}

/* 排名变化 */
.rank-change {
  flex-shrink: 0;
}

.change-inner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  min-width: 80px;
  justify-content: center;
  background: color-mix(in srgb, var(--card2) 72%, transparent);
  border: 1px solid var(--stroke);
}

.change-icon {
  font-size: 12px;
}

.rank-change-up {
  background: rgba(76, 175, 80, 0.15);
  color: #4CAF50;
  border-color: rgba(76, 175, 80, 0.3);
}

.rank-change-down {
  background: rgba(244, 67, 54, 0.15);
  color: #F44336;
  border-color: rgba(244, 67, 54, 0.3);
}

.rank-change-same {
  background: rgba(158, 158, 158, 0.15);
  color: var(--muted2);
  border-color: var(--stroke);
}

.rank-change-new {
  background: rgba(156, 39, 176, 0.15);
  color: #9C27B0;
  border-color: rgba(156, 39, 176, 0.3);
  animation: pulse 2s ease-in-out infinite;
}

/* 播放按钮 */
.play-btn {
  position: relative;
  width: 60px;
  height: 60px;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.3s var(--ease);
}

.play-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--brand) 92%, #000),
    color-mix(in srgb, var(--brand2) 80%, #000));
  box-shadow: 0 18px 50px color-mix(in srgb, var(--brand) 26%, transparent);
  transition: all 0.3s var(--ease);
}

.play-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  z-index: 1;
}

.play-btn:hover {
  transform: scale(1.15);
}

.play-btn:hover .play-bg {
  box-shadow: 0 22px 70px color-mix(in srgb, var(--brand) 34%, transparent);
}

.play-icon svg {
  width: 24px;
  height: 24px;
  margin-left: 3px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 6rem 2rem;
  animation: fadeInUp 0.6s var(--ease) forwards;
  opacity: 0;
}

.empty-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--card2) 72%, transparent);
  border: 1px solid var(--stroke);
  border-radius: 50%;
}

.empty-icon svg {
  width: 60px;
  height: 60px;
  color: var(--muted);
  opacity: 0.5;
}

.empty-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 0.75rem 0;
}

.empty-desc {
  color: var(--muted);
  font-size: 14px;
  margin: 0 0 2rem 0;
}

.retry-btn {
  padding: 1rem 2.5rem;
  border: 2px solid var(--brand);
  border-radius: 16px;
  background: color-mix(in srgb, var(--card) 85%, transparent);
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s var(--ease);
}

.retry-btn:hover {
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--brand) 92%, #000),
    color-mix(in srgb, var(--brand2) 80%, #000));
  border-color: transparent;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 18px 50px color-mix(in srgb, var(--brand) 26%, transparent);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .music-rankings {
    padding: 2rem 1.5rem 4rem;
  }

  .stats-row {
    gap: 1rem;
  }

  .stat-item {
    padding: 0.75rem 1.5rem;
    min-width: 120px;
  }
}

@media (max-width: 768px) {
  .music-rankings {
    padding: 1.5rem 1rem 3rem;
  }

  .rankings-title {
    font-size: 36px;
  }

  .time-range-selector,
  .compare-type-selector {
    gap: 0.5rem;
  }

  .time-btn,
  .compare-btn {
    padding: 0.6rem 1.25rem;
    font-size: 13px;
  }

  .ranking-item {
    padding: 1.25rem 1rem;
    gap: 1rem;
  }

  .rank-medal {
    width: 48px;
    height: 48px;
    font-size: 18px;
  }

  .song-cover {
    width: 64px;
    height: 64px;
  }

  .song-title {
    font-size: 16px;
  }

  .song-artist {
    font-size: 13px;
  }

  .song-meta {
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .play-btn {
    width: 50px;
    height: 50px;
  }

  .play-icon svg {
    width: 20px;
    height: 20px;
  }
}

@media (max-width: 480px) {
  .rankings-title {
    font-size: 28px;
  }

  .ranking-item {
    flex-wrap: wrap;
  }

  .rank-medal {
    margin-right: -0.5rem;
  }

  .song-info {
    flex: 1 1 100%;
    margin-top: 0.5rem;
  }

  .play-btn {
    position: absolute;
    top: 1.25rem;
    right: 1rem;
  }
}

/* 性能优化 - 减少动效偏好 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
</style>
