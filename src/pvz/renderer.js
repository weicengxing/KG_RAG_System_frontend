import { gameConfig, plantConfig, zombieConfig } from './config.js'
import { LightningRenderer } from './lightningSystem.js'

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
        case 'jalapeno':
          bgColor = '#ff4500'
          borderColor = '#dc2626'
          break
        case 'squash':
          bgColor = '#f97316'
          borderColor = '#ea580c'
          break
        case 'potatoMine':
          bgColor = '#eab308'
          borderColor = '#ca8a04'
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
      
      // 如果是多格子植物，绘制格子分割线（辅助视觉）
      if ((plant.gridWidth > 1 || plant.gridHeight > 1) && plant.type !== 'cannon') {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
        this.ctx.lineWidth = 1
        
        // 绘制垂直分割线
        for (let i = 1; i < plant.gridWidth; i++) {
          const x = plant.x + i * (plant.width / plant.gridWidth)
          this.ctx.beginPath()
          this.ctx.moveTo(x, plant.y)
          this.ctx.lineTo(x, plant.y + plant.height)
          this.ctx.stroke()
        }
        
        // 绘制水平分割线
        for (let i = 1; i < plant.gridHeight; i++) {
          const y = plant.y + i * (plant.height / plant.gridHeight)
          this.ctx.beginPath()
          this.ctx.moveTo(plant.x, y)
          this.ctx.lineTo(plant.x + plant.width, y)
          this.ctx.stroke()
        }
      }
      
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
      
      // 如果是土豆地雷且在沉睡状态，添加视觉效果
      if (plant.type === 'potatoMine' && plant.isSleeping) {
        this.ctx.globalAlpha = 0.6 // 半透明效果
        
        // 绘制沉睡 Zzz 动画
        const sleepTime = Date.now() / 1000
        const zOffset = Math.sin(sleepTime * 2) * 5
        this.ctx.font = '24px Arial'
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillText('Z', plant.x + plant.width / 2 - 15, plant.y - 10 + zOffset)
        this.ctx.fillText('z', plant.x + plant.width / 2, plant.y - 20 + zOffset)
        this.ctx.fillText('z', plant.x + plant.width / 2 + 15, plant.y - 10 + zOffset)
        
        // 显示沉睡倒计时
        this.ctx.font = '14px Arial'
        this.ctx.fillStyle = '#ffffff'
        this.ctx.fillText(`沉睡中 ${Math.ceil(plant.sleepTimer)}s`, plant.x + plant.width / 2, plant.y + plant.height + 20)
        
        // 恢复透明度
        this.ctx.globalAlpha = 1
      }
      
      // 如果是土豆地雷且已苏醒（isReady=true），添加闪烁效果提示
      if (plant.type === 'potatoMine' && plant.isReady) {
        const blinkAlpha = 0.6 + Math.sin(Date.now() / 200) * 0.4
        
        this.ctx.save()
        this.ctx.fillStyle = `rgba(251, 191, 36, ${blinkAlpha})`
        this.ctx.strokeStyle = `rgba(251, 191, 36, ${blinkAlpha})`
        this.ctx.lineWidth = 3
        this.ctx.strokeRect(plant.x - 2, plant.y - 2, plant.width + 4, plant.height + 4)
        
        // 显示"准备就绪"
        this.ctx.font = '14px Arial'
        this.ctx.fillStyle = `rgba(251, 191, 36, ${blinkAlpha})`
        this.ctx.textAlign = 'center'
        this.ctx.fillText('准备就绪!', plant.x + plant.width / 2, plant.y + plant.height + 20)
        this.ctx.restore()
      }
      
      // 绘制emoji
      this.ctx.font = '48px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      
      // 如果是冒火树桩，绘制特殊的火焰效果
      if (plant.type === 'fireStump') {
        // 绘制树桩主体（棕色圆形）
        this.ctx.fillStyle = '#8b4513'
        this.ctx.beginPath()
        this.ctx.arc(plant.x + plant.width / 2, plant.y + plant.height / 2 + 10, 35, 0, Math.PI * 2)
        this.ctx.fill()
        
        this.ctx.strokeStyle = '#654321'
        this.ctx.lineWidth = 3
        this.ctx.stroke()
        
        // 绘制火焰动画
        const time = Date.now() / 1000
        const flameOffset = Math.sin(time * 3) * 5
        
        // 绘制多层火焰
        for (let i = 0; i < 3; i++) {
          this.ctx.save()
          this.ctx.translate(plant.x + plant.width / 2, plant.y + plant.height / 2 - 20 + flameOffset)
          
          const flameHeight = 20 + i * 10
          const alpha = (3 - i) / 3 * 0.7
          
          // 火焰渐变
          const flameGradient = this.ctx.createRadialGradient(
            0, -flameHeight / 2, 0,
            0, 0, flameHeight
          )
          flameGradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`)
          flameGradient.addColorStop(0.5, `rgba(255, 165, 0, ${alpha})`)
          flameGradient.addColorStop(1, `rgba(255, 0, 0, ${alpha})`)
          
          this.ctx.fillStyle = flameGradient
          this.ctx.beginPath()
          this.ctx.moveTo(-15 - i * 5, 0)
          this.ctx.quadraticCurveTo(-10 - i * 3, -flameHeight * 0.5, -5 - i, -flameHeight)
          this.ctx.quadraticCurveTo(0, -flameHeight * 0.5, 5 + i, -flameHeight)
          this.ctx.quadraticCurveTo(10 + i * 3, -flameHeight * 0.5, 15 + i * 5, 0)
          this.ctx.fill()
          
          this.ctx.restore()
        }
        
        // 绘制小火星粒子
        for (let j = 0; j < 5; j++) {
          const sparkAngle = (j / 5) * Math.PI * 2 + time * 2
          const sparkDistance = 25 + Math.sin(time * 5 + j) * 10
          const sparkX = plant.x + plant.width / 2 + Math.cos(sparkAngle) * sparkDistance
          const sparkY = plant.y + plant.height / 2 - 30 + Math.sin(sparkAngle) * sparkDistance * 0.3
          const sparkSize = 3 + Math.sin(time * 3 + j) * 2
          
          this.ctx.fillStyle = `rgba(255, 200, 0, ${0.6 + Math.sin(time * 4 + j) * 0.4})`
          this.ctx.beginPath()
          this.ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2)
          this.ctx.fill()
        }
      } else {
        this.ctx.fillText(config.icon, plant.x + plant.width / 2, plant.y + plant.height / 2)
      }
      
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
      
      // 如果是火爆辣椒，显示倒计时
      if (plant.type === 'jalapeno' && plant.explodeTimer > 0) {
        const explodeConfig = plantConfig.jalapeno
        const timeLeft = explodeConfig.explodeDelay - plant.explodeTimer
        const progress = timeLeft / explodeConfig.explodeDelay
        
        // 绘制倒计时进度条
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
        this.ctx.fillRect(plant.x + 5, plant.y + plant.height - 8, plant.width - 10, 4)
        
        this.ctx.fillStyle = '#ff4500'
        this.ctx.fillRect(plant.x + 5, plant.y + plant.height - 8, (plant.width - 10) * progress, 4)
      }
    }
  }
  
  // 绘制被魅惑僵尸的紫色光环
  drawCharmedAura(zombie) {
    const centerX = zombie.x + zombie.width / 2
    const centerY = zombie.y + zombie.height / 2
    const time = Date.now() / 1000
    
    this.ctx.save()
    
    // 绘制多层紫色光环
    for (let i = 0; i < 3; i++) {
      const baseRadius = 50 + i * 15
      const pulse = Math.sin(time * 3 + i) * 10
      const radius = baseRadius + pulse
      const alpha = 0.3 - i * 0.1
      
      // 创建径向渐变
      const gradient = this.ctx.createRadialGradient(
        centerX, centerY, radius * 0.5,
        centerX, centerY, radius
      )
      gradient.addColorStop(0, `rgba(168, 85, 247, 0)`)
      gradient.addColorStop(0.5, `rgba(168, 85, 247, ${alpha})`)
      gradient.addColorStop(1, `rgba(147, 51, 234, 0)`)
      
      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // 绘制旋转的紫色粒子
    const particleCount = 8
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + time * 2
      const distance = 40 + Math.sin(time * 4 + i) * 10
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance
      const size = 3 + Math.sin(time * 3 + i) * 2
      
      // 粒子渐变
      const particleGradient = this.ctx.createRadialGradient(x, y, 0, x, y, size)
      particleGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      particleGradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.8)')
      particleGradient.addColorStop(1, 'rgba(147, 51, 234, 0)')
      
      this.ctx.fillStyle = particleGradient
      this.ctx.beginPath()
      this.ctx.arc(x, y, size, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // 绘制向上的紫色迷雾
    for (let j = 0; j < 3; j++) {
      const mistX = centerX + (Math.random() - 0.5) * 40
      const mistY = centerY - 20 - j * 15
      const mistSize = 5 + Math.random() * 10
      const mistAlpha = 0.3 + Math.sin(time * 5 + j) * 0.2
      
      this.ctx.fillStyle = `rgba(168, 85, 247, ${mistAlpha})`
      this.ctx.beginPath()
      this.ctx.arc(mistX, mistY + time * 10, mistSize, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    this.ctx.restore()
  }
  
  // 绘制僵尸
  drawZombies(zombies) {
    for (const zombie of zombies) {
      const config = zombieConfig[zombie.type]
      
      // 如果被魅惑，绘制紫色光环动画
      if (zombie.isCharmed) {
        this.drawCharmedAura(zombie)
      }
      
      // 如果有护盾，显示护盾效果
      if (zombie.shieldHp > 0) {
        // 绘制护盾边框
        this.ctx.strokeStyle = '#fbbf24'
        this.ctx.lineWidth = 4
        this.ctx.strokeRect(zombie.x - 2, zombie.y - 2, zombie.width + 4, zombie.height + 4)
      }
      
      // 绘制背景（被魅惑的僵尸用紫色）
      this.ctx.fillStyle = zombie.isCharmed ? '#a855f7' : '#f87171'
      this.ctx.fillRect(zombie.x, zombie.y, zombie.width, zombie.height)
      
      // 绘制边框（被魅惑的僵尸用紫色边框）
      this.ctx.strokeStyle = zombie.isCharmed ? '#9333ea' : '#ef4444'
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
  
  // 绘制粒子
  drawParticles(particles) {
    for (const particle of particles) {
      if (particle.type === 'fire') {
        // 火焰粒子
        const lifeRatio = particle.lifeTime / particle.maxLifeTime
        const alpha = lifeRatio
        const size = 3 + lifeRatio * 4
        
        // 绘制火焰粒子（颜色渐变）
        const gradient = this.ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, size
        )
        gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`)
        gradient.addColorStop(0.5, `rgba(255, 165, 0, ${alpha * 0.8})`)
        gradient.addColorStop(1, `rgba(255, 0, 0, ${alpha * 0.4})`)
        
        this.ctx.fillStyle = gradient
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2)
        this.ctx.fill()
        
        // 添加发光效果
        this.ctx.shadowColor = '#ff4500'
        this.ctx.shadowBlur = 5
        this.ctx.fillStyle = `rgba(255, 69, 0, ${alpha * 0.3})`
        this.ctx.beginPath()
        this.ctx.arc(particle.x, particle.y, size * 1.5, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.shadowBlur = 0
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
      // 火焰豌豆
      else if (projectile.type === 'firePea') {
        // 绘制火焰尾迹
        const trailCount = 3
        for (let i = 0; i < trailCount; i++) {
          const trailAlpha = (trailCount - i) / trailCount * 0.4
          const trailSize = 8 - i * 2
          this.ctx.fillStyle = `rgba(255, 100, 0, ${trailAlpha})`
          this.ctx.beginPath()
          this.ctx.arc(projectile.x - i * 10, projectile.y, trailSize, 0, Math.PI * 2)
          this.ctx.fill()
        }
        
        // 绘制火焰豌豆主体（颜色渐变）
        const gradient = this.ctx.createRadialGradient(
          projectile.x - 2, projectile.y - 2, 0,
          projectile.x, projectile.y, 10
        )
        gradient.addColorStop(0, '#ffff00') // 黄色核心
        gradient.addColorStop(0.5, '#ff6b00') // 橙红色
        gradient.addColorStop(1, '#ff0000') // 红色边缘
        
        this.ctx.fillStyle = gradient
        this.ctx.beginPath()
        this.ctx.arc(projectile.x, projectile.y, 8, 0, Math.PI * 2)
        this.ctx.fill()
        
        // 绘制边框
        this.ctx.strokeStyle = '#ff4500'
        this.ctx.lineWidth = 2
        this.ctx.stroke()
        
        // 添加发光效果
        this.ctx.shadowColor = '#ff4500'
        this.ctx.shadowBlur = 10
        this.ctx.fillStyle = 'rgba(255, 69, 0, 0.3)'
        this.ctx.beginPath()
        this.ctx.arc(projectile.x, projectile.y, 12, 0, Math.PI * 2)
        this.ctx.fill()
        this.ctx.shadowBlur = 0
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
  
  // 火爆辣椒爆炸动画（整行波浪形火焰）
  drawJalapenoExplodeAnimation(anim, progress) {
    const rowY = anim.y
    const alpha = 1 - progress
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    
    // 获取实际画布宽度（9列 × 104像素 = 936像素）
    const screenWidth = gameConfig.gridCols * gameConfig.cellWidth
    const fireHeight = 100 + progress * 50
    const time = Date.now() / 1000 // 动态时间
    
    // 1. 绘制多层波浪形火焰背景
    const waveLayers = [
      { amplitude: 20, frequency: 0.05, speed: 8, offset: 0, color: 'rgba(255, 100, 0, 0.6)' },
      { amplitude: 25, frequency: 0.07, speed: 6, offset: 2, color: 'rgba(255, 140, 0, 0.7)' },
      { amplitude: 30, frequency: 0.04, speed: 10, offset: 4, color: 'rgba(255, 180, 0, 0.5)' },
      { amplitude: 22, frequency: 0.06, speed: 7, offset: 6, color: 'rgba(255, 60, 0, 0.5)' }
    ]
    
    for (const layer of waveLayers) {
      this.ctx.globalAlpha = alpha * 0.8
      this.ctx.fillStyle = layer.color
      
      this.ctx.beginPath()
      this.ctx.moveTo(0, rowY + fireHeight / 2)
      
      // 绘制波浪顶部（参差不齐的效果）
      for (let x = 0; x <= screenWidth; x += 5) {
        const waveY = rowY - fireHeight / 2 + 
                      Math.sin(x * layer.frequency + time * layer.speed + layer.offset) * layer.amplitude +
                      Math.sin(x * layer.frequency * 2 + time * layer.speed * 1.5) * (layer.amplitude * 0.3)
        this.ctx.lineTo(x, waveY)
      }
      
      this.ctx.lineTo(screenWidth, rowY + fireHeight / 2)
      this.ctx.closePath()
      this.ctx.fill()
    }
    
    // 2. 绘制波浪形火焰波纹（参差不齐的效果）
    for (let i = 0; i < 4; i++) {
      const waveAlpha = Math.max(0, 0.7 - progress * (0.5 + i * 0.15))
      this.ctx.globalAlpha = waveAlpha
      this.ctx.strokeStyle = i === 0 ? '#ffff00' : i === 1 ? '#ff8c00' : i === 2 ? '#ff4500' : '#ff0000'
      this.ctx.lineWidth = 3 - i * 0.5
      
      // 绘制波浪形波纹
      this.ctx.beginPath()
      
      const baseY = rowY - fireHeight / 3 + (i * fireHeight / 6)
      for (let x = 0; x <= screenWidth; x += 8) {
        const waveY = baseY + 
                      Math.sin(x * 0.03 + time * 12 + i) * (15 + i * 5) +
                      Math.sin(x * 0.06 + time * 8 + i * 2) * (8 + i * 2)
        
        if (x === 0) {
          this.ctx.moveTo(x, waveY)
        } else {
          this.ctx.lineTo(x, waveY)
        }
      }
      this.ctx.stroke()
    }
    
    // 3. 绘制上升火焰粒子（跟随波浪分布）
    const particleCount = 60
    for (let i = 0; i < particleCount; i++) {
      // 粒子均匀分布在整个屏幕宽度上
      const x = Math.random() * screenWidth
      const particleProgress = Math.min(1, progress * 2 * (0.5 + Math.random() * 0.5))
      
      // 计算粒子的波浪偏移
      const waveOffset = Math.sin(x * 0.05 + time * 10) * 10 + Math.sin(x * 0.1 + time * 15) * 5
      const y = rowY + waveOffset + (Math.random() - 0.5) * fireHeight - particleProgress * 100
      const size = 2 + Math.random() * 6 * particleProgress
      const particleAlpha = Math.max(0, 1 - particleProgress) * 0.9
      
      this.ctx.globalAlpha = particleAlpha
      
      // 绘制火焰粒子
      const particleGradient = this.ctx.createRadialGradient(x, y, 0, x, y, size)
      particleGradient.addColorStop(0, 'rgba(255, 255, 0, 1)')
      particleGradient.addColorStop(0.4, 'rgba(255, 165, 0, 0.9)')
      particleGradient.addColorStop(0.7, 'rgba(255, 69, 0, 0.6)')
      particleGradient.addColorStop(1, 'rgba(255, 0, 0, 0)')
      
      this.ctx.fillStyle = particleGradient
      this.ctx.beginPath()
      this.ctx.arc(x, y, size, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // 4. 绘制中心爆炸
    const centerScale = progress * 2
    const centerAlpha = Math.max(0, 1 - progress * 1.5)
    
    this.ctx.globalAlpha = centerAlpha
    
    // 火焰中心
    const centerGradient = this.ctx.createRadialGradient(anim.x, rowY, 0, anim.x, rowY, 50 * centerScale)
    centerGradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    centerGradient.addColorStop(0.3, 'rgba(255, 255, 0, 0.8)')
    centerGradient.addColorStop(0.6, 'rgba(255, 165, 0, 0.5)')
    centerGradient.addColorStop(1, 'rgba(255, 69, 0, 0)')
    
    this.ctx.fillStyle = centerGradient
    this.ctx.beginPath()
    this.ctx.arc(anim.x, rowY, 50 * centerScale, 0, Math.PI * 2)
    this.ctx.fill()
    
    // 5. 绘制辣椒图标
    if (progress < 0.3) {
      this.ctx.globalAlpha = (1 - progress / 0.3) * alpha
      this.ctx.font = '48px Arial'
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText('🌶️', anim.x, rowY)
    }
    
    // 6. 绘制波浪形冲击波（从屏幕边缘向内收缩）
    const shockwaveAlpha = Math.max(0, 1 - progress * 2)
    const shockwaveOffset = screenWidth * 0.1 * (1 - progress)
    
    this.ctx.globalAlpha = shockwaveAlpha * 0.5
    this.ctx.strokeStyle = '#ff4500'
    this.ctx.lineWidth = 4 * (1 - progress)
    
    // 左侧波浪形冲击波
    this.ctx.beginPath()
    for (let y = rowY - 40; y <= rowY + 40; y += 5) {
      const x = shockwaveOffset + Math.sin(y * 0.1 + time * 15) * 10
      if (y === rowY - 40) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }
    this.ctx.stroke()
    
    // 右侧波浪形冲击波
    this.ctx.beginPath()
    for (let y = rowY - 40; y <= rowY + 40; y += 5) {
      const x = screenWidth - shockwaveOffset + Math.sin(y * 0.1 + time * 15 + Math.PI) * 10
      if (y === rowY - 40) {
        this.ctx.moveTo(x, y)
      } else {
        this.ctx.lineTo(x, y)
      }
    }
    this.ctx.stroke()
    
    this.ctx.restore()
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
        case 'jalapenoExplode':
          this.drawJalapenoExplodeAnimation(anim, progress)
          break
        case 'squashHit':
          this.drawSquashHitAnimation(anim, progress)
          break
      case 'potatoMineExplode':
          this.drawPotatoMineExplodeAnimation(anim, progress)
          break
        case 'lightningSurround':
          LightningRenderer.drawLightningSurround(this.ctx, anim, progress)
          break
      }
    }
  }
  
  // 绘制闪电链
  drawLightningChains(chains) {
    // 调试：强制重置 Canvas 状态
    this.ctx.globalAlpha = 1
    this.ctx.globalCompositeOperation = 'source-over'
    
    for (const chain of chains) {
      LightningRenderer.drawLightningChain(this.ctx, chain, this)
    }
  }
  
  // 土豆地雷爆炸动画
  
  // 土豆地雷爆炸动画
  drawPotatoMineExplodeAnimation(anim, progress) {
    const alpha = 1 - progress
    const scale = 0.5 + progress * 3
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(anim.x, anim.y)
    this.ctx.scale(scale, scale)
    
    // 绘制爆炸圆圈
    const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, 60)
    gradient.addColorStop(0, 'rgba(251, 191, 36, 0.8)')  // 金黄色中心
    gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.6)')  // 金橙色
    gradient.addColorStop(1, 'rgba(202, 138, 4, 0)')  // 渐变到透明
    
    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 60, 0, Math.PI * 2)
    this.ctx.fill()
    
    // 绘制爆炸文字
    this.ctx.font = 'bold 36px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillStyle = '#fbbf24'
    this.ctx.fillText('💥', 0, 0)
    
    // 绘制冲击波
    this.ctx.strokeStyle = '#fbbf24'
    this.ctx.lineWidth = 3 * (1 - progress)
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 40 * progress, 0, Math.PI * 2)
    this.ctx.stroke()
    
    // 绘制粒子效果
    const particleCount = 8
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const distance = 30 + progress * 50
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance
      
      this.ctx.fillStyle = '#fbbf24'
      this.ctx.beginPath()
      this.ctx.arc(x, y, 6, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    this.ctx.restore()
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
  
  // 倭瓜压击动画
  drawSquashHitAnimation(anim, progress) {
    const alpha = 1 - progress
    const scale = 1 + progress * 0.5
    
    this.ctx.save()
    this.ctx.globalAlpha = alpha
    this.ctx.translate(anim.x, anim.y)
    this.ctx.scale(scale, scale)
    
    // 绘制倭瓜图标
    this.ctx.font = '48px Arial'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'
    this.ctx.fillText('🎃', 0, 0)
    
    // 绘制冲击波
    this.ctx.strokeStyle = '#f97316'
    this.ctx.lineWidth = 3
    this.ctx.beginPath()
    this.ctx.arc(0, 0, 30 * progress, 0, Math.PI * 2)
    this.ctx.stroke()
    
    // 绘制粒子效果
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const distance = 40 + progress * 30
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance
      
      this.ctx.fillStyle = '#fbbf24'
      this.ctx.beginPath()
      this.ctx.arc(x, y, 5, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    this.ctx.restore()
  }
  
  // 玉米加农炮爆炸动画（强烈破坏效果）
  drawCannonExplodeAnimation(anim, progress) {
    const scale = 1 + progress * 6 // 扩展到7倍
    const alpha = 1 - progress * 0.8 // 线性衰减，后期仍保持可见性
    
    this.ctx.save()
    this.ctx.translate(anim.x, anim.y)
    
    // 0. 瞬间白屏闪光效果（爆炸前0.2秒）
    {
      const flashAlpha = Math.max(0, 1 - progress * 5) // 前0.2秒（progress=0-0.2）完全显示
      this.ctx.globalAlpha = flashAlpha
      
      // 整个屏幕覆盖白色闪光
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      this.ctx.fillRect(-this.ctx.canvas ? -this.ctx.canvas.width / 2 : -500, 
                       -this.ctx.canvas ? -this.ctx.canvas.height / 2 : -400, 
                       this.ctx.canvas ? this.ctx.canvas.width : 1000, 
                       this.ctx.canvas ? this.ctx.canvas.height : 800)
    }
    
    // 1. 超强核心爆炸（刺眼白光）
    {
      const coreRadius = 10 + progress * 80
      const coreAlpha = Math.max(0, 1 - progress * 2)
      
      this.ctx.globalAlpha = coreAlpha * alpha
      const coreGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius)
      coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      coreGradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)')
      coreGradient.addColorStop(0.4, 'rgba(255, 255, 200, 0.8)')
      coreGradient.addColorStop(0.6, 'rgba(255, 255, 100, 0.5)')
      coreGradient.addColorStop(0.8, 'rgba(255, 200, 50, 0.3)')
      coreGradient.addColorStop(1, 'rgba(255, 150, 0, 0)')
      
      this.ctx.fillStyle = coreGradient
      this.ctx.beginPath()
      this.ctx.arc(0, 0, coreRadius, 0, Math.PI * 2)
      this.ctx.fill()
    }
    
    // 2. 多层爆炸波（4层：白色→黄色→橙色→红色）
    {
      const waveLayers = [
        { color: 'rgba(255, 255, 255, ', speed: 1.0, startDelay: 0 },
        { color: 'rgba(255, 255, 100, ', speed: 0.8, startDelay: 0.1 },
        { color: 'rgba(255, 200, 50, ', speed: 0.6, startDelay: 0.15 },
        { color: 'rgba(255, 100, 0, ', speed: 0.4, startDelay: 0.2 }
      ]
      
      for (const layer of waveLayers) {
        const layerProgress = Math.min(1, Math.max(0, (progress - layer.startDelay) / (1 - layer.startDelay)))
        if (layerProgress <= 0) continue
        
        const waveRadius = 30 * scale * layer.speed * layerProgress
        const waveAlpha = Math.max(0, 0.9 - layerProgress * 0.9)
        
        this.ctx.globalAlpha = waveAlpha * alpha
        const waveGradient = this.ctx.createRadialGradient(0, 0, waveRadius * 0.7, 0, 0, waveRadius)
        waveGradient.addColorStop(0, `${layer.color} 0)`)
        waveGradient.addColorStop(0.5, `${layer.color} 0.6)`)
        waveGradient.addColorStop(0.8, `${layer.color} 0.8)`)
        waveGradient.addColorStop(1, `${layer.color} 0)`)
        
        this.ctx.fillStyle = waveGradient
        this.ctx.beginPath()
        this.ctx.arc(0, 0, waveRadius, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }
    
    // 3. 螺旋形火焰喷射
    {
      const spiralAlpha = Math.max(0, 1 - progress * 1.5)
      this.ctx.globalAlpha = spiralAlpha * alpha
      
      const spiralArms = 6
      const spiralTurns = 3
      
      for (let arm = 0; arm < spiralArms; arm++) {
        const baseAngle = (arm / spiralArms) * Math.PI * 2 + Date.now() / 100
        
        this.ctx.beginPath()
        this.ctx.strokeStyle = `rgba(255, ${150 + Math.random() * 50}, 0, ${0.6 + Math.random() * 0.4})`
        this.ctx.lineWidth = 8 + Math.random() * 4
        
        const spiralSegments = 40
        for (let i = 0; i < spiralSegments; i++) {
          const t = i / spiralSegments
          const radius = 20 + t * 100 * scale
          const angle = baseAngle + t * spiralTurns * Math.PI * 2
          
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          
          if (i === 0) {
            this.ctx.moveTo(x, y)
          } else {
            this.ctx.lineTo(x, y)
          }
        }
        this.ctx.stroke()
      }
    }
    
    // 4. 大量飞溅粒子（80+个）
    {
      const particleAlpha = Math.max(0, 1 - progress * 1.2)
      this.ctx.globalAlpha = particleAlpha * alpha
      
      const particleCount = 80
      const time = Date.now() / 1000
      
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.5 + time * 2
        const distance = 15 + progress * 150 * (0.5 + Math.random() * 0.8)
        const rotation = angle + progress * 15 + Math.random() * Math.PI
        const size = 3 + Math.random() * 4
        
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        
        this.ctx.save()
        this.ctx.translate(x, y)
        this.ctx.rotate(rotation)
        
        // 不同类型的粒子
        const particleType = i % 4
        if (particleType === 0) {
          // 玉米碎片
          this.ctx.fillStyle = `rgba(251, 191, 36, ${0.8 + Math.random() * 0.2})`
          this.ctx.beginPath()
          this.ctx.moveTo(-size/2, -size/4)
          this.ctx.lineTo(size/3, -size)
          this.ctx.lineTo(size, size/4)
          this.ctx.lineTo(size/4, size)
          this.ctx.lineTo(-size/3, size/2)
          this.ctx.lineTo(-size, -size/4)
          this.ctx.closePath()
          this.ctx.fill()
        } else if (particleType === 1) {
          // 火焰粒子
          const flameGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, size)
          flameGradient.addColorStop(0, 'rgba(255, 255, 0, 0.9)')
          flameGradient.addColorStop(0.5, 'rgba(255, 150, 0, 0.7)')
          flameGradient.addColorStop(1, 'rgba(255, 50, 0, 0)')
          this.ctx.fillStyle = flameGradient
          this.ctx.beginPath()
          this.ctx.arc(0, 0, size, 0, Math.PI * 2)
          this.ctx.fill()
        } else if (particleType === 2) {
          // 爆炸碎片
          this.ctx.fillStyle = `rgba(100, 50, 0, ${0.7 + Math.random() * 0.3})`
          this.ctx.fillRect(-size/2, -size/2, size, size)
        } else {
          // 火星
          this.ctx.fillStyle = `rgba(255, 200, 100, ${0.9 + Math.random() * 0.1})`
          this.ctx.beginPath()
          this.ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2)
          this.ctx.fill()
          
          // 火星光晕
          this.ctx.fillStyle = 'rgba(255, 100, 0, 0.4)'
          this.ctx.beginPath()
          this.ctx.arc(0, 0, size, 0, Math.PI * 2)
          this.ctx.fill()
        }
        
        this.ctx.restore()
      }
    }
    
    // 5. 强烈地面裂纹（放射状）
    {
      const crackAlpha = Math.max(0, 0.8 - progress)
      this.ctx.globalAlpha = crackAlpha * alpha
      
      const crackCount = 12
      for (let i = 0; i < crackCount; i++) {
        const angle = (i / crackCount) * Math.PI * 2
        const crackLength = 40 + progress * 120 * (0.5 + Math.random() * 0.5)
        
        this.ctx.beginPath()
        this.ctx.strokeStyle = 'rgba(30, 20, 10, 0.7)'
        this.ctx.lineWidth = 3 + Math.random() * 2
        
        // 主裂纹
        this.ctx.moveTo(0, 0)
        let lastX = 0, lastY = 0
        for (let j = 0; j < 5; j++) {
          const t = (j + 1) / 5
          const x = Math.cos(angle) * crackLength * t + (Math.random() - 0.5) * 10
          const y = Math.sin(angle) * crackLength * t + (Math.random() - 0.5) * 10
          this.ctx.lineTo(x, y)
          lastX = x
          lastY = y
        }
        this.ctx.stroke()
        
        // 分支裂纹
        if (Math.random() > 0.5) {
          const branchAngle = angle + (Math.random() - 0.5) * Math.PI * 0.5
          const branchLength = crackLength * 0.4 * Math.random()
          
          this.ctx.beginPath()
          this.ctx.strokeStyle = 'rgba(30, 20, 10, 0.5)'
          this.ctx.lineWidth = 2
          this.ctx.moveTo(lastX, lastY)
          for (let j = 0; j < 3; j++) {
            const t = (j + 1) / 3
            const bx = lastX + Math.cos(branchAngle) * branchLength * t + (Math.random() - 0.5) * 5
            const by = lastY + Math.sin(branchAngle) * branchLength * t + (Math.random() - 0.5) * 5
            this.ctx.lineTo(bx, by)
          }
          this.ctx.stroke()
        }
      }
    }
    
    // 6. 屏幕震动效果（通过偏移实现）
    {
      const shakeIntensity = Math.max(0, 15 * (1 - progress * 3))
      if (shakeIntensity > 0) {
        const offsetX = (Math.random() - 0.5) * shakeIntensity
        const offsetY = (Math.random() - 0.5) * shakeIntensity
        this.ctx.translate(offsetX, offsetY)
      }
    }
    
    // 7. 持续余烬效果
    {
      const emberAlpha = Math.max(0, 1 - progress * 1.5)
      this.ctx.globalAlpha = emberAlpha * alpha
      
      const emberCount = 15
      const time = Date.now() / 1000
      
      for (let i = 0; i < emberCount; i++) {
        const angle = (i / emberCount) * Math.PI * 2 + time * 0.5
        const distance = 30 + Math.sin(time + i) * 10 + progress * 60
        const emberSize = 4 + Math.random() * 4
        
        const x = Math.cos(angle) * distance
        const y = Math.sin(angle) * distance
        
        // 绘制余烬
        this.ctx.fillStyle = `rgba(255, ${100 + Math.floor(Math.random() * 100)}, 0, ${0.6 + Math.random() * 0.4})`
        this.ctx.beginPath()
        this.ctx.arc(x, y, emberSize, 0, Math.PI * 2)
        this.ctx.fill()
        
        // 余烬光晕
        this.ctx.fillStyle = 'rgba(255, 150, 50, 0.3)'
        this.ctx.beginPath()
        this.ctx.arc(x, y, emberSize * 1.5, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }
    
    // 8. 增强冲击波（3层）
    {
      const shockwaveLayers = [
        { speed: 1.0, color: 'rgba(255, 255, 255, ', delay: 0 },
        { speed: 0.8, color: 'rgba(255, 215, 0, ', delay: 0.05 },
        { speed: 0.6, color: 'rgba(255, 150, 0, ', delay: 0.1 }
      ]
      
      for (const layer of shockwaveLayers) {
        const layerProgress = Math.min(1, Math.max(0, (progress - layer.delay) / (1 - layer.delay)))
        if (layerProgress <= 0) continue
        
        const shockwaveRadius = 40 + progress * 150 * layer.speed
        const shockwaveAlpha = Math.max(0, 1 - layerProgress * 0.8)
        
        this.ctx.globalAlpha = shockwaveAlpha * 0.7
        this.ctx.strokeStyle = `${layer.color} ${0.6 + Math.random() * 0.4})`
        this.ctx.lineWidth = 6 * (1 - layerProgress * 0.5)
        
        this.ctx.beginPath()
        this.ctx.arc(0, 0, shockwaveRadius, 0, Math.PI * 2)
        this.ctx.stroke()
        
        // 冲击波发光效果
        this.ctx.strokeStyle = `${layer.color} 0.3)`
        this.ctx.lineWidth = 12
        this.ctx.stroke()
      }
    }
    
    // 9. 额外的爆炸文字
    {
      const textAlpha = Math.max(0, 0.9 - progress * 3)
      if (textAlpha > 0) {
        this.ctx.globalAlpha = textAlpha * alpha
        this.ctx.font = 'bold 48px Arial'
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillStyle = '#ff6600'
        this.ctx.strokeStyle = '#ffff00'
        this.ctx.lineWidth = 3
        this.ctx.strokeText('💥 BOOM!', 0, 0)
        this.ctx.fillText('💥 BOOM!', 0, 0)
      }
    }
    
    this.ctx.restore()
  }
}
