/**
 * Convierte los covers GIF de `portfolio_categories` a MP4 (loop, muted) y
 * actualiza `cover_url`. Los covers actuales son GIFs de 11-40MB que tardan
 * 12-28s en cargar; en MP4 pesan ~0.6MB (95% menos), cargando casi al instante.
 *
 * Requisitos:
 *   - ffmpeg instalado (brew install ffmpeg)
 *   - .env.local con NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *
 * Uso (desde la raiz del proyecto):
 *   node --env-file=.env.local scripts/optimize-category-covers.mjs
 *
 * El front-end ya soporta covers .mp4 (se renderizan como <video> autoplay
 * loop muted); en cuanto este script actualice cover_url, las portadas pasan a
 * video sin mas cambios.
 */
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { writeFileSync, readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
if (!URL || !KEY) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}

const db = createClient(URL, KEY, { auth: { persistSession: false } })
const tmp = mkdtempSync(join(tmpdir(), 'covers-'))

const { data: cats, error } = await db
  .from('portfolio_categories')
  .select('slug, cover_url')
if (error) { console.error('Error leyendo categorias:', error.message); process.exit(1) }

const gifCats = (cats ?? []).filter((c) => c.cover_url && /\.gif(\?|$)/i.test(c.cover_url))
if (gifCats.length === 0) {
  console.log('No hay categorias con cover GIF. Nada que hacer.')
  process.exit(0)
}

console.log(`Convirtiendo ${gifCats.length} cover(s) GIF -> MP4...\n`)

for (const cat of gifCats) {
  const cleanUrl = cat.cover_url.replace(/\s+/g, '') // por si la URL trae un salto de linea
  const gifPath = join(tmp, `${cat.slug}.gif`)
  const mp4Path = join(tmp, `${cat.slug}.mp4`)
  try {
    const res = await fetch(cleanUrl)
    if (!res.ok) throw new Error(`descarga HTTP ${res.status}`)
    const gifBuf = Buffer.from(await res.arrayBuffer())
    writeFileSync(gifPath, gifBuf)

    execFileSync('ffmpeg', [
      '-y', '-i', gifPath,
      '-movflags', '+faststart',
      '-pix_fmt', 'yuv420p',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-an', '-crf', '28',
      mp4Path,
    ], { stdio: 'ignore' })

    const mp4Buf = readFileSync(mp4Path)
    const storagePath = `covers/${cat.slug}-${Date.now()}.mp4`
    const up = await db.storage.from('media').upload(storagePath, mp4Buf, {
      contentType: 'video/mp4',
      upsert: true,
      cacheControl: '31536000',
    })
    if (up.error) throw new Error(`subida: ${up.error.message}`)

    const { data: pub } = db.storage.from('media').getPublicUrl(storagePath)
    const upd = await db.from('portfolio_categories').update({ cover_url: pub.publicUrl }).eq('slug', cat.slug)
    if (upd.error) throw new Error(`update cover_url: ${upd.error.message}`)

    console.log(`✓ ${cat.slug}: ${(gifBuf.length / 1048576).toFixed(1)}MB GIF -> ${(mp4Buf.length / 1024).toFixed(0)}KB MP4`)
  } catch (e) {
    console.error(`✗ ${cat.slug}: ${e.message}`)
  }
}

console.log('\nListo. Las portadas de categoria ahora son MP4. Revalida la home (ISR) o redeploy si hace falta.')
