import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { usePlayerState } from '@/hooks/usePlayerState'
import { ELEMENTS } from '@/config/actions'

// Use unified ice element colors
const ICE_COLOR = new THREE.Color(ELEMENTS.ice.primary)
const ICE_CORE = new THREE.Color(ELEMENTS.ice.secondary)

const FORM_HEIGHT = 4.0

// Animation phases within castProgress 0-1:
// 0.0 - 0.55: Crystal forms at height
// 0.55 - 0.8: Crystal drops to ground
// 0.8 - 1.0: Impact explosion

// ============ SHADERS ============

// Fresnel-based shader for ice crystal
const crystalVertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`

const crystalFragmentShader = `
  uniform float uOpacity;
  uniform vec3 uColor;
  
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.5);
    
    float alpha = fresnel * uOpacity * 0.85;
    vec3 color = uColor + vec3(0.15, 0.2, 0.25) * fresnel;
    
    gl_FragColor = vec4(color, alpha);
  }
`

// Ground target circle shader - matches CastingCircle art style
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
    
    float formProgress = clamp(uProgress / 0.55, 0.0, 1.0);
    
    // === ANTICIPATION PHASE (LoL: tighten/brighten before release) ===
    float anticipation = smoothstep(0.45, 0.55, uProgress) * (1.0 - step(0.55, uProgress));
    float anticipationPulse = 1.0 + anticipation * sin(uProgress * 60.0) * 0.08; // Quick vibration
    
    // Outer ring - tightens during anticipation (LoL squeeze)
    float outerRadius = 0.92 - anticipation * 0.04;
    float outerThickness = 0.03 + anticipation * 0.02; // Thickens = more energy
    float outerRing = ring(uv, outerRadius * anticipationPulse, outerThickness);
    outerRing *= 1.0 + anticipation * 0.8; // Brighter during charge
    
    // Inner ring - pulses with energy gathering
    float innerPulse = 1.0 + sin(formProgress * PI * 6.0) * 0.1 * formProgress;
    float innerRing = ring(uv, 0.55 * innerPulse, 0.025);
    
    // Progress arc fill
    float progressAngle = -PI + formProgress * 2.0 * PI;
    float progressRing = ring(uv, 0.73, 0.04);
    progressRing *= step(angle, progressAngle);
    
    // Hexagonal ice pattern - sharper
    float hexAngle = mod(angle + PI, PI / 3.0) - PI / 6.0;
    float hexPattern = step(0.45, dist) * step(dist, 0.85);
    hexPattern *= smoothstep(0.06, 0.0, abs(hexAngle)) * 0.5 * formProgress;
    
    // Radial lines - 6 sharp crystalline
    float numLines = 6.0;
    float lineAngle = mod(angle + formProgress * PI * 0.3, PI * 2.0 / numLines);
    float lines = smoothstep(0.012, 0.0, abs(lineAngle - PI / numLines));
    lines *= step(0.3, dist) * step(dist, 0.88) * formProgress * 0.7;
    
    // Center glow - LoL style bright core that intensifies
    float coreIntensity = formProgress * formProgress; // Accelerating brightness
    float centerGlow = smoothstep(0.4, 0.0, dist) * 0.5 * coreIntensity;
    centerGlow += smoothstep(0.2, 0.0, dist) * 0.3 * coreIntensity; // Hot white core
    
    // === IMPACT PHASE (LoL: sharp pop, hold, decay) ===
    
    // Impact timing curve - FAST attack, brief HOLD, smooth decay
    float impactAttack = smoothstep(0.0, 0.15, uImpact); // Fast 0-1
    float impactHold = smoothstep(0.0, 0.25, uImpact) * (1.0 - smoothstep(0.25, 0.4, uImpact));
    float impactDecay = smoothstep(0.3, 1.0, uImpact);
    
    // PRIMARY POP - bright sharp flash (LoL signature)
    float popIntensity = sharpPop(uImpact * 1.5) * impactAttack * 3.0;
    float impactPop = smoothstep(0.7, 0.0, dist) * popIntensity;
    impactPop += smoothstep(0.3, 0.0, dist) * popIntensity * 0.5; // White hot center
    
    // Shockwave ring - fast expand with sharp edge
    float shockRadius = pow(uImpact, 0.6) * 0.88; // Fast start, slows at edge
    float shockwave = ring(uv, shockRadius, 0.05 * (1.0 - uImpact * 0.5));
    shockwave *= (1.0 - impactDecay) * 2.0;
    
    // Ice crack lines - sharp crystalline fractures (LoL: directional, clean)
    float cracks = 0.0;
    for(float i = 0.0; i < 6.0; i++) {
      float crackAngle = i * PI / 3.0 + 0.15;
      float angleDiff = abs(mod(angle - crackAngle + PI, PI * 2.0) - PI);
      float crackWidth = 0.025;
      float crackLength = impactAttack * (0.7 + hash(i) * 0.18);
      float crackFade = 1.0 - impactDecay;
      cracks += smoothstep(crackWidth, 0.0, angleDiff) * step(dist, crackLength) * step(0.08, dist) * crackFade;
    }
    cracks *= 0.8;
    
    // Secondary crack details - thinner, between main cracks
    for(float i = 0.0; i < 6.0; i++) {
      float crackAngle = i * PI / 3.0 + PI / 6.0;
      float angleDiff = abs(mod(angle - crackAngle + PI, PI * 2.0) - PI);
      float crackLength = impactAttack * (0.4 + hash(i + 50.0) * 0.15);
      float crackFade = 1.0 - impactDecay * 1.2;
      cracks += smoothstep(0.015, 0.0, angleDiff) * step(dist, crackLength) * step(0.1, dist) * max(0.0, crackFade) * 0.5;
    }
    
    // Frost spread - fills from center (LoL: area denial feedback)
    float frostFill = smoothstep(impactAttack * 0.8, impactAttack * 0.8 - 0.15, dist);
    frostFill *= (1.0 - impactDecay * 0.7) * 0.35;
    
    // Outer ring FLASH on impact then fade
    float outerFlash = outerRing * impactHold * 2.0;
    
    // Combine all
    float visibility = smoothstep(0.0, 0.08, uProgress);
    
    // Base pattern (form phase)
    float pattern = outerRing + innerRing * 0.7 + progressRing * 0.8 + hexPattern + lines + centerGlow;
    
    // Impact additions
    pattern += impactPop + shockwave + cracks + frostFill + outerFlash;
    pattern *= visibility;
    
    // LoL Color hierarchy: white core > secondary > primary
    vec3 color = uColor;
    color = mix(color, uColorSecondary, centerGlow + frostFill);
    color = mix(color, vec3(1.0), impactPop * 0.6 + cracks * 0.2); // White pop
    
    gl_FragColor = vec4(color, pattern * 0.85);
  }
`

// Bubble shader - exact same as ManaShield/ArcaneRush
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

// ============ HELPER ============

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

// Overshoot easing - goes past 1.0 then settles back (anticipation/follow-through)
function easeOutBack(t, overshoot = 1.4) {
  const c1 = overshoot
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

// Elastic bounce for impact
function easeOutElastic(t) {
  if (t === 0 || t === 1) return t
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1
}

// ============ MAIN COMPONENT ============

export default function IceShard({ targetPosition = [0, 0, 5] }) {
  const { state, activeAction, castProgressRef, STATES } = usePlayerState()
  
  const groupRef = useRef()
  const crystalRef = useRef()
  const coreRef = useRef()
  const circleRef = useRef()
  const bubbleRef = useRef()
  const crystalLightRef = useRef()
  const impactLightRef = useRef()
  const timeRef = useRef(0)
  
  const isCasting = (state === STATES.CASTING || state === STATES.ATTACKING) && activeAction === 'skill_1'
  
  // Create materials
  const crystalMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: crystalVertexShader,
    fragmentShader: crystalFragmentShader,
    uniforms: {
      uOpacity: { value: 0 },
      uColor: { value: ICE_COLOR },
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
      uColor: { value: ICE_COLOR },
      uColorSecondary: { value: ICE_CORE },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  }), [])
  
  // Glowing bubble material - exact same style as ManaShield
  const bubbleMaterial = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: bubbleVertexShader,
    fragmentShader: bubbleFragmentShader,
    uniforms: {
      uOpacity: { value: 0 },
      uTime: { value: 0 },
      uColor: { value: ICE_COLOR },
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
      if (currentOpacity < 0.01 && crystalMaterial.uniforms.uOpacity.value < 0.01) {
        // Ensure everything is at reset state
        circleMaterial.uniforms.uProgress.value = 0
        circleMaterial.uniforms.uImpact.value = 0
        crystalMaterial.uniforms.uOpacity.value = 0
        bubbleMaterial.uniforms.uOpacity.value = 0
        return
      }
      
      // Smooth fade out
      circleMaterial.uniforms.uProgress.value += (0 - circleMaterial.uniforms.uProgress.value) * opacityLerp
      circleMaterial.uniforms.uImpact.value += (0 - circleMaterial.uniforms.uImpact.value) * opacityLerp
      crystalMaterial.uniforms.uOpacity.value += (0 - crystalMaterial.uniforms.uOpacity.value) * opacityLerp
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
    
    // Update shaders
    circleMaterial.uniforms.uProgress.value = p
    bubbleMaterial.uniforms.uTime.value = timeRef.current
    
    // === LoL VFX TIMING: Fast attacks, brief holds, smooth decays ===
    const formProgress = smoothstep(0, 0.55, p)
    const dropProgress = smoothstep(0.55, 0.8, p)
    
    // Impact uses faster curve for snappy hit
    const impactRaw = smoothstep(0.8, 1.0, p)
    const impactProgress = Math.pow(impactRaw, 0.7) // Faster attack curve
    
    circleMaterial.uniforms.uImpact.value = impactProgress
    
    // Bubble: bright during charge, SHARP fade on drop (LoL anticipation)
    const bubbleOpacity = formProgress * Math.pow(1 - dropProgress, 2) // Faster fade
    bubbleMaterial.uniforms.uOpacity.value = bubbleOpacity * 1.2 // Brighter overall
    
    // Crystal: visible during form and drop, FAST fade on impact
    const crystalVisible = p < 0.85
    const crystalOpacity = crystalVisible 
      ? smoothstep(0.05, 0.3, p) // Faster appear
      : Math.pow(1 - smoothstep(0.8, 0.88, p), 2) // Sharp disappear on impact
    crystalMaterial.uniforms.uOpacity.value = crystalOpacity
    
    // Crystal position: at height during form, ACCELERATING drop (LoL: weight)
    if (crystalRef.current) {
      // Eased drop - starts slow, accelerates (feels heavy)
      const dropEased = Math.pow(dropProgress, 1.5)
      const height = FORM_HEIGHT * (1 - dropEased)
      crystalRef.current.position.y = height
      
      // Scale: quick pop in, slight pulse during charge
      const baseScale = smoothstep(0, 0.3, p) * 1.6
      const chargePulse = 1 + Math.sin(formProgress * Math.PI * 4) * 0.08 * formProgress
      crystalRef.current.scale.setScalar(baseScale * chargePulse)
      
      // Rotation accelerates during drop
      const rotSpeed = 1 + dropProgress * 2
      crystalRef.current.rotation.y = p * Math.PI * 2 * rotSpeed
    }
    
    // Core glow - intensifies toward impact (LoL: energy buildup)
    if (coreRef.current) {
      const coreIntensity = Math.pow(formProgress, 1.5) * (crystalVisible ? 1 : 0)
      coreRef.current.material.opacity = coreIntensity * 0.8
    }
    
    // === LoL SCALE ANIMATION: Anticipation squeeze, impact pop ===
    
    // Circle: slight SQUEEZE before impact, then SHARP pop outward
    let circleTargetScale
    if (impactProgress > 0) {
      // Fast pop out, quick settle (LoL snap)
      const popOut = 1.0 + (1 - Math.pow(1 - impactProgress, 3)) * 0.15
      const settle = 1 - impactProgress * 0.1
      circleTargetScale = popOut * settle
    } else if (dropProgress > 0.5) {
      // Anticipation squeeze just before impact
      const squeeze = 1.0 - (dropProgress - 0.5) * 0.1
      circleTargetScale = easeOutBack(formProgress, 1.15) * squeeze
    } else {
      circleTargetScale = easeOutBack(formProgress, 1.15)
    }
    
    // Bubble: SQUEEZE during anticipation, FAST squash on impact
    let bubbleTargetScale
    if (impactProgress > 0) {
      // Sharp squash - LoL impact feel
      bubbleTargetScale = Math.pow(1 - impactProgress, 2) * 0.8
    } else if (dropProgress > 0) {
      // Progressive squeeze during drop (building tension)
      const squeeze = 1.0 - dropProgress * 0.25
      bubbleTargetScale = easeOutBack(formProgress, 1.2) * squeeze
    } else {
      bubbleTargetScale = easeOutBack(formProgress, 1.2)
    }
    
    // Apply scales with smooth interpolation matching CastingCircle
    if (circleRef.current) {
      const s = circleRef.current.scale
      // Consistent lerp factor for smooth animation
      const lerpFactor = scaleLerp
      s.x += (circleTargetScale - s.x) * lerpFactor
      s.y += (circleTargetScale - s.y) * lerpFactor
      s.z += (circleTargetScale - s.z) * lerpFactor
    }
    if (bubbleRef.current) {
      const s = bubbleRef.current.scale
      const lerpFactor = scaleLerp
      s.x += (bubbleTargetScale - s.x) * lerpFactor
      s.y += (bubbleTargetScale - s.y) * lerpFactor
      s.z += (bubbleTargetScale - s.z) * lerpFactor
    }
    
    // Update light intensities (avoid re-renders by setting directly)
    if (crystalLightRef.current) {
      crystalLightRef.current.intensity = p * 4
    }
    if (impactLightRef.current) {
      impactLightRef.current.intensity = smoothstep(0.8, 0.9, p) * (1 - smoothstep(0.9, 1, p)) * 10
    }
  })
  
  const [tx, , tz] = targetPosition
  
  if (!isCasting) return null
  
  return (
    <group ref={groupRef} position={[tx, 0, tz]}>
      {/* Ground target circle */}
      <mesh ref={circleRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={circleMaterial} scale={0.5}>
        <planeGeometry args={[2.6, 2.6]} />
      </mesh>
      
      {/* Ice bubble - bottom 1/3 of sphere, grows from ground like wizard shield */}
      {/* Wrapper group at ground level for bottom-anchored scaling */}
      <group ref={bubbleRef} position={[0, 0, 0]} scale={0.5}>
        {/* Sphere positioned at y=1.5 like wizard's ManaShield, radius 2.0 */}
        <mesh position={[0, 1.5, 0]} material={bubbleMaterial}>
          <sphereGeometry args={[2.0, 32, 32, 0, Math.PI * 2, Math.PI * (2/3), Math.PI * (1/3)]} />
        </mesh>
      </group>
      
      {/* Crystal group */}
      <group ref={crystalRef} position={[0, FORM_HEIGHT, 0]}>
        {/* Main shard pointing down */}
        <mesh material={crystalMaterial} rotation={[Math.PI, 0, 0]} position={[0, 0.3, 0]}>
          <coneGeometry args={[0.25, 1.8, 6, 1]} />
        </mesh>
        {/* Upper crystal body */}
        <mesh material={crystalMaterial} position={[0, 0.7, 0]}>
          <octahedronGeometry args={[0.35, 0]} />
        </mesh>
        {/* Core glow sphere */}
        <mesh ref={coreRef} position={[0, 0.5, 0]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshBasicMaterial 
            color={ICE_CORE} 
            transparent 
            opacity={0} 
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
        
        <pointLight ref={crystalLightRef} color={ICE_COLOR} intensity={0} distance={3} />
      </group>
      
      {/* Impact light burst */}
      <pointLight 
        ref={impactLightRef}
        color={ICE_CORE} 
        intensity={0} 
        distance={4} 
        decay={2}
        position={[0, 0.2, 0]}
      />
    </group>
  )
}
