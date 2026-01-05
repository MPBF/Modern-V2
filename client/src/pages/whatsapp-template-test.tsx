import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import { apiRequest, queryClient } from "../lib/queryClient";
import {
  Send,
  MessageSquare,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function WhatsAppTemplateTest() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phoneNumber, setPhoneNumber] = useState("+966");
  const [selectedTemplate, setSelectedTemplate] = useState(
    "welcome_hxc4485f514cb7d4536026fc56250f75e7",
  );
  const [templateVariables, setTemplateVariables] = useState([
    "مرحباً من نظام MPBF",
  ]);
  const [useTemplate, setUseTemplate] = useState(true);
  const [testResults, setTestResults] = useState<any[]>([]);

  const approvedTemplates = [
    {
      id: "welcome_hxc4485f514cb7d4536026fc56250f75e7",
      name: "Welcome Template",
      language: "Arabic",
      description: t("whatsapp.template.welcomeTemplateDesc"),
      variables: ["{{1}}"],
      example: "مرحباً، {{1}}",
    },
  ];

  const { data: notifications, refetch: refetchNotifications } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: false,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    return () => {
      queryClient.cancelQueries({ queryKey: ["/api/notifications"] });
    };
  }, [queryClient]);

  const notificationsList = Array.isArray(notifications) ? notifications : [];

  const sendTemplateMessage = useMutation({
    mutationFn: async (data: {
      phone: string;
      template: string;
      variables: string[];
      useTemplate: boolean;
    }) => {
      const response = await apiRequest("/api/notifications/whatsapp", {
        method: "POST",
        body: JSON.stringify({
          phone_number: data.phone,
          message: data.variables[0] || "رسالة اختبار",
          title: t("whatsapp.template.sendWithApprovedTemplate"),
          template_name: data.template,
          variables: data.variables,
          use_template: data.useTemplate,
        }),
      });
      return response;
    },
    onSuccess: (data: any) => {
      toast({
        title: t("whatsapp.template.messageSentSuccess"),
        description: t("whatsapp.template.messageSentTo", { phone: phoneNumber }),
      });

      setTestResults((prev) => [
        {
          timestamp: new Date(),
          phone: phoneNumber,
          template: selectedTemplate,
          variables: templateVariables,
          status: "sent",
          messageId: data?.messageId || "unknown",
          success: true,
          useTemplate,
        },
        ...prev,
      ]);

      refetchNotifications();
    },
    onError: (error: any) => {
      toast({
        title: t("whatsapp.template.sendFailed"),
        description: error.message || t("whatsapp.template.sendError"),
        variant: "destructive",
      });

      setTestResults((prev) => [
        {
          timestamp: new Date(),
          phone: phoneNumber,
          template: selectedTemplate,
          variables: templateVariables,
          status: "failed",
          error: error.message,
          success: false,
          useTemplate,
        },
        ...prev,
      ]);
    },
  });

  const handleSendTest = () => {
    if (!phoneNumber) {
      toast({
        title: t("whatsapp.template.missingData"),
        description: t("whatsapp.template.fillPhoneNumber"),
        variant: "destructive",
      });
      return;
    }

    if (!phoneNumber.startsWith("+")) {
      toast({
        title: t("whatsapp.template.invalidPhone"),
        description: t("whatsapp.template.phoneMustStartWithPlus"),
        variant: "destructive",
      });
      return;
    }

    sendTemplateMessage.mutate({
      phone: phoneNumber,
      template: selectedTemplate,
      variables: templateVariables,
      useTemplate,
    });
  };

  const addVariable = () => {
    setTemplateVariables([...templateVariables, ""]);
  };

  const updateVariable = (index: number, value: string) => {
    const newVariables = [...templateVariables];
    newVariables[index] = value;
    setTemplateVariables(newVariables);
  };

  const removeVariable = (index: number) => {
    setTemplateVariables(templateVariables.filter((_, i) => i !== index));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("whatsapp.template.title")}
          </h1>
          <p className="text-gray-600">
            {t("whatsapp.template.description")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {t("whatsapp.template.sendWithApprovedTemplate")}
              </CardTitle>
              <CardDescription>
                {t("whatsapp.template.sendWithApprovedTemplateDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone">{t("whatsapp.template.phoneNumber")}</Label>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+966501234567"
                  dir="ltr"
                  data-testid="input-phone"
                />
              </div>

              <div>
                <Label htmlFor="template">{t("whatsapp.template.template")}</Label>
                <Select
                  value={selectedTemplate}
                  onValueChange={setSelectedTemplate}
                >
                  <SelectTrigger data-testid="select-template">
                    <SelectValue placeholder={t("whatsapp.template.selectTemplate")} />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedTemplates
                      .filter(
                        (template) =>
                          template.id &&
                          template.id !== "" &&
                          template.id !== null &&
                          template.id !== undefined,
                      )
                      .map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id.toString()}
                        >
                          <div className="flex items-center gap-2">
                            <span>{template.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {template.language}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("whatsapp.template.templateVariables")}</Label>
                <div className="space-y-2">
                  {templateVariables.map((variable, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={variable}
                        onChange={(e) => updateVariable(index, e.target.value)}
                        placeholder={`${t("whatsapp.template.variablePlaceholder")} ${index + 1}`}
                        data-testid={`input-variable-${index}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeVariable(index)}
                        data-testid={`button-remove-variable-${index}`}
                      >
                        {t("whatsapp.template.delete")}
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariable}
                    data-testid="button-add-variable"
                  >
                    {t("whatsapp.template.addVariable")}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useTemplate"
                  checked={useTemplate}
                  onChange={(e) => setUseTemplate(e.target.checked)}
                  data-testid="checkbox-use-template"
                />
                <Label htmlFor="useTemplate" className="text-sm">
                  {t("whatsapp.template.useApprovedTemplate")}
                </Label>
              </div>

              <Button
                onClick={handleSendTest}
                disabled={sendTemplateMessage.isPending}
                className="w-full"
                data-testid="button-send-template"
              >
                {sendTemplateMessage.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("whatsapp.template.sending")}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t("whatsapp.template.sendWithTemplate")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {t("whatsapp.template.templateDetails")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {approvedTemplates.find((t) => t.id === selectedTemplate) && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">{t("whatsapp.template.templateName")}</Label>
                    <p className="text-sm text-gray-600 font-mono">
                      {
                        approvedTemplates.find((t) => t.id === selectedTemplate)
                          ?.name
                      }
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">{t("whatsapp.template.templateId")}</Label>
                    <p className="text-xs text-gray-500 font-mono break-all">
                      {selectedTemplate}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">{t("whatsapp.template.language")}</Label>
                    <Badge variant="outline">
                      {
                        approvedTemplates.find((t) => t.id === selectedTemplate)
                          ?.language
                      }
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">{t("whatsapp.template.variables")}</Label>
                    <div className="text-sm text-gray-600">
                      {approvedTemplates
                        .find((t) => t.id === selectedTemplate)
                        ?.variables.join(", ")}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium">{t("whatsapp.template.example")}</Label>
                    <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                      {
                        approvedTemplates.find((t) => t.id === selectedTemplate)
                          ?.example
                      }
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-xs text-blue-700">
                      <strong>{t("whatsapp.template.templateStatus")}</strong> {t("whatsapp.template.approvedByMeta")}
                      <br />
                      {t("whatsapp.template.canSendToAnyNumber")}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {testResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("whatsapp.template.testResultsLog")}</CardTitle>
              <CardDescription>
                {t("whatsapp.template.testResultsLogDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 bg-white"
                    data-testid={`template-result-${index}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <span className="font-medium">{result.phone}</span>
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                        {result.useTemplate && (
                          <Badge variant="outline" className="text-xs">
                            {t("whatsapp.template.templateLabel")}
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {result.timestamp.toLocaleTimeString("ar")}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>{t("whatsapp.template.templateKey")}</strong> {result.template}
                      </p>
                      <p>
                        <strong>{t("whatsapp.template.variablesKey")}</strong>{" "}
                        {result.variables?.join(", ") || t("whatsapp.template.noVariables")}
                      </p>
                    </div>

                    {result.messageId && (
                      <p className="text-xs text-gray-500 mt-2">
                        Message ID: {result.messageId}
                      </p>
                    )}

                    {result.error && (
                      <p className="text-xs text-red-600 mt-2">
                        {t("whatsapp.template.errorLabel")} {result.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {notificationsList && notificationsList.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t("whatsapp.template.recentNotifications")}</CardTitle>
              <CardDescription>{t("whatsapp.template.recentNotificationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notificationsList.slice(0, 5).map((notification: any) => (
                  <div
                    key={notification.id}
                    className="border rounded-lg p-3 bg-white"
                    data-testid={`notification-${notification.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-medium">
                          {notification.title}
                        </span>
                        <Badge className={getStatusColor(notification.status)}>
                          {notification.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(notification.created_at).toLocaleString("ar")}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700 mb-1">
                      {notification.message}
                    </p>

                    {notification.phone_number && (
                      <p className="text-xs text-gray-500">
                        {t("whatsapp.template.to")} {notification.phone_number}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
