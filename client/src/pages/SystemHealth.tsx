import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Activity,
  Database,
  Server,
  Cpu,
  HardDrive,
  Network,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Zap,
  Monitor,
  MemoryStick,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface HealthCheck {
  id: number;
  check_name: string;
  check_name_ar: string;
  check_type: string;
  status: string;
  last_check_time: string;
  check_duration_ms: number;
  success_rate_24h: number;
  average_response_time: number;
  error_count_24h: number;
  check_details: Record<string, any>;
  is_critical: boolean;
}

interface PerformanceMetric {
  id: number;
  metric_name: string;
  metric_category: string;
  value: number;
  unit: string;
  timestamp: string;
  source: string;
}

interface SystemOverview {
  overall_status: string;
  healthy_checks: number;
  warning_checks: number;
  critical_checks: number;
  last_check: string;
  uptime_percent: number;
  total_checks: number;
}

export default function SystemHealth() {
  const { t } = useTranslation();
  const [selectedTimeRange, setSelectedTimeRange] = useState("24h");

  const { data: overview } = useQuery<SystemOverview>({
    queryKey: ["/api/system/health/overview"],
    refetchInterval: 120000,
    staleTime: 90000,
  });

  const { data: healthChecks = [] } = useQuery<HealthCheck[]>({
    queryKey: ["/api/system/health/checks"],
    refetchInterval: 120000,
    staleTime: 90000,
  });

  const { data: performanceMetrics = [] } = useQuery<PerformanceMetric[]>({
    queryKey: ["/api/system/performance", { timeRange: selectedTimeRange }],
    refetchInterval: 120000,
    staleTime: 90000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-600";
      case "warning":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      database: Database,
      api: Network,
      service: Server,
      memory: MemoryStick,
      cpu: Cpu,
      disk: HardDrive,
      system: Monitor,
    };
    return icons[type as keyof typeof icons] || Activity;
  };

  const getCheckTypeLabel = (type: string) => {
    const typeKey = type as 'database' | 'api' | 'memory' | 'cpu' | 'disk' | 'system';
    return t(`system.health.checkTypes.${typeKey}`, type);
  };

  const getStatusLabel = (status: string) => {
    const statusKey = status as 'healthy' | 'warning' | 'critical' | 'unknown';
    return t(`system.health.status.${statusKey}`, status);
  };

  const chartData = performanceMetrics
    .filter((metric) => metric.metric_name === "memory_usage_percent")
    .slice(-24)
    .map((metric) => ({
      time: new Date(metric.timestamp).toLocaleTimeString("ar"),
      memory: parseFloat(metric.value.toString()),
      timestamp: metric.timestamp,
    }));

  const healthStatusData = [
    { name: t('system.health.status.healthy'), value: overview?.healthy_checks || 0, color: "#10B981" },
    { name: t('system.health.warning'), value: overview?.warning_checks || 0, color: "#F59E0B" },
    { name: t('system.health.danger'), value: overview?.critical_checks || 0, color: "#EF4444" },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('system.health.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {t('system.health.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Activity className="w-4 h-4 ml-1" />
            {t('system.health.liveMonitoring')}
          </Badge>
          {overview && (
            <Badge
              variant={
                overview.overall_status === "healthy"
                  ? "default"
                  : overview.overall_status === "warning"
                    ? "secondary"
                    : "destructive"
              }
            >
              <Shield className="w-4 h-4 ml-1" />
              {overview.overall_status === "healthy"
                ? t('system.health.systemHealthy')
                : overview.overall_status === "warning"
                  ? t('system.health.warning')
                  : t('system.health.danger')}
            </Badge>
          )}
        </div>
      </div>

      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    {t('system.health.healthyChecks')}
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                    {overview.healthy_checks}
                  </p>
                </div>
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950 dark:to-yellow-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    {t('system.health.warnings')}
                  </p>
                  <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                    {overview.warning_checks}
                  </p>
                </div>
                <AlertTriangle className="w-10 h-10 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">
                    {t('system.health.criticalCases')}
                  </p>
                  <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                    {overview.critical_checks}
                  </p>
                </div>
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {t('system.health.uptimePercent')}
                  </p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                    {overview.uptime_percent?.toFixed(1)}%
                  </p>
                </div>
                <Zap className="w-10 h-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="checks" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="checks" data-testid="tab-health-checks">
            {t('system.health.tabs.checks')}
          </TabsTrigger>
          <TabsTrigger value="performance" data-testid="tab-performance">
            {t('system.health.tabs.performance')}
          </TabsTrigger>
          <TabsTrigger value="overview" data-testid="tab-overview">
            {t('system.health.tabs.overview')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                {t('system.health.checksTitle')} ({healthChecks.length})
              </CardTitle>
              <CardDescription>
                {t('system.health.checksDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {healthChecks.map((check) => {
                  const TypeIcon = getTypeIcon(check.check_type);

                  return (
                    <Card key={check.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <TypeIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {check.check_name_ar}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {getCheckTypeLabel(check.check_type)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div
                              className={`font-semibold ${getStatusColor(check.status)}`}
                            >
                              {getStatusLabel(check.status)}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {check.check_duration_ms}ms
                            </div>
                          </div>

                          <div className="w-20">
                            <Progress
                              value={check.success_rate_24h}
                              className="h-2"
                            />
                            <div className="text-xs text-center mt-1 text-gray-600 dark:text-gray-300">
                              {check.success_rate_24h?.toFixed(1)}%
                            </div>
                          </div>

                          {check.is_critical && (
                            <Badge variant="destructive" className="text-xs">
                              {t('system.health.critical')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">
                            {t('system.health.avgResponseTime')}:{" "}
                          </span>
                          <span className="font-medium">
                            {check.average_response_time}ms
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">
                            {t('system.health.errors24h')}:{" "}
                          </span>
                          <span className="font-medium">
                            {check.error_count_24h}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-300">
                            {t('system.health.lastCheck')}:{" "}
                          </span>
                          <span className="font-medium">
                            {new Date(check.last_check_time).toLocaleTimeString(
                              "ar",
                            )}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="w-5 h-5" />
                  {t('system.health.memoryUsage')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => `${t('system.health.time')}: ${label}`}
                      formatter={(value) => [`${value}%`, t('system.health.memoryUsage')]}
                    />
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  {t('system.health.checksDistribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={healthStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {healthStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t('system.health.avgResponseTimeCard')}
                    </p>
                    <p className="text-2xl font-bold">
                      {healthChecks.reduce(
                        (acc, check) => acc + check.average_response_time,
                        0,
                      ) / (healthChecks.length || 1)}
                      ms
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t('system.health.successRate')}
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {(
                        healthChecks.reduce(
                          (acc, check) => acc + check.success_rate_24h,
                          0,
                        ) / (healthChecks.length || 1)
                      ).toFixed(1)}
                      %
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      {t('system.health.totalErrors')}
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {healthChecks.reduce(
                        (acc, check) => acc + check.error_count_24h,
                        0,
                      )}
                    </p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('system.health.systemInfo')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('system.health.systemStatus')}:
                  </span>
                  <Badge
                    variant={
                      overview?.overall_status === "healthy"
                        ? "default"
                        : "destructive"
                    }
                  >
                    {overview?.overall_status === "healthy"
                      ? t('system.health.status.healthy')
                      : t('system.health.status.needsAttention')}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('system.health.totalChecks')}:
                  </span>
                  <span className="font-medium">{overview?.total_checks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('system.health.uptimePercent')}:
                  </span>
                  <span className="font-medium">
                    {overview?.uptime_percent?.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">
                    {t('system.health.lastCheck')}:
                  </span>
                  <span className="font-medium">
                    {overview?.last_check
                      ? new Date(overview.last_check).toLocaleString("ar")
                      : t('system.health.notDefined')}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('system.health.recommendations')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview?.critical_checks &&
                    overview.critical_checks > 0 && (
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
                        <p className="text-sm font-medium text-red-900 dark:text-red-100">
                          ⚠️ {t('system.health.criticalWarning', { count: overview.critical_checks })}
                        </p>
                      </div>
                    )}

                  {overview?.warning_checks && overview.warning_checks > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        📋 {t('system.health.warningMessage', { count: overview.warning_checks })}
                      </p>
                    </div>
                  )}

                  {overview?.uptime_percent && overview.uptime_percent < 99 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        💡 {t('system.health.uptimeCanImprove')}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
