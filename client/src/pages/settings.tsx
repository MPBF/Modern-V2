import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  Settings as SettingsIcon, Bell, Shield, Database, Download, Upload,
  Trash2, HardDrive, Save, RefreshCw,
  MapPin, Smartphone,
  Loader2, Activity, Clock, ChevronLeft, ChevronRight,
  MessageCircle, Building2, Plus, Eye, EyeOff,
} from "lucide-react";
import RoleManagementTab from "../components/RoleManagementTab";
import NotificationCenter from "../components/notifications/NotificationCenter";
import WhatsAppWebhooksTab from "../components/settings/WhatsAppWebhooksTab";
import SMSSettingsTab from "../components/settings/SMSSettingsTab";
import NotificationEventSettingsTab from "../components/settings/NotificationEventSettingsTab";
import LocationMapPicker from "../components/LocationMapPicker";
import TableImportDialog from "../components/settings/TableImportDialog";
import { canAccessSettingsTab } from "../utils/roleUtils";

const SECTIONS = [
  { id: "system", icon: SettingsIcon, label: "النظام" },
  { id: "whatsapp", icon: MessageCircle, label: "واتساب" },
  { id: "sms", icon: Smartphone, label: "الرسائل النصية" },
  { id: "database", icon: Database, label: "قاعدة البيانات" },
  { id: "roles", icon: Shield, label: "الأدوار والصلاحيات" },
  { id: "notifications", icon: Bell, label: "الإشعارات" },
  { id: "location", icon: MapPin, label: "المواقع" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<SectionId>("system");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const visibleSections = SECTIONS.filter((s) =>
    canAccessSettingsTab(user, s.id === "whatsapp" ? "whatsapp-webhooks" : s.id)
  );

  useEffect(() => {
    if (visibleSections.length > 0 && !visibleSections.find((s) => s.id === activeSection)) {
      setActiveSection(visibleSections[0].id);
    }
  }, [visibleSections, activeSection]);

  return (
    <PageLayout title="الإعدادات" description="إدارة إعدادات النظام والتكامل">
      <div className="flex gap-6 min-h-[calc(100vh-200px)]">
        <aside className={`shrink-0 transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-56"}`}>
          <Card className="sticky top-4">
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full mb-1"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
              <nav className="space-y-1">
                {visibleSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!sidebarCollapsed && <span className="truncate">{section.label}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
          </Card>
        </aside>

        <main className="flex-1 min-w-0">
          {activeSection === "system" && <SystemSection />}
          {activeSection === "whatsapp" && <WhatsAppSection />}
          {activeSection === "sms" && <SMSSection />}
          {activeSection === "database" && <DatabaseSection />}
          {activeSection === "roles" && <RolesSection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "location" && <LocationSection />}
        </main>
      </div>
    </PageLayout>
  );
}

function SystemSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: systemSettingsData } = useQuery({
    queryKey: ["/api/settings/system"],
    enabled: !!user,
  });

  const { data: userSettingsData } = useQuery({
    queryKey: ["/api/settings/user", user?.id],
    enabled: !!user?.id,
  });

  const convertSettingsArrayToObject = (arr: any[] | undefined) => {
    if (!Array.isArray(arr)) return {};
    return arr.reduce((acc, s) => { acc[s.setting_key] = s.setting_value; return acc; }, {} as any);
  };

  const [systemSettings, setSystemSettings] = useState({
    companyName: "مصنع أكياس MPBF",
    timezone: "Asia/Riyadh",
    currency: "SAR",
    language: "ar",
    dateFormat: "DD/MM/YYYY",
    country: "المملكة العربية السعودية",
    region: "الرياض",
    workingHours: { start: "08:00", end: "17:00" },
    shifts: [
      { id: 1, name: "الصباحية", start: "08:00", end: "16:00" },
      { id: 2, name: "المسائية", start: "16:00", end: "00:00" },
      { id: 3, name: "الليلية", start: "00:00", end: "08:00" },
    ],
  });

  const [userSettings, setUserSettings] = useState({
    notifications: { email: true, sms: false, push: true, sound: true },
    dashboard: { autoRefresh: true, refreshInterval: 30, compactView: false },
  });

  useEffect(() => {
    if (systemSettingsData && Array.isArray(systemSettingsData)) {
      const o = convertSettingsArrayToObject(systemSettingsData);
      setSystemSettings((prev) => ({
        ...prev,
        companyName: o.companyName || prev.companyName,
        timezone: o.timezone || prev.timezone,
        currency: o.currency || prev.currency,
        language: o.language || prev.language,
        dateFormat: o.dateFormat || prev.dateFormat,
        country: o.country || prev.country,
        region: o.region || prev.region,
        workingHours: {
          start: o.workingHoursStart || prev.workingHours.start,
          end: o.workingHoursEnd || prev.workingHours.end,
        },
      }));
    }
  }, [systemSettingsData]);

  useEffect(() => {
    if (userSettingsData && Array.isArray(userSettingsData)) {
      const o = convertSettingsArrayToObject(userSettingsData);
      setUserSettings((prev) => ({
        notifications: {
          email: o.notificationsEmail === "true" || prev.notifications.email,
          sms: o.notificationsSms === "true" || prev.notifications.sms,
          push: o.notificationsPush === "true" || prev.notifications.push,
          sound: o.notificationsSound === "true" || prev.notifications.sound,
        },
        dashboard: {
          autoRefresh: o.dashboardAutoRefresh === "true" || prev.dashboard.autoRefresh,
          refreshInterval: parseInt(o.dashboardRefreshInterval) || prev.dashboard.refreshInterval,
          compactView: o.dashboardCompactView === "true" || prev.dashboard.compactView,
        },
      }));
    }
  }, [userSettingsData]);

  const saveSystemMutation = useMutation({
    mutationFn: async (settings: typeof systemSettings) => {
      await apiRequest("/api/settings/system", {
        method: "POST",
        body: JSON.stringify({
          settings: {
            companyName: settings.companyName,
            timezone: settings.timezone,
            currency: settings.currency,
            language: settings.language,
            dateFormat: settings.dateFormat,
            country: settings.country,
            region: settings.region,
            workingHoursStart: settings.workingHours.start,
            workingHoursEnd: settings.workingHours.end,
          },
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/system"] });
      toast({ title: "تم حفظ إعدادات النظام بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حفظ الإعدادات", variant: "destructive" });
    },
  });

  const saveUserMutation = useMutation({
    mutationFn: async (settings: typeof userSettings) => {
      await apiRequest(`/api/settings/user/${user?.id}`, {
        method: "POST",
        body: JSON.stringify({
          settings: {
            notificationsEmail: String(settings.notifications.email),
            notificationsSms: String(settings.notifications.sms),
            notificationsPush: String(settings.notifications.push),
            notificationsSound: String(settings.notifications.sound),
            dashboardAutoRefresh: String(settings.dashboard.autoRefresh),
            dashboardRefreshInterval: String(settings.dashboard.refreshInterval),
            dashboardCompactView: String(settings.dashboard.compactView),
          },
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/user", user?.id] });
      toast({ title: "تم حفظ إعدادات المستخدم بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حفظ الإعدادات", variant: "destructive" });
    },
  });

  const regions = [
    { value: "الرياض", label: "الرياض" }, { value: "جدة", label: "جدة" },
    { value: "الدمام", label: "الدمام" }, { value: "مكة المكرمة", label: "مكة المكرمة" },
    { value: "المدينة المنورة", label: "المدينة المنورة" }, { value: "تبوك", label: "تبوك" },
    { value: "أبها", label: "أبها" }, { value: "حائل", label: "حائل" },
    { value: "الطائف", label: "الطائف" }, { value: "الخبر", label: "الخبر" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">إعدادات النظام</h2>
          <p className="text-sm text-muted-foreground">الإعدادات العامة للنظام والشركة</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" /> معلومات الشركة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>اسم الشركة</Label>
              <Input value={systemSettings.companyName} onChange={(e) => setSystemSettings((p) => ({ ...p, companyName: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الدولة</Label>
              <Input value={systemSettings.country} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>المنطقة</Label>
              <Select value={systemSettings.region} onValueChange={(v) => setSystemSettings((p) => ({ ...p, region: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {regions.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المنطقة الزمنية</Label>
              <Input value="Asia/Riyadh (GMT+3)" readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>العملة</Label>
              <Input value="ريال سعودي (SAR)" readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>لغة النظام</Label>
              <Select value={systemSettings.language} onValueChange={(v) => setSystemSettings((p) => ({ ...p, language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> ساعات العمل والورديات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>بداية الدوام</Label>
              <Input type="time" value={systemSettings.workingHours.start} onChange={(e) => setSystemSettings((p) => ({ ...p, workingHours: { ...p.workingHours, start: e.target.value } }))} />
            </div>
            <div className="space-y-2">
              <Label>نهاية الدوام</Label>
              <Input type="time" value={systemSettings.workingHours.end} onChange={(e) => setSystemSettings((p) => ({ ...p, workingHours: { ...p.workingHours, end: e.target.value } }))} />
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            {systemSettings.shifts.map((shift) => (
              <div key={shift.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="font-medium">{shift.name}</span>
                  <p className="text-sm text-muted-foreground">من {shift.start} إلى {shift.end}</p>
                </div>
                <Badge variant="outline">نشطة</Badge>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => saveSystemMutation.mutate(systemSettings)} disabled={saveSystemMutation.isPending}>
              {saveSystemMutation.isPending ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ إعدادات النظام
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> تفضيلات الإشعارات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { key: "email" as const, label: "إشعارات البريد الإلكتروني", desc: "استلام الإشعارات عبر البريد" },
            { key: "sms" as const, label: "إشعارات الرسائل النصية", desc: "استلام الإشعارات عبر SMS" },
            { key: "push" as const, label: "إشعارات المتصفح", desc: "إشعارات فورية في المتصفح" },
            { key: "sound" as const, label: "أصوات الإشعارات", desc: "تشغيل صوت عند وصول إشعار" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div>
                <Label className="text-base">{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                checked={userSettings.notifications[item.key]}
                onCheckedChange={(checked) =>
                  setUserSettings((prev) => ({
                    ...prev,
                    notifications: { ...prev.notifications, [item.key]: checked },
                  }))
                }
              />
            </div>
          ))}
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">تحديث تلقائي للوحة التحكم</Label>
              <p className="text-sm text-muted-foreground">تحديث البيانات تلقائياً</p>
            </div>
            <Switch
              checked={userSettings.dashboard.autoRefresh}
              onCheckedChange={(checked) =>
                setUserSettings((prev) => ({ ...prev, dashboard: { ...prev.dashboard, autoRefresh: checked } }))
              }
            />
          </div>
          {userSettings.dashboard.autoRefresh && (
            <div className="space-y-2">
              <Label>فترة التحديث</Label>
              <Select
                value={userSettings.dashboard.refreshInterval.toString()}
                onValueChange={(v) => setUserSettings((prev) => ({ ...prev, dashboard: { ...prev.dashboard, refreshInterval: parseInt(v) } }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 ثانية</SelectItem>
                  <SelectItem value="30">30 ثانية</SelectItem>
                  <SelectItem value="60">دقيقة واحدة</SelectItem>
                  <SelectItem value="300">5 دقائق</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => saveUserMutation.mutate(userSettings)} disabled={saveUserMutation.isPending}>
              {saveUserMutation.isPending ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
              حفظ التفضيلات
            </Button>
          </div>
        </CardContent>
      </Card>

      <PwaInstallCard />
    </div>
  );
}

function PwaInstallCard() {
  const { toast } = useToast();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swStatus, setSwStatus] = useState<string>("جاري الفحص...");

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (isStandalone) {
      setIsInstalled(true);
      setSwStatus("التطبيق مثبت ويعمل");
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          setSwStatus("Service Worker مسجل وفعّال");
        } else {
          setSwStatus("Service Worker غير مسجل");
        }
      });
    } else {
      setSwStatus("المتصفح لا يدعم Service Worker");
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        toast({ title: "تم تثبيت التطبيق بنجاح" });
      }
      setDeferredPrompt(null);
    } else {
      toast({
        title: "تعليمات التثبيت",
        description: "افتح القائمة (⋮) في Chrome واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»",
      });
    }
  };

  const handleClearPwaDismissed = () => {
    localStorage.removeItem("mpbf_pwa_dismissed");
    toast({ title: "تم إعادة تفعيل إشعار التثبيت" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> تطبيق PWA</CardTitle>
        <CardDescription>تثبيت التطبيق على جهازك للوصول السريع</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base">حالة التطبيق</Label>
            <p className="text-sm text-muted-foreground">{swStatus}</p>
          </div>
          <Badge variant={isInstalled ? "default" : "secondary"}>
            {isInstalled ? "مثبت" : "غير مثبت"}
          </Badge>
        </div>
        {!isInstalled && (
          <div className="flex gap-2">
            <Button onClick={handleInstall} className="gap-2">
              <Download className="w-4 h-4" />
              {deferredPrompt ? "تثبيت التطبيق" : "عرض تعليمات التثبيت"}
            </Button>
            <Button variant="outline" onClick={handleClearPwaDismissed}>
              إعادة تفعيل إشعار التثبيت
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsAppSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <MessageCircle className="h-6 w-6 text-green-600" />
        <div>
          <h2 className="text-xl font-bold">واتساب</h2>
          <p className="text-sm text-muted-foreground">إرسال واستقبال رسائل واتساب وإدارة الإعدادات</p>
        </div>
      </div>
      <WhatsAppWebhooksTab />
    </div>
  );
}

function SMSSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Smartphone className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold">الرسائل النصية (SMS)</h2>
          <p className="text-sm text-muted-foreground">إرسال رسائل نصية وإدارة خدمة Taqnyat SMS</p>
        </div>
      </div>
      <SMSSettingsTab />
    </div>
  );
}

function DatabaseSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  const { data: databaseStatsData } = useQuery({ queryKey: ["/api/database/stats"], enabled: !!user });

  const databaseStats = (databaseStatsData && typeof databaseStatsData === "object")
    ? databaseStatsData as any
    : { tableCount: 0, totalRecords: 0, databaseSize: "---", lastBackup: "---" };

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/database/backup", { method: "POST" });
      return await res.json();
    },
    onSuccess: (data: any) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mpbf-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "تم إنشاء النسخة الاحتياطية بنجاح" });
    },
    onError: () => toast({ title: "فشل إنشاء النسخة الاحتياطية", variant: "destructive" }),
  });

  const handleBackupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedBackupFile(file);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setPendingBackupData(data);
      setShowRestoreConfirm(true);
    } catch {
      toast({ title: "ملف غير صالح", variant: "destructive" });
    }
  };

  const restoreBackupMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/database/restore", {
        method: "POST",
        body: JSON.stringify({ backupData: data }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      toast({ title: "تم استعادة النسخة الاحتياطية بنجاح" });
      setSelectedBackupFile(null);
      setPendingBackupData(null);
    },
    onError: () => toast({ title: "فشل استعادة النسخة", variant: "destructive" }),
  });

  const confirmRestore = () => {
    if (pendingBackupData) {
      restoreBackupMutation.mutate(pendingBackupData);
      setShowRestoreConfirm(false);
    }
  };

  const exportTableMutation = useMutation({
    mutationFn: async ({ tableName, format }: { tableName: string; format: string }) => {
      const res = await fetch(`/api/database/export/${tableName}?format=${format}`, { credentials: "include" });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      return { blob, tableName, format };
    },
    onSuccess: ({ blob, tableName, format }) => {
      const ext = format === "json" ? "json" : format === "excel" ? "xlsx" : "csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${tableName}-${new Date().toISOString().split("T")[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: `تم تصدير جدول ${tableName}` });
    },
    onError: () => toast({ title: "فشل التصدير", variant: "destructive" }),
  });

  const optimizeTablesMutation = useMutation({
    mutationFn: async () => apiRequest("/api/database/optimize", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      toast({ title: "تم تحسين قاعدة البيانات" });
    },
  });

  const integrityCheckMutation = useMutation({
    mutationFn: async () => apiRequest("/api/database/integrity-check", { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      toast({ title: "تم فحص تكامل قاعدة البيانات بنجاح" });
    },
    onError: () => toast({ title: "فشل فحص التكامل", variant: "destructive" }),
  });

  const cleanupDataMutation = useMutation({
    mutationFn: async () => apiRequest("/api/database/cleanup", { method: "POST", body: JSON.stringify({ daysOld: 90 }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      toast({ title: "تم تنظيف البيانات القديمة بنجاح" });
    },
    onError: () => toast({ title: "فشل التنظيف", variant: "destructive" }),
  });

  const tableOptions = [
    "customers", "categories", "sections", "items", "customer_products", "users", "roles",
    "machines", "locations", "suppliers", "orders", "production_orders", "rolls", "cuts",
    "inventory", "inventory_movements", "warehouse_receipts", "warehouse_transactions",
    "maintenance_requests", "maintenance_actions", "spare_parts", "consumable_parts",
    "waste", "quality_checks", "attendance", "notifications",
  ];

  const tableLabels: Record<string, string> = {
    customers: "العملاء", categories: "الفئات", sections: "الأقسام", items: "الأصناف",
    customer_products: "منتجات العملاء", users: "المستخدمين", roles: "الأدوار",
    machines: "الآلات", locations: "المواقع", suppliers: "الموردين", orders: "الطلبات",
    production_orders: "أوامر الإنتاج", rolls: "الرولات", cuts: "القطع",
    inventory: "المخزون", inventory_movements: "حركات المخزون",
    warehouse_receipts: "سندات الاستلام", warehouse_transactions: "حركات المستودع",
    maintenance_requests: "طلبات الصيانة", maintenance_actions: "إجراءات الصيانة",
    spare_parts: "قطع الغيار", consumable_parts: "المستهلكات",
    waste: "الهدر", quality_checks: "فحوصات الجودة", attendance: "الحضور",
    notifications: "الإشعارات",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Database className="h-6 w-6 text-orange-600" />
        <div>
          <h2 className="text-xl font-bold">قاعدة البيانات</h2>
          <p className="text-sm text-muted-foreground">إدارة قاعدة البيانات والنسخ الاحتياطي والتصدير</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "عدد الجداول", value: databaseStats.tableCount, color: "text-blue-600" },
          { label: "إجمالي السجلات", value: typeof databaseStats.totalRecords === "number" ? databaseStats.totalRecords.toLocaleString("en-US") : databaseStats.totalRecords, color: "text-green-600" },
          { label: "حجم قاعدة البيانات", value: databaseStats.databaseSize, color: "text-orange-600" },
          { label: "آخر نسخة احتياطية", value: databaseStats.lastBackup, color: "text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label} className="p-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Download className="h-4 w-4 text-blue-500" /> إنشاء نسخة احتياطية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">تصدير كامل لقاعدة البيانات بصيغة JSON</p>
            <Button className="w-full" disabled={createBackupMutation.isPending} onClick={() => createBackupMutation.mutate()}>
              {createBackupMutation.isPending ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Download className="w-4 h-4 ml-2" />}
              تصدير النسخة الاحتياطية
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4 text-green-500" /> استعادة نسخة احتياطية</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">استيراد نسخة احتياطية سابقة من ملف JSON</p>
            <input type="file" ref={backupFileInputRef} onChange={handleBackupFileSelect} accept=".json" className="hidden" />
            <Button variant="outline" className="w-full" disabled={restoreBackupMutation.isPending} onClick={() => backupFileInputRef.current?.click()}>
              {restoreBackupMutation.isPending ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />}
              {selectedBackupFile ? selectedBackupFile.name : "اختيار ملف واستعادة"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HardDrive className="h-5 w-5" /> تصدير جدول</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>اختر الجدول</Label>
            <Select value={selectedTable} onValueChange={setSelectedTable}>
              <SelectTrigger><SelectValue placeholder="اختر جدول للتصدير" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {tableOptions.map((t) => <SelectItem key={t} value={t}>{tableLabels[t] || t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(["csv", "json", "excel"] as const).map((fmt) => (
              <Button
                key={fmt}
                variant="outline"
                size="sm"
                disabled={!selectedTable || exportTableMutation.isPending}
                onClick={() => exportTableMutation.mutate({ tableName: selectedTable, format: fmt })}
              >
                <Download className="w-4 h-4 ml-1" />
                {fmt.toUpperCase()}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-green-600" /> استيراد بيانات إلى جدول</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">استيراد بيانات من ملف خارجي (CSV, Excel, JSON) إلى جدول مع ربط الأعمدة تلقائياً</p>
          <Button
            className="w-full"
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="w-4 h-4 ml-2" />
            استيراد بيانات من ملف
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><SettingsIcon className="h-5 w-5" /> صيانة قاعدة البيانات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" disabled={optimizeTablesMutation.isPending} onClick={() => optimizeTablesMutation.mutate()}>
              {optimizeTablesMutation.isPending ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <RefreshCw className="w-4 h-4 ml-2" />}
              تحسين الجداول
            </Button>
            <Button variant="outline" disabled={integrityCheckMutation.isPending} onClick={() => integrityCheckMutation.mutate()}>
              {integrityCheckMutation.isPending ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Database className="w-4 h-4 ml-2" />}
              فحص التكامل
            </Button>
            <Button variant="destructive" disabled={cleanupDataMutation.isPending} onClick={() => cleanupDataMutation.mutate()}>
              {cleanupDataMutation.isPending ? <RefreshCw className="w-4 h-4 ml-2 animate-spin" /> : <Trash2 className="w-4 h-4 ml-2" />}
              تنظيف البيانات القديمة
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد استعادة النسخة الاحتياطية</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>هل أنت متأكد من استعادة هذه النسخة الاحتياطية؟</p>
              <p className="font-semibold text-red-600">سيتم استبدال جميع البيانات الحالية!</p>
              {pendingBackupData?.metadata && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <p>الملف: {selectedBackupFile?.name}</p>
                  <p>عدد الجداول: {pendingBackupData.metadata.totalTables}</p>
                  <p>التاريخ: {new Date(pendingBackupData.metadata.timestamp).toLocaleString("ar-SA")}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowRestoreConfirm(false); setSelectedBackupFile(null); setPendingBackupData(null); }}>
              إلغاء
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={restoreBackupMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {restoreBackupMutation.isPending ? "جاري الاستعادة..." : "استعادة"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <TableImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        tableOptions={["customers", "categories", "sections", "items", "customer_products", "users", "machines", "locations"]}
        tableLabels={tableLabels}
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
        }}
      />
    </div>
  );
}

function RolesSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="h-6 w-6 text-indigo-600" />
        <div>
          <h2 className="text-xl font-bold">الأدوار والصلاحيات</h2>
          <p className="text-sm text-muted-foreground">إدارة أدوار المستخدمين وصلاحيات الوصول</p>
        </div>
      </div>
      <Card>
        <CardContent className="pt-6">
          <RoleManagementTab />
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSection() {
  const [activeTab, setActiveTab] = useState<"center" | "events">("center");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Bell className="h-6 w-6 text-yellow-600" />
        <div>
          <h2 className="text-xl font-bold">مركز الإشعارات</h2>
          <p className="text-sm text-muted-foreground">عرض الإشعارات وإدارة أحداث التنبيه</p>
        </div>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <Button variant={activeTab === "center" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("center")} className="gap-2">
          <Bell className="h-4 w-4" /> الإشعارات
        </Button>
        <Button variant={activeTab === "events" ? "default" : "ghost"} size="sm" onClick={() => setActiveTab("events")} className="gap-2">
          <Activity className="h-4 w-4" /> أحداث التنبيه
        </Button>
      </div>

      {activeTab === "center" && <NotificationCenter />}
      {activeTab === "events" && <NotificationEventSettingsTab />}
    </div>
  );
}

function LocationSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [latitude, setLatitude] = useState(24.7136);
  const [longitude, setLongitude] = useState(46.6753);
  const [radius, setRadius] = useState(500);
  const [description, setDescription] = useState("");

  const { data: locations, isLoading } = useQuery<any[]>({ queryKey: ["/api/factory-locations"] });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("/api/factory-locations", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/factory-locations"] }); toast({ title: "تم إضافة الموقع" }); resetForm(); },
    onError: () => toast({ title: "خطأ في إضافة الموقع", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => apiRequest(`/api/factory-locations/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/factory-locations"] }); toast({ title: "تم تحديث الموقع" }); resetForm(); },
    onError: () => toast({ title: "خطأ في تحديث الموقع", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest(`/api/factory-locations/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/factory-locations"] }); toast({ title: "تم حذف الموقع" }); },
    onError: () => toast({ title: "خطأ في الحذف", variant: "destructive" }),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest(`/api/factory-locations/${id}`, { method: "PUT", body: JSON.stringify({ is_active: !isActive }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/factory-locations"] }); toast({ title: "تم تحديث الحالة" }); },
  });

  const resetForm = () => {
    setShowForm(false); setEditingLocation(null); setName(""); setNameAr("");
    setLatitude(24.7136); setLongitude(46.6753); setRadius(500); setDescription("");
  };

  const handleEdit = (loc: any) => {
    setEditingLocation(loc); setName(loc.name); setNameAr(loc.name_ar);
    setLatitude(parseFloat(loc.latitude)); setLongitude(parseFloat(loc.longitude));
    setRadius(loc.allowed_radius); setDescription(loc.description || ""); setShowForm(true);
  };

  const handleSubmit = () => {
    if (!name || !nameAr) { toast({ title: "أدخل الاسم بالعربية والإنجليزية", variant: "destructive" }); return; }
    const data = { name, name_ar: nameAr, latitude: latitude.toString(), longitude: longitude.toString(), allowed_radius: radius, description, is_active: true };
    if (editingLocation) updateMutation.mutate({ id: editingLocation.id, data });
    else createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <MapPin className="h-6 w-6 text-red-600" />
        <div>
          <h2 className="text-xl font-bold">مواقع المصنع</h2>
          <p className="text-sm text-muted-foreground">إدارة مواقع المصنع والنطاق الجغرافي للحضور</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="font-semibold">المواقع المسجلة</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 ml-2" />
          {showForm ? "إلغاء" : "إضافة موقع جديد"}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
      ) : locations && locations.length > 0 ? (
        <div className="grid gap-4">
          {locations.map((loc: any) => (
            <Card key={loc.id} className={!loc.is_active ? "opacity-50" : ""}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{loc.name_ar}</h4>
                      <Badge variant={loc.is_active ? "default" : "secondary"}>
                        {loc.is_active ? "نشط" : "معطل"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{loc.description || loc.name}</p>
                    <div className="text-sm space-y-1">
                      <p><strong>الإحداثيات:</strong> {loc.latitude}, {loc.longitude}</p>
                      <p><strong>نطاق الحضور:</strong> {loc.allowed_radius} متر</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => toggleActiveMutation.mutate({ id: loc.id, isActive: loc.is_active })}>
                      {loc.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(loc)}>تعديل</Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(loc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">لا توجد مواقع مسجلة</div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingLocation ? "تعديل الموقع" : "إضافة موقع جديد"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>الاسم بالإنجليزية</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Main Factory" />
              </div>
              <div className="space-y-2">
                <Label>الاسم بالعربية</Label>
                <Input value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="المصنع الرئيسي" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف الموقع" />
            </div>
            <div className="space-y-2">
              <Label>اختر من الخريطة</Label>
              <LocationMapPicker latitude={latitude} longitude={longitude} radius={radius} onLocationChange={(lat, lng) => { setLatitude(lat); setLongitude(lng); }} editable={true} />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>خط العرض</Label>
                <Input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>خط الطول</Label>
                <Input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(parseFloat(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>النطاق (متر)</Label>
                <Input type="number" value={radius} onChange={(e) => setRadius(parseInt(e.target.value))} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} className="flex-1">
                <Save className="w-4 h-4 ml-2" />
                {editingLocation ? "تحديث الموقع" : "إضافة الموقع"}
              </Button>
              <Button variant="outline" onClick={resetForm}>إلغاء</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
