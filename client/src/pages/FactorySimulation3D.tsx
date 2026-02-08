import { useState, Suspense } from 'react';
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
import { 
  Eye, Layers, Trash2, RotateCw, Factory, Box, Printer, Scissors, 
  Blend, Package, Move, Maximize2
} from 'lucide-react';

const HALL_WIDTH = 20;
const HALL_LENGTH = 50;

interface Machine {
  id: string;
  nameAr: string;
  type: 'film' | 'printing' | 'cutting' | 'mixer' | 'pallet';
  color: string;
  position: [number, number, number];
  size: [number, number, number];
  customName?: string;
  rotation?: number;
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
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]}>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[2.5, 0.8, 1.8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
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
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]}>
      <mesh castShadow position={[0, 0.6, 0]}>
        <boxGeometry args={[3.5, 1.2, 2]} />
        <meshStandardMaterial color="#312e81" metalness={0.6} roughness={0.3} />
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
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]}>
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[2.8, 1, 1.8]} />
        <meshStandardMaterial color="#064e3b" metalness={0.6} roughness={0.3} />
      </mesh>
      <mesh castShadow position={[0, 1.5, 0]} rotation={[0, 0, 0]}>
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
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]}>
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
    <group rotation={[0, (machine.rotation || 0) * Math.PI / 180, 0]}>
      {[-0.6, 0, 0.6].map((x, i) => (
        <mesh key={`top-${i}`} position={[x, 0.15, 0]} castShadow>
          <boxGeometry args={[0.2, 0.06, 1.5]} />
          <meshStandardMaterial color="#a16207" roughness={0.8} />
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

function HallWalls() {
  const wallHeight = 6;
  const wallThickness = 0.15;
  const wallColor = "#e2e8f0";
  const wallOpacity = 0.15;

  return (
    <group>
      <mesh position={[HALL_WIDTH / 2, wallHeight / 2, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, HALL_LENGTH]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} />
      </mesh>
      <mesh position={[-HALL_WIDTH / 2, wallHeight / 2, 0]}>
        <boxGeometry args={[wallThickness, wallHeight, HALL_LENGTH]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} />
      </mesh>
      <mesh position={[0, wallHeight / 2, HALL_LENGTH / 2]}>
        <boxGeometry args={[HALL_WIDTH, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} />
      </mesh>
      <mesh position={[0, wallHeight / 2, -HALL_LENGTH / 2]}>
        <boxGeometry args={[HALL_WIDTH, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} transparent opacity={wallOpacity} />
      </mesh>
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
      <Html position={[0, machine.type === 'film' ? 6 : 3.5, 0]} center>
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

  const { data: activeRolls = [] } = useQuery<ActiveRoll[]>({
    queryKey: ['/api/factory-3d/active-rolls'],
    refetchInterval: 5000,
  });

  const selectedMachine = machines.find(m => m.id === selectedId);

  const addMachine = (type: Machine['type']) => {
    const config = MACHINE_CONFIGS[type];
    const newMachine: Machine = {
      id: `${type}-${Date.now()}`,
      nameAr: config.nameAr,
      type,
      color: config.color,
      position: [Math.random() * 6 - 3, 0, Math.random() * 6 - 3],
      size: [2, 2, 2],
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

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden font-sans" dir="rtl">
      <Header />
      <div className="flex-1 flex relative">
        <Sidebar />
        <main className="flex-1 relative bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 lg:mr-64">
          
          <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 w-56">
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
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedMachine.color }} />
                      <span className="text-[11px] font-bold text-slate-200">{selectedMachine.nameAr}</span>
                    </div>
                    <Badge variant="outline" className="text-[8px] h-4 border-slate-600 text-slate-400">
                      {selectedMachine.rotation || 0}°
                    </Badge>
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={rotateMachine} className="flex-1 text-[9px] h-7 bg-slate-800/60 border-slate-700/50 hover:bg-slate-700 text-slate-300">
                      <RotateCw size={10} className="ml-1" /> تدوير
                    </Button>
                    <Button size="sm" variant="destructive" onClick={deleteMachine} className="flex-1 text-[9px] h-7">
                      <Trash2 size={10} className="ml-1" /> حذف
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[8px] text-slate-500">
                    <Move size={8} />
                    <span>اضغط واسحب لتحريك الماكينة</span>
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

          <Canvas shadows className="!bg-transparent">
            <Suspense fallback={null}>
              <PerspectiveCamera 
                makeDefault 
                position={viewMode === '3d' ? [18, 16, 18] : [0, 45, 0.1]} 
                fov={viewMode === '3d' ? 50 : 35}
              />
              <OrbitControls 
                enableRotate={viewMode === '3d' && !selectedId} 
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
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                  <planeGeometry args={[HALL_WIDTH, HALL_LENGTH]} />
                  <meshStandardMaterial color="#e8edf3" roughness={0.8} />
                </mesh>
                
                <gridHelper args={[HALL_LENGTH, 50, "#b0bec5", "#cfd8dc"]} position={[0, 0.005, 0]} />
                
                <HallWalls />
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
