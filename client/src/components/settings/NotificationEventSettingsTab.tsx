import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import {
  Bell,
  Settings2,
  MessageSquare,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Send,
  Filter,
  RefreshCw,
  Plus,
  ShoppingCart,
  Factory,
  Shield,
  Wrench,
  Package,
  UserCog,
  Zap,
  ChevronDown,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";

interface NotificationEventSetting {
  id: number;
  event_key: string;
  event_name: string;
  event_name_ar: string;
  event_description: string | null;
  event_description_ar: string | null;
  event_category: string;
  is_enabled: boolean | null;
  whatsapp_enabled: boolean | null;
  message_template: string | null;
  message_template_ar: string | null;
  recipient_type: string | null;
  recipient_user_ids: number[] | null;
  recipient_role_ids: number[] | null;
  notify_customer: boolean | null;
  condition_enabled: boolean | null;
  condition_field: string | null;
  condition_operator: string | null;
  condition_value: string | null;
  priority: string | null;
  delay_minutes: number | null;
  created_at: string;
  updated_at: string;
}

interface NotificationEventLog {
  id: number;
  event_key: string;
  event_setting_id: number;
  trigger_context_type: string | null;
  trigger_context_id: string | null;
  message_sent_ar: string | null;
  recipient_phone: string | null;
  recipient_name: string | null;
  status: string | null;
  error_message: string | null;
  triggered_at: string;
  delivered_at: string | null;
}

const categoryIcons: Record<string, any> = {
  orders: ShoppingCart,
  production: Factory,
  quality: Shield,
  maintenance: Wrench,
  hr: UserCog,
  inventory: Package,
  system: Zap,
};

const categoryColors: Record<string, string> = {
  orders: "bg-blue-100 text-blue-800",
  production: "bg-purple-100 text-purple-800",
  quality: "bg-green-100 text-green-800",
  maintenance: "bg-orange-100 text-orange-800",
  hr: "bg-pink-100 text-pink-800",
  inventory: "bg-yellow-100 text-yellow-800",
  system: "bg-gray-100 text-gray-800",
};

export default function NotificationEventSettingsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NotificationEventSetting | null>(null);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [logsFilterStatus, setLogsFilterStatus] = useState<string>("all");

  const { data: settingsResponse, isLoading: settingsLoading, refetch: refetchSettings } = useQuery<{ data: NotificationEventSetting[]; success: boolean }>({
    queryKey: ["/api/notification-event-settings"],
  });

  const { data: logsResponse, isLoading: logsLoading, refetch: refetchLogs } = useQuery<{ data: NotificationEventLog[]; success: boolean }>({
    queryKey: ["/api/notification-event-logs"],
  });

  const { data: usersResponse } = useQuery<{ success: boolean; users: { id: number; username: string; full_name: string | null }[] }>({
    queryKey: ["/api/users"],
  });

  const { data: rolesResponse } = useQuery<{ success: boolean; roles: { id: number; name: string; name_ar: string }[] }>({
    queryKey: ["/api/roles"],
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<NotificationEventSetting> }) => {
      return apiRequest(`/api/notification-event-settings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notification-event-settings"] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث إعدادات الحدث بنجاح",
      });
      setEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في تحديث الإعدادات",
        variant: "destructive",
      });
    },
  });

  const testNotificationMutation = useMutation({
    mutationFn: async ({ id, phone_number }: { id: number; phone_number: string }) => {
      return apiRequest(`/api/notification-event-settings/${id}/test`, {
        method: "POST",
        body: JSON.stringify({ phone_number }),
      });
    },
    onSuccess: () => {
      toast({
        title: "تم الإرسال",
        description: "تم إرسال إشعار اختباري",
      });
      setTestDialogOpen(false);
      setTestPhone("");
      refetchLogs();
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في إرسال الإشعار",
        variant: "destructive",
      });
    },
  });

  const settings = settingsResponse?.data || [];
  const logs = logsResponse?.data || [];
  const users = usersResponse?.users || [];
  const roles = rolesResponse?.roles || [];

  const filteredSettings = filterCategory === "all"
    ? settings
    : settings.filter(s => s.event_category === filterCategory);

  const groupedSettings = filteredSettings.reduce((acc, setting) => {
    if (!acc[setting.event_category]) {
      acc[setting.event_category] = [];
    }
    acc[setting.event_category].push(setting);
    return acc;
  }, {} as Record<string, NotificationEventSetting[]>);

  const filteredLogs = logsFilterStatus === "all"
    ? logs
    : logs.filter(l => l.status === logsFilterStatus);

  const handleToggleEnabled = (setting: NotificationEventSetting) => {
    updateSettingMutation.mutate({
      id: setting.id,
      updates: { is_enabled: !setting.is_enabled },
    });
  };

  const handleToggleWhatsApp = (setting: NotificationEventSetting) => {
    updateSettingMutation.mutate({
      id: setting.id,
      updates: { whatsapp_enabled: !setting.whatsapp_enabled },
    });
  };

  const handleEditSave = () => {
    if (!selectedEvent) return;
    updateSettingMutation.mutate({
      id: selectedEvent.id,
      updates: {
        message_template_ar: selectedEvent.message_template_ar,
        priority: selectedEvent.priority,
        delay_minutes: selectedEvent.delay_minutes,
        recipient_user_ids: selectedEvent.recipient_user_ids,
        recipient_role_ids: selectedEvent.recipient_role_ids,
        notify_customer: selectedEvent.notify_customer,
        condition_enabled: selectedEvent.condition_enabled,
        condition_field: selectedEvent.condition_field,
        condition_operator: selectedEvent.condition_operator,
        condition_value: selectedEvent.condition_value,
      },
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("ar-SA");
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      orders: "الطلبات",
      production: "الإنتاج",
      quality: "الجودة",
      maintenance: "الصيانة",
      hr: "الموارد البشرية",
      inventory: "المخزون",
      system: "النظام",
    };
    return labels[category] || category;
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            إعدادات الأحداث
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            سجل الإشعارات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="تصفية حسب الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  <SelectItem value="orders">الطلبات</SelectItem>
                  <SelectItem value="production">الإنتاج</SelectItem>
                  <SelectItem value="quality">الجودة</SelectItem>
                  <SelectItem value="maintenance">الصيانة</SelectItem>
                  <SelectItem value="hr">الموارد البشرية</SelectItem>
                  <SelectItem value="inventory">المخزون</SelectItem>
                  <SelectItem value="system">النظام</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => refetchSettings()} disabled={settingsLoading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${settingsLoading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>

          {settingsLoading ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2" defaultValue={Object.keys(groupedSettings)}>
              {Object.entries(groupedSettings).map(([category, categorySettings]) => {
                const CategoryIcon = categoryIcons[category] || Bell;
                return (
                  <AccordionItem key={category} value={category} className="border rounded-lg overflow-hidden">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${categoryColors[category]}`}>
                          <CategoryIcon className="h-4 w-4" />
                        </div>
                        <span className="font-semibold">{getCategoryLabel(category)}</span>
                        <Badge variant="secondary">{categorySettings.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                      <div className="divide-y">
                        {categorySettings.map((setting) => (
                          <div
                            key={setting.id}
                            className="flex items-center justify-between px-4 py-3 hover:bg-muted/50"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{setting.event_name_ar}</span>
                                {setting.priority === "high" && (
                                  <Badge variant="destructive" className="text-xs">عاجل</Badge>
                                )}
                                {setting.priority === "urgent" && (
                                  <Badge variant="destructive" className="text-xs bg-red-600">طارئ</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{setting.event_description_ar}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Label htmlFor={`enabled-${setting.id}`} className="text-xs text-muted-foreground">
                                  مفعل
                                </Label>
                                <Switch
                                  id={`enabled-${setting.id}`}
                                  checked={setting.is_enabled ?? false}
                                  onCheckedChange={() => handleToggleEnabled(setting)}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <SiWhatsapp className="h-4 w-4 text-green-500" />
                                <Switch
                                  checked={setting.whatsapp_enabled ?? false}
                                  onCheckedChange={() => handleToggleWhatsApp(setting)}
                                />
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedEvent(setting);
                                    setEditDialogOpen(true);
                                  }}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedEvent(setting);
                                    setTestDialogOpen(true);
                                  }}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select value={logsFilterStatus} onValueChange={setLogsFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="تصفية حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="sent">تم الإرسال</SelectItem>
                  <SelectItem value="failed">فشل</SelectItem>
                  <SelectItem value="pending">قيد الانتظار</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => refetchLogs()} disabled={logsLoading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${logsLoading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الحدث</TableHead>
                    <TableHead className="text-right">المستلم</TableHead>
                    <TableHead className="text-right">الرسالة</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        لا توجد سجلات
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.slice(0, 50).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{log.event_key}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.recipient_name}</div>
                            <div className="text-xs text-muted-foreground">{log.recipient_phone}</div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.message_sent_ar}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className="text-sm">
                              {log.status === "sent" ? "تم الإرسال" : log.status === "failed" ? "فشل" : "قيد الانتظار"}
                            </span>
                          </div>
                          {log.error_message && (
                            <div className="text-xs text-red-500 mt-1">{log.error_message}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(log.triggered_at)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل إعدادات الحدث</DialogTitle>
            <DialogDescription>
              {selectedEvent?.event_name_ar}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>قالب الرسالة (عربي)</Label>
                <Textarea
                  value={selectedEvent.message_template_ar || ""}
                  onChange={(e) => setSelectedEvent({ ...selectedEvent, message_template_ar: e.target.value })}
                  placeholder="استخدم {{field_name}} للمتغيرات"
                  className="min-h-[100px]"
                  dir="rtl"
                />
                <p className="text-xs text-muted-foreground">
                  المتغيرات المتاحة: {"{{order_id}}"}, {"{{customer_name}}"}, {"{{status}}"}, {"{{quantity}}"}, الخ.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>الأولوية</Label>
                  <Select
                    value={selectedEvent.priority || "normal"}
                    onValueChange={(value) => setSelectedEvent({ ...selectedEvent, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="normal">عادية</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="urgent">طارئة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>تأخير الإرسال (دقائق)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={selectedEvent.delay_minutes || 0}
                    onChange={(e) => setSelectedEvent({ ...selectedEvent, delay_minutes: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  المستلمون
                </Label>
                
                <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={selectedEvent.notify_customer ?? false}
                      onCheckedChange={(checked) => setSelectedEvent({ ...selectedEvent, notify_customer: checked })}
                    />
                    <Label>إشعار العميل المرتبط بالحدث</Label>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">الأدوار المستلمة</Label>
                    <div className="flex flex-wrap gap-2">
                      {roles.map((role) => (
                        <Badge
                          key={role.id}
                          variant={selectedEvent.recipient_role_ids?.includes(role.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            const currentIds = selectedEvent.recipient_role_ids || [];
                            const newIds = currentIds.includes(role.id)
                              ? currentIds.filter(id => id !== role.id)
                              : [...currentIds, role.id];
                            setSelectedEvent({ ...selectedEvent, recipient_role_ids: newIds });
                          }}
                        >
                          {role.name_ar || role.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm">المستخدمون المحددون</Label>
                    <Select
                      value=""
                      onValueChange={(value) => {
                        const userId = parseInt(value);
                        const currentIds = selectedEvent.recipient_user_ids || [];
                        if (!currentIds.includes(userId)) {
                          setSelectedEvent({ ...selectedEvent, recipient_user_ids: [...currentIds, userId] });
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مستخدم للإضافة" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.filter(u => !(selectedEvent.recipient_user_ids || []).includes(u.id)).map((user) => (
                          <SelectItem key={user.id} value={String(user.id)}>
                            {user.full_name || user.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(selectedEvent.recipient_user_ids || []).map((userId) => {
                        const user = users.find(u => u.id === userId);
                        return (
                          <Badge key={userId} variant="secondary" className="gap-1">
                            {user?.full_name || user?.username || `User ${userId}`}
                            <XCircle 
                              className="h-3 w-3 cursor-pointer" 
                              onClick={() => {
                                const newIds = (selectedEvent.recipient_user_ids || []).filter(id => id !== userId);
                                setSelectedEvent({ ...selectedEvent, recipient_user_ids: newIds });
                              }}
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedEvent.condition_enabled ?? false}
                    onCheckedChange={(checked) => setSelectedEvent({ ...selectedEvent, condition_enabled: checked })}
                  />
                  <Label>تفعيل الشرط</Label>
                </div>
                {selectedEvent.condition_enabled && (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div className="space-y-2">
                      <Label>الحقل</Label>
                      <Input
                        value={selectedEvent.condition_field || ""}
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, condition_field: e.target.value })}
                        placeholder="waste_percentage"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>المعامل</Label>
                      <Select
                        value={selectedEvent.condition_operator || ""}
                        onValueChange={(value) => setSelectedEvent({ ...selectedEvent, condition_operator: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value=">">أكبر من</SelectItem>
                          <SelectItem value=">=">أكبر أو يساوي</SelectItem>
                          <SelectItem value="<">أصغر من</SelectItem>
                          <SelectItem value="<=">أصغر أو يساوي</SelectItem>
                          <SelectItem value="==">يساوي</SelectItem>
                          <SelectItem value="!=">لا يساوي</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>القيمة</Label>
                      <Input
                        value={selectedEvent.condition_value || ""}
                        onChange={(e) => setSelectedEvent({ ...selectedEvent, condition_value: e.target.value })}
                        placeholder="5"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleEditSave} disabled={updateSettingMutation.isPending}>
              {updateSettingMutation.isPending ? (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ) : null}
              حفظ التغييرات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إرسال إشعار اختباري</DialogTitle>
            <DialogDescription>
              أرسل رسالة اختبارية للتحقق من إعدادات الإشعار
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+966500000000"
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={() => selectedEvent && testNotificationMutation.mutate({ id: selectedEvent.id, phone_number: testPhone })}
              disabled={!testPhone || testNotificationMutation.isPending}
            >
              {testNotificationMutation.isPending ? (
                <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 ml-2" />
              )}
              إرسال
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
