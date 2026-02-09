import { useState, Suspense, useEffect, useCallback } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useQuery } from '@tanstack/react-query';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
import { 
  Eye, Layers, Trash2, RotateCw, Factory, Box, Printer, Scissors, 
  Blend, Package, Move, Maximize2, Building2, Palette,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Ruler
} from 'lucide-react';

const HALL_WIDTH = 20;
const HALL_LENGTH = 50;
const WALL_HEIGHT = 8;
const GATE_WIDTH = 5;
const GATE_HEIGHT = 5;
const MOVE_STEP = 0.5;

const COLOR_PRESETS = [
  '#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706',
  '#0891b2', '#4f46e5', '#be123c', '#15803d', '#92400e',
  '#6366f1', '#ec4899', '#14b8a6', '#f97316', '#8b5cf6',
];

interface Machine {
  id: string;
  nameAr: string;
  type: 'film' | 'printing' | 'cutting' | 'mixer' | 'pallet';
  color: string;
  position: [number, number, number];
  size: [number, number, number];
  customName?: string;
  rotation?: number;
  scale: [number, number, number];
}

interface ActiveRoll {
  id: number;
  roll_number: string;
  stage: 'film' | 'printing' | 'cutting';
  roll_color: string;
  weight_kg: string;
  film_machine_id: string;
}

const MACHINE_CONFIGS: Record<Machine['type'], { nameAr: string; color: string; icon: typeof Factory }> = {
  film: { nameAr: 'ماكينة فيلم', color: '#2563eb', icon: Factory },
  printing: { nameAr: 'ماكينة طباعة', color: '#7c3aed', icon: Printer },
  cutting: { nameAr: 'ماكينة تقطيع', color: '#059669', icon: Scissors },
  mixer: { nameAr: 'خلاط مواد', color: '#dc2626', icon: Blend },
  pallet: { nameAr: 'بالة خشبية', color: '#92400e', icon: Package },
};

function useDraggable(
  id: string,
  isSelected: boolean,
  onDrag: (id: string, pos: [number, number, number]) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isSelected) return;
    e.stopPropagation();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (e.nativeEvent.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.nativeEvent.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const intersectPoint = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersectPoint)) {
      onDrag(id, [intersectPoint.x, 0, intersectPoint.z]);
    }
  };

  return { handlePointerDown, handlePointerUp, handlePointerMove, isDragging };
}

function ProfessionalFilmMachine({ machine, isSelected }: { machine: Machine; isSelected: boolean }) {
  const towerHeight = 5.5;
  return (
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]} scale={machine.scale}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[2.5, 0.8, 1.8]} />
        <meshStandardMaterial color={machine.color} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[1.2, 0.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.35, 0.35, 2, 20]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh castShadow position={[1.8, 1.3, 0]}>
        <cylinderGeometry args={[0.4, 0.15, 0.7, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.5} />
      </mesh>
      <mesh castShadow position={[-0.8, 1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.25, 0.25, 1.2, 16]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
      </mesh>
      {[[-0.8, -0.8], [-0.8, 0.8], [0.8, -0.8], [0.8, 0.8]].map((pos, i) => (
        <mesh key={i} position={[pos[0], towerHeight / 2, pos[1]]}>
          <boxGeometry args={[0.1, towerHeight, 0.1]} />
          <meshStandardMaterial color="#64748b" metalness={0.6} />
        </mesh>
      ))}
      <mesh castShadow position={[0, towerHeight, 0]}>
        <boxGeometry args={[2, 0.15, 2]} />
        <meshStandardMaterial color="#475569" metalness={0.5} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 3, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function ProfessionalPrintingMachine({ machine, isSelected }: { machine: Machine; isSelected: boolean }) {
  return (
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]} scale={machine.scale}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[3.5, 1.2, 2]} />
        <meshStandardMaterial color={machine.color} metalness={0.6} roughness={0.3} />
      </mesh>
      {[-1.2, -0.4, 0.4, 1.2].map((x, i) => (
        <mesh key={i} castShadow position={[x, 1.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 1.6, 16]} />
          <meshStandardMaterial color={['#ef4444', '#3b82f6', '#22c55e', '#eab308'][i]} metalness={0.4} roughness={0.4} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 2.5, 0]}>
        <boxGeometry args={[3.8, 0.3, 2.2]} />
        <meshStandardMaterial color="#1e1b4b" metalness={0.5} />
      </mesh>
      <mesh castShadow position={[-1.8, 1.5, 0]}>
        <boxGeometry args={[0.3, 2, 1.5]} />
        <meshStandardMaterial color="#4338ca" metalness={0.3} />
      </mesh>
      <mesh castShadow position={[1.8, 1.5, 0]}>
        <boxGeometry args={[0.3, 2, 1.5]} />
        <meshStandardMaterial color="#4338ca" metalness={0.3} />
      </mesh>
      <mesh castShadow position={[-2.2, 1.2, 0.6]}>
        <boxGeometry args={[0.4, 0.6, 0.4]} />
        <meshStandardMaterial color="#334155" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.8, 3, 32]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function ProfessionalCuttingMachine({ machine, isSelected }: { machine: Machine; isSelected: boolean }) {
  return (
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]} scale={machine.scale}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2.8, 1, 1.8]} />
        <meshStandardMaterial color={machine.color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.08, 32]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]}>
        <torusGeometry args={[0.6, 0.02, 8, 32]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.9} />
      </mesh>
      <mesh castShadow position={[-1.2, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 1.4, 16]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} />
      </mesh>
      <mesh castShadow position={[1.2, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.35, 0.35, 1.4, 16]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 2.2, -0.6]}>
        <boxGeometry args={[1.5, 0.8, 0.3]} />
        <meshStandardMaterial color="#1f2937" emissive="#10b981" emissiveIntensity={0.2} />
      </mesh>
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.2, 2.4, 32]} />
          <meshBasicMaterial color="#34d399" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function ProfessionalMixer({ machine, isSelected }: { machine: Machine; isSelected: boolean }) {
  return (
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]} scale={machine.scale}>
      <mesh castShadow position={[0, 2, 0]}>
        <cylinderGeometry args={[1, 0.8, 2.5, 16]} />
        <meshStandardMaterial color={machine.color} metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 3.4, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.6, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.5, 0.8, 1.5]} />
        <meshStandardMaterial color="#334155" metalness={0.5} />
      </mesh>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} castShadow position={[Math.cos(i * Math.PI / 2) * 0.6, 0.1, Math.sin(i * Math.PI / 2) * 0.6]}>
          <boxGeometry args={[0.3, 0.2, 0.3]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2, 2.2, 32]} />
          <meshBasicMaterial color="#f87171" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function WoodenPallet({ machine, isSelected }: { machine: Machine; isSelected: boolean }) {
  return (
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]} scale={machine.scale}>
      {[-0.6, 0, 0.6].map((x, i) => (
        <mesh key={`top-${i}`} position={[x, 0.15, 0]} castShadow>
          <boxGeometry args={[0.2, 0.06, 1.5]} />
          <meshStandardMaterial color={machine.color} roughness={0.8} />
        </mesh>
      ))}
      {[-0.5, 0.5].map((z, i) => (
        <mesh key={`bottom-${i}`} position={[0, 0.05, z]} castShadow>
          <boxGeometry args={[1.5, 0.06, 0.15]} />
          <meshStandardMaterial color="#92400e" roughness={0.8} />
        </mesh>
      ))}
      {[-0.5, 0, 0.5].map((z, i) => (
        <mesh key={`block-${i}`} position={[0, 0.1, z]} castShadow>
          <boxGeometry args={[0.15, 0.08, 0.15]} />
          <meshStandardMaterial color="#78350f" roughness={0.9} />
        </mesh>
      ))}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function HallStructure({ showStructure }: { showStructure: boolean }) {
  if (!showStructure) return null;
  
  const wallThickness = 0.2;
  const wallColor = "#94a3b8";
  const wallOpacity = 0.35;
  const roofColor = "#64748b";
  const roofOpacity = 0.2;

  return (
    <group>
      <mesh position={[HALL_WIDTH / 2, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[wallThickness, WALL_HEIGHT, HALL_LENGTH]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-HALL_WIDTH / 2, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[wallThickness, WALL_HEIGHT, HALL_LENGTH]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, HALL_LENGTH / 2]}>
        <boxGeometry args={[HALL_WIDTH, WALL_HEIGHT, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[-(HALL_WIDTH / 2 - (HALL_WIDTH - GATE_WIDTH) / 4), WALL_HEIGHT / 2, -HALL_LENGTH / 2]}>
        <boxGeometry args={[(HALL_WIDTH - GATE_WIDTH) / 2, WALL_HEIGHT, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[(HALL_WIDTH / 2 - (HALL_WIDTH - GATE_WIDTH) / 4), WALL_HEIGHT / 2, -HALL_LENGTH / 2]}>
        <boxGeometry args={[(HALL_WIDTH - GATE_WIDTH) / 2, WALL_HEIGHT, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT - (WALL_HEIGHT - GATE_HEIGHT) / 2, -HALL_LENGTH / 2]}>
        <boxGeometry args={[GATE_WIDTH, WALL_HEIGHT - GATE_HEIGHT, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[-GATE_WIDTH / 2, GATE_HEIGHT / 2, -HALL_LENGTH / 2]}>
        <boxGeometry args={[0.15, GATE_HEIGHT, 0.15]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.6} />
      </mesh>
      <mesh position={[GATE_WIDTH / 2, GATE_HEIGHT / 2, -HALL_LENGTH / 2]}>
        <boxGeometry args={[0.15, GATE_HEIGHT, 0.15]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.6} />
      </mesh>
      <mesh position={[0, GATE_HEIGHT, -HALL_LENGTH / 2]}>
        <boxGeometry args={[GATE_WIDTH + 0.3, 0.2, 0.2]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.6} />
      </mesh>

      <Html position={[0, GATE_HEIGHT + 0.8, -HALL_LENGTH / 2]} center>
        <div className="bg-amber-500/90 text-black px-3 py-1 rounded text-[10px] font-bold shadow-lg pointer-events-none whitespace-nowrap">
          البوابة الرئيسية
        </div>
      </Html>

      <mesh position={[0, WALL_HEIGHT + 0.5, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[HALL_WIDTH + 1, 0.15, HALL_LENGTH + 1]} />
        <meshStandardMaterial color={roofColor} transparent opacity={roofOpacity} side={THREE.DoubleSide} />
      </mesh>
      {[-HALL_WIDTH / 2 + 0.5, HALL_WIDTH / 2 - 0.5].map((x, i) => (
        <mesh key={`beam-${i}`} position={[x, WALL_HEIGHT + 0.2, 0]}>
          <boxGeometry args={[0.2, 0.4, HALL_LENGTH]} />
          <meshStandardMaterial color="#475569" transparent opacity={0.4} />
        </mesh>
      ))}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`cross-beam-${i}`} position={[0, WALL_HEIGHT + 0.2, -HALL_LENGTH / 2 + (i + 1) * (HALL_LENGTH / 7)]}>
          <boxGeometry args={[HALL_WIDTH, 0.3, 0.15]} />
          <meshStandardMaterial color="#475569" transparent opacity={0.3} />
        </mesh>
      ))}

      {[-HALL_WIDTH / 2, HALL_WIDTH / 2].map((x) => (
        [0, 1, 2, 3].map((i) => (
          <group key={`pillar-${x}-${i}`}>
            <mesh position={[x + (x > 0 ? -0.15 : 0.15), WALL_HEIGHT / 2, -HALL_LENGTH / 2 + (i + 1) * (HALL_LENGTH / 5)]}>
              <boxGeometry args={[0.25, WALL_HEIGHT, 0.25]} />
              <meshStandardMaterial color="#78716c" metalness={0.5} transparent opacity={0.5} />
            </mesh>
          </group>
        ))
      ))}
    </group>
  );
}

function FloorMarkings() {
  return (
    <group>
      {[-8, -4, 0, 4, 8].map((x, i) => (
        <mesh key={`lane-${i}`} position={[x, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, HALL_LENGTH - 2]} />
          <meshBasicMaterial color="#94a3b8" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  );
}

function DraggableGroup({ machine, isSelected, onSelect, onDrag }: any) {
  const { handlePointerDown, handlePointerUp, handlePointerMove } = useDraggable(machine.id, isSelected, onDrag);
  
  return (
    <group 
      position={machine.position} 
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      {machine.type === 'film' && <ProfessionalFilmMachine machine={machine} isSelected={isSelected} />}
      {machine.type === 'printing' && <ProfessionalPrintingMachine machine={machine} isSelected={isSelected} />}
      {machine.type === 'cutting' && <ProfessionalCuttingMachine machine={machine} isSelected={isSelected} />}
      {machine.type === 'mixer' && <ProfessionalMixer machine={machine} isSelected={isSelected} />}
      {machine.type === 'pallet' && <WoodenPallet machine={machine} isSelected={isSelected} />}
      <Html position={[0, machine.type === 'film' ? 6 * machine.scale[1] : 3.5 * machine.scale[1], 0]} center>
        <div className="bg-black/85 text-white px-2.5 py-1 rounded-md text-[9px] font-bold border border-white/20 shadow-xl pointer-events-none whitespace-nowrap backdrop-blur-sm">
          {machine.customName || machine.nameAr}
        </div>
      </Html>
    </group>
  );
}

export default function FactorySimulation3D() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'top'>('3d');
  const [showStructure, setShowStructure] = useState(false);
  const [showScalePanel, setShowScalePanel] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);

  const { data: activeRolls = [] } = useQuery<ActiveRoll[]>({
    queryKey: ['/api/factory-3d/active-rolls'],
    refetchInterval: 5000,
  });

  const selectedMachine = machines.find(m => m.id === selectedId);

  const moveMachine = useCallback((dx: number, dz: number) => {
    if (!selectedId) return;
    setMachines(prev => prev.map(m => {
      if (m.id !== selectedId) return m;
      const newX = Math.max(-HALL_WIDTH / 2 + 2, Math.min(HALL_WIDTH / 2 - 2, m.position[0] + dx));
      const newZ = Math.max(-HALL_LENGTH / 2 + 2, Math.min(HALL_LENGTH / 2 - 2, m.position[2] + dz));
      return { ...m, position: [newX, 0, newZ] as [number, number, number] };
    }));
  }, [selectedId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          moveMachine(0, -MOVE_STEP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          moveMachine(0, MOVE_STEP);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          moveMachine(-MOVE_STEP, 0);
          break;
        case 'ArrowRight':
          e.preventDefault();
          moveMachine(MOVE_STEP, 0);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          setMachines(prev => prev.filter(m => m.id !== selectedId));
          setSelectedId(null);
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setMachines(prev => prev.map(m => m.id === selectedId ? { ...m, rotation: ((m.rotation || 0) + 45) % 360 } : m));
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, moveMachine]);

  const addMachine = (type: Machine['type']) => {
    const config = MACHINE_CONFIGS[type];
    const newMachine: Machine = {
      id: `${type}-${Date.now()}`,
      nameAr: config.nameAr,
      type,
      color: config.color,
      position: [Math.random() * 6 - 3, 0, Math.random() * 6 - 3],
      size: [2, 2, 2],
      scale: [1, 1, 1],
    };
    setMachines([...machines, newMachine]);
    setSelectedId(newMachine.id);
  };

  const handleDrag = (id: string, pos: [number, number, number]) => {
    const clampedX = Math.max(-HALL_WIDTH / 2 + 2, Math.min(HALL_WIDTH / 2 - 2, pos[0]));
    const clampedZ = Math.max(-HALL_LENGTH / 2 + 2, Math.min(HALL_LENGTH / 2 - 2, pos[2]));
    setMachines(prev => prev.map(m => m.id === id ? { ...m, position: [clampedX, 0, clampedZ] } : m));
  };

  const rotateMachine = () => {
    if (!selectedId) return;
    setMachines(prev => prev.map(m => m.id === selectedId ? { ...m, rotation: ((m.rotation || 0) + 45) % 360 } : m));
  };

  const deleteMachine = () => {
    if (!selectedId) return;
    setMachines(machines.filter(m => m.id !== selectedId));
    setSelectedId(null);
  };

  const updateScale = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedId) return;
    setMachines(prev => prev.map(m => {
      if (m.id !== selectedId) return m;
      const newScale = [...m.scale] as [number, number, number];
      newScale[axis] = value;
      return { ...m, scale: newScale };
    }));
  };

  const updateColor = (color: string) => {
    if (!selectedId) return;
    setMachines(prev => prev.map(m => m.id === selectedId ? { ...m, color } : m));
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden font-sans" dir="rtl">
      <Header />
      <div className="flex-1 flex relative">
        <Sidebar />
        <main className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 lg:mr-64">
          
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 w-56 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin">
            <Card className="bg-slate-900/90 backdrop-blur-xl border-slate-700/50 text-white shadow-2xl">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Factory size={14} className="text-blue-400" />
                  <span className="text-xs font-bold text-slate-300">إضافة معدات</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.entries(MACHINE_CONFIGS) as [Machine['type'], typeof MACHINE_CONFIGS[Machine['type']]][]).map(([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button 
                        key={type}
                        onClick={() => addMachine(type)} 
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 hover:border-slate-600 transition-all text-slate-300 hover:text-white"
                      >
                        <Icon size={11} style={{ color: config.color }} />
                        {config.nameAr}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedMachine && (
              <Card className="bg-slate-900/90 backdrop-blur-xl border-slate-700/50 text-white shadow-2xl animate-in slide-in-from-top-2 duration-200">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: selectedMachine.color }} />
                      <span className="text-[11px] font-bold text-slate-200">{selectedMachine.nameAr}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4 border-slate-600 text-slate-400">
                      {selectedMachine.rotation || 0}°
                    </Badge>
                  </div>

                  <div className="flex gap-1 mb-2">
                    <Button size="sm" variant="outline" onClick={rotateMachine} className="flex-1 text-[9px] h-7 bg-slate-800/60 border-slate-700/50 hover:bg-slate-700 text-slate-300">
                      <RotateCw size={10} className="ml-1" /> تدوير
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowScalePanel(!showScalePanel); setShowColorPanel(false); }} className={`flex-1 text-[9px] h-7 border-slate-700/50 text-slate-300 ${showScalePanel ? 'bg-slate-700' : 'bg-slate-800/60 hover:bg-slate-700'}`}>
                      <Ruler size={10} className="ml-1" /> تحجيم
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowColorPanel(!showColorPanel); setShowScalePanel(false); }} className={`flex-1 text-[9px] h-7 border-slate-700/50 text-slate-300 ${showColorPanel ? 'bg-slate-700' : 'bg-slate-800/60 hover:bg-slate-700'}`}>
                      <Palette size={10} className="ml-1" /> لون
                    </Button>
                  </div>

                  {showScalePanel && (
                    <div className="mb-2 p-2 bg-slate-800/60 rounded-md border border-slate-700/30 space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[9px] text-slate-400">العرض (X)</Label>
                          <span className="text-[9px] text-slate-500">{selectedMachine.scale[0].toFixed(1)}x</span>
                        </div>
                        <Slider
                          value={[selectedMachine.scale[0]]}
                          min={0.3}
                          max={3}
                          step={0.1}
                          onValueChange={([v]) => updateScale(0, v)}
                          className="h-4"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[9px] text-slate-400">الارتفاع (Y)</Label>
                          <span className="text-[9px] text-slate-500">{selectedMachine.scale[1].toFixed(1)}x</span>
                        </div>
                        <Slider
                          value={[selectedMachine.scale[1]]}
                          min={0.3}
                          max={3}
                          step={0.1}
                          onValueChange={([v]) => updateScale(1, v)}
                          className="h-4"
                        />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[9px] text-slate-400">الطول (Z)</Label>
                          <span className="text-[9px] text-slate-500">{selectedMachine.scale[2].toFixed(1)}x</span>
                        </div>
                        <Slider
                          value={[selectedMachine.scale[2]]}
                          min={0.3}
                          max={3}
                          step={0.1}
                          onValueChange={([v]) => updateScale(2, v)}
                          className="h-4"
                        />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (!selectedId) return;
                        setMachines(prev => prev.map(m => m.id === selectedId ? { ...m, scale: [1, 1, 1] as [number, number, number] } : m));
                      }} className="w-full text-[8px] h-5 text-slate-500 hover:text-slate-300">
                        إعادة للحجم الأصلي
                      </Button>
                    </div>
                  )}

                  {showColorPanel && (
                    <div className="mb-2 p-2 bg-slate-800/60 rounded-md border border-slate-700/30">
                      <div className="grid grid-cols-5 gap-1.5">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            onClick={() => updateColor(color)}
                            className={`w-7 h-7 rounded-md border-2 transition-all hover:scale-110 ${selectedMachine.color === color ? 'border-white shadow-lg scale-110' : 'border-transparent hover:border-white/40'}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Label className="text-[9px] text-slate-400 shrink-0">مخصص:</Label>
                        <input
                          type="color"
                          value={selectedMachine.color}
                          onChange={(e) => updateColor(e.target.value)}
                          className="w-full h-6 rounded cursor-pointer bg-transparent border-0"
                        />
                      </div>
                    </div>
                  )}

                  <Button size="sm" variant="destructive" onClick={deleteMachine} className="w-full text-[9px] h-7 mb-1.5">
                    <Trash2 size={10} className="ml-1" /> حذف المعدة
                  </Button>

                  <div className="flex items-center gap-1 text-[8px] text-slate-500">
                    <Move size={8} />
                    <span>اسحب أو استخدم الأسهم للتحريك</span>
                  </div>
                  <div className="flex items-center gap-1 text-[8px] text-slate-500 mt-0.5">
                    <span className="bg-slate-700 px-1 rounded text-[7px]">R</span>
                    <span>تدوير</span>
                    <span className="mr-1 bg-slate-700 px-1 rounded text-[7px]">Del</span>
                    <span>حذف</span>
                    <span className="mr-1 bg-slate-700 px-1 rounded text-[7px]">Esc</span>
                    <span>إلغاء</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-lg px-3 py-2 flex items-center gap-3 shadow-xl">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Factory size={12} className="text-blue-400" />
                <span>{machines.length} معدة</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Box size={12} className="text-amber-400" />
                <span>{activeRolls.length} رول نشط</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    onClick={() => setShowStructure(!showStructure)} 
                    className={`w-9 h-9 backdrop-blur-xl border shadow-xl ${showStructure ? 'bg-amber-600/80 border-amber-500/50 hover:bg-amber-600' : 'bg-slate-900/90 border-slate-700/50 hover:bg-slate-800'}`}
                  >
                    <Building2 size={14} className={showStructure ? 'text-white' : 'text-slate-300'} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {showStructure ? "إخفاء السقف والجدران" : "إظهار السقف والجدران والبوابة"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="secondary" 
                    onClick={() => setViewMode(viewMode === '3d' ? 'top' : '3d')} 
                    className="w-9 h-9 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-800 shadow-xl"
                  >
                    {viewMode === '3d' ? <Layers size={14} className="text-slate-300" /> : <Eye size={14} className="text-slate-300" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {viewMode === '3d' ? "منظور علوي" : "منظور ثلاثي الأبعاد"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="secondary"
                    onClick={() => setSelectedId(null)}
                    className="w-9 h-9 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-800 shadow-xl"
                  >
                    <Maximize2 size={14} className="text-slate-300" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  إلغاء التحديد
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="absolute top-3 left-3 z-20">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-lg px-3 py-2 shadow-xl">
              <h2 className="text-xs font-bold text-white flex items-center gap-2">
                <Factory size={14} className="text-blue-400" />
                محاكاة صالة الإنتاج 3D
              </h2>
              <p className="text-[9px] text-slate-500 mt-0.5">اسحب المعدات لإعادة ترتيبها داخل الصالة</p>
            </div>
          </div>

          {selectedId && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 lg:flex hidden">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-xl p-1.5 shadow-xl flex items-center gap-1">
                <div className="grid grid-cols-3 gap-0.5">
                  <div />
                  <Button size="icon" variant="ghost" onClick={() => moveMachine(0, -MOVE_STEP)} className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-700">
                    <ArrowUp size={12} />
                  </Button>
                  <div />
                  <Button size="icon" variant="ghost" onClick={() => moveMachine(-MOVE_STEP, 0)} className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-700">
                    <ArrowLeft size={12} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => moveMachine(0, MOVE_STEP)} className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-700">
                    <ArrowDown size={12} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => moveMachine(MOVE_STEP, 0)} className="w-7 h-7 text-slate-400 hover:text-white hover:bg-slate-700">
                    <ArrowRight size={12} />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Canvas shadows className="!bg-transparent" onPointerMissed={() => setSelectedId(null)}>
            <Suspense fallback={null}>
              <PerspectiveCamera 
                makeDefault 
                position={viewMode === '3d' ? [18, 16, 18] : [0, 45, 0.1]} 
                fov={viewMode === '3d' ? 50 : 35}
              />
              <OrbitControls 
                enableRotate={viewMode === '3d'}
                enablePan={true}
                maxPolarAngle={viewMode === 'top' ? 0 : Math.PI / 2.1}
                minDistance={5}
                maxDistance={60}
              />
              
              <ambientLight intensity={0.5} />
              <directionalLight position={[15, 20, 10]} intensity={0.8} castShadow shadow-mapSize={[2048, 2048]} />
              <directionalLight position={[-10, 15, -10]} intensity={0.3} />
              <Environment preset="city" />

              <group>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}>
                  <planeGeometry args={[HALL_WIDTH, HALL_LENGTH]} />
                  <meshStandardMaterial color="#e8edf3" roughness={0.8} />
                </mesh>
                
                <gridHelper args={[HALL_LENGTH, 50, "#b0bec5", "#cfd8dc"]} position={[0, 0.005, 0]} />
                
                <HallStructure showStructure={showStructure} />
                <FloorMarkings />

                {machines.map((m) => (
                  <DraggableGroup 
                    key={m.id} 
                    machine={m} 
                    isSelected={selectedId === m.id} 
                    onSelect={() => setSelectedId(m.id)} 
                    onDrag={handleDrag} 
                  />
                ))}

                {activeRolls.map((roll, idx) => {
                  const m = machines.find(mac => mac.id === roll.film_machine_id);
                  return (
                    <group key={roll.id} position={m ? [m.position[0] + (idx % 3) * 1.2 - 1.2, 0.4, m.position[2] + 3] : [8, 0.4, -20 + idx * 1.5]}>
                      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.4, 0.4, 0.8, 32]} />
                        <meshStandardMaterial color={roll.roll_color} roughness={0.3} metalness={0.2} />
                      </mesh>
                      <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.15, 0.15, 0.85, 16]} />
                        <meshStandardMaterial color="#6b7280" metalness={0.8} />
                      </mesh>
                    </group>
                  );
                })}
                
                <ContactShadows opacity={0.35} scale={60} blur={2} far={15} position={[0, 0, 0]} />
              </group>
            </Suspense>
          </Canvas>
        </main>
      </div>
    </div>
  );
}
