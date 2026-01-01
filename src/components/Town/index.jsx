import { useRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Simple town environment inspired by Diablo 2's Rogue Encampment
 * Composed of basic primitives for now
 */

// Reusable materials
const materials = {
  ground: new THREE.MeshStandardMaterial({ color: '#3a2f20', roughness: 0.9 }),
  dirt: new THREE.MeshStandardMaterial({ color: '#4a3f30', roughness: 0.85 }),
  stone: new THREE.MeshStandardMaterial({ color: '#5a5550', roughness: 0.8 }),
  wood: new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.7 }),
  darkWood: new THREE.MeshStandardMaterial({ color: '#4a2f18', roughness: 0.75 }),
  canvas: new THREE.MeshStandardMaterial({ color: '#8b7355', roughness: 0.6, side: THREE.DoubleSide }),
  straw: new THREE.MeshStandardMaterial({ color: '#9b8b55', roughness: 0.9 }),
  fire: new THREE.MeshBasicMaterial({ color: '#ff6030' }),
  fireGlow: new THREE.MeshBasicMaterial({ color: '#ffaa40' }),
  metal: new THREE.MeshStandardMaterial({ color: '#4a4a50', roughness: 0.4, metalness: 0.6 }),
  water: new THREE.MeshStandardMaterial({ color: '#3a5a6a', roughness: 0.2, transparent: true, opacity: 0.7 }),
};

// Simple tent structure
function Tent({ position = [0, 0, 0], rotation = 0, scale = 1, color = '#8b7355' }) {
  const canvasMat = useMemo(() => 
    new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide }), 
    [color]
  );
  
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* Tent poles */}
      <mesh position={[-1.2, 1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 2, 6]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      <mesh position={[1.2, 1, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 2, 6]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      <mesh position={[0, 1.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.6, 6]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      
      {/* Canvas covering - A-frame style sloping from ridge to ground */}
      <mesh position={[0, 0.9, 0.55]} rotation={[1.05, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.05, 2.2]} />
        <primitive object={canvasMat} attach="material" />
      </mesh>
      <mesh position={[0, 0.9, -0.55]} rotation={[-1.05, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.05, 2.2]} />
        <primitive object={canvasMat} attach="material" />
      </mesh>
    </group>
  );
}

// Wooden crate
function Crate({ position = [0, 0, 0], rotation = 0, scale = 1 }) {
  return (
    <mesh position={position} rotation={[0, rotation, 0]} scale={scale} castShadow receiveShadow>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <primitive object={materials.wood} attach="material" />
    </mesh>
  );
}

// Barrel
function Barrel({ position = [0, 0, 0], scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.8, 12]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      {/* Metal bands */}
      <mesh position={[0, 0.2, 0]}>
        <torusGeometry args={[0.32, 0.02, 8, 16]} />
        <primitive object={materials.metal} attach="material" />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <torusGeometry args={[0.32, 0.02, 8, 16]} />
        <primitive object={materials.metal} attach="material" />
      </mesh>
    </group>
  );
}

// Simple campfire
function Campfire({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Stone ring */}
      {[...Array(8)].map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <mesh 
            key={i} 
            position={[Math.cos(angle) * 0.5, 0.1, Math.sin(angle) * 0.5]}
            rotation={[0, angle, 0]}
            castShadow
          >
            <boxGeometry args={[0.25, 0.2, 0.15]} />
            <primitive object={materials.stone} attach="material" />
          </mesh>
        );
      })}
      
      {/* Logs */}
      <mesh position={[0, 0.15, 0]} rotation={[0, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 6]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 3, -0.2]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.6, 6]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      
      {/* Fire glow */}
      <mesh position={[0, 0.3, 0]}>
        <coneGeometry args={[0.2, 0.5, 8]} />
        <primitive object={materials.fire} attach="material" />
      </mesh>
      <mesh position={[0, 0.25, 0]}>
        <coneGeometry args={[0.15, 0.3, 6]} />
        <primitive object={materials.fireGlow} attach="material" />
      </mesh>
      
      {/* Point light */}
      <pointLight color="#ff6030" intensity={3} distance={8} decay={2} position={[0, 0.5, 0]} />
    </group>
  );
}

// Fence segment
function Fence({ position = [0, 0, 0], rotation = 0, length = 3 }) {
  const posts = Math.ceil(length / 1.5);
  
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Horizontal beams */}
      <mesh position={[length / 2 - 0.75, 0.3, 0]} castShadow>
        <boxGeometry args={[length, 0.08, 0.06]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      <mesh position={[length / 2 - 0.75, 0.7, 0]} castShadow>
        <boxGeometry args={[length, 0.08, 0.06]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      
      {/* Vertical posts */}
      {[...Array(posts)].map((_, i) => (
        <mesh key={i} position={[i * 1.5, 0.5, 0]} castShadow>
          <boxGeometry args={[0.1, 1, 0.1]} />
          <primitive object={materials.darkWood} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// Simple tree (dead/bare for that dark atmosphere)
function DeadTree({ position = [0, 0, 0], scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.3, 3, 8]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      {/* Branches */}
      <mesh position={[0.3, 2.5, 0]} rotation={[0, 0, 0.5]} castShadow>
        <cylinderGeometry args={[0.03, 0.08, 1.2, 6]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      <mesh position={[-0.2, 2.2, 0.2]} rotation={[0.3, 0, -0.6]} castShadow>
        <cylinderGeometry args={[0.02, 0.06, 0.9, 6]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      <mesh position={[0, 2.8, -0.2]} rotation={[-0.4, 0, 0.2]} castShadow>
        <cylinderGeometry args={[0.02, 0.05, 0.7, 6]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
    </group>
  );
}

// Well structure
function Well({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Stone base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.8, 0.9, 0.8, 12]} />
        <primitive object={materials.stone} attach="material" />
      </mesh>
      {/* Water inside */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 12]} />
        <primitive object={materials.water} attach="material" />
      </mesh>
      {/* Roof supports */}
      <mesh position={[-0.6, 1.2, 0]} castShadow>
        <boxGeometry args={[0.1, 1.6, 0.1]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      <mesh position={[0.6, 1.2, 0]} castShadow>
        <boxGeometry args={[0.1, 1.6, 0.1]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      {/* Roof beam */}
      <mesh position={[0, 2, 0]} castShadow>
        <boxGeometry args={[1.4, 0.1, 0.1]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.3, 0]} rotation={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.9, 0.5, 4]} />
        <primitive object={materials.straw} attach="material" />
      </mesh>
    </group>
  );
}

// Cart/wagon
function Cart({ position = [0, 0, 0], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Cart bed */}
      <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.15, 1]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      {/* Sides */}
      <mesh position={[0, 0.75, 0.45]} castShadow>
        <boxGeometry args={[2, 0.4, 0.08]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      <mesh position={[0, 0.75, -0.45]} castShadow>
        <boxGeometry args={[2, 0.4, 0.08]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      <mesh position={[-0.95, 0.75, 0]} castShadow>
        <boxGeometry args={[0.08, 0.4, 0.9]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      {/* Wheels */}
      {[[-0.7, 0.3, 0.55], [-0.7, 0.3, -0.55], [0.7, 0.3, 0.55], [0.7, 0.3, -0.55]].map((pos, i) => (
        <mesh key={i} position={pos} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.3, 0.1, 12]} />
          <primitive object={materials.darkWood} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// Main Town component
export default function Town() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <primitive object={materials.ground} attach="material" />
      </mesh>
      
      {/* Dirt path through center */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[4, 30]} />
        <primitive object={materials.dirt} attach="material" />
      </mesh>
      
      {/* === TENTS === */}
      <Tent position={[-6, 0, -3]} rotation={0.3} color="#7b6345" />
      <Tent position={[-5, 0, 4]} rotation={-0.2} scale={1.2} color="#8b7355" />
      <Tent position={[6, 0, -2]} rotation={Math.PI - 0.2} color="#6b5335" />
      <Tent position={[7, 0, 5]} rotation={Math.PI + 0.3} scale={0.9} color="#9b8365" />
      
      {/* === CAMPFIRES === */}
      <Campfire position={[-4, 0, 1]} />
      
      {/* === WELL === */}
      <Well position={[3, 0, -5]} />
      
      {/* === CART === */}
      <Cart position={[-8, 0, 0]} rotation={0.4} />
      
      {/* === CRATES & BARRELS === */}
      <Crate position={[-7, 0.3, -1]} rotation={0.2} />
      <Crate position={[-7.5, 0.3, -0.5]} rotation={-0.3} />
      <Crate position={[-7.2, 0.9, -0.7]} rotation={0.5} scale={0.8} />
      <Barrel position={[-6.5, 0, 0.5]} />
      <Barrel position={[-7.8, 0, 0.8]} />
      
      <Crate position={[5, 0.3, 3]} rotation={0.1} />
      <Barrel position={[5.5, 0, 2.5]} />
      <Barrel position={[4.5, 0, 3.5]} scale={0.9} />
      
      {/* === FENCING === */}
      <Fence position={[-10, 0, -8]} rotation={0} length={6} />
      <Fence position={[-10, 0, 8]} rotation={0} length={6} />
      <Fence position={[8, 0, -8]} rotation={0} length={4} />
      <Fence position={[8, 0, 7]} rotation={0} length={4} />
      <Fence position={[-10, 0, -8]} rotation={Math.PI / 2} length={4} />
      <Fence position={[12, 0, -8]} rotation={Math.PI / 2} length={4} />
      
      {/* === DEAD TREES === */}
      <DeadTree position={[-12, 0, -5]} scale={1.2} />
      <DeadTree position={[14, 0, 2]} scale={1} />
      <DeadTree position={[-11, 0, 10]} scale={0.9} />
      <DeadTree position={[13, 0, -6]} scale={1.1} />
      <DeadTree position={[-14, 0, 0]} scale={1.3} />
      
      {/* Ambient fill light for the town */}
      <ambientLight intensity={0.15} />
      
      {/* Main directional light (moon/dusk) */}
      <directionalLight
        position={[10, 15, 5]}
        intensity={0.4}
        color="#8090b0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={1}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
    </group>
  );
}
