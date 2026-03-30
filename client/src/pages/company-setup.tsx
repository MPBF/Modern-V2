import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Redirect } from "wouter";
import { apiRequest } from "../lib/queryClient";
import { useToast } from "../hooks/use-toast";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  Building2, User, CheckCircle2, ArrowLeft, ArrowRight,
  Loader2, Phone, Mail, MapPin, Hash, Clock, Shield,
} from "lucide-react";

const STEPS = [
  { id: "company", title: "معلومات الشركة", icon: Building2 },
  { id: "admin", title: "حساب المدير", icon: Shield },
  { id: "confirm", title: "تأكيد وتشغيل", icon: CheckCircle2 },
];

const regions = [
  "الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة",
  "تبوك", "أبها", "حائل", "الطائف", "الخبر",
];

export default function CompanySetup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);

  const [companyData, setCompanyData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    taxNumber: "",
    country: "المملكة العربية السعودية",
    region: "الرياض",
    currency: "SAR",
    language: "ar",
    workingHoursStart: "08:00",
    workingHoursEnd: "17:00",
  });

  const [adminData, setAdminData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    displayNameAr: "",
    phone: "",
    email: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: setupStatus, isLoading: statusLoading } = useQuery<{ setupCompleted: boolean }>({
    queryKey: ["/api/setup/status"],
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/setup/initialize", {
        method: "POST",
        body: JSON.stringify({
          company: companyData,
          admin: adminData,
        }),
      });
      return res;
    },
    onSuccess: () => {
      toast({ title: "تم إعداد النظام بنجاح! يمكنك الآن تسجيل الدخول." });
      setTimeout(() => navigate("/login"), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ في الإعداد",
        description: error.message || "حدث خطأ أثناء إعداد النظام",
        variant: "destructive",
      });
    },
  });

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!companyData.name.trim()) newErrors.companyName = "اسم الشركة مطلوب";
    }

    if (step === 1) {
      if (!adminData.username.trim()) newErrors.adminUsername = "اسم المستخدم مطلوب";
      if (adminData.username.includes(" ")) newErrors.adminUsername = "اسم المستخدم لا يجب أن يحتوي على مسافات";
      if (!adminData.displayName.trim()) newErrors.adminDisplayName = "الاسم الظاهر مطلوب";
      if (!adminData.password) newErrors.adminPassword = "كلمة المرور مطلوبة";
      if (adminData.password.length < 6) newErrors.adminPassword = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
      if (adminData.password !== adminData.confirmPassword) newErrors.adminConfirmPassword = "كلمتا المرور غير متطابقتين";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = () => {
    if (validateStep(1)) {
      setupMutation.mutate();
    }
  };

  if (statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (setupStatus?.setupCompleted) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Building2 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">إعداد النظام</h1>
          <p className="text-gray-500 mt-2">أهلاً بك! لنقم بإعداد نظام إدارة المصنع الخاص بشركتك</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <div key={step.id} className="flex items-center">
                {index > 0 && (
                  <div className={`w-12 h-0.5 mx-1 ${isCompleted ? "bg-primary" : "bg-gray-200"}`} />
                )}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isActive ? "bg-primary text-primary-foreground scale-110" :
                      isCompleted ? "bg-primary/20 text-primary" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className={`text-xs ${isActive ? "font-bold text-primary" : "text-gray-400"}`}>
                    {step.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Card className="shadow-lg border-0">
          {currentStep === 0 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  معلومات الشركة
                </CardTitle>
                <CardDescription>أدخل البيانات الأساسية لشركتك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>اسم الشركة <span className="text-red-500">*</span></Label>
                    <Input
                      value={companyData.name}
                      onChange={(e) => setCompanyData((p) => ({ ...p, name: e.target.value }))}
                      placeholder="مثال: مصنع الأكياس البلاستيكية"
                    />
                    {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Hash className="h-3.5 w-3.5" /> الرقم الضريبي</Label>
                    <Input
                      value={companyData.taxNumber}
                      onChange={(e) => setCompanyData((p) => ({ ...p, taxNumber: e.target.value }))}
                      placeholder="300000000000003"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> رقم الهاتف</Label>
                    <Input
                      value={companyData.phone}
                      onChange={(e) => setCompanyData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+966500000000"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => setCompanyData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="info@company.com"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> المنطقة</Label>
                    <Select value={companyData.region} onValueChange={(v) => setCompanyData((p) => ({ ...p, region: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> العنوان</Label>
                    <Input
                      value={companyData.address}
                      onChange={(e) => setCompanyData((p) => ({ ...p, address: e.target.value }))}
                      placeholder="المدينة، الحي، الشارع"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> بداية الدوام</Label>
                    <Input
                      type="time"
                      value={companyData.workingHoursStart}
                      onChange={(e) => setCompanyData((p) => ({ ...p, workingHoursStart: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> نهاية الدوام</Label>
                    <Input
                      type="time"
                      value={companyData.workingHoursEnd}
                      onChange={(e) => setCompanyData((p) => ({ ...p, workingHoursEnd: e.target.value }))}
                    />
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  حساب المدير (Admin)
                </CardTitle>
                <CardDescription>أنشئ حساب المدير الرئيسي للنظام</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم المستخدم <span className="text-red-500">*</span></Label>
                    <Input
                      value={adminData.username}
                      onChange={(e) => setAdminData((p) => ({ ...p, username: e.target.value }))}
                      placeholder="admin"
                      dir="ltr"
                    />
                    {errors.adminUsername && <p className="text-sm text-red-500">{errors.adminUsername}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم الظاهر <span className="text-red-500">*</span></Label>
                    <Input
                      value={adminData.displayName}
                      onChange={(e) => setAdminData((p) => ({ ...p, displayName: e.target.value }))}
                      placeholder="مثال: أحمد محمد"
                    />
                    {errors.adminDisplayName && <p className="text-sm text-red-500">{errors.adminDisplayName}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم بالعربي</Label>
                    <Input
                      value={adminData.displayNameAr}
                      onChange={(e) => setAdminData((p) => ({ ...p, displayNameAr: e.target.value }))}
                      placeholder="اختياري"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> رقم الهاتف</Label>
                    <Input
                      value={adminData.phone}
                      onChange={(e) => setAdminData((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+966500000000"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> البريد الإلكتروني</Label>
                    <Input
                      type="email"
                      value={adminData.email}
                      onChange={(e) => setAdminData((p) => ({ ...p, email: e.target.value }))}
                      placeholder="admin@company.com"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>كلمة المرور <span className="text-red-500">*</span></Label>
                    <Input
                      type="password"
                      value={adminData.password}
                      onChange={(e) => setAdminData((p) => ({ ...p, password: e.target.value }))}
                      placeholder="6 أحرف على الأقل"
                    />
                    {errors.adminPassword && <p className="text-sm text-red-500">{errors.adminPassword}</p>}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>تأكيد كلمة المرور <span className="text-red-500">*</span></Label>
                    <Input
                      type="password"
                      value={adminData.confirmPassword}
                      onChange={(e) => setAdminData((p) => ({ ...p, confirmPassword: e.target.value }))}
                      placeholder="أعد كتابة كلمة المرور"
                    />
                    {errors.adminConfirmPassword && <p className="text-sm text-red-500">{errors.adminConfirmPassword}</p>}
                  </div>
                </div>
              </CardContent>
            </>
          )}

          {currentStep === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  مراجعة وتأكيد
                </CardTitle>
                <CardDescription>راجع البيانات قبل إتمام الإعداد</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-blue-900 flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> بيانات الشركة
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">اسم الشركة:</div>
                    <div className="font-medium">{companyData.name}</div>
                    {companyData.taxNumber && (
                      <>
                        <div className="text-gray-500">الرقم الضريبي:</div>
                        <div className="font-medium">{companyData.taxNumber}</div>
                      </>
                    )}
                    {companyData.phone && (
                      <>
                        <div className="text-gray-500">الهاتف:</div>
                        <div className="font-medium" dir="ltr">{companyData.phone}</div>
                      </>
                    )}
                    {companyData.email && (
                      <>
                        <div className="text-gray-500">البريد:</div>
                        <div className="font-medium" dir="ltr">{companyData.email}</div>
                      </>
                    )}
                    {companyData.address && (
                      <>
                        <div className="text-gray-500">العنوان:</div>
                        <div className="font-medium">{companyData.address}</div>
                      </>
                    )}
                    <div className="text-gray-500">المنطقة:</div>
                    <div className="font-medium">{companyData.region}</div>
                    <div className="text-gray-500">ساعات العمل:</div>
                    <div className="font-medium" dir="ltr">{companyData.workingHoursStart} - {companyData.workingHoursEnd}</div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-green-900 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> حساب المدير
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-gray-500">اسم المستخدم:</div>
                    <div className="font-medium" dir="ltr">{adminData.username}</div>
                    <div className="text-gray-500">الاسم الظاهر:</div>
                    <div className="font-medium">{adminData.displayName}</div>
                    {adminData.phone && (
                      <>
                        <div className="text-gray-500">الهاتف:</div>
                        <div className="font-medium" dir="ltr">{adminData.phone}</div>
                      </>
                    )}
                    <div className="text-gray-500">الصلاحيات:</div>
                    <div className="font-medium">مدير النظام (صلاحيات كاملة)</div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          <div className="flex items-center justify-between px-6 pb-6">
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              <ArrowRight className="h-4 w-4 ml-2" />
              السابق
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext}>
                التالي
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={setupMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {setupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 ml-2" />
                )}
                تشغيل النظام
              </Button>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          نظام إدارة المصنع - الإعداد الأولي
        </p>
      </div>
    </div>
  );
}
