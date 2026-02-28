let isLoginRedirecting = false

const LOGIN_ROUTE = '/pages/login/index'

export const redirectToLogin = (): void => {
  if (isLoginRedirecting) return

  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  const current = pages[pages.length - 1]
  const currentRoute = current?.route ? `/${current.route}` : ''

  if (currentRoute === LOGIN_ROUTE || current?.route === LOGIN_ROUTE) return

  isLoginRedirecting = true
  uni.reLaunch({
    url: LOGIN_ROUTE,
    complete: () => {
      isLoginRedirecting = false
    }
  })
}
