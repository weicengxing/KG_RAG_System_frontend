import { gameConfig, plantConfig, zombieConfig } from './config.js'
import { Renderer } from './renderer.js'
import { InputHandler } from './input.js'
import { ProjectileManager } from './projectileManager.js'
import { LightningChain } from './lightningSystem.js'
import request from '../utils/request.js'

// 网格类
class Grid {
  constructor(cols, rows, cellWidth, cellHeight) {
    this.cols = cols
    this.rows = rows
    this.cellWidth = cellWidth
    this.cellHeight = cellHeight
    this.cells = Array(rows).fill(null).map(() => Array(cols).fill(null))
  }
  
  // 检查区域是否为空
  isAreaEmpty(col, row, gridWidth = 1, gridHeight = 1) {
    for (let r = row; r < row + gridHeight; r++) {
      for (let c = col; c < col + gridWidth; c++) {
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) {
          return false // 超出边界
        }
        if (this.cells[r][c] !== null) {
          return false // 格子已被占用
        }
      }
    }
    return true
  }
  
  // 放置植物（支持多格子）
  placePlant(col, row, plant, gridWidth = 1, gridHeight = 1) {
    for (let r = row; r < row + gridHeight; r++) {
      for (let c = col; c < col + gridWidth; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.cells[r][c] = plant
        }
      }
    }
  }
  
  // 移除植物（支持多格子）
  removePlant(col, row, gridWidth = 1, gridHeight = 1) {
    for (let r = row; r < row + gridHeight; r++) {
      for (let c = col; c < col + gridWidth; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.cells[r][c] = null
        }
      }
    }
  }
  
  // 获取格子中的植物
  getPlant(col, row) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      return this.cells[row][col]
    }
    return null
  }
  
  // 像素坐标转网格坐标
  pixelToGrid(x, y) {
    const col = Math.floor(x / this.cellWidth)
    const row = Math.floor(y / this.cellHeight)
    return { col, row }
  }
  
  // 网格坐标转像素坐标
  gridToPixel(col, row) {
    return {
      x: col * this.cellWidth,
      y: row * this.cellHeight
    }
  }
  
  // 检查格子是否为空
  isEmpty(col, row) {
    return this.getPlant(col, row) === null
  }
}

// 游戏引擎类
export class GameEngine {
  constructor(canvas, width, height) {
    this.canvas = canvas
    this.width = width
    this.height = height
    this.ctx = canvas.getContext('2d')
    
    // 游戏状态
    this.isPlaying = false
    this.isPaused = false
    this.gameOver = false
    
    // 时间系统
    this.lastTime = 0
    this.deltaTime = 0
    
    // 实体列表
    this.plants = []
    this.zombies = []
    this.projectiles = []
    this.suns = []
    this.lawnMowers = []
    this.weaponStaffs = [] // 金箍棒实体列表
    
    // 网格系统
    this.grid = new Grid(
      gameConfig.gridCols,
      gameConfig.gridRows,
      gameConfig.cellWidth,
      gameConfig.cellHeight
    )
    
    // 游戏数据
    this.sunEnergy = 10000
    this.score = 0
    this.wave = 1
    this.totalScore = 0
    this.zombiesKilled = 0
    this.plantsPlanted = 0
    this.sunsCollected = 0
    this.wavesCleared = 0
    
    // 自动收集阳光功能
    this.autoCollectSun = false
    
    // 波次系统
    this.currentWaveConfig = null
    this.zombieSpawnQueue = []
    this.waveSpawnTimer = 0
    this.isWaveActive = false
    this.waveCooldown = 0
    
    // 计时器
    this.sunFallTimer = 0
    this.zombieSpawnTimer = 0
    
    // 选择状态
    this.selectedPlant = null
    this.plantCooldowns = {}
    
    // 允许的植物列表（从植物选择页面传入）
    this.allowedPlants = null
    
    // 铲除模式
    this.isShovelMode = false
    
    // 玉米加农炮瞄准模式
    this.isCannonAimingMode = false
    this.activeCannon = null
    
    // 渲染器
    this.renderer = new Renderer(this.ctx)
    
    // 输入处理器
    this.inputHandler = new InputHandler(this)
    
    // 消息队列
    this.messages = []
    
    // 成就系统
    this.achievements = {
      firstKill: { unlocked: false, name: '初试锋芒', description: '击杀第一个僵尸' },
      wave1: { unlocked: false, name: '初次挑战', description: '完成第1波' },
      wave5: { unlocked: false, name: '僵尸终结者', description: '完成第5波' },
      score500: { unlocked: false, name: '积分达人', description: '单局达到500分' },
      score1000: { unlocked: false, name: '积分大师', description: '单局达到1000分' },
      plant10: { unlocked: false, name: '绿化先锋', description: '种植10个植物' },
      sun50: { unlocked: false, name: '阳光收集者', description: '收集50次阳光' }
    }
    
    // 音效系统
    this.audioContext = null
    this.isMuted = false
    
    // 动画系统
    this.animations = []
    
    // 子弹管理器
    this.projectileManager = new ProjectileManager(this)
    
    // 闪电链系统
    this.lightningChain = new LightningChain(this)
  }
  
  // 启动游戏
  start() {
    this.isPlaying = true
    this.gameOver = false
    this.sunEnergy = 10000
    this.score = 0
    this.wave = 1
    this.zombiesKilled = 0
    this.plantsPlanted = 0
    this.sunsCollected = 0
    this.currentWaveConfig = null
    this.zombieSpawnQueue = []
    this.isWaveActive = false
    this.waveCooldown = 10  // 游戏开始后10秒才开始第一波，给玩家充足准备时间
    this.lastTime = performance.now()
    this.animations = []
    this.lawnMowers = []
    
    // 初始化小推车
    this.initLawnMowers()
    
    // 初始化波次配置
    this.initWave(1)
    
    // 初始化音效
    this.initAudio()
    
    // 加载保存的成就
    this.loadAchievements()
    
    this.gameLoop()
  }
  
  // 初始化小推车
  initLawnMowers() {
    this.lawnMowers = []
    
    // 为每一行创建一个小推车，放在最左边的格子中
    for (let row = 0; row < gameConfig.gridRows; row++) {
      const lawnMower = {
        id: row,
        x: gameConfig.lawnMowers.col * gameConfig.cellWidth,
        y: row * gameConfig.cellHeight,
        width: gameConfig.cellWidth,
        height: gameConfig.cellHeight,
        state: 'idle', // idle, moving, used
        row: row,
        col: gameConfig.lawnMowers.col,
        speed: gameConfig.lawnMowers.speed,
        damage: gameConfig.lawnMowers.damage,
        triggerDistance: gameConfig.lawnMowers.triggerDistance
      }
      
      this.lawnMowers.push(lawnMower)
    }
  }
  
  // 更新小推车
  updateLawnMowers(deltaTime) {
    for (const lawnMower of this.lawnMowers) {
      if (lawnMower.state === 'idle') {
        // 检查是否有僵尸到达触发区域
        for (const zombie of this.zombies) {
          const zombieRow = Math.floor(zombie.y / gameConfig.cellHeight)
          
          if (zombieRow === lawnMower.row && 
              zombie.x < lawnMower.x + lawnMower.width + lawnMower.triggerDistance) {
            // 触发小推车
            lawnMower.state = 'moving'
            this.playSound('waveComplete')
            
            // 立即碾压当前僵尸
            this.zombieHitByLawnMower(zombie, lawnMower.damage)
            break
          }
        }
      } else if (lawnMower.state === 'moving') {
        // 向右移动
        lawnMower.x += lawnMower.speed * deltaTime
        
        // 碾压路上的所有僵尸
        for (let i = this.zombies.length - 1; i >= 0; i--) {
          const zombie = this.zombies[i]
          const zombieRow = Math.floor(zombie.y / gameConfig.cellHeight)
          
          if (zombieRow === lawnMower.row && 
              zombie.x >= lawnMower.x && 
              zombie.x <= lawnMower.x + lawnMower.width) {
            
            this.zombieHitByLawnMower(zombie, lawnMower.damage)
          }
        }
        
        // 如果到达最右边，标记为已使用
        if (lawnMower.x >= this.width - lawnMower.width) {
          lawnMower.state = 'used'
        }
      }
    }
  }
  
  // 小推车击中僵尸
  zombieHitByLawnMower(zombie, damage) {
    // 直接秒杀（或造成巨额伤害）
    if (zombie.shieldHp > 0) {
      zombie.shieldHp -= damage
      if (zombie.shieldHp < 0) {
        zombie.hp += zombie.shieldHp
        zombie.shieldHp = 0
      }
    }
    zombie.hp -= damage
    
    if (zombie.hp <= 0) {
      const index = this.zombies.indexOf(zombie)
      if (index > -1) {
        this.zombies.splice(index, 1)
        this.score += 10
        this.zombiesKilled++
        this.playSound('zombieDeath')
        this.addDeathAnimation(zombie.x, zombie.y)
      }
    }
  }
  
  // 初始化波次
  initWave(waveNum) {
    const waveConfig = gameConfig.waveConfigs.find(w => w.wave === waveNum)
    if (waveConfig) {
      this.currentWaveConfig = waveConfig
      this.buildZombieSpawnQueue(waveConfig.zombieGroups)
      this.isWaveActive = true
      this.showMessage(`第 ${waveNum} 波开始！${waveConfig.description}`, '#fbbf24')
    }
  }
  
  // 构建僵尸生成队列
  buildZombieSpawnQueue(zombieGroups) {
    this.zombieSpawnQueue = []
    
    for (const group of zombieGroups) {
      for (let i = 0; i < group.count; i++) {
        this.zombieSpawnQueue.push({
          type: group.type,
          delay: i * group.interval
        })
      }
    }
    
    this.zombieSpawnQueue.sort((a, b) => a.delay - b.delay)
  }
  
  // 初始化音效系统
  initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
  }
  
  // 播放音效
  playSound(soundName) {
    if (this.isMuted) return
    
    try {
      if (!this.audioContext) {
        this.initAudio()
      }
      
      const oscillator = this.audioContext.createOscillator()
      const gainNode = this.audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(this.audioContext.destination)
      
      switch(soundName) {
        case 'plant':
          oscillator.frequency.value = 600
          oscillator.type = 'sine'
          gainNode.gain.value = 0.1
          break
        case 'shoot':
          oscillator.frequency.value = 400
          oscillator.type = 'square'
          gainNode.gain.value = 0.05
          break
        case 'hit':
          oscillator.frequency.value = 300
          oscillator.type = 'triangle'
          gainNode.gain.value = 0.08
          break
        case 'zombieDeath':
          oscillator.frequency.value = 150
          oscillator.type = 'sawtooth'
          gainNode.gain.value = 0.12
          break
        case 'collectSun':
          oscillator.frequency.value = 800
          oscillator.type = 'sine'
          gainNode.gain.value = 0.1
          break
        case 'explode':
          oscillator.frequency.value = 100
          oscillator.type = 'sawtooth'
          gainNode.gain.value = 0.15
          break
        case 'waveComplete':
          oscillator.frequency.value = 1000
          oscillator.type = 'sine'
          gainNode.gain.value = 0.08
          setTimeout(() => {
            oscillator.frequency.value = 1200
          }, 100)
          break
        case 'digup':
          oscillator.frequency.value = 250
          oscillator.type = 'triangle'
          gainNode.gain.value = 0.1
          break
        default:
          oscillator.frequency.value = 440
          oscillator.type = 'sine'
          gainNode.gain.value = 0.1
      }
      
      oscillator.start()
      oscillator.stop(this.audioContext.currentTime + 0.2)
    } catch (e) {
      console.warn('音频播放失败:', e)
    }
  }
  
  // 切换静音
  toggleMute() {
    this.isMuted = !this.isMuted
    return this.isMuted
  }
  
  // 暂停游戏
  pause() {
    this.isPaused = true
    this.showMessage('游戏已暂停', '#fbbf24')
  }
  
  // 继续游戏
  resume() {
    this.isPaused = false
    this.showMessage('游戏继续', '#22c55e')
  }
  
  // 停止游戏
  stop() {
    this.isPlaying = false
  }
  
  // 游戏主循环
  gameLoop(currentTime = performance.now()) {
    if (!this.isPlaying || this.gameOver) return
    
    this.deltaTime = (currentTime - this.lastTime) / 1000
    this.lastTime = currentTime
    
    if (this.deltaTime > 0.1) this.deltaTime = 0.1
    
    this.update(this.deltaTime)
    this.render()
    
    requestAnimationFrame((time) => this.gameLoop(time))
  }
  
  // 更新逻辑
  update(deltaTime) {
    if (this.isPaused) return
    
    // 更新植物冷却
    this.updateCooldowns(deltaTime)
    
    // 更新阳光计时
    this.updateSunFall(deltaTime)
    
    // 更新波次系统
    this.updateWave(deltaTime)
    
    // 更新植物
    this.updatePlants(deltaTime)
    
    // 更新僵尸
    this.updateZombies(deltaTime)
    
    // 更新小推车
    this.updateLawnMowers(deltaTime)
    
    // 更新子弹（使用 projectileManager）
    this.projectileManager.updateProjectiles(deltaTime)
    
    // 更新闪电链系统
    this.lightningChain.update(deltaTime)
    
    // 更新阳光
    this.updateSuns(deltaTime)
    
    // 更新动画
    this.updateAnimations(deltaTime)
    
    // 更新消息
    this.updateMessages(deltaTime)
    
    // 碰撞检测
    this.checkCollisions()
    
    // 检查游戏结束
    this.checkGameOver()
    
    // 检查成就
    this.checkAchievements()
  }
  
  // 更新波次系统
  updateWave(deltaTime) {
    if (this.waveCooldown > 0) {
      this.waveCooldown -= deltaTime
      if (this.waveCooldown <= 0) {
        this.waveCooldown = 0
      }
    }
    
    if (this.isWaveActive && this.currentWaveConfig) {
      this.waveSpawnTimer += deltaTime
      
      while (this.zombieSpawnQueue.length > 0) {
        const nextZombie = this.zombieSpawnQueue[0]
        
        if (this.waveSpawnTimer >= nextZombie.delay) {
          this.zombieSpawnQueue.shift()
          this.spawnZombie(nextZombie.type)
        } else {
          break
        }
      }
      
      if (this.zombieSpawnQueue.length === 0 && this.zombies.length === 0) {
        this.completeWave()
      }
    }
  }
  
  // 完成波次
  completeWave() {
    this.isWaveActive = false
    this.wavesCleared++
    
    // 增加阳光奖励
    if (this.currentWaveConfig) {
      this.sunEnergy += this.currentWaveConfig.sunBonus
    }
    
    this.showMessage(`第 ${this.wave} 波完成！获得 ${this.currentWaveConfig?.sunBonus || 0} 阳光`, '#22c55e')
    this.playSound('waveComplete')
    
    // 检查波次成就
    this.checkWaveAchievement(this.wave)
    
    // 进入下一波
    if (this.wave < gameConfig.waveConfigs.length) {
      this.wave++
      this.waveCooldown = 5
      setTimeout(() => {
        this.initWave(this.wave)
      }, 5000)
    } else {
      // 所有波次完成，游戏胜利
      this.gameWin()
    }
  }
  
  // 游戏胜利
  gameWin() {
    this.gameOver = true
    this.isPlaying = false
    this.showMessage('恭喜！你成功抵御了所有僵尸的进攻！', '#ffd700')
    this.playSound('waveComplete')
    
    // 保存高分
    this.saveHighScore()
  }
  
  // 检查波次成就
  checkWaveAchievement(wave) {
    if (wave === 1 && !this.achievements.wave1.unlocked) {
      this.unlockAchievement('wave1')
    }
    if (wave === 5 && !this.achievements.wave5.unlocked) {
      this.unlockAchievement('wave5')
    }
  }
  
  // 解锁成就
  unlockAchievement(achievementId) {
    if (this.achievements[achievementId] && !this.achievements[achievementId].unlocked) {
      this.achievements[achievementId].unlocked = true
      this.showMessage(`🏆 成就解锁：${this.achievements[achievementId].name}`, '#ffd700')
      this.saveAchievements()
    }
  }
  
  // 检查成就
  checkAchievements() {
    // 初试锋芒
    if (this.zombiesKilled >= 1 && !this.achievements.firstKill.unlocked) {
      this.unlockAchievement('firstKill')
    }
    
    // 积分达人
    if (this.score >= 500 && !this.achievements.score500.unlocked) {
      this.unlockAchievement('score500')
    }
    
    // 积分大师
    if (this.score >= 1000 && !this.achievements.score1000.unlocked) {
      this.unlockAchievement('score1000')
    }
    
    // 绿化先锋
    if (this.plantsPlanted >= 10 && !this.achievements.plant10.unlocked) {
      this.unlockAchievement('plant10')
    }
    
    // 阳光收集者
    if (this.sunsCollected >= 50 && !this.achievements.sun50.unlocked) {
      this.unlockAchievement('sun50')
    }
  }
  
  // 保存成就
  saveAchievements() {
    const achievements = Object.entries(this.achievements).map(([key, value]) => ({
      id: key,
      unlocked: value.unlocked
    }))
    
    localStorage.setItem('pvz_achievements', JSON.stringify(achievements))
  }
  
  // 加载成就
  loadAchievements() {
    const saved = localStorage.getItem('pvz_achievements')
    if (saved) {
      const achievements = JSON.parse(saved)
      achievements.forEach(achievement => {
        if (this.achievements[achievement.id]) {
          this.achievements[achievement.id].unlocked = achievement.unlocked
        }
      })
    }
  }
  
  // 保存高分
  async saveHighScore() {
    try {
      await request.post('/api/pvz/update-stats', {
        score: this.score,
        kills: this.zombiesKilled,
        waves: this.wavesCleared
      })
    } catch (error) {
      console.error('保存统计数据失败:', error)
    }
  }
  
  // 获取高分
  async getHighScore() {
    try {
      const result = await request.get('/api/pvz/get-stats')
      if (result.data.success && result.data.data) {
        return result.data.data.highScore || 0
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
    return 0
  }
  
  // 获取统计数据
  async getStats() {
    try {
      const result = await request.get('/api/pvz/get-stats')
      if (result.data.success && result.data.data) {
        return {
          totalKills: result.data.data.totalKills || 0,
          totalWaves: result.data.data.totalWaves || 0,
          highScore: result.data.data.highScore || 0
        }
      }
    } catch (error) {
      console.error('获取统计数据失败:', error)
    }
    return {
      totalKills: 0,
      totalWaves: 0,
      highScore: 0
    }
  }
  
  // 保存游戏
  async saveGame() {
    const gameState = {
      sunEnergy: this.sunEnergy,
      score: this.score,
      wave: this.wave,
      plants: this.plants.map(plant => ({
        type: plant.type,
        col: plant.col,
        row: plant.row,
        hp: plant.hp
      })),
      zombies: this.zombies.map(zombie => ({
        type: zombie.type,
        x: zombie.x,
        y: zombie.y,
        hp: zombie.hp,
        shieldHp: zombie.shieldHp
      })),
      plantCooldowns: { ...this.plantCooldowns },
      lawnMowers: this.lawnMowers.map(lm => ({
        id: lm.id,
        state: lm.state,
        x: lm.x
      }))
    }
    
    try {
      const result = await request.post('/api/pvz/save', gameState)
      if (result.data.success) {
        this.showMessage('游戏已保存！', '#22c55e')
      } else {
        this.showMessage('保存失败：' + result.data.message, '#f87171')
      }
    } catch (error) {
      console.error('保存游戏失败:', error)
      this.showMessage('保存失败：' + error.message, '#f87171')
    }
  }
  
  // 加载游戏
  async loadGame() {
    try {
      const result = await request.get('/api/pvz/load')
      
      if (result.data.success && result.data.data) {
        const gameState = result.data.data
        
        this.sunEnergy = gameState.sunEnergy
        this.score = gameState.score
        this.wave = gameState.wave
        this.plantCooldowns = gameState.plantCooldowns || {}
        
        // 恢复小推车
        this.restoreLawnMowers(gameState)
        
        // 恢复植物和僵尸
        this.restoreGameEntities(gameState)
        
        // 启动游戏
        this.isPlaying = true
        this.gameOver = false
        this.lastTime = performance.now()
        
        this.showMessage('游戏已加载！', '#22c55e')
        
        // 启动游戏循环
        this.gameLoop()
        
        return true
      } else {
        this.showMessage(result.data.message || '没有找到存档！', '#f87171')
        return false
      }
    } catch (error) {
      console.error('加载游戏失败:', error)
      this.showMessage('加载失败：' + error.message, '#f87171')
      return false
    }
  }
  
  // 恢复游戏实体（辅助方法）
  restoreGameEntities(gameState) {
    // 恢复植物
    this.plants = []
    this.grid = new Grid(
      gameConfig.gridCols,
      gameConfig.gridRows,
      gameConfig.cellWidth,
      gameConfig.cellHeight
    )
    
    gameState.plants.forEach(plant => {
      this.restorePlant(plant)
    })
    
    // 恢复僵尸
    this.zombies = gameState.zombies.map(zombie => {
      const config = zombieConfig[zombie.type]
      return {
        type: zombie.type,
        x: zombie.x,
        y: zombie.y,
        width: config.width,
        height: config.height,
        hp: zombie.hp,
        maxHp: config.hp,
        shieldHp: zombie.shieldHp || 0,
        baseSpeed: config.speed,
        state: 'WALKING',
        attackTimer: 0,
        targetPlant: null,
        slowDuration: 0,
        slowFactor: 1
      }
    })
    
    // 重新初始化波次
    this.initWave(this.wave)
  }
  
  // 恢复植物
  restorePlant(plantData) {
    const config = plantConfig[plantData.type]
    const pixelPos = this.grid.gridToPixel(plantData.col, plantData.row)
    const plant = {
      type: plantData.type,
      col: plantData.col,
      row: plantData.row,
      x: pixelPos.x,
      y: pixelPos.y,
      width: config.width,
      height: config.height,
      hp: plantData.hp,
      maxHp: config.hp,
      attackTimer: 0,
      produceTimer: 0,
      explodeTimer: 0
    }
    
    this.plants.push(plant)
    this.grid.placePlant(plantData.col, plantData.row, plant)
  }
  
  // 恢复小推车
  restoreLawnMowers(gameState) {
    // 清空当前的小推车
    this.lawnMowers = []
    
    // 如果存档中有小推车数据
    if (gameState.lawnMowers && gameState.lawnMowers.length > 0) {
      gameState.lawnMowers.forEach(savedLm => {
        // 只恢复状态为 idle 或 moving 的小推车，不恢复 state 为 used 的小推车
        if (savedLm.state === 'idle' || savedLm.state === 'moving') {
          const lawnMower = {
            id: savedLm.id,
            x: savedLm.x,
            y: savedLm.id * gameConfig.cellHeight,
            width: gameConfig.cellWidth,
            height: gameConfig.cellHeight,
            state: savedLm.state,
            row: savedLm.id,
            col: gameConfig.lawnMowers.col,
            speed: gameConfig.lawnMowers.speed,
            damage: gameConfig.lawnMowers.damage,
            triggerDistance: gameConfig.lawnMowers.triggerDistance
          }
          this.lawnMowers.push(lawnMower)
        }
      })
    }
    
    // 如果没有小推车数据或所有小推车都是 used 状态，初始化所有小推车
    if (this.lawnMowers.length === 0) {
      this.initLawnMowers()
    }
  }
  
  // 渲染
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    
    // 绘制背景
    this.ctx.fillStyle = '#4a7c4e'
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
    
    // 调试：在 render 末尾添加日志检查闪电链数据
    const chains = this.lightningChain.getActiveChains()
    if (chains.length > 0) {
      console.log('[闪电链调试]', {
        chainsCount: chains.length,
        firstChain: chains[0] ? {
          jumpsCount: chains[0].jumps?.length,
          currentJump: chains[0].currentJump,
          isComplete: chains[0].isComplete,
          firstJumpSegments: chains[0].jumps?.[0]?.segments?.length
        } : null
      })
    }
  }
  
  // 更新植物
  updatePlants(deltaTime) {
    // 使用标签支持提前跳出当前迭代
    plantLoop: for (let i = this.plants.length - 1; i >= 0; i--) {
      const plant = this.plants[i]
      const config = plantConfig[plant.type]
      
      // 魅惑菇逻辑：检测僵尸接触
      if (plant.type === 'hypnoShroom' && !plant.hasTriggered) {
        const row = plant.row
        const col = plant.col
        
        // 检测同一格内是否有僵尸
        for (const zombie of this.zombies) {
          if (zombie.isCharmed) continue  // 跳过已被魅惑的僵尸
          
          const zombieRow = Math.floor((zombie.y + zombie.height / 2) / gameConfig.cellHeight)
          const zombieCol = Math.floor((zombie.x + zombie.width / 2) / gameConfig.cellHeight)
          
          // 如果僵尸在魅惑菇的格子内
          if (zombieRow === row && zombieCol === col) {
            // 计算僵尸与魅惑菇的距离（僵尸左边到魅惑菇右边的距离）
            const distance = plant.x + plant.width - zombie.x
            
            // 只有当僵尸足够接近时才触发（距离小于30像素）
            if (distance > 0 && distance < 30) {
              // 触发魅惑效果（charmZombie 会重置僵尸状态和目标）
              this.charmZombie(zombie, plant)
              
              // 移除魅惑菇
              this.removePlant(plant)
              
              // 跳过当前植物的剩余逻辑，继续下一个植物
              continue plantLoop
            }
          }
        }
      }
      
      // 玉米加农炮沉睡逻辑
      if (plant.type === 'cannon') {
        if (plant.isSleeping) {
          plant.sleepTimer -= deltaTime
          if (plant.sleepTimer <= 0) {
            plant.isSleeping = false
            plant.sleepTimer = 0
            this.showMessage('玉米加农炮苏醒了！', '#22c55e')
          }
        }
        continue
      }
      
      if (plant.type === 'sunflower') {
        plant.produceTimer += deltaTime
        
        if (plant.produceTimer >= config.produceInterval) {
          plant.produceTimer = 0
          this.produceSun(plant.x, plant.y)
        }
      } else if (plant.type === 'peashooter' || plant.type === 'snowPea') {
        plant.attackTimer += deltaTime
        
        if (plant.attackTimer >= config.attackInterval) {
          const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
          const hasZombie = this.hasZombieInRow(row, plant.x)
          
          if (hasZombie) {
            plant.attackTimer = 0
            this.shootProjectile(plant)
            this.playSound('shoot')
          }
        }
      } else if (plant.type === 'repeater') {
        // 机枪射手：一次性发射4颗豌豆
        plant.attackTimer += deltaTime
        
        if (plant.attackTimer >= config.attackInterval) {
          const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
          const hasZombie = this.hasZombieInRow(row, plant.x)
          
          if (hasZombie) {
            plant.attackTimer = 0
            this.projectileManager.shootRepeater(plant)
            this.playSound('shoot')
          }
        }
      } else if (plant.type === 'cherryBomb') {
        plant.explodeTimer = (plant.explodeTimer || 0) + deltaTime
        
        if (plant.explodeTimer >= config.explodeDelay) {
          this.explodeCherryBomb(plant)
          this.removePlant(plant)
        }
      } else if (plant.type === 'jalapeno') {
        plant.explodeTimer = (plant.explodeTimer || 0) + deltaTime
        
        if (plant.explodeTimer >= config.explodeDelay) {
          this.explodeJalapeno(plant)
          this.removePlant(plant)
        }
      } else if (plant.type === 'watermelon' || plant.type === 'iceWatermelon') {
        // 西瓜投手和寒冰西瓜投手
        plant.attackTimer += deltaTime
        
        if (plant.attackTimer >= config.attackInterval) {
          const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
          const hasZombie = this.hasZombieInRow(row, plant.x)
          
          if (hasZombie) {
            plant.attackTimer = 0
            this.shootWatermelon(plant)
            this.playSound('shoot')
          }
        }
      } else if (plant.type === 'kiwi') {
        // 猕猴桃投掷金箍棒
        plant.attackTimer += deltaTime
        
        if (plant.attackTimer >= config.attackInterval) {
          const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
          const hasZombie = this.hasZombieInRow(row, plant.x)
          
          if (hasZombie) {
            plant.attackTimer = 0
            this.throwGoldenStaff(plant)
            this.playSound('shoot')
          }
        }
      } else if (plant.type === 'potatoMine') {
        // 土豆地雷逻辑
        if (plant.isSleeping) {
          // 沉睡期间，递减sleepTimer
          plant.sleepTimer -= deltaTime
          if (plant.sleepTimer <= 0) {
            plant.isSleeping = false
            plant.sleepTimer = 0
            plant.isReady = true
            this.showMessage('🥔 土豆地雷苏醒了！', '#22c55e')
          }
        } else if (plant.isReady) {
          // 苏醒后，检测周围是否有僵尸
          const row = plant.row
          const nearestZombie = this.findNearestZombieInRow(row, plant.x)
          
          if (nearestZombie && nearestZombie.x - plant.x < config.triggerDistance) {
            // 僵尸足够接近，触发爆炸
            this.explodePotatoMine(plant)
            this.removePlant(plant)
          }
        }
      } else if (plant.type === 'squash') {
        // 倭瓜逻辑
        if (!plant.isJumping) {
          // 检测同一行是否有僵尸在触发距离内
          const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
          const nearestZombie = this.findNearestZombieInRow(row, plant.x)
          
          if (nearestZombie && nearestZombie.x - plant.x < config.triggerDistance) {
            // 僵尸足够接近，触发跳跃攻击
            plant.isJumping = true
            plant.jumpTimer = 0
            plant.originalX = plant.x  // 记录起始x坐标
            plant.originalY = plant.y  // 记录起始y坐标
            plant.targetX = nearestZombie.x  // 目标x坐标（僵尸位置）
            plant.targetZombie = nearestZombie
            this.showMessage('🎃 倭瓜跳起来了！', '#ff6b6b')
          }
        } else {
          // 跳跃动画进行中
          plant.jumpTimer += deltaTime
          
          // 计算跳跃进度（0到1）
          const jumpProgress = plant.jumpTimer / config.jumpDuration
          
          // x坐标：从原位置线性移动到僵尸位置
          plant.x = plant.originalX + (plant.targetX - plant.originalX) * jumpProgress
          
          // y坐标：使用正弦波模拟跳跃轨迹
          const maxJumpHeight = 80  // 最大跳跃高度
          plant.y = plant.originalY - Math.sin(jumpProgress * Math.PI) * maxJumpHeight
          
          // 跳跃完成后造成伤害并移除
          if (plant.jumpTimer >= config.jumpDuration) {
            this.squashAttack(plant)
            this.removePlant(plant)
          }
        }
      } else if (plant.type === 'thunderMelon') {
        // 雷霆怒瓜：发射闪电链
        plant.attackTimer += deltaTime
        
        if (plant.attackTimer >= config.attackInterval) {
          const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
          const hasZombie = this.hasZombieInRow(row, plant.x)
          
          if (hasZombie) {
            plant.attackTimer = 0
            
            // 找到最近的僵尸作为第一个目标
            const nearestZombie = this.findNearestZombieInRow(row, plant.x)
            
            if (nearestZombie) {
              // 发射闪电链
              this.lightningChain.castLightningChain(plant, nearestZombie)
            }
          }
        }
      } else if (plant.type === 'dragonKale') {
        // 龙葵草：发射螺旋刀片 + 冰龙
        plant.attackTimer += deltaTime
        
        if (plant.attackTimer >= config.attackInterval) {
          const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
          const hasZombie = this.hasZombieInRow(row, plant.x)
          
          if (hasZombie) {
            plant.attackTimer = 0
            // 发射螺旋刀片
            this.projectileManager.shootDragonBlade(plant)
            this.playSound('shoot')
          }
        }
      }
    }
  }
  
  // 发射西瓜（抛物线）
  shootWatermelon(plant) {
    this.projectileManager.shootWatermelon(plant)
  }
  
  // 投掷金箍棒
  throwGoldenStaff(plant) {
    this.projectileManager.throwGoldenStaff(plant)
  }
  
  
  // 更新僵尸
  updateZombies(deltaTime) {
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i]
      const config = zombieConfig[zombie.type]
      
      let actualSpeed = config.speed
      if (zombie.slowDuration > 0) {
        zombie.slowDuration -= deltaTime
        actualSpeed *= zombie.slowFactor || 0.5
        if (zombie.slowDuration <= 0) {
          zombie.slowDuration = 0
        }
      }
      
      if (zombie.state === 'WALKING') {
        const row = Math.floor(zombie.y / gameConfig.cellHeight)
        
        if (zombie.isCharmed) {
          // 被魅惑的僵尸：向右移动
          const moveStep = actualSpeed * deltaTime * 60
          const nextX = zombie.x + moveStep
          
          // 检测是否与其他正常僵尸碰撞
          const targetZombie = this.findNearestZombieBehind(zombie.x, nextX, row)
          
          if (targetZombie && targetZombie !== zombie) {
            // 停止移动，攻击僵尸
            zombie.x = targetZombie.x - zombie.width
            zombie.state = 'ATTACKING_ZOMBIE'
            zombie.targetZombie = targetZombie
            zombie.attackTimer = 0
          } else {
            // 没有僵尸，继续向右移动
            zombie.x = nextX
            
            // 到达最右边时移除
            if (zombie.x >= this.width) {
              this.zombies.splice(i, 1)
              continue
            }
          }
        } else {
          // 正常僵尸：向左移动
          const moveStep = actualSpeed * deltaTime * 60
          const nextX = zombie.x - moveStep
          
          // 找到同一行中在僵尸前进方向上的最近植物
          const targetPlant = this.findNearestPlantAhead(zombie.x, nextX, row)
          
          if (targetPlant) {
            // 计算僵尸应该停止的位置：僵尸左边界在植物右边界左侧1/4，露出植物左边3/4
            // 添加宽度字段fallback，防止NaN
            const plantW = targetPlant.width || gameConfig.cellWidth
            const zombieW = zombie.width || gameConfig.cellWidth
            // zombie.x是僵尸左边界,不需要再减zombieW
            const stopPosition = targetPlant.x + (plantW * 0.75)
            
            // 跨越检测：这一帧是否会到达或越过 stopPosition
            if (nextX <= stopPosition) {
              // 会到达或越过，精确停止
              zombie.x = stopPosition
              zombie.state = 'EATING'
              zombie.targetPlant = targetPlant
              zombie.attackTimer = 0
            } else {
              // 还未到达，继续移动
              zombie.x = nextX
            }
          } else {
            // 没有植物，继续移动
            zombie.x = nextX
          }
        }
      } else if (zombie.state === 'EATING') {
        zombie.attackTimer += deltaTime
        
        // 检查目标植物是否仍然存在（可能已被删除）
        if (zombie.targetPlant && !this.plants.includes(zombie.targetPlant)) {
          // 目标植物已不存在，重置状态
          zombie.state = 'WALKING'
          zombie.targetPlant = null
          zombie.attackTimer = 0
          continue
        }
        
        if (zombie.attackTimer >= config.attackInterval) {
          zombie.attackTimer = 0
          
          if (zombie.targetPlant) {
            // 检查是否是魅惑菇
            if (zombie.targetPlant.type === 'hypnoShroom' && !zombie.isCharmed) {
              // 触发魅惑效果
              this.charmZombie(zombie, zombie.targetPlant)
              // 移除魅惑菇
              this.removePlant(zombie.targetPlant)
            } else if (zombie.isCharmed && zombie.targetZombie) {
              // 魅惑僵尸攻击其他僵尸
              const attackDamage = zombie.originalDamage * 60
              
              if (zombie.targetZombie.shieldHp > 0) {
                zombie.targetZombie.shieldHp -= attackDamage
                if (zombie.targetZombie.shieldHp < 0) {
                  zombie.targetZombie.hp += zombie.targetZombie.shieldHp
                  zombie.targetZombie.shieldHp = 0
                }
              } else {
                zombie.targetZombie.hp -= attackDamage
              }
              
              this.playSound('hit')
              
              // 检查目标僵尸是否死亡
              if (zombie.targetZombie.hp <= 0) {
                const targetIndex = this.zombies.indexOf(zombie.targetZombie)
                if (targetIndex > -1) {
                  if (zombie.targetZombie !== zombie) {
                    this.zombies.splice(targetIndex, 1)
                    this.score += 10
                    this.zombiesKilled++
                    this.playSound('zombieDeath')
                    this.addDeathAnimation(zombie.targetZombie.x, zombie.targetZombie.y)
                  }
                }
              }
              
              // 攻击完成后检查目标是否死亡，如果死亡则继续行走
              if (!zombie.targetZombie || zombie.targetZombie.hp <= 0) {
                zombie.state = 'WALKING'
                zombie.targetZombie = null
              }
            } else {
              // 正常吃植物
              zombie.targetPlant.hp -= zombie.isCharmed ? (config.attackDamage * zombie.originalDamage) : config.attackDamage * 60
              
              if (zombie.targetPlant.hp <= 0) {
                this.removePlant(zombie.targetPlant)
                zombie.state = 'WALKING'
                zombie.targetPlant = null
              }
            }
            
            // 重置状态（魅惑菇触发后或正常吃植物后）
            if (zombie.state === 'EATING' && zombie.targetPlant && zombie.targetPlant.type !== 'hypnoShroom') {
              // 只有在非魅惑菇且未被移除的情况下才保持 targeting 状态
              if (zombie.targetPlant.hp <= 0) {
                zombie.state = 'WALKING'
                zombie.targetPlant = null
              }
            } else if (zombie.targetPlant && zombie.targetPlant.type === 'hypnoShroom') {
              // 魅惑菇触发后重置状态
              zombie.state = 'WALKING'
              zombie.targetPlant = null
            }
          }
        }
      } else if (zombie.state === 'ATTACKING_ZOMBIE') {
        // 魅惑僵尸攻击其他僵尸
        zombie.attackTimer += deltaTime
        
        if (zombie.attackTimer >= config.attackInterval) {
          zombie.attackTimer = 0
          
          if (zombie.targetZombie) {
            // 造成伤害
            const attackDamage = zombie.originalDamage * 60 // 将每帧伤害转换为总伤害
            
            if (zombie.targetZombie.shieldHp > 0) {
              zombie.targetZombie.shieldHp -= attackDamage
              if (zombie.targetZombie.shieldHp < 0) {
                zombie.targetZombie.hp += zombie.targetZombie.shieldHp
                zombie.targetZombie.shieldHp = 0
              }
            } else {
              zombie.targetZombie.hp -= attackDamage
            }
            
            this.playSound('hit')
            
            // 检查目标僵尸是否死亡
            if (zombie.targetZombie.hp <= 0) {
              const targetIndex = this.zombies.indexOf(zombie.targetZombie)
              if (targetIndex > -1) {
                // 确保不删除自己
                if (zombie.targetZombie !== zombie) {
                  this.zombies.splice(targetIndex, 1)
                  this.score += 10
                  this.zombiesKilled++
                  this.playSound('zombieDeath')
                  this.addDeathAnimation(zombie.targetZombie.x, zombie.targetZombie.y)
                }
              }
              
              // 目标死亡后，继续行走寻找下一个目标
              zombie.state = 'WALKING'
              zombie.targetZombie = null
            }
          }
        }
      }
      
      if (zombie.hp <= 0) {
        this.zombies.splice(i, 1)
        this.score += 10
        this.zombiesKilled++
        this.playSound('zombieDeath')
        this.addDeathAnimation(zombie.x, zombie.y)
      }
    }
  }
  
  // 更新阳光
  updateSuns(deltaTime) {
    // 自动收集阳光
    if (this.autoCollectSun && this.suns.length > 0) {
      for (let i = this.suns.length - 1; i >= 0; i--) {
        const sun = this.suns[i]
        this.collectSun(sun)
        this.suns.splice(i, 1)
      }
      return
    }
    
    for (let i = this.suns.length - 1; i >= 0; i--) {
      const sun = this.suns[i]
      sun.lifeTime -= deltaTime
      
      if (sun.lifeTime <= 0) {
        this.suns.splice(i, 1)
      }
    }
  }
  
  // 更新动画
  updateAnimations(deltaTime) {
    for (let i = this.animations.length - 1; i >= 0; i--) {
      this.animations[i].time += deltaTime
      
      if (this.animations[i].time >= this.animations[i].duration) {
        this.animations.splice(i, 1)
      }
    }
  }
  
  // 魅惑僵尸
  charmZombie(zombie, plant) {
    const hypnosisConfig = plantConfig.hypnoShroom.hypnosisEffect
    
    // 标记为已魅惑
    zombie.isCharmed = true
    
    // 提升血量和攻击力
    zombie.hp = zombie.originalHp * hypnosisConfig.hpMultiplier
    zombie.maxHp = zombie.hp  // 更新最大血量
    zombie.originalDamage = zombieConfig[zombie.type].attackDamage * hypnosisConfig.attackMultiplier
    
    // 清除护盾（魅惑后不需要护盾）
    zombie.shieldHp = 0
    
    // 设置状态为行走
    zombie.state = 'WALKING'
    zombie.targetPlant = null
    zombie.attackTimer = 0
    
    // 停止减速效果
    zombie.slowDuration = 0
    zombie.slowFactor = 1
    
    // 播放魅惑音效
    this.playSound('explode')
    
    // 添加魅惑动画
    this.animations.push({
      type: 'hypoCharm',
      x: zombie.x + zombie.width / 2,
      y: zombie.y + zombie.height / 2,
      time: 0,
      duration: 1.0
    })
    
    // 移除魅惑菇
    this.removePlant(plant)
  }
  
  // 添加死亡动画
  addDeathAnimation(x, y) {
    this.animations.push({
      type: 'death',
      x: x,
      y: y,
      time: 0,
      duration: 0.5
    })
  }
  
  // 碰撞检测
  checkCollisions() {
    
  }
  
  // 检查游戏结束
  checkGameOver() {
    for (const zombie of this.zombies) {
      if (zombie.x <= 0) {
        this.gameOver = true
        this.isPlaying = false
        this.showMessage('游戏结束！僵尸入侵了你的家园！', '#f87171')
        return
      }
    }
  }
  
  // 检查行内是否有僵尸
  hasZombieInRow(row, plantX) {
    for (const zombie of this.zombies) {
      const zombieRow = Math.floor((zombie.y + zombie.height / 2) / gameConfig.cellHeight)
      
      if (zombieRow === row && zombie.x > plantX) {
        return true
      }
    }
    return false
  }
  
  // 查找同一行中最近的僵尸（用于倭瓜）
  findNearestZombieInRow(row, plantX) {
    let nearestZombie = null
    let minDistance = Infinity
    
    for (const zombie of this.zombies) {
      const zombieRow = Math.floor((zombie.y + zombie.height / 2) / gameConfig.cellHeight)
      
      // 检查是否在同一行
      if (zombieRow === row) {
        // 计算僵尸与植物的距离
        const distance = zombie.x - plantX
        
        // 找到最近的且在植物前方的僵尸
        if (distance > 0 && distance < minDistance) {
          minDistance = distance
          nearestZombie = zombie
        }
      }
    }
    
    return nearestZombie
  }
  
  // 倭瓜攻击
  squashAttack(plant) {
    const config = plantConfig.squash
    const centerX = plant.x + plant.width / 2
    const centerY = plant.y + plant.height / 2
    
    // 对目标僵尸造成伤害
    if (plant.targetZombie) {
      const zombie = plant.targetZombie
      
      // 造成伤害
      if (zombie.shieldHp > 0) {
        zombie.shieldHp -= config.damage
        if (zombie.shieldHp < 0) {
          zombie.hp += zombie.shieldHp
          zombie.shieldHp = 0
        }
      } else {
        zombie.hp -= config.damage
      }
      
      // 检查僵尸是否死亡
      if (zombie.hp <= 0) {
        const index = this.zombies.indexOf(zombie)
        if (index > -1) {
          this.zombies.splice(index, 1)
          this.score += 10
          this.zombiesKilled++
          this.playSound('zombieDeath')
          this.addDeathAnimation(zombie.x, zombie.y)
        }
      } else {
        this.playSound('hit')
      }
    }
    
    // 添加压击动画
    this.animations.push({
      type: 'squashHit',
      x: centerX,
      y: centerY,
      time: 0,
      duration: 0.5
    })
    
    this.playSound('explode')
  }
  
  // 查找目标植物（旧方法，保留以便兼容）
  findTargetPlant(zombieX, row) {
    for (const plant of this.plants) {
      const plantRow = Math.floor(plant.y / gameConfig.cellHeight)
      
      // 检查是否在同一行
      if (plantRow === row) {
        // 如果僵尸在植物前方，且距离在可检测范围内
        if (zombieX > plant.x && zombieX < plant.x + plant.width + 10) {
          return plant
        }
      }
    }
    return null
  }
  
  // 查找同一行中在僵尸前进方向上的最近植物（新方法）
  findNearestPlantAhead(currentX, nextX, row) {
    let nearestPlant = null
    let minDistance = Infinity
    
    for (const plant of this.plants) {
      const plantRow = Math.floor(plant.y / gameConfig.cellHeight)
      
      // 检查是否在同一行
      if (plantRow === row) {
        // 植物的右边缘
        const plantRightEdge = plant.x + (plant.width || gameConfig.cellWidth)
        
        // 简化的碰撞检测：只要僵尸当前在植物范围内，或者下一帧会进入植物范围内
        const isCurrentlyInPlant = currentX >= plant.x - (plant.width || gameConfig.cellWidth) && currentX <= plantRightEdge
        const willEnterPlant = nextX >= plant.x - (plant.width || gameConfig.cellWidth) && nextX <= plantRightEdge
        
        if (isCurrentlyInPlant || willEnterPlant) {
          // 计算距离（植物x坐标相对于僵尸的距离，越小越近）
          const distance = currentX - plant.x
          
          // 找到x最大的植物（即最右边的植物，距离最近）
          // 使用distance的绝对值确保正确性
          if (distance < minDistance) {
            minDistance = distance
            nearestPlant = plant
          }
        }
      }
    }
    
    return nearestPlant
  }
  
  // 查找同一行中在魅惑僵尸后方的最近正常僵尸（用于魅惑僵尸攻击）
  findNearestZombieBehind(currentX, nextX, row) {
    let nearestZombie = null
    let minDistance = Infinity
    
    for (const otherZombie of this.zombies) {
      // 跳过自己和其他魅惑僵尸
      if (otherZombie.isCharmed || otherZombie === this.zombies.find(z => z.x === currentX)) {
        continue
      }
      
      const zombieRow = Math.floor((otherZombie.y + otherZombie.height / 2) / gameConfig.cellHeight)
      
      // 检查是否在同一行
      if (zombieRow === row) {
        // 检查正常僵尸是否在魅惑僵尸的右方（后方）
        if (otherZombie.x > currentX) {
          // 计算距离
          const distance = otherZombie.x - currentX
          
          // 检查是否会碰撞
          if (nextX >= otherZombie.x - (otherZombie.width || zombie.width || gameConfig.cellWidth)) {
            // 找到最近的正常僵尸
            if (distance < minDistance) {
              minDistance = distance
              nearestZombie = otherZombie
            }
          }
        }
      }
    }
    
    return nearestZombie
  }
  
  // 发射子弹
  shootProjectile(plant) {
    this.projectileManager.shootProjectile(plant)
  }
  
  // 生成阳光
  spawnSun() {
    const x = Math.random() * (this.width - 60) + 30
    const y = Math.random() * (this.height / 2)
    
    const sun = {
      x: x,
      y: y,
      value: gameConfig.sunValue,
      lifeTime: gameConfig.sunLifeTime
    }
    
    this.suns.push(sun)
  }
  
  // 向日葵生产阳光
  produceSun(plantX, plantY) {
    const sun = {
      x: plantX + 40,
      y: plantY + 20,
      value: gameConfig.sunValue,
      lifeTime: gameConfig.sunLifeTime
    }
    
    this.suns.push(sun)
  }
  
  // 收集阳光
  collectSun(sun) {
    this.sunEnergy += sun.value
    this.sunsCollected++
    this.playSound('collectSun')
    this.showMessage(`+${sun.value} 阳光`, '#fbbf24')
  }
  
  // 生成僵尸
  spawnZombie(zombieType = null) {
    const row = Math.floor(Math.random() * gameConfig.gridRows)
    
    let type = zombieType
    
    if (!type) {
      const waveBonus = Math.min(this.wave * 0.1, 0.5)
      const random = Math.random()
      
      type = 'normal'
      if (random < 0.1 + waveBonus && this.wave >= 2) {
        type = 'buckethead'
      } else if (random < 0.3 + waveBonus * 2 && this.wave >= 1) {
        type = 'conehead'
      }
    }
    
    const config = zombieConfig[type]
    
    const zombie = {
      type: type,
      x: this.width,
      y: row * gameConfig.cellHeight,
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
      // 魅惑相关字段
      isCharmed: false,        // 是否被魅惑
      originalHp: config.hp,   // 原始血量（用于恢复）
      originalDamage: config.attackDamage,  // 原始攻击力
      charmedSpeed: config.speed,  // 魅惑后的速度（向右移动）
      attackZombieTimer: 0     // 攻击其他僵尸的计时器
    }
    
    this.zombies.push(zombie)
  }
  
  // 种植植物
  plant(col, row, plantType) {
    const config = plantConfig[plantType]
    const pixelPos = this.grid.gridToPixel(col, row)
    
    // 获取植物的格子占用大小
    const gridWidth = config.gridWidth || 1
    const gridHeight = config.gridHeight || 1
    
    const plant = {
      type: plantType,
      col: col,
      row: row,
      gridWidth: gridWidth,    // 记录占用的格子宽度
      gridHeight: gridHeight,  // 记录占用的格子高度
      x: pixelPos.x,
      y: pixelPos.y,
      width: config.width * gridWidth,  // 宽度 = 单格宽度 * 格子数
      height: config.height,
      hp: config.hp,
      maxHp: config.hp,
      attackTimer: 0,
      produceTimer: 0,
      explodeTimer: 0,
      // 玉米加农炮沉睡相关字段
      isSleeping: false,
      sleepTimer: 0,
      // 土豆地雷相关字段
      isReady: false
    }
    
    // 如果是土豆地雷，设置沉睡状态
    if (plantType === 'potatoMine') {
      plant.isSleeping = true
      plant.sleepTimer = plantConfig.potatoMine.sleepDuration
      plant.isReady = false
    }
    
    this.plants.push(plant)
    // 使用多格子放置方法
    this.grid.placePlant(col, row, plant, gridWidth, gridHeight)
    
    this.sunEnergy -= config.cost
    this.plantCooldowns[plantType] = config.cooldown
    this.plantsPlanted++
    this.playSound('plant')
    
    // 添加种植动画
    this.animations.push({
      type: 'plant',
      x: plant.x + plant.width / 2,
      y: plant.y + plant.height / 2,
      time: 0,
      duration: 0.3
    })
  }
  
  // 樱桃炸弹爆炸
  explodeCherryBomb(cherryBomb) {
    const config = plantConfig.cherryBomb
    const centerX = cherryBomb.x + cherryBomb.width / 2
    const centerY = cherryBomb.y + cherryBomb.height / 2
    
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i]
      const zombieCenterX = zombie.x + zombie.width / 2
      const zombieCenterY = zombie.y + zombie.height / 2
      
      const distance = Math.sqrt(
        (zombieCenterX - centerX) ** 2 + (zombieCenterY - centerY) ** 2
      )
      
      if (distance <= config.explodeRadius) {
        if (zombie.shieldHp > 0) {
          zombie.shieldHp -= config.damage
          if (zombie.shieldHp < 0) {
            zombie.hp += zombie.shieldHp
            zombie.shieldHp = 0
          }
        } else {
          zombie.hp -= config.damage
        }
      }
    }
    
    this.playSound('explode')
    
    this.animations.push({
      type: 'explode',
      x: centerX,
      y: centerY,
      time: 0,
      duration: 0.5
    })
  }
  
  // 火爆辣椒爆炸（整行攻击）
  explodeJalapeno(jalapeno) {
    const config = plantConfig.jalapeno
    const row = jalapeno.row
    const centerX = jalapeno.x + jalapeno.width / 2
    const centerY = jalapeno.y + jalapeno.height / 2
    
    // 对整行的所有僵尸造成伤害
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i]
      const zombieRow = Math.floor((zombie.y + zombie.height / 2) / gameConfig.cellHeight)
      
      // 检查是否在同一行
      if (zombieRow === row) {
        // 对该行僵尸造成巨额伤害
        if (zombie.shieldHp > 0) {
          zombie.shieldHp -= config.damage
          if (zombie.shieldHp < 0) {
            zombie.hp += zombie.shieldHp
            zombie.shieldHp = 0
          }
        } else {
          zombie.hp -= config.damage
        }
        
        // 检查僵尸是否死亡
        if (zombie.hp <= 0) {
          this.zombies.splice(i, 1)
          this.score += 10
          this.zombiesKilled++
          this.playSound('zombieDeath')
          this.addDeathAnimation(zombie.x, zombie.y)
        } else {
          this.playSound('hit')
        }
      }
    }
    
    this.playSound('explode')
    
    // 添加整行火焰爆炸动画（延长到2秒）
    this.animations.push({
      type: 'jalapenoExplode',
      x: centerX,
      y: centerY,
      row: row,
      time: 0,
      duration: 1.3
    })
  }
  
  // 土豆地雷爆炸
  explodePotatoMine(potatoMine) {
    const config = plantConfig.potatoMine
    const centerX = potatoMine.x + potatoMine.width / 2
    const centerY = potatoMine.y + potatoMine.height / 2
    const explodeRadius = 100  // 爆炸半径（像素）
    
    // 对爆炸范围内的所有僵尸造成伤害
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i]
      const zombieCenterX = zombie.x + zombie.width / 2
      const zombieCenterY = zombie.y + zombie.height / 2
      
      const distance = Math.sqrt(
        (zombieCenterX - centerX) ** 2 + (zombieCenterY - centerY) ** 2
      )
      
      if (distance <= explodeRadius) {
        // 造成伤害
        if (zombie.shieldHp > 0) {
          zombie.shieldHp -= config.damage
          if (zombie.shieldHp < 0) {
            zombie.hp += zombie.shieldHp
            zombie.shieldHp = 0
          }
        } else {
          zombie.hp -= config.damage
        }
        
        // 检查僵尸是否死亡
        if (zombie.hp <= 0) {
          this.zombies.splice(i, 1)
          this.score += 10
          this.zombiesKilled++
          this.playSound('zombieDeath')
          this.addDeathAnimation(zombie.x, zombie.y)
        } else {
          this.playSound('hit')
        }
      }
    }
    
    this.playSound('explode')
    
    // 添加爆炸动画
    this.animations.push({
      type: 'potatoMineExplode',
      x: centerX,
      y: centerY,
      time: 0,
      duration: 0.5
    })
  }
  
  // 移除植物
  removePlant(plant) {
    const index = this.plants.indexOf(plant)
    if (index > -1) {
      this.plants.splice(index, 1)
      // 使用多格子移除方法
      const gridWidth = plant.gridWidth || 1
      const gridHeight = plant.gridHeight || 1
      this.grid.removePlant(plant.col, plant.row, gridWidth, gridHeight)
    }
  }
  
  // 更新植物冷却
  updateCooldowns(deltaTime) {
    for (const plantType in this.plantCooldowns) {
      this.plantCooldowns[plantType] -= deltaTime
      
      if (this.plantCooldowns[plantType] <= 0) {
        delete this.plantCooldowns[plantType]
      }
    }
  }
  
  // 更新阳光掉落计时
  updateSunFall(deltaTime) {
    this.sunFallTimer += deltaTime
    
    if (this.sunFallTimer >= gameConfig.sunFallInterval) {
      this.sunFallTimer = 0
      this.spawnSun()
    }
  }
  
  // 更新消息
  updateMessages(deltaTime) {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      this.messages[i].time -= deltaTime
      
      // 移除时间到期的消息
      if (this.messages[i].time <= 0) {
        this.messages.splice(i, 1)
      }
    }
  }
  
  // 显示消息
  showMessage(text, color = '#ffffff') {
    this.messages.push({
      text,
      color,
      time: 2.0,
      maxTime: 2.0
    })
  }
  
  // 设置自定义植物列表
  setCustomPlants(plants) {
    // 将植物列表转换为植物ID集合，便于快速查找
    this.allowedPlants = plants.map(plant => plant.id)
  }
  
  // 选择植物
  selectPlant(plantId) {
    const remainingCooldown = this.plantCooldowns[plantId]
    if (remainingCooldown > 0) {
      return false
    }
    
    // 如果设置了允许的植物列表，检查植物是否在其中
    if (this.allowedPlants && !this.allowedPlants.includes(plantId)) {
      return false
    }
    
    this.selectedPlant = plantId
    return true
  }
  
  // 切换自动收集阳光
  toggleAutoCollectSun() {
    this.autoCollectSun = !this.autoCollectSun
    this.showMessage(
      this.autoCollectSun ? '自动收集阳光已开启' : '自动收集阳光已关闭',
      this.autoCollectSun ? '#22c55e' : '#fbbf24'
    )
    return this.autoCollectSun
  }
  
  // 铲除植物
  digupPlant(plant) {
    const config = plantConfig[plant.type]
    
    // 检查是否是樱桃炸弹正在倒计时
    if (plant.type === 'cherryBomb' && plant.explodeTimer > 0) {
      this.showMessage('樱桃炸弹正在爆炸倒计时中，无法铲除', '#f87171')
      return
    }
    
    // 计算返还阳光（植物成本的50%）
    const refund = Math.floor(config.cost * 0.5)
    
    // 【修复】在移除植物之前，将所有正在吃该植物的僵尸状态重置为 WALKING
    for (const zombie of this.zombies) {
      if (zombie.targetPlant === plant) {
        zombie.state = 'WALKING'
        zombie.targetPlant = null
        zombie.attackTimer = 0
      }
    }
    
    // 增加阳光
    this.sunEnergy += refund
    
    // 从植物列表和网格中移除植物
    this.removePlant(plant)
    
    // 播放铲除音效
    this.playSound('digup')
    
    // 显示铲除成功消息
    this.showMessage(`铲除成功，返还 ${refund} 阳光`, '#22c55e')
  }
  
  // 玉米加农炮发射炮弹
  fireCannonProjectile(cannon, targetX, targetY) {
    this.projectileManager.fireCannonProjectile(cannon, targetX, targetY)
  }
  
  // 玉米加农炮炮弹爆炸
  explodeCannonProjectile(projectile) {
    const centerX = projectile.targetX
    const centerY = projectile.targetY
    const explodeRadius = projectile.explodeRadius
    
    // 对爆炸范围内的所有僵尸造成伤害
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      const zombie = this.zombies[i]
      const zombieCenterX = zombie.x + zombie.width / 2
      const zombieCenterY = zombie.y + zombie.height / 2
      
      const distance = Math.sqrt(
        (zombieCenterX - centerX) ** 2 + (zombieCenterY - centerY) ** 2
      )
      
      if (distance <= explodeRadius) {
        // 造成伤害
        if (zombie.shieldHp > 0) {
          zombie.shieldHp -= projectile.damage
          if (zombie.shieldHp < 0) {
            zombie.hp += zombie.shieldHp
            zombie.shieldHp = 0
          }
        } else {
          zombie.hp -= projectile.damage
        }
        
        this.playSound('hit')
        
        // 添加爆炸动画
        this.animations.push({
          type: 'cannonExplode',
          x: zombieCenterX,
          y: zombieCenterY,
          time: 0,
          duration: 0.5
        })
        
        // 检查僵尸是否死亡
        if (zombie.hp <= 0) {
          this.zombies.splice(i, 1)
          this.score += 10
          this.zombiesKilled++
          
          if (i < this.zombies.length) {
            // 由于已经删除了元素，索引可能已经改变，需要重新检查
            continue
          }
          
          this.playSound('zombieDeath')
          this.addDeathAnimation(zombie.x, zombie.y)
        }
      }
    }
    
    // 播放爆炸音效
    this.playSound('explode')
    
    // 添加中心爆炸动画
    this.animations.push({
      type: 'cannonExplode',
      x: centerX,
      y: centerY,
      time: 0,
      duration: 0.9,
      isCenter: true
    })
  }
}
