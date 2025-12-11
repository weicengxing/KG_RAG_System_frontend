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
        
        <!-- ================= 左侧侧边栏 (保持不变) ================= -->
        <aside class="profile-sidebar glass-card">
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
              <span class="tag vip-tag" v-if="isVip">
                <el-icon><Star /></el-icon> VIP会员
              </span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="sidebar-menu">
            <div class="menu-item" @click="router.push('/profile')">
              <el-icon><User /></el-icon>
              <span>个人中心</span>
            </div>
            <div class="menu-item" @click="router.push('/account-settings')">
              <el-icon><Setting /></el-icon>
              <span>账号设置</span>
            </div>
            <div class="menu-item active">
              <el-icon><Upload /></el-icon>
              <span>上传小说</span>
            </div>
            <div class="menu-item" @click="router.push('/security-privacy')">
              <el-icon><Lock /></el-icon>
              <span>安全隐私</span>
            </div>
          </div>

          <div class="sidebar-footer">
            <button @click="router.push('/novel')" class="btn-secondary">
              <el-icon><Document /></el-icon>
              <span>阅读小说</span>
            </button>
            <button @click="handleBack" class="btn-ghost">
              <el-icon><ArrowLeft /></el-icon>
              <span>返回</span>
            </button>
          </div>
        </aside>

        <!-- ================= 右侧上传内容区 ================= -->
        <main class="main-content">
          
          <header class="content-header">
            <div class="header-text">
              <div class="title-row">
                <h1 class="page-title">创作中心</h1>
                <div class="vip-status">
                  <span class="vip-label" :class="{ 'is-vip': isVip }">
                    <el-icon v-if="isVip"><Star /></el-icon>
                    {{ isVip ? 'VIP用户' : '普通用户' }}
                  </span>
                </div>
              </div>
              <p class="page-subtitle">发布您的作品，支持文本输入或文件上传 (.txt/.docx)</p>
            </div>
            <div class="header-actions">
              <button class="btn-ghost" @click="resetForm">
                <el-icon><Refresh /></el-icon> 重置
              </button>
              <button class="btn-primary" @click="handleSubmit" :disabled="uploading || !hasUploadPermission">
                <el-icon v-if="uploading" class="is-loading"><Loading /></el-icon>
                <span>{{ uploading ? '上传中...' : '提交小说' }}</span>
              </button>
            </div>
          </header>

          <div class="settings-scroll-area">
            
            <!-- 权限提示 -->
            <div v-if="!hasUploadPermission" class="permission-warning glass-panel">
              <div class="warning-content">
                <el-icon class="warning-icon"><Lock /></el-icon>
                <div class="warning-text">
                  <h3>此功能仅限VIP用户使用</h3>
                  <p>您需要成为VIP会员才能上传小说。请返回账号设置页面开通VIP。</p>
                </div>
                <button class="btn-secondary" @click="router.push('/account-settings')">
                  开通VIP
                </button>
              </div>
            </div>

            <!-- 上传表单 -->
            <div v-else class="form-container glass-panel">
              <div class="form-section-title">小说信息</div>

              <div class="form-grid">
                <!-- 小说标题 -->
                <div class="form-group full-width">
                  <label>小说标题 <span class="required">*</span></label>
                  <div class="input-wrapper">
                    <el-icon class="input-prefix"><Edit /></el-icon>
                    <input 
                      v-model="formData.title" 
                      type="text" 
                      class="custom-input" 
                      placeholder="请输入小说标题"
                      maxlength="100"
                    />
                  </div>
                  <div class="char-count">{{ formData.title.length }}/100</div>
                </div>

                <!-- 章节类型选择 -->
                <div class="form-group full-width">
                  <label>章节类型</label>
                  <div class="selection-group">
                    <div 
                      class="selection-option" 
                      :class="{ active: formData.quan === '1' }"
                      @click="formData.quan = '1'"
                    >
                      <div class="option-icon bg-green">
                        <el-icon><Unlock /></el-icon>
                      </div>
                      <div class="option-content">
                        <span class="option-title">免费章节</span>
                        <span class="option-desc">所有用户均可免费阅读</span>
                      </div>
                      <div class="check-mark" v-if="formData.quan === '1'">
                        <el-icon><Check /></el-icon>
                      </div>
                    </div>

                    <div 
                      class="selection-option" 
                      :class="{ active: formData.quan === '0' }"
                      @click="formData.quan = '0'"
                    >
                      <div class="option-icon bg-gold">
                        <el-icon><Star /></el-icon>
                      </div>
                      <div class="option-content">
                        <span class="option-title">VIP章节</span>
                        <span class="option-desc">仅限VIP会员阅读，可获得收益</span>
                      </div>
                      <div class="check-mark" v-if="formData.quan === '0'">
                        <el-icon><Check /></el-icon>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 上传方式选择 -->
                <div class="form-group full-width">
                  <label>上传方式</label>
                  <div class="selection-group">
                    <div 
                      class="selection-option" 
                      :class="{ active: uploadMethod === 'text' }"
                      @click="uploadMethod = 'text'"
                    >
                      <div class="option-icon bg-blue">
                        <el-icon><EditPen /></el-icon>
                      </div>
                      <div class="option-content">
                        <span class="option-title">在线写作</span>
                        <span class="option-desc">直接在网页输入或粘贴内容</span>
                      </div>
                      <div class="check-mark" v-if="uploadMethod === 'text'">
                        <el-icon><Check /></el-icon>
                      </div>
                    </div>

                    <div 
                      class="selection-option" 
                      :class="{ active: uploadMethod === 'file' }"
                      @click="uploadMethod = 'file'"
                    >
                      <div class="option-icon bg-purple">
                        <el-icon><FolderOpened /></el-icon>
                      </div>
                      <div class="option-content">
                        <span class="option-title">文件上传</span>
                        <span class="option-desc">支持 .txt / .docx 格式</span>
                      </div>
                      <div class="check-mark" v-if="uploadMethod === 'file'">
                        <el-icon><Check /></el-icon>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 文本输入区域 -->
                <div v-if="uploadMethod === 'text'" class="form-group full-width content-area-fix">
                  <label>小说内容 <span class="required">*</span></label>
                  <div class="textarea-wrapper">
                    <textarea 
                      v-model="formData.content" 
                      class="custom-textarea" 
                      rows="15" 
                      placeholder="在此处输入小说内容..."
                      maxlength="50000"
                    ></textarea>
                    <div class="char-count">{{ formData.content.length }}/50000</div>
                  </div>
                  <div class="hint-text">支持Markdown格式，建议分段编写</div>
                </div>

                <!-- 文件上传区域 -->
                <div v-else class="form-group full-width content-area-fix">
                  <label>上传文件 <span class="required">*</span></label>
                  <div class="file-upload-area" @click="triggerFileUpload" @dragover.prevent @drop="handleFileDrop">
                    <input 
                      type="file" 
                      ref="fileInput" 
                      @change="handleFileSelect" 
                      accept=".txt,.doc,.docx"
                      style="display: none"
                    />
                    
                    <div v-if="!selectedFile" class="upload-prompt">
                      <div class="upload-icon-circle">
                        <el-icon><UploadFilled /></el-icon>
                      </div>
                      <h3>点击或拖拽文件到此处</h3>
                      <p>支持 .txt、.docx 格式，文件大小不超过10MB</p>
                    </div>
                    
                    <div v-else class="file-info-card">
                      <div class="file-icon-wrapper">
                        <el-icon><Document /></el-icon>
                      </div>
                      <div class="file-details">
                        <div class="file-name">{{ selectedFile.name }}</div>
                        <div class="file-meta">
                          <span>{{ formatFileSize(selectedFile.size) }}</span>
                          <span class="dot">•</span>
                          <!-- 显示解析状态 -->
                          <span :class="{'text-green': parseStatus === 'success', 'text-yellow': parseStatus === 'parsing', 'text-red': parseStatus === 'error'}">
                            {{ parseStatusText }}
                          </span>
                        </div>
                      </div>
                      <button class="btn-icon-remove" @click.stop="removeFile">
                        <el-icon><Close /></el-icon>
                      </button>
                    </div>
                  </div>
                  
                  <div class="file-hint">
                    <el-icon><InfoFilled /></el-icon> .doc文件目前不支持预览和上传，太旧了。
                  </div>
                </div>

                <!-- 预览区域 (逻辑修改：现在渲染全文) -->
                <div v-if="formData.content" class="form-group full-width content-area-fix">
                  <label>
                    内容预览 
                    <span v-if="uploadMethod === 'file'" class="preview-badge">自动解析</span>
                  </label>
                  <div class="preview-box">
                    <div class="preview-header">
                      <span>共 {{ formData.content.length }} 个字符</span>
                      <button class="btn-ghost-small" @click="togglePreview">
                        {{ showFullPreview ? '收起' : '展开全文' }}
                      </button>
                    </div>
                    <!-- 通过CSS类控制显示高度，而不是截断文本 -->
                    <div class="preview-content" :class="{ 'preview-collapsed': !showFullPreview }">
                      {{ formData.content }}
                    </div>
                  </div>
                </div>

              </div>
            
              <!-- 移动端提交按钮 -->
              <div class="mobile-submit-actions">
                <button class="btn-primary full-width-btn" @click="handleSubmit" :disabled="uploading || !hasUploadPermission">
                  <span>{{ uploading ? '上传中...' : '提交小说' }}</span>
                </button>
              </div>

            </div>

            <!-- 上传结果反馈 -->
            <div v-if="uploadResult" class="result-card glass-panel" :class="{ 'success': uploadResult.success, 'error': !uploadResult.success }">
              <div class="result-content">
                <el-icon class="result-icon">
                  {{ uploadResult.success ? 'CircleCheckFilled' : 'CircleCloseFilled' }}
                </el-icon>
                <div class="result-text">
                  <h3>{{ uploadResult.success ? '发布成功！' : '发布失败' }}</h3>
                  <p>{{ uploadResult.message }}</p>
                  <div v-if="uploadResult.success && uploadResult.novel_id" class="result-details">
                    <div class="detail-row"><span>小说ID:</span> {{ uploadResult.novel_id }}</div>
                    <div class="detail-row"><span>标题:</span> {{ uploadResult.title }}</div>
                  </div>
                </div>
                <div class="result-actions">
                  <button v-if="uploadResult.success" class="btn-secondary" @click="handleGoToNovel">查看小说</button>
                  <button class="btn-ghost" @click="uploadResult = null">关闭</button>
                </div>
              </div>
            </div>
            
            <!-- 底部空白占位符 -->
            <div class="bottom-spacer"></div>

          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import request from '../utils/request'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'
// 引入 mammoth 解析 docx
import mammoth from 'mammoth'
import {
  Camera, User, Setting, Lock, Upload, Edit,
  Refresh, Loading, Star, Document, Close, ArrowLeft,
  Unlock, Check, EditPen, FolderOpened, UploadFilled,
  InfoFilled, CircleCheckFilled, CircleCloseFilled
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 表单数据
const formData = ref({
  title: '',
  quan: '1',
  content: ''
})
const uploadMethod = ref('text') 
const selectedFile = ref(null)
const uploading = ref(false)
const hasUploadPermission = ref(false)
const uploadPermissionLoading = ref(false)
const uploadResult = ref(null)
const showFullPreview = ref(false)

// 解析状态
const parseStatus = ref('idle') // idle, parsing, success, error
const parseStatusText = computed(() => {
  switch(parseStatus.value) {
    case 'parsing': return '正在解析内容...'
    case 'success': return '解析成功'
    case 'error': return '解析预览失败(不影响上传)'
    default: return '准备上传'
  }
})

// 用户信息
const userInfo = ref({ username: '', email: '', avatar: '' })
const isVip = ref(false)
const avatarInput = ref(null)
const avatarBlobUrl = ref('')
const avatarLoading = ref(false)
const avatarError = ref(false)
const fileInput = ref(null)

// 头像缓存工具 (保持不变)
const avatarCache = {
  async get(username, filename) {
    const cached = localStorage.getItem(`avatar_${username}`)
    if (!cached) return null
    try {
      const data = JSON.parse(cached)
      if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000 || (filename && data.filename !== filename)) {
        this.remove(username)
        return null
      }
      if (data.base64) {
        const blob = await this.base64ToBlob(data.base64, data.mimeType)
        return URL.createObjectURL(blob)
      }
      return null
    } catch (error) { this.remove(username); return null }
  },
  async set(username, filename, blob, mimeType) {
    try {
      const base64 = await this.blobToBase64(blob)
      localStorage.setItem(`avatar_${username}`, JSON.stringify({
        filename, base64, mimeType, timestamp: Date.now()
      }))
    } catch (error) { console.error('缓存头像失败:', error) }
  },
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  },
  base64ToBlob(base64, mimeType) {
    return fetch(`data:${mimeType};base64,${base64}`).then(res => res.blob())
  },
  remove(username) { localStorage.removeItem(`avatar_${username}`) }
}

// 权限检查
const checkUploadPermission = async () => {
  uploadPermissionLoading.value = true
  try {
    const res = await request.get('/deal/check-upload-permission')
    hasUploadPermission.value = res.data.has_permission
    isVip.value = res.data.is_vip
  } catch (error) {
    hasUploadPermission.value = false
    isVip.value = false
  } finally { uploadPermissionLoading.value = false }
}

const fetchUserInfo = async () => {
  try {
    const res = await request.get('/auth/me')
    userInfo.value = { ...res.data }
    if (userInfo.value.avatar) await loadAvatar()
    await checkUploadPermission()
  } catch (error) { console.error(error) }
}

// 头像相关
const fetchAvatar = async (filename) => {
  if (!filename) return null
  try {
    avatarLoading.value = true
    const response = await request.get(`/auth/avatar/${filename}`, { responseType: 'blob' })
    const contentType = response.headers['content-type']
    if (!contentType?.startsWith('image/')) return null
    const blob = response.data
    const blobUrl = URL.createObjectURL(blob)
    if (userInfo.value.username) await avatarCache.set(userInfo.value.username, filename, blob, contentType)
    return blobUrl
  } catch { return null } finally { avatarLoading.value = false }
}

const loadAvatar = async () => {
  const { username, avatar } = userInfo.value
  if (!avatar) { avatarBlobUrl.value = ''; return }
  const cachedUrl = await avatarCache.get(username, avatar)
  if (cachedUrl) { avatarBlobUrl.value = cachedUrl; return }
  const blobUrl = await fetchAvatar(avatar)
  avatarBlobUrl.value = blobUrl || ''
}

const handleAvatarError = () => { avatarError.value = true; avatarBlobUrl.value = '' }
const handleAvatarLoad = () => { avatarError.value = false }
const triggerAvatarUpload = () => { avatarInput.value?.click() }
const handleAvatarChange = (e) => { e.target.value = '' }

// ================= 文件处理逻辑修正 =================

const triggerFileUpload = () => { fileInput.value?.click() }

const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) validateAndSetFile(file)
}

const handleFileDrop = (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (file) validateAndSetFile(file)
}

const validateAndSetFile = async (file) => {
  const ext = file.name.toLowerCase().split('.').pop()
  if (!['txt', 'doc', 'docx'].includes(ext)) return ElMessage.error('格式不支持，仅支持 .txt, .doc, .docx')
  if (file.size > 10 * 1024 * 1024) return ElMessage.error('文件过大')
  
  selectedFile.value = file
  formData.value.content = '' // 先清空，等待解析
  parseStatus.value = 'parsing'

  try {
    if (ext === 'txt') {
      const text = await readFileAsText(file)
      formData.value.content = text
      parseStatus.value = 'success'
    } else if (ext === 'docx') {
      // 使用 Mammoth 解析 docx
      const arrayBuffer = await readFileAsArrayBuffer(file)
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer })
      formData.value.content = result.value
      parseStatus.value = 'success'
      if (result.messages.length > 0) console.log("Docx parsing messages:", result.messages)
    } else if (ext === 'doc') {
      // .doc 格式难以在前端完美解析，仅提示上传
      parseStatus.value = 'idle'
      formData.value.content = '(.doc文件不支持预览，请直接上传)'
    }
  } catch (error) {
    console.error('文件解析失败:', error)
    parseStatus.value = 'error'
    formData.value.content = '文件解析预览失败，但不影响文件上传。'
  }
}

// 辅助函数：读取文本
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsText(file, 'utf-8')
  })
}

// 辅助函数：读取二进制
const readFileAsArrayBuffer = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target.result)
    reader.onerror = (e) => reject(e)
    reader.readAsArrayBuffer(file)
  })
}

const removeFile = () => {
  selectedFile.value = null
  formData.value.content = ''
  parseStatus.value = 'idle'
  if (fileInput.value) fileInput.value.value = ''
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
}

const togglePreview = () => { showFullPreview.value = !showFullPreview.value }

const resetForm = () => {
  formData.value = { title: '', quan: '1', content: '' }
  selectedFile.value = null
  uploadMethod.value = 'text'
  uploadResult.value = null
  parseStatus.value = 'idle'
}
const handleBack = () => { router.push('/account-settings') }
const handleGoToNovel = () => { router.push('/novel') }

const handleSubmit = async () => {
  if (!formData.value.title.trim()) return ElMessage.error('请输入标题')
  
  // 仅在“在线写作”模式下严格检查内容，文件上传模式下即使预览失败也允许尝试上传
  if (uploadMethod.value === 'text' && !formData.value.content.trim()) return ElMessage.error('请输入内容')
  if (uploadMethod.value === 'file' && !selectedFile.value) return ElMessage.error('请选择文件')
  if (!hasUploadPermission.value) return ElMessage.error('无上传权限')
  
  uploading.value = true
  try {
    const form = new FormData()
    form.append('title', formData.value.title.trim())
    form.append('quan', formData.value.quan)
    if (uploadMethod.value === 'text') form.append('content', formData.value.content.trim())
    else if (selectedFile.value) form.append('file', selectedFile.value)
    
    const res = await request.post('/deal/upload-novel', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    uploadResult.value = { success: true, message: '发布成功', ...res.data }
    ElMessage.success('发布成功')
    setTimeout(resetForm, 5000)
  } catch (error) {
    console.error(error)
    uploadResult.value = { success: false, message: error.response?.data?.detail || '失败' }
    ElMessage.error('上传失败')
  } finally { uploading.value = false }
}

onBeforeUnmount(() => { if (avatarBlobUrl.value) URL.revokeObjectURL(avatarBlobUrl.value) })
onMounted(fetchUserInfo)
watch(() => router.currentRoute.value.path, (newPath) => { if (newPath === '/novel-upload') checkUploadPermission() })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ================= 基础布局 ================= */
.app-container {
  width: 100vw; height: 100vh; position: relative; overflow: hidden;
  background-color: #f3f4f6; font-family: 'Inter', sans-serif; color: #1f2937;
}

.ambient-background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }
.shape { position: absolute; filter: blur(90px); border-radius: 50%; opacity: 0.5; animation: float 25s infinite ease-in-out; }
.shape-1 { width: 50vw; height: 50vw; background: #c4b5fd; top: -10%; left: -10%; }
.shape-2 { width: 40vw; height: 40vw; background: #a5f3fc; bottom: -5%; right: -5%; animation-delay: -5s; }
.shape-3 { width: 30vw; height: 30vw; background: #fbcfe8; top: 40%; left: 30%; animation-delay: -10s; }
@keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, 40px); } }

.glass-layout {
  position: relative; z-index: 1; width: 100%; height: 100%; padding: 2rem;
  display: flex; justify-content: center; align-items: center;
}
.dashboard-grid {
  display: grid; grid-template-columns: 280px 1fr; gap: 24px;
  width: 100%; max-width: 1400px; 
  height: 85vh; 
}
.glass-card {
  background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.8); box-shadow: 0 8px 32px rgba(0, 0, 0, 0.05);
  border-radius: 24px;
}

/* 左侧边栏 (样式精简) */
.profile-sidebar { display: flex; flex-direction: column; padding: 24px; height: 100%; overflow-y: auto; }
.profile-header { text-align: center; flex-shrink: 0; margin-bottom: 20px; }
.avatar-wrapper { width: 96px; height: 96px; margin: 0 auto 12px; position: relative; cursor: pointer; }
.avatar-img, .avatar-placeholder { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { background: linear-gradient(135deg, #6366f1, #a855f7); color: white; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 700; }
.avatar-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: 0; transition: 0.3s; color: white; font-size: 24px; }
.avatar-wrapper:hover .avatar-overlay { opacity: 1; }
.status-indicator { position: absolute; bottom: 4px; right: 4px; width: 16px; height: 16px; background: #10b981; border: 3px solid white; border-radius: 50%; }
.username { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 4px; }
.email { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
.tags { display: flex; flex-direction: column; gap: 6px; justify-content: center; }
.tag { font-size: 10px; padding: 4px 8px; border-radius: 12px; font-weight: 600; display: flex; align-items: center; gap: 4px; justify-content: center; }
.pro-tag { background: #e0e7ff; color: #4338ca; }
.vip-tag { background: linear-gradient(135deg, #FFD700, #FFA500); color: #7c2d12; }
.divider { height: 1px; background: rgba(0,0,0,0.06); margin: 0 0 20px 0; flex-shrink: 0; }
.sidebar-menu { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.menu-item { display: flex; align-items: center; gap: 12px; padding: 10px 16px; border-radius: 12px; color: #4b5563; cursor: pointer; transition: 0.2s; font-weight: 500; font-size: 14px; flex-shrink: 0; }
.menu-item:hover { background: rgba(255,255,255,0.6); color: #111827; }
.menu-item.active { background: white; color: #6366f1; box-shadow: 0 2px 8px rgba(0,0,0,0.04); font-weight: 600; }
.sidebar-footer { padding-top: 16px; border-top: 1px solid rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }

/* 右侧内容区 */
.main-content { display: flex; flex-direction: column; height: 100%; overflow: hidden; min-height: 0; }
.content-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 8px; flex-shrink: 0; }
.page-title { font-size: 26px; font-weight: 800; color: #111827; }
.page-subtitle { color: #6b7280; font-size: 14px; margin-top: 4px; }
/* 1. 调整按钮容器，确保横向排列 */
.header-actions { 
  display: flex; 
  align-items: center; /* 垂直居中 */
  gap: 12px; 
}

.title-row { display: flex; align-items: center; gap: 16px; }
.vip-status { padding: 6px 12px; background: rgba(255, 255, 255, 0.8); border-radius: 20px; }
.vip-label { font-size: 13px; font-weight: 600; color: #6b7280; display: flex; align-items: center; gap: 4px; }
.vip-label.is-vip { color: #d97706; }

/* 核心滚动区域修复：padding-bottom 减小 */
.settings-scroll-area { 
  flex: 1; 
  overflow-y: auto; 
  padding: 4px; 
  padding-bottom: 40px; /* 调整为 40px */
  display: flex; 
  flex-direction: column; 
  gap: 24px; 
}
.settings-scroll-area::-webkit-scrollbar { width: 6px; }
.settings-scroll-area::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
.bottom-spacer { height: 20px; width: 100%; flex-shrink: 0; }

.glass-panel { background: rgba(255, 255, 255, 0.6); backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.6); border-radius: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02); }

/* 表单区域 */
.form-container { padding: 32px; background: rgba(255,255,255,0.8); }
.form-section-title { font-size: 16px; font-weight: 700; color: #374151; margin-bottom: 24px; }
.form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px 32px; }
.full-width { grid-column: 1 / -1; }
.form-group label { display: flex; justify-content: space-between; font-size: 13px; font-weight: 600; color: #4b5563; margin-bottom: 8px; }
.required { color: #ef4444; margin-left: 2px; }
.preview-badge { font-size: 11px; background: #e0e7ff; color: #4338ca; padding: 2px 6px; border-radius: 4px; }

.content-area-fix { display: block; min-height: 250px; }
.input-wrapper, .textarea-wrapper { position: relative; width: 100%; }
.input-prefix { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 18px; }
.custom-input { width: 100%; height: 48px; padding: 0 16px 0 48px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; background: #fff; transition: all 0.3s; }
.custom-textarea { width: 100%; padding: 16px; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 14px; background: #fff; resize: vertical; min-height: 300px; line-height: 1.6; font-family: inherit; }
.char-count { text-align: right; font-size: 12px; color: #9ca3af; margin-top: 6px; }
.custom-input:focus, .custom-textarea:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }

/* 卡片选择器 */
.selection-group { display: flex; gap: 20px; width: 100%; flex-wrap: wrap; }
.selection-option { flex: 1; min-width: 200px; display: flex; align-items: center; gap: 16px; padding: 16px; border: 2px solid #e5e7eb; border-radius: 16px; cursor: pointer; background: rgba(255, 255, 255, 0.5); position: relative; transition: all 0.2s; }
.selection-option:hover { border-color: #a5b4fc; background: rgba(255, 255, 255, 0.8); transform: translateY(-2px); }
.selection-option.active { border-color: #6366f1; background: rgba(99, 102, 241, 0.04); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1); }
.option-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px; color: white; flex-shrink: 0; }
.bg-green { background: linear-gradient(135deg, #34d399, #10b981); }
.bg-gold { background: linear-gradient(135deg, #fbbf24, #d97706); }
.bg-blue { background: linear-gradient(135deg, #60a5fa, #3b82f6); }
.bg-purple { background: linear-gradient(135deg, #a78bfa, #7c3aed); }
.option-content { display: flex; flex-direction: column; gap: 2px; }
.option-title { font-weight: 700; font-size: 15px; color: #1f2937; }
.option-desc { font-size: 12px; color: #6b7280; }
.check-mark { position: absolute; top: 12px; right: 12px; color: #6366f1; font-size: 18px; background: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }

/* 文件上传区域 */
.file-upload-area { border: 2px dashed #d1d5db; border-radius: 16px; padding: 40px; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(255, 255, 255, 0.3); position: relative; }
.file-upload-area:hover { border-color: #6366f1; background: rgba(99, 102, 241, 0.02); }
.upload-icon-circle { width: 64px; height: 64px; margin: 0 auto 16px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; color: #3b82f6; }
.file-info-card { display: flex; align-items: center; gap: 16px; padding: 16px 20px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb; text-align: left; }
.file-icon-wrapper { width: 48px; height: 48px; background: #eff6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #3b82f6; }
.file-details { flex: 1; }
.file-name { font-weight: 600; color: #111827; margin-bottom: 4px; font-size: 15px; }
.file-meta { font-size: 12px; color: #6b7280; display: flex; align-items: center; gap: 6px; }
.text-green { color: #10b981; font-weight: 500; }
.text-yellow { color: #f59e0b; font-weight: 500; }
.text-red { color: #ef4444; font-weight: 500; }
.btn-icon-remove { width: 32px; height: 32px; border: none; background: transparent; color: #9ca3af; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-icon-remove:hover { background: #fee2e2; color: #ef4444; }
.file-hint { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #6b7280; margin-top: 12px; padding: 0 4px; }

/* 预览样式修正 */
.preview-box { border: 1px solid #e5e7eb; border-radius: 12px; background: #f9fafb; overflow: hidden; display: flex; flex-direction: column; }
.preview-header { padding: 10px 16px; background: #f3f4f6; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #6b7280; flex-shrink: 0; }
.preview-content { 
  padding: 20px; 
  font-size: 14px; 
  line-height: 1.7; 
  color: #374151; 
  text-align: left; 
  white-space: pre-wrap; 
  background: white;
  /* 默认显示完整高度，通过class限制 */
  height: auto;
  transition: max-height 0.3s ease-out;
}
.preview-content.preview-collapsed { 
  max-height: 200px; /* 限制折叠时的高度 */
  overflow: hidden; 
  position: relative;
  /* 底部渐变遮罩 */
  mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, black 50%, transparent 100%);
}
.btn-ghost-small { padding: 4px 12px; background: white; color: #6b7280; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; cursor: pointer; }

/* 1. 调整按钮容器，确保横向排列 */
.header-actions { 
  display: flex; 
  align-items: center; /* 垂直居中 */
  gap: 12px; 
}

/* 2. 重置按钮基础样式 (关键：防止文字竖排) */
.btn-primary, .btn-ghost {
  display: inline-flex;       /* 确保内容行内排列 */
  align-items: center;        /* 垂直居中图标和文字 */
  justify-content: center;    /* 水平居中 */
  height: 40px;               /* 固定高度，不要太高 */
  padding: 0 20px;            /* 左右留出足够空间 */
  border-radius: 20px;        /* 圆角设计 (药丸形状) */
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;        /* 【核心修复】强制文字不换行 */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 3. 美化"提交小说"按钮 */
.btn-primary { 
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); /* 漂亮的紫蓝渐变 */
  color: white; 
  border: none; 
  box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); /* 柔和的投影 */
}

/* 悬停效果 */
.btn-primary:hover:not(:disabled) { 
  transform: translateY(-1px); 
  box-shadow: 0 6px 15px rgba(99, 102, 241, 0.4);
  filter: brightness(1.05);
}

/* 禁用状态 */
.btn-primary:disabled { 
  background: #cbd5e1; 
  cursor: not-allowed; 
  box-shadow: none;
  transform: none;
}

/* 4. 美化"重置"按钮 */
.btn-ghost { 
  background: white; 
  color: #64748b; 
  border: 1px solid #e2e8f0; /* 浅灰色边框 */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.btn-ghost:hover { 
  background: #f8fafc; 
  color: #334155; 
  border-color: #cbd5e1;
}

/* 5. 调整图标和文字的间距 */
.btn-primary .el-icon, 
.btn-ghost .el-icon {
  margin-right: 6px; /* 图标和文字之间加一点距离 */
  font-size: 16px;
}

/* 6. 加载图标旋转动画 (如果之前没有的话) */
.is-loading {
  animation: rotate 1.5s linear infinite;
}
@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
/* 移动端提交按钮区 */
.mobile-submit-actions { display: none; margin-top: 24px; }

/* 响应式 */
@media (max-width: 1024px) {
  .dashboard-grid { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: 100%; max-height: none; }
  .profile-sidebar { height: auto; flex-direction: row; align-items: center; justify-content: space-between; padding: 16px; flex-shrink: 0; }
  .sidebar-menu { flex-direction: row; flex: 0; overflow-y: visible; margin-bottom: 0; }
  .sidebar-footer { display: none; }
  .profile-header { display: flex; align-items: center; gap: 16px; margin: 0; text-align: left; }
  .avatar-wrapper { margin: 0; width: 48px; height: 48px; }
  .tags, .email, .divider { display: none; }
  .main-content { height: auto; flex: 1; }
  .mobile-submit-actions { display: block; }
  .header-actions .btn-primary { display: none; }
  .full-width-btn { width: 100%; justify-content: center; padding: 14px; font-size: 16px; }
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
  .selection-group { flex-direction: column; }
}
</style>