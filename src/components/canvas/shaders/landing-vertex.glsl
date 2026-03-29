precision mediump float;

attribute vec3 aPositionText;
attribute vec3 aPositionFish;
attribute float aRandomness;
attribute float aColorIndex;

uniform float uMorphFactor;
uniform float uDissolve;
uniform float uTime;

varying float vColorIndex;
varying float vAlpha;

void main() {
  // Lerp between text layout and fish silhouette
  vec3 pos = mix(aPositionText, aPositionFish, uMorphFactor);

  // Idle ripple — subtle vertical oscillation when showing text
  float rippleAmp = (1.0 - uMorphFactor) * 0.014;
  pos.y += sin(uTime * 1.05 + aPositionText.x * 2.6) * rippleAmp;

  // RGB dissolve — staggered scatter in all directions + Z burst
  if (uDissolve > 0.001) {
    float delay   = aRandomness * 0.38;
    float t       = max(0.0, (uDissolve - delay) / (1.0 - delay));
    float t2      = t * t;
    float angle   = aRandomness * 6.28318;
    float radius  = t2 * (aRandomness * 3.8 + 0.9);
    pos.x += cos(angle) * radius;
    pos.y += sin(angle) * radius;
    // Pure forward burst along Z (RGB pixels flying toward viewer)
    pos.z += aRandomness * t2 * 14.0;
  }

  vColorIndex = aColorIndex;
  // Alpha holds full until dissolve threshold, then drops sharply
  vAlpha = 1.0 - smoothstep(0.48, 0.92, uDissolve);

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  // Perspective-correct point size
  gl_PointSize = 3.8 * (260.0 / -mvPosition.z);
  gl_Position  = projectionMatrix * mvPosition;
}
