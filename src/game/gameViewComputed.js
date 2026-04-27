import { computed } from 'vue'

export function createGameViewComputed(ctx) {
  const { activeCaveNodeIndex, activeQuest, caveExpeditionPlanKey, caveExpeditionPlans, caveFoodSupported, caveRoute, currentTribe, currentWeather, decorations, interactionTarget, inventory, landmarkFallbackTypes, mapEnvironment, noTribeGuestStayActions, noTribeGuestStayTargets, personalConflictStatus, playerExperience, playerId, playerNextLevelExperience, playerX, playerZ, resourceTideTick, seasonSummary, tradeResourceLabels, tribeAnnouncementDraft, tribeBuildingTypeLabels, tribeHistoryFilter, tribeHistoryLoaded, tribeHistoryNextCursor, tribeRitualTick, tribeRole, worldEventActionKey, worldRumors } = ctx

  const optionMapToList = (options = {}) => Object.entries(options || {}).map(([key, value]) => ({
    ...(value && typeof value === 'object' ? value : {}),
    key,
    label: value?.label || key,
    summary: value?.summary || ''
  }))

  const PLAYER_STAND_HEIGHT = 2
  const minimapRadius = 95
  const weatherMeta = {
    sunny: { label: 'Sunny', announcement: 'Press T to chat with nearby players.' },
    rain: { label: 'Rain', announcement: 'Rain makes fires and crystals easier to notice.' },
    snow: { label: 'Snow', announcement: 'Snow softens visibility; watch minimap landmarks.' },
    fog: { label: 'Fog', announcement: 'Fog is closing in; follow landmarks and stay near camp.' }
  }

  const inventoryItems = computed(() => [
    { key: 'wood', name: '鏈ㄦ潗', count: inventory.value.wood },
    { key: 'stone', name: '鐭跨煶', count: inventory.value.stone }
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

  const weatherLabel = computed(() => weatherMeta[currentWeather.value]?.label || '鏈煡澶╂皵')

  const formatCountdown = (seconds) => {
    const safeSeconds = Math.max(0, Math.ceil(Number(seconds) || 0))
    const minutes = Math.floor(safeSeconds / 60)
    const remainder = safeSeconds % 60
    return `${minutes}:${String(remainder).padStart(2, '0')}`
  }

  const announcementText = computed(() => celestialWindowText.value || worldEventText.value || migrationSeasonText.value || resourceTideText.value || tileTraceWeatherRippleText.value || weatherMeta[currentWeather.value]?.announcement || weatherMeta.sunny.announcement)

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
    const seasonText = tide.seasonBoosted ? '锛堣縼寰欏鑺傚寮猴級' : ''
    return `${tide.regionLabel}鍑虹幇澶у湴棣堣禒${seasonText}锛氬尯鍩熷唴閲囬泦棰濆 +${tide.gatherBonus || 0}锛屽墿浣?${formatCountdown(tide.remainingSeconds)}`
  })

  const tileTraceWeatherRippleText = computed(() => {
    const ripple = mapEnvironment.value?.tileTraceWeatherRipple
    if (!ripple?.label) return null
    return `${ripple.label}牵动天气余波：${weatherName(ripple.weather || currentWeather.value)}`
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
    return `${season.title || '杩佸緳瀛ｈ妭'}锛氬吔缇ゆ洿棰戠箒锛屽ぇ鍦伴璧犻噰闆嗛澶?+${season.tideBonus || 0}锛屽墿浣?${formatCountdown(season.remainingSeconds)}`
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
    return `${window.title || 'Celestial window'}: ${window.summary || 'All tribes can read this sky sign'}, remaining ${formatCountdown(window.remainingSeconds)}`
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
    return `${objective.regionLabel || 'Unknown region'} has ${objective.title || 'season objective'}: ${objective.summary || 'A short-lived opportunity is active'}, remaining ${formatCountdown(objective.remainingSeconds)}`
  })

  const seasonObjectiveActiveHint = computed(() => {
    const base = '浣犳鍦ㄥ鑺傜洰鏍囧尯鍩熷唴'
    return celebrationDiscoveryHint.value ? `${base} 路 ${celebrationDiscoveryHint.value}` : base
  })

  const worldEventText = computed(() => {
    const event = activeWorldEvent.value
    if (!event) return null
    const rewardText = worldEventRewardText(event)
    const rewardSuffix = rewardText ? `, reward: ${rewardText}` : ''
    return `${event.regionLabel || 'Unknown region'} has ${event.title || 'world event'}: ${event.summary || 'A new dynamic event is active'}${rewardSuffix}, remaining ${formatCountdown(event.remainingSeconds)}`
  })

  const worldEventRewardText = (event) => {
    const reward = event?.reward || {}
    const parts = []
    if (reward.wood) parts.push(`鏈ㄦ潗${reward.wood > 0 ? '+' : ''}${reward.wood}`)
    if (reward.stone) parts.push(`鐭冲潡${reward.stone > 0 ? '+' : ''}${reward.stone}`)
    if (reward.food) parts.push(`椋熺墿+${reward.food}`)
    if (reward.discoveryProgress) parts.push(`鍙戠幇杩涘害+${reward.discoveryProgress}`)
    if (reward.renown) parts.push(`澹版湜+${reward.renown}`)
    return parts.join('銆?')
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
    if (!point) return '鏈煡浣嶇疆'
    const x = Math.round(point.x || 0)
    const z = Math.round(point.z || 0)
    return `(${x}, ${z})`
  }

  const oathVisualClass = (oathKey) => oathKey ? `oath-${oathKey}` : ''

  const describeLandmark = (landmark) => {
    if (!landmark) return 'Unknown landmark'
    const own = Boolean(landmark.isOwnTribe)
    const text = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim()) || ''
    const withDetail = (base, detail) => detail ? `${base} - ${detail}` : base

    if (landmark.type === 'tribe_spawn' && own) return 'Own tribe spawn'
    if (landmark.type === 'tribe_camp' && own) return withDetail('Own tribe camp', landmark.oathLabel)
    if (landmark.type === 'tribe_flag' && own) return withDetail('Own tribe flag', landmark.oathLabel)
    if (landmark.type === 'tribe_beast_marker' && own) return 'Own tribe beast marker'
    if (landmark.type === 'scouted_resource_site' && landmark.jointWatchId) {
      return own
        ? withDetail('Joint watch lead', text(landmark.resourceLabel, landmark.label, 'Pending confirmation'))
        : 'Other tribe joint watch lead'
    }
    if (landmark.type === 'scouted_resource_site') {
      return own
        ? withDetail('Scouted resource site', text(landmark.resourceLabel, landmark.label, 'Pending confirmation'))
        : 'Other tribe scouted resource site'
    }
    if (landmark.type === 'controlled_resource_site') {
      return own
        ? withDetail(`Controlled resource site Lv.${landmark.level || 1}`, text(landmark.resourceLabel, landmark.label, 'Collectable'))
        : 'Other tribe controlled resource site'
    }
    if (landmark.type === 'trade_route_site') return own ? withDetail('Trade route', landmark.partnerTribeName || 'Neighbor tribe') : 'Other tribe trade route'
    if (landmark.type === 'nomad_caravan') return own ? withDetail('Nomad caravan', landmark.focusLabel || 'Neutral goods') : 'Other tribe caravan'
    if (landmark.type === 'nomad_visitor') return own ? withDetail(text(landmark.label, 'Mysterious visitor'), landmark.giftLabel || 'Oral trust') : 'Other tribe visitor'
    if (landmark.type === 'mutual_aid_alert') return own ? withDetail(text(landmark.label, 'Mutual aid alert'), landmark.sourceTitle || 'Emergency event') : 'Other tribe mutual aid alert'
    if (landmark.type === 'alliance_signal') return own ? withDetail(text(landmark.label, 'Alliance signal'), text(landmark.actionLabel, landmark.otherTribeName, 'Friendly tribe')) : 'Other tribe alliance signal'
    if (landmark.type === 'traveler_song') return own ? withDetail(text(landmark.label, 'Traveler song'), text(landmark.toneLabel, landmark.rewardLabel, 'Singable')) : 'Other tribe traveler song'
    if (landmark.type === 'border_theater') return own ? withDetail(text(landmark.label, 'Border theater'), `entries ${landmark.participantCount || 0}`) : 'Other tribe border theater'
    if (landmark.type === 'dispute_witness_stone') return own ? withDetail(text(landmark.label, 'Dispute witness stone'), `${landmark.progress || 0}/${landmark.target || 1}`) : 'Other tribe dispute witness stone'
    if (landmark.type === 'celebration_echo') return own ? withDetail(text(landmark.label, 'Celebration echo'), landmark.rewardLabel || 'Joinable') : 'Other tribe celebration echo'
    if (landmark.type === 'world_event_remnant') return own ? withDetail(text(landmark.label, 'World event remnant'), landmark.rewardLabel || 'Recoverable') : 'Other tribe world event remnant'
    if (landmark.type === 'map_memory_trace') return own ? withDetail(text(landmark.label, 'Map memory trace'), landmark.rewardLabel || 'Reviewable') : 'Other tribe map memory'
    if (landmark.type === 'map_tile_trace') return own ? withDetail(text(landmark.label, 'Map tile trace'), text(landmark.impactLabel, landmark.rewardLabel, 'Recoverable')) : 'Other tribe map tile trace'
    if (landmark.type === 'old_camp_echo') return own ? withDetail(text(landmark.label, 'Old camp echo'), landmark.rewardLabel || 'Recallable') : 'Other tribe old camp echo'
    if (landmark.type === 'rare_cave_race') return own ? withDetail(text(landmark.label, 'Rare cave race'), 'first claim available') : 'Other tribe rare cave lead'
    if (landmark.type === 'cave_rescue_clue') return own ? withDetail(text(landmark.label, 'Cave rescue clue'), `${landmark.progress || 0}/${landmark.target || 1}`) : 'Other tribe cave rescue clue'
    if (landmark.type === 'cave_return_mark') return own ? withDetail(text(landmark.label, 'Cave return mark'), text(landmark.methodLabel, landmark.rewardLabel, 'Revisitable')) : 'Other tribe cave return mark'
    if (landmark.type === 'sacred_fire_relay' || landmark.type === 'sacred_fire_site') return own ? withDetail(text(landmark.label, 'Sacred fire relay'), text(landmark.destinationLabel, landmark.rewardLabel, 'Carrying fire')) : 'Other tribe sacred fire relay'
    if (landmark.type === 'neutral_sanctuary') return own ? withDetail(text(landmark.label, 'Neutral sanctuary'), landmark.status === 'dormant' ? 'resting' : 'available') : 'Other tribe neutral sanctuary'
    if (landmark.type === 'collection_wall') return own ? withDetail(text(landmark.label, 'Collection wall'), landmark.collectionLabel || 'Old item display') : 'Other tribe collection wall'
    if (landmark.type === 'lost_item') return withDetail(text(landmark.label, 'Drifting lost item'), landmark.sourceLabel || landmark.eventSummary || 'Recoverable')
    if (landmark.type === 'shared_puzzle' || landmark.type === 'shared_puzzle_site') return own ? withDetail(text(landmark.label, 'Shared puzzle'), text(landmark.fragmentLabel, landmark.rewardLabel, 'Pattern assembly')) : 'Other tribe shared puzzle'
    if (landmark.type === 'trail_marker') return own ? withDetail(text(landmark.label, 'Trail marker'), text(landmark.interpretation, landmark.summary, 'Editable')) : 'Other tribe trail marker'
    if (landmark.type === 'world_riddle_site') return own ? withDetail(text(landmark.label, 'World riddle'), text(landmark.patternLabel, landmark.rewardLabel, 'Record pattern')) : 'Other tribe world riddle'
    if (landmark.type === 'trial_ground') return own ? withDetail(text(landmark.label, 'Trial ground'), `attempts ${landmark.participantCount || 0}`) : 'Other tribe trial ground'
    if (landmark.type === 'forbidden_edge') return own ? withDetail(text(landmark.label, 'Forbidden edge'), `tries ${landmark.participantCount || 0}`) : 'Other tribe forbidden edge'
    if (landmark.type === 'fog_trail') return own ? withDetail(text(landmark.label, 'Fog trail'), `scouts ${landmark.participantCount || 0}`) : 'Other tribe fog trail'
    if (landmark.type === 'disaster_coop_site') return own ? withDetail(text(landmark.label, 'Disaster co-op site'), text(landmark.disasterLabel, landmark.rewardLabel, 'Co-op available')) : 'Other tribe disaster co-op site'
    if (landmark.type === 'named_landmark') return own ? withDetail(text(landmark.label, 'Named landmark'), landmark.sourceLabel || 'Tribe naming') : 'Other tribe named landmark'
    if (landmark.type === 'tribe_totem' && landmark.oathLabel) return `${landmark.oathLabel} totem`
    if (landmark.type === 'tribe_totem' && landmark.hasRuneHonor) return landmark.honorText
    return landmark.label || 'Unknown landmark'
  }

  const tribeRuneHonorText = (tribe = currentTribe.value) => {
    if (tribe?.publicRuneSummary?.text) return tribe.publicRuneSummary.text
    const runes = Array.isArray(tribe?.runes) ? tribe.runes : []
    if (!runes.length) return 'No totem runes yet'
    const names = runes.map((rune) => rune.title || 'Unknown rune').filter(Boolean)
    return `Totem runes ${runes.length}: ${names.slice(0, 3).join(', ')}${names.length > 3 ? '...' : ''}`
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
      label: event.title || '涓栫晫浜嬩欢',
      x: event.x || 0,
      z: event.z || 0,
      eventSummary: event.summary || ''
    }))
    const seasonObjective = activeSeasonObjective.value
    const seasonLandmarks = seasonObjective
      ? [{
          id: seasonObjective.id,
          type: 'season_objective',
          label: seasonObjective.title || '瀛ｈ妭鐩爣',
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
          label: celestialWindow.title || '缃曡澶╄薄',
          x: celestialWindow.x || 0,
          z: celestialWindow.z || 0,
          eventSummary: celestialWindow.summary || ''
        }]
      : []
    const lostItemLandmarks = Array.isArray(currentTribe.value?.lostItems)
      ? currentTribe.value.lostItems.map((item) => ({
          id: item.id,
          type: 'lost_item',
          label: item.label || '漂流失物',
          x: item.x || 0,
          z: item.z || 0,
          eventSummary: item.summary || ''
        }))
      : []

    return [...landmarks, ...worldEventLandmarks, ...seasonLandmarks, ...celestialLandmarks, ...lostItemLandmarks].map((landmark) => {
      const isOwnTribe = isCurrentTribeEntity(landmark)
      const honorText = landmark.type === 'tribe_totem'
        ? (landmark.runeSummary?.text || (isOwnTribe ? tribeRuneHonorText() : 'No totem runes yet'))
        : ''
      return {
        ...landmark,
        isOwnTribe,
        honorText,
        isLegendaryRenown: Number(landmark.renownState?.level || 0) >= 3,
        hasRuneHonor: Boolean(honorText && honorText !== 'No totem runes yet'),
        oathClass: oathVisualClass(landmark.oathKey),
        boundaryClass: boundaryClass(landmark.boundaryRelation),
        contestClass: landmark.contested ? 'contested' : '',
        title: honorText
          ? [landmark.label || 'Tribe totem', landmark.oathLabel, landmark.renownState?.title, honorText].filter(Boolean).join(' - ')
          : (landmark.oathLabel ? `${landmark.label || 'Tribe landmark'} - ${landmark.oathLabel}` : landmark.label)
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
    if (!mapLandmarks.value.length) return '闄勮繎鏆傛棤宸茬煡鍦版爣'

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

    if (!nearest) return '闄勮繎鏆傛棤宸茬煡鍦版爣'
    return `鏈€杩戝湴鏍囷細${describeLandmark(nearest)} 路 ${Math.round(nearestDistance)}m`
  })

  const roleLabel = (role) => {
    const labels = {
      leader: '棣栭',
      elder: '闀胯€?',
      member: '鎴愬憳'
    }
    return labels[role] || '鎴愬憳'
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
    return `涓婚锛${chain.themeLabel}`
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
        label: tribeBuildingTypeLabels[building.type] || building.label || '寤虹瓚'
      }))
  })

  const tribeCampSummaryText = computed(() => {
    const camp = currentTribe.value?.camp
    if (!camp) return '钀ュ湴姝ｅ湪鎼缓涓€?'
    const center = formatMapPoint(camp.center)
    const spawn = formatMapPoint(camp.spawn)
    return `钀ュ湴鏍稿績浣嶄簬 ${center}锛屾柊鎴愬憳浼氫粠 ${spawn} 闆嗙粨鍑哄彂銆俙`
  })

  const foodPressureText = computed(() => {
    const pressure = currentTribe.value?.foodPressure
    if (!pressure) return '瀹夊叏绾?--'
    const safeLine = pressure.safeLine || 0
    if (pressure.active) {
      return `瓒呭嚭 ${pressure.excess || 0}锛屾瘡 ${pressure.decayIntervalMinutes || 0} 鍒嗛挓缂撴參鑵愬潖`
    }
    return `瀹夊叏绾?${safeLine}${pressure.storageBonus ? '锛屼粨搴撳姞鎴愪腑' : ''}`
  })

  const tradeResourceText = (resource, amount) => `${amount || 0} ${tradeResourceLabels[resource] || resource || '璧勬簮'}`

  const tradeText = (trade) => {
    const offer = trade?.offer || {}
    const request = trade?.request || {}
    return `${trade.fromTribeName || '閮ㄨ惤'} 鍑?${tradeResourceText(offer.resource, offer.amount)}锛屾崲 ${tradeResourceText(request.resource, request.amount)}`
  }

  const tradeDirectionText = (trade) => {
    if (trade?.fromTribeId === currentTribe.value?.id) return `鍙戠粰 ${trade.toTribeName || '鐩爣閮ㄨ惤'}`
    if (trade?.toTribeId === currentTribe.value?.id) return `鏉ヨ嚜 ${trade.fromTribeName || '鍏朵粬閮ㄨ惤'}`
    return '閮ㄨ惤璐告槗'
  }

  const activeTribeCelestialWindow = computed(() => currentTribe.value?.celestialWindow || null)
  const celestialBranchOptions = computed(() => activeTribeCelestialWindow.value?.branches || [])
  const weatherForecastSignOptions = computed(() => optionMapToList(currentTribe.value?.weatherForecastSigns))
  const weatherName = (weatherKey) => weatherMeta[weatherKey]?.label || weatherKey || '鏈煡澶╂皵'
  const tribeLawOptions = computed(() => optionMapToList(currentTribe.value?.tribeLawOptions))
  const sharedPuzzleOptions = computed(() => optionMapToList(currentTribe.value?.sharedPuzzleOptions))
  const worldRiddlePredictionOptions = computed(() => optionMapToList(currentTribe.value?.worldRiddlePredictions))
  const trialGroundActions = computed(() => optionMapToList(currentTribe.value?.trialGroundActions))
  const rumorTruthActions = computed(() => optionMapToList(currentTribe.value?.rumorTruthActions))
  const publicSecretActions = computed(() => optionMapToList(currentTribe.value?.publicSecretActions))
  const echoItemTypeOptions = computed(() => optionMapToList(currentTribe.value?.echoItemTypes))
  const echoItemExperienceOptions = computed(() => optionMapToList(currentTribe.value?.echoItemExperiences))
  const lostItemActions = computed(() => optionMapToList(currentTribe.value?.lostItemActions))
  const mapTileTraceActionOptions = computed(() => optionMapToList(currentTribe.value?.mapTileTraceActions))
  const mapTileTraceActions = (trace) => mapTileTraceActionOptions.value.filter((action) => {
    const kinds = Array.isArray(action.traceKinds) ? action.traceKinds : []
    return !kinds.length || kinds.includes(trace?.kind)
  })
  const namedLandmarkOptions = computed(() => optionMapToList(currentTribe.value?.namedLandmarkOptions))

  const beastSpecialtyLabel = (specialtyKey) => {
    const specialtyLabels = {
      guardian: '瀹堝崼',
      hunter: '鐚庝即',
      carrier: '椹吔',
      sniffer: '鍡呮帰',
      omen: '鍚夊厗'
    }
    return specialtyLabels[specialtyKey] || specialtyKey || '鏈畾'
  }

  const tribeHistoryFilters = [
    { key: 'all', label: '鍏ㄩ儴' },
    { key: 'build', label: '寤鸿' },
    { key: 'rune', label: '閾枃' },
    { key: 'ritual', label: '浠紡' },
    { key: 'governance', label: '娌荤悊' },
    { key: 'cave', label: '杩滃緛' },
    { key: 'world_event', label: '浜嬩欢' },
    { key: 'food', label: '椋熺墿' },
    { key: 'trade', label: '璐告槗' }
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
      build: '寤鸿',
      rune: '閾枃',
      ritual: '浠紡',
      cave: '杩滃緛',
      world_event: '浜嬩欢',
      application: '鐢宠',
      announcement: '鍏憡',
      allocation: '棰勫垎閰?',
      punishment: '鎯╃綒',
      vote: '鎶曠エ',
      trade: '璐告槗'
    }
    return labels[type] || '鍘嗗彶'
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
    if (reward.wood) parts.push(`鏈ㄦ潗+${reward.wood}`)
    if (reward.stone) parts.push(`鐭冲潡+${reward.stone}`)
    if (reward.food) parts.push(`椋熺墿+${reward.food}`)
    if (reward.renown) parts.push(`澹版湜+${reward.renown}`)
    if (reward.discoveryProgress) parts.push(`鍙戠幇+${reward.discoveryProgress}`)
    if (reward.tradeReputation) parts.push(`璐告槗+${reward.tradeReputation}`)
    if (action.pressureRelief) parts.push(`鎴樺帇-${action.pressureRelief}`)
    return parts.join('銆?')
  }

  const forbiddenEdgeRewardText = (action = {}) => {
    const parts = []
    if (action.woodCost) parts.push(`鑰楁湪鏉?${action.woodCost}`)
    if (action.safety) parts.push(`瀹夊叏 ${action.safety > 0 ? '+' : ''}${action.safety}`)
    if (action.supportBonus) parts.push(`鏀拺+${action.supportBonus}`)
    if (action.requiresMembers) parts.push(`鑷冲皯 ${action.requiresMembers} 浜篳`)
    const rewardText = trialGroundRewardText(action)
    if (rewardText) parts.push(rewardText)
    if (action.collectionReady) parts.push('鍙甫鍥炴棫鐗╂潵婧?')
    return parts.join('銆?')
  }

  const forbiddenEdgeRouteProofRewardText = (action = {}) => {
    const parts = []
    const rewardText = trialGroundRewardText(action)
    if (rewardText) parts.push(rewardText)
    if (action.relationDelta) parts.push(`鍏崇郴+${action.relationDelta}`)
    if (action.tradeTrustDelta) parts.push(`淇′换+${action.tradeTrustDelta}`)
    return parts.join('銆?')
  }

  const personalConflictText = computed(() => {
    const status = personalConflictStatus.value || {}
    const fatigue = status.fatigue || 0
    const fatigueMax = status.fatigueMax || 6
    const fatigueTime = formatRemainingSeconds(status.fatigueUntil)
    const guardTime = formatRemainingSeconds(status.guardUntil)
    const inspirationTime = formatRemainingSeconds(status.inspirationUntil)
    const title = status.renownTitle?.title || '鏃犲悕鎴愬憳'
    const parts = [`${title} ${status.personalRenown || 0}`, `鐤插姵 ${fatigue}/${fatigueMax}`]
    if (fatigueTime) parts.push(`鎭㈠ ${fatigueTime}`)
    if (guardTime) {
      const target = status.guardTargetName ? `瀵${status.guardTargetName}` : ''
      parts.push(`瀹堝娍${target} ${guardTime} 路 ${status.guardRadius || 6}姝`)
    }
    if (status.fatigueRecoveryBonusSeconds) parts.push(`鎭㈠-${status.fatigueRecoveryBonusSeconds}s`)
    if (status.sparTrainingBonus) parts.push(`鍒囩+${status.sparTrainingBonus}`)
    if (status.skirmishContributionBonus) parts.push(`闆嗙粨+${status.skirmishContributionBonus}`)
    if (inspirationTime) {
      const source = status.inspirationSourceName ? `${status.inspirationSourceName} ` : ''
      parts.push(`${source}榧撹垶 +${status.inspirationContribution || 1} ${inspirationTime}`)
    }
    const relation = (status.personalRelations || [])[0]
    if (relation?.targetName && relation?.label) {
      parts.push(`${relation.label} ${relation.targetName} ${relation.score || 0}`)
    }
    return parts.join(' 路 ')
  })

  const personalIdentity = computed(() => personalConflictStatus.value?.identity || {})
  const personalIdentityOptions = computed(() => personalIdentity.value?.options || [])
  const personalIdentityCooldownText = computed(() => formatRemainingSeconds(personalIdentity.value?.cooldownUntil))
  const personalIdentityActionText = computed(() => {
    const identity = personalIdentity.value
    if (!identity?.key) return ''
    const cooldown = personalIdentityCooldownText.value
    return cooldown ? `${identity.actionLabel || identity.label} ${cooldown}` : `${identity.actionLabel || identity.label}鍙敤`
  })


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
    if (!ritual) return 'No ritual active. Build a campfire to start a harvest fire or tribe feast.'
    const renownText = ritual.renownBonus ? `, renown +${ritual.renownBonus}` : ''
    return `${ritual.title || 'Harvest fire'} active: gather +${ritual.gatherBonus || 0}${renownText}, remaining ${formatCountdown(ritual.remainingSeconds)}`
  })

  const tribeRitualCostText = computed(() => {
    const config = currentTribe.value?.ritualConfig || {}
    const feast = currentTribe.value?.feastConfig || {}
    const durationBonus = config.durationBonusMinutes ? ` (rune +${config.durationBonusMinutes} min)` : ''
    const gatherBonus = config.extraGatherBonus
      ? `, gather +${config.gatherBonus || 0} (rune +${config.extraGatherBonus})`
      : `, gather +${config.gatherBonus || 0}`
    const feastText = `; feast food ${feast.food || 0}, duration ${feast.durationMinutes || 0} min, gather +${feast.gatherBonus || 0}, renown +${feast.renownBonus || 0}`
    return `Fire costs wood ${config.wood || 0} / stone ${config.stone || 0}, duration ${config.durationMinutes || 0} min${durationBonus}${gatherBonus}${feastText}`
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
    if (buff.gatherBonus) parts.push(`閲囬泦 +${buff.gatherBonus}`)
    if (buff.discoveryBonus) parts.push(`鍙戠幇 +${buff.discoveryBonus}`)
    if (buff.tradeRenownBonus) parts.push(`浜ゆ槗澹版湜 +${buff.tradeRenownBonus}`)
    const effects = parts.length ? ` (${parts.join(', ')})` : ''
    return `${buff.title}${effects} - remaining ${formatCountdown(buff.remainingSeconds)}`
  })
  const celebrationGatherBonus = computed(() => activeCelebrationBuff.value?.gatherBonus || 0)
  const celebrationDiscoveryHint = computed(() => activeCelebrationBuff.value?.discoveryBonus
    ? `绁浣欓煹锛氬畬鎴愬悗鍙戠幇杩涘害棰濆 +${activeCelebrationBuff.value.discoveryBonus}`
    : '')
  const celebrationTradeHint = computed(() => activeCelebrationBuff.value?.tradeRenownBonus
    ? `闆嗗競浣欓煹锛氬畬鎴愯锤鏄撴椂鍙屾柟澹版湜棰濆 +${activeCelebrationBuff.value.tradeRenownBonus}`
    : '')
  const activeOathKey = computed(() => currentTribe.value?.oath?.key || '')
  const oathGatherBonus = computed(() => (activeOathKey.value === 'hearth' ? 1 : 0))
  const oathOptions = computed(() => optionMapToList(currentTribe.value?.oathOptions))
  const oathText = computed(() => {
    const oath = currentTribe.value?.oath
    return oath ? `${oath.label || 'Tribe oath'}: ${oath.summary || 'Long-term direction is set'}` : 'No long-term oath yet'
  })
  const oathTaskText = computed(() => {
    const task = currentTribe.value?.oathTask
    if (!task) return ''
    const reward = task.reward || {}
    const parts = []
    if (task.sourceLabel) parts.push(task.sourceLabel)
    if (reward.food) parts.push(`椋熺墿 +${reward.food}`)
    if (reward.renown) parts.push(`澹版湜 +${reward.renown}`)
    if (reward.discoveryProgress) parts.push(`鍙戠幇 +${reward.discoveryProgress}`)
    if (reward.tradeReputation) parts.push(`淇¤獕 +${reward.tradeReputation}`)
    if (reward.beastExperience) parts.push(`骞煎吔鐔熺粌 +${reward.beastExperience}`)
    return `${task.completed ? 'Completed' : 'Pending'}: ${task.title || 'Oath task'}${parts.length ? ` - ${parts.join(' / ')}` : ''}`
  })
  const flagPatrolChainText = computed(() => {
    const chain = currentTribe.value?.flagPatrolChain
    if (!chain) return ''
    const count = chain.regions?.length || 0
    return `Flag patrol chain ${count} / ${chain.target || 2} regions`
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
    const parts = [`鍏崇郴 ${score > 0 ? '+' : ''}${score}`]
    if (trust > 0) parts.push(`璐告槗淇′换 +${trust}`)
    return `${relation.label || '杈圭晫鍏崇郴'} 路 ${parts.join(' / ')}`
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
    return `${task.memberName || '鎴愬憳'}鍒氭淳鍑哄辜鍏芥墽琛${task.taskLabel || '浠诲姟'}锛屽墿浣${formatCountdown(task.remainingSeconds)}`
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
    const runeText = caveRuneFindsBonus.value ? ` Rare rune bonus +${caveRuneFindsBonus.value}.` : ''
    const plan = selectedCavePlan.value
    if (!currentTribe.value) return 'No tribe: this is a personal cave probe with lower rewards and no tribe record.'
    if (caveExpeditionReady.value && caveFoodSupported.value) return `Tribe expedition ready: ${plan.label} route costs food ${plan.foodCost}. ${plan.summary}.${runeText}`
    if (caveExpeditionReady.value) return `Tribe expedition lacks food: ${plan.label} route needs ${plan.foodCost}. You can still depart, but final rewards drop.${runeText}`
    return 'Expedition preparing: keep advancing tribe storage and workbench goals before caves become a formal action.'
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
        title: 'Fixed camp and spawn',
        description: hasTribe ? 'Done: totem, buildings, and spawn are bound to the tribe camp.' : 'Create or join a tribe to unlock a fixed camp.',
        status: hasTribe ? 'done' : 'next'
      },
      {
        key: 'storage',
        title: 'Public storage and contribution',
        description: hasSupplies ? 'In progress: the tribe is accumulating shared supplies.' : 'Next, move resources into public storage.',
        status: hasSupplies ? 'doing' : 'next'
      },
      {
        key: 'governance',
        title: 'Roles and elections',
        description: 'Leaders, elders, and basic voting are present; governance can keep growing.',
        status: hasTribe ? 'doing' : 'next'
      },
      {
        key: 'expansion',
        title: 'World map and cave expeditions',
        description: caveExpeditionReady.value ? 'Cave expedition is ready; team instances and cave resource chains can follow.' : 'Regions exist, and cave expedition prep is underway.',
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
    return `Leader vote: ${rules.leaderMinMembers} members / ${rules.leaderMinContribution} contribution / ${rules.leaderCooldownHours}h cooldown; elder: ${rules.elderMinMembers} members / ${rules.elderMinContribution} contribution.`
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

  return { optionMapToList, PLAYER_STAND_HEIGHT, minimapRadius, weatherMeta, inventoryItems, experiencePercent, questProgressPercent, displayPlayerZ, weatherLabel, formatCountdown, announcementText, activeResourceTide, resourceTideText, tileTraceWeatherRippleText, activeMigrationSeason, migrationSeasonText, activeCelestialWindow, celestialWindowText, activeWorldEvent, activeWorldEventActionOptions, selectedWorldEventActionKey, activeSeasonObjective, seasonObjectiveText, seasonObjectiveActiveHint, worldEventText, worldEventRewardText, isInsideResourceTide, resourceTideGatherBonus, isCurrentTribeEntity, formatMapPoint, oathVisualClass, describeLandmark, tribeRuneHonorText, mapToMinimap, minimapPlayer, mapLandmarks, isInsideSeasonObjective, minimapLandmarks, nearestLandmarkText, roleLabel, tribeRoleLabel, canManageTribeTargets, oralChainLines, oralChainReady, oralChainProgressText, oralChainThemeText, syncTribeAnnouncementDraft, lastSeasonChampion, normalizeWorldRumors, visibleWorldRumors, mergeWorldRumor, tribeCampBuildingTags, tribeCampSummaryText, foodPressureText, tradeResourceText, tradeText, tradeDirectionText, activeTribeCelestialWindow, celestialBranchOptions, weatherForecastSignOptions, weatherName, tribeLawOptions, sharedPuzzleOptions, worldRiddlePredictionOptions, trialGroundActions, rumorTruthActions, publicSecretActions, echoItemTypeOptions, echoItemExperienceOptions, lostItemActions, mapTileTraceActionOptions, mapTileTraceActions, namedLandmarkOptions, beastSpecialtyLabel, tribeHistoryFilters, governanceHistoryTypes, mergeHistoryEvents, allTribeHistory, filteredTribeHistory, visibleTribeHistory, hasMoreTribeHistory, historyTypeLabel, formatHistoryTime, formatRemainingSeconds, trialGroundRewardText, forbiddenEdgeRewardText, forbiddenEdgeRouteProofRewardText, personalConflictText, personalIdentity, personalIdentityOptions, personalIdentityCooldownText, personalIdentityActionText, activeTribeRitual, tribeRitualText, tribeRitualCostText, activeCelebrationBuff, celebrationBuffText, celebrationGatherBonus, celebrationDiscoveryHint, celebrationTradeHint, activeOathKey, oathGatherBonus, oathOptions, oathText, oathTaskText, flagPatrolChainText, tribeGatherBonus, boundaryClass, boundaryActionOptions, boundaryTemperatureActionOptions, allianceSignalActions, commonJudgeActions, disputeWitnessActionOptions, oldGrudgeAnchorOptions, oldGrudgeSealActionOptions, shadowTaskActionOptions, diplomacyCouncilActionOptions, apprenticeExchangeActionOptions, guestStayTargets, guestStayActionOptions, campDebtActionOptions, ashCountActionOptions, personalTokenOptions, renownPledgeOptions, personalDarkOathOptions, emergencyChoiceActionOptions, mutualAidActionOptions, disasterCoopActionOptions, caravanActionOptions, nomadVisitorActionOptions, nomadVisitorAftereffectActionOptions, farReplyActionOptions, travelerSongActionOptions, travelerTuneLineageActionOptions, collectionActionOptions, caveRaceActionOptions, caveReturnActionOptions, oralMapActionOptions, tribeCustomOptions, activeBoundaryFlag, activeBoundaryProgressText, tribeTargetProgressPercent, caveExpeditionReady, caveRuneFindsBonus, hasTribeWorkbench, hasTribeRoad, beastSpecialtyOptions, activeBeastTask, activeBeastTaskText, celebrationChoiceOptions, seasonTabooOptions, standingRitualOptions, standingRitualStances, communalCookOptions, communalCookIngredients, drumRhythmOptions, drumRhythmBeats, groupEmoteOptions, campShiftOptions, campCouncilActionOptions, wonderActionOptions, consensusFireActionOptions, lostTechSourceOptions, lostTechOptions, craftLegacyStyleOptions, sacredFireDestinationOptions, sacredFireStepOptions, mentorshipFocusOptions, nightOutingOptions, dreamOmenSources, dreamOmenActions, ancestorQuestionOptions, ancestorQuestionAnswers, oldCampEchoActionOptions, borderTheaterActionOptions, fogTrailActionOptions, forbiddenEdgeActionOptions, forbiddenEdgeRouteProofActionOptions, trailMarkerTypes, trailMarkerActions, neutralSanctuaryActions, campTrialOptions, standingRitualLandmarkBonuses, migrationPlanOptions, activeMigrationPlan, selectedCavePlan, caveExpeditionStatusText, activeCaveNode, caveRouteComplete, caveRouteProgressPercent, tribeRoadmapItems, sortedTribeMembers, canStartVote, canReviewApplications, tribeApplications, voteRules, voteRuleHint, canNominate, canNominateSelfLeader, canGovernMember }
}
