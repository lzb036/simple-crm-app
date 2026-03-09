<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import AuthAPI from '@/api/modules/auth'
import { redirectToLogin } from '@/utils/navigation'
import { checkUpdate } from '@/utils/app-update'

const appStore = useAppStore()
const userStore = useUserStore()
const LOGIN_ROUTE = '/pages/login/index'
const HOME_ROUTE = '/pages/index/index'

function getCurrentRoute(): string {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const current = pages[pages.length - 1]
  return current?.route ? `/${current.route}` : ''
}

onLaunch(() => {
  console.log('[App] 应用启动')

  // 初始化应用和用户状态
  appStore.initTheme()
  userStore.initUser()

  const loggedIn = userStore.isLoggedIn()
  const currentRoute = getCurrentRoute()

  // 未登录场景预加载公钥，加快登录页首登速度
  if (!loggedIn) {
    AuthAPI.getPublicKey().catch((error) => {
      console.warn('[app] public key preload failed', error)
    })
  }

  // 登录态路由修正：已登录且当前是登录页时跳转首页
  if (loggedIn) {
    if (!currentRoute || currentRoute === LOGIN_ROUTE) {
      uni.reLaunch({
        url: HOME_ROUTE
      })
    }
  } else {
    redirectToLogin()
  }

  // 延迟检查更新，避免影响应用启动
  setTimeout(() => {
    console.log('[App] 开始检查更新')
    checkUpdate()
  }, 2000)
})

</script>

<template>
</template>

<style>
page {
  background-color: #F4F6F8;
  color: #111827;
  transition: background-color 0.3s ease, color 0.3s ease;
  /* 状态栏高度 */
  --status-bar-height: 44px;
}

page.light {
  background-color: #F4F6F8;
  color: #111827;
}

page.dark {
  background-color: #0B0F19;
  color: #F9FAFB;
}

.light {
  --c-bg: #F4F6F8;
  --c-card: #FFFFFF;
  --c-main: #4F46E5;
  --t-primary: #111827;
  --t-regular: #4B5563;
  --c-border: #F3F4F6;
}

.dark {
  --c-bg: #0B0F19;
  --c-card: #111827;
  --c-main: #6366F1;
  --t-primary: #F9FAFB;
  --t-regular: #9CA3AF;
  --c-border: #1F2937;
}
</style>
