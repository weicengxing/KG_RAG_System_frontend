import * as THREE from 'three'

const VIEW_WIDTH = 960
const VIEW_HEIGHT = 540
const HALF_WIDTH = VIEW_WIDTH / 2
const HALF_HEIGHT = VIEW_HEIGHT / 2

const hexToNumber = (value, fallback = 0xffffff) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return fallback
  const parsed = Number.parseInt(value.replace('#', ''), 16)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toWorldX = (x) => x - HALF_WIDTH
const toWorldY = (y) => HALF_HEIGHT - y

const makeMaterial = (color, options = {}) => new THREE.MeshStandardMaterial({
  color,
  roughness: options.roughness ?? 0.64,
  metalness: options.metalness ?? 0.08,
  transparent: options.transparent ?? false,
  opacity: options.opacity ?? 1,
  emissive: options.emissive ?? 0x000000,
  emissiveIntensity: options.emissiveIntensity ?? 0,
})

const disposeObject = (object) => {
  object.traverse((child) => {
    if (!child.isMesh) return
    child.geometry?.dispose()
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose())
    } else {
      child.material?.dispose()
    }
  })
}

const addBox = (group, width, height, depth, color, position, options = {}) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    makeMaterial(color, options),
  )
  mesh.position.set(...position)
  mesh.castShadow = options.castShadow ?? true
  mesh.receiveShadow = options.receiveShadow ?? true
  group.add(mesh)
  return mesh
}

const addSphere = (group, radius, color, position, options = {}) => {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 16),
    makeMaterial(color, options),
  )
  mesh.position.set(...position)
  mesh.castShadow = options.castShadow ?? true
  mesh.receiveShadow = options.receiveShadow ?? true
  group.add(mesh)
  return mesh
}

const addCylinder = (group, radiusTop, radiusBottom, height, color, position, rotation = [0, 0, 0], options = {}) => {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 16),
    makeMaterial(color, options),
  )
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)
  mesh.castShadow = options.castShadow ?? true
  mesh.receiveShadow = options.receiveShadow ?? true
  group.add(mesh)
  return mesh
}

export class FighterModelRenderer {
  constructor(container) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(VIEW_WIDTH, VIEW_HEIGHT, false)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.domElement.className = 'fighter-three-canvas'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.maxWidth = `${VIEW_WIDTH}px`
    this.renderer.domElement.style.aspectRatio = '16 / 9'
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.margin = '0 auto'

    this.scene = new THREE.Scene()
    this.camera = new THREE.OrthographicCamera(-HALF_WIDTH, HALF_WIDTH, HALF_HEIGHT, -HALF_HEIGHT, 0.1, 1800)
    this.camera.position.set(0, 0, 900)
    this.camera.lookAt(0, 0, 0)

    this.stageGroup = new THREE.Group()
    this.effectGroup = new THREE.Group()
    this.fighterGroup = new THREE.Group()
    this.scene.add(this.stageGroup, this.effectGroup, this.fighterGroup)

    const ambient = new THREE.HemisphereLight(0xffffff, 0x111827, 1.5)
    this.scene.add(ambient)
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(-260, 320, 520)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    this.scene.add(key)
    const rim = new THREE.DirectionalLight(0x93c5fd, 1.2)
    rim.position.set(360, 180, 420)
    this.scene.add(rim)

    this.currentMapId = ''
    this.container.innerHTML = ''
    this.container.appendChild(this.renderer.domElement)
  }

  destroy() {
    disposeObject(this.scene)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  render(state, catalog = {}) {
    const map = state?.map || catalog.maps?.stone
    if (!map) return
    if (map.id !== this.currentMapId) {
      this.currentMapId = map.id
      this.rebuildStage(map)
    }
    this.rebuildDynamic(state, catalog)
    this.renderer.render(this.scene, this.camera)
  }

  clearGroup(group) {
    for (const child of [...group.children]) {
      group.remove(child)
      disposeObject(child)
    }
  }

  rebuildStage(map) {
    this.clearGroup(this.stageGroup)
    this.scene.background = new THREE.Color(hexToNumber(map.sky, 0x172033))

    const backdrop = new THREE.Group()
    this.stageGroup.add(backdrop)
    addBox(backdrop, VIEW_WIDTH, VIEW_HEIGHT, 8, hexToNumber(map.sky, 0x172033), [0, 0, -90], { castShadow: false, receiveShadow: false })

    this.addMapProps(map)

    const floorHeight = VIEW_HEIGHT - map.groundY
    addBox(
      this.stageGroup,
      VIEW_WIDTH,
      floorHeight,
      90,
      hexToNumber(map.floor, 0x6b7280),
      [0, toWorldY(map.groundY + floorHeight / 2), 0],
    )
    addBox(this.stageGroup, map.rightWall - map.leftWall, 7, 28, 0xf8fafc, [toWorldX((map.leftWall + map.rightWall) / 2), toWorldY(map.groundY), 62], {
      transparent: true,
      opacity: 0.42,
      castShadow: false,
    })
    for (const wallX of [map.leftWall - 5, map.rightWall + 5]) {
      addBox(this.stageGroup, 10, 52, 36, 0xf8fafc, [toWorldX(wallX), toWorldY(map.groundY - 26), 34], {
        transparent: true,
        opacity: 0.32,
      })
    }

    for (const hazard of map.hazards || []) {
      const color = map.id === 'lava' ? 0xfb923c : 0x38bdf8
      addBox(
        this.stageGroup,
        hazard.width,
        Math.max(12, hazard.height),
        60,
        color,
        [toWorldX(hazard.x + hazard.width / 2), toWorldY(hazard.y + hazard.height / 2), 74],
        { transparent: true, opacity: 0.72, emissive: color, emissiveIntensity: 0.65 },
      )
    }

    for (const platform of map.platforms || []) {
      const platformGroup = new THREE.Group()
      platformGroup.position.set(toWorldX(platform.x + platform.width / 2), toWorldY(platform.y + platform.height / 2), 55)
      addBox(platformGroup, platform.width, platform.height, 54, 0xd1d5db, [0, 0, 0], { roughness: 0.48 })
      addBox(platformGroup, platform.width + 8, 7, 60, 0x111827, [0, -platform.height / 2 - 6, -4], { transparent: true, opacity: 0.45 })
      for (const offset of [-platform.width / 2 + 18, platform.width / 2 - 18]) {
        addCylinder(platformGroup, 5, 7, 42, 0x94a3b8, [offset, -30, -8])
      }
      this.stageGroup.add(platformGroup)
    }
  }

  addMapProps(map) {
    if (map.id === 'bamboo') {
      for (let x = 64; x < 930; x += 82) {
        const group = new THREE.Group()
        group.position.set(toWorldX(x), toWorldY(236), -12)
        addCylinder(group, 7, 9, 360, 0x245441, [0, 0, 0], [0, 0, 0], { roughness: 0.8 })
        addSphere(group, 34, 0x2f6f55, [4, 160, 0], { transparent: true, opacity: 0.72 })
        this.stageGroup.add(group)
      }
      return
    }
    if (map.id === 'lava') {
      for (let x = 0; x < VIEW_WIDTH; x += 88) {
        addBox(this.stageGroup, 46, 10, 16, 0xf97316, [toWorldX(x + 22), toWorldY(454 + Math.sin(x) * 8), 88], {
          transparent: true,
          opacity: 0.65,
          emissive: 0xf97316,
          emissiveIntensity: 0.6,
          castShadow: false,
        })
      }
      return
    }
    for (let x = 0; x < VIEW_WIDTH; x += 130) {
      const group = new THREE.Group()
      group.position.set(toWorldX(x + 46), toWorldY(214), -8)
      addBox(group, 40, 152, 44, 0x263244, [0, 0, 0], { transparent: true, opacity: 0.68 })
      addBox(group, 58, 18, 52, 0x94a3b8, [0, 84, 8], { transparent: true, opacity: 0.36 })
      this.stageGroup.add(group)
    }
  }

  rebuildDynamic(state, catalog) {
    this.clearGroup(this.effectGroup)
    this.clearGroup(this.fighterGroup)

    for (const projectile of state?.projectiles || []) {
      const group = new THREE.Group()
      group.position.set(toWorldX(projectile.x + projectile.width / 2), toWorldY(projectile.y + projectile.height / 2), 120)
      if (projectile.kind === 'blade_arc') {
        const color = hexToNumber(projectile.color, 0x38bdf8)
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(Math.max(12, projectile.width * 0.42), 4, 8, 40, Math.PI * 1.25),
          makeMaterial(color, { transparent: true, opacity: 0.78, emissive: color, emissiveIntensity: 0.9 }),
        )
        ring.rotation.z = projectile.vx >= 0 ? -0.25 : Math.PI + 0.25
        group.add(ring)
      } else {
        addBox(group, projectile.width, projectile.height, 20, hexToNumber(projectile.color, 0x38bdf8), [0, 0, 0], {
          transparent: true,
          opacity: 0.86,
          emissive: hexToNumber(projectile.color, 0x38bdf8),
          emissiveIntensity: 0.75,
        })
        addSphere(group, projectile.height * 0.8, 0xf8fafc, [projectile.width / 2, 0, 0], { transparent: true, opacity: 0.32 })
      }
      this.effectGroup.add(group)
    }

    for (const effect of state?.effects || []) {
      this.effectGroup.add(this.createEffect(effect))
    }

    for (const player of Object.values(state?.players || {})) {
      this.fighterGroup.add(this.createFighter(player, catalog.characters?.[player.characterId]))
    }
  }

  createEffect(effect) {
    const group = new THREE.Group()
    const color = hexToNumber(effect.color, 0xf8fafc)
    const maxTtl = effect.maxTtl || effect.ttl || 1
    const progress = 1 - Math.max(0, Math.min(1, effect.ttl / maxTtl))
    const opacity = Math.max(0.08, 0.64 * (1 - progress))
    group.position.set(toWorldX(effect.x + effect.width / 2), toWorldY(effect.y + effect.height / 2), 150)
    group.scale.x = effect.direction || 1
    const addSparkCloud = (count, radius, sparkColor = color) => {
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count
        const distance = radius * (0.35 + (i % 5) * 0.14) * (0.75 + progress)
        addSphere(
          group,
          Math.max(3, radius * 0.05 * (1 - progress * 0.45)),
          sparkColor,
          [Math.cos(angle) * distance, Math.sin(angle) * distance * 0.55, 16 + (i % 4) * 8],
          {
            transparent: true,
            opacity: opacity * 0.9,
            emissive: sparkColor,
            emissiveIntensity: 0.9,
            castShadow: false,
          },
        )
      }
    }

    if (['slash', 'cleave', 'wind_arc', 'wind_gain', 'wind_burst', 'shadow_cut', 'shadow_mark', 'air_slice', 'dash_light'].includes(effect.type)) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(16, effect.width * (0.34 + progress * 0.1)), effect.type === 'wind_burst' ? 6 : 4, 8, 44, Math.PI * (effect.type === 'wind_burst' ? 1.55 : 1.15)),
        makeMaterial(color, { transparent: true, opacity, emissive: color, emissiveIntensity: 0.85 }),
      )
      ring.scale.y = Math.max(0.18, effect.height / Math.max(1, effect.width))
      ring.rotation.z = -0.35
      group.add(ring)
      addSparkCloud(effect.type === 'wind_burst' ? 20 : 9, Math.max(18, effect.width * 0.22), 0xffffff)
    } else if (['jab', 'haymaker', 'rush', 'fury_burst', 'projectile_hit', 'block_spark', 'launcher'].includes(effect.type)) {
      addSphere(group, Math.max(10, effect.width * (0.22 + progress * 0.24)), color, [0, 0, 0], {
        transparent: true,
        opacity,
        emissive: color,
        emissiveIntensity: 0.8,
        castShadow: false,
      })
      addSparkCloud(effect.type === 'block_spark' ? 10 : 18, Math.max(22, effect.width * 0.38), effect.type === 'block_spark' ? 0xbfdbfe : 0xffffff)
    } else if (['quake', 'bulwark', 'bulwark_crash', 'guard_ring', 'shield_bash', 'guard_crush', 'air_slam', 'sweep'].includes(effect.type)) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(18, effect.width * (0.22 + progress * 0.28)), effect.type === 'bulwark_crash' ? 7 : 5, 8, 48),
        makeMaterial(effect.type === 'guard_ring' ? 0xfef3c7 : color, { transparent: true, opacity, emissive: color, emissiveIntensity: 0.55 }),
      )
      ring.scale.y = effect.type === 'sweep' ? 0.18 : 0.32
      group.add(ring)
      addSparkCloud(14, Math.max(24, effect.width * 0.28), effect.type === 'sweep' ? 0xcbd5e1 : color)
    } else if (effect.type === 'shadow_pop') {
      addBox(group, effect.width * 0.8, effect.height * 0.8, 16, color, [0, 0, 12], {
        transparent: true,
        opacity: opacity * 0.58,
        emissive: color,
        emissiveIntensity: 0.7,
      })
      addSparkCloud(20, Math.max(24, effect.width * 0.32), 0xf8fafc)
    } else if (['afterimage', 'blink'].includes(effect.type)) {
      addBox(group, effect.width, effect.height, 12, color, [0, 0, 0], {
        transparent: true,
        opacity: opacity * 0.55,
        emissive: color,
        emissiveIntensity: 0.45,
        castShadow: false,
      })
    } else {
      addSphere(group, Math.max(8, effect.width * 0.25), color, [0, 0, 0], {
        transparent: true,
        opacity,
        emissive: color,
        emissiveIntensity: 0.6,
      })
    }
    return group
  }

  createFighter(player, character) {
    const group = new THREE.Group()
    if (!character) return group
    const color = hexToNumber(character.color, 0x38bdf8)
    const accent = player.isAI ? 0xf8fafc : 0xfef3c7
    const x = toWorldX(player.x + character.width / 2)
    const y = toWorldY(player.y + character.height / 2)
    group.position.set(x, y, 130)
    group.scale.x = player.facing || 1
    if (player.attackVariant === 'sweep' || player.attackVariant === 'guard_crush') {
      group.scale.y = 0.88
      group.position.y -= character.height * 0.05
    } else if (player.attackVariant === 'launcher') {
      group.rotation.z = -0.08
      group.position.y += 8
    } else if (player.attackVariant === 'air_light' || player.attackVariant === 'air_heavy') {
      group.rotation.z = player.attackVariant === 'air_heavy' ? -0.16 : 0.12
    }

    const bodyHeight = character.height * 0.54
    addSphere(group, character.width * 0.28, 0xf8fafc, [0, character.height * 0.38, 12], { roughness: 0.34 })
    addBox(group, character.width * 0.58, bodyHeight, 34, color, [0, -character.height * 0.05, 0], {
      emissive: color,
      emissiveIntensity: player.attack === 'special' ? 0.25 : 0.06,
    })
    addCylinder(group, 5, 5, character.height * 0.36, 0x111827, [-character.width * 0.16, -character.height * 0.44, 0])
    addCylinder(group, 5, 5, character.height * 0.36, 0x111827, [character.width * 0.16, -character.height * 0.44, 0])
    addCylinder(group, 5, 5, character.width * 0.78, accent, [character.width * 0.34, character.height * 0.04, 10], [0, 0, Math.PI / 2])

    this.addRoleModel(group, player, character, color)
    this.addAttackModel(group, player, character, color)
    if (player.armorTimer > 0) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(character.width * 0.52, 3, 8, 36),
        makeMaterial(0xfef3c7, { transparent: true, opacity: 0.38, emissive: 0xfbbf24, emissiveIntensity: 0.4 }),
      )
      ring.position.set(0, -4, 42)
      group.add(ring)
    }
    if (player.fortifyTimer > 0) {
      addSphere(group, Math.max(character.width, character.height) * 0.42, 0xfbbf24, [0, 0, 18], {
        transparent: true,
        opacity: 0.14,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.3,
        castShadow: false,
      })
    }
    if (player.shadowMark > 0) {
      addSphere(group, character.width * 0.13, 0xc084fc, [0, character.height * 0.68, 42], {
        emissive: 0x8b5cf6,
        emissiveIntensity: 0.6,
      })
    }
    if (player.windStacks > 0) {
      for (let i = 0; i < player.windStacks; i += 1) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(character.width * (0.48 + i * 0.1), 2, 8, 34),
          makeMaterial(0x7dd3fc, { transparent: true, opacity: 0.22 + i * 0.06, emissive: 0x38bdf8, emissiveIntensity: 0.45 }),
        )
        ring.position.set(0, -6 + i * 9, 48 + i * 3)
        ring.rotation.x = Math.PI / 2
        group.add(ring)
      }
    }
    if (player.fury > 0) {
      addSphere(group, Math.max(character.width, character.height) * (0.2 + Math.min(0.22, player.fury / 450)), 0xef4444, [0, -2, 18], {
        transparent: true,
        opacity: Math.min(0.26, player.fury / 300),
        emissive: 0xef4444,
        emissiveIntensity: 0.55,
        castShadow: false,
      })
    }
    if (player.shadowStacks > 0) {
      for (let i = 0; i < player.shadowStacks; i += 1) {
        addBox(group, character.width * 0.42, character.height * 0.34, 6, 0xa78bfa, [-18 - i * 9, -2 + i * 8, -20], {
          transparent: true,
          opacity: 0.16,
          emissive: 0x8b5cf6,
          emissiveIntensity: 0.3,
        })
      }
    }
    if (player.bulwarkStacks > 0) {
      for (let i = 0; i < Math.floor(player.bulwarkStacks); i += 1) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(character.width * (0.55 + i * 0.12), 3, 8, 36),
          makeMaterial(0xfbbf24, { transparent: true, opacity: 0.22 + i * 0.05, emissive: 0xf59e0b, emissiveIntensity: 0.42 }),
        )
        ring.position.set(0, -4, 36 + i * 8)
        group.add(ring)
      }
    }
    if (player.blocking) {
      addBox(group, 12, character.height * 0.55, 18, 0x93c5fd, [character.width * 0.62, 0, 34], {
        transparent: true,
        opacity: 0.64,
        emissive: 0x3b82f6,
        emissiveIntensity: 0.4,
      })
    }

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(character.width * 0.55, 24),
      new THREE.MeshBasicMaterial({ color: 0x020617, transparent: true, opacity: 0.32 }),
    )
    shadow.position.set(0, -character.height * 0.54, -35)
    shadow.scale.y = 0.32
    group.add(shadow)
    return group
  }

  addRoleModel(group, player, character, color) {
    if (player.characterId === 'blade') {
      addBox(group, 9, character.height * 0.88, 10, 0xe5e7eb, [character.width * 0.62, 8, 30], {
        metalness: 0.45,
        roughness: 0.25,
      })
    } else if (player.characterId === 'fist') {
      addSphere(group, 13, 0xef4444, [character.width * 0.54, 4, 30], {
        emissive: 0xef4444,
        emissiveIntensity: 0.25,
      })
    } else if (player.characterId === 'shade') {
      addBox(group, character.width * 0.7, character.height * 0.54, 6, color, [-12, -2, -18], {
        transparent: true,
        opacity: 0.35,
      })
    } else if (player.characterId === 'guard') {
      addBox(group, 22, character.height * 0.68, 18, 0xfbbf24, [character.width * 0.54, -4, 22], {
        metalness: 0.2,
        roughness: 0.4,
      })
    }
  }

  addAttackModel(group, player, character, color) {
    if (!player.attack) return
    const attack = player.activeAttack || character.attacks?.[player.attack] || {}
    const range = attack.range || 80
    const attackColor = player.attack === 'heavy' || player.attackVariant === 'launcher' ? 0xfef3c7 : color
    const attackHeight = attack.area ? 58 : attack.low ? 18 : attack.launch ? character.height * 0.56 : (player.attack === 'heavy' ? 34 : 20)
    const attackY = attack.low ? -character.height * 0.35 : attack.launch ? character.height * 0.08 : 2
    addBox(group, range, attackHeight, 20, attackColor, [character.width / 2 + range / 2, attackY, 44], {
      transparent: true,
      opacity: player.attack === 'special' ? 0.46 : 0.28,
      emissive: attackColor,
      emissiveIntensity: 0.55,
      castShadow: false,
    })
    if (player.attack === 'heavy') {
      addSphere(group, 22, 0xfef3c7, [character.width / 2 + range, 2, 48], {
        transparent: true,
        opacity: 0.3,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.45,
      })
    }
    if (player.attack === 'special') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(Math.max(character.width, character.height) * 0.38, 4, 8, 32),
        makeMaterial(color, { transparent: true, opacity: 0.58, emissive: color, emissiveIntensity: 0.7 }),
      )
      ring.position.set(0, 0, 52)
      group.add(ring)
    }
  }
}
