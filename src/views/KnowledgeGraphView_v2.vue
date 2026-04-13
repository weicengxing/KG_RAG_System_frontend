<template>
  <div class="knowledge-graph-container">
    <!-- 鑳屾櫙鏋佸厜鍔ㄧ敾 - fixed 瀹氫綅閬垮厤婊氬姩鏃堕棯鐑? z-index 纭繚鍦ㄥ唴瀹逛笅鏂?-->
    <div class="bg-aurora" aria-hidden="true"></div>

    <div class="content-wrapper">
      <el-card class="page-header" shadow="never">
        <div class="header-inner">
          <div class="brand">
            <div class="brand-icon">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="brand-text">
              <h1 class="title">鐭ヨ瘑鍥捐氨 RAG 绯荤粺</h1>
              <p class="subtitle">涓婁紶鏂囨。銆侀€夋嫨鏂囦欢銆佹嫋鎷戒笂浼?鐭ヨ瘑鍥捐氨闂瓟</p>
            </div>
          </div>

          <div class="header-meta">
            <div class="meta-chip">
              <span class="dot" :class="{ on: currentStep >= 0 }"></span>
              <span class="label">涓婁紶</span>
            </div>
            <div class="meta-chip">
              <span class="dot" :class="{ on: currentStep >= 1 }"></span>
              <span class="label">鍒嗗潡</span>
            </div>
            <div class="meta-chip">
              <span class="dot" :class="{ on: currentStep >= 2 }"></span>
              <span class="label">鎶藉彇</span>
            </div>
            <div class="meta-chip">
              <span class="dot" :class="{ on: currentStep >= 3 }"></span>
              <span class="label">鍥捐氨</span>
            </div>
          </div>
        </div>
      </el-card>

      <el-tabs v-model="activeTab" class="main-tabs">
        <!-- 鍥捐氨鏋勫缓鏍囩椤?-->
        <el-tab-pane label="鍥捐氨鏋勫缓" name="build">
          <div class="build-pipeline">
            <!-- 姝ラ娴佺▼ -->
            <div class="steps-container">
              <el-steps :active="currentStep" finish-status="success" align-center>
                <el-step title="涓婁紶鏂囨。" :icon="Upload" />
                <el-step title="鏂囨湰鍒嗗潡" :icon="Document" />
                <el-step title="瀹炰綋鎶藉彇" :icon="Search" />
                <el-step title="鍥捐氨鏋勫缓" :icon="Share" />
              </el-steps>
            </div>

            <!-- 姝ラ1: 涓婁紶鏂囨。 -->
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
                      <span class="emoji emoji-large upload-emoji">馃摛</span>
                      <span>涓婁紶鏂囨。</span>
                    </div>
                    <el-tag type="info" effect="light" round>PDF/TXT/DOCX/PPTX 鏈€澶?00MB</el-tag>
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
                        鏀寔 PDF/TXT/DOCX/PPT 鏍煎紡鏂囦欢
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
                      寮€濮嬩笂浼犳枃妗?
                    </el-button>

                    <!-- 涓€閿笂浼犲鐞?-->
                    <el-button
                      type="success"
                      size="large"
                      :disabled="!selectedFile || uploading"
                      @click="asyncUploadDocument"
                      :loading="uploadingAsync"
                      class="action-button one-click-btn"
                    >
                      <el-icon class="btn-icon"><Promotion /></el-icon>
                      涓€閿笂浼犲苟澶勭悊
                    </el-button>

                    <div class="hint-row">
                      <span class="hint" v-if="selectedFile">
                        已选择文件：<strong>{{ selectedFileName }}</strong>
                      </span>
                      <span class="hint" v-else>璇峰厛閫夋嫨瑕佷笂浼犵殑鏂囦欢</span>
                    </div>
                  </div>

                  <!-- 寮傛涓婁紶杩涘害鏉?-->
                  <el-collapse-transition>
                    <div v-if="uploadProgress > 0 || uploadingAsync" class="async-upload-progress">
                      <el-progress 
                        :percentage="uploadProgress" 
                        :status="uploadProgress === 100 ? 'success' : undefined"
                        :format="(percentage) => `${percentage}% ${getStageLabel(uploadStage)}`"
                      />
                      <div class="progress-description">
                        <el-icon class="is-loading" v-if="uploadProgress < 100 && uploadingAsync"><Loading /></el-icon>
                        <span>{{ uploadMessage }}</span>
                      </div>
                    </div>
                  </el-collapse-transition>
                </div>
              </el-card>
            </div>

            <!-- 姝ラ2: 鏂囨湰鍒嗗潡 -->
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
                      <span class="emoji emoji-large chunk-emoji">馃搫</span>
                      <span>鏂囨湰鍒嗗潡</span>
                    </div>
                    <el-tag v-if="chunks.length > 0" type="success" effect="light" round>
                      鍏?{{ chunks.length }} 涓潡
                    </el-tag>
                  </div>
                </template>

                <el-row :gutter="20" class="split-grid">
                  <el-col :span="12">
                    <div class="panel-head">
                      <h4 class="panel-title">鍘熸枃棰勮</h4>
                      <el-tag type="info" effect="plain" round size="small">Preview</el-tag>
                    </div>
                    <el-scrollbar height="420px">
                      <div class="text-preview">
                        {{ documentText || '鏆傛棤鍐呭...' }}
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
                            <el-tag size="small" type="info" effect="light" round>鍧?{{ chunk.index + 1 }}</el-tag>
                            <span class="chunk-length">{{ chunk.length }} 瀛楃</span>
                          </div>
                          <div class="chunk-content">
                            {{ (chunk.content || '').substring(0, 120) }}{{ (chunk.content || '').length > 120 ? '...' : '' }}
                          </div>
                        </el-card>

                        <el-empty
                          v-if="chunks.length === 0"
                          description="鏆傛棤鍒嗗潡鏁版嵁"
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
                    寮€濮嬫娊鍙栧疄浣?
                  </el-button>
                </div>
              </el-card>
            </div>

            <!-- 姝ラ3: 瀹炰綋鎶藉彇 -->
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
                      <span class="emoji emoji-large extract-emoji">馃攳</span>
                      <span>瀹炰綋鎶藉彇</span>
                    </div>
                    <el-tag v-if="triplets.length > 0" type="success" effect="light" round>
                      鍏?{{ triplets.length }} 涓笁鍏冪粍
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
                      description="鏆傛棤鎶藉彇鐨勪笁鍏冪粍"
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
                    鏋勫缓鍥捐氨
                  </el-button>
                </div>
              </el-card>
            </div>

            <!-- 姝ラ4: 鍥捐氨灞曠ず -->
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
                      <span>鐭ヨ瘑鍥捐氨</span>
                    </div>
                    <div class="header-actions">
                      <el-radio-group v-model="graphScope" size="small" @change="handleGraphScopeChange">
                        <el-radio-button label="current">Current Doc</el-radio-button>
                        <el-radio-button label="all">All Docs</el-radio-button>
                      </el-radio-group>
                      <el-button size="small" @click="loadGraphData" plain>
                        <el-icon class="btn-icon"><Document /></el-icon>
                        鍒锋柊
                      </el-button>
                      <el-button size="small" @click="resetPipeline" plain>
                        閲嶇疆娴佺▼
                      </el-button>
                    </div>
                  </div>
                </template>

                <div class="graph-mode-bar">
                  <div class="graph-mode-copy">
                    <div class="graph-mode-title">{{ graphScopeTitle }}</div>
                    <div class="graph-mode-hint">{{ graphScopeHint }}</div>
                  </div>
                  <div class="graph-mode-legend">
                    <span class="legend-pill legend-pill-solid">Intra-doc</span>
                    <span class="legend-pill legend-pill-dashed">Cross-doc</span>
                  </div>
                  <div class="stat-card">
                    <div class="stat-title">Regions</div>
                    <div class="stat-value">{{ graphRegionCount }}</div>
                  </div>
                </div>

                <div class="graph-stage">
                  <div ref="graphContainer" class="graph-container"></div>
                </div>

                <div class="graph-stats">
                  <div class="stat-card">
                    <div class="stat-title">鑺傜偣鏁伴噺</div>
                    <div class="stat-value">{{ graphData.nodes?.length || 0 }}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-title">边数量</div>
                    <div class="stat-value">{{ graphData.edges?.length || 0 }}</div>
                  </div>
                  <div class="stat-card">
                    <div class="stat-title">鏋勫缓鏃堕棿</div>
                    <div class="stat-value">{{ buildTime }}<span class="stat-suffix">秒</span></div>
                  </div>
                </div>
              </el-card>
            </div>
          </div>
        </el-tab-pane>

        <!-- RAG闂瓟鏍囩椤?-->
        <el-tab-pane label="鐭ヨ瘑闂瓟" name="qa">
          <div class="qa-container">
            <el-row :gutter="20" class="qa-grid">
              <!-- 宸︿晶鑱婂ぉ鍖哄煙 -->
              <el-col :span="12" class="qa-col">
                <el-card class="panel-card chat-card" shadow="never">
                  <template #header>
                    <div class="card-header">
                      <div class="card-title">
                        <span class="emoji">馃挰</span>
                        <span>鐭ヨ瘑闂瓟</span>
                      </div>
                      <div class="header-actions">
                        <el-select
                          v-model="selectedModel"
                          placeholder="閫夋嫨妯″瀷"
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
                          鏂板缓瀵硅瘽
                        </el-button>
                      </div>
                    </div>
                  </template>

                  <!-- 鑱婂ぉ鍐呭鍖哄煙 -->
                  <div class="chat-wrapper">
                    <el-scrollbar class="chat-scroll-area" ref="chatScroll" wrap-class="chat-scroll-wrap">
                      <div class="chat-messages">
                        <div class="chat-start-placeholder" v-if="messages.length === 0">
                          <div class="placeholder-icon">馃</div>
                          <h3>娆㈣繋浣跨敤 RAG 鐭ヨ瘑闂瓟绯荤粺</h3>
                          <p>请先上传文档并构建知识图谱，然后再进行问答。</p>
                        </div>

                        <div
                          v-for="(msg, idx) in messages"
                          :key="idx"
                          :class="['message', msg.role]"
                        >
                          <!-- 鐢ㄦ埛澶村儚 -->
                          <div class="message-avatar" :class="msg.role">
                            <img v-if="msg.role === 'user'" src="https://cdn-icons-png.flaticon.com/512/9308/9308304.png" alt="User" />
                            <div v-else class="ai-avatar-inner">
                              <span class="ai-icon">馃</span>
                            </div>
                          </div>

                          <!-- 娑堟伅姘旀场 -->
                          <div class="message-bubble" :class="msg.role">
                            <div
                              class="message-text"
                              v-html="formatMessageContent(msg.content, msg.role)"
                            ></div>
                            <div class="message-time">{{ msg.time }}</div>
                          </div>
                        </div>

                        <div v-if="answering" class="message assistant">
                          <div class="message-avatar assistant">
                            <div class="ai-avatar-inner typing-state">
                              <span class="ai-icon">馃</span>
                            </div>
                          </div>
                          <div class="message-bubble assistant">
                            <div class="message-text typing">
                              <span class="typing-dot"></span>
                              <span class="typing-dot"></span>
                              <span class="typing-dot"></span>
                              <span class="typing-text">AI 姝ｅ湪鎬濊€冧腑...</span>
                            </div>
                          </div>
                        </div>
                        
                        <!-- 搴曢儴鍗犱綅 -->
                        <div class="chat-bottom-spacer"></div>
                      </div>
                    </el-scrollbar>

                    <!-- 搴曢儴杈撳叆妗?-->
                    <div class="chat-input-container">
                      <div class="chat-input-wrapper">
                        <el-input
                          v-model="question"
                          placeholder="璇疯緭鍏ユ偍鐨勯棶棰?.."
                          @keyup.enter="askQuestion"
                          :disabled="answering"
                          class="floating-input"
                        >
                        </el-input>
                        <el-button
                          @click="askQuestion"
                          :loading="answering"
                          type="primary"
                          circle
                          class="send-btn"
                          :disabled="!question.trim()"
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

              <!-- 鍙充晶鍙傝€冭祫鏂欏尯鍩?-->
              <el-col :span="12" class="qa-col">
                <el-card class="panel-card explain-card" shadow="never">
                  <template #header>
                    <div class="card-header">
                      <div class="card-title">
                        <span class="emoji">馃摎</span>
                        <span>参考资料</span>
                      </div>
                      <el-tag type="success" effect="light" round>参考来源</el-tag>
                    </div>
                  </template>

                  <el-tabs v-model="explainTab" class="explain-tabs">
                    <el-tab-pane label="相关文档块" name="chunks">
                      <el-scrollbar height="calc(100% - 10px)">
                        <div class="source-chunks">
                          <!-- 鍔犺浇涓彁绀?-->
                          <div v-if="loadingStatus.vectorSearch" class="loading-indicator">
                            <el-icon class="is-loading"><Loading /></el-icon>
                            <span>姝ｅ湪鎼滅储鐩稿叧鏂囨。鍧?..</span>
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
                                <!-- 瑁呴グ瑙掓爣 -->
                                <span class="badge-corner badge-corner-tl"></span>
                                <span class="badge-corner badge-corner-tr"></span>
                                <span class="badge-corner badge-corner-bl"></span>
                                <span class="badge-corner badge-corner-br"></span>
                                
                                <!-- 鍥炬爣鍖哄煙 -->
                                <div class="badge-icon-area">
                                  <span class="badge-icon">馃搫</span>
                                  <div class="badge-icon-glow"></div>
                                </div>
                                
                                <!-- 鍐呭鍖哄煙 -->
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
                                
                                <!-- 鏄熸槦瑁呴グ -->
                                <div class="badge-stars">
                                  <span class="star star-1">★</span>
                                  <span class="star star-2">★</span>
                                  <span class="star star-3">★</span>
                                </div>
                                
                                <!-- 鍏夋晥 -->
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

                    <el-tab-pane label="鐭ヨ瘑鍥捐氨" name="graph">
                      <!-- 鍔犺浇涓彁绀?-->
                      <div v-if="loadingStatus.graphSearch" class="loading-indicator">
                        <el-icon class="is-loading"><Loading /></el-icon>
                        <span>姝ｅ湪鍔犺浇鐭ヨ瘑鍥捐氨...</span>
                      </div>

                      <div v-else class="subgraph-stage">
                        <div v-if="subgraphData && subgraphData.nodes?.length" class="subgraph-toolbar">
                          <div class="subgraph-toolbar-copy">
                            <div class="subgraph-toolbar-title">鏀寔鐩存帴缂栬緫褰撳墠闂瓟鍛戒腑鐨勫疄浣撳拰鍏崇郴</div>
                            <div class="subgraph-toolbar-hint">淇敼鍚庡厛鏇存柊褰撳墠瑙嗗浘锛屽啀鍚庡彴寮傛鍐欏叆 Neo4j</div>
                          </div>
                          <el-button type="primary" plain @click="openGraphEditor">
                            <el-icon class="btn-icon"><Edit /></el-icon>
                            缂栬緫鍥捐氨
                          </el-button>
                        </div>
                        <!-- 
                           1. 鍙屽嚮鍙互鏀惧ぇ
                           2. 榧犳爣鎮仠鏄剧ず璇︽儏
                        -->
                        <div 
                          ref="subgraphContainer" 
                          class="subgraph-container" 
                          @dblclick="handleOpenExpand"
                          title="鍙屽嚮鏀惧ぇ鏌ョ湅"
                          style="cursor: zoom-in;"
                        ></div>
                      </div>
                      
                      <el-empty
                        v-if="!loadingStatus.graphSearch && (!subgraphData || subgraphData.nodes?.length === 0)"
                        description="鏆傛棤鐭ヨ瘑鍥捐氨鏁版嵁"
                        :image-size="110"
                      />

                      <!-- 鍏ㄥ睆鍥捐氨瀵硅瘽妗?-->
                      <el-dialog
                        v-model="expandVisible"
                        fullscreen
                        :show-close="true"
                        class="expand-graph-modal"
                        @opened="renderExpandedGraph"
                        @closed="destroyExpandedGraph"
                        destroy-on-close
                      >
                        <!-- 鍏ㄥ睆鍐呭鍖哄煙 -->
                        <div class="expanded-wrapper">
                          <!-- 鑳屾櫙鍥?-->
                          <div class="expanded-bg"></div>
                          
                          <!-- 鍥惧舰瀹瑰櫒 -->
                          <div ref="expandedContainer" class="expanded-container"></div>
                          
                          <!-- 椤堕儴鏍囬 -->
                          <div class="expanded-header">
                            <h2>鐭ヨ瘑鍥捐氨璇︽儏</h2>
                            <p>按 ESC 键退出全屏</p>
                          </div>
                        </div>
                      </el-dialog>

                      <el-dialog
                        v-model="graphEditVisible"
                        width="980px"
                        destroy-on-close
                        class="graph-edit-dialog"
                      >
                        <template #header>
                          <div class="graph-edit-header">
                            <div class="graph-edit-title">缂栬緫闂瓟鍥捐氨</div>
                            <div class="graph-edit-subtitle">支持修改实体名称、实体类型、关系名称，以及关系连接的起点和终点。</div>
                          </div>
                        </template>

                        <div class="graph-edit-section">
                          <div class="graph-edit-section-title">瀹炰綋</div>
                          <el-table :data="editableSubgraph.nodes" stripe max-height="260">
                            <el-table-column label="瀹炰綋 ID" min-width="220">
                              <template #default="{ row }">
                                <span class="graph-edit-id">{{ row.id }}</span>
                              </template>
                            </el-table-column>
                            <el-table-column label="鍚嶇О" min-width="180">
                              <template #default="{ row }">
                                <el-input v-model="row.label" placeholder="Entity name" />
                              </template>
                            </el-table-column>
                            <el-table-column label="绫诲瀷" min-width="160">
                              <template #default="{ row }">
                                <el-input v-model="row.type" placeholder="渚嬪 Person / Org / Entity" />
                              </template>
                            </el-table-column>
                          </el-table>
                        </div>

                        <div class="graph-edit-section">
                          <div class="graph-edit-section-title">鍏崇郴</div>
                          <el-table :data="editableSubgraph.edges" stripe max-height="280">
                            <el-table-column label="鍏崇郴 ID" min-width="180">
                              <template #default="{ row }">
                                <span class="graph-edit-id">{{ row.id }}</span>
                              </template>
                            </el-table-column>
                            <el-table-column label="鍏崇郴鍚嶇О" min-width="160">
                              <template #default="{ row }">
                                <el-input v-model="row.label" placeholder="Relation name" />
                              </template>
                            </el-table-column>
                            <el-table-column label="璧风偣瀹炰綋" min-width="190">
                              <template #default="{ row }">
                                <el-select v-model="row.source" placeholder="閫夋嫨璧风偣瀹炰綋" filterable style="width: 100%">
                                  <el-option
                                    v-for="node in editableNodeOptions"
                                    :key="node.value"
                                    :label="node.label"
                                    :value="node.value"
                                  />
                                </el-select>
                              </template>
                            </el-table-column>
                            <el-table-column label="缁堢偣瀹炰綋" min-width="190">
                              <template #default="{ row }">
                                <el-select v-model="row.target" placeholder="閫夋嫨缁堢偣瀹炰綋" filterable style="width: 100%">
                                  <el-option
                                    v-for="node in editableNodeOptions"
                                    :key="node.value"
                                    :label="node.label"
                                    :value="node.value"
                                  />
                                </el-select>
                              </template>
                            </el-table-column>
                          </el-table>
                        </div>

                        <template #footer>
                          <div class="graph-edit-footer">
                            <el-button @click="graphEditVisible = false">鍙栨秷</el-button>
                            <el-button type="primary" :loading="savingGraphEdits" @click="saveGraphEdits">
                              淇濆瓨淇敼
                            </el-button>
                          </div>
                        </template>
                      </el-dialog>
                    </el-tab-pane>
                  </el-tabs>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed, watch, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Upload, UploadFilled, Document, Search, Share, Loading, Position, Promotion, Edit } from '@element-plus/icons-vue'
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
const graphScope = ref('current')
const graphRegionCount = computed(() => {
  return new Set(
    (graphData.value.nodes || [])
      .map(node => node.combo_id || node.comboId)
      .filter(Boolean)
  ).size
})
const graphScopeTitle = computed(() => {
  return graphScope.value === 'all'
    ? 'Document Partition View'
    : 'Focused Document View'
})
const graphScopeHint = computed(() => {
  return graphScope.value === 'all'
    ? 'Each circle groups entities from one source document. Dashed links indicate cross-document relations.'
    : 'Focus on the current document while keeping cross-document links visible as dashed connectors.'
})

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
    'uploaded': { type: 'info', text: '已上传' },
    'processing': { type: 'warning', text: '处理中' },
    'completed': { type: 'success', text: '已完成' },
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
            <span class="info-label">处理状态</span>
            <span class="info-value status-tag">${statusInfo.text}</span>
          </div>
        </div>
        
        <div class="doc-detail-footer">
          <el-icon class="check-icon"><Check /></el-icon>
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
    ElMessage.success('文本分块完成，共 ' + chunks.value.length + ' 个块')
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
    ElMessage.success('实体抽取完成，共 ' + triplets.value.length + ' 个三元组')
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
    ElMessage.success('图谱构建完成，耗时 ' + buildTime.value + ' 秒')

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
    'initialized': '初始化',
    'parsing': '解析文档',
    'chunking': '文本分块',
    'extracting': '实体抽取',
    'building_graph': '构建图谱',
    'completed': '处理完成'
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
        console.log('进度:', progress + '% | 阶段:', stage, '|', message)
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
    const payload = {
      limit: graphScope.value === 'all' ? 240 : 120
    }

    if (graphScope.value !== 'all' && docId.value) {
      payload.doc_id = docId.value
    }

    const res = await request.post('/api/kg/get-graph', payload)

    if (isDisposed.value) return

    graphData.value = res.data.graph
    await nextTick()
    if (isDisposed.value) return

    renderGraph()
  } catch (error) {
    ElMessage.error('鍔犺浇鍥捐氨鏁版嵁澶辫触')
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
        const sourceDocs = Array.isArray(model.sourceDocumentIds)
          ? model.sourceDocumentIds.join(', ')
          : ''
        outDiv.innerHTML = [
          '<div style="font-weight:700; margin-bottom:6px;">节点</div>',
          '<div><span style="opacity:.7;">Label:</span>' + (model.label || model.id || '') + '</div>',
          '<div><span style="opacity:.7;">ID:</span>' + (model.id || '') + '</div>',
          '<div><span style="opacity:.7;">Group:</span>' + (model.comboLabel || 'Ungrouped') + '</div>',
          '<div><span style="opacity:.7;">Docs:</span>' + (sourceDocs || '-') + '</div>'
        ].join('')
      } else {
        outDiv.innerHTML = [
          '<div style="font-weight:700; margin-bottom:6px;">关系</div>',
          '<div><span style="opacity:.7;">Label:</span>' + (model.label || '') + '</div>',
          '<div><span style="opacity:.7;">Source:</span>' + (model.source || '') + '</div>',
          '<div><span style="opacity:.7;">Target:</span>' + (model.target || '') + '</div>',
          '<div><span style="opacity:.7;">Scope:</span>' + (model.isCrossCombo ? 'Cross-doc' : 'Intra-doc') + '</div>'
        ].join('')
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
      comboLabel: node.combo_label ? String(node.combo_label) : '',
      entityId: node.entity_id ? String(node.entity_id) : '',
      sourceDocumentIds: Array.isArray(node.source_document_ids) ? node.source_document_ids : [],
      documentCount: Number(node.document_count || 0),
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
      id: 'edge-' + idx,
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
  graphScope.value = 'current'
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
const graphEditVisible = ref(false)
const savingGraphEdits = ref(false)
const editableSubgraph = ref({ nodes: [], edges: [] })
const explainTab = ref('chunks')
const chatScroll = ref(null)
const conversationId = ref('')
const typewriterTimers = ref([])
const editableNodeOptions = computed(() => {
  return (editableSubgraph.value.nodes || []).map(node => ({
    value: String(node.id),
    label: (node.label || node.id) + ' (' + (node.type || 'Entity') + ')',
  }))
})

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
  graphEditVisible.value = false
  editableSubgraph.value = { nodes: [], edges: [] }
  typewriterTimers.value.forEach(timer => clearInterval(timer))
  typewriterTimers.value = []

  conversationId.value = generateConversationId()
  console.log('鏂板缓浼氳瘽ID:', conversationId.value)

  ElMessage.success('已创建新的对话')
}

// 鍙戦€侀棶棰?
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
      id: String(edge.id ?? (edge.source + '-' + edge.label + '-' + edge.target)),
      source: String(edge.source),
      target: String(edge.target),
      label: String(edge.label ?? ''),
      current_label: String(edge.current_label ?? edge.label ?? '')
    }))
  }
}

const openGraphEditor = () => {
  if (!subgraphData.value?.nodes?.length) {
    ElMessage.warning('褰撳墠娌℃湁鍙紪杈戠殑鍥捐氨鏁版嵁')
    return
  }

  editableSubgraph.value = cloneSubgraphForEditing(subgraphData.value)
  graphEditVisible.value = true
}

const saveGraphEdits = async () => {
  const nodes = editableSubgraph.value.nodes || []
  const edges = editableSubgraph.value.edges || []

  if (!nodes.length && !edges.length) {
    ElMessage.warning('褰撳墠娌℃湁鍙繚瀛樼殑淇敼')
    return
  }

  const invalidNode = nodes.find(node => !String(node.label || '').trim() || !String(node.type || '').trim())
  if (invalidNode) {
    ElMessage.warning('瀹炰綋鍚嶇О鍜屽疄浣撶被鍨嬮兘涓嶈兘涓虹┖')
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
      nodes: payload.nodes.map(node => ({
        ...node,
        label: node.label,
        type: node.type
      })),
      edges: payload.edges.map(edge => ({
        ...edge,
        label: edge.label
      }))
    }

    graphEditVisible.value = false
    await nextTick()
    if (!isDisposed.value) {
      renderSubgraph()
    }
    ElMessage.success('鍥捐氨淇敼宸叉彁浜わ紝姝ｅ湪鍚庡彴寮傛淇濆瓨')
  } catch (error) {
    console.error('淇濆瓨鍥捐氨淇敼澶辫触:', error)
    ElMessage.error(error.response?.data?.detail || '淇濆瓨鍥捐氨淇敼澶辫触')
  } finally {
    savingGraphEdits.value = false
  }
}

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
  graphEditVisible.value = false
  editableSubgraph.value = { nodes: [], edges: [] }
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
            console.log('向量检索找到', data.data?.length, '个文档块')
            startTypewriterEffect()
          } else if (data.type === 'graph_data') {
            subgraphData.value = data.data || null
            loadingStatus.value.graphSearch = false
            console.log('图谱检索找到', data.data?.nodes?.length, '个节点')
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
    type: String(node.type ?? 'Entity'),
    style: { fill: palette[i % palette.length] },
    x: width / 2 + (Math.random() - 0.5) * 50,
    y: height / 2 + (Math.random() - 0.5) * 50
  }));

  const processedEdges = rawEdges.map((edge, i) => ({
    id: String(edge.id ?? ('subedge-' + i)),
    source: String(edge.source),
    target: String(edge.target),
    label: edge.label || '',
    current_label: String(edge.current_label ?? edge.label ?? '')
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
      displayedChunks.value[index].content += '<span class="glow-char">' + escapedChar + '</span>'
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
      return '<p class="text-line">' + line + '</p>'
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
</script>

<style scoped>
.knowledge-graph-container {
  --bg-0: #0b1020;
  --card: rgba(255, 255, 255, 0.92);
  --text: #0f172a;
  --shadow: 0 10px 30px rgba(2, 6, 23, 0.18);
  --shadow-soft: 0 8px 22px rgba(2, 6, 23, 0.12);
  --radius: 14px;
  /* Chat Specific Variables */
  --chat-bg-user: linear-gradient(135deg, #6366f1, #8b5cf6);
  --chat-bg-ai: #ffffff;
  --chat-text-ai: #1e293b;

  min-height: 100vh;
  position: relative;
  background: radial-gradient(1100px 700px at 15% 15%, rgba(99, 102, 241, 0.35), transparent 55%),
    radial-gradient(900px 650px at 85% 20%, rgba(168, 85, 247, 0.25), transparent 55%),
    radial-gradient(900px 650px at 60% 90%, rgba(34, 197, 94, 0.15), transparent 55%),
    linear-gradient(135deg, #0b1020 0%, #111a33 40%, #0b1020 100%);
  box-sizing: border-box;
  overflow-y: visible;
  padding-bottom: 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 鑳屾櫙鏋佸厜鍔ㄧ敾 */
.bg-aurora {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.65;
  background:
    radial-gradient(900px 500px at 20% 10%, rgba(56, 189, 248, 0.32), transparent 60%),
    radial-gradient(900px 520px at 85% 30%, rgba(251, 113, 133, 0.26), transparent 60%),
    radial-gradient(900px 520px at 50% 95%, rgba(34, 197, 94, 0.22), transparent 60%);
  filter: blur(20px);
}

.content-wrapper {
  position: relative;
  z-index: 1;
  padding: 20px;
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

/* 鑱婂ぉ鍗＄墖鏍峰紡 */
.chat-card :deep(.el-card__body) {
  padding: 0 !important;
  height: 100% !important;
  overflow: hidden;
}

/* 鑱婂ぉ鐣岄潰缇庡寲鏍峰紡 */
.chat-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  overflow: hidden;
  background-color: rgba(246, 249, 252, 0.5);
  background-image: 
    radial-gradient(rgba(148, 163, 184, 0.2) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.4), rgba(255,255,255,0.1));
  background-size: 20px 20px, 100% 100%;
}

.chat-scroll-area {
  flex: 1;
  height: 0;
  width: 100%;
}

:deep(.chat-scroll-wrap) {
  scroll-behavior: smooth;
  height: 100%;
}
:deep(.el-scrollbar__bar.is-vertical) {
  width: 4px;
}
:deep(.el-scrollbar__thumb) {
  background-color: rgba(148, 163, 184, 0.3);
}

.chat-messages {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px 16px;
}

.chat-bottom-spacer {
  height: 140px; 
  width: 100%;
  flex-shrink: 0;
}

.chat-start-placeholder {
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
  opacity: 0.8;
  animation: fadeIn 0.8s ease;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}

.chat-start-placeholder h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #1e293b;
}

.message {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  align-items: flex-start;
  animation: slideIn 0.3s ease;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
}

.message-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
}

.ai-avatar-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border: 1px solid #bbf7d0;
  display: grid;
  place-items: center;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.15);
  position: relative;
  overflow: hidden;
}

.ai-icon {
  font-size: 20px;
  z-index: 2;
}

.typing-state {
  animation: pulse-avatar 2s infinite;
}

@keyframes pulse-avatar {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.message-bubble {
  max-width: 75%;
  padding: 14px 18px;
  position: relative;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  line-height: 1.6;
}

.message-bubble.user {
  background: var(--chat-bg-user);
  color: #fff;
  border-radius: 20px 20px 4px 20px;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.25);
}

.message-bubble.assistant {
  background: var(--chat-bg-ai);
  color: var(--chat-text-ai);
  border-radius: 20px 20px 20px 4px;
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.message-text {
  font-size: 14px;
  word-wrap: break-word;
}

.message.user .message-text {
  font-weight: 500;
}

.message.assistant .message-text {
  font-family: 'STKaiti', 'KaiTi', 'STXingkai', '鍗庢枃琛屾シ', '鍗庢枃鏂伴瓘', 'FangSong',
               'Noto Sans SC', 'Microsoft YaHei', serif;
  font-size: 15px;
  line-height: 1.8;
  letter-spacing: 0.5px;
  background: linear-gradient(135deg,
    #667eea 0%,
    #764ba2 25%,
    #f093fb 50%,
    #4facfe 75%,
    #00f2fe 100%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-flow 6s ease infinite;
}

@keyframes gradient-flow {
  0%, 100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

.message.assistant .message-text :deep(b),
.message.assistant .message-text :deep(strong),
.message.assistant .message-text :deep(i),
.message.assistant .message-text :deep(em),
.message.assistant .message-text :deep(.inline-code) {
  -webkit-text-fill-color: currentColor;
  background: none;
}

.message.assistant .message-text :deep(.emoji-char) {
  -webkit-text-fill-color: initial;
  background: none;
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji',
               'Segoe UI Symbol', 'Android Emoji', 'EmojiSymbols', sans-serif;
  display: inline-block;
}

.message-text :deep(.inline-code) {
  background: rgba(0,0,0,0.06);
  padding: 2px 5px;
  border-radius: 4px;
  font-family: 'Menlo', monospace;
  font-size: 0.9em;
  color: #d946ef;
}
.message.user .message-text :deep(.inline-code) {
  background: rgba(255,255,255,0.2);
  color: #fff;
}

.message-time {
  font-size: 10px;
  margin-top: 6px;
  opacity: 0.6;
  text-align: right;
}
.message.user .message-time { color: rgba(255,255,255,0.9); }

/* 鎵撳瓧鍔ㄧ敾 */
.typing {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #64748b;
  font-weight: 600;
  font-size: 13px;
}

.typing-dot {
  width: 5px;
  height: 5px;
  background: #64748b;
  border-radius: 50%;
  animation: typing-bounce 1.4s infinite ease-in-out both;
}
.typing-dot:nth-child(1) { animation-delay: -0.32s; }
.typing-dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 0.8; }
}

/* 杈撳叆鍖哄煙鏍峰紡 */
.chat-input-container {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(to top, #ffffff 70%, rgba(255,255,255,0.8) 90%, rgba(255,255,255,0));
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none; 
}

.chat-input-wrapper {
  pointer-events: auto;
  position: relative;
  width: 100%;
  max-width: 600px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 30px;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1), 
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0,0,0,0.05);
  padding: 4px;
  transition: box-shadow 0.2s;
  display: flex;
  align-items: center;
}

.chat-input-wrapper:focus-within {
  box-shadow: 
    0 10px 15px -3px rgba(99, 102, 241, 0.15), 
    0 4px 6px -2px rgba(99, 102, 241, 0.1),
    0 0 0 2px rgba(99, 102, 241, 0.2);
}

.floating-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background: transparent !important;
  padding-left: 16px;
  padding-right: 48px;
  height: 48px;
}

.floating-input :deep(.el-input__inner) {
  font-size: 15px;
  color: #1e293b;
}
.floating-input :deep(.el-input__inner::placeholder) {
  color: #94a3b8;
}

.send-btn {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  border: none;
  color: white;
  transition: transform 0.2s, box-shadow 0.2s;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-50%) scale(1.05);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}
.send-btn:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.input-hint {
  font-size: 11px;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
  background: rgba(255,255,255,0.6);
  padding: 4px 8px;
  border-radius: 8px;
}

.hint-badge {
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 700;
  color: #475569;
}

/* 鏋勫缓娴佺▼鏍峰紡 */
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

.steps-container :deep(.el-step) {
  position: relative;
}

.steps-container :deep(.el-step__icon) {
  width: 52px !important;
  height: 52px !important;
  border-radius: 16px !important;
  transition: all 0.3s ease !important;
  position: relative !important;
  overflow: visible !important;
  border: 2px solid transparent !important;
}

.steps-container :deep(.el-step__icon-inner) {
  font-size: 24px !important;
  font-weight: bold !important;
  position: relative !important;
  z-index: 2 !important;
}

.steps-container :deep(.el-step__icon.is-text) {
  background: rgba(255, 255, 255, 0.85) !important;
  border-color: rgba(148, 163, 184, 0.30) !important;
  box-shadow: 0 4px 12px rgba(2, 6, 23, 0.08) !important;
}

.steps-container :deep(.el-step.is-process .el-step__icon) {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(99, 102, 241, 0.95)) !important;
  border-color: rgba(59, 130, 246, 0.50) !important;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35) !important;
  animation: pulseGlow 2s ease-in-out infinite !important;
}

.steps-container :deep(.el-step.is-process .el-step__icon-inner) {
  color: #ffffff !important;
}

.steps-container :deep(.el-step.is-success .el-step__icon) {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.95)) !important;
  border-color: rgba(34, 197, 94, 0.50) !important;
  box-shadow: 0 6px 18px rgba(34, 197, 94, 0.28) !important;
}

.steps-container :deep(.el-step.is-success .el-step__icon-inner) {
  color: #ffffff !important;
}

.steps-container :deep(.el-step:nth-child(1) .el-step__icon.is-text::before) {
  content: '馃摛' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 28px !important;
  opacity: 0.3 !important;
  z-index: 1 !important;
}

.steps-container :deep(.el-step:nth-child(2) .el-step__icon.is-text::before) {
  content: '馃搫' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 28px !important;
  opacity: 0.3 !important;
  z-index: 1 !important;
}

.steps-container :deep(.el-step:nth-child(3) .el-step__icon.is-text::before) {
  content: '馃攳' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 28px !important;
  opacity: 0.3 !important;
  z-index: 1 !important;
}

.steps-container :deep(.el-step:nth-child(4) .el-step__icon.is-text::before) {
  content: 'KG' !important;
  position: absolute !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  font-size: 28px !important;
  opacity: 0.3 !important;
  z-index: 1 !important;
}

.steps-container :deep(.el-step__title) {
  font-size: 14px !important;
  font-weight: 700 !important;
  color: rgba(255, 255, 255, 0.85) !important;
  margin-top: 8px !important;
}

.steps-container :deep(.el-step.is-process .el-step__title) {
  color: rgba(255, 255, 255, 0.98) !important;
  font-weight: 800 !important;
}

.steps-container :deep(.el-step.is-success .el-step__title) {
  color: rgba(255, 255, 255, 0.90) !important;
}

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
  border: 1px solid rgba(59,130, 246, 0.18);
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

.step-upload-theme {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(99,102,241,0.05) 100%) !important;
  border: 2px solid rgba(59,130,246,0.25) !important;
}

.step-chunk-theme {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(16,185,129,0.05) 100%) !important;
  border: 2px solid rgba(34,197,94,0.25) !important;
}

.step-extract-theme {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(147,51,234,0.05) 100%) !important;
  border: 2px solid rgba(168,85,247,0.25) !important;
}

.step-graph-theme {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(251,146,60,0.05) 100%) !important;
  border: 2px solid rgba(245,158,11,0.25) !important;
}

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

.upload-decoration .deco-pattern {
  position: absolute;
  top: 20%;
  right: 8%;
  width: 160px;
  height: 200px;
  background:
    linear-gradient(to bottom, rgba(59,130,246,0.18) 2px, transparent 2px),
    linear-gradient(to right, rgba(59,130,246,0.18) 2px, transparent 2px);
  background-size: 20px 20px;
  border-radius: 12px;
  transform: rotate(-15deg);
  opacity: 0.5;
  animation: slideDown 4s ease-in-out infinite;
}

.chunk-decoration .deco-grid {
  position: absolute;
  top: 15%;
  right: 5%;
  width: 200px;
  height: 200px;
  background-image:
    repeating-linear-gradient(0deg, rgba(34,197,94,0.22) 0px, rgba(34,197,94,0.22) 1px, transparent 1px, transparent 25px),
    repeating-linear-gradient(90deg, rgba(34,197,94,0.22) 0px, rgba(34,197,94,0.22) 1px, transparent 1px, transparent 25px);
  border-radius: 12px;
  transform: rotate(12deg);
  animation: pulse 3s ease-in-out infinite;
}

.extract-decoration .deco-wave {
  position: absolute;
  top: 25%;
  right: 10%;
  width: 180px;
  height: 120px;
  background:
    radial-gradient(circle at 20% 50%, rgba(168,85,247,0.25) 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, rgba(168,85,247,0.25) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(168,85,247,0.25) 0%, transparent 50%);
  background-size: 60px 60px;
  border-radius: 12px;
  animation: wave 4s ease-in-out infinite;
}

.graph-decoration .deco-network {
  position: absolute;
  top: 20%;
  right: 8%;
  width: 180px;
  height: 180px;
  background-image:
    radial-gradient(circle at 30% 30%, rgba(245,158,11,0.35) 3px, transparent 3px),
    radial-gradient(circle at 70% 30%, rgba(245,158,11,0.35) 3px, transparent 3px),
    radial-gradient(circle at 50% 70%, rgba(245,158,11,0.35) 3px, transparent 3px),
    linear-gradient(135deg, rgba(245,158,11,0.22) 2px, transparent 2px);
  background-size: 100% 100%, 100% 100%, 100% 100%, 80px 80px;
  border-radius: 12px;
  animation: rotate360 8s linear infinite;
}

.upload-emoji {
  background: linear-gradient(135deg, rgba(59,130,246,0.18) 0%, rgba(99,102,241,0.15) 100%) !important;
  border-color: rgba(59,130,246,0.30) !important;
}

.chunk-emoji {
  background: linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(16,185,129,0.15) 100%) !important;
  border-color: rgba(34,197,94,0.30) !important;
}

.extract-emoji {
  background: linear-gradient(135deg, rgba(168,85,247,0.18) 0%, rgba(147,51,234,0.15) 100%) !important;
  border-color: rgba(168,85,247,0.30) !important;
}

.graph-emoji {
  background: linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(251,146,60,0.15) 100%) !important;
  border-color: rgba(245,158,11,0.30) !important;
}

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

.one-click-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  box-shadow: 0 12px 22px rgba(16, 185, 129, 0.18);
  margin-top: 4px;
}

.one-click-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 14px 26px rgba(16, 185, 129, 0.25);
}

.one-click-btn:disabled {
  background: #94a3b8;
  box-shadow: none;
}

.async-upload-progress {
  margin-top: 16px;
  padding: 16px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.20);
  border-radius: 14px;
  animation: fadeInUp 0.4s ease;
}

.async-upload-progress .progress-description {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #475569;
  font-weight: 600;
}

.async-upload-progress .el-icon {
  font-size: 16px;
  color: #10b981;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.graph-mode-bar {
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.graph-mode-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.graph-mode-title {
  font-size: 14px;
  font-weight: 800;
  color: rgba(15, 23, 42, 0.92);
}

.graph-mode-hint {
  font-size: 12px;
  color: rgba(71, 85, 105, 0.88);
  max-width: 620px;
  line-height: 1.6;
}

.graph-mode-legend {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.legend-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(255, 255, 255, 0.82);
  color: rgba(51, 65, 85, 0.95);
}

.legend-pill-solid::before,
.legend-pill-dashed::before {
  content: '';
  width: 18px;
  height: 2px;
  margin-right: 8px;
  border-radius: 999px;
  background: rgba(71, 85, 105, 0.78);
}

.legend-pill-dashed::before {
  background: transparent;
  border-top: 2px dashed rgba(148, 163, 184, 0.72);
}

.graph-mode-bar .stat-card {
  min-width: 132px;
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
  background: radial-gradient(900px 400px at 20% 10%, rgba(59,130,246,0.10), transparent 60%),
    radial-gradient(900px 400px at 80% 20%, rgba(168,85,247,0.08), transparent 60%),
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
  height: calc(100vh - 220px); 
  min-height: 560px;
  display: flex;
  flex-direction: column;
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
  background: rgba(255, 255, 255, 0.92);
  position: relative;
  overflow: visible;
  opacity: 0;
  transform: translateY(20px);
  animation: slideInUp 0.6s ease forwards;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.source-chunk-item:nth-child(2) { animation-delay: 0s; }
.source-chunk-item:nth-child(3) { animation-delay: 0.15s; }
.source-chunk-item:nth-child(4) { animation-delay: 0.3s; }
.source-chunk-item:nth-child(5) { animation-delay: 0.45s; }
.source-chunk-item:nth-child(6) { animation-delay: 0.6s; }

.source-chunk-item::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 18px;
  padding: 4px;
  background: linear-gradient(
    60deg,
    #6366f1,
    #8b5cf6,
    #d946ef,
    #f43f5e,
    #f59e0b,
    #10b981,
    #3b82f6,
    #6366f1
  );
  background-size: 300% 300%;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: borderFlow 3s linear infinite;
  opacity: 1;
  box-shadow: 0 0 25px rgba(102, 126, 234, 0.5);
  pointer-events: none;
}

.source-chunk-item.chunk-animating::before {
  inset: -2px;
  padding: 2px;
  filter: blur(2px);
  animation: borderFlow 2s linear infinite;
  box-shadow: 0 0 35px rgba(102, 126, 234, 0.8);
}

.source-chunk-item.chunk-complete::before {
  inset: -3px;
  padding: 3px;
  background: linear-gradient(
    90deg,
    #a855f7 0%,
    #9333ea 25%,
    #7e22ce 50%,
    #9333ea 75%,
    #a855f7 100%
  );
  background-size: 200% 100%;
  animation: borderFlow 5s linear infinite;
  opacity: 0.3;
  box-shadow: none;
}

.source-chunk-item:hover {
  transform: translateY(-3px);
  box-shadow: 0 20px 40px rgba(99, 102, 241, 0.25);
}

@keyframes slideInUp {
  0% {
    opacity: 0;
    transform: translateY(60px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes borderFlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 100% 50%;
  }
}

.source-chunk-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chunk-badge {
  display: inline-flex;
  align-items: stretch;
  gap: 0;
  padding: 8px 14px;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  background: 
    linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%),
    linear-gradient(
      90deg,
      #667eea 0%,
      #764ba2 14%,
      #f093fb 28%,
      #f5576c 42%,
      #4facfe 57%,
      #00f2fe 71%,
      #43e97b 85%,
      #38f9d7 100%
    ),
    linear-gradient(135deg, 
      rgba(251, 191, 36, 0.9) 0%,
      rgba(245, 158, 11, 0.95) 25%,
      rgba(251, 191, 36, 0.9) 50%,
      rgba(217, 119, 6, 0.95) 75%,
      rgba(245, 158, 11, 0.9) 100%
    );
  background-size: 100% 100%, 300% 300%, 200% 200%;
  animation: 
    badgeRainbow 8s linear infinite,
    badgeGoldFlow 4s ease infinite;
  border: 2px solid rgba(251, 191, 36, 0.6);
  box-shadow: 
    0 6px 20px rgba(251, 191, 36, 0.4),
    0 3px 10px rgba(102, 126, 234, 0.3),
    inset 0 2px 4px rgba(255, 255, 255, 0.4),
    inset 0 -2px 4px rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.chunk-badge::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.5),
    transparent
  );
  background-size: 200% 100%;
  animation: badgeShine 2.5s ease-in-out infinite;
  pointer-events: none;
  z-index: 3;
}

.chunk-badge::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background-image: 
    radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.3) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.5;
  pointer-events: none;
  z-index: 2;
}

.badge-corner {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.7);
  z-index: 4;
  animation: cornerGlow 2s ease-in-out infinite alternate;
}

.badge-corner-tl {
  top: 4px;
  left: 4px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 8px;
  animation-delay: 0s;
}

.badge-corner-tr {
  top: 4px;
  right: 4px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 8px;
  animation-delay: 0.5s;
}

.badge-corner-bl {
  bottom: 4px;
  left: 4px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 8px;
  animation-delay: 1s;
}

.badge-corner-br {
  bottom: 4px;
  right: 4px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 8px;
  animation-delay: 1.5s;
}

.badge-icon-area {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.05));
  border-radius: 12px;
  margin-right: 10px;
  backdrop-filter: blur(4px);
  flex-shrink: 0;
  z-index: 5;
}

.badge-icon-area::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 14px;
  background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #667eea);
  background-size: 200% 200%;
  animation: iconBorderGlow 3s linear infinite;
  opacity: 0.8;
  z-index: -1;
}

.badge-icon-glow {
  position: absolute;
  width: 20px;
  height: 20px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.6) 0%, transparent 70%);
  animation: glowPulse 2s ease-in-out infinite;
  z-index: -1;
}

.badge-icon-area .badge-icon {
  font-size: 18px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  animation: iconFloat 3s ease-in-out infinite;
  position: relative;
  z-index: 1;
}

.badge-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-right: 12px;
  z-index: 5;
  min-width: 90px;
}

.badge-number-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.badge-prefix {
  font-size: 9px;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 1.5px;
}

.badge-number {
  font-size: 18px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 
    0 0 10px rgba(102, 126, 234, 0.8),
    0 0 20px rgba(118, 75, 162, 0.6),
    0 2px 4px rgba(0, 0, 0, 0.4);
  background: linear-gradient(135deg, #fff 0%, #e0e7ff 50%, #fff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: numberGlow 2s ease-in-out infinite alternate;
}

.badge-meta {
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge-label-source {
  font-size: 9px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.85);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-separator {
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
}

.badge-label-index {
  font-size: 9px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.badge-stars {
  display: flex;
  gap: 6px;
  align-items: center;
  z-index: 5;
}

.badge-stars .star {
  font-size: 12px;
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.6));
  animation: starTwinkle 1.5s ease-in-out infinite;
}

.badge-stars .star-1 {
  animation-delay: 0s;
  color: rgba(255, 215, 0, 0.9);
}

.badge-stars .star-2 {
  animation-delay: 0.5s;
  color: rgba(255, 255, 255, 0.95);
}

.badge-stars .star-3 {
  animation-delay: 1s;
  color: rgba(255, 215, 0, 0.9);
}

@keyframes badgeRainbow {
  0% {
    background-position: 0% 50%, 0% 50%, 0% 50%;
  }
  100% {
    background-position: 0% 50%, 100% 50%, 100% 50%;
  }
}

@keyframes badgeGoldFlow {
  0%, 100% {
    background-position: 0% 50%, 0% 50%, 0% 50%;
  }
  50% {
    background-position: 0% 50%, 100% 50%, 100% 50%;
  }
}

@keyframes badgeShine {
  0%, 100% {
    background-position: -200% 0;
  }
  50% {
    background-position: 200% 0;
  }
}

@keyframes cornerGlow {
  0% {
    opacity: 0.6;
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  }
  100% {
    opacity: 1;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.8);
  }
}

@keyframes iconBorderGlow {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-2px) rotate(3deg);
  }
  75% {
    transform: translateY(-2px) rotate(-3deg);
  }
}

@keyframes glowPulse {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes numberGlow {
  0% {
    filter: brightness(1);
  }
  100% {
    filter: brightness(1.3);
  }
}

@keyframes starTwinkle {
  0%, 100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.8;
  }
  25% {
    transform: scale(1.3) rotate(10deg);
    opacity: 1;
  }
  50% {
    transform: scale(1) rotate(0deg);
    opacity: 0.6;
  }
  75% {
    transform: scale(1.3) rotate(-10deg);
    opacity: 1;
  }
}

.chunk-text {
  font-size: 13px;
  color: rgba(15, 23, 42, 0.86);
  line-height: 1.75;
  white-space: pre-wrap;
  position: relative;
  z-index: 1;
}

.chunk-animating .chunk-text :deep(.glow-char) {
  display: inline;
  color: #b45309;
  font-weight: 700;
  animation: goldReveal 0.3s ease-out;
}

.chunk-complete .chunk-text :deep(.glow-char) {
  display: inline;
  color: #334155;
  text-shadow: none;
  animation: purpleFlow 3s ease-in-out infinite;
}

@keyframes goldReveal {
  0% {
    background-color: rgba(251, 191, 36, 0.2);
    color: #d97706;
  }
  100% {
    background-color: transparent;
    color: #b45309;
  }
}

@keyframes purpleFlow {
  0%, 100% {
    text-shadow: 0 0 0 rgba(168, 85, 247, 0);
  }
  50% {
    text-shadow: 0 0 5px rgba(168, 85, 247, 0.4);
    color: #475569;
  }
}

.typing-cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: linear-gradient(135deg, #667eea, #764ba2);
  margin-left: 2px;
  animation: cursorBlink 1s infinite;
  box-shadow: 0 0 8px rgba(102, 126, 234, 0.6);
}

@keyframes cursorBlink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.subgraph-stage {
  padding: 8px;
  border-radius: 16px;
  background: rgba(2, 6, 23, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.24);
  margin-bottom: 10px;
}

.subgraph-container {
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.8) 0%, rgba(240, 245, 255, 0.6) 100%);
  border: 1px solid rgba(148, 163, 184, 0.3);
  box-shadow: inset 0 0 20px rgba(99, 102, 241, 0.05);
}

:deep(.el-upload-dragger) {
  border-radius: 16px !important;
  border: 1px dashed rgba(59,130,246,0.42) !important;
  background: rgba(59,130,246,0.06) !important;
  transition: all 0.2s ease !important;
}

:deep(.el-upload-dragger:hover) {
  background: rgba(59,130,246,0.10) !important;
  border-color: rgba(59,130,246,0.62) !important;
}

:deep(.el-upload__text) {
  color: rgba(15,23,42,0.78) !important;
}

:deep(.el-upload__text em) {
  color: rgba(59,130,246,0.98) !important;
  font-style: normal !important;
  font-weight: 900 !important;
}

:deep(.el-button.is-plain) {
  border-radius: 12px !important;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 20px;
  color: rgba(15,23,42,0.65);
  font-size: 14px;
}

.loading-indicator .el-icon {
  font-size: 20px;
  color: rgba(59,130,246,0.85);
}

.model-option {
  display: flex;
  flex-direction: column;
  padding: 10px 16px;
  gap: 4px;
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
  display: block !important;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
  white-space: normal;
  word-break: break-all;
}

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

.doc-detail-content {
  padding: 20px;
  min-width: 400px;
}

.doc-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(148, 163, 184, 0.2);
  margin-bottom: 20px;
}

.doc-icon {
  font-size: 48px;
  animation: float 3s ease-in-out infinite;
}

.doc-title {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
  flex: 1;
  word-break: break-all;
}

.doc-detail-info {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.info-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(248, 250, 252, 0.8);
  border-radius: 10px;
  border-left: 3px solid #6366f1;
  transition: all 0.2s ease;
}

.info-item:hover {
  background: rgba(248, 250, 252, 1);
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
}

.info-label {
  font-size: 13px;
  font-weight: 700;
  color: #64748b;
}

.info-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.info-value.status-tag {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  color: #ffffff;
  font-weight: 700;
}

.doc-detail-footer {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 2px solid rgba(148, 163, 184, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #10b981;
  font-size: 14px;
  font-weight: 600;
}

.check-icon {
  font-size: 20px;
  animation: checkPulse 2s ease-in-out infinite;
}

@keyframes checkPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
}

.existing-doc-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.existing-doc-dialog .el-dialog__header {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  padding: 20px 24px;
  border-radius: 16px 16px 0 0;
}

.existing-doc-dialog .el-dialog__title {
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
}

.existing-doc-dialog .el-dialog__headerbtn .el-dialog__close {
  color: #ffffff;
  font-size: 24px;
}

.existing-doc-dialog .el-dialog__body {
  padding: 0;
  max-height: 70vh;
  overflow-y: auto;
}

.existing-doc-dialog .el-dialog__footer {
  padding: 20px 24px;
  background: rgba(248, 250, 252, 0.8);
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.expand-graph-modal {
  background: transparent !important;
  box-shadow: none !important;
  overflow: hidden !important;
}

.expand-graph-modal .el-dialog__body,
.expand-graph-modal .el-dialog__header {
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
}

.expand-graph-modal .el-dialog__headerbtn {
  top: 20px;
  right: 20px;
  z-index: 100;
  font-size: 24px;
}
.expand-graph-modal .el-dialog__headerbtn .el-dialog__close {
  color: #fff !important;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
}

.expanded-wrapper {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}

.expanded-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  background-image: url('/background/OIP.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  filter: brightness(0.6);
  transform: scale(1.05);
}

.expanded-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.expanded-header {
  position: absolute;
  top: 30px;
  left: 40px;
  z-index: 2;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2px 10px rgba(0,0,0,0.8);
}

.expanded-header h2 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 1px;
}

.expanded-header p {
  margin: 8px 0 0 0;
  font-size: 14px;
  opacity: 0.7;
}

.subgraph-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.78);
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.subgraph-toolbar-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.subgraph-toolbar-hint {
  margin-top: 4px;
  font-size: 12px;
  color: #64748b;
}

.graph-edit-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.graph-edit-title {
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
}

.graph-edit-subtitle {
  font-size: 13px;
  color: #64748b;
}

.graph-edit-section + .graph-edit-section {
  margin-top: 20px;
}

.graph-edit-section-title {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.graph-edit-id {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #475569;
}

.graph-edit-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
<style>
.custom-model-popper .el-select-dropdown__item {
  height: auto !important;
  padding: 0 !important;
  line-height: normal !important;
  overflow: visible !important;
}

.custom-model-popper .el-select-dropdown__item.selected {
  font-weight: normal;
}

.custom-model-popper .model-option {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 10px 16px;
  min-height: 60px;
  box-sizing: border-box;
}

.custom-model-popper .model-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
  line-height: 1.3;
}

.custom-model-popper .model-description {
  font-size: 12px;
  color: #64748b;
  line-height: 1.4;
  white-space: normal;
  word-wrap: break-word;
}
</style>
