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
  }
}

// 僵尸配置表
export const zombieConfig = {
  normal: {
    id: 'normal',
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
    name: '铁桶僵尸',
    icon: '🗑️',
    hp: 1300,            // 200 + 1100护盾
    shieldHp: 1100,      // 铁桶护盾血量
    speed: 0.65,         // 移动速度（像素/帧）- 放大到1.3倍
    attackDamage: 1,
    attackInterval: 1,
    width: 104,          // 放大到1.3倍
    height: 130          // 放大到1.3倍
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
  zombieTypes: ['normal', 'conehead', 'buckethead'],  // 僵尸类型列表
  
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
