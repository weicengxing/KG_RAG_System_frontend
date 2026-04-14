import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import G6 from '@antv/g6'
import request from '@/utils/request'
import { watchTaskProgress, uploadDocumentAsync } from '@/utils/kafkaSSE'
import { getComboStyle, getContainerSize } from './knowledgeGraphG6'

export const useKnowledgeGraphBuild = ({ currentStep, active }) => {
  const selectedFile = ref(null)
  const uploading = ref(false)
  const extracting = ref(false)
  const building = ref(false)
  const buildTime = ref(0)
  const docId = ref('')
  const documentText = ref('')
  const chunks = ref([])
  const triplets = ref([])
  const graphData = ref({ nodes: [], edges: [] })
  const graphScope = ref('current')
  const uploadingAsync = ref(false)
  const uploadProgress = ref(0)
  const uploadStage = ref('')
  const uploadMessage = ref('')
  const sseConnection = ref(null)
  const graphContainer = ref(null)
  const isDisposed = ref(false)
  const resizeBound = ref(false)
  let graphInstance = null

  const graphRegionCount = computed(() => new Set(
    (graphData.value.nodes || [])
      .map(node => node.combo_id || node.comboId)
      .filter(Boolean)
  ).size)

  const graphScopeTitle = computed(() => (
    graphScope.value === 'all' ? '文档分区视图' : '聚焦当前文档视图'
  ))

  const graphScopeHint = computed(() => (
    graphScope.value === 'all'
      ? '每个圆圈代表一个源文档。虚线连接表示跨文档关系。'
      : '聚焦当前文档，同时显示跨文档连接。'
  ))

  const selectedFileName = computed(() => {
    const file = selectedFile.value
    return file ? (file.name || '未选择文件') : ''
  })

  const handleFileChange = (file) => {
    selectedFile.value = file.raw
  }

  const destroyGraph = () => {
    if (!graphInstance) return
    graphInstance.destroy()
    graphInstance = null
  }

  const unbindResize = () => {
    if (!resizeBound.value) return
    window.removeEventListener('resize', handleGraphResize)
    resizeBound.value = false
  }

  const bindResize = () => {
    if (resizeBound.value) return
    window.addEventListener('resize', handleGraphResize, { passive: true })
    resizeBound.value = true
  }

  const splitText = async () => {
    try {
      const res = await request.post('/api/kg/split-text', { doc_id: docId.value })
      if (isDisposed.value) return
      chunks.value = res.data.chunks
      ElMessage.success(`文本分块完成，共 ${chunks.value.length} 个块`)
    } catch (error) {
      ElMessage.error(error.response?.data?.detail || '文本分块失败')
    }
  }

  const showExistingDocDialog = (existingDoc) => {
    const uploadTime = existingDoc.upload_time
      ? new Date(existingDoc.upload_time).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      : '未知'

    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 B'
      const k = 1024
      const sizes = ['B', 'KB', 'MB', 'GB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
    }

    const statusMap = {
      uploaded: { type: 'info', text: '已上传' },
      processing: { type: 'warning', text: '处理中' },
      completed: { type: 'success', text: '已完成' },
      failed: { type: 'danger', text: '处理失败' }
    }

    const statusInfo = statusMap[existingDoc.status] || { type: '', text: existingDoc.status }

    ElMessageBox.alert(
      `
        <div class="doc-detail-content">
          <div class="doc-detail-header">
            <div class="doc-icon">📦</div>
            <div class="doc-title">${existingDoc.filename}</div>
          </div>
          <div class="doc-detail-info">
            <div class="info-item">
              <span class="info-label">文档 ID</span>
              <span class="info-value">${existingDoc.doc_id?.substring(0, 8)}...</span>
            </div>
            <div class="info-item">
              <span class="info-label">上传时间</span>
              <span class="info-value">${uploadTime}</span>
            </div>
            <div class="info-item">
              <span class="info-label">文件大小</span>
              <span class="info-value">${formatFileSize(existingDoc.file_size)}</span>
            </div>
            <div class="info-item">
              <span class="info-label">文档字数</span>
              <span class="info-value">${existingDoc.text_length?.toLocaleString() || 0} 字符</span>
            </div>
            <div class="info-item">
              <span class="info-label">处理状态</span>
              <span class="info-value status-tag">${statusInfo.text}</span>
            </div>
          </div>
          <div class="doc-detail-footer">
            <span>点击确认后将直接加载该文档的知识图谱</span>
          </div>
        </div>
      `,
      '文档已存在',
      {
        confirmButtonText: '确认加载',
        cancelButtonText: '取消',
        showCancelButton: true,
        dangerouslyUseHTMLString: true,
        customClass: 'existing-doc-dialog',
        distinguishCancelAndClose: true,
        callback: async (action) => {
          if (action !== 'confirm') return
          docId.value = existingDoc.doc_id
          currentStep.value = 3
          await nextTick()

          try {
            await loadGraphData()
            ElMessage.success('成功加载知识图谱')
          } catch {
            ElMessage.error('加载知识图谱失败')
          }
        }
      }
    )
  }

  const uploadDocument = async () => {
    if (!selectedFile.value) return

    uploading.value = true
    try {
      const formData = new FormData()
      formData.append('file', selectedFile.value)

      const res = await request.post('/api/kg/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (isDisposed.value) return

      if (res.data.duplicate) {
        try {
          await ElMessageBox.confirm(
            res.data.message || '该文档已存在，是否覆盖？',
            '文档重复',
            {
              confirmButtonText: '确认覆盖',
              cancelButtonText: '取消',
              type: 'info',
              customClass: 'duplicate-doc-dialog'
            }
          )

          const existingDoc = res.data.existing_doc
          if (existingDoc) {
            showExistingDocDialog(existingDoc)
          }
        } catch {
          console.log('用户取消操作')
        }
        return
      }

      docId.value = res.data.doc_id
      documentText.value = res.data.text_preview
      ElMessage.success('文档上传成功')
      currentStep.value = 1
      await splitText()
    } catch (error) {
      ElMessage.error(error.response?.data?.detail || '文档上传失败')
    } finally {
      uploading.value = false
    }
  }

  const extractEntities = async () => {
    extracting.value = true
    try {
      const res = await request.post('/api/kg/extract-entities', { doc_id: docId.value })
      if (isDisposed.value) return
      triplets.value = res.data.triplets
      ElMessage.success(`实体抽取完成，共 ${triplets.value.length} 个三元组`)
      currentStep.value = 2
    } catch (error) {
      ElMessage.error(error.response?.data?.detail || '实体抽取失败')
    } finally {
      extracting.value = false
    }
  }

  const buildGraph = async () => {
    building.value = true
    try {
      const res = await request.post('/api/kg/build-graph', { doc_id: docId.value })
      if (isDisposed.value) return

      buildTime.value = res.data.elapsed_time
      ElMessage.success(`图谱构建完成，耗时 ${buildTime.value} 秒`)
      currentStep.value = 3
      await nextTick()
      await loadGraphData()
    } catch (error) {
      ElMessage.error(error.response?.data?.detail || '图谱构建失败')
    } finally {
      building.value = false
    }
  }

  const getStageLabel = (stage) => {
    const stageMap = {
      initialized: '初始化',
      parsing: '解析文档',
      chunking: '文本分块',
      extracting: '实体抽取',
      building_graph: '构建图谱',
      completed: '处理完成'
    }
    return stageMap[stage] || stage
  }

  const asyncUploadDocument = async () => {
    if (!selectedFile.value) return

    uploadingAsync.value = true
    uploadProgress.value = 0
    uploadStage.value = 'initializing'
    uploadMessage.value = '正在初始化...'

    try {
      const result = await uploadDocumentAsync(selectedFile.value)
      const { task_id, doc_id: createdDocId } = result
      ElMessage.success('任务已创建，处理器会自动处理...')
      docId.value = createdDocId

      sseConnection.value = watchTaskProgress(task_id, {
        onProgress: (progress, stage, message) => {
          uploadProgress.value = progress
          uploadStage.value = stage
          uploadMessage.value = message
        },
        onCompleted: async () => {
          uploadProgress.value = 100
          uploadMessage.value = '图谱构建完成'
          currentStep.value = 3
          await nextTick()
          await loadGraphData()
        },
        onError: (errorMessage) => {
          ElMessage.error(errorMessage || '处理失败')
        }
      })
    } catch (error) {
      console.error('异步上传失败', error)
      ElMessage.error('上传失败，请重试')
    } finally {
      uploadingAsync.value = false
    }
  }

  const loadGraphData = async () => {
    try {
      const payload = { limit: graphScope.value === 'all' ? 240 : 120 }
      if (graphScope.value !== 'all' && docId.value) {
        payload.doc_id = docId.value
      }

      const res = await request.post('/api/kg/get-graph', payload)
      if (isDisposed.value) return
      graphData.value = res.data.graph

      await nextTick()
      if (!isDisposed.value && active.value) {
        renderGraph()
      }
    } catch {
      ElMessage.error('加载图谱数据失败')
    }
  }

  const handleGraphScopeChange = async () => {
    if (currentStep.value !== 3) return
    await loadGraphData()
  }

  const buildGraphPlugins = () => {
    const tooltip = new G6.Tooltip({
      offsetX: 12,
      offsetY: 12,
      itemTypes: ['node', 'edge'],
      getContent: (event) => {
        const outDiv = document.createElement('div')
        outDiv.style.padding = '10px 12px'
        outDiv.style.maxWidth = '260px'
        outDiv.style.fontSize = '12px'
        outDiv.style.lineHeight = '1.6'
        outDiv.style.color = '#0f172a'

        const item = event?.item
        if (!item) return outDiv

        const type = item.getType?.()
        const model = item.getModel?.() || {}

        if (type === 'node') {
          const sourceDocs = Array.isArray(model.sourceDocumentIds)
            ? model.sourceDocumentIds.join(', ')
            : ''
          outDiv.innerHTML = [
            '<div style="font-weight:700; margin-bottom:6px;">节点</div>',
            `<div><span style="opacity:.7;">Label:</span>${model.label || model.id || ''}</div>`,
            `<div><span style="opacity:.7;">ID:</span>${model.id || ''}</div>`,
            `<div><span style="opacity:.7;">Group:</span>${model.comboLabel || 'Ungrouped'}</div>`,
            `<div><span style="opacity:.7;">Docs:</span>${sourceDocs || '-'}</div>`
          ].join('')
        } else {
          outDiv.innerHTML = [
            '<div style="font-weight:700; margin-bottom:6px;">关系</div>',
            `<div><span style="opacity:.7;">Label:</span>${model.label || ''}</div>`,
            `<div><span style="opacity:.7;">Source:</span>${model.source || ''}</div>`,
            `<div><span style="opacity:.7;">Target:</span>${model.target || ''}</div>`,
            `<div><span style="opacity:.7;">Scope:</span>${model.isCrossCombo ? 'Cross-doc' : 'Intra-doc'}</div>`
          ].join('')
        }

        return outDiv
      }
    })

    const minimap = new G6.Minimap({ size: [180, 110] })
    return [tooltip, minimap]
  }

  const renderGraph = () => {
    if (!graphContainer.value || isDisposed.value) return

    destroyGraph()

    const { width } = getContainerSize(graphContainer.value, 900, 620)
    graphInstance = new G6.Graph({
      container: graphContainer.value,
      width,
      height: 620,
      plugins: buildGraphPlugins(),
      modes: { default: ['drag-canvas', 'zoom-canvas', 'drag-node', 'drag-combo'] },
      defaultNode: {
        size: 34,
        style: {
          fill: 'rgba(59, 130, 246, 0.95)',
          stroke: 'rgba(255,255,255,0.95)',
          lineWidth: 2,
          shadowColor: 'rgba(15, 23, 42, 0.18)',
          shadowBlur: 14
        },
        labelCfg: {
          position: 'bottom',
          offset: 8,
          style: { fontSize: 12, fill: '#0f172a', fontWeight: 600 }
        }
      },
      defaultCombo: {
        type: 'circle',
        padding: [28, 34, 28, 34],
        style: {
          fill: 'rgba(148, 163, 184, 0.08)',
          stroke: 'rgba(100, 116, 139, 0.24)',
          lineWidth: 2,
          lineDash: [8, 6]
        },
        labelCfg: {
          position: 'top',
          offset: 10,
          style: { fontSize: 13, fontWeight: 700, fill: '#334155' }
        }
      },
      defaultEdge: {
        style: {
          stroke: 'rgba(148, 163, 184, 0.7)',
          lineWidth: 2,
          endArrow: {
            path: G6.Arrow.triangle(8, 10, 10),
            fill: 'rgba(148, 163, 184, 0.85)'
          }
        },
        labelCfg: {
          autoRotate: true,
          refY: -8,
          style: {
            fontSize: 11,
            fill: 'rgba(71, 85, 105, 0.9)',
            background: { fill: 'rgba(255,255,255,0.85)', padding: [2, 4, 2, 4], radius: 4 }
          }
        }
      },
      nodeStateStyles: {
        hover: { lineWidth: 3, shadowBlur: 24 },
        selected: { lineWidth: 4 }
      },
      edgeStateStyles: {
        hover: { lineWidth: 3, stroke: 'rgba(59, 130,246,0.9)' }
      },
      layout: {
        type: 'force',
        preventOverlap: true,
        nodeSpacing: 12,
        linkDistance: 160,
        nodeStrength: -220,
        edgeStrength: 0.7,
        damping: 0.9
      }
    })

    const nodes = (graphData.value.nodes || []).map((node) => {
      const label = node.label ?? node.name ?? node.id
      const ntype = node.type ?? node.category ?? ''
      const palette = {
        Person: 'rgba(34,197,94,0.95)',
        Org: 'rgba(168,85,247,0.95)',
        Place: 'rgba(245,158,11,0.95)',
        Concept: 'rgba(59,130,246,0.95)'
      }

      return {
        id: String(node.id),
        label: String(label),
        comboId: node.combo_id ? String(node.combo_id) : undefined,
        comboLabel: node.combo_label ? String(node.combo_label) : '',
        entityId: node.entity_id ? String(node.entity_id) : '',
        sourceDocumentIds: Array.isArray(node.source_document_ids) ? node.source_document_ids : [],
        documentCount: Number(node.document_count || 0),
        sourceChunkIndexes: Array.isArray(node.source_chunk_indexes) ? node.source_chunk_indexes : [],
        style: { fill: palette[ntype] || 'rgba(59, 130, 246, 0.95)' }
      }
    })

    const combos = Array.from(
      (graphData.value.nodes || []).reduce((map, node) => {
        if (!node.combo_id || map.has(node.combo_id)) return map
        map.set(node.combo_id, {
          id: String(node.combo_id),
          label: String(node.combo_label || '来源分区'),
          style: getComboStyle(String(node.combo_id))
        })
        return map
      }, new Map()).values()
    )

    const edges = (graphData.value.edges || []).map((edge, idx) => {
      const isCrossCombo = Boolean(edge.is_cross_combo)
      return {
        id: `edge-${idx}`,
        source: String(edge.source),
        target: String(edge.target),
        label: edge.label ? String(edge.label) : '',
        isCrossCombo,
        style: isCrossCombo
          ? {
              stroke: 'rgba(148, 163, 184, 0.42)',
              lineWidth: 1.4,
              lineDash: [6, 6],
              endArrow: {
                path: G6.Arrow.triangle(8, 10, 10),
                fill: 'rgba(148, 163, 184, 0.45)'
              }
            }
          : undefined
      }
    })

    graphInstance.data({ nodes, edges, combos })
    graphInstance.render()
    graphInstance.fitView(20)

    graphInstance.on('node:mouseenter', (evt) => evt.item && graphInstance.setItemState(evt.item, 'hover', true))
    graphInstance.on('node:mouseleave', (evt) => evt.item && graphInstance.setItemState(evt.item, 'hover', false))
    graphInstance.on('edge:mouseenter', (evt) => evt.item && graphInstance.setItemState(evt.item, 'hover', true))
    graphInstance.on('edge:mouseleave', (evt) => evt.item && graphInstance.setItemState(evt.item, 'hover', false))

    bindResize()
  }

  const handleGraphResize = () => {
    if (!graphInstance || !graphContainer.value || isDisposed.value) return
    const { width } = getContainerSize(graphContainer.value, 900, 620)
    graphInstance.changeSize(width, 620)
    graphInstance.fitView(20)
  }

  const resetPipeline = () => {
    currentStep.value = 0
    selectedFile.value = null
    docId.value = ''
    graphScope.value = 'current'
    documentText.value = ''
    chunks.value = []
    triplets.value = []
    graphData.value = { nodes: [], edges: [] }
    buildTime.value = 0
    destroyGraph()
    unbindResize()
  }

  watch(currentStep, (nextStep, oldStep) => {
    if (oldStep === 3 && nextStep !== 3) {
      destroyGraph()
      unbindResize()
    }
  })

  watch(active, (isActive) => {
    if (!isActive) {
      destroyGraph()
      unbindResize()
      return
    }

    if (currentStep.value === 3) {
      nextTick(() => {
        if (!isDisposed.value) {
          renderGraph()
        }
      })
    }
  })

  onUnmounted(() => {
    isDisposed.value = true
    destroyGraph()
    unbindResize()
    if (sseConnection.value) {
      sseConnection.value.close()
      sseConnection.value = null
    }
  })

  return {
    asyncUploadDocument,
    buildGraph,
    buildTime,
    building,
    chunks,
    documentText,
    extractEntities,
    extracting,
    getStageLabel,
    graphContainer,
    graphData,
    graphRegionCount,
    graphScope,
    graphScopeHint,
    graphScopeTitle,
    handleFileChange,
    handleGraphScopeChange,
    loadGraphData,
    resetPipeline,
    selectedFile,
    selectedFileName,
    triplets,
    uploadDocument,
    uploadMessage,
    uploadProgress,
    uploadStage,
    uploading,
    uploadingAsync
  }
}
