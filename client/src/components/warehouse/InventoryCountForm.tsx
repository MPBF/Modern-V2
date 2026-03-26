import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../../hooks/use-toast";
import { Scan, Check, AlertTriangle, Trash2 } from "lucide-react";

interface InventoryCountFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CountItem {
  item_id: string;
  item_name: string;
  barcode: string;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
  unit: string;
}

export function InventoryCountForm({ open, onOpenChange }: InventoryCountFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [countId, setCountId] = useState<number | null>(null);
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const form = useForm({
    defaultValues: {
      count_type: "periodic",
      location_id: "",
      notes: "",
    },
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      return res.json();
    },
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      return res.json();
    },
  });

  const createCountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/warehouse/inventory-counts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("فشل في إنشاء عملية الجرد");
      return response.json();
    },
    onSuccess: (data) => {
      setCountId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/inventory-counts"] });
      toast({ title: t('warehouse.inventoryCount.countCreated'), description: `${t('warehouse.inventoryCount.countNumber')}: ${data.count_number}` });
    },
    onError: () => {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.inventoryCount.countCreateFailed'), variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/warehouse/inventory-counts/${countId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("فشل في إضافة الصنف");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/inventory-counts"] });
    },
  });

  const completeCountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/warehouse/inventory-counts/${countId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("فشل في إتمام الجرد");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/inventory-counts"] });
      toast({ title: t('warehouse.inventoryCount.countCompleted') });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.inventoryCount.countCompleteFailed'), variant: "destructive" });
    },
  });

  const resetForm = () => {
    setCountId(null);
    setCountItems([]);
    setBarcode("");
    form.reset();
  };

  const handleStartCount = (data: any) => {
    createCountMutation.mutate(data);
  };

  const handleBarcodeScan = async () => {
    if (!barcode.trim()) return;

    const inventoryItem = inventory.find(
      (item: any) => item.item_code === barcode || item.item_id === barcode
    );

    if (inventoryItem) {
      const existingIndex = countItems.findIndex(ci => ci.item_id === inventoryItem.item_id);
      
      if (existingIndex >= 0) {
        const updated = [...countItems];
        updated[existingIndex].counted_quantity += 1;
        updated[existingIndex].difference = updated[existingIndex].counted_quantity - updated[existingIndex].system_quantity;
        setCountItems(updated);
      } else {
        const newItem: CountItem = {
          item_id: inventoryItem.item_id,
          item_name: inventoryItem.item_name_ar || inventoryItem.item_name,
          barcode: barcode,
          system_quantity: parseFloat(inventoryItem.current_stock) || 0,
          counted_quantity: 1,
          difference: 1 - (parseFloat(inventoryItem.current_stock) || 0),
          unit: inventoryItem.unit || "كيلو",
        };
        setCountItems([...countItems, newItem]);
      }
      
      toast({ title: t('warehouse.toast.itemAdded'), description: inventoryItem.item_name_ar });
    } else {
      toast({ title: t('warehouse.toast.barcodeNotFound'), variant: "destructive" });
    }
    
    setBarcode("");
    barcodeInputRef.current?.focus();
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...countItems];
    updated[index].counted_quantity = quantity;
    updated[index].difference = quantity - updated[index].system_quantity;
    setCountItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setCountItems(countItems.filter((_, i) => i !== index));
  };

  const handleCompleteCount = async () => {
    for (const item of countItems) {
      await addItemMutation.mutateAsync({
        item_id: item.item_id,
        barcode: item.barcode,
        system_quantity: item.system_quantity.toString(),
        counted_quantity: item.counted_quantity.toString(),
        unit: item.unit,
      });
    }
    completeCountMutation.mutate();
  };

  useEffect(() => {
    if (open && countId && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [open, countId]);

  const totalDiscrepancies = countItems.filter(item => item.difference !== 0).length;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>
            {countId ? t('warehouse.inventoryCount.countOperation') : t('warehouse.inventoryCount.startNewCount')}
          </DialogTitle>
          <DialogDescription className="sr-only">{t('warehouse.inventoryCount.description')}</DialogDescription>
        </DialogHeader>

        {!countId ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleStartCount)} className="space-y-4">
              <FormField
                control={form.control}
                name="count_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.inventoryCount.countType')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="opening">{t('warehouse.inventoryCount.openingBalance')}</SelectItem>
                        <SelectItem value="periodic">{t('warehouse.inventoryCount.periodicCount')}</SelectItem>
                        <SelectItem value="annual">{t('warehouse.inventoryCount.annualCount')}</SelectItem>
                        <SelectItem value="spot_check">{t('warehouse.inventoryCount.spotCheck')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.labels.location')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('warehouse.inventoryCount.allLocations')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc: any) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name_ar || loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t('warehouse.buttons.cancel')}
                </Button>
                <Button type="submit" disabled={createCountMutation.isPending}>
                  {createCountMutation.isPending ? t('warehouse.buttons.creating') : t('warehouse.inventoryCount.startCount')}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('warehouse.inventoryCount.scanBarcode')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    ref={barcodeInputRef}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
                    placeholder={t('warehouse.inventoryCount.scanBarcodePlaceholder')}
                    className="flex-1"
                    autoFocus
                  />
                  <Button onClick={handleBarcodeScan}>
                    <Scan className="h-4 w-4 ml-2" />
                    {t('warehouse.inventoryCount.scan')}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm">{t('warehouse.inventoryCount.countedItems')} ({countItems.length})</CardTitle>
                  {totalDiscrepancies > 0 && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {totalDiscrepancies} {t('warehouse.inventoryCount.discrepancy')}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {countItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {t('warehouse.inventoryCount.startScanningToAdd')}
                  </div>
                ) : (
                  <Table className="min-w-[500px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right whitespace-nowrap">{t('warehouse.labels.item')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap">{t('warehouse.inventoryCount.systemQuantity')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap">{t('warehouse.inventoryCount.actualCount')}</TableHead>
                        <TableHead className="text-right whitespace-nowrap">{t('warehouse.inventoryCount.difference')}</TableHead>
                        <TableHead className="text-right"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {countItems.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.item_name}</TableCell>
                          <TableCell>{item.system_quantity} {item.unit}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.counted_quantity}
                              onChange={(e) => handleQuantityChange(index, parseFloat(e.target.value) || 0)}
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant={item.difference === 0 ? "default" : "destructive"}>
                              {item.difference > 0 ? "+" : ""}{item.difference.toFixed(2)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                resetForm();
                onOpenChange(false);
              }}>
                {t('warehouse.buttons.cancel')}
              </Button>
              <Button
                onClick={handleCompleteCount}
                disabled={countItems.length === 0 || completeCountMutation.isPending}
              >
                <Check className="h-4 w-4 ml-2" />
                {completeCountMutation.isPending ? t('warehouse.buttons.saving') : t('warehouse.inventoryCount.completeCount')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InventoryCountForm;
