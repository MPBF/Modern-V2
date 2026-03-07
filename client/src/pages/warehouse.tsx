import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useLocalizedName } from "../hooks/use-localized-name";
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
import { WarehouseDefinitions } from "../components/warehouse/WarehouseDefinitions";
import { WarehouseReports } from "../components/warehouse/WarehouseReports";
import PageLayout from "../components/layout/PageLayout";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../hooks/use-auth";

export default function Warehouse() {
  const { t } = useTranslation();
  const ln = useLocalizedName();

  const inventoryFormSchema = z.object({
    material_group_id: z.string().min(1, t('warehouse.validation.materialGroupRequired')),
    item_id: z.string().min(1, t('warehouse.validation.itemRequired')),
    location_id: z.string().transform((val) => parseInt(val)),
    current_stock: z.string().transform((val) => parseFloat(val)),
    unit: z.string().min(1, t('warehouse.validation.unitRequired')),
  });

  const locationFormSchema = z.object({
    name: z.string().min(1, t('warehouse.validation.nameEnRequired')),
    name_ar: z.string().min(1, t('warehouse.validation.nameArRequired')),
    coordinates: z.string().optional(),
    tolerance_range: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val) : undefined)),
  });

  const movementFormSchema = z.object({
    inventory_id: z.string().transform((val) => parseInt(val)),
    movement_type: z.string().min(1, t('warehouse.validation.movementTypeRequired')),
    quantity: z.string().transform((val) => parseFloat(val)),
    reference_number: z.string().optional(),
    reference_type: z.string().optional(),
    notes: z.string().optional(),
  });
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
        title: t('warehouse.toast.savedSuccess'),
        description: editingItem
          ? t('warehouse.toast.inventoryUpdated')
          : t('warehouse.toast.inventoryAdded'),
      });
    },
    onError: () => {
      toast({
        title: t('warehouse.toast.error'),
        description: t('warehouse.toast.saveFailed'),
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
        title: t('warehouse.toast.deletedSuccess'),
        description: t('warehouse.toast.inventoryDeleted'),
      });
    },
    onError: () => {
      toast({
        title: t('warehouse.toast.error'),
        description: t('warehouse.toast.deleteFailed'),
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
        title: t('warehouse.toast.savedSuccess'),
        description: editingLocation ? t('warehouse.toast.locationUpdated') : t('warehouse.toast.locationAdded'),
      });
    },
    onError: () => {
      toast({
        title: t('warehouse.toast.error'),
        description: t('warehouse.toast.saveFailed'),
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
        title: t('warehouse.toast.deletedSuccess'),
        description: t('warehouse.toast.locationDeleted'),
      });
    },
    onError: () => {
      toast({
        title: t('warehouse.toast.error'),
        description: t('warehouse.toast.locationDeleteFailed'),
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
        title: t('warehouse.toast.savedSuccess'),
        description: t('warehouse.toast.movementAdded'),
      });
    },
    onError: () => {
      toast({
        title: t('warehouse.toast.error'),
        description: t('warehouse.toast.saveFailed'),
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
        title: t('warehouse.toast.deletedSuccess'),
        description: t('warehouse.toast.movementDeleted'),
      });
    },
    onError: () => {
      toast({
        title: t('warehouse.toast.error'),
        description: t('warehouse.toast.movementDeleteFailed'),
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
    <PageLayout title={t('warehouse.title')} description={t('warehouse.description')}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('warehouse.stats.totalItems')}
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('warehouse.stats.activeItem')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('warehouse.stats.lowStockItems')}
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.lowStockItems || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('warehouse.stats.needsRestock')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('warehouse.stats.inventoryValue')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalValue
                ? `${Number(stats.totalValue).toLocaleString("en-US")} ${t('warehouse.currency')}`
                : `0 ${t('warehouse.currency')}`}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('warehouse.stats.totalValue')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('warehouse.stats.todayMovements')}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.movementsToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('warehouse.stats.inOutOperations')}
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
            {t('warehouse.tabs.vouchers')}
          </TabsTrigger>
          <TabsTrigger value="definitions" className="shrink-0 bg-purple-50">
            <Package className="h-4 w-4 ml-1" />
            {t('warehouse.tabs.definitions')}
          </TabsTrigger>
          <TabsTrigger value="reports" className="shrink-0 bg-green-50">
            <FileText className="h-4 w-4 ml-1" />
            {t('warehouse.tabs.reports')}
          </TabsTrigger>
          <TabsTrigger value="production-hall" className="shrink-0">
            {t('warehouse.tabs.productionHall')}
          </TabsTrigger>
          <TabsTrigger value="received-quantities" className="shrink-0">
            {t('warehouse.tabs.receivedQuantities')}
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
            {t('warehouse.movements.title')}
          </TabsTrigger>
        </TabsList>

        {/* Vouchers Tab - السندات */}
        <TabsContent value="vouchers" className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <Button onClick={() => openVoucherForm("raw-material-in")} className="bg-green-600 hover:bg-green-700">
              <ArrowDownToLine className="h-4 w-4 ml-2" />
              {t('warehouse.vouchers.rawMaterialIn')}
            </Button>
            <Button onClick={() => openVoucherForm("raw-material-out")} className="bg-red-600 hover:bg-red-700">
              <ArrowUpFromLine className="h-4 w-4 ml-2" />
              {t('warehouse.vouchers.rawMaterialOut')}
            </Button>
            <Button onClick={() => openVoucherForm("finished-goods-in")} className="bg-blue-600 hover:bg-blue-700">
              <Package className="h-4 w-4 ml-2" />
              {t('warehouse.vouchers.finishedGoodsIn')}
            </Button>
            <Button onClick={() => openVoucherForm("finished-goods-out")} className="bg-orange-600 hover:bg-orange-700">
              <Package className="h-4 w-4 ml-2" />
              {t('warehouse.vouchers.finishedGoodsOut')}
            </Button>
            <Button onClick={() => setIsInventoryCountOpen(true)} variant="outline">
              <ClipboardCheck className="h-4 w-4 ml-2" />
              {t('warehouse.vouchers.barcodeCount')}
            </Button>
          </div>
          
          <Tabs defaultValue="raw-material-in" className="space-y-4">
            <TabsList>
              <TabsTrigger value="raw-material-in">
                <ArrowDownToLine className="h-4 w-4 ml-1" />
                {t('warehouse.vouchers.rawMaterialIn')}
              </TabsTrigger>
              <TabsTrigger value="raw-material-out">
                <ArrowUpFromLine className="h-4 w-4 ml-1" />
                {t('warehouse.vouchers.rawMaterialOut')}
              </TabsTrigger>
              <TabsTrigger value="finished-goods-in">
                <Package className="h-4 w-4 ml-1" />
                {t('warehouse.vouchers.finishedGoodsIn')}
              </TabsTrigger>
              <TabsTrigger value="finished-goods-out">
                <Package className="h-4 w-4 ml-1" />
                {t('warehouse.vouchers.finishedGoodsOut')}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="raw-material-in">
              <VouchersList type="raw-material-in" title={t('warehouse.vouchers.rawMaterialInTitle')} />
            </TabsContent>
            <TabsContent value="raw-material-out">
              <VouchersList type="raw-material-out" title={t('warehouse.vouchers.rawMaterialOutTitle')} />
            </TabsContent>
            <TabsContent value="finished-goods-in">
              <VouchersList type="finished-goods-in" title={t('warehouse.vouchers.finishedGoodsInTitle')} />
            </TabsContent>
            <TabsContent value="finished-goods-out">
              <VouchersList type="finished-goods-out" title={t('warehouse.vouchers.finishedGoodsOutTitle')} />
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

        {/* Definitions Tab - التعريفات */}
        <TabsContent value="definitions" className="space-y-4">
          <WarehouseDefinitions />
        </TabsContent>

        {/* Reports Tab - التقارير */}
        <TabsContent value="reports" className="space-y-4">
          <WarehouseReports />
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
                    {t('warehouse.inventory.stockOf')} {location.name_ar || location.name}
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
                          {t('warehouse.inventory.addItem')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>
                            {editingItem
                              ? t('warehouse.inventory.editInventoryItem')
                              : t('warehouse.inventory.addNewInventoryItem')}
                          </DialogTitle>
                          <DialogDescription>
                            {editingItem
                              ? t('warehouse.inventory.editInventoryItemDesc')
                              : t('warehouse.inventory.addNewInventoryItemDesc')}
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
                                  <FormLabel>{t('warehouse.labels.materialGroup')}</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      form.setValue("item_id", "");
                                    }}
                                    value={field.value ?? ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('warehouse.placeholders.selectMaterialGroup')} />
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
                                      <FormLabel>{t('warehouse.labels.item')}</FormLabel>
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
                                                  ? t('warehouse.placeholders.selectItem')
                                                  : t('warehouse.placeholders.selectMaterialGroupFirst')
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
                                      <FormLabel>{t('warehouse.labels.location')}</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        value={field.value ?? ""}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder={t('warehouse.placeholders.selectLocation')} />
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
                                        <FormLabel>{t('warehouse.labels.currentStock')}</FormLabel>
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
                                        <FormLabel>{t('warehouse.labels.unit')}</FormLabel>
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
                                              {t('warehouse.units.kilo')}
                                            </SelectItem>
                                            <SelectItem value="قطعة">
                                              {t('warehouse.units.piece')}
                                            </SelectItem>
                                            <SelectItem value="طن">
                                              {t('warehouse.units.ton')}
                                            </SelectItem>
                                            <SelectItem value="متر">
                                              {t('warehouse.units.meter')}
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
                                    {t('warehouse.buttons.cancel')}
                                  </Button>
                                  <Button
                                    type="submit"
                                    disabled={mutation.isPending}
                                  >
                                    {mutation.isPending
                                      ? t('warehouse.buttons.saving')
                                      : t('warehouse.buttons.save')}
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
                      <div className="text-center py-8">{t('warehouse.loading')}</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                                {t('warehouse.labels.item')}
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                                {t('warehouse.labels.category')}
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                                {t('warehouse.labels.currentStock')}
                              </th>
                              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                                {t('warehouse.labels.actions')}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {getInventoryByLocation(location.id.toString())
                              .length === 0 ? (
                              <tr>
                                <td
                                  colSpan={4}
                                  className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                                >
                                  {searchTerm
                                    ? t('warehouse.inventory.noSearchResults')
                                    : t('warehouse.inventory.noItemsInStock')}
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
                                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                                  >
                                    <td className="px-6 py-4">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                          {ln(item.item_name_ar, item.item_name)}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                          {item.item_code}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                      {ln(item.category_name_ar, item.category_name) || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                      {currentStock.toLocaleString("en-US")}{" "}
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
                      <CardTitle>{t('warehouse.movements.title')}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1"> </p>
                    </div>
                    <Dialog
                      open={isMovementDialogOpen}
                      onOpenChange={setIsMovementDialogOpen}
                    >
                      <DialogTrigger asChild>
                        <Button onClick={handleAddMovement}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t('warehouse.movements.addMovement')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>{t('warehouse.movements.addNewMovement')}</DialogTitle>
                          <DialogDescription>
                            {t('warehouse.movements.addNewMovementDesc')}
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
                                  <FormLabel>{t('warehouse.labels.inventoryItem')}</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value ?? ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('warehouse.placeholders.selectItem')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {inventoryItems.map((item: any) => (
                                        <SelectItem
                                          key={item.id}
                                          value={item.id.toString()}
                                        >
                                          {ln(item.item_name_ar, item.item_name)} -{" "}
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
                                  <FormLabel>{t('warehouse.labels.movementType')}</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value ?? ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={t('warehouse.placeholders.selectMovementType')} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="in">{t('warehouse.movementTypes.in')}</SelectItem>
                                      <SelectItem value="out">{t('warehouse.movementTypes.out')}</SelectItem>
                                      <SelectItem value="transfer">
                                        {t('warehouse.movementTypes.transfer')}
                                      </SelectItem>
                                      <SelectItem value="adjustment">
                                        {t('warehouse.movementTypes.adjustment')}
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
                                  <FormLabel>{t('warehouse.labels.quantity')}</FormLabel>
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
                                    <FormLabel>{t('warehouse.labels.referenceNumber')}</FormLabel>
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
                                    <FormLabel>{t('warehouse.labels.referenceType')}</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      value={field.value ?? ""}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder={t('warehouse.placeholders.selectType')} />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="purchase">
                                          {t('warehouse.referenceTypes.purchase')}
                                        </SelectItem>
                                        <SelectItem value="sale">
                                          {t('warehouse.referenceTypes.sale')}
                                        </SelectItem>
                                        <SelectItem value="production">
                                          {t('warehouse.referenceTypes.production')}
                                        </SelectItem>
                                        <SelectItem value="adjustment">
                                          {t('warehouse.referenceTypes.adjustment')}
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
                                  <FormLabel>{t('warehouse.labels.notes')}</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder={t('warehouse.placeholders.additionalNotes')}
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
                                {t('warehouse.buttons.cancel')}
                              </Button>
                              <Button
                                type="submit"
                                disabled={movementMutation.isPending}
                              >
                                {movementMutation.isPending
                                  ? t('warehouse.buttons.saving')
                                  : t('warehouse.buttons.save')}
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
                    <div className="text-center py-8">{t('warehouse.loading')}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                              {t('warehouse.labels.item')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                              {t('warehouse.labels.movementType')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                              {t('warehouse.labels.quantity')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                              {t('warehouse.labels.referenceNumber')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                              {t('warehouse.labels.date')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                              {t('warehouse.labels.user')}
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-200 uppercase">
                              {t('warehouse.labels.actions')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {movements.length === 0 ? (
                            <tr>
                              <td
                                colSpan={7}
                                className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                              >
                                {t('warehouse.movements.noMovements')}
                              </td>
                            </tr>
                          ) : (
                            movements.map((movement: any) => (
                              <tr
                                key={movement.id}
                                className="hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                <td className="px-6 py-4">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                      {ln(movement.item_name_ar, movement.item_name)}
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
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
                                      ? t('warehouse.movementTypes.in')
                                      : movement.movement_type === "out"
                                        ? t('warehouse.movementTypes.out')
                                        : movement.movement_type === "transfer"
                                          ? t('warehouse.movementTypes.transfer')
                                          : t('warehouse.movementTypes.adjustment')}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                  {parseFloat(
                                    movement.quantity,
                                  ).toLocaleString("en-US")}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                  {movement.reference_number || "-"}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                  {new Date(
                                    movement.created_at,
                                  ).toLocaleDateString("en-GB")}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
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
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [receiptWeight, setReceiptWeight] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [selectedReceiptOrderId, setSelectedReceiptOrderId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: productionOrders = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/warehouse/production-hall"],
    refetchInterval: 120000,
    staleTime: 90000,
  });

  const processedOrders = useMemo(() => {
    return productionOrders.map((order: any) => ({
      ...order,
      quantity_required: parseFloat(order.quantity_required) || 0,
      total_film_weight: parseFloat(order.total_film_weight) || 0,
      total_print_weight: parseFloat(order.total_print_weight) || 0,
      total_cut_weight: parseFloat(order.total_cut_weight) || 0,
      total_received_weight: parseFloat(order.total_received_weight) || 0,
      waste_weight: parseFloat(order.waste_weight) || 0,
      remaining_to_receive:
        (parseFloat(order.total_cut_weight) || 0) -
        (parseFloat(order.total_received_weight) || 0),
    }));
  }, [productionOrders]);

  const groupedByOrder = useMemo(() => {
    const groups: Record<string, { order_number: string; customer_name: string; customer_name_ar: string; items: any[] }> = {};
    processedOrders.forEach((po: any) => {
      const key = po.order_number || po.order_id;
      if (!groups[key]) {
        groups[key] = {
          order_number: po.order_number,
          customer_name: po.customer_name,
          customer_name_ar: po.customer_name_ar,
          items: [],
        };
      }
      groups[key].items.push(po);
    });
    return Object.values(groups);
  }, [processedOrders]);

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
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/production-hall"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/receipts-detailed"] });
      setReceiptDialogOpen(false);
      setSelectedOrders(new Set());
      setReceiptWeight("");
      setReceiptNotes("");
      setSelectedReceiptOrderId(null);
      toast({ title: t('warehouse.production.receiptSuccess'), description: t('warehouse.production.receiptSuccessDesc') });
    },
    onError: () => {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.receiptFailed'), variant: "destructive" });
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

  const openReceiptForOrder = (productionOrderId: string) => {
    setSelectedReceiptOrderId(productionOrderId);
    setReceiptDialogOpen(true);
  };

  const handleReceiptSubmit = () => {
    if (!receiptWeight || parseFloat(receiptWeight) <= 0) {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.enterReceiptWeight'), variant: "destructive" });
      return;
    }
    if (!user?.id) {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.loginRequired'), variant: "destructive" });
      return;
    }

    const targetOrders = selectedReceiptOrderId
      ? [selectedReceiptOrderId]
      : Array.from(selectedOrders);

    if (targetOrders.length === 0) {
      toast({ title: t('warehouse.toast.error'), description: t('warehouse.production.selectAtLeastOneOrder'), variant: "destructive" });
      return;
    }

    const totalWeight = parseFloat(receiptWeight);
    const numOrders = targetOrders.length;
    const baseWeight = Math.floor((totalWeight * 1000) / numOrders) / 1000;
    const remainder = totalWeight - baseWeight * numOrders;

    targetOrders.forEach((productionOrderId, index) => {
      const weight = index === numOrders - 1 ? baseWeight + remainder : baseWeight;
      receiptMutation.mutate({
        production_order_id: parseInt(productionOrderId),
        received_weight_kg: weight,
        received_by: user.id,
        notes: receiptNotes,
      });
    });
  };

  const allPoIds = processedOrders.map((o: any) => o.production_order_id.toString());

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            {t('warehouse.production.title')}
          </CardTitle>
          <div className="flex space-x-2 space-x-reverse">
            <Dialog open={receiptDialogOpen} onOpenChange={(open) => { setReceiptDialogOpen(open); if (!open) setSelectedReceiptOrderId(null); }}>
              <DialogTrigger asChild>
                <Button disabled={selectedOrders.size === 0}>
                  <Truck className="h-4 w-4 mr-2" />
                  {t('warehouse.production.receiveSelected')} ({selectedOrders.size})
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('warehouse.production.receiveFromProductionHall')}</DialogTitle>
                  <DialogDescription>
                    {t('warehouse.production.receiveFromProductionHallDesc')}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedReceiptOrderId && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                      <span className="font-medium">{t('warehouse.production.productionOrder')}: </span>
                      {processedOrders.find((o: any) => o.production_order_id.toString() === selectedReceiptOrderId)?.production_order_number}
                      <span className="mx-2">|</span>
                      <span className="font-medium">{t('warehouse.production.remaining')}: </span>
                      {processedOrders.find((o: any) => o.production_order_id.toString() === selectedReceiptOrderId)?.remaining_to_receive.toFixed(2)} {t('warehouse.units.kilo')}
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">{t('warehouse.production.receivedWeight')}</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={receiptWeight}
                      onChange={(e) => setReceiptWeight(e.target.value)}
                      placeholder={t('warehouse.production.enterReceivedWeight')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">{t('warehouse.production.notesOptional')}</label>
                    <textarea
                      value={receiptNotes}
                      onChange={(e) => setReceiptNotes(e.target.value)}
                      placeholder={t('warehouse.production.addReceiptNotes')}
                      className="w-full min-h-[60px] p-2 border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
                    />
                  </div>
                  <div className="flex space-x-2 space-x-reverse">
                    <Button onClick={handleReceiptSubmit} disabled={receiptMutation.isPending}>
                      {receiptMutation.isPending ? t('warehouse.buttons.saving') : t('warehouse.production.confirmReceipt')}
                    </Button>
                    <Button variant="outline" onClick={() => { setReceiptDialogOpen(false); setSelectedReceiptOrderId(null); }}>
                      {t('warehouse.buttons.cancel')}
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
          <div className="flex justify-center py-8">{t('warehouse.loading')}</div>
        ) : processedOrders.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Factory className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p>{t('warehouse.production.noMaterialsReady')}</p>
            <p className="text-sm">{t('warehouse.production.cutOrdersWillAppear')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={selectedOrders.size === allPoIds.length && allPoIds.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedOrders(new Set(allPoIds));
                  } else {
                    setSelectedOrders(new Set());
                  }
                }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('warehouse.production.selectAll')} ({allPoIds.length} {t('warehouse.production.productionOrders')})</span>
            </div>

            {groupedByOrder.map((group) => (
              <div key={group.order_number} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="font-bold text-sm">{t('warehouse.production.order')}: {group.order_number}</span>
                    <span className="text-gray-500 text-sm">|</span>
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white">{group.customer_name_ar || group.customer_name}</span>
                    {group.customer_name_ar && group.customer_name && group.customer_name_ar !== group.customer_name && (
                      <span className="text-xs text-gray-400">({group.customer_name})</span>
                    )}
                  </div>
                  <Badge variant="outline">{group.items.length} {t('warehouse.production.productionOrders')}</Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 dark:bg-gray-900">
                        <th className="text-right py-2 px-3 font-medium w-10"></th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.productionOrder')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.labels.item')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.requiredQuantity')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.producedFilm')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.printing')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.cutQuantity')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.received')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.remaining')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.waste')}</th>
                        <th className="text-right py-2 px-3 font-medium">{t('warehouse.production.status')}</th>
                        <th className="text-right py-2 px-3 font-medium w-20">{t('warehouse.production.receive')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((order: any) => {
                        const remaining = order.remaining_to_receive;
                        const isPrinted = order.is_printed;
                        return (
                          <tr
                            key={order.production_order_id}
                            className={`border-b hover:bg-gray-50 dark:hover:bg-gray-800 ${selectedOrders.has(order.production_order_id.toString()) ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                          >
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={selectedOrders.has(order.production_order_id.toString())}
                                onChange={() => handleSelectOrder(order.production_order_id.toString())}
                              />
                            </td>
                            <td className="py-2 px-3">
                              <Badge variant="outline" className="text-blue-600">
                                {order.production_order_number}
                              </Badge>
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-medium">{ln(order.item_name_ar, order.item_name)}</div>
                              {order.size_caption && <div className="text-xs text-gray-500">{order.size_caption}</div>}
                            </td>
                            <td className="py-2 px-3 font-medium">
                              {order.quantity_required.toFixed(2)}
                            </td>
                            <td className="py-2 px-3">
                              <div className="text-blue-600 font-medium">{order.total_film_weight.toFixed(2)}</div>
                              {order.film_producers && <div className="text-xs text-gray-500">{order.film_producers}</div>}
                            </td>
                            <td className="py-2 px-3">
                              {isPrinted ? (
                                <div>
                                  <div className="text-purple-600 font-medium">{order.total_print_weight.toFixed(2)}</div>
                                  {order.printers && <div className="text-xs text-gray-500">{order.printers}</div>}
                                </div>
                              ) : (
                                <span className="text-gray-400 font-bold text-lg">X</span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <div className="text-green-600 font-medium">{order.total_cut_weight.toFixed(2)}</div>
                              {order.cutters && <div className="text-xs text-gray-500">{order.cutters}</div>}
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-orange-600 font-medium">{order.total_received_weight.toFixed(2)}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-purple-600 font-bold">{remaining.toFixed(2)}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-red-600">{order.waste_weight.toFixed(2)}</span>
                            </td>
                            <td className="py-2 px-3">
                              {remaining > 0 ? (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  {t('warehouse.production.partial')}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 ml-1" />
                                  {t('warehouse.production.complete')}
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {remaining > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => openReceiptForOrder(order.production_order_id.toString())}
                                >
                                  <ArrowDownToLine className="h-3 w-3 ml-1" />
                                  {t('warehouse.production.receive')}
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Received Quantities Component
function ReceivedQuantitiesContent() {
  const { t } = useTranslation();
  const ln = useLocalizedName();
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
            {t('warehouse.received.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="text-center py-8"
            data-testid="loading-received-quantities"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            {t('warehouse.loading')}
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
                {t('warehouse.received.title')}
              </CardTitle>
              <CardDescription>
                {t('warehouse.received.description')}
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
                  {t('warehouse.received.totalOrders')}
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
                  {t('warehouse.received.totalWeight')}
                </span>
              </div>
              <div className="text-2xl font-bold text-green-700">
                {stats.totalWeight.toFixed(2)} {t('warehouse.units.kilo')}
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-600">
                  {t('warehouse.received.totalReceipts')}
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
                  {t('warehouse.received.avgWeightPerOrder')}
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-700">
                {stats.totalOrders > 0
                  ? (stats.totalWeight / stats.totalOrders).toFixed(2)
                  : "0"}{" "}
                {t('warehouse.units.kilo')}
              </div>
            </div>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('warehouse.received.searchPlaceholder')}
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
                <SelectValue placeholder={t('warehouse.received.sortBy')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">{t('warehouse.received.sortByDate')}</SelectItem>
                <SelectItem value="weight">{t('warehouse.received.sortByWeight')}</SelectItem>
                <SelectItem value="customer">{t('warehouse.received.sortByCustomer')}</SelectItem>
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
              className="text-center text-gray-500 dark:text-gray-400"
              data-testid="no-received-quantities"
            >
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">{t('warehouse.received.noReceivedQuantities')}</p>
              <p className="text-sm">
                {searchTerm
                  ? t('warehouse.received.noMatchingResults')
                  : t('warehouse.received.noReceivedYet')}
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
                          {order.receipts?.length || 0} {t('warehouse.received.receipt')}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('warehouse.received.customer')}</p>
                          <p
                            className="font-medium"
                            data-testid={`customer-name-${order.order_number}`}
                          >
                            {order.customer_name_ar || order.customer_name}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('warehouse.received.product')}</p>
                          <p
                            className="font-medium"
                            data-testid={`item-name-${order.order_number}`}
                          >
                            {ln(order.item_name_ar, order.item_name)}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            {t('warehouse.received.totalWeight')}
                          </p>
                          <p
                            className="font-bold text-green-600 text-lg"
                            data-testid={`total-weight-${order.order_number}`}
                          >
                            {Number(order.total_received_weight).toFixed(2)}{" "}
                            {t('warehouse.units.kilo')}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                            {t('warehouse.received.lastReceipt')}
                          </p>
                          <p className="text-sm">
                            {latestReceipt
                              ? new Date(
                                  latestReceipt.receipt_date,
                                ).toLocaleDateString("en-US")
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
                            {t('warehouse.received.productSpecs')}:
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            {order.size_caption && (
                              <div>
                                <span className="text-gray-500">{t('warehouse.received.size')}:</span>
                                <span className="mr-1 font-medium">
                                  {order.size_caption}
                                </span>
                              </div>
                            )}
                            {order.width && (
                              <div>
                                <span className="text-gray-500">{t('warehouse.received.width')}:</span>
                                <span className="mr-1 font-medium">
                                  {order.width}{t('warehouse.units.meter')}
                                </span>
                              </div>
                            )}
                            {order.thickness && (
                              <div>
                                <span className="text-gray-500">{t('warehouse.received.thickness')}:</span>
                                <span className="mr-1 font-medium">
                                  {order.thickness}{t('warehouse.units.mm')}
                                </span>
                              </div>
                            )}
                            {order.raw_material && (
                              <div>
                                <span className="text-gray-500">{t('warehouse.received.material')}:</span>
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
                          {t('warehouse.received.hideDetails')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4 mr-1" />
                          {t('warehouse.received.showDetails')}
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
                        {t('warehouse.received.receiptDetails')} ({order.receipts.length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {order.receipts.map((receipt: any) => (
                          <div
                            key={receipt.receipt_id}
                            className="border rounded-lg p-4 bg-white dark:bg-gray-800 shadow-sm"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <Badge variant="outline" className="text-xs">
                                {t('warehouse.received.receipt')} #{receipt.receipt_id}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(
                                  receipt.receipt_date,
                                ).toLocaleDateString("en-US")}
                              </span>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Scale className="h-3 w-3 text-green-600" />
                                <span className="text-gray-600 dark:text-gray-400">{t('warehouse.labels.quantity')}:</span>
                                <span className="font-semibold text-green-600">
                                  {Number(receipt.received_weight_kg).toFixed(
                                    2,
                                  )}{" "}
                                  {t('warehouse.units.kilo')}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-blue-600" />
                                <span className="text-gray-600 dark:text-gray-400">{t('warehouse.received.receivedBy')}:</span>
                                <span className="font-medium">
                                  {receipt.received_by_name}
                                </span>
                              </div>

                              {receipt.production_order_number && (
                                <div className="flex items-center gap-2">
                                  <Factory className="h-3 w-3 text-purple-600" />
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {t('warehouse.production.productionOrder')}:
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
