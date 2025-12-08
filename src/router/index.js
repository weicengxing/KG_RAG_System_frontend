import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import ForgotPasswordView from '../views/ForgotPasswordView.vue'
import MainLayout from '../layouts/MainLayout.vue'
import DashboardView from '../views/DashboardView.vue'
import ProfileView from '../views/ProfileView.vue'
import AccountSettingsView from '../views/AccountSettingsView.vue'
import SecurityPrivacyView from '../views/SecurityPrivacyView.vue'
import NovelSimpleView from '../views/NovelSimple.vue'
import MusicPlayerView from '../views/MusicPlayerView.vue'

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
      { path: 'music', name: 'MusicPlayer', component: MusicPlayerView },
      { path: 'profile', name: 'Profile', component: ProfileView },
      { path: 'account-settings', name: 'AccountSettings', component: AccountSettingsView },
      { path: 'security-privacy', name: 'SecurityPrivacy', component: SecurityPrivacyView },
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