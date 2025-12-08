<template>
  <div class="app-container">
    <!-- 动态弥散背景 -->
    <div class="ambient-background">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>

    <!-- 内容区域 -->
    <div class="glass-layout">
      <!-- 加载状态 -->
      <transition name="fade" mode="out-in">
        <div v-if="loading" class="loading-wrapper">
          <div class="loader"></div>
          <p>正在同步数据...</p>
        </div>

        <div v-else class="dashboard-grid">
          <!-- 左侧：个人概览卡片 -->
          <aside class="profile-sidebar glass-card">
            <div class="profile-header">
              <div class="avatar-wrapper" @click="triggerAvatarUpload">
                <img
                  v-if="userInfo.avatar && avatarBlobUrl"
                  :src="avatarBlobUrl"
                  class="avatar-img"
                  alt="Avatar"
                  @error="handleAvatarError"
                  @load="handleAvatarLoad"
                />
                <div v-else class="avatar-placeholder">
                  {{ (userInfo.username || 'U')[0].toUpperCase() }}
                </div>
                <div class="avatar-overlay">
                  <el-icon><Camera /></el-icon>
                </div>
                <div class="status-indicator online"></div>
              </div>
              <input
                type="file"
                ref="avatarInput"
                @change="handleAvatarChange"
                accept="image/*"
                style="display: none"
              />
              
              <h2 class="username">{{ userInfo.username || '未知用户' }}</h2>
              <p class="email">{{ userInfo.email || 'user@example.com' }}</p>
              
              <div class="tags">
                <span class="tag pro-tag">PRO 会员</span>
                <span class="tag dev-tag">开发者</span>
              </div>
            </div>

            <div class="divider"></div>

            <div class="sidebar-menu">
              <div 
                class="menu-item"
                :class="{ active: $route.name === 'Profile' }"
                @click="router.push('/profile')"
              >
                <i class="el-icon-user"></i>
                <span>个人中心</span>
              </div>
              <div 
                class="menu-item"
                :class="{ active: $route.name === 'AccountSettings' }"
                @click="router.push('/account-settings')"
              >
                <i class="el-icon-setting"></i>
                <span>账号设置</span>
              </div>
              <div 
                class="menu-item"
                :class="{ active: $route.name === 'SecurityPrivacy' }"
                @click="router.push('/security-privacy')"
              >
                <i class="el-icon-lock"></i>
                <span>安全隐私</span>
              </div>
            </div>

            <div class="sidebar-footer">
              <button @click="handleLogout" class="btn-logout">
                <i class="el-icon-switch-button"></i>
                <span>退出登录</span>
              </button>
              <button @click="handleDeleteAccount" class="btn-logout btn-delete">
                <i class="el-icon-delete"></i>
                <span>注销账户</span>
              </button>
            </div>
          </aside>

          <!-- 右侧：数据与功能区 -->
          <main class="main-content">
            <!-- 顶部欢迎语 -->
            <header class="content-header">
              <div class="greeting-container">
                <div class="greeting-main">
                  <span class="greeting-emoji">{{ greetingEmoji }}</span>
                  <h1 class="greeting-text">
                    {{ greetingMessage }}，<span class="username-highlight">{{ userInfo.username }}</span>
                  </h1>
                </div>
                <p class="greeting-subtitle">{{ greetingSubtitle }}</p>
              </div>
            </header>

            <!-- 数据统计 Bento Grid -->
            <div class="stats-container">
              <div class="stat-card glass-card blue-theme">
                <div class="card-bg-decoration"></div>
                <div class="stat-icon-bg">
                  <i class="el-icon-time"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ userInfo.online_days }}</span>
                  <span class="stat-label">在线天数</span>
                </div>
              </div>

              <div class="stat-card glass-card purple-theme">
                <div class="card-bg-decoration"></div>
                <div class="stat-icon-bg">
                  <i class="el-icon-search"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">{{ userInfo.request_count }}</span>
                  <span class="stat-label">总查询量</span>
                </div>
              </div>

              <div class="stat-card glass-card green-theme">
                <div class="card-bg-decoration"></div>
                <div class="stat-icon-bg">
                  <i class="el-icon-data-line"></i>
                </div>
                <div class="stat-info">
                  <span class="stat-value">99.9%</span>
                  <span class="stat-label">服务可用性</span>
                </div>
              </div>
            </div>

            <!-- 快捷功能区 -->
            <div class="section-title">快捷入口</div>
            <div class="quick-actions-grid">
              <div class="action-card glass-card action-doc-theme">
                <div class="action-bg-shape"></div>
                <div class="action-icon">
                  <i class="el-icon-document"></i>
                </div>
                <div class="action-content">
                    <h3>使用文档</h3>
                    <p>查看API接口文档与说明</p>
                </div>
                <i class="el-icon-right arrow-icon"></i>
              </div>

              <div class="action-card glass-card action-msg-theme">
                <div class="action-bg-shape"></div>
                <div class="action-icon">
                  <i class="el-icon-message-solid"></i>
                </div>
                <div class="action-content">
                    <h3>消息通知</h3>
                    <p>查看最新的系统公告</p>
                </div>
                <i class="el-icon-right arrow-icon"></i>
              </div>

              <div class="action-card glass-card action-data-theme">
                <div class="action-bg-shape"></div>
                <div class="action-icon">
                  <i class="el-icon-pie-chart"></i>
                </div>
                <div class="action-content">
                    <h3>数据报表</h3>
                    <p>导出过去30天的数据</p>
                </div>
                <i class="el-icon-right arrow-icon"></i>
              </div>
            </div>
          </main>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import { Camera } from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const avatarInput = ref(null)
const avatarBlobUrl = ref('') // 头像Blob URL（响应式）
const avatarLoading = ref(false) // 头像加载状态
const avatarError = ref(false) // 头像加载错误状态
const userInfo = ref({
  username: '',
  email: '',
  avatar: '',
  created_at: null,
  last_activity: null,
  request_count: 0,
  online_days: 0
})

// 头像缓存工具函数 - 使用 Base64 存储
const avatarCache = {
  // 获取缓存头像
  async get(username, filename) {
    const cached = localStorage.getItem(`avatar_${username}`)
    if (!cached) return null

    try {
      const data = JSON.parse(cached)
      // 检查缓存是否过期（24小时）或文件名不匹配
      const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000
      const filenameMismatch = filename && data.filename !== filename

      if (isExpired || filenameMismatch) {
        this.remove(username)
        return null
      }

      // 将 Base64 转换回 Blob URL
      if (data.base64) {
        const blob = await this.base64ToBlob(data.base64, data.mimeType)
        return URL.createObjectURL(blob)
      }

      return null
    } catch (error) {
      console.error('读取缓存失败:', error)
      this.remove(username)
      return null
    }
  },

  // 设置缓存头像 - 存储 Base64
  async set(username, filename, blob, mimeType) {
    try {
      const base64 = await this.blobToBase64(blob)
      localStorage.setItem(`avatar_${username}`, JSON.stringify({
        filename,
        base64,
        mimeType,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('缓存头像失败:', error)
    }
  },

  // Blob 转 Base64
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  },

  // Base64 转 Blob
  base64ToBlob(base64, mimeType) {
    return fetch(`data:${mimeType};base64,${base64}`)
      .then(res => res.blob())
  },

  // 删除缓存头像
  remove(username) {
    localStorage.removeItem(`avatar_${username}`)
  },

  // 清除所有头像缓存
  clearAll() {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('avatar_')) {
        localStorage.removeItem(key)
      }
    })
  }
}

// 从后端获取头像二进制并转为Blob URL
const fetchAvatar = async (filename) => {
  if (!filename) return null

  try {
    avatarLoading.value = true
    avatarError.value = false

    const response = await request.get(`/auth/avatar/${filename}`, {
      responseType: 'blob',
      timeout: 10000 // 10秒超时
    })

    // 验证返回的是图片类型
    const contentType = response.headers['content-type']
    if (!contentType || !contentType.startsWith('image/')) {
      console.error('返回的不是图片类型:', contentType)
      avatarError.value = true
      return null
    }

    const blob = response.data
    const blobUrl = URL.createObjectURL(blob)

    // 更新缓存 - 存储 Base64 而不是 Blob URL
    if (userInfo.value.username) {
      await avatarCache.set(userInfo.value.username, filename, blob, contentType)
    }

    return blobUrl
  } catch (error) {
    console.error('获取头像失败:', error)
    avatarError.value = true
    // 清除可能损坏的缓存
    if (userInfo.value.username) {
      avatarCache.remove(userInfo.value.username)
    }
    return null
  } finally {
    avatarLoading.value = false
  }
}

// 加载头像（优先缓存，否则从后端获取）
const loadAvatar = async () => {
  const { username, avatar } = userInfo.value
  if (!avatar) {
    avatarBlobUrl.value = ''
    avatarError.value = false
    return
  }

  // 1. 先检查缓存
  const cachedUrl = await avatarCache.get(username, avatar)
  if (cachedUrl) {
    console.log('使用缓存头像 (从 Base64 恢复)')
    avatarBlobUrl.value = cachedUrl
    avatarError.value = false
    return
  }

  // 2. 从后端获取头像二进制
  console.log('从后端获取头像:', avatar)
  const blobUrl = await fetchAvatar(avatar)
  if (blobUrl) {
    avatarBlobUrl.value = blobUrl
  } else {
    // 加载失败，显示占位符
    avatarBlobUrl.value = ''
  }
}

// 处理头像加载错误
const handleAvatarError = () => {
  console.error('头像图片加载失败')
  avatarError.value = true
  avatarBlobUrl.value = ''
  // 清除损坏的缓存
  if (userInfo.value.username) {
    avatarCache.remove(userInfo.value.username)
  }
}

// 处理头像加载成功
const handleAvatarLoad = () => {
  console.log('头像加载成功')
  avatarError.value = false
}

const triggerAvatarUpload = () => {
  avatarInput.value?.click()
}

const handleAvatarChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过5MB')
    return
  }

  // 立即显示本地预览
  const blobUrl = URL.createObjectURL(file)
  avatarBlobUrl.value = blobUrl

  const formData = new FormData()
  formData.append('file', file)

  try {
    const res = await request.post('/auth/upload-avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    userInfo.value.avatar = res.data.avatar
    
    // 上传成功后更新缓存 - 使用 Base64
    await avatarCache.set(userInfo.value.username, res.data.avatar, file, file.type)
    
    ElMessage.success('头像上传成功')
  } catch (error) {
    avatarBlobUrl.value = ''
    ElMessage.error(error.response?.data?.detail || '头像上传失败')
  }

  event.target.value = ''
}

const greetingMessage = ref('')
const greetingEmoji = ref('')
const greetingSubtitle = ref('')

const generateGreeting = () => {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 9) {
    greetingMessage.value = '早安'
    greetingEmoji.value = '🌅'
    greetingSubtitle.value = '美好的一天从现在开始'
  } else if (hour >= 9 && hour < 12) {
    greetingMessage.value = '上午好'
    greetingEmoji.value = '☀️'
    greetingSubtitle.value = '保持专注，创造精彩'
  } else if (hour >= 12 && hour < 14) {
    greetingMessage.value = '中午好'
    greetingEmoji.value = '🌤️'
    greetingSubtitle.value = '记得休息一下，补充能量'
  } else if (hour >= 14 && hour < 18) {
    greetingMessage.value = '下午好'
    greetingEmoji.value = '🌞'
    greetingSubtitle.value = '继续加油，胜利就在前方'
  } else if (hour >= 18 && hour < 22) {
    greetingMessage.value = '晚上好'
    greetingEmoji.value = '🌆'
    greetingSubtitle.value = '辛苦了，享受悠闲时光'
  } else {
    greetingMessage.value = '夜深了'
    greetingEmoji.value = '🌙'
    greetingSubtitle.value = '早点休息，明天更美好'
  }
}

const fetchUserInfo = async () => {
  try {
    const res = await request.get('/auth/me')
    userInfo.value = {
      username: res.data.username,
      email: res.data.email,
      avatar: res.data.avatar || '',
      created_at: res.data.created_at,
      last_activity: res.data.last_activity,
      request_count: res.data.request_count || 0,
      online_days: res.data.online_days || 0
    }

    // 如果有头像，从后端获取并显示
    if (userInfo.value.avatar) {
      await loadAvatar()
    }

    loading.value = false
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '获取用户信息失败')
    loading.value = false
    userInfo.value = {
      ...userInfo.value,
      request_count: 0,
      online_days: 1
    }
  }
}

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}

const handleDeleteAccount = async () => {
  try {
    await ElMessageBox.confirm(
      '此操作将永久删除您的账户和所有数据，无法恢复。您确定要继续吗？',
      '确认注销账户',
      {
        confirmButtonText: '确定注销',
        cancelButtonText: '取消',
        type: 'warning',
        center: true
      }
    )

    await request.delete('/auth/delete-account')
    userStore.logout()
    ElMessage.success('账户已成功注销')
    router.push('/login')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error(error.response?.data?.detail || '注销账户失败')
    }
  }
}

// 清理 Blob URL
onBeforeUnmount(() => {
  if (avatarBlobUrl.value && avatarBlobUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarBlobUrl.value)
  }
})

onMounted(async () => {
  generateGreeting()
  
  // 确保 token 存在后再请求
  const token = localStorage.getItem('token')
  if (!token || !token.trim()) {
    ElMessage.error('未找到登录凭证，请重新登录')
    router.push('/login')
    return
  }
  
  await fetchUserInfo()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

/* 全局重置与基础设置 */
:deep(*) {
  box-sizing: border-box;
}

.app-container {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background-color: #f0f2f5;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #1f2937;
}

/* 1. 动态弥散背景 */
.ambient-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  background: #f8fafc;
}

.shape {
  position: absolute;
  filter: blur(90px);
  border-radius: 50%;
  opacity: 0.5;
  animation: float 20s infinite ease-in-out;
}

.shape-1 {
  top: -15%;
  left: -15%;
  width: 60vw;
  height: 60vw;
  background: radial-gradient(circle, #c4b5fd 0%, rgba(196, 181, 253, 0) 70%);
}

.shape-2 {
  bottom: -15%;
  right: -10%;
  width: 50vw;
  height: 50vw;
  background: radial-gradient(circle, #a5f3fc 0%, rgba(165, 243, 252, 0) 70%);
  animation-delay: -5s;
}

.shape-3 {
  top: 30%;
  left: 30%;
  width: 40vw;
  height: 40vw;
  background: radial-gradient(circle, #fbcfe8 0%, rgba(251, 207, 232, 0) 70%);
  animation-delay: -10s;
}

@keyframes float {
  0% { transform: translate(0, 0) rotate(0deg); }
  50% { transform: translate(20px, 30px) rotate(5deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

/* 2. 玻璃拟态容器 */
.glass-layout {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 基础卡片样式 */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.02), 
    0 10px 15px -3px rgba(0, 0, 0, 0.03),
    inset 0 0 0 1px rgba(255,255,255,0.5); /* 内部高光边框 */
  border-radius: 24px;
}

/* 3. Dashboard 布局 */
.dashboard-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 32px;
  width: 100%;
  max-width: 1600px;
  height: 100%;
  max-height: 900px;
}

/* 左侧侧边栏 */
.profile-sidebar {
  display: flex;
  flex-direction: column;
  padding: 32px;
  height: 100%;
  background: rgba(255, 255, 255, 0.85); /* 侧边栏更不透明一点 */
}

.profile-header { text-align: center; }

.avatar-wrapper {
  position: relative;
  width: 110px;
  height: 110px;
  margin: 0 auto 20px;
  cursor: pointer;
}

.avatar-placeholder, .avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 12px 24px -8px rgba(99, 102, 241, 0.4);
  border: 4px solid white;
}

.avatar-placeholder {
  background: linear-gradient(135deg, #818cf8, #c084fc);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 700;
}

.avatar-overlay {
  position: absolute;
  top: 4px; left: 4px; right: 4px; bottom: 4px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.avatar-overlay .el-icon { color: white; font-size: 28px; }
.avatar-wrapper:hover .avatar-overlay { opacity: 1; }

.status-indicator {
  position: absolute;
  bottom: 8px; right: 8px;
  width: 20px; height: 20px;
  border-radius: 50%;
  border: 3px solid white;
  background-color: #10b981;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.05);
}

.username {
  font-size: 22px;
  font-weight: 800;
  margin-bottom: 4px;
  color: #1f2937;
  letter-spacing: -0.5px;
}

.email {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 20px;
}

.tags { display: flex; justify-content: center; gap: 8px; }

.tag {
  font-size: 11px;
  padding: 5px 12px;
  border-radius: 20px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.pro-tag { background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; }
.dev-tag { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }

.divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(0,0,0,0.06), transparent);
  margin: 28px 0;
}

.sidebar-menu { flex: 1; display: flex; flex-direction: column; gap: 6px; }

.menu-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 16px;
  cursor: pointer;
  color: #4b5563;
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  font-weight: 500;
  font-size: 15px;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.8);
  color: #111827;
  transform: translateX(4px);
}

.menu-item.active {
  background: white;
  color: #4f46e5;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
  font-weight: 600;
}

.menu-item i { font-size: 18px; }

.sidebar-footer { margin-top: auto; display: flex; flex-direction: column; gap: 12px; }

.btn-logout {
  width: 100%;
  padding: 14px;
  border: none;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 16px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all 0.2s;
  font-size: 14px;
}

.btn-logout:hover { background: #fee2e2; transform: translateY(-2px); }
.btn-logout.btn-delete { background: #f3f4f6; color: #6b7280; }
.btn-logout.btn-delete:hover { background: #e5e7eb; color: #374151; }

/* 右侧主内容区 */
.main-content {
  display: flex;
  flex-direction: column;
  gap: 28px;
  overflow-y: auto;
  padding-right: 8px;
}

.main-content::-webkit-scrollbar { width: 6px; }
.main-content::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }

.content-header { margin-bottom: 20px; }
.greeting-main { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }

.greeting-emoji {
  font-size: 42px;
  animation: wave 2.5s ease-in-out infinite;
  display: inline-block;
  transform-origin: 70% 70%;
}

.greeting-text {
  font-size: 32px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.8px;
}

.username-highlight {
  background: linear-gradient(135deg, #4f46e5 0%, #9333ea 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.greeting-subtitle {
  color: #6b7280;
  font-size: 15px;
  font-weight: 500;
  padding-left: 58px;
}

/* ----------------------------------------------------------------- */
/* ★ 精致的统计卡片 (Stats Cards) - 核心修改区域 */
/* ----------------------------------------------------------------- */
.stats-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.stat-card {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  overflow: hidden; /* 裁剪内部装饰 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255,255,255,0.6);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.08);
  border-color: rgba(255,255,255,1);
}

/* 卡片背景装饰 - 柔和的光晕 */
.card-bg-decoration {
  position: absolute;
  top: -50px;
  right: -50px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  filter: blur(50px);
  z-index: 0;
  opacity: 0.6;
  transition: transform 0.5s ease;
}

.stat-card:hover .card-bg-decoration {
  transform: scale(1.2);
}

/* 主题定制 */
/* 蓝色/时间主题 */
.blue-theme {
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(238, 242, 255, 0.8) 100%);
}
.blue-theme .card-bg-decoration { background: #a5b4fc; }
.blue-theme .stat-icon-bg { background: #e0e7ff; color: #4f46e5; }

/* 紫色/查询主题 */
.purple-theme {
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(243, 232, 255, 0.8) 100%);
}
.purple-theme .card-bg-decoration { background: #d8b4fe; }
.purple-theme .stat-icon-bg { background: #f3e8ff; color: #9333ea; }

/* 绿色/可用性主题 */
.green-theme {
  background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(220, 252, 231, 0.8) 100%);
}
.green-theme .card-bg-decoration { background: #86efac; }
.green-theme .stat-icon-bg { background: #dcfce7; color: #16a34a; }

/* 卡片内容层级提升，防止被背景覆盖 */
.stat-icon-bg, .stat-info { z-index: 1; position: relative; }

.stat-icon-bg {
  width: 64px; height: 64px;
  border-radius: 20px;
  display: flex; align-items: center; justify-content: center;
  font-size: 26px;
  box-shadow: 0 8px 16px -4px rgba(0,0,0,0.05);
}

.stat-info { display: flex; flex-direction: column; }
.stat-value { font-size: 28px; font-weight: 800; color: #1f2937; line-height: 1.1; letter-spacing: -0.5px; }
.stat-label { font-size: 13px; color: #6b7280; font-weight: 600; margin-top: 4px; }


/* ----------------------------------------------------------------- */
/* ★ 精致的快捷功能卡片 (Action Cards) - 核心修改区域 */
/* ----------------------------------------------------------------- */
.section-title {
  font-size: 18px; font-weight: 700; color: #374151; margin-top: 10px; margin-bottom: 8px;
  display: flex; align-items: center; gap: 8px;
}
.section-title::before {
  content: ''; display: block; width: 4px; height: 18px; 
  background: #6366f1; border-radius: 2px;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  flex: 1;
}

.action-card {
  padding: 28px;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid rgba(255,255,255,0.6);
  min-height: 180px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.action-bg-shape {
  position: absolute;
  bottom: -20px;
  right: -20px;
  width: 140px;
  height: 140px;
  border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
  opacity: 0.1;
  z-index: 0;
  transition: all 0.6s ease;
}

/* 交互效果 */
.action-card:hover {
  transform: translateY(-6px);
  border-color: rgba(255,255,255,1);
  box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.08);
}
.action-card:hover .action-bg-shape {
  transform: scale(1.5) rotate(20deg);
  opacity: 0.15;
}

/* 各个Action的主题色 */
/* 文档 - 蓝色系 */
.action-doc-theme {
  background: linear-gradient(145deg, #ffffff 0%, #f5f7ff 100%);
}
.action-doc-theme .action-bg-shape { background: #4f46e5; }
.action-doc-theme .action-icon { color: #4f46e5; background: rgba(224, 231, 255, 0.6); }
.action-doc-theme:hover .action-icon { background: #4f46e5; color: white; }

/* 消息 - 橙色/红色系 */
.action-msg-theme {
  background: linear-gradient(145deg, #ffffff 0%, #fff7f5 100%);
}
.action-msg-theme .action-bg-shape { background: #f97316; }
.action-msg-theme .action-icon { color: #ea580c; background: rgba(255, 237, 213, 0.6); }
.action-msg-theme:hover .action-icon { background: #ea580c; color: white; }

/* 报表 - 青色/蓝色系 */
.action-data-theme {
  background: linear-gradient(145deg, #ffffff 0%, #f0fdfa 100%);
}
.action-data-theme .action-bg-shape { background: #06b6d4; }
.action-data-theme .action-icon { color: #0891b2; background: rgba(207, 250, 254, 0.6); }
.action-data-theme:hover .action-icon { background: #0891b2; color: white; }


.action-icon {
  width: 54px; height: 54px;
  border-radius: 18px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px;
  margin-bottom: 20px;
  transition: all 0.3s ease;
  z-index: 1;
  position: relative;
  border: 1px solid rgba(255,255,255,0.5);
}

.action-content { position: relative; z-index: 1; }

.action-card h3 {
  font-size: 17px; font-weight: 700; color: #1f2937; margin-bottom: 8px;
}

.action-card p {
  font-size: 13px; color: #6b7280; line-height: 1.5; font-weight: 500;
}

.arrow-icon {
  position: absolute;
  top: 28px; right: 28px;
  color: #cbd5e1;
  font-size: 20px;
  transition: all 0.3s;
  z-index: 1;
}

.action-card:hover .arrow-icon {
  color: inherit; /* 跟随主题色 */
  transform: translateX(4px);
  opacity: 0.8;
}

/* 加载动画保持不变 */
.loading-wrapper {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px;
}
.loader {
  width: 48px; height: 48px;
  border: 4px solid rgba(99, 102, 241, 0.1);
  border-left-color: #6366f1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  10%, 30% { transform: rotate(14deg); }
  20% { transform: rotate(-8deg); }
  40% { transform: rotate(-4deg); }
  50% { transform: rotate(10deg); }
  60% { transform: rotate(0deg); }
}

@keyframes spin { to { transform: rotate(360deg); } }

/* 响应式 */
@media (max-width: 1200px) {
  .dashboard-grid { grid-template-columns: 280px 1fr; }
}

@media (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    max-height: none; height: auto;
    display: flex; flex-direction: column;
  }
  .profile-sidebar {
    flex-direction: row; align-items: center; padding: 24px; gap: 32px; height: auto;
  }
  .sidebar-menu { flex-direction: row; margin: 0; align-items: center; }
  .menu-item { flex-direction: column; gap: 6px; padding: 10px; font-size: 12px; }
  .menu-item i { font-size: 20px; margin-bottom: 2px; }
  
  .divider, .sidebar-footer, .email { display: none; }
  
  .profile-header { text-align: left; display: flex; align-items: center; gap: 20px; }
  .avatar-wrapper { margin: 0; width: 70px; height: 70px; }
  .username { font-size: 18px; margin-bottom: 0; }
  .tags { display: none; }

  .main-content { overflow: visible; padding-right: 0; }
}

@media (max-width: 768px) {
  .glass-layout { padding: 1rem; }
  .profile-sidebar { flex-direction: column; text-align: center; gap: 20px; }
  .profile-header { flex-direction: column; text-align: center; width: 100%; }
  .avatar-wrapper { margin: 0 auto 10px; }
  .sidebar-menu { width: 100%; justify-content: space-around; }
  
  .stats-container, .quick-actions-grid { grid-template-columns: 1fr; }
  .greeting-emoji { display: none; }
  .greeting-text { font-size: 24px; }
  .greeting-subtitle { padding-left: 0; }
}
</style>
