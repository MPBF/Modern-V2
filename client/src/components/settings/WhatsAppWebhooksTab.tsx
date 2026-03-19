import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
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

export default function WhatsAppWebhooksTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("+966");
  const [testMessage, setTestMessage] = useState(t('whatsapp.defaultTestMessage'));

  const webhookUrls = {
    meta: `${window.location.origin}/api/notifications/webhook/meta`,
    twilio: `${window.location.origin}/api/notifications/webhook/twilio`,
  };

  const defaultVerifyToken = "mpbf_webhook_token";

  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 10000,
  });

  const notificationsList = Array.isArray(notifications) ? notifications : [];
  const recentWebhookMessages = notificationsList
    .filter((n: any) => n.type === "whatsapp" || n.channel === "whatsapp")
    .slice(0, 10);

  const sendTestMessage = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/notifications/whatsapp", {
        method: "POST",
        body: JSON.stringify({
          phone_number: testPhone,
          message: testMessage,
          title: t('whatsapp.testWebhook'),
          use_template: false,
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: t('whatsapp.toasts.messageSent'),
        description: t('whatsapp.toasts.testSentSuccess'),
      });
      refetchNotifications();
    },
    onError: (error: any) => {
      toast({
        title: t('whatsapp.toasts.sendFailed'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    toast({
      title: t('whatsapp.toasts.copied'),
      description: t('whatsapp.toasts.copiedDesc', { label }),
    });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const metaSetupSteps = [
    {
      step: 1,
      title: t('whatsapp.meta.step1Title'),
      description: t('whatsapp.meta.step1Desc'),
      link: "https://developers.facebook.com/apps",
    },
    {
      step: 2,
      title: t('whatsapp.meta.step2Title'),
      description: t('whatsapp.meta.step2Desc'),
    },
    {
      step: 3,
      title: t('whatsapp.meta.step3Title'),
      description: t('whatsapp.meta.step3Desc'),
      code: webhookUrls.meta,
    },
    {
      step: 4,
      title: t('whatsapp.meta.step4Title'),
      description: t('whatsapp.meta.step4Desc'),
      code: defaultVerifyToken,
    },
    {
      step: 5,
      title: t('whatsapp.meta.step5Title'),
      description: t('whatsapp.meta.step5Desc'),
      items: ["messages", "message_status"],
    },
    {
      step: 6,
      title: t('whatsapp.meta.step6Title'),
      description: t('whatsapp.meta.step6Desc'),
    },
  ];

  const twilioSetupSteps = [
    {
      step: 1,
      title: t('whatsapp.twilio.step1Title'),
      description: t('whatsapp.twilio.step1Desc'),
      link: "https://console.twilio.com",
    },
    {
      step: 2,
      title: t('whatsapp.twilio.step2Title'),
      description: t('whatsapp.twilio.step2Desc'),
    },
    {
      step: 3,
      title: t('whatsapp.twilio.step3Title'),
      description: t('whatsapp.twilio.step3Desc'),
    },
    {
      step: 4,
      title: t('whatsapp.twilio.step4Title'),
      description: t('whatsapp.twilio.step4Desc'),
      code: webhookUrls.twilio,
    },
    {
      step: 5,
      title: t('whatsapp.twilio.step5Title'),
      description: t('whatsapp.twilio.step5Desc'),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Webhook URLs
          </CardTitle>
          <CardDescription>
            {t('whatsapp.webhookUrlsDesc')}
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

      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="meta" data-testid="tab-meta-setup">
            {t('whatsapp.tabs.metaSetup')}
          </TabsTrigger>
          <TabsTrigger value="twilio" data-testid="tab-twilio-setup">
            {t('whatsapp.tabs.twilioSetup')}
          </TabsTrigger>
          <TabsTrigger value="test" data-testid="tab-test">
            {t('whatsapp.tabs.test')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meta">
          <Card>
            <CardHeader>
              <CardTitle>{t('whatsapp.metaSetupTitle')}</CardTitle>
              <CardDescription>
                {t('whatsapp.metaSetupDesc')}
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
                              {t('whatsapp.openLink')} <ExternalLink className="mr-1 h-3 w-3" />
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

        <TabsContent value="twilio">
          <Card>
            <CardHeader>
              <CardTitle>{t('whatsapp.twilioSetupTitle')}</CardTitle>
              <CardDescription>
                {t('whatsapp.twilioSetupDesc')}
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
                              {t('whatsapp.openLink')} <ExternalLink className="mr-1 h-3 w-3" />
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

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {t('whatsapp.testSendTitle')}
              </CardTitle>
              <CardDescription>
                {t('whatsapp.testSendDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-phone">{t('whatsapp.phoneNumber')}</Label>
                <Input
                  id="test-phone"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+966xxxxxxxxx"
                  data-testid="input-test-phone"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-message">{t('whatsapp.message')}</Label>
                <Input
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder={t('whatsapp.enterTestMessage')}
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
                    {t('whatsapp.sending')}
                  </>
                ) : (
                  <>
                    <Send className="ml-2 h-4 w-4" />
                    {t('whatsapp.sendTestMessage')}
                  </>
                )}
              </Button>

              <Alert>
                <AlertDescription>
                  {t('whatsapp.testNote')}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>{t('whatsapp.webhookLog')}</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchNotifications()}
              data-testid="button-refresh-log"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              {t('common.refresh')}
            </Button>
          </div>
          <CardDescription>
            {t('whatsapp.recentMessages', { count: recentWebhookMessages.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentWebhookMessages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('whatsapp.noWebhookMessages')}
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
                        {msg.phone_number || t('whatsapp.unknownNumber')}
                      </span>
                      {msg.status === "sent" ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          {t('notifications.statuses.sent')}
                        </Badge>
                      ) : msg.status === "delivered" ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          {t('notifications.statuses.delivered')}
                        </Badge>
                      ) : msg.status === "received" ? (
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          {t('notifications.statuses.received', 'مستلمة')}
                        </Badge>
                      ) : msg.status === "failed" ? (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                          <XCircle className="h-3 w-3 ml-1" />
                          {t('notifications.statuses.failed')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('notifications.statuses.pending')}</Badge>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(msg.created_at).toLocaleString("en-US")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                    {msg.message}
                  </p>
                  {msg.external_id && (
                    <p className="text-xs text-gray-500 font-mono">
                      Message ID: {msg.external_id}
                    </p>
                  )}
                  {msg.error_message && (
                    <p className="text-xs text-red-600 mt-1">
                      {t('whatsapp.error')}: {msg.error_message}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Settings className="h-4 w-4" />
        <AlertDescription className="text-sm">
          <strong>{t('whatsapp.importantNotes')}:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>{t('whatsapp.note1')}</li>
            <li>{t('whatsapp.note2')}</li>
            <li>{t('whatsapp.note3')}</li>
            <li>{t('whatsapp.note4')}</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
