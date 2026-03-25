import { useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useToast } from "../../hooks/use-toast";
import { Scan, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";

type VoucherType = "raw-material-in" | "raw-material-out" | "finished-goods-in" | "finished-goods-out";

interface VoucherFormProps {
  type: VoucherType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoucherForm({ type, open, onOpenChange }: VoucherFormProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const baseSchema = z.object({
    item_id: type === "finished-goods-in" ? z.string().optional() : z.string().min(1, t('warehouse.validation.itemRequired')),
    quantity: z.string().refine(val => parseFloat(val) > 0, t('warehouse.validation.quantityPositive')),
    unit: z.string().default("كيلو"),
    barcode: z.string().optional(),
    batch_number: z.string().optional(),
    notes: z.string().optional(),
    location_id: z.string().optional(),
  });

  const rawMaterialInSchema = baseSchema.extend({
    voucher_type: z.enum(["purchase", "opening_balance", "return"]).default("purchase"),
    supplier_id: z.string().optional(),
    unit_price: z.string().optional(),
    expiry_date: z.string().optional(),
  });

  const rawMaterialOutSchema = baseSchema.extend({
    voucher_type: z.enum(["production_transfer", "return_to_supplier", "adjustment"]).default("production_transfer"),
    to_destination: z.string().optional(),
    issued_to: z.string().optional(),
    production_order_id: z.string().optional(),
  });

  const finishedGoodsInSchema = baseSchema.extend({
    voucher_type: z.enum(["production_receipt", "customer_return", "adjustment"]).default("production_receipt"),
    customer_id: z.string().optional(),
    production_order_id: z.string().min(1, "يجب اختيار أمر الإنتاج"),
    weight_kg: z.string().optional(),
    pieces_count: z.string().optional(),
    from_production_line: z.string().optional(),
    delivered_by: z.string().optional(),
  });

  const finishedGoodsOutSchema = baseSchema.extend({
    voucher_type: z.enum(["customer_delivery", "sample", "adjustment"]).default("customer_delivery"),
    customer_id: z.string().min(1, t('warehouse.validation.customerRequired')),
    driver_name: z.string().optional(),
    driver_phone: z.string().optional(),
    vehicle_number: z.string().optional(),
    delivery_address: z.string().optional(),
    weight_kg: z.string().optional(),
    pieces_count: z.string().optional(),
  });

  const getSchemaForType = (vType: VoucherType) => {
    switch (vType) {
      case "raw-material-in": return rawMaterialInSchema;
      case "raw-material-out": return rawMaterialOutSchema;
      case "finished-goods-in": return finishedGoodsInSchema;
      case "finished-goods-out": return finishedGoodsOutSchema;
    }
  };

  const getTitleForType = (vType: VoucherType) => {
    switch (vType) {
      case "raw-material-in": return t('warehouse.voucherForm.rawMaterialInTitle');
      case "raw-material-out": return t('warehouse.voucherForm.rawMaterialOutTitle');
      case "finished-goods-in": return t('warehouse.voucherForm.finishedGoodsInTitle');
      case "finished-goods-out": return t('warehouse.voucherForm.finishedGoodsOutTitle');
    }
  };

  const schema = getSchemaForType(type);
  
  const form = useForm<Record<string, any>>({
    resolver: zodResolver(schema),
    defaultValues: {
      item_id: "",
      quantity: "",
      unit: "kg",
      barcode: "",
      batch_number: "",
      notes: "",
      location_id: "",
      voucher_type: type === "raw-material-in" ? "purchase" : 
                    type === "raw-material-out" ? "production_transfer" :
                    type === "finished-goods-in" ? "production_receipt" : "customer_delivery",
      supplier_id: "",
      customer_id: "",
      production_order_id: "",
      weight_kg: "",
      driver_name: "",
      driver_phone: "",
      vehicle_number: "",
    },
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const res = await fetch("/api/items");
      return res.json();
    },
  });

  const items = (type === "raw-material-in" || type === "raw-material-out")
    ? (Array.isArray(allItems) ? allItems : []).filter((item: any) => item.category_id === "CAT10")
    : (Array.isArray(allItems) ? allItems : []);

  const { data: locations = [] } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      return res.json();
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    enabled: type === "finished-goods-in" || type === "finished-goods-out",
    queryFn: async () => {
      const res = await fetch("/api/customers");
      return res.json();
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["/api/suppliers"],
    enabled: type === "raw-material-in",
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      return res.json();
    },
  });

  const { data: productionOrders = [] } = useQuery({
    queryKey: ["/api/warehouse/production-orders-for-receipt"],
    enabled: type === "finished-goods-in",
    queryFn: async () => {
      const res = await fetch("/api/warehouse/production-orders-for-receipt");
      return res.json();
    },
  });

  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [remainingKg, setRemainingKg] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedPO(null);
      setRemainingKg(null);
    }
  }, [open]);

  const getVoucherPrefix = (vType: VoucherType) => {
    switch (vType) {
      case "raw-material-in": return "RM-Rec";
      case "raw-material-out": return "RM-Del";
      case "finished-goods-in": return "FP-Rec";
      case "finished-goods-out": return "FP-Del";
    }
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const prefix = getVoucherPrefix(type);
      const numRes = await fetch(`/api/warehouse/vouchers/next-number/${prefix}`);
      const { next_number } = await numRes.json();

      const submitData = { ...data, voucher_number: next_number };
      if (type === "finished-goods-in" && data.weight_kg) {
        submitData.weight_kg = data.weight_kg;
      }

      const response = await fetch(`/api/warehouse/vouchers/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || "فشل في إنشاء السند");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers", type] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/production-orders-for-receipt"] });
      toast({
        title: t('warehouse.toast.savedSuccess'),
        description: t('warehouse.toast.voucherCreated'),
      });
      onOpenChange(false);
      form.reset();
      setSelectedPO(null);
      setRemainingKg(null);
    },
    onError: (error: any) => {
      toast({
        title: t('warehouse.toast.error'),
        description: error.message || t('warehouse.toast.voucherCreateFailed'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  const handleBarcodeScan = () => {
    const barcode = form.getValues("barcode");
    if (barcode) {
      fetch(`/api/warehouse/barcode-lookup/${barcode}`)
        .then(res => res.json())
        .then(data => {
          if (data?.data?.id) {
            form.setValue("item_id", data.data.id);
            toast({ title: t('warehouse.toast.itemFound'), description: data.data.name_ar });
          }
        })
        .catch(() => {
          toast({ title: t('warehouse.toast.barcodeNotFound'), variant: "destructive" });
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>{getTitleForType(type)}</DialogTitle>
          <DialogDescription className="sr-only">{t('warehouse.voucherForm.description')}</DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>{t('warehouse.labels.barcode')}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} placeholder={t('warehouse.placeholders.scanBarcode')} />
                      </FormControl>
                      <Button type="button" variant="outline" onClick={handleBarcodeScan}>
                        <Scan className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="item_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.labels.item')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('warehouse.placeholders.selectItem')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {items.map((item: any) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name_ar || item.name} ({item.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
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
                          <SelectValue placeholder={t('warehouse.placeholders.selectLocation')} />
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.labels.quantity')} *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.001" placeholder="0.000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.labels.unit')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="كيلو">{t('warehouse.units.kilo')}</SelectItem>
                        <SelectItem value="طن">{t('warehouse.units.ton')}</SelectItem>
                        <SelectItem value="قطعة">{t('warehouse.units.piece')}</SelectItem>
                        <SelectItem value="بندل">{t('warehouse.units.bundle')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batch_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.labels.batchNumber')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder={t('warehouse.placeholders.optional')} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {type === "raw-material-in" && (
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.labels.supplier')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('warehouse.placeholders.selectSupplier')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Array.isArray(suppliers) ? suppliers : suppliers?.data || []).map((supplier: any) => (
                          <SelectItem key={supplier.id} value={supplier.id.toString()}>
                            {supplier.name_ar || supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            )}

            {type === "finished-goods-in" && (
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="production_order_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>أمر الإنتاج *</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          const po = (Array.isArray(productionOrders) ? productionOrders : []).find((o: any) => String(o.id) === val);
                          setSelectedPO(po);
                          if (po) {
                            setRemainingKg(po.remaining_kg);
                            form.setValue("weight_kg", String(po.remaining_kg));
                            form.setValue("quantity", String(po.remaining_kg));
                            form.setValue("notes", `استلام من صالة الإنتاج - أمر إنتاج ${po.production_order_number}`);
                          }
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر أمر الإنتاج" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Array.isArray(productionOrders) ? productionOrders : []).map((po: any) => (
                            <SelectItem key={po.id} value={String(po.id)}>
                              {po.production_order_number} - المتبقي: {po.remaining_kg} كجم (من {po.quantity_kg} كجم)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {selectedPO && remainingKg !== null && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="flex justify-between">
                        <span>الكمية الإجمالية: <strong>{selectedPO.quantity_kg} كجم</strong></span>
                        <span>تم استلام: <strong>{selectedPO.warehouse_received_kg} كجم</strong></span>
                        <span>المتبقي: <strong>{remainingKg} كجم</strong></span>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {type === "finished-goods-out" && (
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.labels.customer')} *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('warehouse.placeholders.selectCustomer')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Array.isArray(customers) ? customers : customers?.data || []).map((customer: any) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name_ar || customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {type === "finished-goods-out" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="driver_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouse.labels.driverName')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="driver_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouse.labels.driverPhone')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" dir="ltr" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vehicle_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('warehouse.labels.vehicleNumber')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('warehouse.labels.notes')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder={t('warehouse.placeholders.additionalNotes')} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('warehouse.buttons.cancel')}
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? t('warehouse.buttons.saving') : t('warehouse.buttons.saveVoucher')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default VoucherForm;
