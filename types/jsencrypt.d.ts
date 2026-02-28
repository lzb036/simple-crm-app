declare module 'jsencrypt' {
  class JSEncrypt {
    constructor(options?: {
      default_key_size?: string
      default_public_exponent?: string
      log?: boolean
    })
    setPublicKey(publicKey: string): void
    encrypt(data: string): string | false
  }

  export default JSEncrypt
}
