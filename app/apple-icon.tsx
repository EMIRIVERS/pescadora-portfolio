import { ImageResponse } from 'next/og'

// Apple touch icon (home-screen). Next wires this as <link rel="apple-touch-icon">.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#050505',
          color: '#ede8e0',
          fontSize: 116,
          fontWeight: 900,
          letterSpacing: '-0.04em',
          fontFamily: 'sans-serif',
        }}
      >
        X
      </div>
    ),
    { ...size },
  )
}
