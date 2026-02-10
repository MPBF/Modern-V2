import React, { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageLayout from "../components/layout/PageLayout";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Plus,
  FileText,
  AlertCircle,
  Users,
  Eye,
  Printer,
  Edit,
  Trash2,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import {
  generateActionNumber,
  generateMaintenanceReportNumber,
  generateOperatorReportNumber,
} from "../../../shared/id-generator";
import ConsumablePartsTab from "../components/maintenance/ConsumablePartsTab";
import { userHasPermission } from "../utils/roleUtils";
import type { PermissionKey } from "../../../shared/permissions";

// Schema definitions for forms
const maintenanceActionSchema = z.object({
  maintenance_request_id: z.number(),
  action_type: z.string().min(1, "نوع الإجراء مطلوب"),
  description: z.string().min(1, "الوصف مطلوب"),
  text_report: z.string().optional(),
  spare_parts_request: z.string().optional(),
  machining_request: z.string().optional(),
  operator_negligence_report: z.string().optional(),
  performed_by: z.string().min(1, "المنفذ مطلوب"),
  requires_management_action: z.boolean().optional(),
  management_notified: z.boolean().optional(),
});

const maintenanceReportSchema = z.object({
  report_type: z.string().min(1, "نوع البلاغ مطلوب"),
  title: z.string().min(1, "العنوان مطلوب"),
  description: z.string().min(1, "الوصف مطلوب"),
  machine_id: z.string().optional(),
  severity: z.string().default("medium"),
  priority: z.string().default("medium"),
  spare_parts_needed: z.array(z.string()).optional(),
  estimated_repair_time: z.number().optional(),
});

const operatorNegligenceSchema = z.object({
  operator_id: z.string().min(1, "معرف المشغل مطلوب"),
  operator_name: z.string().min(1, "اسم المشغل مطلوب"),
  incident_date: z.string().min(1, "تاريخ الحادث مطلوب"),
  incident_type: z.string().min(1, "نوع الحادث مطلوب"),
  description: z.string().min(1, "الوصف مطلوب"),
  severity: z.string().default("medium"),
  witnesses: z.array(z.string()).optional(),
  immediate_actions_taken: z.string().optional(),
});

const maintenanceRequestSchema = z.object({
  machine_id: z.string().min(1, "المعدة مطلوبة"),
  issue_type: z.string().min(1, "نوع المشكلة مطلوب"),
  urgency_level: z.string().default("normal"),
  description: z.string().min(1, "الوصف مطلوب"),
  assigned_to: z.string().optional(),
});

const maintenanceTabPermissions: { tab: string; permissions: PermissionKey[] }[] = [
  { tab: 'requests', permissions: ['view_maintenance_requests', 'view_maintenance', 'manage_maintenance'] },
  { tab: 'actions', permissions: ['manage_maintenance_actions', 'manage_maintenance'] },
  { tab: 'reports', permissions: ['view_maintenance_reports', 'view_maintenance', 'manage_maintenance'] },
  { tab: 'negligence', permissions: ['manage_negligence', 'manage_maintenance'] },
  { tab: 'spare-parts', permissions: ['manage_spare_parts', 'manage_maintenance'] },
  { tab: 'consumable-parts', permissions: ['manage_consumable_parts', 'manage_maintenance'] },
];

export default function Maintenance() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState(
    maintenanceTabPermissions.find(tp => userHasPermission(user, tp.permissions))?.tab || 'requests'
  );
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(
    null,
  );
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [isActionViewDialogOpen, setIsActionViewDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all data
  const { data: maintenanceRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ["/api/maintenance-requests"],
  });

  const { data: maintenanceActions, isLoading: loadingActions } = useQuery({
    queryKey: ["/api/maintenance-actions"],
  });

  const { data: maintenanceReports, isLoading: loadingReports } = useQuery({
    queryKey: ["/api/maintenance-reports"],
  });

  const { data: operatorReports, isLoading: loadingOperatorReports } = useQuery(
    {
      queryKey: ["/api/operator-negligence-reports"],
    },
  );

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const { data: machines } = useQuery({
    queryKey: ["/api/machines"],
  });

  const { data: spareParts } = useQuery({
    queryKey: ["/api/spare-parts"],
  });

  // Mutations for creating new records
  const createActionMutation = useMutation({
    mutationFn: (data: any) => {
      console.log("Sending maintenance action data:", data);
      return apiRequest("/api/maintenance-actions", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (result) => {
      console.log("Maintenance action created successfully:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-actions"] });
      toast({ title: "تم إنشاء إجراء الصيانة بنجاح" });
    },
    onError: (error) => {
      console.error("Failed to create maintenance action:", error);
      toast({ title: "فشل في إنشاء إجراء الصيانة", variant: "destructive" });
    },
  });

  const createReportMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/maintenance-reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/maintenance-reports"] });
      toast({ title: "تم إنشاء بلاغ الصيانة بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في إنشاء بلاغ الصيانة", variant: "destructive" });
    },
  });

  const createOperatorReportMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/operator-negligence-reports", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/operator-negligence-reports"],
      });
      toast({ title: "تم إنشاء بلاغ إهمال المشغل بنجاح" });
    },
    onError: () => {
      toast({
        title: "فشل في إنشاء بلاغ إهمال المشغل",
        variant: "destructive",
      });
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: (data: any) => {
      // Add current user as reported_by
      const requestData = {
        ...data,
        reported_by: user?.id?.toString() || "",
      };
      return apiRequest("/api/maintenance-requests", {
        method: "POST",
        body: JSON.stringify(requestData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/maintenance-requests"],
      });
      setIsRequestDialogOpen(false);
      toast({ title: "تم إنشاء طلب الصيانة بنجاح" });
    },
    onError: (error) => {
      console.error("Error creating maintenance request:", error);
      toast({ title: "فشل في إنشاء طلب الصيانة", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "قيد الانتظار";
      case "in_progress":
        return "قيد التنفيذ";
      case "completed":
        return "مكتمل";
      case "cancelled":
        return "ملغي";
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case "high":
        return "عالية";
      case "medium":
        return "متوسطة";
      case "low":
        return "منخفضة";
      default:
        return priority;
    }
  };

  return (
    <PageLayout title={t('maintenance.title')} description={t('maintenance.maintenanceType')}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      إجمالي الطلبات
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Array.isArray(maintenanceRequests)
                        ? maintenanceRequests.length
                        : 0}
                    </p>
                  </div>
                  <Wrench className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      قيد الانتظار
                    </p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {Array.isArray(maintenanceRequests)
                        ? maintenanceRequests.filter(
                            (r: any) => r.status === "pending",
                          ).length
                        : 0}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      قيد التنفيذ
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {Array.isArray(maintenanceRequests)
                        ? maintenanceRequests.filter(
                            (r: any) => r.status === "in_progress",
                          ).length
                        : 0}
                    </p>
                  </div>
                  <AlertTriangle className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">مكتملة</p>
                    <p className="text-2xl font-bold text-green-600">
                      {Array.isArray(maintenanceRequests)
                        ? maintenanceRequests.filter(
                            (r: any) => r.status === "completed",
                          ).length
                        : 0}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs */}
          <Tabs
            value={currentTab}
            onValueChange={setCurrentTab}
            className="w-full"
          >
            <TabsList className="flex flex-wrap gap-1 h-auto mb-6">
              {userHasPermission(user, ['view_maintenance_requests', 'view_maintenance', 'manage_maintenance']) && (
                <TabsTrigger value="requests" className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  طلبات الصيانة
                </TabsTrigger>
              )}
              {userHasPermission(user, ['manage_maintenance_actions', 'manage_maintenance']) && (
                <TabsTrigger value="actions" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  إجراءات الصيانة
                </TabsTrigger>
              )}
              {userHasPermission(user, ['view_maintenance_reports', 'view_maintenance', 'manage_maintenance']) && (
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  بلاغات الصيانة
                </TabsTrigger>
              )}
              {userHasPermission(user, ['manage_negligence', 'manage_maintenance']) && (
                <TabsTrigger
                  value="negligence"
                  className="flex items-center gap-2"
                >
                  <AlertCircle className="h-4 w-4" />
                  بلاغات إهمال المشغلين
                </TabsTrigger>
              )}
              {userHasPermission(user, ['manage_spare_parts', 'manage_maintenance']) && (
                <TabsTrigger
                  value="spare-parts"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  قطع الغيار
                </TabsTrigger>
              )}
              {userHasPermission(user, ['manage_consumable_parts', 'manage_maintenance']) && (
                <TabsTrigger
                  value="consumable-parts"
                  className="flex items-center gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  قطع غيار استهلاكية
                </TabsTrigger>
              )}
            </TabsList>

            {/* Maintenance Requests Tab */}
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>طلبات الصيانة</CardTitle>
                    <Dialog
                      open={isRequestDialogOpen}
                      onOpenChange={setIsRequestDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          طلب صيانة جديد
                        </Button>
                      </DialogTrigger>
                      <MaintenanceRequestDialog
                        machines={machines}
                        users={users}
                        onSubmit={createRequestMutation.mutate}
                        isLoading={createRequestMutation.isPending}
                      />
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingRequests ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('common.loading')}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              رقم الطلب
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              {t('maintenance.machineName')}
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              {t('maintenance.maintenanceType')}
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              مستوى الإلحاح
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              {t('common.status')}
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              وصف المشكلة
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              {t('maintenance.technician')}
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                              {t('common.date')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Array.isArray(maintenanceRequests) &&
                          maintenanceRequests.length > 0 ? (
                            maintenanceRequests.map((request: any) => {
                              // Get machine name from machines array
                              const machine = Array.isArray(machines)
                                ? machines.find(
                                    (m: any) => m.id === request.machine_id,
                                  )
                                : null;
                              const machineName = machine
                                ? machine.name_ar || machine.name
                                : request.machine_id;

                              // Get assigned user name from users array
                              const assignedUser =
                                Array.isArray(users) && request.assigned_to
                                  ? users.find(
                                      (u: any) =>
                                        u.id.toString() ===
                                        request.assigned_to.toString(),
                                    )
                                  : null;
                              const assignedName = assignedUser
                                ? assignedUser.full_name ||
                                  assignedUser.username
                                : "غير محدد";

                              return (
                                <tr
                                  key={request.id}
                                  className="hover:bg-gray-50"
                                >
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                    {request.request_number}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {machineName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {request.issue_type === "mechanical"
                                      ? "ميكانيكية"
                                      : request.issue_type === "electrical"
                                        ? "كهربائية"
                                        : "أخرى"}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <Badge
                                      variant={
                                        request.urgency_level === "urgent"
                                          ? "destructive"
                                          : request.urgency_level === "medium"
                                            ? "default"
                                            : "secondary"
                                      }
                                    >
                                      {request.urgency_level === "urgent"
                                        ? "عاجل"
                                        : request.urgency_level === "medium"
                                          ? "متوسط"
                                          : "عادي"}
                                    </Badge>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}
                                    >
                                      {getStatusText(request.status)}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate text-center">
                                    {request.description}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {assignedName}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                    {new Date(
                                      request.date_reported,
                                    ).toLocaleDateString("en-US", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                    })}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td
                                colSpan={8}
                                className="px-6 py-4 text-center text-gray-500"
                              >
                                لا توجد طلبات صيانة مسجلة
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Maintenance Actions Tab */}
            <TabsContent value="actions">
              <MaintenanceActionsTab
                actions={maintenanceActions}
                requests={maintenanceRequests}
                users={users}
                isLoading={loadingActions}
                onCreateAction={createActionMutation.mutate}
                onViewAction={(action: any) => {
                  setSelectedAction(action);
                  setIsActionViewDialogOpen(true);
                }}
              />
            </TabsContent>

            {/* Maintenance Reports Tab */}
            <TabsContent value="reports">
              <MaintenanceReportsTab
                reports={maintenanceReports}
                machines={machines}
                users={users}
                isLoading={loadingReports}
                onCreateReport={createReportMutation.mutate}
              />
            </TabsContent>

            {/* Operator Negligence Tab */}
            <TabsContent value="negligence">
              <OperatorNegligenceTab
                reports={operatorReports}
                users={users}
                isLoading={loadingOperatorReports}
                onCreateReport={createOperatorReportMutation.mutate}
              />
            </TabsContent>

            {/* Spare Parts Tab */}
            <TabsContent value="spare-parts">
              <SparePartsTab
                spareParts={Array.isArray(spareParts) ? spareParts : []}
                isLoading={false}
              />
            </TabsContent>

            {/* Consumable Parts Tab */}
            <TabsContent value="consumable-parts">
              <ConsumablePartsTab />
            </TabsContent>
          </Tabs>

      {/* Action View Dialog */}
      <Dialog
        open={isActionViewDialogOpen}
        onOpenChange={setIsActionViewDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>تفاصيل إجراء الصيانة</DialogTitle>
            <DialogDescription>
              عرض تفاصيل إجراء الصيانة المحدد
            </DialogDescription>
          </DialogHeader>
          {selectedAction &&
            (() => {
              const performedByUser = Array.isArray(users)
                ? users.find(
                    (u: any) => u.id.toString() === selectedAction.performed_by,
                  )
                : null;
              const maintenanceRequest = Array.isArray(maintenanceRequests)
                ? maintenanceRequests.find(
                    (r: any) => r.id === selectedAction.maintenance_request_id,
                  )
                : null;

              return (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        رقم الإجراء
                      </label>
                      <p className="text-sm text-gray-900 mt-1 font-mono bg-gray-50 p-2 rounded">
                        {selectedAction.action_number}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        رقم طلب الصيانة
                      </label>
                      <p className="text-sm text-gray-900 mt-1 font-mono bg-gray-50 p-2 rounded">
                        {maintenanceRequest?.request_number ||
                          selectedAction.maintenance_request_id}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        نوع الإجراء
                      </label>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-sm">
                          {selectedAction.action_type}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        المنفذ
                      </label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-2 rounded">
                        {performedByUser
                          ? performedByUser.display_name_ar ||
                            performedByUser.display_name ||
                            performedByUser.username
                          : selectedAction.performed_by}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      وصف الإجراء
                    </label>
                    <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-3 rounded min-h-[60px]">
                      {selectedAction.description || "لا يوجد وصف"}
                    </p>
                  </div>

                  {/* Technical Reports */}
                  {selectedAction.text_report && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        التقرير النصي
                      </label>
                      <p className="text-sm text-gray-900 mt-1 bg-blue-50 p-3 rounded min-h-[60px] border border-blue-200">
                        {selectedAction.text_report}
                      </p>
                    </div>
                  )}

                  {/* Spare Parts and Machining Requests */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        طلب قطع غيار
                      </label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-2 rounded">
                        {selectedAction.spare_parts_request || "لا يوجد"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        طلب مخرطة
                      </label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-2 rounded">
                        {selectedAction.machining_request || "لا يوجد"}
                      </p>
                    </div>
                  </div>

                  {/* Management Actions */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        يتطلب إجراء إداري
                      </label>
                      <div className="mt-1">
                        <Badge
                          variant={
                            selectedAction.requires_management_action
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {selectedAction.requires_management_action
                            ? "نعم"
                            : "لا"}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        تم إشعار الإدارة
                      </label>
                      <div className="mt-1">
                        <Badge
                          variant={
                            selectedAction.management_notified
                              ? "default"
                              : "secondary"
                          }
                        >
                          {selectedAction.management_notified ? "نعم" : "لا"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Date Information */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        تاريخ التنفيذ
                      </label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-2 rounded">
                        {selectedAction.performed_at
                          ? new Date(
                              selectedAction.performed_at,
                            ).toLocaleDateString("ar")
                          : "غير محدد"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        تاريخ الإنشاء
                      </label>
                      <p className="text-sm text-gray-900 mt-1 bg-gray-50 p-2 rounded">
                        {selectedAction.created_at
                          ? new Date(
                              selectedAction.created_at,
                            ).toLocaleDateString("ar")
                          : "غير محدد"}
                      </p>
                    </div>
                  </div>

                  {/* Machine Information */}
                  {maintenanceRequest && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">
                        معلومات الماكينة
                      </label>
                      <div className="mt-1 bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-sm">
                          <strong>معرف الماكينة:</strong>{" "}
                          {maintenanceRequest.machine_id}
                        </p>
                        <p className="text-sm">
                          <strong>نوع المشكلة:</strong>{" "}
                          {maintenanceRequest.issue_type}
                        </p>
                        <p className="text-sm">
                          <strong>مستوى الأولوية:</strong>{" "}
                          {maintenanceRequest.urgency_level}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

// Maintenance Actions Tab Component
function MaintenanceActionsTab({
  actions,
  requests,
  users,
  isLoading,
  onCreateAction,
  onViewAction,
}: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Add spare parts query and user context
  const { data: spareParts } = useQuery({ queryKey: ["/api/spare-parts"] });
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(maintenanceActionSchema),
    defaultValues: {
      maintenance_request_id: 0,
      action_type: "",
      description: "",
      text_report: "",
      spare_parts_request: "",
      machining_request: "",
      operator_negligence_report: "",
      performed_by: "",
      requires_management_action: false,
      management_notified: false,
    },
  });

  // Set current user as performer when dialog opens or user changes
  useEffect(() => {
    if (user?.id) {
      form.setValue("performed_by", user.id.toString());
    }
  }, [user?.id, form]);

  const onSubmit = async (data: any) => {
    try {
      console.log("Form data submitted:", data);

      // Generate action number
      const actionNumber = generateActionNumber();

      const submitData = {
        ...data,
        action_number: actionNumber,
        request_created_by: user?.id?.toString() || "",
      };

      console.log("Submitting action data:", submitData);
      await onCreateAction(submitData);

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating maintenance action:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>إجراءات الصيانة</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة إجراء جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>إضافة إجراء صيانة جديد</DialogTitle>
                <DialogDescription>
                  تسجيل إجراء صيانة جديد مع تحديد المعدات والمنفذ
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="maintenance_request_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>طلب الصيانة</FormLabel>
                          <Select
                            onValueChange={(value) =>
                              field.onChange(parseInt(value))
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر طلب الصيانة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Array.isArray(requests) &&
                                requests.map((request: any) => (
                                  <SelectItem
                                    key={request.id}
                                    value={request.id.toString()}
                                  >
                                    {request.request_number} -{" "}
                                    {request.description}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="action_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الإجراء</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع الإجراء" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="فحص مبدئي">
                                فحص مبدئي
                              </SelectItem>
                              <SelectItem value="تغيير قطعة غيار">
                                تغيير قطعة غيار
                              </SelectItem>
                              <SelectItem value="إصلاح مكانيكي">
                                إصلاح مكانيكي
                              </SelectItem>
                              <SelectItem value="إصلاح كهربائي">
                                إصلاح كهربائي
                              </SelectItem>
                              <SelectItem value="إيقاف الماكينة">
                                إيقاف الماكينة
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="performed_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المنفذ</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={user?.id ? user.id.toString() : ""}
                            type="hidden"
                            className="hidden"
                          />
                        </FormControl>
                        <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded border">
                          <div className="font-medium text-sm">
                            {user
                              ? `${user.display_name || user.username} (${user.id})`
                              : "جاري التحميل..."}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            سيتم تسجيل الإجراء باسم المستخدم الحالي
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف الإجراء</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="اكتب وصفاً مفصلاً للإجراء المتخذ"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="text_report"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التقرير النصي</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="تقرير مفصل عن العملية"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="spare_parts_request"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>طلب قطع غيار</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="اختر قطعة الغيار المطلوبة" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.isArray(spareParts) &&
                                spareParts.length > 0 ? (
                                  spareParts
                                    .filter(
                                      (part) =>
                                        part.part_id &&
                                        part.part_name &&
                                        part.code,
                                    )
                                    .map((part: any) => (
                                      <SelectItem
                                        key={part.part_id}
                                        value={`${part.part_name}_${part.code}_${part.part_id}`}
                                      >
                                        {part.part_name} ({part.code}) -{" "}
                                        {part.machine_name}
                                      </SelectItem>
                                    ))
                                ) : (
                                  <SelectItem value="no_parts">
                                    لا توجد قطع غيار متاحة
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="machining_request"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>طلب مخرطة</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="تفاصيل طلب المخرطة إن وجد"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="operator_negligence_report"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تبليغ إهمال المشغل</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="تقرير عن إهمال المشغل إن وجد"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="requires_management_action"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>يحتاج موافقة إدارية</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="management_notified"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>تم إبلاغ الإدارة</FormLabel>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit">حفظ الإجراء</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              جاري التحميل...
            </p>
          </div>
        ) : Array.isArray(actions) && actions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    رقم الإجراء
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    رقم طلب الصيانة
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    نوع الإجراء
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    الوصف
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    المنفذ
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    طلب قطع غيار
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    طلب مخرطة
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    موافقة إدارية
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    تاريخ التنفيذ
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-center font-semibold">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody>
                {actions.map((action: any) => {
                  const performedByUser = Array.isArray(users)
                    ? users.find(
                        (u: any) => u.id.toString() === action.performed_by,
                      )
                    : null;
                  const maintenanceRequest = Array.isArray(requests)
                    ? requests.find(
                        (r: any) => r.id === action.maintenance_request_id,
                      )
                    : null;

                  const handleView = () => {
                    onViewAction?.(action);
                  };

                  const handlePrint = () => {
                    const printContent = `
                      <div style="font-family: Arial; direction: rtl; text-align: right; padding: 20px;">
                        <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px;">
                          إجراء صيانة رقم: ${action.action_number}
                        </h2>
                        <div style="margin: 20px 0;">
                          <p><strong>رقم طلب الصيانة:</strong> ${maintenanceRequest?.request_number || action.maintenance_request_id}</p>
                          <p><strong>نوع الإجراء:</strong> ${action.action_type}</p>
                          <p><strong>الوصف:</strong> ${action.description || "-"}</p>
                          <p><strong>المنفذ:</strong> ${performedByUser ? performedByUser.full_name || performedByUser.username : action.performed_by}</p>
                          <p><strong>طلب قطع غيار:</strong> ${action.spare_parts_request || "-"}</p>
                          <p><strong>طلب مخرطة:</strong> ${action.machining_request || "-"}</p>
                          <p><strong>تقرير إهمال المشغل:</strong> ${action.operator_negligence_report || "-"}</p>
                          <p><strong>تقرير نصي:</strong> ${action.text_report || "-"}</p>
                          <p><strong>موافقة إدارية مطلوبة:</strong> ${action.requires_management_action ? "نعم" : "لا"}</p>
                          <p><strong>تاريخ التنفيذ:</strong> ${new Date(action.action_date).toLocaleDateString("ar")}</p>
                          <p><strong>وقت التنفيذ:</strong> ${new Date(action.action_date).toLocaleTimeString("ar")}</p>
                        </div>
                      </div>
                    `;

                    const printWindow = window.open("", "_blank");
                    printWindow?.document.write(printContent);
                    printWindow?.document.close();
                    printWindow?.print();
                  };

                  const handleDelete = async () => {
                    if (
                      confirm(
                        `هل أنت متأكد من حذف الإجراء ${action.action_number}؟`,
                      )
                    ) {
                      try {
                        const response = await fetch(`/api/maintenance-actions/${action.id}`, {
                          method: "DELETE",
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json().catch(() => null);
                          const errorMessage = errorData?.message || "حدث خطأ في حذف الإجراء";
                          alert(errorMessage);
                          return;
                        }
                        
                        window.location.reload();
                      } catch (error) {
                        console.error("Error deleting maintenance action:", error);
                        alert("حدث خطأ في الاتصال بالخادم");
                      }
                    }
                  };

                  const handleEdit = () => {
                    alert(
                      `تعديل الإجراء ${action.action_number} - سيتم تطوير هذه الميزة قريباً`,
                    );
                  };

                  return (
                    <tr key={action.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2 text-center font-medium text-blue-600">
                        {action.action_number}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center font-medium text-green-600">
                        {maintenanceRequest?.request_number ||
                          `MO${action.maintenance_request_id.toString().padStart(3, "0")}`}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700"
                        >
                          {action.action_type}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {action.description || "-"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {performedByUser
                          ? performedByUser.full_name ||
                            performedByUser.username
                          : action.performed_by}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {action.spare_parts_request || "-"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {action.machining_request || "-"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {action.requires_management_action ? (
                          <Badge variant="destructive">مطلوب</Badge>
                        ) : (
                          <Badge variant="secondary">غير مطلوب</Badge>
                        )}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        {new Date(action.action_date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          },
                        )}
                        <br />
                        <span className="text-xs text-gray-500">
                          {new Date(action.action_date).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            },
                          )}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200 h-8 w-8 p-0"
                            onClick={handleView}
                            title="عرض"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-50 text-green-600 hover:bg-green-100 border-green-200 h-8 w-8 p-0"
                            onClick={handlePrint}
                            title="طباعة"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border-yellow-200 h-8 w-8 p-0"
                            onClick={handleEdit}
                            title="تعديل"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 h-8 w-8 p-0"
                            onClick={handleDelete}
                            title="حذف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد إجراءات صيانة مسجلة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Maintenance Reports Tab Component
function MaintenanceReportsTab({
  reports,
  machines,
  users,
  isLoading,
  onCreateReport,
}: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(maintenanceReportSchema),
    defaultValues: {
      report_type: "",
      title: "",
      description: "",
      machine_id: "",
      severity: "medium",
      priority: "medium",
      spare_parts_needed: [],
      estimated_repair_time: 0,
    },
  });

  const onSubmit = async (data: any) => {
    if (!user?.id) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول لإنشاء بلاغ صيانة",
        variant: "destructive",
      });
      return;
    }

    try {
      const reportNumber = generateMaintenanceReportNumber();

      await onCreateReport({
        ...data,
        report_number: reportNumber,
        reported_by_user_id: user.id,
        status: "open",
        estimated_repair_time: data.estimated_repair_time || null,
      });

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating maintenance report:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>بلاغات الصيانة</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة بلاغ جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>إضافة بلاغ صيانة جديد</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="report_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع البلاغ</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع البلاغ" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="breakdown">
                                عطل في الماكينة
                              </SelectItem>
                              <SelectItem value="malfunction">
                                خلل في الأداء
                              </SelectItem>
                              <SelectItem value="safety">مشكلة أمان</SelectItem>
                              <SelectItem value="quality">
                                مشكلة جودة
                              </SelectItem>
                              <SelectItem value="preventive">
                                صيانة وقائية مطلوبة
                              </SelectItem>
                              <SelectItem value="spare_parts">
                                طلب قطع غيار
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>شدة المشكلة</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر شدة المشكلة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">منخفضة</SelectItem>
                              <SelectItem value="medium">متوسطة</SelectItem>
                              <SelectItem value="high">عالية</SelectItem>
                              <SelectItem value="critical">حرجة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان البلاغ</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="عنوان مختصر للمشكلة" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف المشكلة</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="وصف مفصل للمشكلة والأعراض"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="machine_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الماكينة (اختياري)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="رقم أو اسم الماكينة"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="estimated_repair_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الوقت المتوقع للإصلاح (ساعات)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(parseFloat(e.target.value) || 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit">إرسال البلاغ</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              جاري التحميل...
            </p>
          </div>
        ) : Array.isArray(reports) && reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <div key={report.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">
                    {report.report_number} - {report.title}
                  </h3>
                  <div className="flex gap-2">
                    <Badge
                      variant={
                        report.severity === "critical"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {report.severity}
                    </Badge>
                    <Badge>{report.status}</Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {report.description}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">نوع البلاغ: </span>
                    {report.report_type}
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الإبلاغ: </span>
                    {new Date(report.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بلاغات صيانة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Operator Negligence Tab Component
function OperatorNegligenceTab({
  reports,
  users,
  isLoading,
  onCreateReport,
}: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm({
    resolver: zodResolver(operatorNegligenceSchema),
    defaultValues: {
      operator_id: "",
      operator_name: "",
      incident_date: "",
      incident_type: "",
      description: "",
      severity: "medium",
      witnesses: [],
      immediate_actions_taken: "",
    },
  });

  const onSubmit = async (data: any) => {
    if (!user?.id) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول لإنشاء بلاغ إهمال",
        variant: "destructive",
      });
      return;
    }

    try {
      const reportNumber = generateOperatorReportNumber();

      await onCreateReport({
        ...data,
        report_number: reportNumber,
        reported_by_user_id: user.id,
        report_date: new Date().toISOString().split("T")[0],
        status: "pending",
        follow_up_required:
          data.severity === "high" || data.severity === "critical",
      });

      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error("Error creating operator negligence report:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>بلاغات إهمال المشغلين</span>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 ml-2" />
                إضافة بلاغ إهمال
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>إضافة بلاغ إهمال مشغل</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="operator_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>معرف المشغل</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="رقم المشغل أو كود التعريف"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="operator_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>اسم المشغل</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="الاسم الكامل للمشغل"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="incident_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الحادث</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="incident_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع الإهمال</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر نوع الإهمال" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="safety_violation">
                                مخالفة قواعد الأمان
                              </SelectItem>
                              <SelectItem value="equipment_misuse">
                                سوء استخدام المعدات
                              </SelectItem>
                              <SelectItem value="procedure_violation">
                                عدم اتباع الإجراءات
                              </SelectItem>
                              <SelectItem value="quality_negligence">
                                إهمال الجودة
                              </SelectItem>
                              <SelectItem value="time_violation">
                                مخالفة الوقت
                              </SelectItem>
                              <SelectItem value="maintenance_neglect">
                                إهمال الصيانة
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف الحادث</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="وصف مفصل لما حدث والظروف المحيطة"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="severity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>درجة خطورة الإهمال</FormLabel>
                          <Select onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر درجة الخطورة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">منخفضة</SelectItem>
                              <SelectItem value="medium">متوسطة</SelectItem>
                              <SelectItem value="high">عالية</SelectItem>
                              <SelectItem value="critical">حرجة</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="immediate_actions_taken"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الإجراءات المتخذة فوراً</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="ما تم اتخاذه من إجراءات فورية"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit">إرسال البلاغ</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              جاري التحميل...
            </p>
          </div>
        ) : Array.isArray(reports) && reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report: any) => (
              <div key={report.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold">
                    {report.report_number} - {report.operator_name}
                  </h3>
                  <div className="flex gap-2">
                    <Badge
                      variant={
                        report.severity === "critical"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {report.severity}
                    </Badge>
                    <Badge>{report.status}</Badge>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {report.description}
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">نوع الإهمال: </span>
                    {report.incident_type}
                  </div>
                  <div>
                    <span className="font-medium">تاريخ الحادث: </span>
                    {new Date(report.incident_date).toLocaleDateString("ar")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>لا توجد بلاغات إهمال مسجلة</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Maintenance Request Dialog Component
function MaintenanceRequestDialog({
  machines,
  users,
  onSubmit,
  isLoading,
}: any) {
  const form = useForm({
    resolver: zodResolver(maintenanceRequestSchema),
    defaultValues: {
      machine_id: "",
      issue_type: "mechanical",
      urgency_level: "normal",
      description: "",
      assigned_to: "none",
    },
  });

  const handleSubmit = (data: any) => {
    // Convert "none" back to empty string for the API
    const submitData = {
      ...data,
      assigned_to: data.assigned_to === "none" ? "" : data.assigned_to,
    };
    onSubmit(submitData);
    form.reset();
  };

  return (
    <DialogContent
      className="sm:max-w-[600px]"
      aria-describedby="maintenance-request-description"
    >
      <DialogHeader>
        <DialogTitle>طلب صيانة جديد</DialogTitle>
        <p
          id="maintenance-request-description"
          className="text-sm text-gray-600"
        >
          أنشئ طلب صيانة جديد للمعدات التي تحتاج إلى إصلاح أو صيانة
        </p>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="machine_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المعدة</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المعدة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.isArray(machines) &&
                        machines
                          .filter(
                            (machine) =>
                              machine.id &&
                              machine.id !== "" &&
                              machine.id !== null &&
                              machine.id !== undefined,
                          )
                          .map((machine: any) => (
                            <SelectItem
                              key={machine.id}
                              value={machine.id.toString()}
                            >
                              {machine.name_ar}
                            </SelectItem>
                          ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="issue_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع المشكلة</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع المشكلة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="mechanical">ميكانيكية</SelectItem>
                      <SelectItem value="electrical">كهربائية</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="urgency_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مستوى الإلحاح</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر مستوى الإلحاح" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="normal">عادي</SelectItem>
                      <SelectItem value="medium">متوسط</SelectItem>
                      <SelectItem value="urgent">عاجل</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="assigned_to"
            render={({ field }) => (
              <FormItem>
                <FormLabel>المكلف بالإصلاح (اختياري)</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفني" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">بدون تكليف</SelectItem>
                    {Array.isArray(users) &&
                      users
                        .filter((user: any) => user.role === "technician")
                        .map((user: any) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.full_name || user.username}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>وصف المشكلة</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="اشرح المشكلة أو نوع الصيانة المطلوبة..."
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "جاري الإنشاء..." : "إنشاء الطلب"}
            </Button>
          </div>
        </form>
      </Form>
    </DialogContent>
  );
}

// Spare Parts Tab Component
function SparePartsTab({
  spareParts,
  isLoading,
}: {
  spareParts: any[];
  isLoading: boolean;
}) {
  const [selectedPart, setSelectedPart] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [partToDelete, setPartToDelete] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create spare part mutation
  const createSparePartMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("/api/spare-parts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      toast({ title: "تم إنشاء قطعة الغيار بنجاح" });
      setIsCreateDialogOpen(false);
    },
    onError: () => {
      toast({ title: "فشل في إنشاء قطعة الغيار", variant: "destructive" });
    },
  });

  // Update spare part mutation
  const updateSparePartMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest(`/api/spare-parts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      toast({ title: "تم تحديث قطعة الغيار بنجاح" });
      setIsEditDialogOpen(false);
      setSelectedPart(null);
    },
    onError: () => {
      toast({ title: "فشل في تحديث قطعة الغيار", variant: "destructive" });
    },
  });

  // Delete spare part mutation
  const deleteSparePartMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/spare-parts/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spare-parts"] });
      toast({ title: "تم حذف قطعة الغيار بنجاح" });
      setPartToDelete(null);
    },
    onError: () => {
      toast({ title: "فشل في حذف قطعة الغيار", variant: "destructive" });
    },
  });

  const handleView = (part: any) => {
    setSelectedPart(part);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (part: any) => {
    setSelectedPart(part);
    setIsEditDialogOpen(true);
  };

  const handleDelete = (part: any) => {
    setPartToDelete(part);
  };

  const confirmDelete = () => {
    if (partToDelete) {
      deleteSparePartMutation.mutate(partToDelete.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          إدارة قطع الغيار
        </h3>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 ml-2" />
              إضافة قطعة غيار جديدة
            </Button>
          </DialogTrigger>
          <DialogContent
            className="max-w-md"
            aria-describedby="spare-part-dialog-description"
          >
            <DialogHeader>
              <DialogTitle>إضافة قطعة غيار جديدة</DialogTitle>
              <div
                id="spare-part-dialog-description"
                className="text-sm text-gray-600"
              >
                أضف قطعة غيار جديدة إلى المخزون
              </div>
            </DialogHeader>
            <SparePartForm
              onSubmit={createSparePartMutation.mutate}
              isLoading={createSparePartMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Spare Parts Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">جاري التحميل...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      رقم القطعة
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      اسم الماكينة
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      اسم القطعة
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      الكود
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      الرقم التسلسلي
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      المواصفات
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(spareParts) && spareParts.length > 0 ? (
                    spareParts.map((part: any) => (
                      <tr key={part.part_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                          {part.part_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {part.machine_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {part.part_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {part.code}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {part.serial_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate text-center">
                          {part.specifications}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleView(part)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEdit(part)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600"
                              onClick={() => handleDelete(part)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        لا توجد قطع غيار مسجلة
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent
          className="max-w-md"
          aria-describedby="view-spare-part-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>تفاصيل قطعة الغيار</DialogTitle>
            <div
              id="view-spare-part-dialog-description"
              className="text-sm text-gray-600"
            >
              عرض تفاصيل قطعة الغيار المحددة
            </div>
          </DialogHeader>
          {selectedPart && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    رقم القطعة
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedPart.part_id}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    الكود
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedPart.code}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  اسم الماكينة
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedPart.machine_name}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    اسم القطعة
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedPart.part_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    الرقم التسلسلي
                  </label>
                  <p className="text-sm text-gray-900 mt-1">
                    {selectedPart.serial_number}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  المواصفات
                </label>
                <p className="text-sm text-gray-900 mt-1">
                  {selectedPart.specifications}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent
          className="max-w-md"
          aria-describedby="edit-spare-part-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>تعديل قطعة الغيار</DialogTitle>
            <div
              id="edit-spare-part-dialog-description"
              className="text-sm text-gray-600"
            >
              تعديل بيانات قطعة الغيار
            </div>
          </DialogHeader>
          {selectedPart && (
            <SparePartEditForm
              part={selectedPart}
              onSubmit={(data) =>
                updateSparePartMutation.mutate({ id: selectedPart.id, data })
              }
              isLoading={updateSparePartMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!partToDelete} onOpenChange={() => setPartToDelete(null)}>
        <DialogContent
          className="max-w-md"
          aria-describedby="delete-spare-part-dialog-description"
        >
          <DialogHeader>
            <DialogTitle>تأكيد الحذف</DialogTitle>
            <div
              id="delete-spare-part-dialog-description"
              className="text-sm text-gray-600"
            >
              هل أنت متأكد من حذف قطعة الغيار؟
            </div>
          </DialogHeader>
          {partToDelete && (
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                سيتم حذف قطعة الغيار <strong>{partToDelete.part_id}</strong> -{" "}
                {partToDelete.part_name} نهائياً.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPartToDelete(null)}>
                  إلغاء
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteSparePartMutation.isPending}
                >
                  {deleteSparePartMutation.isPending ? "جاري الحذف..." : "حذف"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Spare Part Form Component
function SparePartForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const { data: spareParts } = useQuery({ queryKey: ["/api/spare-parts"] });
  const { data: machines } = useQuery({ queryKey: ["/api/machines"] });

  // Generate next part ID automatically
  const generateNextPartId = (currentSpareParts: any[]) => {
    if (!Array.isArray(currentSpareParts)) return "SP001";

    const partNumbers = currentSpareParts
      .map((part: any) => part.part_id)
      .filter((id: string) => id && id.match(/^SP\d+$/))
      .map((id: string) => parseInt(id.replace("SP", "")))
      .filter((num: number) => !isNaN(num));

    const nextNumber =
      partNumbers.length > 0 ? Math.max(...partNumbers) + 1 : 1;
    return `SP${nextNumber.toString().padStart(3, "0")}`;
  };

  const form = useForm({
    defaultValues: {
      part_id: "SP001",
      machine_name: "",
      part_name: "",
      code: "",
      serial_number: "",
      specifications: "",
    },
  });

  // Update part_id when spare parts data changes
  useEffect(() => {
    if (spareParts && Array.isArray(spareParts)) {
      const nextId = generateNextPartId(spareParts);
      if (nextId !== form.getValues("part_id")) {
        form.setValue("part_id", nextId);
      }
    }
  }, [spareParts, form]);

  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="part_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم القطعة (تلقائي)</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-gray-100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الكود</FormLabel>
                <FormControl>
                  <Input placeholder="A8908" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="machine_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم الماكينة</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الماكينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(machines) && machines.length > 0 ? (
                      machines.map((machine: any) => (
                        <SelectItem
                          key={machine.id}
                          value={
                            machine.id ? `machine_${machine.id}` : "unknown"
                          }
                        >
                          {machine.name_ar || machine.name} ({machine.id})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no_machines">
                        لا توجد ماكينات متاحة
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="part_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم القطعة</FormLabel>
                <FormControl>
                  <Input placeholder="ماطور" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الرقم التسلسلي</FormLabel>
                <FormControl>
                  <Input placeholder="E5SH973798" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>المواصفات</FormLabel>
              <FormControl>
                <Textarea placeholder="قوة 380 فولت و 10 امبير" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// Spare Part Edit Form Component
function SparePartEditForm({
  part,
  onSubmit,
  isLoading,
}: {
  part: any;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const { data: machines } = useQuery({ queryKey: ["/api/machines"] });

  const form = useForm({
    defaultValues: {
      part_id: part.part_id || "",
      machine_name: part.machine_name || "",
      part_name: part.part_name || "",
      code: part.code || "",
      serial_number: part.serial_number || "",
      specifications: part.specifications || "",
    },
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="part_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم القطعة</FormLabel>
                <FormControl>
                  <Input {...field} disabled className="bg-gray-100" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الكود</FormLabel>
                <FormControl>
                  <Input placeholder="A8908" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="machine_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>اسم الماكينة</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الماكينة" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(machines) && machines.length > 0 ? (
                      machines.map((machine: any) => (
                        <SelectItem
                          key={machine.id}
                          value={
                            machine.id ? `machine_${machine.id}` : "unknown"
                          }
                        >
                          {machine.name_ar || machine.name} ({machine.id})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no_machines">
                        لا توجد ماكينات متاحة
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="part_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>اسم القطعة</FormLabel>
                <FormControl>
                  <Input placeholder="ماطور" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serial_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الرقم التسلسلي</FormLabel>
                <FormControl>
                  <Input placeholder="E5SH973798" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="specifications"
          render={({ field }) => (
            <FormItem>
              <FormLabel>المواصفات</FormLabel>
              <FormControl>
                <Textarea placeholder="قوة 380 فولت و 10 امبير" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? "جاري التحديث..." : "تحديث"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
