import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerState } from '@/hooks/useGame'
import { ELEMENTS, isActionForSkill } from '@/config/actions'

// Fire colors from unified element palette
const FIRE_COLOR = new THREE.Color(ELEMENTS.fire.primary)
const FIRE_CORE = new THREE.Color(ELEMENTS.fire.secondary)
const FIRE_HOT = new THREE.Color('#ffdd44')

const FORM_HEIGHT = 8.0 // Meteor comes from higher

// Animation phases within castProgress 0-1:
// 0.0 - 0.5: Circle forms, meteor spawns high
// 0.5 - 0.85: Meteor falls with acceleration
// 0.85 - 1.0: Impact explosion

// ============ SHADERS ============

// Fresnel-based shader for meteor rock with fire glow
const meteorVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const meteorFragmentShader = `
  uniform float uOpacity;
  uniform float uHeat;
  uniform vec3 uColor;
  uniform vec3 uCoreColor;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;
  
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.0);
    
    // Fire crackling effect on surface
    float crackle = sin(vUv.x * 15.0 + vUv.y * 12.0) * sin(vUv.y * 18.0 - vUv.x * 10.0);
    crackle = smoothstep(0.3, 0.8, crackle * 0.5 + 0.5);
    
    // Heat intensifies toward impact
    float heatGlow = fresnel * uHeat + crackle * uHeat * 0.5;
    
    vec3 color = mix(uColor, uCoreColor, heatGlow);
    color += vec3(0.3, 0.15, 0.0) * fresnel * uHeat; // Orange rim
    
    float alpha = (fresnel * 0.6 + 0.4) * uOpacity;
    
    gl_FragColor = vec4(color, alpha);
  }
`

// Ground target circle shader - fire themed
const circleVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const circleFragmentShader = `
  uniform float uProgress;
  uniform float uImpact;
  uniform vec3 uColor;
  uniform vec3 uColorSecondary;
  
  varying vec2 vUv;
  
  #define PI 3.14159265359
  
  // Crisp ring - LoL style sharp edges
  float ring(vec2 uv, float radius, float thickness) {
    float dist = length(uv);
    float inner = smoothstep(radius - thickness * 0.5, radius - thickness * 0.3, dist);
    float outer = smoothstep(radius + thickness * 0.3, radius + thickness * 0.5, dist);
    return inner - outer;
  }
  
  // Hash for pseudo-random
  float hash(float n) {
    return fract(sin(n) * 43758.5453);
  }
  
  // LoL-style sharp falloff for impact "pop"
  float sharpPop(float t) {
    return pow(max(0.0, 1.0 - t), 4.0);
  }
  
  void main() {
    vec2 uv = vUv * 2.0 - 1.0;
    float dist = length(uv);
    float angle = atan(uv.y, uv.x);
    
    float formProgress = clamp(uProgress / 0.5, 0.0, 1.0);
    
    // === ANTICIPATION PHASE ===
    float anticipation = smoothstep(0.4, 0.5, uProgress) * (1.0 - step(0.5, uProgress));
    float anticipationPulse = 1.0 + anticipation * sin(uProgress * 50.0) * 0.1;
    
    // Outer ring - fire warning circle
    float outerRadius = 0.92 - anticipation * 0.05;
    float outerThickness = 0.035 + anticipation * 0.02;
    float outerRing = ring(uv, outerRadius * anticipationPulse, outerThickness);
    outerRing *= 1.0 + anticipation * 1.0;
    
    // Inner danger ring
    float innerPulse = 1.0 + sin(formProgress * PI * 5.0) * 0.12 * formProgress;
    float innerRing = ring(uv, 0.5 * innerPulse, 0.03);
    
    // Progress arc fill - flames circling
    float progressAngle = -PI + formProgress * 2.0 * PI;
    float progressRing = ring(uv, 0.7, 0.045);
    progressRing *= step(angle, progressAngle);
    
    // Fire pattern - wavy flames
    float flameAngle = sin(angle * 8.0 + formProgress * PI * 3.0) * 0.08;
    float flamePattern = step(0.4 + flameAngle, dist) * step(dist, 0.85 + flameAngle);
    flamePattern *= smoothstep(0.0, 0.3, formProgress) * 0.4;
    
    // Radial flame lines - 8 for fire
    float numLines = 8.0;
    float lineAngle = mod(angle + formProgress * PI * 0.4, PI * 2.0 / numLines);
    float lines = smoothstep(0.018, 0.0, abs(lineAngle - PI / numLines));
    lines *= step(0.25, dist) * step(dist, 0.88) * formProgress * 0.8;
    
    // Center glow - hot core intensifies
    float coreIntensity = formProgress * formProgress;
    float centerGlow = smoothstep(0.45, 0.0, dist) * 0.6 * coreIntensity;
    centerGlow += smoothstep(0.2, 0.0, dist) * 0.4 * coreIntensity;
    
    // === IMPACT PHASE ===
    float impactAttack = smoothstep(0.0, 0.12, uImpact);
    float impactHold = smoothstep(0.0, 0.2, uImpact) * (1.0 - smoothstep(0.2, 0.35, uImpact));
    float impactDecay = smoothstep(0.25, 1.0, uImpact);
    
    // PRIMARY EXPLOSION POP
    float popIntensity = sharpPop(uImpact * 1.3) * impactAttack * 4.0;
    float impactPop = smoothstep(0.8, 0.0, dist) * popIntensity;
    impactPop += smoothstep(0.35, 0.0, dist) * popIntensity * 0.6;
    
    // Explosion shockwave - fast ring
    float shockRadius = pow(uImpact, 0.5) * 0.9;
    float shockwave = ring(uv, shockRadius, 0.07 * (1.0 - uImpact * 0.4));
    shockwave *= (1.0 - impactDecay) * 2.5;
    
    // Fire burst rays - explosive flame lines
    float fireRays = 0.0;
    for(float i = 0.0; i < 8.0; i++) {
      float rayAngle = i * PI / 4.0 + 0.2;
      float angleDiff = abs(mod(angle - rayAngle + PI, PI * 2.0) - PI);
      float rayWidth = 0.04 + hash(i) * 0.02;
      float rayLength = impactAttack * (0.75 + hash(i + 10.0) * 0.15);
      float rayFade = 1.0 - impactDecay;
      fireRays += smoothstep(rayWidth, 0.0, angleDiff) * step(dist, rayLength) * step(0.1, dist) * rayFade;
    }
    fireRays *= 0.9;
    
    // Secondary smaller rays
    for(float i = 0.0; i < 8.0; i++) {
      float rayAngle = i * PI / 4.0 + PI / 8.0;
      float angleDiff = abs(mod(angle - rayAngle + PI, PI * 2.0) - PI);
      float rayLength = impactAttack * (0.45 + hash(i + 30.0) * 0.2);
      float rayFade = 1.0 - impactDecay * 1.3;
      fireRays += smoothstep(0.025, 0.0, angleDiff) * step(dist, rayLength) * step(0.08, dist) * max(0.0, rayFade) * 0.5;
    }
    
    // Scorch fill - ground burns from center
    float scorchFill = smoothstep(impactAttack * 0.85, impactAttack * 0.85 - 0.2, dist);
    scorchFill *= (1.0 - impactDecay * 0.5) * 0.4;
    
    // Ember particles floating up
    float embers = 0.0;
    for(float i = 0.0; i < 10.0; i++) {
      float eAngle = hash(i * 7.0) * PI * 2.0;
      float eDist = 0.15 + uImpact * (0.3 + hash(i + 40.0) * 0.4);
      vec2 ePos = vec2(cos(eAngle), sin(eAngle)) * eDist;
      float eSize = 0.03 - uImpact * 0.015;
      float eFade = sin(uImpact * PI) * (1.0 - hash(i + 50.0) * 0.3);
      embers += smoothstep(eSize, 0.0, length(uv - ePos)) * eFade;
    }
    embers *= 0.7;
    
    // Outer ring flash on impact
    float outerFlash = outerRing * impactHold * 2.5;
    
    // Combine all
    float visibility = smoothstep(0.0, 0.08, uProgress);
    
    float pattern = outerRing + innerRing * 0.7 + progressRing * 0.85 + flamePattern + lines + centerGlow;
    pattern += impactPop + shockwave + fireRays + scorchFill + embers + outerFlash;
    pattern *= visibility;
    
    // LoL Color hierarchy: white/yellow hot > orange > red
    vec3 color = uColor;
    color = mix(color, uColorSecondary, centerGlow + scorchFill);
    color = mix(color, vec3(1.0, 0.95, 0.7), impactPop * 0.7 + fireRays * 0.3); // Hot white-yellow
    
    gl_FragColor = vec4(color, pattern * 0.9);
  }
`

// Fire bubble/dome shader
const bubbleVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const bubbleFragmentShader = `
  uniform float uTime;
  uniform float uOpacity;
  uniform vec3 uColor;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.5);
    
    // Fire flicker
    float flicker = sin(uTime * 8.0) * 0.15 + sin(uTime * 13.0) * 0.1 + 0.75;
    float wave = sin(vNormal.y * 4.0 + uTime * 5.0) * 0.12 + 0.88;
    
    float alpha = fresnel * uOpacity * flicker * wave * 0.6;
    
    // Hot edge coloring
    vec3 color = uColor + vec3(0.2, 0.1, 0.0) * fresnel;
    
    gl_FragColor = vec4(color, alpha);
  }
`

// ============ HELPER FUNCTIONS ============

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function easeOutBack(t, overshoot = 1.4) {
  const c1 = overshoot
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

// ============ MAIN COMPONENT ============

export default function Meteor({ targetPosition = [0, 0, 5] }) {
  const { state, activeAction, castProgressRef, STATES } = usePlayerState()
  
  const groupRef = useRef()
  const meteorRef = useRef()
  const coreRef = useRef()
  const circleRef = useRef()
  const bubbleRef = useRef()
  const trailRef = useRef()
  const meteorLightRef = useRef()
  const impactLightRef = useRef()
  const timeRef = useRef(0)
  
  const isCasting = (state === STATES.CASTING || state === STATES.ATTACKING) && isActionForSkill(activeAction, 'meteor')
  
  // Create materials
  const meteorMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: meteorVertexShader,
    fragmentShader: meteorFragmentShader,
    uniforms: {
      uOpacity: { value: 0 },
      uHeat: { value: 0.5 },
      uColor: { value: FIRE_COLOR },
      uCoreColor: { value: FIRE_HOT },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [])
  
  const circleMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: circleVertexShader,
    fragmentShader: circleFragmentShader,
    uniforms: {
      uProgress: { value: 0 },
      uImpact: { value: 0 },
      uColor: { value: FIRE_COLOR },
      uColorSecondary: { value: FIRE_CORE },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [])
  
  const bubbleMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: bubbleVertexShader,
    fragmentShader: bubbleFragmentShader,
    uniforms: {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: FIRE_COLOR },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  }), [])
  
  useFrame((_, delta) => {
    timeRef.current += delta
    
    // Smooth lerp factors matching CastingCircle for consistency
    const opacityLerp = delta * 8
    const scaleLerp = delta * 6
    
    if (!isCasting) {
      // Smooth fade out instead of instant reset (matches CastingCircle)
      const currentOpacity = circleMaterial.uniforms.uProgress.value
      
      // Early exit optimization when fully invisible
      if (currentOpacity < 0.01 && meteorMaterial.uniforms.uOpacity.value < 0.01) {
        // Ensure everything is at reset state
        circleMaterial.uniforms.uProgress.value = 0
        circleMaterial.uniforms.uImpact.value = 0
        meteorMaterial.uniforms.uOpacity.value = 0
        bubbleMaterial.uniforms.uOpacity.value = 0
        return
      }
      
      // Smooth fade out
      circleMaterial.uniforms.uProgress.value += (0 - circleMaterial.uniforms.uProgress.value) * opacityLerp
      circleMaterial.uniforms.uImpact.value += (0 - circleMaterial.uniforms.uImpact.value) * opacityLerp
      meteorMaterial.uniforms.uOpacity.value += (0 - meteorMaterial.uniforms.uOpacity.value) * opacityLerp
      bubbleMaterial.uniforms.uOpacity.value += (0 - bubbleMaterial.uniforms.uOpacity.value) * opacityLerp
      
      // Smooth scale down
      if (circleRef.current) {
        const s = circleRef.current.scale
        s.x += (0.5 - s.x) * scaleLerp
        s.y += (0.5 - s.y) * scaleLerp
        s.z += (0.5 - s.z) * scaleLerp
      }
      if (bubbleRef.current) {
        const s = bubbleRef.current.scale
        s.x += (0.5 - s.x) * scaleLerp
        s.y += (0.5 - s.y) * scaleLerp
        s.z += (0.5 - s.z) * scaleLerp
      }
      return
    }
    
    const p = castProgressRef.current
    
    circleMaterial.uniforms.uProgress.value = p
    bubbleMaterial.uniforms.uTime.value = timeRef.current
    
    // === LoL VFX TIMING ===
    const formProgress = smoothstep(0, 0.5, p)
    const fallProgress = smoothstep(0.5, 0.85, p)
    const impactRaw = smoothstep(0.85, 1.0, p)
    const impactProgress = Math.pow(impactRaw, 0.6) // Fast attack
    
    circleMaterial.uniforms.uImpact.value = impactProgress
    
    // Bubble: danger zone indicator
    const bubbleOpacity = formProgress * Math.pow(1 - fallProgress, 1.5)
    bubbleMaterial.uniforms.uOpacity.value = bubbleOpacity * 1.3
    
    // Meteor: visible during form and fall, fast fade on impact
    const meteorVisible = p < 0.9
    const meteorOpacity = meteorVisible 
      ? smoothstep(0.1, 0.35, p)
      : Math.pow(1 - smoothstep(0.85, 0.92, p), 2)
    meteorMaterial.uniforms.uOpacity.value = meteorOpacity
    
    // Heat increases as it falls
    meteorMaterial.uniforms.uHeat.value = 0.4 + fallProgress * 0.6
    
    // Meteor position: high during form, accelerating fall
    if (meteorRef.current) {
      const fallEased = Math.pow(fallProgress, 2.0) // Accelerating fall (gravity)
      const height = FORM_HEIGHT * (1 - fallEased)
      meteorRef.current.position.y = height
      
      // Scale: grows as it approaches (perspective)
      const baseScale = smoothstep(0, 0.3, p) * 0.8
      const approachScale = 1 + fallProgress * 0.4
      meteorRef.current.scale.setScalar(baseScale * approachScale)
      
      // Rotation - tumbling meteor
      meteorRef.current.rotation.x += delta * (2 + fallProgress * 4)
      meteorRef.current.rotation.z += delta * (1.5 + fallProgress * 3)
    }
    
    // Core glow intensifies
    if (coreRef.current) {
      const coreIntensity = Math.pow(formProgress, 1.2) * (meteorVisible ? 1 : 0)
      coreRef.current.material.opacity = coreIntensity * 0.9
      coreRef.current.material.color.lerp(FIRE_HOT, fallProgress * 0.5)
    }
    
    // === SCALE ANIMATION ===
    let circleTargetScale
    if (impactProgress > 0) {
      const popOut = 1.0 + (1 - Math.pow(1 - impactProgress, 3)) * 0.2
      const settle = 1 - impactProgress * 0.15
      circleTargetScale = popOut * settle
    } else if (fallProgress > 0.5) {
      const squeeze = 1.0 - (fallProgress - 0.5) * 0.12
      circleTargetScale = easeOutBack(formProgress, 1.15) * squeeze
    } else {
      circleTargetScale = easeOutBack(formProgress, 1.15)
    }
    
    let bubbleTargetScale
    if (impactProgress > 0) {
      bubbleTargetScale = Math.pow(1 - impactProgress, 2) * 0.7
    } else if (fallProgress > 0) {
      const squeeze = 1.0 - fallProgress * 0.3
      bubbleTargetScale = easeOutBack(formProgress, 1.2) * squeeze
    } else {
      bubbleTargetScale = easeOutBack(formProgress, 1.2)
    }
    
    if (circleRef.current) {
      const s = circleRef.current.scale
      // Use consistent lerp factor matching CastingCircle (delta * 6)
      // Impact gets slightly faster response but still smooth
      const lerpFactor = impactProgress > 0 ? scaleLerp * 1.5 : scaleLerp
      s.x += (circleTargetScale - s.x) * lerpFactor
      s.y += (circleTargetScale - s.y) * lerpFactor
      s.z += (circleTargetScale - s.z) * lerpFactor
    }
    if (bubbleRef.current) {
      const s = bubbleRef.current.scale
      // Use consistent lerp factor matching CastingCircle (delta * 6)
      const lerpFactor = impactProgress > 0 ? scaleLerp * 1.8 : scaleLerp
      s.x += (bubbleTargetScale - s.x) * lerpFactor
      s.y += (bubbleTargetScale - s.y) * lerpFactor
      s.z += (bubbleTargetScale - s.z) * lerpFactor
    }
    
    // Update light intensities (avoid re-renders by setting directly)
    if (meteorLightRef.current) {
      meteorLightRef.current.intensity = p * 6
    }
    if (impactLightRef.current) {
      impactLightRef.current.intensity = smoothstep(0.85, 0.92, p) * (1 - smoothstep(0.92, 1, p)) * 15
    }
  })
  
  const [tx, , tz] = targetPosition
  
  if (!isCasting) return null
  
  return (
    <group ref={groupRef} position={[tx, 0, tz]}>
      {/* Ground target circle */}
      <mesh ref={circleRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={circleMaterial} scale={0.5}>
        <planeGeometry args={[2.8, 2.8]} />
      </mesh>
      
      {/* Fire bubble - danger zone */}
      <group ref={bubbleRef} position={[0, 0, 0]} scale={0.5}>
        <mesh position={[0, 1.5, 0]} material={bubbleMaterial}>
          <sphereGeometry args={[2.0, 32, 32, 0, Math.PI * 2, Math.PI * (2/3), Math.PI * (1/3)]} />
        </mesh>
      </group>
      
      {/* Meteor group */}
      <group ref={meteorRef} position={[0, FORM_HEIGHT, 0]}>
        {/* Main meteor rock */}
        <mesh material={meteorMaterial}>
          <dodecahedronGeometry args={[0.5, 1]} />
        </mesh>
        {/* Core glow */}
        <mesh ref={coreRef}>
          <sphereGeometry args={[0.35, 16, 16]} />
          <meshBasicMaterial 
            color={FIRE_CORE} 
            transparent 
            opacity={0} 
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        
        {/* Meteor light */}
        <pointLight ref={meteorLightRef} color={FIRE_COLOR} intensity={0} distance={5} />
      </group>
      
      {/* Impact light burst */}
      <pointLight 
        ref={impactLightRef}
        color={FIRE_HOT} 
        intensity={0} 
        distance={6} 
        decay={2}
        position={[0, 0.3, 0]}
      />
    </group>
  )
}
