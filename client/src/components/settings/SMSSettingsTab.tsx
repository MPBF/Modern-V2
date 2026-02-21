import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import {
  MessageSquare,
  Send,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  Users,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";

interface SMSStatusResponse {
  success: boolean;
  configured: boolean;
  systemStatus: string;
  provider: string;
  webhookUrl?: string;
}

interface SMSBalanceResponse {
  success: boolean;
  balance?: string;
  currency?: string;
  message?: string;
}

interface SMSSendersResponse {
  success: boolean;
  senders?: any[];
  message?: string;
}

export default function SMSSettingsTab() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const { toast } = useToast();

  const [testPhone, setTestPhone] = useState("");
  const [smsForm, setSmsForm] = useState({
    phone_number: "",
    message: "",
    recipients: [] as string[],
    sender_name: "",
  });
  const [newRecipient, setNewRecipient] = useState("");

  const { data: smsStatus, isLoading: statusLoading } = useQuery<SMSStatusResponse>({
    queryKey: ["/api/sms/status"],
  });

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery<SMSBalanceResponse>({
    queryKey: ["/api/sms/balance"],
    enabled: !!smsStatus?.configured,
  });

  const { data: sendersData, isLoading: sendersLoading } = useQuery<SMSSendersResponse>({
    queryKey: ["/api/sms/senders"],
    enabled: !!smsStatus?.configured,
  });

  const sendTestMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiRequest("/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ phone_number: phone }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isRTL ? "تم الإرسال" : "Sent",
        description: isRTL ? "تم إرسال رسالة الاختبار بنجاح" : "Test message sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "فشل الإرسال" : "Send Failed",
        description: error.message || (isRTL ? "فشل في إرسال رسالة الاختبار" : "Failed to send test message"),
        variant: "destructive",
      });
    },
  });

  const sendSMSMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/sms/send", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: isRTL ? "تم الإرسال" : "Sent",
        description: isRTL ? "تم إرسال الرسالة النصية بنجاح" : "SMS sent successfully",
      });
      setSmsForm({ phone_number: "", message: "", recipients: [], sender_name: "" });
    },
    onError: (error: any) => {
      toast({
        title: isRTL ? "فشل الإرسال" : "Send Failed",
        description: error.message || (isRTL ? "فشل في إرسال الرسالة النصية" : "Failed to send SMS"),
        variant: "destructive",
      });
    },
  });

  const handleSendTest = () => {
    if (!testPhone.trim()) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "يرجى إدخال رقم الهاتف" : "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }
    sendTestMutation.mutate(testPhone);
  };

  const handleSendSMS = () => {
    if (!smsForm.phone_number.trim() && smsForm.recipients.length === 0) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "يرجى إدخال رقم هاتف واحد على الأقل" : "Please enter at least one phone number",
        variant: "destructive",
      });
      return;
    }
    if (!smsForm.message.trim()) {
      toast({
        title: isRTL ? "خطأ" : "Error",
        description: isRTL ? "يرجى كتابة الرسالة" : "Please write a message",
        variant: "destructive",
      });
      return;
    }
    sendSMSMutation.mutate(smsForm);
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !smsForm.recipients.includes(newRecipient.trim())) {
      setSmsForm((prev) => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient.trim()],
      }));
      setNewRecipient("");
    }
  };

  const removeRecipient = (phone: string) => {
    setSmsForm((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => r !== phone),
    }));
  };

  const charCount = smsForm.message.length;
  const smsCount = charCount <= 70 ? 1 : Math.ceil(charCount / 67);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {isRTL ? "حالة خدمة الرسائل النصية (تقنيات)" : "SMS Service Status (Taqnyat)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className={`p-2 rounded-full ${smsStatus?.configured ? "bg-green-100" : "bg-red-100"}`}>
                {statusLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                ) : smsStatus?.configured ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "حالة الخدمة" : "Service Status"}
                </p>
                <p className="font-medium">
                  {statusLoading
                    ? (isRTL ? "جاري التحقق..." : "Checking...")
                    : smsStatus?.configured
                      ? (isRTL ? "مُفعّلة" : "Active")
                      : (isRTL ? "غير مُعدة" : "Not Configured")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="p-2 rounded-full bg-blue-100">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "الرصيد المتبقي" : "Balance"}
                </p>
                <p className="font-medium">
                  {balanceLoading
                    ? (isRTL ? "جاري التحميل..." : "Loading...")
                    : balanceData?.success
                      ? `${balanceData.balance} ${balanceData.currency}`
                      : (isRTL ? "غير متاح" : "Unavailable")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchBalance()}
                className="mr-auto"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="p-2 rounded-full bg-purple-100">
                <Phone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {isRTL ? "أسماء المرسلين" : "Sender Names"}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sendersLoading ? (
                    <span className="text-sm">{isRTL ? "جاري التحميل..." : "Loading..."}</span>
                  ) : sendersData?.success && sendersData?.senders && sendersData.senders.length > 0 ? (
                    sendersData.senders.map((sender: any, idx: number) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {typeof sender === "string" ? sender : sender.senderName || sender.name || JSON.stringify(sender)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {isRTL ? "لا توجد أسماء مرسلين" : "No senders"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {smsStatus?.webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              {isRTL ? "رابط الهوك (Webhook URL)" : "Webhook URL"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {isRTL
                ? "انسخ هذا الرابط وأضفه في لوحة تحكم تقنيات لاستقبال تقارير تسليم الرسائل"
                : "Copy this URL and add it to Taqnyat dashboard to receive SMS delivery reports"}
            </p>
            <div className="flex gap-2 items-center">
              <Input
                value={smsStatus.webhookUrl}
                readOnly
                dir="ltr"
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(smsStatus.webhookUrl!);
                  toast({
                    title: isRTL ? "تم النسخ" : "Copied",
                    description: isRTL ? "تم نسخ رابط الهوك بنجاح" : "Webhook URL copied to clipboard",
                  });
                }}
              >
                {isRTL ? "نسخ" : "Copy"}
              </Button>
            </div>
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                {isRTL ? (
                  <>
                    <strong>خطوات الإعداد في منصة تقنيات:</strong>
                    <br />
                    1. سجل دخول إلى حسابك في <a href="https://portal.taqnyat.sa" target="_blank" rel="noopener noreferrer" className="text-primary underline">portal.taqnyat.sa</a>
                    <br />
                    2. اذهب إلى إعدادات التطبيق (Application)
                    <br />
                    3. الصق رابط الهوك في حقل Callback URL / Webhook URL
                    <br />
                    4. احفظ التغييرات
                  </>
                ) : (
                  <>
                    <strong>Setup steps in Taqnyat platform:</strong>
                    <br />
                    1. Login to your account at <a href="https://portal.taqnyat.sa" target="_blank" rel="noopener noreferrer" className="text-primary underline">portal.taqnyat.sa</a>
                    <br />
                    2. Go to Application settings
                    <br />
                    3. Paste the webhook URL in the Callback URL / Webhook URL field
                    <br />
                    4. Save changes
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {isRTL ? "اختبار الإرسال" : "Send Test"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>{isRTL ? "رقم الهاتف (للاختبار)" : "Phone Number (for testing)"}</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="966XXXXXXXXX"
                dir="ltr"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleSendTest}
              disabled={sendTestMutation.isPending || !smsStatus?.configured}
            >
              {sendTestMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Send className="w-4 h-4 ml-2" />
              )}
              {isRTL ? "إرسال اختبار" : "Send Test"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {isRTL
              ? "سيتم إرسال رسالة اختبار قصيرة للتحقق من عمل الخدمة"
              : "A short test message will be sent to verify the service is working"}
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {isRTL ? "إرسال رسالة نصية" : "Send SMS Message"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{isRTL ? "رقم الهاتف الرئيسي" : "Primary Phone Number"}</Label>
            <Input
              value={smsForm.phone_number}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, phone_number: e.target.value }))}
              placeholder="966XXXXXXXXX"
              dir="ltr"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isRTL ? "مستلمين إضافيين" : "Additional Recipients"}
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="966XXXXXXXXX"
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
              />
              <Button variant="outline" onClick={addRecipient} type="button">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {smsForm.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {smsForm.recipients.map((phone) => (
                  <Badge key={phone} variant="secondary" className="flex items-center gap-1">
                    <span dir="ltr">{phone}</span>
                    <button onClick={() => removeRecipient(phone)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>{isRTL ? "نص الرسالة" : "Message Text"}</Label>
            <Textarea
              value={smsForm.message}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder={isRTL ? "اكتب رسالتك هنا..." : "Write your message here..."}
              rows={4}
              maxLength={918}
              className="mt-1"
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>
                {isRTL ? `عدد الرسائل: ${smsCount}` : `SMS Count: ${smsCount}`}
              </span>
              <span dir="ltr">{charCount}/918</span>
            </div>
          </div>

          <div>
            <Label>{isRTL ? "اسم المرسل (اختياري)" : "Sender Name (optional)"}</Label>
            <Input
              value={smsForm.sender_name}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, sender_name: e.target.value }))}
              placeholder={isRTL ? "اتركه فارغاً لاستخدام الافتراضي" : "Leave empty for default"}
              dir="ltr"
              maxLength={20}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSendSMS}
            disabled={sendSMSMutation.isPending || !smsStatus?.configured}
            className="w-full"
          >
            {sendSMSMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Send className="w-4 h-4 ml-2" />
            )}
            {isRTL ? "إرسال الرسالة" : "Send Message"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
