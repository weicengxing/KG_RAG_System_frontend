import { gameConfig, plantConfig, zombieConfig } from './config.js'

// 渲染器类
export class Renderer {
  constructor(ctx) {
    this.ctx = ctx
  }
  
  // 绘制网格
  drawGrid(grid) {
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const x = col * grid.cellWidth
        const y = row * grid.cellHeight
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
        this.ctx.lineWidth = 1
        this.ctx.strokeRect(x, y, grid.cellWidth, grid.cellHeight)
      }
    }
  }
  
  // 绘制植物
  drawPlants(plants) {
    for (const plant of plants) {
      const config = plantConfig[plant.type]
      
      // 根据植物类型选择背景颜色
      let bgColor
      let borderColor
      switch (plant.type) {
        case 'sunflower':
          bgColor = '#4ade80'
          borderColor = '#22c55e'
          break
        case 'peashooter':
          bgColor = '#4ade80'
          borderColor = '#22c55e'
          break
        case 'snowPea':
          bgColor = '#93c5fd'
          borderColor = '#3b82f6'
          break
        case 'nutWall':
          bgColor = '#d97706'
          borderColor = '#92400e'
          break
        case 'cherryBomb':
          bgColor = '#ef4444'
          borderColor = '#dc2626'
          break
        default:
          bgColor = '#4ade80'
          borderColor = '#22c55e'
      }
      
      // 绘制背景
      this.ctx.fillStyle = bgColor
      this.ctx.fillRect(plant.x, plant.y, plant.width, plant.height)
      
      // 绘制边框
      this.ctx.strokeStyle = borderColor
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(plant.x, plant.y, plant.width, plant.height)
      
      // 绘制emoji
      this.ctx.font = '48px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(config.icon, plant.x + plant.width / 2, plant.y + plant.height / 2)
      
      // 绘制血条
      this.drawHealthBar(plant.x, plant.y, plant.width, 10, plant.hp, plant.maxHp)
      
      // 如果是樱桃炸弹，显示倒计时
      if (plant.type === 'cherryBomb' && plant.explodeTimer > 0) {
        const explodeConfig = plantConfig.cherryBomb
        const timeLeft = explodeConfig.explodeDelay - plant.explodeTimer
        const progress = timeLeft / explodeConfig.explodeDelay
        
        // 绘制倒计时进度条
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        this.ctx.fillRect(plant.x + 5, plant.y + plant.height - 8, plant.width - 10, 4)
        
        this.ctx.fillStyle = '#ef4444'
        this.ctx.fillRect(plant.x + 5, plant.y + plant.height - 8, (plant.width - 10) * progress, 4)
      }
    }
  }
  
  // 绘制僵尸
  drawZombies(zombies) {
    for (const zombie of zombies) {
      const config = zombieConfig[zombie.type]
      
      // 如果有护盾，显示护盾效果
      if (zombie.shieldHp > 0) {
        // 绘制护盾边框
        this.ctx.strokeStyle = '#fbbf24'
        this.ctx.lineWidth = 4
        this.ctx.strokeRect(zombie.x - 2, zombie.y - 2, zombie.width + 4, zombie.height + 4)
      }
      
      // 绘制背景
      this.ctx.fillStyle = '#f87171'
      this.ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height)
      
      // 绘制边框
      this.ctx.strokeStyle = '#ef4444'
      this.ctx.lineWidth = 2
      this.ctx.strokeRect(zombie.x, zombie.y, zombie.width, zombie.height)
      
      // 绘制emoji
      this.ctx.font = '48px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(config.icon, zombie.x + zombie.width / 2, zombie.y + zombie.height / 2)
      
      // 计算总血量（本体+护盾）
      const totalHp = zombie.hp + (zombie.shieldHp || 0)
      const totalMaxHp = zombie.maxHp + (config.shieldHp || 0)
      
      // 绘制总血条
      this.drawHealthBar(zombie.x, zombie.y, zombie.width, 10, totalHp, totalMaxHp)
      
      // 如果有护盾，绘制护盾血条
      if (zombie.shieldHp > 0) {
        this.ctx.fillStyle = 'rgba(251, 191, 36, 0.3)' // 黄色半透明
        this.ctx.fillRect(zombie.x + 5, zombie.y + zombie.height - 8, zombie.width - 10, 4)
        
        this.ctx.fillStyle = '#fbbf24'
        const shieldPercent = zombie.shieldHp / (config.shieldHp || 1)
        this.ctx.fillRect(zombie.x + 5, zombie.y + zombie.height - 8, (zombie.width - 10) * shieldPercent, 4)
      }
      
      // 如果被减速，显示减速效果
      if (zombie.slowDuration > 0) {
        this.ctx.fillStyle = 'rgba(59, 130, 246, 0.5)' // 蓝色半透明
        this.ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height)
        
        // 绘制冰冻图标
        this.ctx.font = '20px Arial'
        this.ctx.fillText('❄️', zombie.x + zombie.width - 15, zombie.y + 15)
      }
      
      // 如果在攻击状态，绘制攻击指示器
      if (zombie.state === 'EATING') {
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'
        this.ctx.fillRect(zombie.x, zombie.y - 5, zombie.width, 5)
      }
    }
  }
  
  // 绘制子弹
  drawProjectiles(projectiles) {
    for (const projectile of projectiles) {
      // 根据子弹类型选择颜色
      let bgColor
      let borderColor
      if (projectile.type === 'icePea') {
        bgColor = '#3b82f6' // 蓝色
        borderColor = '#1d4ed8'
      } else {
        bgColor = '#22c55e' // 绿色
        borderColor = '#16a34a'
      }
      
      this.ctx.fillStyle = bgColor
      this.ctx.beginPath()
      this.ctx.arc(projectile.x, projectile.y, 8, 0, Math.PI * 2)
      this.ctx.fill()
      
      // 绘制边框
      this.ctx.strokeStyle = borderColor
      this.ctx.lineWidth = 2
      this.ctx.stroke()
    }
  }
  
  // 绘制阳光
  drawSuns(suns) {
    for (const sun of suns) {
      // 绘制阳光背景（可选）
      const timeRatio = sun.lifeTime / gameConfig.sunLifeTime
      this.ctx.fillStyle = `rgba(255, 255, 0, ${timeRatio})`
      this.ctx.beginPath()
      this.ctx.arc(sun.x, sun.y, 25, 0, Math.PI * 2)
      this.ctx.fill()
      
      // 绘制emoji
      this.ctx.font = '40px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText('☀️', sun.x, sun.y)
    }
  }
  
  // 绘制血条
  drawHealthBar(x, y, width, height, current, max) {
    const padding = 5
    const barHeight = height - padding * 2
    const barWidth = width - padding * 2
    const healthPercent = Math.max(0, current / max)
    
    // 背景
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fillRect(x + padding, y + padding, barWidth, barHeight)
    
    // 血量
    if (healthPercent > 0.5) {
      this.ctx.fillStyle = '#22c55e'
    } else if (healthPercent > 0.25) {
      this.ctx.fillStyle = '#eab308'
    } else {
      this.ctx.fillStyle = '#ef4444'
    }
    this.ctx.fillRect(x + padding, y + padding, barWidth * healthPercent, barHeight)
  }
  
  // 绘制动画
  drawAnimations(animations) {
    for (const anim of animations) {
      const progress = anim.time / anim.duration
      
      switch (anim.type) {
        case 'death':
          this.drawDeathAnimation(anim, progress)
          break
        case 'explode':
          this.drawExplosionAnimation(anim, progress)
          break
        case 'plant':
          this.drawPlantAnimation(anim, progress)
          break
      }
    }
  }
  
  // 死亡动画
  drawDeathAnimation(anim, progress) {
    const scale = 1 - progress
    const alpha = 1 - progress
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(anim.x, anim.y)
    this.ctx.scale(scale, scale)
    
    // 绘制骷髅
    this.ctx.font = '48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('💀', 0, 0)
    
    this.ctx.restore()
  }
  
  // 爆炸动画
  drawExplosionAnimation(anim, progress) {
    const scale = progress * 3
    const alpha = 1 - progress
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(anim.x, anim.y)
    this.ctx.scale(scale, scale)
    
    // 绘制爆炸圆圈
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 60)
    gradient.addColorStop(0, 'rgba(255, 255, 0, 0.8)')
    gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.6)')
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)')
    
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 60, 0, Math.PI * 2)
    this.ctx.fill()
    
    // 绘制爆炸文字
    this.ctx.font = 'bold 36px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('💥', 0, 0)
    
    this.ctx.restore()
  }
  
  // 种植动画
  drawPlantAnimation(anim, progress) {
    const scale = progress * 1.5
    const alpha = 1 - progress
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(anim.x, anim.y)
    this.ctx.scale(scale, scale)
    
    // 绘制叶子效果
    this.ctx.fillStyle = 'rgba(34, 197, 94, 0.6)'
    this.ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const x = Math.cos(angle) * 30 * progress
      const y = Math.sin(angle) * 30 * progress
      this.ctx.lineTo(x, y)
    }
    this.ctx.closePath()
    this.ctx.fill()
    
    this.ctx.restore()
  }
  
  // 绘制消息
  drawMessages(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]
      
      // 移除过期消息已在engine中处理
      
      // 绘制消息背景
      this.ctx.font = 'bold 24px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'top'
      
      const textX = 400 // 屏幕中心
      const textY = 50 + i * 35 // 从顶部开始
      
      // 绘制半透明背景
      const textMetrics = this.ctx.measureText(message.text)
      const bgWidth = textMetrics.width + 20
      const bgHeight = 30
      
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      this.ctx.fillRect(textX - bgWidth / 2, textY - 5, bgWidth, bgHeight)
      
      // 绘制文字
      this.ctx.fillStyle = message.color
      this.ctx.fillText(message.text, textX, textY)
    }
  }
}
