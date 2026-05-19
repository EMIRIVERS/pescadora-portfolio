"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"

// WebGL shader is heavy and not needed for first paint. Load it lazily,
// client-only, so it never enters the SSR/initial bundle or blocks the hero.
const GrainGradient = dynamic(
  () => import("@paper-design/shaders-react").then((m) => m.GrainGradient),
  { ssr: false }
)

// Instant, paint-on-first-frame approximation of the shader so the hero has
// a finished-looking background immediately while the WebGL loads.
const FALLBACK_GRADIENT =
  "radial-gradient(ellipse at 28% 38%, hsla(14,100%,57%,0.55), transparent 55%)," +
  "radial-gradient(ellipse at 72% 66%, hsla(340,82%,52%,0.45), transparent 55%)," +
  "radial-gradient(ellipse at 52% 26%, hsla(45,100%,51%,0.32), transparent 60%)," +
  "hsl(0,0%,0%)"

export function GradientBackground() {
  const [showShader, setShowShader] = useState(false)

  useEffect(() => {
    // Respect reduced-motion: keep the static CSS gradient, never run WebGL.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    let cancelled = false
    const start = () => { if (!cancelled) setShowShader(true) }
    const ric = window.requestIdleCallback
    if (ric) {
      const id = ric(start)
      return () => { cancelled = true; window.cancelIdleCallback?.(id) }
    }
    const t = window.setTimeout(start, 600)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  return (
    <div className="absolute inset-0 -z-10" style={{ background: FALLBACK_GRADIENT }}>
      {showShader && (
        <GrainGradient
          style={{ height: "100%", width: "100%", animation: "shaderFadeIn 1.2s ease forwards" }}
          colorBack="hsl(0, 0%, 0%)"
          softness={0.76}
          intensity={0.45}
          noise={0}
          shape="corners"
          offsetX={0}
          offsetY={0}
          scale={1}
          rotation={0}
          speed={1}
          colors={["hsl(14, 100%, 57%)", "hsl(45, 100%, 51%)", "hsl(340, 82%, 52%)"]}
        />
      )}
    </div>
  )
}
