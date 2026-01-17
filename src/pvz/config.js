// 植物配置表
export const plantConfig = {
  sunflower: {
    id: 'sunflower',
    name: '向日葵',
    icon: '🌻',
    cost: 50,
    hp: 300,
    produceInterval: 24,  // 生产阳光间隔（秒）
    produceAmount: 25,    // 产生阳光数量
    cooldown: 5,          // 冷却时间（秒）
    width: 80,
    height: 100           // 调整为100，填满格子
  },
  peashooter: {
    id: 'peashooter',
    name: '豌豆射手',
    icon: '🌱',
    cost: 100,
    hp: 300,
    attackInterval: 1.5,  // 攻击间隔（秒）
    damage: 20,           // 伤害值
    projectileSpeed: 8,   // 子弹速度（像素/帧）
    cooldown: 5,
    width: 80,
    height: 100
  },
  snowPea: {
    id: 'snowPea',
    name: '寒冰射手',
    icon: '❄️',
    cost: 175,
    hp: 300,
    attackInterval: 1.5,  // 攻击间隔（秒）
    damage: 20,           // 伤害值
    projectileSpeed: 8,   // 子弹速度（像素/帧）
    slowDuration: 3,      // 减速持续时间（秒）
    slowFactor: 0.5,      // 减速系数（50%）
    cooldown: 5,
    width: 80,
    height: 100
  },
  nutWall: {
    id: 'nutWall',
    name: '坚果墙',
    icon: '🥔',
    cost: 50,
    hp: 4000,            // 高生命值
    cooldown: 20,        // 较长冷却时间
    width: 80,
    height: 100
  },
  cherryBomb: {
    id: 'cherryBomb',
    name: '樱桃炸弹',
    icon: '🍒',
    cost: 150,
    hp: 1000,            // 会立即爆炸
    explodeDelay: 1,     // 爆炸延迟（秒）
    explodeRadius: 120,  // 爆炸半径（像素）
    damage: 1800,        // 爆炸伤害
    cooldown: 30,        // 很长的冷却时间
    width: 80,
    height: 100
  }
}

// 僵尸配置表
export const zombieConfig = {
  normal: {
    id: 'normal',
    name: '普通僵尸',
    icon: '🧟',
    hp: 200,
    speed: 0.5,           // 移动速度（像素/帧）
    attackDamage: 1,      // 攻击伤害
    attackInterval: 1,    // 攻击间隔（秒）
    width: 80,
    height: 100
  },
  conehead: {
    id: 'conehead',
    name: '路障僵尸',
    icon: '🔺',
    hp: 560,             // 200 + 360护盾
    shieldHp: 360,       // 路障护盾血量
    speed: 0.5,
    attackDamage: 1,
    attackInterval: 1,
    width: 80,
    height: 100
  },
  buckethead: {
    id: 'buckethead',
    name: '铁桶僵尸',
    icon: '🗑️',
    hp: 1300,            // 200 + 1100护盾
    shieldHp: 1100,      // 铁桶护盾血量
    speed: 0.5,
    attackDamage: 1,
    attackInterval: 1,
    width: 80,
    height: 100
  }
}

// 游戏配置
export const gameConfig = {
  gridCols: 9,
  gridRows: 5,
  cellWidth: 80,
  cellHeight: 100,
  sunFallInterval: 10,    // 阳光自然掉落间隔（秒）
  zombieSpawnInterval: 10, // 僵尸生成间隔（秒）
  sunLifeTime: 8,         // 阳光存在时间（秒）
  sunValue: 25,           // 每次收集阳光数量
  zombieTypes: ['normal', 'conehead', 'buckethead'],  // 僵尸类型列表
  
  // 波次配置
  waveConfigs: [
    {
      wave: 1,
      zombieGroups: [
        { type: 'normal', count: 5, interval: 3 }  // 5个普通僵尸，每3秒生成一个
      ],
      sunBonus: 0,
      description: '初级波次'
    },
    {
      wave: 2,
      zombieGroups: [
        { type: 'normal', count: 8, interval: 2.5 },
        { type: 'conehead', count: 2, interval: 4 }
      ],
      sunBonus: 50,
      description: '路障僵尸出现'
    },
    {
      wave: 3,
      zombieGroups: [
        { type: 'normal', count: 10, interval: 2 },
        { type: 'conehead', count: 5, interval: 3 }
      ],
      sunBonus: 100,
      description: '大量僵尸'
    },
    {
      wave: 4,
      zombieGroups: [
        { type: 'normal', count: 15, interval: 1.5 },
        { type: 'conehead', count: 8, interval: 2 },
        { type: 'buckethead', count: 3, interval: 5 }
      ],
      sunBonus: 150,
      description: '铁桶僵尸出现'
    },
    {
      wave: 5,
      zombieGroups: [
        { type: 'normal', count: 20, interval: 1 },
        { type: 'conehead', count: 10, interval: 1.5 },
        { type: 'buckethead', count: 5, interval: 3 }
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
