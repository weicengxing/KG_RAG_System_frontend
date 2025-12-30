<template>
  <div class="game-container">
    <!-- 游戏画布容器 -->
    <div class="game-canvas-wrapper" ref="canvasWrapper">
      <!-- Three.js 会自动创建 canvas -->
      <!-- 性能监视器 -->
      <div class="performance-monitor" v-if="showPerformance">
        <div class="monitor-item">FPS: {{ fps }}</div>
        <div class="monitor-item">延迟: {{ latency }}ms</div>
        <div class="monitor-item">在线玩家: {{ playerCount }}</div>
        <div class="monitor-item">地图: {{ currentMap }}</div>
        <div class="monitor-item">已加载物体: {{ loadedObjectsCount }}/{{ totalObjectsCount }}</div>
      </div>
    </div>

    <!-- 游戏 UI 层 -->
    <div class="game-ui">
      <!-- 顶部信息栏 -->
      <div class="top-bar">
        <div class="player-info">
          <div class="info-item">
            <span class="info-label">血量:</span>
            <div class="health-bar">
              <div class="health-fill" :style="{ width: playerHealth + '%' }"></div>
            </div>
            <span class="info-value">{{ playerHealth }}/100</span>
          </div>
          <div class="info-item">
            <span class="info-label">等级:</span>
            <span class="info-value">{{ playerLevel }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">坐标:</span>
            <span class="info-value">({{ Math.round(playerX) }}, {{ Math.round(playerZ) }})</span>
          </div>
        </div>

        <div class="game-controls">
          <button @click="saveMap" class="control-btn">
            💾 保存地图
          </button>
          <button @click="loadMap" class="control-btn">
            📂 加载地图
          </button>
          <button @click="togglePerformance" class="control-btn">
            {{ showPerformance ? '隐藏监视器' : '显示监视器' }}
          </button>
          <button @click="toggleFullscreen" class="control-btn">
            {{ isFullscreen ? '退出全屏' : '全屏' }}
          </button>
        </div>
      </div>

      <!-- 聊天窗口 -->
      <div class="chat-window" v-if="showChat">
        <div class="chat-header">
          <span>聊天 (按 T 打开)</span>
          <button @click="showChat = false" class="close-btn">×</button>
        </div>
        <div class="chat-messages" ref="chatMessages">
          <div
            v-for="(msg, index) in chatMessages"
            :key="index"
            class="chat-message"
            :class="{ 'own-message': msg.isOwn, 'system-message': msg.isSystem }"
          >
            <span class="message-sender">{{ msg.sender }}:</span>
            <span class="message-text">{{ msg.text }}</span>
          </div>
        </div>
        <div class="chat-input">
          <input
            ref="chatInputEl"
            v-model="chatInput"
            @keydown="handleChatKeyDown"
            placeholder="Enter 或 Ctrl+P 发送消息..."
            maxlength="100"
          />
        </div>
      </div>

      <!-- 聊天按钮（收起时显示） -->
      <button v-if="!showChat" @click="openChat" class="chat-toggle-btn">
        💬 聊天 (T)
      </button>

      <!-- 游戏说明 -->
      <div class="game-instructions" v-if="showInstructions">
        <div class="instructions-header">
          <span>游戏说明</span>
          <button @click="showInstructions = false" class="close-btn">×</button>
        </div>
        <div class="instructions-content">
          <h3>控制说明：</h3>
          <ul>
            <li>WASD：移动角色</li>
            <li>鼠标拖拽：旋转视角</li>
            <li>鼠标滚轮：缩放视角</li>
            <li>T：打开聊天</li>
            <li>ESC：打开/关闭菜单</li>
            <li>空格：跳跃</li>
          </ul>
          <h3>游戏目标：</h3>
          <ul>
            <li>探索 3D 世界地图</li>
            <li>与其他玩家实时互动</li>
            <li>收集资源，提升等级</li>
          </ul>
          <h3>多人模式：</h3>
          <ul>
            <li>实时同步所有玩家位置</li>
            <li>支持聊天交流</li>
            <li>地图可保存和加载</li>
          </ul>
        </div>
      </div>

      <!-- 连接状态提示 -->
      <div class="connection-status" :class="connectionStatus">
        <span v-if="connectionStatus === 'connecting'">🔄 连接服务器中...</span>
        <span v-if="connectionStatus === 'connected'">✅ 已连接</span>
        <span v-if="connectionStatus === 'disconnected'">❌ 连接断开</span>
        <span v-if="connectionStatus === 'reconnecting'">🔄 重新连接中...</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { WorldEntityManager } from '../game/worldEntityManager.js'
import { createWeatherSystem } from '../game/weatherSystem.js'

// 游戏状态
const canvasWrapper = ref(null)
const showPerformance = ref(true)
const showChat = ref(false)
const showInstructions = ref(true)
const isFullscreen = ref(false)

// 性能监控
const fps = ref(60)
const latency = ref(0)
const playerCount = ref(1)
const currentMap = ref('默认地图')
const mapSeed = ref(null)
const mapEnvironment = ref(null)
const loadedObjectsCount = ref(0)
const totalObjectsCount = ref(0)

// 玩家状态
const playerHealth = ref(100)
const playerLevel = ref(1)
const playerX = ref(0)
const playerZ = ref(0)
const playerId = ref(null)
const playerName = ref('我')

// 聊天
const chatMessages = ref([
  { sender: '系统', text: '欢迎来到 3D 游戏世界！', isOwn: false, isSystem: true }
])
const chatInput = ref('')
const chatMessagesEl = ref(null)
const chatInputEl = ref(null)

// 连接状态
const connectionStatus = ref('connecting')

// Three.js 相关
let scene, camera, renderer, controls
let localPlayer = null
let remotePlayers = new Map()
let terrain = null
let ws = null
let lastFrameTime = Date.now()
let frameCount = 0
let clock = new THREE.Clock()
let world = null
let weatherSystem = null

// 相机跟随（不覆盖玩家手动旋转视角）
const cameraFollowTarget = new THREE.Vector3()
const cameraTargetOffset = new THREE.Vector3(0, 1.2, 0)
let hasCameraFollowTarget = false
const tempDesiredTarget = new THREE.Vector3()
const tempDeltaTarget = new THREE.Vector3()

// 装饰物管理（用于懒加载）
let decorations = [] // 所有装饰物的数据
const loadDistance = 80 // 加载距离
const unloadDistance = 100 // 卸载距离

let heartbeatTimerId = null

// 键盘状态
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false
}

// 玩家移动速度
const moveSpeed = 10
const jumpPower = 5
let velocity = new THREE.Vector3()
const gravity = -20
const playerRadius = 0.7

const PLAYER_STAND_HEIGHT = 2

const getSeaLevel = () => {
  const sea = mapEnvironment.value?.seaLevel
  return (typeof sea === 'number' && Number.isFinite(sea)) ? sea : -0.8
}

const getTerrainHeightAt = (x, z) => {
  if (!terrain?.geometry) return null
  const geometry = terrain.geometry
  const params = geometry.parameters || {}
  const width = params.width
  const height = params.height
  const widthSegments = params.widthSegments
  const heightSegments = params.heightSegments

  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof widthSegments !== 'number' ||
    typeof heightSegments !== 'number'
  ) {
    return null
  }

  const local = terrain.worldToLocal(new THREE.Vector3(x, 0, z))
  const u = (local.x + width / 2) / width
  const v = (local.y + height / 2) / height

  if (u < 0 || u > 1 || v < 0 || v > 1) return null

  const ix = u * widthSegments
  const iz = v * heightSegments
  const x0 = Math.floor(ix)
  const z0 = Math.floor(iz)
  const x1 = Math.min(x0 + 1, widthSegments)
  const z1 = Math.min(z0 + 1, heightSegments)
  const tx = ix - x0
  const tz = iz - z0

  const positions = geometry.attributes.position.array
  const stride = 3
  const rowStride = (widthSegments + 1) * stride

  const heightAt = (xi, zi) => {
    const idx = zi * rowStride + xi * stride
    return positions[idx + 2]
  }

  const h00 = heightAt(x0, z0)
  const h10 = heightAt(x1, z0)
  const h01 = heightAt(x0, z1)
  const h11 = heightAt(x1, z1)

  const h0 = h00 * (1 - tx) + h10 * tx
  const h1 = h01 * (1 - tx) + h11 * tx
  const hLocal = h0 * (1 - tz) + h1 * tz

  const worldPoint = terrain.localToWorld(new THREE.Vector3(local.x, local.y, hLocal))
  return worldPoint.y
}

const getGroundHeightAt = (x, z) => {
  const seaLevel = getSeaLevel()
  const oceanFloorY = seaLevel - 40

  const terrainY = getTerrainHeightAt(x, z)
  if (terrainY === null) return oceanFloorY

  // 水面区域：地形低于海平面，则失去地面支撑，直接掉到海底
  if (terrainY < seaLevel) return oceanFloorY

  // 陆地区域：站在地形上
  return terrainY + PLAYER_STAND_HEIGHT
}

// 初始化游戏
const initGame = async () => {
  try {
    // 创建场景
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87CEEB) // 天空蓝
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500)
    world = new WorldEntityManager({ scene, loadDistance, unloadDistance })
    weatherSystem = createWeatherSystem(scene)

    // 创建相机
    camera = new THREE.PerspectiveCamera(
      75,
      canvasWrapper.value.clientWidth / canvasWrapper.value.clientHeight,
      0.1,
      1000
    )
    // 调整相机初始位置：从后方（-Z）看向前方（+Z），这样W键往前走就很自然
    camera.position.set(0, 10, 20)

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(canvasWrapper.value.clientWidth, canvasWrapper.value.clientHeight)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    canvasWrapper.value.appendChild(renderer.domElement)

    // 添加控制器
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.1 // 防止相机穿过地面
    controls.minDistance = 5
    controls.maxDistance = 50
    controls.target.copy(cameraFollowTarget)
    hasCameraFollowTarget = true

    // 配置鼠标按钮：右键旋转，滚轮缩放，禁用左键平移
    controls.mouseButtons = {
      LEFT: null,  // 禁用左键
      MIDDLE: THREE.MOUSE.DOLLY,  // 中键缩放
      RIGHT: THREE.MOUSE.ROTATE   // 右键旋转
    }

    // 禁用右键菜单
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())

    // 定义全局复用变量，避免在循环中重复创建（优化性能）
    const tempCameraPosition = new THREE.Vector3()
    const tempTargetPosition = new THREE.Vector3()
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(50, 100, 50)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -50
    directionalLight.shadow.camera.right = 50
    directionalLight.shadow.camera.top = 50
    directionalLight.shadow.camera.bottom = -50
    directionalLight.shadow.mapSize.width = 1024  // 降低阴影贴图分辨率以提升性能
    directionalLight.shadow.mapSize.height = 1024
    scene.add(directionalLight)

    // 创建地形
    createTerrain()

    // 创建本地玩家
    createLocalPlayer()

    // 初始化 WebSocket 连接
    initWebSocket()

    // 监听键盘事件
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)

    // 启动渲染循环
    animate()

    console.log('3D 游戏初始化成功')
  } catch (error) {
    console.error('游戏初始化失败:', error)
    connectionStatus.value = 'disconnected'
  }
}

const resetLoadedDecorations = () => {
  world?.resetLoadedDecorations()
  loadedObjectsCount.value = 0
}

const applyEnvironment = (environment) => {
  if (!scene || !environment) return

  mapEnvironment.value = environment
  world?.setEnvironment(environment)
  weatherSystem?.apply(environment.weather || 'sunny')
}

const clearRemotePlayers = () => {
  if (!scene) {
    remotePlayers.clear()
    return
  }

  remotePlayers.forEach((player) => {
    scene.remove(player.mesh)
  })
  remotePlayers.clear()
}

const applyMapData = (mapData) => {
  if (!mapData) return

  mapSeed.value = mapData.seed ?? null
  const serverDecorations = Array.isArray(mapData.decorations) ? mapData.decorations : []

  decorations = serverDecorations
  totalObjectsCount.value = decorations.length

  world?.setSeed(mapData.seed ?? 0)
  resetLoadedDecorations()
  world?.setDecorations(decorations)

  if (mapData.environment) applyEnvironment(mapData.environment)
}

// 创建地形
const createTerrain = () => {
  // 创建地面网格 - 降低分段数以提升性能
  const gridSize = 200
  const segments = 30  // 从 50 降低到 30
  const geometry = new THREE.PlaneGeometry(gridSize, gridSize, segments, segments)

  // 添加随机高度（简单的地形）
  const vertices = geometry.attributes.position.array
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]
    const z = vertices[i + 1]
    // 使用简单的噪声函数生成高度
    vertices[i + 2] = Math.sin(x / 10) * Math.cos(z / 10) * 2
  }
  geometry.computeVertexNormals()

  // 创建材质
  const material = new THREE.MeshStandardMaterial({
    color: 0x228B22,
    roughness: 0.8,
    metalness: 0.2,
    wireframe: false
  })

  terrain = new THREE.Mesh(geometry, material)
  terrain.rotation.x = -Math.PI / 2
  terrain.receiveShadow = true
  scene.add(terrain)

  // 添加网格辅助线 - 降低分段数
  const gridHelper = new THREE.GridHelper(gridSize, segments, 0x888888, 0x444444)
  gridHelper.position.y = 0.01
  scene.add(gridHelper)
}

// 根据玩家位置动态加载/卸载装饰物（AOI 懒加载）
const updateDecorations = () => {
  if (!localPlayer) return
  world?.updateDecorations(localPlayer.position)
  loadedObjectsCount.value = world?.getLoadedCount() ?? 0
}

// 创建本地玩家
const createLocalPlayer = () => {
  localPlayer = createPlayer(0x3498db, '你')

  scene.add(localPlayer)
}

// 创建玩家模型（3D 角色）
const createPlayer = (color, name) => {
  const player = new THREE.Group()

  // 身体
  const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.castShadow = true
  player.add(body)

  // 头部
  const headGeometry = new THREE.SphereGeometry(0.4, 16, 16)
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.y = 1.5
  head.castShadow = true
  player.add(head)

  // 玩家名称标签
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = 256
  canvas.height = 64
  context.font = 'Bold 40px Arial'
  context.fillStyle = 'white'
  context.textAlign = 'center'
  context.fillText(name, 128, 45)

  const texture = new THREE.CanvasTexture(canvas)
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(2, 0.5, 1)
  sprite.position.y = 2.5
  player.add(sprite)

  return player
}

// 创建远程玩家
const createRemotePlayer = (id, data) => {
  const existing = remotePlayers.get(id)
  if (existing) {
    existing.targetPosition.set(data.x || 0, data.y || 2, data.z || 0)
    existing.currentPosition.set(data.x || 0, data.y || 2, data.z || 0)
    existing.mesh.position.set(data.x || 0, data.y || 2, data.z || 0)
    return existing.mesh
  }

  const colors = [0xe74c3c, 0xf39c12, 0x9b59b6, 0x1abc9c, 0x34495e]
  const color = colors[Math.floor(Math.random() * colors.length)]

  const player = createPlayer(color, data.name || `玩家${id.substring(0, 6)}`)
  player.position.set(data.x || 0, data.y || 2, data.z || 0)

  scene.add(player)
  remotePlayers.set(id, {
    mesh: player,
    targetPosition: new THREE.Vector3(data.x || 0, data.y || 2, data.z || 0),
    currentPosition: new THREE.Vector3(data.x || 0, data.y || 2, data.z || 0)
  })

  return player
}

// 移除远程玩家
const removeRemotePlayer = (id) => {
  const player = remotePlayers.get(id)
  if (player) {
    scene.remove(player.mesh)
    remotePlayers.delete(id)
  }
}

// 更新远程玩家位置（插值）
const updateRemotePlayer = (id, data) => {
  const player = remotePlayers.get(id)
  if (!player) {
    createRemotePlayer(id, data)
    return
  }
  player.targetPosition.set(data.x, data.y, data.z)
}

// 渲染循环
let lastDecorationUpdate = 0
const decorationUpdateInterval = 500 // 每 500ms 更新一次装饰物

const animate = () => {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  // 更新 FPS
  frameCount++
  const currentTime = Date.now()
  if (currentTime - lastFrameTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastFrameTime = currentTime
  }

  // 更新本地玩家移动
  updateLocalPlayer(delta)

  // 定期更新装饰物（懒加载/卸载）
  if (currentTime - lastDecorationUpdate > decorationUpdateInterval) {
    updateDecorations()
    lastDecorationUpdate = currentTime
  }

  // 更新远程玩家（插值）
  remotePlayers.forEach((player) => {
    player.currentPosition.lerp(player.targetPosition, 0.2)
    player.mesh.position.copy(player.currentPosition)
  })

  weatherSystem?.update(delta, camera?.position)

  // 更新控制器
  if (localPlayer && controls) {
    tempDesiredTarget.copy(localPlayer.position).add(cameraTargetOffset)
    if (!hasCameraFollowTarget) {
      cameraFollowTarget.copy(tempDesiredTarget)
      controls.target.copy(tempDesiredTarget)
      hasCameraFollowTarget = true
    } else {
      tempDeltaTarget.copy(tempDesiredTarget).sub(cameraFollowTarget)
      camera.position.add(tempDeltaTarget)
      cameraFollowTarget.copy(tempDesiredTarget)
      controls.target.copy(tempDesiredTarget)
    }
  }
  if (controls) controls.update()

  // 渲染场景
  renderer.render(scene, camera)
}

// 更新本地玩家
const updateLocalPlayer = (delta) => {
  if (!localPlayer) return

  // 使用相对于相机的方向，这样旋转视角后移动方向也会跟着变
  // 获取相机方向向量（水平方向）
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  forward.y = 0  // 只保留水平分量
  forward.normalize()

  // 右方向向量（通过forward和上方向叉乘得到）
  const right = new THREE.Vector3()
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
  right.normalize()

  // 根据按键计算移动方向
  const moveDirection = new THREE.Vector3()

  // 现在相机在后方看向前方(+Z)，所以forward向量指向+Z方向
  // 直接使用forward，W键会让角色沿着相机朝向移动（+Z方向）
  if (keys.w) moveDirection.add(forward)       // 前进 - 沿相机朝向
  if (keys.s) moveDirection.sub(forward)       // 后退 - 反向
  if (keys.a) moveDirection.sub(right)         // 左移 - 相对于相机的左侧
  if (keys.d) moveDirection.add(right)         // 右移 - 相对于相机的右侧

  // 归一化移动方向
  if (moveDirection.length() > 0) {
    moveDirection.normalize()
    velocity.x = moveDirection.x * moveSpeed
    velocity.z = moveDirection.z * moveSpeed
  } else {
    velocity.x *= 0.9
    velocity.z *= 0.9
  }

  // 跳跃（仅在当前地面附近允许）
  const groundY = getGroundHeightAt(localPlayer.position.x, localPlayer.position.z)
  if (keys.space && localPlayer.position.y <= groundY + 0.1) {
    velocity.y = jumpPower
  }

  // 应用重力
  velocity.y += gravity * delta

  // 更新位置
  const currentPosition = localPlayer.position.clone()
  const desiredPosition = currentPosition.clone()
  desiredPosition.x += velocity.x * delta
  desiredPosition.y += velocity.y * delta
  desiredPosition.z += velocity.z * delta

  if (world) {
    const { position, collided } = world.resolvePlayerXZ(currentPosition, desiredPosition, playerRadius)
    localPlayer.position.x = position.x
    localPlayer.position.z = position.z
    if (collided) {
      velocity.x = 0
      velocity.z = 0
    }
  } else {
    localPlayer.position.x = desiredPosition.x
    localPlayer.position.z = desiredPosition.z
  }
  localPlayer.position.y = desiredPosition.y

  // 地面碰撞检测
  const nextGroundY = getGroundHeightAt(localPlayer.position.x, localPlayer.position.z)
  if (localPlayer.position.y < nextGroundY) {
    localPlayer.position.y = nextGroundY
    velocity.y = 0
  }

  // 更新显示坐标
  playerX.value = localPlayer.position.x
  playerZ.value = localPlayer.position.z

  // 发送位置到服务器（节流处理）
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendPositionUpdate()
  }
}

// 发送位置更新（带节流）
let lastSendTime = 0
const sendInterval = 50 // 每 50ms 发送一次
let lastSentPosition = null

const sendPositionUpdate = () => {
  const now = Date.now()
  if (now - lastSendTime < sendInterval) return

  if (!lastSentPosition) {
    lastSentPosition = new THREE.Vector3().copy(localPlayer.position)
  } else {
    const dx = localPlayer.position.x - lastSentPosition.x
    const dy = localPlayer.position.y - lastSentPosition.y
    const dz = localPlayer.position.z - lastSentPosition.z
    if ((dx * dx + dy * dy + dz * dz) < 0.0004) {
      return
    }
  }

  lastSendTime = now
  lastSentPosition.copy(localPlayer.position)

  ws.send(JSON.stringify({
    type: 'move',
    data: {
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z
    }
  }))
}

// 键盘事件处理
const handleKeyDown = (e) => {
  const key = e.key.toLowerCase()

  // 如果聊天框打开，只处理ESC键，其他键交给输入框处理
  if (showChat.value) {
    if (key === 'escape') {
      showChat.value = false
      e.preventDefault()
    }
    return
  }

  // 特殊处理空格键
  if (key === ' ') {
    keys.space = true
    e.preventDefault()
  } else if (key in keys) {
    keys[key] = true
    e.preventDefault()
  }

  if (key === 'escape') {
    showInstructions.value = !showInstructions.value
  }

  if (key === 't' && !showChat.value) {
    openChat()
    e.preventDefault()
  }
}

const handleKeyUp = (e) => {
  const key = e.key.toLowerCase()

  // 如果聊天框打开，不处理游戏控制键
  if (showChat.value) {
    return
  }

  // 特殊处理空格键
  if (key === ' ') {
    keys.space = false
    e.preventDefault()
  } else if (key in keys) {
    keys[key] = false
    e.preventDefault()
  }
}

// 窗口大小变化处理
const handleResize = () => {
  if (camera && renderer && canvasWrapper.value) {
    camera.aspect = canvasWrapper.value.clientWidth / canvasWrapper.value.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvasWrapper.value.clientWidth, canvasWrapper.value.clientHeight)
  }
}

// 初始化 WebSocket
const initWebSocket = () => {
  try {
    const token = localStorage.getItem('token')
    const wsUrl = `ws://localhost:8000/ws/game?token=${token}`

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      connectionStatus.value = 'connected'
      console.log('WebSocket 连接成功')

      addSystemMessage('已连接到游戏服务器')
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleServerMessage(message)
    }

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error)
      connectionStatus.value = 'disconnected'
      addSystemMessage('连接错误')
    }

    ws.onclose = () => {
      connectionStatus.value = 'disconnected'
      console.log('WebSocket 连接关闭')
      addSystemMessage('与服务器断开连接')
      clearRemotePlayers()

      // 5秒后尝试重连
      setTimeout(() => {
        if (connectionStatus.value === 'disconnected') {
          connectionStatus.value = 'reconnecting'
          initWebSocket()
        }
      }, 5000)
    }
  } catch (error) {
    console.error('WebSocket 初始化失败:', error)
    connectionStatus.value = 'disconnected'
  }
}

// 处理服务器消息
const handleServerMessage = (message) => {
  switch (message.type) {
    case 'welcome':
      playerId.value = message.playerId
      playerCount.value = message.playerCount
      // 保存玩家名称
      playerName.value = message.data?.name || '我'
      addSystemMessage(`欢迎！当前在线 ${message.playerCount} 人`)

      // 服务端权威出生点：以 welcome 下发的坐标为准
      if (localPlayer && message.data) {
        const x = message.data.x ?? 0
        const y = message.data.y ?? 2
        const z = message.data.z ?? 0
        localPlayer.position.set(x, y, z)
        playerX.value = x
        playerZ.value = z
        lastSentPosition = new THREE.Vector3(x, y, z)
      }
      break

    case 'player_joined':
      if (message.playerId !== playerId.value) {
        createRemotePlayer(message.playerId, message.data)
      }
      playerCount.value = message.playerCount
      addSystemMessage(`${message.data.name || '玩家'} 加入了游戏`)
      break

    case 'player_left':
      removeRemotePlayer(message.playerId)
      playerCount.value = message.playerCount
      addSystemMessage(`玩家离开了游戏`)
      break

    case 'player_move':
      updateRemotePlayer(message.playerId, message.data)
      break

    case 'position_correction': {
      const data = message.data || {}
      if (localPlayer) {
        const x = data.x ?? 0
        const y = data.y ?? 2
        const z = data.z ?? 0
        localPlayer.position.set(x, y, z)
        playerX.value = x
        playerZ.value = z
        lastSentPosition = new THREE.Vector3(x, y, z)
      }
      break
    }

    case 'players_state':
      // 初始同步所有玩家
      message.players.forEach(player => {
        if (player.id !== playerId.value) {
          createRemotePlayer(player.id, player.data)
        }
      })
      break

    case 'aoi_state': {
      const visible = new Set()
      ;(message.players || []).forEach((p) => {
        if (!p || !p.id || p.id === playerId.value) return
        visible.add(p.id)
        createRemotePlayer(p.id, p.data || {})
        updateRemotePlayer(p.id, p.data || {})
      })

      // 移除不在 AOI 内的远端玩家
      Array.from(remotePlayers.keys()).forEach((id) => {
        if (!visible.has(id)) {
          removeRemotePlayer(id)
        }
      })
      break
    }

    case 'chat':
      // 只显示其他玩家的消息（自己的消息已经在本地显示了）
      if (message.playerId !== playerId.value) {
        chatMessages.value.push({
          sender: message.sender || '玩家',
          text: message.message,
          isOwn: false,
          isSystem: false
        })
        scrollChatToBottom()
      }
      break

    case 'map_saved':
      addSystemMessage(message.success ? '地图保存成功' : '地图保存失败')
      break

    case 'map_loaded':
      addSystemMessage('地图加载成功')
      currentMap.value = message.mapName || '默认地图'
      applyMapData(message.mapData)
      break

    case 'environment_update':
      if (message.environment) {
        applyEnvironment(message.environment)
      }
      break

    case 'pong':
      latency.value = Date.now() - message.timestamp
      break

    case 'ping':
      // 服务端空闲超时会发 ping：回一个 ping 以触发服务端 pong，便于计算延迟并保持链路活跃
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: message.timestamp || Date.now()
        }))
      }
      break
  }
}

// 添加系统消息
const addSystemMessage = (text) => {
  chatMessages.value.push({
    sender: '系统',
    text,
    isOwn: false,
    isSystem: true
  })
  scrollChatToBottom()
}

// 发送聊天消息
const sendMessage = () => {
  const message = chatInput.value.trim()
  if (!message) return

  // 1. 无论是否连接，先清空输入框，给用户操作反馈
  chatInput.value = ''

  // 2. 检查连接状态
  if (ws && ws.readyState === WebSocket.OPEN) {
    // 本地显示消息
    chatMessages.value.push({
      sender: playerName.value,
      text: message,
      isOwn: true,
      isSystem: false
    })
    scrollChatToBottom()

    // 发送给服务器
    ws.send(JSON.stringify({
      type: 'chat',
      message: message
    }))
  } else {
    // 未连接时的提示
    addSystemMessage('❌ 发送失败：未连接到服务器')
    
  }
}

// 聊天滚动到底部
const scrollChatToBottom = () => {
  nextTick(() => {
    if (chatMessagesEl.value) {
      chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight
    }
  })
}

// 打开聊天
const openChat = () => {
  showChat.value = true
  nextTick(() => {
    chatInputEl.value?.focus()
  })
}

// 处理聊天输入框按键
const handleChatKeyDown = (e) => {
  // 关键修复：如果正在使用中文输入法（打字选词中），不要触发发送
  if (e.isComposing) return

  if (e.key === 'Enter') {
    e.preventDefault()
    sendMessage()
  } else if ((e.key === 'p' || e.key === 'P') && e.ctrlKey) {
    e.preventDefault()
    sendMessage()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    showChat.value = false
  }
}

// 切换性能监视器
const togglePerformance = () => {
  showPerformance.value = !showPerformance.value
}

// 切换全屏
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 保存地图
const saveMap = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'save_map',
      mapName: currentMap.value,
      mapData: {
        seed: mapSeed.value,
        environment: mapEnvironment.value,
        decorations
      }
    }))
    addSystemMessage('正在保存地图...')
  } else {
    addSystemMessage('未连接到服务器')
  }
}

// 加载地图
const loadMap = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'load_map',
      mapName: currentMap.value || '默认地图'
    }))
    addSystemMessage('正在加载地图...')
  } else {
    addSystemMessage('未连接到服务器')
  }
}

// 心跳检测
const startHeartbeat = () => {
  if (heartbeatTimerId) clearInterval(heartbeatTimerId)
  heartbeatTimerId = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }))
    }
  }, 3000)
}

// 生命周期
onMounted(() => {
  initGame()
  startHeartbeat()

  // 监听全屏变化
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onUnmounted(() => {
  // 清理资源
  if (renderer) {
    renderer.dispose()
  }
  weatherSystem?.dispose()
  weatherSystem = null
  world?.dispose()
  world = null
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }
  if (ws) {
    ws.close()
  }
  if (heartbeatTimerId) {
    clearInterval(heartbeatTimerId)
    heartbeatTimerId = null
  }

  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.game-container {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #000;
}

.game-canvas-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 性能监视器 */
.performance-monitor {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 16px;
  border-radius: 8px;
  color: #0f0;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 255, 0, 0.3);
  z-index: 100;
}

.monitor-item {
  margin: 4px 0;
}

/* 游戏 UI 层 */
.game-ui {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.game-ui > * {
  pointer-events: auto;
}

/* 顶部信息栏 */
.top-bar {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 280px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.player-info {
  display: flex;
  gap: 20px;
  background: rgba(0, 0, 0, 0.8);
  padding: 12px 20px;
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 14px;
}

.info-label {
  color: #aaa;
}

.info-value {
  font-weight: 600;
  color: #3498db;
}

.health-bar {
  width: 100px;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  background: linear-gradient(90deg, #e74c3c 0%, #e67e22 100%);
  transition: width 0.3s ease;
}

.game-controls {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.control-btn {
  padding: 8px 16px;
  background: rgba(52, 152, 219, 0.9);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.control-btn:hover {
  background: rgba(52, 152, 219, 1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.5);
}

/* 聊天窗口 */
.chat-window {
  position: absolute;
  bottom: 20px;
  left: 20px;
  width: 350px;
  height: 400px;
  background: rgba(0, 0, 0, 0.9);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-header {
  padding: 12px 16px;
  background: rgba(52, 152, 219, 0.4);
  border-radius: 12px 12px 0 0;
  color: #fff;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.close-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  line-height: 1;
  transition: color 0.2s ease;
}

.close-btn:hover {
  color: #e74c3c;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.chat-message {
  margin-bottom: 8px;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 13px;
}

.chat-message.own-message {
  background: rgba(52, 152, 219, 0.3);
  margin-left: 20px;
}

.chat-message.system-message {
  background: rgba(241, 196, 15, 0.2);
  text-align: center;
  font-style: italic;
}

.message-sender {
  color: #3498db;
  font-weight: 600;
  margin-right: 6px;
}

.message-text {
  color: #fff;
}

.chat-input {
  padding: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-input input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  outline: none;
  transition: all 0.2s ease;
}

.chat-input input:focus {
  background: rgba(255, 255, 255, 0.15);
  border-color: #3498db;
}

.chat-input input::placeholder {
  color: #888;
}

.chat-toggle-btn {
  position: absolute;
  bottom: 20px;
  left: 20px;
  padding: 12px 20px;
  background: rgba(52, 152, 219, 0.9);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chat-toggle-btn:hover {
  background: rgba(52, 152, 219, 1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(52, 152, 219, 0.5);
}

/* 游戏说明 */
.game-instructions {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 450px;
  max-height: 80vh;
  background: rgba(0, 0, 0, 0.95);
  border-radius: 12px;
  padding: 0;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.instructions-header {
  padding: 16px 20px;
  background: rgba(52, 152, 219, 0.4);
  border-radius: 12px 12px 0 0;
  color: #fff;
  font-weight: 600;
  font-size: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.instructions-content {
  padding: 20px;
  color: #fff;
  max-height: calc(80vh - 60px);
  overflow-y: auto;
}

.instructions-content h3 {
  margin: 16px 0 8px 0;
  color: #3498db;
  font-size: 14px;
}

.instructions-content h3:first-child {
  margin-top: 0;
}

.instructions-content ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  line-height: 1.8;
}

.instructions-content li {
  color: #ccc;
}

/* 连接状态 */
.connection-status {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.connection-status.connecting,
.connection-status.reconnecting {
  background: rgba(241, 196, 15, 0.9);
  color: #fff;
}

.connection-status.connected {
  background: rgba(46, 204, 113, 0.9);
  color: #fff;
}

.connection-status.disconnected {
  background: rgba(231, 76, 60, 0.9);
  color: #fff;
}

/* 滚动条样式 */
.chat-messages::-webkit-scrollbar,
.instructions-content::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track,
.instructions-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb,
.instructions-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.chat-messages::-webkit-scrollbar-thumb:hover,
.instructions-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
<!-- 扩展（更接近大厂做法的方向）

  - 新增实体类型：在 frontend/src/game/entityRegistry.js 增加 type 分支（mesh + collider），后端 backend/game_routes.py
    的 decorations 里生成对应数据即可。
  - 更“精致”的展示：下一步建议上 LOD/Instancing（树/草大量实例化）、glTF 资产 + PBR 材质、以及更标准的 ECS（Entity
    Component System） 分层（渲染/物理/逻辑解耦）。现在这套模块化结构已经能平滑演进到那种架构。 -->
