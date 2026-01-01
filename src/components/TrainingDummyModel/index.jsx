import * as THREE from 'three';

/**
 * Medieval-style training dummy
 * Wooden post with crossbar arms and straw/cloth target areas
 */

// Reusable materials
const materials = {
  wood: new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.7 }),
  darkWood: new THREE.MeshStandardMaterial({ color: '#4a2f18', roughness: 0.75 }),
  straw: new THREE.MeshStandardMaterial({ color: '#a89860', roughness: 0.9 }),
  cloth: new THREE.MeshStandardMaterial({ color: '#8b7355', roughness: 0.8 }),
  rope: new THREE.MeshStandardMaterial({ color: '#9b8b65', roughness: 0.85 }),
  metal: new THREE.MeshStandardMaterial({ color: '#5a5a60', roughness: 0.4, metalness: 0.5 }),
};

export default function TrainingDummyModel({ position = [0, 0, 0], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Base platform */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.1, 8]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      
      {/* Main post */}
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.15, 2, 8]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      
      {/* Body/torso - straw stuffed sack */}
      <mesh position={[0, 1.3, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.25, 0.8, 10]} />
        <primitive object={materials.straw} attach="material" />
      </mesh>
      
      {/* Cloth wrap around torso */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.3, 10]} />
        <primitive object={materials.cloth} attach="material" />
      </mesh>
      
      {/* Rope bindings */}
      <mesh position={[0, 1.1, 0]}>
        <torusGeometry args={[0.28, 0.025, 6, 16]} />
        <primitive object={materials.rope} attach="material" />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <torusGeometry args={[0.3, 0.025, 6, 16]} />
        <primitive object={materials.rope} attach="material" />
      </mesh>
      
      {/* Crossbar (arms) */}
      <mesh position={[0, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 1.2, 6]} />
        <primitive object={materials.wood} attach="material" />
      </mesh>
      
      {/* Left arm padding */}
      <mesh position={[-0.45, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.25, 8]} />
        <primitive object={materials.straw} attach="material" />
      </mesh>
      
      {/* Right arm padding */}
      <mesh position={[0.45, 1.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.25, 8]} />
        <primitive object={materials.straw} attach="material" />
      </mesh>
      
      {/* Head - stuffed sack */}
      <mesh position={[0, 2, 0]} castShadow>
        <sphereGeometry args={[0.2, 10, 8]} />
        <primitive object={materials.straw} attach="material" />
      </mesh>
      
      {/* Head wrapping */}
      <mesh position={[0, 2.05, 0]} rotation={[0.3, 0, 0]}>
        <torusGeometry args={[0.15, 0.03, 6, 12]} />
        <primitive object={materials.cloth} attach="material" />
      </mesh>
      
      {/* Helmet-like bucket/pot on head */}
      <mesh position={[0, 2.15, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.2, 8]} />
        <primitive object={materials.metal} attach="material" />
      </mesh>
      
      {/* Target circle on torso (painted) */}
      <mesh position={[0, 1.35, 0.26]} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.08, 0.12, 16]} />
        <meshBasicMaterial color="#cc3030" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.35, 0.265]}>
        <circleGeometry args={[0.05, 12]} />
        <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
      </mesh>
      
      {/* Support braces at base */}
      <mesh position={[0.25, 0.25, 0.25]} rotation={[0.5, 0.785, 0]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      <mesh position={[-0.25, 0.25, 0.25]} rotation={[0.5, -0.785, 0]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      <mesh position={[0.25, 0.25, -0.25]} rotation={[-0.5, 0.785, 0]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
      <mesh position={[-0.25, 0.25, -0.25]} rotation={[-0.5, -0.785, 0]} castShadow>
        <boxGeometry args={[0.06, 0.5, 0.06]} />
        <primitive object={materials.darkWood} attach="material" />
      </mesh>
    </group>
  );
}
