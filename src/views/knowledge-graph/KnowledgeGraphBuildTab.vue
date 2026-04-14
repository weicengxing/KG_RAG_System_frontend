<template>
  <div class="build-pipeline">
    <div class="steps-container">
      <el-steps :active="currentStepModel" finish-status="success" align-center>
        <el-step title="上传文档" :icon="Upload" />
        <el-step title="文本分块" :icon="Document" />
        <el-step title="实体抽取" :icon="Search" />
        <el-step title="图谱构建" :icon="Share" />
      </el-steps>
    </div>

    <div v-if="currentStepModel === 0" class="step-content">
      <el-card class="panel-card upload-card step-upload-theme" shadow="never">
        <div class="step-decoration upload-decoration">
          <div class="deco-circle deco-circle-1"></div>
          <div class="deco-circle deco-circle-2"></div>
          <div class="deco-pattern"></div>
        </div>
        <template #header>
          <div class="card-header">
            <div class="card-title">
              <span class="emoji emoji-large upload-emoji">📚</span>
              <span>上传文档</span>
            </div>
            <el-tag type="info" effect="light" round>PDF/TXT/DOCX/PPTX 最大100MB</el-tag>
          </div>
        </template>

        <div class="upload-section">
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            accept=".pdf,.txt,.docx,.pptx"
            :limit="1"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              拖拽文件到此处，或 <em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 PDF/TXT/DOCX/PPT 格式文件
              </div>
            </template>
          </el-upload>

          <div class="primary-actions">
            <el-button
              type="primary"
              size="large"
              :disabled="!selectedFile"
              :loading="uploading"
              class="action-button"
              @click="uploadDocument"
            >
              <el-icon class="btn-icon"><Upload /></el-icon>
              开始上传文档
            </el-button>

            <el-button
              type="success"
              size="large"
              :disabled="!selectedFile || uploading"
              :loading="uploadingAsync"
              class="action-button one-click-btn"
              @click="asyncUploadDocument"
            >
              <el-icon class="btn-icon"><Promotion /></el-icon>
              一键上传并处理
            </el-button>

            <div class="hint-row">
              <span v-if="selectedFile" class="hint">
                已选择文件：<strong>{{ selectedFileName }}</strong>
              </span>
              <span v-else class="hint">请先选择要上传的文件</span>
            </div>
          </div>

          <el-collapse-transition>
            <div v-if="uploadProgress > 0 || uploadingAsync" class="async-upload-progress">
              <el-progress
                :percentage="uploadProgress"
                :status="uploadProgress === 100 ? 'success' : undefined"
                :format="(percentage) => `${percentage}% ${getStageLabel(uploadStage)}`"
              />
              <div class="progress-description">
                <el-icon v-if="uploadProgress < 100 && uploadingAsync" class="is-loading"><Loading /></el-icon>
                <span>{{ uploadMessage }}</span>
              </div>
            </div>
          </el-collapse-transition>
        </div>
      </el-card>
    </div>

    <div v-if="currentStepModel === 1" class="step-content">
      <el-card class="panel-card step-chunk-theme" shadow="never">
        <div class="step-decoration chunk-decoration">
          <div class="deco-circle deco-circle-1"></div>
          <div class="deco-circle deco-circle-2"></div>
          <div class="deco-grid"></div>
        </div>
        <template #header>
          <div class="card-header">
            <div class="card-title">
              <span class="emoji emoji-large chunk-emoji">📦</span>
              <span>文本分块</span>
            </div>
            <el-tag v-if="chunks.length > 0" type="success" effect="light" round>
              共 {{ chunks.length }} 个块
            </el-tag>
          </div>
        </template>

        <el-row :gutter="20" class="split-grid">
          <el-col :span="12">
            <div class="panel-head">
              <h4 class="panel-title">原文预览</h4>
              <el-tag type="info" effect="plain" round size="small">Preview</el-tag>
            </div>
            <el-scrollbar height="420px">
              <div class="text-preview">
                {{ documentText || '暂无内容...' }}
              </div>
            </el-scrollbar>
          </el-col>

          <el-col :span="12">
            <div class="panel-head">
              <h4 class="panel-title">文本块列表</h4>
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
                    {{ (chunk.content || '').substring(0, 120) }}{{ (chunk.content || '').length > 120 ? '...' : '' }}
                  </div>
                </el-card>

                <el-empty
                  v-if="chunks.length === 0"
                  description="暂无分块数据"
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
            :loading="extracting"
            class="action-button"
            @click="extractEntities"
          >
            <el-icon class="btn-icon"><Search /></el-icon>
            开始抽取实体
          </el-button>
        </div>
      </el-card>
    </div>

    <div v-if="currentStepModel === 2" class="step-content">
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
              <span>实体抽取</span>
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
              description="暂无抽取的三元组"
              :image-size="110"
            />
          </div>
        </el-scrollbar>

        <div class="footer-actions">
          <el-button
            type="primary"
            size="large"
            :loading="building"
            class="action-button"
            @click="buildGraph"
          >
            <el-icon class="btn-icon"><Share /></el-icon>
            构建图谱
          </el-button>
        </div>
      </el-card>
    </div>

    <div v-if="currentStepModel === 3" class="step-content">
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
              <el-radio-group v-model="graphScope" size="small" @change="handleGraphScopeChange">
                <el-radio-button label="current">当前文档</el-radio-button>
                <el-radio-button label="all">所有文档</el-radio-button>
              </el-radio-group>
              <el-button size="small" plain @click="loadGraphData">
                <el-icon class="btn-icon"><Document /></el-icon>
                刷新
              </el-button>
              <el-button size="small" plain @click="resetPipeline">重置流程</el-button>
            </div>
          </div>
        </template>

        <div class="graph-mode-bar">
          <div class="graph-mode-copy">
            <div class="graph-mode-title">{{ graphScopeTitle }}</div>
            <div class="graph-mode-hint">{{ graphScopeHint }}</div>
          </div>
          <div class="graph-mode-legend">
            <span class="legend-pill legend-pill-solid">同文档</span>
            <span class="legend-pill legend-pill-dashed">跨文档</span>
          </div>
          <div class="stat-card">
            <div class="stat-title">区域数量</div>
            <div class="stat-value">{{ graphRegionCount }}</div>
          </div>
        </div>

        <div class="graph-stage">
          <div ref="graphContainer" class="graph-container"></div>
        </div>

        <div class="graph-stats">
          <div class="stat-card">
            <div class="stat-title">节点数量</div>
            <div class="stat-value">{{ graphData.nodes?.length || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">边数量</div>
            <div class="stat-value">{{ graphData.edges?.length || 0 }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-title">构建时间</div>
            <div class="stat-value">{{ buildTime }}<span class="stat-suffix">秒</span></div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { computed, toRef } from 'vue'
import {
  Document,
  Loading,
  Promotion,
  Search,
  Share,
  Upload,
  UploadFilled
} from '@element-plus/icons-vue'
import { useKnowledgeGraphBuild } from './useKnowledgeGraphBuild'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  currentStep: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:currentStep'])

const currentStepModel = computed({
  get: () => props.currentStep,
  set: (value) => emit('update:currentStep', value)
})

const {
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
} = useKnowledgeGraphBuild({
  active: toRef(props, 'active'),
  currentStep: currentStepModel
})
</script>

<style scoped src="./styles/base.css"></style>
<style scoped src="./styles/build-tab.css"></style>
