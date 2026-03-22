import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import multer from "multer";
import ExcelJS from "exceljs";

// Helper: add a sheet from an array of objects to a workbook
function addJsonSheet(workbook: ExcelJS.Workbook, data: any[], sheetName: string, colWidths?: number[]) {
  const worksheet = workbook.addWorksheet(sheetName);
  if (data.length > 0) {
    const headers = Object.keys(data[0]);
    if (colWidths) {
      worksheet.columns = headers.map((h, i) => ({ header: h, key: h, width: colWidths[i] ?? 15 }));
    } else {
      worksheet.addRow(headers);
    }
    for (const row of data) {
      worksheet.addRow(headers.map(h => row[h] ?? ""));
    }
  }
  return worksheet;
}

// Helper: parse the first sheet of an Excel buffer into an array of objects
async function parseExcelBuffer(buffer: Buffer): Promise<Record<string, any>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  const rows: Record<string, any>[] = [];
  const headers: string[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      (row.values as any[]).forEach((val, idx) => {
        if (idx > 0) headers.push(String(val ?? ""));
      });
    } else {
      const obj: Record<string, any> = {};
      const vals = row.values as any[];
      headers.forEach((h, i) => {
        obj[h] = vals[i + 1] ?? null;
      });
      rows.push(obj);
    }
  });
  return rows;
}
import { requireAuth, requirePermission, requireAdmin, type AuthRequest } from "./middleware/auth";
import { generateMobileToken, revokeMobileToken, invalidateRolesCache, getCachedRoles } from "./middleware/session-auth";
import { logger } from "./lib/logger";

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

function getAuthUserId(req: any): number | undefined {
  return req.user?.id ?? req.session?.userId;
}

// Extend Express Request type to include session
declare module "express-serve-static-core" {
  interface Request {
    session: {
      userId?: number;
      [key: string]: any;
      destroy?: (callback: (err?: any) => void) => void;
    };
  }
}
import { storage } from "./storage";
import { db } from "./db";
import {
  insertUserSchema,
  insertNewOrderSchema,
  insertProductionOrderSchema,
  insertRollSchema,
  insertMaintenanceRequestSchema,
  insertMaintenanceActionSchema,
  insertMaintenanceReportSchema,
  insertOperatorNegligenceReportSchema,
  insertConsumablePartSchema,
  insertConsumablePartTransactionSchema,
  insertInventoryMovementSchema,
  insertInventorySchema,
  insertCutSchema,
  insertWarehouseReceiptSchema,
  insertProductionSettingsSchema,
  insertCustomerProductSchema,
  insertMasterBatchColorSchema,
  customers,
  customer_products,
  locations,
  users,
  attendance,
  factory_layouts,
  factory_snapshots,
  insertFactorySnapshotSchema,
  notifications as notificationsTable,
  insertDisplaySlideSchema,
  user_settings,
  roles,
  inventory,
  items,
} from "@shared/schema";
import { eq, sql, and, gte, lte } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

import { z } from "zod";
import {
  parseIntSafe,
  parseFloatSafe,
  coercePositiveInt,
  coerceNonNegativeInt,
  extractNumericId,
  generateNextId,
} from "@shared/validation-utils";

// Helper functions for safe route parameter parsing
const parseRouteParam = (
  param: string | undefined,
  paramName: string,
): number => {
  if (!param) {
    throw new Error(`${paramName} parameter is required`);
  }
  return parseIntSafe(param, paramName, { min: 1 });
};

const parseOptionalQueryParam = (
  param: any,
  paramName: string,
  defaultValue: number,
): number => {
  if (!param) return defaultValue;
  try {
    return parseIntSafe(param, paramName, { min: 1 });
  } catch {
    return defaultValue;
  }
};

// Helper function to check if an order is paused and block production
const checkOrderNotPaused = async (productionOrderId: number): Promise<{ isPaused: boolean; notFound?: boolean; orderStatus?: string; message?: string }> => {
  try {
    const productionOrder = await storage.getProductionOrderById(productionOrderId);
    if (!productionOrder) {
      return { isPaused: true, notFound: true, message: "أمر الإنتاج غير موجود" };
    }
    
    const order = await storage.getOrderById(productionOrder.order_id);
    if (!order) {
      return { isPaused: true, notFound: true, message: "الطلب المرتبط بأمر الإنتاج غير موجود" };
    }
    
    if (order.status === "paused") {
      return { 
        isPaused: true, 
        orderStatus: order.status,
        message: "الطلب معلق مؤقتاً - لا يمكن إضافة إنتاج جديد"
      };
    }
    
    return { isPaused: false };
  } catch (error) {
    console.error("Error checking order status:", error);
    return { isPaused: true, message: "خطأ في التحقق من حالة الطلب" };
  }
};

const insertCustomerSchema = createInsertSchema(customers)
  .omit({ id: true, created_at: true })
  .extend({
    sales_rep_id: z
      .union([z.string(), z.number(), z.null()])
      .optional()
      .transform((val) => {
        if (val === "" || val === null || val === undefined) return null;
        if (typeof val === "number") return val;
        try {
          return parseIntSafe(val as string, "Sales Rep ID", { min: 1 });
        } catch {
          return null; // Return null for invalid values instead of NaN
        }
      }),
  });
const insertLocationSchema = createInsertSchema(locations).omit({ id: true });
import { NotificationService } from "./services/notification-service";
import { TaqnyatSMSService } from "./services/taqnyat-sms";
import {
  getNotificationManager,
  type SystemNotificationData,
} from "./services/notification-manager";
import { setNotificationManager } from "./storage";
import {
  createPerformanceIndexes,
  createTextSearchIndexes,
} from "./database-optimizations";
import {
  createAlertsRouter,
  createSystemHealthRouter,
  createPerformanceRouter,
  createCorrectiveActionsRouter,
  createDataValidationRouter,
} from "./routes/alerts";
import { getSystemHealthMonitor } from "./services/system-health-monitor";
import { getAlertManager } from "./services/alert-manager";
import { getDataValidator } from "./services/data-validator";
import QRCode from "qrcode";
import {
  validateRequest,
  commonSchemas,
} from "./middleware/validation";
import { calculateProductionQuantities } from "@shared/quantity-utils";
import { setupAuth, isAuthenticated as isAuthenticatedReplit } from "./replitAuth";
import { resolveSessionUser } from "./auth/sessionUser";
import { registerAiAgentRoutes } from "./ai-agent-routes";

// Initialize notification service
const notificationService = new NotificationService(storage);

// Initialize Taqnyat SMS service
const taqnyatSMS = new TaqnyatSMSService(storage);

// Initialize notification manager (singleton)
let notificationManager: ReturnType<typeof getNotificationManager> | null =
  null;

export async function registerRoutes(app: Express, existingServer?: Server): Promise<Server> {
  // Setup Replit Auth (OpenID Connect)
  await setupAuth(app);
  
  // Register AI Agent routes
  registerAiAgentRoutes(app);

  // Register Object Storage routes (serves /objects/* for uploaded files)
  const { registerObjectStorageRoutes } = await import("./replit_integrations/object_storage");
  registerObjectStorageRoutes(app);
  
  // Replit Auth user endpoint
  app.get('/api/auth/user', isAuthenticatedReplit, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUserByReplitId(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      logger.error("Error fetching Replit auth user", error);
      console.error("[API Error]", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Authentication routes
  app.post(
    "/api/login",
    validateRequest({ body: commonSchemas.loginCredentials }),
    async (req, res) => {
      try {
        const { username, password } = req.body;

        // Enhanced validation
        if (!username?.trim() || !password?.trim()) {
          return res
            .status(400)
            .json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
        }

        const user = await storage.getUserByUsername(username.trim());
        if (!user) {
          return res
            .status(401)
            .json({ message: "بيانات تسجيل الدخول غير صحيحة" });
        }

        // Enhanced null checks for user properties
        if (!user.password) {
          logger.error("User found but password is null or undefined");
          return res
            .status(401)
            .json({ message: "بيانات تسجيل الدخول غير صحيحة" });
        }

        // Check password using bcrypt for security
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "بيانات تسجيل الدخول غير صحيحة" });
        }

        if (user.status !== "active") {
          return res
            .status(401)
            .json({ message: "بيانات تسجيل الدخول غير صحيحة" });
        }

        // Get role information before saving session
        let roleName = "user";
        let roleNameAr = "مستخدم";
        let permissions: string[] = [];

        if (user.role_id) {
          const roles = await getCachedRoles();
          const userRole = roles.find(r => r.id === user.role_id);

          if (userRole) {
            roleName = userRole.name || "user";
            roleNameAr = userRole.name_ar || "مستخدم";

            if (userRole.permissions) {
              try {
                if (Array.isArray(userRole.permissions)) {
                  permissions = userRole.permissions;
                } else if (typeof userRole.permissions === 'string') {
                  const parsed = JSON.parse(userRole.permissions);
                  permissions = Array.isArray(parsed) ? parsed : [];
                }
              } catch (e) {
                if (typeof userRole.permissions === 'string' && (userRole.permissions as string).trim()) {
                  permissions = [(userRole.permissions as string).trim()];
                } else {
                  permissions = [];
                }
              }
            }
          }
        }

        // Save user session with explicit save callback
        req.session.userId = user.id;

        // Ensure session is saved before responding with additional reliability measures
        req.session.save((err: any) => {
          if (err) {
            logger.error("Session save error", err);
            return res.status(500).json({ message: "خطأ في حفظ الجلسة" });
          }

          // Force session persistence for MemoryStore reliability
          if (req.session?.touch) {
            req.session.touch();
          }

          logger.session("created and saved", user.id);

          // Session saved successfully - include role and permissions to match /api/me response
          res.json({
            user: {
              id: user.id ?? null,
              username: user.username ?? "",
              display_name: user.display_name ?? "",
              display_name_ar: user.display_name_ar ?? "",
              role_id: user.role_id ?? null,
              role_name: roleName,
              role_name_ar: roleNameAr,
              section_id: user.section_id ?? null,
              permissions: permissions,
            },
          });
        });
      } catch (error) {
        logger.error("Login error", error);
        console.error("[API Error]", error);
        res.status(500).json({ message: "خطأ في الخادم" });
      }
    },
  );

  // Get current user - unified endpoint for both username/password and Replit Auth
  app.get("/api/me", async (req, res) => {
    try {
      // Use unified session resolver to handle both auth types
      const user = await resolveSessionUser(req);
      
      if (!user) {
        logger.debug("No authenticated session on /api/me");
        return res.status(401).json({
          message: "Unauthorized",
          success: false,
        });
      }

      // Extend session safely
      try {
        if (req.session?.touch) {
          req.session.touch();
        }

        // Save session to ensure it persists (non-blocking)
        if (req.session?.save) {
          req.session.save((err: any) => {
            if (err) {
              logger.error("Error saving session on /api/me", err);
              // Continue anyway, don't break the response
            }
          });
        }
      } catch (sessionError) {
        logger.error("Session management error", sessionError);
        // Don't fail the request for session issues
      }

      // Get role information
      let roleName = "user";
      let roleNameAr = "مستخدم";
      let permissions: string[] = [];
      
      if (user.role_id) {
        const roles = await getCachedRoles();
        const userRole = roles.find(r => r.id === user.role_id);
        
        if (userRole) {
          roleName = userRole.name || "user";
          roleNameAr = userRole.name_ar || "مستخدم";
          
          if (userRole.permissions) {
            try {
              if (Array.isArray(userRole.permissions)) {
                permissions = userRole.permissions;
              } else if (typeof userRole.permissions === 'string') {
                const parsed = JSON.parse(userRole.permissions);
                permissions = Array.isArray(parsed) ? parsed : [];
              }
            } catch (e) {
              if (typeof userRole.permissions === 'string' && (userRole.permissions as string).trim()) {
                permissions = [(userRole.permissions as string).trim()];
              } else {
                permissions = [];
              }
            }
          }
        }
      }

      // Return sanitized user data with role information
      const userData = {
        id: user.id ?? null,
        username: user.username ?? "",
        display_name: user.display_name ?? "",
        display_name_ar: user.display_name_ar ?? "",
        role_id: user.role_id ?? null,
        role_name: roleName,
        role_name_ar: roleNameAr,
        section_id: user.section_id ?? null,
        permissions: permissions,
      };

      res.json({
        user: userData,
        success: true,
      });
    } catch (error) {
      logger.error("Get current user error", error);
      console.error("[API Error]", error);
      res.status(500).json({
        message: "خطأ في الخادم",
        success: false,
      });
    }
  });

  // Logout - unified endpoint for both username/password and Replit Auth
  app.post("/api/logout", async (req, res) => {
    try {
      // Check if user is authenticated via Replit Auth
      const replitUser = req.user as any;
      const isReplitAuth = replitUser?.claims?.sub;

      // Destroy session
      if (req.session?.destroy) {
        req.session.destroy((err) => {
          if (err) {
            logger.error("Session destroy error", err);
            return res.status(500).json({ message: "خطأ في تسجيل الخروج" });
          }
          
          // Clear all possible session cookies
          res.clearCookie("connect.sid");
          res.clearCookie("plastic-bag-session");
          
          // For Replit Auth users, also call passport logout
          if (isReplitAuth && req.logout) {
            req.logout(() => {
              res.json({ 
                message: "تم تسجيل الخروج بنجاح",
                replitAuth: true 
              });
            });
          } else {
            res.json({ message: "تم تسجيل الخروج بنجاح" });
          }
        });
      } else {
        // Fallback session clearing
        req.session = {} as any;
        res.clearCookie("connect.sid");
        res.clearCookie("plastic-bag-session");
        
        if (isReplitAuth && req.logout) {
          req.logout(() => {
            res.json({ 
              message: "تم تسجيل الخروج بنجاح",
              replitAuth: true 
            });
          });
        } else {
          res.json({ message: "تم تسجيل الخروج بنجاح" });
        }
      }
    } catch (error) {
      logger.error("Logout error", error);
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تسجيل الخروج" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      logger.error("Dashboard stats error", error);
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب الإحصائيات" });
    }
  });

  // Dashboard config - per-user widget configuration
  app.get("/api/dashboard/config", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const setting = await db
        .select()
        .from(user_settings)
        .where(
          and(
            eq(user_settings.user_id, String(userId)),
            eq(user_settings.setting_key, "dashboard_config")
          )
        )
        .limit(1);

      const VALID_WIDGET_IDS = new Set([
        "dashboard_stats", "machine_status", "recent_rolls", "attendance_stats",
        "quick_notes", "shortcuts", "inventory_widget", "quotes_widget",
        "attendance_widget", "recent_orders_widget", "production_progress_widget",
        "maintenance_widget"
      ]);

      if (setting.length > 0 && setting[0].setting_value) {
        try {
          const config = JSON.parse(setting[0].setting_value);
          if (Array.isArray(config.widgets)) {
            config.widgets = config.widgets.filter((w: string) => VALID_WIDGET_IDS.has(w));
          }
          return res.json(config);
        } catch {
          // Invalid JSON, return default
        }
      }

      // Return default config based on user role
      const userResult = await db
        .select({ role_id: users.role_id, permissions: roles.permissions })
        .from(users)
        .leftJoin(roles, eq(users.role_id, roles.id))
        .where(eq(users.id, userId))
        .limit(1);

      const userPerms: string[] = (userResult[0]?.permissions as string[]) || [];
      const isAdmin = userPerms.includes("admin");

      let defaultWidgets: string[];

      if (isAdmin) {
        defaultWidgets = [
          "dashboard_stats", "recent_orders_widget", "production_progress_widget",
          "machine_status", "inventory_widget", "attendance_widget",
          "maintenance_widget", "shortcuts", "quick_notes"
        ];
      } else if (userPerms.includes("manage_production") || userPerms.includes("view_production")) {
        defaultWidgets = [
          "dashboard_stats", "recent_orders_widget", "production_progress_widget",
          "machine_status", "recent_rolls", "shortcuts"
        ];
      } else if (userPerms.includes("manage_hr") || userPerms.includes("view_hr")) {
        defaultWidgets = [
          "attendance_stats", "attendance_widget", "shortcuts", "quick_notes"
        ];
      } else if (userPerms.includes("manage_warehouse") || userPerms.includes("view_warehouse")) {
        defaultWidgets = [
          "inventory_widget", "recent_orders_widget", "shortcuts", "quick_notes"
        ];
      } else if (userPerms.includes("manage_orders") || userPerms.includes("manage_customers")) {
        defaultWidgets = [
          "recent_orders_widget", "quotes_widget", "dashboard_stats", "shortcuts"
        ];
      } else {
        defaultWidgets = [
          "dashboard_stats", "shortcuts", "quick_notes"
        ];
      }

      res.json({ widgets: defaultWidgets });
    } catch (error) {
      logger.error("Dashboard config error", error);
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب إعدادات لوحة التحكم" });
    }
  });

  app.put("/api/dashboard/config", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { widgets } = req.body;
      if (!Array.isArray(widgets)) {
        return res.status(400).json({ message: "widgets must be an array" });
      }

      const VALID_WIDGET_IDS = new Set([
        "dashboard_stats", "machine_status", "recent_rolls", "attendance_stats",
        "quick_notes", "shortcuts", "inventory_widget", "quotes_widget",
        "attendance_widget", "recent_orders_widget", "production_progress_widget",
        "maintenance_widget"
      ]);
      const validWidgets = widgets.filter((w: string) => typeof w === "string" && VALID_WIDGET_IDS.has(w));

      const configJson = JSON.stringify({ widgets: validWidgets });

      const existing = await db
        .select()
        .from(user_settings)
        .where(
          and(
            eq(user_settings.user_id, String(userId)),
            eq(user_settings.setting_key, "dashboard_config")
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(user_settings)
          .set({ setting_value: configJson, setting_type: "json", updated_at: new Date() })
          .where(eq(user_settings.id, existing[0].id));
      } else {
        await db.insert(user_settings).values({
          user_id: String(userId),
          setting_key: "dashboard_config",
          setting_value: configJson,
          setting_type: "json",
        });
      }

      res.json({ success: true, widgets: validWidgets });
    } catch (error) {
      logger.error("Dashboard config save error", error);
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حفظ إعدادات لوحة التحكم" });
    }
  });

  // ==== NOTIFICATIONS API ROUTES ====

  // Send WhatsApp message (Meta API or Twilio)
  app.post(
    "/api/notifications/whatsapp",
    requireAuth,
    validateRequest({ body: commonSchemas.whatsappMessage }),
    async (req, res) => {
      try {
        const {
          phone_number,
          message,
          title,
          priority,
          context_type,
          context_id,
          template_name,
          variables,
          use_template = false,
        } = req.body;

        let result;
        try {
          result = await notificationService.sendWhatsAppMessage(
            phone_number,
            message,
            {
              title,
              priority,
              context_type,
              context_id,
              useTemplate: use_template,
              templateName: template_name,
            },
          );
        } catch (serviceError: any) {
          logger.error("Notification service error", serviceError);
          return res.status(503).json({
            message: "خدمة الإشعارات غير متوفرة مؤقتاً",
            success: false,
            error: "SERVICE_UNAVAILABLE",
          });
        }

        if (!result) {
          return res.status(500).json({
            message: "لم يتم الحصول على رد من خدمة الإشعارات",
            success: false,
          });
        }

        if (result.success) {
          res.json({
            data: {
              messageId: result.messageId,
              phone_number,
              message:
                message.substring(0, 100) + (message.length > 100 ? "..." : ""),
              timestamp: new Date().toISOString(),
            },
            message: "تم إرسال رسالة الواتس اب بنجاح",
            success: true,
          });
        } else {
          // Handle specific notification service errors
          let statusCode = 500;
          let errorMessage = "فشل في إرسال رسالة الواتس اب";

          if (result.error?.includes("Invalid phone number")) {
            statusCode = 400;
            errorMessage = "رقم الهاتف غير صحيح";
          } else if (result.error?.includes("Rate limit")) {
            statusCode = 429;
            errorMessage = "تم تجاوز حد عدد الرسائل المسموح";
          } else if (result.error?.includes("Template not found")) {
            statusCode = 404;
            errorMessage = "قالب الرسالة غير موجود";
          }

          res.status(statusCode).json({
            message: errorMessage,
            error: result.error,
            success: false,
          });
        }
      } catch (error: any) {
        logger.error("Error sending WhatsApp message", error);

        // Handle different types of errors gracefully
        if (error.name === "ValidationError") {
          return res.status(400).json({
            message: "بيانات الطلب غير صحيحة",
            success: false,
          });
        }

        if (error.message?.includes("timeout")) {
          return res.status(504).json({
            message: "انتهت مهلة الاتصال بخدمة الواتس اب",
            success: false,
          });
        }

        res.status(500).json({
          message: "خطأ غير متوقع في إرسال رسالة الواتس اب",
          success: false,
        });
      }
    },
  );

  // Send test message
  app.post("/api/notifications/test", requireAuth, async (req, res) => {
    try {
      const { phone_number } = req.body;

      if (!phone_number) {
        return res.status(400).json({ message: "رقم الهاتف مطلوب" });
      }

      const result = await notificationService.sendTestMessage(phone_number);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error("Error sending test message", error);
      res.status(500).json({ message: "خطأ في إرسال رسالة الاختبار" });
    }
  });

  // ==== TAQNYAT SMS API ROUTES ====

  app.post(
    "/api/sms/send",
    requireAuth,
    validateRequest({ body: commonSchemas.smsMessage }),
    async (req, res) => {
      try {
        const {
          phone_number,
          message,
          recipients,
          title,
          priority,
          context_type,
          context_id,
          scheduled,
          sender_name,
        } = req.body;

        const allRecipients = recipients && recipients.length > 0
          ? recipients
          : [phone_number];

        const result = await taqnyatSMS.sendSMS(allRecipients, message, {
          title,
          priority,
          context_type,
          context_id,
          scheduled,
          senderName: sender_name,
        });

        if (result.success) {
          res.json({
            success: true,
            data: {
              messageId: result.messageId,
              recipients: allRecipients,
              message: message.substring(0, 100) + (message.length > 100 ? "..." : ""),
              timestamp: new Date().toISOString(),
            },
            message: "تم إرسال الرسالة النصية بنجاح",
          });
        } else {
          let statusCode = 500;
          let errorMessage = "فشل في إرسال الرسالة النصية";

          if (result.error?.includes("invalid credentials")) {
            statusCode = 401;
            errorMessage = "مفتاح API غير صحيح";
          } else if (result.statusCode === 422) {
            statusCode = 400;
            errorMessage = "بيانات الرسالة غير صحيحة";
          }

          res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: result.error,
          });
        }
      } catch (error: any) {
        logger.error("Error sending SMS", error);
        res.status(500).json({
          success: false,
          message: "خطأ غير متوقع في إرسال الرسالة النصية",
        });
      }
    }
  );

  app.post("/api/sms/test", requireAuth, async (req, res) => {
    try {
      const { phone_number } = req.body;
      if (!phone_number) {
        return res.status(400).json({ success: false, message: "رقم الهاتف مطلوب" });
      }

      const result = await taqnyatSMS.sendSMS(
        phone_number,
        "رسالة اختبار من نظام MPBF - تم إرسالها بنجاح عبر خدمة تقنيات ✅",
        { title: "اختبار SMS" }
      );

      if (result.success) {
        res.json({
          success: true,
          message: "تم إرسال رسالة الاختبار بنجاح",
          messageId: result.messageId,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "فشل في إرسال رسالة الاختبار",
          error: result.error,
        });
      }
    } catch (error: any) {
      logger.error("Error sending SMS test", error);
      res.status(500).json({ success: false, message: "خطأ في إرسال رسالة الاختبار" });
    }
  });

  app.get("/api/sms/balance", requireAuth, async (req, res) => {
    try {
      const result = await taqnyatSMS.getBalance();
      if (result.success) {
        res.json({
          success: true,
          balance: result.balance,
          currency: result.currency,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || "فشل في جلب الرصيد",
        });
      }
    } catch (error: any) {
      logger.error("Error fetching SMS balance", error);
      res.status(500).json({ success: false, message: "خطأ في جلب رصيد الرسائل" });
    }
  });

  app.get("/api/sms/senders", requireAuth, async (req, res) => {
    try {
      const result = await taqnyatSMS.getSenders();
      if (result.success) {
        res.json({
          success: true,
          senders: result.senders,
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.error || "فشل في جلب أسماء المرسلين",
        });
      }
    } catch (error: any) {
      logger.error("Error fetching SMS senders", error);
      res.status(500).json({ success: false, message: "خطأ في جلب أسماء المرسلين" });
    }
  });

  app.get("/api/sms/status", requireAuth, async (req, res) => {
    try {
      const isConfigured = taqnyatSMS.isConfigured();
      const systemStatus = await taqnyatSMS.checkStatus();

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const webhookUrl = `${protocol}://${host}/api/notifications/webhook/taqnyat`;

      res.json({
        success: true,
        configured: isConfigured,
        systemStatus: systemStatus.status || "unknown",
        provider: "taqnyat",
        webhookUrl,
      });
    } catch (error: any) {
      logger.error("Error checking SMS status", error);
      res.status(500).json({ success: false, message: "خطأ في فحص حالة خدمة الرسائل" });
    }
  });

  // Taqnyat SMS Webhook - Delivery Report Callback (public endpoint - called by Taqnyat servers)
  app.post("/api/notifications/webhook/taqnyat", async (req, res) => {
    try {
      const { messageId, mobile, status, statusCode, errorCode, deliveredTime, sentTime } = req.body;

      logger.info("Taqnyat SMS webhook received", {
        messageId,
        mobile,
        status,
        statusCode,
      });

      if (messageId) {
        const statusMap: Record<string, string> = {
          DELIVERED: "delivered",
          SENT: "sent",
          FAILED: "failed",
          PENDING: "pending",
          REJECTED: "failed",
          EXPIRED: "failed",
        };

        const mappedStatus = statusMap[String(status).toUpperCase()] || "unknown";

        try {
          const updates: any = {
            external_status: mappedStatus,
          };
          if (mappedStatus === "delivered") {
            updates.status = "delivered";
            updates.delivered_at = deliveredTime ? new Date(deliveredTime) : new Date();
          } else if (mappedStatus === "failed") {
            updates.status = "failed";
            updates.error_message = errorCode ? `Error code: ${errorCode}` : "Delivery failed";
          }

          await storage.updateNotificationStatus(String(messageId), updates);
          logger.info(`SMS delivery status updated: ${messageId} -> ${mappedStatus}`);
        } catch (dbError) {
          logger.error("Error updating SMS delivery status in database", dbError);
        }
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      logger.error("Error processing Taqnyat webhook", error);
      res.status(200).json({ success: true });
    }
  });

  // Taqnyat webhook verification (GET - some providers verify with GET first)
  app.get("/api/notifications/webhook/taqnyat", (req, res) => {
    res.status(200).json({
      status: "active",
      service: "taqnyat-sms-webhook",
      message: "Taqnyat SMS delivery report webhook is active",
    });
  });

  // Get notifications
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      // Enhanced parameter validation with safe parsing
      let userId: number | undefined;
      if (req.query.user_id) {
        try {
          userId = parseIntSafe(req.query.user_id as string, "User ID", {
            min: 1,
          });
        } catch {
          userId = undefined; // Invalid user ID parameter
        }
      }

      let limitParam = 50;
      if (req.query.limit) {
        try {
          limitParam = parseIntSafe(req.query.limit as string, "Limit", {
            min: 1,
            max: 100,
          });
        } catch {
          limitParam = 50; // Default to 50 for invalid limit
        }
      }

      let offsetParam = 0;
      if (req.query.offset) {
        try {
          offsetParam = parseIntSafe(req.query.offset as string, "Offset", {
            min: 0,
          });
        } catch {
          offsetParam = 0; // Default to 0 for invalid offset
        }
      }

      // Validate pagination parameters with enhanced null safety
      const validLimit = Math.min(
        Math.max(isNaN(limitParam) ? 50 : limitParam, 1),
        100,
      );
      const validOffset = Math.max(isNaN(offsetParam) ? 0 : offsetParam, 0);

      const notifications = await storage.getNotifications(
        userId,
        validLimit,
        validOffset,
      );
      res.json(notifications);
    } catch (error: any) {
      logger.error("Error fetching notifications", error);
      res.status(500).json({ message: "خطأ في جلب الإشعارات" });
    }
  });

  // Webhook endpoint for Meta WhatsApp
  app.get("/api/notifications/webhook/meta", (req, res) => {
    // Verify webhook (Meta requirement)
    const VERIFY_TOKEN =
      process.env.META_WEBHOOK_VERIFY_TOKEN || "mpbf_webhook_token";
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      logger.info("✅ Meta Webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      logger.info("❌ Meta Webhook verification failed");
      res.sendStatus(403);
    }
  });

  app.post("/api/notifications/webhook/meta", async (req, res) => {
    try {
      logger.debug(
        "📨 Meta Webhook received",
        JSON.stringify(req.body, null, 2),
      );

      // معالجة webhook من Meta
      if (notificationService.metaWhatsApp) {
        await notificationService.metaWhatsApp.handleWebhook(req.body);
      }

      res.status(200).send("OK");
    } catch (error: any) {
      logger.error("Error processing Meta webhook", error);
      res.status(500).json({ message: "خطأ في معالجة Meta webhook" });
    }
  });

  // Update notification status (Twilio webhook)
  app.post("/api/notifications/webhook/twilio", async (req, res) => {
    try {
      const { MessageSid, MessageStatus, ErrorMessage } = req.body;

      if (MessageSid) {
        await notificationService.updateMessageStatus(MessageSid);
      }

      res.status(200).send("OK");
    } catch (error: any) {
      logger.error("Error handling Twilio webhook", error);
      res.status(500).send("Error");
    }
  });

  // ============ SSE Real-time Notification System ============

  // SSE endpoint for real-time notifications
  app.get("/api/notifications/stream", requireAuth, async (req, res) => {
    try {
      // Initialize notification manager if not already done
      if (!notificationManager) {
        notificationManager = getNotificationManager(storage);
        // Set notification manager in storage for production updates
        setNotificationManager(notificationManager);

        // Apply database optimizations on first initialization
        logger.info("[System] Applying database optimizations...");
        createPerformanceIndexes().catch((err) =>
          logger.error("[System] Database optimization failed", err),
        );
        createTextSearchIndexes().catch((err) =>
          logger.error("[System] Text search optimization failed", err),
        );
      }

      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح به" });
      }

      // Generate unique connection ID
      const connectionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Add SSE connection
      notificationManager.addConnection(connectionId, userId, res);

      logger.info(
        `[SSE] New connection established for user ${userId}, connectionId: ${connectionId}`,
      );
    } catch (error) {
      logger.error("Error establishing SSE connection", error);
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء الاتصال" });
    }
  });

  // Create system notification
  app.post(
    "/api/notifications/system",
    requireAuth,
    validateRequest({
      body: z.object({
        title: z.string().min(1, "العنوان مطلوب"),
        title_ar: z.string().optional(),
        message: z.string().min(1, "الرسالة مطلوبة"),
        message_ar: z.string().optional(),
        type: z
          .enum([
            "system",
            "order",
            "production",
            "maintenance",
            "quality",
            "hr",
          ])
          .default("system"),
        priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
        recipient_type: z.enum(["user", "role", "all"]),
        recipient_id: z.string().optional(),
        context_type: z.string().optional(),
        context_id: z.string().optional(),
        sound: z.boolean().optional().default(false),
        icon: z.string().optional(),
      }),
    }),
    async (req, res) => {
      try {
        // Initialize notification manager if not already done
        if (!notificationManager) {
          notificationManager = getNotificationManager(storage);
          // Set notification manager in storage for production updates
          setNotificationManager(notificationManager);

          // Apply database optimizations on first initialization
          logger.info("[System] Applying database optimizations...");
          createPerformanceIndexes().catch((err) =>
            logger.error("[System] Database optimization failed", err),
          );
          createTextSearchIndexes().catch((err) =>
            logger.error("[System] Text search optimization failed", err),
          );
        }

        const notificationData: SystemNotificationData = req.body;

        // Send notification based on recipient type
        if (
          notificationData.recipient_type === "user" &&
          notificationData.recipient_id
        ) {
          const userId = parseInt(notificationData.recipient_id);
          if (isNaN(userId)) {
            return res.status(400).json({ message: "معرف المستخدم غير صحيح" });
          }
          await notificationManager.sendToUser(userId, notificationData);
        } else if (
          notificationData.recipient_type === "role" &&
          notificationData.recipient_id
        ) {
          const roleId = parseInt(notificationData.recipient_id);
          if (isNaN(roleId)) {
            return res.status(400).json({ message: "معرف الدور غير صحيح" });
          }
          await notificationManager.sendToRole(roleId, notificationData);
        } else if (notificationData.recipient_type === "all") {
          await notificationManager.sendToAll(notificationData);
        } else {
          return res
            .status(400)
            .json({ message: "نوع المستلم أو معرف المستلم مطلوب" });
        }

        res.json({
          success: true,
          message: "تم إرسال الإشعار بنجاح",
          recipient_type: notificationData.recipient_type,
          recipient_id: notificationData.recipient_id,
        });
      } catch (error: any) {
        console.error("Error creating system notification:", error);
        res.status(500).json({
          success: false,
          message: "فشل في إرسال الإشعار",
        });
      }
    },
  );

  // Mark notification as read
  app.patch(
    "/api/notifications/mark-read/:id",
    requireAuth,
    async (req, res) => {
      try {
        const notificationId = parseRouteParam(req.params.id, "معرف الإشعار");

        const notification =
          await storage.markNotificationAsRead(notificationId);

        res.json({
          success: true,
          message: "تم تعليم الإشعار كمقروء",
          notification,
        });
      } catch (error: any) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({
          success: false,
          message: "فشل في تعليم الإشعار كمقروء",
        });
      }
    },
  );

  // Mark all notifications as read for current user
  app.patch(
    "/api/notifications/mark-all-read",
    requireAuth,
    async (req, res) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ message: "غير مصرح به" });
        }

        await storage.markAllNotificationsAsRead(userId);

        res.json({
          success: true,
          message: "تم تعليم جميع الإشعارات كمقروءة",
        });
      } catch (error: any) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({
          success: false,
          message: "فشل في تعليم الإشعارات كمقروءة",
        });
      }
    },
  );

  // Delete notification
  app.delete("/api/notifications/delete/:id", requireAuth, async (req, res) => {
    try {
      const notificationId = parseRouteParam(req.params.id, "معرف الإشعار");

      await storage.deleteNotification(notificationId);

      res.json({
        success: true,
        message: "تم حذف الإشعار",
      });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      res.status(500).json({
        success: false,
        message: "فشل في حذف الإشعار",
      });
    }
  });

  // Get user notifications with real-time support
  app.get("/api/notifications/user", requireAuth, async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح به" });
      }

      const unreadOnly = req.query.unread_only === "true";
      const limit = parseOptionalQueryParam(req.query.limit, "الحد الأقصى", 50);
      const offset = parseOptionalQueryParam(req.query.offset, "الإزاحة", 0);

      const notifications = await storage.getUserNotifications(userId, {
        unreadOnly,
        limit,
        offset,
      });

      // Count unread notifications efficiently using SQL COUNT
      const user = await storage.getSafeUser(userId);
      let unreadCount = 0;
      if (user) {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(notificationsTable)
          .where(
            and(
              sql`${notificationsTable.read_at} IS NULL`,
              eq(notificationsTable.recipient_id, userId.toString()),
            ),
          );
        unreadCount = Number(countResult[0]?.count || 0);
      }

      res.json({
        success: true,
        notifications,
        unread_count: unreadCount,
        total_returned: notifications.length,
      });
    } catch (error: any) {
      console.error("Error fetching user notifications:", error);
      res.status(500).json({
        success: false,
        message: "فشل في جلب الإشعارات",
      });
    }
  });

  // Get SSE connection statistics (admin only)
  app.get(
    "/api/notifications/stats",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        if (!notificationManager) {
          return res.json({
            success: true,
            stats: { activeConnections: 0, connectionsByUser: {} },
          });
        }

        const stats = notificationManager.getStats();
        res.json({ success: true, stats });
      } catch (error: any) {
        console.error("Error getting notification stats:", error);
        res.status(500).json({
          success: false,
          message: "فشل في جلب إحصائيات الإشعارات",
        });
      }
    },
  );

  // Get notification templates
  app.get("/api/notification-templates", requireAuth, async (req, res) => {
    try {
      const templates = await storage.getNotificationTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching notification templates:", error);
      res.status(500).json({ message: "خطأ في جلب قوالب الإشعارات" });
    }
  });

  // Create notification template
  app.post("/api/notification-templates", requireAuth, async (req, res) => {
    try {
      const template = await storage.createNotificationTemplate(req.body);
      res.json(template);
    } catch (error: any) {
      console.error("Error creating notification template:", error);
      res.status(500).json({ message: "خطأ في إنشاء قالب الإشعار" });
    }
  });

  // Orders routes
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();

      if (!Array.isArray(orders)) {
        return res.status(500).json({
          message: "خطأ في تحميل الطلبات",
          success: false,
        });
      }

      res.json({
        data: orders,
        count: orders.length,
        success: true,
      });
    } catch (error: any) {
      console.error("Orders fetch error:", error);

      res.status(500).json({
        message: "خطأ في جلب الطلبات",
        success: false,
      });
    }
  });

  // Generate next order number using SQL MAX for atomicity
  app.get("/api/orders/next-number", requireAuth, async (req, res) => {
    try {
      // Prevent caching to ensure fresh order numbers
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      // Use SQL MAX to atomically get highest order number - prevents race conditions
      const result = await db.execute(
        sql`SELECT MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)) as max_num 
            FROM orders 
            WHERE order_number ~ '^ORD[0-9]+$'`
      );
      const maxNum = (result as any).rows?.[0]?.max_num || 0;
      const nextNumber = maxNum + 1;
      const orderNumber = `ORD${nextNumber.toString().padStart(3, "0")}`;

      res.json({ orderNumber });
    } catch (error) {
      console.error("Order number generation error:", error);
      res.status(500).json({ message: "خطأ في توليد رقم الطلب" });
    }
  });

  app.post(
    "/api/orders",
    requireAuth,
    validateRequest({ body: commonSchemas.createOrder }),
    async (req, res) => {
      try {
        // Session is already validated by requireAuth middleware
        const userId = getAuthUserId(req);
        if (!userId || typeof userId !== "number") {
          return res.status(401).json({
            message: "معرف المستخدم غير صحيح",
            success: false,
          });
        }

        // Validate required fields are present
        const { customer_id, order_number } = req.body;
        if (!customer_id?.trim()) {
          return res.status(400).json({
            message: "معرف العميل مطلوب",
            success: false,
          });
        }

        if (!order_number?.trim()) {
          return res.status(400).json({
            message: "رقم الطلب مطلوب",
            success: false,
          });
        }

        // Prepare order data with safe defaults
        let deliveryDays: number | null = null;
        if (req.body.delivery_days) {
          try {
            deliveryDays = parseIntSafe(
              req.body.delivery_days,
              "Delivery days",
              { min: 1, max: 365 },
            );
          } catch (error) {
            return res.status(400).json({
              message: "قيمة أيام التسليم غير صحيحة",
              success: false,
            });
          }
        }

        const orderData = {
          ...req.body,
          created_by: userId,
          delivery_days: deliveryDays,
          customer_id: customer_id.trim(),
          order_number: order_number.trim(),
          notes: req.body.notes?.trim() || null,
        };

        const validatedData = insertNewOrderSchema.parse(orderData);
        const order = await storage.createOrder(validatedData);

        if (!order) {
          return res.status(500).json({
            message: "فشل في إنشاء الطلب",
            success: false,
          });
        }

        res.status(201).json({
          data: order,
          message: "تم إنشاء الطلب بنجاح",
          success: true,
        });
      } catch (error: any) {
        console.error("Order creation error:", error);

        res.status(500).json({
          message: "خطأ في إنشاء الطلب",
          success: false,
        });
      }
    },
  );

  app.delete(
    "/api/orders/:id",
    requireAuth,
    requireAdmin,
    validateRequest({ params: commonSchemas.idParam }),
    async (req, res) => {
      try {
        const orderId = parseInt(req.params.id);

        if (!orderId || isNaN(orderId) || orderId <= 0) {
          return res.status(400).json({
            message: "معرف الطلب غير صحيح",
            success: false,
          });
        }

        // Check if order exists before deletion
        const existingOrder = await storage.getOrderById(orderId);
        if (!existingOrder) {
          return res.status(404).json({
            message: "الطلب غير موجود",
            success: false,
          });
        }

        await storage.deleteOrder(orderId);

        res.json({
          message: "تم حذف الطلب بنجاح",
          success: true,
        });
      } catch (error: any) {
        console.error("Order deletion error:", error);

        res.status(500).json({
          message: "خطأ في حذف الطلب",
          success: false,
        });
      }
    },
  );

  // Get orders for production page
  app.get(
    "/api/production/orders-for-production",
    requireAuth,
    async (req, res) => {
      try {
        const orders = await storage.getOrdersForProduction();
        res.json(orders);
      } catch (error) {
        console.error("Error fetching orders for production:", error);
        res.status(500).json({ message: "خطأ في جلب طلبات الإنتاج" });
      }
    },
  );

  // Get hierarchical orders for production page
  app.get(
    "/api/production/hierarchical-orders",
    requireAuth,
    async (req, res) => {
      try {
        const orders = await storage.getHierarchicalOrdersForProduction();
        res.json(orders);
      } catch (error) {
        console.error(
          "Error fetching hierarchical orders for production:",
          error,
        );
        res.status(500).json({ message: "خطأ في جلب طلبات الإنتاج الهرمية" });
      }
    },
  );

  // Production Orders routes
  app.get("/api/production-orders", requireAuth, async (req, res) => {
    try {
      const productionOrders = await storage.getAllProductionOrders();
      res.json(productionOrders);
    } catch (error) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ message: "خطأ في جلب أوامر الإنتاج" });
    }
  });

  app.get("/api/production-orders/:id", requireAuth, async (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return next();
    }
    try {
      const id = parseRouteParam(req.params.id, "id");
      const productionOrder = await storage.getProductionOrderById(id);
      if (!productionOrder) {
        return res.status(404).json({ message: "أمر الإنتاج غير موجود" });
      }
      res.json(productionOrder);
    } catch (error) {
      console.error("Error fetching production order:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ message: "خطأ في جلب أمر الإنتاج" });
    }
  });

  app.post("/api/production-orders", requireAuth, requirePermission('manage_production'), async (req, res) => {
    try {
      // Extract and validate basic fields first
      const { customer_product_id, quantity_kg, overrun_percentage } = req.body;

      // Get customer product info for intelligent calculation
      const customerProductsResult = await storage.getCustomerProducts();
      const customerProduct = customerProductsResult.data.find(
        (cp: any) => cp.id === parseInt(customer_product_id),
      );

      if (!customerProduct) {
        return res.status(404).json({
          message: "المنتج غير موجود",
          success: false,
        });
      }

      // Calculate final quantity using server-side logic (ignore client-provided value)
      const quantityCalculation = calculateProductionQuantities(
        parseFloat(quantity_kg),
        customerProduct.punching,
      );

      // Prepare production order data with server-calculated final quantity
      const productionOrderData = {
        ...req.body,
        // Override with server-calculated values for security
        final_quantity_kg: quantityCalculation.finalQuantityKg,
        overrun_percentage: quantityCalculation.overrunPercentage,
      };

      const validatedData =
        insertProductionOrderSchema.parse(productionOrderData);
      const productionOrder =
        await storage.createProductionOrder(validatedData, { final_quantity_kg: quantityCalculation.finalQuantityKg });
      res.status(201).json(productionOrder);
    } catch (error) {
      console.error("Error creating production order:", error);
      if (error instanceof Error && "issues" in error) {
        res.status(400).json({ message: "بيانات غير صحيحة", errors: error });
      } else {
        res.status(500).json({ message: "خطأ في إنشاء أمر الإنتاج" });
      }
    }
  });

  app.post("/api/production-orders/batch", requireAuth, requirePermission('manage_production'), async (req, res) => {
    try {
      const { orders } = req.body;

      if (!Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({
          message: "يجب توفير قائمة من الطلبات",
          success: false,
        });
      }

      const customerProductsResult = await storage.getCustomerProducts();
      const processedOrders = [];

      for (const order of orders) {
        const { customer_product_id, quantity_kg, overrun_percentage } = order;
        const customerProduct = customerProductsResult.data.find(
          (cp: any) => cp.id === parseInt(customer_product_id),
        );

        if (!customerProduct) {
          processedOrders.push({
            success: false,
            error: `المنتج ${customer_product_id} غير موجود`,
            order,
          });
          continue;
        }

        const quantityCalculation = calculateProductionQuantities(
          parseFloat(quantity_kg),
          customerProduct.punching,
        );

        const productionOrderData = {
          ...order,
          final_quantity_kg: quantityCalculation.finalQuantityKg,
          overrun_percentage: quantityCalculation.overrunPercentage,
        };

        try {
          const validatedData =
            insertProductionOrderSchema.parse(productionOrderData);
          processedOrders.push({
            success: true,
            data: validatedData,
            finalQuantityKg: quantityCalculation.finalQuantityKg,
          });
        } catch (validationError) {
          processedOrders.push({
            success: false,
            error: "بيانات غير صحيحة",
            order,
            validationError,
          });
        }
      }

      const validOrders = processedOrders.filter((po) => po.success);

      if (validOrders.length === 0) {
        return res.status(400).json({
          message: "لا توجد طلبات صالحة للإنشاء",
          errors: processedOrders,
        });
      }

      const result = await storage.createProductionOrdersBatchWithFinalQty(
        validOrders.map((po) => ({ data: po.data!, finalQuantityKg: po.finalQuantityKg! })),
      );

      res.status(201).json({
        message: `تم إنشاء ${result.successful.length} من ${orders.length} طلب`,
        successful: result.successful,
        failed: result.failed,
        validationErrors: processedOrders.filter((po) => !po.success),
      });
    } catch (error) {
      console.error("Error creating batch production orders:", error);
      res.status(500).json({ message: "خطأ في إنشاء أوامر الإنتاج" });
    }
  });

  app.put(
    "/api/production-orders/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const id = parseRouteParam(req.params.id, "ID");
        
        // If customer_product_id or quantity_kg is being updated, recalculate overrun_percentage
        if (req.body.customer_product_id || req.body.quantity_kg) {
          const customerProductsResult = await storage.getCustomerProducts();
          
          // Get the existing production order to fill in missing fields
          const existingOrder = await storage.getProductionOrderById(id);
          if (!existingOrder) {
            return res.status(404).json({ message: "أمر الإنتاج غير موجود" });
          }
          
          const customer_product_id = req.body.customer_product_id !== undefined ? req.body.customer_product_id : existingOrder.customer_product_id;
          const quantity_kg = req.body.quantity_kg !== undefined ? req.body.quantity_kg : existingOrder.quantity_kg;
          
          const customerProduct = customerProductsResult.data.find(
            (cp: any) => cp.id === parseInt(customer_product_id),
          );
          
          if (customerProduct) {
            const quantityCalculation = calculateProductionQuantities(
              parseFloat(quantity_kg),
              customerProduct.punching,
            );
            
            req.body.overrun_percentage = quantityCalculation.overrunPercentage;
            req.body.final_quantity_kg = quantityCalculation.finalQuantityKg;
          }
        }
        
        const validatedData = insertProductionOrderSchema
          .partial()
          .parse(req.body);
        const productionOrder = await storage.updateProductionOrder(
          id,
          validatedData,
        );
        res.json(productionOrder);
      } catch (error) {
        console.error("Error updating production order:", error);
        res.status(500).json({ message: "خطأ في تحديث أمر الإنتاج" });
      }
    },
  );

  app.delete(
    "/api/production-orders/:id",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const id = parseRouteParam(req.params.id, "ID");
        await storage.deleteProductionOrder(id);
        res.json({ message: "تم حذف أمر الإنتاج بنجاح" });
      } catch (error) {
        console.error("Error deleting production order:", error);
        res.status(500).json({ message: "خطأ في حذف أمر الإنتاج" });
      }
    },
  );

  // Preview quantity calculations for production orders
  app.post(
    "/api/production-orders/preview-quantities",
    requireAuth,
    async (req, res) => {
      try {
        const { customer_product_id, quantity_kg } = req.body;

        // Validate inputs
        if (!customer_product_id || !quantity_kg || quantity_kg <= 0) {
          return res.status(400).json({
            message: "معرف المنتج والكمية الأساسية مطلوبان",
            success: false,
          });
        }

        // Get specific customer product info for intelligent calculation (optimized with cache)
        const customerProductsResult = await storage.getCustomerProducts();
        const customerProduct = customerProductsResult.data.find(
          (cp: any) => cp.id === parseInt(customer_product_id),
        );

        if (!customerProduct) {
          return res.status(404).json({
            message: "المنتج غير موجود",
            success: false,
          });
        }

        // Calculate quantities using intelligent system
        const quantityCalculation = calculateProductionQuantities(
          parseFloat(quantity_kg),
          customerProduct.punching,
        );

        res.json({
          success: true,
          data: {
            customer_product_id: parseInt(customer_product_id),
            quantity_kg: parseFloat(quantity_kg),
            overrun_percentage: quantityCalculation.overrunPercentage,
            final_quantity_kg: quantityCalculation.finalQuantityKg,
            overrun_reason: quantityCalculation.overrunReason,
            product_info: {
              punching: customerProduct.punching,
              size_caption: customerProduct.size_caption,
              raw_material: customerProduct.raw_material,
              master_batch_id: customerProduct.master_batch_id,
            },
          },
        });
      } catch (error) {
        console.error("Quantity preview error:", error);
        res.status(500).json({
          message: "خطأ في حساب الكمية",
          success: false,
        });
      }
    },
  );

  // Production Orders Management Routes
  app.get(
    "/api/production-orders/management",
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        // التحقق من صلاحيات المدير أو مدير الإنتاج
        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: "غير مصرح" });
        }

        const userRole = await storage.getRoleById(user.role_id);
        if (!userRole || (userRole.name !== "admin" && userRole.name !== "production_manager")) {
          return res.status(403).json({ 
            message: "هذه الصفحة متاحة فقط للمدير ومدير الإنتاج" 
          });
        }

        const productionOrders = await storage.getProductionOrdersWithDetails();
        res.json({
          success: true,
          data: productionOrders
        });
      } catch (error) {
        console.error("Error fetching production orders with details:", error);
        res.status(500).json({ 
          success: false,
          message: "خطأ في جلب أوامر الإنتاج" 
        });
      }
    }
  );

  app.patch(
    "/api/production-orders/:id/activate", 
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: "غير مصرح" });
        }

        // التحقق من صلاحيات المدير أو مدير الإنتاج
        const userRole = await storage.getRoleById(user.role_id);
        if (!userRole || (userRole.name !== "admin" && userRole.name !== "production_manager")) {
          return res.status(403).json({ 
            message: "غير مصرح لك بتفعيل أوامر الإنتاج" 
          });
        }

        const id = parseRouteParam(req.params.id, "Production Order ID");
        const { machineId, operatorId } = req.body;

        const activatedOrder = await storage.activateProductionOrder(
          id,
          { machine_id: machineId, operator_id: operatorId }
        );

        res.json({
          success: true,
          data: activatedOrder,
          message: "تم تفعيل أمر الإنتاج بنجاح"
        });
      } catch (error: any) {
        console.error("Error activating production order:", error);
        res.status(400).json({ 
          success: false,
          message: "خطأ في تفعيل أمر الإنتاج" 
        });
      }
    }
  );

  app.patch(
    "/api/production-orders/:id/assign",
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const user = req.user;
        if (!user) {
          return res.status(401).json({ message: "غير مصرح" });
        }

        // التحقق من صلاحيات المدير أو مدير الإنتاج
        const userRole = await storage.getRoleById(user.role_id);
        if (!userRole || (userRole.name !== "admin" && userRole.name !== "production_manager")) {
          return res.status(403).json({ 
            message: "غير مصرح لك بتخصيص أوامر الإنتاج" 
          });
        }

        const id = parseRouteParam(req.params.id, "Production Order ID");
        const { machineId, operatorId } = req.body;

        const updatedOrder = await storage.updateProductionOrderAssignment(
          id,
          { machine_id: machineId, operator_id: operatorId }
        );

        res.json({
          success: true,
          data: updatedOrder,
          message: "تم تحديث التخصيص بنجاح"
        });
      } catch (error: any) {
        console.error("Error assigning production order:", error);
        res.status(400).json({ 
          success: false,
          message: "خطأ في تخصيص أمر الإنتاج" 
        });
      }
    }
  );

  app.get(
    "/api/production-orders/:id/stats",
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const id = parseRouteParam(req.params.id, "Production Order ID");
        const stats = await storage.getProductionOrderStats(id);
        
        res.json({
          success: true,
          data: stats
        });
      } catch (error: any) {
        console.error("Error fetching production order stats:", error);
        res.status(400).json({ 
          success: false,
          message: "خطأ في جلب إحصائيات أمر الإنتاج" 
        });
      }
    }
  );

  // Get all orders with enhanced search and filtering
  app.get("/api/orders/enhanced", requireAuth, async (req, res) => {
    try {
      const {
        search,
        customer_id,
        status,
        date_from,
        date_to,
        page = 1,
        limit = 50,
      } = req.query;

      // Build dynamic query with filters (performance optimized)
      const orders = await storage.getOrdersEnhanced({
        search: search as string,
        customer_id: customer_id as string,
        status: status as string,
        date_from: date_from as string,
        date_to: date_to as string,
        page: Math.max(parseInt(page as string) || 1, 1),
        limit: Math.min(Math.max(parseInt(limit as string) || 50, 1), 500),
      });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("Enhanced orders fetch error:", error);
      res.status(500).json({
        message: "خطأ في جلب الطلبات",
        success: false,
      });
    }
  });

  // Rolls routes with pagination support
  app.get("/api/rolls", requireAuth, async (req, res) => {
    try {
      const { stage } = req.query;

      if (stage) {
        const rolls = await storage.getRollsByStage(stage as string);
        res.json(rolls);
      } else {
        const rolls = await storage.getRolls();
        res.json(rolls);
      }
    } catch (error) {
      console.error("[GET /api/rolls] Error fetching rolls:", error);
      res.status(500).json({ message: "خطأ في جلب الرولات" });
    }
  });

  app.get("/api/rolls/:id", requireAuth, async (req, res, next) => {
    if (!/^\d+$/.test(req.params.id)) {
      return next();
    }
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const roll = await storage.getRollById(id);
      if (!roll) {
        return res.status(404).json({ message: "الرول غير موجود" });
      }
      res.json(roll);
    } catch (error) {
      console.error("Error fetching roll:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ message: "خطأ في جلب الرول" });
    }
  });

  app.patch("/api/rolls/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const { stage, weight_kg, waste_kg, cut_weight_total_kg, printing_machine_id } = req.body;

      // Prepare safe updates object
      const safeUpdates: any = {};

      // Handle stage transitions securely with employee tracking
      if (stage) {
        const validStages = ["film", "printing", "cutting", "done"];
        if (!validStages.includes(stage)) {
          return res.status(400).json({ message: "مرحلة غير صالحة" });
        }

        const currentRoll = await storage.getRollById(id);
        if (!currentRoll) {
          return res.status(404).json({ message: "الرول غير موجود" });
        }

        const allowedTransitions: Record<string, string[]> = {
          film: ["printing"],
          printing: ["cutting"],
          cutting: ["done"],
          done: [],
        };

        const currentStage = currentRoll.stage || "film";
        if (!allowedTransitions[currentStage]?.includes(stage)) {
          return res.status(400).json({ 
            message: `لا يمكن الانتقال من مرحلة "${currentStage}" إلى مرحلة "${stage}"` 
          });
        }

        safeUpdates.stage = stage;
        const userId = getAuthUserId(req);

        if (userId) {
          if (stage === "printing") {
            safeUpdates.printed_by = userId;
            safeUpdates.printed_at = new Date();
            if (printing_machine_id) {
              safeUpdates.printing_machine_id = printing_machine_id;
            }
          } else if (stage === "cutting") {
            safeUpdates.cut_by = userId;
            // Note: cut_completed_at is set only when moving to 'done'
          } else if (stage === "done") {
            safeUpdates.cut_completed_at = new Date();
          }
        }
      }

      // Allow specific safe fields only (whitelist approach)
      if (weight_kg !== undefined) safeUpdates.weight_kg = weight_kg;
      if (waste_kg !== undefined) safeUpdates.waste_kg = waste_kg;
      if (cut_weight_total_kg !== undefined)
        safeUpdates.cut_weight_total_kg = cut_weight_total_kg;

      if (Object.keys(safeUpdates).length === 0) {
        return res.status(400).json({ message: "لا توجد بيانات للتحديث" });
      }

      const roll = await storage.updateRoll(id, safeUpdates);

      // Update completion percentages when stage changes
      if (stage && roll) {
        await storage.updateProductionOrderCompletionPercentages(roll.production_order_id);
      }

      res.json(roll);
    } catch (error) {
      console.error("Error updating roll:", error instanceof Error ? error.message : String(error));
      res.status(400).json({ message: "خطأ في تحديث الرول" });
    }
  });

  // ================ PRINTING OPERATOR API ROUTES ================
  
  // Get rolls ready for printing by section
  app.get("/api/rolls/printing-queue-by-section", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      // Get rolls ready for printing (in film stage)
      const printingQueue = await storage.getRollsForPrintingBySection((user as any).section_id);
      
      res.json(printingQueue);
    } catch (error) {
      console.error("Error fetching printing queue by section:", error);
      res.status(500).json({ message: "خطأ في جلب قائمة انتظار الطباعة" });
    }
  });

  // Mark roll as printed
  app.post("/api/rolls/:id/mark-printed", requireAuth, async (req: AuthRequest, res) => {
    try {
      const rollId = parseRouteParam(req.params.id, "Roll ID");
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      // Mark the roll as printed
      const updatedRoll = await storage.markRollAsPrinted(rollId, user.id);
      
      res.json({
        success: true,
        data: updatedRoll,
        message: "تم تسجيل طباعة الرول بنجاح"
      });
    } catch (error: any) {
      console.error("Error marking roll as printed:", error);
      res.status(400).json({ 
        success: false,
        message: "خطأ في تسجيل طباعة الرول" 
      });
    }
  });

  // Get printing progress for a production order
  app.get("/api/production-orders/:id/printing-progress", requireAuth, async (req: AuthRequest, res) => {
    try {
      const productionOrderId = parseRouteParam(req.params.id, "Production Order ID");
      
      // Get production order stats
      const stats = await storage.getProductionOrderStats(productionOrderId);
      
      // Check if printing is completed
      const isCompleted = await storage.checkPrintingCompletion(productionOrderId);
      
      res.json({
        success: true,
        data: {
          ...stats,
          printing_completed: isCompleted
        }
      });
    } catch (error) {
      console.error("Error fetching printing progress:", error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في جلب تقدم الطباعة" 
      });
    }
  });

  // Get printing statistics
  app.get("/api/printing/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const user = req.user;
      const stats = await storage.getPrintingStats();
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching printing stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات الطباعة" });
    }
  });

  // Machines routes
  app.get("/api/machines", requireAuth, async (req, res) => {
    try {
      const machines = await storage.getMachines();
      res.json(machines);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب المكائن" });
    }
  });

  // Customers routes
  app.get("/api/customers", requireAuth, async (req, res) => {
    try {
      const { search, page, limit, all } = req.query;
      
      // If all=true, return all customers without pagination (for dropdowns)
      if (all === 'true') {
        const allCustomers = await storage.getAllCustomers();
        return res.json(allCustomers);
      }
      
      const options: { search?: string; page?: number; limit?: number } = {};
      
      if (search && typeof search === 'string') {
        options.search = search;
      }
      if (page && typeof page === 'string') {
        options.page = Math.max(parseInt(page) || 1, 1);
      }
      if (limit && typeof limit === 'string') {
        options.limit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
      }
      
      const result = await storage.getCustomers(options);
      res.json(result);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب العملاء" });
    }
  });

  // Health check endpoint for deployment
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ================ ADVANCED REPORTING API ROUTES ================

  // Order Reports
  app.get("/api/reports/orders", requireAuth, async (req, res) => {
    try {
      const { date_from, date_to } = req.query;
      const reports = await storage.getOrderReports({ dateFrom: date_from as string, dateTo: date_to as string });
      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      console.error("Order reports error:", error);
      res.status(500).json({
        message: "خطأ في جلب تقارير الطلبات",
        success: false,
      });
    }
  });

  // ============ Film Operator Endpoints ============
  
  // Get active production orders for film operator
  app.get("/api/production-orders/active-for-operator", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const orders = await storage.getActiveProductionOrdersForOperator(userId);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching operator production orders:", error);
      res.status(500).json({ message: "خطأ في جلب أوامر الإنتاج" });
    }
  });

  // Create roll with timing calculation
  app.post("/api/rolls/create-with-timing", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const dataToValidate = {
        ...req.body,
        created_by: userId,
      };

      const validatedData = insertRollSchema.parse(dataToValidate);

      // Check if order is paused - block production entry
      const pauseCheck = await checkOrderNotPaused(validatedData.production_order_id);
      if (pauseCheck.isPaused) {
        return res.status(403).json({ 
          success: false,
          message: pauseCheck.message,
          orderStatus: pauseCheck.orderStatus
        });
      }

      const isLastRoll = req.body.is_last_roll || false;

      if (!isLastRoll) {
        const po = await storage.getProductionOrderById(validatedData.production_order_id);
        if (po) {
          const finalQty = parseFloat(po.final_quantity_kg?.toString() || '0');
          const targetKg = finalQty > 0 ? finalQty : parseFloat(po.quantity_kg?.toString() || '0');
          const overrunPct = parseFloat(po.overrun_percentage?.toString() || '0');
          const maxAllowed = targetKg * (1 + overrunPct / 100);
          const existingRolls = await storage.getRollsByProductionOrder(validatedData.production_order_id);
          const totalProduced = existingRolls.reduce((sum: number, r: any) => sum + parseFloat(r.weight_kg?.toString() || '0'), 0);
          const newRollWeight = parseFloat(req.body.weight_kg?.toString() || '0');

          if ((totalProduced + newRollWeight) > maxAllowed) {
            return res.status(400).json({
              success: false,
              message: `سيتجاوز الإنتاج الكمية المسموحة (${maxAllowed.toFixed(1)} كجم). الكمية المنتجة حالياً: ${totalProduced.toFixed(1)} كجم + رول جديد: ${newRollWeight.toFixed(1)} كجم = ${(totalProduced + newRollWeight).toFixed(1)} كجم. استخدم "رول نهائي" لإغلاق الأمر.`
            });
          }
        }
      }

      const rollData = {
        ...validatedData,
        is_last_roll: isLastRoll,
      };

      const newRoll = await storage.createRollWithTiming(rollData);
      res.status(201).json({
        success: true,
        message: "تم إنشاء الرول بنجاح",
        roll: newRoll,
        roll_number: newRoll.roll_number,
      });
    } catch (error) {
      console.error("Error creating roll with timing:", error instanceof Error ? error.message : String(error));
      res.status(500).json({ 
        success: false,
        message: "خطأ في إنشاء الرول" 
      });
    }
  });

  // Create final roll and complete film production
  app.post("/api/rolls/create-final", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const dataToValidate = {
        ...req.body,
        created_by: userId,
      };

      const validatedData = insertRollSchema.parse(dataToValidate);

      // Check if order is paused - block production entry
      const pauseCheck = await checkOrderNotPaused(validatedData.production_order_id);
      if (pauseCheck.isPaused) {
        return res.status(403).json({ 
          success: false,
          message: pauseCheck.message,
          orderStatus: pauseCheck.orderStatus
        });
      }

      const newRoll = await storage.createFinalRoll(validatedData);
      res.status(201).json({
        success: true,
        message: "تم إنشاء آخر رول وإغلاق مرحلة الفيلم بنجاح",
        roll: newRoll,
        roll_number: newRoll.roll_number,
      });
    } catch (error) {
      console.error("Error creating final roll:", error);
      res.status(500).json({ 
        success: false,
        message: "خطأ في إنشاء آخر رول" 
      });
    }
  });

  // ============ Printing Operator Endpoints ============
  
  // Get active rolls for printing operator
  app.get("/api/rolls/active-for-printing", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const rolls = await storage.getActivePrintingRollsForOperator(userId);
      res.json(rolls);
    } catch (error) {
      console.error("Error fetching printing rolls:", error);
      res.status(500).json({ message: "خطأ في جلب رولات الطباعة" });
    }
  });

  // ============ Cutting Operator Endpoints ============
  
  // Get active rolls for cutting operator
  app.get("/api/rolls/active-for-cutting", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const rolls = await storage.getActiveCuttingRollsForOperator(userId);
      res.json(rolls);
    } catch (error) {
      console.error("Error fetching cutting rolls:", error);
      res.status(500).json({ message: "خطأ في جلب رولات التقطيع" });
    }
  });

  // Advanced Metrics (OEE, Cycle Time, Quality)
  app.get("/api/reports/advanced-metrics", requireAuth, async (req, res) => {
    try {
      const { date_from, date_to } = req.query;
      const metrics = await storage.getAdvancedMetrics();
      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("Advanced metrics error:", error);
      res.status(500).json({
        message: "خطأ في جلب المؤشرات المتقدمة",
        success: false,
      });
    }
  });

  // HR Reports
  app.get("/api/reports/hr", requireAuth, async (req, res) => {
    try {
      const { date_from, date_to } = req.query;
      const reports = await storage.getHRReports({ dateFrom: date_from as string, dateTo: date_to as string });
      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      console.error("HR reports error:", error);
      res.status(500).json({
        message: "خطأ في جلب تقارير الموارد البشرية",
        success: false,
      });
    }
  });

  // Maintenance Reports
  app.get("/api/reports/maintenance", requireAuth, async (req, res) => {
    try {
      const { date_from, date_to } = req.query;
      const reports = await storage.getMaintenanceReports();
      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      console.error("Maintenance reports error:", error);
      res.status(500).json({
        message: "خطأ في جلب تقارير الصيانة",
        success: false,
      });
    }
  });

  // Comprehensive Dashboard Report (All KPIs)
  app.get("/api/reports/dashboard", requireAuth, async (req, res) => {
    try {
      const { date_from, date_to } = req.query;

      // Fetch all reports in parallel for better performance
      const [
        orderReports,
        advancedMetrics,
        hrReports,
        maintenanceReports,
        realTimeStats,
        machineUtilization,
        productionEfficiency,
        productionAlerts,
      ] = await Promise.all([
        storage.getOrderReports({ dateFrom: date_from as string, dateTo: date_to as string }),
        storage.getAdvancedMetrics(),
        storage.getHRReports({ dateFrom: date_from as string, dateTo: date_to as string }),
        storage.getMaintenanceReports(),
        storage.getRealTimeProductionStats(),
        storage.getMachineUtilizationStats(),
        storage.getProductionEfficiencyMetrics(),
        storage.getProductionAlerts(),
      ]);

      res.json({
        success: true,
        data: {
          orders: orderReports,
          metrics: advancedMetrics,
          hr: hrReports,
          maintenance: maintenanceReports,
          realTime: realTimeStats,
          machineUtilization,
          productionEfficiency,
          alerts: productionAlerts,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Comprehensive dashboard error:", error);
      res.status(500).json({
        message: "خطأ في جلب التقرير الشامل",
        success: false,
      });
    }
  });

  // ============ PRODUCTION REPORTS API ROUTES ============
  
  // Production Summary Report
  app.get("/api/reports/production-summary", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        customerId: req.query.customer_id ? JSON.parse(req.query.customer_id as string) : undefined,
        productId: req.query.product_id ? JSON.parse(req.query.product_id as string) : undefined,
        status: req.query.status ? JSON.parse(req.query.status as string) : undefined,
        sectionId: req.query.section_id as string,
        machineId: req.query.machine_id as string,
        operatorId: req.query.operator_id ? parseInt(req.query.operator_id as string) : undefined,
      };
      
      const summary = await storage.getProductionSummary(filters);
      res.json({ success: true, data: summary });
    } catch (error) {
      console.error("Production summary error:", error);
      res.status(500).json({ message: "خطأ في جلب ملخص الإنتاج", success: false });
    }
  });

  // Production by Date
  app.get("/api/reports/production-by-date", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        customerId: req.query.customer_id ? JSON.parse(req.query.customer_id as string) : undefined,
        productId: req.query.product_id ? JSON.parse(req.query.product_id as string) : undefined,
      };
      
      const data = await storage.getProductionByDate(filters);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Production by date error:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الإنتاج اليومية", success: false });
    }
  });

  // Production by Product
  app.get("/api/reports/production-by-product", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        customerId: req.query.customer_id ? JSON.parse(req.query.customer_id as string) : undefined,
      };
      
      const data = await storage.getProductionByProduct(filters);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Production by product error:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الإنتاج حسب المنتج", success: false });
    }
  });

  // Waste Analysis
  app.get("/api/reports/waste-analysis", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        sectionId: req.query.section_id as string,
      };
      
      const data = await storage.getWasteAnalysis(filters);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Waste analysis error:", error);
      res.status(500).json({ message: "خطأ في جلب تحليل الهدر", success: false });
    }
  });

  // Machine Performance
  app.get("/api/reports/machine-performance", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
      };
      
      const data = await storage.getMachinePerformance(filters);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Machine performance error:", error);
      res.status(500).json({ message: "خطأ في جلب أداء المكائن", success: false });
    }
  });

  // Operator Performance
  app.get("/api/reports/operator-performance", requireAuth, async (req, res) => {
    try {
      const filters = {
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        sectionId: req.query.section_id as string,
      };
      
      const data = await storage.getOperatorPerformance(filters);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Operator performance error:", error);
      res.status(500).json({ message: "خطأ في جلب أداء العمال", success: false });
    }
  });

  // Export Report with real PDF/Excel generation
  app.post("/api/reports/export", requireAuth, async (req, res) => {
    try {
      const { report_type, format, date_from, date_to, filters } = req.body;

      if (!report_type || !format) {
        return res.status(400).json({
          message: "نوع التقرير والصيغة مطلوبان",
          success: false,
        });
      }

      let reportData;
      let reportTitle = "";
      switch (report_type) {
        case "orders":
          reportData = await storage.getOrderReports({ dateFrom: date_from, dateTo: date_to });
          reportTitle = "تقرير الطلبات";
          break;
        case "advanced-metrics":
          reportData = await storage.getAdvancedMetrics();
          reportTitle = "تقرير المقاييس المتقدمة";
          break;
        case "hr":
          reportData = await storage.getHRReports({ dateFrom: date_from, dateTo: date_to });
          reportTitle = "تقرير الموارد البشرية";
          break;
        case "maintenance":
          reportData = await storage.getMaintenanceReports();
          reportTitle = "تقرير الصيانة";
          break;
        default:
          return res.status(400).json({
            message: "نوع التقرير غير صحيح",
            success: false,
          });
      }

      if (format === "json") {
        const exportData = {
          report_type,
          format,
          generated_at: new Date().toISOString(),
          date_range: { from: date_from, to: date_to },
          filters,
          data: reportData,
        };
        return res.json({ success: true, data: exportData });
      }

      if (format === "excel") {
        const ExcelJS = (await import("exceljs")).default;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "نظام إدارة الطلبات";
        workbook.created = new Date();

        const sheet = workbook.addWorksheet(reportTitle, {
          views: [{ rightToLeft: true }],
        });

        const flatData = Array.isArray(reportData)
          ? reportData
          : typeof reportData === "object" && reportData !== null
            ? Object.entries(reportData).map(([key, value]) => {
                if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                  return { المفتاح: key, ...(value as Record<string, unknown>) };
                }
                return { المفتاح: key, القيمة: value };
              })
            : [{ البيانات: reportData }];

        if (flatData.length > 0) {
          const headers = Object.keys(flatData[0] as Record<string, unknown>);
          const headerRow = sheet.addRow(headers);
          headerRow.font = { bold: true, size: 12 };
          headerRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF4472C4" },
          };
          headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };

          for (const item of flatData) {
            const row = item as Record<string, unknown>;
            sheet.addRow(headers.map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return "";
              if (typeof val === "object") return JSON.stringify(val);
              return val;
            }));
          }

          headers.forEach((_, i) => {
            const col = sheet.getColumn(i + 1);
            col.width = 20;
          });
        }

        sheet.addRow([]);
        sheet.addRow([`تاريخ التقرير: ${new Date().toLocaleDateString("en-US")}`]);
        if (date_from && date_to) {
          sheet.addRow([`الفترة: من ${date_from} إلى ${date_to}`]);
        }

        const buffer = await workbook.xlsx.writeBuffer();
        const filename = `${report_type}-${Date.now()}.xlsx`;
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(Buffer.from(buffer as ArrayBuffer));
      }

      if (format === "pdf") {
        const PDFDocument = (await import("pdfkit")).default;

        const flatData = Array.isArray(reportData)
          ? reportData
          : typeof reportData === "object" && reportData !== null
            ? Object.entries(reportData).map(([key, value]) => {
                if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                  return { key, ...(value as Record<string, unknown>) };
                }
                return { key, value };
              })
            : [{ data: reportData }];

        const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
        const chunks: Buffer[] = [];
        doc.on("data", (chunk: Buffer) => chunks.push(chunk));

        const pdfReady = new Promise<Buffer>((resolve) => {
          doc.on("end", () => resolve(Buffer.concat(chunks)));
        });

        doc.fontSize(16).text(reportTitle, { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(10).text(
          `Report Date: ${new Date().toLocaleDateString("en-US")}${date_from && date_to ? ` | Period: ${date_from} to ${date_to}` : ""}`,
          { align: "center" }
        );
        doc.moveDown(1);

        if (flatData.length > 0) {
          const headers = Object.keys(flatData[0] as Record<string, unknown>);
          const tableWidth = doc.page.width - 80;
          const colWidth = tableWidth / headers.length;
          const startX = 40;
          let y = doc.y;
          const fontSize = headers.length > 6 ? 6 : 8;

          doc.fontSize(fontSize).font("Helvetica-Bold");
          headers.forEach((header, i) => {
            doc.text(String(header), startX + i * colWidth, y, {
              width: colWidth - 2,
              align: "left",
              lineBreak: false,
            });
          });

          y += 16;
          doc.moveTo(startX, y).lineTo(startX + tableWidth, y).stroke();
          y += 4;
          doc.font("Helvetica").fontSize(fontSize > 6 ? 7 : 5.5);

          for (const item of flatData) {
            if (y > doc.page.height - 60) {
              doc.addPage();
              y = 40;
            }
            const row = item as Record<string, unknown>;
            headers.forEach((h, i) => {
              let val = row[h];
              if (val === null || val === undefined) val = "";
              if (typeof val === "object") val = JSON.stringify(val);
              doc.text(String(val), startX + i * colWidth, y, {
                width: colWidth - 2,
                align: "left",
                lineBreak: false,
              });
            });
            y += 12;
          }
        } else {
          doc.fontSize(12).text("No data available", { align: "center" });
        }

        doc.end();
        const pdfBuffer = await pdfReady;
        const filename = `${report_type}-${Date.now()}.pdf`;
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(pdfBuffer);
      }

      if (format === "csv") {
        const flatData = Array.isArray(reportData)
          ? reportData
          : typeof reportData === "object" && reportData !== null
            ? Object.entries(reportData).map(([key, value]) => {
                if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                  return { key, ...(value as Record<string, unknown>) };
                }
                return { key, value };
              })
            : [{ data: reportData }];

        if (flatData.length === 0) {
          return res.status(404).json({ message: "لا توجد بيانات للتصدير", success: false });
        }

        const headers = Object.keys(flatData[0] as Record<string, unknown>);
        const csvRows = [headers.join(",")];
        for (const item of flatData) {
          const row = item as Record<string, unknown>;
          csvRows.push(
            headers.map((h) => {
              const val = row[h];
              if (val === null || val === undefined) return "";
              const str = typeof val === "object" ? JSON.stringify(val) : String(val);
              return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
            }).join(",")
          );
        }

        const csvContent = "\uFEFF" + csvRows.join("\n");
        const filename = `${report_type}-${Date.now()}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csvContent);
      }

      return res.status(400).json({
        message: "صيغة التصدير غير مدعومة. الصيغ المتاحة: json, excel, csv",
        success: false,
      });
    } catch (error) {
      console.error("Export report error:", error);
      res.status(500).json({
        message: "خطأ في تصدير التقرير",
        success: false,
      });
    }
  });

  // Adobe PDF Generation API
  app.post("/api/pdf/generate", requireAuth, async (req, res) => {
    try {
      const { isAdobePDFConfigured, mergeDocumentToPDF, generatePDFFromTemplate } = await import("./services/adobe-pdf/pdf-service");
      
      if (!isAdobePDFConfigured()) {
        return res.status(503).json({ message: "خدمة Adobe PDF غير مهيأة", success: false });
      }

      const { templateName, templatePath, jsonData, outputFormat = "pdf" } = req.body;

      if (!jsonData || typeof jsonData !== "object") {
        return res.status(400).json({ message: "بيانات JSON مطلوبة", success: false });
      }

      let pdfBuffer: Buffer;

      if (templateName) {
        pdfBuffer = await generatePDFFromTemplate(templateName, jsonData, outputFormat);
      } else if (templatePath) {
        pdfBuffer = await mergeDocumentToPDF({ templatePath, jsonData, outputFormat });
      } else {
        return res.status(400).json({ message: "اسم القالب أو مسار القالب مطلوب", success: false });
      }

      const contentType = outputFormat === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const ext = outputFormat === "pdf" ? "pdf" : "docx";

      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="document.${ext}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({
        message: "خطأ في إنشاء ملف PDF",
        success: false,
      });
    }
  });

  app.get("/api/pdf/status", requireAuth, async (req, res) => {
    try {
      const { isAdobePDFConfigured } = await import("./services/adobe-pdf/pdf-service");
      res.json({
        configured: isAdobePDFConfigured(),
        service: "Adobe Document Generation API",
        success: true,
      });
    } catch (error) {
      res.json({ configured: false, success: false });
    }
  });

  app.get("/api/pdf/templates", requireAuth, async (req, res) => {
    try {
      const fs = await import("fs");
      const path = await import("path");
      const templatesDir = path.join(process.cwd(), "server", "services", "adobe-pdf", "templates");
      
      if (!fs.existsSync(templatesDir)) {
        return res.json({ templates: [], success: true });
      }

      const files = fs.readdirSync(templatesDir).filter((f: string) => f.endsWith(".docx"));
      res.json({ templates: files, success: true });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب القوالب", success: false });
    }
  });

  // Base API endpoint - return 404 instead of serving HTML
  app.get("/api", (req, res) => {
    res.status(404).json({
      message: "API endpoint not found",
      availableEndpoints: [
        "/api/health",
        "/api/me",
        "/api/login",
        "/api/logout",
        "/api/orders",
        "/api/production-orders",
        "/api/notifications",
      ],
    });
  });

  // Handle HEAD requests to /api to stop constant polling - suppress logging
  app.head("/api", (req, res) => {
    // Don't log these spam requests - they're likely from browser extensions or dev tools
    res.status(404).end();
  });

  // Translation API for customer names
  app.post("/api/translate-name", requireAuth, async (req, res) => {
    try {
      const { text, targetLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ message: "النص واللغة المستهدفة مطلوبان" });
      }
      
      // Check if OpenAI is available
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI();
      
      const prompt = targetLanguage === "en" 
        ? `Transliterate the following Arabic name to English letters. Only provide the transliteration without quotes or any additional text: ${text}`
        : `For the English name "${text}", provide:
1. First: The Arabic meaning translation (translate the meaning of the words to Arabic)
2. Second: The Arabic transliteration in parentheses (how it sounds in Arabic letters)

Example: "Price House" should become "بيت الأسعار (برايس هاوس)"
Format: [meaning in Arabic] ([transliteration])
Do not include quotes or explanations.`;
      
      const systemContent = targetLanguage === "en"
        ? "You are a professional transliterator. Convert Arabic names to English letters (transliteration). Never use quotes in your response. Just provide the transliterated name directly."
        : "You are a professional Arabic translator. Translate English names to Arabic by providing: 1) The meaning translation first, 2) Then the transliteration (how it sounds) in parentheses. Example: Price House = بيت الأسعار (برايس هاوس). Do not use quotes.";
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { 
            role: "system", 
            content: systemContent
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 150,
      });
      
      let translatedText = response.choices[0]?.message?.content?.trim() || "";
      // Remove any quotes that might still appear
      translatedText = translatedText.replace(/^["']|["']$/g, "").trim();
      
      res.json({ translatedText });
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ 
        message: "خطأ في الترجمة",
        error: "خطأ داخلي"
      });
    }
  });

  // Customers routes
  app.post("/api/customers", requireAuth, requirePermission('manage_customers', 'manage_definitions'), async (req, res) => {
    try {
      const validatedData = insertCustomerSchema.parse(req.body);
      
      // Convert empty strings to null for fields with length constraints
      const cleanedData = {
        ...validatedData,
        code: validatedData.code || null,
        user_id: validatedData.user_id || null,
        tax_number: validatedData.tax_number || null,
        plate_drawer_code: validatedData.plate_drawer_code || null,
      };
      
      const customer = await storage.createCustomer(cleanedData);
      res.json(customer);
    } catch (error) {
      console.error("Customer creation error:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      res.status(400).json({
        message: "بيانات غير صحيحة",
        error: "خطأ داخلي",
      });
    }
  });

  app.put("/api/customers/:id", requireAuth, requirePermission('manage_customers', 'manage_definitions'), async (req, res) => {
    try {
      const id = req.params.id;
      const validatedData = insertCustomerSchema.parse(req.body);
      
      // Convert empty strings to null for fields with length constraints
      const cleanedData = {
        ...validatedData,
        code: validatedData.code || null,
        user_id: validatedData.user_id || null,
        tax_number: validatedData.tax_number || null,
        plate_drawer_code: validatedData.plate_drawer_code || null,
      };
      
      const customer = await storage.updateCustomer(id, cleanedData);
      res.json(customer);
    } catch (error) {
      console.error("Customer update error:", error);
      res.status(400).json({
        message: "خطأ في تحديث العميل",
        error: "خطأ داخلي",
      });
    }
  });

  // Sections routes
  app.get("/api/sections", requireAuth, async (req, res) => {
    try {
      const sections = await storage.getSections();
      res.json(sections);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب الأقسام" });
    }
  });

  // Material Groups routes (Categories)
  app.get("/api/material-groups", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching material groups:", error);
      res.status(500).json({ message: "خطأ في جلب مجموعات المواد" });
    }
  });

  // Items routes
  app.get("/api/items", requireAuth, async (req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching items:", error);
      res.status(500).json({ message: "خطأ في جلب الأصناف" });
    }
  });

  // Customer Products routes
  app.get("/api/customer-products", requireAuth, async (req, res) => {
    try {
      const { customer_id, ids, page, limit, search } = req.query;
      
      const options: { customer_id?: string; ids?: number[]; page?: number; limit?: number; search?: string } = {};
      
      if (customer_id && typeof customer_id === 'string') {
        options.customer_id = customer_id;
      }
      
      if (ids && typeof ids === 'string') {
        options.ids = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      }
      
      if (page && typeof page === 'string') {
        options.page = Math.max(parseInt(page) || 1, 1);
      }
      
      if (limit && typeof limit === 'string') {
        options.limit = Math.min(Math.max(parseInt(limit) || 50, 1), 500);
      }
      
      if (search && typeof search === 'string') {
        options.search = search;
      }
      
      const result = await storage.getCustomerProducts(options);
      res.json(result);
    } catch (error) {
      console.error("Customer products fetch error:", error);
      res.status(500).json({ message: "خطأ في جلب منتجات العملاء" });
    }
  });

  app.post("/api/customer-products", requireAuth, requirePermission('manage_customers', 'manage_definitions'), async (req, res) => {
    try {
      // STEP 1: Zod schema validation
      const validatedData = insertCustomerProductSchema.parse(req.body);

      // STEP 2: DataValidator integration for business rules
      const validationResult = await getDataValidator(storage).validateData(
        "customer_products",
        validatedData,
      );
      if (!validationResult.isValid) {
        const criticalErrors = validationResult.errors.filter(
          (e) => e.severity === "critical" || e.severity === "high",
        );
        if (criticalErrors.length > 0) {
          return res.status(400).json({
            message: criticalErrors[0].message_ar || criticalErrors[0].message,
            errors: validationResult.errors,
            success: false,
          });
        }
      }

      // STEP 3: Create customer product with validated data
      const customerProduct =
        await storage.createCustomerProduct(validatedData);

      res.status(201).json({
        data: customerProduct,
        message: "تم إنشاء منتج العميل بنجاح",
        success: true,
      });
    } catch (error: any) {
      console.error("Customer product creation error:", error);

      res.status(500).json({
        message: "خطأ في إنشاء منتج العميل",
        success: false,
      });
    }
  });

  // Locations routes
  app.get("/api/locations", requireAuth, async (req, res) => {
    try {
      const locations = await storage.getLocations();
      res.json(locations);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب المواقع" });
    }
  });

  app.post("/api/locations", requireAuth, async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocationExtended(validatedData);
      res.json(location);
    } catch (error) {
      console.error("Location creation error:", error);
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  app.put("/api/locations/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const validatedData = insertLocationSchema.partial().parse(req.body);
      const location = await storage.updateLocationExtended(id, validatedData);
      res.json(location);
    } catch (error) {
      console.error("Location update error:", error);
      res.status(400).json({ message: "فشل في تحديث الموقع" });
    }
  });

  // Inventory movements routes
  app.get("/api/inventory-movements", requireAuth, async (req, res) => {
    try {
      const movements = await storage.getInventoryMovements();
      res.json(movements);
    } catch (error) {
      console.error("Error fetching inventory movements:", error);
      res.status(500).json({ message: "خطأ في جلب حركات المخزون" });
    }
  });

  app.post("/api/inventory-movements", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      const validatedData = insertInventoryMovementSchema.parse(req.body);
      const movement = await storage.createInventoryMovement(validatedData);
      res.json(movement);
    } catch (error) {
      console.error("Inventory movement creation error:", error);
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  app.delete("/api/inventory-movements/:id", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id) {
        return res.status(400).json({ message: "معرف الحركة مطلوب" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "معرف الحركة غير صحيح" });
      }

      await storage.deleteInventoryMovement(id);
      res.json({ message: "تم حذف الحركة بنجاح" });
    } catch (error) {
      console.error("Inventory movement deletion error:", error);
      res.status(500).json({ message: "خطأ في حذف الحركة" });
    }
  });

  // Users routes
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getSafeUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching safe users:", error);
      res.status(500).json({ message: "خطأ في جلب المستخدمين" });
    }
  });

  app.get("/api/users/sales-reps", requireAuth, async (req, res) => {
    try {
      // Sales section ID is 7 (SEC07)
      const salesReps = await storage.getSafeUsersBySection(7);
      res.json(salesReps);
    } catch (error) {
      console.error("Error fetching sales reps:", error);
      res.status(500).json({ message: "خطأ في جلب مندوبي المبيعات" });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id) {
        return res.status(400).json({ message: "معرف المستخدم مطلوب" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "معرف المستخدم غير صحيح" });
      }

      const user = await storage.getSafeUser(id);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching safe user by ID:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات المستخدم" });
    }
  });

  // Categories routes (for material groups)
  app.get("/api/categories", requireAuth, async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب الفئات" });
    }
  });

  app.post("/api/categories", requireAuth, requirePermission('manage_categories', 'manage_definitions'), async (req, res) => {
    try {

      // Generate sequential ID if not provided with enhanced null safety
      let categoryId = req.body?.id;
      if (!categoryId) {
        const existingCategories = (await storage.getCategories()) || [];
        const categoryNumbers = existingCategories
          .map((cat) => cat?.id)
          .filter(
            (id) =>
              id &&
              typeof id === "string" &&
              id.startsWith("CAT") &&
              id.length <= 6,
          ) // Standard format only
          .map((id) => {
            const num = id.replace("CAT", "");
            const parsed = parseInt(num);
            return isNaN(parsed) ? 0 : parsed;
          })
          .filter((num) => num > 0)
          .sort((a, b) => b - a);

        const nextNumber =
          categoryNumbers.length > 0 ? categoryNumbers[0] + 1 : 1;
        categoryId = nextNumber < 10 ? `CAT0${nextNumber}` : `CAT${nextNumber}`;
      }

      // Enhanced null safety for request body processing
      const processedData = {
        ...req.body,
        id: categoryId,
        parent_id:
          !req.body?.parent_id ||
          req.body.parent_id === "none" ||
          req.body.parent_id === ""
            ? null
            : req.body.parent_id,
        code: !req.body?.code || req.body.code === "" ? null : req.body.code,
      };

      const category = await storage.createCategory(processedData);
      res.json(category);
    } catch (error) {
      console.error("Category creation error:", error);
      res.status(500).json({
        message: "خطأ في إنشاء الفئة",
        error: "خطأ داخلي",
      });
    }
  });

  app.put("/api/categories/:id", requireAuth, requirePermission('manage_categories', 'manage_definitions'), async (req, res) => {
    try {
      const id = req.params.id;

      const processedData = {
        ...req.body,
        parent_id:
          req.body.parent_id === "none" || req.body.parent_id === ""
            ? null
            : req.body.parent_id,
        code: req.body.code === "" || !req.body.code ? null : req.body.code,
      };

      const category = await storage.updateCategory(id, processedData);
      res.json(category);
    } catch (error) {
      console.error("Category update error:", error);
      res.status(500).json({
        message: "خطأ في تحديث الفئة",
        error: "خطأ داخلي",
      });
    }
  });

  app.delete("/api/categories/:id", requireAuth, requirePermission('manage_categories', 'manage_definitions'), async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteCategory(id);
      res.json({ message: "تم حذف الفئة بنجاح" });
    } catch (error) {
      console.error("Category deletion error:", error);
      res.status(500).json({
        message: "خطأ في حذف الفئة",
        error: "خطأ داخلي",
      });
    }
  });

  // ===== Master Batch Colors Routes =====
  app.get("/api/master-batch-colors", requireAuth, async (req, res) => {
    try {
      const colors = await storage.getMasterBatchColors();
      res.json(colors);
    } catch (error) {
      console.error("Error fetching master batch colors:", error);
      res.status(500).json({ message: "خطأ في جلب ألوان الماستر باتش" });
    }
  });

  app.get("/api/master-batch-colors/:id", requireAuth, async (req, res) => {
    try {
      const color = await storage.getMasterBatchColorById(req.params.id);
      if (!color) {
        return res.status(404).json({ message: "اللون غير موجود" });
      }
      res.json(color);
    } catch (error) {
      console.error("Error fetching master batch color:", error);
      res.status(500).json({ message: "خطأ في جلب لون الماستر باتش" });
    }
  });

  app.post("/api/master-batch-colors", requireAuth, requirePermission('manage_master_batch', 'manage_definitions'), async (req, res) => {
    try {
      const parseResult = insertMasterBatchColorSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "بيانات غير صحيحة",
          errors: parseResult.error.errors 
        });
      }
      const color = await storage.createMasterBatchColor(parseResult.data);
      res.status(201).json(color);
    } catch (error) {
      console.error("Error creating master batch color:", error);
      res.status(500).json({ 
        message: "خطأ في إنشاء لون الماستر باتش",
        error: "خطأ داخلي"
      });
    }
  });

  app.put("/api/master-batch-colors/:id", requireAuth, requirePermission('manage_master_batch', 'manage_definitions'), async (req, res) => {
    try {
      const parseResult = insertMasterBatchColorSchema.partial().safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "بيانات غير صحيحة",
          errors: parseResult.error.errors 
        });
      }
      const color = await storage.updateMasterBatchColor(req.params.id, parseResult.data);
      res.json(color);
    } catch (error) {
      console.error("Error updating master batch color:", error);
      res.status(500).json({ 
        message: "خطأ في تحديث لون الماستر باتش",
        error: "خطأ داخلي"
      });
    }
  });

  app.delete("/api/master-batch-colors/:id", requireAuth, requirePermission('manage_master_batch', 'manage_definitions'), async (req, res) => {
    try {
      await storage.deleteMasterBatchColor(req.params.id);
      res.json({ message: "تم حذف اللون بنجاح" });
    } catch (error) {
      console.error("Error deleting master batch color:", error);
      res.status(500).json({ 
        message: "خطأ في حذف لون الماستر باتش",
        error: "خطأ داخلي"
      });
    }
  });

  // Training Records routes
  app.get("/api/training-records", requireAuth, async (req, res) => {
    try {
      const trainingRecords = await storage.getTrainingRecords();
      res.json(trainingRecords);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب سجلات التدريب" });
    }
  });

  app.post("/api/training-records", requireAuth, async (req, res) => {
    try {
      const trainingRecord = await storage.createTrainingRecord(req.body);
      res.json(trainingRecord);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  // Admin Decisions routes
  app.get("/api/admin-decisions", requireAuth, async (req, res) => {
    try {
      const adminDecisions = await storage.getAdminDecisions();
      res.json(adminDecisions);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب القرارات الإدارية" });
    }
  });

  app.post("/api/admin-decisions", requireAuth, async (req, res) => {
    try {
      const adminDecision = await storage.createAdminDecision(req.body);
      res.json(adminDecision);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  app.get("/api/warehouse-items", requireAuth, async (req, res) => {
    try {
      const inventoryData = await db
        .select({
          id: inventory.id,
          item_id: inventory.item_id,
          name: items.name,
          name_ar: items.name_ar,
          quantity: inventory.current_stock,
          unit: inventory.unit,
          min_quantity: inventory.min_stock,
          category: items.category_id,
        })
        .from(inventory)
        .leftJoin(items, eq(inventory.item_id, items.id));
      res.json(inventoryData);
    } catch (error) {
      console.error("[API Error] warehouse-items:", error);
      res.json([]);
    }
  });

  // Warehouse Transactions routes
  app.get("/api/warehouse-transactions", requireAuth, async (req, res) => {
    try {
      const warehouseTransactions = await storage.getWarehouseTransactions();
      res.json(warehouseTransactions);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب حركات المستودع" });
    }
  });

  app.post("/api/warehouse-transactions", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      const warehouseTransaction = await storage.createWarehouseTransaction(
        req.body,
      );
      res.json(warehouseTransaction);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  // Mixing Recipes routes
  app.get("/api/mixing-recipes", requireAuth, async (req, res) => {
    try {
      const mixingRecipes = await storage.getMixingRecipes();
      res.json(mixingRecipes);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب وصفات الخلط" });
    }
  });

  app.post("/api/mixing-recipes", requireAuth, async (req, res) => {
    try {
      const mixingRecipe = await storage.createMixingRecipe(req.body);
      res.json(mixingRecipe);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  // Maintenance routes
  app.get("/api/maintenance", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getMaintenanceRequests();
      res.json(requests);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب طلبات الصيانة" });
    }
  });

  app.post("/api/maintenance", requireAuth, async (req, res) => {
    try {
      const validatedData = insertMaintenanceRequestSchema.parse(req.body);
      const request = await storage.createMaintenanceRequest(validatedData);
      res.json(request);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  // Quality checks routes
  app.get("/api/quality-checks", requireAuth, async (req, res) => {
    try {
      const qualityChecks = await storage.getQualityChecks();
      res.json(qualityChecks);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب فحوصات الجودة" });
    }
  });

  app.get("/api/quality-issues", requireAuth, async (req: AuthRequest, res) => {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.source) filters.source = req.query.source;
      if (req.query.severity) filters.severity = req.query.severity;
      if (req.query.customer_id) filters.customer_id = req.query.customer_id;
      if (req.query.dateFrom) filters.dateFrom = req.query.dateFrom;
      if (req.query.dateTo) filters.dateTo = req.query.dateTo;
      const issues = await storage.getQualityIssues(filters);
      res.json({ success: true, data: issues });
    } catch (error: any) {
      console.error("Error fetching quality issues:", error);
      res.status(500).json({ message: "خطأ في جلب مشاكل الجودة" });
    }
  });

  app.get("/api/quality-issues/stats", requireAuth, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getQualityIssueStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error("Error fetching quality stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات الجودة" });
    }
  });

  app.get("/api/quality-issues/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const issue = await storage.getQualityIssueById(id);
      if (!issue) return res.status(404).json({ message: "لم يتم العثور على المشكلة" });
      res.json({ success: true, data: issue });
    } catch (error: any) {
      console.error("Error fetching quality issue:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات المشكلة" });
    }
  });

  app.post("/api/quality-issues", requireAuth, requirePermission('manage_quality'), async (req: AuthRequest, res) => {
    try {
      const issue = await storage.createQualityIssue(req.body);
      res.status(201).json({ success: true, data: issue });
    } catch (error: any) {
      console.error("Error creating quality issue:", error);
      res.status(500).json({ message: "خطأ في إنشاء مشكلة الجودة" });
    }
  });

  app.patch("/api/quality-issues/:id", requireAuth, requirePermission('manage_quality'), async (req: AuthRequest, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const issue = await storage.updateQualityIssue(id, req.body);
      if (!issue) return res.status(404).json({ message: "لم يتم العثور على المشكلة" });
      res.json({ success: true, data: issue });
    } catch (error: any) {
      console.error("Error updating quality issue:", error);
      res.status(500).json({ message: "خطأ في تحديث مشكلة الجودة" });
    }
  });

  app.delete("/api/quality-issues/:id", requireAuth, requirePermission('manage_quality'), async (req: AuthRequest, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const deleted = await storage.deleteQualityIssue(id);
      if (!deleted) return res.status(404).json({ message: "لم يتم العثور على المشكلة" });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting quality issue:", error);
      res.status(500).json({ message: "خطأ في حذف مشكلة الجودة" });
    }
  });

  app.post("/api/quality-issues/:id/responsibles", requireAuth, requirePermission('manage_quality'), async (req: AuthRequest, res) => {
    try {
      const issueId = parseRouteParam(req.params.id, "id");
      const resp = await storage.addQualityIssueResponsible({ ...req.body, quality_issue_id: issueId });
      res.status(201).json({ success: true, data: resp });
    } catch (error: any) {
      console.error("Error adding responsible:", error);
      res.status(500).json({ message: "خطأ في إضافة المتسبب" });
    }
  });

  app.patch("/api/quality-issues/responsibles/:id", requireAuth, requirePermission('manage_quality'), async (req: AuthRequest, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const resp = await storage.updateQualityIssueResponsible(id, req.body);
      if (!resp) return res.status(404).json({ message: "لم يتم العثور على السجل" });
      res.json({ success: true, data: resp });
    } catch (error: any) {
      console.error("Error updating responsible:", error);
      res.status(500).json({ message: "خطأ في تحديث بيانات المتسبب" });
    }
  });

  app.delete("/api/quality-issues/responsibles/:id", requireAuth, requirePermission('manage_quality'), async (req: AuthRequest, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const deleted = await storage.deleteQualityIssueResponsible(id);
      if (!deleted) return res.status(404).json({ message: "لم يتم العثور على السجل" });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting responsible:", error);
      res.status(500).json({ message: "خطأ في حذف المتسبب" });
    }
  });

  app.post("/api/quality-issues/:id/actions", requireAuth, requirePermission('manage_quality'), async (req: AuthRequest, res) => {
    try {
      const issueId = parseRouteParam(req.params.id, "id");
      const action = await storage.addQualityIssueAction({ ...req.body, quality_issue_id: issueId });
      res.status(201).json({ success: true, data: action });
    } catch (error: any) {
      console.error("Error adding action:", error);
      res.status(500).json({ message: "خطأ في إضافة الإجراء" });
    }
  });

  app.patch("/api/quality-issues/actions/:id", requireAuth, requirePermission('manage_quality'), async (req: AuthRequest, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const action = await storage.updateQualityIssueAction(id, req.body);
      if (!action) return res.status(404).json({ message: "لم يتم العثور على الإجراء" });
      res.json({ success: true, data: action });
    } catch (error: any) {
      console.error("Error updating action:", error);
      res.status(500).json({ message: "خطأ في تحديث الإجراء" });
    }
  });

  // Maintenance requests routes
  app.get("/api/maintenance-requests", requireAuth, async (req, res) => {
    try {
      const maintenanceRequests = await storage.getMaintenanceRequests();
      res.json(maintenanceRequests);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب طلبات الصيانة" });
    }
  });

  app.post("/api/maintenance-requests", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      
      // Process the data to convert string values to appropriate types
      const processedData = { ...req.body };
      
      // machine_id stays as string (e.g., 'MAC12')
      // No conversion needed
      
      // Convert reported_by from string to number
      if (processedData.reported_by && typeof processedData.reported_by === 'string') {
        processedData.reported_by = parseInt(processedData.reported_by, 10);
      }
      
      // Convert assigned_to from empty string to null, or from string to number
      if (processedData.assigned_to === '' || processedData.assigned_to === 'none') {
        processedData.assigned_to = null;
      } else if (processedData.assigned_to && typeof processedData.assigned_to === 'string') {
        processedData.assigned_to = parseInt(processedData.assigned_to, 10);
      }
      
      const validatedData = insertMaintenanceRequestSchema.parse(processedData);
      const request = await storage.createMaintenanceRequest(validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error creating maintenance request:", error);
      res.status(500).json({
        message: "خطأ في إنشاء طلب الصيانة",
        error: "خطأ داخلي",
      });
    }
  });

  // Maintenance Actions routes
  app.get("/api/maintenance-actions", requireAuth, async (req, res) => {
    try {
      const actions = await storage.getAllMaintenanceActions();
      res.json(actions);
    } catch (error) {
      console.error("Error fetching maintenance actions:", error);
      res.status(500).json({ message: "خطأ في جلب إجراءات الصيانة" });
    }
  });

  app.get("/api/maintenance-actions/request/:requestId", requireAuth, async (req, res) => {
    try {
      const requestId = parseRouteParam(req.params.requestId, "Request ID");
      const actions = await storage.getMaintenanceActionsByRequestId(requestId);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching maintenance actions by request:", error);
      res.status(500).json({ message: "خطأ في جلب إجراءات الصيانة للطلب" });
    }
  });

  app.post("/api/maintenance-actions", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const data = insertMaintenanceActionSchema.parse(req.body);
      const action = await storage.createMaintenanceAction(data);
      res.json(action);
    } catch (error) {
      console.error("Error creating maintenance action:", error);
      res.status(500).json({
        message: "خطأ في إنشاء إجراء الصيانة",
        error: "خطأ داخلي",
      });
    }
  });

  app.put("/api/maintenance-actions/:id", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const action = await storage.updateMaintenanceAction(id, req.body);
      res.json(action);
    } catch (error) {
      console.error("Error updating maintenance action:", error);
      res.status(500).json({ message: "خطأ في تحديث إجراء الصيانة" });
    }
  });

  app.delete("/api/maintenance-actions/:id", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      await storage.deleteMaintenanceAction(id);
      res.json({ message: "تم حذف إجراء الصيانة بنجاح" });
    } catch (error) {
      console.error("Error deleting maintenance action:", error);
      res.status(500).json({ message: "خطأ في حذف إجراء الصيانة" });
    }
  });

  // Maintenance Reports routes
  app.get("/api/maintenance-reports", requireAuth, async (req, res) => {
    try {
      const { type } = req.query;
      const reports = type
        ? await storage.getMaintenanceReportsByType(type as string)
        : await storage.getAllMaintenanceReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching maintenance reports:", error);
      res.status(500).json({ message: "خطأ في جلب بلاغات الصيانة" });
    }
  });

  app.post("/api/maintenance-reports", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const data = insertMaintenanceReportSchema.parse(req.body);
      const report = await storage.createMaintenanceReport(data);
      res.json(report);
    } catch (error) {
      console.error("Error creating maintenance report:", error);
      res.status(500).json({ message: "خطأ في إنشاء بلاغ الصيانة" });
    }
  });

  app.put("/api/maintenance-reports/:id", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const report = await storage.updateMaintenanceReport(id, req.body);
      res.json(report);
    } catch (error) {
      console.error("Error updating maintenance report:", error);
      res.status(500).json({ message: "خطأ في تحديث بلاغ الصيانة" });
    }
  });

  app.delete("/api/maintenance-reports/:id", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      await storage.deleteMaintenanceReport(id);
      res.json({ message: "تم حذف بلاغ الصيانة بنجاح" });
    } catch (error) {
      console.error("Error deleting maintenance report:", error);
      res.status(500).json({ message: "خطأ في حذف بلاغ الصيانة" });
    }
  });

  // Operator Negligence Reports routes
  app.get("/api/operator-negligence-reports", requireAuth, async (req, res) => {
    try {
      const { operator_id } = req.query;
      const reports = operator_id
        ? await storage.getOperatorNegligenceReportsByOperator(
            parseInt(operator_id as string),
          )
        : await storage.getAllOperatorNegligenceReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching operator negligence reports:", error);
      res.status(500).json({ message: "خطأ في جلب بلاغات إهمال المشغلين" });
    }
  });

  app.post("/api/operator-negligence-reports", requireAuth, async (req, res) => {
    try {
      const data = insertOperatorNegligenceReportSchema.parse(req.body);
      const report = await storage.createOperatorNegligenceReport(data);
      res.json(report);
    } catch (error) {
      console.error("Error creating operator negligence report:", error);
      res.status(500).json({ message: "خطأ في إنشاء بلاغ إهمال المشغل" });
    }
  });

  app.put("/api/operator-negligence-reports/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const report = await storage.updateOperatorNegligenceReport(id, req.body);
      res.json(report);
    } catch (error) {
      console.error("Error updating operator negligence report:", error);
      res.status(500).json({ message: "خطأ في تحديث بلاغ إهمال المشغل" });
    }
  });

  app.delete("/api/operator-negligence-reports/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      await storage.deleteOperatorNegligenceReport(id);
      res.json({ message: "تم حذف بلاغ إهمال المشغل بنجاح" });
    } catch (error) {
      console.error("Error deleting operator negligence report:", error);
      res.status(500).json({ message: "خطأ في حذف بلاغ إهمال المشغل" });
    }
  });

  // Spare Parts routes
  app.get("/api/spare-parts", requireAuth, async (req, res) => {
    try {
      const spareParts = await storage.getAllSpareParts();
      res.json(spareParts);
    } catch (error) {
      console.error("Error fetching spare parts:", error);
      res.status(500).json({ message: "خطأ في جلب قطع الغيار" });
    }
  });

  app.post("/api/spare-parts", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const sparePart = await storage.createSparePart(req.body);
      res.json(sparePart);
    } catch (error) {
      console.error("Error creating spare part:", error);
      res.status(500).json({ message: "خطأ في إنشاء قطعة الغيار" });
    }
  });

  app.put("/api/spare-parts/:id", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const sparePart = await storage.updateSparePart(id, req.body);
      res.json(sparePart);
    } catch (error) {
      console.error("Error updating spare part:", error);
      res.status(500).json({ message: "خطأ في تحديث قطعة الغيار" });
    }
  });

  app.delete("/api/spare-parts/:id", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      await storage.deleteSparePart(id);
      res.json({ message: "تم حذف قطعة الغيار بنجاح" });
    } catch (error) {
      console.error("Error deleting spare part:", error);
      res.status(500).json({ message: "خطأ في حذف قطعة الغيار" });
    }
  });

  // Consumable Parts routes
  app.get("/api/consumable-parts", requireAuth, async (req, res) => {
    try {
      const consumableParts = await storage.getAllConsumableParts();
      res.json(consumableParts);
    } catch (error) {
      console.error("Error fetching consumable parts:", error);
      res.status(500).json({ message: "خطأ في جلب قطع الغيار الاستهلاكية" });
    }
  });

  app.post("/api/consumable-parts", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const consumablePart = await storage.createConsumablePart(req.body);
      res.json(consumablePart);
    } catch (error) {
      console.error("Error creating consumable part:", error);
      res.status(500).json({ message: "خطأ في إنشاء قطعة الغيار الاستهلاكية" });
    }
  });

  app.put("/api/consumable-parts/:id", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const consumablePart = await storage.updateConsumablePart(id, req.body);
      res.json(consumablePart);
    } catch (error) {
      console.error("Error updating consumable part:", error);
      res.status(500).json({ message: "خطأ في تحديث قطعة الغيار الاستهلاكية" });
    }
  });

  app.delete("/api/consumable-parts/:id", requireAuth, requirePermission('manage_maintenance'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      await storage.deleteConsumablePart(id);
      res.json({ message: "تم حذف قطعة الغيار الاستهلاكية بنجاح" });
    } catch (error) {
      console.error("Error deleting consumable part:", error);
      res.status(500).json({ message: "خطأ في حذف قطعة الغيار الاستهلاكية" });
    }
  });

  // Consumable Parts Transactions routes - list all
  app.get("/api/consumable-parts-transactions", requireAuth, async (req, res) => {
    try {
      const allParts = await storage.getConsumableParts();
      const allTransactions = [];
      for (const part of allParts) {
        const transactions = await storage.getConsumablePartTransactions(part.id);
        allTransactions.push(...transactions);
      }
      res.json(allTransactions);
    } catch (error) {
      console.error("Error fetching consumable parts transactions:", error);
      res
        .status(500)
        .json({ message: "خطأ في جلب حركات قطع الغيار الاستهلاكية" });
    }
  });

  app.get(
    "/api/consumable-parts-transactions/part/:partId",
    requireAuth,
    async (req, res) => {
      try {
        const partId = parseRouteParam(req.params.partId, "Part ID");
        const transactions =
          await storage.getConsumablePartTransactionsByPartId(partId);
        res.json(transactions);
      } catch (error) {
        console.error(
          "Error fetching consumable parts transactions by part:",
          error,
        );
        res
          .status(500)
          .json({ message: "خطأ في جلب حركات قطعة الغيار الاستهلاكية" });
      }
    },
  );

  app.post("/api/consumable-parts-transactions", requireAuth, async (req, res) => {
    try {
      const transaction = await storage.createConsumablePartTransaction(
        req.body,
      );
      res.json(transaction);
    } catch (error) {
      console.error("Error creating consumable parts transaction:", error);
      res
        .status(500)
        .json({ message: "خطأ في إنشاء حركة قطعة الغيار الاستهلاكية" });
    }
  });

  // Barcode scanning endpoint for consumable parts
  app.post("/api/consumable-parts/scan-barcode", requireAuth, async (req, res) => {
    try {
      const { barcode } = req.body;
      if (!barcode) {
        return res.status(400).json({ message: "الباركود مطلوب" });
      }

      const consumablePart = await storage.getConsumablePartByBarcode(barcode);
      if (!consumablePart) {
        return res
          .status(404)
          .json({ message: "لم يتم العثور على قطعة غيار بهذا الباركود" });
      }

      res.json(consumablePart);
    } catch (error) {
      console.error("Error scanning barcode:", error);
      res.status(500).json({ message: "خطأ في قراءة الباركود" });
    }
  });

  // Process barcode transaction (in/out)
  app.post("/api/consumable-parts/barcode-transaction", requireAuth, async (req, res) => {
    try {
      const {
        barcode,
        transaction_type,
        quantity,
        transaction_reason,
        notes,
        manual_entry,
      } = req.body;

      if (!getAuthUserId(req)) {
        return res.status(401).json({ message: "يجب تسجيل الدخول لإجراء حركة مخزنية" });
      }

      if (!barcode || !transaction_type || !quantity) {
        return res
          .status(400)
          .json({ message: "الباركود ونوع الحركة والكمية مطلوبة" });
      }

      // Find consumable part by barcode
      const consumablePart = await storage.getConsumablePartByBarcode(barcode);
      if (!consumablePart) {
        return res
          .status(404)
          .json({ message: "لم يتم العثور على قطعة غيار بهذا الباركود" });
      }

      // Create transaction
      const transactionData = {
        consumable_part_id: consumablePart.id,
        transaction_type,
        quantity: parseInt(quantity),
        barcode_scanned: barcode,
        manual_entry: manual_entry || false,
        transaction_reason: transaction_reason || "",
        notes: notes || "",
        performed_by: getAuthUserId(req),
      };

      const transaction =
        await storage.processConsumablePartBarcodeTransaction(transactionData);
      res.json(transaction);
    } catch (error) {
      console.error("Error processing barcode transaction:", error);
      res.status(500).json({ message: "خطأ في معالجة حركة الباركود" });
    }
  });


  // Reports endpoint
  app.get("/api/reports", requireAuth, async (req, res) => {
    try {
      const reports: any[] = []; // Placeholder for reports data
      res.json(reports);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب التقارير" });
    }
  });

  app.post("/api/machines", requireAuth, requirePermission('manage_machines', 'manage_definitions'), async (req, res) => {
    try {

      // Generate sequential ID if not provided with enhanced null safety
      let machineId = req.body?.id;
      if (!machineId) {
        // Get the latest machine to determine the next sequential number
        const existingMachines = (await storage.getMachines()) || [];
        const machineNumbers = existingMachines
          .map((machine) => machine?.id)
          .filter((id) => id && typeof id === "string" && id.startsWith("MAC"))
          .map((id) => {
            const num = id.replace("MAC", "");
            const parsed = parseInt(num);
            return isNaN(parsed) ? 0 : parsed;
          })
          .filter((num) => num > 0)
          .sort((a, b) => b - a);

        const nextNumber =
          machineNumbers.length > 0 ? machineNumbers[0] + 1 : 1;
        machineId = `MAC${nextNumber.toString().padStart(2, "0")}`;
      }

      const processedData = {
        ...req.body,
        id: machineId,
      };

      // STEP 1: DataValidator integration for business rules
      const validationResult = await getDataValidator(storage).validateData(
        "machines",
        processedData,
      );
      if (!validationResult.isValid) {
        const criticalErrors = validationResult.errors.filter(
          (e) => e.severity === "critical" || e.severity === "high",
        );
        if (criticalErrors.length > 0) {
          return res.status(400).json({
            message: criticalErrors[0].message_ar || criticalErrors[0].message,
            errors: validationResult.errors,
            success: false,
          });
        }
      }

      const machine = await storage.createMachine(processedData);

      res.status(201).json({
        data: machine,
        message: "تم إنشاء الماكينة بنجاح",
        success: true,
      });
    } catch (error: any) {
      console.error("Machine creation error:", error);

      res.status(500).json({
        message: "خطأ في إنشاء الماكينة",
        success: false,
      });
    }
  });

  app.put("/api/machines/:id", requireAuth, requirePermission('manage_machines', 'manage_definitions'), async (req, res) => {
    try {
      const id = req.params.id; // Now using string ID
      
      // Clean up empty capacity fields - convert empty strings to null
      const cleanedData = {
        ...req.body,
        capacity_small_kg_per_hour: req.body.capacity_small_kg_per_hour === "" || req.body.capacity_small_kg_per_hour === null 
          ? null 
          : req.body.capacity_small_kg_per_hour,
        capacity_medium_kg_per_hour: req.body.capacity_medium_kg_per_hour === "" || req.body.capacity_medium_kg_per_hour === null 
          ? null 
          : req.body.capacity_medium_kg_per_hour,
        capacity_large_kg_per_hour: req.body.capacity_large_kg_per_hour === "" || req.body.capacity_large_kg_per_hour === null 
          ? null 
          : req.body.capacity_large_kg_per_hour,
      };
      
      const machine = await storage.updateMachine(id, cleanedData);
      res.json(machine);
    } catch (error) {
      console.error("Machine update error:", error);
      res.status(500).json({
        message: "خطأ في تحديث الماكينة",
        error: "خطأ داخلي",
      });
    }
  });

  // Users routes
  app.post("/api/users", requireAuth, requirePermission('manage_users'), async (req, res) => {
    try {

      // ID will be auto-generated by the database (serial/auto-increment)

      // Handle role_id conversion - convert role name to role ID
      let roleId = null;
      if (
        req.body.role_id &&
        req.body.role_id !== "" &&
        req.body.role_id !== "none"
      ) {
        if (typeof req.body.role_id === "string") {
          // Extract numeric ID from ROLE{number} format (e.g., ROLE09 -> 9)
          const roleMatch = req.body.role_id.match(/^ROLE(\d+)$/);
          if (roleMatch) {
            roleId = parseInt(roleMatch[1], 10);
          } else {
            // If it's a role name like 'admin', convert to role ID
            const roles = await getCachedRoles();
            const role = roles.find(
              (r) =>
                r.name === req.body.role_id || r.name_ar === req.body.role_id,
            );
            if (role) {
              roleId = role.id;
            } else {
              // If it's a numeric string, parse it
              const parsed = parseInt(req.body.role_id);
              if (!isNaN(parsed)) {
                roleId = parsed;
              }
            }
          }
        } else if (typeof req.body.role_id === "number") {
          roleId = req.body.role_id;
        }
      }

      let sectionId = null;
      if (
        req.body.section_id &&
        req.body.section_id !== "" &&
        req.body.section_id !== "none"
      ) {
        const sid = String(req.body.section_id);
        const sectionMatch = sid.match(/^SEC(\d+)$/);
        if (sectionMatch) {
          sectionId = parseInt(sectionMatch[1], 10);
        } else if (!isNaN(Number(sid))) {
          sectionId = Number(sid);
        }
      }

      const processedData = {
        username: req.body.username,
        password: req.body.password || require("crypto").randomBytes(12).toString("base64url"),
        display_name: req.body.display_name,
        display_name_ar: req.body.display_name_ar,
        role_id: roleId,
        section_id: sectionId,
        status: req.body.status || "active",
      };

      const user = await storage.createUser(processedData);
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("User creation error:", error);
      res.status(500).json({
        message: "خطأ في إنشاء المستخدم",
        error: "خطأ داخلي",
      });
    }
  });

  app.put("/api/users/:id", requireAuth, requirePermission('manage_users'), async (req, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id) {
        return res.status(400).json({ message: "معرف المستخدم مطلوب" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "معرف المستخدم غير صحيح" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "بيانات التحديث مطلوبة" });
      }


      // Process role_id and section_id to convert empty strings and "none" to null with enhanced null safety
      let roleId = null;
      if (
        req.body?.role_id &&
        req.body.role_id !== "" &&
        req.body.role_id !== "none"
      ) {
        const rid = String(req.body.role_id);
        const roleMatch = rid.match(/^ROLE(\d+)$/);
        if (roleMatch) {
          roleId = parseInt(roleMatch[1], 10);
        } else if (!isNaN(Number(rid))) {
          roleId = Number(rid);
        }
      }

      let sectionId = null;
      if (
        req.body?.section_id &&
        req.body.section_id !== "" &&
        req.body.section_id !== "none"
      ) {
        const sid = String(req.body.section_id);
        const sectionMatch = sid.match(/^SEC(\d+)$/);
        if (sectionMatch) {
          sectionId = parseInt(sectionMatch[1], 10);
        } else if (!isNaN(Number(sid))) {
          sectionId = Number(sid);
        }
      }

      const allowedFields = ['username', 'display_name', 'display_name_ar', 'full_name', 'phone', 'email', 'status', 'password'];
      const processedData: Record<string, any> = {
        role_id: roleId,
        section_id: sectionId,
      };
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          processedData[field] = req.body[field];
        }
      }

      const user = await storage.updateUser(id, processedData);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({
        message: "خطأ في تحديث المستخدم",
        error: "خطأ داخلي",
      });
    }
  });

  // Roles management routes
  app.get("/api/roles", requireAuth, requirePermission('manage_roles'), async (req: AuthRequest, res) => {
    try {
      const roles = await storage.getRoles();
      res.json(roles);
    } catch (error) {
      console.error("Roles fetch error:", error);
      res.status(500).json({ message: "خطأ في جلب الأدوار" });
    }
  });

  app.post("/api/roles", requireAuth, requirePermission('manage_roles'), async (req: AuthRequest, res) => {
    try {
      const role = await storage.createRole(req.body);
      invalidateRolesCache();
      res.json(role);
    } catch (error) {
      console.error("Role creation error:", error);
      res.status(500).json({
        message: "خطأ في إنشاء الدور",
      });
    }
  });

  app.put("/api/roles/:id", requireAuth, requirePermission('manage_roles'), async (req: AuthRequest, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id) {
        return res.status(400).json({ message: "معرف الدور مطلوب" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "معرف الدور غير صحيح" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "بيانات التحديث مطلوبة" });
      }

      const role = await storage.updateRole(id, req.body);
      if (!role) {
        return res.status(404).json({ message: "الدور غير موجود" });
      }
      invalidateRolesCache();
      res.json(role);
    } catch (error) {
      console.error("Role update error:", error);
      res.status(500).json({
        message: "خطأ في تحديث الدور",
      });
    }
  });

  app.delete("/api/roles/:id", requireAuth, requirePermission('manage_roles'), async (req: AuthRequest, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id) {
        return res.status(400).json({ message: "معرف الدور مطلوب" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "معرف الدور غير صحيح" });
      }

      await storage.deleteRole(id);
      invalidateRolesCache();
      res.json({ message: "تم حذف الدور بنجاح" });
    } catch (error) {
      console.error("Role deletion error:", error);
      res.status(500).json({
        message: "خطأ في حذف الدور",
      });
    }
  });

  // Sections routes
  app.post("/api/sections", requireAuth, requirePermission('manage_sections', 'manage_definitions'), async (req, res) => {
    try {

      // Generate sequential ID if not provided with enhanced null safety
      let sectionId = req.body?.id;
      if (!sectionId) {
        // Get the latest section to determine the next sequential number
        const existingSections = (await storage.getSections()) || [];
        const sectionNumbers = existingSections
          .map((section) => section?.id)
          .filter((id) => id && typeof id === "string" && id.startsWith("SEC"))
          .map((id) => {
            const num = id.replace("SEC", "");
            const parsed = parseInt(num);
            return isNaN(parsed) ? 0 : parsed;
          })
          .filter((num) => num > 0)
          .sort((a, b) => b - a);

        const nextNumber =
          sectionNumbers.length > 0 ? sectionNumbers[0] + 1 : 1;
        sectionId = `SEC${nextNumber.toString().padStart(2, "0")}`;
      }

      const processedData = {
        ...req.body,
        id: sectionId,
      };

      const section = await storage.createSection(processedData);
      res.json(section);
    } catch (error) {
      console.error("Section creation error:", error);
      res.status(500).json({
        message: "خطأ في إنشاء القسم",
        error: "خطأ داخلي",
      });
    }
  });

  app.put("/api/sections/:id", requireAuth, requirePermission('manage_sections', 'manage_definitions'), async (req, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id?.trim()) {
        return res.status(400).json({ message: "معرف القسم مطلوب" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "بيانات التحديث مطلوبة" });
      }

      const id = req.params.id.trim();
      const section = await storage.updateSection(id, req.body);
      if (!section) {
        return res.status(404).json({ message: "القسم غير موجود" });
      }
      res.json(section);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تحديث القسم" });
    }
  });

  // Material Groups routes

  // Items routes
  app.post("/api/items", requireAuth, requirePermission('manage_items', 'manage_definitions'), async (req, res) => {
    try {

      // Generate sequential ID if not provided with enhanced null safety
      let itemId = req.body?.id;
      if (!itemId) {
        // Get the latest item to determine the next sequential number
        const existingItems = (await storage.getItems()) || [];
        const itemNumbers = existingItems
          .map((item) => item?.id)
          .filter((id) => id && typeof id === "string" && id.startsWith("ITEM"))
          .map((id) => {
            const num = id.replace("ITEM", "");
            const parsed = parseInt(num);
            return isNaN(parsed) ? 0 : parsed;
          })
          .filter((num) => num > 0)
          .sort((a, b) => b - a);

        const nextNumber = itemNumbers.length > 0 ? itemNumbers[0] + 1 : 1;
        itemId = `ITEM${nextNumber.toString().padStart(3, "0")}`;
      }

      // Convert empty strings to null for optional fields with enhanced null safety
      const processedData = {
        ...req.body,
        id: itemId,
        category_id:
          !req.body?.category_id ||
          req.body.category_id === "" ||
          req.body.category_id === "none"
            ? null
            : req.body.category_id,
        code: !req.body?.code || req.body.code === "" ? null : req.body.code,
      };

      const item = await storage.createItem(processedData);
      res.json(item);
    } catch (error) {
      console.error("Item creation error:", error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      res.status(500).json({
        message: "خطأ في إنشاء الصنف",
        error: "خطأ داخلي",
      });
    }
  });

  app.put("/api/items/:id", requireAuth, requirePermission('manage_items', 'manage_definitions'), async (req, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id?.trim()) {
        return res.status(400).json({ message: "معرف الصنف مطلوب" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "بيانات التحديث مطلوبة" });
      }

      const id = req.params.id.trim();

      // Convert empty strings to null for optional fields with enhanced null safety
      const processedData = {
        ...req.body,
        category_id:
          !req.body?.category_id ||
          req.body.category_id === "" ||
          req.body.category_id === "none"
            ? null
            : req.body.category_id,
        code: !req.body?.code || req.body.code === "" ? null : req.body.code,
      };

      const item = await storage.updateItem(id, processedData);
      if (!item) {
        return res.status(404).json({ message: "الصنف غير موجود" });
      }
      res.json(item);
    } catch (error) {
      console.error("Item update error:", error);
      res.status(500).json({
        message: "خطأ في تحديث الصنف",
        error: "خطأ داخلي",
      });
    }
  });


  app.put("/api/customer-products/:id", requireAuth, requirePermission('manage_customers', 'manage_definitions'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Validate the ID parameter
      if (isNaN(id)) {
        return res.status(400).json({ message: "معرف المنتج غير صحيح" });
      }

      // Validate request body using Zod schema
      const validation = insertCustomerProductSchema.safeParse({
        ...req.body,
        category_id: req.body.material_group_id || req.body.category_id,
      });

      if (!validation.success) {
        console.error(
          "Customer product validation error:",
          validation.error.errors,
        );
        return res.status(400).json({
          message: "بيانات غير صحيحة",
          errors: validation.error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      // Remove material_group_id for backwards compatibility
      const processedData = { ...validation.data };
      delete (processedData as any).material_group_id;

      const customerProduct = await storage.updateCustomerProduct(
        id,
        processedData,
      );

      if (!customerProduct) {
        return res.status(404).json({ message: "منتج العميل غير موجود" });
      }

      res.json(customerProduct);
    } catch (error) {
      console.error("Customer product update error:", error);
      res.status(500).json({
        message: "خطأ في تحديث منتج العميل",
      });
    }
  });


  // ============ HR System API Routes ============

  // Training Programs
  app.get("/api/hr/training-programs", requireAuth, async (req, res) => {
    try {
      const programs = await storage.getTrainingPrograms();
      res.json(programs);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب البرامج التدريبية" });
    }
  });

  app.post("/api/hr/training-programs", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const program = await storage.createTrainingProgram(req.body);
      res.json(program);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء البرنامج التدريبي" });
    }
  });

  app.put("/api/hr/training-programs/:id", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id) {
        return res
          .status(400)
          .json({ message: "معرف البرنامج التدريبي مطلوب" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res
          .status(400)
          .json({ message: "معرف البرنامج التدريبي غير صحيح" });
      }

      if (!req.body || typeof req.body !== "object") {
        return res.status(400).json({ message: "بيانات التحديث مطلوبة" });
      }

      const program = await storage.updateTrainingProgram(id, req.body);
      if (!program) {
        return res.status(404).json({ message: "البرنامج التدريبي غير موجود" });
      }
      res.json(program);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تحديث البرنامج التدريبي" });
    }
  });

  app.get("/api/hr/training-programs/:id", requireAuth, async (req, res) => {
    try {
      // Enhanced parameter validation
      if (!req.params?.id) {
        return res
          .status(400)
          .json({ message: "معرف البرنامج التدريبي مطلوب" });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res
          .status(400)
          .json({ message: "معرف البرنامج التدريبي غير صحيح" });
      }

      const program = await storage.getTrainingProgramById(id);
      if (!program) {
        return res.status(404).json({ message: "البرنامج التدريبي غير موجود" });
      }
      res.json(program);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب البرنامج التدريبي" });
    }
  });

  // Training Materials
  app.get("/api/hr/training-materials", requireAuth, async (req, res) => {
    try {
      // Enhanced query parameter validation
      let programId: number | undefined;
      if (req.query?.program_id) {
        const programIdParam = parseInt(req.query.program_id as string);
        programId =
          !isNaN(programIdParam) && programIdParam > 0
            ? programIdParam
            : undefined;
      }

      const materials = await storage.getTrainingMaterials(programId);
      if (!materials) {
        return res.json([]); // Return empty array instead of null
      }
      res.json(materials);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب المواد التدريبية" });
    }
  });

  app.post("/api/hr/training-materials", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const material = await storage.createTrainingMaterial(req.body);
      res.json(material);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء المادة التدريبية" });
    }
  });

  // Training Enrollments
  app.get("/api/hr/training-enrollments", requireAuth, async (req, res) => {
    try {
      // Enhanced query parameter validation
      let employeeId: number | undefined;
      if (req.query?.employee_id) {
        const employeeIdParam = parseInt(req.query.employee_id as string);
        employeeId =
          !isNaN(employeeIdParam) && employeeIdParam > 0
            ? employeeIdParam
            : undefined;
      }

      const enrollments = await storage.getTrainingEnrollments(employeeId);
      if (!enrollments) {
        return res.json([]); // Return empty array instead of null
      }
      res.json(enrollments);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب التسجيلات التدريبية" });
    }
  });

  app.post("/api/hr/training-enrollments", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const enrollment = await storage.createTrainingEnrollment(req.body);
      res.json(enrollment);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تسجيل الموظف في البرنامج" });
    }
  });

  app.put("/api/hr/training-enrollments/:id", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const enrollment = await storage.updateTrainingEnrollment(id, req.body);
      res.json(enrollment);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تحديث التسجيل التدريبي" });
    }
  });

  // Training Evaluations
  app.get("/api/hr/training-evaluations", requireAuth, async (req, res) => {
    try {
      let employeeId: number | undefined;
      if (req.query.employee_id) {
        const parsed = parseInt(req.query.employee_id as string);
        employeeId = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
      }
      let programId: number | undefined;
      if (req.query.program_id) {
        const parsed = parseInt(req.query.program_id as string);
        programId = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
      }
      const evaluations = await storage.getTrainingEvaluations(
        employeeId,
        programId,
      );
      res.json(evaluations);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب التقييمات التدريبية" });
    }
  });

  app.post("/api/hr/training-evaluations", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const evaluation = await storage.createTrainingEvaluation(req.body);
      res.json(evaluation);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء التقييم التدريبي" });
    }
  });

  app.put("/api/hr/training-evaluations/:id", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const evaluation = await storage.updateTrainingEvaluation(id, req.body);
      res.json(evaluation);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تحديث التقييم التدريبي" });
    }
  });

  app.get("/api/hr/training-evaluations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "ID");
      const evaluation = await storage.getTrainingEvaluationById(id);
      if (evaluation) {
        res.json(evaluation);
      } else {
        res.status(404).json({ message: "التقييم التدريبي غير موجود" });
      }
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب التقييم التدريبي" });
    }
  });

  // Training Certificates
  app.get("/api/hr/training-certificates", requireAuth, async (req, res) => {
    try {
      let employeeId: number | undefined;
      if (req.query.employee_id) {
        const parsed = parseInt(req.query.employee_id as string);
        employeeId = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
      }
      const certificates = await storage.getTrainingCertificates(employeeId);
      res.json(certificates);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب الشهادات التدريبية" });
    }
  });

  app.post("/api/hr/training-certificates", requireAuth, async (req, res) => {
    try {
      const certificate = await storage.createTrainingCertificate(req.body);
      res.json(certificate);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء الشهادة التدريبية" });
    }
  });

  app.post(
    "/api/hr/training-certificates/generate/:enrollmentId",
    requireAuth,
    async (req, res) => {
      try {
        const enrollmentId = parseRouteParam(req.params.enrollmentId, "Enrollment ID");
        const certificate =
          await storage.generateTrainingCertificate(enrollmentId);
        res.json(certificate);
      } catch (error) {
        console.error("[API Error]", error);
        res.status(500).json({ message: "خطأ في إصدار الشهادة التدريبية" });
      }
    },
  );

  app.put("/api/hr/training-certificates/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const certificate = await storage.updateTrainingCertificate(id, req.body);
      res.json(certificate);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تحديث الشهادة التدريبية" });
    }
  });

  app.get("/api/hr/training-certificates/:id/generate", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const certificate = await storage.generateTrainingCertificate(id);
      res.json(certificate);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في توليد شهادة التدريب" });
    }
  });

  // Performance Reviews
  app.get("/api/hr/performance-reviews", requireAuth, async (req, res) => {
    try {
      const employeeId = req.query.employee_id
        ? (req.query.employee_id as string)
        : undefined;
      const reviews = await storage.getPerformanceReviews(employeeId);
      res.json(reviews);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب تقييمات الأداء" });
    }
  });

  app.post("/api/hr/performance-reviews", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const review = await storage.createPerformanceReview(req.body);
      res.json(review);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء تقييم الأداء" });
    }
  });

  app.put("/api/hr/performance-reviews/:id", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const review = await storage.updatePerformanceReview(id, req.body);
      res.json(review);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تحديث تقييم الأداء" });
    }
  });

  // Performance Criteria
  app.get("/api/hr/performance-criteria", requireAuth, async (req, res) => {
    try {
      const criteria = await storage.getPerformanceCriteria();
      res.json(criteria);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب معايير التقييم" });
    }
  });

  app.post("/api/hr/performance-criteria", requireAuth, async (req, res) => {
    try {
      const criteria = await storage.createPerformanceCriteria(req.body);
      res.json(criteria);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء معيار التقييم" });
    }
  });

  // Leave Types
  app.get("/api/hr/leave-types", requireAuth, async (req, res) => {
    try {
      const leaveTypes = await storage.getLeaveTypes();
      res.json(leaveTypes);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب أنواع الإجازات" });
    }
  });

  app.post("/api/hr/leave-types", requireAuth, async (req, res) => {
    try {
      const leaveType = await storage.createLeaveType(req.body);
      res.json(leaveType);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء نوع الإجازة" });
    }
  });

  // Leave Requests
  app.get("/api/hr/leave-requests", requireAuth, async (req, res) => {
    try {
      const employeeId = req.query.employee_id
        ? (req.query.employee_id as string)
        : undefined;
      const requests = await storage.getLeaveRequests(employeeId);
      res.json(requests);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب طلبات الإجازات" });
    }
  });

  app.post("/api/hr/leave-requests", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const request = await storage.createLeaveRequest(req.body);
      res.json(request);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء طلب الإجازة" });
    }
  });

  app.put("/api/hr/leave-requests/:id", requireAuth, requirePermission('manage_hr'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const request = await storage.updateLeaveRequest(id, req.body);
      res.json(request);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في تحديث طلب الإجازة" });
    }
  });

  app.get("/api/hr/leave-requests/pending", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getPendingLeaveRequests();
      res.json(requests);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب الطلبات المعلقة" });
    }
  });

  // Leave Balances
  app.get("/api/hr/leave-balances/:employeeId", requireAuth, async (req, res) => {
    try {
      const employeeId = req.params.employeeId;
      let year: number | undefined;
      if (req.query.year) {
        const parsed = parseInt(req.query.year as string);
        year = !isNaN(parsed) && parsed > 0 ? parsed : undefined;
      }
      const balances = await storage.getLeaveBalances(employeeId, year);
      res.json(balances);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب أرصدة الإجازات" });
    }
  });

  app.post("/api/hr/leave-balances", requireAuth, async (req, res) => {
    try {
      const balance = await storage.createLeaveBalance(req.body);
      res.json(balance);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في إنشاء رصيد الإجازة" });
    }
  });

  // DELETE routes for definitions
  app.delete("/api/customers/:id", requireAuth, requirePermission('manage_customers', 'manage_definitions'), async (req, res) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ message: "تم حذف العميل بنجاح" });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حذف العميل" });
    }
  });

  app.delete("/api/sections/:id", requireAuth, requirePermission('manage_sections', 'manage_definitions'), async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteSection(id);
      res.json({ message: "تم حذف القسم بنجاح" });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حذف القسم" });
    }
  });

  app.delete("/api/items/:id", requireAuth, requirePermission('manage_items', 'manage_definitions'), async (req, res) => {
    try {
      await storage.deleteItem(req.params.id);
      res.json({ message: "تم حذف الصنف بنجاح" });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حذف الصنف" });
    }
  });

  app.delete("/api/customer-products/:id", requireAuth, requirePermission('manage_customers', 'manage_definitions'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await storage.deleteCustomerProduct(id);
      res.json({ message: "تم حذف منتج العميل بنجاح" });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حذف منتج العميل" });
    }
  });

  app.delete("/api/locations/:id", requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteLocation(id);
      res.json({ message: "تم حذف الموقع بنجاح" });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حذف الموقع" });
    }
  });

  app.delete("/api/machines/:id", requireAuth, requirePermission('manage_machines', 'manage_definitions'), async (req, res) => {
    try {
      const id = req.params.id;
      await storage.deleteMachine(id);
      res.json({ message: "تم حذف الماكينة بنجاح" });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حذف الماكينة" });
    }
  });

  app.delete("/api/users/:id", requireAuth, requirePermission('manage_users'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await storage.deleteUser(id);
      res.json({ message: "تم حذف المستخدم بنجاح" });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حذف المستخدم" });
    }
  });

  // Inventory Management routes
  app.get("/api/inventory", requireAuth, async (req, res) => {
    try {
      const inventory = await storage.getInventoryItems();
      res.json(inventory);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب بيانات المخزون" });
    }
  });

  app.get("/api/inventory/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getInventoryStats();
      res.json(stats);
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات المخزون" });
    }
  });

  app.post("/api/inventory", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      // STEP 1: Zod schema validation
      const validatedData = insertInventorySchema.parse(req.body);

      // STEP 2: DataValidator integration for business rules
      const validationResult = await getDataValidator(storage).validateData(
        "inventory",
        validatedData,
      );
      if (!validationResult.isValid) {
        const criticalErrors = validationResult.errors.filter(
          (e) => e.severity === "critical" || e.severity === "high",
        );
        if (criticalErrors.length > 0) {
          return res.status(400).json({
            message: criticalErrors[0].message_ar || criticalErrors[0].message,
            errors: validationResult.errors,
            success: false,
          });
        }
      }

      // STEP 3: Create inventory item with validated data
      const item = await storage.createInventoryItem(validatedData);

      res.status(201).json({
        data: item,
        message: "تم إضافة صنف المخزون بنجاح",
        success: true,
      });
    } catch (error: any) {
      console.error("Inventory creation error:", error);

      res.status(500).json({
        message: "خطأ في إضافة صنف للمخزون",
        success: false,
      });
    }
  });

  app.put("/api/inventory/:id", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      // STEP 1: Parameter validation
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          message: "معرف المخزون غير صحيح",
          success: false,
        });
      }

      // STEP 2: Zod schema validation (partial for updates)
      const validatedData = insertInventorySchema.partial().parse(req.body);

      // STEP 3: DataValidator integration for business rules
      const validationResult = await getDataValidator(storage).validateData(
        "inventory",
        validatedData,
        true,
      );
      if (!validationResult.isValid) {
        const criticalErrors = validationResult.errors.filter(
          (e) => e.severity === "critical" || e.severity === "high",
        );
        if (criticalErrors.length > 0) {
          return res.status(400).json({
            message: criticalErrors[0].message_ar || criticalErrors[0].message,
            errors: validationResult.errors,
            success: false,
          });
        }
      }

      // STEP 4: Update inventory item with validated data
      const item = await storage.updateInventoryItem(id, validatedData);

      res.json({
        data: item,
        message: "تم تحديث صنف المخزون بنجاح",
        success: true,
      });
    } catch (error: any) {
      console.error("Inventory update error:", error);

      res.status(500).json({
        message: "خطأ في تحديث صنف المخزون",
        success: false,
      });
    }
  });

  app.delete("/api/inventory/:id", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await storage.deleteInventoryItem(id);
      res.json({ message: "تم حذف صنف المخزون بنجاح" });
    } catch (error) {
      console.error("[API Error]", error);
      res.status(500).json({ message: "خطأ في حذف صنف المخزون" });
    }
  });


  // ============ Machine Queues Management API ============
  
  app.get("/api/machine-queues", requireAuth, async (req, res) => {
    try {
      const queues = await storage.getMachineQueues();
      res.json({ data: queues });
    } catch (error) {
      console.error("Error fetching machine queues:", error);
      res.status(500).json({ message: "خطأ في جلب طوابير الماكينات" });
    }
  });

  app.post("/api/machine-queues/assign", requireAuth, async (req, res) => {
    try {
      const { productionOrderId, machineId, position } = req.body;
      
      if (!productionOrderId || !machineId || position === undefined) {
        return res.status(400).json({ 
          message: "بيانات غير كاملة - مطلوب معرف أمر الإنتاج والماكينة والموضع" 
        });
      }

      if (!req.session?.userId) {
        return res.status(401).json({ message: "يجب تسجيل الدخول" });
      }
      const queueEntry = await storage.assignToMachineQueue(
        productionOrderId, 
        machineId, 
        position,
        getAuthUserId(req)
      );
      
      res.json({ 
        data: queueEntry,
        message: "تم تخصيص أمر الإنتاج للماكينة بنجاح" 
      });
    } catch (error: any) {
      console.error("Error assigning to machine queue:", error);
      res.status(400).json({ 
        message: "خطأ في تخصيص أمر الإنتاج للماكينة" 
      });
    }
  });

  app.put("/api/machine-queues/reorder", requireAuth, async (req, res) => {
    try {
      const { queueId, newPosition } = req.body;
      
      if (!queueId || newPosition === undefined) {
        return res.status(400).json({ 
          message: "بيانات غير كاملة - مطلوب معرف الطابور والموضع الجديد" 
        });
      }

      const updated = await storage.updateQueuePosition(queueId, newPosition);
      
      res.json({ 
        data: updated,
        message: "تم تحديث ترتيب الطابور بنجاح" 
      });
    } catch (error: any) {
      console.error("Error reordering queue:", error);
      res.status(400).json({ 
        message: "خطأ في تحديث ترتيب الطابور" 
      });
    }
  });

  app.delete("/api/machine-queues/:id", requireAuth, async (req, res) => {
    try {
      const queueId = parseInt(req.params.id);
      
      if (isNaN(queueId)) {
        return res.status(400).json({ 
          message: "معرف طابور غير صحيح" 
        });
      }

      await storage.removeFromQueue(queueId);
      
      res.json({ 
        message: "تم إزالة أمر الإنتاج من الطابور بنجاح",
        success: true
      });
    } catch (error: any) {
      console.error("Error removing from queue:", error);
      res.status(400).json({ 
        message: "خطأ في إزالة أمر الإنتاج من الطابور" 
      });
    }
  });

  app.get("/api/machine-queues/suggest", requireAuth, async (req, res) => {
    try {
      const suggestions = await storage.suggestOptimalDistribution();
      res.json({ data: suggestions });
    } catch (error) {
      console.error("Error getting distribution suggestions:", error);
      res.status(500).json({ message: "خطأ في الحصول على اقتراحات التوزيع" });
    }
  });

  // ============ Smart Distribution API ============
  
  // Apply smart distribution
  app.post("/api/machine-queues/smart-distribute", requireAuth, async (req, res) => {
    try {
      const { algorithm, params } = req.body;
      
      if (!algorithm) {
        return res.status(400).json({
          message: "خوارزمية التوزيع مطلوبة"
        });
      }
      
      const validAlgorithms = ["balanced", "load-based", "priority", "product-type", "hybrid"];
      if (!validAlgorithms.includes(algorithm)) {
        return res.status(400).json({
          message: `خوارزمية غير صحيحة. الخيارات المتاحة: ${validAlgorithms.join(", ")}`
        });
      }
      
      if (!req.session?.userId) {
        return res.status(401).json({ message: "يجب تسجيل الدخول" });
      }
      const result = await storage.smartDistributeOrders(algorithm, {
        ...params,
        userId: getAuthUserId(req)
      });
      
      res.json({
        success: result.success,
        message: result.message,
        data: result
      });
    } catch (error: any) {
      console.error("Error applying smart distribution:", error);
      res.status(400).json({
        message: "خطأ في تطبيق التوزيع الذكي"
      });
    }
  });
  
  // Get distribution preview
  app.get("/api/machine-queues/distribution-preview", requireAuth, async (req, res) => {
    try {
      const { algorithm, ...params } = req.query;
      
      if (!algorithm) {
        return res.status(400).json({
          message: "خوارزمية التوزيع مطلوبة"
        });
      }
      
      const preview = await storage.getDistributionPreview(algorithm as string, params);
      
      res.json({
        success: true,
        data: preview
      });
    } catch (error: any) {
      console.error("Error getting distribution preview:", error);
      res.status(400).json({
        message: "خطأ في معاينة التوزيع"
      });
    }
  });
  
  // Get machine capacity statistics
  app.get("/api/machines/capacity-stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getMachineCapacityStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      console.error("Error getting machine capacity stats:", error);
      res.status(500).json({
        message: "خطأ في جلب إحصائيات السعة"
      });
    }
  });
  
  // Optimize machine queue order
  app.post("/api/machine-queues/optimize/:machineId", requireAuth, async (req, res) => {
    try {
      const { machineId } = req.params;
      
      if (!machineId) {
        return res.status(400).json({
          message: "معرف الماكينة مطلوب"
        });
      }
      
      await storage.optimizeQueueOrder(machineId);
      
      res.json({
        success: true,
        message: "تم تحسين ترتيب طابور الماكينة بنجاح"
      });
    } catch (error: any) {
      console.error("Error optimizing queue order:", error);
      res.status(400).json({
        message: "خطأ في تحسين ترتيب الطابور"
      });
    }
  });


  // ============ Orders Management API ============


  app.post("/api/orders", requireAuth, requirePermission('manage_orders'), async (req, res) => {
    try {
      const order = await storage.createOrder(req.body);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "خطأ في إنشاء الطلب" });
    }
  });

  app.put("/api/orders/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const orderId = parseRouteParam(req.params.id, "id");
      const result = insertNewOrderSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "بيانات غير صحيحة", errors: result.error.errors });
      }

      // Convert Date objects to strings for database compatibility
      const updateData = {
        ...result.data,
        delivery_date: result.data.delivery_date
          ? result.data.delivery_date.toISOString().split("T")[0]
          : result.data.delivery_date,
      };
      const order = await storage.updateOrder(orderId, updateData);
      res.json(order);
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "خطأ في تحديث الطلب" });
    }
  });

  app.patch(
    "/api/orders/:id/status",
    requireAuth,
    requireAdmin,
    async (req, res) => {
      try {
        const orderId = parseRouteParam(req.params.id, "id");
        const { status } = req.body;

        if (!status) {
          return res
            .status(400)
            .json({ message: "الحالة مطلوبة", success: false });
        }

        // Status validation - only the 5 valid DB statuses allowed
        const validStatuses = [
          "waiting",
          "in_production",
          "paused",
          "completed",
          "cancelled",
        ];
        if (!validStatuses.includes(status)) {
          return res
            .status(400)
            .json({ message: "حالة غير صحيحة", success: false });
        }

        // STEP 1: Get current order status for state transition validation
        const currentOrder = await storage.getOrderById(orderId);
        if (!currentOrder) {
          return res
            .status(404)
            .json({ message: "الطلب غير موجود", success: false });
        }

        // STEP 2: State transition validation
        const currentStatus = currentOrder.status;
        const newStatus = status;

        // Define valid state transitions based on business logic
        const validTransitions: Record<string, string[]> = {
          waiting: ["in_production", "cancelled"],            // جديدة -> تحت الانتاج أو ملغية
          in_production: ["paused", "completed", "cancelled"], // تحت الانتاج -> معلقة مؤقتاً أو مكتمل أو ملغية
          paused: ["in_production", "cancelled"],              // معلقة مؤقتاً -> تحت الانتاج أو ملغية
          completed: [],                                       // مكتمل - حالة نهائية
          cancelled: [],                                       // ملغية - حالة نهائية
        };

        // Check if transition is allowed
        const allowedNextStates = validTransitions[currentStatus] || [];
        if (
          currentStatus !== newStatus &&
          !allowedNextStates.includes(newStatus)
        ) {
          return res.status(400).json({
            message: `لا يمكن تغيير حالة الطلب من "${currentStatus}" إلى "${newStatus}". التحولات المسموحة: ${allowedNextStates.join(", ")}`,
            success: false,
            currentStatus,
            requestedStatus: newStatus,
            allowedTransitions: allowedNextStates,
          });
        }

        // STEP 3: Additional business rule validations
        if (newStatus === "completed") {
          // Check if all production orders are completed before marking order as completed
          const allProductionOrders = await storage.getAllProductionOrders();
          const productionOrders = allProductionOrders.filter(
            (po: any) => po.order_id === orderId,
          );
          const incompleteProdOrders = productionOrders.filter(
            (po: any) => po.status !== "completed",
          );

          if (incompleteProdOrders.length > 0) {
            return res.status(400).json({
              message: `لا يمكن إتمام الطلب - يوجد ${incompleteProdOrders.length} أوامر إنتاج غير مكتملة`,
              success: false,
              incompleteProdOrders: incompleteProdOrders.length,
            });
          }
        }

        if (newStatus === "cancelled") {
          // Check if there are production orders in progress
          const allProductionOrders = await storage.getAllProductionOrders();
          const productionOrders = allProductionOrders.filter(
            (po: any) => po.order_id === orderId,
          );
          const activeProdOrders = productionOrders.filter((po: any) =>
            ["in_progress", "in_production"].includes(po.status),
          );

          if (activeProdOrders.length > 0) {
            return res.status(400).json({
              message: `لا يمكن إلغاء الطلب - يوجد ${activeProdOrders.length} أوامر إنتاج نشطة`,
              success: false,
              activeProdOrders: activeProdOrders.length,
            });
          }
        }

        // STEP 4: Perform atomic status update with validation
        const order = await storage.updateOrderStatus(orderId, newStatus);

        // STEP 5: Sync production orders status based on the new order status
        if (newStatus === "in_production") {
          // Activate all pending production orders when order moves to production
          await storage.updateProductionOrdersStatusByOrder(orderId, ["pending"], "active");
        } else if (newStatus === "paused") {
          // Suspend active production orders when order is paused
          await storage.updateProductionOrdersStatusByOrder(orderId, ["active"], "pending");
        } else if (newStatus === "cancelled") {
          // Cancel all open production orders
          await storage.updateProductionOrdersStatusByOrder(orderId, ["pending", "active"], "cancelled");
        }

        res.json({
          data: order,
          message: `تم تغيير حالة الطلب إلى "${newStatus}" بنجاح`,
          success: true,
          previousStatus: currentStatus,
          currentStatus: newStatus,
        });
      } catch (error: any) {
        console.error("Error updating order status:", error);

        res.status(500).json({
          message: "خطأ في تحديث حالة الطلب",
          success: false,
        });
      }
    },
  );

  // ============ Settings API ============

  // System Settings
  app.get("/api/settings/system", requireAuth, requirePermission('manage_settings'), async (req: AuthRequest, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "خطأ في جلب إعدادات النظام" });
    }
  });

  app.post("/api/settings/system", requireAuth, requirePermission('manage_settings'), async (req: AuthRequest, res) => {
    try {
      const { settings } = req.body;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "المستخدم غير مصرح له" });
      }
      
      const results = [];

      for (const [key, value] of Object.entries(settings)) {
        try {
          const existingSetting = await storage.getSystemSettingByKey(key);
          if (existingSetting) {
            const updated = await storage.updateSystemSetting(
              key,
              String(value),
              userId,
            );
            results.push(updated);
          } else {
            const created = await storage.createSystemSetting({
              setting_key: key,
              setting_value: String(value),
              updated_by: String(userId),
            });
            results.push(created);
          }
        } catch (error) {
          console.error(`Error saving setting ${key}:`, error);
        }
      }

      res.json({ message: "تم حفظ إعدادات النظام بنجاح", settings: results });
    } catch (error) {
      console.error("Error saving system settings:", error);
      res.status(500).json({ message: "خطأ في حفظ إعدادات النظام" });
    }
  });

  // User Settings
  app.get("/api/settings/user/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "معرف المستخدم غير صحيح" });
      }
      const settings = await storage.getUserSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching user settings:", error);
      res.status(500).json({ message: "خطأ في جلب إعدادات المستخدم" });
    }
  });

  app.post("/api/settings/user/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "معرف المستخدم غير صحيح" });
      }
      const { settings } = req.body;
      const results = [];

      for (const [key, value] of Object.entries(settings)) {
        try {
          const updated = await storage.updateUserSetting(
            userId,
            key,
            String(value),
          );
          results.push(updated);
        } catch (error) {
          console.error(`Error saving user setting ${key}:`, error);
        }
      }

      res.json({ message: "تم حفظ إعداداتك الشخصية بنجاح", settings: results });
    } catch (error) {
      console.error("Error saving user settings:", error);
      res.status(500).json({ message: "خطأ في حفظ إعدادات المستخدم" });
    }
  });

  // Database Management routes
  app.get("/api/database/stats", requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getDatabaseStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching database stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات قاعدة البيانات" });
    }
  });

  app.post("/api/database/backup", requireAdmin, async (req, res) => {
    try {
      const backup = await storage.createDatabaseBackup();

      // Set headers for file download
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${backup.filename}"`,
      );

      // Send the backup data directly for download
      res.send(backup.data);
    } catch (error) {
      console.error("Error creating database backup:", error);
      res.status(500).json({ message: "خطأ في إنشاء النسخة الاحتياطية" });
    }
  });

  app.get(
    "/api/database/backup/download/:backupId",
    requireAdmin,
    async (req, res) => {
      try {
        const backupId = req.params.backupId;
        const backupFile = await storage.getBackupFile(backupId);

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="backup-${backupId}.sql"`,
        );
        res.send(backupFile);
      } catch (error) {
        console.error("Error downloading backup:", error);
        res.status(500).json({ message: "خطأ في تحميل النسخة الاحتياطية" });
      }
    },
  );

  app.post("/api/database/restore", requireAdmin, async (req, res) => {
    try {
      const { backupData } = req.body;
      const result = await storage.restoreDatabaseBackup(backupData);
      res.json({ message: "تم استعادة قاعدة البيانات بنجاح", result });
    } catch (error) {
      console.error("Error restoring database:", error);
      res.status(500).json({ message: "خطأ في استعادة قاعدة البيانات" });
    }
  });

  app.get("/api/database/export/:tableName", requireAdmin, async (req, res) => {
    try {
      const tableName = req.params.tableName;
      const format = (req.query.format as string) || "csv";

      const data = await storage.exportTableData(tableName, format);

      let contentType = "text/csv";
      let fileExtension = "csv";

      switch (format) {
        case "json":
          contentType = "application/json";
          fileExtension = "json";
          break;
        case "excel":
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          fileExtension = "xlsx";
          break;
      }

      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${tableName}.${fileExtension}"`,
      );

      // Set proper charset for CSV to ensure Arabic text encoding
      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
      }

      res.send(data);
    } catch (error) {
      console.error("Error exporting table data:", error);
      res.status(500).json({ message: "خطأ في تصدير بيانات الجدول" });
    }
  });

  app.post(
    "/api/database/import/:tableName",
    requireAdmin,
    async (req, res) => {
      try {
        const tableName = req.params.tableName;
        const { data, format } = req.body;

        const result = await storage.importTableData(tableName, data, format);
        res.json({
          message: "تم استيراد البيانات بنجاح",
          importedRecords: result.count,
        });
      } catch (error) {
        console.error("Error importing table data:", error);
        res.status(500).json({ message: "خطأ في استيراد البيانات" });
      }
    },
  );

  // Enhanced batch import endpoint
  app.post(
    "/api/database/import/:tableName/batch",
    requireAdmin,
    async (req, res) => {
      try {
        const tableName = req.params.tableName;
        const { data, options } = req.body;

        if (!Array.isArray(data) || data.length === 0) {
          return res
            .status(400)
            .json({ message: "البيانات المرسلة غير صالحة" });
        }

        const results = {
          successful: 0,
          failed: 0,
          errors: [] as string[],
          warnings: [] as string[],
        };

        // Process each record in the batch
        for (let i = 0; i < data.length; i++) {
          const record = data[i];

          try {
            // Validate and process the record based on table type
            let processedRecord = { ...record };

            // Table-specific processing
            if (tableName === "customers") {
              // Generate ID if not provided
              if (!processedRecord.id) {
                const existingCustomers = await storage.getAllCustomers();
                const lastId =
                  existingCustomers.length > 0
                    ? Math.max(
                        ...existingCustomers.map((c) => {
                          const idNum = parseInt(c.id.replace("CID", ""));
                          return isNaN(idNum) ? 0 : idNum;
                        }),
                      )
                    : 0;
                processedRecord.id = `CID${String(lastId + 1).padStart(4, "0")}`;
              }

              // Validate using schema
              const validatedRecord =
                insertCustomerSchema.parse(processedRecord);
              await storage.createCustomer(validatedRecord);
            } else if (tableName === "categories") {
              // Generate ID if not provided
              if (!processedRecord.id) {
                const existingCategories = await storage.getCategories();
                const lastId =
                  existingCategories.length > 0
                    ? Math.max(
                        ...existingCategories.map((c) => {
                          const idNum = parseInt(c.id.replace("CAT", ""));
                          return isNaN(idNum) ? 0 : idNum;
                        }),
                      )
                    : 0;
                processedRecord.id = `CAT${String(lastId + 1).padStart(2, "0")}`;
              }

              await storage.createCategory(processedRecord);
            } else if (tableName === "sections") {
              // Generate ID if not provided
              if (!processedRecord.id) {
                const existingSections = await storage.getSections();
                const lastId =
                  existingSections.length > 0
                    ? Math.max(
                        ...existingSections.map((s) => {
                          const idNum = parseInt(s.id.replace("SEC", ""));
                          return isNaN(idNum) ? 0 : idNum;
                        }),
                      )
                    : 0;
                processedRecord.id = `SEC${String(lastId + 1).padStart(2, "0")}`;
              }

              await storage.createSection(processedRecord);
            } else if (tableName === "items") {
              // Generate ID if not provided
              if (!processedRecord.id) {
                const existingItems = await storage.getItems();
                const lastId =
                  existingItems.length > 0
                    ? Math.max(
                        ...existingItems.map((i) => {
                          const idNum = parseInt(i.id.replace("ITM", ""));
                          return isNaN(idNum) ? 0 : idNum;
                        }),
                      )
                    : 0;
                processedRecord.id = `ITM${String(lastId + 1).padStart(3, "0")}`;
              }

              await storage.createItem(processedRecord);
            } else if (tableName === "customer_products") {
              // Auto-increment numeric ID
              if (!processedRecord.id) {
                const existingProductsResult = await storage.getCustomerProducts();
                const lastId =
                  existingProductsResult.data.length > 0
                    ? Math.max(
                        ...existingProductsResult.data
                          .map((p: any) => p.id)
                          .filter((id: any) => typeof id === "number"),
                      )
                    : 0;
                processedRecord.id = lastId + 1;
              }

              // Handle cutting_unit field specifically to ensure it's included
              if (
                processedRecord.cutting_unit !== undefined &&
                processedRecord.cutting_unit !== null
              ) {
                // Keep the cutting_unit value as is
              }

              // Convert numeric string fields to proper types
              const numericFields = [
                "width",
                "left_facing",
                "right_facing",
                "thickness",
                "unit_weight_kg",
                "package_weight_kg",
              ];
              numericFields.forEach((field) => {
                if (
                  processedRecord[field] &&
                  typeof processedRecord[field] === "string"
                ) {
                  const numValue = parseFloat(processedRecord[field]);
                  if (!isNaN(numValue)) {
                    processedRecord[field] = numValue;
                  }
                }
              });

              const integerFields = ["cutting_length_cm", "unit_quantity"];
              integerFields.forEach((field) => {
                if (
                  processedRecord[field] &&
                  typeof processedRecord[field] === "string"
                ) {
                  const intValue = parseInt(processedRecord[field]);
                  if (!isNaN(intValue)) {
                    processedRecord[field] = intValue;
                  }
                }
              });

              // Handle boolean fields
              if (processedRecord.is_printed !== undefined) {
                processedRecord.is_printed =
                  processedRecord.is_printed === "true" ||
                  processedRecord.is_printed === true;
              }

              // Validate using schema
              const validatedRecord =
                insertCustomerProductSchema.parse(processedRecord);
              await storage.createCustomerProduct(validatedRecord);
            } else if (tableName === "users") {
              // Auto-increment numeric ID
              if (!processedRecord.id) {
                const existingUsers = await storage.getSafeUsers();
                const lastId =
                  existingUsers.length > 0
                    ? Math.max(...existingUsers.map((u) => u.id))
                    : 0;
                processedRecord.id = lastId + 1;
              }

              // Set default role if not provided
              if (!processedRecord.role_id) {
                processedRecord.role_id = 2; // Default user role
              }

              // Set random temporary password if not provided (required for user creation)
              // Admin must reset password for imported users after import
              if (!processedRecord.password) {
                const tempPassword = require("crypto").randomBytes(12).toString("base64url");
                processedRecord.password = tempPassword;
                logger.warn(`Imported user "${processedRecord.username}" created with temporary random password - admin must reset`);
              }

              // Ensure username is set (use id if not provided)
              if (!processedRecord.username) {
                processedRecord.username = String(processedRecord.id);
              }

              // Validate using schema
              const validatedRecord = insertUserSchema.parse(processedRecord);
              await storage.createUser(validatedRecord);
            } else if (tableName === "machines") {
              // Generate ID if not provided
              if (!processedRecord.id) {
                const existingMachines = await storage.getMachines();
                const lastId =
                  existingMachines.length > 0
                    ? Math.max(
                        ...existingMachines.map((m) => {
                          const idNum = parseInt(m.id.replace("MAC", ""));
                          return isNaN(idNum) ? 0 : idNum;
                        }),
                      )
                    : 0;
                processedRecord.id = `MAC${String(lastId + 1).padStart(2, "0")}`;
              }

              await storage.createMachine(processedRecord);
            } else if (tableName === "locations") {
              // Auto-increment numeric ID
              if (!processedRecord.id) {
                const existingLocations = await storage.getLocations();
                const lastId =
                  existingLocations.length > 0
                    ? Math.max(
                        ...existingLocations.map((l) =>
                          typeof l.id === "number" ? l.id : parseInt(l.id),
                        ),
                      )
                    : 0;
                processedRecord.id = lastId + 1;
              }

              // Validate using schema
              const validatedRecord =
                insertLocationSchema.parse(processedRecord);
              await storage.createLocation(validatedRecord);
            } else {
              // Generic handling for other tables
              await storage.importTableData(tableName, [record], "json");
            }

            results.successful++;
          } catch (error) {
            results.failed++;
            const errorMsg = `السجل ${i + 1}: ${error instanceof Error ? error.message : "خطأ غير معروف"}`;
            results.errors.push(errorMsg);

            if (!options?.continueOnError) {
              // Stop processing if not continuing on error
              break;
            }
          }
        }

        res.json({
          successful: results.successful,
          failed: results.failed,
          errors: results.errors,
          warnings: results.warnings,
          batchNumber: options?.batchNumber || 1,
          totalBatches: options?.totalBatches || 1,
        });
      } catch (error) {
        console.error("Error in batch import:", error);
        res.status(500).json({
          message: "خطأ في معالجة الدفعة",
        });
      }
    },
  );

  app.post("/api/database/optimize", requireAdmin, async (req, res) => {
    try {
      const result = await storage.optimizeTables();
      res.json({ message: "تم تحسين الجداول بنجاح", result });
    } catch (error) {
      console.error("Error optimizing tables:", error);
      res.status(500).json({ message: "خطأ في تحسين الجداول" });
    }
  });

  app.post("/api/database/integrity-check", requireAdmin, async (req, res) => {
    try {
      const result = await storage.checkDatabaseIntegrity();
      res.json({ message: "تم فحص تكامل قاعدة البيانات", result });
    } catch (error) {
      console.error("Error checking database integrity:", error);
      res.status(500).json({ message: "خطأ في فحص تكامل قاعدة البيانات" });
    }
  });

  app.post("/api/database/cleanup", requireAdmin, async (req, res) => {
    try {
      const { daysOld } = req.body;
      const result = await storage.cleanupOldData(daysOld || 90);
      res.json({
        message: "تم تنظيف البيانات القديمة بنجاح",
        deletedRecords: result.count,
      });
    } catch (error) {
      console.error("Error cleaning up old data:", error);
      res.status(500).json({ message: "خطأ في تنظيف البيانات القديمة" });
    }
  });

  // ============ HR Attendance Management API ============

  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const attendance = await storage.getAttendance();
      res.json(attendance);
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الحضور" });
    }
  });

  // Get daily attendance status for a user
  app.get("/api/attendance/daily-status/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "معرف المستخدم غير صحيح" });
      }
      const date =
        (req.query.date as string) || new Date().toISOString().split("T")[0];

      const status = await storage.getDailyAttendanceStatus(userId, date);
      res.json(status);
    } catch (error) {
      console.error("Error fetching daily attendance status:", error);
      res.status(500).json({ message: "خطأ في جلب حالة الحضور اليومية" });
    }
  });

  // Get attendance by date for manual entry (all users)
  app.get("/api/attendance/manual", requireAuth, async (req, res) => {
    try {
      const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
      const attendanceData = await storage.getAttendanceByDate(date);
      res.json({ data: attendanceData, date });
    } catch (error) {
      console.error("Error fetching attendance by date:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الحضور للتاريخ المحدد" });
    }
  });

  // Bulk upsert manual attendance
  app.post("/api/attendance/manual", requireAuth, async (req, res) => {
    try {
      const { entries } = req.body;
      
      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ message: "يجب توفير بيانات الحضور" });
      }
      
      const results = await storage.upsertManualAttendance(entries);
      res.json({ 
        success: true, 
        message: `تم حفظ حضور ${results.length} موظف بنجاح`,
        data: results 
      });
    } catch (error) {
      console.error("Error saving manual attendance:", error);
      res.status(500).json({ message: "خطأ في حفظ بيانات الحضور اليدوي" });
    }
  });

  // تصدير قالب حضور الموظف للشهر كامل
  app.get("/api/attendance/template/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Validate userId parameter
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "رقم الموظف غير صحيح" });
      }
      
      const month = (req.query.month as string) || new Date().toISOString().slice(0, 7);
      
      // Get user info
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "الموظف غير موجود" });
      }
      
      // Generate days of the month
      const [year, monthNum] = month.split("-").map(Number);
      const daysInMonth = new Date(year, monthNum, 0).getDate();
      
      // Create template data with all days of the month
      const templateData = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayDate = new Date(year, monthNum - 1, day);
        const dayName = dayDate.toLocaleDateString("en-US", { weekday: "long" });
        
        templateData.push({
          "التاريخ": dateStr,
          "اليوم": dayName,
          "رقم الموظف": userId,
          "اسم الموظف": user.display_name_ar || user.display_name || user.username,
          "الحالة": "حاضر",
          "وقت الحضور": "09:00",
          "وقت الانصراف": "16:00",
          "ساعات العمل": 7,
          "ساعات إضافية": 0,
          "ملاحظات": ""
        });
      }
      
      // Create Excel workbook
      const wb = new ExcelJS.Workbook();
      addJsonSheet(wb, templateData, "حضور الموظف", [12, 10, 10, 25, 10, 12, 12, 12, 12, 25]);
      
      // Add instructions sheet
      const instructionsData = [
        { "التعليمات": "تعليمات ملء قالب الحضور" },
        { "التعليمات": "-----------------------------" },
        { "التعليمات": "القالب يحتوي افتراضياً على: حاضر، 09:00 حضور، 16:00 انصراف، 7 ساعات عمل" },
        { "التعليمات": "عدّل فقط الأيام التي تختلف عن الحالة الافتراضية" },
        { "التعليمات": "-----------------------------" },
        { "التعليمات": "1. الحالة: أدخل أحد القيم التالية: حاضر، غائب، مغادر، إجازة" },
        { "التعليمات": "2. وقت الحضور: أدخل الوقت بصيغة HH:MM (مثال: 08:00)" },
        { "التعليمات": "3. وقت الانصراف: أدخل الوقت بصيغة HH:MM (مثال: 17:00)" },
        { "التعليمات": "4. ساعات العمل: عدد ساعات العمل الفعلية (رقم)" },
        { "التعليمات": "5. ساعات إضافية: عدد ساعات العمل الإضافي (رقم)" },
        { "التعليمات": "6. لا تغير رقم الموظف أو التاريخ" },
        { "التعليمات": "7. بعد الانتهاء، ارفع الملف من زر الاستيراد" },
      ];
      addJsonSheet(wb, instructionsData, "تعليمات", [60]);
      
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      
      res.setHeader("Content-Disposition", `attachment; filename=attendance_template_${userId}_${month}.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Error generating attendance template:", error);
      res.status(500).json({ message: "خطأ في إنشاء قالب الحضور" });
    }
  });

  // استيراد بيانات الحضور من ملف Excel
  app.post("/api/attendance/import", requireAuth, upload.single("file"), async (req, res) => {
    try {
      const userId = parseInt(req.body.userId);
      
      if (!req.file) {
        return res.status(400).json({ message: "يجب رفع ملف" });
      }
      
      if (!userId || isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "رقم الموظف غير صحيح" });
      }
      
      // Verify user exists
      const targetUser = await storage.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "الموظف غير موجود" });
      }
      
      // Parse Excel file
      const data = await parseExcelBuffer(req.file.buffer);
      
      if (!data || data.length === 0) {
        return res.status(400).json({ message: "الملف فارغ أو غير صحيح" });
      }
      
      // Process and validate each row
      const entries = [];
      const errors: string[] = [];
      let rowNum = 1;
      
      for (const row of data) {
        rowNum++;
        const dateStr = row["التاريخ"];
        const status = row["الحالة"];
        const checkIn = row["وقت الحضور"];
        const checkOut = row["وقت الانصراف"];
        const notes = row["ملاحظات"];
        const fileUserId = row["رقم الموظف"];
        
        // Skip rows without status
        if (!status || String(status).trim() === "") {
          continue;
        }
        
        // Validate that the user ID in the file matches the target user
        if (fileUserId && parseInt(fileUserId) !== userId) {
          errors.push(`سطر ${rowNum}: رقم الموظف في الملف (${fileUserId}) لا يطابق الموظف المحدد (${userId})`);
          continue;
        }
        
        // Validate date format
        if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
          errors.push(`سطر ${rowNum}: تاريخ غير صحيح: ${dateStr}`);
          continue;
        }
        
        // Map status to valid values
        const statusMap: { [key: string]: string } = {
          "حاضر": "حاضر",
          "غائب": "غائب",
          "مغادر": "مغادر",
          "إجازة": "إجازة",
          "اجازة": "إجازة",
        };
        
        const mappedStatus = statusMap[String(status).trim()];
        if (!mappedStatus) {
          errors.push(`سطر ${rowNum}: حالة غير صحيحة: ${status} (المسموح: حاضر، غائب، مغادر، إجازة)`);
          continue;
        }
        
        // Format and validate times
        let formattedCheckIn = null;
        let formattedCheckOut = null;
        let hasTimeError = false;
        
        if (checkIn && String(checkIn).trim() !== "") {
          const timeMatch = String(checkIn).match(/^(\d{1,2}):(\d{2})$/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
              formattedCheckIn = `${dateStr}T${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}:00`;
            } else {
              errors.push(`سطر ${rowNum}: وقت حضور غير صالح: ${checkIn} (الساعة 0-23، الدقائق 0-59)`);
              hasTimeError = true;
            }
          } else {
            errors.push(`سطر ${rowNum}: صيغة وقت الحضور غير صحيحة: ${checkIn} (المتوقع: HH:MM مثال 08:00)`);
            hasTimeError = true;
          }
        }
        
        if (checkOut && String(checkOut).trim() !== "") {
          const timeMatch = String(checkOut).match(/^(\d{1,2}):(\d{2})$/);
          if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            const minutes = parseInt(timeMatch[2]);
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
              formattedCheckOut = `${dateStr}T${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}:00`;
            } else {
              errors.push(`سطر ${rowNum}: وقت انصراف غير صالح: ${checkOut} (الساعة 0-23، الدقائق 0-59)`);
              hasTimeError = true;
            }
          } else {
            errors.push(`سطر ${rowNum}: صيغة وقت الانصراف غير صحيحة: ${checkOut} (المتوقع: HH:MM مثال 17:00)`);
            hasTimeError = true;
          }
        }
        
        // Skip rows with time validation errors
        if (hasTimeError) {
          continue;
        }
        
        // Parse work hours and overtime
        const workHours = row["ساعات العمل"];
        const overtimeHours = row["ساعات إضافية"];
        
        let parsedWorkHours = null;
        let parsedOvertimeHours = null;
        
        if (workHours !== undefined && workHours !== "" && workHours !== null) {
          const num = parseFloat(String(workHours));
          if (!isNaN(num) && num >= 0) {
            parsedWorkHours = num;
          }
        }
        
        if (overtimeHours !== undefined && overtimeHours !== "" && overtimeHours !== null) {
          const num = parseFloat(String(overtimeHours));
          if (!isNaN(num) && num >= 0) {
            parsedOvertimeHours = num;
          }
        }
        
        entries.push({
          user_id: userId,
          date: dateStr,
          status: mappedStatus,
          check_in_time: formattedCheckIn,
          check_out_time: formattedCheckOut,
          work_hours: parsedWorkHours,
          overtime_hours: parsedOvertimeHours,
          notes: notes || "",
        });
      }
      
      if (entries.length === 0) {
        return res.status(400).json({ 
          message: "لم يتم العثور على بيانات صالحة للاستيراد",
          errors 
        });
      }
      
      // Save attendance data
      const results = await storage.upsertManualAttendance(entries);
      
      res.json({ 
        success: true, 
        message: `تم استيراد ${results.length} سجل حضور بنجاح`,
        importedCount: results.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error importing attendance:", error);
      res.status(500).json({ message: "خطأ في استيراد بيانات الحضور" });
    }
  });

  // تقرير حضور موظف احترافي مع بيانات المصنع
  app.get("/api/attendance/report/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "رقم الموظف غير صحيح" });
      }
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "يجب تحديد تاريخ البداية والنهاية" });
      }
      
      // Get user info
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "الموظف غير موجود" });
      }
      
      // Get attendance records for the period
      const attendanceRecords = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.user_id, userId),
            gte(attendance.date, startDate),
            lte(attendance.date, endDate)
          )
        )
        .orderBy(attendance.date);
      
      // Calculate summary statistics
      let totalWorkHours = 0;
      let totalOvertimeHours = 0;
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      let earlyLeaveDays = 0;
      
      for (const record of attendanceRecords) {
        if (record.work_hours) totalWorkHours += Number(record.work_hours);
        if (record.overtime_hours) totalOvertimeHours += Number(record.overtime_hours);
        
        switch (record.status) {
          case "حاضر":
            presentDays++;
            break;
          case "غائب":
            absentDays++;
            break;
          case "إجازة":
            leaveDays++;
            break;
          case "مغادر":
            earlyLeaveDays++;
            break;
        }
      }
      
      // Factory info (can be customized from settings)
      const factoryInfo = {
        name: "مصنع الأكياس البلاستيكية",
        address: "المنطقة الصناعية",
        phone: "+966 XX XXX XXXX",
        email: "info@factory.com",
        logo: null
      };
      
      res.json({
        success: true,
        report: {
          factoryInfo,
          employee: {
            id: user.id,
            name: user.display_name_ar || user.display_name || user.username,
            employeeNumber: `EMP-${user.id}`,
            department: "غير محدد",
            position: "غير محدد"
          },
          period: {
            startDate,
            endDate,
            totalDays: attendanceRecords.length
          },
          summary: {
            totalWorkHours: Math.round(totalWorkHours * 10) / 10,
            totalOvertimeHours: Math.round(totalOvertimeHours * 10) / 10,
            presentDays,
            absentDays,
            leaveDays,
            earlyLeaveDays,
            attendanceRate: attendanceRecords.length > 0 
              ? Math.round((presentDays / attendanceRecords.length) * 100) 
              : 0
          },
          records: attendanceRecords.map(r => ({
            date: r.date,
            dayName: new Date(r.date).toLocaleDateString("en-US", { weekday: "long" }),
            status: r.status,
            checkIn: r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null,
            checkOut: r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null,
            workHours: r.work_hours,
            overtimeHours: r.overtime_hours,
            notes: r.notes
          })),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Error generating attendance report:", error);
      res.status(500).json({ message: "خطأ في إنشاء تقرير الحضور" });
    }
  });

  // تصدير تقرير حضور موظف كملف Excel احترافي
  app.get("/api/attendance/report/:userId/export", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;
      
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "رقم الموظف غير صحيح" });
      }
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "يجب تحديد تاريخ البداية والنهاية" });
      }
      
      // Get user info
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "الموظف غير موجود" });
      }
      
      // Get attendance records
      const attendanceRecords = await db
        .select()
        .from(attendance)
        .where(
          and(
            eq(attendance.user_id, userId),
            gte(attendance.date, startDate),
            lte(attendance.date, endDate)
          )
        )
        .orderBy(attendance.date);
      
      // Calculate summary
      let totalWorkHours = 0;
      let totalOvertimeHours = 0;
      let presentDays = 0;
      let absentDays = 0;
      let leaveDays = 0;
      
      for (const record of attendanceRecords) {
        if (record.work_hours) totalWorkHours += Number(record.work_hours);
        if (record.overtime_hours) totalOvertimeHours += Number(record.overtime_hours);
        if (record.status === "حاضر") presentDays++;
        if (record.status === "غائب") absentDays++;
        if (record.status === "إجازة") leaveDays++;
      }
      
      // Create workbook
      const wb = new ExcelJS.Workbook();
      
      // Header sheet with factory and employee info
      const headerData = [
        { "": "مصنع الأكياس البلاستيكية" },
        { "": "تقرير حضور موظف" },
        { "": "-----------------------------" },
        { "": `اسم الموظف: ${user.display_name_ar || user.display_name || user.username}` },
        { "": `رقم الموظف: EMP-${user.id}` },
        { "": `الفترة: من ${startDate} إلى ${endDate}` },
        { "": `تاريخ التقرير: ${new Date().toLocaleDateString("en-US")}` },
        { "": "-----------------------------" },
        { "": `إجمالي أيام الحضور: ${presentDays}` },
        { "": `إجمالي أيام الغياب: ${absentDays}` },
        { "": `إجمالي أيام الإجازة: ${leaveDays}` },
        { "": `إجمالي ساعات العمل: ${totalWorkHours.toFixed(1)}` },
        { "": `إجمالي الساعات الإضافية: ${totalOvertimeHours.toFixed(1)}` },
        { "": `نسبة الحضور: ${attendanceRecords.length > 0 ? Math.round((presentDays / attendanceRecords.length) * 100) : 0}%` },
      ];
      addJsonSheet(wb, headerData, "ملخص التقرير", [50]);
      
      // Attendance details sheet
      const detailsData = attendanceRecords.map(r => ({
        "التاريخ": r.date,
        "اليوم": new Date(r.date).toLocaleDateString("en-US", { weekday: "long" }),
        "الحالة": r.status,
        "وقت الحضور": r.check_in_time ? new Date(r.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-",
        "وقت الانصراف": r.check_out_time ? new Date(r.check_out_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-",
        "ساعات العمل": r.work_hours || 0,
        "ساعات إضافية": r.overtime_hours || 0,
        "ملاحظات": r.notes || ""
      }));
      addJsonSheet(wb, detailsData, "تفاصيل الحضور", [12, 10, 10, 12, 12, 12, 12, 25]);
      
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      
      const fileName = `attendance_report_${user.username}_${startDate}_${endDate}.xlsx`;
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting attendance report:", error);
      res.status(500).json({ message: "خطأ في تصدير تقرير الحضور" });
    }
  });

  // تسجيل الحضور مع تحقق الموقع الجغرافي المحسّن
  app.post(["/api/attendance", "/api/attendance/check-in"], requireAuth, async (req, res) => {
    try {
      const isDevMode = process.env.NODE_ENV === 'development';
      
      // =============== إعدادات الحماية ===============
      const MAX_ACCURACY_METERS = 500; // الحد الأقصى للدقة المسموحة بالأمتار (مرن للمباني الداخلية)
      const MIN_ACCURACY_METERS = 3;   // الحد الأدنى للدقة (أقل من ذلك يعني تزوير محتمل)
      
      // =============== جمع معلومات الجهاز للتدقيق ===============
      const deviceInfo = {
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        timestamp: new Date().toISOString(),
        timezone: req.headers['timezone'] || Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      
      // =============== التحقق من وجود بيانات الموقع ===============
      if (!req.body.location || !req.body.location.lat || !req.body.location.lng) {
        return res.status(400).json({
          message: "يجب توفير الموقع الجغرافي لتسجيل الحضور",
          code: "LOCATION_REQUIRED"
        });
      }

      const { lat, lng, accuracy, isMocked, altitudeAccuracy } = req.body.location;
      
      // =============== التحقق من دقة الموقع ===============
      // نتعامل مع accuracy كرقم صالح أو نتجاهل التحقق إذا لم تتوفر
      const hasValidAccuracy = accuracy !== undefined && accuracy !== null && !isNaN(accuracy);
      
      if (hasValidAccuracy) {
        // دقة عالية جداً (أقل من 5 متر) قد تشير لتزوير
        if (accuracy < MIN_ACCURACY_METERS) {
          // نسجل التحذير لكن لا نرفض (قد يكون GPS حقيقي ممتاز)
        }
        
        // دقة منخفضة جداً
        if (accuracy > MAX_ACCURACY_METERS) {
          return res.status(400).json({
            message: `دقة الموقع منخفضة جداً (${Math.round(accuracy)} متر). يرجى الانتظار حتى تتحسن دقة GPS أو الخروج لمكان مفتوح.`,
            code: "LOW_ACCURACY",
            accuracy: Math.round(accuracy),
            maxAllowed: MAX_ACCURACY_METERS
          });
        }
      } else {
        // تحذير في السجل إذا لم تتوفر معلومات الدقة
      }

      // =============== كشف تزوير الموقع (Mock Location) ===============
      if (isMocked === true) {
        
        // تسجيل محاولة التلاعب
        try {
          await storage.createViolation({
            user_id: req.body.user_id,
            type: 'location_spoofing',
            description: `محاولة تسجيل حضور بموقع مزور`,
            details: JSON.stringify({
              location: { lat, lng },
              accuracy,
              deviceInfo,
              timestamp: new Date().toISOString()
            }),
            severity: 'high'
          });
        } catch (violationError) {
          console.error('خطأ في تسجيل المخالفة:', violationError);
        }
        
        return res.status(403).json({
          message: "تم اكتشاف محاولة تزوير الموقع! هذه المحاولة تم تسجيلها وسيتم إبلاغ الإدارة.",
          code: "MOCK_LOCATION_DETECTED"
        });
      }

      // =============== التحقق من صحة إحداثيات الموقع ===============
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return res.status(400).json({
          message: "إحداثيات الموقع غير صالحة",
          code: "INVALID_COORDINATES"
        });
      }

      // =============== التحقق من دور المستخدم (مندوب مبيعات) ===============
      const SALES_REP_ROLE_ID = 7; // دور مندوب المبيعات
      const user = await storage.getUserById(req.body.user_id);
      const isSalesRep = user?.role_id === SALES_REP_ROLE_ID;
      
      if (isSalesRep) {
      }

      // =============== جلب مواقع المصانع النشطة ===============
      const activeLocations = await storage.getActiveFactoryLocations();

      // مندوب المبيعات لا يحتاج لمواقع مصانع نشطة
      if (activeLocations.length === 0 && !isSalesRep) {
        return res.status(400).json({
          message: "لا توجد مواقع مصانع نشطة. يرجى التواصل مع الإدارة.",
          code: "NO_ACTIVE_LOCATIONS"
        });
      }

      // =============== دالة حساب المسافة (Haversine) ===============
      const calculateDistance = (
        lat1: number,
        lon1: number,
        lat2: number,
        lon2: number
      ): number => {
        const R = 6371e3; // نصف قطر الأرض بالأمتار
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lon2 - lon1) * Math.PI) / 180;

        const a =
          Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
          Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
      };

      // =============== التحقق من الموقع ===============
      let isWithinRange = false;
      let closestDistance = Infinity;
      let closestLocation: any = null;
      let matchedLocation: any = null;

      if (isDevMode) {
      }

      for (const factoryLocation of activeLocations) {
        const distance = calculateDistance(
          lat,
          lng,
          parseFloat(factoryLocation.latitude),
          parseFloat(factoryLocation.longitude)
        );

        // نأخذ دقة GPS بعين الاعتبار عند حساب المسافة الفعلية
        const effectiveDistance = accuracy ? Math.max(0, distance - accuracy) : distance;
        const effectiveRadius = factoryLocation.allowed_radius + (accuracy || 0);

        if (isDevMode) {
        }

        if (distance < closestDistance) {
          closestDistance = distance;
          closestLocation = factoryLocation;
        }

        if (distance <= factoryLocation.allowed_radius) {
          isWithinRange = true;
          matchedLocation = factoryLocation;
          break;
        }
      }

      if (!isWithinRange) {
        const errorMsg = `أنت خارج نطاق المصنع. المسافة: ${Math.round(closestDistance)} متر. النطاق المسموح: ${closestLocation?.allowed_radius} متر.`;
        
        return res.status(403).json({
          message: errorMsg,
          code: "OUT_OF_RANGE",
          distance: Math.round(closestDistance),
          allowedRadius: closestLocation?.allowed_radius,
          locationName: closestLocation?.name_ar,
          ...(isDevMode && {
            debug: {
              userLocation: { lat, lng, accuracy },
              closestLocation: {
                name: closestLocation?.name_ar,
                lat: closestLocation?.latitude,
                lng: closestLocation?.longitude
              }
            }
          })
        });
      }

      // =============== إعداد بيانات الحضور مع معلومات التدقيق ===============
      const attendanceData = {
        ...req.body,
        location_accuracy: accuracy,
        location_lat: lat,
        location_lng: lng,
        factory_location_id: matchedLocation?.id,
        device_info: JSON.stringify(deviceInfo),
        distance_from_factory: Math.round(closestDistance)
      };

      const attendance = await storage.createAttendance(attendanceData);
      

      // Send attendance notification
      try {
        const user = await storage.getUserById(req.body.user_id);
        if (user && user.phone) {
          let messageTemplate = "";
          let priority = "normal";

          switch (req.body.status) {
            case "حاضر":
              messageTemplate = `مرحباً ${user.display_name_ar || user.username}، تم تسجيل حضورك اليوم بنجاح في ${new Date().toLocaleTimeString("en-US")}. نتمنى لك يوم عمل مثمر!`;
              priority = "normal";
              break;
            case "في الاستراحة":
              messageTemplate = `${user.display_name_ar || user.username}، تم تسجيل بدء استراحة الغداء في ${new Date().toLocaleTimeString("en-US")}. استمتع بوقت راحتك!`;
              priority = "low";
              break;
            case "يعمل":
              messageTemplate = `${user.display_name_ar || user.username}، تم تسجيل انتهاء استراحة الغداء في ${new Date().toLocaleTimeString("en-US")}. مرحباً بعودتك للعمل!`;
              priority = "normal";
              break;
            case "مغادر":
              messageTemplate = `${user.display_name_ar || user.username}، تم تسجيل انصرافك في ${new Date().toLocaleTimeString("en-US")}. شكراً لجهودك اليوم، نراك غداً!`;
              priority = "normal";
              break;
          }

          if (messageTemplate) {
            await notificationService.sendWhatsAppMessage(
              user.phone,
              messageTemplate,
              {
                title: "تنبيه الحضور",
                priority,
                context_type: "attendance",
                context_id: attendance.id?.toString(),
              },
            );
          }
        }
      } catch (notificationError) {
        console.error(
          "Failed to send attendance notification:",
          notificationError,
        );
        // Don't fail the main request if notification fails
      }

      res.status(201).json(attendance);
    } catch (error) {
      console.error("Error creating attendance:", error);

      // Return the specific error message for validation errors
      if (error instanceof Error && error.message.includes("تم تسجيل")) {
        return res.status(400).json({ message: error.message });
      }

      if (error instanceof Error && error.message.includes("يجب")) {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "خطأ في إنشاء سجل الحضور" });
    }
  });

  app.put("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const attendance = await storage.updateAttendance(id, req.body);
      res.json(attendance);
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ message: "خطأ في تحديث سجل الحضور" });
    }
  });

  app.delete("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await storage.deleteAttendance(id);
      res.json({ message: "تم حذف سجل الحضور بنجاح" });
    } catch (error) {
      console.error("Error deleting attendance:", error);
      res.status(500).json({ message: "خطأ في حذف سجل الحضور" });
    }
  });

  // ============ Attendance Reports and Statistics API ============

  // Get attendance summary for a user (monthly/weekly)
  app.get("/api/attendance/summary/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "معرف المستخدم غير صحيح" });
      }
      const { startDate, endDate, period = 'month' } = req.query;
      
      let start: Date, end: Date;
      const now = new Date();
      
      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else if (period === 'week') {
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        end = new Date(now);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      const summary = await storage.getAttendanceSummary(userId, start, end);
      res.json({ data: summary, startDate: start, endDate: end });
    } catch (error) {
      console.error("Error fetching attendance summary:", error);
      res.status(500).json({ message: "خطأ في جلب ملخص الحضور" });
    }
  });

  // Get attendance report for all employees
  app.get("/api/attendance/report", requireAuth, requirePermission("view_attendance_reports"), async (req, res) => {
    try {
      const { startDate, endDate, sectionId, roleId } = req.query;
      
      let start: Date, end: Date;
      const now = new Date();
      
      if (startDate && endDate) {
        start = new Date(startDate as string);
        end = new Date(endDate as string);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
      
      const report = await storage.getAttendanceReport(start, end, {
        sectionId: sectionId ? parseInt(sectionId as string) : undefined,
        roleId: roleId ? parseInt(roleId as string) : undefined,
      });
      
      res.json({ data: report, startDate: start, endDate: end });
    } catch (error) {
      console.error("Error fetching attendance report:", error);
      res.status(500).json({ message: "خطأ في جلب تقرير الحضور" });
    }
  });

  // Calculate and update work hours for an attendance record
  app.put("/api/attendance/:id/calculate-hours", requireAuth, requirePermission("manage_attendance"), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const attendance = await storage.getAttendanceById(id);
      
      if (!attendance) {
        return res.status(404).json({ message: "سجل الحضور غير موجود" });
      }
      
      let workHours = 0;
      let overtimeHours = 0;
      const standardWorkHours = 8; // ساعات العمل الرسمية
      
      if (attendance.check_in_time && attendance.check_out_time) {
        const checkIn = new Date(attendance.check_in_time);
        const checkOut = new Date(attendance.check_out_time);
        let totalMinutes = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60);
        
        // Subtract lunch break if exists
        if (attendance.lunch_start_time && attendance.lunch_end_time) {
          const lunchStart = new Date(attendance.lunch_start_time);
          const lunchEnd = new Date(attendance.lunch_end_time);
          totalMinutes -= (lunchEnd.getTime() - lunchStart.getTime()) / (1000 * 60);
        }
        
        // Subtract other break if exists
        if (attendance.break_start_time && attendance.break_end_time) {
          const breakStart = new Date(attendance.break_start_time);
          const breakEnd = new Date(attendance.break_end_time);
          totalMinutes -= (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60);
        }
        
        workHours = Math.max(0, totalMinutes / 60);
        
        // Calculate overtime
        if (workHours > standardWorkHours) {
          overtimeHours = workHours - standardWorkHours;
          workHours = standardWorkHours;
        }
      }
      
      const updated = await storage.updateAttendance(id, {
        work_hours: parseFloat(workHours.toFixed(2)),
        overtime_hours: parseFloat(overtimeHours.toFixed(2)),
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error calculating work hours:", error);
      res.status(500).json({ message: "خطأ في حساب ساعات العمل" });
    }
  });

  // Get daily attendance statistics
  app.get("/api/attendance/daily-stats", requireAuth, requirePermission("view_attendance"), async (req, res) => {
    try {
      const date = req.query.date as string || new Date().toISOString().split('T')[0];
      const stats = await storage.getDailyAttendanceStats(date);
      res.json({ data: stats, date });
    } catch (error) {
      console.error("Error fetching daily attendance stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات الحضور اليومية" });
    }
  });

  // Monthly attendance editor - Get employee monthly attendance data
  app.get("/api/attendance/monthly-editor/:userId", requireAuth, requirePermission("manage_attendance"), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      if (!userId || !startDate || !endDate) {
        return res.status(400).json({ message: "معرف الموظف وتاريخ البداية والنهاية مطلوبون" });
      }

      // Get employee info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "الموظف غير موجود" });
      }

      // Get user's role and section
      const allRoles = await getCachedRoles();
      const allSections = await storage.getSections();
      const role = user.role_id ? allRoles.find(r => r.id === user.role_id) : null;
      const sectionKey = user.section_id ? `SEC${String(user.section_id).padStart(2, '0')}` : null;
      const section = sectionKey ? allSections.find(s => s.id === sectionKey) : null;

      // Generate all dates in the range
      const start = new Date(startDate);
      const end = new Date(endDate);
      const dates: string[] = [];
      const dayNames = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }

      // Get existing attendance records for this user in the date range
      const attendanceRecords = await storage.getAttendanceByUserAndDateRange(userId, startDate, endDate);
      
      // Create a map of date -> attendance record
      const recordMap = new Map<string, any>();
      for (const record of attendanceRecords) {
        const dateStr = new Date(record.date).toISOString().split('T')[0];
        recordMap.set(dateStr, record);
      }

      // Build the records array with all dates
      const records = dates.map(dateStr => {
        const record = recordMap.get(dateStr);
        const dayOfWeek = new Date(dateStr).getDay();
        
        return {
          date: dateStr,
          dayName: dayNames[dayOfWeek],
          status: record?.status || null,
          check_in_time: record?.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
          check_out_time: record?.check_out_time ? new Date(record.check_out_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : null,
          work_hours: record?.work_hours || null,
          overtime_hours: record?.overtime_hours || null,
          notes: record?.notes || null,
          attendance_id: record?.id || null,
        };
      });

      // Calculate summary
      const summary = {
        presentDays: records.filter(r => r.status === 'حاضر' || r.status === 'متأخر').length,
        absentDays: records.filter(r => r.status === 'غائب').length,
        leaveDays: records.filter(r => r.status === 'إجازة').length,
        lateDays: records.filter(r => r.status === 'متأخر').length,
        totalWorkHours: records.reduce((sum, r) => sum + (r.work_hours || 0), 0),
        totalOvertimeHours: records.reduce((sum, r) => sum + (r.overtime_hours || 0), 0),
      };

      res.json({
        success: true,
        data: {
          employee: {
            id: user.id,
            name: user.display_name_ar || user.display_name || user.username,
            employeeNumber: user.username,
            department: section?.name_ar || section?.name || "-",
            position: role?.name_ar || role?.name || "-",
          },
          records,
          summary,
        },
      });
    } catch (error) {
      console.error("Error fetching monthly attendance data:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الحضور الشهري" });
    }
  });

  // Monthly attendance editor - Save modified records
  app.post("/api/attendance/monthly-editor/save", requireAuth, requirePermission("manage_attendance"), async (req, res) => {
    try {
      const { userId, records } = req.body;

      if (!userId || !records || !Array.isArray(records)) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }

      let savedCount = 0;

      for (const record of records) {
        const { date, status, check_in_time, check_out_time, notes } = record;
        
        // Check if record exists for this user and date
        const existingRecords = await storage.getAttendanceByUserAndDateRange(userId, date, date);
        const existing = existingRecords[0];

        // Parse times
        let checkInTime = null;
        let checkOutTime = null;
        
        if (check_in_time) {
          const [hours, minutes] = check_in_time.split(':').map(Number);
          checkInTime = new Date(date);
          checkInTime.setHours(hours, minutes, 0, 0);
        }
        
        if (check_out_time) {
          const [hours, minutes] = check_out_time.split(':').map(Number);
          checkOutTime = new Date(date);
          checkOutTime.setHours(hours, minutes, 0, 0);
        }

        // Calculate work hours
        let workHours = null;
        if (checkInTime && checkOutTime) {
          workHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
          if (workHours < 0) workHours = 0;
        }

        const attendanceData = {
          user_id: userId,
          date: typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0],
          status: status || 'غائب',
          check_in_time: checkInTime,
          check_out_time: checkOutTime,
          work_hours: workHours,
          notes: notes || null,
        };

        if (existing) {
          // Update existing record
          await storage.updateAttendance(existing.id, attendanceData);
        } else {
          // Create new record
          await storage.createAttendance(attendanceData);
        }
        
        savedCount++;
      }

      res.json({ 
        success: true, 
        message: `تم حفظ ${savedCount} سجل بنجاح`,
        savedCount 
      });
    } catch (error) {
      console.error("Error saving monthly attendance data:", error);
      res.status(500).json({ message: "خطأ في حفظ بيانات الحضور" });
    }
  });

  // Record break time
  app.post("/api/attendance/:id/break", requireAuth, requirePermission("manage_attendance"), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const { action } = req.body; // 'start' or 'end'
      
      const attendance = await storage.getAttendanceById(id);
      if (!attendance) {
        return res.status(404).json({ message: "سجل الحضور غير موجود" });
      }
      
      const now = new Date();
      const updateData: any = {};
      
      if (action === 'start') {
        updateData.break_start_time = now;
        updateData.status = 'استراحة';
      } else if (action === 'end') {
        updateData.break_end_time = now;
        updateData.status = 'حاضر';
      }
      
      const updated = await storage.updateAttendance(id, updateData);
      res.json(updated);
    } catch (error) {
      console.error("Error recording break:", error);
      res.status(500).json({ message: "خطأ في تسجيل الاستراحة" });
    }
  });

  // ============ User Violations Management API ============

  app.get("/api/violations", requireAuth, async (req, res) => {
    try {
      const violations = await storage.getViolations();
      res.json(violations);
    } catch (error) {
      console.error("Error fetching violations:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات المخالفات" });
    }
  });

  app.post("/api/violations", requireAuth, async (req, res) => {
    try {
      const violation = await storage.createViolation(req.body);
      res.status(201).json(violation);
    } catch (error) {
      console.error("Error creating violation:", error);
      res.status(500).json({ message: "خطأ في إنشاء المخالفة" });
    }
  });

  app.put("/api/violations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const violation = await storage.updateViolation(id, req.body);
      res.json(violation);
    } catch (error) {
      console.error("Error updating violation:", error);
      res.status(500).json({ message: "خطأ في تحديث المخالفة" });
    }
  });

  app.delete("/api/violations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await storage.deleteViolation(id);
      res.json({ message: "تم حذف المخالفة بنجاح" });
    } catch (error) {
      console.error("Error deleting violation:", error);
      res.status(500).json({ message: "خطأ في حذف المخالفة" });
    }
  });

  // ============ User Requests Management API ============

  app.get("/api/user-requests", requireAuth, async (req, res) => {
    try {
      const requests = await storage.getUserRequests();

      res.json(requests);
    } catch (error) {
      console.error("Error fetching user requests:", error);
      res.status(500).json({ message: "خطأ في جلب طلبات المستخدمين" });
    }
  });

  app.post("/api/user-requests", requireAuth, async (req, res) => {
    try {
      const request = await storage.createUserRequest(req.body);
      res.status(201).json(request);
    } catch (error) {
      console.error("Error creating user request:", error);
      res.status(500).json({ message: "خطأ في إنشاء الطلب" });
    }
  });

  app.put("/api/user-requests/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const request = await storage.updateUserRequest(id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error updating user request:", error);
      res.status(500).json({ message: "خطأ في تحديث الطلب" });
    }
  });

  app.patch("/api/user-requests/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const request = await storage.updateUserRequest(id, req.body);
      res.json(request);
    } catch (error) {
      console.error("Error updating user request:", error);
      res.status(500).json({ message: "خطأ في تحديث الطلب" });
    }
  });

  app.delete("/api/user-requests/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await storage.deleteUserRequest(id);
      res.json({ message: "تم حذف الطلب بنجاح" });
    } catch (error) {
      console.error("Error deleting user request:", error);
      res.status(500).json({ message: "خطأ في حذف الطلب" });
    }
  });

  // ============ System Settings API ============

  // Get all system settings
  app.get("/api/system-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "خطأ في جلب إعدادات النظام" });
    }
  });

  // Get specific system setting by key
  app.get("/api/system-settings/:key", requireAuth, async (req, res) => {
    try {
      const setting = await storage.getSystemSettingByKey(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "الإعداد غير موجود" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Error fetching system setting:", error);
      res.status(500).json({ message: "خطأ في جلب الإعداد" });
    }
  });

  // Update system setting
  app.put("/api/system-settings/:key", requireAuth, async (req, res) => {
    try {
      const { setting_value } = req.body;
      if (!getAuthUserId(req)) {
        return res.status(401).json({ message: "يجب تسجيل الدخول لتحديث الإعدادات" });
      }
      const updated = await storage.updateSystemSetting(req.params.key, setting_value, getAuthUserId(req));
      res.json(updated);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ message: "خطأ في تحديث الإعداد" });
    }
  });

  // Create system setting
  app.post("/api/system-settings", requireAuth, async (req, res) => {
    try {
      const setting = await storage.createSystemSetting(req.body);
      res.status(201).json(setting);
    } catch (error) {
      console.error("Error creating system setting:", error);
      res.status(500).json({ message: "خطأ في إنشاء الإعداد" });
    }
  });

  // ============ Factory Locations API ============

  // Get all factory locations
  app.get("/api/factory-locations", requireAuth, async (req, res) => {
    try {
      const locations = await storage.getFactoryLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching factory locations:", error);
      res.status(500).json({ message: "خطأ في جلب مواقع المصانع" });
    }
  });

  // Get active factory locations only
  app.get("/api/factory-locations/active", requireAuth, async (req, res) => {
    try {
      const locations = await storage.getActiveFactoryLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching active factory locations:", error);
      res.status(500).json({ message: "خطأ في جلب المواقع النشطة" });
    }
  });

  // Get single factory location
  app.get("/api/factory-locations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const location = await storage.getFactoryLocation(id);
      if (!location) {
        return res.status(404).json({ message: "الموقع غير موجود" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching factory location:", error);
      res.status(500).json({ message: "خطأ في جلب الموقع" });
    }
  });

  // Create factory location
  app.post("/api/factory-locations", requireAuth, async (req, res) => {
    try {
      const location = await storage.createFactoryLocation({
        ...req.body,
        created_by: getAuthUserId(req),
      });
      res.status(201).json(location);
    } catch (error) {
      console.error("Error creating factory location:", error);
      res.status(500).json({ message: "خطأ في إنشاء الموقع" });
    }
  });

  // Update factory location
  app.put("/api/factory-locations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const location = await storage.updateFactoryLocation(id, req.body);
      res.json(location);
    } catch (error) {
      console.error("Error updating factory location:", error);
      res.status(500).json({ message: "خطأ في تحديث الموقع" });
    }
  });

  // Delete factory location
  app.delete("/api/factory-locations/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await storage.deleteFactoryLocation(id);
      res.json({ message: "تم حذف الموقع بنجاح" });
    } catch (error) {
      console.error("Error deleting factory location:", error);
      res.status(500).json({ message: "خطأ في حذف الموقع" });
    }
  });

  // ============ PRODUCTION FLOW API ENDPOINTS ============

  // Production Settings
  app.get("/api/production/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getProductionSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching production settings:", error);
      res.status(500).json({ message: "خطأ في جلب إعدادات الإنتاج" });
    }
  });

  app.patch("/api/production/settings", requireAuth, async (req, res) => {
    try {
      const validationSchema = insertProductionSettingsSchema
        .pick({
          overrun_tolerance_percent: true,
          allow_last_roll_overrun: true,
          qr_prefix: true,
        })
        .extend({
          overrun_tolerance_percent: z
            .number()
            .min(0)
            .max(10)
            .transform((v) => Number(v.toFixed(2))),
          qr_prefix: z.string().min(1, "بادئة الـ QR مطلوبة"),
        });

      const validated = validationSchema.parse(req.body);
      const settings = await storage.updateProductionSettings(validated);
      res.json(settings);
    } catch (error) {
      console.error("Error updating production settings:", error);
      res.status(400).json({ message: "خطأ في تحديث إعدادات الإنتاج" });
    }
  });

  // Start Production
  app.patch("/api/production-orders/:id/start-production", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const productionOrder = await storage.startProduction(id);
      res.json(productionOrder);
    } catch (error) {
      console.error("Error starting production:", error);
      res.status(400).json({ message: "خطأ في بدء الإنتاج" });
    }
  });

  // Create Roll with QR
  app.post(
    "/api/rolls",
    requireAuth,
    validateRequest({ body: insertRollSchema.omit({ created_by: true }) }),
    async (req, res) => {
      try {
        // Ensure session userId is valid
        if (!getAuthUserId(req) || typeof getAuthUserId(req) !== "number") {
          return res.status(401).json({ message: "معرف المستخدم غير صحيح" });
        }

        // Get DataValidator for business rule enforcement
        const dataValidator = getDataValidator(storage);

        // Add created_by from session and validate the complete data
        const rollData = {
          ...req.body,
          created_by: Number(getAuthUserId(req)),
        };

        // Validate with insertRollSchema AFTER adding created_by
        let validatedRollData;
        try {
          validatedRollData = insertRollSchema.parse(rollData);
        } catch (validationError) {
          console.error("Roll schema validation failed:", validationError);
          if (validationError instanceof z.ZodError) {
            return res.status(400).json({
              message: "بيانات غير صحيحة",
              errors: validationError.errors,
            });
          }
          throw validationError;
        }

        // INVARIANT B: Validate roll weight against production order limits
        const productionOrder = await storage.getProductionOrderById(
          validatedRollData.production_order_id,
        );
        if (!productionOrder) {
          return res.status(400).json({
            message: "أمر الإنتاج غير موجود",
            field: "production_order_id",
          });
        }

        // Check if order is paused - block production entry
        const pauseCheck = await checkOrderNotPaused(validatedRollData.production_order_id);
        if (pauseCheck.isPaused) {
          return res.status(403).json({ 
            success: false,
            message: pauseCheck.message,
            orderStatus: pauseCheck.orderStatus
          });
        }

        // INVARIANT E: Validate film machine is active (printing and cutting machines assigned in later stages)
        const filmMachine = await storage.getMachineById(
          validatedRollData.film_machine_id,
        );
        if (!filmMachine) {
          return res.status(400).json({
            message: "ماكينة الفيلم غير موجودة",
            field: "film_machine_id",
          });
        }
        if (filmMachine.status !== "active") {
          return res.status(400).json({
            message: "ماكينة الفيلم غير نشطة - لا يمكن إنشاء رولات عليها",
            field: "film_machine_id",
          });
        }

        // Run synchronous business rule validation
        const validationResult =
          await dataValidator.validateRollCreation(validatedRollData);
        if (!validationResult.isValid) {
          return res.status(400).json({
            message: "فشل في التحقق من قواعد العمل",
            errors: validationResult.errors,
            warnings: validationResult.warnings,
          });
        }

        // Generate QR code and roll number with validation passed
        const roll = await storage.createRoll(validatedRollData);
        res.status(201).json(roll);
      } catch (error) {
        console.error("Error creating roll:", error);
        if (error instanceof z.ZodError) {
          console.error("Validation errors:", error.errors);
          res.status(400).json({
            message: "بيانات غير صحيحة",
            errors: error.errors,
          });
        } else if (
          error instanceof Error &&
          error.message.includes("تجاوزت الحد المسموح")
        ) {
          res.status(400).json({ message: error.message });
        } else {
          res.status(500).json({ message: "خطأ في إنشاء الرول" });
        }
      }
    },
  );

  // Printing Operations
  app.patch("/api/rolls/:id/print", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      if (!getAuthUserId(req)) {
        return res.status(401).json({ message: "غير مسجل الدخول" });
      }
      
      // Get roll to check its production order
      const existingRoll = await storage.getRollFullDetails(id);
      if (!existingRoll) {
        return res.status(404).json({ message: "الرول غير موجود" });
      }
      
      // Check if order is paused - block production entry
      const pauseCheck = await checkOrderNotPaused(existingRoll.production_order_id);
      if (pauseCheck.isPaused) {
        return res.status(403).json({ 
          success: false,
          message: pauseCheck.message,
          orderStatus: pauseCheck.orderStatus
        });
      }
      
      const { printing_machine_id } = req.body;
      
      // Validate printing machine if provided
      if (printing_machine_id) {
        const machine = await storage.getMachineById(printing_machine_id);
        if (!machine) {
          return res.status(400).json({ message: "ماكينة الطباعة غير موجودة" });
        }
        if (machine.status !== "active") {
          return res.status(400).json({ message: "ماكينة الطباعة غير نشطة" });
        }
      }
      
      const roll = await storage.markRollPrinted(id, getAuthUserId(req), printing_machine_id);
      res.json(roll);
    } catch (error) {
      console.error("Error marking roll printed:", error);
      res.status(400).json({ message: "خطأ في تسجيل طباعة الرول" });
    }
  });

  // Cutting Operations
  app.post("/api/cuts", requireAuth, async (req, res) => {
    try {
      const validationSchema = insertCutSchema.extend({
        cut_weight_kg: z.coerce
          .number()
          .gt(0, "الوزن يجب أن يكون أكبر من صفر")
          .max(50000, "الوزن يتجاوز 50 طن")
          .transform((v) => Number(v.toFixed(3))),
        pieces_count: z.coerce.number().positive().optional(),
        cutting_machine_id: z.string().min(1, "يجب اختيار ماكينة القطع"),
      });

      const validated = validationSchema.parse(req.body);
      if (!getAuthUserId(req)) {
        return res.status(401).json({ message: "غير مسجل الدخول" });
      }
      
      // Get roll to check its production order
      const existingRoll = await storage.getRollFullDetails(validated.roll_id);
      if (!existingRoll) {
        return res.status(404).json({ message: "الرول غير موجود" });
      }
      
      // Check if order is paused - block production entry
      const pauseCheck = await checkOrderNotPaused(existingRoll.production_order_id);
      if (pauseCheck.isPaused) {
        return res.status(403).json({ 
          success: false,
          message: pauseCheck.message,
          orderStatus: pauseCheck.orderStatus
        });
      }
      
      // Validate cutting machine
      const { cutting_machine_id } = validated;
      if (cutting_machine_id) {
        const machine = await storage.getMachineById(cutting_machine_id);
        if (!machine) {
          return res.status(400).json({ message: "ماكينة القطع غير موجودة" });
        }
        if (machine.status !== "active") {
          return res.status(400).json({ message: "ماكينة القطع غير نشطة" });
        }
      }
      
      const cut = await storage.createCut({
        ...validated,
        performed_by: getAuthUserId(req),
      });
      res.status(201).json(cut);
    } catch (error) {
      console.error("Error creating cut:", error);
      if (
        error instanceof Error &&
        error.message.includes("الوزن المطلوب أكبر من المتاح")
      ) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "خطأ في تسجيل القطع" });
      }
    }
  });

  // Warehouse Receipts
  app.post("/api/warehouse/receipts", requireAuth, async (req, res) => {
    try {
      const validationSchema = insertWarehouseReceiptSchema.extend({
        received_weight_kg: z.coerce
          .number()
          .gt(0, "الوزن يجب أن يكون أكبر من صفر")
          .max(50000, "الوزن يتجاوز 50 طن")
          .transform((v) => Number(v.toFixed(3))),
      });

      const validated = validationSchema.parse(req.body);
      if (!getAuthUserId(req)) {
        return res.status(401).json({ message: "غير مسجل الدخول" });
      }
      const receipt = await storage.createWarehouseReceipt({
        ...validated,
        received_by: getAuthUserId(req),
      });
      res.status(201).json(receipt);
    } catch (error) {
      console.error("Error creating warehouse receipt:", error);
      res.status(500).json({ message: "خطأ في تسجيل استلام المستودع" });
    }
  });

  // Get warehouse receipts with detailed information grouped by order number
  app.get("/api/warehouse/receipts-detailed", requireAuth, async (req, res) => {
    try {
      const receipts = await storage.getWarehouseReceiptsDetailed();
      res.json(receipts);
    } catch (error) {
      console.error("Error fetching detailed warehouse receipts:", error);
      res.status(500).json({ message: "خطأ في جلب تفاصيل إيصالات المستودع" });
    }
  });

  // Production Queues
  app.get("/api/production/film-queue", requireAuth, async (req, res) => {
    try {
      const queue = await storage.getFilmQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching film queue:", error);
      res.status(500).json({ message: "خطأ في جلب قائمة الفيلم" });
    }
  });

  app.get("/api/production/printing-queue", requireAuth, async (req, res) => {
    try {
      const queue = await storage.getPrintingQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching printing queue:", error);
      res.status(500).json({ message: "خطأ في جلب قائمة الطباعة" });
    }
  });

  app.get("/api/production/cutting-queue", requireAuth, async (req, res) => {
    try {
      const queue = await storage.getCuttingQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching cutting queue:", error);
      res.status(500).json({ message: "خطأ في جلب قائمة التقطيع" });
    }
  });

  app.get("/api/production/grouped-cutting-queue", requireAuth, async (req, res) => {
    try {
      const queue = await storage.getGroupedCuttingQueue();
      res.json(queue);
    } catch (error) {
      console.error("Error fetching grouped cutting queue:", error);
      res.status(500).json({ message: "خطأ في جلب قائمة التقطيع المجمعة" });
    }
  });

  // Production hall - get production orders ready for warehouse receipt
  app.get("/api/warehouse/production-hall", requireAuth, async (req, res) => {
    try {
      const productionOrders = (storage as any).getProductionHallOrders
        ? await (storage as any).getProductionHallOrders()
        : await storage.getProductionOrdersForReceipt();
      res.json(productionOrders);
    } catch (error) {
      console.error("Error fetching production hall data:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات صالة الإنتاج" });
    }
  });

  // Create warehouse receipt from production hall
  app.post("/api/warehouse/receipts", requireAuth, async (req, res) => {
    try {
      const receiptData = req.body;
      const receipt = await storage.createWarehouseReceipt(receiptData);
      res.json(receipt);
    } catch (error) {
      console.error("Error creating warehouse receipt:", error);
      res.status(500).json({ message: "خطأ في تسجيل استلام المستودع" });
    }
  });

  app.get("/api/production/order-progress/:jobOrderId", requireAuth, async (req, res) => {
    try {
      const jobOrderId = parseInt(req.params.jobOrderId);
      if (isNaN(jobOrderId) || jobOrderId <= 0) {
        return res.status(400).json({ message: "معرف أمر العمل غير صحيح" });
      }
      const progress = await storage.getOrderProgress(jobOrderId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching order progress:", error);
      res.status(500).json({ message: "خطأ في جلب تقدم الطلب" });
    }
  });

  app.get("/api/rolls/:id/qr", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const qrData = await storage.getRollQR(id);
      res.json(qrData);
    } catch (error) {
      console.error("Error fetching roll QR:", error);
      res.status(500).json({ message: "خطأ في جلب رمز QR للرول" });
    }
  });

  // Label printing endpoint - generates 4" x 5" label
  app.get("/api/rolls/:id/label", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const labelData = await storage.getRollLabelData(id);
      res.json(labelData);
    } catch (error) {
      console.error("Error generating roll label:", error);
      res.status(500).json({ message: "خطأ في توليد ليبل الرول" });
    }
  });

  // ============ Roll Search API Routes ============

  // البحث الشامل عن الرولات
  app.get("/api/rolls/search", requireAuth, async (req, res) => {
    try {
      const query = (req.query.q as string) || "";
      const filters = {
        stage: req.query.stage as string,
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
        machineId: req.query.machine_id as string,
        operatorId: req.query.operator_id ? parseIntSafe(req.query.operator_id as string, "Operator ID", { min: 1 }) : undefined,
        minWeight: req.query.min_weight ? parseFloatSafe(req.query.min_weight as string, "Min Weight", { min: 0 }) : undefined,
        maxWeight: req.query.max_weight ? parseFloatSafe(req.query.max_weight as string, "Max Weight", { min: 0 }) : undefined,
        productionOrderId: req.query.production_order_id ? parseIntSafe(req.query.production_order_id as string, "Production Order ID", { min: 1 }) : undefined,
        orderId: req.query.order_id ? parseIntSafe(req.query.order_id as string, "Order ID", { min: 1 }) : undefined,
      };

      const results = await storage.searchRolls(query, filters);
      res.json(results);
    } catch (error) {
      console.error("Error searching rolls:", error);
      res.status(500).json({ message: "خطأ في البحث عن الرولات" });
    }
  });

  // البحث بالباركود
  app.get("/api/rolls/search-by-barcode/:barcode", requireAuth, async (req, res) => {
    try {
      const barcode = req.params.barcode;
      
      if (!barcode || barcode.length < 3) {
        return res.status(400).json({ message: "الباركود غير صحيح" });
      }

      const roll = await storage.getRollByBarcode(barcode);
      
      if (!roll) {
        return res.status(404).json({ message: "الرول غير موجود" });
      }

      res.json(roll);
    } catch (error) {
      console.error("Error searching roll by barcode:", error);
      res.status(500).json({ message: "خطأ في البحث بالباركود" });
    }
  });

  // جلب التفاصيل الكاملة للرول
  app.get("/api/rolls/:id/full-details", requireAuth, async (req, res) => {
    try {
      const id = parseIntSafe(req.params.id, "Roll ID", { min: 1 });
      const rollDetails = await storage.getRollFullDetails(id);
      
      if (!rollDetails) {
        return res.status(404).json({ message: "الرول غير موجود" });
      }

      res.json(rollDetails);
    } catch (error) {
      console.error("Error fetching roll full details:", error);
      res.status(500).json({ message: "خطأ في جلب تفاصيل الرول" });
    }
  });

  // جلب سجل تحركات الرول
  app.get("/api/rolls/:id/history", requireAuth, async (req, res) => {
    try {
      const id = parseIntSafe(req.params.id, "Roll ID", { min: 1 });
      const history = await storage.getRollHistory(id);
      res.json(history);
    } catch (error) {
      console.error("Error fetching roll history:", error);
      res.status(500).json({ message: "خطأ في جلب سجل تحركات الرول" });
    }
  });

  // ============ Enhanced Cutting Operations API Routes ============

  // جلب رولات التقطيع مع الإحصائيات
  app.get("/api/rolls/cutting-queue-by-section", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const sectionId = (authReq.user as any)?.section_id;
      
      const result = await storage.getRollsForCuttingBySection(sectionId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching cutting queue by section:", error);
      res.status(500).json({ message: "خطأ في جلب قائمة التقطيع" });
    }
  });

  // إكمال عملية التقطيع
  app.post("/api/rolls/:id/complete-cutting", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const rollId = parseRouteParam(req.params.id, "id");
      const { net_weight, cutting_machine_id } = req.body;
      
      if (!net_weight || net_weight <= 0) {
        return res.status(400).json({ 
          message: "الوزن الصافي مطلوب ويجب أن يكون أكبر من صفر" 
        });
      }

      const operatorId = authReq.user?.id!;
      const result = await storage.completeCutting(rollId, net_weight, operatorId, cutting_machine_id);
      
      res.json({
        ...result,
        message: result.is_order_completed 
          ? "تم إكمال جميع رولات أمر الإنتاج" 
          : "تم تقطيع الرول بنجاح"
      });
    } catch (error: any) {
      console.error("Error completing cutting:", error);
      res.status(500).json({ 
        message: "خطأ في إكمال عملية التقطيع" 
      });
    }
  });

  // إحصائيات الهدر لأمر إنتاج
  app.get("/api/production-orders/:id/waste-stats", requireAuth, async (req, res) => {
    try {
      const productionOrderId = parseInt(req.params.id);
      
      if (isNaN(productionOrderId)) {
        return res.status(400).json({ 
          message: "معرف أمر الإنتاج غير صحيح" 
        });
      }

      const stats = await storage.calculateWasteStatistics(productionOrderId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching waste statistics:", error);
      res.status(500).json({ 
        message: "خطأ في جلب إحصائيات الهدر" 
      });
    }
  });

  // التحقق من اكتمال التقطيع
  app.get("/api/production-orders/:id/cutting-status", requireAuth, async (req, res) => {
    try {
      const productionOrderId = parseInt(req.params.id);
      
      if (isNaN(productionOrderId)) {
        return res.status(400).json({ 
          message: "معرف أمر الإنتاج غير صحيح" 
        });
      }

      const isCompleted = await storage.checkCuttingCompletion(productionOrderId);
      res.json({
        productionOrderId,
        cuttingCompleted: isCompleted,
        status: isCompleted ? "completed" : "in_progress"
      });
    } catch (error) {
      console.error("Error checking cutting completion:", error);
      res.status(500).json({ 
        message: "خطأ في التحقق من حالة التقطيع" 
      });
    }
  });

  // ============ Production Monitoring Analytics API Routes ============

  // Get user performance statistics
  app.get("/api/production/user-performance", requireAuth, async (req, res) => {
    try {
      const userId = req.query.user_id
        ? parseIntSafe(req.query.user_id as string, "User ID", { min: 1 })
        : undefined;
      const dateFrom = (req.query.date_from as string) || undefined;
      const dateTo = (req.query.date_to as string) || undefined;

      // Validate date format if provided
      if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        return res
          .status(400)
          .json({ message: "تنسيق تاريخ البداية غير صحيح (YYYY-MM-DD)" });
      }
      if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        return res
          .status(400)
          .json({ message: "تنسيق تاريخ النهاية غير صحيح (YYYY-MM-DD)" });
      }

      const performance = await storage.getUserPerformanceStats(
        userId,
        dateFrom,
        dateTo,
      );

      res.json({
        data: performance,
        period: {
          from: dateFrom || "آخر 7 أيام",
          to: dateTo || "اليوم",
          user_filter: userId ? `المستخدم ${userId}` : "جميع المستخدمين",
        },
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error fetching user performance stats:", error);
      res.status(500).json({
        message: "خطأ في جلب إحصائيات أداء المستخدمين",
      });
    }
  });

  // Get role performance statistics
  app.get("/api/production/role-performance", requireAuth, async (req, res) => {
    try {
      const dateFrom = (req.query.date_from as string) || undefined;
      const dateTo = (req.query.date_to as string) || undefined;

      // Validate date format if provided
      if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
        return res
          .status(400)
          .json({ message: "تنسيق تاريخ البداية غير صحيح (YYYY-MM-DD)" });
      }
      if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
        return res
          .status(400)
          .json({ message: "تنسيق تاريخ النهاية غير صحيح (YYYY-MM-DD)" });
      }

      const performance = await storage.getRolePerformanceStats(
        dateFrom,
        dateTo,
      );

      res.json({
        data: performance,
        period: {
          from: dateFrom || "آخر 7 أيام",
          to: dateTo || "اليوم",
        },
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error fetching role performance stats:", error);
      res.status(500).json({
        message: "خطأ في جلب إحصائيات أداء الأقسام",
      });
    }
  });

  app.get("/api/production/monitoring-dashboard", requireAuth, async (req: AuthRequest, res) => {
    try {
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const data = await storage.getMonitoringDashboard(dateFrom, dateTo);
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error fetching monitoring dashboard:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات لوحة المراقبة" });
    }
  });

  // Get real-time production statistics
  app.get("/api/production/real-time-stats", requireAuth, async (req, res) => {
    try {
      const realTimeStats = await storage.getRealTimeProductionStats();

      res.json({
        ...realTimeStats,
        updateInterval: 30000, // 30 seconds
      });
    } catch (error: any) {
      console.error("Error fetching real-time production stats:", error);
      res.status(500).json({
        message: "خطأ في جلب الإحصائيات الفورية",
      });
    }
  });

  // Get production efficiency metrics
  app.get(
    "/api/production/efficiency-metrics",
    requireAuth,
    async (req, res) => {
      try {
        const dateFrom = (req.query.date_from as string) || undefined;
        const dateTo = (req.query.date_to as string) || undefined;

        // Validate date format if provided
        if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
          return res
            .status(400)
            .json({ message: "تنسيق تاريخ البداية غير صحيح (YYYY-MM-DD)" });
        }
        if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
          return res
            .status(400)
            .json({ message: "تنسيق تاريخ النهاية غير صحيح (YYYY-MM-DD)" });
        }

        const metrics = await storage.getProductionEfficiencyMetrics(
          dateFrom,
          dateTo,
        );

        res.json({
          ...metrics,
          period: {
            from: dateFrom || "آخر 30 يوم",
            to: dateTo || "اليوم",
          },
          lastUpdated: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("Error fetching production efficiency metrics:", error);
        res.status(500).json({
          message: "خطأ في جلب مؤشرات الكفاءة",
        });
      }
    },
  );

  // Get production alerts
  app.get("/api/production/alerts", requireAuth, async (req, res) => {
    try {
      const alerts = await storage.getProductionAlerts();

      res.json({
        alerts,
        alertCount: alerts.length,
        criticalCount: alerts.filter((a: any) => a.priority === "critical")
          .length,
        warningCount: alerts.filter(
          (a: any) => a.priority === "high" || a.priority === "medium",
        ).length,
        lastUpdated: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("Error fetching production alerts:", error);
      res.status(500).json({
        message: "خطأ في جلب تنبيهات الإنتاج",
      });
    }
  });

  // Get machine utilization statistics
  app.get(
    "/api/production/machine-utilization",
    requireAuth,
    async (req, res) => {
      try {
        const dateFrom = (req.query.date_from as string) || undefined;
        const dateTo = (req.query.date_to as string) || undefined;

        // Validate date format if provided
        if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
          return res
            .status(400)
            .json({ message: "تنسيق تاريخ البداية غير صحيح (YYYY-MM-DD)" });
        }
        if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
          return res
            .status(400)
            .json({ message: "تنسيق تاريخ النهاية غير صحيح (YYYY-MM-DD)" });
        }

        const utilizationStats = await storage.getMachineUtilizationStats(
          dateFrom,
          dateTo,
        );

        res.json({
          data: utilizationStats,
          period: {
            from: dateFrom || "آخر 7 أيام",
            to: dateTo || "اليوم",
          },
          totalMachines: utilizationStats.length,
          activeMachines: utilizationStats.filter(
            (m: any) => m.status === "active",
          ).length,
          lastUpdated: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error("Error fetching machine utilization stats:", error);
        res.status(500).json({
          message: "خطأ في جلب إحصائيات استخدام المكائن",
        });
      }
    },
  );

  // ============ لوحة مراقبة الإنتاج - APIs جديدة ============

  // Get production statistics by section
  app.get("/api/production/stats-by-section/:section", requireAuth, async (req, res) => {
    try {
      const { section } = req.params;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      // Validate section
      if (!['film', 'printing', 'cutting'].includes(section)) {
        return res.status(400).json({ message: "قسم غير صحيح" });
      }

      // Get production statistics for the section
      const stats = await storage.getProductionStatsBySection(section, dateFrom, dateTo);

      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching section stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات القسم" });
    }
  });

  // Get users performance by section (production users only)
  app.get("/api/production/users-performance/:section", requireAuth, async (req, res) => {
    try {
      const { section } = req.params;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      // Validate section
      if (!['film', 'printing', 'cutting'].includes(section)) {
        return res.status(400).json({ message: "قسم غير صحيح" });
      }

      // Get users performance for the section
      const users = await storage.getUsersPerformanceBySection(section, dateFrom, dateTo);

      res.json({ data: users });
    } catch (error: any) {
      console.error("Error fetching users performance:", error);
      res.status(500).json({ message: "خطأ في جلب أداء المستخدمين" });
    }
  });

  // Get machines production by section
  app.get("/api/production/machines-production/:section", requireAuth, async (req, res) => {
    try {
      const { section } = req.params;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;

      // Validate section
      if (!['film', 'printing', 'cutting'].includes(section)) {
        return res.status(400).json({ message: "قسم غير صحيح" });
      }

      // Get machines production for the section
      const machines = await storage.getMachinesProductionBySection(section, dateFrom, dateTo);

      res.json({ data: machines });
    } catch (error: any) {
      console.error("Error fetching machines production:", error);
      res.status(500).json({ message: "خطأ في جلب إنتاج المكائن" });
    }
  });

  // Get machine detail across all stages
  app.get("/api/production/machine-detail/:machineId", requireAuth, async (req, res) => {
    try {
      const machineId = parseInt(req.params.machineId);
      if (isNaN(machineId)) {
        return res.status(400).json({ message: "معرف الماكينة غير صحيح" });
      }
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const detail = await storage.getMachineDetailAllStages(machineId, dateFrom, dateTo);
      if (!detail) {
        return res.status(404).json({ message: "الماكينة غير موجودة" });
      }
      res.json({ data: detail });
    } catch (error: any) {
      console.error("Error fetching machine detail:", error);
      res.status(500).json({ message: "خطأ في جلب تفاصيل الماكينة" });
    }
  });

  // Get rolls tracking by section
  app.get("/api/production/rolls-tracking/:section", requireAuth, async (req, res) => {
    try {
      const { section } = req.params;
      const search = req.query.search as string;

      // Validate section
      if (!['film', 'printing', 'cutting'].includes(section)) {
        return res.status(400).json({ message: "قسم غير صحيح" });
      }

      // Get rolls for the section
      const rolls = await storage.getRollsBySection(section, search);

      res.json({ data: rolls });
    } catch (error: any) {
      console.error("Error fetching rolls:", error);
      res.status(500).json({ message: "خطأ في جلب الرولات" });
    }
  });

  // Get production orders tracking by section
  app.get("/api/production/orders-tracking/:section", requireAuth, async (req, res) => {
    try {
      const { section } = req.params;
      const search = req.query.search as string;

      // Validate section
      if (!['film', 'printing', 'cutting'].includes(section)) {
        return res.status(400).json({ message: "قسم غير صحيح" });
      }

      // Get production orders for the section
      const orders = await storage.getProductionOrdersBySection(section, search);

      res.json({ data: orders });
    } catch (error: any) {
      console.error("Error fetching production orders:", error);
      res.status(500).json({ message: "خطأ في جلب أوامر الإنتاج" });
    }
  });

  // ============ نظام التحذيرات الذكية ============

  // تم تعطيل خدمات المراقبة والتحذيرات التلقائية بناء على طلب المستخدم
  // الإشعارات من نوع system لن يتم إرسالها بعد الآن
  // const healthMonitor = getSystemHealthMonitor(storage);
  // const alertManager = getAlertManager(storage);
  const dataValidator = getDataValidator(storage);

  // إعداد routes التحذيرات الذكية (مُعطّلة جزئياً)
  // app.use("/api/alerts", createAlertsRouter(storage));
  // app.use("/api/system/health", createSystemHealthRouter(storage));
  // app.use("/api/system/performance", createPerformanceRouter(storage));
  // app.use("/api/corrective-actions", createCorrectiveActionsRouter(storage));
  app.use("/api/data-validation", createDataValidationRouter(storage));

  // console.log("[SmartAlerts] نظام التحذيرات الذكية مُفعل ✅");

  // ============ Quick Notes API ============
  
  // Get all notes (optionally filtered by user)
  app.get("/api/quick-notes", requireAuth, async (req, res) => {
    try {
      // Only managers can query other users' notes
      let userId = req.user!.id;
      if (req.query.user_id) {
        const requestedUserId = parseInt(req.query.user_id as string);
        if (requestedUserId !== req.user!.id && req.user!.role_id !== 1) {
          return res.status(403).json({ message: "غير مصرح لك بعرض ملاحظات مستخدمين آخرين" });
        }
        userId = requestedUserId;
      }
      
      const notes = await storage.getQuickNotes(userId);
      res.json(notes);
    } catch (error: any) {
      console.error("Error fetching quick notes:", error);
      res.status(500).json({ message: "خطأ في جلب الملاحظات" });
    }
  });

  // Get a single note by ID
  app.get("/api/quick-notes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const note = await storage.getQuickNoteById(id);
      
      if (!note) {
        return res.status(404).json({ message: "الملاحظة غير موجودة" });
      }

      // Authorization check - only creator, assignee, or manager can view
      if (note.created_by !== req.user!.id && 
          note.assigned_to !== req.user!.id && 
          req.user!.role_id !== 1) {
        return res.status(403).json({ message: "غير مصرح لك بعرض هذه الملاحظة" });
      }
      
      res.json(note);
    } catch (error: any) {
      console.error("Error fetching note:", error);
      res.status(500).json({ message: "خطأ في جلب الملاحظة" });
    }
  });

  // Create a new note
  app.post("/api/quick-notes", requireAuth, async (req, res) => {
    try {
      // Validate required fields
      if (!req.body.content || typeof req.body.content !== 'string' || req.body.content.trim() === '') {
        return res.status(400).json({ message: "المحتوى مطلوب ويجب أن يكون نصاً" });
      }

      if (!req.body.note_type) {
        return res.status(400).json({ message: "نوع الملاحظة مطلوب" });
      }

      if (!req.body.assigned_to) {
        return res.status(400).json({ message: "يجب تعيين المستخدم" });
      }

      // Validate assigned_to is a valid number
      const assignedToId = parseInt(req.body.assigned_to);
      if (isNaN(assignedToId) || assignedToId <= 0) {
        return res.status(400).json({ message: "معرف المستخدم المعين غير صحيح" });
      }

      // Validate note_type
      const validNoteTypes = ['order', 'design', 'statement', 'quote', 'delivery', 'call_customer', 'other'];
      if (!validNoteTypes.includes(req.body.note_type)) {
        return res.status(400).json({ message: "نوع الملاحظة غير صحيح" });
      }

      // Validate priority
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      const priority = req.body.priority || 'normal';
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ message: "الأولوية غير صحيحة" });
      }

      const noteData = {
        content: req.body.content.trim(),
        note_type: req.body.note_type,
        priority,
        created_by: req.user!.id,
        assigned_to: assignedToId,
        is_read: false,
      };

      const newNote = await storage.createQuickNote(noteData);
      res.status(201).json(newNote);
    } catch (error: any) {
      console.error("Error creating note:", error);
      res.status(500).json({ message: "خطأ في إنشاء الملاحظة" });
    }
  });

  // Update a note
  app.patch("/api/quick-notes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      
      // Get existing note to check authorization
      const existingNote = await storage.getQuickNoteById(id);
      if (!existingNote) {
        return res.status(404).json({ message: "الملاحظة غير موجودة" });
      }

      // Only creator or manager can update
      if (existingNote.created_by !== req.user!.id && req.user!.role_id !== 1) {
        return res.status(403).json({ message: "غير مصرح لك بتعديل هذه الملاحظة" });
      }

      // Only allow updating specific fields
      const allowedUpdates: any = {};
      if (req.body.content) allowedUpdates.content = req.body.content.trim();
      if (req.body.note_type) {
        const validNoteTypes = ['order', 'design', 'statement', 'quote', 'delivery', 'call_customer', 'other'];
        if (!validNoteTypes.includes(req.body.note_type)) {
          return res.status(400).json({ message: "نوع الملاحظة غير صحيح" });
        }
        allowedUpdates.note_type = req.body.note_type;
      }
      if (req.body.priority) {
        const validPriorities = ['low', 'normal', 'high', 'urgent'];
        if (!validPriorities.includes(req.body.priority)) {
          return res.status(400).json({ message: "الأولوية غير صحيحة" });
        }
        allowedUpdates.priority = req.body.priority;
      }
      if (req.body.assigned_to) {
        const assignedTo = parseInt(req.body.assigned_to);
        if (isNaN(assignedTo) || assignedTo <= 0) {
          return res.status(400).json({ message: "معرف المستخدم المعين غير صحيح" });
        }
        allowedUpdates.assigned_to = assignedTo;
      }
      
      const updatedNote = await storage.updateQuickNote(id, allowedUpdates);
      res.json(updatedNote);
    } catch (error: any) {
      console.error("Error updating note:", error);
      res.status(500).json({ message: "خطأ في تحديث الملاحظة" });
    }
  });

  // Mark note as read
  app.patch("/api/quick-notes/:id/read", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      
      // Get existing note to check authorization
      const existingNote = await storage.getQuickNoteById(id);
      if (!existingNote) {
        return res.status(404).json({ message: "الملاحظة غير موجودة" });
      }

      // Only assignee can mark as read
      if (existingNote.assigned_to !== req.user!.id) {
        return res.status(403).json({ message: "فقط المستخدم المعين يمكنه تحديث حالة القراءة" });
      }

      const updatedNote = await storage.markNoteAsRead(id);
      res.json(updatedNote);
    } catch (error: any) {
      console.error("Error marking note as read:", error);
      res.status(500).json({ message: "خطأ في تحديث حالة القراءة" });
    }
  });

  // Delete a note
  app.delete("/api/quick-notes/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      
      // Get existing note to check authorization
      const existingNote = await storage.getQuickNoteById(id);
      if (!existingNote) {
        return res.status(404).json({ message: "الملاحظة غير موجودة" });
      }

      // Only creator or manager can delete
      if (existingNote.created_by !== req.user!.id && req.user!.role_id !== 1) {
        return res.status(403).json({ message: "غير مصرح لك بحذف هذه الملاحظة" });
      }

      await storage.deleteQuickNote(id);
      res.json({ message: "تم حذف الملاحظة بنجاح" });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      res.status(500).json({ message: "خطأ في حذف الملاحظة" });
    }
  });

  // Get attachments for a note
  app.get("/api/quick-notes/:id/attachments", requireAuth, async (req, res) => {
    try {
      const noteId = parseRouteParam(req.params.id, "id");
      
      // Get note to check authorization
      const note = await storage.getQuickNoteById(noteId);
      if (!note) {
        return res.status(404).json({ message: "الملاحظة غير موجودة" });
      }

      // Authorization check
      if (note.created_by !== req.user!.id && 
          note.assigned_to !== req.user!.id && 
          req.user!.role_id !== 1) {
        return res.status(403).json({ message: "غير مصرح لك بعرض هذه المرفقات" });
      }

      const attachments = await storage.getNoteAttachments(noteId);
      res.json(attachments);
    } catch (error: any) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "خطأ في جلب المرفقات" });
    }
  });

  // Upload attachment (placeholder - will be implemented with actual file upload)
  app.post("/api/quick-notes/:id/attachments", requireAuth, async (req, res) => {
    try {
      const noteId = parseRouteParam(req.params.id, "id");
      
      // Get note to check authorization
      const note = await storage.getQuickNoteById(noteId);
      if (!note) {
        return res.status(404).json({ message: "الملاحظة غير موجودة" });
      }

      // Only creator or assignee can add attachments
      if (note.created_by !== req.user!.id && note.assigned_to !== req.user!.id) {
        return res.status(403).json({ message: "غير مصرح لك بإضافة مرفقات لهذه الملاحظة" });
      }

      // Validate required fields
      if (!req.body.file_name || !req.body.file_type || !req.body.file_size || !req.body.file_url) {
        return res.status(400).json({ message: "بيانات المرفق ناقصة" });
      }

      const parsedFileSize = parseInt(req.body.file_size);
      if (isNaN(parsedFileSize) || parsedFileSize < 0) {
        return res.status(400).json({ message: "حجم الملف غير صحيح" });
      }

      const attachmentData = {
        note_id: noteId,
        file_name: req.body.file_name,
        file_type: req.body.file_type,
        file_size: parsedFileSize,
        file_url: req.body.file_url,
      };

      const newAttachment = await storage.createNoteAttachment(attachmentData);
      res.status(201).json(newAttachment);
    } catch (error: any) {
      console.error("Error creating attachment:", error);
      res.status(500).json({ message: "خطأ في رفع المرفق" });
    }
  });

  // Delete attachment
  app.delete("/api/note-attachments/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      
      // Get attachment to find its note
      const attachments = await storage.getNoteAttachments(0); // This won't work, need to get by ID
      // For now, only managers can delete attachments
      if (req.user!.role_id !== 1) {
        return res.status(403).json({ message: "فقط المدراء يمكنهم حذف المرفقات" });
      }

      await storage.deleteNoteAttachment(id);
      res.json({ message: "تم حذف المرفق بنجاح" });
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "خطأ في حذف المرفق" });
    }
  });

  // ============ Mixing Batches Routes ============

  // Get all mixing batches
  app.get("/api/mixing-batches", requireAuth, async (req, res) => {
    try {
      const batches = await storage.getAllMixingBatches();
      res.json({ data: batches });
    } catch (error: any) {
      console.error("Error getting mixing batches:", error);
      res.status(500).json({ message: "خطأ في جلب عمليات الخلط" });
    }
  });

  // Get mixing batch by ID
  app.get("/api/mixing-batches/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const batch = await storage.getMixingBatchById(id);
      
      if (!batch) {
        return res.status(404).json({ message: "عملية الخلط غير موجودة" });
      }
      
      res.json(batch);
    } catch (error: any) {
      console.error("Error getting mixing batch:", error);
      res.status(500).json({ message: "خطأ في جلب عملية الخلط" });
    }
  });

  // Get mixing batches by operator
  app.get("/api/mixing-batches/operator/:operatorId", requireAuth, async (req, res) => {
    try {
      const operatorId = parseInt(req.params.operatorId);
      if (isNaN(operatorId) || operatorId <= 0) {
        return res.status(400).json({ message: "معرف العامل غير صحيح" });
      }
      const batches = await storage.getMixingBatchesByOperator(operatorId);
      res.json({ data: batches });
    } catch (error: any) {
      console.error("Error getting operator batches:", error);
      res.status(500).json({ message: "خطأ في جلب عمليات الخلط للعامل" });
    }
  });

  // Get mixing batches by production order
  app.get("/api/mixing-batches/production-order/:productionOrderId", requireAuth, async (req, res) => {
    try {
      const productionOrderId = parseInt(req.params.productionOrderId);
      if (isNaN(productionOrderId) || productionOrderId <= 0) {
        return res.status(400).json({ message: "معرف أمر الإنتاج غير صحيح" });
      }
      const batches = await storage.getMixingBatchesByProductionOrder(productionOrderId);
      res.json({ data: batches });
    } catch (error: any) {
      console.error("Error getting production order batches:", error);
      res.status(500).json({ message: "خطأ في جلب عمليات الخلط لأمر الإنتاج" });
    }
  });

  // Create mixing batch
  app.post("/api/mixing-batches", requireAuth, async (req, res) => {
    try {
      const { batch, ingredients } = req.body;
      
      if (!batch || !ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ message: "بيانات عملية الخلط أو المكونات ناقصة" });
      }

      // Validate screw_assignment
      if (!batch.screw_assignment || !['A', 'B'].includes(batch.screw_assignment)) {
        return res.status(400).json({ message: "يجب تحديد البريمة (A أو B)" });
      }

      // Validate machine_id is provided
      if (!batch.machine_id) {
        return res.status(400).json({ message: "يجب تحديد الماكينة" });
      }

      // Ensure batch_number is auto-generated (remove if user provided it)
      const { batch_number, formula_id, roll_id, ...cleanBatchData } = batch;

      const batchData = {
        ...cleanBatchData,
        operator_id: req.user!.id,
        status: "in_progress",
        started_at: new Date(),
      };

      const newBatch = await storage.createMixingBatch(batchData, ingredients);
      res.status(201).json(newBatch);
    } catch (error: any) {
      console.error("Error creating mixing batch:", error);
      res.status(500).json({ message: "خطأ في إنشاء عملية الخلط" });
    }
  });

  // Update mixing batch
  app.put("/api/mixing-batches/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const updates = req.body;
      
      const updatedBatch = await storage.updateMixingBatch(id, updates);
      res.json(updatedBatch);
    } catch (error: any) {
      console.error("Error updating mixing batch:", error);
      res.status(500).json({ message: "خطأ في تحديث عملية الخلط" });
    }
  });

  // Update batch ingredient actuals
  app.put("/api/mixing-batches/:id/ingredients", requireAuth, async (req, res) => {
    try {
      const batchId = parseRouteParam(req.params.id, "id");
      const { ingredientUpdates } = req.body;
      
      if (!ingredientUpdates || !Array.isArray(ingredientUpdates)) {
        return res.status(400).json({ message: "بيانات المكونات ناقصة" });
      }

      await storage.updateBatchIngredientActuals(batchId, ingredientUpdates);
      const updatedBatch = await storage.getMixingBatchById(batchId);
      res.json(updatedBatch);
    } catch (error: any) {
      console.error("Error updating batch ingredients:", error);
      res.status(500).json({ message: "خطأ في تحديث الكميات الفعلية" });
    }
  });

  // Complete mixing batch
  app.post("/api/mixing-batches/:id/complete", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const completedBatch = await storage.completeMixingBatch(id);
      res.json(completedBatch);
    } catch (error: any) {
      console.error("Error completing mixing batch:", error);
      res.status(500).json({ message: "خطأ في إتمام عملية الخلط" });
    }
  });

  // Record material consumption from mixing batch
  app.post("/api/inventory/consumption", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { batchId, consumptions } = req.body;
      const userId = getAuthUserId(req);

      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      if (!batchId || !consumptions || !Array.isArray(consumptions)) {
        return res.status(400).json({ message: "بيانات الاستهلاك غير مكتملة" });
      }

      // Get batch details
      const batch = await storage.getMixingBatchById(batchId);
      if (!batch) {
        return res.status(404).json({ message: "دفعة الخلط غير موجودة" });
      }

      // Record consumption for each ingredient
      const results = [];
      for (const consumption of consumptions) {
        const { item_id, quantity_consumed, cost_at_consumption } = consumption;

        // Get inventory item
        const inventoryItem = await storage.getInventoryByItemId(item_id);
        if (!inventoryItem) {
          throw new Error(`الصنف ${item_id} غير موجود في المخزون`);
        }

        // Create inventory movement (out)
        const movement = await storage.createInventoryMovement({
          inventory_id: inventoryItem.id,
          movement_type: "out",
          quantity: quantity_consumed.toString(),
          unit_cost: cost_at_consumption?.toString(),
          total_cost: cost_at_consumption 
            ? (parseFloat(quantity_consumed) * parseFloat(cost_at_consumption)).toString()
            : undefined,
          reference_number: `BATCH-${batch.batch_number}`,
          reference_type: "production",
          notes: `استهلاك من دفعة خلط ${batch.batch_number}`,
          created_by: userId,
        });

        results.push({
          item_id,
          quantity_consumed,
          movement_id: movement.id,
          new_quantity: parseFloat(inventoryItem.current_stock) - parseFloat(quantity_consumed),
        });
      }

      res.json({
        success: true,
        message: "تم تسجيل استهلاك المواد بنجاح",
        results,
      });
    } catch (error: any) {
      console.error("Error recording material consumption:", error);
      res.status(500).json({ 
        message: "خطأ في تسجيل استهلاك المواد"
      });
    }
  });

  // ============ Warehouse Vouchers API Routes ============

  // سندات إدخال المواد الخام
  app.get("/api/warehouse/vouchers/raw-material-in", requireAuth, async (req, res) => {
    try {
      const vouchers = await storage.getRawMaterialVouchersIn();
      res.json(vouchers);
    } catch (error) {
      console.error("Error fetching raw material in vouchers:", error);
      res.status(500).json({ message: "خطأ في جلب سندات إدخال المواد الخام" });
    }
  });

  app.post("/api/warehouse/vouchers/raw-material-in", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const voucherData = {
        ...req.body,
        received_by: userId,
      };

      const voucher = await storage.createRawMaterialVoucherIn(voucherData);
      res.status(201).json(voucher);
    } catch (error: any) {
      console.error("Error creating raw material in voucher:", error);
      res.status(500).json({ message: "خطأ في إنشاء سند إدخال المواد الخام" });
    }
  });

  app.get("/api/warehouse/vouchers/raw-material-in/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const voucher = await storage.getRawMaterialVoucherInById(id);
      if (!voucher) {
        return res.status(404).json({ message: "السند غير موجود" });
      }
      res.json(voucher);
    } catch (error) {
      console.error("Error fetching raw material in voucher:", error);
      res.status(500).json({ message: "خطأ في جلب سند إدخال المواد الخام" });
    }
  });

  // سندات إخراج المواد الخام
  app.get("/api/warehouse/vouchers/raw-material-out", requireAuth, async (req, res) => {
    try {
      const vouchers = await storage.getRawMaterialVouchersOut();
      res.json(vouchers);
    } catch (error) {
      console.error("Error fetching raw material out vouchers:", error);
      res.status(500).json({ message: "خطأ في جلب سندات إخراج المواد الخام" });
    }
  });

  app.post("/api/warehouse/vouchers/raw-material-out", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const voucherData = {
        ...req.body,
        issued_by: userId,
      };

      const voucher = await storage.createRawMaterialVoucherOut(voucherData);
      res.status(201).json(voucher);
    } catch (error: any) {
      console.error("Error creating raw material out voucher:", error);
      res.status(500).json({ message: "خطأ في إنشاء سند إخراج المواد الخام" });
    }
  });

  app.get("/api/warehouse/vouchers/raw-material-out/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const voucher = await storage.getRawMaterialVoucherOutById(id);
      if (!voucher) {
        return res.status(404).json({ message: "السند غير موجود" });
      }
      res.json(voucher);
    } catch (error) {
      console.error("Error fetching raw material out voucher:", error);
      res.status(500).json({ message: "خطأ في جلب سند إخراج المواد الخام" });
    }
  });

  // أوامر الإنتاج المتاحة للاستلام في المستودع
  app.get("/api/warehouse/production-orders-for-receipt", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getProductionOrdersForReceipt();
      res.json(orders);
    } catch (error) {
      console.error("Error fetching production orders for receipt:", error);
      res.status(500).json({ message: "خطأ في جلب أوامر الإنتاج" });
    }
  });

  // سندات استلام المواد التامة
  app.get("/api/warehouse/vouchers/finished-goods-in", requireAuth, async (req, res) => {
    try {
      const vouchers = await storage.getFinishedGoodsVouchersIn();
      res.json(vouchers);
    } catch (error) {
      console.error("Error fetching finished goods in vouchers:", error);
      res.status(500).json({ message: "خطأ في جلب سندات استلام المواد التامة" });
    }
  });

  app.post("/api/warehouse/vouchers/finished-goods-in", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const voucherData = {
        ...req.body,
        created_by: userId,
      };

      const voucher = await storage.createFinishedGoodsVoucherIn(voucherData);
      res.status(201).json(voucher);
    } catch (error: any) {
      console.error("Error creating finished goods in voucher:", error);
      const validationPatterns = ["تتجاوز", "تم استلام كامل", "غير موجود"];
      const isValidation = error.message && validationPatterns.some((p: string) => error.message.includes(p));
      res.status(isValidation ? 400 : 500).json({ message: isValidation ? error.message : "خطأ في إنشاء سند استلام المواد التامة" });
    }
  });

  app.get("/api/warehouse/vouchers/finished-goods-in/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const voucher = await storage.getFinishedGoodsVoucherInById(id);
      if (!voucher) {
        return res.status(404).json({ message: "السند غير موجود" });
      }
      res.json(voucher);
    } catch (error) {
      console.error("Error fetching finished goods in voucher:", error);
      res.status(500).json({ message: "خطأ في جلب سند استلام المواد التامة" });
    }
  });

  // سندات إخراج المواد التامة
  app.get("/api/warehouse/vouchers/finished-goods-out", requireAuth, async (req, res) => {
    try {
      const vouchers = await storage.getFinishedGoodsVouchersOut();
      res.json(vouchers);
    } catch (error) {
      console.error("Error fetching finished goods out vouchers:", error);
      res.status(500).json({ message: "خطأ في جلب سندات إخراج المواد التامة" });
    }
  });

  app.post("/api/warehouse/vouchers/finished-goods-out", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const voucherData = {
        ...req.body,
        created_by: userId,
      };

      const voucher = await storage.createFinishedGoodsVoucherOut(voucherData);
      res.status(201).json(voucher);
    } catch (error: any) {
      console.error("Error creating finished goods out voucher:", error);
      const isValidation = error.message?.includes("تتجاوز");
      res.status(isValidation ? 400 : 500).json({ message: isValidation ? error.message : "خطأ في إنشاء سند إخراج المواد التامة" });
    }
  });

  app.get("/api/warehouse/vouchers/finished-goods-out/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const voucher = await storage.getFinishedGoodsVoucherOutById(id);
      if (!voucher) {
        return res.status(404).json({ message: "السند غير موجود" });
      }
      res.json(voucher);
    } catch (error) {
      console.error("Error fetching finished goods out voucher:", error);
      res.status(500).json({ message: "خطأ في جلب سند إخراج المواد التامة" });
    }
  });

  // إحصائيات السندات
  app.get("/api/warehouse/vouchers/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getWarehouseVouchersStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching warehouse voucher stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات السندات" });
    }
  });

  // ============ Inventory Count (الجرد) API Routes ============

  app.get("/api/warehouse/inventory-counts", requireAuth, async (req, res) => {
    try {
      const counts = await storage.getInventoryCounts();
      res.json(counts);
    } catch (error) {
      console.error("Error fetching inventory counts:", error);
      res.status(500).json({ message: "خطأ في جلب عمليات الجرد" });
    }
  });

  app.post("/api/warehouse/inventory-counts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const countData = {
        ...req.body,
        counted_by: userId,
      };

      const count = await storage.createInventoryCount(countData);
      res.status(201).json(count);
    } catch (error: any) {
      console.error("Error creating inventory count:", error);
      res.status(500).json({ message: "خطأ في إنشاء عملية الجرد" });
    }
  });

  app.get("/api/warehouse/inventory-counts/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const count = await storage.getInventoryCountById(id);
      if (!count) {
        return res.status(404).json({ message: "عملية الجرد غير موجودة" });
      }
      res.json(count);
    } catch (error) {
      console.error("Error fetching inventory count:", error);
      res.status(500).json({ message: "خطأ في جلب عملية الجرد" });
    }
  });

  app.post("/api/warehouse/inventory-counts/:id/items", requireAuth, async (req: AuthRequest, res) => {
    try {
      const countId = parseRouteParam(req.params.id, "id");
      const itemData = {
        ...req.body,
        count_id: countId,
      };

      const item = await storage.createInventoryCountItem(itemData);
      res.status(201).json(item);
    } catch (error: any) {
      console.error("Error adding inventory count item:", error);
      res.status(500).json({ message: "خطأ في إضافة صنف للجرد" });
    }
  });

  app.post("/api/warehouse/inventory-counts/:id/complete", requireAuth, async (req: AuthRequest, res) => {
    try {
      const userId = getAuthUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "غير مصرح" });
      }

      const id = parseRouteParam(req.params.id, "id");
      const count = await storage.completeInventoryCount(id, userId);
      res.json(count);
    } catch (error: any) {
      console.error("Error completing inventory count:", error);
      res.status(500).json({ message: "خطأ في إتمام عملية الجرد" });
    }
  });

  // البحث بالباركود
  app.get("/api/warehouse/barcode-lookup/:barcode", requireAuth, async (req, res) => {
    try {
      const barcode = req.params.barcode;
      const result = await storage.lookupByBarcode(barcode);
      if (!result) {
        return res.status(404).json({ message: "الباركود غير موجود" });
      }
      res.json(result);
    } catch (error) {
      console.error("Error looking up barcode:", error);
      res.status(500).json({ message: "خطأ في البحث بالباركود" });
    }
  });

  // توليد رقم سند جديد
  app.get("/api/warehouse/vouchers/next-number/:type", requireAuth, async (req, res) => {
    try {
      const type = req.params.type as "RM-Rec" | "RM-Del" | "FP-Rec" | "FP-Del" | "RMI" | "RMO" | "FGI" | "FGO" | "IC";
      const nextNumber = await storage.getNextVoucherNumber(type);
      res.json({ next_number: nextNumber });
    } catch (error) {
      console.error("Error generating next voucher number:", error);
      res.status(500).json({ message: "خطأ في توليد رقم السند" });
    }
  });

  // ============ Suppliers API Routes ============
  app.get("/api/suppliers", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM suppliers WHERE is_active = true ORDER BY name_ar`);
      res.json(result.rows || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.json([]);
    }
  });

  app.post("/api/suppliers", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      const { name, name_ar, phone, email, address, contact_person } = req.body;
      const result = await db.execute(sql`
        INSERT INTO suppliers (name, name_ar, phone, email, address, contact_person)
        VALUES (${name}, ${name_ar}, ${phone || null}, ${email || null}, ${address || null}, ${contact_person || null})
        RETURNING *
      `);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "خطأ في إنشاء المورد" });
    }
  });

  app.put("/api/suppliers/:id", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const { name, name_ar, phone, email, address, contact_person } = req.body;
      const result = await db.execute(sql`
        UPDATE suppliers 
        SET name = ${name}, name_ar = ${name_ar}, phone = ${phone || null}, 
            email = ${email || null}, address = ${address || null}, contact_person = ${contact_person || null}
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "خطأ في تحديث المورد" });
    }
  });

  app.delete("/api/suppliers/:id", requireAuth, requirePermission('manage_warehouse'), async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await db.execute(sql`UPDATE suppliers SET is_active = false WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "خطأ في حذف المورد" });
    }
  });

  // ============ Units API Routes ============
  app.get("/api/units", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`SELECT * FROM units WHERE is_active = true ORDER BY name_ar`);
      res.json(result.rows || []);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.json([]);
    }
  });

  app.post("/api/units", requireAuth, async (req, res) => {
    try {
      const { name, name_ar, symbol, conversion_factor } = req.body;
      const result = await db.execute(sql`
        INSERT INTO units (name, name_ar, symbol, conversion_factor)
        VALUES (${name}, ${name_ar}, ${symbol}, ${parseFloat(conversion_factor) || 1})
        RETURNING *
      `);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Error creating unit:", error);
      res.status(500).json({ message: "خطأ في إنشاء الوحدة" });
    }
  });

  app.put("/api/units/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const { name, name_ar, symbol, conversion_factor } = req.body;
      const result = await db.execute(sql`
        UPDATE units 
        SET name = ${name}, name_ar = ${name_ar}, symbol = ${symbol}, 
            conversion_factor = ${parseFloat(conversion_factor) || 1}
        WHERE id = ${id}
        RETURNING *
      `);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Error updating unit:", error);
      res.status(500).json({ message: "خطأ في تحديث الوحدة" });
    }
  });

  app.delete("/api/units/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await db.execute(sql`UPDATE units SET is_active = false WHERE id = ${id}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting unit:", error);
      res.status(500).json({ message: "خطأ في حذف الوحدة" });
    }
  });

  // ============ Excel Import/Export API Routes ============
  
  // تصدير الأصناف إلى Excel
  app.get("/api/warehouse/export/items", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT inv.id, itm.name, itm.name_ar, itm.code, inv.unit, COALESCE(cat.name_ar, cat.name) as category, inv.current_stock, inv.min_stock, inv.max_stock
        FROM inventory inv
        JOIN items itm ON inv.item_id = itm.id
        LEFT JOIN categories cat ON itm.category_id = cat.id
        WHERE itm.status = 'active' ORDER BY itm.name_ar
      `);
      
      const wb = new ExcelJS.Workbook();
      addJsonSheet(wb, result.rows || [], "الأصناف");
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      res.setHeader("Content-Disposition", "attachment; filename=inventory_items.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting items:", error);
      res.status(500).json({ message: "خطأ في تصدير الأصناف" });
    }
  });

  // تصدير الموردين إلى Excel
  app.get("/api/warehouse/export/suppliers", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, name, name_ar, phone, email, address, contact_person
        FROM suppliers WHERE is_active = true ORDER BY name_ar
      `);
      
      const wb = new ExcelJS.Workbook();
      addJsonSheet(wb, result.rows || [], "الموردين");
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      res.setHeader("Content-Disposition", "attachment; filename=suppliers.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting suppliers:", error);
      res.status(500).json({ message: "خطأ في تصدير الموردين" });
    }
  });

  // تصدير سندات الإدخال/الإخراج إلى Excel - باستخدام استعلامات آمنة
  app.get("/api/warehouse/export/vouchers/:type", requireAuth, async (req, res) => {
    try {
      const type = req.params.type;
      let result;
      let sheetName = "";
      
      switch(type) {
        case "raw-material-in":
          result = await db.execute(sql`SELECT * FROM raw_material_vouchers_in ORDER BY created_at DESC`);
          sheetName = "سندات إدخال مواد خام";
          break;
        case "raw-material-out":
          result = await db.execute(sql`SELECT * FROM raw_material_vouchers_out ORDER BY created_at DESC`);
          sheetName = "سندات إخراج مواد خام";
          break;
        case "finished-goods-in":
          result = await db.execute(sql`SELECT * FROM finished_goods_vouchers_in ORDER BY created_at DESC`);
          sheetName = "سندات استلام مواد تامة";
          break;
        case "finished-goods-out":
          result = await db.execute(sql`SELECT * FROM finished_goods_vouchers_out ORDER BY created_at DESC`);
          sheetName = "سندات إخراج مواد تامة";
          break;
        default:
          return res.status(400).json({ message: "نوع السند غير صحيح" });
      }
      
      const wb = new ExcelJS.Workbook();
      addJsonSheet(wb, result.rows || [], sheetName);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      res.setHeader("Content-Disposition", `attachment; filename=${type}_vouchers.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Error exporting vouchers:", error);
      res.status(500).json({ message: "خطأ في تصدير السندات" });
    }
  });

  // استيراد أرصدة افتتاحية من Excel
  app.post("/api/warehouse/import/opening-balance", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم رفع ملف" });
      }

      const data = await parseExcelBuffer(req.file.buffer);

      let imported = 0;
      let errors: string[] = [];

      for (const row of data) {
        try {
          const code = row["الكود"] || row["code"] || row["Code"];
          const quantity = parseFloat(row["الكمية"] || row["quantity"] || row["Quantity"] || 0);
          const unitCost = parseFloat(row["سعر_الوحدة"] || row["unit_cost"] || row["UnitCost"] || 0);

          if (!code) {
            errors.push(`سطر بدون كود صنف`);
            continue;
          }

          await db.execute(sql`
            UPDATE inventory 
            SET current_stock = ${quantity}, cost_per_unit = ${unitCost}, last_updated = NOW()
            WHERE item_id = ${code}
          `);
          imported++;
        } catch (err: any) {
          errors.push(`خطأ في الصنف ${row["الكود"] || row["code"]}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        message: `تم استيراد ${imported} صنف بنجاح`,
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Error importing opening balance:", error);
      res.status(500).json({ message: "خطأ في استيراد الأرصدة الافتتاحية" });
    }
  });

  // استيراد موردين من Excel
  app.post("/api/warehouse/import/suppliers", requireAuth, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم رفع ملف" });
      }

      const data = await parseExcelBuffer(req.file.buffer);

      let imported = 0;
      let errors: string[] = [];

      for (const row of data) {
        try {
          const name = row["الاسم_انجليزي"] || row["name"] || row["Name"] || "";
          const name_ar = row["الاسم_عربي"] || row["name_ar"] || row["NameAr"] || "";
          const phone = row["الهاتف"] || row["phone"] || row["Phone"] || null;
          const email = row["البريد"] || row["email"] || row["Email"] || null;
          const address = row["العنوان"] || row["address"] || row["Address"] || null;
          const contact_person = row["جهة_الاتصال"] || row["contact_person"] || row["ContactPerson"] || null;

          if (!name_ar) {
            errors.push(`سطر بدون اسم مورد`);
            continue;
          }

          await db.execute(sql`
            INSERT INTO suppliers (name, name_ar, phone, email, address, contact_person)
            VALUES (${name}, ${name_ar}, ${phone}, ${email}, ${address}, ${contact_person})
          `);
          imported++;
        } catch (err: any) {
          errors.push(`خطأ في المورد ${row["الاسم_عربي"] || row["name_ar"]}: ${err.message}`);
        }
      }

      res.json({
        success: true,
        message: `تم استيراد ${imported} مورد بنجاح`,
        imported,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error: any) {
      console.error("Error importing suppliers:", error);
      res.status(500).json({ message: "خطأ في استيراد الموردين" });
    }
  });

  // تحميل قالب Excel فارغ
  app.get("/api/warehouse/template/:type", requireAuth, async (req, res) => {
    try {
      const type = req.params.type;
      let headers: string[] = [];
      let sheetName = "";
      
      switch(type) {
        case "opening-balance":
          headers = ["الكود", "الكمية", "سعر_الوحدة"];
          sheetName = "أرصدة افتتاحية";
          break;
        case "suppliers":
          headers = ["الاسم_عربي", "الاسم_انجليزي", "الهاتف", "البريد", "العنوان", "جهة_الاتصال"];
          sheetName = "الموردين";
          break;
        case "items":
          headers = ["الكود", "الاسم_عربي", "الاسم_انجليزي", "الباركود", "الوحدة", "التصنيف", "الحد_الأدنى", "الحد_الأقصى"];
          sheetName = "الأصناف";
          break;
        default:
          return res.status(400).json({ message: "نوع القالب غير صحيح" });
      }
      
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet(sheetName);
      ws.addRow(headers);
      const buffer = Buffer.from(await wb.xlsx.writeBuffer());
      res.setHeader("Content-Disposition", `attachment; filename=${type}_template.xlsx`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);
    } catch (error) {
      console.error("Error generating template:", error);
      res.status(500).json({ message: "خطأ في إنشاء القالب" });
    }
  });

  // ============ Warehouse Reports API Routes ============
  
  // تقرير حركات المخزون - باستخدام استعلامات معلمة آمنة
  app.get("/api/warehouse/reports/movements", requireAuth, async (req, res) => {
    try {
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : null;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : null;
      const itemId = typeof req.query.itemId === 'string' ? parseInt(req.query.itemId) : null;
      const movementType = typeof req.query.type === 'string' && ['in', 'out'].includes(req.query.type) ? req.query.type : null;
      
      const result = await db.execute(sql`
        SELECT 
          im.id,
          im.inventory_id,
          im.movement_type,
          im.quantity,
          im.reference_type,
          im.reference_number,
          im.notes,
          im.created_at,
          itm.name_ar as item_name,
          itm.code as item_code
        FROM inventory_movements im
        LEFT JOIN inventory inv ON im.inventory_id = inv.id
        LEFT JOIN items itm ON inv.item_id = itm.id
        WHERE 1=1
          AND (${startDate}::date IS NULL OR im.created_at >= ${startDate}::date)
          AND (${endDate}::date IS NULL OR im.created_at <= ${endDate}::date)
          AND (${itemId}::int IS NULL OR im.inventory_id = ${itemId})
          AND (${movementType}::text IS NULL OR im.movement_type = ${movementType})
        ORDER BY im.created_at DESC
        LIMIT 500
      `);
      res.json(result.rows || []);
    } catch (error) {
      console.error("Error fetching movements report:", error);
      res.status(500).json({ message: "خطأ في جلب تقرير الحركات" });
    }
  });

  // تقرير الأرصدة الحالية - باستخدام استعلامات معلمة آمنة
  app.get("/api/warehouse/reports/stock-levels", requireAuth, async (req, res) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : null;
      const belowMinimum = req.query.belowMinimum === "true";
      
      const result = await db.execute(sql`
        SELECT 
          inv.id,
          itm.code,
          itm.name_ar,
          itm.name,
          itm.category_id as category,
          inv.unit,
          inv.current_stock,
          inv.min_stock,
          inv.max_stock,
          inv.cost_per_unit as unit_cost,
          (inv.current_stock * COALESCE(inv.cost_per_unit, 0)) as total_value,
          CASE 
            WHEN inv.current_stock <= inv.min_stock THEN 'low'
            WHEN inv.current_stock >= inv.max_stock THEN 'high'
            ELSE 'normal'
          END as stock_status
        FROM inventory inv
        JOIN items itm ON inv.item_id = itm.id
        WHERE itm.status = 'active'
          AND (${category}::text IS NULL OR itm.category_id = ${category})
          AND (${belowMinimum} = false OR inv.current_stock <= inv.min_stock)
        ORDER BY itm.name_ar
      `);
      res.json(result.rows || []);
    } catch (error) {
      console.error("Error fetching stock levels report:", error);
      res.status(500).json({ message: "خطأ في جلب تقرير الأرصدة" });
    }
  });

  // تقرير التنبيهات (أصناف تحت الحد الأدنى)
  app.get("/api/warehouse/reports/alerts", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          inv.id,
          itm.code,
          itm.name_ar,
          itm.name,
          itm.category_id as category,
          inv.unit,
          inv.current_stock,
          inv.min_stock,
          (inv.min_stock - inv.current_stock) as shortage
        FROM inventory inv
        JOIN items itm ON inv.item_id = itm.id
        WHERE itm.status = 'active' AND inv.current_stock < inv.min_stock
        ORDER BY (inv.min_stock - inv.current_stock) DESC
      `);
      res.json(result.rows || []);
    } catch (error) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "خطأ في جلب التنبيهات" });
    }
  });

  // ملخص إحصائيات المستودع
  app.get("/api/warehouse/reports/summary", requireAuth, async (req, res) => {
    try {
      const [itemsCount, suppliersCount, lowStockCount, totalValue] = await Promise.all([
        db.execute(sql`SELECT COUNT(*) as count FROM inventory inv JOIN items itm ON inv.item_id = itm.id WHERE itm.status = 'active'`),
        db.execute(sql`SELECT COUNT(*) as count FROM suppliers WHERE is_active = true`),
        db.execute(sql`SELECT COUNT(*) as count FROM inventory inv JOIN items itm ON inv.item_id = itm.id WHERE itm.status = 'active' AND inv.current_stock < inv.min_stock`),
        db.execute(sql`SELECT COALESCE(SUM(inv.current_stock * COALESCE(inv.cost_per_unit, 0)), 0) as total FROM inventory inv JOIN items itm ON inv.item_id = itm.id WHERE itm.status = 'active'`)
      ]);
      
      res.json({
        totalItems: (itemsCount.rows[0] as any)?.count || 0,
        totalSuppliers: (suppliersCount.rows[0] as any)?.count || 0,
        lowStockItems: (lowStockCount.rows[0] as any)?.count || 0,
        totalInventoryValue: (totalValue.rows[0] as any)?.total || 0
      });
    } catch (error) {
      console.error("Error fetching warehouse summary:", error);
      res.status(500).json({ message: "خطأ في جلب ملخص المستودع" });
    }
  });

  // ==========================================
  // Notification Event Settings API
  // ==========================================

  // Get all notification event settings
  app.get("/api/notification-event-settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getAllNotificationEventSettings();
      res.json({ data: settings, success: true });
    } catch (error) {
      console.error("Error fetching notification event settings:", error);
      res.status(500).json({ message: "خطأ في جلب إعدادات أحداث الإشعارات", success: false });
    }
  });

  // Get notification event setting by ID
  app.get("/api/notification-event-settings/:id", requireAuth, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const setting = await storage.getNotificationEventSettingById(id);
      if (!setting) {
        return res.status(404).json({ message: "إعداد الحدث غير موجود", success: false });
      }
      res.json({ data: setting, success: true });
    } catch (error) {
      console.error("Error fetching notification event setting:", error);
      res.status(500).json({ message: "خطأ في جلب إعداد الحدث", success: false });
    }
  });

  // Create notification event setting
  app.post("/api/notification-event-settings", requireAuth, requireAdmin, async (req, res) => {
    try {
      const userId = req.user?.id;
      const settingData = { ...req.body, created_by: userId };
      const setting = await storage.createNotificationEventSetting(settingData);
      res.status(201).json({ data: setting, message: "تم إنشاء إعداد الحدث بنجاح", success: true });
    } catch (error) {
      console.error("Error creating notification event setting:", error);
      res.status(500).json({ message: "خطأ في إنشاء إعداد الحدث", success: false });
    }
  });

  // Update notification event setting
  app.patch("/api/notification-event-settings/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const userId = req.user?.id;
      const updates = { ...req.body, updated_by: userId };
      const setting = await storage.updateNotificationEventSetting(id, updates);
      res.json({ data: setting, message: "تم تحديث إعداد الحدث بنجاح", success: true });
    } catch (error) {
      console.error("Error updating notification event setting:", error);
      res.status(500).json({ message: "خطأ في تحديث إعداد الحدث", success: false });
    }
  });

  // Delete notification event setting
  app.delete("/api/notification-event-settings/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      await storage.deleteNotificationEventSetting(id);
      res.json({ message: "تم حذف إعداد الحدث بنجاح", success: true });
    } catch (error) {
      console.error("Error deleting notification event setting:", error);
      res.status(500).json({ message: "خطأ في حذف إعداد الحدث", success: false });
    }
  });

  // Get notification event logs
  app.get("/api/notification-event-logs", requireAuth, async (req, res) => {
    try {
      const { limit, offset, eventKey, status } = req.query;
      const logs = await storage.getNotificationEventLogs({
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
        eventKey: eventKey as string,
        status: status as string,
      });
      res.json({ data: logs, success: true });
    } catch (error) {
      console.error("Error fetching notification event logs:", error);
      res.status(500).json({ message: "خطأ في جلب سجلات الإشعارات", success: false });
    }
  });

  // Test notification sending
  app.post("/api/notification-event-settings/:id/test", requireAuth, requireAdmin, async (req, res) => {
    try {
      const id = parseRouteParam(req.params.id, "id");
      const setting = await storage.getNotificationEventSettingById(id);
      if (!setting) {
        return res.status(404).json({ message: "إعداد الحدث غير موجود", success: false });
      }

      // Get test data from request body
      const { phone_number, test_variables } = req.body;
      
      if (!phone_number) {
        return res.status(400).json({ message: "رقم الهاتف مطلوب للاختبار", success: false });
      }

      // Create log entry for the test
      const log = await storage.createNotificationEventLog({
        event_setting_id: id,
        event_key: setting.event_key,
        trigger_context_type: "test",
        trigger_context_id: "test-" + Date.now(),
        trigger_data: test_variables || {},
        message_sent_ar: setting.message_template_ar,
        recipient_phone: phone_number,
        recipient_user_id: req.user?.id,
        recipient_name: "Test User",
        status: "pending",
      });

      res.json({ 
        data: log, 
        message: "تم إرسال إشعار اختباري بنجاح", 
        success: true 
      });
    } catch (error) {
      console.error("Error testing notification:", error);
      res.status(500).json({ message: "خطأ في إرسال الإشعار الاختباري", success: false });
    }
  });

  // ===============================
  // Face Verification API Endpoints
  // ===============================

  // In-memory storage for face data (in production, use database table)
  const faceDataStore = new Map<number, { hash: string; registeredAt: string }>();

  // Check if user has registered face
  app.get("/api/face-verification/status/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "معرف المستخدم غير صحيح", success: false });
      }
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود", success: false });
      }

      const hasFaceData = faceDataStore.has(userId);
      
      res.json({ 
        hasRegisteredFace: hasFaceData,
        success: true 
      });
    } catch (error) {
      console.error("Error checking face status:", error);
      res.status(500).json({ message: "خطأ في التحقق من حالة البصمة", success: false });
    }
  });

  // Register face for user
  app.post("/api/face-verification/register", requireAuth, async (req, res) => {
    try {
      const { user_id, image } = req.body;
      
      if (!user_id || !image) {
        return res.status(400).json({ message: "بيانات غير مكتملة", success: false });
      }

      const user = await storage.getUserById(user_id);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود", success: false });
      }

      // Create a simple hash of the image for future comparison
      const crypto = require("crypto");
      const imageHash = crypto.createHash("sha256").update(image.substring(0, 1000)).digest("hex");
      
      // Store face data in memory
      faceDataStore.set(user_id, {
        hash: imageHash,
        registeredAt: new Date().toISOString()
      });

      // Log the registration
      logger.info(`Face registered for user ${user_id}`, { 
        userId: user_id, 
        action: "face_register",
        timestamp: new Date().toISOString() 
      });

      res.json({ 
        success: true, 
        message: "تم تسجيل بصمة الوجه بنجاح",
        registered: true 
      });
    } catch (error) {
      console.error("Error registering face:", error);
      res.status(500).json({ message: "خطأ في تسجيل بصمة الوجه", success: false });
    }
  });

  // Verify face for attendance
  app.post("/api/face-verification/verify", requireAuth, async (req, res) => {
    try {
      const { user_id, image, action_type, timestamp } = req.body;
      
      if (!user_id || !image) {
        return res.status(400).json({ 
          message: "بيانات غير مكتملة", 
          success: false,
          verified: false 
        });
      }

      const user = await storage.getUserById(user_id);
      if (!user) {
        return res.status(404).json({ 
          message: "المستخدم غير موجود", 
          success: false,
          verified: false 
        });
      }

      // Check if user has registered face
      const faceData = faceDataStore.get(user_id);
      if (!faceData) {
        return res.status(400).json({ 
          message: "لم يتم تسجيل بصمة الوجه مسبقاً", 
          success: false,
          verified: false 
        });
      }

      // Create hash of current image
      const crypto = require("crypto");
      const currentHash = crypto.createHash("sha256").update(image.substring(0, 1000)).digest("hex");

      // For a real implementation, you would use face recognition AI
      // (AWS Rekognition, Azure Face API, or similar service)
      // Currently using hash-based comparison as a placeholder
      // In production, replace with actual face recognition AI
      
      // Hash comparison - requires exact match for security
      // In production, replace with actual face recognition AI (AWS Rekognition, Azure Face API)
      // Note: This is a demo implementation using hash matching
      // Real face recognition AI would provide similarity scores and liveness detection
      const verified = faceData.hash === currentHash;

      // Log the verification attempt
      logger.info(`Face verification attempt for user ${user_id}`, { 
        userId: user_id, 
        action: "face_verify",
        actionType: action_type,
        verified,
        storedHash: faceData.hash.substring(0, 8),
        currentHash: currentHash.substring(0, 8),
        timestamp 
      });

      if (verified) {
        res.json({ 
          success: true, 
          verified: true,
          message: "تم التحقق من الهوية بنجاح"
        });
      } else {
        res.json({ 
          success: true, 
          verified: false,
          message: "لم يتم التعرف على الوجه - يرجى المحاولة مرة أخرى"
        });
      }
    } catch (error) {
      console.error("Error verifying face:", error);
      res.status(500).json({ 
        message: "خطأ في التحقق من بصمة الوجه", 
        success: false,
        verified: false 
      });
    }
  });

  // Get face verification logs for user
  app.get("/api/face-verification/logs/:userId", requireAuth, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId) || userId <= 0) {
        return res.status(400).json({ message: "معرف المستخدم غير صحيح", success: false });
      }
      // For now, return empty logs - in production, store in database
      res.json({ 
        logs: [],
        success: true 
      });
    } catch (error) {
      console.error("Error fetching face logs:", error);
      res.status(500).json({ message: "خطأ في جلب سجلات التحقق", success: false });
    }
  });

  // ============ Factory 3D Simulation API Routes ============

  // Get active rolls with master batch colors for 3D visualization
  app.get("/api/factory-3d/active-rolls", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          r.id,
          r.roll_number,
          r.stage,
          r.weight_kg,
          r.cut_weight_total_kg,
          r.film_machine_id,
          r.printing_machine_id,
          r.cutting_machine_id,
          r.printed_at,
          r.cut_completed_at,
          r.created_at,
          r.production_order_id,
          po.production_order_number,
          cp.master_batch_id,
          COALESCE(mbc.color_hex, '#808080') as roll_color,
          COALESCE(mbc.name_ar, cp.master_batch_id) as color_name,
          c.name as customer_name
        FROM rolls r
        JOIN production_orders po ON r.production_order_id = po.id
        JOIN customer_products cp ON po.customer_product_id = cp.id
        LEFT JOIN master_batch_colors mbc ON cp.master_batch_id = mbc.id
        JOIN orders o ON po.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        WHERE r.stage IN ('film', 'printing', 'cutting')
        ORDER BY r.created_at DESC
        LIMIT 100
      `);
      
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching active rolls for 3D:", error);
      res.status(500).json({ message: "خطأ في جلب الرولات النشطة" });
    }
  });

  // Get machine production statistics for 3D visualization
  app.get("/api/factory-3d/machine-stats/:machineId", requireAuth, async (req, res) => {
    try {
      const machineId = req.params.machineId;
      
      // Get machine info
      const machineResult = await db.execute(sql`
        SELECT * FROM machines WHERE id = ${machineId}
      `);
      
      if (machineResult.rows.length === 0) {
        return res.status(404).json({ message: "الماكينة غير موجودة" });
      }
      
      const machine = machineResult.rows[0];
      
      // Get today's statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const statsResult = await db.execute(sql`
        SELECT 
          COUNT(*) as rolls_count,
          COALESCE(SUM(weight_kg::numeric), 0) as total_weight_kg,
          COUNT(CASE WHEN stage = 'film' THEN 1 END) as film_rolls,
          COUNT(CASE WHEN stage = 'printing' THEN 1 END) as printing_rolls,
          COUNT(CASE WHEN stage = 'cutting' THEN 1 END) as cutting_rolls,
          COUNT(CASE WHEN stage = 'done' THEN 1 END) as completed_rolls
        FROM rolls 
        WHERE (film_machine_id = ${machineId} 
               OR printing_machine_id = ${machineId} 
               OR cutting_machine_id = ${machineId})
          AND created_at >= ${today}
      `);
      
      // Get recent rolls for this machine
      const recentRollsResult = await db.execute(sql`
        SELECT 
          r.id,
          r.roll_number,
          r.stage,
          r.weight_kg,
          r.created_at,
          r.printed_at,
          r.cut_completed_at,
          po.production_order_number,
          COALESCE(mbc.color_hex, '#808080') as roll_color,
          COALESCE(mbc.name_ar, 'بدون لون') as color_name
        FROM rolls r
        JOIN production_orders po ON r.production_order_id = po.id
        JOIN customer_products cp ON po.customer_product_id = cp.id
        LEFT JOIN master_batch_colors mbc ON cp.master_batch_id = mbc.id
        WHERE r.film_machine_id = ${machineId} 
           OR r.printing_machine_id = ${machineId} 
           OR r.cutting_machine_id = ${machineId}
        ORDER BY r.created_at DESC
        LIMIT 10
      `);
      
      res.json({
        machine,
        todayStats: statsResult.rows[0] || {},
        recentRolls: recentRollsResult.rows
      });
    } catch (error) {
      console.error("Error fetching machine stats for 3D:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات الماكينة" });
    }
  });


  // ============ Factory Layout Save/Load API Routes ============

  app.get("/api/factory-3d/layout", requireAuth, async (req, res) => {
    try {
      const result = await db.select().from(factory_layouts).where(eq(factory_layouts.name, "default")).limit(1);
      if (result.length > 0) {
        res.json(result[0]);
      } else {
        res.json(null);
      }
    } catch (error) {
      console.error("Error loading factory layout:", error);
      res.status(500).json({ message: "خطأ في تحميل تخطيط المصنع" });
    }
  });

  app.post("/api/factory-3d/layout", requireAuth, async (req, res) => {
    try {
      const { machines } = req.body;
      if (!machines || !Array.isArray(machines)) {
        return res.status(400).json({ message: "بيانات غير صالحة" });
      }
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;

      const existing = await db.select().from(factory_layouts).where(eq(factory_layouts.name, "default")).limit(1);

      if (existing.length > 0) {
        await db.update(factory_layouts)
          .set({ layout_data: machines, updated_at: new Date(), updated_by: userId })
          .where(eq(factory_layouts.id, existing[0].id));
      } else {
        await db.insert(factory_layouts).values({
          name: "default",
          layout_data: machines,
          updated_by: userId,
        });
      }

      res.json({ success: true, message: "تم حفظ التخطيط بنجاح" });
    } catch (error) {
      console.error("Error saving factory layout:", error);
      res.status(500).json({ message: "خطأ في حفظ تخطيط المصنع" });
    }
  });

  // ============ Factory Snapshots ============
  
  app.get("/api/factory-3d/snapshots", requireAuth, async (req, res) => {
    try {
      const snapshots = await storage.getFactorySnapshots();
      res.json(snapshots);
    } catch (error) {
      console.error("Error loading snapshots:", error);
      res.status(500).json({ message: "خطأ في تحميل اللقطات" });
    }
  });

  app.get("/api/factory-3d/snapshots/share/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token) return res.status(400).json({ message: "رمز المشاركة مطلوب" });
      const snapshot = await storage.getFactorySnapshotByToken(token);
      if (!snapshot) return res.status(404).json({ message: "اللقطة غير موجودة" });
      res.json(snapshot);
    } catch (error) {
      console.error("Error loading shared snapshot:", error);
      res.status(500).json({ message: "خطأ في تحميل اللقطة المشتركة" });
    }
  });

  app.get("/api/factory-3d/snapshots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
      const snapshot = await storage.getFactorySnapshot(id);
      if (!snapshot) return res.status(404).json({ message: "اللقطة غير موجودة" });
      res.json(snapshot);
    } catch (error) {
      console.error("Error loading snapshot:", error);
      res.status(500).json({ message: "خطأ في تحميل اللقطة" });
    }
  });

  app.post("/api/factory-3d/snapshots", requireAuth, async (req, res) => {
    try {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.id;
      
      const parsed = insertFactorySnapshotSchema.parse({
        ...req.body,
        created_by: userId,
        share_token: require('crypto').randomBytes(24).toString('hex'),
      });
      
      const snapshot = await storage.createFactorySnapshot(parsed);
      res.status(201).json(snapshot);
    } catch (error) {
      console.error("Error creating snapshot:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في إنشاء اللقطة" });
    }
  });

  app.delete("/api/factory-3d/snapshots/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "معرف غير صالح" });
      await storage.deleteFactorySnapshot(id);
      res.json({ success: true, message: "تم حذف اللقطة بنجاح" });
    } catch (error) {
      console.error("Error deleting snapshot:", error);
      res.status(500).json({ message: "خطأ في حذف اللقطة" });
    }
  });

  // Get all active machines from database for 3D factory
  app.get("/api/factory-3d/machines", requireAuth, async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT id, name, name_ar, type, section_id, status,
               capacity_small_kg_per_hour, capacity_medium_kg_per_hour, capacity_large_kg_per_hour,
               screw_type
        FROM machines 
        WHERE status = 'active'
        ORDER BY section_id, id
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching active machines for 3D:", error);
      res.status(500).json({ message: "خطأ في جلب المكائن النشطة" });
    }
  });

  // Get last 5 production orders for a specific machine
  app.get("/api/factory-3d/machine-orders/:machineId", requireAuth, async (req, res) => {
    try {
      const machineId = req.params.machineId;
      const result = await db.execute(sql`
        SELECT 
          po.id,
          po.production_order_number,
          po.quantity_kg,
          po.produced_quantity_kg,
          po.status,
          po.film_completed,
          po.printing_completed,
          po.cutting_completed,
          po.created_at,
          po.production_start_time,
          po.production_end_time,
          o.order_number,
          c.name as customer_name,
          c.name_ar as customer_name_ar,
          cp.size_caption as product_name,
          cp.size_caption as product_name_ar,
          cp.master_batch_id,
          COALESCE(mbc.color_hex, '#808080') as color_hex,
          COALESCE(mbc.name_ar, '') as color_name_ar,
          (SELECT COUNT(*) FROM rolls r WHERE r.production_order_id = po.id) as rolls_count,
          (SELECT COALESCE(SUM(r.weight_kg::numeric), 0) FROM rolls r WHERE r.production_order_id = po.id) as total_rolls_weight
        FROM production_orders po
        JOIN orders o ON po.order_id = o.id
        JOIN customers c ON o.customer_id = c.id
        JOIN customer_products cp ON po.customer_product_id = cp.id
        LEFT JOIN master_batch_colors mbc ON cp.master_batch_id = mbc.id
        WHERE po.assigned_machine_id = ${machineId}
           OR po.id IN (
             SELECT DISTINCT r.production_order_id FROM rolls r 
             WHERE r.film_machine_id = ${machineId} 
                OR r.printing_machine_id = ${machineId} 
                OR r.cutting_machine_id = ${machineId}
           )
        ORDER BY po.created_at DESC
        LIMIT 5
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching machine orders for 3D:", error);
      res.status(500).json({ message: "خطأ في جلب أوامر الإنتاج" });
    }
  });

  // Get production users with today's attendance status
  app.get("/api/factory-3d/production-users", requireAuth, async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const result = await db.execute(sql`
        SELECT 
          u.id,
          u.display_name,
          u.display_name_ar,
          u.full_name,
          u.role_id,
          u.section_id,
          r.name as role_name,
          r.name_ar as role_name_ar,
          a.status as attendance_status,
          a.check_in_time,
          a.break_start_time,
          a.break_end_time,
          a.lunch_start_time,
          a.lunch_end_time
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN attendance a ON a.user_id = u.id AND a.check_in_time >= ${today}
        WHERE u.role_id IN (2, 3, 4, 6) 
          AND u.status = 'active'
        ORDER BY u.role_id, u.id
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching production users for 3D:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الموظفين" });
    }
  });

  // ============ Display Screen API Routes ============

  app.get("/api/display/slides", requireAuth, async (req, res) => {
    try {
      const slides = await storage.getDisplaySlides();
      res.json(slides);
    } catch (error) {
      console.error("Error fetching display slides:", error);
      res.status(500).json({ message: "خطأ في جلب شرائح العرض" });
    }
  });

  app.get("/api/display/slides/active", async (req, res) => {
    try {
      const slides = await storage.getActiveDisplaySlides();
      res.json(slides);
    } catch (error) {
      console.error("Error fetching active display slides:", error);
      res.status(500).json({ message: "خطأ في جلب شرائح العرض النشطة" });
    }
  });

  app.post("/api/display/slides", requireAuth, async (req: AuthRequest, res) => {
    try {
      const slide = await storage.createDisplaySlide({
        ...req.body,
        created_by: getAuthUserId(req),
      });
      res.json(slide);
    } catch (error) {
      console.error("Error creating display slide:", error);
      res.status(500).json({ message: "خطأ في إنشاء شريحة العرض" });
    }
  });

  app.put("/api/display/slides/reorder", requireAuth, async (req, res) => {
    try {
      const slideOrderSchema = z.array(z.object({
        id: z.number().int().positive(),
        sort_order: z.number().int().min(0),
      }));
      const parseResult = slideOrderSchema.safeParse(req.body?.slideOrders);
      if (!parseResult.success) {
        return res.status(400).json({ message: "بيانات الترتيب غير صحيحة" });
      }
      for (const item of parseResult.data) {
        await storage.updateDisplaySlide(item.id, { sort_order: item.sort_order });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering display slides:", error);
      res.status(500).json({ message: "خطأ في إعادة ترتيب الشرائح" });
    }
  });

  app.put("/api/display/slides/:id", requireAuth, async (req, res) => {
    try {
      const slide = await storage.updateDisplaySlide(parseRouteParam(req.params.id, "id"), req.body);
      res.json(slide);
    } catch (error) {
      console.error("Error updating display slide:", error);
      res.status(500).json({ message: "خطأ في تحديث شريحة العرض" });
    }
  });

  app.delete("/api/display/slides/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteDisplaySlide(parseRouteParam(req.params.id, "id"));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting display slide:", error);
      res.status(500).json({ message: "خطأ في حذف شريحة العرض" });
    }
  });

  app.get("/api/display/live/recent-production", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT po.id, po.production_order_number, po.status, po.quantity_kg, po.produced_quantity_kg,
               po.film_completion_percentage, COALESCE(cp.size_caption, '') as size_caption,
               o.order_number, c.name as customer_name, c.name_ar as customer_name_ar
        FROM production_orders po
        LEFT JOIN orders o ON po.order_id = o.id
        LEFT JOIN customers c ON o.customer_id = c.id
        LEFT JOIN customer_products cp ON po.customer_product_id = cp.id
        ORDER BY po.created_at DESC
        LIMIT 10
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching recent production:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الإنتاج" });
    }
  });

  app.get("/api/display/live/latest-rolls", async (req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT r.id, r.roll_number, r.weight_kg, r.status, r.created_at,
               m.name as machine_name, m.name_ar as machine_name_ar,
               po.production_order_number, COALESCE(cp.size_caption, '') as size_caption
        FROM rolls r
        LEFT JOIN machines m ON r.machine_id = m.id
        LEFT JOIN production_orders po ON r.production_order_id = po.id
        LEFT JOIN customer_products cp ON po.customer_product_id = cp.id
        ORDER BY r.created_at DESC
        LIMIT 8
      `);
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching latest rolls:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات اللفات" });
    }
  });

  app.get("/api/display/live/production-stats", async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const result = await db.execute(sql`
        SELECT 
          COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'in_progress') as active_orders,
          COUNT(r.id) FILTER (WHERE r.created_at >= ${today}) as rolls_today,
          COALESCE(SUM(r.weight_kg) FILTER (WHERE r.created_at >= ${today}), 0) as production_kg_today,
          COUNT(DISTINCT po.id) FILTER (WHERE po.status = 'completed' AND po.production_end_time >= ${today}) as completed_today
        FROM production_orders po
        LEFT JOIN rolls r ON r.production_order_id = po.id
      `);
      res.json(result.rows?.[0] || {});
    } catch (error) {
      console.error("Error fetching production stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات الإنتاج" });
    }
  });

  app.get("/api/display/live/attendance", async (req, res) => {
    try {
      const dateParam = req.query.date as string || new Date().toISOString().split('T')[0];
      const result = await db.execute(sql`
        SELECT a.id, a.user_id, a.status, a.check_in_time, a.check_out_time,
               a.work_hours, a.late_minutes, a.shift_type, a.date,
               u.full_name, u.username
        FROM attendance a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE a.date = ${dateParam}
        ORDER BY a.check_in_time ASC NULLS LAST
      `);
      const totalPresent = result.rows.filter((r: any) => r.status === 'حاضر' || r.status === 'present').length;
      const totalAbsent = result.rows.filter((r: any) => r.status === 'غائب' || r.status === 'absent').length;
      res.json({ records: result.rows, totalPresent, totalAbsent, total: result.rows.length, date: dateParam });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات الحضور" });
    }
  });

  app.get("/api/display/live/top-producers", async (req, res) => {
    try {
      const period = (req.query.period as string) || "today";
      const stage = (req.query.stage as string) || "all";

      let dateFilter = sql``;
      const now = new Date();
      if (period === "today") {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        dateFilter = sql`AND r.created_at >= ${today}`;
      } else if (period === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = sql`AND r.created_at >= ${weekAgo}`;
      } else if (period === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFilter = sql`AND r.created_at >= ${monthAgo}`;
      }

      const sections = stage === "all" ? ["film", "printing", "cutting"] : [stage];
      const results: Record<string, any[]> = {};

      for (const sec of sections) {
        let userCol = sql`r.created_by`;
        if (sec === "printing") userCol = sql`r.printed_by`;
        else if (sec === "cutting") userCol = sql`r.cut_by`;

        const query = sql`
          SELECT ${userCol} as user_id, u.full_name, u.username,
                 COUNT(r.id) as roll_count,
                 COALESCE(SUM(r.weight_kg), 0) as total_weight_kg
          FROM rolls r
          LEFT JOIN users u ON ${userCol} = u.id
          WHERE ${userCol} IS NOT NULL ${dateFilter}
          GROUP BY ${userCol}, u.full_name, u.username
          ORDER BY total_weight_kg DESC
          LIMIT 10
        `;
        const result = await db.execute(query);
        results[sec] = result.rows;
      }

      res.json({ period, stage, sections: results });
    } catch (error) {
      console.error("Error fetching top producers:", error);
      res.status(500).json({ message: "خطأ في جلب بيانات أفضل المنتجين" });
    }
  });

  app.post("/api/display/upload-image", requireAuth, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم رفع صورة" });
      }
      const { ObjectStorageService, objectStorageClient } = await import("./replit_integrations/object_storage");
      const storageService = new ObjectStorageService();
      const ext = req.file.originalname.split('.').pop() || 'jpg';
      const fileName = `display-slides/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const publicPaths = storageService.getPublicObjectSearchPaths();
      const basePath = publicPaths[0];
      const fullPath = `${basePath}/${fileName}`;

      const normalizedPath = fullPath.startsWith('/') ? fullPath : `/${fullPath}`;
      const pathParts = normalizedPath.split('/');
      const bucketName = pathParts[1];
      const objectPath = pathParts.slice(2).join('/');
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectPath);
      await file.save(req.file.buffer, { contentType: req.file.mimetype });

      const publicUrl = `/objects/${objectPath}`;
      res.json({ url: publicUrl, fileName });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "خطأ في رفع الصورة" });
    }
  });

  // ==========================================
  // Mobile API - Token-based Authentication
  // ==========================================

  app.post("/api/mobile/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username?.trim() || !password?.trim()) {
        return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      }

      const user = await storage.getUserByUsername(username.trim());
      if (!user || !user.password) {
        return res.status(401).json({ message: "بيانات تسجيل الدخول غير صحيحة" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid || user.status !== "active") {
        return res.status(401).json({ message: "بيانات تسجيل الدخول غير صحيحة" });
      }

      let roleName = "user";
      let roleNameAr = "مستخدم";
      let permissions: string[] = [];

      if (user.role_id) {
        const roles = await getCachedRoles();
        const userRole = roles.find(r => r.id === user.role_id);
        if (userRole) {
          roleName = userRole.name || "user";
          roleNameAr = userRole.name_ar || "مستخدم";
          if (userRole.permissions) {
            try {
              if (Array.isArray(userRole.permissions)) {
                permissions = userRole.permissions;
              } else if (typeof userRole.permissions === "string") {
                const parsed = JSON.parse(userRole.permissions);
                permissions = Array.isArray(parsed) ? parsed : [];
              }
            } catch {
              permissions = [];
            }
          }
        }
      }

      if (roleName.toLowerCase() === "admin" && !permissions.includes("admin")) {
        permissions.push("admin");
      }

      const token = generateMobileToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username ?? "",
          display_name: user.display_name ?? "",
          display_name_ar: user.display_name_ar ?? "",
          role_id: user.role_id ?? null,
          role_name: roleName,
          role_name_ar: roleNameAr,
          section_id: user.section_id ?? null,
          permissions,
        },
      });
    } catch (error) {
      logger.error("Mobile login error", error);
      res.status(500).json({ message: "خطأ في تسجيل الدخول" });
    }
  });

  app.post("/api/mobile/logout", requireAuth, (req: AuthRequest, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      revokeMobileToken(authHeader.slice(7));
    }
    res.json({ message: "تم تسجيل الخروج بنجاح" });
  });

  app.get("/api/mobile/status", (_req, res) => {
    res.json({
      status: "online",
      version: "1.0.0",
      features: [
        "production_monitoring",
        "orders",
        "quality_control",
        "maintenance",
        "attendance",
        "notifications",
      ],
    });
  });

  const httpServer = existingServer || createServer(app);
  return httpServer;
}
