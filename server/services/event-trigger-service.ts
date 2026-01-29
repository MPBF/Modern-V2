import type { IStorage } from "../storage";
import { NotificationService } from "./notification-service";
import { logger } from "../lib/logger";
import type { NotificationEventSetting } from "@shared/schema";

export type EventCategory = "orders" | "production" | "quality" | "maintenance" | "hr" | "inventory" | "system";

export interface EventContext {
  type: string;
  id: string | number;
  data: Record<string, any>;
  user_id?: number;
  user_name?: string;
}

export interface TriggerResult {
  success: boolean;
  triggered_count: number;
  sent_count: number;
  failed_count: number;
  details: Array<{
    event_key: string;
    recipient: string;
    status: "sent" | "failed" | "pending";
    error?: string;
  }>;
}

export class EventTriggerService {
  private storage: IStorage;
  private notificationService: NotificationService;

  constructor(storage: IStorage, notificationService: NotificationService) {
    this.storage = storage;
    this.notificationService = notificationService;
    logger.info("✅ Event Trigger Service initialized");
  }

  async triggerEvent(
    eventKey: string,
    context: EventContext
  ): Promise<TriggerResult> {
    const result: TriggerResult = {
      success: true,
      triggered_count: 0,
      sent_count: 0,
      failed_count: 0,
      details: [],
    };

    try {
      const eventSetting = await this.storage.getNotificationEventSettingByKey(eventKey);

      if (!eventSetting) {
        logger.warn(`Event setting not found for key: ${eventKey}`);
        return result;
      }

      if (!eventSetting.is_active) {
        logger.debug(`Event ${eventKey} is not active, skipping`);
        return result;
      }

      const shouldTrigger = this.evaluateCondition(eventSetting, context);
      if (!shouldTrigger) {
        logger.debug(`Condition not met for event ${eventKey}`);
        return result;
      }

      result.triggered_count = 1;

      const recipients = await this.resolveRecipients(eventSetting, context);

      for (const recipient of recipients) {
        try {
          const message = this.formatMessage(eventSetting.message_template_ar, context.data);
          
          const log = await this.storage.createNotificationEventLog({
            event_setting_id: eventSetting.id,
            event_key: eventKey,
            trigger_context_type: context.type,
            trigger_context_id: String(context.id),
            trigger_data: context.data,
            message_sent_ar: message,
            recipient_phone: recipient.phone,
            recipient_user_id: recipient.user_id,
            recipient_name: recipient.name,
            status: "pending",
          });

          if (eventSetting.notification_type === "whatsapp") {
            const sendResult = await this.notificationService.metaWhatsApp.sendTextMessage(
              recipient.phone,
              message,
              {
                title: eventSetting.event_name_ar,
                priority: eventSetting.priority,
                context_type: context.type,
                context_id: String(context.id),
              }
            );

            if (sendResult.success) {
              await this.storage.updateNotificationEventLog(log.id, {
                status: "sent",
                delivered_at: new Date(),
                whatsapp_message_id: sendResult.messageId,
              });
              result.sent_count++;
              result.details.push({
                event_key: eventKey,
                recipient: recipient.phone,
                status: "sent",
              });
            } else {
              await this.storage.updateNotificationEventLog(log.id, {
                status: "failed",
                error_message: sendResult.error,
              });
              result.failed_count++;
              result.details.push({
                event_key: eventKey,
                recipient: recipient.phone,
                status: "failed",
                error: sendResult.error,
              });
            }
          } else {
            await this.storage.updateNotificationEventLog(log.id, {
              status: "sent",
            });
            result.sent_count++;
            result.details.push({
              event_key: eventKey,
              recipient: recipient.phone || recipient.name,
              status: "sent",
            });
          }
        } catch (error: any) {
          result.failed_count++;
          result.details.push({
            event_key: eventKey,
            recipient: recipient.phone || recipient.name,
            status: "failed",
            error: error.message,
          });
          logger.error(`Failed to send notification to ${recipient.name}: ${error.message}`);
        }
      }

      result.success = result.failed_count === 0;

    } catch (error: any) {
      logger.error(`Error triggering event ${eventKey}: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  private evaluateCondition(
    setting: NotificationEventSetting,
    context: EventContext
  ): boolean {
    if (!setting.trigger_condition) {
      return true;
    }

    try {
      const condition = setting.trigger_condition as Record<string, any>;
      
      if (condition.field && condition.operator && condition.value !== undefined) {
        const fieldValue = this.getNestedValue(context.data, condition.field);
        
        switch (condition.operator) {
          case ">":
            return Number(fieldValue) > Number(condition.value);
          case ">=":
            return Number(fieldValue) >= Number(condition.value);
          case "<":
            return Number(fieldValue) < Number(condition.value);
          case "<=":
            return Number(fieldValue) <= Number(condition.value);
          case "==":
          case "=":
            return fieldValue == condition.value;
          case "!=":
            return fieldValue != condition.value;
          case "contains":
            return String(fieldValue).includes(String(condition.value));
          case "in":
            return Array.isArray(condition.value) && condition.value.includes(fieldValue);
          default:
            return true;
        }
      }

      return true;
    } catch (error) {
      logger.warn(`Error evaluating condition: ${error}`);
      return true;
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  private async resolveRecipients(
    setting: NotificationEventSetting,
    context: EventContext
  ): Promise<Array<{ phone: string; user_id?: number; name: string }>> {
    const recipients: Array<{ phone: string; user_id?: number; name: string }> = [];

    const recipientConfig = setting.recipient_roles as any;
    
    if (!recipientConfig) {
      return recipients;
    }

    if (recipientConfig.phone_numbers && Array.isArray(recipientConfig.phone_numbers)) {
      for (const phone of recipientConfig.phone_numbers) {
        recipients.push({ phone, name: "Direct Number" });
      }
    }

    if (recipientConfig.user_ids && Array.isArray(recipientConfig.user_ids)) {
      for (const userId of recipientConfig.user_ids) {
        try {
          const user = await this.storage.getUserById(userId);
          if (user && user.phone) {
            recipients.push({
              phone: user.phone,
              user_id: user.id,
              name: user.full_name || user.username,
            });
          }
        } catch (error) {
          logger.warn(`Could not resolve user ${userId}`);
        }
      }
    }

    if (recipientConfig.role_ids && Array.isArray(recipientConfig.role_ids)) {
      for (const roleId of recipientConfig.role_ids) {
        try {
          const users = await this.storage.getSafeUsersByRole(roleId);
          for (const user of users) {
            const fullUser = await this.storage.getUserById(user.id);
            if (fullUser && fullUser.phone && !recipients.find(r => r.phone === fullUser.phone)) {
              recipients.push({
                phone: fullUser.phone,
                user_id: fullUser.id,
                name: fullUser.full_name || fullUser.username,
              });
            }
          }
        } catch (error) {
          logger.warn(`Could not resolve role ${roleId}`);
        }
      }
    }

    if (recipientConfig.context_user === true && context.user_id) {
      try {
        const user = await this.storage.getUserById(context.user_id);
        if (user && user.phone && !recipients.find(r => r.user_id === user.id)) {
          recipients.push({
            phone: user.phone,
            user_id: user.id,
            name: user.full_name || user.username,
          });
        }
      } catch (error) {
        logger.warn(`Could not resolve context user ${context.user_id}`);
      }
    }

    return recipients;
  }

  private formatMessage(template: string, data: Record<string, any>): string {
    let message = template;

    const placeholderPattern = /\{\{(\w+(?:\.\w+)*)\}\}/g;
    
    message = message.replace(placeholderPattern, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });

    return message;
  }

  async triggerOrderCreated(orderId: number, orderData: Record<string, any>): Promise<TriggerResult> {
    return this.triggerEvent("order_created", {
      type: "order",
      id: orderId,
      data: orderData,
    });
  }

  async triggerOrderStatusChanged(
    orderId: number,
    oldStatus: string,
    newStatus: string,
    orderData: Record<string, any>
  ): Promise<TriggerResult> {
    return this.triggerEvent("order_status_changed", {
      type: "order",
      id: orderId,
      data: { ...orderData, old_status: oldStatus, new_status: newStatus },
    });
  }

  async triggerOrderCompleted(orderId: number, orderData: Record<string, any>): Promise<TriggerResult> {
    return this.triggerEvent("order_completed", {
      type: "order",
      id: orderId,
      data: orderData,
    });
  }

  async triggerProductionStarted(productionOrderId: number, data: Record<string, any>): Promise<TriggerResult> {
    return this.triggerEvent("production_started", {
      type: "production_order",
      id: productionOrderId,
      data,
    });
  }

  async triggerProductionCompleted(productionOrderId: number, data: Record<string, any>): Promise<TriggerResult> {
    return this.triggerEvent("production_completed", {
      type: "production_order",
      id: productionOrderId,
      data,
    });
  }

  async triggerWasteAlert(
    productionOrderId: number,
    wastePercentage: number,
    threshold: number,
    data: Record<string, any>
  ): Promise<TriggerResult> {
    return this.triggerEvent("waste_threshold_exceeded", {
      type: "production_order",
      id: productionOrderId,
      data: { ...data, waste_percentage: wastePercentage, threshold },
    });
  }

  async triggerQualityIssue(
    inspectionId: number,
    issueType: string,
    data: Record<string, any>
  ): Promise<TriggerResult> {
    return this.triggerEvent("quality_issue_detected", {
      type: "quality_inspection",
      id: inspectionId,
      data: { ...data, issue_type: issueType },
    });
  }

  async triggerMaintenanceRequest(
    requestId: number,
    machineId: number,
    data: Record<string, any>
  ): Promise<TriggerResult> {
    return this.triggerEvent("maintenance_request_created", {
      type: "maintenance_request",
      id: requestId,
      data: { ...data, machine_id: machineId },
    });
  }

  async triggerMaintenanceCompleted(
    requestId: number,
    data: Record<string, any>
  ): Promise<TriggerResult> {
    return this.triggerEvent("maintenance_completed", {
      type: "maintenance_request",
      id: requestId,
      data,
    });
  }

  async triggerInventoryLow(
    itemId: number,
    currentQuantity: number,
    minimumLevel: number,
    data: Record<string, any>
  ): Promise<TriggerResult> {
    return this.triggerEvent("inventory_low", {
      type: "inventory_item",
      id: itemId,
      data: { ...data, current_quantity: currentQuantity, minimum_level: minimumLevel },
    });
  }

  async triggerHREvent(
    eventType: "leave_request" | "attendance_issue" | "performance_review",
    employeeId: number,
    data: Record<string, any>
  ): Promise<TriggerResult> {
    const eventKey = eventType === "leave_request" 
      ? "leave_request_submitted"
      : eventType === "attendance_issue"
      ? "attendance_alert"
      : "performance_review_due";

    return this.triggerEvent(eventKey, {
      type: "hr_event",
      id: employeeId,
      data,
    });
  }

  async triggerSystemAlert(
    alertType: string,
    message: string,
    data: Record<string, any>
  ): Promise<TriggerResult> {
    return this.triggerEvent("system_alert", {
      type: "system",
      id: Date.now(),
      data: { ...data, alert_type: alertType, message },
    });
  }
}

let eventTriggerServiceInstance: EventTriggerService | null = null;

export function initEventTriggerService(
  storage: IStorage,
  notificationService: NotificationService
): EventTriggerService {
  eventTriggerServiceInstance = new EventTriggerService(storage, notificationService);
  return eventTriggerServiceInstance;
}

export function getEventTriggerService(): EventTriggerService | null {
  return eventTriggerServiceInstance;
}
