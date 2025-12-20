<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import request from '../utils/request'

// ==================== 配置常量 ====================

// 从token中解析用户信息
function extractUserInfoFromToken(): { userId: string | null, username: string | null } {
  const token = localStorage.getItem('token')
  if (!token) {
    console.error('No token found in localStorage')
    return { userId: null, username: null }
  }

  try {
    // JWT格式：header.payload.signature
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
    // 兼容新旧两种 token 格式
    const userId = decoded.user_id || null
    const username = decoded.username || decoded.sub
    console.log('✅ 从token中解析出用户信息:', { userId, username })
    return { userId, username }
  } catch (e) {
    console.error('Failed to parse token:', e)
    return { userId: null, username: null }
  }
}

const userInfo = extractUserInfoFromToken()
const CURRENT_USER_ID = userInfo.userId || userInfo.username 
const CURRENT_USERNAME = userInfo.username
const WS_URL = CURRENT_USER_ID ? `ws://localhost:8000/api/chat/ws/${CURRENT_USER_ID}` : ''

// ==================== 类型定义 ====================
interface MessageData {
  msg_id: string
  sender_id: string
  receiver_id?: string  // 私聊时使用
  group_id?: string     // 群聊时使用
  content: string
  ts: number
  type: string  // text, image, document, video, group_invite_card
  status?: 'pending' | 'sent' | 'read'
  filename?: string  // 文件消息时的原始文件名
  file_size?: number  // 文件大小
  fileBlobUrl?: string  // 文件的 blob URL (用于图片/视频预览)
  fileLoading?: boolean  // 文件是否正在加载
  fileError?: boolean  // 文件加载是否出错
  sender_username?: string  // 群聊消息中发送者的用户名
  sender_avatar?: string  // 群聊消息中发送者的头像文件名
  sender_avatar_blob?: string  // 群聊消息中发送者的头像blob URL
  sender_avatar_loading?: boolean  // 发送者头像是否正在加载
  sender_avatar_error?: boolean  // 发送者头像加载是否出错
  group_data?: {  // 群邀请卡片消息的群组数据
    group_id: string
    group_name: string
    group_avatar: string
    member_count: number
    members: Array<{
      user_id: string
      username: string
      avatar: string
      is_owner: boolean
    }>
  }
}

interface Contact {
  id: string
  username: string
  avatar: string
  avatarBlobUrl?: string
  avatarLoading?: boolean
  avatarError?: boolean
  lastMessage: string
  lastTime: string
  unread: number
  active: boolean
  status: 'online' | 'offline' | 'busy'
  messages: MessageData[]
  type?: 'private' | 'group'  // 标识私聊或群聊
  member_count?: number       // 群聊成员数量
}

// ==================== Toast 通知系统 ====================
interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

const toasts = ref<Toast[]>([])
let toastIdCounter = 0

/**
 * 显示消息提示
 * @param message 提示内容
 * @param type 类型：success | error | info
 */
function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const id = toastIdCounter++
  toasts.value.push({ id, message, type })
  // 3秒后自动消失
  setTimeout(() => {
    removeToast(id)
  }, 3000)
}

function removeToast(id: number) {
  const index = toasts.value.findIndex(t => t.id === id)
  if (index !== -1) {
    toasts.value.splice(index, 1)
  }
}

// ==================== 状态管理 ====================
const socket = ref<WebSocket | null>(null)
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
const messageInput = ref('')
const contacts = ref<Contact[]>([]) 

const searchQuery = ref('')
const currentChatId = ref('')
const chatAreaRef = ref<HTMLElement | null>(null)
const heartbeatTimer = ref<number | null>(null)
const isLoadingContacts = ref(false)
const pendingRequestCount = ref(0)
const avatarLoadQueue = ref<Set<string>>(new Set())

// 历史消息加载状态
const isLoadingHistory = ref(false)
const hasMoreHistory = ref(true)
const isScrollingToBottom = ref(false)

// ====== 文件上传状态 ======
const fileInputRef = ref<HTMLInputElement | null>(null)
const isUploadingFile = ref(false)
const uploadProgress = ref(0)


// ====== 弹窗状态管理 ======
const showAddFriendModal = ref(false)
const addFriendInput = ref('')
const addFriendMessage = ref('Hi, I\'d like to be your friend.')
const isAddingFriend = ref(false)

// ====== 创建群组弹窗状态 ======
const showCreateGroupModal = ref(false)
const createGroupName = ref('')
const createGroupDesc = ref('')
const isCreatingGroup = ref(false)

// ====== 邀请进群弹窗状态 ======
const showInviteModal = ref(false)
const myGroupsList = ref<any[]>([])
const selectedGroupForInvite = ref<any>(null)
const isLoadingInvite = ref(false)

// ====== 右上角菜单状态 ======
const showHeaderMenu = ref(false)
const headerMenuX = ref(0)
const headerMenuY = ref(0)

// ====== 好友申请弹窗状态 ======
const showRequestsModal = ref(false)
const friendRequests = ref<any[]>([])
const isLoadingRequests = ref(false)

// ====== 消息右键菜单状态 ======
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedMessage = ref<MessageData | null>(null)
const longPressTimer = ref<number | null>(null) 

// 打开添加好友弹窗
function openAddFriendModal() {
  showAddFriendModal.value = true
  addFriendInput.value = ''
  addFriendMessage.value = 'Hi, I\'d like to be your friend.'
  nextTick(() => {
    document.getElementById('add-friend-input')?.focus()
  })
}

// 关闭添加好友弹窗
function closeAddFriendModal() {
  showAddFriendModal.value = false
}

// 打开创建群组弹窗
function openCreateGroupModal() {
  showCreateGroupModal.value = true
  createGroupName.value = ''
  createGroupDesc.value = ''
  nextTick(() => {
    document.getElementById('create-group-name')?.focus()
  })
}

// 关闭创建群组弹窗
function closeCreateGroupModal() {
  showCreateGroupModal.value = false
}

// 打开邀请进群弹窗
async function openInviteModal() {
  if (!activeContact.value || activeContact.value.type !== 'private') {
    showToast('只能向私聊好友发送群邀请', 'error')
    return
  }

  showInviteModal.value = true
  selectedGroupForInvite.value = null
  await loadMyGroups()
}

// 关闭邀请进群弹窗
function closeInviteModal() {
  showInviteModal.value = false
}

// 加载我的群组列表
async function loadMyGroups() {
  isLoadingInvite.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await request.get('/api/group/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    myGroupsList.value = response.data
  } catch (error: any) {
    showToast('❌ 加载群组列表失败', 'error')
  } finally {
    isLoadingInvite.value = false
  }
}

// 选择群组并发送邀请卡片消息
async function selectGroupForInvite(group: any) {
  if (!activeContact.value || !socket.value) return

  selectedGroupForInvite.value = group
  isLoadingInvite.value = true

  try {
    const token = localStorage.getItem('token')

    // 获取群成员信息（最多3个）
    const membersResponse = await request.get(`/api/group/${group._id}/members`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    const members = membersResponse.data.members.slice(0, 3)

    // 构造群邀请卡片消息
    const payload = {
      type: "message",
      target_id: activeContact.value.id,
      content: group._id,  // 存储群组ID作为content
      msg_type: "group_invite_card",
      group_data: {
        group_id: group._id,
        group_name: group.group_name,
        group_avatar: group.group_avatar,
        member_count: group.member_count,
        members: members
      }
    }

    // 创建本地消息（乐观更新）
    const msgData: MessageData = {
      msg_id: `temp-${Date.now()}`,
      sender_id: CURRENT_USER_ID!,
      receiver_id: activeContact.value.id,
      content: group._id,
      ts: Date.now() / 1000,
      type: 'group_invite_card',
      status: 'pending',
      group_data: payload.group_data
    }

    activeContact.value.messages.push(msgData)
    activeContact.value.lastMessage = '[群聊邀请]'
    activeContact.value.lastTime = 'Now'

    // 通过WebSocket发送
    if (socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(payload))
      showToast('✅ 群邀请已发送', 'success')
      closeInviteModal()
    } else {
      showToast('发送失败：网络连接断开', 'error')
    }

    scrollToBottom()

  } catch (error: any) {
    console.error('发送群邀请失败:', error)
    showToast('❌ 发送群邀请失败', 'error')
  } finally {
    isLoadingInvite.value = false
  }
}

// ==================== 计算属性 ====================

const filteredContacts = computed(() => {
  return contacts.value.filter(c => 
    c.username.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

const activeContact = computed(() => {
  return contacts.value.find(c => c.id === currentChatId.value)
})

const currentMessages = computed(() => {
  return activeContact.value?.messages || []
})

// ==================== 方法实现 ====================

// --- 0. 头像缓存与加载逻辑 ---

const avatarCache = {
  async get(userId: string, filename: string) {
    const cached = localStorage.getItem(`avatar_${userId}`)
    if (!cached) return null

    try {
      const data = JSON.parse(cached)
      const isExpired = Date.now() - data.timestamp > 24 * 60 * 60 * 1000
      const filenameMismatch = filename && data.filename !== filename

      if (isExpired || filenameMismatch) {
        this.remove(userId)
        return null
      }

      if (data.base64) {
        const blob = await this.base64ToBlob(data.base64, data.mimeType)
        return URL.createObjectURL(blob)
      }

      return null
    } catch (error) {
      console.error('读取缓存失败:', error)
      this.remove(userId)
      return null
    }
  },

  async set(userId: string, filename: string, blob: Blob, mimeType: string) {
    try {
      const base64 = await this.blobToBase64(blob)
      localStorage.setItem(`avatar_${userId}`, JSON.stringify({
        filename,
        base64,
        mimeType,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.error('缓存头像失败:', error)
    }
  },

  blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  },

  base64ToBlob(base64: string, mimeType: string) {
    return fetch(`data:${mimeType};base64,${base64}`)
      .then(res => res.blob())
  },

  remove(userId: string) {
    localStorage.removeItem(`avatar_${userId}`)
  }
}

const fetchAvatar = async (contact: Contact) => {
  if (!contact.avatar) return null

  try {
    contact.avatarLoading = true
    contact.avatarError = false

    const response = await request.get(`/auth/avatar/${contact.avatar}`, {
      responseType: 'blob',
      timeout: 10000 
    })

    const contentType = response.headers['content-type']
    if (!contentType || !contentType.startsWith('image/')) {
      contact.avatarError = true
      return null
    }

    const blob = response.data
    const blobUrl = URL.createObjectURL(blob)
    await avatarCache.set(contact.id, contact.avatar, blob, contentType)
    return blobUrl
  } catch (error) {
    contact.avatarError = true
    avatarCache.remove(contact.id)
    return null
  } finally {
    contact.avatarLoading = false
  }
}

const loadAvatar = async (contact: Contact) => {
  if (!contact.avatar) {
    contact.avatarBlobUrl = ''
    contact.avatarError = false
    return
  }

  const cachedUrl = await avatarCache.get(contact.id, contact.avatar)
  if (cachedUrl) {
    contact.avatarBlobUrl = cachedUrl
    contact.avatarError = false
    return
  }

  const blobUrl = await fetchAvatar(contact)
  if (blobUrl) {
    contact.avatarBlobUrl = blobUrl
  } else {
    contact.avatarBlobUrl = ''
  }
}

// 加载群聊消息中发送者的头像
const loadMessageSenderAvatar = async (msg: MessageData) => {
  if (!msg.sender_avatar || msg.sender_avatar_blob || msg.sender_avatar_loading) {
    return
  }

  msg.sender_avatar_loading = true
  msg.sender_avatar_error = false

  try {
    // 先尝试从缓存获取
    const cachedUrl = await avatarCache.get(msg.sender_id, msg.sender_avatar)
    if (cachedUrl) {
      msg.sender_avatar_blob = cachedUrl
      msg.sender_avatar_loading = false
      return
    }

    // 从服务器获取
    const response = await request.get(`/auth/avatar/${msg.sender_avatar}`, {
      responseType: 'blob',
      timeout: 10000
    })

    const contentType = response.headers['content-type']
    if (!contentType || !contentType.startsWith('image/')) {
      msg.sender_avatar_error = true
      msg.sender_avatar_loading = false
      return
    }

    const blob = response.data
    const blobUrl = URL.createObjectURL(blob)
    msg.sender_avatar_blob = blobUrl

    // 缓存头像
    await avatarCache.set(msg.sender_id, msg.sender_avatar, blob, contentType)

  } catch (error) {
    console.error('加载发送者头像失败:', error)
    msg.sender_avatar_error = true
  } finally {
    msg.sender_avatar_loading = false
  }
}

const lazyLoadAvatars = () => {
  setTimeout(() => {
    contacts.value.forEach((contact, index) => {
      setTimeout(() => {
        loadAvatar(contact)
      }, index * 50) 
    })
  }, 100)
}

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
    showToast('已连接到聊天服务器', 'success')
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
  }, 30000)
}

function stopHeartbeat() {
  if (heartbeatTimer.value) {
    clearInterval(heartbeatTimer.value)
    heartbeatTimer.value = null
  }
}

// --- 2. 消息处理逻辑 ---

function handleIncomingMessage(payload: any) {
  if (payload.type === 'pong') return

  // 处理token刷新
  if (payload.type === 'token_refresh') {
    localStorage.setItem('token', payload.new_token)
    showToast('Token已自动刷新', 'success')
    return
  }

  // 处理私聊消息
  if (payload.type === 'new_message') {
    const msgData: MessageData = payload.data

    const targetUserId = msgData.sender_id === CURRENT_USER_ID
      ? msgData.receiver_id
      : msgData.sender_id

    const contact = contacts.value.find(c => c.id === targetUserId && c.type === 'private')

    if (contact) {
      const lastMsg = contact.messages[contact.messages.length - 1]
      const isMyMessage = msgData.sender_id === CURRENT_USER_ID

      if (isMyMessage && lastMsg && lastMsg.status === 'pending' && lastMsg.content === msgData.content) {
        lastMsg.status = 'sent'
        lastMsg.msg_id = msgData.msg_id
        lastMsg.ts = msgData.ts
      } else {
        contact.messages.push({
          ...msgData,
          status: 'sent',
          fileBlobUrl: undefined,
          fileLoading: false,
          fileError: false
        })

        if (msgData.type === 'image' || msgData.type === 'video') {
          const addedMsg = contact.messages[contact.messages.length - 1]
          nextTick(() => loadMessageFile(addedMsg))
        }

        if (targetUserId !== currentChatId.value) {
          contact.unread++
        }

        if (targetUserId === currentChatId.value) {
          scrollToBottom()
        }
      }

      contact.lastMessage = msgData.type === 'text'
        ? msgData.content
        : getFileMessagePreview(msgData.type, msgData.filename || '')
      contact.lastTime = formatTime(msgData.ts)
    }
  }

  // 处理群聊消息
  if (payload.type === 'new_group_message') {
    const msgData: MessageData = payload.data
    const groupId = payload.group_id

    const contact = contacts.value.find(c => c.id === groupId && c.type === 'group')

    if (contact) {
      const lastMsg = contact.messages[contact.messages.length - 1]
      const isMyMessage = msgData.sender_id === CURRENT_USER_ID

      if (isMyMessage && lastMsg && lastMsg.status === 'pending' && lastMsg.content === msgData.content) {
        lastMsg.status = 'sent'
        lastMsg.msg_id = msgData.msg_id
        lastMsg.ts = msgData.ts
      } else {
        const newMsg: MessageData = {
          ...msgData,
          status: 'sent',
          fileBlobUrl: undefined,
          fileLoading: false,
          fileError: false,
          sender_avatar_blob: undefined,
          sender_avatar_loading: false,
          sender_avatar_error: false
        }

        contact.messages.push(newMsg)

        // 加载图片/视频消息的文件
        if (msgData.type === 'image' || msgData.type === 'video') {
          nextTick(() => loadMessageFile(newMsg))
        }

        // 加载群聊消息发送者头像
        if (msgData.sender_avatar && !isMyMessage) {
          nextTick(() => loadMessageSenderAvatar(newMsg))
        }

        if (groupId !== currentChatId.value) {
          contact.unread++
        }

        if (groupId === currentChatId.value) {
          scrollToBottom()
        }
      }

      contact.lastMessage = msgData.type === 'text'
        ? msgData.content
        : getFileMessagePreview(msgData.type, msgData.filename || '')
      contact.lastTime = formatTime(msgData.ts)
    }
  }

  // 处理消息撤回通知
  if (payload.type === 'message_recalled') {
    const { msg_id, chat_id, recaller_id } = payload.data

    const contact = contacts.value.find(c => {
      const calculatedChatId = getChatId(CURRENT_USER_ID!, c.id)
      return calculatedChatId === chat_id
    })

    if (contact) {
      const msgIndex = contact.messages.findIndex(m => m.msg_id === msg_id)
      if (msgIndex !== -1) {
        const isMyRecall = recaller_id === CURRENT_USER_ID
        contact.messages[msgIndex].type = 'recalled'
        contact.messages[msgIndex].content = isMyRecall ? '你撤回了一条消息' : `${contact.username}撤回了一条消息`

        if (msgIndex === contact.messages.length - 1) {
          contact.lastMessage = contact.messages[msgIndex].content
        }
      }
    }
  }

  if (payload.type === 'new_friend_request') {
    pendingRequestCount.value++
    const fromUser = payload.data?.from_user || 'Someone'
    showToast(`📩 ${fromUser} 请求添加你为好友`, 'info')
    if (showRequestsModal.value) {
      loadFriendRequests()
    }
  }

  // 处理好友请求通过通知
  if (payload.type === 'friend_accepted') {
    const friendData = payload.data
    console.log('收到好友通过通知:', friendData)
    console.log('头像 base64 数据:', friendData.avatar_base64 ? `有数据，长度: ${friendData.avatar_base64.length}` : '无数据')

    if (friendData && friendData.friend_id) {
      const existingContact = contacts.value.find(c => c.id === friendData.friend_id)
      if (!existingContact) {
        const newContact: Contact = {
          id: friendData.friend_id,
          username: friendData.username || 'Unknown',
          avatar: friendData.avatar || '',
          avatarBlobUrl: friendData.avatar_base64 || '',  // 优先使用 base64 数据
          avatarLoading: false,
          avatarError: false,
          lastMessage: friendData.lastMessage || 'You are now connected.',
          lastTime: friendData.lastTime ? formatTime(friendData.lastTime) : formatTime(Date.now() / 1000),
          unread: 0,
          active: false,
          status: 'offline',
          messages: [],
          type: 'private'
        }
        console.log('创建新联系人:', newContact.username, '头像URL:', newContact.avatarBlobUrl ? '有' : '无')
        contacts.value.unshift(newContact)

        // 如果有 base64 数据，缓存到 localStorage
        if (friendData.avatar_base64 && friendData.avatar) {
          try {
            fetch(friendData.avatar_base64)
              .then(res => res.blob())
              .then(blob => {
                const mimeType = friendData.avatar_base64.split(';')[0].split(':')[1]
                avatarCache.set(friendData.friend_id, friendData.avatar, blob, mimeType)
                console.log('✅ 头像已缓存到 localStorage')
              })
              .catch(err => console.error('❌ 缓存头像失败:', err))
          } catch (e) {
            console.error('❌ 转换头像失败:', e)
          }
        } else if (friendData.avatar) {
          // 如果没有 base64 数据但有头像文件名，使用现有的加载方式
          console.log('使用现有方式加载头像:', friendData.avatar)
          loadAvatar(newContact)
        }

        showToast(`✅ ${friendData.username} 已同意你的好友请求`, 'success')
        console.log('✅ 新好友已添加到联系人列表')
      } else {
        console.log('该好友已在联系人列表中')
      }
    } else {
      console.error('好友数据不完整:', friendData)
    }
  }

  // 处理群组通知
  if (payload.type === 'group_created' || payload.type === 'added_to_group') {
    showToast('你被添加到一个新群组', 'info')
    loadContacts()  // 重新加载联系人列表
  }

  if (payload.type === 'removed_from_group' || payload.type === 'group_deleted') {
    const groupId = payload.data?.group_id
    if (groupId) {
      contacts.value = contacts.value.filter(c => !(c.id === groupId && c.type === 'group'))
      if (currentChatId.value === groupId) {
        currentChatId.value = ''
      }
    }
    showToast(payload.type === 'group_deleted' ? '群组已解散' : '你已被移出群组', 'info')
  }
}

// --- 3. 发送消息逻辑 ---
function sendMessage() {
  const text = messageInput.value.trim()
  if (!text || !activeContact.value || !socket.value) return

  const isGroupChat = activeContact.value.type === 'group'

  const payload: any = {
    type: isGroupChat ? "group_message" : "message",
    content: text,
    msg_type: "text"
  }

  // 私聊消息
  if (!isGroupChat) {
    payload.target_id = activeContact.value.id
  } else {
    // 群聊消息
    payload.group_id = activeContact.value.id
  }

  const msgData: MessageData = {
    msg_id: `temp-${Date.now()}`,
    sender_id: CURRENT_USER_ID!,
    content: text,
    ts: Date.now() / 1000,
    type: 'text',
    status: 'pending'
  }

  // 添加对应的receiver_id或group_id
  if (!isGroupChat) {
    msgData.receiver_id = activeContact.value.id
  } else {
    msgData.group_id = activeContact.value.id
  }

  activeContact.value.messages.push(msgData)

  activeContact.value.lastMessage = text
  activeContact.value.lastTime = 'Now'

  if (socket.value.readyState === WebSocket.OPEN) {
    socket.value.send(JSON.stringify(payload))
  } else {
    showToast('发送失败：网络连接断开', 'error')
  }

  messageInput.value = ''
  resizeTextarea()
  scrollToBottom()
}

// --- 文件处理逻辑 ---

function triggerFileSelect() {
  fileInputRef.value?.click()
}

async function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !activeContact.value) return

  // 检查文件大小 (50MB)
  const MAX_SIZE = 50 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    showToast('文件过大，最大支持50MB', 'error')
    return
  }

  await uploadAndSendFile(file)

  // 清空input,允许重复选择同一个文件
  target.value = ''
}

async function uploadAndSendFile(file: File) {
  if (!activeContact.value || !socket.value) return

  isUploadingFile.value = true
  uploadProgress.value = 0

  try {
    // 1. 上传文件到服务器
    const formData = new FormData()
    formData.append('file', file)

    const token = localStorage.getItem('token')
    const response = await request.post('/api/chat/upload_file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${token}`
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          uploadProgress.value = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        }
      }
    })

    const fileInfo = response.data.data

    // 2. 为图片和视频创建本地预览 blob URL
    let localBlobUrl: string | undefined = undefined
    if (fileInfo.file_type === 'image' || fileInfo.file_type === 'video') {
      localBlobUrl = URL.createObjectURL(file)
    }

    // 3. 构造文件消息
    const filePayload = {
      type: "message",
      target_id: activeContact.value.id,
      content: fileInfo.file_path,  // 文件路径
      msg_type: fileInfo.file_type,  // image, document, video
      filename: fileInfo.filename,
      file_size: fileInfo.size
    }

    // 4. 添加到本地消息列表 (乐观更新)
    const fileMessage: MessageData = {
      msg_id: `temp-${Date.now()}`,
      sender_id: CURRENT_USER_ID!,
      receiver_id: activeContact.value.id,
      content: fileInfo.file_path,
      ts: Date.now() / 1000,
      type: fileInfo.file_type,
      filename: fileInfo.filename,
      file_size: fileInfo.size,
      status: 'pending',
      fileBlobUrl: localBlobUrl,  // 使用本地 blob URL
      fileLoading: false,
      fileError: false
    }

    activeContact.value.messages.push(fileMessage)

    // 更新最后消息预览
    activeContact.value.lastMessage = getFileMessagePreview(fileInfo.file_type, fileInfo.filename)
    activeContact.value.lastTime = 'Now'

    // 5. 通过 WebSocket 发送
    if (socket.value.readyState === WebSocket.OPEN) {
      socket.value.send(JSON.stringify(filePayload))
      showToast('文件发送成功', 'success')
    } else {
      showToast('发送失败：网络连接断开', 'error')
    }

    scrollToBottom()

  } catch (error: any) {
    console.error('文件上传失败:', error)
    showToast('文件上传失败', 'error')
  } finally {
    isUploadingFile.value = false
    uploadProgress.value = 0
  }
}

function getFileMessagePreview(fileType: string, filename: string): string {
  switch (fileType) {
    case 'image':
      return '[图片]'
    case 'video':
      return '[视频]'
    case 'document':
      return `[文件] ${filename}`
    default:
      return '[文件]'
  }
}


function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

// --- 文件加载逻辑 (类似头像加载) ---

async function loadMessageFile(msg: MessageData) {
  /**
   * 为图片和视频消息加载 blob URL
   * 文档类型不需要预加载
   */
  if (msg.type !== 'image' && msg.type !== 'video') return
  if (msg.fileBlobUrl || msg.fileLoading || msg.fileError) return

  msg.fileLoading = true
  msg.fileError = false

  try {
    const response = await request.get(`/api/chat/files/${msg.content}`, {
      responseType: 'blob',
      timeout: 30000
    })

    const blob = response.data
    const blobUrl = URL.createObjectURL(blob)
    msg.fileBlobUrl = blobUrl
    msg.fileLoading = false
  } catch (error) {
    console.error('文件加载失败:', msg.content, error)
    msg.fileError = true
    msg.fileLoading = false
  }
}

async function downloadFile(msg: MessageData) {
  /**
   * 下载文件到本地 (用于文档类型)
   */
  if (!msg.filename) return

  try {
    showToast('正在下载文件...', 'info')

    const response = await request.get(`/api/chat/files/${msg.content}`, {
      responseType: 'blob',
      timeout: 60000
    })

    const blob = response.data
    const url = URL.createObjectURL(blob)

    // 创建临时 a 标签触发下载
    const a = document.createElement('a')
    a.href = url
    a.download = msg.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // 释放 URL
    setTimeout(() => URL.revokeObjectURL(url), 100)

    showToast('文件下载成功', 'success')
  } catch (error) {
    console.error('文件下载失败:', error)
    showToast('文件下载失败', 'error')
  }
}

function openImagePreview(blobUrl: string) {
  /**
   * 在新窗口打开图片
   */
  if (blobUrl) {
    window.open(blobUrl, '_blank')
  }
}



// --- 4. UI 交互辅助 ---

function selectContact(id: string) {
  currentChatId.value = id
  contacts.value.forEach(c => c.active = (c.id === id))

  if (activeContact.value) {
    activeContact.value.unread = 0

    // 重置历史消息加载状态
    hasMoreHistory.value = true

    // 如果该联系人还没有加载过历史消息，则加载
    if (activeContact.value.messages.length === 0) {
      loadChatHistory(id)
    } else {
      scrollToBottom()
    }
  }

  nextTick(() => {
    document.getElementById('msg-input')?.focus({ preventScroll: true })
  })
}

function scrollToBottom() {
  nextTick(() => {
    if (chatAreaRef.value) {
      chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight
    }
  })
}

function resizeTextarea(event?: Event) {
  const textarea = event ? (event.target as HTMLTextAreaElement) : document.getElementById('msg-input') as HTMLTextAreaElement
  if (textarea) {
    textarea.style.height = 'auto' 
    const newHeight = Math.min(textarea.scrollHeight, 128) 
    textarea.style.height = newHeight + 'px'
  }
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function isMyMessage(msg: MessageData) {
  return msg.sender_id === CURRENT_USER_ID
}

// --- 5. 生成 chat_id (与后端逻辑一致) ---
function getChatId(userId1: string, userId2: string): string {
  const ids = [userId1, userId2].sort()
  return `${ids[0]}_${ids[1]}`
}

// --- 6. 加载历史消息 ---
async function loadChatHistory(friendId: string, beforeTs?: number) {
  if (!CURRENT_USER_ID || isLoadingHistory.value) return

  const contact = contacts.value.find(c => c.id === friendId)
  if (!contact) return

  // 根据联系人类型生成正确的 chat_id
  let chatId: string
  if (contact.type === 'group') {
    // 群聊：使用 group:群组ID 格式
    chatId = `group:${friendId}`
  } else {
    // 私聊：使用两个用户ID排序后的格式
    chatId = getChatId(CURRENT_USER_ID, friendId)
  }

  isLoadingHistory.value = true

  try {
    const params: any = {
      chat_id: chatId,
      limit: 50
    }

    if (beforeTs) {
      params.before_ts = beforeTs
    }

    const response = await request.get('/api/chat/history', { params })
    const messages = response.data || []

    if (messages.length < 50) {
      hasMoreHistory.value = false
    }

    // 如果是加载更多（有beforeTs），插入到消息列表前面
    if (beforeTs && messages.length > 0) {
      // 保存当前滚动位置
      const chatArea = chatAreaRef.value
      const oldScrollHeight = chatArea?.scrollHeight || 0

      // 插入历史消息到前面，并标记状态为 'sent'，初始化文件加载状态
      const processedMessages = messages.map((msg: MessageData) => ({
        ...msg,
        status: 'sent' as const,
        fileBlobUrl: undefined,
        fileLoading: false,
        fileError: false,
        sender_avatar_blob: undefined,
        sender_avatar_loading: false,
        sender_avatar_error: false
      }))

      contact.messages = [
        ...processedMessages,
        ...contact.messages
      ]

      // 为图片和视频消息加载 blob URL
      // 为群聊消息加载发送者头像
      nextTick(() => {
        processedMessages.forEach((msg: MessageData) => {
          if (msg.type === 'image' || msg.type === 'video') {
            loadMessageFile(msg)
          }
          // 加载群聊消息发送者头像
          if (contact.type === 'group' && msg.sender_avatar && msg.sender_id !== CURRENT_USER_ID) {
            loadMessageSenderAvatar(msg)
          }
        })
      })

      // 恢复滚动位置（防止跳动）
      nextTick(() => {
        if (chatArea) {
          const newScrollHeight = chatArea.scrollHeight
          chatArea.scrollTop = newScrollHeight - oldScrollHeight
        }
      })
    } else if (!beforeTs) {
      // 首次加载，直接设置消息列表
      contact.messages = messages.map((msg: MessageData) => ({
        ...msg,
        status: 'sent' as const,
        fileBlobUrl: undefined,
        fileLoading: false,
        fileError: false,
        sender_avatar_blob: undefined,
        sender_avatar_loading: false,
        sender_avatar_error: false
      }))

      // 为图片和视频消息加载 blob URL
      // 为群聊消息加载发送者头像
      nextTick(() => {
        contact.messages.forEach((msg: MessageData) => {
          if (msg.type === 'image' || msg.type === 'video') {
            loadMessageFile(msg)
          }
          // 加载群聊消息发送者头像
          if (contact.type === 'group' && msg.sender_avatar && msg.sender_id !== CURRENT_USER_ID) {
            loadMessageSenderAvatar(msg)
          }
        })
      })

      scrollToBottom()
    }
  } catch (error) {
    console.error('加载历史消息失败:', error)
    showToast('加载历史消息失败', 'error')
  } finally {
    isLoadingHistory.value = false
  }
}

// --- 7. 滚动监听：加载更多历史消息 ---
function handleScroll(event: Event) {
  const chatArea = event.target as HTMLElement

  // 当滚动到顶部时，加载更多历史消息
  if (chatArea.scrollTop < 100 && !isLoadingHistory.value && hasMoreHistory.value && activeContact.value) {
    const oldestMessage = activeContact.value.messages[0]
    if (oldestMessage) {
      loadChatHistory(activeContact.value.id, oldestMessage.ts)
    }
  }
}

// --- 8. 加载好友列表 ---
async function loadContacts() {
  if (!CURRENT_USER_ID) return

  isLoadingContacts.value = true
  try {
    const response = await request.get(`/api/chat/contacts?user_id=${CURRENT_USER_ID}`)

    contacts.value = response.data.map((contact: any) => ({
      ...contact,
      active: false,
      messages: [],
      avatarBlobUrl: '',
      avatarLoading: false,
      avatarError: false
    }))
    
    lazyLoadAvatars()
  } catch (error) {
    showToast('加载好友列表失败', 'error')
    console.error('❌ 加载好友列表异常:', error)
  } finally {
    isLoadingContacts.value = false
  }
}

async function submitAddFriend() {
  const targetName = addFriendInput.value.trim()
  const message = addFriendMessage.value.trim()
  if (!targetName) {
    showToast('请输入用户名', 'error')
    return
  }
  if (!message) {
    showToast('请输入打招呼内容', 'error')
    return
  }
  isAddingFriend.value = true
  try {
    const response = await request.post('/api/social/request_add', {
      target_username: targetName,
      request_msg: message
    })
    closeAddFriendModal()
    showToast("✅ " + response.data.message, 'success')
    await loadContacts()
  } catch (error: any) {
    showToast("❌ " + (error.response?.data?.detail || "操作失败"), 'error')
  } finally {
    isAddingFriend.value = false
  }
}

async function submitCreateGroup() {
  const groupName = createGroupName.value.trim()
  if (!groupName) {
    showToast('请输入群组名称', 'error')
    return
  }

  isCreatingGroup.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await request.post('/api/group/create', {
      group_name: groupName,
      description: createGroupDesc.value.trim(),
      member_ids: []  // 暂时只创建只有自己的群，后续可以添加选择成员的功能
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    closeCreateGroupModal()
    showToast("✅ 群组创建成功", 'success')
    await loadContacts()
  } catch (error: any) {
    showToast("❌ " + (error.response?.data?.detail || "创建群组失败"), 'error')
  } finally {
    isCreatingGroup.value = false
  }
}

// --- 好友申请管理 ---

function openRequestsModal() {
  showRequestsModal.value = true
  loadFriendRequests()
}

function closeRequestsModal() {
  showRequestsModal.value = false
}

async function loadFriendRequests() {
  isLoadingRequests.value = true
  try {
    const response = await request.get('/api/social/requests')
    friendRequests.value = response.data
    pendingRequestCount.value = friendRequests.value.length
  } catch (error) {
    showToast('加载好友申请列表失败', 'error')
  } finally {
    isLoadingRequests.value = false
  }
}

async function acceptRequest(requestId: string, fromUserId: string, fromUsername: string, fromAvatar: string, requestMsg: string) {
  try {
    await request.post('/api/social/handle', {
      request_id: requestId,
      action: 'accept'
    })

    friendRequests.value = friendRequests.value.filter(r => r._id !== requestId)
    pendingRequestCount.value--

    // 不在这里创建联系人，等待 WebSocket 的 friend_accepted 通知
    // 通知中会包含完整的用户信息和头像 base64 数据
    showToast(`✅ 已添加 ${fromUsername} 为好友`, 'success')
  } catch (error: any) {
    showToast("❌ " + (error.response?.data?.detail || "操作失败"), 'error')
  }
}

async function rejectRequest(requestId: string) {
  try {
    await request.post('/api/social/handle', {
      request_id: requestId,
      action: 'reject'
    })

    friendRequests.value = friendRequests.value.filter(r => r._id !== requestId)
    pendingRequestCount.value--

    showToast('已拒绝申请', 'info')
  } catch (error: any) {
    showToast("❌ " + (error.response?.data?.detail || "操作失败"), 'error')
  }
}

function formatRequestTime(timestamp: number) {
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString()
}

// --- 消息右键菜单功能 ---

function showMessageContextMenu(event: MouseEvent, msg: MessageData) {
  // 只允许撤回自己的消息
  if (msg.sender_id !== CURRENT_USER_ID) return

  // 检查消息是否在2分钟内（可撤回时间限制）
  const now = Date.now() / 1000
  const timeDiff = now - msg.ts
  if (timeDiff > 120) { // 120秒 = 2分钟
    showToast('消息发送超过2分钟，无法撤回', 'error')
    return
  }

  event.preventDefault()
  selectedMessage.value = msg
  contextMenuX.value = event.clientX-100
  contextMenuY.value = event.clientY
  showContextMenu.value = true
}

function hideContextMenu() {
  showContextMenu.value = false
  selectedMessage.value = null
}

function handleLongPressStart(event: TouchEvent, msg: MessageData) {
  // 只允许撤回自己的消息
  if (msg.sender_id !== CURRENT_USER_ID) return

  // 检查消息是否在2分钟内
  const now = Date.now() / 1000
  const timeDiff = now - msg.ts
  if (timeDiff > 120) {
    return
  }

  longPressTimer.value = window.setTimeout(() => {
    const touch = event.touches[0]
    selectedMessage.value = msg
    contextMenuX.value = touch.clientX
    contextMenuY.value = touch.clientY
    showContextMenu.value = true
  }, 500) // 长按500ms触发
}

function handleLongPressEnd() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

async function recallMessage() {
  if (!selectedMessage.value || !activeContact.value) return

  try {
    const token = localStorage.getItem('token')
    const response = await request.post('/api/chat/recall', {
      msg_id: selectedMessage.value.msg_id,
      chat_id: getChatId(CURRENT_USER_ID!, activeContact.value.id)
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.data.success) {
      // 更新本地消息状态
      const msgIndex = activeContact.value.messages.findIndex(m => m.msg_id === selectedMessage.value!.msg_id)
      if (msgIndex !== -1) {
        activeContact.value.messages[msgIndex].type = 'recalled'
        activeContact.value.messages[msgIndex].content = '你撤回了一条消息'
      }

      showToast('消息已撤回', 'success')
    }
  } catch (error: any) {
    console.error('撤回消息失败:', error)
    showToast(error.response?.data?.detail || '撤回失败', 'error')
  } finally {
    hideContextMenu()
  }
}

// --- 右上角菜单功能 ---

function showHeaderContextMenu(event: MouseEvent) {
  event.preventDefault()
  headerMenuX.value = event.clientX - 100
  headerMenuY.value = event.clientY
  showHeaderMenu.value = true
}

function hideHeaderMenu() {
  showHeaderMenu.value = false
}

// 点击群邀请卡片加入群聊
async function joinGroupFromCard(groupData: any) {
  if (!groupData || !groupData.group_id) {
    showToast('群组信息无效', 'error')
    return
  }

  try {
    const token = localStorage.getItem('token')
    const response = await request.post('/api/group/join_by_id', {
      group_id: groupData.group_id
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (response.data.already_member) {
      showToast(`你已经是 ${groupData.group_name} 的成员了`, 'info')
    } else {
      showToast(`✅ 成功加入群聊：${groupData.group_name}`, 'success')
      // 重新加载联系人列表以显示新加入的群
      await loadContacts()
    }
  } catch (error: any) {
    console.error('加入群聊失败:', error)
    const errorMsg = error.response?.data?.detail || '加入群聊失败'
    showToast(`❌ ${errorMsg}`, 'error')
  }
}

// 退出群聊
async function leaveGroup() {
  if (!activeContact.value || activeContact.value.type !== 'group') return

  try {
    const token = localStorage.getItem('token')
    const response = await request.post('/api/group/remove_member', {
      group_id: activeContact.value.id,
      user_id: CURRENT_USER_ID
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    // 从联系人列表中移除该群聊
    contacts.value = contacts.value.filter(c => c.id !== activeContact.value!.id)
    currentChatId.value = ''

    showToast('✅ 已退出群聊', 'success')
    hideHeaderMenu()
  } catch (error: any) {
    console.error('退出群聊失败:', error)
    showToast('❌ 退出群聊失败', 'error')
  }
}

// 删除好友
async function deleteFriend() {
  if (!activeContact.value || activeContact.value.type !== 'private') return

  // 确认对话框
  if (!confirm(`确定要删除好友 ${activeContact.value.username} 吗？`)) {
    return
  }

  try {
    const token = localStorage.getItem('token')
    const response = await request.post('/api/social/delete_friend', {
      friend_id: activeContact.value.id
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    // 从联系人列表中移除该好友
    contacts.value = contacts.value.filter(c => c.id !== activeContact.value!.id)
    currentChatId.value = ''

    showToast('✅ 已删除好友', 'success')
    hideHeaderMenu()
  } catch (error: any) {
    console.error('删除好友失败:', error)
    showToast('❌ 删除好友失败', 'error')
  }
}

// --- 生命周期 ---
onMounted(() => {
  loadContacts() 
  loadFriendRequests() 
  initWebSocket()
  scrollToBottom()
})

onUnmounted(() => {
  if (socket.value) socket.value.close()
  stopHeartbeat()

  // 清理头像 blob URLs
  contacts.value.forEach(contact => {
    if (contact.avatarBlobUrl && contact.avatarBlobUrl.startsWith('blob:')) {
      URL.revokeObjectURL(contact.avatarBlobUrl)
    }

    // 清理消息中的文件 blob URLs
    contact.messages.forEach(msg => {
      if (msg.fileBlobUrl && msg.fileBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(msg.fileBlobUrl)
      }
    })
  })
})
</script>

<template>
  <div class="flex h-[95dvh] w-screen overflow-hidden bg-[#0f172a] text-slate-200 antialiased font-sans">
    
    <!-- 全局背景光晕装饰 -->
    <div class="fixed top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none z-0"></div>
    <div class="fixed bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none z-0"></div>

    <!-- 左侧 Sidebar -->
    <aside class="relative z-10 flex w-80 flex-col border-r border-white/5 bg-slate-900/60 backdrop-blur-xl transition-all duration-300 md:w-96 overflow-hidden">
      
      <!-- Header -->
      <header class="sticky top-0 z-30 flex flex-col gap-4 p-5 pb-2 bg-slate-900/95 backdrop-blur-xl shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
             <h1 class="text-2xl font-bold tracking-tight text-white">Messages</h1>
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

          <div class="flex items-center gap-2">
            <!-- 好友申请按钮 -->
            <button @click="openRequestsModal" class="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-700 text-white shadow-lg transition-all hover:bg-slate-600 hover:shadow-slate-500/40 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              <!-- 角标 -->
              <span v-if="pendingRequestCount > 0" class="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-lg">
                {{ pendingRequestCount }}
              </span>
            </button>

            <!-- 创建群组按钮 -->
            <button @click="openCreateGroupModal" class="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg transition-all hover:bg-purple-500 hover:shadow-purple-500/40 active:scale-95" title="创建群组">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </button>

            <!-- 添加好友按钮 -->
            <button @click="openAddFriendModal" class="group relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:bg-indigo-500 hover:shadow-indigo-500/40 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </button>
          </div>
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

      <!-- Tabs -->
      <div class="sticky top-[116px] z-30 px-5 py-2 flex gap-4 text-xs font-medium text-slate-400 bg-slate-900/95 backdrop-blur-md shrink-0 border-b border-white/5">
        <button class="text-white hover:text-indigo-400 transition-colors">全部</button>
        <button class="hover:text-indigo-400 transition-colors">群聊</button>
        <button class="hover:text-indigo-400 transition-colors">未读</button>
      </div>

      <!-- 好友列表 -->
      <div class="relative z-10 flex-1 overflow-y-auto px-3 py-2 custom-scrollbar space-y-1">
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
            <div v-if="contact.avatarLoading" class="h-12 w-12 rounded-full bg-slate-700 animate-pulse"></div>

            <img
              v-else-if="contact.avatarBlobUrl && !contact.avatarError"
              :src="contact.avatarBlobUrl"
              class="h-12 w-12 rounded-full object-cover shadow-md"
              alt="Avatar"
              @error="contact.avatarError = true"
            />

            <div
              v-else
              class="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md"
            >
              {{ (contact.username || 'U')[0].toUpperCase() }}
            </div>

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
              <div class="flex items-center gap-2">
                <h3 class="truncate text-sm font-semibold text-slate-100" :class="{'text-indigo-200': contact.active}">
                  {{ contact.username }}
                </h3>
                <!-- 群组成员数量标识 -->
                <span v-if="contact.type === 'group'" class="flex items-center gap-1 text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  {{ contact.member_count }}
                </span>
              </div>
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
    <main class="relative z-10 flex flex-1 flex-col bg-slate-900/40 backdrop-blur-md overflow-hidden">
      
      <!-- Welcome Screen -->
      <div v-if="!activeContact" class="flex h-full flex-col items-center justify-center text-slate-400">
        <div class="mb-4 rounded-full bg-slate-800 p-6 animate-float">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </div>
        <p class="text-lg font-medium text-slate-300">Select a chat to start messaging</p>
        <p class="text-sm opacity-60">Status: {{ connectionStatus }}</p>
      </div>

      <!-- 活跃聊天界面 -->
      <div v-else class="flex h-full flex-col overflow-hidden">
        <!-- Chat Header -->
        <header class="flex h-16 shrink-0 items-center border-b border-white/5 px-6 bg-slate-900/30 backdrop-blur-sm z-20">
           <div class="flex items-center gap-3">
             <div class="relative shrink-0">
               <div v-if="activeContact.avatarLoading" class="h-8 w-8 rounded-full bg-slate-700 animate-pulse"></div>
               <img
                 v-else-if="activeContact.avatarBlobUrl && !activeContact.avatarError"
                 :src="activeContact.avatarBlobUrl"
                 class="h-8 w-8 rounded-full object-cover shadow-md"
                 alt="Avatar"
                 @error="activeContact.avatarError = true"
               />
               <div
                 v-else
                 class="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md"
               >
                 {{ (activeContact.username || 'U')[0].toUpperCase() }}
               </div>
               <span
                 class="absolute bottom-0 right-0 block h-2 w-2 rounded-full ring-2 ring-slate-900 shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-colors"
                 :class="activeContact.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'"
               ></span>
             </div>
             <h2 class="font-bold text-slate-100">{{ activeContact.username }}</h2>
           </div>
           <div class="ml-auto flex gap-4 text-slate-400">
             <button class="hover:text-white transition"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg></button>
             <button @click="showHeaderContextMenu" class="hover:text-white transition" title="更多选项"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg></button>
           </div>
        </header>

        <!-- Messages Area -->
        <div ref="chatAreaRef" @scroll="handleScroll" class="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar scroll-smooth z-10">
           <!-- 加载历史消息指示器 -->
           <div v-if="isLoadingHistory" class="flex justify-center py-2 mb-2">
             <div class="flex items-center gap-2 text-xs text-slate-400">
               <div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-indigo-500"></div>
               <span>加载历史消息...</span>
             </div>
           </div>

           <!-- 没有更多消息提示 -->
           <div v-else-if="!hasMoreHistory && currentMessages.length > 0" class="flex justify-center py-2 mb-2">
             <span class="text-xs text-slate-500">没有更多历史消息</span>
           </div>

           <div v-if="currentMessages.length === 0" class="flex h-full items-center justify-center">
              <span class="text-sm text-slate-500">Say hello to {{ activeContact.username }} 👋</span>
           </div>

           <div
             v-for="(msg, index) in currentMessages"
             :key="msg.msg_id"
             class="flex gap-3 mb-4 group"
             :class="{ 'flex-row-reverse': isMyMessage(msg) }"
             @contextmenu="showMessageContextMenu($event, msg)"
             @touchstart="handleLongPressStart($event, msg)"
             @touchend="handleLongPressEnd"
             @touchcancel="handleLongPressEnd"
           >
             <!-- 对于非自己的消息，显示发送者头像 -->
             <div v-if="!isMyMessage(msg)" class="shrink-0">
               <!-- 群聊消息：显示发送者的头像和名字 -->
               <template v-if="activeContact.type === 'group'">
                 <!-- 加载中 -->
                 <div v-if="msg.sender_avatar_loading" class="h-8 w-8 rounded-full bg-slate-700 animate-pulse mt-1"></div>
                 <!-- 显示头像 -->
                 <img
                   v-else-if="msg.sender_avatar_blob && !msg.sender_avatar_error"
                   :src="msg.sender_avatar_blob"
                   class="h-8 w-8 rounded-full mt-1 object-cover shadow-md"
                   :alt="msg.sender_username || 'User'"
                   :title="msg.sender_username || 'Unknown'"
                   @error="msg.sender_avatar_error = true"
                 />
                 <!-- 加载失败或没有头像，显示用户名首字母 -->
                 <div
                   v-else
                   class="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md mt-1"
                   :title="msg.sender_username || 'Unknown'"
                 >
                   {{ (msg.sender_username || 'U')[0].toUpperCase() }}
                 </div>
               </template>
               <!-- 私聊消息：显示联系人头像 -->
               <template v-else>
                 <div v-if="activeContact.avatarLoading" class="h-8 w-8 rounded-full bg-slate-700 animate-pulse mt-1"></div>
                 <img
                   v-else-if="activeContact.avatarBlobUrl && !activeContact.avatarError"
                   :src="activeContact.avatarBlobUrl"
                   class="h-8 w-8 rounded-full mt-1 object-cover shadow-md"
                   alt="Avatar"
                   @error="activeContact.avatarError = true"
                 />
                 <div
                   v-else
                   class="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-md mt-1"
                 >
                   {{ (activeContact.username || 'U')[0].toUpperCase() }}
                 </div>
               </template>
             </div>

             <div class="max-w-[70%]">
               <!-- 群聊中显示发送者名字（仅对别人的消息） -->
               <div v-if="!isMyMessage(msg) && activeContact.type === 'group' && msg.sender_username" class="mb-1 px-2">
                 <span class="text-xs text-slate-400">{{ msg.sender_username }}</span>
               </div>

               <div
                 v-if="msg.type !== 'recalled'"
                 class="px-4 py-2.5 text-sm shadow-md break-words relative overflow-hidden"
                 :class="[
                    isMyMessage(msg)
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none shadow-indigo-500/20'
                      : 'bg-slate-800 text-slate-200 rounded-2xl rounded-tl-none border border-white/5'
                 ]"
               >
                 <!-- 文本消息 -->
                 <template v-if="msg.type === 'text'">
                   {{ msg.content }}
                 </template>

                 <!-- 图片消息 -->
                 <template v-else-if="msg.type === 'image'">
                   <div>
                     <!-- 加载中状态 -->
                     <div v-if="msg.fileLoading" class="flex items-center justify-center w-64 h-48 bg-slate-700 rounded-lg">
                       <div class="text-center">
                         <div class="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-slate-600 border-t-indigo-400"></div>
                         <p class="mt-2 text-xs text-slate-400">加载中...</p>
                       </div>
                     </div>

                     <!-- 加载失败状态 -->
                     <div v-else-if="msg.fileError" class="flex items-center justify-center w-64 h-48 bg-slate-700 rounded-lg cursor-pointer" @click="loadMessageFile(msg)">
                       <div class="text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                         <p class="mt-2 text-xs text-slate-400">加载失败，点击重试</p>
                       </div>
                     </div>

                     <!-- 图片显示 -->
                     <div v-else-if="msg.fileBlobUrl" class="cursor-pointer" @click="openImagePreview(msg.fileBlobUrl)">
                       <img
                         :src="msg.fileBlobUrl"
                         :alt="msg.filename"
                         class="max-w-xs max-h-64 rounded-lg object-cover"
                       />
                       <p v-if="msg.filename" class="mt-2 text-xs opacity-75">{{ msg.filename }}</p>
                     </div>

                     <!-- 未加载状态（不应该出现，但作为后备） -->
                     <div v-else class="flex items-center justify-center w-64 h-48 bg-slate-700 rounded-lg">
                       <p class="text-xs text-slate-400">等待加载...</p>
                     </div>
                   </div>
                 </template>

                 <!-- 视频消息 -->
                 <template v-else-if="msg.type === 'video'">
                   <div class="space-y-2">
                     <!-- 加载中状态 -->
                     <div v-if="msg.fileLoading" class="flex items-center justify-center w-80 h-48 bg-slate-700 rounded-lg">
                       <div class="text-center">
                         <div class="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-slate-600 border-t-indigo-400"></div>
                         <p class="mt-2 text-xs text-slate-400">加载中...</p>
                       </div>
                     </div>

                     <!-- 加载失败状态 -->
                     <div v-else-if="msg.fileError" class="flex items-center justify-center w-80 h-48 bg-slate-700 rounded-lg cursor-pointer" @click="loadMessageFile(msg)">
                       <div class="text-center">
                         <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                         <p class="mt-2 text-xs text-slate-400">加载失败，点击重试</p>
                       </div>
                     </div>

                     <!-- 视频播放器 -->
                     <template v-else-if="msg.fileBlobUrl">
                       <video
                         :src="msg.fileBlobUrl"
                         controls
                         class="max-w-xs max-h-64 rounded-lg"
                         preload="metadata"
                       >
                         您的浏览器不支持视频播放
                       </video>
                       <div class="flex items-center gap-2 text-xs opacity-75">
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                         <span>{{ msg.filename }}</span>
                         <span v-if="msg.file_size">({{ formatFileSize(msg.file_size) }})</span>
                       </div>
                     </template>
                   </div>
                 </template>

                 <!-- 文档消息 -->
                 <template v-else-if="msg.type === 'document'">
                   <div
                     @click="downloadFile(msg)"
                     class="flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer"
                     :class="isMyMessage(msg) ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-slate-700 hover:bg-slate-600'"
                   >
                     <div class="flex-shrink-0">
                       <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                     </div>
                     <div class="flex-1 min-w-0">
                       <p class="font-medium truncate">{{ msg.filename }}</p>
                       <p v-if="msg.file_size" class="text-xs opacity-75 mt-1">{{ formatFileSize(msg.file_size) }}</p>
                     </div>
                     <div class="flex-shrink-0">
                       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                     </div>
                   </div>
                 </template>

                 <!-- 群邀请卡片消息 -->
                 <template v-else-if="msg.type === 'group_invite_card' && msg.group_data">
                   <div
                     @click="joinGroupFromCard(msg.group_data)"
                     class="flex items-start gap-3 p-4 rounded-lg border transition-colors cursor-pointer max-w-sm"
                     :class="isMyMessage(msg) ? 'bg-indigo-700 hover:bg-indigo-800 border-indigo-600' : 'bg-slate-700 hover:bg-slate-600 border-slate-600'"
                   >
                     <!-- 群组头像 -->
                     <div class="flex-shrink-0">
                       <div v-if="msg.group_data.group_avatar" class="h-12 w-12 rounded-lg overflow-hidden">
                         <img :src="msg.group_data.group_avatar" class="h-full w-full object-cover" alt="群头像" />
                       </div>
                       <div v-else class="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                         {{ msg.group_data.group_name[0].toUpperCase() }}
                       </div>
                     </div>

                     <!-- 群组信息 -->
                     <div class="flex-1 min-w-0">
                       <div class="flex items-center gap-2 mb-1">
                         <h4 class="font-semibold text-sm truncate">{{ msg.group_data.group_name }}</h4>
                         <span class="text-xs opacity-60">({{ msg.group_data.member_count }}人)</span>
                       </div>

                       <!-- 成员列表（最多3个） -->
                       <div v-if="msg.group_data.members && msg.group_data.members.length > 0" class="flex -space-x-2 mb-2">
                         <div
                           v-for="(member, idx) in msg.group_data.members.slice(0, 3)"
                           :key="idx"
                           class="h-6 w-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold ring-2 ring-slate-700"
                           :title="member.username"
                         >
                           {{ member.username[0].toUpperCase() }}
                         </div>
                       </div>

                       <div class="flex items-center gap-2">
                         <p class="text-xs opacity-75">点击加入群聊</p>
                         <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-75">
                           <polyline points="9 18 15 12 9 6"></polyline>
                         </svg>
                       </div>
                     </div>
                   </div>
                 </template>
               </div>

               <!-- 撤回消息样式 -->
               <div
                 v-else
                 class="px-3 py-2 text-xs text-slate-400 italic bg-slate-800/30 rounded-lg border border-slate-700/50"
               >
                 {{ msg.content }}
               </div>

               <div
                  v-if="msg.type !== 'recalled'"
                  class="mt-1 flex items-center gap-1 text-[10px] text-slate-500"
                  :class="{ 'flex-row-reverse': isMyMessage(msg) }"
               >
                 <span>{{ formatTime(msg.ts) }}</span>
                 <span v-if="isMyMessage(msg)" class="font-medium" :class="{'text-indigo-400': msg.status === 'read'}">
                   {{ msg.status === 'pending' ? 'Sending...' : 'Sent' }}
                 </span>
               </div>
             </div>
           </div>
        </div>

        <!-- Input Area -->
        <div class="px-6 pt-4 pb-12 shrink-0 relative z-20 bg-gradient-to-t from-slate-900 via-slate-900/90 to-transparent">
          <!-- 隐藏的文件输入 -->
          <input
            ref="fileInputRef"
            type="file"
            @change="handleFileSelect"
            class="hidden"
            accept="image/*,video/*,.pdf,.doc,.docx,.txt,.md,.xls,.xlsx,.ppt,.pptx"
          />

          <!-- 上传进度提示 -->
          <div v-if="isUploadingFile" class="mb-2 flex items-center gap-2 text-xs text-indigo-400">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-indigo-400"></div>
            <span>上传中... {{ uploadProgress }}%</span>
          </div>

          <div
             class="mb-4 flex items-end gap-2 rounded-2xl bg-slate-800/95 p-2 ring-1 ring-white/10 backdrop-blur-2xl shadow-2xl transition-all focus-within:ring-indigo-500/50"
             :class="{'opacity-50 pointer-events-none': connectionStatus !== 'connected' || isUploadingFile}"
          >
            <button @click="triggerFileSelect" class="p-2 text-slate-400 hover:text-indigo-400 transition mb-0.5" title="发送文件">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            </button>
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

    <!-- Modal (Add Friend) -->
    <Teleport to="body">
      <Transition 
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showAddFriendModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click="closeAddFriendModal">
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
                <div class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-[50px] pointer-events-none"></div>
                <div class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/20 blur-[50px] pointer-events-none"></div>

                <div class="relative px-6 pt-6">
                  <h3 class="text-xl font-bold text-white">Add New Friend</h3>
                  <p class="text-sm text-slate-400 mt-1">Enter username and greeting message.</p>
                </div>

                <div class="relative px-6 py-6 space-y-4">
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

                  <div class="group relative">
                    <textarea
                      v-model="addFriendMessage"
                      placeholder="Say hello..."
                      rows="3"
                      maxlength="200"
                      class="w-full rounded-xl bg-slate-800/50 border border-white/5 p-4 text-slate-200 placeholder-slate-500 outline-none ring-1 ring-transparent transition-all focus:bg-slate-800 focus:ring-2 focus:ring-indigo-500/50 resize-none"
                    ></textarea>
                    <div class="absolute bottom-2 right-2 text-xs text-slate-500">
                      {{ addFriendMessage.length }}/200
                    </div>
                  </div>
                </div>

                <div class="relative flex items-center justify-end gap-3 bg-slate-800/30 px-6 py-4 border-t border-white/5 backdrop-blur-md">
                  <button @click="closeAddFriendModal" class="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">Cancel</button>
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

    <!-- 创建群组弹窗 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showCreateGroupModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click="closeCreateGroupModal">
          <div @click.stop class="w-full max-w-md p-6">
            <Transition
              appear
              enter-active-class="transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              enter-from-class="opacity-0 scale-90 translate-y-4"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-200 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div v-if="showCreateGroupModal" class="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-white/10">
                <div class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-purple-500/20 blur-[50px] pointer-events-none"></div>
                <div class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/20 blur-[50px] pointer-events-none"></div>

                <div class="relative px-6 pt-6">
                  <h3 class="text-xl font-bold text-white">创建群组</h3>
                  <p class="text-sm text-slate-400 mt-1">创建一个新的群聊</p>
                </div>

                <div class="relative px-6 py-6 space-y-4">
                  <div class="group relative flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-4 h-5 w-5 text-slate-500 transition-colors group-focus-within:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <input
                      id="create-group-name"
                      v-model="createGroupName"
                      @keydown.enter="submitCreateGroup"
                      type="text"
                      placeholder="群组名称"
                      maxlength="50"
                      class="h-12 w-full rounded-xl bg-slate-800/50 border border-white/5 pl-12 pr-4 text-slate-200 placeholder-slate-500 outline-none ring-1 ring-transparent transition-all focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/50"
                    >
                  </div>

                  <div class="group relative">
                    <textarea
                      v-model="createGroupDesc"
                      placeholder="群组简介（可选）"
                      maxlength="200"
                      rows="3"
                      class="w-full rounded-xl bg-slate-800/50 border border-white/5 p-4 text-slate-200 placeholder-slate-500 outline-none ring-1 ring-transparent transition-all focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/50 resize-none"
                    ></textarea>
                  </div>
                </div>

                <div class="relative flex items-center justify-end gap-3 bg-slate-800/30 px-6 py-4 border-t border-white/5 backdrop-blur-md">
                  <button @click="closeCreateGroupModal" class="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">取消</button>
                  <button
                    @click="submitCreateGroup"
                    :disabled="isCreatingGroup || !createGroupName.trim()"
                    class="flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition-all hover:bg-purple-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span v-if="isCreatingGroup" class="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></span>
                    <span v-else>创建</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 邀请进群弹窗 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showInviteModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click="closeInviteModal">
          <div @click.stop class="w-full max-w-md p-6">
            <Transition
              appear
              enter-active-class="transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              enter-from-class="opacity-0 scale-90 translate-y-4"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-200 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div v-if="showInviteModal" class="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-white/10 max-h-[80vh] flex flex-col">
                <div class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-[50px] pointer-events-none"></div>
                <div class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/20 blur-[50px] pointer-events-none"></div>

                <div class="relative px-6 pt-6 pb-4 border-b border-white/5">
                  <h3 class="text-xl font-bold text-white">邀请好友进群</h3>
                  <p class="text-sm text-slate-400 mt-1">选择一个群组发送邀请</p>
                </div>

                <!-- 群组列表 -->
                <div class="relative px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
                  <div v-if="isLoadingInvite" class="flex items-center justify-center py-8">
                    <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
                  </div>

                  <div v-else-if="myGroupsList.length === 0" class="flex flex-col items-center justify-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-slate-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    <p class="text-slate-400 text-sm">你还没有加入任何群组</p>
                  </div>

                  <div v-else class="space-y-2">
                    <div
                      v-for="group in myGroupsList"
                      :key="group._id"
                      @click="selectGroupForInvite(group)"
                      class="group cursor-pointer rounded-xl bg-slate-800/50 p-4 border border-white/5 hover:bg-slate-800 hover:border-indigo-500/50 transition-all"
                      :class="{'bg-indigo-600/20 border-indigo-500/50': selectedGroupForInvite?._id === group._id}"
                    >
                      <div class="flex items-center gap-3">
                        <div class="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                          {{ group.group_name[0].toUpperCase() }}
                        </div>
                        <div class="flex-1 min-w-0">
                          <h4 class="font-semibold text-slate-100 truncate">{{ group.group_name }}</h4>
                          <p class="text-xs text-slate-400">{{ group.member_count }} 成员</p>
                        </div>
                        <svg v-if="selectedGroupForInvite?._id === group._id" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="relative flex items-center justify-end gap-3 bg-slate-800/30 px-6 py-4 border-t border-white/5 backdrop-blur-md">
                  <button @click="closeInviteModal" class="rounded-lg px-6 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">关闭</button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 好友申请列表弹窗 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="showRequestsModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" @click="closeRequestsModal">
          <div @click.stop class="w-full max-w-md p-6">
            <Transition
              appear
              enter-active-class="transition duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              enter-from-class="opacity-0 scale-90 translate-y-4"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition duration-200 ease-in"
              leave-from-class="opacity-100 scale-100"
              leave-to-class="opacity-0 scale-95"
            >
              <div v-if="showRequestsModal" class="relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 shadow-2xl shadow-black/50 ring-1 ring-white/10 max-h-[80vh] flex flex-col">
                <div class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-indigo-500/20 blur-[50px] pointer-events-none"></div>
                <div class="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-blue-500/20 blur-[50px] pointer-events-none"></div>

                <div class="relative px-6 pt-6 pb-4 border-b border-white/5">
                  <h3 class="text-xl font-bold text-white">好友申请</h3>
                  <p class="text-sm text-slate-400 mt-1">{{ friendRequests.length }} 条待处理申请</p>
                </div>

                <div class="relative px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
                  <div v-if="isLoadingRequests" class="flex items-center justify-center py-8">
                    <div class="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-indigo-500"></div>
                  </div>

                  <div v-else-if="friendRequests.length === 0" class="flex flex-col items-center justify-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-slate-600 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <p class="text-slate-400 text-sm">暂无待处理的申请</p>
                  </div>

                  <div v-else class="space-y-3">
                    <div
                      v-for="request in friendRequests"
                      :key="request._id"
                      class="group relative flex items-start gap-4 rounded-2xl bg-slate-800/50 p-4 border border-white/5 hover:bg-slate-800 transition-all"
                    >
                      <img :src="request.from_avatar" class="h-12 w-12 rounded-full object-cover shadow-md shrink-0" alt="Avatar" />
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between mb-1">
                          <h4 class="font-semibold text-slate-100 truncate">{{ request.from_username }}</h4>
                          <span class="text-xs text-slate-500 shrink-0 ml-2">{{ formatRequestTime(request.create_time) }}</span>
                        </div>
                        <p class="text-sm text-slate-400 mb-3 line-clamp-2">{{ request.request_msg }}</p>
                        <div class="flex items-center gap-2">
                          <button
                            @click="acceptRequest(request._id, request.from_user_id, request.from_username, request.from_avatar, request.request_msg)"
                            class="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95"
                          >
                            同意
                          </button>
                          <button
                            @click="rejectRequest(request._id)"
                            class="flex-1 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:bg-slate-600 active:scale-95"
                          >
                            拒绝
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="relative flex items-center justify-end gap-3 bg-slate-800/30 px-6 py-4 border-t border-white/5 backdrop-blur-md">
                  <button @click="closeRequestsModal" class="rounded-lg px-6 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white">关闭</button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 消息右键菜单 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showContextMenu"
          class="fixed z-[200] bg-slate-800 border border-white/10 rounded-lg shadow-2xl overflow-hidden min-w-[150px]"
          :style="{ left: `${contextMenuX}px`, top: `${contextMenuY}px` }"
          @click.stop
        >
          <button
            @click="recallMessage"
            class="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            <span>撤回消息</span>
          </button>
        </div>
      </Transition>

      <!-- 点击其他地方关闭菜单 -->
      <div
        v-if="showContextMenu"
        class="fixed inset-0 z-[199]"
        @click="hideContextMenu"
      ></div>
    </Teleport>

    <!-- 右上角头部菜单 -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="showHeaderMenu"
          class="fixed z-[200] bg-slate-800 border border-white/10 rounded-lg shadow-2xl overflow-hidden min-w-[160px]"
          :style="{ left: `${headerMenuX}px`, top: `${headerMenuY}px` }"
          @click.stop
        >
          <!-- 邀请进群（仅私聊） -->
          <button
            v-if="activeContact?.type === 'private'"
            @click="openInviteModal(); hideHeaderMenu()"
            class="w-full px-4 py-3 text-left text-sm text-slate-200 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <span>邀请进群</span>
          </button>

          <!-- 删除好友（仅私聊） -->
          <button
            v-if="activeContact?.type === 'private'"
            @click="deleteFriend"
            class="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="18" y1="8" x2="23" y2="13"></line>
              <line x1="23" y1="8" x2="18" y2="13"></line>
            </svg>
            <span>删除好友</span>
          </button>

          <!-- 退出群聊（仅群聊） -->
          <button
            v-if="activeContact?.type === 'group'"
            @click="leaveGroup"
            class="w-full px-4 py-3 text-left text-sm text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            <span>退出群聊</span>
          </button>
        </div>
      </Transition>

      <!-- 点击其他地方关闭菜单 -->
      <div
        v-if="showHeaderMenu"
        class="fixed inset-0 z-[199]"
        @click="hideHeaderMenu"
      ></div>
    </Teleport>

    <!-- TOAST NOTIFICATION CONTAINER (位置已调整至 top-24) -->
    <Teleport to="body">
      <div class="fixed top-24 left-1/2 z-[100] -translate-x-1/2 flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4">
        <TransitionGroup 
          tag="div" 
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-4 scale-95"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 -translate-y-4 scale-95 absolute"
          move-class="transition duration-300 ease"
        >
          <div 
            v-for="toast in toasts" 
            :key="toast.id" 
            class="pointer-events-auto flex w-full items-center gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md"
            :class="{
              'bg-emerald-950/80 border-emerald-500/30 text-emerald-100': toast.type === 'success',
              'bg-red-950/80 border-red-500/30 text-red-100': toast.type === 'error',
              'bg-slate-800/80 border-indigo-500/30 text-slate-100': toast.type === 'info',
            }"
          >
            <!-- Success Icon -->
            <svg v-if="toast.type === 'success'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <!-- Error Icon -->
            <svg v-else-if="toast.type === 'error'" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
            <!-- Info Icon -->
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 shrink-0 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            
            <p class="text-sm font-medium">{{ toast.message }}</p>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
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
