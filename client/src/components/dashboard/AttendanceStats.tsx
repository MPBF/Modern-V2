import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Clock,
  Calendar as CalendarIcon,
  TrendingUp,
  AlertTriangle,
  Coffee,
  CheckCircle,
  XCircle,
  Timer,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, differenceInDays, parseISO, isWithinInterval } from "date-fns";
import { ar } from "date-fns/locale";
import { formatNumber } from "../../lib/formatNumber";

interface AttendanceRecord {
  id: number;
  user_id: number;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  lunch_start_time?: string;
  lunch_end_time?: string;
  date: string;
  work_hours?: number;
  overtime_hours?: number;
  notes?: string;
}

interface AttendanceStatsProps {
  userId: number;
}

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

export default function AttendanceStats({ userId }: AttendanceStatsProps) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodType>("monthly");
  const [customStartDate, setCustomStartDate] = useState<Date>(startOfMonth(new Date()));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());

  const { data: attendanceRecords = [] } = useQuery<AttendanceRecord[]>({
    queryKey: ["/api/attendance"],
    select: (data) => data.filter((record) => record.user_id === userId),
  });

  const getDateRange = useMemo(() => {
    const today = new Date();
    switch (period) {
      case "daily":
        return { start: today, end: today };
      case "weekly":
        return { start: startOfWeek(today, { weekStartsOn: 6 }), end: endOfWeek(today, { weekStartsOn: 6 }) };
      case "monthly":
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case "yearly":
        return { start: startOfYear(today), end: endOfYear(today) };
      case "custom":
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  }, [period, customStartDate, customEndDate]);

  const filteredRecords = useMemo(() => {
    const { start, end } = getDateRange;
    return attendanceRecords.filter((record) => {
      const recordDate = parseISO(record.date);
      return isWithinInterval(recordDate, { start, end });
    });
  }, [attendanceRecords, getDateRange]);

  const stats = useMemo(() => {
    let totalWorkMinutes = 0;
    let totalOvertimeMinutes = 0;
    let totalBreakMinutes = 0;
    let presentDays = 0;
    let absentDays = 0;
    let lateDays = 0;
    let leaveDays = 0;

    const standardWorkMinutes = 8 * 60;
    const standardStartTime = 9 * 60;

    filteredRecords.forEach((record) => {
      if (record.status === "غائب") {
        absentDays++;
        return;
      }

      if (record.status === "إجازة") {
        leaveDays++;
        return;
      }

      if (record.check_in_time) {
        presentDays++;

        const checkInTime = new Date(record.check_in_time);
        const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
        if (checkInMinutes > standardStartTime + 15) {
          lateDays++;
        }

        if (record.check_out_time) {
          const checkOutTime = new Date(record.check_out_time);
          let workMinutes = Math.floor((checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60));

          if (record.lunch_start_time && record.lunch_end_time) {
            const lunchStart = new Date(record.lunch_start_time);
            const lunchEnd = new Date(record.lunch_end_time);
            const breakMinutes = Math.floor((lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60));
            totalBreakMinutes += breakMinutes;
            workMinutes -= breakMinutes;
          }

          const isFriday = new Date(record.date).getDay() === 5;
          if (isFriday) {
            totalOvertimeMinutes += workMinutes;
          } else {
            if (workMinutes > standardWorkMinutes) {
              totalWorkMinutes += standardWorkMinutes;
              totalOvertimeMinutes += workMinutes - standardWorkMinutes;
            } else {
              totalWorkMinutes += workMinutes;
            }
          }
        }
      }
    });

    const totalWorkingDaysRecorded = presentDays + absentDays;
    const attendanceRate = totalWorkingDaysRecorded > 0 
      ? Math.round((presentDays / totalWorkingDaysRecorded) * 100) 
      : 0;

    return {
      totalWorkHours: Math.round((totalWorkMinutes / 60) * 100) / 100,
      totalOvertimeHours: Math.round((totalOvertimeMinutes / 60) * 100) / 100,
      totalBreakMinutes,
      presentDays,
      absentDays,
      lateDays,
      leaveDays,
      attendanceRate,
    };
  }, [filteredRecords, getDateRange]);

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, "0")}`;
  };

  const periodLabels: Record<PeriodType, string> = {
    daily: "اليوم",
    weekly: "هذا الأسبوع",
    monthly: "هذا الشهر",
    yearly: "هذه السنة",
    custom: "فترة مخصصة",
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            إحصائيات الحضور
          </CardTitle>
          <div className="flex flex-wrap gap-1">
            {(["daily", "weekly", "monthly", "yearly", "custom"] as PeriodType[]).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={period === p ? "default" : "outline"}
                onClick={() => setPeriod(p)}
                className="text-xs h-7 px-2"
              >
                {periodLabels[p]}
              </Button>
            ))}
          </div>
        </div>
        {period === "custom" && (
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">من:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="h-3 w-3 ml-1" />
                    {format(customStartDate, "yyyy-MM-dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={(date) => date && setCustomStartDate(date)}
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs whitespace-nowrap">إلى:</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="h-3 w-3 ml-1" />
                    {format(customEndDate, "yyyy-MM-dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={(date) => date && setCustomEndDate(date)}
                    locale={ar}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-700 dark:text-green-300">ساعات العمل</span>
            </div>
            <p className="text-xl font-bold text-green-800 dark:text-green-200">
              {formatHours(stats.totalWorkHours)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              {stats.totalWorkHours.toFixed(1)} ساعة
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-xs text-orange-700 dark:text-orange-300">ساعات إضافية</span>
            </div>
            <p className="text-xl font-bold text-orange-800 dark:text-orange-200">
              {formatHours(stats.totalOvertimeHours)}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              {stats.totalOvertimeHours.toFixed(1)} ساعة
            </p>
          </div>

          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-1">
              <Coffee className="h-4 w-4 text-yellow-600" />
              <span className="text-xs text-yellow-700 dark:text-yellow-300">وقت الاستراحة</span>
            </div>
            <p className="text-xl font-bold text-yellow-800 dark:text-yellow-200">
              {Math.floor(stats.totalBreakMinutes / 60)}:{(stats.totalBreakMinutes % 60).toString().padStart(2, "0")}
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-400">
              {stats.totalBreakMinutes} دقيقة
            </p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-700 dark:text-blue-300">نسبة الحضور</span>
            </div>
            <p className="text-xl font-bold text-blue-800 dark:text-blue-200">
              {stats.attendanceRate}%
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {stats.presentDays} يوم حضور
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-700 dark:text-green-300">أيام الحضور</span>
            </div>
            <p className="text-lg font-bold text-green-800 dark:text-green-200">{stats.presentDays}</p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-xs text-red-700 dark:text-red-300">أيام الغياب</span>
            </div>
            <p className="text-lg font-bold text-red-800 dark:text-red-200">{stats.absentDays}</p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/10 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Timer className="h-3 w-3 text-amber-600" />
              <span className="text-xs text-amber-700 dark:text-amber-300">أيام التأخير</span>
            </div>
            <p className="text-lg font-bold text-amber-800 dark:text-amber-200">{stats.lateDays}</p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/10 p-2 rounded-lg text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CalendarIcon className="h-3 w-3 text-purple-600" />
              <span className="text-xs text-purple-700 dark:text-purple-300">أيام الإجازة</span>
            </div>
            <p className="text-lg font-bold text-purple-800 dark:text-purple-200">{stats.leaveDays}</p>
          </div>
        </div>

        <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400">
          الفترة: {format(getDateRange.start, "yyyy/MM/dd", { locale: ar })} - {format(getDateRange.end, "yyyy/MM/dd", { locale: ar })}
        </div>
      </CardContent>
    </Card>
  );
}
