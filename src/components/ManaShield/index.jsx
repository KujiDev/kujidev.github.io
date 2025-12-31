import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerState } from '@/hooks/usePlayerState'

// Blue/cyan mana shield color
const SHIELD_COLOR = '#77bbff'

// Vertex shader - same as ShieldEffect aura
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

// Fragment shader - enhanced aura effect
const fragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 3.0);
    
    // Add some energy variation
    float pulse = sin(uTime * 5.0) * 0.12 + 0.88;
    float wave = sin(vNormal.y * 3.0 + uTime * 6.0) * 0.08 + 0.92;
    
    float alpha = fresnel * uOpacity * pulse * wave * 0.5;
    
    // Slight color shift based on fresnel
    vec3 color = uColor + vec3(0.1, 0.15, 0.25) * fresnel;
    
    gl_FragColor = vec4(color, alpha);
  }
`

export default function ManaShield({ position = [0, 0, 0] }) {
  const groupRef = useRef()
  const meshRef = useRef()
  const materialRef = useRef()
  const { buffs } = usePlayerState()
  
  // Active when any buff is present
  const isActive = buffs.length > 0
  
  // Create sphere geometry - sized to wrap around character
  const sphereGeometry = useMemo(() => {
    return new THREE.SphereGeometry(2.0, 32, 32)
  }, [])
  
  // Create shader material - exactly like ShieldEffect aura but blue
  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uColor: { value: new THREE.Color(SHIELD_COLOR) },
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])
  
  // Animate - same as ShieldEffect aura
  useFrame((_, delta) => {
    if (!materialRef.current || !meshRef.current) return
    
    const uniforms = materialRef.current.uniforms
    const targetOpacity = isActive ? 1.0 : 0.0
    const currentOpacity = uniforms.uOpacity.value
    
    // Skip if fully faded
    if (!isActive && currentOpacity < 0.01) {
      uniforms.uOpacity.value = 0
      if (groupRef.current) groupRef.current.visible = false
      meshRef.current.scale.setScalar(0.5)
      return
    }
    
    if (groupRef.current) groupRef.current.visible = true
    
    // Smooth opacity transition
    const newOpacity = currentOpacity + (targetOpacity - currentOpacity) * delta * 8
    uniforms.uTime.value += delta
    uniforms.uOpacity.value = newOpacity
    
    // Scale animation
    const targetScale = isActive ? 1.0 : 0.5
    const s = meshRef.current.scale
    s.x += (targetScale - s.x) * delta * 6
    s.y += (targetScale - s.y) * delta * 6
    s.z += (targetScale - s.z) * delta * 6
  })
  
  return (
    <group ref={groupRef} position={position} visible={false}>
      <mesh ref={meshRef} scale={0.5}>
        <primitive object={sphereGeometry} attach="geometry" />
        <primitive object={shaderMaterial} ref={materialRef} attach="material" />
      </mesh>
    </group>
  )
}
