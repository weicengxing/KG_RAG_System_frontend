/**
 * TraceID 追踪工具
 * 用于生成和管理请求的TraceID，实现全链路追踪
 */

/**
 * 生成雪花ID（简化版前端实现）
 * 注意：前端只需生成简单的唯一ID即可，不需要与后端雪花算法完全一致
 * 后端会验证并可能重新生成更规范的TraceID
 * 
 * @returns {string} 唯一ID
 */
export function generateSnowflakeId() {
  // 时间戳占41位（毫秒）
  const timestamp = Date.now()
  
  // 随机数占23位（模拟机器ID和序列号）
  const randomPart = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  
  // 组合成唯一ID
  return `${timestamp}-${randomPart}`
}

/**
 * 生成TraceID
 * 使用雪花ID算法（前端简化版）
 * 
 * @returns {string} TraceID
 */
export function generateTraceId() {
  return generateSnowflakeId()
}

/**
 * 获取当前请求的TraceID
 * 从请求响应头中提取
 * 
 * @param {Object} response - Axios响应对象
 * @returns {string|null} TraceID
 */
export function getTraceIdFromResponse(response) {
  const traceId = response?.headers?.['x-trace-id']
  return traceId || null
}

/**
 * 存储TraceID到localStorage（用于调试和错误追踪）
 * 
 * @param {string} traceId - TraceID
 */
export function storeTraceId(traceId) {
  try {
    // 只保留最近10个TraceID，避免localStorage过大
    const recentTraceIds = JSON.parse(localStorage.getItem('recent_trace_ids') || '[]')
    recentTraceIds.unshift({
      id: traceId,
      timestamp: Date.now()
    })
    // 只保留最近10个
    const limitedTraceIds = recentTraceIds.slice(0, 10)
    localStorage.setItem('recent_trace_ids', JSON.stringify(limitedTraceIds))
  } catch (e) {
    console.warn('存储TraceID失败:', e)
  }
}

/**
 * 获取最近的TraceID列表
 * 
 * @returns {Array} TraceID列表
 */
export function getRecentTraceIds() {
  try {
    const recentTraceIds = JSON.parse(localStorage.getItem('recent_trace_ids') || '[]')
    return recentTraceIds
  } catch (e) {
    console.warn('获取TraceID列表失败:', e)
    return []
  }
}

/**
 * 清理过期的TraceID（超过1小时）
 */
export function cleanupExpiredTraceIds() {
  try {
    const recentTraceIds = JSON.parse(localStorage.getItem('recent_trace_ids') || '[]')
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    const filteredTraceIds = recentTraceIds.filter(item => item.timestamp > oneHourAgo)
    localStorage.setItem('recent_trace_ids', JSON.stringify(filteredTraceIds))
  } catch (e) {
    console.warn('清理TraceID失败:', e)
  }
}

/**
 * 获取带TraceID的日志前缀
 * 
 * @param {string} traceId - TraceID
 * @returns {string} 日志前缀
 */
export function getLogPrefix(traceId) {
  if (traceId) {
    return `[TRACE_ID:${traceId}]`
  }
  return ''
}

/**
 * 控制台日志包装器，自动添加TraceID
 * 
 * @param {string} level - 日志级别 (log, info, warn, error)
 * @param {string} traceId - TraceID
 * @param  {...any} args - 日志参数
 */
export function traceLog(level, traceId, ...args) {
  const prefix = getLogPrefix(traceId)
  const message = `${prefix} ${args.join(' ')}`
  
  switch (level) {
    case 'info':
      console.info(message)
      break
    case 'warn':
      console.warn(message)
      break
    case 'error':
      console.error(message)
      break
    default:
      console.log(message)
  }
}

// 定时清理过期TraceID（每30分钟）
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredTraceIds, 30 * 60 * 1000)
}