import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Cog, Printer, Scissors, CheckCircle, AlertTriangle, XCircle, Activity } from "lucide-react";

interface Machine {
  id: string;
  name: string;
  name_ar?: string;
  type: string;
  section_id?: string;
  status: string;
  capacity_small_kg_per_hour?: number;
  capacity_medium_kg_per_hour?: number;
  capacity_large_kg_per_hour?: number;
}

interface Section {
  id: string;
  name: string;
  name_ar?: string;
}

const getMachineIcon = (type: string) => {
  switch (type) {
    case "extruder":
      return Cog;
    case "printer":
      return Printer;
    case "cutter":
      return Scissors;
    case "quality_check":
      return CheckCircle;
    default:
      return Activity;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return { bg: "#22c55e", border: "#16a34a", text: "white", glow: "0 0 20px rgba(34, 197, 94, 0.5)" };
    case "maintenance":
      return { bg: "#f59e0b", border: "#d97706", text: "white", glow: "0 0 20px rgba(245, 158, 11, 0.5)" };
    case "down":
      return { bg: "#ef4444", border: "#dc2626", text: "white", glow: "0 0 20px rgba(239, 68, 68, 0.5)" };
    default:
      return { bg: "#6b7280", border: "#4b5563", text: "white", glow: "none" };
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <Activity className="w-3 h-3" />;
    case "maintenance":
      return <AlertTriangle className="w-3 h-3" />;
    case "down":
      return <XCircle className="w-3 h-3" />;
    default:
      return null;
  }
};

const getStatusLabel = (status: string, t: any) => {
  switch (status) {
    case "active":
      return t("factory.status.active", "تعمل");
    case "maintenance":
      return t("factory.status.maintenance", "صيانة");
    case "down":
      return t("factory.status.down", "متوقفة");
    default:
      return status;
  }
};

const getTypeLabel = (type: string, t: any) => {
  switch (type) {
    case "extruder":
      return t("factory.type.extruder", "ماكينة فيلم");
    case "printer":
      return t("factory.type.printer", "ماكينة طباعة");
    case "cutter":
      return t("factory.type.cutter", "ماكينة قص");
    case "quality_check":
      return t("factory.type.qualityCheck", "فحص جودة");
    default:
      return type;
  }
};

const sectionPositions: Record<string, { x: number; y: number; width: number; height: number; label: string }> = {
  SEC03: { x: 50, y: 80, width: 280, height: 200, label: "قسم الفيلم" },
  SEC04: { x: 370, y: 80, width: 280, height: 200, label: "قسم الطباعة" },
  SEC05: { x: 690, y: 80, width: 280, height: 200, label: "قسم القص" },
};

export default function FactoryFloorMap() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const { data: machines = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const sectionsMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  const machinesBySection = useMemo(() => {
    const grouped: Record<string, Machine[]> = {};
    machines.forEach((m) => {
      const sectionId = m.section_id || "other";
      if (!grouped[sectionId]) grouped[sectionId] = [];
      grouped[sectionId].push(m);
    });
    return grouped;
  }, [machines]);

  const stats = useMemo(() => {
    const active = machines.filter((m) => m.status === "active").length;
    const maintenance = machines.filter((m) => m.status === "maintenance").length;
    const down = machines.filter((m) => m.status === "down").length;
    return { total: machines.length, active, maintenance, down };
  }, [machines]);

  if (machinesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.total}</div>
            <div className="text-sm text-blue-600 dark:text-blue-300">{t("factory.totalMachines", "إجمالي الماكينات")}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.active}</div>
            <div className="text-sm text-green-600 dark:text-green-300">{t("factory.activeMachines", "تعمل")}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{stats.maintenance}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-300">{t("factory.maintenanceMachines", "صيانة")}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">{stats.down}</div>
            <div className="text-sm text-red-600 dark:text-red-300">{t("factory.downMachines", "متوقفة")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {t("factory.floorMap", "خريطة أرضية المصنع")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 overflow-x-auto">
            <svg
              viewBox="0 0 1020 380"
              className="w-full min-w-[800px]"
              style={{ minHeight: "350px" }}
            >
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.5" />
                </pattern>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
                </filter>
              </defs>

              <rect width="100%" height="100%" fill="url(#grid)" />

              <text x="510" y="40" textAnchor="middle" className="fill-slate-700 dark:fill-slate-300" style={{ fontSize: "20px", fontWeight: 700 }}>
                {t("factory.productionHall", "صالة الإنتاج")}
              </text>

              {Object.entries(sectionPositions).map(([sectionId, pos]) => {
                const sectionMachines = machinesBySection[sectionId] || [];
                const section = sectionsMap.get(sectionId);
                
                return (
                  <g key={sectionId}>
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={pos.width}
                      height={pos.height}
                      rx="12"
                      fill="white"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      filter="url(#shadow)"
                      className="dark:fill-slate-700"
                    />
                    <text
                      x={pos.x + pos.width / 2}
                      y={pos.y + 25}
                      textAnchor="middle"
                      className="fill-slate-600 dark:fill-slate-300"
                      style={{ fontSize: "14px", fontWeight: 600 }}
                    >
                      {section?.name_ar || pos.label}
                    </text>

                    {sectionMachines.map((machine, idx) => {
                      const cols = 3;
                      const row = Math.floor(idx / cols);
                      const col = idx % cols;
                      const machineX = pos.x + 40 + col * 80;
                      const machineY = pos.y + 55 + row * 70;
                      const statusColor = getStatusColor(machine.status);
                      const Icon = getMachineIcon(machine.type);

                      return (
                        <TooltipProvider key={machine.id}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <g
                                onClick={() => setSelectedMachine(machine)}
                                style={{ cursor: "pointer" }}
                                className="transition-transform hover:scale-110"
                              >
                                <rect
                                  x={machineX - 28}
                                  y={machineY - 28}
                                  width="56"
                                  height="56"
                                  rx="10"
                                  fill={statusColor.bg}
                                  stroke={statusColor.border}
                                  strokeWidth="3"
                                  style={{ filter: statusColor.glow !== "none" ? `drop-shadow(${statusColor.glow})` : undefined }}
                                />
                                <foreignObject x={machineX - 14} y={machineY - 14} width="28" height="28">
                                  <div className="flex items-center justify-center w-full h-full">
                                    <Icon className="w-6 h-6 text-white" />
                                  </div>
                                </foreignObject>
                                <text
                                  x={machineX}
                                  y={machineY + 42}
                                  textAnchor="middle"
                                  className="fill-slate-700 dark:fill-slate-300"
                                  style={{ fontSize: "10px", fontWeight: 600 }}
                                >
                                  {machine.name_ar || machine.name}
                                </text>
                              </g>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="bg-slate-900 text-white p-3">
                              <div className="text-sm font-bold">{machine.name_ar || machine.name}</div>
                              <div className="text-xs opacity-80">{getTypeLabel(machine.type, t)}</div>
                              <div className="flex items-center gap-1 mt-1">
                                {getStatusIcon(machine.status)}
                                <span>{getStatusLabel(machine.status, t)}</span>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </g>
                );
              })}

              <g>
                <rect x="50" y="310" width="920" height="50" rx="8" fill="#1e40af" opacity="0.1" stroke="#1e40af" strokeWidth="1" />
                <text x="510" y="340" textAnchor="middle" className="fill-blue-700 dark:fill-blue-400" style={{ fontSize: "12px", fontWeight: 600 }}>
                  {t("factory.warehouseArea", "منطقة المستودعات والتخزين")}
                </text>
              </g>

              <g>
                <circle cx="80" y="25" r="8" fill="#22c55e" />
                <text x="95" y="30" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: "11px" }}>{t("factory.status.active", "تعمل")}</text>
                <circle cx="160" cy="25" r="8" fill="#f59e0b" />
                <text x="175" y="30" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: "11px" }}>{t("factory.status.maintenance", "صيانة")}</text>
                <circle cx="240" cy="25" r="8" fill="#ef4444" />
                <text x="255" y="30" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: "11px" }}>{t("factory.status.down", "متوقفة")}</text>
              </g>
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Cog className="w-4 h-4 text-slate-600" />
              <span className="text-sm">{t("factory.type.extruder", "فيلم")}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="text-sm">{t("factory.type.printer", "طباعة")}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <Scissors className="w-4 h-4 text-slate-600" />
              <span className="text-sm">{t("factory.type.cutter", "قص")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedMachine} onOpenChange={() => setSelectedMachine(null)}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          {selectedMachine && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {(() => {
                    const Icon = getMachineIcon(selectedMachine.type);
                    const statusColor = getStatusColor(selectedMachine.status);
                    return (
                      <div
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: statusColor.bg }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="text-lg font-bold">{selectedMachine.name_ar || selectedMachine.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedMachine.name}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">{t("factory.machineType", "نوع الماكينة")}</div>
                    <div className="font-semibold">{getTypeLabel(selectedMachine.type, t)}</div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">{t("factory.currentStatus", "الحالة الحالية")}</div>
                    <Badge
                      variant="outline"
                      style={{
                        backgroundColor: getStatusColor(selectedMachine.status).bg,
                        color: "white",
                        border: "none",
                      }}
                    >
                      {getStatusIcon(selectedMachine.status)}
                      <span className="mr-1">{getStatusLabel(selectedMachine.status, t)}</span>
                    </Badge>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">{t("factory.section", "القسم")}</div>
                  <div className="font-semibold">
                    {sectionsMap.get(selectedMachine.section_id || "")?.name_ar || 
                     sectionsMap.get(selectedMachine.section_id || "")?.name || 
                     t("factory.unknown", "غير محدد")}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2">{t("factory.productionCapacity", "الطاقة الإنتاجية (كجم/ساعة)")}</div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">{t("factory.small", "صغير")}</div>
                      <div className="font-bold">{selectedMachine.capacity_small_kg_per_hour || "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{t("factory.medium", "متوسط")}</div>
                      <div className="font-bold">{selectedMachine.capacity_medium_kg_per_hour || "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{t("factory.large", "كبير")}</div>
                      <div className="font-bold">{selectedMachine.capacity_large_kg_per_hour || "-"}</div>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-center text-muted-foreground">
                  {t("factory.machineId", "رقم الماكينة")}: {selectedMachine.id}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
