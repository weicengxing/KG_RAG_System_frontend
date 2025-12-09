<template>
  <div class="music-player-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
    </div>

    <div class="music-header">
      <h1 class="music-title">
        <span class="title-icon">🎵</span>
        音乐播放器
      </h1>
      <div class="header-controls">
        <el-input
          v-model="searchQuery"
          placeholder="搜索歌曲、艺术家..."
          clearable
          prefix-icon="Search"
          class="search-input"
          @input="handleSearch"
        />
      </div>
    </div>

    <div class="music-content">
      <!-- 左侧:歌曲列表 -->
      <div class="song-list-panel" ref="songListRef">
        <div class="panel-header">
          <h2>歌曲列表</h2>
          <span class="song-count">
            <template v-if="isLoadingSongs && totalSongs > 0">
              加载中 {{ loadedCount }}/{{ totalSongs }}
            </template>
            <template v-else-if="isLoadingSongs">
              加载中...
            </template>
            <template v-else>
              {{ filteredSongs.length }} 首歌曲
            </template>
          </span>
        </div>
        <!-- 加载进度条 -->
        <div class="loading-progress" v-if="isLoadingSongs && totalSongs > 0">
          <div class="progress-bar" :style="{ width: (loadedCount / totalSongs * 100) + '%' }"></div>
        </div>
        <div class="song-list">
          <div
            v-for="(song, index) in filteredSongs"
            :key="song.id"
            :class="['song-item', { 'active': currentSong?.id === song.id, 'playing': currentSong?.id === song.id && isPlaying }]"
            @click="selectSong(song)"
          >
            <div class="song-index">{{ index + 1 }}</div>
            <div class="song-cover">
              <img
                v-if="song.coverBlobUrl"
                :src="song.coverBlobUrl"
                :alt="song.title"
                @error="(e) => handleImageError(e, song.id)"
              />
              <div v-else class="default-cover">
                <i class="cover-icon">🎵</i>
              </div>
              <div class="play-overlay" v-if="currentSong?.id === song.id && isPlaying">
                <i class="playing-icon">▶</i>
              </div>
            </div>
            <div class="song-info">
              <div class="song-title">{{ song.title }}</div>
              <div class="song-artist">{{ song.artist || '未知艺术家' }}</div>
            </div>
            <div class="song-actions">
              <div
                class="download-icon"
                @click.stop="downloadSong(song)"
                :title="'下载 ' + song.title"
              >
                <svg viewBox="0 0 24 24" class="download-svg">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
                </svg>
              </div>
              <div class="song-duration">{{ formatDuration(song.duration) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧:播放器控制面板 -->
      <div class="player-panel">
        <div class="current-song-display" v-if="currentSong">
          <!-- 封面图片显示 -->
          <div class="cover-wrapper" v-show="!showLyrics">
            <div 
              class="cover-display" 
              :class="{ 'spinning': isPlaying }"
              @click="toggleLyrics"
            >
              <img
                v-if="currentSong.coverBlobUrl"
                :src="currentSong.coverBlobUrl"
                :alt="currentSong.title"
                class="large-cover clickable-cover"
                @error="(e) => handleImageError(e, currentSong.id)"
              />
              <div v-else class="default-large-cover clickable-cover">
                <i class="large-icon">🎵</i>
              </div>
            </div>
            <!-- 音波效果 -->
            <div class="sound-wave" v-if="isPlaying">
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
              <span class="wave-bar"></span>
            </div>
          </div>
          <!-- 歌词显示 - 占据整个宽度 -->
          <div 
            class="lyrics-display-full" 
            v-show="showLyrics"
            @click="handleLyricsAreaClick"
            :style="{ backgroundImage: `url(${bgImage})` }"
          >
            <div 
              class="lyrics-container" 
              ref="lyricsContainer"
              @scroll="handleLyricsScroll"
            >
              <div 
                v-for="(line, index) in parsedLyrics" 
                :key="index"
                :class="['lyrics-line', { 'active': line.isActive }]"
                :ref="el => { if (el) lyricsLineRefs[index] = el }"
                @click.stop="playFromTime(line.time)"
              >
                <span 
                  class="lyrics-play-icon" 
                  @click.stop="playFromTime(line.time)"
                  v-show="!line.isActive"
                >
                  <svg viewBox="0 0 24 24" class="play-icon-svg">
                    <path d="M8 5v14l11-7z" fill="currentColor"/>
                  </svg>
                </span>
                <span class="lyrics-text">{{ line.text }}</span>
              </div>
              <div v-if="parsedLyrics.length === 0 && lyricsLoading" class="lyrics-loading">
                加载歌词中...
              </div>
              <div v-if="parsedLyrics.length === 0 && !lyricsLoading && lyricsError" class="lyrics-error">
                暂无歌词
              </div>
            </div>
          </div>
          <div class="song-details" v-show="!showLyrics">
            <h2 class="current-title">{{ currentSong.title }}</h2>
            <p class="current-artist">{{ currentSong.artist || '未知艺术家' }}</p>
            <p class="current-album" v-if="currentSong.album">{{ currentSong.album }}</p>
          </div>
        </div>
        <div class="empty-player" v-else>
          <div class="empty-icon">🎵</div>
          <p class="empty-text">选择一首歌曲开始播放</p>
        </div>

        <div class="player-controls" v-if="currentSong">
          <div class="progress-bar-container">
            <span class="time-display">{{ formatTime(currentTime) }}</span>
            <div class="progress-wrapper" @click="handleProgressClick">
              <div class="progress-track">
                <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
                <div 
                  class="progress-thumb" 
                  :style="{ left: progressPercent + '%' }"
                  @mousedown="startDrag"
                  @touchstart="startDrag"
                ></div>
              </div>
            </div>
            <span class="time-display">{{ formatTime(duration) }}</span>
          </div>

          <div class="control-buttons">
            <!-- 播放模式按钮 -->
            <button
              class="control-btn btn-mode"
              @click="cyclePlayMode"
              :title="playModeTitle"
            >
              <svg v-if="playMode === 'sequence'" viewBox="0 0 24 24" class="mode-icon">
                <path d="M3 15h2v2H3v-2zm4 0h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2zM3 11h18v2H3v-2zM3 7h2v2H3V7zm4 0h2v2H7V7zm4 0h2v2h-2V7zm4 0h2v2h-2V7zm4 0h2v2h-2V7z"/>
              </svg>
              <svg v-else-if="playMode === 'loop'" viewBox="0 0 24 24" class="mode-icon">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" class="mode-icon">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>
            <button
              class="control-btn btn-prev"
              @click="previousSong"
              :disabled="!currentSong"
            >
              <svg viewBox="0 0 24 24" class="control-icon">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>
            <button
              class="control-btn btn-play"
              @click="togglePlay"
              :disabled="!currentSong"
            >
              <svg v-if="!isPlaying" viewBox="0 0 24 24" class="control-icon play-icon">
                <path d="M8 5v14l11-7z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" class="control-icon play-icon">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            </button>
            <button
              class="control-btn btn-next"
              @click="nextSong"
              :disabled="!currentSong"
            >
              <svg viewBox="0 0 24 24" class="control-icon">
                <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          <div class="volume-control">
            <span class="volume-icon" @click="toggleMute">
              {{ volume === 0 ? '🔇' : volume < 50 ? '🔉' : '🔊' }}
            </span>
            <div class="volume-wrapper">
              <div class="volume-track" @click="handleVolumeClick">
                <div class="volume-fill" :style="{ width: volume + '%' }"></div>
                <div 
                  class="volume-thumb" 
                  :style="{ left: volume + '%' }"
                  @mousedown="startVolumeDrag"
                  @touchstart="startVolumeDrag"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import request from '../utils/request'
import { useMusicStore } from '../stores/music'
import bgImage from '/background/default.jpg'

const musicStore = useMusicStore()

const searchQuery = ref('')
const isDragging = ref(false)
const isVolumeDragging = ref(false)
const lastVolume = ref(50) // 用于静音前的音量记忆
const showLyrics = ref(false) // 是否显示歌词
const lyricsText = ref('') // 原始歌词文本
const parsedLyrics = ref([]) // 解析后的歌词数组
const lyricsLoading = ref(false) // 歌词加载状态
const lyricsError = ref(false) // 歌词加载错误
const lyricsContainer = ref(null) // 歌词容器引用
const lyricsLineRefs = ref({}) // 歌词行引用
const isUserScrolling = ref(false) // 用户是否在手动滚动
const scrollTimeout = ref(null) // 滚动超时定时器
// --- 音频预加载与缓存状态 (LRU版) ---
const MAX_CACHE_SIZE = 50        // 最大缓存歌曲数量
const audioBlobCache = new Map() // 缓存 Map (Key顺序即LRU顺序：头部最老，尾部最新)
const downloadQueue = ref([])    // 下载队列
const queuedSongIds = new Set()  // 排队ID集合 (O(1)去重)
const isDownloading = ref(false) // 下载状态
// 流式加载相关状态
const isLoadingSongs = ref(false) // 是否正在加载歌曲
const totalSongs = ref(0) // 歌曲总数
const loadedCount = ref(0) // 已加载数量
const songListRef = ref(null) // 歌曲列表容器引用

const songs = computed(() => musicStore.songs)
const currentSong = computed(() => musicStore.currentSong)
const isPlaying = computed(() => musicStore.isPlaying)
const currentTime = computed(() => musicStore.currentTime)
const duration = computed(() => musicStore.duration)
const playMode = computed(() => musicStore.playMode)
const volume = computed({
  get: () => musicStore.volume,
  set: (val) => musicStore.setVolume(val)
})
const audioPlayer = computed(() => musicStore.audioPlayer)

/**
 * LRU 缓存添加/更新策略
 * 1. 如果已存在：先删除再重新 set，将其移动到 Map 末尾（标记为最新使用）
 * 2. 如果不存在且缓存满：删除 Map 头部（最久未使用）的元素，并释放内存
 */
const addBlobToCache = (songId, blobUrl) => {
  if (audioBlobCache.has(songId)) {
    // 命中缓存：即使 URL 一样，也要删除重加，为了更新它在 Map 中的位置（变成最新）
    audioBlobCache.delete(songId)
  } else {
    // 新增缓存：检查容量
    if (audioBlobCache.size >= MAX_CACHE_SIZE) {
      // 获取 Map 中第一个键（即最久未使用的）
      const oldestId = audioBlobCache.keys().next().value
      const oldestUrl = audioBlobCache.get(oldestId)
      
      // 【关键】释放内存！
      if (oldestUrl) {
        URL.revokeObjectURL(oldestUrl)
      }
      
      // 从 Map 中移除
      audioBlobCache.delete(oldestId)
      console.log(`[LRU] 缓存已满(${MAX_CACHE_SIZE})，释放旧歌曲 ID: ${oldestId}`)
    }
  }
  
  // 存入新数据（放在 Map 末尾）
  audioBlobCache.set(songId, blobUrl)
}

// 播放模式标题
const playModeTitle = computed(() => {
  switch (playMode.value) {
    case 'sequence': return '顺序播放'
    case 'loop': return '循环播放'
    case 'random': return '随机播放'
    default: return '顺序播放'
  }
})

// 切换播放模式
const cyclePlayMode = () => {
  const newMode = musicStore.togglePlayMode()
  const modeNames = {
    'sequence': '顺序播放',
    'loop': '循环播放',
    'random': '随机播放'
  }
  ElMessage.success(`已切换为${modeNames[newMode]}`)
}

// 计算进度百分比
const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

const filteredSongs = computed(() => {
  if (!searchQuery.value.trim()) {
    return songs.value
  }
  const query = searchQuery.value.toLowerCase()
  return songs.value.filter(song => 
    song.title.toLowerCase().includes(query) ||
    (song.artist && song.artist.toLowerCase().includes(query)) ||
    (song.album && song.album.toLowerCase().includes(query))
  )
})

// 获取封面
const getCoverBlobUrl = async (filename, songId) => {
  const cached = musicStore.getCoverCache(songId)
  if (cached) {
    return cached
  }

  try {
    const response = await request.get(`/music/image/${encodeURIComponent(filename)}`, {
      responseType: 'blob'
    })
    const blobUrl = URL.createObjectURL(response.data)
    musicStore.setCoverCache(songId, blobUrl)
    return blobUrl
  } catch (error) {
    console.error(`获取封面 ${filename} 失败:`, error)
    return ''
  }
}

// 获取封面（懒加载版本 - 不阻塞）
const loadCoverAsync = (song) => {
  if (!song.cover_image || song.coverBlobUrl) return

  getCoverBlobUrl(song.cover_image, song.id).then(blobUrl => {
    // 找到对应歌曲并更新封面
    const songInStore = musicStore.songs.find(s => s.id === song.id)
    if (songInStore) {
      songInStore.coverBlobUrl = blobUrl
    }
  })
}

// 1. 从队列移除 (保底策略用)
const removeSongFromQueue = (songId) => {
  // 从 Set 中移除 (O(1) 极速)
  queuedSongIds.delete(songId)
  
  // 从 Array 中移除
  const index = downloadQueue.value.findIndex(s => s.id === songId)
  if (index !== -1) {
    downloadQueue.value.splice(index, 1)
  }
}

// 3. 添加到队列 (入口函数)
const queueSongForPreload = (song) => {
  // 检查1: 已经下好的，不排队 (Map lookup: O(1))
  if (audioBlobCache.has(song.id)) return
  
  // 检查2: 已经在排队的，不排队 (Set lookup: O(1))
  // 【优化点】这里之前是用 Array.find，现在改用 Set.has，速度提升巨大
  if (queuedSongIds.has(song.id)) return
  
  // 标记为正在排队
  queuedSongIds.add(song.id)
  downloadQueue.value.push(song)
  
  // 触发处理（非阻塞调用）
  processDownloadQueue()
}


// 2. 处理下载队列 (修改：使用 addBlobToCache)
const processDownloadQueue = async () => {
  if (isDownloading.value || downloadQueue.value.length === 0) return
  
  isDownloading.value = true
  const song = downloadQueue.value.shift()
  queuedSongIds.delete(song.id) 
  
  try {
    if (audioBlobCache.has(song.id)) {
      console.log(`[预加载] 跳过已缓存: ${song.title}`)
      // 即使跳过下载，也建议更新一下 LRU 活跃度
      addBlobToCache(song.id, audioBlobCache.get(song.id))
    } else {
      console.log(`[预加载] 开始: ${song.title}`)
      const response = await request.get(`/music/play/${song.id}`, {
        responseType: 'blob'
      })
      const blobUrl = URL.createObjectURL(response.data)
      
      // 使用 LRU 函数存入
      addBlobToCache(song.id, blobUrl)
    }
  } catch (error) {
    console.warn(`[预加载] 失败: ${song.title}`, error)
  } finally {
    isDownloading.value = false
    if (downloadQueue.value.length > 0) {
      setTimeout(processDownloadQueue, 100) 
    }
  }
}



// 流式获取歌曲列表（SSE）
const fetchSongsStream = () => {
  return new Promise((resolve, reject) => {
    isLoadingSongs.value = true
    loadedCount.value = 0
    totalSongs.value = 0

    const token = localStorage.getItem('token')
    const eventSource = new EventSource(
      `https://michelina-unenrichable-dacia.ngrok-free.dev/music/songs/stream?token=${encodeURIComponent(token)}`
    )

    // 临时存储歌曲
    const tempSongs = []
    let hasError = false // 防止重复处理错误

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'meta') {
          totalSongs.value = data.total
        } else if (data.type === 'song') {
          const song = { ...data.song, coverBlobUrl: '' }
          tempSongs.push(song)
          loadedCount.value = tempSongs.length

          // 每收到一首歌就更新 store，让用户能立即看到
          musicStore.setSongs([...tempSongs])

          // 异步加载封面（不阻塞）
          loadCoverAsync(song)
          queueSongForPreload(song)

          // 如果是第一首歌且没有当前播放的歌曲，自动选中
          if (tempSongs.length === 1 && !musicStore.currentSong) {
            selectSong(song, false)
          }
        } else if (data.type === 'done') {
          eventSource.close()
          isLoadingSongs.value = false
          resolve(tempSongs)
        } else if (data.type === 'error') {
          eventSource.close()
          isLoadingSongs.value = false
          hasError = true
          reject(new Error(data.message || '获取歌曲列表失败'))
        }
      } catch (e) {
        console.error('解析 SSE 数据失败:', e)
      }
    }

    eventSource.onerror = (error) => {
      if (hasError) return // 防止重复处理错误
      
      eventSource.close()
      hasError = true
      isLoadingSongs.value = false
      // SSE 连接失败，reject 让 fetchSongs() 统一处理回退逻辑
      console.warn('SSE 连接失败，回退到分页加载:', error)
      reject(new Error('SSE 连接失败'))
    }
  })
}

// 分页获取歌曲列表（备用方案）
const fetchSongsPaginated = async () => {
  try {
    isLoadingSongs.value = true
    const response = await request.get('/music/songs', {
      params: { limit: 50, offset: 0 }
    })

    if (response.data && response.data.songs) {
      const songs = response.data.songs.map(song => ({ ...song, coverBlobUrl: '' }))
      musicStore.setSongs(songs)
      totalSongs.value = response.data.total

      // 异步加载所有封面（不阻塞）
      songs.forEach(song => loadCoverAsync(song))

      if (songs.length > 0 && !musicStore.currentSong) {
        selectSong(songs[0], false)
      }
    }
  } catch (error) {
    console.error('获取歌曲列表失败:', error)
    ElMessage.error('获取歌曲列表失败')
  } finally {
    isLoadingSongs.value = false
  }
}

// 主入口：优先使用流式加载
const fetchSongs = async () => {
  try {
    await fetchSongsStream()
  } catch (error) {
    console.error('流式加载失败，尝试分页加载:', error)
    await fetchSongsPaginated()
  }
}

// -----------------------------------------------------
// 播放控制逻辑核心修正
// -----------------------------------------------------

// 随机播放下一首
const playRandomSong = () => {
  const len = musicStore.songs.length
  if (len === 0) return
  
  if (len === 1) {
    // 只有一首歌时
    if (musicStore.currentSong && musicStore.currentSong.id === musicStore.songs[0].id) {
      // 如果正在播放这首，重新播放
      if (musicStore.audioPlayer) {
        musicStore.audioPlayer.currentTime = 0
        musicStore.audioPlayer.play()
          .then(() => musicStore.setIsPlaying(true))
          .catch(err => {
            console.error('重新播放失败:', err)
            musicStore.setIsPlaying(false)
          })
      }
    } else {
      // 如果没有播放或播放的不是这首，选择这首
      selectSong(musicStore.songs[0], true)
    }
    return
  }

  const currentIndex = musicStore.songs.findIndex(s => s.id === musicStore.currentSong?.id)
  let randomIndex
  
  // 如果当前歌曲不在列表中，随机选择一首
  if (currentIndex === -1) {
    randomIndex = Math.floor(Math.random() * len)
  } else if (len === 2) {
    // 只有两首歌时，直接选择另一首
    randomIndex = 1 - currentIndex
  } else {
    // 有多首歌时，从除了当前歌曲之外的其他歌曲中随机选择
    // 创建一个不包含当前索引的数组
    const availableIndices = []
    for (let i = 0; i < len; i++) {
      if (i !== currentIndex) {
        availableIndices.push(i)
      }
    }
    // 从可用索引中随机选择一个
    const randomPos = Math.floor(Math.random() * availableIndices.length)
    randomIndex = availableIndices[randomPos]
  }

  selectSong(musicStore.songs[randomIndex], true)
}

// 顺序播放下一首
const playNextInSequence = () => {
  if (musicStore.songs.length === 0) return
  
  const currentIndex = musicStore.songs.findIndex(s => s.id === musicStore.currentSong?.id)
  // 如果当前歌曲不在列表中，从第一首开始
  const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % musicStore.songs.length
  selectSong(musicStore.songs[nextIndex], true)
}

// 处理自然播放结束事件
const handleSongEnded = () => {
  if (!musicStore.audioPlayer) return
  
  // 更新播放状态
  musicStore.setIsPlaying(false)
  
  if (!musicStore.currentSong || musicStore.songs.length === 0) return

  switch (musicStore.playMode) {
    case 'loop':
      // 单曲循环：将进度条拉回0并重新播放
      musicStore.audioPlayer.currentTime = 0
      musicStore.audioPlayer.play()
        .then(() => {
          musicStore.setIsPlaying(true)
        })
        .catch(err => {
          console.error('循环重播失败:', err)
          musicStore.setIsPlaying(false)
        })
      break
    case 'random':
      playRandomSong()
      break
    case 'sequence':
    default:
      playNextInSequence()
      break
  }
}

// 3. 核心播放函数 (修改：使用 addBlobToCache 刷新活跃度)
const selectSong = async (song, autoPlay = true) => {
  if (!musicStore.audioPlayer) {
    ElMessage.error('播放器未就绪')
    return
  }

  try {
    // 1. 停止当前播放
    if (musicStore.isPlaying) {
      musicStore.audioPlayer.pause()
    }
    
    // 2. 更新状态
    musicStore.setCurrentSong(song)
    musicStore.setIsPlaying(false)
    
    // 【重要】千万不要调用 musicStore.clearBlobUrl() 
    
    // 重置歌词
    const wasShowingLyrics = showLyrics.value
    lyricsText.value = ''
    parsedLyrics.value = []
    lyricsError.value = false
    
    let blobUrl = ''

    // --- 缓存与请求逻辑 ---
    if (audioBlobCache.has(song.id)) {
      console.log(`[播放] 命中缓存: ${song.title}`)
      blobUrl = audioBlobCache.get(song.id)
      
      // 【关键】命中缓存也要调用一次 LRU 方法
      // 这样这首歌就会被移动到 Map 的末尾，标记为“最近使用”，避免被淘汰
      addBlobToCache(song.id, blobUrl)
    } else {
      console.log(`[播放] 未命中缓存，立即请求: ${song.title}`)
      removeSongFromQueue(song.id)
      
      const response = await request.get(`/music/play/${song.id}`, {
        responseType: 'blob'
      })
      
      blobUrl = URL.createObjectURL(response.data)
      
      // 使用 LRU 函数存入 (如果满了会自动删最旧的)
      addBlobToCache(song.id, blobUrl)
    }
    // -------------------
    
    // 3. 设置音频源
    musicStore.setCurrentBlobUrl(blobUrl)
    musicStore.audioPlayer.src = blobUrl
    musicStore.audioPlayer.volume = musicStore.volume / 100
    
    // 4. 加载并播放
    musicStore.audioPlayer.load()

    if (autoPlay) {
      const playAfterLoad = () => {
        musicStore.audioPlayer.play()
          .then(() => musicStore.setIsPlaying(true))
          .catch((e) => {
            console.warn('自动播放受阻:', e)
            musicStore.setIsPlaying(false)
          })
      }
      
      if (musicStore.audioPlayer.readyState >= 3) {
        playAfterLoad()
      } else {
        musicStore.audioPlayer.oncanplay = () => {
          playAfterLoad()
          musicStore.audioPlayer.oncanplay = null 
        }
      }
    }
    
    if (wasShowingLyrics) {
      fetchLyrics()
    }
  } catch (error) {
    console.error('加载歌曲失败:', error)
    ElMessage.error(`加载歌曲失败: ${error.message || '网络错误'}`)
  }
}

// 手动上一首
// 注意：手动点击"上一首"时，无论播放模式是什么，都按照列表顺序播放上一首
// 只有歌曲自然播放结束时，才会按照播放模式（随机/循环/顺序）来处理
const previousSong = () => {
  if (musicStore.songs.length === 0) return
  
  const currentIndex = musicStore.songs.findIndex(s => s.id === musicStore.currentSong?.id)
  const len = musicStore.songs.length
  // 如果当前歌曲不在列表中，选择最后一首
  const prevIndex = currentIndex === -1 ? len - 1 : (currentIndex - 1 + len) % len
  selectSong(musicStore.songs[prevIndex], true)
}

// 手动下一首
// 注意：手动点击"下一首"时，无论播放模式是什么，都按照列表顺序播放下一首
// 只有歌曲自然播放结束时，才会按照播放模式（随机/循环/顺序）来处理
const nextSong = () => {
  if (musicStore.songs.length === 0) return
  // 手动点击下一首时，总是按照列表顺序播放，不管播放模式
  playNextInSequence()
}

const togglePlay = () => {
  if (!musicStore.currentSong || !musicStore.audioPlayer) return
  
  if (musicStore.isPlaying) {
    musicStore.audioPlayer.pause()
    musicStore.setIsPlaying(false)
  } else {
    musicStore.audioPlayer.play().then(() => {
      musicStore.setIsPlaying(true)
    }).catch(err => {
      console.error('播放失败:', err)
      ElMessage.error('播放失败，请检查音频文件')
    })
  }
}

// -----------------------------------------------------
// 全局事件监听 (修复 Bug 的关键)
// -----------------------------------------------------

// 音频错误处理函数（必须在 watch 之前定义）
const handleAudioError = (e) => {
  console.error('音频播放错误:', e)
  musicStore.setIsPlaying(false)
  ElMessage.error('音频文件无法播放')
}

// 监听 audioPlayer 实例，只绑定一次事件
watch(() => musicStore.audioPlayer, (player) => {
  if (player) {
    // 移除可能存在的旧监听器 (防止重复)
    player.removeEventListener('ended', handleSongEnded)
    player.removeEventListener('error', handleAudioError)
    
    // 绑定新的监听器
    player.addEventListener('ended', handleSongEnded)
    player.addEventListener('error', handleAudioError)
    
    player.volume = musicStore.volume / 100
  }
}, { immediate: true })

// 监听播放时间，更新歌词高亮
watch(() => currentTime.value, () => {
  updateLyricsHighlight()
})

// -----------------------------------------------------
// 其他辅助功能
// -----------------------------------------------------

const handleNextSongEvent = (event) => {
  if (event.detail && event.detail.song) {
    selectSong(event.detail.song, true)
  }
}

const handleProgressClick = (e) => {
  if (!audioPlayer.value || !duration.value) return
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = (e.clientX - rect.left) / rect.width
  const newTime = percent * duration.value
  audioPlayer.value.currentTime = newTime
  musicStore.setCurrentTime(newTime)
}

const startDrag = (e) => {
  isDragging.value = true
  e.preventDefault()
  
  const onMove = (moveEvent) => {
    if (!isDragging.value || !audioPlayer.value || !duration.value) return
    
    const progressWrapper = document.querySelector('.progress-wrapper')
    if (!progressWrapper) return
    
    const rect = progressWrapper.getBoundingClientRect()
    const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX
    let percent = (clientX - rect.left) / rect.width
    percent = Math.max(0, Math.min(1, percent))
    
    const newTime = percent * duration.value
    audioPlayer.value.currentTime = newTime
    musicStore.setCurrentTime(newTime)
  }
  
  const onEnd = () => {
    isDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
  }
  
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchmove', onMove)
  document.addEventListener('touchend', onEnd)
}

const handleVolumeClick = (e) => {
  const rect = e.currentTarget.getBoundingClientRect()
  const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
  musicStore.setVolume(percent)
  if (audioPlayer.value) {
    audioPlayer.value.volume = percent / 100
  }
}

const startVolumeDrag = (e) => {
  isVolumeDragging.value = true
  e.preventDefault()
  
  const onMove = (moveEvent) => {
    if (!isVolumeDragging.value) return
    
    const volumeWrapper = document.querySelector('.volume-wrapper')
    if (!volumeWrapper) return
    
    const rect = volumeWrapper.getBoundingClientRect()
    const clientX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX
    let percent = ((clientX - rect.left) / rect.width) * 100
    percent = Math.max(0, Math.min(100, percent))
    
    musicStore.setVolume(percent)
    if (audioPlayer.value) {
      audioPlayer.value.volume = percent / 100
    }
  }
  
  const onEnd = () => {
    isVolumeDragging.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onEnd)
    document.removeEventListener('touchmove', onMove)
    document.removeEventListener('touchend', onEnd)
  }
  
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onEnd)
  document.addEventListener('touchmove', onMove)
  document.addEventListener('touchend', onEnd)
}

const toggleMute = () => {
  if (volume.value === 0) {
    musicStore.setVolume(lastVolume.value || 50)
  } else {
    lastVolume.value = volume.value
    musicStore.setVolume(0)
  }
  if (audioPlayer.value) {
    audioPlayer.value.volume = volume.value / 100
  }
}

const handleSearch = () => {
  // 搜索逻辑已在 computed 中处理
}

const handleImageError = (event, songId) => {
  event.target.style.display = 'none'
  if (musicStore.coverBlobUrlCache[songId]) {
    delete musicStore.coverBlobUrlCache[songId]
  }
}

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatDuration = (seconds) => {
  return formatTime(seconds)
}

// 下载歌曲
const downloadSong = async (song) => {
  if (!song) return
  
  try {
    // 请求音频文件
    const response = await request.get(`/music/play/${song.id}`, {
      responseType: 'blob'
    })
    
    // 创建下载链接
    const blob = new Blob([response.data], { type: 'audio/mpeg' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 获取文件扩展名
    const filePath = song.file_path || ''
    const ext = filePath.split('.').pop() || 'mp3'
    link.download = `${song.title}.${ext}`
    
    // 触发下载
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 清理 URL
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载歌曲失败:', error)
  }
}

// 解析 LRC 格式歌词
const parseLRC = (lrcText) => {
  if (!lrcText || !lrcText.trim()) {
    return []
  }
  
  const lines = lrcText.split('\n')
  const lyrics = []
  
  // LRC 时间戳正则: [mm:ss.ff] 或 [mm:ss:ff]
  const timeRegex = /\[(\d{2}):(\d{2})[\.:](\d{2})\]/g
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine) continue
    
    // 匹配所有时间戳
    const timeMatches = [...trimmedLine.matchAll(timeRegex)]
    if (timeMatches.length === 0) continue
    
    // 获取歌词文本（移除所有时间戳）
    let text = trimmedLine.replace(timeRegex, '').trim()
    if (!text) continue
    
    // 为每个时间戳创建一条歌词
    for (const match of timeMatches) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const centiseconds = parseInt(match[3], 10)
      const time = minutes * 60 + seconds + centiseconds / 100
      
      lyrics.push({
        time: time,
        text: text,
        isActive: false
      })
    }
  }
  
  // 按时间排序
  lyrics.sort((a, b) => a.time - b.time)
  
  return lyrics
}

// 切换歌词显示
const toggleLyrics = () => {
  showLyrics.value = !showLyrics.value
  // 切换到歌词状态时，如果当前歌曲没有歌词，则获取
  if (showLyrics.value && !lyricsText.value && currentSong.value) {
    fetchLyrics()
  }
}

// 获取歌词
const fetchLyrics = async () => {
  if (!currentSong.value) return
  
  lyricsLoading.value = true
  lyricsError.value = false
  
  try {
    const response = await request.get(`/music/lyrics/${currentSong.value.id}`)
    if (response.data && response.data.success && response.data.lyrics) {
      lyricsText.value = response.data.lyrics
      parsedLyrics.value = parseLRC(response.data.lyrics)
    } else {
      lyricsError.value = true
      parsedLyrics.value = []
    }
  } catch (error) {
    console.error('获取歌词失败:', error)
    lyricsError.value = true
    parsedLyrics.value = []
  } finally {
    lyricsLoading.value = false
  }
}

// 从指定时间点开始播放
const playFromTime = (time) => {
  if (!audioPlayer.value || !currentSong.value) return
  
  // 设置播放时间
  audioPlayer.value.currentTime = time
  musicStore.setCurrentTime(time)
  
  // 重置滚动状态，允许自动滚动到新位置
  isUserScrolling.value = false
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
  
  // 如果当前没有播放，则开始播放
  if (!isPlaying.value) {
    audioPlayer.value.play()
      .then(() => {
        musicStore.setIsPlaying(true)
      })
      .catch(err => {
        console.error('播放失败:', err)
        ElMessage.error('播放失败')
      })
  }
}

// 处理歌词容器滚动事件
const handleLyricsScroll = () => {
  // 标记用户正在手动滚动
  isUserScrolling.value = true
  
  // 清除之前的定时器
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
  
  // 2秒后认为用户停止滚动，恢复自动滚动
  scrollTimeout.value = setTimeout(() => {
    isUserScrolling.value = false
  }, 2000)
}

// 处理歌词区域点击事件（点击空白区域切换回图片）
const handleLyricsAreaClick = (event) => {
  // 如果点击的不是歌词行，则切换回图片
  const target = event.target
  const isClickingLyricsLine = target.closest('.lyrics-line')
  
  // 如果点击的不是歌词行（比如点击容器空白区域），则切换
  if (!isClickingLyricsLine) {
    toggleLyrics()
  }
}

// 根据当前播放时间高亮歌词
const updateLyricsHighlight = () => {
  if (!showLyrics.value || parsedLyrics.value.length === 0) return
  
  const current = currentTime.value
  let activeIndex = -1
  
  // 找到当前应该高亮的歌词行
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (current >= parsedLyrics.value[i].time) {
      activeIndex = i
      break
    }
  }
  
  // 更新高亮状态
  parsedLyrics.value.forEach((line, index) => {
    line.isActive = index === activeIndex
  })
  
  // 只有在用户没有手动滚动时才自动滚动到中心
  if (!isUserScrolling.value && activeIndex >= 0 && lyricsLineRefs.value[activeIndex]) {
    const activeElement = lyricsLineRefs.value[activeIndex]
    const container = lyricsContainer.value
    if (container && activeElement) {
      // 获取元素相对于容器的位置
      const elementTop = activeElement.offsetTop
      const elementHeight = activeElement.offsetHeight
      const containerHeight = container.clientHeight
      
      // 计算目标滚动位置：让元素中心对齐容器中心
      const targetScrollTop = elementTop - (containerHeight / 2) + (elementHeight / 2)
      
      // 获取当前滚动位置
      const currentScrollTop = container.scrollTop
      
      // 如果当前滚动位置与目标位置差距较大（超过5px），才进行滚动
      // 这样可以避免频繁的微小滚动，同时确保歌词始终在中心
      if (Math.abs(currentScrollTop - targetScrollTop) > 5) {
        container.scrollTo({
          top: Math.max(0, targetScrollTop), // 确保不滚动到负值
          behavior: 'smooth'
        })
      }
    }
  }
}

const refreshSongCovers = async () => {
  const updatedSongs = await Promise.all(
    musicStore.songs.map(async (song) => {
      const cached = musicStore.getCoverCache(song.id)
      if (cached) {
        return { ...song, coverBlobUrl: cached }
      }
      let coverBlobUrl = ''
      if (song.cover_image) {
        coverBlobUrl = await getCoverBlobUrl(song.cover_image, song.id)
      }
      return { ...song, coverBlobUrl }
    })
  )
  musicStore.setSongs(updatedSongs)

  if (musicStore.currentSong) {
    const updatedCurrentSong = updatedSongs.find(s => s.id === musicStore.currentSong.id)
    if (updatedCurrentSong) {
      musicStore.setCurrentSong(updatedCurrentSong)
    }
  }
}

onMounted(async () => {
  if (musicStore.songs.length > 0) {
    await refreshSongCovers()
  } else {
    await fetchSongs()
  }

  window.addEventListener('music-next-song', handleNextSongEvent)

  if (musicStore.audioPlayer) {
    musicStore.audioPlayer.volume = musicStore.volume / 100
  }
})

onUnmounted(() => {
  window.removeEventListener('music-next-song', handleNextSongEvent)
  // 清理滚动定时器
  if (scrollTimeout.value) {
    clearTimeout(scrollTimeout.value)
  }
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.music-player-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 100%;
  width: 100%;
  background: #0a0e27;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  pointer-events: none;
}

.bg-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
  animation: float 20s infinite ease-in-out;
}

.bg-circle-1 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  top: -250px;
  left: -250px;
  animation-delay: 0s;
}

.bg-circle-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  bottom: -200px;
  right: -200px;
  animation-delay: -7s;
}

.bg-circle-3 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  top: 50%;
  right: -175px;
  animation-delay: -14s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

.music-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 32px 32px 24px 32px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.music-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-icon {
  font-size: 28px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.search-input {
  width: 350px;
}

.search-input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: none;
}

.search-input :deep(.el-input__inner) {
  color: #fff;
}

.search-input :deep(.el-input__inner)::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.music-content {
  display: flex;
  gap: 32px;
  flex: 1;
  min-height: 0;
  position: relative;
  z-index: 1;
  padding: 0 32px 32px 32px;
}

/* 歌曲列表面板 */
.song-list-panel {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.song-list-panel::-webkit-scrollbar {
  width: 8px;
}

.song-list-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.song-list-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.song-list-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #fff;
}

.song-count {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

/* 加载进度条 */
.loading-progress {
  height: 3px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-bottom: 16px;
  overflow: hidden;
}

.loading-progress .progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.song-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.song-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(8px);
  border-color: rgba(255, 255, 255, 0.1);
}

.song-item.active {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
  border-color: rgba(102, 126, 234, 0.5);
}

.song-item.playing {
  animation: playing-glow 2s infinite;
}

@keyframes playing-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(102, 126, 234, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(102, 126, 234, 0.5);
  }
}

.song-index {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}

.song-item.active .song-index {
  color: #667eea;
}

.song-cover {
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.song-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.cover-icon {
  font-size: 24px;
  font-style: normal;
}

.play-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s;
}

.playing-icon {
  font-style: normal;
  color: #fff;
  font-size: 20px;
  animation: pulse 1s infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-title {
  font-weight: 600;
  font-size: 15px;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
}

.song-artist {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.song-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.song-duration {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
}

.download-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.5);
  transition: all 0.3s ease;
  opacity: 0;
}

.song-item:hover .download-icon {
  opacity: 1;
}

.download-icon:hover {
  color: #4a9eff;
  transform: scale(1.1);
}

.download-svg {
  width: 18px;
  height: 18px;
  display: block;
}

/* 播放器面板 */
.player-panel {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  overflow-y: auto;
  overflow-x: hidden;
}

.player-panel::-webkit-scrollbar {
  width: 8px;
}

.player-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.player-panel::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.player-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.current-song-display {
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  flex: 1;
  width: 100%;
  min-height: 0;
}

.cover-wrapper {
  position: relative;
  margin-bottom: 20px;
}

.cover-display {
  width: 220px;
  height: 220px;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  position: relative;
  cursor: pointer;
  transition: transform 0.3s;
}

.cover-display:hover {
  transform: scale(1.02);
}

.clickable-cover {
  cursor: pointer;
}

.cover-display.spinning {
  animation: spin 20s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.large-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.default-large-cover {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.large-icon {
  font-size: 100px;
  font-style: normal;
}

/* 歌词显示 - 占据整个宽度 */
.lyrics-display-full {
  width: 100%;
  flex: 1;
  min-height: 0;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
  position: relative;
  background-image: url('/background/default.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}

.lyrics-display-full::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 0;
}

.lyrics-display-full > * {
  position: relative;
  z-index: 1;
}

.lyrics-display-full:hover {
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.6);
}

.lyrics-container {
  width: 100%;
  flex: 1;
  overflow-y: auto;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
  scroll-behavior: smooth;
  min-height: 0;
}

.lyrics-container::-webkit-scrollbar {
  width: 4px;
}

.lyrics-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}

.lyrics-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}

.lyrics-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.lyrics-line {
  font-size: 16px;
  line-height: 2.2;
  color: rgba(255, 255, 255, 0.6);
  margin: 8px 0;
  transition: all 0.3s ease;
  padding: 8px 16px;
  border-radius: 8px;
  max-width: 90%;
  word-wrap: break-word;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  position: relative;
  cursor: pointer;
}

.lyrics-line:hover {
  background: rgba(255, 255, 255, 0.05);
}

.lyrics-line.active {
  color: #4a9eff;
  font-size: 20px;
  font-weight: 600;
  background: rgba(74, 158, 255, 0.15);
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.3);
}

.lyrics-text {
  flex: 1;
  text-align: center;
  order: 2;
}

.lyrics-play-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.3s ease;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  order: 1;
  position: relative;
  z-index: 10;
}

.lyrics-line:hover .lyrics-play-icon {
  opacity: 1;
}

.lyrics-play-icon:hover {
  color: #4a9eff;
  background: rgba(74, 158, 255, 0.3);
  transform: scale(1.15);
}

.lyrics-play-icon:active {
  transform: scale(1.05);
}

.play-icon-svg {
  width: 14px;
  height: 14px;
  display: block;
}


.lyrics-loading,
.lyrics-error {
  color: rgba(255, 255, 255, 0.5);
  font-size: 16px;
  text-align: center;
  padding: 40px 20px;
  width: 100%;
}

/* 音波效果 */
.sound-wave {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  align-items: flex-end;
  height: 30px;
}

.wave-bar {
  width: 4px;
  background: linear-gradient(to top, #667eea, #764ba2);
  border-radius: 2px;
  animation: wave 1s infinite ease-in-out;
}

.wave-bar:nth-child(1) {
  animation-delay: 0s;
}

.wave-bar:nth-child(2) {
  animation-delay: 0.1s;
}

.wave-bar:nth-child(3) {
  animation-delay: 0.2s;
}

.wave-bar:nth-child(4) {
  animation-delay: 0.3s;
}

@keyframes wave {
  0%, 100% {
    height: 10px;
  }
  50% {
    height: 30px;
  }
}

.song-details {
  margin-top: 16px;
}

.current-title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 8px 0;
  color: #fff;
}

.current-artist {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 4px 0;
}

.current-album {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0;
}

.empty-player {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 16px;
  opacity: 0.3;
}

.empty-text {
  font-size: 16px;
  margin: 0;
}

/* 播放器控制 */
.player-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
  margin-top: auto;
  padding-top: 16px;
}

.progress-bar-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.time-display {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.7);
  min-width: 45px;
  text-align: center;
  font-weight: 500;
}

.progress-wrapper {
  flex: 1;
  height: 40px;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 10px 0;
}

.progress-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  position: relative;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 3px;
  transition: width 0.1s linear;
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 20px;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3));
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.2s;
}

.progress-thumb:hover {
  transform: translate(-50%, -50%) scale(1.2);
}

.progress-thumb:active {
  transform: translate(-50%, -50%) scale(1.3);
}

.control-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 10;
}

.control-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0;
  position: relative;
  overflow: visible;
}

.control-btn svg {
  width: 24px;
  height: 24px;
  display: block;
}

.control-btn svg path {
  fill: #ffffff;
}

.control-btn .control-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.control-btn .control-icon path {
  fill: #ffffff;
}

.control-btn .mode-icon {
  width: 20px;
  height: 20px;
  display: block;
}

.control-btn .mode-icon path {
  fill: #ffffff;
}

.control-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.control-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.control-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-mode {
  width: 48px;
  height: 48px;
}

.btn-mode:hover:not(:disabled) {
  background: rgba(102, 126, 234, 0.3);
}

.btn-play {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
}

.btn-play svg {
  width: 32px;
  height: 32px;
}

.btn-play svg path {
  fill: #ffffff;
}

.btn-play:hover:not(:disabled) {
  background: linear-gradient(135deg, #7d8ff0 0%, #8b5fb8 100%);
  box-shadow: 0 12px 32px rgba(102, 126, 234, 0.6);
  transform: scale(1.1);
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 16px;
  justify-content: center;
}

.volume-icon {
  font-size: 22px;
  cursor: pointer;
  transition: transform 0.2s;
  user-select: none;
}

.volume-icon:hover {
  transform: scale(1.1);
}

.volume-wrapper {
  width: 150px;
  height: 40px;
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 10px 0;
}

.volume-track {
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  position: relative;
}

.volume-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 2px;
  transition: width 0.1s linear;
}

.volume-thumb {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px;
  height: 12px;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: transform 0.2s;
}

.volume-thumb:hover {
  transform: translate(-50%, -50%) scale(1.3);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .music-content {
    flex-direction: column;
  }

  .song-list-panel {
    flex: none;
    max-height: 300px;
  }

  .player-panel {
    flex: 1;
    min-height: 400px;
  }

  .cover-display {
    width: 200px;
    height: 200px;
  }
}

@media (max-width: 768px) {
  .music-player-container {
    padding: 16px;
  }

  .music-header {
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .search-input {
    width: 100%;
  }

  .music-content {
    gap: 16px;
  }

  .cover-display {
    width: 200px;
    height: 200px;
  }

  .current-title {
    font-size: 22px;
  }

  .current-artist {
    font-size: 16px;
  }

  .control-buttons {
    gap: 16px;
  }

  .control-btn {
    width: 48px;
    height: 48px;
  }

  .btn-play {
    width: 60px;
    height: 60px;
  }

  .song-item {
    padding: 10px 12px;
  }

  .song-cover {
    width: 48px;
    height: 48px;
  }
}
</style>