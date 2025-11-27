import { Canvas } from "@react-three/fiber";
import { CameraControls, Environment } from "@react-three/drei";
import Frame from "@/components/Frame";

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
