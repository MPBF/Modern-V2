import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
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

const baseSchema = z.object({
  item_id: z.string().min(1, "الصنف مطلوب"),
  quantity: z.string().refine(val => parseFloat(val) > 0, "الكمية يجب أن تكون أكبر من صفر"),
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
  customer_id: z.string().min(1, "العميل مطلوب"),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
  vehicle_number: z.string().optional(),
  delivery_address: z.string().optional(),
  weight_kg: z.string().optional(),
  pieces_count: z.string().optional(),
});

const getSchemaForType = (type: VoucherType) => {
  switch (type) {
    case "raw-material-in": return rawMaterialInSchema;
    case "raw-material-out": return rawMaterialOutSchema;
    case "finished-goods-in": return finishedGoodsInSchema;
    case "finished-goods-out": return finishedGoodsOutSchema;
  }
};

const getTitleForType = (type: VoucherType) => {
  switch (type) {
    case "raw-material-in": return "سند إدخال مواد خام";
    case "raw-material-out": return "سند إخراج مواد خام";
    case "finished-goods-in": return "سند استلام مواد تامة";
    case "finished-goods-out": return "سند إخراج مواد تامة";
  }
};

export function VoucherForm({ type, open, onOpenChange }: VoucherFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/warehouse/vouchers/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("فشل في إنشاء السند");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/warehouse/vouchers/${type}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم إنشاء السند بنجاح",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في إنشاء السند",
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
            toast({ title: "تم العثور على الصنف", description: data.data.name_ar });
          }
        })
        .catch(() => {
          toast({ title: "لم يتم العثور على الباركود", variant: "destructive" });
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitleForType(type)}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex gap-2">
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>الباركود</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} placeholder="امسح الباركود أو أدخله يدوياً" />
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
                    <FormLabel>الصنف *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الصنف" />
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
                    <FormLabel>الموقع</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الموقع" />
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
                    <FormLabel>الكمية *</FormLabel>
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
                    <FormLabel>الوحدة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="كيلو">كيلو</SelectItem>
                        <SelectItem value="طن">طن</SelectItem>
                        <SelectItem value="قطعة">قطعة</SelectItem>
                        <SelectItem value="بندل">بندل</SelectItem>
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
                    <FormLabel>رقم الدفعة</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="اختياري" />
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
                    <FormLabel>المورد</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المورد" />
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
                    <FormLabel>العميل {type === "finished-goods-out" && "*"}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العميل" />
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
                      <FormLabel>اسم السائق</FormLabel>
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
                      <FormLabel>رقم السائق</FormLabel>
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
                      <FormLabel>رقم السيارة</FormLabel>
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
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="ملاحظات إضافية..." />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "جاري الحفظ..." : "حفظ السند"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default VoucherForm;
