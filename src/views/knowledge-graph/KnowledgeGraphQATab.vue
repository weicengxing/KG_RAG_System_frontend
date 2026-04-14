<template>
  <div class="qa-container">
    <el-row :gutter="20" class="qa-grid">
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
                <el-button size="small" plain @click="newConversation">
                  <el-icon class="btn-icon"><Document /></el-icon>
                  新建对话
                </el-button>
              </div>
            </div>
          </template>

          <div class="chat-wrapper">
            <el-scrollbar ref="chatScroll" class="chat-scroll-area" wrap-class="chat-scroll-wrap">
              <div class="chat-messages">
                <div v-if="messages.length === 0" class="chat-start-placeholder">
                  <div class="placeholder-icon">🤖</div>
                  <h3>欢迎使用 RAG 知识问答系统</h3>
                  <p>请先上传文档并构建知识图谱，然后再进行问答。</p>
                </div>

                <div
                  v-for="(msg, idx) in messages"
                  :key="idx"
                  :class="['message', msg.role]"
                >
                  <div class="message-avatar" :class="msg.role">
                    <img v-if="msg.role === 'user'" src="https://cdn-icons-png.flaticon.com/512/9308/9308304.png" alt="User" />
                    <div v-else class="ai-avatar-inner">
                      <span class="ai-icon">🤖</span>
                    </div>
                  </div>

                  <div class="message-bubble" :class="msg.role">
                    <div class="message-text" v-html="formatMessageContent(msg.content, msg.role)"></div>
                    <div class="message-time">{{ msg.time }}</div>
                  </div>
                </div>

                <div v-if="answering" class="message assistant">
                  <div class="message-avatar assistant">
                    <div class="ai-avatar-inner typing-state">
                      <span class="ai-icon">🤖</span>
                    </div>
                  </div>
                  <div class="message-bubble assistant">
                    <div class="message-text typing">
                      <span class="typing-dot"></span>
                      <span class="typing-dot"></span>
                      <span class="typing-dot"></span>
                      <span class="typing-text">AI 正在思考中...</span>
                    </div>
                  </div>
                </div>

                <div class="chat-bottom-spacer"></div>
              </div>
            </el-scrollbar>

            <div class="chat-input-container">
              <div class="chat-input-wrapper">
                <el-input
                  v-model="question"
                  placeholder="请输入您的问题..."
                  :disabled="answering"
                  class="floating-input"
                  @keyup.enter="askQuestion"
                />
                <el-button
                  type="primary"
                  circle
                  class="send-btn"
                  :loading="answering"
                  :disabled="!question.trim()"
                  @click="askQuestion"
                >
                  <template #icon>
                    <el-icon v-if="!answering"><Position /></el-icon>
                  </template>
                </el-button>
              </div>
              <div class="input-hint">
                <span class="hint-badge">Tips</span>
                <span class="hint-text">按 Enter 发送问题</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="12" class="qa-col">
        <el-card class="panel-card explain-card" shadow="never">
          <template #header>
            <div class="card-header">
              <div class="card-title">
                <span class="emoji">📖</span>
                <span>参考资料</span>
              </div>
              <el-tag type="success" effect="light" round>参考来源</el-tag>
            </div>
          </template>

          <el-tabs v-model="explainTab" class="explain-tabs">
            <el-tab-pane label="相关文档块" name="chunks">
              <el-scrollbar height="calc(100% - 10px)">
                <div class="source-chunks">
                  <div v-if="loadingStatus.vectorSearch" class="loading-indicator">
                    <el-icon class="is-loading"><Loading /></el-icon>
                    <span>正在搜索相关文档块...</span>
                  </div>

                  <el-card
                    v-for="(chunk, idx) in displayedChunks"
                    :key="idx"
                    class="source-chunk-item"
                    :class="{ 'chunk-animating': chunk.isTyping, 'chunk-complete': chunk.isComplete }"
                    shadow="never"
                  >
                    <div class="source-chunk-head">
                      <div class="chunk-badge">
                        <span class="badge-corner badge-corner-tl"></span>
                        <span class="badge-corner badge-corner-tr"></span>
                        <span class="badge-corner badge-corner-bl"></span>
                        <span class="badge-corner badge-corner-br"></span>

                        <div class="badge-icon-area">
                          <span class="badge-icon">📦</span>
                          <div class="badge-icon-glow"></div>
                        </div>

                        <div class="badge-content">
                          <div class="badge-number-row">
                            <span class="badge-prefix">FRAGMENT</span>
                            <span class="badge-number">{{ idx + 1 }}</span>
                          </div>
                          <div class="badge-meta">
                            <span class="badge-label-source">文档块</span>
                            <span class="badge-separator">|</span>
                            <span class="badge-label-index">#{{ idx + 1 }}</span>
                          </div>
                        </div>

                        <div class="badge-stars">
                          <span class="star star-1">★</span>
                          <span class="star star-2">★</span>
                          <span class="star star-3">★</span>
                        </div>

                        <div class="badge-shine"></div>
                      </div>
                    </div>
                    <div class="chunk-text" v-html="chunk.content + (chunk.isTyping ? '<span class=\'typing-cursor\'>|</span>' : '')"></div>
                  </el-card>

                  <el-empty
                    v-if="!loadingStatus.vectorSearch && sourceChunks.length === 0"
                    description="暂无参考资料"
                    :image-size="110"
                  />
                </div>
              </el-scrollbar>
            </el-tab-pane>

            <el-tab-pane label="知识图谱" name="graph">
              <div v-if="loadingStatus.graphSearch" class="loading-indicator">
                <el-icon class="is-loading"><Loading /></el-icon>
                <span>正在加载知识图谱...</span>
              </div>

              <div v-else class="subgraph-stage">
                <div v-if="subgraphData && subgraphData.nodes?.length" class="subgraph-toolbar">
                  <div class="subgraph-toolbar-copy">
                    <div class="subgraph-toolbar-title">支持直接编辑当前问答命令中的实体和关系</div>
                    <div class="subgraph-toolbar-hint">修改后先更新当前视图，再后台异步写入 Neo4j</div>
                  </div>
                  <el-button type="primary" plain @click="openGraphEditor">
                    <el-icon class="btn-icon"><Edit /></el-icon>
                    编辑图谱
                  </el-button>
                </div>

                <div
                  ref="subgraphContainer"
                  class="subgraph-container"
                  title="双击放大查看"
                  style="cursor: zoom-in;"
                  @dblclick="handleOpenExpand"
                ></div>
              </div>

              <el-empty
                v-if="!loadingStatus.graphSearch && (!subgraphData || subgraphData.nodes?.length === 0)"
                description="暂无知识图谱数据"
                :image-size="110"
              />

              <el-dialog
                v-model="expandVisible"
                fullscreen
                :show-close="true"
                class="expand-graph-modal"
                destroy-on-close
                @opened="renderExpandedGraph"
                @closed="destroyExpandedGraph"
              >
                <div class="expanded-wrapper">
                  <div class="expanded-bg"></div>
                  <div ref="expandedContainer" class="expanded-container"></div>
                  <div class="expanded-header">
                    <h2>知识图谱详情</h2>
                    <p>按 ESC 键退出全屏</p>
                  </div>
                </div>
              </el-dialog>

              <KnowledgeGraphGraphEditDialog
                v-model:visible="graphEditVisible"
                :editable-node-options="editableNodeOptions"
                :editable-subgraph="editableSubgraph"
                :saving-graph-edits="savingGraphEdits"
                @save="saveGraphEdits"
              />
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { Document, Edit, Loading, Position } from '@element-plus/icons-vue'
import KnowledgeGraphGraphEditDialog from './KnowledgeGraphGraphEditDialog.vue'
import { useKnowledgeGraphQA } from './useKnowledgeGraphQA'

const {
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
} = useKnowledgeGraphQA()
</script>

<style scoped src="./styles/base.css"></style>
<style scoped src="./styles/qa-tab.css"></style>
