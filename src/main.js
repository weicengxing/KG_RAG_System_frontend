import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import router from './router' // 新增
import { createPinia } from 'pinia' // 新增
import axios from 'axios'

const app = createApp(App)

// --- 添加 Axios 拦截器 ---
// 请求拦截器：自动添加 Authorization header
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器：处理 401 错误（token 过期）
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // token 过期或无效，清除登录信息
      localStorage.removeItem('token')
      localStorage.removeItem('username')
      // 重定向到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

app.use(ElementPlus)
app.use(router) // 新增
app.use(createPinia()) // 新增
app.mount('#app')