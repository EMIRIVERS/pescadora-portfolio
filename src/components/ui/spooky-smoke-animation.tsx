'use client'
import { useEffect, useRef } from 'react'
import fragmentShaderSource from './shaders/smoke-fragment.glsl'
import vertexShaderSource from './shaders/smoke-vertex.glsl'

interface WebGLProgramWithUniforms extends WebGLProgram {
  resolution: WebGLUniformLocation | null
  time: WebGLUniformLocation | null
  u_color: WebGLUniformLocation | null
}

class Renderer {
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private program: WebGLProgramWithUniforms | null = null
  private vs: WebGLShader | null = null
  private fs: WebGLShader | null = null
  private buffer: WebGLBuffer | null = null
  private color: [number, number, number] = [0.5, 0.5, 0.5]
  private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1]

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.gl = canvas.getContext('webgl2') as WebGL2RenderingContext
    this.setup()
    this.init()
  }

  updateColor(color: [number, number, number]) {
    this.color = color
  }

  updateScale() {
    const dpr = Math.max(1, window.devicePixelRatio)
    this.canvas.width = window.innerWidth * dpr
    this.canvas.height = window.innerHeight * dpr
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  private compile(shader: WebGLShader, source: string) {
    const { gl } = this
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader error:', gl.getShaderInfoLog(shader))
    }
  }

  private setup() {
    const { gl } = this
    this.vs = gl.createShader(gl.VERTEX_SHADER)
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!this.vs || !this.fs || !program) return
    this.compile(this.vs, vertexShaderSource)
    this.compile(this.fs, fragmentShaderSource)
    gl.attachShader(program, this.vs)
    gl.attachShader(program, this.fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program))
    }
    const p = program as WebGLProgramWithUniforms
    p.resolution = gl.getUniformLocation(program, 'resolution')
    p.time = gl.getUniformLocation(program, 'time')
    p.u_color = gl.getUniformLocation(program, 'u_color')
    this.program = p
  }

  private init() {
    const { gl, program } = this
    if (!program) return
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
  }

  render(now = 0) {
    const { gl, program, buffer, canvas } = this
    if (!program || !gl.isProgram(program)) return
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.uniform2f(program.resolution, canvas.width, canvas.height)
    gl.uniform1f(program.time, now * 1e-3)
    gl.uniform3fv(program.u_color, this.color)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  reset() {
    const { gl, program, vs, fs } = this
    if (!program) return
    if (vs) { gl.detachShader(program, vs); gl.deleteShader(vs) }
    if (fs) { gl.detachShader(program, fs); gl.deleteShader(fs) }
    gl.deleteProgram(program)
    this.program = null
  }
}

function hexToRgb(hex: string): [number, number, number] | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : null
}

interface SmokeBackgroundProps {
  smokeColor?: string
}

export function SmokeBackground({ smokeColor = '#808080' }: SmokeBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Renderer | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    const renderer = new Renderer(canvasRef.current)
    rendererRef.current = renderer

    const handleResize = () => renderer.updateScale()
    handleResize()
    window.addEventListener('resize', handleResize)

    let rafId: number
    const loop = (now: number) => {
      renderer.render(now)
      rafId = requestAnimationFrame(loop)
    }
    loop(0)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(rafId)
      renderer.reset()
    }
  }, [])

  useEffect(() => {
    if (!rendererRef.current) return
    const rgb = hexToRgb(smokeColor)
    if (rgb) rendererRef.current.updateColor(rgb)
  }, [smokeColor])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}
