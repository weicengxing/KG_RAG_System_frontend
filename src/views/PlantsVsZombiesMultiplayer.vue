<template>
  <div class="plants-vs-zombies-view">
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
      <div class="plants-sidebar" v-if="role === 'plant'">
        <h3>🌻 植物选择</h3>
        <button
          type="button"
          :class="['shovel-btn', { 'shovel-active': isShovelMode }]"
          @click="toggleShovelMode"
        >
          {{ isShovelMode ? '铲除模式' : '铲子' }}
        </button>
        <div class="plant-slots">
          <div
            v-for="plant in plantOptions"
            :key="plant.id"
            class="plant-slot"
            :class="{
              selected: selectedPlant === plant.id,
              disabled: sunEnergy < plant.cost || isPlantCoolingDown(plant.id)
            }"
            @click="selectPlant(plant.id)"
          >
            <span class="plant-icon">{{ plant.icon }}</span>
            <span class="plant-name">{{ plant.name }}</span>
            <span class="plant-cost">{{ plant.cost }}</span>
            <div v-if="isPlantCoolingDown(plant.id)" class="cooldown-overlay">
              <span class="cooldown-text">{{ getPlantCooldown(plant.id) }}s</span>
            </div>
          </div>
        </div>
      </div>

      <div class="zombies-sidebar" v-if="role === 'zombie'">
        <h3>🧟 僵尸选择</h3>
        <div class="zombie-slots">
          <div
            v-for="zombie in zombieOptions"
            :key="zombie.rawId"
            class="zombie-slot"
            :class="{
              selected: selectedZombie === zombie.rawId,
              disabled: zombieEnergy < zombie.cost
            }"
            @click="selectZombie(zombie.rawId)"
          >
            <span class="zombie-icon">
              <PvZBucketIcon v-if="zombie.id === 'buckethead'" />
              <template v-else>{{ zombie.icon }}</template>
            </span>
            <span class="zombie-name">{{ zombie.name }}</span>
            <span class="zombie-cost">{{ zombie.cost }}</span>
          </div>
        </div>
      </div>

      <div class="game-canvas">
        <canvas ref="gameCanvas" @click="handleCanvasClick"></canvas>
      </div>

      <div class="info-panel">
        <div class="panel-content">
          <div class="panel-header">
            <h3>{{ role === 'plant' ? '植物阵营' : '僵尸阵营' }}</h3>
            <div class="resource-info">
              <span v-if="role === 'plant'">☀️ 阳光: {{ sunEnergy }}</span>
              <span v-if="role === 'zombie'">🧠 能量: {{ zombieEnergy }}</span>
            </div>
          </div>

          <div class="info-item">
            <span class="info-label">房间</span>
            <span class="info-value room-code" :title="roomId">{{ roomId }}</span>
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

    <div class="game-instructions">
      <h3>游戏说明</h3>
      <p>1. 植物方现在是权威端，完整运行单人版战斗逻辑。</p>
      <p>2. 僵尸方只负责选怪和出怪，战场结果由植物方快照同步。</p>
      <p>3. 所有植物攻击、子弹命中、减速和爆炸都以植物方结果为准。</p>
      <p>4. 如果画面有延迟，可以手动点击“同步状态”强制刷新一次。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { MultiplayerGameEngine } from '../pvz/multiplayerEngine.js'
import { plantConfig, zombieConfig, gameConfig } from '../pvz/config.js'
import { loadPvzRuntimeConfig } from '../pvz/configOverrides.js'
import { buildWsUrl } from '../config.js'
import PvZBucketIcon from '../components/PvZBucketIcon.vue'

const router = useRouter()
const route = useRoute()

let gameEngine = null
let pingInterval = null
let syncEngineStateInterval = null
let ws = null
let reportedGameOver = false
let authoritySyncInterval = null
const PANEL_SYNC_INTERVAL_MS = 100
const AUTHORITY_SYNC_INTERVAL_MS = 33

const roomId = ref(route.params.roomId)
const userId = ref(route.params.userId || localStorage.getItem('username'))
const fromSelection = ref(route.query.from_selection === '1')
const role = ref('')
const connectionStatus = ref('连接中...')
const latency = ref(0)
const gameCanvas = ref(null)

const getInitialSunEnergy = () => gameConfig.multiplayer?.initialSunEnergy ?? 10000
const getInitialZombieEnergy = () => gameConfig.multiplayer?.initialZombieEnergy ?? 10000

const sunEnergy = ref(getInitialSunEnergy())
const selectedPlant = ref(null)
const selectedPlantsList = ref([])
const plantCooldowns = ref({})
const isShovelMode = ref(false)

const zombieEnergy = ref(getInitialZombieEnergy())
const selectedZombie = ref(null)
const selectedZombiesList = ref([])
const pvzConfigVersion = ref(0)

// Engine entity arrays are owned by `gameEngine` directly. We don't mirror
// them into Vue refs — see syncEngineState comment.

const zombieTypeAlias = {
  basic: 'normal'
}

const plantIdAlias = {
  wallnut: 'nutWall',
  cherrybomb: 'cherryBomb'
}

const isAuthority = computed(() => role.value === 'plant')

const plantOptions = computed(() => {
  pvzConfigVersion.value
  return selectedPlantsList.value
    .map((rawId) => {
      const id = plantIdAlias[rawId] || rawId
      return { id, ...plantConfig[id] }
    })
    .filter((item) => item && item.id)
})

const zombieOptions = computed(() => {
  pvzConfigVersion.value
  return selectedZombiesList.value
    .map((rawId) => {
      const id = zombieTypeAlias[rawId] || rawId
      const base = zombieConfig[id]
      if (!base) return null
      return {
        ...base,
        rawId,
        cost: base.cost || 50
      }
    })
    .filter((item) => item && item.rawId)
})

const applySelectionsFromQuery = () => {
  const plantSelection = route.query.plant_selection
  if (plantSelection && selectedPlantsList.value.length === 0) {
    const raw = Array.isArray(plantSelection) ? plantSelection.join(',') : plantSelection
    selectedPlantsList.value = raw.split(',').filter(Boolean)
  }

  const zombieSelection = route.query.zombie_selection
  if (zombieSelection && selectedZombiesList.value.length === 0) {
    const raw = Array.isArray(zombieSelection) ? zombieSelection.join(',') : zombieSelection
    selectedZombiesList.value = raw.split(',').filter(Boolean)
  }
}

const syncEngineState = () => {
  if (!gameEngine) return

  // Only mirror the few fields the template actually reads (resource counters
  // + selection). Previously this also did `[...gameEngine.zombies]` etc, which
  // wrapped every entity in a Vue reactive Proxy on the zombie side. After the
  // wrap, every 60fps prediction tick wrote through Proxy traps — death by a
  // thousand cuts. The arrays are unused by the template, so just drop them.
  sunEnergy.value = gameEngine.sunEnergy
  zombieEnergy.value = gameEngine.zombieEnergy
  plantCooldowns.value = { ...gameEngine.plantCooldowns }
  isShovelMode.value = !!gameEngine.isShovelMode

  if (!gameEngine.selectedPlant) {
    selectedPlant.value = ''
  }
  if (!gameEngine.selectedZombie) {
    selectedZombie.value = ''
  }
}

const getPlantCooldown = (plantId) => {
  const cooldown = Number(plantCooldowns.value[plantId] || 0)
  return Math.max(0, cooldown).toFixed(1)
}

const isPlantCoolingDown = (plantId) => {
  return Number(plantCooldowns.value[plantId] || 0) > 0
}

const maybeBroadcastAuthorityState = () => {
  if (!gameEngine || !isAuthority.value) return

  gameEngine.syncRealtimeState()

  if (gameEngine.gameOver && !reportedGameOver && ws?.readyState === WebSocket.OPEN) {
    reportedGameOver = true
    ws.send(JSON.stringify({
      type: 'game_over',
      payload: gameEngine.gameOverPayload || {
        winner: 'zombie',
        loser: 'plant',
        reason: 'zombie_reached_home'
      }
    }))
  }
}

const collectAllSuns = () => {
  if (!gameEngine || !isAuthority.value) return
  gameEngine.toggleAutoCollectSun()
  syncEngineState()
  maybeBroadcastAuthorityState()
}

const ensureCanvasSize = async () => {
  await nextTick()
  if (!gameCanvas.value) return false

  const canvasWidth = gameConfig.gridCols * gameConfig.cellWidth
  const canvasHeight = gameConfig.gridRows * gameConfig.cellHeight
  gameCanvas.value.width = canvasWidth
  gameCanvas.value.height = canvasHeight
  return true
}

const initEngine = () => {
  if (!gameCanvas.value || !ws || ws.readyState !== WebSocket.OPEN) {
    ElMessage.error('游戏初始化条件未满足')
    return
  }

  const canvasWidth = gameConfig.gridCols * gameConfig.cellWidth
  const canvasHeight = gameConfig.gridRows * gameConfig.cellHeight

  gameCanvas.value.width = canvasWidth
  gameCanvas.value.height = canvasHeight

  gameEngine = new MultiplayerGameEngine(
    gameCanvas.value,
    canvasWidth,
    canvasHeight,
    ws,
    role.value
  )

  gameEngine.onGameOver = () => {
    maybeBroadcastAuthorityState()
  }

  gameEngine.start()
  reportedGameOver = false
  syncEngineState()

  if (syncEngineStateInterval) {
    clearInterval(syncEngineStateInterval)
  }

  syncEngineStateInterval = setInterval(() => {
    syncEngineState()
  }, PANEL_SYNC_INTERVAL_MS)

  if (authoritySyncInterval) {
    clearInterval(authoritySyncInterval)
    authoritySyncInterval = null
  }

  if (isAuthority.value) {
    authoritySyncInterval = setInterval(() => {
      if (!gameEngine || !isAuthority.value || gameEngine.gameOver || ws?.readyState !== WebSocket.OPEN) {
        if (authoritySyncInterval) {
          clearInterval(authoritySyncInterval)
          authoritySyncInterval = null
        }
        return
      }

      maybeBroadcastAuthorityState()
    }, AUTHORITY_SYNC_INTERVAL_MS)
  }

  if (isAuthority.value) {
    gameEngine.syncRealtimeState(true)
  }
}

const handleRealtimeGameMessage = (message) => {
  if (!gameEngine) return
  gameEngine.onServerMessage(message)
  syncEngineState()
}

const handleServerMessage = async (message) => {
  switch (message.type) {
    case 'event.connected':
      role.value = message.payload.role
      sunEnergy.value = getInitialSunEnergy()
      zombieEnergy.value = getInitialZombieEnergy()

      await ensureCanvasSize()

      if (message.payload.room_status === 'playing' && !gameEngine) {
        initEngine()
        connectionStatus.value = '游戏中'
      }

      if (!fromSelection.value) {
        setTimeout(() => {
          redirectToSelection()
        }, 500)
      }
      break

    case 'event.game_start':
      connectionStatus.value = '游戏中'

      if (message.payload.plant_selection && selectedPlantsList.value.length === 0) {
        selectedPlantsList.value = message.payload.plant_selection
      }
      if (message.payload.zombie_selection && selectedZombiesList.value.length === 0) {
        selectedZombiesList.value = message.payload.zombie_selection
      }

      await nextTick()
      initEngine()
      ElMessage.success('游戏开始！')
      break

    case 'event.game_over': {
      const winner = message.payload.winner
      const winnerText = winner === 'plant' ? '植物' : '僵尸'
      connectionStatus.value = '已结束'
      if (gameEngine) {
        gameEngine.gameOver = true
        gameEngine.isPlaying = false
      }
      ElMessage.success(`游戏结束，${winnerText}获胜`)
      if (message.payload.room_closed) {
        goBack()
      }
      break
    }

    case 'pong':
      latency.value = Date.now() - message.payload.timestamp
      break

    default:
      if (
        message.type === 'state.snapshot' ||
        message.type === 'state.sync' ||
        message.type === 'zombie_spawn_request' ||
        message.type.startsWith('zombie_spawn_') ||
        message.type.startsWith('plant_')
      ) {
        if (!gameEngine && (message.type === 'state.snapshot' || message.type === 'state.sync')) {
          await ensureCanvasSize()
          initEngine()
        }
        handleRealtimeGameMessage(message)
      }
      break
  }
}

const initWebSocket = () => {
  const wsUrl = buildWsUrl(`/api/ws/pvz/room/${roomId.value}?user_id=${userId.value}`)
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    connectionStatus.value = '已连接'
  }

  ws.onmessage = async (event) => {
    const message = JSON.parse(event.data)
    await handleServerMessage(message)
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
    if (authoritySyncInterval) {
      clearInterval(authoritySyncInterval)
      authoritySyncInterval = null
    }
  }
}

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

const selectPlant = (plantType) => {
  if (isPlantCoolingDown(plantType)) {
    ElMessage.warning('植物冷却中')
    return
  }

  if (!gameEngine || !isAuthority.value) {
    selectedPlant.value = plantType
    isShovelMode.value = false
    return
  }

  if (gameEngine.selectPlant(plantType)) {
    selectedPlant.value = plantType
    isShovelMode.value = false
    gameEngine.isShovelMode = false
  }
}

const toggleShovelMode = () => {
  if (!gameEngine || !isAuthority.value) return

  isShovelMode.value = !isShovelMode.value
  gameEngine.isShovelMode = isShovelMode.value

  if (isShovelMode.value) {
    selectedPlant.value = ''
    gameEngine.selectedPlant = null
  }
}

const selectZombie = (zombieType) => {
  if (!gameEngine) {
    selectedZombie.value = zombieType
    return
  }

  if (gameEngine.selectZombie(zombieType)) {
    selectedZombie.value = zombieType
  }
}

const handleCanvasClick = (event) => {
  if (!gameEngine) return
  event.stopImmediatePropagation()

  const canvas = event.target
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top

  const col = Math.floor(x / gameConfig.cellWidth)
  const row = Math.floor(y / gameConfig.cellHeight)

  if (isAuthority.value && isShovelMode.value) {
    if (col >= 0 && col < gameConfig.gridCols && row >= 0 && row < gameConfig.gridRows) {
      const plant = gameEngine.grid.getPlant(col, row)
      if (plant && gameEngine.digupPlant(plant)) {
        isShovelMode.value = false
        gameEngine.isShovelMode = false
        syncEngineState()
        maybeBroadcastAuthorityState()
      } else {
        ElMessage.warning('请选择要铲除的植物')
      }
    }
  } else if (isAuthority.value && selectedPlant.value) {
    if (col >= 0 && col < gameConfig.gridCols && row >= 0 && row < gameConfig.gridRows) {
      if (isPlantCoolingDown(selectedPlant.value)) {
        ElMessage.warning('植物冷却中')
        selectedPlant.value = ''
        if (gameEngine) {
          gameEngine.selectedPlant = null
        }
        return
      }

      const planted = gameEngine.plant(col, row, selectedPlant.value)
      if (planted) {
        selectedPlant.value = ''
        gameEngine.selectedPlant = null
        syncEngineState()
        maybeBroadcastAuthorityState()
      }
    }
  } else if (role.value === 'zombie' && selectedZombie.value) {
    if (row >= 0 && row < gameConfig.gridRows) {
      const spawned = gameEngine.spawnZombie(row, selectedZombie.value)
      if (spawned) {
        selectedZombie.value = ''
        gameEngine.selectedZombie = null
        syncEngineState()
      }
    }
  }
}

const sendGameStateUpdate = () => {
  if (!gameEngine || !isAuthority.value) {
    ElMessage.warning('只有植物方可以同步权威状态')
    return
  }

  if (gameEngine.syncRealtimeState(true)) {
    ElMessage.success('状态已同步')
  }
}

const declareGameOver = async () => {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    ElMessage.error('WebSocket未连接')
    return
  }

  try {
    await ElMessageBox.confirm(
      '确定要认输并结束游戏吗？房间会立即解散。',
      '确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    ws.send(JSON.stringify({
      type: 'game_over',
      payload: {
        reason: `${role.value}_surrender`
      }
    }))
  } catch {
    // ignore
  }
}

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
  if (authoritySyncInterval) {
    clearInterval(authoritySyncInterval)
    authoritySyncInterval = null
  }
  router.push({ name: 'PvZMultiplayerRoom' })
}

onMounted(async () => {
  try {
    await loadPvzRuntimeConfig()
    pvzConfigVersion.value += 1
    sunEnergy.value = getInitialSunEnergy()
    zombieEnergy.value = getInitialZombieEnergy()
  } catch (error) {
    console.error('加载PVZ运行配置失败:', error)
  }

  applySelectionsFromQuery()
  ensureCanvasSize()
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
  if (authoritySyncInterval) {
    clearInterval(authoritySyncInterval)
    authoritySyncInterval = null
  }
})
</script>

<style scoped>
.plants-vs-zombies-view {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

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

.game-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.plants-sidebar,
.zombies-sidebar,
.info-panel,
.game-instructions,
.game-canvas {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.plants-sidebar,
.zombies-sidebar {
  width: 200px;
  max-height: calc(100vh - 20px);
  padding: 20px;
  overflow-y: auto;
}

.plants-sidebar h3,
.zombies-sidebar h3 {
  margin: 0 0 16px 0;
  font-size: 1.2rem;
  color: white;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 0;
  z-index: 1;
}

.plant-slots,
.zombie-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.shovel-btn {
  width: 100%;
  margin: 0 0 14px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.shovel-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.3);
}

.shovel-active {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
}

.plant-slot,
.zombie-slot {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  background: rgba(255, 255, 255, 0.1);
}

.plant-slot:hover,
.zombie-slot:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.plant-slot.selected {
  border-color: #fbbf24;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.5);
}

.zombie-slot.selected {
  border-color: #ef4444;
  box-shadow: 0 0 16px rgba(239, 68, 68, 0.5);
}

.plant-slot.disabled,
.zombie-slot.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.plant-icon,
.zombie-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.plant-name,
.zombie-name {
  font-size: 0.9rem;
  color: white;
  margin-bottom: 4px;
}

.plant-cost {
  font-size: 0.8rem;
  color: #fbbf24;
}

.zombie-cost {
  font-size: 0.8rem;
  color: #ef4444;
}

.cooldown-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.68);
  color: white;
  font-weight: 800;
  pointer-events: none;
}

.cooldown-text {
  padding: 4px 8px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
  font-size: 0.95rem;
}

.game-canvas {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-canvas canvas {
  display: block;
  cursor: crosshair;
  background: #4a7c4e;
}

.info-panel {
  flex: 0 0 220px;
  width: 220px;
  min-width: 0;
  padding: 18px;
  overflow: hidden;
}

.panel-content {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.panel-content .info-item {
  width: 100%;
}

.panel-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-bottom: 16px;
  margin-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h3 {
  margin: 0;
  color: white;
  font-size: 1.1rem;
  text-align: center;
}

.resource-info {
  display: flex;
  justify-content: center;
  text-align: center;
}

.resource-info .info-value {
  font-size: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.18);
}

.info-item:last-child {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.info-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.info-value {
  max-width: 100%;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  text-align: center;
  line-height: 1.35;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.room-code {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 0.82rem;
  letter-spacing: 0;
}

.info-value.sun {
  color: #fbbf24;
}

.info-value.energy {
  color: #f87171;
}

.game-instructions {
  padding: 20px;
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
    flex: none;
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 12px;
  }

  .panel-header {
    width: 100%;
    margin-bottom: 0;
  }

  .panel-content {
    width: 100%;
    display: flex;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 12px;
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

  .panel-content .info-item {
    padding: 0 12px;
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
</style>
