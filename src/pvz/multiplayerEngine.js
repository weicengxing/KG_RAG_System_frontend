import { GameEngine } from './engine.js'
import { Renderer } from './renderer.js'
import { plantConfig, zombieConfig, gameConfig } from './config.js'

/**
 * 多人对战游戏引擎
 * 继承单人版GameEngine，添加网络同步功能
 */
export class MultiplayerGameEngine extends GameEngine {
  constructor(canvas, width, height, ws, role) {
    super(canvas, width, height)
    
    this.ws = ws
    this.role = role // 'plant' 或 'zombie'
    
    // 禁用单人版的波次系统
    this.waveSystemEnabled = false
    
    // 多人对战特有的状态
    this.zombieEnergy = 10000
    this.selectedZombie = null
    
    // 事件回调
    this.onPlantPlaced = null
    this.onZombieSpawned = null
    this.onSunCollected = null
    this.onGameOver = null
  }
  
  // 重写启动方法，不初始化波次系统
  start() {
    console.log('[Multiplayer] start() 方法被调用')
    console.log('[Multiplayer] 启动前状态:', {
      isPlaying: this.isPlaying,
      gameOver: this.gameOver,
      canvas: !!this.canvas,
      canvasSize: this.canvas ? {
        width: this.canvas.width,
        height: this.canvas.height
      } : null
    })
    
    this.isPlaying = true
    this.gameOver = false
    this.sunEnergy = 10000
    this.zombieEnergy = 10000
    this.score = 0
    this.zombiesKilled = 0
    this.plantsPlanted = 0
    this.sunsCollected = 0
    this.lastTime = performance.now()
    this.animations = []
    
    // 初始化小推车
    this.initLawnMowers()
    
    // 初始化音效
    this.initAudio()
    
    console.log('[Multiplayer] 启动后状态:', {
      isPlaying: this.isPlaying,
      gameOver: this.gameOver
    })
    
    // 开始游戏循环
    console.log('[Multiplayer] 开始调用 gameLoop()')
    this.gameLoop()
  }
  
  // 重写更新方法，调用父类的更新逻辑（所有植物逻辑都在这里）
  update(deltaTime) {
    if (this.isPaused) return
    
    // 调用父类的更新逻辑（所有植物逻辑都在这里）
    super.update(deltaTime)
  }
  
  // 重写波次更新方法，多人版不需要
  updateWave(deltaTime) {
    // 多人对战没有波次系统
  }
  
  // 接收服务器消息（只处理事件通知，不做状态同步）
  onServerMessage(message) {
    const { type, payload } = message
    
    switch (type) {
      case 'plant_placed':
        this.handleRemotePlantAction(payload)
        break
        
      case 'zombie_spawned':
        this.handleRemoteZombieAction(payload)
        break
        
      default:
        // 兼容旧的事件类型
        if (type.startsWith('plant_place_')) {
          this.handleRemotePlantAction({
            plant_type: type.replace('plant_place_', ''),
            ...payload
          })
        } else if (type.startsWith('zombie_spawn_')) {
          this.handleRemoteZombieAction({
            zombie_type: type.replace('zombie_spawn_', ''),
            ...payload
          })
        }
    }
  }
  
  // 处理远程植物放置（统一使用父类方法，确保初始化完全一致）
  handleRemotePlantAction(payload) {
    const plantType = payload.plant_type
    
    // 检查配置是否存在
    const config = plantConfig[plantType]
    if (!config) {
      console.warn('[Multiplayer] 未知的植物类型:', plantType)
      return
    }
    
    // 去重检查：检查该位置是否已有植物
    const gridWidth = config.gridWidth || 1
    const gridHeight = config.gridHeight || 1
    
    // 检查区域是否为空
    if (!this.grid.isAreaEmpty(payload.col, payload.row, gridWidth, gridHeight)) {
      console.warn(`[Multiplayer] 位置 (${payload.col}, ${payload.row}) 已有植物，跳过放置`, plantType)
      return
    }
    
    // 【修复】直接调用父类的 plant 方法，确保初始化完全一致（包括 attackTimer 等所有字段）
    super.plant(payload.col, payload.row, plantType)
    
    // 触发事件
    if (this.onPlantPlaced) {
      const plant = this.plants[this.plants.length - 1] // 获取最后添加的植物
      this.onPlantPlaced(plant, payload)
    }
  }
  
  // 处理远程僵尸生成
  handleRemoteZombieAction(payload) {
    const zombieType = payload.zombie_type
    const config = zombieConfig[zombieType]
    
    if (!config) {
      console.warn('[Multiplayer] 未知的僵尸类型:', zombieType)
      return
    }
    
    const zombie = {
      type: zombieType,
      x: gameConfig.gridCols * gameConfig.cellWidth,
      y: (payload.lane || 0) * gameConfig.cellHeight,
      width: config.width,
      height: config.height,
      hp: config.hp,
      maxHp: config.hp,
      shieldHp: config.shieldHp || 0,
      baseSpeed: config.speed,
      state: 'WALKING',
      attackTimer: 0,
      targetPlant: null,
      slowDuration: 0,
      slowFactor: 1,
      // 魅惑相关字段（与单人版保持完全一致）
      isCharmed: false,
      originalHp: config.hp,
      originalDamage: config.attackDamage,
      charmedSpeed: config.speed,
      attackZombieTimer: 0
    }
    
    this.zombies.push(zombie)
    
    // 触发事件
    if (this.onZombieSpawned) {
      this.onZombieSpawned(zombie, payload)
    }
  }
  
  // 重写种植植物方法，发送到服务器
  plant(col, row, plantType) {
    if (this.role !== 'plant') {
      console.warn('[Multiplayer] 只有植物玩家可以种植')
      return
    }
    
    const config = plantConfig[plantType]
    if (this.sunEnergy < config.cost) {
      console.warn('[Multiplayer] 阳光不足')
      return
    }
    
    // 发送到服务器
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: `plant_place_${plantType}`,
        payload: {
          row,
          col,
          plant_type: plantType,
          cost: config.cost
        }
      }))
    }
    
    // 本地乐观更新
    super.plant(col, row, plantType)
  }
  
  // 生成僵尸（僵尸玩家调用）
  spawnZombie(row, zombieType) {
    if (this.role !== 'zombie') {
      console.warn('[Multiplayer] 只有僵尸玩家可以生成僵尸')
      return
    }
    
    const config = zombieConfig[zombieType]
    if (this.zombieEnergy < (config.cost || 50)) {
      console.warn('[Multiplayer] 能量不足')
      return
    }
    
    // 发送到服务器
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: `zombie_spawn_${zombieType}`,
        payload: {
          lane: row,
          zombie_type: zombieType,
          cost: config.cost || 50
        }
      }))
    }
    
    // 扣除能量
    this.zombieEnergy -= (config.cost || 50)
  }
  
  // 收集阳光（植物玩家专用）
  collectSun(sun) {
    if (this.role !== 'plant') {
      return false
    }
    
    // 调用父类方法
    const collected = super.collectSun(sun)
    
    if (collected) {
      // 发送到服务器
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'plant_collect_sun',
          payload: {
            sun_id: sun.id || sun
          }
        }))
      }
      
      // 触发事件
      if (this.onSunCollected) {
        this.onSunCollected(sun)
      }
    }
    
    return collected
  }
  
  // 选择植物
  selectPlant(plantType) {
    if (this.role !== 'plant') {
      return false
    }
    
    const config = plantConfig[plantType]
    if (!config) {
      return false
    }
    
    if (this.sunEnergy < config.cost) {
      return false
    }
    
    this.selectedPlant = plantType
    return true
  }
  
  // 选择僵尸
  selectZombie(zombieType) {
    if (this.role !== 'zombie') {
      return false
    }
    
    const config = zombieConfig[zombieType]
    if (!config) {
      return false
    }
    
    if (this.zombieEnergy < (config.cost || 50)) {
      return false
    }
    
    this.selectedZombie = zombieType
    return true
  }
  
  // 停止游戏
  stop() {
    this.isPlaying = false
    this.gameOver = true
    
    // 清理资源
    if (this.ws) {
      try {
        this.ws.close()
      } catch (error) {
        console.error('[Multiplayer] 关闭WebSocket失败:', error)
      }
    }
  }
}
