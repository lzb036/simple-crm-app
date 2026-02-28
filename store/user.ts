import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { UserInfo } from '@/types/api'
import { isTokenExpired } from '@/utils/token'

// 类型守卫函数
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isUserInfo(value: unknown): value is UserInfo {
  if (value === null || typeof value !== 'object') return false
  const info = value as Record<string, unknown>
  return typeof info.id === 'number' || typeof info.id === 'string'
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>('')
  const userInfo = ref<UserInfo | null>(null)

  const setToken = (newToken: string): void => {
    token.value = newToken
  }

  const setUserInfo = (info: UserInfo | null): void => {
    userInfo.value = info
  }

  const logout = (): void => {
    token.value = ''
    userInfo.value = null
  }

  const isLoggedIn = (): boolean => {
    return !!token.value
  }

  const initUser = (): void => {
    try {
      // 优先读取新key，兼容旧key
      const savedToken = uni.getStorageSync('user_token') || uni.getStorageSync('token')
      const savedUserInfo = uni.getStorageSync('user_info')

      if (isString(savedToken)) {
        if (!isTokenExpired(savedToken)) {
          token.value = savedToken
        } else {
          uni.removeStorageSync('user_token')
          uni.removeStorageSync('token')
        }
      }
      if (isUserInfo(savedUserInfo)) {
        userInfo.value = savedUserInfo
      }
    } catch {
      // 存储读取失败，静默处理
    }
  }

  watch(token, (newToken: string) => {
    try {
      uni.setStorageSync('user_token', newToken)
    } catch {
      // 存储写入失败，静默处理
    }
  })

  watch(userInfo, (newInfo: UserInfo | null) => {
    try {
      uni.setStorageSync('user_info', newInfo)
    } catch {
      // 存储写入失败，静默处理
    }
  })

  return {
    token,
    userInfo,
    setToken,
    setUserInfo,
    logout,
    isLoggedIn,
    initUser
  }
})

// 持久化配置
export const piniaPluginPersistedstate = {
  key: 'user-store',
  paths: ['token', 'userInfo']
}
