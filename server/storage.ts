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
  
  quality_issues,
  quality_issue_responsibles,
  quality_issue_actions,
  type QualityIssue,
  type InsertQualityIssue,
  type QualityIssueResponsible,
  type InsertQualityIssueResponsible,
  type QualityIssueAction,
  type InsertQualityIssueAction,

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
  getMachineById(id: string | number): Promise<Machine | undefined>;

  // Customers
  getAllCustomers(): Promise<Customer[]>;
  getCustomerById(id: string | number): Promise<Customer | undefined>;

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
  getInventoryMovements(itemId?: number): Promise<any[]>;
  
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
  getAlertRules(isEnabled?: boolean): Promise<AlertRule[]>;
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
  
  // Alert Aliases (used by routes/alerts.ts and services/alert-manager.ts)
  getSystemAlerts(options?: any): Promise<SystemAlert[]>;
  getSystemAlertById(id: number): Promise<SystemAlert | undefined>;
  createSystemAlert(data: InsertSystemAlert): Promise<SystemAlert>;
  resolveSystemAlert(id: number, userId: number, notes?: string): Promise<SystemAlert>;
  dismissSystemAlert(id: number, userId: number): Promise<SystemAlert>;
  updateSystemAlert(id: number, data: Partial<SystemAlert>): Promise<SystemAlert>;
  getActiveAlertsCount(): Promise<number>;
  getCriticalAlertsCount(): Promise<number>;
  getAlertsByType(type: string): Promise<SystemAlert[]>;
  getAlertsByUser(userId: number): Promise<SystemAlert[]>;
  
  // System Health Aliases
  getSystemHealthStatus(): Promise<any>;
  getHealthChecksByType(type: string): Promise<SystemHealthCheck[]>;
  getCriticalHealthChecks(): Promise<SystemHealthCheck[]>;
  
  // Performance Aliases
  getPerformanceSummary(timeRange: string): Promise<any>;
  getMetricsByTimeRange(name: string, start: Date, end: Date): Promise<SystemPerformanceMetric[]>;
  getLatestMetricValue(name: string): Promise<SystemPerformanceMetric | undefined>;
  
  // Corrective Action Aliases
  getPendingActions(): Promise<CorrectiveAction[]>;
  getActionsByAssignee(userId: number): Promise<CorrectiveAction[]>;
  completeCorrectiveAction(id: number, userId: number, notes?: string): Promise<CorrectiveAction>;
  
  // User Aliases
  getUserById(id: number): Promise<User | undefined>;
  
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
  getProductionOrdersForReceipt(): Promise<any[]>;
  updateProductionOrderReceivedKg(id: number, additionalKg: number): Promise<void>;
  getFinishedGoodsStock(): Promise<any[]>;
  updateFinishedGoodsStock(itemId: string, quantityChange: number, locationId?: number): Promise<void>;
  
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
        const validation = await this.dataValidator.validateData("users", insertUser);
        if (!validation.isValid) {
          throw new Error(`خطأ في البيانات: ${validation.errors.map(e => e.message_ar).join(', ')}`);
        }

        const dataToInsert = { ...insertUser };
        if (dataToInsert.password) {
          let isAlreadyHashed = false;
          try {
            bcrypt.getRounds(dataToInsert.password);
            isAlreadyHashed = true;
          } catch {
            isAlreadyHashed = false;
          }
          if (!isAlreadyHashed) {
            dataToInsert.password = await bcrypt.hash(dataToInsert.password, 10);
          }
        }

        const [user] = await db.insert(users).values(dataToInsert).returning();
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
            full_name: users.full_name,
            phone: users.phone,
            email: users.email,
            role_id: users.role_id,
            section_id: users.section_id,
            status: users.status,
            replit_user_id: users.replit_user_id,
            first_name: users.first_name,
            last_name: users.last_name,
            profile_image_url: users.profile_image_url,
            created_at: users.created_at,
            updated_at: users.updated_at,
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
            full_name: users.full_name,
            phone: users.phone,
            email: users.email,
            role_id: users.role_id,
            section_id: users.section_id,
            status: users.status,
            replit_user_id: users.replit_user_id,
            first_name: users.first_name,
            last_name: users.last_name,
            profile_image_url: users.profile_image_url,
            created_at: users.created_at,
            updated_at: users.updated_at,
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
            full_name: users.full_name,
            phone: users.phone,
            email: users.email,
            role_id: users.role_id,
            section_id: users.section_id,
            status: users.status,
            replit_user_id: users.replit_user_id,
            first_name: users.first_name,
            last_name: users.last_name,
            profile_image_url: users.profile_image_url,
            created_at: users.created_at,
            updated_at: users.updated_at,
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
          .set({ ...orderUpdates })
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
          .set({ status })
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
        await db.transaction(async (tx) => {
          const relatedPOs = await tx
            .select({ id: production_orders.id })
            .from(production_orders)
            .where(eq(production_orders.order_id, id));
          const poIds = relatedPOs.map(po => po.id);

          if (poIds.length > 0) {
            await tx.delete(waste).where(inArray(waste.production_order_id, poIds));
            await tx.delete(machine_queues).where(inArray(machine_queues.production_order_id, poIds));
            await tx.delete(mixing_batches).where(inArray(mixing_batches.production_order_id, poIds));
            await tx.delete(warehouse_receipts).where(inArray(warehouse_receipts.production_order_id, poIds));
            await tx.delete(finished_goods_vouchers_in).where(inArray(finished_goods_vouchers_in.production_order_id, poIds));
            await tx.delete(raw_material_vouchers_out).where(inArray(raw_material_vouchers_out.production_order_id, poIds));
            await tx.delete(rolls).where(inArray(rolls.production_order_id, poIds));
          }

          await tx.delete(production_orders).where(eq(production_orders.order_id, id));
          await tx.delete(orders).where(eq(orders.id, id));
        });
        invalidateProductionCache();
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
            delivery_date: orders.delivery_date,
            status: orders.status,
          })
          .from(orders)
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .where(eq(orders.status, "in_production"))
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

  async getAllProductionOrders(): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        const operatorUser = alias(users, 'operator_user');
        const result = await db
          .select({
            id: production_orders.id,
            production_order_number: production_orders.production_order_number,
            order_id: production_orders.order_id,
            customer_product_id: production_orders.customer_product_id,
            quantity_kg: production_orders.quantity_kg,
            overrun_percentage: production_orders.overrun_percentage,
            final_quantity_kg: production_orders.final_quantity_kg,
            produced_quantity_kg: production_orders.produced_quantity_kg,
            printed_quantity_kg: production_orders.printed_quantity_kg,
            net_quantity_kg: production_orders.net_quantity_kg,
            waste_quantity_kg: production_orders.waste_quantity_kg,
            film_completion_percentage: production_orders.film_completion_percentage,
            printing_completion_percentage: production_orders.printing_completion_percentage,
            cutting_completion_percentage: production_orders.cutting_completion_percentage,
            assigned_machine_id: production_orders.assigned_machine_id,
            assigned_operator_id: production_orders.assigned_operator_id,
            production_start_time: production_orders.production_start_time,
            production_end_time: production_orders.production_end_time,
            production_time_minutes: production_orders.production_time_minutes,
            film_completed: production_orders.film_completed,
            printing_completed: production_orders.printing_completed,
            cutting_completed: production_orders.cutting_completed,
            is_final_roll_created: production_orders.is_final_roll_created,
            warehouse_received_kg: production_orders.warehouse_received_kg,
            status: production_orders.status,
            order_number: orders.order_number,
            customer_id: customers.id,
            customer_name: customers.name,
            customer_name_ar: customers.name_ar,
            size_caption: customer_products.size_caption,
            is_printed: customer_products.is_printed,
            item_id: customer_products.item_id,
            machine_name: machines.name,
            machine_name_ar: machines.name_ar,
            operator_name: operatorUser.display_name,
            operator_name_ar: operatorUser.display_name_ar,
          })
          .from(production_orders)
          .leftJoin(orders, eq(production_orders.order_id, orders.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
          .leftJoin(machines, eq(production_orders.assigned_machine_id, machines.id))
          .leftJoin(operatorUser, eq(production_orders.assigned_operator_id, operatorUser.id))
          .orderBy(desc(production_orders.id));
        return result;
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

  async createProductionOrder(po: InsertProductionOrder, extra?: { final_quantity_kg?: number }): Promise<ProductionOrder> {
    return withDatabaseErrorHandling(
      async () => {
        const validation = await this.dataValidator.validateData("production_orders", po);
        if (!validation.isValid) {
          throw new Error(`خطأ في البيانات: ${validation.errors.map(e => e.message_ar).join(', ')}`);
        }

        const newPo = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(1001)`);

          const result = await tx.execute(
            sql`SELECT MAX(CAST(SUBSTRING(production_order_number FROM 3) AS INTEGER)) as max_num
                FROM production_orders
                WHERE production_order_number ~ '^PO[0-9]+$'`
          );
          const maxNum = (result as any).rows?.[0]?.max_num || 0;
          const nextNumber = maxNum + 1;
          const productionOrderNumber = `PO${nextNumber.toString().padStart(3, "0")}`;

          const insertValues: any = {
            ...po,
            production_order_number: productionOrderNumber,
          };
          if (extra?.final_quantity_kg !== undefined) {
            insertValues.final_quantity_kg = extra.final_quantity_kg.toString();
          }

          const [created] = await tx.insert(production_orders).values(insertValues).returning();
          return created;
        });

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
            results.failed.push({ order: po, error: (e as any).message });
          }
        }
        return results;
      },
      "createProductionOrdersBatch",
      "إنشاء دفعة أوامر إنتاج",
    );
  }

  async createProductionOrdersBatchWithFinalQty(batch: Array<{ data: InsertProductionOrder; finalQuantityKg: number }>): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const results = { successful: [] as ProductionOrder[], failed: [] as Array<{ order: InsertProductionOrder; error: string }> };
        for (const { data, finalQuantityKg } of batch) {
          try {
            const created = await this.createProductionOrder(data, { final_quantity_kg: finalQuantityKg });
            results.successful.push(created);
          } catch (e: any) {
            results.failed.push({ order: data, error: e.message });
          }
        }
        return results;
      },
      "createProductionOrdersBatchWithFinalQty",
      "إنشاء دفعة أوامر إنتاج مع الكمية النهائية",
    );
  }

  async updateProductionOrder(id: number, updates: Partial<ProductionOrder>): Promise<ProductionOrder> {
    return withDatabaseErrorHandling(
      async () => {
        const [updated] = await db
          .update(production_orders)
          .set({ ...updates })
          .where(eq(production_orders.id, id))
          .returning();
        invalidateProductionCache();
        return updated;
      },
      "updateProductionOrder",
      `تحديث أمر الإنتاج ${id}`,
    );
  }

  async updateProductionOrdersStatusByOrder(orderId: number, fromStatuses: string[], toStatus: string): Promise<void> {
    await db
      .update(production_orders)
      .set({ status: toStatus, updated_at: new Date() } as any)
      .where(and(eq(production_orders.order_id, orderId), inArray(production_orders.status, fromStatuses)));
    invalidateProductionCache();
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
          .set({ ...updates })
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

  async getMachineById(id: string | number): Promise<Machine | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [m] = await db.select().from(machines).where(eq(machines.id, String(id)));
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

  async getCustomerById(id: string | number): Promise<Customer | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [c] = await db.select().from(customers).where(eq(customers.id, String(id)));
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
          .set({ ...updates })
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
        return await db.select().from(quality_checks).where(eq(quality_checks.target_id, rollId));
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
    const records = await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(attendance.user_id, userId),
          eq(attendance.date, date)
        )
      )
      .orderBy(desc(attendance.created_at));

    if (records.length === 0) {
      return {
        status: 'غائب',
        currentStatus: 'غائب',
        hasCheckedIn: false,
        hasStartedLunch: false,
        hasEndedLunch: false,
        hasCheckedOut: false,
      };
    }

    const latest = records[0];
    const hasCheckedIn = records.some(r => r.status === 'حاضر');
    const hasStartedLunch = records.some(r => r.status === 'في الاستراحة');
    const hasEndedLunch = records.some(r => r.status === 'يعمل');
    const hasCheckedOut = records.some(r => r.status === 'مغادر');

    return {
      status: latest.status,
      currentStatus: latest.status,
      hasCheckedIn,
      hasStartedLunch,
      hasEndedLunch,
      hasCheckedOut,
      check_in_time: records.find(r => r.status === 'حاضر')?.check_in_time || latest.check_in_time,
      check_out_time: records.find(r => r.status === 'مغادر')?.check_out_time || latest.check_out_time,
      lunch_start_time: records.find(r => r.status === 'في الاستراحة')?.lunch_start_time || latest.lunch_start_time,
      lunch_end_time: records.find(r => r.status === 'يعمل')?.lunch_end_time || latest.lunch_end_time,
      work_hours: latest.work_hours,
      records: records,
    };
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

  async getInventoryMovements(itemId?: number): Promise<any[]> {
    const query = db
      .select({
        id: inventory_movements.id,
        inventory_id: inventory_movements.inventory_id,
        movement_type: inventory_movements.movement_type,
        quantity: inventory_movements.quantity,
        reference_number: inventory_movements.reference_number,
        reference_type: inventory_movements.reference_type,
        notes: inventory_movements.notes,
        created_by: inventory_movements.created_by,
        created_at: inventory_movements.created_at,
        item_name: items.name,
        item_name_ar: items.name_ar,
        item_code: items.id,
        user_name: users.display_name_ar,
      })
      .from(inventory_movements)
      .leftJoin(inventory, eq(inventory_movements.inventory_id, inventory.id))
      .leftJoin(items, eq(inventory.item_id, items.id))
      .leftJoin(users, eq(inventory_movements.created_by, users.id))
      .orderBy(desc(inventory_movements.created_at));

    if (itemId) {
      return await query.where(eq(inventory_movements.inventory_id, itemId));
    }
    return await query;
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
    return await db.select().from(training_certificates).where(eq(training_certificates.employee_id, userId));
  }

  async createCertificate(data: InsertTrainingCertificate): Promise<TrainingCertificate> {
    const [c] = await db.insert(training_certificates).values(data).returning();
    return c;
  }

  async getPerformanceReviews(userId: number): Promise<PerformanceReview[]> {
    return await db.select().from(performance_reviews).where(eq(performance_reviews.employee_id, String(userId))).orderBy(desc(performance_reviews.review_period_end));
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
    if (userId) return await db.select().from(leave_requests).where(eq(leave_requests.employee_id, String(userId)));
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
    return await db.select().from(leave_balances).where(eq(leave_balances.employee_id, String(userId)));
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
    return await db.select().from(customer_products).orderBy(customer_products.id);
  }

  async getCustomerProductById(id: number): Promise<CustomerProduct | undefined> {
    const [p] = await db.select().from(customer_products).where(eq(customer_products.id, id));
    return p;
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    return await db.select().from(system_settings);
  }

  async updateSystemSetting(id: number, value: string): Promise<SystemSetting> {
    const [u] = await db.update(system_settings).set({ setting_value: value }).where(eq(system_settings.id, id)).returning();
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
    const [s] = await db.select().from(user_settings).where(eq(user_settings.user_id, String(userId)));
    return s;
  }

  async updateUserSetting(userId: number, data: Partial<InsertUserSetting>): Promise<UserSetting> {
    const [u] = await db.update(user_settings).set(data).where(eq(user_settings.user_id, String(userId))).returning();
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
    return await db.select().from(consumable_parts_transactions).where(eq(consumable_parts_transactions.consumable_part_id, partId));
  }

  async createConsumablePartTransaction(data: InsertConsumablePartTransaction): Promise<ConsumablePartTransaction> {
    const [t] = await db.insert(consumable_parts_transactions).values(data).returning();
    return t;
  }

  async getMaintenanceActions(requestId: number): Promise<MaintenanceAction[]> {
    return await db.select().from(maintenance_actions).where(eq(maintenance_actions.maintenance_request_id, requestId));
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

  async getAlertRules(isEnabled?: boolean): Promise<AlertRule[]> {
    if (isEnabled !== undefined) {
      return await db.select().from(alert_rules).where(eq(alert_rules.is_enabled, isEnabled));
    }
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
    return await db.select().from(system_health_checks).orderBy(desc(system_health_checks.last_check_time)).limit(limit);
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

  async getSystemAlerts(options?: any): Promise<SystemAlert[]> {
    return this.getAllAlerts(options);
  }

  async getSystemAlertById(id: number): Promise<SystemAlert | undefined> {
    return this.getAlertById(id);
  }

  async createSystemAlert(data: InsertSystemAlert): Promise<SystemAlert> {
    return this.createAlert(data);
  }

  async resolveSystemAlert(id: number, userId: number, notes?: string): Promise<SystemAlert> {
    return this.updateAlertStatus(id, 'resolved', userId);
  }

  async dismissSystemAlert(id: number, userId: number): Promise<SystemAlert> {
    return this.updateAlertStatus(id, 'dismissed', userId);
  }

  async updateSystemAlert(id: number, data: Partial<SystemAlert>): Promise<SystemAlert> {
    const [u] = await db.update(system_alerts).set(data).where(eq(system_alerts.id, id)).returning();
    return u;
  }

  async getActiveAlertsCount(): Promise<number> {
    const [r] = await db.select({ count: count() }).from(system_alerts).where(eq(system_alerts.status, 'active'));
    return r?.count || 0;
  }

  async getCriticalAlertsCount(): Promise<number> {
    const [r] = await db.select({ count: count() }).from(system_alerts).where(and(eq(system_alerts.severity, 'critical'), eq(system_alerts.status, 'active')));
    return r?.count || 0;
  }

  async getAlertsByType(type: string): Promise<SystemAlert[]> {
    return await db.select().from(system_alerts).where(eq(system_alerts.type, type)).orderBy(desc(system_alerts.created_at));
  }

  async getAlertsByUser(userId: number): Promise<SystemAlert[]> {
    return await db.select().from(system_alerts).where(sql`${userId} = ANY(${system_alerts.target_users})`).orderBy(desc(system_alerts.created_at));
  }

  async getSystemHealthStatus(): Promise<any> {
    const checks = await this.getSystemHealthChecks(20);
    const healthyCount = checks.filter(c => c.status === 'healthy').length;
    return { status: healthyCount === checks.length ? 'healthy' : 'degraded', checks, totalChecks: checks.length, healthyChecks: healthyCount };
  }

  async getHealthChecksByType(type: string): Promise<SystemHealthCheck[]> {
    return await db.select().from(system_health_checks).where(eq(system_health_checks.check_type, type)).orderBy(desc(system_health_checks.last_check_time));
  }

  async getCriticalHealthChecks(): Promise<SystemHealthCheck[]> {
    return await db.select().from(system_health_checks).where(eq(system_health_checks.status, 'critical')).orderBy(desc(system_health_checks.last_check_time));
  }

  async getPerformanceSummary(timeRange: string): Promise<any> {
    const metrics = await this.getSystemPerformanceMetrics({ limit: 100 });
    return { timeRange, metrics, count: metrics.length };
  }

  async getMetricsByTimeRange(name: string, start: Date, end: Date): Promise<SystemPerformanceMetric[]> {
    return await db.select().from(system_performance_metrics)
      .where(and(eq(system_performance_metrics.metric_name, name), sql`${system_performance_metrics.timestamp} BETWEEN ${start} AND ${end}`))
      .orderBy(system_performance_metrics.timestamp);
  }

  async getLatestMetricValue(name: string): Promise<SystemPerformanceMetric | undefined> {
    const [m] = await db.select().from(system_performance_metrics)
      .where(eq(system_performance_metrics.metric_name, name))
      .orderBy(desc(system_performance_metrics.timestamp))
      .limit(1);
    return m;
  }

  async getPendingActions(): Promise<CorrectiveAction[]> {
    return await db.select().from(corrective_actions).where(eq(corrective_actions.status, 'pending')).orderBy(desc(corrective_actions.created_at));
  }

  async getActionsByAssignee(userId: number): Promise<CorrectiveAction[]> {
    return await db.select().from(corrective_actions).where(eq(corrective_actions.assigned_to, userId)).orderBy(desc(corrective_actions.created_at));
  }

  async completeCorrectiveAction(id: number, userId: number, notes?: string): Promise<CorrectiveAction> {
    return this.updateCorrectiveAction(id, { status: 'completed', completed_by: userId, completed_at: new Date(), completion_notes: notes } as any);
  }

  async getUserById(id: number): Promise<User | undefined> {
    return this.getUser(id);
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
    return await db.select().from(machine_queues).where(eq(machine_queues.machine_id, String(machineId))).orderBy(machine_queues.queue_position);
  }

  async updateMachineQueue(machineId: number, items: InsertMachineQueue[]): Promise<MachineQueue[]> {
    await db.delete(machine_queues).where(eq(machine_queues.machine_id, String(machineId)));
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
    return await db.transaction(async (tx) => {
      const [createdBatch] = await tx.insert(mixing_batches).values(batch).returning();
      if (ingredients.length > 0) {
        const ingredientsToInsert = ingredients.map(i => ({ ...i, batch_id: createdBatch.id }));
        await tx.insert(batch_ingredients).values(ingredientsToInsert);
      }
      return createdBatch;
    });
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
    const receiptItems: any[] = data.items || [];
    const now = new Date();

    if (receiptItems.length > 0) {
      let totalWeight = 0;
      const validatedItems: any[] = [];

      const mergedByPo = new Map<number, { weight: number; item: any }>();
      for (const item of receiptItems) {
        const poId = typeof item.production_order_id === 'string' ? parseInt(item.production_order_id) : item.production_order_id;
        const weight = parseFloat(String(item.weight_kg || '0'));
        if (weight <= 0) continue;
        const existing = mergedByPo.get(poId);
        if (existing) {
          existing.weight += weight;
        } else {
          mergedByPo.set(poId, { weight, item });
        }
      }

      for (const [poId, { weight, item }] of mergedByPo) {
        const [po] = await db.select().from(production_orders).where(eq(production_orders.id, poId));
        if (!po) {
          throw new Error(`أمر الإنتاج رقم ${poId} غير موجود`);
        }

        const cutWeightResult = await db.execute(sql`
          SELECT COALESCE(SUM(cut_weight_total_kg), 0) AS total_cut_weight
          FROM rolls
          WHERE production_order_id = ${poId} AND stage = 'done'
        `);
        const totalCutWeight = parseFloat(String((cutWeightResult.rows[0] as any)?.total_cut_weight || '0'));
        const alreadyReceived = parseFloat(String(po.warehouse_received_kg || '0'));
        const remaining = totalCutWeight - alreadyReceived;

        if (remaining <= 0) {
          throw new Error(`تم استلام كامل الكمية لأمر الإنتاج ${po.production_order_number} مسبقاً`);
        }
        if (weight > remaining + 0.01) {
          throw new Error(`الكمية المطلوبة (${weight} كجم) تتجاوز الكمية المتبقية (${remaining.toFixed(3)} كجم) لأمر الإنتاج ${po.production_order_number}`);
        }

        totalWeight += weight;
        validatedItems.push({
          production_order_id: poId,
          production_order_number: po.production_order_number,
          weight_kg: weight,
          product_description: item.product_description || '',
          customer_id: item.customer_id || data.customer_id,
          customer_name: item.customer_name || '',
          order_number: item.order_number || '',
          item_id: item.item_id || data.item_id,
        });
      }

      if (validatedItems.length === 0) {
        throw new Error("لم يتم إدخال أي كميات صالحة");
      }

      const voucherData: any = {
        voucher_number: data.voucher_number,
        voucher_type: data.voucher_type || 'production_receipt',
        voucher_date: now,
        receipt_time: now,
        quantity: totalWeight.toString(),
        weight_kg: totalWeight.toString(),
        unit: data.unit || 'kg',
        notes: data.notes || null,
        items: JSON.stringify(validatedItems),
        production_order_id: validatedItems.length === 1 ? validatedItems[0].production_order_id : null,
        customer_id: data.customer_id || validatedItems[0].customer_id || null,
        item_id: data.item_id || validatedItems[0].item_id || null,
        created_by: data.created_by,
        status: 'completed',
      };

      return await db.transaction(async (tx) => {
        const [v] = await tx.insert(finished_goods_vouchers_in).values(voucherData).returning();

        for (const item of validatedItems) {
          await tx
            .update(production_orders)
            .set({
              warehouse_received_kg: sql`CAST(${production_orders.warehouse_received_kg} AS NUMERIC) + ${item.weight_kg}`,
            })
            .where(eq(production_orders.id, item.production_order_id));
        }

        if (data.item_id) {
          const locId = data.location_id ? (typeof data.location_id === 'string' ? parseInt(data.location_id) : data.location_id) : null;
          const conditions = locId
            ? and(eq(inventory.item_id, data.item_id), eq(inventory.location_id, locId))
            : eq(inventory.item_id, data.item_id);
          const existing = await tx.select().from(inventory).where(conditions as any);

          if (existing.length > 0) {
            await tx
              .update(inventory)
              .set({
                current_stock: sql`CAST(${inventory.current_stock} AS NUMERIC) + ${totalWeight}`,
                last_updated: new Date(),
              })
              .where(eq(inventory.id, existing[0].id));
          } else {
            await tx.insert(inventory).values({
              item_id: data.item_id,
              location_id: locId,
              current_stock: String(totalWeight),
              unit: 'كيلو',
            } as any);
          }
        }

        return v;
      });
    }

    const poId = data.production_order_id
      ? (typeof data.production_order_id === 'string' ? parseInt(data.production_order_id) : data.production_order_id)
      : null;

    if (poId) {
      const [po] = await db.select().from(production_orders).where(eq(production_orders.id, poId));
      if (!po) {
        throw new Error("أمر الإنتاج غير موجود");
      }

      const cutWeightResult = await db.execute(sql`
        SELECT COALESCE(SUM(cut_weight_total_kg), 0) AS total_cut_weight
        FROM rolls
        WHERE production_order_id = ${poId} AND stage = 'done'
      `);
      const totalCutWeight = parseFloat(String((cutWeightResult.rows[0] as any)?.total_cut_weight || '0'));
      const alreadyReceived = parseFloat(String(po.warehouse_received_kg || '0'));
      const remaining = totalCutWeight - alreadyReceived;
      const receiveQty = parseFloat(String(data.weight_kg || data.quantity || '0'));

      if (remaining <= 0) {
        throw new Error("تم استلام كامل الكمية لهذا الأمر مسبقاً");
      }
      if (receiveQty > remaining) {
        throw new Error(`الكمية المطلوبة (${receiveQty} كجم) تتجاوز الكمية المتبقية (${remaining} كجم)`);
      }

      data.production_order_id = poId;
    }

    data.receipt_time = data.receipt_time || new Date();

    return await db.transaction(async (tx) => {
      const [v] = await tx.insert(finished_goods_vouchers_in).values(data).returning();

      if (poId) {
        const receiveQty = parseFloat(String(data.weight_kg || data.quantity || '0'));
        await tx
          .update(production_orders)
          .set({
            warehouse_received_kg: sql`CAST(${production_orders.warehouse_received_kg} AS NUMERIC) + ${receiveQty}`,
          })
          .where(eq(production_orders.id, poId));
      }

      if (data.item_id) {
        const qty = parseFloat(String(data.weight_kg || data.quantity || '0'));
        const locId = data.location_id ? (typeof data.location_id === 'string' ? parseInt(data.location_id) : data.location_id) : null;
        const conditions = locId
          ? and(eq(inventory.item_id, data.item_id), eq(inventory.location_id, locId))
          : eq(inventory.item_id, data.item_id);
        const existing = await tx.select().from(inventory).where(conditions as any);

        if (existing.length > 0) {
          await tx
            .update(inventory)
            .set({
              current_stock: sql`CAST(${inventory.current_stock} AS NUMERIC) + ${qty}`,
              last_updated: new Date(),
            })
            .where(eq(inventory.id, existing[0].id));
        } else {
          await tx.insert(inventory).values({
            item_id: data.item_id,
            location_id: locId,
            current_stock: String(qty),
            unit: 'كيلو',
          } as any);
        }
      }

      return v;
    });
  }

  async deleteFinishedGoodsVoucherIn(id: number): Promise<void> {
    const [voucher] = await db.select().from(finished_goods_vouchers_in).where(eq(finished_goods_vouchers_in.id, id));
    if (!voucher) {
      throw new Error("السند غير موجود");
    }

    const totalQty = parseFloat(String(voucher.weight_kg || voucher.quantity || '0'));
    const poId = voucher.production_order_id;

    let parsedItems: any[] = [];
    try {
      if (voucher.items) {
        parsedItems = JSON.parse(voucher.items);
      }
    } catch {}

    await db.transaction(async (tx) => {
      if (parsedItems.length > 0) {
        for (const item of parsedItems) {
          const itemPoId = item.production_order_id;
          const itemWeight = parseFloat(String(item.weight_kg || '0'));
          if (itemPoId && itemWeight > 0) {
            await tx
              .update(production_orders)
              .set({
                warehouse_received_kg: sql`GREATEST(0, CAST(${production_orders.warehouse_received_kg} AS NUMERIC) - ${itemWeight})`,
              })
              .where(eq(production_orders.id, itemPoId));
          }
        }
      } else if (poId && totalQty > 0) {
        await tx
          .update(production_orders)
          .set({
            warehouse_received_kg: sql`GREATEST(0, CAST(${production_orders.warehouse_received_kg} AS NUMERIC) - ${totalQty})`,
          })
          .where(eq(production_orders.id, poId));
      }

      if (voucher.item_id && totalQty > 0) {
        const locId = voucher.location_id;
        const conditions = locId
          ? and(eq(inventory.item_id, voucher.item_id), eq(inventory.location_id, locId))
          : eq(inventory.item_id, voucher.item_id);
        const existing = await tx.select().from(inventory).where(conditions as any);

        if (existing.length > 0) {
          await tx
            .update(inventory)
            .set({
              current_stock: sql`GREATEST(0, CAST(${inventory.current_stock} AS NUMERIC) - ${totalQty})`,
              last_updated: new Date(),
            })
            .where(eq(inventory.id, existing[0].id));
        }
      }

      await tx.delete(finished_goods_vouchers_in).where(eq(finished_goods_vouchers_in.id, id));
    });
  }

  async getProductionOrdersForReceipt(): Promise<any[]> {
    const orders = await db
      .select({
        id: production_orders.id,
        production_order_number: production_orders.production_order_number,
        order_id: production_orders.order_id,
        quantity_kg: production_orders.quantity_kg,
        warehouse_received_kg: production_orders.warehouse_received_kg,
        net_quantity_kg: production_orders.net_quantity_kg,
        status: production_orders.status,
        customer_product_id: production_orders.customer_product_id,
      })
      .from(production_orders)
      .where(
        and(
          or(
            eq(production_orders.status, 'completed'),
            eq(production_orders.status, 'active'),
            eq(production_orders.status, 'cutting')
          ),
          sql`CAST(${production_orders.warehouse_received_kg} AS NUMERIC) < CAST(${production_orders.quantity_kg} AS NUMERIC)`
        )
      )
      .orderBy(desc(production_orders.id));

    return orders.map(o => ({
      ...o,
      remaining_kg: parseFloat(String(o.quantity_kg)) - parseFloat(String(o.warehouse_received_kg || '0')),
    }));
  }

  async updateProductionOrderReceivedKg(id: number, additionalKg: number): Promise<void> {
    await db
      .update(production_orders)
      .set({
        warehouse_received_kg: sql`CAST(${production_orders.warehouse_received_kg} AS NUMERIC) + ${additionalKg}`,
      })
      .where(eq(production_orders.id, id));
  }

  async getFinishedGoodsStock(): Promise<any[]> {
    return await db.select().from(inventory).orderBy(desc(inventory.id));
  }

  async updateFinishedGoodsStock(itemId: string, quantityChange: number, locationId?: number): Promise<void> {
    const locId = locationId ? (typeof locationId === 'string' ? parseInt(locationId) : locationId) : null;
    const conditions = locId
      ? and(eq(inventory.item_id, itemId), eq(inventory.location_id, locId))
      : eq(inventory.item_id, itemId);

    const existing = await db.select().from(inventory).where(conditions as any);

    if (existing.length > 0) {
      await db
        .update(inventory)
        .set({
          current_stock: sql`CAST(${inventory.current_stock} AS NUMERIC) + ${quantityChange}`,
          last_updated: new Date(),
        })
        .where(eq(inventory.id, existing[0].id));
    } else {
      await db.insert(inventory).values({
        item_id: itemId,
        location_id: locId,
        current_stock: String(quantityChange),
        unit: 'كيلو',
      } as any);
    }
  }

  async getFinishedGoodsVouchersOut(): Promise<FinishedGoodsVoucherOut[]> {
    return await db.select().from(finished_goods_vouchers_out).orderBy(desc(finished_goods_vouchers_out.id));
  }

  async getFinishedGoodsVoucherOutById(id: number): Promise<FinishedGoodsVoucherOut | undefined> {
    const [v] = await db.select().from(finished_goods_vouchers_out).where(eq(finished_goods_vouchers_out.id, id));
    return v;
  }

  async getDeliveryHallOrders(): Promise<any[]> {
    const rows = await db.execute(sql`
      SELECT
        po.id AS production_order_id,
        po.production_order_number,
        po.order_id,
        po.quantity_kg AS quantity_required,
        po.warehouse_received_kg,
        po.warehouse_delivered_kg,
        po.status AS po_status,
        o.order_number,
        c.id AS customer_id,
        c.name AS customer_name,
        c.name_ar AS customer_name_ar,
        COALESCE(i.name, cp.id::text) AS product_name,
        i.name_ar AS product_name_ar
      FROM production_orders po
      JOIN orders o ON po.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      JOIN customer_products cp ON po.customer_product_id = cp.id
      LEFT JOIN items i ON cp.item_id = i.id
      WHERE CAST(po.warehouse_received_kg AS NUMERIC) > 0
        AND CAST(po.warehouse_delivered_kg AS NUMERIC) < CAST(po.warehouse_received_kg AS NUMERIC)
      ORDER BY po.id
    `);
    return (rows.rows as any[]).map(row => ({
      ...row,
      production_order_id: Number(row.production_order_id),
      order_id: Number(row.order_id),
    }));
  }

  async createFinishedGoodsVoucherOut(data: any): Promise<FinishedGoodsVoucherOut> {
    const deliveryItems: any[] = data.items || [];
    const now = new Date();

    if (deliveryItems.length > 0) {
      let totalWeight = 0;
      const validatedItems: any[] = [];

      const mergedByPo = new Map<number, { weight: number; item: any }>();
      for (const item of deliveryItems) {
        const poId = typeof item.production_order_id === 'string' ? parseInt(item.production_order_id) : item.production_order_id;
        const weight = parseFloat(String(item.weight_kg || '0'));
        if (weight <= 0) continue;
        const existing = mergedByPo.get(poId);
        if (existing) {
          existing.weight += weight;
        } else {
          mergedByPo.set(poId, { weight, item });
        }
      }

      for (const [poId, { weight, item }] of mergedByPo) {
        const [po] = await db.select().from(production_orders).where(eq(production_orders.id, poId));
        if (!po) {
          throw new Error(`أمر الإنتاج رقم ${poId} غير موجود`);
        }

        const received = parseFloat(String(po.warehouse_received_kg || '0'));
        const delivered = parseFloat(String(po.warehouse_delivered_kg || '0'));
        const available = received - delivered;

        if (available <= 0) {
          throw new Error(`لا توجد كمية متاحة للتسليم لأمر الإنتاج ${po.production_order_number}`);
        }
        if (weight > available + 0.01) {
          throw new Error(`الكمية المطلوبة (${weight} كجم) تتجاوز الكمية المتاحة (${available.toFixed(3)} كجم) لأمر الإنتاج ${po.production_order_number}`);
        }

        totalWeight += weight;
        validatedItems.push({
          production_order_id: poId,
          production_order_number: po.production_order_number,
          weight_kg: weight,
          product_description: item.product_description || '',
          customer_id: item.customer_id || data.customer_id,
          customer_name: item.customer_name || '',
          order_number: item.order_number || '',
        });
      }

      if (validatedItems.length === 0) {
        throw new Error("لم يتم إدخال أي كميات صالحة");
      }

      const voucherData: any = {
        voucher_number: data.voucher_number,
        voucher_type: data.voucher_type || 'customer_delivery',
        voucher_date: now,
        delivery_time: now,
        quantity: totalWeight.toString(),
        weight_kg: totalWeight.toString(),
        unit: data.unit || 'kg',
        notes: data.notes || null,
        items: JSON.stringify(validatedItems),
        production_order_id: validatedItems.length === 1 ? validatedItems[0].production_order_id : null,
        customer_id: data.customer_id || validatedItems[0].customer_id || null,
        driver_name: data.driver_name || null,
        driver_phone: data.driver_phone || null,
        vehicle_number: data.vehicle_number || null,
        delivery_address: data.delivery_address || null,
        created_by: data.created_by,
        status: 'completed',
      };

      return await db.transaction(async (tx) => {
        const [v] = await tx.insert(finished_goods_vouchers_out).values(voucherData).returning();

        for (const item of validatedItems) {
          await tx
            .update(production_orders)
            .set({
              warehouse_delivered_kg: sql`CAST(${production_orders.warehouse_delivered_kg} AS NUMERIC) + ${item.weight_kg}`,
            })
            .where(eq(production_orders.id, item.production_order_id));
        }

        return v;
      });
    }

    return await db.transaction(async (tx) => {
      if (data.item_id) {
        const qty = parseFloat(String(data.weight_kg || data.quantity || '0'));
        const locId = data.location_id ? (typeof data.location_id === 'string' ? parseInt(data.location_id) : data.location_id) : null;
        const conditions = locId
          ? and(eq(inventory.item_id, data.item_id), eq(inventory.location_id, locId))
          : eq(inventory.item_id, data.item_id);
        const existing = await tx.select().from(inventory).where(conditions as any);
        const currentStock = existing.length > 0 ? parseFloat(String(existing[0].current_stock || '0')) : 0;

        if (qty > currentStock) {
          throw new Error(`الكمية المطلوبة (${qty} كجم) تتجاوز المخزون المتاح (${currentStock} كجم)`);
        }
      }

      data.delivery_time = data.delivery_time || new Date();
      const [v] = await tx.insert(finished_goods_vouchers_out).values(data).returning();

      if (data.item_id) {
        const qty = parseFloat(String(data.weight_kg || data.quantity || '0'));
        const locId = data.location_id ? (typeof data.location_id === 'string' ? parseInt(data.location_id) : data.location_id) : null;
        const conditions = locId
          ? and(eq(inventory.item_id, data.item_id), eq(inventory.location_id, locId))
          : eq(inventory.item_id, data.item_id);
        const existing = await tx.select().from(inventory).where(conditions as any);

        if (existing.length > 0) {
          await tx
            .update(inventory)
            .set({
              current_stock: sql`CAST(${inventory.current_stock} AS NUMERIC) - ${qty}`,
              last_updated: new Date(),
            })
            .where(eq(inventory.id, existing[0].id));
        }
      }

      return v;
    });
  }

  async deleteFinishedGoodsVoucherOut(id: number): Promise<void> {
    const [voucher] = await db.select().from(finished_goods_vouchers_out).where(eq(finished_goods_vouchers_out.id, id));
    if (!voucher) {
      throw new Error("السند غير موجود");
    }

    let parsedItems: any[] = [];
    try {
      if (voucher.items) {
        parsedItems = JSON.parse(voucher.items);
      }
    } catch {}

    await db.transaction(async (tx) => {
      if (parsedItems.length > 0) {
        for (const item of parsedItems) {
          const itemPoId = item.production_order_id;
          const itemWeight = parseFloat(String(item.weight_kg || '0'));
          if (itemPoId && itemWeight > 0) {
            await tx
              .update(production_orders)
              .set({
                warehouse_delivered_kg: sql`GREATEST(0, CAST(${production_orders.warehouse_delivered_kg} AS NUMERIC) - ${itemWeight})`,
              })
              .where(eq(production_orders.id, itemPoId));
          }
        }
      }

      await tx.delete(finished_goods_vouchers_out).where(eq(finished_goods_vouchers_out.id, id));
    });
  }

  async getWarehouseVouchersStats(): Promise<any> {
    try {
      const [rmIn] = await db.select({ count: count() }).from(raw_material_vouchers_in);
      const [rmOut] = await db.select({ count: count() }).from(raw_material_vouchers_out);
      const [fpIn] = await db.select({ count: count() }).from(finished_goods_vouchers_in);
      const [fpOut] = await db.select({ count: count() }).from(finished_goods_vouchers_out);
      return {
        rm_in: rmIn?.count || 0,
        rm_out: rmOut?.count || 0,
        fp_in: fpIn?.count || 0,
        fp_out: fpOut?.count || 0,
        total: (rmIn?.count || 0) + (rmOut?.count || 0) + (fpIn?.count || 0) + (fpOut?.count || 0),
      };
    } catch {
      return { rm_in: 0, rm_out: 0, fp_in: 0, fp_out: 0, total: 0 };
    }
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

  // ============ ALIASES & MISSING METHODS ============

  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles).orderBy(roles.name);
  }

  async createRole(data: any): Promise<Role> {
    const [r] = await db.insert(roles).values(data).returning();
    return r;
  }

  async updateRole(id: number, data: any): Promise<Role> {
    const [u] = await db.update(roles).set(data).where(eq(roles.id, id)).returning();
    return u;
  }

  async deleteRole(id: number): Promise<void> {
    await db.delete(roles).where(eq(roles.id, id));
  }

  async updateUser(id: number, data: any): Promise<User> {
    const processedData = { ...data, updated_at: new Date() };
    if (processedData.password) {
      let isAlreadyHashed = false;
      try {
        bcrypt.getRounds(processedData.password);
        isAlreadyHashed = true;
      } catch {
        isAlreadyHashed = false;
      }
      if (!isAlreadyHashed) {
        processedData.password = await bcrypt.hash(processedData.password, 10);
      }
    } else {
      delete processedData.password;
    }
    const [u] = await db.update(users).set(processedData).where(eq(users.id, id)).returning();
    return u;
  }

  async deleteUser(id: number): Promise<void> {
    await db.update(users).set({ status: 'inactive' }).where(eq(users.id, id));
  }

  async getSafeUsersBySection(sectionId: number): Promise<SafeUser[]> {
    return await db.select({
      id: users.id,
      username: users.username,
      display_name: users.display_name,
      display_name_ar: users.display_name_ar,
      role_id: users.role_id,
      status: users.status,
      replit_user_id: users.replit_user_id,
      created_at: users.created_at,
    }).from(users).where(and(eq(users.section_id, sectionId), eq(users.status, 'active')));
  }

  async getRolls(): Promise<Roll[]> {
    return this.getAllRolls();
  }

  async getRollsBySection(stage: string, search?: string): Promise<Roll[]> {
    let query = db.select().from(rolls).where(eq(rolls.stage, stage)).orderBy(desc(rolls.created_at));
    return await query;
  }

  async getRollsByStage(stage: string): Promise<Roll[]> {
    return await db.select().from(rolls).where(eq(rolls.stage, stage)).orderBy(desc(rolls.created_at));
  }

  async searchRolls(query: string, filters?: any): Promise<any[]> {
    const createdByUser = alias(users, 'created_by_user');
    const printedByUser = alias(users, 'printed_by_user');
    const cutByUser = alias(users, 'cut_by_user');
    const filmMachine = alias(machines, 'film_machine');
    const printingMachine = alias(machines, 'printing_machine');
    const cuttingMachine = alias(machines, 'cutting_machine');

    const conditions: any[] = [];
    if (query) {
      conditions.push(sql`${rolls.roll_number} ILIKE ${`%${query}%`}`);
    }
    if (filters?.stage) {
      conditions.push(eq(rolls.stage, filters.stage));
    }
    if (filters?.productionOrderId) {
      conditions.push(eq(rolls.production_order_id, filters.productionOrderId));
    }
    if (filters?.machineId) {
      conditions.push(eq(rolls.film_machine_id, filters.machineId));
    }
    if (filters?.operatorId) {
      conditions.push(eq(rolls.created_by, filters.operatorId));
    }
    if (filters?.orderId) {
      conditions.push(sql`${rolls.production_order_id} IN (SELECT id FROM production_orders WHERE order_id = ${filters.orderId})`);
    }
    if (filters?.startDate) {
      conditions.push(sql`${rolls.created_at} >= ${filters.startDate}::timestamp`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${rolls.created_at} <= ${filters.endDate}::timestamp`);
    }
    if (filters?.minWeight) {
      conditions.push(sql`${rolls.weight_kg} >= ${filters.minWeight}`);
    }
    if (filters?.maxWeight) {
      conditions.push(sql`${rolls.weight_kg} <= ${filters.maxWeight}`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const results = await db
      .select({
        id: rolls.id,
        roll_id: rolls.id,
        roll_seq: rolls.roll_seq,
        roll_number: rolls.roll_number,
        production_order_id: rolls.production_order_id,
        stage: rolls.stage,
        weight_kg: rolls.weight_kg,
        cut_weight_total_kg: rolls.cut_weight_total_kg,
        waste_kg: rolls.waste_kg,
        qr_code_text: rolls.qr_code_text,
        film_machine_id: rolls.film_machine_id,
        printing_machine_id: rolls.printing_machine_id,
        cutting_machine_id: rolls.cutting_machine_id,
        created_by: rolls.created_by,
        printed_by: rolls.printed_by,
        cut_by: rolls.cut_by,
        printed_at: rolls.printed_at,
        cut_completed_at: rolls.cut_completed_at,
        created_at: rolls.created_at,
        production_order_number: production_orders.production_order_number,
        order_id: orders.id,
        order_number: orders.order_number,
        customer_id: customers.id,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
        size_caption: customer_products.size_caption,
        item_name: items.name,
        item_name_ar: items.name_ar,
        created_by_name: createdByUser.display_name_ar,
        printed_by_name: printedByUser.display_name_ar,
        cut_by_name: cutByUser.display_name_ar,
        film_machine_name: filmMachine.name_ar,
        printing_machine_name: printingMachine.name_ar,
        cutting_machine_name: cuttingMachine.name_ar,
      })
      .from(rolls)
      .innerJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
      .innerJoin(orders, eq(production_orders.order_id, orders.id))
      .innerJoin(customers, eq(orders.customer_id, customers.id))
      .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
      .leftJoin(items, eq(customer_products.item_id, items.id))
      .leftJoin(createdByUser, eq(rolls.created_by, createdByUser.id))
      .leftJoin(printedByUser, eq(rolls.printed_by, printedByUser.id))
      .leftJoin(cutByUser, eq(rolls.cut_by, cutByUser.id))
      .leftJoin(filmMachine, eq(rolls.film_machine_id, filmMachine.id))
      .leftJoin(printingMachine, eq(rolls.printing_machine_id, printingMachine.id))
      .leftJoin(cuttingMachine, eq(rolls.cutting_machine_id, cuttingMachine.id))
      .where(whereClause)
      .orderBy(desc(rolls.created_at))
      .limit(500);

    return results;
  }

  async getRollFullDetails(id: number): Promise<any> {
    const roll = await this.getRollById(id);
    if (!roll) return null;
    const qualityChecks = await this.getQualityChecksByRoll(id);
    return { ...roll, quality_checks: qualityChecks };
  }

  async getRollHistory(id: number): Promise<any[]> {
    return [];
  }

  async getRollByBarcode(barcode: string): Promise<Roll | undefined> {
    const [r] = await db.select().from(rolls).where(eq(rolls.roll_number, barcode)).limit(1);
    return r;
  }

  async getRollLabelData(id: number): Promise<any> {
    return this.getRollById(id);
  }

  async getRollQR(id: number): Promise<string> {
    const roll = await this.getRollById(id);
    if (!roll) throw new Error('Roll not found');
    return QRCode.toDataURL(String(roll.id));
  }

  async getRollsForCuttingBySection(sectionId: number): Promise<any[]> {
    return await db.select().from(rolls).where(eq(rolls.stage, 'cutting')).orderBy(desc(rolls.created_at));
  }

  async getRollsForPrintingBySection(sectionId: number): Promise<any[]> {
    return await db.select().from(rolls).where(eq(rolls.stage, 'printing')).orderBy(desc(rolls.created_at));
  }

  async createRollWithTiming(data: any): Promise<Roll> {
    return withDatabaseErrorHandling(
      async () => {
        const roll = await db.transaction(async (tx) => {
          await tx.execute(sql`SELECT pg_advisory_xact_lock(1003, ${data.production_order_id})`);

          const [po] = await tx
            .select({ production_order_number: production_orders.production_order_number })
            .from(production_orders)
            .where(eq(production_orders.id, data.production_order_id));

          if (!po) throw new Error("أمر الإنتاج غير موجود");

          const [seqResult] = await tx
            .select({ maxSeq: sql<number>`COALESCE(MAX(${rolls.roll_seq}), 0)` })
            .from(rolls)
            .where(eq(rolls.production_order_id, data.production_order_id));

          const nextSeq = (seqResult?.maxSeq ?? 0) + 1;
          const rollNumber = `${po.production_order_number}-R${String(nextSeq).padStart(3, '0')}`;

          const qrCodeText = JSON.stringify({
            roll_number: rollNumber,
            production_order_number: po.production_order_number,
            roll_seq: nextSeq,
            weight_kg: data.weight_kg,
            created_at: new Date().toISOString(),
          });

          const rollData = {
            ...data,
            roll_seq: nextSeq,
            roll_number: rollNumber,
            qr_code_text: qrCodeText,
          };

          const [created] = await tx.insert(rolls).values(rollData).returning();
          return created;
        });

        await this.updateProductionOrderCompletionPercentages(data.production_order_id);
        return roll;
      },
      "createRoll",
      "إنشاء رول",
    );
  }

  async markRollAsPrinted(id: number, data?: any): Promise<Roll> {
    return this.updateRoll(id, { stage: 'printed', ...data });
  }

  async markRollPrinted(id: number, data?: any): Promise<Roll> {
    return this.markRollAsPrinted(id, data);
  }

  async createFinalRoll(data: any): Promise<Roll> {
    return this.createRollWithTiming(data);
  }

  async getSections(): Promise<Section[]> {
    return this.getAllSections();
  }

  async createSection(data: any): Promise<Section> {
    const [s] = await db.insert(sections).values(data).returning();
    return s;
  }

  async updateSection(id: string | number, data: any): Promise<Section> {
    const [u] = await db.update(sections).set(data).where(eq(sections.id, String(id))).returning();
    return u;
  }

  async deleteSection(id: string | number): Promise<void> {
    await db.delete(sections).where(eq(sections.id, String(id)));
  }

  async getCustomers(options?: { search?: string; page?: number; limit?: number }): Promise<any> {
    const pageNum = options?.page || 1;
    const pageLimit = options?.limit || 50;
    const offset = (pageNum - 1) * pageLimit;

    let query = db.select().from(customers);

    if (options?.search) {
      const s = `%${options.search}%`;
      query = query.where(or(
        sql`${customers.name} ILIKE ${s}`,
        sql`${customers.name_ar} ILIKE ${s}`,
        sql`${customers.id} ILIKE ${s}`,
      )) as any;
    }

    const total = await db.select({ count: count() }).from(customers).then(r => r[0]?.count || 0);
    const data = await query.orderBy(customers.name).limit(pageLimit).offset(offset);

    return { data, total, page: pageNum, limit: pageLimit };
  }

  async createCustomer(data: any): Promise<Customer> {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(1002)`);

      let id = data.id;
      if (!id) {
        const [last] = await tx.select({ id: customers.id }).from(customers).orderBy(desc(customers.id)).limit(1);
        const lastNum = last ? parseInt((last.id || '').replace(/\D/g, '') || '0') : 0;
        id = `CID${String(lastNum + 1).padStart(3, '0')}`;
      }
      const [c] = await tx.insert(customers).values({ ...data, id }).returning();
      return c;
    });
  }

  async updateCustomer(id: string | any, data: any): Promise<Customer> {
    const [u] = await db.update(customers).set(data).where(eq(customers.id, String(id))).returning();
    return u;
  }

  async deleteCustomer(id: string | any): Promise<void> {
    await db.delete(customers).where(eq(customers.id, String(id)));
  }

  async getMachines(): Promise<Machine[]> {
    return this.getAllMachines();
  }

  async createMachine(data: any): Promise<Machine> {
    const [m] = await db.insert(machines).values(data).returning();
    return m;
  }

  async updateMachine(id: string | number, data: any): Promise<Machine> {
    const [u] = await db.update(machines).set(data).where(eq(machines.id, String(id))).returning();
    return u;
  }

  async deleteMachine(id: string | number): Promise<void> {
    await db.delete(machines).where(eq(machines.id, String(id)));
  }

  async getMachinesProductionBySection(section: any, dateFrom?: string, dateTo?: string): Promise<any[]> {
    return await db.select().from(machines).orderBy(machines.name);
  }

  async createItem(data: any): Promise<Item> {
    const [i] = await db.insert(items).values(data).returning();
    return i;
  }

  async updateItem(id: string | number, data: any): Promise<Item> {
    const [u] = await db.update(items).set(data).where(eq(items.id, String(id))).returning();
    return u;
  }

  async deleteItem(id: string | number): Promise<void> {
    await db.delete(items).where(eq(items.id, String(id)));
  }

  async getCustomerProducts(options?: { customer_id?: string; ids?: number[]; page?: number; limit?: number; search?: string }): Promise<any> {
    const pageNum = options?.page || 1;
    const pageLimit = options?.limit || 500;
    const offset = (pageNum - 1) * pageLimit;

    const conditions: any[] = [];
    if (options?.customer_id) {
      conditions.push(eq(customer_products.customer_id, options.customer_id));
    }
    if (options?.ids && options.ids.length > 0) {
      conditions.push(inArray(customer_products.id, options.ids));
    }
    if (options?.search) {
      const s = `%${options.search}%`;
      conditions.push(sql`${customer_products.size_caption} ILIKE ${s}`);
    }

    const whereClause = conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : and(...conditions))
      : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(customer_products)
      .where(whereClause);
    const total = totalResult?.count || 0;

    const data = await db
      .select()
      .from(customer_products)
      .where(whereClause)
      .orderBy(customer_products.id)
      .limit(pageLimit)
      .offset(offset);

    return { data, total, page: pageNum, limit: pageLimit };
  }

  async createCustomerProduct(data: any): Promise<CustomerProduct> {
    const [p] = await db.insert(customer_products).values(data).returning();
    return p;
  }

  async updateCustomerProduct(id: number, data: any): Promise<CustomerProduct> {
    const [u] = await db.update(customer_products).set(data).where(eq(customer_products.id, id)).returning();
    return u;
  }

  async deleteCustomerProduct(id: number): Promise<void> {
    await db.delete(customer_products).where(eq(customer_products.id, id));
  }

  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations).orderBy(locations.name);
  }

  async createLocation(data: any): Promise<Location> {
    const [l] = await db.insert(locations).values(data).returning();
    return l;
  }

  async createLocationExtended(data: any): Promise<Location> {
    return this.createLocation(data);
  }

  async updateLocationExtended(id: string | number, data: any): Promise<Location> {
    const [u] = await db.update(locations).set(data).where(eq(locations.id, String(id))).returning();
    return u;
  }

  async deleteLocation(id: string | number): Promise<void> {
    await db.delete(locations).where(eq(locations.id, String(id)));
  }

  async getCategories(): Promise<any[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async createCategory(data: any): Promise<any> {
    const [c] = await db.insert(categories).values(data).returning();
    return c;
  }

  async updateCategory(id: string | number, data: any): Promise<any> {
    const [u] = await db.update(categories).set(data).where(eq(categories.id, String(id))).returning();
    return u;
  }

  async deleteCategory(id: string | number): Promise<void> {
    await db.delete(categories).where(eq(categories.id, String(id)));
  }

  async getWarehouseTransactions(): Promise<WarehouseTransaction[]> {
    return await db.select().from(warehouse_transactions).orderBy(desc(warehouse_transactions.id));
  }

  async createWarehouseTransaction(data: any): Promise<WarehouseTransaction> {
    const [t] = await db.insert(warehouse_transactions).values(data).returning();
    return t;
  }

  async getWarehouseReceiptsDetailed(): Promise<any[]> {
    return await db.select().from(warehouse_receipts).orderBy(desc(warehouse_receipts.id));
  }

  async getAdminDecisions(): Promise<AdminDecision[]> {
    return this.getAllAdminDecisions();
  }

  async getAllSpareParts(): Promise<SparePart[]> {
    return this.getSpareParts();
  }

  async updateSparePart(id: number, data: Partial<SparePart>): Promise<SparePart> {
    const [u] = await db.update(spare_parts).set(data).where(eq(spare_parts.id, id)).returning();
    return u;
  }

  async deleteSparePart(id: number): Promise<void> {
    await db.delete(spare_parts).where(eq(spare_parts.id, id));
  }

  async getAllConsumableParts(): Promise<ConsumablePart[]> {
    return this.getConsumableParts();
  }

  async updateConsumablePart(id: number, data: Partial<ConsumablePart>): Promise<ConsumablePart> {
    const [u] = await db.update(consumable_parts).set(data).where(eq(consumable_parts.id, id)).returning();
    return u;
  }

  async deleteConsumablePart(id: number): Promise<void> {
    await db.delete(consumable_parts).where(eq(consumable_parts.id, id));
  }

  async getConsumablePartByBarcode(barcode: string): Promise<ConsumablePart | undefined> {
    const [p] = await db.select().from(consumable_parts).where(eq(consumable_parts.barcode, barcode)).limit(1);
    return p;
  }

  async getConsumablePartTransactionsByPartId(partId: number): Promise<ConsumablePartTransaction[]> {
    return this.getConsumablePartTransactions(partId);
  }

  async processConsumablePartBarcodeTransaction(data: any): Promise<any> {
    return this.createConsumablePartTransaction(data);
  }

  async getAllMaintenanceActions(): Promise<MaintenanceAction[]> {
    return await db.select().from(maintenance_actions).orderBy(desc(maintenance_actions.id));
  }

  async updateMaintenanceAction(id: number, data: Partial<MaintenanceAction>): Promise<MaintenanceAction> {
    const [u] = await db.update(maintenance_actions).set(data).where(eq(maintenance_actions.id, id)).returning();
    return u;
  }

  async deleteMaintenanceAction(id: number): Promise<void> {
    await db.delete(maintenance_actions).where(eq(maintenance_actions.id, id));
  }

  async getAllMaintenanceReports(): Promise<MaintenanceReport[]> {
    return this.getMaintenanceReports();
  }

  async updateMaintenanceReport(id: number, data: Partial<MaintenanceReport>): Promise<MaintenanceReport> {
    const [u] = await db.update(maintenance_reports).set(data).where(eq(maintenance_reports.id, id)).returning();
    return u;
  }

  async deleteMaintenanceReport(id: number): Promise<void> {
    await db.delete(maintenance_reports).where(eq(maintenance_reports.id, id));
  }

  async getAllOperatorNegligenceReports(): Promise<OperatorNegligenceReport[]> {
    return this.getOperatorNegligenceReports();
  }

  async updateOperatorNegligenceReport(id: number, data: Partial<OperatorNegligenceReport>): Promise<OperatorNegligenceReport> {
    const [u] = await db.update(operator_negligence_reports).set(data).where(eq(operator_negligence_reports.id, id)).returning();
    return u;
  }

  async deleteOperatorNegligenceReport(id: number): Promise<void> {
    await db.delete(operator_negligence_reports).where(eq(operator_negligence_reports.id, id));
  }

  async getTrainingPrograms(): Promise<TrainingProgram[]> {
    return this.getAllTrainingPrograms();
  }

  async updateTrainingProgram(id: number, data: Partial<TrainingProgram>): Promise<TrainingProgram> {
    const [u] = await db.update(training_programs).set({ ...data, updated_at: new Date() }).where(eq(training_programs.id, id)).returning();
    return u;
  }

  async getTrainingRecords(): Promise<TrainingRecord[]> {
    return await db.select().from(training_records).orderBy(desc(training_records.id));
  }

  async createTrainingRecord(data: any): Promise<TrainingRecord> {
    const [r] = await db.insert(training_records).values(data).returning();
    return r;
  }

  async getTrainingCertificates(userId: number): Promise<TrainingCertificate[]> {
    return this.getCertificates(userId);
  }

  async updateTrainingCertificate(id: number, data: Partial<TrainingCertificate>): Promise<TrainingCertificate> {
    const [u] = await db.update(training_certificates).set(data).where(eq(training_certificates.id, id)).returning();
    return u;
  }

  async generateTrainingCertificate(enrollmentId: number): Promise<any> {
    return { enrollmentId, generated: true };
  }

  async getTrainingEvaluations(programId?: number): Promise<TrainingEvaluation[]> {
    if (programId) return await db.select().from(training_evaluations).where(eq(training_evaluations.program_id, programId));
    return await db.select().from(training_evaluations);
  }

  async getTrainingEvaluationById(id: number): Promise<TrainingEvaluation | undefined> {
    const [e] = await db.select().from(training_evaluations).where(eq(training_evaluations.id, id));
    return e;
  }

  async updateTrainingEvaluation(id: number, data: Partial<TrainingEvaluation>): Promise<TrainingEvaluation> {
    const [u] = await db.update(training_evaluations).set(data).where(eq(training_evaluations.id, id)).returning();
    return u;
  }

  async createTrainingEnrollment(data: InsertTrainingEnrollment): Promise<TrainingEnrollment> {
    return this.enrollUserInProgram(data);
  }

  async updateTrainingEnrollment(id: number, data: Partial<TrainingEnrollment>): Promise<TrainingEnrollment> {
    return this.updateEnrollment(id, data);
  }

  async createTrainingEvaluation(data: InsertTrainingEvaluation): Promise<TrainingEvaluation> {
    return this.createEvaluation(data);
  }

  async createTrainingCertificate(data: InsertTrainingCertificate): Promise<TrainingCertificate> {
    return this.createCertificate(data);
  }

  async getViolations(): Promise<any[]> {
    return [];
  }

  async createViolation(data: any): Promise<any> {
    return data;
  }

  async updateViolation(id: number, data: any): Promise<any> {
    return data;
  }

  async deleteViolation(id: number): Promise<void> {}

  async getUserRequests(): Promise<any[]> {
    return await db.select().from(user_requests).orderBy(desc(user_requests.created_at));
  }

  async createUserRequest(data: any): Promise<any> {
    const [r] = await db.insert(user_requests).values(data).returning();
    return r;
  }

  async updateUserRequest(id: number, data: any): Promise<any> {
    const [u] = await db.update(user_requests).set(data).where(eq(user_requests.id, id)).returning();
    return u;
  }

  async deleteUserRequest(id: number): Promise<void> {
    await db.delete(user_requests).where(eq(user_requests.id, id));
  }

  async updatePerformanceReview(id: number, data: Partial<PerformanceReview>): Promise<PerformanceReview> {
    const [u] = await db.update(performance_reviews).set(data).where(eq(performance_reviews.id, id)).returning();
    return u;
  }

  async createPerformanceCriteria(data: InsertPerformanceCriteria): Promise<PerformanceCriteria> {
    const [c] = await db.insert(performance_criteria).values(data).returning();
    return c;
  }

  async getUserPerformanceStats(userId: number): Promise<any> {
    const reviews = await this.getPerformanceReviews(userId);
    return { userId, reviewCount: reviews.length, averageScore: 0 };
  }

  async getRolePerformanceStats(roleId: number): Promise<any> {
    return { roleId, count: 0, averageScore: 0 };
  }

  async getUsersPerformanceBySection(sectionId: number): Promise<any[]> {
    return [];
  }

  async getSystemSettingByKey(key: string): Promise<SystemSetting | undefined> {
    const [s] = await db.select().from(system_settings).where(eq(system_settings.setting_key, key));
    return s;
  }

  async createSystemSetting(data: InsertSystemSetting): Promise<SystemSetting> {
    const [s] = await db.insert(system_settings).values(data).returning();
    return s;
  }

  async createInventoryItem(data: InsertInventory): Promise<Inventory> {
    const [i] = await db.insert(inventory).values(data).returning();
    return i;
  }

  async updateInventoryItem(id: number, data: Partial<Inventory>): Promise<Inventory> {
    return this.updateInventory(id, data);
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventory).where(eq(inventory.id, id));
  }

  async deleteInventoryMovement(id: number): Promise<void> {
    await db.delete(inventory_movements).where(eq(inventory_movements.id, id));
  }

  async createLeaveType(data: InsertLeaveType): Promise<LeaveType> {
    const [t] = await db.insert(leave_types).values(data).returning();
    return t;
  }

  async createLeaveBalance(data: InsertLeaveBalance): Promise<LeaveBalance> {
    const [b] = await db.insert(leave_balances).values(data).returning();
    return b;
  }

  async updateLeaveBalance(id: number, data: Partial<LeaveBalance>): Promise<LeaveBalance> {
    const [u] = await db.update(leave_balances).set(data).where(eq(leave_balances.id, id)).returning();
    return u;
  }

  async createCut(data: InsertCut): Promise<Cut> {
    const [c] = await db.insert(cuts).values(data).returning();
    return c;
  }

  async completeCutting(rollId: number, netWeight: number, operatorId: number, cuttingMachineId?: string): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const [roll] = await db.select().from(rolls).where(eq(rolls.id, rollId));
        if (!roll) throw new Error(`الرول ${rollId} غير موجود`);

        const grossWeight = parseFloat(roll.weight_kg?.toString() || '0');
        const wasteKg = Math.max(0, grossWeight - netWeight);

        const updates: any = {
          stage: 'done',
          cut_completed_at: new Date(),
          cut_by: operatorId,
          cut_weight_total_kg: netWeight.toString(),
          waste_kg: wasteKg.toString(),
        };
        if (cuttingMachineId) updates.cutting_machine_id = cuttingMachineId;

        const [updatedRoll] = await db.update(rolls).set(updates).where(eq(rolls.id, rollId)).returning();

        const remainingRolls = await db.select().from(rolls).where(
          and(
            eq(rolls.production_order_id, roll.production_order_id),
            inArray(rolls.stage as any, ['film', 'printing'])
          )
        );

        const isOrderCompleted = remainingRolls.length === 0;

        if (isOrderCompleted) {
          await db.update(production_orders)
            .set({ status: 'completed' } as any)
            .where(eq(production_orders.id, roll.production_order_id));
          invalidateProductionCache();
        }

        await this.updateProductionOrderCompletionPercentages(roll.production_order_id);

        return { ...updatedRoll, is_order_completed: isOrderCompleted };
      },
      "completeCutting",
      `إكمال تقطيع الرول ${rollId}`,
    );
  }

  async getCuttingQueue(): Promise<any[]> {
    return this.getProductionOrdersForCuttingQueue();
  }

  async checkCuttingCompletion(productionOrderId: number): Promise<any> {
    return { completed: false };
  }

  async checkPrintingCompletion(productionOrderId: number): Promise<any> {
    return { completed: false };
  }

  async getAttendance(): Promise<Attendance[]> {
    return await db.select().from(attendance).orderBy(desc(attendance.date));
  }

  async getDashboardStats(): Promise<any> {
    const [orderCount] = await db.select({ count: count() }).from(orders);
    const [productionCount] = await db.select({ count: count() }).from(production_orders);
    const [rollCount] = await db.select({ count: count() }).from(rolls);
    return {
      totalOrders: orderCount?.count || 0,
      totalProductionOrders: productionCount?.count || 0,
      totalRolls: rollCount?.count || 0,
    };
  }

  async getProductionStats(): Promise<any> {
    return { total: 0, completed: 0, inProgress: 0 };
  }

  async getAdvancedMetrics(): Promise<any> {
    return {};
  }

  async getWasteAnalysis(filters?: any): Promise<any> {
    return { totalWaste: 0, byType: {} };
  }

  async calculateWasteStatistics(): Promise<any> {
    return { total: 0, percentage: 0 };
  }

  async getActiveProductionOrdersForOperator(userId: number): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT
        po.id,
        po.production_order_number,
        po.order_id,
        po.customer_product_id,
        po.quantity_kg,
        CASE WHEN po.final_quantity_kg IS NOT NULL AND po.final_quantity_kg > 0 THEN po.final_quantity_kg ELSE po.quantity_kg END AS final_quantity_kg,
        po.produced_quantity_kg,
        po.overrun_percentage,
        po.status,
        po.assigned_operator_id,
        po.assigned_machine_id,
        po.film_completed,
        po.printing_completed,
        po.cutting_completed,
        po.is_final_roll_created,
        po.production_start_time,
        po.production_end_time,
        po.production_time_minutes,
        po.film_completion_percentage,
        po.created_at,
        o.order_number,
        o.status AS order_status,
        c.id AS customer_id,
        COALESCE(c.name_ar, c.name) AS customer_name,
        c.name_ar AS customer_name_ar,
        c.name AS customer_name_en,
        COALESCE(i.name_ar, i.name) AS product_name,
        i.name_ar AS product_name_ar,
        i.name AS product_name_en,
        cp.category_id,
        cp.size_caption,
        cp.raw_material,
        cp.thickness,
        cp.master_batch_id,
        COALESCE(mb.name_ar, mb.name, cp.master_batch_id) AS master_batch_name,
        mb.color_hex AS master_batch_color_hex,
        COUNT(r.id) AS rolls_count,
        COALESCE(SUM(r.weight_kg), 0) AS total_weight_produced,
        GREATEST(0, (CASE WHEN po.final_quantity_kg IS NOT NULL AND po.final_quantity_kg > 0 THEN po.final_quantity_kg ELSE po.quantity_kg END)::numeric - COALESCE(SUM(r.weight_kg), 0)) AS remaining_quantity
      FROM production_orders po
      JOIN orders o ON o.id = po.order_id
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN customer_products cp ON cp.id = po.customer_product_id
      LEFT JOIN items i ON i.id = cp.item_id
      LEFT JOIN master_batch_colors mb ON mb.id = cp.master_batch_id
      LEFT JOIN rolls r ON r.production_order_id = po.id
      WHERE o.status = 'in_production'
        AND po.status IN ('pending', 'active')
        AND po.film_completed = false
      GROUP BY po.id, o.id, c.id, cp.id, i.id, mb.id
      HAVING COALESCE(SUM(r.weight_kg), 0) < (CASE WHEN po.final_quantity_kg IS NOT NULL AND po.final_quantity_kg > 0 THEN po.final_quantity_kg ELSE po.quantity_kg END)::numeric
      ORDER BY po.id DESC
    `);
    return result.rows as any[];
  }

  async getActivePrintingRollsForOperator(userId: number): Promise<any[]> {
    const rows = await db.execute(sql`
      SELECT
        r.id AS roll_id,
        r.roll_number,
        r.roll_seq,
        r.weight_kg,
        r.waste_kg,
        r.stage,
        r.roll_created_at,
        r.printed_at,
        po.id AS production_order_id,
        po.production_order_number,
        po.quantity_kg,
        po.final_quantity_kg,
        o.order_number,
        c.name AS customer_name,
        c.name_ar AS customer_name_ar,
        COALESCE(i.name, cp.id::text) AS product_name,
        i.name_ar AS product_name_ar,
        cp.printing_cylinder
      FROM rolls r
      JOIN production_orders po ON r.production_order_id = po.id
      JOIN orders o ON po.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      JOIN customer_products cp ON po.customer_product_id = cp.id
      LEFT JOIN items i ON cp.item_id = i.id
      WHERE r.stage = 'film'
        AND po.status IN ('pending', 'active')
      ORDER BY po.id, r.roll_seq
    `);

    const grouped = new Map<number, any>();
    for (const row of rows.rows as any[]) {
      const poId = Number(row.production_order_id);
      if (!grouped.has(poId)) {
        grouped.set(poId, {
          production_order_id: poId,
          production_order_number: row.production_order_number,
          order_number: row.order_number,
          customer_name: row.customer_name,
          customer_name_ar: row.customer_name_ar,
          product_name: row.product_name,
          product_name_ar: row.product_name_ar,
          printing_cylinder: row.printing_cylinder,
          rolls: [],
          total_rolls: 0,
          total_weight: 0,
        });
      }
      const po = grouped.get(poId)!;
      po.rolls.push({
        roll_id: Number(row.roll_id),
        roll_number: row.roll_number,
        roll_seq: row.roll_seq,
        weight_kg: row.weight_kg,
        waste_kg: row.waste_kg,
        stage: row.stage,
        roll_created_at: row.roll_created_at,
        printed_at: row.printed_at,
      });
      po.total_rolls++;
      po.total_weight += parseFloat(row.weight_kg || '0');
    }
    return Array.from(grouped.values());
  }

  async getActiveCuttingRollsForOperator(userId: number): Promise<any[]> {
    const rows = await db.execute(sql`
      SELECT
        r.id AS roll_id,
        r.roll_number,
        r.roll_seq,
        r.weight_kg,
        r.waste_kg,
        r.stage,
        r.roll_created_at,
        r.printed_at,
        r.cut_completed_at,
        po.id AS production_order_id,
        po.production_order_number,
        po.quantity_kg,
        po.final_quantity_kg,
        o.order_number,
        c.name AS customer_name,
        c.name_ar AS customer_name_ar,
        COALESCE(i.name, cp.id::text) AS product_name,
        i.name_ar AS product_name_ar,
        cp.cutting_length_cm,
        cp.punching
      FROM rolls r
      JOIN production_orders po ON r.production_order_id = po.id
      JOIN orders o ON po.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      JOIN customer_products cp ON po.customer_product_id = cp.id
      LEFT JOIN items i ON cp.item_id = i.id
      WHERE r.stage = 'printing'
        AND po.status IN ('pending', 'active')
      ORDER BY po.id, r.roll_seq
    `);

    const grouped = new Map<number, any>();
    for (const row of rows.rows as any[]) {
      const poId = Number(row.production_order_id);
      if (!grouped.has(poId)) {
        grouped.set(poId, {
          production_order_id: poId,
          production_order_number: row.production_order_number,
          order_number: row.order_number,
          customer_name: row.customer_name,
          customer_name_ar: row.customer_name_ar,
          product_name: row.product_name,
          product_name_ar: row.product_name_ar,
          cutting_length_cm: row.cutting_length_cm,
          punching: row.punching,
          rolls: [],
          total_rolls: 0,
          total_weight: 0,
        });
      }
      const po = grouped.get(poId)!;
      po.rolls.push({
        roll_id: Number(row.roll_id),
        roll_number: row.roll_number,
        roll_seq: row.roll_seq,
        weight_kg: row.weight_kg,
        waste_kg: row.waste_kg,
        stage: row.stage,
        roll_created_at: row.roll_created_at,
        printed_at: row.printed_at,
        cut_completed_at: row.cut_completed_at,
      });
      po.total_rolls++;
      po.total_weight += parseFloat(row.weight_kg || '0');
    }
    return Array.from(grouped.values());
  }

  async getActiveFactoryLocations(): Promise<FactoryLocation[]> {
    return await db.select().from(factory_locations).where(eq(factory_locations.is_active, true));
  }

  async updateFactoryLocation(id: number, data: Partial<FactoryLocation>): Promise<FactoryLocation> {
    const [u] = await db.update(factory_locations).set(data).where(eq(factory_locations.id, id)).returning();
    return u;
  }

  async deleteFactoryLocation(id: number): Promise<void> {
    await db.delete(factory_locations).where(eq(factory_locations.id, id));
  }

  async getAllMixingBatches(): Promise<MixingBatch[]> {
    return this.getMixingBatches();
  }

  async updateMixingBatch(id: number, data: any): Promise<MixingBatch> {
    const [u] = await db.update(mixing_batches).set(data).where(eq(mixing_batches.id, id)).returning();
    return u;
  }

  async updateBatchIngredientActuals(batchId: number, ingredients: any[]): Promise<void> {
    for (const ingredient of ingredients) {
      if (ingredient.id) {
        await db.update(batch_ingredients).set(ingredient).where(eq(batch_ingredients.id, ingredient.id));
      }
    }
  }

  async completeMixingBatch(id: number, data?: any): Promise<MixingBatch> {
    return this.updateMixingBatchStatus(id, 'completed');
  }

  async getMixingRecipes(): Promise<any[]> {
    return [];
  }

  async createMixingRecipe(data: any): Promise<any> {
    return data;
  }

  async deleteMasterBatchColor(id: string | number): Promise<void> {
    await db.delete(master_batch_colors).where(eq(master_batch_colors.id, String(id)));
  }

  async updateMasterBatchColor(id: string | number, data: Partial<MasterBatchColor>): Promise<MasterBatchColor> {
    const [u] = await db.update(master_batch_colors).set(data).where(eq(master_batch_colors.id, String(id))).returning();
    return u;
  }

  async startProduction(productionOrderId: number, data?: any): Promise<ProductionOrder> {
    return this.updateProductionOrder(productionOrderId, { status: 'in_progress', ...data });
  }

  async activateProductionOrder(id: number, data?: any): Promise<ProductionOrder> {
    return this.updateProductionOrder(id, { status: 'active', ...data });
  }

  async updateProductionOrderAssignment(id: number, data: any): Promise<ProductionOrder> {
    return this.updateProductionOrder(id, data);
  }

  async updateProductionOrderCompletionPercentages(id: number, data?: any): Promise<ProductionOrder> {
    return withDatabaseErrorHandling(
      async () => {
        const [po] = await db.select().from(production_orders).where(eq(production_orders.id, id));
        if (!po) throw new Error(`أمر الإنتاج ${id} غير موجود`);

        const finalQty = parseFloat(po.final_quantity_kg?.toString() || '0');
        const targetKg = finalQty > 0 ? finalQty : parseFloat(po.quantity_kg?.toString() || '0');

        const [stats] = await db.execute(sql`
          SELECT
            COALESCE(SUM(weight_kg), 0) AS total_weight,
            COALESCE(SUM(CASE WHEN stage IN ('printing', 'done') THEN weight_kg ELSE 0 END), 0) AS printing_weight,
            COALESCE(SUM(CASE WHEN stage = 'done' THEN COALESCE(cut_weight_total_kg, weight_kg) + COALESCE(waste_kg, 0) ELSE 0 END), 0) AS cutting_weight
          FROM rolls
          WHERE production_order_id = ${id}
        `).then(r => r.rows as any[]);

        const totalWeight = parseFloat(stats?.total_weight || '0');
        const printingWeight = parseFloat(stats?.printing_weight || '0');
        const cuttingWeight = parseFloat(stats?.cutting_weight || '0');

        const filmPct = targetKg > 0 ? Math.min(100, (totalWeight / targetKg) * 100) : 0;
        const printPct = targetKg > 0 ? Math.min(100, (printingWeight / targetKg) * 100) : 0;
        const cutPct = targetKg > 0 ? Math.min(100, (cuttingWeight / targetKg) * 100) : 0;

        const [updated] = await db
          .update(production_orders)
          .set({
            produced_quantity_kg: totalWeight.toFixed(3),
            film_completion_percentage: filmPct.toFixed(2),
            printing_completion_percentage: printPct.toFixed(2),
            cutting_completion_percentage: cutPct.toFixed(2),
          } as any)
          .where(eq(production_orders.id, id))
          .returning();
        invalidateProductionCache();
        return updated;
      },
      "updateProductionOrderCompletionPercentages",
      `تحديث نسبة اكتمال أمر الإنتاج ${id}`,
    );
  }

  async assignToMachineQueue(machineId: string | number, productionOrderId: number, data?: any): Promise<any> {
    const queueItems = await this.getMachineQueue(machineId as any);
    const newItem: InsertMachineQueue = {
      machine_id: String(machineId),
      production_order_id: productionOrderId,
      queue_position: queueItems.length + 1,
      ...data,
    };
    const [created] = await db.insert(machine_queues).values(newItem).returning();
    return created;
  }

  async removeFromQueue(machineId: string | number, productionOrderId: number): Promise<void> {
    await db.delete(machine_queues).where(and(eq(machine_queues.machine_id, String(machineId)), eq(machine_queues.production_order_id, productionOrderId)));
  }

  async optimizeQueueOrder(machineId: string | number): Promise<MachineQueue[]> {
    return this.getMachineQueue(machineId as any);
  }

  async updateQueuePosition(machineId: string | number, productionOrderId: number, position: number): Promise<any> {
    const [u] = await db.update(machine_queues).set({ queue_position: position }).where(and(eq(machine_queues.machine_id, String(machineId)), eq(machine_queues.production_order_id, productionOrderId))).returning();
    return u;
  }

  async smartDistributeOrders(data?: any): Promise<any> {
    return { distributed: 0 };
  }

  async suggestOptimalDistribution(data?: any): Promise<any> {
    return { suggestions: [] };
  }

  async createNotificationTemplate(data: InsertNotificationTemplate): Promise<NotificationTemplate> {
    const [t] = await db.insert(notification_templates).values(data).returning();
    return t;
  }

  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    return await db.select().from(notification_templates).orderBy(notification_templates.id);
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async markNoteAsRead(id: number): Promise<QuickNote> {
    return this.updateQuickNote(id, { is_read: true } as any);
  }

  async deleteNoteAttachment(id: number): Promise<void> {
    await db.delete(note_attachments).where(eq(note_attachments.id, id));
  }

  async createDatabaseBackup(): Promise<any> {
    return { backup_id: generateUUID(), created_at: new Date() };
  }

  async restoreDatabaseBackup(backupId: string): Promise<any> {
    return { restored: true };
  }

  async checkDatabaseIntegrity(): Promise<any> {
    return { status: 'ok', issues: [] };
  }

  async optimizeTables(): Promise<any> {
    return { optimized: true };
  }

  async cleanupOldData(options?: any): Promise<any> {
    return { cleaned: 0 };
  }

  async exportTableData(tableName: string, format: string = "csv"): Promise<any> {
    const tableMap: Record<string, any> = {
      customers, categories, sections, items, customer_products, users, roles,
      machines, locations, suppliers, orders, production_orders, rolls, cuts,
      inventory, inventory_movements, warehouse_receipts, warehouse_transactions,
      maintenance_requests, maintenance_actions, spare_parts, consumable_parts,
      waste, quality_checks, attendance, notifications,
    };

    const table = tableMap[tableName];
    if (!table) {
      throw new Error(`الجدول غير موجود: ${tableName}`);
    }

    const rows = await db.select().from(table);

    if (rows.length === 0) {
      if (format === "json") return JSON.stringify([], null, 2);
      if (format === "csv") return "\uFEFF";
      if (format === "excel") {
        const workbook = new ExcelJS.Workbook();
        workbook.addWorksheet(tableName);
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer as ArrayBuffer);
      }
      return "[]";
    }

    const safeRows = tableName === "users"
      ? rows.map((r: any) => { const { password, ...rest } = r; return rest; })
      : rows;

    if (format === "json") {
      return JSON.stringify(safeRows, null, 2);
    }

    if (format === "csv") {
      const headers = Object.keys(safeRows[0] as Record<string, unknown>);
      const csvRows = [headers.join(",")];
      for (const row of safeRows) {
        const r = row as Record<string, unknown>;
        csvRows.push(
          headers.map((h) => {
            const val = r[h];
            if (val === null || val === undefined) return "";
            const str = typeof val === "object" ? JSON.stringify(val) : String(val);
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"` : str;
          }).join(",")
        );
      }
      return "\uFEFF" + csvRows.join("\n");
    }

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "نظام إدارة الطلبات";
      workbook.created = new Date();
      const sheet = workbook.addWorksheet(tableName, { views: [{ rightToLeft: true }] });

      const headers = Object.keys(safeRows[0] as Record<string, unknown>);
      const headerRow = sheet.addRow(headers);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };

      for (const row of safeRows) {
        const r = row as Record<string, unknown>;
        sheet.addRow(headers.map((h) => {
          const val = r[h];
          if (val === null || val === undefined) return "";
          if (typeof val === "object") return JSON.stringify(val);
          return val;
        }));
      }

      headers.forEach((_, i) => { sheet.getColumn(i + 1).width = 20; });

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer as ArrayBuffer);
    }

    return JSON.stringify(safeRows, null, 2);
  }

  async importTableData(tableName: string, data: any[]): Promise<any> {
    return { imported: data.length };
  }

  async getBackupFile(backupId: string): Promise<any> {
    return null;
  }

  async getProductionOrdersByStatus(status: string): Promise<ProductionOrder[]> {
    return await db.select().from(production_orders).where(eq(production_orders.status, status)).orderBy(desc(production_orders.id));
  }

  async getItems(): Promise<Item[]> {
    return this.getAllItems();
  }

  async getInventoryItems(): Promise<Inventory[]> {
    return this.getAllInventory();
  }

  async getInventoryByItemId(itemId: string | number): Promise<Inventory | undefined> {
    const [i] = await db.select().from(inventory).where(eq(inventory.item_id, String(itemId)));
    return i;
  }

  async getInventoryStats(): Promise<any> {
    const [total] = await db.select({ count: count() }).from(inventory);
    return { totalItems: total?.count || 0, lowStock: 0 };
  }

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return this.getAllMaintenanceRequests();
  }

  async getMaintenanceActionsByRequestId(requestId: number): Promise<MaintenanceAction[]> {
    return this.getMaintenanceActions(requestId);
  }

  async getMaintenanceReportsByType(type?: string): Promise<MaintenanceReport[]> {
    return this.getMaintenanceReports();
  }

  async getMasterBatchColorById(id: string | number): Promise<MasterBatchColor | undefined> {
    const [c] = await db.select().from(master_batch_colors).where(eq(master_batch_colors.id, String(id)));
    return c;
  }

  async getMixingBatchesByOperator(operatorId: number): Promise<MixingBatch[]> {
    return await db.select().from(mixing_batches).where(eq(mixing_batches.operator_id, operatorId)).orderBy(desc(mixing_batches.created_at));
  }

  async getMixingBatchesByProductionOrder(poId: number): Promise<MixingBatch[]> {
    return await db.select().from(mixing_batches).where(eq(mixing_batches.production_order_id, poId)).orderBy(desc(mixing_batches.created_at));
  }

  async getNextVoucherNumber(prefix: string): Promise<string> {
    const prefixMap: Record<string, { table: string; prefix: string }> = {
      'RM-Rec': { table: 'raw_material_vouchers_in', prefix: 'RM-Rec.' },
      'RM-Del': { table: 'raw_material_vouchers_out', prefix: 'RM-Del.' },
      'FP-Rec': { table: 'finished_goods_vouchers_in', prefix: 'FP-Rec.' },
      'FP-Del': { table: 'finished_goods_vouchers_out', prefix: 'FP-Del.' },
      'RMI': { table: 'raw_material_vouchers_in', prefix: 'RM-Rec.' },
      'RMO': { table: 'raw_material_vouchers_out', prefix: 'RM-Del.' },
      'FGI': { table: 'finished_goods_vouchers_in', prefix: 'FP-Rec.' },
      'FGO': { table: 'finished_goods_vouchers_out', prefix: 'FP-Del.' },
    };

    const mapping = prefixMap[prefix];
    if (mapping) {
      const result = await pool.query(
        `SELECT COUNT(*) + 1 AS next FROM ${mapping.table}`
      );
      const num = parseInt(result.rows[0]?.next || '1');
      return `${mapping.prefix}${String(num).padStart(4, '0')}`;
    }

    const result = await pool.query(
      `SELECT COUNT(*) + 1 AS next FROM (
        SELECT voucher_number FROM raw_material_vouchers_in WHERE voucher_number LIKE $1
        UNION ALL
        SELECT voucher_number FROM raw_material_vouchers_out WHERE voucher_number LIKE $1
        UNION ALL
        SELECT voucher_number FROM finished_goods_vouchers_in WHERE voucher_number LIKE $1
        UNION ALL
        SELECT voucher_number FROM finished_goods_vouchers_out WHERE voucher_number LIKE $1
      ) t`,
      [`${prefix}%`]
    );
    const num = parseInt(result.rows[0]?.next || '1');
    return `${prefix}${String(num).padStart(4, '0')}`;
  }

  async getOperatorNegligenceReportsByOperator(operatorId: number): Promise<OperatorNegligenceReport[]> {
    return await db.select().from(operator_negligence_reports).where(eq(operator_negligence_reports.operator_id, operatorId));
  }

  async getOperatorPerformance(filters?: any): Promise<any> {
    return { performance: 0 };
  }

  async getOrderProgress(orderId: number): Promise<any> {
    const order = await this.getOrderById(orderId);
    if (!order) return null;
    const pos = await db.select().from(production_orders).where(eq(production_orders.order_id, orderId));
    return { order, productionOrders: pos, progress: pos.length > 0 ? 50 : 0 };
  }

  async getOrderReports(options?: any): Promise<any> {
    const allOrders = await this.getAllOrders();
    return { orders: allOrders, total: allOrders.length };
  }

  async getOrdersEnhanced(options?: any): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        let query = db
          .select({
            id: orders.id,
            order_number: orders.order_number,
            customer_id: orders.customer_id,
            customer_name: customers.name,
            customer_name_ar: customers.name_ar,
            delivery_days: orders.delivery_days,
            delivery_date: orders.delivery_date,
            status: orders.status,
            notes: orders.notes,
            created_by: orders.created_by,
            created_at: orders.created_at,
          })
          .from(orders)
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .orderBy(desc(orders.id));

        const results = await query;

        const enhancedOrders = await Promise.all(
          results.map(async (order) => {
            const productionOrdersList = await db
              .select()
              .from(production_orders)
              .where(eq(production_orders.order_id, order.id));

            return {
              ...order,
              production_orders_count: productionOrdersList.length,
              production_orders: productionOrdersList.map((po) => ({
                id: po.id,
                production_order_number: po.production_order_number,
                quantity_kg: po.quantity_kg,
                final_quantity_kg: po.final_quantity_kg,
                produced_quantity_kg: po.produced_quantity_kg,
                film_completion_percentage: po.film_completion_percentage,
                printing_completion_percentage: po.printing_completion_percentage,
                cutting_completion_percentage: po.cutting_completion_percentage,
                status: po.status,
              })),
            };
          })
        );

        return enhancedOrders;
      },
      "getOrdersEnhanced",
      "جلب الطلبات المحسّنة",
    );
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return await db.select().from(leave_requests).where(eq(leave_requests.final_status, 'pending')).orderBy(desc(leave_requests.created_at));
  }

  async getPrintingQueue(): Promise<any[]> {
    return this.getProductionOrdersForPrintingQueue();
  }

  async getFilmQueue(): Promise<any[]> {
    return await db.select().from(production_orders).where(eq(production_orders.status, 'waiting_for_film')).orderBy(production_orders.id);
  }

  async getPrintingStats(): Promise<any> {
    const [printed] = await db.select({ count: count() }).from(production_orders).where(eq(production_orders.status, 'printed'));
    return { printed: printed?.count || 0 };
  }

  async getProductionAlerts(): Promise<any[]> {
    return [];
  }

  async getProductionByDate(filters?: any): Promise<any[]> {
    return [];
  }

  async getProductionByProduct(filters?: any): Promise<any[]> {
    return [];
  }

  async getProductionEfficiencyMetrics(): Promise<any> {
    return { efficiency: 0, target: 100 };
  }

  async getProductionOrdersBySection(sectionId: number): Promise<ProductionOrder[]> {
    return await db.select().from(production_orders).orderBy(desc(production_orders.id));
  }

  async getProductionHallOrders(): Promise<any[]> {
    const rows = await db.execute(sql`
      SELECT
        po.id AS production_order_id,
        po.production_order_number,
        po.order_id,
        po.quantity_kg AS quantity_required,
        po.final_quantity_kg,
        po.warehouse_received_kg,
        po.status AS po_status,
        o.order_number,
        c.name AS customer_name,
        c.name_ar AS customer_name_ar,
        COALESCE(i.name, cp.id::text) AS product_name,
        i.name_ar AS product_name_ar,
        COALESCE(SUM(r.weight_kg), 0) AS total_film_weight,
        COALESCE(SUM(CASE WHEN r.stage IN ('printing','done') THEN r.weight_kg ELSE 0 END), 0) AS total_print_weight,
        COALESCE(SUM(CASE WHEN r.stage = 'done' THEN r.cut_weight_total_kg ELSE 0 END), 0) AS total_cut_weight,
        COALESCE(SUM(CASE WHEN r.stage = 'done' THEN r.waste_kg ELSE 0 END), 0) AS waste_weight,
        COALESCE(po.warehouse_received_kg, 0) AS total_received_weight
      FROM production_orders po
      JOIN orders o ON po.order_id = o.id
      JOIN customers c ON o.customer_id = c.id
      JOIN customer_products cp ON po.customer_product_id = cp.id
      LEFT JOIN items i ON cp.item_id = i.id
      LEFT JOIN rolls r ON r.production_order_id = po.id
      WHERE EXISTS (SELECT 1 FROM rolls r2 WHERE r2.production_order_id = po.id AND r2.stage = 'done')
        AND CAST(po.warehouse_received_kg AS NUMERIC) < CAST(po.quantity_kg AS NUMERIC)
      GROUP BY po.id, po.production_order_number, po.order_id, po.quantity_kg, po.final_quantity_kg,
               po.warehouse_received_kg, po.status, o.order_number, c.name, c.name_ar, i.name, i.name_ar, cp.id
      ORDER BY po.id
    `);
    return (rows.rows as any[]).map(row => ({
      ...row,
      production_order_id: Number(row.production_order_id),
      order_id: Number(row.order_id),
    }));
  }

  async getProductionOrderStats(productionOrderId?: number): Promise<any> {
    if (!productionOrderId) {
      const [total] = await db.select({ count: count() }).from(production_orders);
      const [active] = await db.select({ count: count() }).from(production_orders).where(eq(production_orders.status, 'in_progress'));
      return { total: total?.count || 0, active: active?.count || 0 };
    }

    const [po] = await db.select().from(production_orders).where(eq(production_orders.id, productionOrderId));
    if (!po) throw new Error("أمر الإنتاج غير موجود");

    const orderRolls = await db.select().from(rolls).where(eq(rolls.production_order_id, productionOrderId));

    const totalRolls = orderRolls.length;
    const totalWeight = orderRolls.reduce((sum, r) => sum + parseFloat(String(r.weight_kg || 0)), 0);
    const filmRolls = orderRolls.filter(r => r.stage === 'film').length;
    const printingRolls = orderRolls.filter(r => r.stage === 'printing').length;
    const cuttingRolls = orderRolls.filter(r => r.stage === 'cutting').length;
    const doneRolls = orderRolls.filter(r => r.stage === 'done' || r.stage === 'archived').length;

    const targetQuantity = parseFloat(String(po.quantity_kg || 0));
    const completionPercentage = targetQuantity > 0 ? Math.min(100, (totalWeight / targetQuantity) * 100) : 0;
    const remainingQuantity = Math.max(0, targetQuantity - totalWeight);

    const wasteRecords = await db.select({ total: sql<string>`COALESCE(SUM(quantity_wasted), 0)` }).from(waste).where(eq(waste.production_order_id, productionOrderId));
    const totalWaste = parseFloat(wasteRecords[0]?.total || '0');

    const productionStartTime = po.production_start_time || po.created_at;
    const productionEndTime = po.production_end_time || null;
    let productionTimeHours = 0;
    if (productionStartTime && productionEndTime) {
      productionTimeHours = Math.round((new Date(productionEndTime).getTime() - new Date(productionStartTime).getTime()) / 3600000 * 10) / 10;
    }

    return {
      production_order: po,
      total_rolls: totalRolls,
      total_weight: totalWeight.toFixed(2),
      film_rolls: filmRolls,
      printing_rolls: printingRolls,
      cutting_rolls: cuttingRolls,
      done_rolls: doneRolls,
      completion_percentage: completionPercentage.toFixed(1),
      remaining_quantity: remainingQuantity.toFixed(2),
      total_waste: totalWaste.toFixed(2),
      production_time_hours: productionTimeHours,
    };
  }

  async getProductionOrdersWithDetails(): Promise<any[]> {
    const results = await db
      .select({
        id: production_orders.id,
        production_order_number: production_orders.production_order_number,
        order_id: production_orders.order_id,
        customer_product_id: production_orders.customer_product_id,
        quantity_kg: production_orders.quantity_kg,
        final_quantity_kg: production_orders.final_quantity_kg,
        produced_kg: production_orders.produced_quantity_kg,
        status: production_orders.status,
        assigned_machine_id: production_orders.assigned_machine_id,
        assigned_operator_id: production_orders.assigned_operator_id,
        warehouse_received_kg: production_orders.warehouse_received_kg,
        overrun_percentage: production_orders.overrun_percentage,
        created_at: production_orders.created_at,
        order_number: orders.order_number,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
        size_caption: customer_products.size_caption,
        is_printed: customer_products.is_printed,
        item_name: items.name,
        item_name_ar: items.name_ar,
        machine_name: machines.name,
        machine_name_ar: machines.name_ar,
        operator_name: users.display_name,
        operator_name_ar: users.display_name_ar,
      })
      .from(production_orders)
      .innerJoin(orders, eq(production_orders.order_id, orders.id))
      .innerJoin(customers, eq(orders.customer_id, customers.id))
      .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
      .leftJoin(items, eq(customer_products.item_id, items.id))
      .leftJoin(machines, eq(production_orders.assigned_machine_id, machines.id))
      .leftJoin(users, eq(production_orders.assigned_operator_id, users.id))
      .orderBy(desc(production_orders.id));
    return results;
  }

  async getProductionStatsBySection(sectionId?: number): Promise<any> {
    return { sectionId, total: 0 };
  }

  async getMonitoringDashboard(dateFrom?: string, dateTo?: string): Promise<any> {
    const dateCondition = (dateField: any) => {
      const conditions: any[] = [];
      if (dateFrom) conditions.push(sql`${dateField} >= ${dateFrom}::timestamp`);
      if (dateTo) conditions.push(sql`${dateField} <= (${dateTo}::date + interval '1 day')`);
      return conditions.length > 0 ? and(...conditions) : undefined;
    };

    const allRolls = await db
      .select({
        id: rolls.id,
        weight_kg: rolls.weight_kg,
        stage: rolls.stage,
        created_at: rolls.created_at,
        printed_at: rolls.printed_at,
        cut_completed_at: rolls.cut_completed_at,
        film_machine_id: rolls.film_machine_id,
        printing_machine_id: rolls.printing_machine_id,
        cutting_machine_id: rolls.cutting_machine_id,
        created_by: rolls.created_by,
        printed_by: rolls.printed_by,
        cut_by: rolls.cut_by,
        production_order_id: rolls.production_order_id,
        waste_kg: rolls.waste_kg,
        cut_weight_total_kg: rolls.cut_weight_total_kg,
      })
      .from(rolls)
      .where(dateCondition(rolls.created_at));

    const machineRows = await db
      .select({ id: machines.id, name: machines.name, name_ar: machines.name_ar, type: machines.type })
      .from(machines);
    const machineMap = new Map(machineRows.map(m => [m.id, m]));

    const userRows = await db
      .select({ id: users.id, display_name: users.display_name, display_name_ar: users.display_name_ar })
      .from(users);
    const userMap = new Map(userRows.map(u => [u.id, u]));

    const poRows = await db
      .select({
        po_id: production_orders.id,
        po_number: production_orders.production_order_number,
        cp_id: production_orders.customer_product_id,
        order_id: production_orders.order_id,
        quantity_kg: production_orders.quantity_kg,
        status: production_orders.status,
        size_caption: customer_products.size_caption,
        item_name: items.name,
        item_name_ar: items.name_ar,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
      })
      .from(production_orders)
      .innerJoin(orders, eq(production_orders.order_id, orders.id))
      .innerJoin(customers, eq(orders.customer_id, customers.id))
      .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
      .leftJoin(items, eq(customer_products.item_id, items.id));
    const poMap = new Map(poRows.map(p => [p.po_id, p]));

    let filmKg = 0, printingKg = 0, cuttingKg = 0, doneKg = 0;
    let filmRolls = 0, printingRolls = 0, cuttingRolls = 0, doneRolls = 0;
    let totalWaste = 0;

    const machineStats: Record<string, { film_kg: number; film_rolls: number; printing_kg: number; printing_rolls: number; cutting_kg: number; cutting_rolls: number; last_production: string | null }> = {};
    const workerStats: Record<number, { film_kg: number; film_rolls: number; printing_kg: number; printing_rolls: number; cutting_kg: number; cutting_rolls: number }> = {};
    const productStats: Record<number, { total_kg: number; total_rolls: number }> = {};

    for (const r of allRolls) {
      const w = parseFloat(String(r.weight_kg || 0));
      const wasteW = parseFloat(String(r.waste_kg || 0));
      totalWaste += wasteW;

      if (r.stage === 'film') { filmKg += w; filmRolls++; }
      else if (r.stage === 'printing') { printingKg += w; printingRolls++; }
      else if (r.stage === 'cutting') { cuttingKg += w; cuttingRolls++; }
      else if (r.stage === 'done' || r.stage === 'archived') { doneKg += w; doneRolls++; }

      if (r.film_machine_id) {
        if (!machineStats[r.film_machine_id]) machineStats[r.film_machine_id] = { film_kg: 0, film_rolls: 0, printing_kg: 0, printing_rolls: 0, cutting_kg: 0, cutting_rolls: 0, last_production: null };
        machineStats[r.film_machine_id].film_kg += w;
        machineStats[r.film_machine_id].film_rolls++;
        const ts = r.created_at ? new Date(r.created_at).toISOString() : null;
        if (ts && (!machineStats[r.film_machine_id].last_production || ts > machineStats[r.film_machine_id].last_production!)) machineStats[r.film_machine_id].last_production = ts;
      }
      if (r.printing_machine_id && r.printed_at) {
        if (!machineStats[r.printing_machine_id]) machineStats[r.printing_machine_id] = { film_kg: 0, film_rolls: 0, printing_kg: 0, printing_rolls: 0, cutting_kg: 0, cutting_rolls: 0, last_production: null };
        machineStats[r.printing_machine_id].printing_kg += w;
        machineStats[r.printing_machine_id].printing_rolls++;
        const pts = new Date(r.printed_at).toISOString();
        if (!machineStats[r.printing_machine_id].last_production || pts > machineStats[r.printing_machine_id].last_production!) machineStats[r.printing_machine_id].last_production = pts;
      }
      if (r.cutting_machine_id && r.cut_completed_at) {
        if (!machineStats[r.cutting_machine_id]) machineStats[r.cutting_machine_id] = { film_kg: 0, film_rolls: 0, printing_kg: 0, printing_rolls: 0, cutting_kg: 0, cutting_rolls: 0, last_production: null };
        machineStats[r.cutting_machine_id].cutting_kg += w;
        machineStats[r.cutting_machine_id].cutting_rolls++;
        const cts = new Date(r.cut_completed_at).toISOString();
        if (!machineStats[r.cutting_machine_id].last_production || cts > machineStats[r.cutting_machine_id].last_production!) machineStats[r.cutting_machine_id].last_production = cts;
      }

      if (r.created_by) {
        if (!workerStats[r.created_by]) workerStats[r.created_by] = { film_kg: 0, film_rolls: 0, printing_kg: 0, printing_rolls: 0, cutting_kg: 0, cutting_rolls: 0 };
        workerStats[r.created_by].film_kg += w;
        workerStats[r.created_by].film_rolls++;
      }
      if (r.printed_by && r.printed_at) {
        if (!workerStats[r.printed_by]) workerStats[r.printed_by] = { film_kg: 0, film_rolls: 0, printing_kg: 0, printing_rolls: 0, cutting_kg: 0, cutting_rolls: 0 };
        workerStats[r.printed_by].printing_kg += w;
        workerStats[r.printed_by].printing_rolls++;
      }
      if (r.cut_by && r.cut_completed_at) {
        if (!workerStats[r.cut_by]) workerStats[r.cut_by] = { film_kg: 0, film_rolls: 0, printing_kg: 0, printing_rolls: 0, cutting_kg: 0, cutting_rolls: 0 };
        workerStats[r.cut_by].cutting_kg += w;
        workerStats[r.cut_by].cutting_rolls++;
      }

      if (r.production_order_id) {
        if (!productStats[r.production_order_id]) productStats[r.production_order_id] = { total_kg: 0, total_rolls: 0 };
        productStats[r.production_order_id].total_kg += w;
        productStats[r.production_order_id].total_rolls++;
      }
    }

    const totalKg = filmKg + printingKg + cuttingKg + doneKg;
    const totalRolls = allRolls.length;

    const machinesResult = Object.entries(machineStats).map(([id, s]) => {
      const m = machineMap.get(id);
      const totalMachineKg = s.film_kg + s.printing_kg + s.cutting_kg;
      const totalMachineRolls = s.film_rolls + s.printing_rolls + s.cutting_rolls;
      return {
        id, name: m?.name || id, name_ar: m?.name_ar || m?.name || id, type: m?.type || '',
        film_kg: +s.film_kg.toFixed(2), film_rolls: s.film_rolls,
        printing_kg: +s.printing_kg.toFixed(2), printing_rolls: s.printing_rolls,
        cutting_kg: +s.cutting_kg.toFixed(2), cutting_rolls: s.cutting_rolls,
        total_kg: +totalMachineKg.toFixed(2), total_rolls: totalMachineRolls,
        last_production: s.last_production,
      };
    }).sort((a, b) => b.total_kg - a.total_kg);

    const workersResult = Object.entries(workerStats).map(([id, s]) => {
      const u = userMap.get(Number(id));
      const totalWorkerKg = s.film_kg + s.printing_kg + s.cutting_kg;
      const totalWorkerRolls = s.film_rolls + s.printing_rolls + s.cutting_rolls;
      return {
        id: Number(id), name: u?.display_name || `User ${id}`, name_ar: u?.display_name_ar || u?.display_name || `عامل ${id}`,
        film_kg: +s.film_kg.toFixed(2), film_rolls: s.film_rolls,
        printing_kg: +s.printing_kg.toFixed(2), printing_rolls: s.printing_rolls,
        cutting_kg: +s.cutting_kg.toFixed(2), cutting_rolls: s.cutting_rolls,
        total_kg: +totalWorkerKg.toFixed(2), total_rolls: totalWorkerRolls,
      };
    }).sort((a, b) => b.total_kg - a.total_kg);

    const productAgg: Record<string, { item_name: string; item_name_ar: string; customer_name: string; customer_name_ar: string; size_caption: string; total_kg: number; total_rolls: number }> = {};
    for (const [poId, s] of Object.entries(productStats)) {
      const po = poMap.get(Number(poId));
      if (!po) continue;
      const key = `${po.cp_id || 'unknown'}`;
      if (!productAgg[key]) {
        productAgg[key] = {
          item_name: po.item_name || '', item_name_ar: po.item_name_ar || po.item_name || '',
          customer_name: po.customer_name || '', customer_name_ar: po.customer_name_ar || po.customer_name || '',
          size_caption: po.size_caption || '', total_kg: 0, total_rolls: 0,
        };
      }
      productAgg[key].total_kg += s.total_kg;
      productAgg[key].total_rolls += s.total_rolls;
    }
    const productsResult = Object.values(productAgg)
      .map(p => ({ ...p, total_kg: +p.total_kg.toFixed(2) }))
      .sort((a, b) => b.total_kg - a.total_kg)
      .slice(0, 20);

    return {
      summary: {
        total_kg: +totalKg.toFixed(2), total_rolls: totalRolls,
        film_kg: +filmKg.toFixed(2), film_rolls: filmRolls,
        printing_kg: +printingKg.toFixed(2), printing_rolls: printingRolls,
        cutting_kg: +cuttingKg.toFixed(2), cutting_rolls: cuttingRolls,
        done_kg: +doneKg.toFixed(2), done_rolls: doneRolls,
        total_waste_kg: +totalWaste.toFixed(2),
      },
      machines: machinesResult,
      workers: workersResult,
      products: productsResult,
    };
  }

  async getProductionSummary(options?: any): Promise<any> {
    const stats = await this.getProductionStats();
    return stats;
  }

  async getQualityChecks(rollId?: number): Promise<QualityCheck[]> {
    if (rollId) return this.getQualityChecksByRoll(rollId);
    return await db.select().from(quality_checks).orderBy(desc(quality_checks.id));
  }

  async getQuickNoteById(id: number): Promise<QuickNote | undefined> {
    const [n] = await db.select().from(quick_notes).where(eq(quick_notes.id, id));
    return n;
  }

  async getRealTimeProductionStats(): Promise<any> {
    return { active: 0, completed: 0, pending: 0 };
  }

  async getDatabaseStats(): Promise<any> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [orderCount] = await db.select({ count: count() }).from(orders);
    const [rollCount] = await db.select({ count: count() }).from(rolls);
    return {
      users: userCount?.count || 0,
      orders: orderCount?.count || 0,
      rolls: rollCount?.count || 0,
    };
  }

  async getDistributionPreview(options?: any): Promise<any> {
    return { preview: [], suggestions: [] };
  }

  async getFactoryLocation(id: number): Promise<FactoryLocation | undefined> {
    const [l] = await db.select().from(factory_locations).where(eq(factory_locations.id, id));
    return l;
  }

  async getHRReports(options?: any): Promise<any> {
    return { reports: [] };
  }

  async getMachineCapacityStats(): Promise<any> {
    return { machines: [], totalCapacity: 0, usedCapacity: 0 };
  }

  async getMachineDetailAllStages(machineId: number): Promise<any> {
    const machine = await this.getMachineById(machineId);
    const queue = await this.getMachineQueue(machineId);
    return { machine, queue };
  }

  async getMachinePerformance(filters?: any): Promise<any> {
    return { performance: 0, uptime: 0 };
  }

  async getMachineQueues(): Promise<any[]> {
    const allMachines = await this.getAllMachines();
    const queues = await Promise.all(allMachines.map(m => this.getMachineQueue(m.id as any)));
    return allMachines.map((m, i) => ({ machine: m, queue: queues[i] }));
  }

  async getMachineUtilizationStats(): Promise<any> {
    return { utilization: 0, machines: [] };
  }

  async getQualityIssues(filters?: { status?: string; source?: string; severity?: string; customer_id?: string; dateFrom?: string; dateTo?: string }): Promise<any[]> {
    const conditions: any[] = [];
    if (filters?.status) conditions.push(eq(quality_issues.status, filters.status));
    if (filters?.source) conditions.push(eq(quality_issues.source, filters.source));
    if (filters?.severity) conditions.push(eq(quality_issues.severity, filters.severity));
    if (filters?.customer_id) conditions.push(eq(quality_issues.customer_id, filters.customer_id));
    if (filters?.dateFrom) conditions.push(sql`${quality_issues.created_at} >= ${filters.dateFrom}::timestamp`);
    if (filters?.dateTo) conditions.push(sql`${quality_issues.created_at} <= (${filters.dateTo}::date + interval '1 day')`);

    const detectedByUser = alias(users, "detected_by_user");
    const resolvedByUser = alias(users, "resolved_by_user");

    const results = await db
      .select({
        id: quality_issues.id,
        issue_number: quality_issues.issue_number,
        source: quality_issues.source,
        severity: quality_issues.severity,
        status: quality_issues.status,
        category: quality_issues.category,
        stage: quality_issues.stage,
        production_order_id: quality_issues.production_order_id,
        order_id: quality_issues.order_id,
        roll_id: quality_issues.roll_id,
        customer_id: quality_issues.customer_id,
        description: quality_issues.description,
        customer_complaint_details: quality_issues.customer_complaint_details,
        customer_action_taken: quality_issues.customer_action_taken,
        root_cause: quality_issues.root_cause,
        corrective_action: quality_issues.corrective_action,
        preventive_action: quality_issues.preventive_action,
        estimated_loss: quality_issues.estimated_loss,
        loss_details: quality_issues.loss_details,
        detected_by: quality_issues.detected_by,
        resolved_by: quality_issues.resolved_by,
        detected_at: quality_issues.detected_at,
        resolved_at: quality_issues.resolved_at,
        created_at: quality_issues.created_at,
        updated_at: quality_issues.updated_at,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
        detected_by_name: detectedByUser.display_name,
        detected_by_name_ar: detectedByUser.display_name_ar,
        resolved_by_name: resolvedByUser.display_name,
        resolved_by_name_ar: resolvedByUser.display_name_ar,
        production_order_number: production_orders.production_order_number,
        order_number: orders.order_number,
      })
      .from(quality_issues)
      .leftJoin(customers, eq(quality_issues.customer_id, customers.id))
      .leftJoin(detectedByUser, eq(quality_issues.detected_by, detectedByUser.id))
      .leftJoin(resolvedByUser, eq(quality_issues.resolved_by, resolvedByUser.id))
      .leftJoin(production_orders, eq(quality_issues.production_order_id, production_orders.id))
      .leftJoin(orders, eq(quality_issues.order_id, orders.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(quality_issues.created_at));

    return results;
  }

  async getQualityIssueById(id: number): Promise<any> {
    const detectedByUser = alias(users, "detected_by_user");
    const resolvedByUser = alias(users, "resolved_by_user");

    const [issue] = await db
      .select({
        id: quality_issues.id,
        issue_number: quality_issues.issue_number,
        source: quality_issues.source,
        severity: quality_issues.severity,
        status: quality_issues.status,
        category: quality_issues.category,
        stage: quality_issues.stage,
        production_order_id: quality_issues.production_order_id,
        order_id: quality_issues.order_id,
        roll_id: quality_issues.roll_id,
        customer_id: quality_issues.customer_id,
        description: quality_issues.description,
        customer_complaint_details: quality_issues.customer_complaint_details,
        customer_action_taken: quality_issues.customer_action_taken,
        root_cause: quality_issues.root_cause,
        corrective_action: quality_issues.corrective_action,
        preventive_action: quality_issues.preventive_action,
        estimated_loss: quality_issues.estimated_loss,
        loss_details: quality_issues.loss_details,
        detected_by: quality_issues.detected_by,
        resolved_by: quality_issues.resolved_by,
        detected_at: quality_issues.detected_at,
        resolved_at: quality_issues.resolved_at,
        created_at: quality_issues.created_at,
        updated_at: quality_issues.updated_at,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
        detected_by_name: detectedByUser.display_name,
        detected_by_name_ar: detectedByUser.display_name_ar,
        resolved_by_name: resolvedByUser.display_name,
        resolved_by_name_ar: resolvedByUser.display_name_ar,
        production_order_number: production_orders.production_order_number,
        order_number: orders.order_number,
      })
      .from(quality_issues)
      .leftJoin(customers, eq(quality_issues.customer_id, customers.id))
      .leftJoin(detectedByUser, eq(quality_issues.detected_by, detectedByUser.id))
      .leftJoin(resolvedByUser, eq(quality_issues.resolved_by, resolvedByUser.id))
      .leftJoin(production_orders, eq(quality_issues.production_order_id, production_orders.id))
      .leftJoin(orders, eq(quality_issues.order_id, orders.id))
      .where(eq(quality_issues.id, id));

    if (!issue) return null;

    const responsibles = await db
      .select({
        id: quality_issue_responsibles.id,
        quality_issue_id: quality_issue_responsibles.quality_issue_id,
        user_id: quality_issue_responsibles.user_id,
        department: quality_issue_responsibles.department,
        responsibility_type: quality_issue_responsibles.responsibility_type,
        action_taken: quality_issue_responsibles.action_taken,
        penalty_type: quality_issue_responsibles.penalty_type,
        deduction_amount: quality_issue_responsibles.deduction_amount,
        notes: quality_issue_responsibles.notes,
        created_at: quality_issue_responsibles.created_at,
        user_name: users.display_name,
        user_name_ar: users.display_name_ar,
      })
      .from(quality_issue_responsibles)
      .leftJoin(users, eq(quality_issue_responsibles.user_id, users.id))
      .where(eq(quality_issue_responsibles.quality_issue_id, id));

    const actionPerformer = alias(users, "action_performer");
    const actions = await db
      .select({
        id: quality_issue_actions.id,
        quality_issue_id: quality_issue_actions.quality_issue_id,
        action_type: quality_issue_actions.action_type,
        description: quality_issue_actions.description,
        performed_by: quality_issue_actions.performed_by,
        status: quality_issue_actions.status,
        due_date: quality_issue_actions.due_date,
        completed_at: quality_issue_actions.completed_at,
        created_at: quality_issue_actions.created_at,
        performed_by_name: actionPerformer.display_name,
        performed_by_name_ar: actionPerformer.display_name_ar,
      })
      .from(quality_issue_actions)
      .leftJoin(actionPerformer, eq(quality_issue_actions.performed_by, actionPerformer.id))
      .where(eq(quality_issue_actions.quality_issue_id, id))
      .orderBy(desc(quality_issue_actions.created_at));

    return { ...issue, responsibles, actions };
  }

  async createQualityIssue(data: InsertQualityIssue): Promise<QualityIssue> {
    const [maxId] = await db.select({ max: sql<number>`COALESCE(MAX(id), 0)` }).from(quality_issues);
    const nextNum = (maxId?.max || 0) + 1;
    const issueNumber = `QI-${String(nextNum).padStart(4, '0')}`;

    const [issue] = await db.insert(quality_issues).values({
      ...data,
      issue_number: issueNumber,
    }).returning();
    return issue;
  }

  async updateQualityIssue(id: number, data: Partial<InsertQualityIssue>): Promise<QualityIssue | null> {
    const [issue] = await db.update(quality_issues).set({
      ...data,
      updated_at: new Date(),
    }).where(eq(quality_issues.id, id)).returning();
    return issue || null;
  }

  async deleteQualityIssue(id: number): Promise<boolean> {
    const result = await db.delete(quality_issues).where(eq(quality_issues.id, id)).returning();
    return result.length > 0;
  }

  async addQualityIssueResponsible(data: InsertQualityIssueResponsible): Promise<QualityIssueResponsible> {
    const [resp] = await db.insert(quality_issue_responsibles).values(data).returning();
    return resp;
  }

  async updateQualityIssueResponsible(id: number, data: Partial<InsertQualityIssueResponsible>): Promise<QualityIssueResponsible | null> {
    const [resp] = await db.update(quality_issue_responsibles).set(data).where(eq(quality_issue_responsibles.id, id)).returning();
    return resp || null;
  }

  async deleteQualityIssueResponsible(id: number): Promise<boolean> {
    const result = await db.delete(quality_issue_responsibles).where(eq(quality_issue_responsibles.id, id)).returning();
    return result.length > 0;
  }

  async addQualityIssueAction(data: InsertQualityIssueAction): Promise<QualityIssueAction> {
    const [action] = await db.insert(quality_issue_actions).values(data).returning();
    return action;
  }

  async updateQualityIssueAction(id: number, data: Partial<InsertQualityIssueAction>): Promise<QualityIssueAction | null> {
    const [action] = await db.update(quality_issue_actions).set(data).where(eq(quality_issue_actions.id, id)).returning();
    return action || null;
  }

  async getQualityIssueStats(): Promise<any> {
    const allIssues = await db.select({
      status: quality_issues.status,
      severity: quality_issues.severity,
      source: quality_issues.source,
      category: quality_issues.category,
    }).from(quality_issues);

    const total = allIssues.length;
    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    for (const i of allIssues) {
      byStatus[i.status || 'unknown'] = (byStatus[i.status || 'unknown'] || 0) + 1;
      bySeverity[i.severity || 'unknown'] = (bySeverity[i.severity || 'unknown'] || 0) + 1;
      bySource[i.source || 'unknown'] = (bySource[i.source || 'unknown'] || 0) + 1;
      byCategory[i.category || 'unknown'] = (byCategory[i.category || 'unknown'] || 0) + 1;
    }

    return { total, byStatus, bySeverity, bySource, byCategory };
  }
}

export const storage = new DatabaseStorage();
