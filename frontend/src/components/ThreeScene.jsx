import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Icosahedron, MeshDistortMaterial, OrbitControls, Stars } from "@react-three/drei";
import { useRef } from "react";

function Orb() {
  const meshRef = useRef();

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.x += delta * 0.15;
    meshRef.current.rotation.y += delta * 0.2;
  });

  return (
    <Float speed={1.6} rotationIntensity={1.5} floatIntensity={2}>
      <Icosahedron ref={meshRef} args={[1.9, 20]} position={[0, 0.1, 0]}>
        <MeshDistortMaterial
          color="#7c5cff"
          emissive="#7c5cff"
          emissiveIntensity={0.45}
          roughness={0.15}
          metalness={0.5}
          distort={0.45}
          speed={2}
        />
      </Icosahedron>
    </Float>
  );
}

export default function ThreeScene() {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
      <ambientLight intensity={0.25} />
      <pointLight position={[2, 3, 4]} intensity={2.1} color="#7c5cff" />
      <pointLight position={[-2, -2, 2]} intensity={1.8} color="#ff5f8a" />
      <Orb />
      <Stars radius={90} depth={40} count={1500} factor={4} saturation={0} fade speed={1} />
      <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.35} />
    </Canvas>
  );
}
