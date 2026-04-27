import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export const GAME_MODEL_ASSETS = {
  player: '/game-assets/models/player.glb',
  tribeHut: '/game-assets/models/tribe_hut.glb',
  tribeTotem: '/game-assets/models/tribe_totem.glb',
  caveEntrance: '/game-assets/models/cave_entrance.glb'
}

const loader = new GLTFLoader()
const loadCache = new Map()

const cloneMaterial = (material) => {
  if (!material) return material
  if (Array.isArray(material)) return material.map((item) => cloneMaterial(item))
  return material.clone()
}

export function cloneModelScene(source) {
  const clone = source.clone(true)
  clone.traverse((child) => {
    if (!child.isMesh) return
    if (child.geometry) child.geometry = child.geometry.clone()
    child.material = cloneMaterial(child.material)
    child.castShadow = true
    child.receiveShadow = true
  })
  return clone
}

export function loadModelAsset(key) {
  const url = GAME_MODEL_ASSETS[key]
  if (!url) return Promise.reject(new Error(`Unknown game model asset: ${key}`))
  if (!loadCache.has(key)) {
    loadCache.set(key, loader.loadAsync(url).then((gltf) => gltf.scene))
  }
  return loadCache.get(key)
}

export async function createModelAssetInstance(key) {
  const source = await loadModelAsset(key)
  return cloneModelScene(source)
}
