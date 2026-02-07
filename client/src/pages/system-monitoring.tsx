import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  MemoryStick,
  Server,
  Code2,
  FileWarning,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  XCircle,
  ArrowRight,
  Cpu,
  HardDrive,
  Zap,
  Trash2,
  Timer,
  Layers,
  BarChart3,
  Shield,
  Minus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { apiRequest } from '../lib/queryClient';
import { useState, useEffect, useCallback } from 'react';

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-emerald-500',
    ok: 'bg-emerald-500',
    warning: 'bg-amber-500',
    degraded: 'bg-amber-500',
    critical: 'bg-red-500',
    unknown: 'bg-gray-400',
  };
  return (
    <span className={`inline-block w-3 h-3 rounded-full ${colors[status] || colors.unknown} animate-pulse`} />
  );
}

function MetricGauge({ value, max, label, unit, color, icon: Icon }: {
  value: number;
  max: number;
  label: string;
  unit: string;
  color: string;
  icon: any;
}) {
  const percent = Math.min((value / max) * 100, 100);
  const getColor = () => {
    if (percent > 80) return 'bg-red-500';
    if (percent > 60) return 'bg-amber-500';
    return color;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <span>{label}</span>
        </div>
        <span className="font-mono font-semibold">{value}{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getColor()}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>{percent.toFixed(0)}%</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function MiniChart({ data, dataKey, height = 60, color = '#3b82f6' }: {
  data: any[];
  dataKey: string;
  height?: number;
  color?: string;
}) {
  if (!data || data.length < 2) return <div className="text-xs text-muted-foreground text-center py-4">لا توجد بيانات كافية للرسم البياني</div>;

  const values = data.map(d => d[dataKey] || 0);
  const max = Math.max(...values) * 1.1 || 1;
  const min = Math.min(...values) * 0.9;
  const range = max - min || 1;

  const width = 100;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 8);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <polygon points={areaPoints} fill={color} opacity="0.1" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrendArrow({ direction }: { direction: string }) {
  if (direction === 'increasing') return <TrendingUp className="h-4 w-4 text-red-500" />;
  if (direction === 'decreasing') return <TrendingDown className="h-4 w-4 text-emerald-500" />;
  return <Minus className="h-4 w-4 text-gray-400" />;
}

export default function SystemMonitoring() {
  const [, setLocation] = useLocation();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: diag, isLoading, refetch: refetchDiag } = useQuery<any>({
    queryKey: ['/api/monitoring/diagnostics'],
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const { data: codeHealth, isLoading: healthLoading, refetch: refetchHealth } = useQuery<any>({
    queryKey: ['/api/monitoring/code-health'],
    refetchInterval: false,
  });

  const gcMutation = useMutation({
    mutationFn: () => apiRequest('/api/monitoring/gc', { method: 'POST' }),
    onSuccess: () => {
      setTimeout(() => refetchDiag(), 1000);
    },
  });

  const refreshAll = useCallback(() => {
    refetchDiag();
    refetchHealth();
    setLastRefresh(new Date());
  }, [refetchDiag, refetchHealth]);

  useEffect(() => {
    if (diag) setLastRefresh(new Date());
  }, [diag]);

  const overallStatus = diag?.overallStatus || 'unknown';
  const memory = diag?.memory;
  const eventLoop = diag?.eventLoop;
  const cpu = diag?.cpu;
  const proc = diag?.process;
  const osInfo = diag?.os;
  const api = diag?.api;
  const database = diag?.database;
  const memoryHistory = diag?.memoryHistory || [];

  const statusLabels: Record<string, string> = {
    healthy: 'سليم',
    warning: 'تحذير',
    critical: 'حرج',
    degraded: 'متدهور',
    unknown: 'غير معروف',
  };

  const statusColors: Record<string, string> = {
    healthy: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    unknown: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">جاري تحميل بيانات النظام...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button onClick={() => setLocation('/')} variant="ghost" size="icon">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold">مراقبة النظام</h1>
              <Badge className={statusColors[overallStatus]}>
                <StatusDot status={overallStatus} />
                <span className="mr-2">{statusLabels[overallStatus]}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              آخر تحديث: {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: ar })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Timer className="h-4 w-4 ml-1" />
            {autoRefresh ? 'تحديث تلقائي' : 'تحديث يدوي'}
          </Button>
          <Button onClick={refreshAll} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 ml-1" />
            تحديث
          </Button>
        </div>
      </div>

      {memory?.warnings && memory.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">تحذيرات النظام:</div>
            <ul className="list-disc list-inside space-y-1">
              {memory.warnings.map((w: string, i: number) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            {memory.recommendation && (
              <p className="mt-2 text-sm opacity-90">{memory.recommendation}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-r-4 border-r-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Heap</span>
              <MemoryStick className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold font-mono">
              {memory?.current?.heapUsedMB || '0'}<span className="text-sm font-normal text-muted-foreground mr-1">MB</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TrendArrow direction={memory?.trend?.direction || 'stable'} />
              <span className="text-xs text-muted-foreground">
                {memory?.current?.heapUsagePercent || '0'}% من {memory?.current?.heapTotalMB || '0'}MB
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">RSS</span>
              <HardDrive className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold font-mono">
              {memory?.current?.rssMB || '0'}<span className="text-sm font-normal text-muted-foreground mr-1">MB</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              الذاكرة الفعلية المستخدمة
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Event Loop</span>
              <Zap className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold font-mono">
              {eventLoop?.currentLagMs || '0'}<span className="text-sm font-normal text-muted-foreground mr-1">ms</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              <StatusDot status={eventLoop?.status || 'unknown'} />
              <span className="text-xs text-muted-foreground">{statusLabels[eventLoop?.status || 'unknown']}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">CPU</span>
              <Cpu className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold font-mono">
              {cpu?.usagePercent || '0'}<span className="text-sm font-normal text-muted-foreground mr-1">%</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {cpu?.systemCpus || 0} أنوية
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="memory" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="memory" className="gap-1.5">
            <MemoryStick className="h-4 w-4" />
            الذاكرة
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-1.5">
            <Gauge className="h-4 w-4" />
            الأداء
          </TabsTrigger>
          <TabsTrigger value="database" className="gap-1.5">
            <Database className="h-4 w-4" />
            قاعدة البيانات
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-1.5">
            <Server className="h-4 w-4" />
            النظام
          </TabsTrigger>
          <TabsTrigger value="code-health" className="gap-1.5">
            <Code2 className="h-4 w-4" />
            صحة الكود
          </TabsTrigger>
        </TabsList>

        <TabsContent value="memory" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  الذاكرة عبر الزمن
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Heap Used (MB)</div>
                    <MiniChart data={memoryHistory} dataKey="heapUsedMB" color="#3b82f6" height={80} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">RSS (MB)</div>
                    <MiniChart data={memoryHistory} dataKey="rssMB" color="#8b5cf6" height={80} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Event Loop Lag (ms)</div>
                    <MiniChart data={memoryHistory} dataKey="eventLoopLag" color="#10b981" height={60} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    تفاصيل الذاكرة
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => gcMutation.mutate()}
                    disabled={gcMutation.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 ml-1" />
                    {gcMutation.isPending ? 'جاري...' : 'تنظيف الذاكرة'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricGauge
                  value={parseFloat(memory?.current?.heapUsedMB || '0')}
                  max={parseFloat(memory?.current?.heapTotalMB || '512')}
                  label="Heap Used"
                  unit="MB"
                  color="bg-blue-500"
                  icon={MemoryStick}
                />
                <MetricGauge
                  value={parseFloat(memory?.current?.rssMB || '0')}
                  max={1024}
                  label="RSS (الذاكرة الفعلية)"
                  unit="MB"
                  color="bg-purple-500"
                  icon={HardDrive}
                />
                <MetricGauge
                  value={parseFloat(memory?.current?.externalMB || '0')}
                  max={200}
                  label="External (C++ Objects)"
                  unit="MB"
                  color="bg-cyan-500"
                  icon={Layers}
                />
                <MetricGauge
                  value={parseFloat(memory?.current?.arrayBuffersMB || '0')}
                  max={100}
                  label="ArrayBuffers"
                  unit="MB"
                  color="bg-teal-500"
                  icon={BarChart3}
                />

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">تحليل الاتجاه</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">الاتجاه</span>
                      <div className="flex items-center gap-1">
                        <TrendArrow direction={memory?.trend?.direction || 'stable'} />
                        <span className="font-medium">
                          {memory?.trend?.direction === 'increasing' ? 'تصاعدي' :
                           memory?.trend?.direction === 'decreasing' ? 'تنازلي' : 'مستقر'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">التغيير</span>
                      <span className="font-mono font-medium">{memory?.trend?.changeMB || '0'}MB</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">المتوسط</span>
                      <span className="font-mono font-medium">{memory?.average?.heapUsedMB || '0'}MB</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">الذروة</span>
                      <span className="font-mono font-medium">{memory?.peak?.heapUsedMB || '0'}MB</span>
                    </div>
                  </div>

                  {memory?.trend?.isMemoryLeak && (
                    <Alert variant="destructive" className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <span className="font-semibold">تسريب محتمل في الذاكرة!</span>
                        <span className="block text-sm mt-1">
                          ثقة الاكتشاف: {memory.trend.leakConfidence}%
                          {memory.recommendation && <span className="block mt-1">{memory.recommendation}</span>}
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {!memory?.trend?.isMemoryLeak && memory?.recommendation && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-sm">
                      <Shield className="h-4 w-4 text-emerald-600 mt-0.5" />
                      <span className="text-emerald-700 dark:text-emerald-400">{memory.recommendation}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-3xl font-bold font-mono">{api?.totalRequests || 0}</div>
                <div className="text-sm text-muted-foreground">إجمالي الطلبات</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                <div className="text-3xl font-bold font-mono">{api?.averageResponseTime || 0}<span className="text-sm mr-1">ms</span></div>
                <div className="text-sm text-muted-foreground">متوسط الاستجابة</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <div className="text-3xl font-bold font-mono">{api?.slowRequestsPercent || 0}<span className="text-sm mr-1">%</span></div>
                <div className="text-sm text-muted-foreground">طلبات بطيئة</div>
              </CardContent>
            </Card>
          </div>

          {memoryHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">CPU عبر الزمن</CardTitle>
              </CardHeader>
              <CardContent>
                <MiniChart data={memoryHistory} dataKey="cpuUsage" color="#f59e0b" height={80} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">أداء API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              {api?.endpoints && api.endpoints.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground pb-2 border-b px-2">
                    <span className="col-span-2">Endpoint</span>
                    <span className="text-center">الطلبات</span>
                    <span className="text-left">الوقت</span>
                  </div>
                  {[...api.endpoints]
                    .sort((a: any, b: any) => b.avgTime - a.avgTime)
                    .map((endpoint: any, i: number) => {
                      const isSlow = endpoint.avgTime > 500;
                      const isVerySlow = endpoint.avgTime > 2000;
                      return (
                        <div
                          key={i}
                          className={`grid grid-cols-4 gap-2 items-center px-2 py-2 rounded-md text-sm ${
                            isVerySlow ? 'bg-red-50 dark:bg-red-950/20' :
                            isSlow ? 'bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="col-span-2 font-mono text-xs truncate" title={endpoint.endpoint}>
                            {endpoint.endpoint}
                          </div>
                          <div className="text-center">
                            <Badge variant="outline" className="text-xs">{endpoint.count}</Badge>
                          </div>
                          <div className="text-left">
                            <span className={`font-mono text-sm font-medium ${
                              isVerySlow ? 'text-red-600 dark:text-red-400' :
                              isSlow ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {endpoint.avgTime}ms
                            </span>
                            {endpoint.maxTime > endpoint.avgTime * 1.5 && (
                              <span className="text-xs text-muted-foreground mr-1">(max: {endpoint.maxTime}ms)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>لا توجد بيانات بعد</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4 text-center">
                <Database className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-3xl font-bold font-mono">{database?.totalQueries || 0}</div>
                <div className="text-sm text-muted-foreground">إجمالي الاستعلامات</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-emerald-500" />
                <div className="text-3xl font-bold font-mono">{database?.averageTime || 0}<span className="text-sm mr-1">ms</span></div>
                <div className="text-sm text-muted-foreground">متوسط وقت الاستعلام</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <div className="text-3xl font-bold font-mono">{database?.slowQueries?.length || 0}</div>
                <div className="text-sm text-muted-foreground">استعلامات بطيئة</div>
              </CardContent>
            </Card>
          </div>

          {database?.slowQueries && database.slowQueries.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">الاستعلامات البطيئة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {database.slowQueries.map((query: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/10">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="destructive" className="font-mono">{query.duration}ms</Badge>
                        <span className="text-xs text-muted-foreground">
                          {query.timestamp && formatDistanceToNow(new Date(query.timestamp), { addSuffix: true, locale: ar })}
                        </span>
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto font-mono" dir="ltr">
                        {query.query}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {database?.patterns && database.patterns.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">أنماط الاستعلامات الأكثر استخداماً</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {database.patterns.map((pattern: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-2 border rounded-md text-sm">
                      <div className="flex-1 truncate font-mono text-xs" dir="ltr" title={pattern.query}>
                        {pattern.query.substring(0, 80)}...
                      </div>
                      <div className="flex items-center gap-3 mr-3 text-xs text-muted-foreground whitespace-nowrap">
                        <span>{pattern.count}x</span>
                        <span className="font-mono">{pattern.avgTime}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(!database?.slowQueries || database.slowQueries.length === 0) && (!database?.patterns || database.patterns.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                <div className="text-lg font-semibold">أداء قاعدة البيانات ممتاز!</div>
                <div className="text-sm text-muted-foreground">لا توجد استعلامات بطيئة</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  معلومات العملية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'معرف العملية (PID)', value: proc?.pid },
                    { label: 'إصدار Node.js', value: proc?.nodeVersion },
                    { label: 'المنصة', value: proc?.platform },
                    { label: 'المعمارية', value: proc?.arch },
                    { label: 'وقت التشغيل', value: proc?.uptimeFormatted },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono font-medium">{value || '-'}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  موارد نظام التشغيل
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <MetricGauge
                  value={parseFloat(osInfo?.usedMemoryPercent || '0')}
                  max={100}
                  label="ذاكرة النظام"
                  unit="%"
                  color="bg-violet-500"
                  icon={MemoryStick}
                />
                <div className="text-xs text-muted-foreground text-center">
                  {osInfo?.freeMemoryMB || '0'}MB حرة من {osInfo?.totalMemoryMB || '0'}MB
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">معدل التحميل (Load Average)</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {['1 دقيقة', '5 دقائق', '15 دقيقة'].map((label, i) => (
                      <div key={i} className="p-2 rounded-lg bg-muted/50">
                        <div className="font-mono font-semibold">{cpu?.loadAverage?.[i]?.toFixed(2) || '0.00'}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Event Loop</h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: 'حالي', value: `${eventLoop?.currentLagMs || '0'}ms` },
                      { label: 'متوسط', value: `${eventLoop?.averageLagMs || '0'}ms` },
                      { label: 'أقصى', value: `${eventLoop?.maxLagMs || '0'}ms` },
                    ].map(({ label, value }, i) => (
                      <div key={i} className="p-2 rounded-lg bg-muted/50">
                        <div className="font-mono font-semibold">{value}</div>
                        <div className="text-xs text-muted-foreground">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="code-health" className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">
              {codeHealth?.cached && (
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 ml-1" />
                  مُخزّن مؤقتاً ({codeHealth.cacheAge})
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchHealth()}
              disabled={healthLoading}
            >
              <RefreshCw className={`h-4 w-4 ml-1 ${healthLoading ? 'animate-spin' : ''}`} />
              فحص جديد
            </Button>
          </div>

          {healthLoading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">جاري فحص الكود...</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold font-mono">{codeHealth?.totalFiles || 0}</div>
                    <div className="text-sm text-muted-foreground">إجمالي الملفات</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold font-mono text-red-500">
                      {codeHealth?.summary?.largeFiles || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">ملفات كبيرة</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold font-mono text-amber-500">
                      {codeHealth?.summary?.deprecatedPatterns || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">أنماط مهجورة</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl font-bold font-mono text-blue-500">
                      {codeHealth?.summary?.duplicateCode || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">كود مكرر</div>
                  </CardContent>
                </Card>
              </div>

              {codeHealth?.recommendations && codeHealth.recommendations.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">التوصيات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {codeHealth.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-sm">
                          <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                          <span className="text-blue-800 dark:text-blue-300">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {codeHealth?.issues && codeHealth.issues.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">المشاكل المكتشفة ({codeHealth.issues.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {codeHealth.issues.map((issue: any, i: number) => (
                        <div
                          key={i}
                          className={`p-3 border rounded-lg text-sm ${
                            issue.severity === 'high' ? 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/10' :
                            issue.severity === 'medium' ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/10' :
                            'border-gray-200 dark:border-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <FileWarning className={`h-4 w-4 ${
                              issue.severity === 'high' ? 'text-red-500' :
                              issue.severity === 'medium' ? 'text-amber-500' : 'text-gray-500'
                            }`} />
                            <Badge variant={
                              issue.severity === 'high' ? 'destructive' :
                              issue.severity === 'medium' ? 'default' : 'secondary'
                            } className="text-xs">
                              {issue.severity === 'high' ? 'عالي' :
                               issue.severity === 'medium' ? 'متوسط' : 'منخفض'}
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground">{issue.type}</span>
                          </div>
                          <div className="font-mono text-xs text-muted-foreground mb-1" dir="ltr">{issue.file}</div>
                          <div className="text-sm">{issue.message}</div>
                          {issue.suggestion && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {issue.suggestion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(!codeHealth?.issues || codeHealth.issues.length === 0) && !healthLoading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                    <div className="text-lg font-semibold">صحة الكود ممتازة!</div>
                    <div className="text-sm text-muted-foreground">لم يتم العثور على مشاكل</div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
