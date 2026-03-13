import { useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocalizedName } from "../hooks/use-localized-name";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "../lib/queryClient";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { SearchableSelect } from "../components/ui/searchable-select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Separator } from "../components/ui/separator";
import { useToast } from "../hooks/use-toast";
import {
  AlertTriangle, Plus, Search, Eye, Filter, Shield, ShieldAlert, ShieldCheck, ShieldX,
  Users, ClipboardList, MessageSquare, CheckCircle2, XCircle, Clock, AlertCircle,
  FileText, UserCheck, Trash2, Edit, ChevronDown, ChevronUp, Activity,
  Printer, MoreHorizontal, DollarSign, ArrowRight, CircleDot, Ban,
} from "lucide-react";

const SOURCE_OPTIONS = [
  { value: "inspection", label: "فحص عشوائي", icon: Search },
  { value: "customer_complaint", label: "شكوى عميل", icon: MessageSquare },
  { value: "internal_report", label: "بلاغ داخلي", icon: FileText },
];

const SEVERITY_OPTIONS = [
  { value: "low", label: "منخفضة", color: "bg-blue-100 text-blue-800" },
  { value: "medium", label: "متوسطة", color: "bg-yellow-100 text-yellow-800" },
  { value: "high", label: "عالية", color: "bg-orange-100 text-orange-800" },
  { value: "critical", label: "حرجة", color: "bg-red-100 text-red-800" },
];

const STATUS_OPTIONS = [
  { value: "open", label: "مفتوحة", color: "bg-red-100 text-red-800" },
  { value: "investigating", label: "قيد التحقيق", color: "bg-yellow-100 text-yellow-800" },
  { value: "resolved", label: "تم الحل", color: "bg-green-100 text-green-800" },
  { value: "closed", label: "مغلقة", color: "bg-gray-100 text-gray-800" },
];

const CATEGORY_OPTIONS = [
  { value: "film_error", label: "خطأ في الفيلم" },
  { value: "printing_error", label: "خطأ في الطباعة" },
  { value: "cutting_error", label: "خطأ في التقطيع" },
  { value: "color_mismatch", label: "عدم تطابق الألوان" },
  { value: "size_error", label: "خطأ في المقاس" },
  { value: "material_defect", label: "عيب في الخامات" },
  { value: "contamination", label: "تلوث" },
  { value: "packaging_error", label: "خطأ في التغليف" },
  { value: "weight_error", label: "خطأ في الوزن" },
  { value: "other", label: "أخرى" },
];

const STAGE_OPTIONS = [
  { value: "film", label: "فيلم" },
  { value: "printing", label: "طباعة" },
  { value: "cutting", label: "تقطيع" },
  { value: "packaging", label: "تغليف" },
  { value: "delivery", label: "تسليم" },
  { value: "post_delivery", label: "بعد التسليم" },
];

const DEPARTMENT_OPTIONS = [
  { value: "film", label: "قسم الفيلم" },
  { value: "printing", label: "قسم الطباعة" },
  { value: "cutting", label: "قسم التقطيع" },
  { value: "quality", label: "قسم الجودة" },
  { value: "warehouse", label: "المستودع" },
  { value: "management", label: "الإدارة" },
];

const PENALTY_OPTIONS = [
  { value: "none", label: "بدون عقوبة" },
  { value: "verbal_warning", label: "إنذار شفوي" },
  { value: "written_warning", label: "إنذار كتابي" },
  { value: "deduction", label: "خصم" },
  { value: "suspension", label: "إيقاف" },
  { value: "training", label: "تدريب إضافي" },
];

const ACTION_TYPE_OPTIONS = [
  { value: "corrective", label: "إجراء تصحيحي" },
  { value: "preventive", label: "إجراء وقائي" },
  { value: "customer_compensation", label: "تعويض العميل" },
  { value: "investigation", label: "تحقيق" },
  { value: "follow_up", label: "متابعة" },
  { value: "rework", label: "إعادة تصنيع" },
];

const WORKFLOW_STEPS = [
  { key: "registered", label: "تسجيل المشكلة", icon: FileText, check: () => true },
  { key: "investigated", label: "التحقيق والتحليل", icon: Search, check: (i: any) => !!i.root_cause },
  { key: "responsibles", label: "تحديد المسؤولين", icon: Users, check: (i: any) => (i.responsibles?.length || 0) > 0 },
  { key: "actions", label: "الإجراءات التصحيحية", icon: ClipboardList, check: (i: any) => (i.actions?.length || 0) > 0 },
  { key: "preventive", label: "الإجراءات الوقائية", icon: Shield, check: (i: any) => !!i.preventive_action },
  { key: "loss", label: "تقدير الخسائر", icon: DollarSign, check: (i: any) => !!i.estimated_loss },
  { key: "customer", label: "إجراء العميل", icon: MessageSquare, check: (i: any) => !!i.customer_action_taken },
  { key: "closed", label: "الإغلاق", icon: CheckCircle2, check: (i: any) => i.status === "resolved" || i.status === "closed" },
];

export default function Quality() {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("issues");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
  const [editIssueId, setEditIssueId] = useState<number | null>(null);
  const [printIssueId, setPrintIssueId] = useState<number | null>(null);
  const [deleteIssueId, setDeleteIssueId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [searchText, setSearchText] = useState("");
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const { data: issuesData, isLoading: issuesLoading } = useQuery<any>({
    queryKey: ["/api/quality-issues", { status: filterStatus, source: filterSource, severity: filterSeverity }],
  });

  const { data: statsData } = useQuery<any>({
    queryKey: ["/api/quality-issues/stats"],
  });

  const { data: customersData } = useQuery<any>({ queryKey: ["/api/customers"] });
  const { data: usersData } = useQuery<any>({ queryKey: ["/api/users"] });
  const { data: prodOrdersData } = useQuery<any>({ queryKey: ["/api/production-orders"] });
  const { data: ordersData } = useQuery<any>({ queryKey: ["/api/orders"] });

  const issues = Array.isArray(issuesData) ? issuesData : (issuesData?.data || []);
  const stats = (statsData?.data || statsData || { total: 0, byStatus: {}, bySeverity: {}, bySource: {}, byCategory: {} });
  const customersList = Array.isArray(customersData) ? customersData : (customersData?.data || []);
  const usersList = Array.isArray(usersData) ? usersData : (usersData?.data || []);
  const prodOrders = Array.isArray(prodOrdersData) ? prodOrdersData : (prodOrdersData?.data || []);
  const ordersList = Array.isArray(ordersData) ? ordersData : (ordersData?.data || []);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/quality-issues/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم حذف المشكلة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues/stats"] });
      setDeleteIssueId(null);
    },
    onError: () => {
      toast({ title: "خطأ في حذف المشكلة", variant: "destructive" });
    },
  });

  const filteredIssues = useMemo(() => {
    if (!searchText) return issues;
    const q = searchText.toLowerCase();
    return issues.filter((i: any) =>
      i.issue_number?.toLowerCase().includes(q) ||
      i.description?.toLowerCase().includes(q) ||
      i.customer_name?.toLowerCase().includes(q) ||
      i.customer_name_ar?.includes(q) ||
      i.production_order_number?.toLowerCase().includes(q)
    );
  }, [issues, searchText]);

  const getSeverityBadge = (severity: string) => {
    const opt = SEVERITY_OPTIONS.find(s => s.value === severity);
    return <Badge className={opt?.color || ""}>{opt?.label || severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    return <Badge className={opt?.color || ""}>{opt?.label || status}</Badge>;
  };

  const getSourceLabel = (source: string) => {
    const opt = SOURCE_OPTIONS.find(s => s.value === source);
    return opt?.label || source;
  };

  const getCategoryLabel = (cat: string) => {
    const opt = CATEGORY_OPTIONS.find(c => c.value === cat);
    return opt?.label || cat;
  };

  return (
    <PageLayout
      title="إدارة الجودة"
      description="متابعة مشاكل الإنتاج والشكاوى واتخاذ الإجراءات التصحيحية"
      actions={
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          تسجيل مشكلة جديدة
        </Button>
      }
    >
      <div className="space-y-6" dir="rtl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-r-4 border-r-slate-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">إجمالي المشاكل</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-red-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">مفتوحة</p>
                  <p className="text-2xl font-bold text-red-600">{(stats.byStatus?.open || 0) + (stats.byStatus?.investigating || 0)}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-green-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">تم الحل</p>
                  <p className="text-2xl font-bold text-green-600">{stats.byStatus?.resolved || 0}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-300" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-r-4 border-r-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">شكاوى العملاء</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.bySource?.customer_complaint || 0}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-orange-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="issues" className="py-2.5 gap-2">
              <ShieldAlert className="w-4 h-4" />
              سجل المشاكل
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="py-2.5 gap-2">
              <Activity className="w-4 h-4" />
              لوحة التحليل
            </TabsTrigger>
          </TabsList>

          <TabsContent value="issues" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم المشكلة، الوصف، العميل..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pr-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={(v) => setFilterSource(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="المصدر" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v === "all" ? "" : v)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="الخطورة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {SEVERITY_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">رقم المشكلة</TableHead>
                      <TableHead className="font-semibold">المصدر</TableHead>
                      <TableHead className="font-semibold">التصنيف</TableHead>
                      <TableHead className="font-semibold">الخطورة</TableHead>
                      <TableHead className="font-semibold">الحالة</TableHead>
                      <TableHead className="font-semibold">العميل</TableHead>
                      <TableHead className="font-semibold">أمر الإنتاج</TableHead>
                      <TableHead className="font-semibold">المرحلة</TableHead>
                      <TableHead className="font-semibold">التاريخ</TableHead>
                      <TableHead className="font-semibold text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {issuesLoading ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12">
                          <Activity className="h-8 w-8 mx-auto mb-2 animate-pulse text-primary" />
                          جاري التحميل...
                        </TableCell>
                      </TableRow>
                    ) : filteredIssues.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                          <ShieldCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          لا توجد مشاكل مسجلة
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredIssues.map((issue: any) => (
                        <TableRow key={issue.id} className="hover:bg-muted/50">
                          <TableCell className="font-bold text-primary">{issue.issue_number}</TableCell>
                          <TableCell>{getSourceLabel(issue.source)}</TableCell>
                          <TableCell>{getCategoryLabel(issue.category)}</TableCell>
                          <TableCell>{getSeverityBadge(issue.severity)}</TableCell>
                          <TableCell>{getStatusBadge(issue.status)}</TableCell>
                          <TableCell>{ln(issue.customer_name_ar, issue.customer_name) || "-"}</TableCell>
                          <TableCell>{issue.production_order_number || "-"}</TableCell>
                          <TableCell>{STAGE_OPTIONS.find(s => s.value === issue.stage)?.label || "-"}</TableCell>
                          <TableCell className="text-sm">{issue.created_at ? new Date(issue.created_at).toLocaleDateString("ar") : "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="sm" title="عرض التفاصيل" onClick={() => setSelectedIssueId(issue.id)}>
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="sm" title="تعديل" onClick={() => setEditIssueId(issue.id)}>
                                <Edit className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button variant="ghost" size="sm" title="طباعة" onClick={() => setPrintIssueId(issue.id)}>
                                <Printer className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button variant="ghost" size="sm" title="حذف" onClick={() => setDeleteIssueId(issue.id)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">حسب التصنيف</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.byCategory || {}).sort((a: any, b: any) => b[1] - a[1]).map(([cat, count]: any) => (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-sm">{getCategoryLabel(cat)}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                          </div>
                          <span className="text-sm font-bold w-8 text-left">{count}</span>
                        </div>
                      </div>
                    ))}
                    {Object.keys(stats.byCategory || {}).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">لا توجد بيانات</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">حسب الخطورة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {SEVERITY_OPTIONS.map(sev => {
                      const count = stats.bySeverity?.[sev.value] || 0;
                      return (
                        <div key={sev.value} className="flex items-center justify-between">
                          <Badge className={sev.color}>{sev.label}</Badge>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div className="bg-primary h-2 rounded-full" style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                            </div>
                            <span className="text-sm font-bold w-8 text-left">{count}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">حسب المصدر</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {SOURCE_OPTIONS.map(src => {
                      const count = stats.bySource?.[src.value] || 0;
                      const Icon = src.icon;
                      return (
                        <div key={src.value} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{src.label}</span>
                          </div>
                          <span className="text-lg font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">حسب الحالة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {STATUS_OPTIONS.map(st => {
                      const count = stats.byStatus?.[st.value] || 0;
                      return (
                        <div key={st.value} className="flex items-center justify-between">
                          <Badge className={st.color}>{st.label}</Badge>
                          <span className="text-lg font-bold">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CreateIssueDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        customers={customersList}
        users={usersList}
        prodOrders={prodOrders}
        orders={ordersList}
        ln={ln}
      />

      {selectedIssueId && (
        <IssueDetailDialog
          issueId={selectedIssueId}
          open={!!selectedIssueId}
          onClose={() => setSelectedIssueId(null)}
          users={usersList}
          ln={ln}
        />
      )}

      {editIssueId && (
        <EditIssueDialog
          issueId={editIssueId}
          open={!!editIssueId}
          onClose={() => setEditIssueId(null)}
          customers={customersList}
          users={usersList}
          prodOrders={prodOrders}
          orders={ordersList}
          ln={ln}
        />
      )}

      {printIssueId && (
        <PrintIssueDialog
          issueId={printIssueId}
          open={!!printIssueId}
          onClose={() => setPrintIssueId(null)}
          ln={ln}
        />
      )}

      <Dialog open={!!deleteIssueId} onOpenChange={() => setDeleteIssueId(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              تأكيد حذف المشكلة
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذه المشكلة؟ سيتم حذف جميع البيانات المرتبطة بها بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteIssueId(null)}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={() => deleteIssueId && deleteMutation.mutate(deleteIssueId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "تأكيد الحذف"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

function CreateIssueDialog({ open, onClose, customers, users, prodOrders, orders, ln }: any) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    source: "inspection",
    severity: "medium",
    category: "",
    stage: "",
    production_order_id: "",
    order_id: "",
    customer_id: "",
    description: "",
    customer_complaint_details: "",
    detected_by: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/quality-issues", { method: "POST", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تسجيل المشكلة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues/stats"] });
      onClose();
      setForm({
        source: "inspection", severity: "medium", category: "", stage: "",
        production_order_id: "", order_id: "", customer_id: "",
        description: "", customer_complaint_details: "", detected_by: "",
      });
    },
    onError: (err: any) => {
      toast({ title: "خطأ في تسجيل المشكلة", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!form.category || !form.description) {
      toast({ title: "يرجى تعبئة الحقول المطلوبة", variant: "destructive" });
      return;
    }
    const data: any = { ...form };
    if (data.production_order_id) data.production_order_id = parseInt(data.production_order_id);
    else delete data.production_order_id;
    if (data.order_id) data.order_id = parseInt(data.order_id);
    else delete data.order_id;
    if (data.detected_by) data.detected_by = parseInt(data.detected_by);
    else delete data.detected_by;
    if (!data.customer_id) delete data.customer_id;
    if (!data.stage) delete data.stage;
    if (!data.customer_complaint_details) delete data.customer_complaint_details;
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-500" />
            تسجيل مشكلة جودة جديدة
          </DialogTitle>
          <DialogDescription>سجل تفاصيل المشكلة والأطراف المعنية</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>مصدر المشكلة *</Label>
              <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>درجة الخطورة *</Label>
              <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تصنيف المشكلة *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المرحلة</Label>
              <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>العميل</Label>
              <SearchableSelect
                options={customers.map((c: any) => ({ value: String(c.id), label: ln(c.name_ar, c.name) || String(c.id) }))}
                value={form.customer_id}
                onValueChange={v => setForm({ ...form, customer_id: v, order_id: "", production_order_id: "" })}
                placeholder="اختر العميل"
                searchPlaceholder="ابحث عن عميل..."
              />
            </div>
            <div className="space-y-2">
              <Label>الطلبية</Label>
              <SearchableSelect
                options={orders.filter((o: any) => String(o.customer_id) === form.customer_id).map((o: any) => ({ value: String(o.id), label: o.order_number }))}
                value={form.order_id}
                onValueChange={v => setForm({ ...form, order_id: v, production_order_id: "" })}
                placeholder={form.customer_id ? "اختر الطلبية" : "اختر العميل أولاً"}
                searchPlaceholder="ابحث عن طلبية..."
                disabled={!form.customer_id}
              />
            </div>
            <div className="space-y-2">
              <Label>أمر الإنتاج</Label>
              <SearchableSelect
                options={prodOrders.filter((po: any) => String(po.order_id) === form.order_id).map((po: any) => ({ value: String(po.id), label: po.production_order_number }))}
                value={form.production_order_id}
                onValueChange={v => setForm({ ...form, production_order_id: v })}
                placeholder={form.order_id ? "اختر أمر الإنتاج" : "اختر الطلبية أولاً"}
                searchPlaceholder="ابحث عن أمر إنتاج..."
                disabled={!form.order_id}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>تم الكشف بواسطة</Label>
            <SearchableSelect
              options={users.map((u: any) => ({ value: String(u.id), label: ln(u.display_name_ar, u.display_name) || u.username }))}
              value={form.detected_by}
              onValueChange={v => setForm({ ...form, detected_by: v })}
              placeholder="اختر الموظف"
              searchPlaceholder="ابحث عن موظف..."
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>وصف المشكلة *</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="اشرح المشكلة بالتفصيل..."
              rows={3}
            />
          </div>

          {form.source === "customer_complaint" && (
            <div className="space-y-2">
              <Label>تفاصيل شكوى العميل</Label>
              <Textarea
                value={form.customer_complaint_details}
                onChange={e => setForm({ ...form, customer_complaint_details: e.target.value })}
                placeholder="وصف الشكوى كما وردت من العميل..."
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "جاري الحفظ..." : "تسجيل المشكلة"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkflowProgress({ issue }: { issue: any }) {
  const completedSteps = WORKFLOW_STEPS.filter(step => step.check(issue)).length;
  const progress = Math.round((completedSteps / WORKFLOW_STEPS.length) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">مسار متابعة المشكلة</h3>
        <Badge variant="outline" className="text-xs">
          {completedSteps}/{WORKFLOW_STEPS.length} خطوات مكتملة ({progress}%)
        </Badge>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            background: progress === 100 ? '#16a34a' : progress >= 50 ? '#eab308' : '#ef4444'
          }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {WORKFLOW_STEPS.map((step, idx) => {
          const done = step.check(issue);
          const Icon = step.icon;
          return (
            <div
              key={step.key}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-center transition-colors ${
                done ? 'bg-green-50 dark:bg-green-950 border border-green-200' : 'bg-muted/30 border border-transparent'
              }`}
            >
              <div className={`rounded-full p-1.5 ${done ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              </div>
              <span className={`text-[10px] leading-tight ${done ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IssueDetailDialog({ issueId, open, onClose, users, ln }: any) {
  const { toast } = useToast();
  const [showAddResponsible, setShowAddResponsible] = useState(false);
  const [showAddAction, setShowAddAction] = useState(false);

  const { data: issueData, isLoading } = useQuery<any>({
    queryKey: ["/api/quality-issues", issueId],
    enabled: !!issueId,
  });

  const issue = issueData?.data || issueData;
  const responsibles = issue?.responsibles || [];
  const actions = issue?.actions || [];

  const updateIssueMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/quality-issues/${issueId}`, { method: "PATCH", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم التحديث بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues", issueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues/stats"] });
    },
  });

  const addResponsibleMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/quality-issues/${issueId}/responsibles`, { method: "POST", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم إضافة المتسبب" });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues", issueId] });
      setShowAddResponsible(false);
    },
  });

  const deleteResponsibleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/quality-issues/responsibles/${id}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم حذف المتسبب" });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues", issueId] });
    },
  });

  const addActionMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/quality-issues/${issueId}/actions`, { method: "POST", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم إضافة الإجراء" });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues", issueId] });
      setShowAddAction(false);
    },
  });

  const updateActionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest(`/api/quality-issues/actions/${id}`, { method: "PATCH", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث الإجراء" });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues", issueId] });
    },
  });

  if (isLoading || !issue) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl" dir="rtl">
          <div className="flex items-center justify-center h-32">
            <Activity className="h-8 w-8 animate-pulse text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getCategoryLabel = (cat: string) => CATEGORY_OPTIONS.find(c => c.value === cat)?.label || cat;
  const getSourceLabel = (src: string) => SOURCE_OPTIONS.find(s => s.value === src)?.label || src;
  const getStageName = (stage: string) => STAGE_OPTIONS.find(s => s.value === stage)?.label || stage;
  const getSeverityBadge = (sev: string) => {
    const opt = SEVERITY_OPTIONS.find(s => s.value === sev);
    return <Badge className={opt?.color || ""}>{opt?.label || sev}</Badge>;
  };
  const getStatusBadge = (st: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === st);
    return <Badge className={opt?.color || ""}>{opt?.label || st}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            {issue.issue_number}
            {getSeverityBadge(issue.severity)}
            {getStatusBadge(issue.status)}
          </DialogTitle>
          <DialogDescription>{getCategoryLabel(issue.category)} - {getSourceLabel(issue.source)}</DialogDescription>
        </DialogHeader>

        <WorkflowProgress issue={issue} />

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="grid grid-cols-6 h-auto">
            <TabsTrigger value="details" className="py-2 text-xs gap-1">
              <FileText className="h-3.5 w-3.5" />
              التفاصيل
            </TabsTrigger>
            <TabsTrigger value="responsibles" className="py-2 text-xs gap-1">
              <Users className="h-3.5 w-3.5" />
              المتسببون ({responsibles.length})
            </TabsTrigger>
            <TabsTrigger value="actions" className="py-2 text-xs gap-1">
              <ClipboardList className="h-3.5 w-3.5" />
              الإجراءات ({actions.length})
            </TabsTrigger>
            <TabsTrigger value="preventive" className="py-2 text-xs gap-1">
              <Shield className="h-3.5 w-3.5" />
              وقائية
            </TabsTrigger>
            <TabsTrigger value="losses" className="py-2 text-xs gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              الخسائر
            </TabsTrigger>
            <TabsTrigger value="customer" className="py-2 text-xs gap-1">
              <MessageSquare className="h-3.5 w-3.5" />
              العميل
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">المصدر:</span><span className="font-medium">{getSourceLabel(issue.source)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">التصنيف:</span><span className="font-medium">{getCategoryLabel(issue.category)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">المرحلة:</span><span className="font-medium">{issue.stage ? getStageName(issue.stage) : "-"}</span></div>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">الطلبية:</span><span className="font-medium">{issue.order_number || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">أمر الإنتاج:</span><span className="font-medium">{issue.production_order_number || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">العميل:</span><span className="font-medium">{ln(issue.customer_name_ar, issue.customer_name) || "-"}</span></div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">وصف المشكلة</Label>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 rounded-lg p-3 text-sm">{issue.description}</div>
            </div>

            <Separator />

            <div className="flex items-center gap-3">
              <Label className="text-sm font-semibold">تغيير الحالة:</Label>
              <Select
                value={issue.status}
                onValueChange={(v) => {
                  const data: any = { status: v };
                  if (v === "resolved") { data.resolved_at = new Date().toISOString(); }
                  updateIssueMutation.mutate(data);
                }}
              >
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <EditableSection
              title="السبب الجذري"
              value={issue.root_cause || ""}
              field="root_cause"
              onSave={(data: any) => updateIssueMutation.mutate(data)}
              saving={updateIssueMutation.isPending}
            />

            <EditableSection
              title="الإجراء التصحيحي"
              value={issue.corrective_action || ""}
              field="corrective_action"
              onSave={(data: any) => updateIssueMutation.mutate(data)}
              saving={updateIssueMutation.isPending}
            />

            <div className="text-xs text-muted-foreground flex items-center gap-4 pt-2">
              <span>كشف بواسطة: {ln(issue.detected_by_name_ar, issue.detected_by_name) || "-"}</span>
              <span>تاريخ الكشف: {issue.detected_at ? new Date(issue.detected_at).toLocaleDateString("ar") : "-"}</span>
              {issue.resolved_at && <span>تاريخ الحل: {new Date(issue.resolved_at).toLocaleDateString("ar")}</span>}
            </div>
          </TabsContent>

          <TabsContent value="responsibles" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                المتسببون في المشكلة والإجراءات المتخذة
              </h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddResponsible(true)} className="gap-1">
                <Plus className="h-3 w-3" />
                إضافة متسبب
              </Button>
            </div>

            {responsibles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>لم يتم تحديد متسببين بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {responsibles.map((r: any) => (
                  <Card key={r.id} className="border-r-4 border-r-orange-400">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <UserCheck className="h-4 w-4 text-orange-500" />
                            <span className="font-bold">{ln(r.user_name_ar, r.user_name)}</span>
                            <Badge variant="outline">{DEPARTMENT_OPTIONS.find(d => d.value === r.department)?.label || r.department}</Badge>
                            <Badge variant={r.responsibility_type === "primary" ? "default" : "secondary"}>
                              {r.responsibility_type === "primary" ? "رئيسي" : r.responsibility_type === "secondary" ? "ثانوي" : "إشرافي"}
                            </Badge>
                          </div>
                          {r.action_taken && (
                            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded p-2 text-sm">
                              <span className="font-medium text-blue-700 dark:text-blue-300">الإجراء المتخذ:</span> {r.action_taken}
                            </div>
                          )}
                          <div className="flex items-center gap-4 flex-wrap">
                            {r.penalty_type && r.penalty_type !== "none" && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">العقوبة:</span>
                                <Badge className="bg-red-100 text-red-800">{PENALTY_OPTIONS.find(p => p.value === r.penalty_type)?.label || r.penalty_type}</Badge>
                              </div>
                            )}
                            {r.deduction_amount && (
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-medium">مبلغ الخصم:</span>
                                <Badge className="bg-purple-100 text-purple-800">{r.deduction_amount} ر.س</Badge>
                              </div>
                            )}
                          </div>
                          {r.notes && <p className="text-xs text-muted-foreground">ملاحظات: {r.notes}</p>}
                        </div>
                        <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteResponsibleMutation.mutate(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {showAddResponsible && (
              <AddResponsibleForm
                users={users}
                ln={ln}
                onSubmit={(data: any) => addResponsibleMutation.mutate(data)}
                onCancel={() => setShowAddResponsible(false)}
                saving={addResponsibleMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="actions" className="space-y-4 mt-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                الإجراءات التصحيحية والمتابعة
              </h3>
              <Button size="sm" variant="outline" onClick={() => setShowAddAction(true)} className="gap-1">
                <Plus className="h-3 w-3" />
                إضافة إجراء
              </Button>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>لم يتم تسجيل إجراءات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((a: any, idx: number) => (
                  <Card key={a.id} className={`border-r-4 ${a.status === "completed" ? "border-r-green-400" : "border-r-yellow-400"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              a.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                            }`}>
                              {idx + 1}
                            </div>
                            <Badge variant="outline">{ACTION_TYPE_OPTIONS.find(t => t.value === a.action_type)?.label || a.action_type}</Badge>
                            <Badge className={a.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                              {a.status === "completed" ? "مكتمل" : "قيد التنفيذ"}
                            </Badge>
                            {a.due_date && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                موعد: {new Date(a.due_date).toLocaleDateString("ar")}
                              </span>
                            )}
                          </div>
                          <p className="text-sm pr-8">{a.description}</p>
                          <div className="text-xs text-muted-foreground flex items-center gap-3 pr-8">
                            <span>بواسطة: {ln(a.performed_by_name_ar, a.performed_by_name) || "-"}</span>
                            <span>{a.created_at ? new Date(a.created_at).toLocaleDateString("ar") : ""}</span>
                            {a.completed_at && <span className="text-green-600">تم الإكمال: {new Date(a.completed_at).toLocaleDateString("ar")}</span>}
                          </div>
                        </div>
                        {a.status !== "completed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600"
                            onClick={() => updateActionMutation.mutate({ id: a.id, data: { status: "completed", completed_at: new Date().toISOString() } })}
                          >
                            <CheckCircle2 className="h-4 w-4 ml-1" />
                            إتمام
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {showAddAction && (
              <AddActionForm
                users={users}
                ln={ln}
                onSubmit={(data: any) => addActionMutation.mutate(data)}
                onCancel={() => setShowAddAction(false)}
                saving={addActionMutation.isPending}
              />
            )}
          </TabsContent>

          <TabsContent value="preventive" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-300">
                  <Shield className="h-4 w-4" />
                  الإجراءات الوقائية لمنع تكرار المشكلة
                </h3>
                <EditableSection
                  title="الإجراء الوقائي"
                  value={issue.preventive_action || ""}
                  field="preventive_action"
                  onSave={(data: any) => updateIssueMutation.mutate(data)}
                  saving={updateIssueMutation.isPending}
                  placeholder="صف الإجراءات الوقائية التي تم اتخاذها لمنع تكرار هذه المشكلة مستقبلاً..."
                />
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-sm">إجراءات وقائية مقترحة:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {[
                    "تدريب الموظفين المعنيين",
                    "تحديث إجراءات العمل القياسية",
                    "إضافة نقطة فحص جديدة",
                    "تحسين نظام الرقابة",
                    "تغيير المورّد/الخامات",
                    "صيانة المعدات",
                  ].map(suggestion => (
                    <div key={suggestion} className="flex items-center gap-2 text-muted-foreground">
                      <CircleDot className="h-3 w-3 shrink-0" />
                      {suggestion}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="losses" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-sm flex items-center gap-2 mb-3 text-purple-700 dark:text-purple-300">
                  <DollarSign className="h-4 w-4" />
                  تقدير الخسائر المالية
                </h3>
                <div className="space-y-3">
                  <EditableSection
                    title="قيمة الخسائر المقدرة (ر.س)"
                    value={issue.estimated_loss || ""}
                    field="estimated_loss"
                    onSave={(data: any) => updateIssueMutation.mutate(data)}
                    saving={updateIssueMutation.isPending}
                    placeholder="أدخل قيمة الخسائر المقدرة..."
                    isInline
                  />
                  <EditableSection
                    title="تفاصيل الخسائر"
                    value={issue.loss_details || ""}
                    field="loss_details"
                    onSave={(data: any) => updateIssueMutation.mutate(data)}
                    saving={updateIssueMutation.isPending}
                    placeholder="فصّل الخسائر: مواد خام، وقت إنتاج ضائع، تكلفة إعادة التصنيع..."
                  />
                </div>
              </div>

              {responsibles.length > 0 && (
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-sm mb-3">ملخص الخصومات على المتسببين:</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold">الموظف</TableHead>
                        <TableHead className="font-semibold">القسم</TableHead>
                        <TableHead className="font-semibold">العقوبة</TableHead>
                        <TableHead className="font-semibold">مبلغ الخصم</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responsibles.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{ln(r.user_name_ar, r.user_name)}</TableCell>
                          <TableCell>{DEPARTMENT_OPTIONS.find(d => d.value === r.department)?.label || r.department}</TableCell>
                          <TableCell>
                            {r.penalty_type && r.penalty_type !== "none"
                              ? <Badge className="bg-red-100 text-red-800">{PENALTY_OPTIONS.find(p => p.value === r.penalty_type)?.label}</Badge>
                              : <span className="text-muted-foreground">-</span>
                            }
                          </TableCell>
                          <TableCell>{r.deduction_amount ? `${r.deduction_amount} ر.س` : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="customer" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  معلومات العميل
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">العميل:</span> <span className="font-medium">{ln(issue.customer_name_ar, issue.customer_name) || "غير محدد"}</span></div>
                  <div><span className="text-muted-foreground">الطلبية:</span> <span className="font-medium">{issue.order_number || "غير محدد"}</span></div>
                </div>
              </div>

              {issue.source === "customer_complaint" && issue.customer_complaint_details && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">تفاصيل شكوى العميل</Label>
                  <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 rounded-lg p-3 text-sm">{issue.customer_complaint_details}</div>
                </div>
              )}

              <EditableSection
                title="الإجراء المتخذ مع العميل"
                value={issue.customer_action_taken || ""}
                field="customer_action_taken"
                onSave={(data: any) => updateIssueMutation.mutate(data)}
                saving={updateIssueMutation.isPending}
                placeholder="مثال: تم التواصل مع العميل وتعويضه بكمية بديلة..."
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EditIssueDialog({ issueId, open, onClose, customers, users, prodOrders, orders, ln }: any) {
  const { toast } = useToast();
  const { data: issueData, isLoading } = useQuery<any>({
    queryKey: ["/api/quality-issues", issueId],
    enabled: !!issueId,
  });

  const issue = issueData?.data || issueData;

  const [form, setForm] = useState<any>(null);

  if (issue && !form) {
    setForm({
      source: issue.source || "inspection",
      severity: issue.severity || "medium",
      category: issue.category || "",
      stage: issue.stage || "",
      description: issue.description || "",
      customer_complaint_details: issue.customer_complaint_details || "",
      customer_id: issue.customer_id || "",
      order_id: issue.order_id ? String(issue.order_id) : "",
      production_order_id: issue.production_order_id ? String(issue.production_order_id) : "",
      detected_by: issue.detected_by ? String(issue.detected_by) : "",
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/quality-issues/${issueId}`, { method: "PATCH", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "تم تحديث المشكلة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues", issueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues"] });
      queryClient.invalidateQueries({ queryKey: ["/api/quality-issues/stats"] });
      handleClose();
    },
    onError: () => {
      toast({ title: "خطأ في تحديث المشكلة", variant: "destructive" });
    },
  });

  const handleClose = () => {
    setForm(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!form) return;
    const data: any = { ...form };
    if (data.production_order_id) data.production_order_id = parseInt(data.production_order_id);
    else data.production_order_id = null;
    if (data.order_id) data.order_id = parseInt(data.order_id);
    else data.order_id = null;
    if (data.detected_by) data.detected_by = parseInt(data.detected_by);
    else data.detected_by = null;
    if (!data.customer_id) data.customer_id = null;
    if (!data.stage) data.stage = null;
    if (!data.customer_complaint_details) data.customer_complaint_details = null;
    updateMutation.mutate(data);
  };

  if (isLoading || !form) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <div className="flex items-center justify-center h-32">
            <Activity className="h-8 w-8 animate-pulse text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5 text-amber-500" />
            تعديل المشكلة - {issue?.issue_number}
          </DialogTitle>
          <DialogDescription>تعديل بيانات المشكلة الأساسية</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>مصدر المشكلة *</Label>
              <Select value={form.source} onValueChange={v => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>درجة الخطورة *</Label>
              <Select value={form.severity} onValueChange={v => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تصنيف المشكلة *</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>المرحلة</Label>
              <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
                <SelectContent>
                  {STAGE_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>العميل</Label>
              <SearchableSelect
                options={customers.map((c: any) => ({ value: String(c.id), label: ln(c.name_ar, c.name) || String(c.id) }))}
                value={form.customer_id}
                onValueChange={v => setForm({ ...form, customer_id: v, order_id: "", production_order_id: "" })}
                placeholder="اختر العميل"
                searchPlaceholder="ابحث عن عميل..."
              />
            </div>
            <div className="space-y-2">
              <Label>الطلبية</Label>
              <SearchableSelect
                options={orders.filter((o: any) => String(o.customer_id) === form.customer_id).map((o: any) => ({ value: String(o.id), label: o.order_number }))}
                value={form.order_id}
                onValueChange={v => setForm({ ...form, order_id: v, production_order_id: "" })}
                placeholder="اختر الطلبية"
                searchPlaceholder="ابحث عن طلبية..."
              />
            </div>
            <div className="space-y-2">
              <Label>أمر الإنتاج</Label>
              <SearchableSelect
                options={prodOrders.filter((po: any) => String(po.order_id) === form.order_id).map((po: any) => ({ value: String(po.id), label: po.production_order_number }))}
                value={form.production_order_id}
                onValueChange={v => setForm({ ...form, production_order_id: v })}
                placeholder="اختر أمر الإنتاج"
                searchPlaceholder="ابحث عن أمر إنتاج..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>تم الكشف بواسطة</Label>
            <SearchableSelect
              options={users.map((u: any) => ({ value: String(u.id), label: ln(u.display_name_ar, u.display_name) || u.username }))}
              value={form.detected_by}
              onValueChange={v => setForm({ ...form, detected_by: v })}
              placeholder="اختر الموظف"
              searchPlaceholder="ابحث عن موظف..."
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>وصف المشكلة *</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>

          {form.source === "customer_complaint" && (
            <div className="space-y-2">
              <Label>تفاصيل شكوى العميل</Label>
              <Textarea
                value={form.customer_complaint_details}
                onChange={e => setForm({ ...form, customer_complaint_details: e.target.value })}
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={handleClose}>إلغاء</Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrintIssueDialog({ issueId, open, onClose, ln }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: issueData, isLoading } = useQuery<any>({
    queryKey: ["/api/quality-issues", issueId],
    enabled: !!issueId,
  });

  const issue = issueData?.data || issueData;
  const responsibles = issue?.responsibles || [];
  const actions = issue?.actions || [];

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html dir="rtl">
      <head>
        <title>تقرير مشكلة جودة - ${issue?.issue_number}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 20px; direction: rtl; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #1a56db; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { margin: 0; color: #1a56db; font-size: 22px; }
          .header h2 { margin: 5px 0 0; color: #666; font-size: 16px; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; margin: 0 3px; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .badge-yellow { background: #fef3c7; color: #92400e; }
          .badge-green { background: #dcfce7; color: #166534; }
          .badge-blue { background: #dbeafe; color: #1e40af; }
          .badge-gray { background: #f3f4f6; color: #374151; }
          .section { margin: 15px 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
          .section-title { font-weight: bold; font-size: 14px; color: #1a56db; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          .info-item { font-size: 13px; }
          .info-label { color: #666; }
          .info-value { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
          th { background: #f3f4f6; padding: 8px; text-align: right; font-weight: 600; border: 1px solid #e5e7eb; }
          td { padding: 8px; border: 1px solid #e5e7eb; }
          .desc-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 10px; margin: 8px 0; font-size: 13px; }
          .text-box { background: #f9fafb; border-radius: 6px; padding: 8px; margin: 5px 0; font-size: 13px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 40px; text-align: center; }
          .sig-box { border-top: 1px solid #333; padding-top: 5px; font-size: 12px; }
          @media print { body { margin: 10px; } }
        </style>
      </head>
      <body>${content.innerHTML}
        <div class="footer">تم طباعة هذا التقرير بتاريخ ${new Date().toLocaleDateString("ar")} - نظام إدارة الجودة</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (isLoading || !issue) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl" dir="rtl">
          <div className="flex items-center justify-center h-32">
            <Activity className="h-8 w-8 animate-pulse text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getSeverityLabel = (s: string) => SEVERITY_OPTIONS.find(o => o.value === s)?.label || s;
  const getStatusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;
  const getCategoryLabel = (s: string) => CATEGORY_OPTIONS.find(o => o.value === s)?.label || s;
  const getSourceLabel = (s: string) => SOURCE_OPTIONS.find(o => o.value === s)?.label || s;
  const getStageName = (s: string) => STAGE_OPTIONS.find(o => o.value === s)?.label || s;
  const sevClass = issue.severity === "critical" ? "badge-red" : issue.severity === "high" ? "badge-yellow" : issue.severity === "medium" ? "badge-yellow" : "badge-blue";
  const stClass = issue.status === "open" ? "badge-red" : issue.status === "investigating" ? "badge-yellow" : issue.status === "resolved" ? "badge-green" : "badge-gray";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[94vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-green-600" />
            معاينة الطباعة - {issue.issue_number}
          </DialogTitle>
          <DialogDescription>معاينة التقرير قبل الطباعة</DialogDescription>
        </DialogHeader>

        <div className="flex justify-end">
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            طباعة التقرير
          </Button>
        </div>

        <div ref={printRef} className="border rounded-lg p-4 bg-white text-black text-sm">
          <div className="header">
            <h1>تقرير مشكلة جودة</h1>
            <h2>{issue.issue_number} - {getCategoryLabel(issue.category)}</h2>
            <div style={{ marginTop: "8px" }}>
              <span className={`badge ${sevClass}`}>{getSeverityLabel(issue.severity)}</span>
              <span className={`badge ${stClass}`}>{getStatusLabel(issue.status)}</span>
            </div>
          </div>

          <div className="section">
            <div className="section-title">البيانات الأساسية</div>
            <div className="info-grid">
              <div className="info-item"><span className="info-label">المصدر: </span><span className="info-value">{getSourceLabel(issue.source)}</span></div>
              <div className="info-item"><span className="info-label">التصنيف: </span><span className="info-value">{getCategoryLabel(issue.category)}</span></div>
              <div className="info-item"><span className="info-label">المرحلة: </span><span className="info-value">{issue.stage ? getStageName(issue.stage) : "-"}</span></div>
              <div className="info-item"><span className="info-label">العميل: </span><span className="info-value">{ln(issue.customer_name_ar, issue.customer_name) || "-"}</span></div>
              <div className="info-item"><span className="info-label">الطلبية: </span><span className="info-value">{issue.order_number || "-"}</span></div>
              <div className="info-item"><span className="info-label">أمر الإنتاج: </span><span className="info-value">{issue.production_order_number || "-"}</span></div>
              <div className="info-item"><span className="info-label">تاريخ الكشف: </span><span className="info-value">{issue.detected_at ? new Date(issue.detected_at).toLocaleDateString("ar") : "-"}</span></div>
              <div className="info-item"><span className="info-label">كشف بواسطة: </span><span className="info-value">{ln(issue.detected_by_name_ar, issue.detected_by_name) || "-"}</span></div>
            </div>
          </div>

          <div className="section">
            <div className="section-title">وصف المشكلة</div>
            <div className="desc-box">{issue.description}</div>
          </div>

          {issue.root_cause && (
            <div className="section">
              <div className="section-title">السبب الجذري</div>
              <div className="text-box">{issue.root_cause}</div>
            </div>
          )}

          {issue.corrective_action && (
            <div className="section">
              <div className="section-title">الإجراء التصحيحي</div>
              <div className="text-box">{issue.corrective_action}</div>
            </div>
          )}

          {issue.preventive_action && (
            <div className="section">
              <div className="section-title">الإجراء الوقائي</div>
              <div className="text-box">{issue.preventive_action}</div>
            </div>
          )}

          {(issue.estimated_loss || issue.loss_details) && (
            <div className="section">
              <div className="section-title">تقدير الخسائر</div>
              {issue.estimated_loss && <div className="info-item" style={{ marginBottom: "5px" }}><span className="info-label">قيمة الخسائر: </span><span className="info-value">{issue.estimated_loss} ر.س</span></div>}
              {issue.loss_details && <div className="text-box">{issue.loss_details}</div>}
            </div>
          )}

          {responsibles.length > 0 && (
            <div className="section">
              <div className="section-title">المتسببون في المشكلة</div>
              <table>
                <thead>
                  <tr>
                    <th>الموظف</th>
                    <th>القسم</th>
                    <th>نوع المسؤولية</th>
                    <th>العقوبة</th>
                    <th>مبلغ الخصم</th>
                    <th>الإجراء المتخذ</th>
                  </tr>
                </thead>
                <tbody>
                  {responsibles.map((r: any) => (
                    <tr key={r.id}>
                      <td>{ln(r.user_name_ar, r.user_name)}</td>
                      <td>{DEPARTMENT_OPTIONS.find(d => d.value === r.department)?.label || r.department}</td>
                      <td>{r.responsibility_type === "primary" ? "رئيسي" : r.responsibility_type === "secondary" ? "ثانوي" : "إشرافي"}</td>
                      <td>{r.penalty_type && r.penalty_type !== "none" ? PENALTY_OPTIONS.find(p => p.value === r.penalty_type)?.label : "-"}</td>
                      <td>{r.deduction_amount ? `${r.deduction_amount} ر.س` : "-"}</td>
                      <td>{r.action_taken || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {actions.length > 0 && (
            <div className="section">
              <div className="section-title">الإجراءات المتخذة</div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>النوع</th>
                    <th>الوصف</th>
                    <th>المنفذ</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a: any, idx: number) => (
                    <tr key={a.id}>
                      <td>{idx + 1}</td>
                      <td>{ACTION_TYPE_OPTIONS.find(t => t.value === a.action_type)?.label || a.action_type}</td>
                      <td>{a.description}</td>
                      <td>{ln(a.performed_by_name_ar, a.performed_by_name) || "-"}</td>
                      <td>{a.status === "completed" ? "مكتمل" : "قيد التنفيذ"}</td>
                      <td>{a.created_at ? new Date(a.created_at).toLocaleDateString("ar") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {issue.customer_action_taken && (
            <div className="section">
              <div className="section-title">الإجراء المتخذ مع العميل</div>
              <div className="text-box">{issue.customer_action_taken}</div>
            </div>
          )}

          <div className="signatures">
            <div><div className="sig-box">مسؤول الجودة</div></div>
            <div><div className="sig-box">مدير الإنتاج</div></div>
            <div><div className="sig-box">المدير العام</div></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditableSection({ title, value, field, onSave, saving, placeholder, isInline }: any) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">{title}</Label>
        {!editing ? (
          <Button variant="ghost" size="sm" onClick={() => { setText(value); setEditing(true); }}>
            <Edit className="h-3 w-3 ml-1" />
            تعديل
          </Button>
        ) : (
          <div className="flex gap-1">
            <Button size="sm" onClick={() => { onSave({ [field]: text }); setEditing(false); }} disabled={saving}>حفظ</Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>إلغاء</Button>
          </div>
        )}
      </div>
      {editing ? (
        isInline ? (
          <Input value={text} onChange={e => setText(e.target.value)} placeholder={placeholder} />
        ) : (
          <Textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder={placeholder} />
        )
      ) : (
        <div className="bg-muted/30 rounded-lg p-3 text-sm min-h-[40px]">
          {value || <span className="text-muted-foreground">{placeholder || "لم يتم التحديد بعد"}</span>}
        </div>
      )}
    </div>
  );
}

function AddResponsibleForm({ users, ln, onSubmit, onCancel, saving }: any) {
  const [form, setForm] = useState({
    user_id: "",
    department: "",
    responsibility_type: "primary",
    action_taken: "",
    penalty_type: "none",
    deduction_amount: "",
    notes: "",
  });

  return (
    <Card className="border-2 border-dashed border-primary/30">
      <CardContent className="p-4 space-y-3">
        <h4 className="font-semibold text-sm">إضافة متسبب جديد</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">الموظف *</Label>
            <SearchableSelect
              options={users.map((u: any) => ({ value: String(u.id), label: ln(u.display_name_ar, u.display_name) || u.username }))}
              value={form.user_id}
              onValueChange={v => setForm({ ...form, user_id: v })}
              placeholder="اختر الموظف"
              searchPlaceholder="ابحث عن موظف..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">القسم *</Label>
            <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
              <SelectTrigger><SelectValue placeholder="اختر القسم" /></SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">نوع المسؤولية</Label>
            <Select value={form.responsibility_type} onValueChange={v => setForm({ ...form, responsibility_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">رئيسي</SelectItem>
                <SelectItem value="secondary">ثانوي</SelectItem>
                <SelectItem value="supervisory">إشرافي</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">العقوبة</Label>
            <Select value={form.penalty_type} onValueChange={v => setForm({ ...form, penalty_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PENALTY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        {form.penalty_type === "deduction" && (
          <div className="space-y-1">
            <Label className="text-xs">مبلغ الخصم (ر.س)</Label>
            <Input
              value={form.deduction_amount}
              onChange={e => setForm({ ...form, deduction_amount: e.target.value })}
              placeholder="أدخل مبلغ الخصم..."
              type="text"
            />
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">الإجراء المتخذ مع المتسبب</Label>
          <Textarea value={form.action_taken} onChange={e => setForm({ ...form, action_taken: e.target.value })} rows={2} placeholder="مثال: تم إنذاره شفوياً..." />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">ملاحظات</Label>
          <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية..." />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
          <Button
            size="sm"
            disabled={!form.user_id || !form.department || saving}
            onClick={() => {
              const data: any = { ...form, user_id: parseInt(form.user_id) };
              if (!data.deduction_amount) delete data.deduction_amount;
              onSubmit(data);
            }}
          >
            {saving ? "جاري الحفظ..." : "إضافة"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddActionForm({ users, ln, onSubmit, onCancel, saving }: any) {
  const [form, setForm] = useState({
    action_type: "corrective",
    description: "",
    performed_by: "",
    status: "pending",
    due_date: "",
  });

  return (
    <Card className="border-2 border-dashed border-primary/30">
      <CardContent className="p-4 space-y-3">
        <h4 className="font-semibold text-sm">إضافة إجراء جديد</h4>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">نوع الإجراء *</Label>
            <Select value={form.action_type} onValueChange={v => setForm({ ...form, action_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_TYPE_OPTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">المنفذ</Label>
            <SearchableSelect
              options={users.map((u: any) => ({ value: String(u.id), label: ln(u.display_name_ar, u.display_name) || u.username }))}
              value={form.performed_by}
              onValueChange={v => setForm({ ...form, performed_by: v })}
              placeholder="اختر المنفذ"
              searchPlaceholder="ابحث عن موظف..."
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">الموعد النهائي</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">وصف الإجراء *</Label>
          <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} placeholder="اشرح الإجراء بالتفصيل..." />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>إلغاء</Button>
          <Button
            size="sm"
            disabled={!form.description || saving}
            onClick={() => {
              const data: any = { ...form };
              if (data.performed_by) data.performed_by = parseInt(data.performed_by);
              else delete data.performed_by;
              if (data.due_date) data.due_date = new Date(data.due_date).toISOString();
              else delete data.due_date;
              onSubmit(data);
            }}
          >
            {saving ? "جاري الحفظ..." : "إضافة"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
