import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Package, Warehouse, AlertTriangle, TrendingDown } from "lucide-react";
import { formatNumber } from "../../../lib/formatNumber";

interface WarehouseItem {
  id: number;
  name?: string;
  name_ar?: string;
  quantity?: number;
  unit?: string;
  min_quantity?: number;
  category?: string;
}

export default function InventoryWidget() {
  const { t } = useTranslation();

  const { data: items = [], isLoading } = useQuery<WarehouseItem[]>({
    queryKey: ["/api/warehouse-items"],
  });

  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-indigo-500" />
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const itemList = Array.isArray(items) ? items : [];
  const totalItems = itemList.length;
  const lowStockItems = itemList.filter(
    (item) => item.min_quantity && item.quantity && item.quantity <= item.min_quantity
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-indigo-500" />
            {t("dashboard.widgets.inventory", "Inventory Summary")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {formatNumber(totalItems)} {t("dashboard.widgets.items", "items")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {lowStockItems.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                {t("dashboard.widgets.lowStock", "Low Stock Items")} ({lowStockItems.length})
              </span>
            </div>
            <div className="space-y-1">
              {lowStockItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <span className="text-amber-800 dark:text-amber-200 truncate max-w-[120px]">
                    {item.name_ar || item.name || `#${item.id}`}
                  </span>
                  <span className="font-medium text-amber-700 dark:text-amber-300">
                    {formatNumber(item.quantity)} {item.unit || ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {lowStockItems.length === 0 && totalItems === 0 && (
          <div className="text-center py-4">
            <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {t("dashboard.widgets.noInventoryData", "No inventory data available")}
            </p>
          </div>
        )}

        {lowStockItems.length === 0 && totalItems > 0 && (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
              <Package className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              {t("dashboard.widgets.allStockNormal", "All stock levels normal")}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2 rounded-lg text-center">
            <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
              {formatNumber(totalItems)}
            </p>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">
              {t("dashboard.widgets.totalItems", "Total Items")}
            </p>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg text-center">
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">
              {formatNumber(lowStockItems.length)}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {t("dashboard.widgets.lowStockCount", "Low Stock")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
