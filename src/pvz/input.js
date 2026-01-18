import { gameConfig, plantConfig } from './config.js'
import { distance } from './utils.js'

// 输入处理器类
export class InputHandler {
  constructor(engine) {
    this.engine = engine
    this.setupEventListeners()
  }
  
  setupEventListeners() {
    this.engine.canvas.addEventListener('click', (e) => this.handleClick(e))
    this.engine.canvas.addEventListener('dragover', (e) => this.handleDragOver(e))
    this.engine.canvas.addEventListener('drop', (e) => this.handleDrop(e))
  }
  
  handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  
  handleDrop(e) {
    e.preventDefault()
    const rect = this.engine.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 获取拖拽的植物ID
    const plantId = e.dataTransfer.getData('text/plain')
    if (!plantId) return
    
    // 种植植物
    this.placePlantAtPosition(x, y, plantId)
  }
  
  placePlantAtPosition(x, y, plantId) {
    const { col, row } = this.engine.grid.pixelToGrid(x, y)
    
    // 检查是否在网格范围内
    if (col < 0 || col >= gameConfig.gridCols || 
        row < 0 || row >= gameConfig.gridRows) {
      this.engine.showMessage('超出网格范围', '#f87171')
      return
    }
    
    // 检查是否在小推车所在的格子
    if (col === gameConfig.lawnMowers.col) {
      this.engine.showMessage('这里是小推车位置，不能种植植物', '#f87171')
      return
    }
    
    // 检查格子是否为空
    if (!this.engine.grid.isEmpty(col, row)) {
      this.engine.showMessage('格子已被占用', '#f87171')
      return
    }
    
    // 检查阳光是否足够
    const config = plantConfig[plantId]
    if (this.engine.sunEnergy < config.cost) {
      this.engine.showMessage('阳光不足', '#f87171')
      return
    }
    
    // 检查冷却
    const remainingCooldown = this.engine.plantCooldowns[plantId]
    if (remainingCooldown > 0) {
      this.engine.showMessage('植物冷却中', '#f87171')
      return
    }
    
    // 种植植物
    this.engine.plant(col, row, plantId)
  }
  
  handleClick(e) {
    const rect = this.engine.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 检查是否点击到阳光
    if (this.checkSunClick(x, y)) return
    
    // 检查是否在玉米加农炮瞄准模式
    if (this.handleCannonAimingClick(x, y)) return
    
    // 检查是否点击到网格种植植物
    this.checkPlantClick(x, y)
  }
  
  checkSunClick(x, y) {
    for (let i = this.engine.suns.length - 1; i >= 0; i--) {
      const sun = this.engine.suns[i]
      const dist = distance(x, y, sun.x, sun.y)
      
      if (dist < 30) {
        // 收集阳光
        this.engine.collectSun(sun)
        this.engine.suns.splice(i, 1)
        return true
      }
    }
    return false
  }
  
  handleCannonAimingClick(x, y) {
    // 如果在玉米加农炮瞄准模式
    if (this.engine.isCannonAimingMode) {
      const { col, row } = this.engine.grid.pixelToGrid(x, y)
      
      // 检查是否在网格范围内
      if (col >= 0 && col < gameConfig.gridCols && 
          row >= 0 && row < gameConfig.gridRows) {
        // 发射炮弹到目标位置
        if (this.engine.activeCannon) {
          const pixelPos = this.engine.grid.gridToPixel(col, row)
          const targetX = pixelPos.x + gameConfig.cellWidth / 2
          const targetY = pixelPos.y + gameConfig.cellHeight / 2
          
          this.engine.fireCannonProjectile(this.engine.activeCannon, targetX, targetY)
          this.engine.showMessage('🌽 玉米加农炮发射！', '#fbbf24')
        }
      }
      
      // 退出瞄准模式
      this.engine.isCannonAimingMode = false
      this.engine.activeCannon = null
      
      return true
    }
    
    // 如果不在瞄准模式，检查是否点击了玉米加农炮
    const { col, row } = this.engine.grid.pixelToGrid(x, y)
    if (col >= 0 && col < gameConfig.gridCols && 
        row >= 0 && row < gameConfig.gridRows) {
      const plant = this.engine.grid.getPlant(col, row)
      
      // 如果点击的是玉米加农炮
      if (plant && plant.type === 'cannon') {
        // 检查是否处于沉睡状态
        if (plant.isSleeping) {
          this.engine.showMessage('玉米加农炮正在沉睡中，无法发射！', '#f87171')
          return true
        }
        
        // 进入瞄准模式
        this.engine.isCannonAimingMode = true
        this.engine.activeCannon = plant
        this.engine.showMessage('🎯 瞄准模式：选择目标位置', '#fbbf24')
        return true
      }
    }
    
    return false
  }
  
  checkPlantClick(x, y) {
    const { col, row } = this.engine.grid.pixelToGrid(x, y)
    
    // 检查是否在网格范围内
    if (col < 0 || col >= gameConfig.gridCols || 
        row < 0 || row >= gameConfig.gridRows) {
      // 点击网格外，取消选择
      this.engine.selectedPlant = null
      // 如果在瞄准模式点击网格外，也要取消瞄准模式
      if (this.engine.isCannonAimingMode) {
        this.engine.isCannonAimingMode = false
        this.engine.activeCannon = null
        this.engine.showMessage('已取消瞄准', '#f87171')
      }
      return
    }
    
    // 检查是否在铲除模式
    if (this.engine.isShovelMode) {
      const plant = this.engine.grid.getPlant(col, row)
      if (plant) {
        // 铲除植物
        this.engine.digupPlant(plant)
        // 铲除后自动退出铲除模式
        this.engine.isShovelMode = false
      } else {
        this.engine.showMessage('请选择要铲除的植物', '#f87171')
      }
      return
    }
    
    // 检查是否选中了植物
    if (!this.engine.selectedPlant) {
      return
    }
    
    // 检查是否在小推车所在的格子
    if (col === gameConfig.lawnMowers.col) {
      this.engine.showMessage('这里是小推车位置，不能种植植物', '#f87171')
      return
    }
    
    // 检查格子是否为空
    if (!this.engine.grid.isEmpty(col, row)) {
      // 格子已被占用，显示红色提示
      this.engine.showMessage('格子已被占用', '#f87171')
      return
    }
    
    // 检查阳光是否足够
    const config = plantConfig[this.engine.selectedPlant]
    if (this.engine.sunEnergy < config.cost) {
      // 阳光不足，显示红色提示
      this.engine.showMessage('阳光不足', '#f87171')
      return
    }
    
    // 检查冷却
    const remainingCooldown = this.engine.plantCooldowns[this.engine.selectedPlant]
    if (remainingCooldown > 0) {
      this.engine.showMessage('植物冷却中', '#f87171')
      return
    }
    
    // 种植植物
    this.engine.plant(col, row, this.engine.selectedPlant)
    
    // 清除选择
    this.engine.selectedPlant = null
  }
}
