export const config = { runtime: 'edge' }

export default function handler(_req: Request): Response {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'tenet_auth=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/',
    },
  })
}
