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
        <button class="rankings-btn" @click="goToRankings" title="查看排行榜">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/>
          </svg>
          排行榜
        </button>
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
            :data-id="song.id"
            :data-loaded="!!song.coverBlobUrl"
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../utils/request'
import { useMusicStore } from '../stores/music'

const musicStore = useMusicStore()

// --- 状态定义 ---
const searchQuery = ref('')
const isDragging = ref(false)
const isVolumeDragging = ref(false)
const lastVolume = ref(50)

// 歌词相关
const showLyrics = ref(false)
const lyricsText = ref('')
const parsedLyrics = ref([])
const lyricsLoading = ref(false)
const lyricsError = ref(false)
const lyricsContainer = ref(null)
const lyricsLineRefs = ref({})
const isUserScrolling = ref(false)
const scrollTimeout = ref(null)

// 滚动控制变量 
const lastActiveIndex = ref(-1) // 记录上一行歌词索引
const isAutoScrolling = ref(false) // 标记是否正在自动滚动
let autoScrollTimer = null // 自动滚动锁定计时器
//在上一版代码中，当代码触发滚动时，浏览器会连续触发几十次 scroll 事件。 handleLyricsScroll 在第一次收到事件时就把“自动滚动锁”解开了，导致后续的几十次滚动事件被误判为“用户正在手动滚动”，从而立即打断了后续的歌词跟随。
//我们给自动滚动加一个时间锁，在滚动动画结束前，坚决不认为是用户在操作。

// 歌曲列表相关
const isLoadingSongs = ref(false)
const totalSongs = ref(0)
const songListRef = ref(null)

// ES搜索相关
const isSearching = ref(false)
const searchResults = ref([])
const usingESSearch = ref(false)

// --- Store 映射 ---
const songs = computed(() => musicStore.songs)
const currentSong = computed(() => musicStore.currentSong)
const isPlaying = computed(() => musicStore.isPlaying)
const currentTime = computed(() => musicStore.currentTime)
const duration = computed(() => musicStore.duration)
const playMode = computed(() => musicStore.playMode)
const bgImage = computed(() => {
  return '/background/default.jpg'
})
const volume = computed({
  get: () => musicStore.volume,
  set: (val) => musicStore.setVolume(val)
})
const audioPlayer = computed(() => musicStore.audioPlayer)

// --- 计算属性 ---
const playModeTitle = computed(() => {
  const map = { sequence: '顺序播放', loop: '循环播放', random: '随机播放' }
  return map[playMode.value] || '顺序播放'
})

const progressPercent = computed(() => {
  if (!duration.value) return 0
  return (currentTime.value / duration.value) * 100
})

const filteredSongs = computed(() => {
  // 如果正在使用ES搜索且有搜索结果，返回ES搜索结果
  if (usingESSearch.value && searchResults.value.length > 0) {
    return searchResults.value
  }
  
  // 如果没有搜索词汇，返回所有歌曲
  if (!searchQuery.value.trim()) {
    usingESSearch.value = false
    return songs.value
  }
  
  // 否则使用前端过滤
  usingESSearch.value = false
  const query = searchQuery.value.toLowerCase()
  return songs.value.filter(song => 
    song.title.toLowerCase().includes(query) ||
    (song.artist && song.artist.toLowerCase().includes(query))
  )
})
const loadedCount = computed(() => songs.value.length)

// ==========================================
// 逻辑 1：静态资源路径处理
// ==========================================
const getStaticImageUrl = (filename) => {
  if (!filename) return '' 
  return `/images/${encodeURIComponent(filename)}`
}

const getStaticAudioUrl = (song) => {
  if (!song) return ''
  let filename = ''
  if (song.file_path) {
    filename = song.file_path.split(/[/\\]/).pop() 
  } else {
    filename = `${song.title}.mp3`
  }
  return `/music/${encodeURIComponent(filename)}`
}

// ==========================================
// 逻辑 2：图片懒加载
// ==========================================
let observer = null

const initIntersectionObserver = () => {
  if (observer) observer.disconnect()
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const songId = Number(entry.target.dataset.id)
        const song = musicStore.songs.find(s => s.id === songId)
        if (song && song.cover_image && !song.coverBlobUrl) {
           song.coverBlobUrl = getStaticImageUrl(song.cover_image)
           observer.unobserve(entry.target)
        }
      }
    })
  }, {
    root: songListRef.value,
    rootMargin: '200px 0px',
    threshold: 0.01
  })
}

const observeSongItems = () => {
  if (!observer || !songListRef.value) return
  const items = songListRef.value.querySelectorAll('.song-item')
  items.forEach(item => {
    if (item.dataset.loaded !== 'true') {
      observer.observe(item)
    }
  })
}

// ==========================================
// 逻辑 3：获取列表
// ==========================================
const fetchSongs = async () => {
  isLoadingSongs.value = true
  try {
    const response = await request.get('/api/music/songs/all')
    if (response.data && response.data.success) {
      const rawSongs = response.data.songs
      totalSongs.value = response.data.total
      
      const processedSongs = rawSongs.map(song => ({
        ...song,
        coverBlobUrl: '', 
        audioSrc: getStaticAudioUrl(song)
      }))
      
      musicStore.setSongs(processedSongs)
      if (processedSongs.length > 0 && !musicStore.currentSong) {
        selectSong(processedSongs[0], false)
      }

      nextTick(() => {
        initIntersectionObserver()
        observeSongItems()
      })
    }
  } catch (error) {
    console.error('获取列表失败:', error)
    ElMessage.error('获取列表失败')
  } finally {
    isLoadingSongs.value = false
  }
}

// ==========================================
// 逻辑 4：播放控制
// ==========================================
const sendPlayEvent = async (songId) => {
  try {
    await request.post('/api/music/play-event', {
      song_id: songId,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('❌ 发送播放事件失败:', error)
  }
}

const selectSong = async (song, autoPlay = true) => {
  if (!musicStore.audioPlayer) return

  try {
    if (musicStore.isPlaying) musicStore.audioPlayer.pause()
    musicStore.setCurrentSong(song)
    musicStore.setIsPlaying(false)
    resetLyrics()

    const targetUrl = song.audioSrc || getStaticAudioUrl(song)
    musicStore.setCurrentBlobUrl(targetUrl)
    musicStore.audioPlayer.src = targetUrl
    musicStore.audioPlayer.volume = musicStore.volume / 100
    musicStore.audioPlayer.load()

    if (autoPlay) {
      const playPromise = musicStore.audioPlayer.play()
      if (playPromise) {
        playPromise
          .then(() => {
            sendPlayEvent(song.id)
            musicStore.setIsPlaying(true)
          })
          .catch(e => {
            console.warn('自动播放受阻:', e)
            musicStore.setIsPlaying(false)
          })
      }
    } else {
      sendPlayEvent(song.id)
    }
    
    if (showLyrics.value) fetchLyrics()
    if (song.cover_image && !song.coverBlobUrl) {
      song.coverBlobUrl = getStaticImageUrl(song.cover_image)
    }

  } catch (error) {
    console.error('播放流程错误:', error)
    ElMessage.error('无法播放')
  }
}

// ==========================================
// 辅助逻辑
// ==========================================
const togglePlay = () => {
  if (!currentSong.value || !audioPlayer.value) return
  if (isPlaying.value) {
    audioPlayer.value.pause()
    musicStore.setIsPlaying(false)
  } else {
    audioPlayer.value.play().catch(e => console.error(e))
    musicStore.setIsPlaying(true)
  }
}

const cyclePlayMode = () => {
  const newMode = musicStore.togglePlayMode()
  const modeNames = { 'sequence': '顺序播放', 'loop': '循环播放', 'random': '随机播放' }
  ElMessage.success(`已切换为${modeNames[newMode]}`)
}

const handleSongEnded = () => {
  musicStore.setIsPlaying(false)
  if (playMode.value === 'loop') {
    audioPlayer.value.currentTime = 0
    audioPlayer.value.play().then(() => musicStore.setIsPlaying(true))
  } else if (playMode.value === 'random') {
    playRandomSong()
  } else {
    playNextInSequence()
  }
}

const playRandomSong = () => {
  const len = musicStore.songs.length; if(!len) return
  selectSong(musicStore.songs[Math.floor(Math.random()*len)], true)
}
const playNextInSequence = () => {
  if(!songs.value.length) return
  const next = (songs.value.findIndex(s=>s.id===currentSong.value?.id)+1)%songs.value.length
  selectSong(songs.value[next], true)
}
const previousSong = () => {
  if(!songs.value.length) return
  const len = songs.value.length
  const prev = (songs.value.findIndex(s=>s.id===currentSong.value?.id)-1+len)%len
  selectSong(songs.value[prev], true)
}
const nextSong = () => playNextInSequence()

// 歌词解析
const parseLRC = (lrc) => {
  if (!lrc) return []
  const reg = /\[(\d{2}):(\d{2})[\.:](\d{2})\]/g, res = []
  lrc.split('\n').forEach(l => {
    const m = [...l.matchAll(reg)], txt = l.replace(reg,'').trim()
    if(txt && m.length) m.forEach(t => res.push({time: parseInt(t[1])*60+parseInt(t[2])+parseInt(t[3])/100, text:txt, isActive:false}))
  })
  return res.sort((a,b)=>a.time-b.time)
}

const resetLyrics = () => { 
  lyricsText.value = ''
  parsedLyrics.value = []
  lyricsError.value = false
  lyricsLineRefs.value = {} // 清空引用
  lastActiveIndex.value = -1 // 重置索引
  isAutoScrolling.value = false
  if (lyricsContainer.value) {
    lyricsContainer.value.scrollTop = 0
  }
}

const toggleLyrics = () => { showLyrics.value=!showLyrics.value; if(showLyrics.value && !lyricsText.value && currentSong.value) fetchLyrics() }
const fetchLyrics = async () => {
  if(!currentSong.value) return; lyricsLoading.value=true
  try {
    const r = await request.get(`/api/music/lyrics/${currentSong.value.id}`)
    if(r.data.success) { lyricsText.value=r.data.lyrics; parsedLyrics.value=parseLRC(r.data.lyrics) }
    else lyricsError.value=true
  } catch { lyricsError.value=true } finally { lyricsLoading.value=false }
}

// *** 核心修复：更强健的歌词高亮与滚动 ***
const updateLyricsHighlight = () => {
  if (!showLyrics.value || !parsedLyrics.value.length) return
  
  const cur = currentTime.value
  let idx = -1
  
  // 查找当前播放行
  for (let i = parsedLyrics.value.length - 1; i >= 0; i--) {
    if (cur >= parsedLyrics.value[i].time) {
      idx = i
      break
    }
  }

  // 1. 实时更新高亮
  parsedLyrics.value.forEach((l, i) => l.isActive = i === idx)

  // 2. 触发滚动 (仅当行数改变 且 不在用户手动操作中)
  if (idx !== lastActiveIndex.value) {
    lastActiveIndex.value = idx 
    
    if (idx >= 0 && lyricsLineRefs.value[idx] && !isUserScrolling.value) {
      const el = lyricsLineRefs.value[idx]
      const container = lyricsContainer.value
      
      if (container) {
        const targetTop = el.offsetTop - container.clientHeight / 2 + el.offsetHeight / 2
        
        // 关键修复：开启自动滚动锁，并设置超时释放
        // 浏览器平滑滚动会持续几百毫秒，这期间会不断触发 scroll 事件
        // 我们必须在此期间保持锁定，否则第一个 scroll 事件就会解锁导致卡顿
        isAutoScrolling.value = true 
        if (autoScrollTimer) clearTimeout(autoScrollTimer)
        autoScrollTimer = setTimeout(() => {
          isAutoScrolling.value = false
        }, 1000) // 锁定1秒，足够平滑滚动完成

        container.scrollTo({
          top: Math.max(0, targetTop),
          behavior: 'smooth' 
        })
      }
    }
  }
}

// *** 核心修复：处理滚动事件 ***
const handleLyricsScroll = () => { 
  // 如果锁是开着的，说明是代码在滚，直接忽略此次事件
  if (isAutoScrolling.value) {
    return 
  }
  
  // 代码没在滚，那就是用户在滚
  isUserScrolling.value = true
  
  // 防抖：用户停止滚动2秒后，恢复自动跟随
  clearTimeout(scrollTimeout.value)
  scrollTimeout.value = setTimeout(() => {
    isUserScrolling.value = false
  }, 2000) 
}

const handleImageError = (e) => { e.target.style.display='none' }
const formatTime = (s) => !s||isNaN(s)?'0:00':`${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`
const formatDuration = formatTime

const downloadSong = (song) => {
  const link = document.createElement('a')
  link.href = song.audioSrc || getStaticAudioUrl(song)
  link.download = `${song.title}.mp3`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 使用Elasticsearch搜索音乐
const searchMusicWithES = async (query) => {
  if (!query || query.trim().length < 2) {
    usingESSearch.value = false
    searchResults.value = []
    return
  }

  isSearching.value = true
  usingESSearch.value = true
  
  try {
    const response = await request.get('/api/music/search-es', {
      params: {
        query: query.trim(),
        size: 50
      }
    })

    if (response.data && response.data.success) {
      const esSongs = response.data.songs || []
      
      // 为ES搜索结果添加必要字段
      searchResults.value = esSongs.map(song => ({
        ...song,
        coverBlobUrl: song.cover_image ? getStaticImageUrl(song.cover_image) : '',
        audioSrc: getStaticAudioUrl(song)
      }))
      
      // 如果搜索结果为空，提示用户
      if (esSongs.length === 0) {
        ElMessage.info('未找到相关歌曲，将使用本地搜索')
        usingESSearch.value = false
      }
    }
  } catch (error) {
    console.error('ES搜索失败:', error)
    // ES搜索失败，降级到本地搜索
    usingESSearch.value = false
    ElMessage.warning('搜索引擎不可用，使用本地搜索')
  } finally {
    isSearching.value = false
  }
}

const handleSearch = () => {
  // 延迟搜索，避免频繁请求
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  if (!searchQuery.value.trim()) {
    usingESSearch.value = false
    searchResults.value = []
    nextTick(observeSongItems)
    return
  }

  // 500ms后执行ES搜索
  searchTimeout.value = setTimeout(() => {
    searchMusicWithES(searchQuery.value)
    nextTick(observeSongItems)
  }, 500)
}

let searchTimeout = null
const goToRankings = () => { window.location.href = '/music-rankings' }
const playFromTime = (t) => { if(audioPlayer.value){audioPlayer.value.currentTime=t;if(!isPlaying.value)audioPlayer.value.play().then(()=>musicStore.setIsPlaying(true))} }

const handleLyricsAreaClick = (e) => { if(!e.target.closest('.lyrics-line')) toggleLyrics() }
const handleVolumeClick = (e) => { const r=e.currentTarget.getBoundingClientRect(); musicStore.setVolume(Math.max(0,Math.min(100,((e.clientX-r.left)/r.width)*100))); if(audioPlayer.value) audioPlayer.value.volume=volume.value/100 }
const startVolumeDrag = (e) => { isVolumeDragging.value=true; const m=(ev)=>{const c=ev.touches?ev.touches[0].clientX:ev.clientX,r=document.querySelector('.volume-wrapper').getBoundingClientRect();const v=Math.max(0,Math.min(100,((c-r.left)/r.width)*100));musicStore.setVolume(v);if(audioPlayer.value)audioPlayer.value.volume=v/100}; const up=()=>{isVolumeDragging.value=false;document.removeEventListener('mousemove',m);document.removeEventListener('mouseup',up);document.removeEventListener('touchmove',m);document.removeEventListener('touchend',up)}; document.addEventListener('mousemove',m);document.addEventListener('mouseup',up);document.addEventListener('touchmove',m);document.addEventListener('touchend',up) }
const startDrag = (e) => { isDragging.value=true; const m=(ev)=>{const c=ev.touches?ev.touches[0].clientX:ev.clientX,r=document.querySelector('.progress-wrapper').getBoundingClientRect();const t=Math.max(0,Math.min(1,(c-r.left)/r.width))*duration.value;musicStore.setCurrentTime(t);audioPlayer.value.currentTime=t}; const up=()=>{isDragging.value=false;document.removeEventListener('mousemove',m);document.removeEventListener('mouseup',up);document.removeEventListener('touchmove',m);document.removeEventListener('touchend',up)}; document.addEventListener('mousemove',m);document.addEventListener('mouseup',up);document.addEventListener('touchmove',m);document.addEventListener('touchend',up) }
const toggleMute = () => { if(volume.value===0)musicStore.setVolume(lastVolume.value||50);else{lastVolume.value=volume.value;musicStore.setVolume(0)} if(audioPlayer.value)audioPlayer.value.volume=volume.value/100 }
const handleProgressClick = (e) => { const r=e.currentTarget.getBoundingClientRect(),t=((e.clientX-r.left)/r.width)*duration.value; audioPlayer.value.currentTime=t; musicStore.setCurrentTime(t) }
const handleNextSongEvent = (e) => { if(e.detail?.song) selectSong(e.detail.song,true) }
const handleAudioError = () => { musicStore.setIsPlaying(false); ElMessage.error('无法播放/文件不存在') }

watch(()=>musicStore.audioPlayer, p=>{if(p){p.removeEventListener('ended',handleSongEnded);p.removeEventListener('error',handleAudioError);p.addEventListener('ended',handleSongEnded);p.addEventListener('error',handleAudioError);p.volume=volume.value/100}},{immediate:true})
watch(currentTime, updateLyricsHighlight, { flush: 'sync' })

onMounted(async () => {
  window.addEventListener('music-next-song', handleNextSongEvent)
  if(musicStore.audioPlayer) musicStore.audioPlayer.volume = volume.value/100
  if(musicStore.songs.length === 0) await fetchSongs()
  else {
    nextTick(() => {
      initIntersectionObserver()
      observeSongItems()
    })
  }
})

onUnmounted(() => {
  window.removeEventListener('music-next-song', handleNextSongEvent)
  if(scrollTimeout.value) clearTimeout(scrollTimeout.value)
  if(autoScrollTimer) clearTimeout(autoScrollTimer)
  if(observer) observer.disconnect()
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

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
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

/* 排行榜按钮 */
.rankings-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  white-space: nowrap;
}

.rankings-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.rankings-btn:active {
  transform: translateY(0);
}

.rankings-btn svg {
  width: 18px;
  height: 18px;
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
  /* 重要：添加 relative 定位，确保子元素的 offsetTop 计算准确 */
  position: relative; 
  width: 100%;
  flex: 1;
  overflow-y: auto;
  padding: 40px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  text-align: center;
  min-height: 0;
  /* 禁止 CSS 滚动行为，完全交由 JS 控制 */
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
  transition: none !important;
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