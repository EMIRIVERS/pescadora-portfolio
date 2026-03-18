# Pescadora Portfolio Redesign — Awwwards-Level Spec

**Date:** 2026-03-18
**Status:** Approved

---

## 1. Overview

Redesign the Pescadora portfolio (post-landing) as a vertical storytelling journey. The fish dives into the ocean and the user follows it down through: manifesto → portfolio (foto/video toggle) → project stories → services → contact.

Dark theme throughout (#080808 base). Three colors only: #080808 (bg), #f2ede6 (text), #8a8078 (muted).

## 2. Architecture

### Page Structure (app/page.tsx)

```
Phase: landing → exiting → portfolio

Portfolio content (single scrollable page):
  <PortfolioHeader />      — fixed logo pez + nav
  <ManifestoSection />     — brand story, first stop after fish
  <PortfolioSection />     — FOTO/VIDEO toggle + project grid
  <ServiciosSection />     — services list (existing, restyle dark)
  <ContactoSection />      — form + footer (existing, restyle dark)
```

### Component Map

```
New components:
  src/components/sections/PortfolioHeader.tsx   — fixed header with fish logo
  src/components/sections/ManifestoSection.tsx   — replaces SobreSection
  src/components/sections/PortfolioSection.tsx   — FOTO/VIDEO toggle + grid
  src/components/sections/ProjectOverlay.tsx     — fullscreen project story

Modified components:
  src/components/sections/ServiciosSection.tsx   — restyle dark
  src/components/sections/ContactoSection.tsx    — restyle dark
  app/page.tsx                                   — new section order

Removed components:
  src/components/sections/FotoSection.tsx        — merged into PortfolioSection
  src/components/sections/VideoSection.tsx       — merged into PortfolioSection
  src/components/sections/SobreSection.tsx       — replaced by ManifestoSection
```

## 3. Component Specs

### 3.1 PortfolioHeader

- `position: fixed`, `top: 0`, `z-index: 100`
- Fish logo from `/fish_silhouette.png` via `next/image`, ~40px wide, left-aligned
- Appears with fade-in only when `phase === 'portfolio'`
- Dark background with subtle blur: `backdrop-filter: blur(12px)`
- Right side: minimal nav links (Trabajo, Servicios, Contacto) as anchor scroll links
- Typography: Geist Mono, 0.65rem, uppercase, letter-spacing 0.2em
- Padding: 1.2rem 2rem

### 3.2 ManifestoSection

First thing you see after the fish dives. Continues the dark ocean atmosphere.

- Full viewport height (`min-height: 100vh`), centered content
- Max-width: 760px, centered
- Content:
  - Headline: "Hacemos imagenes que no se olvidan." — `clamp(1.6rem, 3vw, 2.8rem)`, weight 300
  - Body: philosophy paragraph — `clamp(1rem, 1.8vw, 1.4rem)`, color muted
  - Footer line: "Mexico — Activos donde el trabajo lo exige" — Geist Mono, small caps
- Scroll animation: each text block fades in + translateY(30px → 0) on viewport entry
- Use IntersectionObserver for scroll-triggered animations
- Background: #080808 continuous, no borders or dividers

### 3.3 PortfolioSection

The main portfolio with cinematic FOTO/VIDEO toggle.

#### Toggle

- Two words side by side: **FOTO** / **VIDEO**
- Typography: `clamp(3rem, 8vw, 7rem)`, weight 700, Geist Sans
- State: `activeFilter: 'foto' | 'video'`
- Default: 'foto'
- Active word: color #f2ede6
- Inactive word: color rgba(242,237,230,0.12)
- Separator: " / " in muted color between them
- Transition: color 0.6s ease
- Clickable with `cursor: none` (fish cursor applies)
- Centered, with `padding: 4rem 0 3rem`

#### Project Grid

- Grid: 2 columns desktop, 1 column mobile
- Gap: 2px (tight, editorial feel)
- Each card = ProjectCard component

#### ProjectCard

- Aspect ratio: 4/3 (foto) or 16/9 (video)
- Cover image: first photo of project (foto) or first frame of video (video)
- Use `next/image` with `fill` + `object-fit: cover`
- Overlay: gradient from bottom, project name + count
- Project name: `clamp(1.2rem, 2vw, 1.8rem)`, weight 600
- Count: Geist Mono, 0.7rem, muted
- Hover state:
  - Image: `transform: scale(1.03)`, `transition: 0.7s ease`
  - Overlay darkens slightly
  - Arrow icon (→) shifts right 4px
- Click: opens ProjectOverlay
- For video cards: on hover, play the first video in the background (muted, loop)

#### Data Flow

- `activeFilter === 'foto'`: show projects from `registry.photos`, grouped by `project` field
- `activeFilter === 'video'`: show categories from `registry.videos`, grouped by `category` field
- Use existing `getAllProjects()` and video category grouping logic

### 3.4 ProjectOverlay

Fullscreen storytelling overlay for individual projects.

- `position: fixed`, `inset: 0`, `z-index: 200`
- Background: #080808
- Scroll: `overflow-y: auto` (own scroll context)
- Open/close: fade + scale(0.98 → 1) transition, 0.4s ease

#### Layout

```
[Sticky header]
  Project name (left) — "X" close button (right)
  Typography: clamp(1rem, 1.5vw, 1.4rem), weight 600

[Hero image — fullbleed]
  First/best image of project
  Aspect: 16/9 on desktop, 4/3 on mobile
  next/image, priority loading

[Info grid — 2 or 3 columns]
  Cliente: ___
  Categoria: ___
  Ano: ___
  (Geist Mono, 0.75rem, uppercase, muted labels)
  (Geist Sans, 1rem, white values)
  All placeholder text for now

[Narrative text]
  "Brief project description placeholder."
  clamp(1rem, 1.6vw, 1.3rem), weight 300, line-height 1.7
  Max-width: 680px, centered

[Gallery grid]
  Masonry-style: 2 columns with varying heights
  All project photos/videos
  next/image with lazy loading
  Click photo: lightbox (simple scale-up overlay)
  Videos: play inline on click

[Project navigation]
  ← Previous project | Next project →
  Fixed at bottom or at end of scroll
  Geist Mono, small caps, with arrows
```

#### Placeholder Content Structure

Each project needs a data object (hardcoded initially):

```typescript
interface ProjectStory {
  slug: string
  title: string
  client: string
  category: string
  year: string
  role: string
  description: string
}
```

Store in `src/data/project-stories.ts` as a map keyed by project name. Values are placeholder strings like "Cliente por definir", "2025", etc.

### 3.5 ServiciosSection (restyle)

- Same 2-column grid layout
- Restyle: dark background (#080808), light text (#f2ede6)
- Title "Servicios" in large type matching the FOTO/VIDEO toggle scale: `clamp(2rem, 5vw, 4rem)`
- Border colors: rgba(242,237,230,0.1)
- Each service item: `clamp(1rem, 1.5vw, 1.2rem)`, weight 300
- Scroll-triggered fade-in animation

### 3.6 ContactoSection (restyle)

- Dark background continuous
- Input borders: rgba(242,237,230,0.15)
- Text/placeholder: #f2ede6 / #8a8078
- Button: border rgba(242,237,230,0.25), same hover treatment as Hero button
- Footer "@pescadora" + small fish logo
- Remove any light background references

## 4. Landing → Portfolio Transition

Current flow preserved with one key change:

1. User clicks "Ver Trabajo"
2. Fish forms from text particles (converging phase)
3. Fish turns to face downward (bigfish turn phase)
4. Fish swims down and shrinks into the depth (bigfish dive phase)
5. Fish disappears → `onExitComplete` fires → `phase = 'portfolio'`
6. Hero overlay removed from DOM
7. Portfolio content fades in with `translateY(20px → 0)` — feels like you arrived where the fish went

**Key:** The ManifestoSection is the first thing visible. It feels like the fish led you here, to the bottom of the ocean where Pescadora works.

## 5. Scroll Animations

Use IntersectionObserver (no external library) for viewport-triggered animations:

- **Fade up**: `opacity: 0 → 1`, `translateY: 30px → 0`, `transition: 0.8s ease`
- **Stagger**: project cards animate in with 80ms delay between each
- **Threshold**: 0.15 (trigger when 15% visible)
- **Once**: animations trigger once, don't reverse on scroll up

Create a reusable hook: `useScrollReveal(ref, options)` that adds/removes a `.revealed` CSS class.

## 6. Cursor

The fish cursor currently only works on the ParticleWordmark canvas. Extend to the full page:

- `body { cursor: none }` already set in globals.css
- Create a `FishCursor` component mounted in layout.tsx
- Uses `position: fixed`, `pointer-events: none`, `z-index: 9999`
- Renders a small canvas (~40x30px) with the animated fish
- Follows mouse with slight easing (lerp, not instant snap)
- Tail wag animation based on mouse velocity
- Replace the `.custom-cursor` div currently in globals.css

## 7. Typography System

Consistent across all sections:

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Section titles (FOTO, VIDEO, SERVICIOS) | Geist Sans | clamp(3rem, 8vw, 7rem) | 700 |
| Sub-section titles (Servicios title) | Geist Sans | clamp(2rem, 5vw, 4rem) | 700 |
| Project names | Geist Sans | clamp(1.2rem, 2vw, 1.8rem) | 600 |
| Body text | Geist Sans | clamp(1rem, 1.6vw, 1.3rem) | 300 |
| Labels/meta | Geist Mono | 0.7-0.75rem | 400 |
| Nav links | Geist Mono | 0.65rem | 400 |

## 8. Color Palette (strict)

| Token | Value | Usage |
|-------|-------|-------|
| --color-bg | #080808 | All backgrounds |
| --color-text | #f2ede6 | Primary text, active elements |
| --color-text-muted | #8a8078 | Secondary text, labels, inactive |
| --color-border | rgba(242,237,230,0.1) | Subtle dividers |
| --color-border-hover | rgba(242,237,230,0.25) | Hover states |

## 9. File Structure

```
src/
  components/
    sections/
      PortfolioHeader.tsx    (new)
      ManifestoSection.tsx   (new, replaces SobreSection)
      PortfolioSection.tsx   (new, replaces FotoSection + VideoSection)
      ProjectOverlay.tsx     (new)
      ServiciosSection.tsx   (modified)
      ContactoSection.tsx    (modified)
    ui/
      FishCursor.tsx         (new)
      ParticleWordmark.tsx   (existing)
  hooks/
    useScrollReveal.ts       (new)
  data/
    project-stories.ts       (new — placeholder content)
  lib/
    registry.ts              (existing)
  types/
    media.ts                 (existing)
app/
  page.tsx                   (modified)
  layout.tsx                 (modified — add FishCursor)
  globals.css                (modified — dark theme vars)
```

## 10. Performance

- All images via `next/image` with lazy loading (except hero images: `priority`)
- Video hover previews: preload="metadata" only, play on hover
- Intersection Observer for scroll animations (no scroll event listeners)
- Grid images: `sizes` attribute for responsive loading
- Overlay: `will-change: transform` for smooth open/close
- Total new components: 5 (header, manifesto, portfolio, project overlay, fish cursor)

## 11. Out of Scope

- CMS integration (all content hardcoded/placeholder)
- Image optimization pipeline (rely on next/image)
- i18n (Spanish only)
- Analytics
- SEO meta tags (can add later)
- Mobile-specific layouts beyond responsive grid (1-col on mobile)
