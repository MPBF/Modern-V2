import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocalizedName } from "../hooks/use-localized-name";
import { useAuth } from "../hooks/use-auth";
import { userHasPermission } from "../utils/roleUtils";
import { useToast } from "../hooks/use-toast";
import { apiRequest, queryClient } from "../lib/queryClient";
import { formatNumberAr } from "../../../shared/number-utils";
import { printRollLabel } from "../components/production/RollLabelPrint";
import RollCreationModalEnhanced from "../components/modals/RollCreationModalEnhanced";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Home, ArrowLeft, Film, Printer, Scissors, Plus, Flag,
  Package, Loader2, CheckCircle2, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Info, AlertCircle, RefreshCw
} from "lucide-react";
import { useForceDesktop } from "../hooks/use-mobile-redirect";

type MobileView = "tabs" | "film" | "printing" | "cutting";

interface ActiveProductionOrderDetails {
  id: number;
  production_order_number: string;
  order_id: number;
  customer_product_id: number;
  quantity_kg: string | number;
  final_quantity_kg: string | number;
  produced_quantity_kg?: string | number;
  status: string;
  created_at: string;
  order_number: string;
  customer_name: string;
  customer_name_ar?: string;
  customer_name_en?: string;
  product_name: string;
  product_name_ar?: string;
  product_name_en?: string;
  rolls_count: number;
  total_weight_produced: string | number;
  remaining_quantity: string | number;
  is_final_roll_created: boolean;
  film_completed?: boolean;
  production_start_time?: string;
  production_end_time?: string;
  production_time_minutes?: number;
  category_id?: string;
  category_name?: string;
  size_caption?: string;
  raw_material?: string;
  thickness?: string;
  master_batch_id?: string;
  master_batch_name?: string;
  master_batch_color_hex?: string;
  overrun_percentage?: string | number;
}

interface Roll {
  id: number;
  roll_number: string;
  roll_seq: number;
  weight_kg: number | string;
  status: string;
  created_by_name?: string;
  created_at?: string;
  production_order_id: number;
  production_order_number?: string;
  machine_id?: string;
  film_machine_id?: string;
  film_machine_name?: string;
  qr_code_text?: string;
  qr_png_base64?: string;
}

interface RollDetails {
  roll_id: number;
  roll_number: string;
  roll_seq: number;
  weight_kg: string | number;
  waste_kg: string | number;
  stage: string;
  roll_created_at: string;
  printed_at: string | null;
  cut_completed_at?: string | null;
}

interface ProductionOrderWithRolls {
  production_order_id: number;
  production_order_number: string;
  order_number: string;
  customer_name: string;
  customer_name_ar?: string;
  customer_name_en?: string;
  product_name: string;
  product_name_ar?: string;
  product_name_en?: string;
  rolls: RollDetails[];
  total_rolls: number;
  total_weight: number;
  printing_cylinder?: string;
  cutting_length_cm?: number;
  punching?: string;
}

interface Machine {
  id: string;
  name: string;
  name_ar: string;
  section_id: string;
  status: string;
}

export default function ProductionDashboardMobile() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const [currentView, setCurrentView] = useState<MobileView>("tabs");

  const canViewFilm = userHasPermission(user, "view_film_dashboard");
  const canViewPrinting = userHasPermission(user, "view_printing_dashboard");
  const canViewCutting = userHasPermission(user, "view_cutting_dashboard");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      {currentView === "tabs" && (
        <TabsView
          onNavigate={setCurrentView}
          canViewFilm={canViewFilm}
          canViewPrinting={canViewPrinting}
          canViewCutting={canViewCutting}
        />
      )}
      {currentView === "film" && canViewFilm && (
        <FilmMobileView onBack={() => setCurrentView("tabs")} />
      )}
      {currentView === "printing" && canViewPrinting && (
        <PrintingMobileView onBack={() => setCurrentView("tabs")} />
      )}
      {currentView === "cutting" && canViewCutting && (
        <CuttingMobileView onBack={() => setCurrentView("tabs")} />
      )}
    </div>
  );
}

function BackToDesktopBar() {
  const { t } = useTranslation();
  const { setForceDesktop } = useForceDesktop();
  return (
    <a
      href="/production-dashboard"
      onClick={() => setForceDesktop(true)}
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-gray-900 text-white text-xs py-1.5 hover:bg-gray-800 transition-colors"
    >
      <Home className="h-3.5 w-3.5" />
      <span>{t("header.mobile.backToDesktop", "العودة للنسخة الكاملة")}</span>
    </a>
  );
}

function MobileHeader({ title, onBack, rightAction, color = "bg-blue-600" }: {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  color?: string;
}) {
  return (
    <div className={`sticky top-0 z-30 ${color} text-white px-4 py-3 flex items-center gap-3 shadow-lg`}>
      {onBack && (
        <button onClick={onBack} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="text-lg font-bold flex-1">{title}</h1>
      {rightAction}
    </div>
  );
}

function TabsView({ onNavigate, canViewFilm, canViewPrinting, canViewCutting }: {
  onNavigate: (view: MobileView) => void;
  canViewFilm: boolean;
  canViewPrinting: boolean;
  canViewCutting: boolean;
}) {
  const { t } = useTranslation();

  const hasAnyPermission = canViewFilm || canViewPrinting || canViewCutting;

  return (
    <>
      <BackToDesktopBar />
      <MobileHeader title={t("production.dashboard.title", "لوحة تحكم الإنتاج")} />

      <div className="p-4 space-y-4">
        {!hasAnyPermission && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 text-center">
            <AlertCircle className="h-10 w-10 text-yellow-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {t("production.dashboard.noPermissions", "لا توجد صلاحيات")}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t("production.dashboard.contactAdmin", "تواصل مع المسؤول")}
            </p>
          </div>
        )}

        {canViewFilm && (
          <button
            onClick={() => onNavigate("film")}
            className="w-full bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Film className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {t("production.dashboard.filmOperator", "مشغل الفيلم")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("production.dashboard.createRolls", "إنشاء رولات جديدة")}
              </p>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400 rotate-90 rtl:-rotate-90" />
          </button>
        )}

        {canViewPrinting && (
          <button
            onClick={() => onNavigate("printing")}
            className="w-full bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
              <Printer className="h-7 w-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {t("production.dashboard.printingOperator", "مشغل الطباعة")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("operators.printing.description", "تسجيل طباعة الرولات")}
              </p>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400 rotate-90 rtl:-rotate-90" />
          </button>
        )}

        {canViewCutting && (
          <button
            onClick={() => onNavigate("cutting")}
            className="w-full bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm border border-gray-200 dark:border-gray-800 flex items-center gap-4 active:scale-[0.98] transition-transform"
          >
            <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
              <Scissors className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1 text-right">
              <p className="font-bold text-lg text-gray-900 dark:text-gray-100">
                {t("production.dashboard.cuttingOperator", "مشغل التقطيع")}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("operators.cutting.description", "تسجيل تقطيع الرولات")}
              </p>
            </div>
            <ChevronDown className="h-5 w-5 text-gray-400 rotate-90 rtl:-rotate-90" />
          </button>
        )}
      </div>
    </>
  );
}

function FilmMobileView({ onBack }: { onBack: () => void }) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const ln = useLocalizedName();
  const [selectedOrder, setSelectedOrder] = useState<ActiveProductionOrderDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFinalRoll, setIsFinalRoll] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  const { data: productionOrders = [], isLoading, refetch } = useQuery<ActiveProductionOrderDetails[]>({
    queryKey: ["/api/production-orders/active-for-operator"],
    refetchInterval: 30000,
  });

  const { data: allRolls = [] } = useQuery<Roll[]>({
    queryKey: ["/api/rolls"],
    refetchInterval: 30000,
  });

  const handleCreateRoll = (order: ActiveProductionOrderDetails, final: boolean = false) => {
    setSelectedOrder(order);
    setIsFinalRoll(final);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
    setIsFinalRoll(false);
  };

  const handlePrintLabel = async (roll: Roll) => {
    try {
      const response = await fetch(`/api/rolls/${roll.id}/label`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const labelData = await response.json();
      if (!labelData || !labelData.roll) throw new Error("Invalid label data received");
      printRollLabel({ roll: labelData.roll, productionOrder: labelData.productionOrder, order: labelData.order });
    } catch (error) {
      alert(`${t("operators.common.printLabelError")}: ${error instanceof Error ? error.message : t("operators.common.unknownError")}`);
    }
  };

  const stats = {
    totalOrders: productionOrders.length,
    totalRequired: productionOrders.reduce((sum, o) => sum + Number(o.final_quantity_kg || o.quantity_kg || 0), 0),
    totalProduced: productionOrders.reduce((sum, o) => sum + Number(o.total_weight_produced || 0), 0),
  };

  return (
    <>
      <BackToDesktopBar />
      <MobileHeader
        title={t("operators.film.title", "مشغل الفيلم")}
        onBack={onBack}
        color="bg-blue-600"
        rightAction={
          <button onClick={() => refetch()} className="p-2 hover:bg-white/20 rounded-lg">
            <RefreshCw className="h-5 w-5" />
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="p-3 space-y-3 pb-20">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label={t("operators.common.activeOrders", "أوامر نشطة")} value={stats.totalOrders} color="blue" />
            <StatCard label={t("operators.common.requiredQuantity", "المطلوب")} value={`${formatNumberAr(stats.totalRequired)}`} unit={t("operators.common.kg", "كجم")} color="orange" />
            <StatCard label={t("operators.common.producedQuantity", "المنتج")} value={`${formatNumberAr(stats.totalProduced)}`} unit={t("operators.common.kg", "كجم")} color="green" />
          </div>

          {productionOrders.length === 0 ? (
            <EmptyState message={t("operators.film.noActiveOrders", "لا توجد أوامر إنتاج نشطة")} />
          ) : (
            productionOrders.map((order) => {
              const progress = (Number(order.total_weight_produced || 0) / Number(order.final_quantity_kg || 1)) * 100;
              const isComplete = order.is_final_roll_created;
              const isExpanded = expandedOrderId === order.id;
              const orderRolls = allRolls.filter(r => r.production_order_id === order.id).sort((a, b) => a.roll_seq - b.roll_seq);

              return (
                <div key={order.id} className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden ${isComplete ? "opacity-60" : ""}`}>
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-base">{order.production_order_number}</p>
                        <p className="text-xs text-gray-500">{t("operators.common.order")}: {order.order_number}</p>
                      </div>
                      {isComplete && (
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                          {t("operators.common.completed", "مكتمل")}
                        </Badge>
                      )}
                      {!isComplete && progress >= 80 && (
                        <Badge className="bg-orange-100 text-orange-800 text-xs">
                          <AlertTriangle className="h-3 w-3 ml-1" />
                          {t("operators.common.nearCompletionBadge", "قارب الاكتمال")}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">{t("operators.common.customer", "العميل")}</p>
                        <p className="font-semibold truncate">{ln(order.customer_name_ar, order.customer_name_en) || order.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t("operators.common.product", "المنتج")}</p>
                        <p className="font-medium truncate">{ln(order.product_name_ar, order.product_name_en) || order.product_name}</p>
                      </div>
                    </div>

                    {(order.category_name || order.size_caption || order.raw_material || order.thickness) && (
                      <div className="grid grid-cols-2 gap-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg">
                        {order.category_name && <DetailItem label={t("operators.common.category", "الفئة")} value={order.category_name} />}
                        {order.size_caption && <DetailItem label={t("operators.common.size", "المقاس")} value={order.size_caption} />}
                        {order.raw_material && <DetailItem label={t("operators.common.rawMaterialType", "نوع الخامة")} value={order.raw_material} />}
                        {order.thickness && <DetailItem label={t("operators.common.thickness", "السُمك")} value={order.thickness} />}
                        {order.master_batch_id && (
                          <div>
                            <p className="text-gray-500">{isArabic ? "لون الماستر باتش" : "Masterbatch"}</p>
                            <p className="font-medium flex items-center gap-1">
                              {order.master_batch_color_hex && (
                                <span className="inline-block w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: order.master_batch_color_hex }} />
                              )}
                              {order.master_batch_name || order.master_batch_id}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t("operators.common.progress", "التقدم")}</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{formatNumberAr(Number(order.total_weight_produced))} / {formatNumberAr(Number(order.final_quantity_kg))} {t("operators.common.kg")}</span>
                        <span className="text-orange-600">{t("operators.common.remainingQuantity", "المتبقي")}: {formatNumberAr(Number(order.remaining_quantity))} {t("operators.common.kg")}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Package className="h-3.5 w-3.5" />
                        <span>{t("operators.common.rollsCount", "عدد الرولات")}: {order.rolls_count}</span>
                      </div>
                      {order.production_start_time && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            {(() => {
                              const diffMin = Math.floor((Date.now() - new Date(order.production_start_time).getTime()) / 60000);
                              if (diffMin < 60) return `${diffMin} ${t("operators.common.minute", "د")}`;
                              return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
                            })()}
                          </span>
                        </div>
                      )}
                    </div>

                    {order.rolls_count > 0 && (
                      <button
                        onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        className="w-full text-sm text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center gap-1 py-1"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {t("operators.common.viewRolls", "عرض الرولات")} ({order.rolls_count})
                      </button>
                    )}

                    {isExpanded && orderRolls.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {orderRolls.map((roll) => (
                          <div key={roll.id} className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-bold text-sm text-blue-900 dark:text-blue-100">{roll.roll_number}</p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">{formatNumberAr(Number(roll.weight_kg))} {t("operators.common.kg")}</p>
                              </div>
                              <Button onClick={() => handlePrintLabel(roll)} size="sm" variant="outline" className="h-8 text-xs">
                                <Printer className="h-3 w-3 ml-1" />
                                {t("operators.common.printLabel", "طباعة")}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!isComplete ? (
                      <div className="flex gap-2">
                        <Button onClick={() => handleCreateRoll(order, false)} className="flex-1 h-11" size="sm">
                          <Plus className="h-4 w-4 ml-1" />
                          {t("operators.common.createNewRoll", "إنشاء رول")}
                        </Button>
                        {order.rolls_count > 0 && (
                          <Button onClick={() => handleCreateRoll(order, true)} variant="destructive" className="h-11" size="sm">
                            <Flag className="h-4 w-4 ml-1" />
                            {t("operators.common.finalRoll", "رول أخير")}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-900 dark:text-green-100">
                            {t("operators.film.filmStageCompleted", "اكتمل مرحلة الفيلم")}
                          </span>
                          {order.production_time_minutes && (
                            <span className="text-xs text-green-700 dark:text-green-300 mr-auto">
                              {order.production_time_minutes} {t("operators.common.minute", "د")}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {selectedOrder && (
        <RollCreationModalEnhanced
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          productionOrderId={selectedOrder.id}
          productionOrderData={selectedOrder}
          isFinalRoll={isFinalRoll}
        />
      )}
    </>
  );
}

function PrintingMobileView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const { toast } = useToast();
  const [processingRollIds, setProcessingRollIds] = useState<Set<number>>(new Set());
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");

  const { data: productionOrders = [], isLoading, refetch } = useQuery<ProductionOrderWithRolls[]>({
    queryKey: ["/api/rolls/active-for-printing"],
    refetchInterval: 30000,
  });

  const { data: allMachines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  const printingMachines = allMachines.filter(m => m.section_id === "SEC04" && m.status === "active");
  const selectedMachine = printingMachines.find(m => m.id === selectedMachineId);

  const moveToPrintingMutation = useMutation({
    mutationFn: async ({ rollId, machineId }: { rollId: number; machineId: string }) => {
      return await apiRequest(`/api/rolls/${rollId}`, {
        method: "PATCH",
        body: JSON.stringify({ stage: "printing", printing_machine_id: machineId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rolls/active-for-printing"] });
      toast({ title: t("operators.common.success"), description: t("operators.printing.rollMoved"), variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: t("operators.common.error"), description: error.message || t("operators.printing.moveRollFailed"), variant: "destructive" });
    },
  });

  const handleMoveToPrinting = async (rollId: number) => {
    if (!selectedMachineId) {
      toast({ title: t("operators.common.error"), description: t("operators.printing.selectMachineFirst"), variant: "destructive" });
      return;
    }
    setProcessingRollIds(prev => new Set(prev).add(rollId));
    try {
      await moveToPrintingMutation.mutateAsync({ rollId, machineId: selectedMachineId });
    } finally {
      setProcessingRollIds(prev => { const s = new Set(prev); s.delete(rollId); return s; });
    }
  };

  const stats = {
    totalOrders: productionOrders.length,
    totalRolls: productionOrders.reduce((sum, o) => sum + o.total_rolls, 0),
    totalWeight: productionOrders.reduce((sum, o) => sum + o.total_weight, 0),
  };

  return (
    <>
      <BackToDesktopBar />
      <MobileHeader
        title={t("operators.printing.title", "مشغل الطباعة")}
        onBack={onBack}
        color="bg-purple-600"
        rightAction={
          <button onClick={() => refetch()} className="p-2 hover:bg-white/20 rounded-lg">
            <RefreshCw className="h-5 w-5" />
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="p-3 space-y-3 pb-20">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border-2 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <Printer className="h-5 w-5 text-purple-600" />
              <span className="font-semibold text-sm">{t("operators.printing.selectMachine", "اختر الماكينة")}</span>
            </div>
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800">
                <SelectValue placeholder={t("operators.printing.selectMachinePlaceholder", "اختر ماكينة الطباعة")} />
              </SelectTrigger>
              <SelectContent>
                {printingMachines.map(m => (
                  <SelectItem key={m.id} value={m.id}>{ln(m.name_ar, m.name)} ({m.id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMachine && (
              <div className="mt-2 flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <CheckCircle2 className="h-3 w-3 ml-1" />
                  {ln(selectedMachine.name_ar, selectedMachine.name)}
                </Badge>
              </div>
            )}
            {!selectedMachineId && (
              <div className="flex items-center gap-2 mt-2 text-amber-600 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{t("operators.printing.mustSelectMachine", "يجب اختيار ماكينة أولاً")}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard label={t("operators.common.activeOrders", "أوامر نشطة")} value={stats.totalOrders} color="purple" />
            <StatCard label={t("operators.common.totalRolls", "إجمالي الرولات")} value={stats.totalRolls} color="blue" />
            <StatCard label={t("operators.common.totalWeight", "إجمالي الوزن")} value={`${formatNumberAr(stats.totalWeight)}`} unit={t("operators.common.kg", "كجم")} color="green" />
          </div>

          {productionOrders.length === 0 ? (
            <EmptyState message={t("operators.printing.noRolls", "لا توجد رولات جاهزة للطباعة")} />
          ) : (
            productionOrders.map((order) => {
              const completedRolls = order.rolls.filter(r => r.printed_at).length;
              const progress = order.total_rolls > 0 ? (completedRolls / order.total_rolls) * 100 : 0;

              return (
                <div key={order.production_order_id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-base">{order.production_order_number}</p>
                        <p className="text-xs text-gray-500">{t("operators.common.order")}: {order.order_number}</p>
                      </div>
                      <Badge className="bg-purple-100 text-purple-800 text-xs">
                        <Printer className="h-3 w-3 ml-1" />
                        {order.total_rolls} {t("operators.common.roll", "رول")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">{t("operators.common.customer", "العميل")}</p>
                        <p className="font-semibold truncate">{ln(order.customer_name_ar, order.customer_name_en) || order.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t("operators.common.product", "المنتج")}</p>
                        <p className="font-medium truncate">{ln(order.product_name_ar, order.product_name_en) || order.product_name}</p>
                      </div>
                    </div>

                    {order.printing_cylinder && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-2.5 rounded-lg text-xs">
                        <DetailItem label={t("operators.printing.cylinderSize", "حجم السلندر")} value={order.printing_cylinder} />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t("operators.common.progress", "التقدم")}</span>
                        <span className="font-medium">{completedRolls} / {order.total_rolls} {t("operators.common.roll", "رول")}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Package className="h-3.5 w-3.5" />
                      <span>{t("operators.common.totalWeight", "إجمالي الوزن")}: {formatNumberAr(order.total_weight)} {t("operators.common.kg")}</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium">{t("operators.common.availableRolls", "الرولات المتاحة")}:</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {order.rolls.map((roll) => (
                          <div key={roll.roll_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div>
                              <p className="font-medium text-sm">{roll.roll_number}</p>
                              <p className="text-xs text-gray-500">{t("operators.common.weight", "الوزن")}: {formatNumberAr(Number(roll.weight_kg))} {t("operators.common.kg")}</p>
                            </div>
                            <Button
                              onClick={() => handleMoveToPrinting(roll.roll_id)}
                              disabled={processingRollIds.has(roll.roll_id) || !selectedMachineId}
                              size="sm"
                              className="h-9"
                            >
                              {processingRollIds.has(roll.roll_id) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Printer className="h-4 w-4 ml-1" />
                                  {t("operators.printing.print", "طباعة")}
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}

function CuttingMobileView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const { toast } = useToast();
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [selectedRoll, setSelectedRoll] = useState<RollDetails | null>(null);
  const [netWeight, setNetWeight] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: productionOrders = [], isLoading, refetch } = useQuery<ProductionOrderWithRolls[]>({
    queryKey: ["/api/rolls/active-for-cutting"],
    refetchInterval: 30000,
  });

  const { data: allMachines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  const cuttingMachines = allMachines.filter(m => m.section_id === "SEC05" && m.status === "active");
  const selectedMachine = cuttingMachines.find(m => m.id === selectedMachineId);

  const completeCuttingMutation = useMutation({
    mutationFn: async ({ rollId, netWeight, machineId }: { rollId: number; netWeight: number; machineId: string }) => {
      return await apiRequest(`/api/rolls/${rollId}/complete-cutting`, {
        method: "POST",
        body: JSON.stringify({ net_weight: netWeight, cutting_machine_id: machineId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rolls/active-for-cutting"] });
      setIsDialogOpen(false);
      setSelectedRoll(null);
      setNetWeight("");
      toast({ title: t("operators.common.success"), description: t("operators.cutting.cuttingCompleted"), variant: "default" });
    },
    onError: (error: any) => {
      toast({ title: t("operators.common.error"), description: error.message || t("operators.cutting.cuttingFailed"), variant: "destructive" });
    },
  });

  const handleOpenCuttingDialog = (roll: RollDetails) => {
    if (!selectedMachineId) {
      toast({ title: t("operators.common.error"), description: t("operators.cutting.selectMachineFirst"), variant: "destructive" });
      return;
    }
    setSelectedRoll(roll);
    setNetWeight(roll.weight_kg.toString());
    setIsDialogOpen(true);
  };

  const handleCompleteCutting = () => {
    if (!selectedRoll) return;
    const netWeightNum = parseFloat(netWeight);
    const grossWeight = parseFloat(selectedRoll.weight_kg.toString());

    if (isNaN(netWeightNum) || netWeightNum <= 0) {
      toast({ title: t("operators.common.error"), description: t("operators.cutting.invalidNetWeight"), variant: "destructive" });
      return;
    }
    if (netWeightNum > grossWeight) {
      toast({ title: t("operators.common.error"), description: t("operators.cutting.netWeightTooHigh"), variant: "destructive" });
      return;
    }
    completeCuttingMutation.mutate({ rollId: selectedRoll.roll_id, netWeight: netWeightNum, machineId: selectedMachineId });
  };

  const stats = {
    totalOrders: productionOrders.length,
    totalRolls: productionOrders.reduce((sum, o) => sum + o.total_rolls, 0),
    totalWeight: productionOrders.reduce((sum, o) => sum + o.total_weight, 0),
  };

  return (
    <>
      <BackToDesktopBar />
      <MobileHeader
        title={t("operators.cutting.title", "مشغل التقطيع")}
        onBack={onBack}
        color="bg-green-600"
        rightAction={
          <button onClick={() => refetch()} className="p-2 hover:bg-white/20 rounded-lg">
            <RefreshCw className="h-5 w-5" />
          </button>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-10 w-10 animate-spin text-green-500" />
        </div>
      ) : (
        <div className="p-3 space-y-3 pb-20">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border-2 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <Scissors className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-sm">{t("operators.cutting.selectMachine", "اختر الماكينة")}</span>
            </div>
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger className="w-full bg-gray-50 dark:bg-gray-800">
                <SelectValue placeholder={t("operators.cutting.selectMachinePlaceholder", "اختر ماكينة التقطيع")} />
              </SelectTrigger>
              <SelectContent>
                {cuttingMachines.map(m => (
                  <SelectItem key={m.id} value={m.id}>{ln(m.name_ar, m.name)} ({m.id})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMachine && (
              <div className="mt-2">
                <Badge className="bg-green-100 text-green-800 text-xs">
                  <CheckCircle2 className="h-3 w-3 ml-1" />
                  {ln(selectedMachine.name_ar, selectedMachine.name)}
                </Badge>
              </div>
            )}
            {!selectedMachineId && (
              <div className="flex items-center gap-2 mt-2 text-amber-600 text-xs">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{t("operators.cutting.mustSelectMachine", "يجب اختيار ماكينة أولاً")}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StatCard label={t("operators.common.activeOrders", "أوامر نشطة")} value={stats.totalOrders} color="green" />
            <StatCard label={t("operators.common.totalRolls", "إجمالي الرولات")} value={stats.totalRolls} color="blue" />
            <StatCard label={t("operators.common.totalWeight", "إجمالي الوزن")} value={`${formatNumberAr(stats.totalWeight)}`} unit={t("operators.common.kg", "كجم")} color="orange" />
          </div>

          {productionOrders.length === 0 ? (
            <EmptyState message={t("operators.cutting.noRolls", "لا توجد رولات جاهزة للتقطيع")} />
          ) : (
            productionOrders.map((order) => {
              const completedRolls = order.rolls.filter(r => r.cut_completed_at).length;
              const progress = order.total_rolls > 0 ? (completedRolls / order.total_rolls) * 100 : 0;

              return (
                <div key={order.production_order_id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-base">{order.production_order_number}</p>
                        <p className="text-xs text-gray-500">{t("operators.common.order")}: {order.order_number}</p>
                      </div>
                      <Badge className="bg-green-100 text-green-800 text-xs">
                        <Scissors className="h-3 w-3 ml-1" />
                        {order.total_rolls} {t("operators.common.roll", "رول")}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">{t("operators.common.customer", "العميل")}</p>
                        <p className="font-semibold truncate">{ln(order.customer_name_ar, order.customer_name_en) || order.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t("operators.common.product", "المنتج")}</p>
                        <p className="font-medium truncate">{ln(order.product_name_ar, order.product_name_en) || order.product_name}</p>
                      </div>
                    </div>

                    {(order.cutting_length_cm || order.punching) && (
                      <div className="grid grid-cols-2 gap-2 text-xs bg-green-50 dark:bg-green-900/20 p-2.5 rounded-lg">
                        {order.cutting_length_cm && <DetailItem label={t("operators.cutting.length", "الطول")} value={`${order.cutting_length_cm} cm`} />}
                        {order.punching && <DetailItem label={t("operators.cutting.punchingType", "نوع التثقيب")} value={order.punching} />}
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500">{t("operators.common.progress", "التقدم")}</span>
                        <span className="font-medium">{completedRolls} / {order.total_rolls} {t("operators.common.roll", "رول")}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Package className="h-3.5 w-3.5" />
                      <span>{t("operators.common.totalWeight", "إجمالي الوزن")}: {formatNumberAr(order.total_weight)} {t("operators.common.kg")}</span>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium">{t("operators.common.availableRolls", "الرولات المتاحة")}:</p>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {order.rolls.map((roll) => (
                          <div key={roll.roll_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div>
                              <p className="font-medium text-sm">{roll.roll_number}</p>
                              <p className="text-xs text-gray-500">{t("operators.common.weight", "الوزن")}: {formatNumberAr(Number(roll.weight_kg))} {t("operators.common.kg")}</p>
                            </div>
                            <Button
                              onClick={() => handleOpenCuttingDialog(roll)}
                              disabled={!selectedMachineId}
                              size="sm"
                              className="h-9 bg-green-600 hover:bg-green-700"
                            >
                              <Scissors className="h-4 w-4 ml-1" />
                              {t("operators.cutting.cut", "قص")}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {isDialogOpen && selectedRoll && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => !completeCuttingMutation.isPending && setIsDialogOpen(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl p-5 space-y-4 animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-1.5 rounded-full bg-gray-300 mx-auto" />

            <h3 className="font-bold text-lg flex items-center gap-2">
              <Scissors className="h-5 w-5 text-green-600" />
              {t("operators.cutting.enterNetWeight", "إدخال الوزن الصافي")}
            </h3>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500">{t("operators.cutting.rollNumber", "رقم الرول")}</p>
                <p className="font-semibold">{selectedRoll.roll_number}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t("operators.cutting.grossWeight", "الوزن الإجمالي")}</p>
                <p className="font-semibold">{formatNumberAr(Number(selectedRoll.weight_kg))} {t("operators.common.kg")}</p>
              </div>
            </div>

            {selectedMachine && (
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-sm">
                <p className="text-xs text-gray-500">{t("operators.cutting.cuttingMachine", "ماكينة التقطيع")}</p>
                <p className="font-semibold">{ln(selectedMachine.name_ar, selectedMachine.name)} ({selectedMachine.id})</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("operators.cutting.netWeightKg", "الوزن الصافي (كجم)")}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={selectedRoll.weight_kg.toString()}
                value={netWeight}
                onChange={e => setNetWeight(e.target.value)}
                placeholder={t("operators.cutting.enterNetWeightPlaceholder", "أدخل الوزن الصافي")}
                className="text-right h-12 text-lg"
              />
              <p className="text-xs text-gray-500">
                {t("operators.cutting.expectedWaste", "الهالك المتوقع")}: {formatNumberAr(Math.max(0, Number(selectedRoll.weight_kg) - Number(netWeight || 0)))} {t("operators.common.kg")}
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={completeCuttingMutation.isPending}
                className="flex-1 h-12"
              >
                {t("common.cancel", "إلغاء")}
              </Button>
              <Button
                onClick={handleCompleteCutting}
                disabled={completeCuttingMutation.isPending || !netWeight}
                className="flex-1 h-12 bg-green-600 hover:bg-green-700"
              >
                {completeCuttingMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 ml-1" />
                    {t("operators.cutting.confirmCut", "تأكيد القص")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
  };

  return (
    <div className={`rounded-xl p-3 border ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs text-gray-500 truncate">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
      {unit && <p className="text-[10px] text-gray-500">{unit}</p>}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-800">
      <Info className="h-10 w-10 text-gray-400 mx-auto mb-3" />
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  );
}
