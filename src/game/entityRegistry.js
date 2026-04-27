import * as THREE from 'three'
import { createModelAssetInstance } from './modelAssets.js'
import { rngForKey } from './random.js'

const clamp01 = (v) => Math.max(0, Math.min(1, v))

const lerpColor = (a, b, t) => {
  const c1 = new THREE.Color(a)
  const c2 = new THREE.Color(b)
  c1.lerp(c2, clamp01(t))
  return c1
}

const colorJitter = (baseColor, rng, amount = 0.12) => {
  const c = new THREE.Color(baseColor)
  const hsl = { h: 0, s: 0, l: 0 }
  c.getHSL(hsl)
  hsl.h = (hsl.h + (rng() - 0.5) * amount) % 1
  hsl.s = clamp01(hsl.s + (rng() - 0.5) * amount)
  hsl.l = clamp01(hsl.l + (rng() - 0.5) * amount)
  return new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l)
}

const oathColor = (key, fallback) => ({
  hearth: 0xffb357,
  trail: 0x74d5ff,
  trade: 0xd8c16b,
  beast: 0x9be59d
}[key] || fallback)

const addGroundShadow = (group, rng, radius = 1.4, opacity = 0.18) => {
  const material = new THREE.MeshBasicMaterial({
    color: 0x102018,
    transparent: true,
    opacity,
    depthWrite: false
  })
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), material)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.set((rng() - 0.5) * 0.08, 0.018, (rng() - 0.5) * 0.08)
  shadow.scale.set(1.2 + rng() * 0.4, 0.75 + rng() * 0.25, 1)
  group.add(shadow)
}

const polishModel = (object, rng, { groundShadow = false, shadowRadius = 1.4, castShadow = true, receiveShadow = true } = {}) => {
  if (!object) return object
  object.traverse((child) => {
    if (!child.isMesh) return
    const material = Array.isArray(child.material) ? child.material[0] : child.material
    const transparent = material?.transparent && material?.opacity < 0.75
    child.castShadow = castShadow && !transparent
    child.receiveShadow = receiveShadow && !transparent
    if (material && 'envMapIntensity' in material) material.envMapIntensity = 0.28
  })
  if (groundShadow && object.isGroup) addGroundShadow(object, rng, shadowRadius)
  return object
}

const createAssetBackedEntity = (assetKey, fallback, rng, transform = {}) => {
  const holder = new THREE.Group()
  const fallbackSlot = new THREE.Group()
  fallbackSlot.name = `${assetKey}_fallback`
  fallbackSlot.add(fallback)
  holder.add(fallbackSlot)

  createModelAssetInstance(assetKey)
    .then((model) => {
      if (holder.userData.disposed) {
        disposeObject3D(model)
        return
      }
      if (typeof transform.scale === 'number') {
        model.scale.setScalar(transform.scale * (transform.assetScale || 1))
      }
      if (Array.isArray(transform.position)) model.position.set(...transform.position)
      if (Array.isArray(transform.rotation)) model.rotation.set(...transform.rotation)
      if (typeof transform.rotationY === 'number') model.rotation.y = transform.rotationY
      model.name = `${assetKey}_glb`
      holder.remove(fallbackSlot)
      disposeObject3D(fallbackSlot)
      holder.add(model)
      polishModel(model, rng, { ...(transform.polish || {}), groundShadow: false })
    })
    .catch((error) => {
      console.warn(`Failed to load model asset "${assetKey}"`, error)
    })

  return holder
}

export function getEntityCollider(entity, globalSeed = 0) {
  if (!entity) return null
  const type = entity.type
  const id = entity.id || `${type}_${entity.x}_${entity.z}`

  if (type === 'mountain') {
    const radius = typeof entity.radius === 'number' ? entity.radius : 12
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: Math.max(4, radius * 0.95) }
  }

  const rng = rngForKey(id, globalSeed)

  if (type === 'rock') {
    const baseSize = typeof entity.size === 'number' ? entity.size : rng() * 0.9 + 0.6
    const scaleX = 0.85 + rng() * 0.6
    const scaleZ = 0.85 + rng() * 0.6
    const radius = Math.max(0.5, baseSize * Math.max(scaleX, scaleZ) * 0.9)
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius }
  }

  if (type === 'tree') {
    const scale = typeof entity.size === 'number' ? entity.size : rng() * 0.6 + 0.85
    const radius = Math.max(0.8, 1.15 * scale)
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius }
  }

  if (type === 'campfire') {
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.6 }
  }

  if (type === 'ruin') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 2.4 * scale }
  }

  if (type === 'crystal') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.1 * scale }
  }

  if (type === 'tribe_totem') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.4 * scale }
  }

  if (type === 'tribe_storage') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.75 * scale }
  }

  if (type === 'tribe_workbench') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.6 * scale }
  }

  if (type === 'tribe_hut') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 2.25 * scale }
  }

  if (type === 'tribe_fence') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 2.2 * scale }
  }

  if (type === 'tribe_road') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.8 * scale }
  }

  if (type === 'tribe_flag') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.3 * scale }
  }

  if (type === 'tribe_beast_marker') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.45 * scale }
  }

  if (type === 'scouted_resource_site' || type === 'controlled_resource_site' || type === 'trade_route_site' || type === 'world_event_remnant' || type === 'diplomacy_council_site') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 1.8 * scale }
  }

  if (type === 'cave_entrance') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    return { id, type, x: entity.x || 0, z: entity.z || 0, radius: 2.7 * scale }
  }

  return null
}

export function createEntityMesh(entity, globalSeed = 0) {
  if (!entity) return null
  const type = entity.type
  const id = entity.id || `${type}_${entity.x}_${entity.z}`
  const rng = rngForKey(id, globalSeed)

  if (type === 'tree') {
    const scale = typeof entity.size === 'number' ? entity.size : rng() * 0.6 + 0.85

    const trunkHeight = (3.2 + rng() * 1.6) * scale
    const trunkTop = (0.22 + rng() * 0.12) * scale
    const trunkBottom = trunkTop + (0.12 + rng() * 0.18) * scale

    const foliageKind = rng() < 0.55 ? 'cone' : 'sphere'
    const foliageHeight = (3.3 + rng() * 2.0) * scale
    const foliageRadius = (1.2 + rng() * 1.1) * scale

    const tree = new THREE.Group()

    const trunkBaseColor = typeof entity.trunkColor === 'number' ? entity.trunkColor : 0x7a4a1f
    const trunkGeometry = new THREE.CylinderGeometry(trunkTop, trunkBottom, trunkHeight, 7)
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: colorJitter(trunkBaseColor, rng, 0.08) })
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    trunk.position.y = trunkHeight / 2
    trunk.castShadow = true
    trunk.receiveShadow = true
    tree.add(trunk)

    let foliageGeometry
    if (foliageKind === 'cone') {
      foliageGeometry = new THREE.ConeGeometry(foliageRadius, foliageHeight, 7)
    } else {
      foliageGeometry = new THREE.SphereGeometry(foliageRadius, 10, 10)
    }
    const foliageBaseColor =
      typeof entity.foliageColor === 'number' ? new THREE.Color(entity.foliageColor) : lerpColor(0x1f7a2e, 0x2a8f3d, rng())
    const foliageColor = foliageBaseColor
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: colorJitter(foliageColor, rng, 0.1) })
    const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial)
    foliage.position.y = trunkHeight + foliageHeight * 0.45
    foliage.castShadow = true
    foliage.receiveShadow = true
    tree.add(foliage)

    const crown = new THREE.Mesh(new THREE.SphereGeometry(foliageRadius * 0.72, 9, 8), foliageMaterial)
    crown.position.set((rng() - 0.5) * foliageRadius * 0.5, trunkHeight + foliageHeight * 0.76, (rng() - 0.5) * foliageRadius * 0.5)
    crown.scale.set(1.1, 0.72, 1)
    tree.add(crown)

    for (let i = 0; i < 3; i++) {
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.09 * scale, 0.9 * scale, 5), trunkMaterial)
      root.position.y = 0.12 * scale
      root.rotation.z = Math.PI / 2.7
      root.rotation.y = (i / 3) * Math.PI * 2 + rng() * 0.35
      tree.add(root)
    }

    tree.rotation.y = rng() * Math.PI * 2
    return polishModel(tree, rng, { groundShadow: true, shadowRadius: foliageRadius * 0.82 })
  }

  if (type === 'rock') {
    const baseSize = typeof entity.size === 'number' ? entity.size : rng() * 0.9 + 0.6
    const geometry = new THREE.DodecahedronGeometry(baseSize, 0)
    const material = new THREE.MeshStandardMaterial({
      color: colorJitter(typeof entity.color === 'number' ? entity.color : 0x7b7b7b, rng, 0.12),
      roughness: 0.95,
      metalness: 0.05
    })
    const rock = new THREE.Mesh(geometry, material)
    rock.castShadow = true
    rock.receiveShadow = true
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
    rock.scale.set(0.85 + rng() * 0.6, 0.75 + rng() * 0.8, 0.85 + rng() * 0.6)
    return polishModel(rock, rng)
  }

  if (type === 'grass') {
    const group = new THREE.Group()
    const bladeCount = 4 + Math.floor(rng() * 4)
    const material = new THREE.MeshStandardMaterial({
      color: colorJitter(typeof entity.color === 'number' ? entity.color : 0x4f9f3c, rng, 0.18),
      roughness: 0.9,
      metalness: 0
    })

    for (let i = 0; i < bladeCount; i++) {
      const height = 0.45 + rng() * 0.45
      const geometry = new THREE.ConeGeometry(0.05 + rng() * 0.03, height, 3)
      const blade = new THREE.Mesh(geometry, material)
      blade.position.set((rng() - 0.5) * 0.7, height / 2, (rng() - 0.5) * 0.7)
      blade.rotation.set((rng() - 0.5) * 0.35, rng() * Math.PI * 2, (rng() - 0.5) * 0.35)
      group.add(blade)
    }

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { castShadow: false })
  }

  if (type === 'flower') {
    const group = new THREE.Group()
    const stemGeometry = new THREE.CylinderGeometry(0.025, 0.035, 0.55, 5)
    const stemMaterial = new THREE.MeshStandardMaterial({ color: colorJitter(0x347d39, rng, 0.1) })
    const stem = new THREE.Mesh(stemGeometry, stemMaterial)
    stem.position.y = 0.28
    group.add(stem)

    const bloomColor = typeof entity.color === 'number' ? entity.color : rng() < 0.5 ? 0xf4d35e : 0xff8fab
    const bloomMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(bloomColor, rng, 0.12),
      roughness: 0.6
    })
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), bloomMaterial)
    bloom.position.y = 0.62
    group.add(bloom)

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { castShadow: false })
  }

  if (type === 'campfire') {
    const group = new THREE.Group()
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: colorJitter(0x78756d, rng, 0.12), roughness: 0.95 })
    const logMaterial = new THREE.MeshStandardMaterial({ color: colorJitter(0x6b3f1a, rng, 0.08), roughness: 0.9 })

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.23 + rng() * 0.06, 0), stoneMaterial)
      stone.position.set(Math.cos(angle) * 0.95, 0.16, Math.sin(angle) * 0.95)
      stone.scale.set(1, 0.55 + rng() * 0.25, 0.8 + rng() * 0.4)
      group.add(stone)
    }

    for (let i = 0; i < 3; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.25, 7), logMaterial)
      log.position.y = 0.22
      log.rotation.z = Math.PI / 2
      log.rotation.y = (i / 3) * Math.PI
      group.add(log)
    }

    const flameMaterial = new THREE.MeshBasicMaterial({
      color: colorJitter(0xffa62b, rng, 0.05),
      transparent: true,
      opacity: 0.86
    })
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.05, 8), flameMaterial)
    flame.position.y = 0.82
    group.add(flame)

    const glow = new THREE.PointLight(0xff9f1c, 1.2, 13)
    glow.position.y = 1.15
    group.add(glow)

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 1.2 })
  }

  if (type === 'ruin') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const material = new THREE.MeshStandardMaterial({
      color: colorJitter(0x8a8f82, rng, 0.08),
      roughness: 0.96,
      metalness: 0.02
    })

    const base = new THREE.Mesh(new THREE.BoxGeometry(4.2 * scale, 0.35 * scale, 2.4 * scale), material)
    base.position.y = 0.18 * scale
    group.add(base)

    for (let i = 0; i < 3; i++) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.3 * scale, (1.3 + rng() * 1.2) * scale, 7), material)
      column.position.set((-1.35 + i * 1.35) * scale, column.geometry.parameters.height / 2 + 0.35 * scale, -0.58 * scale)
      column.rotation.z = (rng() - 0.5) * 0.18
      group.add(column)
    }

    const slab = new THREE.Mesh(new THREE.BoxGeometry(2.2 * scale, 0.28 * scale, 0.55 * scale), material)
    slab.position.set(0.2 * scale, 1.55 * scale, -0.58 * scale)
    slab.rotation.z = -0.16
    group.add(slab)

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 2.2 })
  }

  if (type === 'crystal') {
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const color = typeof entity.color === 'number' ? entity.color : 0x65d6ff
    const group = new THREE.Group()
    const material = new THREE.MeshStandardMaterial({
      color: colorJitter(color, rng, 0.08),
      emissive: new THREE.Color(color).multiplyScalar(0.55),
      roughness: 0.18,
      metalness: 0.05,
      transparent: true,
      opacity: 0.82
    })
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.8 * scale, 0), material)
    crystal.position.y = 0.95 * scale
    crystal.scale.set(0.75, 1.55, 0.75)
    group.add(crystal)

    const glow = new THREE.PointLight(color, 0.85, 10 * scale)
    glow.position.y = 1.2 * scale
    group.add(glow)

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 1.25 })
  }

  if (type === 'mountain') {
    const radius = typeof entity.radius === 'number' ? entity.radius : 12
    const height = typeof entity.height === 'number' ? entity.height : 25
    const geometry = new THREE.ConeGeometry(radius, height, 10, 1)
    const material = new THREE.MeshStandardMaterial({
      color: colorJitter(0x4c6b3c, rng, 0.08),
      roughness: 0.95,
      metalness: 0.02
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = false
    mesh.receiveShadow = true
    mesh.rotation.y = rng() * Math.PI * 2
    return polishModel(mesh, rng)
  }

  if (type === 'tribe_totem') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const oathTint = oathColor(entity.oathKey, 0xf4d35e)
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x7a4a1f, rng, 0.08),
      roughness: 0.9
    })
    const markMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(oathTint, rng, 0.05),
      emissive: new THREE.Color(oathTint).multiplyScalar(0.3),
      roughness: 0.45
    })

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.28 * scale, 4.2 * scale, 7), woodMaterial)
    pole.position.y = 2.1 * scale
    group.add(pole)

    const cross = new THREE.Mesh(new THREE.BoxGeometry(1.8 * scale, 0.22 * scale, 0.24 * scale), woodMaterial)
    cross.position.y = 3.1 * scale
    cross.rotation.z = 0.12
    group.add(cross)

    const mask = new THREE.Mesh(new THREE.DodecahedronGeometry(0.52 * scale, 0), markMaterial)
    mask.position.y = 2.35 * scale
    mask.scale.set(0.75, 1.15, 0.35)
    group.add(mask)

    if (entity.oathKey) {
      const oathRing = new THREE.Mesh(new THREE.TorusGeometry(0.72 * scale, 0.035 * scale, 8, 24), markMaterial)
      oathRing.position.y = 1.45 * scale
      oathRing.rotation.x = Math.PI / 2
      group.add(oathRing)
    }

    const glow = new THREE.PointLight(oathTint, 0.75, 9 * scale)
    glow.position.y = 2.7 * scale
    group.add(glow)

    group.rotation.y = rng() * Math.PI * 2
    const fallback = polishModel(group, rng, { groundShadow: true, shadowRadius: 1.15 })
    const holder = createAssetBackedEntity('tribeTotem', fallback, rng, {
      scale,
      assetScale: 14,
      rotationY: group.rotation.y,
      polish: { groundShadow: true, shadowRadius: 1.15 }
    })
    return holder
  }

  if (type === 'tribe_storage') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x7b4b20, rng, 0.08),
      roughness: 0.9
    })
    const ropeMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0xc8a66a, rng, 0.06),
      roughness: 0.85
    })
    const crateMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x9a6936, rng, 0.08),
      roughness: 0.88
    })

    const platform = new THREE.Mesh(new THREE.CylinderGeometry(1.25 * scale, 1.45 * scale, 0.25 * scale, 7), woodMaterial)
    platform.position.y = 0.12 * scale
    group.add(platform)

    for (let i = 0; i < 4; i++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.11 * scale, 1.5 * scale, 6), woodMaterial)
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4
      post.position.set(Math.cos(angle) * 0.95 * scale, 0.8 * scale, Math.sin(angle) * 0.95 * scale)
      group.add(post)
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.45 * scale, 1.1 * scale, 4), ropeMaterial)
    roof.position.y = 1.85 * scale
    roof.rotation.y = Math.PI / 4
    group.add(roof)

    for (let i = 0; i < 3; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65 * scale, 0.5 * scale, 0.65 * scale), crateMaterial)
      crate.position.set((-0.45 + i * 0.45) * scale, 0.43 * scale, (rng() - 0.5) * 0.45 * scale)
      crate.rotation.y = (rng() - 0.5) * 0.35
      group.add(crate)
    }

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 1.45 })
  }

  if (type === 'tribe_workbench') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x6e4722, rng, 0.08),
      roughness: 0.9
    })
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x8c867d, rng, 0.08),
      roughness: 0.94
    })
    const toolMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0xb9c2c7, rng, 0.06),
      roughness: 0.35,
      metalness: 0.2
    })

    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(2.2 * scale, 0.18 * scale, 1.1 * scale), woodMaterial)
    tableTop.position.y = 1.0 * scale
    group.add(tableTop)

    for (const x of [-0.82, 0.82]) {
      for (const z of [-0.34, 0.34]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 1.0 * scale, 5), woodMaterial)
        leg.position.set(x * scale, 0.5 * scale, z * scale)
        group.add(leg)
      }
    }

    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.8 * scale, 0.22 * scale, 0.62 * scale), stoneMaterial)
    slab.position.set(-0.32 * scale, 1.24 * scale, 0.05 * scale)
    slab.rotation.z = -0.06
    group.add(slab)

    const toolHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.05 * scale, 0.95 * scale, 6), woodMaterial)
    toolHandle.position.set(0.52 * scale, 1.22 * scale, -0.1 * scale)
    toolHandle.rotation.z = Math.PI / 2.55
    group.add(toolHandle)

    const toolHead = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.12 * scale, 0.18 * scale), toolMaterial)
    toolHead.position.set(0.75 * scale, 1.35 * scale, -0.1 * scale)
    toolHead.rotation.z = 0.24
    group.add(toolHead)

    const ember = new THREE.PointLight(0xffb84d, 0.42, 7 * scale)
    ember.position.set(0.1 * scale, 1.4 * scale, 0.2 * scale)
    group.add(ember)

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 1.5 })
  }

  if (type === 'tribe_hut') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x71451f, rng, 0.08),
      roughness: 0.92
    })
    const strawMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0xb39152, rng, 0.1),
      roughness: 0.95
    })

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.35 * scale, 1.5 * scale, 0.22 * scale, 10), woodMaterial)
    base.position.y = 0.1 * scale
    group.add(base)

    for (let i = 0; i < 6; i++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 1.55 * scale, 6), woodMaterial)
      const angle = (i / 6) * Math.PI * 2
      pole.position.set(Math.cos(angle) * 1.0 * scale, 0.82 * scale, Math.sin(angle) * 1.0 * scale)
      pole.rotation.z = (rng() - 0.5) * 0.08
      group.add(pole)
    }

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.7 * scale, 2.15 * scale, 10), strawMaterial)
    roof.position.y = 1.7 * scale
    roof.rotation.y = rng() * Math.PI * 2
    group.add(roof)

    const doorway = new THREE.Mesh(new THREE.BoxGeometry(0.6 * scale, 1.05 * scale, 0.14 * scale), woodMaterial)
    doorway.position.set(0, 0.56 * scale, 1.38 * scale)
    group.add(doorway)

    group.rotation.y = rng() * Math.PI * 2
    const fallback = polishModel(group, rng, { groundShadow: true, shadowRadius: 1.8 })
    const holder = createAssetBackedEntity('tribeHut', fallback, rng, {
      scale,
      assetScale: 4.8,
      rotationY: group.rotation.y,
      polish: { groundShadow: true, shadowRadius: 1.8 }
    })
    return holder
  }

  if (type === 'tribe_fence') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x76502a, rng, 0.08),
      roughness: 0.9
    })
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.58 * scale
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.09 * scale, 1.15 * scale, 6), woodMaterial)
      post.position.set(x, 0.58 * scale, 0)
      post.rotation.z = (rng() - 0.5) * 0.08
      group.add(post)
    }
    for (const y of [0.48, 0.86]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(4.1 * scale, 0.1 * scale, 0.12 * scale), woodMaterial)
      rail.position.y = y * scale
      rail.rotation.z = (rng() - 0.5) * 0.04
      group.add(rail)
    }
    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 2.4 })
  }

  if (type === 'tribe_road') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const dirtMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x8a6a43, rng, 0.08),
      roughness: 0.98
    })
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x8d877c, rng, 0.07),
      roughness: 0.94
    })
    const path = new THREE.Mesh(new THREE.BoxGeometry(1.25 * scale, 0.05 * scale, 4.4 * scale), dirtMaterial)
    path.position.y = 0.03 * scale
    group.add(path)
    for (let i = 0; i < 8; i++) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry((0.12 + rng() * 0.06) * scale, 0), stoneMaterial)
      stone.position.set((rng() - 0.5) * 0.85 * scale, 0.09 * scale, (-1.9 + i * 0.55) * scale)
      stone.scale.y = 0.35
      group.add(stone)
    }
    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 2.2 })
  }

  if (type === 'tribe_spawn') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x7fe7ff,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.75 * scale, 1.1 * scale, 24), ringMaterial)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.03
    group.add(ring)

    const pillarMaterial = new THREE.MeshBasicMaterial({
      color: 0x9be7ff,
      transparent: true,
      opacity: 0.25
    })
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.22 * scale, 2.4 * scale, 8), pillarMaterial)
    pillar.position.y = 1.2 * scale
    group.add(pillar)

    const light = new THREE.PointLight(0x74d5ff, 0.65, 8 * scale)
    light.position.y = 1.3 * scale
    group.add(light)

    return polishModel(group, rng, { groundShadow: true, shadowRadius: 1.2 })
  }

  if (type === 'tribe_camp') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x7d786e, rng, 0.08),
      roughness: 0.96
    })

    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry((0.18 + rng() * 0.08) * scale, 0), stoneMaterial)
      stone.position.set(Math.cos(angle) * 2.15 * scale, 0.12 * scale, Math.sin(angle) * 2.15 * scale)
      stone.scale.set(1.2, 0.5 + rng() * 0.25, 0.8 + rng() * 0.35)
      group.add(stone)
    }

    const ember = new THREE.PointLight(0xffc86a, 0.32, 9 * scale)
    ember.position.y = 0.55 * scale
    group.add(ember)

    return polishModel(group, rng, { groundShadow: true, shadowRadius: 1.65 })
  }

  if (type === 'tribe_flag') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const flagTint = oathColor(entity.oathKey, entity.tribeColor || 0xfb7185)
    const poleMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x6b4a28, rng, 0.08),
      roughness: 0.86
    })
    const clothMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(flagTint, rng, 0.08),
      roughness: 0.78,
      side: THREE.DoubleSide
    })
    const stoneMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x8a8178, rng, 0.08),
      roughness: 0.94
    })

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 3.2 * scale, 6), poleMaterial)
    pole.position.y = 1.6 * scale
    group.add(pole)

    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.25 * scale, 0.72 * scale, 3, 2), clothMaterial)
    cloth.position.set(0.58 * scale, 2.55 * scale, 0)
    cloth.rotation.y = -0.08
    group.add(cloth)

    if (entity.oathKey) {
      const stripeMaterial = new THREE.MeshStandardMaterial({
        color: 0xfff7df,
        roughness: 0.66,
        side: THREE.DoubleSide
      })
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.92 * scale, 0.08 * scale), stripeMaterial)
      stripe.position.set(0.62 * scale, 2.58 * scale, 0.012 * scale)
      stripe.rotation.y = -0.08
      group.add(stripe)
    }

    const marker = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 0.32 * scale, 5), clothMaterial)
    marker.position.y = 3.35 * scale
    group.add(marker)

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry((0.12 + rng() * 0.05) * scale, 0), stoneMaterial)
      stone.position.set(Math.cos(angle) * 0.55 * scale, 0.08 * scale, Math.sin(angle) * 0.55 * scale)
      stone.scale.y = 0.55
      group.add(stone)
    }

    const light = new THREE.PointLight(flagTint, 0.28, 7 * scale)
    light.position.y = 2.25 * scale
    group.add(light)

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 1.65 })
  }

  if (type === 'tribe_beast_marker') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const specialty = entity.specialty || 'young'
    const behavior = entity.behavior || 'rest'
    const bodyColors = {
      guardian: 0x9be59d,
      hunter: 0xf8df7b,
      carrier: 0xb59cff,
      young: 0xc8a66a
    }
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(bodyColors[specialty] || bodyColors.young, rng, 0.08),
      roughness: 0.82
    })
    const darkMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x3b2a1b, rng, 0.06),
      roughness: 0.9
    })

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 12, 10), bodyMaterial)
    body.position.y = 0.58 * scale
    body.scale.set(1.25, 0.72, 0.82)
    group.add(body)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34 * scale, 10, 8), bodyMaterial)
    head.position.set(0.55 * scale, 0.82 * scale, 0.08 * scale)
    group.add(head)

    for (const x of [-0.34, -0.08, 0.18, 0.44]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * scale, 0.07 * scale, 0.48 * scale, 6), darkMaterial)
      leg.position.set(x * scale, 0.24 * scale, (rng() - 0.5) * 0.42 * scale)
      group.add(leg)
    }

    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.28 * scale, 5), darkMaterial)
    ear.position.set(0.68 * scale, 1.13 * scale, 0.05 * scale)
    group.add(ear)

    const glow = new THREE.PointLight(bodyColors[specialty] || bodyColors.young, 0.25, 5 * scale)
    glow.position.y = 0.9 * scale
    group.add(glow)

    if (behavior === 'guard') {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.16 * scale, 0.36 * scale, 5), darkMaterial)
      crest.position.set(0.1 * scale, 1.18 * scale, 0)
      group.add(crest)
    } else if (behavior === 'carry') {
      const packMaterial = new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 0.88 })
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.46 * scale, 0.28 * scale, 0.62 * scale), packMaterial)
      pack.position.set(-0.18 * scale, 0.9 * scale, 0)
      group.add(pack)
    } else if (behavior === 'patrol') {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.5 * scale, 6), darkMaterial)
      tail.position.set(-0.72 * scale, 0.78 * scale, 0)
      tail.rotation.z = Math.PI / 2.8
      group.add(tail)
    }

    group.rotation.y = rng() * Math.PI * 2
    group.userData.animation = {
      type: 'beast',
      behavior,
      phase: rng() * Math.PI * 2,
      baseX: 0,
      baseZ: 0,
      radius: typeof entity.patrolRadius === 'number' ? entity.patrolRadius : 1
    }
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 1.85 })
  }

  if (type === 'scouted_resource_site' || type === 'controlled_resource_site' || type === 'trade_route_site' || type === 'world_event_remnant' || type === 'diplomacy_council_site') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const colorByRegion = {
      region_forest: 0x5ecf93,
      region_mountain: 0xb8bec7,
      region_coast: 0x74d5ff,
      region_ruin: 0xf8df7b
    }
    const tint = type === 'diplomacy_council_site'
      ? 0xffd675
      : type === 'trade_route_site'
      ? 0x7fe7ff
      : (type === 'controlled_resource_site' ? 0xf8df7b : (type === 'world_event_remnant' ? 0xffbe68 : (colorByRegion[entity.regionType] || 0x5ecf93)))
    const mat = new THREE.MeshStandardMaterial({
      color: colorJitter(tint, rng, 0.08),
      roughness: 0.78,
      emissive: new THREE.Color(tint).multiplyScalar(0.18)
    })
    const wood = new THREE.MeshStandardMaterial({
      color: colorJitter(0x7a4a1f, rng, 0.08),
      roughness: 0.9
    })

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8 * scale, 1.05 * scale, 0.18 * scale, 7), wood)
    base.position.y = 0.09 * scale
    group.add(base)

    for (let i = 0; i < 4; i++) {
      const shard = new THREE.Mesh(new THREE.DodecahedronGeometry((0.22 + rng() * 0.16) * scale, 0), mat)
      const angle = (i / 4) * Math.PI * 2 + rng() * 0.3
      shard.position.set(Math.cos(angle) * (0.28 + rng() * 0.45) * scale, (0.35 + rng() * 0.35) * scale, Math.sin(angle) * (0.28 + rng() * 0.45) * scale)
      shard.scale.set(1.1, 0.75 + rng() * 0.7, 0.9)
      group.add(shard)
    }

    const marker = new THREE.Mesh(new THREE.TorusGeometry(0.9 * scale, 0.035 * scale, 8, 24), mat)
    marker.position.y = 0.28 * scale
    marker.rotation.x = Math.PI / 2
    group.add(marker)

    const light = new THREE.PointLight(tint, 0.35, 6 * scale)
    light.position.y = 0.9 * scale
    group.add(light)

    group.rotation.y = rng() * Math.PI * 2
    return polishModel(group, rng, { groundShadow: true, shadowRadius: 2.4 })
  }

  if (type === 'cave_entrance') {
    const group = new THREE.Group()
    const scale = typeof entity.size === 'number' ? entity.size : 1
    const rockMaterial = new THREE.MeshStandardMaterial({
      color: colorJitter(0x4f5049, rng, 0.08),
      roughness: 0.98
    })
    const darkMaterial = new THREE.MeshBasicMaterial({
      color: 0x050605,
      transparent: true,
      opacity: 0.96
    })

    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.55 * scale, 0.28 * scale, 8, 18, Math.PI), rockMaterial)
    arch.position.y = 1.3 * scale
    arch.rotation.z = Math.PI
    group.add(arch)

    const mouth = new THREE.Mesh(new THREE.CircleGeometry(1.35 * scale, 24), darkMaterial)
    mouth.position.y = 1.0 * scale
    mouth.rotation.y = 0
    group.add(mouth)

    for (let i = 0; i < 7; i++) {
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry((0.24 + rng() * 0.22) * scale, 0), rockMaterial)
      stone.position.set((rng() - 0.5) * 3.4 * scale, (0.12 + rng() * 0.45) * scale, (rng() - 0.5) * 0.9 * scale)
      stone.scale.set(1.1 + rng() * 0.6, 0.6 + rng() * 0.5, 0.8 + rng() * 0.4)
      group.add(stone)
    }

    const torch = new THREE.PointLight(0xff9f1c, 0.55, 8 * scale)
    torch.position.set(-1.05 * scale, 1.25 * scale, 0.15 * scale)
    group.add(torch)

    group.rotation.y = rng() * 0.35 - 0.15
    const fallback = polishModel(group, rng, { groundShadow: true, shadowRadius: 2.5 })
    const holder = createAssetBackedEntity('caveEntrance', fallback, rng, {
      scale,
      assetScale: 2.7,
      rotationY: group.rotation.y,
      polish: { groundShadow: true, shadowRadius: 2.5 }
    })
    return holder
  }

  return null
}

export function disposeObject3D(object3D) {
  if (!object3D) return
  object3D.userData.disposed = true
  const materials = new Set()
  object3D.traverse((child) => {
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((m) => materials.add(m))
      else materials.add(child.material)
    }
  })
  materials.forEach((m) => m.dispose())
}
