import { useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { MeshPortalMaterial, Text, useCursor } from "@react-three/drei";

export default function Frame({ id, name, author, bg, border, width = 1, height = 1.61803398875, children, ...props }) {
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