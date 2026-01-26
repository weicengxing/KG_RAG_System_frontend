<template>
  <div class="room-container">
    <!-- 顶部标题栏 -->
    <div class="header-section">
      <div class="header-content">
        <h1>🌻 植物大战僵尸 - 对战大厅 🧟</h1>
        <p class="subtitle">创建房间或加入已有房间，与好友一起开始对战！</p>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧：创建/加入房间 -->
      <div class="left-panel">
        <el-card class="action-card">
          <template #header>
            <div class="card-header">
              <span>🎯 快速开始</span>
            </div>
          </template>
          
          <div class="action-buttons">
            <el-button 
              type="primary" 
              size="large" 
              @click="createRoom" 
              :disabled="loading || myRoom"
              :icon="Plus"
              class="full-width-btn"
            >
              创建新房间
            </el-button>
            
            <div class="join-section">
              <div class="join-label">或加入已有房间</div>
              <el-input
                v-model="roomCode"
                placeholder="输入6位房间码"
                maxlength="6"
                :disabled="loading || myRoom"
                clearable
                size="large"
                class="room-input"
              >
                <template #prefix>
                  <el-icon><Key /></el-icon>
                </template>
              </el-input>
              <el-button 
                type="success" 
                size="large" 
                @click="joinRoom"
                :disabled="loading || myRoom || !roomCode"
                :icon="Right"
                class="full-width-btn"
              >
                加入房间
              </el-button>
            </div>
          </div>
        </el-card>

        <!-- 我的房间信息 -->
        <el-card v-if="myRoom" class="my-room-card">
          <template #header>
            <div class="card-header">
              <span>🏠 我的房间</span>
              <el-tag :type="getStatusTagType(myRoom.status)" effect="dark">
                {{ getStatusText(myRoom.status) }}
              </el-tag>
            </div>
          </template>
          
          <div class="room-info">
            <div class="info-item">
              <el-icon class="info-icon"><Key /></el-icon>
              <div class="info-content">
                <div class="info-label">房间码</div>
                <div class="info-value highlight">{{ myRoom.room_code }}</div>
              </div>
            </div>
            
            <div class="info-item" v-if="myRoom.plant_player_username">
              <el-icon class="info-icon plant-icon"><Sunny /></el-icon>
              <div class="info-content">
                <div class="info-label">植物玩家</div>
                <div class="info-value">{{ myRoom.plant_player_username }}</div>
              </div>
            </div>
            
            <div class="info-item" v-if="myRoom.zombie_player_username">
              <el-icon class="info-icon zombie-icon"><Moon /></el-icon>
              <div class="info-content">
                <div class="info-label">僵尸玩家</div>
                <div class="info-value">{{ myRoom.zombie_player_username }}</div>
              </div>
            </div>
            
            <div class="info-item" v-if="!myRoom.zombie_player_username">
              <el-icon class="info-icon"><User /></el-icon>
              <div class="info-content">
                <div class="info-label">僵尸玩家</div>
                <div class="info-value waiting">等待加入...</div>
              </div>
            </div>
          </div>
          
          <div class="room-actions">
            <el-button
              v-if="myRoom.status === 'ready' && isHost"
              type="primary"
              @click="startGame"
              :loading="loading"
              :icon="VideoPlay"
              size="large"
              class="action-btn"
            >
              开始游戏
            </el-button>
            
            <el-button
              v-if="myRoom.status === 'playing' && !isGameStarting"
              type="success"
              @click="enterGame"
              :icon="Right"
              size="large"
              class="action-btn"
            >
              进入游戏
            </el-button>
            
            <el-button
              v-else-if="myRoom.status === 'playing' && isGameStarting"
              type="info"
              :icon="Loading"
              size="large"
              class="action-btn"
              disabled
            >
              等待房主开始游戏...
            </el-button>
            
            <el-button 
              type="danger"
              @click="leaveRoom"
              :icon="Close"
              size="large"
              class="action-btn"
            >
              离开房间
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 右侧：房间列表 -->
      <div class="right-panel">
        <el-card class="rooms-card">
          <template #header>
            <div class="card-header">
              <span>🏆 可用房间</span>
              <el-badge :value="rooms.length" class="badge">
                <el-icon :size="20"><List /></el-icon>
              </el-badge>
            </div>
          </template>
          
          <div class="rooms-list">
            <el-empty v-if="rooms.length === 0" description="暂无可用房间">
              <template #image>
                <el-icon :size="60"><ChatDotRound /></el-icon>
              </template>
            </el-empty>
            
            <div v-else class="room-cards">
              <div
                v-for="room in rooms"
                :key="room.room_id"
                class="room-card-item"
              >
                <div class="room-header">
                  <div class="room-code">🎯 {{ room.room_code }}</div>
                  <el-tag :type="getStatusTagType(room.status)" size="small" effect="plain">
                    {{ getStatusText(room.status) }}
                  </el-tag>
                </div>
                
                <div class="room-players">
                  <div class="player-slot" :class="{ filled: room.plant_player_username }">
                    <el-icon class="player-icon"><Sunny /></el-icon>
                    <span>{{ room.plant_player_username || '等待加入' }}</span>
                  </div>
                  <div class="vs-divider">VS</div>
                  <div class="player-slot" :class="{ filled: room.zombie_player_username }">
                    <el-icon class="player-icon"><Moon /></el-icon>
                    <span>{{ room.zombie_player_username || '等待加入' }}</span>
                  </div>
                </div>
                
                <div class="room-footer">
                  <el-button
                    v-if="!myRoom && !room.zombie_player"
                    type="success"
                    @click="joinRoomWithCode(room.room_code)"
                    :disabled="loading"
                    :icon="Right"
                    size="small"
                  >
                    加入
                  </el-button>
                  <el-tag v-else type="info" size="small" effect="plain">
                    已满/已加入
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 消息提示 -->
    <el-alert
      v-if="message"
      :type="message.type"
      :title="message.text"
      show-icon
      :closable="false"
      class="message-alert"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  Plus,
  Right,
  Key,
  VideoPlay,
  Close,
  List,
  User,
  ChatDotRound,
  Sunny,
  Moon,
  Loading
} from '@element-plus/icons-vue'
import request from '../utils/request'
import { ElMessage, ElMessageBox } from 'element-plus'
import { API_CONFIG } from '../config.js'

const router = useRouter()

const roomCode = ref('')
const myRoom = ref(null)
const rooms = ref([])
const loading = ref(false)
const message = ref(null)
const websocket = ref(null)
const lobbyWebsocket = ref(null)  // 新增大厅WebSocket连接
const isGameStarting = ref(false)
const isHost = ref(false)

const currentUserId = ref(localStorage.getItem('username') || 'unknown')

const getStatusText = (status) => {
  const statusMap = {
    'waiting': '等待中',
    'ready': '准备就绪',
    'playing': '游戏中',
    'paused': '暂停',
    'finished': '已结束'
  }
  return statusMap[status] || status
}

const getStatusTagType = (status) => {
  const typeMap = {
    'waiting': 'warning',
    'ready': 'success',
    'playing': 'primary',
    'paused': 'info',
    'finished': 'danger'
  }
  return typeMap[status] || 'info'
}

const showMessage = (text, type = 'info') => {
  message.value = { text, type }
  setTimeout(() => {
    message.value = null
  }, 3000)
}

const loadRooms = async () => {
  try {
    const res = await request.get('/api/pvz/multiplayer/active-rooms')
    // res.data 是整个响应体 {success, message, data}，需要获取实际数据
    rooms.value = res.data?.data || []
  } catch (error) {
    console.error('加载房间列表失败:', error)
  }
}

const loadMyRoom = async () => {
  try {
    const res = await request.get('/api/pvz/multiplayer/my-room')
    // res.data 是整个响应体 {success, message, data}，需要获取实际数据
    myRoom.value = res.data?.data || null
  } catch (error) {
    console.error('加载我的房间失败:', error)
  }
}

const createRoom = async () => {
  loading.value = true
  try {
    const res = await request.post('/api/pvz/multiplayer/create-room')
    // res.data 是整个响应体 {success, message, data}，需要获取实际数据
    myRoom.value = res.data?.data
    showMessage('房间创建成功！房间码: ' + res.data?.data?.room_code, 'success')
    ElMessage.success('房间创建成功！房间码: ' + res.data?.data?.room_code)
    await loadRooms()
  } catch (error) {
    const msg = error.response?.data?.detail || '创建房间失败'
    showMessage(msg, 'error')
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const joinRoom = async () => {
  if (!roomCode.value) {
    showMessage('请输入房间码', 'error')
    ElMessage.warning('请输入房间码')
    return
  }
  
  loading.value = true
  try {
    const res = await request.post('/api/pvz/multiplayer/join-room', {
      room_code: roomCode.value
    })
    // res.data 是整个响应体 {success, message, data}，需要获取实际数据
    myRoom.value = res.data?.data
    showMessage('成功加入房间！', 'success')
    ElMessage.success('成功加入房间！')
    await loadRooms()
  } catch (error) {
    const msg = error.response?.data?.detail || '加入房间失败'
    showMessage(msg, 'error')
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const joinRoomWithCode = async (code) => {
  roomCode.value = code
  await joinRoom()
}

const leaveRoom = async () => {
  // 判断当前用户是否是房主（植物玩家）
  const isHost = myRoom.value && myRoom.value.plant_player === currentUserId.value
  
  const confirmText = isHost 
    ? '您是房主，离开房间将导致房间被删除，确定要离开吗？'
    : '确定要离开房间吗？'
  
  try {
    await ElMessageBox.confirm(confirmText, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  
  loading.value = true
  try {
    // 先断开WebSocket连接
    disconnectWebSocket()
    
    // 再调用离开房间API
    await request.post('/api/pvz/multiplayer/leave-room', {})
    
    myRoom.value = null
    roomCode.value = ''
    showMessage('已离开房间', 'info')
    ElMessage.info('已离开房间')
    await loadRooms()
  } catch (error) {
    const msg = error.response?.data?.detail || '离开房间失败'
    showMessage(msg, 'error')
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const startGame = async () => {
  if (!myRoom.value) {
    return
  }
  
  loading.value = true
  try {
    await request.post('/api/pvz/multiplayer/start-game', {
      room_id: myRoom.value.room_id
    })
    myRoom.value.status = 'playing'
    showMessage('游戏开始！', 'success')
    ElMessage.success('游戏开始！')
    await loadRooms() // 更新房间列表
  } catch (error) {
    const msg = error.response?.data?.detail || '开始游戏失败'
    showMessage(msg, 'error')
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

const enterGame = () => {
  if (!myRoom.value) {
    return
  }
  
  router.push({
    name: 'PlantsVsZombiesMultiplayer',
    params: {
      roomId: myRoom.value.room_id,
      userId: currentUserId.value
    }
  })
}

const connectLobbyWebSocket = () => {
  // 只在没有房间时连接大厅WebSocket
  if (lobbyWebsocket.value || myRoom.value) {
    return
  }
  
  const wsPath = `/api/ws/pvz/lobby?user_id=${currentUserId.value}`
  const wsUrl = `${API_CONFIG.WS_BASE_URL}${wsPath}`
  
  console.log('[Lobby] 连接大厅WebSocket:', wsUrl)
  
  lobbyWebsocket.value = new WebSocket(wsUrl)
  
  lobbyWebsocket.value.onopen = () => {
    console.log('[Lobby] ✅ 大厅WebSocket连接成功')
    ElMessage.success('已连接到游戏大厅')
  }
  
  lobbyWebsocket.value.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('[Lobby] 收到消息:', data.type, data)
      
      switch (data.type) {
        case 'event.room_list_update':
          console.log('[Lobby] 房间列表更新:', data.payload.rooms)
          // 更新房间列表
          rooms.value = data.payload.rooms
          if (data.payload.message) {
            ElMessage.info(data.payload.message)
          }
          break
          
        case 'pong':
          console.log('[Lobby] 心跳响应:', data.payload.timestamp)
          break
          
        default:
          console.log('[Lobby] 未处理的消息类型:', data.type)
      }
    } catch (error) {
      console.error('[Lobby] 处理消息失败:', error)
    }
  }
  
  lobbyWebsocket.value.onerror = (error) => {
    console.error('[Lobby] ❌ 错误:', error)
    ElMessage.error('大厅连接错误')
  }
  
  lobbyWebsocket.value.onclose = () => {
    console.log('[Lobby] 大厅连接关闭')
    lobbyWebsocket.value = null
  }
}

const disconnectLobbyWebSocket = () => {
  if (lobbyWebsocket.value) {
    try {
      if (lobbyWebsocket.value.readyState === WebSocket.OPEN) {
        lobbyWebsocket.value.close(1000, 'Leaving lobby')
      }
      lobbyWebsocket.value = null
      console.log('[Lobby] 大厅WebSocket已断开')
    } catch (error) {
      console.error('断开大厅WebSocket失败:', error)
      lobbyWebsocket.value = null
    }
  }
}

const connectWebSocket = () => {
  if (websocket.value) {
    return
  }
  
  // 使用配置的WebSocket基础URL，而不是window.location.host
  const wsPath = `/api/ws/pvz/room/${myRoom.value.room_id}?user_id=${currentUserId.value}`
  const wsUrl = `${API_CONFIG.WS_BASE_URL}${wsPath}`
  
  console.log('[WebSocket] 尝试连接真正的后端:', wsUrl)
  console.log('[WebSocket] 当前页面URL:', window.location.href)
  console.log('[WebSocket] 当前房间:', myRoom.value)
  console.log('[WebSocket] 当前用户:', currentUserId.value)
  
  websocket.value = new WebSocket(wsUrl)
  
  websocket.value.onopen = () => {
    console.log('[WebSocket] 连接已建立 ✅')
    ElMessage.success('已连接到房间')
  }
  
  websocket.value.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data)
      console.log('[WebSocket] 收到消息:', data.type, data)
      
      switch (data.type) {
        case 'event.connected':
          console.log('[WebSocket] 已连接到房间，角色:', data.payload.role)
          break
          
        case 'event.player_joined':
          console.log(`[WebSocket] 玩家 ${data.payload.username} 加入房间`)
          // 有新玩家加入，重新加载房间信息
          await loadMyRoom()
          await loadRooms()
          ElMessage.success(`${data.payload.username} 加入了房间`)
          break
          
        case 'event.player_left':
          console.log(`[WebSocket] 玩家 ${data.payload.username} 离开房间`)
          // 有玩家离开，重新加载房间信息
          await loadMyRoom()
          await loadRooms()
          ElMessage.info(`${data.payload.username} 离开了房间`)
          break
          
        case 'event.player_disconnected':
          console.log(`[WebSocket] 玩家 ${data.payload.user_id} 断开连接`)
          ElMessage.warning('有玩家已断开连接')
          break
          
        case 'event.game_start':
          console.log('[WebSocket] 游戏开始事件')
          // 房主开始游戏，自动跳转到游戏页面
          ElMessage.success('游戏开始，正在进入游戏...')
          isGameStarting.value = true
          
          // 延迟1秒后进入游戏，给用户一点时间看到提示消息
          setTimeout(() => {
            enterGame()
          }, 1000)
          break
          
        case 'event.room_destroyed':
          console.log('[WebSocket] 房间被销毁')
          // 房间被摧毁（房主离开）
          myRoom.value = null
          isHost.value = false
          await loadRooms()
          ElMessage.warning('房间已被房主关闭')
          break
          
        default:
          console.log('未处理的消息类型:', data.type)
      }
    } catch (error) {
      console.error('处理WebSocket消息失败:', error)
    }
  }
  
  websocket.value.onerror = (error) => {
    console.error('[WebSocket] 错误:', error)
    ElMessage.error('WebSocket连接错误')
  }
  
  websocket.value.onclose = () => {
    console.log('[WebSocket] 连接已关闭')
    websocket.value = null
  }
}

const disconnectWebSocket = () => {
  if (websocket.value) {
    try {
      // 检查连接状态
      if (websocket.value.readyState === WebSocket.OPEN) {
        websocket.value.close(1000, 'Leaving room')
      }
      websocket.value = null
    } catch (error) {
      console.error('关闭WebSocket连接失败:', error)
      websocket.value = null
    }
  }
}

const updateIsHost = () => {
  if (myRoom.value) {
    isHost.value = myRoom.value.plant_player === currentUserId.value
    console.log('[Host Update] 房主状态:', isHost.value, '房主ID:', myRoom.value.plant_player, '当前用户:', currentUserId.value)
  } else {
    isHost.value = false
  }
}

// 强制刷新房间数据，确保能看到最新状态
const refreshRoomData = async () => {
  console.log('[Refresh] 开始刷新房间数据...')
  await Promise.all([loadMyRoom(), loadRooms()])
  console.log('[Refresh] 房间数据刷新完成')
}

onMounted(async () => {
  await refreshRoomData()
  updateIsHost()
  
  // 如果没有加入房间，连接大厅WebSocket
  if (!myRoom.value) {
    connectLobbyWebSocket()
  }
})

onUnmounted(() => {
  disconnectWebSocket()
  disconnectLobbyWebSocket()
})

// 监听myRoom变化，自动连接/断开WebSocket
const watchMyRoom = (newVal, oldVal) => {
  const prevRoomId = oldVal?.room_id
  const newRoomId = newVal?.room_id
  
  console.log('[Watch] myRoom变化:', {
    oldRoomId: prevRoomId,
    newRoomId: newRoomId,
    oldVal: oldVal,
    newVal: newVal
  })
  
  updateIsHost()
  
  // 如果有新房间
  if (newRoomId) {
    // 进入房间时，断开大厅连接
    disconnectLobbyWebSocket()
    
    // 如果房间ID改变了，先断开旧连接，再建立新连接
    if (prevRoomId && prevRoomId !== newRoomId) {
      console.log('[WebSocket] 房间ID改变，重新连接')
      disconnectWebSocket()
    }
    // 如果还没有WebSocket连接，建立连接
    if (!websocket.value) {
      connectWebSocket()
    }
  } else {
    // 如果没有房间，断开房间WebSocket连接
    console.log('[WebSocket] 没有房间，断开连接')
    disconnectWebSocket()
    
    // 连接大厅WebSocket（如果还没有连接）
    if (!lobbyWebsocket.value) {
      connectLobbyWebSocket()
    }
  }
}

watch(myRoom, watchMyRoom, { deep: true })

</script>

<style scoped>
.room-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

/* 顶部标题栏 */
.header-section {
  margin-bottom: 24px;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  text-align: center;
  color: white;
  padding: 40px 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 12px 0;
  font-size: 36px;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle {
  margin: 0;
  font-size: 16px;
  opacity: 0.9;
}

/* 主内容区域 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 卡片样式 */
.action-card,
.my-room-card,
.rooms-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: none;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.my-room-card {
  margin-top: 24px;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge {
  margin-left: 8px;
}

/* 操作按钮区域 */
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.full-width-btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
  font-weight: 600;
}

.join-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.join-label {
  text-align: center;
  color: #666;
  font-size: 14px;
  position: relative;
}

.join-label::before,
.join-label::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 30%;
  height: 1px;
  background: #ddd;
}

.join-label::before {
  left: 0;
}

.join-label::after {
  right: 0;
}

.room-input {
  font-size: 16px;
}

.room-input :deep(.el-input__inner) {
  text-align: center;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 2px;
}

/* 房间信息 */
.room-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.info-item:hover {
  transform: translateX(4px);
  background: rgba(255, 255, 255, 0.8);
}

.info-icon {
  font-size: 24px;
  color: #666;
  min-width: 24px;
}

.plant-icon {
  color: #28a745;
}

.zombie-icon {
  color: #9b59b6;
}

.info-content {
  flex: 1;
}

.info-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.info-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.info-value.highlight {
  font-size: 24px;
  color: #667eea;
  letter-spacing: 2px;
}

.info-value.waiting {
  color: #999;
  font-style: italic;
}

/* 房间操作按钮 */
.room-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

/* 房间列表 */
.rooms-list {
  min-height: 500px;
}

.room-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.room-card-item {
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.room-card-item:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.room-code {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
}

.room-players {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.player-slot {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  background: #f8f9fa;
  color: #999;
  font-size: 14px;
  transition: all 0.3s ease;
}

.player-slot.filled {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.player-icon {
  font-size: 18px;
}

.vs-divider {
  padding: 0 12px;
  font-weight: 700;
  color: #667eea;
  font-size: 16px;
  font-style: italic;
}

.room-footer {
  display: flex;
  justify-content: flex-end;
}

/* 消息提示 */
.message-alert {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .left-panel {
    margin-bottom: 24px;
  }
}

@media (max-width: 768px) {
  .room-container {
    padding: 12px;
  }
  
  .header-content {
    padding: 24px 16px;
  }
  
  .header-content h1 {
    font-size: 24px;
  }
  
  .subtitle {
    font-size: 14px;
  }
  
  .full-width-btn,
  .action-btn {
    height: 44px;
    font-size: 14px;
  }
  
  .info-value.highlight {
    font-size: 20px;
  }
  
  .room-players {
    flex-direction: column;
    gap: 8px;
  }
  
  .vs-divider {
    padding: 0;
    transform: rotate(90deg);
  }
}
</style>
