# Pescadora — Portfolio Design Spec
**Date:** 2026-03-17
**Status:** Approved for implementation

---

## 1. Project Overview

**Pescadora** is a creative studio specializing in brand photography and campaign video production. This is their primary portfolio site — a single-page cinematic experience designed to compete at the FWA / Awwwards level.

**Core design principle:** The work is the interface. No decoration. No generic templates. Every technical decision serves the photographs and videos.

---

## 2. Architecture

### 2.1 Site Structure

Single-page vertical scroll — no sub-routes, no navigation between pages.

```
01 HERO       — WebGL canvas fullscreen · wordmark · grain shader · custom cursor
02 FOTO       — Radial Three.js gallery · ~100 photos · 13 projects · shader distortion
03 VIDEO      — Cinematic grid · 15 .mov files · autoplay on hover · no visible controls
04 SOBRE      — Manifesto text · large typography · no decorative imagery
05 SERVICIOS  — Spartan list · service categories · no icons
06 CONTACTO   — Direct email · social links · minimal form
```

### 2.2 Technical Layers

**Layer 1 — WebGL Canvas (Three.js)**
- Renders beneath the DOM, `position: fixed`, `z-index: 0`
- Photos mounted as `PlaneGeometry` with `ShaderMaterial`
- Each plane receives cursor position as `u_mouse` uniform
- Scroll position drives camera or plane transforms via GSAP
- Graceful degradation on mobile: canvas hidden, CSS gallery shown

**Layer 2 — DOM (Next.js React)**
- Text, navigation, video section, contact form, custom cursor element
- `pointer-events` sit above canvas for interactivity
- Server Components by default; `'use client'` only for Three.js canvas and cursor

**Layer 3 — GLSL Shaders**
- `vertexShader.glsl`: Standard pass-through with UV coordinates
- `fragmentShader.glsl`: Two effects, time-gated:
  - **Film grain**: Pseudo-random noise function driven by `u_time`
  - **Liquid distortion**: Refraction-style distortion in a radius around `u_mouse`, activated on proximity

### 2.3 Data — `media_registry.json`

Single source of truth for all media assets. Generated at setup, never hand-edited.

```json
{
  "photos": [
    {
      "id": "uuid-v4",
      "project": "GAC",
      "url": "/media/GAC/GAC-02.jpg",
      "alt": "GAC — Campaign Photography",
      "tags": ["brand", "automotive"]
    }
  ],
  "videos": [
    {
      "id": "uuid-v4",
      "title": "NOMA MEZCAL",
      "url": "/media/noma-mezcal-h1.mov",
      "poster": "/media/stills/noma-mezcal-poster.jpg",
      "tags": ["campaign", "beverage"]
    }
  ]
}
```

---

## 3. Visual Design

### 3.1 Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#f2ede6` | Page background, canvas background |
| `--color-text` | `#2a2520` | All body text |
| `--color-text-muted` | `#8a8078` | Labels, metadata, secondary text |
| `--color-border` | `#d0c8be` | Dividers, form borders |
| `--color-ink` | `#1a1510` | Wordmark, strong headings |

No accent color. Hierarchy through size, weight, and spacing only.

### 3.2 Typography

- **Wordmark "PESCADORA":** Custom SVG or text rendered in a geometric sans at tracking `0.3em`, weight 300. No external font if a system stack achieves this; otherwise `Geist Sans` via `next/font`.
- **Body / UI:** Geist Sans, weight 300–400
- **Code / Metadata:** Geist Mono (timestamps, project codes)
- **Scale:** Golden ratio — `0.75rem → 1rem → 1.618rem → 2.618rem → 4.236rem`
- **Spacing:** 8px base grid, multiples of 8

### 3.3 Cursor

Custom cursor replaces the OS pointer globally:
- **Default state:** 8px circle, `mix-blend-mode: difference`, crema
- **Image hover state:** Expands to 48px, blends with image magnetically (LERP `α=0.08`)
- **Link/button hover:** Morphs to a thin horizontal line
- Implementation: DOM element absolutely positioned, updated via `mousemove` with `requestAnimationFrame`

---

## 4. Section Design

### 4.1 Hero

- Full-viewport canvas, background crema `#f2ede6`
- Wordmark "PESCADORA" centered — pure text, `letter-spacing: 0.3em`, weight 200, size clamp(`3rem`, `8vw`, `7rem`)
- Tagline below: one short line, weight 300, muted color
- Film grain shader active from page load
- Subtle scroll indicator: single downward-pointing line, fades out at first scroll interaction

### 4.2 Foto Section

**Radial Scroll Gallery in Three.js:**
- Photos arranged in a curved arc in 3D space (radius ~3 units)
- Camera orbits along the arc as the user scrolls
- Photos in the center of view are sharp; periphery slightly scale-reduced
- On cursor proximity: liquid distortion shader activates on that plane
- Project label appears in DOM (absolute positioned, synced via `useRef`) when photo is centered

**Mobile fallback:** Standard CSS masonry grid, no WebGL.

### 4.3 Video Section

- Dark subsection — background flips to `#1a1510`, text to `#f2ede6` — for contrast with photo section
- Grid of video tiles: 2 columns desktop, 1 column mobile
- Each tile: hover → video `autoplay muted loop playsInline`, title fades in
- No play button visible in default state — video activates on hover only
- Click to open fullscreen overlay with audio

### 4.4 Sobre Pescadora

Generated copy — high-end agency voice. Proposed text:

> **Pescadora.**
> Hacemos imágenes que no se olvidan.
>
> Trabajamos con marcas que entienden que lo visual no es decoración: es argumento. Cada encuadre es una decisión. Cada luz, una postura.
>
> Con sede en México. Activos en donde el trabajo lo exige.

Single column, large type (`clamp(1.5rem, 3vw, 2.5rem)`), generous line-height (`1.4`). No photos. No background texture. Just the words.

### 4.5 Servicios

Spartan list — no icons, no cards, no decorative borders.

```
Fotografía de Marca
Dirección de Arte
Video de Campaña
Fotografía de Producto
Fotografía Gastronómica
Fotografía de Locación
```

*(User to confirm final list and add missing services)*

Layout: Two-column at desktop, single at mobile. Category names at `1.1rem`, weight 400. A thin `1px` rule separates each item from the next. No hover effects beyond a subtle text color shift.

### 4.6 Contacto

```
hola@pescadora.mx          (placeholder — user to confirm)
@pescadora                 (Instagram)
[Nombre]  [Email]
[Mensaje]
[Enviar →]
```

Form is minimal: 3 fields, no floating labels, no animations. Submit generates a pre-filled WhatsApp URL (`https://wa.me/...?text=...`) and opens it in a new tab. No server-side sending required. The WhatsApp number is stored as an environment variable `NEXT_PUBLIC_WA_NUMBER` — to be configured later. On click: button text changes to *"Abriendo WhatsApp..."* for 1.5s, then resets.

---

## 5. Interaction Model

| Interaction | Behavior |
|-------------|----------|
| Scroll in Hero | Film grain intensifies slightly; wordmark translates up |
| Enter Foto section | Three.js planes animate in from behind the camera |
| Cursor near photo (WebGL) | Liquid distortion ripples outward from cursor position |
| Scroll through Foto | Camera orbits along the arc; center photo label updates in DOM |
| Hover video tile | Video begins autoplay, title appears |
| Click video tile | Fullscreen overlay with audio, `Escape` to close |
| Cursor on any interactive element | Cursor morphs per element type |

---

## 6. Performance & Accessibility

- **WebGL budget:** Max 30 PlaneGeometry instances visible at once; off-screen planes disposed
- **Video:** Never autoplay with audio; `preload="none"` on initial load; lazy load on scroll
- **Images:** `next/image` for all static stills; WebGL loads raw URLs
- **Mobile:** Canvas disabled below `768px`; CSS fallback gallery activated
- **60fps target:** GSAP with `will-change` only where necessary; no layout thrashing in render loop
- **SEO:** Static page, meta tags via `generateMetadata()`, all text in DOM (not canvas)
- **Accessibility:** `aria-label` on canvas section, all images have `alt`, form fully keyboard-navigable

---

## 7. File Structure

```
D:/Pescadora/
├── CLAUDE.md                        ← Rules for Claude Code
├── media_registry.json              ← Generated asset manifest
├── public/
│   └── media/
│       ├── Contenido/               ← Photo projects (copied from source)
│       └── videos/                  ← .mov files (copied from root)
├── src/
│   ├── app/
│   │   ├── layout.tsx               ← Root layout, cursor injection, fonts
│   │   ├── page.tsx                 ← Single page — all sections composed here
│   │   └── actions.ts               ← Server Action for contact form
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── WebGLCanvas.tsx      ← Three.js setup, render loop, resize
│   │   │   ├── RadialGallery.tsx    ← Photo plane manager
│   │   │   └── shaders/
│   │   │       ├── vertex.glsl
│   │   │       └── fragment.glsl
│   │   ├── cursor/
│   │   │   └── CustomCursor.tsx     ← DOM cursor, LERP, state machine
│   │   ├── sections/
│   │   │   ├── Hero.tsx
│   │   │   ├── FotoSection.tsx
│   │   │   ├── VideoSection.tsx
│   │   │   ├── SobreSection.tsx
│   │   │   ├── ServiciosSection.tsx
│   │   │   └── ContactoSection.tsx
│   │   └── ui/
│   │       └── Wordmark.tsx
│   ├── hooks/
│   │   ├── useMousePosition.ts      ← Shared cursor position with RAF
│   │   └── useScrollProgress.ts     ← Scroll position normalized 0–1
│   ├── lib/
│   │   ├── registry.ts              ← Reads media_registry.json
│   │   └── three-utils.ts           ← PlaneGeometry helpers, texture loader
│   └── styles/
│       └── globals.css              ← CSS variables, base reset, cursor hide
├── scripts/
│   └── generate-registry.mjs        ← Node script: scans /public/media → JSON
└── docs/
    └── superpowers/specs/
        └── 2026-03-17-pescadora-portfolio-design.md
```

---

## 8. CLAUDE.md Rules (to be written at project init)

### Always Do
- Wrap static images in `next/image` unless they are loaded into Three.js textures
- Clean up Three.js geometries, materials, and textures in `useEffect` cleanup functions
- Clean up GSAP ScrollTriggers in `useEffect` cleanup
- Use TypeScript strict mode — no `any`, no `@ts-ignore`
- Keep shaders in `.glsl` files, never as template strings

### Ask First
- Before modifying `media_registry.json` (single source of truth)
- Before adding any npm dependency not in the approved stack
- Before changing the scroll architecture (affects all sections)

### Never Do
- Never alter `media_registry.json` manually during development
- Never add emoji to source files
- Never use `position: absolute` on the WebGL canvas (must be `fixed`)
- Never commit `.env*.local` files
- Never add external icon libraries other than `lucide-react`

---

## 9. Open Items (user to confirm)

- [ ] WhatsApp number for contact form (`NEXT_PUBLIC_WA_NUMBER`)
- [ ] Instagram handle
- [ ] Final services list (base list in spec, user to confirm additions)
- [ ] Deployment target (Vercel assumed)
- [x] Hero: WebGL canvas + grain shader (no showreel video)
- [x] Contact transport: WhatsApp deep link (no server-side email)
