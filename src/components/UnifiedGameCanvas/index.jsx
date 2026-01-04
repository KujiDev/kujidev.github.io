/**
 * =============================================================================
 * UNIFIED GAME CANVAS - Single Canvas for All 3D Scenes
 * =============================================================================
 * 
 * This component provides ONE Canvas that handles multiple game scenes:
 * - Character Selection (around campfire)
 * - Gameplay (isometric world)
 * 
 * SEAMLESS TRANSITIONS:
 * =====================
 * Both scenes share the same environment (Town, fog, lighting). When 
 * transitioning from character selection to gameplay:
 * 
 * 1. Selected character walks to origin (0,0,0)
 * 2. Camera smoothly transitions from cinematic to isometric
 * 3. Other characters fade out
 * 4. Gameplay systems activate
 * 
 * No black fade needed - the scenes blend seamlessly.
 */

import { Suspense, useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { CameraControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Physics } from '@react-three/rapier';
import * as THREE from 'three';

import Town from '@/components/Town';
import Player from '@/components/Player';
import PixieOrbit from '@/components/PixieOrbit';
import WorldRoot from '@/components/WorldRoot';
import TrainingDummyModel from '@/components/TrainingDummyModel';
import IceShard from '@/components/IceShard';
import Meteor from '@/components/Meteor';
import { MovementSync, ClickIndicator, GroundPlane } from '@/systems/MovementSystem';
import Target from '@/components/Target';
import useSceneStore, { SCENES, selectCurrentScene } from '@/stores/sceneStore';
import { useCurrentClass } from '@/App';
import { getClasses } from '@/engine/classes';
import ClassPreviewModel from '@/components/CharacterCreationScreen/ClassPreviewModel';

// =============================================================================
// CAMERA CONTROLLER - Handles transitions between camera modes
// =============================================================================

/**
 * Camera positions for different scenes
 */
const CAMERA_POSITIONS = {
  characterSelection: {
    position: new THREE.Vector3(0, 8, 12),
    target: new THREE.Vector3(0, 1.2, 0),
  },
  gameplay: {
    position: new THREE.Vector3(11.02, 10, 11.02),
    target: new THREE.Vector3(0, 0, 0),
  },
};

function UnifiedCamera({ selectedClassId, classes }) {
  const cameraControlsRef = useRef();
  const currentScene = useSceneStore(selectCurrentScene);
  const prevSceneRef = useRef(currentScene);
  const isFirstRender = useRef(true);
  
  useEffect(() => {
    if (!cameraControlsRef.current) return;
    
    const isTransitioningToGame = currentScene === SCENES.GAME && prevSceneRef.current === SCENES.CHARACTER_SELECTION;
    const isCharacterSelection = currentScene === SCENES.CHARACTER_SELECTION;
    const isGameplay = currentScene === SCENES.GAME;
    
    let targetCam;
    let smoothTime = 0.6;
    
    if (isGameplay) {
      targetCam = CAMERA_POSITIONS.gameplay;
      // Longer smooth time for dramatic transition
      if (isTransitioningToGame) {
        smoothTime = 1.2;
      }
    } else if (isCharacterSelection) {
      // Focus on selected character
      const selectedClass = classes.find(c => c.id === selectedClassId);
      if (selectedClass?.characterSelection) {
        const [x, y, z] = selectedClass.characterSelection.position;
        targetCam = {
          position: CAMERA_POSITIONS.characterSelection.position.clone(),
          target: new THREE.Vector3(x, (y || 0) + 1.2, z),
        };
      } else {
        targetCam = CAMERA_POSITIONS.characterSelection;
      }
    } else {
      // Default/loading - use character selection position
      targetCam = CAMERA_POSITIONS.characterSelection;
    }
    
    const animate = !isFirstRender.current;
    
    cameraControlsRef.current.smoothTime = smoothTime;
    cameraControlsRef.current.setLookAt(
      targetCam.position.x,
      targetCam.position.y,
      targetCam.position.z,
      targetCam.target.x,
      targetCam.target.y,
      targetCam.target.z,
      animate
    );
    
    prevSceneRef.current = currentScene;
    isFirstRender.current = false;
  }, [currentScene, selectedClassId, classes]);
  
  // During gameplay, sync with IsometricCamera's expected behavior
  const isGameplay = currentScene === SCENES.GAME;
  
  return (
    <CameraControls
      ref={cameraControlsRef}
      makeDefault
      minDistance={8}
      maxDistance={18}
      minPolarAngle={Math.PI / 4}
      maxPolarAngle={Math.PI / 2.5}
      dollySpeed={0}
      truckSpeed={0}
      enabled={!isGameplay} // Disable user camera control during gameplay
    />
  );
}

// =============================================================================
// CHARACTER SELECTION MODELS - Other class models around campfire
// =============================================================================

function CharacterSelectionModels({ selectedClassId, onSelectClass }) {
  const currentScene = useSceneStore(selectCurrentScene);
  const classes = useMemo(() => getClasses(), []);
  const [opacity, setOpacity] = useState(1);
  
  // Fade out when transitioning to game
  useEffect(() => {
    if (currentScene === SCENES.GAME) {
      // Fade out other characters
      const start = performance.now();
      const duration = 800;
      
      function animate() {
        const elapsed = performance.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        setOpacity(1 - progress);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      }
      
      animate();
    } else if (currentScene === SCENES.CHARACTER_SELECTION) {
      setOpacity(1);
    }
  }, [currentScene]);
  
  // Don't render during gameplay (after fade)
  if (currentScene === SCENES.GAME && opacity === 0) {
    return null;
  }
  
  // Don't render non-selected characters during gameplay
  if (currentScene !== SCENES.CHARACTER_SELECTION) {
    return null;
  }
  
  return (
    <group>
      {classes.map(cls => {
        // Don't render the selected class - Player component handles that
        if (cls.id === selectedClassId && currentScene === SCENES.GAME) {
          return null;
        }
        
        const config = cls.characterSelection || { position: [0, 0, 0], rotation: 0 };
        const [x, y, z] = config.position;
        
        return (
          <group 
            key={cls.id}
            position={[x, y || 0, z]}
            rotation={[0, config.rotation || 0, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelectClass?.(cls.id);
            }}
          >
            <ClassPreviewModel
              classId={cls.id}
              isSelected={selectedClassId === cls.id}
              isTransitioning={false}
            />
          </group>
        );
      })}
    </group>
  );
}

// =============================================================================
// UNIFIED SCENE CONTENT
// =============================================================================

function UnifiedSceneContent({ 
  selectedClassId, 
  onSelectClass,
  PlayerTargetWrapper,
  TrainingDummyWrapper,
}) {
  const currentScene = useSceneStore(selectCurrentScene);
  const classes = useMemo(() => getClasses(), []);
  const { classId } = useCurrentClass();
  
  const isGameplay = currentScene === SCENES.GAME;
  const isCharacterSelection = currentScene === SCENES.CHARACTER_SELECTION;
  
  return (
    <>
      {/* Shared environment - same for all scenes */}
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 15, 40]} />
      <Environment preset="night" background={false} />
      
      {/* Shared lighting */}
      <ambientLight intensity={isCharacterSelection ? 0.15 : 0.2} />
      <directionalLight position={[5, 10, 5]} intensity={isCharacterSelection ? 0.3 : 0.5} color="#8b7355" />
      <pointLight position={[0, 2, 0]} intensity={isCharacterSelection ? 1.5 : 1} color="#ff6b35" distance={isCharacterSelection ? 12 : 10} />
      {isCharacterSelection && (
        <pointLight position={[0, 0.5, 0]} intensity={0.8} color="#ff4010" distance={8} />
      )}
      
      {/* ================================================================= */}
      {/* PLAYER - Always rendered, walks to origin during transition      */}
      {/* ================================================================= */}
      {isGameplay && (
        <PlayerTargetWrapper>
          <Player classId={classId} position={[0, 0, 0]}>
            <PixieOrbit />
          </Player>
        </PlayerTargetWrapper>
      )}
      
      {/* ================================================================= */}
      {/* CHARACTER SELECTION MODELS - Fade out during transition          */}
      {/* ================================================================= */}
      {isCharacterSelection && (
        <CharacterSelectionModels
          selectedClassId={selectedClassId}
          onSelectClass={onSelectClass}
        />
      )}
      
      {/* ================================================================= */}
      {/* WORLD ROOT - Game world objects                                   */}
      {/* ================================================================= */}
      <WorldRoot>
        {/* Ground plane - always active for transitions */}
        {isGameplay && <GroundPlane />}
        
        {/* Town environment - shared between scenes */}
        <Town />
        
        {/* Gameplay-only objects */}
        {isGameplay && (
          <>
            <TrainingDummyWrapper>
              <TrainingDummyModel position={[0, 0, 3]} />
            </TrainingDummyWrapper>
            
            <IceShard targetPosition={[0, 0, 3]} />
            <Meteor targetPosition={[0, 0, 3]} />
            
            <ClickIndicator />
          </>
        )}
      </WorldRoot>
      
      {/* ================================================================= */}
      {/* UNIFIED CAMERA - Transitions between modes                        */}
      {/* ================================================================= */}
      <UnifiedCamera 
        selectedClassId={selectedClassId} 
        classes={classes}
      />
      
      {/* Movement system - only active during gameplay */}
      {isGameplay && <MovementSync />}
      
      {/* Post-processing - same for all scenes */}
      <EffectComposer>
        <Bloom 
          intensity={isCharacterSelection ? 1.2 : 1.5}
          luminanceThreshold={isCharacterSelection ? 0.5 : 0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

// =============================================================================
// UNIFIED GAME CANVAS - Main export
// =============================================================================

export default function UnifiedGameCanvas({ 
  visible = true,
  selectedClassId,
  onSelectClass,
  PlayerTargetWrapper,
  TrainingDummyWrapper,
}) {
  return (
    <div style={{ 
      width: "100vw", 
      height: "100vh",
      visibility: visible ? 'visible' : 'hidden',
      pointerEvents: visible ? 'auto' : 'none',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: visible ? 0 : -1,
    }}>
      <Canvas 
        flat 
        camera={{ fov: 50, position: [0, 8, 12] }} 
        eventSource={document.getElementById('root')} 
        eventPrefix="client"
      >
        <Physics gravity={[0, -9.81, 0]}>
          <Suspense fallback={null}>
            <UnifiedSceneContent
              selectedClassId={selectedClassId}
              onSelectClass={onSelectClass}
              PlayerTargetWrapper={PlayerTargetWrapper}
              TrainingDummyWrapper={TrainingDummyWrapper}
            />
          </Suspense>
        </Physics>
      </Canvas>
    </div>
  );
}
