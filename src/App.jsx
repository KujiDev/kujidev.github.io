import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment, KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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
import CharacterCreationScreen from "@/components/CharacterCreationScreen";
import Town from "@/components/Town";
import TrainingDummyModel from "@/components/TrainingDummyModel";
import PixieOrbit from "@/components/PixieOrbit";
import DebugPanel from "@/components/DebugPanel";
// Projectiles - owned by the scene, triggered by player actions
import IceShard from "@/components/IceShard";
import Meteor from "@/components/Meteor";

import { KeyMapProvider, useKeyMap } from "@/hooks/useKeyMap";
import { usePlayerState, useSlotMap, useAchievements, useActiveClass } from "@/hooks/useGame";
import { InputProvider, KeyboardSync, useInput } from "@/hooks/useInput";
import { useSlotButton, useMouseSlotButton } from "@/hooks/useSlotButton";
import { SKILL_SLOTS, MOUSE_SLOTS, CONSUMABLE_SLOTS, PIXIE_SLOTS } from "@/config/slots";
import { DragDropProvider } from "@/hooks/useDragDrop";
import { getSkills, getConsumables } from "@/config/actions";

// =============================================================================
// GAME FLOW STATES
// =============================================================================

const GAME_FLOW = {
  LOADING: 'loading',
  CHARACTER_CREATION: 'characterCreation',
  GAME: 'game',
};

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
  
  // Build set of skill action IDs from data
  const skillActionIds = useMemo(() => new Set(getSkills().map(s => s.id)), []);

  useEffect(() => {
    if (!hasTrackedCast.current && (state === 'casting' || state === 'attacking') && activeAction) {
      if (skillActionIds.has(activeAction)) {
        unlock('first_cast');
        hasTrackedCast.current = true;
      }
    }
  }, [state, activeAction, unlock, skillActionIds]);

  useEffect(() => {
    if (!trackedPotionBuff.current && buffs.some(b => b.id === 'health_potion')) {
      unlock('potion_master');
      trackedPotionBuff.current = true;
    }
  }, [buffs, unlock]);

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

const GameUI = () => (
  <>
    <TargetHealthBar />
    <Hud>
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
const GameControls = ({ children }) => {
  const { keyMap } = useKeyMap();

  return (
    <KeyboardControls map={keyMap}>
      <InputProvider>
        {children}
        <KeyboardSync />
        <InputToStateSync />
        <AchievementTracker />
        <GameUI />
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
 * 3D Scene content.
 */
const Scene = () => {
  const { unlockTarget } = useTarget() || {}
  const { classId } = useCurrentClass();
  
  const handleMissClick = (e) => {
    // Only unlock if clicking on non-target (floor, background)
    unlockTarget?.()
  }
  
  return (
    <>
      <color attach="background" args={['#1a1a2e']} />
      <fog attach="fog" args={['#1a1a2e', 15, 40]} />
      <Environment preset="night" background={false} />
      
      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[5, 10, 5]} intensity={0.5} color="#8b7355" />
      <pointLight position={[0, 2, 0]} intensity={1} color="#ff6b35" distance={10} />
      
      {/* Town environment */}
      <Town />

      {/* Player - class-agnostic, configured by classId from context */}
      <PlayerTarget>
        <Player classId={classId} position={[0, 0, 0]}>
          <PixieOrbit />
        </Player>
      </PlayerTarget>

      {/* Test enemy target */}
      <TrainingDummy>
        <TrainingDummyModel position={[0, 0, 3]} />
      </TrainingDummy>
      
      {/* Projectile effects - triggered by player actions, target the dummy */}
      <IceShard targetPosition={[0, 0, 3]} />
      <Meteor targetPosition={[0, 0, 3]} />
    
      <CameraControls
        makeDefault
        minDistance={18}
        maxDistance={18}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 3}
        minAzimuthAngle={Math.PI / 4}
        maxAzimuthAngle={Math.PI / 4}
        dollySpeed={0}
        truckSpeed={0}
      />

      <EffectComposer>
        <Bloom 
          intensity={1.5}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

export default function App() {
  const [gameFlow, setGameFlow] = useState(GAME_FLOW.LOADING);
  const [classId, setClassId] = useState('wizard');
  const { activeClassId } = useActiveClass();
  
  // Sync classId with activeClassId from store when entering game
  useEffect(() => {
    if (gameFlow === GAME_FLOW.GAME && activeClassId) {
      setClassId(activeClassId);
      
      if (import.meta.env.DEV) {
        console.log(`[GAME SCENE] Active class: ${activeClassId}`);
      }
    }
  }, [gameFlow, activeClassId]);
  
  // Handler for New Game - navigate to character creation
  const handleNewGame = useCallback(() => {
    setGameFlow(GAME_FLOW.CHARACTER_CREATION);
  }, []);
  
  // Handler for Continue - go directly to game
  const handleContinue = useCallback(() => {
    if (import.meta.env.DEV) {
      console.log('[GAME FLOW] Continuing saved game');
    }
    setGameFlow(GAME_FLOW.GAME);
  }, []);
  
  // Handler for character creation complete
  const handleCharacterCreated = useCallback((selectedClassId) => {
    // Mark game as started for future sessions
    markGameStarted();
    
    // Update class context
    setClassId(selectedClassId);
    
    if (import.meta.env.DEV) {
      console.log(`[GAME FLOW] Character created with class: ${selectedClassId}`);
    }
    
    // Navigate to game
    setGameFlow(GAME_FLOW.GAME);
  }, []);
  
  return (
    <ClassContext.Provider value={{ classId, setClassId }}>
    <TargetProvider>
    <KeyMapProvider>
    <DragDropProvider>
        <GameControls>
          {/* Loading Screen - shown first */}
          {gameFlow === GAME_FLOW.LOADING && (
            <LoadingScreen 
              onNewGame={handleNewGame}
              onContinue={handleContinue}
            />
          )}
          
          {/* Character Creation - shown after New Game */}
          {gameFlow === GAME_FLOW.CHARACTER_CREATION && (
            <CharacterCreationScreen onComplete={handleCharacterCreated} />
          )}
          
          {/* Game UI - only shown during gameplay */}
          {gameFlow === GAME_FLOW.GAME && (
            <>
              <AchievementToast />
              {import.meta.env.DEV && <DebugPanel />}
            </>
          )}
          
          {/* Canvas is always rendered (for asset loading), but only visible in game */}
          <div style={{ 
            width: "100vw", 
            height: "100vh",
            visibility: gameFlow === GAME_FLOW.GAME ? 'visible' : 'hidden',
          }}>
            <Canvas 
              flat 
              camera={{ fov: 50, position: [11.02, 10, 11.02] }} 
              eventSource={document.getElementById('root')} 
              eventPrefix="client"
            >
              <Suspense fallback={null}>
                <Scene />
              </Suspense>
            </Canvas>
          </div>
        </GameControls>
    </DragDropProvider>
    </KeyMapProvider>
    </TargetProvider>
    </ClassContext.Provider>
  );
}
