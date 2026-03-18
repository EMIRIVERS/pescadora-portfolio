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
