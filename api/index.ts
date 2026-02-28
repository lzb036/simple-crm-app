/**
 * API 统一入口
 * 使用 uni-app 原生 request 封装
 */

import {
  getToken,
  getAuthHeaderName,
  type RequestConfig,
  responseInterceptor,
  responseInterceptorError
} from './config'
import { getCurrentBaseURL } from '@/utils/baseurl'

// 请求配置类型
interface RequestOptions {
  url: string
  params?: Record<string, unknown>
  data?: Record<string, unknown>
  config?: Record<string, unknown>
  signal?: AbortSignal
}

/**
 * 通用请求方法
 */
const request = {
  /**
   * GET 请求
   * @param {string} url 接口地址
   * @param {Object} params 查询参数
   * @param {Object} config 额外配置
   */
  get<T = unknown>(url: string, params: Record<string, unknown> = {}, config: Record<string, unknown> = {}): Promise<T> {
    return this._request<T>('GET', url, params, config)
  },

  /**
   * POST 请求
   * @param {string} url 接口地址
   * @param {Object} data 请求数据
   * @param {Object} config 额外配置
   */
  post<T = unknown>(url: string, data: Record<string, unknown> = {}, config: Record<string, unknown> = {}): Promise<T> {
    return this._request<T>('POST', url, {}, { ...config, data })
  },

  /**
   * PUT 请求
   * @param {string} url 接口地址
   * @param {Object} data 请求数据
   * @param {Object} config 额外配置
   */
  put<T = unknown>(url: string, data: Record<string, unknown> = {}, config: Record<string, unknown> = {}): Promise<T> {
    return this._request<T>('PUT', url, data, config)
  },

  /**
   * DELETE 请求
   * @param {string} url 接口地址
   * @param {Object} data 请求数据
   * @param {Object} config 额外配置
   */
  delete<T = unknown>(url: string, data: Record<string, unknown> = {}, config: Record<string, unknown> = {}): Promise<T> {
    return this._request<T>('DELETE', url, data, config)
  },

  /**
   * 基础请求方法
   */
  _request<T = unknown>(
    method: string,
    url: string,
    params: Record<string, unknown> = {},
    requestConfig: Record<string, unknown> = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // 每次请求时动态获取当前设置的 baseURL
      const baseURL = getCurrentBaseURL()

      // 构建完整URL
      let fullUrl = url
      if (params && Object.keys(params).length > 0 && method === 'GET') {
        const queryString = Object.keys(params)
          .map(key => `${encodeURIComponent(String(key))}=${encodeURIComponent(String(params[key]))}`)
          .join('&')
        fullUrl = `${baseURL}${url}${url.includes('?') ? '&' : '?'}${queryString}`
      } else {
        fullUrl = `${baseURL}${url}`
      }

      // 获取token
      const token = getToken()
      const authHeader = getAuthHeaderName()
      // 构建请求头
      const header: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(requestConfig.header || {})
      }

      // 添加认证头
      if (token) {
        header[authHeader] = token
        // app 接口使用 Authorization 头，避免 Token is missing
        if (!header.Authorization) {
          header.Authorization = `Bearer ${token}`
        }
      }

      // 添加设备信息
      // #ifdef APP-PLUS
      header['X-Device-Type'] = 'app'
      // #endif

      console.log(`[请求] ${fullUrl}`, requestConfig.data || params)
      console.log(`[请求头]`, header)

      uni.request({
        url: fullUrl,
        method: method as any,
        data: method === 'GET' ? params : JSON.stringify(requestConfig.data),
        header,
        success: (res: UniApp.RequestSuccess) => {
          const response = {
            statusCode: res.statusCode,
            data: res.data,
            config: { method, url }
          } as any

          try {
            const result = responseInterceptor(response)
            resolve(result as T)
          } catch (error) {
            reject(error)
          }
        },
        fail: (err: UniApp.RequestFail) => {
          console.error('[请求失败]', err)
          responseInterceptorError(err as any)
          reject(err)
        }
      })
    })
  },

  /**
   * 文件上传
   * @param {string} url 接口地址
   * @param {string} filePath 文件路径
   * @param {Object} formData 额外表单数据
   */
  upload<T = unknown>(url: string, filePath: string, formData: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const token = getToken()
      const authHeader = getAuthHeaderName()
      const baseURL = getCurrentBaseURL()

      uni.uploadFile({
        url: `${baseURL}${url}`,
        filePath,
        name: 'file',
        header: {
          [authHeader]: token || '',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
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
    })
  },

  /**
   * 文件下载
   * @param {string} url 接口地址
   * @param {Object} params 查询参数
   */
  download(url: string, params: Record<string, unknown> = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const token = getToken()
      const authHeader = getAuthHeaderName()
      const baseURL = getCurrentBaseURL()
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(String(key))}=${encodeURIComponent(String(params[key]))}`)
        .join('&')

      const header: Record<string, string> = {}
      if (token) {
        header[authHeader] = token
        if (!header.Authorization) {
          header.Authorization = `Bearer ${token}`
        }
      }

      uni.downloadFile({
        url: `${baseURL}${url}${queryString ? `?${queryString}` : ''}`,
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
    })
  }
}

export default request
