<template>
  <div class="music-leaderboard">
    <!-- 沉浸式动态背景 -->
    <div class="ambient-bg">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
      <div class="blob blob-3"></div>
      <div class="grid-overlay"></div>
    </div>

    <div class="content-wrapper">
      <!-- 头部区域 -->
      <header class="header-section">
        <div class="badge-pill">
          <span class="live-dot"></span>
          <span>实时热度排行</span>
        </div>
        <h1 class="main-title">
          Music <span class="text-gradient">Rankings</span>
        </h1>
        <p class="subtitle">探索最受欢迎的音乐，发现新的声音</p>

        <!-- 统计数据 (绑定你的真实数据) -->
        <div class="stats-board">
          <div class="stat-card">
            <div class="stat-num">{{ totalSongs }}</div>
            <div class="stat-label">总歌曲</div>
          </div>
          <div class="stat-separator"></div>
          <div class="stat-card">
            <div class="stat-num">{{ formatPlayCountShort(totalPlays) }}</div>
            <div class="stat-label">总播放</div>
          </div>
          <div class="stat-separator"></div>
          <div class="stat-card">
            <div class="stat-num">{{ updateCount }}</div>
            <div class="stat-label">今日更新</div>
          </div>
        </div>
      </header>

      <!-- 筛选控制栏 (保留原本的时间和对比逻辑) -->
      <div class="controls-bar">
        <!-- 时间范围选择 -->
        <div class="tabs glass-panel">
          <button 
            v-for="range in timeRanges"
            :key="range.value"
            :class="['tab-btn', { active: timeRange === range.value }]"
            @click="changeTimeRange(range.value)"
          >
            {{ range.label }}
          </button>
        </div>
        
        <!-- 对比类型选择 -->
        <div class="tabs glass-panel">
          <button 
            v-for="type in compareTypes"
            :key="type.value"
            :class="['tab-btn', { active: compareType === type.value }]"
            @click="changeCompareType(type.value)"
          >
            {{ type.label }}
          </button>
        </div>
      </div>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <div class="spinner"></div>
        <p>数据加载中...</p>
      </div>

      <!-- 排行榜列表 -->
      <div v-else-if="rankings.length > 0" class="rank-list">
        <transition-group name="list-anim">
          <div 
            v-for="(song, index) in rankings" 
            :key="song.song_id"
            class="rank-item glass-panel"
            :class="{'top-three': song.rank <= 3}"
            @click="playSong(song)"
          >
            <!-- 排名序号 -->
            <div class="rank-index">
              <span class="number" :class="getRankClass(song.rank)">
                {{ song.rank }}
              </span>
              <!-- 排名变化逻辑 -->
              <div 
                v-if="song.rank_changes && song.rank_changes[compareType]" 
                class="trend" 
                :class="getTrendClass(song.rank_changes[compareType])"
              >
                <span>{{ getRankChangeIcon(song.rank_changes[compareType]) }}</span>
                <span v-if="song.rank_changes[compareType].change !== 'same' && song.rank_changes[compareType].change !== 'new'">
                  {{ Math.abs(song.rank_changes[compareType].value) }}
                </span>
                <span v-if="song.rank_changes[compareType].change === 'new'">NEW</span>
              </div>
            </div>

            <!-- 封面 (支持图片加载失败回退到渐变色) -->
            <div class="cover-wrapper">
              <div class="cover-img" :style="{ background: getRandomGradient(index) }">
                <!-- 如果有图片则显示图片 -->
                <img 
                  v-if="song.cover_image && !imageLoadErrors[song.song_id]"
                  :src="`${apiUrl}/api/music/image/${song.cover_image}?token=${token}`"
                  :alt="song.title"
                  @error="handleImageError(song.song_id)"
                  class="real-image"
                />
                <!-- 如果没图片显示首字母 -->
                <span v-else class="cover-initial">{{ song.title.charAt(0) }}</span>
                
                <!-- 播放遮罩 -->
                <div class="play-overlay">
                  <div class="play-icon">▶</div>
                </div>
              </div>
              <div v-if="song.rank <= 3" class="crown-icon">
                {{ song.rank === 1 ? '👑' : (song.rank === 2 ? '🥈' : '🥉') }}
              </div>
            </div>

            <!-- 歌曲信息 -->
            <div class="song-info">
              <div class="title-row">
                <h3 class="song-title">{{ song.title }}</h3>
              </div>
              <p class="artist-name">{{ song.artist || '未知艺术家' }}</p>
            </div>

            <!-- 播放数据 -->
            <div class="play-stats">
              <div class="stat-row">
                <svg class="icon-small" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
                <span>{{ formatPlayCount(song.play_count) }}</span>
              </div>
              <div class="stat-row duration">
                {{ formatDuration(song.duration) }}
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="action-btns">
              <button class="icon-btn play" @click.stop="playSong(song)">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
            </div>
          </div>
        </transition-group>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state glass-panel">
        <div class="empty-icon">🎵</div>
        <h3>暂无排行榜数据</h3>
        <p>请稍后刷新或检查网络连接</p>
        <button @click="fetchRankings" class="retry-btn">重新加载</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, reactive } from 'vue';
import axios from 'axios';

export default {
  name: 'MusicRankingsView',
  setup() {
    // --- 原始逻辑部分开始 ---
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const token = ref(localStorage.getItem('token') || '');

    const timeRange = ref('all');
    const compareType = ref('update');
    const rankings = ref([]);
    const loading = ref(true);
    const totalSongs = ref(0);
    const totalPlays = ref(0);
    const updateCount = ref(0);
    
    // 图片错误追踪
    const imageLoadErrors = reactive({});

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
          // 计算今日更新数 (基于rank_changes逻辑)
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

    // 播放歌曲
    const playSong = (song) => {
      window.location.href = `/#/music?song_id=${song.song_id}`;
    };

    // --- 格式化工具函数 ---

    const formatPlayCount = (count) => {
      if (!count) return '0';
      if (count >= 100000) return `${(count / 10000).toFixed(1)}万`;
      if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
      return count.toString();
    };

    // 顶部统计板用的简短格式
    const formatPlayCountShort = (count) => {
      if (!count) return '0';
      if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
      if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
      return count.toString();
    };

    const formatDuration = (seconds) => {
      if (!seconds || seconds === 0) return '未知';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getRankChangeIcon = (change) => {
      if (!change) return '-';
      switch(change.change) {
        case 'up': return '▲';
        case 'down': return '▼';
        case 'same': return '-';
        case 'new': return '✨';
        default: return '-';
      }
    };

    // --- 样式辅助逻辑 ---

    // 映射 API 状态到新的 CSS 类名
    const getTrendClass = (change) => {
      if (!change) return '';
      if (change.change === 'up') return 'up';
      if (change.change === 'down') return 'down';
      if (change.change === 'new') return 'new';
      return 'same';
    };

    const getRankClass = (rank) => {
      if (rank === 1) return 'rank-1';
      if (rank === 2) return 'rank-2';
      if (rank === 3) return 'rank-3';
      return '';
    };

    // 处理图片加载失败，切换到渐变背景
    const handleImageError = (songId) => {
      imageLoadErrors[songId] = true;
    };

    // 生成确定的随机渐变色（基于index，保证列表滚动时颜色不闪烁）
    const gradients = [
      'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    ];
    const getRandomGradient = (index) => {
      return gradients[index % gradients.length];
    };

    // 自动刷新
    let refreshInterval = null;

    onMounted(() => {
      fetchRankings();
      refreshInterval = setInterval(() => {
        if (!loading.value) fetchRankings();
      }, 5 * 60 * 1000);
    });

    onUnmounted(() => {
      if (refreshInterval) clearInterval(refreshInterval);
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
      imageLoadErrors,
      fetchRankings,
      changeTimeRange,
      changeCompareType,
      playSong,
      formatPlayCount,
      formatPlayCountShort,
      formatDuration,
      getRankChangeIcon,
      getTrendClass,
      getRankClass,
      handleImageError,
      getRandomGradient
    };
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap');

/* --- 全局变量与基础设置 --- */
:root {
  --bg-dark: #050511;
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-highlight: rgba(255, 255, 255, 0.15);
  --primary: #7000ff;
  --accent: #00f2fe;
  --text-main: #ffffff;
  --text-muted: rgba(255, 255, 255, 0.6);
  --radius-lg: 24px;
  --radius-md: 16px;
  --gold: #FFD700;
  --silver: #E0E0E0;
  --bronze: #CD7F32;
}

.music-leaderboard {
  min-height: 100vh;
  /* background-color: #050511; */
  color: white;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow-x: hidden;
  padding-bottom: 50px;
}

/* --- 动态背景 --- */
.ambient-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background-color: #050511;
  overflow: hidden;
}

.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 10s infinite ease-in-out alternate;
}

.blob-1 {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #4f00bc 0%, transparent 70%);
  top: -100px;
  left: -100px;
}

.blob-2 {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #bc006d 0%, transparent 70%);
  bottom: -100px;
  right: -100px;
  animation-delay: -5s;
}

.blob-3 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, #0044bc 0%, transparent 70%);
  top: 40%;
  left: 30%;
  animation-duration: 15s;
}

.grid-overlay {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
}

@keyframes float {
  0% { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, 50px) scale(1.1); }
}

/* --- 内容容器 --- */
.content-wrapper {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

/* --- 头部区域 --- */
.header-section {
  text-align: center;
  margin-bottom: 40px;
  animation: slideDown 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.badge-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
  backdrop-filter: blur(10px);
}

.live-dot {
  width: 8px;
  height: 8px;
  background: #00ff88;
  border-radius: 50%;
  box-shadow: 0 0 10px #00ff88;
  animation: blink 2s infinite;
}

.main-title {
  font-size: clamp(40px, 6vw, 72px);
  font-weight: 800;
  line-height: 1.1;
  margin: 0 0 16px;
}

.text-gradient {
  background: linear-gradient(135deg, #fff 0%, #a5a5a5 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  position: relative;
}

.subtitle {
  color: var(--text-muted);
  font-size: 18px;
  margin-bottom: 40px;
}

/* 数据看板 */
.stats-board {
  display: inline-flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  padding: 20px 40px;
  border-radius: 24px;
  border: 1px solid var(--glass-border);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.stat-card {
  text-align: left;
  min-width: 100px;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(90deg, var(--accent), #fff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.stat-label {
  font-size: 12px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 4px;
}

.stat-separator {
  width: 1px;
  height: 30px;
  background: rgba(255,255,255,0.1);
  margin: 0 30px;
}

/* --- 控制栏 --- */
.controls-bar {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}

.tabs {
  padding: 6px;
  display: flex;
  gap: 4px;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 10px 24px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  font-size: 14px;
}

.tab-btn:hover {
  color: white;
  background: rgba(255,255,255,0.05);
}

.tab-btn.active {
  background: rgba(255,255,255,0.1);
  color: white;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 1px solid rgba(255,255,255,0.05);
}

/* --- 列表样式 --- */
.rank-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rank-item {
  display: grid;
  grid-template-columns: 60px 80px 1fr 120px 60px;
  align-items: center;
  padding: 16px;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.rank-item:hover {
  transform: scale(1.01);
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  z-index: 2;
}

/* 排名列 */
.rank-index {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.number {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.rank-1 { color: var(--gold); text-shadow: 0 0 10px rgba(255, 215, 0, 0.5); font-size: 24px; }
.rank-2 { color: var(--silver); font-size: 22px; }
.rank-3 { color: var(--bronze); font-size: 22px; }

.trend {
  font-size: 10px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 2px;
}

.trend.up { color: #00ff88; }
.trend.down { color: #ff4d4d; }
.trend.new { color: #d000ff; font-weight: bold; animation: pulse 1s infinite; }

/* 封面列 */
.cover-wrapper {
  position: relative;
  width: 60px;
  height: 60px;
}

.cover-img {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.real-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-initial {
  font-size: 24px;
  font-weight: 800;
  color: rgba(255,255,255,0.3);
}

.play-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  backdrop-filter: blur(2px);
}

.rank-item:hover .play-overlay {
  opacity: 1;
}

.play-icon {
  color: white;
  font-size: 14px;
}

.crown-icon {
  position: absolute;
  top: -10px;
  left: -8px;
  font-size: 20px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  transform: rotate(-15deg);
}

/* 信息列 */
.song-info {
  padding-left: 20px;
  min-width: 0;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.song-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-main);
}

.artist-name {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 播放数据 */
.play-stats {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-size: 13px;
  color: var(--text-muted);
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}

.icon-small {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}

/* 按钮 */
.action-btns {
  display: flex;
  justify-content: flex-end;
  opacity: 0;
  transition: opacity 0.2s;
}

.rank-item:hover .action-btns {
  opacity: 1;
}

.icon-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.1);
  background: transparent;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--primary);
  border-color: var(--primary);
  box-shadow: 0 0 15px rgba(112, 0, 255, 0.4);
}

/* 空状态与加载 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255,255,255,0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.retry-btn {
  margin-top: 20px;
  padding: 8px 24px;
  background: var(--primary);
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s;
}

.retry-btn:hover {
  filter: brightness(1.2);
}

/* --- 响应式调整 --- */
@media (max-width: 768px) {
  .rank-item {
    grid-template-columns: 40px 60px 1fr 60px; /* 移除了按钮列在移动端 */
    gap: 10px;
    padding: 12px;
  }
  
  .action-btns {
    display: none;
  }

  .stats-board {
    display: flex;
    flex-direction: column;
    gap: 15px;
    padding: 20px;
    width: 100%;
    box-sizing: border-box;
  }
  
  .stat-separator {
    width: 100%;
    height: 1px;
    margin: 5px 0;
  }

  .main-title {
    font-size: 36px;
  }
}

/* --- 动画关键帧 --- */
@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.list-anim-enter-active,
.list-anim-leave-active {
  transition: all 0.5s ease;
}

.list-anim-enter-from,
.list-anim-leave-to {
  opacity: 0;
  transform: translateY(30px);
}
</style>