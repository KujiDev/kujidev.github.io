import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Physics } from "@react-three/rapier";
import { useEffect, useRef, Suspense, useState, useMemo, createContext, useContext, useCallback } from "react";

import Hud from "@/components/Hud";
import SkillBar, { Slot } from "@/components/SkillBar";
import Orb from "@/components/Orb";
import CastingBar from "@/components/CastingBar";
import BuffBar from "@/components/BuffBar";
import Player from "@/components/Player";
import MenuBar from "@/components/MenuBar";
import AchievementToast from "@/components/AchievementToast";
import Target, { TargetProvider, useTarget } from "@/components/Target";
import TargetHealthBar from "@/components/TargetHealthBar";
import LoadingScreen, { markGameStarted } from "@/components/LoadingScreen";
import CharacterCreationUI from "@/components/CharacterCreationScreen/CharacterCreationUI";
import Town from "@/components/Town";
import TrainingDummyModel from "@/components/TrainingDummyModel";
import PixieOrbit from "@/components/PixieOrbit";
import DebugPanel from "@/components/DebugPanel";
// Projectiles - owned by the scene, triggered by player actions
import IceShard from "@/components/IceShard";
import Meteor from "@/components/Meteor";

// World system - Diablo-style "world moves around player"
import WorldRoot from "@/components/WorldRoot";
import IsometricCamera from "@/components/IsometricCamera";
import { MovementSync, MovementDebugOverlay, ClickIndicator, GroundPlane, markGameActive } from "@/systems/MovementSystem";

// Scene management
import SceneManager, { Scene } from "@/components/SceneManager";
import useSceneStore, { SCENES, useSceneTransition, useInputGate, selectCurrentScene } from "@/stores/sceneStore";

import { KeyMapProvider, useKeyMap } from "@/hooks/useKeyMap";
import { usePlayerState, useSlotMap, useAchievements, useActiveClass } from "@/hooks/useGame";
import { InputProvider, KeyboardSync, useInput } from "@/hooks/useInput";
import { useSlotButton, useMouseSlotButton } from "@/hooks/useSlotButton";
import { SKILL_SLOTS, MOUSE_SLOTS, CONSUMABLE_SLOTS, PIXIE_SLOTS } from "@/config/slots";
import { DragDropProvider } from "@/hooks/useDragDrop";
import { getSkills, getConsumables } from "@/config/actions";

// SCENES are now defined in sceneStore.js

// =============================================================================
// CLASS CONTEXT - Allows components to access current class
// =============================================================================

const ClassContext = createContext({ classId: 'wizard', setClassId: () => {} });

export function useCurrentClass() {
  return useContext(ClassContext);
}

// === DEVELOPMENT ICON VERIFICATION ===
// Runs once at startup to ensure all actions have icons resolved
if (import.meta.env.DEV) {
  const allActions = [...getSkills(), ...getConsumables()];
  const missingIcons = allActions.filter(a => !a.icon);
  
  if (missingIcons.length > 0) {
    console.error('[ICON VERIFICATION FAILED] Actions missing icons:', 
      missingIcons.map(a => a.id)
    );
  }
}


const AchievementTracker = () => {
  const { state, activeAction, buffs } = usePlayerState();
  const { unlock } = useAchievements();
  const { slotMap } = useSlotMap();
  const hasTrackedCast = useRef(false);
  const trackedPotionBuff = useRef(false);
  const trackedFirstPixie = useRef(false);
  const trackedPixieTrio = useRef(false);
  
  // Build set of skill action IDs from data - include both legacy and semantic IDs
  const skillActionIds = useMemo(() => {
    const skills = getSkills();
    const ids = new Set();
    for (const s of skills) {
      ids.add(s.id);  // Legacy ID (e.g., 'skill_1')
      if (s._skillId) ids.add(s._skillId);  // Semantic ID (e.g., 'ice_shard')
    }
    return ids;
  }, []);
  
  // Build set of consumable buff IDs (data-driven)
  const consumableBuffIds = useMemo(() => {
    const consumables = getConsumables();
    return new Set(consumables.map(c => c.buff?.id).filter(Boolean));
  }, []);

  useEffect(() => {
    if (!hasTrackedCast.current && (state === 'casting' || state === 'attacking') && activeAction) {
      if (skillActionIds.has(activeAction)) {
        unlock('first_cast');
        hasTrackedCast.current = true;
      }
    }
  }, [state, activeAction, unlock, skillActionIds]);

  // DATA-DRIVEN: Trigger achievement for ANY consumable buff (not just health_potion)
  useEffect(() => {
    if (!trackedPotionBuff.current && buffs.some(b => consumableBuffIds.has(b.id))) {
      if (import.meta.env.DEV) {
        console.log(`[ACHIEVEMENT] potion_master unlocked via buff:`, buffs.map(b => b.id));
      }
      unlock('potion_master');
      trackedPotionBuff.current = true;
    }
  }, [buffs, unlock, consumableBuffIds]);

  // Track pixie achievements
  useEffect(() => {
    const equippedPixies = PIXIE_SLOTS
      .map(slot => slotMap?.[slot.id])
      .filter(Boolean);
    
    if (!trackedFirstPixie.current && equippedPixies.length >= 1) {
      unlock('first_pixie');
      trackedFirstPixie.current = true;
    }
    
    if (!trackedPixieTrio.current && equippedPixies.length >= 3) {
      unlock('pixie_trio');
      trackedPixieTrio.current = true;
    }
  }, [slotMap, unlock]);

  return null;
};

const InputToStateSync = () => {
  const { handleInput } = usePlayerState();
  const { getActionForSlot } = useSlotMap();
  
  // Subscribe to slot-based keyboard controls (mouse buttons handled separately in Target component)
  const slot1 = useKeyboardControls((state) => state.slot_1);
  const slot2 = useKeyboardControls((state) => state.slot_2);
  const slot3 = useKeyboardControls((state) => state.slot_3);
  const slot4 = useKeyboardControls((state) => state.slot_4);
  const slotC1 = useKeyboardControls((state) => state.slot_consumable_1);
  const slotC2 = useKeyboardControls((state) => state.slot_consumable_2);

  // When a slot key is pressed, find the action in that slot and trigger it
  useEffect(() => {
    const actionId = getActionForSlot('slot_1');
    if (actionId) handleInput(actionId, slot1);
  }, [slot1, handleInput, getActionForSlot]);
  
  useEffect(() => {
    const actionId = getActionForSlot('slot_2');
    if (actionId) handleInput(actionId, slot2);
  }, [slot2, handleInput, getActionForSlot]);
  
  useEffect(() => {
    const actionId = getActionForSlot('slot_3');
    if (actionId) handleInput(actionId, slot3);
  }, [slot3, handleInput, getActionForSlot]);
  
  useEffect(() => {
    const actionId = getActionForSlot('slot_4');
    if (actionId) handleInput(actionId, slot4);
  }, [slot4, handleInput, getActionForSlot]);
  
  useEffect(() => {
    const actionId = getActionForSlot('slot_consumable_1');
    if (actionId) handleInput(actionId, slotC1);
  }, [slotC1, handleInput, getActionForSlot]);
  
  useEffect(() => {
    const actionId = getActionForSlot('slot_consumable_2');
    if (actionId) handleInput(actionId, slotC2);
  }, [slotC2, handleInput, getActionForSlot]);

  return null;
};

/**
 * Slot-based skill button - gets action from slotMap
 * Uses the shared useSlotButton hook for DRY implementation.
 */
const SlotButton = ({ slotId }) => {
  const { actionId, keyBind, icon, active, disabled, tooltip, handlers } = useSlotButton(slotId);
  
  return (
    <Slot 
      slotId={slotId}
      actionId={actionId}
      keyBind={keyBind} 
      icon={icon}
      active={active}
      disabled={disabled}
      tooltip={tooltip}
      {...handlers}
    />
  );
};

/**
 * Mouse slot button - shows active state when mouse button is pressed on target
 * Uses the shared useMouseSlotButton hook for DRY implementation.
 */
const MouseSlotButton = ({ slotId }) => {
  const { actionId, keyBind, icon, active, disabled, tooltip } = useMouseSlotButton(slotId);
  
  return (
    <Slot 
      slotId={slotId}
      actionId={actionId}
      keyBind={keyBind}
      icon={icon}
      active={active}
      disabled={disabled}
      tooltip={tooltip}
    />
  );
};

const GameUI = ({ slideIn }) => (
  <>
    <TargetHealthBar />
    <Hud slideIn={slideIn}>
      <Orb type="health" label="Health" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
        <BuffBar />
        <CastingBar />
        <MenuBar />
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <SlotButton slotId={CONSUMABLE_SLOTS[0].id} />
          <SkillBar>
            {SKILL_SLOTS.map(slot => (
              <SlotButton key={slot.id} slotId={slot.id} />
            ))}
            {MOUSE_SLOTS.map(slot => (
              <MouseSlotButton key={slot.id} slotId={slot.id} />
            ))}
          </SkillBar>
          <SlotButton slotId={CONSUMABLE_SLOTS[1].id} />
        </div>
      </div>
      <Orb type="mana" label="Mana" />
    </Hud>
  </>
);

/**
 * Wraps content with keyboard controls and settings.
 */
const GameControls = ({ children, hudSlideIn }) => {
  const { keyMap } = useKeyMap();
  const currentScene = useSceneStore(selectCurrentScene);
  const isGameScene = currentScene === SCENES.GAME;

  return (
    <KeyboardControls map={keyMap}>
      <InputProvider>
        {children}
        <KeyboardSync />
        <InputToStateSync />
        <AchievementTracker />
        {/* HUD only visible during game scene */}
        {isGameScene && <GameUI slideIn={hudSlideIn} />}
      </InputProvider>
    </KeyboardControls>
  );
};

/**
 * Player target wrapper that syncs with player state including buffs.
 */
const PlayerTarget = ({ children }) => {
  const { health, maxHealth, buffs } = usePlayerState();
  return (
    <Target name="Wizard" health={health} maxHealth={maxHealth} level={70} type="friendly" buffs={buffs}>
      {children}
    </Target>
  );
};

/**
 * Simple training dummy target (no fake debuffs).
 */
const TrainingDummy = ({ children }) => {
  return (
    <Target 
      name="Training Dummy" 
      health={75} 
      maxHealth={100} 
      level={72} 
      type="enemy"
    >
      {children}
    </Target>
  );
};

/**
 * 3D Game Scene content - Diablo-style world offset system.
 * 
 * ARCHITECTURE:
 * - Player is ALWAYS at (0, 0, 0)
 * - World objects are children of WorldRoot
 * - WorldRoot position is driven by worldOffset (inverted player movement)
 * - Camera is fixed isometric, always looks at origin
 * - Physics via Rapier for collision detection
 */
const GameScene = () => {
  const { unlockTarget } = useTarget() || {}
  const { classId } = useCurrentClass();
  
  const handleMissClick = (e) => {
    // Only unlock if clicking on non-target (floor, background)
    unlockTarget?.()
  }
  
  return (
    <Physics gravity={[0, -9.81, 0]}>
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 15, 40]} />
      <Environment preset="night" background={false} />
      
      {/* Global lighting - not affected by world offset */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#8b7355" />
      
      {/* ================================================================= */}
      {/* PLAYER - Always at origin (0, 0, 0) - NOT inside WorldRoot       */}
      {/* ================================================================= */}
      <PlayerTarget>
        <Player classId={classId} position={[0, 0, 0]}>
          <PixieOrbit />
        </Player>
      </PlayerTarget>

      {/* ================================================================= */}
      {/* WORLD ROOT - Everything that moves around the player             */}
      {/* ================================================================= */}
      <WorldRoot>
        {/* Invisible ground plane for click-to-move */}
        <GroundPlane />
        
        {/* Campfire light - part of world, moves with it */}
        <pointLight position={[0, 2, 0]} intensity={1} color="#ff6b35" distance={10} />
        
        {/* Town environment */}
        <Town />

        {/* Test enemy target */}
        <TrainingDummy>
          <TrainingDummyModel position={[0, 0, 3]} />
        </TrainingDummy>
        
        {/* Projectile effects - spawn at player (origin), travel into world */}
        <IceShard targetPosition={[0, 0, 3]} />
        <Meteor targetPosition={[0, 0, 3]} />
        
        {/* Click destination indicator */}
        <ClickIndicator />
      </WorldRoot>

      {/* ================================================================= */}
      {/* CAMERA & SYSTEMS - Fixed isometric, no user rotation             */}
      {/* ================================================================= */}
      <IsometricCamera 
        distance={18}
        enableZoom={false}
      />
      
      {/* Movement system - path following */}
      <MovementSync />

      <EffectComposer>
        <Bloom 
          intensity={1.5}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Physics>
  )
}

/**
 * =============================================================================
 * UNIFIED SCENE - Handles both Character Selection and Gameplay
 * =============================================================================
 * 
 * Same Town/environment is used for both scenes. Camera and content
 * smoothly transition between modes for seamless experience.
 */
import { CameraControls } from '@react-three/drei';
import { getClasses } from '@/engine/classes';
import ClassPreviewModel from '@/components/CharacterCreationScreen/ClassPreviewModel';

// Camera positions for different scenes
const CAMERA_POSITIONS = {
  characterSelection: { position: [0, 8, 12], target: [0, 1.2, 0] },
  gameplay: { position: [11.02, 10, 11.02], target: [0, 0, 0] },
};

/**
 * Get camera target for a specific class (or first class as default)
 */
function getCharacterCameraTarget(classes, classId) {
  const targetClass = classes.find(c => c.id === classId) || classes[0];
  if (targetClass?.characterSelection) {
    const [x, y, z] = targetClass.characterSelection.position;
    return {
      position: CAMERA_POSITIONS.characterSelection.position,
      target: [x, (y || 0) + 1.2, z],
    };
  }
  return CAMERA_POSITIONS.characterSelection;
}

/**
 * Unified camera that transitions between character selection and gameplay
 * Defaults to first character's position even before character selection starts
 */
function UnifiedCamera({ selectedClassId }) {
  const cameraRef = useRef();
  const currentScene = useSceneStore(selectCurrentScene);
  const prevSceneRef = useRef(null);
  const classes = useMemo(() => getClasses(), []);
  const isFirstRender = useRef(true);
  
  useEffect(() => {
    if (!cameraRef.current) return;
    
    const isTransitioningToGame = currentScene === SCENES.GAME && prevSceneRef.current === SCENES.CHARACTER_SELECTION;
    
    let cam;
    let smoothTime = 0.6;
    let animate = !isFirstRender.current;
    
    if (currentScene === SCENES.GAME) {
      cam = CAMERA_POSITIONS.gameplay;
      if (isTransitioningToGame) smoothTime = 1.2;
    } else if (currentScene === SCENES.CHARACTER_SELECTION) {
      // Focus on selected character
      cam = getCharacterCameraTarget(classes, selectedClassId);
    } else {
      // LOADING or other scenes: default to first character's position
      // So camera is already in place when character selection starts
      cam = getCharacterCameraTarget(classes, classes[0]?.id);
      animate = false; // Don't animate on initial load
    }
    
    cameraRef.current.smoothTime = smoothTime;
    cameraRef.current.setLookAt(
      cam.position[0], cam.position[1], cam.position[2],
      cam.target[0], cam.target[1], cam.target[2],
      animate
    );
    
    prevSceneRef.current = currentScene;
    isFirstRender.current = false;
  }, [currentScene, selectedClassId, classes]);
  
  return (
    <CameraControls
      ref={cameraRef}
      makeDefault
      minDistance={8}
      maxDistance={18}
      dollySpeed={0}
      truckSpeed={0}
      enabled={currentScene === SCENES.CHARACTER_SELECTION}
    />
  );
}

/**
 * Character preview models for selection (non-selected characters around campfire)
 */
function CharacterSelectionModels({ selectedClassId, onSelectClass }) {
  const currentScene = useSceneStore(selectCurrentScene);
  const isTransitioning = useSceneStore((s) => s.isTransitioning);
  const classes = useMemo(() => getClasses(), []);
  
  // Only show during character selection
  if (currentScene !== SCENES.CHARACTER_SELECTION) return null;
  
  return (
    <>
      {classes.map(cls => {
        const config = cls.characterSelection || { position: [0, 0, 0], rotation: 0 };
        const [x, y, z] = config.position;
        
        // Hide the selected character when transitioning (TransitioningCharacter takes over)
        if (isTransitioning && selectedClassId === cls.id) return null;
        
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
              classConfig={cls}
              isSelected={selectedClassId === cls.id}
              isTransitioning={false}
            />
          </group>
        );
      })}
    </>
  );
}

/**
 * Character that walks from campfire position to origin during transition
 */
function TransitioningCharacter({ selectedClassId }) {
  const groupRef = useRef();
  const currentScene = useSceneStore(selectCurrentScene);
  const isTransitioning = useSceneStore((s) => s.isTransitioning);
  const classes = useMemo(() => getClasses(), []);
  const [showTransition, setShowTransition] = useState(false);
  const [walkAnimationActive, setWalkAnimationActive] = useState(true);
  const startPosRef = useRef(null);
  const progressRef = useRef(0);
  const prevTransitioningRef = useRef(false);
  
  // Default player facing direction - character should face toward camera (rotation = 0)
  const FINAL_ROTATION = 0;
  
  const selectedClass = useMemo(
    () => classes.find(c => c.id === selectedClassId),
    [classes, selectedClassId]
  );
  
  // Start transition animation when isTransitioning changes from false to true
  // (this happens while we're still in CHARACTER_SELECTION scene)
  useEffect(() => {
    const wasTransitioning = prevTransitioningRef.current;
    prevTransitioningRef.current = isTransitioning;
    
    // Detect transition START (false -> true) while in character selection
    if (!wasTransitioning && isTransitioning && currentScene === SCENES.CHARACTER_SELECTION) {
      const config = selectedClass?.characterSelection || { position: [0, 0, 0] };
      startPosRef.current = [...config.position];
      progressRef.current = 0;
      setShowTransition(true);
      setWalkAnimationActive(true);
      
      // Set initial position
      if (groupRef.current) {
        const [x, y, z] = config.position;
        groupRef.current.position.set(x, y || 0, z);
      }
    }
  }, [isTransitioning, currentScene, selectedClass]);
  
  // Hide when transition complete AND we're in game scene
  useEffect(() => {
    if (!isTransitioning && currentScene === SCENES.GAME && showTransition) {
      // Small delay to ensure player is rendered
      const timer = setTimeout(() => setShowTransition(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, currentScene, showTransition]);
  
  // Animate position each frame
  useFrame((_, delta) => {
    if (!showTransition || !groupRef.current || !startPosRef.current) return;
    
    // Animate progress (complete in ~1.2s)
    progressRef.current = Math.min(progressRef.current + delta / 1.2, 1);
    const t = progressRef.current;
    
    // Ease out cubic
    const eased = 1 - Math.pow(1 - t, 3);
    
    // Lerp from start to origin
    const [sx, sy, sz] = startPosRef.current;
    groupRef.current.position.x = sx * (1 - eased);
    groupRef.current.position.y = (sy || 0) * (1 - eased);
    groupRef.current.position.z = sz * (1 - eased);
    
    // Calculate rotation
    if (t < 0.7) {
      // During walk: face direction of travel
      const targetAngle = Math.atan2(-sx, -sz);
      groupRef.current.rotation.y = targetAngle;
    } else {
      // Near end: smoothly rotate to final player rotation
      const travelAngle = Math.atan2(-sx, -sz);
      const rotationBlend = (t - 0.7) / 0.3; // 0 to 1 over last 30%
      const easedBlend = rotationBlend * rotationBlend; // Ease in
      
      // Handle angle wrapping for shortest rotation
      let diff = FINAL_ROTATION - travelAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      
      groupRef.current.rotation.y = travelAngle + diff * easedBlend;
    }
    
    // Stop walk animation near the end (at 85%) so it blends to idle
    if (t > 0.85 && walkAnimationActive) {
      setWalkAnimationActive(false);
    }
  });
  
  if (!showTransition || !selectedClass) return null;
  
  return (
    <group ref={groupRef}>
      <ClassPreviewModel
        classConfig={selectedClass}
        isSelected={true}
        isTransitioning={walkAnimationActive}
      />
    </group>
  );
}

/**
 * Unified Scene that handles both character selection and gameplay
 */
function UnifiedScene({ selectedClassId, onSelectClass }) {
  const { unlockTarget } = useTarget() || {};
  const { classId } = useCurrentClass();
  const currentScene = useSceneStore(selectCurrentScene);
  const isTransitioning = useSceneStore((s) => s.isTransitioning);
  
  const isCharacterSelection = currentScene === SCENES.CHARACTER_SELECTION;
  const isGameplay = currentScene === SCENES.GAME;
  // Show player only when gameplay is active AND not transitioning
  const showPlayer = isGameplay && !isTransitioning;
  
  return (
    <Physics gravity={[0, -9.81, 0]}>
      {/* Shared environment */}
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 15, 40]} />
      <Environment preset="night" background={false} />
      
      {/* Lighting - slightly different for each scene */}
      <ambientLight intensity={isCharacterSelection ? 0.15 : 0.2} />
      <directionalLight position={[5, 10, 5]} intensity={isCharacterSelection ? 0.3 : 0.5} color="#8b7355" />
      <pointLight position={[0, 2, 0]} intensity={isCharacterSelection ? 1.5 : 1} color="#ff6b35" distance={isCharacterSelection ? 12 : 10} />
      {isCharacterSelection && (
        <pointLight position={[0, 0.5, 0]} intensity={0.8} color="#ff4010" distance={8} />
      )}
      
      {/* Transitioning character - walks from campfire to origin */}
      <TransitioningCharacter selectedClassId={selectedClassId} />
      
      {/* Player - only when gameplay is active and transition complete */}
      {showPlayer && (
        <PlayerTarget>
          <Player classId={classId} position={[0, 0, 0]}>
            <PixieOrbit />
          </Player>
        </PlayerTarget>
      )}
      
      {/* Character selection models - only during selection */}
      <CharacterSelectionModels 
        selectedClassId={selectedClassId}
        onSelectClass={onSelectClass}
      />
      
      {/* World content */}
      <WorldRoot>
        {isGameplay && <GroundPlane />}
        
        <pointLight position={[0, 2, 0]} intensity={1} color="#ff6b35" distance={10} />
        <Town />
        
        {isGameplay && (
          <>
            <TrainingDummy>
              <TrainingDummyModel position={[0, 0, 3]} />
            </TrainingDummy>
            <IceShard targetPosition={[0, 0, 3]} />
            <Meteor targetPosition={[0, 0, 3]} />
            <ClickIndicator />
          </>
        )}
      </WorldRoot>
      
      {/* Unified camera */}
      <UnifiedCamera selectedClassId={selectedClassId} />
      
      {/* Movement - gameplay only */}
      {isGameplay && <MovementSync />}
      
      {/* Post-processing */}
      <EffectComposer>
        <Bloom 
          intensity={isCharacterSelection ? 1.2 : 1.5}
          luminanceThreshold={isCharacterSelection ? 0.5 : 0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Physics>
  );
}

/**
 * Canvas wrapper - always mounted for WebGL stability.
 * Visibility controlled via CSS to prevent EffectComposer remount issues.
 * Now handles both character selection and gameplay in one unified canvas.
 */
const GameCanvas = ({ visible, selectedClassId, onSelectClass }) => {
  const currentScene = useSceneStore(selectCurrentScene);
  const isCharacterSelection = currentScene === SCENES.CHARACTER_SELECTION;
  const isGameplay = currentScene === SCENES.GAME;
  
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
        <Suspense fallback={null}>
          <UnifiedScene 
            selectedClassId={selectedClassId}
            onSelectClass={onSelectClass}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default function App() {
  const { transitionTo, currentScene } = useSceneTransition();
  const setScene = useSceneStore((s) => s.setScene);
  const [classId, setClassId] = useState('wizard');
  const [selectedClassId, setSelectedClassId] = useState('wizard'); // For character selection
  const [hudSlideIn, setHudSlideIn] = useState(false);
  const { activeClassId } = useActiveClass();
  
  const prevSceneRef = useRef(currentScene);
  
  // Trigger HUD slide-in when entering GAME scene from any other scene
  useEffect(() => {
    const prevScene = prevSceneRef.current;
    prevSceneRef.current = currentScene;
    
    // If we just entered GAME scene
    if (currentScene === SCENES.GAME && prevScene !== SCENES.GAME) {
      // Small delay to ensure scene is fully ready
      const timer = setTimeout(() => {
        setHudSlideIn(true);
        setTimeout(() => {
          setHudSlideIn(false);
        }, 800);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentScene]);
  
  // Sync classId with activeClassId from store when entering game
  useEffect(() => {
    if (currentScene === SCENES.GAME && activeClassId) {
      setClassId(activeClassId);
      
      if (import.meta.env.DEV) {
        console.log(`[GAME SCENE] Active class: ${activeClassId}`);
      }
    }
  }, [currentScene, activeClassId]);
  
  // Handler for selecting a class during character creation
  const handleSelectClass = useCallback((newClassId) => {
    setSelectedClassId(newClassId);
  }, []);
  
  // Handler for New Game - navigate to character creation with transition
  const handleNewGame = useCallback(() => {
    transitionTo(SCENES.CHARACTER_SELECTION);
  }, [transitionTo]);
  
  // Handler for Continue - go directly to game with transition
  const handleContinue = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('[GAME FLOW] Continuing saved game');
    }
    transitionTo(SCENES.GAME);
  }, [transitionTo]);
  
  // Handler for character creation complete
  const handleCharacterCreated = useCallback((createdClassId, options = {}) => {
    // Mark game as started for future sessions
    markGameStarted();
    
    // Mark game as active for click debounce (prevents button click from triggering movement)
    markGameActive();
    
    // Update class context
    setClassId(createdClassId);
    
    if (import.meta.env.DEV) {
      console.log(`[GAME FLOW] Character created with class: ${createdClassId}`);
      console.log('[GAME FLOW] Using seamless transition (no fade overlay)');
    }
    
    // Navigate to game with SEAMLESS transition (no black fade)
    // The camera and scene content will smoothly transition
    // HUD slide-in is triggered automatically when scene becomes GAME
    transitionTo(SCENES.GAME, {}, { seamless: true });
  }, [transitionTo]);
  
  return (
    <ClassContext.Provider value={{ classId, setClassId }}>
    <TargetProvider>
    <KeyMapProvider>
    <DragDropProvider>
        <GameControls hudSlideIn={hudSlideIn}>
          <SceneManager debug={import.meta.env.DEV}>
            {/* Loading Screen - shown first */}
            <Scene id={SCENES.LOADING}>
              <LoadingScreen 
                onNewGame={handleNewGame}
                onContinue={handleContinue}
              />
            </Scene>
            
            {/* Character Creation UI - overlays the 3D canvas */}
            <Scene id={SCENES.CHARACTER_SELECTION}>
              <CharacterCreationUI 
                selectedClassId={selectedClassId}
                onSelectClass={handleSelectClass}
                onComplete={handleCharacterCreated} 
              />
            </Scene>
            
            {/* Game Scene - HUD UI only, 3D content in unified canvas */}
            <Scene id={SCENES.GAME}>
              <AchievementToast />
              {import.meta.env.DEV && <DebugPanel />}
              {import.meta.env.DEV && <MovementDebugOverlay />}
            </Scene>
          </SceneManager>
          
          {/* Unified Canvas - visible during character selection AND game */}
          {/* Uses one canvas for seamless transitions between scenes */}
          <GameCanvas 
            visible={currentScene === SCENES.CHARACTER_SELECTION || currentScene === SCENES.GAME} 
            selectedClassId={selectedClassId}
            onSelectClass={handleSelectClass}
          />
        </GameControls>
    </DragDropProvider>
    </KeyMapProvider>
    </TargetProvider>
    </ClassContext.Provider>
  );
}
