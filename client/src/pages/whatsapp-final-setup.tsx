import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  CheckCircle,
  Send,
  Loader2,
  MessageSquare,
  Zap,
  Settings,
} from "lucide-react";

export default function WhatsAppFinalSetup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("+966");
  const [message, setMessage] = useState(
    "مرحباً! هذه رسالة اختبار من نظام MPBF",
  );
  const [useTemplate, setUseTemplate] = useState(true);

  const testMessage = useMutation({
    mutationFn: async (data: {
      phone: string;
      message: string;
      useTemplate: boolean;
    }) => {
      const response = await apiRequest("/api/notifications/whatsapp", {
        method: "POST",
        body: JSON.stringify({
          phone_number: data.phone,
          message: data.message,
          title: t("whatsapp.finalSetup.finalTest"),
          use_template: data.useTemplate,
          template_name: data.useTemplate
            ? "welcome_hxc4485f514cb7d4536026fc56250f75e7"
            : undefined,
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: t("whatsapp.finalSetup.messageSentSuccess"),
        description: t("whatsapp.finalSetup.messageSentDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("whatsapp.finalSetup.sendFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const features = [
    {
      icon: <MessageSquare className="h-5 w-5" />,
      title: t("whatsapp.finalSetup.sendMessages"),
      description: t("whatsapp.finalSetup.sendMessagesDesc"),
      status: "active",
    },
    {
      icon: <CheckCircle className="h-5 w-5" />,
      title: t("whatsapp.finalSetup.approvedTemplates"),
      description: t("whatsapp.finalSetup.approvedTemplatesDesc"),
      status: "active",
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: t("whatsapp.finalSetup.instantNotifications"),
      description: t("whatsapp.finalSetup.instantNotificationsDesc"),
      status: "active",
    },
    {
      icon: <Settings className="h-5 w-5" />,
      title: t("whatsapp.finalSetup.statusUpdates"),
      description: t("whatsapp.finalSetup.statusUpdatesDesc"),
      status: "active",
    },
  ];

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4"
      dir="rtl"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-12 w-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900">
            {t("whatsapp.finalSetup.title")}
          </h1>
          <p className="text-xl text-gray-600">
            {t("whatsapp.finalSetup.description")}
          </p>
        </div>

        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            <strong>{t("whatsapp.finalSetup.setupComplete")}</strong> {t("whatsapp.finalSetup.setupCompleteDesc")}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t("whatsapp.finalSetup.systemStatus")}
              </CardTitle>
              <CardDescription>{t("whatsapp.finalSetup.systemStatusDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">{t("whatsapp.finalSetup.twilioCredentials")}</span>
                <Badge className="bg-green-100 text-green-800">{t("whatsapp.finalSetup.connected")}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">{t("whatsapp.finalSetup.contentTemplate")}</span>
                <Badge className="bg-green-100 text-green-800">{t("whatsapp.finalSetup.configured")}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">{t("whatsapp.finalSetup.metaTemplate")}</span>
                <Badge className="bg-green-100 text-green-800">{t("whatsapp.finalSetup.approved")}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">{t("whatsapp.finalSetup.webhook")}</span>
                <Badge className="bg-green-100 text-green-800">{t("whatsapp.finalSetup.active")}</Badge>
              </div>

              <div className="flex items-center justify-between font-medium pt-2 border-t">
                <span>{t("whatsapp.finalSetup.overallStatus")}</span>
                <Badge className="bg-green-600 text-white">{t("whatsapp.finalSetup.readyForProduction")}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                {t("whatsapp.finalSetup.finalTest")}
              </CardTitle>
              <CardDescription>
                {t("whatsapp.finalSetup.finalTestDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="finalTestPhone">{t("whatsapp.finalSetup.phoneNumber")}</Label>
                <Input
                  id="finalTestPhone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+966501234567"
                  dir="ltr"
                  data-testid="input-final-phone"
                />
              </div>

              <div>
                <Label htmlFor="finalTestMessage">{t("whatsapp.finalSetup.message")}</Label>
                <Input
                  id="finalTestMessage"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  data-testid="input-final-message"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="finalUseTemplate"
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  data-testid="checkbox-final-template"
                />
                <Label htmlFor="finalUseTemplate" className="text-sm">
                  {t("whatsapp.finalSetup.useContentTemplate")}
                </Label>
              </div>

              <Button
                onClick={() =>
                  testMessage.mutate({
                    phone: phoneNumber,
                    message,
                    useTemplate,
                  })
                }
                disabled={testMessage.isPending}
                className="w-full bg-green-600 hover:bg-green-700"
                data-testid="button-final-test"
              >
                {testMessage.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("whatsapp.finalSetup.sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t("whatsapp.finalSetup.sendTestMessage")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("whatsapp.finalSetup.availableFeatures")}</CardTitle>
            <CardDescription>
              {t("whatsapp.finalSetup.availableFeaturesDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 border rounded-lg bg-white"
                >
                  <div className="text-green-600">{feature.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">
                      {feature.title}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {feature.description}
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800">{t("whatsapp.finalSetup.active")}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-800">{t("whatsapp.finalSetup.technicalDetails")}</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>
                Twilio Account SID: ACe4ba2fd2e98be5b019c354539404cc29
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>WhatsApp Number: +15557911537</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>
                Content Template SID: HXc4485f514cb7d4536026fc56250f75e7
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>
                Meta Template: welcome_hxc4485f514cb7d4536026fc56250f75e7
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>Business Account ID: 795259496521200</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("whatsapp.finalSetup.nextSteps")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  1
                </span>
                <div>
                  <h4 className="font-medium">{t("whatsapp.finalSetup.useInProduction")}</h4>
                  <p className="text-sm text-gray-600">
                    {t("whatsapp.finalSetup.useInProductionDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  2
                </span>
                <div>
                  <h4 className="font-medium">{t("whatsapp.finalSetup.monitorPerformance")}</h4>
                  <p className="text-sm text-gray-600">
                    {t("whatsapp.finalSetup.monitorPerformanceDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  3
                </span>
                <div>
                  <h4 className="font-medium">{t("whatsapp.finalSetup.addNewTemplates")}</h4>
                  <p className="text-sm text-gray-600">
                    {t("whatsapp.finalSetup.addNewTemplatesDesc")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
