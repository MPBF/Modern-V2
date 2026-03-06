import React from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "../ui/dropdown-menu";
import {
  FileText,
  Eye,
  Trash2,
  Edit,
  RefreshCw,
  MoreHorizontal,
  Printer,
  Download,
  ExternalLink,
  Settings2,
} from "lucide-react";
import { format } from "date-fns";
import ProductionProgress from "./ProductionProgress";

type PrintMode = "html" | "pdf" | "standalone";

interface OrdersTableProps {
  orders: any[];
  customers: any[];
  users: any[];
  productionOrders?: any[];
  onViewOrder: (order: any) => void;
  onPrintOrder: (order: any, mode?: PrintMode) => void;
  onEditOrder?: (order: any) => void;
  onDeleteOrder: (order: any) => void;
  onStatusChange: (order: any, status: string) => void;
  currentUser?: any;
  isAdmin?: boolean;
  selectedOrders?: number[];
  onOrderSelect?: (orderId: number, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
}

export default function OrdersTable({
  orders,
  customers,
  users,
  productionOrders = [],
  onViewOrder,
  onPrintOrder,
  onEditOrder,
  onDeleteOrder,
  onStatusChange,
  currentUser,
  isAdmin = false,
  selectedOrders = [],
  onOrderSelect,
  onSelectAll,
}: OrdersTableProps) {
  const { t } = useTranslation();
  // Ensure arrays are valid
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeProductionOrders = Array.isArray(productionOrders) ? productionOrders : [];
  
  // Check if all orders are selected
  const allOrdersSelected =
    safeOrders.length > 0 &&
    safeOrders.every((order: any) => selectedOrders.includes(order.id));
  const someOrdersSelected =
    selectedOrders.length > 0 && selectedOrders.length < safeOrders.length;

  const handleSelectAll = (checked: boolean) => {
    if (onSelectAll) {
      onSelectAll(checked);
    }
  };

  const handleOrderSelect = (orderId: number, checked: boolean) => {
    if (onOrderSelect) {
      onOrderSelect(orderId, checked);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: {
      [key: string]: { label: string; variant: any; color: string };
    } = {
      waiting: {
        label: t('orders.statuses.waiting'),
        variant: "secondary",
        color: "bg-yellow-100 text-yellow-800",
      },
      in_production: {
        label: t('orders.statuses.in_production'),
        variant: "default",
        color: "bg-blue-100 text-blue-800",
      },
      paused: {
        label: t('orders.statuses.paused'),
        variant: "destructive",
        color: "bg-orange-100 text-orange-800",
      },
      completed: {
        label: t('orders.statuses.completed'),
        variant: "default",
        color: "bg-green-100 text-green-800",
      },
      cancelled: {
        label: t('orders.statuses.cancelled'),
        variant: "destructive",
        color: "bg-red-100 text-red-800",
      },
    };

    const statusInfo = statusMap[status] || {
      label: status,
      variant: "outline",
      color: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={statusInfo.color} data-testid={`status-${status}`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const calculateDeliveryInfo = (order: any) => {
    if (!order.created_at || !order.delivery_days) {
      return { deliveryDate: null, daysRemaining: null };
    }

    const createdDate = new Date(order.created_at);
    const deliveryDate = new Date(createdDate);
    deliveryDate.setDate(
      deliveryDate.getDate() + parseInt(order.delivery_days),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deliveryDate.setHours(0, 0, 0, 0);

    const timeDiff = deliveryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return { deliveryDate, daysRemaining };
  };

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {onOrderSelect && onSelectAll && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      allOrdersSelected
                        ? true
                        : someOrdersSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={handleSelectAll}
                    data-testid="checkbox-select-all"
                  />
                </TableHead>
              )}
              <TableHead className="text-right">{t('orders.orderNumber')}</TableHead>
              <TableHead className="text-right">{t('orders.customer')}</TableHead>
              <TableHead className="text-right">{t('orders.createdDate')}</TableHead>
              <TableHead className="text-right">{t('orders.creator')}</TableHead>
              <TableHead className="text-right">{t('orders.delivery')}</TableHead>
              <TableHead className="text-right">{t('orders.completionRate')}</TableHead>
              <TableHead className="text-center">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
        {safeOrders.map((order: any) => {
          const customer = safeCustomers.find(
            (c: any) => c.id === order.customer_id,
          );
          const user = safeUsers.find(
            (u: any) => u.id === parseInt(order.created_by),
          );
          const { deliveryDate, daysRemaining } = calculateDeliveryInfo(order);
          
          // حساب نسب الإكمال من أوامر الإنتاج المرتبطة بهذا الطلب
          const orderProductionOrders = safeProductionOrders.filter(
            (po: any) => po.order_id === order.id
          );
          
          // حساب متوسط مرجح لنسبة الإكمال لكل مرحلة بناءً على الكمية الفعلية لكل مرحلة
          let avgFilmPercentage = 0;
          let avgPrintingPercentage = 0;
          let avgCuttingPercentage = 0;
          
          if (orderProductionOrders.length > 0) {
            const totalOrderedQuantity = orderProductionOrders.reduce(
              (sum: number, po: any) => sum + parseFloat(po.quantity_kg || 0),
              0
            );
            
            if (totalOrderedQuantity > 0) {
              const weightedFilm = orderProductionOrders.reduce(
                (sum: number, po: any) => {
                  const orderedQty = parseFloat(po.quantity_kg || 0);
                  const pct = parseFloat(po.film_completion_percentage || 0);
                  return sum + (orderedQty * pct);
                },
                0
              );
              
              const weightedPrinting = orderProductionOrders.reduce(
                (sum: number, po: any) => {
                  const orderedQty = parseFloat(po.quantity_kg || 0);
                  const pct = parseFloat(po.printing_completion_percentage || 0);
                  return sum + (orderedQty * pct);
                },
                0
              );
              
              const weightedCutting = orderProductionOrders.reduce(
                (sum: number, po: any) => {
                  const orderedQty = parseFloat(po.quantity_kg || 0);
                  const pct = parseFloat(po.cutting_completion_percentage || 0);
                  return sum + (orderedQty * pct);
                },
                0
              );
              
              avgFilmPercentage = weightedFilm / totalOrderedQuantity;
              avgPrintingPercentage = weightedPrinting / totalOrderedQuantity;
              avgCuttingPercentage = weightedCutting / totalOrderedQuantity;
            }
          }

          return (
            <React.Fragment key={order.id}>
            <TableRow
              data-testid={`order-row-${order.id}`}
              className={selectedOrders.includes(order.id) ? "bg-blue-50" : ""}
            >
              {onOrderSelect && onSelectAll && (
                <TableCell>
                  <Checkbox
                    checked={selectedOrders.includes(order.id)}
                    onCheckedChange={(checked) =>
                      handleOrderSelect(order.id, !!checked)
                    }
                    data-testid={`checkbox-select-order-${order.id}`}
                  />
                </TableCell>
              )}
              <TableCell
                className="font-medium"
                data-testid={`order-number-${order.id}`}
              >
                {order.order_number}
              </TableCell>
              <TableCell data-testid={`customer-${order.id}`}>
                <div className="text-right">
                  <div className="font-medium">
                    {customer?.name_ar || customer?.name}
                  </div>
                  <div className="text-sm text-gray-500">{customer?.id}</div>
                </div>
              </TableCell>
              <TableCell data-testid={`created-date-${order.id}`}>
                {order.created_at
                  ? format(new Date(order.created_at), "dd/MM/yyyy")
                  : "-"}
              </TableCell>
              <TableCell data-testid={`created-by-${order.id}`}>
                <div className="text-right">
                  <div className="font-medium">{user?.display_name_ar || user?.display_name || user?.username || '-'}</div>
                  <div className="text-sm text-gray-500">#{user?.id}</div>
                </div>
              </TableCell>
              <TableCell data-testid={`delivery-${order.id}`}>
                <div className="text-right">
                  {deliveryDate && daysRemaining !== null ? (
                    <>
                      <div className="font-medium">
                        {daysRemaining > 0 ? (
                          <span className="text-green-600">
                            {t('orders.daysRemaining', { count: daysRemaining })}
                          </span>
                        ) : daysRemaining === 0 ? (
                          <span className="text-orange-600">
                            {t('orders.deliverToday')}
                          </span>
                        ) : (
                          <span className="text-red-600">
                            {t('orders.daysLate', { days: Math.abs(daysRemaining) })}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {t('orders.deliveryLabel')}: {format(deliveryDate, "dd/MM/yyyy")}
                      </div>
                    </>
                  ) : (
                    "-"
                  )}
                </div>
              </TableCell>
              <TableCell data-testid={`production-progress-${order.id}`}>
                {orderProductionOrders.length > 0 ? (
                  <ProductionProgress
                    filmPercentage={avgFilmPercentage}
                    printingPercentage={avgPrintingPercentage}
                    cuttingPercentage={avgCuttingPercentage}
                  />
                ) : (
                  <div className="text-gray-400 text-center">-</div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-center gap-1">
                <div className="mb-1">
                  {getStatusBadge(order.status || "pending")}
                </div>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onViewOrder(order)}
                    title={t('orders.viewDetails')}
                    data-testid={`button-view-${order.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => onPrintOrder(order, "standalone")}
                    title={t('common.print')}
                    data-testid={`button-print-${order.id}`}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                        data-testid={`button-actions-${order.id}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56"  style={{ direction: 'rtl' }}>
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {t('orders.printAndExport')}
                      </DropdownMenuLabel>
                      
                      <DropdownMenuItem
                        onClick={() => onPrintOrder(order, "pdf")}
                        className="cursor-pointer"
                        data-testid={`button-print-pdf-${order.id}`}
                      >
                        <Download className="h-4 w-4 ml-2 text-blue-600" />
                        <span>{t('common.exportPdf')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onPrintOrder(order, "standalone")}
                        className="cursor-pointer"
                        data-testid={`button-print-standalone-${order.id}`}
                      >
                        <ExternalLink className="h-4 w-4 ml-2 text-purple-600" />
                        <span>{t('common.print')}</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuLabel className="text-xs text-muted-foreground">
                        {t('orders.changeStatus')}
                      </DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => onStatusChange(order, "in_production")}
                        className="cursor-pointer"
                      >
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full ml-2"></div>
                        <span>{t('orders.statuses.in_production')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange(order, "paused")}
                        className="cursor-pointer"
                      >
                        <div className="w-2.5 h-2.5 bg-orange-500 rounded-full ml-2"></div>
                        <span>{t('orders.statuses.paused')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onStatusChange(order, "cancelled")}
                        className="cursor-pointer"
                      >
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full ml-2"></div>
                        <span>{t('orders.statuses.cancelled')}</span>
                      </DropdownMenuItem>
                      
                      {(isAdmin && onEditOrder) || isAdmin ? (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            {t('orders.manage')}
                          </DropdownMenuLabel>
                        </>
                      ) : null}
                      
                      {isAdmin && onEditOrder && (
                        <DropdownMenuItem
                          onClick={() => onEditOrder(order)}
                          className="cursor-pointer"
                          data-testid={`button-edit-${order.id}`}
                        >
                          <Edit className="h-4 w-4 ml-2 text-purple-600" />
                          <span>{t('orders.editOrder')}</span>
                        </DropdownMenuItem>
                      )}
                      
                      {isAdmin && (
                        <DropdownMenuItem
                          onClick={() => onDeleteOrder(order)}
                          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                          data-testid={`button-delete-${order.id}`}
                        >
                          <Trash2 className="h-4 w-4 ml-2" />
                          <span>{t('orders.deleteOrder')}</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                </div>
              </TableCell>
            </TableRow>
            {order.notes && (
              <TableRow className={`border-b ${selectedOrders.includes(order.id) ? "bg-blue-50" : "bg-gray-50/50"}`}>
                <TableCell
                  colSpan={onOrderSelect && onSelectAll ? 8 : 7}
                  className="py-1.5 px-4 text-right"
                  data-testid={`notes-${order.id}`}
                >
                  <span className="text-xs text-muted-foreground font-medium ml-2">{t('common.notes')}:</span>
                  <span className="text-sm text-gray-700">{order.notes}</span>
                </TableCell>
              </TableRow>
            )}
            </React.Fragment>
          );
        })}
        </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {safeOrders.map((order: any) => {
          const customer = safeCustomers.find((c: any) => c.id === order.customer_id);
          const user = safeUsers.find((u: any) => u.id === parseInt(order.created_by));
          const { deliveryDate, daysRemaining } = calculateDeliveryInfo(order);
          const orderProductionOrders = safeProductionOrders.filter((po: any) => po.order_id === order.id);
          
          let avgFilmPercentage = 0;
          let avgPrintingPercentage = 0;
          let avgCuttingPercentage = 0;
          
          if (orderProductionOrders.length > 0) {
            const totalOrderedQuantity = orderProductionOrders.reduce(
              (sum: number, po: any) => sum + parseFloat(po.quantity_kg || 0),
              0
            );
            
            if (totalOrderedQuantity > 0) {
              const weightedFilm = orderProductionOrders.reduce(
                (sum: number, po: any) => {
                  const orderedQty = parseFloat(po.quantity_kg || 0);
                  const pct = parseFloat(po.film_completion_percentage || 0);
                  return sum + (orderedQty * pct);
                },
                0
              );
              
              const weightedPrinting = orderProductionOrders.reduce(
                (sum: number, po: any) => {
                  const orderedQty = parseFloat(po.quantity_kg || 0);
                  const pct = parseFloat(po.printing_completion_percentage || 0);
                  return sum + (orderedQty * pct);
                },
                0
              );
              
              const weightedCutting = orderProductionOrders.reduce(
                (sum: number, po: any) => {
                  const orderedQty = parseFloat(po.quantity_kg || 0);
                  const pct = parseFloat(po.cutting_completion_percentage || 0);
                  return sum + (orderedQty * pct);
                },
                0
              );
              
              avgFilmPercentage = weightedFilm / totalOrderedQuantity;
              avgPrintingPercentage = weightedPrinting / totalOrderedQuantity;
              avgCuttingPercentage = weightedCutting / totalOrderedQuantity;
            }
          }

          return (
            <div key={order.id} className="bg-white rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-lg">{order.order_number}</div>
                  <div className="text-sm text-muted-foreground">{customer?.name_ar || customer?.name}</div>
                </div>
                <div>{getStatusBadge(order.status || "pending")}</div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t('orders.createdDate')}:</span>
                  <div className="font-medium">{order.created_at ? format(new Date(order.created_at), "dd/MM") : "-"}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t('orders.deliveryLabel')}:</span>
                  <div className={`font-medium ${daysRemaining !== null ? (daysRemaining > 0 ? "text-green-600" : "text-red-600") : ""}`}>
                    {daysRemaining !== null ? t('orders.daysCount', { count: daysRemaining }) : "-"}
                  </div>
                </div>
              </div>
              
              {orderProductionOrders.length > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('orders.progress')}:</span>
                  <ProductionProgress
                    filmPercentage={avgFilmPercentage}
                    printingPercentage={avgPrintingPercentage}
                    cuttingPercentage={avgCuttingPercentage}
                  />
                </div>
              )}
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-blue-600"
                  onClick={() => onViewOrder(order)}
                  data-testid={`button-view-mobile-${order.id}`}
                >
                  <Eye className="h-3 w-3 ml-1" />
                  {t('common.view')}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-green-600"
                      data-testid={`button-print-mobile-${order.id}`}
                    >
                      <Printer className="h-3 w-3 ml-1" />
                      {t('common.print')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" style={{ direction: 'rtl' }}>
                    <DropdownMenuItem onClick={() => onPrintOrder(order, "html")}>
                      <Printer className="h-4 w-4 ml-2 text-green-600" />
                      {t('common.directPrint')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrintOrder(order, "pdf")}>
                      <Download className="h-4 w-4 ml-2 text-blue-600" />
                      {t('common.exportPdf')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onPrintOrder(order, "standalone")}>
                      <ExternalLink className="h-4 w-4 ml-2 text-purple-600" />
                      {t('common.standalonePage')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
