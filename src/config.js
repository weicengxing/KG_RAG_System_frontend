// 前端配置文件
export const API_CONFIG = {
  // 后端API基础URL - 根据环境变量或默认值
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  
  // WebSocket基础URL - 关键：必须指向后端端口8000
  WS_BASE_URL: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8000'
}
