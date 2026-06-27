import { NextRequest, NextResponse } from 'next/server'

const ZAMA_BASE = 'https://relayer.testnet.zama.org/v2'

// Standard hop-by-hop headers that must never be forwarded across a proxy
const HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate',
  'proxy-authorization', 'te', 'trailers', 'transfer-encoding', 'upgrade',
])

async function proxyRequest(
  req: NextRequest,
  resolvedPath: string[],
): Promise<NextResponse> {
  const targetUrl = `${ZAMA_BASE}/${resolvedPath.join('/')}${req.nextUrl.search}`

  // Build forwarded request headers (strip hop-by-hop and host)
  const outHeaders = new Headers()
  req.headers.forEach((val, key) => {
    const k = key.toLowerCase()
    if (k === 'host' || HOP_HEADERS.has(k)) return
    outHeaders.set(key, val)
  })
  // Disable upstream compression: Node.js fetch (undici) decompresses gzip
  // automatically but keeps the original compressed content-length, causing
  // the SDK to read only that many bytes and get truncated JSON ("Relayer
  // didn't return a JSON"). Asking for identity encoding avoids this entirely.
  outHeaders.set('accept-encoding', 'identity')

  let upstream: Response
  try {
    upstream = await fetch(targetUrl, {
      method: req.method,
      headers: outHeaders,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
      // duplex required when streaming a request body through Node.js fetch
      ...(req.method !== 'GET' && req.method !== 'HEAD'
        ? ({ duplex: 'half' } as Record<string, string>)
        : {}),
      signal: req.signal,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Upstream unreachable', detail: String(err) },
      { status: 502 },
    )
  }

  // Build response headers — strip hop-by-hop plus any encoding/length headers
  // that would be stale after undici decompresses a gzip response body.
  const resHeaders = new Headers()
  upstream.headers.forEach((val, key) => {
    const k = key.toLowerCase()
    if (
      HOP_HEADERS.has(k) ||
      k === 'set-cookie' ||      // don't leak Zama relayer cookies onto our domain
      k === 'content-encoding' || // body is already decoded by undici
      k === 'content-length'     // compressed size != decompressed size; omit so
                                  // the client reads until stream end
    ) return
    resHeaders.set(key, val)
  })

  // Allow the SDK worker (same-origin blob URL) to read the response
  const origin = req.headers.get('origin')
  resHeaders.set('Access-Control-Allow-Origin', origin ?? '*')
  resHeaders.set('Access-Control-Allow-Credentials', 'true')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyRequest(req, path)
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyRequest(req, path)
}

export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyRequest(req, path)
}

export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params
  return proxyRequest(req, path)
}

export async function OPTIONS(req: NextRequest) {
  const requested =
    req.headers.get('access-control-request-headers') ?? 'Content-Type, X-CSRF-Token'
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': req.headers.get('origin') ?? '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': requested,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  })
}
