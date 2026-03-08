import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageLayout from "../components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "../components/ui/dialog";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  Building2,
  Users,
  Cog,
  Package,
  Plus,
  Edit,
  Trash2,
  Printer,
  Search,
  Filter,
  MapPin,
  Settings,
  User,
  Copy,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Languages,
  Loader2,
} from "lucide-react";
import { formatNumber } from "../lib/formatNumber";

export default function Definitions() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Remove aggressive cache clearing that causes unnecessary refetches
  // React Query's default staleTime and gcTime will handle cache freshness automatically

  const [selectedTab, setSelectedTab] = useState("customers");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [quickSearch, setQuickSearch] = useState("");

  // Reset search and filters when changing tabs
  useEffect(() => {
    setQuickSearch("");
    setStatusFilter("all");
  }, [selectedTab]);

  // Prevent mouse wheel from changing number inputs
  useEffect(() => {
    const preventWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'number') {
        e.preventDefault();
      }
    };

    // Add listener to all number inputs
    document.addEventListener('wheel', preventWheel, { passive: false });

    return () => {
      document.removeEventListener('wheel', preventWheel);
    };
  }, []);

  // Pagination states for each tab
  const [currentPages, setCurrentPages] = useState({
    customers: 1,
    categories: 1,
    sections: 1,
    items: 1,
    customerProducts: 1,
    locations: 1,
    machines: 1,
    users: 1,
  });
  const itemsPerPage = 25;

  // Helper function to paginate data
  const paginateData = (data: any[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  };

  // Helper function to get total pages
  const getTotalPages = (dataLength: number) => {
    return Math.ceil(dataLength / itemsPerPage);
  };

  // Helper function to update page for specific tab
  const updatePage = (tab: string, page: number) => {
    setCurrentPages((prev) => ({
      ...prev,
      [tab]: page,
    }));
  };

  // Drawer code separate states
  const [drawerLetter, setDrawerLetter] = useState("");
  const [drawerNumber, setDrawerNumber] = useState("");

  // Translation state
  const [isTranslating, setIsTranslating] = useState(false);

  // Auto-translate customer name function
  const handleTranslateCustomerName = async () => {
    const nameAr = customerForm.name_ar?.trim();
    const nameEn = customerForm.name?.trim();

    // Determine which field has content and translate to the other
    let textToTranslate = "";
    let targetLanguage = "";

    if (nameAr && !nameEn) {
      textToTranslate = nameAr;
      targetLanguage = "en";
    } else if (nameEn && !nameAr) {
      textToTranslate = nameEn;
      targetLanguage = "ar";
    } else if (nameAr && nameEn) {
      // Both have values - translate Arabic to English (priority)
      textToTranslate = nameAr;
      targetLanguage = "en";
    } else {
      toast({
        title: t("common.error"),
        description: t("definitions.customers.enterNameFirst"),
        variant: "destructive",
      });
      return;
    }

    setIsTranslating(true);
    try {
      const response = await apiRequest("/api/translate-name", {
        method: "POST",
        body: JSON.stringify({ text: textToTranslate, targetLanguage }),
      });
      
      const data = await response.json();
      
      if (data.translatedText) {
        if (targetLanguage === "en") {
          setCustomerForm(prev => ({ ...prev, name: data.translatedText }));
        } else {
          setCustomerForm(prev => ({ ...prev, name_ar: data.translatedText }));
        }
        toast({
          title: t("common.success"),
          description: t("definitions.customers.translationSuccess"),
        });
      }
    } catch (error) {
      console.error("Translation error:", error);
      toast({
        title: t("common.error"),
        description: t("definitions.customers.translationError"),
        variant: "destructive",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  // Form states
  const [customerForm, setCustomerForm] = useState({
    name: "",
    name_ar: "",
    code: "",
    user_id: "",
    plate_drawer_code: "",
    city: "",
    address: "",
    tax_number: "",
    phone: "",
    sales_rep_id: "",
  });
  const [sectionForm, setSectionForm] = useState({
    name: "",
    name_ar: "",
    description: "",
  });
  const [itemForm, setItemForm] = useState({
    name: "",
    name_ar: "",
    code: "",
    category_id: "none",
    status: "active",
  });
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    name_ar: "",
    code: "",
    parent_id: "none",
    description: "",
    status: "active",
  });
  const [customerProductForm, setCustomerProductForm] = useState({
    customer_id: "none",
    category_id: "none",
    item_id: "none",
    size_caption: "",
    width: "",
    left_facing: "",
    right_facing: "",
    thickness: "",
    printing_cylinder: "بدون طباعة",
    cutting_length_cm: "",
    raw_material: "",
    master_batch_id: "",
    is_printed: false,
    cutting_unit: "كيلو",
    punching: "",
    unit_weight_kg: "",
    unit_quantity: "",
    package_weight_kg: "",
    cliche_front_design: "",
    cliche_back_design: "",
    front_design_filename: "",
    back_design_filename: "",
    notes: "",
    status: "active",
  });
  const [locationForm, setLocationForm] = useState({
    name: "",
    name_ar: "",
    type: "city",
    parent_id: "",
    coordinates: "",
    status: "active",
  });
  const [machineForm, setMachineForm] = useState({
    name: "",
    name_ar: "",
    type: "extruder",
    section_id: "none",
    status: "active",
    capacity_small_kg_per_hour: "",
    capacity_medium_kg_per_hour: "",
    capacity_large_kg_per_hour: "",
  });
  const [userForm, setUserForm] = useState({
    username: "",
    display_name: "",
    display_name_ar: "",
    password: "",
    phone: "",
    role_id: "none",
    section_id: "none",
    status: "active",
  });
  const [showPassword, setShowPassword] = useState(false);
  
  // Master batch color form state
  const [masterBatchColorForm, setMasterBatchColorForm] = useState({
    id: "",
    name: "",
    name_ar: "",
    color_hex: "#000000",
    text_color: "#ffffff",
    brand: "",
    aliases: "",
    is_active: true,
    sort_order: 0,
  });

  // Search term for customer selection in customer products form
  const [customerSearchTermInProducts, setCustomerSearchTermInProducts] = useState("");

  // Generate printing cylinder options
  const printingCylinderOptions = [
    { value: "بدون طباعة", label: "بدون طباعة" },
    ...Array.from({ length: 16 }, (_, i) => {
      const size = (i + 1) * 2 + 6; // 8, 10, 12, ..., 38
      return { value: `${size}"`, label: `${size}"` };
    }),
    { value: '39"', label: '39"' },
  ];

  // Automatic calculations - cutting length from printing cylinder (gated by category, see effect after categories query)

  // Helper Functions
  const handleDeleteCustomerProduct = (product: any) => {
    if (
      window.confirm(
        `${t("definitions.messages.confirmDeleteProduct", { name: product.size_caption || t("definitions.print.noDescription") })}`,
      )
    ) {
      deleteCustomerProductMutation.mutate(product.id);
    }
  };

  const handleCloneCustomerProduct = (product: any) => {
    // Clone product data and reset form with cloned data
    const clonedData = {
      customer_id: product.customer_id || "none",
      category_id: product.category_id || "none",
      item_id: product.item_id || "none",
      size_caption: `${t("definitions.messages.copyOf")} ${product.size_caption || ""}`,
      width: product.width || "",
      left_facing: product.left_facing || "",
      right_facing: product.right_facing || "",
      thickness: product.thickness || "",
      printing_cylinder: product.printing_cylinder || "بدون طباعة",
      cutting_length_cm: product.cutting_length_cm || "",
      raw_material: product.raw_material || "",
      master_batch_id: product.master_batch_id || "",
      is_printed: product.is_printed || false,
      cutting_unit: product.cutting_unit || "",
      punching: product.punching || "",
      unit_weight_kg: product.unit_weight_kg || "",
      unit_quantity: product.unit_quantity || "",
      package_weight_kg: product.package_weight_kg || "",
      cliche_front_design: product.cliche_front_design || "",
      cliche_back_design: product.cliche_back_design || "",
      notes: product.notes || "",
      status: "active",
    };

    setCustomerProductForm({
      ...clonedData,
      front_design_filename: "",
      back_design_filename: "",
    });
    setEditingItem(null); // Ensure it's a new record
    setSelectedTab("customer-products");
    setIsDialogOpen(true);
    toast({ title: t("definitions.messages.customerProductCopied") });
  };

  const handlePrintCustomerProduct = (product: any) => {
    // Create a detailed print view
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ title: t("definitions.messages.printError"), variant: "destructive" });
      return;
    }

    const customerName = Array.isArray(customers)
      ? customers.find((c: any) => c.id === product.customer_id)?.name_ar ||
        customers.find((c: any) => c.id === product.customer_id)?.name ||
        t("definitions.print.unspecified")
      : t("definitions.print.unspecified");

    const categoryName = Array.isArray(categories)
      ? categories.find((c: any) => c.id === product.category_id)?.name_ar ||
        categories.find((c: any) => c.id === product.category_id)?.name ||
        t("definitions.print.unspecified")
      : t("definitions.print.unspecified");

    const itemName = Array.isArray(items)
      ? items.find((i: any) => i.id === product.item_id)?.name_ar ||
        items.find((i: any) => i.id === product.item_id)?.name ||
        t("definitions.print.unspecified")
      : t("definitions.print.unspecified");

    const masterBatchColor = masterBatchColors.find(
      (mb) => mb.id === product.master_batch_id || mb.aliases?.includes(product.master_batch_id || ""),
    );

    const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>${t("definitions.print.productDetails")}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 20px;
          line-height: 1.6;
          color: #333;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #007bff; 
          padding-bottom: 20px; 
          margin-bottom: 30px;
        }
        .header h1 { 
          color: #007bff; 
          margin: 0;
          font-size: 2em;
        }
        .header p { 
          margin: 5px 0; 
          color: #666;
          font-size: 1.1em;
        }
        .section { 
          margin-bottom: 25px; 
          padding: 15px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background-color: #f9f9f9;
        }
        .section h3 { 
          color: #007bff; 
          margin-top: 0; 
          border-bottom: 1px solid #007bff;
          padding-bottom: 8px;
        }
        .detail-row { 
          display: flex; 
          justify-content: space-between; 
          margin: 8px 0;
          padding: 5px 0;
          border-bottom: 1px dotted #ccc;
        }
        .detail-label { 
          font-weight: bold; 
          color: #555;
          min-width: 150px;
        }
        .detail-value { 
          color: #333;
          text-align: left;
        }
        .color-box { 
          display: inline-block; 
          width: 20px; 
          height: 20px; 
          border: 1px solid #ccc; 
          margin-left: 10px;
          vertical-align: middle;
        }
        .print-date {
          text-align: center;
          margin-top: 30px;
          font-size: 0.9em;
          color: #888;
        }
        .design-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          justify-content: center;
          margin-top: 15px;
        }
        .design-box {
          border: 2px solid #007bff;
          border-radius: 8px;
          padding: 10px;
          background-color: #fff;
          text-align: center;
          flex: 1;
          min-width: 200px;
          max-width: 45%;
        }
        .design-box h4 {
          margin: 0 0 10px 0;
          color: #007bff;
          font-size: 1em;
        }
        .design-image-wrapper {
          width: 100%;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: #f5f5f5;
          border-radius: 4px;
          overflow: hidden;
        }
        .design-image-wrapper img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .no-design {
          color: #999;
          font-style: italic;
        }
        @media print {
          body { margin: 10px; }
          .section { break-inside: avoid; }
          .design-box { max-width: 48%; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${t("definitions.print.productDetails")}</h1>
        <p>${t("definitions.print.systemName")}</p>
        <p>${t("definitions.print.productNumber")}: ${product.id}</p>
      </div>

      <div class="section">
        <h3>${t("definitions.print.basicInfo")}</h3>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.customerName")}:</span>
          <span class="detail-value">${customerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.category")}:</span>
          <span class="detail-value">${categoryName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.item")}:</span>
          <span class="detail-value">${itemName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.sizeCaption")}:</span>
          <span class="detail-value">${product.size_caption || "-"}</span>
        </div>
      </div>

      <div class="section">
        <h3>${t("definitions.print.sizesAndDimensions")}</h3>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.widthCm")}:</span>
          <span class="detail-value">${product.width || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.leftFacingCm")}:</span>
          <span class="detail-value">${product.left_facing || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.rightFacingCm")}:</span>
          <span class="detail-value">${product.right_facing || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.thicknessMicron")}:</span>
          <span class="detail-value">${product.thickness || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.cuttingLengthCm")}:</span>
          <span class="detail-value">${product.cutting_length_cm || "-"}</span>
        </div>
      </div>

      <div class="section">
        <h3>${t("definitions.print.printingAndProduction")}</h3>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.printingCylinder")}:</span>
          <span class="detail-value">${product.printing_cylinder || t("definitions.print.noPrinting")}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.isPrinted")}:</span>
          <span class="detail-value">${product.is_printed ? t("common.yes") : t("common.no")}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.rawMaterial")}:</span>
          <span class="detail-value">${product.raw_material || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.masterBatch")}:</span>
          <span class="detail-value">
            ${
              masterBatchColor
                ? `<span class="color-box" style="background-color: ${masterBatchColor.color}; ${masterBatchColor.color === "transparent" ? "background-image: linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%); background-size: 8px 8px; background-position: 0 0, 0 4px, 4px -4px, -4px 0px;" : ""}"></span>${masterBatchColor.name_ar}`
                : product.master_batch_id || "-"
            }
          </span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.punching")}:</span>
          <span class="detail-value">${product.punching || "-"}</span>
        </div>
      </div>

      <div class="section">
        <h3>${t("definitions.print.weightAndQuantities")}</h3>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.cuttingUnit")}:</span>
          <span class="detail-value">${product.cutting_unit || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.unitWeightKg")}:</span>
          <span class="detail-value">${product.unit_weight_kg || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.quantityPerUnit")}:</span>
          <span class="detail-value">${product.unit_quantity || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.packageWeightKg")}:</span>
          <span class="detail-value">${product.package_weight_kg || "-"}</span>
        </div>
      </div>

      <div class="section">
        <h3>${t("definitions.print.designs")}</h3>
        <div class="design-container">
          <div class="design-box">
            <h4>${t("definitions.print.frontDesign")}</h4>
            <div class="design-image-wrapper">
              ${product.cliche_front_design ? `<img src="${product.cliche_front_design}" alt="${t("definitions.print.frontDesign")}" />` : `<span class="no-design">${t("definitions.print.noDesign")}</span>`}
            </div>
          </div>
          <div class="design-box">
            <h4>${t("definitions.print.backDesign")}</h4>
            <div class="design-image-wrapper">
              ${product.cliche_back_design ? `<img src="${product.cliche_back_design}" alt="${t("definitions.print.backDesign")}" />` : `<span class="no-design">${t("definitions.print.noDesign")}</span>`}
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h3>${t("definitions.print.notesAndStatus")}</h3>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.notes")}:</span>
          <span class="detail-value">${product.notes || "-"}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">${t("definitions.print.status")}:</span>
          <span class="detail-value">${product.status === "active" ? t("common.active") : t("common.inactive")}</span>
        </div>
      </div>

      <div class="print-date">
        ${t("definitions.print.printedOn")}: ${new Date().toLocaleDateString("en-US")} - ${new Date().toLocaleTimeString("en-US")}
      </div>

      <script>
        window.onload = function() {
          window.print();
          window.onafterprint = function() {
            window.close();
          };
        };
      </script>
    </body>
    </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Debounce timers for auto-calculations
  const sizeCaptionTimer = useRef<NodeJS.Timeout | null>(null);
  const packageWeightTimer = useRef<NodeJS.Timeout | null>(null);

  // Auto-set printing status based on cylinder selection (immediate, no debounce needed)
  React.useEffect(() => {
    const isPrinted = customerProductForm.printing_cylinder !== "بدون طباعة";
    setCustomerProductForm((prev) => ({
      ...prev,
      is_printed: isPrinted,
    }));
  }, [customerProductForm.printing_cylinder]);

  // Auto-generate size caption with debouncing
  React.useEffect(() => {
    if (sizeCaptionTimer.current) {
      clearTimeout(sizeCaptionTimer.current);
    }

    sizeCaptionTimer.current = setTimeout(() => {
      const { width, right_facing, left_facing, cutting_length_cm } =
        customerProductForm;
      
      const w = parseFloat(width) || 0;
      const rf = parseFloat(right_facing) || 0;
      const lf = parseFloat(left_facing) || 0;
      const cl = parseFloat(cutting_length_cm) || 0;

      // يجب أن يكون العرض والطول موجودين على الأقل
      if (w > 0 && cl > 0) {
        // بناء المقاس مع تجاهل الجوانب الفارغة أو الصفرية
        let sizeCaption = `${w}`;
        if (rf > 0) sizeCaption += `+${rf}`;
        if (lf > 0) sizeCaption += `+${lf}`;
        sizeCaption += `X${cl}`;
        
        setCustomerProductForm((prev) => ({
          ...prev,
          size_caption: sizeCaption,
        }));
      } else if (w > 0 || cl > 0) {
        // إذا كان أحدهما فقط موجود، نعرض ما هو متاح
        let sizeCaption = w > 0 ? `${w}` : "";
        if (rf > 0) sizeCaption += `+${rf}`;
        if (lf > 0) sizeCaption += `+${lf}`;
        if (cl > 0) sizeCaption += sizeCaption ? `X${cl}` : `${cl}`;
        
        if (sizeCaption) {
          setCustomerProductForm((prev) => ({
            ...prev,
            size_caption: sizeCaption,
          }));
        }
      }
    }, 300);

    return () => {
      if (sizeCaptionTimer.current) {
        clearTimeout(sizeCaptionTimer.current);
      }
    };
  }, [
    customerProductForm.width,
    customerProductForm.right_facing,
    customerProductForm.left_facing,
    customerProductForm.cutting_length_cm,
  ]);

  // Auto-calculate package weight with debouncing
  React.useEffect(() => {
    if (packageWeightTimer.current) {
      clearTimeout(packageWeightTimer.current);
    }

    packageWeightTimer.current = setTimeout(() => {
      const { unit_weight_kg, unit_quantity } = customerProductForm;
      if (unit_weight_kg && unit_quantity) {
        const unitWeight = parseFloat(unit_weight_kg);
        const quantity = parseInt(unit_quantity);

        if (unitWeight && quantity) {
          const packageWeight = unitWeight * quantity;
          setCustomerProductForm((prev) => ({
            ...prev,
            package_weight_kg: packageWeight.toFixed(3),
          }));
        }
      }
    }, 300);

    return () => {
      if (packageWeightTimer.current) {
        clearTimeout(packageWeightTimer.current);
      }
    };
  }, [customerProductForm.unit_weight_kg, customerProductForm.unit_quantity]);

  // Data queries
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ["/api/customers", { all: true }],
    queryFn: async () => {
      const response = await fetch("/api/customers?all=true");
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
    staleTime: 0,
  });
  const { data: sections = [], isLoading: sectionsLoading } = useQuery({
    queryKey: ["/api/sections"],
    staleTime: 0,
  });
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["/api/categories"],
    staleTime: 0,
  });
  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ["/api/items"],
    staleTime: 0,
  });
  const { data: customerProductsResponse, isLoading: customerProductsLoading } =
    useQuery<{ data: any[]; total: number }>({
      queryKey: ["/api/customer-products"],
      staleTime: 0,
    });
  const customerProducts = customerProductsResponse?.data || [];
  const { data: machines = [], isLoading: machinesLoading } = useQuery({
    queryKey: ["/api/machines"],
    staleTime: 0,
  });
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    staleTime: 0,
  });
  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ["/api/locations"],
    staleTime: 0,
  });
  const { data: roles = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["/api/roles"],
    staleTime: 0,
  });
  const { data: salesReps = [], isLoading: salesRepsLoading } = useQuery({
    queryKey: ["/api/users/sales-reps"],
    staleTime: 0,
  });
  
  // جلب ألوان الماستر باتش من قاعدة البيانات
  const { data: masterBatchColorsData = [], isLoading: masterBatchColorsLoading } = useQuery<any[]>({
    queryKey: ["/api/master-batch-colors"],
    staleTime: 0,
  });
  
  // تحويل بيانات الألوان لتتوافق مع الشكل المتوقع
  const masterBatchColors = React.useMemo(() => {
    return masterBatchColorsData.map((color: any) => ({
      id: color.id,
      name: color.name,
      name_ar: color.name_ar,
      color: color.color_hex,
      textColor: color.text_color,
      brand: color.brand || "-",
      aliases: color.aliases ? color.aliases.split(",") : [color.id],
      is_active: color.is_active,
    }));
  }, [masterBatchColorsData]);

  // Filter customers based on search term in customer products form
  const filteredCustomersInProducts = React.useMemo(() => {
    if (!Array.isArray(customers)) return [];

    return customers.filter((customer: any) => {
      if (!customerSearchTermInProducts) return true;

      const searchLower = customerSearchTermInProducts.toLowerCase();
      return (
        (customer.name || "").toLowerCase().includes(searchLower) ||
        (customer.name_ar || "").toLowerCase().includes(searchLower) ||
        String(customer.id || "").toLowerCase().includes(searchLower) ||
        (customer.code || "").toLowerCase().includes(searchLower)
      );
    });
  }, [customers, customerSearchTermInProducts]);

  // Parse plate_drawer_code when editing customer
  React.useEffect(() => {
    if (editingItem && selectedTab === "customers") {
      const drawerCode = editingItem.plate_drawer_code || "";
      if (drawerCode && drawerCode.includes("-")) {
        const [letter, number] = drawerCode.split("-");
        setDrawerLetter(letter || "");
        setDrawerNumber(number || "");
      } else {
        setDrawerLetter("");
        setDrawerNumber("");
      }
    } else if (!isDialogOpen) {
      // Reset when dialog closes
      setDrawerLetter("");
      setDrawerNumber("");
    }
  }, [editingItem, selectedTab, isDialogOpen]);

  // Auto-set punching, cutting_unit, and cutting_length based on category
  React.useEffect(() => {
    const { category_id } = customerProductForm;
    if (!category_id || category_id === "none") {
      setCustomerProductForm((prev) => ({
        ...prev,
        punching: "بدون",
        cutting_unit: "كيلو",
        cutting_length_cm: "",
      }));
      return;
    }

    if (Array.isArray(categories) && categories.length > 0) {
      const category = (categories as any[]).find(
        (cat: any) => cat.id === category_id,
      );
      if (category) {
        const nameAr = category.name_ar || "";
        let punching = "بدون";

        if (nameAr === "أكياس علاقي") {
          punching = "علاقي";
        } else if (nameAr === "أكياس بنانة") {
          punching = "بنانة";
        }

        const isSufra = nameAr === "سفرة بلاستيكية" || nameAr === "سفرة بلاستيكية مطوية";

        setCustomerProductForm((prev) => ({
          ...prev,
          punching,
          cutting_unit: "كيلو",
          cutting_length_cm: isSufra ? prev.cutting_length_cm : "",
        }));
      }
    }
  }, [customerProductForm.category_id, categories]);

  // Auto-calculate cutting length from printing cylinder (skip for sufra categories and "no printing" where it's manual)
  React.useEffect(() => {
    const selectedCat = Array.isArray(categories)
      ? (categories as any[]).find((c: any) => c.id === customerProductForm.category_id)
      : null;
    const catNameAr = selectedCat?.name_ar || "";
    const isSufra = catNameAr === "سفرة بلاستيكية" || catNameAr === "سفرة بلاستيكية مطوية";

    if (isSufra) return;

    if (
      customerProductForm.printing_cylinder &&
      customerProductForm.printing_cylinder !== "بدون طباعة"
    ) {
      const cylinderNumber = parseInt(
        customerProductForm.printing_cylinder.replace(/\D/g, ""),
      );
      if (cylinderNumber) {
        const calculatedLength = Math.round(cylinderNumber * 2.54);
        setCustomerProductForm((prev) => ({
          ...prev,
          cutting_length_cm: calculatedLength.toString(),
        }));
      }
    } else if (customerProductForm.printing_cylinder === "بدون طباعة") {
      setCustomerProductForm((prev) => ({
        ...prev,
        cutting_length_cm: "",
      }));
    }
  }, [customerProductForm.printing_cylinder, customerProductForm.category_id, categories]);

  // Filter helper function
  const filterData = (data: any[], searchFields: string[]) => {
    if (!Array.isArray(data)) return [];

    return data
      .filter((item) => {
        // Status filter
        const statusMatch =
          statusFilter === "all" ||
          (statusFilter === "active" &&
            (item.status === "active" || item.status === "operational")) ||
          (statusFilter === "inactive" &&
            (item.status === "inactive" ||
              item.status === "down" ||
              item.status === "maintenance"));

        // Search filter
        const searchMatch =
          !quickSearch ||
          searchFields.some((field) => {
            const value = item[field];
            if (value === null || value === undefined) return false;
            return value
              .toString()
              .toLowerCase()
              .includes(quickSearch.toLowerCase());
          });

        return statusMatch && searchMatch;
      })
      .sort((a, b) => {
        // Sort by ID (number) ascending
        const aId =
          typeof a.id === "string"
            ? parseInt(a.id.replace(/\D/g, "")) || 0
            : a.id || 0;
        const bId =
          typeof b.id === "string"
            ? parseInt(b.id.replace(/\D/g, "")) || 0
            : b.id || 0;
        return aId - bId;
      });
  };

  // Specific filter functions
  const getFilteredCustomers = () => {
    // Sort descending (newest first) for customers
    const filtered = filterData(customers as any[], [
      "name",
      "name_ar",
      "phone",
      "email",
      "address",
      "id",
    ]);
    return filtered.sort((a, b) => {
      const aId =
        typeof a.id === "string"
          ? parseInt(a.id.replace(/\D/g, "")) || 0
          : a.id || 0;
      const bId =
        typeof b.id === "string"
          ? parseInt(b.id.replace(/\D/g, "")) || 0
          : b.id || 0;
      return bId - aId; // Descending order (newest first)
    });
  };
  const getFilteredSections = () =>
    filterData(sections as any[], ["name", "name_ar", "description", "id"]);
  const getFilteredCategories = () =>
    filterData(categories as any[], ["name", "name_ar", "description", "id"]);
  const getFilteredItems = () =>
    filterData(items as any[], ["name", "name_ar", "category_id", "id"]);
  const getFilteredCustomerProducts = () => {
    const filtered = (customerProducts as any[])
      .filter((product: any) => {
        // Status filter
        const statusMatch =
          statusFilter === "all" ||
          (statusFilter === "active" && product.status === "active") ||
          (statusFilter === "inactive" && product.status === "inactive");

        // Search filter - enhanced for customer products
        const searchMatch =
          !quickSearch ||
          [
            product.size_caption,
            product.raw_material,
            product.master_batch_id,
            product.notes,
            product.id,
            // Search in related customer name
            (customers as any[]).find((c: any) => c.id === product.customer_id)
              ?.name_ar,
            (customers as any[]).find((c: any) => c.id === product.customer_id)
              ?.name,
            // Search in related item name
            (items as any[]).find((i: any) => i.id === product.item_id)
              ?.name_ar,
            (items as any[]).find((i: any) => i.id === product.item_id)?.name,
          ].some((field: any) => {
            if (field === null || field === undefined) return false;
            return field
              .toString()
              .toLowerCase()
              .includes(quickSearch.toLowerCase());
          });

        return statusMatch && searchMatch;
      })
      .sort((a: any, b: any) => {
        const aId =
          typeof a.id === "string"
            ? parseInt(a.id.replace(/\D/g, "")) || 0
            : a.id || 0;
        const bId =
          typeof b.id === "string"
            ? parseInt(b.id.replace(/\D/g, "")) || 0
            : b.id || 0;
        return bId - aId; // Descending order (newest first)
      });
    return filtered;
  };
  const getFilteredLocations = () =>
    filterData(locations as any[], ["name", "name_ar", "type", "id"]);
  const getFilteredMachines = () =>
    filterData(machines as any[], ["name", "name_ar", "type", "id"]);
  const getFilteredUsers = () =>
    filterData(users as any[], [
      "username",
      "display_name",
      "display_name_ar",
      "id",
    ]);

  const handlePrintCustomer = useCallback(async (customer: any) => {
    const rep = Array.isArray(salesReps)
      ? salesReps.find((r: any) => r.id === customer.sales_rep_id)
      : null;

    let customerProds: any[] = [];
    try {
      const response = await fetch(`/api/customer-products?customer_id=${encodeURIComponent(customer.id)}`);
      if (response.ok) {
        const result = await response.json();
        customerProds = result.data || result || [];
      }
    } catch (e) {
      console.error("Error fetching customer products for print:", e);
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const productsRows = customerProds
      .map((product: any, idx: number) => {
        const item = Array.isArray(items)
          ? items.find((i: any) => i.id === product.item_id)
          : null;
        const mbColor = masterBatchColors.find(
          (mb: any) =>
            mb.id === product.master_batch_id ||
            mb.aliases?.includes(product.master_batch_id || "")
        );
        return `<tr>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${idx + 1}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.id || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${item?.name_ar || item?.name || product.item_id || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.size_caption || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.width || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.thickness || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.raw_material || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${mbColor?.name_ar || mbColor?.name || product.master_batch_id || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.is_printed ? (product.printing_cylinder || t("common.yes")) : t("common.no")}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.cutting_length_cm ? product.cutting_length_cm + " " + t("common.cm") : "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.punching || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.cutting_unit || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.unit_weight_kg ? product.unit_weight_kg + " " + t("common.kg") : "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.unit_quantity || "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center">${product.package_weight_kg ? product.package_weight_kg + " " + t("common.kg") : "-"}</td>
          <td style="padding:8px 6px;border:1px solid #d1d5db;text-align:center;max-width:120px;word-break:break-word">${product.notes || "-"}</td>
        </tr>`;
      })
      .join("");

    printWindow.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>${t("definitions.print.customerData")} - ${customer.name_ar || customer.name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 24px; direction: rtl; color: #1f2937; background: #fff; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 3px solid #1e40af; padding-bottom: 16px; }
    .header h1 { font-size: 24px; color: #1e40af; margin-bottom: 4px; font-weight: 700; }
    .header .sub { font-size: 12px; color: #6b7280; }
    .section-title { font-size: 17px; font-weight: 700; color: #1e40af; margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #dbeafe; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; margin-bottom: 24px; }
    .info-cell { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #e5e7eb; }
    .info-cell:nth-child(odd) { border-left: 1px solid #e5e7eb; }
    .info-cell .label { font-weight: 600; color: #374151; min-width: 130px; font-size: 13px; }
    .info-cell .value { color: #111827; font-size: 13px; }
    .products-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    .products-table th { background: #1e40af; color: #fff; padding: 9px 6px; text-align: center; font-size: 10px; font-weight: 600; border: 1px solid #1e3a8a; white-space: nowrap; }
    .products-table td { padding: 8px 6px; text-align: center; border: 1px solid #d1d5db; font-size: 11px; }
    .products-table tbody tr:nth-child(even) { background: #f0f4ff; }
    .products-table tbody tr:hover { background: #dbeafe; }
    .no-products { text-align: center; padding: 40px 20px; color: #9ca3af; font-size: 15px; border: 1px dashed #d1d5db; border-radius: 8px; margin-top: 10px; }
    .footer { text-align: center; margin-top: 28px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
    .badge-count { background: #dbeafe; color: #1e40af; }
    @media print {
      body { padding: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
      .products-table th { background: #1e40af !important; color: #fff !important; }
      .products-table tbody tr:nth-child(even) { background: #f0f4ff !important; }
    }
    @page { size: landscape; margin: 10mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${t("definitions.print.customerCard")}</h1>
    <div class="sub">${customer.name_ar || customer.name} | ${t("definitions.print.code")}: ${customer.id} | ${t("definitions.print.printDate")}: ${new Date().toLocaleDateString("en-US")} - ${new Date().toLocaleTimeString("en-US")}</div>
  </div>

  <div class="section-title">${t("definitions.print.basicInfo")}</div>
  <div class="info-grid">
    <div class="info-cell"><span class="label">${t("definitions.print.customerId")}</span><span class="value">${customer.id || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.code")}</span><span class="value">${customer.code || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.nameAr")}</span><span class="value">${customer.name_ar || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.nameEn")}</span><span class="value">${customer.name || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.phone")}</span><span class="value">${customer.phone || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.city")}</span><span class="value">${customer.city || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.address")}</span><span class="value">${customer.address || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.taxNumber")}</span><span class="value">${customer.tax_number || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.plateDrawerCode")}</span><span class="value">${customer.plate_drawer_code || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.commercialName")}</span><span class="value">${customer.commercial_name || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.unifiedNumber")}</span><span class="value">${customer.unified_number || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.uniqueCustomerNumber")}</span><span class="value">${customer.unique_customer_number || "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.representative")}</span><span class="value">${rep ? (rep.display_name_ar || rep.display_name || "-") : "-"}</span></div>
    <div class="info-cell"><span class="label">${t("definitions.print.status")}</span><span class="value">${customer.is_active !== false ? t("common.active") : t("common.inactive")}</span></div>
  </div>

  <div class="section-title">${t("definitions.print.customerProducts")} <span class="badge badge-count">${customerProds.length} ${t("definitions.print.product")}</span></div>
  ${customerProds.length > 0 ? `<table class="products-table">
    <thead>
      <tr>
        <th>#</th>
        <th>${t("definitions.print.productNumber")}</th>
        <th>${t("definitions.print.item")}</th>
        <th>${t("definitions.print.sizeCaption")}</th>
        <th>${t("definitions.print.width")}</th>
        <th>${t("definitions.print.thickness")}</th>
        <th>${t("definitions.print.rawMaterial")}</th>
        <th>${t("definitions.print.masterBatch")}</th>
        <th>${t("definitions.print.printing")}</th>
        <th>${t("definitions.print.cuttingLength")}</th>
        <th>${t("definitions.print.punching")}</th>
        <th>${t("definitions.print.unit")}</th>
        <th>${t("definitions.print.unitWeight")}</th>
        <th>${t("definitions.print.quantity")}</th>
        <th>${t("definitions.print.packageWeight")}</th>
        <th>${t("definitions.print.notes")}</th>
      </tr>
    </thead>
    <tbody>${productsRows}</tbody>
  </table>` : `<div class="no-products">${t("definitions.print.noProducts")}</div>`}

  <div class="footer">${t("definitions.print.printedFromSystem")}</div>
</body>
</html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }, [salesReps, items, masterBatchColors]);

  // Pagination component
  const PaginationComponent = ({
    currentPage,
    totalPages,
    onPageChange,
    totalItems,
    itemsPerPage,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems: number;
    itemsPerPage: number;
  }) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex flex-1 justify-between sm:hidden">
          <Button
            variant="outline"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            {t("definitions.previous")}
          </Button>
          <Button
            variant="outline"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            {t("definitions.next")}
          </Button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              {t("definitions.showing")} <span className="font-medium">{startItem}</span> {t("definitions.to")}{" "}
              <span className="font-medium">{endItem}</span> {t("definitions.of")}{" "}
              <span className="font-medium">{totalItems}</span> {t("definitions.results")}
            </p>
          </div>
          <div>
            <nav
              className="inline-flex -space-x-px rounded-md shadow-sm"
              aria-label="Pagination"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="rounded-l-md"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  );
                })
                .map((page, index, array) => {
                  const showEllipsis =
                    index > 0 && array[index - 1] !== page - 1;
                  return (
                    <div key={page}>
                      {showEllipsis && (
                        <span className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700">
                          ...
                        </span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className="min-w-[40px]"
                      >
                        {page}
                      </Button>
                    </div>
                  );
                })}

              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="rounded-r-md"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  // All mutations for different entities

  // Customer mutations
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/customers", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.customerCreated") });
    },
    onError: (error: any) => {
      console.error("Error creating customer:", error);
      toast({ title: t("definitions.messages.customerCreateError"), variant: "destructive" });
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/customers/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.customerUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating customer:", error);
      toast({ title: t("definitions.messages.customerUpdateError"), variant: "destructive" });
    },
  });

  // Section mutations
  const createSectionMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/sections", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.sectionCreated") });
    },
    onError: (error: any) => {
      console.error("Error creating section:", error);
      toast({ title: t("definitions.messages.sectionCreateError"), variant: "destructive" });
    },
  });

  const updateSectionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/sections/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sections"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.sectionUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating section:", error);
      toast({ title: t("definitions.messages.sectionUpdateError"), variant: "destructive" });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/categories", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.categoryCreated") });
    },
    onError: (error: any) => {
      console.error("Error creating category:", error);
      toast({ title: t("definitions.messages.categoryCreateError"), variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/categories/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.categoryUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating category:", error);
      toast({ title: t("definitions.messages.categoryUpdateError"), variant: "destructive" });
    },
  });

  // Item mutations
  const createItemMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/items", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to create item");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.itemCreated") });
    },
    onError: (error: any) => {
      console.error("Error creating item:", error);
      toast({ title: t("definitions.messages.itemCreateError"), variant: "destructive" });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/items/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to update item");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.itemUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating item:", error);
      toast({ title: t("definitions.messages.itemUpdateError"), variant: "destructive" });
    },
  });

  // Customer Product mutations
  const createCustomerProductMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/customer-products", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to create customer product");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-products"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.customerProductCreated") });
    },
    onError: (error: any) => {
      console.error("Error creating customer product:", error);
      toast({ title: t("definitions.messages.customerProductCreateError"), variant: "destructive" });
    },
  });

  const updateCustomerProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/customer-products/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to update customer product");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-products"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.customerProductUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating customer product:", error);
      toast({ title: t("definitions.messages.customerProductUpdateError"), variant: "destructive" });
    },
  });

  // Delete Customer Product Mutation
  const deleteCustomerProductMutation = useMutation({
    mutationFn: (id: string) => {
      return fetch(`/api/customer-products/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to delete");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer-products"] });
      toast({ title: t("definitions.messages.customerProductDeleted") });
    },
    onError: (error: any) => {
      console.error("Error deleting customer product:", error);
      toast({ title: t("definitions.messages.customerProductDeleteError"), variant: "destructive" });
    },
  });

  // Delete Customer Mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (id: number) => {
      return fetch(`/api/customers/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to delete");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: t("definitions.messages.customerDeleted") });
    },
    onError: (error: any) => {
      console.error("Error deleting customer:", error);
      toast({ title: t("definitions.messages.customerDeleteFailed"), variant: "destructive" });
    },
  });

  // Location mutations
  const createLocationMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/locations", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.locationCreated") });
    },
    onError: (error: any) => {
      console.error("Error creating location:", error);
      toast({ title: t("definitions.messages.locationCreateError"), variant: "destructive" });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/locations/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.locationUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating location:", error);
      toast({ title: t("definitions.messages.locationUpdateError"), variant: "destructive" });
    },
  });

  // Machine mutations
  const createMachineMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/machines", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.machineCreated") });
    },
    onError: (error: any) => {
      console.error("Error creating machine:", error);
      toast({ title: t("definitions.messages.machineCreateError"), variant: "destructive" });
    },
  });

  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/machines/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/machines"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.machineUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating machine:", error);
      toast({ title: t("definitions.messages.machineUpdateError"), variant: "destructive" });
    },
  });

  // User mutations
  const createUserMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.userCreated") });
    },
    onError: (error: any) => {
      console.error("Error creating user:", error);
      toast({ title: t("definitions.messages.userCreateError"), variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.userUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating user:", error);
      toast({ title: t("definitions.messages.userUpdateError"), variant: "destructive" });
    },
  });

  // Master batch color mutations
  const createMasterBatchColorMutation = useMutation({
    mutationFn: (data: any) => {
      return fetch("/api/master-batch-colors", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to create color");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-batch-colors"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.colorAdded") });
    },
    onError: (error: any) => {
      console.error("Error creating master batch color:", error);
      toast({ title: t("definitions.messages.colorAddError"), variant: "destructive" });
    },
  });

  const updateMasterBatchColorMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      return fetch(`/api/master-batch-colors/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to update color");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-batch-colors"] });
      resetForm();
      setIsDialogOpen(false);
      toast({ title: t("definitions.messages.colorUpdated") });
    },
    onError: (error: any) => {
      console.error("Error updating master batch color:", error);
      toast({ title: t("definitions.messages.colorUpdateError"), variant: "destructive" });
    },
  });

  const deleteMasterBatchColorMutation = useMutation({
    mutationFn: (id: string) => {
      return fetch(`/api/master-batch-colors/${id}`, {
        method: "DELETE",
      }).then((res) => {
        if (!res.ok) throw new Error("Failed to delete color");
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/master-batch-colors"] });
      toast({ title: t("definitions.messages.colorDeleted") });
    },
    onError: (error: any) => {
      console.error("Error deleting master batch color:", error);
      toast({ title: t("definitions.messages.colorDeleteError"), variant: "destructive" });
    },
  });

  // Event handlers
  const resetForm = () => {
    setDrawerLetter("");
    setDrawerNumber("");
    setCustomerForm({
      name: "",
      name_ar: "",
      code: "",
      user_id: "",
      plate_drawer_code: "",
      city: "",
      address: "",
      tax_number: "",
      phone: "",
      sales_rep_id: "",
    });
    setSectionForm({ name: "", name_ar: "", description: "" });
    setCategoryForm({
      name: "",
      name_ar: "",
      code: "",
      parent_id: "none",
      description: "",
      status: "active",
    });
    setItemForm({
      name: "",
      name_ar: "",
      code: "",
      category_id: "none",
      status: "active",
    });
    setCustomerProductForm({
      customer_id: "none",
      category_id: "none",
      item_id: "none",
      size_caption: "",
      width: "",
      left_facing: "",
      right_facing: "",
      thickness: "",
      printing_cylinder: "بدون طباعة",
      cutting_length_cm: "",
      raw_material: "",
      master_batch_id: "",
      is_printed: false,
      cutting_unit: "كيلو",
      punching: "",
      unit_weight_kg: "",
      unit_quantity: "",
      package_weight_kg: "",
      cliche_front_design: "",
      cliche_back_design: "",
      front_design_filename: "",
      back_design_filename: "",
      notes: "",
      status: "active",
    });
    setLocationForm({
      name: "",
      name_ar: "",
      type: "city",
      parent_id: "",
      coordinates: "",
      status: "active",
    });
    setMachineForm({
      name: "",
      name_ar: "",
      type: "extruder",
      section_id: "none",
      status: "active",
      capacity_small_kg_per_hour: "",
      capacity_medium_kg_per_hour: "",
      capacity_large_kg_per_hour: "",
    });
    setUserForm({
      username: "",
      display_name: "",
      display_name_ar: "",
      password: "",
      phone: "",
      role_id: "none",
      section_id: "none",
      status: "active",
    });
    setMasterBatchColorForm({
      id: "",
      name: "",
      name_ar: "",
      color_hex: "#000000",
      text_color: "#ffffff",
      brand: "",
      aliases: "",
      is_active: true,
      sort_order: 0,
    });
    setEditingItem(null);
  };

  return (
    <PageLayout title={t("definitions.title")}>
      <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder={t("definitions.search")}
                    value={quickSearch}
                    onChange={(e) => setQuickSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder={t("definitions.allStatuses")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("definitions.allStatuses")}</SelectItem>
                      <SelectItem value="active">{t("definitions.active")}</SelectItem>
                      <SelectItem value="inactive">{t("definitions.inactive")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="w-full">
              <Tabs
                value={selectedTab}
                onValueChange={setSelectedTab}
                className="space-y-4 w-full"
              >
                <TabsList
                  className="grid grid-cols-4 lg:grid-cols-8 w-full h-auto p-1 bg-white rounded-lg border border-gray-200 shadow-sm gap-1"
                  dir="rtl"
                >
                  <TabsTrigger
                    value="customers"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 
                             text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium
                             transition-all duration-200 rounded-md min-w-0 flex-1"
                  >
                    {t("definitions.tabs.customers")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="sections"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 
                             text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium
                             transition-all duration-200 rounded-md min-w-0 flex-1"
                  >
                    {t("definitions.tabs.sections")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="categories"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 
                             text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium
                             transition-all duration-200 rounded-md min-w-0 flex-1"
                  >
                    {t("definitions.tabs.categories")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="items"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 
                             text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium
                             transition-all duration-200 rounded-md min-w-0 flex-1"
                  >
                    {t("definitions.tabs.items")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="customer-products"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 
                             text-gray-600 hover:text-blue-600 px-2 py-2 text-xs font-medium
                             transition-all duration-200 rounded-md min-w-0 flex-1"
                  >
                    {t("definitions.tabs.customerProducts")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="machines"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 
                             text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium
                             transition-all duration-200 rounded-md min-w-0 flex-1"
                  >
                    {t("definitions.tabs.machines")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="users"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 
                             text-gray-600 hover:text-blue-600 px-3 py-2 text-sm font-medium
                             transition-all duration-200 rounded-md min-w-0 flex-1"
                  >
                    {t("definitions.tabs.users")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="master-batch-colors"
                    className="data-[state=active]:bg-white data-[state=active]:text-blue-600 
                             text-gray-600 hover:text-blue-600 px-2 py-2 text-xs font-medium
                             transition-all duration-200 rounded-md min-w-0 flex-1"
                  >
                    {t("definitions.tabs.masterBatchColors")}
                  </TabsTrigger>
                </TabsList>

                {/* Customers Tab */}
                <TabsContent value="customers" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="w-5 h-5" />
                          {t("definitions.customers.title")}
                        </CardTitle>
                        <Button
                          onClick={() => {
                            resetForm();
                            setSelectedTab("customers");
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("definitions.customers.addNew")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {customersLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.loading")}
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Mobile Card View */}
                          <div className="md:hidden space-y-3">
                            {(() => {
                              const filteredCustomers = getFilteredCustomers();
                              const paginatedCustomers = paginateData(filteredCustomers, currentPages.customers);
                              return paginatedCustomers.length > 0 ? (
                                paginatedCustomers.map((customer: any) => {
                                  const rep = Array.isArray(salesReps) ? salesReps.find((r: any) => r.id === customer.sales_rep_id) : null;
                                  return (
                                    <div key={customer.id} className="bg-white border rounded-lg p-4 shadow-sm">
                                      <div className="flex justify-between items-start mb-3">
                                        <div>
                                          <div className="font-bold text-lg">{customer.name_ar || customer.name}</div>
                                          <div className="text-sm text-gray-500">#{customer.id}</div>
                                        </div>
                                        <div className="flex gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600"
                                            onClick={() => handlePrintCustomer(customer)}
                                          >
                                            <Printer className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingItem(customer);
                                              setCustomerForm({
                                                name: customer.name || "",
                                                name_ar: customer.name_ar || "",
                                                code: customer.code || "",
                                                user_id: customer.user_id || "",
                                                plate_drawer_code: customer.plate_drawer_code || "",
                                                city: customer.city || "",
                                                address: customer.address || "",
                                                tax_number: customer.tax_number || "",
                                                phone: customer.phone || "",
                                                sales_rep_id: customer.sales_rep_id || "",
                                              });
                                              setSelectedTab("customers");
                                              setIsDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600"
                                            disabled={deleteCustomerMutation.isPending}
                                            onClick={() => {
                                              if (confirm(t("definitions.messages.confirmDeleteCustomer", { name: customer.name_ar || customer.name }))) {
                                                deleteCustomerMutation.mutate(customer.id);
                                              }
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-gray-500">{t("definitions.print.phone")}:</span> {customer.phone || "-"}</div>
                                        <div><span className="text-gray-500">{t("definitions.print.representative")}:</span> {rep ? (rep.display_name_ar || rep.display_name) : "-"}</div>
                                        <div><span className="text-gray-500">{t("definitions.print.plateDrawerCode")}:</span> {customer.plate_drawer_code || "-"}</div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="text-center py-8 text-gray-500">
                                  {quickSearch || statusFilter !== "all" ? t("definitions.noFilterResults") : t("common.noData")}
                                </div>
                              );
                            })()}
                          </div>

                          {/* Desktop Table View */}
                          <div className="hidden md:block overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.customers.code")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.customers.nameAr")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.customers.name")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.customers.plateDrawerCode")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.customers.phone")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.representative")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.customers.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(() => {
                                const filteredCustomers =
                                  getFilteredCustomers();
                                const paginatedCustomers = paginateData(
                                  filteredCustomers,
                                  currentPages.customers,
                                );
                                return paginatedCustomers.length > 0 ? (
                                  paginatedCustomers.map((customer: any) => (
                                    <tr
                                      key={customer.id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                        {customer.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {customer.name_ar || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {customer.name || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {customer.plate_drawer_code || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {customer.phone || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {(() => {
                                          if (!Array.isArray(salesReps)) return "-";
                                          const rep = salesReps.find((r: any) => r.id === customer.sales_rep_id);
                                          return rep ? (rep.display_name_ar || rep.display_name || "-") : "-";
                                        })()}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => handlePrintCustomer(customer)}
                                            title={t("definitions.print.customerData")}
                                          >
                                            <Printer className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingItem(customer);
                                              setCustomerForm({
                                                name: customer.name || "",
                                                name_ar: customer.name_ar || "",
                                                code: customer.code || "",
                                                user_id: customer.user_id || "",
                                                plate_drawer_code:
                                                  customer.plate_drawer_code ||
                                                  "",
                                                city: customer.city || "",
                                                address: customer.address || "",
                                                tax_number:
                                                  customer.tax_number || "",
                                                phone: customer.phone || "",
                                                sales_rep_id:
                                                  customer.sales_rep_id || "",
                                              });
                                              setSelectedTab("customers");
                                              setIsDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            disabled={deleteCustomerMutation.isPending}
                                            onClick={() => {
                                              if (confirm(t("definitions.messages.confirmDeleteCustomer", { name: customer.name_ar || customer.name }))) {
                                                deleteCustomerMutation.mutate(customer.id);
                                              }
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4" />
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
                                      {quickSearch || statusFilter !== "all"
                                        ? t("definitions.noFilterResults")
                                        : t("common.noData")}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                          {(() => {
                            const filteredCustomers = getFilteredCustomers();
                            const totalPages = getTotalPages(
                              filteredCustomers.length,
                            );
                            if (totalPages > 1) {
                              return (
                                <PaginationComponent
                                  currentPage={currentPages.customers}
                                  totalPages={totalPages}
                                  onPageChange={(page) =>
                                    updatePage("customers", page)
                                  }
                                  totalItems={filteredCustomers.length}
                                  itemsPerPage={itemsPerPage}
                                />
                              );
                            }
                            return null;
                          })()}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Categories Tab */}
                <TabsContent value="categories" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          {t("definitions.categories.title")}
                        </CardTitle>
                        <Button
                          onClick={() => {
                            resetForm();
                            setSelectedTab("categories");
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("definitions.categories.addNew")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {categoriesLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.loading")}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.id")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameAr")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameEn")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.code")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(() => {
                                const filteredCategories =
                                  getFilteredCategories();
                                const paginatedCategories = paginateData(
                                  filteredCategories,
                                  currentPages.categories,
                                );
                                return paginatedCategories.length > 0 ? (
                                  paginatedCategories.map((category: any) => (
                                    <tr
                                      key={category.id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                        {category.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {category.name_ar || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {category.name || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {category.code || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingItem(category);
                                              setCategoryForm({
                                                name: category.name || "",
                                                name_ar: category.name_ar || "",
                                                code: category.code || "",
                                                parent_id:
                                                  category.parent_id || "none",
                                                description:
                                                  category.description || "",
                                                status:
                                                  category.status || "active",
                                              });
                                              setIsDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="px-6 py-4 text-center text-gray-500"
                                    >
                                      {quickSearch || statusFilter !== "all"
                                        ? t("definitions.noFilterResults")
                                        : t("common.noData")}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                          {(() => {
                            const filteredCategories = getFilteredCategories();
                            const totalPages = getTotalPages(
                              filteredCategories.length,
                            );
                            if (totalPages > 1) {
                              return (
                                <PaginationComponent
                                  currentPage={currentPages.categories}
                                  totalPages={totalPages}
                                  onPageChange={(page) =>
                                    updatePage("categories", page)
                                  }
                                  totalItems={filteredCategories.length}
                                  itemsPerPage={itemsPerPage}
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Sections Tab */}
                <TabsContent value="sections" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Cog className="w-5 h-5" />
                          {t("definitions.sections.title")}
                        </CardTitle>
                        <Button
                          onClick={() => {
                            resetForm();
                            setSelectedTab("sections");
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("definitions.sections.addNew")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sectionsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.loading")}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.id")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameAr")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameEn")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.description")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(() => {
                                const filteredSections = getFilteredSections();
                                const paginatedSections = paginateData(
                                  filteredSections,
                                  currentPages.sections,
                                );
                                return paginatedSections.length > 0 ? (
                                  paginatedSections.map((section: any) => (
                                    <tr
                                      key={section.id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                        {section.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {section.name_ar || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {section.name || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {section.description || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingItem(section);
                                              setSectionForm({
                                                name: section.name || "",
                                                name_ar: section.name_ar || "",
                                                description:
                                                  section.description || "",
                                              });
                                              setSelectedTab("sections");
                                              setIsDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      {t("definitions.noSearchResults")}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                          {(() => {
                            const filteredSections = getFilteredSections();
                            const totalPages = getTotalPages(
                              filteredSections.length,
                            );
                            if (totalPages > 1) {
                              return (
                                <PaginationComponent
                                  currentPage={currentPages.sections}
                                  totalPages={totalPages}
                                  onPageChange={(page) =>
                                    updatePage("sections", page)
                                  }
                                  totalItems={filteredSections.length}
                                  itemsPerPage={itemsPerPage}
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Items Tab */}
                <TabsContent value="items" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          {t("definitions.items.title")}
                        </CardTitle>
                        <Button
                          onClick={() => {
                            resetForm();
                            setSelectedTab("items");
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("definitions.items.addNew")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {itemsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.loading")}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.id")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameAr")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameEn")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.category")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(() => {
                                const filteredItems = getFilteredItems();
                                const paginatedItems = paginateData(
                                  filteredItems,
                                  currentPages.items,
                                );
                                return paginatedItems.length > 0 ? (
                                  paginatedItems.map((item: any) => (
                                    <tr
                                      key={item.id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                        {item.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {item.name_ar || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {item.name || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {item.category_id || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingItem(item);
                                              setItemForm({
                                                name: item.name || "",
                                                name_ar: item.name_ar || "",
                                                code: item.code || "",
                                                category_id:
                                                  item.category_id || "none",
                                                status: item.status || "active",
                                              });
                                              setSelectedTab("items");
                                              setIsDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      {t("definitions.noSearchResults")}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                          {(() => {
                            const filteredItems = getFilteredItems();
                            const totalPages = getTotalPages(
                              filteredItems.length,
                            );
                            if (totalPages > 1) {
                              return (
                                <PaginationComponent
                                  currentPage={currentPages.items}
                                  totalPages={totalPages}
                                  onPageChange={(page) =>
                                    updatePage("items", page)
                                  }
                                  totalItems={filteredItems.length}
                                  itemsPerPage={itemsPerPage}
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Customer Products Tab */}
                <TabsContent value="customer-products" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          {t("definitions.customerProducts.title")}
                        </CardTitle>
                        <Button
                          onClick={() => {
                            resetForm();
                            setSelectedTab("customer-products");
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("definitions.customerProducts.addNew")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {customerProductsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.loading")}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.id")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.customerName")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.item")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.sizeCaption")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.printingCutting")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.rawMaterial")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.masterBatch")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.punching")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.unit")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.print.packageWeight")}
                                </th>
                                <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(() => {
                                const filteredCustomerProducts =
                                  getFilteredCustomerProducts();
                                const paginatedCustomerProducts = paginateData(
                                  filteredCustomerProducts,
                                  currentPages.customerProducts,
                                );
                                return paginatedCustomerProducts.length > 0 ? (
                                  paginatedCustomerProducts.map(
                                    (product: any) => {
                                      // Find customer details
                                      const customer = Array.isArray(customers)
                                        ? customers.find(
                                            (c: any) =>
                                              c.id === product.customer_id,
                                          )
                                        : null;
                                      // Find item details
                                      const item = Array.isArray(items)
                                        ? items.find(
                                            (i: any) =>
                                              i.id === product.item_id,
                                          )
                                        : null;

                                      return (
                                        <tr
                                          key={product.id}
                                          className="hover:bg-gray-50"
                                        >
                                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                            {product.id}
                                          </td>
                                          <td className="px-3 py-4 text-sm text-gray-900 text-center">
                                            <div className="flex flex-col items-center">
                                              <span className="font-medium">
                                                {customer?.name_ar ||
                                                  customer?.name ||
                                                  "-"}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                {customer?.name || "-"}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {item?.name_ar || item?.name || "-"}
                                          </td>
                                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {product.size_caption || "-"}
                                          </td>
                                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {product.is_printed
                                              ? product.printing_cylinder ||
                                                "بدون طباعة"
                                              : product.cutting_length_cm
                                                ? `${formatNumber(parseFloat(product.cutting_length_cm))} ${t("common.cm")}`
                                                : "-"}
                                          </td>
                                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {product.raw_material || "-"}
                                          </td>
                                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {(() => {
                                              if (!product.master_batch_id) return "-";
                                              if (masterBatchColorsLoading || masterBatchColors.length === 0) {
                                                return <span className="text-gray-500">{product.master_batch_id}</span>;
                                              }
                                              const masterBatchColor =
                                                masterBatchColors.find(
                                                  (mb) =>
                                                    mb.id === product.master_batch_id ||
                                                    mb.aliases?.includes(product.master_batch_id || ""),
                                                );
                                              return masterBatchColor ? (
                                                <div className="flex flex-col items-center gap-1">
                                                  <div
                                                    className="w-6 h-6 rounded border border-gray-300 shadow-sm"
                                                    style={{
                                                      backgroundColor:
                                                        masterBatchColor.color || "#E0E0E0",
                                                    }}
                                                    title={masterBatchColor.name}
                                                  ></div>
                                                  <span className="text-[10px] font-medium text-gray-600 leading-tight">
                                                    {masterBatchColor.id}
                                                  </span>
                                                </div>
                                              ) : (
                                                <span className="text-gray-500">{product.master_batch_id}</span>
                                              );
                                            })()}
                                          </td>
                                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {product.punching || "-"}
                                          </td>
                                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {product.cutting_unit || "-"}
                                          </td>
                                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                                            {product.package_weight_kg
                                              ? `${formatNumber(parseFloat(product.package_weight_kg))} ${t("common.kg")}`
                                              : "-"}
                                          </td>
                                          <td className="px-2 py-3 text-sm font-medium text-center">
                                            <div className="grid grid-cols-2 gap-1 w-fit mx-auto">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() => {
                                                  setEditingItem(product);
                                                  setCustomerProductForm({
                                                    customer_id:
                                                      product.customer_id ||
                                                      "none",
                                                    category_id:
                                                      product.category_id ||
                                                      "none",
                                                    item_id:
                                                      product.item_id || "none",
                                                    size_caption:
                                                      product.size_caption ||
                                                      "",
                                                    width: product.width || "",
                                                    left_facing:
                                                      product.left_facing || "",
                                                    right_facing:
                                                      product.right_facing ||
                                                      "",
                                                    thickness:
                                                      product.thickness || "",
                                                    printing_cylinder:
                                                      product.printing_cylinder ||
                                                      "بدون طباعة",
                                                    cutting_length_cm:
                                                      product.cutting_length_cm ||
                                                      "",
                                                    raw_material:
                                                      product.raw_material ||
                                                      "",
                                                    master_batch_id:
                                                      product.master_batch_id ||
                                                      "",
                                                    is_printed:
                                                      product.is_printed ||
                                                      false,
                                                    cutting_unit:
                                                      product.cutting_unit ||
                                                      "",
                                                    punching:
                                                      product.punching || "",
                                                    unit_weight_kg:
                                                      product.unit_weight_kg ||
                                                      "",
                                                    unit_quantity:
                                                      product.unit_quantity ||
                                                      "",
                                                    package_weight_kg:
                                                      product.package_weight_kg ||
                                                      "",
                                                    cliche_front_design:
                                                      product.cliche_front_design ||
                                                      "",
                                                    cliche_back_design:
                                                      product.cliche_back_design ||
                                                      "",
                                                    front_design_filename: "",
                                                    back_design_filename: "",
                                                    notes: product.notes || "",
                                                    status:
                                                      product.status ||
                                                      "active",
                                                  });
                                                  setSelectedTab(
                                                    "customer-products",
                                                  );
                                                  setIsDialogOpen(true);
                                                }}
                                                title={t("definitions.table.update")}
                                              >
                                                <Edit className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                onClick={() =>
                                                  handleCloneCustomerProduct(
                                                    product,
                                                  )
                                                }
                                                title={t("definitions.table.clone")}
                                              >
                                                <Copy className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                onClick={() =>
                                                  handlePrintCustomerProduct(
                                                    product,
                                                  )
                                                }
                                                title={t("definitions.table.print")}
                                              >
                                                <Printer className="w-3 h-3" />
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={() =>
                                                  handleDeleteCustomerProduct(
                                                    product,
                                                  )
                                                }
                                                title={t("definitions.table.delete")}
                                                disabled={
                                                  deleteCustomerProductMutation.isPending
                                                }
                                              >
                                                {deleteCustomerProductMutation.isPending ? (
                                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                                                ) : (
                                                  <Trash2 className="w-3 h-3" />
                                                )}
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={11}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      {t("definitions.noSearchResults")}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                          {(() => {
                            const filteredCustomerProducts =
                              getFilteredCustomerProducts();
                            const totalPages = getTotalPages(
                              filteredCustomerProducts.length,
                            );
                            if (totalPages > 1) {
                              return (
                                <PaginationComponent
                                  currentPage={currentPages.customerProducts}
                                  totalPages={totalPages}
                                  onPageChange={(page) =>
                                    updatePage("customerProducts", page)
                                  }
                                  totalItems={filteredCustomerProducts.length}
                                  itemsPerPage={itemsPerPage}
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Machines Tab */}
                <TabsContent value="machines" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          {t("definitions.machines.title")}
                        </CardTitle>
                        <Button
                          onClick={() => {
                            resetForm();
                            setSelectedTab("machines");
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("definitions.machines.addNew")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {machinesLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.loading")}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.id")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameAr")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameEn")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.type")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.active")}
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.capacitySmall")}
                                  <br />
                                  <span className="text-[10px] font-normal">({t("common.kgPerHour")})</span>
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.capacityMedium")}
                                  <br />
                                  <span className="text-[10px] font-normal">({t("common.kgPerHour")})</span>
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.capacityLarge")}
                                  <br />
                                  <span className="text-[10px] font-normal">({t("common.kgPerHour")})</span>
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(() => {
                                const filteredMachines = getFilteredMachines();
                                const paginatedMachines = paginateData(
                                  filteredMachines,
                                  currentPages.machines,
                                );
                                return paginatedMachines.length > 0 ? (
                                  paginatedMachines.map((machine: any) => (
                                    <tr
                                      key={machine.id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                        {machine.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {machine.name_ar || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {machine.name || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {machine.type || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-center" data-testid={`text-status-${machine.id}`}>
                                        <Badge 
                                          variant={machine.status === "active" ? "default" : "secondary"}
                                          className={machine.status === "active" ? "bg-green-500 hover:bg-green-600" : "bg-gray-500 hover:bg-gray-600"}
                                        >
                                          {machine.status === "active" ? t("common.active") : machine.status === "maintenance" ? t("definitions.table.maintenance") : t("definitions.table.stopped")}
                                        </Badge>
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center" data-testid={`text-capacity-small-${machine.id}`}>
                                        {machine.capacity_small_kg_per_hour ? formatNumber(parseFloat(machine.capacity_small_kg_per_hour)) : "-"}
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center" data-testid={`text-capacity-medium-${machine.id}`}>
                                        {machine.capacity_medium_kg_per_hour ? formatNumber(parseFloat(machine.capacity_medium_kg_per_hour)) : "-"}
                                      </td>
                                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-center" data-testid={`text-capacity-large-${machine.id}`}>
                                        {machine.capacity_large_kg_per_hour ? formatNumber(parseFloat(machine.capacity_large_kg_per_hour)) : "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingItem(machine);
                                              setMachineForm({
                                                name: machine.name || "",
                                                name_ar: machine.name_ar || "",
                                                type:
                                                  machine.type || "extruder",
                                                section_id:
                                                  machine.section_id || "",
                                                status:
                                                  machine.status || "active",
                                                capacity_small_kg_per_hour: machine.capacity_small_kg_per_hour || "",
                                                capacity_medium_kg_per_hour: machine.capacity_medium_kg_per_hour || "",
                                                capacity_large_kg_per_hour: machine.capacity_large_kg_per_hour || "",
                                              });
                                              setSelectedTab("machines");
                                              setIsDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={9}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      {t("definitions.noSearchResults")}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                          {(() => {
                            const filteredMachines = getFilteredMachines();
                            const totalPages = getTotalPages(
                              filteredMachines.length,
                            );
                            if (totalPages > 1) {
                              return (
                                <PaginationComponent
                                  currentPage={currentPages.machines}
                                  totalPages={totalPages}
                                  onPageChange={(page) =>
                                    updatePage("machines", page)
                                  }
                                  totalItems={filteredMachines.length}
                                  itemsPerPage={itemsPerPage}
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          {t("definitions.users.title")}
                        </CardTitle>
                        <Button
                          onClick={() => {
                            resetForm();
                            setSelectedTab("users");
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("definitions.users.addNew")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {usersLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.loading")}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.id")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.username")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.name")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.section")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.role")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {(() => {
                                const filteredUsers = getFilteredUsers();
                                const paginatedUsers = paginateData(
                                  filteredUsers,
                                  currentPages.users,
                                );
                                return paginatedUsers.length > 0 ? (
                                  paginatedUsers.map((user: any) => (
                                    <tr
                                      key={user.id}
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                        {user.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {user.username || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {user.display_name || user.name || "-"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {(() => {
                                          if (!user.section_id) return "-";
                                          // Map numeric section_id to section string ID
                                          const sectionMapping: {
                                            [key: number]: string;
                                          } = {
                                            1: "SEC01",
                                            2: "SEC02",
                                            3: "SEC03",
                                            4: "SEC04",
                                            5: "SEC05",
                                            6: "SEC06",
                                            7: "SEC07",
                                          };
                                          const sectionId =
                                            sectionMapping[user.section_id];
                                          const section =
                                            Array.isArray(sections) &&
                                            sections.find(
                                              (s: any) => s.id === sectionId,
                                            );
                                          return section
                                            ? section.name_ar || section.name
                                            : `${t("definitions.table.section")} ${user.section_id}`;
                                        })()}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                        {(() => {
                                          if (!user.role_id) return "-";
                                          const role =
                                            Array.isArray(roles) &&
                                            roles.find(
                                              (r: any) => r.id === user.role_id,
                                            );
                                          return role
                                            ? role.name_ar || role.name
                                            : "-";
                                        })()}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              setEditingItem(user);
                                              setUserForm({
                                                username: user.username || "",
                                                display_name:
                                                  user.display_name || "",
                                                display_name_ar:
                                                  user.display_name_ar || "",
                                                password: "",
                                                phone: user.phone || "",
                                                role_id: user.role_id
                                                  ? `ROLE${String(user.role_id).padStart(2, '0')}`
                                                  : "none",
                                                section_id: (() => {
                                                  if (!user.section_id)
                                                    return "none";
                                                  const sectionMapping: {
                                                    [key: number]: string;
                                                  } = {
                                                    1: "SEC01",
                                                    2: "SEC02",
                                                    3: "SEC03",
                                                    4: "SEC04",
                                                    5: "SEC05",
                                                    6: "SEC06",
                                                    7: "SEC07",
                                                  };
                                                  return (
                                                    sectionMapping[
                                                      user.section_id
                                                    ] || "none"
                                                  );
                                                })(),
                                                status: user.status || "active",
                                              });
                                              setSelectedTab("users");
                                              setShowPassword(false);
                                              setIsDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td
                                      colSpan={5}
                                      className="px-6 py-8 text-center text-gray-500"
                                    >
                                      {t("definitions.noSearchResults")}
                                    </td>
                                  </tr>
                                );
                              })()}
                            </tbody>
                          </table>
                          {(() => {
                            const filteredUsers = getFilteredUsers();
                            const totalPages = getTotalPages(
                              filteredUsers.length,
                            );
                            if (totalPages > 1) {
                              return (
                                <PaginationComponent
                                  currentPage={currentPages.users}
                                  totalPages={totalPages}
                                  onPageChange={(page) =>
                                    updatePage("users", page)
                                  }
                                  totalItems={filteredUsers.length}
                                  itemsPerPage={itemsPerPage}
                                />
                              );
                            }
                            return null;
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Master Batch Colors Tab */}
                <TabsContent value="master-batch-colors" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          {t("definitions.masterBatch.title")}
                        </CardTitle>
                        <Button
                          onClick={() => {
                            resetForm();
                            setSelectedTab("master-batch-colors");
                            setIsDialogOpen(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {t("definitions.masterBatch.addNew")}
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {masterBatchColorsLoading ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {t("common.loading")}
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.code")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.masterBatch.color")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameAr")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.nameEn")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.masterBatch.supplier")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.masterBatch.status")}
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                  {t("definitions.table.actions")}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {masterBatchColorsData.length > 0 ? (
                                masterBatchColorsData
                                  .filter((color: any) => {
                                    if (!quickSearch) return true;
                                    const searchLower = quickSearch.toLowerCase();
                                    return (
                                      (color.id || "").toLowerCase().includes(searchLower) ||
                                      (color.name || "").toLowerCase().includes(searchLower) ||
                                      (color.name_ar || "").toLowerCase().includes(searchLower) ||
                                      (color.brand || "").toLowerCase().includes(searchLower)
                                    );
                                  })
                                  .filter((color: any) => {
                                    if (statusFilter === "all") return true;
                                    return statusFilter === "active" ? color.is_active : !color.is_active;
                                  })
                                  .map((color: any) => (
                                    <tr key={color.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 text-center text-sm font-medium text-gray-900">
                                        {color.id}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center">
                                          <div
                                            className="w-8 h-8 rounded-full border-2 shadow-sm"
                                            style={{
                                              backgroundColor: color.color_hex,
                                              borderColor: color.color_hex === "#ffffff" ? "#e5e7eb" : color.color_hex,
                                            }}
                                          />
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-center text-sm text-gray-900">
                                        {color.name_ar}
                                      </td>
                                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                                        {color.name}
                                      </td>
                                      <td className="px-6 py-4 text-center text-sm text-gray-500">
                                        {color.brand || "-"}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                        <Badge variant={color.is_active ? "default" : "secondary"}>
                                          {color.is_active ? t("common.active") : t("definitions.masterBatch.inactive")}
                                        </Badge>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setEditingItem(color);
                                              setMasterBatchColorForm({
                                                id: color.id,
                                                name: color.name || "",
                                                name_ar: color.name_ar || "",
                                                color_hex: color.color_hex || "#000000",
                                                text_color: color.text_color || "#ffffff",
                                                brand: color.brand || "",
                                                aliases: color.aliases || "",
                                                is_active: color.is_active ?? true,
                                                sort_order: color.sort_order || 0,
                                              });
                                              setIsDialogOpen(true);
                                            }}
                                          >
                                            <Edit className="w-4 h-4" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700"
                                            onClick={() => {
                                              if (window.confirm(t("definitions.masterBatch.confirmDelete", { name: color.name_ar }))) {
                                                deleteMasterBatchColorMutation.mutate(color.id);
                                              }
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                              ) : (
                                <tr>
                                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    {t("definitions.masterBatch.noColors")}
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

              </Tabs>
            </div>

            {/* All Dialogs for different entities */}

            {/* Customer Add/Edit Dialog */}
            {selectedTab === "customers" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent
                  className="max-w-4xl max-h-[90vh] overflow-y-auto"
                  aria-describedby="customer-dialog-description"
                >
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? t("definitions.customers.edit") : t("definitions.customers.addNew")}
                    </DialogTitle>
                    <DialogDescription id="customer-dialog-description">
                      {editingItem
                        ? t("definitions.customers.editDescription")
                        : t("definitions.customers.addDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name_ar">{t("definitions.customers.nameAr")} *</Label>
                        <Input
                          id="name_ar"
                          value={customerForm.name_ar}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              name_ar: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.customerNameAr")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">{t("definitions.customers.name")}</Label>
                        <Input
                          id="name"
                          value={customerForm.name}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Customer Name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleTranslateCustomerName}
                        disabled={isTranslating || (!customerForm.name_ar && !customerForm.name)}
                        className="gap-2"
                      >
                        {isTranslating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Languages className="h-4 w-4" />
                        )}
                        {t("definitions.customers.translateName")}
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="code">{t("definitions.customers.code")}</Label>
                        <Input
                          id="code"
                          value={customerForm.code}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              code: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.customerCode")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="plate_drawer_code">{t("definitions.customers.plateDrawerCode")}</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <Select
                            value={drawerLetter || "none"}
                            onValueChange={(value) => {
                              const newLetter = value === "none" ? "" : value;
                              setDrawerLetter(newLetter);
                              const combined = newLetter && drawerNumber 
                                ? `${newLetter}-${drawerNumber}` 
                                : "";
                              setCustomerForm({
                                ...customerForm,
                                plate_drawer_code: combined,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("definitions.form.letter")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("definitions.form.none")}</SelectItem>
                              <SelectItem value="A">A</SelectItem>
                              <SelectItem value="B">B</SelectItem>
                              <SelectItem value="C">C</SelectItem>
                              <SelectItem value="D">D</SelectItem>
                              <SelectItem value="E">E</SelectItem>
                              <SelectItem value="F">F</SelectItem>
                              <SelectItem value="G">G</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={drawerNumber || "none"}
                            onValueChange={(value) => {
                              const newNumber = value === "none" ? "" : value;
                              setDrawerNumber(newNumber);
                              const combined = drawerLetter && newNumber 
                                ? `${drawerLetter}-${newNumber}` 
                                : "";
                              setCustomerForm({
                                ...customerForm,
                                plate_drawer_code: combined,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t("definitions.form.number")} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px]">
                              <SelectItem value="none">{t("definitions.form.none")}</SelectItem>
                              {Array.from({ length: 60 }, (_, i) => i + 1).map((num) => (
                                <SelectItem key={num} value={num.toString()}>
                                  {num}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="phone">{t("definitions.customers.phone")}</Label>
                        <Input
                          id="phone"
                          value={customerForm.phone}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              phone: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.phoneNumber")}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">{t("definitions.customers.city")}</Label>
                        <Input
                          id="city"
                          value={customerForm.city}
                          onChange={(e) =>
                            setCustomerForm({
                              ...customerForm,
                              city: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.city")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tax_number">
                          {t("definitions.customers.taxNumber")}
                          <span className="text-xs text-muted-foreground mr-1">({t("definitions.form.14digits")})</span>
                        </Label>
                        <Input
                          id="tax_number"
                          value={customerForm.tax_number}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 14);
                            setCustomerForm({
                              ...customerForm,
                              tax_number: value,
                            });
                          }}
                          placeholder={t("definitions.form.taxNumberPlaceholder")}
                          className={`mt-1 ${customerForm.tax_number && customerForm.tax_number.length > 0 && customerForm.tax_number.length !== 14 ? 'border-yellow-500' : ''}`}
                          maxLength={14}
                        />
                        {customerForm.tax_number && customerForm.tax_number.length > 0 && customerForm.tax_number.length !== 14 && (
                          <p className="text-xs text-yellow-600 mt-1">
                            {customerForm.tax_number.length}/14 - {t("definitions.form.mustEnter14digits")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="sales_rep_id">{t("definitions.customers.salesRep")}</Label>
                      <Select
                        value={customerForm.sales_rep_id?.toString() || "none"}
                        onValueChange={(value) =>
                          setCustomerForm({
                            ...customerForm,
                            sales_rep_id: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1" data-testid="select-sales-rep">
                          <SelectValue placeholder={t("definitions.form.selectRep")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("definitions.form.noRep")}</SelectItem>
                          {Array.isArray(salesReps) &&
                            salesReps.map((rep: any) => (
                              <SelectItem
                                key={rep.id}
                                value={rep.id.toString()}
                              >
                                {rep.display_name_ar && rep.display_name 
                                  ? `${rep.display_name_ar} (${rep.display_name})`
                                  : rep.display_name_ar || rep.display_name || rep.username}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="address">{t("definitions.customers.address")}</Label>
                      <Input
                        id="address"
                        value={customerForm.address}
                        onChange={(e) =>
                          setCustomerForm({
                            ...customerForm,
                            address: e.target.value,
                          })
                        }
                        placeholder={t("definitions.form.fullAddress")}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => {
                        const formData = {
                          ...customerForm,
                          sales_rep_id: customerForm.sales_rep_id ? parseInt(customerForm.sales_rep_id) : null,
                          tax_number: customerForm.tax_number || null,
                          code: customerForm.code || null,
                          user_id: customerForm.user_id || null,
                          plate_drawer_code: customerForm.plate_drawer_code || null,
                        };
                        if (editingItem) {
                          updateCustomerMutation.mutate({
                            id: editingItem.id,
                            data: formData,
                          });
                        } else {
                          createCustomerMutation.mutate(formData);
                        }
                      }}
                      disabled={
                        createCustomerMutation.isPending ||
                        updateCustomerMutation.isPending
                      }
                    >
                      {createCustomerMutation.isPending ||
                      updateCustomerMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingItem ? t("definitions.updating") : t("definitions.saving")}
                        </>
                      ) : editingItem ? (
                        t("definitions.update")
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Section Add/Edit Dialog */}
            {selectedTab === "sections" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? t("definitions.sections.edit") : t("definitions.sections.addNew")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem
                        ? t("definitions.sections.editDescription")
                        : t("definitions.sections.addDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name_ar">{t("definitions.customers.nameAr")} *</Label>
                        <Input
                          id="name_ar"
                          value={sectionForm.name_ar}
                          onChange={(e) =>
                            setSectionForm({
                              ...sectionForm,
                              name_ar: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.sectionNameAr")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">{t("definitions.customers.name")}</Label>
                        <Input
                          id="name"
                          value={sectionForm.name}
                          onChange={(e) =>
                            setSectionForm({
                              ...sectionForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Section Name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">{t("definitions.sections.description")}</Label>
                      <Input
                        id="description"
                        value={sectionForm.description}
                        onChange={(e) =>
                          setSectionForm({
                            ...sectionForm,
                            description: e.target.value,
                          })
                        }
                        placeholder={t("definitions.form.sectionDescOptional")}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingItem) {
                          updateSectionMutation.mutate({
                            id: editingItem.id,
                            data: sectionForm,
                          });
                        } else {
                          createSectionMutation.mutate(sectionForm);
                        }
                      }}
                      disabled={
                        createSectionMutation.isPending ||
                        updateSectionMutation.isPending
                      }
                    >
                      {createSectionMutation.isPending ||
                      updateSectionMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingItem ? t("definitions.updating") : t("definitions.saving")}
                        </>
                      ) : editingItem ? (
                        t("definitions.update")
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Category Add/Edit Dialog */}
            {selectedTab === "categories" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? t("definitions.categories.edit") : t("definitions.categories.addNew")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem
                        ? t("definitions.categories.editDescription")
                        : t("definitions.categories.addDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name_ar">{t("definitions.customers.nameAr")} *</Label>
                        <Input
                          id="name_ar"
                          value={categoryForm.name_ar}
                          onChange={(e) =>
                            setCategoryForm({
                              ...categoryForm,
                              name_ar: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.categoryNameAr")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">{t("definitions.customers.name")}</Label>
                        <Input
                          id="name"
                          value={categoryForm.name}
                          onChange={(e) =>
                            setCategoryForm({
                              ...categoryForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Category Name"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="code">{t("definitions.categories.code")}</Label>
                        <Input
                          id="code"
                          value={categoryForm.code}
                          onChange={(e) =>
                            setCategoryForm({
                              ...categoryForm,
                              code: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.categoryCodeOptional")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="parent_id">{t("definitions.categories.parentCategory")}</Label>
                        <Select
                          value={categoryForm.parent_id}
                          onValueChange={(value) =>
                            setCategoryForm({
                              ...categoryForm,
                              parent_id: value,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("definitions.form.selectParentCategory")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              {t("definitions.form.noParentCategory")}
                            </SelectItem>
                            {Array.isArray(categories) &&
                              categories
                                .filter(
                                  (cat) =>
                                    cat.id &&
                                    cat.id !== "" &&
                                    cat.id !== null &&
                                    cat.id !== undefined,
                                )
                                .map((cat: any) => (
                                  <SelectItem
                                    key={cat.id}
                                    value={cat.id.toString()}
                                  >
                                    {cat.name_ar || cat.name} ({cat.id})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">{t("definitions.sections.description")}</Label>
                      <Input
                        id="description"
                        value={categoryForm.description}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            description: e.target.value,
                          })
                        }
                        placeholder={t("definitions.form.categoryDescOptional")}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">{t("definitions.categories.status")}</Label>
                      <Select
                        value={categoryForm.status}
                        onValueChange={(value) =>
                          setCategoryForm({ ...categoryForm, status: value })
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t("definitions.active")}</SelectItem>
                          <SelectItem value="inactive">{t("definitions.inactive")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingItem) {
                          updateCategoryMutation.mutate({
                            id: editingItem.id,
                            data: categoryForm,
                          });
                        } else {
                          createCategoryMutation.mutate(categoryForm);
                        }
                      }}
                      disabled={
                        createCategoryMutation.isPending ||
                        updateCategoryMutation.isPending
                      }
                    >
                      {createCategoryMutation.isPending ||
                      updateCategoryMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingItem ? t("definitions.updating") : t("definitions.saving")}
                        </>
                      ) : editingItem ? (
                        t("definitions.update")
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Items Add/Edit Dialog */}
            {selectedTab === "items" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? t("definitions.items.edit") : t("definitions.items.addNew")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem
                        ? t("definitions.items.editDescription")
                        : t("definitions.items.addDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name_ar">{t("definitions.customers.nameAr")} *</Label>
                        <Input
                          id="name_ar"
                          value={itemForm.name_ar}
                          onChange={(e) =>
                            setItemForm({
                              ...itemForm,
                              name_ar: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.itemNameAr")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">{t("definitions.customers.name")}</Label>
                        <Input
                          id="name"
                          value={itemForm.name}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, name: e.target.value })
                          }
                          placeholder="Item Name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="code">{t("definitions.items.code")}</Label>
                        <Input
                          id="code"
                          value={itemForm.code}
                          onChange={(e) =>
                            setItemForm({ ...itemForm, code: e.target.value })
                          }
                          placeholder={t("definitions.form.itemCode")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="category_id">{t("definitions.items.category")}</Label>
                        <Select
                          value={itemForm.category_id}
                          onValueChange={(value) =>
                            setItemForm({ ...itemForm, category_id: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("definitions.form.selectCategory")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("definitions.form.noCategory")}</SelectItem>
                            {Array.isArray(categories) &&
                              categories
                                .filter(
                                  (cat) =>
                                    cat.id &&
                                    cat.id !== "" &&
                                    cat.id !== null &&
                                    cat.id !== undefined,
                                )
                                .map((cat: any) => (
                                  <SelectItem
                                    key={cat.id}
                                    value={cat.id.toString()}
                                  >
                                    {cat.name_ar || cat.name} ({cat.id})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingItem) {
                          updateItemMutation.mutate({
                            id: editingItem.id,
                            data: itemForm,
                          });
                        } else {
                          createItemMutation.mutate(itemForm);
                        }
                      }}
                      disabled={
                        createItemMutation.isPending ||
                        updateItemMutation.isPending
                      }
                    >
                      {createItemMutation.isPending ||
                      updateItemMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingItem ? t("definitions.updating") : t("definitions.saving")}
                        </>
                      ) : editingItem ? (
                        t("definitions.update")
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Customer Products Add/Edit Dialog */}
            {selectedTab === "customer-products" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto sm:max-w-[95vw] w-full mx-4">
                  <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">
                      {editingItem
                        ? t("definitions.customerProducts.edit")
                        : t("definitions.customerProducts.addNew")}
                    </DialogTitle>
                    <DialogDescription className="text-sm sm:text-base">
                      {editingItem
                        ? t("definitions.customerProducts.editDescription")
                        : t("definitions.customerProducts.addDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-6 py-4 px-2 sm:px-0">
                    {/* العميل والفئة والصنف */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="customer_id">{t("definitions.customerProducts.customer")} *</Label>
                        <div className="space-y-2 mt-1">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder={t("definitions.form.searchByName")}
                              value={customerSearchTermInProducts}
                              onChange={(e) =>
                                setCustomerSearchTermInProducts(e.target.value)
                              }
                              className="pl-10"
                              data-testid="input-search-customers-in-products"
                            />
                          </div>
                          <Select
                            value={customerProductForm.customer_id}
                            onValueChange={(value) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                customer_id: value,
                              })
                            }
                          >
                            <SelectTrigger data-testid="select-customer-in-products">
                              <SelectValue placeholder={t("definitions.form.selectCustomer")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("definitions.form.selectCustomer")}</SelectItem>
                              {filteredCustomersInProducts.length > 0 ? (
                                filteredCustomersInProducts
                                  .filter(
                                    (customer) =>
                                      customer.id &&
                                      customer.id !== "" &&
                                      customer.id !== null &&
                                      customer.id !== undefined,
                                  )
                                  .map((customer: any) => (
                                    <SelectItem
                                      key={customer.id}
                                      value={customer.id.toString()}
                                    >
                                      {customer.name_ar || customer.name}
                                      {customer.name && customer.name_ar ? ` - ${customer.name}` : ""}
                                    </SelectItem>
                                  ))
                              ) : (
                                <div className="p-2 text-sm text-gray-500 text-center">
                                  {customerSearchTermInProducts 
                                    ? t("definitions.form.noSearchResults")
                                    : t("definitions.form.loadingCustomers")}
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <div className="text-xs text-gray-500 mt-1">
                            {filteredCustomersInProducts.length > 0 && (
                              <span>
                                {filteredCustomersInProducts.length} {t("definitions.form.customersAvailable")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="category_id">{t("definitions.items.category")}</Label>
                        <Select
                          value={customerProductForm.category_id}
                          onValueChange={(value) => {
                            setCustomerProductForm({
                              ...customerProductForm,
                              category_id: value,
                              item_id: "", // Reset item selection when category changes
                            });
                          }}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("definitions.form.selectCategory")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("definitions.form.selectCategory")}</SelectItem>
                            {Array.isArray(categories) &&
                              categories
                                .filter(
                                  (cat) =>
                                    cat.id &&
                                    cat.id !== "" &&
                                    cat.id !== null &&
                                    cat.id !== undefined,
                                )
                                .map((cat: any) => (
                                  <SelectItem
                                    key={cat.id}
                                    value={cat.id.toString()}
                                  >
                                    {cat.name_ar || cat.name} ({cat.id})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="item_id">{t("definitions.customerProducts.item")}</Label>
                        <Select
                          value={customerProductForm.item_id}
                          onValueChange={(value) =>
                            setCustomerProductForm({
                              ...customerProductForm,
                              item_id: value,
                            })
                          }
                          disabled={
                            !customerProductForm.category_id ||
                            customerProductForm.category_id === "none"
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue
                              placeholder={
                                !customerProductForm.category_id ||
                                customerProductForm.category_id === "none"
                                  ? t("definitions.form.selectCategoryFirst")
                                  : t("definitions.form.selectItem")
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("definitions.form.selectItem")}</SelectItem>
                            {Array.isArray(items) &&
                              items
                                .filter(
                                  (item: any) =>
                                    customerProductForm.category_id &&
                                    customerProductForm.category_id !==
                                      "none" &&
                                    item.category_id ===
                                      customerProductForm.category_id,
                                )
                                .filter(
                                  (item) =>
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
                                    {item.name_ar || item.name} ({item.code})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* وصف الحجم والتثقيب */}
                    <div className="space-y-4">
                      <h4 className="text-lg sm:text-xl font-medium border-b border-gray-200 pb-2">
                        {t("definitions.form.productSpecs")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="size_caption">
                            {t("definitions.form.productSizeAuto")}
                          </Label>
                          <Input
                            id="size_caption"
                            value={customerProductForm.size_caption}
                            placeholder={t("definitions.form.autoGeneratedSize")}
                            className="mt-1 bg-gray-50"
                            readOnly
                          />
                        </div>
                        <div>
                          <Label htmlFor="punching">التخريم</Label>
                          <Select
                            value={customerProductForm.punching || "بدون"}
                            onValueChange={(value) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                punching: value,
                              })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={t("definitions.form.selectPunchType")} />
                            </SelectTrigger>
                            <SelectContent>
                              {(() => {
                                const selectedCategory = Array.isArray(categories)
                                  ? (categories as any[]).find((c: any) => c.id === customerProductForm.category_id)
                                  : null;
                                const catName = selectedCategory?.name_ar || "";

                                if (catName === "أكياس علاقي") {
                                  return (
                                    <>
                                      <SelectItem value="علاقي">علاقي</SelectItem>
                                      <SelectItem value="علاقي هوك">علاقي هوك</SelectItem>
                                    </>
                                  );
                                } else if (catName === "أكياس بنانة") {
                                  return (
                                    <>
                                      <SelectItem value="بنانة">بنانة</SelectItem>
                                      <SelectItem value="بنانة 6سم">بنانة 6سم</SelectItem>
                                    </>
                                  );
                                } else {
                                  return (
                                    <SelectItem value="بدون">بدون</SelectItem>
                                  );
                                }
                              })()}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* الأبعاد والقياسات بالترتيب المطلوب */}
                    <div className="space-y-4">
                      <h4 className="text-lg sm:text-xl font-medium border-b border-gray-200 pb-2">
                        {t("definitions.form.dimensionsMeasurements")}
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="right_facing">
                            {t("definitions.form.rightSide")}
                          </Label>
                          <Input
                            id="right_facing"
                            type="number"
                            step="0.01"
                            value={customerProductForm.right_facing}
                            onChange={(e) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                right_facing: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="width">{t("definitions.form.width")}</Label>
                          <Input
                            id="width"
                            type="number"
                            step="0.01"
                            value={customerProductForm.width}
                            onChange={(e) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                width: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="left_facing">
                            {t("definitions.form.leftSide")}
                          </Label>
                          <Input
                            id="left_facing"
                            type="number"
                            step="0.01"
                            value={customerProductForm.left_facing}
                            onChange={(e) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                left_facing: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="thickness">{t("definitions.form.thickness")}</Label>
                          <Input
                            id="thickness"
                            type="number"
                            step="0.01"
                            value={customerProductForm.thickness}
                            onChange={(e) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                thickness: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* الطباعة والقطع */}
                    <div className="space-y-4">
                      <h4 className="text-lg sm:text-xl font-medium border-b border-gray-200 pb-2">
                        {t("definitions.form.printingCuttingSpecs")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <Label htmlFor="printing_cylinder">
                            {t("definitions.form.printingCylinder")}
                          </Label>
                          <Select
                            value={customerProductForm.printing_cylinder}
                            onValueChange={(value) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                printing_cylinder: value,
                              })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={t("definitions.form.selectCylinder")} />
                            </SelectTrigger>
                            <SelectContent>
                              {printingCylinderOptions
                                .filter(
                                  (option) =>
                                    option.value &&
                                    option.value !== "" &&
                                    option.value !== null &&
                                    option.value !== undefined,
                                )
                                .map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value.toString()}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="cutting_length_cm">
                            {t("definitions.form.cuttingLength")}
                          </Label>
                          {(() => {
                            const selectedCat = Array.isArray(categories)
                              ? (categories as any[]).find((c: any) => c.id === customerProductForm.category_id)
                              : null;
                            const catNameAr = selectedCat?.name_ar || "";
                            const isSufra = catNameAr === "سفرة بلاستيكية" || catNameAr === "سفرة بلاستيكية مطوية";
                            const isNoPrinting = customerProductForm.printing_cylinder === "بدون طباعة";
                            const isManualInput = isSufra || isNoPrinting;
                            return (
                              <Input
                                id="cutting_length_cm"
                                type="number"
                                value={customerProductForm.cutting_length_cm}
                                onChange={(e) =>
                                  setCustomerProductForm({
                                    ...customerProductForm,
                                    cutting_length_cm: e.target.value,
                                  })
                                }
                                placeholder={isManualInput ? t("definitions.form.enterCuttingLength") : t("definitions.form.autoCalculated")}
                                className="mt-1"
                                disabled={!isManualInput}
                              />
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-3 mt-6 p-3 bg-gray-50 rounded-md">
                          <input
                            type="checkbox"
                            id="is_printed"
                            checked={customerProductForm.is_printed}
                            className="rounded w-4 h-4"
                            disabled
                          />
                          <Label
                            htmlFor="is_printed"
                            className="text-gray-600 text-sm"
                          >
                            {t("definitions.form.printedProduct")}
                          </Label>
                        </div>
                        <div>
                          <Label htmlFor="cutting_unit">{t("definitions.form.cuttingUnit")}</Label>
                          <Select
                            value={customerProductForm.cutting_unit || "none"}
                            onValueChange={(value) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                cutting_unit: value === "none" ? "" : value,
                              })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={t("definitions.form.selectUnit")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("definitions.form.selectUnit")}</SelectItem>
                              <SelectItem value="كيلو">{t("definitions.form.unitKilo")}</SelectItem>
                              <SelectItem value="رول">{t("definitions.form.unitRoll")}</SelectItem>
                              <SelectItem value="باكت">{t("definitions.form.unitPacket")}</SelectItem>
                              <SelectItem value="كرتون">{t("definitions.form.unitCarton")}</SelectItem>
                              <SelectItem value="قطعة">{t("definitions.form.unitPiece")}</SelectItem>
                              <SelectItem value="كيس">{t("definitions.form.unitBag")}</SelectItem>
                              <SelectItem value="غطاء">{t("definitions.form.unitCover")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* المواد والخامات */}
                    <div className="space-y-4">
                      <h4 className="text-lg sm:text-xl font-medium border-b border-gray-200 pb-2">
                        {t("definitions.form.materialsRaw")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="raw_material">{t("definitions.form.rawMaterial")}</Label>
                          <Select
                            value={customerProductForm.raw_material}
                            onValueChange={(value) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                raw_material: value,
                              })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={t("definitions.form.selectRawMaterial")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HDPE">HDPE</SelectItem>
                              <SelectItem value="LDPE">LDPE</SelectItem>
                              <SelectItem value="Regrind">Regrind</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="master_batch_id">
                            {t("definitions.form.masterBatchColor")}
                          </Label>
                          <Select
                            value={customerProductForm.master_batch_id}
                            onValueChange={(value) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                master_batch_id: value,
                              })
                            }
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder={t("definitions.form.selectColor")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("definitions.form.noColor")}</SelectItem>
                              {masterBatchColors
                                .filter(
                                  (color) =>
                                    color.id &&
                                    color.id !== "" &&
                                    color.id !== null &&
                                    color.id !== undefined &&
                                    color.is_active !== false,
                                )
                                .map((color) => (
                                  <SelectItem
                                    key={color.id}
                                    value={color.id.toString()}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div
                                        className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center"
                                        style={{
                                          backgroundColor: color.color,
                                          border:
                                            color.id === "transparent"
                                              ? "2px dashed #ccc"
                                              : `2px solid ${color.color}`,
                                        }}
                                      >
                                        {color.id === "transparent" && (
                                          <span className="text-xs text-gray-400">
                                            ⊘
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-medium">
                                        {color.name_ar}
                                      </span>
                                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {color.id}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* الأوزان والكميات */}
                    <div className="space-y-4">
                      <h4 className="text-lg sm:text-xl font-medium border-b border-gray-200 pb-2">
                        {t("definitions.form.weightsQuantities")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="unit_weight_kg">
                            {t("definitions.form.unitWeight")}
                          </Label>
                          <Input
                            id="unit_weight_kg"
                            type="number"
                            step="0.001"
                            value={customerProductForm.unit_weight_kg}
                            onChange={(e) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                unit_weight_kg: e.target.value,
                              })
                            }
                            placeholder="0.00"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="unit_quantity">{t("definitions.form.packaging")}</Label>
                          <Input
                            id="unit_quantity"
                            type="number"
                            value={customerProductForm.unit_quantity}
                            onChange={(e) =>
                              setCustomerProductForm({
                                ...customerProductForm,
                                unit_quantity: e.target.value,
                              })
                            }
                            placeholder="0"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="package_weight_kg">
                            {t("definitions.form.packageWeightAuto")}
                          </Label>
                          <Input
                            id="package_weight_kg"
                            type="number"
                            step="0.01"
                            value={customerProductForm.package_weight_kg}
                            placeholder={t("definitions.form.unitWeightTimesQty")}
                            className="mt-1 bg-gray-50"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>

                    {/* الكليشيهات والتصاميم */}
                    <div className="space-y-4">
                      <h4 className="text-lg sm:text-xl font-medium border-b border-gray-200 pb-2">
                        {t("definitions.form.clichesDesigns")}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cliche_front_design">
                            {t("definitions.form.frontDesign")}
                          </Label>
                          <div className="space-y-2">
                            <Input
                              id="cliche_front_design"
                              type="file"
                              accept="image/*,.jpeg,.jpg,.png,.gif,.bmp,.webp,.svg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Validate file size (max 5MB)
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      title: t("definitions.form.fileTooLarge"),
                                      description:
                                        t("definitions.form.imageSizeLimit"),
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    const result = e.target?.result as string;
                                    setCustomerProductForm({
                                      ...customerProductForm,
                                      cliche_front_design: result,
                                      front_design_filename: file.name,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="mt-1"
                            />
                            {customerProductForm.cliche_front_design && (
                              <div className="relative">
                                <img
                                  src={customerProductForm.cliche_front_design}
                                  alt={t("definitions.form.frontDesign")}
                                  className="max-w-full max-h-32 object-contain border rounded-md bg-gray-50"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 h-6 w-6 p-0"
                                  onClick={() =>
                                    setCustomerProductForm({
                                      ...customerProductForm,
                                      cliche_front_design: "",
                                      front_design_filename: "",
                                    })
                                  }
                                >
                                  ✕
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="cliche_back_design">
                            {t("definitions.form.backDesign")}
                          </Label>
                          <div className="space-y-2">
                            <Input
                              id="cliche_back_design"
                              type="file"
                              accept="image/*,.jpeg,.jpg,.png,.gif,.bmp,.webp,.svg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Validate file size (max 5MB)
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      title: t("definitions.form.fileTooLarge"),
                                      description:
                                        t("definitions.form.imageSizeLimit"),
                                      variant: "destructive",
                                    });
                                    return;
                                  }

                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    const result = e.target?.result as string;
                                    setCustomerProductForm({
                                      ...customerProductForm,
                                      cliche_back_design: result,
                                      back_design_filename: file.name,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                              className="mt-1"
                            />
                            {customerProductForm.cliche_back_design && (
                              <div className="relative">
                                <img
                                  src={customerProductForm.cliche_back_design}
                                  alt={t("definitions.form.backDesign")}
                                  className="max-w-full max-h-32 object-contain border rounded-md bg-gray-50"
                                />
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 h-6 w-6 p-0"
                                  onClick={() =>
                                    setCustomerProductForm({
                                      ...customerProductForm,
                                      cliche_back_design: "",
                                      back_design_filename: "",
                                    })
                                  }
                                >
                                  ✕
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ملاحظات */}
                    <div>
                      <Label htmlFor="notes" className="text-base">
                        {t("definitions.form.notes")}
                      </Label>
                      <textarea
                        id="notes"
                        value={customerProductForm.notes}
                        onChange={(e) =>
                          setCustomerProductForm({
                            ...customerProductForm,
                            notes: e.target.value,
                          })
                        }
                        placeholder={t("definitions.form.notesPlaceholder")}
                        className="mt-2 w-full p-3 border border-gray-300 rounded-md resize-none text-right"
                        rows={4}
                        dir="rtl"
                      />
                    </div>
                  </div>
                  <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="w-full sm:w-auto order-2 sm:order-1"
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => {
                        // Convert string fields to numbers for validation
                        const processedData = {
                          ...customerProductForm,
                          cutting_length_cm:
                            customerProductForm.cutting_length_cm
                              ? parseInt(customerProductForm.cutting_length_cm)
                              : undefined,
                          unit_quantity: customerProductForm.unit_quantity
                            ? parseInt(customerProductForm.unit_quantity)
                            : undefined,
                          width: customerProductForm.width
                            ? parseFloat(customerProductForm.width)
                            : undefined,
                          left_facing: customerProductForm.left_facing
                            ? parseFloat(customerProductForm.left_facing)
                            : undefined,
                          right_facing: customerProductForm.right_facing
                            ? parseFloat(customerProductForm.right_facing)
                            : undefined,
                          thickness: customerProductForm.thickness
                            ? parseFloat(customerProductForm.thickness)
                            : undefined,
                          unit_weight_kg: customerProductForm.unit_weight_kg
                            ? parseFloat(customerProductForm.unit_weight_kg)
                            : undefined,
                          package_weight_kg:
                            customerProductForm.package_weight_kg
                              ? parseFloat(
                                  customerProductForm.package_weight_kg,
                                )
                              : undefined,
                        };

                        if (editingItem) {
                          updateCustomerProductMutation.mutate({
                            id: editingItem.id,
                            data: processedData,
                          });
                        } else {
                          createCustomerProductMutation.mutate(processedData);
                        }
                      }}
                      disabled={
                        createCustomerProductMutation.isPending ||
                        updateCustomerProductMutation.isPending
                      }
                      className="w-full sm:w-auto order-1 sm:order-2"
                    >
                      {createCustomerProductMutation.isPending ||
                      updateCustomerProductMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingItem ? t("definitions.updating") : t("definitions.saving")}
                        </>
                      ) : editingItem ? (
                        t("definitions.update")
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Machines Add/Edit Dialog */}
            {selectedTab === "machines" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? t("definitions.machines.edit") : t("definitions.machines.addNew")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem
                        ? t("definitions.machines.editDescription")
                        : t("definitions.machines.addDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name_ar">{t("definitions.customers.nameAr")} *</Label>
                        <Input
                          id="name_ar"
                          value={machineForm.name_ar}
                          onChange={(e) =>
                            setMachineForm({
                              ...machineForm,
                              name_ar: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.machineNameAr")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">{t("definitions.customers.name")}</Label>
                        <Input
                          id="name"
                          value={machineForm.name}
                          onChange={(e) =>
                            setMachineForm({
                              ...machineForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Machine Name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type">{t("definitions.machines.type")}</Label>
                        <Select
                          value={machineForm.type}
                          onValueChange={(value) =>
                            setMachineForm({ ...machineForm, type: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="extruder">{t("definitions.form.typeFilm")}</SelectItem>
                            <SelectItem value="cutting">{t("definitions.form.typeCutting")}</SelectItem>
                            <SelectItem value="printing">{t("definitions.form.typePrinting")}</SelectItem>
                            <SelectItem value="packaging">{t("definitions.form.typePackaging")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="section_id">{t("definitions.machines.section")}</Label>
                        <Select
                          value={machineForm.section_id}
                          onValueChange={(value) =>
                            setMachineForm({
                              ...machineForm,
                              section_id: value,
                            })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("definitions.form.selectSection")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("definitions.form.noSection")}</SelectItem>
                            {Array.isArray(sections) &&
                              sections
                                .filter(
                                  (section) =>
                                    section.id &&
                                    section.id !== "" &&
                                    section.id !== null &&
                                    section.id !== undefined,
                                )
                                .map((section: any) => (
                                  <SelectItem
                                    key={section.id}
                                    value={section.id.toString()}
                                  >
                                    {section.name_ar || section.name} (
                                    {section.id})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* حالة الماكينة */}
                    <div>
                      <Label htmlFor="status">{t("definitions.machines.status")}</Label>
                      <Select
                        value={machineForm.status}
                        onValueChange={(value) =>
                          setMachineForm({
                            ...machineForm,
                            status: value,
                          })
                        }
                      >
                        <SelectTrigger className="mt-1" data-testid="select-machine-status">
                          <SelectValue placeholder={t("definitions.form.selectStatus")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t("common.active")}</SelectItem>
                          <SelectItem value="maintenance">{t("definitions.table.maintenance")}</SelectItem>
                          <SelectItem value="down">{t("definitions.table.stopped")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* قدرة الإنتاج حسب الحجم */}
                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-sm font-medium mb-3">{t("definitions.form.productionCapacity")}</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="capacity_small">{t("definitions.machines.capacitySmall")}</Label>
                          <Input
                            id="capacity_small"
                            type="number"
                            step="0.01"
                            value={machineForm.capacity_small_kg_per_hour}
                            onChange={(e) =>
                              setMachineForm({
                                ...machineForm,
                                capacity_small_kg_per_hour: e.target.value,
                              })
                            }
                            placeholder={t("common.kgPerHour")}
                            className="mt-1"
                            data-testid="input-capacity-small"
                          />
                        </div>
                        <div>
                          <Label htmlFor="capacity_medium">{t("definitions.machines.capacityMedium")}</Label>
                          <Input
                            id="capacity_medium"
                            type="number"
                            step="0.01"
                            value={machineForm.capacity_medium_kg_per_hour}
                            onChange={(e) =>
                              setMachineForm({
                                ...machineForm,
                                capacity_medium_kg_per_hour: e.target.value,
                              })
                            }
                            placeholder={t("common.kgPerHour")}
                            className="mt-1"
                            data-testid="input-capacity-medium"
                          />
                        </div>
                        <div>
                          <Label htmlFor="capacity_large">{t("definitions.machines.capacityLarge")}</Label>
                          <Input
                            id="capacity_large"
                            type="number"
                            step="0.01"
                            value={machineForm.capacity_large_kg_per_hour}
                            onChange={(e) =>
                              setMachineForm({
                                ...machineForm,
                                capacity_large_kg_per_hour: e.target.value,
                              })
                            }
                            placeholder={t("common.kgPerHour")}
                            className="mt-1"
                            data-testid="input-capacity-large"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingItem) {
                          updateMachineMutation.mutate({
                            id: editingItem.id,
                            data: machineForm,
                          });
                        } else {
                          createMachineMutation.mutate(machineForm);
                        }
                      }}
                      disabled={
                        createMachineMutation.isPending ||
                        updateMachineMutation.isPending
                      }
                    >
                      {createMachineMutation.isPending ||
                      updateMachineMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingItem ? t("definitions.updating") : t("definitions.saving")}
                        </>
                      ) : editingItem ? (
                        t("definitions.update")
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Users Add/Edit Dialog */}
            {selectedTab === "users" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? t("definitions.users.edit") : t("definitions.users.addNew")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem
                        ? t("definitions.users.editDescription")
                        : t("definitions.users.addDescription")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="display_name_ar">
                          {t("definitions.table.nameAr")} *
                        </Label>
                        <Input
                          id="display_name_ar"
                          value={userForm.display_name_ar}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              display_name_ar: e.target.value,
                            })
                          }
                          placeholder={t("definitions.form.userNameAr")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="display_name">{t("definitions.users.displayName")}</Label>
                        <Input
                          id="display_name"
                          value={userForm.display_name}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              display_name: e.target.value,
                            })
                          }
                          placeholder="Display Name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="username">{t("definitions.users.username")} *</Label>
                        <Input
                          id="username"
                          value={userForm.username}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              username: e.target.value,
                            })
                          }
                          placeholder="username"
                          className="mt-1"
                          data-testid="input-username"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">
                          {t("definitions.form.password")} {editingItem ? t("definitions.form.leaveBlank") : "*"}
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={userForm.password}
                            onChange={(e) =>
                              setUserForm({
                                ...userForm,
                                password: e.target.value,
                              })
                            }
                            placeholder={editingItem ? t("definitions.form.enterNewPassword") : t("definitions.form.enterPassword")}
                            className="mt-1 pr-10"
                            data-testid="input-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                            data-testid="button-toggle-password"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="phone">{t("definitions.form.mobileNumber")}</Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={userForm.phone}
                          onChange={(e) =>
                            setUserForm({
                              ...userForm,
                              phone: e.target.value,
                            })
                          }
                          placeholder="05xxxxxxxx"
                          className="mt-1"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <Label htmlFor="role_id">{t("definitions.users.role")}</Label>
                        <Select
                          value={userForm.role_id}
                          onValueChange={(value) =>
                            setUserForm({ ...userForm, role_id: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("definitions.form.selectRole")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("definitions.form.noRole")}</SelectItem>
                            {Array.isArray(roles) &&
                              roles
                                .filter(
                                  (role) =>
                                    role.id &&
                                    role.id !== "" &&
                                    role.id !== null &&
                                    role.id !== undefined,
                                )
                                .map((role: any) => (
                                  <SelectItem
                                    key={role.id}
                                    value={`ROLE${String(role.id).padStart(2, '0')}`}
                                  >
                                    {role.name_ar || role.name}
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="section_id">{t("definitions.machines.section")}</Label>
                        <Select
                          value={userForm.section_id}
                          onValueChange={(value) =>
                            setUserForm({ ...userForm, section_id: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("definitions.form.selectSection")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">{t("definitions.form.noSection")}</SelectItem>
                            {Array.isArray(sections) &&
                              sections
                                .filter(
                                  (section) =>
                                    section.id &&
                                    section.id !== "" &&
                                    section.id !== null &&
                                    section.id !== undefined,
                                )
                                .map((section: any) => (
                                  <SelectItem
                                    key={section.id}
                                    value={section.id.toString()}
                                  >
                                    {section.name_ar || section.name} (
                                    {section.id})
                                  </SelectItem>
                                ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="status">{t("definitions.categories.status")}</Label>
                        <Select
                          value={userForm.status}
                          onValueChange={(value) =>
                            setUserForm({ ...userForm, status: value })
                          }
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue placeholder={t("definitions.form.selectStatus")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t("definitions.active")}</SelectItem>
                            <SelectItem value="inactive">{t("definitions.inactive")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => {
                        if (editingItem) {
                          // When updating, only send password if it's not empty
                          const { password, ...restData } = userForm;
                          const updateData = password && password.trim() !== "" 
                            ? userForm 
                            : restData;
                          updateUserMutation.mutate({
                            id: editingItem.id,
                            data: updateData,
                          });
                        } else {
                          // When creating, password is required
                          if (!userForm.password || userForm.password.trim() === "") {
                            toast({
                              title: t("common.error"),
                              description: t("definitions.users.messages.passwordRequired"),
                              variant: "destructive",
                            });
                            return;
                          }
                          createUserMutation.mutate(userForm);
                        }
                      }}
                      disabled={
                        createUserMutation.isPending ||
                        updateUserMutation.isPending
                      }
                      data-testid="button-save-user"
                    >
                      {createUserMutation.isPending ||
                      updateUserMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingItem ? t("definitions.updating") : t("definitions.saving")}
                        </>
                      ) : editingItem ? (
                        t("definitions.update")
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Master Batch Colors Add/Edit Dialog */}
            {selectedTab === "master-batch-colors" && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? t("definitions.masterBatch.editColor") : t("definitions.masterBatch.addNew")}
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem
                        ? t("definitions.masterBatch.editColorDesc")
                        : t("definitions.masterBatch.addColorDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="color_id">{t("definitions.masterBatch.colorCode")} *</Label>
                        <Input
                          id="color_id"
                          value={masterBatchColorForm.id}
                          onChange={(e) =>
                            setMasterBatchColorForm({
                              ...masterBatchColorForm,
                              id: e.target.value,
                            })
                          }
                          placeholder={t("definitions.masterBatch.colorCodePlaceholder")}
                          className="mt-1"
                          disabled={!!editingItem}
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand">{t("definitions.masterBatch.supplier")}</Label>
                        <Input
                          id="brand"
                          value={masterBatchColorForm.brand}
                          onChange={(e) =>
                            setMasterBatchColorForm({
                              ...masterBatchColorForm,
                              brand: e.target.value,
                            })
                          }
                          placeholder={t("definitions.masterBatch.supplierName")}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name_ar">{t("definitions.table.nameAr")} *</Label>
                        <Input
                          id="name_ar"
                          value={masterBatchColorForm.name_ar}
                          onChange={(e) =>
                            setMasterBatchColorForm({
                              ...masterBatchColorForm,
                              name_ar: e.target.value,
                            })
                          }
                          placeholder={t("definitions.table.nameAr")}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="name">{t("definitions.table.nameEn")} *</Label>
                        <Input
                          id="name"
                          value={masterBatchColorForm.name}
                          onChange={(e) =>
                            setMasterBatchColorForm({
                              ...masterBatchColorForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="English Name"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="color_hex">{t("definitions.masterBatch.displayColor")} *</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            id="color_hex"
                            value={masterBatchColorForm.color_hex}
                            onChange={(e) =>
                              setMasterBatchColorForm({
                                ...masterBatchColorForm,
                                color_hex: e.target.value,
                              })
                            }
                            className="w-12 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={masterBatchColorForm.color_hex}
                            onChange={(e) =>
                              setMasterBatchColorForm({
                                ...masterBatchColorForm,
                                color_hex: e.target.value,
                              })
                            }
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="text_color">{t("definitions.masterBatch.textColor")}</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="color"
                            id="text_color"
                            value={masterBatchColorForm.text_color}
                            onChange={(e) =>
                              setMasterBatchColorForm({
                                ...masterBatchColorForm,
                                text_color: e.target.value,
                              })
                            }
                            className="w-12 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={masterBatchColorForm.text_color}
                            onChange={(e) =>
                              setMasterBatchColorForm({
                                ...masterBatchColorForm,
                                text_color: e.target.value,
                              })
                            }
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="aliases">{t("definitions.masterBatch.aliases")}</Label>
                        <Input
                          id="aliases"
                          value={masterBatchColorForm.aliases}
                          onChange={(e) =>
                            setMasterBatchColorForm({
                              ...masterBatchColorForm,
                              aliases: e.target.value,
                            })
                          }
                          placeholder={t("definitions.masterBatch.aliasesPlaceholder")}
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {t("definitions.masterBatch.aliasesHint")}
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="sort_order">{t("definitions.masterBatch.sortOrder")}</Label>
                        <Input
                          id="sort_order"
                          type="number"
                          value={masterBatchColorForm.sort_order}
                          onChange={(e) =>
                            setMasterBatchColorForm({
                              ...masterBatchColorForm,
                              sort_order: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="0"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_active"
                        checked={masterBatchColorForm.is_active}
                        onChange={(e) =>
                          setMasterBatchColorForm({
                            ...masterBatchColorForm,
                            is_active: e.target.checked,
                          })
                        }
                        className="w-4 h-4"
                      />
                      <Label htmlFor="is_active">{t("common.active")}</Label>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">{t("definitions.masterBatch.preview")}:</p>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-16 h-16 rounded-lg border-2 flex items-center justify-center text-sm font-medium shadow-md"
                          style={{
                            backgroundColor: masterBatchColorForm.color_hex,
                            color: masterBatchColorForm.text_color,
                            borderColor: masterBatchColorForm.color_hex === "#ffffff" ? "#e5e7eb" : masterBatchColorForm.color_hex,
                          }}
                        >
                          {masterBatchColorForm.name_ar?.substring(0, 4) || t("definitions.masterBatch.color")}
                        </div>
                        <div>
                          <p className="font-medium">{masterBatchColorForm.name_ar || t("definitions.table.nameAr")}</p>
                          <p className="text-sm text-gray-500">{masterBatchColorForm.name || "English Name"}</p>
                          <p className="text-xs text-gray-400">{masterBatchColorForm.id || t("definitions.table.code")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      onClick={() => {
                        if (!masterBatchColorForm.id || !masterBatchColorForm.name || !masterBatchColorForm.name_ar) {
                          toast({
                            title: t("common.error"),
                            description: t("definitions.masterBatch.fillRequired"),
                            variant: "destructive",
                          });
                          return;
                        }
                        if (editingItem) {
                          updateMasterBatchColorMutation.mutate({
                            id: editingItem.id,
                            data: masterBatchColorForm,
                          });
                        } else {
                          createMasterBatchColorMutation.mutate(masterBatchColorForm);
                        }
                      }}
                      disabled={
                        createMasterBatchColorMutation.isPending ||
                        updateMasterBatchColorMutation.isPending
                      }
                    >
                      {createMasterBatchColorMutation.isPending ||
                      updateMasterBatchColorMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          {editingItem ? t("definitions.masterBatch.updating") : t("definitions.masterBatch.saving")}
                        </>
                      ) : editingItem ? (
                        t("definitions.update")
                      ) : (
                        t("common.save")
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
      </div>
    </PageLayout>
  );
}
