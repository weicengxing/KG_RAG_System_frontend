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
        <button v-if="isVip" @click="openPvzConfigPanel" class="vip-config-btn">VIP配置</button>
        <button @click="goToMultiplayerRoom" class="multiplayer-btn">👥 双人模式</button>
        <button @click="goToPlantSelection" class="start-btn">{{ isPlaying ? '重新开始' : '开始游戏' }}</button>
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
      <p>6. 新功能：波次系统、成就系统、游戏存档、音效控制、拖拽种植、自定义植物选择</p>
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

    <!-- VIP配置面板 -->
    <div v-if="showPvzConfigPanel" class="modal-overlay" @click="showPvzConfigPanel = false">
      <div class="modal-content pvz-config-modal" @click.stop>
        <div class="pvz-config-header">
          <div>
            <h2>VIP配置面板</h2>
            <p>修改后会保存为全局配置，下一局会完整应用。</p>
          </div>
          <button class="config-icon-btn" @click="showPvzConfigPanel = false" aria-label="关闭">×</button>
        </div>

        <div v-if="pvzConfigLoading" class="config-loading">配置加载中...</div>
        <div v-else class="config-editor">
          <section class="config-section">
            <h3>初始值与全局参数</h3>
            <div class="game-config-grid">
              <label v-for="field in editableGameFields" :key="field.key" class="config-field">
                <span>{{ field.label }}</span>
                <input
                  v-model.number="pvzConfigForm.game[field.key]"
                  type="number"
                  :step="field.step"
                  :min="field.min"
                />
              </label>
            </div>
          </section>

          <section class="config-section">
            <h3>植物属性</h3>
            <div class="config-table">
              <div v-for="plant in plantConfigRows" :key="plant.id" class="config-row">
                <div class="config-row-title">
                  <span class="config-row-icon">{{ plant.icon }}</span>
                  <span>{{ plant.name }}</span>
                </div>
                <label v-for="field in plant.fields" :key="`${plant.id}-${field}`" class="config-field compact">
                  <span>{{ getConfigFieldLabel(field) }}</span>
                  <input v-model.number="pvzConfigForm.plants[plant.id][field]" type="number" step="0.1" />
                </label>
              </div>
            </div>
          </section>

          <section class="config-section">
            <h3>僵尸属性</h3>
            <div class="config-table">
              <div v-for="zombie in zombieConfigRows" :key="zombie.id" class="config-row">
                <div class="config-row-title">
                  <span class="config-row-icon">{{ zombie.icon }}</span>
                  <span>{{ zombie.name }}</span>
                </div>
                <label v-for="field in zombie.fields" :key="`${zombie.id}-${field}`" class="config-field compact">
                  <span>{{ getConfigFieldLabel(field) }}</span>
                  <input v-model.number="pvzConfigForm.zombies[zombie.id][field]" type="number" step="0.1" />
                </label>
              </div>
            </div>
          </section>
        </div>

        <div class="config-actions">
          <button class="secondary-config-btn" @click="buildPvzConfigForm">恢复当前值</button>
          <button class="primary-config-btn" :disabled="pvzConfigSaving" @click="savePvzConfig">
            {{ pvzConfigSaving ? '保存中...' : '保存配置' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { GameEngine } from '../pvz/engine.js'
import { plantConfig, zombieConfig, gameConfig } from '../pvz/config.js'
import request from '../utils/request.js'
import { applyPvzConfigOverrides, flattenGameConfig, loadPvzRuntimeConfig } from '../pvz/configOverrides.js'

const router = useRouter()
const route = useRoute()

const gameCanvas = ref(null)
const sunEnergy = ref(gameConfig.initialSunEnergy)
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
const isVip = ref(false)
const showPvzConfigPanel = ref(false)
const pvzConfigLoading = ref(false)
const pvzConfigSaving = ref(false)
const pvzConfigForm = ref({
  plants: {},
  zombies: {},
  game: {}
})

// 成就和统计
const achievements = ref({})
const stats = ref({
  highScore: 0,
  totalKills: 0,
  totalWaves: 0
})

const gameEngine = ref(null)
const updateInterval = ref(null)

const defaultPlantIds = [
  'sunflower',
  'peashooter',
  'repeater',
  'snowPea',
  'nutWall',
  'cherryBomb',
  'watermelon',
  'iceWatermelon',
  'kiwi',
  'cannon',
  'fireStump',
  'jalapeno',
  'squash',
  'potatoMine',
  'thunderMelon',
  'dragonKale',
  'hypnoShroom'
]

const editableGameFields = [
  { key: 'initialSunEnergy', label: '单人初始阳光', min: 0, step: 1 },
  { key: 'multiplayerInitialSunEnergy', label: '双人植物初始阳光', min: 0, step: 1 },
  { key: 'multiplayerInitialZombieEnergy', label: '双人僵尸初始能量', min: 0, step: 1 },
  { key: 'sunFallInterval', label: '自然阳光间隔(秒)', min: 0, step: 0.1 },
  { key: 'zombieSpawnInterval', label: '僵尸生成间隔(秒)', min: 0, step: 0.1 },
  { key: 'sunLifeTime', label: '阳光存在时间(秒)', min: 0, step: 0.1 },
  { key: 'sunValue', label: '阳光数值', min: 0, step: 1 },
  { key: 'gridCols', label: '列数', min: 1, step: 1 },
  { key: 'gridRows', label: '行数', min: 1, step: 1 },
  { key: 'cellWidth', label: '格子宽度', min: 1, step: 1 },
  { key: 'cellHeight', label: '格子高度', min: 1, step: 1 }
]

const configFieldLabels = {
  cost: '费用',
  hp: '生命',
  damage: '伤害',
  cooldown: '冷却',
  attackInterval: '攻击间隔',
  projectileSpeed: '弹速',
  speed: '速度',
  shieldHp: '护盾',
  attackDamage: '啃咬伤害',
  produceInterval: '生产间隔',
  produceAmount: '生产数量',
  width: '宽度',
  height: '高度',
  slowDuration: '减速时间',
  slowFactor: '减速系数',
  explodeDelay: '爆炸延迟',
  explodeRadius: '爆炸半径',
  gravity: '重力',
  rotationSpeed: '旋转速度',
  staffDamage: '法杖伤害',
  staffLifeTime: '法杖时间',
  staffAttackInterval: '法杖间隔',
  staffRadius: '法杖半径',
  sleepDuration: '准备时间',
  gridWidth: '占用宽',
  gridHeight: '占用高',
  triggerDistance: '触发距离',
  jumpDuration: '跳跃时间',
  projectileCount: '弹数量',
  projectileDelay: '弹间隔',
  damageIncrement: '伤害递增',
  lightningRange: '闪电范围',
  maxJumps: '跳跃次数',
  bladeDamage: '刀片伤害',
  bladeCount: '刀片数量',
  shieldDamageMultiplier: '破盾倍率',
  dragonDamage: '龙息伤害',
  dragonRadius: '龙息半径',
  bladeSpeed: '刀片速度',
  bladeRotationSpeed: '刀片转速',
  bladeAngleChange: '角度变化',
  jumpSpeed: '跳跃速度',
  poleDistance: '撑杆距离'
}

const getConfigFieldLabel = (field) => configFieldLabels[field] || field

const getNumericFields = (config) => Object.keys(config).filter((key) => (
  typeof config[key] === 'number' && Number.isFinite(config[key])
))

const plantConfigRows = computed(() => Object.entries(plantConfig).map(([id, config]) => ({
  id,
  name: config.name || id,
  icon: config.icon || '',
  fields: getNumericFields(config)
})).filter((row) => row.fields.length > 0))

const zombieConfigRows = computed(() => Object.entries(zombieConfig).map(([id, config]) => ({
  id,
  name: config.name || id,
  icon: config.icon || '',
  fields: getNumericFields(config)
})).filter((row) => row.fields.length > 0))

const cloneNumericConfig = (source) => {
  const result = {}
  Object.entries(source).forEach(([id, config]) => {
    result[id] = {}
    getNumericFields(config).forEach((field) => {
      result[id][field] = config[field]
    })
  })
  return result
}

const normalizeNumericConfig = (source) => {
  const result = {}
  Object.entries(source || {}).forEach(([id, values]) => {
    const cleanValues = {}
    Object.entries(values || {}).forEach(([field, value]) => {
      const numberValue = Number(value)
      if (Number.isFinite(numberValue)) {
        cleanValues[field] = numberValue
      }
    })
    if (Object.keys(cleanValues).length > 0) {
      result[id] = cleanValues
    }
  })
  return result
}

const normalizeGameConfig = (source) => {
  const result = {}
  editableGameFields.forEach(({ key }) => {
    const numberValue = Number(source?.[key])
    if (Number.isFinite(numberValue)) {
      result[key] = numberValue
    }
  })
  return result
}

const refreshSelectedPlantsFromConfig = (plantIds = defaultPlantIds) => {
  selectedPlants.value = plantIds
    .filter((id) => plantConfig[id])
    .map((id) => ({
      id,
      ...plantConfig[id]
    }))
}

// 可选择的植物
const selectedPlants = ref([])
refreshSelectedPlantsFromConfig()

const buildPvzConfigForm = () => {
  pvzConfigForm.value = {
    plants: cloneNumericConfig(plantConfig),
    zombies: cloneNumericConfig(zombieConfig),
    game: normalizeGameConfig(flattenGameConfig())
  }
}

const fetchPvzConfig = async () => {
  pvzConfigLoading.value = true
  try {
    const data = await loadPvzRuntimeConfig()
    isVip.value = Boolean(data?.is_vip)
    refreshSelectedPlantsFromConfig()
    buildPvzConfigForm()
    if (!gameEngine.value) {
      sunEnergy.value = gameConfig.initialSunEnergy
    }
  } catch (error) {
    console.error('加载PVZ配置失败:', error)
    buildPvzConfigForm()
  } finally {
    pvzConfigLoading.value = false
  }
}

const openPvzConfigPanel = () => {
  buildPvzConfigForm()
  showPvzConfigPanel.value = true
}

const savePvzConfig = async () => {
  if (!isVip.value) {
    ElMessage.warning('此功能仅限VIP用户使用')
    return
  }

  pvzConfigSaving.value = true
  try {
    const response = await request.put('/pvz/config', {
      plants: normalizeNumericConfig(pvzConfigForm.value.plants),
      zombies: normalizeNumericConfig(pvzConfigForm.value.zombies),
      game: normalizeGameConfig(pvzConfigForm.value.game)
    })
    applyPvzConfigOverrides(response.data?.data || {})
    refreshSelectedPlantsFromConfig()
    buildPvzConfigForm()
    if (!gameEngine.value) {
      sunEnergy.value = gameConfig.initialSunEnergy
    }
    ElMessage.success(response.data?.message || '配置已保存')
  } catch (error) {
    console.error('保存PVZ配置失败:', error)
    ElMessage.error(error.response?.data?.detail || '配置保存失败')
  } finally {
    pvzConfigSaving.value = false
  }
}

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
  } else {
    gameEngine.value.isShovelMode = false
  }
}

// 选择植物
const selectPlant = (plantId) => {
  if (!gameEngine.value) return
  
  const config = plantConfig[plantId]
  
  // 检查阳光
  if (sunEnergy.value < config.cost) {
    return
  }
  
  // 检查冷却
  if (plantCooldowns.value[plantId] > 0) {
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

// 跳转到植物选择页面
const goToPlantSelection = () => {
  router.push({
    name: 'PlantSelection'
  })
}

// 跳转到多人对战房间页面
const goToMultiplayerRoom = () => {
  router.push({
    name: 'PvZMultiplayerRoom'
  })
}

// 开始游戏
const startGame = () => {
  if (!gameCanvas.value) return
  
  // 如果游戏已开始，先停止
  if (gameEngine.value) {
    gameEngine.value.stop()
  }
  
  // 检查路由参数中是否有植物列表
  let plantsToUse = selectedPlants.value
  if (route.query.plants) {
    const plantIds = route.query.plants.split(',')
    plantsToUse = plantIds.map(id => ({
      id,
      ...plantConfig[id]
    }))
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
  
  // 设置自定义植物列表
  if (route.query.plants) {
    gameEngine.value.setCustomPlants(plantsToUse)
  }
  
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
  
  // 检查路由参数中是否有植物列表
  if (route.query.plants) {
    const plantIds = route.query.plants.split(',')
    refreshSelectedPlantsFromConfig(plantIds)
    
    // 自动开始游戏
    setTimeout(() => {
      startGame()
    }, 100)
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
onMounted(async () => {
  await fetchPvzConfig()
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

.multiplayer-btn {
  padding: 12px 32px;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(249, 115, 22, 0.4);
}

.multiplayer-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(249, 115, 22, 0.5);
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

.pvz-config-modal {
  max-width: 1120px;
  width: min(94vw, 1120px);
  padding: 24px;
}

.pvz-config-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.pvz-config-header h2 {
  margin: 0 0 6px 0;
  text-align: left;
}

.pvz-config-header p {
  margin: 0;
  color: #6b7280;
  font-size: 0.95rem;
}

.config-icon-btn {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  border: none;
  border-radius: 8px;
  background: #f3f4f6;
  color: #374151;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.config-loading {
  padding: 28px;
  text-align: center;
  color: #4b5563;
}

.config-editor {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-section h3 {
  margin: 0 0 12px 0;
  color: #1f2937;
  font-size: 1.1rem;
}

.game-config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 12px;
}

.config-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.config-row {
  display: grid;
  grid-template-columns: 170px repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  align-items: end;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.config-row-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  color: #111827;
  font-weight: 700;
}

.config-row-icon {
  font-size: 1.5rem;
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.config-field span {
  color: #4b5563;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.config-field input {
  width: 100%;
  height: 36px;
  padding: 6px 8px;
  color: #111827;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  outline: none;
}

.config-field input:focus {
  border-color: #f59e0b;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.16);
}

.config-field.compact input {
  height: 34px;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.primary-config-btn,
.secondary-config-btn,
.vip-config-btn {
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.3s ease;
}

.primary-config-btn,
.secondary-config-btn {
  padding: 10px 18px;
  font-size: 1rem;
}

.primary-config-btn {
  color: white;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.primary-config-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.secondary-config-btn {
  color: #374151;
  background: #e5e7eb;
}

.vip-config-btn {
  padding: 8px 16px;
  color: #111827;
  background: linear-gradient(135deg, #facc15 0%, #f59e0b 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
}

.vip-config-btn:hover,
.primary-config-btn:hover,
.secondary-config-btn:hover,
.config-icon-btn:hover {
  transform: translateY(-2px);
}

/* 控制按钮样式 */
.header-buttons {
  display: flex;
  flex-wrap: wrap;
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

  .config-row {
    grid-template-columns: 1fr;
  }

  .config-actions {
    flex-direction: column;
  }

  .game-canvas {
    overflow-x: auto;
  }
}
</style>
