import { useState, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import PageLayout from "../components/layout/PageLayout";
import DashboardStats from "../components/dashboard/DashboardStats";
import Shortcuts from "../components/dashboard/Shortcuts";
import QuickNotes from "../components/dashboard/QuickNotes";
import DashboardCustomizer from "../components/dashboard/DashboardCustomizer";
import { useAuth } from "../hooks/use-auth";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Settings2 } from "lucide-react";
import { apiRequest, queryClient } from "../lib/queryClient";

const MachineStatus = lazy(() => import("../components/dashboard/MachineStatus"));
const RecentRolls = lazy(() => import("../components/dashboard/RecentRolls"));
const AttendanceStats = lazy(() => import("../components/dashboard/AttendanceStats"));
const InventoryWidget = lazy(() => import("../components/dashboard/widgets/InventoryWidget"));
const QuotesWidget = lazy(() => import("../components/dashboard/widgets/QuotesWidget"));
const AttendanceWidget = lazy(() => import("../components/dashboard/widgets/AttendanceWidget"));
const RecentOrdersWidget = lazy(() => import("../components/dashboard/widgets/RecentOrdersWidget"));
const ProductionProgressWidget = lazy(() => import("../components/dashboard/widgets/ProductionProgressWidget"));
const MaintenanceWidget = lazy(() => import("../components/dashboard/widgets/MaintenanceWidget"));

function WidgetSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}

const WIDGET_COMPONENTS: Record<string, any> = {
  dashboard_stats: DashboardStats,
  shortcuts: Shortcuts,
  quick_notes: QuickNotes,
  machine_status: MachineStatus,
  recent_rolls: RecentRolls,
  attendance_stats: AttendanceStats,
  inventory_widget: InventoryWidget,
  quotes_widget: QuotesWidget,
  attendance_widget: AttendanceWidget,
  recent_orders_widget: RecentOrdersWidget,
  production_progress_widget: ProductionProgressWidget,
  maintenance_widget: MaintenanceWidget,
};

const FULL_WIDTH_WIDGETS = new Set([
  "dashboard_stats",
  "shortcuts",
  "quick_notes",
  "production_progress_widget",
]);

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { user } = useAuth();
  const [customizerOpen, setCustomizerOpen] = useState(false);

  const { data: dashboardConfig, isLoading: configLoading } = useQuery<{ widgets: string[] }>({
    queryKey: ["/api/dashboard/config"],
    staleTime: 60000,
  });

  const saveConfigMutation = useMutation({
    mutationFn: async (widgets: string[]) => {
      await apiRequest("PUT", "/api/dashboard/config", { widgets });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/config"] });
    },
  });

  const activeWidgets = dashboardConfig?.widgets || [
    "dashboard_stats",
    "shortcuts",
    "quick_notes",
  ];

  if (configLoading) {
    return (
      <PageLayout title={t("dashboard.title")} description={t("dashboard.productionOverview")}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <WidgetSkeleton key={i} />
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  const fullWidgets = activeWidgets.filter((w) => FULL_WIDTH_WIDGETS.has(w));
  const gridWidgets = activeWidgets.filter((w) => !FULL_WIDTH_WIDGETS.has(w));

  return (
    <PageLayout
      title={t("dashboard.title")}
      description={t("dashboard.productionOverview")}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCustomizerOpen(true)}
          className="gap-2"
        >
          <Settings2 className="w-4 h-4" />
          {isArabic ? "تخصيص" : "Customize"}
        </Button>
      }
    >
      <div className="space-y-6">
        {fullWidgets.map((widgetId) => {
          const Component = WIDGET_COMPONENTS[widgetId];
          if (!Component) return null;
          return (
            <Suspense key={widgetId} fallback={<WidgetSkeleton />}>
              <Component />
            </Suspense>
          );
        })}

        {gridWidgets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gridWidgets.map((widgetId) => {
              const Component = WIDGET_COMPONENTS[widgetId];
              if (!Component) return null;
              return (
                <Suspense key={widgetId} fallback={<WidgetSkeleton />}>
                  <Component />
                </Suspense>
              );
            })}
          </div>
        )}
      </div>

      <DashboardCustomizer
        open={customizerOpen}
        onOpenChange={setCustomizerOpen}
        currentWidgets={activeWidgets}
        onSave={(widgets) => saveConfigMutation.mutate(widgets)}
        userPermissions={user?.permissions}
        userRoleId={user?.role_id}
      />
    </PageLayout>
  );
}
