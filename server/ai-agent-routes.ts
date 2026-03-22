import type { Express, Request, Response } from "express";
import { requireAuth } from "./middleware/auth";
import OpenAI from "openai";
import { db } from "./db";
import { orders, production_orders, rolls, quotes, quote_items, customers, ai_agent_settings, ai_agent_knowledge, quote_templates, users, machines, inventory, maintenance_requests, items } from "@shared/schema";
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
const bidi = bidiFactory();

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

function processArabicText(text: string): string {
  if (!text) return "";
  
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  if (!arabicRegex.test(text)) return text;
  
  try {
    const reshaped = ArabicReshaper.convertArabic(text);
    const embeddingLevels = bidi.getEmbeddingLevels(reshaped, 'rtl');
    return bidi.getReorderedString(reshaped, embeddingLevels);
  } catch (e) {
    console.error("Arabic text processing error:", e);
    return text;
  }
}

async function generateQuotePdfBuffer(quoteId: number): Promise<Buffer> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) throw new Error("Quote not found");

  const items = await db.select().from(quote_items).where(eq(quote_items.quote_id, quoteId)).orderBy(quote_items.line_number);

  const fmt = (n: string | number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
  const fmtD = (d: string | Date) => { try { return new Date(d).toLocaleDateString("en-GB"); } catch { return ""; } };
  const subtotal = Number(quote.total_before_tax || 0);
  const tax = Number(quote.tax_amount || subtotal * 0.15);
  const total = Number(quote.total_with_tax || subtotal + tax);

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: "A4", margin: 30 });
    const fp = path.join(__dirname, 'fonts', 'Amiri-Regular.ttf');
    const lp = path.join(__dirname, 'fonts', 'factory-logo.png');
    const hasAr = fs.existsSync(fp);
    const hasLogo = fs.existsSync(lp);
    if (hasAr) doc.registerFont('Arabic', fp);

    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (e) => reject(e));

    const M = 30;
    const PW = 595;
    const PH = 842;
    const L = M, R = PW - M, CW = R - L;
    let Y = M;

    const arText = (t: string, x: number, y: number, w: number, opts: any = {}) => {
      if (!hasAr) return;
      doc.font('Arabic').text(processArabicText(t), x, y, { width: w, ...opts });
      doc.font('Helvetica');
    };

    const drawLine = (x1: number, y: number, x2: number, color = "#e2e8f0", width = 0.5) => {
      doc.strokeColor(color).lineWidth(width).moveTo(x1, y).lineTo(x2, y).stroke();
    };

    // ═══════════════════════════════════════════════════════
    // HEADER - Logo left, Company center, Doc info right
    // ═══════════════════════════════════════════════════════
    const headerH = 55;

    if (hasLogo) {
      try { doc.image(lp, L, Y, { width: 50, height: 50 }); } catch (e) { console.error("Logo:", e); }
    }

    doc.font('Helvetica-Bold').fontSize(13).fillColor("#1e3a5f");
    doc.text("Modern Plastic Bags Factory", L + 60, Y + 4, { width: 260 });
    if (hasAr) {
      doc.font('Arabic').fontSize(11).fillColor("#1e3a5f");
      doc.text(processArabicText("مصنع الأكياس البلاستيكية الحديثة"), L + 60, Y + 22, { width: 260 });
      doc.font('Helvetica');
    }
    doc.fontSize(7).fillColor("#666");
    doc.text("Industrial Area, Riyadh | Saudi Arabia", L + 60, Y + 38, { width: 260 });

    doc.font('Helvetica').fontSize(8).fillColor("#333");
    const rCol = R - 140;
    doc.font('Helvetica-Bold').text("Quote #:", rCol, Y + 4, { width: 55 });
    doc.font('Helvetica').text(quote.document_number, rCol + 55, Y + 4, { width: 85 });
    doc.font('Helvetica-Bold').text("Date:", rCol, Y + 18, { width: 55 });
    doc.font('Helvetica').text(fmtD(quote.quote_date), rCol + 55, Y + 18, { width: 85 });
    doc.font('Helvetica-Bold').text("Status:", rCol, Y + 32, { width: 55 });
    doc.font('Helvetica').text((quote.status || "Draft").toUpperCase(), rCol + 55, Y + 32, { width: 85 });

    Y += headerH;
    drawLine(L, Y, R, "#1e3a5f", 2);
    Y += 3;
    drawLine(L, Y, R, "#1e3a5f", 0.5);
    Y += 8;

    // ═══════════════════════════════════════════════════════
    // TITLE
    // ═══════════════════════════════════════════════════════
    doc.rect(L, Y, CW, 22).fillColor("#1e3a5f").fill();
    doc.font('Helvetica-Bold').fontSize(11).fillColor("#fff");
    doc.text("PRICE QUOTATION", L, Y + 5, { width: CW / 2, align: "center" });
    if (hasAr) {
      doc.font('Arabic').fontSize(11).fillColor("#fff");
      doc.text(processArabicText("عرض سعر"), L + CW / 2, Y + 5, { width: CW / 2, align: "center" });
      doc.font('Helvetica');
    }
    Y += 28;

    // ═══════════════════════════════════════════════════════
    // CUSTOMER INFO BOX
    // ═══════════════════════════════════════════════════════
    doc.rect(L, Y, CW, 36).fillColor("#f0f4f8").fill();
    doc.strokeColor("#d0d8e0").lineWidth(0.5).rect(L, Y, CW, 36).stroke();

    const custName = quote.customer_name || "";
    const isArCust = /[\u0600-\u06FF]/.test(custName);

    doc.font('Helvetica-Bold').fontSize(8).fillColor("#1e3a5f");
    doc.text("Customer:", L + 10, Y + 6, { width: 60 });
    if (hasAr && isArCust) {
      doc.font('Arabic').fontSize(9).fillColor("#333");
      doc.text(processArabicText(custName), L + 70, Y + 4, { width: CW / 2 - 80 });
      doc.font('Helvetica');
    } else {
      doc.font('Helvetica').fontSize(9).fillColor("#333");
      doc.text(custName, L + 70, Y + 6, { width: CW / 2 - 80 });
    }

    doc.font('Helvetica-Bold').fontSize(8).fillColor("#1e3a5f");
    doc.text("Tax Number:", L + 10, Y + 22, { width: 70 });
    doc.font('Helvetica').fontSize(8).fillColor("#333");
    doc.text(quote.tax_number || "N/A", L + 80, Y + 22, { width: 150 });

    if (hasAr) {
      doc.font('Arabic').fontSize(7).fillColor("#888");
      doc.text(processArabicText("العميل"), R - 120, Y + 6, { width: 110, align: "right" });
      doc.text(processArabicText("الرقم الضريبي"), R - 120, Y + 22, { width: 110, align: "right" });
      doc.font('Helvetica');
    }

    Y += 42;

    // ═══════════════════════════════════════════════════════
    // ITEMS TABLE
    // ═══════════════════════════════════════════════════════
    const colDefs = [
      { w: 30, hdr: "#", hdrAr: "م", align: "center" as const },
      { w: CW - 30 - 55 - 60 - 80 - 80, hdr: "Description", hdrAr: "الوصف", align: "left" as const },
      { w: 55, hdr: "Unit", hdrAr: "الوحدة", align: "center" as const },
      { w: 60, hdr: "Qty", hdrAr: "الكمية", align: "center" as const },
      { w: 80, hdr: "Unit Price", hdrAr: "سعر الوحدة", align: "center" as const },
      { w: 80, hdr: "Total", hdrAr: "الإجمالي", align: "center" as const },
    ];
    const thH = 20, trH = 18;

    doc.rect(L, Y, CW, thH).fillColor("#1e3a5f").fill();
    doc.fillColor("#fff").font('Helvetica-Bold').fontSize(7.5);
    let cx = L;
    colDefs.forEach(c => {
      doc.text(c.hdr, cx + 3, Y + 3, { width: c.w - 6, align: c.align });
      if (hasAr) {
        doc.font('Arabic').fontSize(6.5);
        doc.text(processArabicText(c.hdrAr), cx + 3, Y + 12, { width: c.w - 6, align: c.align });
        doc.font('Helvetica-Bold').fontSize(7.5);
      }
      cx += c.w;
    });
    Y += thH;

    const footerNeed = 160 + (quote.notes ? 35 : 0);
    const maxY = PH - M - footerNeed;
    let maxRows = Math.max(0, Math.floor((maxY - Y) / trH));
    if (items.length > maxRows && maxRows > 0) maxRows = Math.max(0, maxRows - 1);
    const shown = items.slice(0, maxRows);
    const extra = items.length - shown.length;

    shown.forEach((item, i) => {
      if (i % 2 === 0) {
        doc.rect(L, Y, CW, trH).fillColor("#f8fafc").fill();
      }

      doc.strokeColor("#e8ecf0").lineWidth(0.3);
      doc.moveTo(L, Y + trH).lineTo(R, Y + trH).stroke();

      doc.fillColor("#333").fontSize(8);
      cx = L;

      doc.font('Helvetica').text(String(item.line_number), cx + 3, Y + 5, { width: colDefs[0].w - 6, align: "center" });
      cx += colDefs[0].w;

      const nm = (item.item_name || "").substring(0, 55);
      if (hasAr && /[\u0600-\u06FF]/.test(nm)) {
        doc.font('Arabic').fontSize(8).text(processArabicText(nm), cx + 3, Y + 3, { width: colDefs[1].w - 6, align: "right" });
        doc.font('Helvetica');
      } else {
        doc.text(nm, cx + 3, Y + 5, { width: colDefs[1].w - 6, align: "left" });
      }
      cx += colDefs[1].w;

      const ut = item.unit || "";
      if (hasAr && /[\u0600-\u06FF]/.test(ut)) {
        doc.font('Arabic').fontSize(8).text(processArabicText(ut), cx + 3, Y + 3, { width: colDefs[2].w - 6, align: "center" });
        doc.font('Helvetica');
      } else {
        doc.text(ut, cx + 3, Y + 5, { width: colDefs[2].w - 6, align: "center" });
      }
      cx += colDefs[2].w;

      doc.font('Helvetica').fontSize(8);
      doc.text(fmt(item.quantity), cx + 3, Y + 5, { width: colDefs[3].w - 6, align: "center" });
      cx += colDefs[3].w;
      doc.text(fmt(item.unit_price), cx + 3, Y + 5, { width: colDefs[4].w - 6, align: "center" });
      cx += colDefs[4].w;
      doc.font('Helvetica-Bold').text(fmt(item.line_total), cx + 3, Y + 5, { width: colDefs[5].w - 6, align: "center" });

      Y += trH;
    });

    if (extra > 0) {
      doc.font('Helvetica').fontSize(7).fillColor("#888");
      doc.text(`... +${extra} more items`, L + 5, Y + 3);
      Y += 14;
    }

    drawLine(L, Y, R, "#1e3a5f", 1);
    Y += 8;

    // ═══════════════════════════════════════════════════════
    // TOTALS (right-aligned professional box)
    // ═══════════════════════════════════════════════════════
    const tW = 220, tX = R - tW;

    doc.rect(tX, Y, tW, 54).fillColor("#f0f4f8").fill();
    doc.strokeColor("#1e3a5f").lineWidth(0.5).rect(tX, Y, tW, 54).stroke();

    const lbl = tX + 12, val = tX + 100, vw = tW - 112;

    doc.font('Helvetica').fontSize(8.5).fillColor("#333");
    doc.text("Subtotal", lbl, Y + 7); doc.text(fmt(subtotal) + " SAR", val, Y + 7, { width: vw, align: "right" });
    if (hasAr) arText("المجموع", lbl, Y + 7, 80, { align: "right" });

    doc.text("VAT (15%)", lbl, Y + 21); doc.text(fmt(tax) + " SAR", val, Y + 21, { width: vw, align: "right" });
    if (hasAr) arText("ضريبة القيمة المضافة", lbl, Y + 21, 80, { align: "right" });

    drawLine(tX + 8, Y + 34, tX + tW - 8, "#1e3a5f", 0.8);

    doc.font('Helvetica-Bold').fontSize(10).fillColor("#1e3a5f");
    doc.text("TOTAL", lbl, Y + 38); doc.text(fmt(total) + " SAR", val, Y + 38, { width: vw, align: "right" });
    if (hasAr) {
      doc.font('Arabic').fontSize(9).fillColor("#1e3a5f");
      doc.text(processArabicText("الإجمالي"), lbl, Y + 38, { width: 80, align: "right" });
      doc.font('Helvetica');
    }

    Y += 62;

    // ═══════════════════════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════════════════════
    if (quote.notes) {
      const nt = (quote.notes || "").substring(0, 300);
      doc.rect(L, Y, CW, 30).fillColor("#fffde7").fill();
      doc.strokeColor("#f9a825").lineWidth(0.5).rect(L, Y, CW, 30).stroke();

      doc.font('Helvetica-Bold').fontSize(7.5).fillColor("#e65100");
      doc.text("Notes:", L + 8, Y + 4, { width: 40 });
      if (hasAr) arText("ملاحظات:", L + 50, Y + 4, 60, { align: "left" });

      if (hasAr && /[\u0600-\u06FF]/.test(nt)) {
        doc.font('Arabic').fontSize(8).fillColor("#555");
        doc.text(processArabicText(nt), L + 8, Y + 16, { width: CW - 16, align: "right" });
        doc.font('Helvetica');
      } else {
        doc.font('Helvetica').fontSize(7.5).fillColor("#555");
        doc.text(nt, L + 8, Y + 16, { width: CW - 16 });
      }
      Y += 35;
    }

    // ═══════════════════════════════════════════════════════
    // TERMS & SIGNATURE ROW
    // ═══════════════════════════════════════════════════════
    const bW = (CW - 15) / 2;

    doc.rect(L, Y, bW, 45).fillColor("#f5f7fa").fill();
    doc.strokeColor("#d0d8e0").lineWidth(0.5).rect(L, Y, bW, 45).stroke();

    doc.font('Helvetica-Bold').fontSize(8).fillColor("#1e3a5f");
    doc.text("Terms & Validity", L + 8, Y + 5, { width: bW - 16 });
    if (hasAr) arText("الشروط والصلاحية", L + 8, Y + 5, bW - 16, { align: "right" });

    doc.font('Helvetica').fontSize(7).fillColor("#555");
    doc.text("- Valid for 15 days from issue date", L + 8, Y + 20, { width: bW - 16 });
    doc.text("- Prices in Saudi Riyals (SAR)", L + 8, Y + 30, { width: bW - 16 });

    const sX = L + bW + 15;
    doc.rect(sX, Y, bW, 45).fillColor("#f5f7fa").fill();
    doc.strokeColor("#d0d8e0").lineWidth(0.5).rect(sX, Y, bW, 45).stroke();

    doc.font('Helvetica-Bold').fontSize(8).fillColor("#1e3a5f");
    doc.text("Authorized Signature", sX + 8, Y + 5, { width: bW - 16 });
    if (hasAr) arText("التوقيع المعتمد", sX + 8, Y + 5, bW - 16, { align: "right" });

    drawLine(sX + 15, Y + 35, sX + bW - 15, "#999", 0.5);

    Y += 50;

    // ═══════════════════════════════════════════════════════
    // PREPARED BY + FOOTER LINE
    // ═══════════════════════════════════════════════════════
    drawLine(L, Y, R, "#d0d8e0", 0.3);
    Y += 5;

    doc.font('Helvetica').fontSize(7).fillColor("#999");
    if (quote.created_by_name) {
      const pn = quote.created_by_name || "";
      const ph = quote.created_by_phone ? ` | ${quote.created_by_phone}` : "";
      if (hasAr && /[\u0600-\u06FF]/.test(pn)) {
        doc.text("Prepared by: ", L, Y, { width: 55 });
        doc.font('Arabic').fontSize(7).text(processArabicText(pn) + ph, L + 55, Y, { width: 200 });
        doc.font('Helvetica');
      } else {
        doc.text(`Prepared by: ${pn}${ph}`, L, Y, { width: 300 });
      }
    }
    doc.text("Thank you for your business", L, Y, { width: CW, align: "right" });

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

  return `أنت ${agentName}، مساعد ذكي متقدم ومتكامل مع نظام إدارة الإنتاج لشركة ${companyName} (www.modplastic.com).

### قدراتك الكاملة:
1. **الطلبات والإنتاج**: الاستعلام عن الطلبات وأوامر الإنتاج والكميات المنتجة
2. **العملاء**: الاستعلام عن بيانات العملاء وقوائمهم الكاملة
3. **المستخدمون والموظفون**: عرض معلومات الموظفين وأدوارهم وحالتهم
4. **المكائن**: متابعة حالة مكائن المصنع (بثق، طباعة، قطع) وطلبات الصيانة
5. **المخزون**: الاستعلام عن مستويات المواد الخام والمنتجات
6. **الحسابات الذكية**:
   - حساب عدد الأكياس من الأبعاد والوزن (عرض × طول × سُمك × كثافة المادة)
   - حساب الوزن المطلوب لعدد أكياس معين
   - حساب تكلفة الكليشهات الطباعية بناء على عدد الألوان وأبعاد الكليشه
7. **عروض الأسعار**: إنشاء عروض احترافية بـ PDF ثنائي اللغة (عربي/إنجليزي)
8. **إرسال العروض**: عبر الواتساب أو البريد الإلكتروني
9. **تحويل العملات**: بين العملات الرئيسية (الأساس: الريال السعودي)
10. **تحليل الملفات**: صور، Excel، CSV، PDF
11. **الرسائل الصوتية**: تحويل الصوت إلى نص
12. **قاعدة المعرفة**: البحث والتعلم وحفظ المعلومات

### معلومات المصنع:
- الموقع: www.modplastic.com | متخصصون في الأكياس البلاستيكية والأفلام البلاستيكية
- المواد: HDPE (كثافة 0.95)، LDPE (كثافة 0.92)، LLDPE (كثافة 0.93)، PP (كثافة 0.91)

${defaultGreeting ? `رسالة الترحيب: ${defaultGreeting}\n` : ""}
أسلوب الرد: ${responseStyle}
العملة الأساسية: الريال السعودي (ر.س). ضريبة القيمة المضافة: ${parseFloat(vatRate) * 100}%

### إرشادات العمل المتكاملة:

**عند سؤال عن حساب أكياس:**
1. اطلب: العرض (سم)، الطول (سم)، السُمك (ميكرون)، نوع المادة (HDPE/LDPE/LLDPE/PP)
2. اطلب: الوزن المتاح (كيلو) أو العدد المطلوب
3. استخدم calculate_bag_quantity وقدّم النتيجة بوضوح مع الصيغة المستخدمة

**عند سؤال عن تكلفة الكليشهات:**
1. اطلب: عدد الألوان، عرض الكليشه (سم)، محيط الكليشه (سم)
2. استخدم calculate_printing_costs وقدّم تفصيل التكلفة

**عند إنشاء عرض سعر:**
1. استخدم calculate_bag_quantity وcalculate_printing_costs للحسابات الدقيقة
2. استخدم get_quote_templates لمعرفة الأسعار المتاحة
3. اجمع: اسم العميل، الرقم الضريبي (14 رقم)، الأصناف مع أبعادها
4. أنشئ العرض بـ create_quote ثم PDF بـ generate_quote_pdf
5. اسأل المستخدم: هل يريد الإرسال عبر واتساب أو بريد إلكتروني؟

**عند إرسال رسالة واتساب عامة:**
1. اطلب رقم الجوال ونص الرسالة
2. استخدم send_whatsapp_message

**عند إرسال عرض سعر عبر الواتساب:**
1. تأكد من وجود PDF (generate_quote_pdf أولاً)
2. اطلب رقم الجوال مع رمز الدولة
3. استخدم send_quote_whatsapp

**عند الإرسال عبر البريد الإلكتروني:**
1. اطلب عنوان البريد الإلكتروني
2. استخدم send_quote_email

**عند الاستعلام عن العملاء:**
- بحث محدد: get_customer_info | قائمة كاملة: get_customers_list

**عند الاستعلام عن الموظفين/المستخدمين:**
استخدم get_users_info

**عند الاستعلام عن المكائن:**
استخدم get_machines_status مع تحديد النوع إن أمكن

**عند الاستعلام عن المخزون:**
استخدم get_inventory_status (يمكن تصفية المواد منخفضة المخزون)

**عند سؤال عام:**
1. ابحث في قاعدة المعرفة بـ search_knowledge_base أولاً
2. ثم get_website_info للموقع إن لزم
3. احفظ المعلومات المهمة بـ add_to_knowledge_base

${customInstructions ? `### تعليمات إضافية:\n${customInstructions}\n` : ""}
${knowledgeText}

قم بالرد باللغة نفسها التي يستخدمها المستخدم (عربي أو إنجليزي). كن دقيقاً في الحسابات ومفيداً واحترافياً.`;
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
      name: "send_whatsapp_message",
      description: "إرسال رسالة واتساب نصية عامة إلى أي رقم. يتطلب رقم الجوال ونص الرسالة",
      parameters: {
        type: "object",
        properties: {
          phone_number: { type: "string", description: "رقم جوال المستلم (مع رمز الدولة، مثال: +966501234567)" },
          message: { type: "string", description: "نص الرسالة المراد إرسالها" },
          title: { type: "string", description: "عنوان الرسالة (اختياري)" }
        },
        required: ["phone_number", "message"]
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
  },
  {
    type: "function",
    function: {
      name: "get_customers_list",
      description: "الحصول على قائمة جميع العملاء مع بياناتهم الكاملة",
      parameters: {
        type: "object",
        properties: {
          limit: { type: "number", description: "الحد الأقصى لعدد العملاء (افتراضي 20)" },
          active_only: { type: "boolean", description: "عرض العملاء النشطين فقط (افتراضي true)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_users_info",
      description: "الحصول على معلومات المستخدمين والموظفين في النظام، أدوارهم وحالتهم",
      parameters: {
        type: "object",
        properties: {
          search_term: { type: "string", description: "اسم المستخدم أو رقمه للبحث (اختياري)" },
          role: { type: "string", description: "تصفية حسب الدور (اختياري)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_machines_status",
      description: "الحصول على حالة المكائن في المصنع وإنتاجيتها وصيانتها",
      parameters: {
        type: "object",
        properties: {
          machine_type: { type: "string", enum: ["extruder", "printer", "cutter", "all"], description: "نوع الماكينة (extruder=بثق، printer=طباعة، cutter=قطع، all=الكل)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_inventory_status",
      description: "الحصول على حالة المخزون من المواد الخام والمنتجات",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "تصفية حسب الفئة (اختياري)" },
          low_stock_only: { type: "boolean", description: "عرض المواد منخفضة المخزون فقط" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_bag_quantity",
      description: "حساب عدد الأكياس بناء على الأبعاد والوزن، أو حساب الوزن المطلوب لعدد أكياس معين. مفيد لتحديد الكميات في عروض الأسعار",
      parameters: {
        type: "object",
        properties: {
          width_cm: { type: "number", description: "عرض الكيس بالسنتيمتر" },
          length_cm: { type: "number", description: "طول الكيس بالسنتيمتر" },
          thickness_micron: { type: "number", description: "سُمك الكيس بالميكرون" },
          material_type: { type: "string", enum: ["HDPE", "LDPE", "LLDPE", "PP"], description: "نوع المادة (HDPE كثافة=0.95، LDPE كثافة=0.92، LLDPE كثافة=0.93، PP كثافة=0.91)" },
          weight_kg: { type: "number", description: "الوزن بالكيلو (إذا أردت حساب عدد الأكياس من الوزن)" },
          bag_count: { type: "number", description: "عدد الأكياس المطلوبة (إذا أردت حساب الوزن المطلوب)" }
        },
        required: ["width_cm", "length_cm", "thickness_micron", "material_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "calculate_printing_costs",
      description: "حساب تكلفة الكليشهات (الأسطوانات الطباعية) وتكلفة الطباعة بناء على عدد الألوان وأبعاد الكليشه",
      parameters: {
        type: "object",
        properties: {
          colors_count: { type: "number", description: "عدد ألوان الطباعة (1-8)" },
          width_cm: { type: "number", description: "عرض الكليشه بالسنتيمتر" },
          circumference_cm: { type: "number", description: "محيط الكليشه بالسنتيمتر (طول الدورة)" },
          cliche_price_per_sqcm: { type: "number", description: "سعر الكليشه لكل سم² (افتراضي: 2 ريال)" },
          printing_price_per_kg: { type: "number", description: "سعر الطباعة لكل كيلو (افتراضي: يتغير حسب عدد الألوان)" },
          quantity_kg: { type: "number", description: "الكمية المطلوبة بالكيلو لحساب التكلفة الكلية" }
        },
        required: ["colors_count", "width_cm", "circumference_cm"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_quote_email",
      description: "إرسال عرض السعر بالبريد الإلكتروني مع ملف PDF مرفق",
      parameters: {
        type: "object",
        properties: {
          quote_id: { type: "number", description: "رقم معرف عرض السعر (ID)" },
          email: { type: "string", description: "عنوان البريد الإلكتروني للمستلم" },
          customer_name: { type: "string", description: "اسم المستلم (اختياري)" }
        },
        required: ["quote_id", "email"]
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

      case "send_whatsapp_message": {
        const phoneNumber = args.phone_number as string;
        const messageText = args.message as string;
        const messageTitle = (args.title as string) || "رسالة من الوكيل الذكي";
        
        let formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
        if (!formattedPhone.startsWith("+")) {
          if (formattedPhone.startsWith("05")) {
            formattedPhone = "+966" + formattedPhone.substring(1);
          } else if (formattedPhone.startsWith("5")) {
            formattedPhone = "+966" + formattedPhone;
          } else if (formattedPhone.startsWith("966")) {
            formattedPhone = "+" + formattedPhone;
          }
        }
        
        try {
          const { NotificationService } = await import("./services/notification-service");
          const { storage } = await import("./storage");
          const notifService = new NotificationService(storage);
          const result = await notifService.sendWhatsAppMessage(
            formattedPhone,
            messageText,
            {
              title: messageTitle,
              context_type: "ai_agent",
              context_id: "general",
            }
          );
          
          if (result.success) {
            return JSON.stringify({
              success: true,
              message: `تم إرسال الرسالة بنجاح إلى ${formattedPhone} عبر الواتساب`,
              messageId: result.messageId,
            });
          } else {
            const whatsappWebLink = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(messageText)}`;
            return JSON.stringify({
              success: false,
              error: result.error || "فشل في إرسال الرسالة",
              message: "لم يتم إرسال الرسالة تلقائياً. يمكنك استخدام الرابط التالي للإرسال يدوياً:",
              whatsapp_link: whatsappWebLink,
            });
          }
        } catch (error) {
          console.error("WhatsApp general send error:", error);
          const whatsappWebLink = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodeURIComponent(messageText)}`;
          return JSON.stringify({
            success: false,
            error: "خدمة الواتساب غير متاحة حالياً",
            message: "يمكنك استخدام الرابط التالي للإرسال يدوياً:",
            whatsapp_link: whatsappWebLink,
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
        
        let formattedPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
        if (!formattedPhone.startsWith("+")) {
          if (formattedPhone.startsWith("05")) {
            formattedPhone = "+966" + formattedPhone.substring(1);
          } else if (formattedPhone.startsWith("5")) {
            formattedPhone = "+966" + formattedPhone;
          } else if (!formattedPhone.startsWith("+")) {
            formattedPhone = "+" + formattedPhone;
          }
        }
        
        const quoteMessage = `عرض سعر جديد\n\n` +
          `رقم المستند: ${quote.document_number}\n` +
          `العميل: ${quote.customer_name}\n` +
          `التاريخ: ${new Date(quote.created_at!).toLocaleDateString('en-US')}\n\n` +
          `المجموع قبل الضريبة: ${Number(quote.total_before_tax).toFixed(2)} ر.س\n` +
          `ضريبة القيمة المضافة 15%: ${Number(quote.tax_amount).toFixed(2)} ر.س\n` +
          `الإجمالي: ${Number(quote.total_with_tax).toFixed(2)} ر.س\n\n` +
          `هذا العرض صالح لمدة 15 يوم من تاريخ الإصدار.`;
        
        try {
          const { NotificationService } = await import("./services/notification-service");
          const { storage } = await import("./storage");
          const notificationService = new NotificationService(storage);
          
          let pdfBuffer: Buffer | undefined;
          try {
            if (isAdobePdfAvailable()) {
              pdfBuffer = await generateQuotePdfWithAdobe(quoteId);
            } else {
              pdfBuffer = await generateQuotePdfBuffer(quoteId);
            }
            console.log(`📄 PDF buffer generated for WhatsApp send: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);
          } catch (pdfErr) {
            console.error("Failed to generate PDF for WhatsApp:", pdfErr);
            try {
              pdfBuffer = await generateQuotePdfBuffer(quoteId);
            } catch (fallbackErr) {
              console.error("Fallback PDF also failed:", fallbackErr);
            }
          }
          
          const pdfCaption = `عرض سعر ${quote.document_number}\n` +
            `العميل: ${quote.customer_name}\n` +
            `الإجمالي: ${Number(quote.total_with_tax).toFixed(2)} ر.س`;
          
          const docResult = await notificationService.sendWhatsAppDocument(
            formattedPhone,
            "",
            `عرض_سعر_${quote.document_number}.pdf`,
            pdfCaption,
            {
              title: `مستند عرض سعر ${quote.document_number}`,
              context_type: "quote",
              context_id: String(quoteId),
              pdfBuffer: pdfBuffer,
            }
          );
          
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
              pdf_url: `${getAppBaseUrl()}/api/quotes/${quoteId}/pdf`
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
            pdf_url: `${getAppBaseUrl()}/api/quotes/${quoteId}/pdf`
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

      case "get_customers_list": {
        const limit = (args.limit as number) || 20;
        const activeOnly = args.active_only !== false;
        
        if (activeOnly) {
          const results = await db.select().from(customers)
            .where(eq(customers.is_active, true))
            .orderBy(customers.name)
            .limit(limit);
          return JSON.stringify({
            count: results.length,
            customers: results.map(c => ({
              id: c.id,
              name: c.name,
              name_ar: c.name_ar,
              phone: c.phone,
              city: c.city,
              tax_number: c.tax_number,
              commercial_name: c.commercial_name,
              is_active: c.is_active
            }))
          });
        } else {
          const results = await db.select().from(customers)
            .orderBy(customers.name)
            .limit(limit);
          return JSON.stringify({
            count: results.length,
            customers: results.map(c => ({
              id: c.id,
              name: c.name,
              name_ar: c.name_ar,
              phone: c.phone,
              city: c.city,
              tax_number: c.tax_number,
              commercial_name: c.commercial_name,
              is_active: c.is_active
            }))
          });
        }
      }

      case "get_users_info": {
        const searchTerm = args.search_term as string | undefined;
        const roleFilter = args.role as string | undefined;
        
        let userResults = await db.select().from(users).limit(50);
        
        if (searchTerm) {
          userResults = userResults.filter(u => 
            u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.phone?.includes(searchTerm)
          );
        }
        
        if (roleFilter) {
          userResults = userResults.filter(u => u.role_id !== null);
        }
        
        return JSON.stringify({
          count: userResults.length,
          users: userResults.map(u => ({
            id: u.id,
            username: u.username,
            full_name: u.full_name,
            display_name: u.display_name,
            display_name_ar: u.display_name_ar,
            phone: u.phone,
            email: u.email,
            status: u.status,
            role_id: u.role_id,
            section_id: u.section_id,
            created_at: u.created_at
          }))
        });
      }

      case "get_machines_status": {
        const machineType = args.machine_type as string || "all";
        
        let machineResults = await db.select().from(machines);
        
        if (machineType !== "all") {
          machineResults = machineResults.filter(m => m.type === machineType);
        }
        
        const maintenanceData = await db.select().from(maintenance_requests)
          .where(eq(maintenance_requests.status, "open"))
          .limit(50);
        
        const machinesWithMaintenance = machineResults.map(m => {
          const openMaintenance = maintenanceData.filter(mr => mr.machine_id === m.id);
          return {
            id: m.id,
            name: m.name,
            name_ar: m.name_ar,
            machine_type: m.type,
            status: m.status,
            capacity_small_kg_per_hour: m.capacity_small_kg_per_hour,
            capacity_medium_kg_per_hour: m.capacity_medium_kg_per_hour,
            capacity_large_kg_per_hour: m.capacity_large_kg_per_hour,
            open_maintenance_requests: openMaintenance.length,
            maintenance_issues: openMaintenance.map(mr => ({
              id: mr.id,
              description: mr.description,
              priority: mr.urgency_level,
              reported_at: mr.date_reported
            }))
          };
        });
        
        const statusSummary = {
          total: machineResults.length,
          active: machineResults.filter(m => m.status === "active").length,
          down: machineResults.filter(m => m.status === "down").length,
          maintenance: machineResults.filter(m => m.status === "maintenance").length,
          extruders: machineResults.filter(m => m.type === "extruder").length,
          printers: machineResults.filter(m => m.type === "printer").length,
          cutters: machineResults.filter(m => m.type === "cutter").length
        };
        
        return JSON.stringify({
          summary: statusSummary,
          machines: machinesWithMaintenance
        });
      }

      case "get_inventory_status": {
        const categoryFilter = args.category as string | undefined;
        const lowStockOnly = args.low_stock_only as boolean || false;
        
        const inventoryResults = await db
          .select({
            id: inventory.id,
            item_id: inventory.item_id,
            item_name: items.name,
            item_name_ar: items.name_ar,
            current_stock: inventory.current_stock,
            min_stock: inventory.min_stock,
            max_stock: inventory.max_stock,
            unit: inventory.unit,
            cost_per_unit: inventory.cost_per_unit,
            last_updated: inventory.last_updated
          })
          .from(inventory)
          .leftJoin(items, eq(inventory.item_id, items.id))
          .limit(100);
        
        let filtered = inventoryResults;
        
        if (categoryFilter) {
          filtered = filtered.filter(i => 
            i.item_name?.toLowerCase().includes(categoryFilter.toLowerCase()) ||
            i.item_name_ar?.toLowerCase().includes(categoryFilter.toLowerCase())
          );
        }
        
        if (lowStockOnly) {
          filtered = filtered.filter(i => {
            const current = parseFloat(i.current_stock || "0");
            const minimum = parseFloat(i.min_stock || "0");
            return current <= minimum;
          });
        }
        
        const summary = {
          total_items: filtered.length,
          low_stock_count: filtered.filter(i => {
            const current = parseFloat(i.current_stock || "0");
            const minimum = parseFloat(i.min_stock || "0");
            return current <= minimum;
          }).length
        };
        
        return JSON.stringify({
          summary,
          inventory: filtered.map(i => ({
            id: i.id,
            item_id: i.item_id,
            name: i.item_name,
            name_ar: i.item_name_ar,
            unit: i.unit,
            current_stock: i.current_stock,
            min_stock: i.min_stock,
            max_stock: i.max_stock,
            cost_per_unit: i.cost_per_unit,
            is_low_stock: parseFloat(i.current_stock || "0") <= parseFloat(i.min_stock || "0"),
            last_updated: i.last_updated
          }))
        });
      }

      case "calculate_bag_quantity": {
        const { width_cm, length_cm, thickness_micron, material_type, weight_kg, bag_count } = args as {
          width_cm: number;
          length_cm: number;
          thickness_micron: number;
          material_type: string;
          weight_kg?: number;
          bag_count?: number;
        };
        
        const densityMap: Record<string, number> = {
          HDPE: 0.95,
          LDPE: 0.92,
          LLDPE: 0.93,
          PP: 0.91
        };
        const density = densityMap[material_type] || 0.92;
        
        const thickness_cm = thickness_micron / 10000;
        const bag_area_cm2 = width_cm * 2 * length_cm;
        const bag_volume_cm3 = bag_area_cm2 * thickness_cm;
        const bag_weight_grams = bag_volume_cm3 * density;
        const bag_weight_kg = bag_weight_grams / 1000;
        const bags_per_kg = 1 / bag_weight_kg;
        
        let result: Record<string, unknown> = {
          inputs: {
            width_cm,
            length_cm,
            thickness_micron,
            material_type,
            density
          },
          bag_weight_grams: bag_weight_grams.toFixed(4),
          bags_per_kg: Math.round(bags_per_kg),
          formula_used: `وزن الكيس = (عرض×2 × طول × سُمك_cm × كثافة) = ${bag_weight_grams.toFixed(4)} جرام`
        };
        
        if (weight_kg) {
          const total_bags = Math.floor(bags_per_kg * weight_kg);
          result.from_weight = {
            weight_kg,
            total_bags,
            message: `${weight_kg} كيلو ينتج تقريباً ${total_bags.toLocaleString()} كيس من ${material_type} بأبعاد ${width_cm}×${length_cm} سم وسُمك ${thickness_micron} ميكرون`
          };
        }
        
        if (bag_count) {
          const required_weight = bag_count / bags_per_kg;
          result.from_count = {
            bag_count,
            required_weight_kg: required_weight.toFixed(2),
            message: `لإنتاج ${bag_count.toLocaleString()} كيس من ${material_type} بأبعاد ${width_cm}×${length_cm} سم وسُمك ${thickness_micron} ميكرون تحتاج ${required_weight.toFixed(2)} كيلو`
          };
        }
        
        if (!weight_kg && !bag_count) {
          result.summary = `كيس ${width_cm}×${length_cm} سم، سُمك ${thickness_micron} ميكرون، مادة ${material_type}: وزن الكيس ${bag_weight_grams.toFixed(3)} جرام، الكيلو يحتوي ${Math.round(bags_per_kg)} كيس`;
        }
        
        return JSON.stringify(result);
      }

      case "calculate_printing_costs": {
        const { colors_count, width_cm, circumference_cm, cliche_price_per_sqcm, printing_price_per_kg, quantity_kg } = args as {
          colors_count: number;
          width_cm: number;
          circumference_cm: number;
          cliche_price_per_sqcm?: number;
          printing_price_per_kg?: number;
          quantity_kg?: number;
        };
        
        const clichePrice = cliche_price_per_sqcm || 2.0;
        
        const printingPriceMap: Record<number, number> = {
          1: 1.5, 2: 2.5, 3: 3.5, 4: 4.5,
          5: 5.5, 6: 6.5, 7: 7.5, 8: 8.5
        };
        const printingPrice = printing_price_per_kg || printingPriceMap[Math.min(colors_count, 8)] || 1.5;
        
        const cliche_area_cm2 = width_cm * circumference_cm;
        const cliche_cost_per_color = cliche_area_cm2 * clichePrice;
        const total_cliche_cost = cliche_cost_per_color * colors_count;
        
        let result: Record<string, unknown> = {
          inputs: {
            colors_count,
            width_cm,
            circumference_cm,
            cliche_area_cm2,
            cliche_price_per_sqcm: clichePrice,
            printing_price_per_kg: printingPrice
          },
          cliche_costs: {
            area_cm2: cliche_area_cm2,
            cost_per_color_sar: cliche_cost_per_color.toFixed(2),
            total_cliche_cost_sar: total_cliche_cost.toFixed(2),
            note: `${colors_count} كليشه × ${cliche_area_cm2} سم² × ${clichePrice} ريال/سم²`
          },
          printing_rate_per_kg: `${printingPrice} ريال/كيلو للـ ${colors_count} ألوان`
        };
        
        if (quantity_kg) {
          const printing_cost = quantity_kg * printingPrice;
          const total_production_cost = total_cliche_cost + printing_cost;
          const cliche_cost_per_kg = total_cliche_cost / quantity_kg;
          const total_cost_per_kg = printingPrice + cliche_cost_per_kg;
          
          result.production_costs = {
            quantity_kg,
            printing_cost_sar: printing_cost.toFixed(2),
            cliche_cost_sar: total_cliche_cost.toFixed(2),
            total_cost_sar: total_production_cost.toFixed(2),
            cliche_cost_per_kg: cliche_cost_per_kg.toFixed(4),
            total_cost_per_kg: total_cost_per_kg.toFixed(4),
            message: `لـ ${quantity_kg} كيلو:\n- تكلفة كليشهات: ${total_cliche_cost.toFixed(2)} ر.س (مرة واحدة)\n- تكلفة طباعة: ${printing_cost.toFixed(2)} ر.س\n- الإجمالي: ${total_production_cost.toFixed(2)} ر.س\n- تكلفة الطباعة لكل كيلو (شاملة الكليشه): ${total_cost_per_kg.toFixed(2)} ر.س`
          };
        }
        
        return JSON.stringify(result);
      }

      case "send_quote_email": {
        const quoteId = args.quote_id as number;
        const email = args.email as string;
        const recipientName = args.customer_name as string | undefined;
        
        const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
        if (!quote) {
          return JSON.stringify({ error: "عرض السعر غير موجود" });
        }
        
        const quoteItemsList = await db.select().from(quote_items)
          .where(eq(quote_items.quote_id, quoteId))
          .orderBy(quote_items.line_number);
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return JSON.stringify({ error: "البريد الإلكتروني غير صحيح" });
        }
        
        const fmt = (n: string | number) => new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n || 0));
        
        const itemsHtml = quoteItemsList.map(item => `
          <tr>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${item.line_number}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${item.item_name}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${item.unit}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${fmt(item.quantity)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;">${fmt(item.unit_price)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:center;font-weight:bold;">${fmt(item.line_total)}</td>
          </tr>
        `).join("");
        
        const baseUrl = getAppBaseUrl();
        const pdfUrl = `${baseUrl}/api/quotes/${quoteId}/pdf`;
        const greeting = recipientName ? `عزيزي ${recipientName}،` : `عزيزنا العميل الكريم،`;
        
        const htmlBody = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: Arial, sans-serif; background:#f8fafc; margin:0; padding:20px; direction:rtl;">
  <div style="max-width:700px; margin:0 auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding:30px; text-align:center; color:#fff;">
      <h1 style="margin:0; font-size:24px; font-weight:bold;">مصنع الأكياس البلاستيكية الحديثة</h1>
      <p style="margin:8px 0 0; font-size:14px; opacity:0.9;">Modern Plastic Bags Factory | www.modplastic.com</p>
    </div>
    <div style="padding:30px;">
      <h2 style="color:#1e3a5f; margin-bottom:8px;">عرض السعر رقم: ${quote.document_number}</h2>
      <p style="color:#64748b; font-size:14px; margin-bottom:24px;">التاريخ: ${new Date(quote.created_at!).toLocaleDateString('ar-SA')}</p>
      <p style="color:#374151; margin-bottom:20px;">${greeting}</p>
      <p style="color:#374151; margin-bottom:24px;">يسعدنا تقديم عرض السعر التالي لكم، ونأمل أن يلبي احتياجاتكم:</p>
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
        <thead>
          <tr style="background:#1e3a5f; color:#fff;">
            <th style="padding:10px;border:1px solid #1e3a5f;text-align:center;">#</th>
            <th style="padding:10px;border:1px solid #1e3a5f;text-align:right;">الصنف</th>
            <th style="padding:10px;border:1px solid #1e3a5f;text-align:center;">الوحدة</th>
            <th style="padding:10px;border:1px solid #1e3a5f;text-align:center;">الكمية</th>
            <th style="padding:10px;border:1px solid #1e3a5f;text-align:center;">سعر الوحدة</th>
            <th style="padding:10px;border:1px solid #1e3a5f;text-align:center;">الإجمالي</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="background:#f0f4f8; border-radius:8px; padding:16px; margin-bottom:24px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="color:#64748b;">المجموع قبل الضريبة:</span>
          <span style="font-weight:bold;">${fmt(quote.total_before_tax)} ر.س</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="color:#64748b;">ضريبة القيمة المضافة (15%):</span>
          <span style="font-weight:bold;">${fmt(quote.tax_amount)} ر.س</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding-top:8px; border-top:2px solid #1e3a5f;">
          <span style="color:#1e3a5f; font-size:16px; font-weight:bold;">الإجمالي الكلي:</span>
          <span style="color:#1e3a5f; font-size:18px; font-weight:bold;">${fmt(quote.total_with_tax)} ر.س</span>
        </div>
      </div>
      <p style="color:#64748b; font-size:13px; margin-bottom:16px;">⚠️ هذا العرض صالح لمدة 15 يوم من تاريخ الإصدار.</p>
      <div style="text-align:center; margin-top:24px;">
        <a href="${pdfUrl}" style="background:#1e3a5f; color:#fff; padding:12px 28px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block;">تحميل ملف PDF</a>
      </div>
    </div>
    <div style="background:#f0f4f8; padding:20px; text-align:center; color:#64748b; font-size:12px;">
      <p style="margin:0;">للاستفسار: www.modplastic.com | صناعة الأكياس البلاستيكية عالية الجودة</p>
    </div>
  </div>
</body>
</html>`;

        const subjectLine = `عرض السعر ${quote.document_number} - مصنع الأكياس البلاستيكية الحديثة`;
        const plainText = `عرض السعر ${quote.document_number}\nالعميل: ${quote.customer_name}\nالإجمالي: ${fmt(quote.total_with_tax)} ر.س\nرابط PDF: ${pdfUrl}`;
        const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || "noreply@modplastic.com";

        // الأولوية 1: SendGrid API (Twilio Email Service)
        const sendgridApiKey = process.env.SENDGRID_API_KEY;
        if (sendgridApiKey) {
          try {
            const sgMail = (await import("@sendgrid/mail")).default;
            sgMail.setApiKey(sendgridApiKey);
            
            await sgMail.send({
              to: email,
              from: { email: fromEmail, name: "مصنع الأكياس البلاستيكية الحديثة" },
              subject: subjectLine,
              text: plainText,
              html: htmlBody,
            });
            
            return JSON.stringify({
              success: true,
              method: "sendgrid",
              message: `✅ تم إرسال عرض السعر ${quote.document_number} بنجاح إلى ${email} عبر SendGrid`,
              quote_id: quoteId,
              document_number: quote.document_number,
              email_sent_to: email,
              pdf_url: pdfUrl
            });
          } catch (sgError: any) {
            console.error("SendGrid error:", sgError?.response?.body || sgError?.message);
          }
        }

        // الأولوية 2: SMTP (مع دعم SendGrid SMTP: smtp.sendgrid.net)
        const smtpHost = process.env.SMTP_HOST;
        const smtpUser = process.env.SMTP_USER || (sendgridApiKey ? "apikey" : undefined);
        const smtpPass = process.env.SMTP_PASS || sendgridApiKey;
        
        if (smtpHost || sendgridApiKey) {
          try {
            const nodemailerModule = await import("nodemailer");
            const nodemailer = nodemailerModule.default;
            
            const transportConfig = smtpHost ? {
              host: smtpHost,
              port: parseInt(process.env.SMTP_PORT || "587"),
              secure: process.env.SMTP_SECURE === "true",
              auth: { user: smtpUser!, pass: smtpPass! }
            } : {
              // SendGrid SMTP fallback
              host: "smtp.sendgrid.net",
              port: 587,
              secure: false,
              auth: { user: "apikey", pass: sendgridApiKey! }
            };
            
            const transporter = nodemailer.createTransport(transportConfig);
            
            await transporter.sendMail({
              from: `"مصنع الأكياس البلاستيكية الحديثة" <${fromEmail}>`,
              to: email,
              subject: subjectLine,
              html: htmlBody,
              text: plainText
            });
            
            return JSON.stringify({
              success: true,
              method: "smtp",
              message: `✅ تم إرسال عرض السعر ${quote.document_number} بنجاح إلى ${email}`,
              quote_id: quoteId,
              document_number: quote.document_number,
              email_sent_to: email,
              pdf_url: pdfUrl
            });
          } catch (smtpError: any) {
            console.error("SMTP error:", smtpError?.message);
          }
        }

        // لا توجد إعدادات بريد - توفير رابط PDF للإرسال اليدوي
        return JSON.stringify({
          success: false,
          error: "لم يتم تكوين خدمة البريد الإلكتروني بعد",
          message: `لإتمام الإرسال، أضف المتغير SENDGRID_API_KEY إلى إعدادات البيئة.\n\nيمكنك في الوقت الحالي تحميل عرض السعر PDF وإرساله يدوياً إلى ${email}:`,
          pdf_url: pdfUrl,
          setup_instructions: "أضف SENDGRID_API_KEY من: Twilio Console → Email → SendGrid → API Keys"
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
  app.post("/api/ai-agent/chat", requireAuth, async (req: Request, res: Response) => {
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


  app.get("/api/quotes", requireAuth, async (_req: Request, res: Response) => {
    try {
      const allQuotes = await db.select().from(quotes).orderBy(desc(quotes.created_at));
      res.json(allQuotes);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      res.status(500).json({ error: "فشل في جلب عروض الأسعار" });
    }
  });

  app.get("/api/quotes/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "معرف عرض السعر غير صالح" });
      }
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
      
      let pdfBuffer: Buffer;
      if (isAdobePdfAvailable()) {
        try {
          pdfBuffer = await generateQuotePdfWithAdobe(id);
        } catch (adobeErr) {
          console.error("Adobe template PDF failed for download, falling back to PDFKit:", adobeErr);
          pdfBuffer = await generateQuotePdfBuffer(id);
        }
      } else {
        pdfBuffer = await generateQuotePdfBuffer(id);
      }
      
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
  app.post("/api/ai-agent/upload", requireAuth, upload.single("file"), async (req: Request, res: Response) => {
    const file = req.file;
    const filePath = file?.path;
    
    const cleanupFile = async () => {
      if (filePath) {
        try {
          await fs.promises.unlink(filePath);
        } catch (e: any) {
          if (e.code !== 'ENOENT') {
            console.error("Failed to cleanup temp file:", e);
          }
        }
      }
    };
    
    try {
      if (!file) {
        return res.status(400).json({ error: "لم يتم رفع أي ملف" });
      }

      let content = "";

      if (file.mimetype.startsWith("image/")) {
        const imageBuffer = await fs.promises.readFile(filePath!);
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
        content = await fs.promises.readFile(filePath!, "utf-8");
        
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

      await cleanupFile();

      res.json({
        success: true,
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        content: content.substring(0, 10000)
      });
    } catch (error) {
      await cleanupFile();
      console.error("File upload error:", error);
      res.status(500).json({ error: "فشل في معالجة الملف" });
    }
  });

  // ===== تحويل الصوت إلى نص باستخدام Whisper =====
  app.post("/api/ai-agent/transcribe", requireAuth, upload.single("audio"), async (req: Request, res: Response) => {
    const file = req.file;
    const filePath = file?.path;
    
    const cleanupFile = async () => {
      if (filePath) {
        try {
          await fs.promises.unlink(filePath);
        } catch (e: any) {
          if (e.code !== 'ENOENT') {
            console.error("Failed to cleanup temp audio file:", e);
          }
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
        await cleanupFile();
        return res.status(400).json({ error: "نوع الملف غير مدعوم. يرجى رفع ملف صوتي" });
      }

      console.log(`Transcribing audio file: ${file.originalname}, type: ${file.mimetype}, size: ${file.size}`);

      // استخدام OpenAI Whisper لتحويل الصوت إلى نص
      const audioBuffer = await fs.promises.readFile(filePath!);
      const audioFile = new File([audioBuffer], file.originalname, { type: file.mimetype });
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
        language: "ar", // اللغة العربية افتراضياً
        response_format: "text"
      });

      await cleanupFile();

      console.log(`Transcription successful: ${transcription.substring(0, 100)}...`);

      res.json({
        success: true,
        text: transcription,
        filename: file.originalname,
        duration_hint: "تم تحويل الصوت بنجاح"
      });
    } catch (error: any) {
      await cleanupFile();
      console.error("Audio transcription error:", error);
      res.status(500).json({ 
        error: "فشل في تحويل الصوت إلى نص",
        details: error.message || "خطأ غير معروف"
      });
    }
  });

  // ===== إعدادات الوكيل الذكي =====
  app.get("/api/ai-agent/settings", requireAuth, async (_req: Request, res: Response) => {
    try {
      const settings = await db.select().from(ai_agent_settings);
      res.json(settings);
    } catch (error) {
      console.error("Error fetching AI settings:", error);
      res.status(500).json({ error: "فشل في جلب الإعدادات" });
    }
  });

  app.put("/api/ai-agent/settings/:key", requireAuth, async (req: Request, res: Response) => {
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
  app.get("/api/ai-agent/knowledge", requireAuth, async (_req: Request, res: Response) => {
    try {
      const knowledge = await db.select().from(ai_agent_knowledge).orderBy(desc(ai_agent_knowledge.created_at));
      res.json(knowledge);
    } catch (error) {
      console.error("Error fetching knowledge base:", error);
      res.status(500).json({ error: "فشل في جلب قاعدة المعرفة" });
    }
  });

  app.post("/api/ai-agent/knowledge", requireAuth, async (req: Request, res: Response) => {
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

  app.put("/api/ai-agent/knowledge/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "معرف غير صالح" });
      }
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

  app.delete("/api/ai-agent/knowledge/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "معرف غير صالح" });
      }
      await db.delete(ai_agent_knowledge).where(eq(ai_agent_knowledge.id, id));
      res.json({ success: true, message: "تم الحذف بنجاح" });
    } catch (error) {
      console.error("Error deleting knowledge:", error);
      res.status(500).json({ error: "فشل في الحذف" });
    }
  });

  // ===== نماذج عروض الأسعار =====
  app.get("/api/quote-templates", requireAuth, async (_req: Request, res: Response) => {
    try {
      const templates = await db.select().from(quote_templates).orderBy(desc(quote_templates.created_at));
      res.json(templates);
    } catch (error) {
      console.error("Error fetching quote templates:", error);
      res.status(500).json({ error: "فشل في جلب النماذج" });
    }
  });

  app.get("/api/quote-templates/active", requireAuth, async (_req: Request, res: Response) => {
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

  app.post("/api/quote-templates", requireAuth, async (req: Request, res: Response) => {
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

  app.put("/api/quote-templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "معرف النموذج غير صالح" });
      }
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

  app.delete("/api/quote-templates/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ error: "معرف النموذج غير صالح" });
      }
      await db.delete(quote_templates).where(eq(quote_templates.id, id));
      res.json({ success: true, message: "تم حذف النموذج بنجاح" });
    } catch (error) {
      console.error("Error deleting quote template:", error);
      res.status(500).json({ error: "فشل في حذف النموذج" });
    }
  });
}
