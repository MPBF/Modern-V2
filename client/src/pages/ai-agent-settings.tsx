import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Plus, Edit, Trash2, Save, Settings, BookOpen, Sparkles } from "lucide-react";

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Knowledge {
  id: number;
  title: string;
  content: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AiAgentSettings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingSetting, setEditingSetting] = useState<{ key: string; value: string; description: string } | null>(null);
  const [newKnowledge, setNewKnowledge] = useState({ title: "", content: "", category: "general" });
  const [editingKnowledge, setEditingKnowledge] = useState<Knowledge | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");

  const { data: settings = [], isLoading: loadingSettings } = useQuery<Setting[]>({
    queryKey: ["/api/ai-agent/settings"]
  });

  const { data: knowledge = [], isLoading: loadingKnowledge } = useQuery<Knowledge[]>({
    queryKey: ["/api/ai-agent/knowledge"]
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: string; description: string }) => {
      return apiRequest(`/api/ai-agent/settings/${key}`, { method: "PUT", body: JSON.stringify({ value, description }) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agent/settings"] });
      setEditingSetting(null);
      toast({ title: "تم الحفظ", description: "تم تحديث الإعداد بنجاح" });
    }
  });

  const addKnowledgeMutation = useMutation({
    mutationFn: async (data: { title: string; content: string; category: string }) => {
      return apiRequest("/api/ai-agent/knowledge", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agent/knowledge"] });
      setNewKnowledge({ title: "", content: "", category: "general" });
      setIsAddDialogOpen(false);
      toast({ title: "تمت الإضافة", description: "تم إضافة المعرفة بنجاح" });
    }
  });

  const updateKnowledgeMutation = useMutation({
    mutationFn: async (data: Knowledge) => {
      return apiRequest(`/api/ai-agent/knowledge/${data.id}`, { method: "PUT", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agent/knowledge"] });
      setEditingKnowledge(null);
      toast({ title: "تم التحديث", description: "تم تحديث المعرفة بنجاح" });
    }
  });

  const deleteKnowledgeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/ai-agent/knowledge/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai-agent/knowledge"] });
      toast({ title: "تم الحذف", description: "تم حذف المعرفة بنجاح" });
    }
  });

  const categoryLabels: Record<string, string> = {
    general: "عام",
    products: "المنتجات",
    pricing: "التسعير",
    policies: "السياسات",
    customers: "العملاء"
  };

  const defaultSettings = [
    { key: "agent_name", label: "اسم الوكيل", description: "اسم المساعد الذكي" },
    { key: "company_name", label: "اسم الشركة", description: "اسم الشركة لتظهر في الردود" },
    { key: "default_greeting", label: "رسالة الترحيب", description: "رسالة الترحيب الافتراضية" },
    { key: "response_style", label: "أسلوب الرد", description: "رسمي/ودي/مختصر" }
  ];

  return (
    <PageLayout
      title="إعدادات الوكيل الذكي"
      description="تخصيص سلوك ومعلومات الوكيل الذكي"
    >
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">إعدادات الوكيل الذكي</h1>
            <p className="text-muted-foreground">خصص سلوك المساعد الذكي وأضف معلومات لقاعدة المعرفة</p>
          </div>
        </div>

        <Tabs defaultValue="settings" dir="rtl">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              الإعدادات الأساسية
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              قاعدة المعرفة
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>الإعدادات الأساسية</CardTitle>
                <CardDescription>تخصيص سلوك الوكيل الذكي والمعلومات الأساسية</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {defaultSettings.map((setting) => {
                  const currentSetting = settings.find(s => s.key === setting.key);
                  const isEditing = editingSetting?.key === setting.key;

                  return (
                    <div key={setting.key} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Label className="text-base font-medium">{setting.label}</Label>
                          <p className="text-sm text-muted-foreground">{setting.description}</p>
                        </div>
                        {!isEditing && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingSetting({
                              key: setting.key,
                              value: currentSetting?.value || "",
                              description: currentSetting?.description || setting.description
                            })}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3 mt-3">
                          <Input
                            value={editingSetting.value}
                            onChange={(e) => setEditingSetting({ ...editingSetting, value: e.target.value })}
                            placeholder="أدخل القيمة"
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditingSetting(null)}>
                              إلغاء
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateSettingMutation.mutate(editingSetting)}
                              disabled={updateSettingMutation.isPending}
                            >
                              <Save className="h-4 w-4 ml-2" />
                              حفظ
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm bg-muted/50 p-2 rounded mt-2">
                          {currentSetting?.value || "لم يتم تعيين قيمة"}
                        </p>
                      )}
                    </div>
                  );
                })}

                <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                  <Label className="text-base font-medium">التعليمات المخصصة</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    أضف تعليمات إضافية للوكيل الذكي (مثل: طريقة الرد، المعلومات الهامة)
                  </p>
                  <Textarea
                    className="min-h-[150px]"
                    placeholder="مثال: أنت مساعد ذكي لشركة متخصصة في صناعة الأكياس البلاستيكية..."
                    value={customInstructions || settings.find(s => s.key === "custom_instructions")?.value || ""}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      onClick={() => {
                        updateSettingMutation.mutate({
                          key: "custom_instructions",
                          value: customInstructions || settings.find(s => s.key === "custom_instructions")?.value || "",
                          description: "تعليمات مخصصة للوكيل"
                        });
                      }}
                      disabled={updateSettingMutation.isPending}
                    >
                      <Save className="h-4 w-4 ml-2" />
                      حفظ التعليمات
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="knowledge">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>قاعدة المعرفة</CardTitle>
                  <CardDescription>أضف معلومات يستخدمها الوكيل الذكي للرد على الاستفسارات</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة معرفة
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg" dir="rtl">
                    <DialogHeader>
                      <DialogTitle>إضافة معرفة جديدة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>العنوان</Label>
                        <Input
                          value={newKnowledge.title}
                          onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                          placeholder="مثال: سياسة الإرجاع"
                        />
                      </div>
                      <div>
                        <Label>التصنيف</Label>
                        <Select
                          value={newKnowledge.category}
                          onValueChange={(value) => setNewKnowledge({ ...newKnowledge, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>المحتوى</Label>
                        <Textarea
                          className="min-h-[150px]"
                          value={newKnowledge.content}
                          onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                          placeholder="أدخل المعلومات التي سيستخدمها الوكيل..."
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          إلغاء
                        </Button>
                        <Button
                          onClick={() => addKnowledgeMutation.mutate(newKnowledge)}
                          disabled={addKnowledgeMutation.isPending || !newKnowledge.title || !newKnowledge.content}
                        >
                          إضافة
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loadingKnowledge ? (
                  <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
                ) : knowledge.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">لا توجد معلومات في قاعدة المعرفة بعد</p>
                    <p className="text-sm text-muted-foreground">أضف معلومات ليستخدمها الوكيل الذكي</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {knowledge.map((item) => (
                      <div
                        key={item.id}
                        className={`border rounded-lg p-4 ${!item.is_active ? "opacity-50" : ""}`}
                      >
                        {editingKnowledge?.id === item.id ? (
                          <div className="space-y-4">
                            <Input
                              value={editingKnowledge.title}
                              onChange={(e) => setEditingKnowledge({ ...editingKnowledge, title: e.target.value })}
                            />
                            <Select
                              value={editingKnowledge.category}
                              onValueChange={(value) => setEditingKnowledge({ ...editingKnowledge, category: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(categoryLabels).map(([value, label]) => (
                                  <SelectItem key={value} value={value}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Textarea
                              className="min-h-[100px]"
                              value={editingKnowledge.content}
                              onChange={(e) => setEditingKnowledge({ ...editingKnowledge, content: e.target.value })}
                            />
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={editingKnowledge.is_active}
                                  onCheckedChange={(checked) => setEditingKnowledge({ ...editingKnowledge, is_active: checked })}
                                />
                                <Label>مفعّل</Label>
                              </div>
                              <div className="flex-1" />
                              <Button variant="outline" size="sm" onClick={() => setEditingKnowledge(null)}>
                                إلغاء
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => updateKnowledgeMutation.mutate(editingKnowledge)}
                                disabled={updateKnowledgeMutation.isPending}
                              >
                                حفظ
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-medium">{item.title}</h4>
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                  {categoryLabels[item.category] || item.category}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingKnowledge(item)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => {
                                    if (confirm("هل أنت متأكد من حذف هذه المعرفة؟")) {
                                      deleteKnowledgeMutation.mutate(item.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                              {item.content.length > 200 ? item.content.slice(0, 200) + "..." : item.content}
                            </p>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
