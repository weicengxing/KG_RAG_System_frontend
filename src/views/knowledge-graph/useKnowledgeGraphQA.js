import { computed, nextTick, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import G6 from '@antv/g6'
import request, { createStreamRequest } from '@/utils/request'
import { ensureKnowledgeGraphThemeRegistered, getContainerSize } from './knowledgeGraphG6'

export const useKnowledgeGraphQA = () => {
  const question = ref('')
  const answering = ref(false)
  const messages = ref([])
  const sourceChunks = ref([])
  const displayedChunks = ref([])
  const subgraphData = ref(null)
  const graphEditVisible = ref(false)
  const savingGraphEdits = ref(false)
  const editableSubgraph = ref({ nodes: [], edges: [] })
  const explainTab = ref('chunks')
  const chatScroll = ref(null)
  const conversationId = ref('')
  const typewriterTimers = ref([])
  const availableModels = ref([])
  const selectedModel = ref('')
  const loadingStatus = ref({
    vectorSearch: false,
    graphSearch: false,
    answerGeneration: false
  })
  const subgraphContainer = ref(null)
  const expandVisible = ref(false)
  const expandedContainer = ref(null)
  const isDisposed = ref(false)
  let subgraphInstance = null
  let expandedInstance = null

  const editableNodeOptions = computed(() => (
    (editableSubgraph.value.nodes || []).map(node => ({
      value: String(node.id),
      label: `${node.label || node.id} (${node.type || 'Entity'})`
    }))
  ))

  const generateConversationId = () => (
    `conv_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  )

  const destroySubgraph = () => {
    if (!subgraphInstance) return
    subgraphInstance.destroy()
    subgraphInstance = null
  }

  const destroyExpandedGraph = () => {
    if (!expandedInstance) return
    expandedInstance.destroy()
    expandedInstance = null
  }

  const resetReferenceState = () => {
    sourceChunks.value = []
    displayedChunks.value = []
    subgraphData.value = null
    graphEditVisible.value = false
    editableSubgraph.value = { nodes: [], edges: [] }
    typewriterTimers.value.forEach(timer => clearInterval(timer))
    typewriterTimers.value = []
    destroySubgraph()
  }

  const loadAvailableModels = async () => {
    try {
      const res = await request.get('/api/kg/available-models')
      availableModels.value = res.data.models
      selectedModel.value = res.data.default
    } catch (error) {
      console.error('加载模型列表失败:', error)
      ElMessage.error('加载模型列表失败')
    }
  }

  const newConversation = () => {
    messages.value = []
    resetReferenceState()
    conversationId.value = generateConversationId()
    ElMessage.success('已创建新的对话')
  }

  const cloneSubgraphForEditing = (graph) => {
    const rawNodes = Array.isArray(graph?.nodes) ? graph.nodes : []
    const rawEdges = Array.isArray(graph?.edges) ? graph.edges : []

    return {
      nodes: rawNodes.map(node => ({
        id: String(node.id),
        label: String(node.label ?? node.name ?? ''),
        type: String(node.type ?? 'Entity'),
        current_type: String(node.current_type ?? node.type ?? 'Entity')
      })),
      edges: rawEdges.map(edge => ({
        id: String(edge.id ?? `${edge.source}-${edge.label}-${edge.target}`),
        source: String(edge.source),
        target: String(edge.target),
        label: String(edge.label ?? ''),
        current_label: String(edge.current_label ?? edge.label ?? '')
      }))
    }
  }

  const openGraphEditor = () => {
    if (!subgraphData.value?.nodes?.length) {
      ElMessage.warning('当前没有可编辑的图谱数据')
      return
    }

    editableSubgraph.value = cloneSubgraphForEditing(subgraphData.value)
    graphEditVisible.value = true
  }

  const saveGraphEdits = async () => {
    const nodes = editableSubgraph.value.nodes || []
    const edges = editableSubgraph.value.edges || []

    if (!nodes.length && !edges.length) {
      ElMessage.warning('当前没有可保存的修改')
      return
    }

    const invalidNode = nodes.find(node => !String(node.label || '').trim() || !String(node.type || '').trim())
    if (invalidNode) {
      ElMessage.warning('实体名称和实体类型都不能为空')
      return
    }

    const invalidEdge = edges.find(edge => !String(edge.label || '').trim() || !String(edge.source || '').trim() || !String(edge.target || '').trim())
    if (invalidEdge) {
      ElMessage.warning('关系名称、起点实体和终点实体都不能为空')
      return
    }

    savingGraphEdits.value = true
    try {
      const payload = {
        nodes: nodes.map(node => ({
          id: node.id,
          label: String(node.label).trim(),
          type: String(node.type).trim(),
          current_type: String(node.current_type || node.type).trim()
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: String(edge.label).trim(),
          current_label: String(edge.current_label || edge.label).trim()
        }))
      }

      await request.post('/api/kg/save-graph-edits', payload)

      subgraphData.value = {
        nodes: payload.nodes.map(node => ({ ...node, label: node.label, type: node.type })),
        edges: payload.edges.map(edge => ({ ...edge, label: edge.label }))
      }

      graphEditVisible.value = false
      await nextTick()
      if (!isDisposed.value) {
        renderSubgraph()
      }
      ElMessage.success('图谱修改已提交，正在后台异步保存')
    } catch (error) {
      console.error('保存图谱修改失败:', error)
      ElMessage.error(error.response?.data?.detail || '保存图谱修改失败')
    } finally {
      savingGraphEdits.value = false
    }
  }

  const scrollToBottom = () => {
    nextTick(() => {
      const scrollbar = chatScroll.value?.$el?.querySelector('.el-scrollbar__wrap')
      if (scrollbar) {
        scrollbar.scrollTo({ top: scrollbar.scrollHeight, behavior: 'smooth' })
      }
    })
  }

  const typewriterForChunk = (text, index) => {
    if (!text) return

    displayedChunks.value[index].isTyping = true
    let currentIndex = 0

    const timer = setInterval(() => {
      if (currentIndex < text.length) {
        const escapedChar = text[currentIndex]
          .replace(/&/g, '&')
          .replace(/</g, '<')
          .replace(/>/g, '>')
          .replace(/"/g, '"')
          .replace(/'/g, '&#039;')
        displayedChunks.value[index].content += `<span class="glow-char">${escapedChar}</span>`
        currentIndex += 1
        return
      }

      clearInterval(timer)
      displayedChunks.value[index].isTyping = false
      displayedChunks.value[index].isComplete = true
    }, 25)

    typewriterTimers.value.push(timer)
  }

  const startTypewriterEffect = () => {
    typewriterTimers.value.forEach(timer => clearInterval(timer))
    typewriterTimers.value = []

    displayedChunks.value = sourceChunks.value.map(() => ({
      content: '',
      isTyping: false,
      isComplete: false
    }))

    sourceChunks.value.forEach((chunk, index) => {
      setTimeout(() => {
        typewriterForChunk(chunk.content, index)
      }, index * 200)
    })
  }

  const handleOpenExpand = () => {
    if (!subgraphData.value?.nodes?.length) return
    expandVisible.value = true
  }

  const renderExpandedGraph = async () => {
    if (!expandedContainer.value || !subgraphData.value) return

    ensureKnowledgeGraphThemeRegistered()
    destroyExpandedGraph()

    const width = window.innerWidth
    const height = window.innerHeight

    expandedInstance = new G6.Graph({
      container: expandedContainer.value,
      width,
      height,
      localRefresh: false,
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeSize: 60,
        linkDistance: 250,
        nodeStrength: -1000,
        edgeStrength: 0.4,
        damping: 0.9,
        alphaDecay: 0.02,
        center: [width / 2, height / 2]
      },
      modes: { default: ['drag-canvas', 'zoom-canvas', 'drag-node'] },
      defaultNode: {
        type: 'breathing-node',
        size: 45,
        style: { fill: '#409EFF' },
        labelCfg: {
          position: 'bottom',
          offset: 12,
          style: {
            fontSize: 14,
            fill: '#fff',
            fontWeight: 700,
            stroke: '#000',
            lineWidth: 2
          }
        }
      },
      defaultEdge: {
        type: 'dynamic-edge',
        style: { stroke: '#a5b4fc', lineWidth: 3 }
      }
    })

    const nodes = subgraphData.value.nodes.map(node => ({
      ...node,
      id: String(node.id),
      label: String(node.label ?? node.name ?? node.id),
      x: width / 2 + (Math.random() - 0.5) * 200,
      y: height / 2 + (Math.random() - 0.5) * 200
    }))

    const edges = subgraphData.value.edges.map((edge, index) => ({
      ...edge,
      id: `exp-edge-${index}`,
      source: String(edge.source),
      target: String(edge.target)
    }))

    expandedInstance.data({ nodes, edges })
    expandedInstance.render()
  }

  const renderSubgraph = async () => {
    if (!subgraphContainer.value || !subgraphData.value || isDisposed.value) return

    ensureKnowledgeGraphThemeRegistered()
    destroySubgraph()

    const { width } = getContainerSize(subgraphContainer.value, 520, 420)
    const height = 420

    subgraphInstance = new G6.Graph({
      container: subgraphContainer.value,
      width,
      height,
      localRefresh: false,
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeSize: 40,
        linkDistance: 100,
        nodeStrength: -400,
        edgeStrength: 0.5,
        damping: 0.9,
        alphaDecay: 0.03,
        center: [width / 2, height / 2]
      },
      modes: { default: ['drag-canvas', 'zoom-canvas', 'drag-node'] },
      defaultNode: {
        type: 'breathing-node',
        size: 32,
        style: {
          lineWidth: 0,
          shadowColor: 'rgba(255, 255, 255, 0.6)',
          shadowBlur: 10
        },
        labelCfg: {
          position: 'bottom',
          offset: 8,
          style: {
            fontSize: 12,
            fill: '#1e293b',
            fontWeight: 700,
            background: { fill: 'rgba(255,255,255,0.7)', padding: [2, 4], radius: 4 }
          }
        }
      },
      defaultEdge: {
        type: 'dynamic-edge',
        style: {
          stroke: '#6366f1',
          lineWidth: 2,
          shadowColor: '#6366f1',
          shadowBlur: 5,
          endArrow: { path: G6.Arrow.triangle(6, 8, 6), fill: '#6366f1', d: 6 }
        },
        labelCfg: {
          autoRotate: true,
          style: {
            fontSize: 10,
            fill: '#64748b',
            background: { fill: '#ffffff', padding: [2, 4], radius: 2 }
          }
        }
      }
    })

    subgraphInstance.on('node:mouseenter', (event) => subgraphInstance.setItemState(event.item, 'hover', true))
    subgraphInstance.on('node:mouseleave', (event) => subgraphInstance.setItemState(event.item, 'hover', false))
    subgraphInstance.data({ nodes: [], edges: [] })
    subgraphInstance.render()

    const rawNodes = subgraphData.value.nodes || []
    const rawEdges = subgraphData.value.edges || []
    const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1']

    const processedNodes = rawNodes.map((node, index) => ({
      id: String(node.id),
      label: String(node.label ?? node.name ?? node.id),
      type: String(node.type ?? 'Entity'),
      style: { fill: palette[index % palette.length] },
      x: width / 2 + (Math.random() - 0.5) * 50,
      y: height / 2 + (Math.random() - 0.5) * 50
    }))

    const processedEdges = rawEdges.map((edge, index) => ({
      id: String(edge.id ?? `subedge-${index}`),
      source: String(edge.source),
      target: String(edge.target),
      label: edge.label || '',
      current_label: String(edge.current_label ?? edge.label ?? '')
    }))

    const addItems = async () => {
      for (const node of processedNodes) {
        if (isDisposed.value || !subgraphInstance) return
        subgraphInstance.addItem('node', node)
        subgraphInstance.layout()
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      for (const edge of processedEdges) {
        if (isDisposed.value || !subgraphInstance) return
        const source = subgraphInstance.findById(edge.source)
        const target = subgraphInstance.findById(edge.target)
        if (source && target) {
          subgraphInstance.addItem('edge', edge)
        }
        await new Promise(resolve => setTimeout(resolve, 200))
      }

      if (subgraphInstance) {
        subgraphInstance.fitView(40)
      }
    }

    addItems()
  }

  const askQuestion = async () => {
    if (!question.value.trim() || answering.value) return

    messages.value.push({
      role: 'user',
      content: question.value,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })

    const currentQuestion = question.value
    question.value = ''
    answering.value = true
    loadingStatus.value = { vectorSearch: true, graphSearch: true, answerGeneration: true }
    scrollToBottom()

    const assistantMessage = {
      role: 'assistant',
      content: '',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    messages.value.push(assistantMessage)
    const assistantIndex = messages.value.length - 1

    resetReferenceState()

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        ElMessage.error('请先登录')
        messages.value.splice(assistantIndex, 1)
        return
      }

      const response = await createStreamRequest('/api/kg/ask-parallel-stream', {
        question: currentQuestion,
        stream: true,
        conversation_id: conversationId.value,
        model_name: selectedModel.value
      })

      if (!response.ok) {
        if (response.status === 401) {
          ElMessage.error('登录已过期，请重新登录')
        } else {
          throw new Error('请求失败')
        }
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)

            if (data.type === 'vector_chunks') {
              sourceChunks.value = data.data || []
              loadingStatus.value.vectorSearch = false
              startTypewriterEffect()
            } else if (data.type === 'graph_data') {
              subgraphData.value = data.data || null
              loadingStatus.value.graphSearch = false
              await nextTick()
              if (!isDisposed.value) {
                renderSubgraph()
              }
            } else if (data.type === 'answer') {
              assistantMessage.content += data.content
              messages.value[assistantIndex] = { ...assistantMessage }
              scrollToBottom()
            } else if (data.type === 'answer_done') {
              loadingStatus.value.answerGeneration = false
            }
          } catch (error) {
            console.error('解析SSE数据失败', error, line)
          }
        }
      }

      scrollToBottom()
    } catch (error) {
      console.error('问答失败:', error)
      ElMessage.error(error.message || '问答失败')
      messages.value.splice(assistantIndex, 1)
    } finally {
      answering.value = false
      loadingStatus.value = {
        vectorSearch: false,
        graphSearch: false,
        answerGeneration: false
      }
      setTimeout(scrollToBottom, 100)
    }
  }

  const formatMessageContent = (content, role) => {
    if (!content) return ''

    if (role === 'assistant') {
      let formatted = content
      formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      formatted = formatted.replace(/__(.+?)__/g, '<b>$1</b>')
      formatted = formatted.replace(/\*(.+?)\*/g, '<i>$1</i>')
      formatted = formatted.replace(/_(.+?)_/g, '<i>$1</i>')
      formatted = formatted.replace(/^#{1,6}\s+/gm, '')
      formatted = formatted.replace(/^[\*\-]\s+/gm, '• ')
      formatted = formatted.replace(/```[\s\S]*?```/g, match => match.replace(/```\w*\n?/g, ''))
      formatted = formatted.replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
      formatted = formatted.split('\n').map(line => (
        line.trim() === '' ? '<div class="paragraph-space"></div>' : `<p class="text-line">${line}</p>`
      )).join('')

      const emojiRegex = /([\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{E000}-\u{F8FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{203C}-\u{3299}])/gu
      return formatted.replace(emojiRegex, '<span class="emoji-char">$1</span>')
    }

    return content.replace(/\n/g, '<br>')
  }

  conversationId.value = generateConversationId()
  loadAvailableModels()

  onUnmounted(() => {
    isDisposed.value = true
    destroySubgraph()
    destroyExpandedGraph()
    typewriterTimers.value.forEach(timer => clearInterval(timer))
    typewriterTimers.value = []
  })

  return {
    answering,
    askQuestion,
    availableModels,
    chatScroll,
    destroyExpandedGraph,
    displayedChunks,
    editableNodeOptions,
    editableSubgraph,
    expandVisible,
    expandedContainer,
    explainTab,
    formatMessageContent,
    graphEditVisible,
    handleOpenExpand,
    loadingStatus,
    messages,
    newConversation,
    openGraphEditor,
    question,
    renderExpandedGraph,
    saveGraphEdits,
    savingGraphEdits,
    selectedModel,
    sourceChunks,
    subgraphContainer,
    subgraphData
  }
}
