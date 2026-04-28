import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '../stores/user'
import { generateTraceId, getTraceIdFromResponse, storeTraceId, traceLog } from './trace'
import { API_CONFIG } from '../config.js'

// 创建 axios 实例 - 使用统一的配置
const request = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 1. 生成TraceID并添加到请求头
    const traceId = generateTraceId()
    config.headers['X-Trace-ID'] = traceId
    
    // 2. 从 localStorage 获取 token（避免 Pinia 在模块初始化时未就绪）
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Only ngrok needs this custom header; on Cloudflare it just forces extra preflight requests.
    if (API_CONFIG.BASE_URL.includes('ngrok')) {
      config.headers['ngrok-skip-browser-warning'] = 'true'
    }
    
    // 3. 记录请求日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      traceLog('log', traceId, `请求: ${config.method?.toUpperCase()} ${config.url}`)
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    // 1. 提取TraceID
    const traceId = getTraceIdFromResponse(response)
    if (traceId) {
      // 存储TraceID用于调试
      storeTraceId(traceId)
      
      // 记录响应日志（仅在开发环境）
      if (process.env.NODE_ENV === 'development') {
        traceLog('log', traceId, `响应: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`)
      }
    }
    
    // 2. 📌 检查是否有新 token（token 过期但在 24 小时活动窗口内时返回）
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

// 添加流式请求方法 - 使用统一的配置
export function createStreamRequest(url, data) {
  const token = localStorage.getItem('token')
  const requestUrl = API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}${url}` : url

  return fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(API_CONFIG.BASE_URL.includes('ngrok') && { 'ngrok-skip-browser-warning': 'true' })
    },
    body: JSON.stringify(data)
  })
}

export default request
