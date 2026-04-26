export function buildTribeHistoryReplay(event = {}, helpers = {}) {
  const { formatHistoryTime, tradeResourceText } = helpers

  event = event || {}
  const related = event.related || {}
  if (related.kind === 'announcement') {
    return {
      title: '公告回放',
      text: related.text || event.detail || '这条公告没有留下正文。',
      meta: [
        related.updatedByName ? `发布者：${related.updatedByName}` : '',
        related.updatedAt ? `发布时间：${formatHistoryTime(related.updatedAt)}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'vote') {
    const statusMap = { active: '进行中', passed: '已通过', rejected: '未通过' }
    return {
      title: '投票回放',
      text: `${related.starterName || '管理者'} 提名 ${related.candidateName || '候选人'} 竞选${related.roleLabel || '职位'}，结果：${statusMap[related.status] || related.status || '未知'}。`,
      meta: [
        `赞成 ${related.yesCount ?? 0}`,
        `反对 ${related.noCount ?? 0}`,
        `成员 ${related.memberCount ?? 0}`,
        related.createdAt ? `发起：${formatHistoryTime(related.createdAt)}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'allocation') {
    const resources = related.resources || {}
    const allocation = related.targetAllocation || {}
    const storage = related.storageAfter || {}
    return {
      title: '分配回放',
      text: `${related.actorName || '管理者'} 向 ${related.targetName || '成员'} 预分配公共资源，方便后续建设与行动。`,
      meta: [
        `分配 木${resources.wood || 0} / 石${resources.stone || 0}`,
        `成员预分配 木${allocation.wood || 0} / 石${allocation.stone || 0}`,
        `仓库剩余 木${storage.wood || 0} / 石${storage.stone || 0}`
      ]
    }
  }
  if (related.kind === 'punishment') {
    return {
      title: '惩罚回放',
      text: `${related.actorName || '管理者'} 惩罚 ${related.targetName || '成员'}：${related.reason || '未记录原因'}。`,
      meta: [
        `扣除贡献 ${related.penalty || 0}`,
        related.createdAt ? `执行：${formatHistoryTime(related.createdAt)}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'cave') {
    return {
      title: '远征回放',
      text: `${related.memberName || '成员'} 完成 ${related.caveLabel || '洞穴'} 远征，推进到深度 ${related.depth || 0}，带回 ${related.finds || 0} 份收获。`,
      meta: [
        related.routeLabel ? `路线 ${related.routeLabel}` : '',
        related.foodSupported ? `补给食物 -${related.foodCost || 0}` : '食物不足，收益折减',
        related.routeFindsBonus ? `路线额外 +${related.routeFindsBonus}` : '',
        related.runeFindsBonus ? `铭文额外 +${related.runeFindsBonus}` : '',
        related.oathFindsBonus ? `誓约额外 +${related.oathFindsBonus}` : '',
        related.discoveryUnlocked ? '发现幽洞回声' : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'world_event') {
    const rewardText = Array.isArray(related.rewardParts) && related.rewardParts.length
      ? related.rewardParts.join(' / ')
      : '无直接奖励'
    return {
      title: '事件回放',
      text: `${related.memberName || '成员'} 在${related.regionLabel || '未知区域'}处理了${related.title || '世界事件'}。`,
      meta: [
        related.eventActionLabel ? `处理方式 ${related.eventActionLabel}` : '',
        `奖励 ${rewardText}`,
        related.discoveryKey ? `发现线索 ${related.discoveryKey}` : '',
        related.rareSpawned ? '连锁触发稀有遗迹' : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'scout') {
    const titles = Array.isArray(related.eventTitles) && related.eventTitles.length
      ? related.eventTitles.join('、')
      : '新的世界事件'
    return {
      title: '侦察回放',
      text: `${related.memberName || '成员'} 派出侦察队，标记了 ${related.regionLabel || '远方区域'}。`,
      meta: [
        `发现 ${titles}`,
        related.createdAt ? `时间：${formatHistoryTime(related.createdAt)}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'oral_epic') {
    return {
      title: '史诗回放',
      text: `${related.composedBy || '长老'} 整理了《${related.title || '部落史诗'}》。`,
      meta: [
        related.summary || '',
        related.renownBonus ? `声望 +${related.renownBonus}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'tribe_oath') {
    return {
      title: '誓约回放',
      text: `${related.chosenBy || '管理者'} 为部落立下${related.label || '部落誓约'}。`,
      meta: [
        related.summary || '',
        related.renownBonus ? `声望 +${related.renownBonus}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'oath_task') {
    return {
      title: '誓约任务回放',
      text: `${related.memberName || '成员'} 完成了 ${related.oathLabel || '部落誓约'} 的「${related.title || '誓约任务'}」。`,
      meta: [
        related.summary || '',
        Array.isArray(related.rewardParts) ? related.rewardParts.join(' / ') : '',
        related.createdAt ? `时间：${formatHistoryTime(related.createdAt)}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'beast_task') {
    return {
      title: '驯养回放',
      text: `${related.memberName || '成员'} 派出幼兽执行${related.taskLabel || '任务'}。`,
      meta: [
        related.summary || '',
        Array.isArray(related.rewardParts) ? related.rewardParts.join(' / ') : '',
        related.beastTitle ? `幼兽成长：${related.beastTitle} Lv.${related.beastLevel || 1}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'beast_specialty') {
    return {
      title: '专长回放',
      text: `${related.memberName || '成员'} 为幼兽选择了${related.specialtyLabel || '专长'}。`,
      meta: [related.summary || ''].filter(Boolean)
    }
  }
  if (related.kind === 'season_celebration') {
    return {
      title: '庆典回放',
      text: `${related.memberName || '管理者'} 举行了${related.choiceLabel || '庆典'}。`,
      meta: [
        related.summary || '',
        Array.isArray(related.rewardParts) ? related.rewardParts.join(' / ') : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'season_objective') {
    return {
      title: '季节回放',
      text: `${related.memberName || '成员'} 完成 ${related.regionLabel || '未知区域'} 的 ${related.title || '季节目标'}。`,
      meta: [
        related.summary || '',
        Array.isArray(related.rewardParts) ? related.rewardParts.join(' / ') : '',
        related.celebrationUnlocked ? '触发跨区域丰收庆典' : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'trade') {
    const statusMap = { active: '进行中', accepted: '已完成', rejected: '已拒绝', cancelled: '已取消', expired: '已失效' }
    const offer = related.offer || {}
    const request = related.request || {}
    return {
      title: '贸易回放',
      text: `${related.fromTribeName || '发起部落'} 出 ${tradeResourceText(offer.resource, offer.amount)}，向 ${related.toTribeName || '目标部落'} 换取 ${tradeResourceText(request.resource, request.amount)}。`,
      meta: [
        `状态 ${statusMap[related.status] || related.status || '未知'}`,
        related.createdAt ? `发布：${formatHistoryTime(related.createdAt)}` : '',
        related.resolvedAt ? `处理：${formatHistoryTime(related.resolvedAt)}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'territory_flag') {
    return {
      title: '领地回放',
      text: `${related.claimedBy || '成员'} 在 (${Math.round(related.x || 0)}, ${Math.round(related.z || 0)}) 插下 ${related.label || '领地旗帜'}。`,
      meta: [
        related.claimNote || '这里成为部落公开宣告的资源活动区',
        related.claimedAt ? `时间：${formatHistoryTime(related.claimedAt)}` : ''
      ].filter(Boolean)
    }
  }
  if (related.kind === 'territory_flag_patrol') {
    return {
      title: '巡查回放',
      text: `${related.memberName || '成员'} 巡查了 ${related.flagLabel || '领地旗帜'}。`,
      meta: [
        related.regionLabel ? `区域 ${related.regionLabel}` : '',
        Array.isArray(related.rewardParts) ? related.rewardParts.join(' / ') : '',
        related.chainUnlocked ? '旗帜巡查连锁触发资源潮汐线索' : '',
        related.createdAt ? `时间：${formatHistoryTime(related.createdAt)}` : ''
      ].filter(Boolean)
    }
  }
  return null
}
