/**
 * One-off: downscale /public/media JPEGs to max 1600px wide and re-encode
 * (mozjpeg q72), overwriting in place. Keeps filenames so media_registry.json
 * paths stay valid. No .orig backups — git history is the backup.
 *
 * Run: node scripts/resize-media-1600.mjs
 */

import sharp from 'sharp'
import { readdir, stat, writeFile } from 'fs/promises'
import { join, extname } from 'path'

const PUBLIC_DIR = new URL('../public/media', import.meta.url).pathname.replace(/%20/g, ' ')
const MAX_WIDTH = 1600
const JPG_QUALITY = 72

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) files.push(...await walk(full))
    else files.push(full)
  }
  return files
}

const mb = (b) => (b / 1024 / 1024).toFixed(2) + ' MB'

const all = await walk(PUBLIC_DIR)
const targets = all.filter((f) => /\.(jpe?g)$/i.test(f) && !f.endsWith('.orig'))

let before = 0, after = 0, done = 0
for (const f of targets) {
  const { size: s0 } = await stat(f)
  before += s0
  const meta = await sharp(f).metadata()
  let p = sharp(f)
  if ((meta.width ?? 0) > MAX_WIDTH) p = p.resize(MAX_WIDTH, null, { withoutEnlargement: true })
  const out = await p.jpeg({ quality: JPG_QUALITY, mozjpeg: true }).toBuffer()
  await writeFile(f, out)
  after += out.byteLength
  done++
}

console.log(`Resized ${done} images`)
console.log(`Before: ${mb(before)}  After: ${mb(after)}  Saved: ${mb(before - after)}`)
