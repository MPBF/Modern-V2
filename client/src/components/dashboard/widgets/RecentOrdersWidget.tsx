import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { ScrollArea } from "../../ui/scroll-area";
import { ShoppingCart, Clock, User, Package } from "lucide-react";
import { formatNumber } from "../../../lib/formatNumber";

interface Order {
  id: number;
  order_number?: string;
  customer_name?: string;
  customer_name_ar?: string;
  status?: string;
  total_quantity_kg?: number | string;
  created_at?: string;
}

export default function RecentOrdersWidget() {
  const { t } = useTranslation();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-500" />
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const orderList = Array.isArray(orders) ? orders : [];
  const recentOrders = orderList.slice(0, 6);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
      case "delivered":
        return <Badge className="bg-green-100 text-green-800 text-xs">{t("dashboard.widgets.completed", "Completed")}</Badge>;
      case "in_production":
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800 text-xs">{t("dashboard.widgets.inProduction", "In Production")}</Badge>;
      case "pending":
      case "new":
        return <Badge className="bg-yellow-100 text-yellow-800 text-xs">{t("dashboard.widgets.newOrder", "New")}</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 text-xs">{t("dashboard.widgets.cancelled", "Cancelled")}</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status || "-"}</Badge>;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-blue-500" />
            {t("dashboard.widgets.recentOrders", "Recent Orders")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {formatNumber(orderList.length)} {t("dashboard.widgets.total", "total")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          {recentOrders.length > 0 ? (
            <div className="p-4 space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium truncate">
                          {order.order_number || `#${order.id}`}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {(order.customer_name_ar || order.customer_name) && (
                          <span className="flex items-center gap-1 truncate">
                            <User className="w-3 h-3" />
                            {order.customer_name_ar || order.customer_name}
                          </span>
                        )}
                        {order.created_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(order.created_at).toLocaleDateString("ar", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    {order.total_quantity_kg && (
                      <div className="text-right">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatNumber(order.total_quantity_kg)}
                        </span>
                        <span className="text-xs text-gray-500 ml-1">
                          {t("dashboard.widgets.kg", "kg")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">
                {t("dashboard.widgets.noOrders", "No orders available")}
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
