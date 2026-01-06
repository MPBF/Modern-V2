import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Printer, Download, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../../print.css";

type PrintMode = "html" | "pdf" | "standalone";

interface Order {
  id: string;
  order_number: string | number;
  created_at?: string | Date;
  delivery_days?: number;
  notes?: string;
  status?: string;
}

interface Customer {
  id: string;
  name_ar?: string;
  name?: string;
  sales_rep_id?: string;
  phone?: string;
}

interface ProductionOrder {
  id: string;
  order_id: string;
  customer_product_id: string;
  quantity_kg?: number | string;
  final_quantity_kg?: number | string;
  notes?: string;
}

interface CustomerProduct {
  id: string;
  item_id: string;
  size_caption?: string;
  width?: number | string;
  thickness?: number | string;
  raw_material?: string;
  is_printed?: boolean;
  master_batch_id?: string;
  print_colors?: string;
}

interface Item {
  id: string;
  name_ar?: string;
  name?: string;
}

interface User {
  id: string;
  full_name?: string;
}

interface OrderPrintTemplateProps {
  order: Order | null | undefined;
  customer: Customer | null | undefined;
  productionOrders: ProductionOrder[];
  customerProducts: CustomerProduct[];
  items: Item[];
  onClose: () => void;
  mode?: PrintMode;
}

const masterBatchColors: Array<{ id: string; name_ar: string; name_en?: string }> = [
  { id: "PT-111111", name_ar: "أبيض", name_en: "White" },
  { id: "PT-000000", name_ar: "أسود", name_en: "Black" },
  { id: "PT-CLEAR", name_ar: "شفاف", name_en: "Clear" },
  { id: "PT-RED", name_ar: "أحمر", name_en: "Red" },
  { id: "PT-BLUE", name_ar: "أزرق", name_en: "Blue" },
  { id: "PT-GREEN", name_ar: "أخضر", name_en: "Green" },
  { id: "PT-YELLOW", name_ar: "أصفر", name_en: "Yellow" },
];

const getMasterBatchInfo = (id?: string) => {
  if (!id) return { name_ar: "غير محدد", name_en: "-" };
  return masterBatchColors.find((c) => c.id === id) ?? { name_ar: id, name_en: "" };
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const getDeliveryDate = (createdDate: Date, days: number = 0) => {
  const result = new Date(createdDate);
  result.setDate(result.getDate() + days);
  return result;
};

export default function OrderPrintTemplate({
  order,
  customer,
  productionOrders,
  customerProducts,
  items,
  onClose,
  mode = "html",
}: OrderPrintTemplateProps) {
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    staleTime: Infinity,
  });

  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const hasAutoTriggered = useRef(false);

  const customerProductsMap = useMemo(
    () => new Map(customerProducts?.map((cp) => [cp.id, cp]) || []),
    [customerProducts]
  );

  const itemsMap = useMemo(() => new Map(items?.map((i) => [i.id, i]) || []), [items]);

  const filteredOrders = useMemo(
    () => productionOrders?.filter((po) => po.order_id === order?.id) || [],
    [productionOrders, order?.id]
  );

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));
  }, [filteredOrders]);

  const salesRep = useMemo(() => {
    return users?.find((u) => u.id === customer?.sales_rep_id);
  }, [users, customer?.sales_rep_id]);

  const canPrint = Boolean(order?.id) && sortedOrders.length > 0;

  const orderDateObj = useMemo(
    () => (order?.created_at ? new Date(order.created_at) : new Date()),
    [order?.created_at]
  );
  const orderDateStr = useMemo(() => formatDate(orderDateObj), [orderDateObj]);
  const deliveryDateStr = useMemo(() => {
    if (!order?.delivery_days) return "-";
    return formatDate(getDeliveryDate(orderDateObj, order.delivery_days));
  }, [order?.delivery_days, orderDateObj]);

  const totalWeight = useMemo(() => {
    return sortedOrders.reduce((sum, po) => {
      const raw = po.final_quantity_kg ?? po.quantity_kg ?? 0;
      return sum + Number(raw);
    }, 0);
  }, [sortedOrders]);

  const qrUrl = useMemo(() => {
    const data = `Order:${order?.order_number}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(data)}&color=000000`;
  }, [order?.order_number]);

  const handleHtmlPrint = useCallback(async () => {
    if (!canPrint || isPrinting) return;
    setIsPrinting(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      window.print();
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsPrinting(false), 500);
    }
  }, [canPrint, isPrinting]);

  const handlePdfExport = useCallback(async () => {
    if (!canPrint || isExporting) return;
    setIsExporting(true);

    try {
      const printArea = document.querySelector(".print-area") as HTMLElement;
      if (!printArea) {
        console.error("لم يتم العثور على منطقة الطباعة");
        return;
      }

      await new Promise((r) => setTimeout(r, 500));

      const canvas = await html2canvas(printArea, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 6;

      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      const scaledWidth = contentWidth;
      const scaledHeight = (canvas.height * scaledWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageContentHeight = contentHeight;
      const totalPages = Math.ceil(scaledHeight / pageContentHeight);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        const thisPagePixelHeight = (pageContentHeight / scaledHeight) * canvas.height;
        tempCanvas.height = Math.min(thisPagePixelHeight, canvas.height - page * thisPagePixelHeight);

        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(
            canvas,
            0,
            page * thisPagePixelHeight,
            canvas.width,
            tempCanvas.height,
            0,
            0,
            canvas.width,
            tempCanvas.height
          );

          const imgData = tempCanvas.toDataURL("image/png");
          const thisPageHeight = Math.min(pageContentHeight, scaledHeight - page * pageContentHeight);

          pdf.addImage(imgData, "PNG", margin, margin, scaledWidth, thisPageHeight);
        }
      }

      const fileName = `أمر_تشغيل_${order?.order_number || "غير_محدد"}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error("خطأ في تصدير PDF:", error);
    } finally {
      setIsExporting(false);
    }
  }, [canPrint, isExporting, order?.order_number]);

  const handleStandalone = useCallback(() => {
    const printArea = document.querySelector(".print-area");
    if (!printArea) return;

    const newWindow = window.open("", "_blank");
    if (!newWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>أمر تشغيل #${order?.order_number}</title>
        <style>
          @page { size: A4 landscape; margin: 6mm 10mm; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background: #f5f5f5; padding: 20px; }
          .print-page { background: #fff; padding: 15px; max-width: 1123px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .factory-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 2px solid #1a365d; margin-bottom: 10px; }
          .header-col { display: flex; flex-direction: column; }
          .header-col h1 { font-size: 18px; color: #1a365d; margin: 0; }
          .header-col p { font-size: 12px; color: #666; margin: 2px 0 0; }
          .company-details { font-size: 10px; color: #888; margin-top: 4px; }
          .order-title-box { text-align: center; }
          .order-title-box h2 { font-size: 16px; color: #1a365d; margin: 0; }
          .order-title-box h3 { font-size: 11px; color: #666; margin: 2px 0 0; font-weight: normal; }
          .order-meta-box { text-align: left; font-size: 11px; }
          .meta-row { display: flex; gap: 8px; margin-bottom: 3px; }
          .meta-row .label { color: #666; }
          .meta-row .value { font-weight: bold; color: #1a365d; }
          .info-section { margin-bottom: 10px; }
          .info-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .info-table td { padding: 6px 10px; border: 1px solid #ddd; }
          .label-cell { background: #f8f9fa; color: #666; width: 80px; }
          .value-cell { font-weight: 600; color: #1a365d; }
          .highlight-label { background: #1a365d !important; color: #fff !important; }
          .highlight-value { background: #e8f4fd; font-size: 14px; color: #1a365d; }
          .items-section { margin-bottom: 10px; }
          .factory-table { width: 100%; border-collapse: collapse; font-size: 10px; }
          .factory-table th { background: #e8f4fd; color: #000; padding: 6px 4px; border: 1px solid #ddd; font-weight: 600; text-align: center; }
          .factory-table td { padding: 5px 4px; border: 1px solid #ddd; text-align: center; }
          .factory-table tbody tr:nth-child(even) { background: #f9f9f9; }
          .item-name-ar { font-weight: 600; color: #1a365d; text-align: right; }
          .item-caption { font-size: 9px; color: #888; text-align: right; }
          .qty-cell { font-weight: bold; font-size: 12px; color: #1a365d; }
          .print-mark { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; }
          .print-mark.yes { background: #d4edda; color: #155724; }
          .print-mark.no { background: #f8d7da; color: #721c24; }
          .notes-section { margin-bottom: 10px; }
          .section-title { font-size: 11px; font-weight: 600; color: #1a365d; margin-bottom: 4px; }
          .notes-box { background: #f8f9fa; border: 1px solid #ddd; padding: 8px; font-size: 10px; color: #666; min-height: 30px; border-radius: 4px; }
          .signatures-footer { display: flex; justify-content: space-around; padding-top: 10px; border-top: 1px solid #ddd; }
          .signature-block { text-align: center; width: 120px; }
          .sig-title { font-size: 10px; color: #666; margin-bottom: 20px; }
          .sig-line { border-top: 1px solid #333; }
          .page-bottom-info { display: flex; justify-content: space-between; font-size: 8px; color: #999; margin-top: 10px; padding-top: 5px; border-top: 1px dashed #ddd; }
          .toolbar { display: flex; justify-content: center; gap: 10px; margin-bottom: 20px; padding: 15px; background: #1a365d; border-radius: 8px; }
          .toolbar button { padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
          .btn-print { background: #10b981; color: #fff; }
          .btn-print:hover { background: #059669; }
          .btn-pdf { background: #3b82f6; color: #fff; }
          .btn-pdf:hover { background: #2563eb; }
          .btn-close { background: #6b7280; color: #fff; }
          .btn-close:hover { background: #4b5563; }
          @media print { .toolbar { display: none !important; } body { background: #fff; padding: 0; } .print-page { box-shadow: none; max-width: 100%; } }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button class="btn-print" onclick="window.print()">🖨️ طباعة</button>
          <button class="btn-close" onclick="window.close()">✕ إغلاق</button>
        </div>
        ${printArea.innerHTML}
      </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  }, [order?.order_number]);

  useEffect(() => {
    if (hasAutoTriggered.current || !canPrint) return;
    
    if (mode === "html") {
      hasAutoTriggered.current = true;
      const timer = setTimeout(() => {
        handleHtmlPrint();
      }, 500);
      return () => clearTimeout(timer);
    }
    if (mode === "pdf") {
      hasAutoTriggered.current = true;
      const timer = setTimeout(() => {
        handlePdfExport();
      }, 500);
      return () => clearTimeout(timer);
    }
    if (mode === "standalone") {
      hasAutoTriggered.current = true;
      const timer = setTimeout(() => {
        handleStandalone();
        onClose();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [mode, canPrint]);

  return (
    <>
      <style>
        {`@page { size: A4 landscape; margin: 6mm 10mm; }`}
      </style>

      <div className="print-preview-overlay no-print" role="region" aria-label="معاينة الطباعة">
        <div className="print-preview-toolbar">
          <div className="print-preview-toolbar-title">
            <h2>أمر تشغيل إنتاج</h2>
            <span className="text-sm text-muted-foreground">#{order?.order_number ?? "-"}</span>
          </div>

          <div className="print-preview-toolbar-actions">
            <Button
              onClick={handleHtmlPrint}
              disabled={!canPrint || isPrinting}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-print-html"
            >
              <Printer className="h-4 w-4 ml-2" />
              {isPrinting ? "جاري الطباعة..." : "طباعة مباشرة"}
            </Button>

            <Button
              onClick={handlePdfExport}
              disabled={!canPrint || isExporting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-export-pdf"
            >
              <Download className="h-4 w-4 ml-2" />
              {isExporting ? "جاري التصدير..." : "تصدير PDF"}
            </Button>

            <Button
              onClick={handleStandalone}
              disabled={!canPrint}
              variant="outline"
              className="border-purple-600 text-purple-600 hover:bg-purple-50"
              data-testid="button-standalone"
            >
              <ExternalLink className="h-4 w-4 ml-2" />
              صفحة مستقلة
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="text-gray-600 hover:text-gray-800"
              data-testid="button-close-print-preview"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="print-preview-paper">
          <PrintContent
            order={order}
            customer={customer}
            salesRep={salesRep}
            productionOrders={sortedOrders}
            customerProductsMap={customerProductsMap}
            itemsMap={itemsMap}
            totalWeight={totalWeight}
            orderDateStr={orderDateStr}
            deliveryDateStr={deliveryDateStr}
            qrUrl={qrUrl}
          />
        </div>
      </div>

      <div className="print-area">
        <PrintContent
          order={order}
          customer={customer}
          salesRep={salesRep}
          productionOrders={sortedOrders}
          customerProductsMap={customerProductsMap}
          itemsMap={itemsMap}
          totalWeight={totalWeight}
          orderDateStr={orderDateStr}
          deliveryDateStr={deliveryDateStr}
          qrUrl={qrUrl}
        />
      </div>
    </>
  );
}

function PrintContent({
  qrUrl,
  order,
  customer,
  salesRep,
  productionOrders,
  customerProductsMap,
  itemsMap,
  totalWeight,
  orderDateStr,
  deliveryDateStr,
}: any) {
  return (
    <div className="print-page">
      <header className="factory-header">
        <div className="header-col right" style={{ flex: 1 }}>
          <h1>مصنع الرواد للبلاستيك</h1>
          <p>Al-Rowad Plastic Factory</p>
          <div className="company-details">الرياض - المدينة الصناعية الثانية</div>
        </div>

        <div className="header-col center" style={{ flex: 1, textAlign: "center" }}>
          <div className="order-title-box">
            <h2>أمر تشغيل إنتاج</h2>
            <h3>PRODUCTION ORDER</h3>
          </div>
        </div>

        <div
          className="header-col left"
          style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: "15px", alignItems: "center" }}
        >
          <div className="order-meta-box">
            <div className="meta-row">
              <span className="label">رقم الطلب:</span>
              <span className="value">#{order?.order_number}</span>
            </div>
            <div className="meta-row">
              <span className="label">التاريخ:</span>
              <span className="value">{orderDateStr}</span>
            </div>
            <div className="meta-row">
              <span className="label">التسليم:</span>
              <span className="value">{deliveryDateStr}</span>
            </div>
          </div>
          <div style={{ background: "white", padding: "2px", border: "1px solid #ccc" }}>
            <img src={qrUrl} alt="QR" width="80" height="80" style={{ display: "block" }} />
          </div>
        </div>
      </header>

      <section className="info-section">
        <table className="info-table">
          <tbody>
            <tr>
              <td className="label-cell">العميل</td>
              <td className="value-cell">
                {customer?.name_ar || customer?.name}
                {customer?.phone && (
                  <span style={{ fontSize: "11px", display: "block", fontWeight: "normal", marginTop: "2px" }}>
                    {customer.phone}
                  </span>
                )}
              </td>
              <td className="label-cell">المندوب</td>
              <td className="value-cell">{salesRep?.full_name || "-"}</td>
              <td className="label-cell highlight-label">الإجمالي</td>
              <td className="value-cell highlight-value">
                {formatNumber(totalWeight)} <span style={{ fontSize: "12px" }}>كجم</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="items-section">
        <table className="factory-table">
          <thead>
            <tr>
              <th style={{ width: "4%" }}>#</th>
              <th style={{ width: "22%", textAlign: "right" }}>الصنف</th>
              <th style={{ width: "10%" }}>المقاس</th>
              <th style={{ width: "12%" }}>سمك / لون</th>
              <th style={{ width: "10%" }}>الخامة</th>
              <th style={{ width: "12%" }}>طباعة</th>
              <th style={{ width: "12%" }}>الكمية (كجم)</th>
              <th style={{ width: "18%" }}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {productionOrders.map((po: any, index: number) => {
              const cp = customerProductsMap.get(po.customer_product_id);
              const item = cp ? itemsMap.get(cp.item_id) : undefined;
              const colorInfo = getMasterBatchInfo(cp?.master_batch_id);
              const qty = Number(po.final_quantity_kg ?? po.quantity_kg ?? 0);

              return (
                <tr key={po.id}>
                  <td className="text-center" style={{ fontWeight: "bold" }}>
                    {index + 1}
                  </td>
                  <td>
                    <div className="item-name-ar">{item?.name_ar || item?.name || "-"}</div>
                    {cp?.size_caption && <div className="item-caption">{cp.size_caption}</div>}
                  </td>
                  <td className="text-center font-bold" dir="ltr">
                    {cp?.width ? `${cp.width} cm` : "-"}
                  </td>
                  <td className="text-center">
                    <div style={{ direction: "ltr", fontWeight: "bold" }}>{cp?.thickness || "-"} mic</div>
                    <div style={{ fontSize: "10px", color: "#666" }}>{colorInfo.name_ar}</div>
                  </td>
                  <td className="text-center font-bold">{cp?.raw_material || "بيور"}</td>
                  <td className="text-center">
                    {cp?.is_printed ? (
                      <div>
                        <span className="print-mark yes">نعم</span>
                        {cp.print_colors && (
                          <div style={{ fontSize: "9px", marginTop: "2px", fontWeight: "bold" }}>{cp.print_colors}</div>
                        )}
                      </div>
                    ) : (
                      <span className="print-mark no">لا</span>
                    )}
                  </td>
                  <td className="qty-cell">{formatNumber(qty)}</td>
                  <td style={{ fontSize: "9px", textAlign: "right" }}>{po.notes || "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="notes-section">
        <div className="section-title">ملاحظات عامة</div>
        <div className="notes-box">{order?.notes || "لا توجد ملاحظات."}</div>
      </section>

      <footer className="signatures-footer">
        <div className="signature-block">
          <div className="sig-title">الإنتاج</div>
          <div className="sig-line"></div>
        </div>
        <div className="signature-block">
          <div className="sig-title">الجودة</div>
          <div className="sig-line"></div>
        </div>
        <div className="signature-block">
          <div className="sig-title">المستودع</div>
          <div className="sig-line"></div>
        </div>
      </footer>

      <div className="page-bottom-info">
        <span>FACTORY IQ SYSTEM</span>
        <span>{new Date().toLocaleDateString("en-GB")}</span>
      </div>
    </div>
  );
}
