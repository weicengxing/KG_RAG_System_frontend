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
    this.resetLoadedDecorations()
    this.rebuildColliders()
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
      const geometry = new THREE.PlaneGeometry(2000, 2000, 1, 1)
      const material = new THREE.MeshPhongMaterial({
        color: 0x1e90ff,
        transparent: true,
        opacity: 0.55
      })
      this.water = new THREE.Mesh(geometry, material)
      this.water.rotation.x = -Math.PI / 2
      this.water.receiveShadow = false
      this.scene.add(this.water)
    }
    this.water.position.y = seaLevel

    const weather = environment?.weather || 'sunny'
    if (weather === 'fog') {
      this.water.material.opacity = 0.35
      this.water.material.color.set(0x6f8799)
    } else if (weather === 'snow') {
      this.water.material.opacity = 0.45
      this.water.material.color.set(0x7fb2d6)
    } else if (weather === 'rain') {
      this.water.material.opacity = 0.55
      this.water.material.color.set(0x1b6aa8)
    } else {
      this.water.material.opacity = 0.55
      this.water.material.color.set(0x1e90ff)
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

    for (const decoration of this.decorations) add(decoration)

    const mountains = Array.isArray(this.environment?.mountains) ? this.environment.mountains : []
    for (const m of mountains) add({ ...m, type: 'mountain' })
  }

  updateDecorations(playerPosition) {
    if (!this.scene || !playerPosition) return

    for (const decoration of this.decorations) {
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
