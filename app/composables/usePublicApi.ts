/**
 * Fetch public API — không cần auth, dùng useRequestFetch để forward cookie khi SSR (cho các endpoint cần credentials).
 */
export function usePublicApi() {
  async function get<T = any>(path: string): Promise<T> {
    const fetchFn = useRequestFetch()
    try {
      return await fetchFn<T>(path, { credentials: 'include' })
    } catch (e: any) {
      const data = e?.data
      const err = new Error(
        Array.isArray(data?.detail)
          ? data.detail.map((d: any) => d.msg).join('; ')
          : data?.detail ?? data?.message ?? e.message ?? 'Lỗi không xác định',
      ) as Error & { status?: number; data?: any }
      err.status = e?.status
      err.data = data
      throw err
    }
  }
  return { get }
}

export function fmtPublicDate(iso?: string | null): string {
  if (!iso) return '—'
  return iso.slice(0, 10).split('-').reverse().join('/')
}

export function fmtKB(n?: number): string {
  if (!n) return ''
  return `${Math.max(1, Math.round(n / 1024))} KB`
}
