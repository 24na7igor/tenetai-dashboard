export const config = { runtime: 'edge' }

async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const dotIndex = token.lastIndexOf('.')
    if (dotIndex === -1) return null

    const payloadB64 = token.slice(0, dotIndex)
    const sigHex = token.slice(dotIndex + 1)

    const payload = atob(payloadB64)
    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    )
    const pairs = sigHex.match(/.{2}/g)
    if (!pairs) return null
    const sigBytes = new Uint8Array(pairs.map(b => parseInt(b, 16)))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(payload))
    if (!valid) return null

    const colonIndex = payload.lastIndexOf(':')
    const username = payload.slice(0, colonIndex)
    const expires = parseInt(payload.slice(colonIndex + 1))
    if (isNaN(expires) || Date.now() > expires) return null

    return username
  } catch {
    return null
  }
}

export default async function handler(req: Request): Promise<Response> {
  const cookieHeader = req.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/tenet_auth=([^;]+)/)
  const rawToken = match ? decodeURIComponent(match[1]) : null

  if (!rawToken) {
    return Response.json({ authenticated: false }, { status: 401 })
  }

  const secret = process.env.AUTH_SECRET
  if (!secret) {
    return Response.json({ authenticated: false, error: 'not configured' }, { status: 500 })
  }

  const username = await verifyToken(rawToken, secret)
  if (!username) {
    return Response.json({ authenticated: false }, { status: 401 })
  }

  return Response.json({ authenticated: true, username })
}
