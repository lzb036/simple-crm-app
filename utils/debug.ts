/**
 * 调试工具模块
 * 用于保存和展示各个接口的返回结果
 */

export interface ApiResult {
  name: string
  url: string
  method: string
  requestTime: string
  response: unknown
  status: 'success' | 'error' | 'pending'
}

class DebugTool {
  private results: Map<string, ApiResult> = new Map()

  addResult(key: string, name: string, url: string, method: string, response: unknown, status: 'success' | 'error' = 'success'): void {
    this.results.set(key, {
      name,
      url,
      method,
      requestTime: new Date().toLocaleString('zh-CN'),
      response,
      status
    })
    console.log(`[调试] 保存API结果: ${name}`)
  }

  getResults(): ApiResult[] {
    return Array.from(this.results.values())
  }

  getResult(key: string): ApiResult | undefined {
    return this.results.get(key)
  }

  clear(): void {
    this.results.clear()
    console.log('[调试] 已清空所有API结果')
  }

  remove(key: string): void {
    this.results.delete(key)
  }

  getSize(): number {
    return this.results.size
  }
}

export const debugTool = new DebugTool()

export function saveApiResult(key: string, name: string, url: string, method: string, response: unknown): void {
  debugTool.addResult(key, name, url, method, response, 'success')
}

export function saveApiError(key: string, name: string, url: string, method: string, error: unknown): void {
  debugTool.addResult(key, name, url, method, error, 'error')
}

export function clearDebugResults(): void {
  debugTool.clear()
}
