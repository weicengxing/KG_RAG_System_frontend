import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMusicStore = defineStore('music', () => {
  // 播放器状态
  const currentSong = ref(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(50)
  const songs = ref([])
  const currentBlobUrl = ref(null)

  // 播放模式: 'sequence' 顺序播放, 'loop' 循环播放, 'random' 随机播放
  const playMode = ref('sequence')

  // 封面图片缓存（全局持久化，避免重复请求）
  const coverBlobUrlCache = ref({})

  // 音频元素引用（将在 MainLayout 中设置）
  const audioPlayer = ref(null)

  const setAudioPlayer = (player) => {
    audioPlayer.value = player
  }

  const setCurrentSong = (song) => {
    currentSong.value = song
  }

  const setIsPlaying = (playing) => {
    isPlaying.value = playing
  }

  const setCurrentTime = (time) => {
    currentTime.value = time
  }

  const setDuration = (dur) => {
    duration.value = dur
  }

  const setVolume = (vol) => {
    volume.value = vol
    if (audioPlayer.value) {
      audioPlayer.value.volume = vol / 100
    }
  }

  const setSongs = (songList) => {
    songs.value = songList
  }

  const setCurrentBlobUrl = (url) => {
    // 清理之前的 blob URL
    if (currentBlobUrl.value) {
      URL.revokeObjectURL(currentBlobUrl.value)
    }
    currentBlobUrl.value = url
  }

  const clearBlobUrl = () => {
    if (currentBlobUrl.value) {
      URL.revokeObjectURL(currentBlobUrl.value)
      currentBlobUrl.value = null
    }
  }

  const setPlayMode = (mode) => {
    playMode.value = mode
  }

  // 切换播放模式
  const togglePlayMode = () => {
    const modes = ['sequence', 'loop', 'random']
    const currentIndex = modes.indexOf(playMode.value)
    playMode.value = modes[(currentIndex + 1) % modes.length]
    return playMode.value
  }

  // 设置封面缓存
  const setCoverCache = (songId, blobUrl) => {
    coverBlobUrlCache.value[songId] = blobUrl
  }

  // 获取封面缓存
  const getCoverCache = (songId) => {
    return coverBlobUrlCache.value[songId] || null
  }

  return {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    songs,
    currentBlobUrl,
    audioPlayer,
    playMode,
    coverBlobUrlCache,
    setAudioPlayer,
    setCurrentSong,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    setVolume,
    setSongs,
    setCurrentBlobUrl,
    clearBlobUrl,
    setPlayMode,
    togglePlayMode,
    setCoverCache,
    getCoverCache
  }
})




