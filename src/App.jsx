import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment, KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect } from "react";

import Hud from "@/components/Hud";
import SkillBar, { Slot } from "@/components/SkillBar";
import Orb from "@/components/Orb";
import CastingBar from "@/components/CastingBar";
import BuffBar from "@/components/BuffBar";
import { Model as Wizard } from "@/components/Wizard";
import Settings from "@/components/Settings";
import Target, { TargetProvider, useTarget } from "@/components/Target";
import TargetHealthBar from "@/components/TargetHealthBar";

import { KeyMapProvider, useKeyMap } from "@/hooks/useKeyMap";
import { PlayerStateProvider, usePlayerState } from "@/hooks/usePlayerState";
import { InputProvider, KeyboardSync, useActionButton } from "@/hooks/useInput";
import { SKILL_BAR_ACTIONS, getActionById, getElementForAction } from "@/config/actions";

/**
 * Syncs keyboard input to player state FSM.
 * Bridges the gap between raw input and game state.
 */
const InputToStateSync = () => {
  const { handleInput } = usePlayerState();
  
  const skill1 = useKeyboardControls((state) => state.skill_1);
  const skill2 = useKeyboardControls((state) => state.skill_2);
  const skill3 = useKeyboardControls((state) => state.skill_3);
  const skill4 = useKeyboardControls((state) => state.skill_4);

  useEffect(() => { handleInput('skill_1', skill1); }, [skill1, handleInput]);
  useEffect(() => { handleInput('skill_2', skill2); }, [skill2, handleInput]);
  useEffect(() => { handleInput('skill_3', skill3); }, [skill3, handleInput]);
  useEffect(() => { handleInput('skill_4', skill4); }, [skill4, handleInput]);

  return null;
};

/**
 * Skill button that uses the unified input system.
 */
const SkillButton = ({ actionId }) => {
  const { getDisplayKey } = useKeyMap();
  const { active, handlers } = useActionButton(actionId);
  const { mana, health } = usePlayerState();
  const action = getActionById(actionId);
  
  // Check if we have enough resources
  const manaCost = action?.manaCost ?? 0;
  const healthCost = action?.healthCost ?? 0;
  const manaPerSecond = action?.manaPerSecond ?? 0;
  
  // For mana: need upfront cost OR at least 1 for channeled
  const requiredMana = manaCost > 0 ? manaCost : manaPerSecond > 0 ? 1 : 0;
  // For health: need more than the cost (can't kill yourself)
  const hasEnoughMana = mana >= requiredMana;
  const hasEnoughHealth = healthCost > 0 ? health > healthCost : true;
  
  const disabled = !hasEnoughMana || !hasEnoughHealth;
  
  // Build tooltip data
  const element = action ? getElementForAction(action.id) : null;
  const tooltip = action ? {
    name: action.label,
    type: action.type,
    element: element,
    description: action.description,
    manaCost: action.manaCost,
    manaPerSecond: action.manaPerSecond,
    healthCost: action.healthCost,
    buff: action.buff,
  } : null;
  
  return (
    <Slot 
      keyBind={getDisplayKey(actionId)} 
      icon={action?.icon}
      active={active}
      disabled={disabled}
      tooltip={tooltip}
      {...handlers}
    />
  );
};

/**
 * Mouse button skill - shows tooltip and target requirement.
 */
const MouseButton = ({ actionId, keyBind }) => {
  const { mana } = usePlayerState();
  const { target } = useTarget() || {};
  const action = getActionById(actionId);
  
  const manaCost = action?.manaCost ?? 0;
  const hasEnoughMana = mana >= manaCost;
  const hasTarget = target !== null;
  
  // Disabled if no mana OR no target (for target-required skills)
  const disabled = !hasEnoughMana || (action?.requiresTarget && !hasTarget);
  
  // Build tooltip data
  const element = action ? getElementForAction(action.id) : null;
  const tooltip = action ? {
    name: action.label,
    type: action.type,
    element: element,
    description: action.description,
    manaCost: action.manaCost,
    requiresTarget: action.requiresTarget,
  } : null;
  
  return (
    <Slot 
      keyBind={keyBind}
      icon={action?.icon}
      disabled={disabled}
      tooltip={tooltip}
    />
  );
};

/**
 * Game UI overlay - skill bar and orbs.
 */
const GameUI = () => {
  return (
    <>
      <TargetHealthBar />
      <Hud>
      <Orb type="health" label="Health" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative' }}>
        <BuffBar />
        <CastingBar />
        <Settings />
        <SkillBar>
          {SKILL_BAR_ACTIONS.map(action => (
            <SkillButton key={action.id} actionId={action.id} />
          ))}
          <MouseButton actionId="primary_attack" keyBind="LMB" />
          <MouseButton actionId="secondary_attack" keyBind="RMB" />
        </SkillBar>
      </div>
      <Orb type="mana" label="Mana" />
    </Hud>
    </>
  );
};

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
        position={[0, -1, 0]} 
        receiveShadow
        onClick={handleMissClick}
      >
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#2d2d3a" roughness={0.9} metalness={0.1} />
      </mesh>

      <PlayerTarget>
        <Wizard position={[0, -1, 0]} />
      </PlayerTarget>

      {/* Test enemy target */}
      <Target name="Training Dummy" health={75} maxHealth={100} level={72} type="enemy">
        <mesh position={[0, 0, 3]}>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#8b4513" />
        </mesh>
      </Target>
    
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
      <PlayerStateProvider>
        <GameControls>
          <div style={{ width: "100vw", height: "100vh" }}>
            <Canvas 
              flat 
              camera={{ fov: 50, position: [11.02, 9, 11.02] }} 
              eventSource={document.getElementById('root')} 
              eventPrefix="client"
            >
              <Scene />
            </Canvas>
          </div>
        </GameControls>
      </PlayerStateProvider>
    </KeyMapProvider>
    </TargetProvider>
  );
}
