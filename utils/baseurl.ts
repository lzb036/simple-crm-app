/**
 * BaseURL 管理工具
 * 用于管理和切换 API 基础 URL
 */

// 默认 baseURL
export const DEFAULT_BASE_URL = 'http://1.14.159.60'

// localStorage 键名（使用项目前缀避免与其他应用冲突）
const STORAGE_KEY_CURRENT = 'crm_baseurl_current'
const STORAGE_KEY_LIST = 'crm_baseurl_list'

// BaseURL 列表项接口
export interface BaseURLItem {
  id: string
  name: string
  url: string
  isDefault?: boolean
}

/**
 * 获取当前使用的 baseURL
 * @returns 当前 baseURL
 */
export function getCurrentBaseURL(): string {
  const current = uni.getStorageSync(STORAGE_KEY_CURRENT)
  if (current && typeof current === 'string') {
    return current
  }
  // 如果没有设置过，返回默认值并保存
  uni.setStorageSync(STORAGE_KEY_CURRENT, DEFAULT_BASE_URL)
  return DEFAULT_BASE_URL
}

/**
 * 设置当前使用的 baseURL
 * @param url 要设置的 baseURL
 */
export function setCurrentBaseURL(url: string): void {
  uni.setStorageSync(STORAGE_KEY_CURRENT, url)
}

/**
 * 获取保存的 baseURL 列表
 * @returns BaseURL 列表
 */
export function getBaseURLList(): BaseURLItem[] {
  const list = uni.getStorageSync(STORAGE_KEY_LIST)
  if (list && Array.isArray(list)) {
    return list
  }
  // 如果没有保存过，返回默认列表
  const defaultList: BaseURLItem[] = [
    {
      id: 'default',
      name: '生产环境',
      url: DEFAULT_BASE_URL,
      isDefault: true
    }
  ]
  uni.setStorageSync(STORAGE_KEY_LIST, defaultList)
  return defaultList
}

/**
 * 保存 baseURL 列表
 * @param list BaseURL 列表
 */
export function saveBaseURLList(list: BaseURLItem[]): void {
  uni.setStorageSync(STORAGE_KEY_LIST, list)
}

/**
 * 添加新的 baseURL
 * @param name 名称
 * @param url URL 地址
 * @returns 添加后的列表
 */
export function addBaseURL(name: string, url: string): BaseURLItem[] {
  const list = getBaseURLList()
  const newItem: BaseURLItem = {
    id: Date.now().toString(),
    name,
    url
  }
  list.push(newItem)
  saveBaseURLList(list)
  return list
}

/**
 * 删除指定的 baseURL
 * @param id 要删除的项的 ID
 * @returns 删除后的列表
 */
export function deleteBaseURL(id: string): BaseURLItem[] {
  let list = getBaseURLList()

  // 保存要删除的项的URL
  const deletedItem = list.find(item => item.id === id)

  list = list.filter(item => item.id !== id)
  saveBaseURLList(list)

  // 如果删除的是当前使用的 URL，切换到第一个可用的
  const current = getCurrentBaseURL()
  if (deletedItem && deletedItem.url === current && list.length > 0) {
    const firstItem = list[0]
    if (firstItem) {
      setCurrentBaseURL(firstItem.url)
    }
  }

  return list
}

/**
 * 切换到指定的 baseURL
 * @param url 要切换到的 URL
 */
export function switchBaseURL(url: string): void {
  setCurrentBaseURL(url)
}

/**
 * 验证 URL 格式
 * @param url 要验证的 URL
 * @returns 是否有效
 */
export function validateURL(url: string): boolean {
  if (!url || url.trim() === '') {
    return false
  }
  // 使用正则表达式验证 URL 格式
  // 支持 http:// 或 https:// 开头的 URL
  const urlPattern = /^https?:\/\/(([a-zA-Z0-9\-_]+\.)+[a-zA-Z]{2,}|localhost|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?(\/.*)?$/
  return urlPattern.test(url.trim())
}

/**
 * 格式化 URL（确保没有尾部斜杠）
 * @param url 要格式化的 URL
 * @returns 格式化后的 URL
 */
export function formatURL(url: string): string {
  return url.replace(/\/+$/, '')
}
