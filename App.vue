<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { computed } from 'vue'
import { useAppStore } from '@/store/app'
import { useUserStore } from '@/store/user'
import AuthAPI from '@/api/modules/auth'
import { isTokenExpired } from '@/utils/token'
import { checkUpdate } from '@/utils/app-update'

const appStore = useAppStore()
const userStore = useUserStore()

const themeClass = computed(() => appStore.theme)

onLaunch(() => {
  console.log('[App] 应用启动')

  // 初始化应用和用户状态
  appStore.initTheme()
  userStore.initUser()

  // 预加载公钥
  AuthAPI.getPublicKey().catch((error) => {
    console.warn('[app] public key preload failed', error)
  })

  // 检查登录状态，未登录则跳转到登录页
  const token = uni.getStorageSync('user_token') || uni.getStorageSync('token')
  if (token && !isTokenExpired(token)) {
    uni.reLaunch({
      url: '/pages/index/index'
    })
    return
  }

  if (token) {
    uni.removeStorageSync('user_token')
    uni.removeStorageSync('token')
  }

  uni.reLaunch({
    url: '/pages/login/index'
  })

  // 延迟检查更新，避免影响应用启动
  setTimeout(() => {
    console.log('[App] 开始检查更新')
    checkUpdate()
  }, 2000)
})

onShow(() => {
})

onHide(() => {
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
