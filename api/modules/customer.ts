/**
 * 客户管理相关接口
 */

import request from '../index'
import type { CustomerListParams, CustomerListResponse, CustomerRecord } from '@/types/api'
import i18n from '@/locales'
import {
  PHONE_IMEI_GENERATE_FAILED_CODE,
  isDeviceAuthPendingApprovalError,
  isDeviceUnauthorizedError
} from '@/utils/api-error'

type UserRoleItem = {
  code?: string
  name?: string
}

type PhoneImeiResponse =
  | string
  | {
    imei?: string
    deviceId?: string
    deviceID?: string
    id?: string
    value?: string
  }

const PHONE_IMEI_STORAGE_KEY = 'customer_phone_imei'
type PhoneDeviceAuthConfirmHandler = () => Promise<boolean>

const normalizeRoleToken = (value?: string): string => {
  if (!value) {
    return ''
  }
  return value.trim().toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_')
}

const SYSTEM_ADMIN_TOKENS = new Set([
  'SYSTEM_ADMIN',
  'ROLE_SYSTEM_ADMIN',
  'SYS_ADMIN',
  'ROLE_SYS_ADMIN',
  '系统管理员'
])

const SUPER_ADMIN_TOKENS = new Set([
  'SUPER_ADMIN',
  'ROLE_SUPER_ADMIN',
  'SUPERADMIN',
  '超级管理员'
])

const isSystemAdminRole = (token: string): boolean => {
  if (!token) {
    return false
  }
  return SYSTEM_ADMIN_TOKENS.has(token) || token.includes('SYSTEM_ADMIN') || token.includes('SYS_ADMIN') || token.includes('系统管理员')
}

const isSuperAdminRole = (token: string): boolean => {
  if (!token) {
    return false
  }
  return SUPER_ADMIN_TOKENS.has(token) || token.includes('SUPER_ADMIN') || token.includes('SUPERADMIN') || token.includes('超级管理员')
}

const isPrivilegedRole = (role?: UserRoleItem): boolean => {
  const codeToken = normalizeRoleToken(role?.code)
  const nameToken = normalizeRoleToken(role?.name)
  return isSystemAdminRole(codeToken) || isSystemAdminRole(nameToken) || isSuperAdminRole(codeToken) || isSuperAdminRole(nameToken)
}

const shouldAutoApplyDeviceAuth = (): boolean => {
  const rawUserInfo = uni.getStorageSync('user_info')
  const userInfo = rawUserInfo as { roles?: UserRoleItem[] } | null
  const roles = Array.isArray(userInfo?.roles) ? userInfo.roles : []
  if (roles.length === 0) {
    return true
  }
  return !roles.some((role) => isPrivilegedRole(role))
}

const getLocalizedText = (key: string, fallback: string): string => {
  const text = String(i18n.global.t(key))
  return text && text !== key ? text : fallback
}

const confirmPhoneDeviceAuth = (): Promise<boolean> => {
  return new Promise((resolve) => {
    uni.showModal({
      title: getLocalizedText('customer.deviceAuthTitle', '设备授权'),
      content: getLocalizedText('customer.deviceAuthConfirm', '当前设备未授权，是否立即申请授权后继续获取手机号？'),
      confirmText: getLocalizedText('common.confirm', '确认'),
      cancelText: getLocalizedText('common.cancel', '取消'),
      success: (result) => {
        resolve(!!result.confirm)
      },
      fail: () => {
        resolve(false)
      }
    })
  })
}

const parsePhoneImei = (payload: PhoneImeiResponse): string => {
  if (typeof payload === 'string') {
    return payload.trim()
  }

  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const candidateKeys: Array<keyof Exclude<PhoneImeiResponse, string>> = ['imei', 'deviceId', 'deviceID', 'id', 'value']
  for (const key of candidateKeys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

const getStoredPhoneImei = (): string => {
  const imei = uni.getStorageSync(PHONE_IMEI_STORAGE_KEY)
  return typeof imei === 'string' ? imei.trim() : ''
}

const cachePhoneImei = (imei: string): void => {
  const normalizedImei = imei.trim()
  if (!normalizedImei) {
    return
  }
  uni.setStorageSync(PHONE_IMEI_STORAGE_KEY, normalizedImei)
}

const generatePhoneImei = async (): Promise<string> => {
  const response = await request.get<PhoneImeiResponse>('/api/mgr/sys-device-auth/v1/generate-imei', { _t: Date.now() })
  const imei = parsePhoneImei(response)
  if (imei) {
    cachePhoneImei(imei)
  }
  return imei
}

const resolvePhoneImei = async (): Promise<string> => {
  const cachedImei = getStoredPhoneImei()
  if (cachedImei) {
    return cachedImei
  }

  const generatedImei = await generatePhoneImei()
  if (generatedImei) {
    return generatedImei
  }

  uni.showToast({
    title: String(i18n.global.t('customer.imeiGenerateFailed')),
    icon: 'none',
    duration: 2500
  })

  return Promise.reject({
    code: PHONE_IMEI_GENERATE_FAILED_CODE,
    message: 'Failed to generate imei'
  })
}

const applyDeviceAuth = async (imei: string): Promise<void> => {
  if (!imei) {
    return
  }
  await request.post('/api/mgr/sys-device-auth/v1/apply-device-auth', {
    deviceType: 0,
    deviceId: imei
  })
}

const requestPhone = (id: string, accessType: 'dial' | 'app_view', imei: string): Promise<string> => {
  return request.get(`/api/mgr/customers/v1/${id}/phone`, {
    accessType,
    imei,
    _t: Date.now()
  })
}

const CustomerAPI = {
  /**
   * 获取客户列表
   * @param params 查询参数
   * @returns 客户列表
   */
  getList(params: CustomerListParams): Promise<CustomerListResponse> {
    return request.get('/api/mgr/customers/v1/list', { ...params, _t: Date.now() })
  },

  /**
   * 获取客户详情
   * @param id 客户ID
   * @returns 客户详情
   */
  getDetail(id: string): Promise<CustomerRecord> {
    return request.get(`/api/mgr/customers/v1/${id}`)
  },

  /**
   * 查看客户手机号
   * @param id 客户ID
   * @param accessType 访问类型：dial-拨打电话, app_view-查看手机
   * @param confirmHandler 设备授权确认弹窗回调（可选）
   * @returns 手机号
   */
  async getPhone(
    id: string,
    accessType: 'dial' | 'app_view',
    confirmHandler?: PhoneDeviceAuthConfirmHandler
  ): Promise<string> {
    const imei = await resolvePhoneImei()

    try {
      return await requestPhone(id, accessType, imei)
    } catch (error) {
      if (!isDeviceUnauthorizedError(error)) {
        return Promise.reject(error)
      }

      if (!shouldAutoApplyDeviceAuth()) {
        return Promise.reject(error)
      }

      let shouldApplyAuth = false
      if (confirmHandler) {
        try {
          shouldApplyAuth = await confirmHandler()
        } catch {
          shouldApplyAuth = await confirmPhoneDeviceAuth()
        }
      } else {
        shouldApplyAuth = await confirmPhoneDeviceAuth()
      }
      if (!shouldApplyAuth) {
        uni.showToast({
          title: getLocalizedText('customer.deviceAuthCancelled', '已取消授权'),
          icon: 'none',
          duration: 1800
        })
        return Promise.reject(error)
      }

      let isPendingApproval = false
      try {
        await applyDeviceAuth(imei)
      } catch (applyError) {
        if (!isDeviceAuthPendingApprovalError(applyError)) {
          return Promise.reject(applyError)
        }
        isPendingApproval = true
      }

      if (!isPendingApproval) {
        uni.showToast({
          title: getLocalizedText('customer.deviceAuthApplied', '授权申请已提交，请等待后台审核通过后再试'),
          icon: 'none',
          duration: 2200
        })
      }
      return Promise.reject(error)
    }
  }
}

export default CustomerAPI
