import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment, KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useRef, Suspense } from "react";

import Hud from "@/components/Hud";
import SkillBar, { Slot } from "@/components/SkillBar";
import Orb from "@/components/Orb";
import CastingBar from "@/components/CastingBar";
import BuffBar from "@/components/BuffBar";
import { Model as Wizard } from "@/components/Wizard";
import MenuBar from "@/components/MenuBar";
import AchievementToast from "@/components/AchievementToast";
import Target, { TargetProvider, useTarget } from "@/components/Target";
import TargetHealthBar from "@/components/TargetHealthBar";
import IceShard from "@/components/IceShard";
import Meteor from "@/components/Meteor";
import LoadingScreen from "@/components/LoadingScreen";

import { KeyMapProvider, useKeyMap } from "@/hooks/useKeyMap";
import { PlayerStateProvider, usePlayerState } from "@/hooks/usePlayerState";
import { InputProvider, KeyboardSync, useActionButton } from "@/hooks/useInput";
import { AchievementProvider, useAchievements } from "@/hooks/useAchievements";
import { SlotMapProvider, useSlotMap, SKILL_SLOTS, MOUSE_SLOTS, CONSUMABLE_SLOTS } from "@/hooks/useSlotMap";
import { DragDropProvider } from "@/hooks/useDragDrop";
import { getActionById, getElementForAction } from "@/config/actions";


const AchievementTracker = () => {
  const { state, activeAction, buffs } = usePlayerState();
  const { unlock } = useAchievements();
  const hasTrackedCast = useRef(false);
  const trackedPotionBuff = useRef(false);

  useEffect(() => {
    if (!hasTrackedCast.current && (state === 'casting' || state === 'attacking') && activeAction) {
      if (['skill_1', 'skill_2', 'skill_3', 'skill_4', 'primary_attack', 'secondary_attack'].includes(activeAction)) {
        unlock('first_cast');
        hasTrackedCast.current = true;
      }
    }
  }, [state, activeAction, unlock]);

  useEffect(() => {
    if (!trackedPotionBuff.current && buffs.some(b => b.id === 'health_potion')) {
      unlock('potion_master');
      trackedPotionBuff.current = true;
    }
  }, [buffs, unlock]);

  return null;
};

const InputToStateSync = () => {
  const { handleInput } = usePlayerState();
  const { getActionForSlot } = useSlotMap();
  
  // Subscribe to slot-based keyboard controls
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

const buildTooltip = (action) => {
  if (!action) return null;
  const element = getElementForAction(action.id);
  return {
    name: action.label,
    type: action.type,
    element,
    description: action.description,
    manaCost: action.manaCost,
    manaGain: action.manaGain,
    manaPerSecond: action.manaPerSecond,
    healthCost: action.healthCost,
    buff: action.buff,
    requiresTarget: action.requiresTarget,
  };
};

const useCanAffordAction = (action) => {
  const { mana, health } = usePlayerState();
  const { target } = useTarget() || {};
  
  if (!action) return false;
  
  const manaCost = action.manaCost ?? 0;
  const healthCost = action.healthCost ?? 0;
  const manaPerSecond = action.manaPerSecond ?? 0;
  
  const requiredMana = manaCost > 0 ? manaCost : manaPerSecond > 0 ? 1 : 0;
  const hasEnoughMana = mana >= requiredMana;
  const hasEnoughHealth = healthCost > 0 ? health > healthCost : true;
  const hasTarget = !action.requiresTarget || target !== null;
  
  return hasEnoughMana && hasEnoughHealth && hasTarget;
};

/**
 * Slot-based skill button - gets action from slotMap
 */
const SlotButton = ({ slotId }) => {
  const { getDisplayKey } = useKeyMap();
  const { getActionObjectForSlot } = useSlotMap();
  
  const action = getActionObjectForSlot(slotId);
  const { active, handlers } = useActionButton(action?.id);
  const canAfford = useCanAffordAction(action);
  
  return (
    <Slot 
      slotId={slotId}
      actionId={action?.id}
      keyBind={getDisplayKey(slotId)} 
      icon={action?.icon}
      active={active}
      disabled={!action || !canAfford}
      tooltip={buildTooltip(action)}
      {...handlers}
    />
  );
};

/**
 * Mouse slot button - display only, no click handlers (uses actual mouse)
 */
const MouseSlotButton = ({ slotId }) => {
  const { getDisplayKey } = useKeyMap();
  const { getActionObjectForSlot } = useSlotMap();
  
  const action = getActionObjectForSlot(slotId);
  const canAfford = useCanAffordAction(action);
  
  return (
    <Slot 
      slotId={slotId}
      actionId={action?.id}
      keyBind={getDisplayKey(slotId)}
      icon={action?.icon}
      disabled={!action || !canAfford}
      tooltip={buildTooltip(action)}
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
 * Player target wrapper that syncs with player state.
 */
const PlayerTarget = ({ children }) => {
  const { health, maxHealth } = usePlayerState();
  return (
    <Target name="Wizard" health={health} maxHealth={maxHealth} level={70} type="friendly">
      {children}
    </Target>
  );
};

/**
 * 3D Scene content.
 */
const Scene = () => {
  const { unlockTarget } = useTarget() || {}
  
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
      
      {/* Floor - click to deselect target */}
      <mesh 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
        onClick={handleMissClick}
      >
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#2d2d3a" roughness={0.9} metalness={0.1} />
      </mesh>

      <PlayerTarget>
        <Wizard position={[0, 0, 0]} />
      </PlayerTarget>

      {/* Test enemy target */}
      <Target name="Training Dummy" health={75} maxHealth={100} level={72} type="enemy">
        <mesh position={[0, 1, 3]}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </Target>
      
      {/* Ice Shard effect - targets the training dummy */}
      <IceShard targetPosition={[0, 0, 3]} />
      
      {/* Meteor effect - targets the training dummy */}
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
  return (
    <TargetProvider>
    <KeyMapProvider>
    <SlotMapProvider>
    <DragDropProvider>
      <AchievementProvider>
      <PlayerStateProvider>
        <GameControls>
          <LoadingScreen />
          <AchievementToast />
          <div style={{ width: "100vw", height: "100vh" }}>
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
      </PlayerStateProvider>
      </AchievementProvider>
    </DragDropProvider>
    </SlotMapProvider>
    </KeyMapProvider>
    </TargetProvider>
  );
}
