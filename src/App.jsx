import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment, KeyboardControls, useKeyboardControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useEffect, useState } from "react";

import Hud from "@/components/Hud";
import SkillBar, { Slot } from "@/components/SkillBar";
import Orb from "@/components/Orb";
import { Model as Wizard } from "@/components/Wizard";
import Settings from "@/components/Settings";

import { KeyMapProvider, useKeyMap } from "@/hooks/useKeyMap";
import { PlayerStateProvider, usePlayerState } from "@/hooks/usePlayerState";

// Connects keyboard inputs to player state
const PlayerInputHandler = () => {
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
}

const Controls = ({ children }) => {
  const { keyMap, rebind } = useKeyMap();

  return (
    <KeyboardControls map={keyMap}>
      {children}
      <Settings keyMap={keyMap} rebind={rebind} />
      <UI keyMap={keyMap} />
      <PlayerInputHandler />
    </KeyboardControls>
  )
}

const Button = ({ keyMap, id = 'skill_1' }) => {
  const { handleInput } = usePlayerState();
  const [pressed, setPressed] = useState(false);
  const keys = keyMap.find(k => k.name === id)?.keys || [];

  const skill = useKeyboardControls((state) => state[id]);

  const handlePress = () => {
    if (!pressed) {
      setPressed(true);
      handleInput(id, true);
    }
  };
  
  const handleRelease = () => {
    if (pressed) {
      setPressed(false);
      handleInput(id, false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePress();
    }
  };

  const handleKeyUp = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRelease();
    }
  };

  return (
    <Slot 
      keyBind={keys.join(', ')} 
      active={skill || pressed} 
      onMouseDown={handlePress}
      onMouseUp={handleRelease}
      onMouseLeave={handleRelease}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    />
  )

}

const UI = ({ keyMap }) => {
  return (
    <Hud>
      <Orb type="health" label="Health" />
      <SkillBar>
        <Button keyMap={keyMap} id="skill_1" />
        <Button keyMap={keyMap} id="skill_2" />
        <Button keyMap={keyMap} id="skill_3" />
        <Button keyMap={keyMap} id="skill_4" />
        <Slot keyBind="LMB" />
        <Slot keyBind="RMB" />
      </SkillBar>
      <Orb type="mana" label="Mana" />
    </Hud>
  )
}

const Floor = () => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
    <circleGeometry args={[30, 64]} />
    <meshStandardMaterial 
      color="#2d2d3a"
      roughness={0.9}
      metalness={0.1}
    />
  </mesh>
)



export default function App() {
  return (
    <KeyMapProvider>
      <PlayerStateProvider>
        <Controls>
          <div style={{ width: "100vw", height: "100vh" }}>
            <Canvas flat camera={{ fov: 50, position: [11.02, 9, 11.02] }} eventSource={document.getElementById('root')} eventPrefix="client">

              <color attach="background" args={['#1a1a2e']} />
              <fog attach="fog" args={['#1a1a2e', 15, 40]} />
              <Environment preset="night" />
              
              {/* Ambient dark lighting */}
              <ambientLight intensity={0.2} />
              <directionalLight position={[5, 10, 5]} intensity={0.5} color="#8b7355" />
              <pointLight position={[0, 2, 0]} intensity={1} color="#ff6b35" distance={10} />
              
              <Floor />

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

            </Canvas>
          </div>
        </Controls>
      </PlayerStateProvider>
    </KeyMapProvider>
  );
}
