/**
 * Central Permissions Registry
 * نظام الصلاحيات المركزي
 * 
 * This file defines all permissions and their mappings to UI elements
 * هذا الملف يعرّف جميع الصلاحيات وربطها بعناصر الواجهة
 */

export type PermissionKey = 
  | 'view_home'
  | 'view_dashboard'
  | 'view_user_dashboard'
  | 'manage_orders'
  | 'manage_production'
  | 'manage_maintenance'
  | 'manage_quality'
  | 'manage_inventory'
  | 'manage_warehouse'
  | 'manage_users'
  | 'manage_hr'
  | 'view_reports'
  | 'manage_settings'
  | 'manage_definitions'
  | 'manage_roles'
  | 'view_production'
  | 'view_hr'
  | 'view_quality'
  | 'view_maintenance'
  | 'view_inventory'
  | 'view_warehouse'
  | 'view_notifications'
  | 'view_alerts'
  | 'manage_alerts'
  | 'view_system_health'
  | 'manage_analytics'
  | 'view_production_monitoring'
  | 'manage_whatsapp'
  | 'view_film_dashboard'
  | 'view_printing_dashboard'
  | 'view_cutting_dashboard'
  | 'view_mixing'
  | 'manage_mixing'
  | 'view_system_monitoring'
  | 'view_tools'
  | 'view_production_reports'
  | 'view_orders'
  | 'view_ai_agent'
  | 'use_ai_agent'
  | 'manage_ai_agent'
  | 'view_attendance'
  | 'manage_attendance'
  | 'view_attendance_reports'
  | 'manage_leaves'
  | 'view_training'
  | 'manage_training'
  | 'admin'; // Super admin permission

export interface Permission {
  id: PermissionKey;
  name: string;
  name_ar: string;
  category: string;
  description?: string;
}

// Define all available permissions
export const PERMISSIONS: Permission[] = [
  // General
  { 
    id: 'view_home', 
    name: 'View Home Page', 
    name_ar: 'عرض الصفحة الرئيسية', 
    category: 'عام',
    description: 'Access to home page'
  },
  { 
    id: 'view_dashboard', 
    name: 'View Dashboard', 
    name_ar: 'عرض لوحة التحكم', 
    category: 'عام',
    description: 'Access to main dashboard and statistics'
  },
  { 
    id: 'view_user_dashboard', 
    name: 'View User Dashboard', 
    name_ar: 'عرض لوحة تحكم المستخدم', 
    category: 'عام',
    description: 'Access to personal user dashboard'
  },
  { 
    id: 'view_notifications', 
    name: 'View Notifications', 
    name_ar: 'عرض الإشعارات', 
    category: 'عام',
    description: 'View system notifications'
  },
  
  // Orders
  { 
    id: 'manage_orders', 
    name: 'Manage Orders', 
    name_ar: 'إدارة الطلبات', 
    category: 'الطلبات',
    description: 'Create, edit, delete orders'
  },
  
  // Production
  { 
    id: 'view_production', 
    name: 'View Production', 
    name_ar: 'عرض الإنتاج', 
    category: 'الإنتاج',
    description: 'View production data and queues'
  },
  { 
    id: 'manage_production', 
    name: 'Manage Production', 
    name_ar: 'إدارة الإنتاج', 
    category: 'الإنتاج',
    description: 'Create and manage production orders'
  },
  { 
    id: 'view_film_dashboard', 
    name: 'View Film Operator Dashboard', 
    name_ar: 'عرض لوحة عامل الفيلم', 
    category: 'الإنتاج',
    description: 'Access to film production operator dashboard'
  },
  { 
    id: 'view_printing_dashboard', 
    name: 'View Printing Operator Dashboard', 
    name_ar: 'عرض لوحة عامل الطباعة', 
    category: 'الإنتاج',
    description: 'Access to printing operator dashboard'
  },
  { 
    id: 'view_cutting_dashboard', 
    name: 'View Cutting Operator Dashboard', 
    name_ar: 'عرض لوحة عامل التقطيع', 
    category: 'الإنتاج',
    description: 'Access to cutting operator dashboard'
  },
  
  // Maintenance
  { 
    id: 'view_maintenance', 
    name: 'View Maintenance', 
    name_ar: 'عرض الصيانة', 
    category: 'الصيانة',
    description: 'View maintenance reports'
  },
  { 
    id: 'manage_maintenance', 
    name: 'Manage Maintenance', 
    name_ar: 'إدارة الصيانة', 
    category: 'الصيانة',
    description: 'Create and manage maintenance requests'
  },
  
  // Quality
  { 
    id: 'view_quality', 
    name: 'View Quality', 
    name_ar: 'عرض الجودة', 
    category: 'الجودة',
    description: 'View quality reports'
  },
  { 
    id: 'manage_quality', 
    name: 'Manage Quality', 
    name_ar: 'إدارة الجودة', 
    category: 'الجودة',
    description: 'Manage quality control and reports'
  },
  
  // Inventory & Warehouse
  { 
    id: 'view_inventory', 
    name: 'View Inventory', 
    name_ar: 'عرض المخزون', 
    category: 'المخزون',
    description: 'View inventory levels'
  },
  { 
    id: 'manage_inventory', 
    name: 'Manage Inventory', 
    name_ar: 'إدارة المخزون', 
    category: 'المخزون',
    description: 'Manage inventory and warehouse'
  },
  { 
    id: 'view_warehouse', 
    name: 'View Warehouse', 
    name_ar: 'عرض المستودع', 
    category: 'المخزون',
    description: 'View warehouse data'
  },
  { 
    id: 'manage_warehouse', 
    name: 'Manage Warehouse', 
    name_ar: 'إدارة المستودع', 
    category: 'المخزون',
    description: 'Manage warehouse operations'
  },
  
  // Users
  { 
    id: 'manage_users', 
    name: 'Manage Users', 
    name_ar: 'إدارة المستخدمين', 
    category: 'المستخدمين',
    description: 'Create, edit, delete users'
  },
  
  // HR
  { 
    id: 'view_hr', 
    name: 'View HR', 
    name_ar: 'عرض الموارد البشرية', 
    category: 'الموارد البشرية',
    description: 'View HR data and employee information'
  },
  { 
    id: 'manage_hr', 
    name: 'Manage HR', 
    name_ar: 'إدارة الموارد البشرية', 
    category: 'الموارد البشرية',
    description: 'Full HR management including all HR functions'
  },
  { 
    id: 'view_attendance', 
    name: 'View Attendance', 
    name_ar: 'عرض الحضور والانصراف', 
    category: 'الموارد البشرية',
    description: 'View employee attendance records'
  },
  { 
    id: 'manage_attendance', 
    name: 'Manage Attendance', 
    name_ar: 'إدارة الحضور والانصراف', 
    category: 'الموارد البشرية',
    description: 'Record and modify attendance, overtime, and breaks'
  },
  { 
    id: 'view_attendance_reports', 
    name: 'View Attendance Reports', 
    name_ar: 'عرض تقارير الحضور', 
    category: 'الموارد البشرية',
    description: 'View attendance statistics and reports'
  },
  { 
    id: 'manage_leaves', 
    name: 'Manage Leaves', 
    name_ar: 'إدارة الإجازات', 
    category: 'الموارد البشرية',
    description: 'Approve and manage employee leave requests'
  },
  { 
    id: 'view_training', 
    name: 'View Training', 
    name_ar: 'عرض التدريب', 
    category: 'الموارد البشرية',
    description: 'View training programs and schedules'
  },
  { 
    id: 'manage_training', 
    name: 'Manage Training', 
    name_ar: 'إدارة التدريب', 
    category: 'الموارد البشرية',
    description: 'Create and manage training programs'
  },
  
  // Reports & Analytics
  { 
    id: 'view_reports', 
    name: 'View Reports', 
    name_ar: 'عرض التقارير', 
    category: 'التقارير',
    description: 'View system reports and analytics'
  },
  { 
    id: 'manage_analytics', 
    name: 'Manage Analytics', 
    name_ar: 'إدارة التحليلات', 
    category: 'التقارير',
    description: 'Manage advanced analytics and ML features'
  },
  { 
    id: 'view_production_monitoring', 
    name: 'View Production Monitoring', 
    name_ar: 'عرض مراقبة الإنتاج', 
    category: 'التقارير',
    description: 'View real-time production monitoring'
  },
  
  // Alerts & Monitoring
  { 
    id: 'view_alerts', 
    name: 'View Alerts', 
    name_ar: 'عرض التنبيهات', 
    category: 'المراقبة',
    description: 'View system alerts'
  },
  { 
    id: 'manage_alerts', 
    name: 'Manage Alerts', 
    name_ar: 'إدارة التنبيهات', 
    category: 'المراقبة',
    description: 'Manage system alerts and rules'
  },
  { 
    id: 'view_system_health', 
    name: 'View System Health', 
    name_ar: 'عرض صحة النظام', 
    category: 'المراقبة',
    description: 'View system health monitoring'
  },
  
  // System
  { 
    id: 'manage_settings', 
    name: 'Manage Settings', 
    name_ar: 'إدارة الإعدادات', 
    category: 'النظام',
    description: 'Modify system settings'
  },
  { 
    id: 'manage_definitions', 
    name: 'Manage Definitions', 
    name_ar: 'إدارة التعريفات', 
    category: 'النظام',
    description: 'Manage system definitions and master data'
  },
  { 
    id: 'manage_roles', 
    name: 'Manage Roles', 
    name_ar: 'إدارة الأدوار', 
    category: 'النظام',
    description: 'Create and modify user roles'
  },
  
  // WhatsApp Integration
  { 
    id: 'manage_whatsapp', 
    name: 'Manage WhatsApp', 
    name_ar: 'إدارة الواتساب', 
    category: 'التكامل',
    description: 'Manage WhatsApp integration and settings'
  },
  
  // Material Mixing
  { 
    id: 'view_mixing', 
    name: 'View Material Mixing', 
    name_ar: 'عرض خلط المواد', 
    category: 'الإنتاج',
    description: 'View material mixing batches and formulas'
  },
  { 
    id: 'manage_mixing', 
    name: 'Manage Material Mixing', 
    name_ar: 'إدارة خلط المواد', 
    category: 'الإنتاج',
    description: 'Create and manage material mixing batches'
  },
  
  // System Monitoring
  { 
    id: 'view_system_monitoring', 
    name: 'View System Monitoring', 
    name_ar: 'عرض مراقبة النظام', 
    category: 'المراقبة',
    description: 'View system monitoring and performance'
  },
  
  // Tools
  { 
    id: 'view_tools', 
    name: 'View Tools', 
    name_ar: 'عرض الأدوات', 
    category: 'عام',
    description: 'Access to production tools and utilities'
  },
  
  // Production Reports
  { 
    id: 'view_production_reports', 
    name: 'View Production Reports', 
    name_ar: 'عرض تقارير الإنتاج', 
    category: 'التقارير',
    description: 'View production reports and statistics'
  },
  
  // Orders View
  { 
    id: 'view_orders', 
    name: 'View Orders', 
    name_ar: 'عرض الطلبات', 
    category: 'الطلبات',
    description: 'View orders without editing permissions'
  },
  
  // AI Agent
  { 
    id: 'view_ai_agent', 
    name: 'View AI Agent', 
    name_ar: 'عرض الوكيل الذكي', 
    category: 'الوكيل الذكي',
    description: 'Access to view AI agent interface'
  },
  { 
    id: 'use_ai_agent', 
    name: 'Use AI Agent', 
    name_ar: 'استخدام الوكيل الذكي', 
    category: 'الوكيل الذكي',
    description: 'Use AI agent chat and tools'
  },
  { 
    id: 'manage_ai_agent', 
    name: 'Manage AI Agent', 
    name_ar: 'إدارة الوكيل الذكي', 
    category: 'الوكيل الذكي',
    description: 'Manage AI agent settings and knowledge base'
  },
  
  // Admin
  { 
    id: 'admin', 
    name: 'Administrator', 
    name_ar: 'مدير النظام', 
    category: 'النظام',
    description: 'Full system access'
  }
];

// Route to permission mapping
// NOTE: Routes that redirect immediately (like /production-queues -> /orders) are not included here
// because permission check happens on the target route, not the redirect source
export const ROUTE_PERMISSIONS: Record<string, PermissionKey[]> = {
  // Main pages
  '/': ['view_home', 'view_dashboard'],
  '/dashboard': ['view_dashboard'],
  '/orders': ['view_orders', 'manage_orders'],
  '/production': ['view_production', 'manage_production'],
  '/production-dashboard': ['view_production', 'manage_production', 'view_film_dashboard', 'view_printing_dashboard', 'view_cutting_dashboard'],
  '/maintenance': ['view_maintenance', 'manage_maintenance'],
  '/quality': ['view_quality', 'manage_quality'],
  '/warehouse': ['view_warehouse', 'manage_warehouse'],
  '/inventory': ['view_inventory', 'manage_inventory'],
  '/hr': ['view_hr', 'manage_hr'],
  '/reports': ['view_reports', 'view_production_reports'],
  '/settings': ['manage_settings', 'admin'],
  '/definitions': ['manage_definitions', 'admin'],
  '/users': ['manage_users'],
  '/user-dashboard': ['view_user_dashboard'],
  '/notifications': ['view_notifications'],
  
  // Production sub-pages
  '/production-orders-management': ['view_production', 'manage_production'],
  '/production-queues': ['view_production', 'manage_production', 'view_orders', 'manage_orders'],
  '/roll-search': ['view_production', 'manage_production'],
  '/production-reports': ['view_production_reports', 'view_reports', 'view_production'],
  
  // Operator dashboards
  '/film-operator': ['view_film_dashboard', 'view_production', 'manage_production'],
  '/printing-operator': ['view_printing_dashboard', 'view_production', 'manage_production'],
  '/cutting-operator': ['view_cutting_dashboard', 'view_production', 'manage_production'],
  
  // Monitoring and alerts
  '/alerts': ['view_alerts', 'manage_alerts'],
  '/system-health': ['view_system_health'],
  '/system-monitoring': ['view_system_monitoring', 'view_system_health', 'admin'],
  '/production-monitoring': ['view_production_monitoring', 'view_production'],
  
  // Tools and utilities
  '/tools': ['view_tools', 'view_production', 'manage_production'],
  '/material-mixing': ['view_mixing', 'manage_mixing', 'view_production'],
  
  // Factory simulation
  '/factory-simulation': ['view_production', 'manage_production', 'admin'],
  
  // WhatsApp integration
  '/meta-whatsapp-setup': ['manage_whatsapp', 'admin'],
  '/whatsapp-setup': ['manage_whatsapp', 'admin'],
  '/whatsapp-test': ['manage_whatsapp', 'admin'],
  '/whatsapp-troubleshoot': ['manage_whatsapp', 'admin'],
  '/whatsapp-production-setup': ['manage_whatsapp', 'admin'],
  '/whatsapp-final-setup': ['manage_whatsapp', 'admin'],
  '/twilio-content': ['manage_whatsapp', 'admin'],
  '/whatsapp-template-test': ['manage_whatsapp', 'admin'],
  '/whatsapp-webhooks': ['manage_whatsapp', 'admin'],
  
  // AI Agent
  '/ai-agent': ['view_ai_agent', 'use_ai_agent'],
  '/ai-agent-settings': ['manage_ai_agent', 'admin'],
};

// Settings tabs permissions
export const SETTINGS_TAB_PERMISSIONS: Record<string, PermissionKey[]> = {
  'roles': ['manage_roles', 'admin'],
  'notifications': ['manage_settings', 'admin'],
  'system': ['manage_settings', 'admin'],
  'database': ['admin'],
  'location': ['manage_settings', 'admin'],
  'notification-center': ['manage_settings', 'admin'],
  'whatsapp-webhooks': ['manage_whatsapp', 'admin'],
  'notification-events': ['manage_settings', 'admin'],
  'user': [],
};

// Helper function to check if user has permission
export function hasPermission(
  userPermissions: string[] | undefined | null,
  requiredPermissions: PermissionKey | PermissionKey[],
  requireAll: boolean = false
): boolean {
  if (!userPermissions) return false;
  
  // Admin has all permissions
  if (userPermissions.includes('admin')) return true;
  
  const required = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];
  
  if (requireAll) {
    // User must have ALL required permissions
    return required.every(perm => userPermissions.includes(perm));
  } else {
    // User needs at least ONE of the required permissions
    return required.some(perm => userPermissions.includes(perm));
  }
}

// Helper function to filter permissions by category
export function getPermissionsByCategory(category: string): Permission[] {
  return PERMISSIONS.filter(p => p.category === category);
}

// Helper function to get permission details
export function getPermission(id: PermissionKey): Permission | undefined {
  return PERMISSIONS.find(p => p.id === id);
}

// Helper function to validate permissions array
export function validatePermissions(permissions: string[]): PermissionKey[] {
  const validKeys = PERMISSIONS.map(p => p.id);
  return permissions.filter(p => validKeys.includes(p as PermissionKey)) as PermissionKey[];
}

// Export permission groups for UI organization
export const PERMISSION_CATEGORIES = [
  'عام',
  'الطلبات', 
  'الإنتاج',
  'الصيانة',
  'الجودة',
  'المخزون',
  'المستخدمين',
  'الموارد البشرية',
  'التقارير',
  'المراقبة',
  'التكامل',
  'الوكيل الذكي',
  'النظام'
];