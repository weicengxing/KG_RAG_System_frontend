<template>
  <div class="multiplayer-game-container">
    <!-- 顶部标题栏 -->
    <div class="game-header">
      <div class="header-content">
        <div class="header-left">
          <h1>🌻 植物大战僵尸 - 双人对战 🧟</h1>
          <div class="game-info">
            <div class="info-badge">
              <el-icon><House /></el-icon>
              <span>房间: {{ roomId }}</span>
            </div>
            <div class="info-badge">
              <el-icon v-if="role === 'plant'"><Sunny /></el-icon>
              <el-icon v-else><Moon /></el-icon>
              <span>角色: {{ role === 'plant' ? '🌻 植物' : '🧟 僵尸' }}</span>
            </div>
            <div class="info-badge">
              <el-icon><Connection /></el-icon>
              <span>状态: </span>
              <el-tag 
                :type="getStatusType(connectionStatus)" 
                size="small"
                effect="dark"
              >
                {{ connectionStatus }}
              </el-tag>
            </div>
            <div class="info-badge">
              <el-icon><Timer /></el-icon>
              <span>延迟: {{ latency }}ms</span>
            </div>
          </div>
        </div>
        <el-button type="primary" @click="goBack" size="large">
          <el-icon><Back /></el-icon>
          返回房间
        </el-button>
      </div>
    </div>

    <div class="game-container">
      <!-- 左侧：植物/僵尸选择栏 -->
      <div class="left-panel">
        <!-- 植物玩家选择栏 -->
        <div class="plants-sidebar" v-if="role === 'plant'">
          <h3>🌻 植物选择</h3>
          <div class="plant-slots">
            <div 
              class="plant-slot" 
              v-for="(config, type) in plantConfig" 
              :key="type"
              :class="{
                'selected': selectedPlant === type,
                'disabled': sunEnergy < config.cost
              }"
              @click="selectPlant(type)"
            >
              <span class="plant-icon">{{ config.icon }}</span>
              <span class="plant-name">{{ getPlantName(type) }}</span>
              <span class="plant-cost">{{ config.cost }}</span>
            </div>
          </div>
          <div class="energy-display">
            <span class="energy-label">☀️ 阳光</span>
            <span class="energy-value">{{ sunEnergy }}</span>
          </div>
        </div>

        <!-- 僵尸玩家选择栏 -->
        <div class="zombies-sidebar" v-if="role === 'zombie'">
          <h3>🧟 僵尸选择</h3>
          <div class="zombie-slots">
            <div 
              class="zombie-slot" 
              v-for="(config, type) in zombieConfig" 
              :key="type"
              :class="{
                'selected': selectedZombie === type,
                'disabled': zombieEnergy < config.cost
              }"
              @click="selectZombie(type)"
            >
              <span class="zombie-icon">{{ config.icon }}</span>
              <span class="zombie-name">{{ getZombieName(type) }}</span>
              <span class="zombie-cost">{{ config.cost }}</span>
            </div>
          </div>
          <div class="energy-display">
            <span class="energy-label">⚡ 能量</span>
            <span class="energy-value">{{ zombieEnergy }}</span>
          </div>
        </div>
      </div>

      <!-- 中间：游戏画布 -->
      <div class="game-canvas">
        <canvas ref="gameCanvas" @click="handleCanvasClick"></canvas>
      </div>

      <!-- 右侧：信息面板 -->
      <div class="info-panel">
        <!-- 游戏信息 -->
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
          <el-tag 
            :type="getStatusType(connectionStatus)" 
            size="small"
            effect="dark"
          >
            {{ connectionStatus }}
          </el-tag>
        </div>
        <div class="info-item">
          <span class="info-label">延迟</span>
          <span class="info-value">{{ latency }}ms</span>
        </div>
        
        <!-- 系统操作 -->
        <div class="system-buttons">
          <el-button
            type="warning"
            @click="sendGameStateUpdate"
            :icon="Refresh"
            class="system-btn"
            size="small"
          >
            同步状态
          </el-button>
          <el-button
            type="danger"
            @click="declareGameOver"
            :icon="Warning"
            class="system-btn"
            size="small"
          >
            结束游戏
          </el-button>
          <el-button
            type="primary"
            @click="goBack"
            :icon="Back"
            class="system-btn"
            size="small"
          >
            返回房间
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  House,
  Sunny,
  Moon,
  Connection,
  Back,
  Refresh,
  DocumentDelete,
  Loading,
  Timer,
  Lightning,
  Warning
} from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { MultiplayerEngine } from '../pvz/multiplayerEngine.js'
import { gameConfig } from '../pvz/config.js'

const router = useRouter()
const route = useRoute()

const roomId = ref(route.params.roomId)
const userId = ref(route.params.userId || localStorage.getItem('username'))
const fromSelection = ref(route.query.from_selection === '1')
const role = ref('')
const connectionStatus = ref('连接中...')
const messages = ref([])
const gameState = ref(null)
const logContainer = ref(null)
const latency = ref(0)

// 植物玩家状态
const sunEnergy = ref(150)
const selectedPlant = ref(null)
const plants = ref([])
const fallingSuns = ref([])
const selectedPlantsList = ref([]) // 从选择界面传递的植物列表

// 僵尸玩家状态
const zombieEnergy = ref(200)
const selectedZombie = ref(null)
const zombies = ref([])
const selectedZombiesList = ref([]) // 从选择界面传递的僵尸列表

let ws = null
let pingInterval = null
let sunGenerationInterval = null
let zombieEnergyInterval = null

const plantConfig = {
  sunflower: { cost: 50, icon: '🌻', hp: 300 },
  peashooter: { cost: 100, icon: '🔫', hp: 300 },
  wallnut: { cost: 50, icon: '🌰', hp: 1000 },
  cherrybomb: { cost: 150, icon: '🍒', hp: 300 }
}

const zombieConfig = {
  basic: { cost: 50, icon: '🧟', hp: 200, speed: 1 },
  conehead: { cost: 75, icon: '🎩', hp: 400, speed: 1 },
  buckethead: { cost: 125, icon: '🪣', hp: 600, speed: 1 },
  football: { cost: 175, icon: '🏈', hp: 500, speed: 2 }
}

const connectWebSocket = () => {
  const wsUrl = `ws://localhost:8000/api/ws/pvz/room/${roomId.value}?user_id=${userId.value}`
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    connectionStatus.value = '已连接'
    addMessage('system', { message: '已连接到服务器' })
  }

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    addMessage(message.type, message.payload)
    
    switch (message.type) {
      case 'event.connected':
        role.value = message.payload.role
        if (role.value === 'plant') {
          sunEnergy.value = 150
        } else {
          zombieEnergy.value = 200
        }

        if (!fromSelection.value) {
          // 连接成功后跳转到选择界面
          setTimeout(() => {
            redirectToSelection()
          }, 500)
        }
        break
        
      case 'event.need_selection':
        // 需要先进行选择，跳转到选择界面
        if (!fromSelection.value) {
          redirectToSelection()
        }
        break
        
      case 'event.game_start':
        connectionStatus.value = '游戏中'
        gameState.value = { status: 'playing', startTime: Date.now() }
        
        // 接收选择信息
        if (message.payload.plant_selection) {
          selectedPlantsList.value = message.payload.plant_selection
          console.log('收到植物选择:', selectedPlantsList.value)
        }
        if (message.payload.zombie_selection) {
          selectedZombiesList.value = message.payload.zombie_selection
          console.log('收到僵尸选择:', selectedZombiesList.value)
        }
        
        ElMessage.success('游戏开始！')
        
        // 开始资源生成
        if (role.value === 'plant') {
          startSunGeneration()
        } else if (role.value === 'zombie') {
          startZombieEnergyGeneration()
        }
        break
        
      case 'event.game_over':
        connectionStatus.value = '游戏结束'
        const winner = message.payload.winner
        const winnerText = winner === 'plant' ? '植物' : '僵尸'
        ElMessage.success(`游戏结束！${winnerText}获胜！`)
        break
        
      case 'state.snapshot':
      case 'state.sync':
        gameState.value = message.payload.game_state || message.payload
        updateGameStateFromSync(message.payload)
        break
        
      case 'plant_place_sunflower':
      case 'plant_place_peashooter':
      case 'plant_place_wallnut':
      case 'plant_place_cherrybomb':
        if (role.value === 'zombie') {
          handlePlantAction(message)
        }
        break
        
      case 'zombie_spawn_basic':
      case 'zombie_spawn_conehead':
      case 'zombie_spawn_buckethead':
      case 'zombie_spawn_football':
        if (role.value === 'plant') {
          handleZombieAction(message)
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
    addMessage('error', { message: 'WebSocket连接错误' })
  }

  ws.onclose = () => {
    connectionStatus.value = '已断开'
    addMessage('system', { message: '连接已关闭' })
    stopResourceGeneration()
  }
}

// 跳转到选择界面
const redirectToSelection = () => {
  if (role.value === 'plant') {
    // 植物玩家跳转到植物选择界面
    router.push({
      name: 'PlantSelection',
      query: {
        room_id: roomId.value,
        user_id: userId.value,
        mode: 'multiplayer'
      }
    })
  } else if (role.value === 'zombie') {
    // 僵尸玩家跳转到僵尸选择界面
    router.push({
      name: 'ZombieSelection',
      params: {
        roomId: roomId.value,
        userId: userId.value
      }
    })
  }
}

const updateGameStateFromSync = (payload) => {
  if (payload.sun_energy !== undefined) {
    sunEnergy.value = payload.sun_energy
  }
  if (payload.zombie_energy !== undefined) {
    zombieEnergy.value = payload.zombie_energy
  }
  if (payload.plants) {
    plants.value = payload.plants
  }
  if (payload.zombies) {
    zombies.value = payload.zombies
  }
}

const startSunGeneration = () => {
  sunGenerationInterval = setInterval(() => {
    if (sunEnergy.value < 1000) {
      sunEnergy.value += 10
      // 生成掉落的阳光
      const sun = {
        id: Date.now(),
        x: 50 + Math.random() * 600,
        y: 50 + Math.random() * 300
      }
      fallingSuns.value.push(sun)
      
      // 5秒后消失
      setTimeout(() => {
        fallingSuns.value = fallingSuns.value.filter(s => s.id !== sun.id)
      }, 5000)
    }
  }, 2000) // 每2秒增加阳光
}

const startZombieEnergyGeneration = () => {
  zombieEnergyInterval = setInterval(() => {
    if (zombieEnergy.value < 1000) {
      zombieEnergy.value += 15
    }
  }, 3000) // 每3秒增加能量
}

const stopResourceGeneration = () => {
  if (sunGenerationInterval) {
    clearInterval(sunGenerationInterval)
    sunGenerationInterval = null
  }
  if (zombieEnergyInterval) {
    clearInterval(zombieEnergyInterval)
    zombieEnergyInterval = null
  }
}

const selectPlant = (plantType) => {
  selectedPlant.value = plantType
}

const selectZombie = (zombieType) => {
  selectedZombie.value = zombieType
}

const getCellPlant = (row, col) => {
  return plants.value.find(p => p.row === row && p.col === col)
}

const canPlacePlant = (row, col) => {
  return !getCellPlant(row, col) && selectedPlant.value
}

const getPlantIcon = (plant) => {
  const type = plant.type
  return plantConfig[type] ? plantConfig[type].icon : '🌱'
}

const getZombieIcon = (type) => {
  return zombieConfig[type] ? zombieConfig[type].icon : '🧟'
}

const getPlantName = (type) => {
  const nameMap = {
    sunflower: '向日葵',
    peashooter: '豌豆射手',
    wallnut: '坚果墙',
    cherrybomb: '樱桃炸弹'
  }
  return nameMap[type] || type
}

const getZombieName = (type) => {
  const nameMap = {
    basic: '普通僵尸',
    conehead: '路障僵尸',
    buckethead: '铁桶僵尸',
    football: '橄榄球僵尸'
  }
  return nameMap[type] || type
}

const handleCanvasClick = (event) => {
  const canvas = event.target
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // 计算网格位置
  const cellWidth = 80 // 网格宽度
  const cellHeight = 100 // 网格高度
  const col = Math.floor(x / cellWidth)
  const row = Math.floor(y / cellHeight)
  
  if (role.value === 'plant' && selectedPlant.value) {
    // 植物玩家：种植植物
    if (col >= 0 && col < 9 && row >= 0 && row < 5) {
      placePlant(row, col)
    }
  } else if (role.value === 'zombie' && selectedZombie.value) {
    // 僵尸玩家：在对应行生成僵尸
    if (row >= 0 && row < 5) {
      spawnZombie(row)
    }
  }
}

const placePlant = (row, col) => {
  if (!selectedPlant.value) {
    ElMessage.warning('请先选择植物')
    return
  }
  
  const plantType = selectedPlant.value
  const config = plantConfig[plantType]
  
  if (sunEnergy.value < config.cost) {
    ElMessage.warning('阳光不足')
    return
  }
  
  if (getCellPlant(row, col)) {
    ElMessage.warning('该位置已有植物')
    return
  }
  
  // 扣除阳光
  sunEnergy.value -= config.cost
  
  // 发送操作
  const message = {
    type: `plant_place_${plantType}`,
    payload: {
      row,
      col,
      plant_type: plantType,
      cost: config.cost
    }
  }
  
  ws.send(JSON.stringify(message))
  addMessage('send', { message: `在(${row}, ${col})种植${config.icon}` })
  
  // 本地乐观更新
  plants.value.push({
    id: Date.now(),
    type: plantType,
    row,
    col,
    hp: config.hp
  })
}

const spawnZombie = (lane) => {
  if (!selectedZombie.value) {
    ElMessage.warning('请先选择僵尸')
    return
  }
  
  const zombieType = selectedZombie.value
  const config = zombieConfig[zombieType]
  
  if (zombieEnergy.value < config.cost) {
    ElMessage.warning('能量不足')
    return
  }
  
  // 扣除能量
  zombieEnergy.value -= config.cost
  
  // 发送操作
  const message = {
    type: `zombie_spawn_${zombieType}`,
    payload: {
      lane,
      zombie_type: zombieType,
      cost: config.cost
    }
  }
  
  ws.send(JSON.stringify(message))
  addMessage('send', { message: `在第${lane}行生成${config.icon}` })
  
  // 本地乐观更新
  zombies.value.push({
    id: Date.now(),
    type: zombieType,
    lane,
    x: 800, // 从右侧开始
    y: 50 + lane * 80,
    hp: config.hp,
    speed: config.speed
  })
}

const collectSun = (sunId) => {
  const sunIndex = fallingSuns.value.findIndex(s => s.id === sunId)
  if (sunIndex > -1) {
    fallingSuns.value.splice(sunIndex, 1)
    sunEnergy.value += 25
    
    // 发送操作
    const message = {
      type: 'plant_collect_sun',
      payload: {
        sun_id: sunId
      }
    }
    ws.send(JSON.stringify(message))
    addMessage('send', { message: '收集阳光' })
  }
}

const handlePlantAction = (message) => {
  const payload = message.payload
  const plantType = payload.plant_type
  const config = plantConfig[plantType]
  
  plants.value.push({
    id: Date.now(),
    type: plantType,
    row: payload.row,
    col: payload.col,
    hp: config ? config.hp : 300
  })
  
  ElMessage.info(`对手机种植了${config ? config.icon : '🌱'}`)
}

const handleZombieAction = (message) => {
  const payload = message.payload
  const zombieType = payload.zombie_type
  const config = zombieConfig[zombieType]
  
  zombies.value.push({
    id: Date.now(),
    type: zombieType,
    lane: payload.lane,
    x: 800,
    y: 50 + payload.lane * 80,
    hp: config ? config.hp : 200,
    speed: config ? config.speed : 1
  })
  
  ElMessage.warning(`对手机在第${payload.lane}行生成了${config ? config.icon : '🧟'}`)
}

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

  const message = {
    type: 'game_state_update',
    payload: state
  }

  ws.send(JSON.stringify(message))
  addMessage('send', { message: '同步游戏状态' })
}

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
    const message = {
      type: 'game_over',
      payload: {
        winner: winner,
        reason: `${role.value}玩家宣布结束游戏`
      }
    }
    
    ws.send(JSON.stringify(message))
    addMessage('send', { message: `宣布游戏结束，${winner}获胜` })
  } catch {
    // 用户取消
  }
}

const goBack = () => {
  stopResourceGeneration()
  if (ws) {
    ws.close()
  }
  router.push({ name: 'PvZMultiplayerRoom' })
}

const getStatusType = (status) => {
  const typeMap = {
    '已连接': 'success',
    '游戏中': 'success',
    '连接中...': 'warning',
    '连接错误': 'danger',
    '已断开': 'danger'
  }
  return typeMap[status] || 'info'
}

const getMessageType = (type) => {
  const typeMap = {
    'event': 'success',
    'send': 'info',
    'error': 'danger',
    'system': 'info'
  }
  return typeMap[type] || 'info'
}

const formatMessage = (payload) => {
  if (typeof payload === 'string') return payload
  if (payload.message) return payload.message
  return JSON.stringify(payload)
}

const formatJSON = (obj) => {
  return JSON.stringify(obj, null, 2)
}

const addMessage = (type, payload) => {
  const timestamp = new Date().toLocaleTimeString('zh-CN', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  messages.value.push({ type, payload, timestamp })
  
  if (messages.value.length > 100) {
    messages.value = messages.value.slice(-100)
  }
  
  scrollToBottom()
}

const scrollToBottom = () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

onMounted(() => {
  connectWebSocket()
  
  pingInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        payload: { timestamp: Date.now() }
      }))
    }
  }, 10000)
})

onUnmounted(() => {
  stopResourceGeneration()
  if (pingInterval) {
    clearInterval(pingInterval)
  }
  if (ws) {
    ws.close()
  }
})
</script>

<style scoped>
.multiplayer-game-container {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 顶部标题栏 */
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

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
  width: 100%;
  justify-content: space-between;
}

.header-left h1 {
  margin: 0;
  font-size: 2rem;
  background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.game-info {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.info-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: white;
}

/* 游戏容器 */
.game-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

/* 左侧面板 */
.left-panel {
  width: 200px;
}

/* 植物选择栏 */
.plants-sidebar {
  height: calc(100vh - 200px);
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
  height: calc(100vh - 200px);
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

/* 能量显示 */
.energy-display {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  text-align: center;
}

.energy-label {
  display: block;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.energy-value {
  display: block;
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
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
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  border-radius: 8px;
}

/* 信息面板 */
.info-panel {
  width: 200px;
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
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  text-align: center;
}

/* 系统按钮 */
.system-buttons {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.system-btn {
  width: 100%;
  font-size: 0.9rem;
  font-weight: 600;
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

/* 响应式设计 */
@media (max-width: 1024px) {
  .game-container {
    flex-direction: column;
  }

  .left-panel,
  .info-panel {
    width: 100%;
  }

  .plants-sidebar,
  .zombies-sidebar {
    height: auto;
    max-height: 200px;
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
  .multiplayer-game-container {
    padding: 10px;
  }

  .game-header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  .header-content {
    flex-direction: column;
    gap: 16px;
  }

  .header-left h1 {
    font-size: 1.5rem;
    text-align: center;
  }

  .game-info {
    justify-content: center;
  }

  .game-canvas {
    overflow-x: auto;
  }
}
</style>
