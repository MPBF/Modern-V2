import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Settings,
  ExternalLink,
} from "lucide-react";

export default function WhatsAppTroubleshoot() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const { data: notifications } = useQuery({
    queryKey: ["/api/notifications"],
    refetchInterval: 30000,
  });

  const notificationsList = Array.isArray(notifications) ? notifications : [];
  const failedMessages = notificationsList.filter(
    (n: any) => n.status === "failed" || n.external_status === "undelivered",
  );

  const troubleshootSteps = [
    {
      id: "check-twilio-console",
      title: t("whatsapp.troubleshoot.checkTwilioConsole"),
      description: t("whatsapp.troubleshoot.checkTwilioConsoleDesc"),
      status: "pending",
      actions: [
        t("whatsapp.troubleshoot.checkTwilioAction1"),
        t("whatsapp.troubleshoot.checkTwilioAction2"),
        t("whatsapp.troubleshoot.checkTwilioAction3"),
      ],
    },
    {
      id: "verify-recipient",
      title: t("whatsapp.troubleshoot.verifyRecipient"),
      description: t("whatsapp.troubleshoot.verifyRecipientDesc"),
      status: "pending",
      actions: [
        t("whatsapp.troubleshoot.verifyRecipientAction1"),
        t("whatsapp.troubleshoot.verifyRecipientAction2"),
        t("whatsapp.troubleshoot.verifyRecipientAction3"),
      ],
    },
    {
      id: "check-template-approval",
      title: t("whatsapp.troubleshoot.checkTemplateApproval"),
      description: t("whatsapp.troubleshoot.checkTemplateApprovalDesc"),
      status: "pending",
      actions: [
        t("whatsapp.troubleshoot.checkTemplateAction1"),
        t("whatsapp.troubleshoot.checkTemplateAction2"),
        t("whatsapp.troubleshoot.checkTemplateAction3"),
      ],
    },
    {
      id: "sandbox-mode",
      title: t("whatsapp.troubleshoot.sandboxMode"),
      description: t("whatsapp.troubleshoot.sandboxModeDesc"),
      status: "pending",
      actions: [
        t("whatsapp.troubleshoot.sandboxAction1"),
        t("whatsapp.troubleshoot.sandboxAction2"),
        t("whatsapp.troubleshoot.sandboxAction3"),
      ],
    },
    {
      id: "webhook-setup",
      title: t("whatsapp.troubleshoot.webhookSetup"),
      description: t("whatsapp.troubleshoot.webhookSetupDesc"),
      status: "pending",
      actions: [
        t("whatsapp.troubleshoot.webhookAction1"),
        t("whatsapp.troubleshoot.webhookAction2"),
        `${t("whatsapp.troubleshoot.webhookAction3")} ${window.location.origin}/api/notifications/webhook/twilio`,
      ],
    },
  ];

  const toggleCheck = (itemId: string) => {
    setCheckedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const error63016 = {
    code: "63016",
    description: t("whatsapp.troubleshoot.errorDescription"),
    solutions: [
      t("whatsapp.troubleshoot.solution1"),
      t("whatsapp.troubleshoot.solution2"),
      t("whatsapp.troubleshoot.solution3"),
      t("whatsapp.troubleshoot.solution4"),
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t("whatsapp.troubleshoot.title")}
          </h1>
          <p className="text-gray-600">
            {t("whatsapp.troubleshoot.description")}
          </p>
        </div>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              {t("whatsapp.troubleshoot.twilioError")} {error63016.code}
            </CardTitle>
            <CardDescription className="text-red-600">
              {error63016.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-medium text-red-700">{t("whatsapp.troubleshoot.suggestedSolutions")}</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {error63016.solutions.map((solution, index) => (
                  <li key={index}>{solution}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {t("whatsapp.troubleshoot.currentSystemStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t("whatsapp.troubleshoot.whatsappNumber")}</span>
                  <Badge variant="outline">+15557911537</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {t("whatsapp.troubleshoot.businessAccountId")}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    795259496521200
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t("whatsapp.troubleshoot.twilioAccount")}</span>
                  <Badge variant="outline" className="text-xs">
                    ACe4ba2fd2e98be5b019c354539404cc29
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t("whatsapp.troubleshoot.lastMessage")}</span>
                  <Badge className="bg-red-100 text-red-800">{t("whatsapp.troubleshoot.undelivered")}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{t("whatsapp.troubleshoot.errorCode")}</span>
                  <Badge className="bg-red-100 text-red-800">63016</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    {t("whatsapp.troubleshoot.failedMessages")}
                  </span>
                  <Badge className="bg-red-100 text-red-800">
                    {failedMessages.length}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("whatsapp.troubleshoot.checklist")}</CardTitle>
            <CardDescription>
              {t("whatsapp.troubleshoot.checklistDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {troubleshootSteps.map((step) => (
                <div key={step.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleCheck(step.id)}
                      className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                        checkedItems.includes(step.id)
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {checkedItems.includes(step.id) && (
                        <CheckCircle className="h-3 w-3" />
                      )}
                    </button>

                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {step.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {step.description}
                      </p>

                      <div className="space-y-1">
                        {step.actions.map((action, index) => (
                          <div
                            key={index}
                            className="text-sm text-gray-700 flex items-start gap-2"
                          >
                            <span className="text-blue-500 mt-1">•</span>
                            <span>{action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              {t("whatsapp.troubleshoot.usefulLinks")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                asChild
              >
                <a
                  href="https://console.twilio.com/us1/develop/sms/senders/whatsapp"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="text-left">
                    <div className="font-medium">{t("whatsapp.troubleshoot.twilioWhatsappConsole")}</div>
                    <div className="text-sm text-gray-500">
                      {t("whatsapp.troubleshoot.manageWhatsappNumbers")}
                    </div>
                  </div>
                </a>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                asChild
              >
                <a
                  href="https://business.facebook.com/wa/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="text-left">
                    <div className="font-medium">{t("whatsapp.troubleshoot.metaBusinessManager")}</div>
                    <div className="text-sm text-gray-500">
                      {t("whatsapp.troubleshoot.manageWhatsappBusiness")}
                    </div>
                  </div>
                </a>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                asChild
              >
                <a
                  href="https://www.twilio.com/docs/whatsapp/sandbox"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="text-left">
                    <div className="font-medium">{t("whatsapp.troubleshoot.whatsappSandbox")}</div>
                    <div className="text-sm text-gray-500">
                      {t("whatsapp.troubleshoot.sandboxGuide")}
                    </div>
                  </div>
                </a>
              </Button>

              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                asChild
              >
                <a
                  href="https://www.twilio.com/docs/errors/63016"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="text-left">
                    <div className="font-medium">{t("whatsapp.troubleshoot.error63016Details")}</div>
                    <div className="text-sm text-gray-500">{t("whatsapp.troubleshoot.errorExplanation")}</div>
                  </div>
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {failedMessages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                {t("whatsapp.troubleshoot.failedMessagesTitle")} ({failedMessages.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {failedMessages.slice(0, 5).map((message: any) => (
                  <div
                    key={message.id}
                    className="border rounded-lg p-3 bg-red-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-red-700">
                        {message.phone_number || t("whatsapp.troubleshoot.unknownNumber")}
                      </span>
                      <Badge className="bg-red-100 text-red-800">
                        {message.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">
                      {message.message}
                    </p>
                    {message.error_message && (
                      <p className="text-xs text-red-600">
                        {t("whatsapp.troubleshoot.errorLabel")} {message.error_message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {new Date(message.created_at).toLocaleString("ar")}
                    </p>
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
