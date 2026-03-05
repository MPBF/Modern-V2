import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Printer } from "lucide-react";
import { format } from "date-fns";

type PrintMode = "html" | "pdf" | "standalone";

interface ViewOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  customer: any;
  productionOrders: any[];
  customerProducts: any[];
  items: any[];
  onPrint?: (order: any, mode?: PrintMode) => void;
}

export default function ViewOrderDialog({
  isOpen,
  onClose,
  order,
  customer,
  productionOrders,
  customerProducts,
  items,
  onPrint,
}: ViewOrderDialogProps) {
  const { t } = useTranslation();
  // Ensure arrays are valid
  const safeProductionOrders = Array.isArray(productionOrders) ? productionOrders : [];
  const safeCustomerProducts = Array.isArray(customerProducts) ? customerProducts : [];
  const safeItems = Array.isArray(items) ? items : [];
  
  if (!order) return null;

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      waiting: t('orders.statuses.waiting'),
      in_production: t('orders.statuses.in_production'),
      paused: t('orders.statuses.paused'),
      completed: t('orders.statuses.completed'),
      cancelled: t('orders.statuses.cancelled'),
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      waiting: "bg-yellow-100 text-yellow-800",
      in_production: "bg-blue-100 text-blue-800",
      paused: "bg-orange-100 text-orange-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colorMap[status] || "bg-gray-100 text-gray-800";
  };

  const orderProductionOrders = safeProductionOrders.filter(
    (po: any) => po.order_id === order.id
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              {t('orders.orderDetails')} {order.order_number}
            </DialogTitle>
            {onPrint && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-print-order-dialog"
                onClick={() => onPrint(order, "standalone")}
              >
                <Printer className="h-4 w-4" />
                {t('common.print')}
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">{t('orders.viewOrderDetailsDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">{t('orders.orderNumber')}</span>
                <p className="text-base font-semibold">{order.order_number}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t('orders.customer')}</span>
                <p className="text-base">{customer?.name_ar || customer?.name || t('common.notSpecified')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t('common.status')}</span>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-500">{t('orders.createdDate')}</span>
                <p className="text-base">
                  {order.created_at
                    ? format(new Date(order.created_at), "dd/MM/yyyy")
                    : t('common.notSpecified')}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t('orders.deliveryDays')}</span>
                <p className="text-base">{order.delivery_days || t('common.notSpecified')} {t('orders.day')}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">{t('orders.expectedDeliveryDate')}</span>
                <p className="text-base">
                  {order.delivery_date
                    ? format(new Date(order.delivery_date), "dd/MM/yyyy")
                    : t('common.notSpecified')}
                </p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div>
              <span className="text-sm font-medium text-gray-500">{t('common.notes')}</span>
              <p className="text-base mt-1 bg-gray-50 p-3 rounded">{order.notes}</p>
            </div>
          )}

          {/* Production Orders */}
          <div>
            <h3 className="text-base font-semibold mb-3">{t('orders.productionOrders')} ({orderProductionOrders.length})</h3>
            {orderProductionOrders.length === 0 ? (
              <div className="text-center py-6 text-sm text-gray-500">
                {t('orders.noProductionOrders')}
              </div>
            ) : (
              <div className="space-y-3">
                {orderProductionOrders.map((po: any) => {
                  const customerProduct = safeCustomerProducts.find(
                    (cp: any) => cp.id === po.customer_product_id
                  );
                  const item = safeItems.find(
                    (i: any) => i.id === customerProduct?.item_id
                  );

                  return (
                    <div
                      key={po.id}
                      className="border rounded-lg p-4 bg-gray-50"
                      data-testid={`production-order-detail-${po.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-sm">
                            {po.production_order_number || `PO-${po.id}`}
                          </h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {item?.name_ar || item?.name || t('orders.unspecifiedProduct')}
                            {customerProduct?.size_caption && ` - ${customerProduct.size_caption}`}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(po.status)}`}>
                          {getStatusText(po.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                        <div>
                          <span className="text-gray-500">{t('orders.baseQuantity')}:</span>
                          <p className="font-medium">{po.quantity_kg} {t('common.kg')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('orders.overrunPercentage')}:</span>
                          <p className="font-medium">{po.overrun_percentage ?? 0}%</p>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('orders.finalQuantity')}:</span>
                          <p className="font-medium text-blue-600">{po.final_quantity_kg || po.quantity_kg} {t('common.kg')}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
