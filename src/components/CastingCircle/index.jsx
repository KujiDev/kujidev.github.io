import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerState } from '@/hooks/usePlayerState'
import { getActionById } from '@/config/actions'

// Color mapping for different skills/states
const SKILL_COLORS = {
  skill_1: { primary: '#4fc3f7', secondary: '#81d4fa' }, // Ice Shard - ice blue
  skill_2: { primary: '#ff6b35', secondary: '#ffa040' }, // Meteor - fire orange
  skill_3: { primary: '#da70d6', secondary: '#ee82ee' }, // Arcane Rush - purple
  skill_4: { primary: '#60a0ff', secondary: '#a0d0ff' }, // Mana Body - mana blue
}

const DEFAULT_COLOR = { primary: '#ffffff', secondary: '#cccccc' }

// Vertex shader for the circle
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment shader for animated magic circle
const fragmentShader = `
  uniform float uTime;
  uniform float uProgress;
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform vec3 uSecondaryColor;
  
  varying vec2 vUv;
  
  #define PI 3.14159265359
  
  float ring(vec2 uv, float radius, float thickness) {
    float dist = length(uv);
    return smoothstep(radius - thickness, radius, dist) - smoothstep(radius, radius + thickness, dist);
  }
  
  float rune(vec2 uv, float angle, float time) {
    vec2 rotated = vec2(
      uv.x * cos(angle) - uv.y * sin(angle),
      uv.x * sin(angle) + uv.y * cos(angle)
    );
    float runePattern = sin(rotated.x * 20.0 + time * 2.0) * sin(rotated.y * 20.0 - time * 1.5);
    return smoothstep(0.3, 0.8, runePattern);
  }
  
  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    // Outer ring
    float outerRing = ring(uv, 0.9, 0.03);
    
    // Inner ring
    float innerRing = ring(uv, 0.6, 0.02);
    
    // Progress ring (fills as cast progresses)
    float progressAngle = -PI + uProgress * 2.0 * PI;
    float progressRing = ring(uv, 0.75, 0.04);
    progressRing *= step(angle, progressAngle);
    
    // Rotating rune patterns
    float runeRing = ring(uv, 0.75, 0.15);
    float runes = rune(uv, uTime * 0.5, uTime) * runeRing;
    
    // Spinning lines
    float numLines = 8.0;
    float lineAngle = mod(angle + uTime * 0.8, PI * 2.0 / numLines);
    float lines = smoothstep(0.02, 0.0, abs(lineAngle - PI / numLines)) * step(0.4, dist) * step(dist, 0.85);
    
    // Center glow
    float centerGlow = smoothstep(0.4, 0.0, dist) * 0.5;
    
    // Particle-like sparkles
    float sparkle = sin(angle * 12.0 + uTime * 3.0) * sin(dist * 30.0 - uTime * 5.0);
    sparkle = smoothstep(0.7, 1.0, sparkle) * step(0.3, dist) * step(dist, 0.9);
    
    // Combine all effects
    float pattern = outerRing + innerRing + progressRing * 0.8 + runes * 0.3 + lines * 0.5 + centerGlow + sparkle * 0.6;
    
    // Mix colors
    vec3 color = mix(uColor, uSecondaryColor, sin(angle * 3.0 + uTime) * 0.5 + 0.5);
    color = mix(color, uSecondaryColor, centerGlow);
    
    // Pulsing effect
    float pulse = sin(uTime * 4.0) * 0.15 + 0.85;
    
    gl_FragColor = vec4(color, pattern * uOpacity * pulse);
  }
`

export default function CastingCircle({ position = [0, 0.02, 0] }) {
  const meshRef = useRef()
  const materialRef = useRef()
  const { state, activeAction, castProgress, STATES } = usePlayerState()
  
  // Determine if we should show the circle
  const isActive = state === STATES.CASTING || state === STATES.ATTACKING
  
  // Get colors based on active skill
  const colors = useMemo(() => {
    if (!activeAction) return DEFAULT_COLOR
    return SKILL_COLORS[activeAction] || DEFAULT_COLOR
  }, [activeAction])
  
  // Create shader material
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color(colors.primary) },
        uSecondaryColor: { value: new THREE.Color(colors.secondary) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])
  
  // Animate the circle
  useFrame((_, delta) => {
    if (!materialRef.current) return
    
    const uniforms = materialRef.current.uniforms
    
    // Update time
    uniforms.uTime.value += delta
    
    // Update progress
    uniforms.uProgress.value = castProgress
    
    // Update colors
    uniforms.uColor.value.set(colors.primary)
    uniforms.uSecondaryColor.value.set(colors.secondary)
    
    // Fade in/out based on active state
    const targetOpacity = isActive ? 1.0 : 0.0
    uniforms.uOpacity.value += (targetOpacity - uniforms.uOpacity.value) * delta * 8
    
    // Scale effect
    if (meshRef.current) {
      const targetScale = isActive ? 1.0 : 0.5
      meshRef.current.scale.x += (targetScale - meshRef.current.scale.x) * delta * 6
      meshRef.current.scale.y += (targetScale - meshRef.current.scale.y) * delta * 6
      meshRef.current.scale.z += (targetScale - meshRef.current.scale.z) * delta * 6
    }
  })
  
  return (
    <mesh 
      ref={meshRef} 
      position={position} 
      rotation={[-Math.PI / 2, 0, 0]}
      scale={0.5}
    >
      <planeGeometry args={[2.5, 2.5, 1, 1]} />
      <primitive object={shaderMaterial} ref={materialRef} attach="material" />
    </mesh>
  )
}
