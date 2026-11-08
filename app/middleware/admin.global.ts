export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') return

  const { me, verify } = useAdminAuth()
  if (me.value) return

  const ok = await verify()
  if (!ok) {
    return navigateTo({ path: '/admin/login', query: { next: to.fullPath } })
  }
})
