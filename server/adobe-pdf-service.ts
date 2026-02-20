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
import { NOTO_SANS_ARABIC_REGULAR_BASE64, NOTO_SANS_ARABIC_BOLD_BASE64 } from "./fonts/noto-sans-arabic-base64";

const ADOBE_CLIENT_ID = process.env.ADOBE_CLIENT_ID;
const ADOBE_CLIENT_SECRET = process.env.ADOBE_CLIENT_SECRET;

function formatCurrency(amount: string | number): string {
  return new Intl.NumberFormat("en-US", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  }).format(Number(amount));
}

function formatNumber(num: string | number): string {
  return new Intl.NumberFormat("en-US").format(Number(num));
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function generateQuoteHtml(quote: any, items: any[]): string {
  const itemsHtml = items.map((item, index) => `
    <tr class="${index % 2 === 0 ? 'even-row' : 'odd-row'}">
      <td class="num-cell">${formatCurrency(item.line_total)}</td>
      <td class="num-cell">${formatCurrency(item.unit_price)}</td>
      <td class="num-cell">${formatNumber(item.quantity)}</td>
      <td class="text-cell">${item.unit || 'قطعة'}</td>
      <td class="text-cell item-name">${item.item_name}</td>
      <td class="seq-cell">${item.line_number}</td>
    </tr>
  `).join('');

  const logoUrl = "https://modplastic.com/wp-content/uploads/2022/02/Screenshot_2022-02-19_145506-removebg-preview.png";

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @font-face {
      font-family: 'Noto Sans Arabic';
      font-style: normal;
      font-weight: 400;
      src: url(data:font/truetype;base64,${NOTO_SANS_ARABIC_REGULAR_BASE64}) format('truetype');
    }
    @font-face {
      font-family: 'Noto Sans Arabic';
      font-style: normal;
      font-weight: 700;
      src: url(data:font/truetype;base64,${NOTO_SANS_ARABIC_BOLD_BASE64}) format('truetype');
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans Arabic', 'Traditional Arabic', 'Arial', sans-serif;
      direction: rtl;
      unicode-bidi: embed;
      text-align: right;
      background: #fff;
      color: #1f2937;
      font-size: 14px;
      line-height: 1.7;
      padding: 30px 40px;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
      padding-bottom: 25px;
      border-bottom: 3px solid #0066cc;
    }
    
    .logo-section {
      flex-shrink: 0;
    }
    
    .logo {
      max-height: 80px;
      max-width: 180px;
    }
    
    .company-info {
      text-align: left;
      flex-grow: 1;
      padding-left: 20px;
    }
    
    .company-name {
      font-size: 22px;
      font-weight: 700;
      color: #0066cc;
      margin-bottom: 4px;
    }
    
    .company-name-en {
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      color: #64748b;
      margin-bottom: 8px;
    }
    
    .company-details {
      font-size: 11px;
      color: #94a3b8;
      line-height: 1.5;
    }
    
    .document-title {
      text-align: center;
      margin: 20px 0;
      padding: 15px;
      background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
      border-radius: 8px;
      color: #fff;
    }
    
    .document-title h1 {
      font-size: 26px;
      font-weight: 700;
      margin-bottom: 3px;
    }
    
    .document-title .subtitle {
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      opacity: 0.9;
    }
    
    .document-info {
      display: flex;
      justify-content: center;
      gap: 50px;
      margin-bottom: 25px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 14px;
    }
    
    .document-info .info-item {
      text-align: center;
    }
    
    .document-info .info-label {
      color: #64748b;
      font-size: 12px;
      display: block;
      margin-bottom: 4px;
    }
    
    .document-info .info-value {
      color: #1e293b;
      font-weight: 600;
      font-size: 15px;
      font-family: 'Inter', 'Noto Sans Arabic', sans-serif;
    }
    
    .customer-box {
      background: linear-gradient(to left, #f0f9ff, #ffffff);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 25px;
      border-right: 5px solid #0066cc;
      box-shadow: 0 2px 8px rgba(0, 102, 204, 0.08);
    }
    
    .customer-box h3 {
      font-size: 15px;
      color: #0066cc;
      margin-bottom: 15px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .customer-box h3::before {
      content: "●";
      font-size: 10px;
    }
    
    .customer-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
    }
    
    .customer-info p {
      margin: 0;
    }
    
    .customer-info label {
      color: #64748b;
      font-size: 12px;
      display: block;
      margin-bottom: 3px;
    }
    
    .customer-info .value {
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
    }
    
    .items-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 25px;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
    }
    
    .items-table thead {
      background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%);
      color: #fff;
    }
    
    .items-table th {
      padding: 14px 12px;
      text-align: center;
      font-weight: 600;
      font-size: 13px;
      letter-spacing: 0.3px;
    }
    
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      text-align: center;
      font-size: 13px;
    }
    
    .items-table tbody tr:last-child td {
      border-bottom: none;
    }
    
    .items-table .even-row {
      background: #f8fafc;
    }
    
    .items-table .odd-row {
      background: #ffffff;
    }
    
    .items-table tbody tr:hover {
      background: #f0f9ff;
    }
    
    .items-table .item-name {
      text-align: right;
      font-weight: 500;
      color: #1e293b;
    }
    
    .items-table .num-cell {
      font-family: 'Inter', monospace;
      direction: ltr;
      text-align: center;
      color: #334155;
    }
    
    .items-table .seq-cell {
      font-weight: 700;
      color: #0066cc;
      font-family: 'Inter', sans-serif;
    }
    
    .totals-section {
      display: flex;
      justify-content: flex-start;
      margin-bottom: 25px;
    }
    
    .totals-box {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 10px;
      padding: 20px 25px;
      min-width: 320px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
      border: 1px solid #e2e8f0;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .total-row:last-child {
      border-bottom: none;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid #0066cc;
    }
    
    .total-row.grand-total {
      font-size: 18px;
      font-weight: 700;
      color: #0066cc;
    }
    
    .total-label {
      color: #475569;
    }
    
    .total-value {
      font-weight: 600;
      direction: ltr;
      font-family: 'Inter', sans-serif;
      color: #1e293b;
    }
    
    .notes-box {
      background: linear-gradient(to left, #fef3c7, #fffbeb);
      border-radius: 10px;
      padding: 18px;
      margin-bottom: 25px;
      border-right: 5px solid #f59e0b;
      box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
    }
    
    .notes-box h4 {
      color: #b45309;
      font-size: 14px;
      margin-bottom: 10px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .notes-box h4::before {
      content: "📝";
      font-size: 14px;
    }
    
    .notes-box p {
      color: #78350f;
      margin: 0;
      line-height: 1.6;
    }
    
    .footer {
      text-align: center;
      padding: 25px 20px;
      margin-top: 20px;
      background: linear-gradient(to top, #f8fafc, #ffffff);
      border-top: 2px solid #e2e8f0;
      border-radius: 0 0 10px 10px;
    }
    
    .footer-validity {
      background: #0066cc;
      color: #fff;
      padding: 10px 25px;
      border-radius: 25px;
      display: inline-block;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 15px;
    }
    
    .footer-validity-en {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 15px;
    }
    
    .prepared-by {
      font-size: 13px;
      color: #475569;
      padding-top: 15px;
      border-top: 1px dashed #e2e8f0;
      margin-top: 15px;
    }
    
    .prepared-by strong {
      color: #1e293b;
      font-weight: 600;
    }
    
    .footer-contact {
      margin-top: 15px;
      font-size: 11px;
      color: #94a3b8;
    }
    
    .currency {
      font-size: 11px;
      color: #64748b;
      margin-right: 3px;
    }
    
    .watermark {
      position: fixed;
      bottom: 20px;
      left: 20px;
      font-size: 10px;
      color: #cbd5e1;
      font-family: 'Inter', sans-serif;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo-section">
        <img src="${logoUrl}" alt="شعار المصنع" class="logo" />
      </div>
      <div class="company-info">
        <div class="company-name">مصنع الأكياس البلاستيكية الحديثة</div>
        <div class="company-name-en">Modern Plastic Bags Factory</div>
        <div class="company-details">
          المملكة العربية السعودية | الرياض<br>
          www.modplastic.com
        </div>
      </div>
    </div>
    
    <div class="document-title">
      <h1>عرض سعر</h1>
      <div class="subtitle">Price Quotation</div>
    </div>
    
    <div class="document-info">
      <div class="info-item">
        <span class="info-label">رقم المستند</span>
        <span class="info-value">${String(quote.document_number).replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())}</span>
      </div>
      <div class="info-item">
        <span class="info-label">التاريخ</span>
        <span class="info-value">${formatDate(quote.quote_date)}</span>
      </div>
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
          <span class="value">${quote.tax_number ? String(quote.tax_number).replace(/[٠-٩]/g, (d: string) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()) : 'غير متوفر'}</span>
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
      <div class="footer-validity">هذا العرض صالح لمدة 15 يوم من تاريخ الإصدار</div>
      <div class="footer-validity-en">This quotation is valid for 15 days from the issue date</div>
      ${quote.created_by_name ? `
      <div class="prepared-by">
        تم الإعداد بواسطة: <strong>${quote.created_by_name}</strong>
      </div>
      ` : ''}
      <div class="footer-contact">
        www.modplastic.com | المملكة العربية السعودية
      </div>
    </div>
  </div>
  <div class="watermark">Generated by ModPlastic ERP System</div>
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
