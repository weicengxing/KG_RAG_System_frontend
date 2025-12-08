<template>
  <div class="starry-sky">
    <!-- 流星背景层 -->
    <div class="stars">
      <div v-for="i in 10" :key="i" class="star"></div>
    </div>

    <!-- 忘记密码框内容 -->
    <div class="glass-box">
      <div class="title-box">
        <h1>重置密码</h1>
        <p>请填写以下信息以重置您的密码</p>
      </div>

      <el-form :model="resetForm" :rules="rules" ref="resetRef" size="large">
        <el-form-item prop="username">
          <el-input v-model="resetForm.username" placeholder="用户名">
            <template #prefix><el-icon><User /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item prop="email">
          <el-input v-model="resetForm.email" placeholder="邮箱地址">
            <template #prefix><el-icon><Message /></el-icon></template>
          </el-input>
        </el-form-item>

        <el-form-item prop="code">
          <div class="code-row">
            <el-input v-model="resetForm.code" placeholder="验证码" style="width: 100%">
              <template #prefix><el-icon><Key /></el-icon></template>
            </el-input>
            <el-button type="primary" plain :disabled="timer > 0" @click="sendCode">
              {{ timer > 0 ? `${timer}s后重试` : '获取验证码' }}
            </el-button>
          </div>
        </el-form-item>

        <el-form-item prop="newPassword">
          <el-input v-model="resetForm.newPassword" type="password" placeholder="新密码" show-password>
            <template #prefix><el-icon><Lock /></el-icon></template>
          </el-input>
          <div class="password-hint">
            密码要求：至少12位，包含大小写字母和特殊字符
          </div>
        </el-form-item>

        <el-button type="primary" class="w-100 submit-btn" :loading="loading" @click="handleResetPassword">
          重置密码
        </el-button>
      </el-form>

      <div class="back-to-login">
        <router-link to="/login" class="link-text">
          <el-icon><Back /></el-icon>
          <span>返回登录</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { User, Lock, Message, Key, Back } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)
const timer = ref(0)
const resetRef = ref(null)

const resetForm = reactive({
  username: '',
  email: '',
  code: '',
  newPassword: ''
})

// 密码强度校验器
const validatePassword = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请输入新密码'))
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
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: ['blur', 'change'] }
  ],
  code: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
  newPassword: [{ required: true, validator: validatePassword, trigger: 'blur' }]
}

// 发送验证码逻辑
const sendCode = async () => {
  if (!resetForm.email) {
    ElMessage.warning('请先填写邮箱')
    return
  }
  if (!resetForm.username) {
    ElMessage.warning('请先填写用户名')
    return
  }
  
  try {
    await request.post('/auth/forgot-password/send-code', {
      username: resetForm.username,
      email: resetForm.email
    })
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

// 重置密码逻辑
const handleResetPassword = async () => {
  if (!resetRef.value) return
  await resetRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true
      try {
        await request.post('/auth/forgot-password/reset', {
          username: resetForm.username,
          email: resetForm.email,
          code: resetForm.code,
          new_password: resetForm.newPassword
        })
        ElMessage.success('密码重置成功，请使用新密码登录')
        setTimeout(() => {
          router.push('/login')
        }, 1500)
      } catch (error) {
        ElMessage.error(error.response?.data?.detail || '重置密码失败')
      } finally {
        loading.value = false
      }
    }
  })
}
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
  z-index: 10;
  width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  box-shadow: 0 15px 35px rgba(0,0,0,0.2);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
}

.title-box h1 {
  color: #fff;
  margin-bottom: 5px;
  letter-spacing: 2px;
}

.title-box p {
  color: #ddd;
  font-size: 14px;
  margin-bottom: 30px;
}

.code-row {
  display: flex;
  gap: 10px;
}

/* 密码提示样式 */
.password-hint {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
}

/* 返回登录链接 */
.back-to-login {
  margin-top: 20px;
  text-align: center;
}

.back-to-login .link-text {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 0.3s;
}

.back-to-login .link-text:hover {
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

:deep(.el-input__inner) {
  color: #fff;
}

.submit-btn {
  margin-top: 20px;
  height: 40px;
  font-size: 16px;
  letter-spacing: 4px;
  background: linear-gradient(90deg, #03a9f4, #f441a5);
  border: none;
}

.submit-btn:hover {
  opacity: 0.9;
}
</style>




