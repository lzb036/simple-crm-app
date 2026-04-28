const BROWSER_FINGERPRINT_KEY = 'crm_browser_fingerprint'

let memoryFingerprint = ''

function createBrowserFingerprint(): string {
  return Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0')
}

export function getBrowserFingerprint(): string {
  if (memoryFingerprint) {
    return memoryFingerprint
  }

  try {
    const cached = uni.getStorageSync(BROWSER_FINGERPRINT_KEY)
    if (typeof cached === 'string' && cached.trim()) {
      memoryFingerprint = cached.trim()
      return memoryFingerprint
    }

    memoryFingerprint = createBrowserFingerprint()
    uni.setStorageSync(BROWSER_FINGERPRINT_KEY, memoryFingerprint)
    return memoryFingerprint
  } catch {
    memoryFingerprint = createBrowserFingerprint()
    return memoryFingerprint
  }
}

export function applyBrowserFingerprintHeader(header: Record<string, string>): Record<string, string> {
  const hasFingerprint = Object.keys(header).some(
    key => key.toLowerCase() === 'x-browser-fingerprint'
  )

  if (!hasFingerprint) {
    header['X-Browser-Fingerprint'] = getBrowserFingerprint()
  }

  return header
}
