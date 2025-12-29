import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerState } from '@/hooks/usePlayerState'

// Shield colors (purple/pink for Arcane Rush)
const SHIELD_COLOR = { primary: '#da70d6', secondary: '#ee82ee' }

// Create a cylindrical section for the shield (like D3 monk dash)
function createShieldGeometry() {
  // Use a partial cylinder - wraps around the front of the character
  const geometry = new THREE.CylinderGeometry(
    1.5,      // radiusTop
    1.5,      // radiusBottom  
    2.0,      // height
    32,       // radialSegments
    1,        // heightSegments
    true,     // openEnded
    -Math.PI * 0.4,  // thetaStart (centered on front)
    Math.PI * 0.8    // thetaLength (~144 degrees arc)
  )
  
  return geometry
}

// Vertex shader
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment shader for shield effect
const fragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uSecondaryColor;
  
  varying vec2 vUv;
  varying vec3 vPosition;
  
  #define PI 3.14159265359
  
  // Hexagon pattern
  float hexagon(vec2 p) {
    p = abs(p);
    return max(p.x * 0.866025 + p.y * 0.5, p.y);
  }
  
  float hexGrid(vec2 uv, float scale) {
    vec2 r = vec2(1.0, 1.732);
    vec2 h = r * 0.5;
    vec2 a = mod(uv * scale, r) - h;
    vec2 b = mod(uv * scale - h, r) - h;
    vec2 gv = length(a) < length(b) ? a : b;
    float hex = hexagon(gv);
    return smoothstep(0.4, 0.38, hex);
  }
  
  // Energy wave
  float wave(vec2 uv, float time) {
    float wave1 = sin(uv.y * 8.0 + time * 3.0) * 0.5 + 0.5;
    float wave2 = sin(uv.y * 12.0 - time * 2.0 + uv.x * 4.0) * 0.5 + 0.5;
    return wave1 * wave2;
  }
  
  void main() {
    vec2 uv = vUv;
    vec2 centeredUv = uv * 2.0 - 1.0;
    float dist = length(centeredUv);
    float angle = atan(centeredUv.y, centeredUv.x);
    
    // Circular falloff
    float circleFade = 1.0 - smoothstep(0.6, 1.0, dist);
    
    // --- HARD CIRCLE MASK ---
    if (dist > 0.98) discard;
    
    // Hex grid pattern
    float hex = hexGrid(uv - vec2(0.0, uTime * 0.1), 8.0);
    
    // Edge glow ring
    float ring = smoothstep(0.95, 0.85, dist) - smoothstep(0.85, 0.7, dist);
    float innerRing = smoothstep(0.7, 0.65, dist) - smoothstep(0.65, 0.5, dist);
    
    // Energy waves traveling outward
    float waves = wave(centeredUv, uTime);
    
    // Radial lines (push effect)
    float numLines = 16.0;
    float lineAngle = mod(angle + uTime * 1.5, PI * 2.0 / numLines);
    float radialLines = smoothstep(0.08, 0.0, abs(lineAngle - PI / numLines));
    radialLines *= smoothstep(0.2, 0.5, dist) * smoothstep(1.0, 0.7, dist);
    
    // Center push glow
    float centerPush = smoothstep(0.5, 0.0, dist) * 0.4;
    
    // Sparkle/energy particles
    float sparkle = sin(angle * 20.0 + uTime * 5.0) * sin(dist * 40.0 - uTime * 8.0);
    sparkle = smoothstep(0.8, 1.0, sparkle) * circleFade;
    
    // Edge highlight
    float edgeHighlight = pow(1.0 - abs(dist - 0.85) * 5.0, 3.0);
    edgeHighlight = max(0.0, edgeHighlight) * 0.5;
    
    // Combine effects
    float pattern = hex * 0.3 + ring * 0.8 + innerRing * 0.4 + radialLines * 0.5 + 
                    centerPush + sparkle * 0.4 + waves * 0.15 + edgeHighlight;
    pattern *= circleFade;
    
    // Color mixing with energy effect
    vec3 color = mix(uColor, uSecondaryColor, waves * 0.5 + hex * 0.3);
    color += uSecondaryColor * edgeHighlight * 2.0;
    color += vec3(1.0) * sparkle * 0.5;
    
    // Pulse
    float pulse = sin(uTime * 6.0) * 0.1 + 0.9;
    
    // Fresnel-like edge glow
    float fresnel = pow(dist, 2.0) * 0.3;
    
    gl_FragColor = vec4(color, (pattern + fresnel) * uOpacity * pulse);
  }
`

export default function ShieldEffect({ position = [0, 1.0, 0] }) {
  const meshRef = useRef()
  const materialRef = useRef()
  const { state, activeAction, STATES } = usePlayerState()
  
  // Only active during Arcane Rush (skill_3 / MOVING state)
  const isActive = state === STATES.MOVING && activeAction === 'skill_3'
  
  // Create curved shield geometry
  const shieldGeometry = useMemo(() => createShieldGeometry(), [])
  
  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color(SHIELD_COLOR.primary) },
        uSecondaryColor: { value: new THREE.Color(SHIELD_COLOR.secondary) },
      },
      transparent: true,
      side: THREE.FrontSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])
  
  // Animate the shield
  useFrame((_, delta) => {
    if (!materialRef.current) return
    
    const uniforms = materialRef.current.uniforms
    
    // Update time
    uniforms.uTime.value += delta
    
    // Fade in/out based on active state
    const targetOpacity = isActive ? 1.0 : 0.0
    uniforms.uOpacity.value += (targetOpacity - uniforms.uOpacity.value) * delta * 10
    
    // Scale and position effects
    if (meshRef.current) {
      // Scale up when active
      const targetScale = isActive ? 1.0 : 0.3
      meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * delta * 8
      meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * delta * 8
      meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * delta * 8
      
      // Slight forward pulse when active
      if (isActive) {
        const pulseZ = Math.sin(uniforms.uTime.value * 4) * 0.08
        meshRef.current.position.z = position[2] + pulseZ
      }
    }
  })
  
  return (
    <mesh 
      ref={meshRef} 
      position={position} 
      rotation={[0, 0, 0]}
      scale={1}
    >
      <primitive object={shieldGeometry} attach="geometry" />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  )
}
