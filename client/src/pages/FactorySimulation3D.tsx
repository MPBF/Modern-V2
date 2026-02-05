import { useState, useRef, useCallback, Suspense, useEffect } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import MobileShell from '../components/layout/MobileShell';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
  X
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
  type: 'film' | 'printing' | 'mixer' | 'cutting' | 'compressor' | 'transformer' | 'cylinder_rack' | 'pallet';
  color: string;
  position: [number, number, number];
  size: [number, number, number];
  rotation?: number;
  hasPrintingLine?: boolean;
}

const equipmentTemplates: Omit<Machine, 'id' | 'position'>[] = [
  { name: 'Mixer', nameAr: 'خلاط', type: 'mixer', color: '#dc2626', size: [2.5, 3, 2.5] },
  { name: 'Air Compressor', nameAr: 'كمبريسور هواء', type: 'compressor', color: '#0d9488', size: [2, 1.5, 1.5] },
  { name: 'Transformer', nameAr: 'محول كهربائي', type: 'transformer', color: '#7c3aed', size: [1.5, 2, 1.5] },
  { name: 'Cylinder Rack', nameAr: 'سلم سلندرات', type: 'cylinder_rack', color: '#ea580c', size: [3, 2.5, 1] },
  { name: 'Pallet', nameAr: 'طبلية', type: 'pallet', color: '#854d0e', size: [1.2, 0.15, 1] },
  { name: 'Film Machine', nameAr: 'ماكينة فيلم', type: 'film', color: '#2563eb', size: [3, 4, 5], hasPrintingLine: false },
  { name: 'Printing Machine', nameAr: 'ماكينة طباعة', type: 'printing', color: '#059669', size: [4, 3, 3] },
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

function ProductionHall() {
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

      <RoofStructure width={width} length={length} sideHeight={sideHeight} centerHeight={centerHeight} />

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

function FilmMachine({ machine, isSelected, onSelect, onDrag, onDragStart, onDragEnd }: { 
  machine: Machine; 
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (newPosition: [number, number, number]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    onDragStart();
    gl.domElement.style.cursor = 'grabbing';
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    onDragEnd();
    gl.domElement.style.cursor = 'auto';
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
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
  };

  return (
    <group 
      ref={groupRef}
      position={machine.position}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
    >
      <mesh position={[0, machine.size[1]/2, 0]} castShadow>
        <boxGeometry args={machine.size} />
        <meshStandardMaterial 
          color={machine.color} 
          emissive={isSelected ? machine.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>

      <mesh position={[0, machine.size[1] + 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.8, 3, 8]} />
        <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
      </mesh>
      
      <mesh position={[0, machine.size[1] + 3, 0]} castShadow>
        <sphereGeometry args={[0.8, 16, 16]} />
        <meshStandardMaterial color={machine.color} metalness={0.5} roughness={0.4} />
      </mesh>

      <mesh position={[machine.size[0]/2 - 0.2, machine.size[1]/2, 0]}>
        <boxGeometry args={[0.3, 0.5, 0.3]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      {machine.hasPrintingLine && (
        <group position={[-3, 0, 0]}>
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[2, 3, 3]} />
            <meshStandardMaterial color="#059669" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[1.2, 1, 0]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.2, 0.2, 0.5, 16]} />
            <meshStandardMaterial color="#374151" metalness={0.8} />
          </mesh>
        </group>
      )}

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[Math.max(...machine.size) * 0.7, Math.max(...machine.size) * 0.8, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}

      <Html position={[0, machine.size[1] + 4.5, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap font-bold">
          {machine.name}
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
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    onDragStart();
    gl.domElement.style.cursor = 'grabbing';
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    onDragEnd();
    gl.domElement.style.cursor = 'auto';
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
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
  };

  return (
    <group 
      ref={groupRef}
      position={machine.position}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
    >
      <mesh position={[0, machine.size[1]/2, 0]} castShadow>
        <boxGeometry args={machine.size} />
        <meshStandardMaterial 
          color={machine.color} 
          emissive={isSelected ? machine.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          roughness={0.4}
          metalness={0.5}
        />
      </mesh>

      {[-0.8, 0, 0.8].map((offset, i) => (
        <mesh key={i} position={[-machine.size[0]/2 - 0.3, machine.size[1]/2, offset]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.5, 16]} />
          <meshStandardMaterial color="#374151" metalness={0.8} />
        </mesh>
      ))}

      <mesh position={[machine.size[0]/2, machine.size[1] - 0.2, 0]}>
        <boxGeometry args={[0.4, 0.4, 1.5]} />
        <meshStandardMaterial color="#1e40af" emissive="#1e40af" emissiveIntensity={0.2} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <ringGeometry args={[Math.max(...machine.size) * 0.6, Math.max(...machine.size) * 0.7, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}

      <Html position={[0, machine.size[1] + 1, 0]} center>
        <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap font-bold">
          {machine.name}
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
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    onDragStart();
    gl.domElement.style.cursor = 'grabbing';
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    onDragEnd();
    gl.domElement.style.cursor = 'auto';
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
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
  };

  return (
    <group 
      ref={groupRef}
      position={machine.position}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerUp}
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
          {machine.name}
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
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl } = useThree();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onSelect();
    setIsDragging(true);
    onDragStart();
    gl.domElement.style.cursor = 'grabbing';
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    onDragEnd();
    gl.domElement.style.cursor = 'auto';
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDragging) return;
    e.stopPropagation();
    
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(
      (e.nativeEvent.offsetX / gl.domElement.clientWidth) * 2 - 1,
      -(e.nativeEvent.offsetY / gl.domElement.clientHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);
    
    if (intersectPoint) {
      const maxX = HALL_WIDTH / 2 - machine.size[0] / 2 - 1;
      const maxZ = HALL_LENGTH / 2 - machine.size[2] / 2 - 1;
      const clampedX = Math.max(-maxX, Math.min(maxX, intersectPoint.x));
      const clampedZ = Math.max(-maxZ, Math.min(maxZ, intersectPoint.z));
      onDrag([clampedX, 0, clampedZ]);
    }
  };

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
          {machine.nameAr}
        </div>
      </Html>
    </group>
  );
}

function Scene({ machines, selectedMachine, onSelectMachine, onDragMachine, onDragStart, onDragEnd }: {
  machines: Machine[];
  selectedMachine: string | null;
  onSelectMachine: (id: string | null) => void;
  onDragMachine: (id: string, position: [number, number, number]) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
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

      <ProductionHall />

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
          case 'mixer':
            return <MixerMachine key={machine.id} {...commonProps} />;
          default:
            return <GenericEquipment key={machine.id} {...commonProps} />;
        }
      })}

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
                            <div className="font-medium text-sm">{machine.nameAr}</div>
                            <div className="text-xs text-gray-500">{machine.name}</div>
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
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold">الماكينة المحددة</h4>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={deleteMachine}
                      >
                        <Trash2 className="h-4 w-4 ml-1" />
                        حذف
                      </Button>
                    </div>
                    <div className="text-sm space-y-1">
                      <p><strong>الاسم:</strong> {selectedMachineData.nameAr}</p>
                      <p><strong>النوع:</strong> {selectedMachineData.type}</p>
                      <p><strong>الموقع X:</strong> {selectedMachineData.position[0].toFixed(1)}م</p>
                      <p><strong>الموقع Z:</strong> {selectedMachineData.position[2].toFixed(1)}م</p>
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

          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-lg text-sm">
            صالة الإنتاج: {20}م × {50}م | الارتفاع: {6}م-{8}م | البوابة: {9}م
          </div>
        </div>
      </div>
        </main>
      </div>
    </div>
  );
}
