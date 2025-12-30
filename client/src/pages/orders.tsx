import { useState, lazy, Suspense } from "react";
import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import PageLayout from "../components/layout/PageLayout";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { parseIntSafe } from "../../../shared/validation-utils";
import { format } from "date-fns";
import { isUserAdmin } from "../utils/roleUtils";
import { OrdersStats, OrdersTabs, OrderPrintTemplate, RollsTab } from "../components/orders";
import ViewOrderDialog from "../components/orders/ViewOrderDialog";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Search, ClipboardCheck, Link2, BarChart3, Package } from "lucide-react";

// استيراد كسول للصفحات
const RollSearch = lazy(() => import("./RollSearch"));
const ProductionOrdersManagement = lazy(() => import("./ProductionOrdersManagement"));
const ProductionQueues = lazy(() => import("./ProductionQueues"));
const ProductionReports = lazy(() => import("./ProductionReports"));

export default function Orders() {
  const [location, setLocation] = useLocation();
  
  // الحصول على tab من query parameters
  const getActiveTab = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "orders";
  };
  
  const [activeTab, setActiveTab] = useState(getActiveTab());
  
  // تحديث activeTab عند تغيير location
  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location]);
  
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "orders") {
      setLocation("/orders");
    } else {
      setLocation(`/orders?tab=${value}`);
    }
  };
  
  const [searchTerm, setSearchTerm] = useState("");
  
  const [statusFilter, setStatusFilter] = useState("all");
  const [productionSearchTerm, setProductionSearchTerm] = useState("");
  const [productionStatusFilter, setProductionStatusFilter] = useState("all");
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  // فتح مودال الإنشاء تلقائياً إذا كان url يحتوي على ?create=1
    useEffect(() => {
      try {
        const params = new URLSearchParams(window.location.search);
        const create = params.get("create");
        if (create === "1" || create === "true") {
          setIsOrderDialogOpen(true);
          params.delete("create");
          const newSearch = params.toString();
          const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "");
          window.history.replaceState({}, "", newUrl);
        }
      } catch (err) {
        // لا نفشل التطبيق بسبب هذا فقط
        console.warn("error parsing query params", err);
      }
    }, []);
  const [isViewOrderDialogOpen, setIsViewOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<any>(null);

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = isUserAdmin(user);

  // Fetch orders
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await fetch("/api/orders");
      if (!response.ok) throw new Error("فشل في جلب الطلبات");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch production orders
  const { data: productionOrders = [] } = useQuery({
    queryKey: ["/api/production-orders"],
    queryFn: async () => {
      const response = await fetch("/api/production-orders");
      if (!response.ok) throw new Error("فشل في جلب أوامر الإنتاج");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch("/api/customers");
      if (!response.ok) throw new Error("فشل في جلب العملاء");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch customer products
  const { data: customerProducts = [] } = useQuery({
    queryKey: ["/api/customer-products"],
    queryFn: async () => {
      const response = await fetch("/api/customer-products");
      if (!response.ok) throw new Error("فشل في جلب منتجات العملاء");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch users
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("فشل في جلب المستخدمين");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch items
  const { data: items = [] } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const response = await fetch("/api/items");
      if (!response.ok) throw new Error("فشل في جلب العناصر");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data : [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error("فشل في جلب الفئات");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data : [];
    },
  });

  // Filter orders by search term and status
  const filteredOrders = orders.filter((order: any) => {
    // Search filter
    const matchesSearch =
      searchTerm === "" ||
      (order.order_number || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      (order.customer_name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      customers
        .find((c: any) => c.id === order.customer_id)
        ?.name?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      customers
        .find((c: any) => c.id === order.customer_id)
        ?.name_ar?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus =
      statusFilter === "all" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter production orders by search term and status
  const filteredProductionOrders = productionOrders.filter((po: any) => {
    const order = orders.find((o: any) => o.id === po.order_id);
    const customer = customers.find((c: any) => c.id === order?.customer_id);
    const customerProduct = customerProducts.find((cp: any) => cp.id === po.customer_product_id);

    // Search filter
    const matchesSearch =
      productionSearchTerm === "" ||
      (po.production_order_number || "")
        .toLowerCase()
        .includes(productionSearchTerm.toLowerCase()) ||
      (order?.order_number || "")
        .toLowerCase()
        .includes(productionSearchTerm.toLowerCase()) ||
      (customer?.name_ar || "")
        .toLowerCase()
        .includes(productionSearchTerm.toLowerCase()) ||
      (customer?.name || "")
        .toLowerCase()
        .includes(productionSearchTerm.toLowerCase()) ||
      (customerProduct?.size_caption || "")
        .toLowerCase()
        .includes(productionSearchTerm.toLowerCase());

    // Status filter
    const matchesStatus =
      productionStatusFilter === "all" || po.status === productionStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Order submission handler
  const onOrderSubmit = async (data: any, productionOrdersData: any[]) => {
    // منع الإرسال المتعدد بشكل إضافي
    // إذا كان هناك طلب قيد المعالجة، لا نقبل طلباً جديداً
    if (isCreatingOrder) {
      console.warn("طلب قيد المعالجة بالفعل، تجاهل الطلب المكرر");
      return;
    }
    
    try {
      setIsCreatingOrder(true);
      console.log("بدء عملية حفظ الطلب...", { data, productionOrdersData, editingOrder });

      // Check if user is authenticated
      if (!user?.id) {
        toast({
          title: "خطأ",
          description: "يجب تسجيل الدخول لإنشاء طلب",
          variant: "destructive",
        });
        return;
      }

      // If editing, update the order
      if (editingOrder) {
        const updateData = {
          order_number: editingOrder.order_number, // Include order number as required by API
          customer_id: data.customer_id,
          delivery_days: parseIntSafe(data.delivery_days, "Delivery days", {
            min: 1,
            max: 365,
          }),
          notes: data.notes || "",
          created_by: editingOrder.created_by || user.id, // Keep original creator as number
        };

        console.log("تحديث الطلب:", updateData);
        const updateResponse = await fetch(`/api/orders/${editingOrder.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateData),
        });

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error("خطأ في تحديث الطلب:", errorText);
          throw new Error(`فشل في تحديث الطلب: ${errorText}`);
        }

        // Always delete existing production orders for this order
        // This ensures we recreate the entire set of production orders on save
        const existingProdOrders = productionOrders.filter(
          (po: any) => po.order_id === editingOrder.id
        );
        
        for (const po of existingProdOrders) {
          try {
            await fetch(`/api/production-orders/${po.id}`, {
              method: "DELETE",
            });
          } catch (error) {
            console.error("خطأ في حذف أمر إنتاج قديم:", error);
          }
        }

        // Create new production orders if any
        const validProductionOrders = productionOrdersData.filter(
          (prodOrder) =>
            prodOrder.customer_product_id &&
            prodOrder.customer_product_id !== "" &&
            prodOrder.quantity_kg &&
            prodOrder.quantity_kg > 0,
        );

        for (const prodOrder of validProductionOrders) {
          try {
            const productionOrderData = {
              order_id: editingOrder.id,
              customer_product_id: prodOrder.customer_product_id,
              quantity_kg: prodOrder.quantity_kg,
            };

            await fetch("/api/production-orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(productionOrderData),
            });
          } catch (error) {
            console.error("خطأ في إنشاء أمر إنتاج:", error);
          }
        }

        // Refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
        queryClient.invalidateQueries({
          queryKey: ["/api/production/hierarchical-orders"],
        });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

        setIsOrderDialogOpen(false);
        setEditingOrder(null);

        toast({
          title: "تم التحديث بنجاح",
          description: `تم تحديث الطلب ${editingOrder.order_number} بنجاح`,
        });
        return;
      }

      // Creating new order - check if at least one production order is added
      if (productionOrdersData.length === 0) {
        toast({
          title: "تحذير",
          description: "يجب إضافة أمر إنتاج واحد على الأقل",
          variant: "destructive",
        });
        return;
      }

      // Validate that all production orders have complete data
      const invalidOrders = productionOrdersData.filter(
        (order) =>
          !order.customer_product_id ||
          order.customer_product_id === "" ||
          !order.quantity_kg ||
          order.quantity_kg <= 0,
      );

      if (invalidOrders.length > 0) {
        toast({
          title: "خطأ في البيانات",
          description:
            "يرجى التأكد من اكتمال جميع أوامر الإنتاج (اختيار المنتج وإدخال الكمية)",
          variant: "destructive",
        });
        return;
      }

      // Generate order number
      console.log("توليد رقم الطلب...");
      const orderNumberResponse = await fetch("/api/orders/next-number");
      if (!orderNumberResponse.ok) throw new Error("فشل في توليد رقم الطلب");
      const { orderNumber } = await orderNumberResponse.json();
      console.log("رقم الطلب المولد:", orderNumber);

      // Create the order first
      const orderData = {
        order_number: orderNumber,
        customer_id: data.customer_id,
        delivery_days: parseIntSafe(data.delivery_days, "Delivery days", {
          min: 1,
          max: 365,
        }),
        notes: data.notes || "",
        created_by: user.id, // API expects a number, not a string
      };

      console.log("إرسال بيانات الطلب:", orderData);
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error("خطأ في إنشاء الطلب:", errorText);
        throw new Error(`فشل في إنشاء الطلب: ${errorText}`);
      }

      const newOrder = await orderResponse.json();
      console.log("تم إنشاء الطلب بنجاح:", newOrder);

      // Filter out empty production orders and create valid ones
      const validProductionOrders = productionOrdersData.filter(
        (prodOrder) =>
          prodOrder.customer_product_id &&
          prodOrder.customer_product_id !== "" &&
          prodOrder.quantity_kg &&
          prodOrder.quantity_kg > 0,
      );

      console.log("أوامر الإنتاج الصالحة:", validProductionOrders);

      // Create production orders using batch endpoint for better performance
      const batchProductionOrders = validProductionOrders.map((prodOrder: any) => ({
        order_id: newOrder.data?.id || newOrder.id,
        customer_product_id: prodOrder.customer_product_id,
        quantity_kg: prodOrder.quantity_kg,
        // overrun_percentage and final_quantity_kg will be calculated server-side for security
      }));

      console.log("بيانات أوامر الإنتاج:", batchProductionOrders);

      // Create all production orders in a single batch request
      const prodOrderResponse = await fetch("/api/production-orders/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orders: batchProductionOrders }),
      });

      if (!prodOrderResponse.ok) {
        const errorText = await prodOrderResponse.text();
        console.error("خطأ في إنشاء أوامر الإنتاج:", errorText);
        throw new Error(`فشل في إنشاء أوامر الإنتاج: ${errorText}`);
      }

      const batchResult = await prodOrderResponse.json();
      console.log("نتيجة إنشاء أوامر الإنتاج:", batchResult);

      // Check if any orders failed
      if (batchResult.failed && batchResult.failed.length > 0) {
        console.warn("بعض أوامر الإنتاج فشلت:", batchResult.failed);
        // Continue with successful orders, but warn about failures
        if (batchResult.successful && batchResult.successful.length > 0) {
          toast({
            title: "تنبيه",
            description: `تم إنشاء ${batchResult.successful.length} من ${batchProductionOrders.length} أوامر إنتاج`,
            variant: "default",
          });
        } else {
          throw new Error("فشل في إنشاء جميع أوامر الإنتاج");
        }
      } else {
        console.log("تم إنشاء جميع أوامر الإنتاج بنجاح");
      }

      // Refresh data - invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/production/hierarchical-orders"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      // Close dialogs and reset forms
      setIsOrderDialogOpen(false);
      setEditingOrder(null);

      toast({
        title: "تم الحفظ بنجاح",
        description: `تم إنشاء الطلب ${orderNumber} بنجاح مع ${validProductionOrders.length} أمر إنتاج`,
      });
    } catch (error) {
      console.error("خطأ في حفظ الطلب:", error);
      toast({
        title: "خطأ",
        description:
          error instanceof Error ? error.message : "فشل في حفظ البيانات",
        variant: "destructive",
      });
    } finally {
      // إعادة تعيين حالة isCreatingOrder بغض النظر عن النجاح أو الفشل
      setIsCreatingOrder(false);
    }
  };

  // Order actions handlers
  const handleAddOrder = () => {
    setEditingOrder(null);
    setIsOrderDialogOpen(true);
  };

  const handleEditOrder = (order: any) => {
    if (!isAdmin) {
      toast({
        title: "غير مخول",
        description: "صلاحيات المدير مطلوبة لتعديل الطلبات",
        variant: "destructive",
      });
      return;
    }
    setEditingOrder(order);
    setIsOrderDialogOpen(true);
  };

  const handleDeleteOrder = async (order: any) => {
    if (!isAdmin) {
      toast({
        title: "غير مخول",
        description: "صلاحيات المدير مطلوبة لحذف الطلبات",
        variant: "destructive",
      });
      return;
    }

    if (
      !confirm(
        `هل أنت متأكد من حذف الطلب ${order.order_number}؟ هذا الإجراء لا يمكن التراجع عنه.`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في حذف الطلب");
      }

      // Refresh all related data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/production/hierarchical-orders"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      toast({
        title: "تم الحذف بنجاح",
        description: `تم حذف الطلب ${order.order_number}`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description:
          error instanceof Error ? error.message : "فشل في حذف الطلب",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (order: any, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "فشل في تحديث حالة الطلب");
      }

      // Refresh all related data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/production/hierarchical-orders"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });

      toast({
        title: "تم التحديث بنجاح",
        description: `تم تحديث حالة الطلب ${order.order_number}`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description:
          error instanceof Error ? error.message : "فشل في تحديث حالة الطلب",
        variant: "destructive",
      });
    }
  };

  // Bulk action handlers
  const handleBulkDelete = async (orderIds: number[]) => {
    if (!isAdmin) {
      toast({
        title: "غير مخول",
        description: "صلاحيات المدير مطلوبة لحذف الطلبات",
        variant: "destructive",
      });
      return;
    }

    try {
      // Delete orders one by one (could be optimized to a single API call)
      const deletePromises = orderIds.map((orderId) =>
        fetch(`/api/orders/${orderId}`, { method: "DELETE" }),
      );

      const responses = await Promise.allSettled(deletePromises);

      // Check for failures
      const failures = responses.filter(
        (response) =>
          response.status === "rejected" ||
          (response.status === "fulfilled" && !response.value.ok),
      );

      if (failures.length > 0) {
        toast({
          title: "تحذير",
          description: `فشل حذف ${failures.length} من ${orderIds.length} طلب`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم الحذف بنجاح",
          description: `تم حذف ${orderIds.length} طلب بنجاح`,
        });
      }

      // Refresh all related data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/production/hierarchical-orders"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    } catch (error) {
      toast({
        title: "خطأ",
        description:
          error instanceof Error ? error.message : "فشل في الحذف الجماعي",
        variant: "destructive",
      });
    }
  };

  const handleBulkStatusChange = async (
    orderIds: number[],
    newStatus: string,
  ) => {
    try {
      // Update status for all selected orders
      const updatePromises = orderIds.map((orderId) =>
        fetch(`/api/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        }),
      );

      const responses = await Promise.allSettled(updatePromises);

      // Check for failures
      const failures = responses.filter(
        (response) =>
          response.status === "rejected" ||
          (response.status === "fulfilled" && !response.value.ok),
      );

      if (failures.length > 0) {
        toast({
          title: "تحذير",
          description: `فشل تحديث ${failures.length} من ${orderIds.length} طلب`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم التحديث بنجاح",
          description: `تم تحديث حالة ${orderIds.length} طلب بنجاح`,
        });
      }

      // Refresh all related data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/production/hierarchical-orders"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    } catch (error) {
      toast({
        title: "خطأ",
        description:
          error instanceof Error ? error.message : "فشل في التحديث الجماعي",
        variant: "destructive",
      });
    }
  };

  const handleViewOrder = (order: any) => {
    setViewingOrder(order);
    setIsViewOrderDialogOpen(true);
  };

  const handlePrintOrder = (order: any) => {
    setPrintingOrder(order);
  };



  if (ordersLoading) {
    return (
      <PageLayout title="إدارة الطلبات والإنتاج" description="جاري التحميل...">
        <div className="text-center">جاري التحميل...</div>
      </PageLayout>
    );
  }

  // Loading fallback للصفحات الكسولة
  const LoadingFallback = () => (
    <div className="space-y-4 p-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );

  return (
    <PageLayout 
      title="إدارة الطلبات والإنتاج" 
      description="إنشاء ومتابعة الطلبات وأوامر الإنتاج والطوابير والتقارير"
    >
      {isAdmin && (
        <div className="mb-4 text-sm text-green-600 dark:text-green-400 font-medium">
          ✓ لديك صلاحيات المدير - يمكنك تعديل وحذف الطلبات
        </div>
      )}

      {/* التبويبات الرئيسية */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6" dir="rtl">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="orders" data-testid="tab-orders">
            الطلبات
          </TabsTrigger>
          <TabsTrigger value="production-orders" data-testid="tab-production-orders">
            <ClipboardCheck className="h-4 w-4 ml-2" />
            <span>أوامر الإنتاج</span>
          </TabsTrigger>
          <TabsTrigger value="rolls" data-testid="tab-rolls">
            <Package className="h-4 w-4 ml-2" />
            <span>الرولات</span>
          </TabsTrigger>
          <TabsTrigger value="production-queues" data-testid="tab-production-queues">
            <Link2 className="h-4 w-4 ml-2" />
            <span>طوابير الإنتاج</span>
          </TabsTrigger>
          <TabsTrigger value="roll-search" data-testid="tab-roll-search">
            <Search className="h-4 w-4 ml-2" />
            <span>البحث عن الرولات</span>
          </TabsTrigger>
          <TabsTrigger value="production-reports" data-testid="tab-production-reports">
            <BarChart3 className="h-4 w-4 ml-2" />
            <span>تقارير الإنتاج</span>
          </TabsTrigger>
        </TabsList>

        {/* محتوى الطلبات */}
        <TabsContent value="orders">
          {!ordersLoading && (
            <>
              <OrdersStats orders={orders} productionOrders={productionOrders} />
              <div className="mt-6">
                <OrdersTabs
                  orders={orders}
                  productionOrders={productionOrders}
                  customers={customers}
                  customerProducts={customerProducts}
                  users={users}
                  items={items}
                  categories={categories}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  productionSearchTerm={productionSearchTerm}
                  setProductionSearchTerm={setProductionSearchTerm}
                  productionStatusFilter={productionStatusFilter}
                  setProductionStatusFilter={setProductionStatusFilter}
                  filteredOrders={filteredOrders}
                  filteredProductionOrders={filteredProductionOrders}
                  isOrderDialogOpen={isOrderDialogOpen}
                  setIsOrderDialogOpen={setIsOrderDialogOpen}
                  editingOrder={editingOrder}
                  onAddOrder={handleAddOrder}
                  onEditOrder={handleEditOrder}
                  onDeleteOrder={handleDeleteOrder}
                  onStatusChange={handleStatusChange}
                  onViewOrder={handleViewOrder}
                  onPrintOrder={handlePrintOrder}
                  onOrderSubmit={onOrderSubmit}
                  onBulkDelete={handleBulkDelete}
                  onBulkStatusChange={handleBulkStatusChange}
                  currentUser={user}
                  isAdmin={isAdmin}
                />
              </div>
            </>
          )}
        </TabsContent>

        {/* محتوى أوامر الإنتاج */}
        <TabsContent value="production-orders">
          <Suspense fallback={<LoadingFallback />}>
            <div className="embedded-page-wrapper">
              <ProductionOrdersManagement />
            </div>
          </Suspense>
        </TabsContent>

        {/* محتوى الرولات */}
        <TabsContent value="rolls">
          <RollsTab 
            customers={customers}
            productionOrders={productionOrders}
          />
        </TabsContent>

        {/* محتوى طوابير الإنتاج */}
        <TabsContent value="production-queues">
          <Suspense fallback={<LoadingFallback />}>
            <div className="embedded-page-wrapper">
              <ProductionQueues />
            </div>
          </Suspense>
        </TabsContent>

        {/* محتوى البحث عن الرولات */}
        <TabsContent value="roll-search">
          <Suspense fallback={<LoadingFallback />}>
            <div className="embedded-page-wrapper">
              <RollSearch />
            </div>
          </Suspense>
        </TabsContent>

        {/* محتوى تقارير الإنتاج */}
        <TabsContent value="production-reports">
          <Suspense fallback={<LoadingFallback />}>
            <div className="embedded-page-wrapper">
              <ProductionReports />
            </div>
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* View Order Dialog */}
      <ViewOrderDialog
        isOpen={isViewOrderDialogOpen}
        onClose={() => {
          setIsViewOrderDialogOpen(false);
          setViewingOrder(null);
        }}
        order={viewingOrder}
        customer={customers.find((c: any) => c.id === viewingOrder?.customer_id)}
        productionOrders={productionOrders}
        customerProducts={customerProducts}
        items={items}
        onPrint={handlePrintOrder}
      />

      {/* Print Order Template */}
      {printingOrder && (
        <OrderPrintTemplate
          order={printingOrder}
          customer={customers.find((c: any) => c.id === printingOrder?.customer_id)}
          productionOrders={productionOrders.filter((po: any) => po.order_id === printingOrder?.id)}
          customerProducts={customerProducts}
          items={items}
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </PageLayout>
  );
}
