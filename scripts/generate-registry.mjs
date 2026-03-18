import { readdir, writeFile } from 'fs/promises'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'

const PHOTO_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const VIDEO_EXTENSIONS = new Set(['.mov', '.mp4', '.webm'])
const PUBLIC_MEDIA = './public/media'
const OUTPUT = './media_registry.json'

/**
 * Category mapping — edit this to re-categorize videos.
 * Key: substring of the filename (case-insensitive match)
 * Value: 'comercial' | 'video-clip' | 'entrevista' | 'podcast'
 */
const VIDEO_CATEGORIES = {
  'noma mezcal':        'comercial',
  'tierra jias':        'comercial',   // TIERRA JIASÚ
  'conade':             'comercial',
  'itsco':              'comercial',
  'lucky stash':        'comercial',
  'amor de vaso':       'comercial',
  'hipnotizado':        'video-clip',
  'como fuego lento':   'video-clip',
  'cotorreo':           'podcast',
}

/** Resolve category from filename — falls back to 'comercial' */
function getCategory(filename) {
  const lower = filename.toLowerCase()
  for (const [fragment, category] of Object.entries(VIDEO_CATEGORIES)) {
    if (lower.includes(fragment)) return category
  }
  return 'comercial'
}

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
      category: getCategory(file),
      tags: [],
    })
  }
  return videos
}

async function main() {
  const [photos, videos] = await Promise.all([scanPhotos(), scanVideos()])
  const registry = { photos, videos }
  await writeFile(OUTPUT, JSON.stringify(registry, null, 2))

  // Summary by category
  const byCategory = videos.reduce((acc, v) => {
    acc[v.category] = (acc[v.category] ?? 0) + 1
    return acc
  }, {})
  console.log(`✓ media_registry.json — ${photos.length} photos, ${videos.length} videos`)
  console.log('  Videos by category:', byCategory)
}

main().catch(console.error)
