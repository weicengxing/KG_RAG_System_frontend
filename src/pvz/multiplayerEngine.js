import { GameEngine } from './engine.js'
import { plantConfig, zombieConfig, gameConfig } from './config.js'

const SNAPSHOT_PROJECTILE_KEYS_TO_DROP = new Set([
  'targetPlant',
  'targetZombie',
  'sourcePlant',
  'engine',
  'game',
  'ws'
])

const MULTIPLAYER_GRASS_COLOR = '#4a7c4e'
const REMOTE_INTERPOLATION_DELAY_MS = 60
const REMOTE_MAX_EXTRAPOLATION_MS = 180
const REMOTE_POSITION_EPSILON = 0.1
const SNAPSHOT_SEND_INTERVAL_MS = 500
const STATE_DELTA_SEND_INTERVAL_MS = 50

const zombieTypeAlias = {
  basic: 'normal'
}

function clonePlain(value) {
  if (value === undefined) {
    return undefined
  }
  return JSON.parse(JSON.stringify(value))
}

function normalizeZombieType(zombieType) {
  return zombieTypeAlias[zombieType] || zombieType || 'normal'
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function expSmoothing(deltaTime, sharpness) {
  return 1 - Math.exp(-sharpness * deltaTime)
}

function roundToTenth(value) {
  return Math.round(Number(value || 0) * 10) / 10
}

function roundToInt(value) {
  return Math.round(Number(value || 0))
}

/**
 * 多人对战游戏引擎
 * 植物方作为权威端，完整运行单人版战斗逻辑；
 * 僵尸方只发送生成请求并应用植物方广播的战场快照。
 */
export class MultiplayerGameEngine extends GameEngine {
  constructor(canvas, width, height, ws, role) {
    super(canvas, width, height)

    this.ws = ws
    this.role = role
    this.isAuthoritative = role === 'plant'

    this.zombieEnergy = 10000
    this.selectedZombie = null
    this.lastBroadcastState = ''
    this.lastDeltaBroadcastState = ''
    this.lastPlantsSignature = ''
    this.nextZombieId = 1
    this.lastSnapshotSyncTimestamp = 0
    this.lastDeltaSyncTimestamp = 0

    this.onPlantPlaced = null
    this.onZombieSpawned = null
    this.onSunCollected = null
    this.onGameOver = null
  }

  start() {
    this.isPlaying = true
    this.isPaused = false
    this.gameOver = false

    this.sunEnergy = 10000
    this.zombieEnergy = 10000
    this.score = 0
    this.wave = 1
    this.totalScore = 0
    this.zombiesKilled = 0
    this.plantsPlanted = 0
    this.sunsCollected = 0
    this.wavesCleared = 0

    this.currentWaveConfig = null
    this.zombieSpawnQueue = []
    this.waveSpawnTimer = 0
    this.isWaveActive = false
    this.waveCooldown = 0
    this.sunFallTimer = 0
    this.zombieSpawnTimer = 0

    this.selectedPlant = null
    this.selectedZombie = null
    this.plantCooldowns = {}
    this.autoCollectSun = false
    this.messages = []
    this.animations = []
    this.plants = []
    this.zombies = []
    this.suns = []
    this.weaponStaffs = []
    this.lastBroadcastState = ''
    this.lastDeltaBroadcastState = ''
    this.nextZombieId = 1
    this.lastSnapshotSyncTimestamp = 0
    this.lastDeltaSyncTimestamp = 0

    this.grid = new this.grid.constructor(
      gameConfig.gridCols,
      gameConfig.gridRows,
      gameConfig.cellWidth,
      gameConfig.cellHeight
    )

    this.projectileManager.clear()
    this.lightningChain.activeChains = []
    this.initLawnMowers()
    this.initAudio()

    this.lastTime = performance.now()
    this.gameLoop()
  }

  update(deltaTime) {
    if (this.isPaused) return

    if (!this.isAuthoritative) {
      this.updateRemoteVisuals(deltaTime)
      return
    }

    const wasGameOver = this.gameOver
    super.update(deltaTime)

    if (!wasGameOver && this.gameOver && this.onGameOver) {
      this.onGameOver({
        winner: 'zombie',
        reason: 'zombie_reached_home'
      })
    }
  }

  updateWave() {
    // 多人模式不使用单人波次系统
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    this.ctx.fillStyle = MULTIPLAYER_GRASS_COLOR
    this.ctx.fillRect(0, 0, this.width, this.height)

    this.renderer.drawGrid(this.grid)
    this.renderer.drawPlants(this.plants)
    this.renderer.drawZombies(this.zombies)
    this.renderer.drawWeaponStaffs(this.projectileManager.getWeaponStaffs())
    this.renderer.drawProjectiles(this.projectileManager.getProjectiles())
    this.renderer.drawParticles(this.projectileManager.getParticleSystem().getParticles())
    this.renderer.drawSuns(this.suns)
    this.renderer.drawLawnMowers(this.lawnMowers)
    this.renderer.drawLightningChains(this.lightningChain.getActiveChains())
    this.renderer.drawAnimations(this.animations)
    this.renderer.drawMessages(this.messages)
  }

  onServerMessage(message) {
    const { type, payload = {} } = message

    if (type === 'state.snapshot' || type === 'state.sync') {
      const snapshot = payload.game_state ?? payload
      if (!this.isAuthoritative) {
        this.applySnapshot(snapshot)
      }
      return
    }

    if (type === 'plant_state_delta') {
      if (!this.isAuthoritative) {
        this.applyStateDelta(payload)
      }
      return
    }

    if (type === 'zombie_spawn_request') {
      if (this.isAuthoritative) {
        this.handleZombieSpawnRequest(payload)
      }
      return
    }

    if (type.startsWith('zombie_spawn_')) {
      if (this.isAuthoritative) {
        this.handleZombieSpawnRequest({
          zombie_type: type.replace('zombie_spawn_', ''),
          ...payload
        })
      }
    }
  }

  plant(col, row, plantType) {
    if (!this.isAuthoritative || this.role !== 'plant') {
      return false
    }

    const config = plantConfig[plantType]
    if (!config) {
      return false
    }

    if (this.sunEnergy < config.cost) {
      return false
    }

    if (this.plantCooldowns[plantType] > 0) {
      return false
    }

    const gridWidth = config.gridWidth || 1
    const gridHeight = config.gridHeight || 1
    if (!this.grid.isAreaEmpty(col, row, gridWidth, gridHeight)) {
      return false
    }

    super.plant(col, row, plantType)
    this.selectedPlant = null

    if (this.onPlantPlaced) {
      this.onPlantPlaced(this.plants[this.plants.length - 1], {
        col,
        row,
        plant_type: plantType
      })
    }

    return true
  }

  spawnZombie(row, zombieType) {
    if (this.role !== 'zombie') {
      return false
    }

    const normalizedType = normalizeZombieType(zombieType)
    const config = zombieConfig[normalizedType]
    const cost = config?.cost || 50

    if (!config || this.zombieEnergy < cost) {
      return false
    }

    this.zombieEnergy -= cost

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: `zombie_spawn_${normalizedType}`,
        payload: {
          lane: row,
          zombie_type: normalizedType,
          cost
        }
      }))
    }

    return true
  }

  handleZombieSpawnRequest(payload) {
    const zombieType = normalizeZombieType(payload.zombie_type)
    const lane = payload.lane ?? 0
    const config = zombieConfig[zombieType]
    const cost = payload.cost ?? config?.cost ?? 50

    if (!config || this.zombieEnergy < cost) {
      return false
    }

    this.zombieEnergy -= cost

    const zombie = this.createZombieObject(lane, zombieType)
    this.zombies.push(zombie)

    if (this.onZombieSpawned) {
      this.onZombieSpawned(zombie, payload)
    }

    return true
  }

  createZombieObject(row, zombieType) {
    return super.createZombieObject(row, zombieType)
  }

  collectSun(sun) {
    if (!this.isAuthoritative || this.role !== 'plant') {
      return false
    }

    super.collectSun(sun)

    if (this.onSunCollected) {
      this.onSunCollected(sun)
    }

    return true
  }

  toggleAutoCollectSun() {
    if (!this.isAuthoritative || this.role !== 'plant') {
      return false
    }

    return super.toggleAutoCollectSun()
  }

  selectPlant(plantType) {
    if (!this.isAuthoritative || this.role !== 'plant') {
      return false
    }

    return super.selectPlant(plantType)
  }

  selectZombie(zombieType) {
    if (this.role !== 'zombie') {
      return false
    }

    const normalizedType = normalizeZombieType(zombieType)
    const config = zombieConfig[normalizedType]
    if (!config) {
      return false
    }

    const cost = config.cost || 50
    if (this.zombieEnergy < cost) {
      return false
    }

    this.selectedZombie = normalizedType
    return true
  }

  getEntitySnapshotKey(entity, prefix, index) {
    if (entity?.id !== undefined && entity?.id !== null) {
      return `${prefix}-${entity.id}`
    }

    const type = entity?.type || entity?.kind || 'unknown'
    const row = entity?.row ?? entity?.lane ?? Math.round((entity?.y || 0) / gameConfig.cellHeight)
    const col = entity?.col ?? Math.round((entity?.x || 0) / Math.max(gameConfig.cellWidth, 1))
    return `${prefix}-${type}-${row}-${col}-${index}`
  }

  createSmoothedSnapshotEntities(nextEntities = [], currentEntities = [], prefix, props = ['x', 'y']) {
    const currentByKey = new Map(
      currentEntities.map((entity, index) => [this.getEntitySnapshotKey(entity, prefix, index), entity])
    )

    return nextEntities.map((entity, index) => {
      // entity is already a fresh object (callers spread before passing in,
      // and WebSocket payloads are JSON-parsed anew). Don't deep-clone.
      const nextEntity = entity
      const key = this.getEntitySnapshotKey(nextEntity, prefix, index)
      const currentEntity = currentByKey.get(key)
      const snapshotTimestamp = Number(nextEntity.snapshotTimestamp ?? nextEntity.timestamp ?? Date.now())
      const previousTimestamp = Number(
        currentEntity?.lastSnapshotTimestamp ??
        currentEntity?.snapshotTimestamp ??
        currentEntity?.timestamp ??
        snapshotTimestamp
      )
      const elapsedSeconds = Math.max((snapshotTimestamp - previousTimestamp) / 1000, 0.001)

      for (const prop of props) {
        const targetProp = `${prop}Target`
        const previousProp = `${prop}Previous`
        const velocityProp = `${prop}Velocity`
        const nextValue = Number(nextEntity[prop])
        const previousValue = Number(
          currentEntity?.[targetProp] ??
          currentEntity?.[prop] ??
          nextValue
        )

        nextEntity[previousProp] = previousValue
        nextEntity[targetProp] = nextValue
        nextEntity[prop] = Number.isFinite(currentEntity?.[prop]) ? currentEntity[prop] : nextValue
        nextEntity[velocityProp] = Number.isFinite(nextValue)
          ? (nextValue - previousValue) / elapsedSeconds
          : 0
      }

      nextEntity.previousSnapshotTimestamp = previousTimestamp
      nextEntity.snapshotTimestamp = snapshotTimestamp
      nextEntity.lastSnapshotTimestamp = snapshotTimestamp

      return nextEntity
    })
  }

  updateRemoteVisuals(deltaTime) {
    const now = Date.now()
    const renderTimestamp = now - REMOTE_INTERPOLATION_DELAY_MS
    const zombieBlend = expSmoothing(deltaTime, 22)
    const projectileBlend = expSmoothing(deltaTime, 28)
    const mowerBlend = expSmoothing(deltaTime, 24)

    for (const zombie of this.zombies) {
      if (zombie.state === 'WALKING' && typeof zombie.baseSpeed === 'number') {
        let actualSpeed = zombie.baseSpeed
        if (zombie.slowDuration > 0) {
          zombie.slowDuration = Math.max(0, zombie.slowDuration - deltaTime)
          actualSpeed *= zombie.slowFactor || 0.5
        }

        const moveStep = actualSpeed * deltaTime * 60
        zombie.x += zombie.isCharmed ? moveStep : -moveStep
      }
    }

    const advanceEntity = (entity, blend, props = ['x', 'y']) => {
      const previousTimestamp = Number(
        entity.previousSnapshotTimestamp ??
        entity.lastSnapshotTimestamp ??
        entity.snapshotTimestamp ??
        renderTimestamp
      )
      const snapshotTimestamp = Number(
        entity.lastSnapshotTimestamp ??
        entity.snapshotTimestamp ??
        previousTimestamp
      )
      const interpolationDuration = Math.max(snapshotTimestamp - previousTimestamp, 1)
      const interpolationAlpha = clamp(
        (renderTimestamp - previousTimestamp) / interpolationDuration,
        0,
        1
      )
      const extrapolationMs = clamp(renderTimestamp - snapshotTimestamp, 0, REMOTE_MAX_EXTRAPOLATION_MS)
      const extrapolationSeconds = extrapolationMs / 1000

      for (const prop of props) {
        const targetProp = `${prop}Target`
        const previousProp = `${prop}Previous`
        const velocityProp = `${prop}Velocity`
        if (typeof entity[targetProp] !== 'number') {
          continue
        }

        const previousValue = typeof entity[previousProp] === 'number'
          ? entity[previousProp]
          : entity[targetProp]
        const interpolatedTarget = previousValue + ((entity[targetProp] - previousValue) * interpolationAlpha)
        const predictedTarget = extrapolationMs > 0
          ? entity[targetProp] + ((entity[velocityProp] || 0) * extrapolationSeconds)
          : interpolatedTarget
        const currentValue = Number(entity[prop])
        const nextValue = currentValue + ((predictedTarget - currentValue) * blend)
        entity[prop] = Math.abs(predictedTarget - nextValue) <= REMOTE_POSITION_EPSILON
          ? predictedTarget
          : nextValue
      }
    }

    for (const zombie of this.zombies) {
      advanceEntity(zombie, zombieBlend)
    }

    for (const projectile of this.projectileManager.projectiles) {
      advanceEntity(projectile, projectileBlend)
    }

    for (const lawnMower of this.lawnMowers) {
      advanceEntity(lawnMower, mowerBlend)
    }
  }

  serializeGameState() {
    return {
      version: 1,
      role: 'plant',
      timestamp: Date.now(),
      isPlaying: this.isPlaying,
      gameOver: this.gameOver,
      sunEnergy: this.sunEnergy,
      zombieEnergy: this.zombieEnergy,
      autoCollectSun: this.autoCollectSun,
      plants: this.plants.map((plant) => clonePlain(plant)),
      zombies: this.zombies.map((zombie) => ({
        ...clonePlain(zombie),
        targetPlant: null,
        targetZombie: null
      })),
      suns: clonePlain(this.suns),
      lawnMowers: clonePlain(this.lawnMowers),
      animations: clonePlain(this.animations),
      messages: clonePlain(this.messages),
      projectiles: this.projectileManager.getProjectiles().map((projectile) => {
        const snapshot = {}
        for (const [key, value] of Object.entries(projectile)) {
          if (!SNAPSHOT_PROJECTILE_KEYS_TO_DROP.has(key)) {
            snapshot[key] = clonePlain(value)
          }
        }
        return snapshot
      }),
      weaponStaffs: clonePlain(this.projectileManager.getWeaponStaffs()),
      particles: clonePlain(this.projectileManager.getParticleSystem().getParticles()),
      lightningChains: []
    }
  }

  serializeStateDelta() {
    return {
      version: 1,
      role: 'plant',
      timestamp: Date.now(),
      isPlaying: this.isPlaying,
      gameOver: this.gameOver,
      sunEnergy: this.sunEnergy,
      zombieEnergy: this.zombieEnergy,
      zombies: this.zombies.map((zombie) => ({
        id: zombie.id,
        type: zombie.type,
        x: roundToTenth(zombie.x),
        y: roundToTenth(zombie.y),
        width: roundToInt(zombie.width),
        height: roundToInt(zombie.height),
        hp: roundToInt(zombie.hp),
        maxHp: roundToInt(zombie.maxHp),
        shieldHp: roundToInt(zombie.shieldHp || 0),
        baseSpeed: roundToTenth(zombie.baseSpeed ?? zombieConfig[zombie.type]?.speed ?? 0),
        state: zombie.state,
        slowDuration: roundToTenth(zombie.slowDuration || 0),
        slowFactor: roundToTenth(zombie.slowFactor || 1),
        isCharmed: !!zombie.isCharmed,
        isFlying: !!zombie.isFlying,
        isEnraged: !!zombie.isEnraged,
        hasVaulted: !!zombie.hasVaulted,
        summonsCreated: roundToInt(zombie.summonsCreated || 0)
      })),
      lawnMowers: this.lawnMowers.map((lawnMower) => ({
        id: lawnMower.id,
        row: lawnMower.row,
        x: roundToTenth(lawnMower.x),
        y: roundToTenth(lawnMower.y),
        width: roundToInt(lawnMower.width),
        height: roundToInt(lawnMower.height),
        state: lawnMower.state
      }))
    }
  }

  hasActiveRealtimeState() {
    if (this.zombies.length > 0) {
      return true
    }

    return this.lawnMowers.some((lawnMower) => lawnMower.state && lawnMower.state !== 'idle')
  }

  syncRealtimeState(forceSnapshot = false) {
    if (!this.isAuthoritative || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    const now = Date.now()
    let didSend = false

    if (
      (forceSnapshot || this.hasActiveRealtimeState()) &&
      now - this.lastDeltaSyncTimestamp >= STATE_DELTA_SEND_INTERVAL_MS
    ) {
      const deltaPayload = this.serializeStateDelta()
      const serializedDelta = JSON.stringify(deltaPayload)
      if (forceSnapshot || serializedDelta !== this.lastDeltaBroadcastState) {
        this.lastDeltaBroadcastState = serializedDelta
        this.lastDeltaSyncTimestamp = now
        this.ws.send(JSON.stringify({
          type: 'plant_state_delta',
          payload: deltaPayload
        }))
        didSend = true
      }
    }

    if (forceSnapshot || now - this.lastSnapshotSyncTimestamp >= SNAPSHOT_SEND_INTERVAL_MS) {
      didSend = this.syncAuthoritativeState(forceSnapshot) || didSend
    }

    return didSend
  }

  syncAuthoritativeState(force = false) {
    if (!this.isAuthoritative || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false
    }

    const now = Date.now()
    if (!force && now - this.lastSnapshotSyncTimestamp < SNAPSHOT_SEND_INTERVAL_MS) {
      return false
    }

    const snapshot = this.serializeGameState()
    const serialized = JSON.stringify(snapshot)

    if (!force && serialized === this.lastBroadcastState) {
      return false
    }

    this.lastBroadcastState = serialized
    this.lastSnapshotSyncTimestamp = now
    this.ws.send(JSON.stringify({
      type: 'game_state_update',
      payload: snapshot
    }))
    return true
  }

  applySnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return
    }

    const snapshotTimestamp = Number(snapshot.timestamp ?? Date.now())

    this.isPlaying = snapshot.isPlaying ?? true
    this.gameOver = snapshot.gameOver ?? false
    this.sunEnergy = snapshot.sunEnergy ?? this.sunEnergy
    this.zombieEnergy = snapshot.zombieEnergy ?? this.zombieEnergy
    this.autoCollectSun = snapshot.autoCollectSun ?? false

    // Plants change infrequently (placement / removal). Reuse the grid unless
    // the plant set actually changed, gauged by a cheap id+position signature.
    const incomingPlants = snapshot.plants || []
    let plantSig = ''
    for (let i = 0; i < incomingPlants.length; i += 1) {
      const p = incomingPlants[i]
      plantSig += `${p.id || p.type}:${p.col},${p.row}|`
    }
    if (plantSig !== this.lastPlantsSignature) {
      this.lastPlantsSignature = plantSig
      this.grid = new this.grid.constructor(
        gameConfig.gridCols,
        gameConfig.gridRows,
        gameConfig.cellWidth,
        gameConfig.cellHeight
      )
      this.plants = incomingPlants.map((plant) => {
        const nextPlant = plant
        const gridWidth = nextPlant.gridWidth || 1
        const gridHeight = nextPlant.gridHeight || 1
        this.grid.placePlant(nextPlant.col, nextPlant.row, nextPlant, gridWidth, gridHeight)
        return nextPlant
      })
    } else {
      // Same set of plants — refresh per-plant scalar fields (hp, state) in place.
      const byKey = new Map()
      for (const p of this.plants) {
        const key = `${p.id || p.type}:${p.col},${p.row}`
        byKey.set(key, p)
      }
      for (const incoming of incomingPlants) {
        const key = `${incoming.id || incoming.type}:${incoming.col},${incoming.row}`
        const cur = byKey.get(key)
        if (cur) {
          for (const k in incoming) cur[k] = incoming[k]
        }
      }
    }

    this.zombies = this.createSmoothedSnapshotEntities(
      (snapshot.zombies || []).map((zombie) => ({
        ...zombie,
        snapshotTimestamp
      })),
      this.zombies,
      'zombie'
    )
    this.suns = snapshot.suns || []
    this.lawnMowers = this.createSmoothedSnapshotEntities(
      (snapshot.lawnMowers || []).map((lawnMower) => ({
        ...lawnMower,
        snapshotTimestamp
      })),
      this.lawnMowers,
      'lawn-mower'
    )
    this.animations = snapshot.animations || []
    this.messages = snapshot.messages || []

    this.projectileManager.projectiles = this.createSmoothedSnapshotEntities(
      (snapshot.projectiles || []).map((projectile) => ({
        ...projectile,
        snapshotTimestamp
      })),
      this.projectileManager.projectiles,
      'projectile'
    )
    this.projectileManager.weaponStaffs = snapshot.weaponStaffs || []
    this.projectileManager.getParticleSystem().particles = snapshot.particles || []
    this.lightningChain.activeChains = snapshot.lightningChains || []
  }

  // In-place merge of a delta entity list (sent every 50ms) into the current
  // array, keyed by id. Mutates existing entities, splices out gone ones, and
  // sets up smoothing fields only for newcomers. Avoids rebuilding the array
  // and avoids per-frame Map+map() allocations of the snapshot path.
  mergeDeltaInPlace(currentList, nextList, snapshotTimestamp, props = ['x', 'y']) {
    if (!Array.isArray(currentList)) return nextList
    const seen = new Set()
    // Build id → entity index for O(1) lookup. Only one allocation per delta.
    const indexById = new Map()
    for (let i = 0; i < currentList.length; i += 1) {
      const ent = currentList[i]
      if (ent && ent.id != null) indexById.set(ent.id, i)
    }
    for (let n = 0; n < nextList.length; n += 1) {
      const next = nextList[n]
      if (!next || next.id == null) continue
      seen.add(next.id)
      const idx = indexById.get(next.id)
      if (idx == null) {
        // New entity: seed smoothing fields and append.
        for (const prop of props) {
          const v = Number(next[prop])
          next[`${prop}Target`] = v
          next[`${prop}Previous`] = v
          next[`${prop}Velocity`] = 0
        }
        next.previousSnapshotTimestamp = snapshotTimestamp
        next.snapshotTimestamp = snapshotTimestamp
        next.lastSnapshotTimestamp = snapshotTimestamp
        currentList.push(next)
        continue
      }
      // Update existing entity in place. Copy scalar fields, refresh smoothing.
      const cur = currentList[idx]
      const previousTimestamp = Number(cur.snapshotTimestamp ?? snapshotTimestamp)
      const elapsedSeconds = Math.max((snapshotTimestamp - previousTimestamp) / 1000, 0.001)
      for (const prop of props) {
        const targetProp = `${prop}Target`
        const previousProp = `${prop}Previous`
        const velocityProp = `${prop}Velocity`
        const nextValue = Number(next[prop])
        const previousValue = Number(cur[targetProp] ?? cur[prop] ?? nextValue)
        cur[previousProp] = previousValue
        cur[targetProp] = nextValue
        cur[velocityProp] = Number.isFinite(nextValue)
          ? (nextValue - previousValue) / elapsedSeconds
          : 0
      }
      // Copy other scalar fields the delta provides without disturbing the
      // smoothed `x/y` (which advanceEntity drives).
      for (const key in next) {
        if (key === 'x' || key === 'y') continue
        if (props.includes(key)) continue
        cur[key] = next[key]
      }
      cur.previousSnapshotTimestamp = previousTimestamp
      cur.snapshotTimestamp = snapshotTimestamp
      cur.lastSnapshotTimestamp = snapshotTimestamp
    }
    // Remove entities whose ids didn't appear in the delta.
    for (let i = currentList.length - 1; i >= 0; i -= 1) {
      const ent = currentList[i]
      if (!ent || ent.id == null || !seen.has(ent.id)) {
        currentList.splice(i, 1)
      }
    }
    return currentList
  }

  applyStateDelta(delta) {
    if (!delta || typeof delta !== 'object') {
      return
    }

    const deltaTimestamp = Number(delta.timestamp ?? Date.now())

    this.isPlaying = delta.isPlaying ?? this.isPlaying
    this.gameOver = delta.gameOver ?? this.gameOver
    this.sunEnergy = delta.sunEnergy ?? this.sunEnergy
    this.zombieEnergy = delta.zombieEnergy ?? this.zombieEnergy

    this.mergeDeltaInPlace(this.zombies, delta.zombies || [], deltaTimestamp)
    this.mergeDeltaInPlace(this.lawnMowers, delta.lawnMowers || [], deltaTimestamp)
  }

  stop() {
    this.isPlaying = false
    this.gameOver = true
  }
}
