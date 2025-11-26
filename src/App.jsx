import { Canvas, useFrame } from "@react-three/fiber";
import { CameraControls, Environment, MeshPortalMaterial, PerspectiveCamera, Text, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { useRef, useState } from "react";

function Frame({ id, name, author, bg, border, width = 1, height = 1.61803398875, children, ...props }) {
  const portal = useRef()
  const [enter, setEnter] = useState(false)
  const [hovered, hover] = useState(false)
  useCursor(hovered)
  useFrame((_, dt) => {
    if (!portal.current) return;

    const duration = .3;
    const current = portal.current.blend;
    const delta = +enter - current;

    if (Math.abs(delta) > 0.0001) {
      const step = (dt / duration) * Math.sign(delta);
      const next = current + step;

      portal.current.blend =
        delta > 0 ? Math.min(next, +enter) : Math.max(next, +enter);
    } else {
      portal.current.blend = +enter;
    }
  })
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
        <meshBasicMaterial color={border} />
      </mesh>
      <mesh name={id} onDoubleClick={(e) => (
        e.stopPropagation(),
        setEnter(prev => !prev)
      )} onPointerOver={(e) => hover(true)} onPointerOut={() => hover(false)}>
        <planeGeometry args={[width, height]} />
        <MeshPortalMaterial ref={portal}
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

        <CameraControls makeDefault maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 6} maxAzimuthAngle={Math.PI / 4} minAzimuthAngle={-Math.PI / 4} />

        <Frame id="01" name={"kuji\ndev"} author="The Cube" bg={"teal"} border={"black"}>
          <Environment preset="sunset" />
          <mesh rotation={[
            0.6154797087,  // 35.264°
            0.7853981634,  // 45°
            0
          ]}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial color="hotpink" />
          </mesh>
        </Frame>

      </Canvas>
    </div>
  );
}
