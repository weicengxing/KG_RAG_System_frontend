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
  }
  
  handleClick(e) {
    const rect = this.engine.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 检查是否点击到阳光
    if (this.checkSunClick(x, y)) return
    
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
  
  checkPlantClick(x, y) {
    const { col, row } = this.engine.grid.pixelToGrid(x, y)
    
    // 检查是否在网格范围内
    if (col < 0 || col >= gameConfig.gridCols || 
        row < 0 || row >= gameConfig.gridRows) {
      // 点击网格外，取消选择
      this.engine.selectedPlant = null
      return
    }
    
    // 检查是否选中了植物
    if (!this.engine.selectedPlant) {
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
