import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinnedModel } from 'three/examples/jsm/utils/SkeletonUtils.js'

export const GAME_MODEL_ASSETS = {
  player: '/game-assets/models/player.glb',
  campfire: '/game-assets/models/campfire.glb',
  tribeStorage: '/game-assets/models/tribe_storage.glb',
  tribeWorkbench: '/game-assets/models/tribe_workbench.glb',
  tribeHut: '/game-assets/models/tribe_hut.glb',
  tribeTotem: '/game-assets/models/tribe_totem.glb',
  tribeFlag: '/game-assets/models/tribe_flag.glb',
  caveEntrance: '/game-assets/models/cave_entrance.glb',
  resourceSite: '/game-assets/models/resource_site.glb',
  mapMemory: '/game-assets/models/map_memory.glb',
  worldEventRemnant: '/game-assets/models/world_event_remnant.glb',
  diplomacyCouncil: '/game-assets/models/diplomacy_council.glb',
  standingRitual: '/game-assets/models/standing_ritual.glb',
  sacredFire: '/game-assets/models/sacred_fire.glb',
  neutralSanctuary: '/game-assets/models/neutral_sanctuary.glb',
  collectionWall: '/game-assets/models/collection_wall.glb',
  sharedPuzzle: '/game-assets/models/shared_puzzle.glb',
  trailMarker: '/game-assets/models/trail_marker.glb',
  namedLandmark: '/game-assets/models/named_landmark.glb',
  worldRiddleSite: '/game-assets/models/world_riddle_site.glb',
  oldCampEcho: '/game-assets/models/old_camp_echo.glb',
  caveReturnMark: '/game-assets/models/cave_return_mark.glb',
  travelerSong: '/game-assets/models/traveler_song.glb',
  mutualAidAlert: '/game-assets/models/mutual_aid_alert.glb',
  nomadVisitor: '/game-assets/models/nomad_visitor.glb',
  trialGround: '/game-assets/models/trial_ground.glb',
  borderTheater: '/game-assets/models/border_theater.glb',
  forbiddenEdge: '/game-assets/models/forbidden_edge.glb',
  disasterCoopSite: '/game-assets/models/disaster_coop_site.glb',
  allianceSignal: '/game-assets/models/alliance_signal.glb',
  disputeWitnessStone: '/game-assets/models/dispute_witness_stone.glb',
  fogTrail: '/game-assets/models/fog_trail.glb',
  tree: '/game-assets/models/natural_tree.glb',
  rock: '/game-assets/models/natural_rock.glb',
  grassTuft: '/game-assets/models/natural_grass_tuft.glb',
  flowerPatch: '/game-assets/models/natural_flower_patch.glb',
  regionMarker: '/game-assets/models/region_marker.glb',
  migrationSite: '/game-assets/models/migration_site.glb',
  nomadCaravan: '/game-assets/models/nomad_caravan.glb',
  playerTorch: '/game-assets/models/player_torch.glb',
  playerStoneTool: '/game-assets/models/player_stone_tool.glb',
  playerScrollToken: '/game-assets/models/player_scroll_token.glb'
}

const loader = new GLTFLoader()
const loadCache = new Map()

const cloneMaterial = (material) => {
  if (!material) return material
  if (Array.isArray(material)) return material.map((item) => cloneMaterial(item))
  return material.clone()
}

const asColor = (value, fallback = 0xffffff) => {
  try {
    return new THREE.Color(typeof value === 'number' || typeof value === 'string' ? value : fallback)
  } catch {
    return new THREE.Color(fallback)
  }
}

const tintMaterial = (material, color, strength = 0.35) => {
  if (!material?.color) return
  material.color.lerp(asColor(color), Math.max(0, Math.min(1, strength)))
  if ('envMapIntensity' in material) material.envMapIntensity = 0.32
}

export function applyModelMaterialVariant(model, variant = {}) {
  if (!model || !variant?.primaryColor) return model
  const primary = asColor(variant.primaryColor)
  const accent = asColor(variant.accentColor || 0xfff3c4)
  const role = variant.role || 'prop'

  model.traverse((child) => {
    if (!child.isMesh || !child.material) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    const name = `${child.name || ''} ${materials.map((material) => material?.name || '').join(' ')}`.toLowerCase()
    materials.forEach((material) => {
      if (role === 'player') {
        const isAccentPart = /cape|shield|hat|body|leg|arm/.test(name)
        tintMaterial(material, isAccentPart ? primary : accent, isAccentPart ? 0.42 : 0.08)
        return
      }
      const strongTint = /flag|totem|cloth|banner|tent|storage|workbench|tribe|resource|memory|remnant|council|ritual|sacred|sanctuary|collection|puzzle|trail|landmark|riddle|glyph|old|return|song|aid|alert|smoke|visitor|trial|theater|forbidden|disaster|alliance|signal|witness|evidence|fog|mist|brace|leaf|flower|region|migration|caravan|torch|tool|scroll|token/.test(name)
      tintMaterial(material, strongTint ? primary : accent, strongTint ? 0.55 : 0.12)
    })
  })

  return model
}

export function cloneModelScene(source, options = {}) {
  const clone = cloneSkinnedModel(source)
  clone.traverse((child) => {
    if (!child.isMesh) return
    if (child.geometry) child.geometry = child.geometry.clone()
    child.material = cloneMaterial(child.material)
    child.castShadow = true
    child.receiveShadow = true
  })
  applyModelMaterialVariant(clone, options.materialVariant)
  return clone
}

export function loadModelAsset(key) {
  const url = GAME_MODEL_ASSETS[key]
  if (!url) return Promise.reject(new Error(`Unknown game model asset: ${key}`))
  if (!loadCache.has(key)) {
    loadCache.set(key, loader.loadAsync(url))
  }
  return loadCache.get(key)
}

export async function createModelAssetInstance(key, options = {}) {
  const gltf = await loadModelAsset(key)
  return cloneModelScene(gltf.scene, options)
}

export async function createAnimatedModelAssetInstance(key, options = {}) {
  const gltf = await loadModelAsset(key)
  return {
    model: cloneModelScene(gltf.scene, options),
    animations: gltf.animations || []
  }
}
