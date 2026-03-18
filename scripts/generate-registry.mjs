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
