<template>
  <div class="zombie-selection-view">
    <div class="selection-header">
      <h1>🧟 选择你的僵尸 🧟</h1>
      <p class="selection-info">请选择参战僵尸类型（最多 5 个）</p>
      <div class="selection-status">
        <span class="selected-count">已选择: {{ selectedZombies.length }}/5</span>
      </div>
    </div>

    <div class="zombies-grid">
      <div 
        v-for="zombie in allZombies" 
        :key="zombie.id"
        class="zombie-card"
        :class="{ 'selected': isSelected(zombie.id), 'disabled': !isSelected(zombie.id) && selectedZombies.length >= 5 }"
        @click="toggleSelection(zombie.id)"
      >
        <div class="zombie-card-icon">{{ zombie.icon }}</div>
        <div class="zombie-card-name">{{ zombie.name }}</div>
        <div class="zombie-card-cost">
          <span class="cost-icon">⚡</span>
          <span>{{ zombie.cost }}</span>
        </div>
        <div class="zombie-card-stats">
          <div class="stat-item">
            <span class="stat-label">❤️</span>
            <span class="stat-value">{{ zombie.hp }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">⚡</span>
            <span class="stat-value">{{ zombie.speed }}</span>
          </div>
        </div>
        <div class="zombie-card-description">
          {{ getZombieDescription(zombie.id) }}
        </div>
      </div>
    </div>

    <div class="selection-actions">
      <button 
        @click="goBack" 
        class="action-btn back-btn"
      >
        ← 返回
      </button>
      <button 
        @click="confirmSelection" 
        :disabled="selectedZombies.length === 0"
        class="action-btn confirm-btn"
        :class="{ 'disabled': selectedZombies.length === 0 }"
      >
        确认选择 →
      </button>
    </div>

    <!-- 等待对手提示 -->
    <div v-if="waitingForOpponent" class="waiting-overlay">
      <div class="waiting-content">
        <div class="loading-spinner"></div>
        <h2>等待植物玩家选择...</h2>
        <p>请稍候，游戏即将开始</p>
      </div>
    </div>

    <!-- 提示消息 -->
    <div v-if="showToast" class="toast-message">
      {{ toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

// 获取房间和用户信息
const roomId = ref(route.params.roomId)
const userId = ref(route.params.userId || localStorage.getItem('username'))

// 所有可用的僵尸类型
const allZombies = computed(() => {
  const zombieTypes = {
    basic: { id: 'basic', name: '普通僵尸', icon: '🧟', cost: 50, hp: 200, speed: 1 },
    conehead: { id: 'conehead', name: '路障僵尸', icon: '🎩', cost: 75, hp: 400, speed: 1 },
    buckethead: { id: 'buckethead', name: '铁桶僵尸', icon: '🪣', cost: 125, hp: 600, speed: 1 },
    football: { id: 'football', name: '橄榄球僵尸', icon: '🏈', cost: 175, hp: 500, speed: 2 },
    newspaper: { id: 'newspaper', name: '报纸僵尸', icon: '📰', cost: 100, hp: 300, speed: 1.5 },
    dancing: { id: 'dancing', name: '跳舞僵尸', icon: '🕺', cost: 200, hp: 400, speed: 1 },
    balloon: { id: 'balloon', name: '气球僵尸', icon: '🎈', cost: 150, hp: 250, speed: 1.2 },
    pole: { id: 'pole', name: '撑杆僵尸', icon: '🏃', cost: 125, hp: 350, speed: 2.5 }
  }
  return Object.values(zombieTypes)
})

// 已选择的僵尸ID列表
const selectedZombies = ref([])

// WebSocket连接
let ws = null

// 状态管理
const waitingForOpponent = ref(false)
const showToast = ref(false)
const toastMessage = ref('')

// 显示提示消息
const showTempToast = (message) => {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2000)
}

// 判断僵尸是否被选中
const isSelected = (zombieId) => {
  return selectedZombies.value.includes(zombieId)
}

// 切换选择状态
const toggleSelection = (zombieId) => {
  const index = selectedZombies.value.indexOf(zombieId)
  
  if (index > -1) {
    // 已选中，取消选择
    selectedZombies.value.splice(index, 1)
  } else {
    // 未选中，添加选择
    if (selectedZombies.value.length >= 5) {
      showTempToast('最多只能选择 5 个僵尸类型！')
      return
    }
    selectedZombies.value.push(zombieId)
  }
}

// 获取僵尸描述
const getZombieDescription = (zombieId) => {
  const descriptions = {
    basic: '基础僵尸，平衡的生命值和速度',
    conehead: '戴着路障，生命值较高',
    buckethead: '戴着铁桶，生命值很高',
    football: '移动速度快，生命值中等',
    newspaper: '报纸被毁后会加速',
    dancing: '可以召唤伴舞僵尸',
    balloon: '可以飞过植物',
    pole: '可以跳过第一个植物'
  }
  return descriptions[zombieId] || '强大的僵尸'
}

// 连接WebSocket
const connectWebSocket = () => {
  const wsUrl = `ws://localhost:8000/api/ws/pvz/room/${roomId.value}?user_id=${userId.value}`
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('僵尸选择界面WebSocket连接成功')
  }

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    handleWebSocketMessage(message)
  }

  ws.onerror = (error) => {
    console.error('WebSocket错误:', error)
    ElMessage.error('连接失败，请重试')
  }

  ws.onclose = () => {
    console.log('WebSocket连接关闭')
  }
}

// 处理WebSocket消息
const handleWebSocketMessage = (message) => {
  switch (message.type) {
    case 'event.zombie_selection_confirmed':
      waitingForOpponent.value = true
      showTempToast('选择已确认，等待植物玩家...')
      break
      
    case 'event.game_start':
    case 'game_start':  // 兼容后端发送的无event.前缀的消息
      // 两位玩家都选择完成，跳转到游戏界面
      router.push({
        name: 'PlantsVsZombiesMultiplayer',
        params: {
          roomId: roomId.value,
          userId: userId.value
        },
        query: {
          from_selection: '1'
        }
      })
      break
      
    case 'event.player_disconnected':
      ElMessage.warning('植物玩家已断开连接')
      waitingForOpponent.value = false
      break
  }
}

// 确认选择
const confirmSelection = () => {
  if (selectedZombies.value.length === 0) {
    showTempToast('请至少选择 1 个僵尸类型！')
    return
  }

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ElMessage.error('连接已断开，请刷新页面重试')
    return
  }

  // 发送选择结果到服务器
  const message = {
    type: 'zombie_selection_complete',
    payload: {
      room_id: roomId.value,
      user_id: userId.value,
      selected_zombies: selectedZombies.value
    }
  }

  ws.send(JSON.stringify(message))
  waitingForOpponent.value = true
  showTempToast('选择已提交，等待植物玩家...')
}

// 返回上一页
const goBack = () => {
  if (ws) {
    ws.close()
  }
  router.push({
    name: 'PvZMultiplayerRoom',
    params: {
      roomId: roomId.value
    }
  })
}

// 生命周期
onMounted(() => {
  connectWebSocket()
})

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
.zombie-selection-view {
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #4a1a4a 0%, #2d1b69 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.selection-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
}

.selection-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.selection-info {
  font-size: 1.2rem;
  margin-bottom: 15px;
  opacity: 0.9;
}

.selection-status {
  display: inline-block;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  font-size: 1.1rem;
  font-weight: 600;
}

.selected-count {
  color: #ef4444;
}

.zombies-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 1200px;
  width: 100%;
  margin-bottom: 40px;
}

.zombie-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 3px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.zombie-card:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.zombie-card.selected {
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.2);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
}

.zombie-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zombie-card-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.zombie-card-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  margin-bottom: 8px;
}

.zombie-card-cost {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 1.1rem;
  color: #fbbf24;
  font-weight: 700;
  margin-bottom: 12px;
}

.cost-icon {
  font-size: 1.3rem;
}

.zombie-card-stats {
  display: flex;
  gap: 15px;
  margin-bottom: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
}

.stat-label {
  font-size: 1rem;
}

.stat-value {
  font-weight: 600;
  color: white;
}

.zombie-card-description {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
}

.selection-actions {
  display: flex;
  gap: 20px;
  align-items: center;
}

.action-btn {
  padding: 16px 48px;
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.back-btn {
  background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
}

.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
}

.confirm-btn {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.confirm-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.confirm-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 等待遮罩 */
.waiting-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.waiting-content {
  text-align: center;
  color: white;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #ef4444;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.waiting-content h2 {
  font-size: 1.8rem;
  margin-bottom: 10px;
}

.waiting-content p {
  font-size: 1.1rem;
  opacity: 0.8;
}

.toast-message {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  padding: 16px 32px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-weight: 600;
  border-radius: 12px;
  z-index: 9999;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .zombies-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .zombies-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .zombies-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 15px;
  }
  
  .selection-header h1 {
    font-size: 2rem;
  }
  
  .selection-actions {
    flex-direction: column;
    width: 100%;
    max-width: 300px;
  }
  
  .action-btn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .zombies-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .zombie-selection-view {
    padding: 20px 10px;
  }
  
  .zombie-card {
    padding: 15px;
  }
  
  .zombie-card-icon {
    font-size: 2.5rem;
  }
  
  .zombie-card-name {
    font-size: 1rem;
  }
  
  .zombie-card-description {
    font-size: 0.8rem;
  }
}
</style>
