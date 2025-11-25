import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, Environment, MeshPortalMaterial, PerspectiveCamera, Text, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState } from "react";

function Frame({ id, name, author, bg, width = 1, height = 1.61803398875, children, ...props }) {
  const portal = useRef()
  const [enter, setEnter] = useState(0)
  const [hovered, hover] = useState(false)
  useCursor(hovered)
  return (
    <group {...props}>
      <Text fontSize={0.3} anchorY="top" anchorX="left" lineHeight={0.8} position={[-0.375, 0.715, 0.01]} material-toneMapped={false}>
        {name}
      </Text>
      <Text fontSize={0.1} anchorX="right" position={[0.4, -0.659, 0.01]} material-toneMapped={false}>
        /{id}
      </Text>
      <Text fontSize={0.04} anchorX="right" position={[0.0, -0.677, 0.01]} material-toneMapped={false}>
        {author}
      </Text>
      <mesh position={[0, 0, -0.0001]}>
        <planeGeometry args={[width + 0.1, height + 0.1]} />
        <meshBasicMaterial color={"#000"}/>
      </mesh>
      <mesh name={id} onDoubleClick={(e) => (
        e.stopPropagation(),
        setEnter(prev => prev ? 0 : 1)
      )} onPointerOver={(e) => hover(true)} onPointerOut={() => hover(false)}>
        <planeGeometry args={[width, height]} />
        <MeshPortalMaterial ref={portal}
          // events={params?.id === id} 
          blend={enter}
          side={THREE.DoubleSide}>
          <color attach="background" args={[bg]} />
          {children}
        </MeshPortalMaterial>
      </mesh>
    </group>
  )
}

export default function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas flat camera={{ fov: 75, position: [0, 0, 2] }} eventSource={document.getElementById('root')} eventPrefix="client">
        <CameraControls />

        <Frame id="01" name={"Kuji\nDev"} author="The Cube" bg={"teal"} >
          <Environment preset="sunset"/>
          <mesh>
            <boxGeometry />
            <meshStandardMaterial color="hotpink" />
          </mesh>
          <PerspectiveCamera makeDefault position={[10, 10, 10]}/>
          <CameraControls />
        </Frame>

      </Canvas>
    </div>
  );
}
