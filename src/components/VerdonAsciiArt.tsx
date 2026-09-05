import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Intro "zoom into space" flight: the camera starts far out and decelerates
// into the resting position that frames the letters.
const INTRO_START_Z = 420;
const INTRO_END_Z = 25;
const INTRO_DURATION = 4.5; // seconds
const INTRO_START_FOV = 95;
const INTRO_END_FOV = 75;
const WARP_STAR_COUNT = 1800;

function introProgress(elapsed: number) {
  const p = Math.min(elapsed / INTRO_DURATION, 1);
  const q = p * p * (3 - 2 * p); // smoothstep: gentle acceleration
  return 1 - Math.pow(1 - q, 2); // then a long deceleration into the letters
}

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Flies the camera in from deep space and draws star streaks that stretch with
// the camera's speed, then fades them out as the flight settles.
function WarpIntro({ onComplete }: { onComplete: () => void }) {
  const { camera } = useThree();
  const linesRef = useRef<THREE.LineSegments>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const startTime = useRef<number | null>(null);
  const previousZ = useRef(INTRO_START_Z);
  const [done, setDone] = useState(false);

  const { basePositions, positions } = useMemo(() => {
    const base = new Float32Array(WARP_STAR_COUNT * 3);
    for (let i = 0; i < WARP_STAR_COUNT; i++) {
      // Stars fill a wide tube along the flight path so they whip past the camera.
      const angle = Math.random() * Math.PI * 2;
      const radius = 4 + Math.sqrt(Math.random()) * 90;
      base[i * 3] = Math.cos(angle) * radius;
      base[i * 3 + 1] = Math.sin(angle) * radius;
      base[i * 3 + 2] = INTRO_END_Z - 120 + Math.random() * (INTRO_START_Z - INTRO_END_Z + 160);
    }
    return { basePositions: base, positions: new Float32Array(WARP_STAR_COUNT * 6) };
  }, []);

  const finish = () => {
    camera.position.set(0, 0, INTRO_END_Z);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = INTRO_END_FOV;
      camera.updateProjectionMatrix();
    }
    setDone(true);
    onComplete();
  };

  useFrame((state) => {
    if (done) return;

    if (startTime.current === null) {
      if (prefersReducedMotion()) {
        finish();
        return;
      }
      startTime.current = state.clock.elapsedTime;
    }

    const progress = introProgress(state.clock.elapsedTime - startTime.current);
    const z = INTRO_START_Z + (INTRO_END_Z - INTRO_START_Z) * progress;
    camera.position.set(0, 0, z);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = INTRO_START_FOV + (INTRO_END_FOV - INTRO_START_FOV) * progress;
      camera.updateProjectionMatrix();
    }

    // Streak length follows how far the camera moved this frame.
    const deltaZ = previousZ.current - z;
    previousZ.current = z;
    const streak = Math.min(Math.max(deltaZ * 2.5, 0.05), 40);

    for (let i = 0; i < WARP_STAR_COUNT; i++) {
      const x = basePositions[i * 3];
      const y = basePositions[i * 3 + 1];
      const sz = basePositions[i * 3 + 2];
      positions[i * 6] = x;
      positions[i * 6 + 1] = y;
      positions[i * 6 + 2] = sz;
      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = y;
      positions[i * 6 + 5] = sz + streak;
    }
    if (linesRef.current) {
      linesRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // Fade the streaks away over the final stretch of the flight.
    if (materialRef.current) {
      const fade = Math.min(Math.max((progress - 0.7) / 0.3, 0), 1);
      materialRef.current.opacity = 0.85 * (1 - fade * fade);
    }

    if (progress >= 1) {
      finish();
    }
  });

  if (done) return null;

  return (
    <lineSegments ref={linesRef} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={WARP_STAR_COUNT * 2}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={materialRef}
        color="#9dffb0"
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
}

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
      'R': [[0,0], [0,1], [0,2], [0,3], [0,4], [0,5], [1,0], [1,2], [2,0], [2,2], [3,0], [3,1], [3,3], [3,4], [3,5]],
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

function Scene({ onIntroComplete }: { onIntroComplete: () => void }) {
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

      {/* Zoom-in from deep space on load */}
      <WarpIntro onComplete={onIntroComplete} />
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
  const [introDone, setIntroDone] = useState(false);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000' }}>
      <Canvas
        camera={{ position: [0, 0, INTRO_START_Z], fov: INTRO_START_FOV, far: 1000 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Scene onIntroComplete={() => setIntroDone(true)} />
      </Canvas>
      
      {/* Links (revealed once the zoom-in lands) */}
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '30px',
        color: '#00ff41',
        fontFamily: 'Courier New, monospace',
        fontSize: '14px',
        textShadow: '0 0 10px #00ff41',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        paddingBottom: '20px',
        opacity: introDone ? 1 : 0,
        transition: 'opacity 1.2s ease',
        pointerEvents: introDone ? 'auto' : 'none'
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