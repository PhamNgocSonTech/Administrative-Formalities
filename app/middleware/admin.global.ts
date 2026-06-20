export default defineNuxtRouteMiddleware(async (to) => {
    if (!to.path.startsWith('/admin') || to.path === '/admin/login') return

    // Cache kết quả trong session để tránh gọi API mỗi lần navigate
    const isAuth = useState('admin-auth', () => false)
    if (isAuth.value) return

    try {
        await $fetch('/api/admin/verify')
        isAuth.value = true
    } catch {
        return navigateTo('/admin/login')
    }
})
