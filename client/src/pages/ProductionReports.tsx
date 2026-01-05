import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { format, subDays } from "date-fns";
import {
  FileDown,
  Search,
  RotateCcw,
  TrendingUp,
  Package,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";
import { useToast } from "../hooks/use-toast";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function ProductionReports() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    dateFrom: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    customerId: [] as number[],
    productId: [] as number[],
    status: [] as string[],
    sectionId: "",
    machineId: "",
    operatorId: "",
  });

  const [activeFilters, setActiveFilters] = useState(filters);

  const { data: summary, isLoading: summaryLoading } = useQuery<any>({
    queryKey: ["/api/reports/production-summary", activeFilters],
    enabled: !!activeFilters.dateFrom && !!activeFilters.dateTo,
  });

  const { data: productionByDate, isLoading: dateLoading } = useQuery<any>({
    queryKey: ["/api/reports/production-by-date", activeFilters],
    enabled: !!activeFilters.dateFrom && !!activeFilters.dateTo,
  });

  const { data: productionByProduct, isLoading: productLoading } = useQuery<any>({
    queryKey: ["/api/reports/production-by-product", activeFilters],
    enabled: !!activeFilters.dateFrom && !!activeFilters.dateTo,
  });

  const { data: wasteAnalysis, isLoading: wasteLoading } = useQuery<any>({
    queryKey: ["/api/reports/waste-analysis", activeFilters],
    enabled: !!activeFilters.dateFrom && !!activeFilters.dateTo,
  });

  const { data: machinePerformance, isLoading: machineLoading } = useQuery<any>({
    queryKey: ["/api/reports/machine-performance", activeFilters],
    enabled: !!activeFilters.dateFrom && !!activeFilters.dateTo,
  });

  const { data: operatorPerformance, isLoading: operatorLoading } = useQuery<any>({
    queryKey: ["/api/reports/operator-performance", activeFilters],
    enabled: !!activeFilters.dateFrom && !!activeFilters.dateTo,
  });

  const { data: customers } = useQuery<any>({ queryKey: ["/api/customers"] });
  const { data: products } = useQuery<any>({ queryKey: ["/api/customer-products"] });
  const { data: machines } = useQuery<any>({ queryKey: ["/api/machines"] });
  const { data: users } = useQuery<any>({ queryKey: ["/api/users"] });
  const { data: sections } = useQuery<any>({ queryKey: ["/api/sections"] });

  const handleSearch = () => {
    setActiveFilters(filters);
  };

  const handleReset = () => {
    const defaultFilters = {
      dateFrom: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      dateTo: format(new Date(), "yyyy-MM-dd"),
      customerId: [] as number[],
      productId: [] as number[],
      status: [] as string[],
      sectionId: "",
      machineId: "",
      operatorId: "",
    };
    setFilters(defaultFilters);
    setActiveFilters(defaultFilters);
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      if (summary?.data) {
        const summaryData = [
          [t('production.reports.totalOrders'), summary.data.totalOrders],
          [t('production.reports.activeOrders'), summary.data.activeOrders],
          [t('production.statuses.completed'), summary.data.completedOrders],
          [t('production.reports.producedRolls'), summary.data.totalRolls],
          [t('production.reports.totalWeight'), summary.data.totalWeight],
          [t('production.reports.avgProductionTime') + " (" + t('production.reports.hour') + ")", summary.data.avgProductionTime?.toFixed(2)],
          [t('production.reports.wastePercentage') + " %", summary.data.wastePercentage?.toFixed(2)],
          [t('production.reports.completionRate') + " %", summary.data.completionRate?.toFixed(2)],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      }

      if (productionByDate?.data) {
        const dateSheet = XLSX.utils.json_to_sheet(productionByDate.data);
        XLSX.utils.book_append_sheet(workbook, dateSheet, "Daily Production");
      }

      if (productionByProduct?.data) {
        const productSheet = XLSX.utils.json_to_sheet(productionByProduct.data);
        XLSX.utils.book_append_sheet(workbook, productSheet, "By Product");
      }

      if (machinePerformance?.data) {
        const machineSheet = XLSX.utils.json_to_sheet(machinePerformance.data);
        XLSX.utils.book_append_sheet(workbook, machineSheet, "Machine Performance");
      }

      if (operatorPerformance?.data) {
        const operatorSheet = XLSX.utils.json_to_sheet(operatorPerformance.data);
        XLSX.utils.book_append_sheet(workbook, operatorSheet, "Operator Performance");
      }

      XLSX.writeFile(workbook, `Production_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
      toast({
        title: t('production.reports.exportSuccess'),
        description: t('production.reports.exportSuccessDesc'),
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: t('production.reports.exportError'),
        description: t('production.reports.exportErrorDesc'),
        variant: "destructive",
      });
    }
  };

  const exportToPDF = () => {
    window.print();
  };

  const getStatusColor = (value: number, metric: string) => {
    if (metric === "waste") {
      if (value < 3) return "text-green-600 bg-green-50";
      if (value < 5) return "text-yellow-600 bg-yellow-50";
      return "text-red-600 bg-red-50";
    }
    if (value >= 90) return "text-green-600 bg-green-50";
    if (value >= 70) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">{t('production.reports.title')}</h1>
          <p className="text-muted-foreground">{t('production.reports.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" data-testid="button-export-excel">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            {t('production.reports.exportExcel')}
          </Button>
          <Button onClick={exportToPDF} variant="outline" data-testid="button-export-pdf">
            <FileText className="mr-2 h-4 w-4" />
            {t('production.reports.printPdf')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('production.reports.filters')}</CardTitle>
          <CardDescription>{t('production.reports.filtersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateFrom">{t('production.reports.dateFrom')}</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                data-testid="input-date-from"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateTo">{t('production.reports.dateTo')}</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                data-testid="input-date-to"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section">{t('production.reports.section')}</Label>
              <Select
                value={filters.sectionId || "all"}
                onValueChange={(value) => setFilters({ ...filters, sectionId: value === "all" ? "" : value })}
              >
                <SelectTrigger data-testid="select-section">
                  <SelectValue placeholder={t('production.reports.selectSection')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('production.reports.allSections')}</SelectItem>
                  {sections?.map((section: any) => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name_ar || section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="machine">{t('production.reports.machine')}</Label>
              <Select
                value={filters.machineId || "all"}
                onValueChange={(value) => setFilters({ ...filters, machineId: value === "all" ? "" : value })}
              >
                <SelectTrigger data-testid="select-machine">
                  <SelectValue placeholder={t('production.reports.selectMachine')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('production.reports.allMachines')}</SelectItem>
                  {machines?.map((machine: any) => (
                    <SelectItem key={machine.id} value={machine.id}>
                      {machine.name_ar || machine.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={handleSearch} data-testid="button-search">
              <Search className="mr-2 h-4 w-4" />
              {t('production.reports.search')}
            </Button>
            <Button onClick={handleReset} variant="outline" data-testid="button-reset">
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('production.reports.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('production.reports.totalOrders')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-orders">
                {summary?.data?.totalOrders || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('production.reports.activeOrders')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold text-blue-600" data-testid="text-active-orders">
                {summary?.data?.activeOrders || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('production.reports.producedRolls')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-rolls">
                {summary?.data?.totalRolls || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('production.reports.avgProductionTime')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-avg-time">
                {summary?.data?.avgProductionTime?.toFixed(1) || "0"} {t('production.reports.hour')}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('production.reports.wastePercentage')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div
                className={`text-2xl font-bold rounded px-2 ${getStatusColor(summary?.data?.wastePercentage || 0, "waste")}`}
                data-testid="text-waste-percentage"
              >
                {summary?.data?.wastePercentage?.toFixed(2) || "0"}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('production.reports.completionRate')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div
                className={`text-2xl font-bold rounded px-2 ${getStatusColor(summary?.data?.completionRate || 0, "completion")}`}
                data-testid="text-completion-rate"
              >
                {summary?.data?.completionRate?.toFixed(1) || "0"}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="daily" data-testid="tab-daily">{t('production.reports.dailyProduction')}</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">{t('production.reports.byProduct')}</TabsTrigger>
          <TabsTrigger value="waste" data-testid="tab-waste">{t('production.reports.wasteAnalysis')}</TabsTrigger>
          <TabsTrigger value="machines" data-testid="tab-machines">{t('production.reports.machinePerformance')}</TabsTrigger>
          <TabsTrigger value="operators" data-testid="tab-operators">{t('production.reports.operatorPerformance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('production.reports.dailyProduction')}</CardTitle>
              <CardDescription>{t('production.reports.dailyProductionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {dateLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={productionByDate?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="rollsCount"
                      stroke="#3b82f6"
                      name={t('production.reports.rollsCount')}
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="totalWeight"
                      stroke="#10b981"
                      name={t('production.reports.weightKg')}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('production.reports.productionByProduct')}</CardTitle>
              <CardDescription>{t('production.reports.productDistributionDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {productLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productionByProduct?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="productName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalWeight" fill="#3b82f6" name={t('production.reports.weightKg')} />
                    <Bar dataKey="rollsCount" fill="#10b981" name={t('production.reports.rollsCount')} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('production.reports.productDistribution')}</CardTitle>
              <CardDescription>{t('production.reports.percentageByProduct')}</CardDescription>
            </CardHeader>
            <CardContent>
              {productLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={productionByProduct?.data || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.productName}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="totalWeight"
                    >
                      {(productionByProduct?.data || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waste" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('production.reports.wasteTrend')}</CardTitle>
              <CardDescription>{t('production.reports.wasteTrendDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {wasteLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={wasteAnalysis?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="totalWaste"
                      stroke="#ef4444"
                      fill="#fecaca"
                      name={t('production.reports.wasteAmount')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="machines" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('production.reports.machinePerformance')}</CardTitle>
              <CardDescription>{t('production.reports.machinePerformanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {machineLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={machinePerformance?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="machineName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalWeight" fill="#3b82f6" name={t('production.reports.weightKg')} />
                    <Bar dataKey="rollsCount" fill="#10b981" name={t('production.reports.rollsCount')} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('production.reports.machinePerformanceTable')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('production.reports.machineName')}</TableHead>
                    <TableHead>{t('production.reports.rollsCount')}</TableHead>
                    <TableHead>{t('production.reports.totalWeight')}</TableHead>
                    <TableHead>{t('production.reports.avgTime')}</TableHead>
                    <TableHead>{t('production.reports.efficiency')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machinePerformance?.data?.map((machine: any, index: number) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{machine.machineName}</TableCell>
                      <TableCell>{machine.rollsCount}</TableCell>
                      <TableCell>{machine.totalWeight?.toFixed(2)}</TableCell>
                      <TableCell>{machine.avgTime?.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(machine.efficiency || 0, "efficiency")}>
                          {machine.efficiency?.toFixed(1) || 0}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('production.reports.operatorPerformance')}</CardTitle>
              <CardDescription>{t('production.reports.machinePerformanceDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {operatorLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={operatorPerformance?.data || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="operatorName" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalWeight" fill="#3b82f6" name={t('production.reports.weightKg')} />
                    <Bar dataKey="rollsCount" fill="#10b981" name={t('production.reports.rollsCount')} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
