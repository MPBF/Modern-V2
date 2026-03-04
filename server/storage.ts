import * as ExcelJS from "exceljs";
import {
  users,
  orders,
  production_orders,
  rolls,
  machines,
  customers,
  maintenance_requests,
  maintenance_actions,
  maintenance_reports,
  operator_negligence_reports,
  spare_parts,
  consumable_parts,
  consumable_parts_transactions,
  quality_checks,
  attendance,
  waste,
  sections,
  cuts,
  warehouse_receipts,
  production_settings,
  items,
  customer_products,
  locations,
  categories,
  roles,
  inventory,
  inventory_movements,
  training_records,
  admin_decisions,
  warehouse_transactions,
  training_programs,
  training_materials,
  training_enrollments,
  training_evaluations,
  training_certificates,
  performance_reviews,
  performance_criteria,
  performance_ratings,
  leave_types,
  leave_requests,
  leave_balances,
  system_settings,
  user_settings,
  factory_locations,
  notifications,
  notification_templates,
  user_requests,
  machine_queues,

  // نظام التحذيرات الذكية
  system_alerts,
  alert_rules,
  system_health_checks,
  system_performance_metrics,
  corrective_actions,
  system_analytics,
  
  // الملاحظات السريعة
  quick_notes,
  note_attachments,
  type QuickNote,
  type InsertQuickNote,
  type NoteAttachment,
  type InsertNoteAttachment,
  type MachineQueue,
  type InsertMachineQueue,
  
  // نظام الخلط المبسط
  mixing_batches,
  batch_ingredients,
  type MixingBatch,
  type InsertMixingBatch,
  type BatchIngredient,
  type InsertBatchIngredient,
  
  type User,
  type SafeUser,
  type InsertUser,
  type UpsertUser,
  type NewOrder,
  type InsertNewOrder,
  type ProductionOrder,
  type InsertProductionOrder,
  type Roll,
  type InsertRoll,
  type Machine,
  type Customer,
  type Role,
  type MaintenanceRequest,
  type InsertMaintenanceRequest,
  type QualityCheck,
  type Attendance,
  type InsertAttendance,
  type Section,
  type Cut,
  type InsertCut,
  type WarehouseReceipt,
  type InsertWarehouseReceipt,
  type ProductionSettings,
  type InsertProductionSettings,
  type Item,
  type CustomerProduct,
  type Location,
  type Inventory,
  type InsertInventory,
  type InventoryMovement,
  type InsertInventoryMovement,
  type TrainingRecord,
  type AdminDecision,
  type WarehouseTransaction,
  type TrainingProgram,
  type InsertTrainingProgram,
  type TrainingMaterial,
  type InsertTrainingMaterial,
  type TrainingEnrollment,
  type InsertTrainingEnrollment,
  type TrainingEvaluation,
  type InsertTrainingEvaluation,
  type TrainingCertificate,
  type InsertTrainingCertificate,
  type PerformanceReview,
  type InsertPerformanceReview,
  type PerformanceCriteria,
  type InsertPerformanceCriteria,
  type PerformanceRating,
  type InsertPerformanceRating,
  type LeaveType,
  type InsertLeaveType,
  type LeaveRequest,
  type InsertLeaveRequest,
  type SystemSetting,
  type InsertSystemSetting,
  type FactoryLocation,
  type InsertFactoryLocation,
  type UserSetting,
  type InsertUserSetting,
  type LeaveBalance,
  type InsertLeaveBalance,
  type Notification,
  type InsertNotification,
  type NotificationTemplate,
  type InsertNotificationTemplate,
  type SparePart,
  type InsertSparePart,
  type ConsumablePart,
  type InsertConsumablePart,
  type ConsumablePartTransaction,
  type InsertConsumablePartTransaction,
  type MaintenanceAction,
  type InsertMaintenanceAction,
  type MaintenanceReport,
  type InsertMaintenanceReport,
  type OperatorNegligenceReport,
  type InsertOperatorNegligenceReport,

  // أنواع نظام التحذيرات الذكية
  type SystemAlert,
  type InsertSystemAlert,
  type AlertRule,
  type InsertAlertRule,
  type SystemHealthCheck,
  type InsertSystemHealthCheck,
  type SystemPerformanceMetric,
  type InsertSystemPerformanceMetric,
  type CorrectiveAction,
  type InsertCorrectiveAction,
  type SystemAnalytics,
  type InsertSystemAnalytics,
  
  // ألوان الماستر باتش
  master_batch_colors,
  type MasterBatchColor,
  type InsertMasterBatchColor,
  
  // سندات المستودع
  raw_material_vouchers_in,
  raw_material_vouchers_out,
  finished_goods_vouchers_in,
  finished_goods_vouchers_out,
  inventory_counts,
  inventory_count_items,
  type RawMaterialVoucherIn,
  type InsertRawMaterialVoucherIn,
  type RawMaterialVoucherOut,
  type InsertRawMaterialVoucherOut,
  type FinishedGoodsVoucherIn,
  type InsertFinishedGoodsVoucherIn,
  type FinishedGoodsVoucherOut,
  type InsertFinishedGoodsVoucherOut,
  type InventoryCount,
  type InsertInventoryCount,
  type InventoryCountItem,
  type InsertInventoryCountItem,
  suppliers,
  
  // Notification Event Settings
  notification_event_settings,
  notification_event_logs,
  type NotificationEventSetting,
  type InsertNotificationEventSetting,
  type NotificationEventLog,
  type InsertNotificationEventLog,

  // Factory Snapshots
  factory_snapshots,
  type FactorySnapshot,
  type InsertFactorySnapshot,

  // Display Slides
  display_slides,
  type DisplaySlide,
  type InsertDisplaySlide,
} from "@shared/schema";

import { db, pool } from "./db";
import { eq, desc, and, sql, sum, count, inArray, or, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import bcrypt from "bcrypt";
import {
  generateRollNumber,
  generateUUID,
  generateCertificateNumber,
} from "@shared/id-generator";
import { numberToDecimalString, normalizeDecimal } from "@shared/decimal-utils";
import { calculateProductionQuantities } from "@shared/quantity-utils";
import { getDataValidator } from "./services/data-validator";
import QRCode from "qrcode";

// Enhanced cache system with memory optimization
class OptimizedCache {
  private cache = new Map<
    string,
    {
      data: any;
      timestamp: number;
      ttl: number;
      accessCount: number;
      lastAccess: number;
    }
  >();
  private maxSize = 1000; // Maximum cache entries
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup stale entries every 2 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      cached.accessCount++;
      cached.lastAccess = Date.now();
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  set(key: string, data: any, ttl: number): void {
    // If cache is full, remove least recently used entries
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 1,
      lastAccess: Date.now(),
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Date.now();

    // Use Array.from to avoid iterator issues
    Array.from(this.cache.entries()).forEach(([key, value]) => {
      if (value.lastAccess < oldestAccess) {
        oldestAccess = value.lastAccess;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const staleKeys: string[] = [];

    // Use Array.from to avoid iterator issues
    Array.from(this.cache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > value.ttl) {
        staleKeys.push(key);
      }
    });

    staleKeys.forEach((key) => this.cache.delete(key));

    if (staleKeys.length > 0) {
      console.log(
        `[Cache] Cleaned up ${staleKeys.length} stale entries. Active: ${this.cache.size}`,
      );
    }
  }

  getStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: this.maxSize };
  }

  shutdown(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

const cache = new OptimizedCache();
const CACHE_TTL = {
  REALTIME: 5 * 1000, // 5 seconds for production queues
  SHORT: 30 * 1000, // 30 seconds for active data
  MEDIUM: 5 * 60 * 1000, // 5 minutes for relatively stable data
  LONG: 15 * 60 * 1000, // 15 minutes for rarely changing data
};

function getCachedData(key: string): any | null {
  return cache.get(key);
}

function setCachedData(key: string, data: any, ttl: number): void {
  cache.set(key, data, ttl);
}

// Import notification manager to broadcast production updates
let notificationManager: any = null;
export function setNotificationManager(nm: any): void {
  notificationManager = nm;
}

// إزالة cache للمفاتيح المتعلقة بالإنتاج عند التحديث
function invalidateProductionCache(
  updateType: "film" | "printing" | "cutting" | "all" = "all",
): void {
  const productionKeys = [
    "printing_queue",
    "cutting_queue",
    "hierarchical_orders",
    "grouped_cutting_queue",
  ];
  productionKeys.forEach((key) => cache.delete(key));

  // Broadcast production update via SSE if notification manager is available
  if (notificationManager) {
    notificationManager.broadcastProductionUpdate(updateType);
  }
}

// Database error handling utilities
class DatabaseError extends Error {
  public code?: string;
  public constraint?: string;
  public table?: string;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = "DatabaseError";

    if (originalError) {
      this.code = originalError.code;
      this.constraint = originalError.constraint;
      this.table = originalError.table;
    }
  }
}

function handleDatabaseError(
  error: any,
  operation: string,
  context?: string,
): never {
  console.error(`Database error during ${operation}:`, error);

  // Handle specific database errors
  if (error.code === "23505") {
    // Unique constraint violation
    throw new DatabaseError(
      `البيانات مكررة - ${context || "العنصر موجود مسبقاً"}`,
      error,
    );
  }

  if (error.code === "23503") {
    // Foreign key constraint violation
    throw new DatabaseError(
      `خطأ في الربط - ${context || "البيانات المرجعية غير موجودة"}`,
      error,
    );
  }

  if (error.code === "23502") {
    // Not null constraint violation
    throw new DatabaseError(
      `بيانات مطلوبة مفقودة - ${context || "يرجى إدخال جميع البيانات المطلوبة"}`,
      error,
    );
  }

  if (error.code === "42P01") {
    // Table does not exist
    throw new DatabaseError("خطأ في النظام - جدول البيانات غير موجود", error);
  }

  if (error.code === "53300") {
    // Too many connections
    throw new DatabaseError("الخادم مشغول - يرجى المحاولة لاحقاً", error);
  }

  if (error.code === "08006" || error.code === "08003") {
    // Connection failure
    throw new DatabaseError(
      "خطأ في الاتصال بقاعدة البيانات - يرجى المحاولة لاحقاً",
      error,
    );
  }

  // Generic database error
  throw new DatabaseError(
    `خطأ في قاعدة البيانات أثناء ${operation} - ${context || "يرجى المحاولة لاحقاً"}`,
    error,
  );
}

async function withDatabaseErrorHandling<T>(
  operation: () => Promise<T>,
  operationName: string,
  context?: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleDatabaseError(error, operationName, context);
  }
}

export interface IStorage {
  // Check existence for validation
  exists(table: string, field: string, value: any): Promise<boolean>;

  // Users (with sensitive data)
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Replit Auth user operations
  getUserByReplitId(replitUserId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Safe users (without sensitive data like passwords)
  getSafeUser(id: number): Promise<SafeUser | undefined>;
  getSafeUsers(): Promise<SafeUser[]>;
  getSafeUsersByRole(roleId: number): Promise<SafeUser[]>;
  
  // Roles
  getRoleById(id: number): Promise<Role | undefined>;

  // Orders
  getAllOrders(): Promise<NewOrder[]>;
  createOrder(order: InsertNewOrder): Promise<NewOrder>;
  updateOrder(id: number, order: Partial<NewOrder>): Promise<NewOrder>;
  updateOrderStatus(id: number, status: string): Promise<NewOrder>;
  getOrderById(id: number): Promise<NewOrder | undefined>;
  deleteOrder(id: number): Promise<void>;
  getOrdersForProduction(): Promise<any[]>;
  getHierarchicalOrdersForProduction(): Promise<any[]>;

  // Production Orders
  getAllProductionOrders(): Promise<ProductionOrder[]>;
  getProductionOrderById(id: number): Promise<ProductionOrder | undefined>;
  createProductionOrder(
    productionOrder: InsertProductionOrder,
  ): Promise<ProductionOrder>;
  createProductionOrdersBatch(
    productionOrders: InsertProductionOrder[],
  ): Promise<{
    successful: ProductionOrder[];
    failed: Array<{ order: InsertProductionOrder; error: string }>;
  }>;
  updateProductionOrder(
    id: number,
    productionOrder: Partial<ProductionOrder>,
  ): Promise<ProductionOrder>;
  deleteProductionOrder(id: number): Promise<void>;
  getProductionOrdersForPrintingQueue(): Promise<any[]>;
  getProductionOrdersForCuttingQueue(): Promise<any[]>;
  getGroupedCuttingQueue(): Promise<any[]>;

  // Rolls
  getAllRolls(): Promise<Roll[]>;
  getRollById(id: number): Promise<Roll | undefined>;
  getRollsByProductionOrder(productionOrderId: number): Promise<Roll[]>;
  createRoll(roll: InsertRoll): Promise<Roll>;
  updateRoll(id: number, roll: Partial<Roll>): Promise<Roll>;
  deleteRoll(id: number): Promise<void>;
  getRecentRolls(limit: number): Promise<Roll[]>;

  // Machines
  getAllMachines(): Promise<Machine[]>;
  getMachineById(id: number): Promise<Machine | undefined>;

  // Customers
  getAllCustomers(): Promise<Customer[]>;
  getCustomerById(id: number): Promise<Customer | undefined>;

  // Maintenance
  getAllMaintenanceRequests(): Promise<MaintenanceRequest[]>;
  createMaintenanceRequest(
    request: InsertMaintenanceRequest,
  ): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(
    id: number,
    request: Partial<MaintenanceRequest>,
  ): Promise<MaintenanceRequest>;

  // Quality Control
  getQualityChecksByRoll(rollId: number): Promise<QualityCheck[]>;
  createQualityCheck(check: any): Promise<QualityCheck>;

  // Attendance
  getAttendanceByDate(date: string): Promise<any[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: number, attendance: Partial<Attendance>): Promise<Attendance>;
  deleteAttendance(id: number): Promise<void>;
  getAttendanceById(id: number): Promise<Attendance | null>;
  getAttendanceByUserAndDateRange(userId: number, startDate: string, endDate: string): Promise<any[]>;
  getAttendanceSummary(userId: number, startDate: Date, endDate: Date): Promise<any>;
  getAttendanceReport(startDate: Date, endDate: Date, filters?: any): Promise<any[]>;
  getDailyAttendanceStats(date: string): Promise<any>;
  upsertManualAttendance(entries: any[]): Promise<any[]>;
  getDailyAttendanceStatus(userId: number, date: string): Promise<any>;

  // Waste
  getAllWaste(): Promise<any[]>;
  createWaste(wasteData: any): Promise<any>;

  // Sections
  getAllSections(): Promise<Section[]>;

  // Production Settings
  getProductionSettings(): Promise<ProductionSettings | undefined>;
  updateProductionSettings(
    settings: Partial<ProductionSettings>,
  ): Promise<ProductionSettings>;

  // Inventory
  getAllInventory(): Promise<Inventory[]>;
  updateInventory(id: number, inventory: Partial<Inventory>): Promise<Inventory>;
  createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement>;
  getInventoryMovements(itemId: number): Promise<InventoryMovement[]>;
  
  // Warehouse Receipts
  getAllWarehouseReceipts(): Promise<WarehouseReceipt[]>;
  createWarehouseReceipt(receipt: InsertWarehouseReceipt): Promise<WarehouseReceipt>;

  // Training
  getAllTrainingPrograms(): Promise<TrainingProgram[]>;
  createTrainingProgram(program: InsertTrainingProgram): Promise<TrainingProgram>;
  getTrainingProgramById(id: number): Promise<TrainingProgram | undefined>;
  getTrainingMaterials(programId: number): Promise<TrainingMaterial[]>;
  createTrainingMaterial(material: InsertTrainingMaterial): Promise<TrainingMaterial>;
  getTrainingEnrollments(programId: number): Promise<any[]>;
  enrollUserInProgram(enrollment: InsertTrainingEnrollment): Promise<TrainingEnrollment>;
  updateEnrollment(id: number, updates: Partial<TrainingEnrollment>): Promise<TrainingEnrollment>;
  createEvaluation(evaluation: InsertTrainingEvaluation): Promise<TrainingEvaluation>;
  getCertificates(userId: number): Promise<TrainingCertificate[]>;
  createCertificate(certificate: InsertTrainingCertificate): Promise<TrainingCertificate>;

  // HR & Performance
  getPerformanceReviews(userId: number): Promise<PerformanceReview[]>;
  createPerformanceReview(review: InsertPerformanceReview): Promise<PerformanceReview>;
  getPerformanceCriteria(): Promise<PerformanceCriteria[]>;
  getPerformanceRatings(reviewId: number): Promise<PerformanceRating[]>;
  createPerformanceRating(rating: InsertPerformanceRating): Promise<PerformanceRating>;

  // Leave Management
  getLeaveTypes(): Promise<LeaveType[]>;
  getLeaveRequests(userId?: number): Promise<any[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest>;
  getLeaveBalances(userId: number): Promise<LeaveBalance[]>;

  // Admin Decisions
  getAllAdminDecisions(): Promise<AdminDecision[]>;
  createAdminDecision(decision: any): Promise<AdminDecision>;

  // Items and Products
  getAllItems(): Promise<Item[]>;
  getAllCustomerProducts(): Promise<CustomerProduct[]>;
  getCustomerProductById(id: number): Promise<CustomerProduct | undefined>;
  
  // System Settings
  getSystemSettings(): Promise<SystemSetting[]>;
  updateSystemSetting(id: number, value: string): Promise<SystemSetting>;

  // Factory Locations
  getFactoryLocations(): Promise<FactoryLocation[]>;
  createFactoryLocation(location: InsertFactoryLocation): Promise<FactoryLocation>;

  // User Settings
  getUserSettings(userId: number): Promise<UserSetting | undefined>;
  updateUserSetting(userId: number, settings: Partial<InsertUserSetting>): Promise<UserSetting>;

  // System Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId?: number, limit?: number, offset?: number): Promise<Notification[]>;
  updateNotificationStatus(twilioSid: string, updates: Partial<Notification>): Promise<Notification>;
  getUserNotifications(userId: number, options?: any): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  getUnreadNotificationsCount(userId: number): Promise<number>;

  // Maintenance Components
  getSpareParts(): Promise<SparePart[]>;
  createSparePart(part: InsertSparePart): Promise<SparePart>;
  getConsumableParts(): Promise<ConsumablePart[]>;
  createConsumablePart(part: InsertConsumablePart): Promise<ConsumablePart>;
  getConsumablePartTransactions(partId: number): Promise<ConsumablePartTransaction[]>;
  createConsumablePartTransaction(transaction: InsertConsumablePartTransaction): Promise<ConsumablePartTransaction>;
  getMaintenanceActions(requestId: number): Promise<MaintenanceAction[]>;
  createMaintenanceAction(action: InsertMaintenanceAction): Promise<MaintenanceAction>;
  getMaintenanceReports(): Promise<MaintenanceReport[]>;
  createMaintenanceReport(report: InsertMaintenanceReport): Promise<MaintenanceReport>;
  getOperatorNegligenceReports(): Promise<OperatorNegligenceReport[]>;
  createOperatorNegligenceReport(report: InsertOperatorNegligenceReport): Promise<OperatorNegligenceReport>;

  // Smart Alerts
  getAllAlerts(options?: any): Promise<SystemAlert[]>;
  getAlertById(id: number): Promise<SystemAlert | undefined>;
  createAlert(alert: InsertSystemAlert): Promise<SystemAlert>;
  updateAlertStatus(id: number, status: string, userId?: number): Promise<SystemAlert>;
  getAlertRules(): Promise<AlertRule[]>;
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  updateAlertRule(id: number, rule: Partial<AlertRule>): Promise<AlertRule>;
  getSystemHealthChecks(limit?: number): Promise<SystemHealthCheck[]>;
  createSystemHealthCheck(check: InsertSystemHealthCheck): Promise<SystemHealthCheck>;
  getSystemPerformanceMetrics(options?: any): Promise<SystemPerformanceMetric[]>;
  createSystemPerformanceMetric(metric: InsertSystemPerformanceMetric): Promise<SystemPerformanceMetric>;
  getCorrectiveActions(alertId?: number): Promise<CorrectiveAction[]>;
  createCorrectiveAction(action: InsertCorrectiveAction): Promise<CorrectiveAction>;
  updateCorrectiveAction(id: number, action: Partial<CorrectiveAction>): Promise<CorrectiveAction>;
  getSystemAnalytics(type?: string): Promise<SystemAnalytics[]>;
  createSystemAnalytics(analytics: InsertSystemAnalytics): Promise<SystemAnalytics>;
  
  // Quick Notes
  getQuickNotes(userId?: number): Promise<any[]>;
  createQuickNote(note: InsertQuickNote): Promise<QuickNote>;
  updateQuickNote(id: number, note: Partial<QuickNote>): Promise<QuickNote>;
  deleteQuickNote(id: number): Promise<void>;
  createNoteAttachment(attachment: InsertNoteAttachment): Promise<NoteAttachment>;
  getNoteAttachments(noteId: number): Promise<NoteAttachment[]>;
  
  // Machine Queues
  getMachineQueue(machineId: number): Promise<MachineQueue[]>;
  updateMachineQueue(machineId: number, queueItems: InsertMachineQueue[]): Promise<MachineQueue[]>;
  
  // Mixing Batches
  getMixingBatches(options?: any): Promise<MixingBatch[]>;
  getMixingBatchById(id: number): Promise<any>;
  createMixingBatch(batch: InsertMixingBatch, ingredients: InsertBatchIngredient[]): Promise<MixingBatch>;
  updateMixingBatchStatus(id: number, status: string): Promise<MixingBatch>;
  
  // Master Batch Colors
  getMasterBatchColors(): Promise<MasterBatchColor[]>;
  createMasterBatchColor(color: InsertMasterBatchColor): Promise<MasterBatchColor>;
  
  // Raw Material Vouchers
  getRawMaterialVouchersIn(): Promise<RawMaterialVoucherIn[]>;
  getRawMaterialVoucherInById(id: number): Promise<RawMaterialVoucherIn | undefined>;
  createRawMaterialVoucherIn(voucher: any): Promise<RawMaterialVoucherIn>;
  getRawMaterialVouchersOut(): Promise<RawMaterialVoucherOut[]>;
  getRawMaterialVoucherOutById(id: number): Promise<RawMaterialVoucherOut | undefined>;
  createRawMaterialVoucherOut(voucher: any): Promise<RawMaterialVoucherOut>;
  
  // Finished Goods Vouchers
  getFinishedGoodsVouchersIn(): Promise<FinishedGoodsVoucherIn[]>;
  getFinishedGoodsVoucherInById(id: number): Promise<FinishedGoodsVoucherIn | undefined>;
  createFinishedGoodsVoucherIn(voucher: any): Promise<FinishedGoodsVoucherIn>;
  getFinishedGoodsVouchersOut(): Promise<FinishedGoodsVoucherOut[]>;
  getFinishedGoodsVoucherOutById(id: number): Promise<FinishedGoodsVoucherOut | undefined>;
  createFinishedGoodsVoucherOut(voucher: any): Promise<FinishedGoodsVoucherOut>;
  
  // Warehouse Stats
  getWarehouseVouchersStats(): Promise<any>;
  
  // Inventory Counts
  getInventoryCounts(): Promise<InventoryCount[]>;
  getInventoryCountById(id: number): Promise<any>;
  createInventoryCount(count: InsertInventoryCount): Promise<InventoryCount>;
  createInventoryCountItem(item: InsertInventoryCountItem): Promise<InventoryCountItem>;
  completeInventoryCount(id: number, userId: number): Promise<InventoryCount>;
  
  // Barcode Lookup
  lookupByBarcode(barcode: string): Promise<any>;
  
  // Notification Event Settings
  getAllNotificationEventSettings(): Promise<NotificationEventSetting[]>;
  getNotificationEventSettingById(id: number): Promise<NotificationEventSetting | undefined>;
  getNotificationEventSettingByKey(key: string): Promise<NotificationEventSetting | undefined>;
  createNotificationEventSetting(setting: InsertNotificationEventSetting): Promise<NotificationEventSetting>;
  updateNotificationEventSetting(id: number, setting: Partial<NotificationEventSetting>): Promise<NotificationEventSetting>;
  deleteNotificationEventSetting(id: number): Promise<void>;
  getNotificationEventLogs(options?: any): Promise<NotificationEventLog[]>;
  createNotificationEventLog(log: InsertNotificationEventLog): Promise<NotificationEventLog>;
  updateNotificationEventLog(id: number, updates: Partial<NotificationEventLog>): Promise<NotificationEventLog>;

  // Factory Snapshots
  getFactorySnapshots(userId?: number): Promise<FactorySnapshot[]>;
  getFactorySnapshot(id: number): Promise<FactorySnapshot | undefined>;
  getFactorySnapshotByToken(token: string): Promise<FactorySnapshot | undefined>;
  createFactorySnapshot(snapshot: InsertFactorySnapshot): Promise<FactorySnapshot>;
  deleteFactorySnapshot(id: number): Promise<void>;

  // Display Slides
  getDisplaySlides(): Promise<DisplaySlide[]>;
  getActiveDisplaySlides(): Promise<DisplaySlide[]>;
  getDisplaySlideById(id: number): Promise<DisplaySlide | undefined>;
  createDisplaySlide(slide: InsertDisplaySlide): Promise<DisplaySlide>;
  updateDisplaySlide(id: number, slide: Partial<DisplaySlide>): Promise<DisplaySlide>;
  deleteDisplaySlide(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private dataValidator = getDataValidator(this);
  // In-memory storage for alert rate limiting - persistent during server session
  private alertTimesStorage: Map<string, Date> = new Map();

  async exists(table: string, field: string, value: any): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${field} = $1)`,
        [value]
      );
      return result.rows[0].exists;
    } catch (error) {
      console.error(`Error checking existence in ${table}.${field}:`, error);
      return false;
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
      },
      "getUser",
      `جلب المستخدم ${id}`,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username));
        return user;
      },
      "getUserByUsername",
      `جلب المستخدم ${username}`,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return withDatabaseErrorHandling(
      async () => {
        // التحقق من صحة البيانات قبل الحفظ
        const validation = await this.dataValidator.validateData("users", insertUser);
        if (!validation.isValid) {
          throw new Error(`خطأ في البيانات: ${validation.errors.map(e => e.message_ar).join(', ')}`);
        }

        const [user] = await db.insert(users).values(insertUser).returning();
        return user;
      },
      "createUser",
      "إنشاء مستخدم جديد",
    );
  }

  async getUserByReplitId(replitUserId: string): Promise<User | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.replit_user_id, replitUserId));
        return user;
      },
      "getUserByReplitId",
      `جلب مستخدم Replit ${replitUserId}`,
    );
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return withDatabaseErrorHandling(
      async () => {
        const existingUser = await this.getUserByReplitId(userData.replit_user_id);

        if (existingUser) {
          const [updatedUser] = await db
            .update(users)
            .set({
              display_name: userData.display_name,
              display_name_ar: userData.display_name_ar || userData.display_name,
              updated_at: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning();
          return updatedUser;
        }

        const [newUser] = await db
          .insert(users)
          .values({
            username: userData.username,
            replit_user_id: userData.replit_user_id,
            display_name: userData.display_name,
            display_name_ar: userData.display_name_ar || userData.display_name,
            role_id: 2, // الافتراضي هو موظف
            status: "active",
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();
        return newUser;
      },
      "upsertUser",
      "تحديث أو إنشاء مستخدم Replit",
    );
  }

  async getSafeUser(id: number): Promise<SafeUser | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
            display_name: users.display_name,
            display_name_ar: users.display_name_ar,
            role_id: users.role_id,
            status: users.status,
            replit_user_id: users.replit_user_id,
            created_at: users.created_at,
          })
          .from(users)
          .where(eq(users.id, id));
        return user;
      },
      "getSafeUser",
      `جلب بيانات المستخدم الآمنة ${id}`,
    );
  }

  async getSafeUsers(): Promise<SafeUser[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db
          .select({
            id: users.id,
            username: users.username,
            display_name: users.display_name,
            display_name_ar: users.display_name_ar,
            role_id: users.role_id,
            status: users.status,
            replit_user_id: users.replit_user_id,
            created_at: users.created_at,
          })
          .from(users)
          .orderBy(users.username);
      },
      "getSafeUsers",
      "جلب قائمة المستخدمين",
    );
  }

  async getSafeUsersByRole(roleId: number): Promise<SafeUser[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db
          .select({
            id: users.id,
            username: users.username,
            display_name: users.display_name,
            display_name_ar: users.display_name_ar,
            role_id: users.role_id,
            status: users.status,
            replit_user_id: users.replit_user_id,
            created_at: users.created_at,
          })
          .from(users)
          .where(eq(users.role_id, roleId));
      },
      "getSafeUsersByRole",
      `جلب المستخدمين حسب الدور ${roleId}`,
    );
  }

  async getRoleById(id: number): Promise<Role | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [role] = await db.select().from(roles).where(eq(roles.id, id));
        return role;
      },
      "getRoleById",
      `جلب الدور ${id}`,
    );
  }

  async getAllOrders(): Promise<NewOrder[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(orders).orderBy(desc(orders.id));
      },
      "getAllOrders",
      "جلب جميع الطلبات",
    );
  }

  async createOrder(insertOrder: InsertNewOrder): Promise<NewOrder> {
    return withDatabaseErrorHandling(
      async () => {
        // التحقق من صحة البيانات
        const validation = await this.dataValidator.validateData("orders", insertOrder);
        if (!validation.isValid) {
          throw new Error(`خطأ في البيانات: ${validation.errors.map(e => e.message_ar).join(', ')}`);
        }

        const [order] = await db.insert(orders).values(insertOrder).returning();
        return order;
      },
      "createOrder",
      "إنشاء طلب جديد",
    );
  }

  async updateOrder(id: number, orderUpdates: Partial<NewOrder>): Promise<NewOrder> {
    return withDatabaseErrorHandling(
      async () => {
        const [updatedOrder] = await db
          .update(orders)
          .set({ ...orderUpdates, updated_at: new Date() })
          .where(eq(orders.id, id))
          .returning();
        return updatedOrder;
      },
      "updateOrder",
      `تحديث الطلب ${id}`,
    );
  }

  async updateOrderStatus(id: number, status: string): Promise<NewOrder> {
    return withDatabaseErrorHandling(
      async () => {
        const [updatedOrder] = await db
          .update(orders)
          .set({ status, updated_at: new Date() })
          .where(eq(orders.id, id))
          .returning();
        return updatedOrder;
      },
      "updateOrderStatus",
      `تحديث حالة الطلب ${id}`,
    );
  }

  async getOrderById(id: number): Promise<NewOrder | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        return order;
      },
      "getOrderById",
      `جلب الطلب ${id}`,
    );
  }

  async deleteOrder(id: number): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await db.delete(orders).where(eq(orders.id, id));
      },
      "deleteOrder",
      `حذف الطلب ${id}`,
    );
  }

  async getOrdersForProduction(): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        const results = await db
          .select({
            id: orders.id,
            customer_name: customers.name,
            product_name: customer_products.name,
            quantity: orders.quantity,
            delivery_date: orders.delivery_date,
            status: orders.status,
          })
          .from(orders)
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .leftJoin(customer_products, eq(orders.customer_product_id, customer_products.id))
          .where(and(ne(orders.status, "completed"), ne(orders.status, "cancelled")))
          .orderBy(orders.delivery_date);
        return results;
      },
      "getOrdersForProduction",
      "جلب الطلبات للتخطيط",
    );
  }

  async getHierarchicalOrdersForProduction(): Promise<any[]> {
    const cached = getCachedData("hierarchical_orders");
    if (cached) return cached;

    return withDatabaseErrorHandling(
      async () => {
        const ordersList = await this.getOrdersForProduction();
        setCachedData("hierarchical_orders", ordersList, CACHE_TTL.SHORT);
        return ordersList;
      },
      "getHierarchicalOrdersForProduction",
      "جلب الطلبات الهيكلية",
    );
  }

  async getAllProductionOrders(): Promise<ProductionOrder[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(production_orders).orderBy(desc(production_orders.id));
      },
      "getAllProductionOrders",
      "جلب أوامر الإنتاج",
    );
  }

  async getProductionOrderById(id: number): Promise<ProductionOrder | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [po] = await db
          .select()
          .from(production_orders)
          .where(eq(production_orders.id, id));
        return po;
      },
      "getProductionOrderById",
      `جلب أمر الإنتاج ${id}`,
    );
  }

  async createProductionOrder(po: InsertProductionOrder): Promise<ProductionOrder> {
    return withDatabaseErrorHandling(
      async () => {
        const validation = await this.dataValidator.validateData("production_orders", po);
        if (!validation.isValid) {
          throw new Error(`خطأ في البيانات: ${validation.errors.map(e => e.message_ar).join(', ')}`);
        }

        const [newPo] = await db.insert(production_orders).values(po).returning();
        invalidateProductionCache();
        return newPo;
      },
      "createProductionOrder",
      "إنشاء أمر إنتاج",
    );
  }

  async createProductionOrdersBatch(batch: InsertProductionOrder[]): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const results = { successful: [], failed: [] };
        for (const po of batch) {
          try {
            const created = await this.createProductionOrder(po);
            results.successful.push(created);
          } catch (e) {
            results.failed.push({ order: po, error: e.message });
          }
        }
        return results;
      },
      "createProductionOrdersBatch",
      "إنشاء دفعة أوامر إنتاج",
    );
  }

  async updateProductionOrder(id: number, updates: Partial<ProductionOrder>): Promise<ProductionOrder> {
    return withDatabaseErrorHandling(
      async () => {
        const [updated] = await db
          .update(production_orders)
          .set({ ...updates, updated_at: new Date() })
          .where(eq(production_orders.id, id))
          .returning();
        invalidateProductionCache();
        return updated;
      },
      "updateProductionOrder",
      `تحديث أمر الإنتاج ${id}`,
    );
  }

  async deleteProductionOrder(id: number): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await db.delete(production_orders).where(eq(production_orders.id, id));
        invalidateProductionCache();
      },
      "deleteProductionOrder",
      `حذف أمر الإنتاج ${id}`,
    );
  }

  async getProductionOrdersForPrintingQueue(): Promise<any[]> {
    const cached = getCachedData("printing_queue");
    if (cached) return cached;

    return withDatabaseErrorHandling(
      async () => {
        const results = await db
          .select()
          .from(production_orders)
          .where(eq(production_orders.status, "waiting_for_printing"))
          .orderBy(production_orders.id);
        setCachedData("printing_queue", results, CACHE_TTL.REALTIME);
        return results;
      },
      "getProductionOrdersForPrintingQueue",
      "جلب طابور الطباعة",
    );
  }

  async getProductionOrdersForCuttingQueue(): Promise<any[]> {
    const cached = getCachedData("cutting_queue");
    if (cached) return cached;

    return withDatabaseErrorHandling(
      async () => {
        const results = await db
          .select()
          .from(production_orders)
          .where(eq(production_orders.status, "waiting_for_cutting"))
          .orderBy(production_orders.id);
        setCachedData("cutting_queue", results, CACHE_TTL.REALTIME);
        return results;
      },
      "getProductionOrdersForCuttingQueue",
      "جلب طابور القص",
    );
  }

  async getGroupedCuttingQueue(): Promise<any[]> {
    const cached = getCachedData("grouped_cutting_queue");
    if (cached) return cached;

    return withDatabaseErrorHandling(
      async () => {
        const results = await this.getProductionOrdersForCuttingQueue();
        // Grouping logic can be added here if needed
        setCachedData("grouped_cutting_queue", results, CACHE_TTL.REALTIME);
        return results;
      },
      "getGroupedCuttingQueue",
      "جلب طابور القص المجمع",
    );
  }

  async getAllRolls(): Promise<Roll[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(rolls).orderBy(desc(rolls.id));
      },
      "getAllRolls",
      "جلب جميع الرولات",
    );
  }

  async getRollById(id: number): Promise<Roll | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [roll] = await db.select().from(rolls).where(eq(rolls.id, id));
        return roll;
      },
      "getRollById",
      `جلب الرول ${id}`,
    );
  }

  async getRollsByProductionOrder(poId: number): Promise<Roll[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(rolls).where(eq(rolls.production_order_id, poId));
      },
      "getRollsByProductionOrder",
      `جلب رولات أمر الإنتاج ${poId}`,
    );
  }

  async createRoll(insertRoll: InsertRoll): Promise<Roll> {
    return withDatabaseErrorHandling(
      async () => {
        const [roll] = await db.insert(rolls).values(insertRoll).returning();
        return roll;
      },
      "createRoll",
      "إنشاء رول",
    );
  }

  async updateRoll(id: number, updates: Partial<Roll>): Promise<Roll> {
    return withDatabaseErrorHandling(
      async () => {
        const [updated] = await db
          .update(rolls)
          .set({ ...updates, updated_at: new Date() })
          .where(eq(rolls.id, id))
          .returning();
        return updated;
      },
      "updateRoll",
      `تحديث الرول ${id}`,
    );
  }

  async deleteRoll(id: number): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await db.delete(rolls).where(eq(rolls.id, id));
      },
      "deleteRoll",
      `حذف الرول ${id}`,
    );
  }

  async getRecentRolls(limit: number): Promise<Roll[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(rolls).orderBy(desc(rolls.created_at)).limit(limit);
      },
      "getRecentRolls",
      "جلب الرولات الأخيرة",
    );
  }

  async getAllMachines(): Promise<Machine[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(machines).orderBy(machines.name);
      },
      "getAllMachines",
      "جلب الماكينات",
    );
  }

  async getMachineById(id: number): Promise<Machine | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [m] = await db.select().from(machines).where(eq(machines.id, id));
        return m;
      },
      "getMachineById",
      `جلب الماكينة ${id}`,
    );
  }

  async getAllCustomers(): Promise<Customer[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(customers).orderBy(customers.name);
      },
      "getAllCustomers",
      "جلب العملاء",
    );
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [c] = await db.select().from(customers).where(eq(customers.id, id));
        return c;
      },
      "getCustomerById",
      `جلب العميل ${id}`,
    );
  }

  async getAllMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(maintenance_requests).orderBy(desc(maintenance_requests.id));
      },
      "getAllMaintenanceRequests",
      "جلب طلبات الصيانة",
    );
  }

  async createMaintenanceRequest(req: InsertMaintenanceRequest): Promise<MaintenanceRequest> {
    return withDatabaseErrorHandling(
      async () => {
        const [newReq] = await db.insert(maintenance_requests).values(req).returning();
        return newReq;
      },
      "createMaintenanceRequest",
      "إنشاء طلب صيانة",
    );
  }

  async updateMaintenanceRequest(id: number, updates: Partial<MaintenanceRequest>): Promise<MaintenanceRequest> {
    return withDatabaseErrorHandling(
      async () => {
        const [updated] = await db
          .update(maintenance_requests)
          .set({ ...updates, updated_at: new Date() })
          .where(eq(maintenance_requests.id, id))
          .returning();
        return updated;
      },
      "updateMaintenanceRequest",
      `تحديث طلب الصيانة ${id}`,
    );
  }

  async getQualityChecksByRoll(rollId: number): Promise<QualityCheck[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.select().from(quality_checks).where(eq(quality_checks.roll_id, rollId));
      },
      "getQualityChecksByRoll",
      `جلب فحوصات جودة الرول ${rollId}`,
    );
  }

  async createQualityCheck(check: any): Promise<QualityCheck> {
    return withDatabaseErrorHandling(
      async () => {
        const [newCheck] = await db.insert(quality_checks).values(check).returning();
        return newCheck;
      },
      "createQualityCheck",
      "إنشاء فحص جودة",
    );
  }

  async getAttendanceByDate(date: string): Promise<any[]> {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          display_name_ar: users.display_name_ar,
          role_id: users.role_id,
          role_name: roles.name,
          role_name_ar: roles.name_ar,
          status: users.status,
        })
        .from(users)
        .leftJoin(roles, eq(users.role_id, roles.id))
        .where(eq(users.status, 'active'));

      const attendanceRecords = await db
        .select()
        .from(attendance)
        .where(eq(attendance.date, date));

      const attendanceMap = new Map();
      for (const record of attendanceRecords) {
        if (!attendanceMap.has(record.user_id)) {
          attendanceMap.set(record.user_id, record);
        } else {
          const existing = attendanceMap.get(record.user_id);
          if (record.check_in_time && !existing.check_in_time) {
            existing.check_in_time = record.check_in_time;
          }
          if (record.check_out_time && !existing.check_out_time) {
            existing.check_out_time = record.check_out_time;
          }
        }
      }

      return allUsers.map(user => {
        const record = attendanceMap.get(user.id);
        return {
          user_id: user.id,
          username: user.username,
          display_name: user.display_name,
          display_name_ar: user.display_name_ar,
          role_name: user.role_name,
          role_name_ar: user.role_name_ar,
          attendance_id: record?.id || null,
          status: record?.status || 'غائب',
          check_in_time: record?.check_in_time || null,
          check_out_time: record?.check_out_time || null,
          date: date,
        };
      });
    } catch (error) {
      console.error("Error fetching attendance by date:", error);
      throw new Error("فشل في جلب بيانات الحضور");
    }
  }

  async createAttendance(data: InsertAttendance): Promise<Attendance> {
    return withDatabaseErrorHandling(
      async () => {
        const [att] = await db.insert(attendance).values(data).returning();
        return att;
      },
      "createAttendance",
      "إنشاء سجل حضور",
    );
  }

  async updateAttendance(id: number, updates: Partial<Attendance>): Promise<Attendance> {
    return withDatabaseErrorHandling(
      async () => {
        const [updated] = await db
          .update(attendance)
          .set({ ...updates, updated_at: new Date() })
          .where(eq(attendance.id, id))
          .returning();
        return updated;
      },
      "updateAttendance",
      `تحديث سجل الحضور ${id}`,
    );
  }

  async deleteAttendance(id: number): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await db.delete(attendance).where(eq(attendance.id, id));
      },
      "deleteAttendance",
      `حذف سجل الحضور ${id}`,
    );
  }

  async getAttendanceById(id: number): Promise<Attendance | null> {
    return withDatabaseErrorHandling(
      async () => {
        const [att] = await db.select().from(attendance).where(eq(attendance.id, id));
        return att || null;
      },
      "getAttendanceById",
      `جلب سجل الحضور ${id}`,
    );
  }

  async getAttendanceByUserAndDateRange(userId: number, start: string, end: string): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db
          .select()
          .from(attendance)
          .where(and(eq(attendance.user_id, userId), sql`${attendance.date} BETWEEN ${start} AND ${end}`))
          .orderBy(attendance.date);
      },
      "getAttendanceByUserAndDateRange",
      "جلب سجلات الحضور",
    );
  }

  async getAttendanceSummary(userId: number, start: Date, end: Date): Promise<any> {
    // Basic summary implementation
    return { presentDays: 0, lateMinutes: 0 };
  }

  async getAttendanceReport(start: Date, end: Date, filters?: any): Promise<any[]> {
    return [];
  }

  async getDailyAttendanceStats(date: string): Promise<any> {
    return { total: 0, present: 0, absent: 0 };
  }

  async upsertManualAttendance(entries: any[]): Promise<any[]> {
    const results = [];
    for (const entry of entries) {
      // Logic for upsert
    }
    return results;
  }

  async getDailyAttendanceStatus(userId: number, date: string): Promise<any> {
    return { status: 'غائب' };
  }

  async getAllWaste(): Promise<any[]> {
    return await db.select().from(waste).orderBy(desc(waste.id));
  }

  async createWaste(data: any): Promise<any> {
    const [w] = await db.insert(waste).values(data).returning();
    return w;
  }

  async getAllSections(): Promise<Section[]> {
    return await db.select().from(sections).orderBy(sections.name);
  }

  async getProductionSettings(): Promise<ProductionSettings | undefined> {
    const [s] = await db.select().from(production_settings).limit(1);
    return s;
  }

  async updateProductionSettings(updates: Partial<ProductionSettings>): Promise<ProductionSettings> {
    const [updated] = await db.update(production_settings).set(updates).returning();
    return updated;
  }

  async getAllInventory(): Promise<Inventory[]> {
    return await db.select().from(inventory).orderBy(inventory.id);
  }

  async updateInventory(id: number, updates: Partial<Inventory>): Promise<Inventory> {
    const [updated] = await db.update(inventory).set(updates).where(eq(inventory.id, id)).returning();
    return updated;
  }

  async createInventoryMovement(movement: InsertInventoryMovement): Promise<InventoryMovement> {
    const [m] = await db.insert(inventory_movements).values(movement).returning();
    return m;
  }

  async getInventoryMovements(itemId: number): Promise<InventoryMovement[]> {
    return await db.select().from(inventory_movements).where(eq(inventory_movements.item_id, itemId)).orderBy(desc(inventory_movements.created_at));
  }

  async getAllWarehouseReceipts(): Promise<WarehouseReceipt[]> {
    return await db.select().from(warehouse_receipts).orderBy(desc(warehouse_receipts.id));
  }

  async createWarehouseReceipt(data: InsertWarehouseReceipt): Promise<WarehouseReceipt> {
    const [r] = await db.insert(warehouse_receipts).values(data).returning();
    return r;
  }

  async getAllTrainingPrograms(): Promise<TrainingProgram[]> {
    return await db.select().from(training_programs).orderBy(desc(training_programs.id));
  }

  async createTrainingProgram(data: InsertTrainingProgram): Promise<TrainingProgram> {
    const [p] = await db.insert(training_programs).values(data).returning();
    return p;
  }

  async getTrainingProgramById(id: number): Promise<TrainingProgram | undefined> {
    const [p] = await db.select().from(training_programs).where(eq(training_programs.id, id));
    return p;
  }

  async getTrainingMaterials(programId: number): Promise<TrainingMaterial[]> {
    return await db.select().from(training_materials).where(eq(training_materials.program_id, programId));
  }

  async createTrainingMaterial(data: InsertTrainingMaterial): Promise<TrainingMaterial> {
    const [m] = await db.insert(training_materials).values(data).returning();
    return m;
  }

  async getTrainingEnrollments(programId: number): Promise<any[]> {
    return await db.select().from(training_enrollments).where(eq(training_enrollments.program_id, programId));
  }

  async enrollUserInProgram(data: InsertTrainingEnrollment): Promise<TrainingEnrollment> {
    const [e] = await db.insert(training_enrollments).values(data).returning();
    return e;
  }

  async updateEnrollment(id: number, updates: Partial<TrainingEnrollment>): Promise<TrainingEnrollment> {
    const [u] = await db.update(training_enrollments).set(updates).where(eq(training_enrollments.id, id)).returning();
    return u;
  }

  async createEvaluation(data: InsertTrainingEvaluation): Promise<TrainingEvaluation> {
    const [e] = await db.insert(training_evaluations).values(data).returning();
    return e;
  }

  async getCertificates(userId: number): Promise<TrainingCertificate[]> {
    return await db.select().from(training_certificates).where(eq(training_certificates.user_id, userId));
  }

  async createCertificate(data: InsertTrainingCertificate): Promise<TrainingCertificate> {
    const [c] = await db.insert(training_certificates).values(data).returning();
    return c;
  }

  async getPerformanceReviews(userId: number): Promise<PerformanceReview[]> {
    return await db.select().from(performance_reviews).where(eq(performance_reviews.user_id, userId)).orderBy(desc(performance_reviews.review_date));
  }

  async createPerformanceReview(data: InsertPerformanceReview): Promise<PerformanceReview> {
    const [r] = await db.insert(performance_reviews).values(data).returning();
    return r;
  }

  async getPerformanceCriteria(): Promise<PerformanceCriteria[]> {
    return await db.select().from(performance_criteria);
  }

  async getPerformanceRatings(reviewId: number): Promise<PerformanceRating[]> {
    return await db.select().from(performance_ratings).where(eq(performance_ratings.review_id, reviewId));
  }

  async createPerformanceRating(data: InsertPerformanceRating): Promise<PerformanceRating> {
    const [r] = await db.insert(performance_ratings).values(data).returning();
    return r;
  }

  async getLeaveTypes(): Promise<LeaveType[]> {
    return await db.select().from(leave_types);
  }

  async getLeaveRequests(userId?: number): Promise<any[]> {
    if (userId) return await db.select().from(leave_requests).where(eq(leave_requests.user_id, userId));
    return await db.select().from(leave_requests).orderBy(desc(leave_requests.created_at));
  }

  async createLeaveRequest(data: InsertLeaveRequest): Promise<LeaveRequest> {
    const [r] = await db.insert(leave_requests).values(data).returning();
    return r;
  }

  async updateLeaveRequest(id: number, updates: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const [u] = await db.update(leave_requests).set(updates).where(eq(leave_requests.id, id)).returning();
    return u;
  }

  async getLeaveBalances(userId: number): Promise<LeaveBalance[]> {
    return await db.select().from(leave_balances).where(eq(leave_balances.user_id, userId));
  }

  async getAllAdminDecisions(): Promise<AdminDecision[]> {
    return await db.select().from(admin_decisions).orderBy(desc(admin_decisions.id));
  }

  async createAdminDecision(data: any): Promise<AdminDecision> {
    const [d] = await db.insert(admin_decisions).values(data).returning();
    return d;
  }

  async getAllItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(items.name);
  }

  async getAllCustomerProducts(): Promise<CustomerProduct[]> {
    return await db.select().from(customer_products).orderBy(customer_products.name);
  }

  async getCustomerProductById(id: number): Promise<CustomerProduct | undefined> {
    const [p] = await db.select().from(customer_products).where(eq(customer_products.id, id));
    return p;
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(system_settings);
  }

  async updateSystemSetting(id: number, value: string): Promise<SystemSetting> {
    const [u] = await db.update(system_settings).set({ value }).where(eq(system_settings.id, id)).returning();
    return u;
  }

  async getFactoryLocations(): Promise<FactoryLocation[]> {
    return await db.select().from(factory_locations);
  }

  async createFactoryLocation(data: InsertFactoryLocation): Promise<FactoryLocation> {
    const [l] = await db.insert(factory_locations).values(data).returning();
    return l;
  }

  async getUserSettings(userId: number): Promise<UserSetting | undefined> {
    const [s] = await db.select().from(user_settings).where(eq(user_settings.user_id, userId));
    return s;
  }

  async updateUserSetting(userId: number, data: Partial<InsertUserSetting>): Promise<UserSetting> {
    const [u] = await db.update(user_settings).set(data).where(eq(user_settings.user_id, userId)).returning();
    return u;
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [n] = await db.insert(notifications).values(data).returning();
    return n;
  }

  async getNotifications(userId?: number, limit: number = 50, offset: number = 0): Promise<Notification[]> {
    if (userId) return await db.select().from(notifications).where(eq(notifications.recipient_id, userId.toString())).orderBy(desc(notifications.created_at)).limit(limit).offset(offset);
    return await db.select().from(notifications).orderBy(desc(notifications.created_at)).limit(limit).offset(offset);
  }

  async updateNotificationStatus(twilioSid: string, updates: Partial<Notification>): Promise<Notification> {
    const [u] = await db.update(notifications).set(updates).where(eq(notifications.twilio_sid, twilioSid)).returning();
    return u;
  }

  async getUserNotifications(userId: number, options?: any): Promise<Notification[]> {
    return await db.select().from(notifications).where(eq(notifications.recipient_id, userId.toString())).orderBy(desc(notifications.created_at));
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [u] = await db.update(notifications).set({ read_at: new Date() }).where(eq(notifications.id, id)).returning();
    return u;
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ read_at: new Date() }).where(eq(notifications.recipient_id, userId.toString()));
  }

  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const [c] = await db.select({ count: count() }).from(notifications).where(and(eq(notifications.recipient_id, userId.toString()), sql`${notifications.read_at} IS NULL`));
    return c?.count || 0;
  }

  async getSpareParts(): Promise<SparePart[]> {
    return await db.select().from(spare_parts);
  }

  async createSparePart(data: InsertSparePart): Promise<SparePart> {
    const [p] = await db.insert(spare_parts).values(data).returning();
    return p;
  }

  async getConsumableParts(): Promise<ConsumablePart[]> {
    return await db.select().from(consumable_parts);
  }

  async createConsumablePart(data: InsertConsumablePart): Promise<ConsumablePart> {
    const [p] = await db.insert(consumable_parts).values(data).returning();
    return p;
  }

  async getConsumablePartTransactions(partId: number): Promise<ConsumablePartTransaction[]> {
    return await db.select().from(consumable_parts_transactions).where(eq(consumable_parts_transactions.part_id, partId));
  }

  async createConsumablePartTransaction(data: InsertConsumablePartTransaction): Promise<ConsumablePartTransaction> {
    const [t] = await db.insert(consumable_parts_transactions).values(data).returning();
    return t;
  }

  async getMaintenanceActions(requestId: number): Promise<MaintenanceAction[]> {
    return await db.select().from(maintenance_actions).where(eq(maintenance_actions.request_id, requestId));
  }

  async createMaintenanceAction(data: InsertMaintenanceAction): Promise<MaintenanceAction> {
    const [a] = await db.insert(maintenance_actions).values(data).returning();
    return a;
  }

  async getMaintenanceReports(): Promise<MaintenanceReport[]> {
    return await db.select().from(maintenance_reports);
  }

  async createMaintenanceReport(data: InsertMaintenanceReport): Promise<MaintenanceReport> {
    const [r] = await db.insert(maintenance_reports).values(data).returning();
    return r;
  }

  async getOperatorNegligenceReports(): Promise<OperatorNegligenceReport[]> {
    return await db.select().from(operator_negligence_reports);
  }

  async createOperatorNegligenceReport(data: InsertOperatorNegligenceReport): Promise<OperatorNegligenceReport> {
    const [r] = await db.insert(operator_negligence_reports).values(data).returning();
    return r;
  }

  async getAllAlerts(options?: any): Promise<SystemAlert[]> {
    return await db.select().from(system_alerts).orderBy(desc(system_alerts.created_at));
  }

  async getAlertById(id: number): Promise<SystemAlert | undefined> {
    const [a] = await db.select().from(system_alerts).where(eq(system_alerts.id, id));
    return a;
  }

  async createAlert(data: InsertSystemAlert): Promise<SystemAlert> {
    const [a] = await db.insert(system_alerts).values(data).returning();
    return a;
  }

  async updateAlertStatus(id: number, status: string, userId?: number): Promise<SystemAlert> {
    const [u] = await db.update(system_alerts).set({ status }).where(eq(system_alerts.id, id)).returning();
    return u;
  }

  async getAlertRules(): Promise<AlertRule[]> {
    return await db.select().from(alert_rules);
  }

  async createAlertRule(data: InsertAlertRule): Promise<AlertRule> {
    const [r] = await db.insert(alert_rules).values(data).returning();
    return r;
  }

  async updateAlertRule(id: number, data: Partial<AlertRule>): Promise<AlertRule> {
    const [u] = await db.update(alert_rules).set(data).where(eq(alert_rules.id, id)).returning();
    return u;
  }

  async getSystemHealthChecks(limit: number = 50): Promise<SystemHealthCheck[]> {
    return await db.select().from(system_health_checks).orderBy(desc(system_health_checks.checked_at)).limit(limit);
  }

  async createSystemHealthCheck(data: InsertSystemHealthCheck): Promise<SystemHealthCheck> {
    const [c] = await db.insert(system_health_checks).values(data).returning();
    return c;
  }

  async getSystemPerformanceMetrics(options?: any): Promise<SystemPerformanceMetric[]> {
    return await db.select().from(system_performance_metrics).orderBy(desc(system_performance_metrics.timestamp));
  }

  async createSystemPerformanceMetric(data: InsertSystemPerformanceMetric): Promise<SystemPerformanceMetric> {
    const [m] = await db.insert(system_performance_metrics).values(data).returning();
    return m;
  }

  async getCorrectiveActions(alertId?: number): Promise<CorrectiveAction[]> {
    if (alertId) return await db.select().from(corrective_actions).where(eq(corrective_actions.alert_id, alertId));
    return await db.select().from(corrective_actions);
  }

  async createCorrectiveAction(data: InsertCorrectiveAction): Promise<CorrectiveAction> {
    const [a] = await db.insert(corrective_actions).values(data).returning();
    return a;
  }

  async updateCorrectiveAction(id: number, updates: Partial<CorrectiveAction>): Promise<CorrectiveAction> {
    const [u] = await db.update(corrective_actions).set(updates).where(eq(corrective_actions.id, id)).returning();
    return u;
  }

  async getSystemAnalytics(type?: string): Promise<SystemAnalytics[]> {
    if (type) return await db.select().from(system_analytics).where(eq(system_analytics.metric_type, type));
    return await db.select().from(system_analytics);
  }

  async createSystemAnalytics(data: InsertSystemAnalytics): Promise<SystemAnalytics> {
    const [a] = await db.insert(system_analytics).values(data).returning();
    return a;
  }

  async getQuickNotes(userId?: number): Promise<any[]> {
    if (userId) return await db.select().from(quick_notes).where(eq(quick_notes.created_by, userId));
    return await db.select().from(quick_notes);
  }

  async createQuickNote(data: InsertQuickNote): Promise<QuickNote> {
    const [n] = await db.insert(quick_notes).values(data).returning();
    return n;
  }

  async updateQuickNote(id: number, updates: Partial<QuickNote>): Promise<QuickNote> {
    const [u] = await db.update(quick_notes).set(updates).where(eq(quick_notes.id, id)).returning();
    return u;
  }

  async deleteQuickNote(id: number): Promise<void> {
    await db.delete(quick_notes).where(eq(quick_notes.id, id));
  }

  async createNoteAttachment(data: InsertNoteAttachment): Promise<NoteAttachment> {
    const [a] = await db.insert(note_attachments).values(data).returning();
    return a;
  }

  async getNoteAttachments(noteId: number): Promise<NoteAttachment[]> {
    return await db.select().from(note_attachments).where(eq(note_attachments.note_id, noteId));
  }

  async getMachineQueue(machineId: number): Promise<MachineQueue[]> {
    return await db.select().from(machine_queues).where(eq(machine_queues.machine_id, machineId)).orderBy(machine_queues.sort_order);
  }

  async updateMachineQueue(machineId: number, items: InsertMachineQueue[]): Promise<MachineQueue[]> {
    await db.delete(machine_queues).where(eq(machine_queues.machine_id, machineId));
    if (items.length === 0) return [];
    return await db.insert(machine_queues).values(items).returning();
  }

  async getMixingBatches(options?: any): Promise<MixingBatch[]> {
    return await db.select().from(mixing_batches).orderBy(desc(mixing_batches.created_at));
  }

  async getMixingBatchById(id: number): Promise<any> {
    const [b] = await db.select().from(mixing_batches).where(eq(mixing_batches.id, id));
    if (!b) return undefined;
    const ingredients = await db.select().from(batch_ingredients).where(eq(batch_ingredients.batch_id, id));
    return { ...b, ingredients };
  }

  async createMixingBatch(batch: InsertMixingBatch, ingredients: InsertBatchIngredient[]): Promise<MixingBatch> {
    const [createdBatch] = await db.insert(mixing_batches).values(batch).returning();
    if (ingredients.length > 0) {
      const ingredientsToInsert = ingredients.map(i => ({ ...i, batch_id: createdBatch.id }));
      await db.insert(batch_ingredients).values(ingredientsToInsert);
    }
    return createdBatch;
  }

  async updateMixingBatchStatus(id: number, status: string): Promise<MixingBatch> {
    const [u] = await db.update(mixing_batches).set({ status, updated_at: new Date() }).where(eq(mixing_batches.id, id)).returning();
    return u;
  }

  async getMasterBatchColors(): Promise<MasterBatchColor[]> {
    return await db.select().from(master_batch_colors);
  }

  async createMasterBatchColor(data: InsertMasterBatchColor): Promise<MasterBatchColor> {
    const [c] = await db.insert(master_batch_colors).values(data).returning();
    return c;
  }

  async getRawMaterialVouchersIn(): Promise<RawMaterialVoucherIn[]> {
    return await db.select().from(raw_material_vouchers_in).orderBy(desc(raw_material_vouchers_in.id));
  }

  async getRawMaterialVoucherInById(id: number): Promise<RawMaterialVoucherIn | undefined> {
    const [v] = await db.select().from(raw_material_vouchers_in).where(eq(raw_material_vouchers_in.id, id));
    return v;
  }

  async createRawMaterialVoucherIn(data: any): Promise<RawMaterialVoucherIn> {
    const [v] = await db.insert(raw_material_vouchers_in).values(data).returning();
    return v;
  }

  async getRawMaterialVouchersOut(): Promise<RawMaterialVoucherOut[]> {
    return await db.select().from(raw_material_vouchers_out).orderBy(desc(raw_material_vouchers_out.id));
  }

  async getRawMaterialVoucherOutById(id: number): Promise<RawMaterialVoucherOut | undefined> {
    const [v] = await db.select().from(raw_material_vouchers_out).where(eq(raw_material_vouchers_out.id, id));
    return v;
  }

  async createRawMaterialVoucherOut(data: any): Promise<RawMaterialVoucherOut> {
    const [v] = await db.insert(raw_material_vouchers_out).values(data).returning();
    return v;
  }

  async getFinishedGoodsVouchersIn(): Promise<FinishedGoodsVoucherIn[]> {
    return await db.select().from(finished_goods_vouchers_in).orderBy(desc(finished_goods_vouchers_in.id));
  }

  async getFinishedGoodsVoucherInById(id: number): Promise<FinishedGoodsVoucherIn | undefined> {
    const [v] = await db.select().from(finished_goods_vouchers_in).where(eq(finished_goods_vouchers_in.id, id));
    return v;
  }

  async createFinishedGoodsVoucherIn(data: any): Promise<FinishedGoodsVoucherIn> {
    const [v] = await db.insert(finished_goods_vouchers_in).values(data).returning();
    return v;
  }

  async getFinishedGoodsVouchersOut(): Promise<FinishedGoodsVoucherOut[]> {
    return await db.select().from(finished_goods_vouchers_out).orderBy(desc(finished_goods_vouchers_out.id));
  }

  async getFinishedGoodsVoucherOutById(id: number): Promise<FinishedGoodsVoucherOut | undefined> {
    const [v] = await db.select().from(finished_goods_vouchers_out).where(eq(finished_goods_vouchers_out.id, id));
    return v;
  }

  async createFinishedGoodsVoucherOut(data: any): Promise<FinishedGoodsVoucherOut> {
    const [v] = await db.insert(finished_goods_vouchers_out).values(data).returning();
    return v;
  }

  async getWarehouseVouchersStats(): Promise<any> {
    return { total: 0 };
  }

  async getInventoryCounts(): Promise<InventoryCount[]> {
    return await db.select().from(inventory_counts).orderBy(desc(inventory_counts.id));
  }

  async getInventoryCountById(id: number): Promise<any> {
    const [c] = await db.select().from(inventory_counts).where(eq(inventory_counts.id, id));
    return c;
  }

  async createInventoryCount(data: InsertInventoryCount): Promise<InventoryCount> {
    const [c] = await db.insert(inventory_counts).values(data).returning();
    return c;
  }

  async createInventoryCountItem(data: InsertInventoryCountItem): Promise<InventoryCountItem> {
    const [i] = await db.insert(inventory_count_items).values(data).returning();
    return i;
  }

  async completeInventoryCount(id: number, userId: number): Promise<InventoryCount> {
    const [u] = await db.update(inventory_counts).set({ status: 'completed', approved_by: userId, approved_at: new Date() }).where(eq(inventory_counts.id, id)).returning();
    return u;
  }

  async lookupByBarcode(barcode: string): Promise<any> {
    return null;
  }

  async getAllNotificationEventSettings(): Promise<NotificationEventSetting[]> {
    return await db.select().from(notification_event_settings);
  }

  async getNotificationEventSettingById(id: number): Promise<NotificationEventSetting | undefined> {
    const [s] = await db.select().from(notification_event_settings).where(eq(notification_event_settings.id, id));
    return s;
  }

  async getNotificationEventSettingByKey(key: string): Promise<NotificationEventSetting | undefined> {
    const [s] = await db.select().from(notification_event_settings).where(eq(notification_event_settings.event_key, key));
    return s;
  }

  async createNotificationEventSetting(data: InsertNotificationEventSetting): Promise<NotificationEventSetting> {
    const [s] = await db.insert(notification_event_settings).values(data).returning();
    return s;
  }

  async updateNotificationEventSetting(id: number, updates: Partial<NotificationEventSetting>): Promise<NotificationEventSetting> {
    const [u] = await db.update(notification_event_settings).set(updates).where(eq(notification_event_settings.id, id)).returning();
    return u;
  }

  async deleteNotificationEventSetting(id: number): Promise<void> {
    await db.delete(notification_event_settings).where(eq(notification_event_settings.id, id));
  }

  async getNotificationEventLogs(options?: any): Promise<NotificationEventLog[]> {
    return await db.select().from(notification_event_logs).orderBy(desc(notification_event_logs.triggered_at));
  }

  async createNotificationEventLog(data: InsertNotificationEventLog): Promise<NotificationEventLog> {
    const [l] = await db.insert(notification_event_logs).values(data).returning();
    return l;
  }

  async updateNotificationEventLog(id: number, updates: Partial<NotificationEventLog>): Promise<NotificationEventLog> {
    const [u] = await db.update(notification_event_logs).set(updates).where(eq(notification_event_logs.id, id)).returning();
    return u;
  }

  async getFactorySnapshots(userId?: number): Promise<FactorySnapshot[]> {
    if (userId) return await db.select().from(factory_snapshots).where(eq(factory_snapshots.created_by, userId)).orderBy(desc(factory_snapshots.created_at));
    return await db.select().from(factory_snapshots).orderBy(desc(factory_snapshots.created_at));
  }

  async getFactorySnapshot(id: number): Promise<FactorySnapshot | undefined> {
    const [s] = await db.select().from(factory_snapshots).where(eq(factory_snapshots.id, id));
    return s;
  }

  async getFactorySnapshotByToken(token: string): Promise<FactorySnapshot | undefined> {
    const [s] = await db.select().from(factory_snapshots).where(eq(factory_snapshots.share_token, token));
    return s;
  }

  async createFactorySnapshot(data: InsertFactorySnapshot): Promise<FactorySnapshot> {
    const [s] = await db.insert(factory_snapshots).values(data).returning();
    return s;
  }

  async deleteFactorySnapshot(id: number): Promise<void> {
    await db.delete(factory_snapshots).where(eq(factory_snapshots.id, id));
  }

  async getDisplaySlides(): Promise<DisplaySlide[]> {
    return await db.select().from(display_slides).orderBy(display_slides.sort_order);
  }

  async getActiveDisplaySlides(): Promise<DisplaySlide[]> {
    return await db.select().from(display_slides).where(eq(display_slides.is_active, true)).orderBy(display_slides.sort_order);
  }

  async getDisplaySlideById(id: number): Promise<DisplaySlide | undefined> {
    const [s] = await db.select().from(display_slides).where(eq(display_slides.id, id));
    return s;
  }

  async createDisplaySlide(data: InsertDisplaySlide): Promise<DisplaySlide> {
    const [s] = await db.insert(display_slides).values(data).returning();
    return s;
  }

  async updateDisplaySlide(id: number, updates: Partial<DisplaySlide>): Promise<DisplaySlide> {
    const [u] = await db.update(display_slides).set({ ...updates, updated_at: new Date() }).where(eq(display_slides.id, id)).returning();
    return u;
  }

  async deleteDisplaySlide(id: number): Promise<void> {
    await db.delete(display_slides).where(eq(display_slides.id, id));
  }

  async exists(table: string, field: string, value: any): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${field} = $1)`,
        [value]
      );
      return result.rows[0].exists;
    } catch (error) {
      console.error(`Error checking existence in ${table}.${field}:`, error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();

// Export function to set notification manager from external modules
export { setNotificationManager };
