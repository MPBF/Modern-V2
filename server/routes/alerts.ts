import { Router } from "express";
import type { IStorage } from "../storage";
import { getAlertManager } from "../services/alert-manager";
import { getSystemHealthMonitor } from "../services/system-health-monitor";
import { getDataValidator } from "../services/data-validator";
import { z } from "zod";

export function createAlertsRouter(storage: IStorage) {
  const router = Router();
  const alertManager = getAlertManager(storage);
  const healthMonitor = getSystemHealthMonitor(storage);
  const dataValidator = getDataValidator(storage);

  // جلب جميع التحذيرات مع الفلاتر
  router.get("/", async (req, res) => {
    try {
      const filters = {
        status: req.query.status as string,
        type: req.query.type as string,
        severity: req.query.severity as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const alerts = await storage.getSystemAlerts(filters);
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching alerts:", error);
      res.status(500).json({ message: "خطأ في جلب التحذيرات" });
    }
  });

  // جلب تحذير محدد
  router.get("/:id", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      if (isNaN(alertId) || alertId <= 0) {
        return res.status(400).json({ message: "معرف التحذير غير صحيح" });
      }
      const alert = await storage.getSystemAlertById(alertId);

      if (!alert) {
        return res.status(404).json({ message: "التحذير غير موجود" });
      }

      res.json(alert);
    } catch (error: any) {
      console.error("Error fetching alert:", error);
      res.status(500).json({ message: "خطأ في جلب التحذير" });
    }
  });

  // إنشاء تحذير جديد
  router.post("/", async (req, res) => {
    try {
      const alertData = req.body;

      // التحقق من البيانات
      const alertSchema = z.object({
        title: z.string().min(1),
        title_ar: z.string().min(1),
        message: z.string().min(1),
        message_ar: z.string().min(1),
        type: z.string(),
        category: z.string(),
        severity: z.string(),
        source: z.string(),
        source_id: z.string().optional(),
        context_data: z.record(z.any()).optional(),
        suggested_actions: z
          .array(
            z.object({
              action: z.string(),
              priority: z.number(),
              description: z.string().optional(),
            }),
          )
          .optional(),
        target_users: z.array(z.number()).optional(),
        target_roles: z.array(z.number()).optional(),
        requires_action: z.boolean().optional(),
      });

      const validatedData = alertSchema.parse(alertData);
      const alert = await alertManager.createAlert(validatedData);

      res.status(201).json(alert);
    } catch (error: any) {
      console.error("Error creating alert:", error);
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ message: "بيانات غير صحيحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في إنشاء التحذير" });
    }
  });

  // حل التحذير
  router.post("/:id/resolve", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      if (isNaN(alertId) || alertId <= 0) {
        return res.status(400).json({ message: "معرف التحذير غير صحيح" });
      }
      const { notes } = req.body;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "غير مسجل الدخول - يرجى تسجيل الدخول أولاً" });
      }

      const alert = await alertManager.resolveAlert(alertId, userId, notes);
      res.json(alert);
    } catch (error: any) {
      console.error("Error resolving alert:", error);
      res.status(500).json({ message: "خطأ في حل التحذير" });
    }
  });

  // إغلاق التحذير
  router.post("/:id/dismiss", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      if (isNaN(alertId) || alertId <= 0) {
        return res.status(400).json({ message: "معرف التحذير غير صحيح" });
      }
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "غير مسجل الدخول - يرجى تسجيل الدخول أولاً" });
      }

      const alert = await alertManager.dismissAlert(alertId, userId);
      res.json(alert);
    } catch (error: any) {
      console.error("Error dismissing alert:", error);
      res.status(500).json({ message: "خطأ في إغلاق التحذير" });
    }
  });

  // جلب إحصائيات التحذيرات
  router.get("/stats", async (req, res) => {
    try {
      const stats = await alertManager.getAlertStatistics();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching alert stats:", error);
      res.status(500).json({ message: "خطأ في جلب إحصائيات التحذيرات" });
    }
  });

  // جلب التحذيرات حسب النوع
  router.get("/type/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const alerts = await storage.getAlertsByType(type);
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching alerts by type:", error);
      res.status(500).json({ message: "خطأ في جلب التحذيرات حسب النوع" });
    }
  });

  // جلب التحذيرات للمستخدم الحالي
  router.get("/user/me", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "غير مسجل الدخول - يرجى تسجيل الدخول أولاً" });
      }
      
      const alerts = await storage.getAlertsByUser(userId);
      res.json(alerts);
    } catch (error: any) {
      console.error("Error fetching user alerts:", error);
      res.status(500).json({ message: "خطأ في جلب تحذيرات المستخدم" });
    }
  });

  // إنشاء قاعدة تحذير جديدة
  router.post("/rules", async (req, res) => {
    try {
      const ruleData = req.body;
      const userId = (req as any).user?.id;
      
      if (!userId) {
        return res.status(401).json({ message: "غير مسجل الدخول - يرجى تسجيل الدخول أولاً" });
      }

      const rule = await alertManager.createAlertRule({
        ...ruleData,
        created_by: userId,
      });

      res.status(201).json(rule);
    } catch (error: any) {
      console.error("Error creating alert rule:", error);
      res.status(500).json({ message: "خطأ في إنشاء قاعدة التحذير" });
    }
  });

  // جلب قواعد التحذيرات
  router.get("/rules", async (req, res) => {
    try {
      const isEnabled =
        req.query.enabled === "true"
          ? true
          : req.query.enabled === "false"
            ? false
            : undefined;

      const rules = await storage.getAlertRules(isEnabled);
      res.json(rules);
    } catch (error: any) {
      console.error("Error fetching alert rules:", error);
      res.status(500).json({ message: "خطأ في جلب قواعد التحذيرات" });
    }
  });

  return router;
}

export function createSystemHealthRouter(storage: IStorage) {
  const router = Router();
  const healthMonitor = getSystemHealthMonitor(storage);

  // جلب نظرة عامة على حالة النظام
  router.get("/overview", async (req, res) => {
    try {
      const overview = await storage.getSystemHealthStatus();
      res.json(overview);
    } catch (error: any) {
      console.error("Error fetching system health overview:", error);
      res.status(500).json({ message: "خطأ في جلب نظرة عامة على حالة النظام" });
    }
  });

  // جلب فحوصات السلامة
  router.get("/checks", async (req, res) => {
    try {
      const checks = await storage.getSystemHealthChecks();
      res.json(checks);
    } catch (error: any) {
      console.error("Error fetching health checks:", error);
      res.status(500).json({ message: "خطأ في جلب فحوصات السلامة" });
    }
  });

  // جلب فحوصات السلامة حسب النوع
  router.get("/checks/type/:type", async (req, res) => {
    try {
      const type = req.params.type;
      const checks = await storage.getHealthChecksByType(type);
      res.json(checks);
    } catch (error: any) {
      console.error("Error fetching health checks by type:", error);
      res.status(500).json({ message: "خطأ في جلب فحوصات السلامة حسب النوع" });
    }
  });

  // جلب الفحوصات الحرجة
  router.get("/checks/critical", async (req, res) => {
    try {
      const checks = await storage.getCriticalHealthChecks();
      res.json(checks);
    } catch (error: any) {
      console.error("Error fetching critical health checks:", error);
      res.status(500).json({ message: "خطأ في جلب الفحوصات الحرجة" });
    }
  });

  // تشغيل فحص سلامة يدوي
  router.post("/checks/run", async (req, res) => {
    try {
      // تشغيل فحوصات السلامة يدوياً
      const status = healthMonitor.getSystemStatus();
      res.json({ message: "تم تشغيل فحوصات السلامة", status });
    } catch (error: any) {
      console.error("Error running health checks:", error);
      res.status(500).json({ message: "خطأ في تشغيل فحوصات السلامة" });
    }
  });

  return router;
}

export function createPerformanceRouter(storage: IStorage) {
  const router = Router();

  // جلب مؤشرات الأداء
  router.get("/", async (req, res) => {
    try {
      const filters = {
        metric_name: req.query.metric_name as string,
        metric_category: req.query.metric_category as string,
        start_date: req.query.start_date
          ? new Date(req.query.start_date as string)
          : undefined,
        end_date: req.query.end_date
          ? new Date(req.query.end_date as string)
          : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      };

      const metrics = await storage.getSystemPerformanceMetrics(filters);
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching performance metrics:", error);
      res.status(500).json({ message: "خطأ في جلب مؤشرات الأداء" });
    }
  });

  // جلب ملخص الأداء
  router.get("/summary", async (req, res) => {
    try {
      const timeRange =
        (req.query.timeRange as "hour" | "day" | "week") || "day";
      const summary = await storage.getPerformanceSummary(timeRange);
      res.json(summary);
    } catch (error: any) {
      console.error("Error fetching performance summary:", error);
      res.status(500).json({ message: "خطأ في جلب ملخص الأداء" });
    }
  });

  // جلب مؤشر محدد في فترة زمنية
  router.get("/metric/:name", async (req, res) => {
    try {
      const metricName = req.params.name;
      const startDate = new Date(
        (req.query.start_date as string) || Date.now() - 24 * 60 * 60 * 1000,
      );
      const endDate = new Date((req.query.end_date as string) || Date.now());

      const metrics = await storage.getMetricsByTimeRange(
        metricName,
        startDate,
        endDate,
      );
      res.json(metrics);
    } catch (error: any) {
      console.error("Error fetching metric by time range:", error);
      res.status(500).json({ message: "خطأ في جلب المؤشر في الفترة الزمنية" });
    }
  });

  // جلب آخر قيمة لمؤشر
  router.get("/metric/:name/latest", async (req, res) => {
    try {
      const metricName = req.params.name;
      const metric = await storage.getLatestMetricValue(metricName);
      res.json(metric);
    } catch (error: any) {
      console.error("Error fetching latest metric value:", error);
      res.status(500).json({ message: "خطأ في جلب آخر قيمة للمؤشر" });
    }
  });

  return router;
}

export function createCorrectiveActionsRouter(storage: IStorage) {
  const router = Router();

  // جلب الإجراءات التصحيحية
  router.get("/", async (req, res) => {
    try {
      const alertId = req.query.alert_id
        ? parseInt(req.query.alert_id as string)
        : undefined;
      const actions = await storage.getCorrectiveActions(alertId);
      res.json(actions);
    } catch (error: any) {
      console.error("Error fetching corrective actions:", error);
      res.status(500).json({ message: "خطأ في جلب الإجراءات التصحيحية" });
    }
  });

  // جلب الإجراءات المعلقة
  router.get("/pending", async (req, res) => {
    try {
      const actions = await storage.getPendingActions();
      res.json(actions);
    } catch (error: any) {
      console.error("Error fetching pending actions:", error);
      res.status(500).json({ message: "خطأ في جلب الإجراءات المعلقة" });
    }
  });

  // جلب إجراءات المستخدم الحالي
  router.get("/assigned/me", async (req, res) => {
    try {
      const userId = (req as any).user?.id || 1;
      const actions = await storage.getActionsByAssignee(userId);
      res.json(actions);
    } catch (error: any) {
      console.error("Error fetching user assigned actions:", error);
      res.status(500).json({ message: "خطأ في جلب إجراءات المستخدم" });
    }
  });

  // إنشاء إجراء تصحيحي جديد
  router.post("/", async (req, res) => {
    try {
      const actionData = req.body;
      const userId = (req as any).user?.id || 1;

      const action = await storage.createCorrectiveAction({
        ...actionData,
        created_by: userId,
      });

      res.status(201).json(action);
    } catch (error: any) {
      console.error("Error creating corrective action:", error);
      res.status(500).json({ message: "خطأ في إنشاء الإجراء التصحيحي" });
    }
  });

  // تحديث إجراء تصحيحي
  router.put("/:id", async (req, res) => {
    try {
      const actionId = parseInt(req.params.id);
      if (isNaN(actionId) || actionId <= 0) {
        return res.status(400).json({ message: "معرف الإجراء غير صحيح" });
      }
      const updates = req.body;

      const action = await storage.updateCorrectiveAction(actionId, updates);
      res.json(action);
    } catch (error: any) {
      console.error("Error updating corrective action:", error);
      res.status(500).json({ message: "خطأ في تحديث الإجراء التصحيحي" });
    }
  });

  // إكمال إجراء تصحيحي
  router.post("/:id/complete", async (req, res) => {
    try {
      const actionId = parseInt(req.params.id);
      if (isNaN(actionId) || actionId <= 0) {
        return res.status(400).json({ message: "معرف الإجراء غير صحيح" });
      }
      const { notes } = req.body;
      const userId = (req as any).user?.id || 1;

      const action = await storage.completeCorrectiveAction(
        actionId,
        userId,
        notes,
      );
      res.json(action);
    } catch (error: any) {
      console.error("Error completing corrective action:", error);
      res.status(500).json({ message: "خطأ في إكمال الإجراء التصحيحي" });
    }
  });

  return router;
}

export function createDataValidationRouter(storage: IStorage) {
  const router = Router();
  const dataValidator = getDataValidator(storage);

  // التحقق من صحة البيانات
  router.post("/validate", async (req, res) => {
    try {
      const { table, data, isUpdate = false } = req.body;

      if (!table || !data) {
        return res.status(400).json({ message: "اسم الجدول والبيانات مطلوبة" });
      }

      const result = await dataValidator.validateData(table, data, isUpdate);
      res.json(result);
    } catch (error: any) {
      console.error("Error validating data:", error);
      res.status(500).json({ message: "خطأ في التحقق من البيانات" });
    }
  });

  // فحص سلامة قاعدة البيانات
  router.get("/database-integrity", async (req, res) => {
    try {
      const result = await dataValidator.validateDatabaseIntegrity();
      res.json(result);
    } catch (error: any) {
      console.error("Error checking database integrity:", error);
      res.status(500).json({ message: "خطأ في فحص سلامة قاعدة البيانات" });
    }
  });

  return router;
}
