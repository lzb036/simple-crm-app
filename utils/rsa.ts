import JSEncrypt from 'jsencrypt'

const PEM_HEADER = '-----BEGIN PUBLIC KEY-----'
const PEM_FOOTER = '-----END PUBLIC KEY-----'

function toPem(publicKey: string): string {
  const sanitized = publicKey
    .replace(PEM_HEADER, '')
    .replace(PEM_FOOTER, '')
    .replace(/\s+/g, '')

  const chunks = sanitized.match(/.{1,64}/g) || []
  return `${PEM_HEADER}\n${chunks.join('\n')}\n${PEM_FOOTER}`
}

export function encryptWithPublicKey(publicKey: string, payload: string): string {
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(toPem(publicKey))

  const encrypted = encryptor.encrypt(payload)
  if (!encrypted) {
    throw new Error('RSA encryption failed')
  }

  return encrypted
}
