import G6 from '@antv/g6'

const comboPalette = [
  { fill: 'rgba(125, 211, 252, 0.12)', stroke: 'rgba(14, 165, 233, 0.38)' },
  { fill: 'rgba(196, 181, 253, 0.13)', stroke: 'rgba(124, 58, 237, 0.34)' },
  { fill: 'rgba(187, 247, 208, 0.13)', stroke: 'rgba(22, 163, 74, 0.34)' },
  { fill: 'rgba(253, 230, 138, 0.14)', stroke: 'rgba(217, 119, 6, 0.36)' },
  { fill: 'rgba(251, 207, 232, 0.14)', stroke: 'rgba(219, 39, 119, 0.34)' }
]

let isThemeRegistered = false
const graphMotionRegistry = new WeakMap()

export const getContainerSize = (el, fallbackWidth, fallbackHeight) => {
  if (!el) return { width: fallbackWidth, height: fallbackHeight }
  const width = el.clientWidth || el.offsetWidth || fallbackWidth
  const height = el.clientHeight || el.offsetHeight || fallbackHeight
  return { width, height }
}

export const getComboStyle = (comboId) => {
  if (!comboId) {
    return {
      fill: 'rgba(148, 163, 184, 0.08)',
      stroke: 'rgba(100, 116, 139, 0.22)'
    }
  }

  let hash = 0
  for (let i = 0; i < comboId.length; i++) {
    hash = comboId.charCodeAt(i) + ((hash << 5) - hash)
  }

  return comboPalette[Math.abs(hash) % comboPalette.length]
}

export const getWobble = (id, timestamp) => {
  if (!id) return { x: 0, y: 0 }

  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  const rangeX = 25
  const rangeY = 30
  const speed = 3000 + (Math.abs(hash) % 2000)
  const phase = ((Math.abs(hash) % 100) / 100) * Math.PI * 2
  const t = (timestamp / speed) * Math.PI * 2 + phase

  return {
    x: Math.sin(t) * rangeX,
    y: Math.cos(t * 1.5) * rangeY
  }
}

const getItemId = (item) => {
  if (!item) return ''
  if (typeof item.getID === 'function') return String(item.getID())
  const model = typeof item.getModel === 'function' ? item.getModel() : null
  return String(model?.id ?? '')
}

const syncGraphMotionBases = (graph, state) => {
  if (!graph || !state) return

  graph.getNodes().forEach((node) => {
    const model = node.getModel()
    if (!Number.isFinite(model?.x) || !Number.isFinite(model?.y)) return
    state.basePositions.set(String(model.id), { x: model.x, y: model.y })
  })
}

export const stopGraphFloatAnimation = (graph) => {
  if (!graph) return

  const state = graphMotionRegistry.get(graph)
  if (!state) return

  if (state.frameId) {
    cancelAnimationFrame(state.frameId)
  }

  graph.off('node:dragstart', state.handleDragStart)
  graph.off('node:dragend', state.handleDragEnd)
  graph.off('afterlayout', state.handleAfterLayout)
  graphMotionRegistry.delete(graph)
}

export const startGraphFloatAnimation = (graph, options = {}) => {
  if (!graph) return

  stopGraphFloatAnimation(graph)

  const state = {
    amplitudeX: options.amplitudeX ?? 0.22,
    amplitudeY: options.amplitudeY ?? 0.22,
    basePositions: new Map(),
    draggedNodeId: '',
    frameId: 0
  }

  state.handleDragStart = (event) => {
    state.draggedNodeId = getItemId(event?.item)
  }

  state.handleDragEnd = (event) => {
    const item = event?.item
    const model = typeof item?.getModel === 'function' ? item.getModel() : null
    if (model?.id != null && Number.isFinite(model.x) && Number.isFinite(model.y)) {
      state.basePositions.set(String(model.id), { x: model.x, y: model.y })
    }
    state.draggedNodeId = ''
  }

  state.handleAfterLayout = () => {
    syncGraphMotionBases(graph, state)
  }

  graph.on('node:dragstart', state.handleDragStart)
  graph.on('node:dragend', state.handleDragEnd)
  graph.on('afterlayout', state.handleAfterLayout)

  syncGraphMotionBases(graph, state)

  const animate = () => {
    if (graph.get('destroyed')) {
      graphMotionRegistry.delete(graph)
      return
    }

    const timestamp = performance.now()
    let hasPositionChange = false

    graph.getNodes().forEach((node) => {
      const model = node.getModel()
      const id = String(model?.id ?? '')
      if (!id || !Number.isFinite(model?.x) || !Number.isFinite(model?.y)) return

      if (state.draggedNodeId === id) {
        state.basePositions.set(id, { x: model.x, y: model.y })
        return
      }

      const basePosition = state.basePositions.get(id)
      if (!basePosition) {
        state.basePositions.set(id, { x: model.x, y: model.y })
        return
      }

      const wobble = getWobble(id, timestamp)
      const nextX = basePosition.x + wobble.x * state.amplitudeX
      const nextY = basePosition.y + wobble.y * state.amplitudeY

      if (Math.abs((model.x ?? 0) - nextX) < 0.05 && Math.abs((model.y ?? 0) - nextY) < 0.05) {
        return
      }

      graph.updateItem(node, { x: nextX, y: nextY })
      hasPositionChange = true
    })

    if (hasPositionChange) {
      graph.refreshPositions()
    }

    state.frameId = requestAnimationFrame(animate)
  }

  state.frameId = requestAnimationFrame(animate)
  graphMotionRegistry.set(graph, state)
}

const registerCustomTheme = () => {
  G6.registerNode('breathing-node', {
    draw(cfg, group) {
      const r = (cfg.size || 32) / 2
      const color = cfg.style.fill || '#409EFF'
      const container = group.addGroup()

      const halo = container.addShape('circle', {
        zIndex: -10,
        attrs: {
          x: 0,
          y: 0,
          r: r + 4,
          stroke: 'red',
          lineWidth: 2,
          opacity: 0.6,
          shadowColor: '#fff',
          shadowBlur: 15
        },
        name: 'halo-shape'
      })

      const back1 = container.addShape('circle', {
        zIndex: -5,
        attrs: { x: 0, y: 0, r, fill: color, opacity: 0.4 },
        name: 'back-shape'
      })

      const keyShape = container.addShape('circle', {
        zIndex: 0,
        attrs: {
          x: 0,
          y: 0,
          r,
          fill: color,
          cursor: 'pointer',
          shadowColor: 'rgba(0,0,0,0.3)',
          shadowBlur: 5
        },
        name: 'key-shape',
        draggable: true
      })

      const labelShape = cfg.label
        ? container.addShape('text', {
            attrs: {
              x: 0,
              y: r + 14,
              textAlign: 'center',
              textBaseline: 'middle',
              text: cfg.label,
              fill: '#333',
              fontSize: 12,
              fontWeight: 600,
              stroke: '#fff',
              lineWidth: 2
            },
            name: 'text-shape',
            capture: false
          })
        : null

      halo.animate(
        (ratio) => {
          const hue = ratio * 360
          const hsl = `hsl(${hue}, 100%, 70%)`
          return {
            stroke: hsl,
            shadowColor: hsl
          }
        },
        { repeat: true, duration: 3000, easing: 'easeLinear' }
      )

      back1.animate(
        (ratio) => {
          return {
            r: r + 4 + ratio * 8,
            opacity: 0.32 - ratio * 0.22
          }
        },
        { repeat: true, duration: 2500, easing: 'easeLinear' }
      )

      return keyShape
    }
  }, 'single-node')

  G6.registerEdge('dynamic-edge', {
    draw(cfg, group) {
      const startPoint = cfg.startPoint
      const endPoint = cfg.endPoint

      const shape = group.addShape('path', {
        attrs: {
          stroke: '#6366f1',
          lineWidth: 2,
          path: [['M', startPoint.x, startPoint.y], ['L', endPoint.x, endPoint.y]],
          lineDash: [4, 4],
          lineDashOffset: 0,
          endArrow: { path: G6.Arrow.triangle(6, 8, 6), fill: '#6366f1', d: 6 }
        },
        name: 'edge-shape'
      })

      shape.animate(
        (ratio) => {
          return {
            lineDashOffset: -ratio * 500,
            opacity: 0.7 + ratio * 0.3
          }
        },
        { repeat: true, duration: 2000, easing: 'easeLinear' }
      )

      return shape
    }
  })
}

export const ensureKnowledgeGraphThemeRegistered = () => {
  if (isThemeRegistered) return
  registerCustomTheme()
  isThemeRegistered = true
}
