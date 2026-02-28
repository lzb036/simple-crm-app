// uni-app 类型扩展
/// <reference types="@dcloudio/types" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// 扩展 uni 对象类型
declare const uni: UniApp.Uni

// uview-plus 类型
declare module 'uview-plus' {
  import { Plugin } from 'vue'
  const uviewPlus: Plugin
  export default uviewPlus
}

// 扩展 uni.$u.http 类型
declare namespace uni.$u {
  interface HttpConfig {
    baseURL: string
    timeout: number
    header: Record<string, string>
    dataType?: 'json' | 'text'
    responseType?: 'text' | 'arraybuffer'
  }

  interface RequestOptions {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'HEAD' | 'OPTIONS' | 'TRACE'
    params?: Record<string, unknown>
    data?: Record<string, unknown>
    header?: Record<string, string>
    timeout?: number
    dataType?: 'json' | 'text'
    responseType?: 'text' | 'arraybuffer'
  }

  interface Http {
    config: (options: HttpConfig) => void
    get: <T = unknown>(url: string, options?: RequestOptions) => Promise<T>
    post: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => Promise<T>
    put: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => Promise<T>
    delete: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) => Promise<T>
  }

  const http: Http
}
