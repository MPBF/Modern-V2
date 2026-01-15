import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { orders, production_orders, rolls, quotes, quote_items, customers, ai_agent_settings, ai_agent_knowledge, quote_templates } from "@shared/schema";
import { eq, desc, sql, and, gte, lte, count, sum } from "drizzle-orm";
import multer, { FileFilterCallback } from "multer";
import * as XLSX from "exceljs";
import * as fs from "fs";
import * as path from "path";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// أسعار صرف العملات (يمكن تحديثها من API خارجي)
const exchangeRates: Record<string, number> = {
  SAR: 1,
  USD: 0.2666,
  EUR: 0.2444,
  GBP: 0.2111,
  AED: 0.9787,
  KWD: 0.0819,
  QAR: 0.9714,
  BHD: 0.1004,
  OMR: 0.1026,
  EGP: 8.2133,
};

const currencyNames: Record<string, string> = {
  SAR: "ريال سعودي",
  USD: "دولار أمريكي",
  EUR: "يورو",
  GBP: "جنيه إسترليني",
  AED: "درهم إماراتي",
  KWD: "دينار كويتي",
  QAR: "ريال قطري",
  BHD: "دينار بحريني",
  OMR: "ريال عماني",
  EGP: "جنيه مصري",
};

// إعداد رفع الملفات
const upload = multer({
  dest: "/tmp/ai-uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "text/plain", "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم"));
    }
  }
});

async function getSystemPrompt(): Promise<string> {
  const settings = await db.select().from(ai_agent_settings);
  const knowledge = await db.select().from(ai_agent_knowledge).where(eq(ai_agent_knowledge.is_active, true));
  
  const agentName = settings.find(s => s.key === "agent_name")?.value || "المساعد الذكي";
  const companyName = settings.find(s => s.key === "company_name")?.value || "مصنع الأكياس البلاستيكية";
  const defaultGreeting = settings.find(s => s.key === "default_greeting")?.value || "";
  const responseStyle = settings.find(s => s.key === "response_style")?.value || "ودي ومحترف";
  const customInstructions = settings.find(s => s.key === "custom_instructions")?.value || "";
  const vatRate = settings.find(s => s.key === "vat_rate")?.value || "0.15";
  
  let knowledgeText = "";
  if (knowledge.length > 0) {
    knowledgeText = "\n\n### المعلومات المتاحة من قاعدة المعرفة:\n" + 
      knowledge.map(k => `**${k.title}** (${k.category}): ${k.content}`).join("\n\n");
  }

  return `أنت ${agentName}، مساعد ذكي لشركة ${companyName}. يمكنك:
1. الإجابة على أسئلة حول الطلبات وحالتها
2. الإجابة على أسئلة حول الإنتاج وأوامر الإنتاج
3. الإجابة على أسئلة حول كميات الإنتاج
4. إنشاء عروض أسعار للعملاء مع إمكانية تحميلها كملف PDF
5. إرسال عروض الأسعار عبر الواتساب للعملاء
6. تحويل العملات (العملة الأساسية: الريال السعودي SAR)
7. قراءة وتحليل الملفات المرفقة

${defaultGreeting ? `رسالة الترحيب: ${defaultGreeting}\n` : ""}
أسلوب الرد: ${responseStyle}
العملة الأساسية هي الريال السعودي (ر.س). نسبة ضريبة القيمة المضافة: ${parseFloat(vatRate) * 100}%

### إرشادات مهمة:

**عند إنشاء عرض سعر:**
1. اجمع البيانات التالية من المستخدم: اسم العميل، الرقم الضريبي (14 رقم)، الأصناف (الاسم، الوحدة، السعر، الكمية)
2. استخدم أداة get_quote_templates للتعرف على المنتجات والأسعار المتاحة
3. بعد إنشاء العرض، استخدم أداة generate_quote_pdf لإنشاء رابط تحميل PDF
4. قدم للمستخدم رابط التحميل بشكل واضح

**عند طلب إرسال عرض سعر عبر الواتساب:**
1. تأكد من وجود عرض السعر (استخدم get_quote_by_number إذا لزم الأمر)
2. اطلب رقم جوال المستلم مع رمز الدولة (مثال: +966501234567)
3. استخدم أداة send_quote_whatsapp لإرسال العرض

**عند الاستعلام عن الطلبات أو الإنتاج:**
استخدم الأدوات المتاحة للحصول على البيانات الدقيقة من قاعدة البيانات.

${customInstructions ? `### تعليمات إضافية:\n${customInstructions}\n` : ""}
${knowledgeText}

قم بالرد باللغة العربية دائماً. كن مفيداً ووفر روابط تحميل PDF عند إنشاء عروض الأسعار.`;
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "get_order_status",
      description: "الحصول على حالة طلب معين بناءً على رقم الطلب",
      parameters: {
        type: "object",
        properties: {
          order_id: { type: "number", description: "رقم الطلب" }
        },
        required: ["order_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_orders_summary",
      description: "الحصول على ملخص الطلبات (عدد الطلبات حسب الحالة)",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_production_order_status",
      description: "الحصول على حالة أمر إنتاج معين",
      parameters: {
        type: "object",
        properties: {
          production_order_id: { type: "number", description: "رقم أمر الإنتاج" }
        },
        required: ["production_order_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_production_summary",
      description: "الحصول على ملخص الإنتاج (أوامر نشطة، كميات منتجة)",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_recent_production",
      description: "الحصول على إحصائيات الإنتاج الأخيرة",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "عدد الأيام (افتراضي 7)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_quote",
      description: "إنشاء عرض سعر جديد",
      parameters: {
        type: "object",
        properties: {
          customer_name: { type: "string", description: "اسم العميل" },
          tax_number: { type: "string", description: "الرقم الضريبي (14 رقم)" },
          created_by_name: { type: "string", description: "اسم المستخدم" },
          created_by_phone: { type: "string", description: "رقم جوال المستخدم" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item_name: { type: "string", description: "اسم الصنف" },
                unit: { type: "string", enum: ["كيلو", "كجم", "طن", "قطعة", "كرتون", "بندل", "رول"], description: "الوحدة" },
                unit_price: { type: "number", description: "سعر الوحدة قبل الضريبة" },
                quantity: { type: "number", description: "الكمية" }
              },
              required: ["item_name", "unit", "unit_price", "quantity"]
            },
            description: "قائمة الأصناف"
          },
          notes: { type: "string", description: "ملاحظات إضافية" }
        },
        required: ["customer_name", "tax_number", "items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "convert_currency",
      description: "تحويل مبلغ من عملة إلى أخرى. العملة الأساسية هي الريال السعودي (SAR)",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "المبلغ المراد تحويله" },
          from_currency: { type: "string", enum: ["SAR", "USD", "EUR", "GBP", "AED", "KWD", "QAR", "BHD", "OMR", "EGP"], description: "العملة المصدر" },
          to_currency: { type: "string", enum: ["SAR", "USD", "EUR", "GBP", "AED", "KWD", "QAR", "BHD", "OMR", "EGP"], description: "العملة الهدف" }
        },
        required: ["amount", "from_currency", "to_currency"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_exchange_rates",
      description: "الحصول على أسعار صرف العملات مقارنة بالريال السعودي",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "get_quote_templates",
      description: "الحصول على نماذج عروض الأسعار الجاهزة. استخدم هذه الأداة لمعرفة المنتجات والأسعار المتاحة قبل إنشاء عرض سعر",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "generate_quote_pdf",
      description: "إنشاء ملف PDF لعرض سعر معين وإرجاع رابط التحميل. استخدم هذه الأداة بعد إنشاء عرض السعر لتوفير رابط تحميل PDF للمستخدم",
      parameters: {
        type: "object",
        properties: {
          quote_id: { type: "number", description: "رقم معرف عرض السعر (ID)" }
        },
        required: ["quote_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_quote_whatsapp",
      description: "إرسال عرض سعر عبر الواتساب. يتطلب رقم الجوال ومعرف عرض السعر",
      parameters: {
        type: "object",
        properties: {
          quote_id: { type: "number", description: "رقم معرف عرض السعر (ID)" },
          phone_number: { type: "string", description: "رقم جوال المستلم (مع رمز الدولة، مثال: +966501234567)" }
        },
        required: ["quote_id", "phone_number"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_quote_by_number",
      description: "الحصول على تفاصيل عرض سعر باستخدام رقم المستند (مثل QT-000001)",
      parameters: {
        type: "object",
        properties: {
          document_number: { type: "string", description: "رقم مستند عرض السعر (مثال: QT-000001)" }
        },
        required: ["document_number"]
      }
    }
  }
];

async function executeFunction(name: string, args: Record<string, unknown>): Promise<string> {
  try {
    switch (name) {
      case "get_order_status": {
        const orderId = args.order_id as number;
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
        if (!order) return JSON.stringify({ error: "الطلب غير موجود" });
        
        const prodOrders = await db.select().from(production_orders).where(eq(production_orders.order_id, orderId));
        const totalQuantity = prodOrders.reduce((sum, po) => sum + parseFloat(po.quantity_kg || "0"), 0);
        return JSON.stringify({
          order: {
            id: order.id,
            order_number: order.order_number,
            status: order.status,
            total_quantity_kg: totalQuantity,
            delivery_date: order.delivery_date,
            created_at: order.created_at
          },
          production_orders: prodOrders.map(po => ({
            id: po.id,
            status: po.status,
            quantity_kg: po.quantity_kg,
            produced_quantity_kg: po.produced_quantity_kg
          }))
        });
      }

      case "get_orders_summary": {
        const orderStats = await db.select({
          status: orders.status,
          count: count()
        }).from(orders).groupBy(orders.status);
        
        const totalOrders = await db.select({ count: count() }).from(orders);
        return JSON.stringify({
          total: totalOrders[0]?.count || 0,
          by_status: orderStats
        });
      }

      case "get_production_order_status": {
        const poId = args.production_order_id as number;
        const [po] = await db.select().from(production_orders).where(eq(production_orders.id, poId));
        if (!po) return JSON.stringify({ error: "أمر الإنتاج غير موجود" });
        
        const poRolls = await db.select().from(rolls).where(eq(rolls.production_order_id, poId));
        return JSON.stringify({
          production_order: {
            id: po.id,
            status: po.status,
            quantity_kg: po.quantity_kg,
            produced_quantity_kg: po.produced_quantity_kg,
            film_completed: po.film_completed,
            printing_completed: po.printing_completed
          },
          rolls_count: poRolls.length,
          rolls: poRolls.slice(0, 10).map(r => ({
            id: r.id,
            roll_number: r.roll_number,
            weight_kg: r.weight_kg,
            stage: r.stage
          }))
        });
      }

      case "get_production_summary": {
        const activeOrders = await db.select({ count: count() })
          .from(production_orders)
          .where(eq(production_orders.status, "active"));
        
        const totalProduced = await db.select({ 
          total: sum(production_orders.produced_quantity_kg) 
        }).from(production_orders);
        
        return JSON.stringify({
          active_production_orders: activeOrders[0]?.count || 0,
          total_produced_kg: totalProduced[0]?.total || 0
        });
      }

      case "get_recent_production": {
        const days = (args.days as number) || 7;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const recentRolls = await db.select({
          count: count(),
          total_weight: sum(rolls.weight_kg)
        }).from(rolls).where(gte(rolls.created_at, startDate));
        
        return JSON.stringify({
          period_days: days,
          rolls_created: recentRolls[0]?.count || 0,
          total_weight_kg: recentRolls[0]?.total_weight || 0
        });
      }

      case "create_quote": {
        const { customer_name, tax_number, items, created_by_name, created_by_phone, notes } = args as {
          customer_name: string;
          tax_number: string;
          items: Array<{ item_name: string; unit: string; unit_price: number; quantity: number }>;
          created_by_name?: string;
          created_by_phone?: string;
          notes?: string;
        };

        if (tax_number.length !== 14 || !/^\d+$/.test(tax_number)) {
          return JSON.stringify({ error: "الرقم الضريبي يجب أن يكون 14 رقم" });
        }

        const lastQuote = await db.select({ document_number: quotes.document_number })
          .from(quotes)
          .orderBy(desc(quotes.id))
          .limit(1);
        
        let nextNum = 1;
        if (lastQuote.length > 0) {
          const lastNum = parseInt(lastQuote[0].document_number.replace("QT-", "")) || 0;
          nextNum = lastNum + 1;
        }
        const documentNumber = `QT-${String(nextNum).padStart(6, "0")}`;

        let totalBeforeTax = 0;
        const quoteItems = items.map((item, idx) => {
          const lineTotal = item.unit_price * item.quantity;
          totalBeforeTax += lineTotal;
          return {
            line_number: idx + 1,
            item_name: item.item_name,
            unit: item.unit,
            unit_price: String(item.unit_price),
            quantity: String(item.quantity),
            line_total: String(lineTotal)
          };
        });

        const taxAmount = totalBeforeTax * 0.15;
        const totalWithTax = totalBeforeTax + taxAmount;

        const [newQuote] = await db.insert(quotes).values({
          document_number: documentNumber,
          customer_name,
          tax_number,
          total_before_tax: String(totalBeforeTax),
          tax_amount: String(taxAmount),
          total_with_tax: String(totalWithTax),
          created_by_name: created_by_name || null,
          created_by_phone: created_by_phone || null,
          notes: notes || null,
          status: "draft"
        }).returning();

        for (const item of quoteItems) {
          await db.insert(quote_items).values({
            quote_id: newQuote.id,
            ...item
          });
        }

        return JSON.stringify({
          success: true,
          quote: {
            id: newQuote.id,
            document_number: documentNumber,
            customer_name,
            total_before_tax: totalBeforeTax.toFixed(2),
            tax_amount: taxAmount.toFixed(2),
            total_with_tax: totalWithTax.toFixed(2),
            items_count: items.length,
            currency: "SAR",
            currency_name: "ريال سعودي"
          },
          message: `تم إنشاء عرض السعر رقم ${documentNumber} بنجاح`
        });
      }

      case "convert_currency": {
        const { amount, from_currency, to_currency } = args as {
          amount: number;
          from_currency: string;
          to_currency: string;
        };
        
        const fromRate = exchangeRates[from_currency];
        const toRate = exchangeRates[to_currency];
        
        if (!fromRate || !toRate) {
          return JSON.stringify({ error: "عملة غير مدعومة" });
        }
        
        // تحويل إلى ريال سعودي أولاً ثم إلى العملة الهدف
        const amountInSAR = amount / fromRate;
        const convertedAmount = amountInSAR * toRate;
        
        return JSON.stringify({
          original_amount: amount,
          original_currency: from_currency,
          original_currency_name: currencyNames[from_currency],
          converted_amount: convertedAmount.toFixed(2),
          target_currency: to_currency,
          target_currency_name: currencyNames[to_currency],
          exchange_rate: (toRate / fromRate).toFixed(4),
          message: `${amount.toFixed(2)} ${currencyNames[from_currency]} = ${convertedAmount.toFixed(2)} ${currencyNames[to_currency]}`
        });
      }

      case "get_exchange_rates": {
        const rates = Object.entries(exchangeRates).map(([code, rate]) => ({
          code,
          name: currencyNames[code],
          rate_vs_sar: rate,
          sar_equivalent: (1 / rate).toFixed(4)
        }));
        
        return JSON.stringify({
          base_currency: "SAR",
          base_currency_name: "ريال سعودي",
          rates,
          last_updated: new Date().toISOString()
        });
      }

      case "get_quote_templates": {
        const activeTemplates = await db.select().from(quote_templates)
          .where(eq(quote_templates.is_active, true))
          .orderBy(quote_templates.name);
        
        if (activeTemplates.length === 0) {
          return JSON.stringify({
            templates: [],
            message: "لا توجد نماذج عروض أسعار متاحة حالياً"
          });
        }
        
        return JSON.stringify({
          templates: activeTemplates.map(t => ({
            id: t.id,
            name: t.name,
            product_name: t.product_name,
            product_description: t.product_description,
            unit_price: t.unit_price,
            unit: t.unit,
            min_quantity: t.min_quantity,
            category: t.category
          })),
          count: activeTemplates.length,
          message: `يوجد ${activeTemplates.length} نموذج متاح لعروض الأسعار`
        });
      }

      case "generate_quote_pdf": {
        const quoteId = args.quote_id as number;
        const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
        
        if (!quote) {
          return JSON.stringify({ error: "عرض السعر غير موجود" });
        }
        
        // الحصول على URL الأساسي للتطبيق
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
            : '';
        
        // إرجاع رابط تحميل PDF
        const relativePdfUrl = `/api/quotes/${quoteId}/pdf`;
        const fullPdfUrl = baseUrl ? `${baseUrl}${relativePdfUrl}` : relativePdfUrl;
        
        return JSON.stringify({
          success: true,
          quote_id: quoteId,
          document_number: quote.document_number,
          customer_name: quote.customer_name,
          total_with_tax: quote.total_with_tax,
          pdf_url: relativePdfUrl,
          full_pdf_url: fullPdfUrl,
          message: `تم إنشاء ملف PDF لعرض السعر ${quote.document_number}.\n\n📥 **رابط تحميل PDF:** ${fullPdfUrl}\n\nيمكنك النقر على الرابط لتحميل الملف.`
        });
      }

      case "send_quote_whatsapp": {
        const quoteId = args.quote_id as number;
        const phoneNumber = args.phone_number as string;
        
        const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
        
        if (!quote) {
          return JSON.stringify({ error: "عرض السعر غير موجود" });
        }
        
        // تنسيق رقم الجوال
        let formattedPhone = phoneNumber.replace(/\s/g, "");
        if (!formattedPhone.startsWith("+")) {
          formattedPhone = "+" + formattedPhone;
        }
        
        // الحصول على URL الأساسي للتطبيق
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
            : 'http://localhost:5000';
        
        const pdfUrl = `${baseUrl}/api/quotes/${quoteId}/pdf`;
        
        // إنشاء رسالة عرض السعر مع رابط PDF
        const quoteMessage = `📋 *عرض سعر جديد*\n\n` +
          `📄 رقم المستند: ${quote.document_number}\n` +
          `👤 العميل: ${quote.customer_name}\n` +
          `📅 التاريخ: ${new Date(quote.created_at!).toLocaleDateString('ar-SA')}\n\n` +
          `💰 المجموع قبل الضريبة: ${Number(quote.total_before_tax).toFixed(2)} ر.س\n` +
          `🧾 ضريبة القيمة المضافة (15%): ${Number(quote.tax_amount).toFixed(2)} ر.س\n` +
          `💵 *الإجمالي: ${Number(quote.total_with_tax).toFixed(2)} ر.س*\n\n` +
          `📥 تحميل ملف PDF:\n${pdfUrl}\n\n` +
          `✅ هذا العرض صالح لمدة 15 يوم من تاريخ الإصدار.`;
        
        // محاولة إرسال الرسالة عبر WhatsApp API (Meta أو Twilio)
        try {
          const { NotificationService } = await import("./services/notification-service");
          const { storage } = await import("./storage");
          const notificationService = new NotificationService(storage);
          
          // استخدام قالب qoutepdf المعتمد مع Meta API
          // القالب يتوقع متغيرين: user_name و Link_id
          const templateVariables = [quote.customer_name, pdfUrl];
          
          const result = await notificationService.metaWhatsApp.sendTemplateMessage(
            formattedPhone,
            "qoutepdf",
            "ar",
            templateVariables,
            {
              title: `عرض سعر ${quote.document_number}`,
              context_type: "quote",
              context_id: String(quoteId)
            }
          );
          
          if (result.success) {
            return JSON.stringify({
              success: true,
              message: `تم إرسال عرض السعر ${quote.document_number} بنجاح إلى ${formattedPhone} عبر الواتساب`,
              quote_id: quoteId,
              document_number: quote.document_number,
              phone_number: formattedPhone,
              message_id: result.messageId
            });
          } else {
            return JSON.stringify({
              success: false,
              error: result.error || "فشل في إرسال الرسالة",
              message: "لم يتم إرسال الرسالة. تأكد من إعداد خدمة الواتساب بشكل صحيح."
            });
          }
        } catch (error) {
          console.error("WhatsApp send error:", error);
          return JSON.stringify({
            success: false,
            error: "خدمة الواتساب غير متاحة حالياً",
            message: "يمكنك تحميل ملف PDF وإرساله يدوياً"
          });
        }
      }

      case "get_quote_by_number": {
        const documentNumber = args.document_number as string;
        const [quote] = await db.select().from(quotes).where(eq(quotes.document_number, documentNumber));
        
        if (!quote) {
          return JSON.stringify({ error: "عرض السعر غير موجود" });
        }
        
        const items = await db.select().from(quote_items).where(eq(quote_items.quote_id, quote.id)).orderBy(quote_items.line_number);
        
        return JSON.stringify({
          quote: {
            id: quote.id,
            document_number: quote.document_number,
            customer_name: quote.customer_name,
            tax_number: quote.tax_number,
            total_before_tax: quote.total_before_tax,
            tax_amount: quote.tax_amount,
            total_with_tax: quote.total_with_tax,
            status: quote.status,
            created_at: quote.created_at,
            notes: quote.notes
          },
          items: items.map(i => ({
            item_name: i.item_name,
            unit: i.unit,
            quantity: i.quantity,
            unit_price: i.unit_price,
            line_total: i.line_total
          })),
          pdf_url: `/api/quotes/${quote.id}/pdf`
        });
      }

      default:
        return JSON.stringify({ error: "دالة غير معروفة" });
    }
  } catch (error) {
    console.error("Error executing function:", name, error);
    return JSON.stringify({ error: "حدث خطأ أثناء تنفيذ العملية" });
  }
}

export function registerAiAgentRoutes(app: Express): void {
  app.post("/api/ai-agent/chat", async (req: Request, res: Response) => {
    try {
      const { messages } = req.body as { messages: Array<{ role: string; content: string }> };
      
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const dynamicSystemPrompt = await getSystemPrompt();
      const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: "system", content: dynamicSystemPrompt },
        ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content }))
      ];

      let response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: chatMessages,
        tools,
        tool_choice: "auto",
        max_completion_tokens: 4096,
      });

      while (response.choices[0]?.message?.tool_calls) {
        const toolCalls = response.choices[0].message.tool_calls;
        chatMessages.push(response.choices[0].message);

        for (const toolCall of toolCalls) {
          const fn = (toolCall as any).function;
          const args = JSON.parse(fn.arguments);
          const result = await executeFunction(fn.name, args);
          chatMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result
          });
        }

        response = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: chatMessages,
          tools,
          tool_choice: "auto",
          max_completion_tokens: 4096,
        });
      }

      const content = response.choices[0]?.message?.content || "";
      res.write(`data: ${JSON.stringify({ content, done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("AI Agent error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "حدث خطأ في المعالجة" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "حدث خطأ في المعالجة" });
      }
    }
  });

  app.get("/api/quotes", async (_req: Request, res: Response) => {
    try {
      const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.created_at));
      res.json(allQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "فشل في جلب عروض الأسعار" });
    }
  });

  app.get("/api/quotes/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
      if (!quote) {
        return res.status(404).json({ error: "عرض السعر غير موجود" });
      }
      const items = await db.select().from(quote_items).where(eq(quote_items.quote_id, id)).orderBy(quote_items.line_number);
      res.json({ ...quote, items });
    } catch (error) {
      console.error("Error fetching quote:", error);
      res.status(500).json({ error: "فشل في جلب عرض السعر" });
    }
  });

  app.get("/api/quotes/:id/pdf", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
      if (!quote) {
        return res.status(404).json({ error: "عرض السعر غير موجود" });
      }
      const items = await db.select().from(quote_items).where(eq(quote_items.quote_id, id)).orderBy(quote_items.line_number);

      const formatCurrency = (amount: string | number) => {
        return new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount));
      };

      const formatDate = (date: string | Date) => {
        return new Date(date).toLocaleDateString("ar-SA");
      };

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>عرض سعر - ${quote.document_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif; 
      padding: 40px; 
      background: white;
      color: #333;
      direction: rtl;
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo-section { text-align: right; }
    .logo-section h1 { color: #2563eb; font-size: 28px; margin-bottom: 5px; }
    .logo-section p { color: #666; font-size: 14px; }
    .doc-info { text-align: left; }
    .doc-info .doc-number { font-size: 24px; font-weight: bold; color: #2563eb; }
    .doc-info .doc-date { color: #666; margin-top: 5px; }
    .customer-section {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .customer-section h3 { color: #2563eb; margin-bottom: 15px; font-size: 16px; }
    .customer-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .customer-info div { font-size: 14px; }
    .customer-info span { font-weight: bold; }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-bottom: 30px;
    }
    th { 
      background: #2563eb; 
      color: white; 
      padding: 12px 15px; 
      text-align: right;
      font-weight: 600;
    }
    td { 
      padding: 12px 15px; 
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) { background: #f8fafc; }
    .totals {
      display: flex;
      justify-content: flex-start;
      margin-bottom: 30px;
    }
    .totals-box {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      min-width: 300px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-row:last-child {
      border-bottom: none;
      font-weight: bold;
      font-size: 18px;
      color: #2563eb;
      padding-top: 15px;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
    }
    .footer-section { text-align: center; }
    .footer-section p { color: #666; font-size: 12px; margin-bottom: 5px; }
    .footer-section strong { font-size: 14px; }
    .notes {
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 20px;
    }
    .notes h4 { color: #b45309; margin-bottom: 10px; }
    .notes p { color: #78350f; font-size: 14px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      <h1>🏭 مصنع الأكياس البلاستيكية</h1>
      <p>الجودة والإتقان في كل منتج</p>
    </div>
    <div class="doc-info">
      <div class="doc-number">${quote.document_number}</div>
      <div class="doc-date">${formatDate(quote.quote_date)}</div>
    </div>
  </div>

  <div class="customer-section">
    <h3>بيانات العميل</h3>
    <div class="customer-info">
      <div>اسم العميل: <span>${quote.customer_name}</span></div>
      <div>الرقم الضريبي: <span>${quote.tax_number}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>م</th>
        <th>اسم الصنف</th>
        <th>الوحدة</th>
        <th>الكمية</th>
        <th>سعر الوحدة</th>
        <th>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.line_number}</td>
          <td>${item.item_name}</td>
          <td>${item.unit}</td>
          <td>${formatCurrency(item.quantity)}</td>
          <td>${formatCurrency(item.unit_price)} ر.س</td>
          <td>${formatCurrency(item.line_total)} ر.س</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>الإجمالي قبل الضريبة:</span>
        <span>${formatCurrency(quote.total_before_tax)} ر.س</span>
      </div>
      <div class="totals-row">
        <span>ضريبة القيمة المضافة (15%):</span>
        <span>${formatCurrency(quote.tax_amount)} ر.س</span>
      </div>
      <div class="totals-row">
        <span>الإجمالي شامل الضريبة:</span>
        <span>${formatCurrency(quote.total_with_tax)} ر.س</span>
      </div>
    </div>
  </div>

  ${quote.notes ? `
    <div class="notes">
      <h4>ملاحظات:</h4>
      <p>${quote.notes}</p>
    </div>
  ` : ""}

  <div class="footer">
    <div class="footer-section">
      <p>صلاحية العرض: 15 يوم من تاريخ الإصدار</p>
    </div>
    ${quote.created_by_name ? `
      <div class="footer-section">
        <p>مقدم العرض</p>
        <strong>${quote.created_by_name}</strong>
        ${quote.created_by_phone ? `<p>${quote.created_by_phone}</p>` : ""}
      </div>
    ` : ""}
  </div>

  <script>window.print();</script>
</body>
</html>
      `;

      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
    } catch (error) {
      console.error("Error generating quote PDF:", error);
      res.status(500).json({ error: "فشل في إنشاء ملف PDF" });
    }
  });

  // ===== رفع الملفات وقراءتها =====
  app.post("/api/ai-agent/upload", upload.single("file"), async (req: Request, res: Response) => {
    const file = req.file;
    const filePath = file?.path;
    
    const cleanupFile = () => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error("Failed to cleanup temp file:", e);
        }
      }
    };
    
    try {
      if (!file) {
        return res.status(400).json({ error: "لم يتم رفع أي ملف" });
      }

      let content = "";

      if (file.mimetype.startsWith("image/")) {
        const imageBuffer = fs.readFileSync(filePath!);
        const base64Image = imageBuffer.toString("base64");
        const imageUrl = `data:${file.mimetype};base64,${base64Image}`;
        
        const visionResponse = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "قم بوصف محتوى هذه الصورة باللغة العربية بشكل مفصل" },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: 1000
        });
        content = visionResponse.choices[0]?.message?.content || "لم يتم التعرف على محتوى الصورة";
        
      } else if (file.mimetype === "text/plain" || file.mimetype === "text/csv") {
        content = fs.readFileSync(filePath!, "utf-8");
        
      } else if (file.mimetype.includes("spreadsheet") || file.mimetype.includes("excel")) {
        const workbook = new XLSX.Workbook();
        await workbook.xlsx.readFile(filePath!);
        const worksheet = workbook.worksheets[0];
        
        const rows: string[][] = [];
        worksheet.eachRow((row, rowNumber) => {
          const values: string[] = [];
          row.eachCell((cell) => {
            values.push(String(cell.value || ""));
          });
          rows.push(values);
        });
        
        content = `ملف Excel يحتوي على ${rows.length} صف:\n`;
        rows.slice(0, 50).forEach((row, idx) => {
          content += `الصف ${idx + 1}: ${row.join(" | ")}\n`;
        });
        if (rows.length > 50) {
          content += `\n... و${rows.length - 50} صف إضافي`;
        }
        
      } else if (file.mimetype === "application/pdf") {
        content = `ملف PDF تم رفعه: ${file.originalname}. لقراءة محتوى PDF، يرجى استخدام أداة متخصصة.`;
      }

      cleanupFile();

      res.json({
        success: true,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        content: content.substring(0, 10000)
      });
    } catch (error) {
      cleanupFile();
      console.error("File upload error:", error);
      res.status(500).json({ error: "فشل في معالجة الملف" });
    }
  });

  // ===== إعدادات الوكيل الذكي =====
  app.get("/api/ai-agent/settings", async (_req: Request, res: Response) => {
    try {
      const settings = await db.select().from(ai_agent_settings);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ error: "فشل في جلب الإعدادات" });
    }
  });

  app.put("/api/ai-agent/settings/:key", async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      
      const [existing] = await db.select().from(ai_agent_settings).where(eq(ai_agent_settings.key, key));
      
      if (existing) {
        await db.update(ai_agent_settings)
          .set({ value, description, updated_at: new Date() })
          .where(eq(ai_agent_settings.key, key));
      } else {
        await db.insert(ai_agent_settings).values({ key, value, description });
      }
      
      res.json({ success: true, message: "تم تحديث الإعداد بنجاح" });
    } catch (error) {
      console.error("Error updating AI setting:", error);
      res.status(500).json({ error: "فشل في تحديث الإعداد" });
    }
  });

  // ===== قاعدة المعرفة =====
  app.get("/api/ai-agent/knowledge", async (_req: Request, res: Response) => {
    try {
      const knowledge = await db.select().from(ai_agent_knowledge).orderBy(desc(ai_agent_knowledge.created_at));
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ error: "فشل في جلب قاعدة المعرفة" });
    }
  });

  app.post("/api/ai-agent/knowledge", async (req: Request, res: Response) => {
    try {
      const { title, content, category } = req.body;
      const [newKnowledge] = await db.insert(ai_agent_knowledge).values({
        title,
        content,
        category: category || "general",
        is_active: true
      }).returning();
      res.json(newKnowledge);
    } catch (error) {
      console.error("Error adding knowledge:", error);
      res.status(500).json({ error: "فشل في إضافة المعرفة" });
    }
  });

  app.put("/api/ai-agent/knowledge/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { title, content, category, is_active } = req.body;
      
      const [updated] = await db.update(ai_agent_knowledge)
        .set({ title, content, category, is_active, updated_at: new Date() })
        .where(eq(ai_agent_knowledge.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating knowledge:", error);
      res.status(500).json({ error: "فشل في تحديث المعرفة" });
    }
  });

  app.delete("/api/ai-agent/knowledge/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(ai_agent_knowledge).where(eq(ai_agent_knowledge.id, id));
      res.json({ success: true, message: "تم الحذف بنجاح" });
    } catch (error) {
      console.error("Error deleting knowledge:", error);
      res.status(500).json({ error: "فشل في الحذف" });
    }
  });

  // ===== نماذج عروض الأسعار =====
  app.get("/api/quote-templates", async (_req: Request, res: Response) => {
    try {
      const templates = await db.select().from(quote_templates).orderBy(desc(quote_templates.created_at));
      res.json(templates);
    } catch (error) {
      console.error("Error fetching quote templates:", error);
      res.status(500).json({ error: "فشل في جلب النماذج" });
    }
  });

  app.get("/api/quote-templates/active", async (_req: Request, res: Response) => {
    try {
      const templates = await db.select().from(quote_templates)
        .where(eq(quote_templates.is_active, true))
        .orderBy(quote_templates.name);
      res.json(templates);
    } catch (error) {
      console.error("Error fetching active quote templates:", error);
      res.status(500).json({ error: "فشل في جلب النماذج النشطة" });
    }
  });

  app.post("/api/quote-templates", async (req: Request, res: Response) => {
    try {
      const { name, description, product_name, product_description, unit_price, unit, min_quantity, specifications, category } = req.body;
      const [newTemplate] = await db.insert(quote_templates).values({
        name,
        description,
        product_name,
        product_description,
        unit_price: String(unit_price),
        unit: unit || "كجم",
        min_quantity: min_quantity ? String(min_quantity) : null,
        specifications,
        category,
        is_active: true
      }).returning();
      res.json(newTemplate);
    } catch (error) {
      console.error("Error creating quote template:", error);
      res.status(500).json({ error: "فشل في إنشاء النموذج" });
    }
  });

  app.put("/api/quote-templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, product_name, product_description, unit_price, unit, min_quantity, specifications, category, is_active } = req.body;
      
      const [updated] = await db.update(quote_templates)
        .set({
          name,
          description,
          product_name,
          product_description,
          unit_price: String(unit_price),
          unit,
          min_quantity: min_quantity ? String(min_quantity) : null,
          specifications,
          category,
          is_active,
          updated_at: new Date()
        })
        .where(eq(quote_templates.id, id))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating quote template:", error);
      res.status(500).json({ error: "فشل في تحديث النموذج" });
    }
  });

  app.delete("/api/quote-templates/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(quote_templates).where(eq(quote_templates.id, id));
      res.json({ success: true, message: "تم حذف النموذج بنجاح" });
    } catch (error) {
      console.error("Error deleting quote template:", error);
      res.status(500).json({ error: "فشل في حذف النموذج" });
    }
  });
}
