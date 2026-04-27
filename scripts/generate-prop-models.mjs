import fs from 'node:fs/promises'
import path from 'node:path'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

const outDir = path.resolve('public/game-assets/models')

if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    async readAsArrayBuffer(blob) {
      this.result = await blob.arrayBuffer()
      this.onloadend?.()
    }
  }
}

const mat = (name, color, options = {}) => {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.02,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide
  })
  material.name = name
  return material
}

const mesh = (name, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
  const item = new THREE.Mesh(geometry, material)
  item.name = name
  item.position.set(...position)
  item.rotation.set(...rotation)
  item.scale.set(...scale)
  item.castShadow = true
  item.receiveShadow = true
  return item
}

const addGroundShadow = (group, radius) => {
  const shadow = mesh(
    'soft_ground_shadow',
    new THREE.CircleGeometry(radius, 32),
    new THREE.MeshBasicMaterial({ color: 0x102018, transparent: true, opacity: 0.15, depthWrite: false }),
    [0, 0.025, 0],
    [-Math.PI / 2, 0, 0],
    [1.25, 0.78, 1]
  )
  group.add(shadow)
}

const createCampfire = () => {
  const group = new THREE.Group()
  group.name = 'game_campfire'
  const stone = mat('campfire_stone', 0x77746b, { roughness: 0.96 })
  const ash = mat('campfire_ash', 0x2d2924, { roughness: 0.98 })
  const wood = mat('campfire_wood', 0x6b3f1a, { roughness: 0.9 })
  const ember = mat('campfire_ember', 0xff8a1f, { roughness: 0.4, emissive: 0xff7a18, emissiveIntensity: 0.9 })
  const flameOuter = new THREE.MeshBasicMaterial({ name: 'campfire_flame_outer', color: 0xff9f1c, transparent: true, opacity: 0.72, side: THREE.DoubleSide })
  const flameInner = new THREE.MeshBasicMaterial({ name: 'campfire_flame_inner', color: 0xfff1a8, transparent: true, opacity: 0.84, side: THREE.DoubleSide })

  group.add(mesh('ash_bed', new THREE.CylinderGeometry(0.62, 0.8, 0.12, 18), ash, [0, 0.06, 0]))
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2
    group.add(mesh(
      `fire_ring_stone_${i}`,
      new THREE.DodecahedronGeometry(0.17 + (i % 3) * 0.025, 0),
      stone,
      [Math.cos(angle) * 0.92, 0.16, Math.sin(angle) * 0.92],
      [0.2 * i, angle, 0.1],
      [1.18, 0.55, 0.86]
    ))
  }
  for (let i = 0; i < 4; i++) {
    group.add(mesh(
      `crossed_log_${i}`,
      new THREE.CylinderGeometry(0.09, 0.12, 1.28, 8),
      wood,
      [0, 0.25 + (i % 2) * 0.08, 0],
      [Math.PI / 2.35, (i / 4) * Math.PI, 0.1]
    ))
  }
  group.add(mesh('ember_core', new THREE.DodecahedronGeometry(0.34, 0), ember, [0, 0.34, 0], [0.2, 0.4, 0], [1, 0.45, 1]))
  group.add(mesh('flame_outer', new THREE.ConeGeometry(0.44, 1.08, 9), flameOuter, [0, 0.88, 0], [0.08, 0.22, -0.05]))
  group.add(mesh('flame_inner', new THREE.ConeGeometry(0.24, 0.74, 8), flameInner, [0.03, 0.78, 0.02], [-0.08, -0.18, 0.04]))
  const light = new THREE.PointLight(0xff9f1c, 1.15, 9)
  light.name = 'campfire_warm_light'
  light.position.set(0, 0.95, 0)
  group.add(light)
  addGroundShadow(group, 1.08)
  return group
}

const createStorage = () => {
  const group = new THREE.Group()
  group.name = 'game_tribe_storage'
  const wood = mat('storage_wood', 0x74481f, { roughness: 0.9 })
  const darkWood = mat('storage_dark_wood', 0x4d3119, { roughness: 0.94 })
  const rope = mat('storage_rope_cloth', 0xc6a46a, { roughness: 0.88 })
  const hide = mat('storage_tribe_banner', 0x8fb7ff, { roughness: 0.76, side: THREE.DoubleSide })
  const goods = mat('storage_goods', 0x9c6b36, { roughness: 0.88 })

  group.add(mesh('raised_round_platform', new THREE.CylinderGeometry(1.28, 1.5, 0.24, 10), wood, [0, 0.16, 0]))
  group.add(mesh('thatched_roof', new THREE.ConeGeometry(1.58, 1.08, 4), rope, [0, 1.9, 0], [0, Math.PI / 4, 0]))
  for (let i = 0; i < 4; i++) {
    const angle = Math.PI / 4 + (i / 4) * Math.PI * 2
    group.add(mesh(`storage_post_${i}`, new THREE.CylinderGeometry(0.08, 0.12, 1.58, 7), darkWood, [Math.cos(angle) * 0.98, 0.92, Math.sin(angle) * 0.98]))
  }
  const cratePositions = [[-0.42, 0.48, -0.18], [0.24, 0.52, 0.16], [0.02, 0.94, -0.22]]
  cratePositions.forEach((position, i) => {
    group.add(mesh(`stacked_crate_${i}`, new THREE.BoxGeometry(0.62, 0.46, 0.62), goods, position, [0, 0.18 * (i - 1), 0]))
  })
  group.add(mesh('hanging_hide_banner', new THREE.PlaneGeometry(0.72, 0.42), hide, [0, 1.16, 1.02], [0, Math.PI, 0]))
  group.add(mesh('banner_paint_stroke', new THREE.BoxGeometry(0.48, 0.055, 0.025), rope, [0, 1.16, 1.035]))
  addGroundShadow(group, 1.45)
  return group
}

const createWorkbench = () => {
  const group = new THREE.Group()
  group.name = 'game_tribe_workbench'
  const wood = mat('workbench_wood', 0x6e4722, { roughness: 0.9 })
  const darkWood = mat('workbench_dark_wood', 0x4b3119, { roughness: 0.94 })
  const stone = mat('workbench_stone_slab', 0x8c867d, { roughness: 0.94 })
  const flint = mat('workbench_flint_tool', 0xb9c2c7, { roughness: 0.36, metalness: 0.18 })
  const accent = mat('workbench_tribe_wrap', 0x8fb7ff, { roughness: 0.7 })

  group.add(mesh('thick_table_top', new THREE.BoxGeometry(2.35, 0.2, 1.12), wood, [0, 0.98, 0]))
  for (const x of [-0.86, 0.86]) {
    for (const z of [-0.36, 0.36]) {
      group.add(mesh(`splayed_leg_${x}_${z}`, new THREE.CylinderGeometry(0.08, 0.12, 0.98, 7), darkWood, [x, 0.49, z], [0.08 * Math.sign(z), 0, -0.08 * Math.sign(x)]))
    }
  }
  group.add(mesh('flat_knapping_stone', new THREE.BoxGeometry(0.84, 0.18, 0.62), stone, [-0.36, 1.18, 0.08], [0, -0.12, -0.05]))
  group.add(mesh('stone_axe_handle', new THREE.CylinderGeometry(0.04, 0.055, 0.92, 7), darkWood, [0.48, 1.2, -0.08], [0, 0, Math.PI / 2.55]))
  group.add(mesh('stone_axe_head', new THREE.BoxGeometry(0.28, 0.12, 0.18), flint, [0.72, 1.34, -0.08], [0, 0, 0.24]))
  group.add(mesh('bone_awl', new THREE.ConeGeometry(0.055, 0.62, 8), flint, [0.1, 1.2, 0.34], [Math.PI / 2.4, 0.5, 0]))
  group.add(mesh('colored_binding', new THREE.BoxGeometry(0.72, 0.07, 1.16), accent, [0, 1.11, 0]))
  addGroundShadow(group, 1.45)
  return group
}

const createTribeFlag = () => {
  const group = new THREE.Group()
  group.name = 'game_tribe_flag'
  const wood = mat('flag_wood_pole', 0x6b4a28, { roughness: 0.88 })
  const cloth = mat('flag_tribe_cloth', 0xfb7185, { roughness: 0.78, side: THREE.DoubleSide })
  const pale = mat('flag_oath_mark', 0xfff7df, { roughness: 0.66, side: THREE.DoubleSide })
  const stone = mat('flag_base_stone', 0x8a8178, { roughness: 0.94 })

  group.add(mesh('leaning_pole', new THREE.CylinderGeometry(0.055, 0.085, 3.35, 8), wood, [0, 1.68, 0], [0, 0, -0.06]))
  group.add(mesh('cloth_panel', new THREE.PlaneGeometry(1.28, 0.78, 4, 3), cloth, [0.6, 2.62, 0.02], [0, -0.08, 0]))
  group.add(mesh('oath_stripe', new THREE.PlaneGeometry(0.92, 0.08), pale, [0.62, 2.64, 0.035], [0, -0.08, 0]))
  group.add(mesh('top_marker', new THREE.ConeGeometry(0.2, 0.34, 6), cloth, [0, 3.48, 0]))
  group.add(mesh('lash_ring', new THREE.TorusGeometry(0.16, 0.025, 8, 18), pale, [0.04, 2.26, 0], [Math.PI / 2, 0, 0]))
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    group.add(mesh(`flag_anchor_stone_${i}`, new THREE.DodecahedronGeometry(0.12 + (i % 2) * 0.035, 0), stone, [Math.cos(angle) * 0.56, 0.08, Math.sin(angle) * 0.56], [0.1 * i, angle, 0], [1.15, 0.52, 0.86]))
  }
  addGroundShadow(group, 0.95)
  return group
}

const createResourceSite = () => {
  const group = new THREE.Group()
  group.name = 'game_resource_site'
  const wood = mat('resource_site_wood', 0x7a4a1f, { roughness: 0.9 })
  const crystal = mat('resource_site_region_marker', 0x5ecf93, { roughness: 0.62, emissive: 0x2f9f66, emissiveIntensity: 0.28 })
  const gold = mat('resource_site_control_ring', 0xf8df7b, { roughness: 0.58, emissive: 0x9f7a1c, emissiveIntensity: 0.18 })
  const cloth = mat('resource_site_tribe_cloth', 0x8fb7ff, { roughness: 0.74, side: THREE.DoubleSide })

  group.add(mesh('resource_plinth', new THREE.CylinderGeometry(0.86, 1.06, 0.18, 8), wood, [0, 0.09, 0]))
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    group.add(mesh(
      `region_shard_${i}`,
      new THREE.DodecahedronGeometry(0.22 + (i % 2) * 0.05, 0),
      crystal,
      [Math.cos(angle) * (0.25 + i * 0.045), 0.36 + (i % 3) * 0.12, Math.sin(angle) * (0.25 + i * 0.045)],
      [0.2 * i, angle, 0.1],
      [1.08, 0.75 + (i % 2) * 0.35, 0.85]
    ))
  }
  group.add(mesh('control_ring', new THREE.TorusGeometry(0.88, 0.035, 8, 28), gold, [0, 0.28, 0], [Math.PI / 2, 0, 0]))
  group.add(mesh('small_signal_cloth', new THREE.PlaneGeometry(0.42, 0.26), cloth, [0.56, 0.88, 0], [0, -0.18, 0]))
  addGroundShadow(group, 1.35)
  return group
}

const createMapMemory = () => {
  const group = new THREE.Group()
  group.name = 'game_map_memory'
  const stone = mat('memory_stone', 0x8a8f82, { roughness: 0.94 })
  const glow = mat('memory_trace_glow', 0xb59cff, { roughness: 0.5, emissive: 0x6f52ff, emissiveIntensity: 0.48 })
  const pale = mat('memory_carved_line', 0xfff0c2, { roughness: 0.72 })

  group.add(mesh('memory_flat_stone', new THREE.DodecahedronGeometry(0.78, 0), stone, [0, 0.24, 0], [0.18, 0.4, -0.08], [1.22, 0.38, 0.86]))
  group.add(mesh('memory_upright_tablet', new THREE.BoxGeometry(0.58, 0.96, 0.12), stone, [0, 0.92, -0.08], [-0.08, 0.12, 0]))
  group.add(mesh('memory_trace_arc', new THREE.TorusGeometry(0.48, 0.025, 8, 24, Math.PI * 1.35), glow, [0, 0.96, 0], [0, 0, -0.4]))
  group.add(mesh('memory_notch', new THREE.BoxGeometry(0.38, 0.035, 0.04), pale, [0, 1.08, 0.02], [0, 0.12, 0.18]))
  const light = new THREE.PointLight(0xb59cff, 0.42, 6)
  light.name = 'memory_soft_light'
  light.position.set(0, 1.0, 0)
  group.add(light)
  addGroundShadow(group, 1.05)
  return group
}

const createWorldEventRemnant = () => {
  const group = new THREE.Group()
  group.name = 'game_world_event_remnant'
  const char = mat('remnant_charred_wood', 0x2e251e, { roughness: 0.96 })
  const ember = mat('remnant_ember_trace', 0xffbe68, { roughness: 0.42, emissive: 0xff7a18, emissiveIntensity: 0.65 })
  const ash = mat('remnant_ash_stone', 0x77746b, { roughness: 0.98 })

  group.add(mesh('remnant_ash_bed', new THREE.CylinderGeometry(0.72, 0.98, 0.1, 10), ash, [0, 0.05, 0]))
  for (let i = 0; i < 4; i++) {
    group.add(mesh(`burnt_marker_${i}`, new THREE.CylinderGeometry(0.045, 0.075, 0.9 + i * 0.12, 6), char, [Math.cos(i) * 0.32, 0.45, Math.sin(i) * 0.32], [0.15, i * Math.PI / 2, 0.35]))
  }
  group.add(mesh('remnant_glow_core', new THREE.OctahedronGeometry(0.28, 0), ember, [0, 0.28, 0], [0.1, 0.4, 0], [1.1, 0.55, 1]))
  group.add(mesh('remnant_trace_ring', new THREE.TorusGeometry(0.78, 0.035, 8, 24), ember, [0, 0.18, 0], [Math.PI / 2, 0, 0]))
  const light = new THREE.PointLight(0xff9f1c, 0.48, 6)
  light.name = 'remnant_warm_light'
  light.position.set(0, 0.72, 0)
  group.add(light)
  addGroundShadow(group, 1.2)
  return group
}

const createDiplomacyCouncil = () => {
  const group = new THREE.Group()
  group.name = 'game_diplomacy_council'
  const stone = mat('council_stone_seat', 0x8a8178, { roughness: 0.94 })
  const gold = mat('council_signal_gold', 0xffd675, { roughness: 0.58, emissive: 0xb8861b, emissiveIntensity: 0.28 })
  const wood = mat('council_center_wood', 0x6b3f1a, { roughness: 0.9 })
  const cloth = mat('council_neutral_cloth', 0x7fe7ff, { roughness: 0.74, side: THREE.DoubleSide })

  group.add(mesh('council_center', new THREE.CylinderGeometry(0.42, 0.55, 0.22, 8), wood, [0, 0.12, 0]))
  group.add(mesh('council_signal_ring', new THREE.TorusGeometry(1.18, 0.035, 8, 36), gold, [0, 0.21, 0], [Math.PI / 2, 0, 0]))
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2
    group.add(mesh(`council_seat_${i}`, new THREE.BoxGeometry(0.42, 0.18, 0.28), stone, [Math.cos(angle) * 1.0, 0.13, Math.sin(angle) * 1.0], [0, -angle, 0]))
  }
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + 0.35
    group.add(mesh(`council_banner_${i}`, new THREE.PlaneGeometry(0.34, 0.5), cloth, [Math.cos(angle) * 0.72, 0.82, Math.sin(angle) * 0.72], [0, -angle + Math.PI / 2, 0]))
  }
  const light = new THREE.PointLight(0xffd675, 0.38, 7)
  light.name = 'council_soft_light'
  light.position.set(0, 0.65, 0)
  group.add(light)
  addGroundShadow(group, 1.55)
  return group
}

const createStandingRitual = () => {
  const group = new THREE.Group()
  group.name = 'game_standing_ritual'
  const chalk = mat('ritual_chalk_ring', 0xfff0c2, { roughness: 0.7, emissive: 0x8a6a24, emissiveIntensity: 0.12 })
  const flame = mat('ritual_small_flame', 0xff9f1c, { roughness: 0.4, emissive: 0xff7a18, emissiveIntensity: 0.8 })
  const stone = mat('ritual_stone_marker', 0x8c867b, { roughness: 0.96 })
  const cloth = mat('ritual_stance_cloth', 0xb59cff, { roughness: 0.74, side: THREE.DoubleSide })

  group.add(mesh('ritual_outer_ring', new THREE.TorusGeometry(1.15, 0.03, 8, 36), chalk, [0, 0.05, 0], [Math.PI / 2, 0, 0]))
  group.add(mesh('ritual_inner_ring', new THREE.TorusGeometry(0.58, 0.024, 8, 28), chalk, [0, 0.07, 0], [Math.PI / 2, 0, 0]))
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    group.add(mesh(`stance_stone_${i}`, new THREE.DodecahedronGeometry(0.16, 0), stone, [Math.cos(angle) * 0.82, 0.14, Math.sin(angle) * 0.82], [0, angle, 0], [1.18, 0.55, 0.82]))
  }
  group.add(mesh('ritual_center_flame', new THREE.ConeGeometry(0.16, 0.48, 8), flame, [0, 0.44, 0]))
  group.add(mesh('ritual_hanging_cloth', new THREE.PlaneGeometry(0.42, 0.32), cloth, [0, 0.72, 0.38], [0, Math.PI, 0]))
  const light = new THREE.PointLight(0xff9f1c, 0.4, 6)
  light.name = 'ritual_small_light'
  light.position.set(0, 0.55, 0)
  group.add(light)
  addGroundShadow(group, 1.35)
  return group
}

const createSacredFire = () => {
  const group = new THREE.Group()
  group.name = 'game_sacred_fire'
  const stone = mat('sacred_fire_dark_stone', 0x5f5a52, { roughness: 0.96 })
  const gold = mat('sacred_fire_blessed_rim', 0xffd675, { roughness: 0.54, emissive: 0xb8861b, emissiveIntensity: 0.24 })
  const ember = mat('sacred_fire_ember_core', 0xff8a1f, { roughness: 0.38, emissive: 0xff6a18, emissiveIntensity: 0.95 })
  const flameOuter = new THREE.MeshBasicMaterial({ name: 'sacred_fire_flame_outer', color: 0xff9f1c, transparent: true, opacity: 0.74, side: THREE.DoubleSide })
  const flameInner = new THREE.MeshBasicMaterial({ name: 'sacred_fire_flame_inner', color: 0xfff1a8, transparent: true, opacity: 0.86, side: THREE.DoubleSide })

  group.add(mesh('sacred_fire_basin', new THREE.CylinderGeometry(0.72, 0.92, 0.32, 12), stone, [0, 0.36, 0]))
  group.add(mesh('sacred_fire_rim', new THREE.TorusGeometry(0.74, 0.055, 8, 28), gold, [0, 0.54, 0], [Math.PI / 2, 0, 0]))
  group.add(mesh('sacred_fire_ember_bed', new THREE.OctahedronGeometry(0.34, 0), ember, [0, 0.6, 0], [0.2, 0.4, 0], [1.1, 0.46, 1]))
  group.add(mesh('sacred_fire_flame_outer', new THREE.ConeGeometry(0.34, 0.92, 9), flameOuter, [0, 1.08, 0], [0.08, 0.22, -0.05]))
  group.add(mesh('sacred_fire_flame_inner', new THREE.ConeGeometry(0.2, 0.62, 8), flameInner, [0.02, 1.0, 0.02], [-0.05, -0.18, 0.04]))
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2
    group.add(mesh(`sacred_fire_tripod_${i}`, new THREE.CylinderGeometry(0.035, 0.055, 1.42, 6), gold, [Math.cos(angle) * 0.62, 0.88, Math.sin(angle) * 0.62], [0.24 * Math.sin(angle), angle, 0.24 * Math.cos(angle)]))
  }
  const light = new THREE.PointLight(0xff9f1c, 0.95, 8)
  light.name = 'sacred_fire_warm_light'
  light.position.set(0, 1.05, 0)
  group.add(light)
  addGroundShadow(group, 1.15)
  return group
}

const createNeutralSanctuary = () => {
  const group = new THREE.Group()
  group.name = 'game_neutral_sanctuary'
  const stone = mat('sanctuary_pale_stone', 0xb8bec7, { roughness: 0.94 })
  const moss = mat('sanctuary_soft_moss', 0x79b66a, { roughness: 0.9 })
  const water = mat('sanctuary_quiet_water', 0x7fe7ff, { roughness: 0.42, emissive: 0x3ab7d8, emissiveIntensity: 0.32 })
  const cloth = mat('sanctuary_neutral_cloth', 0xfff0c2, { roughness: 0.72, side: THREE.DoubleSide })

  group.add(mesh('sanctuary_round_plinth', new THREE.CylinderGeometry(1.16, 1.34, 0.24, 12), stone, [0, 0.12, 0]))
  group.add(mesh('sanctuary_water_bowl', new THREE.CylinderGeometry(0.46, 0.58, 0.18, 12), water, [0, 0.38, 0]))
  group.add(mesh('sanctuary_back_stone_left', new THREE.BoxGeometry(0.32, 1.58, 0.32), stone, [-0.58, 0.95, -0.38], [0.04, 0.16, -0.08]))
  group.add(mesh('sanctuary_back_stone_right', new THREE.BoxGeometry(0.32, 1.58, 0.32), stone, [0.58, 0.95, -0.38], [-0.03, -0.18, 0.08]))
  group.add(mesh('sanctuary_capstone', new THREE.BoxGeometry(1.52, 0.26, 0.36), stone, [0, 1.76, -0.38], [0, 0.06, 0.04]))
  group.add(mesh('sanctuary_moss_patch', new THREE.TorusGeometry(0.92, 0.04, 8, 28), moss, [0, 0.27, 0], [Math.PI / 2, 0, 0]))
  group.add(mesh('sanctuary_prayer_cloth', new THREE.PlaneGeometry(0.46, 0.38), cloth, [0, 1.2, -0.18], [0, 0, 0]))
  const light = new THREE.PointLight(0x7fe7ff, 0.42, 7)
  light.name = 'sanctuary_calm_light'
  light.position.set(0, 0.85, 0)
  group.add(light)
  addGroundShadow(group, 1.45)
  return group
}

const createCollectionWall = () => {
  const group = new THREE.Group()
  group.name = 'game_collection_wall'
  const clay = mat('collection_wall_clay', 0x9b7653, { roughness: 0.96 })
  const wood = mat('collection_wall_wood_frame', 0x5b371b, { roughness: 0.92 })
  const hide = mat('collection_wall_memory_hide', 0xd8c16b, { roughness: 0.78, side: THREE.DoubleSide })
  const bone = mat('collection_wall_bone_tokens', 0xfff0c2, { roughness: 0.72 })
  const pigment = mat('collection_wall_pigment_mark', 0xb59cff, { roughness: 0.66, emissive: 0x6f52ff, emissiveIntensity: 0.18 })

  group.add(mesh('collection_wall_slab', new THREE.BoxGeometry(2.28, 1.36, 0.28), clay, [0, 0.88, 0]))
  group.add(mesh('collection_wall_top_beam', new THREE.CylinderGeometry(0.06, 0.08, 2.55, 7), wood, [0, 1.62, 0.12], [0, 0, Math.PI / 2]))
  group.add(mesh('collection_wall_bottom_beam', new THREE.CylinderGeometry(0.05, 0.07, 2.38, 7), wood, [0, 0.22, 0.12], [0, 0, Math.PI / 2]))
  group.add(mesh('collection_wall_hide_strip', new THREE.PlaneGeometry(0.44, 0.62), hide, [-0.62, 1.02, 0.16], [0, 0, 0.04]))
  group.add(mesh('collection_wall_mask', new THREE.DodecahedronGeometry(0.28, 0), bone, [0.12, 1.08, 0.18], [0.18, 0.2, 0], [0.82, 1.12, 0.34]))
  group.add(mesh('collection_wall_token_ring', new THREE.TorusGeometry(0.2, 0.025, 8, 18), pigment, [0.72, 0.92, 0.17], [0, 0.2, 0]))
  group.add(mesh('collection_wall_carved_line', new THREE.BoxGeometry(1.72, 0.045, 0.035), pigment, [0, 0.55, 0.17], [0, 0, -0.04]))
  addGroundShadow(group, 1.45)
  return group
}

const createSharedPuzzle = () => {
  const group = new THREE.Group()
  group.name = 'game_shared_puzzle'
  const stone = mat('puzzle_stone_table', 0x827a68, { roughness: 0.94 })
  const tile = mat('puzzle_bone_tiles', 0xfff0c2, { roughness: 0.74 })
  const glow = mat('puzzle_joined_glyphs', 0x7fe7ff, { roughness: 0.5, emissive: 0x35bde5, emissiveIntensity: 0.42 })
  const dark = mat('puzzle_shadow_gaps', 0x2d2924, { roughness: 0.98 })

  group.add(mesh('puzzle_round_table', new THREE.CylinderGeometry(1.08, 1.24, 0.24, 12), stone, [0, 0.36, 0]))
  for (let i = 0; i < 4; i++) {
    const x = i % 2 === 0 ? -0.28 : 0.28
    const z = i < 2 ? -0.28 : 0.28
    group.add(mesh(`puzzle_tile_${i}`, new THREE.BoxGeometry(0.5, 0.08, 0.5), tile, [x, 0.54, z], [0, (i - 1.5) * 0.08, 0]))
  }
  group.add(mesh('puzzle_cross_gap_x', new THREE.BoxGeometry(1.18, 0.045, 0.04), dark, [0, 0.6, 0]))
  group.add(mesh('puzzle_cross_gap_z', new THREE.BoxGeometry(0.04, 0.045, 1.18), dark, [0, 0.6, 0]))
  group.add(mesh('puzzle_glow_ring', new THREE.TorusGeometry(0.72, 0.028, 8, 30), glow, [0, 0.63, 0], [Math.PI / 2, 0, 0]))
  group.add(mesh('puzzle_glyph_line', new THREE.BoxGeometry(0.82, 0.04, 0.035), glow, [0, 0.68, 0], [0, 0.42, 0]))
  const light = new THREE.PointLight(0x7fe7ff, 0.35, 6)
  light.name = 'puzzle_soft_light'
  light.position.set(0, 0.82, 0)
  group.add(light)
  addGroundShadow(group, 1.35)
  return group
}

const createTrailMarker = () => {
  const group = new THREE.Group()
  group.name = 'game_trail_marker'
  const wood = mat('trail_marker_weathered_wood', 0x76502a, { roughness: 0.94 })
  const stone = mat('trail_marker_cairn_stone', 0x8c867d, { roughness: 0.96 })
  const cloth = mat('trail_marker_signal_cloth', 0x74d5ff, { roughness: 0.74, side: THREE.DoubleSide })
  const chalk = mat('trail_marker_chalk_cut', 0xfff0c2, { roughness: 0.72 })

  for (let i = 0; i < 4; i++) {
    group.add(mesh(`trail_marker_cairn_${i}`, new THREE.DodecahedronGeometry(0.28 - i * 0.035, 0), stone, [-0.34, 0.17 + i * 0.18, 0], [0.2 * i, 0.35 * i, -0.1], [1.08, 0.58, 0.88]))
  }
  group.add(mesh('trail_marker_post', new THREE.CylinderGeometry(0.055, 0.08, 1.55, 7), wood, [0.32, 0.78, 0], [0.03, 0, -0.07]))
  group.add(mesh('trail_marker_arrow_board', new THREE.BoxGeometry(0.92, 0.22, 0.08), wood, [0.62, 1.28, 0], [0, 0.18, 0.03]))
  group.add(mesh('trail_marker_notch', new THREE.BoxGeometry(0.34, 0.045, 0.09), chalk, [0.68, 1.3, 0.055], [0, 0.18, 0.03]))
  group.add(mesh('trail_marker_cloth_strip', new THREE.PlaneGeometry(0.28, 0.38), cloth, [0.2, 0.96, 0.08], [0, -0.12, 0]))
  addGroundShadow(group, 1.1)
  return group
}

const createNamedLandmark = () => {
  const group = new THREE.Group()
  group.name = 'game_named_landmark'
  const stone = mat('named_landmark_carved_stone', 0x8a8f82, { roughness: 0.96 })
  const inlay = mat('named_landmark_name_inlay', 0x7fe7ff, { roughness: 0.64, emissive: 0x35bde5, emissiveIntensity: 0.22 })
  const cloth = mat('named_landmark_tribe_wrap', 0xffd675, { roughness: 0.72, side: THREE.DoubleSide })

  group.add(mesh('named_landmark_base', new THREE.CylinderGeometry(0.72, 0.9, 0.22, 8), stone, [0, 0.11, 0]))
  group.add(mesh('named_landmark_upright', new THREE.BoxGeometry(0.58, 1.42, 0.28), stone, [0, 0.92, 0], [0.04, 0.18, -0.03]))
  group.add(mesh('named_landmark_cap', new THREE.ConeGeometry(0.42, 0.42, 5), stone, [0, 1.82, 0], [0, Math.PI / 5, 0]))
  group.add(mesh('named_landmark_name_plate', new THREE.BoxGeometry(0.48, 0.08, 0.04), inlay, [0, 1.08, 0.16], [0, 0.18, 0]))
  group.add(mesh('named_landmark_second_line', new THREE.BoxGeometry(0.36, 0.055, 0.04), inlay, [0, 0.86, 0.16], [0, 0.18, 0]))
  group.add(mesh('named_landmark_wrap', new THREE.TorusGeometry(0.34, 0.024, 8, 18), cloth, [0, 0.58, 0], [Math.PI / 2, 0, 0]))
  addGroundShadow(group, 1.2)
  return group
}

const createWorldRiddleSite = () => {
  const group = new THREE.Group()
  group.name = 'game_world_riddle_site'
  const stone = mat('riddle_weathered_stone', 0x6f756c, { roughness: 0.96 })
  const glyph = mat('riddle_luminous_glyph', 0xb59cff, { roughness: 0.54, emissive: 0x6f52ff, emissiveIntensity: 0.48 })
  const chalk = mat('riddle_chalk_ring', 0xfff0c2, { roughness: 0.72, emissive: 0x8a6a24, emissiveIntensity: 0.12 })

  group.add(mesh('riddle_outer_ring', new THREE.TorusGeometry(1.12, 0.032, 8, 36), chalk, [0, 0.06, 0], [Math.PI / 2, 0, 0]))
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    group.add(mesh(`riddle_standing_stone_${i}`, new THREE.BoxGeometry(0.22, 0.82 + (i % 2) * 0.24, 0.18), stone, [Math.cos(angle) * 0.88, 0.46, Math.sin(angle) * 0.88], [0.06 * i, -angle, -0.04 * i]))
  }
  group.add(mesh('riddle_center_glyph', new THREE.OctahedronGeometry(0.26, 0), glyph, [0, 0.46, 0], [0.2, 0.45, 0], [1, 0.32, 1]))
  group.add(mesh('riddle_glyph_bar', new THREE.BoxGeometry(0.74, 0.04, 0.04), glyph, [0, 0.72, 0], [0, 0.6, 0]))
  const light = new THREE.PointLight(0xb59cff, 0.42, 7)
  light.name = 'riddle_soft_light'
  light.position.set(0, 0.8, 0)
  group.add(light)
  addGroundShadow(group, 1.35)
  return group
}

const createOldCampEcho = () => {
  const group = new THREE.Group()
  group.name = 'game_old_camp_echo'
  const ash = mat('old_camp_cold_ash', 0x3f3a34, { roughness: 0.98 })
  const stone = mat('old_camp_weathered_stone', 0x77746b, { roughness: 0.96 })
  const wood = mat('old_camp_charred_wood', 0x2b211b, { roughness: 0.96 })
  const glow = mat('old_camp_memory_ember', 0xffbe68, { roughness: 0.5, emissive: 0xff7a18, emissiveIntensity: 0.45 })
  const cloth = mat('old_camp_faded_cloth', 0xd8c16b, { roughness: 0.82, side: THREE.DoubleSide })

  group.add(mesh('old_camp_ash_patch', new THREE.CylinderGeometry(0.82, 1.05, 0.08, 12), ash, [0, 0.04, 0]))
  for (let i = 0; i < 7; i++) {
    const angle = (i / 7) * Math.PI * 2
    group.add(mesh(`old_camp_ring_stone_${i}`, new THREE.DodecahedronGeometry(0.14 + (i % 2) * 0.035, 0), stone, [Math.cos(angle) * 0.82, 0.12, Math.sin(angle) * 0.82], [0.1 * i, angle, 0], [1.1, 0.52, 0.86]))
  }
  for (let i = 0; i < 3; i++) {
    group.add(mesh(`old_camp_collapsed_log_${i}`, new THREE.CylinderGeometry(0.06, 0.09, 1.05, 7), wood, [0.04 * i, 0.18, 0.04 * (i - 1)], [Math.PI / 2.35, (i / 3) * Math.PI, 0.12]))
  }
  group.add(mesh('old_camp_memory_coal', new THREE.OctahedronGeometry(0.18, 0), glow, [0, 0.28, 0], [0.2, 0.4, 0], [1, 0.42, 1]))
  group.add(mesh('old_camp_torn_marker', new THREE.PlaneGeometry(0.34, 0.42), cloth, [0.58, 0.66, -0.08], [0, -0.32, 0.08]))
  const light = new THREE.PointLight(0xff9f1c, 0.28, 5)
  light.name = 'old_camp_low_light'
  light.position.set(0, 0.42, 0)
  group.add(light)
  addGroundShadow(group, 1.25)
  return group
}

const createCaveReturnMark = () => {
  const group = new THREE.Group()
  group.name = 'game_cave_return_mark'
  const rock = mat('return_mark_cave_rock', 0x555a54, { roughness: 0.98 })
  const chalk = mat('return_mark_chalk_cut', 0xfff0c2, { roughness: 0.72, emissive: 0x8a6a24, emissiveIntensity: 0.14 })
  const ember = mat('return_mark_torch_ember', 0xff9f1c, { roughness: 0.44, emissive: 0xff7a18, emissiveIntensity: 0.58 })
  const rope = mat('return_mark_rope', 0xc8a66a, { roughness: 0.86 })

  group.add(mesh('return_mark_flat_rock', new THREE.DodecahedronGeometry(0.74, 0), rock, [0, 0.32, 0], [0.2, 0.4, -0.08], [1.22, 0.38, 0.86]))
  group.add(mesh('return_mark_upright_slab', new THREE.BoxGeometry(0.5, 0.92, 0.18), rock, [-0.16, 0.86, -0.08], [-0.08, 0.16, 0.04]))
  group.add(mesh('return_mark_chalk_arrow', new THREE.BoxGeometry(0.48, 0.055, 0.04), chalk, [-0.12, 0.98, 0.03], [0, 0.14, -0.24]))
  group.add(mesh('return_mark_chalk_notch', new THREE.BoxGeometry(0.24, 0.045, 0.04), chalk, [0.1, 1.1, 0.03], [0, 0.14, 0.34]))
  group.add(mesh('return_mark_torch_stub', new THREE.CylinderGeometry(0.035, 0.055, 0.72, 7), rope, [0.54, 0.42, 0.1], [0.24, 0.14, -0.22]))
  group.add(mesh('return_mark_torch_tip', new THREE.OctahedronGeometry(0.11, 0), ember, [0.62, 0.76, 0.12]))
  const light = new THREE.PointLight(0xff9f1c, 0.24, 4)
  light.name = 'return_mark_small_light'
  light.position.set(0.62, 0.78, 0.12)
  group.add(light)
  addGroundShadow(group, 1.1)
  return group
}

const createTravelerSong = () => {
  const group = new THREE.Group()
  group.name = 'game_traveler_song'
  const wood = mat('song_lyre_wood', 0x76502a, { roughness: 0.88 })
  const string = mat('song_bone_strings', 0xfff0c2, { roughness: 0.66 })
  const cloth = mat('song_traveler_cloth', 0xb59cff, { roughness: 0.74, side: THREE.DoubleSide })
  const glow = mat('song_echo_note', 0x7fe7ff, { roughness: 0.5, emissive: 0x35bde5, emissiveIntensity: 0.34 })

  group.add(mesh('song_ground_mat', new THREE.CylinderGeometry(0.78, 0.94, 0.06, 10), cloth, [0, 0.04, 0], [0, 0.22, 0], [1.2, 1, 0.72]))
  group.add(mesh('song_lyre_left_arm', new THREE.CylinderGeometry(0.045, 0.065, 1.18, 7), wood, [-0.34, 0.68, 0], [0, 0, -0.18]))
  group.add(mesh('song_lyre_right_arm', new THREE.CylinderGeometry(0.045, 0.065, 1.18, 7), wood, [0.34, 0.68, 0], [0, 0, 0.18]))
  group.add(mesh('song_lyre_crossbar', new THREE.CylinderGeometry(0.04, 0.055, 0.82, 7), wood, [0, 1.18, 0], [0, 0, Math.PI / 2]))
  for (let i = 0; i < 4; i++) {
    group.add(mesh(`song_string_${i}`, new THREE.CylinderGeometry(0.008, 0.01, 0.78, 5), string, [-0.18 + i * 0.12, 0.78, 0.03], [0, 0, 0.03 * (i - 1.5)]))
  }
  group.add(mesh('song_echo_ring', new THREE.TorusGeometry(0.5, 0.025, 8, 24, Math.PI * 1.35), glow, [0, 1.08, 0.08], [0, 0, -0.45]))
  group.add(mesh('song_small_note', new THREE.OctahedronGeometry(0.12, 0), glow, [0.56, 1.12, 0.02], [0.2, 0.4, 0]))
  const light = new THREE.PointLight(0x7fe7ff, 0.28, 5)
  light.name = 'song_soft_light'
  light.position.set(0, 1.05, 0.1)
  group.add(light)
  addGroundShadow(group, 1.05)
  return group
}

const createMutualAidAlert = () => {
  const group = new THREE.Group()
  group.name = 'game_mutual_aid_alert'
  const wood = mat('aid_alert_signal_wood', 0x5b371b, { roughness: 0.92 })
  const smoke = new THREE.MeshBasicMaterial({ name: 'aid_alert_smoke_plume', color: 0xb8bec7, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
  const ember = mat('aid_alert_signal_fire', 0xff8a1f, { roughness: 0.42, emissive: 0xff7a18, emissiveIntensity: 0.78 })
  const cloth = mat('aid_alert_help_cloth', 0x7fe7ff, { roughness: 0.74, side: THREE.DoubleSide })

  group.add(mesh('aid_alert_tripod_left', new THREE.CylinderGeometry(0.045, 0.07, 1.7, 7), wood, [-0.34, 0.84, 0], [0.24, 0, -0.28]))
  group.add(mesh('aid_alert_tripod_right', new THREE.CylinderGeometry(0.045, 0.07, 1.7, 7), wood, [0.34, 0.84, 0], [-0.24, 0, 0.28]))
  group.add(mesh('aid_alert_crossbar', new THREE.CylinderGeometry(0.04, 0.06, 1.04, 7), wood, [0, 1.42, 0], [0, 0, Math.PI / 2]))
  group.add(mesh('aid_alert_fire_bowl', new THREE.CylinderGeometry(0.34, 0.46, 0.16, 10), ember, [0, 0.36, 0]))
  group.add(mesh('aid_alert_smoke_low', new THREE.SphereGeometry(0.28, 10, 8), smoke, [0.05, 0.92, 0], [0, 0, 0], [1.1, 1.35, 0.82]))
  group.add(mesh('aid_alert_smoke_high', new THREE.SphereGeometry(0.22, 10, 8), smoke, [-0.06, 1.36, 0.03], [0, 0, 0], [0.9, 1.55, 0.75]))
  group.add(mesh('aid_alert_hanging_cloth', new THREE.PlaneGeometry(0.38, 0.42), cloth, [0.42, 1.08, 0.04], [0, -0.2, 0]))
  const light = new THREE.PointLight(0xff9f1c, 0.36, 5)
  light.name = 'aid_alert_fire_light'
  light.position.set(0, 0.52, 0)
  group.add(light)
  addGroundShadow(group, 1.15)
  return group
}

const createNomadVisitor = () => {
  const group = new THREE.Group()
  group.name = 'game_nomad_visitor'
  const cloth = mat('visitor_cloak_cloth', 0xe6c77a, { roughness: 0.76, side: THREE.DoubleSide })
  const dark = mat('visitor_shadow_body', 0x3b2a1b, { roughness: 0.88 })
  const pack = mat('visitor_pack_goods', 0x9a6936, { roughness: 0.86 })
  const shell = mat('visitor_shell_charm', 0xfff0c2, { roughness: 0.62, emissive: 0x8a6a24, emissiveIntensity: 0.08 })

  group.add(mesh('visitor_cloak_body', new THREE.ConeGeometry(0.42, 1.12, 8), cloth, [0, 0.72, 0]))
  group.add(mesh('visitor_head', new THREE.SphereGeometry(0.2, 10, 8), dark, [0, 1.38, 0]))
  group.add(mesh('visitor_staff', new THREE.CylinderGeometry(0.025, 0.04, 1.68, 7), dark, [0.52, 0.86, 0.02], [0.08, 0, -0.16]))
  group.add(mesh('visitor_pack', new THREE.BoxGeometry(0.36, 0.42, 0.3), pack, [-0.32, 0.72, -0.08], [0, 0.18, 0.05]))
  group.add(mesh('visitor_shell_charm', new THREE.TorusGeometry(0.12, 0.018, 8, 16), shell, [0.2, 1.02, 0.32], [Math.PI / 2, 0.1, 0]))
  group.add(mesh('visitor_ground_bundle', new THREE.CylinderGeometry(0.2, 0.24, 0.54, 8), pack, [-0.56, 0.2, 0.24], [Math.PI / 2, 0.2, Math.PI / 2]))
  addGroundShadow(group, 1.0)
  return group
}

const createTrialGround = () => {
  const group = new THREE.Group()
  group.name = 'game_trial_ground'
  const dirt = mat('trial_ground_packed_dirt', 0x8a6a43, { roughness: 0.98 })
  const stone = mat('trial_ground_score_stone', 0x8c867d, { roughness: 0.96 })
  const wood = mat('trial_ground_marker_wood', 0x76502a, { roughness: 0.9 })
  const green = mat('trial_ground_success_mark', 0x9be59d, { roughness: 0.7, emissive: 0x2f8f4b, emissiveIntensity: 0.16 })

  group.add(mesh('trial_ground_ring', new THREE.TorusGeometry(1.18, 0.035, 8, 36), green, [0, 0.07, 0], [Math.PI / 2, 0, 0]))
  group.add(mesh('trial_ground_dirt_pad', new THREE.CylinderGeometry(0.96, 1.08, 0.08, 12), dirt, [0, 0.04, 0]))
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
    group.add(mesh(`trial_ground_post_${i}`, new THREE.CylinderGeometry(0.045, 0.07, 0.96, 7), wood, [Math.cos(angle) * 0.86, 0.5, Math.sin(angle) * 0.86], [0.08 * Math.sin(angle), angle, 0.08 * Math.cos(angle)]))
  }
  group.add(mesh('trial_ground_center_stone', new THREE.DodecahedronGeometry(0.28, 0), stone, [0, 0.26, 0], [0.2, 0.4, 0], [1.08, 0.48, 0.9]))
  group.add(mesh('trial_ground_score_bar', new THREE.BoxGeometry(0.66, 0.055, 0.045), green, [0, 0.58, 0], [0, 0.4, 0]))
  const light = new THREE.PointLight(0x9be59d, 0.26, 5)
  light.name = 'trial_ground_soft_light'
  light.position.set(0, 0.7, 0)
  group.add(light)
  addGroundShadow(group, 1.35)
  return group
}

const createNaturalTree = () => {
  const group = new THREE.Group()
  group.name = 'game_natural_tree'
  const bark = mat('tree_bark_trunk', 0x71451f, { roughness: 0.94 })
  const leaf = mat('tree_leaf_canopy', 0x2f8f4b, { roughness: 0.86 })
  const darkLeaf = mat('tree_leaf_shadow', 0x1f6f3a, { roughness: 0.9 })

  group.add(mesh('knotted_trunk', new THREE.CylinderGeometry(0.2, 0.34, 3.15, 7), bark, [0, 1.58, 0], [0.02, 0, -0.05]))
  group.add(mesh('trunk_root_0', new THREE.CylinderGeometry(0.055, 0.1, 0.9, 6), bark, [0.34, 0.12, 0], [0, 0, Math.PI / 2.6]))
  group.add(mesh('trunk_root_1', new THREE.CylinderGeometry(0.055, 0.1, 0.82, 6), bark, [-0.28, 0.12, 0.24], [0.1, 0.9, -Math.PI / 2.8]))
  group.add(mesh('trunk_root_2', new THREE.CylinderGeometry(0.055, 0.1, 0.76, 6), bark, [-0.18, 0.12, -0.28], [-0.1, -0.8, -Math.PI / 2.7]))
  group.add(mesh('lower_canopy', new THREE.ConeGeometry(1.18, 2.0, 8), darkLeaf, [0, 3.0, 0], [0.02, 0.2, 0]))
  group.add(mesh('upper_canopy', new THREE.ConeGeometry(0.88, 1.72, 8), leaf, [0.08, 4.05, -0.04], [-0.03, -0.35, 0.02]))
  group.add(mesh('side_leaf_cluster', new THREE.SphereGeometry(0.58, 10, 8), leaf, [-0.55, 3.42, 0.12], [0, 0, 0], [1.15, 0.78, 0.95]))
  addGroundShadow(group, 1.45)
  return group
}

const createNaturalRock = () => {
  const group = new THREE.Group()
  group.name = 'game_natural_rock'
  const stone = mat('rock_weathered_stone', 0x8a8f82, { roughness: 0.98 })
  const edge = mat('rock_light_edges', 0xc1c7c9, { roughness: 0.92 })

  group.add(mesh('main_rock_mass', new THREE.DodecahedronGeometry(0.86, 0), stone, [0, 0.48, 0], [0.24, 0.45, -0.12], [1.18, 0.72, 0.94]))
  group.add(mesh('side_rock_chip', new THREE.DodecahedronGeometry(0.38, 0), stone, [-0.72, 0.24, 0.16], [-0.2, 0.9, 0.12], [1.05, 0.5, 0.85]))
  group.add(mesh('bright_fracture_face', new THREE.BoxGeometry(0.46, 0.06, 0.32), edge, [0.22, 0.78, 0.5], [0.55, 0.08, -0.12]))
  addGroundShadow(group, 1.0)
  return group
}

const createNaturalGrassTuft = () => {
  const group = new THREE.Group()
  group.name = 'game_natural_grass_tuft'
  const grass = mat('grass_blade_green', 0x4f9f3c, { roughness: 0.94, side: THREE.DoubleSide })
  const pale = mat('grass_seed_tip', 0x9be59d, { roughness: 0.82 })

  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2
    const height = 0.42 + (i % 4) * 0.08
    group.add(mesh(
      `grass_blade_${i}`,
      new THREE.ConeGeometry(0.045, height, 3),
      grass,
      [Math.cos(angle) * 0.18, height / 2, Math.sin(angle) * 0.18],
      [0.18 * Math.sin(angle), angle, 0.28 * Math.cos(angle)]
    ))
  }
  group.add(mesh('seed_head', new THREE.SphereGeometry(0.07, 8, 6), pale, [0.16, 0.62, -0.06], [0, 0, 0], [1, 0.7, 1]))
  return group
}

const createNaturalFlowerPatch = () => {
  const group = new THREE.Group()
  group.name = 'game_natural_flower_patch'
  const stem = mat('flower_stem_green', 0x347d39, { roughness: 0.88 })
  const pink = mat('flower_bloom_primary', 0xff8fab, { roughness: 0.62 })
  const yellow = mat('flower_bloom_secondary', 0xf4d35e, { roughness: 0.58 })

  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2
    const radius = i === 0 ? 0 : 0.24
    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    const height = 0.45 + (i % 2) * 0.12
    group.add(mesh(`flower_stem_${i}`, new THREE.CylinderGeometry(0.018, 0.028, height, 5), stem, [x, height / 2, z], [0.08 * Math.sin(angle), 0, 0.08 * Math.cos(angle)]))
    group.add(mesh(`flower_bloom_${i}`, new THREE.SphereGeometry(0.1, 8, 6), i % 2 ? yellow : pink, [x, height + 0.05, z], [0, 0, 0], [1.08, 0.7, 1.08]))
  }
  return group
}

const createRegionMarker = () => {
  const group = new THREE.Group()
  group.name = 'game_region_marker'
  const stone = mat('region_stone_base', 0x827a68, { roughness: 0.95 })
  const signal = mat('region_signal_face', 0x5ecf93, { roughness: 0.74, emissive: 0x2f8f4b, emissiveIntensity: 0.22 })
  const chalk = mat('region_chalk_inlay', 0xfff0c2, { roughness: 0.7 })

  group.add(mesh('region_round_base', new THREE.CylinderGeometry(1.02, 1.26, 0.2, 8), stone, [0, 0.1, 0]))
  group.add(mesh('region_upright_marker', new THREE.BoxGeometry(0.44, 1.36, 0.28), signal, [0, 0.86, 0], [0.04, 0.18, 0]))
  group.add(mesh('region_top_notch', new THREE.ConeGeometry(0.34, 0.45, 5), signal, [0, 1.68, 0], [0, Math.PI / 5, 0]))
  group.add(mesh('region_inlay_band', new THREE.BoxGeometry(0.5, 0.06, 0.04), chalk, [0, 1.12, 0.16]))
  group.add(mesh('region_ground_ring', new THREE.TorusGeometry(0.84, 0.032, 8, 28), signal, [0, 0.24, 0], [Math.PI / 2, 0, 0]))
  addGroundShadow(group, 1.35)
  return group
}

const createMigrationSite = () => {
  const group = new THREE.Group()
  group.name = 'game_migration_site'
  const wood = mat('migration_wood_frame', 0x76502a, { roughness: 0.9 })
  const hide = mat('migration_hide_bundle', 0xffb357, { roughness: 0.82, side: THREE.DoubleSide })
  const rope = mat('migration_rope_lashing', 0xc8a66a, { roughness: 0.86 })
  const ember = mat('migration_fire_seed', 0xff9f1c, { roughness: 0.45, emissive: 0xff7a18, emissiveIntensity: 0.65 })

  group.add(mesh('migration_pack_sled', new THREE.BoxGeometry(1.45, 0.16, 0.68), wood, [0, 0.22, 0], [0, 0.08, 0]))
  group.add(mesh('migration_hide_roll', new THREE.CylinderGeometry(0.2, 0.24, 1.18, 8), hide, [0.08, 0.52, 0], [Math.PI / 2, 0, Math.PI / 2]))
  group.add(mesh('migration_tripod_left', new THREE.CylinderGeometry(0.035, 0.055, 1.5, 6), wood, [-0.42, 0.84, 0], [0.24, 0, -0.28]))
  group.add(mesh('migration_tripod_right', new THREE.CylinderGeometry(0.035, 0.055, 1.5, 6), wood, [0.42, 0.84, 0], [-0.24, 0, 0.28]))
  group.add(mesh('migration_lash_ring', new THREE.TorusGeometry(0.2, 0.025, 8, 18), rope, [0, 1.32, 0], [Math.PI / 2, 0, 0]))
  group.add(mesh('migration_fire_seed', new THREE.OctahedronGeometry(0.16, 0), ember, [0, 0.74, 0.34]))
  const light = new THREE.PointLight(0xff9f1c, 0.3, 5)
  light.name = 'migration_fire_seed_light'
  light.position.set(0, 0.78, 0.34)
  group.add(light)
  addGroundShadow(group, 1.3)
  return group
}

const createNomadCaravan = () => {
  const group = new THREE.Group()
  group.name = 'game_nomad_caravan'
  const wood = mat('caravan_wood_cart', 0x7a4a1f, { roughness: 0.88 })
  const cloth = mat('caravan_trade_cloth', 0xe6c77a, { roughness: 0.74, side: THREE.DoubleSide })
  const goods = mat('caravan_trade_goods', 0x9a6936, { roughness: 0.88 })
  const wheel = mat('caravan_dark_wheel', 0x4d3119, { roughness: 0.92 })

  group.add(mesh('caravan_cart_bed', new THREE.BoxGeometry(1.55, 0.28, 0.88), wood, [0, 0.52, 0]))
  group.add(mesh('caravan_canvas_arch', new THREE.TorusGeometry(0.54, 0.045, 8, 18, Math.PI), cloth, [0, 0.94, 0], [0, Math.PI / 2, Math.PI]))
  group.add(mesh('caravan_canvas_panel', new THREE.PlaneGeometry(1.1, 0.62), cloth, [0, 0.92, -0.02], [0, 0, 0]))
  group.add(mesh('caravan_goods_crate_0', new THREE.BoxGeometry(0.42, 0.34, 0.42), goods, [-0.38, 0.82, 0.12], [0, 0.18, 0]))
  group.add(mesh('caravan_goods_crate_1', new THREE.BoxGeometry(0.38, 0.3, 0.38), goods, [0.28, 0.8, -0.16], [0, -0.22, 0]))
  for (const x of [-0.58, 0.58]) {
    for (const z of [-0.5, 0.5]) {
      group.add(mesh(`caravan_wheel_${x}_${z}`, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), wheel, [x, 0.32, z], [Math.PI / 2, 0, 0]))
    }
  }
  group.add(mesh('caravan_signal_flag', new THREE.PlaneGeometry(0.34, 0.26), cloth, [0.76, 1.35, 0], [0, -0.12, 0]))
  addGroundShadow(group, 1.35)
  return group
}

const createPlayerTorch = () => {
  const group = new THREE.Group()
  group.name = 'game_player_torch'
  const wood = mat('torch_wood_handle', 0x6b3f1a, { roughness: 0.88 })
  const ember = mat('torch_ember_wrap', 0xff9f1c, { roughness: 0.42, emissive: 0xff7a18, emissiveIntensity: 0.75 })
  const flame = new THREE.MeshBasicMaterial({ name: 'torch_flame', color: 0xffc45d, transparent: true, opacity: 0.74, side: THREE.DoubleSide })

  group.add(mesh('torch_handle', new THREE.CylinderGeometry(0.035, 0.045, 0.86, 7), wood, [0, 0.4, 0], [0.18, 0, -0.08]))
  group.add(mesh('torch_wrap', new THREE.CylinderGeometry(0.065, 0.075, 0.18, 8), ember, [0.03, 0.86, 0], [0.18, 0, -0.08]))
  group.add(mesh('torch_flame', new THREE.ConeGeometry(0.12, 0.34, 8), flame, [0.04, 1.08, 0], [0.08, 0.1, -0.05]))
  const light = new THREE.PointLight(0xff9f1c, 0.45, 4)
  light.name = 'torch_small_light'
  light.position.set(0.04, 1.02, 0)
  group.add(light)
  return group
}

const createPlayerStoneTool = () => {
  const group = new THREE.Group()
  group.name = 'game_player_stone_tool'
  const wood = mat('tool_wood_handle', 0x6e4722, { roughness: 0.9 })
  const flint = mat('tool_flint_head', 0xb9c2c7, { roughness: 0.38, metalness: 0.12 })
  const rope = mat('tool_rope_lash', 0xc8a66a, { roughness: 0.86 })

  group.add(mesh('stone_tool_handle', new THREE.CylinderGeometry(0.035, 0.045, 0.78, 7), wood, [0, 0.34, 0], [0, 0, Math.PI / 2.7]))
  group.add(mesh('stone_tool_head', new THREE.DodecahedronGeometry(0.16, 0), flint, [0.31, 0.5, 0], [0.2, 0.45, -0.1], [1.15, 0.72, 0.58]))
  group.add(mesh('stone_tool_lashing', new THREE.TorusGeometry(0.075, 0.012, 6, 12), rope, [0.2, 0.44, 0], [Math.PI / 2, 0.2, 0.1]))
  return group
}

const createPlayerScrollToken = () => {
  const group = new THREE.Group()
  group.name = 'game_player_scroll_token'
  const hide = mat('scroll_hide_panel', 0xd8c16b, { roughness: 0.76, side: THREE.DoubleSide })
  const bone = mat('scroll_bone_pin', 0xfff0c2, { roughness: 0.7 })
  const ink = mat('scroll_dark_mark', 0x3b2a1b, { roughness: 0.82 })

  group.add(mesh('scroll_panel', new THREE.PlaneGeometry(0.32, 0.42), hide, [0, 0.36, 0], [0, 0.2, 0]))
  group.add(mesh('scroll_top_pin', new THREE.CylinderGeometry(0.018, 0.02, 0.38, 6), bone, [0, 0.58, 0], [0, 0, Math.PI / 2]))
  group.add(mesh('scroll_bottom_pin', new THREE.CylinderGeometry(0.018, 0.02, 0.38, 6), bone, [0, 0.14, 0], [0, 0, Math.PI / 2]))
  group.add(mesh('scroll_mark_line', new THREE.BoxGeometry(0.22, 0.02, 0.012), ink, [0, 0.4, 0.012]))
  group.add(mesh('scroll_token_chip', new THREE.OctahedronGeometry(0.075, 0), bone, [0.2, 0.26, 0.02], [0, 0.2, 0]))
  return group
}

const exportGlb = async (name, object) => {
  const exporter = new GLTFExporter()
  const data = await new Promise((resolve, reject) => {
    exporter.parse(object, resolve, reject, { binary: true, trs: true })
  })
  await fs.writeFile(path.join(outDir, `${name}.glb`), Buffer.from(data))
}

await fs.mkdir(outDir, { recursive: true })
await exportGlb('campfire', createCampfire())
await exportGlb('tribe_storage', createStorage())
await exportGlb('tribe_workbench', createWorkbench())
await exportGlb('tribe_flag', createTribeFlag())
await exportGlb('resource_site', createResourceSite())
await exportGlb('map_memory', createMapMemory())
await exportGlb('world_event_remnant', createWorldEventRemnant())
await exportGlb('diplomacy_council', createDiplomacyCouncil())
await exportGlb('standing_ritual', createStandingRitual())
await exportGlb('sacred_fire', createSacredFire())
await exportGlb('neutral_sanctuary', createNeutralSanctuary())
await exportGlb('collection_wall', createCollectionWall())
await exportGlb('shared_puzzle', createSharedPuzzle())
await exportGlb('trail_marker', createTrailMarker())
await exportGlb('named_landmark', createNamedLandmark())
await exportGlb('world_riddle_site', createWorldRiddleSite())
await exportGlb('old_camp_echo', createOldCampEcho())
await exportGlb('cave_return_mark', createCaveReturnMark())
await exportGlb('traveler_song', createTravelerSong())
await exportGlb('mutual_aid_alert', createMutualAidAlert())
await exportGlb('nomad_visitor', createNomadVisitor())
await exportGlb('trial_ground', createTrialGround())
await exportGlb('natural_tree', createNaturalTree())
await exportGlb('natural_rock', createNaturalRock())
await exportGlb('natural_grass_tuft', createNaturalGrassTuft())
await exportGlb('natural_flower_patch', createNaturalFlowerPatch())
await exportGlb('region_marker', createRegionMarker())
await exportGlb('migration_site', createMigrationSite())
await exportGlb('nomad_caravan', createNomadCaravan())
await exportGlb('player_torch', createPlayerTorch())
await exportGlb('player_stone_tool', createPlayerStoneTool())
await exportGlb('player_scroll_token', createPlayerScrollToken())

console.log(`Generated prop GLB models in ${outDir}`)
