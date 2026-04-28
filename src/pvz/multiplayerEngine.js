import { GameEngine } from './engine.js'
import { plantConfig, zombieConfig, gameConfig } from './config.js'

const SNAPSHOT_PROJECTILE_KEYS_TO_DROP = new Set([
  'targetPlant',
  'targetZombie',
  'sourcePlant',
  'originPlant',
  'engine',
  'game',
  'ws'
])

const MULTIPLAYER_GRASS_COLOR = '#4a7c4e'
const REMOTE_INTERPOLATION_DELAY_MS = 60
const REMOTE_MAX_EXTRAPOLATION_MS = 180
const REMOTE_POSITION_EPSILON = 0.1
// Client-side prediction tuning. While the zombie side waits for the next delta
// (50ms cadence) we keep stepping entities with their last known velocity. When
// a delta arrives, small server-vs-local divergence is silently absorbed; only
// noticeable drift triggers a smoothed correction.
const PREDICTION_SOFT_RECONCILE_PX = 6   // ≤6px diff: snap to local prediction (no visible jump)
const PREDICTION_HARD_SNAP_PX = 80       // >80px diff: hard snap (teleport / spawn)
const PREDICTION_RECONCILE_DURATION_MS = 200  // 6..80px: ease back to authoritative over 200ms
const SNAPSHOT_SEND_INTERVAL_MS = 500
const STATE_DELTA_SEND_INTERVAL_MS = 50
const ZOMBIE_DEATH_ENERGY_REWARD = 20
const ZOMBIE_PASSIVE_ENERGY_REWARD = 100
const ZOMBIE_PASSIVE_ENERGY_INTERVAL = 5
const MULTIPLAYER_ZOMBIE_TIME_LIMIT = 6 * 60

const getMultiplayerInitialSunEnergy = () => gameConfig.multiplayer?.initialSunEnergy ?? 10000
const getMultiplayerInitialZombieEnergy = () => gameConfig.multiplayer?.initialZombieEnergy ?? 10000
const REMOTE_HIT_SOUND_INTERVAL_MS = 140

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

    this.zombieEnergy = getMultiplayerInitialZombieEnergy()
    this.selectedZombie = null
    this.lastBroadcastState = ''
    this.lastDeltaBroadcastState = ''
    this.lastPlantsSignature = ''
    this.nextZombieId = 1
    this.lastSnapshotSyncTimestamp = 0
    this.lastDeltaSyncTimestamp = 0
    this.seenRemoteAnimationKeys = new Set()
    this.seenRemoteProjectileKeys = new Set()
    this.seenRemoteLightningKeys = new Set()
    this.lastRemoteHitSoundAt = 0
    this.nextProjectileSyncId = 1
    this.nextAnimationSyncId = 1
    this.zombiePassiveEnergyTimer = 0
    this.multiplayerElapsedTime = 0
    this.gameOverPayload = null

    this.onPlantPlaced = null
    this.onZombieSpawned = null
    this.onSunCollected = null
    this.onGameOver = null
  }

  start() {
    this.isPlaying = true
    this.isPaused = false
    this.gameOver = false

    this.sunEnergy = getMultiplayerInitialSunEnergy()
    this.zombieEnergy = getMultiplayerInitialZombieEnergy()
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
    this.seenRemoteAnimationKeys = new Set()
    this.seenRemoteProjectileKeys = new Set()
    this.seenRemoteLightningKeys = new Set()
    this.lastRemoteHitSoundAt = 0
    this.nextProjectileSyncId = 1
    this.nextAnimationSyncId = 1
    this.zombiePassiveEnergyTimer = 0
    this.multiplayerElapsedTime = 0
    this.gameOverPayload = null

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
    const previousZombies = this.zombies.map((zombie) => ({
      id: zombie.id,
      x: Number(zombie.x || 0),
      width: Number(zombie.width || 0),
      isCharmed: !!zombie.isCharmed
    }))

    this.multiplayerElapsedTime += deltaTime
    this.updateZombiePassiveEnergy(deltaTime)

    super.update(deltaTime)
    this.rewardDefeatedZombies(previousZombies)

    if (!this.gameOver && this.multiplayerElapsedTime >= MULTIPLAYER_ZOMBIE_TIME_LIMIT) {
      this.finishMultiplayerGame('plant', 'zombie_timeout', '僵尸方 6 分钟内未获胜，植物方获胜！')
    }

    if (!wasGameOver && this.gameOver && this.onGameOver) {
      this.onGameOver(this.gameOverPayload || {
        winner: 'zombie',
        loser: 'plant',
        reason: 'zombie_reached_home'
      })
    }
  }

  updateZombiePassiveEnergy(deltaTime) {
    this.zombiePassiveEnergyTimer += deltaTime
    while (this.zombiePassiveEnergyTimer >= ZOMBIE_PASSIVE_ENERGY_INTERVAL) {
      this.zombiePassiveEnergyTimer -= ZOMBIE_PASSIVE_ENERGY_INTERVAL
      this.zombieEnergy += ZOMBIE_PASSIVE_ENERGY_REWARD
    }
  }

  rewardDefeatedZombies(previousZombies) {
    if (!previousZombies.length) return

    const currentIds = new Set(this.zombies.map((zombie) => zombie.id))
    let defeatedCount = 0

    for (const previous of previousZombies) {
      if (!previous.id || currentIds.has(previous.id)) continue

      const leftByCharm = previous.isCharmed && previous.x >= this.width - previous.width
      if (!leftByCharm) {
        defeatedCount += 1
      }
    }

    if (defeatedCount > 0) {
      this.zombieEnergy += defeatedCount * ZOMBIE_DEATH_ENERGY_REWARD
    }
  }

  rewardPlantEaten(plant) {
    const cost = plantConfig[plant?.type]?.cost || 0
    if (cost > 0) {
      this.zombieEnergy += cost * 2
    }
  }

  onZombieAtePlant(plant) {
    if (this.isAuthoritative) {
      this.rewardPlantEaten(plant)
    }
  }

  finishMultiplayerGame(winner, reason, message) {
    this.gameOver = true
    this.isPlaying = false
    this.gameOverPayload = {
      winner,
      loser: winner === 'plant' ? 'zombie' : 'plant',
      reason
    }
    if (message) {
      this.showMessage(message, winner === 'plant' ? '#22c55e' : '#f87171')
    }
    this.playSound(winner === 'plant' ? 'waveComplete' : 'gameOver')
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

  unlockAudio() {
    try {
      if (!this.audioContext) {
        this.initAudio()
      }
      if (this.audioContext?.state === 'suspended') {
        this.audioContext.resume().catch(() => {})
      }
    } catch {
      // Browser audio policies can still deny this outside a gesture.
    }
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

  digupPlant(plant) {
    if (!this.isAuthoritative || this.role !== 'plant' || !plant) {
      return false
    }

    const beforeCount = this.plants.length
    super.digupPlant(plant)
    return this.plants.length < beforeCount
  }

  spawnZombie(row, zombieType) {
    if (this.role !== 'zombie') {
      return false
    }

    this.unlockAudio()

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

    this.unlockAudio()

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

    // 1. Predict zombies forward using their server-reported speed/state.
    //    This runs at 60fps, so we get smooth motion regardless of delta cadence.
    for (const zombie of this.zombies) {
      this._predictZombie(zombie, deltaTime, now)
    }

    // 2. Predict projectiles using their last known velocity.
    for (const projectile of this.projectileManager.projectiles) {
      this._predictBallistic(projectile, deltaTime, now)
    }

    // 3. Lawn mowers: same ballistic model.
    for (const lawnMower of this.lawnMowers) {
      this._predictBallistic(lawnMower, deltaTime, now)
    }

    // 4. Local fire-particle reconstruction (P3).
    this._fireParticleAccum = (this._fireParticleAccum || 0) + deltaTime
    if (this._fireParticleAccum > 0.05) {
      this._fireParticleAccum = 0
      const ps = this.projectileManager.getParticleSystem()
      for (const projectile of this.projectileManager.projectiles) {
        if (projectile.type === 'firePea') {
          ps.emitFireParticles(projectile.x, projectile.y, 2)
        }
      }
    }
    this.projectileManager.getParticleSystem().update(deltaTime)
    this.updateAnimations(deltaTime)
    this.updateMessages(deltaTime)
  }

  // Walk a zombie locally based on its last server-reported speed/state. If a
  // pending reconciliation is set (server position diverged from local guess),
  // ease toward it over PREDICTION_RECONCILE_DURATION_MS.
  _predictZombie(zombie, deltaTime, now) {
    if (zombie.state === 'WALKING' && typeof zombie.baseSpeed === 'number') {
      let actualSpeed = zombie.baseSpeed
      if (zombie.slowDuration > 0) {
        zombie.slowDuration = Math.max(0, zombie.slowDuration - deltaTime)
        actualSpeed *= zombie.slowFactor || 0.5
      }
      const moveStep = actualSpeed * deltaTime * 60
      zombie.x += zombie.isCharmed ? moveStep : -moveStep
    }
    this._applyReconciliation(zombie, now)
  }

  // Move with last-known velocity (px/sec). Use *Velocity computed from the
  // delta path so projectiles keep flying smoothly between deltas.
  _predictBallistic(entity, deltaTime, now) {
    if (typeof entity.xVelocity === 'number') entity.x += entity.xVelocity * deltaTime
    if (typeof entity.yVelocity === 'number') entity.y += entity.yVelocity * deltaTime
    this._applyReconciliation(entity, now)
  }

  // If the latest authoritative delta diverged from our prediction, smooth the
  // gap over a short window. _reconcileEnd is set in mergeDeltaInPlace.
  _applyReconciliation(entity, now) {
    const end = entity._reconcileEnd
    if (!end || now >= end) {
      if (entity._reconcileEnd) {
        entity._reconcileEnd = 0
        entity._reconcileDx = 0
        entity._reconcileDy = 0
      }
      return
    }
    // Remaining fraction of the correction window. Apply linear easing each
    // frame: move a proportional chunk of the residual gap.
    const start = entity._reconcileStart || (end - PREDICTION_RECONCILE_DURATION_MS)
    const total = Math.max(1, end - start)
    const remaining = Math.max(0, end - now)
    // How much of the remaining gap to consume this frame.
    const frameMs = Math.min(remaining, 16)
    const frac = frameMs / Math.max(1, remaining)
    const dx = (entity._reconcileDx || 0) * frac
    const dy = (entity._reconcileDy || 0) * frac
    entity.x += dx
    entity.y += dy
    entity._reconcileDx = (entity._reconcileDx || 0) - dx
    entity._reconcileDy = (entity._reconcileDy || 0) - dy
  // Suppress unused-warn on `total`.
    void total
  }

  serializeLightningChains() {
    return this.lightningChain.getActiveChains().map((chain) => ({
      id: chain.id,
      currentJump: chain.currentJump,
      damage: chain.damage,
      jumpDelay: chain.jumpDelay,
      delayTimer: chain.delayTimer,
      isComplete: chain.isComplete,
      jumps: (chain.jumps || []).map((jump) => ({
        damage: jump.damage,
        segmentIndex: jump.segmentIndex,
        segmentProgress: jump.segmentProgress,
        isComplete: jump.isComplete,
        time: jump.time,
        segments: (jump.segments || []).map((segment) => ({
          startX: roundToTenth(segment.startX),
          startY: roundToTenth(segment.startY),
          baseEndX: roundToTenth(segment.baseEndX),
          baseEndY: roundToTenth(segment.baseEndY),
          endX: roundToTenth(segment.endX),
          endY: roundToTenth(segment.endY),
          segmentIndex: segment.segmentIndex,
          offsetAmount: roundToTenth(segment.offsetAmount || 0)
        }))
      }))
    }))
  }

  serializeAnimations() {
    return this.animations.map((animation) => {
      if (!animation.syncId) {
        animation.syncId = `${animation.type}-${Date.now()}-${this.nextAnimationSyncId++}`
      }
      return { ...animation }
    })
  }

  serializeProjectiles() {
    return this.projectileManager.getProjectiles().map((projectile) => {
      const out = {}
      if (!projectile.syncId) {
        projectile.syncId = `${projectile.type}-${Date.now()}-${this.nextProjectileSyncId++}`
      }
      for (const key in projectile) {
        if (!SNAPSHOT_PROJECTILE_KEYS_TO_DROP.has(key)) {
          out[key] = projectile[key]
        }
      }
      return out
    })
  }

  getProjectileMergeKey(projectile, index) {
    if (projectile?.syncId) {
      return projectile.syncId
    }
    return `${projectile?.type}:${Math.round((projectile?.row ?? 0))}:${Math.round((projectile?.x ?? 0) / 4)}:${index}`
  }

  serializeGameState() {
    // The whole payload is JSON.stringify'd by syncAuthoritativeState before send,
    // so we do not need to deep-clone individual fields here. Returning live
    // references is safe because nothing mutates them between this call and the
    // synchronous send. Saves ~8 redundant JSON.parse(JSON.stringify(...)) round
    // trips per snapshot, ~500ms cadence.
    return {
      version: 1,
      role: 'plant',
      timestamp: Date.now(),
      isPlaying: this.isPlaying,
      gameOver: this.gameOver,
      sunEnergy: this.sunEnergy,
      zombieEnergy: this.zombieEnergy,
      autoCollectSun: this.autoCollectSun,
      plants: this.plants,
      zombies: this.zombies.map((zombie) => {
        // Strip non-serializable references (Plant/Zombie object pointers).
        const out = { ...zombie }
        out.targetPlant = null
        out.targetZombie = null
        return out
      }),
      suns: this.suns,
      lawnMowers: this.lawnMowers,
      animations: this.serializeAnimations(),
      messages: this.messages,
      projectiles: this.serializeProjectiles(),
      weaponStaffs: this.projectileManager.getWeaponStaffs(),
      // particles intentionally NOT shipped — they are pure visual fluff that
      // the zombie side reconstructs locally from firePea projectile positions
      // (see spawnLocalParticlesForFireProjectiles).
      lightningChains: this.serializeLightningChains()
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
      animations: this.serializeAnimations(),
      projectiles: this.serializeProjectiles(),
      weaponStaffs: this.projectileManager.getWeaponStaffs(),
      lightningChains: this.serializeLightningChains(),
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
    const previousZombies = this.zombies.map((zombie) => ({
      id: zombie.id,
      hp: Number(zombie.hp || 0),
      shieldHp: Number(zombie.shieldHp || 0)
    }))

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

    this.mergeDeltaInPlace(this.zombies, snapshot.zombies || [], snapshotTimestamp)
    this.playRemoteCombatSounds(previousZombies, this.zombies)
    this.suns = snapshot.suns || []
    this.mergeDeltaInPlace(this.lawnMowers, snapshot.lawnMowers || [], snapshotTimestamp)
    this.applyRemoteAnimations(snapshot.animations || [])
    this.messages = snapshot.messages || []

    // Projectiles have no stable id (they're created/destroyed quickly).
    // Wholesale-replace and seed velocity from x/y delta so prediction works.
    const incomingProjectiles = snapshot.projectiles || []
    const oldProjectilesByKey = new Map()
    for (let i = 0; i < this.projectileManager.projectiles.length; i += 1) {
      const p = this.projectileManager.projectiles[i]
      const key = this.getProjectileMergeKey(p, i)
      if (!oldProjectilesByKey.has(key)) oldProjectilesByKey.set(key, p)
    }
    this.projectileManager.projectiles = incomingProjectiles.map((p, index) => {
      const out = p
      const key = this.getProjectileMergeKey(out, index)
      const prev = oldProjectilesByKey.get(key)
      if (prev) {
        // Reuse local x for smoothness; carry forward velocity if available.
        out.x = prev.x
        out.y = prev.y
        out.xVelocity = typeof prev.xVelocity === 'number' ? prev.xVelocity : (Number(out.speed) || 300)
        out.yVelocity = prev.yVelocity || 0
      } else {
        // New projectile — fly rightward at its configured speed.
        out.xVelocity = Number(out.speed) || 300
        out.yVelocity = 0
      }
      return out
    })
    this.playRemoteProjectileSounds(this.projectileManager.projectiles)
    this.projectileManager.weaponStaffs = snapshot.weaponStaffs || []
    // Particles are no longer shipped over the wire — preserve whatever the
    // local visual reconstruction has produced. (Older payloads with `particles`
    // are still honored to avoid breaking mid-upgrade sessions.)
    if (Array.isArray(snapshot.particles)) {
      this.projectileManager.getParticleSystem().particles = snapshot.particles
    }
    this.lightningChain.activeChains = snapshot.lightningChains || []
    this.playRemoteLightningSounds(snapshot.lightningChains || [])
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
        // New entity: seed prediction fields and append.
        for (const prop of props) {
          const v = Number(next[prop])
          next[`${prop}Target`] = v
          next[`${prop}Previous`] = v
          next[`${prop}Velocity`] = 0
        }
        next.snapshotTimestamp = snapshotTimestamp
        next.lastSnapshotTimestamp = snapshotTimestamp
        next._reconcileEnd = 0
        next._reconcileDx = 0
        next._reconcileDy = 0
        currentList.push(next)
        continue
      }
      // Existing entity: copy non-position scalars; reconcile position.
      const cur = currentList[idx]
      const previousTimestamp = Number(cur.snapshotTimestamp ?? snapshotTimestamp)
      const elapsedSeconds = Math.max((snapshotTimestamp - previousTimestamp) / 1000, 0.001)

      // Position reconciliation: compare server's authoritative position to
      // wherever local prediction has drifted to. Small diff -> trust local.
      // Big diff -> hard snap. Medium -> queue a smoothed correction.
      for (const prop of props) {
        const targetProp = `${prop}Target`
        const previousProp = `${prop}Previous`
        const velocityProp = `${prop}Velocity`
        const serverValue = Number(next[prop])
        const previousServerValue = Number(cur[targetProp] ?? cur[prop] ?? serverValue)
        cur[previousProp] = previousServerValue
        cur[targetProp] = serverValue
        cur[velocityProp] = Number.isFinite(serverValue)
          ? (serverValue - previousServerValue) / elapsedSeconds
          : 0
      }
      // Compute drift vs local prediction (only for x/y).
      const dx = (Number(next.x) || 0) - (Number(cur.x) || 0)
      const dy = (Number(next.y) || 0) - (Number(cur.y) || 0)
      const distSq = dx * dx + dy * dy
      if (distSq <= PREDICTION_SOFT_RECONCILE_PX * PREDICTION_SOFT_RECONCILE_PX) {
        // Within tolerance — keep local prediction, no visible adjustment.
        cur._reconcileEnd = 0
        cur._reconcileDx = 0
        cur._reconcileDy = 0
      } else if (distSq >= PREDICTION_HARD_SNAP_PX * PREDICTION_HARD_SNAP_PX) {
        // Big drift (likely teleport / state mismatch) — hard snap to server.
        cur.x = Number(next.x) || cur.x
        cur.y = Number(next.y) || cur.y
        cur._reconcileEnd = 0
        cur._reconcileDx = 0
        cur._reconcileDy = 0
      } else {
        // Moderate drift — fold the gap in over PREDICTION_RECONCILE_DURATION_MS.
        // Accumulate so back-to-back deltas don't lose pending corrections.
        cur._reconcileDx = (cur._reconcileDx || 0) + dx
        cur._reconcileDy = (cur._reconcileDy || 0) + dy
        cur._reconcileStart = snapshotTimestamp
        cur._reconcileEnd = snapshotTimestamp + PREDICTION_RECONCILE_DURATION_MS
      }

      // Copy other scalar fields the delta provides without touching x/y or
      // smoothing bookkeeping.
      for (const key in next) {
        if (key === 'x' || key === 'y') continue
        if (props.includes(key)) continue
        if (key.startsWith('_reconcile')) continue
        cur[key] = next[key]
      }
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
    const previousZombies = this.zombies.map((zombie) => ({
      id: zombie.id,
      hp: Number(zombie.hp || 0),
      shieldHp: Number(zombie.shieldHp || 0)
    }))

    this.isPlaying = delta.isPlaying ?? this.isPlaying
    this.gameOver = delta.gameOver ?? this.gameOver
    this.sunEnergy = delta.sunEnergy ?? this.sunEnergy
    this.zombieEnergy = delta.zombieEnergy ?? this.zombieEnergy
    if (Array.isArray(delta.lightningChains)) {
      this.lightningChain.activeChains = delta.lightningChains
      this.playRemoteLightningSounds(delta.lightningChains)
    }
    if (Array.isArray(delta.animations)) {
      this.applyRemoteAnimations(delta.animations)
    }
    if (Array.isArray(delta.projectiles)) {
      this.applyRemoteProjectiles(delta.projectiles)
    }
    if (Array.isArray(delta.weaponStaffs)) {
      this.projectileManager.weaponStaffs = delta.weaponStaffs
    }

    this.mergeDeltaInPlace(this.zombies, delta.zombies || [], deltaTimestamp)
    this.playRemoteCombatSounds(previousZombies, this.zombies)
    this.mergeDeltaInPlace(this.lawnMowers, delta.lawnMowers || [], deltaTimestamp)
  }

  getRemoteAnimationKey(animation) {
    if (animation.syncId) {
      return animation.syncId
    }
    return `${animation.type}:${Math.round(animation.x || 0)}:${Math.round(animation.y || 0)}:${Math.round((animation.duration || 0) * 100)}`
  }

  getRemoteProjectileKey(projectile, index) {
    if (projectile.syncId) {
      return projectile.syncId
    }
    return `${projectile.type}:${projectile.row ?? ''}:${Math.round((projectile.x || 0) / 120)}:${index}`
  }

  playRemoteSound(soundName) {
    if (this.isAuthoritative) return
    this.playSound(soundName)
  }

  applyRemoteAnimations(animations = []) {
    this.animations = animations.map((animation) => ({ ...animation }))
    this.playRemoteAnimationSounds(this.animations)
  }

  applyRemoteProjectiles(incomingProjectiles = []) {
    const oldProjectilesByKey = new Map()
    for (let i = 0; i < this.projectileManager.projectiles.length; i += 1) {
      const projectile = this.projectileManager.projectiles[i]
      const key = this.getProjectileMergeKey(projectile, i)
      if (!oldProjectilesByKey.has(key)) oldProjectilesByKey.set(key, projectile)
    }

    this.projectileManager.projectiles = incomingProjectiles.map((projectile, index) => {
      const out = { ...projectile }
      const key = this.getProjectileMergeKey(out, index)
      const prev = oldProjectilesByKey.get(key)
      if (prev) {
        out.x = prev.x
        out.y = prev.y
        out.xVelocity = typeof prev.xVelocity === 'number' ? prev.xVelocity : (Number(out.speed) || 300)
        out.yVelocity = prev.yVelocity || 0
      } else {
        out.xVelocity = Number(out.speed) || 300
        out.yVelocity = 0
      }
      return out
    })
    this.playRemoteProjectileSounds(this.projectileManager.projectiles)
  }

  playRemoteAnimationSounds(animations = []) {
    const nextKeys = new Set()
    for (const animation of animations) {
      const key = this.getRemoteAnimationKey(animation)
      nextKeys.add(key)
      if (this.seenRemoteAnimationKeys.has(key)) continue

      if (
        animation.type?.includes('Explode') ||
        animation.type === 'explode' ||
        animation.type === 'lightningSurround' ||
        animation.type === 'potatoMineExplode' ||
        animation.type === 'jalapenoExplode'
      ) {
        this.playRemoteSound('explode')
      } else if (
        animation.type === 'zombieDeath' ||
        animation.type === 'death'
      ) {
        this.playRemoteSound('zombieDeath')
      } else if (
        animation.type === 'plant'
      ) {
        this.playRemoteSound('plant')
      } else if (
        animation.type === 'bladeCut' ||
        animation.type === 'staffHit' ||
        animation.type === 'shieldBreak'
      ) {
        this.playRemoteSound('hit')
      }
    }
    this.seenRemoteAnimationKeys = nextKeys
  }

  playRemoteProjectileSounds(projectiles = []) {
    const nextKeys = new Set()
    for (let i = 0; i < projectiles.length; i += 1) {
      const projectile = projectiles[i]
      const key = this.getRemoteProjectileKey(projectile, i)
      nextKeys.add(key)
      if (!this.seenRemoteProjectileKeys.has(key)) {
        this.playRemoteSound(projectile.type === 'cannon' ? 'explode' : 'shoot')
      }
    }
    this.seenRemoteProjectileKeys = nextKeys
  }

  playRemoteLightningSounds(lightningChains = []) {
    const nextKeys = new Set()
    for (const chain of lightningChains) {
      if (!chain?.id) continue
      nextKeys.add(chain.id)
      if (!this.seenRemoteLightningKeys.has(chain.id)) {
        this.playRemoteSound('explode')
      }
    }
    this.seenRemoteLightningKeys = nextKeys
  }

  playRemoteCombatSounds(previousZombies, currentZombies) {
    if (this.isAuthoritative) return

    const currentById = new Map()
    for (const zombie of currentZombies) {
      if (zombie?.id != null) {
        currentById.set(zombie.id, zombie)
      }
    }

    let tookDamage = false
    for (const previous of previousZombies) {
      const current = currentById.get(previous.id)
      if (!current) {
        this.playRemoteSound('zombieDeath')
        continue
      }

      const previousTotal = previous.hp + previous.shieldHp
      const currentTotal = Number(current.hp || 0) + Number(current.shieldHp || 0)
      if (currentTotal < previousTotal) {
        tookDamage = true
      }
    }

    const now = Date.now()
    if (tookDamage && now - this.lastRemoteHitSoundAt > REMOTE_HIT_SOUND_INTERVAL_MS) {
      this.lastRemoteHitSoundAt = now
      this.playRemoteSound('hit')
    }
  }

  stop() {
    this.isPlaying = false
    this.gameOver = true
  }
}
