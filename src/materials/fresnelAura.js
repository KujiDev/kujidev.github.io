import * as THREE from 'three'

/**
 * Shared fresnel aura vertex shader
 * Calculates view-relative normals for fresnel effect
 */
export const fresnelVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

/**
 * Create a fresnel aura fragment shader with configurable parameters
 * @param {Object} options
 * @param {number} options.pulseSpeed - Speed of opacity pulsing (default: 5.0)
 * @param {number} options.waveFreq - Frequency of wave pattern (default: 3.0)
 * @param {number} options.waveSpeed - Speed of wave movement (default: 6.0)
 * @param {string} options.colorShift - GLSL vec3 for fresnel color shift (default: '0.1, 0.15, 0.25')
 */
export function createFresnelFragmentShader({
  pulseSpeed = 5.0,
  waveFreq = 3.0,
  waveSpeed = 6.0,
  colorShift = '0.1, 0.15, 0.25'
} = {}) {
  return `
    uniform float uTime;
    uniform float uOpacity;
    uniform vec3 uColor;
    
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vec3 viewDir = normalize(vViewPosition);
      float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 3.0);
      
      // Energy variation
      float pulse = sin(uTime * ${pulseSpeed.toFixed(1)}) * 0.12 + 0.88;
      float wave = sin(vNormal.y * ${waveFreq.toFixed(1)} + uTime * ${waveSpeed.toFixed(1)}) * 0.08 + 0.92;
      
      float alpha = fresnel * uOpacity * pulse * wave * 0.5;
      
      // Color shift based on fresnel
      vec3 color = uColor + vec3(${colorShift}) * fresnel;
      
      gl_FragColor = vec4(color, alpha);
    }
  `
}

/**
 * Create a complete fresnel aura shader material
 * @param {Object} options
 * @param {string} options.color - Hex color for the aura
 * @param {number} options.pulseSpeed - Speed of opacity pulsing
 * @param {number} options.waveFreq - Frequency of wave pattern
 * @param {number} options.waveSpeed - Speed of wave movement
 * @param {string} options.colorShift - GLSL vec3 for fresnel color shift
 */
export function createFresnelAuraMaterial({
  color = '#77bbff',
  pulseSpeed = 5.0,
  waveFreq = 3.0,
  waveSpeed = 6.0,
  colorShift = '0.1, 0.15, 0.25'
} = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: fresnelVertexShader,
    fragmentShader: createFresnelFragmentShader({ pulseSpeed, waveFreq, waveSpeed, colorShift }),
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color(color) },
    },
    transparent: true,
    side: THREE.BackSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}
