import { gameConfig, plantConfig, zombieConfig } from './config.js'

// 粒子系统 - 用于火焰豌豆的粒子效果
class ParticleSystem {
  constructor() {
    this.particles = []
  }

  // 发射火焰粒子
  emitFireParticles(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
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
      
      // 如果是玉米加农炮炮弹，使用两段式动画
      if (projectile.type === 'cannon') {
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
      if (projectile.type !== 'cannon' && projectile.x > this.engine.width + 100) {
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
      
      // 碰撞检测
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
        this.projectiles.splice(i, 1)
      }
    }
    
    // 更新金箍棒
    this.updateWeaponStaffs(deltaTime)
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
