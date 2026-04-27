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
import request from '../utils/request.js'
import { API_CONFIG } from '../config.js'

// 游戏状态
const canvasWrapper = ref(null)
const showPerformance = ref(false)
const showChat = ref(false)
const showInstructions = ref(true)
const isFullscreen = ref(false)
const showQuestPanel = ref(true)
const showInventoryPanel = ref(true)
const showTribePanel = ref(true)

// 性能监控
const fps = ref(60)
const latency = ref(0)
const playerCount = ref(1)
const currentMap = ref('默认地图')
const mapSeed = ref(null)
const mapEnvironment = ref(null)
const loadedObjectsCount = ref(0)
const totalObjectsCount = ref(0)
const currentWeather = ref('sunny')
const resourceTideTick = ref(Date.now())

// 玩家状态
const playerHealth = ref(100)
const playerLevel = ref(1)
const playerExperience = ref(0)
const playerNextLevelExperience = ref(100)
const playerX = ref(0)
const playerZ = ref(0)
const playerId = ref(null)
const playerName = ref('我')
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
  title: '熟悉这片岛屿',
  description: '采集任意 5 份木材或矿石，建立探索的第一批物资。',
  progress: 0,
  target: 5,
  completed: false
})

const interactionTarget = ref(null)
const toastMessages = ref([])
let toastId = 0

const newTribeName = ref('黎明部落')
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

// 聊天
const chatMessages = ref([
  { sender: '系统', text: '欢迎来到 3D 游戏世界！', isOwn: false, isSystem: true }
])
const chatInput = ref('')
const chatMessagesEl = ref(null)
const chatInputEl = ref(null)

// 连接状态
const connectionStatus = ref('connecting')

// Three.js 相关
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

// 相机跟随（不覆盖玩家手动旋转视角）
const cameraFollowTarget = new THREE.Vector3()
const cameraTargetOffset = new THREE.Vector3(0, 1.2, 0)
let hasCameraFollowTarget = false
const tempDesiredTarget = new THREE.Vector3()
const tempDeltaTarget = new THREE.Vector3()

// 装饰物管理（用于懒加载）
let decorations = [] // 所有装饰物的数据
const loadDistance = 80 // 加载距离
const unloadDistance = 100 // 卸载距离

let heartbeatTimerId = null
let reconnectTimerId = null
let keepAliveTimerId = null
let tribeRitualTimerId = null
let resourceTideTimerId = null
let beastFeedbackClearTimerId = null
let manualClose = false
let reconnectAttempt = 0
let authRefreshInFlight = null

// 键盘状态
const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  space: false,
  e: false
}

// 玩家移动速度
const moveSpeed = 10
const jumpPower = 5
let velocity = new THREE.Vector3()
const gravity = -20
const playerRadius = 0.7
const interactionDistance = 4
const resourceRewards = {
  tree: {
    label: '树木',
    itemKey: 'wood',
    itemName: '木材',
    amount: 1,
    experience: 20
  },
  rock: {
    label: '矿石',
    itemKey: 'stone',
    itemName: '矿石',
    amount: 1,
    experience: 25
  }
}
const tradeResourceLabels = {
  wood: '木材',
  stone: '石块',
  food: '食物'
}
const tradeResourceOptions = Object.entries(tradeResourceLabels).map(([key, label]) => ({ key, label }))
const tribeLandmarkDecorationTypes = new Set(['tribe_spawn', 'tribe_camp', 'tribe_flag', 'tribe_beast_marker', 'scouted_resource_site', 'controlled_resource_site', 'trade_route_site', 'nomad_caravan', 'nomad_visitor', 'mutual_aid_alert', 'alliance_signal', 'world_event_remnant', 'diplomacy_council_site', 'border_theater', 'dispute_witness_stone', 'celebration_echo', 'map_memory_trace', 'world_riddle_site', 'trial_ground', 'forbidden_edge', 'fog_trail', 'disaster_coop_site', 'old_camp_echo', 'rare_cave_race', 'cave_rescue_clue', 'cave_return_mark', 'traveler_song', 'standing_ritual_site', 'sacred_fire_relay', 'sacred_fire_site', 'neutral_sanctuary', 'collection_wall', 'shared_puzzle', 'shared_puzzle_site', 'trail_marker', 'named_landmark'])
const tribeInteractableTypes = ['tribe_storage', 'tribe_workbench', 'tribe_hut', 'tribe_fence', 'tribe_road', 'tribe_spawn', 'tribe_camp', 'tribe_totem', 'tribe_flag', 'tribe_beast_marker', 'scouted_resource_site', 'controlled_resource_site', 'trade_route_site', 'nomad_caravan', 'nomad_visitor', 'mutual_aid_alert', 'alliance_signal', 'world_event_remnant', 'diplomacy_council_site', 'border_theater', 'dispute_witness_stone', 'celebration_echo', 'map_memory_trace', 'world_riddle_site', 'trial_ground', 'forbidden_edge', 'fog_trail', 'disaster_coop_site', 'old_camp_echo', 'rare_cave_race', 'cave_rescue_clue', 'cave_return_mark', 'traveler_song', 'standing_ritual_site', 'sacred_fire_relay', 'sacred_fire_site', 'neutral_sanctuary', 'collection_wall', 'shared_puzzle', 'shared_puzzle_site', 'trail_marker', 'migration_plan_site', 'named_landmark']
const regionLandmarkTypes = ['region_forest', 'region_mountain', 'region_coast', 'region_ruin']
const landmarkFallbackTypes = ['campfire', 'ruin', 'crystal', 'tribe_totem', 'tribe_storage', 'tribe_workbench', 'tribe_fence', 'tribe_road', 'tribe_spawn', 'tribe_camp', 'tribe_flag', 'tribe_beast_marker', 'scouted_resource_site', 'controlled_resource_site', 'trade_route_site', 'nomad_caravan', 'nomad_visitor', 'mutual_aid_alert', 'alliance_signal', 'world_event_remnant', 'diplomacy_council_site', 'border_theater', 'dispute_witness_stone', 'celebration_echo', 'map_memory_trace', 'world_riddle_site', 'trial_ground', 'forbidden_edge', 'fog_trail', 'disaster_coop_site', 'old_camp_echo', 'rare_cave_race', 'cave_rescue_clue', 'cave_return_mark', 'traveler_song', 'standing_ritual_site', 'sacred_fire_relay', 'sacred_fire_site', 'neutral_sanctuary', 'collection_wall', 'shared_puzzle', 'shared_puzzle_site', 'trail_marker', 'migration_plan_site', 'named_landmark', 'cave_entrance', ...regionLandmarkTypes]
const tribeBuildingTypeLabels = {
  tribe_totem: '图腾',
  tribe_storage: '仓库',
  tribe_workbench: '石器台',
  tribe_hut: '棚屋',
  tribe_flag: '领地旗帜',
  tribe_beast_marker: '驯养幼兽',
  campfire: '营火'
}
const caveNodeLibrary = [
  {
    type: 'entrance',
    title: '洞口斜坡',
    description: '潮湿空气从石缝里涌出，脚下还能看到外面的天光。'
  },
  {
    type: 'crossroad',
    title: '潮湿岔路',
    description: '两条窄路在这里分开，墙面上有动物爪痕。'
  },
  {
    type: 'ore',
    title: '萤石裂隙',
    description: '蓝白色矿光从裂缝里透出，适合采集石料。'
  },
  {
    type: 'lore',
    title: '古痕石厅',
    description: '石壁上有部落刻痕，像是在记录一次迁徙。'
  },
  {
    type: 'hazard',
    title: '落石窄道',
    description: '上方偶尔滚落碎石，继续前进会消耗更多补给。'
  },
  {
    type: 'deep',
    title: '深层矿脉',
    description: '这里已经远离洞口，矿石更多，也更适合部落远征。'
  }
]
const caveExpeditionPlans = [
  { key: 'steady', label: '稳健', summary: '少耗食物，路线较短', foodCost: 5, depthBonus: -1, supplyBonus: 3, findBonus: 0, findMultiplier: 0.9, oreRoll: 0.72, loreRoll: 0.34 },
  { key: 'deep', label: '深入', summary: '均衡推进，收获稳定', foodCost: 7, depthBonus: 0, supplyBonus: 1, findBonus: 1, findMultiplier: 1.12, oreRoll: 0.66, loreRoll: 0.36 },
  { key: 'risky', label: '冒险', summary: '高消耗，高稀有机会', foodCost: 9, depthBonus: 1, supplyBonus: -1, findBonus: 2, findMultiplier: 1.3, oreRoll: 0.58, loreRoll: 0.42 }
]
const beastTaskOptions = [
  { key: 'guard', label: '守营' },
  { key: 'hunt', label: '助猎' },
  { key: 'haul', label: '驮运' }
]

beastTaskOptions.push(
  { key: 'sniff', label: '洞穴嗅探' },
  { key: 'omen', label: '祭典吉兆' }
)

const optionMapToList = (options = {}) => Object.entries(options || {}).map(([key, value]) => ({
  ...(value && typeof value === 'object' ? value : {}),
  key,
  label: value?.label || key,
  summary: value?.summary || ''
}))

const PLAYER_STAND_HEIGHT = 2
const minimapRadius = 95
const weatherMeta = {
  sunny: { label: '晴朗海风', announcement: '按 T 呼出交流板，附近玩家可以看到你的消息。' },
  rain: { label: '雨幕森林', announcement: '雨声变密了，营火和晶石会成为更醒目的路标。' },
  snow: { label: '细雪海岸', announcement: '雪天视野更柔和，留意小地图上的地标方向。' },
  fog: { label: '薄雾岛屿', announcement: '雾气正在靠近，建议沿着地标探索，不要离海岸太远。' }
}

const inventoryItems = computed(() => [
  { key: 'wood', name: '木材', count: inventory.value.wood },
  { key: 'stone', name: '矿石', count: inventory.value.stone }
])

const experiencePercent = computed(() => {
  const next = playerNextLevelExperience.value || 1
  return Math.min(100, Math.round((playerExperience.value / next) * 100))
})

const questProgressPercent = computed(() => {
  const quest = activeQuest.value
  const target = quest.target || 1
  return Math.min(100, Math.round((quest.progress / target) * 100))
})

const displayPlayerZ = computed(() => playerZ.value)

const weatherLabel = computed(() => weatherMeta[currentWeather.value]?.label || '未知天气')

const formatCountdown = (seconds) => {
  const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0))
  const minutes = Math.floor(safeSeconds / 60)
  const remainder = safeSeconds % 60
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

const announcementText = computed(() => celestialWindowText.value || worldEventText.value || migrationSeasonText.value || resourceTideText.value || weatherMeta[currentWeather.value]?.announcement || weatherMeta.sunny.announcement)

const activeResourceTide = computed(() => {
  resourceTideTick.value
  const tide = mapEnvironment.value?.resourceTide
  if (!tide?.activeUntil) return null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(tide.activeUntil).getTime() - Date.now()) / 1000))
  if (remainingSeconds <= 0) return null
  return { ...tide, remainingSeconds }
})

const resourceTideText = computed(() => {
  const tide = activeResourceTide.value
  if (!tide) return null
  const seasonText = tide.seasonBoosted ? '（迁徙季节增强）' : ''
  return `${tide.regionLabel}出现大地馈赠${seasonText}：区域内采集额外 +${tide.gatherBonus || 0}，剩余 ${formatCountdown(tide.remainingSeconds)}`
})

const activeMigrationSeason = computed(() => {
  resourceTideTick.value
  const season = mapEnvironment.value?.migrationSeason
  if (!season?.activeUntil) return null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(season.activeUntil).getTime() - Date.now()) / 1000))
  if (remainingSeconds <= 0) return null
  return { ...season, remainingSeconds }
})

const migrationSeasonText = computed(() => {
  const season = activeMigrationSeason.value
  if (!season) return null
  return `${season.title || '迁徙季节'}：兽群更频繁，大地馈赠采集额外 +${season.tideBonus || 0}，剩余 ${formatCountdown(season.remainingSeconds)}`
})

const activeCelestialWindow = computed(() => {
  resourceTideTick.value
  const window = mapEnvironment.value?.celestialWindow
  if (!window?.activeUntil) return null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(window.activeUntil).getTime() - Date.now()) / 1000))
  if (remainingSeconds <= 0) return null
  return { ...window, remainingSeconds }
})

const celestialWindowText = computed(() => {
  const window = activeCelestialWindow.value
  if (!window) return null
  return `${window.title || '罕见天象'}：${window.summary || '所有部落都能解读这次天空征兆'}，剩余 ${formatCountdown(window.remainingSeconds)}`
})

const activeWorldEvent = computed(() => {
  resourceTideTick.value
  const events = Array.isArray(mapEnvironment.value?.worldEvents) ? mapEnvironment.value.worldEvents : []
  const event = events.find((item) => item?.activeUntil && new Date(item.activeUntil).getTime() > Date.now())
  if (!event) return null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(event.activeUntil).getTime() - Date.now()) / 1000))
  return { ...event, remainingSeconds }
})
const activeWorldEventActionOptions = computed(() => {
  const event = activeWorldEvent.value
  if (!event || !currentTribe.value?.worldEventActions) return []
  const options = currentTribe.value.worldEventActions[event.key] || []
  return options.filter((option) => {
    const regionTypes = Array.isArray(option.regionTypes) ? option.regionTypes : []
    return !regionTypes.length || regionTypes.includes(event.regionType)
  })
})
const selectedWorldEventActionKey = computed(() => {
  const options = activeWorldEventActionOptions.value
  if (!options.length) return ''
  return options.some((option) => option.key === worldEventActionKey.value)
    ? worldEventActionKey.value
    : options[0].key
})

const activeSeasonObjective = computed(() => {
  resourceTideTick.value
  const objective = mapEnvironment.value?.seasonObjective
  if (!objective?.activeUntil) return null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(objective.activeUntil).getTime() - Date.now()) / 1000))
  if (remainingSeconds <= 0) return null
  return { ...objective, remainingSeconds }
})

const seasonObjectiveText = computed(() => {
  const objective = activeSeasonObjective.value
  if (!objective) return null
  return `${objective.regionLabel || '未知区域'}出现${objective.title || '季节目标'}：${objective.summary || '短暂机会正在出现'}，剩余 ${formatCountdown(objective.remainingSeconds)}`
})

const seasonObjectiveActiveHint = computed(() => {
  const base = '你正在季节目标区域内'
  return celebrationDiscoveryHint.value ? `${base} · ${celebrationDiscoveryHint.value}` : base
})

const worldEventText = computed(() => {
  const event = activeWorldEvent.value
  if (!event) return null
  const rewardText = worldEventRewardText(event)
  const rewardSuffix = rewardText ? `，处理奖励：${rewardText}` : ''
  return `${event.regionLabel || '未知区域'}出现${event.title || '世界事件'}：${event.summary || '新的动态事件正在发生'}${rewardSuffix}，剩余 ${formatCountdown(event.remainingSeconds)}`
})

const worldEventRewardText = (event) => {
  const reward = event?.reward || {}
  const parts = []
  if (reward.wood) parts.push(`木材${reward.wood > 0 ? '+' : ''}${reward.wood}`)
  if (reward.stone) parts.push(`石块${reward.stone > 0 ? '+' : ''}${reward.stone}`)
  if (reward.food) parts.push(`食物+${reward.food}`)
  if (reward.discoveryProgress) parts.push(`发现进度+${reward.discoveryProgress}`)
  if (reward.renown) parts.push(`声望+${reward.renown}`)
  return parts.join('、')
}

const isInsideResourceTide = computed(() => {
  const tide = activeResourceTide.value
  if (!tide) return false
  const dx = playerX.value - (tide.x || 0)
  const dz = playerZ.value - (tide.z || 0)
  const radius = tide.radius || 0
  return dx * dx + dz * dz <= radius * radius
})

const resourceTideGatherBonus = computed(() => (isInsideResourceTide.value ? (activeResourceTide.value?.gatherBonus || 0) : 0))

const isCurrentTribeEntity = (entity) => {
  const tribeId = currentTribe.value?.id
  return Boolean(tribeId && entity?.tribeId && entity.tribeId === tribeId)
}

const formatMapPoint = (point) => {
  if (!point) return '未知位置'
  const x = Math.round(point.x || 0)
  const z = Math.round(point.z || 0)
  return `(${x}, ${z})`
}

const oathVisualClass = (oathKey) => oathKey ? `oath-${oathKey}` : ''

const describeLandmark = (landmark) => {
  if (!landmark) return '未知地标'
  if (landmark.type === 'tribe_spawn' && landmark.isOwnTribe) return '本部落出生点'
  if (landmark.type === 'tribe_camp' && landmark.isOwnTribe) return landmark.oathLabel ? `本部落营地 · ${landmark.oathLabel}` : '本部落营地'
  if (landmark.type === 'tribe_flag' && landmark.isOwnTribe) return landmark.oathLabel ? `本部落领地旗帜 · ${landmark.oathLabel}` : '本部落领地旗帜'
  if (landmark.type === 'tribe_beast_marker' && landmark.isOwnTribe) return '本部落驯养幼兽'
  if (landmark.type === 'scouted_resource_site' && landmark.jointWatchId) return landmark.isOwnTribe ? `联合守望线索 · ${landmark.resourceLabel || landmark.label || '待确认'}` : '其他部落联合守望线索'
  if (landmark.type === 'scouted_resource_site') return landmark.isOwnTribe ? `侦察资源点 · ${landmark.resourceLabel || landmark.label || '待确认'}` : '其他部落侦察资源点'
  if (landmark.type === 'controlled_resource_site') return landmark.isOwnTribe ? `控制资源点 Lv.${landmark.level || 1} · ${landmark.resourceLabel || landmark.label || '可收取'}` : '其他部落控制资源点'
  if (landmark.type === 'trade_route_site') return landmark.isOwnTribe ? `交换通路 · ${landmark.partnerTribeName || '邻近部落'}` : '其他部落交换通路'
  if (landmark.type === 'nomad_caravan') return landmark.isOwnTribe ? `游牧商队 · ${landmark.focusLabel || '中立货物'}` : '其他部落接待的商队'
  if (landmark.type === 'nomad_visitor') return landmark.isOwnTribe ? `${landmark.label || '神秘旅人'} · ${landmark.giftLabel || '口信'}` : '其他部落来访者'
  if (landmark.type === 'mutual_aid_alert') return landmark.isOwnTribe ? `${landmark.label || '火烟互助警报'} · ${landmark.sourceTitle || '紧急事件'}` : '其他部落的火烟警报'
  if (landmark.type === 'alliance_signal') return landmark.isOwnTribe ? `${landmark.label || '联盟旗语'} · ${landmark.actionLabel || landmark.otherTribeName || '友好部落'}` : '其他部落的联盟旗语'
  if (landmark.type === 'traveler_song') return landmark.isOwnTribe ? `${landmark.label || '旅人谣曲'} · ${landmark.toneLabel || landmark.rewardLabel || '可传唱'}` : '其他部落旅人谣曲'
  if (landmark.type === 'border_theater') return landmark.isOwnTribe ? `${landmark.label || '边境戏台'} · 登场 ${landmark.participantCount || 0} 人` : '其他部落边境戏台'
  if (landmark.type === 'dispute_witness_stone') return landmark.isOwnTribe ? `${landmark.label || '争端见证石'} · 见证 ${landmark.progress || 0}/${landmark.target || 1}` : '其他部落争端见证石'
  if (landmark.type === 'celebration_echo') return landmark.isOwnTribe ? `${landmark.label || '庆功余韵'} · ${landmark.rewardLabel || '可加入'}` : '其他部落庆功余韵'
  if (landmark.type === 'world_event_remnant') return landmark.isOwnTribe ? `${landmark.label || '事件余迹'} · ${landmark.rewardLabel || '可整理'}` : '其他部落事件余迹'
  if (landmark.type === 'map_memory_trace') return landmark.isOwnTribe ? `${landmark.label || '活地图记忆'} · ${landmark.rewardLabel || '可重访'}` : '其他部落地图记忆'
  if (landmark.type === 'old_camp_echo') return landmark.isOwnTribe ? `${landmark.label || '回归旧营'} · ${landmark.rewardLabel || '可回访'}` : '其他部落旧营回声'
  if (landmark.type === 'rare_cave_race') return landmark.isOwnTribe ? `${landmark.label || '稀有洞穴'} · 可抢首探` : '其他部落稀有洞穴线索'
  if (landmark.type === 'cave_rescue_clue') return landmark.isOwnTribe ? `${landmark.label || '洞穴营救'} · ${landmark.progress || 0}/${landmark.target || 1}` : '其他部落洞穴营救线索'
  if (landmark.type === 'cave_return_mark') return landmark.isOwnTribe ? `${landmark.label || '洞穴回访'} · ${landmark.methodLabel || landmark.rewardLabel || '可复盘'}` : '其他部落洞穴回访标记'
  if (landmark.type === 'sacred_fire_relay' || landmark.type === 'sacred_fire_site') return landmark.isOwnTribe ? `${landmark.label || '圣火接力'} · ${landmark.destinationLabel || landmark.rewardLabel || '护火中'}` : '其他部落圣火接力'
  if (landmark.type === 'neutral_sanctuary') return landmark.isOwnTribe ? `${landmark.label || '中立圣地'} · ${landmark.status === 'dormant' ? '沉寂恢复' : '可朝圣'}` : '其他部落发现的中立圣地'
  if (landmark.type === 'collection_wall') return landmark.isOwnTribe ? `${landmark.label || '隐秘收藏墙'} · ${landmark.collectionLabel || '旧物上墙'}` : '其他部落收藏墙'
  if (landmark.type === 'shared_puzzle' || landmark.type === 'shared_puzzle_site') return landmark.isOwnTribe ? `${landmark.label || '共享谜图'} · ${landmark.fragmentLabel || landmark.rewardLabel || '图案拼合'}` : '其他部落共享谜图'
  if (landmark.type === 'trail_marker') return landmark.isOwnTribe ? `${landmark.label || '活路标'} · ${landmark.interpretation || landmark.summary || '可改写'}` : '其他部落活路标'
  if (landmark.type === 'world_riddle_site') return landmark.isOwnTribe ? `${landmark.label || '世界谜语'} · ${landmark.patternLabel || landmark.rewardLabel || '可记录规律'}` : '其他部落世界谜语线索'
  if (landmark.type === 'trial_ground') return landmark.isOwnTribe ? `${landmark.label || '营地试炼场'} · 已试炼 ${landmark.participantCount || 0} 人` : '其他部落试炼场'
  if (landmark.type === 'forbidden_edge') return landmark.isOwnTribe ? `${landmark.label || '禁地边缘'} · 已试探 ${landmark.participantCount || 0} 人` : '其他部落禁地边缘'
  if (landmark.type === 'fog_trail') return landmark.isOwnTribe ? `${landmark.label || '雾区探路'} · 已探路 ${landmark.participantCount || 0} 人` : '其他部落雾区探路'
  if (landmark.type === 'disaster_coop_site') return landmark.isOwnTribe ? `${landmark.label || '大灾协作点'} · ${landmark.disasterLabel || landmark.rewardLabel || '可协作'}` : '其他部落大灾协作点'
  if (landmark.type === 'named_landmark') return landmark.isOwnTribe ? `${landmark.label || '有名之地'} · ${landmark.sourceLabel || '部落命名'}` : '其他部落命名地标'
  if (landmark.type === 'tribe_totem' && landmark.oathLabel) return `${landmark.oathLabel}图腾`
  if (landmark.type === 'tribe_totem' && landmark.hasRuneHonor) return landmark.honorText
  return landmark.label || '未知地标'
}

const tribeRuneHonorText = (tribe = currentTribe.value) => {
  if (tribe?.publicRuneSummary?.text) return tribe.publicRuneSummary.text
  const runes = Array.isArray(tribe?.runes) ? tribe.runes : []
  if (!runes.length) return '图腾尚未刻下铭文'
  const names = runes.map((rune) => rune.title || '未知铭文').filter(Boolean)
  return `图腾铭文 ${runes.length} 枚：${names.slice(0, 3).join('、')}${names.length > 3 ? '…' : ''}`
}

const mapToMinimap = (x, z) => {
  const clamp = (value) => Math.max(0, Math.min(100, value))
  return {
    left: clamp(((x + minimapRadius) / (minimapRadius * 2)) * 100),
    top: clamp(((z + minimapRadius) / (minimapRadius * 2)) * 100)
  }
}

const minimapPlayer = computed(() => mapToMinimap(playerX.value, playerZ.value))

const mapLandmarks = computed(() => {
  const envLandmarks = Array.isArray(mapEnvironment.value?.landmarks) ? mapEnvironment.value.landmarks : []
  const landmarks = envLandmarks.length
    ? envLandmarks
    : decorations.filter((item) => item?.label && landmarkFallbackTypes.includes(item.type))
  const activeEvents = Array.isArray(mapEnvironment.value?.worldEvents)
    ? mapEnvironment.value.worldEvents.filter((item) => item?.activeUntil && new Date(item.activeUntil).getTime() > Date.now())
    : []
  const worldEventLandmarks = activeEvents.map((event) => ({
    id: event.id,
    type: `world_event_${event.key || 'generic'}`,
    label: event.title || '世界事件',
    x: event.x || 0,
    z: event.z || 0,
    eventSummary: event.summary || ''
  }))
  const seasonObjective = activeSeasonObjective.value
  const seasonLandmarks = seasonObjective
    ? [{
        id: seasonObjective.id,
        type: 'season_objective',
        label: seasonObjective.title || '季节目标',
        x: seasonObjective.x || 0,
        z: seasonObjective.z || 0,
        eventSummary: seasonObjective.summary || ''
      }]
    : []
  const celestialWindow = activeCelestialWindow.value
  const celestialLandmarks = celestialWindow
    ? [{
        id: celestialWindow.id,
        type: 'celestial_window',
        label: celestialWindow.title || '罕见天象',
        x: celestialWindow.x || 0,
        z: celestialWindow.z || 0,
        eventSummary: celestialWindow.summary || ''
      }]
    : []

  return [...landmarks, ...worldEventLandmarks, ...seasonLandmarks, ...celestialLandmarks].map((landmark) => {
    const isOwnTribe = isCurrentTribeEntity(landmark)
    const honorText = landmark.type === 'tribe_totem'
      ? (landmark.runeSummary?.text || (isOwnTribe ? tribeRuneHonorText() : '图腾尚未刻下铭文'))
      : ''
    return {
      ...landmark,
      isOwnTribe,
      honorText,
      isLegendaryRenown: Number(landmark.renownState?.level || 0) >= 3,
      hasRuneHonor: Boolean(honorText && honorText !== '图腾尚未刻下铭文'),
      oathClass: oathVisualClass(landmark.oathKey),
      boundaryClass: boundaryClass(landmark.boundaryRelation),
      contestClass: landmark.contested ? 'contested' : '',
      title: honorText
        ? `${landmark.label || '部落图腾'}｜${landmark.oathLabel ? `${landmark.oathLabel}｜` : ''}${landmark.renownState?.title ? `${landmark.renownState.title}｜` : ''}${honorText}`
        : (landmark.oathLabel ? `${landmark.label || '部落地标'}｜${landmark.oathLabel}` : landmark.label)
    }
  })
})

const isInsideSeasonObjective = computed(() => {
  const objective = activeSeasonObjective.value
  if (!objective) return false
  const dx = playerX.value - (objective.x || 0)
  const dz = playerZ.value - (objective.z || 0)
  const radius = objective.radius || 0
  return dx * dx + dz * dz <= radius * radius
})

const minimapLandmarks = computed(() => mapLandmarks.value.map((landmark) => ({
  ...landmark,
  ...mapToMinimap(landmark.x || 0, landmark.z || 0)
})))

const nearestLandmarkText = computed(() => {
  if (!mapLandmarks.value.length) return '附近暂无已知地标'

  let nearest = null
  let nearestDistance = Infinity
  for (const landmark of mapLandmarks.value) {
    const dx = (landmark.x || 0) - playerX.value
    const dz = (landmark.z || 0) - playerZ.value
    const distance = Math.sqrt(dx * dx + dz * dz)
    if (distance < nearestDistance) {
      nearest = landmark
      nearestDistance = distance
    }
  }

  if (!nearest) return '附近暂无已知地标'
  return `最近地标：${describeLandmark(nearest)} · ${Math.round(nearestDistance)}m`
})

const roleLabel = (role) => {
  const labels = {
    leader: '首领',
    elder: '长老',
    member: '成员'
  }
  return labels[role] || '成员'
}

const tribeRoleLabel = computed(() => roleLabel(tribeRole.value))
const canManageTribeTargets = computed(() => ['leader', 'elder'].includes(tribeRole.value))
const oralChainLines = computed(() => currentTribe.value?.oralChain?.lines || [])
const oralChainReady = computed(() => Boolean(currentTribe.value?.oralChain?.ready))
const oralChainProgressText = computed(() => {
  const chain = currentTribe.value?.oralChain
  if (!chain) return '0 / 0'
  return `${chain.lines?.length || 0} / ${chain.target || 0}`
})
const oralChainThemeText = computed(() => {
  const chain = currentTribe.value?.oralChain
  if (!chain?.themeLabel) return ''
  return `主题：${chain.themeLabel}`
})

const syncTribeAnnouncementDraft = () => {
  tribeAnnouncementDraft.value = currentTribe.value?.announcement || ''
}

const lastSeasonChampion = computed(() => {
  const lastSettlement = seasonSummary.value?.lastSettlement
  const topTribes = Array.isArray(lastSettlement?.topTribes) ? lastSettlement.topTribes : []
  return topTribes[0] || null
})

const normalizeWorldRumors = (rumors) => {
  const seen = new Set()
  const unique = []
  ;(Array.isArray(rumors) ? rumors : []).forEach((rumor) => {
    if (rumor?.id && !seen.has(rumor.id)) {
      seen.add(rumor.id)
      unique.push(rumor)
    }
  })
  return unique
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 6)
}

const visibleWorldRumors = computed(() => normalizeWorldRumors(worldRumors.value).slice(0, 4))

const mergeWorldRumor = (rumor, rumors = []) => {
  worldRumors.value = normalizeWorldRumors([
    ...(rumor ? [rumor] : []),
    ...worldRumors.value,
    ...(Array.isArray(rumors) ? rumors : [])
  ])
}

const tribeCampBuildingTags = computed(() => {
  const buildings = currentTribe.value?.camp?.buildings || []
  return buildings
    .filter((building) => building?.id)
    .map((building) => ({
      id: building.id,
      label: tribeBuildingTypeLabels[building.type] || building.label || '建筑'
    }))
})

const tribeCampSummaryText = computed(() => {
  const camp = currentTribe.value?.camp
  if (!camp) return '营地正在搭建中。'
  const center = formatMapPoint(camp.center)
  const spawn = formatMapPoint(camp.spawn)
  return `营地核心位于 ${center}，新成员会从 ${spawn} 集结出发。`
})

const foodPressureText = computed(() => {
  const pressure = currentTribe.value?.foodPressure
  if (!pressure) return '安全线 --'
  const safeLine = pressure.safeLine || 0
  if (pressure.active) {
    return `超出 ${pressure.excess || 0}，每 ${pressure.decayIntervalMinutes || 0} 分钟缓慢腐坏`
  }
  return `安全线 ${safeLine}${pressure.storageBonus ? '，仓库加成中' : ''}`
})

const tradeResourceText = (resource, amount) => `${amount || 0} ${tradeResourceLabels[resource] || resource || '资源'}`

const tradeText = (trade) => {
  const offer = trade?.offer || {}
  const request = trade?.request || {}
  return `${trade.fromTribeName || '部落'} 出 ${tradeResourceText(offer.resource, offer.amount)}，换 ${tradeResourceText(request.resource, request.amount)}`
}

const tradeDirectionText = (trade) => {
  if (trade?.fromTribeId === currentTribe.value?.id) return `发给 ${trade.toTribeName || '目标部落'}`
  if (trade?.toTribeId === currentTribe.value?.id) return `来自 ${trade.fromTribeName || '其他部落'}`
  return '部落贸易'
}

const activeTribeCelestialWindow = computed(() => currentTribe.value?.celestialWindow || null)
const celestialBranchOptions = computed(() => activeTribeCelestialWindow.value?.branches || [])
const weatherForecastSignOptions = computed(() => optionMapToList(currentTribe.value?.weatherForecastSigns))
const weatherName = (weatherKey) => weatherMeta[weatherKey]?.label || weatherKey || '未知天气'
const tribeLawOptions = computed(() => optionMapToList(currentTribe.value?.tribeLawOptions))
const sharedPuzzleOptions = computed(() => optionMapToList(currentTribe.value?.sharedPuzzleOptions))
const worldRiddlePredictionOptions = computed(() => optionMapToList(currentTribe.value?.worldRiddlePredictions))
const trialGroundActions = computed(() => optionMapToList(currentTribe.value?.trialGroundActions))
const rumorTruthActions = computed(() => optionMapToList(currentTribe.value?.rumorTruthActions))
const echoItemTypeOptions = computed(() => optionMapToList(currentTribe.value?.echoItemTypes))
const echoItemExperienceOptions = computed(() => optionMapToList(currentTribe.value?.echoItemExperiences))
const namedLandmarkOptions = computed(() => optionMapToList(currentTribe.value?.namedLandmarkOptions))

const beastSpecialtyLabel = (specialtyKey) => {
  const specialtyLabels = {
    guardian: '守卫',
    hunter: '猎伴',
    carrier: '驮兽',
    sniffer: '嗅探',
    omen: '吉兆'
  }
  return specialtyLabels[specialtyKey] || specialtyKey || '未定'
}

const tribeHistoryFilters = [
  { key: 'all', label: '全部' },
  { key: 'build', label: '建设' },
  { key: 'rune', label: '铭文' },
  { key: 'ritual', label: '仪式' },
  { key: 'governance', label: '治理' },
  { key: 'cave', label: '远征' },
  { key: 'world_event', label: '事件' },
  { key: 'food', label: '食物' },
  { key: 'trade', label: '贸易' }
]

const governanceHistoryTypes = ['application', 'announcement', 'allocation', 'punishment', 'vote']
const mergeHistoryEvents = (events) => {
  const merged = []
  const seen = new Set()
  ;(events || []).forEach((event) => {
    if (!event?.id || seen.has(event.id)) return
    seen.add(event.id)
    merged.push(event)
  })
  return merged.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
}

const allTribeHistory = computed(() => mergeHistoryEvents([
  ...(currentTribe.value?.history || []),
  ...tribeHistoryLoaded.value
]))

const filteredTribeHistory = computed(() => {
  const history = allTribeHistory.value
  const filter = tribeHistoryFilter.value
  const filtered = filter === 'all'
    ? history
    : filter === 'governance'
      ? history.filter((event) => governanceHistoryTypes.includes(event.type))
      : history.filter((event) => event.type === filter)
  return filtered
})

const visibleTribeHistory = computed(() => filteredTribeHistory.value)
const hasMoreTribeHistory = computed(() => tribeHistoryNextCursor.value !== null && tribeHistoryNextCursor.value !== undefined)

const historyTypeLabel = (type) => {
  const labels = {
    build: '建设',
    rune: '铭文',
    ritual: '仪式',
    cave: '远征',
    world_event: '事件',
    application: '申请',
    announcement: '公告',
    allocation: '预分配',
    punishment: '惩罚',
    vote: '投票',
    trade: '贸易'
  }
  return labels[type] || '历史'
}

const formatHistoryTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

const formatRemainingSeconds = (value) => {
  resourceTideTick.value
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const seconds = Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000))
  if (seconds <= 0) return ''
  return `${seconds}s`
}

const trialGroundRewardText = (action = {}) => {
  const reward = action.reward || {}
  const parts = []
  if (reward.wood) parts.push(`木材+${reward.wood}`)
  if (reward.stone) parts.push(`石块+${reward.stone}`)
  if (reward.food) parts.push(`食物+${reward.food}`)
  if (reward.renown) parts.push(`声望+${reward.renown}`)
  if (reward.discoveryProgress) parts.push(`发现+${reward.discoveryProgress}`)
  if (reward.tradeReputation) parts.push(`贸易+${reward.tradeReputation}`)
  if (action.pressureRelief) parts.push(`战压-${action.pressureRelief}`)
  return parts.join('、')
}

const forbiddenEdgeRewardText = (action = {}) => {
  const parts = []
  if (action.woodCost) parts.push(`耗木材 ${action.woodCost}`)
  if (action.safety) parts.push(`安全 ${action.safety > 0 ? '+' : ''}${action.safety}`)
  if (action.supportBonus) parts.push(`支撑+${action.supportBonus}`)
  if (action.requiresMembers) parts.push(`至少 ${action.requiresMembers} 人`)
  const rewardText = trialGroundRewardText(action)
  if (rewardText) parts.push(rewardText)
  if (action.collectionReady) parts.push('可带回旧物来源')
  return parts.join('、')
}

const forbiddenEdgeRouteProofRewardText = (action = {}) => {
  const parts = []
  const rewardText = trialGroundRewardText(action)
  if (rewardText) parts.push(rewardText)
  if (action.relationDelta) parts.push(`关系+${action.relationDelta}`)
  if (action.tradeTrustDelta) parts.push(`信任+${action.tradeTrustDelta}`)
  return parts.join('、')
}

const personalConflictText = computed(() => {
  const status = personalConflictStatus.value || {}
  const fatigue = status.fatigue || 0
  const fatigueMax = status.fatigueMax || 6
  const fatigueTime = formatRemainingSeconds(status.fatigueUntil)
  const guardTime = formatRemainingSeconds(status.guardUntil)
  const inspirationTime = formatRemainingSeconds(status.inspirationUntil)
  const title = status.renownTitle?.title || '无名成员'
  const parts = [`${title} ${status.personalRenown || 0}`, `疲劳 ${fatigue}/${fatigueMax}`]
  if (fatigueTime) parts.push(`恢复 ${fatigueTime}`)
  if (guardTime) {
    const target = status.guardTargetName ? `对${status.guardTargetName}` : ''
    parts.push(`守势${target} ${guardTime} · ${status.guardRadius || 6}步`)
  }
  if (status.fatigueRecoveryBonusSeconds) parts.push(`恢复-${status.fatigueRecoveryBonusSeconds}s`)
  if (status.sparTrainingBonus) parts.push(`切磋+${status.sparTrainingBonus}`)
  if (status.skirmishContributionBonus) parts.push(`集结+${status.skirmishContributionBonus}`)
  if (inspirationTime) {
    const source = status.inspirationSourceName ? `${status.inspirationSourceName} ` : ''
    parts.push(`${source}鼓舞 +${status.inspirationContribution || 1} ${inspirationTime}`)
  }
  const relation = (status.personalRelations || [])[0]
  if (relation?.targetName && relation?.label) {
    parts.push(`${relation.label} ${relation.targetName} ${relation.score || 0}`)
  }
  return parts.join(' · ')
})

const personalIdentity = computed(() => personalConflictStatus.value?.identity || {})
const personalIdentityOptions = computed(() => personalIdentity.value?.options || [])
const personalIdentityCooldownText = computed(() => formatRemainingSeconds(personalIdentity.value?.cooldownUntil))
const personalIdentityActionText = computed(() => {
  const identity = personalIdentity.value
  if (!identity?.key) return ''
  const cooldown = personalIdentityCooldownText.value
  return cooldown ? `${identity.actionLabel || identity.label} ${cooldown}` : `${identity.actionLabel || identity.label}可用`
})

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

const activeTribeRitual = computed(() => {
  tribeRitualTick.value
  const ritual = currentTribe.value?.ritual
  if (!ritual?.activeUntil) return null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(ritual.activeUntil).getTime() - Date.now()) / 1000))
  if (remainingSeconds <= 0) return null
  return { ...ritual, remainingSeconds }
})

const tribeRitualText = computed(() => {
  const ritual = activeTribeRitual.value
  if (!ritual) return '未点燃：建成营火后可选择丰收篝火或部落宴会，短时间提升全员采集。'
  const renownText = ritual.renownBonus ? `，已鼓舞声望 +${ritual.renownBonus}` : ''
  return `${ritual.title || '丰收篝火'}持续中：采集额外 +${ritual.gatherBonus || 0}${renownText}，剩余 ${formatCountdown(ritual.remainingSeconds)}`
})

const tribeRitualCostText = computed(() => {
  const config = currentTribe.value?.ritualConfig || {}
  const feast = currentTribe.value?.feastConfig || {}
  const durationBonus = config.durationBonusMinutes ? `（铭文 +${config.durationBonusMinutes}）` : ''
  const gatherBonus = config.extraGatherBonus ? `，采集 +${config.gatherBonus || 0}（铭文 +${config.extraGatherBonus}）` : `，采集 +${config.gatherBonus || 0}`
  const feastText = `；宴会食物${feast.food || 0}，持续 ${feast.durationMinutes || 0} 分钟，采集 +${feast.gatherBonus || 0}，声望 +${feast.renownBonus || 0}`
  return `篝火消耗木${config.wood || 0} / 石${config.stone || 0}，持续 ${config.durationMinutes || 0} 分钟${durationBonus}${gatherBonus}${feastText}`
})

const activeCelebrationBuff = computed(() => {
  tribeRitualTick.value
  const buff = currentTribe.value?.celebrationBuff
  if (!buff?.activeUntil) return null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(buff.activeUntil).getTime() - Date.now()) / 1000))
  if (remainingSeconds <= 0) return null
  return { ...buff, remainingSeconds }
})
const celebrationBuffText = computed(() => {
  const buff = activeCelebrationBuff.value
  if (!buff) return ''
  const parts = []
  if (buff.gatherBonus) parts.push(`采集 +${buff.gatherBonus}`)
  if (buff.discoveryBonus) parts.push(`发现 +${buff.discoveryBonus}`)
  if (buff.tradeRenownBonus) parts.push(`交易声望 +${buff.tradeRenownBonus}`)
  const effects = parts.length ? `（${parts.join('，')}）` : ''
  return `${buff.title}${effects} · 剩余 ${formatCountdown(buff.remainingSeconds)}`
})
const celebrationGatherBonus = computed(() => activeCelebrationBuff.value?.gatherBonus || 0)
const celebrationDiscoveryHint = computed(() => activeCelebrationBuff.value?.discoveryBonus
  ? `祭祀余韵：完成后发现进度额外 +${activeCelebrationBuff.value.discoveryBonus}`
  : '')
const celebrationTradeHint = computed(() => activeCelebrationBuff.value?.tradeRenownBonus
  ? `集市余韵：完成贸易时双方声望额外 +${activeCelebrationBuff.value.tradeRenownBonus}`
  : '')
const activeOathKey = computed(() => currentTribe.value?.oath?.key || '')
const oathGatherBonus = computed(() => (activeOathKey.value === 'hearth' ? 1 : 0))
const oathOptions = computed(() => optionMapToList(currentTribe.value?.oathOptions))
const oathText = computed(() => {
  const oath = currentTribe.value?.oath
  return oath ? `${oath.label || '部落誓约'}：${oath.summary || '长期方向已经确定'}` : '尚未立下长期誓约'
})
const oathTaskText = computed(() => {
  const task = currentTribe.value?.oathTask
  if (!task) return ''
  const reward = task.reward || {}
  const parts = []
  if (task.sourceLabel) parts.push(task.sourceLabel)
  if (reward.food) parts.push(`食物 +${reward.food}`)
  if (reward.renown) parts.push(`声望 +${reward.renown}`)
  if (reward.discoveryProgress) parts.push(`发现 +${reward.discoveryProgress}`)
  if (reward.tradeReputation) parts.push(`信誉 +${reward.tradeReputation}`)
  if (reward.beastExperience) parts.push(`幼兽熟练 +${reward.beastExperience}`)
  return `${task.completed ? '已完成' : '待完成'}：${task.title || '誓约任务'}${parts.length ? ` · ${parts.join(' / ')}` : ''}`
})
const flagPatrolChainText = computed(() => {
  const chain = currentTribe.value?.flagPatrolChain
  if (!chain) return ''
  const count = chain.regions?.length || 0
  return `旗帜巡查连锁 ${count} / ${chain.target || 2} 个地形`
})
const tribeGatherBonus = computed(() => (activeTribeRitual.value?.gatherBonus || 0) + celebrationGatherBonus.value + oathGatherBonus.value)
const boundaryClass = (relation) => relation?.state ? `boundary-${relation.state}` : ''
const boundaryActionOptions = computed(() => optionMapToList(currentTribe.value?.boundaryActions))
const boundaryTemperatureActionOptions = computed(() => optionMapToList(currentTribe.value?.boundaryTemperatureActions))
const allianceSignalActions = computed(() => optionMapToList(currentTribe.value?.allianceSignalActions))
const commonJudgeActions = computed(() => optionMapToList(currentTribe.value?.commonJudgeActions))
const disputeWitnessActionOptions = computed(() => optionMapToList(currentTribe.value?.disputeWitnessActions))
const oldGrudgeAnchorOptions = computed(() => optionMapToList(currentTribe.value?.oldGrudgeAnchors))
const oldGrudgeSealActionOptions = computed(() => optionMapToList(currentTribe.value?.oldGrudgeSealActions))
const shadowTaskActionOptions = computed(() => optionMapToList(currentTribe.value?.shadowTaskActions))
const diplomacyCouncilActionOptions = computed(() => optionMapToList(currentTribe.value?.diplomacyCouncilActions))
const apprenticeExchangeActionOptions = computed(() => optionMapToList(currentTribe.value?.apprenticeExchangeActions))
const guestStayTargets = computed(() => currentTribe.value?.guestStayTargets || noTribeGuestStayTargets.value || [])
const guestStayActionOptions = computed(() => optionMapToList(currentTribe.value?.guestStayActions || noTribeGuestStayActions.value))
const campDebtActionOptions = computed(() => optionMapToList(currentTribe.value?.campDebtActions))
const ashCountActionOptions = computed(() => optionMapToList(currentTribe.value?.ashCountActions))
const personalTokenOptions = computed(() => optionMapToList(currentTribe.value?.personalTokenOptions))
const renownPledgeOptions = computed(() => optionMapToList(currentTribe.value?.renownPledgeOptions))
const personalDarkOathOptions = computed(() => optionMapToList(currentTribe.value?.personalDarkOathOptions))
const emergencyChoiceActionOptions = computed(() => optionMapToList(currentTribe.value?.emergencyChoiceActions))
const mutualAidActionOptions = computed(() => optionMapToList(currentTribe.value?.mutualAidActions))
const allianceSignalActionOptions = computed(() => optionMapToList(currentTribe.value?.allianceSignalActions))
const disasterCoopActionOptions = computed(() => optionMapToList(currentTribe.value?.disasterCoopActions))
const caravanActionOptions = computed(() => optionMapToList(currentTribe.value?.caravanActions))
const nomadVisitorActionOptions = computed(() => optionMapToList(currentTribe.value?.nomadVisitorActions))
const nomadVisitorAftereffectActionOptions = computed(() => optionMapToList(currentTribe.value?.nomadVisitorAftereffectActions))
const farReplyActionOptions = computed(() => optionMapToList(currentTribe.value?.farReplyActions))
const travelerSongActionOptions = computed(() => optionMapToList(currentTribe.value?.travelerSongActions))
const travelerTuneLineageActionOptions = computed(() => optionMapToList(currentTribe.value?.travelerTuneLineageActions))
const collectionActionOptions = computed(() => optionMapToList(currentTribe.value?.collectionActions))
const caveRaceActionOptions = computed(() => optionMapToList(currentTribe.value?.caveRaceActions))
const caveReturnActionOptions = computed(() => optionMapToList(currentTribe.value?.caveReturnActions))
const oralMapActionOptions = computed(() => optionMapToList(currentTribe.value?.oralMapActions))
const tribeCustomOptions = computed(() => optionMapToList(currentTribe.value?.tribeCustomOptions))
const activeBoundaryFlag = computed(() => {
  const entity = interactionTarget.value?.entity
  if (!entity || entity.type !== 'tribe_flag' || !isCurrentTribeEntity(entity) || !entity.boundaryRelation) return null
  return entity
})
const activeBoundaryProgressText = computed(() => {
  const relation = activeBoundaryFlag.value?.boundaryRelation
  if (!relation) return ''
  const score = Number(relation.relationScore || 0)
  const trust = Number(relation.tradeTrust || 0)
  const parts = [`关系 ${score > 0 ? '+' : ''}${score}`]
  if (trust > 0) parts.push(`贸易信任 +${trust}`)
  return `${relation.label || '边界关系'} · ${parts.join(' / ')}`
})

const tribeTargetProgressPercent = computed(() => {
  const target = currentTribe.value?.target
  const total = target?.progressTotal || ((target?.wood || 0) + (target?.stone || 0)) || 1
  const progress = target?.progress ?? ((target?.currentWood || 0) + (target?.currentStone || 0))
  return Math.min(100, Math.round((progress / total) * 100))
})

const caveExpeditionReady = computed(() => {
  const target = currentTribe.value?.target
  return Boolean(currentTribe.value && target?.isFinal && target?.completed)
})

const caveRuneFindsBonus = computed(() => Number(currentTribe.value?.runeEffects?.caveFindsBonus || 0))
const hasTribeWorkbench = computed(() => {
  const buildings = currentTribe.value?.camp?.buildings || []
  return buildings.some((building) => building?.type === 'tribe_workbench')
})
const hasTribeRoad = computed(() => {
  const buildings = currentTribe.value?.camp?.buildings || []
  return buildings.some((building) => building?.type === 'tribe_road')
})
const beastSpecialtyOptions = computed(() => optionMapToList(currentTribe.value?.beastGrowth?.specialtyOptions))
const activeBeastTask = computed(() => {
  resourceTideTick.value
  const task = currentTribe.value?.activeBeastTask
  if (!task?.activeUntil) return null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(task.activeUntil).getTime() - Date.now()) / 1000))
  if (remainingSeconds <= 0) return null
  return { ...task, remainingSeconds }
})
const activeBeastTaskText = computed(() => {
  const task = activeBeastTask.value
  if (!task) return ''
  return `${task.memberName || '成员'}刚派出幼兽执行${task.taskLabel || '任务'}，剩余 ${formatCountdown(task.remainingSeconds)}`
})
const celebrationChoiceOptions = computed(() => {
  if (!currentTribe.value?.seasonChain?.pendingCelebration) return []
  return optionMapToList(currentTribe.value?.seasonChain?.celebrationChoices)
})
const seasonTabooOptions = computed(() => optionMapToList(currentTribe.value?.seasonTabooOptions))
const standingRitualOptions = computed(() => optionMapToList(currentTribe.value?.standingRitualOptions))
const standingRitualStances = computed(() => optionMapToList(currentTribe.value?.standingRitualStances))
const communalCookOptions = computed(() => optionMapToList(currentTribe.value?.communalCookOptions))
const communalCookIngredients = computed(() => optionMapToList(currentTribe.value?.communalCookIngredients))
const drumRhythmOptions = computed(() => optionMapToList(currentTribe.value?.drumRhythmOptions))
const drumRhythmBeats = computed(() => optionMapToList(currentTribe.value?.drumRhythmBeats))
const groupEmoteOptions = computed(() => optionMapToList(currentTribe.value?.groupEmoteActions))
const campShiftOptions = computed(() => optionMapToList(currentTribe.value?.campShiftOptions))
const campCouncilActionOptions = computed(() => optionMapToList(currentTribe.value?.campCouncilActions))
const wonderActionOptions = computed(() => optionMapToList(currentTribe.value?.wonderActions))
const consensusFireActionOptions = computed(() => optionMapToList(currentTribe.value?.consensusFireActions))
const lostTechSourceOptions = computed(() => optionMapToList(currentTribe.value?.lostTechSources))
const lostTechOptions = computed(() => optionMapToList(currentTribe.value?.lostTechOptions))
const craftLegacyStyleOptions = computed(() => optionMapToList(currentTribe.value?.craftLegacyStyles))
const sacredFireDestinationOptions = computed(() => optionMapToList(currentTribe.value?.sacredFireDestinations))
const sacredFireStepOptions = computed(() => optionMapToList(currentTribe.value?.sacredFireSteps))
const mentorshipFocusOptions = computed(() => optionMapToList(currentTribe.value?.mentorshipFocusOptions))
const nightOutingOptions = computed(() => optionMapToList(currentTribe.value?.nightOutingOptions))
const dreamOmenSources = computed(() => currentTribe.value?.dreamOmenSources || [])
const dreamOmenActions = computed(() => optionMapToList(currentTribe.value?.dreamOmenActions))
const ancestorQuestionOptions = computed(() => optionMapToList(currentTribe.value?.ancestorQuestionOptions))
const ancestorQuestionAnswers = computed(() => optionMapToList(currentTribe.value?.ancestorQuestionAnswers))
const oldCampEchoActionOptions = computed(() => optionMapToList(currentTribe.value?.oldCampEchoActions))
const borderTheaterActionOptions = computed(() => optionMapToList(currentTribe.value?.borderTheaterActions))
const fogTrailActionOptions = computed(() => optionMapToList(currentTribe.value?.fogTrailActions))
const forbiddenEdgeActionOptions = computed(() => optionMapToList(currentTribe.value?.forbiddenEdgeActions))
const forbiddenEdgeRouteProofActionOptions = computed(() => optionMapToList(currentTribe.value?.forbiddenEdgeRouteProofActions))
const trailMarkerTypes = computed(() => optionMapToList(currentTribe.value?.trailMarkerTypes))
const trailMarkerActions = computed(() => optionMapToList(currentTribe.value?.trailMarkerActions))
const neutralSanctuaryActions = computed(() => optionMapToList(currentTribe.value?.neutralSanctuaryActions))
const campTrialOptions = computed(() => optionMapToList(currentTribe.value?.campTrialOptions))
const standingRitualLandmarkBonuses = computed(() => {
  return currentTribe.value?.standingRitual?.landmarkBonuses || currentTribe.value?.standingRitualConfig?.landmarkBonuses || {}
})
const migrationPlanOptions = computed(() => optionMapToList(currentTribe.value?.migrationPlanOptions))
const activeMigrationPlan = computed(() => {
  resourceTideTick.value
  const plan = currentTribe.value?.migrationPlan
  if (!plan?.activeUntil) return plan || null
  const remainingSeconds = Math.max(0, Math.ceil((new Date(plan.activeUntil).getTime() - Date.now()) / 1000))
  if (remainingSeconds <= 0) return null
  return { ...plan, remainingSeconds }
})
const selectedCavePlan = computed(() => {
  return caveExpeditionPlans.find((plan) => plan.key === caveExpeditionPlanKey.value) || caveExpeditionPlans[1]
})

const caveExpeditionStatusText = computed(() => {
  const runeText = caveRuneFindsBonus.value ? ` 稀有铭文额外收获 +${caveRuneFindsBonus.value}。` : ''
  const plan = selectedCavePlan.value
  if (!currentTribe.value) return '未加入部落：这是一次个人试探，收益较少且没有部落记录。'
  if (caveExpeditionReady.value && caveFoodSupported.value) return `部落远征已就绪：${plan.label}路线将消耗食物 ${plan.foodCost}，${plan.summary}。${runeText}`
  if (caveExpeditionReady.value) return `部落远征缺少食物：${plan.label}路线需要 ${plan.foodCost}，仍可出发但最终收益会下降。${runeText}`
  return '远征筹备中：继续通过仓库和石器台推进部落目标，洞穴会逐渐成为正式行动。'
})

const activeCaveNode = computed(() => caveRoute.value[activeCaveNodeIndex.value] || null)

const caveRouteComplete = computed(() => {
  return caveRoute.value.length > 0 && caveRoute.value.every((node) => node.status === 'completed')
})

const caveRouteProgressPercent = computed(() => {
  if (!caveRoute.value.length) return 0
  const completed = caveRoute.value.filter((node) => node.status === 'completed').length
  return Math.round((completed / caveRoute.value.length) * 100)
})

const tribeRoadmapItems = computed(() => {
  const hasTribe = Boolean(currentTribe.value)
  const target = currentTribe.value?.target
  const storage = currentTribe.value?.storage || {}
  const hasSupplies = (storage.wood || 0) + (storage.stone || 0) > 0

  return [
    {
      key: 'camp',
      title: '固定营地与出生点',
      description: hasTribe ? '已完成，图腾、建筑和出生点都绑定到部落营地。' : '创建或加入部落后解锁固定营地。',
      status: hasTribe ? 'done' : 'next'
    },
    {
      key: 'storage',
      title: '公共仓库与贡献',
      description: hasSupplies ? '已推进，部落已经开始累积公共补给。' : '下一步就是把资源稳定送进公共仓库。',
      status: hasSupplies ? 'doing' : 'next'
    },
    {
      key: 'governance',
      title: '职位与选举',
      description: '当前已经有首领、长老和基础投票，后面可以继续强化治理。',
      status: hasTribe ? 'doing' : 'next'
    },
    {
      key: 'expansion',
      title: '大地图与山洞远征',
      description: caveExpeditionReady.value ? '洞穴远征已就绪，下一步可以做团队副本化和洞内资源链。' : '地图已拆出森林、山地、海岸、遗迹等区域，洞穴远征正在筹备。',
      status: target?.isFinal ? 'doing' : 'next'
    }
  ]
})

const sortedTribeMembers = computed(() => {
  const members = currentTribe.value?.members || []
  return [...members].sort((a, b) => (b.contribution || 0) - (a.contribution || 0))
})

const canStartVote = computed(() => ['leader', 'elder'].includes(tribeRole.value))
const canReviewApplications = computed(() => ['leader', 'elder'].includes(tribeRole.value))
const tribeApplications = computed(() => currentTribe.value?.applications || [])

const voteRules = computed(() => currentTribe.value?.voteRules || {
  leaderMinMembers: 5,
  elderMinMembers: 3,
  leaderMinContribution: 50,
  elderMinContribution: 20,
  leaderCooldownHours: 72,
  elderCooldownHours: 24
})

const voteRuleHint = computed(() => {
  const rules = voteRules.value
  return `首领选举：${rules.leaderMinMembers} 人 / ${rules.leaderMinContribution} 贡献 / ${rules.leaderCooldownHours} 小时冷却；长老：${rules.elderMinMembers} 人 / ${rules.elderMinContribution} 贡献。`
})

const canNominate = (member, role) => {
  if (!currentTribe.value || !member) return false
  const rules = voteRules.value
  const memberCount = currentTribe.value.memberCount || currentTribe.value.members?.length || 0
  const minMembers = role === 'leader' ? rules.leaderMinMembers : rules.elderMinMembers
  const minContribution = role === 'leader' ? rules.leaderMinContribution : rules.elderMinContribution
  return memberCount >= minMembers && (member.contribution || 0) >= minContribution
}

const canNominateSelfLeader = computed(() => {
  const self = sortedTribeMembers.value.find((member) => member.id === playerId.value)
  return canNominate(self, 'leader')
})

const canGovernMember = (member) => {
  if (!member || member.id === playerId.value) return false
  if (tribeRole.value === 'leader') return ['elder', 'member'].includes(member.role)
  if (tribeRole.value === 'elder') return member.role === 'member'
  return false
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

  // 水面区域：地形低于海平面，则失去地面支撑，直接掉到海底
  if (terrainY < seaLevel) return oceanFloorY

  // 陆地区域：站在地形上
  return terrainY + PLAYER_STAND_HEIGHT
}

// 初始化游戏
const initGame = async () => {
  try {
    // 创建场景
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0xaed8f2) // 天空蓝
    scene.fog = new THREE.Fog(0xaed8f2, 80, 360)
    world = new WorldEntityManager({ scene, loadDistance, unloadDistance })
    weatherSystem = createWeatherSystem(scene)

    // 创建相机
    camera = new THREE.PerspectiveCamera(
      75,
      canvasWrapper.value.clientWidth / canvasWrapper.value.clientHeight,
      0.1,
      1000
    )
    // 调整相机初始位置：从后方（-Z）看向前方（+Z），这样W键往前走就很自然
    camera.position.set(0, 10, 20)

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(canvasWrapper.value.clientWidth, canvasWrapper.value.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.08
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    canvasWrapper.value.appendChild(renderer.domElement)

    // 添加控制器
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.maxPolarAngle = Math.PI / 2 - 0.1 // 防止相机穿过地面
    controls.minDistance = 5
    controls.maxDistance = 50
    controls.target.copy(cameraFollowTarget)
    hasCameraFollowTarget = true

    // 配置鼠标按钮：右键旋转，滚轮缩放，禁用左键平移
    controls.mouseButtons = {
      LEFT: null,  // 禁用左键
      MIDDLE: THREE.MOUSE.DOLLY,  // 中键缩放
      RIGHT: THREE.MOUSE.ROTATE   // 右键旋转
    }

    // 禁用右键菜单
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault())

    // 定义全局复用变量，避免在循环中重复创建（优化性能）
    const tempCameraPosition = new THREE.Vector3()
    const tempTargetPosition = new THREE.Vector3()
    // 添加光源
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

    // 创建地形
    createTerrain()

    // 创建本地玩家
    createLocalPlayer()

    // 初始化 WebSocket 连接
    initWebSocket()

    // 监听键盘事件
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize)

    // 启动渲染循环
    animate()

    console.log('3D 游戏初始化成功')
  } catch (error) {
    console.error('游戏初始化失败:', error)
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
    guard: { behavior: 'guard', patrolRadius: 1.3, workLabel: '执行守营' },
    hunt: { behavior: 'patrol', patrolRadius: 2.4, workLabel: '执行助猎' },
    haul: { behavior: 'carry', patrolRadius: 1.8, workLabel: '执行驮运' }
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

// 创建地形
const createTerrain = () => {
  // 创建地面网格 - 降低分段数以提升性能
  const gridSize = 220
  const segments = 72
  const geometry = new THREE.PlaneGeometry(gridSize, gridSize, segments, segments)

  // 添加随机高度（简单的地形）
  const vertices = geometry.attributes.position.array
  const colors = []
  const lowColor = new THREE.Color(0x5f8f52)
  const grassColor = new THREE.Color(0x2f7f3f)
  const highColor = new THREE.Color(0x9aa071)
  for (let i = 0; i < vertices.length; i += 3) {
    const x = vertices[i]
    const z = vertices[i + 1]
    // 使用简单的噪声函数生成高度
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

  // 创建材质
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

  // 添加网格辅助线 - 降低分段数
  const gridHelper = new THREE.GridHelper(gridSize, 22, 0x315a42, 0x315a42)
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.08
  gridHelper.position.y = 0.035
  scene.add(gridHelper)
}

// 根据玩家位置动态加载/卸载装饰物（AOI 懒加载）
const updateDecorations = () => {
  if (!localPlayer) return
  world?.updateDecorations(localPlayer.position)
  loadedObjectsCount.value = world?.getLoadedCount() ?? 0
}

const buildTribeInteraction = (entity) => {
  if (!entity) return null

  const ownTribe = isCurrentTribeEntity(entity)
  const tribeName = entity.label?.replace(/(图腾|仓库|石器台|棚屋|营地|出生点)$/u, '') || '这个部落'
  const target = currentTribe.value?.target

  if (entity.type === 'tribe_totem') {
    const oathText = entity.oathLabel ? `，图腾旁保留着${entity.oathLabel}的标记` : ''
    return {
      entity,
      label: entity.label || '部落图腾',
      actionText: '查看',
      rewardText: ownTribe
        ? `这里是你们部落的议事核心${oathText}，靠近即可打开部落面板`
        : `${tribeName}的图腾立在这里${oathText}，说明附近已经有稳定营地`
    }
  }

  if (entity.type === 'tribe_storage') {
    return {
      entity,
      label: entity.label || '部落仓库',
      actionText: ownTribe ? '上交' : '查看',
      rewardText: ownTribe
        ? '把木材和石块送入公共仓库，推动营地建设'
        : `${tribeName}的公共仓库就在这里，外人只能远观`
    }
  }

  if (entity.type === 'tribe_workbench') {
    const targetText = target ? `当前目标：${target.title}` : '这里会逐步承担建造和部落目标规划'
    return {
      entity,
      label: entity.label || '石器台',
      actionText: ownTribe ? (target?.completed && canManageTribeTargets.value ? '推进' : '规划') : '观察',
      rewardText: ownTribe ? targetText : `${tribeName}正在这里加工工具和安排建造`
    }
  }

  if (entity.type === 'tribe_hut') {
    return {
      entity,
      label: entity.label || '棚屋',
      actionText: ownTribe ? '歇脚' : '查看',
      rewardText: ownTribe
        ? '棚屋让营地更像家，后面很适合接睡眠和休整玩法'
        : `${tribeName}已经在这里住下来了`
    }
  }

  if (entity.type === 'tribe_fence') {
    return {
      entity,
      label: entity.label || '营地围栏',
      actionText: ownTribe ? '巡看' : '观察',
      rewardText: ownTribe
        ? '围栏把营地边界圈出来，后续可以接守边、驱离和防护收益'
        : `${tribeName}已经在这里立起围栏，营地范围更加清楚`
    }
  }

  if (entity.type === 'tribe_road') {
    return {
      entity,
      label: entity.label || '营地道路',
      actionText: ownTribe ? '巡看' : '观察',
      rewardText: ownTribe
        ? '道路把营地和外部路线接起来，后续可以接巡查、运输和贸易收益'
        : `${tribeName}已经把通路整理出来，往来路线更加明显`
    }
  }

  if (entity.type === 'tribe_spawn') {
    return {
      entity,
      label: entity.label || '出生点',
      actionText: ownTribe ? '确认' : '查看',
      rewardText: ownTribe
        ? '这是你们部落的固定集结点，新成员加入后会从这里出发'
        : `${tribeName}的人会从这个位置进入营地`
    }
  }

  if (entity.type === 'tribe_camp') {
    const oathText = entity.oathLabel ? `，营地按${entity.oathLabel}布置了标记` : ''
    return {
      entity,
      label: entity.label || '营地',
      actionText: ownTribe ? '整队' : '查看',
      rewardText: ownTribe
        ? `营地核心已经固定下来${oathText}，图腾、仓库和石器台围绕这里展开`
        : `${tribeName}已经把这里经营成了自己的核心营地${oathText}`
    }
  }

  if (entity.type === 'tribe_flag') {
    const oathText = entity.oathLabel ? `，旗面带着${entity.oathLabel}的纹样` : ''
    const patrolText = entity.lastPatrolledBy ? `；上次由${entity.lastPatrolledBy}巡查` : ''
    const relation = entity.boundaryRelation
    const relationText = relation?.label ? `；${relation.label}：距${relation.otherTribeName || '其他部落'}约${relation.distance || '?'}m` : ''
    return {
      entity,
      label: entity.label || '领地旗帜',
      actionText: ownTribe ? '巡查' : '观察',
      rewardText: ownTribe
        ? `这面旗帜宣告了你们部落的资源活动区${oathText}${patrolText}${relationText}`
        : `${tribeName}已经在这里插旗${oathText}${relationText}，靠近时最好留意对方的资源宣告`
    }
  }

  if (entity.type === 'tribe_beast_marker') {
    const specialty = entity.specialty && entity.specialty !== 'young'
      ? `，专长是${beastSpecialtyLabel(entity.specialty)}`
      : ''
    const workText = entity.workLabel ? `，正在${entity.workLabel}` : ''
    return {
      entity,
      label: entity.label || '驯养幼兽',
      actionText: ownTribe ? '安抚' : '观察',
      rewardText: ownTribe
        ? `幼兽在营地附近活动${specialty}${workText}`
        : `${tribeName}的驯养幼兽守在附近${workText}`
    }
  }

  if (entity.type === 'scouted_resource_site') {
    const contestText = entity.contested ? `；正在与${entity.contestedByTribeName || '其他部落'}争夺` : ''
    const sharedText = entity.jointWatchId ? `；与${entity.sharedWithTribeName || '邻近部落'}共享` : ''
    return {
      entity,
      label: entity.label || '侦察资源点',
      actionText: ownTribe ? '确认' : '观察',
      rewardText: ownTribe
        ? `${entity.regionLabel || '附近区域'}的临时线索，可转化为部落仓库、食物或发现进度${contestText}${sharedText}`
        : `${tribeName}的侦察队留下了资源线索${contestText}${sharedText}`
    }
  }

  if (entity.type === 'controlled_resource_site') {
    const patrolText = entity.lastPatrolledBy ? `；上次由${entity.lastPatrolledBy}巡守` : ''
    const relayText = entity.lastRelayedBy ? `；上次由${entity.lastRelayedBy}运输` : (ownTribe && hasTribeRoad.value ? '；可组织道路运输' : '')
    const tradeText = entity.contestResolvedAs === 'trade_path' ? '；交换通路会带来协作信誉' : ''
    return {
      entity,
      label: entity.label || '控制资源点',
      actionText: ownTribe ? '收取' : '观察',
      rewardText: ownTribe
        ? `${entity.regionLabel || '附近区域'}的短时控制点，Lv.${entity.level || 1}，可周期带回资源${patrolText}${relayText}${tradeText}`
        : `${tribeName}已经控制了这处资源点`
    }
  }

  if (entity.type === 'trade_route_site') {
    const collectedText = entity.lastCollectedBy ? `；上次由${entity.lastCollectedBy}整理` : ''
    const marketText = entity.isBorderMarket ? `；边市开放中：${entity.marketRewardLabel || '互市加成'}` : `；整理${entity.collectCount || 0}/${entity.marketCollectTarget || 3}可升成边市`
    return {
      entity,
      label: entity.label || '交换通路贸易点',
      actionText: ownTribe ? '收取' : '观察',
      rewardText: ownTribe
        ? `与${entity.partnerTribeName || '邻近部落'}共享的短时贸易点，可周期带回信誉和小额资源${marketText}${collectedText}`
        : `${tribeName}正在维护这条交换通路`
    }
  }

  if (entity.type === 'nomad_caravan') {
    return {
      entity,
      label: entity.label || '游牧商队',
      actionText: ownTribe ? '接待' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '边市热度引来中立商队'}；可在部落面板选择护送、招待或争取停靠`
        : `${tribeName}正在接待一支游牧商队`
    }
  }

  if (entity.type === 'nomad_visitor') {
    return {
      entity,
      label: entity.label || '神秘旅人',
      actionText: ownTribe ? '接待' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '地图边缘来了带着口信的旅人'}；可在部落面板选择交换、听预言、调解或学习手艺`
        : `${tribeName}正在接待边缘来访者`
    }
  }

  if (entity.type === 'alliance_signal') {
    return {
      entity,
      label: entity.label || '联盟旗语',
      actionText: ownTribe ? '查看' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '友好边界上升起了短时旗语'}；${entity.influenceLabel || '后续信使、互助或边境戏台可引用'}`
        : `${tribeName}正在传递联盟旗语`
    }
  }

  if (entity.type === 'dispute_witness_stone') {
    return {
      entity,
      label: entity.label || '争端见证石',
      actionText: ownTribe ? '见证' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '争端结果沉成了可公开维护的见证石'}；进度 ${entity.progress || 0}/${entity.target || 1}`
        : `${tribeName}正在维护争端见证石`
    }
  }

  if (entity.type === 'world_event_remnant') {
    const sourceText = entity.sourceActionLabel ? `；来自${entity.sourceActionLabel}` : ''
    return {
      entity,
      label: entity.label || '事件余迹',
      actionText: ownTribe ? '整理' : '观察',
      rewardText: ownTribe
        ? `${entity.regionLabel || '附近区域'}留下的短时痕迹，可收取${entity.rewardLabel || '小收益'}${sourceText}`
        : `${tribeName}处理世界事件后留下的短时痕迹`
    }
  }

  if (entity.type === 'map_memory_trace') {
    return {
      entity,
      label: entity.label || '活地图记忆',
      actionText: ownTribe ? '重访' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '这里留下了可被后来者重新读取的痕迹'}；可获得${entity.rewardLabel || '小收益'}`
        : `${tribeName}在这里留下了活地图记忆`
    }
  }

  if (entity.type === 'rare_cave_race') {
    return {
      entity,
      label: entity.label || '短时稀有洞穴',
      actionText: ownTribe ? '抢首探' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '短时岔洞正在开启'}；可在部落面板抢首探`
        : `${tribeName}发现了稀有洞穴线索`
    }
  }

  if (entity.type === 'cave_rescue_clue') {
    return {
      entity,
      label: entity.label || '洞穴营救线索',
      actionText: ownTribe ? '营救' : '观察',
      rewardText: ownTribe
        ? `${entity.missingMemberName || '队友'}留下线索，营救 ${entity.progress || 0}/${entity.target || 1}`
        : `${tribeName}正在处理洞穴营救线索`
    }
  }

  if (entity.type === 'forbidden_edge') {
    return {
      entity,
      label: entity.label || '禁地边缘',
      actionText: ownTribe ? '试探' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '高风险边缘短时显露'}；可在部落面板选择火把、路标或同伴试探`
        : `${tribeName}正在试探一片禁地边缘`
    }
  }

  if (entity.type === 'fog_trail') {
    return {
      entity,
      label: entity.label || '雾区探路',
      actionText: ownTribe ? '探路' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '雾中路线短时显露'}；已探路 ${entity.participantCount || 0} 人，可在部落面板选择探线方式`
        : `${tribeName}正在试探雾中路线`
    }
  }

  if (entity.type === 'cave_return_mark') {
    return {
      entity,
      label: entity.label || '洞穴归路标记',
      actionText: ownTribe ? '整理' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '洞口留下可整理的归路'}；进度 ${entity.progress || 0}/${entity.target || 1}`
        : `${tribeName}留下了洞穴归路标记`
    }
  }

  if (entity.type === 'trial_ground') {
    return {
      entity,
      label: entity.label || '营地试炼场',
      actionText: ownTribe ? '试炼' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '非致命试炼点正在开放'}；已完成 ${entity.participantCount || 0} 人，可在部落面板选择试炼`
        : `${tribeName}在这里摆出了试炼场`
    }
  }

  if (entity.type === 'diplomacy_council_site') {
    const names = Array.isArray(entity.participantTribeNames) ? entity.participantTribeNames.join('、') : ''
    return {
      entity,
      label: entity.label || '大议会与边市节',
      actionText: ownTribe ? '主持' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '多条互市与停争信号聚到中立火圈'}${names ? `；相关部落：${names}` : ''}`
        : `${tribeName}正在筹备公开外交会场`
    }
  }

  if (entity.type === 'celebration_echo') {
    return {
      entity,
      label: entity.label || '庆功余韵',
      actionText: ownTribe ? '加入' : '观察',
      rewardText: ownTribe
        ? `${entity.summary || '营地留下了短时庆功队列'}；地点：${entity.anchorLabel || '营地地标'}；奖励：${entity.rewardLabel || '声望或发现'}`
        : `${tribeName}的营地正在庆功`
    }
  }

  if (entity.type === 'named_landmark') {
    return {
      entity,
      label: entity.label || '有名之地',
      actionText: '查看',
      rewardText: ownTribe
        ? `${entity.summary || '这个名字已经写进部落地图'}；来源：${entity.sourceLabel || '部落命名'}`
        : `${tribeName}把这里写成了有名之地`
    }
  }

  if (entity.type === 'standing_ritual_site') {
    return {
      entity,
      label: entity.label || '站位仪式',
      actionText: ownTribe ? '站位' : '观察',
      rewardText: ownTribe
        ? `本部落仪式圈已展开，当前 ${entity.participantCount || 0} 人站位`
        : `${tribeName}正在举行站位仪式`
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
      name: data.name || `玩家${nearest.id.slice(0, 6)}`,
      conflictFatigue: data.conflict_fatigue || 0,
      conflictFatigueUntil: data.conflict_fatigue_until || '',
      personalRenown: data.personal_renown || 0
    },
    label: data.name || `玩家${nearest.id.slice(0, 6)}`,
    actionText: '挑战',
    rewardText: `个人冲突：威慑、挑战或守势；疲劳 ${data.conflict_fatigue || 0}，个人声望 ${data.personal_renown || 0}`,
    hintText: '第一版只造成疲劳、击退和关系变化'
  }
}

const getNearestResource = () => {
  if (!localPlayer || !world) return null
  const objective = activeSeasonObjective.value
  if (objective && isInsideSeasonObjective.value) {
    return {
      entity: { ...objective, type: 'season_objective' },
      label: objective.title || '季节目标',
      actionText: '完成',
      rewardText: objective.summary || '完成短时季节目标，为部落带回奖励',
      hintText: celebrationDiscoveryHint.value
    }
  }
  const event = activeWorldEvent.value
  if (event) {
    const dx = playerX.value - (event.x || 0)
    const dz = playerZ.value - (event.z || 0)
    if (dx * dx + dz * dz <= Math.pow((event.radius || 16) * 0.55, 2)) {
      const reward = worldEventRewardText(event) || event.summary || '把这个动态事件记录进部落进度'
      return {
        entity: { ...event, type: 'world_event' },
        label: event.title || '世界事件',
        actionText: '处理',
        rewardText: event.rare ? `稀有事件：${reward}` : reward
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
      label: cave.label || '山洞',
      actionText: caveExpeditionReady.value ? '远征' : '进入',
      rewardText: caveExpeditionReady.value
        ? '部落补给已经达标，可以开始正式洞穴远征'
        : '洞里可能有矿石、水晶和古老线索，部落目标完成后会变成正式远征'
    }
  }

  const totem = world.findNearestEntityByTypes(localPlayer.position, ['tribe_totem'], interactionDistance + 1)
  if (totem) {
    const honorText = isCurrentTribeEntity(totem) ? tribeRuneHonorText() : '靠近后可观察这个部落的图腾荣誉'
    return {
      entity: totem,
      label: totem.label || '部落图腾',
      actionText: '查看',
      rewardText: currentTribe.value ? honorText : '创建或加入部落后，可以在这里集结'
    }
  }

  const entity = world.findNearestInteractable(localPlayer.position, interactionDistance)
  if (!entity) return null

  const reward = resourceRewards[entity.type]
  if (!reward) return null

  return {
    entity,
    label: reward.label,
    actionText: '采集',
    rewardText: `获得 ${reward.amount} ${reward.itemName} +${reward.experience} 经验`,
    hintText: celebrationGatherBonus.value ? `宴饮余韵：本次采集额外 +${celebrationGatherBonus.value}` : ''
  }
}

const updateInteractionTarget = () => {
  interactionTarget.value = getNearestResource()
}

const openTotemDetail = (entity) => {
  const isOwn = isCurrentTribeEntity(entity)
  const summary = entity?.runeSummary || (isOwn ? currentTribe.value?.publicRuneSummary : null)
  activeTotemDetail.value = {
    label: entity?.label || '部落图腾',
    summaryText: summary?.text || (isOwn ? tribeRuneHonorText() : '这个部落尚未公开铭文详情'),
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
  showToast(message || `稀有铭文觉醒：${rune.title || '未知铭文'}`, { rare: true })
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
    showToast(`升级到 Lv.${playerLevel.value}！`)
  }
}

const advanceQuest = (amount = 1) => {
  const quest = activeQuest.value
  if (quest.completed) return

  quest.progress = Math.min(quest.target, quest.progress + amount)
  if (quest.progress >= quest.target) {
    quest.completed = true
    quest.title = '补给准备完成'
    quest.description = '你已经收集到第一批探索物资，继续向山脚和海岸寻找更多资源。'
    addExperience(60)
    showToast('任务完成：获得 60 经验')
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
      showToast(`已完成${target.entity.title || '季节目标'}`)
    }
    return
  }

  if (target.entity.type === 'world_event') {
    const eventAction = selectedWorldEventActionKey.value
    if (sendGameMessage({ type: 'tribe_resolve_world_event', eventId: target.entity.id, eventAction })) {
      const action = activeWorldEventActionOptions.value.find((item) => item.key === eventAction)?.label || ''
      showToast(`已${action || '处理'}${target.entity.title || '世界事件'}`, { rare: Boolean(target.entity.rare) })
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
    showToast(isCurrentTribeEntity(target.entity) ? tribeRuneHonorText() : '这是别的部落留下的核心图腾，后续会展示其铭文荣誉')
    return
  }

  if (target.entity.type === 'tribe_storage') {
    showTribePanel.value = true
    if (isCurrentTribeEntity(target.entity)) {
      contributeAllResources()
    } else {
      showToast('这座仓库属于别的部落，只能先观察')
    }
    return
  }

  if (target.entity.type === 'tribe_workbench') {
    showTribePanel.value = true
    if (currentTribe.value?.target?.completed && canManageTribeTargets.value && !currentTribe.value.target.isFinal) {
      advanceTribeTarget()
    } else {
      showToast(currentTribe.value?.target?.title ? `当前建造目标：${currentTribe.value.target.title}` : '石器台暂时还没有新的建造目标')
    }
    return
  }

  if (target.entity.type === 'tribe_hut') {
    showToast(isCurrentTribeEntity(target.entity) ? '棚屋是营地生活区，后面很适合接睡眠和休整玩法' : '这里能看出这个部落已经长期驻扎')
    return
  }

  if (target.entity.type === 'tribe_spawn') {
    showToast(isCurrentTribeEntity(target.entity) ? '这里是你们部落的固定出生点' : '这是其他部落成员的集结入口')
    return
  }

  if (target.entity.type === 'tribe_camp') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '你回到了本部落营地核心' : '你进入了别的部落营地区域')
    return
  }

  if (target.entity.type === 'tribe_flag') {
    if (isCurrentTribeEntity(target.entity)) {
      patrolTribeFlag(target.entity)
    } else {
      showToast('这是其他部落的领地宣告')
    }
    return
  }

  if (target.entity.type === 'tribe_beast_marker') {
    const workText = target.entity.workLabel ? `，正在${target.entity.workLabel}` : ''
    showToast(isCurrentTribeEntity(target.entity) ? `幼兽蹭了蹭你的手${workText}` : `这是其他部落驯养的幼兽${workText}`)
    return
  }

  if (target.entity.type === 'scouted_resource_site') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('这是其他部落的侦察线索，暂时只能观察')
      return
    }
    if (sendGameMessage({ type: 'tribe_secure_scout_site', siteId: target.entity.id })) {
      triggerPlayerActionAnimation('gather')
      showToast(`已确认${target.entity.label || '侦察资源点'}`)
    }
    return
  }

  if (target.entity.type === 'controlled_resource_site') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('这是其他部落控制的资源点')
      return
    }
    if (sendGameMessage({ type: 'tribe_collect_controlled_site', siteId: target.entity.id })) {
      triggerPlayerActionAnimation('gather')
      showToast(`已收取${target.entity.label || '控制资源点'}`)
    }
    return
  }

  if (target.entity.type === 'trade_route_site') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('这是其他部落维护的交换通路')
      return
    }
    if (sendGameMessage({ type: 'tribe_collect_trade_route_site', siteId: target.entity.id })) {
      triggerPlayerActionAnimation(target.entity.isBorderMarket ? 'cheer' : 'gather')
      showToast(`已整理${target.entity.label || '交换通路贸易点'}`)
    }
    return
  }

  if (target.entity.type === 'nomad_caravan') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '游牧商队停在边市旁，可在部落面板选择接待方式' : '这是其他部落正在接待的游牧商队')
    return
  }

  if (target.entity.type === 'nomad_visitor') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('cheer')
    showToast(isCurrentTribeEntity(target.entity) ? '边缘来访者正在等候接待，可在部落面板选择方式' : '这是其他部落正在接待的来访者')
    return
  }

  if (target.entity.type === 'mutual_aid_alert') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '火烟互助警报已经升起，可在部落面板响应' : '这是其他部落发出的火烟互助警报')
    return
  }

  if (target.entity.type === 'alliance_signal') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('cheer')
    showToast(isCurrentTribeEntity(target.entity) ? '联盟旗语正在传递，部落面板已打开' : '这是其他部落的联盟旗语')
    return
  }

  if (target.entity.type === 'traveler_song') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('cheer')
    showToast(isCurrentTribeEntity(target.entity) ? '旅人谣曲正在流传，可在部落面板处理' : '这是其他部落附近流传的旅人谣曲')
    return
  }

  if (target.entity.type === 'border_theater') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('cheer')
    showToast(isCurrentTribeEntity(target.entity) ? '边境戏台已经搭起，可在部落面板登台' : '这是其他部落的边境戏台')
    return
  }

  if (target.entity.type === 'dispute_witness_stone') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '争端见证石就在附近，可在部落面板维护见证' : '这是其他部落的争端见证石')
    return
  }

  if (target.entity.type === 'world_event_remnant') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('这是其他部落处理事件留下的余迹')
      return
    }
    if (sendGameMessage({ type: 'tribe_collect_world_event_remnant', remnantId: target.entity.id })) {
      triggerPlayerActionAnimation('gather')
      showToast(`已整理${target.entity.label || '事件余迹'}`)
    }
    return
  }

  if (target.entity.type === 'map_memory_trace') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('这是其他部落留下的活地图记忆')
      return
    }
    if (sendGameMessage({ type: 'tribe_revisit_map_memory', memoryId: target.entity.id })) {
      triggerPlayerActionAnimation('ritual')
      showToast(`正在重访${target.entity.label || '活地图记忆'}`)
    }
    return
  }

  if (target.entity.type === 'world_riddle_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '世界谜语正在附近显现，可在部落面板提交预测' : '这是其他部落正在解读的世界谜语')
    return
  }

  if (target.entity.type === 'old_camp_echo') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('gather')
    showToast(isCurrentTribeEntity(target.entity) ? '旧营回声还在，可在部落面板回访旧痕' : '这是其他部落的旧营回声')
    return
  }

  if (target.entity.type === 'rare_cave_race') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '稀有洞穴短时开启，可在部落面板抢首探' : '这是其他部落的稀有洞穴线索')
    return
  }

  if (target.entity.type === 'cave_rescue_clue') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '洞穴营救线索已标出，可在部落面板循线营救' : '这是其他部落的洞穴营救线索')
    return
  }

  if (target.entity.type === 'forbidden_edge') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '禁地边缘就在附近，可在部落面板选择试探方式' : '这是其他部落的禁地边缘')
    return
  }

  if (target.entity.type === 'fog_trail') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '雾区路线就在附近，可在部落面板选择探路方式' : '这是其他部落的雾区探路')
    return
  }

  if (target.entity.type === 'cave_return_mark') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('gather')
    showToast(isCurrentTribeEntity(target.entity) ? '洞穴归路标记可整理，部落面板已打开' : '这是其他部落的洞穴归路')
    return
  }

  if (target.entity.type === 'trial_ground') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '试炼场就在附近，可在部落面板选择一项完成' : '这是其他部落的试炼场')
    return
  }

  if (target.entity.type === 'disaster_coop_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('guard')
    showToast(isCurrentTribeEntity(target.entity) ? '大灾协作点就在附近，可在部落面板选择救援方式' : '这是其他部落的大灾协作点')
    return
  }

  if (target.entity.type === 'diplomacy_council_site') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '大议会会场已展开，可在部落面板选择议题' : '这是其他部落正在筹备的公开外交会场')
    return
  }

  if (target.entity.type === 'celebration_echo') {
    if (!isCurrentTribeEntity(target.entity)) {
      showToast('这是其他部落的庆功余韵')
      return
    }
    if (sendGameMessage({ type: 'tribe_join_celebration_echo', echoId: target.entity.id })) {
      triggerPlayerActionAnimation('cheer')
      showToast(`已加入${target.entity.label || '庆功余韵'}`)
    }
    return
  }

  if (target.entity.type === 'sacred_fire_relay' || target.entity.type === 'sacred_fire_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '圣火接力正在燃着，可在部落面板继续护火' : '这是其他部落的圣火接力')
    return
  }

  if (target.entity.type === 'neutral_sanctuary') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '中立圣地就在这里，可在部落面板选择朝圣方式' : '这是其他部落发现的中立圣地')
    return
  }

  if (target.entity.type === 'collection_wall') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '收藏墙已经立起，可在部落面板整理旧物' : '这是其他部落的收藏墙')
    return
  }

  if (target.entity.type === 'shared_puzzle' || target.entity.type === 'shared_puzzle_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '共享谜图正在等待拼合，可在部落面板记录碎片' : '这是其他部落的共享谜图')
    return
  }

  if (target.entity.type === 'trail_marker') {
    showTribePanel.value = true
    showToast(isCurrentTribeEntity(target.entity) ? '活路标可在部落面板改写、加固或拆除' : '这是其他部落留下的活路标')
    return
  }

  if (target.entity.type === 'named_landmark') {
    showToast(`${target.entity.label || '有名之地'}：${target.entity.summary || target.entity.sourceLabel || '部落地图已经记住这个名字'}`)
    return
  }

  if (target.entity.type === 'standing_ritual_site') {
    showTribePanel.value = true
    triggerPlayerActionAnimation('ritual')
    showToast(isCurrentTribeEntity(target.entity) ? '站位仪式圈已展开，可在部落面板选择站位' : '这是其他部落的站位仪式')
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
  const bonusNotes = [celebrationBonus ? '庆典余韵' : '', oathGatherBonus.value ? '守火誓约' : '', toolBonus ? '石器加成' : ''].filter(Boolean)
  showToast(`采集 ${reward.label}：+${totalAmount} ${reward.itemName}${bonusNotes.length ? `（${bonusNotes.join('，')}）` : ''}`)
  updateInteractionTarget()
  loadedObjectsCount.value = world?.getLoadedCount() ?? 0
  totalObjectsCount.value = decorations.length
}

const sendGameMessage = (payload) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload))
    return true
  }
  addSystemMessage('未连接到游戏服务器')
  return false
}

const resolvePersonalConflict = (targetId, actionKey = 'challenge') => {
  if (!targetId) return
  if (sendGameMessage({ type: 'personal_conflict', targetId, actionKey })) {
    const labels = { intimidate: '威慑', challenge: '挑战', spar: '切磋', guard: '守势', inspire: '鼓舞' }
    const actionAnimations = { guard: 'guard', inspire: 'cheer', spar: 'conflict', intimidate: 'guard', challenge: 'conflict' }
    triggerPlayerActionAnimation(actionAnimations[actionKey] || 'conflict')
    showToast(`已发起${labels[actionKey] || '个人冲突'}`)
  }
}

const choosePersonalIdentity = (identityKey) => {
  const option = personalIdentityOptions.value.find((item) => item.key === identityKey)
  if (option && !option.available) {
    showToast(`个人声望至少需要 ${option.minRenown || 0}`)
    return
  }
  if (sendGameMessage({ type: 'personal_identity_choose', identityKey })) {
    showToast(`正在选择身份：${option?.label || '身份'}`)
  }
}

const performPersonalIdentityAction = () => {
  const identity = personalIdentity.value
  if (!identity?.key) {
    showToast('先选择一个身份')
    return
  }
  if (personalIdentityCooldownText.value) {
    showToast('身份动作还在冷却')
    return
  }
  if (sendGameMessage({ type: 'personal_identity_action' })) {
    const actionByIdentity = {
      fire_dancer: 'cheer',
      pathfinder: 'guard',
      stone_mason: 'gather',
      storyteller: 'ritual'
    }
    triggerPlayerActionAnimation(actionByIdentity[identity.key] || 'ritual')
    showToast(`正在执行${identity.actionLabel || identity.label || '身份动作'}`)
  }
}

const revisitMapMemory = (memoryId) => {
  if (!memoryId) return
  if (sendGameMessage({ type: 'tribe_revisit_map_memory', memoryId })) {
    triggerPlayerActionAnimation('ritual')
    showToast('正在重访活地图记忆')
  }
}

const revisitOldCampEcho = (echoId, actionKey) => {
  if (!echoId || !actionKey) return
  const action = oldCampEchoActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_revisit_old_camp_echo', echoId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'bring_relic' ? 'gather' : 'ritual')
    showToast(`正在${action?.label || '回归旧营'}`)
  }
}

const performBorderTheater = (theaterId, actionKey) => {
  if (!theaterId || !actionKey) return
  const action = borderTheaterActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_perform_border_theater', theaterId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'contest' ? 'guard' : (actionKey === 'gift' ? 'gather' : 'ritual'))
    showToast(`边境戏台行动：${action?.label || '登台'}`)
  }
}

const exploreFogTrail = (trailId, actionKey) => {
  if (!trailId || !actionKey) return
  const action = fogTrailActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_explore_fog_trail', trailId, actionKey })) {
    triggerPlayerActionAnimation(action?.animation || (actionKey === 'raise_fire' ? 'guard' : 'ritual'))
    showToast(`雾区探路：${action?.label || '探路'}`)
  }
}

const exploreForbiddenEdge = (edgeId, actionKey) => {
  if (!edgeId || !actionKey) return
  const action = forbiddenEdgeActionOptions.value.find((item) => item.key === actionKey)
  if (action?.available === false) {
    showToast(action.reason || '暂时不能这样试探')
    return
  }
  if (sendGameMessage({ type: 'tribe_explore_forbidden_edge', edgeId, actionKey })) {
    triggerPlayerActionAnimation(action?.animation || (actionKey === 'linger' ? 'gather' : 'guard'))
    showToast(`正在${action?.label || '试探禁地边缘'}`)
  }
}

const markForbiddenEdgeRouteProof = (proofId, actionKey) => {
  if (!proofId || !actionKey) return
  const action = forbiddenEdgeRouteProofActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_mark_forbidden_edge_route_proof', proofId, actionKey })) {
    triggerPlayerActionAnimation(action?.animation || 'ritual')
    showToast(`正在${action?.label || '刻写禁地路证'}`)
  }
}

const claimCaveRace = (raceId) => {
  if (!raceId) return
  if (sendGameMessage({ type: 'tribe_claim_cave_race', raceId })) {
    triggerPlayerActionAnimation('guard')
    showToast('正在抢探短时稀有洞穴')
  }
}

const advanceCaveRescue = (raceId, methodKey = 'echo_locate') => {
  if (!raceId) return
  const race = (currentTribe.value?.caveRaces || []).find((item) => item.id === raceId)
  const method = (race?.rescueMethods || []).find((item) => item.key === methodKey)
  if (sendGameMessage({ type: 'tribe_advance_cave_rescue', raceId, methodKey })) {
    triggerPlayerActionAnimation(method?.animation || 'guard')
    showToast(`正在${method?.label || '循线营救'}洞穴队友`)
  }
}

const organizeCaveReturnMark = (markId, actionKey = 'tie_echo_rope') => {
  if (!markId) return
  const action = caveReturnActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_organize_cave_return_mark', markId, actionKey })) {
    triggerPlayerActionAnimation(action?.animation || 'gather')
    showToast(`正在${action?.label || '整理归路'}洞穴归路`)
  }
}

const createTrailMarker = (markerKey) => {
  if (!currentTribe.value) {
    showToast('请先加入部落')
    return
  }
  if (!localPlayer) {
    showToast('还没有当前位置')
    return
  }
  const marker = trailMarkerTypes.value.find((item) => item.key === markerKey)
  if (sendGameMessage({
    type: 'tribe_create_trail_marker',
    markerKey,
    x: localPlayer.position.x,
    z: localPlayer.position.z
  })) {
    triggerPlayerActionAnimation(markerKey === 'stone_cairn' ? 'gather' : 'ritual')
    showToast(`已留下${marker?.label || '活路标'}`)
  }
}

const updateTrailMarker = (markerId, actionKey) => {
  if (!markerId || !actionKey) return
  const action = trailMarkerActions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_update_trail_marker', markerId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'break' ? 'gather' : 'ritual')
    showToast(`路标${action?.label || '改写'}已提交`)
  }
}

const proposeNamedLandmark = () => {
  if (!currentTribe.value) {
    showToast('请先加入部落')
    return
  }
  if (!localPlayer) {
    showToast('还没有当前位置')
    return
  }
  const name = namedLandmarkDraft.value.name.trim()
  if (!name) {
    showToast('先写下一个地名')
    return
  }
  const source = namedLandmarkOptions.value.find((item) => item.key === namedLandmarkDraft.value.sourceKey)
  if (!source?.available) {
    showToast('部落还没有这种可命名的故事来源')
    return
  }
  if (sendGameMessage({
    type: 'tribe_propose_named_landmark',
    sourceKey: source.key,
    name,
    x: localPlayer.position.x,
    z: localPlayer.position.z
  })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已提议地名：${name}`)
    namedLandmarkDraft.value.name = ''
  }
}

const supportNamedLandmark = (proposalId) => {
  if (!proposalId) return
  if (sendGameMessage({ type: 'tribe_support_named_landmark', proposalId })) {
    triggerPlayerActionAnimation('cheer')
    showToast('已支持这条地名')
  }
}

const visitNeutralSanctuary = (sanctuaryId, actionKey) => {
  if (!sanctuaryId || !actionKey) return
  const action = neutralSanctuaryActions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_visit_neutral_sanctuary', sanctuaryId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'quiet_guard' ? 'guard' : 'ritual')
    showToast(`中立圣地：${action?.label || '朝圣'}已提交`)
  }
}

const curateCollectionWall = (candidateId, actionKey) => {
  if (!candidateId || !actionKey) return
  const action = collectionActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_curate_collection_wall', candidateId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'rubbing' ? 'gather' : 'ritual')
    showToast(`收藏墙已整理：${action?.label || '收藏'}`)
  }
}

const createEchoItem = (itemKey) => {
  const item = echoItemTypeOptions.value.find((option) => option.key === itemKey)
  if (sendGameMessage({ type: 'tribe_create_echo_item', itemKey })) {
    triggerPlayerActionAnimation(itemKey === 'stone_axe' ? 'gather' : 'ritual')
    showToast(`回声物品成形：${item?.label || '旧物'}`)
  }
}

const addEchoItemMemory = (itemId, experienceKey) => {
  const experience = echoItemExperienceOptions.value.find((option) => option.key === experienceKey)
  if (sendGameMessage({ type: 'tribe_add_echo_item_memory', itemId, experienceKey })) {
    triggerPlayerActionAnimation(experienceKey === 'border' ? 'guard' : experienceKey === 'gather' ? 'gather' : 'ritual')
    showToast(`已记录：${experience?.label || '物品经历'}`)
  }
}

const transferEchoItem = (itemId, targetId) => {
  if (!itemId || !targetId) return
  const target = sortedTribeMembers.value.find((member) => member.id === targetId)
  if (sendGameMessage({ type: 'tribe_transfer_echo_item', itemId, targetId })) {
    triggerPlayerActionAnimation('cheer')
    showToast(`已转交给 ${target?.name || '成员'}`)
  }
}

const supportMythClaim = (claimId, interpretationKey) => {
  if (!claimId || !interpretationKey) return
  const claim = currentTribe.value?.mythClaims?.find((item) => item.id === claimId)
  const interpretation = claim?.interpretations?.find((item) => item.key === interpretationKey)
  if (sendGameMessage({ type: 'tribe_support_myth_claim', claimId, interpretationKey })) {
    showToast(`已支持神话解释：${interpretation?.label || '新的说法'}`)
  }
}

const supportHistoryFact = (claimId, versionKey) => {
  if (!claimId || !versionKey) return
  const claim = currentTribe.value?.historyFactClaims?.find((item) => item.id === claimId)
  const version = claim?.versions?.find((item) => item.key === versionKey)
  if (sendGameMessage({ type: 'tribe_support_history_fact', claimId, versionKey })) {
    showToast(`${claim?.canMediate ? '已调停背书' : '已提交叙述'}：${version?.label || '历史版本'}`)
  }
}

const standingParticipantText = (participants = []) => {
  const items = Array.isArray(participants) ? participants : []
  return items
    .map((item) => {
      const bonus = item.locationBonus
        ? `@${item.locationBonus.landmarkLabel || item.locationBonus.label || '地标'}`
        : ''
      return `${item.name || '成员'}-${item.stanceLabel || '见证者'}${bonus}`
    })
    .join('、')
}

const standingRitualRewardText = (reward = {}) => {
  const parts = []
  if (reward.wood) parts.push(`木材+${reward.wood}`)
  if (reward.stone) parts.push(`石材+${reward.stone}`)
  if (reward.food) parts.push(`食物+${reward.food}`)
  if (reward.renown) parts.push(`声望+${reward.renown}`)
  if (reward.tradeReputation) parts.push(`信誉+${reward.tradeReputation}`)
  if (reward.discoveryProgress) parts.push(`发现+${reward.discoveryProgress}`)
  return parts.join('、')
}

const standingRitualLandmarkHint = (ritualKey) => {
  const bonus = standingRitualLandmarkBonuses.value?.[ritualKey]
  if (!bonus) return ''
  const radius = currentTribe.value?.standingRitualConfig?.landmarkRadius || currentTribe.value?.standingRitual?.landmarkRadius || 18
  const reward = standingRitualRewardText(bonus.reward)
  return `${bonus.label || '地标站位'}：${reward || bonus.summary || '额外加成'}（${radius}m 内）`
}

const standingRitualLandmarkBonusText = (ritual) => {
  const key = ritual?.key
  if (key && standingRitualLandmarkHint(key)) return standingRitualLandmarkHint(key)
  const hints = Object.keys(standingRitualLandmarkBonuses.value || {})
    .map((bonusKey) => standingRitualLandmarkHint(bonusKey))
    .filter(Boolean)
  return hints.slice(0, 2).join('；')
}

const startSkirmish = (outcomeId) => {
  if (!outcomeId) return
  if (sendGameMessage({ type: 'tribe_start_skirmish', outcomeId })) {
    showToast('小规模集结已发起')
  }
}

const joinSkirmish = (conflictId) => {
  if (!conflictId) return
  if (sendGameMessage({ type: 'tribe_join_skirmish', conflictId })) {
    showToast('已报名参战')
  }
}

const resolveSkirmish = (conflictId) => {
  if (!conflictId) return
  if (sendGameMessage({ type: 'tribe_resolve_skirmish', conflictId })) {
    showToast('正在结算小规模冲突')
  }
}

const declareWar = (otherTribeId) => {
  if (!otherTribeId) return
  if (sendGameMessage({ type: 'tribe_declare_war', otherTribeId })) {
    showToast('已发起正式宣战')
  }
}

const joinWar = (warId) => {
  if (!warId) return
  if (sendGameMessage({ type: 'tribe_join_war', warId })) {
    showToast('已加入正式部落战争')
  }
}

const resolveWar = (warId) => {
  if (!warId) return
  if (sendGameMessage({ type: 'tribe_resolve_war', warId })) {
    showToast('正在结算正式部落战争')
  }
}

const requestWarTruce = (warId) => {
  if (!warId) return
  if (sendGameMessage({ type: 'tribe_request_war_truce', warId })) {
    showToast('已提出正式停战谈判')
  }
}

const completeWarRepair = (repairId) => {
  if (!repairId) return
  if (sendGameMessage({ type: 'tribe_complete_war_repair', repairId })) {
    showToast('正在修复战后边境')
  }
}

const completeWarRevival = (revivalId) => {
  if (!revivalId) return
  if (sendGameMessage({ type: 'tribe_complete_war_revival', revivalId })) {
    showToast('正在组织战败复兴')
  }
}

const supportWar = (warId, sideTribeId) => {
  if (!warId || !sideTribeId) return
  if (sendGameMessage({ type: 'tribe_support_war', warId, sideTribeId })) {
    showToast('已发起战争援助')
  }
}

const mediateWar = (warId) => {
  if (!warId) return
  if (sendGameMessage({ type: 'tribe_mediate_war', warId })) {
    showToast('已发起战争调停')
  }
}

const resolveWarDiplomacy = (diplomacyId, action) => {
  if (!diplomacyId || !action) return
  if (sendGameMessage({ type: 'tribe_resolve_war_diplomacy', diplomacyId, action })) {
    showToast(action === 'honor' ? '已履行停战约定' : '已记录停战追责')
  }
}

const resolveDiplomacyCouncil = (councilId, actionKey) => {
  if (!councilId || !actionKey) return
  const action = diplomacyCouncilActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_diplomacy_council', councilId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'block_market' ? 'guard' : 'ritual')
    showToast(`大议会议题已提交：${action?.label || '公开议题'}`)
  }
}

const resolveCaravanRoute = (routeId, actionKey) => {
  if (!routeId || !actionKey) return
  const action = caravanActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_caravan_route', routeId, actionKey })) {
    showToast(`商队行动已提交：${action?.label || '接待商队'}`)
  }
}

const resolveNomadVisitor = (visitorId, actionKey) => {
  if (!visitorId || !actionKey) return
  const action = nomadVisitorActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_nomad_visitor', visitorId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'mediate' ? 'ritual' : (actionKey === 'learn_craft' ? 'gather' : 'cheer'))
    showToast(`来访者接待已提交：${action?.label || '接待'}`)
  }
}

const resolveNomadVisitorAftereffect = (effectId, actionKey) => {
  if (!effectId || !actionKey) return
  const action = nomadVisitorAftereffectActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_nomad_visitor_aftereffect', effectId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'guest_lodge' ? 'sit' : 'ritual')
    showToast(`来访余音已处理：${action?.label || '后续'}`)
  }
}

const startApprenticeExchange = () => {
  if (!apprenticeDraft.value.targetTribeId) {
    showToast('先选择可以互派学徒的友好部落')
    return
  }
  const focus = apprenticeExchangeActionOptions.value.find((item) => item.key === apprenticeDraft.value.focusKey)
  if (sendGameMessage({
    type: 'tribe_start_apprentice_exchange',
    targetTribeId: apprenticeDraft.value.targetTribeId,
    focusKey: apprenticeDraft.value.focusKey
  })) {
    triggerPlayerActionAnimation(apprenticeDraft.value.focusKey === 'building' ? 'gather' : 'ritual')
    showToast(`已安排学徒交换：${focus?.label || '学徒交换'}`)
  }
}

const startGuestStay = () => {
  if (!guestStayDraft.value.targetTribeId) {
    showToast('先选择客居营地')
    return
  }
  const action = guestStayActionOptions.value.find((item) => item.key === guestStayDraft.value.actionKey)
  if (sendGameMessage({
    type: 'tribe_start_guest_stay',
    targetTribeId: guestStayDraft.value.targetTribeId,
    actionKey: guestStayDraft.value.actionKey
  })) {
    triggerPlayerActionAnimation(guestStayDraft.value.actionKey === 'relief_help' ? 'guard' : guestStayDraft.value.actionKey === 'market_help' ? 'cheer' : 'gather')
    showToast(`短期客居已提交：${action?.label || '帮忙'}`)
  }
}

const resolveCampDebt = (debtId, actionKey) => {
  if (!debtId || !actionKey) return
  const action = campDebtActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_camp_debt', debtId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'forgive' ? 'ritual' : actionKey === 'market_note' ? 'cheer' : 'gather')
    showToast(`营地债账已提交：${action?.label || '处理'}`)
  }
}

const resolveAshCount = (ashId, actionKey) => {
  if (!ashId || !actionKey) return
  const action = ashCountActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_ash_count', ashId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'recover_remnants' ? 'gather' : actionKey === 'public_share' ? 'cheer' : 'ritual')
    showToast(`灰烬清点已提交：${action?.label || '清点'}`)
  }
}

const escortCovenantMessenger = (taskId) => {
  if (!taskId) return
  if (sendGameMessage({ type: 'tribe_escort_covenant_messenger', taskId })) {
    showToast('正在护送盟约信物')
  }
}

const sendMutualAidAlert = (source, targetTribeId) => {
  if (!source?.sourceKind || !source?.sourceId || !targetTribeId) return
  if (sendGameMessage({
    type: 'tribe_send_mutual_aid_alert',
    sourceKind: source.sourceKind,
    sourceId: source.sourceId,
    targetTribeId
  })) {
    triggerPlayerActionAnimation('guard')
    const target = (source.targetTribes || []).find((item) => item.id === targetTribeId)
    showToast(`已放出互助火烟：${target?.name || '友好部落'}`)
  }
}

const answerMutualAidAlert = (alertId, actionKey) => {
  if (!alertId || !actionKey) return
  const action = mutualAidActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_answer_mutual_aid_alert', alertId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'night_watch' ? 'guard' : (actionKey === 'send_supplies' ? 'gather' : 'cheer'))
    showToast(`互助响应已提交：${action?.label || '回应火烟'}`)
  }
}

const resolveDisasterCoop = (taskId, actionKey) => {
  if (!taskId || !actionKey) return
  const action = disasterCoopActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_disaster_coop', taskId, actionKey })) {
    triggerPlayerActionAnimation(action?.animation || (actionKey === 'profit' ? 'conflict' : 'guard'))
    showToast(`大灾协作已提交：${action?.label || '协作'}`)
  }
}

const respondFarReply = (replyId, actionKey) => {
  if (!replyId || !actionKey) return
  const action = farReplyActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_respond_far_reply', replyId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'clarify' ? 'ritual' : 'cheer')
    showToast(`远方回信已回应：${action?.label || '回应'}`)
  }
}

const resolveTravelerSong = (songId, actionKey) => {
  if (!songId || !actionKey) return
  const action = travelerSongActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_traveler_song', songId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'quiet' ? 'guard' : 'cheer')
    showToast(`旅人谣曲已处理：${action?.label || '处理'}`)
  }
}

const promoteTravelerSongTune = (recordId) => {
  if (!recordId) return
  if (sendGameMessage({ type: 'tribe_promote_traveler_song_tune', recordId })) {
    triggerPlayerActionAnimation('ritual')
    showToast('正在整理公开曲牌')
  }
}

const referenceTravelerTune = (tuneId, actionKey) => {
  if (!tuneId || !actionKey) return
  const action = travelerTuneLineageActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_reference_traveler_tune', tuneId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'stage' ? 'cheer' : 'ritual')
    showToast(`曲牌已加入传唱谱系：${action?.label || '引用'}`)
  }
}

const createPersonalToken = () => {
  if (!personalTokenDraft.value.tokenKey) {
    showToast('先选择一种信物')
    return
  }
  const option = personalTokenOptions.value.find((item) => item.key === personalTokenDraft.value.tokenKey)
  if (sendGameMessage({
    type: 'tribe_create_personal_token',
    tokenKey: personalTokenDraft.value.tokenKey,
    targetId: personalTokenDraft.value.targetId || 'tribe'
  })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已交出信物：${option?.label || '个人信物'}`)
  }
}

const redeemPersonalToken = (tokenId) => {
  if (!tokenId) return
  if (sendGameMessage({ type: 'tribe_redeem_personal_token', tokenId })) {
    triggerPlayerActionAnimation('cheer')
    showToast('正在兑现信物')
  }
}

const callPersonalDebt = (tokenId) => {
  if (!tokenId) return
  if (sendGameMessage({ type: 'tribe_call_personal_debt', tokenId })) {
    showToast('已追记为人情债')
  }
}

const settlePersonalDebt = (taskId) => {
  if (!taskId) return
  if (sendGameMessage({ type: 'tribe_settle_personal_debt', taskId })) {
    triggerPlayerActionAnimation('gather')
    showToast('正在补偿人情债')
  }
}

const startRenownPledge = () => {
  if (!renownPledgeDraft.value.pledgeKey) {
    showToast('先选择一种声望押注')
    return
  }
  const option = renownPledgeOptions.value.find((item) => item.key === renownPledgeDraft.value.pledgeKey)
  if (sendGameMessage({ type: 'tribe_start_renown_pledge', pledgeKey: renownPledgeDraft.value.pledgeKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已押下注目光：${option?.label || '声望押注'}`)
  }
}

const fulfillRenownPledge = (pledgeId) => {
  if (!pledgeId) return
  if (sendGameMessage({ type: 'tribe_fulfill_renown_pledge', pledgeId })) {
    triggerPlayerActionAnimation('cheer')
    showToast('正在兑现声望押注')
  }
}

const startPersonalDarkOath = () => {
  const oathKey = personalDarkOathDraft.value.oathKey
  const option = personalDarkOathOptions.value.find((item) => item.key === oathKey)
  if (sendGameMessage({ type: 'personal_dark_oath_start', oathKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已立下暗誓：${option?.label || '个人暗誓'}`)
  }
}

const revealPersonalDarkOath = () => {
  if (sendGameMessage({ type: 'personal_dark_oath_reveal' })) {
    triggerPlayerActionAnimation('cheer')
    showToast('正在揭示个人暗誓')
  }
}

const completeDarkOathRemedy = (remedyId) => {
  if (!remedyId) return
  if (sendGameMessage({ type: 'tribe_complete_dark_oath_remedy', remedyId })) {
    triggerPlayerActionAnimation('ritual')
    showToast('正在补上暗誓')
  }
}

const completeWarAftermath = (aftermathId) => {
  if (!aftermathId) return
  if (sendGameMessage({ type: 'tribe_complete_war_aftermath', aftermathId })) {
    showToast('正在处理战后余波')
  }
}

const completeWarAllyTask = (taskId, action = 'honor') => {
  if (!taskId) return
  if (sendGameMessage({ type: 'tribe_complete_war_ally_task', taskId, action })) {
    showToast('正在处理战盟后续')
  }
}

const createTribe = () => {
  const name = newTribeName.value.trim()
  if (!name) {
    showToast('先给部落起一个名字')
    return
  }
  sendGameMessage({ type: 'tribe_create', name })
}

const joinTribe = (tribeId) => {
  if (pendingTribeJoinRequests.value.has(tribeId)) {
    showToast('加入申请已经提交，等待首领或长老审核')
    return
  }
  if (sendGameMessage({ type: 'tribe_join', tribeId, message: `${playerName.value} 想加入部落` })) {
    pendingTribeJoinRequests.value.add(tribeId)
    pendingTribeJoinRequests.value = new Set(pendingTribeJoinRequests.value)
    showToast('已提交加入申请，等待审核')
  }
}

const reviewTribeApplication = (applicationId, approved) => {
  if (!canReviewApplications.value) {
    showToast('只有首领或长老可以审核加入申请')
    return
  }
  sendGameMessage({
    type: 'tribe_review_application',
    applicationId,
    approved
  })
}

const contributeAllResources = () => {
  const resources = {
    wood: inventory.value.wood,
    stone: inventory.value.stone
  }
  if (!resources.wood && !resources.stone) {
    showToast('背包里还没有可上交的资源')
    return
  }
  if (sendGameMessage({ type: 'tribe_contribute', resources })) {
    inventory.value.wood = 0
    inventory.value.stone = 0
    showToast('资源已送往部落仓库')
  }
}

const advanceTribeTarget = () => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以推进部落目标')
    return
  }
  sendGameMessage({ type: 'tribe_advance_target' })
}

const setTribeAnnouncement = () => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以更新公告')
    return
  }
  const announcement = tribeAnnouncementDraft.value.trim()
  if (!announcement) {
    showToast('公告不能为空')
    return
  }
  sendGameMessage({ type: 'tribe_set_announcement', announcement })
}

const returnToTribeCamp = () => {
  if (sendGameMessage({ type: 'tribe_return_to_camp' })) {
    showToast('正在返回部落营地出生点')
  }
}

const buildTribeStructure = (buildingKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以发起部落建造')
    return
  }
  sendGameMessage({ type: 'tribe_build_structure', buildingKey })
}

const unlockTribeRune = (runeKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以刻写图腾铭文')
    return
  }
  sendGameMessage({ type: 'tribe_unlock_rune', runeKey })
}

const startTribeRitual = () => {
  sendGameMessage({ type: 'tribe_start_ritual' })
}

const startTribeFeast = () => {
  sendGameMessage({ type: 'tribe_start_feast' })
}

const startCommunalCook = (recipeKey) => {
  const recipe = communalCookOptions.value.find((item) => item.key === recipeKey)
  if (sendGameMessage({ type: 'tribe_start_communal_cook', recipeKey })) {
    triggerPlayerActionAnimation('sit')
    showToast(`共同烹饪已开锅：${recipe?.label || '营地菜谱'}`)
  }
}

const contributeCommunalCook = (ingredientKey) => {
  const ingredient = communalCookIngredients.value.find((item) => item.key === ingredientKey)
  if (sendGameMessage({ type: 'tribe_contribute_communal_cook', ingredientKey })) {
    triggerPlayerActionAnimation(ingredientKey === 'story' ? 'cheer' : 'gather')
    showToast(`已贡献：${ingredient?.label || '补料'}`)
  }
}

const startDrumRhythm = (rhythmKey) => {
  const rhythm = drumRhythmOptions.value.find((item) => item.key === rhythmKey)
  if (sendGameMessage({ type: 'tribe_start_drum_rhythm', rhythmKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已起鼓：${rhythm?.label || '鼓点节奏'}`)
  }
}

const joinDrumRhythm = (beatKey) => {
  const beat = drumRhythmBeats.value.find((item) => item.key === beatKey)
  if (sendGameMessage({ type: 'tribe_join_drum_rhythm', beatKey })) {
    triggerPlayerActionAnimation(beatKey === 'watch' ? 'guard' : beatKey === 'echo' ? 'ritual' : 'cheer')
    showToast(`已应鼓：${beat?.label || '鼓拍'}`)
  }
}

const completeDrumRhythm = () => {
  const rhythm = currentTribe.value?.drumRhythm
  if (sendGameMessage({ type: 'tribe_complete_drum_rhythm' })) {
    triggerPlayerActionAnimation('cheer')
    showToast(`正在收束：${rhythm?.label || '鼓点节奏'}`)
  }
}

const performGroupEmote = (emoteKey) => {
  const emote = groupEmoteOptions.value.find((item) => item.key === emoteKey)
  if (sendGameMessage({ type: 'tribe_group_emote', emoteKey })) {
    triggerPlayerActionAnimation(emote?.animation || 'cheer')
    showToast(`已发起：${emote?.label || '群体动作'}`)
  }
}

const recordLostTechFragment = (sourceKey) => {
  const source = lostTechSourceOptions.value.find((item) => item.key === sourceKey)
  if (sendGameMessage({ type: 'tribe_record_lost_tech', sourceKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已记录技艺碎片：${source?.label || '旧事来源'}`)
  }
}

const restoreLostTech = (techKey) => {
  const tech = lostTechOptions.value.find((item) => item.key === techKey)
  if (sendGameMessage({ type: 'tribe_restore_lost_tech', techKey })) {
    triggerPlayerActionAnimation('cheer')
    showToast(`正在复原：${tech?.label || '失落技艺'}`)
  }
}

const establishCraftLegacy = (candidateId, styleKey) => {
  const style = craftLegacyStyleOptions.value.find((item) => item.key === styleKey)
  if (sendGameMessage({ type: 'tribe_establish_craft_legacy', candidateId, styleKey })) {
    triggerPlayerActionAnimation(styleKey === 'build' ? 'gather' : styleKey === 'cave' ? 'guard' : 'ritual')
    showToast(`正在传名：${style?.label || '营地手艺'}`)
  }
}

const startSacredFireRelay = (destinationKey) => {
  const destination = sacredFireDestinationOptions.value.find((item) => item.key === destinationKey)
  if (sendGameMessage({ type: 'tribe_start_sacred_fire', destinationKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`圣火接力启程：${destination?.label || '目的地'}`)
  }
}

const carrySacredFire = (stepKey) => {
  const step = sacredFireStepOptions.value.find((item) => item.key === stepKey)
  if (sendGameMessage({ type: 'tribe_carry_sacred_fire', stepKey })) {
    triggerPlayerActionAnimation(step?.animation || 'guard')
    showToast(`已护送火种：${step?.label || '护火'}`)
  }
}

const completeSacredFireRelay = () => {
  const relay = currentTribe.value?.sacredFireRelay
  if (sendGameMessage({ type: 'tribe_complete_sacred_fire' })) {
    triggerPlayerActionAnimation('cheer')
    showToast(`正在收束圣火：${relay?.destinationLabel || '目的地'}`)
  }
}

const joinCelebrationEcho = (echoId) => {
  if (!echoId) return
  if (sendGameMessage({ type: 'tribe_join_celebration_echo', echoId })) {
    triggerPlayerActionAnimation('cheer')
    showToast('已加入庆功余韵')
  }
}

const startMentorship = (focusKey) => {
  const focus = mentorshipFocusOptions.value.find((item) => item.key === focusKey)
  if (sendGameMessage({ type: 'tribe_start_mentorship', focusKey })) {
    triggerPlayerActionAnimation(focus?.animation || 'ritual')
    showToast(`传承开课：${focus?.label || '导师课程'}`)
  }
}

const joinMentorship = () => {
  const session = currentTribe.value?.mentorship
  if (sendGameMessage({ type: 'tribe_join_mentorship' })) {
    triggerPlayerActionAnimation('cheer')
    showToast(`已拜师：${session?.focusLabel || '传承课程'}`)
  }
}

const completeMentorship = () => {
  const session = currentTribe.value?.mentorship
  if (sendGameMessage({ type: 'tribe_complete_mentorship' })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`正在结课：${session?.focusLabel || '传承课程'}`)
  }
}

const startCampTrial = (trialKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以开启营地试炼')
    return
  }
  const option = campTrialOptions.value.find((item) => item.key === trialKey)
  if (sendGameMessage({ type: 'tribe_start_camp_trial', trialKey })) {
    triggerPlayerActionAnimation(option?.animation || 'ritual')
    showToast(`营地试炼已开启：${option?.label || '试炼'}`)
  }
}

const joinCampTrial = () => {
  const trial = currentTribe.value?.campTrial
  if (sendGameMessage({ type: 'tribe_join_camp_trial' })) {
    triggerPlayerActionAnimation('cheer')
    showToast(`已报名：${trial?.label || '营地试炼'}`)
  }
}

const completeCampTrial = () => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以收束营地试炼')
    return
  }
  const trial = currentTribe.value?.campTrial
  if (sendGameMessage({ type: 'tribe_complete_camp_trial' })) {
    triggerPlayerActionAnimation('cheer')
    showToast(`正在收束：${trial?.label || '营地试炼'}`)
  }
}

const startNightOuting = (optionKey) => {
  const option = nightOutingOptions.value.find((item) => item.key === optionKey)
  if (option?.available === false) {
    showToast(option.lockedReason || '当前不能夜行')
    return
  }
  if (sendGameMessage({ type: 'tribe_start_night_outing', optionKey })) {
    triggerPlayerActionAnimation(optionKey === 'torch' ? 'guard' : 'ritual')
    showToast(`夜行出发：${option?.label || '夜路'}`)
  }
}

const startDreamOmen = (sourceId) => {
  const source = dreamOmenSources.value.find((item) => item.id === sourceId)
  if (sendGameMessage({ type: 'tribe_start_dream_omen', sourceId })) {
    triggerPlayerActionAnimation('sit')
    showToast(`共梦成形：${source?.label || '梦兆'}`)
  }
}

const resolveDreamOmen = (actionKey) => {
  const action = dreamOmenActions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_dream_omen', actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'quiet' ? 'guard' : actionKey === 'share' ? 'cheer' : 'ritual')
    showToast(`已处理共梦：${action?.label || '解梦'}`)
  }
}

const startAncestorQuestion = (questionKey) => {
  const question = ancestorQuestionOptions.value.find((item) => item.key === questionKey)
  if (question?.available === false) {
    showToast(question.lockedReason || '当前不能开启祖灵问答')
    return
  }
  if (sendGameMessage({ type: 'tribe_start_ancestor_question', questionKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`祖灵问答开启：${question?.label || '图腾夜问'}`)
  }
}

const answerAncestorQuestion = (answerKey) => {
  const answer = ancestorQuestionAnswers.value.find((item) => item.key === answerKey)
  if (sendGameMessage({ type: 'tribe_answer_ancestor_question', answerKey })) {
    triggerPlayerActionAnimation(answerKey === 'guard_stance' ? 'guard' : answerKey === 'offer_wood' ? 'ritual' : 'cheer')
    showToast(`已回答祖灵：${answer?.label || '共同回应'}`)
  }
}

const startCampShift = () => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以开启营地轮值')
    return
  }
  const shiftKey = campShiftDraft.value.shiftKey
  const shift = campShiftOptions.value.find((item) => item.key === shiftKey)
  if (sendGameMessage({ type: 'tribe_start_camp_shift', shiftKey })) {
    triggerPlayerActionAnimation(shiftKey === 'watch' ? 'guard' : shiftKey === 'market' ? 'cheer' : 'gather')
    showToast(`营地轮值已开启：${shift?.label || '轮值'}`)
  }
}

const joinCampShift = () => {
  const shift = currentTribe.value?.campShift
  if (!shift) {
    showToast('当前没有营地轮值')
    return
  }
  if (sendGameMessage({ type: 'tribe_join_camp_shift' })) {
    triggerPlayerActionAnimation(shift.key === 'watch' ? 'guard' : shift.key === 'market' ? 'cheer' : 'gather')
    showToast(`已报名：${shift.label || '营地轮值'}`)
  }
}

const advanceCampCouncil = (actionKey) => {
  const council = currentTribe.value?.campCouncil
  if (!council) {
    showToast('当前没有营地议事圈')
    return
  }
  const action = campCouncilActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_advance_camp_council', actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'mediate' ? 'ritual' : actionKey === 'pledge' ? 'cheer' : 'gather')
    showToast(`议事已记录：${action?.label || '听取'}`)
  }
}

const contributeWonder = (actionKey) => {
  const project = currentTribe.value?.wonderProject
  if (!project) {
    showToast('当前没有未定形奇观')
    return
  }
  const action = wonderActionOptions.value.find((item) => item.key === actionKey)
  if (action?.available === false) {
    showToast(action.lockedReason || '当前不能投入这类来源')
    return
  }
  if (sendGameMessage({ type: 'tribe_contribute_wonder', actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'fire' ? 'ritual' : actionKey === 'mediate' ? 'cheer' : 'gather')
    showToast(`奇观投入已记录：${action?.label || '投入来源'}`)
  }
}

const resolveConsensusFire = (actionKey) => {
  const fire = currentTribe.value?.consensusFire
  if (!fire) {
    showToast('当前没有共识火印')
    return
  }
  const action = consensusFireActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_consensus_fire', actionKey })) {
    triggerPlayerActionAnimation(action?.animation || (actionKey === 'guard' ? 'guard' : 'ritual'))
    showToast(`共识火印已处理：${action?.label || '处理'}`)
  }
}

const startTribeVote = (role, candidateId) => {
  sendGameMessage({
    type: 'tribe_start_vote',
    role,
    candidateId
  })
}

const castTribeVote = (voteId, approve) => {
  sendGameMessage({
    type: 'tribe_vote',
    voteId,
    approve
  })
}

const allocateResourcesToMember = (targetId) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以预分配公共资源')
    return
  }
  const resources = {
    wood: Math.max(0, Number(allocationDraft.value.wood) || 0),
    stone: Math.max(0, Number(allocationDraft.value.stone) || 0)
  }
  if (!resources.wood && !resources.stone) {
    showToast('先填写要预分配的木材或石块数量')
    return
  }
  if (sendGameMessage({ type: 'tribe_allocate_resources', targetId, resources })) {
    showToast('资源预分配请求已提交')
  }
}

const createTribeTrade = () => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以发布贸易')
    return
  }
  const offerAmount = Math.max(0, Number(tradeDraft.value.offerAmount) || 0)
  const requestAmount = Math.max(0, Number(tradeDraft.value.requestAmount) || 0)
  if (!tradeDraft.value.targetTribeId) {
    showToast('先选择目标部落')
    return
  }
  if (!offerAmount || !requestAmount) {
    showToast('贸易数量必须大于 0')
    return
  }
  if (sendGameMessage({
    type: 'tribe_create_trade',
    targetTribeId: tradeDraft.value.targetTribeId,
    offer: {
      resource: tradeDraft.value.offerResource,
      amount: offerAmount
    },
    request: {
      resource: tradeDraft.value.requestResource,
      amount: requestAmount
    }
  })) {
    showToast('贸易请求已发布')
  }
}

const startTribeScout = () => {
  if (!currentTribe.value) {
    showToast('请先加入部落')
    return
  }
  const cost = currentTribe.value.scoutConfig?.foodCost || 0
  if ((currentTribe.value.food || 0) < cost) {
    showToast(`侦察需要食物 ${cost}`)
    return
  }
  if (sendGameMessage({ type: 'tribe_start_scout' })) {
    showToast('侦察队已出发')
  }
}

const craftStoneTool = () => {
  if (!hasTribeWorkbench.value) {
    showToast('需要先建成石器台')
    return
  }
  if (inventory.value.wood < 2 || inventory.value.stone < 4) {
    showToast('打磨石器需要木材 2、矿石 4')
    return
  }
  inventory.value.wood -= 2
  inventory.value.stone -= 4
  stoneTool.value.durability = stoneTool.value.max
  showToast('石器工具已打磨，采集额外 +1')
}

const addOralChainLine = () => {
  if (!currentTribe.value) {
    showToast('请先加入部落')
    return
  }
  const text = oralChainDraft.value.trim()
  if (text.length < 4) {
    showToast('接龙句子至少 4 个字')
    return
  }
  if (sendGameMessage({ type: 'tribe_add_oral_chain_line', text })) {
    oralChainDraft.value = ''
    showToast('接龙已传到营火旁')
  }
}

const completeOralChain = () => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以整理接龙史诗')
    return
  }
  if (!oralChainReady.value) {
    showToast('接龙句数还不够')
    return
  }
  if (sendGameMessage({ type: 'tribe_complete_oral_chain' })) {
    showToast('接龙史诗整理请求已提交')
  }
}

const composeOralEpic = () => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以整理史诗')
    return
  }
  if (sendGameMessage({ type: 'tribe_compose_epic' })) {
    showToast('口述史诗整理请求已提交')
  }
}

const assignBeastTask = (taskKey) => {
  if (!currentTribe.value?.tamedBeasts) {
    showToast('部落还没有驯养幼兽')
    return
  }
  if (sendGameMessage({ type: 'tribe_beast_task', taskKey })) {
    const label = beastTaskOptions.find((task) => task.key === taskKey)?.label || '任务'
    showToast(`幼兽已出发：${label}`)
  }
}

const chooseBeastSpecialty = (specialtyKey) => {
  if (sendGameMessage({ type: 'tribe_choose_beast_specialty', specialtyKey })) {
    showToast(`幼兽专长已选择：${beastSpecialtyLabel(specialtyKey)}`)
  }
}

const chooseSeasonCelebration = (choiceKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以决定庆典形式')
    return
  }
  if (sendGameMessage({ type: 'tribe_choose_celebration', choiceKey })) {
    const label = celebrationChoiceOptions.value.find((choice) => choice.key === choiceKey)?.label || '庆典'
    showToast(`庆典形式已选择：${label}`)
  }
}

const chooseSeasonTaboo = (tabooKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以宣布季节禁忌')
    return
  }
  const option = seasonTabooOptions.value.find((item) => item.key === tabooKey)
  if (sendGameMessage({ type: 'tribe_choose_season_taboo', tabooKey })) {
    showToast(`季节禁忌已宣布：${option?.label || '祭典目标'}`)
  }
}

const observeSeasonTaboo = () => {
  const taboo = currentTribe.value?.seasonTaboo
  if (!taboo) {
    showToast('当前没有季节禁忌')
    return
  }
  if (sendGameMessage({ type: 'tribe_observe_season_taboo' })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已提交：${taboo.observeLabel || '践行禁忌'}`)
  }
}

const breakSeasonTaboo = () => {
  const taboo = currentTribe.value?.seasonTaboo
  if (!taboo) {
    showToast('当前没有可破戒的季节禁忌')
    return
  }
  if (sendGameMessage({ type: 'tribe_break_season_taboo' })) {
    triggerPlayerActionAnimation('conflict')
    showToast(`已公开破戒：${taboo.breakLabel || '破戒'}`)
  }
}

const completeSeasonTabooRemedy = (remedyId) => {
  const remedy = currentTribe.value?.seasonTabooRemedies?.find((item) => item.id === remedyId)
  if (!remedy) {
    showToast('这条季节补救已经结束')
    return
  }
  if (sendGameMessage({ type: 'tribe_complete_season_taboo_remedy', remedyId })) {
    triggerPlayerActionAnimation('gather')
    showToast(`开始补救：${remedy.title || '季节补救'}`)
  }
}

const startStandingRitual = (ritualKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以发起站位仪式')
    return
  }
  const option = standingRitualOptions.value.find((item) => item.key === ritualKey)
  if (sendGameMessage({ type: 'tribe_start_standing_ritual', ritualKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`站位仪式已发起：${option?.label || '站位仪式'}`)
  }
}

const joinStandingRitual = (stanceKey) => {
  const ritual = currentTribe.value?.standingRitual
  if (!ritual) {
    showToast('当前没有可以加入的站位仪式')
    return
  }
  const stance = standingRitualStances.value.find((item) => item.key === stanceKey)
  if (sendGameMessage({ type: 'tribe_join_standing_ritual', stanceKey })) {
    triggerPlayerActionAnimation(stanceAnimationForKey(stanceKey))
    showToast(`已站位：${stance?.label || '见证者'}`)
  }
}

const completeStandingRitual = () => {
  const ritual = currentTribe.value?.standingRitual
  if (!ritual) {
    showToast('当前没有可以收束的站位仪式')
    return
  }
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以收束站位仪式')
    return
  }
  if (sendGameMessage({ type: 'tribe_complete_standing_ritual' })) {
    triggerPlayerActionAnimation('cheer')
    showToast(`正在收束：${ritual.label || '站位仪式'}`)
  }
}

const startMigrationPlan = (planKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以发起迁徙季计划')
    return
  }
  const option = migrationPlanOptions.value.find((item) => item.key === planKey)
  if (sendGameMessage({ type: 'tribe_start_migration_plan', planKey })) {
    showToast(`迁徙计划已发起：${option?.label || '迁徙季计划'}`)
  }
}

const advanceMigrationPlan = () => {
  const plan = activeMigrationPlan.value
  if (!plan) {
    showToast('当前没有可以推进的迁徙季计划')
    return
  }
  if (sendGameMessage({ type: 'tribe_advance_migration_plan' })) {
    showToast(`已推进：${plan.label || '迁徙季计划'}`)
  }
}

const chooseCelestialBranch = (branchKey) => {
  const window = activeTribeCelestialWindow.value
  if (!window) {
    showToast('当前没有可以解读的天象窗口')
    return
  }
  if (window.alreadyRead) {
    showToast('本部落已经解读过这次天象')
    return
  }
  const branch = celestialBranchOptions.value.find((item) => item.key === branchKey)
  if (sendGameMessage({ type: 'tribe_choose_celestial_branch', windowId: window.id, branchKey })) {
    showToast(`天象解读已提交：${branch?.label || '新的传说'}`)
  }
}

const observeWeatherSign = (signKey) => {
  if (!currentTribe.value) {
    showToast('请先加入部落')
    return
  }
  const sign = weatherForecastSignOptions.value.find((item) => item.key === signKey)
  if (sendGameMessage({ type: 'tribe_observe_weather_sign', signKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已观察天气迹象：${sign?.label || '风向预判'}`)
  }
}

const enactTribeLaw = (lawKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以启用部落律令')
    return
  }
  const law = tribeLawOptions.value.find((item) => item.key === lawKey)
  if (sendGameMessage({ type: 'tribe_enact_law', lawKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`部落律令已启用：${law?.label || '法律牌'}`)
  }
}

const upholdTribeLaw = () => {
  const law = currentTribe.value?.tribeLaw
  if (!law) {
    showToast('当前没有生效中的部落律令')
    return
  }
  if (sendGameMessage({ type: 'tribe_uphold_law' })) {
    triggerPlayerActionAnimation('guard')
    showToast(`已提交：${law.upholdLabel || '遵守律令'}`)
  }
}

const breakTribeLaw = () => {
  const law = currentTribe.value?.tribeLaw
  if (!law) {
    showToast('当前没有生效中的部落律令')
    return
  }
  if (sendGameMessage({ type: 'tribe_break_law' })) {
    triggerPlayerActionAnimation('conflict')
    showToast(`已公开违令：${law.breakLabel || '违背律令'}`)
  }
}

const completeLawRemedy = (remedyId) => {
  if (!remedyId) return
  if (sendGameMessage({ type: 'tribe_complete_law_remedy', remedyId })) {
    triggerPlayerActionAnimation('gather')
    showToast('正在补救部落律令')
  }
}

const commitTribeCustomPractice = (customKey) => {
  const option = tribeCustomOptions.value.find((item) => item.key === customKey)
  if (sendGameMessage({ type: 'tribe_commit_custom_practice', customKey })) {
    triggerPlayerActionAnimation(customKey === 'warlike' ? 'guard' : customKey === 'merchant' ? 'cheer' : 'ritual')
    showToast(`正在沉淀风俗：${option?.label || '部落风俗'}`)
  }
}

const recordSharedPuzzleFragment = (sourceKey) => {
  const option = sharedPuzzleOptions.value.find((item) => item.key === sourceKey)
  if (!option?.available) {
    showToast(option?.recorded ? '这类谜图碎片已经记录过' : '部落还没有这种碎片来源')
    return
  }
  if (sendGameMessage({ type: 'tribe_record_shared_puzzle_fragment', sourceKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已记录谜图碎片：${option.label || '图案碎片'}`)
  }
}

const completeSharedPuzzle = () => {
  if (!currentTribe.value?.sharedPuzzle?.ready) {
    showToast('共享谜图碎片还没集齐')
    return
  }
  if (sendGameMessage({ type: 'tribe_complete_shared_puzzle' })) {
    triggerPlayerActionAnimation('cheer')
    showToast('正在拼合共享谜图')
  }
}

const completeReverseVictory = (targetKey) => {
  const target = currentTribe.value?.reverseVictoryTargets?.find((item) => item.key === targetKey)
  if (!target?.available) {
    showToast(target?.lockedReason || '当前还不能完成这个反向胜利')
    return
  }
  if (sendGameMessage({ type: 'tribe_complete_reverse_victory', targetKey })) {
    triggerPlayerActionAnimation(targetKey === 'hold_border' ? 'guard' : targetKey === 'rescue_missing' ? 'gather' : 'ritual')
    showToast(`反向胜利：${target.label || '荣耀'}`)
  }
}

const resolveRumorTruth = (rumorId, actionKey) => {
  if (!rumorId || !actionKey) return
  const action = rumorTruthActions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_rumor_truth', rumorId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'counter' ? 'guard' : 'ritual')
    showToast(`传闻处理已提交：${action?.label || '辨认真伪'}`)
  }
}

const solveWorldRiddle = (riddleId, predictionKey) => {
  const prediction = worldRiddlePredictionOptions.value.find((item) => item.key === predictionKey)
  if (sendGameMessage({ type: 'tribe_solve_world_riddle', riddleId, predictionKey })) {
    triggerPlayerActionAnimation('ritual')
    showToast(`已提交谜语预测：${prediction?.label || '未知指向'}`)
  }
}

const composeOralMap = (sourceId, actionKey) => {
  if (!sourceId || !actionKey) return
  const action = oralMapActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_compose_oral_map', sourceId, actionKey })) {
    triggerPlayerActionAnimation(action?.animation || 'ritual')
    showToast(`口述地图已整理：${action?.label || '归路讲述'}`)
  }
}

const completeTrialGround = (trialId, actionKey) => {
  if (!trialId || !actionKey) return
  const action = trialGroundActions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_complete_trial_ground', trialId, actionKey })) {
    const animation = actionKey === 'gather' ? 'gather' : actionKey === 'escort' || actionKey === 'stance' ? 'guard' : 'ritual'
    triggerPlayerActionAnimation(animation)
    showToast(`试炼已提交：${action?.label || '营地试炼'}`)
  }
}

const chooseTribeOath = (oathKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以选择部落誓约')
    return
  }
  if (sendGameMessage({ type: 'tribe_choose_oath', oathKey })) {
    const label = oathOptions.value.find((oath) => oath.key === oathKey)?.label || '部落誓约'
    showToast(`部落誓约已确定：${label}`)
  }
}

const completeOathTask = () => {
  const task = currentTribe.value?.oathTask
  if (!task) {
    showToast('先立下部落誓约')
    return
  }
  if (task.completed) {
    showToast('今天的誓约任务已经完成')
    return
  }
  if (sendGameMessage({ type: 'tribe_complete_oath_task' })) {
    showToast(`誓约任务已提交：${task.title || '部落目标'}`)
  }
}

const resolveBoundaryOutcome = (outcomeId, responseKey = '') => {
  const outcomes = currentTribe.value?.boundaryOutcomes || []
  const outcome = outcomes.find((item) => item.id === outcomeId)
  if (!outcome) {
    showToast('这条边界结果已经处理过了')
    return
  }
  if (sendGameMessage({ type: 'tribe_resolve_boundary_outcome', outcomeId, responseKey })) {
    const response = (outcome.responseOptions || []).find((item) => item.key === responseKey)
    const suffix = response?.label ? `：${response.label}` : ''
    showToast(`开始处理：${outcome.title || '边界结果'}${suffix}`)
  }
}

const completeBoundaryFollowup = (taskId) => {
  const tasks = currentTribe.value?.boundaryFollowupTasks || []
  const task = tasks.find((item) => item.id === taskId)
  if (!task) {
    showToast('这条边界后续已经处理过了')
    return
  }
  if (sendGameMessage({ type: 'tribe_complete_boundary_followup', taskId })) {
    showToast(`开始处理：${task.title || '边界后续'}`)
  }
}

const resolveEmergencyChoice = (choiceId, actionKey) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以决定紧急优先级')
    return
  }
  const choice = currentTribe.value?.emergencyChoice
  if (!choice || choice.id !== choiceId) {
    showToast('这次紧急选择已经结束')
    return
  }
  const action = emergencyChoiceActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_resolve_emergency_choice', choiceId, actionKey })) {
    showToast(`紧急选择已提交：${action?.label || '优先处理'}`)
  }
}

const completeEmergencyFollowup = (taskId) => {
  const tasks = currentTribe.value?.emergencyFollowupTasks || []
  const task = tasks.find((item) => item.id === taskId)
  if (!task) {
    showToast('这条紧急补救已经处理过了')
    return
  }
  if (sendGameMessage({ type: 'tribe_complete_emergency_followup', taskId })) {
    showToast(`开始补救：${task.title || '紧急补救'}`)
  }
}

const patrolControlledSite = (siteId) => {
  if (!siteId) return
  if (sendGameMessage({ type: 'tribe_patrol_controlled_site', siteId })) {
    showToast('控制资源点巡守已记录')
  }
}

const relayControlledSite = (siteId) => {
  if (!siteId) return
  if (!hasTribeRoad.value) {
    showToast('先建造营地道路，才能组织运输')
    return
  }
  if (sendGameMessage({ type: 'tribe_relay_controlled_site', siteId })) {
    showToast('控制资源点运输已组织')
  }
}

const claimTribeFlag = () => {
  if (!currentTribe.value) {
    showToast('请先加入部落')
    return
  }
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以插旗')
    return
  }
  const config = currentTribe.value.flagConfig || {}
  const flags = currentTribe.value.territoryFlags || []
  if (config.max && flags.length >= config.max) {
    showToast(`领地旗帜已达上限 ${config.max}`)
    return
  }
  if (!localPlayer) return
  if (sendGameMessage({
    type: 'tribe_claim_flag',
    x: localPlayer.position.x,
    z: localPlayer.position.z
  })) {
    showToast('领地旗帜请求已提交')
  }
}

const patrolTribeFlag = (flag) => {
  if (!flag?.id) return
  if (!isCurrentTribeEntity(flag)) {
    showToast('这是其他部落的领地旗帜，只能观察')
    return
  }
  if (sendGameMessage({ type: 'tribe_patrol_flag', flagId: flag.id })) {
    showToast('领地旗帜巡查已记录')
  }
}

const resolveBoundaryAction = (actionKey) => {
  const flag = activeBoundaryFlag.value
  if (!flag?.id) {
    showToast('靠近本部落边界旗帜后才能行动')
    return
  }
  if (sendGameMessage({ type: 'tribe_boundary_action', flagId: flag.id, actionKey })) {
    const label = boundaryActionOptions.value.find((item) => item.key === actionKey)?.label || '边界行动'
    showToast(`边界${label}已记录`)
  }
}

const tuneBoundaryTemperature = (otherTribeId, actionKey) => {
  if (!otherTribeId || !actionKey) return
  const action = boundaryTemperatureActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_tune_boundary_temperature', otherTribeId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'awe_watch' ? 'guard' : 'ritual')
    showToast(`边界口风已整理：${action?.label || '口风'}`)
  }
}

const sendAllianceSignal = (otherTribeId, locationOrActionKey, maybeSignalKey = '') => {
  if (!otherTribeId || !locationOrActionKey) return
  const signalKey = maybeSignalKey || locationOrActionKey
  const locationId = maybeSignalKey ? locationOrActionKey : ''
  const actionOptions = allianceSignalActions.value.length ? allianceSignalActions.value : allianceSignalActionOptions.value
  const action = actionOptions.find((item) => item.key === signalKey)
  const payload = locationId
    ? { type: 'tribe_send_alliance_signal', otherTribeId, locationId, signalKey }
    : { type: 'tribe_send_alliance_signal', otherTribeId, actionKey: signalKey }
  if (sendGameMessage(payload)) {
    triggerPlayerActionAnimation(signalKey === 'watch_sign' || signalKey === 'aid_call' || signalKey === 'watch' ? 'guard' : 'cheer')
    showToast(`联盟旗语已发出：${action?.label || '旗语'}`)
  }
}

const submitCommonJudge = (caseId, actionKey) => {
  if (!caseId || !actionKey) return
  const action = commonJudgeActions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_submit_common_judge', caseId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'cool_sentence' ? 'guard' : 'ritual')
    showToast(`共同裁判已提交：${action?.label || '见证'}`)
  }
}

const tendDisputeWitness = (stoneId, actionKey) => {
  if (!stoneId || !actionKey) return
  const action = disputeWitnessActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_tend_dispute_witness', stoneId, actionKey })) {
    triggerPlayerActionAnimation(action?.animation || (actionKey === 'guard_witness' ? 'guard' : 'ritual'))
    showToast(`见证石已维护：${action?.label || '见证'}`)
  }
}

const sealOldGrudge = (otherTribeId, anchorKey) => {
  if (!otherTribeId || !anchorKey) return
  const anchor = oldGrudgeAnchorOptions.value.find((item) => item.key === anchorKey)
  if (sendGameMessage({ type: 'tribe_seal_old_grudge', otherTribeId, anchorKey })) {
    triggerPlayerActionAnimation(anchorKey === 'border_mark' ? 'guard' : 'ritual')
    showToast(`旧怨封存已发起：${anchor?.label || '封存地'}`)
  }
}

const tendOldGrudge = (sealId, actionKey) => {
  if (!sealId || !actionKey) return
  const action = oldGrudgeSealActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_tend_old_grudge', sealId, actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'quiet_guard' || actionKey === 'joint_watch' ? 'guard' : 'ritual')
    showToast(`旧怨维护已提交：${action?.label || '维护'}`)
  }
}

const settleOldGrudgeWake = (taskId) => {
  if (!taskId) return
  if (sendGameMessage({ type: 'tribe_settle_old_grudge_wake', taskId })) {
    triggerPlayerActionAnimation('guard')
    showToast('正在补封苏醒旧怨')
  }
}

const advanceShadowTask = (actionKey) => {
  if (!actionKey) return
  const action = shadowTaskActionOptions.value.find((item) => item.key === actionKey)
  if (sendGameMessage({ type: 'tribe_advance_shadow_task', actionKey })) {
    triggerPlayerActionAnimation(actionKey === 'watch' ? 'guard' : 'ritual')
    showToast(`影子任务已推进：${action?.label || '出力'}`)
  }
}

const resolveTribeTrade = (tradeId, action) => {
  if (!canManageTribeTargets.value) {
    showToast('只有首领或长老可以处理贸易')
    return
  }
  sendGameMessage({ type: 'tribe_resolve_trade', tradeId, action })
}

const completeTradeCreditRepair = (taskId) => {
  if (!taskId) return
  if (sendGameMessage({ type: 'tribe_complete_trade_credit_repair', taskId })) {
    showToast('贸易信用修复已提交')
  }
}

const punishMember = (member) => {
  if (!canGovernMember(member)) {
    showToast('你不能惩罚该成员')
    return
  }
  const reason = `违反部落秩序：${member.name || '成员'}需要重新承担公共责任`
  if (sendGameMessage({ type: 'tribe_punish_member', targetId: member.id, reason })) {
    showToast('惩罚请求已提交')
  }
}

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
    caveExplorationLog.value = `${plan.label}路线已标记：${plan.summary}。`
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
    ? `${currentTribe.value.name}的远征队抵达${cave.label || '山洞'}，选择${plan.label}路线。${caveFoodSupported.value ? `携带食物 ${plan.foodCost}，补给稳定。` : '食物不足，只能进行短程远征。'}`
    : `${cave.label || '山洞'}里传来潮湿的风声。火把照出粗糙的岩壁，但这还只是一次试探。`
  showToast(caveExpeditionReady.value ? '部落洞穴远征开始' : '进入山洞试探探索')
}

const exploreCaveStep = () => {
  if (caveSupplies.value <= 0) {
    caveExplorationLog.value = '补给耗尽，你需要返回地表。'
    return
  }
  if (caveRouteComplete.value) {
    caveExplorationLog.value = '这条洞穴路线已经探到尽头，最好先把收获带回地表。'
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
      ? `远征队在${node.title}找到 ${finalGain} 块矿石，部落的洞穴路线正在成形。`
      : `你在${node.title}找到 ${finalGain} 块矿石，洞穴还在向深处延伸。`
  } else if (node.type === 'lore' || roll > plan.loreRoll) {
    addExperience(caveExpeditionReady.value ? 18 : 12)
    caveExplorationLog.value = caveExpeditionReady.value
      ? `远征队记录了${node.title}里的古老刮痕，长老把它写入部落线索。`
      : `${node.title}里有古老刮痕，像是某个部落曾在这里躲避风暴。`
  } else {
    caveExplorationLog.value = node.type === 'hazard'
      ? `${node.title}落下碎石，你们额外消耗了一份补给才穿过去。`
      : `${node.title}里没有明显收获，但路线被标记下来了。`
  }

  setCaveNodeStatus(activeCaveNodeIndex.value, 'completed')
  const nextIndex = activeCaveNodeIndex.value + 1
  if (nextIndex < caveRoute.value.length) {
    activeCaveNodeIndex.value = nextIndex
    setCaveNodeStatus(nextIndex, 'current')
  } else {
    caveExplorationLog.value += ' 这条洞穴路线已经到达尽头。'
    if (caveExpeditionReady.value && !caveExpeditionSynced.value) {
      caveExpeditionSynced.value = true
      sendGameMessage({
        type: 'tribe_complete_cave_expedition',
        caveLabel: activeCave.value?.label || '未知洞穴',
        depth: caveDepth.value,
        finds: caveFinds.value,
        foodSupported: caveFoodSupported.value,
        routeKey: selectedCavePlan.value.key
      })
    }
  }

  if (caveSupplies.value <= 0) {
    caveExplorationLog.value += ' 补给已经耗尽，最好马上回到地表。'
  }
}

const leaveCave = () => {
  showCaveOverlay.value = false
  activeCave.value = null
  caveExplorationLog.value = ''
  caveRoute.value = []
  activeCaveNodeIndex.value = 0
  showToast('回到地表')
}

// 创建本地玩家
const createLocalPlayer = () => {
  localPlayer = createPlayer(0x3498db, '你')

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

// 创建玩家模型（3D 角色）
const createPlayer = (color, name) => {
  const player = new THREE.Group()

  // 身体
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

  // 头部
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

  // 玩家名称标签
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

// 创建远程玩家
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

  const player = createPlayer(color, data.name || `玩家${id.substring(0, 6)}`)
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

// 移除远程玩家
const removeRemotePlayer = (id) => {
  const player = remotePlayers.get(id)
  if (player) {
    player.mesh.userData.disposed = true
    scene.remove(player.mesh)
    remotePlayers.delete(id)
  }
}

// 更新远程玩家位置（插值）
const updateRemotePlayer = (id, data) => {
  const player = remotePlayers.get(id)
  if (!player) {
    createRemotePlayer(id, data)
    return
  }
  player.data = { ...(player.data || {}), ...data, id }
  player.targetPosition.set(data.x, data.y, data.z)
}

// 渲染循环
let lastDecorationUpdate = 0
const decorationUpdateInterval = 500 // 每 500ms 更新一次装饰物

const animate = () => {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()

  // 更新 FPS
  frameCount++
  const currentTime = Date.now()
  if (currentTime - lastFrameTime >= 1000) {
    fps.value = frameCount
    frameCount = 0
    lastFrameTime = currentTime
  }

  // 更新本地玩家移动
  updateLocalPlayer(delta)
  updateStandingRitualHeldPoses()
  updatePlayerAnimation(localPlayer, delta, Boolean(localPlayer?.userData?.isMoving))
  updateInteractionTarget()

  // 定期更新装饰物（懒加载/卸载）
  if (currentTime - lastDecorationUpdate > decorationUpdateInterval) {
    updateDecorations()
    lastDecorationUpdate = currentTime
  }

  // 更新远程玩家（插值）
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

  // 更新控制器
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

  // 渲染场景
  renderer.render(scene, camera)
}

// 更新本地玩家
const updateLocalPlayer = (delta) => {
  if (!localPlayer) return

  // 使用相对于相机的方向，这样旋转视角后移动方向也会跟着变
  // 获取相机方向向量（水平方向）
  const forward = new THREE.Vector3()
  camera.getWorldDirection(forward)
  forward.y = 0  // 只保留水平分量
  forward.normalize()

  // 右方向向量（通过forward和上方向叉乘得到）
  const right = new THREE.Vector3()
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
  right.normalize()

  // 根据按键计算移动方向
  const moveDirection = new THREE.Vector3()

  // 移动跟随相机朝向：W 永远朝屏幕前方走，S 永远后退。
  if (keys.w) moveDirection.add(forward)       // 前进
  if (keys.s) moveDirection.sub(forward)       // 后退
  if (keys.a) moveDirection.sub(right)         // 左移 - 相对于相机的左侧
  if (keys.d) moveDirection.add(right)         // 右移 - 相对于相机的右侧

  // 归一化移动方向
  if (moveDirection.length() > 0) {
    moveDirection.normalize()
    velocity.x = moveDirection.x * moveSpeed
    velocity.z = moveDirection.z * moveSpeed
    localPlayer.rotation.y = Math.atan2(moveDirection.x, moveDirection.z)
  } else {
    velocity.x *= 0.9
    velocity.z *= 0.9
  }

  // 跳跃（仅在当前地面附近允许）
  const groundY = getGroundHeightAt(localPlayer.position.x, localPlayer.position.z)
  if (keys.space && localPlayer.position.y <= groundY + 0.1) {
    velocity.y = jumpPower
  }

  // 应用重力
  velocity.y += gravity * delta

  // 更新位置
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

  // 地面碰撞检测
  const nextGroundY = getGroundHeightAt(localPlayer.position.x, localPlayer.position.z)
  if (localPlayer.position.y < nextGroundY) {
    localPlayer.position.y = nextGroundY
    velocity.y = 0
  }

  // 更新显示坐标
  playerX.value = localPlayer.position.x
  playerZ.value = localPlayer.position.z
  localPlayer.userData.isMoving = Math.hypot(velocity.x, velocity.z) > 0.2

  // 发送位置到服务器（节流处理）
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendPositionUpdate()
  }
}

// 发送位置更新（带节流）
let lastSendTime = 0
const sendInterval = 50 // 每 50ms 发送一次
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
      console.error('Token 保活失败:', error)
    }
  }, 4 * 60 * 1000)
}

const scheduleReconnect = () => {
  if (manualClose || reconnectTimerId) return

  reconnectAttempt += 1
  const delay = Math.min(10000, 3000 + (reconnectAttempt - 1) * 2000)
  connectionStatus.value = 'reconnecting'
  addSystemMessage(`连接已断开，${Math.round(delay / 1000)} 秒后尝试恢复...`)

  reconnectTimerId = setTimeout(async () => {
    reconnectTimerId = null
    if (manualClose) return
    await initWebSocket({ silent: true, isReconnect: true })
  }, delay)
}

// 键盘事件处理
const handleKeyDown = (e) => {
  const key = e.key.toLowerCase()

  // 如果聊天框打开，只处理ESC键，其他键交给输入框处理
  if (showChat.value) {
    if (key === 'escape') {
      showChat.value = false
      e.preventDefault()
    }
    return
  }

  // 特殊处理空格键
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

  // 如果聊天框打开，不处理游戏控制键
  if (showChat.value) {
    return
  }

  // 特殊处理空格键
  if (key === ' ') {
    keys.space = false
    e.preventDefault()
  } else if (key in keys) {
    keys[key] = false
    e.preventDefault()
  }
}

// 窗口大小变化处理
const handleResize = () => {
  if (camera && renderer && canvasWrapper.value) {
    camera.aspect = canvasWrapper.value.clientWidth / canvasWrapper.value.clientHeight
    camera.updateProjectionMatrix()
    renderer.setSize(canvasWrapper.value.clientWidth, canvasWrapper.value.clientHeight)
  }
}

// 初始化 WebSocket
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
      console.log('WebSocket 连接成功')
      startTokenKeepAlive()

      addSystemMessage(isReconnect ? '已重新连接到游戏服务器' : '已连接到游戏服务器')
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      handleServerMessage(message)
    }

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error)
      connectionStatus.value = 'disconnected'
    }

    ws.onclose = async (event) => {
      ws = null
      clearKeepAliveTimer()
      connectionStatus.value = 'disconnected'
      console.log('WebSocket 连接关闭')

      if (manualClose) {
        return
      }

      const closeReason = event?.reason || ''
      const isAuthClose = event?.code === 4001 || /token|认证/i.test(closeReason)

      addSystemMessage(isAuthClose ? '登录状态已刷新，正在恢复游戏连接...' : '与服务器断开连接')

      if (isAuthClose) {
        try {
          await ensureFreshToken()
          await initWebSocket({ silent: true, isReconnect: true })
          return
        } catch (error) {
          console.error('认证断连后的静默恢复失败:', error)
        }
      }

      clearRemotePlayers()
      scheduleReconnect()
    }
  } catch (error) {
    console.error('WebSocket 初始化失败:', error)
    connectionStatus.value = 'disconnected'
    if (!manualClose) {
      addSystemMessage('游戏连接初始化失败，正在重试...')
      scheduleReconnect()
    }
  }
}

// 处理服务器消息
const handleServerMessage = (message) => {
  switch (message.type) {
    case 'welcome':
      playerId.value = message.playerId
      playerCount.value = message.playerCount
      // 保存玩家名称
      playerName.value = message.data?.name || '我'
      personalConflictStatus.value = {
        ...personalConflictStatus.value,
        fatigue: message.data?.conflict_fatigue || 0,
        fatigueUntil: message.data?.conflict_fatigue_until || '',
        personalRenown: message.data?.personal_renown || 0
      }
      addSystemMessage(`欢迎！当前在线 ${message.playerCount} 人`)

      // 服务端权威出生点：以 welcome 下发的坐标为准
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
      addSystemMessage(`${message.data.name || '玩家'} 加入了游戏`)
      break

    case 'player_left':
      removeRemotePlayer(message.playerId)
      playerCount.value = message.playerCount
      addSystemMessage(`玩家离开了游戏`)
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
      showToast(message.message || '身份已更新')
      addSystemMessage(message.message || '身份已更新')
      break

    case 'personal_identity_error':
      showToast(message.message || '身份动作失败')
      break

    case 'player_move':
      updateRemotePlayer(message.playerId, message.data)
      break

    case 'personal_conflict_result': {
      const isActor = message.actorId === playerId.value
      const isTarget = message.targetId === playerId.value
      if (message.actionKey === 'guard') {
        triggerPlayerActionById(message.actorId, 'guard')
        const radiusText = message.guardRadius ? `，护卫范围 ${message.guardRadius}步` : ''
        const text = `${message.actorName || '玩家'} 对 ${message.targetName || '玩家'} 摆出守势${radiusText}`
        if (message.status && isActor) personalConflictStatus.value = { ...personalConflictStatus.value, ...message.status }
        if (isActor || isTarget) showToast(text)
        addSystemMessage(text)
        break
      }
      if (message.actionKey === 'inspire') {
        triggerPlayerActionById(message.actorId, 'cheer')
        const title = message.renownTitle?.title ? `「${message.renownTitle.title}」` : ''
        const relationText = message.relationship?.label ? `，关系转为${message.relationship.label}` : ''
        const text = `${title}${message.actorName || '玩家'} 鼓舞了 ${message.targetName || '玩家'}，下次集结贡献 +${message.inspirationContribution || 1}${relationText}`
        if (message.status && isActor) personalConflictStatus.value = { ...personalConflictStatus.value, ...message.status }
        if (message.targetStatus && isTarget) personalConflictStatus.value = { ...personalConflictStatus.value, ...message.targetStatus }
        if (isActor || isTarget) showToast(text)
        addSystemMessage(text)
        break
      }
      const winnerText = message.winnerId === message.actorId ? message.actorName : message.targetName
      const guardText = message.guarded
        ? `，${message.guardianName || message.targetName || '守势'}抵消了部分疲劳`
        : ''
      const trainingText = message.trainingReward ? `，切磋训练 +${message.trainingReward}${message.trainingBonus ? `（称号+${message.trainingBonus}）` : ''}` : ''
      const relationText = message.relationship?.label ? `，关系转为${message.relationship.label}` : ''
      const text = `${message.actorName || '玩家'} 对 ${message.targetName || '玩家'} 发起${message.actionLabel || '冲突'}，${winnerText || '一方'}占了上风${guardText}${trainingText}${relationText}`
      triggerPlayerActionById(message.actorId, message.actionKey === 'spar' ? 'conflict' : 'conflict')
      if (message.guarded) triggerPlayerActionById(message.guardianId || message.targetId, 'guard')
      if (isActor || isTarget) showToast(text)
      addSystemMessage(text)
      break
    }

    case 'personal_conflict_error':
      showToast(message.message || '个人冲突失败')
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
      // 初始同步所有玩家
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

      // 移除不在 AOI 内的远端玩家
      Array.from(remotePlayers.keys()).forEach((id) => {
        if (!visible.has(id)) {
          removeRemotePlayer(id)
        }
      })
      break
    }

    case 'chat':
      // 只显示其他玩家的消息（自己的消息已经在本地显示了）
      if (message.playerId !== playerId.value) {
        chatMessages.value.push({
          sender: message.sender || '玩家',
          text: message.message,
          isOwn: false,
          isSystem: false
        })
        scrollChatToBottom()
      }
      break

    case 'map_saved':
      addSystemMessage(message.success ? '地图保存成功' : '地图保存失败')
      break

    case 'map_loaded':
      addSystemMessage('地图加载成功')
      currentMap.value = message.mapName || '默认地图'
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
      showToast(message.rumor?.title || '世界有了新的传闻')
      addSystemMessage(message.rumor?.text || '世界有了新的传闻')
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
        activeQuest.value.title = '为部落添柴加石'
        activeQuest.value.description = '采集资源并上交到公共仓库，让营火、工具和洞穴探索逐渐成为可能。'
        newTribeName.value = `${message.tribe.name}后备营`
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
      showToast(message.message || '部落操作失败')
      break

    case 'tribe_notice':
      showToast(message.message || '部落有新的进展')
      addSystemMessage(message.message || '部落有新的进展')
      break

    case 'tribe_rune_unlocked':
      if (message.rune?.rare) {
        showRareRuneUnlock(message.rune, message.message)
      } else {
        showToast(message.message || '图腾刻下了新的铭文')
      }
      addSystemMessage(message.message || '图腾刻下了新的铭文')
      break

    case 'season_settlement': {
      currentTribe.value = null
      tribeRole.value = null
      tribeContribution.value = 0
      tribeVotes.value = []
      tribeList.value = []

      const topTribe = Array.isArray(message.topTribes) ? message.topTribes[0] : null
      const summary = topTribe
        ? `${message.season || '上月'} 月度结算完成：${topTribe.name} 以 ${topTribe.totalContribution || 0} 贡献居首。新赛季已开始。`
        : `${message.season || '上月'} 月度结算完成：新赛季已开始，所有部落数据已清空。`

      if (message.rumor) mergeWorldRumor(message.rumor)
      showToast('月度结算完成，新赛季开始')
      addSystemMessage(summary)
      break
    }

    case 'pong':
      latency.value = Date.now() - message.timestamp
      break

    case 'ping':
      // 服务端空闲超时会发 ping：回一个 ping 以触发服务端 pong，便于计算延迟并保持链路活跃
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'ping',
          timestamp: message.timestamp || Date.now()
        }))
      }
      break
  }
}

// 添加系统消息
const addSystemMessage = (text) => {
  chatMessages.value.push({
    sender: '系统',
    text,
    isOwn: false,
    isSystem: true
  })
  scrollChatToBottom()
}

// 发送聊天消息
const sendMessage = () => {
  const message = chatInput.value.trim()
  if (!message) return

  // 1. 无论是否连接，先清空输入框，给用户操作反馈
  chatInput.value = ''

  // 2. 检查连接状态
  if (ws && ws.readyState === WebSocket.OPEN) {
    // 本地显示消息
    chatMessages.value.push({
      sender: playerName.value,
      text: message,
      isOwn: true,
      isSystem: false
    })
    scrollChatToBottom()

    // 发送给服务器
    ws.send(JSON.stringify({
      type: 'chat',
      message: message
    }))
  } else {
    // 未连接时的提示
    addSystemMessage('❌ 发送失败：未连接到服务器')
    
  }
}

// 聊天滚动到底部
const scrollChatToBottom = () => {
  nextTick(() => {
    if (chatMessagesEl.value) {
      chatMessagesEl.value.scrollTop = chatMessagesEl.value.scrollHeight
    }
  })
}

// 打开聊天
const openChat = () => {
  showChat.value = true
  nextTick(() => {
    chatInputEl.value?.focus()
  })
}

// 处理聊天输入框按键
const handleChatKeyDown = (e) => {
  // 关键修复：如果正在使用中文输入法（打字选词中），不要触发发送
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

// 切换性能监视器
const togglePerformance = () => {
  showPerformance.value = !showPerformance.value
}

// 切换全屏
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
    isFullscreen.value = true
  } else {
    document.exitFullscreen()
    isFullscreen.value = false
  }
}

// 保存地图
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
    addSystemMessage('正在保存地图...')
  } else {
    addSystemMessage('未连接到服务器')
  }
}

// 加载地图
const loadMap = () => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'load_map',
      mapName: currentMap.value || '默认地图'
    }))
    addSystemMessage('正在加载地图...')
  } else {
    addSystemMessage('未连接到服务器')
  }
}

// 心跳检测
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

// 生命周期
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

  // 监听全屏变化
  document.addEventListener('fullscreenchange', () => {
    isFullscreen.value = !!document.fullscreenElement
  })
})

onUnmounted(() => {
  manualClose = true
  clearReconnectTimer()
  clearKeepAliveTimer()
  // 清理资源
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
