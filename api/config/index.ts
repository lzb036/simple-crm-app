/**
 * HTTP 请求配置
 * 基于 uni-app request 封装
 */
import { redirectToLogin } from '@/utils/navigation'
import { isDeviceUnauthorizedError } from '@/utils/api-error'

const TOKEN_KEY = 'user_token'
const LEGACY_TOKEN_KEY = 'token'
const USER_INFO_KEY = 'user_info'
const AUTH_HEADER_KEY = 'authHeader'
const ACCESS_TOKEN_EXPIRE_TIME_KEY = 'access_token_expire_time'
const REFRESH_TOKEN_EXPIRE_TIME_KEY = 'refresh_token_expire_time'
const DEFAULT_AUTH_HEADER = 'X-Service-Authorization'

/**
 * 获取存储的 token
 */
function getToken(): string {
  return uni.getStorageSync(TOKEN_KEY) || uni.getStorageSync(LEGACY_TOKEN_KEY) || ''
}

/**
 * 获取认证头名称（后台管理系统使用 X-Service-Authorization）
 */
function getAuthHeaderName(): string {
  return uni.getStorageSync(AUTH_HEADER_KEY) || DEFAULT_AUTH_HEADER
}

/**
 * 获取 Access Token 过期时间
 */
function getAccessTokenExpireTime(): number | null {
  const expireTime = uni.getStorageSync(ACCESS_TOKEN_EXPIRE_TIME_KEY)
  if (typeof expireTime === 'number') return expireTime
  if (typeof expireTime === 'string' && expireTime.trim() && !Number.isNaN(Number(expireTime))) {
    return Number(expireTime)
  }
  return null
}

/**
 * 获取 Refresh Token 过期时间
 */
function getRefreshTokenExpireTime(): number | null {
  const expireTime = uni.getStorageSync(REFRESH_TOKEN_EXPIRE_TIME_KEY)
  if (typeof expireTime === 'number') return expireTime
  if (typeof expireTime === 'string' && expireTime.trim() && !Number.isNaN(Number(expireTime))) {
    return Number(expireTime)
  }
  return null
}

/**
 * 清除认证相关缓存
 */
function clearAuthStorage(): void {
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(LEGACY_TOKEN_KEY)
  uni.removeStorageSync(USER_INFO_KEY)
  uni.removeStorageSync('userInfo')
  uni.removeStorageSync(AUTH_HEADER_KEY)
  uni.removeStorageSync(ACCESS_TOKEN_EXPIRE_TIME_KEY)
  uni.removeStorageSync(REFRESH_TOKEN_EXPIRE_TIME_KEY)
}

interface RequestConfig {
  method?: string
  url: string
  data?: unknown
  params?: Record<string, unknown>
  header?: Record<string, string>
  autoToken?: boolean
  skipAuthRefresh?: boolean
  withCredentials?: boolean
  __retryAfterRefresh?: boolean
}

function requestInterceptor(config: RequestConfig): RequestConfig {
  const token = getToken()
  if (token && config.autoToken !== false) {
    config.header = config.header || {}
    config.header.Authorization = `Bearer ${token}`
  }

  // #ifdef APP-PLUS
  config.header = config.header || {}
  config.header['X-Device-Type'] = 'app'
  // #endif

  if (config.method === 'GET') {
    config.params = config.params || {}
    config.params._t = Date.now()
  }

  console.log(`[请求] ${config.method} ${config.url}`, config.data || config.params)
  return config
}

function requestInterceptorError(error: Error): Promise<never> {
  console.error('[请求错误]', error)
  return Promise.reject(error)
}

interface ResponseData {
  code: number | string
  datas?: unknown
  data?: unknown
  message?: string
  msg?: string
}

interface Response<T = ResponseData> {
  statusCode: number
  data: T
  config: RequestConfig
}

function responseInterceptor<T = ResponseData>(response: Response<T>): unknown {
  const { statusCode, data } = response

  console.log(`[响应] ${response.config.method} ${response.config.url}`, data)

  if (statusCode >= 200 && statusCode < 300) {
    if (data.code === 0 || data.code === 200) {
      return (data as ResponseData).datas || (data as ResponseData).data || data
    }

    handleBusinessError(data as ResponseData, response.config)
    return Promise.reject(data)
  }

  handleHttpError(statusCode, data as ResponseData)
  return Promise.reject(data)
}

function responseInterceptorError(error: UniApp.UploadFileFail | UniApp.RequestFail): Promise<never> {
  console.error('[响应错误]', error)

  const errorMessage = (error as { errMsg?: string }).errMsg

  if (errorMessage) {
    if (errorMessage.includes('timeout')) {
      uni.showToast({
        title: '请求超时，请检查网络',
        icon: 'none',
        duration: 2000
      })
    } else if (errorMessage.includes('fail')) {
      uni.showToast({
        title: '网络连接失败',
        icon: 'none',
        duration: 2000
      })
    }
  }

  return Promise.reject(error)
}

function isDeviceUnauthorized(data: ResponseData): boolean {
  return isDeviceUnauthorizedError(data)
}

function handleBusinessError(data: ResponseData, requestConfig?: RequestConfig): void {
  const errorMap: Record<number | string, string> = {
    401: '登录已过期，请重新登录',
    403: '没有权限访问',
    404: '请求的资源不存在',
    500: '服务器错误'
  }

  const dataMessage =
    typeof data.datas === 'string'
      ? data.datas
      : typeof data.data === 'string'
        ? data.data
        : ''
  const message = data.message || data.msg || dataMessage || errorMap[data.code] || '请求失败'

  if (isDeviceUnauthorized(data)) {
    console.warn('[业务错误] 设备未授权', {
      url: requestConfig?.url,
      message
    })
    return
  }

  const code = data.code ?? (data as { statusCode?: number }).statusCode
  if (code === 401 || code === 1001) {
    clearAuthStorage()

    uni.showModal({
      title: '提示',
      content: '登录身份已过期，请重新登录',
      showCancel: false,
      success: () => {
        redirectToLogin()
      }
    })
    return
  }

  uni.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  })
}

function handleHttpError(statusCode: number, data: ResponseData): void {
  const message = data?.message || data?.msg || ''

  if (isDeviceUnauthorizedError({ ...data, statusCode })) {
    console.warn('[HTTP错误] 设备未授权', {
      statusCode,
      message
    })
    return
  }

  if (statusCode === 401 || statusCode === 403) {
    clearAuthStorage()

    const content = statusCode === 401 ? '登录身份已过期，请重新登录' : '没有权限访问'
    uni.showModal({
      title: '提示',
      content,
      showCancel: false,
      success: () => {
        redirectToLogin()
      }
    })
    return
  }

  const errorMap: Record<number, string> = {
    400: '请求参数错误',
    404: '请求资源不存在',
    405: '请求方法不允许',
    408: '请求超时',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务不可用',
    504: '网关超时'
  }

  const httpMessage = data?.message || errorMap[statusCode] || `请求失败(${statusCode})`
  uni.showToast({
    title: httpMessage,
    icon: 'none',
    duration: 2000
  })
}

export {
  type RequestConfig,
  type Response,
  type ResponseData,
  requestInterceptor,
  requestInterceptorError,
  responseInterceptor,
  responseInterceptorError,
  getToken,
  getAuthHeaderName,
  getAccessTokenExpireTime,
  getRefreshTokenExpireTime,
  clearAuthStorage
}
