// 植物配置表
export const plantConfig = {
  sunflower: {
    id: 'sunflower',
    name: '向日葵',
    icon: '🌻',
    cost: 50,
    hp: 300,
    produceInterval: 10,  // 生产阳光间隔（秒）
    produceAmount: 25,    // 产生阳光数量
    cooldown: 5,          // 冷却时间（秒）
    width: 104,           // 放大到1.3倍
    height: 130           // 放大到1.3倍
  },
  peashooter: {
    id: 'peashooter',
    name: '豌豆射手',
    icon: '🌱',
    cost: 100,
    hp: 300,
    attackInterval: 1.5,  // 攻击间隔（秒）
    damage: 30,           // 伤害值
    projectileSpeed: 10,  // 子弹速度（像素/帧）- 放大到1.3倍
    cooldown: 2,
    width: 104,           // 放大到1.3倍
    height: 130           // 放大到1.3倍
  },
  snowPea: {
    id: 'snowPea',
    name: '寒冰射手',
    icon: '❄️',
    cost: 175,
    hp: 300,
    attackInterval: 1.5,  // 攻击间隔（秒）
    damage: 30,           // 伤害值
    projectileSpeed: 10,  // 子弹速度（像素/帧）- 放大到1.3倍
    slowDuration: 3,      // 减速持续时间（秒）
    slowFactor: 0.5,      // 减速系数（50%）
    cooldown: 5,
    width: 104,           // 放大到1.3倍
    height: 130           // 放大到1.3倍
  },
  nutWall: {
    id: 'nutWall',
    name: '坚果墙',
    icon: '🥔',
    cost: 50,
    hp: 8000,            // 高生命值
    cooldown: 10,        // 较长冷却时间
    width: 104,          // 放大到1.3倍
    height: 130          // 放大到1.3倍
  },
  cherryBomb: {
    id: 'cherryBomb',
    name: '樱桃炸弹',
    icon: '🍒',
    cost: 150,
    hp: 1000,            // 会立即爆炸
    explodeDelay: 1,     // 爆炸延迟（秒）
    explodeRadius: 156,  // 爆炸半径（像素）- 放大到1.3倍
    damage: 2400,        // 爆炸伤害
    cooldown: 20,        // 很长的冷却时间
    width: 104,          // 放大到1.3倍
    height: 130          // 放大到1.3倍
  },
  watermelon: {
    id: 'watermelon',
    name: '西瓜投手',
    icon: '🍉',
    cost: 300,           // 高消耗
    hp: 400,
    attackInterval: 2.5, // 攻击间隔（秒）
    damage: 100,          // 高伤害
    projectileSpeed: 8,  // 较慢的子弹速度
    gravity: 300,        // 重力加速度（像素/秒²）
    rotationSpeed: 5,    // 旋转速度（弧度/秒）
    cooldown: 6,       // 长冷却时间
    width: 104,
    height: 130
  },
  iceWatermelon: {
    id: 'iceWatermelon',
    name: '寒冰西瓜投手',
    icon: '🧊',
    cost: 350,           // 更高消耗
    hp: 400,
    attackInterval: 2.5, // 攻击间隔（秒）
    damage: 80,          // 中等伤害
    projectileSpeed: 8,  // 较慢的子弹速度
    gravity: 300,        // 重力加速度（像素/秒²）
    rotationSpeed: 5,    // 旋转速度（弧度/秒）
    slowDuration: 3,     // 减速持续时间（秒）
    slowFactor: 0.5,     // 减速系数（50%）
    cooldown: 12,        // 长冷却时间
    width: 104,
    height: 130
  },
  kiwi: {
    id: 'kiwi',
    name: '猕猴桃',
    icon: '🥝',
    cost: 600,           // 超高消耗
    hp: 350,
    attackInterval: 4,   // 攻击间隔（秒）
    staffDamage: 200,     // 金箍棒伤害
    staffLifeTime: 5,    // 金箍棒存在时间（秒）
    staffAttackInterval: 0.5, // 金箍棒攻击间隔（秒）
    staffRadius: 50,     // 金箍棒攻击半径（像素）
    cooldown: 10,        // 中等冷却时间
    width: 104,
    height: 130
  },
  cannon: {
    id: 'cannon',
    name: '玉米加农炮',
    icon: '🌽',
    cost: 500,           // 高消耗
    hp: 500,             // 中等生命值
    damage: 3000,        // 爆炸伤害
    explodeRadius: 220,  // 爆炸半径（像素）- 约2-3个格子
    projectileSpeed: 15, // 炮弹速度
    cooldown: 40,        // 很长的冷却时间
    sleepDuration: 0,   // 发射后沉睡时间（秒）
    gridWidth: 2,        // 占用2个格子宽度
    gridHeight: 1,       // 占用1个格子高度
    width: 104,          // 单个格子宽度（会在engine中动态设置为2倍）
    height: 130
  },
  fireStump: {
    id: 'fireStump',
    name: '冒火的树桩',
    icon: '🔥',
    cost: 150,           // 中等消耗
    hp: 1000,            // 中等生命值
    cooldown: 10,        // 冷却时间（秒）
    width: 104,
    height: 130,
    // 增强效果配置
    fireBonus: {
      speedMultiplier: 1.3,      // 速度提升30%
      damageMultiplier: 2.5,     // 伤害增加150%（即变成原来的2.5倍）
      convertIceToFire: true     // 转换寒冰子弹为火焰子弹
    }
  },
  jalapeno: {
    id: 'jalapeno',
    name: '火爆辣椒',
    icon: '🌶️',
    cost: 150,
    hp: 1000,
    explodeDelay: 0.3,    // 爆炸延迟（秒）
    damage: 2000,         // 爆炸伤害
    cooldown: 0,         // 冷却时间（秒）
    width: 104,
    height: 130
  },
  squash: {
    id: 'squash',
    name: '倭瓜',
    icon: '🎃',
    cost: 50,
    hp: 1000,
    damage: 500,          // 压击伤害
    triggerDistance: 120, // 触发距离（像素）
    jumpDuration: 0.3,    // 跳跃持续时间（秒）
    cooldown: 20,         // 冷却时间（秒）
    width: 104,
    height: 130
  },
  potatoMine: {
    id: 'potatoMine',
    name: '土豆地雷',
    icon: '🌰',
    cost: 25,             // 低消耗
    hp: 300,              // 低生命值
    damage: 1000,         // 爆炸伤害
    sleepDuration: 6,     // 沉睡时间（秒）
    triggerDistance: 80,  // 触发距离（像素）
    cooldown: 15,         // 冷却时间（秒）
    width: 104,
    height: 130
  },
  repeater: {
    id: 'repeater',
    name: '机枪射手',
    icon: '🔫',
    cost: 250,           // 比豌豆射手贵2.5倍（因为发射4颗子弹）
    hp: 300,
    attackInterval: 1.5, // 攻击间隔和豌豆射手一样
    damage: 30,          // 每颗子弹伤害和豌豆射手一样
    projectileSpeed: 10, // 子弹速度和豌豆射手一样
    projectileCount: 4,  // 发射4颗子弹
    projectileDelay: 0.1, // 每颗子弹之间的间隔（秒）
    cooldown: 7,         // 冷却时间
    width: 104,
    height: 130
  },
  hypnoShroom: {
    id: 'hypnoShroom',
    name: '魅惑菇',
    icon: '🍄',
    cost: 125,           // 中等消耗
    hp: 200,             // 较低生命值（容易被吃掉）
    cooldown: 15,        // 冷却时间（秒）
    width: 104,
    height: 130,
    // 魅惑效果配置
    hypnosisEffect: {
      hpMultiplier: 3,      // 血量提升200%（变成3倍）
      attackMultiplier: 2,  // 攻击提升100%（变成2倍）
      color: '#a855f7'      // 紫色（魅惑颜色）
    }
  },
  thunderMelon: {
    id: 'thunderMelon',
    name: '雷霆怒瓜',
    icon: '⚡',
    cost: 500,           // 中等消耗
    hp: 400,             // 正常生命值
    damage: 100,         // 初始伤害
    damageIncrement: 50, // 每次跳跃增加的伤害
    attackInterval: 3,   // 攻击间隔（秒）
    lightningRange: 150, // 闪电跳跃半径（像素）
    maxJumps: 5,         // 最大跳跃次数
    slowDuration: 3,     // 减速持续时间（秒）
    slowFactor: 0.5,     // 减速系数（50%）
    cooldown: 8,         // 冷却时间（秒）
    width: 104,
    height: 130
  },
  dragonKale: {
    id: 'dragonKale',
    name: '龙葵草',
    icon: '🐉',
    cost: 400,               // 高消耗
    hp: 400,
    attackInterval: 3,     // 攻击间隔（秒）
    bladeDamage: 10,         // 刀片伤害
    bladeCount: 3,           // 刀片数量
    shieldDamageMultiplier: 2.0,  // 护盾伤害倍数（破甲效果）
    dragonDamage: 50,       // 冰龙伤害
    dragonRadius: 75,        // 冰龙伤害范围（像素）
    bladeSpeed: 12,          // 刀片飞行速度（像素/帧）
    bladeRotationSpeed: 8,   // 刀片旋转速度（弧度/秒）
    bladeAngleChange: 15,    // 每帧角度变化（螺旋效果，度）
    cooldown: 9,            // 冷却时间（秒）
    width: 104,
    height: 130
  }
}

// 僵尸配置表
export const zombieConfig = {
  normal: {
    id: 'normal',
    cost: 50,
    name: '普通僵尸',
    icon: '🧟',
    hp: 200,
    speed: 0.65,          // 移动速度（像素/帧）- 放大到1.3倍
    attackDamage: 1,      // 攻击伤害
    attackInterval: 1,    // 攻击间隔（秒）
    width: 104,           // 放大到1.3倍
    height: 130           // 放大到1.3倍
  },
  conehead: {
    id: 'conehead',
    cost: 75,
    name: '路障僵尸',
    icon: '🔺',
    hp: 560,             // 200 + 360护盾
    shieldHp: 360,       // 路障护盾血量
    speed: 0.65,         // 移动速度（像素/帧）- 放大到1.3倍
    attackDamage: 1,
    attackInterval: 1,
    width: 104,          // 放大到1.3倍
    height: 130          // 放大到1.3倍
  },
  buckethead: {
    id: 'buckethead',
    cost: 125,
    name: '铁桶僵尸',
    icon: '🗑️',
    hp: 860,            // 200 + 660护盾
    shieldHp: 660,      // 铁桶护盾血量
    speed: 0.65,         // 移动速度（像素/帧）- 放大到1.3倍
    attackDamage: 1,
    attackInterval: 1,
    width: 104,          // 放大到1.3倍
    height: 130          // 放大到1.3倍
  },
  football: {
    id: 'football',
    name: '橄榄球僵尸',
    icon: '🏈',
    cost: 175,
    hp: 500,
    speed: 1.3,
    attackDamage: 1,
    attackInterval: 1,
    width: 104,
    height: 130
  },
  newspaper: {
    id: 'newspaper',
    name: '报纸僵尸',
    icon: '📰',
    cost: 100,
    hp: 500,
    shieldHp: 200,
    speed: 0.75,
    enragedSpeed: 1.35,
    attackDamage: 1,
    attackInterval: 1,
    width: 104,
    height: 130
  },
  dancing: {
    id: 'dancing',
    name: '跳舞僵尸',
    icon: '🕺',
    cost: 200,
    hp: 400,
    speed: 0.7,
    summonInterval: 7,
    maxSummons: 4,
    summonType: 'backupDancer',
    attackDamage: 1,
    attackInterval: 1,
    width: 104,
    height: 130
  },
  balloon: {
    id: 'balloon',
    name: '气球僵尸',
    icon: '🎈',
    cost: 150,
    hp: 250,
    shieldHp: 60,
    speed: 0.9,
    groundSpeed: 0.55,
    canFly: true,
    attackDamage: 1,
    attackInterval: 1,
    width: 104,
    height: 130
  },
  pole: {
    id: 'pole',
    name: '撑杆僵尸',
    icon: '🏃',
    cost: 125,
    hp: 350,
    speed: 1.15,
    speedAfterVault: 0.75,
    attackDamage: 1,
    attackInterval: 1,
    width: 104,
    height: 130
  },
  backupDancer: {
    id: 'backupDancer',
    name: '伴舞僵尸',
    icon: '🧟',
    cost: 0,
    hp: 180,
    speed: 0.7,
    attackDamage: 1,
    attackInterval: 1,
    width: 104,
    height: 130
  }
}

// 游戏配置
export const gameConfig = {
  gridCols: 9,
  gridRows: 5,
  cellWidth: 104,      // 从80放大到104 (1.3倍)
  cellHeight: 140,     // 从100放大到140 (1.3倍)
  sunFallInterval: 10,    // 阳光自然掉落间隔（秒）
  zombieSpawnInterval: 10, // 僵尸生成间隔（秒）
  sunLifeTime: 8,         // 阳光存在时间（秒）
  sunValue: 25,           // 每次收集阳光数量
  zombieTypes: ['normal', 'conehead', 'buckethead', 'football', 'newspaper', 'dancing', 'balloon', 'pole'],  // 僵尸类型列表
  
  // 小推车配置
  lawnMowers: {
    enabled: true,
    col: 0,                // 小推车所在的列（最左边）
    triggerDistance: 10,   // 触发距离（像素）
    speed: 300,            // 移动速度（像素/秒）
    damage: 1000,          // 碾压伤害
    bgColor: '#9333ea',    // 紫红色背景
    borderColor: '#7c3aed' // 紫红色边框
  },
  
  // 波次配置
  waveConfigs: [
    {
      wave: 1,
      zombieGroups: [
        { type: 'normal', count: 3, interval: 8 }  // 第一波：3个普通僵尸，每8秒生成一个，给玩家充足准备时间
      ],
      sunBonus: 0,
      description: '初级波次'
    },
    {
      wave: 2,
      zombieGroups: [
        { type: 'normal', count: 6, interval: 5 },
        { type: 'conehead', count: 2, interval: 7 }
      ],
      sunBonus: 50,
      description: '路障僵尸出现'
    },
    {
      wave: 3,
      zombieGroups: [
        { type: 'normal', count: 10, interval: 4 },
        { type: 'conehead', count: 4, interval: 6 }
      ],
      sunBonus: 100,
      description: '大量僵尸'
    },
    {
      wave: 4,
      zombieGroups: [
        { type: 'normal', count: 15, interval: 3 },
        { type: 'conehead', count: 6, interval: 4 },
        { type: 'buckethead', count: 3, interval: 6 }
      ],
      sunBonus: 150,
      description: '铁桶僵尸出现'
    },
    {
      wave: 5,
      zombieGroups: [
        { type: 'normal', count: 20, interval: 2.5 },
        { type: 'conehead', count: 10, interval: 3 },
        { type: 'buckethead', count: 5, interval: 5 }
      ],
      sunBonus: 200,
      description: '最终决战'
    }
  ],
  
  // 音效配置
  sounds: {
    bgm: '/sounds/pvz_bgm.mp3',
    plant: '/sounds/plant_place.mp3',
    shoot: '/sounds/peashooter_shoot.mp3',
    hit: '/sounds/hit.mp3',
    zombieDeath: '/sounds/zombie_death.mp3',
    collectSun: '/sounds/collect_sun.mp3',
    explode: '/sounds/cherry_bomb.mp3',
    waveComplete: '/sounds/wave_complete.mp3',
    gameOver: '/sounds/game_over.mp3'
  }
}
