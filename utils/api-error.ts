type ErrorPayload = {
  code?: number | string
  statusCode?: number | string
  message?: string
  msg?: string
  datas?: unknown
  data?: unknown
  response?: {
    data?: unknown
  }
}

const DEVICE_UNAUTHORIZED_KEYWORDS = [
  '\u8bbe\u5907\u672a\u6388\u6743',
  '\u8bf7\u7533\u8bf7\u6388\u6743',
  '\u672a\u6388\u6743',
  'device unauthorized'
]
const DEVICE_UNAUTHORIZED_CODES = new Set(['401', '-1'])
const DEVICE_UNAUTHORIZED_STATUS_CODES = new Set(['401', '400'])
const DEVICE_AUTH_PENDING_KEYWORDS = [
  '\u6388\u6743\u7533\u8bf7\u5df2\u63d0\u4ea4',
  '\u7b49\u5f85\u5ba1\u6279',
  '\u5f85\u5ba1\u6279',
  '\u7b49\u5f85\u5ba1\u6838',
  '\u8bf7\u52ff\u91cd\u590d\u63d0\u4ea4',
  '\u91cd\u590d\u63d0\u4ea4',
  'authorization request submitted'
]
const DEVICE_AUTH_PENDING_CODES = new Set(['-1'])
const DEVICE_AUTH_PENDING_STATUS_CODES = new Set(['400'])

export const PHONE_IMEI_GENERATE_FAILED_CODE = 'PHONE_IMEI_GENERATE_FAILED'

const toErrorPayload = (value: unknown): ErrorPayload => {
  if (!value || typeof value !== 'object') {
    return {}
  }
  return value as ErrorPayload
}

const toText = (value: unknown): string => {
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number') {
    return String(value)
  }
  return ''
}

const getPayloadMessageText = (payload: ErrorPayload): string => {
  return [payload.message, payload.msg, payload.datas, payload.data]
    .map((value) => toText(value).trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

const hasDeviceUnauthorizedMessage = (value: unknown): boolean => {
  const payload = toErrorPayload(value)
  const messageText = getPayloadMessageText(payload)

  if (!messageText) {
    return false
  }

  const hasUnauthorizedKeyword = DEVICE_UNAUTHORIZED_KEYWORDS
    .some((keyword) => messageText.includes(keyword.toLowerCase()))

  if (!hasUnauthorizedKeyword) {
    return false
  }

  const code = toText(payload.code)
  const statusCode = toText(payload.statusCode)
  if (!code && !statusCode) {
    return true
  }

  return DEVICE_UNAUTHORIZED_CODES.has(code) || DEVICE_UNAUTHORIZED_STATUS_CODES.has(statusCode)
}

export const isDeviceUnauthorizedError = (error: unknown): boolean => {
  if (hasDeviceUnauthorizedMessage(error)) {
    return true
  }

  const payload = toErrorPayload(error)
  if (hasDeviceUnauthorizedMessage(payload.data)) {
    return true
  }

  return hasDeviceUnauthorizedMessage(payload.response?.data)
}

const hasDeviceAuthPendingApprovalMessage = (value: unknown): boolean => {
  const payload = toErrorPayload(value)
  const messageText = getPayloadMessageText(payload)
  if (!messageText) {
    return false
  }

  const hasPendingKeyword = DEVICE_AUTH_PENDING_KEYWORDS
    .some((keyword) => messageText.includes(keyword.toLowerCase()))
  if (!hasPendingKeyword) {
    return false
  }

  const code = toText(payload.code)
  const statusCode = toText(payload.statusCode)
  return DEVICE_AUTH_PENDING_CODES.has(code) || DEVICE_AUTH_PENDING_STATUS_CODES.has(statusCode)
}

export const isDeviceAuthPendingApprovalError = (error: unknown): boolean => {
  if (hasDeviceAuthPendingApprovalMessage(error)) {
    return true
  }

  const payload = toErrorPayload(error)
  if (hasDeviceAuthPendingApprovalMessage(payload.data)) {
    return true
  }

  return hasDeviceAuthPendingApprovalMessage(payload.response?.data)
}

const hasPhoneImeiGenerateFailedCode = (value: unknown): boolean => {
  const payload = toErrorPayload(value)
  return toText(payload.code) === PHONE_IMEI_GENERATE_FAILED_CODE
}

export const isPhoneImeiGenerateFailedError = (error: unknown): boolean => {
  if (hasPhoneImeiGenerateFailedCode(error)) {
    return true
  }

  const payload = toErrorPayload(error)
  if (hasPhoneImeiGenerateFailedCode(payload.data)) {
    return true
  }

  return hasPhoneImeiGenerateFailedCode(payload.response?.data)
}
