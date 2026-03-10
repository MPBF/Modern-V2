import { useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { useToast } from "../../hooks/use-toast";
import { Scan } from "lucide-react";

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
    item_id: z.string().min(1, t('warehouse.validation.itemRequired')),
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
    production_order_id: z.string().optional(),
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
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      item_id: "",
      quantity: "",
      unit: "كيلو",
      barcode: "",
      batch_number: "",
      notes: "",
      location_id: "",
      voucher_type: type === "raw-material-in" ? "purchase" : 
                    type === "raw-material-out" ? "production_transfer" :
                    type === "finished-goods-in" ? "production_receipt" : "customer_delivery",
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const res = await fetch("/api/items");
      return res.json();
    },
  });

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

      const response = await fetch(`/api/warehouse/vouchers/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, voucher_number: next_number }),
      });
      if (!response.ok) throw new Error("فشل في إنشاء السند");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers", type] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: t('warehouse.toast.savedSuccess'),
        description: t('warehouse.toast.voucherCreated'),
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: t('warehouse.toast.error'),
        description: t('warehouse.toast.voucherCreateFailed'),
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-3 gap-4">
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

            {(type === "finished-goods-in" || type === "finished-goods-out") && (
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('warehouse.labels.customer')} {type === "finished-goods-out" && "*"}</FormLabel>
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
              <div className="grid grid-cols-3 gap-4">
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
