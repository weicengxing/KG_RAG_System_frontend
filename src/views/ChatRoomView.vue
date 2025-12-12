<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'

// ==================== 配置常量 ====================

// 从token中解析用户名
function extractUsernameFromToken(): string | null {
  const token = localStorage.getItem('token')
  if (!token) {
    console.error('No token found in localStorage')
    return null
  }
  
  try {
    // JWT格式：header.payload.signature
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    const username = decoded.sub // sub 字段就是用户名
    console.log('✅ 从token中解析出用户名:', username)
    return username
  } catch (e) {
    console.error('Failed to parse token:', e)
    return null
  }
}

const CURRENT_USER_ID = extractUsernameFromToken()
const WS_URL = CURRENT_USER_ID ? `ws://localhost:8000/api/chat/ws/${CURRENT_USER_ID}` : ''

// ==================== 类型定义 (匹配后端 Python 模型) ====================
interface MessageData {
  msg_id: string
  sender_id: string
  receiver_id: string // 虽然前端主要用 chat_id，但为了兼容后端数据
  content: string
  ts: number
  type: string
  // 前端附加状态
  status?: 'pending' | 'sent' | 'read' 
}

interface Contact {
  id: string
  username: string
  avatar: string
  lastMessage: string
  lastTime: string // 显示用的时间字符串
  unread: number
  active: boolean 
  status: 'online' | 'offline' | 'busy'
  // 聊天记录缓存 (实际应存储在 IndexedDB)
  messages: MessageData[] 
}

// ==================== 状态管理 ====================
const socket = ref<WebSocket | null>(null)
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const messageInput = ref('')
const contacts = ref<Contact[]>([
  // 模拟初始化联系人列表 (后端 /api/chat/contacts 接口返回的数据应映射到这里)
  { 
    id: 'user_2', 
    username: 'Sarah Chen', 
    avatar: 'https://i.pravatar.cc/150?u=1', 
    lastMessage: '那我们今晚见？', 
    lastTime: '10:42', 
    unread: 0, 
    active: true, 
    status: 'online',
    messages: [] 
  },
  { 
    id: 'user_3', 
    username: 'Alex Design', 
    avatar: 'https://i.pravatar.cc/150?u=2', 
    lastMessage: '设计稿已经发你邮箱了。', 
    lastTime: 'Yesterday', 
    unread: 2, 
    active: false, 
    status: 'busy',
    messages: [] 
  }
])

const searchQuery = ref('')
const currentChatId = ref('user_2') // 默认选中的聊天对象ID
const chatAreaRef = ref<HTMLElement | null>(null) // 用于滚动
const heartbeatTimer = ref<number | null>(null)
// ====== 新增：弹窗状态管理 ======
const showAddFriendModal = ref(false)
const addFriendInput = ref('')
const isAddingFriend = ref(false) // 这是一个 Loading 状态

// 打开弹窗
function openAddFriendModal() {
  showAddFriendModal.value = true
  addFriendInput.value = ''
  // 自动聚焦 (nextTick 等待 DOM 渲染)
  nextTick(() => {
    document.getElementById('add-friend-input')?.focus()
  })
}

// 关闭弹窗
function closeAddFriendModal() {
  showAddFriendModal.value = false
}

// ==================== 计算属性 ====================

// 过滤好友列表
const filteredContacts = computed(() => {
  return contacts.value.filter(c => 
    c.username.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// 当前选中的联系人对象
const activeContact = computed(() => {
  return contacts.value.find(c => c.id === currentChatId.value)
})

// 当前显示的聊天记录
const currentMessages = computed(() => {
  return activeContact.value?.messages || []
})

// ==================== 方法实现 ====================

// --- 1. WebSocket 连接与管理 ---
function initWebSocket() {
  if (!CURRENT_USER_ID || !WS_URL) {
    console.error('❌ 无法初始化WebSocket：用户名或URL为空')
    return
  }

  const token = localStorage.getItem('token')
  const wsUrlWithToken = `${WS_URL}?token=${token}`
  connectionStatus.value = 'connecting'
  socket.value = new WebSocket(wsUrlWithToken)

  socket.value.onopen = () => {
    console.log('✅ WebSocket Connected')
    connectionStatus.value = 'connected'
    startHeartbeat()
  }

  socket.value.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data)
      handleIncomingMessage(payload)
    } catch (e) {
      console.error('Parsed error:', e)
    }
  }

  socket.value.onclose = () => {
    console.warn('❌ WebSocket Disconnected')
    connectionStatus.value = 'disconnected'
    stopHeartbeat()
    // 简单的自动重连机制
    setTimeout(() => initWebSocket(), 3000)
  }

  socket.value.onerror = (error) => {
    console.error('WebSocket Error:', error)
  }
}

function startHeartbeat() {
  stopHeartbeat()
  // @ts-ignore
  heartbeatTimer.value = setInterval(() => {
    if (socket.value && socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify({ type: 'ping' }))
    }
  }, 30000) // 30秒一次心跳
}

function stopHeartbeat() {
  if (heartbeatTimer.value) {
    clearInterval(heartbeatTimer.value)
    heartbeatTimer.value = null
  }
}

// --- 2. 消息处理逻辑 ---

function handleIncomingMessage(payload: any) {
  // 处理心跳回应
  if (payload.type === 'pong') return

  // 处理新消息推送
  if (payload.type === 'new_message') {
    const msgData: MessageData = payload.data
    
    // 判断消息属于哪个联系人
    // 逻辑：如果 sender 是我，那就是发给 activeContact 的（虽然是回显）
    // 如果 sender 是别人，那就是那个 sender 对应的联系人
    const targetUserId = msgData.sender_id === CURRENT_USER_ID 
      ? msgData.receiver_id 
      : msgData.sender_id

    const contact = contacts.value.find(c => c.id === targetUserId)
    
    if (contact) {
      // **去重逻辑 (关键)**: 
      // 检查最后一条消息是否是 Pending 状态且内容相同（即使没有 ID 也尽量匹配）
      // 如果有，说明是乐观更新的回显，将状态改为 'sent'
      const lastMsg = contact.messages[contact.messages.length - 1]
      const isMyMessage = msgData.sender_id === CURRENT_USER_ID
      
      if (isMyMessage && lastMsg && lastMsg.status === 'pending' && lastMsg.content === msgData.content) {
        lastMsg.status = 'sent'
        lastMsg.msg_id = msgData.msg_id
        lastMsg.ts = msgData.ts // 更新服务端准确时间
      } else {
        // 是别人的新消息，或者是没做乐观更新的消息 -> 追加
        contact.messages.push({
          ...msgData,
          status: 'sent' // 别人的消息肯定是 sent
        })
        
        // 如果不是当前聊天窗口，增加未读数
        if (targetUserId !== currentChatId.value) {
          contact.unread++
        }
        
        // 自动滚动（如果在看这个人的话）
        if (targetUserId === currentChatId.value) {
          scrollToBottom()
        }
      }
      
      // 更新列表预览
      contact.lastMessage = msgData.content
      contact.lastTime = formatTime(msgData.ts)
    }
  }
}

// --- 3. 发送消息逻辑 ---
function sendMessage() {
  const text = messageInput.value.trim()
  if (!text || !activeContact.value || !socket.value) return

  // 构建消息 payload (匹配后端接收格式)
  const payload = {
    type: "message",
    target_id: activeContact.value.id,
    content: text
  }
  

  // 1. 乐观 UI 更新 (立即显示在屏幕上)
  activeContact.value.messages.push({
    msg_id: `temp-${Date.now()}`,
    sender_id: CURRENT_USER_ID,
    receiver_id: activeContact.value.id,
    content: text,
    ts: Date.now() / 1000,
    type: 'text',
    status: 'pending' // 标记为发送中
  })

  // 更新左侧预览
  activeContact.value.lastMessage = text
  activeContact.value.lastTime = 'Now'

  // 2. 发送 WebSocket
  if (socket.value.readyState === WebSocket.OPEN) {
    socket.value.send(JSON.stringify(payload))
  } else {
    // 掉线处理
    console.error('Cannot send, socket closed')
    // 这里可以将 status 改为 'failed'
  }

  // 3. UI 交互处理
  messageInput.value = ''
  resizeTextarea() // 重置高度
  scrollToBottom()
}

// --- 4. UI 交互辅助 ---

function selectContact(id: string) {
  currentChatId.value = id
  contacts.value.forEach(c => c.active = (c.id === id))
  
  // 清除未读
  if (activeContact.value) {
    activeContact.value.unread = 0
  }
  
  scrollToBottom()
  // 聚焦输入框 (体验优化)
  document.getElementById('msg-input')?.focus()
}

function scrollToBottom() {
  nextTick(() => {
    if (chatAreaRef.value) {
      chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
    }
  })
}

// 文本框自适应高度
function resizeTextarea(event?: Event) {
  const textarea = event ? (event.target as HTMLTextAreaElement) : document.getElementById('msg-input') as HTMLTextAreaElement
  if (textarea) {
    textarea.style.height = 'auto' // 先重置
    // 限制最大高度，避免挡住视线
    const newHeight = Math.min(textarea.scrollHeight, 128) 
    textarea.style.height = newHeight + 'px'
  }
}

// 简单的时间格式化
function formatTime(timestamp: number) {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isMyMessage(msg: MessageData) {
  return msg.sender_id === CURRENT_USER_ID
}

async function submitAddFriend() {
  const targetName = addFriendInput.value.trim()
  if (!targetName) return

  isAddingFriend.value = true
  
  try {
    const response = await fetch(`http://localhost:8000/api/chat/add_friend?user_id=${CURRENT_USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_username: targetName })
    })
    
    const res = await response.json()
    
    if (response.ok) {
        // 成功交互
        closeAddFriendModal()
        // 可以做一个轻提示 (Toast)，这里先用 alert 替代或自行封装
        alert("✅ " + res.message) 
        // 刷新列表
        await loadContacts()
    } else {
        alert("❌ " + (res.detail || "操作失败"))
    }
  } catch (e) {
    console.error(e)
    alert("网络请求错误")
  } finally {
    isAddingFriend.value = false
  }
}
// --- 生命周期 ---
onMounted(() => {
  initWebSocket()
  scrollToBottom()
})

onUnmounted(() => {
  if (socket.value) socket.value.close()
  stopHeartbeat()
})
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[#0f172a] text-slate-200 antialiased font-sans">
    
    <!-- 全局背景光晕装饰 -->
    <div class="fixed top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none z-0"></div>
    <div class="fixed bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0"></div>

    <!-- 左侧 Sidebar -->
    <aside class="relative z-10 flex w-80 flex-col border-r border-white/5 bg-slate-900/60 backdrop-blur-xl transition-all duration-300 md:w-96">
      
      <!-- 头部 -->
      <header class="flex flex-col gap-4 p-5 pb-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
             <h1 class="text-2xl font-bold tracking-tight text-white">Messages</h1>
             <!-- 连接状态指示点 -->
             <div 
               class="h-2 w-2 rounded-full transition-colors duration-500"
               :class="{
                 'bg-emerald-500 shadow-[0_0_8px_#10b981]': connectionStatus === 'connected',
                 'bg-amber-500 animate-pulse': connectionStatus === 'connecting',
                 'bg-red-500': connectionStatus === 'disconnected'
               }"
               :title="connectionStatus"
             ></div>
          </div>
          
          <button @click="openAddFriendModal" class="group relative flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
          </button>
        </div>

        <div class="relative group">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </span>
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="Search chats..." 
            class="h-10 w-full rounded-xl border border-white/5 bg-slate-800/50 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none ring-1 ring-transparent transition-all focus:bg-slate-800 focus:ring-indigo-500/50"
          >
        </div>
      </header>

      <!-- Filter Tabs -->
      <div class="px-5 py-2 flex gap-4 text-xs font-medium text-slate-400">
        <button class="text-white hover:text-indigo-400 transition-colors">全部</button>
        <button class="hover:text-indigo-400 transition-colors">群聊</button>
        <button class="hover:text-indigo-400 transition-colors">未读</button>
      </div>

      <!-- 好友列表 -->
      <div class="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar space-y-1">
        <div 
          v-for="contact in filteredContacts" 
          :key="contact.id"
          @click="selectContact(contact.id)"
          :class="[
            'group relative flex cursor-pointer items-center gap-3 rounded-xl p-3 transition-all duration-200',
            contact.active 
              ? 'bg-indigo-600/20 shadow-sm ring-1 ring-indigo-500/30' 
              : 'hover:bg-white/5'
          ]"
        >
          <div class="relative shrink-0">
            <img :src="contact.avatar" class="h-12 w-12 rounded-full object-cover shadow-md" alt="Avatar" />
            <span 
              class="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-slate-900"
              :class="{
                'bg-emerald-500': contact.status === 'online',
                'bg-amber-500': contact.status === 'busy',
                'bg-slate-500': contact.status === 'offline',
              }"
            ></span>
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between mb-0.5">
              <h3 class="truncate text-sm font-semibold text-slate-100" :class="{'text-indigo-200': contact.active}">
                {{ contact.username }}
              </h3>
              <span class="text-xs text-slate-500">{{ contact.lastTime }}</span>
            </div>
            <div class="flex items-center justify-between">
              <p class="truncate text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                {{ contact.lastMessage }}
              </p>
              <span v-if="contact.unread > 0" class="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-indigo-500/40">
                {{ contact.unread }}
              </span>
            </div>
          </div>
          
          <div v-if="contact.active" class="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]"></div>
        </div>
      </div>
    </aside>

    <!-- 右侧 Chat Main -->
    <main class="relative z-10 flex flex-1 flex-col bg-slate-900/40 backdrop-blur-md">
      
      <!-- Welcome Screen -->
      <div v-if="!activeContact" class="flex h-full flex-col items-center justify-center text-slate-400">
        <div class="mb-4 rounded-full bg-slate-800 p-6 animate-float">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
        <p class="text-lg font-medium text-slate-300">Select a chat to start messaging</p>
        <p class="text-sm opacity-60">Status: {{ connectionStatus }}</p>
      </div>

      <!-- 活跃聊天界面 -->
      <div v-else class="flex h-full flex-col">
        <!-- Chat Header -->
        <header class="flex h-16 shrink-0 items-center border-b border-white/5 px-6 bg-slate-900/30 backdrop-blur-sm">
           <div class="flex items-center gap-3">
             <div 
               class="h-2 w-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-colors"
               :class="activeContact.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'"
             ></div>
             <h2 class="font-bold text-slate-100">{{ activeContact.username }}</h2>
           </div>
           <div class="ml-auto flex gap-4 text-slate-400">
             <button class="hover:text-white transition"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></button>
             <button class="hover:text-white transition"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
           </div>
        </header>

        <!-- Messages Area -->
        <div ref="chatAreaRef" class="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar scroll-smooth">
           <!-- 如果没有消息 -->
           <div v-if="currentMessages.length === 0" class="flex h-full items-center justify-center">
              <span class="text-sm text-slate-500">Say hello to {{ activeContact.username }} 👋</span>
           </div>

           <!-- 日期分隔线占位 -->
           <!-- <div class="flex justify-center my-4"><span class="bg-slate-800/80 px-3 py-1 rounded-full text-xs text-slate-400">Today</span></div> -->
           
           <div 
             v-for="(msg, index) in currentMessages" 
             :key="msg.msg_id" 
             class="flex gap-3 mb-4 group"
             :class="{ 'flex-row-reverse': isMyMessage(msg) }"
           >
             <!-- 对方头像 -->
             <img v-if="!isMyMessage(msg)" :src="activeContact.avatar" class="h-8 w-8 rounded-full mt-1 object-cover">
             
             <!-- 消息内容 -->
             <div class="max-w-[70%]">
               <!-- 气泡 -->
               <div 
                 class="px-4 py-2.5 text-sm shadow-md break-words relative"
                 :class="[
                    isMyMessage(msg) 
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-indigo-500/20' 
                      : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-none border border-white/5'
                 ]"
               >
                 {{ msg.content }}
               </div>
               
               <!-- 元数据 (时间 & 状态) -->
               <div 
                  class="mt-1 flex items-center gap-1 text-[10px] text-slate-500"
                  :class="{ 'flex-row-reverse': isMyMessage(msg) }"
               >
                 <span>{{ formatTime(msg.ts) }}</span>
                 <span v-if="isMyMessage(msg)" class="font-medium" :class="{'text-indigo-400': msg.status === 'read'}">
                   <!-- 根据状态显示不同文本/图标 -->
                   {{ msg.status === 'pending' ? 'Sending...' : 'Sent' }}
                 </span>
               </div>
             </div>
           </div>
        </div>

        <!-- Input Area -->
        <div class="p-4 pt-2 shrink-0">
          <div 
             class="flex items-end gap-2 rounded-2xl bg-slate-800/80 p-2 ring-1 ring-white/10 backdrop-blur transition-all focus-within:ring-indigo-500/50"
             :class="{'opacity-50 pointer-events-none': connectionStatus !== 'connected'}"
          >
            <!-- 附件按钮 -->
            <button class="p-2 text-slate-400 hover:text-indigo-400 transition mb-0.5"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg></button>
            
            <textarea 
              id="msg-input"
              v-model="messageInput"
              rows="1" 
              placeholder="Type a message..." 
              @input="resizeTextarea"
              @keydown.enter.exact.prevent="sendMessage"
              class="max-h-32 min-h-[2.5rem] w-full resize-none bg-transparent py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none custom-scrollbar"
            ></textarea>

            <button 
              @click="sendMessage"
              :disabled="!messageInput.trim()"
              class="mb-0.5 rounded-xl bg-indigo-600 p-2 text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>

      </div>
    </main>
    <Teleport to="body">
      <!-- 遮罩层动画 -->
      <Transition 
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showAddFriendModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click="closeAddFriendModal">
          
          <!-- 内容层动画 (防止点击内容触发背景关闭，使用 @click.stop) -->
          <div @click.stop class="w-full max-w-md p-6" >
            
            <Transition
               appear
               enter-active-class="transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
               enter-from-class="opacity-0 scale-90 translate-y-4"
               enter-to-class="opacity-100 scale-100 translate-y-0"
               leave-active-class="transition duration-200 ease-in"
               leave-from-class="opacity-100 scale-100"
               leave-to-class="opacity-0 scale-95"
            >
              <div v-if="showAddFriendModal" class="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-white/10">
                
                <!-- 顶部光晕装饰 -->
                <div class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-[50px] pointer-events-none"></div>
                <div class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/20 blur-[50px] pointer-events-none"></div>

                <!-- 标题区 -->
                <div class="relative px-6 pt-6">
                  <h3 class="text-xl font-bold text-white">Add New Friend</h3>
                  <p class="text-sm text-slate-400 mt-1">Enter username to start a new chat.</p>
                </div>

                <!-- 输入区 -->
                <div class="relative px-6 py-6">
                  <div class="group relative flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-4 h-5 w-5 text-slate-500 transition-colors group-focus-within:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    
                    <input 
                      id="add-friend-input"
                      v-model="addFriendInput"
                      @keydown.enter="submitAddFriend"
                      type="text" 
                      placeholder="Username (e.g., Mike)" 
                      class="h-12 w-full rounded-xl bg-slate-800/50 border border-white/5 pl-12 pr-4 text-slate-200 placeholder-slate-500 outline-none ring-1 ring-transparent transition-all focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/50"
                    >
                  </div>
                </div>

                <!-- 底部按钮区 -->
                <div class="relative flex items-center justify-end gap-3 bg-slate-800/30 px-6 py-4 border-t border-white/5 backdrop-blur-md">
                  <button 
                    @click="closeAddFriendModal"
                    class="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button 
                    @click="submitAddFriend"
                    :disabled="isAddingFriend || !addFriendInput.trim()"
                    class="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span v-if="isAddingFriend" class="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
                    <span v-else>Send Request</span>
                  </button>
                </div>

              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* 滚动条美化 */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}
.animate-float {
  animation: float 4s ease-in-out infinite;
}
</style>