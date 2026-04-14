import G6 from '@antv/g6'

const comboPalette = [
  { fill: 'rgba(125, 211, 252, 0.12)', stroke: 'rgba(14, 165, 233, 0.38)' },
  { fill: 'rgba(196, 181, 253, 0.13)', stroke: 'rgba(124, 58, 237, 0.34)' },
  { fill: 'rgba(187, 247, 208, 0.13)', stroke: 'rgba(22, 163, 74, 0.34)' },
  { fill: 'rgba(253, 230, 138, 0.14)', stroke: 'rgba(217, 119, 6, 0.36)' },
  { fill: 'rgba(251, 207, 232, 0.14)', stroke: 'rgba(219, 39, 119, 0.34)' }
]

let isThemeRegistered = false

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

const getWobble = (id, timestamp) => {
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

      halo.animate(
        (ratio) => {
          const hue = ratio * 360
          const hsl = `hsl(${hue}, 100%, 70%)`
          const pos = getWobble(cfg.id, performance.now())
          container.setMatrix([1, 0, 0, 0, 1, 0, pos.x, pos.y, 1])
          return { stroke: hsl, shadowColor: hsl }
        },
        { repeat: true, duration: 3000, easing: 'easeLinear' }
      )

      back1.animate(
        { r: r + 8, opacity: 0.05 },
        { repeat: true, duration: 2500, easing: 'easeLinear' }
      )

      if (cfg.label) {
        group.addShape('text', {
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
      }

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
          const now = performance.now()
          const sourceId = typeof cfg.source === 'string' ? cfg.source : cfg.source.id
          const targetId = typeof cfg.target === 'string' ? cfg.target : cfg.target.id
          const sOffset = getWobble(sourceId, now)
          const tOffset = getWobble(targetId, now)

          return {
            path: [
              ['M', startPoint.x + sOffset.x, startPoint.y + sOffset.y],
              ['L', endPoint.x + tOffset.x, endPoint.y + tOffset.y]
            ],
            lineDashOffset: -ratio * 500
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
