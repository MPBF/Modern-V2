import { useState, useRef, useCallback, Suspense, useEffect } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useQuery } from '@tanstack/react-query';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import MobileShell from '../components/layout/MobileShell';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  RotateCcw, 
  Save, 
  Eye, 
  Layers, 
  Factory,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Home,
  Plus,
  Trash2,
  X,
  Activity,
  Clock,
  Package,
  Printer,
  Scissors,
  RefreshCw
} from 'lucide-react';

const HALL_WIDTH = 20;
const HALL_LENGTH = 50;
const HALL_SIDE_HEIGHT = 6;
const HALL_CENTER_HEIGHT = 8;
const GATE_WIDTH = 9;

interface Machine {
  id: string;
  name: string;
  nameAr: string;
  customName?: string;
  linkedMachineId?: string;
  type: 'film' | 'printing' | 'mixer' | 'cutting' | 'compressor' | 'transformer' | 'cylinder_rack' | 'pallet';
  color: string;
  position: [number, number, number];
  size: [number, number, number];
  scale?: number;
  rotation?: number;
  hasPrintingLine?: boolean;
}

interface ActiveRoll {
  id: number;
  roll_number: string;
  stage: 'film' | 'printing' | 'cutting';
  weight_kg: string;
  film_machine_id: string;
  printing_machine_id: string | null;
  cutting_machine_id: string | null;
  printed_at: string | null;
  cut_completed_at: string | null;
  created_at: string;
  production_order_number: string;
  master_batch_id: string | null;
  roll_color: string;
  color_name: string;
  customer_name: string;
}

interface MachineStats {
  machine: any;
  todayStats: {
    rolls_count: string;
    total_weight_kg: string;
    film_rolls: string;
    printing_rolls: string;
    cutting_rolls: string;
    completed_rolls: string;
  };
  recentRolls: any[];
}

const equipmentTemplates: Omit<Machine, 'id' | 'position'>[] = [
  { name: 'Film Machine', nameAr: 'ماكينة فيلم (اكسترودر)', type: 'film', color: '#2563eb', size: [3, 4, 5], hasPrintingLine: false },
  { name: 'Printing Machine', nameAr: 'ماكينة طباعة', type: 'printing', color: '#059669', size: [6, 2, 2] },
  { name: 'Cutting Machine', nameAr: 'ماكينة قطع', type: 'cutting', color: '#f59e0b', size: [5, 1.8, 2] },
  { name: 'Mixer', nameAr: 'خلاط', type: 'mixer', color: '#dc2626', size: [2.5, 3, 2.5] },
  { name: 'Air Compressor', nameAr: 'كمبريسور هواء', type: 'compressor', color: '#0d9488', size: [2, 1.5, 1.5] },
  { name: 'Transformer', nameAr: 'محول كهربائي', type: 'transformer', color: '#7c3aed', size: [1.5, 2, 1.5] },
  { name: 'Cylinder Rack', nameAr: 'سلم سلندرات', type: 'cylinder_rack', color: '#ea580c', size: [3, 2.5, 1] },
  { name: 'Pallet', nameAr: 'طبلية', type: 'pallet', color: '#854d0e', size: [1.2, 0.15, 1] },
];

const initialMachines: Machine[] = [
  { id: 'film-c', name: 'Film C', nameAr: 'ماكينة فيلم C', type: 'film', color: '#2563eb', position: [-7, 0, -18], size: [3, 4, 5], hasPrintingLine: true },
  { id: 'film-h', name: 'Film H', nameAr: 'ماكينة فيلم H', type: 'film', color: '#7c3aed', position: [7, 0, -18], size: [3, 4, 5], hasPrintingLine: true },
  { id: 'film-g', name: 'Film G', nameAr: 'ماكينة فيلم G', type: 'film', color: '#7c3aed', position: [7, 0, -12], size: [3, 4, 5], hasPrintingLine: true },
  { id: 'mixer-500', name: 'Mixer 500kg', nameAr: 'خلاط 500 كيلو', type: 'mixer', color: '#dc2626', position: [-7, 0, -10], size: [2.5, 3, 2.5] },
  { id: 'film-d', name: 'Film D', nameAr: 'ماكينة فيلم D', type: 'film', color: '#0891b2', position: [7, 0, -4], size: [3, 4, 5] },
  { id: 'film-b', name: 'Film B', nameAr: 'ماكينة فيلم B', type: 'film', color: '#0891b2', position: [7, 0, 2], size: [3, 4, 5] },
  { id: 'film-a', name: 'Film A', nameAr: 'ماكينة فيلم A', type: 'film', color: '#0891b2', position: [7, 0, 8], size: [3, 4, 5] },
  { id: 'printing-a', name: 'Printing A', nameAr: 'ماكينة طباعة A', type: 'printing', color: '#059669', position: [-7, 0, 0], size: [4, 3, 3] },
  { id: 'printing-b', name: 'Printing B', nameAr: 'ماكينة طباعة B', type: 'printing', color: '#059669', position: [-7, 0, 5], size: [4, 3, 3] },
  { id: 'printing-c', name: 'Printing C', nameAr: 'ماكينة طباعة C', type: 'printing', color: '#059669', position: [-7, 0, 10], size: [4, 3, 3] },
];

function ProductionHall({ hideRoof = false }: { hideRoof?: boolean }) {
  const width = HALL_WIDTH;
  const length = HALL_LENGTH;
  const sideHeight = HALL_SIDE_HEIGHT;
  const centerHeight = HALL_CENTER_HEIGHT;
  const gateWidth = GATE_WIDTH;
  const wallThickness = 0.3;
  
  return (
    <group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.8} />
      </mesh>

      <mesh position={[-width/2 + wallThickness/2, sideHeight/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, sideHeight, length]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
      
      <mesh position={[width/2 - wallThickness/2, sideHeight/2, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThickness, sideHeight, length]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      <mesh position={[-(gateWidth/2 + (width/2 - gateWidth/2)/2), sideHeight/2, -length/2 + wallThickness/2]} castShadow receiveShadow>
        <boxGeometry args={[(width - gateWidth)/2, sideHeight, wallThickness]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>
      
      <mesh position={[(gateWidth/2 + (width/2 - gateWidth/2)/2), sideHeight/2, -length/2 + wallThickness/2]} castShadow receiveShadow>
        <boxGeometry args={[(width - gateWidth)/2, sideHeight, wallThickness]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      <mesh position={[0, sideHeight/2, length/2 - wallThickness/2]} castShadow receiveShadow>
        <boxGeometry args={[width, sideHeight, wallThickness]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.5} />
      </mesh>

      <mesh position={[0, sideHeight + 0.75, -length/2 + wallThickness/2]}>
        <boxGeometry args={[gateWidth, 1.5, wallThickness]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>

      {!hideRoof && <RoofStructure width={width} length={length} sideHeight={sideHeight} centerHeight={centerHeight} />}

      <mesh position={[0, sideHeight + 0.05, -length/2 + 2]}>
        <boxGeometry args={[gateWidth - 0.5, 0.1, 0.1]} />
        <meshStandardMaterial color="#1e3a8a" />
      </mesh>
    </group>
  );
}

function RoofStructure({ width, length, sideHeight, centerHeight }: { width: number; length: number; sideHeight: number; centerHeight: number }) {
  const roofAngle = Math.atan((centerHeight - sideHeight) / (width / 2));
  const roofLength = (width / 2) / Math.cos(roofAngle);
  
  return (
    <group>
      <mesh 
        position={[-width/4, sideHeight + (centerHeight - sideHeight)/2, 0]} 
        rotation={[0, 0, roofAngle]}
      >
        <boxGeometry args={[roofLength, 0.15, length]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
      </mesh>
      
      <mesh 
        position={[width/4, sideHeight + (centerHeight - sideHeight)/2, 0]} 
        rotation={[0, 0, -roofAngle]}
      >
        <boxGeometry args={[roofLength, 0.15, length]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.4} />
      </mesh>

      {[-20, -10, 0, 10, 20].map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh position={[0, centerHeight - 0.5, 0]}>
            <boxGeometry args={[width - 1, 0.3, 0.15]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          <mesh position={[-width/4, sideHeight + (centerHeight - sideHeight)/4, 0]} rotation={[0, 0, roofAngle]}>
            <boxGeometry args={[roofLength * 0.9, 0.15, 0.15]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
          <mesh position={[width/4, sideHeight + (centerHeight - sideHeight)/4, 0]} rotation={[0, 0, -roofAngle]}>
            <boxGeometry args={[roofLength * 0.9, 0.15, 0.15]} />
            <meshStandardMaterial color="#374151" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function useDraggable(
  machine: Machine,
  isSelected: boolean,
  onSelect: () => void,
  onDrag: (newPosition: [number, number, number]) => void,
  onDragStart: () => void,
  onDragEnd: () => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    onDragStart();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = 'grabbing';
  }, [onSelect, onDragStart, gl.domElement.style]);

  const handlePointerUp = useCallback((e: ThreeEvent<PointerEvent>) => {
    setIsDragging(false);
    onDragEnd();
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    gl.domElement.style.cursor = 'auto';
  }, [onDragEnd, gl.domElement.style]);

  const handlePointerMove = useCallback((e: ThreeEvent<PointerEvent>) => {
    if (!isDragging || !isSelected) return;
    e.stopPropagation();
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (e.nativeEvent.clientX / gl.domElement.clientWidth) * 2 - 1,
      -(e.nativeEvent.clientY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    if (intersectPoint) {
      const maxX = HALL_WIDTH / 2 - machine.size[0] / 2 - 1;
      const maxZ = HALL_LENGTH / 2 - machine.size[2] / 2 - 1;
      const clampedX = Math.max(-maxX, Math.min(maxX, intersectPoint.x));
      const clampedZ = Math.max(-maxZ, Math.min(maxZ, intersectPoint.z));
      onDrag([clampedX, 0, clampedZ]);
    }
  }, [isDragging, isSelected, camera, gl.domElement, machine.size, onDrag]);

  return { handlePointerDown, handlePointerUp, handlePointerMove, isDragging };
}

function FilmMachine({ machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd }: { 
  machine: Machine; 
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (newPosition: [number, number, number]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { handlePointerDown, handlePointerUp, handlePointerMove } = useDraggable(
    machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd
  );

  const towerHeight = 5;
  
  const rotationY = ((machine.rotation || 0) * Math.PI) / 180;
  const scale = machine.scale || 1;
  const displayName = machine.customName || machine.nameAr;
  
  return (
    <group 
      ref={groupRef}
      position={machine.position}
      rotation={[0, rotationY, 0]}
      scale={[scale, scale, scale]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <mesh position={[0, 0.8, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 2.5, 16]} />
        <meshStandardMaterial 
          color={machine.color} 
          emissive={isSelected ? machine.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      
      <mesh position={[1.5, 0.5, 0]} castShadow>
        <boxGeometry args={[0.8, 1, 1.2]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>
      
      <mesh position={[-1.8, 0.6, 0]} castShadow>
        <boxGeometry args={[1, 1.2, 1.4]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.5} />
      </mesh>

      <mesh position={[0, towerHeight / 2 + 0.5, 0.8]} castShadow>
        <boxGeometry args={[0.3, towerHeight, 0.3]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, towerHeight / 2 + 0.5, -0.8]} castShadow>
        <boxGeometry args={[0.3, towerHeight, 0.3]} />
        <meshStandardMaterial color="#64748b" metalness={0.8} roughness={0.2} />
      </mesh>
      
      <mesh position={[0, towerHeight + 0.5, 0]} castShadow>
        <boxGeometry args={[1.5, 0.4, 2]} />
        <meshStandardMaterial color="#475569" metalness={0.7} roughness={0.3} />
      </mesh>
      
      <mesh position={[0, towerHeight + 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 1.2, 16]} />
        <meshStandardMaterial color={machine.color} metalness={0.6} roughness={0.3} />
      </mesh>
      
      <mesh position={[0, towerHeight + 2.2, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
      </mesh>

      {machine.hasPrintingLine && (
        <group position={[-3.5, 0, 0]}>
          <mesh position={[0, 1, 0]} castShadow>
            <boxGeometry args={[2, 2, 2.5]} />
            <meshStandardMaterial color="#059669" roughness={0.5} metalness={0.4} />
          </mesh>
          {[0.6, 0, -0.6].map((z, i) => (
            <mesh key={i} position={[1.2, 1, z]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
              <meshStandardMaterial color="#1f2937" metalness={0.8} />
            </mesh>
          ))}
        </group>
      )}

      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[3, 3.3, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}

      <Html position={[0, towerHeight + 3, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap font-bold">
          {displayName}
        </div>
      </Html>
    </group>
  );
}

function PrintingMachine({ machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd }: { 
  machine: Machine; 
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (newPosition: [number, number, number]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { handlePointerDown, handlePointerUp, handlePointerMove } = useDraggable(
    machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd
  );

  const rotationY = ((machine.rotation || 0) * Math.PI) / 180;
  const scale = machine.scale || 1;
  const displayName = machine.customName || machine.nameAr;

  return (
    <group 
      ref={groupRef}
      position={machine.position}
      rotation={[0, rotationY, 0]}
      scale={[scale, scale, scale]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <mesh position={[0, 1, 0]} castShadow>
        <boxGeometry args={[machine.size[0], machine.size[1], machine.size[2]]} />
        <meshStandardMaterial 
          color={machine.color} 
          emissive={isSelected ? machine.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      {[-1.5, -0.5, 0.5, 1.5].map((offset, i) => (
        <mesh key={i} position={[offset, 1.8, machine.size[2]/2 + 0.2]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.25, 0.25, 0.4, 16]} />
          <meshStandardMaterial color="#1f2937" metalness={0.8} />
        </mesh>
      ))}

      <mesh position={[-machine.size[0]/2 - 0.6, 1, 0]}>
        <boxGeometry args={[1, 1.5, 1.8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>
      
      <mesh position={[machine.size[0]/2 + 0.6, 1, 0]}>
        <boxGeometry args={[1, 1.5, 1.8]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>

      <mesh position={[0, machine.size[1] + 0.3, 0]}>
        <boxGeometry args={[0.8, 0.3, 0.8]} />
        <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.2} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[Math.max(machine.size[0], machine.size[2]) * 0.6, Math.max(machine.size[0], machine.size[2]) * 0.7, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}

      <Html position={[0, machine.size[1] + 1.5, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap font-bold">
          {displayName}
        </div>
      </Html>
    </group>
  );
}

function CuttingMachine({ machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd }: { 
  machine: Machine; 
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (newPosition: [number, number, number]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { handlePointerDown, handlePointerUp, handlePointerMove } = useDraggable(
    machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd
  );

  const rotationY = ((machine.rotation || 0) * Math.PI) / 180;
  const scale = machine.scale || 1;
  const displayName = machine.customName || machine.nameAr;

  return (
    <group 
      ref={groupRef}
      position={machine.position}
      rotation={[0, rotationY, 0]}
      scale={[scale, scale, scale]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <mesh position={[0, 0.9, 0]} castShadow>
        <boxGeometry args={[machine.size[0], machine.size[1], machine.size[2]]} />
        <meshStandardMaterial 
          color={machine.color} 
          emissive={isSelected ? machine.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      <mesh position={[-machine.size[0]/2 + 0.5, 1.5, 0]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, machine.size[2] - 0.4, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} />
      </mesh>
      <mesh position={[machine.size[0]/2 - 0.5, 1.5, 0]} rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, machine.size[2] - 0.4, 16]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} />
      </mesh>

      <mesh position={[0, machine.size[1] + 0.3, 0]}>
        <boxGeometry args={[machine.size[0] * 0.8, 0.1, 0.1]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.3} />
      </mesh>

      <mesh position={[-machine.size[0]/2 - 0.4, 0.8, 0]}>
        <boxGeometry args={[0.6, 1.6, 1.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>
      <mesh position={[machine.size[0]/2 + 0.4, 0.8, 0]}>
        <boxGeometry args={[0.6, 1.6, 1.2]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[Math.max(machine.size[0], machine.size[2]) * 0.5, Math.max(machine.size[0], machine.size[2]) * 0.6, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}

      <Html position={[0, machine.size[1] + 1, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap font-bold">
          {displayName}
        </div>
      </Html>
    </group>
  );
}

function MixerMachine({ machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd }: { 
  machine: Machine; 
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (newPosition: [number, number, number]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { handlePointerDown, handlePointerUp, handlePointerMove } = useDraggable(
    machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd
  );

  const rotationY = ((machine.rotation || 0) * Math.PI) / 180;
  const scale = machine.scale || 1;
  const displayName = machine.customName || machine.nameAr;

  return (
    <group 
      ref={groupRef}
      position={machine.position}
      rotation={[0, rotationY, 0]}
      scale={[scale, scale, scale]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <mesh position={[0, machine.size[1]/2 + 0.5, 0]} castShadow>
        <cylinderGeometry args={[machine.size[0]/2, machine.size[0]/2 * 0.8, machine.size[1], 16]} />
        <meshStandardMaterial 
          color={machine.color} 
          emissive={isSelected ? machine.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      <mesh position={[0, machine.size[1] + 1.2, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
        <meshStandardMaterial color="#374151" metalness={0.9} />
      </mesh>

      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[machine.size[0] * 1.2, 0.5, machine.size[2] * 1.2]} />
        <meshStandardMaterial color="#4b5563" />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[machine.size[0] * 0.7, machine.size[0] * 0.85, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}

      <Html position={[0, machine.size[1] + 2, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap font-bold">
          {displayName}
        </div>
      </Html>
    </group>
  );
}

function GenericEquipment({ machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd }: {
  machine: Machine;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (newPosition: [number, number, number]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { handlePointerDown, handlePointerUp, handlePointerMove } = useDraggable(
    machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd
  );

  const rotationY = ((machine.rotation || 0) * Math.PI) / 180;
  const scale = machine.scale || 1;
  const displayName = machine.customName || machine.nameAr;

  const getEquipmentMesh = () => {
    switch (machine.type) {
      case 'compressor':
        return (
          <group>
            <mesh position={[0, machine.size[1]/2, 0]} castShadow>
              <cylinderGeometry args={[machine.size[0]/2, machine.size[0]/2, machine.size[1], 16]} />
              <meshStandardMaterial color={machine.color} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[machine.size[0]/2 + 0.2, machine.size[1]/2, 0]}>
              <boxGeometry args={[0.3, 0.4, 0.3]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
          </group>
        );
      case 'transformer':
        return (
          <group>
            <mesh position={[0, machine.size[1]/2, 0]} castShadow>
              <boxGeometry args={machine.size} />
              <meshStandardMaterial color={machine.color} metalness={0.5} roughness={0.4} />
            </mesh>
            <mesh position={[0, machine.size[1] + 0.2, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.4, 8]} />
              <meshStandardMaterial color="#1f2937" />
            </mesh>
          </group>
        );
      case 'cylinder_rack':
        return (
          <group>
            <mesh position={[0, 0.1, 0]} castShadow>
              <boxGeometry args={[machine.size[0], 0.2, machine.size[2]]} />
              <meshStandardMaterial color="#374151" />
            </mesh>
            {[-0.8, 0, 0.8].map((offset, i) => (
              <mesh key={i} position={[offset, machine.size[1]/2 + 0.2, 0]}>
                <boxGeometry args={[0.1, machine.size[1], 0.1]} />
                <meshStandardMaterial color={machine.color} />
              </mesh>
            ))}
            {[0.5, 1.2, 1.9].map((h, i) => (
              <mesh key={`shelf-${i}`} position={[0, h, 0]}>
                <boxGeometry args={[machine.size[0] - 0.2, 0.05, machine.size[2]]} />
                <meshStandardMaterial color="#6b7280" />
              </mesh>
            ))}
          </group>
        );
      case 'pallet':
        return (
          <group>
            <mesh position={[0, machine.size[1]/2, 0]} castShadow>
              <boxGeometry args={machine.size} />
              <meshStandardMaterial color={machine.color} roughness={0.9} />
            </mesh>
            {[-0.4, 0, 0.4].map((offset, i) => (
              <mesh key={i} position={[offset, 0.02, 0]}>
                <boxGeometry args={[0.1, 0.04, machine.size[2]]} />
                <meshStandardMaterial color="#78350f" />
              </mesh>
            ))}
          </group>
        );
      default:
        return (
          <mesh position={[0, machine.size[1]/2, 0]} castShadow>
            <boxGeometry args={machine.size} />
            <meshStandardMaterial color={machine.color} />
          </mesh>
        );
    }
  };

  return (
    <group 
      ref={groupRef}
      position={machine.position}
      rotation={[0, rotationY, 0]}
      scale={[scale, scale, scale]}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
    >
      {getEquipmentMesh()}

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[Math.max(...machine.size) * 0.6, Math.max(...machine.size) * 0.7, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}

      <Html position={[0, machine.size[1] + 0.5, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap font-bold">
          {displayName}
        </div>
      </Html>
    </group>
  );
}

function Roll3D({ roll, position, onSelect }: {
  roll: ActiveRoll;
  position: [number, number, number];
  onSelect: () => void;
}) {
  const weight = parseFloat(roll.weight_kg) || 10;
  const radius = Math.min(0.3 + (weight / 100) * 0.3, 0.8);
  const height = Math.min(0.4 + (weight / 50) * 0.2, 1);
  const isPrinted = !!roll.printed_at;

  return (
    <group position={position} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, height, 32]} />
        <meshStandardMaterial 
          color={roll.roll_color} 
          roughness={0.3} 
          metalness={0.2}
        />
      </mesh>
      
      {isPrinted && (
        <mesh position={[0, radius + 0.1, 0]}>
          <boxGeometry args={[0.3, 0.05, 0.3]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      )}

      <Html position={[0, radius + 0.3, 0]} center>
        <div className="bg-black/80 text-white px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap cursor-pointer hover:bg-black/90">
          {roll.roll_number}
          {isPrinted && <span className="mr-1 text-green-400">✓</span>}
        </div>
      </Html>
    </group>
  );
}

function Scene({ machines, selectedMachine, onSelectMachine, onDragMachine, onDragStart, onDragEnd, hideRoof, activeRolls, onSelectRoll }: {
  machines: Machine[];
  selectedMachine: string | null;
  onSelectMachine: (id: string | null) => void;
  onDragMachine: (id: string, position: [number, number, number]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  hideRoof: boolean;
  activeRolls: ActiveRoll[];
  onSelectRoll: (roll: ActiveRoll) => void;
}) {
  const getRollPositionNearMachine = (roll: ActiveRoll, index: number): [number, number, number] => {
    const machineId = roll.stage === 'film' ? roll.film_machine_id 
      : roll.stage === 'printing' ? roll.printing_machine_id 
      : roll.cutting_machine_id;
    
    const linkedMachine = machines.find(m => m.linkedMachineId === machineId);
    
    if (linkedMachine) {
      const offsetX = (index % 5) * 0.8 - 1.6;
      const offsetZ = Math.floor(index / 5) * 0.8 + 2;
      return [
        linkedMachine.position[0] + offsetX,
        0.3,
        linkedMachine.position[2] + offsetZ
      ];
    }
    
    return [5 + (index % 10) * 1, 0.3, 20 + Math.floor(index / 10) * 1];
  };
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[-5, 8, -10]} intensity={0.5} color="#fef3c7" />
      <pointLight position={[5, 8, 10]} intensity={0.5} color="#fef3c7" />

      <ProductionHall hideRoof={hideRoof} />

      {machines.map((machine) => {
        const isSelected = selectedMachine === machine.id;
        const commonProps = {
          machine,
          isSelected,
          onSelect: () => onSelectMachine(machine.id),
          onDrag: (pos: [number, number, number]) => onDragMachine(machine.id, pos),
          onDragStart,
          onDragEnd,
        };

        switch (machine.type) {
          case 'film':
            return <FilmMachine key={machine.id} {...commonProps} />;
          case 'printing':
            return <PrintingMachine key={machine.id} {...commonProps} />;
          case 'cutting':
            return <CuttingMachine key={machine.id} {...commonProps} />;
          case 'mixer':
            return <MixerMachine key={machine.id} {...commonProps} />;
          default:
            return <GenericEquipment key={machine.id} {...commonProps} />;
        }
      })}

      {activeRolls.map((roll, index) => (
        <Roll3D 
          key={roll.id} 
          roll={roll} 
          position={getRollPositionNearMachine(roll, index)}
          onSelect={() => onSelectRoll(roll)}
        />
      ))}

    </>
  );
}

function CameraControls({ isDragging }: { isDragging: boolean }) {
  return (
    <OrbitControls 
      enablePan={!isDragging}
      enableZoom={!isDragging}
      enableRotate={!isDragging}
      minDistance={10}
      maxDistance={80}
      maxPolarAngle={Math.PI / 2.1}
      target={[0, 0, 0]}
    />
  );
}

export default function FactorySimulation3D() {
  const [machines, setMachines] = useState<Machine[]>(initialMachines);
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);
  const [showMachineList, setShowMachineList] = useState(true);
  const [showEquipmentPalette, setShowEquipmentPalette] = useState(false);
  const [viewMode, setViewMode] = useState<'3d' | 'top'>('3d');
  const [isDraggingMachine, setIsDraggingMachine] = useState(false);
  const [hideRoof, setHideRoof] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState<ActiveRoll | null>(null);
  const [showMachineStats, setShowMachineStats] = useState(false);
  const [selectedMachineForStats, setSelectedMachineForStats] = useState<string | null>(null);

  const { data: activeRolls = [], refetch: refetchRolls } = useQuery<ActiveRoll[]>({
    queryKey: ['/api/factory-3d/active-rolls'],
    refetchInterval: 10000,
  });

  const { data: machineStats } = useQuery<MachineStats>({
    queryKey: ['/api/factory-3d/machine-stats', selectedMachineForStats],
    enabled: !!selectedMachineForStats,
  });

  const { data: realMachines = [] } = useQuery<any[]>({
    queryKey: ['/api/machines'],
  });

  useEffect(() => {
    const saved = localStorage.getItem('factoryLayout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Machine[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMachines(parsed);
        }
      } catch {
        console.log('Failed to load saved layout');
      }
    }
  }, []);

  const handleSelectMachine = useCallback((id: string | null) => {
    setSelectedMachine(id);
  }, []);

  const handleDragMachine = useCallback((id: string, position: [number, number, number]) => {
    setMachines(prev => prev.map(m => 
      m.id === id ? { ...m, position } : m
    ));
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDraggingMachine(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setIsDraggingMachine(false);
  }, []);

  const updateMachine = useCallback((id: string, updates: Partial<Machine>) => {
    setMachines(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ));
  }, []);

  const getSelectedMachine = () => machines.find(m => m.id === selectedMachine);

  const deleteMachine = () => {
    if (selectedMachine) {
      setMachines(prev => prev.filter(m => m.id !== selectedMachine));
      setSelectedMachine(null);
    }
  };

  const addEquipment = (template: Omit<Machine, 'id' | 'position'>) => {
    const newId = `${template.type}-${Date.now()}`;
    const newMachine: Machine = {
      ...template,
      id: newId,
      position: [0, 0, 0],
    };
    setMachines(prev => [...prev, newMachine]);
    setSelectedMachine(newId);
    setShowEquipmentPalette(false);
  };

  const resetPositions = () => {
    setMachines(initialMachines);
    setSelectedMachine(null);
    localStorage.removeItem('factoryLayout');
  };

  const saveLayout = () => {
    localStorage.setItem('factoryLayout', JSON.stringify(machines));
    alert('تم حفظ التخطيط بنجاح!');
  };

  const selectedMachineData = machines.find(m => m.id === selectedMachine);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <MobileShell />
        <main className="flex-1 lg:mr-64">
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">محاكاة صالة الإنتاج 3D</h1>
              <p className="text-blue-100 text-sm">اسحب المكائن لإعادة ترتيبها</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={resetPositions}>
              <RotateCcw className="h-4 w-4 ml-2" />
              إعادة ضبط
            </Button>
            <Button variant="secondary" size="sm" onClick={saveLayout}>
              <Save className="h-4 w-4 ml-2" />
              حفظ
            </Button>
            <Button 
              variant={viewMode === '3d' ? 'default' : 'secondary'} 
              size="sm" 
              onClick={() => setViewMode('3d')}
            >
              <Eye className="h-4 w-4 ml-2" />
              3D
            </Button>
            <Button 
              variant={viewMode === 'top' ? 'default' : 'secondary'} 
              size="sm" 
              onClick={() => setViewMode('top')}
            >
              <Layers className="h-4 w-4 ml-2" />
              من الأعلى
            </Button>
            <Button 
              variant={hideRoof ? 'default' : 'secondary'} 
              size="sm" 
              onClick={() => setHideRoof(!hideRoof)}
            >
              <Home className="h-4 w-4 ml-2" />
              {hideRoof ? 'إظهار السقف' : 'إخفاء السقف'}
            </Button>
          </div>
        </div>

        <div className="flex-1 flex relative">
          <div className="flex-1 bg-slate-900">
            <Canvas shadows>
              <Suspense fallback={null}>
                <PerspectiveCamera 
                  makeDefault 
                  position={viewMode === '3d' ? [25, 20, 25] : [0, 40, 0]}
                  fov={50}
                />
                <Scene 
                  machines={machines}
                  selectedMachine={selectedMachine}
                  onSelectMachine={handleSelectMachine}
                  onDragMachine={handleDragMachine}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  hideRoof={hideRoof}
                  activeRolls={activeRolls}
                  onSelectRoll={setSelectedRoll}
                />
                <CameraControls isDragging={isDraggingMachine} />
                <Environment preset="warehouse" />
              </Suspense>
            </Canvas>
          </div>

          <div className={`absolute left-0 top-0 bottom-0 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 ${showMachineList ? 'w-72' : 'w-0'}`}>
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute -right-8 top-4 bg-white dark:bg-gray-800 shadow rounded-r-lg"
              onClick={() => setShowMachineList(!showMachineList)}
            >
              {showMachineList ? <ChevronLeft /> : <ChevronRight />}
            </Button>

            {showMachineList && (
              <div className="p-4 h-full overflow-y-auto">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Factory className="h-5 w-5" />
                  قائمة المكائن
                </h3>

                <div className="space-y-2">
                  {machines.map((machine) => (
                    <Card 
                      key={machine.id}
                      className={`cursor-pointer transition-all ${selectedMachine === machine.id ? 'ring-2 ring-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      onClick={() => setSelectedMachine(machine.id)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: machine.color }}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{machine.customName || machine.nameAr}</div>
                            <div className="text-xs text-gray-500">{machine.customName ? machine.nameAr : machine.name}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {machine.type === 'film' ? 'فيلم' : 
                             machine.type === 'printing' ? 'طباعة' : 
                             machine.type === 'mixer' ? 'خلاط' : 'قص'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Button 
                  className="w-full mt-4" 
                  variant="outline"
                  onClick={() => setShowEquipmentPalette(true)}
                >
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة معدات
                </Button>

                {selectedMachineData && (
                  <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold">خصائص المعدة</h4>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={deleteMachine}
                      >
                        <Trash2 className="h-4 w-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">الاسم المخصص</label>
                        <input
                          type="text"
                          className="w-full mt-1 px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-800 dark:border-gray-600"
                          placeholder={selectedMachineData.nameAr}
                          value={selectedMachineData.customName || ''}
                          onChange={(e) => updateMachine(selectedMachineData.id, { customName: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">اللون</label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            className="w-8 h-8 rounded cursor-pointer border-0"
                            value={selectedMachineData.color}
                            onChange={(e) => updateMachine(selectedMachineData.id, { color: e.target.value })}
                          />
                          <span className="text-xs text-gray-500">{selectedMachineData.color}</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          الدوران: {selectedMachineData.rotation || 0}°
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="360"
                          step="15"
                          className="w-full mt-1"
                          value={selectedMachineData.rotation || 0}
                          onChange={(e) => updateMachine(selectedMachineData.id, { rotation: Number(e.target.value) })}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>0°</span>
                          <span>180°</span>
                          <span>360°</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          الحجم: {((selectedMachineData.scale || 1) * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          className="w-full mt-1"
                          value={selectedMachineData.scale || 1}
                          onChange={(e) => updateMachine(selectedMachineData.id, { scale: Number(e.target.value) })}
                        />
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>50%</span>
                          <span>100%</span>
                          <span>200%</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-400">ربط بماكينة حقيقية</label>
                        <select
                          className="w-full mt-1 px-2 py-1.5 text-sm border rounded bg-white dark:bg-gray-800 dark:border-gray-600"
                          value={selectedMachineData.linkedMachineId || ''}
                          onChange={(e) => updateMachine(selectedMachineData.id, { linkedMachineId: e.target.value || undefined })}
                        >
                          <option value="">-- بدون ربط --</option>
                          {realMachines.map((m: any) => (
                            <option key={m.id} value={m.id}>
                              {m.name_ar || m.name} ({m.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      {selectedMachineData.linkedMachineId && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            setSelectedMachineForStats(selectedMachineData.linkedMachineId!);
                            setShowMachineStats(true);
                          }}
                        >
                          <Activity className="h-4 w-4 ml-2" />
                          عرض بيانات الإنتاج
                        </Button>
                      )}

                      <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="text-xs text-gray-500 space-y-1">
                          <p><strong>النوع:</strong> {selectedMachineData.nameAr}</p>
                          <p><strong>الموقع:</strong> X: {selectedMachineData.position[0].toFixed(1)}م, Z: {selectedMachineData.position[2].toFixed(1)}م</p>
                          {selectedMachineData.linkedMachineId && (
                            <p className="text-green-600"><strong>مرتبطة:</strong> {selectedMachineData.linkedMachineId}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-bold mb-2 text-blue-800 dark:text-blue-200">تعليمات</h4>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• اضغط على ماكينة لتحديدها</li>
                    <li>• اسحب الماكينة لتحريكها</li>
                    <li>• استخدم الماوس للتدوير والتكبير</li>
                    <li>• زر الحفظ لحفظ التخطيط</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {showEquipmentPalette && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg">إضافة معدات جديدة</h3>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={() => setShowEquipmentPalette(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {equipmentTemplates.map((template, index) => (
                    <Card 
                      key={index}
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => addEquipment(template)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: template.color }}
                        />
                        <div>
                          <div className="font-medium text-sm">{template.nameAr}</div>
                          <div className="text-xs text-gray-500">{template.name}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button size="icon" variant="secondary" onClick={() => setViewMode('3d')}>
              <Home className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="secondary">
              <ZoomOut className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-4">
            <span>صالة الإنتاج: {20}م × {50}م | الارتفاع: {6}م-{8}م | البوابة: {9}م</span>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Package className="h-3 w-3" />
              {activeRolls.length} رول نشط
            </Badge>
            <Button size="sm" variant="ghost" className="text-white hover:text-white/80" onClick={() => refetchRolls()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

        <Dialog open={!!selectedRoll} onOpenChange={() => setSelectedRoll(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                تفاصيل الرول
              </DialogTitle>
            </DialogHeader>
            {selectedRoll && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-full"
                    style={{ backgroundColor: selectedRoll.roll_color }}
                  />
                  <div>
                    <div className="font-bold text-lg">{selectedRoll.roll_number}</div>
                    <div className="text-sm text-gray-500">{selectedRoll.color_name}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="text-gray-500">أمر الإنتاج</div>
                    <div className="font-medium">{selectedRoll.production_order_number}</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="text-gray-500">الوزن</div>
                    <div className="font-medium">{parseFloat(selectedRoll.weight_kg).toFixed(2)} كجم</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="text-gray-500">العميل</div>
                    <div className="font-medium">{selectedRoll.customer_name}</div>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded">
                    <div className="text-gray-500">المرحلة</div>
                    <div className="font-medium flex items-center gap-1">
                      {selectedRoll.stage === 'film' && <><Activity className="h-4 w-4 text-blue-500" /> فيلم</>}
                      {selectedRoll.stage === 'printing' && <><Printer className="h-4 w-4 text-green-500" /> طباعة</>}
                      {selectedRoll.stage === 'cutting' && <><Scissors className="h-4 w-4 text-orange-500" /> قطع</>}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    تم الإنشاء: {new Date(selectedRoll.created_at).toLocaleString('ar-SA')}
                  </div>
                  {selectedRoll.printed_at && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Printer className="h-3 w-3" />
                      تمت الطباعة: {new Date(selectedRoll.printed_at).toLocaleString('ar-SA')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showMachineStats} onOpenChange={setShowMachineStats}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                إحصائيات الماكينة
              </DialogTitle>
            </DialogHeader>
            {machineStats && (
              <div className="space-y-4">
                <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-bold mb-2">{machineStats.machine?.name_ar || machineStats.machine?.name}</h4>
                  <Badge variant={machineStats.machine?.status === 'active' ? 'default' : 'destructive'}>
                    {machineStats.machine?.status === 'active' ? 'تعمل' : 'متوقفة'}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded">
                    <div className="text-2xl font-bold text-blue-600">{machineStats.todayStats?.rolls_count || 0}</div>
                    <div className="text-xs text-gray-500">رولات اليوم</div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">{parseFloat(machineStats.todayStats?.total_weight_kg || '0').toFixed(1)}</div>
                    <div className="text-xs text-gray-500">كجم اليوم</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded">
                    <div className="text-2xl font-bold text-orange-600">{machineStats.todayStats?.completed_rolls || 0}</div>
                    <div className="text-xs text-gray-500">مكتمل</div>
                  </div>
                </div>

                <div>
                  <h5 className="font-medium mb-2">آخر الرولات</h5>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {machineStats.recentRolls?.map((roll: any) => (
                        <div key={roll.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: roll.roll_color }}
                          />
                          <div className="flex-1 text-sm">
                            <div className="font-medium">{roll.roll_number}</div>
                            <div className="text-xs text-gray-500">{roll.production_order_number}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {parseFloat(roll.weight_kg).toFixed(1)} كجم
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        </main>
      </div>
    </div>
  );
}
