import type { FetchOptions } from 'ofetch'

export function useAdminApi() {
  const me = useAdminMe()

  function headers(method: string, body?: unknown): Record<string, string> {
    const h: Record<string, string> = {}
    if (me.value && method !== 'GET') h['X-CSRF-Token'] = me.value.csrf_token
    if (body !== undefined && !(body instanceof FormData)) {
      h['Content-Type'] = 'application/json'
    }
    return h
  }

  async function api<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    body?: unknown,
    opts: FetchOptions = {},
  ): Promise<T> {
    // SSR: useRequestFetch tự forward cookie của client sang request nội bộ
    const fetchFn = useRequestFetch()
    try {
      return await fetchFn<T>(path, {
        method,
        body: body as any,
        headers: { ...headers(method, body), ...(opts.headers as any) },
        credentials: 'include',
        ...opts,
      })
    } catch (e: any) {
      const data = e?.data
      const err = new Error(
        Array.isArray(data?.detail)
          ? data.detail.map((d: any) => d.msg).join('; ')
          : data?.detail ?? e.message ?? 'Lỗi không xác định',
      ) as Error & { blockers?: string[]; status?: number }
      err.blockers = data?.blockers || []
      err.status = e?.status
      if (err.status === 401) me.value = null
      throw err
    }
  }

  async function download(path: string, name: string) {
    const blob = await $fetch<Blob>(path, { credentials: 'include', responseType: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  }

  return { api, download }
}
