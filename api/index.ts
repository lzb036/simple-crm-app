/**
 * API 统一入口
 * 使用 uni-app 原生 request 封装
 */

import {
  getToken,
  getAuthHeaderName,
  getAccessTokenExpireTime,
  clearAuthStorage,
  type RequestConfig,
  responseInterceptor,
  responseInterceptorError
} from './config'
import { getCurrentBaseURL } from '@/utils/baseurl'
import { redirectToLogin } from '@/utils/navigation'
import { useUserStore } from '@/store/user'
import { applyBrowserFingerprintHeader } from '@/utils/browser-fingerprint'

const REFRESH_ENDPOINTS = ['/api/app/auth-manager/refresh']
const TOKEN_INVALID_CODES = new Set<number | string>([401, 1001, '401', '1001'])
const TOKEN_EXPIRE_ADVANCE_MS = 30 * 1000

interface RequestRuntimeConfig extends Record<string, unknown> {
  header?: Record<string, string>
  data?: Record<string, unknown>
  autoToken?: boolean
  skipAuthRefresh?: boolean
  withCredentials?: boolean
  __retryAfterRefresh?: boolean
}

let refreshPromise: Promise<boolean> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
    return Number(value)
  }
  return null
}

function applyAuthHeader(header: Record<string, string>, token: string, authHeader: string): void {
  if (!token) return

  const headerName = (authHeader || '').trim()
  if (headerName) {
    header[headerName] = token
  }

  const bearerToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  header.Authorization = bearerToken
}

function isRefreshUrl(url: string): boolean {
  return REFRESH_ENDPOINTS.some(endpoint => url.includes(endpoint))
}

function shouldAutoRefresh(url: string, config: RequestRuntimeConfig): boolean {
  if (config.skipAuthRefresh === true) return false
  if (config.autoToken === false) return false
  if (isRefreshUrl(url)) return false
  return true
}

function getUserStoreSafe() {
  try {
    return useUserStore()
  } catch {
    return null
  }
}

function updateAccessToken(payload: {
  accessToken: string
  accessTokenExpireTime?: number
  refreshTokenExpireTime?: number
  header?: string
}): void {
  const userStore = getUserStoreSafe()
  if (userStore) {
    userStore.setAccessToken(payload)
    return
  }

  try {
    uni.setStorageSync('user_token', payload.accessToken)
    if (typeof payload.accessTokenExpireTime === 'number') {
      uni.setStorageSync('access_token_expire_time', payload.accessTokenExpireTime)
    } else {
      uni.removeStorageSync('access_token_expire_time')
    }
    if (typeof payload.refreshTokenExpireTime === 'number') {
      uni.setStorageSync('refresh_token_expire_time', payload.refreshTokenExpireTime)
    } else if (payload.refreshTokenExpireTime === null) {
      uni.removeStorageSync('refresh_token_expire_time')
    }
    if (payload.header) {
      uni.setStorageSync('authHeader', payload.header)
    }
  } catch {
    // ignore storage errors
  }
}

function clearAuthAndRedirect(): void {
  const userStore = getUserStoreSafe()
  if (userStore) {
    userStore.logout()
  } else {
    clearAuthStorage()
  }
  redirectToLogin()
}

function extractTokenPayload(responseData: unknown): {
  accessToken: string
  accessTokenExpireTime?: number
  refreshTokenExpireTime?: number
  header?: string
} | null {
  if (!isRecord(responseData)) return null

  const data = isRecord(responseData.datas)
    ? responseData.datas
    : isRecord(responseData.data)
      ? responseData.data
      : responseData

  if (!isRecord(data)) return null

  const accessToken = typeof data.accessToken === 'string'
    ? data.accessToken
    : typeof data.token === 'string'
      ? data.token
      : ''
  if (!accessToken) return null

  const accessTokenExpireTime = toNumber(data.accessTokenExpireTime) ?? undefined
  const refreshTokenExpireTime = toNumber(data.refreshTokenExpireTime)
    ?? toNumber(data.refreshExpireTime)
    ?? undefined
  const header = typeof data.header === 'string' ? data.header : undefined

  return {
    accessToken,
    accessTokenExpireTime,
    refreshTokenExpireTime,
    header
  }
}

function isTokenInvalidResponse(statusCode: number, data: unknown): boolean {
  if (statusCode === 401) return true
  if (!isRecord(data)) return false
  const businessCode = data.code ?? data.statusCode
  return TOKEN_INVALID_CODES.has(businessCode as number | string)
}

function isAccessTokenExpired(): boolean {
  const token = getToken()
  if (!token) return true

  const userStore = getUserStoreSafe()
  if (userStore) {
    return userStore.isAccessTokenExpired()
  }

  const expireTime = getAccessTokenExpireTime()
  if (!expireTime) return false
  return Date.now() + TOKEN_EXPIRE_ADVANCE_MS >= expireTime
}

function requestRefreshByEndpoint(endpoint: string): Promise<boolean> {
  return new Promise((resolve) => {
    const baseURL = getCurrentBaseURL()
    const refreshUrl = `${baseURL}${endpoint}`
    console.log('[AuthRefresh] start', {
      endpoint,
      url: refreshUrl
    })

    const header: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    applyBrowserFingerprintHeader(header)

    uni.request({
      url: refreshUrl,
      method: 'POST',
      data: JSON.stringify({}),
      header,
      withCredentials: true,
      success: (res: UniApp.RequestSuccess) => {
        console.log('[AuthRefresh] response', {
          endpoint,
          statusCode: res.statusCode
        })
        if (res.statusCode < 200 || res.statusCode >= 300) {
          console.warn('[AuthRefresh] http status not success', {
            endpoint,
            statusCode: res.statusCode,
            data: res.data
          })
          resolve(false)
          return
        }

        const data = res.data
        if (isRecord(data) && typeof data.code !== 'undefined' && data.code !== 0 && data.code !== 200) {
          console.warn('[AuthRefresh] business code not success', {
            endpoint,
            code: data.code,
            data
          })
          resolve(false)
          return
        }

        const tokenPayload = extractTokenPayload(data)
        if (!tokenPayload) {
          console.warn('[AuthRefresh] missing token payload in refresh response', {
            endpoint,
            data
          })
          resolve(false)
          return
        }

        updateAccessToken(tokenPayload)
        console.log('[AuthRefresh] success', {
          endpoint,
          accessTokenExpireTime: tokenPayload.accessTokenExpireTime ?? null,
          refreshTokenExpireTime: tokenPayload.refreshTokenExpireTime ?? null
        })
        resolve(true)
      },
      fail: (err: UniApp.RequestFail) => {
        console.error('[AuthRefresh] request fail', {
          endpoint,
          error: err
        })
        resolve(false)
      }
    })
  })
}

async function refreshAccessToken(): Promise<boolean> {
  for (const endpoint of REFRESH_ENDPOINTS) {
    const refreshed = await requestRefreshByEndpoint(endpoint)
    if (refreshed) return true
  }
  return false
}

async function ensureAccessTokenAvailable(forceRefresh = false): Promise<boolean> {
  const token = getToken()
  if (!token) return false
  if (!forceRefresh && !isAccessTokenExpired()) return true

  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }

  const refreshed = await refreshPromise
  if (!refreshed) {
    clearAuthAndRedirect()
  }
  return refreshed
}

const request = {
  get<T = unknown>(url: string, params: Record<string, unknown> = {}, config: Record<string, unknown> = {}): Promise<T> {
    return this._request<T>('GET', url, params, config)
  },

  post<T = unknown>(url: string, data: Record<string, unknown> = {}, config: Record<string, unknown> = {}): Promise<T> {
    return this._request<T>('POST', url, {}, { ...config, data })
  },

  put<T = unknown>(url: string, data: Record<string, unknown> = {}, config: Record<string, unknown> = {}): Promise<T> {
    return this._request<T>('PUT', url, data, config)
  },

  delete<T = unknown>(url: string, data: Record<string, unknown> = {}, config: Record<string, unknown> = {}): Promise<T> {
    return this._request<T>('DELETE', url, data, config)
  },

  _request<T = unknown>(
    method: string,
    url: string,
    params: Record<string, unknown> = {},
    requestConfig: Record<string, unknown> = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async (): Promise<void> => {
        const runtimeConfig = requestConfig as RequestRuntimeConfig
        const needAutoRefresh = shouldAutoRefresh(url, runtimeConfig)

        if (needAutoRefresh && getToken()) {
          const available = await ensureAccessTokenAvailable(false)
          if (!available) {
            reject(new Error('登录已过期，请重新登录'))
            return
          }
        }

        const baseURL = getCurrentBaseURL()

        let fullUrl = url
        if (params && Object.keys(params).length > 0 && method === 'GET') {
          const queryString = Object.keys(params)
            .map(key => `${encodeURIComponent(String(key))}=${encodeURIComponent(String(params[key]))}`)
            .join('&')
          fullUrl = `${baseURL}${url}${url.includes('?') ? '&' : '?'}${queryString}`
        } else {
          fullUrl = `${baseURL}${url}`
        }

        const token = getToken()
        const authHeader = getAuthHeaderName()

        const header: Record<string, string> = {
          'Content-Type': 'application/json',
          ...(runtimeConfig.header || {})
        }
        applyBrowserFingerprintHeader(header)

        if (token && runtimeConfig.autoToken !== false) {
          applyAuthHeader(header, token, authHeader)
        }

        // #ifdef APP-PLUS
        header['X-Device-Type'] = 'app'
        // #endif

        console.log(`[请求] ${fullUrl}`, runtimeConfig.data || params)

        uni.request({
          url: fullUrl,
          method: method as any,
          data: method === 'GET' ? params : JSON.stringify(runtimeConfig.data),
          header,
          withCredentials: runtimeConfig.withCredentials ?? true,
          success: async (res: UniApp.RequestSuccess) => {
            const tokenInvalid = isTokenInvalidResponse(res.statusCode, res.data)
            if (
              tokenInvalid &&
              needAutoRefresh &&
              !runtimeConfig.__retryAfterRefresh &&
              !!getToken()
            ) {
              const refreshed = await ensureAccessTokenAvailable(true)
              if (refreshed) {
                try {
                  const retryResult = await this._request<T>(method, url, params, {
                    ...runtimeConfig,
                    __retryAfterRefresh: true
                  })
                  resolve(retryResult)
                  return
                } catch (retryError) {
                  reject(retryError)
                  return
                }
              }
            }

            const response = {
              statusCode: res.statusCode,
              data: res.data,
              config: { method, url } as RequestConfig
            }

            try {
              const result = responseInterceptor(response)
              resolve(result as T)
            } catch (error) {
              reject(error)
            }
          },
          fail: (err: UniApp.RequestFail) => {
            console.error('[请求失败]', err)
            responseInterceptorError(err as unknown as UniApp.UploadFileFail | UniApp.RequestFail)
            reject(err)
          }
        })
      }

      execute().catch(reject)
    })
  },

  upload<T = unknown>(url: string, filePath: string, formData: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async (): Promise<void> => {
        if (getToken()) {
          const available = await ensureAccessTokenAvailable(false)
          if (!available) {
            reject(new Error('登录已过期，请重新登录'))
            return
          }
        }

        const token = getToken()
        const authHeader = getAuthHeaderName()

        uni.uploadFile({
          url: `${getCurrentBaseURL()}${url}`,
          filePath,
          name: 'file',
          header: (() => {
            const uploadHeader: Record<string, string> = {}
            applyBrowserFingerprintHeader(uploadHeader)
            applyAuthHeader(uploadHeader, token, authHeader)
            return uploadHeader
          })(),
          formData,
          success: (res: UniApp.UploadFileSuccessCallbackRes) => {
            if (res.statusCode === 200 && res.data) {
              try {
                const data = JSON.parse(res.data)
                resolve((data.data || data) as T)
              } catch {
                resolve(res.data as T)
              }
            } else {
              uni.showToast({
                title: '上传失败',
                icon: 'none'
              })
              reject(res)
            }
          },
          fail: (err: UniApp.GeneralCallbackResult) => {
            uni.showToast({
              title: '上传失败',
              icon: 'none'
            })
            reject(err)
          }
        })
      }

      execute().catch(reject)
    })
  },

  download(url: string, params: Record<string, unknown> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const execute = async (): Promise<void> => {
        if (getToken()) {
          const available = await ensureAccessTokenAvailable(false)
          if (!available) {
            reject(new Error('登录已过期，请重新登录'))
            return
          }
        }

        const token = getToken()
        const authHeader = getAuthHeaderName()
        const queryString = Object.keys(params)
          .map(key => `${encodeURIComponent(String(key))}=${encodeURIComponent(String(params[key]))}`)
          .join('&')

        const header: Record<string, string> = {}
        applyBrowserFingerprintHeader(header)
        if (token) {
          applyAuthHeader(header, token, authHeader)
        }

        uni.downloadFile({
          url: `${getCurrentBaseURL()}${url}${queryString ? `?${queryString}` : ''}`,
          header,
          success: (res: UniApp.DownloadFileSuccessCallbackRes) => {
            if (res.statusCode === 200) {
              resolve(res.tempFilePath)
            } else {
              uni.showToast({
                title: '下载失败',
                icon: 'none'
              })
              reject(res)
            }
          },
          fail: (err: UniApp.GeneralCallbackResult) => {
            uni.showToast({
              title: '下载失败',
              icon: 'none'
            })
            reject(err)
          }
        })
      }

      execute().catch(reject)
    })
  }
}

export default request
