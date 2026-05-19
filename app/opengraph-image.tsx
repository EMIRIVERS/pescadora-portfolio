import { ImageResponse } from 'next/og'
import { SITE } from '@/lib/seo'

// Branded social card — generated at build/ISR, no static asset to maintain.
export const alt = 'XICO Films — Productora Audiovisual en México'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          color: '#ede8e0',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 230,
            fontWeight: 900,
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}
        >
          XICO
        </div>
        <div
          style={{
            width: 520,
            height: 2,
            background: 'rgba(237,232,224,0.18)',
            margin: '36px 0',
          }}
        />
        <div
          style={{
            fontSize: 40,
            letterSpacing: '0.55em',
            textTransform: 'uppercase',
            color: 'rgba(237,232,224,0.55)',
          }}
        >
          Films
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 28,
            letterSpacing: '0.06em',
            color: '#8a847c',
          }}
        >
          {SITE.shortDescription}
        </div>
      </div>
    ),
    { ...size },
  )
}
