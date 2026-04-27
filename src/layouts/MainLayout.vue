<template>
  <div class="main-layout">
    <!-- 固定顶部导航栏 -->
    <header class="top-navbar">
      <div class="navbar-left">
        <div class="logo">
          <span class="logo-icon">🎓</span>
          <span class="logo-text">KG-RAG System</span>
        </div>
      </div>

      <nav class="navbar-center">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-text">{{ item.name }}</span>
        </router-link>
      </nav>

      <div class="navbar-right">
        <router-link to="/profile" class="profile-btn" :class="{ active: isProfileActive }">
          <span class="profile-text">个人信息</span>
        </router-link>
      </div>
    </header>

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view></router-view>
    </main>

    <!-- 全局音频播放器（隐藏，用于后台播放） -->
    <audio
      ref="globalAudioPlayer"
      @timeupdate="updateProgress"
      @loadedmetadata="handleLoadedMetadata"
      @play="handlePlay"
      @pause="handlePause"
      preload="metadata"
      style="display: none;"
    ></audio>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useMusicStore } from '../stores/music'

const route = useRoute()
const musicStore = useMusicStore()
const globalAudioPlayer = ref(null)

// 导航项配置
const navItems = [
  { name: '控制台', path: '/dashboard', icon: '📊' },
  { name: '知识图谱', path: '/knowledge-graph', icon: '🔗' },
  { name: '文学殿堂', path: '/novel', icon: '📖' },
  { name: '音乐播放器', path: '/music', icon: '🎵' },
  { name: '聊天室', path: '/chat-room', icon: '💬' },
  { name: '游戏世界', path: '/game', icon: '🎮' },
  { name: '双人格斗', path: '/dual-fighter', icon: '⚔️' },
  { name: '植物大战僵尸', path: '/plants-vs-zombies', icon: '🌻' }
  // 可以在这里添加更多导航项
  // { name: '知识图谱', path: '/knowledge-graph', icon: '🔗' },
  // { name: '问答系统', path: '/qa', icon: '💬' },
]



// 判断当前路由是否激活
const isActive = (path) => {
  return route.path === path || route.path.startsWith(path + '/')
}

// 判断个人信息相关路由是否激活
const isProfileActive = computed(() => {
  return route.path.startsWith('/profile')
})

// 音频播放器事件处理
const updateProgress = () => {
  if (globalAudioPlayer.value) {
    musicStore.setCurrentTime(globalAudioPlayer.value.currentTime)
    if (globalAudioPlayer.value.duration) {
      musicStore.setDuration(globalAudioPlayer.value.duration)
    }
  }
}

const handleLoadedMetadata = () => {
  if (globalAudioPlayer.value && globalAudioPlayer.value.duration) {
    musicStore.setDuration(globalAudioPlayer.value.duration)
  }
}

const handlePlay = () => {
  musicStore.setIsPlaying(true)
}

const handlePause = () => {
  musicStore.setIsPlaying(false)
}

// 注意：ended 事件现在由 MusicPlayerView 中的 watch 监听器处理
// 这样可以正确处理不同的播放模式（顺序、循环、随机）

// 生命周期
onMounted(() => {
  // 将音频播放器设置到 store
  if (globalAudioPlayer.value) {
    musicStore.setAudioPlayer(globalAudioPlayer.value)
    // 设置初始音量
    globalAudioPlayer.value.volume = musicStore.volume / 100
  }
})

onUnmounted(() => {
  // 清理
  if (globalAudioPlayer.value) {
    globalAudioPlayer.value.pause()
    globalAudioPlayer.value.src = ''
  }
  musicStore.clearBlobUrl()
})
</script>

<style scoped>
.main-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f3f4f6;
}

/* 顶部导航栏 */
.top-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  z-index: 1000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

/* Logo */
.navbar-left {
  flex: 0 0 auto;
  min-width: 0;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 中间导航 */
.navbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.navbar-center::-webkit-scrollbar {
  display: none;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 12px;
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex: 0 0 auto;
}

.nav-item:hover {
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
}

.nav-item.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.nav-icon {
  font-size: 18px;
}

/* 右侧个人信息 */
.navbar-right {
  flex: 0 0 auto;
  display: flex;
  justify-content: flex-end;
}

.profile-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  border-radius: 50px;
  text-decoration: none;
  color: #6b7280;
  font-weight: 500;
  font-size: 14px;
  transition: all 0.2s ease;
  background: rgba(0, 0, 0, 0.03);
}

.profile-btn:hover {
  background: rgba(99, 102, 241, 0.1);
  color: #4f46e5;
}

.profile-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  margin-top: 64px; /* 顶部导航栏高度 */
  min-height: calc(100vh - 64px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .top-navbar {
    padding: 0 16px;
  }

  .logo-text {
    display: none;
  }

  .nav-text {
    display: none;
  }

  .nav-item {
    padding: 10px 14px;
  }

  .profile-text {
    display: none;
  }

  .profile-btn {
    padding: 8px;
    border-radius: 50%;
  }
}
</style>
