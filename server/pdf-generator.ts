/**************************************************************************************************
 *  Arabic PDF Professional Generator – Drop‑in Replacement
 *  Fully improved RTL support, Arabic shaping, bilingual headers, table handling, footers,
 *  page numbers, totals box, notes area, signature box, watermark, and clean business layout.
 **************************************************************************************************/

import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import * as ArabicReshaper from "arabic-reshaper";
import bidiFactory from "bidi-js";
const bidi = bidiFactory();
import { db } from "./db";
import { eq } from "drizzle-orm";
import { quotes, quote_items } from "@shared/schema";

// ===================== Arabic Helpers =====================
function toArabicDigits(input: string | number): string {
  return String(input ?? "");
}

function formatNumberAr(n: string | number, digits = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(n || 0));
}

function formatDateAr(date: string | Date): string {
  try {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return "";
  }
}

// Arabic Reshaping + Bidi (RTL fix)
function shapeArabicSafe(text: string): string {
  if (!text) return "";
  const ar = /[\u0600-\u06FF]/;
  if (!ar.test(text)) return text;

  try {
    const reshaped = ArabicReshaper?.convertArabic
      ? ArabicReshaper.convertArabic(text)
      : text;
    const levels = bidi?.getEmbeddingLevels
      ? bidi.getEmbeddingLevels(reshaped, "rtl")
      : null;
    if (bidi?.getReorderedString && levels)
      return bidi.getReorderedString(reshaped, levels);
    return reshaped;
  } catch {
    return text;
  }
}

// Draw RTL text safely
function drawTextRTL(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  opts: any = {}
) {
  const shaped = shapeArabicSafe(text);
  doc.text(shaped, x, y, {
    ...opts,
    align: "right",
  });
}

// Label + Value bilingual (Arabic + English)
function drawLabelValue(
  doc: PDFKit.PDFDocument,
  labelEn: string,
  labelAr: string,
  value: string,
  x: number,
  y: number,
  width: number
) {
  const lh = 12;

  // Arabic
  if ((doc as any)._registeredFonts?.["Arabic"]) {
    doc.font("Arabic").fontSize(9).fillColor("#111");
    drawTextRTL(doc, `${labelAr}: ${shapeArabicSafe(value)}`, x + width, y, {
      width,
      align: "right",
    });
  }

  // English
  doc.font("Helvetica").fontSize(8).fillColor("#666");
  doc.text(`${labelEn}: ${value}`, x, y + lh, { width, align: "left" });
}

// =======================================================================
// =====================  MAIN PDF GENERATOR  ============================
// =======================================================================
export async function generateQuotePdfBuffer(quoteId: number): Promise<Buffer> {
  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) throw new Error("Quote not found");

  const items = await db
    .select()
    .from(quote_items)
    .where(eq(quote_items.quote_id, quoteId))
    .orderBy(quote_items.line_number);

  // ===== Totals =====
  const subtotal = Number(quote.total_before_tax || 0);
  const taxAmount = Number(quote.tax_amount || subtotal * 0.15);
  const grandTotal = Number(quote.total_with_tax || subtotal + taxAmount);

  // ==== PDFKit Setup ====
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({
    size: "A4",
    margin: 36,
    bufferPages: true,
    autoFirstPage: false,
  });

  // Load Fonts
  const fontDir = path.join(__dirname, "fonts");
  const amiri = path.join(fontDir, "Amiri-Regular.ttf");
  const amiriBold = path.join(fontDir, "Amiri-Bold.ttf");
  const logoPath = path.join(fontDir, "factory-logo.png");

  if (fs.existsSync(amiri)) doc.registerFont("Arabic", amiri);
  if (fs.existsSync(amiriBold)) doc.registerFont("Arabic-Bold", amiriBold);

  const haveArabic = fs.existsSync(amiri);
  const haveBoldAr = fs.existsSync(amiriBold);
  const haveLogo = fs.existsSync(logoPath);

  doc.on("data", (c: Buffer) => chunks.push(c));
  doc.on("end", () => {});

  // ===== Page geometry & constants =====
  const pageW = 595;
  const pageH = 842;
  const left = 36;
  const right = pageW - 36;
  const contentW = pageW - 72;
  const top = 36;
  const bottom = pageH - 36;

  // ================= HEADER =================
  const drawHeader = () => {
    const y = top;

    if (haveLogo) {
      try {
        doc.image(logoPath, left, y, { width: 55 });
      } catch {}
    }

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#1f2937");
    doc.text("Modern Plastic Bags Factory", left + 65, y + 5, {
      width: contentW - 65,
      align: "left",
    });

    if (haveArabic) {
      doc.font(haveBoldAr ? "Arabic-Bold" : "Arabic").fontSize(13).fillColor("#1f2937");
      drawTextRTL(
        doc,
        "مصنع الأكياس البلاستيكية الحديثة",
        right,
        y + 24,
        { width: contentW - 65 }
      );
    }

    doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
    doc.text("Industrial Area, Riyadh | Saudi Arabia", left + 65, y + 44);
    doc.text("Tel: +966 11 XXX XXXX | www.modplastic.com", left + 65, y + 56);

    doc
      .moveTo(left, y + 72)
      .lineTo(right, y + 72)
      .lineWidth(1)
      .strokeColor("#2563eb")
      .stroke();
  };

  // =============== FOOTER ==================
  const drawFooter = (page: number, total: number) => {
    const y = bottom - 24;

    doc.strokeColor("#e5e7eb").moveTo(left, y).lineTo(right, y).stroke();

    doc.font("Helvetica").fontSize(8).fillColor("#6b7280");
    doc.text(`Page ${page} of ${total}`, left, y + 6);

    if (haveArabic) {
      doc.font("Arabic");
      drawTextRTL(
        doc,
        `الصفحة ${toArabicDigits(page)} من ${toArabicDigits(total)}`,
        right,
        y + 6
      );
    }
  };

  // Watermark
  const drawWatermark = () => {
    if ((quote.status || "draft").toLowerCase() !== "draft") return;

    doc.save();
    doc.rotate(-30, { origin: [pageW / 2, pageH / 2] });
    doc.font(haveArabic ? "Arabic-Bold" : "Helvetica-Bold")
      .fontSize(60)
      .fillColor("#e5e7eb")
      .opacity(0.25);

    drawTextRTL(doc, "مسودة", pageW / 2 + 130, pageH / 2 - 20, {
      align: "center",
      width: 0,
    });

    doc.opacity(1).restore();
  };

  // ================= TABLE =================
  const table = {
    columns: [
      { key: "idx", title: "#", width: 30 },
      { key: "name", title: "الصنف", width: 230 },
      { key: "unit", title: "الوحدة", width: 60 },
      { key: "qty", title: "الكمية", width: 70 },
      { key: "price", title: "سعر الوحدة", width: 90 },
      { key: "total", title: "الإجمالي", width: 90 },
    ],
    headerH: 22,
    rowH: 20,
  };

  const drawTableHeader = (y: number) => {
    doc.rect(left, y, contentW, table.headerH).fillColor("#2563eb").fill();
    doc.fillColor("#fff").font("Helvetica-Bold").fontSize(9);

    let xx = left;
    for (const col of table.columns) {
      doc.text(col.title, xx, y + 5, {
        width: col.width,
        align: "center",
      });
      xx += col.width;
    }
  };

  const drawItemRow = (y: number, row: any, idx: number) => {
    const zebra = idx % 2 === 0;
    if (zebra) {
      doc.rect(left, y, contentW, table.rowH).fillColor("#f8fafc").fill();
    }

    doc.font("Helvetica").fillColor("#111").fontSize(9);

    let xx = left;

    // index
    doc.text(String(row.line_number), xx, y + 5, { width: table.columns[0].width, align: "center" });
    xx += table.columns[0].width;

    // name
    const name = String(row.item_name || "");
    if (haveArabic && /[\u0600-\u06FF]/.test(name)) {
      doc.font("Arabic");
      drawTextRTL(doc, name, xx + table.columns[1].width, y + 4, {
        width: table.columns[1].width,
      });
      doc.font("Helvetica");
    } else {
      doc.text(name, xx, y + 5, {
        width: table.columns[1].width,
        align: "left",
      });
    }
    xx += table.columns[1].width;

    // unit
    doc.text(String(row.unit), xx, y + 5, {
      width: table.columns[2].width,
      align: "center",
    });
    xx += table.columns[2].width;

    // qty
    doc.text(formatNumberAr(row.quantity), xx, y + 5, {
      width: table.columns[3].width,
      align: "center",
    });
    xx += table.columns[3].width;

    // price
    doc.text(formatNumberAr(row.unit_price), xx, y + 5, {
      width: table.columns[4].width,
      align: "center",
    });
    xx += table.columns[4].width;

    // total
    doc.text(formatNumberAr(row.line_total), xx, y + 5, {
      width: table.columns[5].width,
      align: "center",
    });
  };

  // Add a page
  const addPage = () => {
    doc.addPage();
    drawHeader();
    drawWatermark();
  };

  // =================== Start PDF ===================
  addPage();

  // ===== TITLE =====
  doc.font("Helvetica-Bold").fontSize(15).fillColor("#2563eb");
  doc.text("PRICE QUOTATION", left, top + 82);

  if (haveArabic) {
    doc.font("Arabic-Bold").fontSize(14);
    drawTextRTL(doc, "عرض سعر", right, top + 82);
  }

  doc.moveTo(left, top + 105).lineTo(right, top + 105).strokeColor("#e5e7eb").stroke();

  // ===== INFO BLOCK =====
  const infoY = top + 115;
  doc.rect(left, infoY, contentW, 70).fillColor("#f9fafb").fill();
  doc.fillColor("#111");

  const colW = contentW / 2 - 20;

  // Document / Date
  drawLabelValue(doc, "Document", "المستند", quote.document_number, left + 12, infoY + 10, colW);
  drawLabelValue(
    doc,
    "Date",
    "التاريخ",
    formatDateAr(quote.quote_date || quote.created_at),
    left + 12,
    infoY + 36,
    colW
  );

  // Customer / VAT
  drawLabelValue(
    doc,
    "Customer",
    "العميل",
    quote.customer_name,
    left + 20 + colW,
    infoY + 10,
    colW
  );
  drawLabelValue(
    doc,
    "VAT Number",
    "الرقم الضريبي",
    quote.tax_number || "—",
    left + 20 + colW,
    infoY + 36,
    colW
  );

  // ===== ITEMS TABLE =====
  let cursorY = infoY + 90;
  drawTableHeader(cursorY);
  cursorY += table.headerH;

  const bottomSafe = bottom - 180;

  for (let i = 0; i < items.length; i++) {
    if (cursorY + table.rowH > bottomSafe) {
      addPage();
      drawTableHeader(top + 20);
      cursorY = top + 20 + table.headerH;
    }
    drawItemRow(cursorY, items[i], i);
    cursorY += table.rowH;
  }

  doc.moveTo(left, cursorY + 4).lineTo(right, cursorY + 4).strokeColor("#ddd").stroke();

  // ===== TOTALS BOX =====
  const totalsY = cursorY + 20;
  const boxW = 280;
  const boxX = right - boxW;

  doc.rect(boxX, totalsY, boxW, 96).fillColor("#f8fafc").fill();
  doc.strokeColor("#ddd").rect(boxX, totalsY, boxW, 96).stroke();

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Subtotal", boxX + 10, totalsY + 10);
  doc.text(formatNumberAr(subtotal) + " ر.س", boxX + boxW - 100, totalsY + 10, {
    width: 90,
    align: "right",
  });

  doc.text("VAT 15%", boxX + 10, totalsY + 28);
  doc.text(formatNumberAr(taxAmount) + " ر.س", boxX + boxW - 100, totalsY + 28, {
    width: 90,
    align: "right",
  });

  doc.moveTo(boxX + 10, totalsY + 46).lineTo(boxX + boxW - 10, totalsY + 46).stroke();

  doc.fontSize(11).fillColor("#2563eb");
  doc.text("TOTAL", boxX + 10, totalsY + 54);
  doc.text(formatNumberAr(grandTotal) + " ر.س", boxX + boxW - 100, totalsY + 54, {
    width: 90,
    align: "right",
  });

  // ===== NOTES =====
  let notesY = totalsY + 110;
  if (quote.notes) {
    doc.rect(left, notesY, contentW, 70).fillColor("#fffbeb").fill();
    doc.strokeColor("#fcd34d").rect(left, notesY, contentW, 70).stroke();

    doc.font("Helvetica-Bold").fontSize(9).fillColor("#92400e");
    doc.text("Notes", left + 10, notesY + 8);

    if (haveArabic) {
      doc.font("Arabic").fontSize(9).fillColor("#78350f");
      drawTextRTL(
        doc,
        shapeArabicSafe(String(quote.notes)),
        right - 10,
        notesY + 28,
        { width: contentW - 20 }
      );
    } else {
      doc.font("Helvetica").text(String(quote.notes), left + 10, notesY + 28, {
        width: contentW - 20,
      });
    }

    notesY += 90;
  }

  // ===== Validity + Signature boxes =====
  const boxH = 70;
  const colW2 = (contentW - 10) / 2;

  // Validity
  doc.rect(left, notesY, colW2, boxH).fillColor("#f3f4f6").fill();
  doc.strokeColor("#e5e7eb").rect(left, notesY, colW2, boxH).stroke();

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111").text("Validity", left + 10, notesY + 8);
  if (haveArabic) {
    doc.font("Arabic").fontSize(9).fillColor("#111");
    drawTextRTL(doc, "الصلاحية", left + colW2 - 10, notesY + 8);
  }
  doc.font("Helvetica").fontSize(9).fillColor("#374151");
  doc.text("15 days from issue date.", left + 10, notesY + 28);
  if (haveArabic) {
    doc.font("Arabic");
    drawTextRTL(doc, "صالح لمدة ١٥ يوم من تاريخ الإصدار", left + colW2 - 10, notesY + 28);
  }

  // Signature Box
  doc.rect(left + colW2 + 10, notesY, colW2, boxH).fillColor("#f3f4f6").fill();
  doc.strokeColor("#e5e7eb").rect(left + colW2 + 10, notesY, colW2, boxH).stroke();

  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111");
  doc.text("Signature & Stamp", left + colW2 + 20, notesY + 8);

  if (haveArabic) {
    doc.font("Arabic").fontSize(9);
    drawTextRTL(doc, "التوقيع والختم", left + colW2 + colW2 - 10, notesY + 8);
  }

  doc.strokeColor("#9ca3af")
    .moveTo(left + colW2 + 20, notesY + 48)
    .lineTo(left + colW2 + colW2 - 20, notesY + 48)
    .stroke();

  // ================= FOOTERS (AFTER PAGE GENERATION) =================
  doc.flushPages();
  const range = doc.bufferedPageRange();

  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    drawFooter(i + 1, range.count);
  }

  doc.end();

  return await new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
}