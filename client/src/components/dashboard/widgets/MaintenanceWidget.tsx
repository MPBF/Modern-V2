import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { ScrollArea } from "../../ui/scroll-area";
import { Wrench, AlertTriangle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { formatNumber } from "../../../lib/formatNumber";

interface MaintenanceRequest {
  id: number;
  title?: string;
  title_ar?: string;
  description?: string;
  machine_id?: number;
  machine_name?: string;
  machine_name_ar?: string;
  priority?: string;
  status?: string;
  created_at?: string;
}

export default function MaintenanceWidget() {
  const { t } = useTranslation();

  const { data: requests = [], isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance-requests"],
  });

  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="w-4 h-4 text-orange-500" />
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const requestList = Array.isArray(requests) ? requests : [];
  const pendingRequests = requestList.filter(
    (r) => r.status === "pending" || r.status === "open" || r.status === "in_progress"
  );
  const urgentRequests = pendingRequests.filter(
    (r) => r.priority === "high" || r.priority === "urgent" || r.priority === "critical"
  );

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "critical":
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "completed":
      case "resolved":
        return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
      case "in_progress":
        return <Clock className="w-3.5 h-3.5 text-blue-600" />;
      case "pending":
      case "open":
        return <AlertCircle className="w-3.5 h-3.5 text-yellow-600" />;
      default:
        return <Wrench className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wrench className="w-4 h-4 text-orange-500" />
            {t("dashboard.widgets.maintenance", "Maintenance Alerts")}
          </CardTitle>
          {urgentRequests.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="w-3 h-3 mr-1" />
              {formatNumber(urgentRequests.length)} {t("dashboard.widgets.urgent", "urgent")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pendingRequests.length > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg text-center">
                <p className="text-lg font-bold text-orange-700 dark:text-orange-300">
                  {formatNumber(pendingRequests.length)}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {t("dashboard.widgets.pendingMaintenance", "Pending")}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
                <p className="text-lg font-bold text-red-700 dark:text-red-300">
                  {formatNumber(urgentRequests.length)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {t("dashboard.widgets.urgentMaintenance", "Urgent")}
                </p>
              </div>
            </div>

            <ScrollArea className="h-40">
              <div className="space-y-2">
                {pendingRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      {getStatusIcon(request.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {request.title_ar || request.title || `#${request.id}`}
                          </p>
                          {request.priority && (
                            <Badge className={`${getPriorityColor(request.priority)} text-xs`}>
                              {request.priority}
                            </Badge>
                          )}
                        </div>
                        {(request.machine_name_ar || request.machine_name) && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {request.machine_name_ar || request.machine_name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              {t("dashboard.widgets.noMaintenanceAlerts", "No pending maintenance alerts")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
