import { useState } from "react";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
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
import { Textarea } from "../components/ui/textarea";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Copy, CheckCircle, AlertCircle, Settings } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export default function WhatsAppSetup() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [certificate, setCertificate] = useState(
    "CmEKHQiXiLXLyZi7AhIGZW50OndhIgRNUEJGUPrb48QGGkCr8LSQ5wTCvUiJ5/EVMWcWnrs6hjWAcMwfaGfagJvEow6UVO4Wqzmpaq5kSaDjZXbrjqPgUwYfVtyXGt7pnK8CEi5tbgik9NfihfNatbOdqWgunFvl4F/C2OedL0VOrTxez1dCeu7pPITYOVBNqw5j",
  );
  const [displayName, setDisplayName] = useState("MPBF");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [twilioSettings, setTwilioSettings] = useState({
    accountSid: "",
    authToken: "",
    phoneNumber: "",
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: t("whatsapp.setup.copied"),
      description: t("whatsapp.setup.copiedToClipboard"),
    });
  };

  const saveTwilioSettings = async () => {
    try {
      toast({
        title: t("whatsapp.setup.saved"),
        description: t("whatsapp.setup.twilioSettingsSaved"),
      });
    } catch (error) {
      toast({
        title: t("whatsapp.setup.error"),
        description: t("whatsapp.setup.failedToSaveSettings"),
        variant: "destructive",
      });
    }
  };

  return (
    <PageLayout title={t("whatsapp.setup.title")} description={t("whatsapp.setup.description")}>
      <Tabs defaultValue="meta" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="meta">{t("whatsapp.setup.metaCertificate")}</TabsTrigger>
              <TabsTrigger value="twilio">{t("whatsapp.setup.twilioSettings")}</TabsTrigger>
              <TabsTrigger value="test">{t("whatsapp.setup.testConnection")}</TabsTrigger>
            </TabsList>

            <TabsContent value="meta" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    {t("whatsapp.setup.ownershipCertificate")}
                  </CardTitle>
                  <CardDescription>
                    {t("whatsapp.setup.ownershipCertificateDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="displayName">{t("whatsapp.setup.approvedDisplayName")}</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-1"
                      readOnly
                    />
                    <p className="text-sm text-green-600 mt-1">
                      {t("whatsapp.setup.approvedByMeta")}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="certificate">{t("whatsapp.setup.certificate")}</Label>
                    <div className="relative">
                      <Textarea
                        id="certificate"
                        value={certificate}
                        onChange={(e) => setCertificate(e.target.value)}
                        className="mt-1 min-h-[120px] font-mono text-sm"
                        dir="ltr"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="absolute top-2 left-2"
                        onClick={() => copyToClipboard(certificate)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {t("whatsapp.setup.certificateInfo")}
                    </p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{t("whatsapp.setup.importantSteps")}</strong>
                      <br />
                      {t("whatsapp.setup.step1")}
                      <br />
                      {t("whatsapp.setup.step2")}
                      <br />
                      {t("whatsapp.setup.step3")}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="twilio" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-600" />
                    {t("whatsapp.setup.twilioWhatsappSettings")}
                  </CardTitle>
                  <CardDescription>
                    {t("whatsapp.setup.twilioWhatsappDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="accountSid">{t("whatsapp.setup.accountSid")}</Label>
                    <Input
                      id="accountSid"
                      value={twilioSettings.accountSid}
                      onChange={(e) =>
                        setTwilioSettings((prev) => ({
                          ...prev,
                          accountSid: e.target.value,
                        }))
                      }
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <Label htmlFor="authToken">{t("whatsapp.setup.authToken")}</Label>
                    <Input
                      id="authToken"
                      type="password"
                      value={twilioSettings.authToken}
                      onChange={(e) =>
                        setTwilioSettings((prev) => ({
                          ...prev,
                          authToken: e.target.value,
                        }))
                      }
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <Label htmlFor="twilioPhone">{t("whatsapp.setup.twilioPhone")}</Label>
                    <Input
                      id="twilioPhone"
                      value={twilioSettings.phoneNumber}
                      onChange={(e) =>
                        setTwilioSettings((prev) => ({
                          ...prev,
                          phoneNumber: e.target.value,
                        }))
                      }
                      placeholder="whatsapp:+1234567890"
                      className="mt-1"
                      dir="ltr"
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      {t("whatsapp.setup.twilioPhoneHint")}
                    </p>
                  </div>

                  <Button onClick={saveTwilioSettings} className="w-full">
                    {t("whatsapp.setup.saveTwilioSettings")}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("whatsapp.setup.integrationRequirements")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>{t("whatsapp.setup.twilioAccountActive")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span>{t("whatsapp.setup.metaCertificateApproved")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <span>{t("whatsapp.setup.linkPhoneInTwilio")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <span>{t("whatsapp.setup.activateWhatsappApi")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="test" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t("whatsapp.setup.testSendingMessages")}</CardTitle>
                  <CardDescription>
                    {t("whatsapp.setup.testSendingMessagesDesc")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="testPhone">{t("whatsapp.setup.testPhoneNumber")}</Label>
                    <Input
                      id="testPhone"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+966501234567"
                      className="mt-1"
                      dir="ltr"
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => {
                      toast({
                        title: t("whatsapp.setup.sending"),
                        description: t("whatsapp.setup.sendingTestMessage"),
                      });
                    }}
                  >
                    {t("whatsapp.setup.sendTestMessage")}
                  </Button>

                  <Alert>
                    <AlertDescription>
                      {t("whatsapp.setup.testMessageInfo")}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>
      </Tabs>
    </PageLayout>
  );
}
