<template>
  <div class="knowledge-graph-container">
    <div class="bg-aurora" aria-hidden="true"></div>

    <el-card class="page-header" shadow="never">
      <div class="header-inner">
        <div class="brand">
          <div class="brand-icon">
            <el-icon><Connection /></el-icon>
          </div>
          <div class="brand-text">
            <h1 class="title">知识图谱RAG系统</h1>
            <p class="subtitle">智能文档解析 · 图谱构建 · 知识问答</p>
          </div>
        </div>

        <div class="header-meta">
          <div class="meta-chip">
            <span class="dot" :class="{ on: currentStep >= 0 }"></span>
            <span class="label">上传</span>
          </div>
          <div class="meta-chip">
            <span class="dot" :class="{ on: currentStep >= 1 }"></span>
            <span class="label">分块</span>
          </div>
          <div class="meta-chip">
            <span class="dot" :class="{ on: currentStep >= 2 }"></span>
            <span class="label">抽取</span>
          </div>
          <div class="meta-chip">
            <span class="dot" :class="{ on: currentStep >= 3 }"></span>
            <span class="label">图谱</span>
          </div>
        </div>
      </div>
    </el-card>

    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 图谱构建标签页 -->
      <el-tab-pane label="图谱构建" name="build">
        <div class="build-pipeline">
          <!-- 步骤指示器（按方案1：外层包一层真实DOM容器，steps-container 放到 div 上） -->
          <div class="steps-container">
            <el-steps :active="currentStep" finish-status="success" align-center>
              <el-step title="上传文档" :icon="Upload" />
              <el-step title="文本分块" :icon="Document" />
              <el-step title="实体抽取" :icon="Search" />
              <el-step title="图谱生成" :icon="Share" />
            </el-steps>
          </div>

          <!-- 步骤1: 文档上传 -->
          <div v-if="currentStep === 0" class="step-content">
            <el-card class="panel-card upload-card step-upload-theme" shadow="never">
              <div class="step-decoration upload-decoration">
                <div class="deco-circle deco-circle-1"></div>
                <div class="deco-circle deco-circle-2"></div>
                <div class="deco-pattern"></div>
              </div>
              <template #header>
                <div class="card-header">
                  <div class="card-title">
                    <span class="emoji emoji-large upload-emoji">📄</span>
                    <span>文档上传</span>
                  </div>
                  <el-tag type="info" effect="light" round>PDF · ≤ 20MB</el-tag>
                </div>
              </template>

              <div class="upload-section">
                <el-upload
                  class="upload-demo"
                  drag
                  :auto-upload="false"
                  :on-change="handleFileChange"
                  accept=".pdf"
                  :limit="1"
                >
                  <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
                  <div class="el-upload__text">
                    拖拽 PDF 文件到此处或 <em>点击上传</em>
                  </div>
                  <template #tip>
                    <div class="el-upload__tip">
                      建议选择结构清晰的 PDF（可复制文本），提升抽取质量
                    </div>
                  </template>
                </el-upload>

                <div class="primary-actions">
                  <el-button
                    type="primary"
                    size="large"
                    :disabled="!selectedFile"
                    @click="uploadDocument"
                    :loading="uploading"
                    class="action-button"
                  >
                    <el-icon class="btn-icon"><Upload /></el-icon>
                    开始解析文档
                  </el-button>

                  <div class="hint-row">
                    <span class="hint" v-if="selectedFile">
                      已选择：<strong>{{ selectedFileName }}</strong>
                    </span>
                    <span class="hint" v-else>未选择文件</span>
                  </div>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 步骤2: 文本分块 -->
          <div v-if="currentStep === 1" class="step-content">
            <el-card class="panel-card step-chunk-theme" shadow="never">
              <div class="step-decoration chunk-decoration">
                <div class="deco-circle deco-circle-1"></div>
                <div class="deco-circle deco-circle-2"></div>
                <div class="deco-grid"></div>
              </div>
              <template #header>
                <div class="card-header">
                  <div class="card-title">
                    <span class="emoji emoji-large chunk-emoji">📝</span>
                    <span>文本分块</span>
                  </div>
                  <el-tag v-if="chunks.length > 0" type="success" effect="light" round>
                    共 {{ chunks.length }} 个分块
                  </el-tag>
                </div>
              </template>

              <el-row :gutter="20" class="split-grid">
                <el-col :span="12">
                  <div class="panel-head">
                    <h4 class="panel-title">原始文本预览</h4>
                    <el-tag type="info" effect="plain" round size="small">Preview</el-tag>
                  </div>
                  <el-scrollbar height="420px">
                    <div class="text-preview">
                      {{ documentText || '加载中...' }}
                    </div>
                  </el-scrollbar>
                </el-col>

                <el-col :span="12">
                  <div class="panel-head">
                    <h4 class="panel-title">分块结果</h4>
                    <el-tag type="warning" effect="plain" round size="small">Chunks</el-tag>
                  </div>
                  <el-scrollbar height="420px">
                    <div class="chunks-list">
                      <el-card
                        v-for="chunk in chunks"
                        :key="chunk.index"
                        class="chunk-item"
                        shadow="never"
                      >
                        <div class="chunk-header">
                          <el-tag size="small" type="info" effect="light" round>块 {{ chunk.index + 1 }}</el-tag>
                          <span class="chunk-length">{{ chunk.length }} 字符</span>
                        </div>
                        <div class="chunk-content">
                          {{ (chunk.content || '').substring(0, 120) }}{{ (chunk.content || '').length > 120 ? '…' : '' }}
                        </div>
                      </el-card>

                      <el-empty
                        v-if="chunks.length === 0"
                        description="暂无分块结果"
                        :image-size="100"
                      />
                    </div>
                  </el-scrollbar>
                </el-col>
              </el-row>

              <div class="footer-actions">
                <el-button
                  type="primary"
                  size="large"
                  @click="extractEntities"
                  :loading="extracting"
                  class="action-button"
                >
                  <el-icon class="btn-icon"><Search /></el-icon>
                  提取实体关系
                </el-button>
              </div>
            </el-card>
          </div>

          <!-- 步骤3: 实体抽取 -->
          <div v-if="currentStep === 2" class="step-content">
            <el-card class="panel-card step-extract-theme" shadow="never">
              <div class="step-decoration extract-decoration">
                <div class="deco-circle deco-circle-1"></div>
                <div class="deco-circle deco-circle-2"></div>
                <div class="deco-wave"></div>
              </div>
              <template #header>
                <div class="card-header">
                  <div class="card-title">
                    <span class="emoji emoji-large extract-emoji">🔍</span>
                    <span>实体关系抽取</span>
                  </div>
                  <el-tag v-if="triplets.length > 0" type="success" effect="light" round>
                    共 {{ triplets.length }} 个三元组
                  </el-tag>
                </div>
              </template>

              <el-scrollbar height="520px">
                <div class="triplets-list">
                  <el-card
                    v-for="(triplet, idx) in triplets"
                    :key="idx"
                    class="triplet-item"
                    shadow="never"
                  >
                    <div class="triplet-content">
                      <el-tag type="success" effect="light" round>{{ triplet.head }}</el-tag>
                      <span class="relation-arrow">
                        <span class="arrow-line"></span>
                        <span class="rel">{{ triplet.relation }}</span>
                        <span class="arrow-line"></span>
                      </span>
                      <el-tag type="warning" effect="light" round>{{ triplet.tail }}</el-tag>
                    </div>
                    <div class="triplet-meta">
                      <el-tag size="small" type="info" effect="plain" round>{{ triplet.head_type }}</el-tag>
                      <el-tag size="small" type="info" effect="plain" round>{{ triplet.tail_type }}</el-tag>
                    </div>
                  </el-card>

                  <el-empty
                    v-if="triplets.length === 0"
                    description="暂无三元组结果"
                    :image-size="110"
                  />
                </div>
              </el-scrollbar>

              <div class="footer-actions">
                <el-button
                  type="primary"
                  size="large"
                  @click="buildGraph"
                  :loading="building"
                  class="action-button"
                >
                  <el-icon class="btn-icon"><Share /></el-icon>
                  构建知识图谱
                </el-button>
              </div>
            </el-card>
          </div>

          <!-- 步骤4: 图谱可视化 -->
          <div v-if="currentStep === 3" class="step-content">
            <el-card class="panel-card step-graph-theme" shadow="never">
              <div class="step-decoration graph-decoration">
                <div class="deco-circle deco-circle-1"></div>
                <div class="deco-circle deco-circle-2"></div>
                <div class="deco-network"></div>
              </div>
              <template #header>
                <div class="card-header">
                  <div class="card-title">
                    <span class="emoji emoji-large graph-emoji">🕸️</span>
                    <span>知识图谱</span>
                  </div>
                  <div class="header-actions">
                    <el-button size="small" @click="loadGraphData" plain>
                      <el-icon class="btn-icon"><Document /></el-icon>
                      刷新
                    </el-button>
                    <el-button size="small" @click="resetPipeline" plain>
                      重新开始
                    </el-button>
                  </div>
                </div>
              </template>

              <div class="graph-stage">
                <div ref="graphContainer" class="graph-container"></div>
              </div>

              <div class="graph-stats">
                <div class="stat-card">
                  <div class="stat-title">节点数</div>
                  <div class="stat-value">{{ graphData.nodes?.length || 0 }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-title">边数</div>
                  <div class="stat-value">{{ graphData.edges?.length || 0 }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-title">耗时</div>
                  <div class="stat-value">{{ buildTime }}<span class="stat-suffix">秒</span></div>
                </div>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <!-- RAG问答标签页 -->
      <el-tab-pane label="智能问答" name="qa">
        <div class="qa-container">
          <el-row :gutter="20" class="qa-grid">
            <!-- 左侧：问答界面 -->
            <el-col :span="12" class="qa-col">
              <el-card class="panel-card chat-card" shadow="never">
                <template #header>
                  <div class="card-header">
                    <div class="card-title">
                      <span class="emoji">💬</span>
                      <span>知识问答</span>
                    </div>
                    <div class="header-actions">
                      <el-select
                        v-model="selectedModel"
                        placeholder="选择模型"
                        size="default"
                        style="width: 280px; margin-right: 10px;"
                        popper-class="custom-model-popper" 
                      >
                        <el-option
                          v-for="model in availableModels"
                          :key="model.name"
                          :label="model.name"
                          :value="model.name"
                        >
                          <div class="model-option">
                            <div class="model-name">{{ model.name }}</div>
                            <div class="model-description">{{ model.description }}</div>
                          </div>
                        </el-option>
                      </el-select>
                      <el-button size="small" @click="newConversation" plain>
                        <el-icon class="btn-icon"><Document /></el-icon>
                        新建对话
                      </el-button>
                    </div>
                  </div>
                </template>

                <div class="chat-wrapper">
                  <el-scrollbar class="chat-scroll-area" ref="chatScroll">
                    <div class="chat-messages">
                      <div
                        v-for="(msg, idx) in messages"
                        :key="idx"
                        :class="['message', msg.role]"
                      >
                        <div class="message-avatar" :class="msg.role">
                          <span class="avatar-emoji">{{ msg.role === 'user' ? '🧑' : '🤖' }}</span>
                        </div>
                        <div class="message-bubble" :class="msg.role">
                          <div
                            class="message-text"
                            :class="{ 'gradient-text': msg.role === 'assistant' }"
                            v-html="formatMessageContent(msg.content, msg.role)"
                          ></div>
                          <div class="message-time">{{ msg.time }}</div>
                        </div>
                      </div>

                      <div v-if="answering" class="message assistant">
                        <div class="message-avatar assistant">
                          <span class="avatar-emoji">🤖</span>
                        </div>
                        <div class="message-bubble assistant">
                          <div class="message-text typing">
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                            <span class="typing-text">思考中</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </el-scrollbar>

                  <div class="chat-input">
                    <el-input
                      v-model="question"
                      placeholder="请输入您的问题..."
                      @keyup.enter="askQuestion"
                      :disabled="answering"
                      clearable
                    >
                      <template #append>
                        <el-button
                          @click="askQuestion"
                          :loading="answering"
                          type="primary"
                        >
                          发送
                        </el-button>
                      </template>
                    </el-input>
                    <div class="input-hint">
                      提示：先在「图谱构建」完成流程，再来提问效果更好
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>

            <!-- 右侧：解释面板 -->
            <el-col :span="12" class="qa-col">
              <el-card class="panel-card explain-card" shadow="never">
                <template #header>
                  <div class="card-header">
                    <div class="card-title">
                      <span class="emoji">🔎</span>
                      <span>答案溯源</span>
                    </div>
                    <el-tag type="success" effect="light" round>可解释</el-tag>
                  </div>
                </template>

                <el-tabs v-model="explainTab" class="explain-tabs">
                  <el-tab-pane label="引用片段" name="chunks">
                    <el-scrollbar height="calc(100% - 10px)">
                      <div class="source-chunks">
                        <!-- 加载状态 -->
                        <div v-if="loadingStatus.vectorSearch" class="loading-indicator">
                          <el-icon class="is-loading"><Loading /></el-icon>
                          <span>正在检索相关文档片段...</span>
                        </div>

                        <el-card
                          v-for="(chunk, idx) in sourceChunks"
                          :key="idx"
                          class="source-chunk-item"
                          shadow="never"
                        >
                          <div class="source-chunk-head">
                            <el-tag size="small" type="info" effect="light" round>片段 {{ idx + 1 }}</el-tag>
                          </div>
                          <div class="chunk-text">{{ chunk.content }}</div>
                        </el-card>

                        <el-empty
                          v-if="!loadingStatus.vectorSearch && sourceChunks.length === 0"
                          description="暂无引用片段"
                          :image-size="110"
                        />
                      </div>
                    </el-scrollbar>
                  </el-tab-pane>

                  <el-tab-pane label="局部图谱" name="graph">
                    <!-- 加载状态 -->
                    <div v-if="loadingStatus.graphSearch" class="loading-indicator">
                      <el-icon class="is-loading"><Loading /></el-icon>
                      <span>正在检索知识图谱...</span>
                    </div>

                    <div v-else class="subgraph-stage">
                      <div ref="subgraphContainer" class="subgraph-container"></div>
                    </div>
                    <el-empty
                      v-if="!loadingStatus.graphSearch && (!subgraphData || subgraphData.nodes?.length === 0)"
                      description="暂无关联图谱"
                      :image-size="110"
                    />
                  </el-tab-pane>
                </el-tabs>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, watch, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Upload, UploadFilled, Document, Search, Share, Loading } from '@element-plus/icons-vue'
import G6 from '@antv/g6'
import request from '@/utils/request'

// 标签页状态
const activeTab = ref('build')

// ==================== 图谱构建相关 ====================
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

// G6容器与实例
const graphContainer = ref(null)
const subgraphContainer = ref(null)

let graphInstance = null
let subgraphInstance = null

// 防止异步回来太晚（组件已卸载还执行渲染）
const isDisposed = ref(false)

// resize 监听状态
const resizeBound = ref(false)

const selectedFileName = computed(() => {
  const f = selectedFile.value
  if (!f) return ''
  return f.name || '未命名文件'
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

// 上传文档
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

    docId.value = res.data.doc_id
    documentText.value = res.data.text_preview

    ElMessage.success('文档上传成功')

    // 自动进入下一步并分块
    currentStep.value = 1
    await splitText()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '文档上传失败')
  } finally {
    uploading.value = false
  }
}

// 文本分块
const splitText = async () => {
  try {
    const res = await request.post('/api/kg/split-text', null, {
      params: { doc_id: docId.value }
    })

    if (isDisposed.value) return

    chunks.value = res.data.chunks
    ElMessage.success(`文本分块完成，共 ${chunks.value.length} 个分块`)
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '文本分块失败')
  }
}

// 实体关系抽取
const extractEntities = async () => {
  extracting.value = true
  try {
    const res = await request.post('/api/kg/extract-entities', null, {
      params: { doc_id: docId.value }
    })

    if (isDisposed.value) return

    triplets.value = res.data.triplets
    ElMessage.success(`实体关系抽取完成，共 ${triplets.value.length} 个三元组`)
    currentStep.value = 2
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '实体抽取失败')
  } finally {
    extracting.value = false
  }
}

// 构建图谱
const buildGraph = async () => {
  building.value = true
  try {
    const res = await request.post('/api/kg/build-graph', null, {
      params: { doc_id: docId.value }
    })

    if (isDisposed.value) return

    buildTime.value = res.data.elapsed_time
    ElMessage.success('知识图谱构建完成')

    currentStep.value = 3
    await nextTick()
    await loadGraphData()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '图谱构建失败')
  } finally {
    building.value = false
  }
}

// 加载图谱数据
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
    ElMessage.error('图谱数据加载失败')
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
          <div style="font-weight:700; margin-bottom:6px;">节点</div>
          <div><span style="opacity:.7;">Label：</span>${model.label || model.id || ''}</div>
          <div><span style="opacity:.7;">ID：</span>${model.id || ''}</div>
        `
      } else {
        outDiv.innerHTML = `
          <div style="font-weight:700; margin-bottom:6px;">关系</div>
          <div><span style="opacity:.7;">Label：</span>${model.label || ''}</div>
          <div><span style="opacity:.7;">Source：</span>${model.source || ''}</div>
          <div><span style="opacity:.7;">Target：</span>${model.target || ''}</div>
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

// 渲染主图（关键：container 用 ref DOM，避免 parentNode null）
const renderGraph = () => {
  if (!graphContainer.value) return
  if (isDisposed.value) return

  // 销毁旧实例（避免 force layout 仍在跑）
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
      default: ['drag-canvas', 'zoom-canvas', 'drag-node']
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
        stroke: 'rgba(59, 130, 246, 0.9)'
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
      style: { fill }
    }
  })

  const edges = (graphData.value.edges || []).map((edge, idx) => {
    return {
      id: `edge-${idx}`,
      source: String(edge.source),
      target: String(edge.target),
      label: edge.label ? String(edge.label) : ''
    }
  })

  graphInstance.data({ nodes, edges })
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

// resize handler（主图）
const handleGraphResize = () => {
  if (!graphInstance) return
  if (!graphContainer.value) return
  if (isDisposed.value) return
  const { width } = getContainerSize(graphContainer.value, 900, 620)
  graphInstance.changeSize(width, 620)
  graphInstance.fitView(20)
}

// 重置流水线
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

// ==================== RAG问答相关 ====================
const question = ref('')
const answering = ref(false)
const messages = ref([])
const sourceChunks = ref([])
const subgraphData = ref(null)
const explainTab = ref('chunks')
const chatScroll = ref(null)
const conversationId = ref('')  // 对话ID

// AI模型相关
const availableModels = ref([])  // 可用的AI模型列表
const selectedModel = ref('')  // 当前选中的模型

// 加载状态跟踪
const loadingStatus = ref({
  vectorSearch: false,
  graphSearch: false,
  answerGeneration: false
})

// 生成新的对话ID
const generateConversationId = () => {
  return 'conv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15)
}

// 加载可用的AI模型列表
const loadAvailableModels = async () => {
  try {
    const res = await request.get('/api/kg/available-models')
    availableModels.value = res.data.models
    selectedModel.value = res.data.default  // 设置默认模型
    console.log('可用模型列表:', availableModels.value)
  } catch (error) {
    console.error('加载模型列表失败:', error)
    ElMessage.error('加载模型列表失败')
  }
}

// 初始化对话ID
if (!conversationId.value) {
  conversationId.value = generateConversationId()
  console.log('🆕 生成新对话ID:', conversationId.value)
}

// 加载模型列表
loadAvailableModels()

// 新建对话
const newConversation = () => {
  // 清空聊天记录
  messages.value = []
  sourceChunks.value = []
  subgraphData.value = null

  // 生成新的对话ID
  conversationId.value = generateConversationId()
  console.log('🆕 新建对话，ID:', conversationId.value)

  ElMessage.success('已创建新对话')
}

// 发送问题
const askQuestion = async () => {
  if (!question.value.trim() || answering.value) return

  const userMessage = {
    role: 'user',
    content: question.value,
    time: new Date().toLocaleTimeString()
  }
  messages.value.push(userMessage)

  const currentQuestion = question.value
  question.value = ''
  answering.value = true

  // 重置加载状态
  loadingStatus.value = {
    vectorSearch: true,
    graphSearch: true,
    answerGeneration: true
  }

  // 创建一个临时的assistant消息用于流式更新
  const assistantMessage = {
    role: 'assistant',
    content: '',
    time: new Date().toLocaleTimeString()
  }
  messages.value.push(assistantMessage)
  const assistantIndex = messages.value.length - 1

  // 清空之前的数据
  sourceChunks.value = []
  subgraphData.value = null

  try {
    // 获取token（从localStorage）
    const token = localStorage.getItem('token')
    if (!token) {
      ElMessage.error('请先登录')
      answering.value = false
      messages.value.splice(assistantIndex, 1)
      return
    }

    // 使用新的并行流式接口，携带conversation_id和model_name
    const response = await fetch('http://localhost:8000/api/kg/ask-parallel-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`  // 添加认证token
      },
      body: JSON.stringify({
        question: currentQuestion,
        stream: true,
        conversation_id: conversationId.value,  // 携带对话ID
        model_name: selectedModel.value  // 携带选中的模型
      })
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
            // 向量检索结果到达，立即更新
            sourceChunks.value = data.data || []
            loadingStatus.value.vectorSearch = false
            console.log('✅ 向量检索完成:', data.data?.length, '个片段')
          } else if (data.type === 'graph_data') {
            // 图检索结果到达，立即更新
            subgraphData.value = data.data || null
            loadingStatus.value.graphSearch = false
            console.log('✅ 图检索完成:', data.data?.nodes?.length, '个节点')
            await nextTick()
            if (!isDisposed.value) {
              renderSubgraph()
            }
          } else if (data.type === 'answer') {
            // 答案流式到达，逐字更新
            assistantMessage.content += data.content
            messages.value[assistantIndex] = { ...assistantMessage }
            scrollToBottom()
          } else if (data.type === 'answer_done') {
            // 答案完成
            loadingStatus.value.answerGeneration = false
            console.log('✅ 答案生成完成')
          }
        } catch (e) {
          console.error('解析数据失败:', e, line)
        }
      }
    }

    scrollToBottom()
  } catch (error) {
    console.error('问答失败:', error)
    ElMessage.error(error.message || '问答失败')
    // 移除临时的assistant消息
    messages.value.splice(assistantIndex, 1)
  } finally {
    answering.value = false
    // 确保所有加载状态都被重置
    loadingStatus.value = {
      vectorSearch: false,
      graphSearch: false,
      answerGeneration: false
    }
  }
}

// 渲染子图（关键：container 用 ref DOM）
const renderSubgraph = () => {
  if (!subgraphContainer.value) return
  if (!subgraphData.value) return
  if (isDisposed.value) return

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
    modes: {
      default: ['drag-canvas', 'zoom-canvas']
    },
    defaultNode: {
      size: 28,
      style: {
        fill: 'rgba(34, 197, 94, 0.95)',
        stroke: 'rgba(255,255,255,0.95)',
        lineWidth: 2,
        shadowColor: 'rgba(15, 23, 42, 0.15)',
        shadowBlur: 10
      },
      labelCfg: {
        position: 'bottom',
        offset: 6,
        style: {
          fontSize: 11,
          fill: '#0f172a',
          fontWeight: 600
        }
      }
    },
    defaultEdge: {
      style: {
        stroke: 'rgba(59, 130, 246, 0.45)',
        lineWidth: 2
      }
    },
    layout: {
      type: 'circular',
      radius: Math.min(width, height) / 2.6
    }
  })

  const nodes = (subgraphData.value.nodes || []).map((node) => ({
    id: String(node.id),
    label: String(node.label ?? node.name ?? node.id)
  }))

  const edges = (subgraphData.value.edges || []).map((edge, idx) => ({
    id: `subedge-${idx}`,
    source: String(edge.source),
    target: String(edge.target)
  }))

  subgraphInstance.data({ nodes, edges })
  subgraphInstance.render()
  subgraphInstance.fitView(20)
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatScroll.value) {
      const scrollbar = chatScroll.value.$el.querySelector('.el-scrollbar__wrap')
      if (scrollbar) {
        scrollbar.scrollTop = scrollbar.scrollHeight
      }
    }
  })
}

// 格式化消息内容：去除markdown标记，保留换行
const formatMessageContent = (content, role) => {
  if (!content) return ''

  // 只对assistant的消息进行处理
  if (role === 'assistant') {
    let formatted = content

    // 去除markdown标记
    // 去除粗体标记 **text** 或 __text__
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '$1')
    formatted = formatted.replace(/__(.+?)__/g, '$1')

    // 去除斜体标记 *text* 或 _text_
    formatted = formatted.replace(/\*(.+?)\*/g, '$1')
    formatted = formatted.replace(/_(.+?)_/g, '$1')

    // 去除标题标记 # ## ### 等
    formatted = formatted.replace(/^#{1,6}\s+/gm, '')

    // 去除列表标记（* 或 -）并保留内容
    formatted = formatted.replace(/^[\*\-]\s+/gm, '')

    // 去除代码块标记
    formatted = formatted.replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```\w*\n?/g, '')
    })

    // 去除行内代码标记 `code`
    formatted = formatted.replace(/`(.+?)`/g, '$1')

    // 将换行符转换为HTML换行
    formatted = formatted.split('\n').map(line => {
      // 如果是空行，返回一个段落间距
      if (line.trim() === '') {
        return '<div class="paragraph-space"></div>'
      }
      return `<p class="text-line">${line}</p>`
    }).join('')

    return formatted
  }

  // 用户消息保持原样，只处理换行
  return content.replace(/\n/g, '<br>')
}

// 关键修复：离开图谱步骤时，DOM 会被 v-if 移除，必须先 destroy（否则 parentNode null）
watch(currentStep, (n, o) => {
  if (o === 3 && n !== 3) {
    destroyGraphs()
    unbindResize()
  }
})

// 可选修复：切到 QA 页也销毁主图，避免后台仍跑 force layout
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
})
</script>

<style scoped>
.knowledge-graph-container {
  --bg-0: #0b1020;
  --card: rgba(255, 255, 255, 0.92);
  --text: #0f172a;
  --shadow: 0 10px 30px rgba(2, 6, 23, 0.18);
  --shadow-soft: 0 8px 22px rgba(2, 6, 23, 0.12);
  --radius: 14px;

  padding: 20px;
  min-height: 100vh;
  position: relative;
  background: radial-gradient(1100px 700px at 15% 15%, rgba(99, 102, 241, 0.55), transparent 55%),
    radial-gradient(900px 650px at 85% 20%, rgba(168, 85, 247, 0.45), transparent 55%),
    radial-gradient(900px 650px at 60% 90%, rgba(34, 197, 94, 0.35), transparent 55%),
    linear-gradient(135deg, #0b1020 0%, #111a33 40%, #0b1020 100%);
  box-sizing: border-box;
  overflow-y: visible;
  padding-bottom: 64px;
}

.bg-aurora {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.55;
  background:
    radial-gradient(900px 500px at 20% 10%, rgba(56, 189, 248, 0.22), transparent 60%),
    radial-gradient(900px 520px at 85% 30%, rgba(251, 113, 133, 0.16), transparent 60%),
    radial-gradient(900px 520px at 50% 95%, rgba(34, 197, 94, 0.12), transparent 60%);
  filter: blur(10px);
}

.page-header {
  margin-bottom: 18px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 4px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.24);
  box-shadow: 0 8px 18px rgba(2, 6, 23, 0.18);
  color: rgba(255, 255, 255, 0.92);
}

.brand-text .title {
  font-size: 24px;
  font-weight: 800;
  margin: 0;
  letter-spacing: 0.2px;
  color: rgba(255, 255, 255, 0.95);
}

.brand-text .subtitle {
  margin: 6px 0 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 13px;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.86);
  font-size: 12px;
}

.meta-chip .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.08);
}

.meta-chip .dot.on {
  background: rgba(34, 197, 94, 0.95);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
}

.main-tabs {
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--radius);
  padding: 16px;
  backdrop-filter: blur(14px);
  box-shadow: var(--shadow-soft);
}

:deep(.el-tabs__header) {
  margin: 0 0 14px 0;
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
  background: rgba(255, 255, 255, 0.18);
}

:deep(.el-tabs__item) {
  border-radius: 10px;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.82);
}

:deep(.el-tabs__item:hover) {
  color: rgba(255, 255, 255, 0.95);
}

:deep(.el-tabs__item.is-active) {
  color: rgba(255, 255, 255, 0.98);
  font-weight: 800;
}

:deep(.el-tabs__active-bar) {
  height: 3px;
  border-radius: 99px;
}

.panel-card {
  border-radius: calc(var(--radius) + 2px);
  background: var(--card);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.08);
}

:deep(.el-card__header) {
  padding: 14px 16px !important;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18) !important;
  background: rgba(255, 255, 255, 0.75);
  border-top-left-radius: calc(var(--radius) + 2px);
  border-top-right-radius: calc(var(--radius) + 2px);
  position: relative;
  z-index: 1;
}

:deep(.el-card__body) {
  padding: 16px !important;
  position: relative;
  z-index: 1;
}

.build-pipeline {
  padding: 6px 0;
}

.steps-container {
  margin: 6px 0 18px 0;
  padding: 20px 16px;
  border-radius: var(--radius);
  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.18);
  position: relative;
  overflow: hidden;
}

/* Steps 装饰背景 */
.steps-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    linear-gradient(90deg,
      rgba(59, 130, 246, 0.08) 0%,
      rgba(34, 197, 94, 0.08) 33%,
      rgba(168, 85, 247, 0.08) 66%,
      rgba(245, 158, 11, 0.08) 100%);
  opacity: 0.5;
  pointer-events: none;
}

/* 每个步骤项的样式 */
.steps-container :deep(.el-step) {
  position: relative;
}

/* 步骤图标容器 */
.steps-container :deep(.el-step__icon) {
  width: 52px !important;
  height: 52px !important;
  border-radius: 16px !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  overflow: visible !important;
  border: 2px solid transparent !important;
}

/* 步骤图标内部 */
.steps-container :deep(.el-step__icon-inner) {
  font-size: 24px !important;
  font-weight: bold !important;
  position: relative !important;
  z-index: 2 !important;
}

/* 未完成状态 - 默认白色背景需要覆盖 */
.steps-container :deep(.el-step__icon.is-text) {
  background: rgba(255, 255, 255, 0.85) !important;
  border-color: rgba(148, 163, 184, 0.30) !important;
  box-shadow: 0 4px 12px rgba(2, 6, 23, 0.08) !important;
}

/* 进行中状态 */
.steps-container :deep(.el-step.is-process .el-step__icon) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.95)) !important;
  border-color: rgba(59, 130, 246, 0.50) !important;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35) !important;
  animation: pulseGlow 2s ease-in-out infinite !important;
}

.steps-container :deep(.el-step.is-process .el-step__icon-inner) {
  color: #ffffff !important;
}

/* 已完成状态 */
.steps-container :deep(.el-step.is-success .el-step__icon) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95)) !important;
  border-color: rgba(34, 197, 94, 0.50) !important;
  box-shadow: 0 6px 18px rgba(34, 197, 94, 0.28) !important;
}

.steps-container :deep(.el-step.is-success .el-step__icon-inner) {
  color: #ffffff !important;
}

/* 每个步骤的独特主题色 - 第1步：上传文档（蓝色）*/
.steps-container :deep(.el-step:nth-child(1) .el-step__icon.is-text) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(99, 102, 241, 0.10)) !important;
  border-color: rgba(59, 130, 246, 0.35) !important;
  position: relative !important;
}

.steps-container :deep(.el-step:nth-child(1) .el-step__icon.is-text::before) {
  content: '📄' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 28px !important;
  opacity: 0.3 !important;
  z-index: 1 !important;
}

/* 第2步：文本分块（绿色）*/
.steps-container :deep(.el-step:nth-child(2) .el-step__icon.is-text) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(16, 185, 129, 0.10)) !important;
  border-color: rgba(34, 197, 94, 0.35) !important;
  position: relative !important;
}

.steps-container :deep(.el-step:nth-child(2) .el-step__icon.is-text::before) {
  content: '📝' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 28px !important;
  opacity: 0.3 !important;
  z-index: 1 !important;
}

/* 第3步：实体抽取（紫色）*/
.steps-container :deep(.el-step:nth-child(3) .el-step__icon.is-text) {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(147, 51, 234, 0.10)) !important;
  border-color: rgba(168, 85, 247, 0.35) !important;
  position: relative !important;
}

.steps-container :deep(.el-step:nth-child(3) .el-step__icon.is-text::before) {
  content: '🔍' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 28px !important;
  opacity: 0.3 !important;
  z-index: 1 !important;
}

/* 第4步：图谱生成（橙色）*/
.steps-container :deep(.el-step:nth-child(4) .el-step__icon.is-text) {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(251, 146, 60, 0.10)) !important;
  border-color: rgba(245, 158, 11, 0.35) !important;
  position: relative !important;
}

.steps-container :deep(.el-step:nth-child(4) .el-step__icon.is-text::before) {
  content: '🕸️' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 28px !important;
  opacity: 0.3 !important;
  z-index: 1 !important;
}

/* 步骤标题样式 */
.steps-container :deep(.el-step__title) {
  font-size: 14px !important;
  font-weight: 700 !important;
  color: rgba(255, 255, 255, 0.85) !important;
  margin-top: 8px !important;
  text-shadow: 0 2px 4px rgba(2, 6, 23, 0.15) !important;
}

.steps-container :deep(.el-step.is-process .el-step__title) {
  color: rgba(255, 255, 255, 0.98) !important;
  font-weight: 800 !important;
}

.steps-container :deep(.el-step.is-success .el-step__title) {
  color: rgba(255, 255, 255, 0.90) !important;
}

/* 连接线样式 */
.steps-container :deep(.el-step__line) {
  background: rgba(255, 255, 255, 0.20) !important;
  height: 3px !important;
  border-radius: 99px !important;
}

.steps-container :deep(.el-step.is-success .el-step__line) {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.50), rgba(255, 255, 255, 0.20)) !important;
}

.steps-container :deep(.el-step.is-process .el-step__line) {
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.50), rgba(255, 255, 255, 0.20)) !important;
}

/* 脉冲发光动画 */
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
    transform: scale(1);
  }
  50% {
    box-shadow: 0 8px 32px rgba(59, 130, 246, 0.50);
    transform: scale(1.05);
  }
}

.step-content {
  margin-top: 14px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.card-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 900;
  font-size: 15px;
  color: var(--text);
}

.card-title .emoji {
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.18);
}

.emoji-large {
  width: 48px !important;
  height: 48px !important;
  font-size: 26px;
  box-shadow: 0 8px 20px rgba(2, 6, 23, 0.10);
  transition: transform 0.3s ease;
}

.emoji-large:hover {
  transform: scale(1.1) rotate(5deg);
}

/* 步骤主题样式 */
.step-upload-theme {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%) !important;
  border: 2px solid rgba(59, 130, 246, 0.25) !important;
}

.step-chunk-theme {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%) !important;
  border: 2px solid rgba(34, 197, 94, 0.25) !important;
}

.step-extract-theme {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.08) 0%, rgba(147, 51, 234, 0.05) 100%) !important;
  border: 2px solid rgba(168, 85, 247, 0.25) !important;
}

.step-graph-theme {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(251, 146, 60, 0.05) 100%) !important;
  border: 2px solid rgba(245, 158, 11, 0.25) !important;
}

/* 装饰元素 */
.step-decoration {
  position: absolute;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
  opacity: 0.4;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.35) 0%, transparent 70%);
  animation: float 6s ease-in-out infinite;
}

.deco-circle-1 {
  width: 240px;
  height: 240px;
  top: -80px;
  right: -80px;
  animation-delay: 0s;
}

.deco-circle-2 {
  width: 180px;
  height: 180px;
  bottom: -60px;
  right: 120px;
  animation-delay: 1.5s;
}

/* 上传步骤装饰 - 文档图案 */
.upload-decoration .deco-pattern {
  position: absolute;
  top: 20%;
  right: 8%;
  width: 160px;
  height: 200px;
  background:
    linear-gradient(to bottom, rgba(59, 130, 246, 0.18) 2px, transparent 2px),
    linear-gradient(to right, rgba(59, 130, 246, 0.18) 2px, transparent 2px);
  background-size: 20px 20px;
  border-radius: 12px;
  transform: rotate(-15deg);
  opacity: 0.5;
  animation: slideDown 4s ease-in-out infinite;
}

/* 分块步骤装饰 - 网格图案 */
.chunk-decoration .deco-grid {
  position: absolute;
  top: 15%;
  right: 5%;
  width: 200px;
  height: 200px;
  background-image:
    repeating-linear-gradient(0deg, rgba(34, 197, 94, 0.22) 0px, rgba(34, 197, 94, 0.22) 1px, transparent 1px, transparent 25px),
    repeating-linear-gradient(90deg, rgba(34, 197, 94, 0.22) 0px, rgba(34, 197, 94, 0.22) 1px, transparent 1px, transparent 25px);
  border-radius: 12px;
  transform: rotate(12deg);
  animation: pulse 3s ease-in-out infinite;
}

/* 抽取步骤装饰 - 波浪图案 */
.extract-decoration .deco-wave {
  position: absolute;
  top: 25%;
  right: 10%;
  width: 180px;
  height: 120px;
  background:
    radial-gradient(circle at 20% 50%, rgba(168, 85, 247, 0.25) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.25) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(168, 85, 247, 0.25) 0%, transparent 50%);
  background-size: 60px 60px;
  border-radius: 12px;
  animation: wave 4s ease-in-out infinite;
}

/* 图谱步骤装饰 - 网络图案 */
.graph-decoration .deco-network {
  position: absolute;
  top: 20%;
  right: 8%;
  width: 180px;
  height: 180px;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(245, 158, 11, 0.35) 3px, transparent 3px),
    radial-gradient(circle at 70% 30%, rgba(245, 158, 11, 0.35) 3px, transparent 3px),
    radial-gradient(circle at 50% 70%, rgba(245, 158, 11, 0.35) 3px, transparent 3px),
    linear-gradient(135deg, rgba(245, 158, 11, 0.22) 2px, transparent 2px);
  background-size: 100% 100%, 100% 100%, 100% 100%, 80px 80px;
  border-radius: 12px;
  animation: rotate360 8s linear infinite;
}

/* Emoji主题色 */
.upload-emoji {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(99, 102, 241, 0.15) 100%) !important;
  border-color: rgba(59, 130, 246, 0.30) !important;
}

.chunk-emoji {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.18) 0%, rgba(16, 185, 129, 0.15) 100%) !important;
  border-color: rgba(34, 197, 94, 0.30) !important;
}

.extract-emoji {
  background: linear-gradient(135deg, rgba(168, 85, 247, 0.18) 0%, rgba(147, 51, 234, 0.15) 100%) !important;
  border-color: rgba(168, 85, 247, 0.30) !important;
}

.graph-emoji {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(251, 146, 60, 0.15) 100%) !important;
  border-color: rgba(245, 158, 11, 0.30) !important;
}

/* 动画效果 */
@keyframes float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.05);
  }
}

@keyframes slideDown {
  0%, 100% {
    transform: rotate(-15deg) translateY(0);
  }
  50% {
    transform: rotate(-15deg) translateY(15px);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: rotate(12deg) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: rotate(12deg) scale(1.1);
    opacity: 0.7;
  }
}

@keyframes wave {
  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(10px);
  }
}

@keyframes rotate360 {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.upload-card {
  max-width: 860px;
  margin: 0 auto;
}

.upload-section {
  padding: 6px 2px 2px 2px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.upload-demo {
  margin-bottom: 4px;
}

.primary-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hint-row {
  display: flex;
  align-items: center;
  justify-content: center;
}

.hint {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.65);
}

.action-button {
  width: 100%;
  height: 48px;
  font-size: 15px;
  font-weight: 800;
  border-radius: 12px;
  box-shadow: 0 12px 22px rgba(59, 130, 246, 0.18);
}

.btn-icon {
  margin-right: 6px;
}

.footer-actions {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.split-grid {
  margin-top: 2px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.panel-title {
  margin: 0;
  font-size: 13px;
  font-weight: 900;
  color: var(--text);
}

.text-preview {
  padding: 14px;
  background: rgba(2, 6, 23, 0.03);
  border-radius: 12px;
  line-height: 1.85;
  white-space: pre-wrap;
  border: 1px solid rgba(148, 163, 184, 0.28);
  color: rgba(15, 23, 42, 0.92);
}

.chunks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chunk-item {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.92);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.chunk-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(2, 6, 23, 0.10);
}

.chunk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.chunk-length {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.chunk-content {
  font-size: 13px;
  color: rgba(15, 23, 42, 0.86);
  line-height: 1.75;
}

.triplets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.triplet-item {
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.92);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.triplet-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(2, 6, 23, 0.10);
}

.triplet-content {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.relation-arrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.08);
  border: 1px dashed rgba(59, 130, 246, 0.25);
  color: rgba(59, 130, 246, 0.95);
  font-weight: 900;
  font-size: 12px;
}

.relation-arrow .arrow-line {
  width: 18px;
  height: 1px;
  background: rgba(59, 130, 246, 0.55);
}

.triplet-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.graph-stage {
  padding: 8px;
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.graph-container {
  width: 100%;
  height: 620px;
  border-radius: 14px;
  background: radial-gradient(900px 400px at 20% 10%, rgba(59, 130, 246, 0.10), transparent 60%),
    radial-gradient(900px 400px at 80% 20%, rgba(168, 85, 247, 0.08), transparent 60%),
    #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.20);
  overflow: hidden;
}

.graph-stats {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.stat-card {
  border-radius: 14px;
  padding: 14px 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid rgba(148, 163, 184, 0.22);
}

.stat-title {
  font-size: 12px;
  color: rgba(15, 23, 42, 0.6);
  margin-bottom: 6px;
  font-weight: 800;
}

.stat-value {
  font-size: 24px;
  font-weight: 900;
  color: rgba(15, 23, 42, 0.92);
  letter-spacing: 0.2px;
}

.stat-suffix {
  font-size: 12px;
  font-weight: 800;
  margin-left: 6px;
  color: rgba(15, 23, 42, 0.55);
}

.qa-container {
  padding-top: 6px;
}

.qa-grid {
  align-items: stretch;
}

.qa-col {
  margin-bottom: 14px;
}

.chat-card,
.explain-card {
  height: calc(100vh - 320px);
  min-height: 560px;
  display: flex;
  flex-direction: column;
}

:deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 14px !important;
}

.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-scroll-area {
  flex: 1;
  padding: 6px 2px;
}

.chat-messages {
  padding: 6px 8px;
}

.chat-input {
  padding-top: 12px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.input-hint {
  margin-top: 8px;
  font-size: 12px;
  color: rgba(15, 23, 42, 0.55);
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: flex-end;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 10px 20px rgba(2, 6, 23, 0.08);
}

.message-avatar.user {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.22);
}

.message-avatar.assistant {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.22);
}

.avatar-emoji {
  font-size: 20px;
}

.message-bubble {
  max-width: 80%;
  padding: 10px 12px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 10px 22px rgba(2, 6, 23, 0.08);
}

.message-bubble.user {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.92), rgba(99, 102, 241, 0.92));
  border-color: rgba(59, 130, 246, 0.35);
  color: rgba(255, 255, 255, 0.98);
  border-bottom-right-radius: 6px;
}

.message-bubble.assistant {
  background: rgba(255, 255, 255, 0.92);
  border-bottom-left-radius: 6px;
  color: rgba(15, 23, 42, 0.92);
}

.message-text {
  line-height: 1.7;
  word-break: break-word;
  font-size: 13px;
}

/* AI回答渐变色和行草字体样式 */
.message-text.gradient-text {
  font-family: 'KaiTi', 'STKaiti', 'KaiTi_GB2312', 'FangSong', 'STFangsong', cursive, serif;
  font-size: 15px;
  line-height: 2;
  background: linear-gradient(
    135deg,
    #667eea 0%,
    #764ba2 25%,
    #f093fb 50%,
    #4facfe 75%,
    #00f2fe 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  background-size: 200% 200%;
  animation: gradientFlow 3s ease infinite;
}

/* 渐变色流动动画 */
@keyframes gradientFlow {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* 文本行样式 */
.message-text :deep(.text-line) {
  margin: 0;
  padding: 4px 0;
  text-align: left;
}

/* 段落间距 */
.message-text :deep(.paragraph-space) {
  height: 12px;
}

.message-time {
  font-size: 11px;
  margin-top: 6px;
  opacity: 0.75;
}

.typing {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.45);
  animation: typing-bounce 1.05s infinite ease-in-out;
}

.typing-dot:nth-child(1) { animation-delay: 0s; }
.typing-dot:nth-child(2) { animation-delay: 0.12s; }
.typing-dot:nth-child(3) { animation-delay: 0.24s; }

.typing-text {
  margin-left: 6px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.68);
}

@keyframes typing-bounce {
  0%, 100% {
    transform: translateY(0);
    opacity: 0.55;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

.explain-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
}

.source-chunks {
  padding: 6px 4px;
}

.source-chunk-item {
  margin-bottom: 12px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.92);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.source-chunk-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(2, 6, 23, 0.10);
}

.source-chunk-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chunk-text {
  font-size: 13px;
  color: rgba(15, 23, 42, 0.86);
  line-height: 1.75;
  white-space: pre-wrap;
}

.subgraph-stage {
  padding: 8px;
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.24);
  margin-bottom: 10px;
}

.subgraph-container {
  width: 100%;
  height: 420px;
  border-radius: 14px;
  background: radial-gradient(900px 360px at 20% 10%, rgba(34, 197, 94, 0.10), transparent 60%),
    radial-gradient(900px 360px at 80% 20%, rgba(59, 130, 246, 0.10), transparent 60%),
    #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.20);
  overflow: hidden;
}

:deep(.el-upload-dragger) {
  border-radius: 16px !important;
  border: 1px dashed rgba(59, 130, 246, 0.42) !important;
  background: rgba(59, 130, 246, 0.06) !important;
  transition: all 0.2s ease !important;
}

:deep(.el-upload-dragger:hover) {
  background: rgba(59, 130, 246, 0.10) !important;
  border-color: rgba(59, 130, 246, 0.62) !important;
}

:deep(.el-upload__text) {
  color: rgba(15, 23, 42, 0.78) !important;
}

:deep(.el-upload__text em) {
  color: rgba(59, 130, 246, 0.98) !important;
  font-style: normal !important;
  font-weight: 900 !important;
}

:deep(.el-button.is-plain) {
  border-radius: 12px !important;
}

:deep(.el-input-group__append .el-button) {
  border-radius: 0 12px 12px 0 !important;
}

:deep(.el-input__wrapper) {
  border-radius: 12px !important;
}

/* 加载指示器样式 */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: rgba(15, 23, 42, 0.65);
  font-size: 14px;
}

.loading-indicator .el-icon {
  font-size: 20px;
  color: rgba(59, 130, 246, 0.85);
}

/* 模型选择器样式 */
.model-option {
  display: flex;
  flex-direction: column;
  padding: 10px 16px;              /* 在这里设置内边距，把间距撑开 */
  gap: 4px;                        /* 名称和描述之间的间距 */
  width: 100%;
  box-sizing: border-box;
}

.model-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.4;
}

.model-description {
  display: block !important;       /* 强制显示 */
  font-size: 12px;
  color: #64748b;                  /* 灰蓝色 */
  line-height: 1.5;
  white-space: normal;             /* 允许换行 */
  word-break: break-all;           /* 允许长单词断句 */
}

/*  */

@media (max-width: 992px) {
  .header-inner {
    flex-direction: column;
    align-items: flex-start;
  }
  .graph-stats {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .knowledge-graph-container {
    padding: 14px;
  }

  .chat-card,
  .explain-card {
    height: auto;
    min-height: 420px;
  }

  :deep(.el-col) {
    width: 100% !important;
    max-width: 100% !important;
    flex: 0 0 100% !important;
  }

  .graph-container {
    height: 520px;
  }

  .subgraph-container {
    height: 380px;
  }

  .brand-text .title {
    font-size: 20px;
  }
}
</style>
<!-- 新增这个标签，注意没有 scoped -->
<style>
/* 1. 强制覆盖 Element Plus 下拉项的高度限制 */
.custom-model-popper .el-select-dropdown__item {
  height: auto !important;          /* 解除 34px 高度限制 */
  padding: 0 !important;            /* 清除默认内边距 */
  line-height: normal !important;   /* 重置行高 */
  overflow: visible !important;     /* 防止内容被裁切 */
}

/* 2. 选中状态样式修正 */
.custom-model-popper .el-select-dropdown__item.selected {
  font-weight: normal;
}

/* 3. 自定义内容的容器布局 */
.custom-model-popper .model-option {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px 16px;       /* 上下左右内边距 */
  min-height: 60px;         /* 给个最小高度 */
  box-sizing: border-box;
}

/* 4. 标题样式 */
.custom-model-popper .model-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
  line-height: 1.3;
}

/* 5. 描述样式 */
.custom-model-popper .model-description {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
  white-space: normal;      /* 允许换行 */
  word-wrap: break-word;    /* 长单词换行 */
}
</style>
