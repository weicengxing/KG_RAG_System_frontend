<template>
  <div class="starry-sky">
    <!-- 流星背景层 -->
    <div class="stars">
      <div v-for="i in 10" :key="i" class="star"></div>
    </div>

    <!-- 登录框内容 -->
    <div class="glass-box">
      <div class="title-box">
        <h1>KG-RAG</h1>
        <p>构建 · 溯源 · 问答</p>
      </div>

      <el-tabs v-model="activeTab" class="custom-tabs" stretch>
        <!-- 登录 -->
        <el-tab-pane label="登录" name="login">
          <!-- 密码登录表单 -->
          <div v-if="!showQRLogin">
            <el-form :model="loginForm" :rules="rules" ref="loginRef" size="large">
              <el-form-item prop="username">
                <el-input v-model="loginForm.username" placeholder="用户名" @blur="checkQRLoginStatus">
                  <template #prefix><el-icon><User /></el-icon></template>
                </el-input>
              </el-form-item>
              <el-form-item prop="password">
                <el-input v-model="loginForm.password" type="password" placeholder="密码" show-password>
                  <template #prefix><el-icon><Lock /></el-icon></template>
                </el-input>
              </el-form-item>
              <div class="forgot-password-link">
                <router-link to="/forgot-password" class="link-text">忘记密码？</router-link>
              </div>
              <el-button type="primary" class="w-100 submit-btn" :loading="loading" @click="handleLogin">
                登 录
              </el-button>
            </el-form>

            <!-- 优化的二维码登录入口 -->
            <div v-if="qrLoginAvailable" class="qr-login-entry" @click="showQRLogin = true">
              <div class="qr-entry-content">
                <div class="icon-circle">
                  <el-icon><Iphone /></el-icon>
                </div>
                <span class="text">手机扫码登录</span>
              </div>
              <el-icon class="arrow"><ArrowRight /></el-icon>
            </div>
          </div>

          <!-- 二维码登录界面 -->
          <div v-else class="qr-login-container">
            <div class="qr-box">
              <div v-if="qrLoading" class="qr-loading">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>生成中...</span>
              </div>
              <div v-else-if="qrExpired" class="qr-expired" @click="generateQRCode">
                <el-icon><WarningFilled /></el-icon>
                <span>二维码已过期</span>
                <p>点击刷新</p>
              </div>
              <div v-else-if="qrConfirmed" class="qr-confirmed">
                <el-icon><CircleCheckFilled /></el-icon>
                <span>登录成功</span>
              </div>
              <div v-else class="qr-code-wrapper">
                <img :src="qrCodeImage" alt="登录二维码" class="qr-code-img" />
              </div>
            </div>

            <div class="qr-status">
              <span v-if="qrLoading">正在生成二维码...</span>
              <span v-else-if="qrExpired">二维码已过期，请点击刷新</span>
              <span v-else-if="qrConfirmed">扫码成功，正在跳转...</span>
              <span v-else>请使用手机扫描二维码登录</span>
            </div>

            <div v-if="!qrLoading && !qrExpired && !qrConfirmed" class="qr-countdown">
              有效期：{{ qrCountdown }}秒
            </div>

            <div class="back-to-password" @click="backToPassword">
              <el-icon><Back /></el-icon>
              <span>返回密码登录</span>
            </div>
          </div>
        </el-tab-pane>

        <!-- 邮箱注册 -->
        <el-tab-pane label="注册" name="register">
          <el-form :model="regForm" :rules="regRules" ref="regRef" size="large">
            <el-form-item prop="username">
              <el-input v-model="regForm.username" placeholder="设置用户名">
                <template #prefix><el-icon><User /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item prop="email">
              <el-input v-model="regForm.email" placeholder="请输入邮箱">
                <template #prefix><el-icon><Message /></el-icon></template>
              </el-input>
            </el-form-item>

            <el-form-item prop="code">
              <div class="code-row">
                <el-input v-model="regForm.code" placeholder="验证码" style="width: 100%">
                  <template #prefix><el-icon><Key /></el-icon></template>
                </el-input>
                <el-button type="primary" plain :disabled="timer > 0" @click="sendCode">
                  {{ timer > 0 ? `${timer}s后重试` : '获取验证码' }}
                </el-button>
              </div>
            </el-form-item>

            <el-form-item prop="password">
              <el-input v-model="regForm.password" type="password" placeholder="设置密码" show-password>
                <template #prefix><el-icon><Lock /></el-icon></template>
              </el-input>
              <div class="password-hint">
                密码要求：至少12位，包含大小写字母和特殊字符
              </div>
            </el-form-item>

            <el-button type="success" class="w-100 submit-btn" :loading="loading" @click="handleRegister">
              注 册
            </el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 2FA 验证弹窗 -->
    <el-dialog
      v-model="show2FADialog"
      title="两步验证"
      width="400px"
      :close-on-click-modal="false"
      :show-close="true"
      @close="handle2FADialogClose"
      class="twofa-dialog"
    >
      <div class="twofa-content">
        <p class="twofa-desc">您的账户已启用两步验证，请上传您的验证图片完成登录。</p>

        <div class="upload-area" @click="trigger2FAUpload" @dragover.prevent @drop.prevent="handle2FADrop">
          <input type="file" ref="twoFAInput" @change="handle2FAFileChange" accept="image/*" style="display: none" />
          <div v-if="!twoFAPreview" class="upload-placeholder">
            <el-icon class="upload-icon"><Picture /></el-icon>
            <p>点击或拖拽上传验证图片</p>
          </div>
          <div v-else class="upload-preview">
            <img :src="twoFAPreview" alt="验证图片" />
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="handle2FADialogClose">取消</el-button>
        <el-button type="primary" @click="verify2FA" :loading="verifying2FA" :disabled="!twoFAFile">
          {{ verifying2FA ? '验证中...' : '验证登录' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { User, Lock, Message, Key, Picture, Iphone, Loading, WarningFilled, CircleCheckFilled, Back, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref('login')
const loading = ref(false)
const timer = ref(0)

const loginRef = ref(null)
const regRef = ref(null)

const loginForm = reactive({ username: '', password: '' })
const regForm = reactive({ username: '', email: '', code: '', password: '' })

// 2FA 相关状态
const show2FADialog = ref(false)
const twoFAUsername = ref('')
const twoFAInput = ref(null)
const twoFAFile = ref(null)
const twoFAPreview = ref('')
const verifying2FA = ref(false)

// 二维码登录相关状态
const showQRLogin = ref(false)
const qrLoginAvailable = ref(false)
const qrLoading = ref(false)
const qrExpired = ref(false)
const qrConfirmed = ref(false)
const qrCodeImage = ref('')
const qrId = ref('')
const qrCountdown = ref(300)
let qrPollingTimer = null
let qrCountdownTimer = null

// 密码强度校验器
const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入密码'))
    return
  }
  if (value.length < 12) {
    callback(new Error('密码长度至少12位'))
    return
  }
  if (!/[a-z]/.test(value)) {
    callback(new Error('密码必须包含小写字母'))
    return
  }
  if (!/[A-Z]/.test(value)) {
    callback(new Error('密码必须包含大写字母'))
    return
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'/`~]/.test(value)) {
    callback(new Error('密码必须包含特殊字符'))
    return
  }
  callback()
}

// 校验规则
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const regRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, validator: validatePassword, trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }]
}

// 发送验证码逻辑
const sendCode = async () => {
  if (!regForm.email) return ElMessage.warning('请先填写邮箱')
  
  try {
    await request.post('/auth/send-code', { email: regForm.email })
    ElMessage.success('验证码已发送，请查收邮件')
    // 倒计时逻辑
    timer.value = 60
    const interval = setInterval(() => {
      timer.value--
      if (timer.value <= 0) clearInterval(interval)
    }, 1000)
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '发送失败')
  }
}

// 登录逻辑
const handleLogin = async () => {
  if (!loginRef.value) return
  await loginRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        const res = await request.post('/auth/login', loginForm)

        // 检查是否需要2FA验证
        if (res.data.requires_2fa) {
          twoFAUsername.value = res.data.username
          show2FADialog.value = true
          ElMessage.info('请上传验证图片完成两步验证')
        } else {
          // 直接登录成功
          userStore.setLogin(res.data.access_token, res.data.username)
          ElMessage.success('登录成功')
          router.push('/')
        }
      } catch (error) {
        ElMessage.error(error.response?.data?.detail || '登录失败')
      } finally {
        loading.value = false
      }
    }
  })
}

// ==================== 2FA 验证相关方法 ====================

const trigger2FAUpload = () => twoFAInput.value?.click()

const handle2FAFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  twoFAFile.value = file
  twoFAPreview.value = URL.createObjectURL(file)
}

const handle2FADrop = (event) => {
  const file = event.dataTransfer.files[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  twoFAFile.value = file
  twoFAPreview.value = URL.createObjectURL(file)
}

const clear2FAFile = () => {
  twoFAFile.value = null
  twoFAPreview.value = ''
  if (twoFAInput.value) {
    twoFAInput.value.value = ''
  }
}

const handle2FADialogClose = () => {
  show2FADialog.value = false
  clear2FAFile()
  twoFAUsername.value = ''
}

const verify2FA = async () => {
  if (!twoFAFile.value) {
    ElMessage.error('请先选择验证图片')
    return
  }

  verifying2FA.value = true
  try {
    const fd = new FormData()
    fd.append('username', twoFAUsername.value)
    fd.append('file', twoFAFile.value)

    const res = await request.post('/auth/verify-2fa', fd)

    // 验证成功，完成登录
    userStore.setLogin(res.data.access_token, res.data.username)
    show2FADialog.value = false
    clear2FAFile()
    ElMessage.success('验证成功，登录完成')
    router.push('/')
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '验证失败，请检查图片是否正确')
  } finally {
    verifying2FA.value = false
  }
}

// 注册逻辑
const handleRegister = async () => {
  if (!regRef.value) return
  await regRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await request.post('/auth/register', regForm)
        ElMessage.success('注册成功，请登录')
        activeTab.value = 'login'
        loginForm.username = regForm.username
      } catch (error) {
        ElMessage.error(error.response?.data?.detail || '注册失败')
      } finally {
        loading.value = false
      }
    }
  })
}

// ==================== 二维码登录相关方法 ====================

// 检查用户是否启用了二维码登录
const checkQRLoginStatus = async () => {
  const username = loginForm.username.trim()
  if (!username) {
    qrLoginAvailable.value = false
    return
  }

  try {
    const res = await request.get(`/auth/qr/status/${username}`)
    qrLoginAvailable.value = res.data.qr_login_enabled || false
  } catch (e) {
    qrLoginAvailable.value = false
  }
}

// 生成二维码
const generateQRCode = async () => {
  qrLoading.value = true
  qrExpired.value = false
  qrConfirmed.value = false
  qrCodeImage.value = ''

  clearQRTimers()

  try {
    const res = await request.post('/auth/qr/generate')
    qrId.value = res.data.qr_id

    // 使用在线二维码生成服务
    qrCodeImage.value = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(res.data.qr_url)}`

    qrCountdown.value = res.data.expires_in || 300
    startCountdown()
    startPolling()
  } catch (e) {
    ElMessage.error('生成二维码失败，请重试')
    qrExpired.value = true
  } finally {
    qrLoading.value = false
  }
}

const startCountdown = () => {
  qrCountdownTimer = setInterval(() => {
    qrCountdown.value--
    if (qrCountdown.value <= 0) {
      qrExpired.value = true
      clearQRTimers()
    }
  }, 1000)
}

const startPolling = () => {
  qrPollingTimer = setInterval(async () => {
    try {
      const res = await request.get(`/auth/qr/check/${qrId.value}`)

      if (res.data.status === 'confirmed') {
        qrConfirmed.value = true
        clearQRTimers()

        userStore.setLogin(res.data.access_token, res.data.username)
        ElMessage.success('扫码登录成功！')

        setTimeout(() => {
          router.push('/')
        }, 1000)
      } else if (res.data.status === 'expired') {
        qrExpired.value = true
        clearQRTimers()
      }
    } catch (e) {
      // 轮询出错，忽略
    }
  }, 2000)
}

const clearQRTimers = () => {
  if (qrPollingTimer) {
    clearInterval(qrPollingTimer)
    qrPollingTimer = null
  }
  if (qrCountdownTimer) {
    clearInterval(qrCountdownTimer)
    qrCountdownTimer = null
  }
}

const backToPassword = () => {
  showQRLogin.value = false
  clearQRTimers()
  qrLoading.value = false
  qrExpired.value = false
  qrConfirmed.value = false
  qrCodeImage.value = ''
  qrId.value = ''
}

// 切换到二维码登录时自动生成
watch(showQRLogin, (val) => {
  if (val) {
    generateQRCode()
  }
})
</script>

<style scoped>
/* --- 核心背景样式 --- */
.starry-sky {
  height: 100vh;
  width: 100vw;
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

/* 流星动画 */
.star {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.1), 0 0 0 8px rgba(255, 255, 255, 0.1), 0 0 20px rgba(255, 255, 255, 1);
  animation: animate 3s linear infinite;
}

.star::before {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 300px;
  height: 1px;
  background: linear-gradient(90deg, #fff, transparent);
}

/* 为每颗流星设置随机位置和延迟 */
.star:nth-child(1) { top: 0px; right: 0px; left:initial; animation-duration: 1.8s; animation-delay: 0.6s; }
.star:nth-child(2) { top: 0px; right: 80px; left:initial; animation-duration: 3s; animation-delay: 0s; }
.star:nth-child(3) { top: 80px; right: 0px; left:initial; animation-duration: 2s; animation-delay: 1.2s; }
.star:nth-child(4) { top: 0px; right: 180px; left:initial; animation-duration: 1.5s; animation-delay: 2.5s; }
.star:nth-child(5) { top: 0px; right: 400px; left:initial; animation-duration: 2.5s; animation-delay: 1s; }
.star:nth-child(6) { top: 0px; right: 600px; left:initial; animation-duration: 3s; animation-delay: 2s; }
.star:nth-child(7) { top: 300px; right: 0px; left:initial; animation-duration: 1.75s; animation-delay: 1.5s; }
.star:nth-child(8) { top: 0px; right: 700px; left:initial; animation-duration: 2.2s; animation-delay: 0.8s; }
.star:nth-child(9) { top: 0px; right: 1000px; left:initial; animation-duration: 2.6s; animation-delay: 1.8s; }
.star:nth-child(10){ top: 0px; right: 450px; left:initial; animation-duration: 2s; animation-delay: 3.5s; }

@keyframes animate {
  0% { transform: rotate(315deg) translateX(0); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: rotate(315deg) translateX(-1000px); opacity: 0; }
}

/* 玻璃卡片 */
.glass-box {
  z-index: 10; /* 确保在流星之上 */
  width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.title-box h1 { color: #fff; margin-bottom: 5px; letter-spacing: 2px; }
.title-box p { color: #ddd; font-size: 14px; }
.code-row { display: flex; gap: 10px; }

/* 密码提示样式 */
.password-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

/* 忘记密码链接样式 */
.forgot-password-link {
  text-align: right;
  margin-top: -10px;
  margin-bottom: 10px;
}

.forgot-password-link .link-text {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.3s;
}

.forgot-password-link .link-text:hover {
  color: #409eff;
}

/* 覆盖 Element Plus 样式，使其适应深色背景 */
:deep(.el-input__wrapper) {
  background-color: rgba(255,255,255,0.2);
  box-shadow: none;
  border: 1px solid rgba(255,255,255,0.3);
}
:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset;
}
:deep(.el-input__inner) { color: #fff; }
:deep(.el-tabs__item) { color: #ddd; }
:deep(.el-tabs__item.is-active) { color: #409eff; font-weight: bold; }
:deep(.el-tabs__nav-wrap::after) { background-color: rgba(255,255,255,0.2); }
.submit-btn {
  margin-top: 20px;
  height: 40px;
  font-size: 16px;
  letter-spacing: 4px;
  background: linear-gradient(90deg, #03a9f4, #f441a5);
  border: none;
}
.submit-btn:hover { opacity: 0.9; }

/* ================= 2FA 验证弹窗样式 ================= */
.twofa-content {
  padding: 10px 0;
}

.twofa-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  line-height: 1.6;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-area:hover {
  border-color: #409eff;
  background: #f0f7ff;
}

.upload-placeholder {
  color: #999;
}

.upload-placeholder .upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
  color: #ccc;
}

.upload-placeholder p {
  font-size: 14px;
  margin: 0;
  color: #666;
}

.upload-preview {
  display: inline-block;
}

.upload-preview img {
  max-width: 180px;
  max-height: 180px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

:deep(.twofa-dialog .el-dialog) {
  border-radius: 16px;
}

:deep(.twofa-dialog .el-dialog__header) {
  padding: 20px 20px 10px;
  border-bottom: 1px solid #eee;
}

:deep(.twofa-dialog .el-dialog__title) {
  font-weight: 600;
  font-size: 18px;
}

:deep(.twofa-dialog .el-dialog__body) {
  padding: 20px;
}

:deep(.twofa-dialog .el-dialog__footer) {
  padding: 10px 20px 20px;
  border-top: 1px solid #eee;
}

/* ================= 二维码登录样式 (优化版) ================= */

/* 优化后的入口容器 */
.qr-login-entry {
  margin-top: 40px; /* 增加与上方按钮的间距 */
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.4s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.qr-login-entry:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px); /* 轻微上浮 */
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.qr-entry-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 图标圆形背景 */
.icon-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s ease;
}

.qr-login-entry:hover .icon-circle {
  background: #409eff;
  color: #fff;
  box-shadow: 0 0 10px rgba(64, 158, 255, 0.6); /* 发光效果 */
}

.icon-circle .el-icon {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  transition: color 0.3s;
}

.qr-login-entry:hover .icon-circle .el-icon {
  color: #fff;
}

.qr-login-entry .text {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  letter-spacing: 1px;
}

/* 右侧箭头 */
.qr-login-entry .arrow {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  transition: transform 0.3s, color 0.3s;
}

.qr-login-entry:hover .arrow {
  color: #fff;
  transform: translateX(3px);
}


/* 二维码登录容器 */
.qr-login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

/* 二维码框 */
.qr-box {
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* 二维码加载中 */
.qr-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #666;
}

.qr-loading .el-icon {
  font-size: 32px;
  color: #409eff;
}

.qr-loading span {
  font-size: 14px;
}

/* 二维码已过期 */
.qr-expired {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #999;
  cursor: pointer;
  transition: all 0.3s;
}

.qr-expired:hover {
  color: #409eff;
}

.qr-expired .el-icon {
  font-size: 40px;
  color: #f56c6c;
}

.qr-expired span {
  font-size: 14px;
  font-weight: 500;
}

.qr-expired p {
  font-size: 12px;
  color: #409eff;
  margin: 0;
}

/* 二维码已确认 */
.qr-confirmed {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #67c23a;
}

.qr-confirmed .el-icon {
  font-size: 48px;
}

.qr-confirmed span {
  font-size: 14px;
  font-weight: 500;
}

/* 二维码图片包装器 */
.qr-code-wrapper {
  padding: 10px;
}

.qr-code-img {
  width: 180px;
  height: 180px;
  display: block;
}

/* 二维码状态文字 */
.qr-status {
  margin-top: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  text-align: center;
}

/* 二维码倒计时 */
.qr-countdown {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* 返回密码登录按钮 */
.back-to-password {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
  padding: 10px 20px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 8px;
}

.back-to-password:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.back-to-password .el-icon {
  font-size: 14px;
}
</style>