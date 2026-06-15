import { ImageResponse } from 'next/og'

// Favicon (browser tab). Next wires this as <link rel="icon">.
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
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
          fontSize: 24,
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
