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

  const aspect = texture.image ? (texture.image as HTMLImageElement).width / (texture.image as HTMLImageElement).height : 4 / 3
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
    const mat = material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = time
    mat.uniforms.uMouse.value.set(mouseNx, 1 - mouseNy)
    mat.uniforms.uDistortion.value = distortion
  }

  const dispose = () => {
    geometry.dispose()
    material.dispose()
    texture.dispose()
    scene.remove(mesh)
  }

  return { mesh, update, dispose }
}
