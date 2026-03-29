import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Search, Plus, Trash2 } from "lucide-react";
import { formatNumber, formatWeight, formatPercentage } from "../../lib/formatNumber";

interface MasterBatchColor {
  id: string;
  name: string;
  name_ar: string;
  color_hex: string;
  aliases?: string;
}

const ColorBadge = ({ color, code, nameAr }: { color: string; code: string; nameAr: string }) => {
  const displayColor = !color || color === "transparent" ? "#E0E0E0" : color;
  const isLight = displayColor.toLowerCase() === "#ffffff" || displayColor.toLowerCase() === "#e0e0e0";
  
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-purple-50">
      <span
        className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0"
        style={{ backgroundColor: displayColor }}
      />
      <span className={`text-purple-600 font-semibold text-xs`}>
        {nameAr}
      </span>
    </span>
  );
};

const createOrderFormSchema = (t: (key: string) => string) => z.object({
  customer_id: z.string().min(1, t('orders.validation.customerRequired')),
  delivery_days: z.coerce.number().int().positive().max(365, t('orders.validation.deliveryDaysRange')),
  notes: z.string().optional(),
});

interface OrdersFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, productionOrders: any[]) => void;
  customers: any[];
  customerProducts: any[];
  items: any[];
  editingOrder?: any;
}

type ProdOrderInForm = {
  uid: string;
  id?: number;
  customer_product_id: number | null;
  quantity_kg: number | null;
  overrun_percentage: number;
};

const genUid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `po-${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function OrdersForm({
  isOpen,
  onClose,
  onSubmit,
  customers,
  customerProducts,
  items,
  editingOrder,
}: OrdersFormProps) {
  const { t } = useTranslation();
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [productionOrdersInForm, setProductionOrdersInForm] = useState<ProdOrderInForm[]>([]);
  const [quantityPreviews, setQuantityPreviews] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: masterBatchColors = [] } = useQuery<MasterBatchColor[]>({
    queryKey: ["/api/master-batch-colors"],
    queryFn: async () => {
      const response = await fetch("/api/master-batch-colors");
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || result || [];
    },
  });

  const findColorByCode = (code: string): MasterBatchColor | undefined => {
    if (!code) return undefined;
    const normalizedCode = code.toUpperCase().trim();
    return masterBatchColors.find((c) => {
      if (!c || !c.id) return false;
      if (c.id.toUpperCase() === normalizedCode) return true;
      if (c.aliases) {
        const aliasArr = c.aliases.split(",").map((a) => a.trim().toUpperCase());
        return aliasArr.includes(normalizedCode);
      }
      return false;
    });
  };

  const getMasterBatchDisplay = (masterBatchId: string) => {
    if (!masterBatchId) return null;
    const colorData = findColorByCode(masterBatchId);
    if (colorData) {
      return <ColorBadge color={colorData.color_hex} code={colorData.id} nameAr={colorData.name_ar} />;
    }
    return <span className="text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded">{masterBatchId}</span>;
  };

  const getMasterBatchText = (masterBatchId: string): string => {
    if (!masterBatchId) return t('common.notSpecified');
    const colorData = findColorByCode(masterBatchId);
    return colorData ? colorData.name_ar : masterBatchId;
  };

  const orderFormSchema = createOrderFormSchema(t);
  const orderForm = useForm({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customer_id: "",
      delivery_days: 15,
      notes: "",
    },
  });

  // Load editing order data when dialog opens for editing
  useEffect(() => {
    const loadEditingOrderData = async () => {
      if (isOpen && editingOrder) {
        // Load order data
        orderForm.reset({
          customer_id: editingOrder.customer_id != null ? String(editingOrder.customer_id) : "",
          delivery_days: editingOrder.delivery_days || 15,
          notes: editingOrder.notes || "",
        });
        setSelectedCustomerId(editingOrder.customer_id != null ? String(editingOrder.customer_id) : "");

        // Load existing production orders for this order
        try {
          const response = await fetch(`/api/production-orders?order_id=${editingOrder.id}`);
          if (response.ok) {
            const rawData = await response.json();
            const existingProdOrders = Array.isArray(rawData) ? rawData : (rawData.data || []);

            // Convert existing production orders to form format with stable uid
            const formattedOrders: ProdOrderInForm[] = existingProdOrders.map((po: any) => ({
              uid: po.id ? `po-${po.id}` : genUid(),
              id: po.id,
              customer_product_id: po.customer_product_id ?? null,
              quantity_kg: po.quantity_kg != null ? parseFloat(po.quantity_kg) : null,
              overrun_percentage: po.overrun_percentage != null ? parseFloat(po.overrun_percentage) : 0,
            }));

            setProductionOrdersInForm(formattedOrders);

            // Load previews for existing orders in parallel
            await Promise.all(
              formattedOrders.map((order) =>
                order.customer_product_id && order.quantity_kg && order.quantity_kg > 0
                  ? updateQuantityPreview(order.uid, order.customer_product_id, order.quantity_kg)
                  : Promise.resolve()
              )
            );
          }
        } catch (error) {
          console.error("فشل تحميل أوامر الإنتاج:", error);
          setProductionOrdersInForm([]);
        }
      } else if (isOpen && !editingOrder) {
        // Reset form for new order
        orderForm.reset({
          customer_id: "",
          delivery_days: 15,
          notes: "",
        });
        setSelectedCustomerId("");
        setProductionOrdersInForm([]);
        setQuantityPreviews({});
      }
    };

    loadEditingOrderData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingOrder]);

  // Function to preview quantity calculations
  const previewQuantityCalculation = async (customerProductId: number, baseQuantityKg: number) => {
    if (!customerProductId || !baseQuantityKg || baseQuantityKg <= 0) return null;

    try {
      const response = await fetch("/api/production-orders/preview-quantities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_product_id: customerProductId,
          quantity_kg: baseQuantityKg,
        }),
      });

      if (response.ok) return await response.json();
      return null;
    } catch (error) {
      console.error("Error previewing quantity calculation:", error);
      return null;
    }
  };

  // Update quantity preview keyed by uid (not index)
  const updateQuantityPreview = async (uid: string, customerProductId?: number, baseQuantityKg?: number) => {
    const po = productionOrdersInForm.find((x) => x.uid === uid);
    const productId = customerProductId ?? po?.customer_product_id!;
    const quantity = baseQuantityKg ?? po?.quantity_kg!;

    if (productId && quantity && quantity > 0) {
      const preview = await previewQuantityCalculation(productId, quantity);
      if (preview && preview.data) {
        setQuantityPreviews((prev) => ({ ...prev, [uid]: preview.data }));
      }
    } else {
      setQuantityPreviews((prev) => {
        const updated = { ...prev };
        delete updated[uid];
        return updated;
      });
    }
  };

  const addProductionOrder = () => {
    setProductionOrdersInForm((prev) => [
      ...prev,
      {
        uid: genUid(),
        customer_product_id: null,
        quantity_kg: null,
        overrun_percentage: 0,
      },
    ]);
  };

  const removeProductionOrder = (index: number) => {
    setProductionOrdersInForm((prev) => {
      const uid = prev[index]?.uid;
      if (uid) {
        setQuantityPreviews((old) => {
          const copy = { ...old };
          delete copy[uid];
          return copy;
        });
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateProductionOrder = async (index: number, field: keyof ProdOrderInForm | string, value: any) => {
    setProductionOrdersInForm((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Update preview when customer_product_id or quantity_kg changes
    const po = productionOrdersInForm[index];
    const uid = po?.uid;
    if (!uid) return;

    if (field === "customer_product_id" || field === "quantity_kg") {
      const productId = field === "customer_product_id" ? value : po?.customer_product_id;
      const quantity = field === "quantity_kg" ? value : po?.quantity_kg;
      if (productId && quantity && quantity > 0) {
        await updateQuantityPreview(uid, productId, quantity);
      } else {
        setQuantityPreviews((prev) => {
          const updated = { ...prev };
          delete updated[uid];
          return updated;
        });
      }
    }
  };

  // Filter customers based on search term
  // Ensure customers is an array to prevent runtime errors
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const filteredCustomers = safeCustomers.filter((customer: any) => {
    if (!customerSearchTerm) return true;

    const searchLower = customerSearchTerm.toLowerCase();
    return (
      (customer.name || "").toLowerCase().includes(searchLower) ||
      (customer.name_ar || "").toLowerCase().includes(searchLower) ||
      String(customer.id || "").toLowerCase().includes(searchLower)
    );
  });

  // Filter customer products based on selected customer (normalize to string)
  // Ensure customerProducts is an array to prevent runtime errors
  const safeCustomerProducts = Array.isArray(customerProducts) ? customerProducts : [];
  const filteredCustomerProducts = safeCustomerProducts.filter((product: any) =>
    selectedCustomerId ? String(product.customer_id) === selectedCustomerId : true
  );

  const handleSubmit = async (data: any) => {
    // منع الإرسال المتعدد
    if (isSubmitting) return;

    // تحقق سريع قبل الإرسال
    if (productionOrdersInForm.length === 0) {
      alert(t('orders.validation.atLeastOneProductionOrder'));
      return;
    }
    for (let i = 0; i < productionOrdersInForm.length; i++) {
      const po = productionOrdersInForm[i];
      if (!po.customer_product_id) {
        alert(t('orders.validation.selectProductForOrder', { num: i + 1 }));
        return;
      }
      if (!(po.quantity_kg && po.quantity_kg > 0)) {
        alert(t('orders.validation.enterQuantityForOrder', { num: i + 1 }));
        return;
      }
    }


    try {
      setIsSubmitting(true);
      await onSubmit(data, productionOrdersInForm);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // عدم السماح بالإغلاق أثناء الإرسال
    if (isSubmitting) return;

    orderForm.reset();
    setProductionOrdersInForm([]);
    setQuantityPreviews({});
    setSelectedCustomerId("");
    setCustomerSearchTerm("");
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {editingOrder ? t('orders.editOrder') : t('orders.addNewOrder')}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {editingOrder ? t('orders.editOrderDesc') : t('orders.addNewOrderDesc')}
          </DialogDescription>
        </DialogHeader>
        <Form {...orderForm}>
          <form onSubmit={orderForm.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Customer Selection with Search */}
            <FormField
              control={orderForm.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('orders.customer')}</FormLabel>
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={t('orders.searchByName')}
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="pl-10"
                        data-testid="input-search-customers"
                      />
                    </div>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedCustomerId(String(value));
                        // Reset production orders when customer changes
                        setProductionOrdersInForm([]);
                        setQuantityPreviews({});
                      }}
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder={t('orders.selectCustomer')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredCustomers.map((customer: any) => (
                          <SelectItem key={customer.id} value={String(customer.id)}>
                            {customer.name_ar || customer.name}
                            {customer.name && customer.name_ar ? ` - ${customer.name}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Production Orders Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">{t('orders.productionOrders')}</h3>
                <Button
                  type="button"
                  onClick={addProductionOrder}
                  variant="outline"
                  size="sm"
                  data-testid="button-add-production-order"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('orders.addProductionOrder')}
                </Button>
              </div>

              {productionOrdersInForm.length === 0 && (
                <div className="text-center py-6 text-sm text-gray-500">
                  {t('orders.validation.atLeastOneProductionOrder')}
                </div>
              )}

              <div className="space-y-3">
                {productionOrdersInForm.map((prodOrder, index) => (
                  <div
                    key={prodOrder.uid}
                    className="p-3 border rounded-lg bg-gray-50"
                    data-testid={`production-order-${index}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">{t('orders.productionOrderNum', { num: index + 1 })}</h4>
                      <Button
                        type="button"
                        onClick={() => removeProductionOrder(index)}
                        variant="ghost"
                        size="sm"
                        data-testid={`button-remove-production-order-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="text-sm font-medium text-gray-700">{t('orders.customerProduct')}</label>
                        <Select
                          onValueChange={(value) =>
                            updateProductionOrder(index, "customer_product_id", parseInt(value, 10))
                          }
                          value={prodOrder.customer_product_id?.toString() || ""}
                        >
                          <SelectTrigger className="h-auto min-h-[50px] w-full" data-testid={`select-product-${index}`}>
                            <SelectValue placeholder={t('orders.selectProduct')}>
                              {prodOrder.customer_product_id &&
                                (() => {
                                  const selectedProduct = filteredCustomerProducts.find(
                                    (p: any) => p.id === prodOrder.customer_product_id
                                  );
                                  if (selectedProduct) {
                                    const item = items.find((it: any) => it.id === selectedProduct.item_id);
                                    const parts = [
                                      item?.name_ar || item?.name || t('orders.unspecifiedProduct'),
                                      selectedProduct.size_caption,
                                      selectedProduct.cutting_length_cm ? `${selectedProduct.cutting_length_cm} ${t('common.cm')}` : null,
                                      selectedProduct.master_batch_id ? getMasterBatchText(selectedProduct.master_batch_id) : null,
                                      selectedProduct.raw_material,
                                    ].filter(Boolean);
                                    return <div className="text-right text-sm">{parts.join(" - ")}</div>;
                                  }
                                  return t('orders.selectProduct');
                                })()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="max-w-[750px] w-[750px]">
                            {filteredCustomerProducts.map((product: any) => (
                              <SelectItem key={product.id} value={String(product.id)} className="h-auto min-h-[70px] py-2">
                                <div className="w-full text-right py-1 min-w-[650px]">
                                  <div className="font-semibold text-gray-900 mb-1 text-sm leading-relaxed">
                                    {(() => {
                                      const item = items.find((it: any) => it.id === product.item_id);
                                      return (
                                        <>
                                          <div>{item?.name_ar || item?.name || t('orders.unspecifiedProduct')}</div>
                                          {product?.size_caption && <div>{product.size_caption}</div>}
                                          {product.cutting_length_cm && <div>{t('orders.cuttingLength')}: {product.cutting_length_cm} {t('common.cm')}</div>}
                                        </>
                                      );
                                    })()}
                                  </div>
                                  <div className="grid grid-cols-2 gap-6 text-sm text-gray-600">
                                    <div className="space-y-2">
                                      {product.thickness && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-700">{t('orders.thickness')}:</span>
                                          <span className="text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">
                                            {product.thickness} {t('common.micron')}
                                          </span>
                                        </div>
                                      )}
                                      {product.master_batch_id && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-700">{t('orders.masterBatch')}:</span>
                                          {getMasterBatchDisplay(product.master_batch_id)}
                                        </div>
                                      )}
                                      {product.raw_material && (
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium text-gray-700">{t('orders.rawMaterial')}:</span>
                                          <span className="text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded">
                                            {product.raw_material}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="space-y-2">
                                      {product.width && (
                                        <div>
                                          <span className="font-medium text-gray-700">{t('orders.width')}:</span>{" "}
                                          <span className="text-orange-600 font-medium">{product.width} {t('common.cm')}</span>
                                        </div>
                                      )}
                                      {product.punching && (
                                        <div>
                                          <span className="font-medium text-gray-700">{t('orders.punching')}:</span>{" "}
                                          <span className="text-teal-600 font-medium">{product.punching}</span>
                                        </div>
                                      )}
                                      {product.cutting_unit && (
                                        <div>
                                          <span className="font-medium text-gray-700">{t('orders.cuttingUnit')}:</span>{" "}
                                          <span className="text-indigo-600 font-medium">{product.cutting_unit}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {product.notes && (
                                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                                      <span className="font-medium">{t('common.notes')}:</span> {product.notes}
                                    </div>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">{t('orders.baseQuantityKg')}</label>
                        <Input
                          type="number"
                          placeholder={t('orders.quantity')}
                          value={prodOrder.quantity_kg ?? ""}
                          onChange={(e) => {
                            const num = Number.parseFloat(e.target.value);
                            updateProductionOrder(index, "quantity_kg", Number.isNaN(num) ? null : num);
                          }}
                          className="w-full"
                          data-testid={`input-base-quantity-${index}`}
                        />
                        {quantityPreviews[prodOrder.uid] && (
                          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                            <div className="text-xs font-medium text-blue-800 mb-1">{t('orders.preview')}:</div>
                            <div className="text-xs space-y-1">
                              <div className="text-blue-700">
                                <span className="font-medium">{t('orders.overrunPercentage')}:</span>{" "}
                                {formatPercentage(quantityPreviews[prodOrder.uid].overrun_percentage)}
                              </div>
                              <div className="text-blue-700">
                                <span className="font-medium">{t('orders.finalQuantity')}:</span>{" "}
                                {formatWeight(quantityPreviews[prodOrder.uid].final_quantity_kg)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Days & Notes Section */}
            <div className="border-t pt-4">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={orderForm.control}
                  name="delivery_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('orders.deliveryDays')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          placeholder={t('orders.deliveryDaysPlaceholder')}
                          data-testid="input-delivery-days"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={orderForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>{t('common.notes')}</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder={t('orders.additionalNotes')}
                          className="min-h-[40px] resize-none"
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-2 space-x-reverse pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                data-testid="button-cancel"
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
                {isSubmitting ? t('common.saving') : editingOrder ? t('orders.updateOrder') : t('orders.saveOrder')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
