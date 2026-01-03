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
 * - No game logic - purely visual rendering
 * 
 * FLOW:
 * =====
 * LoadingScreen → CharacterSelectionScene → GameScene
 */

import { useState, useMemo, useCallback, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Environment, Html } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

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
 * Individual character display group (model + panel)
 */
function CharacterDisplay({ 
  classConfig, 
  isSelected, 
  onSelect,
  onHover,
  onUnhover,
}) {
  const selectionConfig = classConfig.characterSelection || {
    position: [0, 0, 0],
    rotation: 0,
    panelOffset: [0, 2.5, 0],
  };
  
  const handleClick = useCallback((e) => {
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
  
  return (
    <group 
      position={selectionConfig.position}
      rotation={[0, selectionConfig.rotation, 0]}
    >
      {/* 3D Character Model with Suspense */}
      <Suspense fallback={<ModelLoadingPlaceholder position={[0, 1, 0]} />}>
        <ClassPreviewModel
          classConfig={classConfig}
          isSelected={isSelected}
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
      
      {/* Character displays around campfire */}
      {classes.map(cls => (
        <CharacterDisplay
          key={cls.id}
          classConfig={cls}
          isSelected={selectedClassId === cls.id}
          onSelect={onSelectClass}
          onHover={onHoverClass}
          onUnhover={onUnhoverClass}
        />
      ))}
      
      {/* Camera - fixed angle looking at campfire */}
      <CameraControls
        makeDefault
        minDistance={12}
        maxDistance={12}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 3}
        minAzimuthAngle={0}
        maxAzimuthAngle={0}
        dollySpeed={0}
        truckSpeed={0}
      />
      
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
      eventSource={document.getElementById('root')}
      eventPrefix="client"
    >
      <SceneContent
        selectedClassId={selectedClassId}
        hoveredClassId={hoveredClassId}
        onSelectClass={onSelectClass}
        onHoverClass={handleHover}
        onUnhoverClass={handleUnhover}
      />
    </Canvas>
  );
}
