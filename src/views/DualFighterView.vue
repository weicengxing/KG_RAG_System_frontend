<template>
  <div class="fighter-page">
    <section class="fighter-topbar">
      <div>
        <p class="eyebrow">WebSocket 2D Arena</p>
        <h1>双人格斗</h1>
      </div>
      <div class="top-actions">
        <el-button :icon="audioEnabled ? Bell : Mute" @click="toggleAudio">
          SFX {{ audioEnabled ? 'ON' : 'OFF' }}
        </el-button>
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
            <span class="character-style">{{ character.style }}</span>
            <span class="character-trait">{{ character.trait }}</span>
            <span class="character-combo">{{ character.comboHint }}</span>
            <span class="stat-grid">
              <span v-for="stat in statRows(character)" :key="stat.key" class="stat-row">
                <em>{{ stat.label }}</em>
                <i><b :style="{ width: stat.value * 10 + '%' }"></b></i>
              </span>
            </span>
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
            <small>{{ map.mechanic || map.description }}</small>
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
              <div class="health-lag" :style="{ width: delayedHpPercent(slot) + '%' }"></div>
              <div class="health-fill" :style="{ width: hpPercent(slot) + '%' }"></div>
            </div>
            <div class="energy-shell">
              <div class="energy-fill" :style="{ width: energyPercent(slot) + '%' }"></div>
            </div>
            <div v-if="resourceMeta(slot)" class="resource-shell">
              <span>{{ resourceLabel(slot) }}</span>
              <i><b :style="{ width: resourcePercent(slot) + '%', background: resourceMeta(slot).color }"></b></i>
            </div>
          </div>
          <div class="match-state">
            <strong>{{ roomStatusText(gameState?.status) }}</strong>
            <span v-if="winnerText">{{ winnerText }}</span>
          </div>
        </div>

        <div ref="canvasHost" class="canvas-host">
          <canvas ref="fallbackCanvas" class="fighter-fallback-canvas" width="960" height="540"></canvas>
        </div>

        <div class="controls-panel">
          <div class="keys">
            <kbd>A/D</kbd><span>移动</span>
            <kbd>W</kbd><span>跳跃</span>
            <kbd>H</kbd><span>格挡</span>
            <kbd>J/K/L</kbd><span>轻击/重击/绝招</span>
            <kbd>S+J</kbd><span>低扫</span>
            <kbd>S+K</kbd><span>挑空</span>
            <kbd>S+L</kbd><span>破防</span>
          </div>
          <div class="touch-actions">
            <button @click="toggleRenderMode">{{ renderMode === 'model' ? '2D' : '3D' }}</button>
            <button @pointerdown="hold('left', true)" @pointerup="hold('left', false)" @pointerleave="hold('left', false)">左</button>
            <button @pointerdown="hold('right', true)" @pointerup="hold('right', false)" @pointerleave="hold('right', false)">右</button>
            <button @pointerdown="hold('down', true)" @pointerup="hold('down', false)" @pointerleave="hold('down', false)">S</button>
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
import { ElMessage } from 'element-plus'
import { Bell, Close, Connection, Mute, Plus, Refresh, Select, SwitchButton } from '@element-plus/icons-vue'
import request from '../utils/request'
import { API_CONFIG } from '../config.js'
import { FighterModelRenderer } from '../fighter/fighterModelRenderer.js'
import { FighterAudioEngine } from '../fighter/fighterAudioEngine.js'

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
const fallbackCanvas = ref(null)
const selectedDifficulty = ref('normal')
const renderMode = ref('canvas')
const delayedHp = ref({ p1: 100, p2: 100 })

const currentUserId = ref(localStorage.getItem('username') || `guest-${Date.now()}`)
const inputState = ref({ left: false, right: false, up: false, down: false, block: false })
const audioEngine = new FighterAudioEngine()
const audioEnabled = ref(audioEngine.isEnabled)
let lobbyWs = null
let roomWs = null
let inputTimer = null
let modelRenderer = null
let canvasCtx = null
let lastModelRenderAt = 0
let animationFrameId = null
let lastFrameAt = 0
let lastTrailAt = 0
// Layered offscreen canvases for performance.
let bgCanvas = null
let bgCtx = null
let bgCanvasMapId = null
let fxCanvas = null   // half-res, for bloom source
let fxCtx = null
let bloomCanvas = null
let bloomCtx = null
let vignetteCanvas = null
let mainCanvas = null
let canvasDpr = 1
// Sprite caches.
const sparkSpriteCache = new Map()
const shadowSpriteCache = new Map()
let vignetteReady = false
// Adaptive quality.
const quality = {
  tier: 2,           // 2 = full, 1 = mid (no bloom), 0 = low
  bloom: true,
  particleCap: 240,
  slashCap: 36,
  ringCap: 24,
  afterimageCap: 18,
  damageTextCap: 28,
  bloomBlurPx: 6,
  trailIntervalMs: 55,
  fpsSamples: [],
  slowFrames: 0,
  fastFrames: 0,
}
const FX_CAPS = {
  particles: () => quality.particleCap,
  slashes: () => quality.slashCap,
  rings: () => quality.ringCap,
  afterimages: () => quality.afterimageCap,
  damageTexts: () => quality.damageTextCap,
  comboBursts: () => 8,
  speedLines: () => 12,
  flashes: () => 8,
  hitFlashes: () => 6,
}
const localFx = {
  particles: [],
  rings: [],
  slashes: [],
  afterimages: [],
  speedLines: [],
  flashes: [],
  damageTexts: [],
  hitFlashes: [],
  comboBursts: [],
  seenEffects: new Set(),
  shake: 0,
  trauma: 0,
  hitStopUntil: 0,
  frozenState: null,
  zoomPunch: 0,        // 0..1, 1 = peak punch
  zoomPunchTime: 0,    // remaining seconds
  zoomCenter: { x: 480, y: 270 },
  vignetteBoost: 0,
}
const delayedHpTimers = {}

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
const delayedHpPercent = (slot) => Math.max(0, Math.min(100, delayedHp.value?.[slot] ?? hpPercent(slot)))
const statRows = (character) => {
  const stats = character?.stats || {}
  return [
    { key: 'speed', label: '速', value: stats.speed || 5 },
    { key: 'range', label: '距', value: stats.range || 5 },
    { key: 'damage', label: '伤', value: stats.damage || 5 },
    { key: 'tempo', label: '频', value: stats.tempo || 5 },
    { key: 'survival', label: '守', value: stats.survival || 5 },
  ]
}
const playerCharacter = (slot) => catalog.value.characters?.[gameState.value?.players?.[slot]?.characterId]
const resourceMeta = (slot) => playerCharacter(slot)?.resource
const resourceValue = (slot) => {
  const player = gameState.value?.players?.[slot]
  const meta = resourceMeta(slot)
  return meta ? Number(player?.[meta.key] || 0) : 0
}
const resourcePercent = (slot) => {
  const meta = resourceMeta(slot)
  if (!meta) return 0
  return Math.max(0, Math.min(100, (resourceValue(slot) / meta.max) * 100))
}
const resourceLabel = (slot) => {
  const meta = resourceMeta(slot)
  if (!meta) return ''
  const value = resourceValue(slot)
  const shown = meta.max <= 3 ? Math.floor(value) : Math.round(value)
  return `${meta.name} ${shown}/${meta.max}`
}

const syncDelayedHealthBars = () => {
  ;['p1', 'p2'].forEach((slot) => {
    const target = hpPercent(slot)
    const current = delayedHp.value[slot] ?? 100
    if (target >= current) {
      window.clearTimeout(delayedHpTimers[slot])
      delayedHp.value = { ...delayedHp.value, [slot]: target }
      return
    }
    window.clearTimeout(delayedHpTimers[slot])
    delayedHpTimers[slot] = window.setTimeout(() => {
      delayedHp.value = { ...delayedHp.value, [slot]: target }
    }, 260)
  })
}

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
  unlockAudio()
  sendRoomMessage('ready', { ready: !localReady.value })
}

const resetMatch = () => {
  unlockAudio()
  sendRoomMessage('reset')
}

const unlockAudio = () => {
  if (!audioEnabled.value) return
  audioEngine.unlock().catch(() => {})
}

const toggleAudio = () => {
  audioEnabled.value = audioEngine.toggle()
}

const sendInput = () => {
  if (!isPlaying.value) return
  unlockAudio()
  sendRoomMessage('input', { ...inputState.value })
}

const sendAction = (action) => {
  if (!isPlaying.value) return
  unlockAudio()
  audioEngine.playLocalAction(action, inputState.value)
  sendRoomMessage('input', { ...inputState.value, action })
}

const hold = (key, value) => {
  inputState.value[key] = value
  if (value) {
    unlockAudio()
    if (key === 'block') audioEngine.playLocalAction('block', inputState.value)
  }
  sendInput()
}

const tapJump = () => {
  unlockAudio()
  audioEngine.playLocalAction('jump', inputState.value)
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
  if (key || action) unlockAudio()
  if (key && !inputState.value[key]) {
    inputState.value[key] = true
    if (key === 'block') audioEngine.playLocalAction('block', inputState.value)
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
  if (modelRenderer || canvasCtx) return
  await nextTick()
  if (!canvasHost.value) return
  if (renderMode.value !== 'model') {
    initCanvasFallback()
    return
  }
  try {
    modelRenderer = new FighterModelRenderer(canvasHost.value)
  } catch (error) {
    console.warn('[DualFighter] Three.js renderer failed, using canvas fallback.', error)
    renderMode.value = 'canvas'
    localStorage.setItem('fighter_render_mode', 'canvas')
    initCanvasFallback()
  }
}

const initCanvasFallback = () => {
  if (!canvasHost.value) return
  let canvas = fallbackCanvas.value
  if (!canvas || !canvas.isConnected) {
    canvas = document.createElement('canvas')
    canvas.className = 'fighter-fallback-canvas'
    canvasHost.value.innerHTML = ''
    canvasHost.value.appendChild(canvas)
    fallbackCanvas.value = canvas
  }
  // High-DPI: cap DPR at 1.5 to avoid 4K screens spiking CPU.
  canvasDpr = Math.min(1.5, window.devicePixelRatio || 1)
  canvas.width = Math.round(960 * canvasDpr)
  canvas.height = Math.round(540 * canvasDpr)
  canvas.style.display = 'block'
  canvas.style.width = '960px'
  canvas.style.height = '540px'
  mainCanvas = canvas
  canvasCtx = canvas.getContext('2d', { alpha: false })
  canvasCtx.setTransform(canvasDpr, 0, 0, canvasDpr, 0, 0)
  ensureOffscreenLayers()
}

const ensureOffscreenLayers = () => {
  if (!bgCanvas) {
    bgCanvas = document.createElement('canvas')
    bgCanvas.width = 960
    bgCanvas.height = 540
    bgCtx = bgCanvas.getContext('2d', { alpha: false })
    bgCanvasMapId = null
  }
  if (!fxCanvas) {
    fxCanvas = document.createElement('canvas')
    fxCanvas.width = 480
    fxCanvas.height = 270
    fxCtx = fxCanvas.getContext('2d', { alpha: true })
  }
  if (!bloomCanvas) {
    bloomCanvas = document.createElement('canvas')
    bloomCanvas.width = 480
    bloomCanvas.height = 270
    bloomCtx = bloomCanvas.getContext('2d', { alpha: true })
  }
  if (!vignetteReady) buildVignette()
}

const buildVignette = () => {
  vignetteCanvas = document.createElement('canvas')
  vignetteCanvas.width = 960
  vignetteCanvas.height = 540
  const ctx = vignetteCanvas.getContext('2d')
  const grad = ctx.createRadialGradient(480, 270, 200, 480, 270, 560)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0.18)')
  grad.addColorStop(1, 'rgba(0,0,0,0.62)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 960, 540)
  vignetteReady = true
}

const getSparkSprite = (color) => {
  let sprite = sparkSpriteCache.get(color)
  if (sprite) return sprite
  sprite = document.createElement('canvas')
  sprite.width = 64
  sprite.height = 64
  const ctx = sprite.getContext('2d')
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.22, color)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  sparkSpriteCache.set(color, sprite)
  return sprite
}

const getShadowSprite = (width) => {
  const key = Math.round(width / 8) * 8
  let sprite = shadowSpriteCache.get(key)
  if (sprite) return sprite
  sprite = document.createElement('canvas')
  sprite.width = key * 2
  sprite.height = Math.max(16, key * 0.6)
  const ctx = sprite.getContext('2d')
  const cx = sprite.width / 2
  const cy = sprite.height / 2
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, sprite.width / 2)
  g.addColorStop(0, 'rgba(0,0,0,0.55)')
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(cx, cy, sprite.width / 2, sprite.height / 2, 0, 0, Math.PI * 2)
  ctx.fill()
  shadowSpriteCache.set(key, sprite)
  return sprite
}

// Memoize per-color body palette: lighter highlight + darker outline.
const bodyPaletteCache = new Map()
const getBodyPalette = (color) => {
  let pal = bodyPaletteCache.get(color)
  if (pal) return pal
  // Parse a #rrggbb (or fallback) into HSL-ish lighter/darker variants.
  const hex = (color || '#38bdf8').replace('#', '')
  const r = parseInt(hex.slice(0, 2), 16) || 0
  const g = parseInt(hex.slice(2, 4), 16) || 0
  const b = parseInt(hex.slice(4, 6), 16) || 0
  const mix = (cv, target, t) => Math.max(0, Math.min(255, Math.round(cv + (target - cv) * t)))
  const light = `rgb(${mix(r, 255, 0.45)},${mix(g, 255, 0.45)},${mix(b, 255, 0.45)})`
  const dark = `rgb(${mix(r, 0, 0.55)},${mix(g, 0, 0.55)},${mix(b, 0, 0.55)})`
  const outline = `rgb(${mix(r, 0, 0.7)},${mix(g, 0, 0.7)},${mix(b, 0, 0.7)})`
  pal = { light, base: color, dark, outline }
  bodyPaletteCache.set(color, pal)
  return pal
}

const toggleRenderMode = async () => {
  if (renderMode.value === 'model') {
    renderMode.value = 'canvas'
    localStorage.setItem('fighter_render_mode', 'canvas')
    if (modelRenderer) {
      modelRenderer.destroy()
      modelRenderer = null
    }
    canvasCtx = null
    initCanvasFallback()
    renderArena()
    return
  }

  renderMode.value = 'model'
  localStorage.setItem('fighter_render_mode', 'model')
  canvasCtx = null
  await nextTick()
  if (!canvasHost.value) return
  try {
    modelRenderer = new FighterModelRenderer(canvasHost.value)
    lastModelRenderAt = 0
    renderArena()
  } catch (error) {
    console.warn('[DualFighter] Three.js renderer failed, using canvas fallback.', error)
    renderMode.value = 'canvas'
    localStorage.setItem('fighter_render_mode', 'canvas')
    initCanvasFallback()
    renderArena()
  }
}

const colorNumber = (value, fallback = 0xffffff) => {
  if (!value || typeof value !== 'string') return fallback
  return Number.parseInt(value.replace('#', ''), 16)
}

const withAlpha = (ctx, alpha, draw) => {
  const previousAlpha = ctx.globalAlpha
  ctx.globalAlpha = alpha
  draw()
  ctx.globalAlpha = previousAlpha
}

const fillRect = (ctx, x, y, width, height, color, alpha = 1) => {
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = color
    ctx.fillRect(x, y, width, height)
  })
}

const fillCircle = (ctx, x, y, radius, color, alpha = 1) => {
  withAlpha(ctx, alpha, () => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
  })
}

const strokeRect = (ctx, x, y, width, height, color, alpha = 1) => {
  withAlpha(ctx, alpha, () => {
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.strokeRect(x, y, width, height)
  })
}

const randomBetween = (min, max) => min + Math.random() * (max - min)

const effectCenter = (effect) => ({
  x: effect.x + effect.width / 2,
  y: effect.y + effect.height / 2,
})

const addParticleBurst = (x, y, color, count, options = {}) => {
  const spawnRadius = options.spawnRadius ?? 4
  // Quality-aware count: tier 1 → 0.7×, tier 0 → 0.45×
  const qScale = quality.tier === 2 ? 1 : quality.tier === 1 ? 0.7 : 0.45
  const final = Math.max(1, Math.round(count * qScale))
  for (let i = 0; i < final; i += 1) {
    const angle = options.angle ?? randomBetween(0, Math.PI * 2)
    const spread = options.spread ?? Math.PI * 2
    const theta = angle + randomBetween(-spread / 2, spread / 2)
    const speed = randomBetween(options.minSpeed ?? 90, options.maxSpeed ?? 420)
    pushFx('particles', {
      x: x + randomBetween(-spawnRadius, spawnRadius),
      y: y + randomBetween(-spawnRadius, spawnRadius),
      vx: Math.cos(theta) * speed + (options.vx ?? 0),
      vy: Math.sin(theta) * speed + (options.vy ?? 0),
      size: randomBetween(options.minSize ?? 2, options.maxSize ?? 8),
      color,
      life: randomBetween(options.minLife ?? 0.2, options.maxLife ?? 0.55),
      maxLife: options.maxLife ?? 0.55,
      gravity: options.gravity ?? 420,
      drag: options.drag ?? 0.9,
      shape: options.shape || 'spark',
    })
  }
}

const addRing = (x, y, color, radius, options = {}) => {
  pushFx('rings', {
    x,
    y,
    color,
    radius,
    maxRadius: options.maxRadius ?? radius * 2.8,
    life: options.life ?? 0.36,
    maxLife: options.life ?? 0.36,
    lineWidth: options.lineWidth ?? 5,
    scaleY: options.scaleY ?? 1,
  })
}

const addSlash = (effect, options = {}) => {
  const center = effectCenter(effect)
  pushFx('slashes', {
    x: center.x,
    y: center.y,
    width: effect.width,
    height: effect.height,
    color: effect.color || '#f8fafc',
    direction: effect.direction || 1,
    life: options.life ?? 0.22,
    maxLife: options.life ?? 0.22,
    angle: options.angle ?? -0.32,
    thickness: options.thickness ?? 16,
    trail: [{ x: center.x, y: center.y }],
  })
}

const addScreenFlash = (color, alpha = 0.18, life = 0.16) => {
  pushFx('flashes', { color, alpha, life, maxLife: life })
}

const addScreenShake = (amount) => {
  // Trauma model: trauma is squared into shake amplitude. amount roughly maps
  // to a 0..1 trauma. Calling addScreenShake(8) bumps trauma by ~0.45.
  const traumaAdd = Math.min(0.95, amount / 18)
  localFx.trauma = Math.min(1, localFx.trauma + traumaAdd)
}

const startHitStop = (ms, state) => {
  if (!ms) return
  const now = performance.now()
  if (now + ms <= localFx.hitStopUntil) return
  localFx.hitStopUntil = now + ms
  // Shallow snapshot — only what the renderer reads. Avoids structuredClone cost
  // on big nested state during HitStop bursts.
  const src = state || gameState.value
  if (!src) { localFx.frozenState = null; return }
  const snap = {
    map: src.map,
    items: (src.items || []).slice(),
    projectiles: (src.projectiles || []).slice(),
    effects: (src.effects || []).slice(),
    enemies: (src.enemies || []).slice(),
    players: {},
  }
  for (const slot in (src.players || {})) {
    snap.players[slot] = src.players[slot]
  }
  localFx.frozenState = snap
}

// Capacity-enforced push (FIFO drop). Avoids unbounded growth of fx arrays.
const pushFx = (key, item) => {
  const list = localFx[key]
  list.push(item)
  const cap = FX_CAPS[key] ? FX_CAPS[key]() : Infinity
  if (list.length > cap) list.splice(0, list.length - cap)
}

const addDamageText = (effect, options = {}) => {
  if (!effect.damage || effect.damage <= 0) return
  const center = effectCenter(effect)
  const heavy = options.heavy || effect.hitLevel === 'heavy'
  pushFx('damageTexts', {
    x: center.x + randomBetween(-10, 10),
    y: center.y - 10,
    vx: randomBetween(-18, 18),
    vy: heavy ? -110 : -82,
    value: Math.max(1, Math.round(effect.damage)),
    color: effect.blocked ? '#bfdbfe' : heavy ? '#f87171' : '#f8fafc',
    stroke: heavy ? '#7f1d1d' : '#020617',
    life: heavy ? 0.78 : 0.62,
    maxLife: heavy ? 0.78 : 0.62,
    scale: heavy ? 1.42 : 1.16,
  })
}

const addHitFlash = (slot, ms = 60) => {
  if (!slot || !ms) return
  pushFx('hitFlashes', {
    slot,
    life: ms / 1000,
    maxLife: ms / 1000,
  })
}

const addComboBurst = (slot, count) => {
  if (!slot || count < 2) return
  const player = gameState.value?.players?.[slot]
  const character = catalog.value.characters?.[player?.characterId]
  if (!player || !character) return
  pushFx('comboBursts', {
    x: player.x + character.width / 2,
    y: player.y - 28,
    count,
    life: 0.72,
    maxLife: 0.72,
  })
}

const addAfterimage = (player, character, alpha = 0.34) => {
  pushFx('afterimages', {
    x: player.x,
    y: player.y,
    w: character.width,
    h: character.height,
    color: character.color || '#f8fafc',
    facing: player.facing || 1,
    life: 0.28,
    maxLife: 0.28,
    alpha,
  })
}

// HitStop scaling by hit level / damage. Returns ms.
const hitStopFor = (effect) => {
  if (effect.hitStopMs) return effect.hitStopMs
  if (effect.blocked) return 50
  const dmg = effect.damage || 0
  if (effect.hitLevel === 'heavy' || dmg >= 22) return 180
  if (effect.hitLevel === 'enemy' || dmg >= 12) return 130
  if (dmg > 0) return 90
  return 0
}

// Trigger a zoom-punch centered between attacker/defender.
const triggerZoomPunch = (effect, intensity) => {
  if (!intensity) return
  const ax = effect.x + effect.width / 2
  const ay = effect.y + effect.height / 2
  let cx = ax
  let cy = ay
  const def = effect.defenderSlot && gameState.value?.players?.[effect.defenderSlot]
  if (def) {
    cx = (ax + (def.x + 30)) / 2
    cy = (ay + (def.y + 50)) / 2
  }
  if (intensity > localFx.zoomPunch) {
    localFx.zoomPunch = intensity
    localFx.zoomPunchTime = 0.16   // 160ms
    localFx.zoomCenter.x = cx
    localFx.zoomCenter.y = cy
  }
  localFx.vignetteBoost = Math.max(localFx.vignetteBoost, intensity * 0.6)
}

const spawnClientFxForEffect = (effect) => {
  const center = effectCenter(effect)
  const color = effect.color || '#f8fafc'
  const direction = effect.direction || 1
  const slashTypes = ['slash', 'cleave', 'wind_arc', 'wind_gain', 'shadow_cut', 'shadow_mark', 'air_slice', 'dash_light']
  const heavyTypes = ['haymaker', 'rush', 'fury_burst', 'guard_crush', 'air_slam', 'quake', 'bulwark', 'bulwark_crash']
  const hitTypes = ['blade_hit', 'fist_hit', 'shade_hit', 'guard_hit', 'projectile_hit', 'block_spark']

  if (effect.damage || effect.hitStopMs || effect.defenderSlot) {
    const hs = hitStopFor(effect)
    startHitStop(hs, gameState.value)
    addDamageText(effect, { heavy: effect.hitLevel === 'heavy' })
    addHitFlash(effect.defenderSlot, effect.flashWhiteMs || (effect.blocked ? 0 : 56))
    addComboBurst(effect.attackerSlot, effect.comboStep || 0)
    if (!effect.blocked) {
      // Map HitStop ms to a 0..1 punch intensity.
      const intensity = Math.min(1, hs / 200)
      triggerZoomPunch(effect, intensity)
    }
  }

  if (effect.type === 'wind_burst') {
    for (let i = -1; i <= 1; i += 1) {
      addSlash({ ...effect, y: effect.y + i * 18, height: effect.height * 0.55 }, { thickness: 18, life: 0.28 })
    }
    addRing(center.x, center.y, color, 34, { maxRadius: effect.width * 0.72, scaleY: 0.36, life: 0.38, lineWidth: 6 })
    addParticleBurst(center.x, center.y, color, 32, {
      angle: direction > 0 ? 0 : Math.PI,
      spread: 0.95,
      minSpeed: 220,
      maxSpeed: 680,
      minSize: 2,
      maxSize: 7,
      gravity: 80,
      shape: 'spark',
    })
    addScreenFlash(color, 0.16, 0.14)
    addScreenShake(8)
    return
  }

  if (effect.type === 'shadow_pop') {
    pushFx('afterimages', {
      x: effect.x - direction * 26,
      y: effect.y,
      w: effect.width,
      h: effect.height,
      color,
      facing: direction,
      life: 0.48,
      maxLife: 0.48,
      alpha: 0.5,
    })
    addRing(center.x, center.y, color, 16, { maxRadius: effect.width * 0.58, scaleY: 0.8, life: 0.34, lineWidth: 5 })
    addParticleBurst(center.x, center.y, color, 30, {
      minSpeed: 160,
      maxSpeed: 560,
      minSize: 2,
      maxSize: 7,
      gravity: -40,
      shape: 'spark',
    })
    addScreenFlash(color, 0.13, 0.12)
    addScreenShake(7)
    return
  }

  if (slashTypes.includes(effect.type)) {
    addSlash(effect, { thickness: effect.type === 'cleave' ? 24 : 16, life: 0.22 })
    addParticleBurst(center.x, center.y, color, 12, {
      angle: direction > 0 ? 0 : Math.PI,
      spread: 1.2,
      minSpeed: 130,
      maxSpeed: 430,
      minSize: 2,
      maxSize: 5,
      gravity: 120,
      shape: 'spark',
    })
    if (effect.type === 'dash_light') {
      localFx.speedLines.push({ x: center.x, y: center.y, direction, color, life: 0.22, maxLife: 0.22 })
      if (localFx.speedLines.length > FX_CAPS.speedLines()) localFx.speedLines.shift()
    }
    return
  }

  if (effect.type === 'sweep') {
    addRing(center.x, center.y + effect.height * 0.15, color, effect.width * 0.24, { maxRadius: effect.width * 0.72, scaleY: 0.18, life: 0.34 })
    addParticleBurst(center.x, center.y + 8, '#cbd5e1', 22, {
      angle: direction > 0 ? 0 : Math.PI,
      spread: 0.9,
      minSpeed: 80,
      maxSpeed: 260,
      minSize: 4,
      maxSize: 12,
      gravity: 260,
      shape: 'dust',
    })
    addScreenShake(3)
    return
  }

  if (effect.type === 'launcher') {
    addRing(center.x, center.y + effect.height * 0.32, color, 22, { maxRadius: effect.width * 0.36, scaleY: 0.35, life: 0.28 })
    addParticleBurst(center.x, center.y + effect.height * 0.26, color, 18, {
      angle: -Math.PI / 2,
      spread: 0.7,
      minSpeed: 180,
      maxSpeed: 520,
      minSize: 3,
      maxSize: 8,
      gravity: 180,
      shape: 'spark',
    })
    addScreenShake(5)
    return
  }

  if (heavyTypes.includes(effect.type)) {
    addRing(center.x, center.y + effect.height * 0.24, color, 26, { maxRadius: Math.max(effect.width, effect.height) * 0.58, scaleY: effect.type === 'air_slam' ? 0.24 : 0.42, life: 0.4, lineWidth: 7 })
    addParticleBurst(center.x, center.y, color, 26, {
      angle: direction > 0 ? 0 : Math.PI,
      spread: 1.8,
      minSpeed: 120,
      maxSpeed: 520,
      minSize: 4,
      maxSize: 11,
      gravity: 520,
      shape: 'chunk',
    })
    addScreenFlash(color, 0.14, 0.14)
    addScreenShake(effect.type === 'guard_crush' || effect.type === 'air_slam' ? 10 : 7)
    return
  }

  if (hitTypes.includes(effect.type)) {
    const blocked = effect.type === 'block_spark'
    addRing(center.x, center.y, blocked ? '#93c5fd' : color, 12, { maxRadius: blocked ? 46 : 62, life: 0.26, lineWidth: blocked ? 4 : 6 })
    const heavyHit = effect.hitLevel === 'heavy' || effect.hitLevel === 'enemy'
    addParticleBurst(center.x, center.y, blocked ? '#bfdbfe' : color, blocked ? 16 : heavyHit ? 34 : 24, {
      angle: direction > 0 ? 0 : Math.PI,
      spread: blocked ? 2.2 : 1.45,
      minSpeed: blocked ? 90 : heavyHit ? 220 : 170,
      maxSpeed: blocked ? 330 : heavyHit ? 780 : 620,
      minSize: 2,
      maxSize: blocked ? 6 : heavyHit ? 12 : 9,
      gravity: 360,
      shape: blocked ? 'spark' : 'chunk',
    })
    addScreenShake(effect.shake || (blocked ? 3 : 8))
    if (!blocked) addScreenFlash(color, heavyHit ? 0.18 : 0.12, heavyHit ? 0.16 : 0.12)
    return
  }

  if (['afterimage', 'blink'].includes(effect.type)) {
    pushFx('afterimages', {
      x: effect.x,
      y: effect.y,
      w: effect.width,
      h: effect.height,
      color,
      facing: direction,
      life: 0.42,
      maxLife: 0.42,
      alpha: 0.42,
    })
    addParticleBurst(center.x, center.y, color, 14, {
      minSpeed: 80,
      maxSpeed: 280,
      minSize: 2,
      maxSize: 6,
      gravity: 60,
      shape: 'spark',
    })
  }
}

const syncClientFxFromState = (state) => {
  ;(state?.effects || []).forEach((effect) => {
    if (!effect.id || localFx.seenEffects.has(effect.id)) return
    localFx.seenEffects.add(effect.id)
    audioEngine.playEffect(effect, state)
    spawnClientFxForEffect(effect)
  })
  if (localFx.seenEffects.size > 120) {
    localFx.seenEffects = new Set([...localFx.seenEffects].slice(-80))
  }
}

const updateLocalFx = (dt, state, now) => {
  const tick = Math.min(dt || 0, 1 / 24)
  // Trauma decays linearly; shake = trauma² * 16 (Eiserloh model).
  localFx.trauma = Math.max(0, localFx.trauma - tick * 1.6)
  localFx.shake = localFx.trauma * localFx.trauma * 16
  // Zoom punch decay (easeOutCubic over 0.16s window).
  if (localFx.zoomPunchTime > 0) {
    localFx.zoomPunchTime = Math.max(0, localFx.zoomPunchTime - tick)
    const t = localFx.zoomPunchTime / 0.16
    const ease = t * t * t
    localFx.zoomPunch *= ease > 0 ? 0.82 : 0
    if (localFx.zoomPunchTime <= 0) localFx.zoomPunch = 0
  }
  if (localFx.vignetteBoost > 0) {
    localFx.vignetteBoost = Math.max(0, localFx.vignetteBoost - tick * 3.5)
  }
  const frozen = now < localFx.hitStopUntil
  const fxTick = frozen ? Math.min(tick, 0.006) : tick

  const updateList = (list, updater) => {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const item = list[i]
      item.life -= fxTick
      updater?.(item, fxTick)
      if (item.life <= 0) list.splice(i, 1)
    }
  }

  updateList(localFx.particles, (item, delta) => {
    item.vy += item.gravity * delta
    item.vx *= Math.pow(item.drag, delta * 60)
    item.vy *= Math.pow(item.drag, delta * 40)
    item.x += item.vx * delta
    item.y += item.vy * delta
  })
  updateList(localFx.rings)
  updateList(localFx.slashes, (item) => {
    // No motion — just keep the trail array bounded (it's seeded at spawn).
    if (item.trail && item.trail.length > 6) item.trail.shift()
  })
  updateList(localFx.afterimages)
  updateList(localFx.speedLines)
  updateList(localFx.flashes)
  updateList(localFx.hitFlashes)
  updateList(localFx.comboBursts, (item, delta) => {
    item.y -= 18 * delta
  })
  updateList(localFx.damageTexts, (item, delta) => {
    item.x += item.vx * delta
    item.y += item.vy * delta
    item.vy += 120 * delta
  })

  if (!frozen && now - lastTrailAt > quality.trailIntervalMs) {
    Object.values(state?.players || {}).forEach((player) => {
      const character = catalog.value.characters?.[player.characterId]
      if (!character) return
      const fast = Math.abs(player.vx || 0) > 360
      const attacking = ['dash_light', 'air_light', 'air_heavy', 'blink'].includes(player.attackVariant)
      if (fast || attacking) {
        addAfterimage(player, character, attacking ? 0.42 : 0.24)
      }
    })
    lastTrailAt = now
  }
}

const drawLocalFxBack = (ctx) => {
  localFx.afterimages.forEach((image) => {
    const alpha = (image.life / image.maxLife) * image.alpha
    withAlpha(ctx, alpha, () => {
      const gradient = ctx.createLinearGradient(image.x, image.y, image.x + image.w * image.facing, image.y)
      gradient.addColorStop(0, image.color)
      gradient.addColorStop(1, 'rgba(248,250,252,0)')
      ctx.fillStyle = gradient
      ctx.fillRect(image.x, image.y + image.h * 0.18, image.w, image.h * 0.66)
      ctx.beginPath()
      ctx.arc(image.x + image.w / 2, image.y + image.h * 0.1, image.w * 0.25, 0, Math.PI * 2)
      ctx.fill()
    })
  })

  localFx.speedLines.forEach((line) => {
    const alpha = line.life / line.maxLife
    withAlpha(ctx, alpha * 0.55, () => {
      ctx.strokeStyle = line.color
      ctx.lineWidth = 3
      for (let i = 0; i < 9; i += 1) {
        const y = line.y + randomBetween(-50, 50)
        const x = line.x - line.direction * randomBetween(20, 90)
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x - line.direction * randomBetween(28, 80), y + randomBetween(-4, 4))
        ctx.stroke()
      }
    })
  })
}

const drawLocalFxFront = (ctx) => {
  const prevAlpha = ctx.globalAlpha
  const prevOp = ctx.globalCompositeOperation
  ctx.globalCompositeOperation = 'lighter'

  // Slashes: sweeping bezier "trail" + outer glow.
  for (let i = 0; i < localFx.slashes.length; i += 1) {
    const slash = localFx.slashes[i]
    const alpha = slash.life / slash.maxLife
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha
    ctx.save()
    ctx.translate(slash.x, slash.y)
    ctx.scale(slash.direction, 1)
    ctx.rotate(slash.angle)
    const w = slash.width * 0.48
    const h = Math.max(16, slash.height * 0.88)
    // Outer glow: thicker semi-transparent stroke.
    ctx.strokeStyle = slash.color
    ctx.lineWidth = (slash.thickness * 1.6) * alpha
    ctx.lineCap = 'round'
    ctx.globalAlpha = alpha * 0.35
    ctx.beginPath()
    ctx.ellipse(0, 0, w, h, 0, -1.15, 1.15)
    ctx.stroke()
    // Inner core: bright, thinner.
    ctx.globalAlpha = alpha
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(2, slash.thickness * 0.5 * alpha)
    ctx.beginPath()
    ctx.ellipse(0, 0, w, h, 0, -1.15, 1.15)
    ctx.stroke()
    ctx.restore()
  }

  // Rings.
  for (let i = 0; i < localFx.rings.length; i += 1) {
    const ring = localFx.rings[i]
    const progress = 1 - ring.life / ring.maxLife
    const radius = ring.radius + (ring.maxRadius - ring.radius) * progress
    ctx.globalAlpha = (ring.life / ring.maxLife) * 0.85
    ctx.save()
    ctx.translate(ring.x, ring.y)
    ctx.scale(1, ring.scaleY)
    ctx.strokeStyle = ring.color
    ctx.lineWidth = ring.lineWidth * (1 - progress * 0.65)
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }

  // Particles: sprite-blit hot path. drawImage of cached sprite is 5-10× faster
  // than per-particle createRadialGradient.
  for (let i = 0; i < localFx.particles.length; i += 1) {
    const p = localFx.particles[i]
    const alpha = p.life / p.maxLife
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha
    if (p.shape === 'dust') {
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, p.size * 1.6, p.size * 0.72, 0, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.shape === 'chunk') {
      ctx.fillStyle = p.color
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.x + p.y) * 0.02)
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
      ctx.restore()
    } else {
      const sprite = getSparkSprite(p.color)
      const r = p.size * 2.2
      ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2)
    }
  }

  ctx.globalCompositeOperation = prevOp
  ctx.globalAlpha = prevAlpha

  // Damage texts (normal alpha blending).
  for (let i = 0; i < localFx.damageTexts.length; i += 1) {
    const text = localFx.damageTexts[i]
    const progress = 1 - text.life / text.maxLife
    const alpha = text.life / text.maxLife
    if (alpha <= 0) continue
    const scale = text.scale * (1 + Math.max(0, 1 - progress * 2.4) * 0.22)
    ctx.globalAlpha = alpha
    ctx.save()
    ctx.translate(text.x, text.y)
    ctx.scale(scale, scale)
    ctx.font = '900 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 4
    ctx.strokeStyle = text.stroke
    ctx.fillStyle = text.color
    ctx.strokeText(String(text.value), 0, 0)
    ctx.fillText(String(text.value), 0, 0)
    ctx.restore()
  }

  for (let i = 0; i < localFx.comboBursts.length; i += 1) {
    const combo = localFx.comboBursts[i]
    const progress = 1 - combo.life / combo.maxLife
    const alpha = combo.life / combo.maxLife
    if (alpha <= 0) continue
    const pop = 1 + Math.max(0, 1 - progress * 2.2) * 0.55
    ctx.globalAlpha = alpha
    ctx.save()
    ctx.translate(combo.x, combo.y)
    ctx.scale(pop, pop)
    ctx.font = '900 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.lineWidth = 5
    ctx.strokeStyle = '#020617'
    ctx.fillStyle = '#fef3c7'
    const label = `${combo.count} HIT`
    ctx.strokeText(label, 0, 0)
    ctx.fillText(label, 0, 0)
    ctx.restore()
  }

  // Full-screen flashes (cheap: one fillRect each).
  for (let i = 0; i < localFx.flashes.length; i += 1) {
    const flash = localFx.flashes[i]
    const a = (flash.life / flash.maxLife) * flash.alpha
    if (a <= 0) continue
    ctx.globalAlpha = a
    ctx.fillStyle = flash.color
    ctx.fillRect(0, 0, 960, 540)
  }

  ctx.globalAlpha = prevAlpha
}

const drawTerrainBlock = (ctx, rect, color, accent = '#f8fafc') => {
  fillRect(ctx, rect.x, rect.y, rect.width, rect.height, color, 0.92)
  fillRect(ctx, rect.x, rect.y, rect.width, Math.min(7, rect.height), accent, 0.24)
  fillRect(ctx, rect.x, rect.y + rect.height, rect.width, 8, '#020617', 0.28)
  strokeRect(ctx, rect.x, rect.y, rect.width, rect.height, accent, 0.18)
}

const hazardColor = (hazard, map) => {
  const colors = {
    lava: '#fb923c',
    flame: '#f97316',
    spikes: '#f8fafc',
    pit: '#111827',
    water: '#38bdf8',
    void: '#020617',
  }
  return colors[hazard?.kind] || map?.accent || '#f97316'
}

const drawMapBackdrop = (ctx, map) => {
  fillRect(ctx, 0, 0, 960, 540, map?.sky || '#172033')
  if (map?.id === 'bamboo') {
    for (let x = 34; x < 960; x += 54) {
      fillRect(ctx, x, 74, 8, 360, '#214d3f', 0.58)
      fillCircle(ctx, x + 4, 120 + (x % 3) * 18, 28, '#2f6f55', 0.36)
      fillCircle(ctx, x + 16, 210, 22, '#166534', 0.22)
    }
    for (let y = 86; y < 420; y += 42) {
      fillRect(ctx, 0, y, 960, 2, '#bae6fd', 0.08)
    }
    return
  }
  if (map?.id === 'lava') {
    const t = performance.now() / 1000
    fillRect(ctx, 0, 414, 960, 126, '#431407', 0.8)
    for (let x = -20; x < 980; x += 84) {
      fillRect(ctx, x, 454 + Math.sin(x) * 8, 60, 18, '#f97316', 0.5)
      fillCircle(ctx, x + 30, 462, 22, '#fde68a', 0.12)
    }
    for (let i = 0; i < 18; i += 1) {
      const x = 22 + i * 54
      const lift = ((t * 34 + i * 17) % 74)
      const radius = 5 + (i % 4) * 2
      fillCircle(ctx, x, 520 - lift, radius, '#fed7aa', 0.22 + (i % 3) * 0.06)
      fillCircle(ctx, x + 12, 526 - ((lift + 27) % 78), Math.max(3, radius - 2), '#fb923c', 0.28)
    }
    for (let x = 116; x < 900; x += 126) {
      fillRect(ctx, x, 172, 48, 144, '#7f1d1d', 0.28)
      fillRect(ctx, x + 10, 156, 28, 20, '#f97316', 0.18)
    }
    return
  }
  if (map?.id === 'sky') {
    for (let i = 0; i < 9; i += 1) {
      const x = 80 + i * 105
      fillCircle(ctx, x, 100 + (i % 3) * 34, 44, '#60a5fa', 0.08)
      fillRect(ctx, x - 28, 170, 56, 280, '#1d4ed8', 0.08)
    }
    return
  }
  if (map?.id === 'reef') {
    const t = performance.now() / 1000
    fillRect(ctx, 0, 0, 960, 540, '#075985', 0.65)
    for (let y = 66; y < 520; y += 54) {
      fillRect(ctx, 0, y + Math.sin(t + y) * 4, 960, 2, '#bae6fd', 0.08)
    }
    for (let i = 0; i < 24; i += 1) {
      const x = 24 + i * 42
      const lift = ((t * 26 + i * 21) % 430)
      fillCircle(ctx, x, 514 - lift, 3 + (i % 4), '#cffafe', 0.18)
    }
    for (let x = 70; x < 930; x += 138) {
      fillRect(ctx, x, 392, 16, 84, '#164e63', 0.5)
      fillCircle(ctx, x + 8, 386, 24, '#fb7185', 0.18)
      fillCircle(ctx, x + 22, 410, 18, '#22c55e', 0.14)
    }
    fillRect(ctx, 420, 228, 120, 256, '#67e8f9', 0.06)
    return
  }
  if (map?.id === 'mirror') {
    for (let x = 70; x < 930; x += 150) {
      fillRect(ctx, x, 96, 46, 260, '#312e81', 0.46)
      strokeRect(ctx, x + 8, 118, 30, 110, '#c4b5fd', 0.18)
      fillCircle(ctx, x + 23, 260, 18, '#a78bfa', 0.09)
    }
    return
  }
  for (let x = 0; x < 960; x += 120) {
    fillRect(ctx, x + 20, 110, 52, 170, '#263244', 0.55)
    fillRect(ctx, x + 30, 94, 32, 24, '#94a3b8', 0.22)
    fillRect(ctx, x + 42, 130, 3, 132, '#020617', 0.2)
  }
}

const drawMapMechanics = (ctx, map) => {
  ;(map.forceZones || []).forEach((zone) => {
    const color = zone.kind === 'updraft' ? '#93c5fd' : zone.kind === 'pull' ? '#c4b5fd' : '#7dd3fc'
    fillRect(ctx, zone.x, zone.y, zone.width, zone.height, color, 0.08)
    const steps = Math.max(3, Math.floor(zone.height / 46))
    for (let i = 0; i < steps; i += 1) {
      const y = zone.y + 18 + i * 42
      const dir = zone.fxToCenter ? (i % 2 === 0 ? 1 : -1) : Math.sign(zone.fx || 0)
      const x = zone.x + zone.width / 2 - 18 * dir
      fillRect(ctx, x, y, 36 * dir || 3, 3, color, 0.42)
      fillCircle(ctx, x + 36 * dir, y + 1, 5, color, 0.45)
    }
    strokeRect(ctx, zone.x, zone.y, zone.width, zone.height, color, 0.16)
  })

  ;(map.jumpPads || []).forEach((pad) => {
    fillRect(ctx, pad.x, pad.y, pad.width, pad.height, '#22c55e', 0.82)
    fillRect(ctx, pad.x + 6, pad.y - 10, pad.width - 12, 6, '#bbf7d0', 0.46)
    strokeRect(ctx, pad.x, pad.y, pad.width, pad.height, '#f0fdf4', 0.42)
  })

  ;(map.portals || []).forEach((portal) => {
    fillRect(ctx, portal.x, portal.y, portal.width, portal.height, '#7c3aed', 0.24)
    strokeRect(ctx, portal.x, portal.y, portal.width, portal.height, '#ddd6fe', 0.68)
    fillCircle(ctx, portal.x + portal.width / 2, portal.y + portal.height / 2, portal.width * 0.55, '#c4b5fd', 0.18)
  })
}

const drawArenaMap = (ctx, map) => {
  drawMapBackdrop(ctx, map)
  const accent = map?.accent || '#f8fafc'
  const floorColor = map?.floor || '#6b7280'

  if (map?.groundSegments?.length) {
    ;(map.groundSegments || []).forEach((segment) => {
      const color = segment.id?.includes('water') ? '#256d85' : floorColor
      drawTerrainBlock(ctx, segment, color, accent)
      if (segment.id?.includes('water')) {
        for (let x = segment.x + 12; x < segment.x + segment.width; x += 34) {
          fillRect(ctx, x, segment.y + 8, 20, 3, '#bae6fd', 0.32)
        }
      }
    })
  } else {
    fillRect(ctx, 0, map.groundY, 960, 540 - map.groundY, floorColor)
  }

  ;(map.hazards || []).forEach((hazard) => {
    const color = hazardColor(hazard, map)
    if (hazard.kind === 'spikes') {
      for (let x = hazard.x; x < hazard.x + hazard.width; x += 14) {
        withAlpha(ctx, 0.78, () => {
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.moveTo(x, hazard.y + hazard.height)
          ctx.lineTo(x + 7, hazard.y)
          ctx.lineTo(x + 14, hazard.y + hazard.height)
          ctx.fill()
        })
      }
    } else if (hazard.kind === 'lava') {
      const t = performance.now() / 1000
      fillRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, color, 0.74)
      for (let i = 0; i < 9; i += 1) {
        const bx = hazard.x + 16 + i * (hazard.width / 9)
        const by = hazard.y + hazard.height - ((t * 48 + i * 19) % hazard.height)
        fillCircle(ctx, bx, by, 5 + (i % 3) * 2, '#fed7aa', 0.34)
      }
      strokeRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, '#fef3c7', 0.24)
    } else {
      fillRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, color, hazard.kind === 'void' ? 0.34 : 0.56)
      strokeRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, '#fef3c7', 0.22)
    }
  })

  ;(map.platforms || []).filter((platform) => !platform.move).forEach((platform) => {
    const color = platform.move ? '#fde68a' : '#d1d5db'
    drawTerrainBlock(ctx, platform, color, platform.move ? '#fbbf24' : '#f8fafc')
    if (platform.move) {
      fillRect(ctx, platform.x + 12, platform.y - 7, platform.width - 24, 3, '#f59e0b', 0.48)
    }
  })

  drawMapMechanics(ctx, map)

  withAlpha(ctx, 0.36, () => {
    ctx.strokeStyle = accent
    ctx.lineWidth = 4
    ctx.beginPath()
    if (map?.groundSegments?.length) {
      ;(map.groundSegments || []).forEach((segment) => {
        ctx.moveTo(segment.x, segment.y)
        ctx.lineTo(segment.x + segment.width, segment.y)
      })
    } else {
      ctx.moveTo(map.leftWall, map.groundY)
      ctx.lineTo(map.rightWall, map.groundY)
    }
    ctx.stroke()
  })
  fillRect(ctx, map.leftWall - 8, 96, 8, map.height - 150, accent, 0.2)
  fillRect(ctx, map.rightWall, 96, 8, map.height - 150, accent, 0.2)
}

// Bake the static portion of a map (backdrop + ground + platforms + walls + ground accent)
// into bgCanvas. Re-runs only when mapId changes. Hazards & mechanics stay dynamic
// because they animate (lava bubbles, force-zone arrows).
const bakeBackground = (map) => {
  if (!bgCtx || !map) return
  bgCtx.setTransform(1, 0, 0, 1, 0, 0)
  bgCtx.clearRect(0, 0, 960, 540)
  drawMapBackdrop(bgCtx, map)
  const accent = map?.accent || '#f8fafc'
  const floorColor = map?.floor || '#6b7280'
  if (map?.groundSegments?.length) {
    map.groundSegments.forEach((segment) => {
      const color = segment.id?.includes('water') ? '#256d85' : floorColor
      drawTerrainBlock(bgCtx, segment, color, accent)
      if (segment.id?.includes('water')) {
        for (let x = segment.x + 12; x < segment.x + segment.width; x += 34) {
          fillRect(bgCtx, x, segment.y + 8, 20, 3, '#bae6fd', 0.32)
        }
      }
    })
  } else {
    fillRect(bgCtx, 0, map.groundY, 960, 540 - map.groundY, floorColor)
  }
  // Platforms (static — bake them).
  ;(map.platforms || []).forEach((platform) => {
    const color = platform.move ? '#fde68a' : '#d1d5db'
    drawTerrainBlock(bgCtx, platform, color, platform.move ? '#fbbf24' : '#f8fafc')
    if (platform.move) {
      fillRect(bgCtx, platform.x + 12, platform.y - 7, platform.width - 24, 3, '#f59e0b', 0.48)
    }
  })
  // Ground accent stroke.
  bgCtx.globalAlpha = 0.36
  bgCtx.strokeStyle = accent
  bgCtx.lineWidth = 4
  bgCtx.beginPath()
  if (map?.groundSegments?.length) {
    map.groundSegments.forEach((segment) => {
      bgCtx.moveTo(segment.x, segment.y)
      bgCtx.lineTo(segment.x + segment.width, segment.y)
    })
  } else {
    bgCtx.moveTo(map.leftWall, map.groundY)
    bgCtx.lineTo(map.rightWall, map.groundY)
  }
  bgCtx.stroke()
  bgCtx.globalAlpha = 1
  // Walls.
  fillRect(bgCtx, map.leftWall - 8, 96, 8, map.height - 150, accent, 0.2)
  fillRect(bgCtx, map.rightWall, 96, 8, map.height - 150, accent, 0.2)
  bgCanvasMapId = map?.id || 'unknown'
}

// Draw hazards each frame (lava has animated bubbles, others are cheap).
const drawHazards = (ctx, map) => {
  ;(map?.hazards || []).forEach((hazard) => {
    const color = hazardColor(hazard, map)
    if (hazard.kind === 'spikes') {
      for (let x = hazard.x; x < hazard.x + hazard.width; x += 14) {
        ctx.globalAlpha = 0.78
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(x, hazard.y + hazard.height)
        ctx.lineTo(x + 7, hazard.y)
        ctx.lineTo(x + 14, hazard.y + hazard.height)
        ctx.fill()
      }
      ctx.globalAlpha = 1
    } else if (hazard.kind === 'lava') {
      const t = performance.now() / 1000
      fillRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, color, 0.74)
      for (let i = 0; i < 9; i += 1) {
        const bx = hazard.x + 16 + i * (hazard.width / 9)
        const by = hazard.y + hazard.height - ((t * 48 + i * 19) % hazard.height)
        fillCircle(ctx, bx, by, 5 + (i % 3) * 2, '#fed7aa', 0.34)
      }
      strokeRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, '#fef3c7', 0.24)
    } else {
      fillRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, color, hazard.kind === 'void' ? 0.34 : 0.56)
      strokeRect(ctx, hazard.x, hazard.y, hazard.width, hazard.height, '#fef3c7', 0.22)
    }
  })
}

const renderArena = (now = performance.now()) => {
  if (renderMode.value === 'model' && modelRenderer) {
    try {
      if (now - lastModelRenderAt < 1000 / 30) {
        return
      }
      lastModelRenderAt = now
      modelRenderer.render(gameState.value, catalog.value)
      return
    } catch (error) {
      console.warn('[DualFighter] Three.js render failed, using canvas fallback.', error)
      modelRenderer.destroy()
      modelRenderer = null
      renderMode.value = 'canvas'
      localStorage.setItem('fighter_render_mode', 'canvas')
      initCanvasFallback()
    }
  }
  if (!canvasCtx) {
    initCanvasFallback()
  }
  if (!canvasCtx) return
  const hitStopActive = now < localFx.hitStopUntil && localFx.frozenState
  const state = hitStopActive ? localFx.frozenState : gameState.value
  if (!hitStopActive && localFx.frozenState) {
    localFx.frozenState = null
  }
  const map = state?.map || catalog.value.maps?.stone
  const ctx = canvasCtx
  // Clear in CSS-pixel space (transform already applied by initCanvasFallback).
  ctx.clearRect(0, 0, 960, 540)
  ctx.save()

  // Camera transform: trauma shake + zoom punch around impact point.
  const shake = localFx.shake
  let shakeX = 0
  let shakeY = 0
  if (shake > 0.05) {
    shakeX = (Math.random() * 2 - 1) * shake
    shakeY = (Math.random() * 2 - 1) * shake
  }
  const punch = localFx.zoomPunch
  if (punch > 0.001) {
    const scale = 1 + punch * 0.05
    const cx = localFx.zoomCenter.x
    const cy = localFx.zoomCenter.y
    ctx.translate(cx + shakeX, cy + shakeY)
    ctx.scale(scale, scale)
    ctx.translate(-cx, -cy)
  } else if (shakeX || shakeY) {
    ctx.translate(shakeX, shakeY)
  }

  // Background: composite cached bgCanvas (static layer).
  if (bgCanvasMapId !== (map?.id || null)) {
    bakeBackground(map)
  }
  if (bgCanvas) {
    ctx.drawImage(bgCanvas, 0, 0)
  } else {
    drawArenaMap(ctx, map)
  }
  // Dynamic overlays: hazards (animated) + force zones / pads / portals.
  ;(map?.platforms || []).filter((platform) => platform.move).forEach((platform) => {
    drawTerrainBlock(ctx, platform, '#fde68a', '#fbbf24')
    fillRect(ctx, platform.x + 12, platform.y - 7, platform.width - 24, 3, '#f59e0b', 0.48)
  })
  drawHazards(ctx, map)
  drawMapMechanics(ctx, map)

  // Entities + back fx (afterimages, speed lines).
  drawLocalFxBack(ctx)
  ;(state?.items || []).forEach(drawItem)
  ;(state?.projectiles || []).forEach(drawProjectile)
  ;(state?.effects || []).forEach(drawEffect)
  ;(state?.enemies || []).forEach(drawEnemy)
  Object.values(state?.players || {}).forEach(drawFighter)
  drawLocalFxFront(ctx)

  ctx.restore()

  // Bloom post-process: half-res render of bright fx, blurred, additively composited.
  if (quality.bloom && fxCtx && bloomCtx) {
    fxCtx.setTransform(1, 0, 0, 1, 0, 0)
    fxCtx.clearRect(0, 0, 480, 270)
    fxCtx.save()
    fxCtx.scale(0.5, 0.5)
    fxCtx.globalCompositeOperation = 'lighter'
    // Re-rasterize the most luminous fx (slashes + particles + flashes) at half-res.
    drawBloomSource(fxCtx)
    fxCtx.restore()
    bloomCtx.setTransform(1, 0, 0, 1, 0, 0)
    bloomCtx.clearRect(0, 0, 480, 270)
    bloomCtx.filter = `blur(${quality.bloomBlurPx}px)`
    bloomCtx.drawImage(fxCanvas, 0, 0)
    bloomCtx.filter = 'none'
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = 0.85
    ctx.drawImage(bloomCanvas, 0, 0, 960, 540)
    ctx.restore()
  }

  // Vignette: cheap drawImage of pre-rendered radial gradient.
  if (vignetteCanvas) {
    const boost = localFx.vignetteBoost
    ctx.globalAlpha = 1
    ctx.drawImage(vignetteCanvas, 0, 0)
    if (boost > 0.01) {
      ctx.globalAlpha = boost * 0.4
      ctx.drawImage(vignetteCanvas, 0, 0)
      ctx.globalAlpha = 1
    }
  }
}

// Draw the subset of fx that drives bloom: slashes, sparks, flashes, hit rings.
// Runs at half resolution into fxCtx.
const drawBloomSource = (ctx) => {
  for (let i = 0; i < localFx.slashes.length; i += 1) {
    const slash = localFx.slashes[i]
    const alpha = slash.life / slash.maxLife
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha * 0.9
    ctx.save()
    ctx.translate(slash.x, slash.y)
    ctx.scale(slash.direction, 1)
    ctx.rotate(slash.angle)
    ctx.strokeStyle = slash.color
    ctx.lineWidth = slash.thickness * 1.4 * alpha
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.ellipse(0, 0, slash.width * 0.48, Math.max(16, slash.height * 0.88), 0, -1.15, 1.15)
    ctx.stroke()
    ctx.restore()
  }
  for (let i = 0; i < localFx.particles.length; i += 1) {
    const p = localFx.particles[i]
    if (p.shape !== 'spark') continue
    const alpha = p.life / p.maxLife
    if (alpha <= 0) continue
    ctx.globalAlpha = alpha * 0.7
    const sprite = getSparkSprite(p.color)
    const r = p.size * 2.2
    ctx.drawImage(sprite, p.x - r, p.y - r, r * 2, r * 2)
  }
  for (let i = 0; i < localFx.rings.length; i += 1) {
    const ring = localFx.rings[i]
    const progress = 1 - ring.life / ring.maxLife
    const radius = ring.radius + (ring.maxRadius - ring.radius) * progress
    ctx.globalAlpha = (ring.life / ring.maxLife) * 0.6
    ctx.save()
    ctx.translate(ring.x, ring.y)
    ctx.scale(1, ring.scaleY)
    ctx.strokeStyle = ring.color
    ctx.lineWidth = ring.lineWidth * 1.6
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
  ctx.globalAlpha = 1
}

const itemColor = (kind) => {
  const colors = {
    heal: '#22c55e',
    energy: '#38bdf8',
    haste: '#facc15',
    launch: '#93c5fd',
    shock: '#fb923c',
    swap: '#c084fc',
    shield: '#22d3ee',
    freeze: '#bfdbfe',
    bomb: '#f97316',
    anchor: '#94a3b8',
    tide: '#2dd4bf',
  }
  return colors[kind] || '#f8fafc'
}

const drawItem = (item) => {
  if (!canvasCtx) return
  const ctx = canvasCtx
  const color = itemColor(item.kind)
  const t = performance.now() / 1000
  const cx = item.x + item.width / 2
  const cy = item.y + item.height / 2 + Math.sin(t * 3 + cx) * 3
  const pulse = 1 + Math.sin(t * 5 + cx) * 0.08

  withAlpha(ctx, 0.28, () => {
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(cx, cy, Math.max(item.width, item.height) * 0.72 * pulse, 0, Math.PI * 2)
    ctx.stroke()
  })

  fillCircle(ctx, cx, cy, Math.max(item.width, item.height) * 0.42 * pulse, color, 0.78)
  fillCircle(ctx, cx, cy, Math.max(5, item.width * 0.16), '#f8fafc', 0.5)

  if (item.kind === 'heal') {
    fillRect(ctx, cx - 3, cy - 10, 6, 20, '#f0fdf4', 0.92)
    fillRect(ctx, cx - 10, cy - 3, 20, 6, '#f0fdf4', 0.92)
  } else if (item.kind === 'energy') {
    fillRect(ctx, cx - 12, cy - 3, 24, 6, '#e0f2fe', 0.9)
  } else if (item.kind === 'haste') {
    fillRect(ctx, cx - 12, cy + 5, 18, 4, '#fef9c3', 0.9)
    fillRect(ctx, cx - 4, cy - 3, 18, 4, '#fef9c3', 0.9)
  } else if (item.kind === 'launch') {
    withAlpha(ctx, 0.9, () => {
      ctx.fillStyle = '#eff6ff'
      ctx.beginPath()
      ctx.moveTo(cx, cy - 13)
      ctx.lineTo(cx + 9, cy + 8)
      ctx.lineTo(cx - 9, cy + 8)
      ctx.fill()
    })
  } else if (item.kind === 'swap') {
    strokeRect(ctx, cx - 10, cy - 10, 20, 20, '#f5f3ff', 0.8)
  } else if (item.kind === 'shock') {
    fillCircle(ctx, cx, cy, 4, '#fef3c7', 0.95)
    strokeRect(ctx, cx - 12, cy - 12, 24, 24, '#fef3c7', 0.52)
  } else if (item.kind === 'shield') {
    strokeRect(ctx, cx - 12, cy - 12, 24, 24, '#ecfeff', 0.8)
    fillCircle(ctx, cx, cy, 12, '#cffafe', 0.16)
  } else if (item.kind === 'freeze') {
    fillRect(ctx, cx - 10, cy - 10, 20, 20, '#eff6ff', 0.52)
    strokeRect(ctx, cx - 10, cy - 10, 20, 20, '#dbeafe', 0.82)
  } else if (item.kind === 'bomb') {
    fillCircle(ctx, cx, cy, 8, '#7f1d1d', 0.9)
    fillRect(ctx, cx + 4, cy - 12, 10, 4, '#fef3c7', 0.9)
  } else if (item.kind === 'anchor') {
    fillRect(ctx, cx - 4, cy - 12, 8, 22, '#e2e8f0', 0.82)
    fillRect(ctx, cx - 12, cy + 6, 24, 5, '#e2e8f0', 0.82)
  } else if (item.kind === 'tide') {
    withAlpha(ctx, 0.86, () => {
      ctx.strokeStyle = '#ccfbf1'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, 13, Math.PI * 0.15, Math.PI * 1.35)
      ctx.stroke()
    })
  }
}

const drawEnemy = (enemy) => {
  if (!canvasCtx) return
  const ctx = canvasCtx
  const x = enemy.x
  const y = enemy.y
  const w = enemy.width
  const h = enemy.height
  const dir = enemy.facing || 1

  ctx.save()
  ctx.translate(x + w / 2, y + h / 2)
  ctx.scale(dir, 1)
  if (enemy.kind === 'shark') {
    fillRect(ctx, -w * 0.42, -h * 0.28, w * 0.72, h * 0.56, '#64748b', 0.9)
    withAlpha(ctx, 0.9, () => {
      ctx.fillStyle = '#94a3b8'
      ctx.beginPath()
      ctx.moveTo(w * 0.3, 0)
      ctx.lineTo(w * 0.48, -h * 0.32)
      ctx.lineTo(w * 0.48, h * 0.32)
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-w * 0.12, -h * 0.28)
      ctx.lineTo(0, -h * 0.72)
      ctx.lineTo(w * 0.12, -h * 0.24)
      ctx.fill()
    })
    fillCircle(ctx, -w * 0.28, -h * 0.08, 3, '#f8fafc', 0.9)
  } else if (enemy.kind === 'whale') {
    fillRect(ctx, -w * 0.42, -h * 0.32, w * 0.78, h * 0.64, '#0e7490', 0.88)
    fillCircle(ctx, -w * 0.24, -h * 0.02, h * 0.34, '#67e8f9', 0.22)
    fillRect(ctx, w * 0.34, -h * 0.18, w * 0.16, h * 0.36, '#164e63', 0.86)
    fillCircle(ctx, -w * 0.34, -h * 0.12, 4, '#f8fafc', 0.9)
  } else if (enemy.kind === 'tiger') {
    fillRect(ctx, -w * 0.4, -h * 0.25, w * 0.74, h * 0.5, '#f97316', 0.9)
    fillCircle(ctx, -w * 0.34, -h * 0.06, h * 0.28, '#fed7aa', 0.9)
    for (let i = -2; i <= 2; i += 1) {
      fillRect(ctx, i * w * 0.09, -h * 0.24, 4, h * 0.48, '#111827', 0.36)
    }
    fillRect(ctx, w * 0.34, -3, w * 0.24, 5, '#fed7aa', 0.82)
  }
  ctx.restore()
}

const effectProgress = (effect) => {
  const maxTtl = effect.maxTtl || effect.ttl || 1
  return 1 - Math.max(0, Math.min(1, effect.ttl / maxTtl))
}

const drawEffect = (effect) => {
  if (!canvasCtx) return
  const ctx = canvasCtx
  const progress = effectProgress(effect)
  const fade = Math.max(0, 1 - progress)
  const color = effect.color || '#f8fafc'
  const cx = effect.x + effect.width / 2
  const cy = effect.y + effect.height / 2
  const dir = effect.direction || 1

  withAlpha(ctx, fade, () => {
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(dir, 1)
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 4

    if (['slash', 'cleave', 'wind_arc', 'wind_gain', 'shadow_cut', 'shadow_mark', 'air_slice', 'dash_light'].includes(effect.type)) {
      const radiusX = effect.width * (0.42 + progress * 0.18)
      const radiusY = effect.height * (0.5 + progress * 0.4)
      ctx.beginPath()
      ctx.ellipse(0, 0, radiusX, radiusY, -0.36, -1.05, 1.05)
      ctx.stroke()
      ctx.globalAlpha *= 0.32
      ctx.fillRect(-effect.width * 0.12, -effect.height * 0.18, effect.width * 0.52, effect.height * 0.36)
    } else if (effect.type === 'wind_burst') {
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath()
        ctx.ellipse(0, i * effect.height * 0.16, effect.width * (0.35 + progress * 0.2), effect.height * 0.16, -0.28, -1.05, 1.05)
        ctx.stroke()
      }
      ctx.globalAlpha *= 0.24
      ctx.fillRect(-effect.width * 0.5, -effect.height * 0.12, effect.width, effect.height * 0.24)
    } else if (['jab', 'haymaker', 'rush', 'launcher', 'fury_burst'].includes(effect.type)) {
      ctx.beginPath()
      if (effect.type === 'launcher') {
        ctx.moveTo(-effect.width * 0.25, effect.height * 0.34)
        ctx.quadraticCurveTo(effect.width * 0.02, -effect.height * (0.3 + progress), effect.width * 0.28, effect.height * 0.34)
        ctx.quadraticCurveTo(0, effect.height * 0.18, -effect.width * 0.25, effect.height * 0.34)
      } else if (effect.type === 'fury_burst') {
        ctx.rect(-effect.width * 0.38, -effect.height * 0.28, effect.width * (0.56 + progress * 0.36), effect.height * 0.56)
      } else {
        ctx.arc(effect.width * 0.24 * progress, 0, effect.height * (0.35 + progress * 0.45), 0, Math.PI * 2)
      }
      ctx.fill()
      ctx.strokeStyle = '#fef3c7'
      ctx.stroke()
    } else if (effect.type === 'shadow_pop') {
      ctx.globalAlpha *= 0.7
      ctx.fillRect(-effect.width * 0.38, -effect.height * 0.38, effect.width * 0.76, effect.height * 0.76)
      ctx.strokeStyle = '#f8fafc'
      ctx.beginPath()
      ctx.ellipse(0, 0, effect.width * (0.24 + progress * 0.34), effect.height * (0.24 + progress * 0.34), 0.4, 0, Math.PI * 2)
      ctx.stroke()
    } else if (['quake', 'bulwark', 'bulwark_crash', 'guard_ring', 'shield_bash', 'guard_crush', 'air_slam'].includes(effect.type)) {
      ctx.strokeStyle = effect.type === 'bulwark' || effect.type === 'guard_ring' || effect.type === 'bulwark_crash' ? '#fef3c7' : color
      ctx.beginPath()
      ctx.ellipse(0, effect.height * 0.2, effect.width * (0.34 + progress * 0.3), effect.height * (0.18 + progress * 0.22), 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha *= 0.35
      ctx.fillRect(-effect.width * 0.44, effect.height * 0.1, effect.width * 0.88, effect.type === 'bulwark_crash' ? 14 : 8)
    } else if (effect.type === 'sweep') {
      ctx.beginPath()
      ctx.ellipse(0, effect.height * 0.18, effect.width * (0.32 + progress * 0.42), effect.height * 0.52, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha *= 0.32
      ctx.fillRect(-effect.width * 0.5, effect.height * 0.06, effect.width, 7)
    } else if (effect.type?.startsWith('item_')) {
      ctx.beginPath()
      ctx.arc(0, 0, effect.width * (0.32 + progress * 0.48), 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha *= 0.36
      ctx.fillRect(-effect.width * 0.38, -4, effect.width * 0.76, 8)
      ctx.fillRect(-4, -effect.height * 0.38, 8, effect.height * 0.76)
    } else if (effect.type === 'enemy_whale_pulse') {
      ctx.strokeStyle = '#cffafe'
      ctx.beginPath()
      ctx.ellipse(0, 0, effect.width * (0.24 + progress * 0.48), effect.height * (0.18 + progress * 0.4), 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(0, 0, effect.width * (0.12 + progress * 0.34), effect.height * (0.1 + progress * 0.28), 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (effect.type?.startsWith('enemy_')) {
      ctx.fillRect(-effect.width * 0.42, -effect.height * 0.2, effect.width * 0.84, effect.height * 0.4)
      ctx.strokeStyle = '#f8fafc'
      ctx.strokeRect(-effect.width * 0.44, -effect.height * 0.22, effect.width * 0.88, effect.height * 0.44)
    } else if (effect.type === 'lava_burst') {
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath()
        ctx.arc(-effect.width * 0.36 + i * effect.width * 0.12, effect.height * (0.34 - progress), 8 + i % 3, 0, Math.PI * 2)
        ctx.fill()
      }
    } else if (effect.type === 'fall_return') {
      ctx.strokeStyle = '#e0f2fe'
      ctx.beginPath()
      ctx.ellipse(0, 0, effect.width * (0.36 + progress * 0.4), effect.height * (0.28 + progress * 0.35), 0, 0, Math.PI * 2)
      ctx.stroke()
    } else if (['afterimage', 'blink'].includes(effect.type)) {
      ctx.globalAlpha *= 0.42
      ctx.fillRect(-effect.width * 0.5, -effect.height * 0.5, effect.width, effect.height)
      ctx.strokeStyle = '#f8fafc'
      ctx.strokeRect(-effect.width * 0.55, -effect.height * 0.54, effect.width * 1.1, effect.height * 1.08)
    } else {
      ctx.beginPath()
      ctx.arc(0, 0, effect.width * (0.25 + progress * 0.35), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  })
}

const drawProjectile = (projectile) => {
  if (!canvasCtx) return
  const ctx = canvasCtx
  const color = projectile.color || '#38bdf8'
  if (projectile.kind === 'blade_arc') {
    const dir = projectile.vx >= 0 ? 1 : -1
    withAlpha(ctx, 0.86, () => {
      ctx.save()
      ctx.translate(projectile.x + projectile.width / 2, projectile.y + projectile.height / 2)
      ctx.scale(dir, 1)
      ctx.strokeStyle = color
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.ellipse(0, 0, projectile.width * 0.62, projectile.height * 1.25, -0.22, -0.9, 0.9)
      ctx.stroke()
      ctx.restore()
    })
    return
  }
  fillRect(ctx, projectile.x, projectile.y, projectile.width, projectile.height, color, 0.85)
  fillCircle(ctx, projectile.x + projectile.width, projectile.y + projectile.height / 2, projectile.height * 0.8, '#f8fafc', 0.28)
}

const drawFighter = (player) => {
  const character = catalog.value.characters?.[player.characterId]
  if (!character) return
  if (!canvasCtx) return
  const ctx = canvasCtx
  const color = character.color || '#38bdf8'
  const x = player.x
  const y = player.y
  const w = character.width
  const h = character.height
  const direction = player.facing || 1
  const alpha = player.stun > 0 ? 0.78 : 1
  const flash = localFx.hitFlashes.find((item) => item.slot === player.slot)
  const flashAlpha = flash ? Math.min(0.92, (flash.life / flash.maxLife) * 0.9) : 0

  if (player.attack) {
    const attack = player.activeAttack || character.attacks?.[player.attack] || {}
    const range = attack.range || 80
    const attackX = direction > 0 ? x + w : x - range
    const attackHeight = attack.area ? 58 : attack.low ? 22 : attack.launch ? h * 0.58 : (player.attack === 'heavy' ? 34 : 20)
    const attackY = attack.low ? y + h * 0.76 : attack.launch ? y + h * 0.18 : y + h * (player.attack === 'special' ? 0.28 : 0.34)
    fillRect(ctx, attackX, attackY, range, attackHeight, color, player.attack === 'special' ? 0.26 : 0.18)
    if (player.attack === 'heavy') {
      fillCircle(ctx, attackX + (direction > 0 ? range : 0), attackY + attackHeight / 2, 22, '#fef3c7', 0.25)
    }
    if (player.attack === 'special') {
      strokeRect(ctx, x - 18, y - 18, w + 36, h + 28, color, 0.58)
    }
  }

  const variant = player.attackVariant || player.attack
  const crouch = variant === 'sweep' || variant === 'guard_crush'
  const launchPose = variant === 'launcher'
  const airPose = variant === 'air_light' || variant === 'air_heavy'
  const bodyY = y + h * (crouch ? 0.34 : launchPose ? 0.14 : 0.22)
  const bodyH = h * (crouch ? 0.48 : 0.64)
  const bodyX = x + w * 0.18
  const bodyW = w * 0.64
  const palette = getBodyPalette(color)

  // Ground shadow (cached sprite). Anchored to bottom of player rect.
  const groundY = y + h
  const shadowSprite = getShadowSprite(w * 0.85)
  const sw = shadowSprite.width
  const sh = shadowSprite.height
  ctx.globalAlpha = 0.7
  ctx.drawImage(shadowSprite, x + w / 2 - sw / 2, groundY - sh / 2, sw, sh)
  ctx.globalAlpha = 1

  // Body: vertical gradient (light → base → dark).
  const bodyGrad = ctx.createLinearGradient(0, bodyY, 0, bodyY + bodyH)
  bodyGrad.addColorStop(0, palette.light)
  bodyGrad.addColorStop(0.55, palette.base)
  bodyGrad.addColorStop(1, palette.dark)
  ctx.globalAlpha = alpha
  ctx.fillStyle = bodyGrad
  ctx.fillRect(bodyX, bodyY, bodyW, bodyH)
  ctx.strokeStyle = palette.outline
  ctx.lineWidth = 2
  ctx.strokeRect(bodyX + 0.5, bodyY + 0.5, bodyW - 1, bodyH - 1)

  // Head: white circle + small inner highlight crescent.
  const headCx = x + w / 2
  const headCy = y + h * (crouch ? 0.23 : airPose ? 0.08 : 0.13)
  const headR = w * 0.28
  ctx.fillStyle = '#f8fafc'
  ctx.beginPath()
  ctx.arc(headCx, headCy, headR, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = palette.outline
  ctx.lineWidth = 1.5
  ctx.stroke()
  // Highlight crescent.
  ctx.globalAlpha = alpha * 0.55
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(headCx - direction * headR * 0.32, headCy - headR * 0.32, headR * 0.42, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = alpha

  // Legs.
  ctx.fillStyle = '#111827'
  ctx.fillRect(x + w * 0.24, y + h * 0.86, w * 0.17, h * 0.14)
  ctx.fillRect(x + w * 0.59, y + h * 0.86, w * 0.17, h * 0.14)

  // Arm: gradient from shoulder light to fist dark.
  const armX = direction > 0 ? x + w * 0.48 : x + w * 0.48 - w * 0.74
  const armY = y + h * (launchPose ? 0.28 : crouch ? 0.58 : 0.44)
  const armGrad = ctx.createLinearGradient(armX, armY, armX + w * 0.74 * direction, armY)
  armGrad.addColorStop(0, '#ffffff')
  armGrad.addColorStop(1, palette.dark)
  ctx.globalAlpha = 0.9
  ctx.fillStyle = armGrad
  ctx.fillRect(armX, armY, w * 0.74, 6)
  ctx.globalAlpha = 1

  if (player.windStacks > 0) {
    for (let i = 0; i < player.windStacks; i += 1) {
      withAlpha(ctx, 0.22 + i * 0.08, () => {
        ctx.strokeStyle = '#7dd3fc'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(x + w / 2, y + h * (0.36 + i * 0.12), w * (0.55 + i * 0.08), h * 0.14, -0.28, 0, Math.PI * 2)
        ctx.stroke()
      })
    }
  }

  if (player.fury > 0) {
    const furyAlpha = Math.min(0.34, player.fury / 280)
    fillCircle(ctx, x + w / 2, y + h * 0.48, Math.max(w, h) * (0.22 + player.fury / 420), '#ef4444', furyAlpha)
  }

  if (player.shadowStacks > 0) {
    for (let i = 0; i < player.shadowStacks; i += 1) {
      fillRect(ctx, x - direction * (10 + i * 8), y + h * (0.28 + i * 0.08), w * 0.44, h * 0.34, '#a78bfa', 0.12)
    }
  }

  if (player.bulwarkStacks > 0) {
    for (let i = 0; i < Math.floor(player.bulwarkStacks); i += 1) {
      strokeRect(ctx, x - 9 - i * 3, y + h * 0.24 - i * 3, w + 18 + i * 6, h * 0.58 + i * 6, '#fbbf24', 0.16 + i * 0.05)
    }
  }

  if (player.armorTimer > 0) {
    strokeRect(ctx, x - 8, y + h * 0.18, w + 16, h * 0.66, '#fef3c7', 0.36)
  }

  if (player.fortifyTimer > 0) {
    fillCircle(ctx, x + w / 2, y + h * 0.48, Math.max(w, h) * 0.46, '#fbbf24', 0.16)
  }

  if (player.shadowMark > 0) {
    fillCircle(ctx, x + w / 2, y + h * 0.12, w * 0.18, '#c084fc', 0.58)
  }

  if (player.hasteTimer > 0) {
    fillRect(ctx, x - 12, y + h * 0.68, w * 0.52, 4, '#facc15', 0.42)
    fillRect(ctx, x + w * 0.62, y + h * 0.76, w * 0.52, 4, '#facc15', 0.42)
  }

  if (player.comboStep > 1) {
    for (let i = 0; i < player.comboStep; i += 1) {
      fillCircle(ctx, x + w * (0.25 + i * 0.22), y - 8, 4, '#fef3c7', 0.82)
    }
  }

  if (player.comboName && player.comboTextTimer > 0) {
    withAlpha(ctx, Math.min(1, player.comboTextTimer), () => {
      ctx.fillStyle = '#fef3c7'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(player.comboName, x + w / 2, y - 18)
    })
  }

  if (player.resourceText && player.resourceTextTimer > 0) {
    withAlpha(ctx, Math.min(1, player.resourceTextTimer), () => {
      ctx.fillStyle = character.resource?.color || color
      ctx.font = 'bold 12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(player.resourceText, x + w / 2, y - (player.comboName ? 34 : 18))
    })
  }

  if (player.blocking) {
    const shieldX = direction > 0 ? x + w + 5 : x - 17
    fillRect(ctx, shieldX, y + h * 0.25, 12, h * 0.5, '#93c5fd', 0.6)
  }

  if (flashAlpha > 0) {
    const prevOp = ctx.globalCompositeOperation
    ctx.globalCompositeOperation = 'screen'
    ctx.globalAlpha = flashAlpha
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 4, y + h * 0.12, w + 8, h * 0.78)
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h * 0.1, w * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = prevOp
    ctx.globalAlpha = 1
  }
}

const sampleFrameTiming = (frameMs) => {
  // Track last 60 frames; if avg > 18ms downgrade quality, if avg < 10ms upgrade.
  const samples = quality.fpsSamples
  samples.push(frameMs)
  if (samples.length > 60) samples.shift()
  if (frameMs > 22) quality.slowFrames += 1; else quality.slowFrames = Math.max(0, quality.slowFrames - 1)
  if (frameMs < 10) quality.fastFrames += 1; else quality.fastFrames = 0

  if (quality.slowFrames > 24 && quality.tier > 0) {
    quality.tier -= 1
    applyQualityTier()
    quality.slowFrames = 0
  } else if (quality.fastFrames > 240 && quality.tier < 2) {
    quality.tier += 1
    applyQualityTier()
    quality.fastFrames = 0
  }
}

const applyQualityTier = () => {
  if (quality.tier >= 2) {
    quality.bloom = true
    quality.particleCap = 240
    quality.bloomBlurPx = 6
    quality.trailIntervalMs = 55
  } else if (quality.tier === 1) {
    quality.bloom = true
    quality.particleCap = 140
    quality.bloomBlurPx = 4
    quality.trailIntervalMs = 90
  } else {
    quality.bloom = false
    quality.particleCap = 80
    quality.bloomBlurPx = 0
    quality.trailIntervalMs = 140
  }
}

const startAnimationLoop = () => {
  if (animationFrameId) return
  lastFrameAt = performance.now()
  const FRAME_BUDGET_MS = 1000 / 60 - 1   // ~16.6ms; cap at ~60fps even on 120/144Hz screens
  const frame = (now) => {
    const dt = (now - lastFrameAt) / 1000
    if ((now - lastFrameAt) < FRAME_BUDGET_MS) {
      animationFrameId = window.requestAnimationFrame(frame)
      return
    }
    const t0 = now
    lastFrameAt = now
    updateLocalFx(dt, gameState.value, now)
    renderArena(now)
    sampleFrameTiming(performance.now() - t0)
    animationFrameId = window.requestAnimationFrame(frame)
  }
  animationFrameId = window.requestAnimationFrame(frame)
}

const stopAnimationLoop = () => {
  if (!animationFrameId) return
  window.cancelAnimationFrame(animationFrameId)
  animationFrameId = null
}

watch(gameState, async () => {
  syncDelayedHealthBars()
  audioEngine.syncMatchState(gameState.value)
  syncClientFxFromState(gameState.value)
  await ensureRenderer()
  renderArena()
})

onMounted(async () => {
  await loadCatalog()
  await refreshAll()
  await ensureRenderer()
  renderArena()
  startAnimationLoop()
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
  Object.values(delayedHpTimers).forEach((timer) => window.clearTimeout(timer))
  stopAnimationLoop()
  if (modelRenderer) {
    modelRenderer.destroy()
    modelRenderer = null
  }
  audioEngine.destroy()
  canvasCtx = null
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
  gap: 5px 8px;
  align-items: center;
}

.character-btn small {
  grid-column: 2;
  color: #cbd5e1;
}

.character-style,
.character-trait,
.character-combo,
.stat-grid {
  grid-column: 2;
}

.character-style {
  color: #fef3c7;
  font-size: 12px;
  font-weight: 800;
}

.character-trait,
.character-combo {
  color: #cbd5e1;
  font-size: 11px;
  line-height: 1.35;
}

.character-combo {
  color: #93c5fd;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 5px;
  margin-top: 3px;
}

.stat-row {
  display: grid;
  gap: 3px;
}

.stat-row em {
  color: #cbd5e1;
  font-size: 10px;
  font-style: normal;
}

.stat-row i,
.resource-shell i {
  height: 5px;
  background: rgba(15, 23, 42, 0.9);
  border-radius: 999px;
  overflow: hidden;
}

.stat-row b,
.resource-shell b {
  display: block;
  height: 100%;
  background: #5eead4;
  border-radius: inherit;
}

.map-btn small {
  display: block;
  margin-top: 4px;
  color: #cbd5e1;
  font-size: 12px;
  line-height: 1.35;
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
  position: relative;
}

.energy-shell {
  height: 6px;
  margin-top: 6px;
}

.health-fill {
  position: relative;
  z-index: 2;
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #facc15, #ef4444);
  transition: width 80ms linear;
}

.health-lag {
  position: absolute;
  inset: 0 auto 0 0;
  z-index: 1;
  height: 100%;
  background: rgba(254, 240, 138, 0.88);
  transition: width 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.energy-fill {
  height: 100%;
  background: #38bdf8;
}

.resource-shell {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
  color: #e5e7eb;
  font-size: 11px;
  font-weight: 800;
}

.hud-player.p2 .resource-shell {
  grid-template-columns: 1fr auto;
}

.hud-player.p2 .resource-shell span {
  order: 2;
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
  min-height: 320px;
  aspect-ratio: 16 / 9;
  overflow: auto;
  background: #020617;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 8px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.32);
}

.canvas-host :deep(canvas) {
  width: 100%;
  max-width: 960px;
  height: auto;
  aspect-ratio: 16 / 9;
  display: block;
  margin: 0 auto;
}

.fighter-fallback-canvas {
  background: #172033;
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
