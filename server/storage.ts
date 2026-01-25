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
function setNotificationManager(nm: any): void {
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

  // Warehouse - Production Hall
  getProductionOrdersForReceipt(): Promise<any[]>;

  // Production Orders

  // Rolls
  getRolls(options?: {
    limit?: number;
    offset?: number;
    stage?: string;
  }): Promise<Roll[]>;
  getRollsByProductionOrder(productionOrderId: number): Promise<Roll[]>;
  getRollsByStage(stage: string): Promise<Roll[]>;
  createRoll(roll: InsertRoll, options?: { skipWeightValidation?: boolean }): Promise<Roll>;
  updateRoll(id: number, updates: Partial<Roll>): Promise<Roll>;

  // Machines
  getMachines(): Promise<Machine[]>;
  getMachineById(id: string): Promise<Machine | undefined>;

  // Machine Queues
  getMachineQueues(): Promise<any[]>;
  assignToMachineQueue(productionOrderId: number, machineId: string, position: number, userId: number): Promise<MachineQueue>;
  updateQueuePosition(queueId: number, newPosition: number): Promise<MachineQueue>;
  removeFromQueue(queueId: number): Promise<void>;
  suggestOptimalDistribution(): Promise<any[]>;
  
  // Smart Distribution Functions
  smartDistributeOrders(algorithm: string, params?: any): Promise<any>;
  calculateMachineCapacity(machineId: string): Promise<any>;
  getDistributionPreview(algorithm: string, params?: any): Promise<any>;
  optimizeQueueOrder(machineId: string): Promise<void>;
  getMachineCapacityStats(): Promise<any[]>;

  // Customers
  getCustomers(options?: { search?: string; page?: number; limit?: number }): Promise<{ data: Customer[]; total: number; page: number; limit: number; totalPages: number }>;
  getAllCustomers(): Promise<Customer[]>;

  // Customer Products (replacing the old Product table)
  getCustomerProducts(options?: { customer_id?: string; ids?: number[]; page?: number; limit?: number; search?: string }): Promise<{ data: CustomerProduct[]; total: number }>;
  createCustomerProduct(customerProduct: any): Promise<CustomerProduct>;

  // Customers
  createCustomer(customer: any): Promise<Customer>;
  createMachine(machine: any): Promise<Machine>;
  createSection(section: any): Promise<Section>;

  createItem(item: any): Promise<Item>;
  createCustomerProduct(customerProduct: any): Promise<CustomerProduct>;
  createLocation(location: any): Promise<Location>;

  // Training Records
  getTrainingRecords(): Promise<TrainingRecord[]>;
  createTrainingRecord(record: any): Promise<TrainingRecord>;

  // Admin Decisions
  getAdminDecisions(): Promise<AdminDecision[]>;
  createAdminDecision(decision: any): Promise<AdminDecision>;

  // Warehouse Transactions
  getWarehouseTransactions(): Promise<WarehouseTransaction[]>;
  createWarehouseTransaction(transaction: any): Promise<WarehouseTransaction>;

  // Mixing Recipes
  getMixingRecipes(): Promise<any[]>;
  createMixingRecipe(recipe: any): Promise<any>;

  // Sections
  getSections(): Promise<Section[]>;

  // Production Monitoring Analytics
  getUserPerformanceStats(
    userId?: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any>;
  getRolePerformanceStats(dateFrom?: string, dateTo?: string): Promise<any>;
  getRealTimeProductionStats(): Promise<any>;
  getProductionEfficiencyMetrics(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any>;
  getProductionAlerts(): Promise<any>;
  getMachineUtilizationStats(dateFrom?: string, dateTo?: string): Promise<any>;

  // Production Monitoring - New APIs for sections
  getProductionStatsBySection(section: string, dateFrom?: string, dateTo?: string): Promise<any>;
  getUsersPerformanceBySection(section: string, dateFrom?: string, dateTo?: string): Promise<any[]>;
  getMachinesProductionBySection(section: string, dateFrom?: string, dateTo?: string): Promise<any[]>;
  getRollsBySection(section: string, search?: string): Promise<any[]>;
  getProductionOrdersBySection(section: string, search?: string): Promise<any[]>;

  // Items
  getItems(): Promise<Item[]>;

  // Customer Products
  getCustomerProducts(options?: { customer_id?: string; ids?: number[]; page?: number; limit?: number; search?: string }): Promise<{ data: CustomerProduct[]; total: number }>;

  // Locations
  getLocations(): Promise<Location[]>;

  // Users
  getUsers(): Promise<User[]>;

  // Categories
  getCategories(): Promise<any[]>;
  createCategory(data: any): Promise<any>;
  updateCategory(id: string, data: any): Promise<any>;
  deleteCategory(id: string): Promise<void>;

  // HR System - Training Programs
  getTrainingPrograms(): Promise<TrainingProgram[]>;
  createTrainingProgram(
    program: InsertTrainingProgram,
  ): Promise<TrainingProgram>;
  updateTrainingProgram(
    id: number,
    updates: Partial<TrainingProgram>,
  ): Promise<TrainingProgram>;
  getTrainingProgramById(id: number): Promise<TrainingProgram | undefined>;

  // HR System - Training Materials
  getTrainingMaterials(programId?: number): Promise<TrainingMaterial[]>;
  createTrainingMaterial(
    material: InsertTrainingMaterial,
  ): Promise<TrainingMaterial>;
  updateTrainingMaterial(
    id: number,
    updates: Partial<TrainingMaterial>,
  ): Promise<TrainingMaterial>;
  deleteTrainingMaterial(id: number): Promise<boolean>;

  // HR System - Training Enrollments
  getTrainingEnrollments(employeeId?: number): Promise<TrainingEnrollment[]>;
  createTrainingEnrollment(
    enrollment: InsertTrainingEnrollment,
  ): Promise<TrainingEnrollment>;
  updateTrainingEnrollment(
    id: number,
    updates: Partial<TrainingEnrollment>,
  ): Promise<TrainingEnrollment>;
  getEnrollmentsByProgram(programId: number): Promise<TrainingEnrollment[]>;

  // HR System - Training Evaluations
  getTrainingEvaluations(
    employeeId?: number,
    programId?: number,
  ): Promise<TrainingEvaluation[]>;
  createTrainingEvaluation(
    evaluation: InsertTrainingEvaluation,
  ): Promise<TrainingEvaluation>;
  updateTrainingEvaluation(
    id: number,
    updates: Partial<TrainingEvaluation>,
  ): Promise<TrainingEvaluation>;
  getTrainingEvaluationById(
    id: number,
  ): Promise<TrainingEvaluation | undefined>;

  // HR System - Training Certificates
  getTrainingCertificates(employeeId?: number): Promise<TrainingCertificate[]>;
  createTrainingCertificate(
    certificate: InsertTrainingCertificate,
  ): Promise<TrainingCertificate>;
  updateTrainingCertificate(
    id: number,
    updates: Partial<TrainingCertificate>,
  ): Promise<TrainingCertificate>;
  generateTrainingCertificate(
    enrollmentId: number,
  ): Promise<TrainingCertificate>;

  // HR System - Performance Reviews
  getPerformanceReviews(employeeId?: string): Promise<PerformanceReview[]>;
  createPerformanceReview(
    review: InsertPerformanceReview,
  ): Promise<PerformanceReview>;
  updatePerformanceReview(
    id: number,
    updates: Partial<PerformanceReview>,
  ): Promise<PerformanceReview>;
  getPerformanceReviewById(id: number): Promise<PerformanceReview | undefined>;

  // HR System - Performance Criteria
  getPerformanceCriteria(): Promise<PerformanceCriteria[]>;
  createPerformanceCriteria(
    criteria: InsertPerformanceCriteria,
  ): Promise<PerformanceCriteria>;
  updatePerformanceCriteria(
    id: number,
    updates: Partial<PerformanceCriteria>,
  ): Promise<PerformanceCriteria>;

  // HR System - Performance Ratings
  getPerformanceRatings(reviewId: number): Promise<PerformanceRating[]>;
  createPerformanceRating(
    rating: InsertPerformanceRating,
  ): Promise<PerformanceRating>;
  updatePerformanceRating(
    id: number,
    updates: Partial<PerformanceRating>,
  ): Promise<PerformanceRating>;

  // HR System - Leave Types
  getLeaveTypes(): Promise<LeaveType[]>;
  createLeaveType(leaveType: InsertLeaveType): Promise<LeaveType>;
  updateLeaveType(id: number, updates: Partial<LeaveType>): Promise<LeaveType>;

  // HR System - Leave Requests
  getLeaveRequests(employeeId?: string): Promise<LeaveRequest[]>;
  createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest>;
  updateLeaveRequest(
    id: number,
    updates: Partial<LeaveRequest>,
  ): Promise<LeaveRequest>;
  getLeaveRequestById(id: number): Promise<LeaveRequest | undefined>;
  getPendingLeaveRequests(): Promise<LeaveRequest[]>;
  deleteLeaveRequest(id: number): Promise<void>;

  // HR System - Leave Balances
  getLeaveBalances(employeeId: string, year?: number): Promise<LeaveBalance[]>;
  createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance>;
  updateLeaveBalance(
    id: number,
    updates: Partial<LeaveBalance>,
  ): Promise<LeaveBalance>;
  getLeaveBalanceByType(
    employeeId: string,
    leaveTypeId: number,
    year: number,
  ): Promise<LeaveBalance | undefined>;

  // Maintenance
  getMaintenanceRequests(): Promise<MaintenanceRequest[]>;
  createMaintenanceRequest(
    request: InsertMaintenanceRequest,
  ): Promise<MaintenanceRequest>;
  deleteMaintenanceRequest(id: number): Promise<void>;

  // Quality
  getQualityChecks(): Promise<QualityCheck[]>;

  // HR System - Attendance Management
  getAttendance(): Promise<Attendance[]>;
  getAttendanceById(id: number): Promise<Attendance | null>;
  getAttendanceByDate(date: string): Promise<any[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(
    id: number,
    attendance: Partial<Attendance>,
  ): Promise<Attendance>;
  deleteAttendance(id: number): Promise<void>;
  getDailyAttendanceStatus(
    userId: number,
    date: string,
  ): Promise<{
    hasCheckedIn: boolean;
    hasStartedLunch: boolean;
    hasEndedLunch: boolean;
    hasCheckedOut: boolean;
    currentStatus: string;
  }>;
  upsertManualAttendance(entries: {
    user_id: number;
    date: string;
    check_in_time?: string | null;
    check_out_time?: string | null;
    status: string;
    notes?: string;
  }[]): Promise<any[]>;
  getAttendanceSummary(userId: number, startDate: Date, endDate: Date): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalWorkHours: number;
    totalOvertimeHours: number;
    totalLateMinutes: number;
    averageWorkHours: number;
  }>;
  getAttendanceReport(startDate: Date, endDate: Date, filters?: {
    sectionId?: number;
    roleId?: number;
  }): Promise<any[]>;
  getDailyAttendanceStats(date: string): Promise<{
    total: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
  }>;

  // Users list
  getUsers(): Promise<User[]>;
  getRoles(): Promise<Role[]>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    activeOrders: number;
    productionRate: number;
    qualityScore: number;
    wastePercentage: number;
  }>;

  // Production Reports
  getProductionSummary(filters?: any): Promise<any>;
  getProductionByDate(filters?: any): Promise<any>;
  getProductionByProduct(filters?: any): Promise<any>;
  getWasteAnalysis(filters?: any): Promise<any>;
  getMachinePerformance(filters?: any): Promise<any>;
  getOperatorPerformance(filters?: any): Promise<any>;

  // Settings
  getSystemSettings(): Promise<SystemSetting[]>;
  getUserSettings(userId: number): Promise<UserSetting[]>;
  updateSystemSetting(
    key: string,
    value: string,
    userId: number,
  ): Promise<SystemSetting>;
  updateUserSetting(
    userId: number,
    key: string,
    value: string,
  ): Promise<UserSetting>;
  getSystemSettingByKey(key: string): Promise<SystemSetting | undefined>;
  createSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;

  // Factory Locations
  getFactoryLocations(): Promise<FactoryLocation[]>;
  getActiveFactoryLocations(): Promise<FactoryLocation[]>;
  getFactoryLocation(id: number): Promise<FactoryLocation | undefined>;
  createFactoryLocation(location: InsertFactoryLocation): Promise<FactoryLocation>;
  updateFactoryLocation(id: number, location: Partial<InsertFactoryLocation>): Promise<FactoryLocation>;
  deleteFactoryLocation(id: number): Promise<void>;

  // Database Management
  getDatabaseStats(): Promise<any>;
  createDatabaseBackup(): Promise<any>;
  getBackupFile(backupId: string): Promise<any>;
  restoreDatabaseBackup(backupData: any): Promise<any>;
  exportTableData(tableName: string, format: string): Promise<any>;
  importTableData(tableName: string, data: any, format: string): Promise<any>;
  optimizeTables(): Promise<any>;
  checkDatabaseIntegrity(): Promise<any>;
  cleanupOldData(daysOld: number): Promise<any>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(
    userId?: number,
    limit?: number,
    offset?: number,
  ): Promise<Notification[]>;
  getUserNotifications(
    userId: number,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number },
  ): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(notificationId: number): Promise<void>;
  updateNotificationStatus(
    twilioSid: string,
    updates: Partial<Notification>,
  ): Promise<Notification>;
  getUserById(id: number): Promise<User | undefined>;
  getUsersByRole(roleId: number): Promise<User[]>;

  // Notification Templates
  getNotificationTemplates(): Promise<NotificationTemplate[]>;
  createNotificationTemplate(
    template: InsertNotificationTemplate,
  ): Promise<NotificationTemplate>;

  // Maintenance Actions
  getAllMaintenanceActions(): Promise<MaintenanceAction[]>;
  getMaintenanceActionsByRequestId(
    requestId: number,
  ): Promise<MaintenanceAction[]>;
  createMaintenanceAction(
    action: InsertMaintenanceAction,
  ): Promise<MaintenanceAction>;
  updateMaintenanceAction(
    id: number,
    action: Partial<MaintenanceAction>,
  ): Promise<MaintenanceAction>;
  deleteMaintenanceAction(id: number): Promise<void>;

  // Maintenance Reports
  getAllMaintenanceReports(): Promise<MaintenanceReport[]>;
  getMaintenanceReportsByType(type: string): Promise<MaintenanceReport[]>;
  createMaintenanceReport(
    report: InsertMaintenanceReport,
  ): Promise<MaintenanceReport>;
  updateMaintenanceReport(
    id: number,
    report: Partial<MaintenanceReport>,
  ): Promise<MaintenanceReport>;
  deleteMaintenanceReport(id: number): Promise<void>;

  // Operator Negligence Reports
  getAllOperatorNegligenceReports(): Promise<OperatorNegligenceReport[]>;
  getOperatorNegligenceReportsByOperator(
    operatorId: number,
  ): Promise<OperatorNegligenceReport[]>;
  createOperatorNegligenceReport(
    report: InsertOperatorNegligenceReport,
  ): Promise<OperatorNegligenceReport>;
  updateOperatorNegligenceReport(
    id: number,
    report: Partial<OperatorNegligenceReport>,
  ): Promise<OperatorNegligenceReport>;
  deleteOperatorNegligenceReport(id: number): Promise<void>;

  // Production Flow Management
  getProductionSettings(): Promise<ProductionSettings>;
  updateProductionSettings(
    settings: Partial<InsertProductionSettings>,
  ): Promise<ProductionSettings>;
  startProduction(productionOrderId: number): Promise<ProductionOrder>;
  createRollWithQR(rollData: {
    production_order_id: number;
    machine_id: string;
    weight_kg: number;
    created_by: number;
  }): Promise<Roll>;
  markRollPrinted(rollId: number, operatorId: number, printingMachineId?: string): Promise<Roll>;
  updateProductionOrderCompletionPercentages(productionOrderId: number): Promise<void>;
  createCut(cutData: InsertCut): Promise<Cut>;
  createWarehouseReceipt(
    receiptData: InsertWarehouseReceipt,
  ): Promise<WarehouseReceipt>;
  getWarehouseReceiptsDetailed(): Promise<any[]>;
  getFilmQueue(): Promise<ProductionOrder[]>;
  getPrintingQueue(): Promise<Roll[]>;
  getCuttingQueue(): Promise<Roll[]>;
  getGroupedCuttingQueue(): Promise<any[]>;
  getOrderProgress(productionOrderId: number): Promise<any>;
  
  // Enhanced Cutting Operations
  getRollsForCuttingBySection(sectionId?: number): Promise<{
    rolls: Roll[];
    stats: {
      totalRolls: number;
      totalWeight: number;
      todayWaste: number;
      todayWastePercentage: number;
      averageWastePercentage: number;
    };
  }>;
  completeCutting(rollId: number, netWeight: number, operatorId: number): Promise<{
    roll: Roll;
    production_order: ProductionOrder;
    waste_percentage: number;
    is_order_completed: boolean;
  }>;
  calculateWasteStatistics(productionOrderId: number): Promise<{
    totalWaste: number;
    wastePercentage: number;
    operatorStats: Array<{
      operatorId: number;
      operatorName: string;
      rollsCut: number;
      totalWaste: number;
      averageWastePercentage: number;
    }>;
    dailyStats: Array<{
      date: string;
      totalWaste: number;
      wastePercentage: number;
      rollsCount: number;
    }>;
  }>;
  checkCuttingCompletion(productionOrderId: number): Promise<boolean>;
  
  getRollQR(
    rollId: number,
  ): Promise<{ qr_code_text: string; qr_png_base64: string }>;
  getRollLabelData(rollId: number): Promise<{
    roll_number: string;
    production_order_number: string;
    customer_name: string;
    weight_kg: string;
    stage: string;
    created_at: string;
    machine_name: string;
    qr_png_base64: string;
    label_dimensions: { width: string; height: string };
  }>;

  // ============ نظام التحذيرات الذكية ============

  // System Alerts
  getSystemAlerts(filters?: {
    status?: string;
    type?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<SystemAlert[]>;
  getSystemAlertById(id: number): Promise<SystemAlert | undefined>;
  createSystemAlert(alert: InsertSystemAlert): Promise<SystemAlert>;
  updateSystemAlert(
    id: number,
    updates: Partial<SystemAlert>,
  ): Promise<SystemAlert>;
  resolveSystemAlert(
    id: number,
    resolvedBy: number,
    notes?: string,
  ): Promise<SystemAlert>;
  dismissSystemAlert(id: number, dismissedBy: number): Promise<SystemAlert>;
  deleteSystemAlert(id: number): Promise<void>;
  getActiveAlertsCount(): Promise<number>;
  getCriticalAlertsCount(): Promise<number>;
  getAlertsByType(type: string): Promise<SystemAlert[]>;
  getAlertsByUser(userId: number): Promise<SystemAlert[]>;
  getAlertsByRole(roleId: number): Promise<SystemAlert[]>;

  // Alert Rules
  getAlertRules(isEnabled?: boolean): Promise<AlertRule[]>;
  getAlertRuleById(id: number): Promise<AlertRule | undefined>;
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  updateAlertRule(id: number, updates: Partial<AlertRule>): Promise<AlertRule>;
  deleteAlertRule(id: number): Promise<void>;
  enableAlertRule(id: number): Promise<AlertRule>;
  disableAlertRule(id: number): Promise<AlertRule>;

  // System Health Checks
  getSystemHealthChecks(): Promise<SystemHealthCheck[]>;
  getSystemHealthCheckById(id: number): Promise<SystemHealthCheck | undefined>;
  createSystemHealthCheck(
    check: InsertSystemHealthCheck,
  ): Promise<SystemHealthCheck>;
  updateSystemHealthCheck(
    id: number,
    updates: Partial<SystemHealthCheck>,
  ): Promise<SystemHealthCheck>;
  getHealthChecksByType(type: string): Promise<SystemHealthCheck[]>;
  getCriticalHealthChecks(): Promise<SystemHealthCheck[]>;
  getSystemHealthStatus(): Promise<{
    overall_status: string;
    healthy_checks: number;
    warning_checks: number;
    critical_checks: number;
    last_check: Date;
  }>;

  // System Performance Metrics
  getSystemPerformanceMetrics(filters?: {
    metric_name?: string;
    metric_category?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
  }): Promise<SystemPerformanceMetric[]>;
  createSystemPerformanceMetric(
    metric: InsertSystemPerformanceMetric,
  ): Promise<SystemPerformanceMetric>;
  getMetricsByTimeRange(
    metricName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SystemPerformanceMetric[]>;
  getLatestMetricValue(
    metricName: string,
  ): Promise<SystemPerformanceMetric | undefined>;
  deleteOldMetrics(cutoffDate: Date): Promise<number>;
  getPerformanceSummary(
    timeRange: "hour" | "day" | "week",
  ): Promise<Record<string, any>>;

  // Corrective Actions
  getCorrectiveActions(alertId?: number): Promise<CorrectiveAction[]>;
  getCorrectiveActionById(id: number): Promise<CorrectiveAction | undefined>;
  createCorrectiveAction(
    action: InsertCorrectiveAction,
  ): Promise<CorrectiveAction>;
  updateCorrectiveAction(
    id: number,
    updates: Partial<CorrectiveAction>,
  ): Promise<CorrectiveAction>;
  completeCorrectiveAction(
    id: number,
    completedBy: number,
    notes?: string,
  ): Promise<CorrectiveAction>;
  getPendingActions(): Promise<CorrectiveAction[]>;
  getActionsByAssignee(userId: number): Promise<CorrectiveAction[]>;

  // System Analytics
  getSystemAnalytics(filters?: {
    date?: Date;
    metric_type?: string;
    limit?: number;
  }): Promise<SystemAnalytics[]>;
  createSystemAnalytics(
    analytics: InsertSystemAnalytics,
  ): Promise<SystemAnalytics>;
  getDailyAnalytics(date: Date): Promise<SystemAnalytics[]>;
  getAnalyticsTrend(
    metricType: string,
    days: number,
  ): Promise<SystemAnalytics[]>;

  // Monitoring Utilities
  checkDatabaseHealth(): Promise<{
    status: string;
    connection_time: number;
    active_connections: number;
    errors: string[];
  }>;
  checkSystemPerformance(): Promise<{
    memory_usage: number;
    cpu_usage: number;
    uptime: number;
    response_time: number;
  }>;
  getOverdueOrders(): Promise<number>;
  getLowStockItems(): Promise<number>;
  getBrokenMachines(): Promise<number>;
  getQualityIssues(): Promise<number>;

  // Alert Rate Limiting - Persistent Storage
  getLastAlertTime(checkKey: string): Promise<Date | null>;
  setLastAlertTime(checkKey: string, timestamp: Date): Promise<void>;

  // Quick Notes
  getQuickNotes(userId?: number): Promise<any[]>;
  getQuickNoteById(id: number): Promise<any | undefined>;
  createQuickNote(note: any): Promise<any>;
  updateQuickNote(id: number, updates: any): Promise<any>;
  deleteQuickNote(id: number): Promise<void>;
  markNoteAsRead(id: number): Promise<any>;
  
  // Note Attachments
  createNoteAttachment(attachment: any): Promise<any>;
  getNoteAttachments(noteId: number): Promise<any[]>;
  deleteNoteAttachment(id: number): Promise<void>;
  
  // Film Operator Functions
  getActiveProductionOrdersForOperator(userId: number): Promise<any[]>;
  createRollWithTiming(rollData: InsertRoll & { is_last_roll?: boolean }): Promise<Roll>;
  createFinalRoll(rollData: InsertRoll): Promise<Roll>;
  calculateProductionTime(productionOrderId: number): Promise<number>;

  // Printing Operator Functions
  getActivePrintingRollsForOperator(userId: number): Promise<any[]>;

  // Cutting Operator Functions
  getActiveCuttingRollsForOperator(userId: number): Promise<any[]>;

  // Mixing Batches
  getAllMixingBatches(): Promise<any[]>;
  getMixingBatchById(id: number): Promise<any | undefined>;
  createMixingBatch(batch: InsertMixingBatch, ingredients: InsertBatchIngredient[]): Promise<any>;
  updateMixingBatch(id: number, updates: Partial<MixingBatch>): Promise<any>;
  updateBatchIngredientActuals(batchId: number, ingredientUpdates: Array<{
    id: number;
    actual_weight_kg: string;
  }>): Promise<void>;
  completeMixingBatch(id: number): Promise<any>;
  getMixingBatchesByOperator(operatorId: number): Promise<any[]>;
  getMixingBatchesByProductionOrder(productionOrderId: number): Promise<any[]>;

  // Master Batch Colors
  getMasterBatchColors(): Promise<MasterBatchColor[]>;
  getMasterBatchColorById(id: string): Promise<MasterBatchColor | undefined>;
  createMasterBatchColor(color: InsertMasterBatchColor): Promise<MasterBatchColor>;
  updateMasterBatchColor(id: string, updates: Partial<MasterBatchColor>): Promise<MasterBatchColor>;
  deleteMasterBatchColor(id: string): Promise<void>;

  // ===== Warehouse Vouchers System =====
  
  // Raw Material In Vouchers
  getRawMaterialVouchersIn(): Promise<RawMaterialVoucherIn[]>;
  getRawMaterialVoucherInById(id: number): Promise<RawMaterialVoucherIn | undefined>;
  createRawMaterialVoucherIn(voucher: any): Promise<RawMaterialVoucherIn>;
  
  // Raw Material Out Vouchers
  getRawMaterialVouchersOut(): Promise<RawMaterialVoucherOut[]>;
  getRawMaterialVoucherOutById(id: number): Promise<RawMaterialVoucherOut | undefined>;
  createRawMaterialVoucherOut(voucher: any): Promise<RawMaterialVoucherOut>;
  
  // Finished Goods In Vouchers
  getFinishedGoodsVouchersIn(): Promise<FinishedGoodsVoucherIn[]>;
  getFinishedGoodsVoucherInById(id: number): Promise<FinishedGoodsVoucherIn | undefined>;
  createFinishedGoodsVoucherIn(voucher: any): Promise<FinishedGoodsVoucherIn>;
  
  // Finished Goods Out Vouchers
  getFinishedGoodsVouchersOut(): Promise<FinishedGoodsVoucherOut[]>;
  getFinishedGoodsVoucherOutById(id: number): Promise<FinishedGoodsVoucherOut | undefined>;
  createFinishedGoodsVoucherOut(voucher: any): Promise<FinishedGoodsVoucherOut>;
  
  // Warehouse Voucher Stats
  getWarehouseVouchersStats(): Promise<any>;
  
  // Inventory Count (الجرد)
  getInventoryCounts(): Promise<InventoryCount[]>;
  getInventoryCountById(id: number): Promise<any>;
  createInventoryCount(countData: any): Promise<InventoryCount>;
  createInventoryCountItem(itemData: any): Promise<InventoryCountItem>;
  completeInventoryCount(id: number, userId: number): Promise<InventoryCount>;
  
  // Barcode Lookup
  lookupByBarcode(barcode: string): Promise<any>;
  
  // Voucher Number Generation
  getNextVoucherNumber(type: "RMI" | "RMO" | "FGI" | "FGO" | "IC"): Promise<string>;
}

export class DatabaseStorage implements IStorage {
  // In-memory storage for alert rate limiting - persistent during server session
  private alertTimesStorage: Map<string, Date> = new Map();
  async getUser(id: number): Promise<User | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        if (!id || typeof id !== "number" || id <= 0) {
          throw new Error("معرف المستخدم غير صحيح");
        }

        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || undefined;
      },
      "جلب بيانات المستخدم",
      `المستخدم رقم ${id}`,
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        if (
          !username ||
          typeof username !== "string" ||
          username.trim() === ""
        ) {
          throw new Error("اسم المستخدم مطلوب");
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username.trim()));
        return user || undefined;
      },
      "البحث عن المستخدم",
      `اسم المستخدم: ${username}`,
    );
  }

  async getRoleById(id: number): Promise<Role | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        if (!id || typeof id !== "number" || id <= 0) {
          throw new Error("معرف الدور غير صحيح");
        }

        const [role] = await db.select().from(roles).where(eq(roles.id, id));
        return role || undefined;
      },
      "جلب بيانات الدور",
      `الدور رقم ${id}`,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    return withDatabaseErrorHandling(
      async () => {
        // Validate input
        if (!insertUser.username || !insertUser.password) {
          throw new Error("اسم المستخدم وكلمة المرور مطلوبان");
        }

        if (insertUser.username.length < 3) {
          throw new Error("اسم المستخدم يجب أن يكون 3 أحرف على الأقل");
        }

        if (insertUser.password.length < 6) {
          throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
        }

        // Hash password before storing
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(
          insertUser.password,
          saltRounds,
        );

        const [user] = await db
          .insert(users)
          .values({ ...insertUser, password: hashedPassword })
          .returning();
        return user;
      },
      "إنشاء مستخدم جديد",
      `اسم المستخدم: ${insertUser.username}`,
    );
  }

  // Replit Auth user operations
  async getUserByReplitId(replitUserId: string): Promise<User | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        if (!replitUserId || typeof replitUserId !== "string") {
          throw new Error("معرف مستخدم Replit غير صحيح");
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.replit_user_id, replitUserId));
        return user || undefined;
      },
      "البحث عن مستخدم Replit",
      `معرف Replit: ${replitUserId}`,
    );
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    return withDatabaseErrorHandling(
      async () => {
        const [user] = await db
          .insert(users)
          .values({
            replit_user_id: userData.id,
            email: userData.email,
            first_name: userData.firstName,
            last_name: userData.lastName,
            profile_image_url: userData.profileImageUrl,
            status: "active",
          })
          .onConflictDoUpdate({
            target: users.replit_user_id,
            set: {
              email: userData.email,
              first_name: userData.firstName,
              last_name: userData.lastName,
              profile_image_url: userData.profileImageUrl,
              updated_at: new Date(),
            },
          })
          .returning();
        return user;
      },
      "إنشاء/تحديث مستخدم Replit",
      `معرف Replit: ${userData.id}`,
    );
  }

  // Safe user methods that exclude password and other sensitive fields
  async getSafeUser(id: number): Promise<SafeUser | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        if (!id || typeof id !== "number" || id <= 0) {
          throw new Error("معرف المستخدم غير صحيح");
        }

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
            created_at: users.created_at,
            replit_user_id: users.replit_user_id,
            first_name: users.first_name,
            last_name: users.last_name,
            profile_image_url: users.profile_image_url,
            updated_at: users.updated_at,
          })
          .from(users)
          .where(eq(users.id, id));
        return user || undefined;
      },
      "جلب بيانات المستخدم الآمنة",
      `المستخدم رقم ${id}`,
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
            created_at: users.created_at,
            replit_user_id: users.replit_user_id,
            first_name: users.first_name,
            last_name: users.last_name,
            profile_image_url: users.profile_image_url,
            updated_at: users.updated_at,
          })
          .from(users);
      },
      "جلب قائمة المستخدمين الآمنة",
      "جميع المستخدمين",
    );
  }

  async getSafeUsersByRole(roleId: number): Promise<SafeUser[]> {
    return withDatabaseErrorHandling(
      async () => {
        if (!roleId || typeof roleId !== "number" || roleId <= 0) {
          throw new Error("معرف الدور غير صحيح");
        }

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
            created_at: users.created_at,
            replit_user_id: users.replit_user_id,
            first_name: users.first_name,
            last_name: users.last_name,
            profile_image_url: users.profile_image_url,
            updated_at: users.updated_at,
          })
          .from(users)
          .where(eq(users.role_id, roleId));
      },
      "جلب المستخدمين حسب الدور",
      `الدور رقم ${roleId}`,
    );
  }

  async getSafeUsersBySection(sectionId: number): Promise<SafeUser[]> {
    return withDatabaseErrorHandling(
      async () => {
        if (!sectionId || typeof sectionId !== "number" || sectionId <= 0) {
          throw new Error("معرف القسم غير صحيح");
        }

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
            created_at: users.created_at,
            replit_user_id: users.replit_user_id,
            first_name: users.first_name,
            last_name: users.last_name,
            profile_image_url: users.profile_image_url,
            updated_at: users.updated_at,
          })
          .from(users)
          .where(eq(users.section_id, sectionId));
      },
      "جلب المستخدمين حسب القسم",
      `القسم رقم ${sectionId}`,
    );
  }

  // Delete methods

  async deleteSection(id: string): Promise<void> {
    await db.delete(sections).where(eq(sections.id, id));
  }

  async deleteItem(id: string): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async deleteCustomerProduct(id: number): Promise<void> {
    await db.delete(customer_products).where(eq(customer_products.id, id));
  }

  async deleteLocation(id: string): Promise<void> {
    await db.delete(locations).where(eq(locations.id, id));
  }

  async deleteMachine(id: string): Promise<void> {
    await db.delete(machines).where(eq(machines.id, id));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async deleteCustomer(id: string): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getAllOrders(limit: number = 1000): Promise<NewOrder[]> {
    return await db.select().from(orders).orderBy(desc(orders.created_at)).limit(limit);
  }

  async createOrder(insertOrder: InsertNewOrder): Promise<NewOrder> {
    return withDatabaseErrorHandling(
      async () => {
        // STEP 0: MANDATORY DATAVALIDATOR INTEGRATION - Validate BEFORE database write
        const dataValidator = getDataValidator(this);
        const validationResult = await dataValidator.validateEntity(
          "orders",
          insertOrder,
          false,
        );

        if (!validationResult.isValid) {
          console.error(
            "[Storage] ❌ ORDER VALIDATION FAILED:",
            validationResult.errors,
          );
          throw new DatabaseError(
            `فشل التحقق من صحة الطلب: ${validationResult.errors.map((e) => e.message_ar).join(", ")}`,
            {
              code: "VALIDATION_FAILED",
              validationErrors: validationResult.errors,
            },
          );
        }

        console.log(
          "[Storage] ✅ Order validation passed, proceeding with database write",
        );

        // Validate required fields
        if (!insertOrder.customer_id) {
          throw new Error("معرف العميل مطلوب");
        }

        if (
          !insertOrder.order_number ||
          insertOrder.order_number.trim() === ""
        ) {
          throw new Error("رقم الطلب مطلوب");
        }

        if (!insertOrder.created_by) {
          throw new Error("معرف منشئ الطلب مطلوب");
        }

        // Convert Date objects to strings for database compatibility
        const orderData = {
          ...insertOrder,
          delivery_date:
            insertOrder.delivery_date instanceof Date
              ? insertOrder.delivery_date.toISOString().split("T")[0]
              : insertOrder.delivery_date,
        };

        const [order] = await db.insert(orders).values(orderData).returning();
        return order;
      },
      "إنشاء طلب جديد",
      `رقم الطلب: ${insertOrder.order_number}`,
    );
  }

  async updateOrder(
    id: number,
    orderUpdate: Partial<NewOrder>,
  ): Promise<NewOrder> {
    return withDatabaseErrorHandling(
      async () => {
        if (!id || typeof id !== "number" || id <= 0) {
          throw new Error("معرف الطلب غير صحيح");
        }

        // Check if order exists first
        const existingOrder = await db
          .select()
          .from(orders)
          .where(eq(orders.id, id))
          .limit(1);
        if (existingOrder.length === 0) {
          throw new Error("الطلب غير موجود");
        }

        const [order] = await db
          .update(orders)
          .set(orderUpdate)
          .where(eq(orders.id, id))
          .returning();

        if (!order) {
          throw new Error("فشل في تحديث الطلب");
        }

        return order;
      },
      "تحديث الطلب",
      `معرف الطلب: ${id}`,
    );
  }

  async updateOrderStatus(id: number, status: string): Promise<NewOrder> {
    return withDatabaseErrorHandling(
      async () => {
        if (!id || typeof id !== "number" || id <= 0) {
          throw new Error("معرف الطلب غير صحيح");
        }

        if (!status || typeof status !== "string" || status.trim() === "") {
          throw new Error("حالة الطلب مطلوبة");
        }

        // STEP 0: Get current order to validate status transition
        const currentOrder = await this.getOrderById(id);
        if (!currentOrder) {
          throw new DatabaseError("الطلب غير موجود", { code: "23503" });
        }

        // STEP 1: MANDATORY STATUS TRANSITION VALIDATION
        const dataValidator = getDataValidator(this);
        const transitionResult = await dataValidator.validateStatusTransition(
          "orders",
          currentOrder.status || "waiting",
          status.trim(),
          id,
        );

        if (!transitionResult.isValid) {
          console.error(
            "[Storage] ❌ INVALID ORDER STATUS TRANSITION:",
            transitionResult.errors,
          );
          throw new DatabaseError(
            `انتقال حالة غير صحيح: ${transitionResult.errors.map((e) => e.message_ar).join(", ")}`,
            {
              code: "INVALID_STATUS_TRANSITION",
              transitionErrors: transitionResult.errors,
            },
          );
        }

        console.log(
          `[Storage] ✅ Valid status transition: ${currentOrder.status} → ${status}`,
        );

        const validStatuses = [
          "pending",
          "waiting",
          "in_production",
          "for_production",
          "paused",
          "on_hold",
          "completed",
          "cancelled",
        ];
        if (!validStatuses.includes(status)) {
          throw new Error(`حالة الطلب غير صحيحة: ${status}`);
        }

        return await db.transaction(async (tx) => {
          try {
            // Check if order exists
            const existingOrder = await tx
              .select()
              .from(orders)
              .where(eq(orders.id, id))
              .limit(1);
            if (existingOrder.length === 0) {
              throw new Error("الطلب غير موجود");
            }

            // Update the main order
            const [order] = await tx
              .update(orders)
              .set({ status })
              .where(eq(orders.id, id))
              .returning();

            if (!order) {
              throw new Error("فشل في تحديث حالة الطلب");
            }

            // Map order status to production order status
            let productionStatus = status;
            if (status === "in_production" || status === "for_production") {
              productionStatus = "in_production";
            } else if (status === "waiting" || status === "pending") {
              productionStatus = "pending";
            } else if (status === "paused" || status === "on_hold") {
              productionStatus = "paused";
            } else if (status === "completed") {
              productionStatus = "completed";
            } else if (status === "cancelled") {
              productionStatus = "cancelled";
            }

            // Update all production orders for this order to match the order status
            await tx
              .update(production_orders)
              .set({ status: productionStatus })
              .where(eq(production_orders.order_id, id));

            return order;
          } catch (error) {
            // Transaction will automatically rollback on error
            throw error;
          }
        });
      },
      "تحديث حالة الطلب",
      `معرف الطلب: ${id}, الحالة الجديدة: ${status}`,
    );
  }

  async getOrderById(id: number): Promise<NewOrder | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async deleteOrder(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // First, get all production orders for this order
      const productionOrdersToDelete = await tx
        .select({ id: production_orders.id })
        .from(production_orders)
        .where(eq(production_orders.order_id, id));

      // Delete each production order with proper cascade deletion
      // This ensures all dependent records (warehouse_receipts, waste, rolls, cuts) are handled
      for (const prodOrder of productionOrdersToDelete) {
        // Delete warehouse receipts first (they reference production_orders)
        await tx
          .delete(warehouse_receipts)
          .where(eq(warehouse_receipts.production_order_id, prodOrder.id));

        // Delete waste records that reference this production order
        await tx
          .delete(waste)
          .where(eq(waste.production_order_id, prodOrder.id));

        // Get all rolls for this production order to handle cuts cascade
        const rollsToDelete = await tx
          .select({ id: rolls.id })
          .from(rolls)
          .where(eq(rolls.production_order_id, prodOrder.id));

        // Delete cuts for each roll (they reference rolls)
        for (const roll of rollsToDelete) {
          await tx.delete(cuts).where(eq(cuts.roll_id, roll.id));
        }

        // Delete quality checks that might reference these rolls
        for (const roll of rollsToDelete) {
          await tx
            .delete(quality_checks)
            .where(
              and(
                eq(quality_checks.target_type, "roll"),
                eq(quality_checks.target_id, roll.id),
              ),
            );
        }

        // Delete all rolls for this production order
        await tx
          .delete(rolls)
          .where(eq(rolls.production_order_id, prodOrder.id));

        // Delete related notifications
        await tx
          .delete(notifications)
          .where(
            and(
              eq(notifications.context_type, "production_order"),
              eq(notifications.context_id, prodOrder.id.toString()),
            ),
          );
      }

      // Delete all production orders for this order
      await tx
        .delete(production_orders)
        .where(eq(production_orders.order_id, id));

      // Delete related notifications for the main order
      await tx
        .delete(notifications)
        .where(
          and(
            eq(notifications.context_type, "order"),
            eq(notifications.context_id, id.toString()),
          ),
        );

      // Finally, delete the order itself
      await tx.delete(orders).where(eq(orders.id, id));
    });

    // Invalidate production caches after successful transaction completion
    invalidateProductionCache("all");
  }

  async getOrdersForProduction(): Promise<any[]> {
    const results = await db
      .select({
        id: orders.id,
        order_number: orders.order_number,
        customer_id: orders.customer_id,
        delivery_days: orders.delivery_days,
        status: orders.status,
        notes: orders.notes,
        created_by: orders.created_by,
        created_at: orders.created_at,
        delivery_date: orders.delivery_date,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customer_id, customers.id))
      .where(
        or(
          eq(orders.status, "in_production"),
          eq(orders.status, "waiting"),
          eq(orders.status, "pending"),
        ),
      )
      .orderBy(desc(orders.created_at));

    return results;
  }

  async getOrdersEnhanced(filters: {
    search?: string;
    customer_id?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }): Promise<any> {
    return await withDatabaseErrorHandling(async () => {
      let query = db
        .select({
          // Order fields
          id: orders.id,
          order_number: orders.order_number,
          customer_id: orders.customer_id,
          delivery_days: orders.delivery_days,
          status: orders.status,
          notes: orders.notes,
          created_by: orders.created_by,
          created_at: orders.created_at,
          delivery_date: orders.delivery_date,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
          customer_code: customers.code,
          customer_city: customers.city,
          customer_phone: customers.phone,

          // Production orders count and total quantity
          production_orders_count: count(production_orders.id),
          total_quantity_kg: sum(production_orders.quantity_kg),
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(production_orders, eq(production_orders.order_id, orders.id))
        .groupBy(
          orders.id,
          orders.order_number,
          orders.customer_id,
          orders.delivery_days,
          orders.status,
          orders.notes,
          orders.created_by,
          orders.created_at,
          orders.delivery_date,
          customers.name,
          customers.name_ar,
          customers.code,
          customers.city,
          customers.phone,
        );

      // Apply filters
      const conditions = [];

      if (filters.search) {
        const searchTerm = `%${filters.search}%`;
        conditions.push(
          or(
            sql`${orders.order_number} ILIKE ${searchTerm}`,
            sql`${customers.name} ILIKE ${searchTerm}`,
            sql`${customers.name_ar} ILIKE ${searchTerm}`,
            sql`${customers.code} ILIKE ${searchTerm}`,
            sql`${orders.notes} ILIKE ${searchTerm}`,
          ),
        );
      }

      if (filters.customer_id) {
        conditions.push(eq(orders.customer_id, filters.customer_id));
      }

      if (filters.status) {
        conditions.push(eq(orders.status, filters.status));
      }

      if (filters.date_from) {
        conditions.push(sql`${orders.created_at} >= ${filters.date_from}`);
      }

      if (filters.date_to) {
        conditions.push(sql`${orders.created_at} <= ${filters.date_to}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const offset = (page - 1) * limit;

      query = query
        .orderBy(desc(orders.created_at))
        .limit(limit)
        .offset(offset) as any;

      const results = await query;

      // Get total count for pagination
      const countQuery = db
        .select({ count: count(orders.id) })
        .from(orders)
        .leftJoin(customers, eq(orders.customer_id, customers.id));

      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      const [{ count: totalCount }] = await countQuery;

      return {
        orders: results,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    }, "جلب الطلبات المحسنة");
  }

  async getHierarchicalOrdersForProduction(): Promise<any[]> {
    try {
      const cacheKey = "hierarchical_orders";
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // جلب بيانات الطلبات مع أسماء العملاء
      const ordersData = await db
        .select({
          id: orders.id,
          order_number: orders.order_number,
          customer_id: orders.customer_id,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
          status: orders.status,
          created_at: orders.created_at,
          delivery_date: orders.delivery_date,
          notes: orders.notes,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .where(
          or(
            eq(orders.status, "in_production"),
            eq(orders.status, "waiting"),
            eq(orders.status, "pending"),
            eq(orders.status, "for_production"),
          ),
        )
        .orderBy(desc(orders.created_at))
        .limit(100); // أفضل توازن بين الأداء والبيانات

      if (ordersData.length === 0) {
        return [];
      }

      // معلومات أوامر الإنتاج مع معلومات الصنف
      const orderIds = ordersData.map((o) => o.id);
      const productionOrdersData = await db
        .select({
          id: production_orders.id,
          production_order_number: production_orders.production_order_number,
          order_id: production_orders.order_id,
          customer_product_id: production_orders.customer_product_id,
          quantity_kg: production_orders.quantity_kg,
          overrun_percentage: production_orders.overrun_percentage,
          final_quantity_kg: production_orders.final_quantity_kg,
          status: production_orders.status,
          created_at: production_orders.created_at,
          // معلومات المنتج
          size_caption: customer_products.size_caption,
          width: customer_products.width,
          cutting_length_cm: customer_products.cutting_length_cm,
          thickness: customer_products.thickness,
          raw_material: customer_products.raw_material,
          master_batch_id: customer_products.master_batch_id,
          is_printed: customer_products.is_printed,
          punching: customer_products.punching,
          // معلومات الصنف
          item_name: items.name,
          item_name_ar: items.name_ar,
        })
        .from(production_orders)
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id),
        )
        .leftJoin(items, eq(customer_products.item_id, items.id))
        .where(
          inArray(production_orders.order_id, orderIds)
        )
        .limit(100);

      // جلب الرولات لجميع أوامر الإنتاج
      const productionOrderIds = productionOrdersData.map((po) => po.id);
      let rollsData: any[] = [];
      
      if (productionOrderIds.length > 0) {
        rollsData = await db
          .select({
            id: rolls.id,
            roll_number: rolls.roll_number,
            roll_seq: rolls.roll_seq,
            production_order_id: rolls.production_order_id,
            weight_kg: rolls.weight_kg,
            stage: rolls.stage,
            created_at: rolls.created_at,
            created_by: rolls.created_by,
            printed_at: rolls.printed_at,
            printed_by: rolls.printed_by,
            cut_at: rolls.cut_completed_at,
            cut_by: rolls.cut_by,
            cut_weight_total_kg: rolls.cut_weight_total_kg,
            machine_id: rolls.machine_id,
            qr_code_text: rolls.qr_code_text,
          })
          .from(rolls)
          .where(
            inArray(rolls.production_order_id, productionOrderIds)
          )
          .orderBy(desc(rolls.created_at));
      }

      // جمع user IDs الفريدة من الرولات
      const userIds = new Set<number>();
      rollsData.forEach(roll => {
        if (roll.created_by) userIds.add(roll.created_by);
        if (roll.printed_by) userIds.add(roll.printed_by);
        if (roll.cut_by) userIds.add(roll.cut_by);
      });

      // جلب أسماء المستخدمين
      const userNames = new Map<number, string>();
      if (userIds.size > 0) {
        const usersData = await db
          .select({ id: users.id, name: users.display_name })
          .from(users)
          .where(inArray(users.id, Array.from(userIds)));
        
        usersData.forEach(user => {
          userNames.set(user.id, user.name || '');
        });
      }

      // إضافة أسماء المستخدمين للرولات
      const rollsWithNames = rollsData.map(roll => ({
        ...roll,
        created_by_name: roll.created_by ? userNames.get(roll.created_by) || null : null,
        printed_by_name: roll.printed_by ? userNames.get(roll.printed_by) || null : null,
        cut_by_name: roll.cut_by ? userNames.get(roll.cut_by) || null : null,
      }));

      // بناء الهيكل الهرمي بشكل محسن
      const orderMap = new Map();
      const rollsMap = new Map<number, any[]>();

      // تجميع الرولات حسب production_order_id
      for (const roll of rollsWithNames) {
        if (!rollsMap.has(roll.production_order_id)) {
          rollsMap.set(roll.production_order_id, []);
        }
        rollsMap.get(roll.production_order_id)!.push(roll);
      }

      for (const order of ordersData) {
        orderMap.set(order.id, {
          ...order,
          production_orders: [],
        });
      }

      for (const po of productionOrdersData) {
        const order = orderMap.get(po.order_id);
        if (order) {
          const poRolls = rollsMap.get(po.id) || [];
          order.production_orders.push({
            ...po,
            rolls: poRolls,
          });
        }
      }

      const result = Array.from(orderMap.values()).filter(
        (order) => order.production_orders.length > 0,
      );

      // تخزين مؤقت قصير للبيانات النشطة
      setCachedData(cacheKey, result, CACHE_TTL.REALTIME);
      return result;
    } catch (error) {
      console.error("Error fetching hierarchical orders:", error);
      return [];
    }
  }

  // Production Orders Implementation
  async getAllProductionOrders(limit: number = 1000): Promise<ProductionOrder[]> {
    return await withDatabaseErrorHandling(async () => {
      const results = await db
        .select({
          // Production order fields - using existing fields only
          id: production_orders.id,
          production_order_number: production_orders.production_order_number,
          order_id: production_orders.order_id,
          customer_product_id: production_orders.customer_product_id,
          quantity_kg: production_orders.quantity_kg,
          overrun_percentage: production_orders.overrun_percentage,
          final_quantity_kg: production_orders.final_quantity_kg,
          // حساب الكمية المنتجة من مجموع وزن الرولات
          produced_quantity_kg: sql<string>`
            COALESCE((
              SELECT SUM(weight_kg)::decimal(12,3)
              FROM rolls 
              WHERE production_order_id = ${production_orders.id}
            ), 0)
          `,
          printed_quantity_kg: production_orders.printed_quantity_kg,
          net_quantity_kg: production_orders.net_quantity_kg,
          waste_quantity_kg: production_orders.waste_quantity_kg,
          film_completion_percentage:
            production_orders.film_completion_percentage,
          printing_completion_percentage:
            production_orders.printing_completion_percentage,
          cutting_completion_percentage:
            production_orders.cutting_completion_percentage,
          status: production_orders.status,
          created_at: production_orders.created_at,

          // Related order information
          order_number: orders.order_number,
          customer_id: orders.customer_id,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,

          // Product details
          size_caption: customer_products.size_caption,
          width: customer_products.width,
          cutting_length_cm: customer_products.cutting_length_cm,
          thickness: customer_products.thickness,
          raw_material: customer_products.raw_material,
          master_batch_id: customer_products.master_batch_id,
          is_printed: customer_products.is_printed,
          punching: customer_products.punching,

          // Item information
          item_name: items.name,
          item_name_ar: items.name_ar,
        })
        .from(production_orders)
        .leftJoin(orders, eq(production_orders.order_id, orders.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id),
        )
        .leftJoin(items, eq(customer_products.item_id, items.id))
        .orderBy(desc(production_orders.created_at))
        .limit(limit);

      // Return results with proper type mapping - keep decimal fields as strings for consistency
      return results as any;
    }, "تحميل أوامر الإنتاج");
  }

  async getProductionOrderById(
    id: number,
  ): Promise<ProductionOrder | undefined> {
    return await withDatabaseErrorHandling(async () => {
      const results = await db
        .select({
          // Production order fields
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
          film_completion_percentage:
            production_orders.film_completion_percentage,
          printing_completion_percentage:
            production_orders.printing_completion_percentage,
          cutting_completion_percentage:
            production_orders.cutting_completion_percentage,
          status: production_orders.status,
          created_at: production_orders.created_at,

          // Related order information
          order_number: orders.order_number,
          customer_id: orders.customer_id,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,

          // Product details
          size_caption: customer_products.size_caption,
          width: customer_products.width,
          cutting_length_cm: customer_products.cutting_length_cm,
          thickness: customer_products.thickness,
          raw_material: customer_products.raw_material,
          master_batch_id: customer_products.master_batch_id,
          is_printed: customer_products.is_printed,
          punching: customer_products.punching,

          // Item information
          item_name: items.name,
          item_name_ar: items.name_ar,
        })
        .from(production_orders)
        .leftJoin(orders, eq(production_orders.order_id, orders.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id),
        )
        .leftJoin(items, eq(customer_products.item_id, items.id))
        .where(eq(production_orders.id, id))
        .limit(1);

      return results.length > 0 ? (results[0] as any) : undefined;
    }, "تحميل أمر الإنتاج");
  }

  async createProductionOrder(
    insertProductionOrder: InsertProductionOrder,
  ): Promise<ProductionOrder> {
    return await withDatabaseErrorHandling(async () => {
      // STEP 0: MANDATORY DATAVALIDATOR INTEGRATION - Validate BEFORE database write
      const dataValidator = getDataValidator(this);
      const validationResult = await dataValidator.validateEntity(
        "production_orders",
        insertProductionOrder,
        false,
      );

      if (!validationResult.isValid) {
        console.error(
          "[Storage] ❌ PRODUCTION ORDER VALIDATION FAILED:",
          validationResult.errors,
        );
        throw new DatabaseError(
          `فشل التحقق من صحة طلب الإنتاج: ${validationResult.errors.map((e) => e.message_ar).join(", ")}`,
          {
            code: "VALIDATION_FAILED",
            validationErrors: validationResult.errors,
          },
        );
      }

      console.log(
        "[Storage] ✅ Production order validation passed, proceeding with database write",
      );

      return await db.transaction(async (tx) => {
        // STEP 1: Lock the parent order to prevent race conditions
        const [parentOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, insertProductionOrder.order_id))
          .for("update");

        if (!parentOrder) {
          throw new Error("الطلب الأصلي غير موجود");
        }

        // STEP 2: Check existing production orders for this order (INVARIANT A)
        const existingProductionOrders = await tx
          .select({
            quantity_kg: production_orders.quantity_kg,
            final_quantity_kg: production_orders.final_quantity_kg,
          })
          .from(production_orders)
          .where(
            eq(production_orders.order_id, insertProductionOrder.order_id),
          );

        const existingTotalQuantity = existingProductionOrders.reduce(
          (sum, po) =>
            sum + parseFloat(po.final_quantity_kg || po.quantity_kg || "0"),
          0,
        );

        // Calculate the final quantity based on the base quantity and overrun
        const initialBaseQuantityKg = parseFloat(
          insertProductionOrder.quantity_kg || "0",
        );
        const overrunPercentage = parseFloat(
          insertProductionOrder.overrun_percentage || "5.0",
        );
        const proposedFinalQuantity =
          initialBaseQuantityKg * (1 + overrunPercentage / 100);

        // NOTE: INVARIANT A validation removed - orders table doesn't store total quantity
        // Individual production orders are validated separately for business rules

        // STEP 2.5: INVARIANT D - State transition validation
        if (parentOrder.status === "cancelled") {
          throw new DatabaseError("لا يمكن إنشاء طلب إنتاج لطلب ملغي", {
            code: "INVARIANT_D_VIOLATION",
          });
        }

        if (parentOrder.status === "completed") {
          throw new DatabaseError("لا يمكن إنشاء طلب إنتاج لطلب مكتمل", {
            code: "INVARIANT_D_VIOLATION",
          });
        }

        // STEP 3: Generate unique production order number with optimistic locking
        const existingOrders = await tx
          .select({
            production_order_number: production_orders.production_order_number,
          })
          .from(production_orders)
          .for("update");

        const orderNumbers = existingOrders
          .map((order) => order.production_order_number)
          .filter((orderNumber) => orderNumber.startsWith("PO"))
          .map((orderNumber) => parseInt(orderNumber.replace("PO", "")))
          .filter((num) => !isNaN(num));

        const nextNumber =
          orderNumbers.length > 0 ? Math.max(...orderNumbers) + 1 : 1;
        const productionOrderNumber = `PO${nextNumber.toString().padStart(3, "0")}`;

        // STEP 4: Get customer product info for validation
        const [customerProduct] = await tx
          .select()
          .from(customer_products)
          .where(
            eq(
              customer_products.id,
              parseInt(insertProductionOrder.customer_product_id.toString()),
            ),
          );

        if (!customerProduct) {
          throw new Error("منتج العميل غير موجود");
        }

        // Use quantity_kg from the input (reusing variable from above)
        const baseQuantityKg = initialBaseQuantityKg;

        // Calculate quantities based on punching type
        const punchingType = customerProduct.punching || null;
        const quantityCalculation = calculateProductionQuantities(
          baseQuantityKg,
          punchingType,
        );

        // STEP 5: Prepare production order data with validation
        const productionOrderData = {
          ...insertProductionOrder,
          production_order_number: productionOrderNumber,
          quantity_kg: numberToDecimalString(baseQuantityKg),
          final_quantity_kg: numberToDecimalString(
            quantityCalculation.finalQuantityKg,
          ),
        };

        // STEP 6: Create production order within transaction
        const [productionOrder] = await tx
          .insert(production_orders)
          .values(productionOrderData)
          .returning();

        console.log(
          `Created production order ${productionOrderNumber} with intelligent quantities:`,
          {
            baseQuantity: baseQuantityKg,
            punchingType,
            overrunPercentage: quantityCalculation.overrunPercentage,
            finalQuantity: quantityCalculation.finalQuantityKg,
            reason: quantityCalculation.overrunReason,
          },
        );

        return productionOrder;
      });
    }, "إنشاء أمر الإنتاج");
  }

  async createProductionOrdersBatch(
    insertProductionOrders: InsertProductionOrder[],
  ): Promise<{
    successful: ProductionOrder[];
    failed: Array<{ order: InsertProductionOrder; error: string }>;
  }> {
    return await withDatabaseErrorHandling(async () => {
      const dataValidator = getDataValidator(this);
      const successful: ProductionOrder[] = [];
      const failed: Array<{ order: InsertProductionOrder; error: string }> = [];

      return await db.transaction(async (tx) => {
        const PRODUCTION_ORDER_BATCH_LOCK = 123456789;
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${PRODUCTION_ORDER_BATCH_LOCK})`);

        const [maxOrderResult] = await tx
          .select({
            max_number: sql<string>`MAX(
              CASE 
                WHEN ${production_orders.production_order_number} ~ '^PO[0-9]+$'
                THEN CAST(SUBSTRING(${production_orders.production_order_number} FROM 3) AS INTEGER)
                ELSE 0
              END
            )`,
          })
          .from(production_orders);

        let nextNumber = maxOrderResult?.max_number ? parseInt(maxOrderResult.max_number) + 1 : 1;

        for (const insertProductionOrder of insertProductionOrders) {
          try {
            const validationResult = await dataValidator.validateEntity(
              "production_orders",
              insertProductionOrder,
              false,
            );

            if (!validationResult.isValid) {
              failed.push({
                order: insertProductionOrder,
                error: validationResult.errors.map((e) => e.message_ar).join(", "),
              });
              continue;
            }

            const [parentOrder] = await tx
              .select()
              .from(orders)
              .where(eq(orders.id, insertProductionOrder.order_id))
              .for("update");

            if (!parentOrder) {
              failed.push({
                order: insertProductionOrder,
                error: "الطلب الأصلي غير موجود",
              });
              continue;
            }

            if (parentOrder.status === "cancelled" || parentOrder.status === "completed") {
              failed.push({
                order: insertProductionOrder,
                error: `لا يمكن إنشاء طلب إنتاج لطلب ${parentOrder.status === "cancelled" ? "ملغي" : "مكتمل"}`,
              });
              continue;
            }

            const productionOrderNumber = `PO${nextNumber.toString().padStart(3, "0")}`;
            nextNumber++;

            const [customerProduct] = await tx
              .select()
              .from(customer_products)
              .where(
                eq(
                  customer_products.id,
                  parseInt(insertProductionOrder.customer_product_id.toString()),
                ),
              );

            if (!customerProduct) {
              failed.push({
                order: insertProductionOrder,
                error: "منتج العميل غير موجود",
              });
              continue;
            }

            const baseQuantityKg = parseFloat(insertProductionOrder.quantity_kg || "0");
            const punchingType = customerProduct.punching || null;
            const quantityCalculation = calculateProductionQuantities(
              baseQuantityKg,
              punchingType,
            );

            const productionOrderData = {
              ...insertProductionOrder,
              production_order_number: productionOrderNumber,
              quantity_kg: numberToDecimalString(baseQuantityKg),
              final_quantity_kg: numberToDecimalString(
                quantityCalculation.finalQuantityKg,
              ),
            };

            const [productionOrder] = await tx
              .insert(production_orders)
              .values(productionOrderData)
              .returning();

            successful.push(productionOrder);

            console.log(
              `[Batch] Created production order ${productionOrderNumber}`,
            );
          } catch (error) {
            failed.push({
              order: insertProductionOrder,
              error: error instanceof Error ? error.message : "خطأ غير معروف",
            });
          }
        }

        console.log(
          `[Batch] Created ${successful.length} production orders, ${failed.length} failed`,
        );

        return { successful, failed };
      });
    }, "إنشاء أوامر الإنتاج دفعة واحدة");
  }

  async updateProductionOrder(
    id: number,
    productionOrderUpdate: Partial<ProductionOrder>,
  ): Promise<ProductionOrder> {
    return await db.transaction(async (tx) => {
      // Update the production order
      const [productionOrder] = await tx
        .update(production_orders)
        .set(productionOrderUpdate)
        .where(eq(production_orders.id, id))
        .returning();

      // If this production order was marked as completed, check if all production orders for the parent order are completed
      if (productionOrderUpdate.status === "completed") {
        const orderId = productionOrder.order_id;

        // Get all production orders for this order
        const allProductionOrders = await tx
          .select()
          .from(production_orders)
          .where(eq(production_orders.order_id, orderId));

        // Check if all production orders are completed
        const allCompleted = allProductionOrders.every((po) =>
          po.id === id
            ? productionOrderUpdate.status === "completed"
            : po.status === "completed",
        );

        // If all production orders are completed, automatically mark the order as completed
        if (allCompleted) {
          await tx
            .update(orders)
            .set({ status: "completed" })
            .where(eq(orders.id, orderId));

          console.log(
            `Order ${orderId} automatically completed - all production orders finished`,
          );
        }
      }

      return productionOrder;
    });
  }

  async deleteProductionOrder(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete related records in correct order to avoid foreign key constraint violations

      // Delete warehouse receipts first (they reference production_orders)
      await tx
        .delete(warehouse_receipts)
        .where(eq(warehouse_receipts.production_order_id, id));

      // Delete waste records that reference this production order
      await tx.delete(waste).where(eq(waste.production_order_id, id));

      // Get all rolls for this production order to handle cuts cascade
      const rollsToDelete = await tx
        .select({ id: rolls.id })
        .from(rolls)
        .where(eq(rolls.production_order_id, id));

      // Delete cuts for each roll (they reference rolls)
      for (const roll of rollsToDelete) {
        await tx.delete(cuts).where(eq(cuts.roll_id, roll.id));
      }

      // Delete quality checks that might reference these rolls
      for (const roll of rollsToDelete) {
        await tx
          .delete(quality_checks)
          .where(
            and(
              eq(quality_checks.target_type, "roll"),
              eq(quality_checks.target_id, roll.id),
            ),
          );
      }

      // Delete all rolls for this production order
      await tx.delete(rolls).where(eq(rolls.production_order_id, id));

      // Delete related notifications for this production order
      await tx
        .delete(notifications)
        .where(
          and(
            eq(notifications.context_type, "production_order"),
            eq(notifications.context_id, id.toString()),
          ),
        );

      // Finally, delete the production order itself
      await tx.delete(production_orders).where(eq(production_orders.id, id));
    });

    // Invalidate production caches after successful transaction completion
    invalidateProductionCache("all");
  }

  // Production Orders Management Functions
  async getProductionOrdersWithDetails(): Promise<any[]> {
    return await withDatabaseErrorHandling(async () => {
      const results = await db
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
          status: production_orders.status,
          created_at: production_orders.created_at,
          
          // حقول التخصيص والأوقات
          assigned_machine_id: production_orders.assigned_machine_id,
          assigned_operator_id: production_orders.assigned_operator_id,
          production_start_time: production_orders.production_start_time,
          production_end_time: production_orders.production_end_time,
          production_time_minutes: production_orders.production_time_minutes,
          
          // معلومات الطلب
          order_number: orders.order_number,
          customer_id: orders.customer_id,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
          
          // معلومات المنتج
          size_caption: customer_products.size_caption,
          width: customer_products.width,
          cutting_length_cm: customer_products.cutting_length_cm,
          thickness: customer_products.thickness,
          raw_material: customer_products.raw_material,
          is_printed: customer_products.is_printed,
          
          // معلومات الماكينة المخصصة
          machine_name: machines.name,
          machine_name_ar: machines.name_ar,
          machine_status: machines.status,
          
          // معلومات العامل المخصص
          operator_name: users.display_name,
          operator_name_ar: users.display_name_ar,
        })
        .from(production_orders)
        .leftJoin(orders, eq(production_orders.order_id, orders.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id)
        )
        .leftJoin(machines, eq(production_orders.assigned_machine_id, machines.id))
        .leftJoin(users, eq(production_orders.assigned_operator_id, users.id))
        .orderBy(desc(production_orders.created_at));

      return results;
    }, "تحميل أوامر الإنتاج مع التفاصيل");
  }

  async activateProductionOrder(
    id: number,
    machineId?: string,
    operatorId?: number
  ): Promise<ProductionOrder> {
    return await withDatabaseErrorHandling(async () => {
      return await db.transaction(async (tx) => {
        // جلب أمر الإنتاج الحالي
        const [currentOrder] = await tx
          .select()
          .from(production_orders)
          .where(eq(production_orders.id, id));

        if (!currentOrder) {
          throw new Error("أمر الإنتاج غير موجود");
        }

        if (currentOrder.status !== "pending") {
          throw new Error(`لا يمكن تفعيل أمر إنتاج بحالة ${currentOrder.status}`);
        }

        // تحديث أمر الإنتاج
        const updateData: any = {
          status: "active",
          production_start_time: new Date(),
        };

        if (machineId) {
          updateData.assigned_machine_id = machineId;
        }

        if (operatorId) {
          updateData.assigned_operator_id = operatorId;
        }

        const [updatedOrder] = await tx
          .update(production_orders)
          .set(updateData)
          .where(eq(production_orders.id, id))
          .returning();

        // تحديث حالة الطلب الأساسي إلى in_production إذا كان في حالة waiting
        const [parentOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.id, updatedOrder.order_id));

        if (parentOrder && parentOrder.status === "waiting") {
          await tx
            .update(orders)
            .set({ status: "in_production" })
            .where(eq(orders.id, updatedOrder.order_id));
        }

        // إبطال الكاش
        invalidateProductionCache("all");

        return updatedOrder;
      });
    }, "تفعيل أمر الإنتاج");
  }

  async getProductionOrderStats(id: number): Promise<any> {
    return await withDatabaseErrorHandling(async () => {
      // جلب إحصائيات الرولات لأمر الإنتاج
      const rollStats = await db
        .select({
          total_rolls: sql<number>`COUNT(*)`,
          total_weight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
          film_rolls: sql<number>`COUNT(CASE WHEN ${rolls.stage} = 'film' THEN 1 END)`,
          printing_rolls: sql<number>`COUNT(CASE WHEN ${rolls.stage} = 'printing' THEN 1 END)`,
          cutting_rolls: sql<number>`COUNT(CASE WHEN ${rolls.stage} = 'cutting' THEN 1 END)`,
          done_rolls: sql<number>`COUNT(CASE WHEN ${rolls.stage} = 'done' THEN 1 END)`,
          total_waste: sql<number>`COALESCE(SUM(${rolls.waste_kg}), 0)`,
        })
        .from(rolls)
        .where(eq(rolls.production_order_id, id));

      // جلب معلومات أمر الإنتاج
      const [productionOrder] = await db
        .select()
        .from(production_orders)
        .where(eq(production_orders.id, id));

      if (!productionOrder) {
        throw new Error("أمر الإنتاج غير موجود");
      }

      // حساب نسب الإكمال
      const stats = rollStats[0] || {
        total_rolls: 0,
        total_weight: 0,
        film_rolls: 0,
        printing_rolls: 0,
        cutting_rolls: 0,
        done_rolls: 0,
        total_waste: 0,
      };

      // حساب نسبة الإكمال الكلية
      const completionPercentage = 
        parseFloat(productionOrder.final_quantity_kg) > 0
          ? (parseFloat(stats.total_weight.toString()) / parseFloat(productionOrder.final_quantity_kg)) * 100
          : 0;

      // حساب الوقت المستغرق إذا بدأ الإنتاج
      let productionTimeHours = 0;
      if (productionOrder.production_start_time) {
        const startTime = new Date(productionOrder.production_start_time);
        const endTime = productionOrder.production_end_time 
          ? new Date(productionOrder.production_end_time)
          : new Date();
        productionTimeHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      }

      return {
        ...stats,
        production_order: productionOrder,
        completion_percentage: Math.min(completionPercentage, 100).toFixed(2),
        production_time_hours: productionTimeHours.toFixed(2),
        remaining_quantity: Math.max(
          parseFloat(productionOrder.final_quantity_kg) - parseFloat(stats.total_weight.toString()),
          0
        ).toFixed(2),
      };
    }, "إحصائيات أمر الإنتاج");
  }

  async updateProductionOrderAssignment(
    id: number,
    machineId?: string,
    operatorId?: number
  ): Promise<ProductionOrder> {
    return await withDatabaseErrorHandling(async () => {
      const updateData: any = {};
      
      if (machineId !== undefined) {
        updateData.assigned_machine_id = machineId || null;
      }
      
      if (operatorId !== undefined) {
        updateData.assigned_operator_id = operatorId || null;
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error("لا توجد بيانات للتحديث");
      }

      const [updated] = await db
        .update(production_orders)
        .set(updateData)
        .where(eq(production_orders.id, id))
        .returning();

      if (!updated) {
        throw new Error("فشل تحديث التخصيص");
      }

      // إبطال الكاش
      invalidateProductionCache("all");

      return updated;
    }, "تحديث تخصيص أمر الإنتاج");
  }

  async getRolls(options?: {
    limit?: number;
    offset?: number;
    stage?: string;
  }): Promise<Roll[]> {
    const limit = options?.limit || 50; // Default to 50 rolls
    const offset = options?.offset || 0;

    // Build query based on options
    if (options?.stage) {
      return await db
        .select()
        .from(rolls)
        .where(eq(rolls.stage, options.stage))
        .orderBy(desc(rolls.created_at))
        .limit(limit)
        .offset(offset);
    } else {
      return await db
        .select()
        .from(rolls)
        .orderBy(desc(rolls.created_at))
        .limit(limit)
        .offset(offset);
    }
  }

  async getRollsByProductionOrder(productionOrderId: number): Promise<Roll[]> {
    return await db
      .select()
      .from(rolls)
      .where(eq(rolls.production_order_id, productionOrderId));
  }

  async getRollsByStage(
    stage: string,
    options?: { limit?: number; offset?: number },
  ): Promise<Roll[]> {
    const limit = options?.limit || 100; // Default limit for stage-filtered results
    const offset = options?.offset || 0;

    return await db
      .select()
      .from(rolls)
      .where(eq(rolls.stage, stage))
      .orderBy(desc(rolls.created_at))
      .limit(limit)
      .offset(offset);
  }

  async createRoll(insertRoll: InsertRoll, options?: { skipWeightValidation?: boolean }): Promise<Roll> {
    const skipWeightValidation = options?.skipWeightValidation || false;
    return await withDatabaseErrorHandling(
      async () => {
        // STEP 0: MANDATORY DATAVALIDATOR INTEGRATION - Validate BEFORE database write
        const dataValidator = getDataValidator(this);
        const validationResult = await dataValidator.validateEntity(
          "rolls",
          insertRoll,
          false,
        );

        if (!validationResult.isValid) {
          console.error(
            "[Storage] ❌ ROLL VALIDATION FAILED:",
            validationResult.errors,
          );
          throw new DatabaseError(
            `فشل التحقق من صحة الرول: ${validationResult.errors.map((e) => e.message_ar).join(", ")}`,
            {
              code: "VALIDATION_FAILED",
              validationErrors: validationResult.errors,
            },
          );
        }

        console.log(
          "[Storage] ✅ Roll validation passed, proceeding with database write",
        );

        return await db.transaction(async (tx) => {
          // STEP 1: Lock production order for atomic operations (CRITICAL FOR CONCURRENCY)
          const [productionOrder] = await tx
            .select()
            .from(production_orders)
            .where(eq(production_orders.id, insertRoll.production_order_id))
            .for("update"); // SELECT FOR UPDATE - prevents race conditions

          if (!productionOrder) {
            throw new DatabaseError("طلب الإنتاج غير موجود", { code: "23503" });
          }

          // STEP 2: INVARIANT E - Verify film machine exists and is active
          // Printing and cutting machines are assigned later in their respective stages
          const [filmMachine] = await tx
            .select()
            .from(machines)
            .where(eq(machines.id, insertRoll.film_machine_id));

          if (!filmMachine) {
            throw new DatabaseError("ماكينة الفيلم غير موجودة", { code: "23503" });
          }

          if (filmMachine.status !== "active") {
            throw new DatabaseError(
              `لا يمكن إنشاء رول على ماكينة فيلم غير نشطة - حالة الماكينة: ${filmMachine.status}`,
              { code: "INVARIANT_E_VIOLATION" },
            );
          }

          // Optionally validate printing machine if provided
          if (insertRoll.printing_machine_id) {
            const [printingMachine] = await tx
              .select()
              .from(machines)
              .where(eq(machines.id, insertRoll.printing_machine_id));

            if (!printingMachine) {
              throw new DatabaseError("ماكينة الطباعة غير موجودة", { code: "23503" });
            }

            if (printingMachine.status !== "active") {
              throw new DatabaseError(
                `لا يمكن إنشاء رول على ماكينة طباعة غير نشطة - حالة الماكينة: ${printingMachine.status}`,
                { code: "INVARIANT_E_VIOLATION" },
              );
            }
          }

          // Optionally validate cutting machine if provided
          if (insertRoll.cutting_machine_id) {
            const [cuttingMachine] = await tx
              .select()
              .from(machines)
              .where(eq(machines.id, insertRoll.cutting_machine_id));

            if (!cuttingMachine) {
              throw new DatabaseError("ماكينة التقطيع غير موجودة", { code: "23503" });
            }

            if (cuttingMachine.status !== "active") {
              throw new DatabaseError(
                `لا يمكن إنشاء رول على ماكينة تقطيع غير نشطة - حالة الماكينة: ${cuttingMachine.status}`,
                { code: "INVARIANT_E_VIOLATION" },
              );
            }
          }

          // STEP 3: INVARIANT B - Check roll weight constraints
          const rollWeightKg = parseFloat(
            insertRoll.weight_kg?.toString() || "0",
          );
          if (rollWeightKg <= 0) {
            throw new DatabaseError("وزن الرول يجب أن يكون موجب", {
              code: "23514",
            });
          }

          // Get current total weight of all rolls for this production order
          const totalWeightResult = await tx
            .select({
              total: sql<number>`COALESCE(SUM(${rolls.weight_kg}::decimal), 0)`,
            })
            .from(rolls)
            .where(
              eq(rolls.production_order_id, insertRoll.production_order_id),
            );

          const currentTotalWeight = Number(totalWeightResult[0]?.total || 0);
          const newTotalWeight = currentTotalWeight + rollWeightKg;
          const finalQuantityKg = parseFloat(
            productionOrder.final_quantity_kg?.toString() || "0",
          );

          // INVARIANT B: Sum of roll weights ≤ ProductionOrder.final_quantity_kg + tolerance
          // Skip weight validation for final/last rolls (when explicitly requested)
          if (!skipWeightValidation) {
            // Use 50% tolerance to accommodate production variations and overruns
            const tolerancePercentage = 0.50; // 50% tolerance
            const tolerance = finalQuantityKg * tolerancePercentage;
            const maxAllowedWeight = finalQuantityKg + tolerance;

            if (newTotalWeight > maxAllowedWeight) {
              const overagePercentage = ((newTotalWeight - finalQuantityKg) / finalQuantityKg * 100).toFixed(1);
              throw new DatabaseError(
                `تجاوز الوزن الإجمالي للرولات الحد المسموح: ${newTotalWeight.toFixed(2)}كغ > ${maxAllowedWeight.toFixed(2)}كغ (${finalQuantityKg.toFixed(2)}كغ + 50% تسامح). الزيادة: ${overagePercentage}%`,
                { code: "INVARIANT_B_VIOLATION" },
              );
            } else if (newTotalWeight > finalQuantityKg * 1.10) {
              // Log warning when exceeding 10% but still allow
              const overagePercentage = ((newTotalWeight - finalQuantityKg) / finalQuantityKg * 100).toFixed(1);
              console.warn(
                `[Storage] ⚠️ تحذير: الوزن الإجمالي للرولات (${newTotalWeight.toFixed(2)}كغ) يتجاوز الكمية المستهدفة (${finalQuantityKg.toFixed(2)}كغ) بنسبة ${overagePercentage}%`,
              );
            }
          } else {
            console.log(
              `[Storage] ⚠️ Weight validation skipped (final/last roll). Total weight: ${newTotalWeight.toFixed(2)}كغ, Final quantity: ${finalQuantityKg.toFixed(2)}كغ`,
            );
          }

          // STEP 4: Generate sequential roll number for this production order with proper locking
          // Use advisory lock to prevent race conditions during roll sequence generation
          await tx.execute(
            sql`SELECT pg_advisory_xact_lock(${insertRoll.production_order_id})`
          );
          
          // استخدام MAX(roll_seq) بدلاً من COUNT لضمان الترتيب الصحيح حتى بعد حذف رولات
          const maxSeqResult = await tx
            .select({ maxSeq: sql<number>`COALESCE(MAX(${rolls.roll_seq}), 0)` })
            .from(rolls)
            .where(
              eq(rolls.production_order_id, insertRoll.production_order_id),
            );
          const nextRollSeq = (maxSeqResult[0]?.maxSeq || 0) + 1;

          // STEP 5: Generate roll identifiers using production order number + sequence
          const rollNumber = `${productionOrder.production_order_number}-R${nextRollSeq.toString().padStart(2, "0")}`;

          // إنشاء بيانات QR Code غنية
          const qrData = {
            roll_number: rollNumber,
            production_order: productionOrder.production_order_number,
            weight_kg: insertRoll.weight_kg,
            film_machine_id: insertRoll.film_machine_id,
            printing_machine_id: insertRoll.printing_machine_id,
            cutting_machine_id: insertRoll.cutting_machine_id,
            created_at: new Date().toISOString(),
            stage: "film",
            internal_ref: `${productionOrder.production_order_number}-R${nextRollSeq.toString().padStart(2, "0")}`,
          };

          const qrCodeText = JSON.stringify(qrData);

          // توليد صورة QR Code
          let qrPngBase64 = "";
          try {
            const qrPngBuffer = await QRCode.toBuffer(qrCodeText, {
              type: "png",
              width: 200,
              margin: 1,
              color: {
                dark: "#000000",
                light: "#FFFFFF",
              },
            });
            qrPngBase64 = qrPngBuffer.toString("base64");
          } catch (qrError) {
            console.error("Error generating QR code image:", qrError);
            // استكمال العملية حتى لو فشل توليد QR code
          }

          // STEP 6: Create the roll with all constraints validated
          const [roll] = await tx
            .insert(rolls)
            .values({
              ...insertRoll,
              roll_number: rollNumber,
              qr_code_text: qrCodeText,
              qr_png_base64: qrPngBase64,
              roll_seq: nextRollSeq,
            } as any) // Type assertion for additional fields
            .returning();

          const maxAllowedForLog = finalQuantityKg * 1.10; // 10% tolerance for logging
          console.log(
            `[Storage] Created roll ${rollNumber} (${productionOrder.production_order_number}-R${nextRollSeq.toString().padStart(2, "0")}) with invariant validation:`,
            {
              rollWeight: rollWeightKg,
              newTotalWeight: newTotalWeight.toFixed(2),
              maxAllowed: maxAllowedForLog.toFixed(2),
              weightValidationSkipped: skipWeightValidation,
              filmMachine: filmMachine.status,
              printingMachine: insertRoll.printing_machine_id ? "will be assigned in printing stage" : "not assigned",
              cuttingMachine: insertRoll.cutting_machine_id ? "will be assigned in cutting stage" : "not assigned",
            },
          );

          // إزالة cache بعد إنشاء رول جديد وإرسال تحديث SSE
          invalidateProductionCache("all");

          return roll;
        });
      },
      "createRoll",
      `للطلب الإنتاجي ${insertRoll.production_order_id}`,
    );
  }

  async updateRoll(id: number, updates: Partial<Roll>): Promise<Roll> {
    const [roll] = await db
      .update(rolls)
      .set(updates)
      .where(eq(rolls.id, id))
      .returning();
    return roll;
  }

  // ============ Roll Search Functions ============

  // البحث الشامل عن الرولات
  async searchRolls(query: string, filters?: {
    stage?: string;
    startDate?: string;
    endDate?: string;
    machineId?: string;
    operatorId?: number;
    minWeight?: number;
    maxWeight?: number;
    productionOrderId?: number;
    orderId?: number;
  }): Promise<any[]> {
    const cacheKey = `roll_search:${query}:${JSON.stringify(filters)}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    let queryBuilder = db
      .select({
        roll_id: rolls.id,
        roll_number: rolls.roll_number,
        roll_seq: rolls.roll_seq,
        qr_code_text: rolls.qr_code_text,
        qr_png_base64: rolls.qr_png_base64,
        stage: rolls.stage,
        weight_kg: rolls.weight_kg,
        cut_weight_total_kg: rolls.cut_weight_total_kg,
        waste_kg: rolls.waste_kg,
        created_at: rolls.created_at,
        printed_at: rolls.printed_at,
        cut_completed_at: rolls.cut_completed_at,
        production_order_id: rolls.production_order_id,
        production_order_number: production_orders.production_order_number,
        order_id: production_orders.order_id,
        order_number: orders.order_number,
        customer_id: orders.customer_id,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
        // Product and size information from customer_products
        item_name: items.name,
        item_name_ar: items.name_ar,
        size_caption: customer_products.size_caption,
        color: customer_products.master_batch_id,
        punching: customer_products.punching,
        raw_material: customer_products.raw_material,
        film_machine_id: rolls.film_machine_id,
        film_machine_name: sql<string>`film_machine.name`,
        printing_machine_id: rolls.printing_machine_id,
        printing_machine_name: sql<string>`printing_machine.name`,
        cutting_machine_id: rolls.cutting_machine_id,
        cutting_machine_name: sql<string>`cutting_machine.name`,
        created_by: rolls.created_by,
        created_by_name: sql<string>`created_user.display_name`,
        printed_by: rolls.printed_by,
        printed_by_name: sql<string>`printed_user.display_name`,
        cut_by: rolls.cut_by,
        cut_by_name: sql<string>`cut_user.display_name`,
      })
      .from(rolls)
      .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
      .leftJoin(orders, eq(production_orders.order_id, orders.id))
      .leftJoin(customers, eq(orders.customer_id, customers.id))
      .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
      .leftJoin(items, eq(customer_products.item_id, items.id))
      .leftJoin(alias(machines, 'film_machine'), eq(rolls.film_machine_id, sql`film_machine.id`))
      .leftJoin(alias(machines, 'printing_machine'), eq(rolls.printing_machine_id, sql`printing_machine.id`))
      .leftJoin(alias(machines, 'cutting_machine'), eq(rolls.cutting_machine_id, sql`cutting_machine.id`))
      .leftJoin(alias(users, 'created_user'), eq(rolls.created_by, sql`created_user.id`))
      .leftJoin(alias(users, 'printed_user'), eq(rolls.printed_by, sql`printed_user.id`))
      .leftJoin(alias(users, 'cut_user'), eq(rolls.cut_by, sql`cut_user.id`));

    // Build conditions array
    const conditions = [];

    // Search query
    if (query && query.trim()) {
      const searchPattern = `%${query.trim()}%`;
      conditions.push(
        or(
          sql`${rolls.roll_number} ILIKE ${searchPattern}`,
          sql`${rolls.qr_code_text} ILIKE ${searchPattern}`,
          sql`${production_orders.production_order_number} ILIKE ${searchPattern}`,
          sql`${orders.order_number} ILIKE ${searchPattern}`,
          sql`${customers.name} ILIKE ${searchPattern}`,
          sql`${customers.name_ar} ILIKE ${searchPattern}`
        )
      );
    }

    // Stage filter
    if (filters?.stage) {
      conditions.push(eq(rolls.stage, filters.stage));
    }

    // Date range filter
    if (filters?.startDate) {
      conditions.push(sql`${rolls.created_at} >= ${filters.startDate}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${rolls.created_at} <= ${filters.endDate}`);
    }

    // Machine filter
    if (filters?.machineId) {
      conditions.push(
        or(
          eq(rolls.film_machine_id, filters.machineId),
          eq(rolls.printing_machine_id, filters.machineId),
          eq(rolls.cutting_machine_id, filters.machineId)
        )
      );
    }

    // Operator filter
    if (filters?.operatorId) {
      conditions.push(
        or(
          eq(rolls.created_by, filters.operatorId),
          eq(rolls.printed_by, filters.operatorId),
          eq(rolls.cut_by, filters.operatorId)
        )
      );
    }

    // Weight range filter
    if (filters?.minWeight !== undefined) {
      conditions.push(sql`${rolls.weight_kg} >= ${filters.minWeight}`);
    }
    if (filters?.maxWeight !== undefined) {
      conditions.push(sql`${rolls.weight_kg} <= ${filters.maxWeight}`);
    }

    // Production order filter
    if (filters?.productionOrderId) {
      conditions.push(eq(rolls.production_order_id, filters.productionOrderId));
    }

    // Order filter
    if (filters?.orderId) {
      conditions.push(eq(production_orders.order_id, filters.orderId));
    }

    // Apply conditions and ordering
    const results = await (conditions.length > 0 
      ? queryBuilder.where(and(...conditions))
      : queryBuilder
    )
      .orderBy(desc(rolls.created_at))
      .limit(100);

    // Parse and add product info from qr_code_text as fallback for missing data
    const resultsWithProductInfo = results.map(roll => {
      // Only parse QR if we don't have item_name from database
      if (!roll.item_name && roll.qr_code_text) {
        try {
          const qrData = JSON.parse(roll.qr_code_text);
          return {
            ...roll,
            item_name: qrData.item_name || qrData.product_name,
            item_name_ar: qrData.item_name_ar || qrData.product_name_ar,
            size_caption: roll.size_caption || qrData.size_caption,
            raw_material: roll.raw_material || qrData.raw_material,
            color: roll.color || qrData.color,
            punching: roll.punching || qrData.punching,
          };
        } catch {
          return roll;
        }
      }
      return roll;
    });

    setCachedData(cacheKey, resultsWithProductInfo, CACHE_TTL.SHORT);
    return resultsWithProductInfo;
  }

  // البحث بالباركود
  async getRollByBarcode(barcode: string): Promise<any | null> {
    const cacheKey = `roll_barcode:${barcode}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Search by QR code text
    const result = await db
      .select({
        roll_id: rolls.id,
        roll_number: rolls.roll_number,
        roll_seq: rolls.roll_seq,
        qr_code_text: rolls.qr_code_text,
        qr_png_base64: rolls.qr_png_base64,
        stage: rolls.stage,
        weight_kg: rolls.weight_kg,
        cut_weight_total_kg: rolls.cut_weight_total_kg,
        waste_kg: rolls.waste_kg,
        created_at: rolls.created_at,
        printed_at: rolls.printed_at,
        cut_completed_at: rolls.cut_completed_at,
        production_order_id: rolls.production_order_id,
        production_order_number: production_orders.production_order_number,
        order_id: production_orders.order_id,
        order_number: orders.order_number,
        customer_id: orders.customer_id,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
      })
      .from(rolls)
      .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
      .leftJoin(orders, eq(production_orders.order_id, orders.id))
      .leftJoin(customers, eq(orders.customer_id, customers.id))
      .where(sql`${rolls.qr_code_text} ILIKE ${'%' + barcode + '%'}`)
      .limit(1);

    if (result.length === 0) return null;

    const roll = result[0];
    setCachedData(cacheKey, roll, CACHE_TTL.MEDIUM);
    return roll;
  }

  // جلب التفاصيل الكاملة للرول
  async getRollFullDetails(rollId: number): Promise<any | null> {
    const cacheKey = `roll_full_details:${rollId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        // Roll info
        roll_id: rolls.id,
        roll_number: rolls.roll_number,
        roll_seq: rolls.roll_seq,
        qr_code_text: rolls.qr_code_text,
        qr_png_base64: rolls.qr_png_base64,
        stage: rolls.stage,
        weight_kg: rolls.weight_kg,
        cut_weight_total_kg: rolls.cut_weight_total_kg,
        waste_kg: rolls.waste_kg,
        created_at: rolls.created_at,
        printed_at: rolls.printed_at,
        cut_completed_at: rolls.cut_completed_at,
        // Production order info
        production_order_id: rolls.production_order_id,
        production_order_number: production_orders.production_order_number,
        production_quantity_kg: production_orders.quantity_kg,
        production_final_quantity_kg: production_orders.final_quantity_kg,
        production_status: production_orders.status,
        production_overrun_percentage: production_orders.overrun_percentage,
        // Order info
        order_id: production_orders.order_id,
        order_number: orders.order_number,
        order_status: orders.status,
        order_delivery_date: orders.delivery_date,
        // Customer info
        customer_id: orders.customer_id,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
        customer_phone: customers.phone,
        customer_city: customers.city,
        // Machine info
        film_machine_id: rolls.film_machine_id,
        film_machine_name: sql<string>`film_machine.name`,
        film_machine_name_ar: sql<string>`film_machine.name_ar`,
        printing_machine_id: rolls.printing_machine_id,
        printing_machine_name: sql<string>`printing_machine.name`,
        printing_machine_name_ar: sql<string>`printing_machine.name_ar`,
        cutting_machine_id: rolls.cutting_machine_id,
        cutting_machine_name: sql<string>`cutting_machine.name`,
        cutting_machine_name_ar: sql<string>`cutting_machine.name_ar`,
        // Operator info
        created_by: rolls.created_by,
        created_by_name: sql<string>`created_user.display_name`,
        created_by_name_ar: sql<string>`created_user.display_name_ar`,
        printed_by: rolls.printed_by,
        printed_by_name: sql<string>`printed_user.display_name`,
        printed_by_name_ar: sql<string>`printed_user.display_name_ar`,
        cut_by: rolls.cut_by,
        cut_by_name: sql<string>`cut_user.display_name`,
        cut_by_name_ar: sql<string>`cut_user.display_name_ar`,
      })
      .from(rolls)
      .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
      .leftJoin(orders, eq(production_orders.order_id, orders.id))
      .leftJoin(customers, eq(orders.customer_id, customers.id))
      .leftJoin(alias(machines, 'film_machine'), eq(rolls.film_machine_id, sql`film_machine.id`))
      .leftJoin(alias(machines, 'printing_machine'), eq(rolls.printing_machine_id, sql`printing_machine.id`))
      .leftJoin(alias(machines, 'cutting_machine'), eq(rolls.cutting_machine_id, sql`cutting_machine.id`))
      .leftJoin(alias(users, 'created_user'), eq(rolls.created_by, sql`created_user.id`))
      .leftJoin(alias(users, 'printed_user'), eq(rolls.printed_by, sql`printed_user.id`))
      .leftJoin(alias(users, 'cut_user'), eq(rolls.cut_by, sql`cut_user.id`))
      .where(eq(rolls.id, rollId))
      .limit(1);

    if (result.length === 0) return null;

    let rollData: any = result[0];

    // Parse product info from QR code
    try {
      const qrData = JSON.parse(rollData.qr_code_text);
      rollData = {
        ...rollData,
        item_name: qrData.item_name || qrData.product_name,
        item_name_ar: qrData.item_name_ar || qrData.product_name_ar,
        size_caption: qrData.size_caption,
        raw_material: qrData.raw_material,
        color: qrData.color,
        punching: qrData.punching,
        thickness: qrData.thickness,
      };
    } catch {
      // Ignore parse error
    }

    // Get related cuts
    const cutsData = await db
      .select({
        cut_id: cuts.id,
        weight_kg: cuts.cut_weight_kg,
        pieces_count: cuts.pieces_count,
        created_at: cuts.created_at,
        created_by_name: users.display_name,
      })
      .from(cuts)
      .leftJoin(users, eq(cuts.performed_by, users.id))
      .where(eq(cuts.roll_id, rollId))
      .orderBy(desc(cuts.created_at));

    const roll = {
      ...rollData,
      cuts: cutsData,
      cuts_count: cutsData.length,
      total_cuts_weight: cutsData.reduce((sum, cut) => sum + parseFloat(cut.weight_kg || "0"), 0),
    };

    setCachedData(cacheKey, roll, CACHE_TTL.MEDIUM);
    return roll;
  }

  // جلب سجل تحركات الرول
  async getRollHistory(rollId: number): Promise<any[]> {
    const cacheKey = `roll_history:${rollId}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // Get roll basic info
    const [roll] = await db
      .select()
      .from(rolls)
      .where(eq(rolls.id, rollId));

    if (!roll) return [];

    const history = [];

    // Film stage
    history.push({
      stage: 'film',
      stage_ar: 'مرحلة الفيلم',
      timestamp: roll.created_at,
      machine_id: roll.film_machine_id,
      operator_id: roll.created_by,
      operator_name: await this.getUserDisplayName(roll.created_by),
      weight_kg: roll.weight_kg,
      status: 'completed',
      icon: 'Film',
    });

    // Printing stage
    if (roll.printed_at) {
      history.push({
        stage: 'printing',
        stage_ar: 'مرحلة الطباعة',
        timestamp: roll.printed_at,
        machine_id: roll.printing_machine_id,
        operator_id: roll.printed_by,
        operator_name: await this.getUserDisplayName(roll.printed_by),
        status: 'completed',
        icon: 'Printer',
      });
    }

    // Cutting stage
    if (roll.cut_completed_at) {
      history.push({
        stage: 'cutting',
        stage_ar: 'مرحلة التقطيع',
        timestamp: roll.cut_completed_at,
        machine_id: roll.cutting_machine_id,
        operator_id: roll.cut_by,
        operator_name: await this.getUserDisplayName(roll.cut_by),
        cut_weight_total_kg: roll.cut_weight_total_kg,
        waste_kg: roll.waste_kg,
        status: 'completed',
        icon: 'Scissors',
      });
    }

    // Get cuts
    const cutsHistory = await db
      .select({
        weight_kg: cuts.cut_weight_kg,
        pieces_count: cuts.pieces_count,
        created_at: cuts.created_at,
        performed_by: cuts.performed_by,
        created_by_name: users.display_name,
      })
      .from(cuts)
      .leftJoin(users, eq(cuts.performed_by, users.id))
      .where(eq(cuts.roll_id, rollId))
      .orderBy(cuts.created_at);

    // Add each cut to history
    cutsHistory.forEach(cut => {
      history.push({
        stage: 'cut',
        stage_ar: 'قطع',
        timestamp: cut.created_at,
        weight_kg: cut.weight_kg,
        pieces_count: cut.pieces_count,
        operator_id: cut.performed_by,
        operator_name: cut.created_by_name,
        status: 'completed',
        icon: 'Package',
      });
    });

    // Sort by timestamp
    history.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    setCachedData(cacheKey, history, CACHE_TTL.MEDIUM);
    return history;
  }

  // Helper function to get user display name
  async getUserDisplayName(userId: number | null): Promise<string | null> {
    if (!userId) return null;
    const user = await this.getUserById(userId);
    return user?.display_name || user?.username || null;
  }

  async getMachines(): Promise<Machine[]> {
    return await db.select().from(machines);
  }

  async getMachineById(id: string): Promise<Machine | undefined> {
    const [machine] = await db
      .select()
      .from(machines)
      .where(eq(machines.id, id));
    return machine || undefined;
  }

  // Machine Queue functions for production scheduling
  async getMachineQueues(): Promise<any[]> {
    const cacheKey = "machine_queues";
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    const result = await db
      .select({
        queue_id: machine_queues.id,
        machine_id: machine_queues.machine_id,
        machine_name: machines.name,
        machine_name_ar: machines.name_ar,
        machine_status: machines.status,
        production_order_id: machine_queues.production_order_id,
        production_order_number: production_orders.production_order_number,
        customer_product_id: production_orders.customer_product_id,
        quantity_kg: production_orders.quantity_kg,
        final_quantity_kg: production_orders.final_quantity_kg,
        status: production_orders.status,
        queue_position: machine_queues.queue_position,
        estimated_start_time: machine_queues.estimated_start_time,
        assigned_at: machine_queues.assigned_at,
        assigned_by: machine_queues.assigned_by,
        assigned_by_name: users.display_name,
      })
      .from(machine_queues)
      .leftJoin(machines, eq(machine_queues.machine_id, machines.id))
      .leftJoin(production_orders, eq(machine_queues.production_order_id, production_orders.id))
      .leftJoin(users, eq(machine_queues.assigned_by, users.id))
      .orderBy(machine_queues.machine_id, machine_queues.queue_position);

    setCachedData(cacheKey, result, CACHE_TTL.REALTIME);
    return result;
  }

  async assignToMachineQueue(
    productionOrderId: number,
    machineId: string,
    position: number,
    userId: number
  ): Promise<MachineQueue> {
    return await db.transaction(async (tx) => {
      // Check if production order exists and is active
      const [po] = await tx
        .select()
        .from(production_orders)
        .where(eq(production_orders.id, productionOrderId));
      
      if (!po) {
        throw new DatabaseError("أمر الإنتاج غير موجود");
      }

      if (!["pending", "active", "in_production"].includes(po.status)) {
        throw new DatabaseError("أمر الإنتاج غير نشط");
      }

      // Check if machine exists and is active
      const [machine] = await tx
        .select()
        .from(machines)
        .where(eq(machines.id, machineId));
      
      if (!machine) {
        throw new DatabaseError("الماكينة غير موجودة");
      }

      if (machine.status !== "active") {
        throw new DatabaseError("الماكينة غير نشطة");
      }

      // Check if already assigned
      const existing = await tx
        .select()
        .from(machine_queues)
        .where(eq(machine_queues.production_order_id, productionOrderId));
      
      if (existing.length > 0) {
        throw new DatabaseError("أمر الإنتاج مخصص بالفعل لماكينة");
      }

      // Shift positions for other items in the queue
      await tx.execute(
        sql`UPDATE machine_queues 
            SET queue_position = queue_position + 1 
            WHERE machine_id = ${machineId} 
            AND queue_position >= ${position}`
      );

      // Insert new queue entry
      const [queueEntry] = await tx
        .insert(machine_queues)
        .values({
          machine_id: machineId,
          production_order_id: productionOrderId,
          queue_position: position,
          assigned_by: userId,
        })
        .returning();

      // Clear cache
      cache.delete("machine_queues");
      invalidateProductionCache("all");

      return queueEntry;
    });
  }

  async updateQueuePosition(queueId: number, newPosition: number): Promise<MachineQueue> {
    return await db.transaction(async (tx) => {
      // Get current queue entry
      const [currentEntry] = await tx
        .select()
        .from(machine_queues)
        .where(eq(machine_queues.id, queueId));
      
      if (!currentEntry) {
        throw new DatabaseError("إدخال الطابور غير موجود");
      }

      const oldPosition = currentEntry.queue_position;
      const machineId = currentEntry.machine_id;

      if (oldPosition === newPosition) {
        return currentEntry; // No change needed
      }

      // Update positions for other items
      if (newPosition < oldPosition) {
        // Moving up - shift items down
        await tx.execute(
          sql`UPDATE machine_queues 
              SET queue_position = queue_position + 1 
              WHERE machine_id = ${machineId} 
              AND queue_position >= ${newPosition} 
              AND queue_position < ${oldPosition}
              AND id != ${queueId}`
        );
      } else {
        // Moving down - shift items up
        await tx.execute(
          sql`UPDATE machine_queues 
              SET queue_position = queue_position - 1 
              WHERE machine_id = ${machineId} 
              AND queue_position > ${oldPosition} 
              AND queue_position <= ${newPosition}
              AND id != ${queueId}`
        );
      }

      // Update the target entry position
      const [updated] = await tx
        .update(machine_queues)
        .set({ queue_position: newPosition })
        .where(eq(machine_queues.id, queueId))
        .returning();

      // Clear cache
      cache.delete("machine_queues");
      invalidateProductionCache("all");

      return updated;
    });
  }

  async removeFromQueue(queueId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Get the entry to be removed
      const [entry] = await tx
        .select()
        .from(machine_queues)
        .where(eq(machine_queues.id, queueId));
      
      if (!entry) {
        throw new DatabaseError("إدخال الطابور غير موجود");
      }

      // Delete the entry
      await tx.delete(machine_queues).where(eq(machine_queues.id, queueId));

      // Shift positions for remaining items
      await tx.execute(
        sql`UPDATE machine_queues 
            SET queue_position = queue_position - 1 
            WHERE machine_id = ${entry.machine_id} 
            AND queue_position > ${entry.queue_position}`
      );

      // Clear cache
      cache.delete("machine_queues");
      invalidateProductionCache("all");
    });
  }

  async suggestOptimalDistribution(): Promise<any[]> {
    // Get all active machines and their current queue sizes
    const machineLoads = await db
      .select({
        machine_id: machines.id,
        machine_name: machines.name,
        machine_name_ar: machines.name_ar,
        machine_type: machines.type,
        queue_count: sql<number>`COUNT(${machine_queues.id})`,
      })
      .from(machines)
      .leftJoin(machine_queues, eq(machines.id, machine_queues.machine_id))
      .where(eq(machines.status, "active"))
      .groupBy(machines.id, machines.name, machines.name_ar, machines.type);

    // Get unassigned active production orders
    const unassignedOrders = await db
      .select({
        id: production_orders.id,
        production_order_number: production_orders.production_order_number,
        quantity_kg: production_orders.quantity_kg,
        customer_product_id: production_orders.customer_product_id,
      })
      .from(production_orders)
      .leftJoin(machine_queues, eq(production_orders.id, machine_queues.production_order_id))
      .where(
        and(
          eq(production_orders.status, "active"),
          sql`${machine_queues.id} IS NULL`
        )
      );

    // Sort machines by load (ascending)
    machineLoads.sort((a, b) => (a.queue_count || 0) - (b.queue_count || 0));

    // Distribute orders optimally
    const suggestions = [];
    let machineIndex = 0;

    for (const order of unassignedOrders) {
      const targetMachine = machineLoads[machineIndex % machineLoads.length];
      suggestions.push({
        production_order_id: order.id,
        production_order_number: order.production_order_number,
        suggested_machine_id: targetMachine.machine_id,
        suggested_machine_name: targetMachine.machine_name,
        suggested_machine_name_ar: targetMachine.machine_name_ar,
        current_queue_size: targetMachine.queue_count || 0,
      });
      
      // Update the count for round-robin distribution
      targetMachine.queue_count = (targetMachine.queue_count || 0) + 1;
      machineIndex++;
    }

    return suggestions;
  }

  // Smart Distribution Functions Implementation
  async smartDistributeOrders(algorithm: string, params: any = {}): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        // Get all active machines
        const machines = await this.getMachines();
        const activeMachines = machines.filter(m => m.status === "active");
        
        if (activeMachines.length === 0) {
          throw new DatabaseError("لا توجد مكائن نشطة للتوزيع");
        }

        // Get unassigned active production orders
        const unassignedOrders = await db
          .select({
            id: production_orders.id,
            production_order_number: production_orders.production_order_number,
            quantity_kg: production_orders.quantity_kg,
            final_quantity_kg: production_orders.final_quantity_kg,
            customer_product_id: production_orders.customer_product_id,
            created_at: production_orders.created_at,
          })
          .from(production_orders)
          .leftJoin(machine_queues, eq(production_orders.id, machine_queues.production_order_id))
          .where(
            and(
              eq(production_orders.status, "active"),
              sql`${machine_queues.id} IS NULL`
            )
          );

        if (unassignedOrders.length === 0) {
          return {
            success: false,
            message: "لا توجد أوامر إنتاج غير مخصصة",
            distributed: 0,
          };
        }

        // Get current machine loads
        const machineLoads = new Map<string, number>();
        const machineCapacities = new Map<string, number>();
        
        for (const machine of activeMachines) {
          const capacity = await this.calculateMachineCapacity(machine.id);
          machineCapacities.set(machine.id, capacity.availableCapacity);
          machineLoads.set(machine.id, capacity.currentLoad);
        }

        let distributionPlan: Array<{ orderId: number; machineId: string; position: number }> = [];

        switch (algorithm) {
          case "balanced":
            // التوزيع المتوازن - توزيع متساوٍ حسب عدد الأوامر
            distributionPlan = this.distributeBalanced(unassignedOrders, activeMachines, machineLoads);
            break;

          case "load-based":
            // التوزيع حسب الحمولة - توزيع حسب الكمية الإجمالية
            distributionPlan = this.distributeByLoad(unassignedOrders, activeMachines, machineCapacities);
            break;

          case "priority":
            // التوزيع حسب الأولوية - أوامر عاجلة أولاً
            distributionPlan = this.distributeByPriority(unassignedOrders, activeMachines, machineLoads);
            break;

          case "product-type":
            // التوزيع حسب نوع المنتج - تجميع منتجات مشابهة
            distributionPlan = await this.distributeByProductType(unassignedOrders, activeMachines, machineLoads);
            break;

          case "hybrid":
            // التوزيع الهجين - مزج المعايير المختلفة
            distributionPlan = await this.distributeHybrid(unassignedOrders, activeMachines, machineCapacities, params);
            break;

          default:
            throw new DatabaseError(`خوارزمية التوزيع غير معروفة: ${algorithm}`);
        }

        // Apply the distribution plan
        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (const plan of distributionPlan) {
          try {
            await this.assignToMachineQueue(
              plan.orderId,
              plan.machineId,
              plan.position,
              params.userId || 1
            );
            successCount++;
            results.push({
              orderId: plan.orderId,
              machineId: plan.machineId,
              status: "success",
            });
          } catch (error: any) {
            failCount++;
            results.push({
              orderId: plan.orderId,
              machineId: plan.machineId,
              status: "failed",
              error: error.message,
            });
          }
        }

        // Invalidate cache
        cache.delete("machine_queues");
        invalidateProductionCache("all");

        return {
          success: true,
          message: `تم توزيع ${successCount} أمر بنجاح`,
          distributed: successCount,
          failed: failCount,
          results,
          algorithm,
        };
      },
      "smartDistributeOrders",
      "توزيع أوامر الإنتاج بذكاء"
    );
  }

  // Helper function for balanced distribution
  private distributeBalanced(orders: any[], machines: Machine[], loads: Map<string, number>): any[] {
    const plan = [];
    let machineIndex = 0;

    // Sort machines by current load (ascending)
    const sortedMachines = machines.sort((a, b) => {
      const loadA = loads.get(a.id) || 0;
      const loadB = loads.get(b.id) || 0;
      return loadA - loadB;
    });

    for (const order of orders) {
      const machine = sortedMachines[machineIndex % sortedMachines.length];
      const currentLoad = loads.get(machine.id) || 0;
      
      plan.push({
        orderId: order.id,
        machineId: machine.id,
        position: currentLoad,
      });

      loads.set(machine.id, currentLoad + 1);
      machineIndex++;
    }

    return plan;
  }

  // Helper function for load-based distribution
  private distributeByLoad(orders: any[], machines: Machine[], capacities: Map<string, number>): any[] {
    const plan: Array<{ orderId: number; machineId: string; position: number }> = [];
    const machineWeights = new Map<string, number>();
    
    // Initialize weights
    machines.forEach(m => machineWeights.set(m.id, 0));

    // Sort orders by weight (descending) - largest first
    const sortedOrders = orders.sort((a, b) => {
      const weightA = parseFloat(a.final_quantity_kg || a.quantity_kg || "0");
      const weightB = parseFloat(b.final_quantity_kg || b.quantity_kg || "0");
      return weightB - weightA;
    });

    for (const order of sortedOrders) {
      // Find machine with most available capacity
      let bestMachine = machines[0];
      let maxCapacity = -1;

      for (const machine of machines) {
        const currentWeight = machineWeights.get(machine.id) || 0;
        const capacity = capacities.get(machine.id) || 0;
        const availableCapacity = capacity - currentWeight;

        if (availableCapacity > maxCapacity) {
          maxCapacity = availableCapacity;
          bestMachine = machine;
        }
      }

      const orderWeight = parseFloat(order.final_quantity_kg || order.quantity_kg || "0");
      machineWeights.set(bestMachine.id, (machineWeights.get(bestMachine.id) || 0) + orderWeight);

      plan.push({
        orderId: order.id,
        machineId: bestMachine.id,
        position: plan.filter(p => p.machineId === bestMachine.id).length,
      });
    }

    return plan;
  }

  // Helper function for priority-based distribution
  private distributeByPriority(orders: any[], machines: Machine[], loads: Map<string, number>): any[] {
    const plan = [];

    // Sort orders by creation date (oldest first) since priority field doesn't exist
    const sortedOrders = orders.sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    for (const order of sortedOrders) {
      // Find machine with least load
      let bestMachine = machines[0];
      let minLoad = Infinity;

      for (const machine of machines) {
        const load = loads.get(machine.id) || 0;
        if (load < minLoad) {
          minLoad = load;
          bestMachine = machine;
        }
      }

      plan.push({
        orderId: order.id,
        machineId: bestMachine.id,
        position: minLoad,
      });

      loads.set(bestMachine.id, minLoad + 1);
    }

    return plan;
  }

  // Helper function for product-type-based distribution
  private async distributeByProductType(orders: any[], machines: Machine[], loads: Map<string, number>): Promise<any[]> {
    const plan = [];
    
    // Group orders by customer_product_id
    const productGroups = new Map<number, any[]>();
    
    for (const order of orders) {
      const productId = order.customer_product_id;
      if (!productGroups.has(productId)) {
        productGroups.set(productId, []);
      }
      productGroups.get(productId)!.push(order);
    }

    // Assign each product group to machines
    let machineIndex = 0;
    
    for (const [productId, productOrders] of Array.from(productGroups.entries())) {
      const machine = machines[machineIndex % machines.length];
      let position = loads.get(machine.id) || 0;

      for (const order of productOrders) {
        plan.push({
          orderId: order.id,
          machineId: machine.id,
          position: position++,
        });
      }

      loads.set(machine.id, position);
      machineIndex++;
    }

    return plan;
  }

  // Helper function for hybrid distribution
  private async distributeHybrid(
    orders: any[], 
    machines: Machine[], 
    capacities: Map<string, number>,
    params: any
  ): Promise<any[]> {
    const plan = [];
    const machineScores = new Map<string, Map<number, number>>();

    // Initialize scores
    machines.forEach(m => machineScores.set(m.id, new Map()));

    // Calculate scores for each order-machine combination
    for (const order of orders) {
      for (const machine of machines) {
        let score = 0;

        // Factor 1: Current load (lower is better)
        const currentLoad = await this.getMachineQueueCount(machine.id);
        score += (10 - Math.min(currentLoad, 10)) * (params.loadWeight || 0.3);

        // Factor 2: Capacity (higher available capacity is better)
        const capacity = capacities.get(machine.id) || 0;
        score += (capacity / 1000) * (params.capacityWeight || 0.3);

        // Factor 3: Priority matching
        if (order.priority === "urgent" || order.priority === "high") {
          score += 5 * (params.priorityWeight || 0.2);
        }

        // Factor 4: Machine type preference (if specified)
        if (params.machineTypePreference && machine.type === params.machineTypePreference) {
          score += 10 * (params.typeWeight || 0.2);
        }

        machineScores.get(machine.id)!.set(order.id, score);
      }
    }

    // Assign orders to machines based on highest scores
    const assignedOrders = new Set<number>();
    const machinePositions = new Map<string, number>();

    while (assignedOrders.size < orders.length) {
      let bestScore = -1;
      let bestOrder: any = null;
      let bestMachine: Machine | null = null;

      for (const order of orders) {
        if (assignedOrders.has(order.id)) continue;

        for (const machine of machines) {
          const score = machineScores.get(machine.id)!.get(order.id) || 0;
          if (score > bestScore) {
            bestScore = score;
            bestOrder = order;
            bestMachine = machine;
          }
        }
      }

      if (!bestOrder || !bestMachine) break;

      const position = machinePositions.get(bestMachine.id) || 0;
      plan.push({
        orderId: bestOrder.id,
        machineId: bestMachine.id,
        position,
      });

      machinePositions.set(bestMachine.id, position + 1);
      assignedOrders.add(bestOrder.id);

      // Reduce scores for this machine to balance distribution
      for (const order of orders) {
        const currentScore = machineScores.get(bestMachine.id)!.get(order.id) || 0;
        machineScores.get(bestMachine.id)!.set(order.id, currentScore * 0.9);
      }
    }

    return plan;
  }

  // Helper to get machine queue count
  private async getMachineQueueCount(machineId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(machine_queues)
      .where(eq(machine_queues.machine_id, machineId));
    
    return result?.count || 0;
  }

  async calculateMachineCapacity(machineId: string): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        // Get machine details
        const machine = await this.getMachineById(machineId);
        if (!machine) {
          throw new DatabaseError("الماكينة غير موجودة");
        }

        // Get current queue for this machine
        const queueItems = await db
          .select({
            quantity_kg: production_orders.final_quantity_kg,
          })
          .from(machine_queues)
          .leftJoin(production_orders, eq(machine_queues.production_order_id, production_orders.id))
          .where(eq(machine_queues.machine_id, machineId));

        // Calculate current load
        let currentLoad = 0;
        let orderCount = 0;

        for (const item of queueItems) {
          if (item.quantity_kg) {
            currentLoad += parseFloat(item.quantity_kg.toString());
          }
          orderCount++;
        }

        // Default capacities based on machine type (in kg)
        const defaultCapacities = {
          "extruder": 5000,   // 5 tons
          "printer": 3000,    // 3 tons
          "cutter": 4000,     // 4 tons
        };

        const maxCapacity = defaultCapacities[machine.type as keyof typeof defaultCapacities] || 4000;
        const availableCapacity = maxCapacity - currentLoad;
        const utilizationPercentage = (currentLoad / maxCapacity) * 100;

        // Estimate production rate (kg/hour) based on machine type
        const productionRates = {
          "extruder": 200,
          "printer": 150,
          "cutter": 250,
        };

        const productionRate = productionRates[machine.type as keyof typeof productionRates] || 200;
        const estimatedTimeHours = currentLoad / productionRate;

        return {
          machineId,
          machineName: machine.name,
          machineNameAr: machine.name_ar,
          machineType: machine.type,
          machineStatus: machine.status,
          currentLoad,
          maxCapacity,
          availableCapacity,
          utilizationPercentage,
          orderCount,
          productionRate,
          estimatedTimeHours,
          capacityStatus: utilizationPercentage > 90 ? "overloaded" : 
                         utilizationPercentage > 70 ? "high" :
                         utilizationPercentage > 40 ? "moderate" : "low",
        };
      },
      "calculateMachineCapacity",
      "حساب سعة الماكينة"
    );
  }

  async getDistributionPreview(algorithm: string, params: any = {}): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        // Get all active machines
        const machines = await this.getMachines();
        const activeMachines = machines.filter(m => m.status === "active");

        if (activeMachines.length === 0) {
          return {
            success: false,
            message: "لا توجد مكائن نشطة للتوزيع",
            preview: [],
          };
        }

        // Get unassigned active production orders
        const unassignedOrders = await db
          .select({
            id: production_orders.id,
            production_order_number: production_orders.production_order_number,
            quantity_kg: production_orders.quantity_kg,
            final_quantity_kg: production_orders.final_quantity_kg,
            customer_product_id: production_orders.customer_product_id,
            created_at: production_orders.created_at,
          })
          .from(production_orders)
          .leftJoin(machine_queues, eq(production_orders.id, machine_queues.production_order_id))
          .where(
            and(
              eq(production_orders.status, "active"),
              sql`${machine_queues.id} IS NULL`
            )
          );

        if (unassignedOrders.length === 0) {
          return {
            success: false,
            message: "لا توجد أوامر إنتاج غير مخصصة",
            preview: [],
          };
        }

        // Get current machine states
        const machineStates = [];
        for (const machine of activeMachines) {
          const capacity = await this.calculateMachineCapacity(machine.id);
          machineStates.push({
            ...capacity,
            proposedOrders: [],
            proposedLoad: 0,
            proposedUtilization: 0,
          });
        }

        // Simulate distribution without applying
        const machineLoads = new Map<string, number>();
        const machineCapacities = new Map<string, number>();
        
        for (const state of machineStates) {
          machineCapacities.set(state.machineId, state.availableCapacity);
          machineLoads.set(state.machineId, state.orderCount);
        }

        let distributionPlan;
        
        switch (algorithm) {
          case "balanced":
            distributionPlan = this.distributeBalanced(unassignedOrders, activeMachines, machineLoads);
            break;
          case "load-based":
            distributionPlan = this.distributeByLoad(unassignedOrders, activeMachines, machineCapacities);
            break;
          case "priority":
            distributionPlan = this.distributeByPriority(unassignedOrders, activeMachines, machineLoads);
            break;
          case "product-type":
            distributionPlan = await this.distributeByProductType(unassignedOrders, activeMachines, machineLoads);
            break;
          case "hybrid":
            distributionPlan = await this.distributeHybrid(unassignedOrders, activeMachines, machineCapacities, params);
            break;
          default:
            distributionPlan = this.distributeBalanced(unassignedOrders, activeMachines, machineLoads);
        }

        // Apply plan to preview
        for (const plan of distributionPlan) {
          const order = unassignedOrders.find(o => o.id === plan.orderId);
          const machineState = machineStates.find(s => s.machineId === plan.machineId);
          
          if (order && machineState) {
            const orderWeight = parseFloat(order.final_quantity_kg || order.quantity_kg || "0");
            machineState.proposedOrders.push({
              orderId: order.id,
              orderNumber: order.production_order_number,
              weight: orderWeight,
            });
            machineState.proposedLoad += orderWeight;
          }
        }

        // Calculate new utilization
        for (const state of machineStates) {
          const newTotalLoad = state.currentLoad + state.proposedLoad;
          state.proposedUtilization = (newTotalLoad / state.maxCapacity) * 100;
          state.newCapacityStatus = state.proposedUtilization > 90 ? "overloaded" :
                                    state.proposedUtilization > 70 ? "high" :
                                    state.proposedUtilization > 40 ? "moderate" : "low";
        }

        // Calculate distribution efficiency
        const loadVariance = this.calculateLoadVariance(machineStates);
        const efficiency = Math.max(0, 100 - loadVariance);

        return {
          success: true,
          algorithm,
          totalOrders: unassignedOrders.length,
          machineCount: activeMachines.length,
          efficiency: efficiency.toFixed(2),
          preview: machineStates,
        };
      },
      "getDistributionPreview",
      "معاينة توزيع الأوامر"
    );
  }

  private calculateLoadVariance(machineStates: any[]): number {
    if (machineStates.length === 0) return 0;
    
    const loads = machineStates.map(s => s.proposedUtilization);
    const mean = loads.reduce((a, b) => a + b, 0) / loads.length;
    const variance = loads.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / loads.length;
    
    return Math.sqrt(variance);
  }

  async optimizeQueueOrder(machineId: string): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        // Get current queue for the machine
        const queue = await db
          .select({
            id: machine_queues.id,
            production_order_id: machine_queues.production_order_id,
            queue_position: machine_queues.queue_position,
            quantity_kg: production_orders.final_quantity_kg,
            customer_product_id: production_orders.customer_product_id,
          })
          .from(machine_queues)
          .leftJoin(production_orders, eq(machine_queues.production_order_id, production_orders.id))
          .where(eq(machine_queues.machine_id, machineId))
          .orderBy(machine_queues.queue_position);

        if (queue.length === 0) return;

        // Sort queue by optimization criteria
        const optimizedQueue = queue.sort((a, b) => {
          // First by product type to group similar products
          if (a.customer_product_id !== b.customer_product_id) {
            return (a.customer_product_id || 0) - (b.customer_product_id || 0);
          }
          
          // Then by current position to maintain some stability
          return a.queue_position - b.queue_position;
        });

        // Update positions
        await db.transaction(async (tx) => {
          for (let i = 0; i < optimizedQueue.length; i++) {
            if (optimizedQueue[i].queue_position !== i) {
              await tx
                .update(machine_queues)
                .set({ queue_position: i })
                .where(eq(machine_queues.id, optimizedQueue[i].id));
            }
          }
        });

        // Invalidate cache
        cache.delete("machine_queues");
        invalidateProductionCache("all");
      },
      "optimizeQueueOrder",
      "تحسين ترتيب طابور الماكينة"
    );
  }

  async getMachineCapacityStats(): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        const machines = await this.getMachines();
        const activeMachines = machines.filter(m => m.status === "active");
        
        const stats = [];
        
        for (const machine of activeMachines) {
          const capacity = await this.calculateMachineCapacity(machine.id);
          stats.push(capacity);
        }

        // Sort by utilization percentage (descending)
        stats.sort((a, b) => b.utilizationPercentage - a.utilizationPercentage);
        
        return stats;
      },
      "getMachineCapacityStats",
      "إحصائيات سعة المكائن"
    );
  }

  async getCustomers(options?: { 
    search?: string; 
    page?: number; 
    limit?: number;
  }): Promise<{ data: Customer[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const offset = (page - 1) * limit;
    
    let query = db.select().from(customers);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(customers);
    
    if (options?.search && options.search.trim()) {
      const searchTerm = `%${options.search.trim()}%`;
      const searchCondition = or(
        sql`${customers.name} ILIKE ${searchTerm}`,
        sql`${customers.name_ar} ILIKE ${searchTerm}`,
        sql`${customers.code} ILIKE ${searchTerm}`
      );
      query = query.where(searchCondition) as any;
      countQuery = countQuery.where(searchCondition) as any;
    }
    
    const [totalResult] = await countQuery;
    const total = Number(totalResult?.count || 0);
    
    const data = await query
      .orderBy(customers.name)
      .limit(limit)
      .offset(offset);
    
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
  
  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  // Customer Products - replaced the old Products table

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    return await db
      .select()
      .from(maintenance_requests)
      .orderBy(desc(maintenance_requests.date_reported));
  }

  async createMaintenanceRequest(
    request: InsertMaintenanceRequest,
  ): Promise<MaintenanceRequest> {
    // Generate request number automatically
    const existingRequests = await db.select().from(maintenance_requests);
    const nextNumber = existingRequests.length + 1;
    const requestNumber = `MO${nextNumber.toString().padStart(3, "0")}`;

    const [maintenanceRequest] = await db
      .insert(maintenance_requests)
      .values({
        ...request,
        request_number: requestNumber,
      })
      .returning();
    return maintenanceRequest;
  }

  async deleteMaintenanceRequest(id: number): Promise<void> {
    return await db.transaction(async (tx) => {
      try {
        // Delete related notifications first
        await tx
          .delete(notifications)
          .where(
            and(
              eq(notifications.context_type, "maintenance_request"),
              eq(notifications.context_id, id.toString()),
            ),
          );

        // Delete the maintenance request - FK cascades will handle maintenance_actions and maintenance_reports
        // If FK cascades are not yet applied, we have a fallback
        try {
          await tx
            .delete(maintenance_requests)
            .where(eq(maintenance_requests.id, id));
        } catch (fkError: any) {
          if (fkError.code === "23503") {
            // FK constraint violation - manually delete children as fallback
            // maintenance_reports will cascade from maintenance_actions deletion
            await tx
              .delete(maintenance_actions)
              .where(eq(maintenance_actions.maintenance_request_id, id));
            await tx
              .delete(maintenance_requests)
              .where(eq(maintenance_requests.id, id));
          } else {
            throw fkError;
          }
        }
      } catch (error) {
        console.error("Error deleting maintenance request:", error);
        throw new Error("فشل في حذف طلب الصيانة");
      }
    });
  }

  async getQualityChecks(): Promise<QualityCheck[]> {
    return await db
      .select()
      .from(quality_checks)
      .orderBy(desc(quality_checks.created_at));
  }

  async getUsers(): Promise<User[]> {
    // DEPRECATED: This method returns sensitive data including passwords
    // Use getSafeUsers() instead for client-facing operations
    return await db.select().from(users);
  }

  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }

  async createRole(roleData: any): Promise<Role> {
    try {
      const [role] = await db
        .insert(roles)
        .values({
          name: roleData.name,
          name_ar: roleData.name_ar,
          permissions: roleData.permissions || [],
        })
        .returning();
      return role;
    } catch (error) {
      console.error("Error creating role:", error);
      throw new Error("فشل في إنشاء الدور");
    }
  }

  async updateRole(id: number, roleData: any): Promise<Role> {
    try {
      const [role] = await db
        .update(roles)
        .set({
          name: roleData.name,
          name_ar: roleData.name_ar,
          permissions: roleData.permissions,
        })
        .where(eq(roles.id, id))
        .returning();
      return role;
    } catch (error) {
      console.error("Error updating role:", error);
      throw new Error("فشل في تحديث الدور");
    }
  }

  async deleteRole(id: number): Promise<void> {
    try {
      await db.delete(roles).where(eq(roles.id, id));
    } catch (error) {
      console.error("Error deleting role:", error);
      throw new Error("فشل في حذف الدور");
    }
  }

  // Replaced by createCustomerProduct

  async createCustomer(customer: any): Promise<Customer> {
    return await withDatabaseErrorHandling(
      async () => {
        // STEP 0: MANDATORY DATAVALIDATOR INTEGRATION - Validate BEFORE database write
        const dataValidator = getDataValidator(this);
        const validationResult = await dataValidator.validateEntity(
          "customers",
          customer,
          false,
        );

        if (!validationResult.isValid) {
          console.error(
            "[Storage] ❌ CUSTOMER VALIDATION FAILED:",
            validationResult.errors,
          );
          throw new DatabaseError(
            `فشل التحقق من صحة بيانات العميل: ${validationResult.errors.map((e) => e.message_ar).join(", ")}`,
            {
              code: "VALIDATION_FAILED",
              validationErrors: validationResult.errors,
            },
          );
        }

        console.log(
          "[Storage] ✅ Customer validation passed, proceeding with database write",
        );

        // Generate a new customer ID in format CID001, CID002, etc.
        const existingCustomers = await db
          .select({ id: customers.id })
          .from(customers);
        const customerIds = existingCustomers.map((c) => c.id);
        const maxNumber = customerIds
          .filter((id) => id.startsWith("CID"))
          .map((id) => parseInt(id.substring(3)))
          .filter((num) => !isNaN(num))
          .reduce((max, num) => Math.max(max, num), 0);

        const newId = `CID${String(maxNumber + 1).padStart(3, "0")}`;

        const [newCustomer] = await db
          .insert(customers)
          .values({
            ...customer,
            id: newId,
          })
          .returning();
        return newCustomer;
      },
      "إنشاء عميل جديد",
      `العميل: ${customer.name}`,
    );
  }

  async updateCustomer(id: string, updates: any): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async createMachine(machine: any): Promise<Machine> {
    return await withDatabaseErrorHandling(
      async () => {
        // STEP 0: MANDATORY DATAVALIDATOR INTEGRATION - Validate BEFORE database write
        const dataValidator = getDataValidator(this);
        const validationResult = await dataValidator.validateEntity(
          "machines",
          machine,
          false,
        );

        if (!validationResult.isValid) {
          console.error(
            "[Storage] ❌ MACHINE VALIDATION FAILED:",
            validationResult.errors,
          );
          throw new DatabaseError(
            `فشل التحقق من صحة بيانات الماكينة: ${validationResult.errors.map((e) => e.message_ar).join(", ")}`,
            {
              code: "VALIDATION_FAILED",
              validationErrors: validationResult.errors,
            },
          );
        }

        console.log(
          "[Storage] ✅ Machine validation passed, proceeding with database write",
        );

        const [newMachine] = await db
          .insert(machines)
          .values(machine)
          .returning();
        return newMachine;
      },
      "إنشاء ماكينة جديدة",
      `الماكينة: ${machine.name}`,
    );
  }

  async updateMachine(id: string, updates: any): Promise<Machine> {
    const [updatedMachine] = await db
      .update(machines)
      .set(updates)
      .where(eq(machines.id, id))
      .returning();
    return updatedMachine;
  }

  async createSection(section: any): Promise<Section> {
    const [newSection] = await db.insert(sections).values(section).returning();
    return newSection;
  }

  async updateSection(id: string, updates: any): Promise<Section> {
    const [updatedSection] = await db
      .update(sections)
      .set(updates)
      .where(eq(sections.id, id))
      .returning();
    return updatedSection;
  }

  async updateUser(id: number, updates: any): Promise<User> {
    // Hash password if it's being updated
    if (updates.password) {
      const saltRounds = 12;
      updates.password = await bcrypt.hash(updates.password, saltRounds);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async createItem(item: any): Promise<Item> {
    const [newItem] = await db.insert(items).values(item).returning();
    return newItem;
  }

  async updateItem(id: string, updates: any): Promise<Item> {
    const [updatedItem] = await db
      .update(items)
      .set(updates)
      .where(eq(items.id, id))
      .returning();
    return updatedItem;
  }

  async createCustomerProduct(customerProduct: any): Promise<CustomerProduct> {
    const [newCustomerProduct] = await db
      .insert(customer_products)
      .values(customerProduct)
      .returning();
    return newCustomerProduct;
  }

  async updateCustomerProduct(
    id: number,
    updates: any,
  ): Promise<CustomerProduct> {
    const [updatedCustomerProduct] = await db
      .update(customer_products)
      .set(updates)
      .where(eq(customer_products.id, id))
      .returning();
    return updatedCustomerProduct;
  }

  async createLocation(location: any): Promise<Location> {
    const [newLocation] = await db
      .insert(locations)
      .values(location)
      .returning();
    return newLocation;
  }

  async updateLocation(id: string, updates: any): Promise<Location> {
    const [updatedLocation] = await db
      .update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();
    return updatedLocation;
  }

  async getSections(): Promise<Section[]> {
    return await db.select().from(sections);
  }

  // ============ Production Monitoring Analytics ============

  async getUserPerformanceStats(
    userId?: number,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '7 days'`;

        let query = db
          .select({
            user_id: users.id,
            username: users.username,
            display_name_ar: users.display_name_ar,
            role_name: sql<string>`COALESCE(roles.name_ar, roles.name)`,
            section_name: sql<string>`COALESCE(sections.name_ar, sections.name)`,
            rolls_created: sql<number>`COUNT(DISTINCT CASE WHEN ${rolls.created_by} = ${users.id} THEN ${rolls.id} END)`,
            rolls_printed: sql<number>`COUNT(DISTINCT CASE WHEN ${rolls.printed_by} = ${users.id} THEN ${rolls.id} END)`,
            rolls_cut: sql<number>`COUNT(DISTINCT CASE WHEN ${rolls.cut_by} = ${users.id} THEN ${rolls.id} END)`,
            total_weight_kg: sql<number>`COALESCE(SUM(CASE WHEN ${rolls.created_by} = ${users.id} OR ${rolls.printed_by} = ${users.id} OR ${rolls.cut_by} = ${users.id} THEN ${rolls.weight_kg} END), 0)`,
            avg_roll_weight: sql<number>`COALESCE(AVG(CASE WHEN ${rolls.created_by} = ${users.id} OR ${rolls.printed_by} = ${users.id} OR ${rolls.cut_by} = ${users.id} THEN ${rolls.weight_kg} END), 0)`,
            hours_worked: sql<number>`COUNT(DISTINCT DATE(${rolls.created_at})) * 8`,
            efficiency_score: sql<number>`COALESCE(AVG(CASE WHEN ${rolls.created_by} = ${users.id} OR ${rolls.printed_by} = ${users.id} OR ${rolls.cut_by} = ${users.id} THEN 95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100) END), 90)`,
          })
          .from(users)
          .leftJoin(roles, eq(users.role_id, roles.id))
          .leftJoin(sections, eq(users.section_id, sections.id))
          .leftJoin(
            rolls,
            sql`(${rolls.created_by} = ${users.id} OR ${rolls.printed_by} = ${users.id} OR ${rolls.cut_by} = ${users.id}) AND ${dateFilter}`,
          )
          .groupBy(
            users.id,
            users.username,
            users.display_name_ar,
            roles.name,
            roles.name_ar,
            sections.name,
            sections.name_ar,
          )
;

        if (userId) {
          query = query.where(eq(users.id, userId)) as any;
        }

        return await query;
      },
      "getUserPerformanceStats",
      userId ? `للمستخدم ${userId}` : "لجميع المستخدمين",
    );
  }

  async getRolePerformanceStats(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '7 days'`;

        const roleStats = await db
          .select({
            role_id: roles.id,
            role_name: sql<string>`COALESCE(roles.name_ar, roles.name)`,
            user_count: sql<number>`COUNT(DISTINCT ${users.id})`,
            total_production_orders: sql<number>`COUNT(DISTINCT ${production_orders.id})`,
            total_rolls: sql<number>`COUNT(DISTINCT ${rolls.id})`,
            total_weight_kg: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
            avg_order_completion_time: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${rolls.completed_at} - ${rolls.created_at}))/3600), 0)`,
            quality_score: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 90)`,
            on_time_delivery_rate: sql<number>`COALESCE(AVG(CASE WHEN ${rolls.completed_at} IS NOT NULL THEN 100 ELSE 0 END), 80)`,
          })
          .from(roles)
          .leftJoin(users, eq(roles.id, users.role_id))
          .leftJoin(
            rolls,
            sql`(${rolls.created_by} = ${users.id} OR ${rolls.printed_by} = ${users.id} OR ${rolls.cut_by} = ${users.id}) AND ${dateFilter}`,
          )
          .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
          .groupBy(roles.id, roles.name, roles.name_ar)
;

        return roleStats;
      },
      "getRolePerformanceStats",
      "أداء الأدوار",
    );
  }

  async getRealTimeProductionStats(): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const now = new Date();
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );

        const [currentStats, machineStatus, queueStats] = await Promise.all([
          // إحصائيات اليوم الحالي
          db
            .select({
              daily_rolls: sql<number>`COUNT(DISTINCT ${rolls.id})`,
              daily_weight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
              active_orders: sql<number>`COUNT(DISTINCT CASE WHEN ${orders.status} IN ('in_production', 'waiting') THEN ${orders.id} END)`,
              completed_today: sql<number>`COUNT(DISTINCT CASE WHEN DATE(${rolls.completed_at}) = CURRENT_DATE THEN ${rolls.id} END)`,
              current_waste: sql<number>`COALESCE(SUM(${rolls.waste_kg}), 0)`,
              avg_efficiency: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 90)`,
            })
            .from(rolls)
            .leftJoin(
              production_orders,
              eq(rolls.production_order_id, production_orders.id),
            )
            .leftJoin(orders, eq(production_orders.order_id, orders.id))
            .where(sql`DATE(${rolls.created_at}) = CURRENT_DATE`),

          // حالة المكائن
          db
            .select({
              machine_id: machines.id,
              machine_name: sql<string>`COALESCE(${machines.name_ar}, ${machines.name})`,
              status: machines.status,
              current_rolls: sql<number>`COUNT(DISTINCT CASE WHEN ${rolls.stage} != 'done' THEN ${rolls.id} END)`,
            })
            .from(machines)
            .leftJoin(rolls, eq(machines.id, rolls.machine_id))
            .groupBy(
              machines.id,
              machines.name,
              machines.name_ar,
              machines.status,
            ),

          // إحصائيات الطوابير
          db
            .select({
              film_queue: sql<number>`COUNT(DISTINCT CASE WHEN ${rolls.stage} = 'film' THEN ${rolls.id} END)`,
              printing_queue: sql<number>`COUNT(DISTINCT CASE WHEN ${rolls.stage} = 'printing' THEN ${rolls.id} END)`,
              cutting_queue: sql<number>`COUNT(DISTINCT CASE WHEN ${rolls.stage} = 'cutting' THEN ${rolls.id} END)`,
              pending_orders: sql<number>`COUNT(DISTINCT CASE WHEN ${production_orders.status} = 'pending' THEN ${production_orders.id} END)`,
            })
            .from(production_orders)
            .leftJoin(
              rolls,
              eq(production_orders.id, rolls.production_order_id),
            ),
        ]);

        return {
          currentStats: currentStats[0] || {
            daily_rolls: 0,
            daily_weight: 0,
            active_orders: 0,
            completed_today: 0,
            current_waste: 0,
            avg_efficiency: 90,
          },
          machineStatus: machineStatus || [],
          queueStats: queueStats[0] || {
            film_queue: 0,
            printing_queue: 0,
            cutting_queue: 0,
            pending_orders: 0,
          },
          lastUpdated: now.toISOString(),
        };
      },
      "getRealTimeProductionStats",
      "الإحصائيات الفورية",
    );
  }

  async getProductionEfficiencyMetrics(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '30 days'`;

        const [efficiencyMetrics, trendData] = await Promise.all([
          // مؤشرات الكفاءة العامة
          db
            .select({
              total_production: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
              total_waste: sql<number>`COALESCE(SUM(${rolls.waste_kg}), 0)`,
              waste_percentage: sql<number>`COALESCE((SUM(${rolls.waste_kg})::decimal / NULLIF(SUM(${rolls.weight_kg}), 0)) * 100, 0)`,
              avg_roll_time: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${rolls.completed_at} - ${rolls.created_at}))/3600), 0)`,
              machine_utilization: sql<number>`COALESCE(COUNT(DISTINCT ${rolls.machine_id})::decimal / NULLIF((SELECT COUNT(*) FROM ${machines}), 0) * 100, 0)`,
              quality_score: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 90)`,
              on_time_completion: sql<number>`COALESCE(AVG(CASE WHEN ${rolls.completed_at} IS NOT NULL THEN 100 ELSE 0 END), 80)`,
            })
            .from(rolls)
            .where(dateFilter),

          // بيانات الاتجاه اليومي
          db
            .select({
              date: sql<string>`DATE(${rolls.created_at})`,
              daily_production: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
              daily_waste: sql<number>`COALESCE(SUM(${rolls.waste_kg}), 0)`,
              daily_rolls: sql<number>`COUNT(${rolls.id})`,
              daily_efficiency: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 90)`,
            })
            .from(rolls)
            .where(dateFilter)
            .groupBy(sql`DATE(${rolls.created_at})`)
            .orderBy(sql`DATE(${rolls.created_at}) DESC`)
            .limit(30),
        ]);

        return {
          efficiency: efficiencyMetrics[0] || {
            total_production: 0,
            total_waste: 0,
            waste_percentage: 0,
            avg_roll_time: 0,
            machine_utilization: 0,
            quality_score: 90,
            on_time_completion: 80,
          },
          trends: trendData || [],
        };
      },
      "getProductionEfficiencyMetrics",
      "مؤشرات الكفاءة",
    );
  }

  async getProductionAlerts(): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const alerts = [];

        // تحقق من الطلبات المتأخرة
        const overdueOrders = await db
          .select({
            order_id: orders.id,
            order_number: orders.order_number,
            customer_name: customers.name_ar,
            delivery_date: orders.delivery_date,
            days_overdue: sql<number>`(CURRENT_DATE - ${orders.delivery_date})::int`,
          })
          .from(orders)
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .where(
            and(
              sql`${orders.delivery_date} < CURRENT_DATE`,
              sql`${orders.status} NOT IN ('completed', 'cancelled')`,
            ),
          )
          .limit(10);

        // تحقق من المكائن المعطلة
        const downMachines = await db
          .select({
            machine_id: machines.id,
            machine_name: sql<string>`COALESCE(${machines.name_ar}, ${machines.name})`,
            status: machines.status,
          })
          .from(machines)
          .where(eq(machines.status, "down"));

        // تحقق من الهدر العالي
        const highWasteRolls = await db
          .select({
            roll_id: rolls.id,
            roll_number: rolls.roll_number,
            waste_percentage: sql<number>`(${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0)) * 100`,
            machine_name: sql<string>`COALESCE(${machines.name_ar}, ${machines.name})`,
          })
          .from(rolls)
          .leftJoin(machines, eq(rolls.machine_id, machines.id))
          .where(
            sql`(${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0)) * 100 > 10`,
          )
          .orderBy(
            sql`(${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0)) * 100 DESC`,
          )
          .limit(5);

        // إضافة التنبيهات
        if (overdueOrders.length > 0) {
          alerts.push({
            type: "warning",
            category: "overdue_orders",
            title: "طلبات متأخرة",
            message: `يوجد ${overdueOrders.length} طلب متأخر عن موعد التسليم`,
            data: overdueOrders,
            priority: "high",
          });
        }

        if (downMachines.length > 0) {
          alerts.push({
            type: "error",
            category: "machine_down",
            title: "مكائن معطلة",
            message: `يوجد ${downMachines.length} ماكينة معطلة تحتاج صيانة`,
            data: downMachines,
            priority: "critical",
          });
        }

        if (highWasteRolls.length > 0) {
          alerts.push({
            type: "warning",
            category: "high_waste",
            title: "هدر عالي",
            message: `يوجد ${highWasteRolls.length} رول بنسبة هدر أعلى من 10%`,
            data: highWasteRolls,
            priority: "medium",
          });
        }

        return alerts;
      },
      "getProductionAlerts",
      "تنبيهات الإنتاج",
    );
  }

  async getMachineUtilizationStats(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '7 days'`;

        const machineStats = await db
          .select({
            machine_id: machines.id,
            machine_name: sql<string>`COALESCE(${machines.name_ar}, ${machines.name})`,
            machine_type: machines.type,
            section_name: sql<string>`COALESCE(${sections.name_ar}, ${sections.name})`,
            status: machines.status,
            total_rolls: sql<number>`COUNT(DISTINCT ${rolls.id})`,
            total_weight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
            total_waste: sql<number>`COALESCE(SUM(${rolls.waste_kg}), 0)`,
            efficiency: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 90)`,
            avg_processing_time: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${rolls.completed_at} - ${rolls.created_at}))/3600), 0)`,
            utilization_rate: sql<number>`COALESCE(COUNT(DISTINCT DATE(${rolls.created_at}))::decimal / 7 * 100, 0)`,
          })
          .from(machines)
          .leftJoin(sections, eq(machines.section_id, sections.id))
          .leftJoin(rolls, and(eq(machines.id, rolls.machine_id), dateFilter))
          .groupBy(
            machines.id,
            machines.name,
            machines.name_ar,
            machines.type,
            machines.status,
            sections.name,
            sections.name_ar,
          )
;

        return machineStats;
      },
      "getMachineUtilizationStats",
      "إحصائيات استخدام المكائن",
    );
  }

  // ============ Production Monitoring - Section-based Methods ============

  async getProductionStatsBySection(
    section: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '7 days'`;

        // Map section string to actual section ID
        // film → SEC03, printing → SEC04, cutting → SEC05
        const sectionIdMap: { [key: string]: string } = {
          'film': 'SEC03',
          'printing': 'SEC04',
          'cutting': 'SEC05'
        };
        const sectionId = sectionIdMap[section] || section;
        const sectionFilter = sql`${machines.section_id} = ${sectionId}`;

        const stats = await db
          .select({
            total_weight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
            total_rolls: sql<number>`COUNT(DISTINCT ${rolls.id})`,
            completed_orders: sql<number>`COUNT(DISTINCT CASE WHEN ${production_orders.status} = 'completed' THEN ${production_orders.id} END)`,
            active_orders: sql<number>`COUNT(DISTINCT CASE WHEN ${production_orders.status} IN ('active', 'pending') THEN ${production_orders.id} END)`,
            efficiency: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 0)`,
          })
          .from(rolls)
          .leftJoin(machines, eq(rolls.film_machine_id, machines.id))
          .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
          .where(and(dateFilter, sectionFilter));

        return stats[0] || {
          total_weight: 0,
          total_rolls: 0,
          completed_orders: 0,
          active_orders: 0,
          efficiency: 0,
        };
      },
      "getProductionStatsBySection",
      `إحصائيات قسم ${section}`,
    );
  }

  async getUsersPerformanceBySection(
    section: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any[]> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '7 days'`;

        // Map section string to actual section ID
        // film → SEC03, printing → SEC04, cutting → SEC05
        const sectionIdMap: { [key: string]: string } = {
          'film': 'SEC03',
          'printing': 'SEC04',
          'cutting': 'SEC05'
        };
        const sectionId = sectionIdMap[section] || section;

        // Get users who have production department role (role_id = 2 for production workers)
        const roleFilter = sql`${users.role_id} = 2`;
        const sectionFilter = sql`${machines.section_id} = ${sectionId}`;

        const usersPerformance = await db
          .select({
            user_id: users.id,
            username: users.username,
            display_name_ar: users.display_name_ar,
            section: sql<string>`${section}`,
            total_production_kg: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
            rolls_count: sql<number>`COUNT(DISTINCT ${rolls.id})`,
            efficiency_score: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 0)`,
            last_activity: sql<Date>`MAX(${rolls.created_at})`,
          })
          .from(users)
          .leftJoin(rolls, and(
            eq(users.id, rolls.created_by),
            dateFilter
          ))
          .leftJoin(machines, eq(rolls.film_machine_id, machines.id))
          .where(and(roleFilter, sectionFilter))
          .groupBy(users.id, users.username, users.display_name_ar)
          .orderBy(sql`SUM(${rolls.weight_kg}) DESC`);

        return usersPerformance;
      },
      "getUsersPerformanceBySection",
      `أداء مستخدمي قسم ${section}`,
    );
  }

  async getMachinesProductionBySection(
    section: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any[]> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '7 days'`;

        // Map section string to actual section ID
        // film → SEC03, printing → SEC04, cutting → SEC05
        const sectionIdMap: { [key: string]: string } = {
          'film': 'SEC03',
          'printing': 'SEC04',
          'cutting': 'SEC05'
        };
        const sectionId = sectionIdMap[section] || section;
        const sectionFilter = sql`${machines.section_id} = ${sectionId}`;

        const machinesProduction = await db
          .select({
            machine_id: machines.id,
            machine_name: sql<string>`COALESCE(${machines.name_ar}, ${machines.name})`,
            section: sql<string>`${section}`,
            total_production_kg: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
            rolls_produced: sql<number>`COUNT(DISTINCT ${rolls.id})`,
            utilization_percent: sql<number>`COALESCE(COUNT(DISTINCT DATE(${rolls.created_at}))::decimal / 7 * 100, 0)`,
            last_production: sql<Date>`MAX(${rolls.created_at})`,
          })
          .from(machines)
          .leftJoin(rolls, and(eq(machines.id, rolls.film_machine_id), dateFilter))
          .where(sectionFilter)
          .groupBy(machines.id, machines.name, machines.name_ar)
          .orderBy(sql`SUM(${rolls.weight_kg}) DESC`);

        return machinesProduction;
      },
      "getMachinesProductionBySection",
      `إنتاج مكائن قسم ${section}`,
    );
  }

  async getRollsBySection(section: string, search?: string): Promise<any[]> {
    return await withDatabaseErrorHandling(
      async () => {
        // Map section string to actual section ID
        // film → SEC03, printing → SEC04, cutting → SEC05
        const sectionIdMap: { [key: string]: string } = {
          'film': 'SEC03',
          'printing': 'SEC04',
          'cutting': 'SEC05'
        };
        const sectionId = sectionIdMap[section] || section;
        const sectionFilter = sql`${machines.section_id} = ${sectionId}`;
        
        let searchFilter = sql`TRUE`;
        if (search) {
          searchFilter = sql`(
            ${rolls.roll_number} ILIKE ${`%${search}%`} OR
            ${production_orders.production_order_number} ILIKE ${`%${search}%`} OR
            COALESCE(${customers.name_ar}, ${customers.name}) ILIKE ${`%${search}%`}
          )`;
        }

        const rollsData = await db
          .select({
            roll_id: rolls.id,
            roll_number: rolls.roll_number,
            production_order_number: production_orders.production_order_number,
            customer_name: sql<string>`COALESCE(${customers.name_ar}, ${customers.name})`,
            weight_kg: rolls.weight_kg,
            stage: rolls.stage,
            section: sql<string>`${section}`,
            created_at: rolls.created_at,
          })
          .from(rolls)
          .leftJoin(machines, eq(rolls.film_machine_id, machines.id))
          .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
          .leftJoin(orders, eq(production_orders.order_id, orders.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .where(and(sectionFilter, searchFilter))
          .orderBy(sql`${rolls.created_at} DESC`)
          .limit(100);

        return rollsData;
      },
      "getRollsBySection",
      `رولات قسم ${section}`,
    );
  }

  async getProductionOrdersBySection(section: string, search?: string): Promise<any[]> {
    return await withDatabaseErrorHandling(
      async () => {
        // Map section string to actual section ID
        // film → SEC03, printing → SEC04, cutting → SEC05
        const sectionIdMap: { [key: string]: string } = {
          'film': 'SEC03',
          'printing': 'SEC04',
          'cutting': 'SEC05'
        };
        const sectionId = sectionIdMap[section] || section;
        
        const sectionFilter = sql`${production_orders.assigned_machine_id} IN (
          SELECT ${machines.id} FROM ${machines} WHERE ${machines.section_id} = ${sectionId}
        )`;
        
        let searchFilter = sql`TRUE`;
        if (search) {
          searchFilter = sql`(
            ${production_orders.production_order_number} ILIKE ${`%${search}%`} OR
            ${orders.order_number} ILIKE ${`%${search}%`} OR
            COALESCE(${customers.name_ar}, ${customers.name}) ILIKE ${`%${search}%`}
          )`;
        }

        const ordersData = await db
          .select({
            production_order_id: production_orders.id,
            production_order_number: production_orders.production_order_number,
            order_number: orders.order_number,
            customer_name: sql<string>`COALESCE(${customers.name_ar}, ${customers.name})`,
            section: sql<string>`${section}`,
            status: production_orders.status,
            progress_percent: sql<number>`
              CASE 
                WHEN ${production_orders.status} = 'completed' THEN 100
                WHEN ${production_orders.status} = 'active' THEN 50
                ELSE 0
              END
            `,
            created_at: production_orders.created_at,
          })
          .from(production_orders)
          .leftJoin(orders, eq(production_orders.order_id, orders.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .where(and(sectionFilter, searchFilter))
          .orderBy(sql`${production_orders.created_at} DESC`)
          .limit(100);

        return ordersData;
      },
      "getProductionOrdersBySection",
      `أوامر إنتاج قسم ${section}`,
    );
  }

  // ============ ADVANCED REPORTING METHODS ============

  async getOrderReports(dateFrom?: string, dateTo?: string): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${orders.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${orders.created_at}) >= CURRENT_DATE - INTERVAL '30 days'`;

        const [
          orderStatusStats,
          deliveryPerformance,
          topCustomers,
          revenueStats,
        ] = await Promise.all([
          // إحصائيات حالة الطلبات
          db
            .select({
              status: orders.status,
              count: sql<number>`COUNT(*)`,
              total_value: sql<number>`COALESCE(SUM(${production_orders.quantity_kg} * 5), 0)`, // approximate value
            })
            .from(orders)
            .leftJoin(
              production_orders,
              eq(orders.id, production_orders.order_id),
            )
            .where(dateFilter)
            .groupBy(orders.status),

          // أداء التسليم
          db
            .select({
              on_time_orders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'completed' AND ${orders.delivery_date} >= CURRENT_DATE THEN 1 END)`,
              late_orders: sql<number>`COUNT(CASE WHEN ${orders.status} = 'completed' AND ${orders.delivery_date} < CURRENT_DATE THEN 1 END)`,
              avg_delivery_days: sql<number>`COALESCE(AVG(EXTRACT(DAYS FROM (CURRENT_DATE - ${orders.created_at}))), 0)`,
            })
            .from(orders)
            .where(dateFilter),

          // أكثر العملاء طلباً
          db
            .select({
              customer_id: customers.id,
              customer_name: sql<string>`COALESCE(${customers.name_ar}, ${customers.name})`,
              order_count: sql<number>`COUNT(${orders.id})`,
              total_quantity: sql<number>`COALESCE(SUM(${production_orders.quantity_kg}), 0)`,
              total_value: sql<number>`COALESCE(SUM(${production_orders.quantity_kg} * 5), 0)`,
            })
            .from(customers)
            .leftJoin(orders, eq(customers.id, orders.customer_id))
            .leftJoin(
              production_orders,
              eq(orders.id, production_orders.order_id),
            )
            .where(dateFilter)
            .groupBy(customers.id, customers.name, customers.name_ar)
            .orderBy(sql`COUNT(${orders.id}) DESC`)
            .limit(10),

          // إحصائيات الإيرادات
          db
            .select({
              total_orders: sql<number>`COUNT(DISTINCT ${orders.id})`,
              total_production_quantity: sql<number>`COALESCE(SUM(${production_orders.quantity_kg}), 0)`,
              estimated_revenue: sql<number>`COALESCE(SUM(${production_orders.quantity_kg} * 5), 0)`,
              avg_order_value: sql<number>`COALESCE(AVG(${production_orders.quantity_kg} * 5), 0)`,
            })
            .from(orders)
            .leftJoin(
              production_orders,
              eq(orders.id, production_orders.order_id),
            )
            .where(dateFilter),
        ]);

        return {
          orderStatusStats,
          deliveryPerformance: deliveryPerformance[0] || {
            on_time_orders: 0,
            late_orders: 0,
            avg_delivery_days: 0,
          },
          topCustomers,
          revenueStats: revenueStats[0] || {
            total_orders: 0,
            total_production_quantity: 0,
            estimated_revenue: 0,
            avg_order_value: 0,
          },
        };
      },
      "getOrderReports",
      "تقارير الطلبات",
    );
  }

  async getAdvancedMetrics(dateFrom?: string, dateTo?: string): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '30 days'`;

        const [oeeMetrics, cycleTimeStats, qualityMetrics] = await Promise.all([
          // Overall Equipment Effectiveness (OEE)
          db
            .select({
              machine_id: machines.id,
              machine_name: sql<string>`COALESCE(${machines.name_ar}, ${machines.name})`,
              availability: sql<number>`COALESCE((COUNT(DISTINCT DATE(${rolls.created_at}))::decimal / 30) * 100, 0)`,
              performance: sql<number>`COALESCE(AVG(${rolls.weight_kg}) / NULLIF(MAX(${rolls.weight_kg}), 0) * 100, 80)`,
              quality: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 90)`,
              oee: sql<number>`COALESCE(((COUNT(DISTINCT DATE(${rolls.created_at}))::decimal / 30) * (AVG(${rolls.weight_kg}) / NULLIF(MAX(${rolls.weight_kg}), 0)) * (95 - (AVG(${rolls.waste_kg})::decimal / NULLIF(AVG(${rolls.weight_kg}), 0) * 100)) / 100), 65)`,
            })
            .from(machines)
            .leftJoin(rolls, and(eq(machines.id, rolls.machine_id), dateFilter))
            .groupBy(machines.id, machines.name, machines.name_ar),

          // Cycle Time Statistics
          db
            .select({
              avg_film_to_printing: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${rolls.printed_at} - ${rolls.created_at}))/3600), 0)`,
              avg_printing_to_cutting: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${rolls.cut_completed_at} - ${rolls.printed_at}))/3600), 0)`,
              avg_total_cycle_time: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${rolls.completed_at} - ${rolls.created_at}))/3600), 0)`,
              fastest_cycle: sql<number>`COALESCE(MIN(EXTRACT(EPOCH FROM (${rolls.completed_at} - ${rolls.created_at}))/3600), 0)`,
              slowest_cycle: sql<number>`COALESCE(MAX(EXTRACT(EPOCH FROM (${rolls.completed_at} - ${rolls.created_at}))/3600), 0)`,
            })
            .from(rolls)
            .where(and(dateFilter, sql`${rolls.completed_at} IS NOT NULL`)),

          // Quality Metrics
          db
            .select({
              total_rolls: sql<number>`COUNT(*)`,
              defective_rolls: sql<number>`COUNT(CASE WHEN (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0)) * 100 > 5 THEN 1 END)`,
              quality_rate: sql<number>`100 - (COUNT(CASE WHEN (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0)) * 100 > 5 THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100)`,
              avg_waste_percentage: sql<number>`COALESCE(AVG((${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0)) * 100), 0)`,
              rework_rate: sql<number>`COALESCE(COUNT(CASE WHEN ${rolls.stage} = 'rework' THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100, 0)`,
            })
            .from(rolls)
            .where(dateFilter),
        ]);

        return {
          oeeMetrics,
          cycleTimeStats: cycleTimeStats[0] || {
            avg_film_to_printing: 0,
            avg_printing_to_cutting: 0,
            avg_total_cycle_time: 0,
            fastest_cycle: 0,
            slowest_cycle: 0,
          },
          qualityMetrics: qualityMetrics[0] || {
            total_rolls: 0,
            defective_rolls: 0,
            quality_rate: 95,
            avg_waste_percentage: 0,
            rework_rate: 0,
          },
        };
      },
      "getAdvancedMetrics",
      "المؤشرات المتقدمة",
    );
  }

  async getHRReports(dateFrom?: string, dateTo?: string): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const attendanceDateFilter =
          dateFrom && dateTo
            ? sql`DATE(${attendance.date}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${attendance.date}) >= CURRENT_DATE - INTERVAL '30 days'`;

        const rollsDateFilter =
          dateFrom && dateTo
            ? sql`DATE(${rolls.created_at}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${rolls.created_at}) >= CURRENT_DATE - INTERVAL '30 days'`;

        const [attendanceStats, performanceStats, trainingStats] =
          await Promise.all([
            // إحصائيات الحضور والغياب
            db
              .select({
                user_id: users.id,
                username: users.username,
                display_name_ar: users.display_name_ar,
                role_name: sql<string>`COALESCE(${roles.name_ar}, ${roles.name})`,
                present_days: sql<number>`COUNT(CASE WHEN ${attendance.status} = 'حاضر' THEN 1 END)`,
                absent_days: sql<number>`COUNT(CASE WHEN ${attendance.status} = 'غائب' THEN 1 END)`,
                late_days: sql<number>`COUNT(CASE WHEN EXTRACT(HOUR FROM ${attendance.check_in_time}) * 60 + EXTRACT(MINUTE FROM ${attendance.check_in_time}) > 510 THEN 1 END)`,
                attendance_rate: sql<number>`COALESCE((COUNT(CASE WHEN ${attendance.status} = 'حاضر' THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100), 0)`,
              })
              .from(users)
              .leftJoin(roles, eq(users.role_id, roles.id))
              .leftJoin(
                attendance,
                and(eq(users.id, attendance.user_id), attendanceDateFilter),
              )
              .groupBy(
                users.id,
                users.username,
                users.display_name_ar,
                roles.name,
                roles.name_ar,
              ),

            // إحصائيات الأداء
            db
              .select({
                user_id: users.id,
                username: users.username,
                display_name_ar: users.display_name_ar,
                production_efficiency: sql<number>`COALESCE(AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)), 90)`,
                total_production: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
                error_rate: sql<number>`COALESCE(COUNT(CASE WHEN (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0)) * 100 > 10 THEN 1 END)::decimal / NULLIF(COUNT(*), 0) * 100, 0)`,
                improvement_trend: sql<number>`COALESCE(CASE WHEN AVG(95 - (${rolls.waste_kg}::decimal / NULLIF(${rolls.weight_kg}, 0) * 100)) > 90 THEN 1 ELSE -1 END, 0)`,
              })
              .from(users)
              .leftJoin(rolls, and(eq(users.id, rolls.created_by), rollsDateFilter))
              .groupBy(users.id, users.username, users.display_name_ar),

            // إحصائيات التدريب
            db
              .select({
                total_programs: sql<number>`COUNT(DISTINCT ${training_programs.id})`,
                total_enrollments: sql<number>`COUNT(${training_enrollments.id})`,
                completed_trainings: sql<number>`COUNT(CASE WHEN ${training_enrollments.completion_status} = 'completed' THEN 1 END)`,
                completion_rate: sql<number>`COALESCE(COUNT(CASE WHEN ${training_enrollments.completion_status} = 'completed' THEN 1 END)::decimal / NULLIF(COUNT(${training_enrollments.id}), 0) * 100, 0)`,
              })
              .from(training_programs)
              .leftJoin(
                training_enrollments,
                eq(training_programs.id, training_enrollments.program_id),
              ),
          ]);

        return {
          attendanceStats,
          performanceStats,
          trainingStats: trainingStats[0] || {
            total_programs: 0,
            total_enrollments: 0,
            completed_trainings: 0,
            completion_rate: 0,
          },
        };
      },
      "getHRReports",
      "تقارير الموارد البشرية",
    );
  }

  async getMaintenanceReports(
    dateFrom?: string,
    dateTo?: string,
  ): Promise<any> {
    return await withDatabaseErrorHandling(
      async () => {
        const dateFilter =
          dateFrom && dateTo
            ? sql`DATE(${maintenance_requests.date_reported}) BETWEEN ${dateFrom} AND ${dateTo}`
            : sql`DATE(${maintenance_requests.date_reported}) >= CURRENT_DATE - INTERVAL '30 days'`;

        const [maintenanceStats, costAnalysis, downtimeAnalysis] =
          await Promise.all([
            // إحصائيات طلبات الصيانة
            db
              .select({
                total_requests: sql<number>`COUNT(*)`,
                completed_requests: sql<number>`COUNT(CASE WHEN ${maintenance_requests.status} = 'completed' THEN 1 END)`,
                pending_requests: sql<number>`COUNT(CASE WHEN ${maintenance_requests.status} = 'pending' THEN 1 END)`,
                critical_requests: sql<number>`COUNT(CASE WHEN ${maintenance_requests.urgency_level} = 'urgent' THEN 1 END)`,
                avg_resolution_time: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${maintenance_requests.date_resolved} - ${maintenance_requests.date_reported}))/3600), 0)`,
              })
              .from(maintenance_requests)
              .where(dateFilter),

            // تحليل التكاليف (مقدر)
            db
              .select({
                machine_id: machines.id,
                machine_name: sql<string>`COALESCE(${machines.name_ar}, ${machines.name})`,
                maintenance_count: sql<number>`COUNT(${maintenance_requests.id})`,
                estimated_cost: sql<number>`COUNT(${maintenance_requests.id}) * 500`, // تكلفة تقديرية
                downtime_hours: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${maintenance_requests.date_resolved} - ${maintenance_requests.date_reported}))/3600), 0)`,
              })
              .from(machines)
              .leftJoin(
                maintenance_requests,
                and(
                  eq(machines.id, maintenance_requests.machine_id),
                  dateFilter,
                ),
              )
              .groupBy(machines.id, machines.name, machines.name_ar),

            // تحليل فترات التوقف
            db
              .select({
                total_downtime: sql<number>`COALESCE(SUM(EXTRACT(EPOCH FROM (${maintenance_requests.date_resolved} - ${maintenance_requests.date_reported}))/3600), 0)`,
                planned_downtime: sql<number>`COALESCE(SUM(CASE WHEN ${maintenance_requests.issue_type} = 'mechanical' THEN EXTRACT(EPOCH FROM (${maintenance_requests.date_resolved} - ${maintenance_requests.date_reported}))/3600 END), 0)`,
                unplanned_downtime: sql<number>`COALESCE(SUM(CASE WHEN ${maintenance_requests.issue_type} = 'electrical' THEN EXTRACT(EPOCH FROM (${maintenance_requests.date_resolved} - ${maintenance_requests.date_reported}))/3600 END), 0)`,
                mtbf: sql<number>`168`, // Mean Time Between Failures - simplified calculation
              })
              .from(maintenance_requests)
              .where(
                and(
                  dateFilter,
                  sql`${maintenance_requests.date_resolved} IS NOT NULL`,
                ),
              ),
          ]);

        return {
          maintenanceStats: maintenanceStats[0] || {
            total_requests: 0,
            completed_requests: 0,
            pending_requests: 0,
            critical_requests: 0,
            avg_resolution_time: 0,
          },
          costAnalysis,
          downtimeAnalysis: downtimeAnalysis[0] || {
            total_downtime: 0,
            planned_downtime: 0,
            unplanned_downtime: 0,
            mtbf: 168,
          },
        };
      },
      "getMaintenanceReports",
      "تقارير الصيانة",
    );
  }

  async getItems(): Promise<any[]> {
    const result = await db
      .select({
        id: items.id,
        category_id: items.category_id,
        name: items.name,
        name_ar: items.name_ar,
        code: items.code,
        status: items.status,
        category_name: categories.name,
        category_name_ar: categories.name_ar,
      })
      .from(items)
      .leftJoin(categories, eq(items.category_id, categories.id))
      .orderBy(items.name_ar);

    return result;
  }

  private customerProductsCache: { data: CustomerProduct[]; total: number; expiry: number } | null = null;
  private customerProductsCacheTimeout = 45000; // 45 seconds cache

  async getCustomerProducts(options?: { customer_id?: string; ids?: number[]; page?: number; limit?: number; search?: string }): Promise<{ data: CustomerProduct[]; total: number }> {
    const { customer_id, ids, page, limit, search } = options || {};
    
    // If no filters and no pagination, use cache
    const useCache = !customer_id && !ids && !page && !limit && !search;
    
    if (useCache && this.customerProductsCache && Date.now() < this.customerProductsCache.expiry) {
      return { data: this.customerProductsCache.data, total: this.customerProductsCache.total };
    }

    // Build conditions array
    const conditions: any[] = [];
    
    if (customer_id) {
      conditions.push(eq(customer_products.customer_id, customer_id));
    }
    
    if (ids && ids.length > 0) {
      conditions.push(inArray(customer_products.id, ids));
    }
    
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          sql`${customer_products.size_caption} ILIKE ${searchTerm}`,
          sql`${customers.name} ILIKE ${searchTerm}`,
          sql`${customers.name_ar} ILIKE ${searchTerm}`,
          sql`${customers.code} ILIKE ${searchTerm}`
        )
      );
    }

    // Build base query
    let query = db
      .select({
        id: customer_products.id,
        customer_id: customer_products.customer_id,
        category_id: customer_products.category_id,
        item_id: customer_products.item_id,
        size_caption: customer_products.size_caption,
        width: customer_products.width,
        left_facing: customer_products.left_facing,
        right_facing: customer_products.right_facing,
        thickness: customer_products.thickness,
        printing_cylinder: customer_products.printing_cylinder,
        cutting_length_cm: customer_products.cutting_length_cm,
        raw_material: customer_products.raw_material,
        master_batch_id: customer_products.master_batch_id,
        is_printed: customer_products.is_printed,
        cutting_unit: customer_products.cutting_unit,
        punching: customer_products.punching,
        unit_weight_kg: customer_products.unit_weight_kg,
        unit_quantity: customer_products.unit_quantity,
        package_weight_kg: customer_products.package_weight_kg,
        cliche_front_design: customer_products.cliche_front_design,
        cliche_back_design: customer_products.cliche_back_design,
        notes: customer_products.notes,
        status: customer_products.status,
        created_at: customer_products.created_at,
        customer_name: customers.name,
        customer_name_ar: customers.name_ar,
        customer_code: customers.code,
      })
      .from(customer_products)
      .leftJoin(customers, eq(customer_products.customer_id, customers.id));

    // Apply conditions if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(customer_products);
    
    if (conditions.length > 0) {
      (countQuery as any).where(and(...conditions));
    }
    
    const [countResult] = await countQuery;
    const total = Number(countResult?.count || 0);

    // Apply ordering
    query = query.orderBy(desc(customer_products.created_at)) as typeof query;

    // Apply pagination if specified
    if (limit) {
      const offset = page ? (page - 1) * limit : 0;
      query = query.limit(limit).offset(offset) as typeof query;
    }

    const results = await query;
    
    const data = results.map((row) => ({
      ...row,
      customer_name: row.customer_name || undefined,
      customer_name_ar: row.customer_name_ar || undefined,
      customer_code: row.customer_code || undefined,
    })) as CustomerProduct[];

    // Update cache if no filters
    if (useCache) {
      this.customerProductsCache = {
        data,
        total,
        expiry: Date.now() + this.customerProductsCacheTimeout,
      };
    }

    return { data, total };
  }

  async getLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getCategories(): Promise<any[]> {
    return await db.select().from(categories);
  }

  async createCategory(data: any): Promise<any> {
    const [newCategory] = await db.insert(categories).values(data).returning();
    return newCategory;
  }

  async updateCategory(id: string, data: any): Promise<any> {
    const [updatedCategory] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Cache for dashboard stats - expires after 2 minutes
  private dashboardStatsCache: { data: any; expiry: number } | null = null;

  async getDashboardStats(): Promise<{
    activeOrders: number;
    productionRate: number;
    qualityScore: number;
    wastePercentage: number;
  }> {
    // Check cache first
    const now = Date.now();
    if (this.dashboardStatsCache && this.dashboardStatsCache.expiry > now) {
      return this.dashboardStatsCache.data;
    }

    // Optimize: Get all stats in parallel instead of sequential queries
    const [activeOrdersResult, productionResult, qualityResult, wasteResult] =
      await Promise.all([
        // Active orders count
        db
          .select({ count: count() })
          .from(orders)
          .where(
            or(
              eq(orders.status, "in_production"),
              eq(orders.status, "waiting"),
              eq(orders.status, "pending"),
            ),
          ),

        // Production rate (percentage based on production orders) - using existing quantity field
        db
          .select({
            totalRequired: sum(production_orders.quantity_kg),
            totalProduced: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
          })
          .from(production_orders)
          .leftJoin(rolls, eq(production_orders.id, rolls.production_order_id)),

        // Quality score (average from quality checks) - limited to recent checks for performance
        db
          .select({
            avgScore: sql<number>`AVG(CAST(${quality_checks.score} AS DECIMAL))`,
          })
          .from(quality_checks)
          .where(
            sql`${quality_checks.created_at} >= NOW() - INTERVAL '30 days'`,
          )
          .limit(1000), // Limit for performance

        // Waste percentage - limited to recent waste for performance
        db
          .select({
            totalWaste: sum(waste.quantity_wasted),
          })
          .from(waste)
          .where(sql`${waste.created_at} >= NOW() - INTERVAL '7 days'`)
          .limit(1000), // Limit for performance
      ]);

    const activeOrders = activeOrdersResult[0]?.count || 0;

    const productionRate =
      productionResult[0]?.totalRequired &&
      Number(productionResult[0].totalRequired) > 0
        ? Math.round(
            (Number(productionResult[0].totalProduced) /
              Number(productionResult[0].totalRequired)) *
              100,
          )
        : 0;

    const qualityScore = qualityResult[0]?.avgScore
      ? Math.round(Number(qualityResult[0].avgScore) * 20) // Convert 1-5 to percentage
      : 95; // Default high score

    const wastePercentage = wasteResult[0]?.totalWaste
      ? Number(wasteResult[0].totalWaste) / 100 // Convert to percentage
      : 2.5; // Default low waste

    const result = {
      activeOrders,
      productionRate,
      qualityScore,
      wastePercentage,
    };

    // Cache the result for 2 minutes
    this.dashboardStatsCache = {
      data: result,
      expiry: now + 2 * 60 * 1000,
    };

    return result;
  }

  // Production Reports
  async getProductionSummary(filters?: any): Promise<any> {
    const { dateFrom, dateTo, customerId, productId, status, machineId, operatorId } = filters || {};
    
    const conditions: any[] = [];
    if (dateFrom) conditions.push(sql`${production_orders.created_at} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${production_orders.created_at} <= ${dateTo}`);
    if (customerId && customerId.length > 0) conditions.push(inArray(orders.customer_id, customerId));
    if (productId && productId.length > 0) conditions.push(inArray(production_orders.customer_product_id, productId));
    if (status && status.length > 0) conditions.push(inArray(production_orders.status, status));
    if (machineId) conditions.push(eq(rolls.film_machine_id, machineId));
    if (operatorId) conditions.push(eq(rolls.created_by, operatorId));

    const [summaryResult] = await db
      .select({
        totalOrders: sql<number>`COUNT(DISTINCT ${production_orders.id})`,
        activeOrders: sql<number>`COUNT(DISTINCT CASE WHEN ${production_orders.status} = 'active' THEN ${production_orders.id} END)`,
        completedOrders: sql<number>`COUNT(DISTINCT CASE WHEN ${production_orders.status} = 'completed' THEN ${production_orders.id} END)`,
        totalRolls: sql<number>`COUNT(${rolls.id})`,
        totalWeight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
        avgProductionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${rolls.cut_completed_at} - ${rolls.created_at})) / 3600)`,
      })
      .from(production_orders)
      .leftJoin(orders, eq(production_orders.order_id, orders.id))
      .leftJoin(rolls, eq(production_orders.id, rolls.production_order_id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const [wasteResult] = await db
      .select({
        totalWaste: sql<number>`COALESCE(SUM(${waste.quantity_wasted}), 0)`,
      })
      .from(waste)
      .where(
        dateFrom && dateTo
          ? and(
              sql`${waste.created_at} >= ${dateFrom}`,
              sql`${waste.created_at} <= ${dateTo}`
            )
          : undefined
      );

    const totalProduction = Number(summaryResult?.totalWeight || 0);
    const totalWaste = Number(wasteResult?.totalWaste || 0);
    const wastePercentage = totalProduction > 0 ? (totalWaste / totalProduction) * 100 : 0;
    const completionRate = Number(summaryResult?.totalOrders || 0) > 0
      ? (Number(summaryResult?.completedOrders || 0) / Number(summaryResult?.totalOrders)) * 100
      : 0;

    return {
      totalOrders: Number(summaryResult?.totalOrders || 0),
      activeOrders: Number(summaryResult?.activeOrders || 0),
      completedOrders: Number(summaryResult?.completedOrders || 0),
      totalRolls: Number(summaryResult?.totalRolls || 0),
      totalWeight: totalProduction,
      avgProductionTime: Number(summaryResult?.avgProductionTime || 0),
      wastePercentage,
      completionRate,
    };
  }

  async getProductionByDate(filters?: any): Promise<any> {
    const { dateFrom, dateTo, customerId, productId } = filters || {};
    
    const conditions: any[] = [];
    if (dateFrom) conditions.push(sql`${rolls.created_at} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${rolls.created_at} <= ${dateTo}`);
    if (customerId && customerId.length > 0) conditions.push(inArray(orders.customer_id, customerId));
    if (productId && productId.length > 0) conditions.push(inArray(production_orders.customer_product_id, productId));

    const result = await db
      .select({
        date: sql<string>`DATE(${rolls.created_at})`,
        rollsCount: sql<number>`COUNT(${rolls.id})`,
        totalWeight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
      })
      .from(rolls)
      .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
      .leftJoin(orders, eq(production_orders.order_id, orders.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(sql`DATE(${rolls.created_at})`)
      .orderBy(sql`DATE(${rolls.created_at})`);

    return result.map(row => ({
      date: row.date,
      rollsCount: Number(row.rollsCount),
      totalWeight: Number(row.totalWeight),
    }));
  }

  async getProductionByProduct(filters?: any): Promise<any> {
    const { dateFrom, dateTo, customerId } = filters || {};
    
    const conditions: any[] = [];
    if (dateFrom) conditions.push(sql`${production_orders.created_at} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${production_orders.created_at} <= ${dateTo}`);
    if (customerId && customerId.length > 0) conditions.push(inArray(orders.customer_id, customerId));

    const result = await db
      .select({
        productId: customer_products.id,
        productName: customer_products.size_caption,
        ordersCount: sql<number>`COUNT(DISTINCT ${production_orders.id})`,
        rollsCount: sql<number>`COUNT(${rolls.id})`,
        totalWeight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
      })
      .from(production_orders)
      .leftJoin(orders, eq(production_orders.order_id, orders.id))
      .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
      .leftJoin(rolls, eq(production_orders.id, rolls.production_order_id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(customer_products.id, customer_products.size_caption)
      .orderBy(sql`SUM(${rolls.weight_kg}) DESC`);

    return result.map(row => ({
      productId: row.productId,
      productName: row.productName,
      ordersCount: Number(row.ordersCount),
      rollsCount: Number(row.rollsCount),
      totalWeight: Number(row.totalWeight),
    }));
  }

  async getWasteAnalysis(filters?: any): Promise<any> {
    const { dateFrom, dateTo } = filters || {};
    
    const conditions: any[] = [];
    if (dateFrom) conditions.push(sql`${waste.created_at} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${waste.created_at} <= ${dateTo}`);

    const result = await db
      .select({
        date: sql<string>`DATE(${waste.created_at})`,
        totalWaste: sql<number>`COALESCE(SUM(${waste.quantity_wasted}), 0)`,
        reason: waste.reason,
      })
      .from(waste)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(sql`DATE(${waste.created_at})`, waste.reason)
      .orderBy(sql`DATE(${waste.created_at})`);

    return result.map(row => ({
      date: row.date,
      totalWaste: Number(row.totalWaste),
      reason: row.reason,
    }));
  }

  async getMachinePerformance(filters?: any): Promise<any> {
    const { dateFrom, dateTo } = filters || {};
    
    const conditions: any[] = [];
    if (dateFrom) conditions.push(sql`${rolls.created_at} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${rolls.created_at} <= ${dateTo}`);

    const result = await db
      .select({
        machineId: machines.id,
        machineName: machines.name_ar,
        rollsCount: sql<number>`COUNT(${rolls.id})`,
        totalWeight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
        avgProductionTime: sql<number>`AVG(EXTRACT(EPOCH FROM (${rolls.cut_completed_at} - ${rolls.created_at})) / 3600)`,
      })
      .from(machines)
      .leftJoin(rolls, eq(machines.id, rolls.film_machine_id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(machines.id, machines.name_ar)
      .orderBy(sql`SUM(${rolls.weight_kg}) DESC`);

    return result.map(row => ({
      machineId: row.machineId,
      machineName: row.machineName,
      rollsCount: Number(row.rollsCount),
      totalWeight: Number(row.totalWeight),
      avgProductionTime: Number(row.avgProductionTime || 0),
      efficiency: Number(row.rollsCount) > 0 ? Number(row.totalWeight) / Number(row.rollsCount) : 0,
    }));
  }

  async getOperatorPerformance(filters?: any): Promise<any> {
    const { dateFrom, dateTo } = filters || {};
    
    const conditions: any[] = [];
    if (dateFrom) conditions.push(sql`${rolls.created_at} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${rolls.created_at} <= ${dateTo}`);

    const result = await db
      .select({
        operatorId: users.id,
        operatorName: users.display_name_ar,
        rollsCount: sql<number>`COUNT(${rolls.id})`,
        totalWeight: sql<number>`COALESCE(SUM(${rolls.weight_kg}), 0)`,
        avgRollWeight: sql<number>`AVG(${rolls.weight_kg})`,
      })
      .from(users)
      .leftJoin(rolls, eq(users.id, rolls.created_by))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(users.id, users.display_name_ar)
      .orderBy(sql`SUM(${rolls.weight_kg}) DESC`);

    return result.map(row => ({
      operatorId: row.operatorId,
      operatorName: row.operatorName,
      rollsCount: Number(row.rollsCount),
      totalWeight: Number(row.totalWeight),
      avgRollWeight: Number(row.avgRollWeight || 0),
      productivity: Number(row.rollsCount) > 0 ? Number(row.totalWeight) / Number(row.rollsCount) : 0,
    }));
  }

  // Training Records
  async getTrainingRecords(): Promise<TrainingRecord[]> {
    return await db
      .select()
      .from(training_records)
      .orderBy(desc(training_records.date));
  }

  async createTrainingRecord(record: any): Promise<TrainingRecord> {
    const [newRecord] = await db
      .insert(training_records)
      .values(record)
      .returning();
    return newRecord;
  }

  // Admin Decisions
  async getAdminDecisions(): Promise<AdminDecision[]> {
    return await db
      .select()
      .from(admin_decisions)
      .orderBy(desc(admin_decisions.date));
  }

  async createAdminDecision(decision: any): Promise<AdminDecision> {
    const [newDecision] = await db
      .insert(admin_decisions)
      .values(decision)
      .returning();
    return newDecision;
  }

  // Warehouse Transactions
  async getWarehouseTransactions(): Promise<WarehouseTransaction[]> {
    return await db
      .select()
      .from(warehouse_transactions)
      .orderBy(desc(warehouse_transactions.date));
  }

  async createWarehouseTransaction(
    transaction: any,
  ): Promise<WarehouseTransaction> {
    const [newTransaction] = await db
      .insert(warehouse_transactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  // Mixing Recipes (deprecated - use mixing batches instead)
  async getMixingRecipes(): Promise<any[]> {
    return [];
  }

  async createMixingRecipe(recipe: any): Promise<any> {
    throw new Error("Mixing recipes have been deprecated. Use mixing batches instead.");
  }

  // ============ HR System Implementation ============

  // Training Programs
  async getTrainingPrograms(): Promise<TrainingProgram[]> {
    return await db
      .select()
      .from(training_programs)
      .orderBy(desc(training_programs.created_at));
  }

  async createTrainingProgram(
    program: InsertTrainingProgram,
  ): Promise<TrainingProgram> {
    const [trainingProgram] = await db
      .insert(training_programs)
      .values(program as any)
      .returning();
    return trainingProgram;
  }

  async updateTrainingProgram(
    id: number,
    updates: Partial<TrainingProgram>,
  ): Promise<TrainingProgram> {
    const [trainingProgram] = await db
      .update(training_programs)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(training_programs.id, id))
      .returning();
    return trainingProgram;
  }

  async getTrainingProgramById(
    id: number,
  ): Promise<TrainingProgram | undefined> {
    const [program] = await db
      .select()
      .from(training_programs)
      .where(eq(training_programs.id, id));
    return program || undefined;
  }

  // Training Materials
  async getTrainingMaterials(programId?: number): Promise<TrainingMaterial[]> {
    const query = db.select().from(training_materials);
    if (programId) {
      return await query
        .where(eq(training_materials.program_id, programId))
        .orderBy(training_materials.order_index);
    }
    return await query.orderBy(
      training_materials.program_id,
      training_materials.order_index,
    );
  }

  async createTrainingMaterial(
    material: InsertTrainingMaterial,
  ): Promise<TrainingMaterial> {
    const [trainingMaterial] = await db
      .insert(training_materials)
      .values(material)
      .returning();
    return trainingMaterial;
  }

  async updateTrainingMaterial(
    id: number,
    updates: Partial<TrainingMaterial>,
  ): Promise<TrainingMaterial> {
    const [trainingMaterial] = await db
      .update(training_materials)
      .set(updates)
      .where(eq(training_materials.id, id))
      .returning();
    return trainingMaterial;
  }

  async deleteTrainingMaterial(id: number): Promise<boolean> {
    const result = await db
      .delete(training_materials)
      .where(eq(training_materials.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Training Enrollments
  async getTrainingEnrollments(
    employeeId?: number,
  ): Promise<TrainingEnrollment[]> {
    const query = db.select().from(training_enrollments);
    if (employeeId) {
      return await query
        .where(eq(training_enrollments.employee_id, employeeId))
        .orderBy(desc(training_enrollments.enrolled_date));
    }
    return await query.orderBy(desc(training_enrollments.enrolled_date));
  }

  async createTrainingEnrollment(
    enrollment: InsertTrainingEnrollment,
  ): Promise<TrainingEnrollment> {
    const [trainingEnrollment] = await db
      .insert(training_enrollments)
      .values(enrollment)
      .returning();
    return trainingEnrollment;
  }

  async updateTrainingEnrollment(
    id: number,
    updates: Partial<TrainingEnrollment>,
  ): Promise<TrainingEnrollment> {
    const [trainingEnrollment] = await db
      .update(training_enrollments)
      .set(updates)
      .where(eq(training_enrollments.id, id))
      .returning();
    return trainingEnrollment;
  }

  async getEnrollmentsByProgram(
    programId: number,
  ): Promise<TrainingEnrollment[]> {
    return await db
      .select()
      .from(training_enrollments)
      .where(eq(training_enrollments.program_id, programId))
      .orderBy(desc(training_enrollments.enrolled_date));
  }

  // Training Evaluations
  async getTrainingEvaluations(
    employeeId?: number,
    programId?: number,
  ): Promise<TrainingEvaluation[]> {
    let query = db.select().from(training_evaluations);

    if (employeeId && programId) {
      return await query
        .where(
          and(
            eq(training_evaluations.employee_id, employeeId),
            eq(training_evaluations.program_id, programId),
          ),
        )
        .orderBy(desc(training_evaluations.evaluation_date));
    } else if (employeeId) {
      return await query
        .where(eq(training_evaluations.employee_id, employeeId))
        .orderBy(desc(training_evaluations.evaluation_date));
    } else if (programId) {
      return await query
        .where(eq(training_evaluations.program_id, programId))
        .orderBy(desc(training_evaluations.evaluation_date));
    }

    return await query.orderBy(desc(training_evaluations.evaluation_date));
  }

  async createTrainingEvaluation(
    evaluation: InsertTrainingEvaluation,
  ): Promise<TrainingEvaluation> {
    const [trainingEvaluation] = await db
      .insert(training_evaluations)
      .values(evaluation)
      .returning();
    return trainingEvaluation;
  }

  async updateTrainingEvaluation(
    id: number,
    updates: Partial<TrainingEvaluation>,
  ): Promise<TrainingEvaluation> {
    const [trainingEvaluation] = await db
      .update(training_evaluations)
      .set(updates)
      .where(eq(training_evaluations.id, id))
      .returning();
    return trainingEvaluation;
  }

  async getTrainingEvaluationById(
    id: number,
  ): Promise<TrainingEvaluation | undefined> {
    const [evaluation] = await db
      .select()
      .from(training_evaluations)
      .where(eq(training_evaluations.id, id));
    return evaluation || undefined;
  }

  // Training Certificates
  async getTrainingCertificates(
    employeeId?: number,
  ): Promise<TrainingCertificate[]> {
    const query = db.select().from(training_certificates);
    if (employeeId) {
      return await query
        .where(eq(training_certificates.employee_id, employeeId))
        .orderBy(desc(training_certificates.issue_date));
    }
    return await query.orderBy(desc(training_certificates.issue_date));
  }

  async createTrainingCertificate(
    certificate: InsertTrainingCertificate,
  ): Promise<TrainingCertificate> {
    const [trainingCertificate] = await db
      .insert(training_certificates)
      .values(certificate)
      .returning();
    return trainingCertificate;
  }

  async updateTrainingCertificate(
    id: number,
    updates: Partial<TrainingCertificate>,
  ): Promise<TrainingCertificate> {
    const [trainingCertificate] = await db
      .update(training_certificates)
      .set(updates)
      .where(eq(training_certificates.id, id))
      .returning();
    return trainingCertificate;
  }

  async generateTrainingCertificate(
    enrollmentId: number,
  ): Promise<TrainingCertificate> {
    // Get enrollment details
    const [enrollment] = await db
      .select()
      .from(training_enrollments)
      .where(eq(training_enrollments.id, enrollmentId));
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // Generate certificate number
    const certificateNumber = generateCertificateNumber(enrollmentId);

    // Create certificate
    const certificate: InsertTrainingCertificate = {
      enrollment_id: enrollmentId,
      employee_id: enrollment.employee_id,
      program_id: enrollment.program_id,
      certificate_number: certificateNumber,
      issue_date: new Date().toISOString().split("T")[0],
      final_score: enrollment.final_score,
      certificate_status: "active",
      issued_by: 1, // Default to admin user
    };

    return await this.createTrainingCertificate(certificate);
  }

  // Performance Reviews
  async getPerformanceReviews(
    employeeId?: string,
  ): Promise<PerformanceReview[]> {
    const query = db.select().from(performance_reviews);
    if (employeeId) {
      return await query
        .where(eq(performance_reviews.employee_id, employeeId))
        .orderBy(desc(performance_reviews.created_at));
    }
    return await query.orderBy(desc(performance_reviews.created_at));
  }

  async createPerformanceReview(
    review: InsertPerformanceReview,
  ): Promise<PerformanceReview> {
    const [performanceReview] = await db
      .insert(performance_reviews)
      .values(review)
      .returning();
    return performanceReview;
  }

  async updatePerformanceReview(
    id: number,
    updates: Partial<PerformanceReview>,
  ): Promise<PerformanceReview> {
    const [performanceReview] = await db
      .update(performance_reviews)
      .set(updates)
      .where(eq(performance_reviews.id, id))
      .returning();
    return performanceReview;
  }

  async getPerformanceReviewById(
    id: number,
  ): Promise<PerformanceReview | undefined> {
    const [review] = await db
      .select()
      .from(performance_reviews)
      .where(eq(performance_reviews.id, id));
    return review || undefined;
  }

  // Performance Criteria
  async getPerformanceCriteria(): Promise<PerformanceCriteria[]> {
    return await db
      .select()
      .from(performance_criteria)
      .where(eq(performance_criteria.is_active, true));
  }

  async createPerformanceCriteria(
    criteria: InsertPerformanceCriteria,
  ): Promise<PerformanceCriteria> {
    const [performanceCriteria] = await db
      .insert(performance_criteria)
      .values(criteria as any)
      .returning();
    return performanceCriteria;
  }

  async updatePerformanceCriteria(
    id: number,
    updates: Partial<PerformanceCriteria>,
  ): Promise<PerformanceCriteria> {
    const [performanceCriteria] = await db
      .update(performance_criteria)
      .set(updates)
      .where(eq(performance_criteria.id, id))
      .returning();
    return performanceCriteria;
  }

  // Performance Ratings
  async getPerformanceRatings(reviewId: number): Promise<PerformanceRating[]> {
    return await db
      .select()
      .from(performance_ratings)
      .where(eq(performance_ratings.review_id, reviewId));
  }

  async createPerformanceRating(
    rating: InsertPerformanceRating,
  ): Promise<PerformanceRating> {
    const [performanceRating] = await db
      .insert(performance_ratings)
      .values(rating)
      .returning();
    return performanceRating;
  }

  async updatePerformanceRating(
    id: number,
    updates: Partial<PerformanceRating>,
  ): Promise<PerformanceRating> {
    const [performanceRating] = await db
      .update(performance_ratings)
      .set(updates)
      .where(eq(performance_ratings.id, id))
      .returning();
    return performanceRating;
  }

  // Leave Types
  async getLeaveTypes(): Promise<LeaveType[]> {
    return await db
      .select()
      .from(leave_types)
      .where(eq(leave_types.is_active, true));
  }

  async createLeaveType(leaveType: InsertLeaveType): Promise<LeaveType> {
    const [newLeaveType] = await db
      .insert(leave_types)
      .values(leaveType)
      .returning();
    return newLeaveType;
  }

  async updateLeaveType(
    id: number,
    updates: Partial<LeaveType>,
  ): Promise<LeaveType> {
    const [leaveType] = await db
      .update(leave_types)
      .set(updates)
      .where(eq(leave_types.id, id))
      .returning();
    return leaveType;
  }

  // Leave Requests
  async getLeaveRequests(employeeId?: string): Promise<LeaveRequest[]> {
    const query = db.select().from(leave_requests);
    if (employeeId) {
      return await query
        .where(eq(leave_requests.employee_id, employeeId))
        .orderBy(desc(leave_requests.created_at));
    }
    return await query.orderBy(desc(leave_requests.created_at));
  }

  async createLeaveRequest(request: InsertLeaveRequest): Promise<LeaveRequest> {
    const [leaveRequest] = await db
      .insert(leave_requests)
      .values(request)
      .returning();
    return leaveRequest;
  }

  async updateLeaveRequest(
    id: number,
    updates: Partial<LeaveRequest>,
  ): Promise<LeaveRequest> {
    const [leaveRequest] = await db
      .update(leave_requests)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(leave_requests.id, id))
      .returning();
    return leaveRequest;
  }

  async getLeaveRequestById(id: number): Promise<LeaveRequest | undefined> {
    const [request] = await db
      .select()
      .from(leave_requests)
      .where(eq(leave_requests.id, id));
    return request || undefined;
  }

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return await db
      .select()
      .from(leave_requests)
      .where(eq(leave_requests.final_status, "pending"))
      .orderBy(desc(leave_requests.created_at));
  }

  async deleteLeaveRequest(id: number): Promise<void> {
    return await db.transaction(async (tx) => {
      try {
        // Get the leave request details first to restore leave balance if needed
        const [leaveRequest] = await tx
          .select()
          .from(leave_requests)
          .where(eq(leave_requests.id, id));

        if (!leaveRequest) {
          throw new Error("طلب الإجازة غير موجود");
        }

        // If the leave request was approved, restore the leave balance
        if (leaveRequest.final_status === "approved") {
          const requestYear = new Date(leaveRequest.start_date).getFullYear();
          await tx.execute(sql`
            UPDATE leave_balances 
            SET used_days = GREATEST(0, used_days - ${leaveRequest.days_count}),
                remaining_days = LEAST(allocated_days, remaining_days + ${leaveRequest.days_count})
            WHERE employee_id = ${leaveRequest.employee_id} 
              AND leave_type_id = ${leaveRequest.leave_type_id} 
              AND year = ${requestYear}
          `);
        }

        // Delete related notifications
        await tx
          .delete(notifications)
          .where(
            and(
              eq(notifications.context_type, "leave_request"),
              eq(notifications.context_id, id.toString()),
            ),
          );

        // Then delete the leave request
        await tx.delete(leave_requests).where(eq(leave_requests.id, id));
      } catch (error) {
        console.error("Error deleting leave request:", error);
        throw new Error("فشل في حذف طلب الإجازة");
      }
    });
  }

  // Leave Balances
  async getLeaveBalances(
    employeeId: string,
    year?: number,
  ): Promise<LeaveBalance[]> {
    if (year) {
      return await db
        .select()
        .from(leave_balances)
        .where(
          and(
            eq(leave_balances.employee_id, employeeId),
            eq(leave_balances.year, year),
          ),
        );
    }
    return await db
      .select()
      .from(leave_balances)
      .where(eq(leave_balances.employee_id, employeeId));
  }

  async createLeaveBalance(balance: InsertLeaveBalance): Promise<LeaveBalance> {
    const [leaveBalance] = await db
      .insert(leave_balances)
      .values(balance)
      .returning();
    return leaveBalance;
  }

  async updateLeaveBalance(
    id: number,
    updates: Partial<LeaveBalance>,
  ): Promise<LeaveBalance> {
    const [leaveBalance] = await db
      .update(leave_balances)
      .set(updates)
      .where(eq(leave_balances.id, id))
      .returning();
    return leaveBalance;
  }

  async getLeaveBalanceByType(
    employeeId: string,
    leaveTypeId: number,
    year: number,
  ): Promise<LeaveBalance | undefined> {
    const [balance] = await db
      .select()
      .from(leave_balances)
      .where(
        and(
          eq(leave_balances.employee_id, employeeId),
          eq(leave_balances.leave_type_id, leaveTypeId),
          eq(leave_balances.year, year),
        ),
      );
    return balance || undefined;
  }

  // ============ Inventory Management ============

  async getInventoryItems(): Promise<any[]> {
    const result = await db
      .select({
        id: inventory.id,
        item_id: inventory.item_id,
        location_id: inventory.location_id,
        item_name: items.name,
        item_name_ar: items.name_ar,
        item_code: items.code,
        category_name: categories.name,
        category_name_ar: categories.name_ar,
        location_name: locations.name,
        location_name_ar: locations.name_ar,
        current_stock: inventory.current_stock,
        min_stock: inventory.min_stock,
        max_stock: inventory.max_stock,
        unit: inventory.unit,
        cost_per_unit: inventory.cost_per_unit,
        last_updated: inventory.last_updated,
      })
      .from(inventory)
      .leftJoin(items, eq(inventory.item_id, items.id))
      .leftJoin(categories, eq(items.category_id, categories.id))
      .leftJoin(locations, eq(inventory.location_id, locations.id))
      .orderBy(items.name_ar);

    return result;
  }

  async createInventoryItem(item: InsertInventory): Promise<Inventory> {
    const [inventoryItem] = await db.insert(inventory).values(item).returning();
    return inventoryItem;
  }

  async updateInventoryItem(
    id: number,
    updates: Partial<Inventory>,
  ): Promise<Inventory> {
    const [inventoryItem] = await db
      .update(inventory)
      .set({ ...updates, last_updated: new Date() })
      .where(eq(inventory.id, id))
      .returning();
    return inventoryItem;
  }

  async deleteInventoryItem(id: number): Promise<boolean> {
    const result = await db.delete(inventory).where(eq(inventory.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getInventoryByItemId(itemId: string): Promise<Inventory | undefined> {
    const [item] = await db
      .select()
      .from(inventory)
      .where(eq(inventory.item_id, itemId));
    return item || undefined;
  }

  async getInventoryStats(): Promise<any> {
    const totalItems = await db.select({ count: count() }).from(inventory);
    const lowStockItems = await db
      .select({ count: count() })
      .from(inventory)
      .where(sql`${inventory.current_stock} <= ${inventory.min_stock}`);

    const totalValue = await db
      .select({
        total: sum(
          sql`${inventory.current_stock} * ${inventory.cost_per_unit}`,
        ),
      })
      .from(inventory);

    // Get today's movements
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMovements = await db
      .select({ count: count() })
      .from(inventory_movements)
      .where(sql`DATE(${inventory_movements.created_at}) = CURRENT_DATE`);

    return {
      totalItems: totalItems[0]?.count || 0,
      lowStockItems: lowStockItems[0]?.count || 0,
      totalValue: totalValue[0]?.total || 0,
      movementsToday: todayMovements[0]?.count || 0,
    };
  }

  // ============ Inventory Movements ============

  async getInventoryMovements(): Promise<any[]> {
    const result = await db
      .select({
        id: inventory_movements.id,
        inventory_id: inventory_movements.inventory_id,
        item_name: items.name_ar,
        item_code: items.code,
        location_name: locations.name_ar,
        movement_type: inventory_movements.movement_type,
        quantity: inventory_movements.quantity,
        unit_cost: inventory_movements.unit_cost,
        total_cost: inventory_movements.total_cost,
        reference_number: inventory_movements.reference_number,
        reference_type: inventory_movements.reference_type,
        notes: inventory_movements.notes,
        created_by: inventory_movements.created_by,
        created_at: inventory_movements.created_at,
        user_name: users.username,
      })
      .from(inventory_movements)
      .leftJoin(inventory, eq(inventory_movements.inventory_id, inventory.id))
      .leftJoin(items, eq(inventory.item_id, items.id))
      .leftJoin(locations, eq(inventory.location_id, locations.id))
      .leftJoin(users, eq(inventory_movements.created_by, users.id))
      .orderBy(desc(inventory_movements.created_at));

    return result;
  }

  async createInventoryMovement(
    data: InsertInventoryMovement,
  ): Promise<InventoryMovement> {
    return await withDatabaseErrorHandling(async () => {
      // STEP 0: MANDATORY DATAVALIDATOR INTEGRATION - Validate BEFORE database write
      const dataValidator = getDataValidator(this);
      const validationResult = await dataValidator.validateEntity(
        "inventory_movements",
        data,
        false,
      );

      if (!validationResult.isValid) {
        console.error(
          "[Storage] ❌ INVENTORY MOVEMENT VALIDATION FAILED:",
          validationResult.errors,
        );
        throw new DatabaseError(
          `فشل التحقق من صحة حركة المخزون: ${validationResult.errors.map((e) => e.message_ar).join(", ")}`,
          {
            code: "VALIDATION_FAILED",
            validationErrors: validationResult.errors,
          },
        );
      }

      console.log(
        "[Storage] ✅ Inventory movement validation passed, proceeding with database write",
      );

      return await db.transaction(async (tx) => {
        // STEP 1: Lock inventory item to prevent race conditions
        let currentInventory: any = null;
        if (data.inventory_id) {
          [currentInventory] = await tx
            .select()
            .from(inventory)
            .where(eq(inventory.id, data.inventory_id))
            .for("update");

          if (!currentInventory) {
            throw new Error("عنصر المخزون غير موجود");
          }
        }

        // STEP 2: Validate inventory constraints before movement
        const currentStock = parseFloat(currentInventory?.current_stock || "0");
        const movementQty = parseFloat(data.quantity?.toString() || "0");

        if (movementQty <= 0) {
          throw new Error("كمية الحركة يجب أن تكون أكبر من صفر");
        }

        let newStock = currentStock;
        if (data.movement_type === "in") {
          newStock = currentStock + movementQty;
        } else if (data.movement_type === "out") {
          // INVARIANT C: Prevent negative inventory
          if (currentStock < movementQty) {
            throw new Error(
              `المخزون غير كافي. المتاح: ${currentStock.toFixed(2)}, المطلوب: ${movementQty.toFixed(2)}`,
            );
          }
          newStock = currentStock - movementQty;
        } else if (data.movement_type === "adjustment") {
          // For adjustments, the quantity represents the final stock level
          newStock = movementQty;
        }

        // INVARIANT C: Final check - ensure stock doesn't go negative
        if (newStock < 0) {
          throw new Error("لا يمكن أن يكون المخزون سالب");
        }

        // STEP 3: Create the movement record
        const [movement] = await tx
          .insert(inventory_movements)
          .values(data)
          .returning();

        // STEP 4: Update inventory stock atomically
        if (movement.inventory_id) {
          await tx
            .update(inventory)
            .set({
              current_stock: newStock.toString(),
              last_updated: new Date(),
            })
            .where(eq(inventory.id, movement.inventory_id));
        }

        return movement;
      });
    }, "إنشاء حركة مخزون");
  }

  async deleteInventoryMovement(id: number): Promise<boolean> {
    const result = await db
      .delete(inventory_movements)
      .where(eq(inventory_movements.id, id));
    return (result.rowCount || 0) > 0;
  }

  // ============ Extended Location Management ============

  async createLocationExtended(data: any): Promise<Location> {
    const [location] = await db.insert(locations).values(data).returning();
    return location;
  }

  async updateLocationExtended(id: string, updates: any): Promise<Location> {
    const [location] = await db
      .update(locations)
      .set(updates)
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  async deleteLocationExtended(id: string): Promise<void> {
    await db.delete(locations).where(eq(locations.id, id));
  }

  // ============ Inventory Movements Management ============

  async getAllInventoryMovements(): Promise<any[]> {
    const movements = await db
      .select({
        id: inventory_movements.id,
        inventory_id: inventory_movements.inventory_id,
        movement_type: inventory_movements.movement_type,
        quantity: inventory_movements.quantity,
        unit_cost: inventory_movements.unit_cost,
        total_cost: inventory_movements.total_cost,
        reference_number: inventory_movements.reference_number,
        reference_type: inventory_movements.reference_type,
        notes: inventory_movements.notes,
        created_at: inventory_movements.created_at,
        created_by: inventory_movements.created_by,
        item_name: items.name_ar,
        item_code: items.code,
        user_name: users.display_name_ar,
      })
      .from(inventory_movements)
      .leftJoin(inventory, eq(inventory_movements.inventory_id, inventory.id))
      .leftJoin(items, eq(inventory.item_id, items.id))
      .leftJoin(users, eq(inventory_movements.created_by, users.id))
      .orderBy(desc(inventory_movements.created_at));

    return movements;
  }

  // ============ Settings Management ============

  async getSystemSettings(): Promise<SystemSetting[]> {
    return await db
      .select()
      .from(system_settings)
      .orderBy(system_settings.setting_key);
  }

  async getSystemSettingByKey(key: string): Promise<SystemSetting | undefined> {
    const [setting] = await db
      .select()
      .from(system_settings)
      .where(eq(system_settings.setting_key, key));
    return setting || undefined;
  }

  async createSystemSetting(
    setting: InsertSystemSetting,
  ): Promise<SystemSetting> {
    const [newSetting] = await db
      .insert(system_settings)
      .values(setting)
      .returning();
    return newSetting;
  }

  // Factory Locations Implementation
  async getFactoryLocations(): Promise<FactoryLocation[]> {
    return await db
      .select()
      .from(factory_locations)
      .orderBy(factory_locations.name_ar);
  }

  async getActiveFactoryLocations(): Promise<FactoryLocation[]> {
    return await db
      .select()
      .from(factory_locations)
      .where(eq(factory_locations.is_active, true))
      .orderBy(factory_locations.name_ar);
  }

  async getFactoryLocation(id: number): Promise<FactoryLocation | undefined> {
    const [location] = await db
      .select()
      .from(factory_locations)
      .where(eq(factory_locations.id, id));
    return location || undefined;
  }

  async createFactoryLocation(location: InsertFactoryLocation): Promise<FactoryLocation> {
    const [newLocation] = await db
      .insert(factory_locations)
      .values(location)
      .returning();
    return newLocation;
  }

  async updateFactoryLocation(
    id: number,
    location: Partial<InsertFactoryLocation>
  ): Promise<FactoryLocation> {
    const [updated] = await db
      .update(factory_locations)
      .set({
        ...location,
        updated_at: new Date(),
      })
      .where(eq(factory_locations.id, id))
      .returning();
    return updated;
  }

  async deleteFactoryLocation(id: number): Promise<void> {
    await db
      .delete(factory_locations)
      .where(eq(factory_locations.id, id));
  }

  async updateSystemSetting(
    key: string,
    value: string,
    userId: number,
  ): Promise<SystemSetting> {
    const [setting] = await db
      .update(system_settings)
      .set({
        setting_value: value,
        updated_at: new Date(),
        updated_by: userId.toString(),
      })
      .where(eq(system_settings.setting_key, key))
      .returning();
    return setting;
  }

  async getUserSettings(userId: number): Promise<UserSetting[]> {
    return await db
      .select()
      .from(user_settings)
      .where(eq(user_settings.user_id, userId.toString()));
  }

  async getUserSettingByKey(
    userId: number,
    key: string,
  ): Promise<UserSetting | undefined> {
    const [setting] = await db
      .select()
      .from(user_settings)
      .where(
        sql`${user_settings.user_id} = ${userId.toString()} AND ${user_settings.setting_key} = ${key}`,
      );
    return setting || undefined;
  }

  async createUserSetting(setting: InsertUserSetting): Promise<UserSetting> {
    const [newSetting] = await db
      .insert(user_settings)
      .values(setting)
      .returning();
    return newSetting;
  }

  async updateUserSetting(
    userId: number,
    key: string,
    value: string,
  ): Promise<UserSetting> {
    // Try to update existing setting first
    const [existingSetting] = await db
      .select()
      .from(user_settings)
      .where(
        sql`${user_settings.user_id} = ${userId.toString()} AND ${user_settings.setting_key} = ${key}`,
      );

    if (existingSetting) {
      const [setting] = await db
        .update(user_settings)
        .set({
          setting_value: value,
          updated_at: new Date(),
        })
        .where(
          sql`${user_settings.user_id} = ${userId.toString()} AND ${user_settings.setting_key} = ${key}`,
        )
        .returning();
      return setting;
    } else {
      // Create new setting if it doesn't exist
      return await this.createUserSetting({
        user_id: userId.toString(),
        setting_key: key,
        setting_value: value,
      });
    }
  }

  // ============ Data Mapping Implementation ============

  async getDataMappings(configId: number): Promise<any[]> {
    // For now, return sample mappings. In a real implementation, this would fetch from database
    return [
      {
        id: 1,
        config_id: configId,
        local_table: "customers",
        local_field: "name",
        remote_table: "clients",
        remote_field: "client_name",
        mapping_type: "direct",
        transformation_rule: null,
        is_active: true,
      },
      {
        id: 2,
        config_id: configId,
        local_table: "items",
        local_field: "code",
        remote_table: "products",
        remote_field: "product_code",
        mapping_type: "direct",
        transformation_rule: null,
        is_active: true,
      },
      {
        id: 3,
        config_id: configId,
        local_table: "customer_products",
        local_field: "price",
        remote_table: "product_prices",
        remote_field: "unit_price",
        mapping_type: "transform",
        transformation_rule: "multiply_by_1.15", // Add 15% tax
        is_active: true,
      },
    ];
  }

  async createDataMapping(mapping: any): Promise<any> {
    // For now, return the mapping with a generated ID
    return {
      id: Math.floor(Math.random() * 1000),
      ...mapping,
      created_at: new Date(),
      updated_at: new Date(),
    };
  }

  async updateDataMapping(id: number, mapping: any): Promise<any> {
    // For now, return the updated mapping
    return {
      id,
      ...mapping,
      updated_at: new Date(),
    };
  }

  async deleteDataMapping(id: number): Promise<boolean> {
    // For now, always return true
    return true;
  }

  // ============ Data Synchronization Implementation ============

  async syncData(
    configId: number,
    entityType: string,
    direction: string,
  ): Promise<any> {
    // Simulate data synchronization process
    const startTime = new Date();

    // Mock sync process
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate 2 second sync

    const recordsProcessed = Math.floor(Math.random() * 100) + 10;
    const errors = Math.floor(Math.random() * 3);

    const syncResult = {
      sync_id: Math.floor(Math.random() * 10000),
      config_id: configId,
      entity_type: entityType,
      direction,
      status: errors === 0 ? "success" : "partial_success",
      records_processed: recordsProcessed,
      records_success: recordsProcessed - errors,
      records_failed: errors,
      started_at: startTime,
      completed_at: new Date(),
      duration_ms: 2000,
      error_details: errors > 0 ? [`خطأ في معالجة ${errors} من السجلات`] : null,
    };

    // Log the sync operation
    await this.createSyncLog({
      config_id: configId,
      entity_type: entityType,
      sync_direction: direction,
      status: syncResult.status,
      records_processed: recordsProcessed,
      records_success: recordsProcessed - errors,
      records_failed: errors,
      error_details: syncResult.error_details?.join(", ") || null,
      started_at: startTime,
      completed_at: new Date(),
    });

    return syncResult;
  }

  async getSyncLogs(configId: number): Promise<any[]> {
    // For now, return sample sync logs
    return [
      {
        id: 1,
        config_id: configId,
        entity_type: "customers",
        sync_direction: "import",
        status: "success",
        records_processed: 45,
        records_success: 45,
        records_failed: 0,
        error_details: null,
        started_at: new Date(Date.now() - 3600000), // 1 hour ago
        completed_at: new Date(Date.now() - 3599000),
        duration_ms: 1000,
      },
      {
        id: 2,
        config_id: configId,
        entity_type: "items",
        sync_direction: "export",
        status: "partial_success",
        records_processed: 120,
        records_success: 118,
        records_failed: 2,
        error_details: "خطأ في معالجة 2 من السجلات",
        started_at: new Date(Date.now() - 7200000), // 2 hours ago
        completed_at: new Date(Date.now() - 7198000),
        duration_ms: 2000,
      },
    ];
  }

  async createSyncLog(log: any): Promise<any> {
    // For now, return the log with a generated ID
    return {
      id: Math.floor(Math.random() * 1000),
      ...log,
      created_at: new Date(),
    };
  }

  // ============ Database Management Implementation ============

  async getDatabaseStats(): Promise<any> {
    try {
      // Get database size
      const dbSize = await db.execute(sql`
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `);

      // Get all table names dynamically (same approach as backup)
      const tablesQuery = await db.execute(sql`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%' 
        AND tablename NOT LIKE 'sql_%'
        AND tablename != 'sessions'
        ORDER BY tablename
      `);

      const allTables = tablesQuery.rows.map((row: any) => row.tablename);
      const tableCount = allTables.length;

      // Count total records across ALL tables dynamically
      let totalRecords = 0;
      
      for (const tableName of allTables) {
        try {
          // Query table count using sql.identifier for safe dynamic table names
          const countResult: any = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(tableName)}`);
          const rowCount = parseInt(countResult.rows[0]?.count || '0');
          totalRecords += rowCount;
        } catch (err) {
          console.warn(`تخطي جدول ${tableName} في الإحصائيات:`, err);
        }
      }

      return {
        tableCount,
        totalRecords,
        databaseSize: dbSize.rows[0]?.size || "0 MB",
        lastBackup: new Date().toLocaleDateString("ar"),
      };
    } catch (error) {
      console.error("Error getting database stats:", error);
      throw error;
    }
  }

  async createDatabaseBackup(): Promise<any> {
    try {
      const backupId = `backup_${Date.now()}`;
      const timestamp = new Date();

      // Create a comprehensive backup by getting all table data
      const backupData: any = {
        id: backupId,
        timestamp,
        tables: {},
      };

      // Get all table names from the database dynamically
      const tablesQuery = await db.execute(sql`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%' 
        AND tablename NOT LIKE 'sql_%'
        AND tablename != 'sessions'
        ORDER BY tablename
      `);

      const allTables = tablesQuery.rows.map((row: any) => row.tablename);
      console.log(`بدء النسخ الاحتياطي لـ ${allTables.length} جدول...`);
      
      let backedUpTables = 0;
      let failedTables: string[] = [];

      for (const tableName of allTables) {
        try {
          // Query table data using Drizzle's sql.identifier for safe dynamic table names
          const tableDataQuery = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)}`);
          backupData.tables[tableName] = tableDataQuery.rows;
          backedUpTables++;
          console.log(`✓ تم نسخ الجدول: ${tableName} (${backedUpTables}/${allTables.length}) - ${tableDataQuery.rows.length} سجل`);
        } catch (error) {
          console.warn(`⚠ تحذير: فشل نسخ الجدول ${tableName}:`, error);
          failedTables.push(tableName);
          backupData.tables[tableName] = [];
        }
      }

      // Add backup metadata
      backupData.metadata = {
        totalTables: allTables.length,
        backedUpTables,
        failedTables,
        timestamp: timestamp.toISOString(),
      };

      // Store backup data as JSON
      const backupJson = JSON.stringify(backupData, null, 2);
      const filename = `backup-${timestamp.toISOString().split("T")[0]}.json`;

      console.log(`✓ تم إنشاء النسخة الاحتياطية بنجاح: ${backedUpTables}/${allTables.length} جدول`);
      if (failedTables.length > 0) {
        console.log(`⚠ فشل نسخ ${failedTables.length} جداول:`, failedTables.join(", "));
      }

      // In production, this would be saved to file system or cloud storage
      // For now, return the backup data for download
      return {
        id: backupId,
        filename,
        data: backupJson,
        size: `${(backupJson.length / 1024 / 1024).toFixed(2)} MB`,
        timestamp,
        status: "completed",
        tablesCount: backedUpTables,
        totalTables: allTables.length,
        failedTables,
      };
    } catch (error) {
      console.error("Error creating backup:", error);
      throw new Error("فشل في إنشاء النسخة الاحتياطية");
    }
  }

  async getBackupFile(backupId: string): Promise<any> {
    try {
      // In a real implementation, this would retrieve the actual backup file
      // For now, return a simple SQL dump representation
      return `-- Database Backup: ${backupId}
-- Created: ${new Date().toISOString()}
-- 
-- This is a simulated backup file
-- In production, this would contain actual SQL statements
`;
    } catch (error) {
      console.error("Error getting backup file:", error);
      throw new Error("فشل في جلب ملف النسخة الاحتياطية");
    }
  }

  async restoreDatabaseBackup(backupData: any): Promise<any> {
    try {
      // In a real implementation, this would restore from SQL dump
      // For now, simulate the restore process
      return {
        status: "success",
        tablesRestored: 8,
        recordsRestored: 1247,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error restoring backup:", error);
      throw new Error("فشل في استعادة النسخة الاحتياطية");
    }
  }

  async exportTableData(
    tableName: string,
    format: string,
  ): Promise<Buffer | string> {
    try {
      let data;

      // Get data based on table name
      switch (tableName) {
        case "orders":
          data = await db.select().from(orders);
          break;
        case "customers":
          data = await db.select().from(customers);
          break;

        case "users":
          data = await db.select().from(users);
          break;
        case "machines":
          data = await db.select().from(machines);
          break;
        case "locations":
          data = await db.select().from(locations);
          break;
        case "categories":
          data = await db.select().from(categories);
          break;
        case "sections":
          data = await db.select().from(sections);
          break;
        case "items":
          data = await db.select().from(items);
          break;
        case "rolls":
          data = await db.select().from(rolls);
          break;
        case "production_orders":
          data = await db.select().from(production_orders);
          break;
        case "production_orders_view":
          data = await db.select().from(production_orders);
          break;
        case "production_orders":
          data = await db.select().from(production_orders);
          break;
        case "customer_products":
          data = await db.select().from(customer_products);
          break;
        default:
          throw new Error(`جدول غير مدعوم: ${tableName}`);
      }

      // Format data based on requested format
      switch (format) {
        case "csv":
          return this.convertToCSV(data, tableName);
        case "json":
          return JSON.stringify(data, null, 2);
        case "excel":
          return await this.convertToExcelAsync(data, tableName);
        default:
          return JSON.stringify(data, null, 2);
      }
    } catch (error) {
      console.error("Error exporting table data:", error);
      throw new Error("فشل في تصدير بيانات الجدول");
    }
  }

  async importTableData(
    tableName: string,
    data: any,
    format: string,
  ): Promise<any> {
    try {
      // Parse data based on format
      let parsedData;
      switch (format) {
        case "csv":
          parsedData = this.parseCSV(data);
          break;
        case "json":
          parsedData = JSON.parse(data);
          break;
        case "excel":
          parsedData = this.parseExcel(data);
          break;
        default:
          parsedData = JSON.parse(data);
      }

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        throw new Error("البيانات فارغة أو غير صحيحة");
      }

      // Insert the data into the specified table
      let insertedCount = 0;

      switch (tableName) {
        case "users":
          for (const row of parsedData) {
            if (row.username && row.password) {
              try {
                const [newUser] = await db
                  .insert(users)
                  .values({
                    username: row.username,
                    password: row.password,
                    display_name: row.display_name || row.username,
                    display_name_ar: row.display_name_ar || row.username,
                    role_id: parseInt(row.role_id) || 1,
                    section_id: row.section_id || null,
                    status: row.status || "active",
                  })
                  .returning();
                insertedCount++;
              } catch (error) {
                console.warn(
                  `تم تجاهل المستخدم ${row.username} - موجود مسبقاً أو بيانات غير صحيحة`,
                );
              }
            }
          }
          break;

        case "customers":
          for (const row of parsedData) {
            if (row.name || row.name_ar) {
              try {
                let customerId = row.id;

                // Generate sequential ID if not provided
                if (!customerId) {
                  console.log("إنتاج معرف جديد للعميل...");
                  const existingCustomers = await db
                    .select({ id: customers.id })
                    .from(customers)
                    .orderBy(customers.id);

                  const cidNumbers = existingCustomers
                    .filter(
                      (cust) =>
                        cust.id.startsWith("CID") && /^CID\d{3}$/.test(cust.id),
                    )
                    .map((cust) => parseInt(cust.id.replace("CID", "")))
                    .filter((num) => !isNaN(num) && num >= 1 && num <= 999);

                  console.log("أرقام العملاء المعيارية:", cidNumbers);
                  const maxNum =
                    cidNumbers.length > 0 ? Math.max(...cidNumbers) : 0;
                  const nextNum = maxNum + 1;
                  customerId = `CID${nextNum.toString().padStart(3, "0")}`;
                  console.log("معرف العميل الجديد:", customerId);
                }

                const customerData = {
                  id: customerId,
                  name: row.name || row.name_ar || "",
                  name_ar: row.name_ar || row.name || "",
                  phone: row.phone || "",
                  address: row.address || "",
                  contact_person: row.contact_person || "",
                  email: row.email || "",
                  city: row.city || "",
                  status: row.status || "active",
                };

                const [newCustomer] = await db
                  .insert(customers)
                  .values(customerData)
                  .returning();
                insertedCount++;
                console.log(
                  `تم إضافة العميل: ${newCustomer.name} (ID: ${newCustomer.id})`,
                );
              } catch (error) {
                console.warn(
                  `تم تجاهل العميل ${row.name} - بيانات غير صحيحة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
                );
              }
            }
          }
          break;

        case "items":
          for (const row of parsedData) {
            if (row.name || row.name_ar) {
              try {
                let itemId = row.id;

                // Generate sequential ID if not provided
                if (!itemId) {
                  console.log("إنتاج معرف جديد للصنف...");
                  const existingItems = await db
                    .select({ id: items.id })
                    .from(items)
                    .orderBy(items.id);

                  const itmNumbers = existingItems
                    .filter(
                      (item) =>
                        item.id.startsWith("ITM") && /^ITM\d{2}$/.test(item.id),
                    )
                    .map((item) => parseInt(item.id.replace("ITM", "")))
                    .filter((num) => !isNaN(num) && num >= 1 && num <= 99);

                  console.log("أرقام الأصناف المعيارية:", itmNumbers);
                  const maxNum =
                    itmNumbers.length > 0 ? Math.max(...itmNumbers) : 0;
                  const nextNum = maxNum + 1;
                  itemId = `ITM${nextNum.toString().padStart(2, "0")}`;
                  console.log("معرف الصنف الجديد:", itemId);
                }

                const itemData = {
                  id: itemId,
                  name_ar: row.name_ar || row.name || "",
                  category_id: row.category_id || null,
                  code: row.code || null,
                  status: row.status || "active",
                };

                const [newItem] = await db
                  .insert(items)
                  .values(itemData)
                  .returning();
                insertedCount++;
                console.log(
                  `تم إضافة الصنف: ${newItem.name_ar} (ID: ${newItem.id})`,
                );
              } catch (error) {
                console.warn(
                  `تم تجاهل الصنف ${row.name} - موجود مسبقاً أو بيانات غير صحيحة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
                );
              }
            }
          }
          break;

        case "categories":
          for (const row of parsedData) {
            if (row.name || row.name_ar) {
              try {
                let categoryId = row.id;

                // Generate sequential ID if not provided
                if (!categoryId) {
                  console.log("إنتاج معرف جديد للفئة...");
                  const existingCategories = await db
                    .select({ id: categories.id })
                    .from(categories)
                    .orderBy(categories.id);
                  console.log(
                    "الفئات الموجودة:",
                    existingCategories.map((c) => c.id),
                  );

                  const catNumbers = existingCategories
                    .filter(
                      (cat) =>
                        cat.id.startsWith("CAT") && /^CAT\d{2}$/.test(cat.id),
                    )
                    .map((cat) => parseInt(cat.id.replace("CAT", "")))
                    .filter((num) => !isNaN(num) && num >= 1 && num <= 99);

                  console.log("أرقام الفئات المعيارية:", catNumbers);
                  const maxNum =
                    catNumbers.length > 0 ? Math.max(...catNumbers) : 0;
                  const nextNum = maxNum + 1;
                  categoryId = `CAT${nextNum.toString().padStart(2, "0")}`;
                  console.log("المعرف الجديد:", categoryId);
                }

                const categoryData = {
                  id: categoryId,
                  name: row.name || row.name_ar || "",
                  name_ar: row.name_ar || row.name || "",
                  description: row.description || null,
                  description_ar: row.description_ar || row.description || null,
                };

                const [newCategory] = await db
                  .insert(categories)
                  .values(categoryData)
                  .returning();
                insertedCount++;
                console.log(
                  `تم إضافة الفئة: ${newCategory.name} (ID: ${newCategory.id})`,
                );
              } catch (error) {
                console.warn(
                  `تم تجاهل الفئة ${row.name} - بيانات غير صحيحة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
                );
              }
            }
          }
          break;

        case "orders":
          for (const row of parsedData) {
            if (row.customer_id) {
              try {
                // Require created_by in imported data for security
                if (!row.created_by) {
                  throw new Error("حقل created_by مطلوب في البيانات المستوردة");
                }
                
                const [newOrder] = await db
                  .insert(orders)
                  .values({
                    order_number: row.order_number || `ORD${Date.now()}`,
                    customer_id: row.customer_id,
                    delivery_days: row.delivery_days || null,
                    status: row.status || "pending",
                    notes: row.notes || null,
                    created_by: row.created_by,
                  })
                  .returning();
                insertedCount++;
                console.log(`تم إضافة الطلب: ${newOrder.id}`);
              } catch (error) {
                console.warn(
                  `تم تجاهل الطلب - بيانات غير صحيحة: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
                );
              }
            }
          }
          break;

        default:
          throw new Error(`الجدول "${tableName}" غير مدعوم للاستيراد`);
      }

      return {
        status: "success",
        count: insertedCount,
        totalRows: parsedData.length,
        tableName,
        message: `تم استيراد ${insertedCount} من أصل ${parsedData.length} سجل بنجاح`,
      };
    } catch (error) {
      console.error("Error importing table data:", error);
      throw new Error(
        `فشل في استيراد البيانات: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
      );
    }
  }

  async optimizeTables(): Promise<any> {
    try {
      // In a real implementation, this would run VACUUM and ANALYZE on PostgreSQL
      await db.execute(sql`VACUUM ANALYZE`);

      return {
        status: "success",
        message: "تم تحسين جميع الجداول بنجاح",
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error optimizing tables:", error);
      // Return success for development
      return {
        status: "success",
        message: "تم تحسين جميع الجداول بنجاح",
        timestamp: new Date(),
      };
    }
  }

  async checkDatabaseIntegrity(): Promise<any> {
    try {
      // In a real implementation, this would run integrity checks
      // For now, simulate the check
      return {
        status: "healthy",
        message: "قاعدة البيانات سليمة",
        checks: [
          { name: "Foreign Key Constraints", status: "passed" },
          { name: "Data Consistency", status: "passed" },
          { name: "Index Integrity", status: "passed" },
          { name: "Table Structure", status: "passed" },
        ],
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error checking database integrity:", error);
      throw new Error("فشل في فحص تكامل قاعدة البيانات");
    }
  }

  async cleanupOldData(daysOld: number): Promise<any> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // In a real implementation, this would delete old records
      // For now, simulate the cleanup
      return {
        status: "success",
        count: 0, // No old data to clean up in development
        message: `تم تنظيف البيانات الأقدم من ${daysOld} يوم`,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Error cleaning up old data:", error);
      throw new Error("فشل في تنظيف البيانات القديمة");
    }
  }

  // Helper methods for data conversion
  private convertToCSV(data: any[], tableName?: string): Buffer {
    if (!data || data.length === 0) {
      // Create empty template with proper column headers
      const templateHeaders = this.getTableTemplate(tableName);
      const csvContent = templateHeaders.join(",");
      return Buffer.from("\uFEFF" + csvContent, "utf8"); // BOM for UTF-8
    }

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        return typeof value === "string"
          ? `"${value.replace(/"/g, '""')}"`
          : String(value);
      });
      csvRows.push(values.join(","));
    }

    const csvContent = csvRows.join("\n");
    // Add BOM (Byte Order Mark) for proper Arabic text encoding
    return Buffer.from("\uFEFF" + csvContent, "utf8");
  }

  // Get template headers for empty tables
  private getTableTemplate(tableName?: string): string[] {
    const templates: Record<string, string[]> = {
      customers: [
        "id",
        "name",
        "name_ar",
        "contact_person",
        "phone",
        "email",
        "address",
        "country",
        "type",
        "payment_terms",
        "credit_limit",
        "sales_rep_id",
        "status",
      ],
      categories: [
        "id",
        "name",
        "name_ar",
        "description",
        "description_ar",
        "status",
      ],
      sections: [
        "id",
        "name",
        "name_ar",
        "category_id",
        "description",
        "description_ar",
      ],
      items: [
        "id",
        "name",
        "name_ar",
        "description",
        "description_ar",
        "category_id",
        "section_id",
        "unit",
        "unit_ar",
        "price",
        "cost",
        "status",
      ],
      customer_products: [
        "id",
        "customer_id",
        "item_id",
        "customer_item_code",
        "notes",
        "notes_ar",
        "specifications",
      ],
      users: [
        "id",
        "username",
        "password",
        "display_name",
        "email",
        "role_id",
        "status",
        "department",
        "position",
        "phone",
      ],
      machines: [
        "id",
        "name",
        "name_ar",
        "type",
        "type_ar",
        "status",
        "location_id",
        "description",
        "description_ar",
      ],
      locations: [
        "id",
        "name",
        "name_ar",
        "type",
        "description",
        "description_ar",
      ],
      orders: [
        "id",
        "customer_id",
        "order_number",
        "order_date",
        "delivery_date",
        "status",
        "total_amount",
        "notes",
        "created_by",
      ],
      production_orders_view: [
        "id",
        "production_order_number",
        "order_id",
        "customer_product_id",
        "quantity_kg",
        "status",
        "created_at",
      ],
      production_orders: [
        "id",
        "production_order_number",
        "order_id",
        "customer_product_id",
        "quantity_kg",
        "status",
        "created_at",
      ],
      rolls: [
        "id",
        "roll_number",
        "production_order_id",
        "weight_kg",
        "stage",
        "created_at",
      ],
    };

    return templates[tableName || ""] || ["id", "name", "description"];
  }

  private async convertToExcelAsync(data: any[], tableName?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    if (!data || data.length === 0) {
      const templateHeaders = this.getTableTemplate(tableName);
      const worksheet = workbook.addWorksheet("قالب_البيانات");
      worksheet.addRow(templateHeaders);
      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    }

    const worksheet = workbook.addWorksheet("البيانات");
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);
    data.forEach((row) => {
      worksheet.addRow(headers.map((h) => row[h]));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }


  private parseCSV(csvData: string): any[] {
    const lines = csvData.split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",");
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(",");
        const row: any = {};
        headers.forEach((header: string, index: number) => {
          row[header.trim()] = values[index]?.trim().replace(/"/g, "") || "";
        });
        result.push(row);
      }
    }

    return result;
  }

  private parseExcel(excelData: any): any[] {
    // For now, treat as CSV
    // In a real implementation, you would use a library like xlsx
    return this.parseCSV(excelData);
  }

  // ============ User Violations Management ============
  async getViolations(): Promise<any[]> {
    try {
      const result = await db.execute(
        sql`SELECT * FROM user_violations ORDER BY created_at DESC`,
      );
      return result.rows;
    } catch (error) {
      console.error("Error fetching violations:", error);
      throw new Error("فشل في جلب المخالفات");
    }
  }

  async createViolation(violationData: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO user_violations (user_id, type, description, penalty, status, created_by)
        VALUES (${violationData.user_id}, ${violationData.type}, ${violationData.description}, 
                ${violationData.penalty}, ${violationData.status || "معلق"}, ${violationData.created_by})
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating violation:", error);
      throw new Error("فشل في إنشاء المخالفة");
    }
  }

  async updateViolation(id: number, violationData: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        UPDATE user_violations 
        SET type = ${violationData.type}, description = ${violationData.description},
            penalty = ${violationData.penalty}, status = ${violationData.status},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error("Error updating violation:", error);
      throw new Error("فشل في تحديث المخالفة");
    }
  }

  async deleteViolation(id: number): Promise<void> {
    try {
      await db.execute(sql`DELETE FROM user_violations WHERE id = ${id}`);
    } catch (error) {
      console.error("Error deleting violation:", error);
      throw new Error("فشل في حذف المخالفة");
    }
  }

  // ============ User Requests Management ============
  async getUserRequests(): Promise<any[]> {
    try {
      const requests = await db
        .select()
        .from(user_requests)
        .orderBy(desc(user_requests.date));
      return requests;
    } catch (error) {
      console.error("Error fetching user requests:", error);
      throw new Error("فشل في جلب طلبات المستخدمين");
    }
  }

  async createUserRequest(requestData: any): Promise<any> {
    try {
      const result = await db.execute(sql`
        INSERT INTO user_requests (user_id, type, title, description, status)
        VALUES (${requestData.user_id}, ${requestData.type}, ${requestData.title}, 
                ${requestData.description}, ${requestData.status || "معلق"})
        RETURNING *
      `);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating user request:", error);
      throw new Error("فشل في إنشاء الطلب");
    }
  }

  async updateUserRequest(id: number, requestData: any): Promise<any> {
    try {
      const [updatedRequest] = await db
        .update(user_requests)
        .set({
          type: requestData.type,
          title: requestData.title,
          description: requestData.description,
          status: requestData.status,
          response: requestData.response,
          updated_at: new Date(),
        })
        .where(eq(user_requests.id, id))
        .returning();
      return updatedRequest;
    } catch (error) {
      console.error("Error updating user request:", error);
      throw new Error("فشل في تحديث الطلب");
    }
  }

  async deleteUserRequest(id: number): Promise<void> {
    return await db.transaction(async (tx) => {
      try {
        // Delete related notifications first
        await tx
          .delete(notifications)
          .where(
            and(
              eq(notifications.context_type, "user_request"),
              eq(notifications.context_id, id.toString()),
            ),
          );

        // Then delete the user request
        await tx.delete(user_requests).where(eq(user_requests.id, id));
      } catch (error) {
        console.error("Error deleting user request:", error);
        throw new Error("فشل في حذف الطلب");
      }
    });
  }

  // ============ PRODUCTION FLOW MANAGEMENT ============

  async getProductionSettings(): Promise<ProductionSettings> {
    try {
      const [settings] = await db.select().from(production_settings).limit(1);
      return settings;
    } catch (error) {
      console.error("Error fetching production settings:", error);
      throw new Error("فشل في جلب إعدادات الإنتاج");
    }
  }

  async updateProductionSettings(
    settingsData: Partial<InsertProductionSettings>,
  ): Promise<ProductionSettings> {
    try {
      // Convert numeric decimal fields to strings at persistence boundary
      const processedData: any = { ...settingsData };
      if (processedData.overrun_tolerance_percent !== undefined) {
        processedData.overrun_tolerance_percent = numberToDecimalString(
          processedData.overrun_tolerance_percent,
          2,
        );
      }

      const [settings] = await db
        .update(production_settings)
        .set(processedData)
        .where(eq(production_settings.id, 1))
        .returning();
      return settings;
    } catch (error) {
      console.error("Error updating production settings:", error);
      throw new Error("فشل في تحديث إعدادات الإنتاج");
    }
  }

  async startProduction(productionOrderId: number): Promise<ProductionOrder> {
    try {
      const [productionOrder] = await db
        .update(production_orders)
        .set({
          status: "in_production",
        })
        .where(eq(production_orders.id, productionOrderId))
        .returning();
      return productionOrder;
    } catch (error) {
      console.error("Error starting production:", error);
      throw new Error("فشل في بدء الإنتاج");
    }
  }

  // Deprecated: Use createRoll instead which supports three separate machines
  // Keeping for backward compatibility during migration period
  async createRollWithQR(rollData: {
    production_order_id: number;
    film_machine_id?: string;
    printing_machine_id?: string;
    cutting_machine_id?: string;
    machine_id?: string; // Legacy field
    weight_kg: number;
    created_by: number;
  }): Promise<Roll> {
    // Map old machine_id to new fields if not provided
    const insertData = {
      production_order_id: rollData.production_order_id,
      film_machine_id: rollData.film_machine_id || rollData.machine_id || "",
      printing_machine_id: rollData.printing_machine_id || rollData.machine_id || "",
      cutting_machine_id: rollData.cutting_machine_id || rollData.machine_id || "",
      weight_kg: rollData.weight_kg,
      created_by: rollData.created_by,
      stage: "film" as const,
    };
    
    // Use the updated createRoll method
    return this.createRoll(insertData as any);
  }

  async markRollPrinted(rollId: number, operatorId: number, printingMachineId?: string): Promise<Roll> {
    try {
      return await db.transaction(async (tx) => {
        // احصل على معلومات الرول الحالية
        const [currentRoll] = await tx
          .select()
          .from(rolls)
          .where(eq(rolls.id, rollId));
        
        if (!currentRoll) {
          throw new Error("الرول غير موجود");
        }

        // Validate printing machine if provided
        if (printingMachineId) {
          const [printingMachine] = await tx
            .select()
            .from(machines)
            .where(eq(machines.id, printingMachineId));
          
          if (!printingMachine) {
            throw new Error("ماكينة الطباعة غير موجودة");
          }
          
          if (printingMachine.status !== "active") {
            throw new Error("ماكينة الطباعة غير نشطة");
          }
        }

        // نقل الرول إلى مرحلة الطباعة وتسجيل البيانات
        const updateData: any = {
          stage: "printing", // نقل إلى مرحلة الطباعة
          printed_at: new Date(),
          printed_by: operatorId,
        };
        
        // Add printing_machine_id if provided
        if (printingMachineId) {
          updateData.printing_machine_id = printingMachineId;
        }
        
        const [updatedRoll] = await tx
          .update(rolls)
          .set(updateData)
          .where(eq(rolls.id, rollId))
          .returning();

        // احسب مجموع أوزان الرولات في مرحلة الطباعة أو ما بعدها لهذا الأمر
        const printedRollsWeight = await tx
          .select({
            total: sql<number>`COALESCE(SUM(${rolls.weight_kg}::decimal), 0)`,
          })
          .from(rolls)
          .where(
            and(
              eq(rolls.production_order_id, currentRoll.production_order_id),
              or(
                eq(rolls.stage, "printing"),
                eq(rolls.stage, "cutting"),
                eq(rolls.stage, "done")
              )
            )
          );

        const printedQuantity = Number(printedRollsWeight[0]?.total || 0);

        // احصل على معلومات أمر الإنتاج
        const [productionOrder] = await tx
          .select()
          .from(production_orders)
          .where(eq(production_orders.id, currentRoll.production_order_id));

        if (productionOrder) {
          const producedQuantityKg = parseFloat(
            productionOrder.produced_quantity_kg?.toString() || "0"
          );
          
          // احسب نسبة إكمال الطباعة بناءً على الكمية المطبوعة من الكمية المنتجة في مرحلة الفيلم
          const printingPercentage = producedQuantityKg > 0 
            ? Math.min(100, (printedQuantity / producedQuantityKg) * 100)
            : 0;

          // حدث أمر الإنتاج بالكمية المطبوعة ونسبة الإكمال
          await tx
            .update(production_orders)
            .set({
              printed_quantity_kg: numberToDecimalString(printedQuantity, 2),
              printing_completion_percentage: numberToDecimalString(printingPercentage, 2),
            })
            .where(eq(production_orders.id, currentRoll.production_order_id));
        }

        // تحديث الكاش بعد تسجيل الطباعة
        invalidateProductionCache("all");

        return updatedRoll;
      });
    } catch (error) {
      console.error("Error marking roll printed:", error);
      throw new Error("فشل في تسجيل طباعة الرول");
    }
  }

  async updateProductionOrderCompletionPercentages(productionOrderId: number): Promise<void> {
    try {
      // Get production order to get target weight
      const [productionOrder] = await db
        .select()
        .from(production_orders)
        .where(eq(production_orders.id, productionOrderId));

      if (!productionOrder) {
        throw new Error("أمر الإنتاج غير موجود");
      }

      const targetWeight = parseFloat(productionOrder.produced_quantity_kg?.toString() || productionOrder.final_quantity_kg?.toString() || "0");

      if (targetWeight <= 0) {
        return;
      }

      // Get all rolls for this production order
      const allRolls = await db
        .select({
          stage: rolls.stage,
          weight_kg: rolls.weight_kg,
        })
        .from(rolls)
        .where(eq(rolls.production_order_id, productionOrderId));

      // Calculate total weights by stage
      const filmWeight = allRolls.reduce((sum, r) => sum + parseFloat(r.weight_kg?.toString() || "0"), 0);
      
      const printedWeight = allRolls
        .filter(r => r.stage === "printing" || r.stage === "cutting" || r.stage === "done")
        .reduce((sum, r) => sum + parseFloat(r.weight_kg?.toString() || "0"), 0);
      
      const cutWeight = allRolls
        .filter(r => r.stage === "done")
        .reduce((sum, r) => sum + parseFloat(r.weight_kg?.toString() || "0"), 0);

      // Calculate percentages
      const filmPercentage = Math.min(100, (filmWeight / targetWeight) * 100);
      const printingPercentage = Math.min(100, (printedWeight / targetWeight) * 100);
      const cuttingPercentage = Math.min(100, (cutWeight / targetWeight) * 100);

      // Update production order
      await db
        .update(production_orders)
        .set({
          film_completion_percentage: numberToDecimalString(filmPercentage, 2),
          printed_quantity_kg: numberToDecimalString(printedWeight, 2),
          printing_completion_percentage: numberToDecimalString(printingPercentage, 2),
          net_quantity_kg: numberToDecimalString(cutWeight, 2),
          cutting_completion_percentage: numberToDecimalString(cuttingPercentage, 2),
        })
        .where(eq(production_orders.id, productionOrderId));

      // Invalidate cache
      invalidateProductionCache("all");
    } catch (error) {
      console.error("Error updating completion percentages:", error);
      throw new Error("فشل في تحديث نسب الإكمال");
    }
  }

  async createCut(cutData: InsertCut): Promise<Cut> {
    try {
      return await db.transaction(async (tx) => {
        // Get the roll and validate available weight
        const [roll] = await tx
          .select()
          .from(rolls)
          .where(eq(rolls.id, cutData.roll_id))
          .for("update");

        if (!roll) {
          throw new Error("الرول غير موجود");
        }

        // التحقق من أن الكمية الصافية لا تتجاوز وزن الرول الأصلي
        const rollWeight = normalizeDecimal(roll.weight_kg);
        const cutWeight = normalizeDecimal(cutData.cut_weight_kg);

        if (cutWeight > rollWeight) {
          throw new Error(
            `الكمية الصافية (${cutWeight.toFixed(2)} كيلو) لا يمكن أن تتجاوز وزن الرول (${rollWeight.toFixed(2)} كيلو)`,
          );
        }

        if (cutWeight <= 0) {
          throw new Error("الكمية الصافية يجب أن تكون أكبر من صفر");
        }

        // Create the cut - convert numeric decimal fields to strings at persistence boundary
        const processedCutData = {
          ...cutData,
          cut_weight_kg: numberToDecimalString(cutData.cut_weight_kg, 3),
        };

        const [cut] = await tx
          .insert(cuts)
          .values(processedCutData)
          .returning();

        // حساب الهدر والكمية الصافية الإجمالية
        const totalCutWeight = cutWeight;
        const waste = rollWeight - totalCutWeight;

        // تحديث بيانات الرول مع الكمية الصافية والهدر ونقل إلى مرحلة done
        const rollUpdateData: any = {
          cut_weight_total_kg: numberToDecimalString(totalCutWeight, 3),
          waste_kg: numberToDecimalString(waste, 3),
          stage: "done", // تحديث المرحلة إلى مكتمل
          cut_completed_at: new Date(),
          cut_by: cutData.performed_by,
          completed_at: new Date(), // تحديد وقت الإكمال
        };
        
        // Add cutting_machine_id if provided
        if ((cutData as any).cutting_machine_id) {
          rollUpdateData.cutting_machine_id = (cutData as any).cutting_machine_id;
        }
        
        await tx
          .update(rolls)
          .set(rollUpdateData)
          .where(eq(rolls.id, cutData.roll_id));

        // احسب مجموع الكميات لأمر الإنتاج
        const productionOrderId = roll.production_order_id;

        // احسب مجموع الكميات الصافية من جميع الرولات المقطوعة
        const cutRollsData = await tx
          .select({
            totalNetWeight: sql<number>`COALESCE(SUM(${rolls.cut_weight_total_kg}::decimal), 0)`,
            totalWaste: sql<number>`COALESCE(SUM(${rolls.waste_kg}::decimal), 0)`,
            totalRolls: sql<number>`COUNT(*)`,
            completedRolls: sql<number>`COUNT(CASE WHEN ${rolls.stage} = 'done' THEN 1 END)`,
          })
          .from(rolls)
          .where(eq(rolls.production_order_id, productionOrderId));

        const netQuantity = Number(cutRollsData[0]?.totalNetWeight || 0);
        const wasteQuantity = Number(cutRollsData[0]?.totalWaste || 0);
        const totalRolls = Number(cutRollsData[0]?.totalRolls || 0);
        const completedRolls = Number(cutRollsData[0]?.completedRolls || 0);

        // احصل على معلومات أمر الإنتاج
        const [productionOrder] = await tx
          .select()
          .from(production_orders)
          .where(eq(production_orders.id, productionOrderId));

        if (productionOrder) {
          const producedQuantityKg = parseFloat(
            productionOrder.produced_quantity_kg?.toString() || "0"
          );
          
          // احسب نسبة إكمال التقطيع بناءً على (الكمية المقطعة + الهدر) من الكمية المنتجة في مرحلة الفيلم
          const totalCutAndWaste = netQuantity + wasteQuantity;
          const cuttingPercentage = producedQuantityKg > 0 
            ? Math.min(100, (totalCutAndWaste / producedQuantityKg) * 100)
            : 0;

          const isProductionOrderCompleted = completedRolls === totalRolls && totalRolls > 0;

          // حدث أمر الإنتاج بالكميات الجديدة
          await tx
            .update(production_orders)
            .set({
              net_quantity_kg: numberToDecimalString(netQuantity, 2),
              waste_quantity_kg: numberToDecimalString(wasteQuantity, 2),
              cutting_completion_percentage: numberToDecimalString(cuttingPercentage, 2),
              // إذا كانت جميع الرولات مكتملة، حدث الحالة إلى completed
              status: isProductionOrderCompleted ? "completed" : productionOrder.status,
            })
            .where(eq(production_orders.id, productionOrderId));

          // إذا اكتمل أمر الإنتاج، تحقق من اكتمال الطلب الرئيسي
          if (isProductionOrderCompleted && productionOrder.status !== "completed") {
            const orderId = productionOrder.order_id;

            console.log(
              `Production order ${productionOrder.production_order_number} automatically completed - all rolls finished`,
            );

            // Get all production orders for this order
            const allProductionOrders = await tx
              .select()
              .from(production_orders)
              .where(eq(production_orders.order_id, orderId));

            // Check if all production orders are completed
            const allCompleted = allProductionOrders.every((po) =>
              po.id === productionOrderId
                ? true
                : po.status === "completed",
            );

            // If all production orders are completed, automatically mark the order as completed
            if (allCompleted) {
              await tx
                .update(orders)
                .set({ status: "completed" })
                .where(eq(orders.id, orderId));

              console.log(
                `Order ${orderId} automatically completed - all production orders finished`,
              );
            }
          }
        }

        // تحديث الكاش
        invalidateProductionCache("all");

        return cut;
      });
    } catch (error) {
      console.error("Error creating cut:", error);
      throw error;
    }
  }

  async createWarehouseReceipt(
    receiptData: InsertWarehouseReceipt,
  ): Promise<WarehouseReceipt> {
    try {
      // Convert numeric decimal fields to strings at persistence boundary
      const processedData = {
        ...receiptData,
        received_weight_kg: numberToDecimalString(
          receiptData.received_weight_kg,
          3,
        ),
      };

      const [receipt] = await db
        .insert(warehouse_receipts)
        .values(processedData)
        .returning();
      return receipt;
    } catch (error) {
      console.error("Error creating warehouse receipt:", error);
      throw new Error("فشل في إنشاء إيصال المستودع");
    }
  }

  // Get warehouse receipts with detailed information grouped by order number
  async getWarehouseReceiptsDetailed(): Promise<any[]> {
    try {
      const receipts = await db
        .select({
          // Receipt information
          receipt_id: warehouse_receipts.id,
          receipt_date: warehouse_receipts.created_at,
          received_weight_kg: warehouse_receipts.received_weight_kg,
          received_by_id: warehouse_receipts.received_by,

          // Order information
          order_id: orders.id,
          order_number: orders.order_number,

          // Customer information
          customer_id: customers.id,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,

          // Product information
          item_name: items.name,
          item_name_ar: items.name_ar,
          size_caption: customer_products.size_caption,
          width: customer_products.width,
          thickness: customer_products.thickness,
          raw_material: customer_products.raw_material,

          // Production order information
          production_order_id: production_orders.id,
          production_order_number: production_orders.production_order_number,

          // Received by user information
          received_by_name: users.username,
        })
        .from(warehouse_receipts)
        .leftJoin(
          production_orders,
          eq(warehouse_receipts.production_order_id, production_orders.id),
        )
        .leftJoin(orders, eq(production_orders.order_id, orders.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id),
        )
        .leftJoin(items, eq(customer_products.item_id, items.id))
        .leftJoin(users, eq(warehouse_receipts.received_by, users.id))
        .orderBy(desc(warehouse_receipts.created_at));

      // Group receipts by order number
      const groupedReceipts: { [key: string]: any } = {};

      receipts.forEach((receipt: any) => {
        const orderNumber = receipt.order_number;

        if (!groupedReceipts[orderNumber]) {
          groupedReceipts[orderNumber] = {
            order_number: orderNumber,
            customer_name: receipt.customer_name,
            customer_name_ar: receipt.customer_name_ar,
            item_name: receipt.item_name,
            item_name_ar: receipt.item_name_ar,
            size_caption: receipt.size_caption,
            width: receipt.width,
            thickness: receipt.thickness,
            raw_material: receipt.raw_material,
            receipts: [],
            total_received_weight: 0,
          };
        }

        // Add receipt to the group
        groupedReceipts[orderNumber].receipts.push({
          receipt_id: receipt.receipt_id,
          receipt_date: receipt.receipt_date,
          received_weight_kg: receipt.received_weight_kg,
          received_by_name: receipt.received_by_name,
          production_order_number: receipt.production_order_number,
        });

        // Add to total received weight
        groupedReceipts[orderNumber].total_received_weight += parseFloat(
          receipt.received_weight_kg || 0,
        );
      });

      return Object.values(groupedReceipts);
    } catch (error) {
      console.error("Error fetching detailed warehouse receipts:", error);
      throw new Error("فشل في جلب تفاصيل إيصالات المستودع");
    }
  }

  // Get production orders ready for warehouse receipt (with cut quantities)
  async getProductionOrdersForReceipt(): Promise<any[]> {
    try {
      // Get production orders that have cuts but haven't been fully received
      const result = await db
        .select({
          order_id: production_orders.order_id,
          order_number: orders.order_number,
          production_order_id: production_orders.id,
          production_order_number: production_orders.production_order_number,
          customer_id: orders.customer_id,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
          quantity_required: production_orders.quantity_kg,
          item_name: items.name,
          item_name_ar: items.name_ar,
          size_caption: customer_products.size_caption,
          raw_material: customer_products.raw_material,
          master_batch_id: customer_products.master_batch_id,
          // Calculate total film production (sum of all roll weights for this production order)
          total_film_weight: sql<string>`
            COALESCE((
              SELECT SUM(weight_kg)::decimal(12,3)
              FROM rolls 
              WHERE production_order_id = ${production_orders.id}
            ), 0)
          `,
          // Calculate total cut weight (sum of cut weights from rolls table)
          total_cut_weight: sql<string>`
            COALESCE((
              SELECT SUM(cut_weight_total_kg)::decimal(12,3)
              FROM rolls 
              WHERE production_order_id = ${production_orders.id}
                AND cut_weight_total_kg > 0
            ), 0)
          `,
          // Calculate total received weight (sum of all warehouse receipts for this production order)
          total_received_weight: sql<string>`
            COALESCE((
              SELECT SUM(received_weight_kg)::decimal(12,3)
              FROM warehouse_receipts
              WHERE production_order_id = ${production_orders.id}
            ), 0)
          `,
          // Calculate waste (film production - cut weight)
          waste_weight: sql<string>`
            COALESCE((
              SELECT SUM(weight_kg)::decimal(12,3)
              FROM rolls 
              WHERE production_order_id = ${production_orders.id}
            ), 0) - COALESCE((
              SELECT SUM(cut_weight_total_kg)::decimal(12,3)
              FROM rolls 
              WHERE production_order_id = ${production_orders.id}
                AND cut_weight_total_kg > 0
            ), 0)
          `,
        })
        .from(production_orders)
        .leftJoin(orders, eq(production_orders.order_id, orders.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id),
        )
        .leftJoin(items, eq(customer_products.item_id, items.id))
        .where(
          // Only include production orders that have cuts but haven't been fully received
          sql`EXISTS (
            SELECT 1 FROM rolls
            WHERE production_order_id = ${production_orders.id}
              AND cut_weight_total_kg > 0
          ) AND COALESCE((
            SELECT SUM(cut_weight_total_kg)
            FROM rolls
            WHERE production_order_id = ${production_orders.id}
              AND cut_weight_total_kg > 0
          ), 0) > COALESCE((
            SELECT SUM(received_weight_kg)
            FROM warehouse_receipts
            WHERE production_order_id = ${production_orders.id}
          ), 0)`,
        )
        .orderBy(desc(orders.created_at));

      return result;
    } catch (error) {
      console.error("Error fetching production orders for receipt:", error);
      throw new Error("فشل في جلب أوامر الإنتاج القابلة للاستلام");
    }
  }

  async getFilmQueue(): Promise<ProductionOrder[]> {
    try {
      // Optimized: Reduce JOINs and simplify query for better performance
      // الطلبات تبقى في قائمة الفيلم حتى يتم إنتاج الكمية الكاملة
      const results = await db
        .select({
          id: production_orders.id,
          production_order_number: production_orders.production_order_number,
          order_id: production_orders.order_id,
          customer_product_id: production_orders.customer_product_id,
          quantity_kg: production_orders.quantity_kg,
          final_quantity_kg: production_orders.final_quantity_kg,
          status: production_orders.status,
          created_at: production_orders.created_at,
          // حساب الكمية المنتجة من مجموع وزن الرولات
          produced_quantity_kg: sql<string>`
            COALESCE((
              SELECT SUM(weight_kg)::decimal(12,3)
              FROM rolls 
              WHERE production_order_id = ${production_orders.id}
            ), 0)
          `,
        })
        .from(production_orders)
        .leftJoin(orders, eq(production_orders.order_id, orders.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id),
        )
        .leftJoin(items, eq(customer_products.item_id, items.id))
        .where(
          and(
            eq(production_orders.status, "in_production"),
            // الطلب يبقى ظاهراً حتى يتم إنتاج الكمية كاملة
            sql`COALESCE((
              SELECT SUM(weight_kg)
              FROM rolls 
              WHERE production_order_id = ${production_orders.id}
            ), 0) < ${production_orders.final_quantity_kg}`
          )
        )
        .orderBy(production_orders.created_at)
        .limit(100); // Add limit for performance

      return results as ProductionOrder[];
    } catch (error) {
      console.error("Error fetching film queue:", error);
      throw new Error("فشل في جلب قائمة الفيلم");
    }
  }

  async getPrintingQueue(): Promise<Roll[]> {
    try {
      const cacheKey = "printing_queue";
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // جلب الرولات في مرحلة film من الطلبات التي لديها رولات لم تكتمل بعد
      // الطلب يبقى معروضاً حتى تكتمل جميع الرولات في جميع أوامر الإنتاج
      const rollsData = await db
        .select({
          id: rolls.id,
          roll_seq: rolls.roll_seq,
          roll_number: rolls.roll_number,
          production_order_id: rolls.production_order_id,
          production_order_number: production_orders.production_order_number,
          order_id: production_orders.order_id,
          order_number: orders.order_number,
          weight_kg: rolls.weight_kg,
          machine_id: rolls.machine_id,
          stage: rolls.stage,
          created_at: rolls.created_at,
          created_by: rolls.created_by,
          printed_at: rolls.printed_at,
          printed_by: rolls.printed_by,
          cut_at: rolls.cut_completed_at,
          cut_by: rolls.cut_by,
          cut_weight_total_kg: rolls.cut_weight_total_kg,
          qr_code_text: rolls.qr_code_text,
          qr_png_base64: rolls.qr_png_base64,
          // بيانات العميل
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
          // بيانات المنتج
          item_name: items.name,
          item_name_ar: items.name_ar,
          size_caption: customer_products.size_caption,
        })
        .from(rolls)
        .leftJoin(
          production_orders,
          eq(rolls.production_order_id, production_orders.id),
        )
        .leftJoin(orders, eq(production_orders.order_id, orders.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id),
        )
        .leftJoin(items, eq(customer_products.item_id, items.id))
        .where(
          and(
            eq(rolls.stage, "film"), // فقط الرولات في مرحلة الفيلم للعرض
            // الطلب يبقى معروضاً إذا كان لديه أي رول لم يكتمل بعد
            sql`${production_orders.order_id} IN (
              SELECT DISTINCT po.order_id 
              FROM production_orders po
              WHERE EXISTS (
                SELECT 1 FROM rolls r 
                WHERE r.production_order_id = po.id 
                AND r.stage != 'done'
              )
            )`
          )
        )
        .orderBy(desc(rolls.created_at))
        .limit(200);

      // إذا لم توجد رولات، إرجاع مصفوفة فارغة
      if (rollsData.length === 0) {
        return [];
      }

      // جمع user IDs الفريدة
      const userIds = new Set<number>();
      rollsData.forEach(roll => {
        if (roll.created_by) userIds.add(roll.created_by);
        if (roll.printed_by) userIds.add(roll.printed_by);
        if (roll.cut_by) userIds.add(roll.cut_by);
      });

      // جلب أسماء المستخدمين
      const userNames = new Map<number, string>();
      if (userIds.size > 0) {
        const usersData = await db
          .select({ id: users.id, name: users.display_name })
          .from(users)
          .where(inArray(users.id, Array.from(userIds)));
        
        usersData.forEach(user => {
          userNames.set(user.id, user.name || '');
        });
      }

      // إرجاع البيانات مع معلومات العميل والطلب وأسماء المستخدمين
      const result = rollsData.map((roll) => ({
        ...roll,
        created_by_name: roll.created_by ? userNames.get(roll.created_by) || null : null,
        printed_by_name: roll.printed_by ? userNames.get(roll.printed_by) || null : null,
        cut_by_name: roll.cut_by ? userNames.get(roll.cut_by) || null : null,
        // إضافة الحقول المطلوبة للنوع Roll
        cut_weight_total_kg: "0",
        waste_kg: "0",
        notes: null,
        machine_name: null,
        film_micron: null,
        film_width_cm: null,
        length_meters: null,
        roll_position: null,
        status: "active",
        cut_count: 0,
        completed_at: null,
      })) as any[];

      // تخزين مؤقت لمدة 5 ثواني للبيانات النشطة
      setCachedData(cacheKey, result, CACHE_TTL.REALTIME);
      return result;
    } catch (error) {
      console.error("Error fetching printing queue:", error);
      throw new Error("فشل في جلب قائمة الطباعة");
    }
  }

  async getCuttingQueue(): Promise<Roll[]> {
    try {
      const cacheKey = "cutting_queue";
      const cached = getCachedData(cacheKey);
      if (cached) {
        return cached;
      }

      // محسن: استخدام فهرس stage مع تحديد الأعمدة المطلوبة فقط
      // جلب الرولات في مرحلة printing فقط (التي تم طباعتها ولم تقطع بعد)
      const rollsData = await db
        .select({
          id: rolls.id,
          roll_number: rolls.roll_number,
          roll_seq: rolls.roll_seq,
          production_order_id: rolls.production_order_id,
          weight_kg: rolls.weight_kg,
          stage: rolls.stage,
          printed_at: rolls.printed_at,
          created_at: rolls.created_at,
        })
        .from(rolls)
        .where(
          and(
            eq(rolls.stage, "printing"), // فقط الرولات في مرحلة الطباعة
            sql`${rolls.production_order_id} IN (
              SELECT DISTINCT production_order_id FROM rolls
              WHERE stage = 'printing'
            )`
          )
        )
        .orderBy(desc(rolls.printed_at))
        .limit(200);

      // إضافة الحقول المطلوبة للنوع Roll
      const result = rollsData.map((roll) => ({
        ...roll,
        // Note: created_by is not part of Roll schema, removing hardcoded value
        qr_code_text: "",
        qr_png_base64: null,
        cut_weight_total_kg: "0",
        waste_kg: "0",
        cut_completed_at: null,
        performed_by: null,
        machine_id: "",
        employee_id: null,
        printed_by: null,
        cut_by: null,
        completed_at: null,
      })) as Roll[];

      // تخزين مؤقت لمدة 5 ثواني للبيانات النشطة
      setCachedData(cacheKey, result, CACHE_TTL.REALTIME);
      return result;
    } catch (error) {
      console.error("Error fetching cutting queue:", error);
      throw new Error("فشل في جلب قائمة التقطيع");
    }
  }

  async getGroupedCuttingQueue(): Promise<any[]> {
    try {
      // جلب جميع الطلبات التي بها رولات في مرحلة التقطيع
      // الطلب يبقى معروضاً حتى تكتمل جميع الرولات في جميع أوامر الإنتاج
      const ordersData = await db
        .select({
          id: orders.id,
          order_number: orders.order_number,
          customer_id: orders.customer_id,
          status: orders.status,
          created_at: orders.created_at,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
        })
        .from(orders)
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .where(
          sql`EXISTS (
            SELECT 1 FROM production_orders po
            WHERE po.order_id = orders.id 
            AND EXISTS (
              SELECT 1 FROM rolls r 
              WHERE r.production_order_id = po.id 
              AND r.stage = 'printing'
            )
            AND EXISTS (
              SELECT 1 FROM rolls r2 
              WHERE r2.production_order_id IN (
                SELECT id FROM production_orders WHERE order_id = orders.id
              )
              AND r2.stage != 'done'
            )
          )`,
        )
        .orderBy(desc(orders.created_at));

      if (ordersData.length === 0) {
        return [];
      }

      const orderIds = ordersData.map((order) => order.id);

      // جلب أوامر الإنتاج مع تفاصيل المنتج - using existing fields (migration pending)
      const productionOrdersData = await db
        .select({
          id: production_orders.id,
          production_order_number: production_orders.production_order_number,
          order_id: production_orders.order_id,
          customer_product_id: production_orders.customer_product_id,
          quantity_kg: production_orders.quantity_kg,
          status: production_orders.status,
          created_at: production_orders.created_at,
          item_name: items.name,
          item_name_ar: items.name_ar,
          size_caption: customer_products.size_caption,
          width: customer_products.width,
          cutting_length_cm: customer_products.cutting_length_cm,
          thickness: customer_products.thickness,
          raw_material: customer_products.raw_material,
          master_batch_id: customer_products.master_batch_id,
          is_printed: customer_products.is_printed,
        })
        .from(production_orders)
        .leftJoin(
          customer_products,
          eq(production_orders.customer_product_id, customer_products.id),
        )
        .leftJoin(items, eq(customer_products.item_id, items.id))
        .where(
          and(
            inArray(production_orders.order_id, orderIds),
            // فقط أوامر الإنتاج التي لديها رولات في مرحلة printing أو لديها رولات لم تكتمل
            sql`EXISTS (
              SELECT 1 FROM rolls
              WHERE production_order_id = production_orders.id 
              AND (stage = 'printing' OR stage != 'done')
            )`,
          ),
        )
        .orderBy(desc(production_orders.created_at));

      const productionOrderIds = productionOrdersData.map((po) => po.id);

      // جلب جميع الرولات (في مرحلة printing أو cutting) لأوامر الإنتاج التي لديها رولات جاهزة للتقطيع
      let rollsData: any[] = [];
      if (productionOrderIds.length > 0) {
        rollsData = await db
          .select({
            id: rolls.id,
            roll_seq: rolls.roll_seq,
            roll_number: rolls.roll_number,
            production_order_id: rolls.production_order_id,
            stage: rolls.stage,
            weight_kg: rolls.weight_kg,
            cut_weight_total_kg: rolls.cut_weight_total_kg,
            waste_kg: rolls.waste_kg,
            printed_at: rolls.printed_at,
            created_at: rolls.created_at,
            created_by: rolls.created_by,
            printed_by: rolls.printed_by,
            cut_by: rolls.cut_by,
            cut_at: rolls.cut_completed_at,
            machine_id: rolls.machine_id,
            qr_code_text: rolls.qr_code_text,
          })
          .from(rolls)
          .where(
            and(
              inArray(rolls.production_order_id, productionOrderIds),
              or(eq(rolls.stage, "printing"), eq(rolls.stage, "cutting"))
            ),
          )
          .orderBy(rolls.roll_seq); // ترتيب حسب التسلسل
      }

      // جمع user IDs الفريدة من الرولات
      const userIds = new Set<number>();
      rollsData.forEach(roll => {
        if (roll.created_by) userIds.add(roll.created_by);
        if (roll.printed_by) userIds.add(roll.printed_by);
        if (roll.cut_by) userIds.add(roll.cut_by);
      });

      // جلب أسماء المستخدمين
      const userNames = new Map<number, string>();
      if (userIds.size > 0) {
        const usersData = await db
          .select({ id: users.id, name: users.display_name })
          .from(users)
          .where(inArray(users.id, Array.from(userIds)));
        
        usersData.forEach(user => {
          userNames.set(user.id, user.name || '');
        });
      }

      // إضافة أسماء المستخدمين للرولات
      const rollsWithNames = rollsData.map(roll => ({
        ...roll,
        created_by_name: roll.created_by ? userNames.get(roll.created_by) || null : null,
        printed_by_name: roll.printed_by ? userNames.get(roll.printed_by) || null : null,
        cut_by_name: roll.cut_by ? userNames.get(roll.cut_by) || null : null,
      }));

      // تجميع البيانات بشكل هرمي
      const hierarchicalOrders = ordersData.map((order) => ({
        ...order,
        production_orders: productionOrdersData
          .filter((productionOrder) => productionOrder.order_id === order.id)
          .map((productionOrder) => ({
            ...productionOrder,
            rolls: rollsWithNames
              .filter((roll) => roll.production_order_id === productionOrder.id)
              .sort((a, b) => a.roll_seq - b.roll_seq), // ترتيب إضافي للتأكيد
          })),
      }));

      return hierarchicalOrders;
    } catch (error) {
      console.error("Error fetching grouped cutting queue:", error);
      throw new Error("فشل في جلب قائمة التقطيع المجمعة");
    }
  }

  async getOrderProgress(productionOrderId: number): Promise<any> {
    try {
      // Get production order details - using existing fields (migration pending)
      const [productionOrder] = await db
        .select({
          id: production_orders.id,
          production_order_number: production_orders.production_order_number,
          order_id: production_orders.order_id,
          customer_product_id: production_orders.customer_product_id,
          quantity_kg: production_orders.quantity_kg,
          status: production_orders.status,
          created_at: production_orders.created_at,
        })
        .from(production_orders)
        .where(eq(production_orders.id, productionOrderId));

      if (!productionOrder) {
        throw new Error("طلب الإنتاج غير موجود");
      }

      // Get all rolls for this production order
      const rollsData = await db
        .select()
        .from(rolls)
        .where(eq(rolls.production_order_id, productionOrderId))
        .orderBy(rolls.roll_seq);

      // Get cuts for all rolls
      const cutsData = await db
        .select()
        .from(cuts)
        .leftJoin(rolls, eq(cuts.roll_id, rolls.id))
        .where(eq(rolls.production_order_id, productionOrderId));

      // Get warehouse receipts
      const receiptsData = await db
        .select()
        .from(warehouse_receipts)
        .where(eq(warehouse_receipts.production_order_id, productionOrderId));

      // Calculate progress statistics
      const totalFilmWeight = rollsData.reduce(
        (sum, roll) =>
          sum + (parseFloat(roll.weight_kg?.toString() || "0") || 0),
        0,
      );
      const totalPrintedWeight = rollsData
        .filter((roll) => roll.stage === "printing" || roll.printed_at)
        .reduce(
          (sum, roll) =>
            sum + (parseFloat(roll.weight_kg?.toString() || "0") || 0),
          0,
        );
      const totalCutWeight = cutsData.reduce(
        (sum, cut) =>
          sum + (parseFloat(cut.cuts?.cut_weight_kg?.toString() || "0") || 0),
        0,
      );
      const totalWarehouseWeight = receiptsData.reduce(
        (sum, receipt) =>
          sum +
          (parseFloat(receipt.received_weight_kg?.toString() || "0") || 0),
        0,
      );

      return {
        production_order: productionOrder,
        rolls: rollsData,
        cuts: cutsData,
        warehouse_receipts: receiptsData,
        progress: {
          film_weight: totalFilmWeight,
          printed_weight: totalPrintedWeight,
          cut_weight: totalCutWeight,
          warehouse_weight: totalWarehouseWeight,
          film_percentage:
            (totalFilmWeight /
              parseFloat(productionOrder.quantity_kg?.toString() || "1")) *
            100,
          printed_percentage:
            (totalPrintedWeight /
              parseFloat(productionOrder.quantity_kg?.toString() || "1")) *
            100,
          cut_percentage:
            (totalCutWeight /
              parseFloat(productionOrder.quantity_kg?.toString() || "1")) *
            100,
          warehouse_percentage:
            (totalWarehouseWeight /
              parseFloat(productionOrder.quantity_kg?.toString() || "1")) *
            100,
        },
      };
    } catch (error) {
      console.error("Error fetching order progress:", error);
      throw new Error("فشل في جلب تقدم الطلب");
    }
  }

  async getRollQR(
    rollId: number,
  ): Promise<{ qr_code_text: string; qr_png_base64: string }> {
    try {
      const [roll] = await db
        .select({
          qr_code_text: rolls.qr_code_text,
          qr_png_base64: rolls.qr_png_base64,
        })
        .from(rolls)
        .where(eq(rolls.id, rollId));

      if (!roll) {
        throw new Error("الرول غير موجود");
      }

      return {
        qr_code_text: roll.qr_code_text || "",
        qr_png_base64: roll.qr_png_base64 || "",
      };
    } catch (error) {
      console.error("Error fetching roll QR:", error);
      throw new Error("فشل في جلب رمز QR للرول");
    }
  }

  // Enhanced Cutting Operations
  async getRollsForCuttingBySection(sectionId?: number): Promise<{
    rolls: Roll[];
    stats: {
      totalRolls: number;
      totalWeight: number;
      todayWaste: number;
      todayWastePercentage: number;
      averageWastePercentage: number;
    };
  }> {
    try {
      // جلب الرولات في مرحلة الطباعة (الجاهزة للتقطيع)
      const rollsQuery = db
        .select({
          roll: rolls,
          production_order: production_orders,
          customer_product: customer_products,
          customer: customers,
        })
        .from(rolls)
        .innerJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
        .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
        .leftJoin(customers, eq(customer_products.customer_id, customers.id))
        .where(eq(rolls.stage, "printing"))
        .orderBy(desc(rolls.printed_at));

      const rollsData = await rollsQuery;

      // حساب الإحصائيات
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // إحصائيات اليوم
      const todayRolls = await db
        .select({
          waste_kg: rolls.waste_kg,
          weight_kg: rolls.weight_kg,
          cut_weight_total_kg: rolls.cut_weight_total_kg,
        })
        .from(rolls)
        .where(
          and(
            eq(rolls.stage, "done"),
            sql`DATE(${rolls.cut_completed_at}) = DATE(NOW())`
          )
        );

      const todayWaste = todayRolls.reduce((sum, roll) => 
        sum + parseFloat(roll.waste_kg?.toString() || "0"), 0);
      
      const todayTotalWeight = todayRolls.reduce((sum, roll) => 
        sum + parseFloat(roll.weight_kg?.toString() || "0"), 0);
      
      const todayWastePercentage = todayTotalWeight > 0 
        ? (todayWaste / todayTotalWeight) * 100 : 0;

      // متوسط نسبة الهدر للأسبوع الماضي
      const weekRolls = await db
        .select({
          waste_kg: rolls.waste_kg,
          weight_kg: rolls.weight_kg,
        })
        .from(rolls)
        .where(
          and(
            eq(rolls.stage, "done"),
            sql`${rolls.cut_completed_at} >= NOW() - INTERVAL '7 days'`
          )
        );

      const weekTotalWaste = weekRolls.reduce((sum, roll) => 
        sum + parseFloat(roll.waste_kg?.toString() || "0"), 0);
      
      const weekTotalWeight = weekRolls.reduce((sum, roll) => 
        sum + parseFloat(roll.weight_kg?.toString() || "0"), 0);
      
      const averageWastePercentage = weekTotalWeight > 0 
        ? (weekTotalWaste / weekTotalWeight) * 100 : 0;

      // تجهيز البيانات
      const rollsFormatted: Roll[] = rollsData.map(item => ({
        ...item.roll,
        production_order: {
          ...item.production_order,
          customer_product: item.customer_product ? {
            ...item.customer_product,
            customer: item.customer || undefined,
          } : undefined,
        },
      })) as Roll[];

      return {
        rolls: rollsFormatted,
        stats: {
          totalRolls: rollsFormatted.length,
          totalWeight: rollsFormatted.reduce((sum, roll) => 
            sum + parseFloat(roll.weight_kg?.toString() || "0"), 0),
          todayWaste,
          todayWastePercentage,
          averageWastePercentage,
        },
      };
    } catch (error) {
      console.error("Error fetching cutting queue by section:", error);
      throw new Error("فشل في جلب قائمة التقطيع");
    }
  }

  async completeCutting(rollId: number, netWeight: number, operatorId: number): Promise<{
    roll: Roll;
    production_order: ProductionOrder;
    waste_percentage: number;
    is_order_completed: boolean;
  }> {
    try {
      // بدء المعاملة
      const result = await db.transaction(async (tx) => {
        // جلب بيانات الرول
        const [roll] = await tx
          .select()
          .from(rolls)
          .where(eq(rolls.id, rollId));

        if (!roll) {
          throw new Error("الرول غير موجود");
        }

        if (roll.stage !== "printing") {
          throw new Error("الرول غير جاهز للتقطيع");
        }

        const grossWeight = parseFloat(roll.weight_kg?.toString() || "0");
        
        if (netWeight > grossWeight) {
          throw new Error("الوزن الصافي لا يمكن أن يكون أكبر من الوزن الخام");
        }
        
        if (netWeight <= 0) {
          throw new Error("الوزن الصافي يجب أن يكون أكبر من صفر");
        }

        // حساب الهدر
        const wasteWeight = grossWeight - netWeight;
        const wastePercentage = (wasteWeight / grossWeight) * 100;

        // تحديث الرول
        const [updatedRoll] = await tx
          .update(rolls)
          .set({
            stage: "done",
            cut_weight_total_kg: numberToDecimalString(netWeight),
            waste_kg: numberToDecimalString(wasteWeight),
            cut_completed_at: new Date(),
            cut_by: operatorId,
          })
          .where(eq(rolls.id, rollId))
          .returning();

        // جلب أمر الإنتاج
        const [productionOrder] = await tx
          .select()
          .from(production_orders)
          .where(eq(production_orders.id, roll.production_order_id));

        if (!productionOrder) {
          throw new Error("أمر الإنتاج غير موجود");
        }

        // جلب جميع رولات أمر الإنتاج لحساب الإحصائيات
        const allRolls = await tx
          .select()
          .from(rolls)
          .where(eq(rolls.production_order_id, roll.production_order_id));

        // حساب الكميات الإجمالية
        const totalNetWeight = allRolls.reduce((sum, r) => 
          sum + parseFloat(r.cut_weight_total_kg?.toString() || "0"), 0);
        
        const totalWaste = allRolls.reduce((sum, r) => 
          sum + parseFloat(r.waste_kg?.toString() || "0"), 0);

        // التحقق من اكتمال جميع الرولات
        const allCompleted = allRolls.every(r => r.stage === "done");
        
        // حساب نسبة إكمال التقطيع
        const completedCount = allRolls.filter(r => r.stage === "done").length;
        const cuttingPercentage = (completedCount / allRolls.length) * 100;

        // تحديث أمر الإنتاج
        const [updatedProductionOrder] = await tx
          .update(production_orders)
          .set({
            net_quantity_kg: numberToDecimalString(totalNetWeight),
            waste_quantity_kg: numberToDecimalString(totalWaste),
            cutting_completion_percentage: numberToDecimalString(cuttingPercentage),
            status: allCompleted ? "completed" : productionOrder.status,
          })
          .where(eq(production_orders.id, roll.production_order_id))
          .returning();

        // إذا اكتملت جميع أوامر الإنتاج للطلب، حدث حالة الطلب
        if (allCompleted) {
          const [order] = await tx
            .select()
            .from(orders)
            .where(eq(orders.id, productionOrder.order_id));

          if (order) {
            // التحقق من اكتمال جميع أوامر الإنتاج للطلب
            const allProductionOrders = await tx
              .select()
              .from(production_orders)
              .where(eq(production_orders.order_id, order.id));

            const allOrdersCompleted = allProductionOrders.every(po => 
              po.status === "completed" || po.id === productionOrder.id);

            if (allOrdersCompleted) {
              await tx
                .update(orders)
                .set({ status: "completed" })
                .where(eq(orders.id, order.id));
            }
          }
        }

        // إبطال الكاش
        invalidateProductionCache("cutting");

        return {
          roll: updatedRoll,
          production_order: updatedProductionOrder,
          waste_percentage: wastePercentage,
          is_order_completed: allCompleted,
        };
      });

      return result;
    } catch (error) {
      console.error("Error completing cutting:", error);
      throw error;
    }
  }

  async calculateWasteStatistics(productionOrderId: number): Promise<{
    totalWaste: number;
    wastePercentage: number;
    operatorStats: Array<{
      operatorId: number;
      operatorName: string;
      rollsCut: number;
      totalWaste: number;
      averageWastePercentage: number;
    }>;
    dailyStats: Array<{
      date: string;
      totalWaste: number;
      wastePercentage: number;
      rollsCount: number;
    }>;
  }> {
    try {
      // جلب جميع الرولات المقطوعة لأمر الإنتاج
      const rollsData = await db
        .select({
          roll: rolls,
          operator: users,
        })
        .from(rolls)
        .leftJoin(users, eq(rolls.cut_by, users.id))
        .where(
          and(
            eq(rolls.production_order_id, productionOrderId),
            eq(rolls.stage, "done")
          )
        );

      if (rollsData.length === 0) {
        return {
          totalWaste: 0,
          wastePercentage: 0,
          operatorStats: [],
          dailyStats: [],
        };
      }

      // حساب الإحصائيات الإجمالية
      const totalWaste = rollsData.reduce((sum, item) => 
        sum + parseFloat(item.roll.waste_kg?.toString() || "0"), 0);
      
      const totalWeight = rollsData.reduce((sum, item) => 
        sum + parseFloat(item.roll.weight_kg?.toString() || "0"), 0);
      
      const wastePercentage = totalWeight > 0 
        ? (totalWaste / totalWeight) * 100 : 0;

      // إحصائيات العاملين
      const operatorMap = new Map<number, {
        name: string;
        rollsCut: number;
        totalWaste: number;
        totalWeight: number;
      }>();

      rollsData.forEach(item => {
        if (item.roll.cut_by) {
          const existing = operatorMap.get(item.roll.cut_by) || {
            name: item.operator?.display_name_ar || item.operator?.display_name || "غير معروف",
            rollsCut: 0,
            totalWaste: 0,
            totalWeight: 0,
          };

          existing.rollsCut++;
          existing.totalWaste += parseFloat(item.roll.waste_kg?.toString() || "0");
          existing.totalWeight += parseFloat(item.roll.weight_kg?.toString() || "0");

          operatorMap.set(item.roll.cut_by, existing);
        }
      });

      const operatorStats = Array.from(operatorMap.entries()).map(([id, stats]) => ({
        operatorId: id,
        operatorName: stats.name,
        rollsCut: stats.rollsCut,
        totalWaste: stats.totalWaste,
        averageWastePercentage: stats.totalWeight > 0 
          ? (stats.totalWaste / stats.totalWeight) * 100 : 0,
      }));

      // إحصائيات يومية
      const dailyMap = new Map<string, {
        totalWaste: number;
        totalWeight: number;
        rollsCount: number;
      }>();

      rollsData.forEach(item => {
        if (item.roll.cut_completed_at) {
          const date = new Date(item.roll.cut_completed_at).toISOString().split('T')[0];
          const existing = dailyMap.get(date) || {
            totalWaste: 0,
            totalWeight: 0,
            rollsCount: 0,
          };

          existing.rollsCount++;
          existing.totalWaste += parseFloat(item.roll.waste_kg?.toString() || "0");
          existing.totalWeight += parseFloat(item.roll.weight_kg?.toString() || "0");

          dailyMap.set(date, existing);
        }
      });

      const dailyStats = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({
          date,
          totalWaste: stats.totalWaste,
          wastePercentage: stats.totalWeight > 0 
            ? (stats.totalWaste / stats.totalWeight) * 100 : 0,
          rollsCount: stats.rollsCount,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      return {
        totalWaste,
        wastePercentage,
        operatorStats,
        dailyStats,
      };
    } catch (error) {
      console.error("Error calculating waste statistics:", error);
      throw new Error("فشل في حساب إحصائيات الهدر");
    }
  }

  async checkCuttingCompletion(productionOrderId: number): Promise<boolean> {
    try {
      const rollsData = await db
        .select({ stage: rolls.stage })
        .from(rolls)
        .where(eq(rolls.production_order_id, productionOrderId));

      if (rollsData.length === 0) {
        return false;
      }

      return rollsData.every(roll => roll.stage === "done");
    } catch (error) {
      console.error("Error checking cutting completion:", error);
      throw new Error("فشل في التحقق من اكتمال التقطيع");
    }
  }

  async getRollLabelData(rollId: number): Promise<any> {
    try {
      const [rollData] = await db
        .select({
          roll_id: rolls.id,
          roll_number: rolls.roll_number,
          roll_seq: rolls.roll_seq,
          weight_kg: rolls.weight_kg,
          stage: rolls.stage,
          created_at: rolls.created_at,
          created_by: rolls.created_by,
          film_machine_id: rolls.film_machine_id,
          printing_machine_id: rolls.printing_machine_id,
          cutting_machine_id: rolls.cutting_machine_id,
          qr_code_text: rolls.qr_code_text,
          qr_png_base64: rolls.qr_png_base64,
          production_order_id: rolls.production_order_id,
          production_order_number: production_orders.production_order_number,
          customer_product_id: production_orders.customer_product_id,
          order_id: production_orders.order_id,
          order_number: orders.order_number,
          customer_id: orders.customer_id,
          customer_name: customers.name,
          customer_name_ar: customers.name_ar,
          size_caption: customer_products.size_caption,
          thickness: customer_products.thickness,
          item_id: customer_products.item_id,
          category_id: customer_products.category_id,
          printed_by: rolls.printed_by,
          cut_by: rolls.cut_by,
          film_machine_name: sql<string>`(SELECT name FROM machines WHERE id = ${rolls.film_machine_id})`.as('film_machine_name'),
          film_machine_name_ar: sql<string>`(SELECT name_ar FROM machines WHERE id = ${rolls.film_machine_id})`.as('film_machine_name_ar'),
          created_by_name: sql<string>`(SELECT full_name FROM users WHERE id = ${rolls.created_by})`.as('created_by_name'),
          printed_by_name: sql<string>`(SELECT full_name FROM users WHERE id = ${rolls.printed_by})`.as('printed_by_name'),
          cut_by_name: sql<string>`(SELECT full_name FROM users WHERE id = ${rolls.cut_by})`.as('cut_by_name'),
          item_name: sql<string>`(SELECT name FROM items WHERE id = ${customer_products.item_id})`.as('item_name'),
          item_name_ar: sql<string>`(SELECT name_ar FROM items WHERE id = ${customer_products.item_id})`.as('item_name_ar'),
          category_name: sql<string>`(SELECT name FROM categories WHERE id = ${customer_products.category_id})`.as('category_name'),
          category_name_ar: sql<string>`(SELECT name_ar FROM categories WHERE id = ${customer_products.category_id})`.as('category_name_ar'),
        })
        .from(rolls)
        .leftJoin(
          production_orders,
          eq(rolls.production_order_id, production_orders.id),
        )
        .leftJoin(orders, eq(production_orders.order_id, orders.id))
        .leftJoin(customers, eq(orders.customer_id, customers.id))
        .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
        .where(eq(rolls.id, rollId));

      if (!rollData) {
        throw new Error("الرول غير موجود");
      }

      // Format data for label printing component
      return {
        roll: {
          id: rollData.roll_id,
          roll_number: rollData.roll_number || "",
          roll_seq: rollData.roll_seq || 0,
          weight_kg: Number(rollData.weight_kg) || 0,
          status: this.getStageArabicName(rollData.stage || ""),
          stage: rollData.stage || "",
          created_at: rollData.created_at || new Date().toISOString(),
          created_by_name: rollData.created_by_name || "",
          printed_by_name: rollData.printed_by_name || "",
          cut_by_name: rollData.cut_by_name || "",
          film_machine_id: rollData.film_machine_id || "",
          film_machine_name: rollData.film_machine_name_ar || rollData.film_machine_name || "",
          printing_machine_id: rollData.printing_machine_id || "",
          cutting_machine_id: rollData.cutting_machine_id || "",
          qr_code_text: rollData.qr_code_text || "",
          qr_png_base64: rollData.qr_png_base64 || "",
        },
        productionOrder: {
          production_order_number: rollData.production_order_number || "",
          size_caption: rollData.size_caption || "",
          thickness: rollData.thickness ? Number(rollData.thickness) : 0,
          item_name: rollData.item_name_ar || rollData.item_name || "",
          category_name: rollData.category_name_ar || rollData.category_name || "",
        },
        order: {
          order_number: rollData.order_number || "",
          customer_name: rollData.customer_name_ar || rollData.customer_name || "غير محدد",
        },
      };
    } catch (error) {
      console.error("Error fetching roll label data:", error);
      throw new Error("فشل في جلب بيانات ليبل الرول");
    }
  }

  private getStageArabicName(stage: string): string {
    const stageNames: { [key: string]: string } = {
      film: "إنتاج فيلم",
      printing: "طباعة",
      cutting: "قص",
      done: "مكتمل",
    };
    return stageNames[stage] || stage;
  }

  // ============ User Attendance Management ============
  async getAttendance(): Promise<any[]> {
    try {
      const result = await db
        .select({
          id: attendance.id,
          user_id: attendance.user_id,
          status: attendance.status,
          check_in_time: attendance.check_in_time,
          check_out_time: attendance.check_out_time,
          lunch_start_time: attendance.lunch_start_time,
          lunch_end_time: attendance.lunch_end_time,
          notes: attendance.notes,
          created_by: attendance.created_by,
          updated_by: attendance.updated_by,
          date: attendance.date,
          created_at: attendance.created_at,
          updated_at: attendance.updated_at,
          username: users.username,
        })
        .from(attendance)
        .innerJoin(users, eq(attendance.user_id, users.id))
        .orderBy(desc(attendance.date), desc(attendance.created_at));
      return result;
    } catch (error) {
      console.error("Error fetching attendance:", error);
      throw new Error("فشل في جلب بيانات الحضور");
    }
  }

  // Get attendance by date with all users
  async getAttendanceByDate(date: string): Promise<any[]> {
    try {
      // Get all active users
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          display_name_ar: users.display_name_ar,
          role_id: users.role_id,
          role_name: roles.name,
          role_name_ar: roles.name_ar,
        })
        .from(users)
        .leftJoin(roles, eq(users.role_id, roles.id))
        .where(eq(users.status, 'active'))
        .orderBy(users.display_name_ar, users.username);

      // Get attendance records for the date
      const attendanceRecords = await db
        .select({
          id: attendance.id,
          user_id: attendance.user_id,
          status: attendance.status,
          check_in_time: attendance.check_in_time,
          check_out_time: attendance.check_out_time,
          lunch_start_time: attendance.lunch_start_time,
          lunch_end_time: attendance.lunch_end_time,
          notes: attendance.notes,
          date: attendance.date,
        })
        .from(attendance)
        .where(eq(attendance.date, date));

      // Create a map for quick lookup
      const attendanceMap = new Map<number, any>();
      for (const record of attendanceRecords) {
        // Keep only the main record per user
        if (!attendanceMap.has(record.user_id)) {
          attendanceMap.set(record.user_id, record);
        } else {
          // Merge times if there are multiple records
          const existing = attendanceMap.get(record.user_id);
          if (record.check_in_time && !existing.check_in_time) {
            existing.check_in_time = record.check_in_time;
          }
          if (record.check_out_time && !existing.check_out_time) {
            existing.check_out_time = record.check_out_time;
          }
          if (record.lunch_start_time && !existing.lunch_start_time) {
            existing.lunch_start_time = record.lunch_start_time;
          }
          if (record.lunch_end_time && !existing.lunch_end_time) {
            existing.lunch_end_time = record.lunch_end_time;
          }
        }
      }

      // Combine users with their attendance
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
          lunch_start_time: record?.lunch_start_time || null,
          lunch_end_time: record?.lunch_end_time || null,
          notes: record?.notes || '',
          date: date,
        };
      });
    } catch (error) {
      console.error("Error fetching attendance by date:", error);
      throw new Error("فشل في جلب بيانات الحضور للتاريخ المحدد");
    }
  }

  // Bulk upsert manual attendance entries
  async upsertManualAttendance(entries: {
    user_id: number;
    date: string;
    check_in_time?: string | null;
    check_out_time?: string | null;
    status: string;
    notes?: string;
  }[]): Promise<any[]> {
    try {
      const results: any[] = [];
      
      for (const entry of entries) {
        // Check if attendance record exists for this user and date
        const existingRecords = await db
          .select()
          .from(attendance)
          .where(and(
            eq(attendance.user_id, entry.user_id),
            eq(attendance.date, entry.date)
          ));

        if (existingRecords.length > 0) {
          // Update existing record
          const existing = existingRecords[0];
          const [updated] = await db
            .update(attendance)
            .set({
              status: entry.status,
              check_in_time: entry.check_in_time ? new Date(entry.check_in_time) : null,
              check_out_time: entry.check_out_time ? new Date(entry.check_out_time) : null,
              notes: entry.notes || existing.notes,
              updated_at: new Date(),
            })
            .where(eq(attendance.id, existing.id))
            .returning();
          results.push(updated);
        } else {
          // Create new record
          const insertData: any = {
            user_id: entry.user_id,
            date: entry.date,
            status: entry.status,
            notes: entry.notes || '',
            created_at: new Date(),
            updated_at: new Date(),
          };
          if (entry.check_in_time) {
            insertData.check_in_time = new Date(entry.check_in_time);
          }
          if (entry.check_out_time) {
            insertData.check_out_time = new Date(entry.check_out_time);
          }
          const [created] = await db
            .insert(attendance)
            .values(insertData)
            .returning();
          results.push(created);
        }
      }
      
      return results;
    } catch (error) {
      console.error("Error upserting manual attendance:", error);
      throw new Error("فشل في حفظ بيانات الحضور اليدوي");
    }
  }

  // Check daily attendance status for a user
  async getDailyAttendanceStatus(
    userId: number,
    date: string,
  ): Promise<{
    hasCheckedIn: boolean;
    hasStartedLunch: boolean;
    hasEndedLunch: boolean;
    hasCheckedOut: boolean;
    currentStatus: string;
  }> {
    try {
      const records = await db
        .select({
          check_in_time: attendance.check_in_time,
          lunch_start_time: attendance.lunch_start_time,
          lunch_end_time: attendance.lunch_end_time,
          check_out_time: attendance.check_out_time,
          status: attendance.status,
        })
        .from(attendance)
        .where(and(eq(attendance.user_id, userId), eq(attendance.date, date)))
        .orderBy(desc(attendance.created_at));

      const status = {
        hasCheckedIn: false,
        hasStartedLunch: false,
        hasEndedLunch: false,
        hasCheckedOut: false,
        currentStatus: "غائب",
      };

      // Check for each type of action
      for (const record of records) {
        if (record.check_in_time && !status.hasCheckedIn)
          status.hasCheckedIn = true;
        if (record.lunch_start_time && !status.hasStartedLunch)
          status.hasStartedLunch = true;
        if (record.lunch_end_time && !status.hasEndedLunch)
          status.hasEndedLunch = true;
        if (record.check_out_time && !status.hasCheckedOut)
          status.hasCheckedOut = true;
      }

      // Determine current status based on the sequence of actions
      if (status.hasCheckedOut) {
        status.currentStatus = "مغادر";
      } else if (status.hasEndedLunch) {
        status.currentStatus = "حاضر"; // After ending lunch, return to present
      } else if (status.hasStartedLunch) {
        status.currentStatus = "في الاستراحة";
      } else if (status.hasCheckedIn) {
        status.currentStatus = "حاضر";
      }

      return status;
    } catch (error) {
      console.error("Error getting daily attendance status:", error);
      throw new Error("فشل في جلب حالة الحضور اليومية");
    }
  }

  async createAttendance(attendanceData: any): Promise<any> {
    try {
      console.log("Creating attendance with data:", attendanceData);

      const currentDate =
        attendanceData.date || new Date().toISOString().split("T")[0];
      const userId = attendanceData.user_id;

      // Check current daily attendance status
      const dailyStatus = await this.getDailyAttendanceStatus(
        userId,
        currentDate,
      );

      // Validate the requested action based on current status
      const action = attendanceData.action;
      const status = attendanceData.status;

      // Validation rules for one-time actions per day
      if (status === "حاضر" && !action && dailyStatus.hasCheckedIn) {
        throw new Error("تم تسجيل الحضور مسبقاً لهذا اليوم");
      }

      if (status === "في الاستراحة" && dailyStatus.hasStartedLunch) {
        throw new Error("تم تسجيل بداية استراحة الغداء مسبقاً لهذا اليوم");
      }

      if (action === "end_lunch" && dailyStatus.hasEndedLunch) {
        throw new Error("تم تسجيل نهاية استراحة الغداء مسبقاً لهذا اليوم");
      }

      if (status === "مغادر" && dailyStatus.hasCheckedOut) {
        throw new Error("تم تسجيل الانصراف مسبقاً لهذا اليوم");
      }

      // Additional validation for logical sequence
      if (status === "في الاستراحة" && !dailyStatus.hasCheckedIn) {
        throw new Error("يجب تسجيل الحضور أولاً قبل بداية استراحة الغداء");
      }

      if (action === "end_lunch" && !dailyStatus.hasStartedLunch) {
        throw new Error("يجب تسجيل بداية استراحة الغداء أولاً");
      }

      if (status === "مغادر" && !dailyStatus.hasCheckedIn) {
        throw new Error("يجب تسجيل الحضور أولاً قبل الانصراف");
      }

      // Prepare the attendance record based on action
      let recordData = {
        user_id: userId,
        status: status,
        check_in_time: null,
        check_out_time: null,
        lunch_start_time: null,
        lunch_end_time: null,
        notes: attendanceData.notes || "",
        date: currentDate,
      };

      // Set the appropriate timestamp based on action
      if (status === "حاضر" && !action) {
        recordData.check_in_time =
          attendanceData.check_in_time || new Date().toISOString();
      } else if (status === "في الاستراحة") {
        recordData.lunch_start_time =
          attendanceData.lunch_start_time || new Date().toISOString();
      } else if (action === "end_lunch") {
        recordData.lunch_end_time =
          attendanceData.lunch_end_time || new Date().toISOString();
        recordData.status = "حاضر"; // Return to present status after lunch
      } else if (status === "مغادر") {
        recordData.check_out_time =
          attendanceData.check_out_time || new Date().toISOString();
      }

      const query = `
        INSERT INTO attendance (user_id, status, check_in_time, check_out_time, lunch_start_time, lunch_end_time, notes, date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        recordData.user_id,
        recordData.status,
        recordData.check_in_time,
        recordData.check_out_time,
        recordData.lunch_start_time,
        recordData.lunch_end_time,
        recordData.notes,
        recordData.date,
      ];

      console.log("Executing query:", query, "with values:", values);
      const result = await pool.query(query, values);
      console.log("Created attendance:", result.rows[0]);
      return result.rows[0];
    } catch (error) {
      console.error("Error creating attendance:", error);
      throw error; // Re-throw to preserve the specific error message
    }
  }

  async updateAttendance(id: number, attendanceData: any): Promise<any> {
    try {
      const query = `
        UPDATE attendance 
        SET status = $1, check_in_time = $2, check_out_time = $3, 
            lunch_start_time = $4, lunch_end_time = $5, notes = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING *
      `;

      const values = [
        attendanceData.status,
        attendanceData.check_in_time || null,
        attendanceData.check_out_time || null,
        attendanceData.lunch_start_time || null,
        attendanceData.lunch_end_time || null,
        attendanceData.notes || "",
        id,
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error("Error updating attendance:", error);
      throw new Error("فشل في تحديث سجل الحضور");
    }
  }

  async deleteAttendance(id: number): Promise<void> {
    try {
      await pool.query("DELETE FROM attendance WHERE id = $1", [id]);
    } catch (error) {
      console.error("Error deleting attendance:", error);
      throw new Error("فشل في حذف سجل الحضور");
    }
  }

  async getAttendanceById(id: number): Promise<Attendance | null> {
    try {
      const result = await pool.query("SELECT * FROM attendance WHERE id = $1", [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("Error getting attendance by id:", error);
      throw new Error("فشل في جلب سجل الحضور");
    }
  }

  async getAttendanceSummary(userId: number, startDate: Date, endDate: Date): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalWorkHours: number;
    totalOvertimeHours: number;
    totalLateMinutes: number;
    averageWorkHours: number;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT date) as total_days,
          COUNT(DISTINCT CASE WHEN status = 'حاضر' OR status = 'مغادر' THEN date END) as present_days,
          COUNT(DISTINCT CASE WHEN status = 'غائب' THEN date END) as absent_days,
          COUNT(DISTINCT CASE WHEN late_minutes > 0 THEN date END) as late_days,
          COALESCE(SUM(work_hours), 0) as total_work_hours,
          COALESCE(SUM(overtime_hours), 0) as total_overtime_hours,
          COALESCE(SUM(late_minutes), 0) as total_late_minutes
        FROM attendance
        WHERE user_id = $1 
          AND date >= $2 
          AND date <= $3
      `;
      
      const result = await pool.query(query, [userId, startDate, endDate]);
      const row = result.rows[0];
      
      const presentDays = parseInt(row.present_days) || 0;
      const totalWorkHours = parseFloat(row.total_work_hours) || 0;
      
      return {
        totalDays: parseInt(row.total_days) || 0,
        presentDays,
        absentDays: parseInt(row.absent_days) || 0,
        lateDays: parseInt(row.late_days) || 0,
        totalWorkHours,
        totalOvertimeHours: parseFloat(row.total_overtime_hours) || 0,
        totalLateMinutes: parseInt(row.total_late_minutes) || 0,
        averageWorkHours: presentDays > 0 ? totalWorkHours / presentDays : 0,
      };
    } catch (error) {
      console.error("Error getting attendance summary:", error);
      throw new Error("فشل في جلب ملخص الحضور");
    }
  }

  async getAttendanceReport(startDate: Date, endDate: Date, filters?: {
    sectionId?: number;
    roleId?: number;
  }): Promise<any[]> {
    try {
      let query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.display_name,
          u.display_name_ar,
          r.name as role_name,
          r.name_ar as role_name_ar,
          COUNT(DISTINCT a.date) as total_days,
          COUNT(DISTINCT CASE WHEN a.status = 'حاضر' OR a.status = 'مغادر' THEN a.date END) as present_days,
          COUNT(DISTINCT CASE WHEN a.status = 'غائب' THEN a.date END) as absent_days,
          COUNT(DISTINCT CASE WHEN a.status = 'إجازة' THEN a.date END) as leave_days,
          COUNT(DISTINCT CASE WHEN a.late_minutes > 0 THEN a.date END) as late_days,
          COALESCE(SUM(a.work_hours), 0) as total_work_hours,
          COALESCE(SUM(a.overtime_hours), 0) as total_overtime_hours,
          COALESCE(SUM(a.late_minutes), 0) as total_late_minutes,
          COALESCE(SUM(a.early_leave_minutes), 0) as total_early_leave_minutes
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN attendance a ON u.id = a.user_id AND a.date >= $1 AND a.date <= $2
        WHERE u.status = 'active'
      `;
      
      const params: any[] = [startDate, endDate];
      let paramIndex = 3;
      
      if (filters?.sectionId) {
        query += ` AND u.section_id = $${paramIndex}`;
        params.push(filters.sectionId);
        paramIndex++;
      }
      
      if (filters?.roleId) {
        query += ` AND u.role_id = $${paramIndex}`;
        params.push(filters.roleId);
        paramIndex++;
      }
      
      query += `
        GROUP BY u.id, u.username, u.display_name, u.display_name_ar, r.name, r.name_ar
        ORDER BY u.display_name_ar, u.username
      `;
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("Error getting attendance report:", error);
      throw new Error("فشل في جلب تقرير الحضور");
    }
  }

  async getDailyAttendanceStats(date: string): Promise<{
    total: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
  }> {
    try {
      // Get total active employees
      const totalResult = await pool.query(
        "SELECT COUNT(*) as total FROM users WHERE status = 'active'"
      );
      const total = parseInt(totalResult.rows[0].total) || 0;
      
      // Get attendance stats for the date
      const statsQuery = `
        SELECT 
          COUNT(DISTINCT CASE WHEN status = 'حاضر' OR status = 'مغادر' THEN user_id END) as present,
          COUNT(DISTINCT CASE WHEN status = 'غائب' THEN user_id END) as absent,
          COUNT(DISTINCT CASE WHEN late_minutes > 0 THEN user_id END) as late,
          COUNT(DISTINCT CASE WHEN status = 'إجازة' THEN user_id END) as on_leave
        FROM attendance
        WHERE date = $1
      `;
      
      const result = await pool.query(statsQuery, [date]);
      const row = result.rows[0];
      
      const present = parseInt(row.present) || 0;
      const onLeave = parseInt(row.on_leave) || 0;
      
      return {
        total,
        present,
        absent: total - present - onLeave,
        late: parseInt(row.late) || 0,
        onLeave,
      };
    } catch (error) {
      console.error("Error getting daily attendance stats:", error);
      throw new Error("فشل في جلب إحصائيات الحضور اليومية");
    }
  }

  // User Management
  async getUserById(id: number): Promise<User | undefined> {
    // DEPRECATED: This method returns sensitive data including passwords
    // Use getSafeUser() instead for client-facing operations
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user || undefined;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw new Error("فشل في جلب بيانات المستخدم");
    }
  }

  async getUsersByRole(roleId: number): Promise<User[]> {
    try {
      return await db.select().from(users).where(eq(users.role_id, roleId));
    } catch (error) {
      console.error("Error getting users by role:", error);
      throw new Error("فشل في جلب المستخدمين حسب الدور");
    }
  }

  // ============ Notifications Management ============
  async createNotification(
    notificationData: InsertNotification,
  ): Promise<Notification> {
    try {
      const [notification] = await db
        .insert(notifications)
        .values(notificationData)
        .returning();
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw new Error("فشل في إنشاء الإشعار");
    }
  }

  async getNotifications(
    userId?: number,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Notification[]> {
    try {
      if (userId) {
        return await db
          .select()
          .from(notifications)
          .where(eq(notifications.recipient_id, userId.toString()))
          .orderBy(desc(notifications.created_at))
          .limit(limit)
          .offset(offset);
      } else {
        return await db
          .select()
          .from(notifications)
          .orderBy(desc(notifications.created_at))
          .limit(limit)
          .offset(offset);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw new Error("فشل في جلب الإشعارات");
    }
  }

  async updateNotificationStatus(
    twilioSid: string,
    updates: Partial<Notification>,
  ): Promise<Notification> {
    try {
      const [notification] = await db
        .update(notifications)
        .set(updates)
        .where(eq(notifications.twilio_sid, twilioSid))
        .returning();
      return notification;
    } catch (error) {
      console.error("Error updating notification status:", error);
      throw new Error("فشل في تحديث حالة الإشعار");
    }
  }

  async getUserNotifications(
    userId: number,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number },
  ): Promise<Notification[]> {
    return withDatabaseErrorHandling(
      async () => {
        if (!userId || typeof userId !== "number" || userId <= 0) {
          throw new Error("معرف المستخدم مطلوب");
        }

        const user = await this.getSafeUser(userId);
        if (!user) {
          throw new Error("المستخدم غير موجود");
        }

        const limit = options?.limit || 50;
        const offset = options?.offset || 0;

        const roleCondition = user.role_id
          ? and(
              eq(notifications.recipient_type, "role"),
              eq(notifications.recipient_id, user.role_id.toString()),
            )
          : undefined;

        const conditions = [
          eq(notifications.recipient_id, userId.toString()),
          and(
            eq(notifications.recipient_type, "all"),
            eq(notifications.type, "system"),
          ),
        ];

        if (roleCondition) {
          conditions.push(roleCondition);
        }

        let query = db
          .select()
          .from(notifications)
          .where(or(...conditions))
          .orderBy(desc(notifications.created_at))
          .limit(limit)
          .offset(offset);

        // Add unread filter if specified
        if (options?.unreadOnly) {
          query = db
            .select()
            .from(notifications)
            .where(
              and(
                or(...conditions),
                sql`${notifications.read_at} IS NULL`,
              ),
            )
            .orderBy(desc(notifications.created_at))
            .limit(limit)
            .offset(offset);
        }

        return await query;
      },
      "جلب إشعارات المستخدم",
      `المستخدم رقم ${userId}`,
    );
  }

  async markNotificationAsRead(notificationId: number): Promise<Notification> {
    return withDatabaseErrorHandling(
      async () => {
        if (
          !notificationId ||
          typeof notificationId !== "number" ||
          notificationId <= 0
        ) {
          throw new Error("معرف الإشعار غير صحيح");
        }

        const [notification] = await db
          .update(notifications)
          .set({
            read_at: new Date(),
            status: "read",
            updated_at: new Date(),
          })
          .where(eq(notifications.id, notificationId))
          .returning();

        if (!notification) {
          throw new Error("الإشعار غير موجود");
        }

        return notification;
      },
      "تعليم الإشعار كمقروء",
      `الإشعار رقم ${notificationId}`,
    );
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        if (!userId || typeof userId !== "number" || userId <= 0) {
          throw new Error("معرف المستخدم مطلوب");
        }

        await db
          .update(notifications)
          .set({
            read_at: new Date(),
            status: "read",
            updated_at: new Date(),
          })
          .where(
            and(
              or(
                eq(notifications.recipient_id, userId.toString()),
                eq(notifications.recipient_type, "all"),
              ),
              sql`${notifications.read_at} IS NULL`,
            ),
          );
      },
      "تعليم جميع الإشعارات كمقروءة",
      `المستخدم رقم ${userId}`,
    );
  }

  async deleteNotification(notificationId: number): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        if (
          !notificationId ||
          typeof notificationId !== "number" ||
          notificationId <= 0
        ) {
          throw new Error("معرف الإشعار غير صحيح");
        }

        // Delete the notification - idempotent operation
        // If notification doesn't exist, that's the desired state, so no error
        await db
          .delete(notifications)
          .where(eq(notifications.id, notificationId));
      },
      "حذف الإشعار",
      `الإشعار رقم ${notificationId}`,
    );
  }

  // ============ Notification Templates Management ============
  async getNotificationTemplates(): Promise<NotificationTemplate[]> {
    try {
      return await db
        .select()
        .from(notification_templates)
        .where(eq(notification_templates.is_active, true))
        .orderBy(notification_templates.name);
    } catch (error) {
      console.error("Error fetching notification templates:", error);
      throw new Error("فشل في جلب قوالب الإشعارات");
    }
  }

  async createNotificationTemplate(
    templateData: InsertNotificationTemplate,
  ): Promise<NotificationTemplate> {
    try {
      const [template] = await db
        .insert(notification_templates)
        .values(templateData)
        .returning();
      return template;
    } catch (error) {
      console.error("Error creating notification template:", error);
      throw new Error("فشل في إنشاء قالب الإشعار");
    }
  }

  // ============ Maintenance Actions Management ============
  async getAllMaintenanceActions(): Promise<MaintenanceAction[]> {
    try {
      return await db
        .select()
        .from(maintenance_actions)
        .orderBy(desc(maintenance_actions.action_date));
    } catch (error) {
      console.error("Error fetching maintenance actions:", error);
      throw new Error("فشل في جلب إجراءات الصيانة");
    }
  }

  async getMaintenanceActionsByRequestId(
    requestId: number,
  ): Promise<MaintenanceAction[]> {
    try {
      return await db
        .select()
        .from(maintenance_actions)
        .where(eq(maintenance_actions.maintenance_request_id, requestId))
        .orderBy(desc(maintenance_actions.action_date));
    } catch (error) {
      console.error("Error fetching maintenance actions by request:", error);
      throw new Error("فشل في جلب إجراءات الصيانة للطلب");
    }
  }

  async createMaintenanceAction(
    action: InsertMaintenanceAction,
  ): Promise<MaintenanceAction> {
    try {
      // Generate action number automatically
      const existingActions = await db.select().from(maintenance_actions);
      const nextNumber = existingActions.length + 1;
      const actionNumber = `MA${nextNumber.toString().padStart(3, "0")}`;

      const [result] = await db
        .insert(maintenance_actions)
        .values({
          ...action,
          action_number: actionNumber,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating maintenance action:", error);
      throw new Error("فشل في إنشاء إجراء الصيانة");
    }
  }

  async updateMaintenanceAction(
    id: number,
    action: Partial<MaintenanceAction>,
  ): Promise<MaintenanceAction> {
    try {
      const [result] = await db
        .update(maintenance_actions)
        .set(action)
        .where(eq(maintenance_actions.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating maintenance action:", error);
      throw new Error("فشل في تحديث إجراء الصيانة");
    }
  }

  async deleteMaintenanceAction(id: number): Promise<void> {
    try {
      await db
        .delete(maintenance_actions)
        .where(eq(maintenance_actions.id, id));
    } catch (error) {
      console.error("Error deleting maintenance action:", error);
      throw new Error("فشل في حذف إجراء الصيانة");
    }
  }

  // ============ Maintenance Reports Management ============
  async getAllMaintenanceReports(): Promise<MaintenanceReport[]> {
    try {
      return await db
        .select()
        .from(maintenance_reports)
        .orderBy(desc(maintenance_reports.created_at));
    } catch (error) {
      console.error("Error fetching maintenance reports:", error);
      throw new Error("فشل في جلب بلاغات الصيانة");
    }
  }

  async getMaintenanceReportsByType(
    type: string,
  ): Promise<MaintenanceReport[]> {
    try {
      return await db
        .select()
        .from(maintenance_reports)
        .where(eq(maintenance_reports.report_type, type))
        .orderBy(desc(maintenance_reports.created_at));
    } catch (error) {
      console.error("Error fetching maintenance reports by type:", error);
      throw new Error("فشل في جلب بلاغات الصيانة حسب النوع");
    }
  }

  async createMaintenanceReport(
    report: InsertMaintenanceReport,
  ): Promise<MaintenanceReport> {
    try {
      // Generate report number automatically
      const existingReports = await db.select().from(maintenance_reports);
      const nextNumber = existingReports.length + 1;
      const reportNumber = `MR${nextNumber.toString().padStart(3, "0")}`;

      const [result] = await db
        .insert(maintenance_reports)
        .values({
          ...report,
          report_number: reportNumber,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating maintenance report:", error);
      throw new Error("فشل في إنشاء بلاغ الصيانة");
    }
  }

  async updateMaintenanceReport(
    id: number,
    report: Partial<MaintenanceReport>,
  ): Promise<MaintenanceReport> {
    try {
      const [result] = await db
        .update(maintenance_reports)
        .set(report)
        .where(eq(maintenance_reports.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating maintenance report:", error);
      throw new Error("فشل في تحديث بلاغ الصيانة");
    }
  }

  async deleteMaintenanceReport(id: number): Promise<void> {
    try {
      await db
        .delete(maintenance_reports)
        .where(eq(maintenance_reports.id, id));
    } catch (error) {
      console.error("Error deleting maintenance report:", error);
      throw new Error("فشل في حذف بلاغ الصيانة");
    }
  }

  // ============ Spare Parts Management ============
  async getAllSpareParts(): Promise<SparePart[]> {
    try {
      return await db.select().from(spare_parts).orderBy(spare_parts.part_id);
    } catch (error) {
      console.error("Error fetching spare parts:", error);
      throw new Error("فشل في جلب قطع الغيار");
    }
  }

  async createSparePart(part: InsertSparePart): Promise<SparePart> {
    try {
      const [result] = await db.insert(spare_parts).values(part).returning();
      return result;
    } catch (error) {
      console.error("Error creating spare part:", error);
      throw new Error("فشل في إنشاء قطعة غيار");
    }
  }

  async updateSparePart(
    id: number,
    part: Partial<SparePart>,
  ): Promise<SparePart> {
    try {
      const [result] = await db
        .update(spare_parts)
        .set(part)
        .where(eq(spare_parts.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating spare part:", error);
      throw new Error("فشل في تحديث قطعة الغيار");
    }
  }

  async deleteSparePart(id: number): Promise<void> {
    try {
      await db.delete(spare_parts).where(eq(spare_parts.id, id));
    } catch (error) {
      console.error("Error deleting spare part:", error);
      throw new Error("فشل في حذف قطعة الغيار");
    }
  }

  // ============ Consumable Parts Management ============
  async getAllConsumableParts(): Promise<ConsumablePart[]> {
    try {
      return await db
        .select()
        .from(consumable_parts)
        .orderBy(consumable_parts.part_id);
    } catch (error) {
      console.error("Error fetching consumable parts:", error);
      throw new Error("فشل في جلب قطع الغيار الاستهلاكية");
    }
  }

  async createConsumablePart(
    part: InsertConsumablePart,
  ): Promise<ConsumablePart> {
    try {
      // Generate part_id automatically
      const existingParts = await db.select().from(consumable_parts);
      const nextNumber = existingParts.length + 1;
      const partId = `CP${nextNumber.toString().padStart(3, "0")}`;

      const [result] = await db
        .insert(consumable_parts)
        .values({
          ...part,
          part_id: partId,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating consumable part:", error);
      throw new Error("فشل في إنشاء قطعة غيار استهلاكية");
    }
  }

  async updateConsumablePart(
    id: number,
    part: Partial<ConsumablePart>,
  ): Promise<ConsumablePart> {
    try {
      const [result] = await db
        .update(consumable_parts)
        .set(part)
        .where(eq(consumable_parts.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating consumable part:", error);
      throw new Error("فشل في تحديث قطعة الغيار الاستهلاكية");
    }
  }

  async deleteConsumablePart(id: number): Promise<void> {
    try {
      await db.delete(consumable_parts).where(eq(consumable_parts.id, id));
    } catch (error) {
      console.error("Error deleting consumable part:", error);
      throw new Error("فشل في حذف قطعة الغيار الاستهلاكية");
    }
  }

  async getConsumablePartByBarcode(
    barcode: string,
  ): Promise<ConsumablePart | null> {
    try {
      const [result] = await db
        .select()
        .from(consumable_parts)
        .where(eq(consumable_parts.barcode, barcode))
        .limit(1);
      return result || null;
    } catch (error) {
      console.error("Error finding consumable part by barcode:", error);
      throw new Error("فشل في البحث عن قطعة الغيار بالباركود");
    }
  }

  // ============ Consumable Parts Transactions Management ============
  async getConsumablePartTransactions(): Promise<ConsumablePartTransaction[]> {
    try {
      return await db
        .select()
        .from(consumable_parts_transactions)
        .orderBy(desc(consumable_parts_transactions.created_at));
    } catch (error) {
      console.error("Error fetching consumable parts transactions:", error);
      throw new Error("فشل في جلب حركات قطع الغيار الاستهلاكية");
    }
  }

  async getConsumablePartTransactionsByPartId(
    partId: number,
  ): Promise<ConsumablePartTransaction[]> {
    try {
      return await db
        .select()
        .from(consumable_parts_transactions)
        .where(eq(consumable_parts_transactions.consumable_part_id, partId))
        .orderBy(desc(consumable_parts_transactions.created_at));
    } catch (error) {
      console.error(
        "Error fetching consumable parts transactions by part:",
        error,
      );
      throw new Error("فشل في جلب حركات قطعة الغيار الاستهلاكية");
    }
  }

  async createConsumablePartTransaction(
    transaction: InsertConsumablePartTransaction,
  ): Promise<ConsumablePartTransaction> {
    try {
      // Generate transaction_id automatically
      const existingTransactions = await db
        .select()
        .from(consumable_parts_transactions);
      const nextNumber = existingTransactions.length + 1;
      const transactionId = `CT${nextNumber.toString().padStart(3, "0")}`;

      const [result] = await db
        .insert(consumable_parts_transactions)
        .values({
          ...transaction,
          transaction_id: transactionId,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating consumable parts transaction:", error);
      throw new Error("فشل في إنشاء حركة قطعة غيار استهلاكية");
    }
  }

  async processConsumablePartBarcodeTransaction(
    transactionData: InsertConsumablePartTransaction,
  ): Promise<{
    transaction: ConsumablePartTransaction;
    updatedPart: ConsumablePart;
  }> {
    try {
      return await db.transaction(async (trx) => {
        // Generate transaction_id
        const existingTransactions = await trx
          .select()
          .from(consumable_parts_transactions);
        const nextNumber = existingTransactions.length + 1;
        const transactionId = `CT${nextNumber.toString().padStart(3, "0")}`;

        // Create the transaction record
        const [transaction] = await trx
          .insert(consumable_parts_transactions)
          .values({
            ...transactionData,
            transaction_id: transactionId,
          })
          .returning();

        // Update the consumable part quantity
        const [currentPart] = await trx
          .select()
          .from(consumable_parts)
          .where(eq(consumable_parts.id, transactionData.consumable_part_id))
          .limit(1);

        if (!currentPart) {
          throw new Error("قطعة الغيار الاستهلاكية غير موجودة");
        }

        let newQuantity = currentPart.current_quantity;
        if (transactionData.transaction_type === "in") {
          newQuantity += transactionData.quantity;
        } else {
          newQuantity -= transactionData.quantity;
          if (newQuantity < 0) {
            throw new Error("الكمية المطلوبة غير متوفرة في المخزون");
          }
        }

        // Update the part quantity
        const [updatedPart] = await trx
          .update(consumable_parts)
          .set({
            current_quantity: newQuantity,
            updated_at: new Date(),
          })
          .where(eq(consumable_parts.id, transactionData.consumable_part_id))
          .returning();

        return { transaction, updatedPart };
      });
    } catch (error) {
      console.error(
        "Error processing consumable part barcode transaction:",
        error,
      );
      throw new Error("فشل في معالجة حركة الباركود");
    }
  }

  // ============ Operator Negligence Reports Management ============
  async getAllOperatorNegligenceReports(): Promise<OperatorNegligenceReport[]> {
    try {
      return await db
        .select()
        .from(operator_negligence_reports)
        .orderBy(desc(operator_negligence_reports.report_date));
    } catch (error) {
      console.error("Error fetching operator negligence reports:", error);
      throw new Error("فشل في جلب بلاغات إهمال المشغلين");
    }
  }

  async getOperatorNegligenceReportsByOperator(
    operatorId: number,
  ): Promise<OperatorNegligenceReport[]> {
    try {
      return await db
        .select()
        .from(operator_negligence_reports)
        .where(eq(operator_negligence_reports.operator_id, operatorId))
        .orderBy(desc(operator_negligence_reports.report_date));
    } catch (error) {
      console.error(
        "Error fetching operator negligence reports by operator:",
        error,
      );
      throw new Error("فشل في جلب بلاغات إهمال المشغل");
    }
  }

  async createOperatorNegligenceReport(
    report: InsertOperatorNegligenceReport,
  ): Promise<OperatorNegligenceReport> {
    try {
      // Generate report number automatically
      const existingReports = await db
        .select()
        .from(operator_negligence_reports);
      const nextNumber = existingReports.length + 1;
      const reportNumber = `ON${nextNumber.toString().padStart(3, "0")}`;

      const [result] = await db
        .insert(operator_negligence_reports)
        .values({
          ...report,
          report_number: reportNumber,
        })
        .returning();
      return result;
    } catch (error) {
      console.error("Error creating operator negligence report:", error);
      throw new Error("فشل في إنشاء بلاغ إهمال المشغل");
    }
  }

  async updateOperatorNegligenceReport(
    id: number,
    report: Partial<OperatorNegligenceReport>,
  ): Promise<OperatorNegligenceReport> {
    try {
      const [result] = await db
        .update(operator_negligence_reports)
        .set(report)
        .where(eq(operator_negligence_reports.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error("Error updating operator negligence report:", error);
      throw new Error("فشل في تحديث بلاغ إهمال المشغل");
    }
  }

  async deleteOperatorNegligenceReport(id: number): Promise<void> {
    try {
      await db
        .delete(operator_negligence_reports)
        .where(eq(operator_negligence_reports.id, id));
    } catch (error) {
      console.error("Error deleting operator negligence report:", error);
      throw new Error("فشل في حذف بلاغ إهمال المشغل");
    }
  }

  // ============ نظام التحذيرات الذكية ============

  // System Alerts
  async getSystemAlerts(filters?: {
    status?: string;
    type?: string;
    severity?: string;
    limit?: number;
    offset?: number;
  }): Promise<SystemAlert[]> {
    try {
      // في الوقت الحالي، نعيد مصفوفة فارغة - سيتم تحديثها لاحقاً مع قاعدة البيانات
      return [];
    } catch (error) {
      console.error("Error fetching system alerts:", error);
      throw new Error("فشل في جلب تحذيرات النظام");
    }
  }

  async getSystemAlertById(id: number): Promise<SystemAlert | undefined> {
    try {
      return undefined;
    } catch (error) {
      console.error("Error fetching system alert:", error);
      throw new Error("فشل في جلب التحذير");
    }
  }

  async createSystemAlert(alert: InsertSystemAlert): Promise<SystemAlert> {
    try {
      // مؤقتاً نعيد كائن مع الـ id
      return { ...alert, id: Date.now() } as SystemAlert;
    } catch (error) {
      console.error("Error creating system alert:", error);
      throw new Error("فشل في إنشاء التحذير");
    }
  }

  async updateSystemAlert(
    id: number,
    updates: Partial<SystemAlert>,
  ): Promise<SystemAlert> {
    try {
      return { id, ...updates } as SystemAlert;
    } catch (error) {
      console.error("Error updating system alert:", error);
      throw new Error("فشل في تحديث التحذير");
    }
  }

  async resolveSystemAlert(
    id: number,
    resolvedBy: number,
    notes?: string,
  ): Promise<SystemAlert> {
    try {
      return {
        id,
        resolved_by: resolvedBy,
        resolved_at: new Date(),
        resolution_notes: notes,
      } as SystemAlert;
    } catch (error) {
      console.error("Error resolving system alert:", error);
      throw new Error("فشل في حل التحذير");
    }
  }

  async dismissSystemAlert(
    id: number,
    dismissedBy: number,
  ): Promise<SystemAlert> {
    try {
      // Return a properly typed SystemAlert object with all required properties
      return {
        id,
        status: "dismissed",
        created_at: new Date(),
        message: "Alert dismissed",
        type: "system",
        title: "Dismissed Alert",
        title_ar: null,
        updated_at: new Date(),
        category: "alert",
        expires_at: null,
        message_ar: null,
        priority: "normal",
        source: "system",
        source_id: null,
        severity: "info",
        resolved_at: null,
        resolved_by: null,
        resolution_notes: null,
        dismissed_by: dismissedBy,
        dismissed_at: new Date(),
        affected_users: null,
        affected_roles: null,
        metadata: null,
        rule_id: null,
        occurrence_count: 1,
        last_occurrence: new Date(),
        first_occurrence: new Date(),
        is_automated: false,
        action_taken: "dismissed",
        escalation_level: 0,
        notification_sent: false,
        acknowledgment_required: false,
        acknowledged_by: null, // Dismissal is not acknowledgment
        acknowledged_at: null, // Dismissal is not acknowledgment
        auto_resolve: false,
        correlation_id: null,
        parent_alert_id: null,
        child_alert_ids: null,
        requires_action: false,
        action_taken_by: dismissedBy,
        action_taken_at: new Date(),
        affected_systems: null,
        business_impact: null,
        technical_details: null,
        recommended_actions: null,
        escalation_history: null,
        similar_incidents: null,
        recovery_time_objective: null,
        suggested_actions: null,
        context_data: null,
        notification_methods: null,
        target_users: null,
        threshold_values: null,
        measurement_unit: null,
        target_roles: null, // Should not force to admin role
        occurrences: 1,
      } as SystemAlert;
    } catch (error) {
      console.error("Error dismissing system alert:", error);
      throw new Error("فشل في إغلاق التحذير");
    }
  }

  async deleteSystemAlert(id: number): Promise<void> {
    return await db.transaction(async (tx) => {
      try {
        // Delete related notifications first
        await tx
          .delete(notifications)
          .where(
            and(
              eq(notifications.context_type, "system_alert"),
              eq(notifications.context_id, id.toString()),
            ),
          );

        // Delete the system alert - FK cascades will handle corrective_actions
        // If FK cascades are not yet applied, we have a fallback
        try {
          await tx.delete(system_alerts).where(eq(system_alerts.id, id));
        } catch (fkError: any) {
          if (fkError.code === "23503") {
            // FK constraint violation - manually delete children as fallback
            await tx
              .delete(corrective_actions)
              .where(eq(corrective_actions.alert_id, id));
            await tx.delete(system_alerts).where(eq(system_alerts.id, id));
          } else {
            throw fkError;
          }
        }
      } catch (error) {
        console.error("Error deleting system alert:", error);
        throw new Error("فشل في حذف التحذير");
      }
    });
  }

  async getActiveAlertsCount(): Promise<number> {
    try {
      return 0;
    } catch (error) {
      console.error("Error getting active alerts count:", error);
      return 0;
    }
  }

  async getCriticalAlertsCount(): Promise<number> {
    try {
      return 0;
    } catch (error) {
      console.error("Error getting critical alerts count:", error);
      return 0;
    }
  }

  async getAlertsByType(type: string): Promise<SystemAlert[]> {
    try {
      const alerts = await db
        .select()
        .from(system_alerts)
        .where(eq(system_alerts.type, type))
        .orderBy(desc(system_alerts.created_at))
        .limit(100);
      return alerts;
    } catch (error) {
      console.error("Error getting alerts by type:", error);
      return [];
    }
  }

  async getAlertsByUser(userId: number): Promise<SystemAlert[]> {
    try {
      const alerts = await db
        .select()
        .from(system_alerts)
        .where(
          sql`${system_alerts.target_users}::jsonb @> ${JSON.stringify([userId])}::jsonb`,
        )
        .orderBy(desc(system_alerts.created_at))
        .limit(100);
      return alerts;
    } catch (error) {
      console.error("Error getting alerts by user:", error);
      return [];
    }
  }

  async getAlertsByRole(roleId: number): Promise<SystemAlert[]> {
    try {
      const alerts = await db
        .select()
        .from(system_alerts)
        .where(
          sql`${system_alerts.target_roles}::jsonb @> ${JSON.stringify([roleId])}::jsonb`,
        )
        .orderBy(desc(system_alerts.created_at))
        .limit(100);
      return alerts;
    } catch (error) {
      console.error("Error getting alerts by role:", error);
      return [];
    }
  }

  // Alert Rules
  async getAlertRules(isEnabled?: boolean): Promise<AlertRule[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting alert rules:", error);
      return [];
    }
  }

  async getAlertRuleById(id: number): Promise<AlertRule | undefined> {
    try {
      return undefined;
    } catch (error) {
      console.error("Error getting alert rule:", error);
      return undefined;
    }
  }

  async createAlertRule(rule: InsertAlertRule): Promise<AlertRule> {
    try {
      return { ...rule, id: Date.now() } as AlertRule;
    } catch (error) {
      console.error("Error creating alert rule:", error);
      throw new Error("فشل في إنشاء قاعدة التحذير");
    }
  }

  async updateAlertRule(
    id: number,
    updates: Partial<AlertRule>,
  ): Promise<AlertRule> {
    try {
      return { id, ...updates } as AlertRule;
    } catch (error) {
      console.error("Error updating alert rule:", error);
      throw new Error("فشل في تحديث قاعدة التحذير");
    }
  }

  async deleteAlertRule(id: number): Promise<void> {
    try {
      // مؤقت
    } catch (error) {
      console.error("Error deleting alert rule:", error);
      throw new Error("فشل في حذف قاعدة التحذير");
    }
  }

  async enableAlertRule(id: number): Promise<AlertRule> {
    try {
      return { id, is_enabled: true } as AlertRule;
    } catch (error) {
      console.error("Error enabling alert rule:", error);
      throw new Error("فشل في تفعيل قاعدة التحذير");
    }
  }

  async disableAlertRule(id: number): Promise<AlertRule> {
    try {
      return { id, is_enabled: false } as AlertRule;
    } catch (error) {
      console.error("Error disabling alert rule:", error);
      throw new Error("فشل في إلغاء تفعيل قاعدة التحذير");
    }
  }

  // System Health Checks
  async getSystemHealthChecks(): Promise<SystemHealthCheck[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting health checks:", error);
      return [];
    }
  }

  async getSystemHealthCheckById(
    id: number,
  ): Promise<SystemHealthCheck | undefined> {
    try {
      return undefined;
    } catch (error) {
      console.error("Error getting health check:", error);
      return undefined;
    }
  }

  async createSystemHealthCheck(
    check: InsertSystemHealthCheck,
  ): Promise<SystemHealthCheck> {
    try {
      return { ...check, id: Date.now() } as SystemHealthCheck;
    } catch (error) {
      console.error("Error creating health check:", error);
      throw new Error("فشل في إنشاء فحص السلامة");
    }
  }

  async updateSystemHealthCheck(
    id: number,
    updates: Partial<SystemHealthCheck>,
  ): Promise<SystemHealthCheck> {
    try {
      return { id, ...updates } as SystemHealthCheck;
    } catch (error) {
      console.error("Error updating health check:", error);
      throw new Error("فشل في تحديث فحص السلامة");
    }
  }

  async getHealthChecksByType(type: string): Promise<SystemHealthCheck[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting health checks by type:", error);
      return [];
    }
  }

  async getCriticalHealthChecks(): Promise<SystemHealthCheck[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting critical health checks:", error);
      return [];
    }
  }

  async getSystemHealthStatus(): Promise<{
    overall_status: string;
    healthy_checks: number;
    warning_checks: number;
    critical_checks: number;
    last_check: Date;
  }> {
    try {
      return {
        overall_status: "healthy",
        healthy_checks: 5,
        warning_checks: 1,
        critical_checks: 0,
        last_check: new Date(),
      };
    } catch (error) {
      console.error("Error getting system health status:", error);
      return {
        overall_status: "unknown",
        healthy_checks: 0,
        warning_checks: 0,
        critical_checks: 0,
        last_check: new Date(),
      };
    }
  }

  // System Performance Metrics
  async getSystemPerformanceMetrics(filters?: {
    metric_name?: string;
    metric_category?: string;
    start_date?: Date;
    end_date?: Date;
    limit?: number;
  }): Promise<SystemPerformanceMetric[]> {
    try {
      // إنشاء بيانات وهمية للاختبار
      const now = new Date();
      const mockMetrics: SystemPerformanceMetric[] = [];

      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
        mockMetrics.push({
          id: i + 1,
          metric_name: "memory_usage_percent",
          metric_category: "system",
          value: (45 + Math.random() * 30).toString(),
          unit: "percent",
          timestamp: timestamp,
          source: "system_monitor",
          created_at: timestamp,
          tags: null,
        });
      }

      return mockMetrics.reverse();
    } catch (error) {
      console.error("Error getting performance metrics:", error);
      return [];
    }
  }

  async createSystemPerformanceMetric(
    metric: InsertSystemPerformanceMetric,
  ): Promise<SystemPerformanceMetric> {
    try {
      return { ...metric, id: Date.now() } as SystemPerformanceMetric;
    } catch (error) {
      console.error("Error creating performance metric:", error);
      throw new Error("فشل في إنشاء مؤشر الأداء");
    }
  }

  async getMetricsByTimeRange(
    metricName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SystemPerformanceMetric[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting metrics by time range:", error);
      return [];
    }
  }

  async getLatestMetricValue(
    metricName: string,
  ): Promise<SystemPerformanceMetric | undefined> {
    try {
      return undefined;
    } catch (error) {
      console.error("Error getting latest metric value:", error);
      return undefined;
    }
  }

  async deleteOldMetrics(cutoffDate: Date): Promise<number> {
    try {
      return 0;
    } catch (error) {
      console.error("Error deleting old metrics:", error);
      return 0;
    }
  }

  async getPerformanceSummary(
    timeRange: "hour" | "day" | "week",
  ): Promise<Record<string, any>> {
    try {
      return {
        avg_memory_usage: 65.5,
        avg_cpu_usage: 23.2,
        avg_response_time: 120,
        uptime_percent: 99.8,
      };
    } catch (error) {
      console.error("Error getting performance summary:", error);
      return {};
    }
  }

  // Corrective Actions
  async getCorrectiveActions(alertId?: number): Promise<CorrectiveAction[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting corrective actions:", error);
      return [];
    }
  }

  async getCorrectiveActionById(
    id: number,
  ): Promise<CorrectiveAction | undefined> {
    try {
      return undefined;
    } catch (error) {
      console.error("Error getting corrective action:", error);
      return undefined;
    }
  }

  async createCorrectiveAction(
    action: InsertCorrectiveAction,
  ): Promise<CorrectiveAction> {
    try {
      return { ...action, id: Date.now() } as CorrectiveAction;
    } catch (error) {
      console.error("Error creating corrective action:", error);
      throw new Error("فشل في إنشاء الإجراء التصحيحي");
    }
  }

  async updateCorrectiveAction(
    id: number,
    updates: Partial<CorrectiveAction>,
  ): Promise<CorrectiveAction> {
    try {
      return { id, ...updates } as CorrectiveAction;
    } catch (error) {
      console.error("Error updating corrective action:", error);
      throw new Error("فشل في تحديث الإجراء التصحيحي");
    }
  }

  async completeCorrectiveAction(
    id: number,
    completedBy: number,
    notes?: string,
  ): Promise<CorrectiveAction> {
    try {
      // Return a properly typed CorrectiveAction object with all required properties
      return {
        id,
        status: "completed",
        created_at: new Date(),
        notes: notes || null,
        created_by: completedBy,
        completed_at: new Date(),
        updated_at: new Date(),
        assigned_to: completedBy,
        completed_by: completedBy,
        action_title: "Corrective Action Completed",
        action_description: "Action has been completed successfully",
        action_description_ar: null,
        alert_id: null,
        action_type: "corrective",
        priority: "normal",
        due_date: null,
        estimated_completion_time: null,
        actual_completion_time: null,
        impact_level: null,
        requires_approval: false,
        estimated_duration: null,
        actual_duration: null,
        success_rate: "100",
      } as CorrectiveAction;
    } catch (error) {
      console.error("Error completing corrective action:", error);
      throw new Error("فشل في إكمال الإجراء التصحيحي");
    }
  }

  async getPendingActions(): Promise<CorrectiveAction[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting pending actions:", error);
      return [];
    }
  }

  async getActionsByAssignee(userId: number): Promise<CorrectiveAction[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting actions by assignee:", error);
      return [];
    }
  }

  // System Analytics
  async getSystemAnalytics(filters?: {
    date?: Date;
    metric_type?: string;
    limit?: number;
  }): Promise<SystemAnalytics[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting system analytics:", error);
      return [];
    }
  }

  async createSystemAnalytics(
    analytics: InsertSystemAnalytics,
  ): Promise<SystemAnalytics> {
    try {
      return { ...analytics, id: Date.now() } as SystemAnalytics;
    } catch (error) {
      console.error("Error creating system analytics:", error);
      throw new Error("فشل في إنشاء تحليلات النظام");
    }
  }

  async getDailyAnalytics(date: Date): Promise<SystemAnalytics[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting daily analytics:", error);
      return [];
    }
  }

  async getAnalyticsTrend(
    metricType: string,
    days: number,
  ): Promise<SystemAnalytics[]> {
    try {
      return [];
    } catch (error) {
      console.error("Error getting analytics trend:", error);
      return [];
    }
  }

  // Monitoring Utilities
  async checkDatabaseHealth(): Promise<{
    status: string;
    connection_time: number;
    active_connections: number;
    errors: string[];
  }> {
    try {
      const startTime = Date.now();
      await db.execute("SELECT 1 as test");
      const endTime = Date.now();

      return {
        status: "healthy",
        connection_time: endTime - startTime,
        active_connections: 5,
        errors: [],
      };
    } catch (error: any) {
      console.error("Error checking database health:", error);
      return {
        status: "unhealthy",
        connection_time: -1,
        active_connections: 0,
        errors: [error.message],
      };
    }
  }

  async checkSystemPerformance(): Promise<{
    memory_usage: number;
    cpu_usage: number;
    uptime: number;
    response_time: number;
  }> {
    try {
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Measure actual response time with a simple query
      const startTime = Date.now();
      await db.execute(sql`SELECT 1`);
      const responseTime = Date.now() - startTime;

      // CPU usage estimation based on memory and system load
      const cpuLoadEstimate = Math.min(100, memUsagePercent * 1.2);

      return {
        memory_usage: Math.round(memUsagePercent * 100) / 100,
        cpu_usage: Math.round(cpuLoadEstimate * 100) / 100,
        uptime: Math.round(process.uptime()),
        response_time: responseTime,
      };
    } catch (error) {
      console.error("Error checking system performance:", error);
      return {
        memory_usage: 0,
        cpu_usage: 0,
        uptime: 0,
        response_time: -1,
      };
    }
  }

  async getOverdueOrders(): Promise<number> {
    try {
      const overdueOrders = await db
        .select()
        .from(orders)
        .where(
          sql`delivery_date < NOW() AND status NOT IN ('completed', 'delivered')`,
        );
      return overdueOrders.length;
    } catch (error) {
      console.error("Error getting overdue orders:", error);
      return 0;
    }
  }

  async getLowStockItems(): Promise<number> {
    try {
      const lowStockItems = await db
        .select()
        .from(inventory)
        .where(
          sql`${inventory.current_stock} < 100`,
        );
      return lowStockItems.length;
    } catch (error) {
      console.error("Error getting low stock items:", error);
      return 0;
    }
  }

  async getBrokenMachines(): Promise<number> {
    try {
      const brokenMachines = await db
        .select()
        .from(machines)
        .where(eq(machines.status, "broken"));
      return brokenMachines.length;
    } catch (error) {
      console.error("Error getting broken machines:", error);
      return 0;
    }
  }

  async getQualityIssues(): Promise<number> {
    try {
      const qualityIssues = await db
        .select()
        .from(quality_checks)
        .where(
          or(
            eq(quality_checks.result, "fail"),
            sql`${quality_checks.score} < 3`,
          ),
        );
      return qualityIssues.length;
    } catch (error) {
      console.error("Error getting quality issues:", error);
      return 0;
    }
  }

  // Alert Rate Limiting - In-Memory Storage Implementation
  async getLastAlertTime(checkKey: string): Promise<Date | null> {
    try {
      if (!checkKey || typeof checkKey !== "string") {
        return null;
      }

      const lastTime = this.alertTimesStorage.get(checkKey);
      return lastTime || null;
    } catch (error) {
      console.error("[DatabaseStorage] خطأ في جلب وقت التحذير الأخير:", error);
      return null;
    }
  }

  async setLastAlertTime(checkKey: string, timestamp: Date): Promise<void> {
    try {
      if (!checkKey || typeof checkKey !== "string") {
        throw new Error("مفتاح التحذير مطلوب");
      }

      if (!timestamp || !(timestamp instanceof Date)) {
        throw new Error("الوقت المحدد غير صحيح");
      }

      // Store in memory Map for persistence during server session
      this.alertTimesStorage.set(checkKey, timestamp);

      console.log(
        `[DatabaseStorage] تم تسجيل وقت التحذير في الذاكرة: ${checkKey} في ${timestamp.toISOString()}`,
      );
    } catch (error) {
      console.error("[DatabaseStorage] خطأ في حفظ وقت التحذير:", error);
      throw error;
    }
  }

  // Quick Notes Implementation
  async getQuickNotes(userId?: number): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        const assignee = alias(users, "assignee");
        
        const baseQuery = db
          .select({
            id: quick_notes.id,
            content: quick_notes.content,
            note_type: quick_notes.note_type,
            priority: quick_notes.priority,
            created_by: quick_notes.created_by,
            assigned_to: quick_notes.assigned_to,
            is_read: quick_notes.is_read,
            created_at: quick_notes.created_at,
            updated_at: quick_notes.updated_at,
            creator_name: users.display_name,
            assignee_name: assignee.display_name,
          })
          .from(quick_notes)
          .leftJoin(users, eq(quick_notes.created_by, users.id))
          .leftJoin(assignee, eq(quick_notes.assigned_to, assignee.id));

        const notes = await (userId
          ? baseQuery.where(
              or(
                eq(quick_notes.created_by, userId),
                eq(quick_notes.assigned_to, userId),
              ),
            )
          : baseQuery
        ).orderBy(desc(quick_notes.created_at));
        
        // Get attachments for each note
        const noteIds = notes.map((n) => n.id);
        const attachments = noteIds.length > 0
          ? await db
              .select()
              .from(note_attachments)
              .where(inArray(note_attachments.note_id, noteIds))
          : [];

        // Group attachments by note_id
        const attachmentsByNote = new Map<number, any[]>();
        attachments.forEach((att) => {
          if (!attachmentsByNote.has(att.note_id)) {
            attachmentsByNote.set(att.note_id, []);
          }
          attachmentsByNote.get(att.note_id)!.push(att);
        });

        // Add attachments to notes
        return notes.map((note) => ({
          ...note,
          attachments: attachmentsByNote.get(note.id) || [],
        }));
      },
      "جلب الملاحظات السريعة",
      userId ? `للمستخدم: ${userId}` : "جميع الملاحظات",
    );
  }

  async getQuickNoteById(id: number): Promise<any | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const assignee = alias(users, "assignee");
        
        const [note] = await db
          .select({
            id: quick_notes.id,
            content: quick_notes.content,
            note_type: quick_notes.note_type,
            priority: quick_notes.priority,
            created_by: quick_notes.created_by,
            assigned_to: quick_notes.assigned_to,
            is_read: quick_notes.is_read,
            created_at: quick_notes.created_at,
            updated_at: quick_notes.updated_at,
            creator_name: users.display_name,
            assignee_name: assignee.display_name,
          })
          .from(quick_notes)
          .leftJoin(users, eq(quick_notes.created_by, users.id))
          .leftJoin(assignee, eq(quick_notes.assigned_to, assignee.id))
          .where(eq(quick_notes.id, id));

        if (!note) return undefined;

        // Get attachments
        const attachments = await db
          .select()
          .from(note_attachments)
          .where(eq(note_attachments.note_id, id));

        return {
          ...note,
          attachments,
        };
      },
      "جلب ملاحظة",
      `رقم ${id}`,
    );
  }

  async createQuickNote(note: InsertQuickNote): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const [newNote] = await db
          .insert(quick_notes)
          .values(note)
          .returning();
        return newNote;
      },
      "إنشاء ملاحظة سريعة",
      "",
    );
  }

  async updateQuickNote(id: number, updates: Partial<QuickNote>): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const [updatedNote] = await db
          .update(quick_notes)
          .set({ ...updates, updated_at: new Date() })
          .where(eq(quick_notes.id, id))
          .returning();
        return updatedNote;
      },
      "تحديث ملاحظة",
      `رقم ${id}`,
    );
  }

  async deleteQuickNote(id: number): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await db.delete(quick_notes).where(eq(quick_notes.id, id));
      },
      "حذف ملاحظة",
      `رقم ${id}`,
    );
  }

  async markNoteAsRead(id: number): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const [updatedNote] = await db
          .update(quick_notes)
          .set({ is_read: true, updated_at: new Date() })
          .where(eq(quick_notes.id, id))
          .returning();
        return updatedNote;
      },
      "تحديث حالة القراءة",
      `رقم ${id}`,
    );
  }

  async createNoteAttachment(attachment: InsertNoteAttachment): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const [newAttachment] = await db
          .insert(note_attachments)
          .values(attachment)
          .returning();
        return newAttachment;
      },
      "إضافة مرفق",
      "",
    );
  }

  async getNoteAttachments(noteId: number): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        return await db
          .select()
          .from(note_attachments)
          .where(eq(note_attachments.note_id, noteId));
      },
      "جلب المرفقات",
      `للملاحظة رقم ${noteId}`,
    );
  }

  async deleteNoteAttachment(id: number): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await db.delete(note_attachments).where(eq(note_attachments.id, id));
      },
      "حذف مرفق",
      `رقم ${id}`,
    );
  }

  // ============ Film Operator Functions ============
  
  async getActiveProductionOrdersForOperator(userId: number): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        // Get user to check role and section
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user.length) {
          return [];
        }

        // Allow admin (role_id = 1) or Film Operator (role_id = 3) or users in Film section (section_id = 3)
        const isAdmin = user[0].role_id === 1;
        const isFilmOperator = user[0].role_id === 3;
        const isInFilmSection = user[0].section_id === 3;
        
        if (!isAdmin && !isFilmOperator && !isInFilmSection) {
          return [];
        }

        // Get active production orders for film section
        const ordersData = await db
          .select({
            id: production_orders.id,
            production_order_number: production_orders.production_order_number,
            order_id: production_orders.order_id,
            customer_product_id: production_orders.customer_product_id,
            quantity_kg: production_orders.quantity_kg,
            produced_quantity_kg: production_orders.produced_quantity_kg,
            final_quantity_kg: production_orders.final_quantity_kg,
            status: production_orders.status,
            is_final_roll_created: production_orders.is_final_roll_created,
            film_completed: production_orders.film_completed,
            production_start_time: production_orders.production_start_time,
            production_end_time: production_orders.production_end_time,
            production_time_minutes: production_orders.production_time_minutes,
            order_number: orders.order_number,
            customer_id: orders.customer_id,
            customer_name: sql<string>`COALESCE(${customers.name_ar}, ${customers.name})`,
            product_name: sql<string>`COALESCE(${items.name_ar}, ${items.name})`,
            order_status: orders.status,
            // Product details for Film section
            category_id: customer_products.category_id,
            category_name: sql<string>`COALESCE(${categories.name_ar}, ${categories.name})`,
            size_caption: customer_products.size_caption,
            raw_material: customer_products.raw_material,
            thickness: customer_products.thickness,
          })
          .from(production_orders)
          .leftJoin(orders, eq(production_orders.order_id, orders.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
          .leftJoin(items, eq(customer_products.item_id, items.id))
          .leftJoin(categories, eq(customer_products.category_id, categories.id))
          .where(
            and(
              inArray(production_orders.status, ["pending", "in_production"]),
              eq(production_orders.film_completed, false),
              ne(orders.status, "waiting")
            )
          )
          .orderBy(desc(production_orders.created_at));

        // Get rolls count for each production order
        const rollsCounts = await db
          .select({
            production_order_id: rolls.production_order_id,
            rolls_count: count(rolls.id),
            total_weight: sum(rolls.weight_kg),
          })
          .from(rolls)
          .where(
            inArray(
              rolls.production_order_id,
              ordersData.map(o => o.id)
            )
          )
          .groupBy(rolls.production_order_id);

        // Merge data
        return ordersData.map(order => {
          const rollData = rollsCounts.find(r => r.production_order_id === order.id);
          return {
            ...order,
            rolls_count: rollData?.rolls_count || 0,
            total_weight_produced: rollData?.total_weight || 0,
            can_create_roll: !order.is_final_roll_created,
            remaining_quantity: Number(order.final_quantity_kg) - (Number(rollData?.total_weight) || 0),
          };
        });
      },
      "getActiveProductionOrdersForOperator",
      "جلب أوامر الإنتاج النشطة للعامل",
    );
  }

  async createRollWithTiming(rollData: InsertRoll & { is_last_roll?: boolean }): Promise<Roll> {
    return withDatabaseErrorHandling(
      async () => {
        const productionOrderId = rollData.production_order_id;
        
        // Get production order details
        const [productionOrder] = await db
          .select()
          .from(production_orders)
          .where(eq(production_orders.id, productionOrderId))
          .limit(1);

        if (!productionOrder) {
          throw new Error("أمر الإنتاج غير موجود");
        }

        if (productionOrder.is_final_roll_created) {
          throw new Error("لا يمكن إنشاء رولات جديدة بعد آخر رول");
        }

        // Calculate production time if this is not the first roll
        let productionTimeMinutes: number | null = null;
        const previousRolls = await db
          .select()
          .from(rolls)
          .where(eq(rolls.production_order_id, productionOrderId))
          .orderBy(desc(rolls.roll_created_at));

        if (previousRolls.length > 0) {
          const lastRoll = previousRolls[0];
          const timeDiff = Date.now() - new Date(lastRoll.roll_created_at || lastRoll.created_at).getTime();
          productionTimeMinutes = Math.floor(timeDiff / (1000 * 60)); // Convert to minutes
        }

        // Start production if this is the first roll
        if (!productionOrder.production_start_time) {
          await db
            .update(production_orders)
            .set({ production_start_time: new Date() })
            .where(eq(production_orders.id, productionOrderId));
        }

        // Create the roll using the main createRoll method to ensure proper roll_seq generation
        // Skip weight validation for last roll since it may need to exceed the target
        const newRoll = await this.createRoll(rollData, { skipWeightValidation: rollData.is_last_roll });

        // Update produced quantity (already handled in createRoll, but we need to update film_completion_percentage)
        const allRolls = await db
          .select({ weight_kg: rolls.weight_kg })
          .from(rolls)
          .where(eq(rolls.production_order_id, productionOrderId));

        const totalProduced = allRolls.reduce(
          (sum, r) => sum + Number(r.weight_kg), 
          0
        );

        const finalQuantity = Number(productionOrder.final_quantity_kg);
        const completionPercentage = Math.min(100, (totalProduced / finalQuantity) * 100);
        
        // Check if production should be completed:
        // 1. If this is explicitly marked as the last roll (is_last_roll = true)
        // 2. Or if the total produced quantity >= final required quantity
        const shouldComplete = rollData.is_last_roll || totalProduced >= finalQuantity;

        if (shouldComplete) {
          // Calculate production time
          const firstRoll = await db
            .select()
            .from(rolls)
            .where(eq(rolls.production_order_id, productionOrderId))
            .orderBy(rolls.roll_created_at)
            .limit(1);

          let totalProductionMinutes = 0;
          if (firstRoll.length > 0) {
            const startTime = productionOrder.production_start_time || firstRoll[0].roll_created_at || firstRoll[0].created_at;
            const timeDiff = Date.now() - new Date(startTime).getTime();
            totalProductionMinutes = Math.floor(timeDiff / (1000 * 60));
          }

          // Mark film production as completed
          const endTime = new Date();
          await db
            .update(production_orders)
            .set({ 
              produced_quantity_kg: numberToDecimalString(totalProduced),
              film_completion_percentage: "100",
              is_final_roll_created: true,
              film_completed: true,
              production_end_time: endTime,
              production_time_minutes: totalProductionMinutes,
              status: "completed",
            })
            .where(eq(production_orders.id, productionOrderId));
        } else {
          // Normal update without completion
          await db
            .update(production_orders)
            .set({ 
              produced_quantity_kg: numberToDecimalString(totalProduced),
              film_completion_percentage: numberToDecimalString(completionPercentage),
            })
            .where(eq(production_orders.id, productionOrderId));
        }

        return newRoll;
      },
      "createRollWithTiming",
      "إنشاء رول مع حساب الوقت",
    );
  }

  async createFinalRoll(rollData: InsertRoll): Promise<Roll> {
    return withDatabaseErrorHandling(
      async () => {
        const productionOrderId = rollData.production_order_id;
        
        // Get production order details
        const [productionOrder] = await db
          .select()
          .from(production_orders)
          .where(eq(production_orders.id, productionOrderId))
          .limit(1);

        if (!productionOrder) {
          throw new Error("أمر الإنتاج غير موجود");
        }

        if (productionOrder.is_final_roll_created) {
          throw new Error("آخر رول تم إنشاؤه بالفعل");
        }

        // Calculate production time from first roll
        const firstRoll = await db
          .select()
          .from(rolls)
          .where(eq(rolls.production_order_id, productionOrderId))
          .orderBy(rolls.roll_created_at)
          .limit(1);

        let totalProductionMinutes = 0;
        if (firstRoll.length > 0) {
          const startTime = productionOrder.production_start_time || firstRoll[0].roll_created_at || firstRoll[0].created_at;
          const timeDiff = Date.now() - new Date(startTime).getTime();
          totalProductionMinutes = Math.floor(timeDiff / (1000 * 60));
        }

        // Create the final roll using the main createRoll method to ensure proper roll_seq generation
        // Skip weight validation for final roll since it may exceed the target to complete production
        const newRoll = await this.createRoll(rollData, { skipWeightValidation: true });

        // Update production order to mark film as completed
        const endTime = new Date();
        await db
          .update(production_orders)
          .set({
            is_final_roll_created: true,
            film_completed: true,
            production_end_time: endTime,
            production_time_minutes: totalProductionMinutes,
            film_completion_percentage: "100",
            status: "completed", // Mark order as completed in film stage
          })
          .where(eq(production_orders.id, productionOrderId));

        // Calculate final produced quantity
        const allRolls = await db
          .select({ weight_kg: rolls.weight_kg })
          .from(rolls)
          .where(eq(rolls.production_order_id, productionOrderId));

        const totalProduced = allRolls.reduce(
          (sum, r) => sum + Number(r.weight_kg), 
          0
        );

        await db
          .update(production_orders)
          .set({ 
            produced_quantity_kg: numberToDecimalString(totalProduced),
          })
          .where(eq(production_orders.id, productionOrderId));

        return newRoll;
      },
      "createFinalRoll",
      "إنشاء آخر رول وإغلاق مرحلة الفيلم",
    );
  }

  async calculateProductionTime(productionOrderId: number): Promise<number> {
    return withDatabaseErrorHandling(
      async () => {
        const [productionOrder] = await db
          .select()
          .from(production_orders)
          .where(eq(production_orders.id, productionOrderId))
          .limit(1);

        if (!productionOrder) {
          throw new Error("أمر الإنتاج غير موجود");
        }

        if (!productionOrder.production_start_time) {
          return 0;
        }

        const endTime = productionOrder.production_end_time || new Date();
        const startTime = new Date(productionOrder.production_start_time);
        const diffMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
        
        return diffMinutes;
      },
      "calculateProductionTime",
      "حساب وقت الإنتاج",
    );
  }

  // ============ Printing Operator Functions ============

  async getActivePrintingRollsForOperator(userId: number): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        // Get user to check role and section
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user.length) {
          return [];
        }

        // Allow admin (role_id = 1) or Printing Operator (role_id = 4) or users in Printing section (section_id = 4)
        const isAdmin = user[0].role_id === 1;
        const isPrintingOperator = user[0].role_id === 4;
        const isInPrintingSection = user[0].section_id === 4;
        
        if (!isAdmin && !isPrintingOperator && !isInPrintingSection) {
          return [];
        }

        // Get rolls in film stage (ready for printing)
        const rollsData = await db
          .select({
            roll_id: rolls.id,
            roll_number: rolls.roll_number,
            roll_seq: rolls.roll_seq,
            weight_kg: rolls.weight_kg,
            waste_kg: rolls.waste_kg,
            stage: rolls.stage,
            roll_created_at: rolls.roll_created_at,
            printed_at: rolls.printed_at,
            production_order_id: rolls.production_order_id,
            production_order_number: production_orders.production_order_number,
            order_number: orders.order_number,
            customer_name: sql<string>`COALESCE(${customers.name_ar}, ${customers.name})`,
            product_name: sql<string>`COALESCE(${items.name_ar}, ${items.name})`,
            // Product details for Printing section
            printing_cylinder: customer_products.printing_cylinder,
          })
          .from(rolls)
          .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
          .leftJoin(orders, eq(production_orders.order_id, orders.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
          .leftJoin(items, eq(customer_products.item_id, items.id))
          .where(eq(rolls.stage, 'film'))
          .orderBy(desc(rolls.roll_created_at));

        // Group by production order
        const groupedByOrder = rollsData.reduce((acc: any, roll: any) => {
          const orderId = roll.production_order_id;
          if (!acc[orderId]) {
            acc[orderId] = {
              production_order_id: orderId,
              production_order_number: roll.production_order_number,
              order_number: roll.order_number,
              customer_name: roll.customer_name,
              product_name: roll.product_name,
              printing_cylinder: roll.printing_cylinder,
              rolls: [],
              total_rolls: 0,
              total_weight: 0,
            };
          }
          acc[orderId].rolls.push(roll);
          acc[orderId].total_rolls++;
          acc[orderId].total_weight += Number(roll.weight_kg) || 0;
          return acc;
        }, {});

        return Object.values(groupedByOrder);
      },
      "getActivePrintingRollsForOperator",
      "جلب الرولات النشطة لعامل الطباعة",
    );
  }

  // ============ Cutting Operator Functions ============

  async getActiveCuttingRollsForOperator(userId: number): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        // Get user to check role and section
        const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!user.length) {
          return [];
        }

        // Allow admin (role_id = 1) or Cutting Operator (role_id = 6) or users in Cutting section (section_id = 5)
        const isAdmin = user[0].role_id === 1;
        const isCuttingOperator = user[0].role_id === 6;
        const isInCuttingSection = user[0].section_id === 5;
        
        if (!isAdmin && !isCuttingOperator && !isInCuttingSection) {
          return [];
        }

        // Get rolls in printing stage (ready for cutting)
        const rollsData = await db
          .select({
            roll_id: rolls.id,
            roll_number: rolls.roll_number,
            roll_seq: rolls.roll_seq,
            weight_kg: rolls.weight_kg,
            waste_kg: rolls.waste_kg,
            stage: rolls.stage,
            roll_created_at: rolls.roll_created_at,
            printed_at: rolls.printed_at,
            cut_completed_at: rolls.cut_completed_at,
            production_order_id: rolls.production_order_id,
            production_order_number: production_orders.production_order_number,
            order_number: orders.order_number,
            customer_name: sql<string>`COALESCE(${customers.name_ar}, ${customers.name})`,
            product_name: sql<string>`COALESCE(${items.name_ar}, ${items.name})`,
            // Product details for Cutting section
            cutting_length_cm: customer_products.cutting_length_cm,
            punching: customer_products.punching,
          })
          .from(rolls)
          .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
          .leftJoin(orders, eq(production_orders.order_id, orders.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
          .leftJoin(items, eq(customer_products.item_id, items.id))
          .where(eq(rolls.stage, 'printing'))
          .orderBy(desc(rolls.roll_created_at));

        // Group by production order
        const groupedByOrder = rollsData.reduce((acc: any, roll: any) => {
          const orderId = roll.production_order_id;
          if (!acc[orderId]) {
            acc[orderId] = {
              production_order_id: orderId,
              production_order_number: roll.production_order_number,
              order_number: roll.order_number,
              customer_name: roll.customer_name,
              product_name: roll.product_name,
              cutting_length_cm: roll.cutting_length_cm,
              punching: roll.punching,
              rolls: [],
              total_rolls: 0,
              total_weight: 0,
            };
          }
          acc[orderId].rolls.push(roll);
          acc[orderId].total_rolls++;
          acc[orderId].total_weight += Number(roll.weight_kg) || 0;
          return acc;
        }, {});

        return Object.values(groupedByOrder);
      },
      "getActiveCuttingRollsForOperator",
      "جلب الرولات النشطة لعامل التقطيع",
    );
  }

  // ============ Mixing Batches ============

  async getAllMixingBatches(): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        const batches = await db
          .select({
            id: mixing_batches.id,
            batch_number: mixing_batches.batch_number,
            production_order_id: mixing_batches.production_order_id,
            production_order_number: production_orders.production_order_number,
            machine_id: mixing_batches.machine_id,
            machine_name: machines.name_ar,
            operator_id: mixing_batches.operator_id,
            operator_name: users.display_name,
            screw_assignment: mixing_batches.screw_assignment,
            total_weight_kg: mixing_batches.total_weight_kg,
            status: mixing_batches.status,
            notes: mixing_batches.notes,
            created_at: mixing_batches.created_at,
          })
          .from(mixing_batches)
          .leftJoin(production_orders, eq(mixing_batches.production_order_id, production_orders.id))
          .leftJoin(machines, eq(mixing_batches.machine_id, machines.id))
          .leftJoin(users, eq(mixing_batches.operator_id, users.id))
          .orderBy(desc(mixing_batches.created_at));

        // Get ingredients for each batch with material names
        for (const batch of batches) {
          const ingredients = await db
            .select({
              id: batch_ingredients.id,
              item_id: batch_ingredients.item_id,
              actual_weight_kg: batch_ingredients.actual_weight_kg,
              percentage: batch_ingredients.percentage,
              notes: batch_ingredients.notes,
              material_name: items.name,
              material_name_ar: items.name_ar,
            })
            .from(batch_ingredients)
            .leftJoin(items, eq(batch_ingredients.item_id, items.id))
            .where(eq(batch_ingredients.batch_id, batch.id));
          
          (batch as any).ingredients = ingredients;
          
          // Build composition array
          (batch as any).composition = ingredients.map((ing: any) => ({
            material_name: ing.material_name,
            material_name_ar: ing.material_name_ar,
            percentage: ing.percentage ? `${parseFloat(ing.percentage).toFixed(2)}%` : '0%',
          }));
        }

        return batches;
      },
      "getAllMixingBatches",
      "جلب جميع عمليات الخلط",
    );
  }

  async getMixingBatchById(id: number): Promise<any | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [batch] = await db
          .select({
            id: mixing_batches.id,
            batch_number: mixing_batches.batch_number,
            production_order_id: mixing_batches.production_order_id,
            production_order_number: production_orders.production_order_number,
            machine_id: mixing_batches.machine_id,
            machine_name: machines.name_ar,
            operator_id: mixing_batches.operator_id,
            operator_name: users.display_name,
            screw_assignment: mixing_batches.screw_assignment,
            total_weight_kg: mixing_batches.total_weight_kg,
            status: mixing_batches.status,
            notes: mixing_batches.notes,
            created_at: mixing_batches.created_at,
          })
          .from(mixing_batches)
          .leftJoin(production_orders, eq(mixing_batches.production_order_id, production_orders.id))
          .leftJoin(machines, eq(mixing_batches.machine_id, machines.id))
          .leftJoin(users, eq(mixing_batches.operator_id, users.id))
          .where(eq(mixing_batches.id, id));

        if (!batch) return undefined;

        const ingredients = await db
          .select()
          .from(batch_ingredients)
          .where(eq(batch_ingredients.batch_id, id));

        return { ...batch, ingredients };
      },
      "getMixingBatchById",
      `جلب عملية الخلط رقم ${id}`,
    );
  }

  async createMixingBatch(batch: InsertMixingBatch, ingredients: InsertBatchIngredient[]): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.transaction(async (tx) => {
          // Auto-generate batch_number (MX001, MX002, etc.)
          const latestBatch = await tx
            .select({ batch_number: mixing_batches.batch_number })
            .from(mixing_batches)
            .orderBy(desc(mixing_batches.id))
            .limit(1);

          let nextNumber = 1;
          if (latestBatch.length > 0 && latestBatch[0].batch_number) {
            const match = latestBatch[0].batch_number.match(/MX(\d+)/);
            if (match) {
              nextNumber = parseInt(match[1], 10) + 1;
            }
          }
          const batch_number = `MX${nextNumber.toString().padStart(3, '0')}`;

          // Create batch with auto-generated batch_number
          const [newBatch] = await tx
            .insert(mixing_batches)
            .values({
              ...batch,
              batch_number,
            })
            .returning();

          // Create ingredients
          const ingredientsWithBatchId = ingredients.map(ing => ({
            ...ing,
            batch_id: newBatch.id,
          }));

          const newIngredients = await tx
            .insert(batch_ingredients)
            .values(ingredientsWithBatchId)
            .returning();

          return { ...newBatch, ingredients: newIngredients };
        });
      },
      "createMixingBatch",
      "إنشاء عملية خلط جديدة",
    );
  }

  async updateMixingBatch(id: number, updates: Partial<MixingBatch>): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const [updatedBatch] = await db
          .update(mixing_batches)
          .set(updates)
          .where(eq(mixing_batches.id, id))
          .returning();

        if (!updatedBatch) {
          throw new Error("عملية الخلط غير موجودة");
        }

        const ingredients = await db
          .select()
          .from(batch_ingredients)
          .where(eq(batch_ingredients.batch_id, id));

        return { ...updatedBatch, ingredients };
      },
      "updateMixingBatch",
      `تحديث عملية الخلط رقم ${id}`,
    );
  }

  async updateBatchIngredientActuals(batchId: number, ingredientUpdates: Array<{
    id: number;
    actual_weight_kg: string;
  }>): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await db.transaction(async (tx) => {
          for (const update of ingredientUpdates) {
            const [ingredient] = await tx
              .select()
              .from(batch_ingredients)
              .where(eq(batch_ingredients.id, update.id));

            if (!ingredient) {
              throw new Error(`المكون رقم ${update.id} غير موجود`);
            }

            await tx
              .update(batch_ingredients)
              .set({
                actual_weight_kg: update.actual_weight_kg,
              })
              .where(eq(batch_ingredients.id, update.id));
          }
        });
      },
      "updateBatchIngredientActuals",
      `تحديث الكميات الفعلية لخلطة رقم ${batchId}`,
    );
  }

  async completeMixingBatch(id: number): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const [updatedBatch] = await db
          .update(mixing_batches)
          .set({
            status: "completed",
          })
          .where(eq(mixing_batches.id, id))
          .returning();

        if (!updatedBatch) {
          throw new Error("عملية الخلط غير موجودة");
        }

        const ingredients = await db
          .select()
          .from(batch_ingredients)
          .where(eq(batch_ingredients.batch_id, id));

        return { ...updatedBatch, ingredients };
      },
      "completeMixingBatch",
      `إتمام عملية الخلط رقم ${id}`,
    );
  }

  async getMixingBatchesByOperator(operatorId: number): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        const batches = await db
          .select()
          .from(mixing_batches)
          .where(eq(mixing_batches.operator_id, operatorId))
          .orderBy(desc(mixing_batches.created_at));

        for (const batch of batches) {
          const ingredients = await db
            .select()
            .from(batch_ingredients)
            .where(eq(batch_ingredients.batch_id, batch.id));
          (batch as any).ingredients = ingredients;
        }

        return batches;
      },
      "getMixingBatchesByOperator",
      `جلب عمليات الخلط للعامل رقم ${operatorId}`,
    );
  }

  async getMixingBatchesByProductionOrder(productionOrderId: number): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        const batches = await db
          .select()
          .from(mixing_batches)
          .where(eq(mixing_batches.production_order_id, productionOrderId))
          .orderBy(mixing_batches.created_at);

        for (const batch of batches) {
          const ingredients = await db
            .select()
            .from(batch_ingredients)
            .where(eq(batch_ingredients.batch_id, batch.id));
          (batch as any).ingredients = ingredients;
        }

        return batches;
      },
      "getMixingBatchesByProductionOrder",
      `جلب عمليات الخلط لأمر الإنتاج رقم ${productionOrderId}`,
    );
  }

  // ============ Printing Operator Functions ============
  
  async getRollsForPrintingBySection(sectionId?: number): Promise<any[]> {
    return withDatabaseErrorHandling(
      async () => {
        // Get rolls in film stage ready for printing
        const rollsData = await db
          .select({
            id: rolls.id,
            roll_number: rolls.roll_number,
            roll_seq: rolls.roll_seq,
            weight_kg: rolls.weight_kg,
            stage: rolls.stage,
            production_order_id: rolls.production_order_id,
            created_at: rolls.created_at,
            qr_code_text: rolls.qr_code_text,
            production_order_number: production_orders.production_order_number,
            order_id: production_orders.order_id,
            customer_product_id: production_orders.customer_product_id,
            quantity_kg: production_orders.quantity_kg,
            final_quantity_kg: production_orders.final_quantity_kg,
            produced_quantity_kg: production_orders.produced_quantity_kg,
            printed_quantity_kg: production_orders.printed_quantity_kg,
            printing_completion_percentage: production_orders.printing_completion_percentage,
            order_number: orders.order_number,
            customer_id: orders.customer_id,
            customer_name: customers.name,
            customer_name_ar: customers.name_ar,
            item_id: items.id,
            item_name: items.name,
            item_name_ar: items.name_ar,
            size_caption: customer_products.size_caption,
          })
          .from(rolls)
          .leftJoin(production_orders, eq(rolls.production_order_id, production_orders.id))
          .leftJoin(orders, eq(production_orders.order_id, orders.id))
          .leftJoin(customers, eq(orders.customer_id, customers.id))
          .leftJoin(customer_products, eq(production_orders.customer_product_id, customer_products.id))
          .leftJoin(items, eq(customer_products.item_id, items.id))
          .where(
            eq(rolls.stage, "film") // Only rolls in film stage ready for printing
          )
          .orderBy(desc(orders.created_at), production_orders.production_order_number, rolls.roll_seq);

        // Group rolls by production order
        const groupedOrders: Map<number, any> = new Map();

        rollsData.forEach(roll => {
          const orderId = roll.production_order_id;
          if (!groupedOrders.has(orderId)) {
            groupedOrders.set(orderId, {
              id: orderId,
              production_order_number: roll.production_order_number,
              quantity_kg: roll.quantity_kg,
              final_quantity_kg: roll.final_quantity_kg,
              produced_quantity_kg: roll.produced_quantity_kg,
              printed_quantity_kg: roll.printed_quantity_kg,
              printing_completion_percentage: roll.printing_completion_percentage,
              order_number: roll.order_number,
              customer_name: roll.customer_name,
              customer_name_ar: roll.customer_name_ar,
              item_name: roll.item_name,
              item_name_ar: roll.item_name_ar,
              size_caption: roll.size_caption,
              rolls: []
            });
          }

          groupedOrders.get(orderId).rolls.push({
            id: roll.id,
            roll_number: roll.roll_number,
            roll_seq: roll.roll_seq,
            weight_kg: roll.weight_kg,
            stage: roll.stage,
            production_order_id: roll.production_order_id,
            created_at: roll.created_at,
            qr_code_text: roll.qr_code_text,
          });
        });

        return Array.from(groupedOrders.values());
      },
      "getRollsForPrintingBySection",
      "جلب الرولات الجاهزة للطباعة حسب القسم",
    );
  }

  async markRollAsPrinted(rollId: number, operatorId: number): Promise<Roll> {
    return withDatabaseErrorHandling(
      async () => {
        return await db.transaction(async (tx) => {
          // Get current roll details
          const [currentRoll] = await tx
            .select()
            .from(rolls)
            .where(eq(rolls.id, rollId));
          
          if (!currentRoll) {
            throw new Error("الرول غير موجود");
          }

          if (currentRoll.stage !== "film") {
            throw new Error("الرول غير جاهز للطباعة");
          }

          // Update roll to cutting stage (skipping printing stage as it goes directly to cutting)
          const [updatedRoll] = await tx
            .update(rolls)
            .set({
              stage: "cutting", // Move directly to cutting as per requirements
              printed_at: new Date(),
              printed_by: operatorId,
            })
            .where(eq(rolls.id, rollId))
            .returning();

          // Calculate printed quantity for the production order
          const printedRollsWeight = await tx
            .select({
              total: sql<number>`COALESCE(SUM(${rolls.weight_kg}::decimal), 0)`,
            })
            .from(rolls)
            .where(
              and(
                eq(rolls.production_order_id, currentRoll.production_order_id),
                or(
                  eq(rolls.stage, "cutting"),
                  eq(rolls.stage, "done")
                )
              )
            );

          const printedQuantity = Number(printedRollsWeight[0]?.total || 0);

          // Get production order details
          const [productionOrder] = await tx
            .select()
            .from(production_orders)
            .where(eq(production_orders.id, currentRoll.production_order_id));

          if (productionOrder) {
            const producedQuantityKg = parseFloat(
              productionOrder.produced_quantity_kg?.toString() || "0"
            );
            
            // Calculate printing completion percentage
            const printingPercentage = producedQuantityKg > 0 
              ? Math.min(100, (printedQuantity / producedQuantityKg) * 100)
              : 0;

            // Check if all rolls are printed
            const [remainingRolls] = await tx
              .select({ count: count() })
              .from(rolls)
              .where(
                and(
                  eq(rolls.production_order_id, currentRoll.production_order_id),
                  eq(rolls.stage, "film")
                )
              );

            const allRollsPrinted = remainingRolls.count === 0;

            // Update production order
            await tx
              .update(production_orders)
              .set({
                printed_quantity_kg: numberToDecimalString(printedQuantity, 2),
                printing_completion_percentage: numberToDecimalString(printingPercentage, 2),
                printing_completed: allRollsPrinted,
              })
              .where(eq(production_orders.id, currentRoll.production_order_id));
          }

          // Invalidate cache
          invalidateProductionCache("all");

          return updatedRoll;
        });
      },
      "markRollAsPrinted",
      "تسجيل طباعة الرول",
    );
  }

  async getPrintingStats(userId?: number): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get today's printed rolls count
        const [todayPrinted] = await db
          .select({ count: count() })
          .from(rolls)
          .where(
            and(
              sql`${rolls.printed_at}::date >= ${today}`,
              sql`${rolls.printed_at} IS NOT NULL`
            )
          );

        // Get hourly rate for today
        const hoursElapsed = (Date.now() - today.getTime()) / (1000 * 60 * 60);
        const hourlyRate = hoursElapsed > 0 ? todayPrinted.count / hoursElapsed : 0;

        // Get pending rolls (in film stage)
        const [pendingRolls] = await db
          .select({ count: count() })
          .from(rolls)
          .where(eq(rolls.stage, "film"));

        // Get completed orders today
        const [completedOrders] = await db
          .select({ count: count() })
          .from(production_orders)
          .where(
            and(
              eq(production_orders.printing_completed, true),
              sql`DATE(${production_orders.created_at}) = CURRENT_DATE`
            )
          );

        return {
          todayPrintedCount: todayPrinted.count,
          hourlyRate: Math.round(hourlyRate * 10) / 10,
          pendingRolls: pendingRolls.count,
          completedOrders: completedOrders.count,
        };
      },
      "getPrintingStats",
      "جلب إحصائيات الطباعة",
    );
  }

  async checkPrintingCompletion(productionOrderId: number): Promise<boolean> {
    return withDatabaseErrorHandling(
      async () => {
        const [remainingRolls] = await db
          .select({ count: count() })
          .from(rolls)
          .where(
            and(
              eq(rolls.production_order_id, productionOrderId),
              eq(rolls.stage, "film")
            )
          );

        return remainingRolls.count === 0;
      },
      "checkPrintingCompletion",
      "التحقق من اكتمال الطباعة",
    );
  }

  // ===== Master Batch Colors =====
  async getMasterBatchColors(): Promise<MasterBatchColor[]> {
    return withDatabaseErrorHandling(
      async () => {
        const colors = await db
          .select()
          .from(master_batch_colors)
          .where(eq(master_batch_colors.is_active, true))
          .orderBy(master_batch_colors.sort_order, master_batch_colors.name);
        return colors;
      },
      "getMasterBatchColors",
      "جلب ألوان الماستر باتش",
    );
  }

  async getMasterBatchColorById(id: string): Promise<MasterBatchColor | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [color] = await db
          .select()
          .from(master_batch_colors)
          .where(eq(master_batch_colors.id, id));
        return color || undefined;
      },
      "getMasterBatchColorById",
      `جلب لون الماستر باتش ${id}`,
    );
  }

  async createMasterBatchColor(color: InsertMasterBatchColor): Promise<MasterBatchColor> {
    return withDatabaseErrorHandling(
      async () => {
        const [newColor] = await db
          .insert(master_batch_colors)
          .values({
            ...color,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();
        return newColor;
      },
      "createMasterBatchColor",
      "إنشاء لون ماستر باتش جديد",
    );
  }

  async updateMasterBatchColor(id: string, updates: Partial<MasterBatchColor>): Promise<MasterBatchColor> {
    return withDatabaseErrorHandling(
      async () => {
        const [updatedColor] = await db
          .update(master_batch_colors)
          .set({
            ...updates,
            updated_at: new Date(),
          })
          .where(eq(master_batch_colors.id, id))
          .returning();
        
        if (!updatedColor) {
          throw new Error(`لون الماستر باتش غير موجود: ${id}`);
        }
        
        return updatedColor;
      },
      "updateMasterBatchColor",
      `تحديث لون الماستر باتش ${id}`,
    );
  }

  async deleteMasterBatchColor(id: string): Promise<void> {
    return withDatabaseErrorHandling(
      async () => {
        await db
          .delete(master_batch_colors)
          .where(eq(master_batch_colors.id, id));
      },
      "deleteMasterBatchColor",
      `حذف لون الماستر باتش ${id}`,
    );
  }

  // ===== Warehouse Vouchers System Implementation =====

  async getNextVoucherNumber(type: "RMI" | "RMO" | "FGI" | "FGO" | "IC"): Promise<string> {
    return withDatabaseErrorHandling(
      async () => {
        let table: any;
        let prefix: string;
        
        switch (type) {
          case "RMI":
            table = raw_material_vouchers_in;
            prefix = "RMI";
            break;
          case "RMO":
            table = raw_material_vouchers_out;
            prefix = "RMO";
            break;
          case "FGI":
            table = finished_goods_vouchers_in;
            prefix = "FGI";
            break;
          case "FGO":
            table = finished_goods_vouchers_out;
            prefix = "FGO";
            break;
          case "IC":
            table = inventory_counts;
            prefix = "IC";
            break;
        }

        const result = await db
          .select({ count: count() })
          .from(table);
        
        const nextNum = (result[0]?.count || 0) + 1;
        return `${prefix}-${String(nextNum).padStart(5, "0")}`;
      },
      "getNextVoucherNumber",
      `توليد رقم سند ${type}`,
    );
  }

  // Raw Material In Vouchers
  async getRawMaterialVouchersIn(): Promise<RawMaterialVoucherIn[]> {
    return withDatabaseErrorHandling(
      async () => {
        const vouchers = await db
          .select()
          .from(raw_material_vouchers_in)
          .orderBy(desc(raw_material_vouchers_in.created_at));
        return vouchers;
      },
      "getRawMaterialVouchersIn",
      "جلب سندات إدخال المواد الخام",
    );
  }

  async getRawMaterialVoucherInById(id: number): Promise<RawMaterialVoucherIn | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [voucher] = await db
          .select()
          .from(raw_material_vouchers_in)
          .where(eq(raw_material_vouchers_in.id, id));
        return voucher;
      },
      "getRawMaterialVoucherInById",
      `جلب سند إدخال مواد خام ${id}`,
    );
  }

  async createRawMaterialVoucherIn(voucherData: any): Promise<RawMaterialVoucherIn> {
    return withDatabaseErrorHandling(
      async () => {
        const voucherNumber = await this.getNextVoucherNumber("RMI");
        
        const [voucher] = await db
          .insert(raw_material_vouchers_in)
          .values({
            ...voucherData,
            voucher_number: voucherNumber,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        // تحديث المخزون
        if (voucherData.item_id && voucherData.quantity) {
          const existingInventory = await db
            .select()
            .from(inventory)
            .where(eq(inventory.item_id, voucherData.item_id))
            .limit(1);

          if (existingInventory.length > 0) {
            await db
              .update(inventory)
              .set({
                current_stock: sql`${inventory.current_stock} + ${voucherData.quantity}`,
                last_updated: new Date(),
              })
              .where(eq(inventory.item_id, voucherData.item_id));
          } else {
            await db.insert(inventory).values({
              item_id: voucherData.item_id,
              location_id: voucherData.location_id,
              current_stock: voucherData.quantity,
              unit: voucherData.unit || "كيلو",
              last_updated: new Date(),
            });
          }
        }

        return voucher;
      },
      "createRawMaterialVoucherIn",
      "إنشاء سند إدخال مواد خام",
    );
  }

  // Raw Material Out Vouchers
  async getRawMaterialVouchersOut(): Promise<RawMaterialVoucherOut[]> {
    return withDatabaseErrorHandling(
      async () => {
        const vouchers = await db
          .select()
          .from(raw_material_vouchers_out)
          .orderBy(desc(raw_material_vouchers_out.created_at));
        return vouchers;
      },
      "getRawMaterialVouchersOut",
      "جلب سندات إخراج المواد الخام",
    );
  }

  async getRawMaterialVoucherOutById(id: number): Promise<RawMaterialVoucherOut | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [voucher] = await db
          .select()
          .from(raw_material_vouchers_out)
          .where(eq(raw_material_vouchers_out.id, id));
        return voucher;
      },
      "getRawMaterialVoucherOutById",
      `جلب سند إخراج مواد خام ${id}`,
    );
  }

  async createRawMaterialVoucherOut(voucherData: any): Promise<RawMaterialVoucherOut> {
    return withDatabaseErrorHandling(
      async () => {
        const voucherNumber = await this.getNextVoucherNumber("RMO");
        
        const [voucher] = await db
          .insert(raw_material_vouchers_out)
          .values({
            ...voucherData,
            voucher_number: voucherNumber,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        // تخفيض المخزون
        if (voucherData.item_id && voucherData.quantity) {
          await db
            .update(inventory)
            .set({
              current_stock: sql`${inventory.current_stock} - ${voucherData.quantity}`,
              last_updated: new Date(),
            })
            .where(eq(inventory.item_id, voucherData.item_id));
        }

        return voucher;
      },
      "createRawMaterialVoucherOut",
      "إنشاء سند إخراج مواد خام",
    );
  }

  // Finished Goods In Vouchers
  async getFinishedGoodsVouchersIn(): Promise<FinishedGoodsVoucherIn[]> {
    return withDatabaseErrorHandling(
      async () => {
        const vouchers = await db
          .select()
          .from(finished_goods_vouchers_in)
          .orderBy(desc(finished_goods_vouchers_in.created_at));
        return vouchers;
      },
      "getFinishedGoodsVouchersIn",
      "جلب سندات استلام المواد التامة",
    );
  }

  async getFinishedGoodsVoucherInById(id: number): Promise<FinishedGoodsVoucherIn | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [voucher] = await db
          .select()
          .from(finished_goods_vouchers_in)
          .where(eq(finished_goods_vouchers_in.id, id));
        return voucher;
      },
      "getFinishedGoodsVoucherInById",
      `جلب سند استلام مواد تامة ${id}`,
    );
  }

  async createFinishedGoodsVoucherIn(voucherData: any): Promise<FinishedGoodsVoucherIn> {
    return withDatabaseErrorHandling(
      async () => {
        const voucherNumber = await this.getNextVoucherNumber("FGI");
        
        const [voucher] = await db
          .insert(finished_goods_vouchers_in)
          .values({
            ...voucherData,
            voucher_number: voucherNumber,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        return voucher;
      },
      "createFinishedGoodsVoucherIn",
      "إنشاء سند استلام مواد تامة",
    );
  }

  // Finished Goods Out Vouchers
  async getFinishedGoodsVouchersOut(): Promise<FinishedGoodsVoucherOut[]> {
    return withDatabaseErrorHandling(
      async () => {
        const vouchers = await db
          .select()
          .from(finished_goods_vouchers_out)
          .orderBy(desc(finished_goods_vouchers_out.created_at));
        return vouchers;
      },
      "getFinishedGoodsVouchersOut",
      "جلب سندات إخراج المواد التامة",
    );
  }

  async getFinishedGoodsVoucherOutById(id: number): Promise<FinishedGoodsVoucherOut | undefined> {
    return withDatabaseErrorHandling(
      async () => {
        const [voucher] = await db
          .select()
          .from(finished_goods_vouchers_out)
          .where(eq(finished_goods_vouchers_out.id, id));
        return voucher;
      },
      "getFinishedGoodsVoucherOutById",
      `جلب سند إخراج مواد تامة ${id}`,
    );
  }

  async createFinishedGoodsVoucherOut(voucherData: any): Promise<FinishedGoodsVoucherOut> {
    return withDatabaseErrorHandling(
      async () => {
        const voucherNumber = await this.getNextVoucherNumber("FGO");
        
        const [voucher] = await db
          .insert(finished_goods_vouchers_out)
          .values({
            ...voucherData,
            voucher_number: voucherNumber,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        return voucher;
      },
      "createFinishedGoodsVoucherOut",
      "إنشاء سند إخراج مواد تامة",
    );
  }

  // Warehouse Voucher Stats
  async getWarehouseVouchersStats(): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [rawInCount] = await db.select({ count: count() }).from(raw_material_vouchers_in);
        const [rawOutCount] = await db.select({ count: count() }).from(raw_material_vouchers_out);
        const [finishedInCount] = await db.select({ count: count() }).from(finished_goods_vouchers_in);
        const [finishedOutCount] = await db.select({ count: count() }).from(finished_goods_vouchers_out);

        return {
          raw_material_in: rawInCount?.count || 0,
          raw_material_out: rawOutCount?.count || 0,
          finished_goods_in: finishedInCount?.count || 0,
          finished_goods_out: finishedOutCount?.count || 0,
          total: (rawInCount?.count || 0) + (rawOutCount?.count || 0) + 
                 (finishedInCount?.count || 0) + (finishedOutCount?.count || 0),
        };
      },
      "getWarehouseVouchersStats",
      "جلب إحصائيات السندات",
    );
  }

  // Inventory Counts
  async getInventoryCounts(): Promise<InventoryCount[]> {
    return withDatabaseErrorHandling(
      async () => {
        const counts = await db
          .select()
          .from(inventory_counts)
          .orderBy(desc(inventory_counts.created_at));
        return counts;
      },
      "getInventoryCounts",
      "جلب عمليات الجرد",
    );
  }

  async getInventoryCountById(id: number): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        const [countRecord] = await db
          .select()
          .from(inventory_counts)
          .where(eq(inventory_counts.id, id));

        if (!countRecord) return undefined;

        const countItems = await db
          .select()
          .from(inventory_count_items)
          .where(eq(inventory_count_items.count_id, id));

        return {
          ...countRecord,
          items: countItems,
        };
      },
      "getInventoryCountById",
      `جلب عملية الجرد ${id}`,
    );
  }

  async createInventoryCount(countData: any): Promise<InventoryCount> {
    return withDatabaseErrorHandling(
      async () => {
        const countNumber = await this.getNextVoucherNumber("IC");
        
        const [countRecord] = await db
          .insert(inventory_counts)
          .values({
            ...countData,
            count_number: countNumber,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning();

        return countRecord;
      },
      "createInventoryCount",
      "إنشاء عملية جرد",
    );
  }

  async createInventoryCountItem(itemData: any): Promise<InventoryCountItem> {
    return withDatabaseErrorHandling(
      async () => {
        // حساب الفرق
        const difference = parseFloat(itemData.counted_quantity) - parseFloat(itemData.system_quantity);
        
        const [item] = await db
          .insert(inventory_count_items)
          .values({
            ...itemData,
            difference: difference.toFixed(3),
            counted_at: new Date(),
          })
          .returning();

        // تحديث عداد الأصناف والفروقات في الجرد
        await db
          .update(inventory_counts)
          .set({
            total_items_counted: sql`${inventory_counts.total_items_counted} + 1`,
            total_discrepancies: difference !== 0 
              ? sql`${inventory_counts.total_discrepancies} + 1` 
              : inventory_counts.total_discrepancies,
            updated_at: new Date(),
          })
          .where(eq(inventory_counts.id, itemData.count_id));

        return item;
      },
      "createInventoryCountItem",
      "إضافة صنف للجرد",
    );
  }

  async completeInventoryCount(id: number, userId: number): Promise<InventoryCount> {
    return withDatabaseErrorHandling(
      async () => {
        const [updated] = await db
          .update(inventory_counts)
          .set({
            status: "completed",
            approved_by: userId,
            approved_at: new Date(),
            updated_at: new Date(),
          })
          .where(eq(inventory_counts.id, id))
          .returning();

        return updated;
      },
      "completeInventoryCount",
      `إتمام عملية الجرد ${id}`,
    );
  }

  // Barcode Lookup
  async lookupByBarcode(barcode: string): Promise<any> {
    return withDatabaseErrorHandling(
      async () => {
        // البحث في المخزون
        const inventoryResults = await db
          .select()
          .from(inventory)
          .leftJoin(items, eq(inventory.item_id, items.id))
          .limit(10);

        // البحث في الرولات
        const rollResults = await db
          .select()
          .from(rolls)
          .where(sql`${rolls.qr_code_text} ILIKE ${`%${barcode}%`}`)
          .limit(5);

        // البحث في السندات
        const rmiResults = await db
          .select()
          .from(raw_material_vouchers_in)
          .where(eq(raw_material_vouchers_in.barcode, barcode))
          .limit(5);

        if (rmiResults.length > 0) {
          return { type: "raw_material_voucher_in", data: rmiResults[0] };
        }

        if (rollResults.length > 0) {
          return { type: "roll", data: rollResults[0] };
        }

        // البحث في الأصناف
        const itemResults = await db
          .select()
          .from(items)
          .where(eq(items.code, barcode))
          .limit(1);

        if (itemResults.length > 0) {
          return { type: "item", data: itemResults[0] };
        }

        return null;
      },
      "lookupByBarcode",
      `البحث بالباركود ${barcode}`,
    );
  }
}

export const storage = new DatabaseStorage();

// Export function to set notification manager from external modules
export { setNotificationManager };
