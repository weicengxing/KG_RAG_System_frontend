/**
 * Kafka + SSE 集成工具
 * 用于异步文档上传和进度监听
 */

import { ElMessage } from 'element-plus'
import request from './request'

const API_BASE_URL = 'http://localhost:8000/api/kg'

/**
 * 使用 SSE 流式监听任务进度（带自动重连）
 * @param {string} taskId - 任务ID
 * @param {Object} callbacks - 回调函数对象
 * @param {Function} callbacks.onProgress - 进度更新回调 (progress, stage, message)
 * @param {Function} callbacks.onCompleted - 完成回调 (resultData)
 * @param {Function} callbacks.onError - 错误回调 (errorMessage)
 * @param {number} maxRetries - 最大重试次数，默认 5 次
 * @param {number} retryDelay - 重试延迟（毫秒），默认 3000ms
 * @returns {Object} 包含 close 方法的对象，可以用于手动关闭连接
 */
export function watchTaskProgress(taskId, callbacks = {}, maxRetries = 5, retryDelay = 3000) {
  const { onProgress, onCompleted, onError } = callbacks
  
  let eventSource = null
  let retryCount = 0
  let shouldReconnect = true

  // 构建 SSE URL
  const url = `${API_BASE_URL}/task/stream/${taskId}`

  const connect = () => {
    console.log(`🔗 正在连接 SSE (尝试 ${retryCount + 1}/${maxRetries}):`, taskId)
    
    // 📌 从 localStorage 获取 token 并添加到 URL 的 query 参数中
    // 因为 EventSource API 不支持自定义请求头（如 Authorization header）
    const token = localStorage.getItem('token')
    const sseUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url
    
    eventSource = new EventSource(sseUrl)

    eventSource.onopen = () => {
      console.log('✅ SSE 连接已建立:', taskId)
      retryCount = 0 // 连接成功，重置重试计数器
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('📡 收到 SSE 消息:', data)

        switch (data.type) {
          case 'progress':
            // 进度更新
            if (onProgress) {
              onProgress(data.progress, data.stage, data.message)
            }
            break

          case 'completed':
            // 任务完成
            shouldReconnect = false
            if (onCompleted) {
              onCompleted(data.data)
            }
            eventSource.close()
            ElMessage.success('知识图谱构建完成！')
            break

          case 'error':
            // 错误发生（任务错误，不是连接错误）
            shouldReconnect = false
            if (onError) {
              onError(data.message)
            }
            ElMessage.error(data.message || '处理失败')
            eventSource.close()
            break
        }
      } catch (e) {
        console.error('❌ 解析 SSE 消息失败:', e)
      }
    }

    eventSource.onerror = (error) => {
      console.error('❌ SSE 连接错误:', error)
      eventSource.close()

      if (shouldReconnect && retryCount < maxRetries) {
        retryCount++
        console.log(`🔄 ${retryDelay/1000} 秒后自动重连 (${retryCount}/${maxRetries})...`)
        
        // 延迟重连
        setTimeout(connect, retryDelay)
      } else if (retryCount >= maxRetries) {
        console.error('❌ 达到最大重试次数，停止重连')
        if (onError) {
          onError('连接中断，请刷新页面重试')
        }
        ElMessage.error('连接中断，请刷新页面重试')
      }
    }
  }

  // 开始连接
  connect()

  // 返回控制对象
  return {
    close: () => {
      shouldReconnect = false
      if (eventSource) {
        eventSource.close()
      }
    }
  }
}

/**
 * 轮询获取任务状态（SSE 降级方案）
 * @param {string} taskId - 任务ID
 * @param {Object} callbacks - 回调函数对象
 * @param {number} interval - 轮询间隔（毫秒），默认 2000ms
 * @returns {number} 轮询定时器 ID，可以用于停止轮询
 */
export function pollTaskStatus(taskId, callbacks = {}, interval = 2000) {
  const { onProgress, onCompleted, onError } = callbacks

  let pollCount = 0
  const maxPolls = 600 // 最多轮询 20 分钟（600 * 2s = 1200s）

  const timerId = setInterval(async () => {
    try {
      const res = await request.get(`${API_BASE_URL}/task/${taskId}`)
      const data = res.data

      console.log('🔄 轮询任务状态:', data.status, data.progress)

      if (data.status === 'processing') {
        if (onProgress) {
          onProgress(data.progress, data.stage, data.message)
        }
      } else if (data.status === 'completed') {
        clearInterval(timerId)
        if (onCompleted) {
          onCompleted(data.result)
        }
        ElMessage.success('知识图谱构建完成！')
      } else if (data.status === 'failed') {
        clearInterval(timerId)
        if (onError) {
          onError(data.error_message)
        }
        ElMessage.error(data.error_message || '处理失败')
      }

      pollCount++
      if (pollCount >= maxPolls) {
        clearInterval(timerId)
        if (onError) {
          onError('任务超时，请稍后重试')
        }
        ElMessage.error('任务超时')
      }
    } catch (e) {
      console.error('❌ 轮询任务状态失败:', e)
      clearInterval(timerId)
      if (onError) {
        onError('获取任务状态失败，请稍后重试')
      }
    }
  }, interval)

  return timerId
}

/**
 * 停止轮询
 * @param {number} timerId - 轮询定时器 ID
 */
export function stopPolling(timerId) {
  if (timerId) {
    clearInterval(timerId)
  }
}

/**
 * 异步上传文档
 * @param {File} file - 上传的文件
 * @returns {Promise<Object>} 返回包含 taskId, docId 等信息的对象
 */
export async function uploadDocumentAsync(file) {
  const formData = new FormData()
  formData.append('file', file)

  const res = await request.post(`${API_BASE_URL}/upload-async`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

  return res.data
}

/**
 * 获取任务状态（单次查询）
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 任务状态对象
 */
export async function getTaskStatus(taskId) {
  const res = await request.get(`${API_BASE_URL}/task/${taskId}`)
  return res.data
}

export default {
  watchTaskProgress,
  pollTaskStatus,
  stopPolling,
  uploadDocumentAsync,
  getTaskStatus
}
