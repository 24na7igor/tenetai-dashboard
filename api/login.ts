export const config = { runtime: 'edge' }

declare const process: { env: Record<string, string | undefined> }

async function signToken(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload))
  const hex = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return btoa(payload) + '.' + hex
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  let username: string, password: string
  try {
    const body = await req.json()
    username = String(body.username ?? '')
    password = String(body.password ?? '')
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const expectedUsername = process.env.AUTH_USERNAME
  const expectedPassword = process.env.AUTH_PASSWORD
  const secret = process.env.AUTH_SECRET

  if (!expectedUsername || !expectedPassword || !secret) {
    return Response.json({ error: 'Auth not configured on server' }, { status: 500 })
  }

  // Fixed delay to prevent timing-based enumeration regardless of match result
  await new Promise(r => setTimeout(r, 250 + Math.random() * 250))

  if (username !== expectedUsername || password !== expectedPassword) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const expires = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = `${username}:${expires}`
  const token = await signToken(payload, secret)

  return new Response(JSON.stringify({ ok: true, username }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': [
        `tenet_auth=${encodeURIComponent(token)}`,
        'HttpOnly',
        'Secure',
        'SameSite=Strict',
        `Max-Age=${7 * 24 * 60 * 60}`,
        'Path=/',
      ].join('; '),
    },
  })
}
