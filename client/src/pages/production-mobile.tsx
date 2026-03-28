import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Package, Factory, Search, ChevronDown, ChevronUp,
  ArrowLeft, Film, Printer, Scissors, Clock,
  CheckCircle, AlertTriangle, TrendingUp
} from "lucide-react";

type ProductionView = "dashboard" | "order-details";

export default function ProductionMobile() {
  const [currentView, setCurrentView] = useState<ProductionView>("dashboard");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setCurrentView("order-details");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {currentView === "dashboard" && (
        <ProductionDashboardView onViewOrder={handleViewOrder} />
      )}
      {currentView === "order-details" && selectedOrder && (
        <OrderDetailsView
          order={selectedOrder}
          onBack={() => setCurrentView("dashboard")}
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

function ProductionDashboardView({ onViewOrder }: { onViewOrder: (order: any) => void }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  const { data: productionOrders = [], isLoading } = useQuery<any[]>({
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

  const activeCount = productionOrders.filter((po: any) => po.status !== "completed" && po.status !== "cancelled").length;
  const completedCount = productionOrders.filter((po: any) => po.status === "completed").length;
  const totalRolls = productionOrders.reduce((sum: number, po: any) => sum + (po.rolls_count || 0), 0);
  const totalWeight = productionOrders.reduce((sum: number, po: any) => sum + parseFloat(po.total_weight_produced || 0), 0);

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

  return (
    <div className="pb-20">
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

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{activeCount}</div>
            <div className="text-xs text-indigo-200">{t('mobilePages.production.activeOrders')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{completedCount}</div>
            <div className="text-xs text-indigo-200">{t('mobilePages.production.completedOrders')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{totalRolls}</div>
            <div className="text-xs text-indigo-200">{t('mobilePages.production.totalRolls')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{totalWeight.toLocaleString()}</div>
            <div className="text-xs text-indigo-200">{t('mobilePages.production.totalWeight')} ({t('mobilePages.production.kg')})</div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
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
            {filtered.map((po: any) => {
              const order = orders.find((o: any) => o.id === po.order_id);
              const customer = customers.find((c: any) => c.id === order?.customer_id);
              const targetKg = parseFloat(po.quantity_kg || 0);
              const producedKg = parseFloat(po.total_weight_produced || po.produced_quantity_kg || 0);
              const progressPct = targetKg > 0 ? Math.min(100, Math.round((producedKg / targetKg) * 100)) : 0;

              const statusColor = po.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : po.status === "in_progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";

              return (
                <button
                  key={po.id}
                  onClick={() => onViewOrder(po)}
                  className="w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 text-start shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{po.production_order_number}</div>
                      <div className="text-xs text-gray-500">{order?.order_number}</div>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColor}`}>
                      {po.status === "completed" ? "✓" : po.status === "in_progress" ? "⚡" : "⏳"} {po.status}
                    </span>
                  </div>

                  {customer && (
                    <p className="text-xs text-gray-500 mb-2">
                      {customer.name_ar || customer.name}
                    </p>
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

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{t('mobilePages.production.producedQty')}: {producedKg.toLocaleString()} {t('mobilePages.production.kg')}</span>
                    <span>{t('mobilePages.production.targetQty')}: {targetKg.toLocaleString()} {t('mobilePages.production.kg')}</span>
                  </div>

                  {po.rolls_count > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400">
                      <Package className="h-3 w-3" />
                      <span>{po.rolls_count} {t('mobilePages.production.rolls')}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDetailsView({ order, onBack }: { order: any; onBack: () => void }) {
  const { t } = useTranslation();
  const [showRolls, setShowRolls] = useState(false);

  const { data: rolls = [] } = useQuery<any[]>({
    queryKey: ["/api/rolls", { production_order_id: order.id }],
    queryFn: async () => {
      const res = await fetch(`/api/rolls?production_order_id=${order.id}`);
      if (!res.ok) return [];
      const result = await res.json();
      return result.data || result || [];
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
            <span className="font-bold text-sm">{t('mobilePages.production.rolls')} ({(rolls as any[]).length})</span>
          </div>
          {showRolls ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {showRolls && (rolls as any[]).length > 0 && (
          <div className="space-y-2">
            {(rolls as any[]).map((roll: any) => (
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
                <Badge variant={roll.status === "completed" ? "default" : "secondary"} className="text-xs">
                  {roll.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
