declare const plus: any

export type CallPermissionState = 'granted' | 'denied' | 'deniedAlways'

export const requestCallPermission = (): Promise<CallPermissionState> => {
  // #ifdef APP-PLUS
  if (plus.os.name !== 'Android') {
    return Promise.resolve('granted')
  }

  return new Promise((resolve) => {
    plus.android.requestPermissions(
      ['android.permission.CALL_PHONE'],
      (result: { granted?: string[]; denied?: string[]; deniedAlways?: string[] }) => {
        if (result.granted && result.granted.length > 0) {
          resolve('granted')
          return
        }
        if (result.deniedAlways && result.deniedAlways.length > 0) {
          resolve('deniedAlways')
          return
        }
        resolve('denied')
      },
      () => resolve('denied')
    )
  })
  // #endif

  return Promise.resolve('granted')
}

export const openAppSettings = (): void => {
  // #ifdef APP-PLUS
  if (plus.os.name === 'Android') {
    const main = plus.android.runtimeMainActivity()
    const Intent = plus.android.importClass('android.content.Intent')
    const Settings = plus.android.importClass('android.provider.Settings')
    const Uri = plus.android.importClass('android.net.Uri')
    const intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
    const uri = Uri.fromParts('package', main.getPackageName(), null)
    intent.setData(uri)
    main.startActivity(intent)
    return
  }

  if (plus.os.name === 'iOS') {
    plus.runtime.openURL('app-settings:')
  }
  // #endif
}
