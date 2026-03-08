import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Progress } from "../../ui/progress";
import { ScrollArea } from "../../ui/scroll-area";
import { Factory, Activity, CheckCircle2 } from "lucide-react";
import { formatNumber } from "../../../lib/formatNumber";

interface ProductionOrder {
  id: number;
  production_order_number?: string;
  status?: string;
  quantity_required?: number | string;
  produced_quantity_kg?: number | string;
  product_name?: string;
  product_name_ar?: string;
  customer_name?: string;
  customer_name_ar?: string;
}

export default function ProductionProgressWidget() {
  const { t } = useTranslation();

  const { data: productionOrders = [], isLoading } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/production-orders"],
  });

  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Factory className="w-4 h-4 text-emerald-500" />
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const orderList = Array.isArray(productionOrders) ? productionOrders : [];
  const activeOrders = orderList.filter(
    (o) => o.status === "in_progress" || o.status === "active" || o.status === "in_production"
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Factory className="w-4 h-4 text-emerald-500" />
            {t("dashboard.widgets.productionProgress", "Production Progress")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Activity className="w-3 h-3 mr-1" />
            {formatNumber(activeOrders.length)} {t("dashboard.widgets.active", "active")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          {activeOrders.length > 0 ? (
            <div className="p-4 space-y-3">
              {activeOrders.slice(0, 8).map((order) => {
                const required = parseFloat(String(order.quantity_required || 0));
                const produced = parseFloat(String(order.produced_quantity_kg || 0));
                const progress = required > 0 ? Math.min(Math.round((produced / required) * 100), 100) : 0;

                return (
                  <div
                    key={order.id}
                    className="border rounded-lg p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">
                          {order.production_order_number || `#${order.id}`}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${
                        progress >= 100 ? "text-green-600" : progress >= 50 ? "text-blue-600" : "text-orange-600"
                      }`}>
                        {progress}%
                      </span>
                    </div>

                    {(order.product_name_ar || order.product_name) && (
                      <p className="text-xs text-gray-500 mb-1.5 truncate">
                        {order.product_name_ar || order.product_name}
                      </p>
                    )}

                    <Progress
                      value={progress}
                      className="h-1.5"
                    />

                    <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                      <span>
                        {formatNumber(produced)} / {formatNumber(required)} {t("dashboard.widgets.kg", "kg")}
                      </span>
                      {progress >= 100 && (
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Factory className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">
                {t("dashboard.widgets.noActiveProduction", "No active production orders")}
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
