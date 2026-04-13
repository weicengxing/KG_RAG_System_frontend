
import { ref, nextTick, computed, watch, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Upload, UploadFilled, Document, Search, Share, Loading, Position, Promotion } from '@element-plus/icons-vue'
import G6 from '@antv/g6'
import request, { createStreamRequest } from '@/utils/request'
import { watchTaskProgress, uploadDocumentAsync } from '@/utils/kafkaSSE'

// 褰撳墠鏍囩椤?
const activeTab = ref('build')

// ==================== 鍥捐氨鏋勫缓鐩稿叧鐘舵€?====================
const currentStep = ref(0)
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

// ==================== 寮傛涓婁紶 Kafka + SSE鐩稿叧 ====================
const uploadingAsync = ref(false)  // 寮傛涓婁紶鐘舵€?
const uploadProgress = ref(0)      // 涓婁紶杩涘害 (0-100)
const uploadStage = ref('')        // 褰撳墠闃舵鏍囩
const uploadMessage = ref('')      // 杩涘害娑堟伅
const sseConnection = ref(null)    // SSE 杩炴帴
const expandVisible = ref(false)
const expandedContainer = ref(null)
let expandedInstance = null

// G6 鍥惧舰瀹瑰櫒寮曠敤
const graphContainer = ref(null)
const subgraphContainer = ref(null)

const comboPalette = [
  { fill: 'rgba(125, 211, 252, 0.12)', stroke: 'rgba(14, 165, 233, 0.38)' },
  { fill: 'rgba(196, 181, 253, 0.13)', stroke: 'rgba(124, 58, 237, 0.34)' },
  { fill: 'rgba(187, 247, 208, 0.13)', stroke: 'rgba(22, 163, 74, 0.34)' },
  { fill: 'rgba(253, 230, 138, 0.14)', stroke: 'rgba(217, 119, 6, 0.36)' },
  { fill: 'rgba(251, 207, 232, 0.14)', stroke: 'rgba(219, 39, 119, 0.34)' }
]

const getComboStyle = (comboId) => {
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

// ==================== G6 鑷畾涔夎妭鐐瑰拰杈?====================

// [1] 鐢熸垚鑺傜偣鎽囨憜鍔ㄧ敾鐨勪綅缃亸绉?
// 浼犲叆鑺傜偣 ID 鍜屾椂闂存埑锛岃繑鍥炶妭鐐逛綅缃殑寰皬鍋忕Щ閲?(x, y)
// 杈圭殑鍔ㄧ敾闇€瑕佹牴鎹繛鎺ョ殑婧愯妭鐐瑰拰鐩爣鑺傜偣鐨勪綅缃姩鎬佽绠?
const getWobble = (id, timestamp) => {
  if (!id) return { x: 0, y: 0 };
  
  // A. 鐢熸垚鑺傜偣 ID 鐨勫搱甯屽€硷紝纭繚鐩稿悓 ID 浜х敓鐩稿悓鐨勯殢鏈哄亸绉?
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // B. 鏍规嵁鍝堝笇鍊肩敓鎴愬亸绉诲弬鏁?
  const rangeX = 25; 
  const rangeY = 30; 
  const speed = 3000 + (Math.abs(hash) % 2000); // 鍛ㄦ湡 3000~5000
  const phase = (Math.abs(hash) % 100) / 100 * Math.PI * 2; // 鐩镐綅
  
  // C. 璁＄畻鍋忕Щ閲?
  const t = (timestamp / speed) * Math.PI * 2 + phase;
  const dx = Math.sin(t) * rangeX;
  const dy = Math.cos(t * 1.5) * rangeY;
  
  return { x: dx, y: dy };
};

const registerCustomTheme = () => {
  
  // ==================== 1. 鍛煎惛鍔ㄧ敾鑺傜偣 ====================
  G6.registerNode('breathing-node', {
    draw(cfg, group) {
      const r = (cfg.size || 32) / 2;
      const color = cfg.style.fill || '#409EFF';

      // 瀹瑰櫒缁?
      const container = group.addGroup();

      // A. 鍏夋檿鏁堟灉
      const halo = container.addShape('circle', {
        zIndex: -10,
        attrs: {
          x: 0, y: 0, r: r + 4, 
          stroke: 'red', lineWidth: 2, opacity: 0.6, 
          shadowColor: '#fff', shadowBlur: 15
        },
        name: 'halo-shape'
      });

      // B. 鑳屾櫙鍦?
      const back1 = container.addShape('circle', {
        zIndex: -5,
        attrs: { x: 0, y: 0, r: r, fill: color, opacity: 0.4 },
        name: 'back-shape'
      });

      // C. 涓讳綋鍦嗗舰
      const keyShape = container.addShape('circle', {
        zIndex: 0,
        attrs: {
          x: 0, y: 0, r: r, fill: color, cursor: 'pointer',
          shadowColor: 'rgba(0,0,0,0.3)', shadowBlur: 5
        },
        name: 'key-shape',
        draggable: true
      });

      // --- 鍔ㄧ敾鏁堟灉 - 鍛煎惛鍔ㄧ敾 ---
      // 鍏夋檿鍔ㄧ敾锛氬姩鎬佹敼鍙橀鑹插苟浜х敓鎽囨憜鏁堟灉
      halo.animate(
        (ratio) => {
          // 1. 棰滆壊寰幆
          const hue = ratio * 360;
          const hsl = `hsl(${hue}, 100%, 70%)`;
          
          // 2. 浣嶇疆鎽囨憜
          const now = performance.now();
          const pos = getWobble(cfg.id, now);
          
          // 璁剧疆瀹瑰櫒缁勭殑鍙樻崲鐭╅樀瀹炵幇浣嶇疆鍋忕Щ
          container.setMatrix([1, 0, 0, 0, 1, 0, pos.x, pos.y, 1]);

          // 杩斿洖灞炴€у彉鍖?
          return { stroke: hsl, shadowColor: hsl };
        },
        { repeat: true, duration: 3000, easing: 'easeLinear' }
      );

      // 鑳屾櫙鍦嗗姩鐢伙細杞诲井缂╂斁
      back1.animate(
        { r: r + 8, opacity: 0.05 },
        { repeat: true, duration: 2500, easing: 'easeLinear' }
      );

      // Label
      if (cfg.label) {
        group.addShape('text', {
          attrs: {
            x: 0, y: r + 14, textAlign: 'center', textBaseline: 'middle',
            text: cfg.label, fill: '#333', fontSize: 12, fontWeight: 600,
            stroke: '#fff', lineWidth: 2
          },
          name: 'text-shape',
          capture: false
        });
      }

      return keyShape;
    }
  }, 'single-node');


  // ==================== 2. 鍔ㄦ€佹祦鍔ㄨ竟 ====================
  G6.registerEdge('dynamic-edge', {
    draw(cfg, group) {
      const startPoint = cfg.startPoint;
      const endPoint = cfg.endPoint;
      
      const shape = group.addShape('path', {
        attrs: {
          stroke: '#6366f1', lineWidth: 2,
          path: [['M', startPoint.x, startPoint.y], ['L', endPoint.x, endPoint.y]],
          lineDash: [4, 4], lineDashOffset: 0,
          endArrow: { path: G6.Arrow.triangle(6, 8, 6), fill: '#6366f1', d: 6 }
        },
        name: 'edge-shape'
      });

      shape.animate(
        (ratio) => {
          const now = performance.now();
          
          // 鑾峰彇杩炴帴鐨勮妭鐐逛綅缃亸绉?
          const sourceId = typeof cfg.source === 'string' ? cfg.source : cfg.source.id;
          const targetId = typeof cfg.target === 'string' ? cfg.target : cfg.target.id;
          
          const sOffset = getWobble(sourceId, now);
          const tOffset = getWobble(targetId, now);
          
          const newSx = startPoint.x + sOffset.x;
          const newSy = startPoint.y + sOffset.y;
          const newTx = endPoint.x + tOffset.x;
          const newTy = endPoint.y + tOffset.y;
          
          const dashOffset = -ratio * 500; 

          return {
            path: [['M', newSx, newSy], ['L', newTx, newTy]],
            lineDashOffset: dashOffset
          };
        },
        { repeat: true, duration: 2000, easing: 'easeLinear' }
      );

      return shape;
    }
  });
}

// ==================== 鍏ㄥ睆鍥捐氨鐩稿叧鍔熻兘 ====================
// 1. 鎵撳紑鍏ㄥ睆
const handleOpenExpand = () => {
  if (!subgraphData.value || !subgraphData.value.nodes?.length) return
  expandVisible.value = true
}

// 2. 閿€姣佸叏灞忓浘璋?
const destroyExpandedGraph = () => {
  if (expandedInstance) {
    expandedInstance.destroy()
    expandedInstance = null
  }
}

// 3. 娓叉煋鍏ㄥ睆鍥捐氨
const renderExpandedGraph = async () => {
  if (!expandedContainer.value) return
  if (!subgraphData.value) return

  // 鍏堥攢姣?
  destroyExpandedGraph()

  // 娉ㄥ唽鑷畾涔変富棰?
  if (!isThemeRegistered) {
    registerCustomTheme()
    isThemeRegistered = true
  }

  // 鑾峰彇绐楀彛灏哄
  const width = window.innerWidth
  const height = window.innerHeight

  // 鍒涘缓鍥捐氨瀹炰緥
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
    modes: {
      default: ['drag-canvas', 'zoom-canvas', 'drag-node']
    },
    defaultNode: {
      type: 'breathing-node',
      size: 45,
      style: {
        fill: '#409EFF',
      },
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
      style: {
        stroke: '#a5b4fc',
        lineWidth: 3
      }
    }
  })

  // 澶勭悊鑺傜偣鏁版嵁
  const nodes = subgraphData.value.nodes.map(n => ({
    ...n,
    id: String(n.id),
    label: String(n.label ?? n.name ?? n.id),
    x: width / 2 + (Math.random() - 0.5) * 200,
    y: height / 2 + (Math.random() - 0.5) * 200
  }))

  const edges = subgraphData.value.edges.map((e, i) => ({
    ...e,
    id: `exp-edge-${i}`,
    source: String(e.source),
    target: String(e.target)
  }))

  expandedInstance.data({ nodes, edges })
  expandedInstance.render()
}

// ==================== 鐘舵€佸彉閲?====================
let isThemeRegistered = false;
let graphInstance = null
let subgraphInstance = null
const isDisposed = ref(false)
const resizeBound = ref(false)

const selectedFileName = computed(() => {
  const f = selectedFile.value
  if (!f) return ''
  return f.name || '鏈€夋嫨鏂囦欢'
})

const handleFileChange = (file) => {
  selectedFile.value = file.raw
}

const destroyGraphs = () => {
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }
  if (subgraphInstance) {
    subgraphInstance.destroy()
    subgraphInstance = null
  }
}

const unbindResize = () => {
  if (resizeBound.value) {
    window.removeEventListener('resize', handleGraphResize)
    resizeBound.value = false
  }
}

const bindResize = () => {
  if (!resizeBound.value) {
    window.addEventListener('resize', handleGraphResize, { passive: true })
    resizeBound.value = true
  }
}

const getContainerSize = (el, fallbackWidth, fallbackHeight) => {
  if (!el) return { width: fallbackWidth, height: fallbackHeight }
  const width = el.clientWidth || el.offsetWidth || fallbackWidth
  const height = el.clientHeight || el.offsetHeight || fallbackHeight
  return { width, height }
}

// 涓婁紶鏂囨。
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

    // 妫€鏌ユ槸鍚︿负閲嶅鏂囨。
    if (res.data.duplicate) {
      try {
        await ElMessageBox.confirm(
          res.data.message || '璇ユ枃妗ｅ凡瀛樺湪锛屾槸鍚﹁鐩栵紵',
          '鏂囨。閲嶅',
          {
            confirmButtonText: '纭瑕嗙洊',
            cancelButtonText: '鍙栨秷',
            type: 'info',
            customClass: 'duplicate-doc-dialog'
          }
        )

        const existingDoc = res.data.existing_doc
        if (existingDoc) {
          showExistingDocDialog(existingDoc)
        }
      } catch (error) {
        console.log('鐢ㄦ埛鍙栨秷鎿嶄綔')
      }
      uploading.value = false
      return
    }

    docId.value = res.data.doc_id
    documentText.value = res.data.text_preview

    ElMessage.success('鏂囨。涓婁紶鎴愬姛')

    // 杩涘叆涓嬩竴姝?
    currentStep.value = 1
    await splitText()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '鏂囨。涓婁紶澶辫触')
  } finally {
    uploading.value = false
  }
}

// 鏄剧ず宸插瓨鍦ㄦ枃妗ｇ殑瀵硅瘽妗?
const showExistingDocDialog = (existingDoc) => {
  // 鏍煎紡鍖栦笂浼犳椂闂?
  const uploadTime = existingDoc.upload_time 
    ? new Date(existingDoc.upload_time).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : '鏈煡'

  // 鏍煎紡鍖栨枃浠跺ぇ灏?
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 鐘舵€佹槧灏?
  const statusMap = {
    'uploaded': { type: 'info', text: '宸蹭笂浼? },
    'processing': { type: 'warning', text: '澶勭悊涓? },
    'completed': { type: 'success', text: '宸插畬鎴? },
    'failed': { type: 'danger', text: '澶勭悊澶辫触' }
  }

  const statusInfo = statusMap[existingDoc.status] || { type: '', text: existingDoc.status }

  ElMessageBox.alert(
    `
      <div class="doc-detail-content">
        <div class="doc-detail-header">
          <div class="doc-icon">馃搫</div>
          <div class="doc-title">${existingDoc.filename}</div>
        </div>
        
        <div class="doc-detail-info">
          <div class="info-item">
            <span class="info-label">鏂囨。ID</span>
            <span class="info-value">${existingDoc.doc_id?.substring(0, 8)}...</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">涓婁紶鏃堕棿</span>
            <span class="info-value">${uploadTime}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">鏂囦欢澶у皬</span>
            <span class="info-value">${formatFileSize(existingDoc.file_size)}</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">鏂囨。瀛楁暟</span>
            <span class="info-value">${existingDoc.text_length?.toLocaleString() || 0} 瀛楃</span>
          </div>
          
          <div class="info-item">
            <span class="info-label">澶勭悊鐘舵€?/span>
            <span class="info-value status-tag">${statusInfo.text}</span>
          </div>
        </div>
        
        <div class="doc-detail-footer">
          <el-icon class="check-icon"><Check /></el-icon>
          <span>鐐瑰嚮纭灏嗙洿鎺ュ姞杞借鏂囨。鐨勭煡璇嗗浘璋?/span>
        </div>
      </div>
    `,
    '鏂囨。宸插瓨鍦?,
    {
      confirmButtonText: '纭鍔犺浇',
      cancelButtonText: '鍙栨秷',
      showCancelButton: true,
      dangerouslyUseHTMLString: true,
      customClass: 'existing-doc-dialog',
      distinguishCancelAndClose: true,
      callback: async (action) => {
        if (action === 'confirm') {
          docId.value = existingDoc.doc_id
          
          // 璺宠浆鍒板浘璋卞睍绀?
          currentStep.value = 3
          
          // 绛夊緟 DOM 鏇存柊
          await nextTick()
          
          // 鍔犺浇鍥捐氨鏁版嵁
          try {
            await loadGraphData()
            ElMessage.success('鎴愬姛鍔犺浇鐭ヨ瘑鍥捐氨')
          } catch (error) {
            ElMessage.error('鍔犺浇鐭ヨ瘑鍥捐氨澶辫触')
          }
        }
      }
    }
  )
}

// 鏂囨湰鍒嗗潡
const splitText = async () => {
  try {
    const res = await request.post('/api/kg/split-text', {
      doc_id: docId.value
    })

    if (isDisposed.value) return

    chunks.value = res.data.chunks
    ElMessage.success(`鏂囨湰鍒嗗潡瀹屾垚锛屽叡 ${chunks.value.length} 涓潡`)
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '鏂囨湰鍒嗗潡澶辫触')
  }
}

// 瀹炰綋鎶藉彇
const extractEntities = async () => {
  extracting.value = true
  try {
    const res = await request.post('/api/kg/extract-entities', {
      doc_id: docId.value
    })

    if (isDisposed.value) return

    triplets.value = res.data.triplets
    ElMessage.success(`瀹炰綋鎶藉彇瀹屾垚锛屽叡 ${triplets.value.length} 涓笁鍏冪粍`)
    currentStep.value = 2
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '瀹炰綋鎶藉彇澶辫触')
  } finally {
    extracting.value = false
  }
}

// 鏋勫缓鍥捐氨
const buildGraph = async () => {
  building.value = true
  try {
    const res = await request.post('/api/kg/build-graph', {
      doc_id: docId.value
    })

    if (isDisposed.value) return

    buildTime.value = res.data.elapsed_time
    ElMessage.success(`鍥捐氨鏋勫缓瀹屾垚锛岃€楁椂 ${buildTime.value}绉抈)

    currentStep.value = 3
    await nextTick()
    await loadGraphData()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '鍥捐氨鏋勫缓澶辫触')
  } finally {
    building.value = false
  }
}

// ==================== 寮傛涓婁紶 Kafka + SSE ====================

// 鑾峰彇闃舵鏍囩
const getStageLabel = (stage) => {
  const stageMap = {
    'initialized': '鍒濆鍖?,
    'parsing': '瑙ｆ瀽鏂囨。',
    'chunking': '鏂囨湰鍒嗗潡',
    'extracting': '瀹炰綋鎶藉彇',
    'building_graph': '鏋勫缓鍥捐氨',
    'completed': '澶勭悊瀹屾垚'
  }
  return stageMap[stage] || stage
}

const asyncUploadDocument = async () => {
  if (!selectedFile.value) return

  uploadingAsync.value = true
  uploadProgress.value = 0
  uploadStage.value = 'initializing'
  uploadMessage.value = '姝ｅ湪鍒濆鍖?..'

  try {
    // 1. 鑾峰彇 task_id
    const result = await uploadDocumentAsync(selectedFile.value)
    console.log('寮傛涓婁紶浠诲姟鍒涘缓鎴愬姛', result)
    
    const { task_id, doc_id } = result
    
    ElMessage.success('浠诲姟宸插垱寤猴紝澶勭悊鍣ㄤ細鑷姩澶勭悊...')
    
    // 淇濆瓨 doc_id
    docId.value = doc_id
    
    // 2. 鐩戝惉 SSE 鑾峰彇杩涘害
    sseConnection.value = watchTaskProgress(task_id, {
      onProgress: (progress, stage, message) => {
        uploadProgress.value = progress
        uploadStage.value = stage
        uploadMessage.value = message
        console.log(`杩涘害: ${progress}% | 闃舵: ${stage} | ${message}`)
      },
      onCompleted: async (data) => {
        console.log('澶勭悊瀹屾垚', data)
        uploadProgress.value = 100
        uploadMessage.value = '鍥捐氨鏋勫缓瀹屾垚'
        
        // 璺宠浆鍒板浘璋卞睍绀?
        currentStep.value = 3
        
        // 鍔犺浇鍥捐氨鏁版嵁
        await nextTick()
        await loadGraphData()
      },
      onError: (errorMessage) => {
        console.error('澶勭悊澶辫触:', errorMessage)
        ElMessage.error(errorMessage || '澶勭悊澶辫触')
      }
    })
  } catch (error) {
    console.error('寮傛涓婁紶澶辫触', error)
    ElMessage.error('涓婁紶澶辫触锛岃閲嶈瘯')
  } finally {
    uploadingAsync.value = false
  }
}

// 鍔犺浇鍥捐氨鏁版嵁
const loadGraphData = async () => {
  try {
    const res = await request.post('/api/kg/get-graph', {
      doc_id: docId.value,
      limit: 100
    })

    if (isDisposed.value) return

    graphData.value = res.data.graph
    await nextTick()
    if (isDisposed.value) return

    renderGraph()
  } catch (error) {
    ElMessage.error('鍔犺浇鍥捐氨鏁版嵁澶辫触')
  }
}

const buildGraphPlugins = () => {
  const tooltip = new G6.Tooltip({
    offsetX: 12,
    offsetY: 12,
    itemTypes: ['node', 'edge'],
    getContent: (e) => {
      const outDiv = document.createElement('div')
      outDiv.style.padding = '10px 12px'
      outDiv.style.maxWidth = '260px'
      outDiv.style.fontSize = '12px'
      outDiv.style.lineHeight = '1.6'
      outDiv.style.color = '#0f172a'

      const item = e?.item
      if (!item) return outDiv

      const type = item.getType?.()
      const model = item.getModel?.() || {}

      if (type === 'node') {
        outDiv.innerHTML = `
          <div style="font-weight:700; margin-bottom:6px;">鑺傜偣</div>
          <div><span style="opacity:.7;">Label:</span>${model.label || model.id || ''}</div>
          <div><span style="opacity:.7;">ID:</span>${model.id || ''}</div>
        `
      } else {
        outDiv.innerHTML = `
          <div style="font-weight:700; margin-bottom:6px;">鍏崇郴</div>
          <div><span style="opacity:.7;">Label:</span>${model.label || ''}</div>
          <div><span style="opacity:.7;">Source:</span>${model.source || ''}</div>
          <div><span style="opacity:.7;">Target:</span>${model.target || ''}</div>
        `
      }
      return outDiv
    }
  })

  const minimap = new G6.Minimap({
    size: [180, 110]
  })

  return [tooltip, minimap]
}

// 娓叉煋鍥捐氨
const renderGraph = () => {
  if (!graphContainer.value) return
  if (isDisposed.value) return

  // 閿€姣佹棫瀹炰緥
  if (graphInstance) {
    graphInstance.destroy()
    graphInstance = null
  }

  const containerEl = graphContainer.value
  const { width } = getContainerSize(containerEl, 900, 620)
  const height = 620

  graphInstance = new G6.Graph({
    container: containerEl,
    width,
    height,
    plugins: buildGraphPlugins(),
    modes: {
      default: ['drag-canvas', 'zoom-canvas', 'drag-node', 'drag-combo']
    },
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
        style: {
          fontSize: 12,
          fill: '#0f172a',
          fontWeight: 600
        }
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
        style: {
          fontSize: 13,
          fontWeight: 700,
          fill: '#334155'
        }
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
          background: {
            fill: 'rgba(255,255,255,0.85)',
            padding: [2, 4, 2, 4],
            radius: 4
          }
        }
      }
    },
    nodeStateStyles: {
      hover: {
        lineWidth: 3,
        shadowBlur: 24
      },
      selected: {
        lineWidth: 4
      }
    },
    edgeStateStyles: {
      hover: {
        lineWidth: 3,
        stroke: 'rgba(59, 130,246,0.9)'
      }
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
    const fill = palette[ntype] || 'rgba(59, 130, 246, 0.95)'

    return {
      id: String(node.id),
      label: String(label),
      comboId: node.combo_id ? String(node.combo_id) : undefined,
      sourceChunkIndexes: Array.isArray(node.source_chunk_indexes) ? node.source_chunk_indexes : [],
      style: { fill }
    }
  })

  const combos = Array.from(
    (graphData.value.nodes || []).reduce((map, node) => {
      if (!node.combo_id) return map
      if (map.has(node.combo_id)) return map
      const comboStyle = getComboStyle(String(node.combo_id))
      map.set(node.combo_id, {
        id: String(node.combo_id),
        label: String(node.combo_label || '鏉ユ簮鍒嗗尯'),
        style: comboStyle
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

  graphInstance.on('node:mouseenter', (evt) => {
    const item = evt.item
    if (!item) return
    graphInstance.setItemState(item, 'hover', true)
  })
  graphInstance.on('node:mouseleave', (evt) => {
    const item = evt.item
    if (!item) return
    graphInstance.setItemState(item, 'hover', false)
  })
  graphInstance.on('edge:mouseenter', (evt) => {
    const item = evt.item
    if (!item) return
    graphInstance.setItemState(item, 'hover', true)
  })
  graphInstance.on('edge:mouseleave', (evt) => {
    const item = evt.item
    if (!item) return
    graphInstance.setItemState(item, 'hover', false)
  })

  bindResize()
}

// resize handler
const handleGraphResize = () => {
  if (!graphInstance) return
  if (!graphContainer.value) return
  if (isDisposed.value) return
  const { width } = getContainerSize(graphContainer.value, 900, 620)
  graphInstance.changeSize(width, 620)
  graphInstance.fitView(20)
}

// 閲嶇疆娴佺▼
const resetPipeline = () => {
  currentStep.value = 0
  selectedFile.value = null
  docId.value = ''
  documentText.value = ''
  chunks.value = []
  triplets.value = []
  graphData.value = { nodes: [], edges: [] }
  buildTime.value = 0

  destroyGraphs()
  unbindResize()
}

// ==================== RAG 闂瓟鐩稿叧 ====================
const question = ref('')
const answering = ref(false)
const messages = ref([])
const sourceChunks = ref([])
const displayedChunks = ref([])
const subgraphData = ref(null)
const explainTab = ref('chunks')
const chatScroll = ref(null)
const conversationId = ref('')
const typewriterTimers = ref([])

// AI 妯″瀷鍒楄〃
const availableModels = ref([])
const selectedModel = ref('')

// 鍔犺浇鐘舵€?
const loadingStatus = ref({
  vectorSearch: false,
  graphSearch: false,
  answerGeneration: false
})

// 鐢熸垚浼氳瘽ID
const generateConversationId = () => {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
}

// 鍔犺浇鍙敤妯″瀷
const loadAvailableModels = async () => {
  try {
    const res = await request.get('/api/kg/available-models')
    availableModels.value = res.data.models
    selectedModel.value = res.data.default
    console.log('鍙敤妯″瀷鍒楄〃', availableModels.value)
  } catch (error) {
    console.error('鍔犺浇妯″瀷鍒楄〃澶辫触:', error)
    ElMessage.error('鍔犺浇妯″瀷鍒楄〃澶辫触')
  }
}

// 鍒濆鍖栦細璇滻D
if (!conversationId.value) {
  conversationId.value = generateConversationId()
  console.log('褰撳墠浼氳瘽ID:', conversationId.value)
}

// 鍔犺浇妯″瀷鍒楄〃
loadAvailableModels()

// 鏂板缓瀵硅瘽
const newConversation = () => {
  messages.value = []
  sourceChunks.value = []
  displayedChunks.value = []
  subgraphData.value = null
  typewriterTimers.value.forEach(timer => clearInterval(timer))
  typewriterTimers.value = []

  conversationId.value = generateConversationId()
  console.log('鏂板缓浼氳瘽ID:', conversationId.value)

  ElMessage.success('宸插垱寤烘柊鐨勫璇?)
}

// 鍙戦€侀棶棰?
const askQuestion = async () => {
  if (!question.value.trim() || answering.value) return

  const userMessage = {
    role: 'user',
    content: question.value,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  messages.value.push(userMessage)

  const currentQuestion = question.value
  question.value = ''
  answering.value = true

  loadingStatus.value = {
    vectorSearch: true,
    graphSearch: true,
    answerGeneration: true
  }

  scrollToBottom()

  const assistantMessage = {
    role: 'assistant',
    content: '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  messages.value.push(assistantMessage)
  const assistantIndex = messages.value.length - 1

  sourceChunks.value = []
  displayedChunks.value = []
  subgraphData.value = null
  typewriterTimers.value.forEach(timer => clearInterval(timer))
  typewriterTimers.value = []

  try {
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('璇峰厛鐧诲綍')
      answering.value = false
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
        ElMessage.error('鐧诲綍宸茶繃鏈燂紝璇烽噸鏂扮櫥褰?)
      } else {
        throw new Error('璇锋眰澶辫触')
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
            console.log('鍚戦噺妫€绱㈡壘鍒?, data.data?.length, '涓枃妗ｅ潡')
            startTypewriterEffect()
          } else if (data.type === 'graph_data') {
            subgraphData.value = data.data || null
            loadingStatus.value.graphSearch = false
            console.log('鍥捐氨妫€绱㈡壘鍒?, data.data?.nodes?.length, '涓妭鐐?)
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
            console.log('鍥炵瓟鐢熸垚瀹屾垚')
          }
        } catch (e) {
          console.error('瑙ｆ瀽SSE鏁版嵁澶辫触', e, line)
        }
      }
    }

    scrollToBottom()
  } catch (error) {
    console.error('闂瓟澶辫触:', error)
    ElMessage.error(error.message || '闂瓟澶辫触')
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

// 娓叉煋瀛愬浘
const renderSubgraph = async () => {
  if (!subgraphContainer.value) return
  if (!subgraphData.value) return
  if (isDisposed.value) return

  if (!isThemeRegistered) {
    registerCustomTheme();
    isThemeRegistered = true;
  }

  if (subgraphInstance) {
    subgraphInstance.destroy()
    subgraphInstance = null
  }

  const containerEl = subgraphContainer.value
  const { width } = getContainerSize(containerEl, 520, 420)
  const height = 420

  subgraphInstance = new G6.Graph({
    container: containerEl,
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
    modes: {
      default: ['drag-canvas', 'zoom-canvas', 'drag-node']
    },
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
          fontSize: 10, fill: '#64748b', background: { fill: '#ffffff', padding: [2, 4], radius: 2 }
        }
      }
    }
  });

  subgraphInstance.on('node:mouseenter', (e) => subgraphInstance.setItemState(e.item, 'hover', true));
  subgraphInstance.on('node:mouseleave', (e) => subgraphInstance.setItemState(e.item, 'hover', false));

  subgraphInstance.data({ nodes: [], edges: [] });
  subgraphInstance.render();

  // 澶勭悊鑺傜偣鍜岃竟鏁版嵁
  const rawNodes = subgraphData.value.nodes || [];
  const rawEdges = subgraphData.value.edges || [];
  const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

  const processedNodes = rawNodes.map((node, i) => ({
    id: String(node.id),
    label: String(node.label ?? node.name ?? node.id),
    style: { fill: palette[i % palette.length] },
    x: width / 2 + (Math.random() - 0.5) * 50,
    y: height / 2 + (Math.random() - 0.5) * 50
  }));

  const processedEdges = rawEdges.map((edge, i) => ({
    id: `subedge-${i}`,
    source: String(edge.source),
    target: String(edge.target),
    label: edge.label || ''
  }));

  const addNodeDelay = 100;
  const addEdgeDelay = 200;

  const addNodesOneByOne = async () => {
    for (const node of processedNodes) {
      if (isDisposed.value || !subgraphInstance) return;
      subgraphInstance.addItem('node', node);
      subgraphInstance.layout();
      await new Promise(r => setTimeout(r, addNodeDelay));
    }
    addEdgesOneByOne();
  };

  const addEdgesOneByOne = async () => {
    for (const edge of processedEdges) {
      if (isDisposed.value || !subgraphInstance) return;
      const s = subgraphInstance.findById(edge.source);
      const t = subgraphInstance.findById(edge.target);
      if (s && t) subgraphInstance.addItem('edge', edge);
      await new Promise(r => setTimeout(r, addEdgeDelay));
    }
    
    if (subgraphInstance) {
      subgraphInstance.fitView(40); 
    }
  };

  addNodesOneByOne();
}

// 婊氬姩鍒板簳閮?
const scrollToBottom = () => {
  nextTick(() => {
    if (chatScroll.value) {
      const scrollbar = chatScroll.value.$el.querySelector('.el-scrollbar__wrap')
      if (scrollbar) {
        scrollbar.scrollTo({ top: scrollbar.scrollHeight, behavior: 'smooth' })
      }
    }
  })
}

// 鎵撳瓧鏈烘晥鏋?
const startTypewriterEffect = () => {
  typewriterTimers.value.forEach(timer => clearInterval(timer))
  typewriterTimers.value = []

  displayedChunks.value = sourceChunks.value.map(() => ({ content: '', isTyping: false, isComplete: false }))

  sourceChunks.value.forEach((chunk, index) => {
    setTimeout(() => {
      typewriterForChunk(chunk.content, index)
    }, index * 200)
  })
}

const typewriterForChunk = (text, index) => {
  if (!text) return

  displayedChunks.value[index].isTyping = true
  let currentIndex = 0

  const timer = setInterval(() => {
    if (currentIndex < text.length) {
      const char = text[currentIndex]
      const escapedChar = char
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#039;')
      displayedChunks.value[index].content += `<span class="glow-char">${escapedChar}</span>`
      currentIndex++
    } else {
      clearInterval(timer)
      displayedChunks.value[index].isTyping = false
      displayedChunks.value[index].isComplete = true
    }
  }, 25)
  typewriterTimers.value.push(timer)
}

// 鏍煎紡鍖栨秷鎭唴瀹?
const formatMessageContent = (content, role) => {
  if (!content) return ''

  if (role === 'assistant') {
    let formatted = content

    // Markdown 鏍煎紡鍖?
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    formatted = formatted.replace(/__(.+?)__/g, '<b>$1</b>')
    formatted = formatted.replace(/\*(.+?)\*/g, '<i>$1</i>')
    formatted = formatted.replace(/_(.+?)_/g, '<i>$1</i>')
    formatted = formatted.replace(/^#{1,6}\s+/gm, '')
    formatted = formatted.replace(/^[\*\-]\s+/gm, '鈥?')
    formatted = formatted.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, '')
    })
    formatted = formatted.replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')

    // 鍒嗚澶勭悊
    formatted = formatted.split('\n').map(line => {
      if (line.trim() === '') {
        return '<div class="paragraph-space"></div>'
      }
      return `<p class="text-line">${line}</p>`
    }).join('')

    // Emoji 澶勭悊
    const emojiRegex = /([\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{E000}-\u{F8FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F900}-\u{1F9FF}]|[\u{2300}-\u{23FF}]|[\u{2B50}]|[\u{203C}-\u{3299}])/gu
    formatted = formatted.replace(emojiRegex, '<span class="emoji-char">$1</span>')

    return formatted
  }

  return content.replace(/\n/g, '<br>')
}

// 鐩戝惉姝ラ鍙樺寲
watch(currentStep, (n, o) => {
  if (o === 3 && n !== 3) {
    destroyGraphs()
    unbindResize()
  }
})

// 鐩戝惉鏍囩椤靛垏鎹?
watch(activeTab, (tab) => {
  if (tab !== 'build') {
    destroyGraphs()
    unbindResize()
  } else {
    if (currentStep.value === 3) {
      nextTick(() => {
        if (!isDisposed.value) {
          renderGraph()
        }
      })
    }
  }
})

onUnmounted(() => {
  isDisposed.value = true
  destroyGraphs()
  unbindResize()
  typewriterTimers.value.forEach(timer => clearInterval(timer))
  typewriterTimers.value = []
  if (sseConnection.value) {
    sseConnection.value.close()
    sseConnection.value = null
  }
})
