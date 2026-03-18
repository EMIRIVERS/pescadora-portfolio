import type { MediaRegistry } from '@/types/media'
import registryJson from '../../media_registry.json'

export const registry = registryJson as MediaRegistry

export function getPhotosByProject(project: string) {
  return registry.photos.filter(p => p.project === project)
}

export function getAllProjects(): string[] {
  return [...new Set(registry.photos.map(p => p.project))]
}
