<template>
  <div class="plant-selection-view">
    <div class="selection-header">
      <h1>🌻 选择你的植物 🌻</h1>
      <p class="selection-info">请选择参战植物（最多 7 个）</p>
      <div class="selection-status">
        <span class="selected-count">已选择: {{ selectedPlants.length }}/7</span>
      </div>
    </div>

    <div class="plants-grid">
      <div 
        v-for="plant in allPlants" 
        :key="plant.id"
        class="plant-card"
        :class="{ 'selected': isSelected(plant.id), 'disabled': !isSelected(plant.id) && selectedPlants.length >= 7 }"
        @click="toggleSelection(plant.id)"
      >
        <div class="plant-card-icon">{{ plant.icon }}</div>
        <div class="plant-card-name">{{ plant.name }}</div>
        <div class="plant-card-cost">
          <span class="cost-icon">☀️</span>
          <span>{{ plant.cost }}</span>
        </div>
        <div class="plant-card-description">
          {{ getPlantDescription(plant.id) }}
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
        @click="startGame" 
        :disabled="selectedPlants.length === 0"
        class="action-btn start-btn"
        :class="{ 'disabled': selectedPlants.length === 0 }"
      >
        开始战斗 →
      </button>
    </div>

    <!-- 等待对手提示 -->
    <div v-if="waitingForOpponent" class="waiting-overlay">
      <div class="waiting-content">
        <div class="loading-spinner"></div>
        <h2>等待僵尸玩家选择...</h2>
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
import { plantConfig } from '../pvz/config.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

// 检查是否是多人模式
const isMultiplayer = computed(() => route.query.mode === 'multiplayer')
const roomId = ref(route.query.room_id)
const userId = ref(route.query.user_id || localStorage.getItem('username'))

// 所有可用的植物
const allPlants = computed(() => {
  return Object.keys(plantConfig).map(key => ({
    id: key,
    ...plantConfig[key]
  }))
})

// 已选择的植物ID列表
const selectedPlants = ref([])

// WebSocket连接（多人模式）
let ws = null

// 状态管理（多人模式）
const waitingForOpponent = ref(false)

// Toast 提示
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

// 判断植物是否被选中
const isSelected = (plantId) => {
  return selectedPlants.value.includes(plantId)
}

// 切换选择状态
const toggleSelection = (plantId) => {
  const index = selectedPlants.value.indexOf(plantId)
  
  if (index > -1) {
    // 已选中，取消选择
    selectedPlants.value.splice(index, 1)
  } else {
    // 未选中，添加选择
    if (selectedPlants.value.length >= 7) {
      showTempToast('最多只能选择 7 个植物！')
      return
    }
    selectedPlants.value.push(plantId)
  }
}

// 获取植物描述
const getPlantDescription = (plantId) => {
  const descriptions = {
    sunflower: '定期生产阳光',
    peashooter: '发射豌豆攻击前方僵尸',
    repeater: '一次发射4颗豌豆',
    snowPea: '发射寒冰豌豆，减缓僵尸速度',
    nutWall: '高生命值，阻挡僵尸前进',
    cherryBomb: '立即爆炸，消灭周围僵尸',
    watermelon: '投掷西瓜，造成范围伤害',
    iceWatermelon: '投掷寒冰西瓜，造成减速伤害',
    kiwi: '召唤金箍棒进行范围攻击',
    cannon: '发射玉米炮弹，造成巨大爆炸伤害',
    fireStump: '增强附近植物攻击力，转换寒冰为火焰',
    jalapeno: '消灭整行僵尸',
    squash: '压扁邻近的僵尸',
    potatoMine: '需要准备时间，然后炸毁接触的僵尸',
    hypnoShroom: '接触僵尸让其为你而战，血量x3，攻击力x2',
    thunderMelon: '发射闪电五连鞭，在多个僵尸之间跳跃传播，伤害递增并减速',
    dragonKale: '发射三枚螺旋刀片（破甲x2），击中后召唤冰龙造成范围冰冻伤害'
  }
  return descriptions[plantId] || '强大的植物'
}

// 连接WebSocket（多人模式）
const connectWebSocket = () => {
  if (!isMultiplayer.value) return
  
  const wsUrl = `ws://localhost:8000/api/ws/pvz/room/${roomId.value}?user_id=${userId.value}`
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('植物选择界面WebSocket连接成功')
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
    case 'event.plant_selection_confirmed':
      waitingForOpponent.value = true
      showTempToast('选择已确认，等待僵尸玩家...')
      break
      
    case 'event.game_start':
    case 'game_start':  // 兼容后端发送的无event.前缀的消息
      // 两位玩家都选择完成，跳转到游戏界面，并将选择列表通过URL参数传递
      const plantSelection = message.payload?.plant_selection || selectedPlants.value
      router.push({
        name: 'PlantsVsZombiesMultiplayer',
        params: {
          roomId: roomId.value,
          userId: userId.value
        },
        query: {
          from_selection: '1',
          plant_selection: plantSelection.join(',')
        }
      })
      break
      
    case 'event.player_disconnected':
      ElMessage.warning('僵尸玩家已断开连接')
      waitingForOpponent.value = false
      break
  }
}

// 返回上一页
const goBack = () => {
  if (ws) {
    ws.close()
  }
  
  if (isMultiplayer.value) {
    // 多人模式返回房间
    router.push({
      name: 'PvZMultiplayerRoom',
      params: {
        roomId: roomId.value
      }
    })
  } else {
    // 单人模式返回上一页
    router.back()
  }
}

// 开始游戏/确认选择
const startGame = () => {
  if (selectedPlants.value.length === 0) {
    showTempToast('请至少选择 1 个植物！')
    return
  }
  
  if (isMultiplayer.value) {
    // 多人模式：发送选择结果到服务器
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      ElMessage.error('连接已断开，请刷新页面重试')
      return
    }

    const message = {
      type: 'plant_selection_complete',
      payload: {
        room_id: roomId.value,
        user_id: userId.value,
        selected_plants: selectedPlants.value
      }
    }

    ws.send(JSON.stringify(message))
    waitingForOpponent.value = true
    showTempToast('选择已提交，等待僵尸玩家...')
  } else {
    // 单人模式：直接跳转到游戏页面
    router.push({
      name: 'PlantsVsZombies',
      query: {
        plants: selectedPlants.value.join(',')
      }
    })
  }
}

// 生命周期
onMounted(() => {
  if (isMultiplayer.value) {
    connectWebSocket()
  }
})

onUnmounted(() => {
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
.plant-selection-view {
  min-height: 100vh;
  padding: 40px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
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
  color: #fbbf24;
}

.plants-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px;
  max-width: 1400px;
  width: 100%;
  margin-bottom: 40px;
}

.plant-card {
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

.plant-card:hover:not(.disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.plant-card.selected {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.2);
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
}

.plant-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.plant-card-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.plant-card-name {
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  margin-bottom: 8px;
}

.plant-card-cost {
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

.plant-card-description {
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
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
}

.back-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
}

.start-btn {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.start-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4);
}

.start-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
@media (max-width: 1400px) {
  .plants-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 1100px) {
  .plants-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .plants-grid {
    grid-template-columns: repeat(2, 1fr);
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
  .plants-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
  
  .plant-selection-view {
    padding: 20px 10px;
  }
  
  .plant-card {
    padding: 15px;
  }
  
  .plant-card-icon {
    font-size: 2.5rem;
  }
  
  .plant-card-name {
    font-size: 1rem;
  }
  
  .plant-card-description {
    font-size: 0.8rem;
  }
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
  border-top: 4px solid #22c55e;
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
</style>
