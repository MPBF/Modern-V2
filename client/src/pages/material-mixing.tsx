import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useToast } from "../hooks/use-toast";
import { Beaker, Plus, Trash2, Eye } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import PageLayout from "../components/layout/PageLayout";
import { useAuth } from "../hooks/use-auth";

type Material = {
  id: string;
  item_id: string;
  item_name: string;
  item_name_ar: string;
  weight_kg: string;
  percentage: number;
};

type BatchDetail = {
  id: number;
  batch_number: string;
  production_order_id: number;
  production_order_number?: string;
  machine_id: string;
  machine_name?: string;
  machine_name_ar?: string;
  screw_assignment: string;
  operator_id: number;
  operator_name?: string;
  total_weight_kg: string;
  status: string;
  created_at: string;
  notes?: string;
  composition?: Array<{
    material_name?: string;
    material_name_ar?: string;
    percentage: string;
  }>;
  ingredients?: Array<{
    item_id: string;
    item_name?: string;
    item_name_ar?: string;
    actual_weight_kg: string;
    percentage: string;
  }>;
};

// Helper function to convert master batch code to color name
const getMasterBatchColor = (code: string | null | undefined): string => {
  if (!code) return '';
  
  // Map common codes to Arabic color names
  const colorMap: Record<string, string> = {
    'PT-000000': 'أبيض',
    'PT-111111': 'أسود',
    'PT-CLEAR': 'شفاف',
    'PT-MIX': 'خليط ألوان',
  };
  
  // Check exact match first
  if (colorMap[code]) return colorMap[code];
  
  // Pattern matching for codes
  if (code.startsWith('PT-00')) return 'أبيض';
  if (code.startsWith('PT-11')) return 'أسود';
  if (code.startsWith('PT-12')) return 'أحمر';
  if (code.startsWith('PT-13')) return 'أزرق';
  if (code.startsWith('PT-14')) return 'أخضر';
  if (code.startsWith('PT-15')) return 'أصفر';
  if (code.startsWith('PT-16')) return 'برتقالي';
  if (code.startsWith('PT-17')) return 'بنفسجي';
  if (code.startsWith('PT-18')) return 'بني';
  if (code.startsWith('PT-10')) return 'رمادي';
  
  // Return code if no match (fallback)
  return code;
};

export default function MaterialMixing() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [productionOrderId, setProductionOrderId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [screw, setScrew] = useState("A");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetail | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Fetch data - get in_production and pending production orders
  const { data: productionOrdersData, isLoading: ordersLoading } = useQuery<any>({
    queryKey: ["/api/production-orders"],
  });
  
  // Handle both response formats: direct array or {data: array}
  const allProductionOrders = Array.isArray(productionOrdersData) 
    ? productionOrdersData 
    : (productionOrdersData?.data || []);
  const productionOrders = allProductionOrders.filter(
    (po: any) => po.status === 'in_production' || po.status === 'pending'
  );

  const { data: machinesData, isLoading: machinesLoading } = useQuery<any>({
    queryKey: ["/api/machines"],
  });
  
  // Handle both response formats: direct array or {data: array}
  const allMachines = Array.isArray(machinesData)
    ? machinesData
    : (machinesData?.data || []);
  const machines = allMachines.filter(
    (machine: any) => machine.type === 'extruder'
  );

  const { data: itemsData, isLoading: itemsLoading } = useQuery<any>({
    queryKey: ["/api/items"],
  });
  const rawMaterials = (itemsData?.data || itemsData || []).filter(
    (item: any) => item.category_id === "CAT10"
  );

  const { data: batchesData, isLoading: batchesLoading } = useQuery<{ data: BatchDetail[] }>({
    queryKey: ["/api/mixing-batches"],
  });
  const batches = batchesData?.data || [];

  const { data: usersData } = useQuery<any>({ queryKey: ["/api/users"] });
  const users = usersData?.data || usersData || [];

  // Calculate total weight and auto-update percentages
  const totalWeight = materials.reduce(
    (sum, m) => sum + (parseFloat(m.weight_kg) || 0),
    0
  );

  const updatePercentages = (mats: Material[]) => {
    const total = mats.reduce((sum, m) => sum + (parseFloat(m.weight_kg) || 0), 0);
    return mats.map(m => ({
      ...m,
      percentage: total > 0 ? (parseFloat(m.weight_kg) / total) * 100 : 0
    }));
  };

  // Add material
  const addMaterial = () => {
    if (materials.length >= 10) {
      toast({
        title: t("common.warning"),
        description: t("mixing.messages.maxMaterials"),
        variant: "destructive",
      });
      return;
    }
    const newMaterial: Material = {
      id: Math.random().toString(36).substr(2, 9),
      item_id: "",
      item_name: "",
      item_name_ar: "",
      weight_kg: "",
      percentage: 0,
    };
    setMaterials([...materials, newMaterial]);
  };

  // Remove material
  const removeMaterial = (id: string) => {
    const updated = materials.filter(m => m.id !== id);
    setMaterials(updatePercentages(updated));
  };

  // Update material item
  const updateMaterialItem = (id: string, itemId: string) => {
    const item = rawMaterials.find((i: any) => i.id === itemId);
    const updated = materials.map(m =>
      m.id === id
        ? {
            ...m,
            item_id: itemId,
            item_name: item?.name || "",
            item_name_ar: item?.name_ar || "",
          }
        : m
    );
    setMaterials(updated);
  };

  // Update material weight
  const updateMaterialWeight = (id: string, weight: string) => {
    const updated = materials.map(m => (m.id === id ? { ...m, weight_kg: weight } : m));
    setMaterials(updatePercentages(updated));
  };

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/mixing-batches", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: t("mixing.messages.batchCreated"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mixing-batches"] });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("mixing.messages.batchCreateError"),
        variant: "destructive",
      });
    },
  });

  // Reset form
  const resetForm = () => {
    setProductionOrderId("");
    setMachineId("");
    setScrew("A");
    setMaterials([]);
  };

  const handleSave = () => {
    if (!productionOrderId) {
      toast({ title: t("common.error"), description: t("mixing.messages.selectProductionOrder"), variant: "destructive" });
      return;
    }
    if (!machineId) {
      toast({ title: t("common.error"), description: t("mixing.messages.selectMachine"), variant: "destructive" });
      return;
    }
    if (materials.length === 0) {
      toast({ title: t("common.error"), description: t("mixing.messages.addOneMaterial"), variant: "destructive" });
      return;
    }
    if (materials.some(m => !m.item_id || !m.weight_kg || parseFloat(m.weight_kg) <= 0)) {
      toast({ title: t("common.error"), description: t("mixing.messages.checkMaterialData"), variant: "destructive" });
      return;
    }

    const batch = {
      production_order_id: parseInt(productionOrderId),
      machine_id: machineId,
      screw_assignment: screw,
      operator_id: user?.id || 1,
      total_weight_kg: totalWeight.toString(),
      status: "completed",
    };

    const ingredients = materials.map(m => ({
      item_id: m.item_id,
      actual_weight_kg: m.weight_kg,
      percentage: m.percentage.toFixed(2),
    }));

    createBatchMutation.mutate({ batch, ingredients });
  };

  // View batch details
  const viewBatchDetails = (batch: BatchDetail) => {
    setSelectedBatch(batch);
    setDetailsDialogOpen(true);
  };

  return (
    <PageLayout title={t("mixing.title")}>
      <div className="max-w-7xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {t("mixing.createBatch")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>{t("mixing.productionOrder")}</Label>
                    {ordersLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select value={productionOrderId} onValueChange={setProductionOrderId}>
                        <SelectTrigger data-testid="select-production-order">
                          <SelectValue placeholder={t("mixing.selectProductionOrder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {productionOrders.map((order: any) => (
                            <SelectItem key={order.id} value={order.id.toString()}>
                              <div className="flex flex-col gap-1">
                                <div className="font-semibold">{order.production_order_number}</div>
                                <div className="text-sm text-gray-600">
                                  {order.item_name_ar || order.item_name} | 
                                  {' '}{order.raw_material}
                                  {order.master_batch_id && ` | ${getMasterBatchColor(order.master_batch_id)}`} | 
                                  {' '}{parseFloat(order.final_quantity_kg || order.quantity_kg || 0).toFixed(2)} كجم |
                                  {' '}{order.customer_name_ar || order.customer_name}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("mixing.filmMachine")}</Label>
                    {machinesLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select value={machineId} onValueChange={setMachineId}>
                        <SelectTrigger data-testid="select-machine">
                          <SelectValue placeholder={t("mixing.selectMachine")} />
                        </SelectTrigger>
                        <SelectContent>
                          {machines.map((machine: any) => (
                            <SelectItem key={machine.id} value={machine.id}>
                              {machine.name_ar || machine.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>{t("mixing.screw")}</Label>
                    <RadioGroup value={screw} onValueChange={setScrew}>
                      <div className="flex gap-4">
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="A" id="screw-a" data-testid="radio-screw-a" />
                          <Label htmlFor="screw-a">A</Label>
                        </div>
                        <div className="flex items-center space-x-2 space-x-reverse">
                          <RadioGroupItem value="B" id="screw-b" data-testid="radio-screw-b" />
                          <Label htmlFor="screw-b">B</Label>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-lg font-semibold">{t("mixing.rawMaterials")}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMaterial}
                      data-testid="button-add-material"
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      {t("mixing.addMaterial")}
                    </Button>
                  </div>

                  {materials.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      {t("mixing.noMaterials")}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {materials.map((material, index) => (
                        <div
                          key={material.id}
                          className="grid grid-cols-12 gap-2 items-end"
                          data-testid={`material-row-${index}`}
                        >
                          <div className="col-span-5 space-y-1">
                            <Label className="text-xs">{t("mixing.material")}</Label>
                            {itemsLoading ? (
                              <Skeleton className="h-10 w-full" />
                            ) : (
                              <Select
                                value={material.item_id}
                                onValueChange={(val) => updateMaterialItem(material.id, val)}
                              >
                                <SelectTrigger data-testid={`select-material-${index}`}>
                                  <SelectValue placeholder={t("mixing.selectMaterial")} />
                                </SelectTrigger>
                                <SelectContent>
                                  {rawMaterials.map((item: any) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name_ar || item.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </div>

                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">{t("mixing.weightKg")}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={material.weight_kg}
                              onChange={(e) => updateMaterialWeight(material.id, e.target.value)}
                              placeholder="0.00"
                              data-testid={`input-weight-${index}`}
                            />
                          </div>

                          <div className="col-span-3 space-y-1">
                            <Label className="text-xs">{t("mixing.percentage")}</Label>
                            <Input
                              type="text"
                              value={material.percentage.toFixed(2) + "%"}
                              disabled
                              className="bg-gray-100"
                              data-testid={`text-percentage-${index}`}
                            />
                          </div>

                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              onClick={() => removeMaterial(material.id)}
                              data-testid={`button-remove-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {materials.length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center text-lg font-semibold">
                        <span>{t("mixing.totalWeight")}</span>
                        <span data-testid="text-total-weight">{totalWeight.toFixed(2)} {t("common.kg")}</span>
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleSave}
                  disabled={createBatchMutation.isPending}
                  className="w-full"
                  data-testid="button-save-batch"
                >
                  {createBatchMutation.isPending ? t("mixing.saving") : t("mixing.saveBatch")}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("mixing.batchHistory")}</CardTitle>
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : batches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    {t("mixing.noBatches")}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">{t("mixing.batchNumber")}</TableHead>
                          <TableHead className="text-right">{t("mixing.productionOrder")}</TableHead>
                          <TableHead className="text-right">{t("mixing.machine")}</TableHead>
                          <TableHead className="text-right">{t("mixing.screw")}</TableHead>
                          <TableHead className="text-right">{t("mixing.totalWeightKg")}</TableHead>
                          <TableHead className="text-right">{t("mixing.date")}</TableHead>
                          <TableHead className="text-right">{t("mixing.operator")}</TableHead>
                          <TableHead className="text-right">{t("mixing.composition")}</TableHead>
                          <TableHead className="text-right">{t("mixing.actions")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {batches.map((batch) => {
                          const operator = users.find((u: any) => u.id === batch.operator_id);
                          return (
                            <TableRow
                              key={batch.id}
                              className="cursor-pointer hover:bg-gray-50"
                              data-testid={`row-batch-${batch.id}`}
                            >
                              <TableCell className="font-medium">
                                {batch.batch_number}
                              </TableCell>
                              <TableCell>
                                {batch.production_order_number || `PO-${batch.production_order_id}`}
                              </TableCell>
                              <TableCell>
                                {batch.machine_name_ar || batch.machine_name || batch.machine_id}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{batch.screw_assignment}</Badge>
                              </TableCell>
                              <TableCell>{parseFloat(batch.total_weight_kg).toFixed(2)} كجم</TableCell>
                              <TableCell>
                                {new Date(batch.created_at).toLocaleDateString("ar-EG")}
                              </TableCell>
                              <TableCell>
                                {operator?.display_name_ar || operator?.display_name || "-"}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm space-y-0.5">
                                  {batch.composition && batch.composition.length > 0 ? (
                                    batch.composition.map((comp: any, idx: number) => (
                                      <div key={idx} className="text-xs">
                                        <span className="font-medium">{comp.material_name_ar || comp.material_name}</span>
                                        <span className="text-muted-foreground"> ({comp.percentage})</span>
                                      </div>
                                    ))
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => viewBatchDetails(batch)}
                                  data-testid={`button-view-${batch.id}`}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{t("mixing.batchDetails")}</DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">{t("mixing.batchNumber")}</Label>
                  <p className="font-semibold">{selectedBatch.batch_number}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("mixing.productionOrder")}</Label>
                  <p className="font-semibold">
                    {selectedBatch.production_order_number || `PO-${selectedBatch.production_order_id}`}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("mixing.machine")}</Label>
                  <p className="font-semibold">
                    {selectedBatch.machine_name_ar || selectedBatch.machine_name || selectedBatch.machine_id}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("mixing.screw")}</Label>
                  <p className="font-semibold">{selectedBatch.screw_assignment}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("mixing.totalWeightKg")}</Label>
                  <p className="font-semibold">{parseFloat(selectedBatch.total_weight_kg).toFixed(2)} {t("common.kg")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">{t("mixing.date")}</Label>
                  <p className="font-semibold">
                    {new Date(selectedBatch.created_at).toLocaleString("ar-EG")}
                  </p>
                </div>
              </div>

              {selectedBatch.ingredients && selectedBatch.ingredients.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-lg font-semibold">{t("mixing.ingredients")}</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">{t("mixing.ingredientName")}</TableHead>
                        <TableHead className="text-right">{t("mixing.weightKg")}</TableHead>
                        <TableHead className="text-right">{t("mixing.percentage")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatch.ingredients.map((ingredient, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            {ingredient.item_name_ar || ingredient.item_name || ingredient.item_id}
                          </TableCell>
                          <TableCell>{parseFloat(ingredient.actual_weight_kg).toFixed(2)}</TableCell>
                          <TableCell>{parseFloat(ingredient.percentage).toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {selectedBatch.notes && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">ملاحظات</Label>
                  <p className="text-sm">{selectedBatch.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
