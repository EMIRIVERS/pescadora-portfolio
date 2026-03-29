precision mediump float;

uniform float uDissolve;
uniform float uMorphFactor;

varying float vColorIndex;
varying float vAlpha;

void main() {
  // Soft circular particle
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv);
  if (d > 0.5) discard;
  float softAlpha = smoothstep(0.5, 0.18, d);

  // Base color: crema #f2ede6
  vec3 baseColor = vec3(0.949, 0.929, 0.902);

  // Pure RGB channels for dissolve burst
  vec3 rgb;
  if (vColorIndex < 0.5)
    rgb = vec3(1.0,  0.04, 0.04);   // R channel
  else if (vColorIndex < 1.5)
    rgb = vec3(0.04, 0.95, 0.15);   // G channel
  else
    rgb = vec3(0.1,  0.25, 1.0);    // B channel

  // Shift crema → RGB as dissolve progresses (only once morphed)
  float shift = smoothstep(0.08, 0.62, uDissolve) * uMorphFactor;
  vec3 color = mix(baseColor, rgb, shift);

  float alpha = vAlpha * softAlpha;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(color, alpha);
}
