import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert } from "../ui/alert";
import { Switch } from "../ui/switch";
import {
  Bell,
  MessageSquare,
  Send,
  TestTube,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Settings,
  Users,
  AlertCircle,
  Zap,
  Loader2,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useSSE, type SSENotification } from "../../hooks/use-sse";

interface Notification {
  id: number;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  type: string;
  priority: string;
  status: string;
  phone_number?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  twilio_sid?: string;
  error_message?: string;
  context_type?: string;
  context_id?: string;
}

export default function NotificationCenter() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");

  // System notification form states
  const [systemTitle, setSystemTitle] = useState("");
  const [systemMessage, setSystemMessage] = useState("");
  const [systemType, setSystemType] = useState<
    "system" | "order" | "production" | "maintenance" | "quality" | "hr"
  >("system");
  const [systemPriority, setSystemPriority] = useState<
    "low" | "normal" | "high" | "urgent"
  >("normal");
  const [recipientType, setRecipientType] = useState<"user" | "role" | "all">(
    "all",
  );
  const [recipientId, setRecipientId] = useState("");
  const [notificationSound, setNotificationSound] = useState(false);

  // Real-time notifications state
  const [realtimeNotifications, setRealtimeNotifications] = useState<
    SSENotification[]
  >([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Fetch initial notifications (for WhatsApp history)
  const { data: whatsappNotifications, isLoading: whatsappLoading } = useQuery<
    Notification[]
  >({
    queryKey: ["/api/notifications"],
  });

  // Fetch user notifications with real-time support
  const {
    data: userNotificationsData,
    isLoading: userNotificationsLoading,
    refetch: refetchUserNotifications,
  } = useQuery({
    queryKey: ["/api/notifications/user", { unread_only: showUnreadOnly }],
    queryFn: async () => {
      const response = await fetch(
        `/api/notifications/user?unread_only=${showUnreadOnly}&limit=100`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch user notifications");
      }
      return response.json() as Promise<{
        notifications: Notification[];
        unread_count: number;
      }>;
    },
  });

  // SSE event handlers
  const handleNewNotification = useCallback(
    (notification: SSENotification) => {
      // Filter out system notifications
      if (notification.type === "system") {
        return;
      }
      
      // Add to realtime notifications
      setRealtimeNotifications((prev) => [notification, ...prev]);

      // Show toast for new notification
      toast({
        title:
          notification.icon +
          " " +
          (notification.title_ar || notification.title),
        description: notification.message_ar || notification.message,
        duration:
          notification.priority === "urgent"
            ? 10000
            : notification.priority === "high"
              ? 7000
              : 5000,
      });

      // Invalidate query to automatically refetch - more efficient than manual refetch
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
    },
    [toast, queryClient],
  );

  const handleRecentNotifications = useCallback(
    (data: { notifications: SSENotification[]; count: number }) => {
      // Filter out system notifications
      const filteredNotifications = data.notifications.filter(
        n => n.type !== "system"
      );
      setRealtimeNotifications(filteredNotifications);
      console.log(
        `[NotificationCenter] Received ${filteredNotifications.length} non-system notifications`,
      );
    },
    [],
  );

  const handleSSEConnected = useCallback(() => {
    console.log("[NotificationCenter] SSE connected successfully");
  }, []);

  const handleSSEError = useCallback((error: Event) => {
    console.error("[NotificationCenter] SSE connection error:", error);
  }, []);

  // Memoize event handlers object to prevent infinite re-renders
  const sseEventHandlers = useMemo(
    () => ({
      onNotification: handleNewNotification,
      onRecentNotifications: handleRecentNotifications,
      onConnected: handleSSEConnected,
      onError: handleSSEError,
    }),
    [
      handleNewNotification,
      handleRecentNotifications,
      handleSSEConnected,
      handleSSEError,
    ],
  );

  // Initialize SSE connection
  const { connectionState, reconnect } = useSSE(sseEventHandlers);

  // Create system notification mutation
  const createSystemNotificationMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type: string;
      priority: string;
      recipient_type: string;
      recipient_id?: string;
      sound?: boolean;
    }) => {
      return await apiRequest("/api/notifications/system", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: t('notifications.toasts.notificationSent'),
        description: t('notifications.toasts.systemNotificationSuccess'),
      });
      setSystemTitle("");
      setSystemMessage("");
      setRecipientId("");
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
    },
    onError: (error: any) => {
      toast({
        title: t('notifications.toasts.sendError'),
        description: error.message || t('notifications.toasts.systemNotificationFailed'),
        variant: "destructive",
      });
    },
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(
        `/api/notifications/mark-read/${notificationId}`,
        {
          method: "PATCH",
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('notifications.toasts.markReadFailed'),
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/notifications/mark-all-read", {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
      setRealtimeNotifications([]);
      toast({
        title: t('notifications.toasts.updated'),
        description: t('notifications.toasts.allMarkedRead'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('notifications.toasts.markAllReadFailed'),
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/delete/${notificationId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: t('notifications.toasts.deleted'),
        description: t('notifications.toasts.notificationDeleted'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('notifications.toasts.deleteError'),
        description: error.message || t('notifications.toasts.deleteFailed'),
        variant: "destructive",
      });
    },
  });

  // Send WhatsApp message mutation
  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: {
      phone_number: string;
      message: string;
      title?: string;
      priority?: string;
    }) => {
      return await apiRequest("/api/notifications/whatsapp", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: t('notifications.toasts.messageSent'),
        description: t('notifications.toasts.whatsappSentSuccess'),
      });
      setMessage("");
      setTitle("");
      setPhoneNumber("");
    },
    onError: (error: any) => {
      toast({
        title: t('notifications.toasts.sendError'),
        description: error.message || t('notifications.toasts.whatsappSendFailed'),
        variant: "destructive",
      });
    },
  });

  // Send test message mutation
  const sendTestMutation = useMutation({
    mutationFn: async (phone_number: string) => {
      return await apiRequest("/api/notifications/test", {
        method: "POST",
        body: JSON.stringify({ phone_number }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: t('notifications.toasts.testMessage'),
        description: t('notifications.toasts.testSentSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('notifications.toasts.testError'),
        description: error.message || t('notifications.toasts.testSendFailed'),
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleSendMessage = () => {
    if (!phoneNumber || !message) {
      toast({
        title: t('notifications.toasts.missingData'),
        description: t('notifications.toasts.enterPhoneAndMessage'),
        variant: "destructive",
      });
      return;
    }

    sendWhatsAppMutation.mutate({
      phone_number: phoneNumber,
      message,
      title,
      priority,
    });
  };

  const handleSendSystemNotification = () => {
    if (!systemTitle || !systemMessage) {
      toast({
        title: t('notifications.toasts.missingData'),
        description: t('notifications.toasts.enterTitleAndMessage'),
        variant: "destructive",
      });
      return;
    }

    if (recipientType !== "all" && !recipientId) {
      toast({
        title: t('notifications.toasts.recipientRequired'),
        description: t('notifications.toasts.enterUserOrRoleId'),
        variant: "destructive",
      });
      return;
    }

    createSystemNotificationMutation.mutate({
      title: systemTitle,
      message: systemMessage,
      type: systemType,
      priority: systemPriority,
      recipient_type: recipientType,
      recipient_id: recipientType === "all" ? undefined : recipientId,
      sound: notificationSound,
    });
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDeleteNotification = (notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleReconnectSSE = () => {
    reconnect();
  };

  // Effect to update filter when showUnreadOnly changes
  useEffect(() => {
    refetchUserNotifications();
  }, [showUnreadOnly, refetchUserNotifications]);

  const handleSendTest = () => {
    if (!phoneNumber) {
      toast({
        title: t('notifications.toasts.phoneRequired'),
        description: t('notifications.toasts.enterPhoneForTest'),
        variant: "destructive",
      });
      return;
    }

    sendTestMutation.mutate(phoneNumber);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="h-4 w-4 text-blue-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "received":
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case "read":
        return <Eye className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "received":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "read":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "normal":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('notifications.center')}
        </h1>
      </div>

      {/* SSE Connection Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectionState.isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : connectionState.isConnecting ? (
                <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {connectionState.isConnected
                  ? t('notifications.connected')
                  : connectionState.isConnecting
                    ? t('notifications.connecting')
                    : t('notifications.disconnected')}
              </span>
            </div>
            {connectionState.error && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">
                  {connectionState.error}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReconnectSSE}
                >
                  {t('notifications.reconnect')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="realtime" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="realtime"
            className="flex items-center gap-2"
            data-testid="tab-realtime"
          >
            <Bell className="h-4 w-4" />
            {t('notifications.tabs.realtime')}
          </TabsTrigger>
          <TabsTrigger
            value="send"
            className="flex items-center gap-2"
            data-testid="tab-send"
          >
            <MessageSquare className="h-4 w-4" />
            {t('notifications.tabs.sendMessages')}
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="flex items-center gap-2"
            data-testid="tab-system"
          >
            <Settings className="h-4 w-4" />
            {t('notifications.tabs.system')}
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center gap-2"
            data-testid="tab-history"
          >
            <Clock className="h-4 w-4" />
            {t('notifications.tabs.history')}
          </TabsTrigger>
        </TabsList>

        {/* Real-time Notifications Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  {t('notifications.tabs.realtime')}
                  {userNotificationsData?.unread_count &&
                    userNotificationsData.unread_count > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {userNotificationsData.unread_count}
                      </Badge>
                    )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showUnreadOnly}
                      onCheckedChange={setShowUnreadOnly}
                      data-testid="switch-unread-only"
                    />
                    <span className="text-sm text-gray-600">
                      {t('notifications.unreadOnly')}
                    </span>
                  </div>
                  {(userNotificationsData?.unread_count || 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMarkAllAsRead}
                      disabled={markAllAsReadMutation.isPending}
                      data-testid="button-mark-all-read"
                    >
                      {markAllAsReadMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin ml-1" />
                      )}
                      {t('notifications.markAllRead')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {userNotificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2">{t('notifications.loadingNotifications')}</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {userNotificationsData?.notifications &&
                  userNotificationsData.notifications.filter(n => n.type !== "system").length > 0 ? (
                    userNotificationsData.notifications
                      .filter(n => n.type !== "system")
                      .map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border rounded-lg transition-all ${
                          !notification.read_at
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {notification.title_ar || notification.title}
                              </span>
                              <Badge
                                className={getPriorityColor(
                                  notification.priority,
                                )}
                              >
                                {notification.priority}
                              </Badge>
                              <Badge
                                className={getStatusColor(notification.status)}
                              >
                                {getStatusIcon(notification.status)}
                                {notification.status}
                              </Badge>
                              {!notification.read_at && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800"
                                >
                                  {t('notifications.new')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                              {notification.message_ar || notification.message}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>{t('notifications.type')}: {notification.type}</span>
                              <span>
                                {t('notifications.date')}:{" "}
                                {new Date(
                                  notification.created_at,
                                ).toLocaleString("en-US")}
                              </span>
                              {notification.context_type && (
                                <span>{t('notifications.context')}: {notification.context_type}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.read_at && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleMarkAsRead(notification.id)
                                }
                                disabled={markAsReadMutation.isPending}
                                data-testid={`button-mark-read-${notification.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() =>
                                handleDeleteNotification(notification.id)
                              }
                              disabled={deleteNotificationMutation.isPending}
                              data-testid={`button-delete-${notification.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>{t('notifications.noNotifications')}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Notifications Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                {t('notifications.createSystemNotification')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('notifications.notificationTitle')} *</label>
                  <Input
                    placeholder={t('notifications.notificationTitle')}
                    value={systemTitle}
                    onChange={(e) => setSystemTitle(e.target.value)}
                    data-testid="input-system-title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('notifications.notificationType')}</label>
                  <Select
                    value={systemType ?? ""}
                    onValueChange={(value: any) => setSystemType(value)}
                  >
                    <SelectTrigger data-testid="select-system-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">{t('notifications.types.system')}</SelectItem>
                      <SelectItem value="order">{t('notifications.types.order')}</SelectItem>
                      <SelectItem value="production">{t('notifications.types.production')}</SelectItem>
                      <SelectItem value="maintenance">{t('notifications.types.maintenance')}</SelectItem>
                      <SelectItem value="quality">{t('notifications.types.quality')}</SelectItem>
                      <SelectItem value="hr">{t('notifications.types.hr')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('notifications.notificationContent')} *</label>
                <Textarea
                  placeholder={t('notifications.writeContentPlaceholder')}
                  value={systemMessage}
                  onChange={(e) => setSystemMessage(e.target.value)}
                  rows={3}
                  data-testid="textarea-system-message"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('notifications.priority')}</label>
                  <Select
                    value={systemPriority ?? ""}
                    onValueChange={(value: any) => setSystemPriority(value)}
                  >
                    <SelectTrigger data-testid="select-system-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t('notifications.priorities.low')}</SelectItem>
                      <SelectItem value="normal">{t('notifications.priorities.normal')}</SelectItem>
                      <SelectItem value="high">{t('notifications.priorities.high')}</SelectItem>
                      <SelectItem value="urgent">{t('notifications.priorities.urgent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('notifications.recipient')}</label>
                  <Select
                    value={recipientType ?? ""}
                    onValueChange={(value: any) => setRecipientType(value)}
                  >
                    <SelectTrigger data-testid="select-recipient-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('notifications.recipientTypes.all')}</SelectItem>
                      <SelectItem value="user">{t('notifications.recipientTypes.user')}</SelectItem>
                      <SelectItem value="role">{t('notifications.recipientTypes.role')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recipientType !== "all" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('notifications.recipientId')}</label>
                    <Input
                      placeholder={
                        recipientType === "user"
                          ? t('notifications.userId')
                          : t('notifications.roleId')
                      }
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      type="number"
                      data-testid="input-recipient-id"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={notificationSound}
                  onCheckedChange={setNotificationSound}
                  data-testid="switch-notification-sound"
                />
                <label className="text-sm">{t('notifications.playSound')}</label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSendSystemNotification}
                  disabled={createSystemNotificationMutation.isPending}
                  className="flex-1"
                  data-testid="button-send-system-notification"
                >
                  {createSystemNotificationMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin ml-1" />
                  )}
                  <Send className="h-4 w-4 ml-1" />
                  {t('notifications.sendNotification')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                {t('notifications.sendWhatsapp')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('notifications.phoneNumber')} *</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+966501234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1"
                      dir="ltr"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendTest}
                      disabled={sendTestMutation.isPending}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    {t('notifications.phoneExample')}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('notifications.messageTitle')}</label>
                  <Input
                    placeholder={t('notifications.notificationTitle')}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('notifications.messageContent')} *</label>
                <Textarea
                  placeholder={t('notifications.writeMessagePlaceholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('notifications.priority')}</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="low">{t('notifications.priorities.low')}</option>
                  <option value="normal">{t('notifications.priorities.normal')}</option>
                  <option value="high">{t('notifications.priorities.high')}</option>
                  <option value="urgent">{t('notifications.priorities.urgent')}</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={sendWhatsAppMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendWhatsAppMutation.isPending
                    ? t('notifications.sending')
                    : t('notifications.sendMessage')}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSendTest}
                  disabled={sendTestMutation.isPending || !phoneNumber}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  {t('notifications.testMessage')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('notifications.tabs.history')}</CardTitle>
            </CardHeader>
            <CardContent>
              {whatsappLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">{t('notifications.loadingNotifications')}</p>
                </div>
              ) : whatsappNotifications && whatsappNotifications.length > 0 ? (
                <div className="space-y-3">
                  {whatsappNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border rounded-lg p-4 space-y-3 ${notification.context_type === "incoming_message" ? "border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20" : "border-gray-200 dark:border-gray-700"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {notification.context_type === "incoming_message" ? (
                              <MessageSquare className="h-4 w-4 text-purple-500" />
                            ) : (
                              getStatusIcon(notification.status)
                            )}
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {notification.title_ar || notification.title}
                            </h3>
                            {notification.context_type === "incoming_message" && (
                              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                واردة
                              </Badge>
                            )}
                            <Badge
                              className={getStatusColor(notification.status)}
                            >
                              {notification.status === "sent"
                                ? t('notifications.statuses.sent')
                                : notification.status === "delivered"
                                  ? t('notifications.statuses.delivered')
                                  : notification.status === "failed"
                                    ? t('notifications.statuses.failed')
                                    : notification.status === "received"
                                      ? t('notifications.statuses.received', 'مستلمة')
                                      : notification.status === "read"
                                        ? t('notifications.statuses.read', 'مقروءة')
                                        : t('notifications.statuses.pending')}
                            </Badge>
                            <Badge
                              className={getPriorityColor(
                                notification.priority,
                              )}
                            >
                              {notification.priority === "urgent"
                                ? t('notifications.priorities.urgent')
                                : notification.priority === "high"
                                  ? t('notifications.priorities.high')
                                  : notification.priority === "low"
                                    ? t('notifications.priorities.low')
                                    : t('notifications.priorities.normal')}
                            </Badge>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">
                            {notification.message_ar || notification.message}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {notification.phone_number && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {notification.phone_number}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(notification.created_at).toLocaleString(
                                "ar",
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {notification.error_message && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                          <p className="text-red-700 dark:text-red-300 text-sm">
                            {t('common.error')}: {notification.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {t('notifications.noNotificationsYet')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
