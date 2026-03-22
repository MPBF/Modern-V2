import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  CreatePDFJob,
  CreatePDFResult,
} from "@adobe/pdfservices-node-sdk";
import { db } from "./db";
import { quotes, quote_items } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import JSZip from "jszip";

const ADOBE_CLIENT_ID = process.env.ADOBE_CLIENT_ID;
const ADOBE_CLIENT_SECRET = process.env.ADOBE_CLIENT_SECRET;

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(Number(amount));
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildTemplateData(quote: any, items: any[]): Record<string, string> {
  const data: Record<string, string> = {
    document_number: quote.document_number || "",
    quote_date: formatDate(quote.quote_date || new Date()),
    sales_rep: quote.created_by_name || "مبيعات",
    valid_until: formatDate(new Date(new Date(quote.quote_date || Date.now()).getTime() + 15 * 24 * 60 * 60 * 1000)),
    customer_name: quote.customer_name || "",
    customer_phone: quote.customer_phone || "",
    customer_address: quote.customer_address || "",
    customer_vat: quote.tax_number || "",
    total_before_tax: `${formatCurrency(quote.total_before_tax)} ر.س`,
    vat_rate: "15",
    tax_amount: `${formatCurrency(quote.tax_amount)} ر.س`,
    total_with_tax: `${formatCurrency(quote.total_with_tax)} ر.س`,
    notes: quote.notes || "",
    terms_and_conditions: "1. الأسعار شاملة التوصيل داخل المدينة\n2. العرض صالح لمدة 15 يوم من تاريخ الإصدار\n3. الدفع خلال 30 يوم من تاريخ التسليم",
    company_address: "المملكة العربية السعودية - الرياض",
    company_cr: "1010XXXXXX",
    company_vat: "3XXXXXXXXXXXXX3",
    company_phone: "+966 XX XXX XXXX",
    company_email: "info@modplastic.com",
  };

  const MAX_ITEMS = 10;
  for (let i = 1; i <= MAX_ITEMS; i++) {
    const prefix = `item_${i}_`;
    const item = items[i - 1];
    if (item) {
      data[`${prefix}number`] = String(i);
      data[`${prefix}name`] = item.item_name || "";
      data[`${prefix}size`] = item.size || item.description || "";
      data[`${prefix}quantity`] = String(item.quantity || "");
      data[`${prefix}unit`] = item.unit || "قطعة";
      data[`${prefix}unit_price`] = formatCurrency(item.unit_price);
      data[`${prefix}total`] = formatCurrency(item.line_total);
    } else {
      data[`${prefix}number`] = "";
      data[`${prefix}name`] = "";
      data[`${prefix}size`] = "";
      data[`${prefix}quantity`] = "";
      data[`${prefix}unit`] = "";
      data[`${prefix}unit_price`] = "";
      data[`${prefix}total`] = "";
    }
  }

  return data;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

async function mergeTemplateData(templatePath: string, data: Record<string, string>): Promise<Buffer> {
  const templateBuf = await fs.promises.readFile(templatePath);
  const zip = await JSZip.loadAsync(templateBuf);

  const xmlFiles = ["word/document.xml", "word/header1.xml", "word/header2.xml", "word/header3.xml", "word/footer1.xml", "word/footer2.xml", "word/footer3.xml"];

  for (const xmlFile of xmlFiles) {
    const file = zip.file(xmlFile);
    if (!file) continue;

    let xml = await file.async("string");

    for (const [key, value] of Object.entries(data)) {
      const escaped = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
      xml = xml.split(`{{${key}}}`).join(escaped);
    }

    xml = xml.replace(/\{\{[^}]+\}\}/g, "");

    zip.file(xmlFile, xml);
  }

  return await zip.generateAsync({ type: "nodebuffer" });
}

export async function generateQuotePdfWithAdobe(quoteId: number): Promise<Buffer> {
  if (!ADOBE_CLIENT_ID || !ADOBE_CLIENT_SECRET) {
    throw new Error("Adobe PDF Services credentials not configured");
  }

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, quoteId));
  if (!quote) {
    throw new Error("Quote not found");
  }

  const items = await db.select().from(quote_items).where(eq(quote_items.quote_id, quoteId)).orderBy(quote_items.line_number);

  const templatePath = path.join(process.cwd(), "server", "services", "adobe-pdf", "templates", "quote-template-ar.docx");
  try {
    await fs.promises.access(templatePath);
  } catch {
    throw new Error(`Arabic quote template not found at: ${templatePath}`);
  }

  const templateData = buildTemplateData(quote, items);

  console.log(`📄 Using Arabic Word template for quote ${quote.document_number} with ${items.length} items`);

  const tempDocx = path.join(os.tmpdir(), `quote_${quoteId}_${Date.now()}.docx`);

  try {
    const mergedDocx = await mergeTemplateData(templatePath, templateData);
    await fs.promises.writeFile(tempDocx, mergedDocx);
    console.log(`📝 Template merged (${(mergedDocx.length / 1024).toFixed(1)} KB), converting to PDF...`);

    const credentials = new ServicePrincipalCredentials({
      clientId: ADOBE_CLIENT_ID,
      clientSecret: ADOBE_CLIENT_SECRET,
    });

    const pdfServices = new PDFServices({ credentials });

    const readStream = fs.createReadStream(tempDocx);
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.DOCX,
    });

    const job = new CreatePDFJob({ inputAsset });

    const pollingURL = await pdfServices.submit({ job });
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: CreatePDFResult,
    });

    if (!pdfServicesResponse.result) {
      throw new Error("PDF generation failed - no result returned");
    }

    const resultAsset = pdfServicesResponse.result.asset;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });
    const pdfBuffer = await streamToBuffer(streamAsset.readStream);

    await fs.promises.unlink(tempDocx).catch(() => {});

    console.log(`✅ Arabic template PDF generated successfully for quote: ${quoteId} (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
    return pdfBuffer;
  } catch (error) {
    await fs.promises.unlink(tempDocx).catch(() => {});
    console.error("Adobe PDF generation error:", error);
    throw error;
  }
}

export function isAdobePdfAvailable(): boolean {
  return !!(ADOBE_CLIENT_ID && ADOBE_CLIENT_SECRET);
}
