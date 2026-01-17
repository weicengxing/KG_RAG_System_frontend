import { gameConfig, plantConfig, zombieConfig } from './config.js'
import { Renderer } from './renderer.js'
import { InputHandler } from './input.js'
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
  
  // 放置植物
  placePlant(col, row, plant) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.cells[row][col] = plant
    }
  }
  
  // 移除植物
  removePlant(col, row) {
    if (col >= 0 && col < this.cols && row >= 0 && row < this.rows) {
      this.cells[row][col] = null
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
    
    // 网格系统
    this.grid = new Grid(
      gameConfig.gridCols,
      gameConfig.gridRows,
      gameConfig.cellWidth,
      gameConfig.cellHeight
    )
    
    // 游戏数据
    this.sunEnergy = 1000
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
  }
  
  // 启动游戏
  start() {
    this.isPlaying = true
    this.gameOver = false
    this.sunEnergy = 1000
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
            this.showMessage('🚗 小推车启动！', '#fbbf24')
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
    
    // 更新子弹
    this.updateProjectiles(deltaTime)
    
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
  saveHighScore() {
    const highScore = localStorage.getItem('pvz_highScore') || 0
    if (this.score > highScore) {
      localStorage.setItem('pvz_highScore', this.score)
    }
    
    // 保存击杀数
    const totalKills = (localStorage.getItem('pvz_totalKills') || 0) - 0
    localStorage.setItem('pvz_totalKills', totalKills + this.zombiesKilled)
    
    // 保存完成波次数
    const totalWaves = (localStorage.getItem('pvz_totalWaves') || 0) - 0
    localStorage.setItem('pvz_totalWaves', totalWaves + this.wavesCleared)
  }
  
  // 获取高分
  getHighScore() {
    return parseInt(localStorage.getItem('pvz_highScore')) || 0
  }
  
  // 获取统计数据
  getStats() {
    return {
      totalKills: parseInt(localStorage.getItem('pvz_totalKills')) || 0,
      totalWaves: parseInt(localStorage.getItem('pvz_totalWaves')) || 0,
      highScore: this.getHighScore()
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
        
        // 恢复植物和僵尸
        this.restoreGameEntities(gameState)
        
        // 恢复小推车状态
        if (gameState.lawnMowers) {
          gameState.lawnMowers.forEach(savedLm => {
            const lawnMower = this.lawnMowers.find(lm => lm.id === savedLm.id)
            if (lawnMower) {
              lawnMower.state = savedLm.state
              lawnMower.x = savedLm.x
            }
          })
        }
        
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
  
  // 渲染
  render() {
    this.ctx.clearRect(0, 0, this.width, this.height)
    
    // 绘制背景
    this.ctx.fillStyle = '#4a7c4e'
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    this.renderer.drawGrid(this.grid)
    this.renderer.drawPlants(this.plants)
    this.renderer.drawZombies(this.zombies)
    this.renderer.drawProjectiles(this.projectiles)
    this.renderer.drawSuns(this.suns)
    this.renderer.drawLawnMowers(this.lawnMowers)
    this.renderer.drawAnimations(this.animations)
    this.renderer.drawMessages(this.messages)
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
  
  // 更新植物
  updatePlants(deltaTime) {
    for (let i = this.plants.length - 1; i >= 0; i--) {
      const plant = this.plants[i]
      const config = plantConfig[plant.type]
      
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
      } else if (plant.type === 'cherryBomb') {
        plant.explodeTimer = (plant.explodeTimer || 0) + deltaTime
        
        if (plant.explodeTimer >= config.explodeDelay) {
          this.explodeCherryBomb(plant)
          this.removePlant(plant)
        }
      }
    }
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
        zombie.x -= actualSpeed * deltaTime * 60
        
        const row = Math.floor(zombie.y / gameConfig.cellHeight)
        const targetPlant = this.findTargetPlant(zombie.x, row)
        
        if (targetPlant) {
          zombie.state = 'EATING'
          zombie.targetPlant = targetPlant
          zombie.attackTimer = 0
        }
      } else if (zombie.state === 'EATING') {
        zombie.attackTimer += deltaTime
        
        if (zombie.attackTimer >= config.attackInterval) {
          zombie.attackTimer = 0
          
          if (zombie.targetPlant) {
            zombie.targetPlant.hp -= config.attackDamage * 60
            
            if (zombie.targetPlant.hp <= 0) {
              this.removePlant(zombie.targetPlant)
              zombie.state = 'WALKING'
              zombie.targetPlant = null
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
  
  // 更新子弹
  updateProjectiles(deltaTime) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      
      projectile.x += projectile.speed * deltaTime * 60
      
      if (projectile.x > this.width) {
        this.projectiles.splice(i, 1)
        continue
      }
      
      let hit = false
      for (const zombie of this.zombies) {
        const zombieRow = Math.floor((zombie.y + zombie.height / 2) / gameConfig.cellHeight)
        
        if (zombieRow === projectile.row && 
            projectile.x >= zombie.x && 
            projectile.x <= zombie.x + zombie.width) {
          
          if (projectile.type === 'icePea' || projectile.type === 'pea') {
            if (zombie.shieldHp > 0) {
              zombie.shieldHp -= projectile.damage
              if (zombie.shieldHp < 0) {
                zombie.hp += zombie.shieldHp
                zombie.shieldHp = 0
              }
            } else {
              zombie.hp -= projectile.damage
            }
            
            if (projectile.type === 'icePea') {
              zombie.slowDuration = projectile.slowDuration || 3
              zombie.slowFactor = projectile.slowFactor || 0.5
            }
          }
          
          this.playSound('hit')
          hit = true
          break
        }
      }
      
      if (hit) {
        this.projectiles.splice(i, 1)
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
  
  // 查找目标植物
  findTargetPlant(zombieX, row) {
    for (const plant of this.plants) {
      const plantRow = Math.floor(plant.y / gameConfig.cellHeight)
      
      if (plantRow === row && Math.abs(zombieX - plant.x) < 5) {
        return plant
      }
    }
    return null
  }
  
  // 发射子弹
  shootProjectile(plant) {
    const config = plantConfig[plant.type]
    
    const projectile = {
      x: plant.x + plant.width,
      y: plant.y + plant.height / 2,
      type: plant.type === 'snowPea' ? 'icePea' : 'pea',
      damage: config.damage,
      speed: config.projectileSpeed,
      row: Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight),
      slowDuration: config.slowDuration,
      slowFactor: config.slowFactor
    }
    
    this.projectiles.push(projectile)
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
      slowFactor: 1
    }
    
    this.zombies.push(zombie)
  }
  
  // 种植植物
  plant(col, row, plantType) {
    const config = plantConfig[plantType]
    const pixelPos = this.grid.gridToPixel(col, row)
    
    const plant = {
      type: plantType,
      col: col,
      row: row,
      x: pixelPos.x,
      y: pixelPos.y,
      width: config.width,
      height: config.height,
      hp: config.hp,
      maxHp: config.hp,
      attackTimer: 0,
      produceTimer: 0,
      explodeTimer: 0
    }
    
    this.plants.push(plant)
    this.grid.placePlant(col, row, plant)
    
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
    this.showMessage('💥 樱桃炸弹爆炸！', '#ff6b6b')
    
    this.animations.push({
      type: 'explode',
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
      this.grid.removePlant(plant.col, plant.row)
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
  
  // 选择植物
  selectPlant(plantId) {
    const remainingCooldown = this.plantCooldowns[plantId]
    if (remainingCooldown > 0) {
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
}
