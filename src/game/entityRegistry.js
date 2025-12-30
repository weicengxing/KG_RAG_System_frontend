import * as THREE from 'three'
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
    trunk.castShadow = false
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
    foliage.castShadow = false
    foliage.receiveShadow = true
    tree.add(foliage)

    tree.rotation.y = rng() * Math.PI * 2
    return tree
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
    rock.castShadow = false
    rock.receiveShadow = true
    rock.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI)
    rock.scale.set(0.85 + rng() * 0.6, 0.75 + rng() * 0.8, 0.85 + rng() * 0.6)
    return rock
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
    return mesh
  }

  return null
}

export function disposeObject3D(object3D) {
  if (!object3D) return
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
