<template>
  <div class="plants-vs-zombies-view">
    <!-- 游戏标题 -->
    <div class="game-header">
      <h1>🌻 植物大战僵尸 🧟</h1>
      <div class="header-buttons">
        <button @click="togglePause" v-if="isPlaying" class="control-btn">
          {{ isPaused ? '继续' : '暂停' }}
        </button>
        <button @click="saveGame" v-if="isPlaying && !isPaused" class="control-btn">保存</button>
        <button @click="loadGame" class="control-btn">加载</button>
        <button @click="toggleAutoCollectSun" v-if="isPlaying" :class="['control-btn', { 'auto-collect-active': autoCollectSun }]">
          {{ autoCollectSun ? '☀️ 自动收集开启' : '☀️ 自动收集关闭' }}
        </button>
        <button @click="toggleMute" class="control-btn">{{ isMuted ? '🔇' : '🔊' }}</button>
        <button @click="showAchievements = true" class="control-btn">🏆 成就</button>
        <button @click="showStats = true" class="control-btn">📊 统计</button>
        <button @click="startGame" class="start-btn">{{ isPlaying ? '重新开始' : '开始游戏' }}</button>
      </div>
    </div>

    <!-- 游戏主区域 -->
    <div class="game-container">
      <!-- 植物选择栏 -->
      <div class="plants-sidebar">
        <h3>植物选择</h3>
        <div class="plant-slots">
          <div 
            class="plant-slot" 
            v-for="plant in selectedPlants" 
            :key="plant.id"
            :class="{
              'selected': selectedPlantId === plant.id,
              'disabled': sunEnergy < plant.cost || plantCooldowns[plant.id] > 0
            }"
            @click="selectPlant(plant.id)"
            draggable="true"
            @dragstart="(e) => handleDragStart(e, plant.id)"
          >
            <span class="plant-icon">{{ plant.icon }}</span>
            <span class="plant-name">{{ plant.name }}</span>
            <span class="plant-cost">{{ plant.cost }}</span>
            <!-- 冷却遮罩 -->
            <div v-if="plantCooldowns[plant.id]" class="cooldown-overlay">
              <span class="cooldown-text">{{ plantCooldowns[plant.id].toFixed(1) }}s</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 游戏画布 -->
      <div class="game-canvas">
        <canvas ref="gameCanvas"></canvas>
      </div>

      <!-- 信息面板 -->
      <div class="info-panel">
      <div class="info-item">
        <span class="info-label">阳光</span>
        <span class="info-value sun">{{ sunEnergy }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">分数</span>
        <span class="info-value">{{ score }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">波次</span>
        <span class="info-value">{{ wave }}/{{ maxWaves }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">击杀</span>
        <span class="info-value">{{ zombiesKilled }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">记录</span>
        <span class="info-value">{{ highScore }}</span>
      </div>
      <button @click="toggleShovelMode" v-if="isPlaying" :class="['shovel-btn', { 'shovel-active': isShovelMode }]">
        🧹 {{ isShovelMode ? '铲除模式' : '铲子' }}
      </button>
      </div>
    </div>

    <!-- 游戏说明 -->
    <div class="game-instructions">
      <h3>游戏说明</h3>
      <p>1. 点击植物选择栏中的植物，然后点击游戏画布上的网格位置来种植植物。</p>
      <p>2. 或者直接从植物选择栏拖拽植物到网格位置进行种植。</p>
      <p>3. 向日葵可以生产阳光，豌豆射手可以攻击僵尸。</p>
      <p>4. 点击屏幕上的阳光来收集，用阳光购买更多植物。</p>
      <p>5. 保护你的家园不让僵尸入侵，完成所有波次即可获胜！</p>
      <p>6. 新功能：波次系统、成就系统、游戏存档、音效控制、拖拽种植</p>
    </div>
    
    <!-- 成就弹窗 -->
    <div v-if="showAchievements" class="modal-overlay" @click="showAchievements = false">
      <div class="modal-content" @click.stop>
        <h2>🏆 成就系统</h2>
        <div class="achievements-list">
          <div 
            v-for="(achievement, key) in achievements" 
            :key="key" 
            class="achievement-item"
            :class="{ 'unlocked': achievement.unlocked }"
          >
            <span class="achievement-icon">{{ achievement.unlocked ? '🏆' : '🔒' }}</span>
            <div class="achievement-info">
              <div class="achievement-name">{{ achievement.name }}</div>
              <div class="achievement-desc">{{ achievement.description }}</div>
            </div>
          </div>
        </div>
        <button @click="showAchievements = false" class="modal-close">关闭</button>
      </div>
    </div>
    
    <!-- 统计弹窗 -->
    <div v-if="showStats" class="modal-overlay" @click="showStats = false">
      <div class="modal-content" @click.stop>
        <h2>📊 游戏统计</h2>
        <div class="stats-list">
          <div class="stat-item">
            <span class="stat-label">最高分数</span>
            <span class="stat-value">{{ stats.highScore }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总击杀数</span>
            <span class="stat-value">{{ stats.totalKills }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">完成波次</span>
            <span class="stat-value">{{ stats.totalWaves }}</span>
          </div>
        </div>
        <button @click="showStats = false" class="modal-close">关闭</button>
      </div>
    </div>

    <!-- Toast 提示消息 -->
    <div class="toast-container">
      <transition-group name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
        >
          <span class="toast-icon">{{ toast.icon }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { GameEngine } from '../pvz/engine.js'
import { plantConfig, gameConfig } from '../pvz/config.js'

const gameCanvas = ref(null)
const sunEnergy = ref(1000)
const score = ref(0)
const wave = ref(1)
const maxWaves = ref(gameConfig.waveConfigs.length)
const selectedPlantId = ref(null)
const plantCooldowns = ref({})
const isPlaying = ref(false)
const isPaused = ref(false)
const isMuted = ref(false)
const zombiesKilled = ref(0)
const highScore = ref(0)
const autoCollectSun = ref(false)
const isShovelMode = ref(false)

// 弹窗状态
const showAchievements = ref(false)
const showStats = ref(false)

// Toast 提示系统
const toasts = ref([])
let toastId = 0

// 显示 Toast 提示
const showToast = (message, type = 'info') => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  }

  const id = toastId++
  toasts.value.push({
    id,
    message,
    type,
    icon: icons[type]
  })

  // 3秒后自动移除
  setTimeout(() => {
    removeToast(id)
  }, 3000)
}

// 移除 Toast 提示
const removeToast = (id) => {
  const index = toasts.value.findIndex(toast => toast.id === id)
  if (index > -1) {
    toasts.value.splice(index, 1)
  }
}

// 成就和统计
const achievements = ref({})
const stats = ref({
  highScore: 0,
  totalKills: 0,
  totalWaves: 0
})

const gameEngine = ref(null)
const updateInterval = ref(null)

// 可选择的植物
const selectedPlants = ref([
  { id: 'sunflower', ...plantConfig.sunflower },
  { id: 'peashooter', ...plantConfig.peashooter },
  { id: 'snowPea', ...plantConfig.snowPea },
  { id: 'nutWall', ...plantConfig.nutWall },
  { id: 'cherryBomb', ...plantConfig.cherryBomb },
  { id: 'watermelon', ...plantConfig.watermelon },
  { id: 'iceWatermelon', ...plantConfig.iceWatermelon },
  { id: 'kiwi', ...plantConfig.kiwi }
])

// 暂停/继续
const togglePause = () => {
  if (!gameEngine.value) return
  
  if (isPaused.value) {
    gameEngine.value.resume()
    isPaused.value = false
  } else {
    gameEngine.value.pause()
    isPaused.value = true
  }
}

// 保存游戏
const saveGame = async () => {
  if (gameEngine.value) {
    await gameEngine.value.saveGame()
  }
}

// 加载游戏
const loadGame = async () => {
  if (!gameCanvas.value) return
  
  // 如果游戏已运行，先停止
  if (gameEngine.value) {
    gameEngine.value.stop()
  }
  
  // 初始化画布
  const canvasWidth = gameConfig.gridCols * gameConfig.cellWidth
  const canvasHeight = gameConfig.gridRows * gameConfig.cellHeight
  gameCanvas.value.width = canvasWidth
  gameCanvas.value.height = canvasHeight
  
  // 创建游戏引擎
  gameEngine.value = new GameEngine(
    gameCanvas.value,
    canvasWidth,
    canvasHeight
  )
  
  // 加载游戏
  if (await gameEngine.value.loadGame()) {
    isPlaying.value = true
    isPaused.value = false
    selectedPlantId.value = null
    
    // 启动更新循环
    if (updateInterval.value) {
      clearInterval(updateInterval.value)
    }
    
    updateInterval.value = setInterval(() => {
      updateUI()
    }, 100)
  }
}

// 切换静音
const toggleMute = () => {
  if (gameEngine.value) {
    isMuted.value = gameEngine.value.toggleMute()
  }
}

// 切换自动收集阳光
const toggleAutoCollectSun = () => {
  if (gameEngine.value) {
    autoCollectSun.value = gameEngine.value.toggleAutoCollectSun()
  }
}

// 切换铲除模式
const toggleShovelMode = () => {
  if (!gameEngine.value) return
  
  isShovelMode.value = !isShovelMode.value
  
  // 如果进入铲除模式，清除植物选择
  if (isShovelMode.value) {
    selectedPlantId.value = null
    gameEngine.value.selectedPlant = null
    gameEngine.value.isShovelMode = true
    gameEngine.value.showMessage('铲除模式已开启，点击植物进行铲除', '#fbbf24')
  } else {
    gameEngine.value.isShovelMode = false
    gameEngine.value.showMessage('铲除模式已关闭', '#22c55e')
  }
}

// 选择植物
const selectPlant = (plantId) => {
  if (!gameEngine.value) return
  
  const config = plantConfig[plantId]
  
  // 检查阳光
  if (sunEnergy.value < config.cost) {
    showToast(`阳光不足！需要 ${config.cost} 阳光，当前只有 ${sunEnergy.value} 阳光`, 'warning')
    return
  }
  
  // 检查冷却
  if (plantCooldowns.value[plantId] > 0) {
    showToast(`${config.name} 还在冷却中，还需 ${plantCooldowns.value[plantId].toFixed(1)} 秒`, 'warning')
    return
  }
  
  // 调用引擎的选择方法
  if (gameEngine.value.selectPlant(plantId)) {
    selectedPlantId.value = plantId
  }
}

// 更新UI
const updateUI = () => {
  if (gameEngine.value && !gameEngine.value.gameOver) {
    sunEnergy.value = gameEngine.value.sunEnergy
    score.value = gameEngine.value.score
    wave.value = gameEngine.value.wave
    zombiesKilled.value = gameEngine.value.zombiesKilled
    selectedPlantId.value = gameEngine.value.selectedPlant
    plantCooldowns.value = { ...gameEngine.value.plantCooldowns }
    isPaused.value = gameEngine.value.isPaused
    autoCollectSun.value = gameEngine.value.autoCollectSun
    isShovelMode.value = gameEngine.value.isShovelMode
    
    // 更新成就
    achievements.value = { ...gameEngine.value.achievements }
    
    // 如果没有选中植物，重置选择状态
    if (!gameEngine.value.selectedPlant) {
      selectedPlantId.value = null
    }
  }
}

// 刷新统计数据
const refreshStats = async () => {
  if (gameEngine.value) {
    stats.value = await gameEngine.value.getStats()
    highScore.value = await gameEngine.value.getHighScore()
  }
}

// 开始游戏
const startGame = () => {
  if (!gameCanvas.value) return
  
  // 如果游戏已开始，先停止
  if (gameEngine.value) {
    gameEngine.value.stop()
  }
  
  // 初始化画布尺寸
  const canvasWidth = gameConfig.gridCols * gameConfig.cellWidth
  const canvasHeight = gameConfig.gridRows * gameConfig.cellHeight
  gameCanvas.value.width = canvasWidth
  gameCanvas.value.height = canvasHeight
  
  // 创建游戏引擎
  gameEngine.value = new GameEngine(
    gameCanvas.value,
    canvasWidth,
    canvasHeight
  )
  
  // 启动游戏
  gameEngine.value.start()
  isPlaying.value = true
  isPaused.value = false
  selectedPlantId.value = null
  isMuted.value = false
  
  // 定期更新UI数据
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }
  
  updateInterval.value = setInterval(() => {
    updateUI()
  }, 100)
  
  // 更新统计
  refreshStats()
}

// 初始化游戏
const initGame = () => {
  // 设置初始画布尺寸
  if (gameCanvas.value) {
    const canvasWidth = gameConfig.gridCols * gameConfig.cellWidth
    const canvasHeight = gameConfig.gridRows * gameConfig.cellHeight
    gameCanvas.value.width = canvasWidth
    gameCanvas.value.height = canvasHeight
  }
}

// 拖拽开始处理
const handleDragStart = (e, plantId) => {
  e.dataTransfer.setData('text/plain', plantId)
  e.dataTransfer.effectAllowed = 'copy'
  
  // 设置拖拽时的透明度
  if (e.dataTransfer.setDragImage) {
    e.dataTransfer.setDragImage(e.target, 75, 75)
  }
}

// 生命周期
onMounted(() => {
  initGame()
  refreshStats()
})

// 打开弹窗时刷新统计
const openAchievements = () => {
  refreshStats()
  showAchievements.value = true
}

const openStats = () => {
  refreshStats()
  showStats.value = true
}

onUnmounted(() => {
  // 清理定时器
  if (updateInterval.value) {
    clearInterval(updateInterval.value)
  }
  
  // 停止游戏
  if (gameEngine.value) {
    gameEngine.value.stop()
  }
})
</script>

<style scoped>
.plants-vs-zombies-view {
  min-height: 100vh;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* 游戏标题 */
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

.start-btn {
  padding: 12px 32px;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.start-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(34, 197, 94, 0.5);
}

/* 游戏容器 */
.game-container {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

/* 植物选择栏 */
.plants-sidebar {
  width: 200px;
  max-height: calc(100vh - 20px);
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

/* 自定义滚动条样式 */
.plants-sidebar::-webkit-scrollbar {
  width: 6px;
}

.plants-sidebar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.plants-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.plants-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}

.plants-sidebar h3 {
  margin: 0 0 16px 0;
  font-size: 1.2rem;
  color: white;
  position: sticky;
  top: 0;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 10px 0;
  z-index: 1;
}

.plant-slots {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plant-slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.plant-slot:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.plant-slot.selected {
  border-color: #fbbf24;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.5);
}

.plant-slot.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.plant-icon {
  font-size: 2.5rem;
  margin-bottom: 8px;
}

.plant-name {
  font-size: 0.9rem;
  color: white;
  margin-bottom: 4px;
}

.plant-cost {
  font-size: 0.8rem;
  color: #fbbf24;
}

/* 冷却遮罩 */
.cooldown-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cooldown-text {
  font-size: 0.9rem;
  color: white;
  font-weight: 600;
}

/* 游戏画布 */
.game-canvas {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-canvas canvas {
  display: block;
  cursor: crosshair;
}

/* 信息面板 */
.info-panel {
  width: 180px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.info-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 8px;
}

.info-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: white;
}

.info-value.sun {
  color: #fbbf24;
}

/* 游戏说明 */
.game-instructions {
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 16px;
  padding: 30px;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin: 0 0 20px 0;
  font-size: 1.8rem;
  color: #1f2937;
  text-align: center;
}

.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.achievement-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #f3f4f6;
  border-radius: 8px;
  gap: 12px;
}

.achievement-item.unlocked {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 2px solid #fbbf24;
}

.achievement-icon {
  font-size: 2rem;
}

.achievement-info {
  flex: 1;
}

.achievement-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.achievement-desc {
  font-size: 0.9rem;
  color: #6b7280;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f3f4f6;
  border-radius: 8px;
}

.stat-label {
  font-size: 1.1rem;
  color: #1f2937;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #22c55e;
}

.modal-close {
  width: 100%;
  padding: 12px;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-close:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

/* 控制按钮样式 */
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

.auto-collect-active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
}

/* Toast 提示样式 */
.toast-container {
  position: fixed;
  top: 80px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toast {
  padding: 16px 20px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 300px;
  max-width: 400px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  animation: slideIn 0.3s ease-out;
  backdrop-filter: blur(10px);
}

.toast-success {
  background: rgba(34, 197, 94, 0.95);
  border: 2px solid #22c55e;
}

.toast-error {
  background: rgba(239, 68, 68, 0.95);
  border: 2px solid #ef4444;
}

.toast-warning {
  background: rgba(251, 191, 36, 0.95);
  border: 2px solid #fbbf24;
}

.toast-info {
  background: rgba(99, 102, 241, 0.95);
  border: 2px solid #6366f1;
}

.toast-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.toast-message {
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  line-height: 1.4;
  flex: 1;
}

/* Toast 动画 */
.toast-enter-active {
  animation: slideIn 0.3s ease-out;
}

.toast-leave-active {
  animation: slideOut 0.3s ease-in;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes slideOut {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}

/* 铲子按钮样式 */
.shovel-btn {
  margin-top: 16px;
  padding: 12px 20px;
  font-size: 1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.shovel-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
}

.shovel-active {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.6) !important;
  animation: pulse-red 1.5s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
  }
  50% {
    box-shadow: 0 0 30px rgba(239, 68, 68, 0.9);
  }
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .game-container {
    flex-direction: column;
  }

  .plants-sidebar,
  .info-panel {
    width: 100%;
  }

  .plants-sidebar {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  }

  .plant-slots {
    flex-direction: row;
  }

  .info-panel {
    display: flex;
    justify-content: space-around;
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

  .start-btn {
    width: 100%;
  }

  .game-canvas {
    overflow-x: auto;
  }
}
</style>
