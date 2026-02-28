const TOKEN_EXPIRY_SKEW_SECONDS = 30

function normalizeBase64(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (normalized.length % 4)) % 4
  return `${normalized}${'='.repeat(padding)}`
}

function base64Decode(input: string): string {
  if (typeof atob === 'function') {
    return atob(input)
  }

  if (typeof uni !== 'undefined' && typeof uni.base64ToArrayBuffer === 'function') {
    const buffer = uni.base64ToArrayBuffer(input)
    const bytes = new Uint8Array(buffer)
    let result = ''
    for (let i = 0; i < bytes.length; i += 1) {
      result += String.fromCharCode(bytes[i])
    }
    return result
  }

  const buffer = (globalThis as { Buffer?: { from: (data: string, encoding: string) => { toString: (encoding: string) => string } } }).Buffer
  if (buffer && typeof buffer.from === 'function') {
    return buffer.from(input, 'base64').toString('binary')
  }

  return ''
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null

  const payload = base64Decode(normalizeBase64(parts[1]))
  if (!payload) return null

  try {
    return JSON.parse(payload) as Record<string, unknown>
  } catch {
    return null
  }
}

export function isTokenExpired(token: string, skewSeconds: number = TOKEN_EXPIRY_SKEW_SECONDS): boolean {
  const payload = parseJwtPayload(token)
  if (!payload) return false

  const expValue =
    typeof payload.exp === 'number'
      ? payload.exp
      : typeof payload.exp === 'string'
        ? Number(payload.exp)
        : NaN

  if (!Number.isFinite(expValue)) return false

  const nowSeconds = Math.floor(Date.now() / 1000)
  return expValue <= nowSeconds + skewSeconds
}
