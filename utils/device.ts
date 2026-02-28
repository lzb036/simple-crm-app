declare const plus: any

type AndroidPermissionResult = {
  granted?: string[]
  denied?: string[]
  deniedAlways?: string[]
}

export const getDeviceImei = (): Promise<string> => {
  // #ifdef APP-PLUS
  if (plus.os.name !== 'Android') {
    return Promise.resolve('')
  }

  return new Promise((resolve) => {
    plus.android.requestPermissions(
      ['android.permission.READ_PHONE_STATE'],
      (result: AndroidPermissionResult) => {
        if (!result.granted || result.granted.length === 0) {
          resolve('')
          return
        }

        plus.device.getInfo({
          success: (info: { imei?: string }) => {
            resolve(info.imei || '')
          },
          fail: () => {
            resolve('')
          }
        })
      },
      () => {
        resolve('')
      }
    )
  })
  // #endif

  return Promise.resolve('')
}

