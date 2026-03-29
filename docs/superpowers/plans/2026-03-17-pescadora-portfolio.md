# Pescadora Portfolio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page WebGL-first cinematic portfolio for Pescadora — a Mexican creative studio — with a Three.js radial photo gallery, GLSL shaders, custom cursor, video section, and WhatsApp contact form, deployed on Next.js 15.

**Architecture:** A fixed WebGL canvas (Three.js) renders beneath a React DOM layer. Photos mount as `PlaneGeometry` meshes with a custom `ShaderMaterial` that applies film grain and cursor-proximity liquid distortion. The DOM handles text, video, cursor element, and contact. Scroll is orchestrated by GSAP ScrollTrigger, passing normalized progress to both layers.

**Tech Stack:** Next.js 15 (App Router) · TypeScript strict · Three.js · GLSL · GSAP + ScrollTrigger · Framer Motion · Tailwind CSS · Lucide React

---

## File Map

```
D:/Pescadora/
├── CLAUDE.md
├── .env.local                          ← NEXT_PUBLIC_WA_NUMBER
├── .gitignore
├── next.config.ts                      ← webpack raw-loader for .glsl
├── tailwind.config.ts
├── tsconfig.json                       ← strict mode
├── public/
│   └── media/
│       ├── contenido/                  ← photo projects (symlink or copy)
│       └── videos/                     ← .mov files
├── scripts/
│   └── generate-registry.mjs          ← scans public/media → media_registry.json
├── media_registry.json                 ← generated, never hand-edited
├── src/
│   ├── app/
│   │   ├── layout.tsx                  ← fonts, cursor mount, metadata
│   │   ├── page.tsx                    ← composes all 6 sections
│   │   ├── globals.css                 ← CSS vars, base reset, cursor:none
│   │   └── actions.ts                  ← (stub) contact form Server Action
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── WebGLCanvas.tsx         ← Three.js scene, camera, renderer, resize
│   │   │   ├── RadialGallery.tsx       ← manages PlaneGeometry instances
│   │   │   ├── PhotoPlane.tsx          ← single plane: geometry + ShaderMaterial
│   │   │   └── shaders/
│   │   │       ├── vertex.glsl         ← pass-through vertex shader
│   │   │       └── fragment.glsl       ← grain + liquid distortion
│   │   ├── cursor/
│   │   │   └── CustomCursor.tsx        ← DOM cursor, LERP, state machine
│   │   ├── sections/
│   │   │   ├── Hero.tsx
│   │   │   ├── FotoSection.tsx
│   │   │   ├── VideoSection.tsx
│   │   │   ├── SobreSection.tsx
│   │   │   ├── ServiciosSection.tsx
│   │   │   └── ContactoSection.tsx
│   │   └── ui/
│   │       └── Wordmark.tsx            ← SVG/text wordmark component
│   ├── hooks/
│   │   ├── useMousePosition.ts         ← RAF mouse tracker, returns {x, y} normalized
│   │   └── useScrollProgress.ts        ← GSAP ScrollTrigger → normalized 0–1 per section
│   ├── lib/
│   │   ├── registry.ts                 ← reads media_registry.json, exports typed arrays
│   │   └── three-utils.ts              ← texture loader, dispose helper
│   └── types/
│       └── media.ts                    ← PhotoEntry, VideoEntry types
```

---

## Task 1: Project Scaffold + CLAUDE.md

**Files:**
- Create: `CLAUDE.md`
- Create: `.gitignore`
- Create: `.env.local`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd D:/Pescadora
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes
```

Wait for completion. Confirm `app/`, `tailwind.config.ts`, `tsconfig.json` exist.

- [ ] **Step 2: Install dependencies**

```bash
npm install three gsap framer-motion lucide-react
npm install --save-dev @types/three
```

- [ ] **Step 3: Install raw-loader for GLSL**

```bash
npm install --save-dev raw-loader
```

- [ ] **Step 4: Configure webpack for .glsl in next.config.ts**

Replace `next.config.ts` with:

```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.glsl$/,
      use: 'raw-loader',
    })
    return config
  },
}

export default nextConfig
```

- [ ] **Step 5: Enable TypeScript strict mode**

In `tsconfig.json`, ensure `"strict": true` is present under `compilerOptions`. It should already be there from create-next-app — verify.

- [ ] **Step 6: Write CLAUDE.md**

Create `CLAUDE.md`:

```markdown
# Pescadora — Claude Code Rules

## Commands
- `npm run dev` — development server
- `npm run build` — production build
- `npm run lint` — ESLint
- `node scripts/generate-registry.mjs` — regenerate media_registry.json

## Always Do
- Wrap static images in `next/image` unless loaded into Three.js textures
- Clean up Three.js geometries, materials, textures in `useEffect` cleanup
- Clean up GSAP ScrollTriggers in `useEffect` cleanup
- TypeScript strict — no `any`, no `@ts-ignore`
- Keep shaders in `.glsl` files, never as template strings in JS

## Ask First
- Before modifying `media_registry.json`
- Before adding any npm dependency not in: three, gsap, framer-motion, lucide-react
- Before changing scroll architecture

## Never Do
- Never alter `media_registry.json` manually (run the script)
- Never add emoji to source files
- Never set `position: absolute` on the WebGL canvas (must be `fixed`)
- Never commit `.env*.local`
- Never add icon libraries other than `lucide-react`
```

- [ ] **Step 7: Write .env.local**

```bash
echo "NEXT_PUBLIC_WA_NUMBER=521234567890" > .env.local
```

(Placeholder — user will update with real number later)

- [ ] **Step 8: Write .gitignore additions**

Append to `.gitignore`:

```
.env*.local
.superpowers/
```

- [ ] **Step 9: Move src to proper structure**

```bash
mkdir -p src/components/canvas/shaders
mkdir -p src/components/cursor
mkdir -p src/components/sections
mkdir -p src/components/ui
mkdir -p src/hooks
mkdir -p src/lib
mkdir -p src/types
mkdir -p scripts
mkdir -p public/media
```

- [ ] **Step 10: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 15 project with Three.js, GSAP, GLSL support"
```

---

## Task 2: Media Registry Script + Types

**Files:**
- Create: `scripts/generate-registry.mjs`
- Create: `src/types/media.ts`
- Create: `media_registry.json` (generated)

- [ ] **Step 1: Copy media assets to public/**

Copy all photo project folders from `Contenido/` and video files to `public/media/`:

```bash
cp -r /d/Pescadora/Contenido/* /d/Pescadora/public/media/contenido/
# For videos, create a videos subfolder:
mkdir -p /d/Pescadora/public/media/videos
cp /d/Pescadora/*.mov /d/Pescadora/public/media/videos/
```

- [ ] **Step 2: Write the TypeScript types**

Create `src/types/media.ts`:

```typescript
export interface PhotoEntry {
  id: string
  project: string
  url: string
  alt: string
  tags: string[]
}

export interface VideoEntry {
  id: string
  title: string
  url: string
  poster: string | null
  tags: string[]
}

export interface MediaRegistry {
  photos: PhotoEntry[]
  videos: VideoEntry[]
}
```

- [ ] **Step 3: Write the registry generator script**

Create `scripts/generate-registry.mjs`:

```javascript
import { readdir, writeFile } from 'fs/promises'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'

const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const VIDEO_EXTENSIONS = new Set(['.mov', '.mp4', '.webm'])
const PUBLIC_MEDIA = './public/media'
const OUTPUT = './media_registry.json'

async function scanPhotos() {
  const photos = []
  const contenidoDir = join(PUBLIC_MEDIA, 'contenido')
  let projects
  try {
    projects = await readdir(contenidoDir)
  } catch {
    console.warn('No contenido directory found at', contenidoDir)
    return photos
  }

  for (const project of projects) {
    let files
    try {
      files = await readdir(join(contenidoDir, project))
    } catch {
      continue
    }
    for (const file of files) {
      const ext = extname(file).toLowerCase()
      if (!PHOTO_EXTENSIONS.has(ext)) continue
      photos.push({
        id: randomUUID(),
        project,
        url: `/media/contenido/${encodeURIComponent(project)}/${encodeURIComponent(file)}`,
        alt: `${project} — Pescadora`,
        tags: [],
      })
    }
  }
  return photos
}

async function scanVideos() {
  const videos = []
  const videosDir = join(PUBLIC_MEDIA, 'videos')
  let files
  try {
    files = await readdir(videosDir)
  } catch {
    console.warn('No videos directory found at', videosDir)
    return videos
  }

  for (const file of files) {
    const ext = extname(file).toLowerCase()
    if (!VIDEO_EXTENSIONS.has(ext)) continue
    const name = basename(file, ext)
    videos.push({
      id: randomUUID(),
      title: name,
      url: `/media/videos/${encodeURIComponent(file)}`,
      poster: null,
      tags: [],
    })
  }
  return videos
}

async function main() {
  const [photos, videos] = await Promise.all([scanPhotos(), scanVideos()])
  const registry = { photos, videos }
  await writeFile(OUTPUT, JSON.stringify(registry, null, 2))
  console.log(`✓ media_registry.json — ${photos.length} photos, ${videos.length} videos`)
}

main().catch(console.error)
```

- [ ] **Step 4: Run the script**

```bash
node scripts/generate-registry.mjs
```

Expected: `✓ media_registry.json — ~100 photos, 15 videos`

- [ ] **Step 5: Write the registry reader**

Create `src/lib/registry.ts`:

```typescript
import type { MediaRegistry } from '@/types/media'
import registryJson from '../../media_registry.json'

export const registry = registryJson as MediaRegistry

export function getPhotosByProject(project: string) {
  return registry.photos.filter(p => p.project === project)
}

export function getAllProjects(): string[] {
  return [...new Set(registry.photos.map(p => p.project))]
}
```

- [ ] **Step 6: Add resolveJsonModule to tsconfig**

In `tsconfig.json` under `compilerOptions`, ensure:
```json
"resolveJsonModule": true
```

- [ ] **Step 7: Commit**

```bash
git add scripts/ src/types/ src/lib/registry.ts media_registry.json tsconfig.json
git commit -m "feat: media registry — scan 100 photos + 15 videos into typed JSON"
```

---

## Task 3: Global Styles, CSS Variables, Font Setup

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write globals.css**

Replace `src/app/globals.css`:

```css
@import "tailwindcss";

:root {
  --color-bg: #f2ede6;
  --color-text: #2a2520;
  --color-text-muted: #8a8078;
  --color-border: #d0c8be;
  --color-ink: #1a1510;
  --color-video-bg: #1a1510;
  --color-video-text: #f2ede6;

  /* Typography scale — golden ratio */
  --text-xs:  0.75rem;
  --text-sm:  1rem;
  --text-md:  1.618rem;
  --text-lg:  2.618rem;
  --text-xl:  4.236rem;
  --text-2xl: 6.854rem;

  /* Spacing — 8px grid */
  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2rem;
  --space-6: 3rem;
  --space-8: 4rem;
  --space-12: 6rem;
  --space-16: 8rem;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  scroll-behavior: auto; /* GSAP controls scroll */
}

body {
  cursor: none; /* Hide system cursor — custom cursor takes over */
  overflow-x: hidden;
}

/* Restore cursor for inputs */
input,
textarea,
select {
  cursor: text;
}

/* WebGL canvas sits beneath everything */
canvas.webgl {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
}

/* All sections sit above canvas */
main {
  position: relative;
  z-index: 1;
}
```

- [ ] **Step 2: Update layout.tsx with Geist font + metadata**

Replace `src/app/layout.tsx`:

```typescript
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pescadora',
  description: 'Fotografía y video de campaña. México.',
  openGraph: {
    title: 'Pescadora',
    description: 'Fotografía y video de campaña. México.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Install Geist font package**

```bash
npm install geist
```

- [ ] **Step 4: Run dev server and verify page loads**

```bash
npm run dev
```

Open `http://localhost:3000` — page should load with crema background, no system cursor visible.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx package.json package-lock.json
git commit -m "feat: global styles — crema/carbon palette, CSS vars, Geist font, cursor:none"
```

---

## Task 4: Custom Cursor

**Files:**
- Create: `src/hooks/useMousePosition.ts`
- Create: `src/components/cursor/CustomCursor.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write useMousePosition hook**

Create `src/hooks/useMousePosition.ts`:

```typescript
'use client'
import { useEffect, useRef } from 'react'

export interface MousePosition {
  x: number
  y: number
  /** Normalized 0–1 relative to viewport */
  nx: number
  ny: number
}

/**
 * Tracks mouse position with RAF. Returns a ref (not state) to avoid re-renders.
 * Components that need the position read it from the ref in their own RAF loop.
 */
export function useMousePosition() {
  const posRef = useRef<MousePosition>({ x: 0, y: 0, nx: 0, ny: 0 })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      posRef.current = {
        x: e.clientX,
        y: e.clientY,
        nx: e.clientX / window.innerWidth,
        ny: e.clientY / window.innerHeight,
      }
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  return posRef
}
```

- [ ] **Step 2: Write CustomCursor component**

Create `src/components/cursor/CustomCursor.tsx`:

```typescript
'use client'
import { useEffect, useRef } from 'react'

type CursorState = 'default' | 'hover-image' | 'hover-link'

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<CursorState>('default')
  const targetRef = useRef({ x: 0, y: 0 })
  const currentRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const cursor = cursorRef.current
    if (!cursor) return

    const LERP_FACTOR = 0.08

    const onMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY }
    }

    const onMouseEnterImage = () => {
      stateRef.current = 'hover-image'
    }
    const onMouseLeaveImage = () => {
      stateRef.current = 'default'
    }
    const onMouseEnterLink = () => {
      stateRef.current = 'hover-link'
    }
    const onMouseLeaveLink = () => {
      stateRef.current = 'default'
    }

    // Delegate: listen on document, filter by data-cursor attr
    const onEnter = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-cursor="image"]')) onMouseEnterImage()
      else if (target.closest('a, button, [data-cursor="link"]')) onMouseEnterLink()
    }
    const onLeave = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-cursor="image"]')) onMouseLeaveImage()
      else if (target.closest('a, button, [data-cursor="link"]')) onMouseLeaveLink()
    }

    window.addEventListener('mousemove', onMouseMove, { passive: true })
    document.addEventListener('mouseover', onEnter)
    document.addEventListener('mouseout', onLeave)

    const tick = () => {
      // LERP toward target
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * LERP_FACTOR
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * LERP_FACTOR

      cursor.style.transform = `translate(${currentRef.current.x}px, ${currentRef.current.y}px)`

      // Apply state classes
      cursor.dataset.state = stateRef.current
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseover', onEnter)
      document.removeEventListener('mouseout', onLeave)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[9999] -translate-x-1/2 -translate-y-1/2"
      style={{ willChange: 'transform' }}
    >
      {/* Default: small circle */}
      <div
        className="cursor-dot rounded-full transition-all duration-300"
        style={{
          width: 8,
          height: 8,
          background: 'var(--color-ink)',
          mixBlendMode: 'difference',
        }}
        data-cursor-dot
      />
    </div>
  )
}
```

Add cursor CSS to `globals.css`:

```css
/* Cursor states */
[data-state="hover-image"] [data-cursor-dot] {
  width: 48px !important;
  height: 48px !important;
}

[data-state="hover-link"] [data-cursor-dot] {
  width: 32px !important;
  height: 2px !important;
  border-radius: 1px !important;
}
```

- [ ] **Step 3: Mount cursor in layout**

In `src/app/layout.tsx`, import and add `<CustomCursor />` inside `<body>`:

```typescript
import { CustomCursor } from '@/components/cursor/CustomCursor'

// Inside <body>:
<CustomCursor />
{children}
```

- [ ] **Step 4: Verify cursor in browser**

```bash
npm run dev
```

Move mouse — should see a small dark dot following with slight delay. System cursor invisible.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMousePosition.ts src/components/cursor/ src/app/layout.tsx src/app/globals.css
git commit -m "feat: custom cursor with LERP and state machine (default/image/link)"
```

---

## Task 5: GLSL Shaders

**Files:**
- Create: `src/components/canvas/shaders/vertex.glsl`
- Create: `src/components/canvas/shaders/fragment.glsl`
- Create: `src/types/glsl.d.ts`

- [ ] **Step 1: Write TypeScript declaration for .glsl imports**

Create `src/types/glsl.d.ts`:

```typescript
declare module '*.glsl' {
  const content: string
  export default content
}
```

- [ ] **Step 2: Write vertex shader**

Create `src/components/canvas/shaders/vertex.glsl`:

```glsl
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

- [ ] **Step 3: Write fragment shader**

Create `src/components/canvas/shaders/fragment.glsl`:

```glsl
uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMouse;       /* Normalized screen coords 0–1 */
uniform float uDistortion; /* 0 = off, 1 = full */
uniform float uGrain;      /* 0 = off, 1 = full */

varying vec2 vUv;

/* Pseudo-random for film grain */
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

/* 2D rotation matrix */
mat2 rotate2D(float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
  vec2 uv = vUv;

  /* — Liquid distortion near cursor — */
  float dist = distance(uv, uMouse);
  float radius = 0.25;
  float strength = uDistortion * 0.04;

  if (dist < radius) {
    float falloff = 1.0 - smoothstep(0.0, radius, dist);
    vec2 dir = normalize(uv - uMouse);
    float angle = falloff * strength * 20.0;
    uv = uMouse + rotate2D(angle) * (uv - uMouse);
    uv += dir * falloff * strength;
  }

  /* — Film grain — */
  float grain = random(vUv + vec2(uTime * 0.1, uTime * 0.07));
  grain = (grain - 0.5) * 0.08 * uGrain;

  vec4 texColor = texture2D(uTexture, uv);
  texColor.rgb += grain;
  texColor.rgb = clamp(texColor.rgb, 0.0, 1.0);

  gl_FragColor = texColor;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/canvas/shaders/ src/types/glsl.d.ts
git commit -m "feat: GLSL shaders — film grain + liquid cursor distortion"
```

---

## Task 6: Three.js Canvas + WebGL Setup

**Files:**
- Create: `src/lib/three-utils.ts`
- Create: `src/components/canvas/WebGLCanvas.tsx`

- [ ] **Step 1: Write three-utils helpers**

Create `src/lib/three-utils.ts`:

```typescript
import * as THREE from 'three'

/**
 * Load a texture from a URL. Returns a promise.
 */
export function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader()
    loader.load(url, resolve, undefined, reject)
  })
}

/**
 * Dispose a Three.js object and all its children recursively.
 */
export function disposeObject(obj: THREE.Object3D) {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose()
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose())
      } else {
        child.material.dispose()
      }
    }
  })
}
```

- [ ] **Step 2: Write WebGLCanvas component**

Create `src/components/canvas/WebGLCanvas.tsx`:

```typescript
'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface WebGLCanvasProps {
  onSceneReady?: (scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer) => void
}

export function WebGLCanvas({ onSceneReady }: WebGLCanvasProps) {
  const mountRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = mountRef.current
    if (!canvas) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#f2ede6')

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    )
    camera.position.set(0, 0, 5)

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', handleResize)

    // Render loop
    let animId: number
    const tick = () => {
      animId = requestAnimationFrame(tick)
      renderer.render(scene, camera)
    }
    tick()

    onSceneReady?.(scene, camera, renderer)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
    }
  }, [onSceneReady])

  return (
    <canvas
      ref={mountRef}
      className="webgl"
      aria-label="Galería visual interactiva de Pescadora"
    />
  )
}
```

- [ ] **Step 3: Add WebGLCanvas to page.tsx temporarily to test**

Replace `src/app/page.tsx`:

```typescript
import { WebGLCanvas } from '@/components/canvas/WebGLCanvas'

export default function Home() {
  return (
    <>
      <WebGLCanvas />
      <main style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-geist-sans)', letterSpacing: '0.3em', fontWeight: 200 }}>
          PESCADORA
        </h1>
      </main>
    </>
  )
}
```

- [ ] **Step 4: Verify canvas renders**

```bash
npm run dev
```

Open `http://localhost:3000` — crema background with "PESCADORA" text centered. Canvas is rendering behind. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/three-utils.ts src/components/canvas/WebGLCanvas.tsx src/app/page.tsx
git commit -m "feat: Three.js WebGL canvas — scene, camera, renderer, resize handler"
```

---

## Task 7: Radial Photo Gallery (Three.js)

**Files:**
- Create: `src/hooks/useScrollProgress.ts`
- Create: `src/components/canvas/PhotoPlane.tsx`
- Create: `src/components/canvas/RadialGallery.tsx`

- [ ] **Step 1: Write useScrollProgress hook**

Create `src/hooks/useScrollProgress.ts`:

```typescript
'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Returns a ref containing scroll progress (0–1) for a given section element.
 */
export function useScrollProgress(triggerSelector: string) {
  const progressRef = useRef(0)

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: triggerSelector,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (self) => {
        progressRef.current = self.progress
      },
    })
    return () => trigger.kill()
  }, [triggerSelector])

  return progressRef
}
```

- [ ] **Step 2: Write PhotoPlane**

Create `src/components/canvas/PhotoPlane.tsx`:

```typescript
import * as THREE from 'three'
import vertexShader from './shaders/vertex.glsl'
import fragmentShader from './shaders/fragment.glsl'
import { loadTexture } from '@/lib/three-utils'

interface PhotoPlaneOptions {
  url: string
  position: THREE.Vector3
  scene: THREE.Scene
}

export interface PhotoPlaneInstance {
  mesh: THREE.Mesh
  update: (time: number, mouseNx: number, mouseNy: number, distortionStrength: number) => void
  dispose: () => void
}

export async function createPhotoPlane({
  url,
  position,
  scene,
}: PhotoPlaneOptions): Promise<PhotoPlaneInstance> {
  const texture = await loadTexture(url)

  // Maintain aspect ratio: default to 4:3
  const aspect = texture.image ? texture.image.width / texture.image.height : 4 / 3
  const height = 1.5
  const width = height * aspect

  const geometry = new THREE.PlaneGeometry(width, height)
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTexture: { value: texture },
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uDistortion: { value: 0 },
      uGrain: { value: 0.5 },
    },
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(position)
  scene.add(mesh)

  const update = (time: number, mouseNx: number, mouseNy: number, distortion: number) => {
    material.uniforms.uTime.value = time
    material.uniforms.uMouse.value.set(mouseNx, 1 - mouseNy)
    material.uniforms.uDistortion.value = distortion
  }

  const dispose = () => {
    geometry.dispose()
    material.dispose()
    texture.dispose()
    scene.remove(mesh)
  }

  return { mesh, update, dispose }
}
```

- [ ] **Step 3: Write RadialGallery**

Create `src/components/canvas/RadialGallery.tsx`:

```typescript
'use client'
import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { createPhotoPlane, type PhotoPlaneInstance } from './PhotoPlane'
import { useMousePosition } from '@/hooks/useMousePosition'
import { registry } from '@/lib/registry'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const MAX_VISIBLE = 20 // Limit planes for GPU budget
const ARC_RADIUS = 4
const ARC_SPREAD = Math.PI * 1.2 // Total arc angle

interface RadialGalleryProps {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  sectionSelector: string
}

export function RadialGallery({ scene, camera, sectionSelector }: RadialGalleryProps) {
  const mouseRef = useMousePosition()
  const planesRef = useRef<PhotoPlaneInstance[]>([])
  const clockRef = useRef(new THREE.Clock())
  const scrollProgressRef = useRef(0)
  const rafRef = useRef<number>(0)

  const init = useCallback(async () => {
    const photos = registry.photos.slice(0, MAX_VISIBLE)

    const planes = await Promise.all(
      photos.map((photo, i) => {
        const angle = (i / (photos.length - 1)) * ARC_SPREAD - ARC_SPREAD / 2
        const x = Math.sin(angle) * ARC_RADIUS
        const z = -Math.cos(angle) * ARC_RADIUS + ARC_RADIUS
        return createPhotoPlane({
          url: photo.url,
          position: new THREE.Vector3(x, 0, z),
          scene,
        })
      })
    )
    planesRef.current = planes
  }, [scene])

  useEffect(() => {
    init()

    // Scroll-driven camera pan
    const trigger = ScrollTrigger.create({
      trigger: sectionSelector,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1,
      onUpdate: (self) => {
        scrollProgressRef.current = self.progress
        // Move camera along the arc
        const angle = (self.progress - 0.5) * ARC_SPREAD
        gsap.to(camera.position, {
          x: Math.sin(angle) * ARC_RADIUS * 0.7,
          z: 5 + self.progress * 2,
          duration: 0.3,
          overwrite: true,
        })
        camera.lookAt(Math.sin(angle) * ARC_RADIUS * 0.3, 0, 0)
      },
    })

    // Animation loop
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick)
      const t = clockRef.current.getElapsedTime()
      const { nx, ny } = mouseRef.current
      planesRef.current.forEach((p) => p.update(t, nx, ny, 0.6))
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      trigger.kill()
      cancelAnimationFrame(rafRef.current)
      planesRef.current.forEach((p) => p.dispose())
      planesRef.current = []
    }
  }, [init, sectionSelector, camera, mouseRef])

  return null // Renders into the Three.js scene, not the DOM
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useScrollProgress.ts src/components/canvas/PhotoPlane.tsx src/components/canvas/RadialGallery.tsx
git commit -m "feat: radial Three.js gallery — arc layout, scroll-driven camera, shader planes"
```

---

## Task 8: Wordmark + Hero Section

**Files:**
- Create: `src/components/ui/Wordmark.tsx`
- Create: `src/components/sections/Hero.tsx`

- [ ] **Step 1: Write Wordmark**

Create `src/components/ui/Wordmark.tsx`:

```typescript
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={className}
      style={{
        fontFamily: 'var(--font-geist-sans)',
        fontWeight: 200,
        letterSpacing: '0.3em',
        textTransform: 'uppercase',
        fontSize: 'clamp(2rem, 6vw, 6rem)',
        color: 'var(--color-ink)',
        lineHeight: 1,
      }}
    >
      Pescadora
    </span>
  )
}
```

- [ ] **Step 2: Write Hero section**

Create `src/components/sections/Hero.tsx`:

```typescript
'use client'
import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import ScrollTrigger from 'gsap/ScrollTrigger'
import { Wordmark } from '@/components/ui/Wordmark'

gsap.registerPlugin(ScrollTrigger)

export function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const wordmarkRef = useRef<HTMLDivElement>(null)
  const taglineRef = useRef<HTMLParagraphElement>(null)
  const indicatorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Wordmark slides up on scroll
      gsap.to(wordmarkRef.current, {
        y: '-20vh',
        opacity: 0.3,
        ease: 'none',
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      })

      // Scroll indicator fades out immediately on first scroll
      gsap.to(indicatorRef.current, {
        opacity: 0,
        y: 10,
        scrollTrigger: {
          trigger: heroRef.current,
          start: 'top top',
          end: '5% top',
          scrub: true,
        },
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <section
      ref={heroRef}
      id="hero"
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div ref={wordmarkRef} style={{ textAlign: 'center' }}>
        <Wordmark />
        <p
          ref={taglineRef}
          style={{
            marginTop: '1.5rem',
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 300,
            fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
            letterSpacing: '0.2em',
            color: 'var(--color-text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Fotografía · Video · México
        </p>
      </div>

      {/* Scroll indicator */}
      <div
        ref={indicatorRef}
        style={{ position: 'absolute', bottom: '2rem', left: '50%', transform: 'translateX(-50%)' }}
        aria-hidden="true"
      >
        <div
          style={{
            width: 1,
            height: 60,
            background: 'var(--color-border)',
            margin: '0 auto',
          }}
        />
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/Wordmark.tsx src/components/sections/Hero.tsx
git commit -m "feat: Hero section — wordmark, tagline, scroll indicator, GSAP parallax"
```

---

## Task 9: Foto Section (DOM wrapper for WebGL Gallery)

**Files:**
- Create: `src/components/sections/FotoSection.tsx`

- [ ] **Step 1: Write FotoSection**

Create `src/components/sections/FotoSection.tsx`:

```typescript
'use client'
import { useRef } from 'react'
import { getAllProjects } from '@/lib/registry'

export function FotoSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const projects = getAllProjects()

  return (
    <section
      ref={sectionRef}
      id="foto"
      style={{
        height: `${projects.length * 60}vh`, // Tall section drives scroll camera
        position: 'relative',
      }}
    >
      {/* Sticky label that updates with scroll — simplified for now */}
      <div
        style={{
          position: 'sticky',
          top: '50vh',
          transform: 'translateY(-50%)',
          padding: '0 2rem',
          pointerEvents: 'none',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          Fotografía
        </span>
      </div>
    </section>
  )
}
```

Note: The actual gallery renders in the Three.js canvas. This section provides the scroll height and sticky label only.

- [ ] **Step 2: Commit**

```bash
git add src/components/sections/FotoSection.tsx
git commit -m "feat: FotoSection — scroll container for WebGL radial gallery"
```

---

## Task 10: Video Section

**Files:**
- Create: `src/components/sections/VideoSection.tsx`

- [ ] **Step 1: Write VideoSection**

Create `src/components/sections/VideoSection.tsx`:

```typescript
'use client'
import { useRef, useState } from 'react'
import { registry } from '@/lib/registry'
import type { VideoEntry } from '@/types/media'

function VideoTile({ video }: { video: VideoEntry }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleMouseEnter = () => {
    videoRef.current?.play()
  }
  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  return (
    <>
      <div
        data-cursor="image"
        onClick={() => setIsOpen(true)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'relative',
          aspectRatio: '16/9',
          overflow: 'hidden',
          cursor: 'none',
          background: '#0a0a0a',
        }}
      >
        <video
          ref={videoRef}
          src={video.url}
          muted
          loop
          playsInline
          preload="none"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--color-video-text)',
            opacity: 0,
            transition: 'opacity 0.3s',
          }}
          className="video-title"
        >
          {video.title}
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setIsOpen(false)}
        >
          <video
            src={video.url}
            autoPlay
            controls
            style={{ maxWidth: '90vw', maxHeight: '90vh' }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

export function VideoSection() {
  return (
    <section
      id="video"
      style={{
        background: 'var(--color-video-bg)',
        padding: 'var(--space-16) var(--space-4)',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 200,
            fontSize: 'clamp(0.75rem, 1.5vw, 1rem)',
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: 'var(--color-video-text)',
            opacity: 0.5,
            marginBottom: 'var(--space-8)',
          }}
        >
          Video
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1px',
          }}
        >
          {registry.videos.map((video) => (
            <VideoTile key={video.id} video={video} />
          ))}
        </div>
      </div>
    </section>
  )
}
```

Add hover CSS for video titles to `globals.css`:

```css
div:hover > .video-title {
  opacity: 1 !important;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sections/VideoSection.tsx src/app/globals.css
git commit -m "feat: VideoSection — dark grid, hover autoplay, fullscreen overlay"
```

---

## Task 11: Sobre + Servicios + Contacto Sections

**Files:**
- Create: `src/components/sections/SobreSection.tsx`
- Create: `src/components/sections/ServiciosSection.tsx`
- Create: `src/components/sections/ContactoSection.tsx`

- [ ] **Step 1: Write SobreSection**

Create `src/components/sections/SobreSection.tsx`:

```typescript
export function SobreSection() {
  return (
    <section
      id="sobre"
      style={{
        padding: 'var(--space-16) var(--space-4)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <p
          style={{
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 300,
            fontSize: 'clamp(1.4rem, 2.5vw, 2.2rem)',
            lineHeight: 1.4,
            color: 'var(--color-text)',
            letterSpacing: '-0.01em',
          }}
        >
          Hacemos imágenes que no se olvidan.
        </p>
        <p
          style={{
            marginTop: 'var(--space-6)',
            fontFamily: 'var(--font-geist-sans)',
            fontWeight: 300,
            fontSize: 'clamp(1rem, 1.8vw, 1.4rem)',
            lineHeight: 1.6,
            color: 'var(--color-text-muted)',
          }}
        >
          Trabajamos con marcas que entienden que lo visual no es decoración: es argumento.
          Cada encuadre es una decisión. Cada luz, una postura.
        </p>
        <p
          style={{
            marginTop: 'var(--space-4)',
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.75rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
          }}
        >
          México — Activos donde el trabajo lo exige
        </p>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Write ServiciosSection**

Create `src/components/sections/ServiciosSection.tsx`:

```typescript
const SERVICIOS = [
  'Fotografía de Marca',
  'Dirección de Arte',
  'Video de Campaña',
  'Fotografía de Producto',
  'Fotografía Gastronómica',
  'Fotografía de Locación',
]

export function ServiciosSection() {
  return (
    <section
      id="servicios"
      style={{
        padding: 'var(--space-16) var(--space-4)',
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            display: 'block',
            marginBottom: 'var(--space-8)',
          }}
        >
          Servicios
        </span>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 0,
          }}
        >
          {SERVICIOS.map((servicio, i) => (
            <div
              key={servicio}
              style={{
                padding: 'var(--space-3) 0',
                borderTop: '1px solid var(--color-border)',
                borderRight: i % 2 === 0 ? '1px solid var(--color-border)' : 'none',
                paddingRight: i % 2 === 0 ? 'var(--space-4)' : 0,
                paddingLeft: i % 2 === 1 ? 'var(--space-4)' : 0,
                fontFamily: 'var(--font-geist-sans)',
                fontWeight: 300,
                fontSize: 'clamp(1rem, 1.5vw, 1.2rem)',
                color: 'var(--color-text)',
                letterSpacing: '-0.01em',
              }}
            >
              {servicio}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Write ContactoSection**

Create `src/components/sections/ContactoSection.tsx`:

```typescript
'use client'
import { useState } from 'react'

export function ContactoSection() {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [sending, setSending] = useState(false)

  const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER ?? ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    const text = encodeURIComponent(
      `Hola, soy ${nombre} (${email}).\n\n${mensaje}`
    )
    const url = `https://wa.me/${WA_NUMBER}?text=${text}`

    setTimeout(() => {
      window.open(url, '_blank')
      setSending(false)
      setNombre('')
      setEmail('')
      setMensaje('')
    }, 1500)
  }

  const inputStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--color-border)',
    padding: 'var(--space-2) 0',
    fontFamily: 'var(--font-geist-sans)',
    fontWeight: 300,
    fontSize: '1rem',
    color: 'var(--color-text)',
    outline: 'none',
    marginBottom: 'var(--space-4)',
    cursor: 'text',
  }

  return (
    <section
      id="contacto"
      style={{
        padding: 'var(--space-16) var(--space-4)',
        background: 'var(--color-bg)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <span
          style={{
            fontFamily: 'var(--font-geist-mono)',
            fontSize: '0.7rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--color-text-muted)',
            display: 'block',
            marginBottom: 'var(--space-8)',
          }}
        >
          Contacto
        </span>

        <form onSubmit={handleSubmit}>
          <input
            style={inputStyle}
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <textarea
            style={{ ...inputStyle, resize: 'none', minHeight: '80px' }}
            placeholder="Mensaje"
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={sending}
            data-cursor="link"
            style={{
              marginTop: 'var(--space-2)',
              background: 'transparent',
              border: 'none',
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.75rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-text)',
              cursor: 'none',
              padding: 0,
              transition: 'opacity 0.2s',
              opacity: sending ? 0.5 : 1,
            }}
          >
            {sending ? 'Abriendo WhatsApp...' : 'Enviar →'}
          </button>
        </form>

        <div style={{ marginTop: 'var(--space-12)', borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)' }}>
          <p
            style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '0.7rem',
              letterSpacing: '0.15em',
              color: 'var(--color-text-muted)',
            }}
          >
            @pescadora
          </p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/sections/SobreSection.tsx src/components/sections/ServiciosSection.tsx src/components/sections/ContactoSection.tsx
git commit -m "feat: Sobre, Servicios, Contacto sections — manifesto copy, spartan list, WhatsApp form"
```

---

## Task 12: Compose Full Page + Wire WebGL Gallery

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write the full page composition**

Replace `src/app/page.tsx`:

```typescript
'use client'
import { useCallback, useState } from 'react'
import * as THREE from 'three'
import { WebGLCanvas } from '@/components/canvas/WebGLCanvas'
import { RadialGallery } from '@/components/canvas/RadialGallery'
import { Hero } from '@/components/sections/Hero'
import { FotoSection } from '@/components/sections/FotoSection'
import { VideoSection } from '@/components/sections/VideoSection'
import { SobreSection } from '@/components/sections/SobreSection'
import { ServiciosSection } from '@/components/sections/ServiciosSection'
import { ContactoSection } from '@/components/sections/ContactoSection'

interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
}

export default function Home() {
  // Use state (not ref) so that a re-render is triggered after the canvas
  // initializes — this is what makes RadialGallery mount correctly.
  const [sceneCtx, setSceneCtx] = useState<SceneContext | null>(null)

  const handleSceneReady = useCallback(
    (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
      setSceneCtx({ scene, camera })
    },
    []
  )

  return (
    <>
      <WebGLCanvas onSceneReady={handleSceneReady} />
      {sceneCtx && (
        <RadialGallery
          scene={sceneCtx.scene}
          camera={sceneCtx.camera}
          sectionSelector="#foto"
        />
      )}
      <main>
        <Hero />
        <FotoSection />
        <VideoSection />
        <SobreSection />
        <ServiciosSection />
        <ContactoSection />
      </main>
    </>
  )
}
```

- [ ] **Step 2: Run full build and check for TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with no TypeScript errors. Fix any type errors before continuing.

- [ ] **Step 3: Verify full page in browser**

```bash
npm run dev
```

Scroll through the full page. Verify:
- Hero loads with wordmark
- Canvas renders (crema background)
- Video section appears dark with tiles
- Sobre / Servicios / Contacto text sections appear
- Custom cursor visible throughout
- No console errors

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: compose full single-page layout — Hero → Foto → Video → Sobre → Servicios → Contacto"
```

---

## Task 13: Mobile Fallback + Performance

**Files:**
- Modify: `src/components/canvas/WebGLCanvas.tsx`
- Modify: `src/components/sections/FotoSection.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Disable canvas on mobile**

In `WebGLCanvas.tsx`, wrap the `useEffect` init with a screen width check:

```typescript
// At the top of useEffect:
if (window.innerWidth < 768) return // No WebGL on mobile
```

Also add to `globals.css`:
```css
@media (max-width: 767px) {
  canvas.webgl {
    display: none;
  }
}
```

- [ ] **Step 2: CSS fallback gallery for mobile**

In `FotoSection.tsx`, add a CSS photo grid that shows on mobile only:

```typescript
import Image from 'next/image'
import { registry } from '@/lib/registry'

// Inside FotoSection, after the sticky label div:
<div
  style={{ display: 'none' }}
  className="mobile-gallery"
>
  {registry.photos.slice(0, 20).map((photo) => (
    <div key={photo.id} style={{ position: 'relative', aspectRatio: '4/3' }}>
      <Image src={photo.url} alt={photo.alt} fill style={{ objectFit: 'cover' }} />
    </div>
  ))}
</div>
```

Add to `globals.css`:
```css
@media (max-width: 767px) {
  .mobile-gallery {
    display: grid !important;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    padding: 2rem 1rem;
  }

  /* Reduce foto section height on mobile — no scroll camera */
  #foto {
    height: auto !important;
  }
}
```

- [ ] **Step 3: Configure next.config for image domains**

In `next.config.ts`, add image config for local paths (no external domains needed since all assets are in `public/`).

- [ ] **Step 4: Verify production build performance**

```bash
npm run build && npm run start
```

Open `http://localhost:3000` and run Lighthouse via Chrome DevTools.
Target: Performance > 80 desktop, > 60 mobile.
Note: Do NOT use `npx serve out` — App Router outputs to `.next/`, not `out/`. Use `npm run start` to serve the production build.

- [ ] **Step 5: Commit**

```bash
git add src/components/canvas/WebGLCanvas.tsx src/components/sections/FotoSection.tsx src/app/globals.css next.config.ts
git commit -m "feat: mobile fallback — disable WebGL below 768px, CSS photo grid"
```

---

## Task 14: Final Polish + Lint

**Files:** All

- [ ] **Step 1: Run ESLint**

```bash
npm run lint
```

Fix all errors. Warnings are acceptable.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Zero errors required.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Build must succeed cleanly.

- [ ] **Step 4: Final browser walkthrough**

Check on desktop:
- [ ] Cursor visible and smooth
- [ ] Hero wordmark + grain canvas visible
- [ ] Scroll into Foto — camera moves, photos appear
- [ ] Video section dark, hover activates video, click opens fullscreen
- [ ] Sobre text readable, large type
- [ ] Servicios 2-col list visible
- [ ] Contact form fills and button opens WhatsApp
- [ ] No console errors

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Pescadora portfolio — complete single-page WebGL portfolio"
```

---

## Open Items (non-blocking)

- Replace `NEXT_PUBLIC_WA_NUMBER=521234567890` with real WhatsApp number in `.env.local` (and in Vercel env vars when deploying)
- Add real Instagram handle to `ContactoSection.tsx`
- Confirm and expand `SERVICIOS` array in `ServiciosSection.tsx`
- Add poster images for video tiles (update `media_registry.json` manually or re-run script with poster detection)
- Deploy to Vercel: `npx vercel` (or connect GitHub repo in dashboard)
