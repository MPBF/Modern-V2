import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Badge } from "../../ui/badge";
import { Skeleton } from "../../ui/skeleton";
import { Progress } from "../../ui/progress";
import { Users, UserCheck, UserX, Clock, Calendar } from "lucide-react";
import { formatNumber } from "../../../lib/formatNumber";

interface AttendanceRecord {
  id: number;
  user_id: number;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  date: string;
}

export default function AttendanceWidget() {
  const { t } = useTranslation();

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance"],
  });

  if (isLoading) {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const recordList = Array.isArray(records) ? records : [];
  const today = new Date().toISOString().split("T")[0];
  const todayRecords = recordList.filter((r) => r.date === today);

  const presentCount = todayRecords.filter(
    (r) => r.status !== "غائب" && r.status !== "إجازة" && r.check_in_time
  ).length;
  const absentCount = todayRecords.filter((r) => r.status === "غائب").length;
  const leaveCount = todayRecords.filter((r) => r.status === "إجازة").length;
  const totalCount = todayRecords.length || 1;
  const attendanceRate = Math.round((presentCount / totalCount) * 100);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-500" />
            {t("dashboard.widgets.attendance", "Today's Attendance")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            <Calendar className="w-3 h-3 mr-1" />
            {new Date().toLocaleDateString("ar", { day: "numeric", month: "short" })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {todayRecords.length > 0 ? (
          <>
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("dashboard.widgets.attendanceRate", "Attendance Rate")}
                </span>
                <span className="font-medium">{attendanceRate}%</span>
              </div>
              <Progress value={attendanceRate} className="h-2" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <UserCheck className="w-3 h-3 text-green-600" />
                </div>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  {formatNumber(presentCount)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {t("dashboard.widgets.present", "Present")}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <UserX className="w-3 h-3 text-red-600" />
                </div>
                <p className="text-lg font-bold text-red-700 dark:text-red-300">
                  {formatNumber(absentCount)}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">
                  {t("dashboard.widgets.absent", "Absent")}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-blue-600" />
                </div>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
                  {formatNumber(leaveCount)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {t("dashboard.widgets.onLeave", "On Leave")}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">
              {t("dashboard.widgets.noAttendanceData", "No attendance data for today")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
