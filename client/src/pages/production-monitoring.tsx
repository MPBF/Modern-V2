import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import PageLayout from "../components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Film,
  Printer,
  Scissors,
  Users,
  TrendingUp,
  RefreshCw,
  Download,
  Search,
  Package,
  Activity,
  Clock,
  Target,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  FileText,
} from "lucide-react";

const COLORS = {
  film: "#3B82F6",      // blue
  printing: "#10B981",  // green
  cutting: "#F59E0B",   // amber
  primary: "#6366F1",   // indigo
  success: "#22C55E",   // green
  warning: "#EAB308",   // yellow
  danger: "#EF4444",    // red
};

interface ProductionStats {
  total_weight: number;
  total_rolls: number;
  completed_orders: number;
  active_orders: number;
  efficiency: number;
}

interface MachineProduction {
  machine_id: string;
  machine_name: string;
  section: string;
  total_production_kg: number;
  rolls_produced: number;
  utilization_percent: number;
  last_production: string;
}

interface UserPerformance {
  user_id: number;
  username: string;
  display_name_ar: string;
  section: string;
  total_production_kg: number;
  rolls_count: number;
  efficiency_score: number;
  last_activity: string;
}

interface Roll {
  roll_id: number;
  roll_number: string;
  production_order_number: string;
  customer_name: string;
  weight_kg: number;
  stage: string;
  section: string;
  created_at: string;
}

interface ProductionOrder {
  production_order_id: number;
  production_order_number: string;
  order_number: string;
  customer_name: string;
  section: string;
  status: string;
  progress_percent: number;
  created_at: string;
}

export default function ProductionMonitoring() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("film");
  const [searchRoll, setSearchRoll] = useState("");
  const [searchOrder, setSearchOrder] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    setDateFrom(weekAgo.toISOString().split("T")[0]);
    setDateTo(now.toISOString().split("T")[0]);
  }, []);

  // Fetch production statistics by section
  const { data: filmStats, refetch: refetchFilm } = useQuery<ProductionStats>({
    queryKey: ["/api/production/stats-by-section/film", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: printingStats, refetch: refetchPrinting } = useQuery<ProductionStats>({
    queryKey: ["/api/production/stats-by-section/printing", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo,
  });

  const { data: cuttingStats, refetch: refetchCutting } = useQuery<ProductionStats>({
    queryKey: ["/api/production/stats-by-section/cutting", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo,
  });

  // Fetch users performance (production department only)
  const { data: filmUsers } = useQuery<{ data: UserPerformance[] }>({
    queryKey: ["/api/production/users-performance/film", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo && activeTab === "film",
  });

  const { data: printingUsers } = useQuery<{ data: UserPerformance[] }>({
    queryKey: ["/api/production/users-performance/printing", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo && activeTab === "printing",
  });

  const { data: cuttingUsers } = useQuery<{ data: UserPerformance[] }>({
    queryKey: ["/api/production/users-performance/cutting", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo && activeTab === "cutting",
  });

  // Fetch machines production
  const { data: filmMachines } = useQuery<{ data: MachineProduction[] }>({
    queryKey: ["/api/production/machines-production/film", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo && activeTab === "film",
  });

  const { data: printingMachines } = useQuery<{ data: MachineProduction[] }>({
    queryKey: ["/api/production/machines-production/printing", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo && activeTab === "printing",
  });

  const { data: cuttingMachines } = useQuery<{ data: MachineProduction[] }>({
    queryKey: ["/api/production/machines-production/cutting", { dateFrom, dateTo }],
    enabled: !!dateFrom && !!dateTo && activeTab === "cutting",
  });

  // Fetch rolls tracking
  const { data: rollsData } = useQuery<{ data: Roll[] }>({
    queryKey: [`/api/production/rolls-tracking/${activeTab}`, { search: searchRoll }],
    enabled: activeTab !== "",
  });

  // Fetch production orders
  const { data: ordersData } = useQuery<{ data: ProductionOrder[] }>({
    queryKey: [`/api/production/orders-tracking/${activeTab}`, { search: searchOrder }],
    enabled: activeTab !== "",
  });

  const handleRefresh = () => {
    refetchFilm();
    refetchPrinting();
    refetchCutting();
  };

  const handleExport = () => {
    const exportData = {
      section: activeTab,
      dateFrom,
      dateTo,
      timestamp: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", `production-${activeTab}-${dateTo}.json`);
    linkElement.click();
  };

  const formatNumber = (num: number = 0) => {
    return new Intl.NumberFormat("ar-EG").format(Math.round(num));
  };

  const formatWeight = (kg: number = 0) => {
    return `${formatNumber(kg)} كجم`;
  };

  const getStats = (section: string): ProductionStats => {
    const defaultStats: ProductionStats = {
      total_weight: 0,
      total_rolls: 0,
      completed_orders: 0,
      active_orders: 0,
      efficiency: 0,
    };

    switch (section) {
      case "film":
        return filmStats || defaultStats;
      case "printing":
        return printingStats || defaultStats;
      case "cutting":
        return cuttingStats || defaultStats;
      default:
        return defaultStats;
    }
  };

  const getUsers = (): UserPerformance[] => {
    switch (activeTab) {
      case "film":
        return filmUsers?.data || [];
      case "printing":
        return printingUsers?.data || [];
      case "cutting":
        return cuttingUsers?.data || [];
      default:
        return [];
    }
  };

  const getMachines = (): MachineProduction[] => {
    switch (activeTab) {
      case "film":
        return filmMachines?.data || [];
      case "printing":
        return printingMachines?.data || [];
      case "cutting":
        return cuttingMachines?.data || [];
      default:
        return [];
    }
  };

  const getSectionIcon = (section: string) => {
    switch (section) {
      case "film":
        return <Film className="w-5 h-5" />;
      case "printing":
        return <Printer className="w-5 h-5" />;
      case "cutting":
        return <Scissors className="w-5 h-5" />;
      default:
        return <Activity className="w-5 h-5" />;
    }
  };

  const getSectionColor = (section: string) => {
    switch (section) {
      case "film":
        return COLORS.film;
      case "printing":
        return COLORS.printing;
      case "cutting":
        return COLORS.cutting;
      default:
        return COLORS.primary;
    }
  };

  const currentStats = getStats(activeTab);
  const currentUsers = getUsers();
  const currentMachines = getMachines();
  const rolls = rollsData?.data || [];
  const orders = ordersData?.data || [];

  // Prepare chart data
  const usersChartData = currentUsers.slice(0, 10).map(user => ({
    name: user.display_name_ar || user.username,
    production: user.total_production_kg,
    rolls: user.rolls_count,
  }));

  const machinesChartData = currentMachines.map(machine => ({
    name: machine.machine_name,
    production: machine.total_production_kg,
    utilization: machine.utilization_percent,
  }));

  return (
    <PageLayout title={t("monitoring.title")} description={t("monitoring.description")}>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4 ml-2" />
                {t("monitoring.refresh")}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                data-testid="button-export"
              >
                <Download className="w-4 h-4 ml-2" />
                {t("monitoring.export")}
              </Button>
            </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-sm font-medium">{t("monitoring.timePeriod")}</span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40"
                  data-testid="input-date-from"
                />
                <span className="text-sm text-gray-500">{t("monitoring.to")}</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40"
                  data-testid="input-date-to"
                />
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white border-2 border-gray-200 p-1 h-auto">
              <TabsTrigger
                value="film"
                className="data-[state=active]:bg-blue-500 data-[state=active]:text-white flex items-center gap-2 py-3"
                data-testid="tab-film"
              >
                <Film className="w-5 h-5" />
                <span className="font-semibold">{t("monitoring.tabs.film")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="printing"
                className="data-[state=active]:bg-green-500 data-[state=active]:text-white flex items-center gap-2 py-3"
                data-testid="tab-printing"
              >
                <Printer className="w-5 h-5" />
                <span className="font-semibold">{t("monitoring.tabs.printing")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="cutting"
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-white flex items-center gap-2 py-3"
                data-testid="tab-cutting"
              >
                <Scissors className="w-5 h-5" />
                <span className="font-semibold">{t("monitoring.tabs.cutting")}</span>
              </TabsTrigger>
            </TabsList>

            {/* Film Section */}
            <TabsContent value="film" className="space-y-6 mt-6">
              <SectionContent
                section="film"
                stats={currentStats}
                users={currentUsers}
                machines={currentMachines}
                rolls={rolls}
                orders={orders}
                searchRoll={searchRoll}
                setSearchRoll={setSearchRoll}
                searchOrder={searchOrder}
                setSearchOrder={setSearchOrder}
                usersChartData={usersChartData}
                machinesChartData={machinesChartData}
                color={COLORS.film}
                formatNumber={formatNumber}
                formatWeight={formatWeight}
              />
            </TabsContent>

            {/* Printing Section */}
            <TabsContent value="printing" className="space-y-6 mt-6">
              <SectionContent
                section="printing"
                stats={currentStats}
                users={currentUsers}
                machines={currentMachines}
                rolls={rolls}
                orders={orders}
                searchRoll={searchRoll}
                setSearchRoll={setSearchRoll}
                searchOrder={searchOrder}
                setSearchOrder={setSearchOrder}
                usersChartData={usersChartData}
                machinesChartData={machinesChartData}
                color={COLORS.printing}
                formatNumber={formatNumber}
                formatWeight={formatWeight}
              />
            </TabsContent>

            {/* Cutting Section */}
            <TabsContent value="cutting" className="space-y-6 mt-6">
              <SectionContent
                section="cutting"
                stats={currentStats}
                users={currentUsers}
                machines={currentMachines}
                rolls={rolls}
                orders={orders}
                searchRoll={searchRoll}
                setSearchRoll={setSearchRoll}
                searchOrder={searchOrder}
                setSearchOrder={setSearchOrder}
                usersChartData={usersChartData}
                machinesChartData={machinesChartData}
                color={COLORS.cutting}
                formatNumber={formatNumber}
                formatWeight={formatWeight}
              />
            </TabsContent>
          </Tabs>
      </div>
    </PageLayout>
  );
}

// Section Content Component
interface SectionContentProps {
  section: string;
  stats: ProductionStats;
  users: UserPerformance[];
  machines: MachineProduction[];
  rolls: Roll[];
  orders: ProductionOrder[];
  searchRoll: string;
  setSearchRoll: (value: string) => void;
  searchOrder: string;
  setSearchOrder: (value: string) => void;
  usersChartData: any[];
  machinesChartData: any[];
  color: string;
  formatNumber: (num: number) => string;
  formatWeight: (kg: number) => string;
}

function SectionContent({
  section,
  stats,
  users,
  machines,
  rolls,
  orders,
  searchRoll,
  setSearchRoll,
  searchOrder,
  setSearchOrder,
  usersChartData,
  machinesChartData,
  color,
  formatNumber,
  formatWeight,
}: SectionContentProps) {
  const { t } = useTranslation();
  // Filter rolls and orders by search
  const filteredRolls = rolls.filter(roll =>
    (roll.roll_number || '').toLowerCase().includes(searchRoll.toLowerCase()) ||
    (roll.production_order_number || '').toLowerCase().includes(searchRoll.toLowerCase()) ||
    (roll.customer_name || '').toLowerCase().includes(searchRoll.toLowerCase())
  );

  const filteredOrders = orders.filter(order =>
    (order.production_order_number || '').toLowerCase().includes(searchOrder.toLowerCase()) ||
    (order.order_number || '').toLowerCase().includes(searchOrder.toLowerCase()) ||
    (order.customer_name || '').toLowerCase().includes(searchOrder.toLowerCase())
  );

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-2" style={{ borderColor: color }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{t("monitoring.stats.totalProduction")}</p>
                <p className="text-2xl font-bold" style={{ color }}>
                  {formatWeight(stats.total_weight)}
                </p>
              </div>
              <Target className="w-10 h-10 opacity-20" style={{ color }} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{t("monitoring.stats.rollsCount")}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stats.total_rolls)}
                </p>
              </div>
              <Package className="w-10 h-10 text-gray-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{t("monitoring.stats.completedOrders")}</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(stats.completed_orders)}
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{t("monitoring.stats.activeOrders")}</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatNumber(stats.active_orders)}
                </p>
              </div>
              <Activity className="w-10 h-10 text-orange-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600 mb-1">{t("monitoring.stats.efficiency")}</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {formatNumber(stats.efficiency)}%
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-indigo-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {t("monitoring.charts.usersPerformance")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usersChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={usersChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="production" fill={color} name={t("monitoring.stats.totalProduction")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {t("monitoring.charts.noUsersData")}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              {t("monitoring.charts.machinesProduction")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {machinesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={machinesChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="production" fill={color} name={t("monitoring.stats.totalProduction")} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-500">
                {t("monitoring.charts.noMachinesData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Users Performance Table - Desktop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            أداء المستخدمين - قسم الإنتاج
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">الإنتاج (كجم)</TableHead>
                  <TableHead className="text-right">عدد الرولات</TableHead>
                  <TableHead className="text-right">الكفاءة</TableHead>
                  <TableHead className="text-right">آخر نشاط</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.user_id}>
                      <TableCell className="font-medium">{user.display_name_ar || user.username}</TableCell>
                      <TableCell>{formatWeight(user.total_production_kg)}</TableCell>
                      <TableCell>{formatNumber(user.rolls_count)}</TableCell>
                      <TableCell><Progress value={user.efficiency_score} className="w-20" /><span className="text-sm ml-2">{formatNumber(user.efficiency_score)}%</span></TableCell>
                      <TableCell className="text-sm text-gray-500">{user.last_activity ? new Date(user.last_activity).toLocaleString('ar-EG') : '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8">لا توجد بيانات</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-2">
            {users.map((user) => (
              <div key={user.user_id} className="bg-gray-50 p-3 rounded border text-sm"><div className="font-medium">{user.display_name_ar || user.username}</div><div className="grid grid-cols-2 gap-2 mt-2"><span>الإنتاج: <strong>{formatWeight(user.total_production_kg)}</strong></span><span>رولات: <strong>{formatNumber(user.rolls_count)}</strong></span></div><div className="mt-2">الكفاءة: <Progress value={user.efficiency_score} /><span className="text-xs">{formatNumber(user.efficiency_score)}%</span></div></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Machines Production Table - Desktop */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            كمية إنتاج المكائن
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الماكينة</TableHead>
                  <TableHead className="text-right">الإنتاج الكلي (كجم)</TableHead>
                  <TableHead className="text-right">عدد الرولات</TableHead>
                  <TableHead className="text-right">نسبة التشغيل</TableHead>
                  <TableHead className="text-right">آخر إنتاج</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {machines.length > 0 ? (
                  machines.map((machine) => (
                    <TableRow key={machine.machine_id}>
                      <TableCell className="font-medium">{machine.machine_name}</TableCell>
                      <TableCell>{formatWeight(machine.total_production_kg)}</TableCell>
                      <TableCell>{formatNumber(machine.rolls_produced)}</TableCell>
                      <TableCell><Progress value={machine.utilization_percent} className="w-20" /><span className="text-sm ml-2">{formatNumber(machine.utilization_percent)}%</span></TableCell>
                      <TableCell className="text-sm text-gray-500">{machine.last_production ? new Date(machine.last_production).toLocaleString('ar-EG') : '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-8">لا توجد بيانات</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-2">
            {machines.map((machine) => (
              <div key={machine.machine_id} className="bg-gray-50 p-3 rounded border text-sm"><div className="font-medium">{machine.machine_name}</div><div className="grid grid-cols-2 gap-2 mt-2"><span>الإنتاج: <strong>{formatWeight(machine.total_production_kg)}</strong></span><span>رولات: <strong>{formatNumber(machine.rolls_produced)}</strong></span></div><div className="mt-2">التشغيل: <Progress value={machine.utilization_percent} /><span className="text-xs">{formatNumber(machine.utilization_percent)}%</span></div></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rolls Tracking - Mobile Responsive */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            تتبع الرولات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input placeholder="ابحث برقم الرولة..." value={searchRoll} onChange={(e) => setSearchRoll(e.target.value)} className="flex-1" data-testid="input-search-roll" />
          </div>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الرولة</TableHead>
                  <TableHead className="text-right">أمر الإنتاج</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الوزن</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRolls.slice(0, 20).map((roll) => (
                  <TableRow key={roll.roll_id}>
                    <TableCell className="font-mono">{roll.roll_number}</TableCell>
                    <TableCell>{roll.production_order_number}</TableCell>
                    <TableCell>{roll.customer_name}</TableCell>
                    <TableCell>{formatWeight(roll.weight_kg)}</TableCell>
                    <TableCell><Badge className={roll.stage === 'done' ? 'bg-green-500' : ''}>{roll.stage === 'done' ? 'مكتمل' : roll.stage === 'film' ? 'فيلم' : roll.stage === 'printing' ? 'طباعة' : 'تقطيع'}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-2">
            {filteredRolls.slice(0, 10).map((roll) => (
              <div key={roll.roll_id} className="bg-gray-50 p-3 rounded border"><div className="flex justify-between items-start"><div><strong>{roll.roll_number}</strong><div className="text-xs text-gray-600">{roll.production_order_number}</div></div><Badge className={roll.stage === 'done' ? 'bg-green-500 text-xs' : 'text-xs'}>{roll.stage === 'done' ? 'مكتمل' : roll.stage === 'film' ? 'فيلم' : 'طباعة'}</Badge></div><div className="mt-2 text-xs"><div>{roll.customer_name}</div><div>{formatWeight(roll.weight_kg)}</div></div></div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Production Orders Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            تتبع أوامر الإنتاج
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="ابحث برقم أمر الإنتاج أو الطلب أو العميل..."
              value={searchOrder}
              onChange={(e) => setSearchOrder(e.target.value)}
              className="flex-1"
              data-testid="input-search-order"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">أمر الإنتاج</TableHead>
                  <TableHead className="text-right">رقم الطلب</TableHead>
                  <TableHead className="text-right">العميل</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">التقدم</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.slice(0, 20).map((order) => (
                    <TableRow key={order.production_order_id}>
                      <TableCell className="font-mono font-medium">
                        {order.production_order_number}
                      </TableCell>
                      <TableCell>{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>
                        <Badge
                          variant={order.status === 'completed' ? 'default' : 'secondary'}
                          className={order.status === 'completed' ? 'bg-green-500' : order.status === 'in_production' ? 'bg-blue-500' : ''}
                        >
                          {order.status === 'completed' ? 'مكتمل' : order.status === 'in_production' ? 'قيد الإنتاج' : 'معلق'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={order.progress_percent} className="w-24" />
                          <span className="text-sm">{formatNumber(order.progress_percent)}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {new Date(order.created_at).toLocaleDateString('ar-EG')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      {searchOrder ? 'لا توجد نتائج للبحث' : 'لا توجد أوامر إنتاج'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredOrders.length > 20 && (
            <p className="text-sm text-gray-500 text-center">
              عرض 20 من {formatNumber(filteredOrders.length)} أمر
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
