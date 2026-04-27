import * as THREE from 'three'
import { createModelAssetInstance } from './modelAssets.js'

const PROP_BY_STATE = {
  gather: 'playerStoneTool',
  conflict: 'playerStoneTool',
  guard: 'playerTorch',
  ritual: 'playerScrollToken',
  cheer: 'playerScrollToken',
  sit: 'playerScrollToken'
}

const PROP_TRANSFORMS = {
  playerTorch: {
    scale: 0.72,
    position: [0.48, 0.1, 0.34],
    rotation: [-0.22, 0.12, -0.42],
    color: 0xff9f1c
  },
  playerStoneTool: {
    scale: 0.82,
    position: [0.5, -0.08, 0.4],
    rotation: [0.2, 0.15, -0.9],
    color: 0xb9c2c7
  },
  playerScrollToken: {
    scale: 0.78,
    position: [0.44, 0.18, 0.38],
    rotation: [-0.08, 0.18, -0.18],
    color: 0xd8c16b
  }
}

const cloneMaterial = (material) => {
  if (!material) return material
  if (Array.isArray(material)) return material.map((item) => cloneMaterial(item))
  return material.clone()
}

const disposeObject3D = (object3D) => {
  if (!object3D) return
  object3D.traverse((object) => {
    if (object.geometry) object.geometry.dispose()
    if (object.material) {
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose())
      else object.material.dispose()
    }
  })
}

const createFallbackProp = (assetKey) => {
  const config = PROP_TRANSFORMS[assetKey] || PROP_TRANSFORMS.playerStoneTool
  const group = new THREE.Group()
  const material = new THREE.MeshStandardMaterial({
    color: config.color,
    roughness: 0.76,
    emissive: assetKey === 'playerTorch' ? new THREE.Color(0xff7a18).multiplyScalar(0.45) : 0x000000
  })

  if (assetKey === 'playerTorch') {
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b3f1a, roughness: 0.88 })
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.62, 6), wood)
    handle.position.y = 0.28
    group.add(handle)
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 8), material)
    flame.position.y = 0.72
    group.add(flame)
    const light = new THREE.PointLight(0xff9f1c, 0.28, 3)
    light.position.y = 0.68
    group.add(light)
  } else if (assetKey === 'playerScrollToken') {
    const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.38), material)
    group.add(scroll)
    const pinMaterial = new THREE.MeshStandardMaterial({ color: 0xfff0c2, roughness: 0.7 })
    for (const y of [-0.2, 0.2]) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.018, 0.34, 6), pinMaterial)
      pin.position.y = y
      pin.rotation.z = Math.PI / 2
      group.add(pin)
    }
  } else {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.036, 0.54, 6), new THREE.MeshStandardMaterial({ color: 0x6e4722, roughness: 0.9 }))
    handle.rotation.z = Math.PI / 2.8
    group.add(handle)
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.12, 0), material)
    head.position.set(0.2, 0.12, 0)
    head.scale.set(1.15, 0.72, 0.58)
    group.add(head)
  }

  group.traverse((child) => {
    if (!child.isMesh) return
    child.castShadow = true
    child.receiveShadow = false
    child.material = cloneMaterial(child.material)
  })
  return group
}

const placeProp = (slot, assetKey) => {
  const config = PROP_TRANSFORMS[assetKey] || PROP_TRANSFORMS.playerStoneTool
  slot.position.set(...config.position)
  slot.rotation.set(...config.rotation)
  slot.scale.setScalar(config.scale)
}

export function attachPlayerHeldProps(player) {
  if (!player || player.userData.heldProps) return
  const root = new THREE.Group()
  root.name = 'player_held_props'
  root.visible = false
  player.add(root)

  const slots = {}
  Object.keys(PROP_TRANSFORMS).forEach((assetKey) => {
    const slot = new THREE.Group()
    slot.name = `${assetKey}_slot`
    slot.visible = false
    placeProp(slot, assetKey)
    slot.add(createFallbackProp(assetKey))
    root.add(slot)
    slots[assetKey] = slot

    createModelAssetInstance(assetKey, {
      materialVariant: { role: 'prop', primaryColor: PROP_TRANSFORMS[assetKey].color, accentColor: 0xfff0c2 }
    })
      .then((model) => {
        if (player.userData.disposed) {
          disposeObject3D(model)
          return
        }
        slot.children.forEach((child) => disposeObject3D(child))
        slot.clear()
        model.name = `${assetKey}_glb`
        slot.add(model)
      })
      .catch((error) => {
        console.warn(`Failed to load player held prop "${assetKey}"`, error)
      })
  })

  player.userData.heldProps = {
    root,
    slots,
    activeKey: ''
  }
}

export function updatePlayerHeldProp(player, state = '', time = performance.now() * 0.001) {
  const heldProps = player?.userData?.heldProps
  if (!heldProps) return
  const assetKey = PROP_BY_STATE[state] || ''
  if (heldProps.activeKey !== assetKey) {
    Object.entries(heldProps.slots).forEach(([key, slot]) => {
      slot.visible = key === assetKey
    })
    heldProps.root.visible = Boolean(assetKey)
    heldProps.activeKey = assetKey
  }
  if (!assetKey) return
  const slot = heldProps.slots[assetKey]
  const sway = Math.sin(time * 5.2) * 0.025
  slot.rotation.x = (PROP_TRANSFORMS[assetKey]?.rotation?.[0] || 0) + sway
}
