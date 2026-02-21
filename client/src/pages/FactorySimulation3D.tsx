import { useState, Suspense, useEffect, useCallback, useRef } from 'react';
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '../lib/queryClient';
import { useToast } from '../hooks/use-toast';

import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { 
  Eye, Layers, Trash2, RotateCw, Factory, Box, Printer, Scissors, 
  Blend, Package, Move, Maximize2, Building2, Palette,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Ruler, Save, Pencil, Check,
  Users, X, ChevronDown, ChevronUp, Circle
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
  dbId?: string;
  nameAr: string;
  type: 'film' | 'printing' | 'cutting' | 'mixer' | 'pallet' | 'inline_printer';
  attachedTo?: string;
  color: string;
  position: [number, number, number];
  size: [number, number, number];
  customName?: string;
  rotation?: number;
  scale: [number, number, number];
  sectionId?: string;
  screwType?: string;
  capacitySmall?: string;
  capacityMedium?: string;
  capacityLarge?: string;
}

interface ActiveRoll {
  id: number;
  roll_number: string;
  stage: string;
  roll_color: string;
  weight_kg: string;
  film_machine_id: string;
  printing_machine_id: string;
  cutting_machine_id: string;
  production_order_number: string;
  color_name: string;
  customer_name: string;
}

interface DbMachine {
  id: string;
  name: string;
  name_ar: string;
  type: string;
  section_id: string;
  status: string;
  capacity_small_kg_per_hour: string;
  capacity_medium_kg_per_hour: string;
  capacity_large_kg_per_hour: string;
  screw_type: string;
}

interface ProductionUser {
  id: number;
  display_name: string;
  display_name_ar: string;
  full_name: string;
  role_id: number;
  section_id: number;
  role_name: string;
  role_name_ar: string;
  attendance_status: string | null;
  check_in_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  lunch_start_time: string | null;
  lunch_end_time: string | null;
}

interface ProductionOrder {
  id: number;
  production_order_number: string;
  quantity_kg: string;
  produced_quantity_kg: string;
  status: string;
  film_completed: boolean;
  printing_completed: boolean;
  cutting_completed: boolean;
  created_at: string;
  production_start_time: string;
  production_end_time: string;
  order_number: string;
  customer_name: string;
  customer_name_ar: string;
  product_name: string;
  product_name_ar: string;
  color_hex: string;
  color_name_ar: string;
  rolls_count: string;
  total_rolls_weight: string;
}

const MACHINE_CONFIGS: Record<string, { nameAr: string; color: string; icon: typeof Factory }> = {
  film: { nameAr: 'ماكينة فيلم', color: '#2563eb', icon: Factory },
  extruder: { nameAr: 'ماكينة فيلم', color: '#2563eb', icon: Factory },
  printing: { nameAr: 'ماكينة طباعة', color: '#7c3aed', icon: Printer },
  printer: { nameAr: 'ماكينة طباعة', color: '#7c3aed', icon: Printer },
  cutting: { nameAr: 'ماكينة تقطيع', color: '#059669', icon: Scissors },
  cutter: { nameAr: 'ماكينة تقطيع', color: '#059669', icon: Scissors },
  mixer: { nameAr: 'خلاط مواد', color: '#dc2626', icon: Blend },
  pallet: { nameAr: 'بالة خشبية', color: '#92400e', icon: Package },
  inline_printer: { nameAr: 'طابعة متصلة', color: '#8b5cf6', icon: Printer },
};

const SNAP_DISTANCE = 3.5;

function mapDbTypeToLocal(type: string): Machine['type'] {
  const lower = type.toLowerCase();
  if (lower === 'extruder' || lower === 'film') return 'film';
  if (lower === 'printer' || lower === 'printing') return 'printing';
  if (lower === 'cutter' || lower === 'cutting') return 'cutting';
  if (lower === 'mixer') return 'mixer';
  if (lower === 'inline_printer') return 'inline_printer';
  return 'film';
}

function getAttendanceInfo(user: ProductionUser): { color: string; label: string; bgClass: string } {
  const status = user.attendance_status;
  if (!status || status === 'غائب') return { color: '#ef4444', label: 'غائب', bgClass: 'bg-red-500' };
  if (status === 'استراحة غداء' || status === 'استراحة') return { color: '#f97316', label: 'استراحة', bgClass: 'bg-orange-500' };
  if (status === 'حاضر') {
    if (user.break_start_time && !user.break_end_time) return { color: '#f97316', label: 'استراحة', bgClass: 'bg-orange-500' };
    if (user.lunch_start_time && !user.lunch_end_time) return { color: '#f97316', label: 'استراحة غداء', bgClass: 'bg-orange-500' };
    return { color: '#22c55e', label: 'حاضر', bgClass: 'bg-green-500' };
  }
  if (status === 'مغادر') return { color: '#ef4444', label: 'مغادر', bgClass: 'bg-red-500' };
  return { color: '#6b7280', label: status, bgClass: 'bg-gray-500' };
}

function getRoleDepartment(roleId: number): string {
  switch (roleId) {
    case 2: return 'إدارة الإنتاج';
    case 3: return 'الفيلم';
    case 4: return 'الطباعة';
    case 6: return 'التقطيع';
    default: return 'إنتاج';
  }
}

function useDraggable(
  id: string,
  isSelected: boolean,
  onDrag: (id: string, pos: [number, number, number]) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const { camera, gl, controls } = useThree();

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!isSelected) return;
    e.stopPropagation();
    setIsDragging(true);
    if (controls) (controls as any).enabled = false;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    setIsDragging(false);
    if (controls) (controls as any).enabled = true;
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
  const towerHeight = 6;
  return (
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]} scale={machine.scale}>
      {/* Main body / base frame */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[3, 1, 2.2]} />
        <meshStandardMaterial color={machine.color} metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Motor housing */}
      <mesh castShadow position={[0, 0.5, -0.9]}>
        <boxGeometry args={[1.6, 0.7, 0.4]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Motor vent lines */}
      {[-0.4, 0, 0.4].map((x, i) => (
        <mesh key={`vent-${i}`} position={[x, 0.55, -1.12]}>
          <boxGeometry args={[0.05, 0.3, 0.02]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      ))}

      {/* Extruder screw barrel */}
      <mesh castShadow position={[0, 1.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, 2.6, 20]} />
        <meshStandardMaterial color="#64748b" metalness={0.85} roughness={0.15} />
      </mesh>
      {/* Hopper / material feeding basin (iron basin at back) */}
      <group position={[-1.2, 1.6, 0]}>
        {/* Basin back wall */}
        <mesh castShadow position={[0, 0.5, 0]}>
          <boxGeometry args={[0.8, 1.2, 1]} />
          <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.25} transparent opacity={0.85} />
        </mesh>
        {/* Basin front opening - tapered */}
        <mesh castShadow position={[0.35, 0.1, 0]} rotation={[0, 0, 0.3]}>
          <boxGeometry args={[0.15, 0.8, 0.9]} />
          <meshStandardMaterial color="#475569" metalness={0.75} roughness={0.25} />
        </mesh>
        {/* Basin left wall */}
        <mesh castShadow position={[0, 0.5, -0.5]}>
          <boxGeometry args={[0.8, 1.2, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Basin right wall */}
        <mesh castShadow position={[0, 0.5, 0.5]}>
          <boxGeometry args={[0.8, 1.2, 0.08]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Basin back wall */}
        <mesh castShadow position={[-0.4, 0.5, 0]}>
          <boxGeometry args={[0.08, 1.2, 1]} />
          <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* Basin rim / edge */}
        <mesh castShadow position={[0, 1.1, 0]}>
          <boxGeometry args={[0.9, 0.06, 1.1]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>

      {/* Die head - where film exits upward */}
      <mesh castShadow position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.2, 0.35, 0.6, 16]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Tower frame - 4 vertical poles */}
      {[[-0.9, -0.9], [-0.9, 0.9], [0.9, -0.9], [0.9, 0.9]].map((pos, i) => (
        <mesh key={`tower-${i}`} position={[pos[0], towerHeight / 2, pos[1]]}>
          <boxGeometry args={[0.08, towerHeight, 0.08]} />
          <meshStandardMaterial color="#475569" metalness={0.7} />
        </mesh>
      ))}
      {/* Tower cross beams */}
      {[2, 4, 5.5].map((y, i) => (
        <group key={`cross-${i}`}>
          <mesh position={[0, y, -0.9]}>
            <boxGeometry args={[1.8, 0.06, 0.06]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} />
          </mesh>
          <mesh position={[0, y, 0.9]}>
            <boxGeometry args={[1.8, 0.06, 0.06]} />
            <meshStandardMaterial color="#64748b" metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Film bubble - transparent tube going up the tower */}
      <mesh position={[0, 4, 0]}>
        <cylinderGeometry args={[0.5, 0.15, 4, 24, 1, true]} />
        <meshStandardMaterial color="#b0d4f1" transparent opacity={0.15} side={THREE.DoubleSide} />
      </mesh>

      {/* Collapsing frame at top */}
      <mesh castShadow position={[0, towerHeight, 0]}>
        <boxGeometry args={[2.2, 0.12, 2.2]} />
        <meshStandardMaterial color="#334155" metalness={0.6} />
      </mesh>
      {/* Nip rollers at top */}
      <mesh castShadow position={[0, towerHeight - 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 1.8, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh castShadow position={[0, towerHeight - 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.12, 0.12, 1.8, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Front shaft with winding roll */}
      <group position={[1.6, 0.9, 0]}>
        {/* Shaft support frame */}
        <mesh castShadow position={[0, 0.4, -0.8]}>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#475569" metalness={0.6} />
        </mesh>
        <mesh castShadow position={[0, 0.4, 0.8]}>
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial color="#475569" metalness={0.6} />
        </mesh>
        {/* Winding shaft */}
        <mesh castShadow position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Roll of film on shaft */}
        <mesh castShadow position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 1.2, 24]} />
          <meshStandardMaterial color="#e0e7ef" transparent opacity={0.6} roughness={0.4} />
        </mesh>
        {/* Roll core */}
        <mesh castShadow position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 1.25, 12]} />
          <meshStandardMaterial color="#78716c" metalness={0.5} />
        </mesh>
      </group>

      {/* Control panel */}
      <mesh castShadow position={[0.5, 1.2, -1.15]}>
        <boxGeometry args={[0.6, 0.5, 0.1]} />
        <meshStandardMaterial color="#1e293b" metalness={0.3} />
      </mesh>
      {/* Control panel screen */}
      <mesh position={[0.5, 1.25, -1.19]}>
        <boxGeometry args={[0.4, 0.25, 0.01]} />
        <meshStandardMaterial color="#0f172a" emissive="#22d3ee" emissiveIntensity={0.15} />
      </mesh>

      {/* Machine legs */}
      {[[-1.1, -0.85], [-1.1, 0.85], [1.1, -0.85], [1.1, 0.85]].map((pos, i) => (
        <mesh key={`leg-${i}`} castShadow position={[pos[0], -0.02, pos[1]]}>
          <boxGeometry args={[0.2, 0.04, 0.2]} />
          <meshStandardMaterial color="#1e293b" metalness={0.5} />
        </mesh>
      ))}

      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[3.2, 3.5, 32]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function InlinePrinterMachine({ machine, isSelected }: { machine: Machine; isSelected: boolean }) {
  return (
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]} scale={machine.scale}>
      {/* Main body */}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2.2, 1, 1.6]} />
        <meshStandardMaterial color={machine.color} metalness={0.65} roughness={0.3} />
      </mesh>
      {/* Ink tray / pan */}
      <mesh castShadow position={[0, 1.1, 0]}>
        <boxGeometry args={[1.8, 0.15, 1.2]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Printing rollers */}
      {[-0.4, 0.4].map((x, i) => (
        <mesh key={`roller-${i}`} castShadow position={[x, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 1.2, 16]} />
          <meshStandardMaterial color={i === 0 ? '#ef4444' : '#3b82f6'} metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      {/* Pressure roller on top */}
      <mesh castShadow position={[0, 1.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 1.3, 12]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Side frames */}
      <mesh castShadow position={[0, 1.2, -0.75]}>
        <boxGeometry args={[2.4, 1.8, 0.08]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 1.2, 0.75]}>
        <boxGeometry args={[2.4, 1.8, 0.08]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Input guide roller */}
      <mesh castShadow position={[-1.2, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.0, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      {/* Output guide roller */}
      <mesh castShadow position={[1.2, 1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 1.0, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} />
      </mesh>
      {/* Small control panel */}
      <mesh castShadow position={[-0.9, 1.6, -0.8]}>
        <boxGeometry args={[0.4, 0.35, 0.08]} />
        <meshStandardMaterial color="#1e293b" emissive="#10b981" emissiveIntensity={0.15} />
      </mesh>
      {/* Ink containers on side */}
      {[-0.3, 0.3].map((x, i) => (
        <mesh key={`ink-${i}`} castShadow position={[x, 0.3, 0.9]}>
          <cylinderGeometry args={[0.12, 0.12, 0.4, 8]} />
          <meshStandardMaterial color={i === 0 ? '#dc2626' : '#2563eb'} metalness={0.3} />
        </mesh>
      ))}
      {/* Snap indicator - connection points */}
      <mesh position={[-1.3, 0.5, 0]}>
        <boxGeometry args={[0.15, 0.6, 0.8]} />
        <meshStandardMaterial color={machine.color} metalness={0.7} roughness={0.3} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2, 2.3, 32]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.8} />
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
      <mesh position={[0, WALL_HEIGHT + 0.5, 0]}>
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

function RollMesh({ roll, position }: { roll: ActiveRoll; position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.8, 32]} />
        <meshStandardMaterial color={roll.roll_color || '#808080'} roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.85, 16]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} />
      </mesh>
      <Html position={[0, 0.8, 0]} center>
        <div className="bg-black/80 text-white px-1.5 py-0.5 rounded text-[7px] font-mono pointer-events-none whitespace-nowrap border border-white/10">
          {roll.roll_number} • {parseFloat(roll.weight_kg).toFixed(1)}kg
        </div>
      </Html>
    </group>
  );
}

function DraggableGroup({ machine, isSelected, onSelect, onDrag, rolls }: { machine: Machine; isSelected: boolean; onSelect: () => void; onDrag: (id: string, pos: [number, number, number]) => void; rolls: ActiveRoll[] }) {
  const { handlePointerDown, handlePointerUp, handlePointerMove } = useDraggable(machine.id, isSelected, onDrag);
  
  const machineRolls = rolls.filter(r => {
    const dbId = machine.dbId || machine.id;
    return r.film_machine_id === dbId || r.printing_machine_id === dbId || r.cutting_machine_id === dbId;
  });

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
      {machine.type === 'inline_printer' && <InlinePrinterMachine machine={machine} isSelected={isSelected} />}
      {machine.type === 'inline_printer' && machine.attachedTo && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 1.9, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.6} />
        </mesh>
      )}
      <Html position={[0, machine.type === 'film' ? 7 * machine.scale[1] : machine.type === 'inline_printer' ? 2.8 * machine.scale[1] : 3.5 * machine.scale[1], 0]} center>
        <div className="bg-black/85 text-white px-2.5 py-1 rounded-md text-[9px] font-bold border border-white/20 shadow-xl pointer-events-none whitespace-nowrap backdrop-blur-sm">
          {machine.customName || machine.nameAr}
          {machine.type === 'inline_printer' && machine.attachedTo && (
            <span className="mr-1.5 bg-green-500/80 text-white px-1 rounded text-[7px]">متصلة</span>
          )}
          {machineRolls.length > 0 && (
            <span className="mr-1.5 bg-emerald-500/80 text-white px-1 rounded text-[7px]">{machineRolls.length}</span>
          )}
        </div>
      </Html>

      {machineRolls.slice(0, 6).map((roll, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        return (
          <RollMesh 
            key={roll.id} 
            roll={roll} 
            position={[(col - 1) * 1.2, 0.4, 3 + row * 1.4]} 
          />
        );
      })}
      {machineRolls.length > 6 && (
        <Html position={[0, 1.2, 3 + 2 * 1.4]} center>
          <div className="bg-amber-500/90 text-black px-1.5 py-0.5 rounded text-[8px] font-bold pointer-events-none whitespace-nowrap">
            +{machineRolls.length - 6} رول
          </div>
        </Html>
      )}
    </group>
  );
}

function MachineDetailPanel({ machine, onClose }: { machine: Machine; onClose: () => void }) {
  const dbId = machine.dbId || machine.id;
  
  const { data: orders = [], isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/factory-3d/machine-orders", dbId],
    enabled: !!dbId,
  });

  const { data: stats } = useQuery<any>({
    queryKey: ["/api/factory-3d/machine-stats", dbId],
    enabled: !!dbId,
  });

  const statusMap: Record<string, { label: string; cls: string }> = {
    pending: { label: 'قيد الانتظار', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
    in_progress: { label: 'قيد التنفيذ', cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    completed: { label: 'مكتمل', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
    cancelled: { label: 'ملغي', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
  };

  return (
    <Card className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-white shadow-2xl w-72 max-h-[70vh] overflow-hidden flex flex-col">
      <CardContent className="p-3 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: machine.color }} />
            <span className="text-sm font-bold text-slate-100">{machine.customName || machine.nameAr}</span>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose} className="w-6 h-6 text-slate-400 hover:text-white">
            <X size={14} />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-800/60 rounded-md p-2 border border-slate-700/30">
            <div className="text-[8px] text-slate-500">المعرف</div>
            <div className="text-[11px] font-mono text-slate-300">{dbId}</div>
          </div>
          <div className="bg-slate-800/60 rounded-md p-2 border border-slate-700/30">
            <div className="text-[8px] text-slate-500">النوع</div>
            <div className="text-[11px] text-slate-300">{MACHINE_CONFIGS[machine.type]?.nameAr || machine.type}</div>
          </div>
          {machine.screwType && (
            <div className="bg-slate-800/60 rounded-md p-2 border border-slate-700/30">
              <div className="text-[8px] text-slate-500">نوع البرغي</div>
              <div className="text-[11px] text-slate-300">{machine.screwType}</div>
            </div>
          )}
          {machine.sectionId && (
            <div className="bg-slate-800/60 rounded-md p-2 border border-slate-700/30">
              <div className="text-[8px] text-slate-500">القسم</div>
              <div className="text-[11px] text-slate-300">{machine.sectionId}</div>
            </div>
          )}
        </div>

        {stats?.todayStats && (
          <div className="mb-3">
            <div className="text-[9px] font-bold text-slate-400 mb-1.5">إحصائيات اليوم</div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="bg-blue-500/10 rounded p-1.5 text-center border border-blue-500/20">
                <div className="text-[14px] font-bold text-blue-400">{stats.todayStats.rolls_count || 0}</div>
                <div className="text-[7px] text-blue-300/60">رول</div>
              </div>
              <div className="bg-emerald-500/10 rounded p-1.5 text-center border border-emerald-500/20">
                <div className="text-[14px] font-bold text-emerald-400">{parseFloat(stats.todayStats.total_weight_kg || 0).toFixed(0)}</div>
                <div className="text-[7px] text-emerald-300/60">كجم</div>
              </div>
              <div className="bg-purple-500/10 rounded p-1.5 text-center border border-purple-500/20">
                <div className="text-[14px] font-bold text-purple-400">{stats.todayStats.completed_rolls || 0}</div>
                <div className="text-[7px] text-purple-300/60">مكتمل</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="text-[9px] font-bold text-slate-400 mb-1.5">آخر 5 أوامر إنتاج</div>
          {isLoading ? (
            <div className="text-[10px] text-slate-500 text-center py-4">جاري التحميل...</div>
          ) : orders.length === 0 ? (
            <div className="text-[10px] text-slate-500 text-center py-4">لا توجد أوامر إنتاج</div>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => {
                const st = statusMap[order.status] || { label: order.status, cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
                return (
                  <div key={order.id} className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-slate-200 font-mono">{order.production_order_number}</span>
                      <Badge className={`text-[7px] h-4 px-1.5 border ${st.cls}`}>{st.label}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: order.color_hex }} />
                      <span className="text-[9px] text-slate-400">{order.customer_name_ar || order.customer_name}</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px] text-slate-500">
                      <span>{order.product_name_ar || order.product_name}</span>
                      <span className="font-mono">{parseFloat(order.quantity_kg).toFixed(0)} كجم</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[8px]">
                      <span className="text-slate-500">{order.rolls_count} رول</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-slate-500">{parseFloat(order.total_rolls_weight || '0').toFixed(0)} كجم منتج</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {order.film_completed && <Badge className="text-[6px] h-3 px-1 bg-blue-500/20 text-blue-400 border-blue-500/30">فيلم ✓</Badge>}
                      {order.printing_completed && <Badge className="text-[6px] h-3 px-1 bg-purple-500/20 text-purple-400 border-purple-500/30">طباعة ✓</Badge>}
                      {order.cutting_completed && <Badge className="text-[6px] h-3 px-1 bg-green-500/20 text-green-400 border-green-500/30">تقطيع ✓</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductionStaffPanel({ users }: { users: ProductionUser[] }) {
  const [expanded, setExpanded] = useState(true);
  const [selectedDept, setSelectedDept] = useState<number | null>(null);

  const departments = [
    { roleId: 2, label: 'إدارة الإنتاج', color: '#f59e0b' },
    { roleId: 3, label: 'الفيلم', color: '#2563eb' },
    { roleId: 4, label: 'الطباعة', color: '#7c3aed' },
    { roleId: 6, label: 'التقطيع', color: '#059669' },
  ];

  const filteredUsers = selectedDept ? users.filter(u => u.role_id === selectedDept) : users;
  const presentCount = users.filter(u => {
    const info = getAttendanceInfo(u);
    return info.label === 'حاضر';
  }).length;
  const breakCount = users.filter(u => {
    const info = getAttendanceInfo(u);
    return info.label === 'استراحة' || info.label === 'استراحة غداء';
  }).length;

  return (
    <Card className="bg-slate-900/95 backdrop-blur-xl border-slate-700/50 text-white shadow-2xl">
      <CardContent className="p-3">
        <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-2">
            <Users size={13} className="text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-300">طاقم الإنتاج</span>
            <span className="text-[9px] text-slate-500">({users.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Circle size={6} className="text-green-500 fill-green-500" />
              <span className="text-[8px] text-green-400">{presentCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle size={6} className="text-orange-500 fill-orange-500" />
              <span className="text-[8px] text-orange-400">{breakCount}</span>
            </div>
            <div className="flex items-center gap-1">
              <Circle size={6} className="text-red-500 fill-red-500" />
              <span className="text-[8px] text-red-400">{users.length - presentCount - breakCount}</span>
            </div>
            {expanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
          </div>
        </button>

        {expanded && (
          <>
            <div className="flex gap-1 mb-2 flex-wrap">
              <button
                onClick={() => setSelectedDept(null)}
                className={`px-2 py-0.5 rounded text-[8px] font-medium transition-all ${!selectedDept ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:bg-slate-700/60'}`}
              >
                الكل
              </button>
              {departments.map(dept => {
                const count = users.filter(u => u.role_id === dept.roleId).length;
                return (
                  <button
                    key={dept.roleId}
                    onClick={() => setSelectedDept(selectedDept === dept.roleId ? null : dept.roleId)}
                    className={`px-2 py-0.5 rounded text-[8px] font-medium transition-all ${selectedDept === dept.roleId ? 'text-white border' : 'bg-slate-800/60 text-slate-400 border border-slate-700/30 hover:bg-slate-700/60'}`}
                    style={selectedDept === dept.roleId ? { backgroundColor: dept.color + '33', borderColor: dept.color + '50', color: dept.color } : {}}
                  >
                    {dept.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="max-h-48 overflow-y-auto scrollbar-thin space-y-1">
              {filteredUsers.map(user => {
                const info = getAttendanceInfo(user);
                return (
                  <div key={user.id} className="flex items-center justify-between px-2 py-1 bg-slate-800/40 rounded border border-slate-700/20">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${info.bgClass}`} />
                      <span className="text-[9px] text-slate-300 truncate">{user.display_name_ar || user.display_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[7px] text-slate-500">{getRoleDepartment(user.role_id)}</span>
                      <Badge className={`text-[6px] h-3.5 px-1 border ${info.label === 'حاضر' ? 'bg-green-500/20 text-green-400 border-green-500/30' : info.label === 'غائب' || info.label === 'مغادر' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-orange-500/20 text-orange-400 border-orange-500/30'}`}>
                        {info.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function FactorySimulation3D() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | 'top'>('3d');
  const [showStructure, setShowStructure] = useState(false);
  const [showScalePanel, setShowScalePanel] = useState(false);
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [dbMachinesLoaded, setDbMachinesLoaded] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: activeRolls = [] } = useQuery<ActiveRoll[]>({
    queryKey: ['/api/factory-3d/active-rolls'],
    refetchInterval: 5000,
  });

  const { data: savedLayout } = useQuery<any>({
    queryKey: ['/api/factory-3d/layout'],
  });

  const { data: dbMachines = [] } = useQuery<DbMachine[]>({
    queryKey: ['/api/factory-3d/machines'],
  });

  const { data: productionUsers = [] } = useQuery<ProductionUser[]>({
    queryKey: ['/api/factory-3d/production-users'],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (dbMachinesLoaded) return;

    if (savedLayout?.layout_data && Array.isArray(savedLayout.layout_data) && savedLayout.layout_data.length > 0) {
      const layoutMachines = savedLayout.layout_data as Machine[];
      if (dbMachines.length > 0) {
        const layoutIds = new Set(layoutMachines.map(m => m.dbId || m.id));
        const newDbMachines = dbMachines
          .filter(db => !layoutIds.has(db.id))
          .map((db, idx): Machine => {
            const machineType = mapDbTypeToLocal(db.type);
            const config = MACHINE_CONFIGS[machineType] || MACHINE_CONFIGS.film;
            return {
              id: `db-${db.id}`,
              dbId: db.id,
              nameAr: db.name_ar || db.name,
              type: machineType,
              color: config.color,
              position: [Math.random() * 12 - 6, 0, -20 + idx * 4],
              size: [2, 2, 2],
              scale: [1, 1, 1],
              sectionId: db.section_id,
              screwType: db.screw_type,
              capacitySmall: db.capacity_small_kg_per_hour,
              capacityMedium: db.capacity_medium_kg_per_hour,
              capacityLarge: db.capacity_large_kg_per_hour,
            };
          });
        setMachines([...layoutMachines, ...newDbMachines]);
      } else {
        setMachines(layoutMachines);
      }
      setHasUnsavedChanges(false);
      setDbMachinesLoaded(true);
    } else if (dbMachines.length > 0) {
      const sectionGroups: Record<string, DbMachine[]> = {};
      dbMachines.forEach(db => {
        const key = db.section_id || 'other';
        if (!sectionGroups[key]) sectionGroups[key] = [];
        sectionGroups[key].push(db);
      });

      const sectionZones: Record<string, { startX: number; startZ: number }> = {
        SEC03: { startX: -7, startZ: -18 },
        SEC04: { startX: -7, startZ: 0 },
        SEC05: { startX: -7, startZ: 12 },
      };

      const generatedMachines: Machine[] = [];
      Object.entries(sectionGroups).forEach(([sectionId, sectionMachines]) => {
        const zone = sectionZones[sectionId] || { startX: 0, startZ: 0 };
        sectionMachines.forEach((db, idx) => {
          const machineType = mapDbTypeToLocal(db.type);
          const config = MACHINE_CONFIGS[machineType] || MACHINE_CONFIGS.film;
          const col = idx % 3;
          const row = Math.floor(idx / 3);
          generatedMachines.push({
            id: `db-${db.id}`,
            dbId: db.id,
            nameAr: db.name_ar || db.name,
            type: machineType,
            color: config.color,
            position: [zone.startX + col * 5, 0, zone.startZ + row * 5],
            size: [2, 2, 2],
            scale: [1, 1, 1],
            sectionId: db.section_id,
            screwType: db.screw_type,
            capacitySmall: db.capacity_small_kg_per_hour,
            capacityMedium: db.capacity_medium_kg_per_hour,
            capacityLarge: db.capacity_large_kg_per_hour,
          });
        });
      });
      setMachines(generatedMachines);
      setHasUnsavedChanges(true);
      setDbMachinesLoaded(true);
    }
  }, [savedLayout, dbMachines, dbMachinesLoaded]);

  const saveLayoutMutation = useMutation({
    mutationFn: async (data: Machine[]) => {
      const res = await apiRequest('/api/factory-3d/layout', { method: 'POST', body: JSON.stringify({ machines: data }) });
      return res.json();
    },
    onSuccess: () => {
      setHasUnsavedChanges(false);
      toast({ title: 'تم الحفظ', description: 'تم حفظ تخطيط المصنع بنجاح' });
    },
    onError: () => {
      toast({ title: 'خطأ', description: 'فشل حفظ التخطيط', variant: 'destructive' });
    },
  });

  const selectedMachine = machines.find(m => m.id === selectedId);

  useEffect(() => {
    setEditingName(false);
    setShowScalePanel(false);
    setShowColorPanel(false);
    if (selectedId) {
      setShowDetailPanel(true);
    }
  }, [selectedId]);

  const updateMachines = useCallback((updater: Machine[] | ((prev: Machine[]) => Machine[])) => {
    setMachines(updater);
    setHasUnsavedChanges(true);
  }, []);

  const moveMachine = useCallback((dx: number, dz: number) => {
    if (!selectedId) return;
    updateMachines(prev => prev.map(m => {
      if (m.id !== selectedId) return m;
      const newX = Math.max(-HALL_WIDTH / 2 + 2, Math.min(HALL_WIDTH / 2 - 2, m.position[0] + dx));
      const newZ = Math.max(-HALL_LENGTH / 2 + 2, Math.min(HALL_LENGTH / 2 - 2, m.position[2] + dz));
      return { ...m, position: [newX, 0, newZ] as [number, number, number] };
    }));
  }, [selectedId, updateMachines]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedId) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); moveMachine(0, -MOVE_STEP); break;
        case 'ArrowDown': e.preventDefault(); moveMachine(0, MOVE_STEP); break;
        case 'ArrowLeft': e.preventDefault(); moveMachine(-MOVE_STEP, 0); break;
        case 'ArrowRight': e.preventDefault(); moveMachine(MOVE_STEP, 0); break;
        case 'Delete': case 'Backspace':
          e.preventDefault();
          updateMachines(prev => prev.filter(m => m.id !== selectedId));
          setSelectedId(null);
          break;
        case 'r': case 'R':
          e.preventDefault();
          updateMachines(prev => prev.map(m => m.id === selectedId ? { ...m, rotation: ((m.rotation || 0) + 45) % 360 } : m));
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedId(null);
          setShowDetailPanel(false);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, moveMachine, updateMachines]);

  const addMachine = (type: Machine['type']) => {
    const config = MACHINE_CONFIGS[type] || MACHINE_CONFIGS.film;
    const newMachine: Machine = {
      id: `${type}-${Date.now()}`,
      nameAr: config.nameAr,
      type,
      color: config.color,
      position: [Math.random() * 6 - 3, 0, Math.random() * 6 - 3],
      size: [2, 2, 2],
      scale: [1, 1, 1],
    };
    updateMachines([...machines, newMachine]);
    setSelectedId(newMachine.id);
  };

  const handleDrag = (id: string, pos: [number, number, number]) => {
    const clampedX = Math.max(-HALL_WIDTH / 2 + 2, Math.min(HALL_WIDTH / 2 - 2, pos[0]));
    const clampedZ = Math.max(-HALL_LENGTH / 2 + 2, Math.min(HALL_LENGTH / 2 - 2, pos[2]));

    updateMachines(prev => {
      const draggedMachine = prev.find(m => m.id === id);
      if (!draggedMachine) return prev;

      if (draggedMachine.type === 'inline_printer') {
        const filmMachines = prev.filter(m => m.type === 'film' && m.id !== id);
        let snappedTo: string | undefined;
        let finalX = clampedX;
        let finalZ = clampedZ;
        let finalRotation = draggedMachine.rotation || 0;

        for (const fm of filmMachines) {
          const dx = clampedX - fm.position[0];
          const dz = clampedZ - fm.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < SNAP_DISTANCE) {
            const fmRotRad = ((fm.rotation || 0) * Math.PI) / 180;
            const offsetX = Math.cos(fmRotRad) * 3.2;
            const offsetZ = -Math.sin(fmRotRad) * 3.2;
            finalX = fm.position[0] + offsetX;
            finalZ = fm.position[2] + offsetZ;
            finalRotation = fm.rotation || 0;
            snappedTo = fm.id;
            break;
          }
        }

        return prev.map(m =>
          m.id === id
            ? { ...m, position: [finalX, 0, finalZ] as [number, number, number], attachedTo: snappedTo, rotation: snappedTo ? finalRotation : m.rotation }
            : m
        );
      }

      return prev.map(m => {
        if (m.id === id) {
          return { ...m, position: [clampedX, 0, clampedZ] as [number, number, number] };
        }
        if (m.type === 'inline_printer' && m.attachedTo === id) {
          const fmRotRad = ((draggedMachine.rotation || 0) * Math.PI) / 180;
          const offsetX = Math.cos(fmRotRad) * 3.2;
          const offsetZ = -Math.sin(fmRotRad) * 3.2;
          return { ...m, position: [clampedX + offsetX, 0, clampedZ + offsetZ] as [number, number, number] };
        }
        return m;
      });
    });
  };

  const rotateMachine = () => {
    if (!selectedId) return;
    updateMachines(prev => {
      const rotatedMachine = prev.find(m => m.id === selectedId);
      if (!rotatedMachine) return prev;
      const newRotation = ((rotatedMachine.rotation || 0) + 45) % 360;

      return prev.map(m => {
        if (m.id === selectedId) {
          return { ...m, rotation: newRotation };
        }
        if (m.type === 'inline_printer' && m.attachedTo === selectedId) {
          const fmRotRad = (newRotation * Math.PI) / 180;
          const offsetX = Math.cos(fmRotRad) * 3.2;
          const offsetZ = -Math.sin(fmRotRad) * 3.2;
          return {
            ...m,
            rotation: newRotation,
            position: [rotatedMachine.position[0] + offsetX, 0, rotatedMachine.position[2] + offsetZ] as [number, number, number],
          };
        }
        return m;
      });
    });
  };

  const deleteMachine = () => {
    if (!selectedId) return;
    updateMachines(machines.filter(m => m.id !== selectedId).map(m =>
      m.type === 'inline_printer' && m.attachedTo === selectedId ? { ...m, attachedTo: undefined } : m
    ));
    setSelectedId(null);
  };

  const updateMachineName = () => {
    if (!selectedId || !nameInput.trim()) return;
    updateMachines(prev => prev.map(m => m.id === selectedId ? { ...m, customName: nameInput.trim() } : m));
    setEditingName(false);
  };

  const startEditingName = () => {
    if (!selectedMachine) return;
    setNameInput(selectedMachine.customName || selectedMachine.nameAr);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const updateScale = (axis: 0 | 1 | 2, value: number) => {
    if (!selectedId) return;
    updateMachines(prev => prev.map(m => {
      if (m.id !== selectedId) return m;
      const newScale = [...m.scale] as [number, number, number];
      newScale[axis] = value;
      return { ...m, scale: newScale };
    }));
  };

  const updateColor = (color: string) => {
    if (!selectedId) return;
    updateMachines(prev => prev.map(m => m.id === selectedId ? { ...m, color } : m));
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
                  {(['film', 'printing', 'cutting', 'mixer', 'pallet', 'inline_printer'] as Machine['type'][]).map((type) => {
                    const config = MACHINE_CONFIGS[type];
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
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: selectedMachine.color }} />
                      {editingName ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Input
                            ref={nameInputRef}
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') updateMachineName(); if (e.key === 'Escape') setEditingName(false); }}
                            className="h-5 text-[10px] bg-slate-800 border-slate-600 text-white px-1.5 py-0"
                          />
                          <Button size="icon" variant="ghost" onClick={updateMachineName} className="w-5 h-5 text-green-400 hover:text-green-300 shrink-0">
                            <Check size={10} />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-slate-200 truncate">{selectedMachine.customName || selectedMachine.nameAr}</span>
                          <Button size="icon" variant="ghost" onClick={startEditingName} className="w-5 h-5 text-slate-500 hover:text-slate-300 shrink-0">
                            <Pencil size={9} />
                          </Button>
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4 border-slate-600 text-slate-400 shrink-0">
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
                        <Slider value={[selectedMachine.scale[0]]} min={0.3} max={3} step={0.1} onValueChange={([v]) => updateScale(0, v)} className="h-4" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[9px] text-slate-400">الارتفاع (Y)</Label>
                          <span className="text-[9px] text-slate-500">{selectedMachine.scale[1].toFixed(1)}x</span>
                        </div>
                        <Slider value={[selectedMachine.scale[1]]} min={0.3} max={3} step={0.1} onValueChange={([v]) => updateScale(1, v)} className="h-4" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[9px] text-slate-400">الطول (Z)</Label>
                          <span className="text-[9px] text-slate-500">{selectedMachine.scale[2].toFixed(1)}x</span>
                        </div>
                        <Slider value={[selectedMachine.scale[2]]} min={0.3} max={3} step={0.1} onValueChange={([v]) => updateScale(2, v)} className="h-4" />
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => {
                        if (!selectedId) return;
                        updateMachines(prev => prev.map(m => m.id === selectedId ? { ...m, scale: [1, 1, 1] as [number, number, number] } : m));
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

            {productionUsers.length > 0 && (
              <ProductionStaffPanel users={productionUsers} />
            )}
          </div>

          {showDetailPanel && selectedMachine && (
            <div className="absolute top-3 left-3 z-20 lg:left-auto lg:right-[240px]">
              <MachineDetailPanel 
                machine={selectedMachine} 
                onClose={() => setShowDetailPanel(false)} 
              />
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2">
            {hasUnsavedChanges && (
              <Button
                size="sm"
                onClick={() => saveLayoutMutation.mutate(machines)}
                disabled={saveLayoutMutation.isPending}
                className="h-8 px-4 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 shadow-xl backdrop-blur-xl"
              >
                <Save size={13} className="ml-1.5" />
                {saveLayoutMutation.isPending ? 'جاري الحفظ...' : 'حفظ التخطيط'}
              </Button>
            )}
            <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-lg px-3 py-2 flex items-center gap-3 shadow-xl">
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Factory size={12} className="text-blue-400" />
                <span>{machines.length} ماكينة</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Box size={12} className="text-amber-400" />
                <span>{activeRolls.length} رول نشط</span>
              </div>
              <div className="w-px h-4 bg-slate-700" />
              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                <Users size={12} className="text-cyan-400" />
                <span>{productionUsers.filter(u => getAttendanceInfo(u).label === 'حاضر').length}/{productionUsers.length}</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    size="icon" variant="secondary" 
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
                    size="icon" variant="secondary" 
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
                    size="icon" variant="secondary"
                    onClick={() => { setSelectedId(null); setShowDetailPanel(false); }}
                    className="w-9 h-9 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 hover:bg-slate-800 shadow-xl"
                  >
                    <Maximize2 size={14} className="text-slate-300" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">إلغاء التحديد</TooltipContent>
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

          <Canvas shadows className="!bg-transparent" onPointerMissed={() => { setSelectedId(null); setShowDetailPanel(false); }}>
            <Suspense fallback={null}>
              <PerspectiveCamera 
                makeDefault 
                position={viewMode === '3d' ? [18, 16, 18] : [0, 45, 0.1]} 
                fov={viewMode === '3d' ? 50 : 35}
              />
              <OrbitControls 
                makeDefault
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
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow onClick={(e) => { e.stopPropagation(); setSelectedId(null); setShowDetailPanel(false); }}>
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
                    rolls={activeRolls}
                  />
                ))}
                
                <ContactShadows opacity={0.35} scale={60} blur={2} far={15} position={[0, 0, 0]} />
              </group>
            </Suspense>
          </Canvas>
        </main>
      </div>
    </div>
  );
}
