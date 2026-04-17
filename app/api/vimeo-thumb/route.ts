import { NextRequest, NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id || !/^\d+$/.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 })

  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=640`,
      { signal: AbortSignal.timeout(5000), next: { revalidate: 3600 } },
    )
    if (!res.ok) {
      const status = res.status === 403 || res.status === 401 ? 403 : 404
      return new NextResponse(null, { status })
    }
    const data = (await res.json()) as { thumbnail_url?: string }
    if (!data.thumbnail_url) return new NextResponse(null, { status: 404 })

    // Proxy the image so Cache-Control headers actually reach the client
    const img = await fetch(data.thumbnail_url, { signal: AbortSignal.timeout(8000) })
    if (!img.ok) return new NextResponse(null, { status: 502 })

    const blob = await img.arrayBuffer()
    const contentType = img.headers.get('content-type') ?? 'image/jpeg'
    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
