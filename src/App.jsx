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

import { KeyMapProvider, useKeyMap } from "@/hooks/useKeyMap";
import { PlayerStateProvider, usePlayerState } from "@/hooks/usePlayerState";
import { InputProvider, KeyboardSync, useActionButton } from "@/hooks/useInput";
import { SKILL_BAR_ACTIONS, getActionById } from "@/config/actions";

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
  
  return (
    <Slot 
      keyBind={getDisplayKey(actionId)} 
      icon={action?.icon}
      active={active}
      disabled={disabled}
      {...handlers}
    />
  );
};

/**
 * Game UI overlay - skill bar and orbs.
 */
const GameUI = () => {
  return (
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
          <Slot keyBind="LMB" />
          <Slot keyBind="RMB" />
        </SkillBar>
      </div>
      <Orb type="mana" label="Mana" />
    </Hud>
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
 * 3D Scene content.
 */
const Scene = () => (
  <>
    <color attach="background" args={['#1a1a2e']} />
    <fog attach="fog" args={['#1a1a2e', 15, 40]} />
    <Environment preset="night" />
    
    {/* Lighting */}
    <ambientLight intensity={0.2} />
    <directionalLight position={[5, 10, 5]} intensity={0.5} color="#8b7355" />
    <pointLight position={[0, 2, 0]} intensity={1} color="#ff6b35" distance={10} />
    
    {/* Floor */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
      <circleGeometry args={[30, 64]} />
      <meshStandardMaterial color="#2d2d3a" roughness={0.9} metalness={0.1} />
    </mesh>

    <Wizard position={[0, -1, 0]} />
    
    <CameraControls
      makeDefault
      minDistance={18}
      maxDistance={18}
      minPolarAngle={Math.PI / 3}
      maxPolarAngle={Math.PI / 3}
      minAzimuthAngle={Math.PI / 4}
      maxAzimuthAngle={Math.PI / 4}
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
);

export default function App() {
  return (
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
  );
}
