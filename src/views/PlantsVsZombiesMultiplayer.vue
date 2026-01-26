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

    <div class="main-content">
      <!-- 左侧：游戏控制面板 -->
      <div class="left-panel">
        <!-- 植物玩家操作卡片 -->
        <el-card class="control-card plant-card" v-if="role === 'plant'">
          <template #header>
            <div class="card-header">
              <span>🌻 植物玩家操作</span>
              <div class="stats">
                <div class="stat-item">
                  <el-icon><Sunny /></el-icon>
                  <span>阳光: {{ sunEnergy }}</span>
                </div>
              </div>
            </div>
          </template>
          
          <div class="plant-actions">
            <div class="action-section">
              <h3>选择植物</h3>
              <div class="button-grid">
                <button 
                  @click="selectPlant('sunflower')" 
                  class="action-btn sunflower-btn"
                  :class="{ active: selectedPlant === 'sunflower' }"
                >
                  <div class="btn-icon">🌻</div>
                  <div class="btn-text">向日葵</div>
                  <div class="btn-desc">生产阳光</div>
                  <div class="btn-cost">阳光: 50</div>
                </button>
                <button 
                  @click="selectPlant('peashooter')" 
                  class="action-btn peashooter-btn"
                  :class="{ active: selectedPlant === 'peashooter' }"
                >
                  <div class="btn-icon">🔫</div>
                  <div class="btn-text">豌豆射手</div>
                  <div class="btn-desc">远程攻击</div>
                  <div class="btn-cost">阳光: 100</div>
                </button>
                <button 
                  @click="selectPlant('wallnut')" 
                  class="action-btn wallnut-btn"
                  :class="{ active: selectedPlant === 'wallnut' }"
                >
                  <div class="btn-icon">🌰</div>
                  <div class="btn-text">坚果墙</div>
                  <div class="btn-desc">防御单位</div>
                  <div class="btn-cost">阳光: 50</div>
                </button>
                <button 
                  @click="selectPlant('cherrybomb')" 
                  class="action-btn cherrybomb-btn"
                  :class="{ active: selectedPlant === 'cherrybomb' }"
                >
                  <div class="btn-icon">🍒</div>
                  <div class="btn-text">樱桃炸弹</div>
                  <div class="btn-desc">爆炸攻击</div>
                  <div class="btn-cost">阳光: 150</div>
                </button>
              </div>
            </div>
            
            <div class="action-section">
              <h3>游戏棋盘 (点击放置)</h3>
              <div class="game-board">
                <div 
                  v-for="(row, rowIndex) in 5" 
                  :key="'row-' + rowIndex"
                  class="board-row"
                >
                  <div 
                    v-for="(col, colIndex) in 9" 
                    :key="'cell-' + rowIndex + '-' + colIndex"
                    @click="placePlant(rowIndex, colIndex)"
                    class="board-cell"
                    :class="{ 
                      'has-plant': getCellPlant(rowIndex, colIndex),
                      'can-place': canPlacePlant(rowIndex, colIndex)
                    }"
                  >
                    <div v-if="getCellPlant(rowIndex, colIndex)" class="plant-display">
                      {{ getPlantIcon(getCellPlant(rowIndex, colIndex)) }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="action-section">
              <h3>收集阳光</h3>
              <div class="suns-container">
                <div 
                  v-for="(sun, index) in fallingSuns" 
                  :key="sun.id"
                  @click="collectSun(sun.id)"
                  class="sun-item"
                  :style="{ left: sun.x + 'px', top: sun.y + 'px' }"
                >
                  ☀️
                </div>
                <div v-if="fallingSuns.length === 0" class="no-sun">
                  暂无阳光可收集
                </div>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 僵尸玩家操作卡片 -->
        <el-card class="control-card zombie-card" v-if="role === 'zombie'">
          <template #header>
            <div class="card-header">
              <span>🧟 僵尸玩家操作</span>
              <div class="stats">
                <div class="stat-item">
                  <el-icon><Lightning /></el-icon>
                  <span>能量: {{ zombieEnergy }}</span>
                </div>
              </div>
            </div>
          </template>
          
          <div class="zombie-actions">
            <div class="action-section">
              <h3>选择僵尸</h3>
              <div class="button-grid">
                <button 
                  @click="selectZombie('basic')" 
                  class="action-btn basic-zombie-btn"
                  :class="{ active: selectedZombie === 'basic' }"
                >
                  <div class="btn-icon">🧟</div>
                  <div class="btn-text">普通僵尸</div>
                  <div class="btn-desc">基础单位</div>
                  <div class="btn-cost">能量: 50</div>
                </button>
                <button 
                  @click="selectZombie('conehead')" 
                  class="action-btn conehead-btn"
                  :class="{ active: selectedZombie === 'conehead' }"
                >
                  <div class="btn-icon">🎩</div>
                  <div class="btn-text">路障僵尸</div>
                  <div class="btn-desc">防御强化</div>
                  <div class="btn-cost">能量: 75</div>
                </button>
                <button 
                  @click="selectZombie('buckethead')" 
                  class="action-btn buckethead-btn"
                  :class="{ active: selectedZombie === 'buckethead' }"
                >
                  <div class="btn-icon">🪣</div>
                  <div class="btn-text">铁桶僵尸</div>
                  <div class="btn-desc">超强防御</div>
                  <div class="btn-cost">能量: 125</div>
                </button>
                <button 
                  @click="selectZombie('football')" 
                  class="action-btn football-btn"
                  :class="{ active: selectedZombie === 'football' }"
                >
                  <div class="btn-icon">🏈</div>
                  <div class="btn-text">橄榄球僵尸</div>
                  <div class="btn-desc">快速移动</div>
                  <div class="btn-cost">能量: 175</div>
                </button>
              </div>
            </div>
            
            <div class="action-section">
              <h3>生成位置 (选择行)</h3>
              <div class="lane-selector">
                <button 
                  v-for="lane in 5" 
                  :key="lane"
                  @click="spawnZombie(lane - 1)"
                  class="lane-btn"
                  :disabled="!selectedZombie"
                >
                  第 {{ lane }} 行
                  <span v-if="selectedZombie" class="zombie-preview">
                    {{ getZombieIcon(selectedZombie) }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 系统操作卡片 -->
        <el-card class="control-card system-card">
          <template #header>
            <div class="card-header">
              <span>⚙️ 系统操作</span>
            </div>
          </template>
          <div class="system-buttons">
            <el-button 
              type="warning" 
              @click="sendGameStateUpdate" 
              :icon="Refresh"
              class="system-btn"
            >
              同步游戏状态
            </el-button>
            <el-button 
              type="danger" 
              @click="declareGameOver" 
              :icon="Warning"
              class="system-btn"
            >
              结束游戏
            </el-button>
          </div>
        </el-card>
      </div>

      <!-- 右侧：游戏信息面板 -->
      <div class="right-panel">
        <!-- 游戏日志 -->
        <el-card class="log-card">
          <template #header>
            <div class="card-header">
              <span>📜 游戏日志</span>
              <el-badge :value="messages.length" :max="99" class="badge"></el-badge>
            </div>
          </template>
          <div class="log-container" ref="logContainer">
            <transition-group name="list" tag="div">
              <div 
                v-for="(msg, index) in messages" 
                :key="msg.timestamp + index" 
                class="log-item"
                :class="msg.type"
              >
                <div class="log-header">
                  <span class="log-time">{{ msg.timestamp }}</span>
                  <el-tag :type="getMessageType(msg.type)" size="small" effect="plain">
                    {{ msg.type }}
                  </el-tag>
                </div>
                <div class="log-content">
                  {{ formatMessage(msg.payload) }}
                </div>
              </div>
            </transition-group>
            <div v-if="messages.length === 0" class="empty-log">
              <el-icon :size="48"><DocumentDelete /></el-icon>
              <p>暂无游戏日志</p>
            </div>
          </div>
        </el-card>

        <!-- 游戏状态 -->
        <el-card class="state-card">
          <template #header>
            <div class="card-header">
              <span>🎮 游戏状态</span>
            </div>
          </template>
          <div class="state-content">
            <div v-if="gameState" class="state-display">
              <pre class="state-json">{{ formatJSON(gameState) }}</pre>
            </div>
            <div v-else class="empty-state">
              <el-icon :size="48"><Loading /></el-icon>
              <p>等待游戏开始...</p>
              <p class="hint">请等待另一位玩家加入房间</p>
            </div>
          </div>
        </el-card>
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

const router = useRouter()
const route = useRoute()

const roomId = ref(route.params.roomId)
const userId = ref(route.params.userId || localStorage.getItem('username'))
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

// 僵尸玩家状态
const zombieEnergy = ref(200)
const selectedZombie = ref(null)
const zombies = ref([])

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
    
    // 开始资源生成
    if (role.value === 'plant') {
      startSunGeneration()
    } else if (role.value === 'zombie') {
      startZombieEnergyGeneration()
    }
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
        break
        
      case 'event.game_start':
        connectionStatus.value = '游戏中'
        gameState.value = { status: 'playing', startTime: Date.now() }
        ElMessage.success('游戏开始！')
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

/* 顶部标题栏 */
.game-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1600px;
  margin: 0 auto;
}

.header-left h1 {
  margin: 0 0 12px 0;
  font-size: 28px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
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
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.info-badge .el-icon {
  font-size: 18px;
}

/* 主内容区域 */
.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

/* 卡片样式 */
.control-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: none;
  margin-bottom: 24px;
}

.control-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 16px;
  font-weight: 600;
  font-size: 14px;
}

/* 植物卡片 */
.plant-card {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.plant-card .card-header {
  color: #2d5a4d;
}

/* 僵尸卡片 */
.zombie-card {
  background: linear-gradient(135deg, #d4a5a5 0%, #9b59b6 100%);
}

.zombie-card .card-header {
  color: #4a2d5d;
}

/* 系统卡片 */
.system-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.system-card .card-header {
  color: white;
}

/* 操作区域 */
.action-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.3);
}

.action-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.action-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 按钮网格 */
.button-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  padding: 16px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-btn:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.action-btn:active {
  transform: translateY(-2px) scale(0.98);
}

.action-btn.active {
  border-color: #667eea;
  box-shadow: 0 0 20px rgba(102, 126, 234, 0.5);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 32px;
}

.btn-text {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.btn-desc {
  font-size: 12px;
  color: #666;
}

.btn-cost {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.sunflower-btn {
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  border-color: #f39c12;
}

.peashooter-btn {
  background: linear-gradient(135deg, #55efc4 0%, #00b894 100%);
  border-color: #00b894;
  color: white;
}

.peashooter-btn .btn-text {
  color: white;
}

.wallnut-btn {
  background: linear-gradient(135deg, #dfe6e9 0%, #b2bec3 100%);
  border-color: #636e72;
}

.cherrybomb-btn {
  background: linear-gradient(135deg, #e17055 0%, #d63031 100%);
  border-color: #d63031;
  color: white;
}

.cherrybomb-btn .btn-text {
  color: white;
}

.basic-zombie-btn {
  background: linear-gradient(135deg, #dfe6e9 0%, #b2bec3 100%);
  border-color: #636e72;
}

.conehead-btn {
  background: linear-gradient(135deg, #a29bfe 0%, #6c5ce7 100%);
  border-color: #6c5ce7;
  color: white;
}

.conehead-btn .btn-text {
  color: white;
}

.buckethead-btn {
  background: linear-gradient(135deg, #b2bec3 0%, #636e72 100%);
  border-color: #2d3436;
  color: white;
}

.buckethead-btn .btn-text {
  color: white;
}

.football-btn {
  background: linear-gradient(135deg, #fd79a8 0%, #e84393 100%);
  border-color: #e84393;
  color: white;
}

.football-btn .btn-text {
  color: white;
}

/* 游戏棋盘 */
.game-board {
  background: linear-gradient(135deg, #74b9ff 0%, #0984e3 100%);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.board-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.board-row:last-child {
  margin-bottom: 0;
}

.board-cell {
  width: 60px;
  height: 72px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.board-cell:hover {
  background: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.board-cell.can-place:hover {
  border-color: #00b894;
}

.board-cell.has-plant {
  background: rgba(255, 255, 255, 0.7);
}

.plant-display {
  font-size: 40px;
}

/* 阳光收集 */
.suns-container {
  position: relative;
  min-height: 200px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  border-radius: 12px;
  padding: 16px;
}

.sun-item {
  position: absolute;
  font-size: 32px;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: sunFloat 3s ease-in-out infinite;
  user-select: none;
}

.sun-item:hover {
  transform: scale(1.3);
  filter: drop-shadow(0 0 10px rgba(255, 215, 0, 0.8));
}

@keyframes sunFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-10px) rotate(180deg);
  }
}

.no-sun {
  text-align: center;
  color: #666;
  padding: 40px;
  font-size: 14px;
}

/* 行选择器 */
.lane-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lane-btn {
  padding: 16px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.lane-btn:hover:not(:disabled) {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  background: linear-gradient(135deg, #d4a5a5 0%, #9b59b6 100%);
  color: white;
}

.lane-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zombie-preview {
  font-size: 24px;
}

/* 系统按钮 */
.system-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.system-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

/* 右侧面板 */
.right-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.log-card,
.state-card {
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: none;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.badge {
  margin-left: 8px;
}

/* 日志容器 */
.log-container {
  height: 400px;
  overflow-y: auto;
  padding: 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  scrollbar-width: thin;
  scrollbar-color: #667eea #f0f0f0;
}

.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 3px;
}

.log-container::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
}

.log-item {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.log-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.log-item.event {
  border-left: 3px solid #28a745;
}

.log-item.send {
  border-left: 3px solid #007bff;
}

.log-item.error {
  border-left: 3px solid #dc3545;
  background: #ffebeb;
}

.log-item.system {
  border-left: 3px solid #6c757d;
  font-style: italic;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-time {
  font-size: 12px;
  color: #999;
  font-weight: 500;
}

.log-content {
  font-size: 14px;
  color: #333;
  line-height: 1.5;
  word-break: break-word;
}

.empty-log {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.empty-log p {
  margin-top: 16px;
  font-size: 14px;
}

/* 状态显示 */
.state-content {
  height: 300px;
  overflow: auto;
}

.state-display {
  height: 100%;
}

.state-json {
  padding: 16px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  color: #333;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
}

.empty-state p {
  margin-top: 12px;
  font-size: 14px;
}

.empty-state .hint {
  font-size: 12px;
  margin-top: 8px;
  opacity: 0.8;
}

/* 列表动画 */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
  
  .left-panel {
    margin-bottom: 24px;
  }
  
  .button-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .multiplayer-game-container {
    padding: 12px;
  }
  
  .header-content {
    flex-direction: column;
    gap: 16px;
  }
  
  .game-info {
    justify-content: center;
  }
  
  .header-left h1 {
    font-size: 20px;
    text-align: center;
  }
  
  .info-badge {
    font-size: 12px;
    padding: 6px 12px;
  }
  
  .log-container {
    height: 300px;
  }
  
  .state-content {
    height: 200px;
  }
  
  .board-cell {
    width: 50px;
    height: 60px;
  }
  
  .plant-display {
    font-size: 32px;
  }
}
</style>
