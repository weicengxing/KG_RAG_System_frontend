// 闪电链系统
import { plantConfig } from './config.js'

// 闪电链类
export class LightningChain {
  constructor(game) {
    this.game = game
    this.activeChains = [] // 当前活跃的闪电链
  }

  // 发射闪电链
  castLightningChain(sourcePlant, targetZombie) {
    const config = plantConfig.thunderMelon
    const chainId = Date.now() + Math.random()

    // 创建闪电链
    const chain = {
      id: chainId,
      sourcePlant: sourcePlant,
      jumps: [],
      currentJump: 0,
      damage: config.damage,
      jumpDelay: 0.3, // 每次跳跃之间的延迟（秒） - 增加延迟让动画更明显
      delayTimer: 0,
      isComplete: false
    }

    this.activeChains.push(chain)
    
    // 开始第一次跳跃
    this.processLightningJump(chain, targetZombie)
  }

  // 处理闪电跳跃
  processLightningJump(chain, targetZombie) {
    const config = plantConfig.thunderMelon

    // 获取起点（上一次的僵尸，或者是植物本身）
    const sourceX = chain.jumps.length === 0 
      ? chain.sourcePlant.x + chain.sourcePlant.width / 2
      : chain.jumps[chain.jumps.length - 1].zombie.x + chain.jumps[chain.jumps.length - 1].zombie.width / 2
    const sourceY = chain.jumps.length === 0
      ? chain.sourcePlant.y + chain.sourcePlant.height / 2
      : chain.jumps[chain.jumps.length - 1].zombie.y + chain.jumps[chain.jumps.length - 1].zombie.height / 2

    const targetX = targetZombie.x + targetZombie.width / 2
    const targetY = targetZombie.y + targetZombie.height / 2

    // 生成折线闪电轨迹
    const segments = this.generateLightningPath(sourceX, sourceY, targetX, targetY)

    // 记录此次跳跃
    const jump = {
      zombie: targetZombie,
      segments: segments,
      damage: chain.damage,
      segmentIndex: 0,
      segmentProgress: 0,
      isComplete: false,
      appliedDamage: false
    }

    chain.jumps.push(jump)

    // 对僵尸造成伤害
    this.applyLightningDamage(targetZombie, chain.damage, config)

    // 应用减速效果
    this.applySlowEffect(targetZombie, config)

    // 添加闪电视觉效果
    this.addLightningEffect(targetZombie)

    // 播放音效
    this.game.playSound('explode')

    // 检查是否还能继续跳跃
    if (chain.jumps.length < config.maxJumps) {
      // 查找下一个目标
      const nextTarget = this.findNextLightningTarget(targetZombie, config.lightningRange, chain)

      if (nextTarget) {
        // 增加伤害
        chain.damage += config.damageIncrement
        chain.delayTimer = chain.jumpDelay
      } else {
        // 没有更多目标，闪电链完成
        chain.isComplete = true
      }
    } else {
      // 达到最大跳跃次数
      chain.isComplete = true
    }
  }

  // 生成折线闪电路径
  generateLightningPath(startX, startY, endX, endY) {
    const segments = []
    const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2)
    const segmentCount = Math.max(3, Math.floor(distance / 30)) // 每30像素一段
    
    let currentX = startX
    let currentY = startY
    
    for (let i = 0; i < segmentCount; i++) {
      const progress = (i + 1) / segmentCount
      const targetX = startX + (endX - startX) * progress
      const targetY = startY + (endY - startY) * progress
      
      // 添加随机偏移，形成折线效果
      const offsetAmount = 100 * (1 - Math.abs(progress - 0.5) * 2) // 中间偏移较大，大幅度增加折线波动
      const offsetX = (Math.random() - 0.5) * offsetAmount
      const offsetY = (Math.random() - 0.5) * offsetAmount * 0.8
      
      let segmentEndX = targetX + offsetX
      let segmentEndY = targetY + offsetY
      
      segments.push({
        startX: currentX,
        startY: currentY,
        endX: segmentEndX,
        endY: segmentEndY,
        segmentIndex: i
      })
      
      currentX = segmentEndX
      currentY = segmentEndY
    }
    
    return segments
  }

  // 查找下一个闪电目标
  findNextLightningTarget(currentZombie, range, chain) {
    // 获取已命中的僵尸列表
    const hitZombies = new Set(chain.jumps.map(j => j.zombie))
    
    const currentCenterX = currentZombie.x + currentZombie.width / 2
    const currentCenterY = currentZombie.y + currentZombie.height / 2
    
    let nearestTarget = null
    let minDistance = Infinity
    
    // 遍历所有僵尸
    for (const zombie of this.game.zombies) {
      // 跳过已命中的僵尸
      if (hitZombies.has(zombie)) continue
      
      // 跳过已死亡的僵尸
      if (zombie.hp <= 0) continue
      
      const targetCenterX = zombie.x + zombie.width / 2
      const targetCenterY = zombie.y + zombie.height / 2
      
      // 计算距离
      const distance = Math.sqrt(
        (targetCenterX - currentCenterX) ** 2 +
        (targetCenterY - currentCenterY) ** 2
      )
      
      // 检查是否在范围内
      if (distance <= range && distance < minDistance) {
        minDistance = distance
        nearestTarget = zombie
      }
    }
    
    return nearestTarget
  }

  // 应用闪电伤害
  applyLightningDamage(zombie, damage, config) {
    // 先攻击护盾
    if (zombie.shieldHp > 0) {
      zombie.shieldHp -= damage
      if (zombie.shieldHp < 0) {
        zombie.hp += zombie.shieldHp // 多余伤害转到本体
        zombie.shieldHp = 0
      }
    } else {
      zombie.hp -= damage
    }
    
    // 检查僵尸是否死亡
    if (zombie.hp <= 0) {
      const index = this.game.zombies.indexOf(zombie)
      if (index > -1) {
        this.game.zombies.splice(index, 1)
        this.game.score += 10
        this.game.zombiesKilled++
        this.game.playSound('zombieDeath')
        this.game.addDeathAnimation(zombie.x, zombie.y)
      }
    }
  }

  // 应用减速效果
  applySlowEffect(zombie, config) {
    zombie.slowDuration = config.slowDuration
    zombie.slowFactor = config.slowFactor
    
    // 添加减速动画标记
    zombie.isSlowed = true
  }

  // 添加闪电视觉效果
  addLightningEffect(zombie) {
    // 添加闪电缠绕动画
    this.game.animations.push({
      type: 'lightningSurround',
      x: zombie.x + zombie.width / 2,
      y: zombie.y + zombie.height / 2,
      time: 0,
      duration: 0.5
    })
  }

  // 更新所有闪电链
  update(deltaTime) {
    for (let i = this.activeChains.length - 1; i >= 0; i--) {
      const chain = this.activeChains[i]
      
      // ✅ 修复：先更新当前跳跃动画（无论 chain.isComplete 与否）
      const currentJump = chain.jumps[chain.currentJump]
      if (currentJump && !currentJump.isComplete) {
        this.updateJumpAnimation(currentJump, deltaTime)
        if (currentJump.isComplete) {
          chain.currentJump++
        }
      }
      
      // ✅ 修复：如果逻辑已结束，只在动画全结束后移除
      if (chain.isComplete) {
        const allComplete = chain.jumps.every(j => j.isComplete)
        if (allComplete) {
          this.activeChains.splice(i, 1)
        }
        continue
      }
      
      // 处理跳跃延迟
      if (chain.delayTimer > 0) {
        chain.delayTimer -= deltaTime
        
        if (chain.delayTimer <= 0) {
          // 延迟结束，进行下一次跳跃
          const lastJump = chain.jumps[chain.jumps.length - 1]
          const lastZombie = lastJump.zombie
          
          // 查找下一个目标
          const nextTarget = this.findNextLightningTarget(lastZombie, plantConfig.thunderMelon.lightningRange, chain)
          
          if (nextTarget) {
            this.processLightningJump(chain, nextTarget)
          } else {
            chain.isComplete = true
          }
        }
        continue
      }
    }
  }

  // 更新跳跃动画
  updateJumpAnimation(jump, deltaTime) {
    const segments = jump.segments
    const totalSegments = segments.length
    
    // 更新当前段
    if (jump.segmentIndex < segments.length) {
      jump.segmentProgress += deltaTime * 300 // 大幅提高闪电延伸速度
      
      // 如果当前段完成，快速跳过多个段以支持极快速度
      while (jump.segmentProgress >= 1 && jump.segmentIndex < segments.length) {
        jump.segmentProgress -= 1
        jump.segmentIndex++
      }
      
      // 如果所有段都完成了
      if (jump.segmentIndex >= segments.length) {
        jump.isComplete = true
        jump.segmentProgress = 1
      }
    }
  }

  // 获取所有活跃的闪电链（用于渲染）
  getActiveChains() {
    return this.activeChains
  }

  // 清除所有闪电链
  clearAllChains() {
    this.activeChains = []
  }
}

// 闪电渲染辅助类
export class LightningRenderer {
  static drawLightningChain(ctx, chain, game) {
    // 只绘制当前跳跃及之前的已完成跳跃
    for (let jumpIndex = 0; jumpIndex <= chain.currentJump; jumpIndex++) {
      const jump = chain.jumps[jumpIndex]
      if (!jump) continue
      
      const isCurrentJump = jumpIndex === chain.currentJump
      const progress = jump.segmentIndex + jump.segmentProgress
      const totalSegments = jump.segments.length
      
      // 决定绘制多少段
      let segmentsToDraw
      if (isCurrentJump) {
        // 当前跳跃：只绘制已完成的部分（包括当前正在延伸的部分）
        segmentsToDraw = Math.min(
          Math.floor(progress) + 1,
          totalSegments
        )
      } else {
        // 已完成的跳跃：绘制所有段
        segmentsToDraw = totalSegments
      }
      
      for (let i = 0; i < segmentsToDraw; i++) {
        const segment = jump.segments[i]
        const isPartial = isCurrentJump && i === Math.floor(progress)
        
        // 计算实际终点
        let endX = segment.endX
        let endY = segment.endY
        
        if (isPartial) {
          const partialProgress = jump.segmentProgress
          endX = segment.startX + (segment.endX - segment.startX) * partialProgress
          endY = segment.startY + (segment.endY - segment.startY) * partialProgress
        }
        
        this.drawLightningSegment(ctx, segment.startX, segment.startY, endX, endY, i)
      }
    }
  }

  // 绘制单段闪电
  static drawLightningSegment(ctx, startX, startY, endX, endY, segmentIndex) {
    ctx.save()
    
    // 设置发光效果 - 金色光晕
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 15
    
    // 多层闪电效果 - 金色系，更细
    const layers = [
      { width: 1, color: '#ffffff', alpha: 1 },
      { width: 2, color: '#ffd700', alpha: 0.9 },
      { width: 3, color: '#ffaa00', alpha: 0.7 }
    ]
    
    for (const layer of layers) {
      ctx.globalAlpha = layer.alpha
      ctx.strokeStyle = layer.color
      ctx.lineWidth = layer.width
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
    }
    
    ctx.restore()
  }

  // 绘制僵尸周围的闪电缠绕效果
  static drawLightningSurround(ctx, anim, progress) {
    const centerX = anim.x
    const centerY = anim.y
    const alpha = 1 - progress
    
    ctx.save()
    ctx.globalAlpha = alpha
    
    // 绘制多层旋转闪电
    const numLayers = 3
    const segmentsPerLayer = 6
    
    for (let layer = 0; layer < numLayers; layer++) {
      const radius = 30 + layer * 15
      const rotationOffset = layer * (Math.PI / numLayers)
      const layerAlpha = (numLayers - layer) / numLayers * 0.8
      
      ctx.globalAlpha = layerAlpha * alpha
      ctx.strokeStyle = layer === 0 ? '#ffffff' : layer === 1 ? '#00ffff' : '#0099ff'
      ctx.lineWidth = 3 - layer * 0.5
      ctx.shadowColor = '#00d4ff'
      ctx.shadowBlur = 10
      
      for (let i = 0; i < segmentsPerLayer; i++) {
        const startAngle = (i / segmentsPerLayer) * Math.PI * 2 + rotationOffset + progress * 2
        const endAngle = startAngle + (Math.PI / segmentsPerLayer)
        
        ctx.beginPath()
        ctx.moveTo(
          centerX + Math.cos(startAngle) * radius,
          centerY + Math.sin(startAngle) * radius
        )
        
        // 添加随机偏移
        const midAngle = (startAngle + endAngle) / 2
        const offset = 10 * Math.sin(progress * 10 + i)
        
        ctx.quadraticCurveTo(
          centerX + Math.cos(midAngle) * (radius + offset),
          centerY + Math.sin(midAngle) * (radius + offset),
          centerX + Math.cos(endAngle) * radius,
          centerY + Math.sin(endAngle) * radius
        )
        
        ctx.stroke()
      }
    }
    
    // 绘制闪电粒子
    const particleCount = 8
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + progress * 3
      const distance = 20 + Math.sin(progress * 5 + i) * 10
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance
      const size = 3 + Math.sin(progress * 8 + i) * 2
      
      ctx.globalAlpha = 0.8 * alpha
      ctx.fillStyle = '#00ffff'
      ctx.shadowColor = '#00d4ff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }
}
