const REGION_LANDMARK_TYPES = ['region_forest', 'region_mountain', 'region_coast', 'region_ruin']

export const WORLD_ENTITY_TYPES = Object.freeze({
  tribe_totem: { interactable: true, fallback: true },
  tribe_storage: { interactable: true, fallback: true },
  tribe_workbench: { interactable: true, fallback: true },
  tribe_hut: { interactable: true },
  tribe_fence: { interactable: true, fallback: true },
  tribe_road: { interactable: true, fallback: true },
  tribe_spawn: { landmarkDecoration: true, interactable: true, fallback: true },
  tribe_camp: { landmarkDecoration: true, interactable: true, fallback: true },
  tribe_flag: { landmarkDecoration: true, interactable: true, fallback: true },
  tribe_beast_marker: { landmarkDecoration: true, interactable: true, fallback: true },
  scouted_resource_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'resourceSite' },
  controlled_resource_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'resourceSite' },
  trade_route_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'resourceSite' },
  nomad_caravan: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'nomadCaravan' },
  nomad_visitor: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'nomadVisitor' },
  mutual_aid_alert: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'mutualAidAlert' },
  alliance_signal: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'allianceSignal' },
  world_event_remnant: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'worldEventRemnant' },
  diplomacy_council_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'diplomacyCouncil' },
  border_theater: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'borderTheater' },
  dispute_witness_stone: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'disputeWitnessStone' },
  celebration_echo: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'standingRitual' },
  map_memory_trace: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'mapMemory' },
  map_tile_trace: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'mapMemory' },
  world_riddle_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'worldRiddleSite' },
  trial_ground: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'trialGround' },
  forbidden_edge: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'forbiddenEdge' },
  fog_trail: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'fogTrail' },
  disaster_coop_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'disasterCoopSite' },
  old_camp_echo: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'oldCampEcho' },
  rare_cave_race: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'caveEntrance' },
  cave_rescue_clue: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'mapMemory' },
  cave_return_mark: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'caveReturnMark' },
  traveler_song: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'travelerSong' },
  standing_ritual_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'standingRitual' },
  sacred_fire_relay: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'sacredFire' },
  neutral_sanctuary: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'neutralSanctuary' },
  collection_wall: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'collectionWall' },
  lost_item: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'collectionWall' },
  shared_puzzle_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'sharedPuzzle' },
  trail_marker: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'trailMarker' },
  migration_plan_site: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'migrationSite' },
  named_landmark: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'namedLandmark' },
  myth_divergence: { landmarkDecoration: true, interactable: true, fallback: true, assetKey: 'worldRiddleSite' },
  campfire: { fallback: true },
  ruin: { fallback: true },
  crystal: { fallback: true },
  cave_entrance: { fallback: true },
  region_forest: { fallback: true },
  region_mountain: { fallback: true },
  region_coast: { fallback: true },
  region_ruin: { fallback: true },
  shared_puzzle: { assetKey: 'sharedPuzzle' },
  sacred_fire_site: { assetKey: 'sacredFire' }
})

const typesWhere = (predicate) => Object.entries(WORLD_ENTITY_TYPES)
  .filter(([, meta]) => predicate(meta))
  .map(([type]) => type)

export const tribeLandmarkDecorationTypes = new Set(typesWhere((meta) => meta.landmarkDecoration))
export const tribeInteractableTypes = typesWhere((meta) => meta.interactable)
export const regionLandmarkTypes = [...REGION_LANDMARK_TYPES]
export const landmarkFallbackTypes = typesWhere((meta) => meta.fallback)

export const MARKER_ASSET_KEYS_BY_TYPE = Object.freeze(
  Object.fromEntries(
    Object.entries(WORLD_ENTITY_TYPES)
      .filter(([, meta]) => meta.assetKey)
      .map(([type, meta]) => [type, meta.assetKey])
  )
)

export const markerAssetKeyForType = (type) => MARKER_ASSET_KEYS_BY_TYPE[type] || ''
export const isAssetBackedMarkerType = (type) => Boolean(markerAssetKeyForType(type))
