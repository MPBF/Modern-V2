import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Checkbox } from "../ui/checkbox";
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
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { 
  Calendar as CalendarIcon, 
  Save, 
  UserCheck, 
  UserX, 
  Clock, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Users,
  RefreshCw,
  Search
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { format, addDays, subDays } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "../../lib/utils";

interface AttendanceEntry {
  user_id: number;
  username: string;
  display_name?: string;
  display_name_ar?: string;
  role_name?: string;
  role_name_ar?: string;
  attendance_id: number | null;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  lunch_start_time: string | null;
  lunch_end_time: string | null;
  notes: string;
  date: string;
}

interface ModifiedEntry {
  user_id: number;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  notes?: string;
  selected: boolean;
}

export default function AttendanceManagement() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [modifiedEntries, setModifiedEntries] = useState<Map<number, ModifiedEntry>>(new Map());
  const [selectAll, setSelectAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const dateString = format(selectedDate, "yyyy-MM-dd");

  const {
    data: attendanceData,
    isLoading,
    refetch,
  } = useQuery<{ data: AttendanceEntry[]; date: string }>({
    queryKey: ["/api/attendance/manual", dateString],
    queryFn: async () => {
      const response = await fetch(`/api/attendance/manual?date=${dateString}`);
      if (!response.ok) throw new Error("فشل في جلب بيانات الحضور");
      return response.json();
    },
  });

  useEffect(() => {
    setModifiedEntries(new Map());
    setSelectAll(false);
  }, [dateString]);

  const saveMutation = useMutation({
    mutationFn: async (entries: ModifiedEntry[]) => {
      const response = await fetch("/api/attendance/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "فشل في حفظ البيانات");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/manual", dateString] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      setModifiedEntries(new Map());
      setSelectAll(false);
      toast({
        title: "تم الحفظ بنجاح",
        description: data.message || `تم حفظ بيانات الحضور`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ في الحفظ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked && attendanceData?.data) {
      const newMap = new Map<number, ModifiedEntry>();
      filteredData.forEach((entry) => {
        const existing = modifiedEntries.get(entry.user_id);
        newMap.set(entry.user_id, {
          user_id: entry.user_id,
          date: dateString,
          check_in_time: existing?.check_in_time ?? entry.check_in_time,
          check_out_time: existing?.check_out_time ?? entry.check_out_time,
          status: existing?.status ?? entry.status,
          notes: existing?.notes ?? entry.notes,
          selected: true,
        });
      });
      setModifiedEntries(newMap);
    } else {
      const newMap = new Map(modifiedEntries);
      newMap.forEach((value, key) => {
        newMap.set(key, { ...value, selected: false });
      });
      setModifiedEntries(newMap);
    }
  };

  const handleSelectRow = (userId: number, checked: boolean) => {
    const entry = attendanceData?.data.find((e) => e.user_id === userId);
    if (!entry) return;

    const newMap = new Map(modifiedEntries);
    const existing = modifiedEntries.get(userId);
    
    newMap.set(userId, {
      user_id: userId,
      date: dateString,
      check_in_time: existing?.check_in_time ?? entry.check_in_time,
      check_out_time: existing?.check_out_time ?? entry.check_out_time,
      status: existing?.status ?? entry.status,
      notes: existing?.notes ?? entry.notes,
      selected: checked,
    });
    
    setModifiedEntries(newMap);
  };

  const handleTimeChange = (userId: number, field: "check_in_time" | "check_out_time", value: string) => {
    const entry = attendanceData?.data.find((e) => e.user_id === userId);
    if (!entry) return;

    const newMap = new Map(modifiedEntries);
    const existing = modifiedEntries.get(userId);
    
    const dateTimeValue = value ? `${dateString}T${value}:00` : null;
    
    newMap.set(userId, {
      user_id: userId,
      date: dateString,
      check_in_time: field === "check_in_time" ? dateTimeValue : (existing?.check_in_time ?? entry.check_in_time),
      check_out_time: field === "check_out_time" ? dateTimeValue : (existing?.check_out_time ?? entry.check_out_time),
      status: existing?.status ?? (value && field === "check_in_time" ? "حاضر" : entry.status),
      notes: existing?.notes ?? entry.notes,
      selected: existing?.selected ?? false,
    });
    
    setModifiedEntries(newMap);
  };

  const handleStatusChange = (userId: number, status: string) => {
    const entry = attendanceData?.data.find((e) => e.user_id === userId);
    if (!entry) return;

    const newMap = new Map(modifiedEntries);
    const existing = modifiedEntries.get(userId);
    
    newMap.set(userId, {
      user_id: userId,
      date: dateString,
      check_in_time: existing?.check_in_time ?? entry.check_in_time,
      check_out_time: existing?.check_out_time ?? entry.check_out_time,
      status: status,
      notes: existing?.notes ?? entry.notes,
      selected: existing?.selected ?? false,
    });
    
    setModifiedEntries(newMap);
  };

  const handleMarkSelectedPresent = () => {
    const now = format(new Date(), "HH:mm");
    const newMap = new Map(modifiedEntries);
    
    modifiedEntries.forEach((entry, userId) => {
      if (entry.selected) {
        newMap.set(userId, {
          ...entry,
          status: "حاضر",
          check_in_time: entry.check_in_time || `${dateString}T${now}:00`,
        });
      }
    });
    
    setModifiedEntries(newMap);
  };

  const handleMarkSelectedAbsent = () => {
    const newMap = new Map(modifiedEntries);
    
    modifiedEntries.forEach((entry, userId) => {
      if (entry.selected) {
        newMap.set(userId, {
          ...entry,
          status: "غائب",
          check_in_time: null,
          check_out_time: null,
        });
      }
    });
    
    setModifiedEntries(newMap);
  };

  const handleSave = () => {
    const entriesToSave = Array.from(modifiedEntries.values()).filter((modified) => {
      const original = attendanceData?.data.find((e) => e.user_id === modified.user_id);
      if (!original) return false;
      
      const hasChanged = 
        modified.status !== original.status ||
        modified.check_in_time !== original.check_in_time ||
        modified.check_out_time !== original.check_out_time;
      
      return hasChanged;
    });
    
    if (entriesToSave.length === 0) {
      toast({
        title: "لا توجد تغييرات",
        description: "لم يتم إجراء أي تعديلات للحفظ",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(entriesToSave);
  };

  const formatTimeForInput = (dateTimeString: string | null): string => {
    if (!dateTimeString) return "";
    try {
      const date = new Date(dateTimeString);
      return format(date, "HH:mm");
    } catch {
      return "";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "حاضر":
        return "bg-green-100 text-green-800 border-green-200";
      case "غائب":
        return "bg-red-100 text-red-800 border-red-200";
      case "مغادر":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  const filteredData = (attendanceData?.data || []).filter((entry) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      entry.username?.toLowerCase().includes(search) ||
      entry.display_name?.toLowerCase().includes(search) ||
      entry.display_name_ar?.includes(search) ||
      entry.role_name_ar?.includes(search)
    );
  });

  const selectedCount = Array.from(modifiedEntries.values()).filter((e) => e.selected).length;
  const modifiedCount = Array.from(modifiedEntries.values()).filter((modified) => {
    const original = attendanceData?.data.find((e) => e.user_id === modified.user_id);
    if (!original) return false;
    return modified.status !== original.status ||
      modified.check_in_time !== original.check_in_time ||
      modified.check_out_time !== original.check_out_time;
  }).length;
  
  const stats = {
    present: filteredData.filter((e) => {
      const mod = modifiedEntries.get(e.user_id);
      return (mod?.status || e.status) === "حاضر";
    }).length,
    absent: filteredData.filter((e) => {
      const mod = modifiedEntries.get(e.user_id);
      return (mod?.status || e.status) === "غائب";
    }).length,
    left: filteredData.filter((e) => {
      const mod = modifiedEntries.get(e.user_id);
      return (mod?.status || e.status) === "مغادر";
    }).length,
    total: filteredData.length,
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              تسجيل الحضور اليدوي
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(subDays(selectedDate, 1))}
                data-testid="button-prev-day"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="min-w-[200px]" data-testid="button-date-picker">
                    <CalendarIcon className="h-4 w-4 ml-2" />
                    {format(selectedDate, "EEEE، dd MMMM yyyy", { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                data-testid="button-next-day"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <UserCheck className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-700">{stats.present}</div>
              <div className="text-xs text-green-600">حاضر</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <UserX className="h-5 w-5 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
              <div className="text-xs text-red-600">غائب</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
              <LogOut className="h-5 w-5 text-gray-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-gray-700">{stats.left}</div>
              <div className="text-xs text-gray-600">مغادر</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-xs text-blue-600">إجمالي</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="بحث بالاسم أو الوظيفة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
                data-testid="input-search"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCount > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkSelectedPresent}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    data-testid="button-mark-present"
                  >
                    <UserCheck className="h-4 w-4 ml-1" />
                    تحضير ({selectedCount})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMarkSelectedAbsent}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    data-testid="button-mark-absent"
                  >
                    <UserX className="h-4 w-4 ml-1" />
                    تغييب ({selectedCount})
                  </Button>
                </>
              )}
              
              <Button
                onClick={handleSave}
                disabled={modifiedCount === 0 || saveMutation.isPending}
                className="bg-primary"
                data-testid="button-save"
              >
                <Save className="h-4 w-4 ml-1" />
                {saveMutation.isPending ? "جاري الحفظ..." : `حفظ التغييرات (${modifiedCount})`}
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        data-testid="checkbox-select-all"
                      />
                    </TableHead>
                    <TableHead className="text-right min-w-[150px]">الموظف</TableHead>
                    <TableHead className="text-right min-w-[100px]">الوظيفة</TableHead>
                    <TableHead className="text-center min-w-[100px]">الحالة</TableHead>
                    <TableHead className="text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        وقت الدخول
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[120px]">
                      <div className="flex items-center justify-center gap-1">
                        <LogOut className="h-3 w-3" />
                        وقت الانصراف
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        جاري تحميل البيانات...
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        لا توجد بيانات
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((entry) => {
                      const modified = modifiedEntries.get(entry.user_id);
                      const currentStatus = modified?.status ?? entry.status;
                      const currentCheckIn = modified?.check_in_time ?? entry.check_in_time;
                      const currentCheckOut = modified?.check_out_time ?? entry.check_out_time;
                      const isSelected = modified?.selected ?? false;
                      const isModified = modified !== undefined;
                      
                      return (
                        <TableRow 
                          key={entry.user_id}
                          className={cn(
                            isModified && "bg-yellow-50",
                            isSelected && "bg-blue-50"
                          )}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleSelectRow(entry.user_id, !!checked)}
                              data-testid={`checkbox-user-${entry.user_id}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {entry.display_name_ar || entry.display_name || entry.username}
                          </TableCell>
                          <TableCell className="text-gray-600 text-sm">
                            {entry.role_name_ar || entry.role_name || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Select
                              value={currentStatus}
                              onValueChange={(value) => handleStatusChange(entry.user_id, value)}
                            >
                              <SelectTrigger 
                                className={cn(
                                  "w-24 h-8 text-xs",
                                  getStatusBadgeClass(currentStatus)
                                )}
                                data-testid={`select-status-${entry.user_id}`}
                              >
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="حاضر">حاضر</SelectItem>
                                <SelectItem value="غائب">غائب</SelectItem>
                                <SelectItem value="مغادر">مغادر</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="time"
                              value={formatTimeForInput(currentCheckIn)}
                              onChange={(e) => handleTimeChange(entry.user_id, "check_in_time", e.target.value)}
                              className="w-28 h-8 text-center mx-auto"
                              data-testid={`input-checkin-${entry.user_id}`}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="time"
                              value={formatTimeForInput(currentCheckOut)}
                              onChange={(e) => handleTimeChange(entry.user_id, "check_out_time", e.target.value)}
                              className="w-28 h-8 text-center mx-auto"
                              data-testid={`input-checkout-${entry.user_id}`}
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
        </CardContent>
      </Card>
    </div>
  );
}
