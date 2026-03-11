/**
 * 认证相关接口
 */

import request from '../index'
import type { LoginParams, LoginResponse, RefreshTokenResponse } from '@/types/api'
import { getCurrentBaseURL } from '@/utils/baseurl'

const PUBLIC_KEY_STORAGE_KEY_PREFIX = 'public_key'

function getPublicKeyStorageKey(baseURL: string): string {
  const sanitized = baseURL.replace(/[^a-zA-Z0-9]/g, '_')
  return `${PUBLIC_KEY_STORAGE_KEY_PREFIX}_${sanitized}`
}

const AuthAPI = {
  /**
   * Get RSA public key for login encryption.
   */
  async getPublicKey(forceRefresh = false): Promise<string> {
    // 使用当前实际的 baseURL 而不是固定的 config.baseURL
    const currentBaseURL = getCurrentBaseURL()
    const cacheKey = getPublicKeyStorageKey(currentBaseURL)
    const cachedKey = !forceRefresh ? uni.getStorageSync(cacheKey) : ''
    if (cachedKey) {
      return cachedKey
    }

    const publicKey = await request.post<string>('/api/app/auth-manager/public-key', {}, {
      autoToken: false,
      skipAuthRefresh: true,
      withCredentials: true
    })
    if (publicKey) {
      uni.setStorageSync(cacheKey, publicKey)
      return publicKey
    }

    return ''
  },
  /**
   * 后台管理员登录
   * @param data 登录数据
   * @returns 登录响应
   */
  login(data: LoginParams): Promise<LoginResponse> {
    return request.post('/api/app/auth-manager', data, {
      autoToken: false,
      skipAuthRefresh: true,
      withCredentials: true
    })
  },

  /**
   * 刷新 Access Token（Refresh Token 通过 HttpOnly Cookie 自动携带）
   */
  refresh(): Promise<RefreshTokenResponse> {
    return request.post('/api/app/auth-manager/refresh', {}, {
      autoToken: false,
      skipAuthRefresh: true,
      withCredentials: true
    })
  },

  /**
   * 退出登录
   * @returns 退出登录响应
   */
  logout(): Promise<unknown> {
    return request.post('/api/mgr/auth/logout', {}, {
      skipAuthRefresh: true
    })
  }
}

export default AuthAPI
