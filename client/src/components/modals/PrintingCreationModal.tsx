// src/components/modals/PrintingCreationModal.tsx
import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import NumberInput from "@shared/NumberInput";
import { ProductionOrderSelect } from "@shared/ProductionOrderSelect";
import { MachineSelect } from "@shared/MachineSelect";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import type { ProductionOrder, Machine } from "../../../../shared/schema";
import { useRemainingQuantity } from "../../hooks/useRemainingQuantity";

const printingFormSchema = z.object({
  production_order_id: z.number().min(1, "يرجى اختيار أمر الإنتاج"),
  machine_id: z.number().int().positive("يرجى اختيار المكينة"),
  ink_set_id: z.number().int().positive("يرجى اختيار طقم الأحبار"),
  weight_kg: z
    .string()
    .min(1, "يرجى إدخال الوزن")
    .refine((val) => {
      const num = Number.parseFloat(val.replace(",", "."));
      return !Number.isNaN(num) && num > 0;
    }, "الوزن يجب أن يكون رقمًا أكبر من 0"),
});

export type PrintingFormData = z.infer<typeof printingFormSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedProductionOrderId?: number;
}

export default function PrintingCreationModal({ isOpen, onClose, selectedProductionOrderId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<PrintingFormData>({
    resolver: zodResolver(printingFormSchema),
    defaultValues: {
      production_order_id: selectedProductionOrderId,
      machine_id: undefined as unknown as number,
      ink_set_id: undefined as unknown as number,
      weight_kg: "",
    },
    mode: "onChange",
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/production-orders"],
    enabled: isOpen,
  });
  const { data: machines = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  });
  const { data: sections = [] } = useQuery<any[]>({
    queryKey: ["/api/sections"],
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  });
  const { data: rolls = [] } = useQuery<any[]>({
    queryKey: ["/api/rolls"],
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === (selectedProductionOrderId ?? form.getValues("production_order_id"))) || null,
    [orders, selectedProductionOrderId]
  );

  const remaining = useRemainingQuantity(selectedOrder as any, rolls);

  useEffect(() => {
    if (!isOpen) return;
    if (selectedProductionOrderId && selectedProductionOrderId > 0) {
      form.setValue("production_order_id", selectedProductionOrderId, { shouldValidate: true });
    } else if (!form.getValues("production_order_id") && orders.length > 0) {
      form.setValue("production_order_id", orders[0].id, { shouldValidate: true });
    }
    if (!form.getValues("weight_kg") && remaining > 0) {
      form.setValue("weight_kg", String(remaining));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, selectedProductionOrderId, orders.length, remaining]);

  const createMutation = useMutation({
    mutationFn: async (data: PrintingFormData) => {
      const weightParsed = Number.parseFloat(data.weight_kg.replace(",", "."));
      const response = await apiRequest("/api/printing-jobs", {
        method: "POST",
        body: JSON.stringify({ ...data, weight_kg: weightParsed }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "فشل الطلب");
      }
      return response.json();
    },
    onSuccess: () => {
      ["/api/rolls", "/api/production-orders", "/api/production/printing-queue"].forEach((key) =>
        queryClient.invalidateQueries({ queryKey: [key] })
      );
      toast({ title: "تم إنشاء مهمة الطباعة", description: "تمت الإضافة بنجاح" });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      const msg = String(error?.message || "");
      toast({
        title: "خطأ في إنشاء مهمة الطباعة",
        description: /REMAINING_QUANTITY_EXCEEDED/.test(msg)
          ? "الوزن المطلوب يتجاوز المتبقي وفق تحقق الخادم. قم بتحديث الصفحة وحاول بقيمة أقل."
          : /Network error|Failed to fetch/i.test(msg)
          ? "تعذر الاتصال بالخادم"
          : msg,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PrintingFormData) => {
    const weightParsed = Number.parseFloat(data.weight_kg.replace(",", "."));
    if (remaining > 0 && weightParsed > remaining + 0.0001) {
      toast({ title: "قيمة الوزن تتجاوز المتبقي", description: `المتبقي: ${remaining.toFixed(2)} كجم`, variant: "destructive" });
      return;
    }
    createMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" aria-describedby="printing-creation-description">
        <DialogHeader>
          <DialogTitle>إنشاء مهمة طباعة</DialogTitle>
          <DialogDescription id="printing-creation-description">إضافة مهمة طباعة للرول/الطلب المحدد</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!selectedProductionOrderId && (
              <FormField
                control={form.control}
                name="production_order_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>أمر الإنتاج *</FormLabel>
                    <ProductionOrderSelect value={field.value} onChange={field.onChange} loading={ordersLoading} orders={orders} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {selectedProductionOrderId && (
              <div className="space-y-2">
                <Label>أمر الإنتاج المحدد</Label>
                <div className="p-3 bg-gray-50 rounded-md border">
                  <p className="font-medium text-sm">
                    {selectedOrder?.production_order_number || `PO-${selectedProductionOrderId}`}
                  </p>
                  <p className="text-xs text-gray-600">
                    {`${(selectedOrder as any)?.customer_name_ar || (selectedOrder as any)?.customer_name || "غير محدد"} - ${(selectedOrder as any)?.item_name_ar || (selectedOrder as any)?.item_name || (selectedOrder as any)?.size_caption || "غير محدد"}`}
                  </p>
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="weight_kg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الوزن (كجم) *</FormLabel>
                  <FormControl>
                    <NumberInput value={field.value} onChange={field.onChange} placeholder="45.2" />
                  </FormControl>
                  {selectedOrder && <p className="text-xs text-gray-600">المتبقي: <span className="font-medium">{remaining.toFixed(2)} كجم</span></p>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="machine_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المكينة *</FormLabel>
                  <MachineSelect value={field.value} onChange={field.onChange} loading={machinesLoading} machines={machines} sections={sections} sectionKeyword="printing" />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ink_set_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>طقم الأحبار *</FormLabel>
                  <NumberInput value={String(field.value ?? "")} onChange={(v: string) => field.onChange(Number.parseInt(v || "0", 10))} placeholder="أدخل رقم طقم الأحبار" />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 rtl:space-x-reverse">
              <Button type="button" variant="outline" onClick={onClose} disabled={createMutation.isPending}>إلغاء</Button>
              <Button type="submit" className="btn-primary" disabled={createMutation.isPending || remaining === 0}>
                {createMutation.isPending ? "جاري الإنشاء..." : remaining === 0 ? "اكتملت الكمية" : "إنشاء مهمة"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
