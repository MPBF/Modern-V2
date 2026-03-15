import type { IStorage } from "../storage";
import { logger } from "../lib/logger";
import { createHmac } from "crypto";

export interface MetaWhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId: string;
  apiVersion: string;
  appSecret?: string;
}

export interface WhatsAppTemplateMessage {
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text: string;
      }>;
    }>;
  };
}

export interface WhatsAppTextMessage {
  to: string;
  type: "text";
  text: {
    body: string;
  };
}

export class MetaWhatsAppService {
  private config: MetaWhatsAppConfig;
  private storage: IStorage;
  private baseUrl: string;

  constructor(storage: IStorage, config?: Partial<MetaWhatsAppConfig>) {
    this.storage = storage;

    this.config = {
      accessToken: process.env.META_ACCESS_TOKEN || "",
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
      businessAccountId:
        process.env.META_BUSINESS_ACCOUNT_ID || "795259496521200",
      apiVersion: "v21.0",
      appSecret: process.env.META_APP_SECRET || "",
      ...config,
    };

    this.baseUrl = `https://graph.facebook.com/${this.config.apiVersion}`;

    if (!this.config.accessToken || !this.config.phoneNumberId) {
      logger.warn(
        "⚠️ Meta WhatsApp API credentials not configured. Set META_ACCESS_TOKEN and META_PHONE_NUMBER_ID environment variables."
      );
    } else {
      logger.info("✅ Meta WhatsApp API service initialized successfully");
    }
  }

  private generateAppSecretProof(): string | null {
    if (!this.config.appSecret) return null;
    return createHmac("sha256", this.config.appSecret)
      .update(this.config.accessToken)
      .digest("hex");
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.accessToken}`,
      "Content-Type": "application/json",
    };
    return headers;
  }

  private appendAppSecretProof(url: string): string {
    const proof = this.generateAppSecretProof();
    if (!proof) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}appsecret_proof=${proof}`;
  }

  /**
   * إرسال رسالة نصية مباشرة
   */
  async sendTextMessage(
    to: string,
    message: string,
    options?: {
      title?: string;
      priority?: string;
      context_type?: string;
      context_id?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        throw new Error("Meta WhatsApp API غير مُعد بشكل صحيح");
      }

      // تنسيق رقم الهاتف (إزالة + وwhatsapp: إن وجدت)
      const formattedPhone = to
        .replace(/[\+\s\-\(\)]/g, "")
        .replace("whatsapp:", "");

      const messageData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: {
          body: message,
        },
      };

      const apiUrl = this.appendAppSecretProof(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`
      );
      const response = await fetch(apiUrl, {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify(messageData),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      // حفظ الإشعار في قاعدة البيانات
      const notificationData = {
        title: options?.title || "رسالة واتس اب",
        message: message,
        type: "whatsapp" as const,
        priority: options?.priority || "normal",
        recipient_type: "user" as const,
        phone_number: to,
        status: "sent" as const,
        external_id: result.messages?.[0]?.id,
        external_status: "sent",
        sent_at: new Date(),
        context_type: options?.context_type,
        context_id: options?.context_id,
      };

      await this.storage.createNotification(notificationData);

      logger.info(
        `📱 تم إرسال رسالة واتس اب مباشرة إلى ${to} - ID ${result.messages?.[0]?.id}`
      );

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
      logger.error("خطأ في إرسال رسالة واتس اب عبر Meta API", error);

      const notificationData = {
        title: options?.title || "رسالة واتس اب",
        message: message,
        type: "whatsapp" as const,
        priority: options?.priority || "normal",
        recipient_type: "user" as const,
        phone_number: to,
        status: "failed" as const,
        error_message: errorMessage,
        context_type: options?.context_type,
        context_id: options?.context_id,
      };

      await this.storage.createNotification(notificationData);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async uploadMediaBuffer(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    if (!this.config.accessToken || !this.config.phoneNumberId) {
      throw new Error("Meta WhatsApp API غير مُعد بشكل صحيح");
    }

    const blob = new Blob([buffer], { type: mimeType });
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", mimeType);
    formData.append("file", blob, filename);

    const mediaUrl = this.appendAppSecretProof(
      `${this.baseUrl}/${this.config.phoneNumberId}/media`
    );
    const response = await fetch(mediaUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.accessToken}`,
        },
        body: formData,
      },
    );

    const result: any = await response.json();

    if (!response.ok) {
      throw new Error(result.error?.message || `Media upload failed: HTTP ${response.status}`);
    }

    logger.info(`📤 تم رفع ملف إلى Meta Media API - ID ${result.id}`);
    return result.id;
  }

  async sendDocumentMessage(
    to: string,
    documentUrl: string,
    filename: string,
    caption?: string,
    options?: {
      title?: string;
      priority?: string;
      context_type?: string;
      context_id?: string;
      pdfBuffer?: Buffer;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        throw new Error("Meta WhatsApp API غير مُعد بشكل صحيح");
      }

      const formattedPhone = to
        .replace(/[\+\s\-\(\)]/g, "")
        .replace("whatsapp:", "");

      let documentPayload: any;

      if (options?.pdfBuffer) {
        const mediaId = await this.uploadMediaBuffer(options.pdfBuffer, filename, "application/pdf");
        documentPayload = {
          id: mediaId,
          filename: filename,
          caption: caption || "",
        };
      } else {
        documentPayload = {
          link: documentUrl,
          filename: filename,
          caption: caption || "",
        };
      }

      const messageData = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "document",
        document: documentPayload,
      };

      const docApiUrl = this.appendAppSecretProof(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`
      );
      const response = await fetch(docApiUrl, {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify(messageData),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const notificationData = {
        title: options?.title || "مستند واتس اب",
        message: `تم إرسال ملف: ${filename}`,
        type: "whatsapp" as const,
        priority: options?.priority || "normal",
        recipient_type: "user" as const,
        phone_number: to,
        status: "sent" as const,
        external_id: result.messages?.[0]?.id,
        external_status: "sent",
        sent_at: new Date(),
        context_type: options?.context_type,
        context_id: options?.context_id,
      };

      await this.storage.createNotification(notificationData);

      logger.info(
        `📄 تم إرسال مستند واتس اب إلى ${to} - ID ${result.messages?.[0]?.id}`
      );

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
      logger.error("خطأ في إرسال مستند واتس اب عبر Meta API", error);

      const notificationData = {
        title: options?.title || "مستند واتس اب",
        message: `فشل إرسال ملف: ${filename}`,
        type: "whatsapp" as const,
        priority: options?.priority || "normal",
        recipient_type: "user" as const,
        phone_number: to,
        status: "failed" as const,
        error_message: errorMessage,
        context_type: options?.context_type,
        context_id: options?.context_id,
      };

      await this.storage.createNotification(notificationData);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * إرسال رسالة باستخدام قالب Meta مُوافق عليه
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    language: string = "ar",
    variables: string[] = [],
    options?: {
      title?: string;
      priority?: string;
      context_type?: string;
      context_id?: string;
    },
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        throw new Error("Meta WhatsApp API غير مُعد بشكل صحيح");
      }

      // تنسيق رقم الهاتف
      const formattedPhone = to
        .replace(/[\+\s\-\(\)]/g, "")
        .replace("whatsapp:", "");

      const messageData: any = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: language,
          },
        },
      };

      // إضافة متغيرات القالب إن وجدت
      if (variables && variables.length > 0) {
        messageData.template.components = [
          {
            type: "body",
            parameters: variables.map((variable) => ({
              type: "text",
              text: variable,
            })),
          },
        ];
      }

      const tplApiUrl = this.appendAppSecretProof(
        `${this.baseUrl}/${this.config.phoneNumberId}/messages`
      );
      const response = await fetch(tplApiUrl, {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify(messageData),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      // حفظ الإشعار في قاعدة البيانات
      const notificationData = {
        title: options?.title || "رسالة واتس اب (قالب)",
        message: `قالب: ${templateName} - متغيرات: ${variables.join(", ")}`,
        type: "whatsapp" as const,
        priority: options?.priority || "normal",
        recipient_type: "user" as const,
        phone_number: to,
        status: "sent" as const,
        external_id: result.messages?.[0]?.id,
        external_status: "sent",
        sent_at: new Date(),
        context_type: options?.context_type,
        context_id: options?.context_id,
      };

      await this.storage.createNotification(notificationData);

      logger.info(
        `📱 تم إرسال رسالة واتس اب (قالب Meta) إلى ${to} - ID ${result.messages?.[0]?.id}`
      );

      return {
        success: true,
        messageId: result.messages?.[0]?.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "خطأ غير معروف";
      logger.error("خطأ في إرسال رسالة واتس اب (قالب Meta)", error);

      const notificationData = {
        title: options?.title || "رسالة واتس اب (قالب)",
        message: `قالب: ${templateName} - خطأ: ${errorMessage}`,
        type: "whatsapp" as const,
        priority: options?.priority || "normal",
        recipient_type: "user" as const,
        phone_number: to,
        status: "failed" as const,
        error_message: errorMessage,
        context_type: options?.context_type,
        context_id: options?.context_id,
      };

      await this.storage.createNotification(notificationData);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * الحصول على معلومات رقم الهاتف التجاري
   */
  async getPhoneNumberInfo(): Promise<any> {
    try {
      if (!this.config.accessToken || !this.config.phoneNumberId) {
        throw new Error("Meta WhatsApp API غير مُعد بشكل صحيح");
      }

      const phoneInfoUrl = this.appendAppSecretProof(
        `${this.baseUrl}/${this.config.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`
      );
      const response = await fetch(phoneInfoUrl, {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      logger.error("خطأ في الحصول على معلومات الرقم", error);
      throw error;
    }
  }

  /**
   * الحصول على قائمة القوالب المُوافقة
   */
  async getApprovedTemplates(): Promise<any[]> {
    try {
      if (!this.config.accessToken || !this.config.businessAccountId) {
        throw new Error("Meta WhatsApp API غير مُعد بشكل صحيح");
      }

      const templatesUrl = this.appendAppSecretProof(
        `${this.baseUrl}/${this.config.businessAccountId}/message_templates?fields=name,status,language,components`
      );
      const response = await fetch(templatesUrl, {
          headers: {
            Authorization: `Bearer ${this.config.accessToken}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || `HTTP ${response.status}`);
      }

      // فلترة القوالب المُوافقة فقط
      return (
        result.data?.filter(
          (template: any) => template.status === "APPROVED",
        ) || []
      );
    } catch (error) {
      logger.error("خطأ في الحصول على القوالب", error);
      throw error;
    }
  }

  /**
   * التحقق من صحة الإعداد
   */
  async testConnection(): Promise<{
    success: boolean;
    error?: string;
    data?: any;
  }> {
    try {
      const phoneInfo = await this.getPhoneNumberInfo();
      return {
        success: true,
        data: phoneInfo,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "فشل اختبار الاتصال";
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * معالجة Webhook الواردة من Meta
   */
  async handleWebhook(body: any): Promise<void> {
    try {
      // معالجة تحديثات حالة الرسائل
      if (body.entry && body.entry[0] && body.entry[0].changes) {
        for (const change of body.entry[0].changes) {
          if (change.field === "messages") {
            const value = change.value;

            // تحديث حالة الرسائل
            if (value.statuses) {
              for (const status of value.statuses) {
                await this.updateMessageStatus(status.id, status.status);
              }
            }

            // معالجة الرسائل الواردة
            if (value.messages) {
              for (const message of value.messages) {
                await this.handleIncomingMessage(message);
              }
            }
          }
        }
      }
    } catch (error) {
      logger.error("خطأ في معالجة Webhook", error);
    }
  }

  /**
   * تحديث حالة الرسالة
   */
  private async updateMessageStatus(
    messageId: string,
    status: string,
  ): Promise<void> {
    try {
      // تحديث حالة الرسالة في قاعدة البيانات
      // ملاحظة: هذه الدالة كانت سابقاً تُنشئ كائن updatedNotification بدون حفظه.
      // الآن نقوم بالحفظ عبر storage.updateNotificationStatus لضمان انعكاس الحالة في النظام.

      const updatePayload: Record<string, any> = {
        external_status: status,
        delivered_at: status === "delivered" ? new Date() : undefined,
        read_at: status === "read" ? new Date() : undefined,
      };

      // نعتمد على طبقة التخزين لتحديث السجل بحسب المعرّف الخارجي (Twilio SID أو Meta message id)
      await this.storage.updateNotificationStatus(messageId, updatePayload);

      logger.info(`📊 تم تحديث حالة الرسالة ${messageId} إلى ${status}`);
    } catch (error) {
      logger.error("خطأ في تحديث حالة الرسالة", error);
    }
  }

  /**
   * معالجة الرسائل الواردة
   */
  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      logger.info("📨 رسالة واردة", {
        from: message.from,
        type: message.type,
        text: message.text?.body || "غير نصية",
      });

      // حفظ الرسالة الواردة في قاعدة البيانات
      const notificationData = {
        title: "رسالة واردة",
        message: message.text?.body || "رسالة غير نصية",
        type: "whatsapp" as const,
        priority: "normal",
        recipient_type: "system" as const,
        phone_number: message.from,
        status: "received" as const,
        external_id: message.id,
        external_status: "received",
        received_at: new Date(),
        context_type: "incoming_message",
      };

      await this.storage.createNotification(notificationData);
    } catch (error) {
      logger.error("خطأ في معالجة الرسالة الواردة", error);
    }
  }
}
