import { useState, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useLocalizedName } from "../hooks/use-localized-name";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Package,
  Factory,
  CheckCircle,
  Hash,
  User,
  ArrowDownToLine,
  ArrowUpFromLine,
  Truck,
  Boxes,
  BarChart3,
  Settings,
} from "lucide-react";
import { VouchersList } from "../components/warehouse/VouchersList";
import { VoucherForm } from "../components/warehouse/VoucherForm";
import { InventoryCountForm } from "../components/warehouse/InventoryCountForm";
import { WarehouseDefinitions } from "../components/warehouse/WarehouseDefinitions";
import { WarehouseReports } from "../components/warehouse/WarehouseReports";
import PageLayout from "../components/layout/PageLayout";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";

export default function Warehouse() {
  const { t } = useTranslation();

  const [voucherFormType, setVoucherFormType] = useState<"raw-material-in" | "raw-material-out" | "finished-goods-in" | "finished-goods-out">("raw-material-in");
  const [isVoucherFormOpen, setIsVoucherFormOpen] = useState(false);
  const [isInventoryCountOpen, setIsInventoryCountOpen] = useState(false);

  const openVoucherForm = (type: typeof voucherFormType) => {
    setVoucherFormType(type);
    setIsVoucherFormOpen(true);
  };

  const { data: voucherStats } = useQuery<{ rm_in: number; rm_out: number; fp_in: number; fp_out: number; total: number }>({
    queryKey: ["/api/warehouse/vouchers/stats"],
  });

  return (
    <PageLayout title={t('warehouse.title')} description={t('warehouse.description')}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">{t('warehouse.dashboard.rawMaterialInVouchers')}</CardTitle>
            <ArrowDownToLine className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">{voucherStats?.rm_in || 0}</div>
            <p className="text-xs text-muted-foreground">RM-Rec</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">{t('warehouse.dashboard.rawMaterialOutVouchers')}</CardTitle>
            <ArrowUpFromLine className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">{voucherStats?.rm_out || 0}</div>
            <p className="text-xs text-muted-foreground">RM-Del</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">{t('warehouse.dashboard.finishedGoodsInVouchers')}</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{voucherStats?.fp_in || 0}</div>
            <p className="text-xs text-muted-foreground">FP-Rec</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">{t('warehouse.dashboard.finishedGoodsOutVouchers')}</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{voucherStats?.fp_out || 0}</div>
            <p className="text-xs text-muted-foreground">FP-Del</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="production-hall" className="space-y-4">
        <TabsList className="flex flex-wrap w-full justify-start gap-1">
          <TabsTrigger value="production-hall" className="shrink-0 bg-amber-50 dark:bg-amber-950">
            <Factory className="h-4 w-4 ml-1" />
            {t('warehouse.tabs.productionHall')}
          </TabsTrigger>
          <TabsTrigger value="finished-goods" className="shrink-0 bg-blue-50 dark:bg-blue-950">
            <Package className="h-4 w-4 ml-1" />
            {t('warehouse.tabs.finishedGoods')}
          </TabsTrigger>
          <TabsTrigger value="raw-materials" className="shrink-0 bg-green-50 dark:bg-green-950">
            <Boxes className="h-4 w-4 ml-1" />
            {t('warehouse.tabs.rawMaterials')}
          </TabsTrigger>
          <TabsTrigger value="definitions" className="shrink-0 bg-purple-50 dark:bg-purple-950">
            <Settings className="h-4 w-4 ml-1" />
            {t('warehouse.tabs.definitions')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="shrink-0 bg-gray-50 dark:bg-gray-950">
            <BarChart3 className="h-4 w-4 ml-1" />
            {t('warehouse.tabs.reports')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="production-hall" className="space-y-4">
          <ProductionHallContent onCreateVoucher={() => openVoucherForm("finished-goods-in")} />
        </TabsContent>

        <TabsContent value="finished-goods" className="space-y-4">
          <FinishedGoodsSection
            onCreateVoucherIn={() => openVoucherForm("finished-goods-in")}
            onCreateVoucherOut={() => openVoucherForm("finished-goods-out")}
          />
        </TabsContent>

        <TabsContent value="raw-materials" className="space-y-4">
          <RawMaterialsSection
            onCreateVoucherIn={() => openVoucherForm("raw-material-in")}
            onCreateVoucherOut={() => openVoucherForm("raw-material-out")}
          />
        </TabsContent>

        <TabsContent value="definitions" className="space-y-4">
          <WarehouseDefinitions />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <WarehouseReports />
        </TabsContent>
      </Tabs>

      <VoucherForm
        type={voucherFormType}
        open={isVoucherFormOpen}
        onOpenChange={setIsVoucherFormOpen}
      />

      <InventoryCountForm
        open={isInventoryCountOpen}
        onOpenChange={setIsInventoryCountOpen}
      />
    </PageLayout>
  );
}

function FinishedGoodsSection({ onCreateVoucherIn, onCreateVoucherOut }: { onCreateVoucherIn: () => void; onCreateVoucherOut: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Tabs defaultValue="fp-del" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fp-del">
            <Truck className="h-4 w-4 ml-1" />
            {t('warehouse.production.fpDelVouchers')}
          </TabsTrigger>
          <TabsTrigger value="fp-rec">
            <ArrowDownToLine className="h-4 w-4 ml-1" />
            {t('warehouse.production.fpRecVouchers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fp-del">
          <DeliveryHallContent />
        </TabsContent>
        <TabsContent value="fp-rec">
          <VouchersList type="finished-goods-in" title={t('warehouse.production.fpRecVouchersTitle')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DeliveryHallContent() {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [deliveryWeights, setDeliveryWeights] = useState<Record<string, string>>({});
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [selectedDeliveryOrderId, setSelectedDeliveryOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: deliveryOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/warehouse/delivery-hall"],
    refetchInterval: 120000,
    staleTime: 90000,
  });

  const processedOrders = useMemo(() => {
    return deliveryOrders.map((order: any) => ({
      ...order,
      warehouse_received_kg: parseFloat(order.warehouse_received_kg) || 0,
      warehouse_delivered_kg: parseFloat(order.warehouse_delivered_kg) || 0,
      available_for_delivery:
        (parseFloat(order.warehouse_received_kg) || 0) -
        (parseFloat(order.warehouse_delivered_kg) || 0),
    }));
  }, [deliveryOrders]);

  const groupedByOrder = useMemo(() => {
    const groups: Record<string, { order_number: string; customer_name: string; customer_name_ar: string; items: any[] }> = {};
    processedOrders.forEach((po: any) => {
      const key = po.order_number || po.order_id;
      if (!groups[key]) {
        groups[key] = {
          order_number: po.order_number,
          customer_name: po.customer_name,
          customer_name_ar: po.customer_name_ar,
          items: [],
        };
      }
      groups[key].items.push(po);
    });
    return Object.values(groups);
  }, [processedOrders]);

  const deliveryMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/warehouse/vouchers/finished-goods-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "فشل حفظ سند التسليم");
      }
      return response.json();
    },
  });

  const handleSelectOrder = (productionOrderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(productionOrderId)) {
      newSelection.delete(productionOrderId);
    } else {
      newSelection.add(productionOrderId);
    }
    setSelectedOrders(newSelection);
  };

  const openDeliveryForOrder = (productionOrderId: string) => {
    setSelectedDeliveryOrderId(productionOrderId);
    setDeliveryWeights({});
    setDeliveryDialogOpen(true);
  };

  const deliveryTargetOrders = useMemo(() => {
    const targetIds = selectedDeliveryOrderId
      ? [selectedDeliveryOrderId]
      : Array.from(selectedOrders);
    return targetIds
      .map((id) => processedOrders.find((o: any) => o.production_order_id.toString() === id))
      .filter(Boolean);
  }, [selectedDeliveryOrderId, selectedOrders, processedOrders]);

  const handleDeliverySubmit = async () => {
    if (!user?.id) {
      toast({ title: t('warehouse.toast.error'), description: "يجب تسجيل الدخول", variant: "destructive" });
      return;
    }

    const targetOrders = selectedDeliveryOrderId
      ? [selectedDeliveryOrderId]
      : Array.from(selectedOrders);

    if (targetOrders.length === 0) {
      toast({ title: t('warehouse.toast.error'), description: "يرجى تحديد أمر إنتاج واحد على الأقل", variant: "destructive" });
      return;
    }

    const ordersWithWeights = targetOrders
      .map((id) => {
        const weight = parseFloat(deliveryWeights[id] || "0");
        const order = processedOrders.find((o: any) => o.production_order_id.toString() === id);
        return { id, weight, order };
      })
      .filter((o) => o.weight > 0);

    if (ordersWithWeights.length === 0) {
      toast({ title: t('warehouse.toast.error'), description: "يرجى إدخال وزن التسليم", variant: "destructive" });
      return;
    }

    for (const { weight, order } of ordersWithWeights) {
      if (order && weight > order.available_for_delivery) {
        toast({ title: t('warehouse.toast.error'), description: `الوزن يتجاوز الكمية المتاحة (${order.production_order_number})`, variant: "destructive" });
        return;
      }
    }

    try {
      const nextNumRes = await fetch("/api/warehouse/vouchers/next-number/FP-Del");
      const { next_number } = await nextNumRes.json();

      const items = ordersWithWeights.map(({ id: productionOrderId, weight, order }) => ({
        production_order_id: parseInt(productionOrderId),
        weight_kg: weight.toString(),
        product_description: order?.product_name_ar || order?.product_name || '',
        customer_id: order?.customer_id?.toString() || '',
        customer_name: order?.customer_name_ar || order?.customer_name || '',
        order_number: order?.order_number || '',
      }));

      await deliveryMutation.mutateAsync({
        voucher_number: next_number,
        voucher_type: "customer_delivery",
        unit: "kg",
        notes: deliveryNotes || '',
        driver_name: driverName || null,
        driver_phone: driverPhone || null,
        vehicle_number: vehicleNumber || null,
        items,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/delivery-hall"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers", "finished-goods-out"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setDeliveryDialogOpen(false);
      setSelectedOrders(new Set());
      setDeliveryWeights({});
      setDeliveryNotes("");
      setDriverName("");
      setDriverPhone("");
      setVehicleNumber("");
      setSelectedDeliveryOrderId(null);
      toast({ title: "تم التسليم بنجاح", description: "تم إنشاء سند تسليم FP-Del" });
    } catch (err: any) {
      toast({ title: t('warehouse.toast.error'), description: err.message || "فشل التسليم", variant: "destructive" });
    }
  };

  const allPoIds = processedOrders
    .filter((o: any) => o.available_for_delivery > 0)
    .map((o: any) => o.production_order_id.toString());

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-orange-600" />
                تسليم العملاء
              </CardTitle>
              <CardDescription className="mt-1">
                أوامر الإنتاج المستلمة في المستودع والمتاحة للتسليم
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={deliveryDialogOpen} onOpenChange={(open) => { setDeliveryDialogOpen(open); if (!open) { setSelectedDeliveryOrderId(null); setDeliveryWeights({}); } }}>
                <DialogTrigger asChild>
                  <Button disabled={selectedOrders.size === 0} className="bg-orange-600 hover:bg-orange-700">
                    <Truck className="h-4 w-4 ml-2" />
                    تسليم المحدد ({selectedOrders.size})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>إنشاء سند تسليم FP-Del</DialogTitle>
                    <DialogDescription>
                      أدخل أوزان التسليم لكل أمر إنتاج
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="py-2 px-3 text-center font-medium">أمر الإنتاج</th>
                            <th className="py-2 px-3 text-center font-medium">المنتج</th>
                            <th className="py-2 px-3 text-center font-medium">المتاح (كجم)</th>
                            <th className="py-2 px-3 text-center font-medium">وزن التسليم (كجم) *</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deliveryTargetOrders.map((order: any) => {
                            const orderId = order.production_order_id.toString();
                            return (
                              <tr key={orderId} className="border-t dark:border-gray-700">
                                <td className="py-2 px-3 text-center font-medium">{order.production_order_number}</td>
                                <td className="py-2 px-3 text-center">{order.product_name_ar || order.product_name}</td>
                                <td className="py-2 px-3 text-center">{order.available_for_delivery.toFixed(2)}</td>
                                <td className="py-2 px-3 text-center">
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max={order.available_for_delivery}
                                    value={deliveryWeights[orderId] || ""}
                                    onChange={(e) => setDeliveryWeights((prev) => ({ ...prev, [orderId]: e.target.value }))}
                                    placeholder="أدخل وزن التسليم"
                                    className="w-32 mx-auto"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-medium">اسم السائق</label>
                        <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="اسم السائق" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">هاتف السائق</label>
                        <Input value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="رقم الهاتف" />
                      </div>
                      <div>
                        <label className="text-sm font-medium">رقم المركبة</label>
                        <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="رقم المركبة" />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('warehouse.labels.notes')}</label>
                      <textarea
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="ملاحظات إضافية"
                        className="w-full min-h-[60px] p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleDeliverySubmit} disabled={deliveryMutation.isPending} className="bg-orange-600 hover:bg-orange-700">
                        {deliveryMutation.isPending ? "جاري الحفظ..." : "تأكيد التسليم"}
                      </Button>
                      <Button variant="outline" onClick={() => { setDeliveryDialogOpen(false); setSelectedDeliveryOrderId(null); }}>
                        {t('warehouse.buttons.cancel')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="mt-2 text-gray-500">{t('warehouse.loading')}</p>
            </div>
          ) : processedOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">لا توجد أوامر إنتاج متاحة للتسليم</div>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrders(new Set(allPoIds))}
                  disabled={allPoIds.length === 0}
                >
                  تحديد الكل ({allPoIds.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedOrders(new Set())}
                  disabled={selectedOrders.size === 0}
                >
                  إلغاء التحديد
                </Button>
              </div>
              {groupedByOrder.map((group) => (
                <div key={group.order_number} className="border rounded-lg overflow-hidden mb-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 px-4 py-2 flex justify-between items-center">
                    <div className="flex gap-4 items-center">
                      <span className="font-bold text-sm">{t('warehouse.production.order')}: {group.order_number}</span>
                    </div>
                    <div className="flex gap-4 items-center">
                      <span className="font-bold text-sm">{group.customer_name_ar || group.customer_name}</span>
                    </div>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="py-2 px-3 w-10"></th>
                        <th className="py-2 px-3 text-center font-medium">أمر الإنتاج</th>
                        <th className="py-2 px-3 text-center font-medium">المنتج</th>
                        <th className="py-2 px-3 text-center font-medium">مستلم (كجم)</th>
                        <th className="py-2 px-3 text-center font-medium">مسلّم (كجم)</th>
                        <th className="py-2 px-3 text-center font-medium">متاح (كجم)</th>
                        <th className="py-2 px-3 text-center font-medium">إجراء</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((order: any) => {
                        const isSelected = selectedOrders.has(order.production_order_id.toString());
                        return (
                          <tr key={order.production_order_id} className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleSelectOrder(order.production_order_id.toString())}
                                className="h-4 w-4 rounded border-gray-300"
                              />
                            </td>
                            <td className="py-2 px-3 text-center font-medium">{order.production_order_number}</td>
                            <td className="py-2 px-3 text-center">{order.product_name_ar || order.product_name}</td>
                            <td className="py-2 px-3 text-center">{order.warehouse_received_kg.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center">{order.warehouse_delivered_kg.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center">
                              <Badge variant={order.available_for_delivery > 0 ? "default" : "secondary"}>
                                {order.available_for_delivery.toFixed(2)}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-center">
                              {order.available_for_delivery > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                  onClick={() => openDeliveryForOrder(order.production_order_id.toString())}
                                >
                                  <Truck className="h-3 w-3 ml-1" />
                                  تسليم
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <VouchersList type="finished-goods-out" title="أرشيف سندات التسليم (FP-Del)" />
    </div>
  );
}

function RawMaterialsSection({ onCreateVoucherIn, onCreateVoucherOut }: { onCreateVoucherIn: () => void; onCreateVoucherOut: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <Tabs defaultValue="rm-rec" className="space-y-4">
        <TabsList>
          <TabsTrigger value="rm-rec">
            <ArrowDownToLine className="h-4 w-4 ml-1" />
            {t('warehouse.production.rmRecVouchers')}
          </TabsTrigger>
          <TabsTrigger value="rm-del">
            <ArrowUpFromLine className="h-4 w-4 ml-1" />
            {t('warehouse.production.rmDelVouchers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rm-rec">
          <div className="mb-3">
            <Button onClick={onCreateVoucherIn} className="bg-green-600 hover:bg-green-700">
              <ArrowDownToLine className="h-4 w-4 ml-2" />
              {t('warehouse.production.rmRecReceiptBtn')}
            </Button>
          </div>
          <VouchersList type="raw-material-in" title={t('warehouse.production.rmRecVouchersTitle')} />
        </TabsContent>
        <TabsContent value="rm-del">
          <div className="mb-3">
            <Button onClick={onCreateVoucherOut} className="bg-red-600 hover:bg-red-700">
              <ArrowUpFromLine className="h-4 w-4 ml-2" />
              {t('warehouse.production.rmDelIssueBtn')}
            </Button>
          </div>
          <VouchersList type="raw-material-out" title={t('warehouse.production.rmDelVouchersTitle')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProductionHallContent({ onCreateVoucher }: { onCreateVoucher: () => void }) {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptWeights, setReceiptWeights] = useState<Record<string, string>>({});
  const [receiptNotes, setReceiptNotes] = useState("");
  const [selectedReceiptOrderId, setSelectedReceiptOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: productionOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/warehouse/production-hall"],
    refetchInterval: 120000,
    staleTime: 90000,
  });

  const processedOrders = useMemo(() => {
    return productionOrders.map((order: any) => ({
      ...order,
      quantity_required: parseFloat(order.quantity_required) || 0,
      total_film_weight: parseFloat(order.total_film_weight) || 0,
      total_print_weight: parseFloat(order.total_print_weight) || 0,
      total_cut_weight: parseFloat(order.total_cut_weight) || 0,
      total_received_weight: parseFloat(order.total_received_weight) || 0,
      waste_weight: parseFloat(order.waste_weight) || 0,
      remaining_to_receive:
        (parseFloat(order.total_cut_weight) || 0) -
        (parseFloat(order.total_received_weight) || 0),
    }));
  }, [productionOrders]);

  const groupedByOrder = useMemo(() => {
    const groups: Record<string, { order_number: string; customer_name: string; customer_name_ar: string; items: any[] }> = {};
    processedOrders.forEach((po: any) => {
      const key = po.order_number || po.order_id;
      if (!groups[key]) {
        groups[key] = {
          order_number: po.order_number,
          customer_name: po.customer_name,
          customer_name_ar: po.customer_name_ar,
          items: [],
        };
      }
      groups[key].items.push(po);
    });
    return Object.values(groups);
  }, [processedOrders]);

  const receiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/warehouse/vouchers/finished-goods-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Receipt save failed");
      return response.json();
    },
  });

  const handleSelectOrder = (productionOrderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(productionOrderId)) {
      newSelection.delete(productionOrderId);
    } else {
      newSelection.add(productionOrderId);
    }
    setSelectedOrders(newSelection);
  };

  const openReceiptForOrder = (productionOrderId: string) => {
    setSelectedReceiptOrderId(productionOrderId);
    setReceiptWeights({});
    setReceiptDialogOpen(true);
  };

  const receiptTargetOrders = useMemo(() => {
    const targetIds = selectedReceiptOrderId
      ? [selectedReceiptOrderId]
      : Array.from(selectedOrders);
    return targetIds
      .map((id) => processedOrders.find((o: any) => o.production_order_id.toString() === id))
      .filter(Boolean);
  }, [selectedReceiptOrderId, selectedOrders, processedOrders]);

  const handleReceiptSubmit = async () => {
    if (!user?.id) {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.loginRequired'), variant: "destructive" });
      return;
    }

    const targetOrders = selectedReceiptOrderId
      ? [selectedReceiptOrderId]
      : Array.from(selectedOrders);

    if (targetOrders.length === 0) {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.selectAtLeastOneOrder'), variant: "destructive" });
      return;
    }

    const ordersWithWeights = targetOrders
      .map((id) => {
        const weight = parseFloat(receiptWeights[id] || "0");
        const order = processedOrders.find((o: any) => o.production_order_id.toString() === id);
        return { id, weight, order };
      })
      .filter((o) => o.weight > 0);

    if (ordersWithWeights.length === 0) {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.enterReceiptWeight'), variant: "destructive" });
      return;
    }

    for (const { id, weight, order } of ordersWithWeights) {
      if (order && weight > order.remaining_to_receive) {
        toast({ title: t('warehouse.toast.error'), description: `${t('warehouse.production.weightExceedsRemaining')} (${order.production_order_number})`, variant: "destructive" });
        return;
      }
    }

    try {
      const nextNumRes = await fetch("/api/warehouse/vouchers/next-number/FP-Rec");
      const { next_number } = await nextNumRes.json();

      const items = ordersWithWeights.map(({ id: productionOrderId, weight, order }) => ({
        production_order_id: parseInt(productionOrderId),
        weight_kg: weight.toString(),
        product_description: order?.product_name_ar || order?.product_name || '',
        customer_id: order?.customer_id,
        customer_name: order?.customer_name_ar || order?.customer_name || '',
        order_number: order?.order_number || '',
      }));

      await receiptMutation.mutateAsync({
        voucher_number: next_number,
        voucher_type: "production_receipt",
        unit: "kg",
        notes: receiptNotes || '',
        items,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/production-hall"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers", "finished-goods-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setReceiptDialogOpen(false);
      setSelectedOrders(new Set());
      setReceiptWeights({});
      setReceiptNotes("");
      setSelectedReceiptOrderId(null);
      toast({ title: t('warehouse.production.receiptSuccess'), description: t('warehouse.production.fpRecCreated') });
    } catch {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.receiptFailed'), variant: "destructive" });
    }
  };

  const allPoIds = processedOrders
    .filter((o: any) => o.remaining_to_receive > 0)
    .map((o: any) => o.production_order_id.toString());

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Factory className="h-5 w-5 text-amber-600" />
                {t('warehouse.production.title')}
              </CardTitle>
              <CardDescription className="mt-1">
                {t('warehouse.production.titleDesc')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={receiptDialogOpen} onOpenChange={(open) => { setReceiptDialogOpen(open); if (!open) { setSelectedReceiptOrderId(null); setReceiptWeights({}); } }}>
                <DialogTrigger asChild>
                  <Button disabled={selectedOrders.size === 0} className="bg-blue-600 hover:bg-blue-700">
                    <ArrowDownToLine className="h-4 w-4 ml-2" />
                    {t('warehouse.production.receiveSelected')} ({selectedOrders.size})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{t('warehouse.production.createFpRecTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('warehouse.production.createFpRecDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="py-2 px-3 text-start font-medium">{t('warehouse.production.productionOrder')}</th>
                            <th className="py-2 px-3 text-start font-medium">{t('warehouse.production.product')}</th>
                            <th className="py-2 px-3 text-start font-medium">{t('warehouse.production.remaining')} ({t('warehouse.units.kilo')})</th>
                            <th className="py-2 px-3 text-start font-medium">{t('warehouse.production.receivedWeight')} ({t('warehouse.units.kilo')}) *</th>
                          </tr>
                        </thead>
                        <tbody>
                          {receiptTargetOrders.map((order: any) => {
                            const orderId = order.production_order_id.toString();
                            return (
                              <tr key={orderId} className="border-t dark:border-gray-700">
                                <td className="py-2 px-3 font-medium">{order.production_order_number}</td>
                                <td className="py-2 px-3">{order.product_name_ar || order.product_name}</td>
                                <td className="py-2 px-3">{order.remaining_to_receive.toFixed(2)}</td>
                                <td className="py-2 px-3">
                                  <Input
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    max={order.remaining_to_receive}
                                    value={receiptWeights[orderId] || ""}
                                    onChange={(e) => setReceiptWeights((prev) => ({ ...prev, [orderId]: e.target.value }))}
                                    placeholder={t('warehouse.production.enterReceivedWeight')}
                                    className="w-32"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <label className="text-sm font-medium">{t('warehouse.labels.notes')}</label>
                      <textarea
                        value={receiptNotes}
                        onChange={(e) => setReceiptNotes(e.target.value)}
                        placeholder={t('warehouse.placeholders.additionalNotes')}
                        className="w-full min-h-[60px] p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleReceiptSubmit} disabled={receiptMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                        {receiptMutation.isPending ? t('warehouse.production.saving') : t('warehouse.production.confirmReceiptBtn')}
                      </Button>
                      <Button variant="outline" onClick={() => { setReceiptDialogOpen(false); setSelectedReceiptOrderId(null); }}>
                        {t('warehouse.buttons.cancel')}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : processedOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Factory className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium">{t('warehouse.production.noMaterialsReadyTitle')}</p>
              <p className="text-sm mt-1">{t('warehouse.production.noMaterialsReadyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allPoIds.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === allPoIds.length && allPoIds.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders(new Set(allPoIds));
                      } else {
                        setSelectedOrders(new Set());
                      }
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{t('warehouse.production.selectAllOrders')} ({allPoIds.length} {t('warehouse.production.productionOrders')} {t('warehouse.production.waitingReceipt')})</span>
                </div>
              )}

              {groupedByOrder.map((group) => (
                <div key={group.order_number} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Hash className="h-4 w-4 text-gray-500" />
                      <span className="font-bold text-sm">{t('warehouse.production.order')}: {group.order_number}</span>
                      <span className="text-gray-400">|</span>
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="font-bold text-sm">{group.customer_name_ar || group.customer_name}</span>
                    </div>
                    <Badge variant="outline">{group.items.length} {t('warehouse.production.productionOrders')}</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-900">
                          <th className="text-right py-2 px-3 font-medium w-10"></th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.productionOrder')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.labels.item')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.requiredQuantity')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.producedFilm')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.printing')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.cutQuantity')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.received')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.remaining')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.waste')}</th>
                          <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.status')}</th>
                          <th className="text-right py-2 px-3 font-medium w-24">{t('warehouse.production.receive')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((order: any) => {
                          const remaining = order.remaining_to_receive;
                          const isSelected = selectedOrders.has(order.production_order_id.toString());

                          return (
                            <tr key={order.production_order_id} className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                              <td className="py-2 px-3">
                                {remaining > 0 && (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleSelectOrder(order.production_order_id.toString())}
                                    className="h-4 w-4"
                                  />
                                )}
                              </td>
                              <td className="py-2 px-3 font-medium">{order.production_order_number}</td>
                              <td className="py-2 px-3">{order.product_name_ar || order.product_name}</td>
                              <td className="py-2 px-3">{order.quantity_required.toFixed(2)}</td>
                              <td className="py-2 px-3">
                                {order.total_film_weight > 0 ? (
                                  <span className="text-blue-600">{order.total_film_weight.toFixed(2)}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {order.total_print_weight > 0 ? (
                                  <span className="text-purple-600">{order.total_print_weight.toFixed(2)}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-green-600 font-medium">{order.total_cut_weight.toFixed(2)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-orange-600 font-medium">{order.total_received_weight.toFixed(2)}</span>
                              </td>
                              <td className="py-2 px-3">
                                <span className={`font-bold ${remaining > 0 ? 'text-purple-600' : 'text-green-600'}`}>
                                  {remaining.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <span className="text-red-600">{order.waste_weight.toFixed(2)}</span>
                              </td>
                              <td className="py-2 px-3">
                                {remaining > 0 ? (
                                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                                    {t('warehouse.production.waitingReceipt')}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 border-green-600">
                                    <CheckCircle className="h-3 w-3 ml-1" />
                                    {t('warehouse.production.complete')}
                                  </Badge>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {remaining > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-xs border-blue-300 text-blue-600 hover:bg-blue-50"
                                    onClick={() => openReceiptForOrder(order.production_order_id.toString())}
                                  >
                                    <ArrowDownToLine className="h-3 w-3 ml-1" />
                                    {t('warehouse.production.receive')}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
