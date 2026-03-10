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
      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={onCreateVoucherIn} className="bg-blue-600 hover:bg-blue-700">
          <ArrowDownToLine className="h-4 w-4 ml-2" />
          {t('warehouse.production.fpRecReceiptBtn')}
        </Button>
        <Button onClick={onCreateVoucherOut} className="bg-orange-600 hover:bg-orange-700">
          <Truck className="h-4 w-4 ml-2" />
          {t('warehouse.production.fpDelDeliveryBtn')}
        </Button>
      </div>

      <Tabs defaultValue="fp-rec" className="space-y-4">
        <TabsList>
          <TabsTrigger value="fp-rec">
            <ArrowDownToLine className="h-4 w-4 ml-1" />
            {t('warehouse.production.fpRecVouchers')}
          </TabsTrigger>
          <TabsTrigger value="fp-del">
            <Truck className="h-4 w-4 ml-1" />
            {t('warehouse.production.fpDelVouchers')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fp-rec">
          <VouchersList type="finished-goods-in" title={t('warehouse.production.fpRecVouchersTitle')} />
        </TabsContent>
        <TabsContent value="fp-del">
          <VouchersList type="finished-goods-out" title={t('warehouse.production.fpDelVouchersTitle')} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RawMaterialsSection({ onCreateVoucherIn, onCreateVoucherOut }: { onCreateVoucherIn: () => void; onCreateVoucherOut: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 mb-4">
        <Button onClick={onCreateVoucherIn} className="bg-green-600 hover:bg-green-700">
          <ArrowDownToLine className="h-4 w-4 ml-2" />
          {t('warehouse.production.rmRecReceiptBtn')}
        </Button>
        <Button onClick={onCreateVoucherOut} className="bg-red-600 hover:bg-red-700">
          <ArrowUpFromLine className="h-4 w-4 ml-2" />
          {t('warehouse.production.rmDelIssueBtn')}
        </Button>
      </div>

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
          <VouchersList type="raw-material-in" title={t('warehouse.production.rmRecVouchersTitle')} />
        </TabsContent>
        <TabsContent value="rm-del">
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
  const [receiptWeight, setReceiptWeight] = useState("");
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/production-hall"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers", "finished-goods-in"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setReceiptDialogOpen(false);
      setSelectedOrders(new Set());
      setReceiptWeight("");
      setReceiptNotes("");
      setSelectedReceiptOrderId(null);
      toast({ title: t('warehouse.production.receiptSuccess'), description: t('warehouse.production.fpRecCreated') });
    },
    onError: () => {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.receiptFailed'), variant: "destructive" });
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
    setReceiptDialogOpen(true);
  };

  const handleReceiptSubmit = async () => {
    if (!receiptWeight || parseFloat(receiptWeight) <= 0) {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.enterReceiptWeight'), variant: "destructive" });
      return;
    }
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

    try {
      const nextNumRes = await fetch("/api/warehouse/vouchers/next-number/FP-Rec");
      const { next_number } = await nextNumRes.json();

      const totalWeight = parseFloat(receiptWeight);
      const numOrders = targetOrders.length;
      const baseWeight = Math.floor((totalWeight * 1000) / numOrders) / 1000;
      const remainder = totalWeight - baseWeight * numOrders;

      for (let index = 0; index < targetOrders.length; index++) {
        const productionOrderId = targetOrders[index];
        const weight = index === numOrders - 1 ? baseWeight + remainder : baseWeight;
        const order = processedOrders.find((o: any) => o.production_order_id.toString() === productionOrderId);

        const voucherNum = index === 0 ? next_number : undefined;

        await receiptMutation.mutateAsync({
          voucher_number: voucherNum,
          voucher_type: "production_receipt",
          production_order_id: parseInt(productionOrderId),
          order_id: order?.order_id,
          customer_id: order?.customer_id,
          quantity: weight.toString(),
          weight_kg: weight.toString(),
          unit: "kg",
          notes: receiptNotes || `${t('warehouse.production.receiptFromProduction')} ${order?.production_order_number}`,
          product_description: order?.product_name_ar || order?.product_name,
        });
      }
    } catch {
      // handled by mutation onError
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
              <Dialog open={receiptDialogOpen} onOpenChange={(open) => { setReceiptDialogOpen(open); if (!open) setSelectedReceiptOrderId(null); }}>
                <DialogTrigger asChild>
                  <Button disabled={selectedOrders.size === 0} className="bg-blue-600 hover:bg-blue-700">
                    <ArrowDownToLine className="h-4 w-4 ml-2" />
                    {t('warehouse.production.receiveSelected')} ({selectedOrders.size})
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('warehouse.production.createFpRecTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('warehouse.production.createFpRecDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {selectedReceiptOrderId && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                        <span className="font-medium">{t('warehouse.production.productionOrder')}: </span>
                        {processedOrders.find((o: any) => o.production_order_id.toString() === selectedReceiptOrderId)?.production_order_number}
                        <span className="mx-2">|</span>
                        <span className="font-medium">{t('warehouse.production.remaining')}: </span>
                        {processedOrders.find((o: any) => o.production_order_id.toString() === selectedReceiptOrderId)?.remaining_to_receive.toFixed(2)} {t('warehouse.units.kilo')}
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium">{t('warehouse.production.receivedWeight')} ({t('warehouse.units.kilo')}) *</label>
                      <Input
                        type="number"
                        step="0.001"
                        value={receiptWeight}
                        onChange={(e) => setReceiptWeight(e.target.value)}
                        placeholder={t('warehouse.production.enterReceivedWeight')}
                      />
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
