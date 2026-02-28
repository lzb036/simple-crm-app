/**
 * HTTP 请求配置
 * 基于 uview-plus 的 luch-request 封装
 */

import { isTokenExpired } from '@/utils/token'
import { getCurrentBaseURL, DEFAULT_BASE_URL } from '@/utils/baseurl'
import { redirectToLogin } from '@/utils/navigation'
import { isDeviceUnauthorizedError } from '@/utils/api-error'

// API 基础配置
interface HttpConfig {
  baseURL: string
  timeout: number
  header: Record<string, string>
  autoToken: boolean
}

const config: HttpConfig = {
  // 基础 URL（会被 getBaseURL 函数动态覆盖）
  //baseURL: 'http://g.etopmarket.com',
  baseURL: DEFAULT_BASE_URL,

  // 请求超时时间（毫秒）
  timeout: 5000,

  // 请求头
  header: {
    'Content-Type': 'application/json'
  },

  // 是否自动添加 token
  autoToken: true
}

/**
 * 获取当前环境的基础 URL
 * @returns {string} baseURL
 */
function getBaseURL(): string {
  // 从 localStorage 获取当前设置的 baseURL
  return getCurrentBaseURL()
}

/**
 * 获取存储的 token
 * @returns {string} token
 */
function getToken(): string {
  // 优先读取新 key，兼容旧数据
  const newToken = uni.getStorageSync('user_token')
  const oldToken = uni.getStorageSync('token')
  const token =
    (typeof newToken === 'string' && newToken) ||
    (typeof oldToken === 'string' && oldToken) ||
    ''

  if (token && isTokenExpired(token)) {
    uni.removeStorageSync('user_token')
    uni.removeStorageSync('token')
    return ''
  }

  return token
}

/**
 * 获取认证头名称（后台管理系统使用 X-Service-Authorization）
 * @returns {string} header name
 */
function getAuthHeaderName(): string {
  return uni.getStorageSync('authHeader') || 'X-Service-Authorization'
}

// 请求配置类型
interface RequestConfig {
  method?: string
  url: string
  data?: unknown
  params?: Record<string, unknown>
  header?: Record<string, string>
  autoToken?: boolean
}

/**
 * 请求拦截器
 * @param {Object} config 请求配置
 * @returns {Object} 处理后的配置
 */
function requestInterceptor(config: RequestConfig): RequestConfig {
  // 添加 token
  const token = getToken()
  if (token && config.autoToken !== false) {
    config.header = config.header || {}
    config.header.Authorization = `Bearer ${token}`
  }

  // 添加设备信息
  // #ifdef APP-PLUS
  config.header = config.header || {}
  config.header['X-Device-Type'] = 'app'
  // #endif

  // 添加时间戳（防止缓存）
  if (config.method === 'GET') {
    config.params = config.params || {}
    config.params['_t'] = Date.now()
  }

  console.log(`[请求] ${config.method} ${config.url}`, config.data || config.params)
  return config
}

/**
 * 请求拦截器错误处理
 * @param {Error} error 错误对象
 */
function requestInterceptorError(error: Error): Promise<never> {
  console.error('[请求错误]', error)
  return Promise.reject(error)
}

// 响应对象类型
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

/**
 * 响应拦截器
 * @param {Object} response 响应对象
 * @returns {Object} 处理后的响应数据
 */
function responseInterceptor<T = ResponseData>(response: Response<T>): unknown {
  const { statusCode, data } = response

  console.log(`[响应] ${response.config.method} ${response.config.url}`, data)

  // HTTP 状态码判断
  if (statusCode >= 200 && statusCode < 300) {
    // 业务状态码判断（后端返回格式：{ code, datas, message }）
    if (data.code === 0 || data.code === 200) {
      // 兼容 data.datas 和 data.data 两种格式
      return (data as ResponseData).datas || (data as ResponseData).data || data
    } else {
      // 业务错误
      handleBusinessError(data as ResponseData, response.config)
      return Promise.reject(data)
    }
  }

  // HTTP 错误处理
  handleHttpError(statusCode, data as ResponseData)
  return Promise.reject(data)
}

/**
 * 响应拦截器错误处理
 * @param {Error} error 错误对象
 */
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

/**
 * 处理业务错误
 * @param {Object} data 响应数据
 */
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

  // 设备未授权（普通管理员手机号授权场景）
  if (isDeviceUnauthorized(data)) {
    console.warn('[业务错误] 设备未授权', {
      url: requestConfig?.url,
      message
    })
    // 设备未授权由业务侧弹窗引导处理，这里不再弹失败 toast，避免重复干扰
    return
  }

  // token 过期，弹窗提示后跳转登录
  if (data.code === 401 || data.code === 1001) {
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')

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

/**
 * 处理 HTTP 错误
 * @param {number} statusCode HTTP 状态码
 * @param {Object} data 响应数据
 */
function handleHttpError(statusCode: number, data: ResponseData): void {
  const message = data?.message || data?.msg || ''

  // 设备未授权（普通管理员手机号授权场景）
  if (isDeviceUnauthorizedError({ ...data, statusCode })) {
    console.warn('[HTTP错误] 设备未授权', {
      statusCode,
      message
    })
    // 设备未授权由业务侧弹窗引导处理，这里不再弹失败 toast，避免重复干扰
    return
  }

  // 401/403 需要清除认证信息并跳转登录
  if (statusCode === 401 || statusCode === 403) {
    uni.removeStorageSync('token')
    uni.removeStorageSync('user_token')
    uni.removeStorageSync('userInfo')

    const message = statusCode === 401 ? '登录身份已过期，请重新登录' : '没有权限访问'

    uni.showModal({
      title: '提示',
      content: message,
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
  config,
  type RequestConfig,
  type Response,
  type ResponseData,
  requestInterceptor,
  requestInterceptorError,
  responseInterceptor,
  responseInterceptorError,
  getToken,
  getAuthHeaderName
}
