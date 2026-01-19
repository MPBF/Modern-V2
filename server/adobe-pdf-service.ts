import {
  ServicePrincipalCredentials,
  PDFServices,
  MimeType,
  HTMLToPDFJob,
  HTMLToPDFParams,
  HTMLToPDFResult,
  PageLayout
} from "@adobe/pdfservices-node-sdk";
import { db } from "./db";
import { quotes, quote_items } from "@shared/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const ADOBE_CLIENT_ID = process.env.ADOBE_CLIENT_ID;
const ADOBE_CLIENT_SECRET = process.env.ADOBE_CLIENT_SECRET;

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("ar-SA", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(Number(amount));
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("ar-SA", {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function generateQuoteHtml(quote: any, items: any[]): string {
  const itemsHtml = items.map((item, index) => `
    <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
      <td class="num-cell">${formatCurrency(item.line_total)}</td>
      <td class="num-cell">${formatCurrency(item.unit_price)}</td>
      <td class="num-cell">${formatCurrency(item.quantity)}</td>
      <td class="text-cell">${item.unit || 'قطعة'}</td>
      <td class="text-cell item-name">${item.item_name}</td>
      <td class="seq-cell">${item.line_number}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans Arabic', 'Traditional Arabic', 'Arial', sans-serif;
      direction: rtl;
      text-align: right;
      background: #fff;
      color: #1f2937;
      font-size: 14px;
      line-height: 1.6;
      padding: 40px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }
    
    .company-name {
      font-size: 26px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 5px;
    }
    
    .company-name-en {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 10px;
    }
    
    .company-tagline {
      font-size: 14px;
      color: #9ca3af;
    }
    
    .document-title {
      text-align: center;
      margin: 25px 0;
    }
    
    .document-title h1 {
      font-size: 24px;
      color: #2563eb;
      font-weight: 700;
    }
    
    .document-title .subtitle {
      font-size: 16px;
      color: #6b7280;
    }
    
    .document-info {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin-bottom: 25px;
      font-size: 14px;
    }
    
    .document-info span {
      color: #4b5563;
    }
    
    .document-info strong {
      color: #1f2937;
    }
    
    .customer-box {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 25px;
      border-right: 4px solid #2563eb;
    }
    
    .customer-box h3 {
      font-size: 16px;
      color: #2563eb;
      margin-bottom: 12px;
      font-weight: 600;
    }
    
    .customer-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    
    .customer-info p {
      margin: 0;
    }
    
    .customer-info label {
      color: #6b7280;
      font-size: 13px;
    }
    
    .customer-info .value {
      font-weight: 500;
      color: #1f2937;
    }
    
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    
    .items-table thead {
      background: #2563eb;
      color: #fff;
    }
    
    .items-table th {
      padding: 12px 10px;
      text-align: center;
      font-weight: 600;
      font-size: 13px;
    }
    
    .items-table td {
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
      text-align: center;
    }
    
    .items-table .even-row {
      background: #f8fafc;
    }
    
    .items-table .item-name {
      text-align: right;
      font-weight: 500;
    }
    
    .items-table .num-cell {
      font-family: 'Noto Sans Arabic', monospace;
      direction: ltr;
      text-align: center;
    }
    
    .items-table .seq-cell {
      font-weight: 600;
      color: #2563eb;
    }
    
    .totals-section {
      display: flex;
      justify-content: flex-start;
      margin-bottom: 25px;
    }
    
    .totals-box {
      background: #f8fafc;
      border-radius: 8px;
      padding: 20px;
      min-width: 300px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    
    .total-row:last-child {
      border-bottom: none;
      padding-top: 12px;
      margin-top: 8px;
      border-top: 2px solid #2563eb;
    }
    
    .total-row.grand-total {
      font-size: 18px;
      font-weight: 700;
      color: #2563eb;
    }
    
    .total-label {
      color: #4b5563;
    }
    
    .total-value {
      font-weight: 600;
      direction: ltr;
    }
    
    .notes-box {
      background: #fffbeb;
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 25px;
      border-right: 4px solid #f59e0b;
    }
    
    .notes-box h4 {
      color: #b45309;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .notes-box p {
      color: #78350f;
      margin: 0;
    }
    
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
    }
    
    .footer p {
      margin: 5px 0;
    }
    
    .prepared-by {
      margin-top: 10px;
      font-size: 13px;
    }
    
    .prepared-by strong {
      color: #1f2937;
    }
    
    .currency {
      font-size: 12px;
      color: #6b7280;
      margin-right: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="company-name">مصنع الأكياس البلاستيكية الحديثة</div>
      <div class="company-name-en">Modern Plastic Bags Factory</div>
      <div class="company-tagline">الجودة والتميز في كل منتج</div>
    </div>
    
    <div class="document-title">
      <h1>عرض سعر</h1>
      <div class="subtitle">Price Quotation</div>
    </div>
    
    <div class="document-info">
      <span>رقم المستند: <strong>${quote.document_number}</strong></span>
      <span>التاريخ: <strong>${formatDate(quote.quote_date)}</strong></span>
    </div>
    
    <div class="customer-box">
      <h3>معلومات العميل</h3>
      <div class="customer-info">
        <p>
          <label>اسم العميل:</label><br>
          <span class="value">${quote.customer_name || 'غير محدد'}</span>
        </p>
        <p>
          <label>الرقم الضريبي:</label><br>
          <span class="value">${quote.tax_number || 'غير متوفر'}</span>
        </p>
      </div>
    </div>
    
    <table class="items-table">
      <thead>
        <tr>
          <th>الإجمالي</th>
          <th>سعر الوحدة</th>
          <th>الكمية</th>
          <th>الوحدة</th>
          <th>اسم الصنف</th>
          <th>#</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>
    
    <div class="totals-section">
      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">المجموع قبل الضريبة:</span>
          <span class="total-value">${formatCurrency(quote.total_before_tax)} <span class="currency">ر.س</span></span>
        </div>
        <div class="total-row">
          <span class="total-label">ضريبة القيمة المضافة (15%):</span>
          <span class="total-value">${formatCurrency(quote.tax_amount)} <span class="currency">ر.س</span></span>
        </div>
        <div class="total-row grand-total">
          <span class="total-label">الإجمالي شامل الضريبة:</span>
          <span class="total-value">${formatCurrency(quote.total_with_tax)} <span class="currency">ر.س</span></span>
        </div>
      </div>
    </div>
    
    ${quote.notes ? `
    <div class="notes-box">
      <h4>ملاحظات</h4>
      <p>${quote.notes}</p>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>هذا العرض صالح لمدة 15 يوم من تاريخ الإصدار</p>
      <p>This quotation is valid for 15 days from the issue date</p>
      ${quote.created_by_name ? `
      <div class="prepared-by">
        <span>تم الإعداد بواسطة: <strong>${quote.created_by_name}</strong></span>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
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
  
  const htmlContent = generateQuoteHtml(quote, items);
  
  const tempDir = os.tmpdir();
  const inputHtmlPath = path.join(tempDir, `quote_${quoteId}_${Date.now()}.html`);
  
  try {
    fs.writeFileSync(inputHtmlPath, htmlContent, 'utf8');
    
    const credentials = new ServicePrincipalCredentials({
      clientId: ADOBE_CLIENT_ID,
      clientSecret: ADOBE_CLIENT_SECRET
    });
    
    const pdfServices = new PDFServices({ credentials });
    
    const readStream = fs.createReadStream(inputHtmlPath);
    const inputAsset = await pdfServices.upload({
      readStream,
      mimeType: MimeType.HTML
    });
    
    const params = new HTMLToPDFParams({
      pageLayout: new PageLayout({
        pageWidth: 8.27,
        pageHeight: 11.69
      }),
      includeHeaderFooter: false
    });
    
    const job = new HTMLToPDFJob({ inputAsset, params });
    
    const pollingURL = await pdfServices.submit({ job });
    const pdfServicesResponse = await pdfServices.getJobResult({
      pollingURL,
      resultType: HTMLToPDFResult
    });
    
    if (!pdfServicesResponse.result) {
      throw new Error("PDF generation failed - no result returned");
    }
    
    const resultAsset = pdfServicesResponse.result.asset;
    const streamAsset = await pdfServices.getContent({ asset: resultAsset });
    
    const pdfBuffer = await streamToBuffer(streamAsset.readStream);
    
    fs.unlinkSync(inputHtmlPath);
    
    console.log("✅ Adobe PDF generated successfully for quote:", quoteId);
    return pdfBuffer;
  } catch (error) {
    if (fs.existsSync(inputHtmlPath)) {
      fs.unlinkSync(inputHtmlPath);
    }
    
    console.error("Adobe PDF generation error:", error);
    throw error;
  }
}

export function isAdobePdfAvailable(): boolean {
  return !!(ADOBE_CLIENT_ID && ADOBE_CLIENT_SECRET);
}
