import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=640`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return new NextResponse(null, { status: 404 })
    const data = await res.json() as { thumbnail_url?: string }
    if (!data.thumbnail_url) return new NextResponse(null, { status: 404 })

    // Redirect directo al CDN de Vimeo — evita proxear 48KB por el servidor
    return NextResponse.redirect(data.thumbnail_url, {
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
