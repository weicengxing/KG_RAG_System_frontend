import { createRouter, createWebHistory } from 'vue-router'

const LoginView = () => import('../views/LoginView.vue')
const ForgotPasswordView = () => import('../views/ForgotPasswordView.vue')
const MainLayout = () => import('../layouts/MainLayout.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const ProfileView = () => import('../views/ProfileView.vue')
const AccountSettingsView = () => import('../views/AccountSettingsView.vue')
const SecurityPrivacyView = () => import('../views/SecurityPrivacyView.vue')
const NovelSimpleView = () => import('../views/NovelSimple.vue')
const MusicPlayerViewSimple = () => import('../views/MusicPlayerView_simple.vue')
const MusicRankingsView = () => import('../views/MusicRankingsView.vue')
const NovelUploadView = () => import('../views/NovelUploadView.vue')
const ChatRoomView = () => import('../views/ChatRoomView.vue')
const KnowledgeGraphView = () => import('../views/KnowledgeGraphView.vue')
const GameView = () => import('../views/GameView.vue')
const DualFighterView = () => import('../views/DualFighterView.vue')
const PlantsVsZombiesView = () => import('../views/PlantsVsZombiesView.vue')
const PlantSelectionView = () => import('../views/PlantSelectionView.vue')
const ZombieSelectionView = () => import('../views/ZombieSelectionView.vue')
const PvZMultiplayerRoomView = () => import('../views/PvZMultiplayerRoomView.vue')
const PlantsVsZombiesMultiplayer = () => import('../views/PlantsVsZombiesMultiplayer.vue')
const ClaudeWebChatView = () => import('../views/ClaudeWebChatView.vue')

const routes = [
  // 无需登录的页面
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/forgot-password', name: 'ForgotPassword', component: ForgotPasswordView },

  // 需要登录的页面（使用 MainLayout 布局）
  {
    path: '/',
    component: MainLayout,
    redirect: '/dashboard',
    children: [
      { path: 'dashboard', name: 'Dashboard', component: DashboardView },
      { path: 'novel', name: 'NovelSimple', component: NovelSimpleView },
      { path: 'music', name: 'MusicPlayer', component: MusicPlayerViewSimple },
      { path: 'music-rankings', name: 'MusicRankings', component: MusicRankingsView },
      { path: 'profile', name: 'Profile', component: ProfileView },
      { path: 'account-settings', name: 'AccountSettings', component: AccountSettingsView },
      { path: 'security-privacy', name: 'SecurityPrivacy', component: SecurityPrivacyView },
      { path: 'novel-upload', name: 'NovelUpload', component: NovelUploadView },
      { path: 'chat-room', name: 'ChatRoom', component: ChatRoomView },
      { path: 'claude-web-chat', name: 'ClaudeWebChat', component: ClaudeWebChatView },
      { path: 'knowledge-graph', name: 'KnowledgeGraph', component: KnowledgeGraphView },
      { path: 'game', name: 'Game', component: GameView },
      { path: 'dual-fighter', name: 'DualFighter', component: DualFighterView },
      { path: 'plants-vs-zombies', name: 'PlantsVsZombies', component: PlantsVsZombiesView },
      { path: 'plant-selection', name: 'PlantSelection', component: PlantSelectionView },
      { path: 'zombie-selection/:roomId/:userId?', name: 'ZombieSelection', component: ZombieSelectionView },
      { path: 'pvz-multiplayer-room', name: 'PvZMultiplayerRoom', component: PvZMultiplayerRoomView },
      { path: 'pvz-multiplayer/:roomId/:userId?', name: 'PlantsVsZombiesMultiplayer', component: PlantsVsZombiesMultiplayer }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫：没登录就踢回登录页
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  // 登录页和忘记密码页不需要登录
  if ((to.name !== 'Login' && to.name !== 'ForgotPassword') && !token) {
    next({ name: 'Login' })
  } else {
    next()
  }
})

export default router
