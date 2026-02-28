uni.addInterceptor({
  returnValue<T>(res: T): T extends PromiseLike<unknown> ? Promise<unknown> : T {
    if (!(!!res && (typeof res === 'object' || typeof res === 'function') && typeof res.then === 'function')) {
      return res as T extends PromiseLike<unknown> ? Promise<unknown> : T
    }
    return new Promise((resolve, reject) => {
      (res as PromiseLike<unknown>).then(
        (res: unknown) => {
          if (!res) return resolve(res)
          return (res as [unknown, unknown])[0] ? reject((res as [unknown, unknown])[0]) : resolve((res as [unknown, unknown])[1])
        },
        (err: unknown) => reject(err)
      )
    }) as Promise<unknown> as T extends PromiseLike<unknown> ? Promise<unknown> : T
  }
})
