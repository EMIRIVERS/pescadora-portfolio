/**
 * Comprime todas las imágenes JPG/PNG en /public/media
 * → JPG: recomprime como JPEG quality 80, max 2400px ancho
 * → PNG: convierte a WebP quality 82
 *
 * Hace backup del original con extensión .orig antes de sobrescribir.
 * Ejecutar: node scripts/compress-images.mjs
 */

import sharp from 'sharp'
import { readdir, stat, rename } from 'fs/promises'
import { join, extname, basename } from 'path'

const PUBLIC_DIR = new URL('../public/media', import.meta.url).pathname.replace(/%20/g, ' ')
const MAX_WIDTH   = 2400   // px — suficiente para pantallas retina
const JPG_QUALITY = 80
const PNG_QUALITY = 82

// ── Recursiva: lista todos los archivos ──────────────────────────────────────

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...await walk(full))
    } else {
      files.push(full)
    }
  }
  return files
}

function fmtMB(bytes) {
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const allFiles = await walk(PUBLIC_DIR)
  const targets = allFiles.filter(f => /\.(jpe?g|png)$/i.test(f))

  console.log(`Encontradas ${targets.length} imágenes JPG/PNG en /public/media\n`)

  let totalBefore = 0
  let totalAfter  = 0
  let processed   = 0
  let skipped     = 0

  for (const filePath of targets) {
    const ext  = extname(filePath).toLowerCase()
    const base = basename(filePath)

    // Skip if already backed up (prev run)
    if (base.endsWith('.orig')) { skipped++; continue }

    const { size: sizeBefore } = await stat(filePath)
    totalBefore += sizeBefore

    try {
      // Read metadata
      const meta = await sharp(filePath).metadata()
      const needsResize = (meta.width ?? 0) > MAX_WIDTH

      let pipeline = sharp(filePath)
      if (needsResize) pipeline = pipeline.resize(MAX_WIDTH, null, { withoutEnlargement: true })

      let outBuffer
      if (ext === '.png') {
        outBuffer = await pipeline.webp({ quality: PNG_QUALITY }).toBuffer()
      } else {
        outBuffer = await pipeline.jpeg({ quality: JPG_QUALITY, mozjpeg: true }).toBuffer()
      }

      // Only replace if we actually saved space (>5%)
      const sizeAfter = outBuffer.byteLength
      const saved = sizeBefore - sizeAfter
      const pct   = Math.round((saved / sizeBefore) * 100)

      if (pct > 5) {
        // Backup original
        await rename(filePath, filePath + '.orig')
        // Write compressed
        const { writeFile } = await import('fs/promises')
        await writeFile(filePath, outBuffer)
        totalAfter += sizeAfter
        processed++
        process.stdout.write(
          `  ✓ ${base.padEnd(45)} ${fmtMB(sizeBefore)} → ${fmtMB(sizeAfter)} (-${pct}%)\n`
        )
      } else {
        totalAfter += sizeBefore
        skipped++
        process.stdout.write(`  ~ ${base.padEnd(45)} ya optimizado, skip\n`)
      }
    } catch (err) {
      console.error(`  ✗ Error en ${base}:`, err.message)
      totalAfter += sizeBefore
      skipped++
    }
  }

  const totalSaved = totalBefore - totalAfter
  const totalPct   = Math.round((totalSaved / totalBefore) * 100)

  console.log('\n' + '─'.repeat(60))
  console.log(`Procesadas: ${processed}  |  Skipped: ${skipped}`)
  console.log(`Antes:   ${fmtMB(totalBefore)}`)
  console.log(`Después: ${fmtMB(totalAfter)}`)
  console.log(`Ahorrado: ${fmtMB(totalSaved)} (-${totalPct}%)`)
  console.log('\nBackups guardados como .orig — bórralos cuando estés conforme:')
  console.log('  find public/media -name "*.orig" -delete')
}

main().catch(console.error)
