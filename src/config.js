const APP_ENV = String(import.meta.env.VITE_APP_ENV || '2')

const trimTrailingSlash = (value) => {
  if (!value || typeof value !== 'string') return ''
  return value.replace(/\/+$/, '')
}

const wsFromHttp = (url) => {
  const normalized = trimTrailingSlash(url)
  if (!normalized) return ''
  if (normalized.startsWith('https://')) return normalized.replace('https://', 'wss://')
  if (normalized.startsWith('http://')) return normalized.replace('http://', 'ws://')
  return normalized
}

const browserOrigin = () => {
  if (typeof window === 'undefined') return ''
  return `${window.location.protocol}//${window.location.host}`
}

const browserWsOrigin = () => {
  if (typeof window === 'undefined') return ''
  return `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
}

const LOCAL_API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_LOCAL_API_BASE_URL || 'http://localhost:8000')
const LOCAL_WS_BASE_URL = trimTrailingSlash(import.meta.env.VITE_LOCAL_WS_BASE_URL || 'ws://localhost:8000')

const PROD_API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_PROD_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  browserOrigin()
)
const PROD_WS_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_PROD_WS_BASE_URL ||
  import.meta.env.VITE_WS_BASE_URL ||
  wsFromHttp(PROD_API_BASE_URL) ||
  browserWsOrigin()
)

const ENV_PROFILES = {
  '1': {
    name: 'local',
    BASE_URL: LOCAL_API_BASE_URL,
    WS_BASE_URL: LOCAL_WS_BASE_URL,
  },
  '2': {
    name: 'production',
    BASE_URL: PROD_API_BASE_URL,
    WS_BASE_URL: PROD_WS_BASE_URL,
  },
}

const activeProfile = ENV_PROFILES[APP_ENV] || ENV_PROFILES['1']

export const API_CONFIG = {
  APP_ENV,
  ENV_NAME: activeProfile.name,
  BASE_URL: activeProfile.BASE_URL,
  WS_BASE_URL: activeProfile.WS_BASE_URL,
}

export const buildWsUrl = (path) => `${API_CONFIG.WS_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
