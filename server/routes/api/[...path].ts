import { defineEventHandler, getMethod, getRequestHeaders, readRawBody, setResponseHeader, setResponseStatus, splitCookiesString } from 'h3'

const BASE = process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8800'

const HOP_BY_HOP = new Set([
  'host', 'connection', 'content-length', 'accept-encoding',
  'transfer-encoding', 'keep-alive', 'upgrade', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailer',
])

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const url = BASE + event.path

  const headers: Record<string, string> = {}
  for (const [k, v] of Object.entries(getRequestHeaders(event))) {
    if (!v) continue
    if (HOP_BY_HOP.has(k.toLowerCase())) continue
    headers[k] = Array.isArray(v) ? v.join(', ') : String(v)
  }

  let body: Buffer | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    const raw = await readRawBody(event, false)
    if (raw) body = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as any)
  }

  const res = await fetch(url, { method, headers, body, redirect: 'manual' })

  setResponseStatus(event, res.status, res.statusText)

  // Set-Cookie needs special handling (may have multiple with commas)
  const setCookie = res.headers.get('set-cookie')
  if (setCookie) {
    const cookies = splitCookiesString(setCookie)
    setResponseHeader(event, 'set-cookie', cookies)
  }

  for (const [k, v] of res.headers.entries()) {
    const lk = k.toLowerCase()
    if (lk === 'set-cookie') continue
    if (HOP_BY_HOP.has(lk)) continue
    setResponseHeader(event, k, v)
  }

  const buf = Buffer.from(await res.arrayBuffer())
  return buf
})
