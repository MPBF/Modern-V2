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
  AlertTriangle,
  ExternalLink,
  Send,
  Loader2,
  Settings,
  Key,
} from "lucide-react";

export default function MetaWhatsAppSetup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("+966");
  const [message, setMessage] = useState(
    "مرحباً! هذا اختبار من Meta WhatsApp API المباشر",
  );
  const [useTemplate, setUseTemplate] = useState(true);
  const [templateName, setTemplateName] = useState(
    "welcome_hxc4485f514cb7d4536026fc56250f75e7",
  );

  const testMetaAPI = useMutation({
    mutationFn: async (data: {
      phone: string;
      message: string;
      useTemplate: boolean;
      templateName?: string;
    }) => {
      const response = await apiRequest("/api/notifications/whatsapp", {
        method: "POST",
        body: JSON.stringify({
          phone_number: data.phone,
          message: data.message,
          title: t("whatsapp.metaSetup.testMetaApi"),
          use_template: data.useTemplate,
          template_name: data.templateName,
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: t("whatsapp.metaSetup.messageSentSuccess"),
        description: t("whatsapp.metaSetup.messageSentDesc"),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("whatsapp.metaSetup.sendFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const setupSteps = [
    {
      id: "business-manager",
      title: t("whatsapp.metaSetup.setupBusinessManager"),
      status: "completed",
      description: t("whatsapp.metaSetup.setupBusinessManagerDesc"),
      details: [
        t("whatsapp.metaSetup.businessAccountCreated"),
        t("whatsapp.metaSetup.whatsappAccountLinked"),
        t("whatsapp.metaSetup.businessAccountVerified"),
      ],
    },
    {
      id: "app-creation",
      title: t("whatsapp.metaSetup.createMetaApp"),
      status: "required",
      description: t("whatsapp.metaSetup.createMetaAppDesc"),
      details: [
        t("whatsapp.metaSetup.goToDevelopers"),
        t("whatsapp.metaSetup.createBusinessApp"),
        t("whatsapp.metaSetup.addWhatsappProduct"),
        t("whatsapp.metaSetup.getAppCredentials"),
      ],
    },
    {
      id: "access-token",
      title: t("whatsapp.metaSetup.createAccessToken"),
      status: "required",
      description: t("whatsapp.metaSetup.createAccessTokenDesc"),
      details: [
        t("whatsapp.metaSetup.fromAppDashboard"),
        t("whatsapp.metaSetup.createSystemUser"),
        t("whatsapp.metaSetup.linkSystemUser"),
        t("whatsapp.metaSetup.getPermanentToken"),
      ],
    },
    {
      id: "phone-number",
      title: t("whatsapp.metaSetup.setupPhoneNumber"),
      status: "required",
      description: t("whatsapp.metaSetup.setupPhoneNumberDesc"),
      details: [
        t("whatsapp.metaSetup.registerBusinessPhone"),
        t("whatsapp.metaSetup.verifyPhone"),
        t("whatsapp.metaSetup.getPhoneNumberId"),
        t("whatsapp.metaSetup.testSendingMessages"),
      ],
    },
    {
      id: "webhook",
      title: t("whatsapp.metaSetup.setupWebhook"),
      status: "required",
      description: t("whatsapp.metaSetup.setupWebhookDesc"),
      details: [
        t("whatsapp.metaSetup.useWebhookUrl"),
        t("whatsapp.metaSetup.verifyToken"),
        t("whatsapp.metaSetup.subscribeToEvents"),
        t("whatsapp.metaSetup.testEventResponse"),
      ],
    },
  ];

  const requiredSecrets = [
    {
      name: "META_ACCESS_TOKEN",
      description: t("whatsapp.metaSetup.accessTokenDesc"),
      example: "EAABsBCS1iL8BAxxxxxx...",
      required: true,
    },
    {
      name: "META_PHONE_NUMBER_ID",
      description: t("whatsapp.metaSetup.phoneNumberIdDesc"),
      example: "1234567890123456",
      required: true,
    },
    {
      name: "META_BUSINESS_ACCOUNT_ID",
      description: t("whatsapp.metaSetup.businessAccountIdDesc"),
      example: "795259496521200",
      required: false,
    },
    {
      name: "META_WEBHOOK_VERIFY_TOKEN",
      description: t("whatsapp.metaSetup.webhookVerifyTokenDesc"),
      example: "mpbf_webhook_token",
      required: false,
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "required":
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case "optional":
        return <Settings className="h-5 w-5 text-gray-400" />;
      default:
        return <Settings className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "required":
        return "bg-yellow-100 text-yellow-800";
      case "optional":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return t("whatsapp.metaSetup.completed");
      case "required":
        return t("whatsapp.metaSetup.required");
      case "optional":
        return t("whatsapp.metaSetup.optional");
      default:
        return t("whatsapp.metaSetup.optional");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("whatsapp.metaSetup.title")}
          </h1>
          <p className="text-gray-600">
            {t("whatsapp.metaSetup.description")}
          </p>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{t("whatsapp.metaSetup.importantNote")}</strong> {t("whatsapp.metaSetup.importantNoteDesc")}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">{t("whatsapp.metaSetup.setupSteps")}</h2>

            {setupSteps.map((step, index) => (
              <Card key={step.id} className="relative">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </span>
                      <span>{step.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(step.status)}
                      <Badge className={getStatusColor(step.status)}>
                        {getStatusLabel(step.status)}
                      </Badge>
                    </div>
                  </CardTitle>
                  <CardDescription>{step.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {step.details.map((detail, detailIndex) => (
                      <div
                        key={detailIndex}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="text-blue-500 mt-1">•</span>
                        <span
                          className={
                            step.status === "completed"
                              ? "text-green-700"
                              : "text-gray-700"
                          }
                        >
                          {detail}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {t("whatsapp.metaSetup.requiredVariables")}
                </CardTitle>
                <CardDescription>
                  {t("whatsapp.metaSetup.requiredVariablesDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {requiredSecrets.map((secret) => (
                  <div key={secret.name} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{secret.name}</span>
                      <Badge
                        variant={secret.required ? "destructive" : "secondary"}
                      >
                        {secret.required ? t("whatsapp.metaSetup.required") : t("whatsapp.metaSetup.optional")}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      {secret.description}
                    </p>
                    <code className="text-xs bg-gray-100 p-1 rounded block">
                      {secret.example}
                    </code>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  {t("whatsapp.metaSetup.testMetaApi")}
                </CardTitle>
                <CardDescription>
                  {t("whatsapp.metaSetup.testMetaApiDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="testPhone">{t("whatsapp.metaSetup.phoneNumber")}</Label>
                  <Input
                    id="testPhone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+966501234567"
                    dir="ltr"
                    data-testid="input-phone"
                  />
                </div>

                <div>
                  <Label htmlFor="testMessage">{t("whatsapp.metaSetup.message")}</Label>
                  <Input
                    id="testMessage"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="رسالة اختبار"
                    data-testid="input-message"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useTemplate"
                    checked={useTemplate}
                    onChange={(e) => setUseTemplate(e.target.checked)}
                    data-testid="checkbox-template"
                  />
                  <Label htmlFor="useTemplate" className="text-sm">
                    {t("whatsapp.metaSetup.useApprovedTemplate")}
                  </Label>
                </div>

                {useTemplate && (
                  <div>
                    <Label htmlFor="templateName">{t("whatsapp.metaSetup.templateName")}</Label>
                    <Input
                      id="templateName"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="welcome_hxc4485f514cb7d4536026fc56250f75e7"
                      className="font-mono text-xs"
                      data-testid="input-template-name"
                    />
                  </div>
                )}

                <Button
                  onClick={() =>
                    testMetaAPI.mutate({
                      phone: phoneNumber,
                      message,
                      useTemplate,
                      templateName: useTemplate ? templateName : undefined,
                    })
                  }
                  disabled={testMetaAPI.isPending}
                  className="w-full"
                  data-testid="button-test-meta"
                >
                  {testMetaAPI.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("whatsapp.metaSetup.sending")}
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {t("whatsapp.metaSetup.testMetaApiButton")}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="h-5 w-5" />
                  {t("whatsapp.metaSetup.usefulLinks")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    asChild
                  >
                    <a
                      href="https://developers.facebook.com/apps"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="text-right">
                        <div className="font-medium">{t("whatsapp.metaSetup.metaForDevelopers")}</div>
                        <div className="text-sm text-gray-500">
                          {t("whatsapp.metaSetup.createNewMetaApp")}
                        </div>
                      </div>
                    </a>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    asChild
                  >
                    <a
                      href="https://business.facebook.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="text-right">
                        <div className="font-medium">{t("whatsapp.metaSetup.metaBusinessManager")}</div>
                        <div className="text-sm text-gray-500">
                          {t("whatsapp.metaSetup.manageBusinessAccounts")}
                        </div>
                      </div>
                    </a>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    asChild
                  >
                    <a
                      href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="text-right">
                        <div className="font-medium">
                          {t("whatsapp.metaSetup.whatsappCloudApiGuide")}
                        </div>
                        <div className="text-sm text-gray-500">
                          {t("whatsapp.metaSetup.quickStartGuide")}
                        </div>
                      </div>
                    </a>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4"
                    asChild
                  >
                    <a
                      href="https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="text-right">
                        <div className="font-medium">{t("whatsapp.metaSetup.webhookConfiguration")}</div>
                        <div className="text-sm text-gray-500">
                          {t("whatsapp.metaSetup.setupWebhooks")}
                        </div>
                      </div>
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("whatsapp.metaSetup.directApiBenefits")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">{t("whatsapp.metaSetup.lowerCost")}</h4>
                  <p className="text-sm text-gray-600">
                    {t("whatsapp.metaSetup.lowerCostDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">{t("whatsapp.metaSetup.fullControl")}</h4>
                  <p className="text-sm text-gray-600">
                    {t("whatsapp.metaSetup.fullControlDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">{t("whatsapp.metaSetup.advancedFeatures")}</h4>
                  <p className="text-sm text-gray-600">
                    {t("whatsapp.metaSetup.advancedFeaturesDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">{t("whatsapp.metaSetup.higherStability")}</h4>
                  <p className="text-sm text-gray-600">
                    {t("whatsapp.metaSetup.higherStabilityDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">{t("whatsapp.metaSetup.instantUpdates")}</h4>
                  <p className="text-sm text-gray-600">
                    {t("whatsapp.metaSetup.instantUpdatesDesc")}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                <div>
                  <h4 className="font-medium">{t("whatsapp.metaSetup.betterSupport")}</h4>
                  <p className="text-sm text-gray-600">{t("whatsapp.metaSetup.betterSupportDesc")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
