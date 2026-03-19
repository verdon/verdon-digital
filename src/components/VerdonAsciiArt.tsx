import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Simple 3D letter geometries - using boxes to create blocky ASCII style
function Letter3D({ letter, position, mousePosition }: { letter: string; position: [number, number, number]; mousePosition: { x: number; y: number } }) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Convert mouse position to rotation values
      const rotationX = (mousePosition.y - 0.5) * Math.PI * 0.4;
      const rotationY = (mousePosition.x - 0.5) * Math.PI * 0.4;
      
      // Apply smooth rotation with some oscillation
      groupRef.current.rotation.x = rotationX + Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      groupRef.current.rotation.y = rotationY + Math.cos(state.clock.elapsedTime * 0.3) * 0.1;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.7 + position[0]) * 0.05;
    }
  });

  // Create block patterns for each letter
  const blocks = useMemo(() => {
    const letterPatterns: { [key: string]: [number, number][] } = {
      'V': [[0,0], [0,1], [0,2], [0,3], [1,4], [2,5], [3,4], [4,0], [4,1], [4,2], [4,3]],
      'E': [[0,0], [0,1], [0,2], [0,3], [0,4], [0,5], [1,0], [1,2], [1,5], [2,0], [2,2], [2,5], [3,0], [3,2], [3,5]],
      'R': [[0,0], [0,1], [0,2], [0,3], [0,4], [0,5], [1,0], [1,2], [1,5], [2,0], [2,2], [2,5], [3,1], [3,3], [3,4], [3,5]],
      'D': [[0,0], [0,1], [0,2], [0,3], [0,4], [0,5], [1,0], [1,5], [2,0], [2,5], [3,1], [3,2], [3,3], [3,4]],
      'O': [[1,0], [2,0], [0,1], [3,1], [0,2], [3,2], [0,3], [3,3], [0,4], [3,4], [1,5], [2,5]],
      'N': [[0,0], [0,1], [0,2], [0,3], [0,4], [0,5], [1,1], [2,2], [3,3], [4,0], [4,1], [4,2], [4,3], [4,4], [4,5]]
    };
    
    return letterPatterns[letter] || [];
  }, [letter]);

  return (
    <group ref={groupRef} position={position}>
      {blocks.map(([x, y], index) => (
        <mesh key={index} position={[
          x * (isDesktop ? 0.8 : 0.4) - (isDesktop ? 1.6 : 0.8), 
          -y * (isDesktop ? 0.8 : 0.4) + (isDesktop ? 2.0 : 1.0), 
          0
        ]}>
          <boxGeometry args={isDesktop ? [0.6, 0.6, 0.6] : [0.3, 0.3, 0.3]} />
          <meshStandardMaterial 
            color="#00ff41"
            emissive="#003311"
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isDesktop, setIsDesktop] = useState(window.innerWidth > 768);
  
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        setMousePosition({
          x: touch.clientX / window.innerWidth,
          y: touch.clientY / window.innerHeight,
        });
      }
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        setMousePosition({
          x: touch.clientX / window.innerWidth,
          y: touch.clientY / window.innerHeight,
        });
      }
    };
    
    const handleResize = () => {
      setIsDesktop(window.innerWidth > 768);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const letters = ['V', 'E', 'R', 'D', 'O', 'N'];
  
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} color="#00ff41" />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0066ff" />
      
      <group position={[0, 0, 0]}>
        {letters.map((letter, index) => (
          <Letter3D
            key={letter}
            letter={letter}
            position={[(index - 2.5) * (isDesktop ? 6 : 3), 0, 0]}
            mousePosition={mousePosition}
          />
        ))}
      </group>
      
      {/* Particle background */}
      <Stars />
    </>
  );
}

function Stars() {
  const points = useRef<THREE.Points>(null);
  
  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(2000 * 3);
    for (let i = 0; i < 2000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return positions;
  }, []);
  
  useFrame((state) => {
    if (points.current) {
      points.current.rotation.x = state.clock.elapsedTime * 0.02;
      points.current.rotation.y = state.clock.elapsedTime * 0.01;
    }
  });
  
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesPosition.length / 3}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#00aa33"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

export default function VerdonAsciiArt() {
  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas
        camera={{ position: [0, 0, 25], fov: 75 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene />
      </Canvas>
      
      {/* Links */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        color: '#00ff41',
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        textShadow: '0 0 10px #00ff41',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <div>
          <span>managing director @ </span>
          <a 
            href="https://yuze.uk"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#00ff41',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            yuze
          </a>
        </div>
        <div>
          <span>github @ </span>
          <a 
            href="https://github.com/verdon"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#00ff41',
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            verdon
          </a>
        </div>
      </div>

    </div>
  );
}