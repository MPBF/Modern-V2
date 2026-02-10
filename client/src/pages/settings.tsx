import { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import PageLayout from "../components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Globe,
  Database,
  Download,
  Upload,
  Trash2,
  Archive,
  HardDrive,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  Save,
  RefreshCw,
  MessageSquare,
  Webhook,
  MapPin,
} from "lucide-react";
import RoleManagementTab from "../components/RoleManagementTab";
import NotificationCenter from "../components/notifications/NotificationCenter";
import WhatsAppWebhooksTab from "../components/settings/WhatsAppWebhooksTab";
import NotificationEventSettingsTab from "../components/settings/NotificationEventSettingsTab";
import LocationMapPicker from "../components/LocationMapPicker";
import { Plus, Eye, EyeOff } from "lucide-react";
import { canAccessSettingsTab } from "../utils/roleUtils";

export default function Settings() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch system settings
  const { data: systemSettingsData } = useQuery({
    queryKey: ["/api/settings/system"],
    enabled: !!user,
  });

  // Fetch user settings
  const { data: userSettingsData } = useQuery({
    queryKey: ["/api/settings/user", user?.id],
    enabled: !!user?.id,
  });

  // Fetch database stats
  const { data: databaseStatsData } = useQuery({
    queryKey: ["/api/database/stats"],
    enabled: !!user,
  });

  // Convert array settings to object format
  const convertSettingsArrayToObject = (settingsArray: any[] | undefined) => {
    if (!Array.isArray(settingsArray)) return {};
    return settingsArray.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {});
  };

  // User preferences state
  const [userSettings, setUserSettings] = useState({
    displayName: user?.display_name_ar || "",
    email: "",
    phone: "",
    language: "ar",
    theme: "light",
    notifications: {
      email: true,
      sms: false,
      push: true,
      sound: true,
    },
    dashboard: {
      autoRefresh: true,
      refreshInterval: 30,
      compactView: false,
    },
  });

  // Database settings state
  const [selectedTable, setSelectedTable] = useState("");
  const [databaseStats, setDatabaseStats] = useState({
    tableCount: 8,
    totalRecords: 1247,
    databaseSize: "45.2 MB",
    lastBackup: "اليوم",
  });

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    companyName: "مصنع أكياس MPBF",
    timezone: "Asia/Riyadh",
    currency: "SAR",
    language: "ar",
    dateFormat: "DD/MM/YYYY",
    country: "المملكة العربية السعودية",
    region: "الرياض",
    workingHours: {
      start: "08:00",
      end: "17:00",
    },
    shifts: [
      { id: 1, name: "الصباحية", start: "08:00", end: "16:00" },
      { id: 2, name: "المسائية", start: "16:00", end: "00:00" },
      { id: 3, name: "الليلية", start: "00:00", end: "08:00" },
    ],
    backup: {
      enabled: true,
      frequency: "daily",
      retention: 30,
    },
  });

  // Load settings from database when data is available
  useEffect(() => {
    if (systemSettingsData && Array.isArray(systemSettingsData)) {
      const settingsObj = convertSettingsArrayToObject(systemSettingsData);
      setSystemSettings((prev) => ({
        ...prev,
        companyName: settingsObj.companyName || prev.companyName,
        timezone: settingsObj.timezone || prev.timezone,
        currency: settingsObj.currency || prev.currency,
        language: settingsObj.language || prev.language,
        dateFormat: settingsObj.dateFormat || prev.dateFormat,
        country: settingsObj.country || prev.country,
        region: settingsObj.region || prev.region,
        workingHours: {
          start: settingsObj.workingHoursStart || prev.workingHours.start,
          end: settingsObj.workingHoursEnd || prev.workingHours.end,
        },
      }));
    }
  }, [systemSettingsData]);

  useEffect(() => {
    if (userSettingsData && Array.isArray(userSettingsData)) {
      const settingsObj = convertSettingsArrayToObject(userSettingsData);
      setUserSettings((prev) => ({
        ...prev,
        displayName: settingsObj.displayName || prev.displayName,
        email: settingsObj.email || prev.email,
        phone: settingsObj.phone || prev.phone,
        language: settingsObj.language || prev.language,
        theme: settingsObj.theme || prev.theme,
        notifications: {
          email:
            settingsObj.notificationsEmail === "true" ||
            prev.notifications.email,
          sms:
            settingsObj.notificationsSms === "true" || prev.notifications.sms,
          push:
            settingsObj.notificationsPush === "true" || prev.notifications.push,
          sound:
            settingsObj.notificationsSound === "true" ||
            prev.notifications.sound,
        },
        dashboard: {
          autoRefresh:
            settingsObj.dashboardAutoRefresh === "true" ||
            prev.dashboard.autoRefresh,
          refreshInterval:
            parseInt(settingsObj.dashboardRefreshInterval) ||
            prev.dashboard.refreshInterval,
          compactView:
            settingsObj.dashboardCompactView === "true" ||
            prev.dashboard.compactView,
        },
      }));
    }
  }, [userSettingsData]);

  // Load database stats when data is available
  useEffect(() => {
    if (databaseStatsData && typeof databaseStatsData === "object") {
      setDatabaseStats((prev) => ({
        ...prev,
        ...databaseStatsData,
      }));
    }
  }, [databaseStatsData]);

  // Backup restore state
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [selectedBackupFile, setSelectedBackupFile] = useState<File | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);

  // Enhanced file import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [importStep, setImportStep] = useState(1); // 1: Upload, 2: Preview & Map, 3: Import
  const [fileData, setFileData] = useState<any[]>([]);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>(
    {},
  );
  const [importOptions, setImportOptions] = useState({
    batchSize: 1000,
    skipFirstRow: true,
    updateExisting: false,
    validateData: true,
    continueOnError: false,
  });
  const [importProgress, setImportProgress] = useState({
    processing: false,
    current: 0,
    total: 0,
    percentage: 0,
    errors: [] as string[],
    warnings: [] as string[],
  });

  // Import table data mutation
  const importTableMutation = useMutation({
    mutationFn: async ({
      tableName,
      file,
    }: {
      tableName: string;
      file: File;
    }) => {
      const fileText = await file.text();
      const format = file.name.endsWith(".json")
        ? "json"
        : file.name.endsWith(".xlsx")
          ? "excel"
          : "csv";

      return await apiRequest(`/api/database/import/${tableName}`, {
        method: "POST",
        body: JSON.stringify({ data: fileText, format }),
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      setSelectedFile(null);
      toast({
        title: t('settings.database.importSuccess'),
        description: t('settings.database.importedRecordsDesc', { imported: data.count || data.importedRecords, total: data.totalRows || data.count }),
      });
    },
    onError: (error) => {
      toast({
        title: t('settings.database.importError'),
        description:
          error instanceof Error
            ? error.message
            : t('settings.database.importErrorOccurred'),
        variant: "destructive",
      });
    },
  });

  // Get table schema for column mapping
  const getTableSchema = (tableName: string) => {
    const schemas: { [key: string]: string[] } = {
      customers: ["id", "name", "name_ar", "phone", "email", "address", "status"],
      categories: ["id", "name", "name_ar", "description"],
      sections: ["id", "name", "name_ar", "description"],
      items: ["id", "category_id", "name", "name_ar"],
      users: ["id", "username", "display_name", "display_name_ar", "role_id"],
      machines: ["id", "name", "name_ar", "type", "status"],
      locations: ["id", "name", "name_ar", "type"],
      roles: ["id", "name", "name_ar", "permissions"],
      suppliers: ["id", "name", "name_ar", "contact_person", "phone", "email", "address"],
      customer_products: [
        "id", "customer_id", "category_id", "item_id", "size_caption", "width",
        "left_facing", "right_facing", "thickness", "printing_cylinder",
        "cutting_length_cm", "raw_material", "master_batch_id", "is_printed",
        "cutting_unit", "punching", "unit_weight_kg", "unit_quantity",
        "package_weight_kg", "cliche_front_design", "cliche_back_design",
        "notes", "status", "created_at",
      ],
      orders: ["id", "customer_id", "order_date", "status", "total_amount"],
      production_orders: ["id", "order_id", "customer_product_id", "quantity_kg", "status"],
      rolls: ["id", "production_order_id", "weight_kg", "status", "created_at"],
      cuts: ["id", "roll_id", "quantity", "created_at"],
      inventory: ["id", "item_id", "location_id", "current_stock", "unit"],
      inventory_movements: ["id", "inventory_id", "movement_type", "quantity", "created_at"],
      warehouse_receipts: ["id", "supplier_id", "receipt_date", "total_amount"],
      warehouse_transactions: ["id", "item_id", "transaction_type", "quantity", "created_at"],
      maintenance_requests: ["id", "machine_id", "request_type", "status", "created_at"],
      maintenance_actions: ["id", "maintenance_request_id", "action_type", "performed_by", "created_at"],
      maintenance_reports: ["id", "machine_id", "report_type", "title", "description", "status"],
      spare_parts: ["id", "name", "name_ar", "part_number", "quantity", "unit_price"],
      consumable_parts: ["id", "name", "name_ar", "current_stock", "unit_price"],
      consumable_parts_transactions: ["id", "consumable_part_id", "transaction_type", "quantity", "created_at"],
      waste: ["id", "production_order_id", "quantity_kg", "reason", "created_at"],
      quality_checks: ["id", "production_order_id", "check_type", "result", "created_at"],
      machine_queues: ["id", "machine_id", "production_order_id", "priority", "status"],
      production_settings: ["id", "setting_key", "setting_value"],
      operator_negligence_reports: ["id", "operator_id", "machine_id", "report_type", "description"],
      violations: ["id", "user_id", "violation_type", "description", "created_at"],
      user_requests: ["id", "user_id", "request_type", "status", "created_at"],
      attendance: ["id", "user_id", "date", "check_in", "check_out"],
      training_programs: ["id", "program_name", "description", "duration_hours"],
      training_records: ["id", "user_id", "training_program_id", "completion_date", "score"],
      training_materials: ["id", "training_program_id", "material_type", "title", "content"],
      training_enrollments: ["id", "user_id", "training_program_id", "enrollment_date", "status"],
      training_evaluations: ["id", "enrollment_id", "evaluation_date", "score"],
      training_certificates: ["id", "user_id", "training_program_id", "issue_date", "certificate_number"],
      performance_reviews: ["id", "user_id", "review_date", "reviewer_id", "overall_score"],
      performance_criteria: ["id", "criteria_name", "description", "weight"],
      performance_ratings: ["id", "review_id", "criteria_id", "rating"],
      leave_types: ["id", "name", "name_ar", "max_days", "requires_approval"],
      leave_requests: ["id", "user_id", "leave_type_id", "start_date", "end_date", "status"],
      leave_balances: ["id", "user_id", "leave_type_id", "balance_days"],
      admin_decisions: ["id", "decision_type", "description", "created_by", "created_at"],
      company_profile: ["id", "company_name", "address", "phone", "email"],
      notifications: ["id", "user_id", "title", "message", "type", "is_read"],
      notification_templates: ["id", "template_name", "subject", "body", "template_type"],
      factory_locations: ["id", "name", "address", "latitude", "longitude"],
      system_alerts: ["id", "alert_type", "severity", "message", "created_at"],
      alert_rules: ["id", "rule_name", "condition", "action", "is_active"],
      system_health_checks: ["id", "check_type", "status", "last_check", "details"],
      system_performance_metrics: ["id", "metric_name", "value", "timestamp"],
      corrective_actions: ["id", "issue_description", "action_taken", "created_by", "created_at"],
      system_analytics: ["id", "event_type", "event_data", "timestamp"],
      quick_notes: ["id", "user_id", "title", "content", "created_at"],
      note_attachments: ["id", "note_id", "file_name", "file_url"],
      mixing_batches: ["id", "batch_number", "formula_id", "quantity_kg", "created_at"],
      batch_ingredients: ["id", "batch_id", "ingredient_id", "quantity_kg"],
    };
    return schemas[tableName] || [];
  };

  // Parse file data based on format
  const parseFileData = async (file: File) => {
    try {
      const fileText = await file.text();
      let data: any[] = [];
      let headers: string[] = [];

      if (file.name.endsWith(".json")) {
        const jsonData = JSON.parse(fileText);
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          data = jsonData;
          headers = Object.keys(jsonData[0]);
        }
      } else if (file.name.endsWith(".csv")) {
        const lines = fileText.split("\n").filter((line) => line.trim());
        if (lines.length > 0) {
          headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
          data = lines.slice(1).map((line) => {
            const values = line
              .split(",")
              .map((v) => v.trim().replace(/"/g, ""));
            const row: any = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || "";
            });
            return row;
          });
        }
      } else if (file.name.endsWith(".xlsx")) {
        // For Excel files, we'll parse them on the server side
        headers = ["Column 1", "Column 2", "Column 3"]; // Placeholder
        data = [
          {
            "Column 1": "Excel file will be parsed on server",
            "Column 2": "",
            "Column 3": "",
          },
        ];
      }

      setFileData(data); // Show all rows for import
      setFileHeaders(headers);

      // Auto-map common column names
      const tableSchema = getTableSchema(selectedTable);
      const autoMapping: { [key: string]: string } = {};
      tableSchema.forEach((schemaCol) => {
        const matchingHeader = headers.find(
          (header) =>
            header.toLowerCase().includes(schemaCol.toLowerCase()) ||
            schemaCol.toLowerCase().includes(header.toLowerCase()),
        );
        if (matchingHeader) {
          autoMapping[schemaCol] = matchingHeader;
        }
      });
      setColumnMapping(autoMapping);

      setImportStep(2);

      toast({
        title: t('settings.database.fileParseSuccess'),
        description: t('settings.database.foundRecordsAndColumns', { records: data.length, columns: headers.length }),
      });
    } catch (error) {
      toast({
        title: t('settings.database.fileParseError'),
        description: t('settings.database.fileCorrupt'),
        variant: "destructive",
      });
    }
  };

  // Enhanced file upload handler
  const handleFileUpload = async (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const allowedTypes = [
        "text/csv",
        "application/json",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ];

      if (
        allowedTypes.includes(file.type) ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".json") ||
        file.name.endsWith(".xlsx")
      ) {
        setSelectedFile(file);

        if (selectedTable) {
          await parseFileData(file);
        } else {
          toast({
            title: t('settings.database.selectTableFirst'),
            description: t('settings.database.selectTableFirstDesc'),
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: t('settings.database.unsupportedFileType'),
          description: t('settings.database.unsupportedFileTypeDesc'),
          variant: "destructive",
        });
      }
    }
  };

  // Handle drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  // Enhanced batch import mutation
  const batchImportMutation = useMutation({
    mutationFn: async ({
      tableName,
      mappedData,
      options,
    }: {
      tableName: string;
      mappedData: any[];
      options: typeof importOptions;
    }) => {
      setImportProgress((prev) => ({
        ...prev,
        processing: true,
        total: mappedData.length,
      }));

      const results = {
        successful: 0,
        failed: 0,
        errors: [] as string[],
        warnings: [] as string[],
      };

      // Process in batches
      for (let i = 0; i < mappedData.length; i += options.batchSize) {
        const batch = mappedData.slice(i, i + options.batchSize);

        try {
          const response = await apiRequest(
            `/api/database/import/${tableName}/batch`,
            {
              method: "POST",
              body: JSON.stringify({
                data: batch,
                options: {
                  ...options,
                  batchNumber: Math.floor(i / options.batchSize) + 1,
                  totalBatches: Math.ceil(
                    mappedData.length / options.batchSize,
                  ),
                },
              }),
            },
          );

          const responseData = await response.json();

          results.successful += responseData.successful || batch.length;
          if (responseData.errors && responseData.errors.length > 0) {
            results.errors.push(...responseData.errors);
          }
          if (responseData.warnings && responseData.warnings.length > 0) {
            results.warnings.push(...responseData.warnings);
          }
        } catch (error) {
          results.failed += batch.length;
          results.errors.push(
            t('settings.database.batchError', { batchNumber: Math.floor(i / options.batchSize) + 1, error: String(error) }),
          );

          if (!options.continueOnError) {
            throw error;
          }
        }

        // Update progress
        setImportProgress((prev) => ({
          ...prev,
          current: Math.min(i + options.batchSize, mappedData.length),
          percentage: Math.round(
            (Math.min(i + options.batchSize, mappedData.length) /
              mappedData.length) *
              100,
          ),
          errors: results.errors,
          warnings: results.warnings,
        }));

        // Small delay to prevent overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      setImportProgress((prev) => ({ ...prev, processing: false }));
      setImportStep(3);

      toast({
        title: t('settings.database.importCompleted'),
        description: t('settings.database.importCompletedDesc', { successful: results.successful, failed: results.failed }),
      });
    },
    onError: (error) => {
      setImportProgress((prev) => ({ ...prev, processing: false }));
      toast({
        title: t('settings.database.importErrorMsg'),
        description:
          error instanceof Error
            ? error.message
            : t('settings.database.importErrorOccurred'),
        variant: "destructive",
      });
    },
  });

  // Process and start import
  const handleStartImport = () => {
    if (!selectedFile || !selectedTable || fileData.length === 0) {
      toast({
        title: t('settings.database.missingData'),
        description: t('settings.database.missingDataDesc'),
        variant: "destructive",
      });
      return;
    }

    // Map the data according to column mapping
    const mappedData = fileData.map((row) => {
      const mappedRow: any = {};
      Object.entries(columnMapping).forEach(([dbColumn, fileColumn]) => {
        if (fileColumn && row[fileColumn] !== undefined) {
          mappedRow[dbColumn] = row[fileColumn];
        }
      });
      return mappedRow;
    });

    // Filter out empty rows
    const validData = mappedData.filter((row) =>
      Object.values(row).some(
        (value) => value !== "" && value !== null && value !== undefined,
      ),
    );

    if (validData.length === 0) {
      toast({
        title: t('settings.database.noValidData'),
        description: t('settings.database.noValidDataDesc'),
        variant: "destructive",
      });
      return;
    }

    batchImportMutation.mutate({
      tableName: selectedTable,
      mappedData: validData,
      options: importOptions,
    });
  };

  // Reset import wizard
  const resetImport = () => {
    setSelectedFile(null);
    setFileData([]);
    setFileHeaders([]);
    setColumnMapping({});
    setImportStep(1);
    setImportProgress({
      processing: false,
      current: 0,
      total: 0,
      percentage: 0,
      errors: [],
      warnings: [],
    });
  };

  // Handle table selection change
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    if (selectedFile && importStep === 1) {
      // Re-parse file with new table context
      parseFileData(selectedFile);
    }
  };

  // Database operations mutations
  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/database/backup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!response.ok) throw new Error("Backup failed");

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `backup-${new Date().toISOString().split("T")[0]}.json`;
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      toast({
        title: t('settings.database.backupCreated'),
        description: t('settings.database.backupCreatedDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('settings.database.backupError'),
        description: t('settings.database.backupErrorDesc'),
        variant: "destructive",
      });
    },
  });

  const exportTableMutation = useMutation({
    mutationFn: async ({
      tableName,
      format,
    }: {
      tableName: string;
      format: string;
    }) => {
      const response = await fetch(
        `/api/database/export/${tableName}?format=${format}`,
      );
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tableName}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast({
        title: t('settings.database.exportSuccess'),
        description: t('settings.database.exportSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('settings.database.exportError'),
        description: t('settings.database.exportErrorDesc'),
        variant: "destructive",
      });
    },
  });

  const optimizeTablesMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/database/optimize", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: t('settings.database.optimizeSuccess'),
        description: t('settings.database.optimizeSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('settings.database.optimizeError'),
        description: t('settings.database.optimizeErrorDesc'),
        variant: "destructive",
      });
    },
  });

  const integrityCheckMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/database/integrity-check", {
        method: "POST",
      });
    },
    onSuccess: () => {
      toast({
        title: t('settings.database.integrityCheck'),
        description: t('settings.database.integrityCheckSuccess'),
      });
    },
    onError: () => {
      toast({
        title: t('settings.database.integrityCheckError'),
        description: t('settings.database.integrityCheckErrorDesc'),
        variant: "destructive",
      });
    },
  });

  const cleanupDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/database/cleanup", {
        method: "POST",
        body: JSON.stringify({ daysOld: 90 }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
      toast({
        title: t('settings.database.cleanupSuccess'),
        description: t('settings.database.cleanupSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('settings.database.cleanupError'),
        description: t('settings.database.cleanupErrorDesc'),
        variant: "destructive",
      });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (backupData: any) => {
      return await apiRequest("/api/database/restore", {
        method: "POST",
        body: JSON.stringify({ backupData }),
      });
    },
    onSuccess: () => {
      toast({
        title: t('settings.database.restoreSuccess'),
        description: t('settings.database.restoreSuccessDesc'),
      });
      setSelectedBackupFile(null);
      setPendingBackupData(null);
      setShowRestoreConfirm(false);
      queryClient.invalidateQueries({ queryKey: ["/api/database/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: t('settings.database.restoreError'),
        description: error?.message || t('settings.database.backupErrorDesc'),
        variant: "destructive",
      });
    },
  });

  // Handle backup file selection
  const handleBackupFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: t('settings.database.fileTooLarge'),
        description: t('settings.database.fileTooLargeDesc'),
        variant: "destructive",
      });
      return;
    }

    // Check file type
    if (!file.name.endsWith('.json')) {
      toast({
        title: t('settings.database.invalidFileType'),
        description: t('settings.database.invalidFileTypeDesc'),
        variant: "destructive",
      });
      return;
    }

    setSelectedBackupFile(file);

    // Read and parse JSON file
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!backupData.tables || typeof backupData.tables !== 'object') {
          throw new Error(t('settings.database.invalidBackupStructure'));
        }

        // Store the data and show confirmation dialog
        setPendingBackupData(backupData);
        setShowRestoreConfirm(true);
      } catch (error) {
        toast({
          title: t('settings.database.fileReadError'),
          description: error instanceof Error ? error.message : t('settings.database.fileCorrupt'),
          variant: "destructive",
        });
        setSelectedBackupFile(null);
      }
    };
    
    reader.onerror = () => {
      toast({
        title: t('settings.database.fileReadError'),
        description: t('settings.database.fileCorrupt'),
        variant: "destructive",
      });
      setSelectedBackupFile(null);
    };

    reader.readAsText(file);
  };

  // Confirm and execute restore
  const confirmRestore = () => {
    if (pendingBackupData) {
      restoreBackupMutation.mutate(pendingBackupData);
    }
  };

  // Mutation for saving user settings
  const saveUserSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const flattenedSettings = {
        displayName: settings.displayName,
        email: settings.email,
        phone: settings.phone,
        language: settings.language,
        theme: settings.theme,
        notificationsEmail: settings.notifications.email.toString(),
        notificationsSms: settings.notifications.sms.toString(),
        notificationsPush: settings.notifications.push.toString(),
        notificationsSound: settings.notifications.sound.toString(),
        dashboardAutoRefresh: settings.dashboard.autoRefresh.toString(),
        dashboardRefreshInterval: settings.dashboard.refreshInterval.toString(),
        dashboardCompactView: settings.dashboard.compactView.toString(),
      };

      return await apiRequest(`/api/settings/user/${user?.id}`, {
        method: "POST",
        body: JSON.stringify({ settings: flattenedSettings }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/settings/user", user?.id],
      });
      toast({
        title: t('settings.saveSuccess'),
        description: t('settings.userSettingsSaved'),
      });
    },
    onError: () => {
      toast({
        title: t('settings.saveError'),
        description: t('settings.saveErrorDesc'),
        variant: "destructive",
      });
    },
  });

  // Mutation for saving system settings
  const saveSystemSettingsMutation = useMutation({
    mutationFn: async (settings: any) => {
      const flattenedSettings = {
        companyName: settings.companyName,
        timezone: settings.timezone,
        currency: settings.currency,
        language: settings.language,
        dateFormat: settings.dateFormat,
        country: settings.country,
        region: settings.region,
        workingHoursStart: settings.workingHours.start,
        workingHoursEnd: settings.workingHours.end,
      };

      return await apiRequest("/api/settings/system", {
        method: "POST",
        body: JSON.stringify({ settings: flattenedSettings, userId: user?.id }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/system"] });
      toast({
        title: t('settings.saveSuccess'),
        description: t('settings.systemSettingsSaved'),
      });
    },
    onError: () => {
      toast({
        title: t('settings.saveError'),
        description: t('settings.saveErrorDesc'),
        variant: "destructive",
      });
    },
  });

  const handleSaveUserSettings = () => {
    saveUserSettingsMutation.mutate(userSettings);
  };

  const handleSaveSystemSettings = () => {
    saveSystemSettingsMutation.mutate(systemSettings);
  };

  return (
    <PageLayout title={t('settings.title')} description={t('settings.description')}>
      <Tabs defaultValue={
        ['roles', 'notifications', 'system', 'database', 'location', 'notification-center', 'whatsapp-webhooks', 'notification-events']
          .find(tab => canAccessSettingsTab(user, tab)) || 'roles'
      } className="space-y-6">
            <TabsList className="flex flex-wrap gap-1 h-auto">
              {canAccessSettingsTab(user, 'roles') && (
              <TabsTrigger value="roles" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t('settings.tabs.roles')}
              </TabsTrigger>
              )}
              {canAccessSettingsTab(user, 'notifications') && (
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                {t('settings.tabs.notifications')}
              </TabsTrigger>
              )}
              {canAccessSettingsTab(user, 'system') && (
              <TabsTrigger value="system" className="flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                {t('settings.tabs.system')}
              </TabsTrigger>
              )}
              {canAccessSettingsTab(user, 'database') && (
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                {t('settings.tabs.database')}
              </TabsTrigger>
              )}
              {canAccessSettingsTab(user, 'location') && (
              <TabsTrigger value="location" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {t('settings.tabs.location')}
              </TabsTrigger>
              )}
              {canAccessSettingsTab(user, 'notification-center') && (
              <TabsTrigger value="notification-center" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                {t('settings.tabs.notificationCenter')}
              </TabsTrigger>
              )}
              {canAccessSettingsTab(user, 'whatsapp-webhooks') && (
              <TabsTrigger value="whatsapp-webhooks" className="flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                {t('settings.tabs.whatsappWebhooks')}
              </TabsTrigger>
              )}
              {canAccessSettingsTab(user, 'notification-events') && (
              <TabsTrigger value="notification-events" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                أحداث الإشعارات
              </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="roles" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {t('settings.roles.title')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.roles.description')}
                  </p>
                </CardHeader>
                <CardContent>
                  <RoleManagementTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    {t('settings.alerts.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">
                          {t('settings.alerts.emailAlerts')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.alerts.emailAlertsDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.notifications.email}
                        onCheckedChange={(checked) =>
                          setUserSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              email: checked,
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">
                          {t('settings.alerts.smsAlerts')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.alerts.smsAlertsDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.notifications.sms}
                        onCheckedChange={(checked) =>
                          setUserSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              sms: checked,
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">{t('settings.alerts.pushAlerts')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.alerts.pushAlertsDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.notifications.push}
                        onCheckedChange={(checked) =>
                          setUserSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              push: checked,
                            },
                          }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {userSettings.notifications.sound ? (
                          <Volume2 className="w-4 h-4" />
                        ) : (
                          <VolumeX className="w-4 h-4" />
                        )}
                        <div>
                          <Label className="text-base">{t('settings.alerts.sounds')}</Label>
                          <p className="text-sm text-muted-foreground">
                            {t('settings.alerts.soundsDesc')}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={userSettings.notifications.sound}
                        onCheckedChange={(checked) =>
                          setUserSettings((prev) => ({
                            ...prev,
                            notifications: {
                              ...prev.notifications,
                              sound: checked,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">{t('settings.dashboardSettings.title')}</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">{t('settings.dashboardSettings.autoRefresh')}</Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.dashboardSettings.autoRefreshDesc')}
                        </p>
                      </div>
                      <Switch
                        checked={userSettings.dashboard.autoRefresh}
                        onCheckedChange={(checked) =>
                          setUserSettings((prev) => ({
                            ...prev,
                            dashboard: {
                              ...prev.dashboard,
                              autoRefresh: checked,
                            },
                          }))
                        }
                      />
                    </div>

                    {userSettings.dashboard.autoRefresh && (
                      <div className="space-y-2">
                        <Label htmlFor="refreshInterval">
                          {t('settings.dashboardSettings.refreshInterval')}
                        </Label>
                        <Select
                          value={(
                            userSettings.dashboard.refreshInterval ?? 30
                          ).toString()}
                          onValueChange={(value) =>
                            setUserSettings((prev) => ({
                              ...prev,
                              dashboard: {
                                ...prev.dashboard,
                                refreshInterval: parseInt(value),
                              },
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">{t('settings.dashboardSettings.15seconds')}</SelectItem>
                            <SelectItem value="30">{t('settings.dashboardSettings.30seconds')}</SelectItem>
                            <SelectItem value="60">{t('settings.dashboardSettings.1minute')}</SelectItem>
                            <SelectItem value="300">{t('settings.dashboardSettings.5minutes')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveUserSettings}
                      disabled={saveUserSettingsMutation.isPending}
                    >
                      {saveUserSettingsMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {t('settings.saveChanges')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5" />
                    {t('settings.system.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">{t('settings.system.companyName')}</Label>
                      <Input
                        id="companyName"
                        value={systemSettings.companyName}
                        onChange={(e) =>
                          setSystemSettings((prev) => ({
                            ...prev,
                            companyName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">{t('settings.system.country')}</Label>
                      <Input
                        id="country"
                        value={systemSettings.country}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">{t('settings.system.region')}</Label>
                      <Select
                        value={systemSettings.region ?? "الرياض"}
                        onValueChange={(value) =>
                          setSystemSettings((prev) => ({
                            ...prev,
                            region: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="الرياض">{t('settings.system.regions.riyadh')}</SelectItem>
                          <SelectItem value="جدة">{t('settings.system.regions.jeddah')}</SelectItem>
                          <SelectItem value="الدمام">{t('settings.system.regions.dammam')}</SelectItem>
                          <SelectItem value="مكة المكرمة">
                            {t('settings.system.regions.makkah')}
                          </SelectItem>
                          <SelectItem value="المدينة المنورة">
                            {t('settings.system.regions.madinah')}
                          </SelectItem>
                          <SelectItem value="تبوك">{t('settings.system.regions.tabuk')}</SelectItem>
                          <SelectItem value="أبها">{t('settings.system.regions.abha')}</SelectItem>
                          <SelectItem value="حائل">{t('settings.system.regions.hail')}</SelectItem>
                          <SelectItem value="الطائف">{t('settings.system.regions.taif')}</SelectItem>
                          <SelectItem value="الخبر">{t('settings.system.regions.khobar')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">{t('settings.system.timezone')}</Label>
                      <Input
                        id="timezone"
                        value={t('settings.system.timezoneValue')}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">{t('settings.system.currency')}</Label>
                      <Input
                        id="currency"
                        value={t('settings.system.currencyValue')}
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="language">{t('settings.system.systemLanguage')}</Label>
                      <Select
                        value={systemSettings.language ?? "ar"}
                        onValueChange={(value) =>
                          setSystemSettings((prev) => ({
                            ...prev,
                            language: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ar">{t('settings.system.arabic')}</SelectItem>
                          <SelectItem value="en">{t('settings.system.english')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">{t('settings.system.workingHours')}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="workStart">{t('settings.system.workStart')}</Label>
                        <Input
                          id="workStart"
                          type="time"
                          value={systemSettings.workingHours.start}
                          onChange={(e) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                start: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="workEnd">{t('settings.system.workEnd')}</Label>
                        <Input
                          id="workEnd"
                          type="time"
                          value={systemSettings.workingHours.end}
                          onChange={(e) =>
                            setSystemSettings((prev) => ({
                              ...prev,
                              workingHours: {
                                ...prev.workingHours,
                                end: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">{t('settings.system.shifts')}</h4>
                    <div className="space-y-2">
                      {systemSettings.shifts.map((shift) => (
                        <div
                          key={shift.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div>
                            <span className="font-medium">{shift.name}</span>
                            <p className="text-sm text-muted-foreground">
                              {t('settings.system.shiftFromTo', { start: shift.start, end: shift.end })}
                            </p>
                          </div>
                          <Badge variant="outline">{t('settings.system.active')}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSystemSettings}
                      disabled={saveSystemSettingsMutation.isPending}
                    >
                      {saveSystemSettingsMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {t('settings.system.saveSystemSettings')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    {t('settings.database.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Backup Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Archive className="w-4 h-4" />
                      {t('settings.database.backups')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Download className="w-4 h-4 text-blue-500" />
                            <Label className="text-sm font-medium">
                              {t('settings.database.createBackup')}
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.database.createBackupDesc')}
                          </p>
                          <Button
                            className="w-full"
                            size="sm"
                            disabled={createBackupMutation.isPending}
                            onClick={() => createBackupMutation.mutate()}
                          >
                            {createBackupMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4 mr-2" />
                            )}
                            {t('settings.database.exportBackup')}
                          </Button>
                        </div>
                      </Card>

                      <Card className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4 text-green-500" />
                            <Label className="text-sm font-medium">
                              {t('settings.database.restoreBackup')}
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {t('settings.database.restoreBackupDesc')}
                          </p>
                          <input
                            type="file"
                            ref={backupFileInputRef}
                            onChange={handleBackupFileSelect}
                            accept=".json"
                            className="hidden"
                            data-testid="input-backup-file"
                          />
                          <Button
                            variant="outline"
                            className="w-full"
                            size="sm"
                            onClick={() => backupFileInputRef.current?.click()}
                            disabled={restoreBackupMutation.isPending}
                            data-testid="button-restore-backup"
                          >
                            {restoreBackupMutation.isPending ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            {selectedBackupFile ? selectedBackupFile.name : t('settings.database.selectFileAndRestore')}
                          </Button>
                          {selectedBackupFile && !restoreBackupMutation.isPending && (
                            <p className="text-xs text-green-600">
                              {t('settings.database.fileSelected')} {selectedBackupFile.name}
                            </p>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Enhanced Import/Export Tables */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <HardDrive className="w-4 h-4" />
                        {t('settings.database.importExport')}
                      </h4>
                      {importStep > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetImport}
                        >
                          {t('settings.database.reset')}
                        </Button>
                      )}
                    </div>

                    {/* Export Section */}
                    <Card className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Download className="w-4 h-4 text-blue-500" />
                          <Label className="text-sm font-medium">
                            {t('settings.database.exportData')}
                          </Label>
                        </div>

                        <div className="space-y-2">
                          <Label>{t('settings.database.selectTableForExport')}</Label>
                          <Select
                            value={selectedTable}
                            onValueChange={handleTableChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('settings.database.selectTablePlaceholder')} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[400px] overflow-y-auto">
                              <SelectItem value="customers">{t('settings.database.tables.customers')}</SelectItem>
                              <SelectItem value="categories">{t('settings.database.tables.categories')}</SelectItem>
                              <SelectItem value="sections">{t('settings.database.tables.sections')}</SelectItem>
                              <SelectItem value="items">{t('settings.database.tables.items')}</SelectItem>
                              <SelectItem value="customer_products">{t('settings.database.tables.customer_products')}</SelectItem>
                              <SelectItem value="users">{t('settings.database.tables.users')}</SelectItem>
                              <SelectItem value="roles">{t('settings.database.tables.roles')}</SelectItem>
                              <SelectItem value="machines">{t('settings.database.tables.machines')}</SelectItem>
                              <SelectItem value="locations">{t('settings.database.tables.locations')}</SelectItem>
                              <SelectItem value="suppliers">{t('settings.database.tables.suppliers')}</SelectItem>
                              <SelectItem value="orders">{t('settings.database.tables.orders')}</SelectItem>
                              <SelectItem value="production_orders">{t('settings.database.tables.production_orders')}</SelectItem>
                              <SelectItem value="rolls">{t('settings.database.tables.rolls')}</SelectItem>
                              <SelectItem value="cuts">{t('settings.database.tables.cuts')}</SelectItem>
                              <SelectItem value="inventory">{t('settings.database.tables.inventory')}</SelectItem>
                              <SelectItem value="inventory_movements">{t('settings.database.tables.inventory_movements')}</SelectItem>
                              <SelectItem value="warehouse_receipts">{t('settings.database.tables.warehouse_receipts')}</SelectItem>
                              <SelectItem value="warehouse_transactions">{t('settings.database.tables.warehouse_transactions')}</SelectItem>
                              <SelectItem value="maintenance_requests">{t('settings.database.tables.maintenance_requests')}</SelectItem>
                              <SelectItem value="maintenance_actions">{t('settings.database.tables.maintenance_actions')}</SelectItem>
                              <SelectItem value="maintenance_reports">{t('settings.database.tables.maintenance_reports')}</SelectItem>
                              <SelectItem value="spare_parts">{t('settings.database.tables.spare_parts')}</SelectItem>
                              <SelectItem value="consumable_parts">{t('settings.database.tables.consumable_parts')}</SelectItem>
                              <SelectItem value="consumable_parts_transactions">{t('settings.database.tables.consumable_parts_transactions')}</SelectItem>
                              <SelectItem value="waste">{t('settings.database.tables.waste')}</SelectItem>
                              <SelectItem value="quality_checks">{t('settings.database.tables.quality_checks')}</SelectItem>
                              <SelectItem value="machine_queues">{t('settings.database.tables.machine_queues')}</SelectItem>
                              <SelectItem value="production_settings">{t('settings.database.tables.production_settings')}</SelectItem>
                              <SelectItem value="operator_negligence_reports">{t('settings.database.tables.operator_negligence_reports')}</SelectItem>
                              <SelectItem value="violations">{t('settings.database.tables.violations')}</SelectItem>
                              <SelectItem value="user_requests">{t('settings.database.tables.user_requests')}</SelectItem>
                              <SelectItem value="attendance">{t('settings.database.tables.attendance')}</SelectItem>
                              <SelectItem value="training_programs">{t('settings.database.tables.training_programs')}</SelectItem>
                              <SelectItem value="training_records">{t('settings.database.tables.training_records')}</SelectItem>
                              <SelectItem value="training_materials">{t('settings.database.tables.training_materials')}</SelectItem>
                              <SelectItem value="training_enrollments">{t('settings.database.tables.training_enrollments')}</SelectItem>
                              <SelectItem value="training_evaluations">{t('settings.database.tables.training_evaluations')}</SelectItem>
                              <SelectItem value="training_certificates">{t('settings.database.tables.training_certificates')}</SelectItem>
                              <SelectItem value="performance_reviews">{t('settings.database.tables.performance_reviews')}</SelectItem>
                              <SelectItem value="performance_criteria">{t('settings.database.tables.performance_criteria')}</SelectItem>
                              <SelectItem value="performance_ratings">{t('settings.database.tables.performance_ratings')}</SelectItem>
                              <SelectItem value="leave_types">{t('settings.database.tables.leave_types')}</SelectItem>
                              <SelectItem value="leave_requests">{t('settings.database.tables.leave_requests')}</SelectItem>
                              <SelectItem value="leave_balances">{t('settings.database.tables.leave_balances')}</SelectItem>
                              <SelectItem value="admin_decisions">{t('settings.database.tables.admin_decisions')}</SelectItem>
                              <SelectItem value="company_profile">{t('settings.database.tables.company_profile')}</SelectItem>
                              <SelectItem value="notifications">{t('settings.database.tables.notifications')}</SelectItem>
                              <SelectItem value="notification_templates">{t('settings.database.tables.notification_templates')}</SelectItem>
                              <SelectItem value="factory_locations">{t('settings.database.tables.factory_locations')}</SelectItem>
                              <SelectItem value="system_alerts">{t('settings.database.tables.system_alerts')}</SelectItem>
                              <SelectItem value="alert_rules">{t('settings.database.tables.alert_rules')}</SelectItem>
                              <SelectItem value="system_health_checks">{t('settings.database.tables.system_health_checks')}</SelectItem>
                              <SelectItem value="system_performance_metrics">{t('settings.database.tables.system_performance_metrics')}</SelectItem>
                              <SelectItem value="corrective_actions">{t('settings.database.tables.corrective_actions')}</SelectItem>
                              <SelectItem value="system_analytics">{t('settings.database.tables.system_analytics')}</SelectItem>
                              <SelectItem value="quick_notes">{t('settings.database.tables.quick_notes')}</SelectItem>
                              <SelectItem value="note_attachments">{t('settings.database.tables.note_attachments')}</SelectItem>
                              <SelectItem value="mixing_batches">{t('settings.database.tables.mixing_batches')}</SelectItem>
                              <SelectItem value="batch_ingredients">{t('settings.database.tables.batch_ingredients')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            disabled={
                              !selectedTable || exportTableMutation.isPending
                            }
                            onClick={() =>
                              selectedTable &&
                              exportTableMutation.mutate({
                                tableName: selectedTable,
                                format: "csv",
                              })
                            }
                          >
                            <Download className="w-4 h-4" />
                            {t('settings.database.exportCsv')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            disabled={
                              !selectedTable || exportTableMutation.isPending
                            }
                            onClick={() =>
                              selectedTable &&
                              exportTableMutation.mutate({
                                tableName: selectedTable,
                                format: "json",
                              })
                            }
                          >
                            <Download className="w-4 h-4" />
                            {t('settings.database.exportJson')}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center gap-2"
                            disabled={
                              !selectedTable || exportTableMutation.isPending
                            }
                            onClick={() =>
                              selectedTable &&
                              exportTableMutation.mutate({
                                tableName: selectedTable,
                                format: "excel",
                              })
                            }
                          >
                            <Download className="w-4 h-4" />
                            {t('settings.database.exportExcel')}
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Import Section */}
                    <Card className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Upload className="w-4 h-4 text-green-500" />
                          <Label className="text-sm font-medium">
                            {t('settings.database.advancedImport')}
                          </Label>
                          <Badge variant="outline" className="text-xs">
                            {t('settings.database.step', { step: importStep })}
                          </Badge>
                        </div>

                        {/* Step 1: File Upload */}
                        {importStep === 1 && (
                          <div className="space-y-4">
                            <div
                              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                                dragActive
                                  ? "border-primary bg-primary/5"
                                  : "border-gray-300"
                              }`}
                              onDragEnter={handleDrag}
                              onDragLeave={handleDrag}
                              onDragOver={handleDrag}
                              onDrop={handleDrop}
                            >
                              <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                              {selectedFile ? (
                                <div className="space-y-2">
                                  <p className="text-sm text-green-600 font-medium">
                                    {t('settings.database.fileSelected')} {selectedFile.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {(selectedFile.size / 1024).toFixed(1)} KB
                                  </p>
                                  <div className="flex gap-2 justify-center">
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        selectedFile &&
                                        parseFileData(selectedFile)
                                      }
                                      disabled={!selectedTable}
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      {t('settings.database.parseData')}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setSelectedFile(null)}
                                    >
                                      {t('settings.database.cancel')}
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600 mb-2">
                                    {t('settings.database.dragDropFile')}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {t('settings.database.supportedFormats')}
                                  </p>
                                  <p className="text-xs text-blue-600 mt-1">
                                    {t('settings.database.supportsRecords')}
                                  </p>
                                  <input
                                    type="file"
                                    id="fileInput"
                                    className="hidden"
                                    accept=".csv,.json,.xlsx"
                                    onChange={(e) =>
                                      handleFileUpload(e.target.files)
                                    }
                                  />
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() =>
                                      document
                                        .getElementById("fileInput")
                                        ?.click()
                                    }
                                  >
                                    {t('settings.database.selectFile')}
                                  </Button>
                                </>
                              )}
                            </div>

                            {!selectedTable && (
                              <div className="text-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-700">
                                  {t('settings.database.selectTableFirstNote')}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Step 2: Data Preview & Column Mapping */}
                        {importStep === 2 && fileData.length > 0 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-medium">
                                {t('settings.database.dataPreview')}
                              </h5>
                              <Badge variant="secondary">
                                {fileData.length} {t('settings.database.records')}
                              </Badge>
                            </div>

                            {/* Column Mapping */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">
                                {t('settings.database.mapColumns')}
                              </Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 border rounded-lg bg-gray-50">
                                {getTableSchema(selectedTable).map(
                                  (dbColumn) => (
                                    <div
                                      key={dbColumn}
                                      className="flex items-center gap-2 text-sm"
                                    >
                                      <Label className="w-24 text-right font-medium">
                                        {dbColumn}:
                                      </Label>
                                      <Select
                                        value={columnMapping[dbColumn] || ""}
                                        onValueChange={(value) =>
                                          setColumnMapping((prev) => ({
                                            ...prev,
                                            [dbColumn]: value,
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="h-8 text-xs">
                                          <SelectValue placeholder={t('settings.database.selectColumn')} />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="none">
                                            {t('settings.database.none')}
                                          </SelectItem>
                                          {fileHeaders.map((header) => (
                                            <SelectItem
                                              key={header}
                                              value={header}
                                            >
                                              {header}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>

                            {/* Import Options */}
                            <div className="space-y-3">
                              <Label className="text-sm font-medium">
                                {t('settings.database.importOptions')}
                              </Label>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 border rounded-lg bg-gray-50">
                                <div className="space-y-2">
                                  <Label className="text-xs">{t('settings.database.batchSize')}</Label>
                                  <Select
                                    value={importOptions.batchSize.toString()}
                                    onValueChange={(value) =>
                                      setImportOptions((prev) => ({
                                        ...prev,
                                        batchSize: parseInt(value),
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="500">
                                        500 {t('settings.database.recordsLabel')}
                                      </SelectItem>
                                      <SelectItem value="1000">
                                        1000 {t('settings.database.recordsLabel')}
                                      </SelectItem>
                                      <SelectItem value="2000">
                                        2000 {t('settings.database.recordsLabel')}
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={importOptions.updateExisting}
                                      onCheckedChange={(checked) =>
                                        setImportOptions((prev) => ({
                                          ...prev,
                                          updateExisting: checked,
                                        }))
                                      }
                                    />
                                    <Label className="text-xs">
                                      {t('settings.database.updateExisting')}
                                    </Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={importOptions.continueOnError}
                                      onCheckedChange={(checked) =>
                                        setImportOptions((prev) => ({
                                          ...prev,
                                          continueOnError: checked,
                                        }))
                                      }
                                    />
                                    <Label className="text-xs">
                                      {t('settings.database.continueOnError')}
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Data Preview */}
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">
                                {t('settings.database.dataPreviewFirst5')}
                              </Label>
                              <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-xs">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      {fileHeaders
                                        .slice(0, 5)
                                        .map((header, index) => (
                                          <th
                                            key={index}
                                            className="p-2 text-right border"
                                          >
                                            {header}
                                          </th>
                                        ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {fileData.slice(0, 5).map((row, index) => (
                                      <tr
                                        key={index}
                                        className="hover:bg-gray-50"
                                      >
                                        {fileHeaders
                                          .slice(0, 5)
                                          .map((header, colIndex) => (
                                            <td
                                              key={colIndex}
                                              className="p-2 border"
                                            >
                                              {row[header] || ""}
                                            </td>
                                          ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="outline"
                                onClick={() => setImportStep(1)}
                              >
                                {t('common.back')}
                              </Button>
                              <Button onClick={handleStartImport}>
                                {t('settings.database.startImport')}
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Import Progress & Results */}
                        {importStep === 3 && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-medium">
                                {t('settings.database.importStatus')}
                              </h5>
                              <Badge
                                variant={
                                  importProgress.processing
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {importProgress.processing
                                  ? t('settings.database.processing')
                                  : t('settings.database.completed')}
                              </Badge>
                            </div>

                            {importProgress.processing && (
                              <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                  <span>{t('settings.database.progress')}</span>
                                  <span>
                                    {importProgress.current} /{" "}
                                    {importProgress.total}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                      width: `${importProgress.percentage}%`,
                                    }}
                                  ></div>
                                </div>
                                <div className="text-center text-sm text-gray-600">
                                  {t('settings.database.percentComplete', { percent: importProgress.percentage })}
                                </div>
                              </div>
                            )}

                            {importProgress.errors.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-red-600">
                                  {t('settings.database.errors')}
                                </Label>
                                <div className="max-h-32 overflow-y-auto p-3 bg-red-50 border border-red-200 rounded-lg">
                                  {importProgress.errors.map((error, index) => (
                                    <p
                                      key={index}
                                      className="text-xs text-red-700 mb-1"
                                    >
                                      {error}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {importProgress.warnings.length > 0 && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium text-yellow-600">
                                  {t('settings.database.warnings')}
                                </Label>
                                <div className="max-h-32 overflow-y-auto p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                  {importProgress.warnings.map(
                                    (warning, index) => (
                                      <p
                                        key={index}
                                        className="text-xs text-yellow-700 mb-1"
                                      >
                                        {warning}
                                      </p>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}

                            <div className="flex gap-2 justify-end">
                              <Button variant="outline" onClick={resetImport}>
                                {t('settings.database.newImport')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>

                  <Separator />

                  {/* Database Statistics */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <HardDrive className="w-4 h-4" />
                      {t('settings.database.statistics')}
                    </h4>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="p-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {databaseStats.tableCount}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('settings.database.tableCount')}
                          </div>
                        </div>
                      </Card>
                      <Card className="p-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {databaseStats.totalRecords.toLocaleString("ar-SA")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('settings.database.totalRecords')}
                          </div>
                        </div>
                      </Card>
                      <Card className="p-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {databaseStats.databaseSize}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('settings.database.databaseSize')}
                          </div>
                        </div>
                      </Card>
                      <Card className="p-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {databaseStats.lastBackup}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('settings.database.lastBackup')}
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>

                  <Separator />

                  {/* Maintenance Operations */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <SettingsIcon className="w-4 h-4" />
                      {t('settings.database.maintenance')}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        disabled={optimizeTablesMutation.isPending}
                        onClick={() => optimizeTablesMutation.mutate()}
                      >
                        {optimizeTablesMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        {t('settings.database.optimizeTables')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                        disabled={integrityCheckMutation.isPending}
                        onClick={() => integrityCheckMutation.mutate()}
                      >
                        {integrityCheckMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Database className="w-4 h-4" />
                        )}
                        {t('settings.database.integrityCheck')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="flex items-center gap-2"
                        disabled={cleanupDataMutation.isPending}
                        onClick={() => cleanupDataMutation.mutate()}
                      >
                        {cleanupDataMutation.isPending ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        {t('settings.database.cleanOldData')}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button>
                      <Save className="w-4 h-4 mr-2" />
                      {t('settings.database.saveDatabaseSettings')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    {t('settings.security.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">
                        {t('settings.security.changePassword')}
                      </h4>
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">
                          {t('settings.security.currentPassword')}
                        </Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          placeholder={t('settings.security.currentPasswordPlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">{t('settings.security.newPassword')}</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          placeholder={t('settings.security.newPasswordPlaceholder')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                          {t('settings.security.confirmPassword')}
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder={t('settings.security.confirmPasswordPlaceholder')}
                        />
                      </div>
                      <Button className="mt-2">{t('settings.security.updatePassword')}</Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">{t('settings.security.sessionSettings')}</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">
                          {t('settings.security.autoSessionExpiry')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('settings.security.autoSessionExpiryDesc')}
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">
                        {t('settings.security.expiryDuration')}
                      </Label>
                      <Select defaultValue="30">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">{t('settings.security.15minutes')}</SelectItem>
                          <SelectItem value="30">{t('settings.security.30minutes')}</SelectItem>
                          <SelectItem value="60">{t('settings.security.1hour')}</SelectItem>
                          <SelectItem value="120">{t('settings.security.2hours')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notification-center" className="space-y-6">
              <NotificationCenter />
            </TabsContent>

            <TabsContent value="location" className="space-y-6">
              <LocationSettingsForm />
            </TabsContent>

            <TabsContent value="whatsapp-webhooks" className="space-y-6">
              <WhatsAppWebhooksTab />
            </TabsContent>

            <TabsContent value="notification-events" className="space-y-6">
              <NotificationEventSettingsTab />
            </TabsContent>
                  </Tabs>

        {/* Confirmation Dialog for Restore */}
        <AlertDialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('settings.restoreConfirm.title')}</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>{t('settings.restoreConfirm.areYouSure')}</p>
                <p className="font-semibold text-red-600">
                  {t('settings.restoreConfirm.warning')}
                </p>

                {pendingBackupData?.metadata && (
                  <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                    <p>{t('settings.restoreConfirm.file')}: {selectedBackupFile?.name}</p>
                    <p>{t('settings.restoreConfirm.tableCount')}: {pendingBackupData.metadata.totalTables}</p>
                    <p>
                      {t('settings.restoreConfirm.date')}:{" "}
                      {new Date(pendingBackupData.metadata.timestamp).toLocaleString("ar-SA")}
                    </p>
                  </div>
                )}

                <p className="text-sm mt-2">{t('settings.restoreConfirm.cannotUndo')}</p>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowRestoreConfirm(false);
                  setSelectedBackupFile(null);
                  setPendingBackupData(null);
                }}
              >
                {t('settings.restoreConfirm.cancel')}
              </AlertDialogCancel>

              <AlertDialogAction
                onClick={confirmRestore}
                disabled={restoreBackupMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {restoreBackupMutation.isPending ? t('settings.restoreConfirm.restoring') : t('settings.restoreConfirm.restore')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </PageLayout>
  );
}

          
  

// Component for Location Settings with Multiple Locations
    
      
function LocationSettingsForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<any>(null);

  // Form state
  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [latitude, setLatitude] = useState(24.7136);
  const [longitude, setLongitude] = useState(46.6753);
  const [radius, setRadius] = useState(500);
  const [description, setDescription] = useState("");

  // Fetch factory locations
  const { data: locations, isLoading } = useQuery<any[]>({
    queryKey: ["/api/factory-locations"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/factory-locations", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      toast({ title: t('settings.location.locationAdded') });
      resetForm();
    },
    onError: () => {
      toast({ title: t('settings.location.addError'), variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest(`/api/factory-locations/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/system-settings"] });
      toast({ title: t('settings.location.locationUpdated') });
      resetForm();
    },
    onError: () => {
      toast({ title: t('settings.location.updateError'), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/factory-locations/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-locations"] });
      toast({ title: t('settings.location.locationDeleted') });
    },
    onError: () => {
      toast({ title: t('settings.location.deleteError'), variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest(`/api/factory-locations/${id}`, {
        method: "PUT",
        body: JSON.stringify({ is_active: !isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/factory-locations"] });
      toast({ title: t('settings.location.statusUpdated') });
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingLocation(null);
    setName("");
    setNameAr("");
    setLatitude(24.7136);
    setLongitude(46.6753);
    setRadius(500);
    setDescription("");
  };

  const handleEdit = (location: any) => {
    setEditingLocation(location);
    setName(location.name);
    setNameAr(location.name_ar);
    setLatitude(parseFloat(location.latitude));
    setLongitude(parseFloat(location.longitude));
    setRadius(location.allowed_radius);
    setDescription(location.description || "");
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!name || !nameAr) {
      toast({ title: t('settings.location.fillRequiredFields'), variant: "destructive" });
      return;
    }

    const data = {
      name,
      name_ar: nameAr,
      latitude: latitude.toString(),
      longitude: longitude.toString(),
      allowed_radius: radius,
      description,
      is_active: true,
    };

    if (editingLocation) {
      updateMutation.mutate({ id: editingLocation.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) {
    return <div>{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* List of locations */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">{t('settings.location.factoryLocations')}</h3>
          <Button onClick={() => setShowForm(!showForm)} data-testid="button-add-location">
            <Plus className="w-4 h-4 ml-2" />
            {showForm ? t('common.cancel') : t('settings.location.addNewLocation')}
          </Button>
        </div>

        {locations && locations.length > 0 ? (
          <div className="grid gap-4">
            {locations.map((location: any) => (
              <Card key={location.id} className={!location.is_active ? "opacity-50" : ""}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{location.name_ar}</h4>
                        <Badge variant={location.is_active ? "default" : "secondary"}>
                          {location.is_active ? t('settings.location.active') : t('settings.location.inactive')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {location.description || location.name}
                      </p>
                      <div className="text-sm space-y-1">
                        <p>
                          <strong>{t('settings.location.coordinates')}:</strong> {location.latitude}, {location.longitude}
                        </p>
                        <p>
                          <strong>{t('settings.location.radius')}:</strong> {location.allowed_radius} {t('settings.location.meters')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ 
                          id: location.id, 
                          isActive: location.is_active 
                        })}
                        data-testid={`button-toggle-${location.id}`}
                      >
                        {location.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(location)}
                        data-testid={`button-edit-${location.id}`}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteMutation.mutate(location.id)}
                        data-testid={`button-delete-${location.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">{t('settings.location.noLocations')}</p>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingLocation ? t('settings.location.editLocation') : t('settings.location.addNewLocation')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name-en">{t('settings.location.nameEnglish')}</Label>
                <Input
                  id="name-en"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Main Factory"
                  data-testid="input-name-en"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name-ar">{t('settings.location.nameArabic')}</Label>
                <Input
                  id="name-ar"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder={t('settings.location.nameArabicPlaceholder')}
                  data-testid="input-name-ar"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('settings.location.descriptionOptional')}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('settings.location.descriptionPlaceholder')}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label>{t('settings.location.selectFromMap')}</Label>
              <LocationMapPicker
                latitude={latitude}
                longitude={longitude}
                radius={radius}
                onLocationChange={(lat, lng) => {
                  setLatitude(lat);
                  setLongitude(lng);
                }}
                editable={true}
              />
              <p className="text-xs text-gray-500">
                {t('settings.location.clickMapToSelect')}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="lat">{t('settings.location.latitude')}</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value))}
                  data-testid="input-lat"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lng">{t('settings.location.longitude')}</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value))}
                  data-testid="input-lng"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">{t('settings.location.radiusMeters')}</Label>
                <Input
                  id="radius"
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  data-testid="input-radius"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1"
                data-testid="button-submit-location"
              >
                <Save className="w-4 h-4 ml-2" />
                {editingLocation ? t('settings.location.updateLocation') : t('settings.location.addLocation')}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                data-testid="button-cancel-form"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
