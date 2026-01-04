/**
 * =============================================================================
 * CHARACTER SELECTION SCENE
 * =============================================================================
 * 
 * R3F scene for character class selection around the campfire.
 * 
 * ARCHITECTURE:
 * =============
 * - All class models and positions from class config (data-driven)
 * - Town/Campfire as backdrop
 * - Each class has a 3D model + floating panel
 * - Click model or panel to select
 * - Robust loading with Suspense boundaries
 * - Transition animation when starting adventure
 * 
 * FLOW:
 * =====
 * LoadingScreen → CharacterSelectionScene → GameScene
 * 
 * TRANSITION:
 * ===========
 * When "Begin Adventure" is clicked:
 * 1. Selected character walks to origin (0,0,0)
 * 2. Camera smoothly transitions to gameplay position
 * 3. Scene fades out, HUD slides in
 */

import { useState, useMemo, useCallback, useEffect, Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { CameraControls, Environment, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

import Town from '@/components/Town';
import ClassPreviewModel from './ClassPreviewModel';
import { getClasses, getDefaultLoadoutForClass } from '@/engine/classes';

/**
 * Loading placeholder for individual models
 */
function ModelLoadingPlaceholder({ position }) {
  return (
    <Html position={position} center>
      <div style={{
        padding: '8px 16px',
        background: 'rgba(30, 25, 20, 0.9)',
        borderRadius: '4px',
        color: '#a89878',
        fontSize: '12px',
        fontFamily: 'Philosopher, serif',
      }}>
        Loading...
      </div>
    </Html>
  );
}

/**
 * Campfire Embers - floating particle effect for AAA atmosphere
 * Uses instanced meshes for performance
 */
const EMBER_COUNT = 60;

function CampfireEmbers() {
  const meshRef = useRef();
  const particlesRef = useRef([]);
  
  // Initialize particle data
  useMemo(() => {
    particlesRef.current = Array.from({ length: EMBER_COUNT }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.5,
        (Math.random() - 0.5) * 2
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        0.3 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.1
      ),
      life: Math.random(),
      maxLife: 2 + Math.random() * 3,
      scale: 0.02 + Math.random() * 0.03,
    }));
  }, []);
  
  useFrame((_, delta) => {
    if (!meshRef.current) return;
    
    const dummy = new THREE.Object3D();
    
    particlesRef.current.forEach((p, i) => {
      // Update life
      p.life += delta;
      
      // Reset if life exceeded
      if (p.life > p.maxLife) {
        p.life = 0;
        p.position.set(
          (Math.random() - 0.5) * 1.5,
          0,
          (Math.random() - 0.5) * 1.5
        );
        p.velocity.set(
          (Math.random() - 0.5) * 0.15,
          0.4 + Math.random() * 0.3,
          (Math.random() - 0.5) * 0.15
        );
      }
      
      // Move particle
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.position.z += p.velocity.z * delta;
      
      // Add slight wind sway
      p.position.x += Math.sin(p.life * 2) * 0.02 * delta;
      
      // Fade out based on life
      const lifeRatio = p.life / p.maxLife;
      const fadeScale = lifeRatio < 0.1 
        ? lifeRatio * 10 
        : lifeRatio > 0.7 
          ? 1 - ((lifeRatio - 0.7) / 0.3)
          : 1;
      
      dummy.position.copy(p.position);
      dummy.scale.setScalar(p.scale * fadeScale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh ref={meshRef} args={[null, null, EMBER_COUNT]} position={[0, 1, 0]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial 
        color="#ff6b35" 
        transparent 
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/**
 * Dust Motes - ambient floating particles for depth
 */
const DUST_COUNT = 40;

function DustMotes() {
  const meshRef = useRef();
  const particlesRef = useRef([]);
  
  useMemo(() => {
    particlesRef.current = Array.from({ length: DUST_COUNT }, () => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        0.5 + Math.random() * 4,
        (Math.random() - 0.5) * 12
      ),
      phase: Math.random() * Math.PI * 2,
      speed: 0.2 + Math.random() * 0.3,
      scale: 0.02 + Math.random() * 0.02,
    }));
  }, []);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    
    const dummy = new THREE.Object3D();
    const t = state.clock.elapsedTime;
    
    particlesRef.current.forEach((p, i) => {
      // Gentle floating motion
      const offsetY = Math.sin(t * p.speed + p.phase) * 0.3;
      const offsetX = Math.cos(t * p.speed * 0.7 + p.phase) * 0.2;
      
      dummy.position.set(
        p.position.x + offsetX,
        p.position.y + offsetY,
        p.position.z
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  return (
    <instancedMesh ref={meshRef} args={[null, null, DUST_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial 
        color="#a89878" 
        transparent 
        opacity={0.25}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/**
 * Cinematic Camera - smoothly transitions to focus on selected character
 * Uses CameraControls with animated transitions
 * Supports transitioning to gameplay camera position on adventure start
 */
function CinematicCamera({ selectedClassId, classes, isTransitioning }) {
  const cameraControlsRef = useRef();
  const prevSelectedRef = useRef(selectedClassId);
  const isFirstRender = useRef(true);
  
  // Gameplay camera position (matches IsometricCamera settings)
  const GAMEPLAY_CAMERA = {
    position: { x: 11.02, y: 10, z: 11.02 },
    target: { x: 0, y: 0, z: 0 },
  };
  
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    // If transitioning, animate to gameplay camera position
    if (isTransitioning) {
      cameraControlsRef.current.setLookAt(
        GAMEPLAY_CAMERA.position.x,
        GAMEPLAY_CAMERA.position.y,
        GAMEPLAY_CAMERA.position.z,
        GAMEPLAY_CAMERA.target.x,
        GAMEPLAY_CAMERA.target.y,
        GAMEPLAY_CAMERA.target.z,
        true // animate
      );
      return;
    }
    
    // Find the selected class's position
    const selectedClass = classes.find(c => c.id === selectedClassId);
    if (!selectedClass) return;
    
    const selectionConfig = selectedClass.characterSelection || { position: [0, 0, 0], rotation: 0 };
    const [x, y, z] = selectionConfig.position;
    
    // Calculate camera target - look at character's upper body
    const targetX = x;
    const targetY = (y || 0) + 1.2; // Focus on chest/face height
    const targetZ = z;
    
    // Fixed camera position - high and behind the formation, looking down at campfire area
    const cameraX = 0;
    const cameraHeight = 8;
    const cameraZ = 12;
    
    // Animate or set immediately based on first render
    const animate = !isFirstRender.current && prevSelectedRef.current !== selectedClassId;
    
    // Set the look-at target (where camera points)
    cameraControlsRef.current.setLookAt(
      // Camera position
      cameraX,
      cameraHeight,
      cameraZ,
      // Look-at target
      targetX,
      targetY,
      targetZ,
      animate
    );
    
    prevSelectedRef.current = selectedClassId;
    isFirstRender.current = false;
    
  }, [selectedClassId, classes, isTransitioning]);
  
  return (
    <CameraControls
      ref={cameraControlsRef}
      makeDefault
      minDistance={8}
      maxDistance={14}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.5}
      dollySpeed={0}
      truckSpeed={0}
      smoothTime={isTransitioning ? 1.2 : 0.6}
    />
  );
}

/**
 * Individual character display group (model + panel)
 * Supports smooth transition animation to origin when adventure starts
 */
function CharacterDisplay({ 
  classConfig, 
  isSelected, 
  isHovered,
  isTransitioning,
  onSelect,
  onHover,
  onUnhover,
}) {
  const groupRef = useRef();
  const selectionConfig = classConfig.characterSelection || {
    position: [0, 0, 0],
    rotation: 0,
    panelOffset: [0, 2.5, 0],
  };
  
  // Store initial position and target position for animation
  const initialPosition = useRef(new THREE.Vector3(...selectionConfig.position));
  const currentPosition = useRef(new THREE.Vector3(...selectionConfig.position));
  const targetPosition = useRef(new THREE.Vector3(...selectionConfig.position));
  const currentRotation = useRef(selectionConfig.rotation || 0);
  
  // When transitioning starts for selected character, set target to origin
  useEffect(() => {
    if (isTransitioning && isSelected) {
      targetPosition.current.set(0, 0, 0);
    } else if (!isTransitioning) {
      // Reset to original position when not transitioning
      targetPosition.current.copy(initialPosition.current);
      currentPosition.current.copy(initialPosition.current);
      currentRotation.current = selectionConfig.rotation || 0;
    }
  }, [isTransitioning, isSelected, selectionConfig.rotation]);
  
  // Animate position smoothly - walk at consistent speed like pathfinding
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    
    if (isTransitioning && isSelected) {
      // Calculate direction to target
      const direction = new THREE.Vector3().subVectors(targetPosition.current, currentPosition.current);
      const distance = direction.length();
      
      // Walk at constant speed (units per second)
      const walkSpeed = 3.0;
      
      if (distance > 0.1) {
        // Normalize direction and move at constant speed
        direction.normalize();
        const moveAmount = Math.min(walkSpeed * delta, distance);
        currentPosition.current.add(direction.multiplyScalar(moveAmount));
        groupRef.current.position.copy(currentPosition.current);
        
        // Face the direction of movement
        const targetRotation = Math.atan2(direction.x, direction.z);
        currentRotation.current = THREE.MathUtils.lerp(currentRotation.current, targetRotation, delta * 8);
        groupRef.current.rotation.y = currentRotation.current;
      } else {
        // Snap to target when close enough
        currentPosition.current.copy(targetPosition.current);
        groupRef.current.position.copy(currentPosition.current);
        // Face forward (same as Player default)
        currentRotation.current = THREE.MathUtils.lerp(currentRotation.current, 0, delta * 5);
        groupRef.current.rotation.y = currentRotation.current;
      }
    }
  });
  
  const handleClick = useCallback((e) => {
    if (isTransitioning) return; // Disable clicking during transition
    e.stopPropagation();
    onSelect(classConfig.id);
    
    if (import.meta.env.DEV) {
      const loadout = getDefaultLoadoutForClass(classConfig.id);
      const loadoutSlots = Object.entries(loadout)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(`[DEBUG][CharacterCreation] selectedClass=${classConfig.id}, loadout={${loadoutSlots}}`);
    }
  }, [classConfig.id, onSelect]);
  
  const handlePointerOver = useCallback((e) => {
    e.stopPropagation();
    onHover(classConfig.id);
    document.body.style.cursor = 'pointer';
  }, [classConfig.id, onHover]);
  
  const handlePointerOut = useCallback(() => {
    onUnhover();
    document.body.style.cursor = 'default';
  }, [onUnhover]);
  
  // Hide non-selected characters during transition
  if (isTransitioning && !isSelected) {
    return null;
  }
  
  return (
    <group 
      ref={groupRef}
      position={selectionConfig.position}
      rotation={[0, selectionConfig.rotation, 0]}
    >
      {/* 3D Character Model with Suspense */}
      <Suspense fallback={<ModelLoadingPlaceholder position={[0, 1, 0]} />}>
        <ClassPreviewModel
          classConfig={classConfig}
          isSelected={isSelected}
          isHovered={isHovered}
          isTransitioning={isTransitioning}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        />
      </Suspense>
    </group>
  );
}

/**
 * Main scene content
 */
function SceneContent({ 
  selectedClassId, 
  hoveredClassId,
  isTransitioning,
  onSelectClass,
  onHoverClass,
  onUnhoverClass,
}) {
  const classes = useMemo(() => getClasses(), []);
  
  // Debug: Log loaded models on mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[DEBUG][R3F] Loaded models:');
      classes.forEach(cls => {
        const anims = Object.values(cls.stateAnimations || {});
        console.log(`  - ${cls.name}: ${anims.join(', ')}`);
      });
    }
  }, [classes]);
  
  const handleMissClick = useCallback(() => {
    // Clicking empty space does nothing in selection mode
  }, []);
  
  return (
    <>
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 15, 40]} />
      <Environment preset="night" background={false} />
      
      {/* Lighting - warm campfire mood */}
      <ambientLight intensity={0.15} />
      <directionalLight position={[5, 10, 5]} intensity={0.3} color="#8b7355" />
      <pointLight position={[0, 2, 0]} intensity={1.5} color="#ff6b35" distance={12} />
      <pointLight position={[0, 0.5, 0]} intensity={0.8} color="#ff4010" distance={8} />
      
      {/* Town environment (includes campfire) */}
      <Town />
      
      {/* Atmospheric particles - AAA polish */}
      <CampfireEmbers />
      <DustMotes />
      
      {/* Character displays around campfire */}
      {classes.map(cls => (
        <CharacterDisplay
          key={cls.id}
          classConfig={cls}
          isSelected={selectedClassId === cls.id}
          isHovered={hoveredClassId === cls.id}
          isTransitioning={isTransitioning}
          onSelect={onSelectClass}
          onHover={onHoverClass}
          onUnhover={onUnhoverClass}
        />
      ))}
      
      {/* Cinematic camera - smoothly rotates toward selected character */}
      <CinematicCamera selectedClassId={selectedClassId} classes={classes} isTransitioning={isTransitioning} />
      
      {/* Post-processing */}
      <EffectComposer>
        <Bloom 
          intensity={1.2}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

/**
 * Character Selection Scene with Canvas wrapper
 */
export default function CharacterSelectionScene({ 
  selectedClassId, 
  isTransitioning,
  onSelectClass,
}) {
  const [hoveredClassId, setHoveredClassId] = useState(null);
  
  const handleHover = useCallback((classId) => {
    setHoveredClassId(classId);
  }, []);
  
  const handleUnhover = useCallback(() => {
    setHoveredClassId(null);
  }, []);
  
  return (
    <Canvas 
      flat 
      camera={{ fov: 50, position: [0, 8, 12] }}
    >
      <Physics gravity={[0, 0, 0]} paused>
        <SceneContent
          selectedClassId={selectedClassId}
          hoveredClassId={hoveredClassId}
          isTransitioning={isTransitioning}
          onSelectClass={onSelectClass}
          onHoverClass={handleHover}
          onUnhoverClass={handleUnhover}
        />
      </Physics>
    </Canvas>
  );
}
