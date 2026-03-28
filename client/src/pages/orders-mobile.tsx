import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  ClipboardList, Package, Search, ArrowLeft, Home,
  ChevronRight, ShoppingCart, Calendar, User,
  ChevronDown, ChevronUp, FileText, Truck
} from "lucide-react";

type OrdersView = "list" | "detail";

export default function OrdersMobile() {
  const [currentView, setCurrentView] = useState<OrdersView>("list");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {currentView === "list" && (
        <OrdersListView onViewOrder={(order) => { setSelectedOrder(order); setCurrentView("detail"); }} />
      )}
      {currentView === "detail" && selectedOrder && (
        <OrderDetailView order={selectedOrder} onBack={() => setCurrentView("list")} />
      )}
    </div>
  );
}

function MobileHeader({ title, onBack, rightAction }: { title: string; onBack?: () => void; rightAction?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 bg-orange-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
      {onBack && (
        <button onClick={onBack} className="p-1 hover:bg-orange-700 rounded-lg transition-colors">
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
  return (
    <a
      href="/"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-gray-900 text-white text-xs py-1.5 hover:bg-gray-800 transition-colors"
    >
      <Home className="h-3.5 w-3.5" />
      <span>{t('header.mobile.backToDesktop', 'العودة للنسخة الكاملة')}</span>
    </a>
  );
}

function OrdersListView({ onViewOrder }: { onViewOrder: (order: any) => void }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders = [], isLoading } = useQuery<any[]>({
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

  const { data: productionOrders = [] } = useQuery<any[]>({
    queryKey: ["/api/production-orders"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const statusCounts: Record<string, number> = {};
  orders.forEach((o: any) => {
    statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
  });

  const filtered = orders.filter((order: any) => {
    const customer = customers.find((c: any) => c.id === order.customer_id);
    const matchesSearch = !searchQuery ||
      (order.order_number || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer?.name_ar || "").includes(searchQuery) ||
      (customer?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusFilters = [
    { val: "all", label: t('mobilePages.orders.all'), count: orders.length },
    { val: "waiting", label: t('mobilePages.orders.waiting'), count: statusCounts["waiting"] || 0 },
    { val: "in_production", label: t('mobilePages.orders.inProduction'), count: statusCounts["in_production"] || 0 },
    { val: "completed", label: t('mobilePages.orders.completed'), count: statusCounts["completed"] || 0 },
    { val: "delivered", label: t('mobilePages.orders.delivered'), count: statusCounts["delivered"] || 0 },
  ];

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      waiting: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      in_production: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      delivered: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="pb-20">
      <BackToDesktopBar />
      <div className="bg-gradient-to-br from-orange-600 to-orange-800 text-white px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('mobilePages.orders.title')}</h1>
            <p className="text-orange-200 text-sm">{t('mobilePages.orders.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{orders.length}</div>
            <div className="text-xs text-orange-200">{t('mobilePages.orders.totalOrders')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{statusCounts["in_production"] || 0}</div>
            <div className="text-xs text-orange-200">{t('mobilePages.orders.inProduction')}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{statusCounts["completed"] || 0}</div>
            <div className="text-xs text-orange-200">{t('mobilePages.orders.completed')}</div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('mobilePages.orders.searchOrders')}
          className="bg-white dark:bg-gray-900 shadow-md"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusFilters.map((f) => (
            <Button
              key={f.val}
              variant={statusFilter === f.val ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.val)}
              className="whitespace-nowrap"
            >
              {f.label} {f.count > 0 && <span className="mr-1 opacity-70">({f.count})</span>}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('mobilePages.orders.noOrders')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order: any) => {
              const customer = customers.find((c: any) => c.id === order.customer_id);
              const orderPOs = productionOrders.filter((po: any) => po.order_id === order.id);

              return (
                <button
                  key={order.id}
                  onClick={() => onViewOrder(order)}
                  className="w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 text-start shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{order.order_number}</div>
                      {customer && (
                        <p className="text-xs text-gray-500">{customer.name_ar || customer.name}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {order.order_date ? new Date(order.order_date).toLocaleDateString() : ""}
                    </span>
                    {order.delivery_days && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {order.delivery_days} {t('mobilePages.orders.deliveryDays')}
                      </span>
                    )}
                    {orderPOs.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {orderPOs.length} {t('mobilePages.orders.productionOrders')}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderDetailView({ order, onBack }: { order: any; onBack: () => void }) {
  const { t } = useTranslation();
  const [showPOs, setShowPOs] = useState(true);

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers", { all: true }],
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

  const { data: customerProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/customer-products"],
    select: (data: any) => {
      const arr = data?.data || data;
      return Array.isArray(arr) ? arr : [];
    },
  });

  const customer = customers.find((c: any) => c.id === order.customer_id);
  const orderPOs = productionOrders.filter((po: any) => po.order_id === order.id);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      waiting: "bg-amber-100 text-amber-700",
      in_production: "bg-blue-100 text-blue-700",
      completed: "bg-green-100 text-green-700",
      delivered: "bg-purple-100 text-purple-700",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-600";
  };

  return (
    <div className="pb-20">
      <MobileHeader title={order.order_number} onBack={onBack} />

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('mobilePages.orders.orderNumber')}:</span>
            <span className="font-bold">{order.order_number}</span>
          </div>
          {customer && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('mobilePages.orders.customer')}:</span>
              <span className="font-medium">{customer.name_ar || customer.name}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">{t('mobilePages.orders.status')}:</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusBadge(order.status)}`}>
              {order.status}
            </span>
          </div>
          {order.order_date && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('mobilePages.orders.orderDate')}:</span>
              <span>{new Date(order.order_date).toLocaleDateString()}</span>
            </div>
          )}
          {order.delivery_days && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t('mobilePages.orders.deliveryDays')}:</span>
              <span>{order.delivery_days}</span>
            </div>
          )}
          {order.notes && (
            <div className="text-sm">
              <span className="text-gray-500 block mb-1">{t('mobilePages.orders.notes')}:</span>
              <p className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2 text-xs">{order.notes}</p>
            </div>
          )}
        </div>

        {orderPOs.length > 0 && (
          <>
            <button
              onClick={() => setShowPOs(!showPOs)}
              className="w-full bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                <span className="font-bold text-sm">{t('mobilePages.orders.productionOrders')} ({orderPOs.length})</span>
              </div>
              {showPOs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showPOs && (
              <div className="space-y-2">
                {orderPOs.map((po: any) => {
                  const cp = customerProducts.find((p: any) => p.id === po.customer_product_id);
                  const targetKg = parseFloat(po.quantity_kg || 0);
                  const producedKg = parseFloat(po.total_weight_produced || po.produced_quantity_kg || 0);
                  const progressPct = targetKg > 0 ? Math.min(100, Math.round((producedKg / targetKg) * 100)) : 0;

                  return (
                    <div key={po.id} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-sm">{po.production_order_number}</p>
                          {cp?.size_caption && <p className="text-xs text-gray-500">{cp.size_caption}</p>}
                        </div>
                        <Badge variant={po.status === "completed" ? "default" : "secondary"} className="text-xs">
                          {po.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progressPct >= 100 ? 'bg-green-500' : progressPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold min-w-[40px] text-left">{progressPct}%</span>
                      </div>

                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{producedKg.toLocaleString()} / {targetKg.toLocaleString()} kg</span>
                        {po.rolls_count > 0 && <span>{po.rolls_count} rolls</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
