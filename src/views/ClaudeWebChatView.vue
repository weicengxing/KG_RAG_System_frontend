<template>
  <div class="claude-chat-shell">
    <aside class="session-panel">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Web Chat</p>
          <h2>Claude 问答台</h2>
        </div>
        <button class="new-session-btn" :disabled="creatingSession" @click="createSession">
          {{ creatingSession ? '创建中...' : '新开对话' }}
        </button>
      </div>

      <div class="model-picker">
        <label for="model">模型</label>
        <select id="model" v-model="selectedModel" @change="handleModelChange">
          <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
          <option value="claude-opus-4-6">Claude Opus 4.6</option>
        </select>
      </div>

      <div class="session-meta" v-if="activeSessionId">
        <span>Session ID</span>
        <code>{{ activeSessionId }}</code>
      </div>

      <div class="session-list">
        <button
          v-for="session in sessions"
          :key="session.session_id"
          class="session-item"
          :class="{ active: session.session_id === activeSessionId }"
          @click="selectSession(session.session_id)"
        >
          <strong>{{ session.title || '新对话' }}</strong>
          <span>{{ formatTime(session.updated_at || session.created_at) }}</span>
          <small>{{ modelLabel(session.model) }}</small>
        </button>
      </div>
    </aside>

    <section class="chat-stage">
      <div class="chat-hero">
        <div>
          <p class="eyebrow">Session Memory</p>
          <h1>把历史对话接上，继续聊</h1>
        </div>
        <p>
          当前会话按 <code>sessionId</code> 识别。新开一轮会话时历史为空，继续提问时会自动带上之前的消息。
        </p>
      </div>

      <div ref="messageListRef" class="message-list">
        <div v-if="!activeSessionMessages.length" class="empty-state">
          <p>这里会展示当前会话的历史问答。</p>
          <p>先发一句试试，比如“你好，帮我写个接口”。</p>
        </div>

        <article
          v-for="(message, index) in activeSessionMessages"
          :key="`${message.created_at}-${index}`"
          class="message-card"
          :class="message.role"
        >
          <header>
            <span>{{ message.role === 'user' ? '你' : 'Claude' }}</span>
            <time>{{ formatTime(message.created_at) }}</time>
          </header>
          <pre>{{ message.content }}</pre>
        </article>
      </div>

      <form class="composer" @submit.prevent="sendMessage">
        <textarea
          v-model="draft"
          :disabled="sending || !activeSessionId"
          placeholder="输入你的问题，回车发送，Shift+Enter 换行"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact.stop
        />
        <div class="composer-bar">
          <span>{{ sending ? 'Claude 正在思考...' : '按 Enter 发送' }}</span>
          <button type="submit" :disabled="sending || !draft.trim() || !activeSessionId">
            {{ sending ? '发送中...' : '发送' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'

const STORAGE_KEY = 'claude-web-chat-active-session'

const sessions = ref([])
const activeSessionId = ref('')
const activeSession = ref(null)
const draft = ref('')
const sending = ref(false)
const creatingSession = ref(false)
const selectedModel = ref('claude-sonnet-4-6')
const messageListRef = ref(null)

const activeSessionMessages = computed(() => activeSession.value?.messages || [])

function modelLabel(model) {
  return model === 'claude-opus-4-6' ? 'Opus 4.6' : 'Sonnet 4.6'
}

function formatTime(value) {
  if (!value) return ''
  const date = new Date(value)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
}

async function loadSessions(preferredSessionId = '') {
  const { data } = await request.get('/api/web-chat/sessions')
  sessions.value = data.sessions || []

  const targetId = preferredSessionId || localStorage.getItem(STORAGE_KEY) || sessions.value[0]?.session_id
  if (targetId) {
    await selectSession(targetId)
    return
  }
  await createSession(false)
}

async function selectSession(sessionId) {
  const { data } = await request.get(`/api/web-chat/sessions/${sessionId}`)
  activeSessionId.value = data.session_id
  activeSession.value = data
  selectedModel.value = data.model || 'claude-sonnet-4-6'
  localStorage.setItem(STORAGE_KEY, data.session_id)
  await scrollToBottom()
}

async function createSession(showToast = true) {
  creatingSession.value = true
  try {
    const { data } = await request.post('/api/web-chat/sessions', {
      model: selectedModel.value,
    })
    sessions.value = [data, ...sessions.value]
    await selectSession(data.session_id)
    if (showToast) {
      ElMessage.success('已新开一轮对话')
    }
  } finally {
    creatingSession.value = false
  }
}

function handleModelChange() {
  if (!activeSession.value) return
  activeSession.value.model = selectedModel.value
  const item = sessions.value.find((entry) => entry.session_id === activeSessionId.value)
  if (item) {
    item.model = selectedModel.value
  }
}

async function sendMessage() {
  if (sending.value || !draft.value.trim() || !activeSessionId.value) {
    return
  }

  sending.value = true
  const text = draft.value.trim()
  draft.value = ''

  try {
    const { data } = await request.post('/api/web-chat/chat', {
      session_id: activeSessionId.value,
      message: text,
      model: selectedModel.value,
    })
    activeSession.value = data
    const index = sessions.value.findIndex((entry) => entry.session_id === data.session_id)
    if (index >= 0) {
      sessions.value[index] = { ...sessions.value[index], ...data }
    } else {
      sessions.value.unshift(data)
    }
    await scrollToBottom()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '发送失败')
  } finally {
    sending.value = false
  }
}

async function scrollToBottom() {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

watch(activeSessionMessages, async () => {
  await scrollToBottom()
})

onMounted(async () => {
  try {
    await loadSessions()
  } catch (error) {
    ElMessage.error(error.response?.data?.detail || '加载会话失败')
  }
})
</script>

<style scoped>
.claude-chat-shell {
  min-height: calc(100vh - 64px);
  display: grid;
  grid-template-columns: 320px 1fr;
  background:
    radial-gradient(circle at top left, rgba(255, 196, 128, 0.35), transparent 28%),
    radial-gradient(circle at bottom right, rgba(58, 95, 205, 0.18), transparent 30%),
    linear-gradient(135deg, #f7efe5 0%, #f2f4f8 48%, #e8edf5 100%);
}

.session-panel {
  border-right: 1px solid rgba(46, 58, 89, 0.08);
  padding: 24px 18px;
  background: rgba(255, 252, 248, 0.78);
  backdrop-filter: blur(18px);
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.panel-header,
.chat-hero,
.composer,
.message-card,
.model-picker,
.session-meta,
.session-item {
  border-radius: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.eyebrow {
  margin: 0 0 6px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 12px;
  color: #b46a31;
}

.panel-header h2,
.chat-hero h1 {
  margin: 0;
  color: #1f2a44;
}

.new-session-btn,
.composer button {
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.new-session-btn {
  padding: 12px 16px;
  background: linear-gradient(135deg, #c96b2c 0%, #e28f43 100%);
  color: #fff;
  font-weight: 700;
}

.new-session-btn:hover,
.composer button:hover {
  transform: translateY(-1px);
}

.model-picker,
.session-meta {
  background: rgba(255, 255, 255, 0.66);
  padding: 14px 16px;
  box-shadow: 0 12px 30px rgba(40, 52, 79, 0.06);
}

.model-picker label,
.session-meta span {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #6a748b;
}

.model-picker select,
.session-meta code,
.composer textarea {
  width: 100%;
  font: inherit;
}

.model-picker select {
  border: 1px solid rgba(31, 42, 68, 0.12);
  border-radius: 14px;
  padding: 12px 14px;
  background: #fff;
}

.session-meta code {
  display: block;
  word-break: break-all;
  color: #1f2a44;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow: auto;
}

.session-item {
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.62);
  padding: 16px;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(40, 52, 79, 0.05);
}

.session-item strong,
.session-item span,
.session-item small {
  display: block;
}

.session-item strong {
  margin-bottom: 8px;
  color: #1f2a44;
}

.session-item span,
.session-item small {
  color: #6a748b;
}

.session-item.active {
  border-color: rgba(201, 107, 44, 0.35);
  background: linear-gradient(135deg, rgba(255, 242, 230, 0.95), rgba(255, 255, 255, 0.9));
}

.chat-stage {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
}

.chat-hero {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  background: rgba(255, 255, 255, 0.66);
  box-shadow: 0 20px 40px rgba(31, 42, 68, 0.08);
}

.chat-hero p:last-child {
  max-width: 460px;
  color: #51607f;
  line-height: 1.6;
}

.message-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 6px;
}

.empty-state,
.message-card {
  background: rgba(255, 255, 255, 0.7);
  box-shadow: 0 16px 32px rgba(31, 42, 68, 0.08);
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: #6a748b;
  border-radius: 28px;
}

.message-card {
  padding: 18px 20px;
}

.message-card.user {
  align-self: flex-end;
  width: min(78%, 760px);
  background: linear-gradient(135deg, #1f2a44, #2c4167);
  color: #f7f7fb;
}

.message-card.assistant {
  align-self: flex-start;
  width: min(82%, 820px);
}

.message-card header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  font-size: 13px;
  color: inherit;
  opacity: 0.84;
}

.message-card pre {
  margin: 0;
  font-family: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.68;
}

.composer {
  padding: 18px;
  background: rgba(255, 255, 255, 0.78);
  box-shadow: 0 18px 38px rgba(31, 42, 68, 0.08);
}

.composer textarea {
  min-height: 110px;
  resize: vertical;
  border: none;
  background: transparent;
  outline: none;
  color: #1f2a44;
  line-height: 1.7;
}

.composer-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  color: #6a748b;
}

.composer button {
  padding: 12px 22px;
  background: linear-gradient(135deg, #1f2a44, #33548e);
  color: #fff;
  font-weight: 700;
}

.composer button:disabled,
.new-session-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 960px) {
  .claude-chat-shell {
    grid-template-columns: 1fr;
  }

  .session-panel {
    border-right: none;
    border-bottom: 1px solid rgba(46, 58, 89, 0.08);
  }

  .chat-hero {
    flex-direction: column;
  }

  .message-card.user,
  .message-card.assistant {
    width: 100%;
  }
}
</style>
