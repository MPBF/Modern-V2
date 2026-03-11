export interface WidgetMeta {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  category: string;
  category_ar: string;
  icon: string;
  requiredPermissions: string[];
  defaultSize: "small" | "medium" | "large";
}

export const WIDGET_REGISTRY: Record<string, WidgetMeta> = {
  dashboard_stats: {
    id: "dashboard_stats",
    name: "Dashboard Statistics",
    name_ar: "إحصائيات لوحة التحكم",
    description: "Overview of orders, production, attendance, and maintenance",
    description_ar: "نظرة عامة على الطلبات والإنتاج والحضور والصيانة",
    category: "General",
    category_ar: "عام",
    icon: "BarChart3",
    requiredPermissions: ["view_dashboard"],
    defaultSize: "large",
  },
  machine_status: {
    id: "machine_status",
    name: "Machine Status",
    name_ar: "حالة الماكينات",
    description: "Real-time machine status overview",
    description_ar: "نظرة عامة على حالة الماكينات في الوقت الحقيقي",
    category: "Production",
    category_ar: "الإنتاج",
    icon: "Cog",
    requiredPermissions: ["view_production"],
    defaultSize: "medium",
  },
  recent_rolls: {
    id: "recent_rolls",
    name: "Recent Rolls",
    name_ar: "آخر اللفائف",
    description: "Latest production rolls",
    description_ar: "آخر لفائف الإنتاج",
    category: "Production",
    category_ar: "الإنتاج",
    icon: "ScrollText",
    requiredPermissions: ["view_production"],
    defaultSize: "medium",
  },
  attendance_stats: {
    id: "attendance_stats",
    name: "Attendance Overview",
    name_ar: "نظرة عامة على الحضور",
    description: "Today's attendance summary with face verification",
    description_ar: "ملخص حضور اليوم مع التحقق بالوجه",
    category: "HR",
    category_ar: "الموارد البشرية",
    icon: "UserCheck",
    requiredPermissions: ["view_hr", "manage_attendance", "manage_hr"],
    defaultSize: "medium",
  },
  quick_notes: {
    id: "quick_notes",
    name: "Quick Notes",
    name_ar: "ملاحظات سريعة",
    description: "Personal quick notes and reminders",
    description_ar: "ملاحظات وتذكيرات شخصية سريعة",
    category: "General",
    category_ar: "عام",
    icon: "StickyNote",
    requiredPermissions: ["view_dashboard"],
    defaultSize: "small",
  },
  shortcuts: {
    id: "shortcuts",
    name: "Shortcuts",
    name_ar: "اختصارات",
    description: "Quick access to frequently used pages",
    description_ar: "وصول سريع للصفحات المستخدمة بشكل متكرر",
    category: "General",
    category_ar: "عام",
    icon: "Zap",
    requiredPermissions: ["view_dashboard"],
    defaultSize: "small",
  },
  inventory_widget: {
    id: "inventory_widget",
    name: "Inventory Summary",
    name_ar: "ملخص المخزون",
    description: "Warehouse stock levels and alerts",
    description_ar: "مستويات المخزون والتنبيهات",
    category: "Warehouse",
    category_ar: "المستودع",
    icon: "Package",
    requiredPermissions: ["manage_warehouse", "manage_inventory", "view_warehouse"],
    defaultSize: "medium",
  },
  quotes_widget: {
    id: "quotes_widget",
    name: "Recent Quotes",
    name_ar: "آخر عروض الأسعار",
    description: "Latest quotes and their status",
    description_ar: "آخر عروض الأسعار وحالتها",
    category: "Sales",
    category_ar: "المبيعات",
    icon: "FileText",
    requiredPermissions: ["manage_orders"],
    defaultSize: "medium",
  },
  attendance_widget: {
    id: "attendance_widget",
    name: "Today's Attendance",
    name_ar: "حضور اليوم",
    description: "Today's attendance overview with check-in/out times",
    description_ar: "نظرة عامة على حضور اليوم مع أوقات الدخول والخروج",
    category: "HR",
    category_ar: "الموارد البشرية",
    icon: "Clock",
    requiredPermissions: ["manage_attendance", "view_hr", "manage_hr"],
    defaultSize: "medium",
  },
  recent_orders_widget: {
    id: "recent_orders_widget",
    name: "Recent Orders",
    name_ar: "آخر الطلبات",
    description: "Latest orders list with status",
    description_ar: "قائمة آخر الطلبات مع الحالة",
    category: "Orders",
    category_ar: "الطلبات",
    icon: "ShoppingCart",
    requiredPermissions: ["manage_orders"],
    defaultSize: "medium",
  },
  production_progress_widget: {
    id: "production_progress_widget",
    name: "Production Progress",
    name_ar: "تقدم الإنتاج",
    description: "Active production orders with progress bars",
    description_ar: "أوامر الإنتاج النشطة مع أشرطة التقدم",
    category: "Production",
    category_ar: "الإنتاج",
    icon: "Activity",
    requiredPermissions: ["view_production"],
    defaultSize: "large",
  },
  maintenance_widget: {
    id: "maintenance_widget",
    name: "Maintenance Alerts",
    name_ar: "تنبيهات الصيانة",
    description: "Pending maintenance requests and alerts",
    description_ar: "طلبات الصيانة المعلقة والتنبيهات",
    category: "Maintenance",
    category_ar: "الصيانة",
    icon: "Wrench",
    requiredPermissions: ["manage_maintenance", "view_production"],
    defaultSize: "medium",
  },
};

export type WidgetId = keyof typeof WIDGET_REGISTRY;

export interface DashboardConfig {
  widgets: string[];
  layout: string;
}

export type RoleCategory =
  | "admin"
  | "production_manager"
  | "hr_manager"
  | "warehouse_manager"
  | "operator"
  | "sales"
  | "default";

export const ROLE_DEFAULT_WIDGETS: Record<RoleCategory, string[]> = {
  admin: [
    "dashboard_stats",
    "recent_orders_widget",
    "production_progress_widget",
    "machine_status",
    "inventory_widget",
    "attendance_widget",
    "maintenance_widget",
    "shortcuts",
    "quick_notes",
  ],
  production_manager: [
    "dashboard_stats",
    "recent_orders_widget",
    "production_progress_widget",
    "machine_status",
    "recent_rolls",
    "shortcuts",
  ],
  hr_manager: [
    "attendance_stats",
    "attendance_widget",
    "shortcuts",
    "quick_notes",
  ],
  warehouse_manager: [
    "inventory_widget",
    "recent_orders_widget",
    "shortcuts",
    "quick_notes",
  ],
  operator: [
    "production_progress_widget",
    "machine_status",
    "recent_rolls",
    "shortcuts",
  ],
  sales: [
    "recent_orders_widget",
    "quotes_widget",
    "dashboard_stats",
    "shortcuts",
  ],
  default: [
    "dashboard_stats",
    "shortcuts",
    "quick_notes",
  ],
};

export function getRoleCategoryFromPermissions(
  permissions: string[] | undefined,
  roleId: number | undefined
): RoleCategory {
  if (!permissions) return "default";

  if (permissions.includes("admin")) return "admin";

  const hasAny = (perms: string[]) => perms.some((p) => permissions.includes(p));

  if (hasAny(["manage_production", "view_production_monitoring"]))
    return "production_manager";
  if (hasAny(["manage_hr", "manage_attendance", "manage_leaves"]))
    return "hr_manager";
  if (hasAny(["manage_warehouse", "manage_inventory"]))
    return "warehouse_manager";
  if (hasAny(["manage_orders"]) && !hasAny(["manage_production"]))
    return "sales";
  if (hasAny(["view_film_dashboard", "view_printing_dashboard", "view_cutting_dashboard"]))
    return "operator";

  return "default";
}

export function getDefaultDashboardConfig(
  permissions: string[] | undefined,
  roleId: number | undefined
): DashboardConfig {
  const category = getRoleCategoryFromPermissions(permissions, roleId);
  return {
    widgets: ROLE_DEFAULT_WIDGETS[category],
    layout: "grid",
  };
}

export function getAvailableWidgets(
  permissions: string[] | undefined
): WidgetMeta[] {
  if (!permissions) return [];

  const isAdmin = permissions.includes("admin");

  return Object.values(WIDGET_REGISTRY).filter((widget) => {
    if (isAdmin) return true;
    return widget.requiredPermissions.some((perm) => permissions.includes(perm));
  });
}
