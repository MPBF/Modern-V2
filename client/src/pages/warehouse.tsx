import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
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
} from "../components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
  Truck,
  Factory,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Hash,
  ShoppingCart,
  Scale,
  FileText,
  User,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardCheck,
} from "lucide-react";
import { VouchersList } from "../components/warehouse/VouchersList";
import { VoucherForm } from "../components/warehouse/VoucherForm";
import { InventoryCountForm } from "../components/warehouse/InventoryCountForm";
import PageLayout from "../components/layout/PageLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";

const inventoryFormSchema = z.object({
  material_group_id: z.string().min(1, "مجموعة المواد مطلوبة"),
  item_id: z.string().min(1, "الصنف مطلوب"),
  location_id: z.string().transform((val) => parseInt(val)),
  current_stock: z.string().transform((val) => parseFloat(val)),
  unit: z.string().min(1, "الوحدة مطلوبة"),
});

const locationFormSchema = z.object({
  name: z.string().min(1, "الاسم الإنجليزي مطلوب"),
  name_ar: z.string().min(1, "الاسم العربي مطلوب"),
  coordinates: z.string().optional(),
  tolerance_range: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : undefined)),
});

const movementFormSchema = z.object({
  inventory_id: z.string().transform((val) => parseInt(val)),
  movement_type: z.string().min(1, "نوع الحركة مطلوب"),
  quantity: z.string().transform((val) => parseFloat(val)),
  reference_number: z.string().optional(),
  reference_type: z.string().optional(),
  notes: z.string().optional(),
});

export default function Warehouse() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [editingMovement, setEditingMovement] = useState<any>(null);
  const [activeLocationTab, setActiveLocationTab] = useState<string>("");
  
  const [voucherFormType, setVoucherFormType] = useState<"raw-material-in" | "raw-material-out" | "finished-goods-in" | "finished-goods-out">("raw-material-in");
  const [isVoucherFormOpen, setIsVoucherFormOpen] = useState(false);
  const [isInventoryCountOpen, setIsInventoryCountOpen] = useState(false);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const openVoucherForm = (type: typeof voucherFormType) => {
    setVoucherFormType(type);
    setIsVoucherFormOpen(true);
  };

  // Fetch inventory data
  const { data: inventoryItems = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ["/api/inventory"],
    queryFn: async () => {
      const response = await fetch("/api/inventory");
      if (!response.ok) throw new Error("فشل في جلب بيانات المخزون");
      return response.json();
    },
  });

  // Fetch inventory stats
  const { data: stats } = useQuery({
    queryKey: ["/api/inventory/stats"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/stats");
      if (!response.ok) throw new Error("فشل في جلب إحصائيات المخزون");
      return response.json();
    },
  });

  // Fetch all items initially
  const { data: allItems = [] } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const response = await fetch("/api/items");
      if (!response.ok) throw new Error("فشل في جلب الأصناف");
      return response.json();
    },
  });

  // Fetch locations for dropdown
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["/api/locations"],
    queryFn: async () => {
      const response = await fetch("/api/locations");
      if (!response.ok) throw new Error("فشل في جلب المواقع");
      return response.json();
    },
  });

  // Fetch material groups for dropdown
  const { data: materialGroups = [] } = useQuery({
    queryKey: ["/api/material-groups"],
    queryFn: async () => {
      const response = await fetch("/api/material-groups");
      if (!response.ok) throw new Error("فشل في جلب مجموعات المواد");
      return response.json();
    },
  });

  // Fetch inventory movements
  const { data: movements = [], isLoading: movementsLoading } = useQuery({
    queryKey: ["/api/inventory-movements"],
    queryFn: async () => {
      const response = await fetch("/api/inventory-movements");
      if (!response.ok) throw new Error("فشل في جلب حركات المخزون");
      return response.json();
    },
  });

  // Add/Update mutation
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem
        ? `/api/inventory/${editingItem.id}`
        : "/api/inventory";
      const method = editingItem ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("فشل في حفظ البيانات");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stats"] });
      setIsAddDialogOpen(false);
      setEditingItem(null);
      toast({
        title: "تم الحفظ بنجاح",
        description: editingItem
          ? "تم تحديث صنف المخزون"
          : "تم إضافة صنف المخزون",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ البيانات",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/inventory/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("فشل في الحذف");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stats"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف صنف المخزون",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف الصنف",
        variant: "destructive",
      });
    },
  });

  // Location mutations
  const locationMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingLocation
        ? `/api/locations/${editingLocation.id}`
        : "/api/locations";
      const method = editingLocation ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("فشل في حفظ البيانات");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      setIsLocationDialogOpen(false);
      setEditingLocation(null);
      toast({
        title: "تم الحفظ بنجاح",
        description: editingLocation ? "تم تحديث الموقع" : "تم إضافة الموقع",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ البيانات",
        variant: "destructive",
      });
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/locations/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("فشل في الحذف");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف الموقع",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف الموقع",
        variant: "destructive",
      });
    },
  });

  // Movement mutations
  const movementMutation = useMutation({
    mutationFn: async (data: any) => {
      // Ensure user is authenticated
      if (!user?.id) {
        throw new Error("يجب تسجيل الدخول أولاً");
      }

      const response = await fetch("/api/inventory-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, created_by: user.id }),
      });

      if (!response.ok) throw new Error("فشل في حفظ البيانات");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/stats"] });
      setIsMovementDialogOpen(false);
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم إضافة حركة المخزون",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حفظ البيانات",
        variant: "destructive",
      });
    },
  });

  const deleteMovementMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/inventory-movements/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("فشل في الحذف");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-movements"] });
      toast({
        title: "تم الحذف بنجاح",
        description: "تم حذف الحركة",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في حذف الحركة",
        variant: "destructive",
      });
    },
  });

  const form = useForm({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      material_group_id: "",
      item_id: "",
      location_id: "",
      current_stock: "",
      unit: "كيلو",
    },
  });

  const locationForm = useForm({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: "",
      name_ar: "",
      coordinates: "",
      tolerance_range: "",
    },
  });

  const movementForm = useForm({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      inventory_id: "",
      movement_type: "",
      quantity: "",
      reference_number: "",
      reference_type: "",
      notes: "",
    },
  });

  // Watch for material group selection to filter items
  const selectedMaterialGroupId = form.watch("material_group_id");

  // Set default active location tab when locations are available - prioritize locations with inventory
  useEffect(() => {
    if (
      locations.length > 0 &&
      inventoryItems.length > 0 &&
      !activeLocationTab
    ) {
      // Find a location that has inventory items
      const locationWithInventory = locations.find((location: any) =>
        inventoryItems.some(
          (item: any) =>
            item.location_id?.toString() === location.id?.toString(),
        ),
      );

      if (locationWithInventory) {
        setActiveLocationTab(locationWithInventory.id?.toString() || "");
      } else {
        // Fall back to first location if no inventory items found
        setActiveLocationTab(locations[0].id?.toString() || "");
      }
    }
  }, [locations, inventoryItems, activeLocationTab]);

  // Filter items based on selected material group
  const filteredItemsByGroup = allItems.filter(
    (item: any) =>
      !selectedMaterialGroupId || item.category_id === selectedMaterialGroupId,
  );

  // Filter inventory by location for current tab
  const getInventoryByLocation = (locationId: string) => {
    return inventoryItems.filter(
      (item: any) =>
        item.location_id?.toString() === locationId &&
        ((item.item_name_ar || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
          (item.item_code || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (item.category_name_ar || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase())),
    );
  };

  // Original filtered items for other tabs that need all inventory
  const filteredItems = inventoryItems.filter(
    (item: any) =>
      (item.item_name_ar || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (item.item_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category_name_ar || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      material_group_id: item.material_group_id?.toString() || "",
      item_id: item.item_id,
      location_id: item.location_id?.toString() || "",
      current_stock: item.current_stock?.toString() || "0",
      unit: item.unit || "كيلو",
    });
    setIsAddDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset({
      material_group_id: "",
      item_id: "",
      location_id: "",
      current_stock: "",
      unit: "كيلو",
    });
    setIsAddDialogOpen(true);
  };

  const onSubmit = (data: any) => {
    mutation.mutate(data);
  };

  const onLocationSubmit = (data: any) => {
    locationMutation.mutate(data);
  };

  const onMovementSubmit = (data: any) => {
    // Convert numeric fields to strings for decimal schema validation
    const formattedData = {
      ...data,
      quantity: data.quantity?.toString() || "0",
      inventory_id: parseInt(data.inventory_id),
    };
    movementMutation.mutate(formattedData);
  };

  const handleAddLocation = () => {
    setEditingLocation(null);
    locationForm.reset({
      name: "",
      name_ar: "",
      coordinates: "",
      tolerance_range: "",
    });
    setIsLocationDialogOpen(true);
  };

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    locationForm.reset({
      name: location.name || "",
      name_ar: location.name_ar || "",
      coordinates: location.coordinates || "",
      tolerance_range: location.tolerance_range?.toString() || "",
    });
    setIsLocationDialogOpen(true);
  };

  const handleAddMovement = () => {
    setEditingMovement(null);
    movementForm.reset({
      inventory_id: "",
      movement_type: "",
      quantity: "",
      reference_number: "",
      reference_type: "",
      notes: "",
    });
    setIsMovementDialogOpen(true);
  };

  return (
    <PageLayout title={t('warehouse.title')} description={t('warehouse.movements')}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              إجمالي الأصناف
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">صنف نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              أصناف منخفضة
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.lowStockItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              تحتاج إعادة تموين
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              قيمة المخزون
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalValue
                ? `${Number(stats.totalValue).toLocaleString()} ر.س`
                : "0 ر.س"}
            </div>
            <p className="text-xs text-muted-foreground">
              القيمة الإجمالية
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              حركات اليوم
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.movementsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              عملية دخول وخروج
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        defaultValue={activeLocationTab || "production-hall"}
        className="space-y-4"
      >
        <TabsList className="flex flex-wrap w-full justify-start gap-1">
          <TabsTrigger value="vouchers" className="shrink-0 bg-blue-50">
            <FileText className="h-4 w-4 ml-1" />
            السندات
          </TabsTrigger>
          <TabsTrigger value="production-hall" className="shrink-0">
            صالة الإنتاج
          </TabsTrigger>
          <TabsTrigger value="received-quantities" className="shrink-0">
            الكميات المستلمة
          </TabsTrigger>
          {locations.map((location: any) => (
            <TabsTrigger
              key={location.id}
              value={location.id.toString()}
              className="shrink-0"
            >
              {location.name_ar || location.name}
            </TabsTrigger>
          ))}
          <TabsTrigger value="movements" className="shrink-0">
            {t('warehouse.movements')}
          </TabsTrigger>
        </TabsList>

        {/* Vouchers Tab - السندات */}
        <TabsContent value="vouchers" className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={() => openVoucherForm("raw-material-in")} className="bg-green-600 hover:bg-green-700">
              <ArrowDownToLine className="h-4 w-4 ml-2" />
              إدخال مواد خام
            </Button>
            <Button onClick={() => openVoucherForm("raw-material-out")} className="bg-red-600 hover:bg-red-700">
              <ArrowUpFromLine className="h-4 w-4 ml-2" />
              إخراج مواد خام
            </Button>
            <Button onClick={() => openVoucherForm("finished-goods-in")} className="bg-blue-600 hover:bg-blue-700">
              <Package className="h-4 w-4 ml-2" />
              استلام مواد تامة
            </Button>
            <Button onClick={() => openVoucherForm("finished-goods-out")} className="bg-orange-600 hover:bg-orange-700">
              <Package className="h-4 w-4 ml-2" />
              إخراج مواد تامة
            </Button>
            <Button onClick={() => setIsInventoryCountOpen(true)} variant="outline">
              <ClipboardCheck className="h-4 w-4 ml-2" />
              جرد بالباركود
            </Button>
          </div>
          
          <Tabs defaultValue="raw-material-in" className="space-y-4">
            <TabsList>
              <TabsTrigger value="raw-material-in">
                <ArrowDownToLine className="h-4 w-4 ml-1" />
                إدخال مواد خام
              </TabsTrigger>
              <TabsTrigger value="raw-material-out">
                <ArrowUpFromLine className="h-4 w-4 ml-1" />
                إخراج مواد خام
              </TabsTrigger>
              <TabsTrigger value="finished-goods-in">
                <Package className="h-4 w-4 ml-1" />
                استلام مواد تامة
              </TabsTrigger>
              <TabsTrigger value="finished-goods-out">
                <Package className="h-4 w-4 ml-1" />
                إخراج مواد تامة
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="raw-material-in">
              <VouchersList type="raw-material-in" title="سندات إدخال مواد خام" />
            </TabsContent>
            <TabsContent value="raw-material-out">
              <VouchersList type="raw-material-out" title="سندات إخراج مواد خام" />
            </TabsContent>
            <TabsContent value="finished-goods-in">
              <VouchersList type="finished-goods-in" title="سندات استلام مواد تامة" />
            </TabsContent>
            <TabsContent value="finished-goods-out">
              <VouchersList type="finished-goods-out" title="سندات إخراج مواد تامة" />
            </TabsContent>
          </Tabs>
          
          <VoucherForm
            type={voucherFormType}
            open={isVoucherFormOpen}
            onOpenChange={setIsVoucherFormOpen}
          />
          
          <InventoryCountForm
            open={isInventoryCountOpen}
            onOpenChange={setIsInventoryCountOpen}
          />
        </TabsContent>

        {/* Production Hall Tab */}
        <TabsContent value="production-hall" className="space-y-4">
          <ProductionHallContent />
        </TabsContent>

        {/* Received Quantities Tab */}
        <TabsContent value="received-quantities" className="space-y-4">
          <ReceivedQuantitiesContent />
        </TabsContent>

        {/* Dynamic location-based inventory tabs */}
        {locations.map((location: any) => (
          <TabsContent
            key={location.id}
            value={location.id.toString()}
            className="space-y-4"
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    مخزون {location.name_ar || location.name}
                  </CardTitle>
                  <div className="flex space-x-2 space-x-reverse">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder={t('common.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                    <Dialog
                      open={isAddDialogOpen}
                      onOpenChange={setIsAddDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button onClick={handleAdd}>
                          <Plus className="h-4 w-4 mr-2" />
                          إضافة صنف
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {editingItem
                              ? "تعديل صنف المخزون"
                              : "إضافة صنف جديد للمخزون"}
                          </DialogTitle>
                          <DialogDescription>
                            {editingItem
                              ? "تعديل بيانات وكمية الصنف في المخزون"
                              : "إضافة صنف جديد إلى مخزون هذا الموقع"}
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4"
                          >
                            <FormField
                              control={form.control}
                              name="material_group_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>مجموعة المواد</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      form.setValue("item_id", "");
                                    }}
                                    value={field.value ?? ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="اختر مجموعة المواد" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {materialGroups.map((group: any) => (
                                        <SelectItem
                                          key={group.id}
                                          value={group.id.toString()}
                                        >
                                          {group.name_ar || group.name}
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
                                  name="item_id"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>الصنف</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value ?? ""}
                                        disabled={!selectedMaterialGroupId}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue
                                              placeholder={
                                                selectedMaterialGroupId
                                                  ? "اختر الصنف"
                                                  : "اختر مجموعة المواد أولاً"
                                              }
                                            />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {filteredItemsByGroup
                                            .filter(
                                              (item: any) =>
                                                item.id &&
                                                item.id !== "" &&
                                                item.id !== null &&
                                                item.id !== undefined,
                                            )
                                            .map((item: any) => (
                                              <SelectItem
                                                key={item.id}
                                                value={item.id.toString()}
                                              >
                                                {item.name_ar} ({item.code})
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
                                  name="location_id"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>الموقع</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value ?? ""}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="اختر الموقع" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {locations.map((location: any) => (
                                            <SelectItem
                                              key={location.id}
                                              value={location.id.toString()}
                                            >
                                              {location.name_ar}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="current_stock"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>المخزون الحالي</FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            type="number"
                                            step="0.01"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  <FormField
                                    control={form.control}
                                    name="unit"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>الوحدة</FormLabel>
                                        <Select
                                          onValueChange={field.onChange}
                                          value={field.value ?? ""}
                                        >
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            <SelectItem value="كيلو">
                                              كيلو
                                            </SelectItem>
                                            <SelectItem value="قطعة">
                                              قطعة
                                            </SelectItem>
                                            <SelectItem value="طن">
                                              طن
                                            </SelectItem>
                                            <SelectItem value="متر">
                                              متر
                                            </SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="flex justify-end space-x-2 space-x-reverse">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddDialogOpen(false)}
                                  >
                                    إلغاء
                                  </Button>
                                  <Button
                                    type="submit"
                                    disabled={mutation.isPending}
                                  >
                                    {mutation.isPending
                                      ? "جاري الحفظ..."
                                      : "حفظ"}
                                  </Button>
                                </div>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {inventoryLoading ? (
                      <div className="text-center py-8">جاري التحميل...</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                الصنف
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                الفئة
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                المخزون الحالي
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                العمليات
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {getInventoryByLocation(location.id.toString())
                              .length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-6 py-8 text-center text-gray-500"
                                >
                                  {searchTerm
                                    ? "لا توجد نتائج للبحث"
                                    : "لا توجد أصناف في هذا المخزون"}
                                </td>
                              </tr>
                            ) : (
                              getInventoryByLocation(
                                location.id.toString(),
                              ).map((item: any) => {
                                const currentStock = parseFloat(
                                  item.current_stock || 0,
                                );

                                return (
                                  <tr
                                    key={item.id}
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-6 py-4">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {item.item_name_ar || item.item_name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          {item.item_code}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {item.category_name_ar ||
                                        item.category_name ||
                                        "-"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {currentStock.toLocaleString()}{" "}
                                      {item.unit}
                                    </td>
                                    <td className="px-6 py-4">
                                      <div className="flex space-x-2 space-x-reverse">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEdit(item)}
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            deleteMutation.mutate(item.id)
                                          }
                                          disabled={deleteMutation.isPending}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}

            <TabsContent value="movements" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>حركات المخزون</CardTitle>
                      <p className="text-sm text-gray-600 mt-1"> </p>
                    </div>
                    <Dialog
                      open={isMovementDialogOpen}
                      onOpenChange={setIsMovementDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button onClick={handleAddMovement}>
                          <Plus className="h-4 w-4 mr-2" />
                          إضافة حركة
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>إضافة حركة مخزون جديدة</DialogTitle>
                          <DialogDescription>
                            تسجيل حركة إدخال أو إخراج للمخزون
                          </DialogDescription>
                        </DialogHeader>
                        <Form {...movementForm}>
                          <form
                            onSubmit={movementForm.handleSubmit(
                              onMovementSubmit,
                            )}
                            className="space-y-4"
                          >
                            <FormField
                              control={movementForm.control}
                              name="inventory_id"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>صنف المخزون</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value ?? ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="اختر الصنف" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {inventoryItems.map((item: any) => (
                                        <SelectItem
                                          key={item.id}
                                          value={item.id.toString()}
                                        >
                                          {item.item_name_ar} -{" "}
                                          {item.location_name_ar}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={movementForm.control}
                              name="movement_type"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>نوع الحركة</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value ?? ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="اختر نوع الحركة" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="in">دخول</SelectItem>
                                      <SelectItem value="out">خروج</SelectItem>
                                      <SelectItem value="transfer">
                                        نقل
                                      </SelectItem>
                                      <SelectItem value="adjustment">
                                        تسوية
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={movementForm.control}
                              name="quantity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>الكمية</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      step="0.01"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={movementForm.control}
                                name="reference_number"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>رقم المرجع</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="PO-001" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={movementForm.control}
                                name="reference_type"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>نوع المرجع</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value ?? ""}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="اختر النوع" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="purchase">
                                          شراء
                                        </SelectItem>
                                        <SelectItem value="sale">
                                          بيع
                                        </SelectItem>
                                        <SelectItem value="production">
                                          إنتاج
                                        </SelectItem>
                                        <SelectItem value="adjustment">
                                          تسوية
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={movementForm.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ملاحظات</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="ملاحظات إضافية"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-end space-x-2 space-x-reverse">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsMovementDialogOpen(false)}
                              >
                                إلغاء
                              </Button>
                              <Button
                                type="submit"
                                disabled={movementMutation.isPending}
                              >
                                {movementMutation.isPending
                                  ? "جاري الحفظ..."
                                  : "حفظ"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {movementsLoading ? (
                    <div className="text-center py-8">جاري التحميل...</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              الصنف
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              نوع الحركة
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              الكمية
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              رقم المرجع
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              التاريخ
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              المستخدم
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              العمليات
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {movements.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-6 py-8 text-center text-gray-500"
                              >
                                لا توجد حركات مخزون مسجلة
                              </td>
                            </tr>
                          ) : (
                            movements.map((movement: any) => (
                              <tr
                                key={movement.id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {movement.item_name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {movement.item_code}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <Badge
                                    variant={
                                      movement.movement_type === "in"
                                        ? "default"
                                        : movement.movement_type === "out"
                                          ? "destructive"
                                          : "secondary"
                                    }
                                  >
                                    {movement.movement_type === "in"
                                      ? "دخول"
                                      : movement.movement_type === "out"
                                        ? "خروج"
                                        : movement.movement_type === "transfer"
                                          ? "نقل"
                                          : "تسوية"}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {parseFloat(
                                    movement.quantity,
                                  ).toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {movement.reference_number || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {new Date(
                                    movement.created_at,
                                  ).toLocaleDateString("en-GB")}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                  {movement.user_name || "-"}
                                </td>
                                <td className="px-6 py-4">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      deleteMovementMutation.mutate(movement.id)
                                    }
                                    disabled={deleteMovementMutation.isPending}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  );
}

// Production Hall Component
function ProductionHallContent() {
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptWeight, setReceiptWeight] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch production orders ready for receipt - Optimized polling
  const { data: productionOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/warehouse/production-hall"],
    refetchInterval: 120000, // Reduced to 2 minutes instead of aggressive 30s polling
    staleTime: 90000, // Cache for 1.5 minutes to reduce server load
  });

  // Show each production order separately - no grouping
  const individualOrders = React.useMemo(() => {
    return productionOrders.map((order: any) => ({
      ...order,
      quantity_required: parseFloat(order.quantity_required) || 0,
      total_film_weight: parseFloat(order.total_film_weight) || 0,
      total_cut_weight: parseFloat(order.total_cut_weight) || 0,
      total_received_weight: parseFloat(order.total_received_weight) || 0,
      waste_weight: parseFloat(order.waste_weight) || 0,
      remaining_to_receive: 
        (parseFloat(order.total_cut_weight) || 0) - 
        (parseFloat(order.total_received_weight) || 0),
    }));
  }, [productionOrders]);

  // Receipt mutation
  const receiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/warehouse/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("فشل في حفظ الاستلام");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/warehouse/production-hall"],
      });
      setReceiptDialogOpen(false);
      setSelectedOrders(new Set());
      setReceiptWeight("");
      setReceiptNotes("");
      toast({
        title: "تم الاستلام بنجاح",
        description: "تم تسجيل استلام المواد في المستودع",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "فشل في تسجيل الاستلام",
        variant: "destructive",
      });
    },
  });

  const handleSelectOrder = (productionOrderId: string) => {
    const newSelection = new Set(selectedOrders);
    if (newSelection.has(productionOrderId)) {
      newSelection.delete(productionOrderId);
    } else {
      newSelection.add(productionOrderId);
    }
    setSelectedOrders(newSelection);
  };

  const handleReceiptSubmit = () => {
    if (selectedOrders.size === 0) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار أمر إنتاج واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (!receiptWeight || parseFloat(receiptWeight) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال وزن الاستلام",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "خطأ",
        description: "يجب تسجيل الدخول لتسجيل الاستلام",
        variant: "destructive",
      });
      return;
    }

    const selectedOrdersList = Array.from(selectedOrders);
    const totalWeight = parseFloat(receiptWeight);
    const numOrders = selectedOrdersList.length;
    
    // Distribute weight equally among selected production orders
    const baseWeight = Math.floor((totalWeight * 1000) / numOrders) / 1000;
    const remainder = totalWeight - (baseWeight * numOrders);

    // Create receipts for each selected production order
    selectedOrdersList.forEach((productionOrderId, index) => {
      const order = individualOrders.find(
        (o) => o.production_order_id.toString() === productionOrderId,
      );
      if (order) {
        // Add remainder to last order to ensure exact total
        const weight = index === numOrders - 1 
          ? baseWeight + remainder 
          : baseWeight;
          
        receiptMutation.mutate({
          production_order_id: parseInt(productionOrderId),
          received_weight_kg: weight,
          received_by: user.id,
          notes: receiptNotes,
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            صالة الإنتاج - المواد الجاهزة للاستلام
          </CardTitle>
          <div className="flex space-x-2 space-x-reverse">
            <Dialog
              open={receiptDialogOpen}
              onOpenChange={setReceiptDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  disabled={selectedOrders.size === 0}
                  data-testid="button-receive-materials"
                >
                  <Truck className="h-4 w-4 mr-2" />
                  استلام المواد ({selectedOrders.size})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>استلام مواد من صالة الإنتاج</DialogTitle>
                  <DialogDescription>
                    تسجيل استلام المواد المقطعة من صالة الإنتاج إلى المستودع
                    الرئيسي
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">
                      الوزن المستلم (كيلو)
                    </label>
                    <Input
                      type="number"
                      step="0.001"
                      value={receiptWeight}
                      onChange={(e) => setReceiptWeight(e.target.value)}
                      placeholder="أدخل الوزن المستلم"
                      data-testid="input-receipt-weight"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      ملاحظات (اختيارية)
                    </label>
                    <textarea
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      placeholder="أضف ملاحظات حول الاستلام"
                      className="w-full min-h-[60px] p-2 border rounded-md"
                      data-testid="textarea-receipt-notes"
                    />
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <Button
                      onClick={handleReceiptSubmit}
                      disabled={receiptMutation.isPending}
                      data-testid="button-confirm-receipt"
                    >
                      {receiptMutation.isPending
                        ? "جاري الحفظ..."
                        : "تأكيد الاستلام"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setReceiptDialogOpen(false)}
                      data-testid="button-cancel-receipt"
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">جاري التحميل...</div>
        ) : individualOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Factory className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد مواد جاهزة للاستلام حالياً</p>
            <p className="text-sm">ستظهر أوامر الإنتاج التي تم تقطيعها هنا</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right py-3 px-4 font-medium">
                    <input
                      type="checkbox"
                      checked={
                        selectedOrders.size === individualOrders.length &&
                        individualOrders.length > 0
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders(
                            new Set(
                              individualOrders.map((o: any) => o.production_order_id.toString()),
                            ),
                          );
                        } else {
                          setSelectedOrders(new Set());
                        }
                      }}
                      data-testid="checkbox-select-all"
                    />
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    رقم الطلب
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    رقم أمر الإنتاج
                  </th>
                  <th className="text-right py-3 px-4 font-medium">العميل</th>
                  <th className="text-right py-3 px-4 font-medium">
                    الصنف
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    الكمية المطلوبة
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    الفيلم المنتج
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    الكمية المقطعة
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    المستلم سابقاً
                  </th>
                  <th className="text-right py-3 px-4 font-medium">
                    المتبقي للاستلام
                  </th>
                  <th className="text-right py-3 px-4 font-medium">الهدر</th>
                  <th className="text-right py-3 px-4 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {individualOrders.map((order: any) => {
                  const remainingWeight = order.remaining_to_receive;

                  return (
                    <tr
                      key={order.production_order_id}
                      className={`border-b hover:bg-gray-50 ${selectedOrders.has(order.production_order_id.toString()) ? "bg-blue-50" : ""}`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(
                            order.production_order_id.toString(),
                          )}
                          onChange={() =>
                            handleSelectOrder(order.production_order_id.toString())
                          }
                          data-testid={`checkbox-select-${order.production_order_id}`}
                        />
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-order-number-${order.production_order_id}`}
                      >
                        <div className="font-medium">
                          {order.order_number}
                        </div>
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-production-order-${order.production_order_id}`}
                      >
                        <Badge variant="outline" className="text-blue-600">
                          {order.production_order_number}
                        </Badge>
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-customer-${order.production_order_id}`}
                      >
                        {order.customer_name_ar || order.customer_name}
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-item-${order.production_order_id}`}
                      >
                        <div>
                          <div className="font-medium">{order.item_name_ar || order.item_name}</div>
                          <div className="text-xs text-gray-500">{order.size_caption}</div>
                        </div>
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-required-${order.production_order_id}`}
                      >
                        {order.quantity_required.toFixed(2)} كيلو
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-film-${order.production_order_id}`}
                      >
                        <span className="text-blue-600 font-medium">
                          {order.total_film_weight.toFixed(2)} كيلو
                        </span>
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-cut-${order.production_order_id}`}
                      >
                        <span className="text-green-600 font-medium">
                          {order.total_cut_weight.toFixed(2)} كيلو
                        </span>
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-received-${order.production_order_id}`}
                      >
                        <span className="text-orange-600 font-medium">
                          {order.total_received_weight.toFixed(2)} كيلو
                        </span>
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-remaining-${order.production_order_id}`}
                      >
                        <span className="text-purple-600 font-bold">
                          {remainingWeight.toFixed(2)} كيلو
                        </span>
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`text-waste-${order.production_order_id}`}
                      >
                        <span className="text-red-600">
                          {order.waste_weight.toFixed(2)} كيلو
                        </span>
                      </td>
                      <td
                        className="py-3 px-4"
                        data-testid={`status-${order.production_order_id}`}
                      >
                        {remainingWeight > 0 ? (
                          <Badge
                            variant="outline"
                            className="text-orange-600 border-orange-600"
                          >
                            جزئي
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-green-600 border-green-600"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            مكتمل
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Received Quantities Component
function ReceivedQuantitiesContent() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<"date" | "weight" | "customer">("date");

  // Fetch received quantities with detailed information
  const { data: receivedQuantities = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/warehouse/receipts-detailed"],
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 240000, // Cache for 4 minutes
  });

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = receivedQuantities.filter(
      (order) =>
        (order.order_number || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (order.customer_name_ar || order.customer_name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (order.item_name_ar || order.item_name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "weight":
          return (
            Number(b.total_received_weight) - Number(a.total_received_weight)
          );
        case "customer":
          return (a.customer_name_ar || a.customer_name || "").localeCompare(
            b.customer_name_ar || b.customer_name || "",
          );
        case "date":
        default:
          const aLatestDate = Math.max(
            ...(a.receipts?.map((r: any) =>
              new Date(r.receipt_date).getTime(),
            ) || [0]),
          );
          const bLatestDate = Math.max(
            ...(b.receipts?.map((r: any) =>
              new Date(r.receipt_date).getTime(),
            ) || [0]),
          );
          return bLatestDate - aLatestDate;
      }
    });
  }, [receivedQuantities, searchTerm, sortBy]);

  const toggleOrderExpansion = (orderNumber: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderNumber)) {
      newExpanded.delete(orderNumber);
    } else {
      newExpanded.add(orderNumber);
    }
    setExpandedOrders(newExpanded);
  };

  const getTotalStats = () => {
    const totalWeight = filteredData.reduce(
      (sum, order) => sum + Number(order.total_received_weight || 0),
      0,
    );
    const totalReceipts = filteredData.reduce(
      (sum, order) => sum + (order.receipts?.length || 0),
      0,
    );
    return { totalWeight, totalReceipts, totalOrders: filteredData.length };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            الكميات المستلمة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-center py-8"
            data-testid="loading-received-quantities"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            جاري التحميل...
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = getTotalStats();

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                الكميات المستلمة
              </CardTitle>
              <CardDescription>
                عرض جميع الكميات المستلمة من صالة الإنتاج مجمعة بحسب رقم الطلب
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  إجمالي الطلبات
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-700">
                {stats.totalOrders}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  إجمالي الوزن
                </span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {stats.totalWeight.toFixed(2)} كيلو
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">
                  إجمالي الإيصالات
                </span>
              </div>
              <div className="text-2xl font-bold text-orange-700">
                {stats.totalReceipts}
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-600">
                  متوسط الوزن/طلب
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {stats.totalOrders > 0
                  ? (stats.totalWeight / stats.totalOrders).toFixed(2)
                  : "0"}{" "}
                كيلو
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث بالطلب أو العميل أو المنتج..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
                data-testid="search-received-quantities"
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={(value: "date" | "weight" | "customer") =>
                setSortBy(value)
              }
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="ترتيب حسب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">التاريخ (الأحدث أولاً)</SelectItem>
                <SelectItem value="weight">الوزن (الأعلى أولاً)</SelectItem>
                <SelectItem value="customer">اسم العميل (أ-ي)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredData.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div
              className="text-center text-gray-500"
              data-testid="no-received-quantities"
            >
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">لا توجد كميات مستلمة</p>
              <p className="text-sm">
                {searchTerm
                  ? "لا توجد نتائج مطابقة لبحثك"
                  : "لا توجد كميات مستلمة حتى الآن"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredData.map((order: any) => {
            const isExpanded = expandedOrders.has(order.order_number);
            const latestReceipt =
              order.receipts?.reduce((latest: any, current: any) =>
                new Date(current.receipt_date) > new Date(latest.receipt_date)
                  ? current
                  : latest,
              ) || null;

            return (
              <Card
                key={order.order_number}
                className="overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge
                          variant="outline"
                          className="text-blue-600 border-blue-200 bg-blue-50"
                        >
                          <Hash className="h-3 w-3 mr-1" />
                          {order.order_number}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700"
                        >
                          {order.receipts?.length || 0} إيصال
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">العميل</p>
                          <p
                            className="font-medium"
                            data-testid={`customer-name-${order.order_number}`}
                          >
                            {order.customer_name_ar || order.customer_name}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 mb-1">المنتج</p>
                          <p
                            className="font-medium"
                            data-testid={`item-name-${order.order_number}`}
                          >
                            {order.item_name_ar || order.item_name}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 mb-1">
                            إجمالي الوزن
                          </p>
                          <p
                            className="font-bold text-green-600 text-lg"
                            data-testid={`total-weight-${order.order_number}`}
                          >
                            {Number(order.total_received_weight).toFixed(2)}{" "}
                            كيلو
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 mb-1">
                            آخر استلام
                          </p>
                          <p className="text-sm">
                            {latestReceipt
                              ? new Date(
                                  latestReceipt.receipt_date,
                                ).toLocaleDateString("ar")
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {/* Product Specifications */}
                      {(order.size_caption ||
                        order.width ||
                        order.thickness ||
                        order.raw_material) && (
                        <div
                          className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          data-testid={`size-${order.order_number}`}
                        >
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            مواصفات المنتج:
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {order.size_caption && (
                              <div>
                                <span className="text-gray-500">المقاس:</span>
                                <span className="mr-1 font-medium">
                                  {order.size_caption}
                                </span>
                              </div>
                            )}
                            {order.width && (
                              <div>
                                <span className="text-gray-500">العرض:</span>
                                <span className="mr-1 font-medium">
                                  {order.width}م
                                </span>
                              </div>
                            )}
                            {order.thickness && (
                              <div>
                                <span className="text-gray-500">السماكة:</span>
                                <span className="mr-1 font-medium">
                                  {order.thickness}مم
                                </span>
                              </div>
                            )}
                            {order.raw_material && (
                              <div>
                                <span className="text-gray-500">المادة:</span>
                                <span className="mr-1 font-medium">
                                  {order.raw_material}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOrderExpansion(order.order_number)}
                      className="ml-4"
                      data-testid={`expand-order-${order.order_number}`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-4 w-4 mr-1" />
                          إخفاء التفاصيل
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          عرض التفاصيل
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Expanded Receipts Details */}
                  {isExpanded && order.receipts && (
                    <div
                      className="border-t pt-4"
                      data-testid={`receipts-detail-${order.order_number}`}
                    >
                      <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        تفاصيل الإيصالات ({order.receipts.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {order.receipts.map((receipt: any) => (
                          <div
                            key={receipt.receipt_id}
                            className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="outline" className="text-xs">
                                إيصال #{receipt.receipt_id}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  receipt.receipt_date,
                                ).toLocaleDateString("ar")}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Scale className="h-3 w-3 text-green-600" />
                                <span className="text-gray-600">الكمية:</span>
                                <span className="font-semibold text-green-600">
                                  {Number(receipt.received_weight_kg).toFixed(
                                    2,
                                  )}{" "}
                                  كيلو
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-blue-600" />
                                <span className="text-gray-600">المستلم:</span>
                                <span className="font-medium">
                                  {receipt.received_by_name}
                                </span>
                              </div>

                              {receipt.production_order_number && (
                                <div className="flex items-center gap-2">
                                  <Factory className="h-3 w-3 text-purple-600" />
                                  <span className="text-gray-600">
                                    أمر الإنتاج:
                                  </span>
                                  <span className="font-medium">
                                    {receipt.production_order_number}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
