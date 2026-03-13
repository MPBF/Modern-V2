import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { useLocalizedName } from "../hooks/use-localized-name";
import { useAuth } from "../hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  Loader2, 
  Printer,
  Search,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Factory,
  TrendingUp,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  Play
} from "lucide-react";
import ProductionOrderStatsCard from "../components/production/ProductionOrderStatsCard";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function ProductionOrdersManagement() {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const { user } = useAuth();
  const [showStats, setShowStats] = useState<number | null>(null);
  const [printingProductionOrder, setPrintingProductionOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: ordersData, isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ["/api/production-orders"],
    queryFn: async () => {
      const response = await fetch("/api/production-orders");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('production.ordersManagement.noProductionOrders'));
      }
      const result = await response.json();
      return Array.isArray(result) ? result : (result.data || []);
    },
  });

  const filteredOrders = useMemo(() => {
    const orders = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
    return orders.filter((order: any) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          order.production_order_number?.toLowerCase().includes(searchLower) ||
          order.order_number?.toLowerCase().includes(searchLower) ||
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.customer_name_ar?.toLowerCase().includes(searchLower) ||
          order.size_caption?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [ordersData, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const orders = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);
    const pending = orders.filter((o: any) => o.status === "pending").length;
    const active = orders.filter((o: any) => o.status === "active" || o.status === "in_production").length;
    const completed = orders.filter((o: any) => o.status === "completed").length;
    const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
    const total = orders.length;
    
    const totalQuantity = orders.reduce((sum: number, o: any) => sum + parseFloat(o.quantity_kg || 0), 0);
    const completedQuantity = orders
      .filter((o: any) => o.status === "completed")
      .reduce((sum: number, o: any) => sum + parseFloat(o.final_quantity_kg || o.quantity_kg || 0), 0);

    return { pending, active, completed, cancelled, total, totalQuantity, completedQuantity };
  }, [ordersData]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: any; color: string; bg: string; label: string }> = {
      pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", label: t('production.status.pending') },
      active: { icon: Play, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", label: t('production.status.active') },
      in_production: { icon: Factory, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", label: t('production.status.inProduction') },
      completed: { icon: CheckCircle2, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-800", label: t('production.status.completed') },
      cancelled: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", label: t('production.status.cancelled') },
    };
    return configs[status] || configs.pending;
  };

  const getProgressPercentage = (order: any) => {
    const quantity = parseFloat(order.quantity_kg || 0);
    const produced = parseFloat(order.produced_kg || 0);
    if (quantity === 0) return 0;
    return Math.min(100, Math.round((produced / quantity) * 100));
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t('production.loadingOrders')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-r-4 border-r-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('production.status.pending')}</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('production.status.inExecution')}</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Factory className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('production.status.completedFem')}</p>
                <p className="text-3xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('production.totalQuantity')}</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalQuantity.toLocaleString("en-US")} {t('production.kg')}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('production.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder={t('production.statusLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('production.allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('production.status.pending')}</SelectItem>
                <SelectItem value="active">{t('production.status.active')}</SelectItem>
                <SelectItem value="in_production">{t('production.status.inProduction')}</SelectItem>
                <SelectItem value="completed">{t('production.status.completed')}</SelectItem>
                <SelectItem value="cancelled">{t('production.status.cancelled')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {t('production.productionOrders')}
              <Badge variant="secondary">{filteredOrders.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">{t('production.table.productionOrderNumber')}</TableHead>
                  <TableHead className="font-semibold">{t('production.table.orderNumber')}</TableHead>
                  <TableHead className="font-semibold">{t('production.table.customer')}</TableHead>
                  <TableHead className="font-semibold">{t('production.table.product')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('production.table.quantity')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('production.table.progress')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('production.table.status')}</TableHead>
                  <TableHead className="font-semibold">{t('production.table.assignment')}</TableHead>
                  <TableHead className="font-semibold text-center">{t('production.table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-12 w-12 opacity-50" />
                        <p>{t('production.noOrders')}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order: any) => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;
                    const progress = getProgressPercentage(order);
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono font-medium">
                          {order.production_order_number}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-gray-900">{ln(order.customer_name_ar, order.customer_name)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{order.size_caption}</div>
                            {order.is_printed && (
                              <Badge variant="outline" className="text-xs">
                                {t('production.printed')}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div className="font-semibold">{order.quantity_kg} {t('production.kg')}</div>
                            <div className="text-xs text-muted-foreground">
                              {t('production.final')}: {order.final_quantity_kg} {t('production.kg')}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="w-24 mx-auto space-y-1">
                            <Progress value={progress} className="h-2" />
                            <div className="text-xs text-muted-foreground">{progress}%</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {order.assigned_machine_id && (
                              <Badge variant="secondary" className="text-xs">
                                <Factory className="h-3 w-3 ml-1" />
                                {order.machine_name_ar || order.machine_name}
                              </Badge>
                            )}
                            {order.assigned_operator_id && (
                              <Badge variant="secondary" className="text-xs">
                                👷 {order.operator_name_ar || order.operator_name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowStats(showStats === order.id ? null : order.id)}
                              title={t('production.viewDetails')}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPrintingProductionOrder(order)}
                              title={t('production.print')}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stats Panel */}
      {showStats && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <ProductionOrderStatsCard productionOrderId={showStats} />
        </div>
      )}

      {/* Print Template */}
      {printingProductionOrder && (
        <PrintProductionOrderWrapper
          productionOrder={printingProductionOrder}
          onClose={() => setPrintingProductionOrder(null)}
        />
      )}
    </div>
  );
}

function PrintProductionOrderWrapper({ productionOrder, onClose }: { productionOrder: any, onClose: () => void }) {
  const { t } = useTranslation();
  const { data: rollsData, isLoading: rollsLoading } = useQuery({
    queryKey: ["/api/rolls/search"],
    queryFn: async () => {
      const response = await fetch("/api/rolls/search?q=");
      if (!response.ok) throw new Error("Failed to fetch rolls");
      return response.json();
    },
  });

  useEffect(() => {
    if (rollsLoading || !rollsData) return;
    
    const rolls = rollsData.filter((r: any) => r.production_order_id === productionOrder.id);
    
    const getStageLabel = (stage: string) => {
      const labels: Record<string, string> = {
        film: t('production.stages.film'),
        printing: t('production.stages.printing'),
        cutting: t('production.stages.cutting'),
        done: t('production.stages.done'),
        archived: t('production.stages.archived')
      };
      return labels[stage] || stage;
    };

    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        pending: t('production.status.pending'),
        active: t('production.status.active'),
        in_production: t('production.status.inProduction'),
        completed: t('production.status.completed'),
        cancelled: t('production.status.cancelled')
      };
      return labels[status] || status;
    };

    const getStatusColor = (status: string) => {
      const colors: Record<string, string> = {
        pending: "#f59e0b",
        active: "#22c55e",
        in_production: "#3b82f6",
        completed: "#6b7280",
        cancelled: "#ef4444"
      };
      return colors[status] || "#6b7280";
    };

    const filmRolls = rolls.filter((r: any) => r.stage === "film");
    const printingRolls = rolls.filter((r: any) => r.stage === "printing");
    const cuttingRolls = rolls.filter((r: any) => r.stage === "cutting");
    const doneRolls = rolls.filter((r: any) => r.stage === "done" || r.stage === "archived");

    const totalWeight = rolls.reduce((sum: number, r: any) => sum + parseFloat(r.weight_kg || 0), 0);
    const targetWeight = parseFloat(productionOrder.quantity_kg || 0);
    const progress = targetWeight > 0 ? Math.min(100, (totalWeight / targetWeight) * 100) : 0;

    const uniqueOperators = new Set<string>();
    rolls.forEach((r: any) => {
      if (r.created_by_name) uniqueOperators.add(r.created_by_name);
      if (r.printed_by_name) uniqueOperators.add(r.printed_by_name);
      if (r.cut_by_name) uniqueOperators.add(r.cut_by_name);
    });

    const uniqueMachines = new Set<string>();
    rolls.forEach((r: any) => {
      if (r.film_machine_name) uniqueMachines.add(`${t('production.stages.film')}: ${r.film_machine_name}`);
      if (r.printing_machine_name) uniqueMachines.add(`${t('production.stages.printing')}: ${r.printing_machine_name}`);
      if (r.cutting_machine_name) uniqueMachines.add(`${t('production.stages.cutting')}: ${r.cutting_machine_name}`);
    });

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
      alert(t('production.allowPopups'));
      onClose();
      return;
    }

    const printHTML = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>${t('production.printTemplate.productionOrder')} - ${productionOrder.production_order_number}</title>
        <style>
          @page { size: A4; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background: #f5f5f5; padding: 20px; }
          .print-container { max-width: 210mm; margin: 0 auto; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
          .header-right h1 { font-size: 24px; margin-bottom: 5px; }
          .header-right p { font-size: 12px; opacity: 0.8; }
          .order-number { background: white; color: #1e3a5f; padding: 10px 20px; border-radius: 8px; font-size: 18px; font-weight: bold; }
          .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; color: white; }
          .content { padding: 20px; }
          .info-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
          .info-box.highlight { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color: #f59e0b; }
          .info-label { font-size: 11px; color: #64748b; margin-bottom: 5px; font-weight: 600; }
          .info-value { font-size: 16px; font-weight: bold; color: #1e293b; }
          .section-title { font-size: 16px; font-weight: bold; color: #1e3a5f; padding: 10px 15px; background: #f1f5f9; border-right: 4px solid #1e3a5f; margin: 20px 0 15px; border-radius: 0 8px 8px 0; }
          .workflow-container { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 20px; }
          .workflow-stage { flex: 1; text-align: center; padding: 15px; border-radius: 10px; position: relative; }
          .workflow-stage.film { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border: 2px solid #3b82f6; }
          .workflow-stage.printing { background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border: 2px solid #a855f7; }
          .workflow-stage.cutting { background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%); border: 2px solid #f97316; }
          .workflow-stage.done { background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 2px solid #22c55e; }
          .stage-icon { font-size: 28px; margin-bottom: 8px; }
          .stage-name { font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .stage-count { font-size: 24px; font-weight: bold; }
          .stage-weight { font-size: 12px; color: #64748b; margin-top: 5px; }
          .progress-bar { height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin: 15px 0; position: relative; }
          .progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%); border-radius: 10px; transition: width 0.3s; }
          .progress-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 12px; font-weight: bold; color: #1e293b; }
          .rolls-table { width: 100%; border-collapse: collapse; font-size: 12px; }
          .rolls-table th { background: #1e3a5f; color: white; padding: 10px 8px; text-align: right; }
          .rolls-table td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
          .rolls-table tr:nth-child(even) { background: #f8fafc; }
          .rolls-table tr:hover { background: #f1f5f9; }
          .stage-film { color: #3b82f6; }
          .stage-printing { color: #a855f7; }
          .stage-cutting { color: #f97316; }
          .stage-done { color: #22c55e; }
          .team-section { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 20px; }
          .team-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; }
          .team-box h4 { font-size: 14px; color: #1e3a5f; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
          .team-list { font-size: 13px; color: #475569; line-height: 1.8; }
          .footer { background: #f8fafc; padding: 15px 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e5e7eb; }
          .print-btn { position: fixed; top: 20px; left: 20px; padding: 12px 24px; background: #1e3a5f; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
          .print-btn:hover { background: #2d5a87; }
          @media print {
            .print-btn { display: none; }
            body { background: white; padding: 0; }
            .print-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">🖨️ ${t('production.print')}</button>
        <div class="print-container">
          <div class="header">
            <div class="header-right">
              <h1>${t('production.printTemplate.productionOrder')}</h1>
              <p>${t('production.printTemplate.factoryName')}</p>
            </div>
            <div class="order-number">${productionOrder.production_order_number}</div>
            <div>
              <div class="status-badge" style="background: ${getStatusColor(productionOrder.status)}">
                ${getStatusLabel(productionOrder.status)}
              </div>
            </div>
          </div>
          
          <div class="content">
            <div class="info-section">
              <div class="info-box">
                <div class="info-label">${t('production.table.orderNumber')}</div>
                <div class="info-value">${productionOrder.order_number || '-'}</div>
              </div>
              <div class="info-box">
                <div class="info-label">${t('production.table.customer')}</div>
                <div class="info-value">${productionOrder.customer_name_ar || productionOrder.customer_name || '-'}</div>
              </div>
              <div class="info-box">
                <div class="info-label">${t('production.table.product')}</div>
                <div class="info-value">${productionOrder.item_name_ar || productionOrder.item_name || '-'}</div>
              </div>
              <div class="info-box">
                <div class="info-label">${t('production.printTemplate.size')}</div>
                <div class="info-value">${productionOrder.size_caption || '-'}</div>
              </div>
              <div class="info-box highlight">
                <div class="info-label">${t('production.printTemplate.requiredQuantity')}</div>
                <div class="info-value">${targetWeight.toFixed(2)} ${t('production.kg')}</div>
              </div>
              <div class="info-box">
                <div class="info-label">${t('production.printTemplate.creationDate')}</div>
                <div class="info-value">${productionOrder.created_at ? new Date(productionOrder.created_at).toLocaleDateString('en-US') : '-'}</div>
              </div>
            </div>

            <div class="section-title">📊 ${t('production.printTemplate.workflowAndStages')}</div>
            <div class="workflow-container">
              <div class="workflow-stage film">
                <div class="stage-icon">🎬</div>
                <div class="stage-name">${t('production.printTemplate.filmStage')}</div>
                <div class="stage-count stage-film">${filmRolls.length} ${t('production.printTemplate.roll')}</div>
                <div class="stage-weight">${filmRolls.reduce((s: number, r: any) => s + parseFloat(r.weight_kg || 0), 0).toFixed(2)} ${t('production.kg')}</div>
              </div>
              <div class="workflow-stage printing">
                <div class="stage-icon">🖨️</div>
                <div class="stage-name">${t('production.printTemplate.printingStage')}</div>
                <div class="stage-count stage-printing">${printingRolls.length} ${t('production.printTemplate.roll')}</div>
                <div class="stage-weight">${printingRolls.reduce((s: number, r: any) => s + parseFloat(r.weight_kg || 0), 0).toFixed(2)} ${t('production.kg')}</div>
              </div>
              <div class="workflow-stage cutting">
                <div class="stage-icon">✂️</div>
                <div class="stage-name">${t('production.printTemplate.cuttingStage')}</div>
                <div class="stage-count stage-cutting">${cuttingRolls.length} ${t('production.printTemplate.roll')}</div>
                <div class="stage-weight">${cuttingRolls.reduce((s: number, r: any) => s + parseFloat(r.weight_kg || 0), 0).toFixed(2)} ${t('production.kg')}</div>
              </div>
              <div class="workflow-stage done">
                <div class="stage-icon">✅</div>
                <div class="stage-name">${t('production.stages.done')}</div>
                <div class="stage-count stage-done">${doneRolls.length} ${t('production.printTemplate.roll')}</div>
                <div class="stage-weight">${doneRolls.reduce((s: number, r: any) => s + parseFloat(r.weight_kg || 0), 0).toFixed(2)} ${t('production.kg')}</div>
              </div>
            </div>

            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
              <div class="progress-text">${progress.toFixed(1)}% (${totalWeight.toFixed(2)} / ${targetWeight.toFixed(2)} ${t('production.kg')})</div>
            </div>

            ${rolls.length > 0 ? `
              <div class="section-title">📦 ${t('production.printTemplate.rollsList')} (${rolls.length} ${t('production.printTemplate.roll')})</div>
              <table class="rolls-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>${t('production.printTemplate.rollNumber')}</th>
                    <th>${t('production.printTemplate.stage')}</th>
                    <th>${t('production.printTemplate.weight')}</th>
                    <th>${t('production.printTemplate.filmBy')}</th>
                    <th>${t('production.printTemplate.printedBy')}</th>
                    <th>${t('production.printTemplate.cutBy')}</th>
                    <th>${t('production.printTemplate.productionDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${rolls.map((roll: any, index: number) => `
                    <tr>
                      <td>${index + 1}</td>
                      <td><strong>${roll.roll_number}</strong></td>
                      <td class="stage-${roll.stage}"><strong>${getStageLabel(roll.stage)}</strong></td>
                      <td>${parseFloat(roll.weight_kg || 0).toFixed(2)} ${t('production.kg')}</td>
                      <td>${roll.created_by_name || '-'}</td>
                      <td>${roll.printed_by_name || '-'}</td>
                      <td>${roll.cut_by_name || '-'}</td>
                      <td>${roll.created_at ? new Date(roll.created_at).toLocaleDateString('en-US') : '-'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : `<p style="text-align:center;color:#64748b;padding:20px;">${t('production.printTemplate.noRollsYet')}</p>`}

            <div class="team-section">
              <div class="team-box">
                <h4>👷 ${t('production.printTemplate.participatingWorkers')}</h4>
                <div class="team-list">
                  ${uniqueOperators.size > 0 ? Array.from(uniqueOperators).join(' • ') : t('production.printTemplate.noRegisteredWorkers')}
                </div>
              </div>
              <div class="team-box">
                <h4>🏭 ${t('production.printTemplate.usedMachines')}</h4>
                <div class="team-list">
                  ${uniqueMachines.size > 0 ? Array.from(uniqueMachines).join(' • ') : t('production.printTemplate.noRegisteredMachines')}
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            ${t('production.printTemplate.printedAt')}: ${new Date().toLocaleString('en-US')} | ${t('production.printTemplate.productionManagementSystem')}
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printHTML);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
    
    onClose();
  }, [rollsData, rollsLoading, productionOrder, onClose]);

  if (rollsLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>{t('production.loadingData')}</p>
        </div>
      </div>
    );
  }

  return null;
}
