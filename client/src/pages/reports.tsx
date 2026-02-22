import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { userHasPermission } from "../utils/roleUtils";
import type { PermissionKey } from "../../../shared/permissions";
import PageLayout from "../components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  formatNumber,
  formatPercentage,
  formatNumberWithCommas,
} from "../lib/formatNumber";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Filter,
  Calendar as CalendarIcon,
  FileText,
  Users,
  Settings,
  Package,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  InteractiveBarChart,
  InteractiveLineChart,
  InteractivePieChart,
  InteractiveAreaChart,
  ComboChart,
  MetricsGrid,
} from "../components/charts";

const reportsTabPermissions: { tab: string; permissions: PermissionKey[] }[] = [
  { tab: 'production', permissions: ['view_production_reports', 'view_reports'] },
  { tab: 'quality', permissions: ['view_quality_control_reports', 'view_quality', 'view_reports'] },
  { tab: 'maintenance', permissions: ['view_maintenance_stats_reports', 'view_maintenance', 'view_reports'] },
  { tab: 'hr', permissions: ['view_hr_reports', 'view_hr', 'view_reports'] },
  { tab: 'financial', permissions: ['view_financial_reports', 'view_reports'] },
];

export default function Reports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [reportType, setReportType] = useState(
    reportsTabPermissions.find(tp => userHasPermission(user, tp.permissions))?.tab || 'production'
  );

  // Get date range for API calls
  const getDateRange = () => {
    const now = new Date();
    let from: string, to: string;

    switch (selectedPeriod) {
      case "week":
        from = format(
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          "yyyy-MM-dd",
        );
        to = format(now, "yyyy-MM-dd");
        break;
      case "quarter":
        from = format(
          new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
          "yyyy-MM-dd",
        );
        to = format(now, "yyyy-MM-dd");
        break;
      case "year":
        from = format(new Date(now.getFullYear(), 0, 1), "yyyy-MM-dd");
        to = format(now, "yyyy-MM-dd");
        break;
      case "custom":
        from = dateRange.from
          ? format(dateRange.from, "yyyy-MM-dd")
          : format(
              new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
              "yyyy-MM-dd",
            );
        to = dateRange.to
          ? format(dateRange.to, "yyyy-MM-dd")
          : format(now, "yyyy-MM-dd");
        break;
      default: // month
        from = format(
          new Date(now.getFullYear(), now.getMonth(), 1),
          "yyyy-MM-dd",
        );
        to = format(now, "yyyy-MM-dd");
    }

    return { from, to };
  };

  const { from, to } = getDateRange();

  // Fetch comprehensive dashboard data
  const { data: dashboardData, isLoading: isDashboardLoading } = useQuery({
    queryKey: ["/api/reports/dashboard", from, to],
    queryFn: () =>
      fetch(`/api/reports/dashboard?date_from=${from}&date_to=${to}`).then(
        (res) => res.json(),
      ),
  });

  // Fetch order reports
  const { data: orderReports, isLoading: isOrdersLoading } = useQuery({
    queryKey: ["/api/reports/orders", from, to],
    queryFn: () =>
      fetch(`/api/reports/orders?date_from=${from}&date_to=${to}`).then((res) =>
        res.json(),
      ),
  });

  // Fetch advanced metrics
  const { data: advancedMetrics, isLoading: isMetricsLoading } = useQuery({
    queryKey: ["/api/reports/advanced-metrics", from, to],
    queryFn: () =>
      fetch(
        `/api/reports/advanced-metrics?date_from=${from}&date_to=${to}`,
      ).then((res) => res.json()),
  });

  // Fetch HR reports
  const { data: hrReports, isLoading: isHRLoading } = useQuery({
    queryKey: ["/api/reports/hr", from, to],
    queryFn: () =>
      fetch(`/api/reports/hr?date_from=${from}&date_to=${to}`).then((res) =>
        res.json(),
      ),
  });

  // Fetch maintenance reports
  const { data: maintenanceReports, isLoading: isMaintenanceLoading } =
    useQuery({
      queryKey: ["/api/reports/maintenance", from, to],
      queryFn: () =>
        fetch(`/api/reports/maintenance?date_from=${from}&date_to=${to}`).then(
          (res) => res.json(),
        ),
    });

  const isLoading =
    isDashboardLoading ||
    isOrdersLoading ||
    isMetricsLoading ||
    isHRLoading ||
    isMaintenanceLoading;

  const reportTypes = [
    {
      value: "production",
      label: "تقارير الإنتاج",
      icon: <Package className="w-4 h-4" />,
    },
    {
      value: "quality",
      label: "تقارير الجودة",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      value: "maintenance",
      label: "تقارير الصيانة",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      value: "hr",
      label: "تقارير الموارد البشرية",
      icon: <Users className="w-4 h-4" />,
    },
    {
      value: "financial",
      label: "التقارير المالية",
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  const exportReport = async (format: string) => {
    try {
      const response = await fetch("/api/reports/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          report_type: reportType,
          format,
          date_from: from,
          date_to: to,
          filters: { period: selectedPeriod },
        }),
      });

      if (response.ok) {
        if (format === "json") {
          const data = await response.json();
          const blob = new Blob([JSON.stringify(data.data, null, 2)], {
            type: "application/json",
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${reportType}-${from}-${to}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          const blob = await response.blob();
          const ext = format === "excel" ? "xlsx" : format;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${reportType}-${from}-${to}.${ext}`;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Export error:", error);
    }
  };

  // Format chart data helpers
  const safeToFixed = (value: any, decimals: number = 1): string => {
    const numValue =
      typeof value === "number" && !isNaN(value)
        ? value
        : typeof value === "string"
          ? parseFloat(value)
          : 0;
    const safeValue = isNaN(numValue) ? 0 : numValue;
    return safeValue.toFixed(decimals);
  };

  const formatChartValue = (
    value: any,
    type: "number" | "percentage" | "currency" = "number",
  ) => {
    // Ensure value is a valid number
    const numValue =
      typeof value === "number" && !isNaN(value)
        ? value
        : typeof value === "string"
          ? parseFloat(value)
          : 0;

    const safeValue = isNaN(numValue) ? 0 : numValue;

    switch (type) {
      case "percentage":
        return `${safeValue.toFixed(1)}%`;
      case "currency":
        return `${formatNumberWithCommas(safeValue)} ريال`;
      default:
        return formatNumberWithCommas(safeValue);
    }
  };

  return (
    <PageLayout title="التقارير والتحليلات" description="تقارير شاملة حول الأداء والإنتاجية">
      {/* Report Controls */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                خيارات التقرير
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    نوع التقرير
                  </label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {reportTypes.map((type) => (
                        <SelectItem
                          key={type.value}
                          value={type.value || "unknown"}
                        >
                          <div className="flex items-center gap-2">
                            {type.icon}
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    الفترة الزمنية
                  </label>
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">هذا الأسبوع</SelectItem>
                      <SelectItem value="month">هذا الشهر</SelectItem>
                      <SelectItem value="quarter">هذا الربع</SelectItem>
                      <SelectItem value="year">هذا العام</SelectItem>
                      <SelectItem value="custom">فترة مخصصة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    من تاريخ
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from
                          ? format(dateRange.from, "PPP", { locale: ar })
                          : "اختر التاريخ"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) =>
                          setDateRange({ ...dateRange, from: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    onClick={() => exportReport("excel")}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    تصدير Excel
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportReport("pdf")}
                  >
                    PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => exportReport("csv")}
                  >
                    CSV
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Content */}
          <Tabs value={reportType} onValueChange={setReportType}>
            <TabsList className="flex flex-wrap gap-1 h-auto">
              {reportTypes.map((type) => {
                const tabPerm = reportsTabPermissions.find(t => t.tab === type.value);
                if (tabPerm && !userHasPermission(user, tabPerm.permissions)) return null;
                return (
                  <TabsTrigger
                    key={type.value}
                    value={type.value}
                    className="text-xs"
                  >
                    <div className="flex items-center gap-1">
                      {type.icon}
                      <span className="hidden sm:inline">
                        {type.label.split(" ")[1]}
                      </span>
                    </div>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {/* Production Reports */}
            <TabsContent value="production">
              {isLoading ? (
                <div
                  className="text-center py-8"
                  data-testid="loading-production"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">جاري تحميل التقارير...</p>
                </div>
              ) : (
                <>
                  {/* Production KPI Metrics */}
                  {dashboardData?.success && (
                    <MetricsGrid
                      columns={4}
                      className="mb-6"
                      metrics={[
                        {
                          title: "إجمالي الإنتاج",
                          value: formatNumberWithCommas(
                            dashboardData.data.realTime?.currentStats
                              ?.daily_weight || 0,
                          ),
                          description: "كيلوجرام",
                          icon: <Package className="w-5 h-5" />,
                          trend: {
                            value: 5.2,
                            isPositive: true,
                            label: "من الأسبوع الماضي",
                          },
                        },
                        {
                          title: "كفاءة الإنتاج",
                          value: `${safeToFixed(dashboardData.data.realTime?.currentStats?.avg_efficiency || 90)}%`,
                          description: "متوسط الكفاءة",
                          icon: <Target className="w-5 h-5" />,
                          trend: {
                            value: 3.1,
                            isPositive: true,
                            label: "تحسن",
                          },
                        },
                        {
                          title: "الطلبات النشطة",
                          value: formatNumber(
                            dashboardData.data.realTime?.currentStats
                              ?.active_orders || 0,
                          ),
                          description: "طلبات قيد التنفيذ",
                          icon: <Activity className="w-5 h-5" />,
                          trend: {
                            value: 0,
                            isPositive: true,
                            label: "مستقر",
                          },
                        },
                        {
                          title: "معدل الهدر",
                          value: `${safeToFixed(((dashboardData.data.realTime?.currentStats?.current_waste || 0) / Math.max(dashboardData.data.realTime?.currentStats?.daily_weight || 1, 1)) * 100)}%`,
                          description: "نسبة الهدر",
                          icon: <AlertTriangle className="w-5 h-5" />,
                          trend: {
                            value: 1.8,
                            isPositive: false,
                            label: "يحتاج تحسين",
                          },
                        },
                      ]}
                    />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Machine Utilization Chart */}
                    {dashboardData?.success &&
                      dashboardData.data.machineUtilization && (
                        <InteractiveBarChart
                          data={dashboardData.data.machineUtilization}
                          title="إنتاجية المكائن"
                          description="إجمالي الإنتاج لكل ماكينة بالكيلوجرام"
                          xAxisKey="machine_name"
                          yAxisKey="total_weight"
                          barColor="#3b82f6"
                          height={350}
                          formatValue={(value) =>
                            formatChartValue(value, "number") + " كج"
                          }
                          className="h-full"
                        />
                      )}

                    {/* Production Efficiency Trends */}
                    {dashboardData?.success &&
                      dashboardData.data.productionEfficiency?.trends && (
                        <InteractiveLineChart
                          data={dashboardData.data.productionEfficiency.trends}
                          title="اتجاهات الكفاءة اليومية"
                          description="تتبع كفاءة الإنتاج على مدار الأيام"
                          xAxisKey="date"
                          lines={[
                            {
                              key: "daily_efficiency",
                              name: "الكفاءة اليومية",
                              color: "#10b981",
                            },
                          ]}
                          height={350}
                          formatValue={(value) =>
                            formatChartValue(value, "percentage")
                          }
                          className="h-full"
                        />
                      )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Machine Status Distribution */}
                    {dashboardData?.success &&
                      dashboardData.data.realTime?.machineStatus && (
                        <InteractivePieChart
                          data={dashboardData.data.realTime.machineStatus.reduce(
                            (acc: any[], machine: any) => {
                              const existing = acc.find(
                                (item) => item.status === machine.status,
                              );
                              if (existing) {
                                existing.count += 1;
                              } else {
                                acc.push({
                                  status:
                                    machine.status === "active"
                                      ? "نشطة"
                                      : machine.status === "idle"
                                        ? "متوقفة"
                                        : "تحت الصيانة",
                                  count: 1,
                                });
                              }
                              return acc;
                            },
                            [],
                          )}
                          title="حالة المكائن"
                          description="توزيع حالات المكائن"
                          nameKey="status"
                          valueKey="count"
                          height={300}
                          colors={["#10b981", "#f59e0b", "#ef4444"]}
                        />
                      )}

                    {/* Production Queue Status */}
                    {dashboardData?.success &&
                      dashboardData.data.realTime?.queueStats && (
                        <InteractiveBarChart
                          data={[
                            {
                              stage: "البثق",
                              count:
                                dashboardData.data.realTime.queueStats
                                  .film_queue,
                            },
                            {
                              stage: "الطباعة",
                              count:
                                dashboardData.data.realTime.queueStats
                                  .printing_queue,
                            },
                            {
                              stage: "القطع",
                              count:
                                dashboardData.data.realTime.queueStats
                                  .cutting_queue,
                            },
                            {
                              stage: "في الانتظار",
                              count:
                                dashboardData.data.realTime.queueStats
                                  .pending_orders,
                            },
                          ]}
                          title="طوابير الإنتاج"
                          description="عدد الطلبات في كل مرحلة"
                          xAxisKey="stage"
                          yAxisKey="count"
                          barColor="#8b5cf6"
                          height={300}
                          formatValue={(value) => formatNumber(value)}
                        />
                      )}

                    {/* Advanced Metrics - OEE */}
                    {advancedMetrics?.success &&
                      advancedMetrics.data.oeeMetrics &&
                      advancedMetrics.data.oeeMetrics.length > 0 && (
                        <ComboChart
                          data={advancedMetrics.data.oeeMetrics}
                          title="مؤشر فعالية المعدات (OEE)"
                          description="التوفر والأداء والجودة"
                          xAxisKey="machine_name"
                          elements={[
                            {
                              type: "bar",
                              key: "availability",
                              name: "التوفر",
                              color: "#3b82f6",
                              yAxisId: "left",
                            },
                            {
                              type: "bar",
                              key: "performance",
                              name: "الأداء",
                              color: "#10b981",
                              yAxisId: "left",
                            },
                            {
                              type: "line",
                              key: "oee",
                              name: "OEE الإجمالي",
                              color: "#f59e0b",
                              yAxisId: "right",
                            },
                          ]}
                          height={300}
                          formatValue={(value) =>
                            formatChartValue(value, "percentage")
                          }
                          leftAxisLabel="النسبة %"
                          rightAxisLabel="OEE %"
                        />
                      )}
                  </div>

                  {/* Production Alerts */}
                  {dashboardData?.success &&
                    dashboardData.data.alerts &&
                    dashboardData.data.alerts.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            تنبيهات الإنتاج
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {dashboardData.data.alerts
                              .slice(0, 5)
                              .map((alert: any, index: number) => (
                                <div
                                  key={index}
                                  className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200"
                                >
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={`w-2 h-2 rounded-full ${
                                        alert.priority === "critical"
                                          ? "bg-red-500"
                                          : alert.priority === "high"
                                            ? "bg-amber-500"
                                            : "bg-blue-500"
                                      }`}
                                    ></div>
                                    <div>
                                      <p className="font-medium text-gray-900">
                                        {alert.title}
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {alert.message}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge
                                    variant={
                                      alert.priority === "critical"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                  >
                                    {alert.priority === "critical"
                                      ? "حرج"
                                      : alert.priority === "high"
                                        ? "عالي"
                                        : "متوسط"}
                                  </Badge>
                                </div>
                              ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </>
              )}
            </TabsContent>

            {/* Quality Reports - Advanced Metrics */}
            <TabsContent value="quality">
              {isLoading ? (
                <div className="text-center py-8" data-testid="loading-quality">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    جاري تحميل تقارير الجودة...
                  </p>
                </div>
              ) : (
                <>
                  {/* Quality KPI Metrics */}
                  {advancedMetrics?.success && (
                    <MetricsGrid
                      columns={4}
                      className="mb-6"
                      metrics={[
                        {
                          title: "معدل الجودة",
                          value: `${safeToFixed(advancedMetrics.data.qualityMetrics?.quality_rate || 95)}%`,
                          description: "نسبة الإنتاج السليم",
                          icon: <CheckCircle2 className="w-5 h-5" />,
                          trend: {
                            value: 2.1,
                            isPositive: true,
                            label: "تحسن",
                          },
                        },
                        {
                          title: "إجمالي الرولات",
                          value: formatNumber(
                            advancedMetrics.data.qualityMetrics?.total_rolls ||
                              0,
                          ),
                          description: "رولات مفحوصة",
                          icon: <Package className="w-5 h-5" />,
                          trend: {
                            value: 15.3,
                            isPositive: true,
                            label: "زيادة",
                          },
                        },
                        {
                          title: "الرولات المعيبة",
                          value: formatNumber(
                            advancedMetrics.data.qualityMetrics
                              ?.defective_rolls || 0,
                          ),
                          description: "تحتاج إعادة عمل",
                          icon: <AlertTriangle className="w-5 h-5" />,
                          trend: {
                            value: 3.2,
                            isPositive: false,
                            label: "انخفاض",
                          },
                        },
                        {
                          title: "متوسط الهدر",
                          value: `${safeToFixed(advancedMetrics.data.qualityMetrics?.avg_waste_percentage || 0)}%`,
                          description: "نسبة الهدر",
                          icon: <Activity className="w-5 h-5" />,
                          trend: {
                            value: 1.5,
                            isPositive: false,
                            label: "يحتاج تحسين",
                          },
                        },
                      ]}
                    />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Quality Rate vs Defect Rate */}
                    {advancedMetrics?.success && (
                      <ComboChart
                        data={[
                          {
                            period: "هذا الشهر",
                            quality_rate:
                              advancedMetrics.data.qualityMetrics
                                ?.quality_rate || 95,
                            defect_rate:
                              100 -
                              (advancedMetrics.data.qualityMetrics
                                ?.quality_rate || 95),
                            rework_rate:
                              advancedMetrics.data.qualityMetrics
                                ?.rework_rate || 2,
                          },
                        ]}
                        title="مؤشرات الجودة الشاملة"
                        description="معدل الجودة مقابل معدل العيوب"
                        xAxisKey="period"
                        elements={[
                          {
                            type: "bar",
                            key: "quality_rate",
                            name: "معدل الجودة",
                            color: "#10b981",
                          },
                          {
                            type: "bar",
                            key: "defect_rate",
                            name: "معدل العيوب",
                            color: "#ef4444",
                          },
                          {
                            type: "line",
                            key: "rework_rate",
                            name: "معدل إعادة العمل",
                            color: "#f59e0b",
                          },
                        ]}
                        height={350}
                        formatValue={(value) =>
                          formatChartValue(value, "percentage")
                        }
                        leftAxisLabel="النسبة %"
                      />
                    )}

                    {/* Cycle Time Analysis */}
                    {advancedMetrics?.success &&
                      advancedMetrics.data.cycleTimeStats && (
                        <InteractiveBarChart
                          data={[
                            {
                              stage: "البثق → الطباعة",
                              time: advancedMetrics.data.cycleTimeStats
                                .avg_film_to_printing,
                            },
                            {
                              stage: "الطباعة → القطع",
                              time: advancedMetrics.data.cycleTimeStats
                                .avg_printing_to_cutting,
                            },
                            {
                              stage: "إجمالي الدورة",
                              time: advancedMetrics.data.cycleTimeStats
                                .avg_total_cycle_time,
                            },
                          ]}
                          title="تحليل أوقات الدورة"
                          description="متوسط الوقت لكل مرحلة بالساعات"
                          xAxisKey="stage"
                          yAxisKey="time"
                          barColor="#6366f1"
                          height={350}
                          formatValue={(value) => `${safeToFixed(value)} ساعة`}
                        />
                      )}
                  </div>

                  {/* Machine OEE Performance */}
                  {advancedMetrics?.success &&
                    advancedMetrics.data.oeeMetrics &&
                    advancedMetrics.data.oeeMetrics.length > 0 && (
                      <Card className="mb-6">
                        <CardHeader>
                          <CardTitle>
                            أداء المكائن - فعالية المعدات الشاملة (OEE)
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <InteractiveBarChart
                            data={advancedMetrics.data.oeeMetrics}
                            title=""
                            xAxisKey="machine_name"
                            yAxisKey="oee"
                            barColor="#10b981"
                            height={300}
                            formatValue={(value) =>
                              formatChartValue(value, "percentage")
                            }
                          />
                        </CardContent>
                      </Card>
                    )}
                </>
              )}
            </TabsContent>

            {/* Maintenance Reports */}
            <TabsContent value="maintenance">
              {isLoading ? (
                <div
                  className="text-center py-8"
                  data-testid="loading-maintenance"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    جاري تحميل تقارير الصيانة...
                  </p>
                </div>
              ) : (
                <>
                  {/* Maintenance KPI Metrics */}
                  {maintenanceReports?.success && (
                    <MetricsGrid
                      columns={4}
                      className="mb-6"
                      metrics={[
                        {
                          title: "طلبات الصيانة",
                          value: formatNumber(
                            maintenanceReports.data.maintenanceStats
                              ?.total_requests || 0,
                          ),
                          description: "إجمالي الطلبات",
                          icon: <Settings className="w-5 h-5" />,
                          trend: {
                            value: 8.3,
                            isPositive: false,
                            label: "انخفاض",
                          },
                        },
                        {
                          title: "الطلبات المكتملة",
                          value: formatNumber(
                            maintenanceReports.data.maintenanceStats
                              ?.completed_requests || 0,
                          ),
                          description: "تم الانتهاء",
                          icon: <CheckCircle2 className="w-5 h-5" />,
                          trend: {
                            value: 12.5,
                            isPositive: true,
                            label: "تحسن",
                          },
                        },
                        {
                          title: "متوسط وقت الإصلاح",
                          value: `${safeToFixed(maintenanceReports.data.maintenanceStats?.avg_resolution_time || 0)}`,
                          description: "ساعة",
                          icon: <Clock className="w-5 h-5" />,
                          trend: {
                            value: 5.7,
                            isPositive: false,
                            label: "تقليل الوقت",
                          },
                        },
                        {
                          title: "الطلبات الحرجة",
                          value: formatNumber(
                            maintenanceReports.data.maintenanceStats
                              ?.critical_requests || 0,
                          ),
                          description: "تحتاج انتباه",
                          icon: <AlertTriangle className="w-5 h-5" />,
                          trend: {
                            value: 15.2,
                            isPositive: false,
                            label: "انخفاض",
                          },
                        },
                      ]}
                    />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Maintenance Cost Analysis */}
                    {maintenanceReports?.success &&
                      maintenanceReports.data.costAnalysis && (
                        <InteractiveBarChart
                          data={maintenanceReports.data.costAnalysis}
                          title="تحليل تكاليف الصيانة"
                          description="التكلفة التقديرية لصيانة كل ماكينة"
                          xAxisKey="machine_name"
                          yAxisKey="estimated_cost"
                          barColor="#f59e0b"
                          height={350}
                          formatValue={(value) =>
                            formatChartValue(value, "currency")
                          }
                        />
                      )}

                    {/* Downtime Analysis */}
                    {maintenanceReports?.success &&
                      maintenanceReports.data.downtimeAnalysis && (
                        <InteractiveAreaChart
                          data={[
                            {
                              type: "التوقف المخطط",
                              hours:
                                maintenanceReports.data.downtimeAnalysis
                                  .planned_downtime,
                            },
                            {
                              type: "التوقف الطارئ",
                              hours:
                                maintenanceReports.data.downtimeAnalysis
                                  .unplanned_downtime,
                            },
                            {
                              type: "الإجمالي",
                              hours:
                                maintenanceReports.data.downtimeAnalysis
                                  .total_downtime,
                            },
                          ]}
                          title="تحليل فترات التوقف"
                          description="ساعات التوقف حسب النوع"
                          xAxisKey="type"
                          areas={[
                            {
                              key: "hours",
                              name: "الساعات",
                              color: "#ef4444",
                            },
                          ]}
                          height={350}
                          formatValue={(value) => `${safeToFixed(value)} ساعة`}
                        />
                      )}
                  </div>

                  {/* MTBF (Mean Time Between Failures) */}
                  {maintenanceReports?.success && (
                    <Card>
                      <CardHeader>
                        <CardTitle>متوسط الوقت بين الأعطال (MTBF)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-center p-8">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-blue-600 mb-2">
                              {safeToFixed(
                                maintenanceReports.data.downtimeAnalysis
                                  ?.mtbf || 168,
                                0,
                              )}
                            </div>
                            <div className="text-lg text-gray-600">ساعة</div>
                            <div className="text-sm text-gray-500 mt-2">
                              متوسط الوقت بين الأعطال للمكائن
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* HR Reports */}
            <TabsContent value="hr">
              {isLoading ? (
                <div className="text-center py-8" data-testid="loading-hr">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    جاري تحميل تقارير الموارد البشرية...
                  </p>
                </div>
              ) : (
                <>
                  {/* HR KPI Metrics */}
                  {hrReports?.success && (
                    <MetricsGrid
                      columns={4}
                      className="mb-6"
                      metrics={[
                        {
                          title: "معدل الحضور",
                          value: "94.5%",
                          description: "نسبة الحضور العامة",
                          icon: <Users className="w-5 h-5" />,
                          trend: {
                            value: 2.1,
                            isPositive: true,
                            label: "تحسن",
                          },
                        },
                        {
                          title: "برامج التدريب",
                          value: formatNumber(
                            hrReports.data.trainingStats?.total_programs || 0,
                          ),
                          description: "برامج نشطة",
                          icon: <Package className="w-5 h-5" />,
                          trend: {
                            value: 15.3,
                            isPositive: true,
                            label: "زيادة",
                          },
                        },
                        {
                          title: "معدل الإكمال",
                          value: `${safeToFixed(hrReports.data.trainingStats?.completion_rate || 0)}%`,
                          description: "إكمال التدريب",
                          icon: <Target className="w-5 h-5" />,
                          trend: {
                            value: 8.7,
                            isPositive: true,
                            label: "ممتاز",
                          },
                        },
                        {
                          title: "كفاءة الفريق",
                          value: "91.2%",
                          description: "متوسط الأداء",
                          icon: <Zap className="w-5 h-5" />,
                          trend: {
                            value: 4.3,
                            isPositive: true,
                            label: "تحسن مستمر",
                          },
                        },
                      ]}
                    />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Attendance Analysis */}
                    {hrReports?.success && hrReports.data.attendanceStats && (
                      <InteractiveBarChart
                        data={hrReports.data.attendanceStats.slice(0, 10)}
                        title="تحليل الحضور والغياب"
                        description="معدل الحضور لكل موظف"
                        xAxisKey="display_name_ar"
                        yAxisKey="attendance_rate"
                        barColor="#10b981"
                        height={350}
                        formatValue={(value) =>
                          formatChartValue(value, "percentage")
                        }
                      />
                    )}

                    {/* Performance vs Training */}
                    {hrReports?.success && hrReports.data.performanceStats && (
                      <ComboChart
                        data={hrReports.data.performanceStats.slice(0, 8)}
                        title="الأداء مقابل التدريب"
                        description="كفاءة الإنتاج ومعدل الأخطاء"
                        xAxisKey="display_name_ar"
                        elements={[
                          {
                            type: "bar",
                            key: "production_efficiency",
                            name: "كفاءة الإنتاج",
                            color: "#3b82f6",
                            yAxisId: "left",
                          },
                          {
                            type: "line",
                            key: "error_rate",
                            name: "معدل الأخطاء",
                            color: "#ef4444",
                            yAxisId: "right",
                          },
                        ]}
                        height={350}
                        formatValue={(value) =>
                          formatChartValue(value, "percentage")
                        }
                        formatRightAxis={(value) =>
                          formatChartValue(value, "percentage")
                        }
                        leftAxisLabel="الكفاءة %"
                        rightAxisLabel="الأخطاء %"
                      />
                    )}
                  </div>

                  {/* Training Program Progress */}
                  {hrReports?.success && hrReports.data.trainingStats && (
                    <Card>
                      <CardHeader>
                        <CardTitle>تقدم برامج التدريب</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {hrReports.data.trainingStats.total_programs}
                            </div>
                            <div className="text-sm text-gray-600">
                              إجمالي البرامج
                            </div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {hrReports.data.trainingStats.completed_trainings}
                            </div>
                            <div className="text-sm text-gray-600">
                              تدريبات مكتملة
                            </div>
                          </div>
                          <div className="text-center p-4 bg-amber-50 rounded-lg">
                            <div className="text-2xl font-bold text-amber-600">
                              {hrReports.data.trainingStats.total_enrollments -
                                hrReports.data.trainingStats
                                  .completed_trainings}
                            </div>
                            <div className="text-sm text-gray-600">
                              قيد التنفيذ
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            {/* Financial/Orders Reports */}
            <TabsContent value="financial">
              {isLoading ? (
                <div
                  className="text-center py-8"
                  data-testid="loading-financial"
                >
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">
                    جاري تحميل التقارير المالية...
                  </p>
                </div>
              ) : (
                <>
                  {/* Financial KPI Metrics */}
                  {orderReports?.success && (
                    <MetricsGrid
                      columns={4}
                      className="mb-6"
                      metrics={[
                        {
                          title: "إجمالي الطلبات",
                          value: formatNumber(
                            orderReports.data.revenueStats?.total_orders || 0,
                          ),
                          description: "طلب مكتمل",
                          icon: <Package className="w-5 h-5" />,
                          trend: {
                            value: 12.5,
                            isPositive: true,
                            label: "نمو",
                          },
                        },
                        {
                          title: "الإيرادات المقدرة",
                          value: formatChartValue(
                            orderReports.data.revenueStats?.estimated_revenue ||
                              0,
                            "currency",
                          ),
                          description: "ريال سعودي",
                          icon: <BarChart3 className="w-5 h-5" />,
                          trend: {
                            value: 18.3,
                            isPositive: true,
                            label: "زيادة",
                          },
                        },
                        {
                          title: "متوسط قيمة الطلب",
                          value: formatChartValue(
                            orderReports.data.revenueStats?.avg_order_value ||
                              0,
                            "currency",
                          ),
                          description: "ريال للطلب",
                          icon: <Target className="w-5 h-5" />,
                          trend: {
                            value: 5.7,
                            isPositive: true,
                            label: "نمو",
                          },
                        },
                        {
                          title: "الطلبات في الوقت",
                          value: `${safeToFixed(((orderReports.data.deliveryPerformance?.on_time_orders || 0) / Math.max(orderReports.data.revenueStats?.total_orders || 1, 1)) * 100)}%`,
                          description: "أداء التسليم",
                          icon: <CheckCircle2 className="w-5 h-5" />,
                          trend: {
                            value: 8.9,
                            isPositive: true,
                            label: "تحسن",
                          },
                        },
                      ]}
                    />
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Order Status Distribution */}
                    {orderReports?.success &&
                      orderReports.data.orderStatusStats && (
                        <InteractivePieChart
                          data={orderReports.data.orderStatusStats.map(
                            (status: any) => ({
                              status:
                                status.status === "completed"
                                  ? "مكتمل"
                                  : status.status === "in_production"
                                    ? "قيد الإنتاج"
                                    : status.status === "pending"
                                      ? "في الانتظار"
                                      : status.status === "cancelled"
                                        ? "ملغي"
                                        : status.status,
                              count: status.count,
                            }),
                          )}
                          title="توزيع حالة الطلبات"
                          description="نسبة كل حالة من إجمالي الطلبات"
                          nameKey="status"
                          valueKey="count"
                          height={350}
                          colors={["#10b981", "#3b82f6", "#f59e0b", "#ef4444"]}
                        />
                      )}

                    {/* Top Customers */}
                    {orderReports?.success &&
                      orderReports.data.topCustomers && (
                        <InteractiveBarChart
                          data={orderReports.data.topCustomers.slice(0, 8)}
                          title="أكثر العملاء طلباً"
                          description="العملاء الأكثر نشاطاً من حيث عدد الطلبات"
                          xAxisKey="customer_name"
                          yAxisKey="order_count"
                          barColor="#8b5cf6"
                          height={350}
                          formatValue={(value) => formatNumber(value) + " طلب"}
                        />
                      )}
                  </div>

                  {/* Revenue vs Quantity Trend */}
                  {orderReports?.success && orderReports.data.topCustomers && (
                    <ComboChart
                      data={orderReports.data.topCustomers.slice(0, 6)}
                      title="الإيرادات مقابل الكمية"
                      description="تحليل الإيرادات والكميات للعملاء الرئيسيين"
                      xAxisKey="customer_name"
                      elements={[
                        {
                          type: "bar",
                          key: "total_quantity",
                          name: "الكمية (كج)",
                          color: "#3b82f6",
                          yAxisId: "left",
                        },
                        {
                          type: "line",
                          key: "total_value",
                          name: "القيمة (ريال)",
                          color: "#10b981",
                          yAxisId: "right",
                        },
                      ]}
                      height={350}
                      formatValue={(value) =>
                        formatChartValue(value, "number") + " كج"
                      }
                      formatRightAxis={(value) =>
                        formatChartValue(value, "currency")
                      }
                      leftAxisLabel="الكمية"
                      rightAxisLabel="القيمة"
                    />
                  )}

                  {/* Delivery Performance */}
                  {orderReports?.success &&
                    orderReports.data.deliveryPerformance && (
                      <Card className="mt-6">
                        <CardHeader>
                          <CardTitle>أداء التسليم</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-green-50 rounded-lg">
                              <div className="text-2xl font-bold text-green-600">
                                {
                                  orderReports.data.deliveryPerformance
                                    .on_time_orders
                                }
                              </div>
                              <div className="text-sm text-gray-600">
                                طلبات في الوقت
                              </div>
                            </div>
                            <div className="text-center p-4 bg-red-50 rounded-lg">
                              <div className="text-2xl font-bold text-red-600">
                                {
                                  orderReports.data.deliveryPerformance
                                    .late_orders
                                }
                              </div>
                              <div className="text-sm text-gray-600">
                                طلبات متأخرة
                              </div>
                            </div>
                            <div className="text-center p-4 bg-blue-50 rounded-lg">
                              <div className="text-2xl font-bold text-blue-600">
                                {safeToFixed(
                                  orderReports.data.deliveryPerformance
                                    .avg_delivery_days || 0,
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                متوسط أيام التسليم
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                </>
              )}
            </TabsContent>
          </Tabs>
    </PageLayout>
  );
}
