import { createHash } from 'crypto'

export default defineEventHandler((event) => {
    const token = getCookie(event, 'admin_session')
    if (!token) throw createError({ statusCode: 401, message: 'Chưa xác thực' })

    const expectedPin = process.env.ADMIN_PIN
    const secret = process.env.ADMIN_SECRET ?? 'fallback-secret-change-me'
    const expected = createHash('sha256').update((expectedPin ?? '') + secret).digest('hex')

    if (token !== expected) throw createError({ statusCode: 401, message: 'Phiên đã hết hạn' })

    return { ok: true }
})
