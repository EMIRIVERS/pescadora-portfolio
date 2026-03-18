uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uMouse;       /* Normalized screen coords 0–1 */
uniform float uDistortion; /* 0 = off, 1 = full */
uniform float uGrain;      /* 0 = off, 1 = full */

varying vec2 vUv;

/* Pseudo-random for film grain */
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

/* 2D rotation matrix */
mat2 rotate2D(float angle) {
  return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
  vec2 uv = vUv;

  /* — Liquid distortion near cursor — */
  float dist = distance(uv, uMouse);
  float radius = 0.25;
  float strength = uDistortion * 0.04;

  if (dist < radius) {
    float falloff = 1.0 - smoothstep(0.0, radius, dist);
    vec2 dir = normalize(uv - uMouse);
    float angle = falloff * strength * 20.0;
    uv = uMouse + rotate2D(angle) * (uv - uMouse);
    uv += dir * falloff * strength;
  }

  /* — Film grain — */
  float grain = random(vUv + vec2(uTime * 0.1, uTime * 0.07));
  grain = (grain - 0.5) * 0.08 * uGrain;

  vec4 texColor = texture2D(uTexture, uv);
  texColor.rgb += grain;
  texColor.rgb = clamp(texColor.rgb, 0.0, 1.0);

  gl_FragColor = texColor;
}
