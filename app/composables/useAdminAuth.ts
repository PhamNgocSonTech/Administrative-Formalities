export interface AdminMe {
  id?: number
  username: string
  full_name?: string
  roles: Array<'system_admin' | 'editor' | 'approver'>
  csrf_token: string
}

export const useAdminMe = () => useState<AdminMe | null>('admin-me', () => null)

export function useAdminAuth() {
  const me = useAdminMe()

  const hasRole = (r: AdminMe['roles'][number]) => !!me.value?.roles.includes(r)

  const roleLabel = computed(() => {
    const map: Record<string, string> = {
      system_admin: 'Quản trị',
      editor: 'Biên tập',
      approver: 'Phê duyệt',
    }
    return me.value?.roles.map((r) => map[r]).join(', ') ?? ''
  })

  async function login(username: string, password: string) {
    const data = await $fetch<AdminMe>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
      credentials: 'include',
    })
    me.value = data
    return data
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
        headers: me.value ? { 'X-CSRF-Token': me.value.csrf_token } : {},
        credentials: 'include',
      })
    } finally {
      me.value = null
    }
  }

  async function verify() {
    try {
      // useRequestFetch tự forward header (cookie, ...) từ request client sang khi chạy SSR
      const fetchFn = useRequestFetch()
      const data = await fetchFn<AdminMe>('/api/auth/me', { credentials: 'include' })
      me.value = data
      return true
    } catch {
      me.value = null
      return false
    }
  }

  return { me, hasRole, roleLabel, login, logout, verify }
}
