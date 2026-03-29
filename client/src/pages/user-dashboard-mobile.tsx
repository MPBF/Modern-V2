import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Clock, User, MapPin, CheckCircle, XCircle, Home,
  ArrowLeft, AlertTriangle, Coffee, LogIn, LogOut,
  FileText, Plus, Send, ChevronRight, Timer
} from "lucide-react";
import { useForceDesktop } from "../hooks/use-mobile-redirect";

type DashboardView = "main" | "requests" | "new-request";

export default function UserDashboardMobile() {
  const [currentView, setCurrentView] = useState<DashboardView>("main");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {currentView === "main" && <MainDashboard onNavigate={setCurrentView} />}
      {currentView === "requests" && <RequestsView onBack={() => setCurrentView("main")} onNewRequest={() => setCurrentView("new-request")} />}
      {currentView === "new-request" && <NewRequestView onBack={() => setCurrentView("requests")} />}
    </div>
  );
}

function MobileHeader({ title, onBack, rightAction }: { title: string; onBack?: () => void; rightAction?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 bg-emerald-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
      {onBack && (
        <button onClick={onBack} className="p-1 hover:bg-emerald-700 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="text-lg font-bold flex-1">{title}</h1>
      {rightAction}
    </div>
  );
}

function BackToDesktopBar() {
  const { t } = useTranslation();
  const { setForceDesktop } = useForceDesktop();
  return (
    <a
      href="/"
      onClick={() => setForceDesktop(true)}
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-gray-900 text-white text-xs py-1.5 hover:bg-gray-800 transition-colors"
    >
      <Home className="h-3.5 w-3.5" />
      <span>{t('header.mobile.backToDesktop', 'العودة للنسخة الكاملة')}</span>
    </a>
  );
}

function MainDashboard({ onNavigate }: { onNavigate: (view: DashboardView) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { data: userData } = useQuery<any>({
    queryKey: ["/api/users", user?.id],
    enabled: !!user?.id,
  });

  const { data: dailyStatus } = useQuery<any>({
    queryKey: ["/api/attendance/daily-status", user?.id],
    enabled: !!user?.id,
    refetchInterval: 120000,
  });

  const { data: attendanceRecords } = useQuery<any[]>({
    queryKey: ["/api/attendance"],
    select: (data) => data.filter((r: any) => r.user_id === user?.id),
  });

  const { data: userRequests } = useQuery<any[]>({
    queryKey: ["/api/user-requests"],
    select: (data) => data.filter((r: any) => r.user_id === user?.id),
  });

  const { data: violations } = useQuery<any[]>({
    queryKey: ["/api/violations"],
    select: (data) => data.filter((v: any) => v.user_id === user?.id),
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAttendance = attendanceRecords
    ?.filter((r) => r.date === todayStr)
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];

  const requestLocation = useCallback(() => {
    setIsLoadingLocation(true);
    if (!navigator.geolocation) {
      setIsLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setIsLoadingLocation(false);
      },
      () => setIsLoadingLocation(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => { requestLocation(); }, [requestLocation]);

  const attendanceMutation = useMutation({
    mutationFn: async (data: { status: string; action?: string }) => {
      if (!currentLocation) throw new Error(t('mobilePages.userDashboard.locationRequired'));
      const res = await apiRequest("/api/attendance", {
        method: "POST",
        body: JSON.stringify({
          user_id: user?.id,
          status: data.status,
          action: data.action,
          date: todayStr,
          location: { lat: currentLocation.lat, lng: currentLocation.lng, accuracy: currentLocation.accuracy, distance: 0 },
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/attendance/daily-status", user?.id] });
      toast({ title: t('userDashboard.attendance.attendanceSuccess') });
    },
    onError: (err: any) => {
      toast({ title: t('userDashboard.attendance.attendanceError'), description: err.message, variant: "destructive" });
    },
  });

  const getStatusInfo = () => {
    if (!dailyStatus) return { label: t('mobilePages.userDashboard.notCheckedIn'), color: "bg-gray-100 text-gray-600", icon: Clock };
    if (dailyStatus.hasCheckedOut) return { label: t('mobilePages.userDashboard.departed'), color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400", icon: LogOut };
    if (dailyStatus.hasStartedLunch && !dailyStatus.hasEndedLunch) return { label: t('mobilePages.userDashboard.onLunch'), color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", icon: Coffee };
    if (dailyStatus.hasCheckedIn) return { label: t('mobilePages.userDashboard.present'), color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle };
    return { label: t('mobilePages.userDashboard.notCheckedIn'), color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400", icon: Clock };
  };

  const statusInfo = getStatusInfo();
  const StatusIcon = statusInfo.icon;

  const calculateWorkingTime = () => {
    if (!todayAttendance?.check_in_time) return null;
    const checkIn = new Date(todayAttendance.check_in_time);
    const now = todayAttendance.check_out_time ? new Date(todayAttendance.check_out_time) : new Date();
    const totalMinutes = Math.floor((now.getTime() - checkIn.getTime()) / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return { hours, mins, totalMinutes };
  };

  const workingTime = calculateWorkingTime();
  const pendingRequests = (userRequests || []).filter((r: any) => r.status === "معلق").length;
  const activeViolations = (violations || []).filter((v: any) => v.status === "معلق" || v.status === "مطبق").length;

  const getAvailableActions = () => {
    const actions: { label: string; icon: any; action: () => void; color: string; disabled?: boolean }[] = [];

    if (!dailyStatus?.hasCheckedIn) {
      actions.push({
        label: t('mobilePages.userDashboard.checkIn'),
        icon: LogIn,
        action: () => attendanceMutation.mutate({ status: "حاضر", action: "check_in" }),
        color: "bg-green-500 hover:bg-green-600",
      });
    } else if (!dailyStatus?.hasCheckedOut) {
      if (!dailyStatus?.hasStartedLunch) {
        actions.push({
          label: t('mobilePages.userDashboard.lunchStart'),
          icon: Coffee,
          action: () => attendanceMutation.mutate({ status: "استراحة غداء", action: "lunch_start" }),
          color: "bg-amber-500 hover:bg-amber-600",
        });
      } else if (!dailyStatus?.hasEndedLunch) {
        actions.push({
          label: t('mobilePages.userDashboard.lunchEnd'),
          icon: Coffee,
          action: () => attendanceMutation.mutate({ status: "حاضر", action: "lunch_end" }),
          color: "bg-blue-500 hover:bg-blue-600",
        });
      }
      actions.push({
        label: t('mobilePages.userDashboard.checkOut'),
        icon: LogOut,
        action: () => attendanceMutation.mutate({ status: "مغادر", action: "check_out" }),
        color: "bg-red-500 hover:bg-red-600",
      });
    }
    return actions;
  };

  const availableActions = getAvailableActions();

  return (
    <div className="pb-20">
      <BackToDesktopBar />
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
            <User className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{userData?.full_name || user?.full_name || user?.username}</h1>
            <p className="text-emerald-200 text-sm">{userData?.position || userData?.department || ""}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 ${statusInfo.color}`}>
            <StatusIcon className="h-4 w-4" />
            {statusInfo.label}
          </div>
        </div>

        <div className="text-center bg-white/10 rounded-xl p-4">
          <div className="text-4xl font-bold font-mono">
            {currentTime.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-sm text-emerald-200 mt-1">
            {currentTime.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {availableActions.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {availableActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Button
                  key={i}
                  onClick={action.action}
                  disabled={attendanceMutation.isPending || isLoadingLocation}
                  className={`${action.color} text-white h-14 text-sm font-bold shadow-lg`}
                >
                  {attendanceMutation.isPending ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Icon className="h-5 w-5 ml-1" />
                      {action.label}
                    </>
                  )}
                </Button>
              );
            })}
          </div>
        )}

        {workingTime && (
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Timer className="h-4 w-4 text-emerald-500" />
              {t('mobilePages.userDashboard.workingHours')}
            </h3>
            <div className="text-center">
              <span className="text-3xl font-bold">{workingTime.hours}</span>
              <span className="text-sm text-gray-500 mx-1">{t('mobilePages.userDashboard.hours')}</span>
              <span className="text-3xl font-bold">{workingTime.mins}</span>
              <span className="text-sm text-gray-500 mx-1">{t('mobilePages.userDashboard.minutes')}</span>
            </div>
            {todayAttendance?.check_in_time && (
              <div className="flex justify-between mt-3 text-xs text-gray-500">
                <span>{t('mobilePages.userDashboard.checkIn')}: {new Date(todayAttendance.check_in_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                {todayAttendance?.check_out_time && (
                  <span>{t('mobilePages.userDashboard.checkOut')}: {new Date(todayAttendance.check_out_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate("requests")}
            className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 text-start active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <FileText className="h-5 w-5 text-blue-500" />
              {pendingRequests > 0 && (
                <Badge variant="destructive" className="text-xs">{pendingRequests}</Badge>
              )}
            </div>
            <div className="font-bold text-sm">{t('mobilePages.userDashboard.requests')}</div>
            <div className="text-xs text-gray-500">{(userRequests || []).length} {t('mobilePages.userDashboard.requests')}</div>
          </button>

          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {activeViolations > 0 && (
                <Badge variant="destructive" className="text-xs">{activeViolations}</Badge>
              )}
            </div>
            <div className="font-bold text-sm">{t('mobilePages.userDashboard.violations')}</div>
            <div className="text-xs text-gray-500">
              {activeViolations > 0 ? `${activeViolations}` : t('mobilePages.userDashboard.noViolations')}
            </div>
          </div>
        </div>

        {currentLocation && (
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}</span>
            {currentLocation.accuracy && <span className="text-gray-400">±{Math.round(currentLocation.accuracy)}m</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsView({ onBack, onNewRequest }: { onBack: () => void; onNewRequest: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: userRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/user-requests"],
    select: (data) => data.filter((r: any) => r.user_id === user?.id),
  });

  const statusColors: Record<string, string> = {
    "معلق": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    "موافق": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    "مرفوض": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <div className="pb-20">
      <MobileHeader
        title={t('mobilePages.userDashboard.requests')}
        onBack={onBack}
        rightAction={
          <button onClick={onNewRequest} className="p-1 hover:bg-emerald-700 rounded-lg">
            <Plus className="h-5 w-5" />
          </button>
        }
      />

      <div className="px-4 pt-4 space-y-3">
        {userRequests.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('mobilePages.userDashboard.noRequests')}</p>
            <Button onClick={onNewRequest} className="mt-4">
              <Plus className="h-4 w-4 ml-1" />
              {t('mobilePages.userDashboard.newRequest')}
            </Button>
          </div>
        ) : (
          userRequests.map((req: any) => (
            <div key={req.id} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{req.title}</p>
                  <p className="text-xs text-gray-500">{req.type} • {new Date(req.date).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[req.status] || "bg-gray-100 text-gray-600"}`}>
                  {req.status}
                </span>
              </div>
              {req.description && <p className="text-xs text-gray-600 dark:text-gray-400">{req.description}</p>}
              {req.response && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-xs">
                  <span className="font-medium">الرد: </span>{req.response}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewRequestView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [requestType, setRequestType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/user-requests", {
        method: "POST",
        body: JSON.stringify({
          user_id: user?.id,
          type: requestType,
          title,
          description,
          status: "معلق",
          date: new Date().toISOString().split("T")[0],
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('mobilePages.userDashboard.submitRequest') });
      queryClient.invalidateQueries({ queryKey: ["/api/user-requests"] });
      onBack();
    },
    onError: (err: any) => {
      toast({ title: t('warehouse.toast.error'), description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="pb-20">
      <MobileHeader title={t('mobilePages.userDashboard.newRequest')} onBack={onBack} />

      <div className="px-4 pt-4 space-y-4">
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('mobilePages.userDashboard.requestType')}</label>
            <Select value={requestType} onValueChange={setRequestType}>
              <SelectTrigger><SelectValue placeholder={t('mobilePages.userDashboard.requestType')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="إجازة">{t('mobilePages.userDashboard.leave')}</SelectItem>
                <SelectItem value="شكوى">{t('mobilePages.userDashboard.complaint')}</SelectItem>
                <SelectItem value="طلب خاص">{t('mobilePages.userDashboard.specialRequest')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('mobilePages.userDashboard.requestTitle')}</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('mobilePages.userDashboard.requestTitle')} />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">{t('mobilePages.userDashboard.requestDescription')}</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('mobilePages.userDashboard.requestDescription')} className="min-h-[80px]" />
          </div>

          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!requestType || !title || submitMutation.isPending}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {submitMutation.isPending ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4 ml-1" />
            )}
            {t('mobilePages.userDashboard.submitRequest')}
          </Button>
        </div>
      </div>
    </div>
  );
}
