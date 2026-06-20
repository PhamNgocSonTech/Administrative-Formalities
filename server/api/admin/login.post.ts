import { createHash } from 'crypto'

export default defineEventHandler(async (event) => {
    const { pin } = await readBody(event)

    if (!pin) throw createError({ statusCode: 400, message: 'Thiếu mã PIN' })

    const expectedPin = process.env.ADMIN_PIN
    if (!expectedPin) throw createError({ statusCode: 500, message: 'ADMIN_PIN chưa được cấu hình' })

    if (pin !== expectedPin) {
        throw createError({ statusCode: 401, message: 'Mã PIN không đúng' })
    }

    const secret = process.env.ADMIN_SECRET ?? 'fallback-secret-change-me'
    const token = createHash('sha256').update(pin + secret).digest('hex')

    setCookie(event, 'admin_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 8, // 8 giờ
        path: '/',
    })

    return { ok: true }
})
