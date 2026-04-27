<template src="./GameView.template.html"></template>

<script setup>
import { computed, ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { WorldEntityManager } from '../game/worldEntityManager.js'
import { createWeatherSystem } from '../game/weatherSystem.js'
import { buildTribeHistoryReplay } from '../game/tribeHistoryReplay.js'
import { createAnimatedModelAssetInstance } from '../game/modelAssets.js'
import { attachPlayerHeldProps, updatePlayerHeldProp } from '../game/playerHeldProps.js'
import { createGameViewActions } from '../game/gameViewActions.js'
import { createGameViewComputed } from '../game/gameViewComputed.js'
import {
  landmarkFallbackTypes,
  tribeInteractableTypes,
  tribeLandmarkDecorationTypes
} from '../game/worldEntityTypes.js'
import request from '../utils/request.js'
import { API_CONFIG } from '../config.js'

// 娓告垙鐘舵€?
const canvasWrapper = ref(null)
const showPerformance = ref(false)
const showChat = ref(false)
const showInstructions = ref(true)
const isFullscreen = ref(false)
const showQuestPanel = ref(true)
const showInventoryPanel = ref(true)
const showTribePanel = ref(true)

// 鎬ц兘鐩戞帶
const fps = ref(60)
const latency = ref(0)
const playerCount = ref(1)
const currentMap = ref('榛樿鍦板浘')
const mapSeed = ref(null)
const mapEnvironment = ref(null)
const loadedObjectsCount = ref(0)
const totalObjectsCount = ref(0)
const currentWeather = ref('sunny')
const resourceTideTick = ref(Date.now())

// 鐜╁鐘舵€?
const playerHealth = ref(100)
const playerLevel = ref(1)
const playerExperience = ref(0)
const playerNextLevelExperience = ref(100)
const playerX = ref(0)
const playerZ = ref(0)
const playerId = ref(null)
const playerName = ref('\u6211')
const personalConflictStatus = ref({
  fatigue: 0,
  fatigueMax: 6,
  fatigueUntil: '',
  guardUntil: '',
  guardTargetName: '',
  guardRadius: 6,
  personalRenown: 0,
  renownTitle: null,
  inspirationUntil: '',
  inspirationSourceName: '',
  inspirationContribution: 0,
  inspireMinRenown: 5,
  personalRelations: [],
  darkOath: null,
  identity: null
})

const inventory = ref({
  wood: 0,
  stone: 0
})

const activeQuest = ref({
  id: 'starter_gather',
  title: '鐔熸倝杩欑墖宀涘笨',
  description: '閲囬泦浠绘剰 5 浠芥湪鏉愭垨鐭跨煶锛屽缓绔嬫帰绱㈢殑绗竴鎵圭墿璧勩€?',
  progress: 0,
  target: 5,
  completed: false
})

const interactionTarget = ref(null)
const toastMessages = ref([])
let toastId = 0

const newTribeName = ref('榛庢槑閮ㄨ惤')
const tribeList = ref([])
const currentTribe = ref(null)
const tribeRole = ref(null)
const tribeContribution = ref(0)
const tribeVotes = ref([])
const pendingTribeJoinRequests = ref(new Set())
const tribeAnnouncementDraft = ref('')
const allocationDraft = ref({ wood: 0, stone: 0 })
const tradeDraft = ref({
  targetTribeId: '',
  offerResource: 'wood',
  offerAmount: 5,
  requestResource: 'stone',
  requestAmount: 5
})
const apprenticeDraft = ref({
  targetTribeId: '',
  focusKey: 'customs'
})
const guestStayDraft = ref({
  targetTribeId: '',
  actionKey: 'build_help'
})
const campShiftDraft = ref({
  shiftKey: 'gather'
})
const noTribeGuestStayTargets = ref([])
const noTribeGuestStayActions = ref({})
const personalTokenDraft = ref({
  tokenKey: 'camp_help',
  targetId: 'tribe'
})
const renownPledgeDraft = ref({
  pledgeKey: 'gather'
})
const personalDarkOathDraft = ref({
  oathKey: 'gather'
})
const namedLandmarkDraft = ref({
  sourceKey: 'first_scout',
  name: ''
})
const tribeRitualTick = ref(Date.now())
const tribeHistoryFilter = ref('all')
const tribeHistoryPageSize = 6
const tribeHistoryLoaded = ref([])
const tribeHistoryNextCursor = ref(null)
const tribeHistoryTotal = ref(0)
const tribeHistoryLoading = ref(false)
const oralChainDraft = ref('')
const showHistoryDetail = ref(false)
const activeHistoryDetail = ref({})
const showTotemOverlay = ref(false)
const activeTotemDetail = ref({})
const rareRuneUnlock = ref(null)
let rareRuneUnlockTimer = null
const seasonSummary = ref({
  currentSeason: '',
  lastSettlement: null,
  settlementHistory: []
})
const worldRumors = ref([])
const showCaveOverlay = ref(false)
const activeCave = ref(null)
const caveDepth = ref(0)
const caveSupplies = ref(0)
const caveFinds = ref(0)
const caveExplorationLog = ref('')
const caveRoute = ref([])
const activeCaveNodeIndex = ref(0)
const caveExpeditionSynced = ref(false)
const caveFoodCost = 6
const caveFoodSupported = ref(false)
const caveExpeditionPlanKey = ref('deep')
const worldEventActionKey = ref('')
const stoneTool = ref({
  durability: 0,
  max: 12,
  bonus: 1
})

// 鑱婂ぉ
const chatMessages = ref([
  { sender: '绯荤粺', text: '娆㈣繋鏉ュ埌 3D 娓告垙涓栫晫锛?', isOwn: false, isSystem: true }
])
const chatInput = ref('')
const chatMessagesEl = ref(null)
const chatInputEl = ref(null)

// 杩炴帴鐘舵€?
const connectionStatus = ref('connecting')

// Three.js 鐩稿叧
let scene, camera, renderer, controls
let ambientLight = null
let hemisphereLight = null
let directionalLight = null
let localPlayer = null
let remotePlayers = new Map()
let terrain = null
let ws = null
let lastFrameTime = Date.now()
let frameCount = 0
let clock = new THREE.Clock()
let world = null
let weatherSystem = null

// 鐩告満璺熼殢锛堜笉瑕嗙洊鐜╁鎵嬪姩鏃嬭浆瑙嗚锛?
const cameraFollowTarget = new THREE.Vector3()
const cameraTargetOffset = new THREE.Vector3(0, 1.2, 0)
let hasCameraFollowTarget = false
const tempDesiredTarget = new THREE.Vector3()
const tempDeltaTarget = new THREE.Vector3()

// 瑁呴グ鐗╃鐞嗭紙鐢ㄤ簬鎳掑姞杞斤級
let decorations = [] // 鎵€鏈夎楗扮墿鐨勬暟鎹?
const loadDistance = 80 // 鍔犺浇璺濈
const unloadDistance = 100 // 鍗歌浇璺濈

let heartbeatTimerId = null
let reconnectTimerId = null
let keepAliveTimerId = null
let tribeRitualTimerId = null
let resourceTideTimerId = null
let beastFeedbackClearTimerId = null
let manualClose = false
let reconnectAttempt = 0
let authRefreshInFlight = null

// 閿洏鐘舵€?
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  e: false
}

// 鐜╁绉诲姩閫熷害
const moveSpeed = 10
const jumpPower = 5
let velocity = new THREE.Vector3()
const gravity = -20
const playerRadius = 0.7
const interactionDistance = 4
const resourceRewards = {
  tree: {
    label: '鏍戞湪',
    itemKey: 'wood',
    itemName: '鏈ㄦ潗',
    amount: 1,
    experience: 20
  },
  rock: {
    label: '鐭跨煶',
    itemKey: 'stone',
    itemName: '鐭跨煶',
    amount: 1,
    experience: 25
  }
}
const tradeResourceLabels = {
  wood: '鏈ㄦ潗',
  stone: '鐭冲潡',
  food: '椋熺墿'
}
const tradeResourceOptions = Object.entries(tradeResourceLabels).map(([key, label]) => ({ key, label }))
const tribeBuildingTypeLabels = {
  tribe_totem: '鍥捐吘',
  tribe_storage: '浠撳簱',
  tribe_workbench: '鐭冲櫒鍙?',
  tribe_hut: '妫氬眿',
  tribe_flag: '棰嗗湴鏃楀笢',
  tribe_beast_marker: '椹吇骞煎吔',
  campfire: '钀ョ伀'
}
const caveNodeLibrary = [
  {
    type: 'entrance',
    title: '娲炲彛鏂滃潯',
    description: '娼箍绌烘皵浠庣煶缂濋噷娑屽嚭锛岃剼涓嬭繕鑳界湅鍒板闈㈢殑澶╁厜銆?'
  },
  {
    type: 'crossroad',
    title: '娼箍宀旇矾',
    description: '涓ゆ潯绐勮矾鍦ㄨ繖閲屽垎寮€锛屽闈笂鏈夊姩鐗╃埅鐥曘€?'
  },
  {
    type: 'ore',
    title: '钀ょ煶瑁傞殭',
    description: '钃濈櫧鑹茬熆鍏変粠瑁傜紳閲岄€忓嚭锛岄€傚悎閲囬泦鐭虫枡銆?'
  },
  {
    type: 'lore',
    title: '鍙ょ棔鐭冲巺',
    description: '鐭冲涓婃湁閮ㄨ惤鍒荤棔锛屽儚鏄湪璁板綍涓€娆¤縼寰欍€?'
  },
  {
    type: 'hazard',
    title: '钀界煶绐勯亾',
    description: '涓婃柟鍋跺皵婊氳惤纰庣煶锛岀户缁墠杩涗細娑堣€楁洿澶氳ˉ缁欍€?'
  },
  {
    type: 'deep',
    title: '娣卞眰鐭胯剦',
    description: '杩欓噷宸茬粡杩滅娲炲彛锛岀熆鐭虫洿澶氾紝涔熸洿閫傚悎閮ㄨ惤杩滃緛銆?'
  }
]
const caveExpeditionPlans = [
  { key: 'steady', label: '绋冲仴', summary: '灏戣€楅鐗╋紝璺嚎杈冪煭', foodCost: 5, depthBonus: -1, supplyBonus: 3, findBonus: 0, findMultiplier: 0.9, oreRoll: 0.72, loreRoll: 0.34 },
  { key: 'deep', label: '娣卞叆', summary: '鍧囪　鎺ㄨ繘锛屾敹鑾风ǔ瀹?', foodCost: 7, depthBonus: 0, supplyBonus: 1, findBonus: 1, findMultiplier: 1.12, oreRoll: 0.66, loreRoll: 0.36 },
  { key: 'risky', label: '鍐掗櫓', summary: '楂樻秷鑰楋紝楂樼█鏈夋満浼?', foodCost: 9, depthBonus: 1, supplyBonus: -1, findBonus: 2, findMultiplier: 1.3, oreRoll: 0.58, loreRoll: 0.42 }
]
const beastTaskOptions = [
  { key: 'guard', label: '瀹堣惀' },
  { key: 'hunt', label: '鍔╃寧' },
  { key: 'haul', label: '椹繍' }
]

beastTaskOptions.push(
  { key: 'sniff', label: '娲炵┐鍡呮帰' },
  { key: 'omen', label: '绁吀鍚夊厗' }
)

const {
  optionMapToList, PLAYER_STAND_HEIGHT, minimapRadius, weatherMeta, inventoryItems, experiencePercent, questProgressPercent, displayPlayerZ, weatherLabel, formatCountdown, announcementText, activeResourceTide, resourceTideText, activeMigrationSeason, migrationSeasonText, activeCelestialWindow, celestialWindowText, activeWorldEvent, activeWorldEventActionOptions, selectedWorldEventActionKey, activeSeasonObjective, seasonObjectiveText, seasonObjectiveActiveHint, worldEventText, worldEventRewardText, isInsideResourceTide, resourceTideGatherBonus, isCurrentTribeEntity, formatMapPoint, oathVisualClass, describeLandmark, tribeRuneHonorText, mapToMinimap, minimapPlayer, mapLandmarks, isInsideSeasonObjective, minimapLandmarks, nearestLandmarkText, roleLabel, tribeRoleLabel, canManageTribeTargets, oralChainLines, oralChainReady, oralChainProgressText, oralChainThemeText, syncTribeAnnouncementDraft, lastSeasonChampion, normalizeWorldRumors, visibleWorldRumors, mergeWorldRumor, tribeCampBuildingTags, tribeCampSummaryText, foodPressureText, tradeResourceText, tradeText, tradeDirectionText, activeTribeCelestialWindow, celestialBranchOptions, weatherForecastSignOptions, weatherName, tribeLawOptions, sharedPuzzleOptions, worldRiddlePredictionOptions, trialGroundActions, rumorTruthActions, echoItemTypeOptions, echoItemExperienceOptions, lostItemActions, namedLandmarkOptions, beastSpecialtyLabel, tribeHistoryFilters, governanceHistoryTypes, mergeHistoryEvents, allTribeHistory, filteredTribeHistory, visibleTribeHistory, hasMoreTribeHistory, historyTypeLabel, formatHistoryTime, formatRemainingSeconds, trialGroundRewardText, forbiddenEdgeRewardText, forbiddenEdgeRouteProofRewardText, personalConflictText, personalIdentity, personalIdentityOptions, personalIdentityCooldownText, personalIdentityActionText, activeTribeRitual, tribeRitualText, tribeRitualCostText, activeCelebrationBuff, celebrationBuffText, celebrationGatherBonus, celebrationDiscoveryHint, celebrationTradeHint, activeOathKey, oathGatherBonus, oathOptions, oathText, oathTaskText, flagPatrolChainText, tribeGatherBonus, boundaryClass, boundaryActionOptions, boundaryTemperatureActionOptions, allianceSignalActions, commonJudgeActions, disputeWitnessActionOptions, oldGrudgeAnchorOptions, oldGrudgeSealActionOptions, shadowTaskActionOptions, diplomacyCouncilActionOptions, apprenticeExchangeActionOptions, guestStayTargets, guestStayActionOptions, campDebtActionOptions, ashCountActionOptions, personalTokenOptions, renownPledgeOptions, personalDarkOathOptions, emergencyChoiceActionOptions, mutualAidActionOptions, disasterCoopActionOptions, caravanActionOptions, nomadVisitorActionOptions, nomadVisitorAftereffectActionOptions, farReplyActionOptions, travelerSongActionOptions, travelerTuneLineageActionOptions, collectionActionOptions, caveRaceActionOptions, caveReturnActionOptions, oralMapActionOptions, tribeCustomOptions, activeBoundaryFlag, activeBoundaryProgressText, tribeTargetProgressPercent, caveExpeditionReady, caveRuneFindsBonus, hasTribeWorkbench, hasTribeRoad, beastSpecialtyOptions, activeBeastTask, activeBeastTaskText, celebrationChoiceOptions, seasonTabooOptions, standingRitualOptions, standingRitualStances, communalCookOptions, communalCookIngredients, drumRhythmOptions, drumRhythmBeats, groupEmoteOptions, campShiftOptions, campCouncilActionOptions, wonderActionOptions, consensusFireActionOptions, lostTechSourceOptions, lostTechOptions, craftLegacyStyleOptions, sacredFireDestinationOptions, sacredFireStepOptions, mentorshipFocusOptions, nightOutingOptions, dreamOmenSources, dreamOmenActions, ancestorQuestionOptions, ancestorQuestionAnswers, oldCampEchoActionOptions, borderTheaterActionOptions, fogTrailActionOptions, forbiddenEdgeActionOptions, forbiddenEdgeRouteProofActionOptions, trailMarkerTypes, trailMarkerActions, neutralSanctuaryActions, campTrialOptions, standingRitualLandmarkBonuses, migrationPlanOptions, activeMigrationPlan, selectedCavePlan, caveExpeditionStatusText, activeCaveNode, caveRouteComplete, caveRouteProgressPercent, tribeRoadmapItems, sortedTribeMembers, canStartVote, canReviewApplications, tribeApplications, voteRules, voteRuleHint, canNominate, canNominateSelfLeader, canGovernMember
} = createGameViewComputed({ activeCaveNodeIndex, activeQuest, caveExpeditionPlanKey, caveExpeditionPlans, caveFoodSupported, caveRoute, currentTribe, currentWeather, decorations, interactionTarget, inventory, landmarkFallbackTypes, mapEnvironment, noTribeGuestStayActions, noTribeGuestStayTargets, personalConflictStatus, playerExperience, playerId, playerNextLevelExperience, playerX, playerZ, resourceTideTick, seasonSummary, tradeResourceLabels, tribeAnnouncementDraft, tribeBuildingTypeLabels, tribeHistoryFilter, tribeHistoryLoaded, tribeHistoryNextCursor, tribeRitualTick, tribeRole, worldEventActionKey, worldRumors })
const openTribeHistoryDetail = (event) => {
  activeHistoryDetail.value = event || {}
  showHistoryDetail.value = true
}

const activeHistoryReplay = computed(() => buildTribeHistoryReplay(activeHistoryDetail.value, { formatHistoryTime, tradeResourceText }))

const closeTribeHistoryDetail = () => {
  showHistoryDetail.value = false
  activeHistoryDetail.value = {}
}

const resetTribeHistoryPage = (tribe) => {
  tribeHistoryLoaded.value = []
  tribeHistoryNextCursor.value = Array.isArray(tribe?.history) ? tribe.history.length : null
  tribeHistoryTotal.value = Number(tribe?.historyTotal || tribe?.history?.length || 0)
  tribeHistoryLoading.value = false
}

const loadMoreTribeHistory = () => {
  if (tribeHistoryLoading.value || !hasMoreTribeHistory.value) return
  tribeHistoryLoading.value = true
  if (!sendGameMessage({
    type: 'tribe_history_page',
    cursor: tribeHistoryNextCursor.value || 0,
    limit: currentTribe.value?.historyPageSize || tribeHistoryPageSize
  })) {
    tribeHistoryLoading.value = false
  }
}

const getSeaLevel = () => {
  const sea = mapEnvironment.value?.seaLevel
  return (typeof sea === 'number' && Number.isFinite(sea)) ? sea : -0.8
}

const getTerrainHeightAt = (x, z) => {
  if (!terrain?.geometry) return null
  const geometry = terrain.geometry
  const params = geometry.parameters || {}
  const width = params.width
  const height = params.height
  const widthSegments = params.widthSegments
  const heightSegments = params.heightSegments

  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    typeof widthSegments !== 'number' ||
    typeof heightSegments !== 'number'
  ) {
    return null
  }

  const local = terrain.worldToLocal(new THREE.Vector3(x, 0, z))
  const u = (local.x + width / 2) / width
  const v = (local.y + height / 2) / height

  if (u < 0 || u > 1 || v < 0 || v > 1) return null

  const ix = u * widthSegments
  const iz = v * heightSegments
  const x0 = Math.floor(ix)
  const z0 = Math.floor(iz)
  const x1 = Math.min(x0 + 1, widthSegments)
  const z1 = Math.min(z0 + 1, heightSegments)
  const tx = ix - x0
  const tz = iz - z0

  const positions = geometry.attributes.position.array
  const stride = 3
  const rowStride = (widthSegments + 1) * stride

  const heightAt = (xi, zi) => {
    const idx = zi * rowStride + xi * stride
    return positions[idx + 2]
  }

  const h00 = heightAt(x0, z0)
  const h10 = heightAt(x1, z0)
  const h01 = heightAt(x0, z1)
  const h11 = heightAt(x1, z1)

  const h0 = h00 * (1 - tx) + h10 * tx
  const h1 = h01 * (1 - tx) + h11 * tx
  const hLocal = h0 * (1 - tz) + h1 * tz

  const worldPoint = terrain.localToWorld(new THREE.Vector3(local.x, local.y, hLocal))
  return worldPoint.y
}

const getGroundHeightAt = (x, z) => {
  const seaLevel = getSeaLevel()
  const oceanFloorY = seaLevel - 40

  const terrainY = getTerrainHeightAt(x, z)
  if (terrainY === null) return oceanFloorY

  // 姘撮潰鍖哄煙锛氬湴褰綆浜庢捣骞抽潰锛屽垯澶卞幓鍦伴潰鏀拺锛岀洿鎺ユ帀鍒版捣搴?
  if (terrainY < seaLevel) return oceanFloorY

  // 闄嗗湴鍖哄煙锛氱珯鍦ㄥ湴褰笂
  return terrainY + PLAYER_STAND_HEIGHT
}

// 鍒濆鍖栨父鎴?
const initGame = async () => {
  try {
    // 鍒涘缓鍦烘櫙
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xaed8f2) // 澶╃┖钃?
    scene.fog = new THREE.Fog(0xaed8f2, 80, 360)
    world = new WorldEntityManager({ scene, loadDistance, unloadDistance })
    weatherSystem = createWeatherSystem(scene)

    // 鍒涘缓鐩告満
    camera = new THREE.PerspectiveCamera(
      75,
      canvasWrapper.value.clientWidth / canvasWrapper.value.clientHeight,
      0.1,
      1000
    )
    // 璋冩暣鐩告満鍒濆浣嶇疆锛氫粠鍚庢柟锛?Z锛夌湅鍚戝墠鏂癸紙+Z锛夛紝杩欐牱W閿線鍓嶈蛋灏卞緢鑷劧
    camera.position.set(0, 10, 20)

    // 鍒涘缓娓叉煋鍣?
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(canvasWrapper.value.clientWidth, canvasWrapper.value.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    canvasWrapper.value.appendChild(renderer.domElement)

    // 娣诲姞鎺у埗鍣?
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.1 // 闃叉鐩告満绌胯繃鍦伴潰
    controls.minDistance = 5
    controls.maxDistance = 50
    controls.target.copy(cameraFollowTarget)
    hasCameraFollowTarget = true

    // 閰嶇疆榧犳爣鎸夐挳锛氬彸閿棆杞紝婊氳疆缂╂斁锛岀鐢ㄥ乏閿钩绉?
    controls.mouseButtons = {
      LEFT: null,  // 绂佺敤宸﹂敭
      MIDDLE: THREE.MOUSE.DOLLY,  // 涓敭缂╂斁
      RIGHT: THREE.MOUSE.ROTATE   // 鍙抽敭鏃嬭浆
    }

    // 绂佺敤鍙抽敭鑿滃崟
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())

    // 瀹氫箟鍏ㄥ眬澶嶇敤鍙橀噺锛岄伩鍏嶅湪寰幆涓噸澶嶅垱寤猴紙浼樺寲鎬ц兘锛?
    const tempCameraPosition = new THREE.Vector3()
    const tempTargetPosition = new THREE.Vector3()
    // 娣诲姞鍏夋簮
    ambientLight = new THREE.AmbientLight(0xfff7e8, 0.38)
    scene.add(ambientLight)

    hemisphereLight = new THREE.HemisphereLight(0xbfe7ff, 0x4c3b2d, 0.62)
    scene.add(hemisphereLight)

    directionalLight = new THREE.DirectionalLight(0xfff1c9, 1.08)
    directionalLight.position.set(56, 92, 34)
    directionalLight.castShadow = true
    directionalLight.shadow.camera.left = -72
    directionalLight.shadow.camera.right = 72
    directionalLight.shadow.camera.top = 72
    directionalLight.shadow.camera.bottom = -72
    directionalLight.shadow.camera.near = 8
    directionalLight.shadow.camera.far = 190
    directionalLight.shadow.bias = -0.00018
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // 鍒涘缓鍦板舰
    createTerrain()

    // 鍒涘缓鏈湴鐜╁
    createLocalPlayer()

    // 鍒濆鍖?WebSocket 杩炴帴
    initWebSocket()

    // 鐩戝惉閿洏浜嬩欢
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // 鐩戝惉绐楀彛澶у皬鍙樺寲
    window.addEventListener('resize', handleResize)

    // 鍚姩娓叉煋寰幆
    animate()

    console.log('3D 娓告垙鍒濆鍖栨垚鍔?')
  } catch (error) {
    console.error('娓告垙鍒濆鍖栧け璐?', error)
    connectionStatus.value = 'disconnected'
  }
}

const resetLoadedDecorations = () => {
  world?.resetLoadedDecorations()
  loadedObjectsCount.value = 0
}

const applyWeatherLighting = (weather) => {
  if (!ambientLight || !directionalLight) return

  const presets = {
    sunny: {
      ambient: 0.4,
      hemisphere: 0.68,
      directional: 1.08,
      lightColor: 0xfff1c9
    },
    rain: {
      ambient: 0.34,
      hemisphere: 0.42,
      directional: 0.55,
      lightColor: 0xb6c6d5
    },
    snow: {
      ambient: 0.52,
      hemisphere: 0.74,
      directional: 0.7,
      lightColor: 0xe8f4ff
    },
    fog: {
      ambient: 0.44,
      hemisphere: 0.5,
      directional: 0.34,
      lightColor: 0xc9d0cf
    }
  }

  const preset = presets[weather] || presets.sunny
  ambientLight.intensity = preset.ambient
  if (hemisphereLight) hemisphereLight.intensity = preset.hemisphere
  directionalLight.intensity = preset.directional
  directionalLight.color.set(preset.lightColor)
}

const clearRemotePlayers = () => {
  if (!scene) {
    remotePlayers.clear()
    return
  }

  remotePlayers.forEach((player) => {
    player.mesh.userData.disposed = true
    scene.remove(player.mesh)
  })
  remotePlayers.clear()
}

function applyMapData(mapData) {
  if (!mapData) return

  mapSeed.value = mapData.seed ?? null
  const serverDecorations = Array.isArray(mapData.decorations) ? mapData.decorations : []
  const extraDecorations = (Array.isArray(mapData.environment?.landmarks) ? mapData.environment.landmarks : [])
    .filter((landmark) => landmark?.id && tribeLandmarkDecorationTypes.has(landmark.type))
    .filter((landmark) => !serverDecorations.some((decoration) => decoration.id === landmark.id))
    .map((landmark) => ({
      ...landmark,
      y: typeof landmark.y === 'number' ? landmark.y : 0
    }))

  decorations = [...serverDecorations, ...extraDecorations]
  totalObjectsCount.value = decorations.length

  world?.setSeed(mapData.seed ?? 0)
  resetLoadedDecorations()
  world?.setDecorations(decorations)

  if (mapData.environment) applyEnvironment(mapData.environment)
}

function beastTaskVisualPatch(task) {
  const taskKey = task?.taskKey
  const taskBehavior = {
    guard: { behavior: 'guard', patrolRadius: 1.3, workLabel: '鎵ц瀹堣惀' },
    hunt: { behavior: 'patrol', patrolRadius: 2.4, workLabel: '鎵ц鍔╃寧' },
    haul: { behavior: 'carry', patrolRadius: 1.8, workLabel: '鎵ц椹繍' }
  }[taskKey]
  if (!taskBehavior) return null
  return {
    ...taskBehavior,
    activeTask: task,
    y: 0
  }
}

function syncActiveBeastVisual() {
  const tribeId = currentTribe.value?.id
  const task = activeBeastTask.value
  if (!tribeId || !world) return
  const markerId = `${tribeId}_beast_marker`
  const patch = beastTaskVisualPatch(task)
  if (!patch) return
  if (world.updateDecoration(markerId, patch)) {
    const decoration = decorations.find((item) => item?.id === markerId)
    if (decoration) Object.assign(decoration, patch)
    updateInteractionTarget()
  }
  if (beastFeedbackClearTimerId) clearTimeout(beastFeedbackClearTimerId)
  beastFeedbackClearTimerId = setTimeout(() => {
    applyTribeLandmarkState()
    beastFeedbackClearTimerId = null
  }, Math.max(1000, (task.remainingSeconds + 1) * 1000))
}

function applyTribeLandmarkState() {
  const landmarks = Array.isArray(mapEnvironment.value?.landmarks) ? mapEnvironment.value.landmarks : []
  let changed = false
  for (const landmark of landmarks) {
    if (!landmark?.id || !tribeLandmarkDecorationTypes.has(landmark.type)) continue
    const patch = { ...landmark, y: typeof landmark.y === 'number' ? landmark.y : 0 }
    if (world?.updateDecoration(landmark.id, patch)) {
      const decoration = decorations.find((item) => item?.id === landmark.id)
      if (decoration) Object.assign(decoration, patch)
      changed = true
    }
  }
  if (changed) updateInteractionTarget()
}

function applyEnvironment(environment) {
  if (!scene || !environment) return

  mapEnvironment.value = environment
  currentWeather.value = environment.weather || 'sunny'
  world?.setEnvironment(environment)
  applyTribeLandmarkState()
  weatherSystem?.apply(environment.weather || 'sunny')
  applyWeatherLighting(environment.weather || 'sunny')
}

// 鍒涘缓鍦板舰
const createTerrain = () => {
  // 鍒涘缓鍦伴潰缃戞牸 - 闄嶄綆鍒嗘鏁颁互鎻愬崌鎬ц兘
  const gridSize = 220
  const segments = 72
  const geometry = new THREE.PlaneGeometry(gridSize, gridSize, segments, segments)

  // 娣诲姞闅忔満楂樺害锛堢畝鍗曠殑鍦板舰锛?
  const vertices = geometry.attributes.position.array
  const colors = []
  const lowColor = new THREE.Color(0x5f8f52)
  const grassColor = new THREE.Color(0x2f7f3f)
  const highColor = new THREE.Color(0x9aa071)
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]
    const z = vertices[i + 1]
    // 浣跨敤绠€鍗曠殑鍣０鍑芥暟鐢熸垚楂樺害
    const broad = Math.sin(x / 18) * Math.cos(z / 16) * 1.9
    const small = Math.sin((x + z) / 8) * 0.45 + Math.cos((x - z) / 13) * 0.35
    const height = broad + small
    vertices[i + 2] = height

    const color = grassColor.clone()
    if (height < -0.9) color.lerp(lowColor, Math.min(1, Math.abs(height) / 2.2))
    if (height > 1.2) color.lerp(highColor, Math.min(1, (height - 1.2) / 2.8))
    const shade = 0.94 + Math.sin(x / 7) * 0.03 + Math.cos(z / 9) * 0.03
    color.multiplyScalar(shade)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  // 鍒涘缓鏉愯川
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.02,
    wireframe: false
  })

  terrain = new THREE.Mesh(geometry, material)
  terrain.rotation.x = -Math.PI / 2
  terrain.receiveShadow = true
  scene.add(terrain)

  // 娣诲姞缃戞牸杈呭姪绾?- 闄嶄綆鍒嗘鏁?
  const gridHelper = new THREE.GridHelper(gridSize, 22, 0x315a42, 0x315a42)
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.08
  gridHelper.position.y = 0.035
  scene.add(gridHelper)
}

// 鏍规嵁鐜╁浣嶇疆鍔ㄦ€佸姞杞?鍗歌浇瑁呴グ鐗╋紙AOI 鎳掑姞杞斤級
const updateDecorations = () => {
  if (!localPlayer) return
  world?.updateDecorations(localPlayer.position)
  loadedObjectsCount.value = world?.getLoadedCount() ?? 0
}

const buildTribeInteraction = (entity) => {
  if (!entity) return null

  const ownTribe = isCurrentTribeEntity(entity)
  const tribeName = entity.tribeName || entity.label || 'tribe'
  const target = currentTribe.value?.target

  if (entity.type === 'tribe_totem') {
    const oathText = entity.oathLabel ? `锛屽浘鑵炬梺淇濈暀鐫€${entity.oathLabel}鐨勬爣璁癭` : ''
    return {
      entity,
      label: entity.label || '閮ㄨ惤鍥捐吘',
      actionText: '鏌ョ湅',
      rewardText: ownTribe
        ? `杩欓噷鏄綘浠儴钀界殑璁簨鏍稿績${oathText}锛岄潬杩戝嵆鍙墦寮€閮ㄨ惤闈㈡澘`
        : `${tribeName}鐨勫浘鑵剧珛鍦ㄨ繖閲${oathText}锛岃鏄庨檮杩戝凡缁忔湁绋冲畾钀ュ湴`
    }
  }

  if (entity.type === 'tribe_storage') {
    return {
      entity,
      label: entity.label || '閮ㄨ惤浠撳簱',
      actionText: ownTribe ? '涓婁氦' : '鏌ョ湅',
      rewardText: ownTribe
        ? '鎶婃湪鏉愬拰鐭冲潡閫佸叆鍏叡浠撳簱锛屾帹鍔ㄨ惀鍦板缓璁?'
        : `${tribeName}鐨勫叕鍏变粨搴撳氨鍦ㄨ繖閲岋紝澶栦汉鍙兘杩滆`
    }
  }

  if (entity.type === 'tribe_workbench') {
    const targetText = target ? `褰撳墠鐩爣锛${target.title}` : '杩欓噷浼氶€愭鎵挎媴寤洪€犲拰閮ㄨ惤鐩爣瑙勫垝'
    return {
      entity,
      label: entity.label || '鐭冲櫒鍙?',
      actionText: ownTribe ? (target?.completed && canManageTribeTargets.value ? '鎺ㄨ繘' : '瑙勫垝') : '瑙傚療',
      rewardText: ownTribe ? targetText : `${tribeName}姝ｅ湪杩欓噷鍔犲伐宸ュ叿鍜屽畨鎺掑缓閫燻`
    }
  }

  if (entity.type === 'tribe_hut') {
    return {
      entity,
      label: entity.label || '妫氬眿',
      actionText: ownTribe ? '姝囪剼' : '鏌ョ湅',
      rewardText: ownTribe
        ? '妫氬眿璁╄惀鍦版洿鍍忓锛屽悗闈㈠緢閫傚悎鎺ョ潯鐪犲拰浼戞暣鐜╂硶'
        : `${tribeName}宸茬粡鍦ㄨ繖閲屼綇涓嬫潵浜哷`
    }
  }

  if (entity.type === 'tribe_fence') {
    return {
      entity,
      label: entity.label || '钀ュ湴鍥存爮',
      actionText: ownTribe ? '宸＄湅' : '瑙傚療',
      rewardText: ownTribe
        ? '鍥存爮鎶婅惀鍦拌竟鐣屽湀鍑烘潵锛屽悗缁彲浠ユ帴瀹堣竟銆侀┍绂诲拰闃叉姢鏀剁泭'
        : `${tribeName}宸茬粡鍦ㄨ繖閲岀珛璧峰洿鏍忥紝钀ュ湴鑼冨洿鏇村姞娓呮`
    }
  }

  if (entity.type === 'tribe_road') {
    return {
      entity,
      label: entity.label || '钀ュ湴閬撹矾',
      actionText: ownTribe ? '宸＄湅' : '瑙傚療',
      rewardText: ownTribe
        ? '閬撹矾鎶婅惀鍦板拰澶栭儴璺嚎鎺ヨ捣鏉ワ紝鍚庣画鍙互鎺ュ贰鏌ャ€佽繍杈撳拰璐告槗鏀剁泭'
        : `${tribeName}宸茬粡鎶婇€氳矾鏁寸悊鍑烘潵锛屽線鏉ヨ矾绾挎洿鍔犳槑鏄綻`
    }
  }

  if (entity.type === 'tribe_spawn') {
    return {
      entity,
      label: entity.label || '鍑虹敓鐐?',
      actionText: ownTribe ? '纭' : '鏌ョ湅',
      rewardText: ownTribe
        ? '杩欐槸浣犱滑閮ㄨ惤鐨勫浐瀹氶泦缁撶偣锛屾柊鎴愬憳鍔犲叆鍚庝細浠庤繖閲屽嚭鍙?'
        : `${tribeName}鐨勪汉浼氫粠杩欎釜浣嶇疆杩涘叆钀ュ湴`
    }
  }

  if (entity.type === 'tribe_camp') {
    const oathText = entity.oathLabel ? `锛岃惀鍦版寜${entity.oathLabel}甯冪疆浜嗘爣璁癭` : ''
    return {
      entity,
      label: entity.label || '钀ュ湴',
      actionText: ownTribe ? '鏁撮槦' : '鏌ョ湅',
      rewardText: ownTribe
        ? `钀ュ湴鏍稿績宸茬粡鍥哄畾涓嬫潵${oathText}锛屽浘鑵俱€佷粨搴撳拰鐭冲櫒鍙板洿缁曡繖閲屽睍寮€`
        : `${tribeName}宸茬粡鎶婅繖閲岀粡钀ユ垚浜嗚嚜宸辩殑鏍稿績钀ュ湴${oathText}`
    }
  }

  if (entity.type === 'tribe_flag') {
    const oathText = entity.oathLabel ? `锛屾棗闈㈠甫鐫€${entity.oathLabel}鐨勭汗鏍穈` : ''
    const patrolText = entity.lastPatrolledBy ? `锛涗笂娆＄敱${entity.lastPatrolledBy}宸℃煡` : ''
    const relation = entity.boundaryRelation
    const relationText = relation?.label ? `锛${relation.label}锛氳窛${relation.otherTribeName || '鍏朵粬閮ㄨ惤'}绾${relation.distance || '?'}m` : ''
    return {
      entity,
      label: entity.label || '棰嗗湴鏃楀笢',
      actionText: ownTribe ? '宸℃煡' : '瑙傚療',
      rewardText: ownTribe
        ? `杩欓潰鏃楀笢瀹ｅ憡浜嗕綘浠儴钀界殑璧勬簮娲诲姩鍖${oathText}${patrolText}${relationText}`
        : `${tribeName}宸茬粡鍦ㄨ繖閲屾彃鏃${oathText}${relationText}锛岄潬杩戞椂鏈€濂界暀鎰忓鏂圭殑璧勬簮瀹ｅ憡`
    }
  }

  if (entity.type === 'tribe_beast_marker') {
    const specialty = entity.specialty && entity.specialty !== 'young'
      ? `锛屼笓闀挎槸${beastSpecialtyLabel(entity.specialty)}`
      : ''
    const workText = entity.workLabel ? `锛屾鍦${entity.workLabel}` : ''
    return {
      entity,
      label: entity.label || '椹吇骞煎吔',
      actionText: ownTribe ? '瀹夋姎' : '瑙傚療',
      rewardText: ownTribe
        ? `骞煎吔鍦ㄨ惀鍦伴檮杩戞椿鍔${specialty}${workText}`
        : `${tribeName}鐨勯┋鍏诲辜鍏藉畧鍦ㄩ檮杩${workText}`
    }
  }

  if (entity.type === 'scouted_resource_site') {
    const contestText = entity.contested ? `锛涙鍦ㄤ笌${entity.contestedByTribeName || '鍏朵粬閮ㄨ惤'}浜夊ず` : ''
    const sharedText = entity.jointWatchId ? `锛涗笌${entity.sharedWithTribeName || '閭昏繎閮ㄨ惤'}鍏变韩` : ''
    return {
      entity,
      label: entity.label || '渚﹀療璧勬簮鐐?',
      actionText: ownTribe ? '纭' : '瑙傚療',
      rewardText: ownTribe
        ? `${entity.regionLabel || '闄勮繎鍖哄煙'}鐨勪复鏃剁嚎绱紝鍙浆鍖栦负閮ㄨ惤浠撳簱銆侀鐗╂垨鍙戠幇杩涘害${contestText}${sharedText}`
        : `${tribeName}鐨勪睛瀵熼槦鐣欎笅浜嗚祫婧愮嚎绱${contestText}${sharedText}`
    }
  }

  if (entity.type === 'controlled_resource_site') {
    const patrolText = entity.lastPatrolledBy ? `锛涗笂娆＄敱${entity.lastPatrolledBy}宸″畧` : ''
    const relayText = entity.lastRelayedBy ? `锛涗笂娆＄敱${entity.lastRelayedBy}杩愯緭` : (ownTribe && hasTribeRoad.value ? '锛涘彲缁勭粐閬撹矾杩愯緭' : '')
    const tradeText = entity.contestResolvedAs === 'trade_path' ? 'trade route bonus' : ''
    return {
      entity,
      label: entity.label || '鎺у埗璧勬簮鐐?',
      actionText: ownTribe ? '鏀跺彇' : '瑙傚療',
      rewardText: ownTribe
        ? `${entity.regionLabel || '闄勮繎鍖哄煙'}鐨勭煭鏃舵帶鍒剁偣锛孡v.${entity.level || 1}锛屽彲鍛ㄦ湡甯﹀洖璧勬簮${patrolText}${relayText}${tradeText}`
        : `${tribeName}宸茬粡鎺у埗浜嗚繖澶勮祫婧愮偣`
    }
  }

  if (entity.type === 'trade_route_site') {
    const collectedText = entity.lastCollectedBy ? `锛涗笂娆＄敱${entity.lastCollectedBy}鏁寸悊` : ''
    const marketText = entity.isBorderMarket ? `锛涜竟甯傚紑鏀句腑锛${entity.marketRewardLabel || '浜掑競鍔犳垚'}` : `锛涙暣鐞${entity.collectCount || 0}/${entity.marketCollectTarget || 3}鍙崌鎴愯竟甯俙`
    return {
      entity,
      label: entity.label || '浜ゆ崲閫氳矾璐告槗鐐?',
      actionText: ownTribe ? '鏀跺彇' : '瑙傚療',
      rewardText: ownTribe
        ? `涓${entity.partnerTribeName || '閭昏繎閮ㄨ惤'}鍏变韩鐨勭煭鏃惰锤鏄撶偣锛屽彲鍛ㄦ湡甯﹀洖淇¤獕鍜屽皬棰濊祫婧${marketText}${collectedText}`
        : `${tribeName}姝ｅ湪缁存姢杩欐潯浜ゆ崲閫氳矾`
    }
  }

  if (entity.type === 'nomad_caravan') {
    return {
      entity,
      label: entity.label || '娓哥墽鍟嗛槦',
      actionText: ownTribe ? '鎺ュ緟' : '瑙傚療',
      rewardText: ownTribe ? (entity.summary || 'caravan available') : `${tribeName} caravan`
    }
  }

  if (entity.type === 'nomad_visitor') {
    return {
      entity,
      label: entity.label || '绁炵鏃呬汉',
      actionText: ownTribe ? '鎺ュ緟' : '瑙傚療',
      rewardText: ownTribe ? (entity.summary || 'visitor available') : `${tribeName} visitor`
    }
  }

  if (entity.type === 'alliance_signal') {
    return {
      entity,
      label: entity.label || '鑱旂洘鏃楄',
      actionText: ownTribe ? '鏌ョ湅' : '瑙傚療',
      rewardText: ownTribe ? (entity.summary || 'alliance signal active') : `${tribeName} alliance signal`
    }
  }

  if (entity.type === 'dispute_witness_stone') {
    return {
      entity,
      label: entity.label || '浜夌瑙佽瘉鐭?',
      actionText: ownTribe ? '瑙佽瘉' : '瑙傚療',
      rewardText: ownTribe
        ? `${entity.summary || '浜夌缁撴灉娌夋垚浜嗗彲鍏紑缁存姢鐨勮璇佺煶'}锛涜繘搴?${entity.progress || 0}/${entity.target || 1}`
        : `${tribeName}姝ｅ湪缁存姢浜夌瑙佽瘉鐭砢`
    }
  }

  if (entity.type === 'world_event_remnant') {
    const sourceText = entity.sourceActionLabel ? `锛涙潵鑷${entity.sourceActionLabel}` : ''
    return {
      entity,
      label: entity.label || '浜嬩欢浣欒抗',
      actionText: ownTribe ? '鏁寸悊' : '瑙傚療',
      rewardText: ownTribe ? `${entity.rewardLabel || 'reward'}${sourceText}` : `${tribeName} event remnant`
    }
  }

  if (entity.type === 'map_memory_trace') {
    return {
      entity,
      label: entity.label || '娲诲湴鍥捐蹇?',
      actionText: ownTribe ? '閲嶈' : '瑙傚療',
      rewardText: ownTribe ? (entity.summary || entity.rewardLabel || 'map memory') : `${tribeName} map memory`
    }
  }

  if (entity.type === 'map_tile_trace') {
    return {
      entity,
      label: entity.label || '地块痕迹',
      actionText: ownTribe ? '整理' : '观察',
      rewardText: ownTribe ? (entity.summary || entity.rewardLabel || 'map trace') : `${tribeName} map trace`
    }
  }

  if (entity.type === 'rare_cave_race') {
    return {
      entity,
      label: entity.label || '鐭椂绋€鏈夋礊绌?',
      actionText: ownTribe ? 'claim' : 'view',
      rewardText: ownTribe ? (entity.summary || 'rare cave race') : `${tribeName} cave clue`
    }
  }

  if (entity.type === 'cave_rescue_clue') {
    return {
      entity,
      label: entity.label || '娲炵┐钀ユ晳绾跨储',
      actionText: ownTribe ? '钀ユ晳' : '瑙傚療',
      rewardText: ownTribe
        ? `${entity.missingMemberName || '闃熷弸'}鐣欎笅绾跨储锛岃惀鏁?${entity.progress || 0}/${entity.target || 1}`
        : `${tribeName}姝ｅ湪澶勭悊娲炵┐钀ユ晳绾跨储`
    }
  }

  if (entity.type === 'forbidden_edge') {
    return {
      entity,
      label: entity.label || '绂佸湴杈圭紭',
      actionText: ownTribe ? '璇曟帰' : '瑙傚療',
      rewardText: ownTribe ? (entity.summary || 'forbidden edge') : `${tribeName} forbidden edge`
    }
  }

  if (entity.type === 'fog_trail') {
    return {
      entity,
      label: entity.label || '闆惧尯鎺㈣矾',
      actionText: ownTribe ? '鎺㈣矾' : '瑙傚療',
      rewardText: ownTribe
        ? `${entity.summary || '闆句腑璺嚎鐭椂鏄鹃湶'}锛涘凡鎺㈣矾 ${entity.participantCount || 0} 浜猴紝鍙湪閮ㄨ惤闈㈡澘閫夋嫨鎺㈢嚎鏂瑰紡`
        : `${tribeName}姝ｅ湪璇曟帰闆句腑璺嚎`
    }
  }

  if (entity.type === 'cave_return_mark') {
    return {
      entity,
      label: entity.label || '娲炵┐褰掕矾鏍囪',
      actionText: ownTribe ? '鏁寸悊' : '瑙傚療',
      rewardText: ownTribe
        ? `${entity.summary || '娲炲彛鐣欎笅鍙暣鐞嗙殑褰掕矾'}锛涜繘搴?${entity.progress || 0}/${entity.target || 1}`
        : `${tribeName}鐣欎笅浜嗘礊绌村綊璺爣璁癭`
    }
  }

  if (entity.type === 'trial_ground') {
    return {
      entity,
      label: entity.label || '钀ュ湴璇曠偧鍦?',
      actionText: ownTribe ? '璇曠偧' : '瑙傚療',
      rewardText: ownTribe ? (entity.summary || `trial ${entity.participantCount || 0}`) : `${tribeName} trial ground`
    }
  }

  if (entity.type === 'diplomacy_council_site') {
    const names = Array.isArray(entity.participantTribeNames) ? entity.participantTribeNames.join(', ') : ''
    return {
      entity,
      label: entity.label || '澶ц浼氫笌杈瑰競鑺?',
      actionText: ownTribe ? '涓绘寔' : '瑙傚療',
      rewardText: ownTribe ? `${entity.summary || 'diplomacy council'}${names ? `: ${names}` : ''}` : `${tribeName} diplomacy council`
    }
  }

  if (entity.type === 'celebration_echo') {
    return {
      entity,
      label: entity.label || '搴嗗姛浣欓煹',
      actionText: ownTribe ? '鍔犲叆' : '瑙傚療',
      rewardText: ownTribe ? (entity.summary || entity.rewardLabel || 'celebration echo') : `${tribeName} celebration`
    }
  }

  if (entity.type === 'named_landmark') {
    return {
      entity,
      label: entity.label || '鏈夊悕涔嬪湴',
      actionText: '鏌ョ湅',
      rewardText: ownTribe
        ? `${entity.summary || '杩欎釜鍚嶅瓧宸茬粡鍐欒繘閮ㄨ惤鍦板浘'}锛涙潵婧愶細${entity.sourceLabel || '閮ㄨ惤鍛藉悕'}`
        : `${tribeName}鎶婅繖閲屽啓鎴愪簡鏈夊悕涔嬪湴`
    }
  }

  if (entity.type === 'standing_ritual_site') {
    return {
      entity,
      label: entity.label || '绔欎綅浠紡',
      actionText: ownTribe ? '绔欎綅' : '瑙傚療',
      rewardText: ownTribe
        ? `鏈儴钀戒华寮忓湀宸插睍寮€锛屽綋鍓?${entity.participantCount || 0} 浜虹珯浣峘`
        : `${tribeName}姝ｅ湪涓捐绔欎綅浠紡`
    }
  }

  return null
}

const getNearestRemotePlayerTarget = () => {
  if (!localPlayer || !remotePlayers.size) return null
  let nearest = null
  let nearestDistance = Infinity
  remotePlayers.forEach((remote, id) => {
    const dx = remote.mesh.position.x - localPlayer.position.x
    const dz = remote.mesh.position.z - localPlayer.position.z
    const distance = Math.sqrt(dx * dx + dz * dz)
    if (distance < nearestDistance && distance <= 4.5) {
      nearest = { id, remote, distance }
      nearestDistance = distance
    }
  })
  if (!nearest) return null
  const data = nearest.remote.data || {}
  return {
    entity: {
      type: 'remote_player',
      id: nearest.id,
      name: data.name || `鐜╁${nearest.id.slice(0, 6)}`,
      conflictFatigue: data.conflict_fatigue || 0,
      conflictFatigueUntil: data.conflict_fatigue_until || '',
      personalRenown: data.personal_renown || 0
    },
    label: data.name || `鐜╁${nearest.id.slice(0, 6)}`,
    actionText: '鎸戞垬',
    rewardText: `涓汉鍐茬獊锛氬▉鎱戙€佹寫鎴樻垨瀹堝娍锛涚柌鍔?${data.conflict_fatigue || 0}锛屼釜浜哄０鏈?${data.personal_renown || 0}`,
    hintText: '绗竴鐗堝彧閫犳垚鐤插姵銆佸嚮閫€鍜屽叧绯诲彉鍖?'
  }
}

const getNearestResource = () => {
  if (!localPlayer || !world) return null
  const objective = activeSeasonObjective.value
  if (objective && isInsideSeasonObjective.value) {
    return {
      entity: { ...objective, type: 'season_objective' },
      label: objective.title || '瀛ｈ妭鐩爣',
      actionText: '瀹屾垚',
      rewardText: objective.summary || '瀹屾垚鐭椂瀛ｈ妭鐩爣锛屼负閮ㄨ惤甯﹀洖濂栧姳',
      hintText: celebrationDiscoveryHint.value
    }
  }
  const event = activeWorldEvent.value
  if (event) {
    const dx = playerX.value - (event.x || 0)
    const dz = playerZ.value - (event.z || 0)
    if (dx * dx + dz * dz <= Math.pow((event.radius || 16) * 0.55, 2)) {
      const reward = worldEventRewardText(event) || event.summary || '鎶婅繖涓姩鎬佷簨浠惰褰曡繘閮ㄨ惤杩涘害'
      return {
        entity: { ...event, type: 'world_event' },
        label: event.title || '涓栫晫浜嬩欢',
        actionText: '澶勭悊',
        rewardText: event.rare ? `绋€鏈変簨浠讹細${reward}` : reward
      }
    }
  }

  const remotePlayerTarget = getNearestRemotePlayerTarget()
  if (remotePlayerTarget) return remotePlayerTarget

  const tribeBuilding = world.findNearestEntityByTypes(localPlayer.position, tribeInteractableTypes, interactionDistance + 1)
  if (tribeBuilding) {
    return buildTribeInteraction(tribeBuilding)
  }

  const cave = world.findNearestEntityByTypes(localPlayer.position, ['cave_entrance'], interactionDistance + 1)
  if (cave) {
    return {
      entity: cave,
      label: cave.label || '灞辨礊',
      actionText: caveExpeditionReady.value ? '杩滃緛' : '杩涘叆',
      rewardText: caveExpeditionReady.value
        ? '閮ㄨ惤琛ョ粰宸茬粡杈炬爣锛屽彲浠ュ紑濮嬫寮忔礊绌磋繙寰?'
        : '娲為噷鍙兘鏈夌熆鐭炽€佹按鏅跺拰鍙よ€佺嚎绱紝閮ㄨ惤鐩爣瀹屾垚鍚庝細鍙樻垚姝ｅ紡杩滃緛'
    }
  }

  const totem = world.findNearestEntityByTypes(localPlayer.position, ['tribe_totem'], interactionDistance + 1)
  if (totem) {
    const honorText = isCurrentTribeEntity(totem) ? tribeRuneHonorText() : '闈犺繎鍚庡彲瑙傚療杩欎釜閮ㄨ惤鐨勫浘鑵捐崳瑾?'
    return {
      entity: totem,
      label: totem.label || '閮ㄨ惤鍥捐吘',
      actionText: '鏌ョ湅',
      rewardText: currentTribe.value ? honorText : '鍒涘缓鎴栧姞鍏ラ儴钀藉悗锛屽彲浠ュ湪杩欓噷闆嗙粨'
    }
  }

  const entity = world.findNearestInteractable(localPlayer.position, interactionDistance)
  if (!entity) return null

  const reward = resourceRewards[entity.type]
  if (!reward) return null

  return {
    entity,
    label: reward.label,
    actionText: '閲囬泦',
    rewardText: `鑾峰緱 ${reward.amount} ${reward.itemName} +${reward.experience} 缁忛獙`,
    hintText: celebrationGatherBonus.value ? `瀹撮ギ浣欓煹锛氭湰娆￠噰闆嗛澶?+${celebrationGatherBonus.value}` : ''
  }
}

const updateInteractionTarget = () => {
  interactionTarget.value = getNearestResource()
}

const openTotemDetail = (entity) => {
  const isOwn = isCurrentTribeEntity(entity)
  const summary = entity?.runeSummary || (isOwn ? currentTribe.value?.publicRuneSummary : null)
  activeTotemDetail.value = {
    label: entity?.label || '閮ㄨ惤鍥捐吘',
    summaryText: summary?.text || (isOwn ? tribeRuneHonorText() : '杩欎釜閮ㄨ惤灏氭湭鍏紑閾枃璇︽儏'),
    runes: isOwn ? (currentTribe.value?.runes || []) : (summary?.runes || [])
  }
  showTotemOverlay.value = true
}

const closeTotemDetail = () => {
  showTotemOverlay.value = false
  activeTotemDetail.value = {}
}

const showToast = (text, options = {}) => {
  const id = ++toastId
  toastMessages.value.push({ id, text, rare: Boolean(options.rare) })
  if (toastMessages.value.length > 3) {
    toastMessages.value.shift()
  }
  window.setTimeout(() => {
    toastMessages.value = toastMessages.value.filter((toast) => toast.id !== id)
  }, 2600)
}

const showRareRuneUnlock = (rune = {}, message = '') => {
  if (rareRuneUnlockTimer) window.clearTimeout(rareRuneUnlockTimer)
  rareRuneUnlock.value = rune
  showToast(message || `绋€鏈夐摥鏂囪閱掞細${rune.title || '鏈煡閾枃'}`, { rare: true })
  rareRuneUnlockTimer = window.setTimeout(() => {
    rareRuneUnlock.value = null
    rareRuneUnlockTimer = null
  }, 3600)
}

const addExperience = (amount) => {
  playerExperience.value += amount

  while (playerExperience.value >= playerNextLevelExperience.value) {
    playerExperience.value -= playerNextLevelExperience.value
    playerLevel.value += 1
    playerNextLevelExperience.value = Math.round(playerNextLevelExperience.value * 1.35)
    showToast(`鍗囩骇鍒?Lv.${playerLevel.value}锛乣`)
  }
}

const advanceQuest = (amount = 1) => {
  const quest = activeQuest.value
  if (quest.completed) return

  quest.progress = Math.min(quest.target, quest.progress + amount)
  if (quest.progress >= quest.target) {
    quest.completed = true
    quest.title = '琛ョ粰鍑嗗瀹屾垚'
    quest.description = '浣犲凡缁忔敹闆嗗埌绗竴鎵规帰绱㈢墿璧勶紝缁х画鍚戝北鑴氬拰娴峰哺瀵绘壘鏇村璧勬簮銆?'
    addExperience(60)
    showToast('浠诲姟瀹屾垚锛氳幏寰?60 缁忛獙')
  }
}

const collectInteractionTarget = () => {
  const target = interactionTarget.value || getNearestResource()
  if (!target?.entity || !world) return

  if (target.entity.type === 'remote_player') {
    resolvePersonalConflict(target.entity.id, 'challenge')
    return
  }

  if (target.entity.type === 'season_objective') {
    if (sendGameMessage({ type: 'tribe_complete_season_objective', objectiveId: target.entity.id })) {
      showToast(`宸插畬鎴${target.entity.title || '瀛ｈ妭鐩爣'}`)
    }
    return
  }

  if (target.entity.type === 'world_event') {
    const eventAction = selectedWorldEventActionKey.value
    if (sendGameMessage({ type: 'tribe_resolve_world_event', eventId: target.entity.id, eventAction })) {
      const action = activeWorldEventActionOptions.value.find((item) => item.key === eventAction)?.label || ''
      showToast(`宸${action || '澶勭悊'}${target.entity.title || '涓栫晫浜嬩欢'}`, { rare: Boolean(target.entity.rare) })
    }
    return
  }

  if (target.entity.type === 'cave_entrance') {
    enterCave(target.entity)
    return
  }

  if (target.entity.type === 'tribe_totem') {
    showTribePanel.value = true
    openTotemDetail(target.entity)
    showToast(isCurrentTribeEntity(target.entity) ? tribeRuneHonorText() : '杩欐槸鍒殑閮ㄨ惤鐣欎笅鐨勬牳蹇冨浘鑵撅紝鍚庣画浼氬睍绀哄叾閾枃鑽ｈ獕')
    return
  }

  if (target.entity.type === 'tribe_storage') {
    showTribePanel.value = true
    if (isCurrentTribeEntity(target.entity)) {
      contributeAllResources()
    } else {
      showToast('杩欏骇浠撳簱灞炰簬鍒殑閮ㄨ惤锛屽彧鑳藉厛瑙傚療')
    }
    return
  }

  if (target.entity.type === 'tribe_workbench') {
    showTribePanel.value = true
    if (currentTribe.value?.target?.completed && canManageTribeTargets.value && !currentTribe.value.target.isFinal) {
      advanceTribeTarget()
    } else {
      showToast(currentTribe.value?.target?.title ? `褰撳墠寤洪€犵洰鏍囷細${currentTribe.value.target.title}` : '鐭冲櫒鍙版殏鏃惰繕娌℃湁鏂扮殑寤洪€犵洰鏍?')
    }
    return
  }

  if (target.entity.type === 'tribe_hut') {
    showToast(isCurrentTribeEntity(target.entity) ? '妫氬眿鏄惀鍦扮敓娲诲尯锛屽悗闈㈠緢閫傚悎鎺ョ潯鐪犲拰浼戞暣鐜╂硶' : '杩欓噷鑳界湅鍑鸿繖涓儴钀藉凡缁忛暱鏈熼┗鎵?')
    return
  }

  if (target.entity.type === 'tribe_spawn') {
    showToast(isCurrentTribeEntity(target.entity) ? 'own tribe spawn' : 'other tribe spawn')
    return
  }

  if (target.entity.type === 'tribe_camp') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? 'own tribe camp' : 'other tribe camp')
    return
  }

  if (target.entity.type === 'tribe_flag') {
    if (isCurrentTribeEntity(target.entity)) {
      patrolTribeFlag(target.entity)
    } else {
      showToast('杩欐槸鍏朵粬閮ㄨ惤鐨勯鍦板鍛?')
    }
    return
  }

  if (target.entity.type === 'tribe_beast_marker') {
    const workText = target.entity.workLabel ? `锛屾鍦${target.entity.workLabel}` : ''
    showToast(isCurrentTribeEntity(target.entity) ? `骞煎吔韫簡韫綘鐨勬墜${workText}` : `杩欐槸鍏朵粬閮ㄨ惤椹吇鐨勫辜鍏${workText}`)
    return
  }

  if (target.entity.type === 'scouted_resource_site') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('杩欐槸鍏朵粬閮ㄨ惤鐨勪睛瀵熺嚎绱紝鏆傛椂鍙兘瑙傚療')
      return
    }
    if (sendGameMessage({ type: 'tribe_secure_scout_site', siteId: target.entity.id })) {
      triggerPlayerActionAnimation('gather')
      showToast('confirmed')
    }
    return
  }

  if (target.entity.type === 'controlled_resource_site') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('杩欐槸鍏朵粬閮ㄨ惤鎺у埗鐨勮祫婧愮偣')
      return
    }
    if (sendGameMessage({ type: 'tribe_collect_controlled_site', siteId: target.entity.id })) {
      triggerPlayerActionAnimation('gather')
      showToast('collected')
    }
    return
  }

  if (target.entity.type === 'trade_route_site') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('杩欐槸鍏朵粬閮ㄨ惤缁存姢鐨勪氦鎹㈤€氳矾')
      return
    }
    if (sendGameMessage({ type: 'tribe_collect_trade_route_site', siteId: target.entity.id })) {
      triggerPlayerActionAnimation(target.entity.isBorderMarket ? 'cheer' : 'gather')
      showToast('handled')
    }
    return
  }

  if (target.entity.type === 'nomad_caravan') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '娓哥墽鍟嗛槦鍋滃湪杈瑰競鏃侊紝鍙湪閮ㄨ惤闈㈡澘閫夋嫨鎺ュ緟鏂瑰紡' : '杩欐槸鍏朵粬閮ㄨ惤姝ｅ湪鎺ュ緟鐨勬父鐗у晢闃?')
    return
  }

  if (target.entity.type === 'nomad_visitor') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('cheer')
    showToast(isCurrentTribeEntity(target.entity) ? '杈圭紭鏉ヨ鑰呮鍦ㄧ瓑鍊欐帴寰咃紝鍙湪閮ㄨ惤闈㈡澘閫夋嫨鏂瑰紡' : '杩欐槸鍏朵粬閮ㄨ惤姝ｅ湪鎺ュ緟鐨勬潵璁胯€?')
    return
  }

  if (target.entity.type === 'mutual_aid_alert') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? 'own mutual aid alert' : 'other mutual aid alert')
    return
  }

  if (target.entity.type === 'alliance_signal') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('cheer')
    showToast(isCurrentTribeEntity(target.entity) ? '鑱旂洘鏃楄姝ｅ湪浼犻€掞紝閮ㄨ惤闈㈡澘宸叉墦寮€' : '杩欐槸鍏朵粬閮ㄨ惤鐨勮仈鐩熸棗璇?')
    return
  }

  if (target.entity.type === 'traveler_song') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('cheer')
    showToast(isCurrentTribeEntity(target.entity) ? 'own traveler song' : 'other traveler song')
    return
  }

  if (target.entity.type === 'border_theater') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('cheer')
    showToast(isCurrentTribeEntity(target.entity) ? 'own border theater' : 'other border theater')
    return
  }

  if (target.entity.type === 'dispute_witness_stone') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '浜夌瑙佽瘉鐭冲氨鍦ㄩ檮杩戯紝鍙湪閮ㄨ惤闈㈡澘缁存姢瑙佽瘉' : '杩欐槸鍏朵粬閮ㄨ惤鐨勪簤绔璇佺煶')
    return
  }

  if (target.entity.type === 'world_event_remnant') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('杩欐槸鍏朵粬閮ㄨ惤澶勭悊浜嬩欢鐣欎笅鐨勪綑杩?')
      return
    }
    if (sendGameMessage({ type: 'tribe_collect_world_event_remnant', remnantId: target.entity.id })) {
      triggerPlayerActionAnimation('gather')
      showToast('handled')
    }
    return
  }

  if (target.entity.type === 'map_memory_trace') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('杩欐槸鍏朵粬閮ㄨ惤鐣欎笅鐨勬椿鍦板浘璁板繂')
      return
    }
    if (sendGameMessage({ type: 'tribe_revisit_map_memory', memoryId: target.entity.id })) {
      triggerPlayerActionAnimation('ritual')
      showToast('revisiting')
    }
    return
  }

  if (target.entity.type === 'map_tile_trace') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('这是其他部落地块留下的痕迹')
      return
    }
    if (sendGameMessage({ type: 'tribe_settle_map_tile_trace', traceId: target.entity.id })) {
      triggerPlayerActionAnimation('ritual')
      showToast('整理地块痕迹')
    }
    return
  }

  if (target.entity.type === 'world_riddle_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? 'own world riddle' : 'other world riddle')
    return
  }

  if (target.entity.type === 'old_camp_echo') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('gather')
    showToast(isCurrentTribeEntity(target.entity) ? 'own old camp echo' : 'other old camp echo')
    return
  }

  if (target.entity.type === 'rare_cave_race') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? 'own rare cave race' : 'other rare cave race')
    return
  }

  if (target.entity.type === 'cave_rescue_clue') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '娲炵┐钀ユ晳绾跨储宸叉爣鍑猴紝鍙湪閮ㄨ惤闈㈡澘寰嚎钀ユ晳' : '杩欐槸鍏朵粬閮ㄨ惤鐨勬礊绌磋惀鏁戠嚎绱?')
    return
  }

  if (target.entity.type === 'forbidden_edge') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '绂佸湴杈圭紭灏卞湪闄勮繎锛屽彲鍦ㄩ儴钀介潰鏉块€夋嫨璇曟帰鏂瑰紡' : '杩欐槸鍏朵粬閮ㄨ惤鐨勭鍦拌竟缂?')
    return
  }

  if (target.entity.type === 'fog_trail') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '闆惧尯璺嚎灏卞湪闄勮繎锛屽彲鍦ㄩ儴钀介潰鏉块€夋嫨鎺㈣矾鏂瑰紡' : '杩欐槸鍏朵粬閮ㄨ惤鐨勯浘鍖烘帰璺?')
    return
  }

  if (target.entity.type === 'cave_return_mark') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('gather')
    showToast(isCurrentTribeEntity(target.entity) ? '娲炵┐褰掕矾鏍囪鍙暣鐞嗭紝閮ㄨ惤闈㈡澘宸叉墦寮€' : '杩欐槸鍏朵粬閮ㄨ惤鐨勬礊绌村綊璺?')
    return
  }

  if (target.entity.type === 'trial_ground') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? 'own trial ground' : 'other trial ground')
    return
  }

  if (target.entity.type === 'disaster_coop_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '澶х伨鍗忎綔鐐瑰氨鍦ㄩ檮杩戯紝鍙湪閮ㄨ惤闈㈡澘閫夋嫨鏁戞彺鏂瑰紡' : '杩欐槸鍏朵粬閮ㄨ惤鐨勫ぇ鐏惧崗浣滅偣')
    return
  }

  if (target.entity.type === 'diplomacy_council_site') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '澶ц浼氫細鍦哄凡灞曞紑锛屽彲鍦ㄩ儴钀介潰鏉块€夋嫨璁' : '杩欐槸鍏朵粬閮ㄨ惤姝ｅ湪绛瑰鐨勫叕寮€澶栦氦浼氬満')
    return
  }

  if (target.entity.type === 'celebration_echo') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('杩欐槸鍏朵粬閮ㄨ惤鐨勫簡鍔熶綑闊?')
      return
    }
    if (sendGameMessage({ type: 'tribe_join_celebration_echo', echoId: target.entity.id })) {
      triggerPlayerActionAnimation('cheer')
      showToast('joined')
    }
    return
  }

  if (target.entity.type === 'sacred_fire_relay' || target.entity.type === 'sacred_fire_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? 'own sacred fire relay' : 'other sacred fire relay')
    return
  }

  if (target.entity.type === 'neutral_sanctuary') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '涓珛鍦ｅ湴灏卞湪杩欓噷锛屽彲鍦ㄩ儴钀介潰鏉块€夋嫨鏈濆湥鏂瑰紡' : '杩欐槸鍏朵粬閮ㄨ惤鍙戠幇鐨勪腑绔嬪湥鍦?')
    return
  }

  if (target.entity.type === 'collection_wall') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '鏀惰棌澧欏凡缁忕珛璧凤紝鍙湪閮ㄨ惤闈㈡澘鏁寸悊鏃х墿' : '杩欐槸鍏朵粬閮ㄨ惤鐨勬敹钘忓')
    return
  }

  if (target.entity.type === 'shared_puzzle' || target.entity.type === 'shared_puzzle_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? 'own shared puzzle' : 'other shared puzzle')
    return
  }

  if (target.entity.type === 'trail_marker') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '娲昏矾鏍囧彲鍦ㄩ儴钀介潰鏉挎敼鍐欍€佸姞鍥烘垨鎷嗛櫎' : '杩欐槸鍏朵粬閮ㄨ惤鐣欎笅鐨勬椿璺爣')
    return
  }

  if (target.entity.type === 'named_landmark') {
    showToast(target.entity.label || 'named landmark')
    return
  }

  if (target.entity.type === 'standing_ritual_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '绔欎綅浠紡鍦堝凡灞曞紑锛屽彲鍦ㄩ儴钀介潰鏉块€夋嫨绔欎綅' : '杩欐槸鍏朵粬閮ㄨ惤鐨勭珯浣嶄华寮?')
    return
  }

  const reward = resourceRewards[target.entity.type]
  if (!reward) return

  const collected = world.collectEntity(target.entity.id)
  if (!collected) return
  triggerPlayerActionAnimation('gather')

  const celebrationBonus = currentTribe.value ? celebrationGatherBonus.value : 0
  const bonusAmount = (currentTribe.value ? tribeGatherBonus.value : 0) + resourceTideGatherBonus.value
  const toolBonus = stoneTool.value.durability > 0 ? stoneTool.value.bonus : 0
  const totalAmount = reward.amount + bonusAmount + toolBonus
  if (stoneTool.value.durability > 0) {
    stoneTool.value.durability = Math.max(0, stoneTool.value.durability - 1)
  }
  inventory.value[reward.itemKey] += totalAmount
  addExperience(reward.experience)
  advanceQuest(1)
  const bonusNotes = [celebrationBonus ? '搴嗗吀浣欓煹' : '', oathGatherBonus.value ? '瀹堢伀瑾撶害' : '', toolBonus ? '鐭冲櫒鍔犳垚' : ''].filter(Boolean)
  showToast(`閲囬泦 ${reward.label}锛${totalAmount} ${reward.itemName}${bonusNotes.length ? `锛${bonusNotes.join('锛')}锛塦` : ''}`)
  updateInteractionTarget()
  loadedObjectsCount.value = world?.getLoadedCount() ?? 0
  totalObjectsCount.value = decorations.length
}

const {
  sendGameMessage, resolvePersonalConflict, choosePersonalIdentity, performPersonalIdentityAction, revisitMapMemory, revisitOldCampEcho, performBorderTheater, exploreFogTrail, exploreForbiddenEdge, markForbiddenEdgeRouteProof, claimCaveRace, advanceCaveRescue, organizeCaveReturnMark, createTrailMarker, updateTrailMarker, proposeNamedLandmark, supportNamedLandmark, visitNeutralSanctuary, curateCollectionWall, resolveLostItem, createEchoItem, addEchoItemMemory, transferEchoItem, supportMythClaim, supportHistoryFact, standingParticipantText, standingRitualRewardText, standingRitualLandmarkHint, standingRitualLandmarkBonusText, startSkirmish, joinSkirmish, resolveSkirmish, declareWar, joinWar, resolveWar, requestWarTruce, completeWarRepair, completeWarRevival, supportWar, mediateWar, resolveWarDiplomacy, resolveDiplomacyCouncil, resolveCaravanRoute, resolveNomadVisitor, resolveNomadVisitorAftereffect, startApprenticeExchange, startGuestStay, resolveCampDebt, resolveAshCount, escortCovenantMessenger, sendMutualAidAlert, answerMutualAidAlert, resolveDisasterCoop, respondFarReply, resolveTravelerSong, promoteTravelerSongTune, referenceTravelerTune, createPersonalToken, redeemPersonalToken, callPersonalDebt, settlePersonalDebt, startRenownPledge, fulfillRenownPledge, startPersonalDarkOath, revealPersonalDarkOath, completeDarkOathRemedy, completeWarAftermath, completeWarAllyTask, createTribe, joinTribe, reviewTribeApplication, contributeAllResources, advanceTribeTarget, setTribeAnnouncement, returnToTribeCamp, buildTribeStructure, unlockTribeRune, startTribeRitual, startTribeFeast, startCommunalCook, contributeCommunalCook, startDrumRhythm, joinDrumRhythm, completeDrumRhythm, performGroupEmote, recordLostTechFragment, restoreLostTech, establishCraftLegacy, startSacredFireRelay, carrySacredFire, completeSacredFireRelay, joinCelebrationEcho, startMentorship, joinMentorship, completeMentorship, startCampTrial, joinCampTrial, completeCampTrial, startNightOuting, startDreamOmen, resolveDreamOmen, startAncestorQuestion, answerAncestorQuestion, startCampShift, joinCampShift, advanceCampCouncil, contributeWonder, resolveConsensusFire, startTribeVote, castTribeVote, allocateResourcesToMember, createTribeTrade, startTribeScout, craftStoneTool, addOralChainLine, completeOralChain, composeOralEpic, assignBeastTask, chooseBeastSpecialty, chooseSeasonCelebration, chooseSeasonTaboo, observeSeasonTaboo, breakSeasonTaboo, completeSeasonTabooRemedy, startStandingRitual, joinStandingRitual, completeStandingRitual, startMigrationPlan, advanceMigrationPlan, chooseCelestialBranch, observeWeatherSign, enactTribeLaw, upholdTribeLaw, breakTribeLaw, completeLawRemedy, commitTribeCustomPractice, recordSharedPuzzleFragment, completeSharedPuzzle, completeReverseVictory, resolveRumorTruth, solveWorldRiddle, composeOralMap, completeTrialGround, chooseTribeOath, completeOathTask, resolveBoundaryOutcome, completeBoundaryFollowup, resolveEmergencyChoice, completeEmergencyFollowup, patrolControlledSite, relayControlledSite, claimTribeFlag, patrolTribeFlag, resolveBoundaryAction, tuneBoundaryTemperature, sendAllianceSignal, submitCommonJudge, tendDisputeWitness, sealOldGrudge, tendOldGrudge, settleOldGrudgeWake, advanceShadowTask, resolveTribeTrade, completeTradeCreditRepair, supportLivingLegend, respondLivingLegend, punishMember
} = createGameViewActions({ activeBoundaryFlag, activeMigrationPlan, activeTribeCelestialWindow, addSystemMessage, allianceSignalActions, allocationDraft, ancestorQuestionAnswers, ancestorQuestionOptions, apprenticeDraft, apprenticeExchangeActionOptions, ashCountActionOptions, beastSpecialtyLabel, beastTaskOptions, borderTheaterActionOptions, boundaryActionOptions, boundaryTemperatureActionOptions, campCouncilActionOptions, campDebtActionOptions, campShiftDraft, campShiftOptions, campTrialOptions, canGovernMember, canManageTribeTargets, canReviewApplications, caravanActionOptions, caveReturnActionOptions, celebrationChoiceOptions, celestialBranchOptions, collectionActionOptions, commonJudgeActions, communalCookIngredients, communalCookOptions, consensusFireActionOptions, craftLegacyStyleOptions, currentTribe, diplomacyCouncilActionOptions, disasterCoopActionOptions, disputeWitnessActionOptions, dreamOmenActions, dreamOmenSources, drumRhythmBeats, drumRhythmOptions, echoItemExperienceOptions, echoItemTypeOptions, emergencyChoiceActionOptions, farReplyActionOptions, fogTrailActionOptions, forbiddenEdgeActionOptions, forbiddenEdgeRouteProofActionOptions, groupEmoteOptions, guestStayActionOptions, guestStayDraft, hasTribeRoad, hasTribeWorkbench, inventory, isCurrentTribeEntity, lostItemActions, lostTechOptions, lostTechSourceOptions, mentorshipFocusOptions, migrationPlanOptions, mutualAidActionOptions, namedLandmarkDraft, namedLandmarkOptions, neutralSanctuaryActions, newTribeName, nightOutingOptions, nomadVisitorActionOptions, nomadVisitorAftereffectActionOptions, oathOptions, oldCampEchoActionOptions, oldGrudgeAnchorOptions, oldGrudgeSealActionOptions, oralChainDraft, oralChainReady, oralMapActionOptions, pendingTribeJoinRequests, personalDarkOathDraft, personalDarkOathOptions, personalIdentity, personalIdentityCooldownText, personalIdentityOptions, personalTokenDraft, personalTokenOptions, playerName, renownPledgeDraft, renownPledgeOptions, rumorTruthActions, sacredFireDestinationOptions, sacredFireStepOptions, seasonTabooOptions, shadowTaskActionOptions, sharedPuzzleOptions, showToast, sortedTribeMembers, stanceAnimationForKey, standingRitualLandmarkBonuses, standingRitualOptions, standingRitualStances, stoneTool, tradeDraft, trailMarkerActions, trailMarkerTypes, travelerSongActionOptions, travelerTuneLineageActionOptions, trialGroundActions, tribeAnnouncementDraft, tribeCustomOptions, tribeLawOptions, triggerPlayerActionAnimation, weatherForecastSignOptions, wonderActionOptions, worldRiddlePredictionOptions, getWebSocket: () => ws, getLocalPlayer: () => localPlayer })

const createCaveRoute = (cave) => {
  const plan = selectedCavePlan.value
  const baseDepth = caveExpeditionReady.value ? 6 + plan.depthBonus : 4
  const caveKey = cave?.id || cave?.label || 'cave'
  const offset = caveKey.length % caveNodeLibrary.length

  return Array.from({ length: baseDepth }, (_, index) => {
    const template = index === 0
      ? caveNodeLibrary[0]
      : caveNodeLibrary[(index + offset) % (caveNodeLibrary.length - 1) + 1]

    return {
      id: `${caveKey}_node_${index}`,
      depth: index + 1,
      type: template.type,
      title: template.title,
      description: template.description,
      status: index === 0 ? 'current' : 'pending'
    }
  })
}

const setCaveNodeStatus = (index, status) => {
  caveRoute.value = caveRoute.value.map((node, nodeIndex) => (
    nodeIndex === index ? { ...node, status } : node
  ))
}

const selectCaveExpeditionPlan = (planKey) => {
  if (caveDepth.value > 0) return
  if (!caveExpeditionPlans.some((plan) => plan.key === planKey)) return
  caveExpeditionPlanKey.value = planKey
  if (activeCave.value) {
    caveRoute.value = createCaveRoute(activeCave.value)
    activeCaveNodeIndex.value = 0
    const plan = selectedCavePlan.value
    caveFoodSupported.value = caveExpeditionReady.value && (currentTribe.value?.food || 0) >= plan.foodCost
    const tribeSupplyBonus = caveExpeditionReady.value ? (caveFoodSupported.value ? 6 : 2) + plan.supplyBonus : 0
    caveSupplies.value = Math.max(3, inventory.value.wood + inventory.value.stone + 2 + tribeSupplyBonus)
    caveExplorationLog.value = `${plan.label}璺嚎宸叉爣璁帮細${plan.summary}銆俙`
  }
}

const enterCave = (cave) => {
  activeCave.value = cave
  showCaveOverlay.value = true
  caveDepth.value = 0
  caveFinds.value = 0
  caveRoute.value = createCaveRoute(cave)
  caveExpeditionSynced.value = false
  activeCaveNodeIndex.value = 0
  const plan = selectedCavePlan.value
  caveFoodSupported.value = caveExpeditionReady.value && (currentTribe.value?.food || 0) >= plan.foodCost
  const tribeSupplyBonus = caveExpeditionReady.value ? (caveFoodSupported.value ? 6 : 2) + plan.supplyBonus : 0
  caveSupplies.value = Math.max(3, inventory.value.wood + inventory.value.stone + 2 + tribeSupplyBonus)
  caveExplorationLog.value = caveExpeditionReady.value
    ? `${currentTribe.value.name} expedition to ${cave.label || 'cave'} with ${plan.label}`
    : `Entering ${cave.label || 'cave'}`
  showToast(caveExpeditionReady.value ? 'expedition started' : 'entering cave')
}

const exploreCaveStep = () => {
  if (caveSupplies.value <= 0) {
    caveExplorationLog.value = '琛ョ粰鑰楀敖锛屼綘闇€瑕佽繑鍥炲湴琛ㄣ€?'
    return
  }
  if (caveRouteComplete.value) {
    caveExplorationLog.value = '杩欐潯娲炵┐璺嚎宸茬粡鎺㈠埌灏藉ご锛屾渶濂藉厛鎶婃敹鑾峰甫鍥炲湴琛ㄣ€?'
    return
  }

  const node = activeCaveNode.value
  if (!node) return

  caveDepth.value = Math.max(caveDepth.value, node.depth)
  const plan = selectedCavePlan.value
  caveSupplies.value -= node.type === 'hazard' ? 2 : 1

  const roll = Math.random()
  const expeditionBonus = caveExpeditionReady.value ? (caveFoodSupported.value ? 1 : 0) : 0
  if (node.type === 'ore' || node.type === 'deep' || roll > plan.oreRoll) {
    const stoneGain = 1 + Math.floor(Math.random() * 2) + expeditionBonus
    const plannedGain = caveExpeditionReady.value ? Math.floor(stoneGain * plan.findMultiplier) + plan.findBonus : stoneGain
    const finalGain = node.type === 'deep' ? plannedGain + 1 : plannedGain
    inventory.value.stone += finalGain
    caveFinds.value += finalGain
    addExperience(18 * finalGain)
    caveExplorationLog.value = caveExpeditionReady.value
      ? `杩滃緛闃熷湪${node.title}鎵惧埌 ${finalGain} 鍧楃熆鐭筹紝閮ㄨ惤鐨勬礊绌磋矾绾挎鍦ㄦ垚褰€俙`
      : `浣犲湪${node.title}鎵惧埌 ${finalGain} 鍧楃熆鐭筹紝娲炵┐杩樺湪鍚戞繁澶勫欢浼搞€俙`
  } else if (node.type === 'lore' || roll > plan.loreRoll) {
    addExperience(caveExpeditionReady.value ? 18 : 12)
    caveExplorationLog.value = caveExpeditionReady.value
      ? `杩滃緛闃熻褰曚簡${node.title}閲岀殑鍙よ€佸埉鐥曪紝闀胯€佹妸瀹冨啓鍏ラ儴钀界嚎绱€俙`
      : `${node.title}閲屾湁鍙よ€佸埉鐥曪紝鍍忔槸鏌愪釜閮ㄨ惤鏇惧湪杩欓噷韬查伩椋庢毚銆俙`
  } else {
    caveExplorationLog.value = node.type === 'hazard'
      ? `${node.title}钀戒笅纰庣煶锛屼綘浠澶栨秷鑰椾簡涓€浠借ˉ缁欐墠绌胯繃鍘汇€俙`
      : `${node.title}閲屾病鏈夋槑鏄炬敹鑾凤紝浣嗚矾绾胯鏍囪涓嬫潵浜嗐€俙`
  }

  setCaveNodeStatus(activeCaveNodeIndex.value, 'completed')
  const nextIndex = activeCaveNodeIndex.value + 1
  if (nextIndex < caveRoute.value.length) {
    activeCaveNodeIndex.value = nextIndex
    setCaveNodeStatus(nextIndex, 'current')
  } else {
    caveExplorationLog.value += ' 杩欐潯娲炵┐璺嚎宸茬粡鍒拌揪灏藉ご銆?'
    if (caveExpeditionReady.value && !caveExpeditionSynced.value) {
      caveExpeditionSynced.value = true
      sendGameMessage({
        type: 'tribe_complete_cave_expedition',
        caveLabel: activeCave.value?.label || '鏈煡娲炵┐',
        depth: caveDepth.value,
        finds: caveFinds.value,
        foodSupported: caveFoodSupported.value,
        routeKey: selectedCavePlan.value.key
      })
    }
  }

  if (caveSupplies.value <= 0) {
    caveExplorationLog.value += ' 琛ョ粰宸茬粡鑰楀敖锛屾渶濂介┈涓婂洖鍒板湴琛ㄣ€?'
  }
}

const leaveCave = () => {
  showCaveOverlay.value = false
  activeCave.value = null
  caveExplorationLog.value = ''
  caveRoute.value = []
  activeCaveNodeIndex.value = 0
  showToast('鍥炲埌鍦拌〃')
}

// 鍒涘缓鏈湴鐜╁
const createLocalPlayer = () => {
  localPlayer = createPlayer(0x3498db, '浣?')

  scene.add(localPlayer)
}

const playerAnimationChoices = {
  idle: ['Unarmed_Idle', 'Idle', '2H_Melee_Idle'],
  walk: ['Walking_A', 'Walking_B', 'Walking_C', 'Running_A'],
  gather: ['PickUp', 'Interact', 'Use_Item'],
  ritual: ['Spellcast_Raise', 'Spellcast_Long', 'Spellcasting'],
  guard: ['Blocking', 'Block'],
  sit: ['Sit_Floor_Idle', 'Sit_Floor_Down'],
  cheer: ['Cheer'],
  conflict: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Kick', '1H_Melee_Attack_Chop']
}

const playerActionDurations = {
  gather: 900,
  ritual: 1600,
  guard: 1400,
  sit: 1700,
  cheer: 1500,
  conflict: 1100
}

const findPlayerAnimationClip = (clips, names) => {
  if (!Array.isArray(clips) || !clips.length) return null
  const wanted = names.map((name) => name.toLowerCase())
  return clips.find((clip) => wanted.includes((clip.name || '').toLowerCase()))
    || clips.find((clip) => wanted.some((name) => (clip.name || '').toLowerCase().includes(name)))
    || null
}

const playPlayerAnimation = (player, state, { reset = false, oneShot = false } = {}) => {
  const animation = player?.userData?.playerAnimation
  const next = animation?.actions?.[state] || animation?.actions?.idle
  if (!animation || !next) return
  if (animation.active === state && !reset) return

  const previous = animation.actions?.[animation.active]
  if (previous && previous !== next) previous.fadeOut(0.16)
  next.enabled = true
  next.setEffectiveWeight(1)
  next.setEffectiveTimeScale(state === 'walk' ? 1.15 : 1)
  if (oneShot) {
    next.setLoop(THREE.LoopOnce, 1)
    next.clampWhenFinished = true
    animation.actionState = state
    animation.actionUntil = performance.now() + Math.max(playerActionDurations[state] || 600, next.getClip().duration * 1000 - 120)
  } else {
    next.setLoop(THREE.LoopRepeat, Infinity)
    next.clampWhenFinished = false
  }
  next.reset().fadeIn(0.16).play()
  animation.active = state
}

const setupPlayerModelAnimation = (player, model, clips) => {
  const mixer = new THREE.AnimationMixer(model)
  const actions = {}
  Object.entries(playerAnimationChoices).forEach(([state, names]) => {
    const clip = findPlayerAnimationClip(clips, names)
    if (clip) actions[state] = mixer.clipAction(clip)
  })
  if (!actions.idle && clips?.[0]) actions.idle = mixer.clipAction(clips[0])
  player.userData.playerAnimation = {
    mixer,
    actions,
    active: '',
    actionState: '',
    actionUntil: 0
  }
  playPlayerAnimation(player, 'idle')
}

const updatePlayerAnimation = (player, delta, moving = false) => {
  const animation = player?.userData?.playerAnimation
  const now = performance.now()
  const heldPose = player?.userData?.heldPoseUntil > now ? player.userData.heldPoseState : ''
  const timedProp = player?.userData?.heldPropUntil > now ? player.userData.heldPropState : ''
  if (!animation?.mixer) {
    updatePlayerHeldProp(player, timedProp || heldPose)
    return
  }
  const activeAction = animation.actionUntil > now ? animation.actionState : timedProp
  const state = activeAction || (!moving && heldPose ? heldPose : (moving ? 'walk' : 'idle'))
  playPlayerAnimation(player, state)
  updatePlayerHeldProp(player, activeAction || heldPose)
  animation.mixer.update(delta)
}

const playerMeshForId = (id) => {
  if (!id) return localPlayer
  if (id === playerId.value) return localPlayer
  return remotePlayers.get(id)?.mesh || null
}

const triggerPlayerActionAnimation = (state = 'gather', player = localPlayer) => {
  if (player) {
    player.userData.heldPropState = state
    player.userData.heldPropUntil = performance.now() + (playerActionDurations[state] || 900)
  }
  playPlayerAnimation(player, state, { reset: true, oneShot: true })
  updatePlayerHeldProp(player, state)
}

const triggerPlayerActionById = (id, state = 'gather') => {
  triggerPlayerActionAnimation(state, playerMeshForId(id))
}

const stanceAnimationForKey = (stanceKey = '') => ({
  fire: 'cheer',
  grain: 'sit',
  stone: 'gather',
  witness: 'ritual'
}[stanceKey] || 'ritual')

const updateStandingRitualHeldPoses = () => {
  const active = currentTribe.value?.standingRitual
  const activeUntil = active?.activeUntil ? new Date(active.activeUntil).getTime() : 0
  const participants = Array.isArray(active?.participants) && activeUntil > Date.now()
    ? active.participants
    : []
  const seen = new Set()
  participants.forEach((participant) => {
    const mesh = playerMeshForId(participant.playerId)
    if (!mesh) return
    seen.add(participant.playerId)
    mesh.userData.heldPoseState = stanceAnimationForKey(participant.stanceKey)
    mesh.userData.heldPoseUntil = activeUntil
  })
  if (localPlayer && !seen.has(playerId.value)) {
    localPlayer.userData.heldPoseUntil = 0
    localPlayer.userData.heldPoseState = ''
  }
  remotePlayers.forEach((remote, id) => {
    if (seen.has(id)) return
    remote.mesh.userData.heldPoseUntil = 0
    remote.mesh.userData.heldPoseState = ''
  })
}

const disposePlayerPart = (object3D) => {
  if (!object3D) return
  object3D.traverse((object) => {
    if (object.geometry) object.geometry.dispose()
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((material) => material.dispose())
      } else {
        object.material.dispose()
      }
    }
  })
}

// 鍒涘缓鐜╁妯″瀷锛?D 瑙掕壊锛?
const createPlayer = (color, name) => {
  const player = new THREE.Group()

  // 韬綋
  const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8)
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0.02 })
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial)
  body.position.y = -0.62
  body.castShadow = true
  body.receiveShadow = true
  player.add(body)

  const cloakMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).offsetHSL(0, -0.08, -0.16),
    roughness: 0.88,
    metalness: 0
  })
  const cloak = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.05, 0.16), cloakMaterial)
  cloak.position.set(0, -0.38, -0.44)
  cloak.rotation.x = -0.12
  cloak.castShadow = true
  cloak.receiveShadow = true
  player.add(cloak)

  // 澶撮儴
  const headGeometry = new THREE.SphereGeometry(0.4, 16, 16)
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBAC, roughness: 0.6 })
  const head = new THREE.Mesh(headGeometry, headMaterial)
  head.position.y = 0.92
  head.castShadow = true
  head.receiveShadow = true
  player.add(head)

  const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2017, roughness: 0.82 })
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMaterial)
  hair.position.y = 1.05
  hair.scale.set(1.02, 0.75, 1.02)
  hair.castShadow = true
  player.add(hair)

  const armMaterial = new THREE.MeshStandardMaterial({ color: 0xffc993, roughness: 0.68 })
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.88, 8), armMaterial)
    arm.position.set(side * 0.56, -0.42, 0.03)
    arm.rotation.z = side * 0.24
    arm.castShadow = true
    player.add(arm)

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.72, 8), cloakMaterial)
    leg.position.set(side * 0.2, -1.48, 0)
    leg.castShadow = true
    player.add(leg)
  }

  const pendantMaterial = new THREE.MeshStandardMaterial({
    color: 0xf8df7b,
    emissive: new THREE.Color(0xf8df7b).multiplyScalar(0.18),
    roughness: 0.4
  })
  const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), pendantMaterial)
  pendant.position.set(0, 0.08, 0.5)
  player.add(pendant)

  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x102018,
    transparent: true,
    opacity: 0.2,
    depthWrite: false
  })
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.68, 24), shadowMaterial)
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -1.92
  shadow.scale.set(1.25, 0.78, 1)
  player.add(shadow)

  // 鐜╁鍚嶇О鏍囩
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  canvas.width = 256
  canvas.height = 64
  context.fillStyle = 'rgba(13, 24, 28, 0.55)'
  context.fillRect(20, 8, 216, 48)
  context.strokeStyle = 'rgba(255, 255, 255, 0.35)'
  context.strokeRect(20.5, 8.5, 215, 47)
  context.font = 'Bold 40px Arial'
  context.fillStyle = 'white'
  context.textAlign = 'center'
  context.fillText(name, 128, 45)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(spriteMaterial)
  sprite.scale.set(2, 0.5, 1)
  sprite.position.y = 1.9
  player.add(sprite)
  attachPlayerHeldProps(player)

  const fallbackChildren = player.children.filter((child) => child !== sprite && child.name !== 'player_held_props')
  createAnimatedModelAssetInstance('player', {
    materialVariant: {
      role: 'player',
      primaryColor: color,
      accentColor: 0xffe0b8
    }
  })
    .then(({ model, animations }) => {
      if (player.userData.disposed) {
        disposePlayerPart(model)
        return
      }
      fallbackChildren.forEach((child) => {
        player.remove(child)
        disposePlayerPart(child)
      })
      model.name = 'player_glb'
      model.scale.setScalar(1)
      player.add(model)
      setupPlayerModelAnimation(player, model, animations)
      player.add(sprite)
    })
    .catch((error) => {
      console.warn('Failed to load player model asset', error)
    })

  return player
}

// 鍒涘缓杩滅▼鐜╁
const createRemotePlayer = (id, data) => {
  const existing = remotePlayers.get(id)
  if (existing) {
    existing.targetPosition.set(data.x || 0, data.y || 2, data.z || 0)
    existing.currentPosition.set(data.x || 0, data.y || 2, data.z || 0)
    existing.mesh.position.set(data.x || 0, data.y || 2, data.z || 0)
    return existing.mesh
  }

  const colors = [0xe74c3c, 0xf39c12, 0x9b59b6, 0x1abc9c, 0x34495e]
  const color = colors[Math.floor(Math.random() * colors.length)]

  const player = createPlayer(color, data.name || `鐜╁${id.substring(0, 6)}`)
  player.position.set(data.x || 0, data.y || 2, data.z || 0)

  scene.add(player)
  remotePlayers.set(id, {
    id,
    data: { ...data, id },
    mesh: player,
    targetPosition: new THREE.Vector3(data.x || 0, data.y || 2, data.z || 0),
    currentPosition: new THREE.Vector3(data.x || 0, data.y || 2, data.z || 0)
  })

  return player
}

// 绉婚櫎杩滅▼鐜╁
const removeRemotePlayer = (id) => {
  const player = remotePlayers.get(id)
  if (player) {
    player.mesh.userData.disposed = true
    scene.remove(player.mesh)
    remotePlayers.delete(id)
  }
}

// 鏇存柊杩滅▼鐜╁浣嶇疆锛堟彃鍊硷級
const updateRemotePlayer = (id, data) => {
  const player = remotePlayers.get(id)
  if (!player) {
    createRemotePlayer(id, data)
    return
  }
  player.data = { ...(player.data || {}), ...data, id }
  player.targetPosition.set(data.x, data.y, data.z)
}

// 娓叉煋寰幆
let lastDecorationUpdate = 0
const decorationUpdateInterval = 500 // 姣?500ms 鏇存柊涓€娆¤楗扮墿

const animate = () => {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  // 鏇存柊 FPS
  frameCount++
  const currentTime = Date.now()
  if (currentTime - lastFrameTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastFrameTime = currentTime
  }

  // 鏇存柊鏈湴鐜╁绉诲姩
  updateLocalPlayer(delta)
  updateStandingRitualHeldPoses()
  updatePlayerAnimation(localPlayer, delta, Boolean(localPlayer?.userData?.isMoving))
  updateInteractionTarget()

  // 瀹氭湡鏇存柊瑁呴グ鐗╋紙鎳掑姞杞?鍗歌浇锛?
  if (currentTime - lastDecorationUpdate > decorationUpdateInterval) {
    updateDecorations()
    lastDecorationUpdate = currentTime
  }

  // 鏇存柊杩滅▼鐜╁锛堟彃鍊硷級
  remotePlayers.forEach((player) => {
    const before = player.currentPosition.clone()
    player.currentPosition.lerp(player.targetPosition, 0.2)
    player.mesh.position.copy(player.currentPosition)
    const dx = player.currentPosition.x - before.x
    const dz = player.currentPosition.z - before.z
    const moving = Math.abs(dx) + Math.abs(dz) > 0.002
    if (moving) {
      player.mesh.rotation.y = Math.atan2(dx, dz)
    }
    updatePlayerAnimation(player.mesh, delta, moving)
  })

  weatherSystem?.update(delta, camera?.position)

  // 鏇存柊鎺у埗鍣?
  if (localPlayer && controls) {
    tempDesiredTarget.copy(localPlayer.position).add(cameraTargetOffset)
    if (!hasCameraFollowTarget) {
      cameraFollowTarget.copy(tempDesiredTarget)
      controls.target.copy(tempDesiredTarget)
      hasCameraFollowTarget = true
    } else {
      tempDeltaTarget.copy(tempDesiredTarget).sub(cameraFollowTarget)
      camera.position.add(tempDeltaTarget)
      cameraFollowTarget.copy(tempDesiredTarget)
      controls.target.copy(tempDesiredTarget)
    }
  }
  if (controls) controls.update()

  // 娓叉煋鍦烘櫙
  renderer.render(scene, camera)
}

// 鏇存柊鏈湴鐜╁
const updateLocalPlayer = (delta) => {
  if (!localPlayer) return

  // 浣跨敤鐩稿浜庣浉鏈虹殑鏂瑰悜锛岃繖鏍锋棆杞瑙掑悗绉诲姩鏂瑰悜涔熶細璺熺潃鍙?
  // 鑾峰彇鐩告満鏂瑰悜鍚戦噺锛堟按骞虫柟鍚戯級
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  forward.y = 0  // 鍙繚鐣欐按骞冲垎閲?
  forward.normalize()

  // 鍙虫柟鍚戝悜閲忥紙閫氳繃forward鍜屼笂鏂瑰悜鍙変箻寰楀埌锛?
  const right = new THREE.Vector3()
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
  right.normalize()

  // 鏍规嵁鎸夐敭璁＄畻绉诲姩鏂瑰悜
  const moveDirection = new THREE.Vector3()

  // 绉诲姩璺熼殢鐩告満鏈濆悜锛歐 姘歌繙鏈濆睆骞曞墠鏂硅蛋锛孲 姘歌繙鍚庨€€銆?
  if (keys.w) moveDirection.add(forward)       // 鍓嶈繘
  if (keys.s) moveDirection.sub(forward)       // 鍚庨€€
  if (keys.a) moveDirection.sub(right)         // 宸︾Щ - 鐩稿浜庣浉鏈虹殑宸︿晶
  if (keys.d) moveDirection.add(right)         // 鍙崇Щ - 鐩稿浜庣浉鏈虹殑鍙充晶

  // 褰掍竴鍖栫Щ鍔ㄦ柟鍚?
  if (moveDirection.length() > 0) {
    moveDirection.normalize()
    velocity.x = moveDirection.x * moveSpeed
    velocity.z = moveDirection.z * moveSpeed
    localPlayer.rotation.y = Math.atan2(moveDirection.x, moveDirection.z)
  } else {
    velocity.x *= 0.9
    velocity.z *= 0.9
  }

  // 璺宠穬锛堜粎鍦ㄥ綋鍓嶅湴闈㈤檮杩戝厑璁革級
  const groundY = getGroundHeightAt(localPlayer.position.x, localPlayer.position.z)
  if (keys.space && localPlayer.position.y <= groundY + 0.1) {
    velocity.y = jumpPower
  }

  // 搴旂敤閲嶅姏
  velocity.y += gravity * delta

  // 鏇存柊浣嶇疆
  const currentPosition = localPlayer.position.clone()
  const desiredPosition = currentPosition.clone()
  desiredPosition.x += velocity.x * delta
  desiredPosition.y += velocity.y * delta
  desiredPosition.z += velocity.z * delta

  if (world) {
    const { position, collided } = world.resolvePlayerXZ(currentPosition, desiredPosition, playerRadius)
    localPlayer.position.x = position.x
    localPlayer.position.z = position.z
    if (collided) {
      velocity.x = 0
      velocity.z = 0
    }
  } else {
    localPlayer.position.x = desiredPosition.x
    localPlayer.position.z = desiredPosition.z
  }
  localPlayer.position.y = desiredPosition.y

  // 鍦伴潰纰版挒妫€娴?
  const nextGroundY = getGroundHeightAt(localPlayer.position.x, localPlayer.position.z)
  if (localPlayer.position.y < nextGroundY) {
    localPlayer.position.y = nextGroundY
    velocity.y = 0
  }

  // 鏇存柊鏄剧ず鍧愭爣
  playerX.value = localPlayer.position.x
  playerZ.value = localPlayer.position.z
  localPlayer.userData.isMoving = Math.hypot(velocity.x, velocity.z) > 0.2

  // 鍙戦€佷綅缃埌鏈嶅姟鍣紙鑺傛祦澶勭悊锛?
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendPositionUpdate()
  }
}

// 鍙戦€佷綅缃洿鏂帮紙甯﹁妭娴侊級
let lastSendTime = 0
const sendInterval = 50 // 姣?50ms 鍙戦€佷竴娆?
let lastSentPosition = null

const sendPositionUpdate = () => {
  const now = Date.now()
  if (now - lastSendTime < sendInterval) return

  if (!lastSentPosition) {
    lastSentPosition = new THREE.Vector3().copy(localPlayer.position)
  } else {
    const dx = localPlayer.position.x - lastSentPosition.x
    const dy = localPlayer.position.y - lastSentPosition.y
    const dz = localPlayer.position.z - lastSentPosition.z
    if ((dx * dx + dy * dy + dz * dz) < 0.0004) {
      return
    }
  }

  lastSendTime = now
  lastSentPosition.copy(localPlayer.position)

  ws.send(JSON.stringify({
    type: 'move',
    data: {
      x: localPlayer.position.x,
      y: localPlayer.position.y,
      z: localPlayer.position.z
    }
  }))
}

const clearReconnectTimer = () => {
  if (reconnectTimerId) {
    clearTimeout(reconnectTimerId)
    reconnectTimerId = null
  }
}

const clearKeepAliveTimer = () => {
  if (keepAliveTimerId) {
    clearInterval(keepAliveTimerId)
    keepAliveTimerId = null
  }
}

const getGameWsUrl = (token) => {
  const safeToken = encodeURIComponent(token)
  return `${API_CONFIG.WS_BASE_URL}/ws/game?token=${safeToken}`
}

const ensureFreshToken = async () => {
  const currentToken = localStorage.getItem('token')
  if (!currentToken) {
    throw new Error('NO_TOKEN')
  }

  if (!authRefreshInFlight) {
    authRefreshInFlight = request.get('/auth/me')
      .then(() => localStorage.getItem('token'))
      .finally(() => {
        authRefreshInFlight = null
      })
  }

  const refreshedToken = await authRefreshInFlight
  if (!refreshedToken) {
    throw new Error('NO_TOKEN')
  }
  return refreshedToken
}

const startTokenKeepAlive = () => {
  clearKeepAliveTimer()
  keepAliveTimerId = setInterval(async () => {
    if (manualClose) return
    try {
      await ensureFreshToken()
    } catch (error) {
      console.error('Token 淇濇椿澶辫触:', error)
    }
  }, 4 * 60 * 1000)
}

const scheduleReconnect = () => {
  if (manualClose || reconnectTimerId) return

  reconnectAttempt += 1
  const delay = Math.min(10000, 3000 + (reconnectAttempt - 1) * 2000)
  connectionStatus.value = 'reconnecting'
  addSystemMessage(`杩炴帴宸叉柇寮€锛${Math.round(delay / 1000)} 绉掑悗灏濊瘯鎭㈠...`)

  reconnectTimerId = setTimeout(async () => {
    reconnectTimerId = null
    if (manualClose) return
    await initWebSocket({ silent: true, isReconnect: true })
  }, delay)
}

// 閿洏浜嬩欢澶勭悊
const handleKeyDown = (e) => {
  const key = e.key.toLowerCase()

  // 濡傛灉鑱婂ぉ妗嗘墦寮€锛屽彧澶勭悊ESC閿紝鍏朵粬閿氦缁欒緭鍏ユ澶勭悊
  if (showChat.value) {
    if (key === 'escape') {
      showChat.value = false
      e.preventDefault()
    }
    return
  }

  // 鐗规畩澶勭悊绌烘牸閿?
  if (key === 'e') {
    collectInteractionTarget()
    e.preventDefault()
    return
  }

  if (key === ' ') {
    keys.space = true
    e.preventDefault()
  } else if (key in keys) {
    keys[key] = true
    e.preventDefault()
  }

  if (key === 'escape') {
    showInstructions.value = !showInstructions.value
  }

  if (key === 't' && !showChat.value) {
    openChat()
    e.preventDefault()
  }
}

const handleKeyUp = (e) => {
  const key = e.key.toLowerCase()

  // 濡傛灉鑱婂ぉ妗嗘墦寮€锛屼笉澶勭悊娓告垙鎺у埗閿?
  if (showChat.value) {
    return
  }

  // 鐗规畩澶勭悊绌烘牸閿?
  if (key === ' ') {
    keys.space = false
    e.preventDefault()
  } else if (key in keys) {
    keys[key] = false
    e.preventDefault()
  }
}

// 绐楀彛澶у皬鍙樺寲澶勭悊
const handleResize = () => {
  if (camera && renderer && canvasWrapper.value) {
    camera.aspect = canvasWrapper.value.clientWidth / canvasWrapper.value.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvasWrapper.value.clientWidth, canvasWrapper.value.clientHeight)
  }
}

// 鍒濆鍖?WebSocket
const initWebSocket = async ({ silent = false, isReconnect = false } = {}) => {
  try {
    clearReconnectTimer()

    const token = await ensureFreshToken()
    const wsUrl = getGameWsUrl(token)

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    if (!silent) {
      connectionStatus.value = isReconnect ? 'reconnecting' : 'connecting'
    }

    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      reconnectAttempt = 0
      connectionStatus.value = 'connected'
      console.log('WebSocket 杩炴帴鎴愬姛')
      startTokenKeepAlive()

      addSystemMessage(isReconnect ? 'reconnected to game server' : 'connected to game server')
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleServerMessage(message)
    }

    ws.onerror = (error) => {
      console.error('WebSocket 閿欒:', error)
      connectionStatus.value = 'disconnected'
    }

    ws.onclose = async (event) => {
      ws = null
      clearKeepAliveTimer()
      connectionStatus.value = 'disconnected'
      console.log('WebSocket 杩炴帴鍏抽棴')

      if (manualClose) {
        return
      }

      const closeReason = event?.reason || ''
      const isAuthClose = event?.code === 4001 || /token|璁よ瘉/i.test(closeReason)

      addSystemMessage(isAuthClose ? '鐧诲綍鐘舵€佸凡鍒锋柊锛屾鍦ㄦ仮澶嶆父鎴忚繛鎺?..' : '涓庢湇鍔″櫒鏂紑杩炴帴')

      if (isAuthClose) {
        try {
          await ensureFreshToken()
          await initWebSocket({ silent: true, isReconnect: true })
          return
        } catch (error) {
          console.error('璁よ瘉鏂繛鍚庣殑闈欓粯鎭㈠澶辫触:', error)
        }
      }

      clearRemotePlayers()
      scheduleReconnect()
    }
  } catch (error) {
    console.error('WebSocket 鍒濆鍖栧け璐?', error)
    connectionStatus.value = 'disconnected'
    if (!manualClose) {
      addSystemMessage('娓告垙杩炴帴鍒濆鍖栧け璐ワ紝姝ｅ湪閲嶈瘯...')
      scheduleReconnect()
    }
  }
}

// 澶勭悊鏈嶅姟鍣ㄦ秷鎭?
const handleServerMessage = (message) => {
  switch (message.type) {
    case 'welcome':
      playerId.value = message.playerId
      playerCount.value = message.playerCount
      // 淇濆瓨鐜╁鍚嶇О
      playerName.value = message.data?.name || '鎴?'
      personalConflictStatus.value = {
        ...personalConflictStatus.value,
        fatigue: message.data?.conflict_fatigue || 0,
        fatigueUntil: message.data?.conflict_fatigue_until || '',
        personalRenown: message.data?.personal_renown || 0
      }
      addSystemMessage(`娆㈣繋锛佸綋鍓嶅湪绾?${message.playerCount} 浜篳`)

      // 鏈嶅姟绔潈濞佸嚭鐢熺偣锛氫互 welcome 涓嬪彂鐨勫潗鏍囦负鍑?
      if (localPlayer && message.data) {
        const x = message.data.x ?? 0
        const y = message.data.y ?? 2
        const z = message.data.z ?? 0
        localPlayer.position.set(x, y, z)
        playerX.value = x
        playerZ.value = z
        lastSentPosition = new THREE.Vector3(x, y, z)
      }
      break

    case 'player_joined':
      if (message.playerId !== playerId.value) {
        createRemotePlayer(message.playerId, message.data)
      }
      playerCount.value = message.playerCount
      addSystemMessage(`${message.data.name || '鐜╁'} 鍔犲叆浜嗘父鎴廯`)
      break

    case 'player_left':
      removeRemotePlayer(message.playerId)
      playerCount.value = message.playerCount
      addSystemMessage(`鐜╁绂诲紑浜嗘父鎴廯`)
      break

    case 'personal_conflict_status':
      personalConflictStatus.value = {
        ...personalConflictStatus.value,
        ...(message.status || {})
      }
      break

    case 'personal_identity_result':
      if (message.status) {
        personalConflictStatus.value = {
          ...personalConflictStatus.value,
          ...message.status
        }
      }
      showToast(message.message || '韬唤宸叉洿鏂?')
      addSystemMessage(message.message || '韬唤宸叉洿鏂?')
      break

    case 'personal_identity_error':
      showToast(message.message || '韬唤鍔ㄤ綔澶辫触')
      break

    case 'player_move':
      updateRemotePlayer(message.playerId, message.data)
      break

    case 'personal_conflict_result': {
      const isActor = message.actorId === playerId.value
      const isTarget = message.targetId === playerId.value
      if (message.actionKey === 'guard') {
        triggerPlayerActionById(message.actorId, 'guard')
        const radiusText = message.guardRadius ? `锛屾姢鍗寖鍥?${message.guardRadius}姝` : ''
        const text = `${message.actorName || '鐜╁'} 瀵?${message.targetName || '鐜╁'} 鎽嗗嚭瀹堝娍${radiusText}`
        if (message.status && isActor) personalConflictStatus.value = { ...personalConflictStatus.value, ...message.status }
        if (isActor || isTarget) showToast(text)
        addSystemMessage(text)
        break
      }
      if (message.actionKey === 'inspire') {
        triggerPlayerActionById(message.actorId, 'cheer')
        const title = message.renownTitle?.title ? `銆${message.renownTitle.title}銆峘` : ''
        const relationText = message.relationship?.label ? `锛屽叧绯昏浆涓${message.relationship.label}` : ''
        const text = `${title}${message.actorName || '鐜╁'} 榧撹垶浜?${message.targetName || '鐜╁'}锛屼笅娆￠泦缁撹础鐚?+${message.inspirationContribution || 1}${relationText}`
        if (message.status && isActor) personalConflictStatus.value = { ...personalConflictStatus.value, ...message.status }
        if (message.targetStatus && isTarget) personalConflictStatus.value = { ...personalConflictStatus.value, ...message.targetStatus }
        if (isActor || isTarget) showToast(text)
        addSystemMessage(text)
        break
      }
      const winnerText = message.winnerId === message.actorId ? message.actorName : message.targetName
      const guardText = message.guarded
        ? `锛${message.guardianName || message.targetName || '瀹堝娍'}鎶垫秷浜嗛儴鍒嗙柌鍔砢`
        : ''
      const trainingText = message.trainingReward ? `锛屽垏纾嬭缁?+${message.trainingReward}${message.trainingBonus ? `锛堢О鍙?${message.trainingBonus}锛塦` : ''}` : ''
      const relationText = message.relationship?.label ? `锛屽叧绯昏浆涓${message.relationship.label}` : ''
      const text = `${message.actorName || '鐜╁'} 瀵${message.targetName || '鐜╁'} 鍙戣捣${message.actionLabel || '鍐茬獊'}锛${winnerText || '涓€鏂'}鍗犱簡涓婇${guardText}${trainingText}${relationText}`
      triggerPlayerActionById(message.actorId, message.actionKey === 'spar' ? 'conflict' : 'conflict')
      if (message.guarded) triggerPlayerActionById(message.guardianId || message.targetId, 'guard')
      if (isActor || isTarget) showToast(text)
      addSystemMessage(text)
      break
    }

    case 'personal_conflict_error':
      showToast(message.message || '涓汉鍐茬獊澶辫触')
      break

    case 'position_correction': {
      const data = message.data || {}
      if (localPlayer) {
        const x = data.x ?? 0
        const y = data.y ?? 2
        const z = data.z ?? 0
        localPlayer.position.set(x, y, z)
        playerX.value = x
        playerZ.value = z
        lastSentPosition = new THREE.Vector3(x, y, z)
      }
      break
    }

    case 'players_state':
      // 鍒濆鍚屾鎵€鏈夌帺瀹?
      message.players.forEach(player => {
        if (player.id !== playerId.value) {
          createRemotePlayer(player.id, player.data)
        }
      })
      break

    case 'aoi_state': {
      const visible = new Set()
      ;(message.players || []).forEach((p) => {
        if (!p || !p.id || p.id === playerId.value) return
        visible.add(p.id)
        createRemotePlayer(p.id, p.data || {})
        updateRemotePlayer(p.id, p.data || {})
      })

      // 绉婚櫎涓嶅湪 AOI 鍐呯殑杩滅鐜╁
      Array.from(remotePlayers.keys()).forEach((id) => {
        if (!visible.has(id)) {
          removeRemotePlayer(id)
        }
      })
      break
    }

    case 'chat':
      // 鍙樉绀哄叾浠栫帺瀹剁殑娑堟伅锛堣嚜宸辩殑娑堟伅宸茬粡鍦ㄦ湰鍦版樉绀轰簡锛?
      if (message.playerId !== playerId.value) {
        chatMessages.value.push({
          sender: message.sender || '鐜╁',
          text: message.message,
          isOwn: false,
          isSystem: false
        })
        scrollChatToBottom()
      }
      break

    case 'map_saved':
      addSystemMessage(message.success ? '鍦板浘淇濆瓨鎴愬姛' : '鍦板浘淇濆瓨澶辫触')
      break

    case 'map_loaded':
      addSystemMessage('鍦板浘鍔犺浇鎴愬姛')
      currentMap.value = message.mapName || '榛樿鍦板浘'
      applyMapData(message.mapData)
      break

    case 'environment_update':
      if (message.environment) {
        applyEnvironment(message.environment)
      }
      break

    case 'tribe_list':
      tribeList.value = Array.isArray(message.tribes) ? message.tribes : []
      break

    case 'world_rumors':
      worldRumors.value = normalizeWorldRumors(message.rumors)
      break

    case 'world_rumor':
      mergeWorldRumor(message.rumor, message.rumors)
      showToast(message.rumor?.title || '涓栫晫鏈変簡鏂扮殑浼犻椈')
      addSystemMessage(message.rumor?.text || '涓栫晫鏈変簡鏂扮殑浼犻椈')
      break

    case 'tribe_state':
      currentTribe.value = message.tribe || null
      tribeRole.value = message.role || null
      tribeContribution.value = message.contribution || 0
      tribeVotes.value = Array.isArray(message.votes) ? message.votes : []
      noTribeGuestStayTargets.value = Array.isArray(message.guestStayTargets) ? message.guestStayTargets : []
      noTribeGuestStayActions.value = message.guestStayActions || {}
      resetTribeHistoryPage(message.tribe)
      if (message.tribe) pendingTribeJoinRequests.value = new Set()
      syncTribeAnnouncementDraft()
      syncActiveBeastVisual()
      if (message.tribe) {
        activeQuest.value.title = '涓洪儴钀芥坊鏌村姞鐭?'
        activeQuest.value.description = '閲囬泦璧勬簮骞朵笂浜ゅ埌鍏叡浠撳簱锛岃钀ョ伀銆佸伐鍏峰拰娲炵┐鎺㈢储閫愭笎鎴愪负鍙兘銆?'
        newTribeName.value = `${message.tribe.name}鍚庡钀`
      }
      break

    case 'tribe_history_page':
      tribeHistoryLoaded.value = mergeHistoryEvents([
        ...tribeHistoryLoaded.value,
        ...(Array.isArray(message.history) ? message.history : [])
      ])
      tribeHistoryNextCursor.value = message.nextCursor ?? null
      tribeHistoryTotal.value = Number(message.total || tribeHistoryTotal.value || 0)
      tribeHistoryLoading.value = false
      break

    case 'tribe_error':
      tribeHistoryLoading.value = false
      showToast(message.message || '閮ㄨ惤鎿嶄綔澶辫触')
      break

    case 'tribe_notice':
      showToast(message.message || '閮ㄨ惤鏈夋柊鐨勮繘灞?')
      addSystemMessage(message.message || '閮ㄨ惤鏈夋柊鐨勮繘灞?')
      break

    case 'tribe_rune_unlocked':
      if (message.rune?.rare) {
        showRareRuneUnlock(message.rune, message.message)
      } else {
        showToast(message.message || '鍥捐吘鍒讳笅浜嗘柊鐨勯摥鏂?')
      }
      addSystemMessage(message.message || '鍥捐吘鍒讳笅浜嗘柊鐨勯摥鏂?')
      break

    case 'season_settlement': {
      currentTribe.value = null
      tribeRole.value = null
      tribeContribution.value = 0
      tribeVotes.value = []
      tribeList.value = []

      const topTribe = Array.isArray(message.topTribes) ? message.topTribes[0] : null
      const summary = topTribe
        ? `${message.season || '涓婃湀'} 鏈堝害缁撶畻瀹屾垚锛${topTribe.name} 浠${topTribe.totalContribution || 0} 璐＄尞灞呴銆傛柊璧涘宸插紑濮嬨€俙`
        : `${message.season || '涓婃湀'} 鏈堝害缁撶畻瀹屾垚锛氭柊璧涘宸插紑濮嬶紝鎵€鏈夐儴钀芥暟鎹凡娓呯┖銆俙`

      if (message.rumor) mergeWorldRumor(message.rumor)
      showToast('鏈堝害缁撶畻瀹屾垚锛屾柊璧涘寮€濮?')
      addSystemMessage(summary)
      break
    }

    case 'pong':
      latency.value = Date.now() - message.timestamp
      break

    case 'ping':
      // 鏈嶅姟绔┖闂茶秴鏃朵細鍙?ping锛氬洖涓€涓?ping 浠ヨЕ鍙戞湇鍔＄ pong锛屼究浜庤绠楀欢杩熷苟淇濇寔閾捐矾娲昏穬
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: message.timestamp || Date.now()
        }))
      }
      break
  }
}

// 娣诲姞绯荤粺娑堟伅
const addSystemMessage = (text) => {
  chatMessages.value.push({
    sender: '绯荤粺',
    text,
    isOwn: false,
    isSystem: true
  })
  scrollChatToBottom()
}

// 鍙戦€佽亰澶╂秷鎭?
const sendMessage = () => {
  const message = chatInput.value.trim()
  if (!message) return

  // 1. 鏃犺鏄惁杩炴帴锛屽厛娓呯┖杈撳叆妗嗭紝缁欑敤鎴锋搷浣滃弽棣?
  chatInput.value = ''

  // 2. 妫€鏌ヨ繛鎺ョ姸鎬?
  if (ws && ws.readyState === WebSocket.OPEN) {
    // 鏈湴鏄剧ず娑堟伅
    chatMessages.value.push({
      sender: playerName.value,
      text: message,
      isOwn: true,
      isSystem: false
    })
    scrollChatToBottom()

    // 鍙戦€佺粰鏈嶅姟鍣?
    ws.send(JSON.stringify({
      type: 'chat',
      message: message
    }))
  } else {
    // 鏈繛鎺ユ椂鐨勬彁绀?
    addSystemMessage('鉂?鍙戦€佸け璐ワ細鏈繛鎺ュ埌鏈嶅姟鍣?')
    
  }
}

// 鑱婂ぉ婊氬姩鍒板簳閮?
const scrollChatToBottom = () => {
  nextTick(() => {
    if (chatMessagesEl.value) {
      chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight
    }
  })
}

// 鎵撳紑鑱婂ぉ
const openChat = () => {
  showChat.value = true
  nextTick(() => {
    chatInputEl.value?.focus()
  })
}

// 澶勭悊鑱婂ぉ杈撳叆妗嗘寜閿?
const handleChatKeyDown = (e) => {
  // 鍏抽敭淇锛氬鏋滄鍦ㄤ娇鐢ㄤ腑鏂囪緭鍏ユ硶锛堟墦瀛楅€夎瘝涓級锛屼笉瑕佽Е鍙戝彂閫?
  if (e.isComposing) return

  if (e.key === 'Enter') {
    e.preventDefault()
    sendMessage()
  } else if ((e.key === 'p' || e.key === 'P') && e.ctrlKey) {
    e.preventDefault()
    sendMessage()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    showChat.value = false
  }
}

// 鍒囨崲鎬ц兘鐩戣鍣?
const togglePerformance = () => {
  showPerformance.value = !showPerformance.value
}

// 鍒囨崲鍏ㄥ睆
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 淇濆瓨鍦板浘
const saveMap = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'save_map',
      mapName: currentMap.value,
      mapData: {
        seed: mapSeed.value,
        environment: mapEnvironment.value,
        decorations
      }
    }))
    addSystemMessage('姝ｅ湪淇濆瓨鍦板浘...')
  } else {
    addSystemMessage('鏈繛鎺ュ埌鏈嶅姟鍣?')
  }
}

// 鍔犺浇鍦板浘
const loadMap = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'load_map',
      mapName: currentMap.value || '榛樿鍦板浘'
    }))
    addSystemMessage('姝ｅ湪鍔犺浇鍦板浘...')
  } else {
    addSystemMessage('鏈繛鎺ュ埌鏈嶅姟鍣?')
  }
}

// 蹇冭烦妫€娴?
const startHeartbeat = () => {
  if (heartbeatTimerId) clearInterval(heartbeatTimerId)
  heartbeatTimerId = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'ping',
        timestamp: Date.now()
      }))
    }
  }, 3000)
}

// 鐢熷懡鍛ㄦ湡
onMounted(() => {
  manualClose = false
  initGame()
  startHeartbeat()
  tribeRitualTimerId = setInterval(() => {
    tribeRitualTick.value = Date.now()
  }, 1000)
  resourceTideTimerId = setInterval(() => {
    resourceTideTick.value = Date.now()
  }, 1000)

  // 鐩戝惉鍏ㄥ睆鍙樺寲
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onUnmounted(() => {
  manualClose = true
  clearReconnectTimer()
  clearKeepAliveTimer()
  // 娓呯悊璧勬簮
  if (renderer) {
    renderer.dispose()
  }
  weatherSystem?.dispose()
  weatherSystem = null
  world?.dispose()
  world = null
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose()
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose())
        } else {
          object.material.dispose()
        }
      }
    })
  }
  if (ws) {
    ws.close()
    ws = null
  }
  if (heartbeatTimerId) {
    clearInterval(heartbeatTimerId)
    heartbeatTimerId = null
  }
  if (tribeRitualTimerId) {
    clearInterval(tribeRitualTimerId)
    tribeRitualTimerId = null
  }
  if (resourceTideTimerId) {
    clearInterval(resourceTideTimerId)
    resourceTideTimerId = null
  }
  if (beastFeedbackClearTimerId) {
    clearTimeout(beastFeedbackClearTimerId)
    beastFeedbackClearTimerId = null
  }
  if (rareRuneUnlockTimer) {
    window.clearTimeout(rareRuneUnlockTimer)
    rareRuneUnlockTimer = null
  }

  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped src="./GameView.css"></style>
