export function createGameViewActions(ctx) {
  const { activeBoundaryFlag, activeMigrationPlan, activeTribeCelestialWindow, addSystemMessage, allianceSignalActions, allocationDraft, ancestorQuestionAnswers, ancestorQuestionOptions, apprenticeDraft, apprenticeExchangeActionOptions, ashCountActionOptions, beastSpecialtyLabel, beastTaskOptions, borderTheaterActionOptions, boundaryActionOptions, boundaryTemperatureActionOptions, campCouncilActionOptions, campDebtActionOptions, campShiftDraft, campShiftOptions, campTrialOptions, canGovernMember, canManageTribeTargets, canReviewApplications, caravanActionOptions, caveReturnActionOptions, celebrationChoiceOptions, celestialBranchOptions, collectionActionOptions, commonJudgeActions, communalCookIngredients, communalCookOptions, consensusFireActionOptions, craftLegacyStyleOptions, currentTribe, diplomacyCouncilActionOptions, disasterCoopActionOptions, disputeWitnessActionOptions, dreamOmenActions, dreamOmenSources, drumRhythmBeats, drumRhythmOptions, echoItemExperienceOptions, echoItemTypeOptions, emergencyChoiceActionOptions, farReplyActionOptions, fogTrailActionOptions, forbiddenEdgeActionOptions, forbiddenEdgeRouteProofActionOptions, groupEmoteOptions, maskPerformanceTypes, guestStayActionOptions, guestStayDraft, hasTribeRoad, hasTribeWorkbench, inventory, isCurrentTribeEntity, lostItemActions, mapTileTraceActions, lostTechOptions, lostTechSourceOptions, mentorshipFocusOptions, migrationEncounterActionOptions, migrationPlanOptions, mutualAidActionOptions, namedLandmarkDraft, namedLandmarkOptions, neutralSanctuaryActions, newTribeName, newcomerFateActions, nightOutingOptions, nomadVisitorActionOptions, nomadVisitorAftereffectActionOptions, observerInterventionActions, oathOptions, oldCampEchoActionOptions, oldGrudgeAnchorOptions, oldGrudgeSealActionOptions, oralChainDraft, oralChainReady, oralMapActionOptions, oralContractDraft, oralContractOptions, pendingTribeJoinRequests, personalDarkOathDraft, personalDarkOathOptions, personalIdentity, personalIdentityCooldownText, personalIdentityOptions, personalTokenDraft, personalTokenOptions, playerName, publicSecretActions, renownPledgeDraft, renownPledgeOptions, rumorTruthActions, sacredFireDestinationOptions, sacredFireStepOptions, seasonTabooOptions, shadowTaskActionOptions, sharedPuzzleOptions, showToast, sortedTribeMembers, stanceAnimationForKey, standingRitualLandmarkBonuses, standingRitualOptions, standingRitualStances, stoneTool, tradeDraft, trailMarkerActions, trailMarkerTypes, travelerSongActionOptions, travelerTuneLineageActionOptions, trialGroundActions, tribeAnnouncementDraft, tribeCustomOptions, tribeLawOptions, triggerPlayerActionAnimation, weatherForecastSignOptions, wonderActionOptions, worldRiddlePredictionOptions, getWebSocket, getLocalPlayer } = ctx

  const sendGameMessage = (payload) => {
    const ws = getWebSocket()
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

  const settleMapTileTrace = (traceId, actionKey = '') => {
    if (!traceId) return
    if (sendGameMessage({ type: 'tribe_settle_map_tile_trace', traceId, actionKey })) {
      triggerPlayerActionAnimation(actionKey === 'patrol' ? 'guard' : (actionKey === 'repair' || actionKey === 'clean' ? 'gather' : 'ritual'))
      showToast('正在恢复地块痕迹')
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

  const resolveCaveRaceRoute = (raceId, actionKey = 'leave_marker') => {
    if (!raceId || !actionKey) return
    const action = currentTribe.value?.caveRaceActions?.[actionKey]
    if (sendGameMessage({ type: 'tribe_resolve_cave_race_route', raceId, actionKey })) {
      triggerPlayerActionAnimation(action?.animation || (actionKey === 'cooperate' ? 'ritual' : 'gather'))
      showToast(`正在${action?.label || '处理洞穴竞速路线'}`)
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
    const player = getLocalPlayer()
    if (!player) {
      showToast('还没有当前位置')
      return
    }
    const marker = trailMarkerTypes.value.find((item) => item.key === markerKey)
    if (sendGameMessage({
      type: 'tribe_create_trail_marker',
      markerKey,
      x: player.position.x,
      z: player.position.z
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
    const player = getLocalPlayer()
    if (!player) {
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
      x: player.position.x,
      z: player.position.z
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

  const resolveLostItem = (itemId, actionKey) => {
    if (!itemId || !actionKey) return
    const action = lostItemActions.value.find((item) => item.key === actionKey)
    if (sendGameMessage({ type: 'tribe_resolve_lost_item', itemId, actionKey })) {
      triggerPlayerActionAnimation(actionKey === 'hide' ? 'gather' : actionKey === 'judge' ? 'guard' : 'ritual')
      showToast(`失物已处理：${action?.label || '处理'}`)
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

  const supportMythClaim = (claimId, interpretationKey, methodKey = 'ritual') => {
    if (!claimId || !interpretationKey) return
    const claim = currentTribe.value?.mythClaims?.find((item) => item.id === claimId)
    const interpretation = claim?.interpretations?.find((item) => item.key === interpretationKey)
    const method = claim?.supportMethods?.find((item) => item.key === methodKey)
    if (sendGameMessage({ type: 'tribe_support_myth_claim', claimId, interpretationKey, methodKey })) {
      showToast(`已用${method?.label || '仪式'}支持：${interpretation?.label || '新的说法'}`)
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
        const station = item.stationLabel
          ? `/${item.stationLabel}${item.stationMatched ? '' : '?'}`
          : ''
        return `${item.name || '成员'}-${item.stanceLabel || '见证者'}${station}${bonus}`
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

  const resolveObserverIntervention = (eventId, actionKey) => {
    const tribe = currentTribe.value
    const action = observerInterventionActions.value?.[actionKey]
    if (!tribe?.id || !eventId || !actionKey) return
    if (sendGameMessage({ type: 'tribe_resolve_observer_intervention', targetTribeId: tribe.id, eventId, actionKey })) {
      triggerPlayerActionAnimation(actionKey === 'supply' ? 'gather' : actionKey === 'mediate_word' ? 'cheer' : 'ritual')
      showToast(`旁观介入：${action?.label || '补上一句'}`)
    }
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
      triggerPlayerActionAnimation(['forgive', 'ritual_redeem', 'evidence_redeem'].includes(actionKey) ? 'ritual' : ['market_note', 'diplomatic_fulfill'].includes(actionKey) ? 'cheer' : 'gather')
      showToast(`营地债账已提交：${action?.label || '处理'}`)
    }
  }

  const joinTribeFestival = (festivalId) => {
    if (!festivalId) return
    if (sendGameMessage({ type: 'tribe_join_festival', festivalId })) {
      triggerPlayerActionAnimation('cheer')
      showToast('正在参加部落节日')
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

  const endorseAshLedger = (ledgerId) => {
    if (!ledgerId) return
    if (sendGameMessage({ type: 'tribe_endorse_ash_ledger', ledgerId })) {
      triggerPlayerActionAnimation('ritual')
      showToast('已背书灰烬账谱')
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

  const startOralContract = () => {
    const contractKey = oralContractDraft.value.contractKey
    const option = oralContractOptions.value.find((item) => item.key === contractKey)
    if (!contractKey) {
      showToast('先选择一种口头契约')
      return
    }
    if (sendGameMessage({ type: 'tribe_oral_contract', action: 'start', contractKey, targetId: oralContractDraft.value.targetId || '' })) {
      triggerPlayerActionAnimation('ritual')
      showToast(`已立下口头契约：${option?.label || '约定'}`)
    }
  }

  const fulfillOralContract = (contractId) => {
    if (!contractId) return
    if (sendGameMessage({ type: 'tribe_oral_contract', action: 'fulfill', contractId })) {
      triggerPlayerActionAnimation('cheer')
      showToast('正在兑现口头契约')
    }
  }

  const failOralContract = (contractId) => {
    if (!contractId) return
    if (sendGameMessage({ type: 'tribe_oral_contract', action: 'fail', contractId })) {
      triggerPlayerActionAnimation('guard')
      showToast('已公开这条契约暂时失约')
    }
  }

  const remedyOralContract = (remedyId) => {
    if (!remedyId) return
    if (sendGameMessage({ type: 'tribe_oral_contract', action: 'remedy', remedyId })) {
      triggerPlayerActionAnimation('gather')
      showToast('正在补救口头契约')
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

  const submitWarNarrative = (taskId, actionKey) => {
    if (!taskId || !actionKey) return
    if (sendGameMessage({ type: 'tribe_submit_war_narrative', taskId, actionKey })) {
      showToast('战争叙事已提交')
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

  const startMaskPerformance = (identityKey = '') => {
    const key = identityKey || personalIdentity.value?.key
    const option = maskPerformanceTypes.value.find((item) => item.key === key)
    if (!key) {
      showToast('先选择一个身份')
      return
    }
    if (sendGameMessage({ type: 'tribe_start_mask_performance', identityKey: key })) {
      triggerPlayerActionAnimation(option?.animation || 'ritual')
      showToast(`已发起：${option?.label || '面具身份表演'}`)
    }
  }

  const respondMaskPerformance = (performanceId) => {
    if (!performanceId) return
    if (sendGameMessage({ type: 'tribe_respond_mask_performance', performanceId })) {
      triggerPlayerActionAnimation('cheer')
      showToast('已响应面具身份表演')
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

  const breakSeasonTaboo = (temptationKey = '') => {
    const taboo = currentTribe.value?.seasonTaboo
    if (!taboo) {
      showToast('当前没有可破戒的季节禁忌')
      return
    }
    const temptation = (taboo.temptationOptions || []).find((item) => item.key === temptationKey)
    if (sendGameMessage({ type: 'tribe_break_season_taboo', temptationKey })) {
      triggerPlayerActionAnimation('conflict')
      showToast(`已公开破戒：${temptation?.label || taboo.breakLabel || '破戒'}`)
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

  const completeStandingRitual = (outcomeKey = '') => {
    const ritual = currentTribe.value?.standingRitual
    if (!ritual) {
      showToast('当前没有可以收束的站位仪式')
      return
    }
    if (!canManageTribeTargets.value) {
      showToast('只有首领或长老可以收束站位仪式')
      return
    }
    const outcome = ritual.outcomes?.[outcomeKey]
    if (sendGameMessage({ type: 'tribe_complete_standing_ritual', outcomeKey })) {
      triggerPlayerActionAnimation('cheer')
      showToast(`正在收束：${outcome?.label || ritual.label || '站位仪式'}`)
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

  const respondMigrationEncounter = (encounterId, actionKey) => {
    const action = migrationEncounterActionOptions.value.find((item) => item.key === actionKey)
    if (sendGameMessage({ type: 'tribe_respond_migration_encounter', encounterId, actionKey })) {
      showToast(`已回应迁徙车队：${action?.label || '车队回应'}`)
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

  const respondWeatherTemper = (temperId, actionKey) => {
    if (!currentTribe.value) {
      showToast('请先加入部落')
      return
    }
    const action = Object.entries(currentTribe.value?.weatherTemperActions || {}).find(([key]) => key === actionKey)?.[1]
    if (sendGameMessage({ type: 'tribe_respond_weather_temper', temperId, actionKey })) {
      triggerPlayerActionAnimation(actionKey === 'ritual' ? 'ritual' : 'guard')
      showToast(`已回应天气脾气：${action?.label || '回应'}`)
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

  const resolvePublicSecret = (secretId, actionKey) => {
    if (!secretId || !actionKey) return
    const action = publicSecretActions.value.find((item) => item.key === actionKey)
    if (sendGameMessage({ type: 'tribe_resolve_public_secret', secretId, actionKey })) {
      triggerPlayerActionAnimation(actionKey === 'judge' ? 'guard' : (actionKey === 'reveal' ? 'cheer' : 'ritual'))
      showToast(`公共秘密已提交：${action?.label || '处理'}`)
    }
  }

  const resolveNewcomerFate = (momentId, actionKey) => {
    if (!momentId || !actionKey) return
    const action = newcomerFateActions.value.find((item) => item.key === actionKey)
    if (sendGameMessage({ type: 'tribe_resolve_newcomer_fate', momentId, actionKey })) {
      triggerPlayerActionAnimation(actionKey === 'protect' ? 'guard' : (actionKey === 'believe' ? 'cheer' : 'ritual'))
      showToast(`新人命运已提交：${action?.label || '处理'}`)
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
    const player = getLocalPlayer()
    if (!player) return
    if (sendGameMessage({
      type: 'tribe_claim_flag',
      x: player.position.x,
      z: player.position.z
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
    const action = allianceSignalActions.value.find((item) => item.key === signalKey)
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

  const supportLivingLegend = (candidateId) => {
    if (!candidateId) return
    if (sendGameMessage({ type: 'tribe_respond_living_legend', candidateId, actionKey: 'witness' })) {
      triggerPlayerActionAnimation('ritual')
      showToast('已为活人传说作见证')
    }
  }

  const respondLivingLegend = (candidateId, actionKey = 'witness') => {
    if (!candidateId) return
    const labels = { witness: '见证', elaborate: '补述', question: '质疑' }
    if (sendGameMessage({ type: 'tribe_respond_living_legend', candidateId, actionKey })) {
      triggerPlayerActionAnimation(actionKey === 'question' ? 'guard' : 'ritual')
      showToast(`活人传说已${labels[actionKey] || '表态'}`)
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

  return { sendGameMessage, resolvePersonalConflict, choosePersonalIdentity, performPersonalIdentityAction, revisitMapMemory, revisitOldCampEcho, performBorderTheater, exploreFogTrail, exploreForbiddenEdge, markForbiddenEdgeRouteProof, claimCaveRace, resolveCaveRaceRoute, advanceCaveRescue, organizeCaveReturnMark, createTrailMarker, updateTrailMarker, proposeNamedLandmark, supportNamedLandmark, visitNeutralSanctuary, curateCollectionWall, resolveLostItem, createEchoItem, addEchoItemMemory, transferEchoItem, supportMythClaim, supportHistoryFact, standingParticipantText, standingRitualRewardText, standingRitualLandmarkHint, standingRitualLandmarkBonusText, resolveObserverIntervention, startSkirmish, joinSkirmish, resolveSkirmish, declareWar, joinWar, resolveWar, requestWarTruce, completeWarRepair, completeWarRevival, supportWar, mediateWar, resolveWarDiplomacy, resolveCaravanRoute, resolveNomadVisitor, resolveNomadVisitorAftereffect, startApprenticeExchange, startGuestStay, resolveCampDebt, joinTribeFestival, resolveAshCount, endorseAshLedger, escortCovenantMessenger, sendMutualAidAlert, answerMutualAidAlert, resolveDisasterCoop, respondFarReply, resolveTravelerSong, promoteTravelerSongTune, referenceTravelerTune, createPersonalToken, redeemPersonalToken, callPersonalDebt, settlePersonalDebt, startRenownPledge, fulfillRenownPledge, startOralContract, fulfillOralContract, failOralContract, remedyOralContract, startPersonalDarkOath, revealPersonalDarkOath, completeDarkOathRemedy, completeWarAftermath, completeWarAllyTask, submitWarNarrative, createTribe, joinTribe, reviewTribeApplication, contributeAllResources, advanceTribeTarget, setTribeAnnouncement, returnToTribeCamp, buildTribeStructure, unlockTribeRune, startTribeRitual, startTribeFeast, startCommunalCook, contributeCommunalCook, startDrumRhythm, joinDrumRhythm, completeDrumRhythm, performGroupEmote, startMaskPerformance, respondMaskPerformance, recordLostTechFragment, restoreLostTech, establishCraftLegacy, startSacredFireRelay, carrySacredFire, completeSacredFireRelay, joinCelebrationEcho, startMentorship, joinMentorship, completeMentorship, startCampTrial, joinCampTrial, completeCampTrial, startNightOuting, startDreamOmen, resolveDreamOmen, startAncestorQuestion, answerAncestorQuestion, startCampShift, joinCampShift, advanceCampCouncil, contributeWonder, resolveConsensusFire, startTribeVote, castTribeVote, allocateResourcesToMember, createTribeTrade, startTribeScout, craftStoneTool, addOralChainLine, completeOralChain, composeOralEpic, assignBeastTask, chooseBeastSpecialty, chooseSeasonCelebration, chooseSeasonTaboo, observeSeasonTaboo, breakSeasonTaboo, completeSeasonTabooRemedy, startStandingRitual, joinStandingRitual, completeStandingRitual, startMigrationPlan, advanceMigrationPlan, respondMigrationEncounter, chooseCelestialBranch, observeWeatherSign, respondWeatherTemper, enactTribeLaw, upholdTribeLaw, breakTribeLaw, completeLawRemedy, commitTribeCustomPractice, recordSharedPuzzleFragment, completeSharedPuzzle, completeReverseVictory, resolveRumorTruth, resolvePublicSecret, resolveNewcomerFate, solveWorldRiddle, composeOralMap, completeTrialGround, chooseTribeOath, completeOathTask, resolveBoundaryOutcome, completeBoundaryFollowup, resolveEmergencyChoice, completeEmergencyFollowup, patrolControlledSite, relayControlledSite, claimTribeFlag, patrolTribeFlag, resolveBoundaryAction, tuneBoundaryTemperature, sendAllianceSignal, submitCommonJudge, tendDisputeWitness, sealOldGrudge, tendOldGrudge, settleOldGrudgeWake, advanceShadowTask, resolveTribeTrade, completeTradeCreditRepair, supportLivingLegend, respondLivingLegend, punishMember }
}

