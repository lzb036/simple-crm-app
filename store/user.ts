import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { UserInfo } from '@/types/api'

const TOKEN_KEY = 'user_token'
const USER_INFO_KEY = 'user_info'
const AUTH_HEADER_KEY = 'authHeader'
const ACCESS_TOKEN_EXPIRE_TIME_KEY = 'access_token_expire_time'
const REFRESH_TOKEN_EXPIRE_TIME_KEY = 'refresh_token_expire_time'
const DEFAULT_AUTH_HEADER = 'X-Service-Authorization'
const TOKEN_EXPIRE_ADVANCE_MS = 30 * 1000

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function parseJwtExpireTime(token: string): number | null {
  try {
    const payloadPart = token.split('.')[1]
    if (!payloadPart || typeof atob !== 'function') return null
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const payload = JSON.parse(atob(padded)) as { exp?: number }
    if (!isNumber(payload.exp)) return null
    return payload.exp * 1000
  } catch {
    return null
  }
}

function isUserInfo(value: unknown): value is UserInfo {
  if (value === null || typeof value !== 'object') return false
  const info = value as Record<string, unknown>
  return typeof info.id === 'number' || typeof info.id === 'string'
}

function parseExpireTime(value: unknown): number | null {
  if (isNumber(value)) return value
  if (isString(value) && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return null
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>('')
  const userInfo = ref<UserInfo | null>(null)
  const accessTokenExpireTime = ref<number | null>(null)
  const refreshTokenExpireTime = ref<number | null>(null)
  const authHeader = ref<string>(DEFAULT_AUTH_HEADER)

  const setToken = (newToken: string): void => {
    setAccessToken({ accessToken: newToken })
  }

  const setAccessToken = (payload: {
    accessToken?: string
    token?: string
    accessTokenExpireTime?: number | null
    refreshTokenExpireTime?: number | null
    header?: string
  }): void => {
    const nextToken = payload.accessToken || payload.token || ''
    const nextHeader = payload.header && isString(payload.header)
      ? payload.header
      : (authHeader.value || DEFAULT_AUTH_HEADER)

    let nextExpireTime: number | null = null
    if (nextToken) {
      if (isNumber(payload.accessTokenExpireTime)) {
        nextExpireTime = payload.accessTokenExpireTime
      } else {
        nextExpireTime = parseJwtExpireTime(nextToken)
      }
    }

    let nextRefreshExpireTime = refreshTokenExpireTime.value
    if (!nextToken) {
      nextRefreshExpireTime = null
    } else if (isNumber(payload.refreshTokenExpireTime)) {
      nextRefreshExpireTime = payload.refreshTokenExpireTime
    } else if (payload.refreshTokenExpireTime === null) {
      nextRefreshExpireTime = null
    }

    token.value = nextToken
    authHeader.value = nextHeader || DEFAULT_AUTH_HEADER
    accessTokenExpireTime.value = nextExpireTime
    refreshTokenExpireTime.value = nextRefreshExpireTime

    try {
      if (nextToken) {
        uni.setStorageSync(TOKEN_KEY, nextToken)
      } else {
        uni.removeStorageSync(TOKEN_KEY)
        uni.removeStorageSync('token')
      }

      if (nextHeader) {
        uni.setStorageSync(AUTH_HEADER_KEY, nextHeader)
      } else {
        uni.setStorageSync(AUTH_HEADER_KEY, DEFAULT_AUTH_HEADER)
      }

      if (isNumber(nextExpireTime)) {
        uni.setStorageSync(ACCESS_TOKEN_EXPIRE_TIME_KEY, nextExpireTime)
      } else {
        uni.removeStorageSync(ACCESS_TOKEN_EXPIRE_TIME_KEY)
      }

      if (isNumber(nextRefreshExpireTime)) {
        uni.setStorageSync(REFRESH_TOKEN_EXPIRE_TIME_KEY, nextRefreshExpireTime)
      } else {
        uni.removeStorageSync(REFRESH_TOKEN_EXPIRE_TIME_KEY)
      }
    } catch {
      // ignore storage errors
    }
  }

  const setUserInfo = (info: UserInfo | null): void => {
    userInfo.value = info
  }

  const clearAuthState = (): void => {
    token.value = ''
    accessTokenExpireTime.value = null
    refreshTokenExpireTime.value = null
    authHeader.value = DEFAULT_AUTH_HEADER

    try {
      uni.removeStorageSync(TOKEN_KEY)
      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
      uni.removeStorageSync(AUTH_HEADER_KEY)
      uni.removeStorageSync(ACCESS_TOKEN_EXPIRE_TIME_KEY)
      uni.removeStorageSync(REFRESH_TOKEN_EXPIRE_TIME_KEY)
    } catch {
      // ignore storage errors
    }
  }

  const logout = (): void => {
    userInfo.value = null
    clearAuthState()

    try {
      uni.removeStorageSync(USER_INFO_KEY)
      uni.removeStorageSync('userInfo')
    } catch {
      // ignore storage errors
    }
  }

  const isLoggedIn = (): boolean => {
    try {
      const savedToken = uni.getStorageSync(TOKEN_KEY) || uni.getStorageSync('token')
      if (isString(savedToken) && savedToken) {
        if (token.value !== savedToken) token.value = savedToken
        return true
      }
    } catch {
      // ignore storage errors
    }
    return !!token.value
  }

  const isAccessTokenExpired = (): boolean => {
    if (!token.value) return true
    if (!accessTokenExpireTime.value) return false
    return Date.now() + TOKEN_EXPIRE_ADVANCE_MS >= accessTokenExpireTime.value
  }

  const initUser = (): void => {
    try {
      const savedToken = uni.getStorageSync(TOKEN_KEY) || uni.getStorageSync('token')
      const savedUserInfo = uni.getStorageSync(USER_INFO_KEY)
      const savedExpireTime = uni.getStorageSync(ACCESS_TOKEN_EXPIRE_TIME_KEY)
      const savedRefreshExpireTime = uni.getStorageSync(REFRESH_TOKEN_EXPIRE_TIME_KEY)
      const savedAuthHeader = uni.getStorageSync(AUTH_HEADER_KEY)

      if (isString(savedToken)) {
        token.value = savedToken
      }
      if (isUserInfo(savedUserInfo)) {
        userInfo.value = savedUserInfo
      }
      accessTokenExpireTime.value = parseExpireTime(savedExpireTime)
      refreshTokenExpireTime.value = parseExpireTime(savedRefreshExpireTime)
      if (isString(savedAuthHeader) && savedAuthHeader) {
        authHeader.value = savedAuthHeader
      } else {
        authHeader.value = DEFAULT_AUTH_HEADER
      }
    } catch {
      // ignore storage errors
    }
  }

  watch(token, (newToken: string) => {
    try {
      if (newToken) {
        uni.setStorageSync(TOKEN_KEY, newToken)
      } else {
        uni.removeStorageSync(TOKEN_KEY)
        uni.removeStorageSync('token')
      }
    } catch {
      // ignore storage errors
    }
  })

  watch(userInfo, (newInfo: UserInfo | null) => {
    try {
      if (newInfo) {
        uni.setStorageSync(USER_INFO_KEY, newInfo)
      } else {
        uni.removeStorageSync(USER_INFO_KEY)
      }
    } catch {
      // ignore storage errors
    }
  })

  watch(accessTokenExpireTime, (expireTime: number | null) => {
    try {
      if (isNumber(expireTime)) {
        uni.setStorageSync(ACCESS_TOKEN_EXPIRE_TIME_KEY, expireTime)
      } else {
        uni.removeStorageSync(ACCESS_TOKEN_EXPIRE_TIME_KEY)
      }
    } catch {
      // ignore storage errors
    }
  })

  watch(refreshTokenExpireTime, (expireTime: number | null) => {
    try {
      if (isNumber(expireTime)) {
        uni.setStorageSync(REFRESH_TOKEN_EXPIRE_TIME_KEY, expireTime)
      } else {
        uni.removeStorageSync(REFRESH_TOKEN_EXPIRE_TIME_KEY)
      }
    } catch {
      // ignore storage errors
    }
  })

  watch(authHeader, (headerName: string) => {
    try {
      if (headerName) {
        uni.setStorageSync(AUTH_HEADER_KEY, headerName)
      } else {
        uni.setStorageSync(AUTH_HEADER_KEY, DEFAULT_AUTH_HEADER)
      }
    } catch {
      // ignore storage errors
    }
  })

  return {
    token,
    userInfo,
    accessTokenExpireTime,
    refreshTokenExpireTime,
    authHeader,
    setToken,
    setAccessToken,
    setUserInfo,
    clearAuthState,
    logout,
    isLoggedIn,
    isAccessTokenExpired,
    initUser
  }
})

export const piniaPluginPersistedstate = {
  key: 'user-store',
  paths: ['token', 'userInfo', 'accessTokenExpireTime', 'refreshTokenExpireTime', 'authHeader']
}
