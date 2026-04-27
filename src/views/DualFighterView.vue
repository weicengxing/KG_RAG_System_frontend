<template>
  <div class="fighter-page">
    <section class="fighter-topbar">
      <div>
        <p class="eyebrow">WebSocket 2D Arena</p>
        <h1>双人格斗</h1>
      </div>
      <div class="top-actions">
        <el-button :icon="Refresh" @click="refreshAll">刷新</el-button>
        <el-button v-if="myRoom" :icon="Close" type="danger" plain @click="leaveRoom">离开房间</el-button>
      </div>
    </section>

    <section v-if="!myRoom" class="lobby-grid">
      <div class="panel lobby-panel">
        <div class="panel-title">
          <span>快速开始</span>
          <small>{{ lobbyStatus }}</small>
        </div>
        <el-button :icon="Plus" type="primary" size="large" class="wide-btn" @click="createRoom" :loading="loading">
          创建房间
        </el-button>
        <div class="ai-start">
          <label class="field-label">人机难度</label>
          <div class="difficulty-grid">
            <button
              v-for="difficulty in difficultyList"
              :key="difficulty.id"
              class="difficulty-btn"
              :class="{ selected: selectedDifficulty === difficulty.id }"
              @click="selectedDifficulty = difficulty.id"
            >
              {{ difficulty.name }}
            </button>
          </div>
          <el-button :icon="Select" type="warning" size="large" class="wide-btn" @click="createAiRoom" :loading="loading">
            人机模式
          </el-button>
        </div>
        <div class="join-row">
          <el-input v-model="roomCode" maxlength="6" placeholder="输入 6 位房间码" clearable />
          <el-button :icon="Connection" type="success" @click="joinRoom" :loading="loading">加入</el-button>
        </div>
      </div>

      <div class="panel room-list-panel">
        <div class="panel-title">
          <span>大厅房间</span>
          <small>{{ rooms.length }} 个</small>
        </div>
        <div v-if="rooms.length === 0" class="empty-state">暂无房间，先创建一个练手场。</div>
        <button
          v-for="room in rooms"
          :key="room.roomId"
          class="room-row"
          :disabled="Boolean(room.players?.p2)"
          @click="joinRoomByCode(room.roomCode)"
        >
          <span class="room-code">{{ room.roomCode }}</span>
          <span>{{ roomModeText(room) }} · {{ roomStatusText(room.status) }}</span>
          <span>{{ playerCount(room) }}/2</span>
        </button>
      </div>
    </section>

    <section v-else class="arena-layout">
      <aside class="setup-panel panel">
        <div class="panel-title">
          <span>房间 {{ myRoom.roomCode }}</span>
          <small>{{ connectionStatus }}</small>
        </div>

        <div class="player-slots">
          <div v-for="slot in ['p1', 'p2']" :key="slot" class="player-slot" :class="{ self: slot === mySlot }">
            <strong>{{ slotLabel(slot) }}</strong>
            <span>{{ gameState?.players?.[slot]?.username || '等待加入' }}</span>
            <em>{{ playerReadyText(slot) }}</em>
          </div>
        </div>

        <label class="field-label">角色</label>
        <div class="character-grid">
          <button
            v-for="character in characterList"
            :key="character.id"
            class="character-btn"
            :class="{ selected: selectedCharacterId === character.id }"
            :disabled="isPlaying"
            @click="selectCharacter(character.id)"
          >
            <span class="swatch" :style="{ background: character.color }"></span>
            <strong>{{ character.name }}</strong>
            <small>{{ character.role }}</small>
          </button>
        </div>

        <label class="field-label">地图</label>
        <div class="map-grid">
          <button
            v-for="map in mapList"
            :key="map.id"
            class="map-btn"
            :class="{ selected: selectedMapId === map.id }"
            :disabled="!isHost || isPlaying"
            @click="selectMap(map.id)"
          >
            <span>{{ map.name }}</span>
          </button>
        </div>

        <div class="ready-actions">
          <el-button
            :icon="Select"
            :type="localReady ? 'warning' : 'primary'"
            size="large"
            class="wide-btn"
            :disabled="!canReady"
            @click="toggleReady"
          >
            {{ localReady ? '取消准备' : '准备战斗' }}
          </el-button>
          <el-button v-if="isHost && gameState?.status === 'finished'" :icon="SwitchButton" @click="resetMatch">
            重开
          </el-button>
        </div>
      </aside>

      <main class="battle-panel">
        <div class="hud">
          <div v-for="slot in ['p1', 'p2']" :key="slot" class="hud-player" :class="slot">
            <div class="hud-name">
              <span>{{ gameState?.players?.[slot]?.username || slotLabel(slot) }}</span>
              <strong>{{ characterName(gameState?.players?.[slot]?.characterId) }}</strong>
            </div>
            <div class="health-shell">
              <div class="health-fill" :style="{ width: hpPercent(slot) + '%' }"></div>
            </div>
            <div class="energy-shell">
              <div class="energy-fill" :style="{ width: energyPercent(slot) + '%' }"></div>
            </div>
          </div>
          <div class="match-state">
            <strong>{{ roomStatusText(gameState?.status) }}</strong>
            <span v-if="winnerText">{{ winnerText }}</span>
          </div>
        </div>

        <div ref="canvasHost" class="canvas-host"></div>

        <div class="controls-panel">
          <div class="keys">
            <kbd>A/D</kbd><span>移动</span>
            <kbd>W</kbd><span>跳跃</span>
            <kbd>H</kbd><span>格挡</span>
            <kbd>J/K/L</kbd><span>轻击/重击/绝招</span>
          </div>
          <div class="touch-actions">
            <button @pointerdown="hold('left', true)" @pointerup="hold('left', false)" @pointerleave="hold('left', false)">左</button>
            <button @pointerdown="hold('right', true)" @pointerup="hold('right', false)" @pointerleave="hold('right', false)">右</button>
            <button @click="tapJump">跳</button>
            <button @pointerdown="hold('block', true)" @pointerup="hold('block', false)" @pointerleave="hold('block', false)">防</button>
            <button @click="sendAction('light')">轻</button>
            <button @click="sendAction('heavy')">重</button>
            <button @click="sendAction('special')">绝</button>
          </div>
        </div>
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import * as PIXI from 'pixi.js'
import { ElMessage } from 'element-plus'
import { Close, Connection, Plus, Refresh, Select, SwitchButton } from '@element-plus/icons-vue'
import request from '../utils/request'
import { API_CONFIG } from '../config.js'

const rooms = ref([])
const roomCode = ref('')
const myRoom = ref(null)
const gameState = ref(null)
const catalog = ref({ characters: {}, maps: {}, difficulties: {} })
const loading = ref(false)
const lobbyStatus = ref('未连接')
const connectionStatus = ref('未连接')
const mySlot = ref('')
const canvasHost = ref(null)
const selectedDifficulty = ref('normal')

const currentUserId = ref(localStorage.getItem('username') || `guest-${Date.now()}`)
const inputState = ref({ left: false, right: false, up: false, down: false, block: false })
let lobbyWs = null
let roomWs = null
let inputTimer = null
let pixiApp = null
let arenaLayer = null

const characterList = computed(() => Object.values(catalog.value.characters || {}))
const mapList = computed(() => Object.values(catalog.value.maps || {}))
const difficultyList = computed(() => Object.values(catalog.value.difficulties || {}))
const isHost = computed(() => myRoom.value?.hostId === currentUserId.value)
const isPlaying = computed(() => gameState.value?.status === 'playing')
const selectedMapId = computed(() => gameState.value?.mapId || myRoom.value?.mapId || 'stone')
const selectedCharacterId = computed(() => {
  return mySlot.value ? gameState.value?.players?.[mySlot.value]?.characterId : ''
})
const localReady = computed(() => {
  return mySlot.value ? Boolean(gameState.value?.players?.[mySlot.value]?.ready) : false
})
const canReady = computed(() => {
  return Boolean(mySlot.value && selectedCharacterId.value && gameState.value?.players?.p1 && gameState.value?.players?.p2 && !isPlaying.value)
})
const winnerText = computed(() => {
  const winner = gameState.value?.winner
  if (!winner) return ''
  const player = gameState.value?.players?.[winner]
  return `${player?.username || slotLabel(winner)} 获胜`
})

const roomStatusText = (status) => {
  const labels = {
    waiting: '等待中',
    selecting: '选择中',
    playing: '战斗中',
    finished: '已结束',
  }
  return labels[status] || status || '等待中'
}

const slotLabel = (slot) => (slot === 'p1' ? '玩家一' : '玩家二')
const playerCount = (room) => Object.values(room.players || {}).filter(Boolean).length
const characterName = (id) => catalog.value.characters?.[id]?.name || '未选择'
const roomModeText = (room) => {
  if (room?.mode !== 'ai') return '真人对战'
  const difficulty = catalog.value.difficulties?.[room.aiDifficulty]?.name || 'AI'
  return `人机 ${difficulty}`
}
const playerReadyText = (slot) => {
  const player = gameState.value?.players?.[slot]
  if (!player) return '未加入'
  if (player.isAI) {
    const difficulty = catalog.value.difficulties?.[player.aiDifficulty]?.name || 'AI'
    return `${difficulty} AI`
  }
  return player.ready ? '已准备' : '未准备'
}
const hpPercent = (slot) => {
  const player = gameState.value?.players?.[slot]
  const maxHp = catalog.value.characters?.[player?.characterId]?.maxHp || 100
  return Math.max(0, Math.min(100, ((player?.hp || 0) / maxHp) * 100))
}
const energyPercent = (slot) => Math.max(0, Math.min(100, gameState.value?.players?.[slot]?.energy || 0))

const loadCatalog = async () => {
  const res = await request.get('/api/fighter/catalog')
  catalog.value = res.data?.data || { characters: {}, maps: {}, difficulties: {} }
}

const loadRooms = async () => {
  const res = await request.get('/api/fighter/rooms')
  rooms.value = res.data?.data || []
}

const loadMyRoom = async () => {
  const res = await request.get('/api/fighter/my-room')
  myRoom.value = res.data?.data || null
  if (myRoom.value?.state) {
    gameState.value = myRoom.value.state
    mySlot.value = findMySlot(gameState.value)
  }
}

const refreshAll = async () => {
  await Promise.all([loadRooms(), loadMyRoom()])
  if (myRoom.value) {
    connectRoom()
  } else {
    connectLobby()
  }
}

const createRoom = async () => {
  loading.value = true
  try {
    const res = await request.post('/api/fighter/create-room')
    myRoom.value = res.data?.data
    gameState.value = myRoom.value?.state || null
    mySlot.value = findMySlot(gameState.value)
    ElMessage.success(`房间已创建：${myRoom.value.roomCode}`)
    disconnectLobby()
    connectRoom()
  } finally {
    loading.value = false
  }
}

const createAiRoom = async () => {
  loading.value = true
  try {
    const res = await request.post('/api/fighter/create-ai-room', {
      difficulty: selectedDifficulty.value,
    })
    myRoom.value = res.data?.data
    gameState.value = myRoom.value?.state || null
    mySlot.value = findMySlot(gameState.value)
    ElMessage.success(`人机房间已创建：${myRoom.value.roomCode}`)
    disconnectLobby()
    connectRoom()
  } finally {
    loading.value = false
  }
}

const joinRoom = async () => {
  if (!roomCode.value.trim()) {
    ElMessage.warning('请输入房间码')
    return
  }
  loading.value = true
  try {
    const res = await request.post('/api/fighter/join-room', { room_code: roomCode.value.trim().toUpperCase() })
    myRoom.value = res.data?.data
    gameState.value = myRoom.value?.state || null
    mySlot.value = findMySlot(gameState.value)
    ElMessage.success('已加入房间')
    disconnectLobby()
    connectRoom()
  } finally {
    loading.value = false
  }
}

const joinRoomByCode = async (code) => {
  roomCode.value = code
  await joinRoom()
}

const leaveRoom = async () => {
  disconnectRoom()
  await request.post('/api/fighter/leave-room')
  myRoom.value = null
  gameState.value = null
  mySlot.value = ''
  connectLobby()
  await loadRooms()
}

const findMySlot = (state) => {
  return Object.entries(state?.players || {}).find(([, player]) => player.userId === currentUserId.value)?.[0] || ''
}

const connectLobby = () => {
  if (lobbyWs || myRoom.value) return
  const wsUrl = `${API_CONFIG.WS_BASE_URL}/api/ws/fighter/lobby?user_id=${encodeURIComponent(currentUserId.value)}`
  lobbyWs = new WebSocket(wsUrl)
  lobbyWs.onopen = () => {
    lobbyStatus.value = '已连接'
  }
  lobbyWs.onmessage = (event) => {
    const message = JSON.parse(event.data)
    if (message.type === 'state.lobby') {
      rooms.value = message.payload.rooms || []
    }
  }
  lobbyWs.onclose = () => {
    lobbyStatus.value = '已断开'
    lobbyWs = null
  }
  lobbyWs.onerror = () => {
    lobbyStatus.value = '连接异常'
  }
}

const disconnectLobby = () => {
  if (lobbyWs) {
    lobbyWs.close()
    lobbyWs = null
  }
}

const connectRoom = () => {
  if (!myRoom.value || roomWs) return
  const wsUrl = `${API_CONFIG.WS_BASE_URL}/api/ws/fighter/room/${myRoom.value.roomId}?user_id=${encodeURIComponent(currentUserId.value)}`
  roomWs = new WebSocket(wsUrl)
  roomWs.onopen = () => {
    connectionStatus.value = '已连接'
  }
  roomWs.onmessage = async (event) => {
    const message = JSON.parse(event.data)
    if (message.type === 'event.connected') {
      mySlot.value = message.payload.slot
    }
    if (message.type === 'state.room' || message.type === 'state.tick') {
      gameState.value = message.payload
      mySlot.value = mySlot.value || findMySlot(gameState.value)
      await ensureRenderer()
      renderArena()
    }
  }
  roomWs.onclose = () => {
    connectionStatus.value = '已断开'
    roomWs = null
  }
  roomWs.onerror = () => {
    connectionStatus.value = '连接异常'
  }
}

const disconnectRoom = () => {
  if (roomWs) {
    roomWs.close()
    roomWs = null
  }
}

const sendRoomMessage = (type, payload = {}) => {
  if (roomWs?.readyState === WebSocket.OPEN) {
    roomWs.send(JSON.stringify({ type, payload }))
  }
}

const selectCharacter = (characterId) => {
  sendRoomMessage('select_character', { characterId })
}

const selectMap = (mapId) => {
  sendRoomMessage('select_map', { mapId })
}

const toggleReady = () => {
  sendRoomMessage('ready', { ready: !localReady.value })
}

const resetMatch = () => {
  sendRoomMessage('reset')
}

const sendInput = () => {
  if (!isPlaying.value) return
  sendRoomMessage('input', { ...inputState.value })
}

const sendAction = (action) => {
  if (!isPlaying.value) return
  sendRoomMessage('input', { ...inputState.value, action })
}

const hold = (key, value) => {
  inputState.value[key] = value
  sendInput()
}

const tapJump = () => {
  inputState.value.up = true
  sendInput()
  setTimeout(() => {
    inputState.value.up = false
    sendInput()
  }, 80)
}

const keyMap = {
  KeyA: 'left',
  KeyD: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyH: 'block',
}
const actionMap = {
  KeyJ: 'light',
  KeyK: 'heavy',
  KeyL: 'special',
}

const handleKeyDown = (event) => {
  if (!myRoom.value) return
  const key = keyMap[event.code]
  const action = actionMap[event.code]
  if (key || action) event.preventDefault()
  if (key && !inputState.value[key]) {
    inputState.value[key] = true
    sendInput()
  }
  if (action && !event.repeat) {
    sendAction(action)
  }
}

const handleKeyUp = (event) => {
  const key = keyMap[event.code]
  if (!key) return
  event.preventDefault()
  inputState.value[key] = false
  sendInput()
}

const ensureRenderer = async () => {
  if (pixiApp || !canvasHost.value) return
  await nextTick()
  pixiApp = new PIXI.Application()
  await pixiApp.init({
    width: 960,
    height: 540,
    background: 0x111827,
    backgroundColor: 0x111827,
    antialias: true,
    autoDensity: true,
    resolution: 1,
  })
  canvasHost.value.innerHTML = ''
  canvasHost.value.appendChild(pixiApp.canvas)
  arenaLayer = new PIXI.Graphics()
  pixiApp.stage.addChild(arenaLayer)
}

const colorNumber = (value, fallback = 0xffffff) => {
  if (!value || typeof value !== 'string') return fallback
  return Number.parseInt(value.replace('#', ''), 16)
}

const renderArena = () => {
  if (!arenaLayer) return
  const state = gameState.value
  const map = state?.map || catalog.value.maps?.stone
  arenaLayer.clear()
  arenaLayer.rect(0, 0, 960, 540).fill(colorNumber(map?.sky, 0x172033))

  if (map?.id === 'bamboo') {
    for (let x = 40; x < 940; x += 72) {
      arenaLayer.rect(x, 80, 10, 350).fill({ color: 0x214d3f, alpha: 0.72 })
      arenaLayer.circle(x + 8, 110, 28).fill({ color: 0x2f6f55, alpha: 0.45 })
    }
  } else if (map?.id === 'lava') {
    for (let x = 0; x < 960; x += 96) {
      arenaLayer.rect(x, 442, 58, 18).fill({ color: 0xf97316, alpha: 0.55 })
    }
  } else {
    for (let x = 0; x < 960; x += 120) {
      arenaLayer.rect(x + 20, 110, 52, 170).fill({ color: 0x263244, alpha: 0.55 })
    }
  }

  arenaLayer.rect(0, map.groundY, 960, 540 - map.groundY).fill(colorNumber(map?.floor, 0x6b7280))
  arenaLayer.moveTo(map.leftWall, map.groundY).lineTo(map.rightWall, map.groundY).stroke({ width: 4, color: 0xf8fafc, alpha: 0.42 })
  arenaLayer.rect(map.leftWall - 8, map.groundY - 34, 8, 34).fill({ color: 0xf8fafc, alpha: 0.28 })
  arenaLayer.rect(map.rightWall, map.groundY - 34, 8, 34).fill({ color: 0xf8fafc, alpha: 0.28 })

  Object.values(state?.players || {}).forEach(drawFighter)
}

const drawFighter = (player) => {
  const character = catalog.value.characters?.[player.characterId]
  if (!character) return
  const color = colorNumber(character.color)
  const x = player.x
  const y = player.y
  const w = character.width
  const h = character.height
  const direction = player.facing || 1
  const alpha = player.stun > 0 ? 0.78 : 1

  if (player.attack) {
    const range = character.attacks?.[player.attack]?.range || 80
    const attackX = direction > 0 ? x + w : x - range
    arenaLayer.rect(attackX, y + h * 0.34, range, 20).fill({ color, alpha: 0.28 })
  }

  arenaLayer.rect(x + w * 0.18, y + h * 0.22, w * 0.64, h * 0.64).fill({ color, alpha })
  arenaLayer.circle(x + w / 2, y + h * 0.13, w * 0.28).fill({ color: 0xf8fafc, alpha })
  arenaLayer.rect(x + w * 0.24, y + h * 0.86, w * 0.17, h * 0.14).fill({ color: 0x111827, alpha })
  arenaLayer.rect(x + w * 0.59, y + h * 0.86, w * 0.17, h * 0.14).fill({ color: 0x111827, alpha })
  arenaLayer.rect(x + w * 0.48, y + h * 0.44, direction * (w * 0.74), 6).fill({ color: 0xf8fafc, alpha: 0.82 })

  if (player.blocking) {
    const shieldX = direction > 0 ? x + w + 5 : x - 17
    arenaLayer.rect(shieldX, y + h * 0.25, 12, h * 0.5).fill({ color: 0x93c5fd, alpha: 0.6 })
  }
}

watch(gameState, () => {
  renderArena()
})

onMounted(async () => {
  await loadCatalog()
  await refreshAll()
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  inputTimer = window.setInterval(sendInput, 50)
})

onUnmounted(() => {
  disconnectLobby()
  disconnectRoom()
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  if (inputTimer) window.clearInterval(inputTimer)
  if (pixiApp) {
    pixiApp.destroy(true)
    pixiApp = null
  }
})
</script>

<style scoped>
.fighter-page {
  min-height: calc(100vh - 64px);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(69, 10, 10, 0.86)),
    radial-gradient(circle at top right, rgba(20, 184, 166, 0.28), transparent 34%);
  color: #f8fafc;
  padding: 24px;
}

.fighter-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  max-width: 1440px;
  margin: 0 auto 20px;
}

.eyebrow {
  margin: 0 0 4px;
  color: #5eead4;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0;
  font-size: 34px;
}

.top-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.lobby-grid,
.arena-layout {
  max-width: 1440px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.lobby-grid {
  grid-template-columns: minmax(280px, 420px) 1fr;
}

.arena-layout {
  grid-template-columns: 340px minmax(0, 1fr);
  align-items: start;
}

.panel {
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
}

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  font-weight: 700;
}

.panel-title small {
  color: #cbd5e1;
  font-weight: 500;
}

.wide-btn {
  width: 100%;
}

.join-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  margin-top: 14px;
}

.ai-start {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.difficulty-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.difficulty-btn {
  min-height: 38px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(30, 41, 59, 0.72);
  color: #f8fafc;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
}

.difficulty-btn.selected {
  border-color: #fbbf24;
  background: rgba(180, 83, 9, 0.38);
}

.room-list-panel {
  min-height: 260px;
}

.empty-state {
  min-height: 180px;
  display: grid;
  place-items: center;
  color: #cbd5e1;
}

.room-row {
  width: 100%;
  min-height: 54px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(30, 41, 59, 0.78);
  color: #f8fafc;
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 14px;
  align-items: center;
  text-align: left;
  padding: 12px 14px;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
}

.room-row:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.room-code {
  font-weight: 800;
  color: #fbbf24;
}

.setup-panel {
  position: sticky;
  top: 84px;
}

.player-slots {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.player-slot {
  min-height: 62px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 10px;
  background: rgba(2, 6, 23, 0.46);
  border: 1px solid transparent;
  border-radius: 8px;
}

.player-slot.self {
  border-color: #5eead4;
}

.player-slot em {
  color: #cbd5e1;
  font-style: normal;
  font-size: 12px;
}

.field-label {
  display: block;
  margin: 14px 0 8px;
  color: #cbd5e1;
  font-size: 13px;
  font-weight: 700;
}

.character-grid,
.map-grid {
  display: grid;
  gap: 8px;
}

.character-btn,
.map-btn {
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(30, 41, 59, 0.72);
  color: #f8fafc;
  border-radius: 8px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
}

.character-btn {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 4px 8px;
  align-items: center;
}

.character-btn small {
  grid-column: 2;
  color: #cbd5e1;
}

.character-btn.selected,
.map-btn.selected {
  border-color: #fbbf24;
  background: rgba(180, 83, 9, 0.38);
}

.character-btn:disabled,
.map-btn:disabled {
  cursor: default;
}

.swatch {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.ready-actions {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.battle-panel {
  min-width: 0;
}

.hud {
  display: grid;
  grid-template-columns: minmax(190px, 1fr) auto minmax(190px, 1fr);
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.hud-player,
.match-state {
  min-height: 74px;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  padding: 10px;
}

.hud-player.p2 {
  text-align: right;
}

.hud-name {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 13px;
}

.health-shell,
.energy-shell {
  width: 100%;
  height: 12px;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 999px;
  overflow: hidden;
}

.energy-shell {
  height: 6px;
  margin-top: 6px;
}

.health-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #facc15, #ef4444);
}

.energy-fill {
  height: 100%;
  background: #38bdf8;
}

.match-state {
  min-width: 148px;
  text-align: center;
  display: grid;
  place-items: center;
  color: #fbbf24;
}

.canvas-host {
  width: 100%;
  overflow: auto;
  background: #020617;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
}

.canvas-host :deep(canvas) {
  width: 100%;
  max-width: 960px;
  aspect-ratio: 16 / 9;
  display: block;
  margin: 0 auto;
}

.controls-panel {
  margin-top: 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.keys {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  color: #cbd5e1;
}

kbd {
  min-width: 34px;
  text-align: center;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(248, 250, 252, 0.12);
  border: 1px solid rgba(248, 250, 252, 0.18);
  color: #f8fafc;
}

.touch-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.touch-actions button {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(94, 234, 212, 0.4);
  background: rgba(20, 184, 166, 0.18);
  color: #f8fafc;
  font-weight: 800;
  cursor: pointer;
}

@media (max-width: 1120px) {
  .arena-layout,
  .lobby-grid {
    grid-template-columns: 1fr;
  }

  .setup-panel {
    position: static;
  }
}

@media (max-width: 720px) {
  .fighter-page {
    padding: 14px;
  }

  .fighter-topbar,
  .hud,
  .controls-panel {
    grid-template-columns: 1fr;
    display: grid;
  }

  h1 {
    font-size: 28px;
  }

  .join-row {
    grid-template-columns: 1fr;
  }
}
</style>
