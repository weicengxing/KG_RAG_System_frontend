import * as THREE from 'three'
import { SpatialHash } from './spatialHash.js'
import { createEntityMesh, disposeObject3D, getEntityCollider } from './entityRegistry.js'

export class WorldEntityManager {
  constructor({ scene, loadDistance = 80, unloadDistance = 100, spatialCellSize = 12 } = {}) {
    this.scene = scene
    this.loadDistance = loadDistance
    this.unloadDistance = unloadDistance
    this.globalSeed = 0

    this.decorations = []
    this.environment = null
    this.collectedIds = new Set()

    this.loadedDecorations = new Map()
    this.mountainsGroup = null
    this.water = null

    this.spatialHash = new SpatialHash(spatialCellSize)
    this.maxColliderRadius = 10
  }

  setSeed(seed) {
    this.globalSeed = (typeof seed === 'number' ? seed : 0) >>> 0
  }

  setDecorations(decorations) {
    this.decorations = Array.isArray(decorations) ? decorations : []
    this.collectedIds.clear()
    this.resetLoadedDecorations()
    this.rebuildColliders()
  }

  updateDecoration(decorationId, patch) {
    if (!decorationId || !patch) return false
    const index = this.decorations.findIndex((decoration) => decoration?.id === decorationId)
    if (index < 0) return false

    this.decorations[index] = { ...this.decorations[index], ...patch }
    const loaded = this.loadedDecorations.get(decorationId)
    if (loaded && this.scene) {
      this.scene.remove(loaded)
      disposeObject3D(loaded)
      this.loadedDecorations.delete(decorationId)
    }
    this.rebuildColliders()
    return true
  }

  setEnvironment(environment) {
    this.environment = environment || null
    this._applySea(environment)
    this._applyMountains(environment)
    this.rebuildColliders()
  }

  setMap({ seed, environment, decorations }) {
    this.setSeed(seed)
    this.setEnvironment(environment)
    this.setDecorations(decorations)
  }

  getLoadedCount() {
    return this.loadedDecorations.size
  }

  resetLoadedDecorations() {
    if (!this.scene) {
      this.loadedDecorations.clear()
      return
    }
    for (const mesh of this.loadedDecorations.values()) {
      this.scene.remove(mesh)
      disposeObject3D(mesh)
    }
    this.loadedDecorations.clear()
  }

  _applySea(environment) {
    if (!this.scene) return
    const seaLevel = typeof environment?.seaLevel === 'number' ? environment.seaLevel : -0.8
    if (!this.water) {
      const geometry = new THREE.PlaneGeometry(2000, 2000, 24, 24)
      const material = new THREE.MeshStandardMaterial({
        color: 0x2f9bd6,
        roughness: 0.28,
        metalness: 0.08,
        transparent: true,
        opacity: 0.48,
        side: THREE.DoubleSide
      })
      this.water = new THREE.Mesh(geometry, material)
      this.water.rotation.x = -Math.PI / 2
      this.water.receiveShadow = false
      this.water.userData.baseY = seaLevel
      this.scene.add(this.water)
    }
    this.water.userData.baseY = seaLevel
    this.water.position.y = seaLevel

    const weather = environment?.weather || 'sunny'
    if (weather === 'fog') {
      this.water.material.opacity = 0.35
      this.water.material.color.set(0x7993a4)
    } else if (weather === 'snow') {
      this.water.material.opacity = 0.42
      this.water.material.color.set(0x92c2dc)
    } else if (weather === 'rain') {
      this.water.material.opacity = 0.5
      this.water.material.color.set(0x2f6f9f)
    } else {
      this.water.material.opacity = 0.48
      this.water.material.color.set(0x2f9bd6)
    }
    this.water.material.needsUpdate = true
  }

  _applyMountains(environment) {
    if (!this.scene) return

    if (this.mountainsGroup) {
      this.scene.remove(this.mountainsGroup)
      disposeObject3D(this.mountainsGroup)
      this.mountainsGroup = null
    }

    const mountains = Array.isArray(environment?.mountains) ? environment.mountains : []
    this.mountainsGroup = new THREE.Group()

    mountains.forEach((m) => {
      const mountainEntity = { ...m, type: 'mountain' }
      const mesh = createEntityMesh(mountainEntity, this.globalSeed)
      if (!mesh) return
      const height = typeof m.height === 'number' ? m.height : 25
      mesh.position.set(m.x || 0, (m.y || 0) + height / 2, m.z || 0)
      this.mountainsGroup.add(mesh)
    })

    this.scene.add(this.mountainsGroup)
  }

  rebuildColliders() {
    this.spatialHash.clear()
    this.maxColliderRadius = 10

    const add = (entity) => {
      const collider = getEntityCollider(entity, this.globalSeed)
      if (!collider) return
      this.maxColliderRadius = Math.max(this.maxColliderRadius, collider.radius)
      this.spatialHash.insert(collider, collider.x, collider.z, collider.radius)
    }

    for (const decoration of this.decorations) {
      if (this.collectedIds.has(decoration.id)) continue
      add(decoration)
    }

    const mountains = Array.isArray(this.environment?.mountains) ? this.environment.mountains : []
    for (const m of mountains) add({ ...m, type: 'mountain' })
  }

  updateDecorations(playerPosition) {
    if (!this.scene || !playerPosition) return

    for (const decoration of this.decorations) {
      if (this.collectedIds.has(decoration.id)) {
        const loaded = this.loadedDecorations.get(decoration.id)
        if (loaded) {
          this.scene.remove(loaded)
          disposeObject3D(loaded)
          this.loadedDecorations.delete(decoration.id)
        }
        continue
      }

      const dx = decoration.x - playerPosition.x
      const dz = decoration.z - playerPosition.z
      const distance = Math.sqrt(dx * dx + dz * dz)
      const isLoaded = this.loadedDecorations.has(decoration.id)

      if (distance < this.loadDistance && !isLoaded) {
        const mesh = createEntityMesh(decoration, this.globalSeed)
        if (!mesh) continue
        mesh.position.set(decoration.x, decoration.y, decoration.z)
        this.scene.add(mesh)
        this.loadedDecorations.set(decoration.id, mesh)
      } else if (distance > this.unloadDistance && isLoaded) {
        const mesh = this.loadedDecorations.get(decoration.id)
        this.scene.remove(mesh)
        disposeObject3D(mesh)
        this.loadedDecorations.delete(decoration.id)
      }
    }

    this.updateDecorationAnimations()
  }

  updateDecorationAnimations(time = performance.now() * 0.001) {
    if (this.water) {
      this.water.position.y = (this.water.userData.baseY ?? this.water.position.y) + Math.sin(time * 0.55) * 0.025
      this.water.material.opacity = Math.max(0.28, Math.min(0.56, this.water.material.opacity + Math.sin(time * 0.8) * 0.0004))
    }

    for (const mesh of this.loadedDecorations.values()) {
      const animation = mesh?.userData?.animation
      if (!animation || animation.type !== 'beast') continue
      if (!animation.initialized) {
        animation.baseX = mesh.position.x
        animation.baseZ = mesh.position.z
        animation.initialized = true
      }
      const t = time + animation.phase
      const radius = animation.radius || 1
      if (animation.behavior === 'patrol') {
        mesh.position.x = animation.baseX + Math.cos(t * 0.65) * radius
        mesh.position.z = animation.baseZ + Math.sin(t * 0.65) * radius
        mesh.rotation.y = -t * 0.65
      } else if (animation.behavior === 'carry') {
        mesh.position.x = animation.baseX + Math.sin(t * 0.5) * radius * 0.45
        mesh.rotation.z = Math.sin(t * 2.2) * 0.04
      } else if (animation.behavior === 'guard') {
        mesh.rotation.y = Math.sin(t * 0.6) * 0.45
      } else {
        mesh.position.y = Math.sin(t * 1.4) * 0.05
      }
    }
  }

  findNearestInteractable(playerPosition, radius = 4) {
    if (!playerPosition) return null

    let nearest = null
    let nearestDist2 = radius * radius

    for (const decoration of this.decorations) {
      if (!decoration?.id || this.collectedIds.has(decoration.id)) continue
      if (decoration.type !== 'tree' && decoration.type !== 'rock') continue

      const dx = decoration.x - playerPosition.x
      const dz = decoration.z - playerPosition.z
      const dist2 = dx * dx + dz * dz
      if (dist2 <= nearestDist2) {
        nearest = decoration
        nearestDist2 = dist2
      }
    }

    return nearest
  }

  findNearestEntityByTypes(playerPosition, types = [], radius = 4) {
    if (!playerPosition || !Array.isArray(types) || !types.length) return null

    const allowedTypes = new Set(types)
    let nearest = null
    let nearestDist2 = radius * radius

    for (const decoration of this.decorations) {
      if (!decoration?.id || this.collectedIds.has(decoration.id)) continue
      if (!allowedTypes.has(decoration.type)) continue

      const dx = decoration.x - playerPosition.x
      const dz = decoration.z - playerPosition.z
      const dist2 = dx * dx + dz * dz
      if (dist2 <= nearestDist2) {
        nearest = decoration
        nearestDist2 = dist2
      }
    }

    return nearest
  }

  collectEntity(entityId) {
    if (!entityId || this.collectedIds.has(entityId)) return false
    const entity = this.decorations.find((decoration) => decoration.id === entityId)
    if (!entity || (entity.type !== 'tree' && entity.type !== 'rock')) return false

    this.collectedIds.add(entityId)

    const mesh = this.loadedDecorations.get(entityId)
    if (mesh) {
      this.scene.remove(mesh)
      disposeObject3D(mesh)
      this.loadedDecorations.delete(entityId)
    }

    this.rebuildColliders()
    return true
  }

  resolvePlayerXZ(currentPosition, desiredPosition, playerRadius = 0.7) {
    const result = new THREE.Vector3(desiredPosition.x, desiredPosition.y, desiredPosition.z)
    let collided = false

    const queryRadius = playerRadius + this.maxColliderRadius + 1
    const candidates = this.spatialHash.query(result.x, result.z, queryRadius)

    for (let iteration = 0; iteration < 4; iteration++) {
      let any = false
      for (const collider of candidates) {
        const dx = result.x - collider.x
        const dz = result.z - collider.z
        const minDist = playerRadius + collider.radius
        const dist2 = dx * dx + dz * dz
        if (dist2 >= minDist * minDist) continue

        const dist = Math.sqrt(dist2) || 0.0001
        const overlap = minDist - dist
        const nx = dx / dist
        const nz = dz / dist
        result.x += nx * overlap
        result.z += nz * overlap
        any = true
        collided = true
      }
      if (!any) break
    }

    return { position: result, collided }
  }

  dispose() {
    if (!this.scene) return
    this.resetLoadedDecorations()

    if (this.mountainsGroup) {
      this.scene.remove(this.mountainsGroup)
      disposeObject3D(this.mountainsGroup)
      this.mountainsGroup = null
    }

    if (this.water) {
      this.scene.remove(this.water)
      this.water.geometry.dispose()
      this.water.material.dispose()
      this.water = null
    }

    this.spatialHash.clear()
  }
}
