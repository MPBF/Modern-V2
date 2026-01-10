import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Eye, Plus } from "lucide-react";
import type { ProductionOrderWithDetails } from "@/types";
import { formatNumber, formatWeight } from "../../lib/formatNumber";

const formatPercentage = (value: number): string => {
  return `${value}%`;
};

interface ProductionOrdersTableProps {
  stage: string;
  onCreateRoll: (productionOrderId?: number) => void;
}

export default function ProductionOrdersTable({
  stage,
  onCreateRoll,
}: ProductionOrdersTableProps) {
  const { t } = useTranslation();
  
  const { data: productionOrders = [], isLoading } = useQuery<
    ProductionOrderWithDetails[]
  >({
    queryKey:
      stage === "film"
        ? ["/api/production/film-queue"]
        : ["/api/production-orders", stage],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded"></div>
        ))}
      </div>
    );
  }

  if (productionOrders.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          {t("production.table.noOrdersInStage")}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("production.orderNumber")}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("orders.customer")}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("production.product")}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("production.table.requiredQuantity")}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("production.table.producedQuantity")}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("production.table.progress")}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productionOrders.map((order) => {
              const required = parseFloat(order.quantity_required) || 0;
              const produced = parseFloat(order.produced_quantity_kg) || 0;
              const progress = required > 0 ? Math.round((produced / required) * 100) : 0;
              let progressColor = "bg-primary";
              if (progress < 30) progressColor = "bg-danger";
              else if (progress < 70) progressColor = "bg-warning";
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.production_order_number}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.customer_name_ar || order.customer_name || t("common.notSpecified")}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{(order as any).item_name_ar || (order as any).item_name || (order as any).size_caption || t("common.notSpecified")}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatWeight(required)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatWeight(produced)}</td>
                  <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="w-full bg-gray-200 rounded-full h-2 ml-3"><div className={`h-2 rounded-full ${progressColor}`} style={{ width: `${Math.min(progress, 100)}%` }}></div></div><span className="text-sm text-gray-900">{formatPercentage(progress)}</span></div></td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"><div className="flex items-center space-x-2 space-x-reverse"><Button variant="ghost" size="sm" onClick={() => onCreateRoll(order.id)} className="text-primary hover:text-primary/80" data-testid={`button-create-roll-${order.id}`}><Plus className="h-4 w-4" /></Button><Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800"><Eye className="h-4 w-4" /></Button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {productionOrders.map((order) => {
          const required = parseFloat(order.quantity_required) || 0;
          const produced = parseFloat(order.produced_quantity_kg) || 0;
          const progress = required > 0 ? Math.round((produced / required) * 100) : 0;
          return (
            <div key={order.id} className="bg-white rounded-lg border p-4 space-y-3">
              <div className="font-semibold">{order.production_order_number}</div>
              <div className="text-sm text-muted-foreground">{order.customer_name_ar || order.customer_name}</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">{t("production.table.required")}:</span><div className="font-medium">{formatWeight(required)}</div></div>
                <div><span className="text-muted-foreground">{t("production.table.produced")}:</span><div className="font-medium">{formatWeight(produced)}</div></div>
              </div>
              <div><span className="text-xs text-muted-foreground">{t("production.table.progress")}</span><Progress value={progress} className="mt-1" /></div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onCreateRoll(order.id)} className="flex-1" data-testid={`button-create-roll-mobile-${order.id}`}><Plus className="h-3 w-3 mr-1" />{t("production.table.new")}</Button>
                <Button variant="outline" size="sm" className="flex-1"><Eye className="h-3 w-3 mr-1" />{t("common.view")}</Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
