import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Package, Factory, ArrowLeft, Home,
  ChevronDown, ChevronUp, Film, Printer, Scissors,
  CheckCircle, Clock, TrendingUp
} from "lucide-react";
import { useForceDesktop } from "../hooks/use-mobile-redirect";

type ProductionView = "dashboard" | "stage-detail" | "order-details";

export default function ProductionMobile() {
  const [currentView, setCurrentView] = useState<ProductionView>("dashboard");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setCurrentView("order-details");
  };

  const handleViewStage = (stage: string) => {
    setSelectedStage(stage);
    setCurrentView("stage-detail");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {currentView === "dashboard" && (
        <ProductionDashboardView onViewOrder={handleViewOrder} onViewStage={handleViewStage} />
      )}
      {currentView === "stage-detail" && selectedStage && (
        <StageDetailView
          stage={selectedStage}
          onBack={() => setCurrentView("dashboard")}
          onViewOrder={handleViewOrder}
        />
      )}
      {currentView === "order-details" && selectedOrder && (
        <OrderDetailsView
          order={selectedOrder}
          onBack={() => {
            if (selectedStage) setCurrentView("stage-detail");
            else setCurrentView("dashboard");
          }}
        />
      )}
    </div>
  );
}

function MobileHeader({ title, onBack, rightAction }: { title: string; onBack?: () => void; rightAction?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 bg-indigo-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
      {onBack && (
        <button onClick={onBack} className="p-1 hover:bg-indigo-700 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="text-lg font-bold flex-1">{title}</h1>
      {rightAction}
    </div>
  );
}

function BackToDesktopBar() {
  const { t } = useTranslation();
  const { setForceDesktop } = useForceDesktop();
  return (
    <a
      href="/"
      onClick={() => setForceDesktop(true)}
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-gray-900 text-white text-xs py-1.5 hover:bg-gray-800 transition-colors"
    >
      <Home className="h-3.5 w-3.5" />
      <span>{t('header.mobile.backToDesktop', 'العودة للنسخة الكاملة')}</span>
    </a>
  );
}

function ProductionDashboardView({ onViewOrder, onViewStage }: { onViewOrder: (order: any) => void; onViewStage: (stage: string) => void }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: productionOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/production-orders"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const { data: rolls = [] } = useQuery<any[]>({
    queryKey: ["/api/rolls"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers", { all: true }],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const filmRolls = rolls.filter((r: any) => r.stage === "film");
  const printingRolls = rolls.filter((r: any) => r.stage === "printing");
  const cuttingRolls = rolls.filter((r: any) => r.stage === "cutting");
  const doneRolls = rolls.filter((r: any) => r.stage === "done");

  const activeCount = productionOrders.filter((po: any) => po.status !== "completed" && po.status !== "cancelled").length;
  const completedCount = productionOrders.filter((po: any) => po.status === "completed").length;

  const filtered = productionOrders.filter((po: any) => {
    const order = orders.find((o: any) => o.id === po.order_id);
    const customer = customers.find((c: any) => c.id === order?.customer_id);

    const matchesSearch = !searchQuery ||
      (po.production_order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order?.order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer?.name_ar || "").includes(searchQuery) ||
      (customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "active" && po.status !== "completed" && po.status !== "cancelled") ||
      (statusFilter === "completed" && po.status === "completed");

    return matchesSearch && matchesStatus;
  });

  const stageCards = [
    {
      key: "film",
      label: t('mobilePages.production.filmStage', 'الفيلم'),
      icon: Film,
      count: filmRolls.length,
      color: "from-blue-500 to-blue-700",
      bgLight: "bg-blue-50 dark:bg-blue-900/20",
      textColor: "text-blue-600",
    },
    {
      key: "printing",
      label: t('mobilePages.production.printingStage', 'الطباعة'),
      icon: Printer,
      count: printingRolls.length,
      color: "from-purple-500 to-purple-700",
      bgLight: "bg-purple-50 dark:bg-purple-900/20",
      textColor: "text-purple-600",
    },
    {
      key: "cutting",
      label: t('mobilePages.production.cuttingStage', 'التقطيع'),
      icon: Scissors,
      count: cuttingRolls.length,
      color: "from-orange-500 to-orange-700",
      bgLight: "bg-orange-50 dark:bg-orange-900/20",
      textColor: "text-orange-600",
    },
  ];

  return (
    <div className="pb-20">
      <BackToDesktopBar />
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('mobilePages.production.title')}</h1>
            <p className="text-indigo-200 text-sm">{t('mobilePages.production.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <div className="text-xl font-bold">{activeCount}</div>
            <div className="text-[10px] text-indigo-200">{t('mobilePages.production.activeOrders')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <div className="text-xl font-bold">{completedCount}</div>
            <div className="text-[10px] text-indigo-200">{t('mobilePages.production.completedOrders')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <div className="text-xl font-bold">{rolls.length}</div>
            <div className="text-[10px] text-indigo-200">{t('mobilePages.production.totalRolls')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-2.5 text-center">
            <div className="text-xl font-bold">{doneRolls.length}</div>
            <div className="text-[10px] text-indigo-200">{t('mobilePages.production.doneRolls', 'مكتملة')}</div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {stageCards.map((stage) => {
            const Icon = stage.icon;
            return (
              <button
                key={stage.key}
                onClick={() => onViewStage(stage.key)}
                className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 text-center shadow-sm active:scale-[0.96] transition-all"
              >
                <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center ${stage.bgLight} mb-2`}>
                  <Icon className={`h-5 w-5 ${stage.textColor}`} />
                </div>
                <div className="text-2xl font-bold">{stage.count}</div>
                <div className="text-xs text-gray-500 mt-0.5">{stage.label}</div>
              </button>
            );
          })}
        </div>

        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('mobilePages.production.searchOrders')}
          className="bg-white dark:bg-gray-900 shadow-md"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { val: "active", label: t('mobilePages.production.activeOrders') },
            { val: "completed", label: t('mobilePages.production.completedOrders') },
            { val: "all", label: t('mobilePages.production.allStages') },
          ].map((f) => (
            <Button
              key={f.val}
              variant={statusFilter === f.val ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.val)}
              className="whitespace-nowrap"
            >
              {f.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Factory className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('mobilePages.production.noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((po: any) => (
              <ProductionOrderCard
                key={po.id}
                po={po}
                orders={orders}
                customers={customers}
                rolls={rolls}
                onClick={() => onViewOrder(po)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductionOrderCard({ po, orders, customers, rolls, onClick }: { po: any; orders: any[]; customers: any[]; rolls: any[]; onClick: () => void }) {
  const { t } = useTranslation();
  const order = orders.find((o: any) => o.id === po.order_id);
  const customer = customers.find((c: any) => c.id === order?.customer_id);
  const poRolls = rolls.filter((r: any) => r.production_order_id === po.id);
  const targetKg = parseFloat(po.quantity_kg || 0);
  const producedKg = parseFloat(po.total_weight_produced || po.produced_quantity_kg || 0);
  const progressPct = targetKg > 0 ? Math.min(100, Math.round((producedKg / targetKg) * 100)) : 0;

  const filmCount = poRolls.filter((r: any) => r.stage === "film").length;
  const printCount = poRolls.filter((r: any) => r.stage === "printing").length;
  const cutCount = poRolls.filter((r: any) => r.stage === "cutting").length;
  const doneCount = poRolls.filter((r: any) => r.stage === "done").length;

  const statusColor = po.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
    : po.status === "in_progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

  return (
    <button
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 text-start shadow-sm active:scale-[0.98] transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm">{po.production_order_number}</div>
          <div className="text-xs text-gray-500">{order?.order_number}</div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>
          {po.status}
        </span>
      </div>

      {customer && (
        <p className="text-xs text-gray-500 mb-2">{customer.name_ar || customer.name}</p>
      )}

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="text-xs font-bold min-w-[40px] text-left">{progressPct}%</span>
      </div>

      <div className="flex justify-between text-xs text-gray-500 mb-2">
        <span>{t('mobilePages.production.producedQty')}: {producedKg.toLocaleString()} {t('mobilePages.production.kg')}</span>
        <span>{t('mobilePages.production.targetQty')}: {targetKg.toLocaleString()} {t('mobilePages.production.kg')}</span>
      </div>

      {poRolls.length > 0 && (
        <div className="flex gap-3 text-[10px] pt-2 border-t border-gray-100 dark:border-gray-800">
          <span className="flex items-center gap-1 text-blue-600"><Film className="h-3 w-3" /> {filmCount}</span>
          <span className="flex items-center gap-1 text-purple-600"><Printer className="h-3 w-3" /> {printCount}</span>
          <span className="flex items-center gap-1 text-orange-600"><Scissors className="h-3 w-3" /> {cutCount}</span>
          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-3 w-3" /> {doneCount}</span>
        </div>
      )}
    </button>
  );
}

function StageDetailView({ stage, onBack, onViewOrder }: { stage: string; onBack: () => void; onViewOrder: (order: any) => void }) {
  const { t } = useTranslation();

  const stageConfig: Record<string, { label: string; icon: any; headerColor: string }> = {
    film: { label: t('mobilePages.production.filmStage', 'الفيلم'), icon: Film, headerColor: "bg-blue-600" },
    printing: { label: t('mobilePages.production.printingStage', 'الطباعة'), icon: Printer, headerColor: "bg-purple-600" },
    cutting: { label: t('mobilePages.production.cuttingStage', 'التقطيع'), icon: Scissors, headerColor: "bg-orange-600" },
  };

  const config = stageConfig[stage] || stageConfig.film;
  const StageIcon = config.icon;

  const { data: rolls = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/rolls"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const { data: productionOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/production-orders"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers", { all: true }],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const stageRolls = rolls.filter((r: any) => r.stage === stage);
  const totalWeight = stageRolls.reduce((sum: number, r: any) => sum + parseFloat(r.weight_kg || 0), 0);

  const groupedByPO: Record<string, any[]> = {};
  stageRolls.forEach((r: any) => {
    const key = r.production_order_id || "unknown";
    if (!groupedByPO[key]) groupedByPO[key] = [];
    groupedByPO[key].push(r);
  });

  return (
    <div className="pb-20">
      <div className={`sticky top-0 z-30 ${config.headerColor} text-white px-4 py-3 flex items-center gap-3 shadow-lg`}>
        <button onClick={onBack} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <StageIcon className="h-5 w-5" />
        <h1 className="text-lg font-bold flex-1">{config.label}</h1>
        <Badge variant="secondary" className="text-sm">{stageRolls.length}</Badge>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{stageRolls.length}</div>
            <div className="text-xs text-gray-500">{t('mobilePages.production.rolls')}</div>
          </div>
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{totalWeight.toLocaleString()}</div>
            <div className="text-xs text-gray-500">{t('mobilePages.production.totalWeight')} ({t('mobilePages.production.kg')})</div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : stageRolls.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <StageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('mobilePages.production.noRollsInStage', 'لا توجد رولات في هذه المرحلة')}</p>
          </div>
        ) : (
          Object.entries(groupedByPO).map(([poId, poRolls]) => {
            const po = productionOrders.find((p: any) => String(p.id) === String(poId));
            const order = orders.find((o: any) => o.id === po?.order_id);
            const customer = customers.find((c: any) => c.id === order?.customer_id);

            return (
              <div key={poId} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl overflow-hidden">
                {po && (
                  <button
                    onClick={() => onViewOrder(po)}
                    className="w-full px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-start hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-sm">{po.production_order_number}</p>
                      <p className="text-xs text-gray-500">{customer?.name_ar || customer?.name || order?.order_number}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{poRolls.length} {t('mobilePages.production.rolls')}</Badge>
                  </button>
                )}

                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {poRolls.map((roll: any) => (
                    <div key={roll.id} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-gray-600">{roll.roll_seq || '#'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{roll.roll_number}</p>
                        <p className="text-xs text-gray-500">
                          {parseFloat(roll.weight_kg || 0).toLocaleString()} {t('mobilePages.production.kg')}
                          {roll.film_machine_name && ` • ${roll.film_machine_name}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {roll.created_at ? new Date(roll.created_at).toLocaleDateString() : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function OrderDetailsView({ order, onBack }: { order: any; onBack: () => void }) {
  const { t } = useTranslation();
  const [showRolls, setShowRolls] = useState(true);

  const { data: rolls = [] } = useQuery<any[]>({
    queryKey: ["/api/rolls"],
    select: (data: any) => {
      const arr = data?.data || data;
      const all = Array.isArray(arr) ? arr : [];
      return all.filter((r: any) => String(r.production_order_id) === String(order.id));
    },
  });

  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/orders"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers", { all: true }],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const parentOrder = orders.find((o: any) => o.id === order.order_id);
  const customer = customers.find((c: any) => c.id === parentOrder?.customer_id);
  const targetKg = parseFloat(order.quantity_kg || 0);
  const producedKg = parseFloat(order.total_weight_produced || order.produced_quantity_kg || 0);
  const remainingKg = Math.max(0, targetKg - producedKg);
  const progressPct = targetKg > 0 ? Math.min(100, Math.round((producedKg / targetKg) * 100)) : 0;

  const filmCount = rolls.filter((r: any) => r.stage === "film").length;
  const printCount = rolls.filter((r: any) => r.stage === "printing").length;
  const cutCount = rolls.filter((r: any) => r.stage === "cutting").length;
  const doneCount = rolls.filter((r: any) => r.stage === "done").length;

  const stageIcon = (s: string) => {
    if (s === "film") return <Film className="h-3 w-3" />;
    if (s === "printing") return <Printer className="h-3 w-3" />;
    if (s === "cutting") return <Scissors className="h-3 w-3" />;
    return <CheckCircle className="h-3 w-3" />;
  };

  const stageColor = (s: string) => {
    if (s === "film") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    if (s === "printing") return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    if (s === "cutting") return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  };

  return (
    <div className="pb-20">
      <MobileHeader title={order.production_order_number} onBack={onBack} />

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{t('mobilePages.production.progress')}</span>
            <span className="text-2xl font-bold text-indigo-600">{progressPct}%</span>
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progressPct >= 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
              <div className="text-sm font-bold text-blue-600">{targetKg.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{t('mobilePages.production.targetQty')}</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
              <div className="text-sm font-bold text-green-600">{producedKg.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{t('mobilePages.production.producedQty')}</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
              <div className="text-sm font-bold text-amber-600">{remainingKg.toLocaleString()}</div>
              <div className="text-xs text-gray-500">{t('mobilePages.production.remainingQty')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
          <h3 className="font-bold text-sm mb-3">{t('mobilePages.production.stagesBreakdown', 'توزيع المراحل')}</h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Film className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <div className="text-lg font-bold text-blue-600">{filmCount}</div>
              <div className="text-[10px] text-gray-500">{t('mobilePages.production.filmStage', 'فيلم')}</div>
            </div>
            <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Printer className="h-4 w-4 mx-auto text-purple-600 mb-1" />
              <div className="text-lg font-bold text-purple-600">{printCount}</div>
              <div className="text-[10px] text-gray-500">{t('mobilePages.production.printingStage', 'طباعة')}</div>
            </div>
            <div className="text-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <Scissors className="h-4 w-4 mx-auto text-orange-600 mb-1" />
              <div className="text-lg font-bold text-orange-600">{cutCount}</div>
              <div className="text-[10px] text-gray-500">{t('mobilePages.production.cuttingStage', 'تقطيع')}</div>
            </div>
            <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="h-4 w-4 mx-auto text-green-600 mb-1" />
              <div className="text-lg font-bold text-green-600">{doneCount}</div>
              <div className="text-[10px] text-gray-500">{t('mobilePages.production.doneRolls', 'مكتملة')}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-2">
          {parentOrder && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('mobilePages.production.orderNumber')}:</span>
              <span className="font-medium">{parentOrder.order_number}</span>
            </div>
          )}
          {customer && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('mobilePages.production.customer')}:</span>
              <span className="font-medium">{customer.name_ar || customer.name}</span>
            </div>
          )}
          {order.size_caption && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('mobilePages.production.product')}:</span>
              <span className="font-medium">{order.size_caption}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('mobilePages.production.status')}:</span>
            <Badge variant={order.status === "completed" ? "default" : "secondary"}>
              {order.status}
            </Badge>
          </div>
        </div>

        <button
          onClick={() => setShowRolls(!showRolls)}
          className="w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-indigo-500" />
            <span className="font-bold text-sm">{t('mobilePages.production.rolls')} ({rolls.length})</span>
          </div>
          {showRolls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showRolls && rolls.length > 0 && (
          <div className="space-y-2">
            {rolls.map((roll: any) => (
              <div key={roll.id} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-600">{roll.roll_seq || '#'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{roll.roll_number}</p>
                  <div className="flex gap-3 text-xs text-gray-500 mt-1">
                    <span>{parseFloat(roll.weight_kg || 0).toLocaleString()} {t('mobilePages.production.kg')}</span>
                    {roll.film_machine_name && <span>{roll.film_machine_name}</span>}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 ${stageColor(roll.stage)}`}>
                  {stageIcon(roll.stage)}
                  {roll.stage}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
