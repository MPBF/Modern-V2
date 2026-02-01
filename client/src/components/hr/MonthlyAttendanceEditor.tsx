import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";

const escapeHtml = (text: string | null | undefined): string => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { 
  Calendar as CalendarIcon, 
  Save,
  Printer,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  FileEdit,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { ar } from "date-fns/locale";

interface AttendanceRecord {
  date: string;
  dayName: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  work_hours: number | null;
  overtime_hours: number | null;
  notes: string | null;
  attendance_id: number | null;
}

interface ModifiedRecord {
  date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  notes: string;
}

interface EmployeeMonthlyData {
  employee: {
    id: number;
    name: string;
    employeeNumber: string;
    department: string;
    position: string;
  };
  records: AttendanceRecord[];
  summary: {
    presentDays: number;
    absentDays: number;
    leaveDays: number;
    lateDays: number;
    totalWorkHours: number;
    totalOvertimeHours: number;
  };
}

const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const statusOptions = [
  { value: "حاضر", label: "حاضر", color: "bg-green-100 text-green-800" },
  { value: "غائب", label: "غائب", color: "bg-red-100 text-red-800" },
  { value: "إجازة", label: "إجازة", color: "bg-blue-100 text-blue-800" },
  { value: "مغادر", label: "مغادر مبكراً", color: "bg-yellow-100 text-yellow-800" },
  { value: "متأخر", label: "متأخر", color: "bg-orange-100 text-orange-800" },
  { value: "عطلة", label: "عطلة رسمية", color: "bg-purple-100 text-purple-800" },
];

export default function MonthlyAttendanceEditor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [modifiedRecords, setModifiedRecords] = useState<Map<string, ModifiedRecord>>(new Map());
  const [hasChanges, setHasChanges] = useState(false);

  const { data: usersData, isLoading: usersLoading } = useQuery<any[] | { data: any[] }>({
    queryKey: ["/api/users"],
  });

  const monthStart = format(selectedMonth, "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(selectedMonth), "yyyy-MM-dd");

  const { data: attendanceData, isLoading: attendanceLoading, refetch } = useQuery<{ success: boolean; data: EmployeeMonthlyData }>({
    queryKey: ["/api/attendance/monthly-editor", selectedEmployeeId, monthStart],
    queryFn: async () => {
      const response = await fetch(
        `/api/attendance/monthly-editor/${selectedEmployeeId}?startDate=${monthStart}&endDate=${monthEnd}`
      );
      if (!response.ok) throw new Error("خطأ في جلب البيانات");
      return response.json();
    },
    enabled: !!selectedEmployeeId,
  });

  const saveMutation = useMutation({
    mutationFn: async (records: ModifiedRecord[]) => {
      const response = await apiRequest("/api/attendance/monthly-editor/save", {
        method: "POST",
        body: JSON.stringify({ 
          userId: parseInt(selectedEmployeeId),
          records 
        }),
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/monthly-editor"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setModifiedRecords(new Map());
      setHasChanges(false);
      toast({
        title: "تم الحفظ بنجاح",
        description: data.message || `تم حفظ ${data.savedCount || 0} سجل`,
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الحفظ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handlePrevMonth = () => {
    setSelectedMonth(subMonths(selectedMonth, 1));
    setModifiedRecords(new Map());
    setHasChanges(false);
  };

  const handleNextMonth = () => {
    setSelectedMonth(addMonths(selectedMonth, 1));
    setModifiedRecords(new Map());
    setHasChanges(false);
  };

  const handleEmployeeChange = (value: string) => {
    setSelectedEmployeeId(value);
    setModifiedRecords(new Map());
    setHasChanges(false);
  };

  const getRecordValue = (date: string, field: keyof ModifiedRecord, originalValue: any) => {
    const modified = modifiedRecords.get(date);
    if (modified && field in modified) {
      return modified[field];
    }
    return originalValue;
  };

  const handleFieldChange = (date: string, field: keyof ModifiedRecord, value: any, originalRecord: AttendanceRecord) => {
    const newModified = new Map(modifiedRecords);
    const existing = newModified.get(date) || {
      date,
      status: originalRecord.status || "غائب",
      check_in_time: originalRecord.check_in_time,
      check_out_time: originalRecord.check_out_time,
      notes: originalRecord.notes || "",
    };
    
    (existing as any)[field] = value;
    newModified.set(date, existing);
    setModifiedRecords(newModified);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (modifiedRecords.size === 0) {
      toast({ title: "لا توجد تغييرات للحفظ", variant: "destructive" });
      return;
    }
    saveMutation.mutate(Array.from(modifiedRecords.values()));
  };

  const handlePrint = () => {
    if (!printRef.current || !attendanceData?.data) return;
    
    const employee = attendanceData.data.employee;
    const records = attendanceData.data.records;
    const summary = attendanceData.data.summary;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: "خطأ في فتح نافذة الطباعة", variant: "destructive" });
      return;
    }

    const recordRows = records.map(record => {
      const modifiedRecord = modifiedRecords.get(record.date);
      const status = escapeHtml(modifiedRecord?.status || record.status) || "-";
      const checkIn = escapeHtml(modifiedRecord?.check_in_time || record.check_in_time) || "-";
      const checkOut = escapeHtml(modifiedRecord?.check_out_time || record.check_out_time) || "-";
      const notes = escapeHtml(modifiedRecord?.notes || record.notes) || "";
      const statusClass = status === 'حاضر' ? 'present' : status === 'غائب' ? 'absent' : 'other';
      
      return `
        <tr>
          <td>${format(new Date(record.date), "dd/MM/yyyy")}</td>
          <td>${escapeHtml(record.dayName)}</td>
          <td class="status-${statusClass}">${status}</td>
          <td>${checkIn}</td>
          <td>${checkOut}</td>
          <td>${record.work_hours ? record.work_hours.toFixed(1) : "-"}</td>
          <td>${notes}</td>
        </tr>
      `;
    }).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تقرير الحضور الشهري - ${escapeHtml(employee.name)}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
            padding: 20px; 
            direction: rtl;
            font-size: 12px;
            line-height: 1.5;
          }
          .header { 
            text-align: center; 
            border-bottom: 3px solid #2563eb; 
            padding-bottom: 15px; 
            margin-bottom: 20px;
          }
          .header h1 { color: #1e40af; font-size: 24px; margin-bottom: 5px; }
          .header p { color: #6b7280; }
          .employee-info {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 20px;
            padding: 15px;
            background: #f8fafc;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          .employee-info div { text-align: center; }
          .employee-info strong { display: block; color: #374151; font-size: 11px; }
          .employee-info span { font-size: 14px; font-weight: 600; color: #1f2937; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 10px;
            font-size: 11px;
          }
          th, td { 
            border: 1px solid #d1d5db; 
            padding: 8px 6px; 
            text-align: center; 
          }
          th { 
            background: #2563eb; 
            color: white; 
            font-weight: 600;
          }
          tr:nth-child(even) { background: #f9fafb; }
          tr:hover { background: #f3f4f6; }
          .status-present { color: #16a34a; font-weight: 600; }
          .status-absent { color: #dc2626; font-weight: 600; }
          .status-other { color: #ca8a04; font-weight: 600; }
          .summary {
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 10px;
            margin-top: 20px;
            padding: 15px;
            background: #f0f9ff;
            border-radius: 8px;
            border: 1px solid #bae6fd;
          }
          .summary-item { 
            text-align: center; 
            padding: 10px;
            background: white;
            border-radius: 6px;
          }
          .summary-item strong { display: block; font-size: 18px; color: #1e40af; }
          .summary-item span { font-size: 10px; color: #6b7280; }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #9ca3af;
          }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>تقرير الحضور الشهري</h1>
          <p>${format(selectedMonth, "MMMM yyyy", { locale: ar })}</p>
        </div>

        <div class="employee-info">
          <div>
            <strong>اسم الموظف</strong>
            <span>${escapeHtml(employee.name)}</span>
          </div>
          <div>
            <strong>الرقم الوظيفي</strong>
            <span>${escapeHtml(employee.employeeNumber) || "-"}</span>
          </div>
          <div>
            <strong>القسم</strong>
            <span>${escapeHtml(employee.department) || "-"}</span>
          </div>
          <div>
            <strong>المسمى الوظيفي</strong>
            <span>${escapeHtml(employee.position) || "-"}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>التاريخ</th>
              <th>اليوم</th>
              <th>الحالة</th>
              <th>وقت الحضور</th>
              <th>وقت الانصراف</th>
              <th>ساعات العمل</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${recordRows}
          </tbody>
        </table>

        <div class="summary">
          <div class="summary-item">
            <strong>${summary.presentDays}</strong>
            <span>أيام الحضور</span>
          </div>
          <div class="summary-item">
            <strong>${summary.absentDays}</strong>
            <span>أيام الغياب</span>
          </div>
          <div class="summary-item">
            <strong>${summary.leaveDays}</strong>
            <span>أيام الإجازة</span>
          </div>
          <div class="summary-item">
            <strong>${summary.lateDays}</strong>
            <span>أيام التأخير</span>
          </div>
          <div class="summary-item">
            <strong>${summary.totalWorkHours.toFixed(1)}</strong>
            <span>ساعات العمل</span>
          </div>
          <div class="summary-item">
            <strong>${summary.totalOvertimeHours.toFixed(1)}</strong>
            <span>ساعات الإضافي</span>
          </div>
        </div>

        <div class="footer">
          <span>تم إنشاء التقرير بتاريخ: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ar })}</span>
          <span>نظام الموارد البشرية المتقدم</span>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = statusOptions.find(s => s.value === status);
    return (
      <Badge className={statusConfig?.color || "bg-gray-100 text-gray-800"}>
        {status || "-"}
      </Badge>
    );
  };

  const employees = Array.isArray(usersData) ? usersData : (usersData?.data || []);
  const records = attendanceData?.data?.records || [];
  const employee = attendanceData?.data?.employee;
  const summary = attendanceData?.data?.summary;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileEdit className="h-5 w-5" />
                تحرير الحضور الشهري للموظف
              </CardTitle>
              <CardDescription>
                عرض وتعديل سجل حضور موظف معين لشهر كامل مع إمكانية الطباعة
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-1">اختر الموظف</label>
              <Select value={selectedEmployeeId} onValueChange={handleEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف..." />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((user: any) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.display_name_ar || user.display_name || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg min-w-[180px] justify-center">
                <CalendarIcon className="h-4 w-4" />
                <span className="font-medium">
                  {format(selectedMonth, "MMMM yyyy", { locale: ar })}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                disabled={!hasChanges || saveMutation.isPending}
                className="gap-2"
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                حفظ التغييرات
              </Button>
              <Button 
                variant="outline" 
                onClick={handlePrint}
                disabled={!selectedEmployeeId || !attendanceData?.data}
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                طباعة التقرير
              </Button>
            </div>
          </div>

          {!selectedEmployeeId ? (
            <div className="text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>اختر موظف لعرض سجل الحضور الشهري</p>
            </div>
          ) : attendanceLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="mt-2 text-gray-500">جاري تحميل البيانات...</p>
            </div>
          ) : (
            <>
              {employee && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <span className="text-sm text-gray-500">الموظف:</span>
                    <p className="font-medium">{employee.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">الرقم الوظيفي:</span>
                    <p className="font-medium">{employee.employeeNumber || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">القسم:</span>
                    <p className="font-medium">{employee.department || "-"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">المسمى:</span>
                    <p className="font-medium">{employee.position || "-"}</p>
                  </div>
                </div>
              )}

              {summary && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                  <div className="bg-green-50 dark:bg-green-950 border border-green-200 rounded-lg p-3 text-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-green-700">{summary.presentDays}</div>
                    <div className="text-xs text-green-600">حضور</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg p-3 text-center">
                    <XCircle className="h-4 w-4 text-red-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-red-700">{summary.absentDays}</div>
                    <div className="text-xs text-red-600">غياب</div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg p-3 text-center">
                    <CalendarIcon className="h-4 w-4 text-blue-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-blue-700">{summary.leaveDays}</div>
                    <div className="text-xs text-blue-600">إجازة</div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 rounded-lg p-3 text-center">
                    <AlertTriangle className="h-4 w-4 text-orange-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-orange-700">{summary.lateDays}</div>
                    <div className="text-xs text-orange-600">تأخير</div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 rounded-lg p-3 text-center">
                    <Clock className="h-4 w-4 text-purple-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-purple-700">{summary.totalWorkHours.toFixed(1)}</div>
                    <div className="text-xs text-purple-600">ساعات العمل</div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950 border border-indigo-200 rounded-lg p-3 text-center">
                    <Clock className="h-4 w-4 text-indigo-600 mx-auto mb-1" />
                    <div className="text-xl font-bold text-indigo-700">{summary.totalOvertimeHours.toFixed(1)}</div>
                    <div className="text-xs text-indigo-600">إضافي</div>
                  </div>
                </div>
              )}

              <div ref={printRef} className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader className="sticky top-0 z-10">
                      <TableRow className="bg-gray-50 dark:bg-gray-800">
                        <TableHead className="text-right py-1 px-2 w-[70px]">التاريخ</TableHead>
                        <TableHead className="text-right py-1 px-2 w-[60px]">اليوم</TableHead>
                        <TableHead className="text-center py-1 px-2 w-[100px]">الحالة</TableHead>
                        <TableHead className="text-center py-1 px-2 w-[80px]">حضور</TableHead>
                        <TableHead className="text-center py-1 px-2 w-[80px]">انصراف</TableHead>
                        <TableHead className="text-center py-1 px-2 w-[50px]">ساعات</TableHead>
                        <TableHead className="text-right py-1 px-2">ملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {records.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            لا توجد بيانات للشهر المحدد
                          </TableCell>
                        </TableRow>
                      ) : (
                        records.map((record) => {
                          const isModified = modifiedRecords.has(record.date);
                          const isFriday = record.dayName === "الجمعة";
                          
                          return (
                            <TableRow 
                              key={record.date} 
                              className={`
                                ${isModified ? 'bg-yellow-50 dark:bg-yellow-950' : ''} 
                                ${isFriday ? 'bg-gray-100 dark:bg-gray-800' : ''}
                                hover:bg-gray-50 dark:hover:bg-gray-800
                              `}
                            >
                              <TableCell className="font-medium py-1 px-2">
                                {format(new Date(record.date), "dd/MM")}
                              </TableCell>
                              <TableCell className={`py-1 px-2 ${isFriday ? "font-bold text-red-600" : ""}`}>
                                {record.dayName}
                              </TableCell>
                              <TableCell className="text-center py-1 px-2">
                                <Select
                                  value={getRecordValue(record.date, 'status', record.status) || "غائب"}
                                  onValueChange={(value) => handleFieldChange(record.date, 'status', value, record)}
                                >
                                  <SelectTrigger className="h-6 w-[90px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {statusOptions.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center py-1 px-2">
                                <Input
                                  type="time"
                                  value={getRecordValue(record.date, 'check_in_time', record.check_in_time) || ""}
                                  onChange={(e) => handleFieldChange(record.date, 'check_in_time', e.target.value || null, record)}
                                  className="h-6 w-[75px] text-center text-xs px-1"
                                />
                              </TableCell>
                              <TableCell className="text-center py-1 px-2">
                                <Input
                                  type="time"
                                  value={getRecordValue(record.date, 'check_out_time', record.check_out_time) || ""}
                                  onChange={(e) => handleFieldChange(record.date, 'check_out_time', e.target.value || null, record)}
                                  className="h-6 w-[75px] text-center text-xs px-1"
                                />
                              </TableCell>
                              <TableCell className="text-center font-mono py-1 px-2">
                                {record.work_hours ? record.work_hours.toFixed(1) : "-"}
                              </TableCell>
                              <TableCell className="py-1 px-2">
                                <Input
                                  value={getRecordValue(record.date, 'notes', record.notes) || ""}
                                  onChange={(e) => handleFieldChange(record.date, 'notes', e.target.value, record)}
                                  placeholder="ملاحظات..."
                                  className="h-6 text-xs"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {hasChanges && (
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 rounded-lg flex items-center justify-between">
                  <span className="text-yellow-800 dark:text-yellow-200">
                    لديك {modifiedRecords.size} تغييرات غير محفوظة
                  </span>
                  <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <Save className="h-4 w-4 ml-2" />
                    )}
                    حفظ الآن
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
