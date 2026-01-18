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
        
        // 检查是否是小推车所在的列
        if (col === gameConfig.lawnMowers.col) {
          // 绘制紫红色背景
          this.ctx.fillStyle = gameConfig.lawnMowers.bgColor
          this.ctx.fillRect(x, y, grid.cellWidth, grid.cellHeight)
          
          // 绘制紫红色边框
          this.ctx.strokeStyle = gameConfig.lawnMowers.borderColor
          this.ctx.lineWidth = 2
          this.ctx.strokeRect(x, y, grid.cellWidth, grid.cellHeight)
        } else {
          // 普通格子
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
          this.ctx.lineWidth = 1
          this.ctx.strokeRect(x, y, grid.cellWidth, grid.cellHeight)
        }
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
        case 'watermelon':
          bgColor = '#16a34a'
          borderColor = '#15803d'
          break
        case 'iceWatermelon':
          bgColor = '#60a5fa'
          borderColor = '#2563eb'
          break
        case 'kiwi':
          bgColor = '#a3e635'
          borderColor = '#84cc16'
          break
        case 'cannon':
          bgColor = '#fbbf24'
          borderColor = '#f59e0b'
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
      
      // 如果是玉米加农炮且在沉睡状态，添加视觉效果
      if (plant.type === 'cannon' && plant.isSleeping) {
        this.ctx.globalAlpha = 0.6 // 半透明效果
        
        // 绘制沉睡 Zzz 动画
        const sleepTime = Date.now() / 1000
        const zOffset = Math.sin(sleepTime * 2) * 5
        this.ctx.font = '24px Arial'
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillText('Z', plant.x + plant.width / 2 - 15, plant.y - 10 + zOffset)
        this.ctx.fillText('z', plant.x + plant.width / 2, plant.y - 20 + zOffset)
        this.ctx.fillText('z', plant.x + plant.width / 2 + 15, plant.y - 10 + zOffset)
        
        // 恢复透明度
        this.ctx.globalAlpha = 1
      }
      
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
      // 西瓜子弹（抛物线，旋转）
      if (projectile.type === 'watermelon' || projectile.type === 'iceWatermelon') {
        this.ctx.save()
        this.ctx.translate(projectile.x, projectile.y)
        this.ctx.rotate(projectile.rotation || 0)
        
        // 绘制西瓜
        this.ctx.fillStyle = projectile.type === 'iceWatermelon' ? '#93c5fd' : '#16a34a'
        this.ctx.beginPath()
        this.ctx.arc(0, 0, 20, 0, Math.PI * 2)
        this.ctx.fill()
        
        // 绘制西瓜纹理
        this.ctx.strokeStyle = '#0f766e'
        this.ctx.lineWidth = 2
        this.ctx.beginPath()
        this.ctx.arc(0, 0, 20, 0, Math.PI * 2)
        this.ctx.stroke()
        
        // 绘制花纹
        this.ctx.strokeStyle = projectile.type === 'iceWatermelon' ? '#2563eb' : '#064e3b'
        this.ctx.lineWidth = 1
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          this.ctx.beginPath()
          this.ctx.moveTo(0, 0)
          this.ctx.lineTo(Math.cos(angle) * 15, Math.sin(angle) * 15)
          this.ctx.stroke()
        }
        
        // 如果是寒冰西瓜，添加冰霜效果
        if (projectile.type === 'iceWatermelon') {
          this.ctx.globalAlpha = 0.6
          this.ctx.fillStyle = '#bfdbfe'
          this.ctx.beginPath()
          this.ctx.arc(-5, -5, 8, 0, Math.PI * 2)
          this.ctx.fill()
          this.ctx.beginPath()
          this.ctx.arc(8, 6, 5, 0, Math.PI * 2)
          this.ctx.fill()
        }
        
        this.ctx.restore()
      }
      // 普通豌豆
      else if (projectile.type === 'icePea' || projectile.type === 'pea') {
        let bgColor, borderColor
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
      // 玉米加农炮炮弹
      else if (projectile.type === 'cannon') {
        // 绘制尾迹
        if (projectile.trail && projectile.trail.length > 1) {
          this.ctx.save()
          
          // 绘制尾迹虚线
          this.ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)'
          this.ctx.lineWidth = 3
          this.ctx.setLineDash([5, 5])
          
          this.ctx.beginPath()
          for (let i = 0; i < projectile.trail.length; i++) {
            const point = projectile.trail[i]
            if (i === 0) {
              this.ctx.moveTo(point.x, point.y)
            } else {
              this.ctx.lineTo(point.x, point.y)
            }
          }
          this.ctx.stroke()
          
          // 绘制尾迹点
          this.ctx.setLineDash([])
          for (let i = 0; i < projectile.trail.length; i += 3) {
            const point = projectile.trail[i]
            const alpha = (i / projectile.trail.length) * 0.5
            this.ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`
            this.ctx.beginPath()
            this.ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
            this.ctx.fill()
          }
          
          this.ctx.restore()
        }
        
        // 保存上下文并旋转
        this.ctx.save()
        this.ctx.translate(projectile.x, projectile.y)
        this.ctx.rotate(projectile.rotation || 0)
        
        // 绘制大号炮弹（玉米）
        this.ctx.fillStyle = '#fbbf24' // 金黄色
        this.ctx.beginPath()
        this.ctx.arc(0, 0, 15, 0, Math.PI * 2)
        this.ctx.fill()
        
        // 绘制边框
        this.ctx.strokeStyle = '#f59e0b'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
        
        // 绘制玉米纹理
        this.ctx.fillStyle = '#fcd34d'
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2
          const x = Math.cos(angle) * 8
          const y = Math.sin(angle) * 8
          this.ctx.beginPath()
          this.ctx.arc(x, y, 3, 0, Math.PI * 2)
          this.ctx.fill()
        }
        
        // 添加发光效果
        this.ctx.globalAlpha = 0.4
        const gradient = this.ctx.createRadialGradient(0, 0, 15, 0, 0, 25)
        gradient.addColorStop(0, 'rgba(251, 191, 36, 0.8)')
        gradient.addColorStop(1, 'rgba(251, 191, 36, 0)')
        this.ctx.fillStyle = gradient
        this.ctx.beginPath()
        this.ctx.arc(0, 0, 25, 0, Math.PI * 2)
        this.ctx.fill()
        
        this.ctx.restore()
      }
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
        case 'staffHit':
          this.drawStaffHitAnimation(anim, progress)
          break
        case 'watermelonHit':
          this.drawWatermelonHitAnimation(anim, progress)
          break
        case 'cannonExplode':
          this.drawCannonExplodeAnimation(anim, progress)
          break
      }
    }
  }
  // 绘制金箍棒
  drawWeaponStaffs(staffs) {
    for (const staff of staffs) {
      this.ctx.save()
      this.ctx.translate(staff.x, staff.y)
      this.ctx.rotate(staff.rotation || 0)
      
      // 绘制金箍棒主体
      this.ctx.strokeStyle = '#fbbf24'
      this.ctx.lineWidth = 4
      this.ctx.beginPath()
      this.ctx.moveTo(-30, 0)
      this.ctx.lineTo(30, 0)
      this.ctx.stroke()
      
      // 绘制金箍
      this.ctx.strokeStyle = '#ffd700'
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.arc(-15, 0, 8, 0, Math.PI * 2)
      this.ctx.stroke()
      this.ctx.beginPath()
      this.ctx.arc(15, 0, 8, 0, Math.PI * 2)
      this.ctx.stroke()
      
      // 绘制金色光圈
      if (staff.state === 'spinning') {
        this.ctx.globalAlpha = 0.4
        const radius = 40 + Math.sin(Date.now() / 100) * 5
        this.ctx.strokeStyle = '#ffd700'
        this.ctx.lineWidth = 3
        this.ctx.beginPath()
        this.ctx.arc(0, 0, radius, 0, Math.PI * 2)
        this.ctx.stroke()
        
        // 绘制旋转的光芒
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + staff.rotation
          this.ctx.beginPath()
          this.ctx.moveTo(0, 0)
          this.ctx.lineTo(Math.cos(angle) * 50, Math.sin(angle) * 50)
          this.ctx.stroke()
        }
      }
      
      this.ctx.restore()
    }
  }
  
  // 金箍棒击中动画
  drawStaffHitAnimation(anim, progress) {
    const alpha = 1 - progress
    const scale = 0.5 + progress * 1.5
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(anim.x, anim.y)
    this.ctx.scale(scale, scale)
    
    // 绘制金色闪光
    this.ctx.fillStyle = '#ffd700'
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 20, 0, Math.PI * 2)
    this.ctx.fill()
    
    // 绘制光芒
    this.ctx.strokeStyle = '#fbbf24'
    this.ctx.lineWidth = 2
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      this.ctx.beginPath()
      this.ctx.moveTo(0, 0)
      this.ctx.lineTo(Math.cos(angle) * 30, Math.sin(angle) * 30)
      this.ctx.stroke()
    }
    
    this.ctx.restore()
  }
  
  // 西瓜击中动画（破碎效果）
  drawWatermelonHitAnimation(anim, progress) {
    const alpha = 1 - progress
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(anim.x, anim.y)
    
    // 绘制西瓜碎片
    this.ctx.fillStyle = anim.isIce ? '#93c5fd' : '#16a34a'
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2
      const distance = 20 + progress * 30
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance
      
      this.ctx.beginPath()
      this.ctx.arc(x, y, 8, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // 绘制汁液
    this.ctx.fillStyle = anim.isIce ? '#bfdbfe' : '#22c55e'
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2
      const distance = 10 + progress * 20
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance
      
      this.ctx.beginPath()
      this.ctx.arc(x, y, 5, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    this.ctx.restore()
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
      
      // 计算透明度（渐进消失）
      const alpha = Math.max(0, message.time / message.maxTime)
      
      // 保存当前状态
      this.ctx.save()
      
      // 设置全局透明度
      this.ctx.globalAlpha = alpha
      
      // 绘制消息
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
      
      // 恢复之前的状态
      this.ctx.restore()
    }
  }
  
  // 绘制小推车
  drawLawnMowers(lawnMowers) {
    for (const lawnMower of lawnMowers) {
      if (lawnMower.state === 'used') {
        // 已使用的小推车不显示
        continue
      }
      
      // 根据状态绘制不同样式
      let bgColor, borderColor, alpha = 1
      
      if (lawnMower.state === 'idle') {
        bgColor = '#94a3b8' // 灰色
        borderColor = '#64748b'
      } else if (lawnMower.state === 'moving') {
        bgColor = '#fbbf24' // 金色
        borderColor = '#f59e0b'
        // 移动时添加闪烁效果
        alpha = 0.8 + Math.random() * 0.2
      }
      
      // 保存当前状态
      this.ctx.save()
      this.ctx.globalAlpha = alpha
      
      // 绘制小推车主体
      this.ctx.fillStyle = bgColor
      this.ctx.fillRect(lawnMower.x, lawnMower.y, lawnMower.width, lawnMower.height)
      
      // 绘制边框
      this.ctx.strokeStyle = borderColor
      this.ctx.lineWidth = 3
      this.ctx.strokeRect(lawnMower.x, lawnMower.y, lawnMower.width, lawnMower.height)
      
      // 绘制小推车图标
      this.ctx.font = '64px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText('🚗', lawnMower.x + lawnMower.width / 2, lawnMower.y + lawnMower.height / 2)
      
      // 如果是待机状态，显示"待机"文字
      if (lawnMower.state === 'idle') {
        this.ctx.font = 'bold 12px Arial'
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillText('待机', lawnMower.x + lawnMower.width / 2, lawnMower.y + lawnMower.height - 10)
      }
      
      // 绘制箭头指示方向
      if (lawnMower.state === 'moving') {
        this.ctx.font = '24px Arial'
        this.ctx.fillText('➡️', lawnMower.x + lawnMower.width - 15, lawnMower.y + lawnMower.height / 2)
      }
      
      // 恢复之前的状态
      this.ctx.restore()
    }
  }
  
  // 玉米加农炮爆炸动画
  drawCannonExplodeAnimation(anim, progress) {
    const scale = 1 + progress * 4 // 从1扩展到5倍（减半）
    const alpha = 1 - progress * progress // 二次衰减，后期更快消失
    
    this.ctx.save()
    this.ctx.translate(anim.x, anim.y)
    
    // 1. 核心爆炸（白色闪光）
    {
      const coreRadius = 5 + progress * 30 // 减半
      const coreAlpha = Math.max(0, 1 - progress * 2)
      
      this.ctx.globalAlpha = coreAlpha * alpha
      const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius)
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      coreGradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.8)')
      coreGradient.addColorStop(0.6, 'rgba(255, 200, 100, 0.6)')
      coreGradient.addColorStop(1, 'rgba(255, 150, 50, 0)')
      
      this.ctx.fillStyle = coreGradient
      this.ctx.beginPath()
      this.ctx.arc(0, 0, coreRadius, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // 2. 火焰环（橙红色）
    {
      const ringScale = scale * 0.8
      const ringAlpha = Math.max(0, 1 - progress * 1.5)
      
      this.ctx.globalAlpha = ringAlpha * alpha
      const flameGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 50 * ringScale) // 减半
      flameGradient.addColorStop(0, 'rgba(255, 100, 0, 0)')
      flameGradient.addColorStop(0.3, 'rgba(255, 150, 0, 0.6)')
      flameGradient.addColorStop(0.5, 'rgba(255, 200, 0, 0.8)')
      flameGradient.addColorStop(0.7, 'rgba(255, 255, 100, 0.5)')
      flameGradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      
      this.ctx.fillStyle = flameGradient
      this.ctx.beginPath()
      this.ctx.arc(0, 0, 50 * ringScale, 0, Math.PI * 2) // 减半
      this.ctx.fill()
    }
    
    // 3. 玉米碎片飞溅效果（金黄色不规则碎片）
    {
      const fragmentAlpha = Math.max(0, 1 - progress * 1.2)
      this.ctx.globalAlpha = fragmentAlpha * alpha
      
      const fragmentCount = 24
      for (let i = 0; i < fragmentCount; i++) {
        const angle = (i / fragmentCount) * Math.PI * 2 + Math.random() * 0.3
        const distance = 10 + progress * 75 // 减半
        const rotation = angle + progress * 10
        
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        
        this.ctx.save()
        this.ctx.translate(x, y)
        this.ctx.rotate(rotation)
        
        // 绘制不规则碎片
        this.ctx.fillStyle = `rgba(251, 191, 36, ${0.8 + Math.random() * 0.2})`
        this.ctx.beginPath()
        this.ctx.moveTo(-4, -1.5) // 减半
        this.ctx.lineTo(2.5, -3)
        this.ctx.lineTo(5, 1)
        this.ctx.lineTo(1.5, 4)
        this.ctx.lineTo(-3.5, 2.5)
        this.ctx.lineTo(-5, -1)
        this.ctx.closePath()
        this.ctx.fill()
        
        // 添加阴影效果
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
        this.ctx.beginPath()
        this.ctx.arc(1, 1.5, 1, 0, Math.PI * 2) // 减半
        this.ctx.fill()
        
        this.ctx.restore()
      }
    }
    
    // 4. 烟雾扩散（深灰色到透明）
    {
      const smokeScale = scale * 1.5
      const smokeAlpha = Math.max(0, 0.3 - progress * 0.3)
      
      this.ctx.globalAlpha = smokeAlpha * alpha
      const smokeGradient = this.ctx.createRadialGradient(0, 0, 25 * scale, 0, 0, 75 * smokeScale) // 减半
      smokeGradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
      smokeGradient.addColorStop(0.5, 'rgba(50, 50, 50, 0.3)')
      smokeGradient.addColorStop(0.8, 'rgba(30, 30, 30, 0.2)')
      smokeGradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
      
      this.ctx.fillStyle = smokeGradient
      this.ctx.beginPath()
      this.ctx.arc(0, 0, 75 * smokeScale, 0, Math.PI * 2) // 减半
      this.ctx.fill()
    }
    
    // 5. 火花粒子（橙色小点）
    {
      const sparkAlpha = Math.max(0, 1 - progress * 2)
      this.ctx.globalAlpha = sparkAlpha * alpha
      
      const sparkCount = 40
      for (let i = 0; i < sparkCount; i++) {
        const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * Math.PI
        const distance = 15 + Math.random() * progress * 100 // 减半
        const size = 1 + Math.random() * 2 // 减半
        
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        
        // 绘制火花
        this.ctx.fillStyle = 'rgba(255, 100, 0, 0.8)'
        this.ctx.beginPath()
        this.ctx.arc(x, y, size, 0, Math.PI * 2)
        this.ctx.fill()
        
        // 火花光晕
        this.ctx.fillStyle = 'rgba(255, 200, 0, 0.3)'
        this.ctx.beginPath()
        this.ctx.arc(x, y, size * 2, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }
    
    // 6. 冲击波环（金色光环，快速扩散）
    {
      const shockwaveRadius = 25 + progress * 100 // 减半
      const shockwaveAlpha = Math.max(0, 1 - progress * 3)
      
      this.ctx.globalAlpha = shockwaveAlpha * 0.5
      this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)'
      this.ctx.lineWidth = 4 * (1 - progress) // 减半
      
      this.ctx.beginPath()
      this.ctx.arc(0, 0, shockwaveRadius, 0, Math.PI * 2)
      this.ctx.stroke()
    }
    
    this.ctx.restore()
  }
}
