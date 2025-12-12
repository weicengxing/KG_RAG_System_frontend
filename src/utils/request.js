import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'

// 创建 axios 实例
const request = axios.create({
  baseURL: 'http://localhost:8000', // 替换为你的后端 API 地址
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token（避免 Pinia 在模块初始化时未就绪）
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 跳过 ngrok 浏览器警告拦截页
    config.headers['ngrok-skip-browser-warning'] = 'true'
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 📌 检查是否有新 token（token 过期但在 24 小时活动窗口内时返回）
    const newToken = response.headers['x-new-token']
    if (newToken) {
      console.log('📝 [JWT] 收到新 token，已自动保存')
      localStorage.setItem('token', newToken)
      
      // 同时更新 Pinia store
      try {
        const userStore = useUserStore()
        if (userStore.token !== newToken) {
          userStore.token = newToken
        }
      } catch (e) {
        // store 可能未初始化，但 localStorage 已保存，不影响
      }
    }
    
    return response
  },
  (error) => {
    // 处理 401 未授权错误
    if (error.response?.status === 401) {
      const errorData = error.response.data || {}
      const code = errorData.code
      const detail = errorData.detail || '认证失败'
      
      // 🔴 如果是 SESSION_EXPIRED，说明已超过 24 小时，需要重新登录
      if (code === 'SESSION_EXPIRED') {
        console.log('❌ [JWT] 活动已过期，需要重新登录')
        ElMessage.error('活动已过期，请重新登录')
      } else {
        console.log('❌ [JWT] 认证失败:', detail)
        ElMessage.error(detail || '登录已过期，请重新登录')
      }
      
      // 清除登录信息
      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')
      
      // 更新 Pinia store
      try {
        const userStore = useUserStore()
        userStore.logout()
      } catch (e) {
        // store 可能未初始化
      }
      
      // 重定向到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default request
