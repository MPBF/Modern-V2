import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  CheckCircle,
  XCircle,
  Copy,
  ExternalLink,
  Webhook,
  Settings,
  Code,
  Activity,
  RefreshCw,
  Send,
  Loader2,
} from "lucide-react";
import PageLayout from "../components/layout/PageLayout";

export default function WhatsAppWebhooks() {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("+966");
  const [testMessage, setTestMessage] = useState("مرحباً! اختبار webhook");

  const webhookUrls = {
    meta: `${window.location.origin}/api/notifications/webhook/meta`,
    twilio: `${window.location.origin}/api/notifications/webhook/twilio`,
  };

  const defaultVerifyToken = "mpbf_webhook_token";

  // استعلام الإشعارات لعرض سجل webhook
  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const notificationsList = Array.isArray(notifications) ? notifications : [];
  const recentWebhookMessages = notificationsList
    .filter((n: any) => n.type === "whatsapp")
    .slice(0, 10);

  // اختبار إرسال رسالة
  const sendTestMessage = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/notifications/whatsapp", {
        method: "POST",
        body: JSON.stringify({
          phone_number: testPhone,
          message: testMessage,
          title: "اختبار Webhook",
          use_template: false,
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "تم إرسال الرسالة",
        description: "تم إرسال رسالة اختبار بنجاح",
      });
      refetchNotifications();
    },
    onError: (error: any) => {
      toast({
        title: "فشل الإرسال",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    toast({
      title: "تم النسخ",
      description: `تم نسخ ${label} إلى الحافظة`,
    });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const metaSetupSteps = [
    {
      step: 1,
      title: "انتقل إلى Meta App Dashboard",
      description: "اذهب إلى developers.facebook.com واختر تطبيقك",
      link: "https://developers.facebook.com/apps",
    },
    {
      step: 2,
      title: "اختر WhatsApp → Configuration",
      description: "من القائمة الجانبية، اختر WhatsApp ثم Configuration",
    },
    {
      step: 3,
      title: "أضف Webhook URL",
      description: "في قسم Webhooks، أضف الـ URL التالي:",
      code: webhookUrls.meta,
    },
    {
      step: 4,
      title: "أضف Verify Token",
      description: "استخدم الـ token التالي:",
      code: defaultVerifyToken,
    },
    {
      step: 5,
      title: "اشترك في Events",
      description: "اختر الـ events التي تريد استقبالها:",
      items: ["messages", "message_status"],
    },
    {
      step: 6,
      title: "تحقق من الـ Webhook",
      description: 'اضغط على "Verify and Save" للتحقق من الـ webhook',
    },
  ];

  const twilioSetupSteps = [
    {
      step: 1,
      title: "انتقل إلى Twilio Console",
      description: "اذهب إلى console.twilio.com",
      link: "https://console.twilio.com",
    },
    {
      step: 2,
      title: "اختر Messaging → WhatsApp Senders",
      description: "من القائمة، اختر Messaging ثم WhatsApp senders",
    },
    {
      step: 3,
      title: "اختر رقم WhatsApp",
      description: "اضغط على رقم WhatsApp الخاص بك",
    },
    {
      step: 4,
      title: "أضف Status Callback URL",
      description: "في قسم Webhooks، أضف الـ URL التالي:",
      code: webhookUrls.twilio,
    },
    {
      step: 5,
      title: "احفظ التغييرات",
      description: 'اضغط على "Save" لحفظ إعدادات الـ webhook',
    },
  ];

  return (
    <PageLayout title="إدارة WhatsApp Webhooks" description="تكوين واختبار webhooks للواتساب">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Webhook URLs */}
        <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Webhook URLs
                </CardTitle>
                <CardDescription>
                  استخدم هذه الـ URLs لتكوين webhooks في Meta و Twilio
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Meta WhatsApp Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrls.meta}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-meta-webhook-url"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(webhookUrls.meta, "Meta URL")}
                      data-testid="button-copy-meta-url"
                    >
                      {copiedUrl === "Meta URL" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Twilio Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={webhookUrls.twilio}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-twilio-webhook-url"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(webhookUrls.twilio, "Twilio URL")
                      }
                      data-testid="button-copy-twilio-url"
                    >
                      {copiedUrl === "Twilio URL" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Verify Token (Meta)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={defaultVerifyToken}
                      readOnly
                      className="font-mono text-sm"
                      data-testid="input-verify-token"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(defaultVerifyToken, "Verify Token")
                      }
                      data-testid="button-copy-verify-token"
                    >
                      {copiedUrl === "Verify Token" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Setup Tabs */}
            <Tabs defaultValue="meta" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="meta" data-testid="tab-meta-setup">
                  تكوين Meta
                </TabsTrigger>
                <TabsTrigger value="twilio" data-testid="tab-twilio-setup">
                  تكوين Twilio
                </TabsTrigger>
                <TabsTrigger value="test" data-testid="tab-test">
                  اختبار
                </TabsTrigger>
              </TabsList>

              {/* Meta Setup */}
              <TabsContent value="meta">
                <Card>
                  <CardHeader>
                    <CardTitle>خطوات تكوين Meta WhatsApp Webhook</CardTitle>
                    <CardDescription>
                      اتبع هذه الخطوات لتكوين webhook في Meta
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {metaSetupSteps.map((step) => (
                        <div
                          key={step.step}
                          className="border rounded-lg p-4 dark:border-gray-700"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                              {step.step}
                            </div>
                            <div className="flex-1 space-y-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {step.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {step.description}
                              </p>
                              {step.link && (
                                <Button
                                  variant="link"
                                  className="p-0 h-auto"
                                  asChild
                                >
                                  <a
                                    href={step.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    افتح الرابط <ExternalLink className="mr-1 h-3 w-3" />
                                  </a>
                                </Button>
                              )}
                              {step.code && (
                                <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-sm flex items-center justify-between">
                                  <code className="text-blue-600 dark:text-blue-400">
                                    {step.code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      copyToClipboard(step.code!, step.title)
                                    }
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                              {step.items && (
                                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                                  {step.items.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Twilio Setup */}
              <TabsContent value="twilio">
                <Card>
                  <CardHeader>
                    <CardTitle>خطوات تكوين Twilio Webhook</CardTitle>
                    <CardDescription>
                      اتبع هذه الخطوات لتكوين webhook في Twilio
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {twilioSetupSteps.map((step) => (
                        <div
                          key={step.step}
                          className="border rounded-lg p-4 dark:border-gray-700"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                              {step.step}
                            </div>
                            <div className="flex-1 space-y-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {step.title}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {step.description}
                              </p>
                              {step.link && (
                                <Button
                                  variant="link"
                                  className="p-0 h-auto"
                                  asChild
                                >
                                  <a
                                    href={step.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    افتح الرابط <ExternalLink className="mr-1 h-3 w-3" />
                                  </a>
                                </Button>
                              )}
                              {step.code && (
                                <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 font-mono text-sm flex items-center justify-between">
                                  <code className="text-green-600 dark:text-green-400">
                                    {step.code}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      copyToClipboard(step.code!, step.title)
                                    }
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Test Tab */}
              <TabsContent value="test">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Send className="h-5 w-5" />
                      اختبار إرسال رسالة
                    </CardTitle>
                    <CardDescription>
                      أرسل رسالة اختبار للتحقق من عمل webhook
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="test-phone">رقم الهاتف</Label>
                      <Input
                        id="test-phone"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+966xxxxxxxxx"
                        data-testid="input-test-phone"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="test-message">الرسالة</Label>
                      <Input
                        id="test-message"
                        value={testMessage}
                        onChange={(e) => setTestMessage(e.target.value)}
                        placeholder="أدخل رسالة الاختبار"
                        data-testid="input-test-message"
                      />
                    </div>

                    <Button
                      onClick={() => sendTestMessage.mutate()}
                      disabled={sendTestMessage.isPending}
                      className="w-full"
                      data-testid="button-send-test"
                    >
                      {sendTestMessage.isPending ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          جاري الإرسال...
                        </>
                      ) : (
                        <>
                          <Send className="ml-2 h-4 w-4" />
                          إرسال رسالة اختبار
                        </>
                      )}
                    </Button>

                    <Alert>
                      <AlertDescription>
                        💡 بعد إرسال الرسالة، تحقق من قسم سجل الـ Webhooks أدناه
                        لرؤية التحديثات
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Webhook Log */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    <CardTitle>سجل Webhook Messages</CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchNotifications()}
                    data-testid="button-refresh-log"
                  >
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث
                  </Button>
                </div>
                <CardDescription>
                  آخر {recentWebhookMessages.length} رسالة واتساب
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentWebhookMessages.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد رسائل webhook حتى الآن
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentWebhookMessages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className="border rounded-lg p-3 dark:border-gray-700"
                        data-testid={`webhook-message-${msg.id}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {msg.phone_number || "رقم غير محدد"}
                            </span>
                            {msg.status === "sent" ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                                <CheckCircle className="h-3 w-3 ml-1" />
                                {msg.status}
                              </Badge>
                            ) : msg.status === "failed" ? (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                                <XCircle className="h-3 w-3 ml-1" />
                                {msg.status}
                              </Badge>
                            ) : (
                              <Badge variant="outline">{msg.status}</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.created_at).toLocaleString("en-US")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                          {msg.message}
                        </p>
                        {msg.twilio_sid && (
                          <p className="text-xs text-gray-500 font-mono">
                            Message ID: {msg.twilio_sid}
                          </p>
                        )}
                        {msg.error_message && (
                          <p className="text-xs text-red-600 mt-1">
                            خطأ: {msg.error_message}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Important Notes */}
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-medium">ملاحظات هامة:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>
                    تأكد من أن الـ webhook URLs متاحة للوصول من الإنترنت (لا تعمل
                    على localhost)
                  </li>
                  <li>
                    يجب أن يكون لديك HTTPS للـ webhooks في الإنتاج (Replit توفر
                    ذلك تلقائياً)
                  </li>
                  <li>
                    Meta تتحقق من الـ webhook باستخدام GET request قبل حفظه
                  </li>
                  <li>Twilio يرسل تحديثات حالة الرسائل إلى webhook</li>
                </ul>
              </AlertDescription>
            </Alert>
      </div>
    </PageLayout>
  );
}
