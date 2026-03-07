import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import {
  User,
  Sun,
  Moon,
  Monitor,
  Save,
  RefreshCw,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { useTheme } from "../../contexts/ThemeContext";

export default function UserProfile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setTheme: applyTheme } = useTheme();

  const { data: userSettingsData } = useQuery({
    queryKey: ["/api/settings/user", user?.id],
    enabled: !!user?.id,
  });

  const [userSettings, setUserSettings] = useState({
    displayName: user?.display_name_ar || "",
    email: "",
    phone: "",
    language: "ar",
    theme: "light",
    notifications: {
      email: true,
      sms: false,
      push: true,
      sound: true,
    },
    dashboard: {
      autoRefresh: true,
      refreshInterval: 30,
      compactView: false,
    },
  });

  useEffect(() => {
    if (userSettingsData && Array.isArray(userSettingsData)) {
      const settingsMap = userSettingsData.reduce((acc: any, setting: any) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {});

      const serverTheme = settingsMap.theme || "light";
      setUserSettings((prev) => ({
        ...prev,
        displayName: user?.display_name_ar || settingsMap.displayName || "",
        email: settingsMap.email || "",
        phone: settingsMap.phone || "",
        language: settingsMap.language || "ar",
        theme: serverTheme,
        notifications: {
          email: settingsMap.notificationsEmail === "true",
          sms: settingsMap.notificationsSms === "true",
          push: settingsMap.notificationsPush === "true",
          sound: settingsMap.notificationsSound === "true",
        },
        dashboard: {
          autoRefresh: settingsMap.dashboardAutoRefresh === "true",
          refreshInterval: parseInt(settingsMap.dashboardRefreshInterval || "30"),
          compactView: settingsMap.dashboardCompactView === "true",
        },
      }));
      applyTheme(serverTheme as "light" | "dark");
    }
  }, [userSettingsData, user]);

  const saveUserSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const flattenedSettings = {
        displayName: settings.displayName,
        email: settings.email,
        phone: settings.phone,
        language: settings.language,
        theme: settings.theme,
        notificationsEmail: settings.notifications.email.toString(),
        notificationsSms: settings.notifications.sms.toString(),
        notificationsPush: settings.notifications.push.toString(),
        notificationsSound: settings.notifications.sound.toString(),
        dashboardAutoRefresh: settings.dashboard.autoRefresh.toString(),
        dashboardRefreshInterval: settings.dashboard.refreshInterval.toString(),
        dashboardCompactView: settings.dashboard.compactView.toString(),
      };

      return await apiRequest("/api/settings/user", {
        method: "POST",
        body: JSON.stringify(flattenedSettings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/settings/user", user?.id],
      });
      toast({
        title: t('dashboard.profile.saveSuccess'),
        description: t('dashboard.profile.saveSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('dashboard.profile.saveError'),
        description: t('dashboard.profile.saveErrorDesc'),
        variant: "destructive",
      });
    },
  });

  const handleSaveUserSettings = () => {
    saveUserSettingsMutation.mutate(userSettings);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t('dashboard.profile.title')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.profile.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t('dashboard.profile.personalInfo')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {t('dashboard.profile.displayName')}
                </Label>
                <Input
                  id="displayName"
                  value={userSettings.displayName}
                  onChange={(e) =>
                    setUserSettings((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  data-testid="input-display-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('dashboard.profile.email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={userSettings.email}
                  onChange={(e) =>
                    setUserSettings((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  {t('dashboard.profile.phone')}
                </Label>
                <Input
                  id="phone"
                  value={userSettings.phone}
                  onChange={(e) =>
                    setUserSettings((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="+966 5X XXX XXXX"
                  data-testid="input-phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {t('dashboard.profile.preferredLanguage')}
                </Label>
                <Select
                  value={userSettings.language ?? "ar"}
                  onValueChange={(value) =>
                    setUserSettings((prev) => ({
                      ...prev,
                      language: value,
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ar">{t('dashboard.profile.arabic')}</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t('dashboard.profile.appearance')}</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {userSettings.theme === "light" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                <Label>{t('dashboard.profile.darkMode')}</Label>
              </div>
              <Switch
                checked={userSettings.theme === "dark"}
                onCheckedChange={(checked) => {
                  const newTheme = checked ? "dark" : "light";
                  setUserSettings((prev) => ({
                    ...prev,
                    theme: newTheme,
                  }));
                  applyTheme(newTheme);
                }}
                data-testid="switch-dark-mode"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <Label>{t('dashboard.profile.compactView')}</Label>
              </div>
              <Switch
                checked={userSettings.dashboard.compactView}
                onCheckedChange={(checked) =>
                  setUserSettings((prev) => ({
                    ...prev,
                    dashboard: {
                      ...prev.dashboard,
                      compactView: checked,
                    },
                  }))
                }
                data-testid="switch-compact-view"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium">{t('dashboard.profile.dashboardSettings')}</h4>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">{t('dashboard.profile.autoRefresh')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.profile.autoRefreshDesc')}
                </p>
              </div>
              <Switch
                checked={userSettings.dashboard.autoRefresh}
                onCheckedChange={(checked) =>
                  setUserSettings((prev) => ({
                    ...prev,
                    dashboard: {
                      ...prev.dashboard,
                      autoRefresh: checked,
                    },
                  }))
                }
                data-testid="switch-auto-refresh"
              />
            </div>

            {userSettings.dashboard.autoRefresh && (
              <div className="space-y-2">
                <Label htmlFor="refreshInterval">
                  {t('dashboard.profile.refreshInterval')}
                </Label>
                <Select
                  value={(
                    userSettings.dashboard.refreshInterval ?? 30
                  ).toString()}
                  onValueChange={(value) =>
                    setUserSettings((prev) => ({
                      ...prev,
                      dashboard: {
                        ...prev.dashboard,
                        refreshInterval: parseInt(value),
                      },
                    }))
                  }
                >
                  <SelectTrigger data-testid="select-refresh-interval">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">{t('dashboard.profile.seconds15')}</SelectItem>
                    <SelectItem value="30">{t('dashboard.profile.seconds30')}</SelectItem>
                    <SelectItem value="60">{t('dashboard.profile.minute1')}</SelectItem>
                    <SelectItem value="300">{t('dashboard.profile.minutes5')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveUserSettings}
              disabled={saveUserSettingsMutation.isPending}
              data-testid="button-save-profile"
            >
              {saveUserSettingsMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t('dashboard.profile.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
