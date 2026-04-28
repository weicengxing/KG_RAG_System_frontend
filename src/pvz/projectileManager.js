import { gameConfig, plantConfig, zombieConfig } from './config.js'

// 粒子系统 - 用于火焰豌豆的粒子效果
class ParticleSystem {
  constructor() {
    this.particles = []
    this.maxParticles = 80   // hard cap; oldest are dropped on overflow
  }

  // 发射火焰粒子
  emitFireParticles(x, y, count = 5) {
    // Skip emission entirely if we're at cap — newest are most relevant only
    // when accompanied by old ones; once full, take a beat.
    if (this.particles.length >= this.maxParticles) return
    const room = this.maxParticles - this.particles.length
    const actual = Math.min(count, room)
    for (let i = 0; i < actual; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 50 + 30
      const lifeTime = Math.random() * 0.3 + 0.2

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifeTime: lifeTime,
        maxLifeTime: lifeTime,
        type: 'fire'
      })
    }
  }

  // 更新粒子
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]
      
      particle.x += particle.vx * deltaTime
      particle.y += particle.vy * deltaTime
      particle.lifeTime -= deltaTime
      
      if (particle.lifeTime <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  // 获取所有粒子
  getParticles() {
    return this.particles
  }

  // 清空粒子
  clear() {
    this.particles = []
  }
}

// 子弹管理器
export class ProjectileManager {
  constructor(engine) {
    this.engine = engine
    this.projectiles = []
    this.weaponStaffs = []
    this.particleSystem = new ParticleSystem()
  }

  // 更新所有子弹
  updateProjectiles(deltaTime) {
    // 更新粒子
    this.particleSystem.update(deltaTime)
    
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i]
      
      // 如果是龙葵草刀片，使用螺旋运动
      if (projectile.type === 'dragonBlade') {
        // 更新旋转角度
        projectile.angle += projectile.rotationSpeed * deltaTime
        
        // 更新生命周期
        projectile.lifeTime -= deltaTime
        projectile.damageTimer -= deltaTime
        
        // 阶段1：接近僵尸（三角包抄）
        if (projectile.phase === 'approaching') {
          if (projectile.targetZombie) {
            // 向量追踪目标
            const targetCenter = {
              x: projectile.targetZombie.x + projectile.targetZombie.width / 2,
              y: projectile.targetZombie.y + projectile.targetZombie.height / 2
            }
            
            const dx = targetCenter.x - projectile.x
            const dy = targetCenter.y - projectile.y
            const dist = Math.hypot(dx, dy) || 1
            
            const step = projectile.speed * deltaTime * 60
            
            // 三角包抄：距离目标 > 150px 时添加侧向偏移
            const biasDist = 150
            if (dist > biasDist) {
              const biasSpeed = projectile.speed * 0.6
              // 主追踪方向
              projectile.x += (dx / dist) * step
              projectile.y += (dy / dist) * step
              // 添加基于 angleOffset 的侧向偏移
              projectile.x += Math.cos(projectile.angleOffset) * deltaTime * biasSpeed * 60
              projectile.y += Math.sin(projectile.angleOffset) * deltaTime * biasSpeed * 60
            } else {
              // 靠近目标后直接追踪，取消侧向偏移以便收敛
              projectile.x += (dx / dist) * step
              projectile.y += (dy / dist) * step
            }
            
            // 镜面反射：检测是否超出当前行的边界
            const rowTop = projectile.row * gameConfig.cellHeight
            const rowBottom = (projectile.row + 1) * gameConfig.cellHeight
            const buffer = 8 // 缓冲区，避免连续反射
            
            if (projectile.y < rowTop + buffer) {
              // 超出上界，反向偏移角度（反射）
              if (!projectile.isReflecting) {
                projectile.angleOffset += Math.PI // 反向偏移（180度）
                projectile.isReflecting = true // 标记正在反射
                
                // 设置反射冷却计时器
                projectile.reflectionCooldown = 0.2
              }
              // 将位置推回边界内
              projectile.y = rowTop + buffer
            } else if (projectile.y > rowBottom - buffer) {
              // 超出下界，反向偏移角度（反射）
              if (!projectile.isReflecting) {
                projectile.angleOffset += Math.PI // 反向偏移（180度）
                projectile.isReflecting = true // 标记正在反射
                
                // 设置反射冷却计时器
                projectile.reflectionCooldown = 0.2
              }
              // 将位置推回边界内
              projectile.y = rowBottom - buffer
            }
            
            // 更新反射冷却计时器
            if (projectile.reflectionCooldown !== undefined) {
              projectile.reflectionCooldown -= deltaTime
              if (projectile.reflectionCooldown <= 0) {
                projectile.isReflecting = false
              }
            }
            
            // 到达目标附近，开始穿刺
            if (dist < projectile.pierceDistance * 1.5) {
              projectile.phase = 'piercing'
              
              // 计算入射方向（从刀片位置到僵尸中心的方向）
              const toZombie = {
                x: targetCenter.x - projectile.x,
                y: targetCenter.y - projectile.y
              }
              const dirLength = Math.hypot(toZombie.x, toZombie.y) || 1
              projectile.pierceDir = {
                x: toZombie.x / dirLength,
                y: toZombie.y / dirLength
              }
              
              // 初始化穿刺参数
              projectile.pierceIndex = 0 // 0→1→2 (共3次穿刺)
              projectile.pierceTimer = 0
              projectile.pierceTime = 0.5 // 单次穿刺时间（秒）
              projectile.pierceDistance = 100 // 穿刺距离
            }
          } else {
            // 没有目标，向右飞出屏幕
            projectile.x += projectile.speed * deltaTime * 60
            if (projectile.x > this.engine.width) {
              this.markBladeComplete(projectile)
              this.projectiles.splice(i, 1)
              continue
            }
          }
        }
        // 阶段2：穿刺往返（螺旋穿刺模型 - 改进版：锁定端点和段中心）
        else if (projectile.phase === 'piercing') {
          // 取中心：目标在就用实时中心，否则用 lastCenter
          const liveCenter = projectile.targetZombie
            ? {
                x: projectile.targetZombie.x + projectile.targetZombie.width / 2,
                y: projectile.targetZombie.y + projectile.targetZombie.height / 2
              }
            : projectile.lastCenter

          if (!liveCenter) {
            projectile.phase = 'escaping'
            continue
          }

          // 更新 lastCenter，保证目标消失也能继续演出
          projectile.lastCenter = liveCenter

          // 初始化一次
          if (!projectile.pierceInitialized) {
            projectile.pierceInitialized = true
            projectile.pierceIndex = projectile.pierceIndex ?? 0
            projectile.pierceTimer = projectile.pierceTimer ?? 0

            projectile.pierceDistance = 60
            projectile.pierceTime = 0.5
            projectile.pauseTime = 1.0
            projectile.maxPierces = 3

            projectile.isPaused = false
            projectile.pauseTimer = 0

            projectile.pierceSegmentLocked = false
          }

          // 目标消失：继续表演（方案B：更爽）
          if (projectile.targetZombie) {
            const zombieIndex = this.engine.zombies.indexOf(projectile.targetZombie)
            if (zombieIndex === -1) {
              projectile.targetZombie = null
            }
          }

          // 暂停处理
          if (projectile.isPaused) {
            projectile.pauseTimer += deltaTime
            if (projectile.pauseTimer >= projectile.pauseTime) {
              projectile.pauseTimer = 0
              projectile.isPaused = false
              projectile.pierceTimer = 0

              projectile.pierceIndex += 1

              if (projectile.pierceIndex >= projectile.maxPierces) {
                projectile.phase = 'escaping'
                continue
              }

              // 下一段重新锁定端点
              projectile.pierceSegmentLocked = false
            }
            continue
          }

          // 每段开始时锁定相对偏移（只做一次）
          if (!projectile.pierceSegmentLocked) {
            projectile.pierceSegmentLocked = true

            const d = projectile.pierceDistance
            if (projectile.pierceIndex % 2 === 0) {
              projectile.pierceStartOffsetX = -d
              projectile.pierceEndOffsetX = d
            } else {
              projectile.pierceStartOffsetX = d
              projectile.pierceEndOffsetX = -d
            }

            // Y 基准偏移（可选）
            projectile.pierceBaseOffsetY = 0
          }

          // 推进本段
          projectile.pierceTimer += deltaTime
          const t = Math.min(projectile.pierceTimer / projectile.pierceTime, 1)

          // 相对穿刺偏移
          const offsetX = projectile.pierceStartOffsetX + 
            (projectile.pierceEndOffsetX - projectile.pierceStartOffsetX) * t

          // 螺旋扰动（相对）- 加入相位偏移让三把刀保持120°角差
          const amplitude = 20
          const frequency = 2 + projectile.pierceIndex
          const theta = t * Math.PI * frequency + projectile.orbitPhase * 2 * Math.PI

          const spiralX = Math.cos(theta) * (amplitude * 0.2)
          const spiralY = Math.sin(theta) * amplitude

          // 最终位置：实时中心 + 相对偏移
          projectile.x = liveCenter.x + offsetX + spiralX
          projectile.y = liveCenter.y + (projectile.pierceBaseOffsetY || 0) + spiralY

          // 额外角速度（保持你原本的设定）
          const config = plantConfig.dragonKale
          projectile.angle += config.bladeAngleChange * deltaTime

          if (t >= 1) {
            // 本段结算：使用实时中心（跟着僵尸走）
            this.applyPierceAOE(projectile, liveCenter, projectile.aoeRadius || 80)

            // 标记段末，避免同一帧重复伤害
            projectile.justEndedSegment = true

            // 进入停顿
            projectile.isPaused = true
            projectile.pauseTimer = 0
          }
        }
        // 阶段3：逃离
        else if (projectile.phase === 'escaping') {
          projectile.x += projectile.speed * deltaTime * 60
          if (projectile.x > this.engine.width) {
            this.markBladeComplete(projectile)
            this.projectiles.splice(i, 1)
            continue
          }
        }
        
        // 生命周期结束，标记完成并移除
        if (projectile.lifeTime <= 0) {
          this.markBladeComplete(projectile)
          this.projectiles.splice(i, 1)
          continue
        }
        
        // 记录轨迹
        projectile.trail.push({ x: projectile.x, y: projectile.y })
        if (projectile.trail.length > projectile.maxTrailLength) {
          projectile.trail.shift()
        }
        
        // 检测碰撞（在穿刺阶段实时检测）
        if (projectile.phase === 'piercing' && projectile.damageTimer <= 0) {
          // 跳过段末那一帧，避免AOE和碰撞伤害重叠
          if (projectile.justEndedSegment) {
            projectile.justEndedSegment = false
            continue
          }
          
          for (const zombie of this.engine.zombies) {
            const zombieCenterX = zombie.x + zombie.width / 2
            const zombieCenterY = zombie.y + zombie.height / 2
            
            const distance = Math.sqrt(
              (projectile.x - zombieCenterX) ** 2 + 
              (projectile.y - zombieCenterY) ** 2
            )
            
            const collisionRadius = 25
            if (distance < collisionRadius) {
              // 破甲效果：对护盾造成双倍伤害
              if (zombie.shieldHp > 0) {
                zombie.shieldHp -= projectile.damage * projectile.shieldDamageMultiplier
                if (zombie.shieldHp < 0) {
                  zombie.hp += zombie.shieldHp
                  zombie.shieldHp = 0
                }
                
                // 添加破甲特效
                this.engine.animations.push({
                  type: 'shieldBreak',
                  x: zombieCenterX,
                  y: zombieCenterY,
                  time: 0,
                  duration: 0.3
                })
              } else {
                zombie.hp -= projectile.damage
              }
              
              this.engine.playSound('hit')
              
              // 添加切割动画
              this.engine.animations.push({
                type: 'bladeCut',
                x: zombieCenterX,
                y: zombieCenterY,
                angle: projectile.angle,
                time: 0,
                duration: 0.4
              })
              
              // 重置伤害冷却
              projectile.damageTimer = projectile.damageCooldown
              
              // 标记已造成伤害
              if (!projectile.hasHitDuringOrbit) {
                projectile.hasHitDuringOrbit = true
              }
              
              break
            }
          }
        }
        
        // 处理完dragonBlade后跳过后续的通用更新逻辑
        continue
      }
      // 如果是冰龙，使用垂直下降
      else if (projectile.type === 'iceDragon') {
        projectile.phaseTimer += deltaTime
        
        // 垂直下降
        projectile.y += projectile.vy * deltaTime
        
        // 更新旋转角度
        projectile.rotation += 2 * deltaTime
        
        // 记录尾迹
        projectile.trail.push({ x: projectile.x, y: projectile.y })
        if (projectile.trail.length > 20) {
          projectile.trail.shift()
        }
        
        // 检查是否到达目标位置
        if (projectile.y >= projectile.targetY || projectile.phaseTimer >= projectile.fallTime) {
          // 冰龙爆炸
          this.explodeIceDragon(projectile)
          this.projectiles.splice(i, 1)
          continue
        }
      }
      // 如果是玉米加农炮炮弹，使用两段式动画
      else if (projectile.type === 'cannon') {
        projectile.phaseTimer += deltaTime
        
        // 更新旋转角度
        projectile.rotation += projectile.rotationSpeed * deltaTime
        
        // 记录尾迹位置（每帧记录一次，最多保留30个点）
        projectile.trail.push({ x: projectile.x, y: projectile.y })
        if (projectile.trail.length > 30) {
          projectile.trail.shift()
        }
        
        if (projectile.phase === 'rising') {
          // 第一阶段：垂直向上
          projectile.y += projectile.vy * deltaTime
          
          // 检查是否到达天空顶部
          if (projectile.y <= projectile.skyHeight || projectile.phaseTimer >= projectile.riseTime) {
            // 切换到下降阶段
            projectile.phase = 'falling'
            // 从目标点正上方落下
            projectile.x = projectile.targetX
            projectile.y = projectile.skyHeight
            projectile.vy = projectile.fallSpeed
            projectile.phaseTimer = 0
          }
        } else if (projectile.phase === 'falling') {
          // 第二阶段：从天而降
          projectile.y += projectile.vy * deltaTime
          
          // 检查是否到达目标位置
          if (projectile.y >= projectile.targetY || projectile.phaseTimer >= projectile.fallTime) {
            // 爆炸
            this.explodeCannonProjectile(projectile)
            this.projectiles.splice(i, 1)
            continue
          }
        }
      }
      // 如果是西瓜，使用抛物线运动
      else if (projectile.type === 'watermelon' || projectile.type === 'iceWatermelon') {
        // 水平运动
        projectile.x += projectile.vx * deltaTime
        // 垂直运动（抛物线）：vy 受重力影响
        projectile.vy += projectile.gravity * deltaTime
        projectile.y += projectile.vy * deltaTime
        // 旋转
        projectile.rotation += projectile.rotationSpeed * deltaTime
      } else {
        // 普通子弹直线运动（使用实际的 speed 属性）
        projectile.x += projectile.speed * deltaTime * 60
        
        // 火焰豌豆发射粒子效果
        if (projectile.type === 'firePea') {
          this.particleSystem.emitFireParticles(projectile.x, projectile.y, 2)
        }
      }
      
      // 检查是否飞出屏幕（普通子弹）
      if (projectile.type !== 'cannon' && projectile.type !== 'dragonBlade' && projectile.x > this.engine.width + 100) {
        this.projectiles.splice(i, 1)
        continue
      }
      
      // 如果西瓜掉落到地面以下，移除
      if ((projectile.type === 'watermelon' || projectile.type === 'iceWatermelon') && 
          projectile.y > this.engine.height + 50) {
        this.projectiles.splice(i, 1)
        continue
      }
      
      // 检测是否经过冒火树桩并增强子弹
      this.checkFireStumpEnhancement(projectile)
      
      // 碰撞检测（非龙葵草刀片）
      if (projectile.type !== 'dragonBlade') {
        this.checkNonBladeCollision(projectile, i)
      }
    }
    
    // 更新金箍棒
    this.updateWeaponStaffs(deltaTime)
  }
  
  // 检查非刀片子弹的碰撞
  checkNonBladeCollision(projectile, index) {
    let hit = false
    for (const zombie of this.engine.zombies) {
      const zombieRow = Math.floor((zombie.y + zombie.height / 2) / gameConfig.cellHeight)
      const zombieCenterY = zombie.y + zombie.height / 2
      const zombieCenterX = zombie.x + zombie.width / 2
      
      // 碰撞检测
      const distance = Math.sqrt(
        (projectile.x - zombieCenterX) ** 2 + 
        (projectile.y - zombieCenterY) ** 2
      )
      
      // 普通豌豆和火焰豌豆只检测同一行
      if (['pea', 'firePea'].includes(projectile.type)) {
        if (zombieRow === projectile.row && 
            projectile.x >= zombie.x && 
            projectile.x <= zombie.x + zombie.width) {
          
          if (zombie.shieldHp > 0) {
            zombie.shieldHp -= projectile.damage
            if (zombie.shieldHp < 0) {
              zombie.hp += zombie.shieldHp
              zombie.shieldHp = 0
            }
          } else {
            zombie.hp -= projectile.damage
          }
          
          this.engine.playSound('hit')
          hit = true
          break
        }
      } 
      // 寒冰豌豆
      else if (projectile.type === 'icePea') {
        if (zombieRow === projectile.row && 
            projectile.x >= zombie.x && 
            projectile.x <= zombie.x + zombie.width) {
          
          if (zombie.shieldHp > 0) {
            zombie.shieldHp -= projectile.damage
            if (zombie.shieldHp < 0) {
              zombie.hp += zombie.shieldHp
              zombie.shieldHp = 0
            }
          } else {
            zombie.hp -= projectile.damage
          }
          
          zombie.slowDuration = projectile.slowDuration || 3
          zombie.slowFactor = projectile.slowFactor || 0.5
          
          this.engine.playSound('hit')
          hit = true
          break
        }
      }
      // 西瓜使用圆形碰撞检测
      else if (projectile.type === 'watermelon' || projectile.type === 'iceWatermelon') {
        const collisionRadius = projectile.collisionRadius || 80
        if (distance < collisionRadius) {
          if (zombie.shieldHp > 0) {
            zombie.shieldHp -= projectile.damage
            if (zombie.shieldHp < 0) {
              zombie.hp += zombie.shieldHp
              zombie.shieldHp = 0
            }
          } else {
            zombie.hp -= projectile.damage
          }
          
          if (projectile.type === 'iceWatermelon') {
            zombie.slowDuration = projectile.slowDuration || 3
            zombie.slowFactor = projectile.slowFactor || 0.5
          }
          
          this.engine.playSound('hit')
          
          // 添加西瓜破碎动画
          this.engine.animations.push({
            type: 'watermelonHit',
            x: zombieCenterX,
            y: zombieCenterY,
            isIce: projectile.type === 'iceWatermelon',
            time: 0,
            duration: 0.4
          })
          
          hit = true
          break
        }
      }
    }
    
    if (hit) {
      this.projectiles.splice(index, 1)
    }
  }
  
  // 应用穿刺AOE范围伤害
  applyPierceAOE(projectile, center, radius) {
    const aoeRadius = radius || 80
    
    // 对范围内的所有僵尸造成伤害
    for (let i = this.engine.zombies.length - 1; i >= 0; i--) {
      const zombie = this.engine.zombies[i]
      const zombieCenterX = zombie.x + zombie.width / 2
      const zombieCenterY = zombie.y + zombie.height / 2
      
      const distance = Math.sqrt(
        (zombieCenterX - center.x) ** 2 + 
        (zombieCenterY - center.y) ** 2
      )
      
      if (distance <= aoeRadius) {
        // 造成伤害
        if (zombie.shieldHp > 0) {
          zombie.shieldHp -= projectile.damage * projectile.shieldDamageMultiplier
          if (zombie.shieldHp < 0) {
            zombie.hp += zombie.shieldHp
            zombie.shieldHp = 0
          }
        } else {
          zombie.hp -= projectile.damage
        }
        
        this.engine.playSound('hit')
        
        // 添加穿刺动画
        this.engine.animations.push({
          type: 'bladeCut',
          x: zombieCenterX,
          y: zombieCenterY,
          angle: projectile.angle,
          time: 0,
          duration: 0.3
        })
        
        // 检查僵尸是否死亡
        if (zombie.hp <= 0) {
          this.engine.zombies.splice(i, 1)
          this.engine.score += 10
          this.engine.zombiesKilled++
          this.engine.playSound('zombieDeath')
          this.engine.addDeathAnimation(zombie.x, zombie.y)
        }
      }
    }
  }

  // 标记刀片完成（用于召唤冰龙）
  markBladeComplete(projectile) {
    if (!projectile.hasCompleted && projectile.originPlant) {
      projectile.hasCompleted = true
      
      if (projectile.originPlant.completedBladeCount !== undefined) {
        projectile.originPlant.completedBladeCount++
        
        // 检查是否所有刀片都完成
        if (projectile.originPlant.completedBladeCount >= projectile.originPlant.totalBladeCount) {
          // 召唤冰龙
          this.summonIceDragon(projectile.originPlant)
          
          // 重置计数
          projectile.originPlant.totalBladeCount = 0
          projectile.originPlant.completedBladeCount = 0
        }
      }
    }
  }

  // 检查子弹是否经过冒火树桩并增强
  checkFireStumpEnhancement(projectile) {
    // 普通豌豆和寒冰豌豆可以增强
    if (['pea', 'icePea'].includes(projectile.type) && !projectile.enhancedByFireStump) {
      for (const plant of this.engine.plants) {
        if (plant.type === 'fireStump') {
          // 检查子弹是否在同一行
          const plantRow = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
          if (plantRow === projectile.row) {
            // 检查子弹是否进入树桩范围
            const stumpStart = plant.x
            const stumpEnd = plant.x + plant.width
            const stumpCenter = (stumpStart + stumpEnd) / 2
            
            // 如果子弹进入树桩范围（从左边进入）
            if (projectile.x >= stumpStart && projectile.x < stumpEnd) {
              // 计算子弹是否已经过树桩中心
              const hasPassedCenter = projectile.x >= stumpCenter
              
              // 只在子弹刚进入树桩范围时增强一次
              if (!projectile.enhancedByFireStump) {
                // 子弹进入了树桩，增强它
                this.enhanceProjectile(projectile)
                projectile.enhancedByFireStump = true
                this.engine.playSound('hit')
                
                // 发射粒子效果
                this.particleSystem.emitFireParticles(stumpCenter, projectile.y, 8)
                break
              }
            }
          }
        }
      }
    }
  }

  // 增强子弹（核心功能）
  enhanceProjectile(projectile) {
    const config = plantConfig.fireStump
    const bonus = config.fireBonus
    
    // 如果是豌豆射手子弹，转换为火焰豌豆
    if (projectile.type === 'pea') {
      projectile.type = 'firePea'
      // 速度提升30%
      projectile.speed = projectile.speed * bonus.speedMultiplier
      // 伤害增加250%（变成原来的2.5倍）
      projectile.damage = projectile.damage * bonus.damageMultiplier
      projectile.enhancedByFireStump = true
    }
    // 如果是寒冰射手子弹，转换为普通豌豆
    else if (projectile.type === 'icePea') {
      projectile.type = 'pea'
      // 移除减速效果
      delete projectile.slowDuration
      delete projectile.slowFactor
      projectile.enhancedByFireStump = true
    }
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
      slowFactor: config.slowFactor,
      enhancedByFireStump: false
    }
    
    this.projectiles.push(projectile)
  }

  // 发射机枪射手的子弹（一次发射4颗）
  shootRepeater(plant) {
    const config = plantConfig['repeater']
    const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)
    
    // 发射4颗子弹，每颗之间有延迟
    for (let i = 0; i < config.projectileCount; i++) {
      setTimeout(() => {
        const projectile = {
          x: plant.x + plant.width,
          y: plant.y + plant.height / 2,
          type: 'pea', // 和豌豆射手一样的子弹类型
          damage: config.damage, // 每颗子弹的伤害
          speed: config.projectileSpeed, // 子弹速度
          row: row,
          enhancedByFireStump: false // 可以被树桩增强
        }
        
        this.projectiles.push(projectile)
      }, i * config.projectileDelay * 1000) // 转换为毫秒
    }
  }

  // 发射西瓜（抛物线）
  shootWatermelon(plant) {
    const config = plantConfig[plant.type]
    const row = Math.floor((plant.y + plant.height / 2) / gameConfig.cellHeight)

    // 找到同一行中最近的僵尸作为目标
    let targetZombie = null
    let minDx = Infinity
    const startX = plant.x + plant.width
    
    for (const zombie of this.engine.zombies) {
      const zombieRow = Math.floor((zombie.y + zombie.height / 2) / gameConfig.cellHeight)
      if (zombieRow !== row) continue
      if (zombie.x <= startX) continue

      const dx = zombie.x - startX
      if (dx < minDx) {
        minDx = dx
        targetZombie = zombie
      }
    }

    // 如果没有找到目标僵尸，不发射
    if (!targetZombie) return

    const startY = plant.y + plant.height / 2
    const targetX = targetZombie.x + targetZombie.width / 2
    const targetY = targetZombie.y + targetZombie.height / 2

    const projectileVx = config.projectileSpeed * 60
    const zombieVx = -zombieConfig[targetZombie.type].speed * 60

    const dx = targetX - startX
    const closingSpeed = projectileVx - zombieVx
    
    if (dx <= 0 || closingSpeed <= 1e-6) return
    
    const t = dx / closingSpeed
    if (!isFinite(t) || t <= 0) return

    const dy = targetY - startY
    const g = config.gravity
    const vy0 = (dy - 0.5 * g * t * t) / t

    const projectile = {
      x: startX,
      y: startY,
      vx: projectileVx,
      vy: vy0,
      type: plant.type === 'iceWatermelon' ? 'iceWatermelon' : 'watermelon',
      damage: config.damage,
      gravity: g,
      rotation: 0,
      rotationSpeed: config.rotationSpeed,
      row,
      slowDuration: config.slowDuration,
      slowFactor: config.slowFactor,
      collisionRadius: 80
    }

    this.projectiles.push(projectile)
  }

  // 投掷金箍棒
  throwGoldenStaff(plant) {
    const config = plantConfig.kiwi
    
    const staff = {
      x: plant.x + plant.width,
      y: plant.y + plant.height / 2,
      damage: config.staffDamage,
      lifeTime: config.staffLifeTime,
      attackInterval: config.staffAttackInterval,
      attackTimer: 0,
      radius: config.staffRadius,
      rotation: 0,
      rotationSpeed: 10,
      state: 'flying',
      targetX: null,
      targetY: null,
      speed: 15
    }
    
    this.weaponStaffs.push(staff)
  }

  // 更新金箍棒
  updateWeaponStaffs(deltaTime) {
    for (let i = this.weaponStaffs.length - 1; i >= 0; i--) {
      const staff = this.weaponStaffs[i]
      
      if (staff.state === 'flying') {
        // 飞行阶段，向右移动
        staff.x += staff.speed * deltaTime * 60
        
        // 检查是否遇到僵尸
        for (const zombie of this.engine.zombies) {
          const zombieCenterX = zombie.x + zombie.width / 2
          const zombieCenterY = zombie.y + zombie.height / 2
          
          const distance = Math.sqrt(
            (staff.x - zombieCenterX) ** 2 + (staff.y - zombieCenterY) ** 2
          )
          
          if (distance < 30) {
            // 碰到僵尸，开始旋转攻击
            staff.state = 'spinning'
            staff.targetX = zombie.x
            staff.targetY = zombie.y
            staff.rotation = 0
            break
          }
        }
        
        // 如果飞出屏幕，移除
        if (staff.x > this.engine.width) {
          this.weaponStaffs.splice(i, 1)
        }
      } else if (staff.state === 'spinning') {
        // 旋转攻击阶段
        staff.rotation += staff.rotationSpeed * deltaTime
        staff.lifeTime -= deltaTime
        
        // 旋转攻击周围僵尸
        staff.attackTimer += deltaTime
        if (staff.attackTimer >= staff.attackInterval) {
          staff.attackTimer = 0
          
          for (let j = this.engine.zombies.length - 1; j >= 0; j--) {
            const zombie = this.engine.zombies[j]
            const zombieCenterX = zombie.x + zombie.width / 2
            const zombieCenterY = zombie.y + zombie.height / 2
            
            const distance = Math.sqrt(
              (staff.x - zombieCenterX) ** 2 + (staff.y - zombieCenterY) ** 2
            )
            
            if (distance <= staff.radius) {
              // 造成伤害
              if (zombie.shieldHp > 0) {
                zombie.shieldHp -= staff.damage
                if (zombie.shieldHp < 0) {
                  zombie.hp += zombie.shieldHp
                  zombie.shieldHp = 0
                }
              } else {
                zombie.hp -= staff.damage
              }
              
              this.engine.playSound('hit')
              
              // 添加击中动画
              this.engine.animations.push({
                type: 'staffHit',
                x: zombie.x + zombie.width / 2,
                y: zombie.y + zombie.height / 2,
                time: 0,
                duration: 0.3
              })
              
              if (zombie.hp <= 0) {
                this.engine.zombies.splice(j, 1)
                this.engine.score += 10
                this.engine.zombiesKilled++
                this.engine.playSound('zombieDeath')
                this.engine.addDeathAnimation(zombie.x, zombie.y)
              }
            }
          }
        }
        
        // 存在时间到，移除
        if (staff.lifeTime <= 0) {
          this.weaponStaffs.splice(i, 1)
        }
      }
    }
  }

  // 玉米加农炮发射炮弹
  fireCannonProjectile(cannon, targetX, targetY) {
    // 检查玉米加农炮是否处于沉睡状态
    if (cannon.isSleeping) {
      this.engine.showMessage('玉米加农炮正在沉睡中，无法发射！', '#f87171')
      return false
    }
    
    const config = plantConfig.cannon
    const startX = cannon.x + cannon.width / 2
    const startY = cannon.y + cannon.height / 2
    
    // 计算飞行到天空顶部的高度
    const skyAboveHeight = 50
    const skyY = -skyAboveHeight
    
    // 第一阶段：垂直向上飞到屏幕上方
    const upSpeed = 400
    const upDistance = startY - skyY
    const upTime = upDistance / upSpeed
    
    // 第二阶段：从天而降到目标点
    const fallTargetY = targetY
    const fallSpeed = 500
    const fallDistance = fallTargetY - skyY
    const fallTime = fallDistance / fallSpeed
    
    // 设置沉睡状态
    cannon.isSleeping = true
    cannon.sleepTimer = config.sleepDuration
    
    const projectile = {
      x: startX,
      y: startY,
      vx: 0,
      vy: -upSpeed,
      type: 'cannon',
      damage: config.damage,
      explodeRadius: config.explodeRadius,
      targetX: targetX,
      targetY: targetY,
      phase: 'rising',
      riseTime: upTime,
      fallTime: fallTime,
      phaseTimer: 0,
      skyHeight: skyY,
      fallSpeed: fallSpeed,
      rotation: 0,
      rotationSpeed: 3,
      trail: []
    }
    
    this.projectiles.push(projectile)
    this.engine.playSound('shoot')
    this.engine.showMessage('🌽 玉米加农炮发射！', '#fbbf24')
    return true
  }

  // 玉米加农炮炮弹爆炸
  explodeCannonProjectile(projectile) {
    const centerX = projectile.targetX
    const centerY = projectile.targetY
    const explodeRadius = projectile.explodeRadius
    
    // 对爆炸范围内的所有僵尸造成伤害
    for (let i = this.engine.zombies.length - 1; i >= 0; i--) {
      const zombie = this.engine.zombies[i]
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
        
        this.engine.playSound('hit')
        
        // 添加爆炸动画
        this.engine.animations.push({
          type: 'cannonExplode',
          x: zombieCenterX,
          y: zombieCenterY,
          time: 0,
          duration: 0.5
        })
        
        // 检查僵尸是否死亡
        if (zombie.hp <= 0) {
          this.engine.zombies.splice(i, 1)
          this.engine.score += 10
          this.engine.zombiesKilled++
          
          if (i < this.engine.zombies.length) {
            continue
          }
          
          this.engine.playSound('zombieDeath')
          this.engine.addDeathAnimation(zombie.x, zombie.y)
        }
      }
    }
    
    // 播放爆炸音效
    this.engine.playSound('explode')
    
    // 添加中心爆炸动画
    this.engine.animations.push({
      type: 'cannonExplode',
      x: centerX,
      y: centerY,
      time: 0,
      duration: 0.9,
      isCenter: true
    })
    
  }

  // 龙葵草：发射螺旋刀片
  shootDragonBlade(plant) {
    const config = plantConfig.dragonKale
    
    // 添加发射动画
    this.engine.animations.push({
      type: 'dragonBladeLaunch',
      x: plant.x + plant.width / 2,
      y: plant.y + plant.height / 2,
      time: 0,
      duration: 0.5
    })
    
    // 找到同一行中最近的僵尸作为目标
    const nearestZombie = this.engine.findNearestZombieInRow(plant.row, plant.x)
    
    // 发射三枚刀片，每个刀片有不同的初始角度和独立的身份标签
    for (let i = 0; i < config.bladeCount; i++) {
      const initialAngle = (i / config.bladeCount) * Math.PI * 2 // 0°, 120°, 240°
      const spread = 18 // 初始散开距离
      
      // 身份标签 - 每个刀片独立
      const angleOffset = (i * 120) * Math.PI / 180 // 角度偏移：0°, 120°, 240° 转为弧度
      const orbitPhase = i / config.bladeCount // 轨道相位：0, 1/3, 2/3
      
      // 初始位置径向外放 30px，增加视觉区分度
      const startX = plant.x + plant.width + Math.cos(initialAngle) * 30
      const startY = plant.y + plant.height / 2 + Math.sin(initialAngle) * (spread + 30)
      
      const blade = {
        x: startX,
        y: startY,
        type: 'dragonBlade',
        
        // 行号信息（用于边界反射）
        row: plant.row,
        
        // 身份标签（用于独立运动轨迹）
        bladeId: i, // 0, 1, 2
        angleOffset: angleOffset, // 角度偏移：0°, 120°, 240° 弧度
        orbitPhase: orbitPhase, // 轨道相位：0, 1/3, 2/3
        
        damage: config.bladeDamage,
        shieldDamageMultiplier: config.shieldDamageMultiplier,
        
        // 穿刺系统参数（新）
        pierceDir: { x: 0, y: 0 }, // 入射方向（在approaching结束时计算）
        pierceIndex: 0, // 穿刺次数（0→1→2，共3次）
        pierceTimer: 0, // 当前穿刺计时
        pierceTime: 3.0, // 单次穿刺时间（秒）- 慢10倍
        pierceDistance: 100, // 穿刺距离
        aoeRadius: 80, // AOE范围半径
        
        // 运动参数
        angle: initialAngle,
        rotationSpeed: config.bladeRotationSpeed,
        speed: config.bladeSpeed,
        
        // 生命周期
        lifeTime: 1.05, // 刀片存在时间（秒）- 改为原来的0.7倍
        maxLifeTime: 1.05,
        damageCooldown: 0.2, // 造成伤害的冷却时间（秒）
        damageTimer: 0,
        
        // 轨迹记录
        trail: [],
        maxTrailLength: 30,
        
        // 状态
        phase: 'approaching', // approaching(接近), piercing(穿刺往返), escaping(逃离)
        targetZombie: nearestZombie,
        
        // 标记
        hasHitDuringOrbit: false,
        hasCompleted: false,
        
        // 植物引用，用于召唤冰龙
        originPlant: plant
      }
      
      this.projectiles.push(blade)
    }
    
    // 记录本次发射的刀片总数，用于检测何时召唤冰龙
    if (!plant.totalBladeCount) {
      plant.totalBladeCount = 0
    }
    plant.totalBladeCount += config.bladeCount
    
    if (!plant.completedBladeCount) {
      plant.completedBladeCount = 0
    }
  }
  
  // 龙葵草：召唤冰龙
  summonIceDragon(plant) {
    const config = plantConfig.dragonKale
    
    // 找到该行中最近的僵尸
    const nearestZombie = this.engine.findNearestZombieInRow(plant.row, plant.x)
    
    let targetX, targetY
    if (nearestZombie) {
      targetX = nearestZombie.x + nearestZombie.width / 2
      targetY = nearestZombie.y + nearestZombie.height / 2
    } else {
      // 如果没有僵尸，默认攻击该行中间位置
      targetX = this.engine.width / 2
      targetY = plant.y + plant.height / 2
    }
    
    // 计算天空高度（屏幕上方）
    const skyAboveHeight = 100
    const skyY = -skyAboveHeight
    
    // 下降阶段的参数
    const fallSpeed = 400 * 1.8  // 速度加快到原来的1.8倍
    const fallDistance = targetY - skyY
    const fallTime = fallDistance / fallSpeed
    
    const dragon = {
      x: targetX,
      y: skyY,
      type: 'iceDragon',
      phase: 'falling',
      vy: fallSpeed,
      damage: config.dragonDamage,
      explodeRadius: config.dragonRadius,
      targetX: targetX,
      targetY: targetY,
      phaseTimer: 0,
      fallTime: fallTime,
      rotation: 0,
      scale: 1,
      trail: []
    }
    
    this.projectiles.push(dragon)
    
    // 添加召唤动画
    this.engine.animations.push({
      type: 'iceDragonSummon',
      x: targetX,
      y: skyY,
      time: 0,
      duration: fallTime
    })
    
    this.engine.playSound('shoot')
  }
  
  // 冰龙爆炸
  explodeIceDragon(projectile) {
    const centerX = projectile.targetX
    const centerY = projectile.targetY
    const explodeRadius = projectile.explodeRadius
    
    // 对爆炸范围内的所有僵尸造成伤害
    for (let i = this.engine.zombies.length - 1; i >= 0; i--) {
      const zombie = this.engine.zombies[i]
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
        
        // 冻结效果
        zombie.slowDuration = 3
        zombie.slowFactor = 0.3
        
        this.engine.playSound('hit')
        
        // 添加冰冻动画
        this.engine.animations.push({
          type: 'iceDragonExplode',
          x: zombieCenterX,
          y: zombieCenterY,
          time: 0,
          duration: 0.6
        })
        
        // 检查僵尸是否死亡
        if (zombie.hp <= 0) {
          this.engine.zombies.splice(i, 1)
          this.engine.score += 10
          this.engine.zombiesKilled++
          
          if (i < this.engine.zombies.length) {
            continue
          }
          
          this.engine.playSound('zombieDeath')
          this.engine.addDeathAnimation(zombie.x, zombie.y)
        }
      }
    }
    
    // 播放爆炸音效
    this.engine.playSound('explode')
    
    // 添加中心爆炸动画
    this.engine.animations.push({
      type: 'iceDragonExplode',
      x: centerX,
      y: centerY,
      time: 0,
      duration: 1.0,
      isCenter: true
    })
  }
  
  // 清空所有子弹
  clear() {
    this.projectiles = []
    this.weaponStaffs = []
    this.particleSystem.clear()
  }

  // 获取所有子弹
  getProjectiles() {
    return this.projectiles
  }

  // 获取所有金箍棒
  getWeaponStaffs() {
    return this.weaponStaffs
  }

  // 获取粒子系统
  getParticleSystem() {
    return this.particleSystem
  }
}
