<template>
  <div class="plants-vs-zombies-view">
    <!-- 游戏标题 -->
    <div class="game-header">
      <h1>🌻 植物大战僵尸 🧟</h1>
      <div class="header-buttons">
        <button v-if="role === 'plant'" @click="collectAllSuns" class="control-btn">自动收集阳光</button>
        <button @click="sendGameStateUpdate" class="control-btn">同步状态</button>
        <button @click="declareGameOver" class="control-btn">结束游戏</button>
        <button @click="goBack" class="control-btn">返回房间</button>
      </div>
    </div>

    <div class="game-container">
      <!-- 左侧：植物/僵尸选择栏 -->
      <div class="plants-sidebar" v-if="role === 'plant'">
        <h3>🌻 植物选择</h3>
        <div class="plant-slots">
          <div 
            class="plant-slot" 
            v-for="plant in plantOptions" 
            :key="plant.id"
            :class="{
              'selected': selectedPlant === plant.id,
              'disabled': sunEnergy < plant.cost
            }"
            @click="selectPlant(plant.id)"
          >
            <span class="plant-icon">{{ plant.icon }}</span>
            <span class="plant-name">{{ plant.name }}</span>
            <span class="plant-cost">{{ plant.cost }}</span>
          </div>
        </div>
      </div>

      <div class="zombies-sidebar" v-if="role === 'zombie'">
        <h3>🧟 僵尸选择</h3>
        <div class="zombie-slots">
          <div 
            class="zombie-slot" 
            v-for="zombie in zombieOptions" 
            :key="zombie.rawId"
            :class="{
              'selected': selectedZombie === zombie.rawId,
              'disabled': zombieEnergy < zombie.cost
            }"
            @click="selectZombie(zombie.rawId)"
          >
            <span class="zombie-icon">{{ zombie.icon }}</span>
            <span class="zombie-name">{{ zombie.name }}</span>
            <span class="zombie-cost">{{ zombie.cost }}</span>
          </div>
        </div>
      </div>

      <!-- 中间：游戏画布 -->
      <div class="game-canvas">
        <canvas ref="gameCanvas" @click="handleCanvasClick"></canvas>
      </div>

      <!-- 右侧：信息面板 -->
      <div class="info-panel">
        <div class="info-item">
          <div class="panel-header">
            <h3>{{ role === 'plant' ? '植物选择' : '僵尸选择' }}</h3>
            <div class="resource-info">
              <span v-if="role === 'plant'">☀️ 阳光: {{ sunEnergy }}</span>
              <span v-if="role === 'zombie'">⚡ 能量: {{ zombieEnergy }}</span>
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">房间</span>
            <span class="info-value">{{ roomId }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">角色</span>
            <span class="info-value">{{ role === 'plant' ? '🌻 植物' : '🧟 僵尸' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">状态</span>
            <span class="info-value">{{ connectionStatus }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">延迟</span>
            <span class="info-value">{{ latency }}ms</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 游戏说明 -->
    <div class="game-instructions">
      <h3>游戏说明</h3>
      <p>1. 植物玩家选择植物后点击画布网格进行种植。</p>
      <p>2. 僵尸玩家选择僵尸后点击画布对应行召唤僵尸。</p>
      <p>3. 双方根据资源消耗放置单位，先突破防线的一方获胜。</p>
      <p>4. 房间状态与延迟会实时同步，必要时可使用同步按钮。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { MultiplayerGameEngine } from '../pvz/multiplayerEngine.js'
import { plantConfig, zombieConfig, gameConfig } from '../pvz/config.js'

const router = useRouter()
const route = useRoute()

// 游戏引擎实例
let gameEngine = null
let pingInterval = null

// 响应式状态
const roomId = ref(route.params.roomId)
const userId = ref(route.params.userId || localStorage.getItem('username'))
const fromSelection = ref(route.query.from_selection === '1')
const role = ref('')
const connectionStatus = ref('连接中...')
const gameState = ref(null)
const latency = ref(0)
const gameCanvas = ref(null)

// 植物玩家状态（从engine读取）
const sunEnergy = ref(10000)
const selectedPlant = ref(null)
const selectedPlantsList = ref([])

// 僵尸玩家状态（从engine读取）
const zombieEnergy = ref(10000)
const selectedZombie = ref(null)
const selectedZombiesList = ref([])

// 用于UI渲染的游戏实体（从engine同步）
const plants = ref([])
const zombies = ref([])
const fallingSuns = ref([])
const lawnMowers = ref([])
const animations = ref([])

// WebSocket
let ws = null

// 配置别名
const zombieTypeAlias = {
  basic: 'normal'
}

const zombieCostConfig = {
  basic: 50,
  conehead: 75,
  buckethead: 125,
  football: 175,
  newspaper: 100,
  dancing: 200,
  balloon: 150,
  pole: 125
}

const plantIdAlias = {
  wallnut: 'nutWall',
  cherrybomb: 'cherryBomb'
}

// 计算属性
const plantOptions = computed(() => {
  return selectedPlantsList.value
    .map((rawId) => {
      const id = plantIdAlias[rawId] || rawId
      return { id, ...plantConfig[id] }
    })
    .filter((item) => item && item.id)
})

const zombieOptions = computed(() => {
  return selectedZombiesList.value
    .map((rawId) => {
      const id = zombieTypeAlias[rawId] || rawId
      const base = zombieConfig[id]
      if (!base) return null
      return {
        ...base,
        rawId,
        cost: zombieCostConfig[rawId]
      }
    })
    .filter((item) => item && item.rawId)
})

// 应用选择
const applySelectionsFromQuery = () => {
  const plantSelection = route.query.plant_selection
  if (plantSelection && selectedPlantsList.value.length === 0) {
    const raw = Array.isArray(plantSelection)
      ? plantSelection.join(',')
      : plantSelection
    selectedPlantsList.value = raw.split(',').filter(Boolean)
  }

  const zombieSelection = route.query.zombie_selection
  if (zombieSelection && selectedZombiesList.value.length === 0) {
    const raw = Array.isArray(zombieSelection)
      ? zombieSelection.join(',')
      : zombieSelection
    selectedZombiesList.value = raw.split(',').filter(Boolean)
  }
}

// 自动收集阳光
const collectAllSuns = () => {
  if (!gameEngine || role.value !== 'plant') return
  gameEngine.toggleAutoCollectSun()
}

// 初始化引擎
const initEngine = () => {
  console.log('[initEngine] called', {
    hasCanvas: !!gameCanvas.value,
    hasWs: !!ws,
  })
  
  if (!gameCanvas.value) {
    console.warn('[initEngine] aborted because missing canvas/ws', {
      canvas: gameCanvas.value,
      ws
    })
    ElMessage.error('游戏画布未准备好！')
    return
  }
  
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.warn('[initEngine] aborted because WebSocket not connected', {
      ws: ws?.readyState
    })
    ElMessage.error('WebSocket 未连接！')
    return
  }
  
  const canvasWidth = gameConfig.gridCols * gameConfig.cellWidth
  const canvasHeight = gameConfig.gridRows * gameConfig.cellHeight
  
  console.log('[initEngine] canvas sizing', {
    width: gameCanvas.value.width,
    height: gameCanvas.value.height,
    rect: gameCanvas.value.getBoundingClientRect()
  })

  // 创建MultiplayerGameEngine
  gameEngine = new MultiplayerGameEngine(
    gameCanvas.value,
    canvasWidth,
    canvasHeight,
    ws,
    role.value
  )
  console.log('[initEngine] engine created', {
    isPlaying: gameEngine.isPlaying,
    hasCanvas: !!gameEngine.canvas
  })

  // 设置回调
  gameEngine.onPlantPlaced = (plant, payload) => {
    if (role.value === 'zombie') {
      syncEngineState()
    }
  }
  
  gameEngine.onZombieSpawned = (zombie, payload) => {
    if (role.value === 'plant') {
      syncEngineState()
    }
  }
  
  gameEngine.start()
  console.log('[initEngine] engine started')
  
  syncEngineStateInterval = setInterval(() => {
    syncEngineState()
  }, 100)
  
  console.log('[initEngine] completed')
}

// 同步引擎状态到UI
const syncEngineState = () => {
  if (!gameEngine) return
  
  sunEnergy.value = gameEngine.sunEnergy
  zombieEnergy.value = gameEngine.zombieEnergy
  plants.value = [...gameEngine.plants]
  zombies.value = [...gameEngine.zombies]
  fallingSuns.value = [...gameEngine.suns]
  lawnMowers.value = [...gameEngine.lawnMowers]
  animations.value = [...gameEngine.animations]
}

// WebSocket连接
const initWebSocket = () => {
  const wsUrl = `ws://localhost:8000/api/ws/pvz/room/${roomId.value}?user_id=${userId.value}`
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    connectionStatus.value = '已连接'
  }

  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data)
    
    switch (message.type) {
      case 'event.connected':
        role.value = message.payload.role
        if (role.value === 'plant') {
          sunEnergy.value = 10000
        } else {
          zombieEnergy.value = 10000
        }

        if (!fromSelection.value) {
          setTimeout(() => {
            redirectToSelection()
          }, 500)
        }
        break
        
      case 'event.game_start':
        console.log('hjjdsabfcsvs') 
        connectionStatus.value = '游戏中'
        
        if (message.payload.plant_selection && selectedPlantsList.value.length === 0) {
          selectedPlantsList.value = message.payload.plant_selection
        }
        if (message.payload.zombie_selection && selectedZombiesList.value.length === 0) {
          selectedZombiesList.value = message.payload.zombie_selection
        }
        
        ElMessage.success('游戏开始！')
        
        // 初始化引擎
        await nextTick()
        initEngine()
        break
        
      case 'event.game_over':
        const winner = message.payload.winner
        const winnerText = winner === 'plant' ? '植物' : '僵尸'
        ElMessage.success(`游戏结束！${winnerText}获胜！`)
        break
        
      case 'state.snapshot':
      case 'state.sync':
        // 服务器同步状态
        if (gameEngine) {
          gameEngine.onServerMessage(message)
        }
        syncEngineState()
        break
        
      case 'plant_place_':
      case 'zombie_spawn_':
        // 将消息传递给engine处理
        if (gameEngine) {
          gameEngine.onServerMessage(message)
        }
        break
        
      case 'pong':
        latency.value = Date.now() - message.payload.timestamp
        break
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket错误:', error)
    connectionStatus.value = '连接错误'
  }

  ws.onclose = () => {
    connectionStatus.value = '已断开'
    if (pingInterval) {
      clearInterval(pingInterval)
      pingInterval = null
    }
    if (syncEngineStateInterval) {
      clearInterval(syncEngineStateInterval)
      syncEngineStateInterval = null
    }
  }
}

// 跳转到选择界面
const redirectToSelection = () => {
  if (role.value === 'plant') {
    router.push({
      name: 'PlantSelection',
      query: {
        room_id: roomId.value,
        user_id: userId.value,
        mode: 'multiplayer'
      }
    })
  } else if (role.value === 'zombie') {
    router.push({
      name: 'ZombieSelection',
      params: {
        roomId: roomId.value,
        userId: userId.value
      }
    })
  }
}

// 选择植物
const selectPlant = (plantType) => {
  selectedPlant.value = plantType
}

// 选择僵尸
const selectZombie = (zombieType) => {
  selectedZombie.value = zombieType
}

// 处理画布点击
const handleCanvasClick = (event) => {
  if (!gameEngine) return
  
  const canvas = event.target
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  // 计算网格位置
  const cellWidth = gameConfig.cellWidth
  const cellHeight = gameConfig.cellHeight
  const col = Math.floor(x / cellWidth)
  const row = Math.floor(y / cellHeight)
  
  if (role.value === 'plant' && selectedPlant.value) {
    // 植物玩家：种植植物
    if (col >= 0 && col < gameConfig.gridCols && row >= 0 && row < gameConfig.gridRows) {
      gameEngine.plant(col, row, selectedPlant.value)
      selectedPlant.value = ''
      syncEngineState()
    }
  } else if (role.value === 'zombie' && selectedZombie.value) {
    // 僵尸玩家：在对应行生成僵尸
    if (row >= 0 && row < gameConfig.gridRows) {
      gameEngine.spawnZombie(row, selectedZombie.value)
      selectedZombie.value = ''
      syncEngineState()
    }
  }
}

// 发送游戏状态更新
const sendGameStateUpdate = () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ElMessage.error('WebSocket未连接')
    return
  }

  const state = {
    sun_energy: sunEnergy.value,
    zombie_energy: zombieEnergy.value,
    plants: plants.value,
    zombies: zombies.value,
    timestamp: Date.now()
  }

  ws.send(JSON.stringify({
    type: 'game_state_update',
    payload: state
  }))
}

// 宣布游戏结束
const declareGameOver = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要结束游戏吗？',
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const winner = role.value === 'plant' ? 'plant' : 'zombie'
    ws.send(JSON.stringify({
      type: 'game_over',
      payload: {
        winner: winner,
        reason: `${role.value}玩家宣布结束游戏`
      }
    }))
  } catch {
    // 用户取消
  }
}

// 返回房间
const goBack = () => {
  if (gameEngine) {
    gameEngine.stop()
  }
  if (ws) {
    ws.close()
  }
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  if (syncEngineStateInterval) {
    clearInterval(syncEngineStateInterval)
    syncEngineStateInterval = null
  }
  router.push({ name: 'PvZMultiplayerRoom' })
}

// 挂载
let syncEngineStateInterval = null

onMounted(() => {
  applySelectionsFromQuery()
  initWebSocket()
  
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        payload: { timestamp: Date.now() }
      }))
    }
  }, 10000)
})

// 卸载
onUnmounted(() => {
  if (gameEngine) {
    gameEngine.stop()
  }
  if (ws) {
    ws.close()
  }
  if (pingInterval) {
    clearInterval(pingInterval)
    pingInterval = null
  }
  if (syncEngineStateInterval) {
    clearInterval(syncEngineStateInterval)
    syncEngineStateInterval = null
  }
})
</script>

<style scoped>
.plants-vs-zombies-view {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 游戏标题 */
.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.game-header h1 {
  margin: 0;
  font-size: 2.5rem;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 游戏容器 */
.game-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

/* 植物选择栏 */
.plants-sidebar {
  width: 200px;
  max-height: calc(100vh - 20px);
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.plants-sidebar h3 {
  margin: 0 0 16px 0;
  font-size: 1.2rem;
  color: white;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 10px 0;
  z-index: 1;
}

.plant-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plant-slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.plant-slot:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.plant-slot.selected {
  border-color: #fbbf24;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.5);
}

.plant-slot.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.plant-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.plant-name {
  font-size: 0.9rem;
  color: white;
  margin-bottom: 4px;
}

.plant-cost {
  font-size: 0.8rem;
  color: #fbbf24;
}

/* 僵尸选择栏 */
.zombies-sidebar {
  width: 200px;
  max-height: calc(100vh - 20px);
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.zombies-sidebar h3 {
  margin: 0 0 16px 0;
  font-size: 1.2rem;
  color: white;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 10px 0;
  z-index: 1;
}

.zombie-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.zombie-slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.zombie-slot:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.zombie-slot.selected {
  border-color: #ef4444;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.5);
}

.zombie-slot.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zombie-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.zombie-name {
  font-size: 0.9rem;
  color: white;
  margin-bottom: 4px;
}

.zombie-cost {
  font-size: 0.8rem;
  color: #ef4444;
}

/* 游戏画布 */
.game-canvas {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-canvas canvas {
  display: block;
  cursor: crosshair;
}

/* 信息面板 */
.info-panel {
  width: 180px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.info-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .game-container {
    flex-direction: column;
  }

  .plants-sidebar,
  .zombies-sidebar,
  .info-panel {
    width: 100%;
  }

  .plant-slots,
  .zombie-slots {
    flex-direction: row;
    overflow-x: auto;
  }

  .info-panel {
    display: flex;
    justify-content: space-around;
  }

  .info-item {
    border-bottom: none;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    flex-direction: row;
    gap: 12px;
  }

  .info-item:last-child {
    border-right: none;
  }
}

@media (max-width: 768px) {
  .plants-vs-zombies-view {
    padding: 10px;
  }

  .game-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .game-header h1 {
    font-size: 1.8rem;
  }

  .game-canvas {
    overflow-x: auto;
  }
}

/* 控制按钮样式 */
.header-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.control-btn {
  padding: 8px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

/* 自定义滚动条样式 */
.plants-sidebar::-webkit-scrollbar,
.zombies-sidebar::-webkit-scrollbar {
  width: 6px;
}

.plants-sidebar::-webkit-scrollbar-track,
.zombies-sidebar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.plants-sidebar::-webkit-scrollbar-thumb,
.zombies-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.plants-sidebar::-webkit-scrollbar-thumb:hover,
.zombies-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

/* 游戏说明 */
.game-instructions {
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.game-instructions h3 {
  margin: 0 0 12px 0;
  font-size: 1.2rem;
  color: white;
}

.game-instructions p {
  margin: 8px 0;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.6;
}
</style>
