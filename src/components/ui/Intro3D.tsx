'use client'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import { gsap } from 'gsap'

interface Intro3DProps {
  triggerExit: boolean
  onExitComplete: () => void
}

export function Intro3D({ triggerExit, onExitComplete }: Intro3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const pointsRef = useRef<THREE.Points | null>(null)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const initializedRef = useRef(false)
  
  const stateRef = useRef({
    phase: 'idle',
    progress: 0,
    dissolveProgress: 0,
  })

  // Shaders (same as previous refinement for Micro-pixels and Fish shape)
  const vertexShader = `
    uniform float uTime;
    uniform float uProgress; 
    uniform float uDissolve; 
    uniform vec2 uMouse;
    
    attribute vec3 aTarget; 
    attribute vec3 aColor;  
    attribute float aSize;
    attribute float aRandom;
    attribute float aDensity;

    varying vec3 vColor;
    varying float vAlpha;
    varying float vDissolve;
    varying float vRandom;

    void main() {
      vec3 pos = mix(position, aTarget, uProgress);
      
      if (uProgress < 0.1) {
          float dist = distance(uMouse, pos.xy);
          float force = max(0.0, (130.0 - dist) / 130.0);
          if (force > 0.0) {
              vec2 dir = normalize(pos.xy - uMouse);
              pos.xy += dir * force * aDensity * 0.5;
          }
      }

      if (uProgress > 0.7) {
          float swimSpeed = 2.5;
          pos.z -= pow(uProgress - 0.7, 3.0) * 150.0;
          pos.x += sin(uTime * swimSpeed + pos.y * 0.1) * 2.5 * (uProgress - 0.7);
          pos.y += cos(uTime * swimSpeed * 0.5 + pos.x * 0.1) * 1.5 * (uProgress - 0.7);
      }

      if (uDissolve > 0.05) {
          float scatter = uDissolve * 45.0 * aRandom;
          pos.x += (aRandom - 0.5) * scatter;
          pos.y += (fract(aRandom * 10.0) - 0.5) * scatter;
          pos.z += (fract(aRandom * 100.0) - 0.5) * scatter;
      }

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      
      // Fine-tuned point size for sharpness
      gl_PointSize = aSize * (450.0 / -mvPosition.z) * (1.0 - uDissolve * 0.3);
      
      vColor = aColor;
      vAlpha = 1.0 - smoothstep(0.92, 1.0, uDissolve);
      vDissolve = uDissolve;
      vRandom = aRandom;
    }
  `

  const fragmentShader = `
    varying vec3 vColor;
    varying float vAlpha;
    varying float vDissolve;
    varying float vRandom;
    uniform float uTime;

    float fishShape(vec2 uv, float size) {
        vec2 p = (uv - 0.5) * 2.0;
        float body = (p.x * p.x) / (1.55 * 1.55) + (p.y * p.y) / (0.75 * 0.75);
        float tail = 1.0;
        if (p.x < -0.5) {
            float tx = (p.x + 1.3) / 1.1;
            float ty = abs(p.y) / 0.82;
            if (tx < 1.0 && ty < tx) tail = 0.0;
        }
        return min(body, tail);
    }

    void main() {
      if (fishShape(gl_PointCoord, 1.0) > 1.0) discard;

      vec3 finalColor = vColor;

      if (vDissolve > 0.01) {
          vec2 microUV = gl_PointCoord * 18.0; 
          float noise = fract(sin(dot(floor(microUV) + vRandom, vec2(12.9898, 78.233))) * 43758.5453 + uTime * 6.0);
          
          vec3 r = vec3(1.0, 0.0, 0.0);
          vec3 g = vec3(0.0, 1.0, 0.0);
          vec3 b = vec3(0.0, 0.45, 1.0);
          
          vec3 pixel;
          if (noise < 0.33) pixel = r;
          else if (noise < 0.66) pixel = g;
          else pixel = b;
          
          finalColor = mix(vColor, pixel, smoothstep(0.0, 0.45, vDissolve));
          finalColor *= (1.0 + vDissolve * 3.0);
      }

      gl_FragColor = vec4(finalColor, vAlpha);
    }
  `

  useEffect(() => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    const scene = new THREE.Scene()
    sceneRef.current = scene
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
    camera.position.z = 100
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const PARTICLE_COUNT = 9000
    const geometry = new THREE.BufferGeometry()
    
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const targets = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const sizes = new Float32Array(PARTICLE_COUNT)
    const randoms = new Float32Array(PARTICLE_COUNT)
    const densities = new Float32Array(PARTICLE_COUNT)

    const crema = new THREE.Color('#f2ede6')

    const init = async () => {
      // 1. Sample Text
      const sampleText = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!
          const w = 1200; const h = 400
          canvas.width = w; canvas.height = h
          ctx.font = `200 90px Geist, "Helvetica Neue", Arial, sans-serif`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ;(ctx as any).letterSpacing = `${90 * 0.22}px`
          ctx.fillStyle = '#fff'
          ctx.fillText('PESCADORA', w / 2, h / 2)
          
          const data = ctx.getImageData(0, 0, w, h).data
          const points = []
          for (let y = 0; y < h; y += 5) {
              for (let x = 0; x < w; x += 5) {
                  if (data[(y * w + x) * 4 + 3] > 128) {
                      points.push({ x: (x - w / 2) * 0.075, y: -(y - h / 2) * 0.075 })
                  }
              }
          }
          return points
      }

      // 2. Sample Fish Image (AS REQUESTED)
      const sampleFish = () => {
        return new Promise<any[]>((resolve) => {
          const img = new Image()
          img.src = '/fish_silhouette.png'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')!
            const w = 400; const h = 400
            canvas.width = w; canvas.height = h
            ctx.drawImage(img, 0, 0, w, h)
            const data = ctx.getImageData(0, 0, w, h).data
            const points = []
            for (let y = 0; y < h; y += 3) {
              for (let x = 0; x < w; x += 3) {
                if (data[(y * w + x) * 4] > 100 || data[(y * w + x) * 4 + 3] > 100) {
                  // Scale to fit anamorphosis perspective
                  points.push({ x: (x - w / 2) * 0.16, y: -(y - h / 2) * 0.16 })
                }
              }
            }
            resolve(points)
          }
          img.onerror = () => resolve([])
        })
      }

      const textPoints = sampleText()
      const fishPoints = (await sampleFish()) as any[]

      for (let i = 0; i < PARTICLE_COUNT; i++) {
          const tp = textPoints[i % textPoints.length] || { x: 0, y: 0 }
          positions[i * 3] = tp.x
          positions[i * 3 + 1] = tp.y
          positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5

          const fp = fishPoints[i % fishPoints.length] || { x: (Math.random()-0.5)*50, y: (Math.random()-0.5)*20 }
          targets[i * 3] = fp.x
          targets[i * 3 + 1] = fp.y
          targets[i * 3 + 2] = (Math.random() - 0.5) * 5 // Add some depth for anamorphosis

          colors[i * 3] = crema.r
          colors[i * 3 + 1] = crema.g
          colors[i * 3 + 2] = crema.b

          sizes[i] = 1.3
          randoms[i] = Math.random()
          densities[i] = Math.random() * 20 + 5
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('aTarget', new THREE.BufferAttribute(targets, 3))
      geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1))
      geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1))
      geometry.setAttribute('aDensity', new THREE.BufferAttribute(densities, 1))
      
      const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          transparent: true,
          uniforms: {
              uTime: { value: 0 },
              uProgress: { value: 0 },
              uDissolve: { value: 0 },
              uMouse: { value: new THREE.Vector2(-9999, -9999) },
          }
      })
      materialRef.current = material

      const points = new THREE.Points(geometry, material)
      scene.add(points)
      pointsRef.current = points
      
      animate()
    }

    const clock = new THREE.Clock()
    let rafId: number

    const animate = () => {
        const time = clock.getElapsedTime()
        if (materialRef.current) materialRef.current.uniforms.uTime.value = time
        if (pointsRef.current && stateRef.current.phase === 'idle') {
            pointsRef.current.rotation.y = Math.sin(time * 0.2) * 0.04
            pointsRef.current.rotation.x = Math.cos(time * 0.15) * 0.04
        }
        renderer.render(scene, camera)
        rafId = requestAnimationFrame(animate)
    }

    init()

    const onMouseMove = (e: MouseEvent) => {
      if (materialRef.current) {
        const x = (e.clientX - window.innerWidth / 2) * 0.18
        const y = -(e.clientY - window.innerHeight / 2) * 0.18
        materialRef.current.uniforms.uMouse.value.set(x, y)
      }
      if (cursorRef.current) {
        gsap.to(cursorRef.current, { x: e.clientX, y: e.clientY, duration: 0.1 })
      }
    }
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    if (triggerExit && stateRef.current.phase === 'idle' && pointsRef.current) {
      stateRef.current.phase = 'rotating'
      const tl = gsap.timeline({ onComplete: onExitComplete })

      tl.to(pointsRef.current.rotation, {
        y: Math.PI * 0.45,
        x: Math.PI * 0.08,
        duration: 1.5,
        ease: 'power2.inOut',
      })
      
      tl.to(materialRef.current!.uniforms.uProgress, {
        value: 1,
        duration: 1.5,
        ease: 'power2.inOut',
      }, '<')

      tl.to(cameraRef.current!.position, {
        z: -120,
        duration: 2.2,
        ease: 'power2.in',
      })

      tl.to(materialRef.current!.uniforms.uDissolve, {
        value: 1,
        duration: 1.6,
        ease: 'power1.in',
      }, '>-1.2')

      tl.to(containerRef.current!, { opacity: 0, duration: 0.6 })
    }
  }, [triggerExit, onExitComplete])

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', background: 'transparent', position: 'relative', overflow: 'hidden' }}>
      <div ref={cursorRef} className="custom-cursor" />
    </div>
  )
}
