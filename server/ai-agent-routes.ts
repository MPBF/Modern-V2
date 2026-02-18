import type { Express, Request, Response } from "express";
import OpenAI from "openai";
import { db } from "./db";
import { orders, production_orders, rolls, quotes, quote_items, customers, ai_agent_settings, ai_agent_knowledge, quote_templates } from "@shared/schema";
import { eq, desc, and, gte, lte, count, sum, like, or } from "drizzle-orm";
import multer, { FileFilterCallback } from "multer";
import * as XLSX from "exceljs";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import PDFDocument from "pdfkit";
import { objectStorageClient } from "./replit_integrations/object_storage";
import { generateQuotePdfWithAdobe, isAdobePdfAvailable } from "./adobe-pdf-service";
// @ts-ignore
import ArabicReshaper from "arabic-reshaper";
// @ts-ignore
import bidiFactory from "bidi-js";

const PDF_DIR = "/tmp/quote-pdfs";
if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

// دالة للحصول على الدومين الأساسي للتطبيق
function getAppBaseUrl(): string {
  // أولاً: التحقق من الدومين المخصص (Production)
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    // استخدام أول دومين (عادة يكون الدومين المخصص أو الدومين الرئيسي)
    return `https://${domains[0]}`;
  }
  // ثانياً: دومين التطوير
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return 'http://localhost:5000';
}

// دالة لرفع PDF إلى التخزين السحابي والحصول على رابط على الدومين الخاص
async function uploadPdfToStorage(pdfBuffer: Buffer, documentNumber: string): Promise<string> {
  try {
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    if (!bucketId) {
      throw new Error("Object storage not configured");
    }
    
    const bucket = objectStorageClient.bucket(bucketId);
    // استخدام اسم ملف ثابت بناءً على رقم المستند فقط (بدون timestamp) للوصول المتكرر
    const fileName = `quotes/quote_${documentNumber}.pdf`;
    const file = bucket.file(fileName);
    
    // رفع الملف
    await file.save(pdfBuffer, {
      contentType: "application/pdf",
      metadata: {
        cacheControl: "public, max-age=86400", // 24 hours cache
      },
    });
    
    // إرجاع رابط على الدومين الخاص بالتطبيق
    const baseUrl = getAppBaseUrl();
    const pdfUrl = `${baseUrl}/api/pdf/quotes/${documentNumber}`;
    
    console.log(`PDF uploaded successfully. Access URL: ${pdfUrl}`);
    return pdfUrl;
  } catch (error) {
    console.error("Error uploading PDF to storage:", error);
    throw error;
  }
}

// دالة مساعدة لمعالجة النص العربي للعرض الصحيح في PDF
const bidi = bidiFactory();

function processArabicText(text: string): string {
  if (!text) return "";
  
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  if (!arabicRegex.test(text)) return text;
  
  try {
    const reshaped = ArabicReshaper.convertArabic(text);
    
    const embeddingLevels = bidi.getEmbeddingLevels(reshaped, 'rtl');
    const reorderSegments = bidi.getReorderSegments(reshaped, embeddingLevels);
    
    const chars = Array.from(reshaped);
    reorderSegments.forEach(([start, end]: [number, number]) => {
      const segment = chars.slice(start, end + 1).reverse();
      chars.splice(start, end - start + 1, ...segment);
    });
    
    const mirrored = bidi.getMirroredCharactersMap(reshaped, embeddingLevels);
    if (mirrored) {
      Object.keys(mirrored).forEach((index: string) => {
        const idx = parseInt(index);
        if (idx < chars.length) {
          chars[idx] = mirrored[idx];
        }
      });
    }
    
    return chars.join('');
  } catch (e) {
    console.error("Arabic text processing error:", e);
    return text;
  }
}

async function generateQuotePdfBuffer(quoteId: number): Promise<Buffer> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) {
    throw new Error("Quote not found");
  }
  
  const items = await db.select().from(quote_items).where(eq(quote_items.quote_id, quoteId)).orderBy(quote_items.line_number);
  
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount));
  };
  
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-GB");
  };
  
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 30, bufferPages: true });
    
    const fontPath = path.join(__dirname, 'fonts', 'Amiri-Regular.ttf');
    const logoPath = path.join(__dirname, 'fonts', 'factory-logo.png');
    const hasArabicFont = fs.existsSync(fontPath);
    const hasLogo = fs.existsSync(logoPath);
    if (hasArabicFont) {
      doc.registerFont('Arabic', fontPath);
    }
    
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));
    
    const pageWidth = 595;
    const contentWidth = pageWidth - 60;
    const leftMargin = 30;
    const rightEdge = pageWidth - 30;
    
    if (hasLogo) {
      try {
        doc.image(logoPath, leftMargin, 30, { width: 50, height: 50 });
      } catch (e) {
        console.error("Logo load error:", e);
      }
    }
    
    const textStartX = hasLogo ? leftMargin + 58 : leftMargin;
    const textWidth = hasLogo ? contentWidth - 58 : contentWidth;
    
    doc.fontSize(18).fillColor("#2563eb").text("Modern Plastic Bags Factory", textStartX, 32, { width: textWidth, align: "center" });
    if (hasArabicFont) {
      doc.font('Arabic').fontSize(12).fillColor("#666").text(processArabicText("مصنع الأكياس البلاستيكية الحديثة"), textStartX, 52, { width: textWidth, align: "center" });
      doc.font('Helvetica');
    }
    doc.fontSize(7).fillColor("#999").text("Industrial Area, Phase 2 | P.O. Box 12345, Riyadh, Saudi Arabia", textStartX, 66, { width: textWidth, align: "center" });
    doc.text("Tel: +966 11 XXX XXXX | Fax: +966 11 XXX XXXX | www.modplastic.com", textStartX, 75, { width: textWidth, align: "center" });
    doc.y = 88;
    doc.moveDown(0.3);
    
    doc.strokeColor("#2563eb").lineWidth(1.5).moveTo(leftMargin, doc.y).lineTo(rightEdge, doc.y).stroke();
    doc.moveDown(0.5);
    
    doc.fontSize(16).fillColor("#2563eb").text("PRICE QUOTATION / " + (hasArabicFont ? processArabicText("عرض سعر") : ""), { align: "center" });
    doc.moveDown(0.2);
    doc.fontSize(11).fillColor("#333").text(`Document: ${quote.document_number}  |  Date: ${formatDate(quote.quote_date)}`, { align: "center" });
    doc.moveDown(0.5);
    
    const customerBoxY = doc.y;
    doc.rect(leftMargin, customerBoxY, contentWidth, 50).fillColor("#f8fafc").fill();
    doc.fillColor("#333");
    const customerY = customerBoxY + 8;
    doc.fontSize(10).text("Customer Information", leftMargin + 10, customerY, { underline: true });
    
    const customerName = quote.customer_name || "";
    const hasArabicName = /[\u0600-\u06FF]/.test(customerName);
    if (hasArabicFont && hasArabicName) {
      doc.font('Helvetica').fontSize(9).text("Customer: ", leftMargin + 10, customerY + 16, { continued: true });
      doc.font('Arabic').text(processArabicText(customerName));
      doc.font('Helvetica');
    } else {
      doc.fontSize(9).text(`Customer: ${customerName}`, leftMargin + 10, customerY + 16);
    }
    doc.text(`Tax Number: ${quote.tax_number || "N/A"}`, leftMargin + 10, customerY + 30);
    doc.y = customerBoxY + 55;
    
    const tableTop = doc.y;
    const colWidths = [25, 180, 50, 55, 70, 75];
    const headers = ["#", "Item Name", "Unit", "Qty", "Unit Price", "Total"];
    const rowHeight = 18;
    
    doc.rect(leftMargin, tableTop, contentWidth, 20).fillColor("#2563eb").fill();
    doc.font('Helvetica').fillColor("#fff").fontSize(8);
    let xPos = leftMargin + 3;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop + 6, { width: colWidths[i], align: "center" });
      xPos += colWidths[i];
    });
    
    let rowY = tableTop + 20;
    
    const maxRowsPerPage = Math.floor((780 - rowY) / rowHeight) - 8;
    const itemsPerPage = Math.min(items.length, maxRowsPerPage);
    
    items.slice(0, itemsPerPage).forEach((item, index) => {
      const isEven = index % 2 === 0;
      if (isEven) {
        doc.rect(leftMargin, rowY, contentWidth, rowHeight).fillColor("#f8fafc").fill();
      }
      
      doc.fillColor("#333").fontSize(8);
      xPos = leftMargin + 3;
      doc.font('Helvetica').text(String(item.line_number), xPos, rowY + 5, { width: colWidths[0], align: "center" });
      xPos += colWidths[0];
      
      const itemName = item.item_name || "";
      const hasArabicItem = /[\u0600-\u06FF]/.test(itemName);
      if (hasArabicFont && hasArabicItem) {
        doc.font('Arabic').text(processArabicText(itemName.substring(0, 40)), xPos, rowY + 3, { width: colWidths[1], align: "center" });
        doc.font('Helvetica');
      } else {
        doc.text(itemName.substring(0, 40), xPos, rowY + 5, { width: colWidths[1], align: "center" });
      }
      xPos += colWidths[1];
      
      const unitText = item.unit || "";
      const hasArabicUnit = /[\u0600-\u06FF]/.test(unitText);
      if (hasArabicFont && hasArabicUnit) {
        doc.font('Arabic').text(processArabicText(unitText), xPos, rowY + 3, { width: colWidths[2], align: "center" });
        doc.font('Helvetica');
      } else {
        doc.text(unitText, xPos, rowY + 5, { width: colWidths[2], align: "center" });
      }
      xPos += colWidths[2];
      
      doc.font('Helvetica');
      doc.text(formatCurrency(item.quantity), xPos, rowY + 5, { width: colWidths[3], align: "center" });
      xPos += colWidths[3];
      doc.text(`${formatCurrency(item.unit_price)}`, xPos, rowY + 5, { width: colWidths[4], align: "center" });
      xPos += colWidths[4];
      doc.text(`${formatCurrency(item.line_total)}`, xPos, rowY + 5, { width: colWidths[5], align: "center" });
      
      rowY += rowHeight;
    });
    
    if (items.length > itemsPerPage) {
      doc.fontSize(7).fillColor("#666").text(`... و ${items.length - itemsPerPage} عناصر إضافية`, leftMargin, rowY + 2);
      rowY += 15;
    }
    
    doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(leftMargin, rowY).lineTo(rightEdge, rowY).stroke();
    doc.y = rowY + 10;
    
    const totalsBoxY = doc.y;
    doc.rect(leftMargin, totalsBoxY, 200, 60).fillColor("#f8fafc").fill();
    const totalsY = totalsBoxY + 8;
    doc.font('Helvetica').fillColor("#333").fontSize(9);
    doc.text("Subtotal:", leftMargin + 10, totalsY);
    doc.text(`${formatCurrency(quote.total_before_tax)} SAR`, leftMargin + 100, totalsY, { align: "right", width: 90 });
    doc.text("VAT (15%):", leftMargin + 10, totalsY + 15);
    doc.text(`${formatCurrency(quote.tax_amount)} SAR`, leftMargin + 100, totalsY + 15, { align: "right", width: 90 });
    doc.strokeColor("#e2e8f0").moveTo(leftMargin + 10, totalsY + 30).lineTo(leftMargin + 190, totalsY + 30).stroke();
    doc.fontSize(11).fillColor("#2563eb").text("Total:", leftMargin + 10, totalsY + 38);
    doc.text(`${formatCurrency(quote.total_with_tax)} SAR`, leftMargin + 100, totalsY + 38, { align: "right", width: 90 });
    
    doc.y = totalsBoxY + 65;
    
    if (quote.notes) {
      const notesY = doc.y;
      const notesHeight = 40;
      doc.rect(leftMargin, notesY, contentWidth, notesHeight).fillColor("#fffbeb").fill();
      doc.strokeColor("#fcd34d").lineWidth(0.5).rect(leftMargin, notesY, contentWidth, notesHeight).stroke();
      doc.font('Helvetica').fillColor("#b45309").fontSize(8).text("Notes:", leftMargin + 8, notesY + 6);
      
      const notesText = (quote.notes || "").substring(0, 200);
      const hasArabicNotes = /[\u0600-\u06FF]/.test(notesText);
      if (hasArabicFont && hasArabicNotes) {
        doc.font('Arabic').fillColor("#78350f").fontSize(8).text(processArabicText(notesText), leftMargin + 8, notesY + 18, { width: contentWidth - 16, align: "right" });
        doc.font('Helvetica');
      } else {
        doc.fillColor("#78350f").fontSize(8).text(notesText, leftMargin + 8, notesY + 18, { width: contentWidth - 16 });
      }
      doc.y = notesY + notesHeight + 5;
    }
    
    doc.moveDown(0.5);
    doc.strokeColor("#e2e8f0").lineWidth(0.5).moveTo(leftMargin, doc.y).lineTo(rightEdge, doc.y).stroke();
    doc.moveDown(0.3);
    doc.font('Helvetica').fillColor("#666").fontSize(7).text("This quotation is valid for 15 days from the issue date.", { align: "center" });
    if (hasArabicFont) {
      doc.font('Arabic').fontSize(7).text(processArabicText("هذا العرض صالح لمدة 15 يوم من تاريخ الإصدار"), { align: "center" });
      doc.font('Helvetica');
    }
    
    if (quote.created_by_name) {
      doc.moveDown(0.3);
      const preparedByName = quote.created_by_name || "";
      const hasArabicPreparer = /[\u0600-\u06FF]/.test(preparedByName);
      doc.fontSize(7);
      if (hasArabicFont && hasArabicPreparer) {
        doc.font('Helvetica').text("Prepared by: ", { align: "center", continued: true });
        doc.font('Arabic').text(processArabicText(preparedByName) + (quote.created_by_phone ? ` - ${quote.created_by_phone}` : ""));
        doc.font('Helvetica');
      } else {
        doc.text(`Prepared by: ${preparedByName}${quote.created_by_phone ? ` - ${quote.created_by_phone}` : ""}`, { align: "center" });
      }
    }
    
    doc.end();
  });
}

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
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for audio files
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    const allowedTypes = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "text/plain", "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/m4a",
      "video/webm", "video/mp4"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم"));
    }
  }
});

// دالة لجلب محتوى موقع الويب
async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ModPlastic AI Agent/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ar,en;q=0.9'
      },
      signal: AbortSignal.timeout(10000)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const html = await response.text();
    
    // تنظيف HTML واستخراج النص
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
    
    return textContent.substring(0, 15000);
  } catch (error) {
    console.error("Error fetching website:", error);
    throw error;
  }
}

// دالة للبحث الذكي في قاعدة المعرفة
async function searchKnowledgeBase(query: string): Promise<Array<{ title: string; content: string; category: string; relevance: number }>> {
  try {
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    
    const allKnowledge = await db.select()
      .from(ai_agent_knowledge)
      .where(eq(ai_agent_knowledge.is_active, true));
    
    const results = allKnowledge.map(item => {
      const titleLower = item.title.toLowerCase();
      const contentLower = item.content.toLowerCase();
      
      let relevance = 0;
      keywords.forEach(keyword => {
        if (titleLower.includes(keyword)) relevance += 3;
        if (contentLower.includes(keyword)) relevance += 1;
      });
      
      return {
        ...item,
        relevance
      };
    })
    .filter(item => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, 5);
    
    return results;
  } catch (error) {
    console.error("Error searching knowledge base:", error);
    return [];
  }
}

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

  return `أنت ${agentName}، مساعد ذكي متقدم لشركة ${companyName} (www.modplastic.com). 

### قدراتك الأساسية:
1. **الطلبات والإنتاج**: الإجابة عن استفسارات الطلبات، أوامر الإنتاج، والكميات المنتجة
2. **عروض الأسعار**: إنشاء عروض أسعار احترافية بصيغة PDF ورفعها على modplastic.com
3. **التواصل**: إرسال عروض الأسعار عبر الواتساب للعملاء
4. **تحويل العملات**: تحويل بين العملات المختلفة (العملة الأساسية: الريال السعودي)
5. **تحليل الملفات**: قراءة وتحليل الصور، Excel، CSV، PDF
6. **الرسائل الصوتية**: استقبال وتحويل الرسائل الصوتية إلى نص
7. **قاعدة المعرفة**: البحث في قاعدة المعرفة والتعلم وحفظ المعلومات الجديدة
8. **معلومات الموقع**: جلب معلومات من موقع المصنع www.modplastic.com
9. **معلومات العملاء**: البحث عن بيانات العملاء والاستعلام عنها

### معلومات المصنع:
- الموقع الإلكتروني: www.modplastic.com
- متخصصون في تصنيع الأكياس البلاستيكية والأفلام البلاستيكية عالية الجودة
- نقدم حلول تغليف متكاملة للمصانع والشركات

${defaultGreeting ? `رسالة الترحيب: ${defaultGreeting}\n` : ""}
أسلوب الرد: ${responseStyle}
العملة الأساسية هي الريال السعودي (ر.س). نسبة ضريبة القيمة المضافة: ${parseFloat(vatRate) * 100}%

### إرشادات العمل:

**عند إنشاء عرض سعر:**
1. اجمع: اسم العميل، الرقم الضريبي (14 رقم)، الأصناف (الاسم، الوحدة، السعر، الكمية)
2. استخدم get_quote_templates لمعرفة المنتجات والأسعار المتاحة
3. بعد الإنشاء، استخدم generate_quote_pdf لإنشاء رابط PDF على modplastic.com
4. قدم رابط التحميل بوضوح

**عند إرسال عرض عبر الواتساب:**
1. تأكد من وجود العرض (استخدم get_quote_by_number)
2. اطلب رقم الجوال مع رمز الدولة (+966501234567)
3. استخدم send_quote_whatsapp للإرسال

**عند تلقي سؤال عام:**
1. ابحث أولاً في قاعدة المعرفة باستخدام search_knowledge_base
2. إذا لم تجد إجابة، استخدم get_website_info لجلب معلومات من الموقع
3. تعلم من المحادثات وأضف معلومات مهمة باستخدام add_to_knowledge_base

**عند الاستعلام عن عميل:**
استخدم get_customer_info للبحث بالاسم أو الرقم

${customInstructions ? `### تعليمات إضافية:\n${customInstructions}\n` : ""}
${knowledgeText}

قم بالرد باللغة العربية دائماً. كن ذكياً، مفيداً، وتعلم من كل محادثة.`;
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
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_base",
      description: "البحث في قاعدة المعرفة عن معلومات محددة. استخدم هذه الأداة عندما تحتاج معلومات عن المصنع أو المنتجات أو السياسات",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "نص البحث أو السؤال" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_website_info",
      description: "جلب معلومات من موقع المصنع www.modplastic.com. استخدم هذه الأداة للإجابة عن أسئلة حول المنتجات والخدمات المتاحة على الموقع",
      parameters: {
        type: "object",
        properties: {
          page: { 
            type: "string", 
            enum: ["home", "products", "about", "contact"],
            description: "الصفحة المراد جلب معلوماتها (home=الرئيسية, products=المنتجات, about=عن المصنع, contact=التواصل)" 
          }
        },
        required: ["page"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_to_knowledge_base",
      description: "إضافة معلومات جديدة إلى قاعدة المعرفة للتعلم والتذكر لاحقاً",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "عنوان المعلومة" },
          content: { type: "string", description: "محتوى المعلومة" },
          category: { type: "string", enum: ["products", "policies", "customers", "pricing", "general"], description: "تصنيف المعلومة" }
        },
        required: ["title", "content", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_customer_info",
      description: "الحصول على معلومات عميل معين بالاسم أو الرقم",
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string", description: "اسم العميل أو رقم العميل للبحث" }
        },
        required: ["search_term"]
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
        
        const quoteItems = await db.select().from(quote_items).where(eq(quote_items.quote_id, quoteId)).orderBy(quote_items.line_number);
        
        try {
          let pdfBuffer: Buffer;
          
          // استخدام Adobe PDF Services API للدعم الكامل للنص العربي RTL
          if (isAdobePdfAvailable()) {
            console.log("Using Adobe PDF Services API for quote generation with full Arabic RTL support");
            try {
              pdfBuffer = await generateQuotePdfWithAdobe(quoteId);
              console.log("✅ Adobe PDF generated successfully");
            } catch (adobeError) {
              console.error("Adobe PDF failed, falling back to PDFKit:", adobeError);
              pdfBuffer = await generateQuotePdfBuffer(quoteId);
            }
          } else {
            console.log("Using PDFKit for quote generation (Adobe credentials not configured)");
            pdfBuffer = await generateQuotePdfBuffer(quoteId);
          }
          
          const cloudPdfUrl = await uploadPdfToStorage(pdfBuffer, quote.document_number);
          
          return JSON.stringify({
            success: true,
            quote_id: quoteId,
            document_number: quote.document_number,
            customer_name: quote.customer_name,
            total_with_tax: quote.total_with_tax,
            pdf_url: cloudPdfUrl,
            download_link: `[تحميل ملف PDF](${cloudPdfUrl})`,
            message: `تم إنشاء ملف PDF لعرض السعر ${quote.document_number}.\n\nرابط التحميل: ${cloudPdfUrl}`
          });
        } catch (error) {
          console.error("Error generating/uploading PDF:", error);
          // Fallback to local URL if storage fails
          const baseUrl = process.env.REPLIT_DEV_DOMAIN 
            ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
            : process.env.REPLIT_DOMAINS 
              ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
              : '';
          const relativePdfUrl = `/api/quotes/${quoteId}/pdf`;
          const fullPdfUrl = baseUrl ? `${baseUrl}${relativePdfUrl}` : relativePdfUrl;
          
          return JSON.stringify({
            success: true,
            quote_id: quoteId,
            document_number: quote.document_number,
            customer_name: quote.customer_name,
            total_with_tax: quote.total_with_tax,
            pdf_url: fullPdfUrl,
            download_link: `[تحميل ملف PDF](${fullPdfUrl})`,
            message: `تم إنشاء ملف PDF لعرض السعر ${quote.document_number}.\n\nرابط التحميل: ${fullPdfUrl}`
          });
        }
      }

      case "send_quote_whatsapp": {
        const quoteId = args.quote_id as number;
        const phoneNumber = args.phone_number as string;
        
        const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
        
        if (!quote) {
          return JSON.stringify({ error: "عرض السعر غير موجود" });
        }
        
        // تنسيق رقم الجوال - إزالة المسافات والرموز الزائدة
        let formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
        if (!formattedPhone.startsWith("+")) {
          // إضافة رمز السعودية افتراضياً إذا لم يكن موجوداً
          if (formattedPhone.startsWith("05")) {
            formattedPhone = "+966" + formattedPhone.substring(1);
          } else if (formattedPhone.startsWith("5")) {
            formattedPhone = "+966" + formattedPhone;
          } else if (!formattedPhone.startsWith("+")) {
            formattedPhone = "+" + formattedPhone;
          }
        }
        
        // الحصول على URL الأساسي للتطبيق
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : process.env.REPLIT_DOMAINS 
            ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
            : 'http://localhost:5000';
        
        const pdfUrl = `${baseUrl}/api/quotes/${quoteId}/pdf`;
        
        // إنشاء رسالة عرض السعر مع رابط PDF (بدون رموز خاصة قد تسبب مشاكل)
        const quoteMessage = `عرض سعر جديد\n\n` +
          `رقم المستند: ${quote.document_number}\n` +
          `العميل: ${quote.customer_name}\n` +
          `التاريخ: ${new Date(quote.created_at!).toLocaleDateString('ar-SA')}\n\n` +
          `المجموع قبل الضريبة: ${Number(quote.total_before_tax).toFixed(2)} ر.س\n` +
          `ضريبة القيمة المضافة 15%: ${Number(quote.tax_amount).toFixed(2)} ر.س\n` +
          `الإجمالي: ${Number(quote.total_with_tax).toFixed(2)} ر.س\n\n` +
          `رابط تحميل PDF:\n${pdfUrl}\n\n` +
          `هذا العرض صالح لمدة 15 يوم من تاريخ الإصدار.`;
        
        // محاولة إرسال الرسالة عبر WhatsApp API (Meta أو Twilio)
        try {
          const { NotificationService } = await import("./services/notification-service");
          const { storage } = await import("./storage");
          const notificationService = new NotificationService(storage);
          
          // إرسال ملف PDF أولاً
          const pdfCaption = `عرض سعر ${quote.document_number}\n` +
            `العميل: ${quote.customer_name}\n` +
            `الإجمالي: ${Number(quote.total_with_tax).toFixed(2)} ر.س`;
          
          const docResult = await notificationService.sendWhatsAppDocument(
            formattedPhone,
            pdfUrl,
            `عرض_سعر_${quote.document_number}.pdf`,
            pdfCaption,
            {
              title: `مستند عرض سعر ${quote.document_number}`,
              context_type: "quote",
              context_id: String(quoteId)
            }
          );
          
          // إرسال رسالة نصية تفصيلية بعد الملف
          const textResult = await notificationService.sendWhatsAppMessage(
            formattedPhone,
            quoteMessage,
            {
              title: `عرض سعر ${quote.document_number}`,
              context_type: "quote",
              context_id: String(quoteId)
            }
          );
          
          if (docResult.success || textResult.success) {
            return JSON.stringify({
              success: true,
              message: `تم إرسال عرض السعر ${quote.document_number} ${docResult.success ? 'مع ملف PDF' : ''} بنجاح إلى ${formattedPhone} عبر الواتساب`,
              quote_id: quoteId,
              document_number: quote.document_number,
              phone_number: formattedPhone,
              pdf_sent: docResult.success,
              text_sent: textResult.success,
              message_ids: [docResult.messageId, textResult.messageId].filter(Boolean)
            });
          } else {
            // إذا فشل الإرسال، نوفر رابط للإرسال اليدوي
            const whatsappWebLink = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(quoteMessage)}`;
            return JSON.stringify({
              success: false,
              error: textResult.error || docResult.error || "فشل في إرسال الرسالة",
              message: "لم يتم إرسال الرسالة تلقائياً. يمكنك استخدام الرابط التالي للإرسال يدوياً:",
              whatsapp_link: whatsappWebLink,
              pdf_url: pdfUrl
            });
          }
        } catch (error) {
          console.error("WhatsApp send error:", error);
          // توفير رابط للإرسال اليدوي
          const whatsappWebLink = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(quoteMessage)}`;
          return JSON.stringify({
            success: false,
            error: "خدمة الواتساب غير متاحة حالياً",
            message: "يمكنك استخدام الرابط التالي للإرسال يدوياً عبر WhatsApp Web:",
            whatsapp_link: whatsappWebLink,
            pdf_url: pdfUrl
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

      case "search_knowledge_base": {
        const query = args.query as string;
        const results = await searchKnowledgeBase(query);
        
        if (results.length === 0) {
          return JSON.stringify({
            found: false,
            message: "لم يتم العثور على معلومات مطابقة في قاعدة المعرفة"
          });
        }
        
        return JSON.stringify({
          found: true,
          count: results.length,
          results: results.map(r => ({
            title: r.title,
            content: r.content,
            category: r.category
          }))
        });
      }

      case "get_website_info": {
        const page = args.page as string;
        const urlMap: Record<string, string> = {
          home: "https://www.modplastic.com",
          products: "https://www.modplastic.com/products",
          about: "https://www.modplastic.com/about",
          contact: "https://www.modplastic.com/contact"
        };
        
        const url = urlMap[page] || urlMap.home;
        
        try {
          const content = await fetchWebsiteContent(url);
          return JSON.stringify({
            success: true,
            page,
            url,
            content,
            message: `تم جلب محتوى صفحة ${page} من موقع المصنع`
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: "تعذر جلب محتوى الموقع",
            message: "الموقع قد يكون غير متاح حالياً. يرجى المحاولة لاحقاً"
          });
        }
      }

      case "add_to_knowledge_base": {
        const { title, content, category } = args as { title: string; content: string; category: string };
        
        try {
          const [newKnowledge] = await db.insert(ai_agent_knowledge).values({
            title,
            content,
            category,
            is_active: true
          }).returning();
          
          return JSON.stringify({
            success: true,
            id: newKnowledge.id,
            message: `تم إضافة "${title}" إلى قاعدة المعرفة بنجاح`
          });
        } catch (error) {
          return JSON.stringify({
            success: false,
            error: "فشل في إضافة المعلومات إلى قاعدة المعرفة"
          });
        }
      }

      case "get_customer_info": {
        const searchTerm = args.search_term as string;
        
        const customerResults = await db.select()
          .from(customers)
          .where(
            or(
              like(customers.name, `%${searchTerm}%`),
              like(customers.name_ar, `%${searchTerm}%`),
              eq(customers.id, searchTerm),
              like(customers.phone, `%${searchTerm}%`)
            )
          )
          .limit(5);
        
        if (customerResults.length === 0) {
          return JSON.stringify({
            found: false,
            message: "لم يتم العثور على عميل مطابق"
          });
        }
        
        return JSON.stringify({
          found: true,
          count: customerResults.length,
          customers: customerResults.map(c => ({
            id: c.id,
            name: c.name,
            name_ar: c.name_ar,
            phone: c.phone,
            city: c.city,
            tax_number: c.tax_number,
            is_active: c.is_active
          }))
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
  let clientClosed = false;

  // لمراقبة إغلاق الاتصال من العميل
  req.on("close", () => {
    clientClosed = true;
  });

  // وظيفة صغيرة لتنظيف الاتصال بأمان
  let ping: NodeJS.Timeout | null = null;

  const safeEnd = () => {
    try {
      if (ping) {
        clearInterval(ping);
        ping = null;
      }
      if (!res.writableEnded) {
        res.end();
      }
    } catch {
      // تجاهل
    }
  };

  const safeWrite = (data: any) => {
    if (clientClosed || res.writableEnded) return;
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      // تجاهل
    }
  };

  try {
    const { messages } = req.body as { messages: Array<{ role: string; content: string }> };

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "صيغة الرسائل غير صحيحة" });
    }

    // ===== SSE Headers =====
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    // إرسال الهيدرز فوراً (مهم لبعض البيئات)
    res.flushHeaders?.();

    // ===== Keep-alive Ping =====
    // بعض المنصات/البروكسي تقطع SSE لو ما فيه بيانات لفترة
    ping = setInterval(() => {
      if (clientClosed || res.writableEnded) return;
      try {
        // هذا تعليق SSE، ما يتعارض مع JSON عند العميل
        res.write(`: ping\n\n`);
      } catch {
        // تجاهل
      }
    }, 15000);

    req.on("close", () => {
      clientClosed = true;
      safeEnd();
    });

    // ===== بناء رسائل الشات =====
    const dynamicSystemPrompt = await getSystemPrompt();

    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: dynamicSystemPrompt },
      ...messages
        .slice(-20) // حد أقصى للرسائل لحماية الأداء
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: String(m.content || ""),
        })),
    ];

    const MAX_TOOL_ROUNDS = 6;
    let toolRounds = 0;

    // ===== أول استدعاء OpenAI =====
    let response = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: chatMessages,
      tools,
      tool_choice: "auto",
      max_completion_tokens: 4096,
    });

    // ===== Loop: تنفيذ الأدوات =====
    while (response.choices[0]?.message?.tool_calls) {
      if (clientClosed) return safeEnd();

      toolRounds++;
      if (toolRounds > MAX_TOOL_ROUNDS) {
        safeWrite({
          content:
            "تعذر إكمال العملية تلقائياً بسبب تكرار الاستدعاءات. فضلاً حدّد رقم الطلب/عرض السعر بشكل أدق.",
          done: true,
        });
        return safeEnd();
      }

      const toolCalls = response.choices[0].message.tool_calls;
      chatMessages.push(response.choices[0].message);

      for (const toolCall of toolCalls) {
        if (clientClosed) return safeEnd();

        const fn = (toolCall as any).function;

        let args: any;
        try {
          args = JSON.parse(fn.arguments || "{}");
        } catch {
          chatMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              ok: false,
              error: { code: "BAD_TOOL_ARGS", message: "تعذر قراءة مدخلات الأداة" },
            }),
          });
          continue;
        }

        const result = await executeFunction(fn.name, args);

        chatMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      // ===== استدعاء OpenAI بعد تنفيذ الأدوات =====
      response = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: chatMessages,
        tools,
        tool_choice: "auto",
        max_completion_tokens: 4096,
      });
    }

    // ===== الرد النهائي =====
    const content = response.choices[0]?.message?.content || "";

    safeWrite({ content, done: true });
    safeEnd();
  } catch (error) {
    console.error("AI Agent error:", error);

    // لو الهيدرز انرسلت بالفعل (SSE)، رجع خطأ بصيغة event
    if (res.headersSent && !res.writableEnded) {
      safeWrite({ error: "حدث خطأ في المعالجة", done: true });
      safeEnd();
      return;
    }

    // لو ما بدأ SSE أصلاً
    try {
      return res.status(500).json({ error: "حدث خطأ في المعالجة" });
    } catch {
      safeEnd();
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

  // نقطة نهاية لتقديم ملفات PDF من التخزين السحابي على الدومين الخاص
  app.get("/api/pdf/quotes/:documentNumber", async (req: Request, res: Response) => {
    try {
      const { documentNumber } = req.params;
      
      const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
      
      // محاولة جلب الملف من Object Storage أولاً
      if (bucketId) {
        try {
          const bucket = objectStorageClient.bucket(bucketId);
          const fileName = `quotes/quote_${documentNumber}.pdf`;
          const file = bucket.file(fileName);
          
          const [exists] = await file.exists();
          if (exists) {
            const [fileBuffer] = await file.download();
            
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="quote_${documentNumber}.pdf"`);
            res.setHeader("Cache-Control", "public, max-age=86400");
            return res.send(fileBuffer);
          }
        } catch (storageError) {
          console.warn("Object storage fetch failed, falling back to dynamic generation:", storageError);
        }
      }
      
      // Fallback: إنشاء PDF ديناميكياً من قاعدة البيانات
      const [quote] = await db.select().from(quotes).where(eq(quotes.document_number, documentNumber));
      if (!quote) {
        return res.status(404).json({ error: "عرض السعر غير موجود" });
      }
      
      // إعادة التوجيه إلى endpoint التوليد الديناميكي
      return res.redirect(`/api/quotes/${quote.id}/pdf`);
    } catch (error) {
      console.error("Error serving PDF:", error);
      res.status(500).json({ error: "فشل في تحميل ملف PDF" });
    }
  });

  app.get("/api/quotes/:id/pdf", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "معرف عرض السعر غير صالح" });
      }
      
      const [quote] = await db.select().from(quotes).where(eq(quotes.id, id));
      if (!quote) {
        return res.status(404).json({ error: "عرض السعر غير موجود" });
      }
      
      const pdfBuffer = await generateQuotePdfBuffer(id);
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", pdfBuffer.length);
      res.setHeader("Content-Disposition", `attachment; filename="quote_${quote.document_number}.pdf"`);
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating quote PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "فشل في إنشاء ملف PDF" });
      }
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

  // ===== تحويل الصوت إلى نص باستخدام Whisper =====
  app.post("/api/ai-agent/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
    const file = req.file;
    const filePath = file?.path;
    
    const cleanupFile = () => {
      if (filePath && fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (e) {
          console.error("Failed to cleanup temp audio file:", e);
        }
      }
    };
    
    try {
      if (!file) {
        return res.status(400).json({ error: "لم يتم رفع ملف صوتي" });
      }

      // التحقق من أن الملف صوتي
      const audioTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm", "audio/m4a", "video/webm", "video/mp4"];
      if (!audioTypes.includes(file.mimetype)) {
        cleanupFile();
        return res.status(400).json({ error: "نوع الملف غير مدعوم. يرجى رفع ملف صوتي" });
      }

      console.log(`Transcribing audio file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size}`);

      // استخدام OpenAI Whisper لتحويل الصوت إلى نص
      const audioBuffer = fs.readFileSync(filePath!);
      const audioFile = new File([audioBuffer], file.originalname, { type: file.mimetype });
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "ar", // اللغة العربية افتراضياً
        response_format: "text"
      });

      cleanupFile();

      console.log(`Transcription successful: ${transcription.substring(0, 100)}...`);

      res.json({
        success: true,
        text: transcription,
        filename: file.originalname,
        duration_hint: "تم تحويل الصوت بنجاح"
      });
    } catch (error: any) {
      cleanupFile();
      console.error("Audio transcription error:", error);
      res.status(500).json({ 
        error: "فشل في تحويل الصوت إلى نص",
        details: error.message || "خطأ غير معروف"
      });
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
