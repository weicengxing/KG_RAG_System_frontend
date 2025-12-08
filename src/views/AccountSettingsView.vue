<template>
  <div class="app-container">
    <!-- 动态背景 -->
    <div class="ambient-background">
      <div class="shape shape-1"></div>
      <div class="shape shape-2"></div>
      <div class="shape shape-3"></div>
    </div>

    <div class="glass-layout">
      <div class="dashboard-grid">
        
        <!-- ================= 左侧侧边栏 (修复布局) ================= -->
        <aside class="profile-sidebar glass-card">
          <!-- 顶部头像区 -->
          <div class="profile-header">
            <div class="avatar-wrapper" @click="triggerAvatarUpload">
              <img 
                v-if="userInfo.avatar && avatarBlobUrl && !avatarError" 
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
            <input type="file" ref="avatarInput" @change="handleAvatarChange" accept="image/*" style="display: none" />
            
            <h2 class="username">{{ userInfo.username || '未知用户' }}</h2>
            <p class="email">{{ userInfo.email || 'user@example.com' }}</p>
            
            <div class="tags">
              <span class="tag pro-tag">PRO 会员</span>
              <span class="tag dev-tag">开发者</span>
            </div>
          </div>

          <div class="divider"></div>

          <!-- 菜单区 (自适应高度) -->
          <div class="sidebar-menu">
            <div class="menu-item" @click="router.push('/profile')">
              <el-icon><User /></el-icon>
              <span>个人中心</span>
            </div>
            <div class="menu-item active">
              <el-icon><Setting /></el-icon>
              <span>账号设置</span>
            </div>
            <div class="menu-item" @click="router.push('/security-privacy')">
              <el-icon><Lock /></el-icon>
              <span>安全隐私</span>
            </div>
          </div>

          <!-- 底部按钮区 (固定底部) -->
          <div class="sidebar-footer">
            <button @click="handleLogout" class="btn-logout">
              <el-icon><SwitchButton /></el-icon>
              <span>退出登录</span>
            </button>
            <button @click="handleDeleteAccount" class="btn-delete">
              <el-icon><Delete /></el-icon>
              <span>注销账户</span>
            </button>
          </div>
        </aside>

        <!-- ================= 右侧内容区 (保持精致美观) ================= -->
        <main class="main-content">
          
          <header class="content-header">
            <div class="header-text">
              <div class="title-row">
                <h1 class="page-title">账号设置</h1>
                <div class="vip-toggle">
                  <span class="vip-label" :class="{ 'is-vip': isVip }">
                    <el-icon v-if="isVip"><Star /></el-icon>
                    {{ isVip ? 'VIP会员' : '普通用户' }}
                  </span>
                  <el-switch
                    v-model="isVip"
                    active-color="#FFD700"
                    inactive-color="#dcdfe6"
                    @change="handleVipChange"
                    :loading="vipLoading"
                  />
                </div>
              </div>
              <p class="page-subtitle">管理您的个人资料、公开信息与偏好设置</p>
            </div>
            <div class="header-actions">
               <button class="btn-ghost" @click="resetForm">
                <el-icon><Refresh /></el-icon> 重置
              </button>
              <button class="btn-primary" @click="handleUpdateInfo" :disabled="saving">
                <el-icon v-if="saving" class="is-loading"><Loading /></el-icon>
                <span>{{ saving ? '保存中...' : '保存更改' }}</span>
              </button>
            </div>
          </header>

          <div class="settings-scroll-area">
            
            <!-- Banner -->
            <div class="banner-card glass-panel">
              <div class="banner-bg"></div>
              <div class="banner-content">
                <div class="banner-info">
                  <div class="icon-box">
                    <el-icon><Edit /></el-icon>
                  </div>
                  <div class="text-group">
                    <h3>完善您的个人资料</h3>
                    <p>详细的资料有助于团队成员更好地认识您</p>
                  </div>
                </div>
                <div class="progress-section">
                  <span class="progress-label">资料完成度 {{ profileCompletion }}%</span>
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: profileCompletion + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 表单区域 -->
            <div class="form-container glass-panel">
              <div class="form-section-title">基本信息</div>

              <div class="form-grid">
                <div class="form-group">
                  <label>用户名 <span class="required">*</span></label>
                  <div class="input-wrapper">
                    <el-icon class="input-prefix"><User /></el-icon>
                    <input v-model="formData.username" type="text" class="custom-input" placeholder="请输入用户名" />
                  </div>
                </div>

                <div class="form-group">
                  <label>邮箱地址 <span class="required">*</span></label>
                  <div class="input-wrapper">
                    <el-icon class="input-prefix"><Message /></el-icon>
                    <input v-model="formData.email" type="email" class="custom-input" placeholder="name@example.com" />
                  </div>
                </div>

                <div class="form-group">
                  <label>职位头衔</label>
                  <div class="input-wrapper">
                    <el-icon class="input-prefix"><Suitcase /></el-icon>
                    <input v-model="formData.job_title" type="text" class="custom-input" placeholder="例如：高级全栈工程师" />
                  </div>
                </div>

                <div class="form-group">
                  <label>个人网站</label>
                  <div class="input-wrapper">
                    <el-icon class="input-prefix"><Link /></el-icon>
                    <input v-model="formData.website" type="text" class="custom-input" placeholder="https://yourname.com" />
                  </div>
                </div>

                <div class="form-group full-width">
                  <label>个人简介</label>
                  <div class="textarea-wrapper">
                    <textarea v-model="formData.bio" class="custom-textarea" rows="4" placeholder="写几句话介绍一下你自己，支持 Markdown 语法..." maxlength="200"></textarea>
                    <div class="char-count" :class="{ 'char-limit': bioCharCount >= 200 }">{{ bioCharCount }}/200</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
import {
  Camera, User, Message, SwitchButton, Delete,
  Setting, Lock, Edit, Link, Suitcase, Loading, Refresh, Star
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const saving = ref(false)
const avatarInput = ref(null)
const userInfo = ref({ 
  username: '', 
  email: '', 
  avatar: '',
  job_title: '',
  website: '',
  bio: '',
  profile_completion: 0
})
const isVip = ref(false)
const vipLoading = ref(false)
const formData = ref({
  username: '',
  email: '',
  job_title: '',
  website: '',
  bio: ''
})
// 保存原始数据用于重置
const originalFormData = ref({
  username: '',
  email: '',
  job_title: '',
  website: '',
  bio: ''
})
const profileCompletion = ref(0)

// ==================== 头像相关逻辑 (完整迁移) ====================
const avatarBlobUrl = ref('') // 头像Blob URL（响应式）
const avatarLoading = ref(false) // 头像加载状态
const avatarError = ref(false) // 头像加载错误状态

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
    // 重新获取完成度
    await fetchUserInfo()
  } catch (error) {
    avatarBlobUrl.value = ''
    ElMessage.error(error.response?.data?.detail || '头像上传失败')
  }

  event.target.value = ''
}

// ==================== 原有业务逻辑 ====================

// 计算简介字数
const bioCharCount = computed(() => formData.value.bio.length)

// 获取VIP状态
const fetchVipStatus = async () => {
  try {
    const username = userInfo.value.username || userStore.username
    if (!username) return
    const res = await request.get(`/deal/getvip?username=${encodeURIComponent(username)}`)
    isVip.value = res.data.is_vip || false
  } catch (error) {
    console.warn('获取VIP状态失败:', error)
  }
}

const fetchUserInfo = async () => {
  try {
    const res = await request.get('/auth/me')
    userInfo.value = { ...res.data }
    
    const fetchedData = {
      username: res.data.username,
      email: res.data.email,
      job_title: res.data.job_title || '',
      website: res.data.website || '',
      bio: res.data.bio || ''
    }
    formData.value = { ...fetchedData }
    // 保存原始数据用于重置
    originalFormData.value = { ...fetchedData }
    profileCompletion.value = res.data.profile_completion || 0
    
    // 如果有头像，从后端获取并显示
    if (userInfo.value.avatar) {
      await loadAvatar()
    }
    
    loading.value = false
    // 获取VIP状态
    await fetchVipStatus()
  } catch (error) {
    loading.value = false
    ElMessage.error('获取用户信息失败')
    // 设置默认值
    profileCompletion.value = 0
  }
}

// 重置表单到编辑前的状态
const resetForm = () => {
  formData.value = { ...originalFormData.value }
  ElMessage.info('已恢复到上次保存的状态')
}

const handleUpdateInfo = async () => {
  if (!formData.value.username.trim()) return ElMessage.error('用户名不能为空')
  if (formData.value.username.trim().length < 2) return ElMessage.error('用户名至少需要2个字符')
  if (!formData.value.email.trim()) return ElMessage.error('邮箱不能为空')
  if (formData.value.bio.length > 200) return ElMessage.error('个人简介不能超过200字符')

  saving.value = true
  try {
    const res = await request.put('/auth/update-profile', formData.value)
    ElMessage.success('保存成功')

    // 如果用户名变更，更新store
    if (res.data.username !== userStore.username) {
      userStore.username = res.data.username
    }

    await fetchUserInfo()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '更新失败')
  } finally {
    saving.value = false
  }
}

const handleLogout = () => {
  userStore.logout()
  router.push('/login')
  ElMessage.success('已退出')
}

const handleDeleteAccount = async () => {
  try {
    await ElMessageBox.confirm('确定要注销账户吗？此操作无法撤销。', '警告', {
      type: 'warning', confirmButtonText: '注销', cancelButtonText: '取消'
    })
    await request.delete('/auth/delete-account')
    userStore.logout()
    router.push('/login')
  } catch (e) { /* Cancelled */ }
}

// VIP状态切换
const handleVipChange = async (value) => {
  vipLoading.value = true
  try {
    const username = userInfo.value.username || userStore.username
    await request.post(`/deal/setvip?username=${encodeURIComponent(username)}&is_vip=${value}`)
    ElMessage.success(value ? '已开通VIP会员' : '已取消VIP会员')
  } catch (error) {
    // 恢复原状态
    isVip.value = !value
    ElMessage.error('VIP状态更新失败')
  } finally {
    vipLoading.value = false
  }
}

// 清理 Blob URL 防止内存泄漏
onBeforeUnmount(() => {
  if (avatarBlobUrl.value && avatarBlobUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(avatarBlobUrl.value)
  }
})

onMounted(async () => {
  await fetchUserInfo()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ================= 全局基础样式 ================= */
.app-container {
  width: 100vw; height: 100vh; position: relative; overflow: hidden;
  background-color: #f3f4f6; font-family: 'Inter', sans-serif; color: #1f2937;
}

/* 动态背景 */
.ambient-background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
.shape { position: absolute; filter: blur(90px); border-radius: 50%; opacity: 0.5; animation: float 25s infinite ease-in-out; }
.shape-1 { width: 50vw; height: 50vw; background: #c4b5fd; top: -10%; left: -10%; }
.shape-2 { width: 40vw; height: 40vw; background: #a5f3fc; bottom: -5%; right: -5%; animation-delay: -5s; }
.shape-3 { width: 30vw; height: 30vw; background: #fbcfe8; top: 40%; left: 30%; animation-delay: -10s; }
@keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, 40px); } }

/* 玻璃容器 */
.glass-layout {
  position: relative; z-index: 1; width: 100%; height: 100%; padding: 2rem;
  display: flex; justify-content: center; align-items: center;
}
.dashboard-grid {
  display: grid; grid-template-columns: 280px 1fr; gap: 24px;
  width: 100%; max-width: 1400px; height: 100%; max-height: 900px;
}
.glass-card {
  background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  border-radius: 24px;
}

/* ================= 侧边栏样式 (核心修复部分) ================= */
.profile-sidebar {
  display: flex; 
  flex-direction: column; 
  padding: 24px; 
  height: 100%; 
  overflow-y: auto; /* 允许整体滚动 */
}
.profile-sidebar::-webkit-scrollbar { width: 6px; }
.profile-sidebar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
.profile-sidebar::-webkit-scrollbar-track { background: transparent; }

/* 头部固定 */
.profile-header { text-align: center; flex-shrink: 0; margin-bottom: 20px; }
.avatar-wrapper { width: 96px; height: 96px; margin: 0 auto 12px; position: relative; cursor: pointer; }
.avatar-img, .avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-shadow: 0 8px 16px rgba(0,0,0,0.1); }
.avatar-placeholder { background: linear-gradient(135deg, #6366f1, #a855f7); color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; }
.avatar-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; color: white; font-size: 24px; }
.avatar-wrapper:hover .avatar-overlay { opacity: 1; }
.status-indicator { position: absolute; bottom: 4px; right: 4px; width: 16px; height: 16px; background: #10b981; border: 3px solid white; border-radius: 50%; }
.username { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px; }
.email { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
.tags { display: flex; gap: 6px; justify-content: center; }
.tag { font-size: 10px; padding: 2px 8px; border-radius: 12px; font-weight: 600; }
.pro-tag { background: #e0e7ff; color: #4338ca; }
.dev-tag { background: #dcfce7; color: #15803d; }
.divider { height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 20px 0; flex-shrink: 0; }

/* 菜单区：自然高度 */
.sidebar-menu { 
  display: flex; 
  flex-direction: column; 
  gap: 6px; 
  margin-bottom: 16px;
}

.menu-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 12px; color: #4b5563; cursor: pointer; transition: 0.2s; font-weight: 500; font-size: 14px; flex-shrink: 0; }
.menu-item:hover { background: rgba(255,255,255,0.6); color: #111827; }
.menu-item.active { background: white; color: #6366f1; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-weight: 600; }
.menu-item .el-icon { font-size: 18px; }

/* 底部按钮区：固定显示 */
.sidebar-footer { 
  padding-top: 16px; 
  border-top: 1px solid rgba(0,0,0,0.06);
  display: flex; 
  flex-direction: column; 
  gap: 8px; 
  flex-shrink: 0;
}
.btn-logout, .btn-delete { width: 100%; padding: 10px; border: none; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 600; transition: 0.2s; }
.btn-logout { background: #fee2e2; color: #dc2626; }
.btn-logout:hover { background: #fecaca; }
.btn-delete { background: transparent; color: #9ca3af; }
.btn-delete:hover { background: rgba(0,0,0,0.05); color: #4b5563; }

/* ================= 右侧 Main Content ================= */
.main-content { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 8px; flex-shrink: 0; }
.page-title { font-size: 26px; font-weight: 800; color: #111827; }
.page-subtitle { color: #6b7280; font-size: 14px; margin-top: 4px; }
.header-actions { display: flex; gap: 12px; }

/* VIP Toggle 样式 */
.title-row { display: flex; align-items: center; gap: 16px; }
.vip-toggle { display: flex; align-items: center; gap: 10px; padding: 6px 12px; background: rgba(255, 255, 255, 0.8); border-radius: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.vip-label { font-size: 13px; font-weight: 600; color: #6b7280; display: flex; align-items: center; gap: 4px; transition: all 0.3s; }
.vip-label.is-vip { color: #d97706; }
.vip-label .el-icon { font-size: 16px; color: #FFD700; }

.settings-scroll-area { flex: 1; overflow-y: auto; padding: 4px; padding-bottom: 20px; display: flex; flex-direction: column; gap: 24px; }
.settings-scroll-area::-webkit-scrollbar { width: 6px; }
.settings-scroll-area::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }

.glass-panel { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); overflow: hidden; }

/* Banner Card */
.banner-card { position: relative; height: 120px; border: none; flex-shrink: 0; }
.banner-bg { position: absolute; inset: 0; background: linear-gradient(120deg, #8b5cf6, #6366f1); opacity: 0.9; }
.banner-bg::after { content: ''; position: absolute; top: 0; right: 0; width: 300px; height: 100%; background: radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent 70%); }
.banner-content { position: relative; z-index: 1; height: 100%; padding: 0 32px; display: flex; align-items: center; justify-content: space-between; color: white; }
.banner-info { display: flex; align-items: center; gap: 16px; }
.icon-box { width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; backdrop-filter: blur(4px); }
.text-group h3 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
.text-group p { font-size: 13px; opacity: 0.9; }
.progress-section { width: 200px; text-align: right; }
.progress-label { font-size: 12px; font-weight: 600; margin-bottom: 6px; display: block; opacity: 0.9; }
.progress-bar { height: 6px; background: rgba(0,0,0,0.2); border-radius: 3px; overflow: hidden; }
.progress-fill { height: 100%; background: white; border-radius: 3px; }

/* Form */
.form-container { padding: 32px; background: rgba(255,255,255,0.8); }
.form-section-title { font-size: 16px; font-weight: 700; color: #374151; margin-bottom: 24px; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px 32px; }
.full-width { grid-column: 1 / -1; }
.form-group label { display: block; font-size: 13px; font-weight: 600; color: #4b5563; margin-bottom: 8px; }
.required { color: #ef4444; margin-left: 2px; }
.input-wrapper, .textarea-wrapper { position: relative; transition: all 0.3s; }
.input-prefix { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 18px; transition: color 0.3s; }
.custom-input { width: 100%; height: 48px; padding: 0 16px 0 48px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; color: #1f2937; background: #fff; transition: all 0.3s ease; }
.custom-textarea { width: 100%; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; color: #1f2937; background: #fff; resize: vertical; min-height: 100px; font-family: inherit; transition: all 0.3s ease; }
.char-count { text-align: right; font-size: 12px; color: #9ca3af; margin-top: 6px; transition: color 0.2s; }
.char-count.char-limit { color: #ef4444; font-weight: 600; }
.custom-input:focus, .custom-textarea:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); background: #fff; }
.input-wrapper:focus-within .input-prefix { color: #6366f1; }

/* Buttons */
.btn-primary { padding: 10px 24px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); transition: all 0.2s; }
.btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(99, 102, 241, 0.4); }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-ghost { padding: 10px 16px; background: white; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 12px; font-weight: 600; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.btn-ghost:hover { background: #f9fafb; color: #374151; border-color: #d1d5db; }

/* 响应式 */
@media (max-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
  .profile-sidebar { height: auto; flex-direction: row; align-items: center; justify-content: space-between; padding: 16px; }
  .sidebar-menu { flex-direction: row; flex: 0; overflow-y: visible; }
  .sidebar-footer { display: none; } /* 移动端建议放入汉堡菜单 */
  .profile-header { display: flex; align-items: center; gap: 16px; margin: 0; text-align: left; }
  .avatar-wrapper { margin: 0; width: 48px; height: 48px; }
  .tags, .email { display: none; }
  .username { font-size: 16px; margin: 0; }
  .divider { display: none; }
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .banner-content { flex-direction: column; gap: 16px; text-align: center; }
  .progress-section { text-align: center; width: 100%; }
}
</style>




