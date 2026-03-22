import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ImageRun,
  ShadingType,
  VerticalAlign,
  TableLayoutType,
  PageOrientation,
  Header,
  Footer,
} from "docx";
import * as fs from "fs";
import * as path from "path";

const COLORS = {
  primary: "1B5E20",
  primaryLight: "E8F5E9",
  secondary: "1A237E",
  headerBg: "1B5E20",
  headerText: "FFFFFF",
  borderColor: "C8E6C9",
  textDark: "212121",
  textMedium: "424242",
  textLight: "757575",
};

const BORDER = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: COLORS.borderColor,
};

const NO_BORDER = {
  style: BorderStyle.NONE,
  size: 0,
  color: "FFFFFF",
};

const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
};

const ALL_BORDERS = {
  top: BORDER,
  bottom: BORDER,
  left: BORDER,
  right: BORDER,
};

function txt(text: string, opts: { bold?: boolean; size?: number; color?: string; font?: string; rtl?: boolean } = {}): TextRun {
  return new TextRun({
    text,
    bold: opts.bold ?? false,
    size: opts.size ?? 20,
    color: opts.color ?? COLORS.textDark,
    font: opts.font ?? "Arial",
    rightToLeft: opts.rtl ?? true,
  });
}

function cell(content: string | TextRun[], opts: {
  bold?: boolean; size?: number; color?: string; shading?: string;
  width?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; borders?: any; vAlign?: (typeof VerticalAlign)[keyof typeof VerticalAlign];
  colspan?: number;
} = {}): TableCell {
  const children = typeof content === "string"
    ? [txt(content, { bold: opts.bold, size: opts.size, color: opts.color })]
    : content;

  return new TableCell({
    children: [
      new Paragraph({
        children,
        alignment: opts.align ?? AlignmentType.RIGHT,
        bidirectional: true,
        spacing: { before: 40, after: 40 },
      }),
    ],
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    verticalAlign: opts.vAlign ?? VerticalAlign.CENTER,
    borders: opts.borders ?? ALL_BORDERS,
    columnSpan: opts.colspan,
  });
}

function labelCell(label: string, width?: number): TableCell {
  return cell(label, { bold: true, shading: COLORS.primaryLight, width, color: COLORS.primary });
}

function headerCell(label: string, width?: number): TableCell {
  return cell(label, { bold: true, shading: COLORS.primary, color: COLORS.headerText, width, align: AlignmentType.CENTER });
}

function mergeCell(field: string, opts: {
  bold?: boolean; size?: number; color?: string; shading?: string;
  width?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; borders?: any;
} = {}): TableCell {
  return cell(`{{${field}}}`, opts);
}

function sectionTitle(text: string): Paragraph {
  return new Paragraph({
    children: [txt(`  ${text}`, { bold: true, size: 24, color: COLORS.headerText })],
    alignment: AlignmentType.RIGHT,
    bidirectional: true,
    shading: { type: ShadingType.CLEAR, fill: COLORS.headerBg },
    spacing: { before: 0, after: 0 },
  });
}

function spacer(before = 200, after = 100): Paragraph {
  return new Paragraph({ children: [], spacing: { before, after } });
}

export async function createQuoteTemplate(): Promise<Buffer> {
  const logoPath = path.join(process.cwd(), "server", "fonts", "factory-logo.png");
  const logoBuffer = await fs.promises.readFile(logoPath);

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 22, color: COLORS.textDark },
          paragraph: { alignment: AlignmentType.RIGHT },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
          size: { orientation: PageOrientation.PORTRAIT },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [txt("مصنع الأكياس البلاستيكية الحديثة", { size: 14, color: COLORS.textLight })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 0 },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                txt("Modern Plastic Bag Factory | ", { size: 14, color: COLORS.textLight, rtl: false }),
                txt("هاتف: {{company_phone}} | ", { size: 14, color: COLORS.textLight }),
                txt("بريد: {{company_email}}", { size: 14, color: COLORS.textLight }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { before: 100 },
            }),
          ],
        }),
      },
      children: [
        // ===== HEADER WITH LOGO =====
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [txt("مصنع الأكياس البلاستيكية الحديثة", { bold: true, size: 28, color: COLORS.primary })],
                      alignment: AlignmentType.RIGHT,
                      bidirectional: true,
                      spacing: { after: 40 },
                    }),
                    new Paragraph({
                      children: [txt("Modern Plastic Bag Factory", { bold: true, size: 20, color: COLORS.secondary, rtl: false })],
                      alignment: AlignmentType.RIGHT,
                      spacing: { after: 40 },
                    }),
                    new Paragraph({
                      children: [txt("{{company_address}}", { size: 18, color: COLORS.textMedium })],
                      alignment: AlignmentType.RIGHT,
                      bidirectional: true,
                      spacing: { after: 20 },
                    }),
                    new Paragraph({
                      children: [txt("سجل تجاري: {{company_cr}} | رقم ضريبي: {{company_vat}}", { size: 16, color: COLORS.textLight })],
                      alignment: AlignmentType.RIGHT,
                      bidirectional: true,
                    }),
                  ],
                  width: { size: 70, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  borders: NO_BORDERS,
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [new ImageRun({ data: logoBuffer, transformation: { width: 120, height: 120 }, type: "png" })],
                      alignment: AlignmentType.CENTER,
                    }),
                  ],
                  width: { size: 30, type: WidthType.PERCENTAGE },
                  verticalAlign: VerticalAlign.CENTER,
                  borders: NO_BORDERS,
                }),
              ],
            }),
          ],
        }),

        new Paragraph({
          children: [],
          spacing: { before: 100, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORS.primary } },
        }),

        // ===== DOCUMENT TITLE =====
        new Paragraph({
          children: [txt("عــرض ســعــر", { bold: true, size: 36, color: COLORS.primary })],
          alignment: AlignmentType.CENTER,
          bidirectional: true,
          spacing: { before: 200, after: 60 },
        }),
        new Paragraph({
          children: [txt("QUOTATION", { bold: true, size: 22, color: COLORS.secondary, rtl: false })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),

        // ===== QUOTE INFO =====
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: [
                labelCell("رقم العرض:", 15),
                mergeCell("document_number", { bold: true, width: 20, color: COLORS.secondary }),
                cell("", { width: 15 }),
                labelCell("التاريخ:", 15),
                mergeCell("quote_date", { width: 35 }),
              ],
            }),
            new TableRow({
              children: [
                labelCell("مندوب المبيعات:", 15),
                mergeCell("sales_rep", { width: 20 }),
                cell("", { width: 15 }),
                labelCell("صالح حتى:", 15),
                mergeCell("valid_until", { width: 35 }),
              ],
            }),
          ],
        }),

        spacer(),

        // ===== CUSTOMER INFO =====
        sectionTitle("بيانات العميل"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: [
                labelCell("اسم العميل:", 20),
                mergeCell("customer_name", { width: 30, bold: true }),
                labelCell("رقم الهاتف:", 20),
                mergeCell("customer_phone", { width: 30 }),
              ],
            }),
            new TableRow({
              children: [
                labelCell("العنوان:", 20),
                mergeCell("customer_address", { width: 30 }),
                labelCell("الرقم الضريبي:", 20),
                mergeCell("customer_vat", { width: 30 }),
              ],
            }),
          ],
        }),

        spacer(),

        // ===== ITEMS TABLE =====
        sectionTitle("تفاصيل المنتجات"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: [
                headerCell("م", 5),
                headerCell("اسم المنتج", 30),
                headerCell("المقاس / المواصفات", 20),
                headerCell("الكمية", 10),
                headerCell("الوحدة", 8),
                headerCell("سعر الوحدة", 12),
                headerCell("الإجمالي", 15),
              ],
            }),
            // Items rows - will be dynamically generated
            ...generateItemRows(10),
          ],
        }),

        spacer(),

        // ===== TOTALS =====
        new Table({
          width: { size: 45, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          rows: [
            new TableRow({
              children: [
                labelCell("المجموع قبل الضريبة:", 50),
                mergeCell("total_before_tax", { width: 50, align: AlignmentType.CENTER, bold: true }),
              ],
            }),
            new TableRow({
              children: [
                labelCell("ضريبة القيمة المضافة ({{vat_rate}}%):", 50),
                mergeCell("tax_amount", { width: 50, align: AlignmentType.CENTER }),
              ],
            }),
            new TableRow({
              children: [
                cell("الإجمالي شامل الضريبة:", { bold: true, shading: COLORS.primary, width: 50, color: COLORS.headerText, size: 24 }),
                mergeCell("total_with_tax", { width: 50, align: AlignmentType.CENTER, bold: true, size: 24, color: COLORS.primary, shading: COLORS.primaryLight }),
              ],
            }),
          ],
        }),

        spacer(),

        // ===== NOTES =====
        new Paragraph({
          children: [
            txt("ملاحظات: ", { bold: true, size: 20, color: COLORS.primary }),
            txt("{{notes}}", { size: 18, color: COLORS.textMedium }),
          ],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 60, after: 40 },
        }),

        spacer(),

        // ===== TERMS =====
        sectionTitle("الشروط والأحكام"),
        new Paragraph({
          children: [txt("{{terms_and_conditions}}", { size: 18, color: COLORS.textMedium })],
          alignment: AlignmentType.RIGHT,
          bidirectional: true,
          spacing: { before: 60, after: 200 },
        }),

        // ===== SIGNATURES =====
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          layout: TableLayoutType.FIXED,
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({ children: [txt("توقيع العميل", { bold: true, size: 20, color: COLORS.primary })], alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 20 } }),
                    new Paragraph({ children: [txt("____________________", { size: 20, color: COLORS.textLight })], alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
                  ],
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                }),
                new TableCell({
                  children: [new Paragraph({ children: [] })],
                  width: { size: 34, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                }),
                new TableCell({
                  children: [
                    new Paragraph({ children: [txt("ختم وتوقيع المصنع", { bold: true, size: 20, color: COLORS.primary })], alignment: AlignmentType.CENTER, bidirectional: true, spacing: { after: 20 } }),
                    new Paragraph({ children: [txt("____________________", { size: 20, color: COLORS.textLight })], alignment: AlignmentType.CENTER, spacing: { before: 400 } }),
                  ],
                  width: { size: 33, type: WidthType.PERCENTAGE },
                  borders: NO_BORDERS,
                }),
              ],
            }),
          ],
        }),
      ],
    }],
  });

  return await Packer.toBuffer(doc);
}

function generateItemRows(maxItems: number): TableRow[] {
  const rows: TableRow[] = [];
  for (let i = 1; i <= maxItems; i++) {
    const prefix = `item_${i}_`;
    rows.push(
      new TableRow({
        children: [
          mergeCell(`${prefix}number`, { width: 5, align: AlignmentType.CENTER }),
          mergeCell(`${prefix}name`, { width: 30, bold: true }),
          mergeCell(`${prefix}size`, { width: 20, align: AlignmentType.CENTER }),
          mergeCell(`${prefix}quantity`, { width: 10, align: AlignmentType.CENTER }),
          mergeCell(`${prefix}unit`, { width: 8, align: AlignmentType.CENTER }),
          mergeCell(`${prefix}unit_price`, { width: 12, align: AlignmentType.CENTER }),
          mergeCell(`${prefix}total`, { width: 15, align: AlignmentType.CENTER, bold: true, color: COLORS.primary }),
        ],
      })
    );
  }
  return rows;
}

async function main() {
  const templateBuffer = await createQuoteTemplate();
  const outputPath = path.join(process.cwd(), "server", "services", "adobe-pdf", "templates", "quote-template-ar.docx");
  await fs.promises.writeFile(outputPath, templateBuffer);
  console.log(`Quote template saved to: ${outputPath}`);
  console.log(`File size: ${(templateBuffer.length / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
