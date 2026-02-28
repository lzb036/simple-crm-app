/**
 * 扫码登录相关接口
 */

import request from '../index'

type DeviceIdResponse =
  | string
  | {
    imei?: string
    deviceId?: string
    deviceID?: string
    id?: string
    value?: string
  }

const parseDeviceId = (payload: DeviceIdResponse): string => {
  if (typeof payload === 'string') {
    return payload.trim()
  }

  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const candidateKeys: Array<keyof Exclude<DeviceIdResponse, string>> = ['imei', 'deviceId', 'deviceID', 'id', 'value']
  for (const key of candidateKeys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return ''
}

const QrLoginAPI = {
  /**
   * 提交二维码登录（手机端确认）
   * @param qrCode 二维码标识
   * @param appToken 手机端登录 token
   */
  submit(qrCode: string, appToken?: string): Promise<unknown> {
    const payload: { qrCode: string; appToken?: string } = { qrCode }
    if (appToken) payload.appToken = appToken
    return request.post('/api/app/qr-login/submit', payload)
  },

  /**
   * 取消二维码登录（手机端取消）
   * @param qrCode 二维码标识
   */
  cancel(qrCode: string): Promise<unknown> {
    return request.post('/api/app/qr-login/cancel', { qrCode })
  },

  async generateDeviceId(): Promise<string> {
    const result = await request.get<DeviceIdResponse>('/api/app/qr-login/generate-device-id', { _t: Date.now() })
    return parseDeviceId(result)
  }
}

export default QrLoginAPI
