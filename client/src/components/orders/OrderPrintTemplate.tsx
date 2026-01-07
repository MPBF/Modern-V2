import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Printer, Download, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
// تأكد أن هذا الملف موجود أو احذفه اذا ما تحتاجه، التنسيق الجديد موجود داخل الكود
import "../../print.css";

type PrintMode = "html" | "pdf" | "standalone";

// --- Interfaces Definitions ---
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

// --- Data & Helpers ---
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

const formatNumber = (value: number | string | undefined) => {
  const num = Number(value);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
};

const formatDate = (date: Date) => {
  if (!date || isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
};

const getDeliveryDate = (createdDate: Date, days: number = 0) => {
  const result = new Date(createdDate);
  result.setDate(result.getDate() + days);
  return result;
};

// --- Main Component ---
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
  const printPreviewRef = useRef<HTMLDivElement>(null);

  // Data Mappings
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

  // Dates & Totals
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

  // --- Handlers ---
  const handleHtmlPrint = useCallback(async () => {
    if (!canPrint || isPrinting) return;
    setIsPrinting(true);
    try {
      // Small delay to ensure styles render
      await new Promise((r) => setTimeout(r, 100));
      window.print();
    } catch (e) {
      console.error(e);
    } finally {
      setIsPrinting(false);
    }
  }, [canPrint, isPrinting]);

  const handlePdfExport = useCallback(async () => {
    if (!canPrint || isExporting) return;
    setIsExporting(true);

    try {
      // We capture the preview element which is visible on screen
      const elementToCapture = printPreviewRef.current || document.querySelector(".print-preview-paper");

      if (!elementToCapture) {
        console.error("لم يتم العثور على منطقة المعاينة للتصدير");
        return;
      }

      await new Promise((r) => setTimeout(r, 300));

      const canvas = await html2canvas(elementToCapture as HTMLElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 5;
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imgWidth, imgHeight);
      pdf.save(`أمر_تشغيل_${order?.order_number || "new"}.pdf`);
    } catch (error) {
      console.error("PDF Error:", error);
    } finally {
      setIsExporting(false);
    }
  }, [canPrint, isExporting, order?.order_number]);

  const handleStandalone = useCallback(() => {
    const printArea = document.querySelector(".print-area");
    if (!printArea) return;
    const newWindow = window.open("", "_blank");
    if (!newWindow) return;

    // HTML content for standalone window (simplified for brevity as logic is same)
    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <title>Order #${order?.order_number}</title>
          <style>
            @page { size: A4 landscape; margin: 0; }
            body { margin: 0; padding: 20px; font-family: sans-serif; direction: rtl; }
            .print-page { width: 100%; max-width: 100%; }
            /* Add other critical CSS here if needed */
          </style>
        </head>
        <body>${printArea.innerHTML}</body>
      </html>
    `);
    newWindow.document.close();
    newWindow.print();
  }, [order?.order_number]);

  // --- Auto Trigger Effect ---
  useEffect(() => {
    if (hasAutoTriggered.current || !canPrint) return;

    const trigger = async () => {
      hasAutoTriggered.current = true;
      if (mode === "html") {
        setTimeout(handleHtmlPrint, 500);
      } else if (mode === "pdf") {
        setTimeout(handlePdfExport, 500);
      } else if (mode === "standalone") {
        setTimeout(() => { handleStandalone(); onClose(); }, 300);
      }
    };
    trigger();
  }, [mode, canPrint, handleHtmlPrint, handlePdfExport, handleStandalone, onClose]);

  return (
    <div className="order-print-container">
      {/* This Style block is CRITICAL for isolating the print area. */}
      <style>
        {`
          @media print {
            /* Hide preview elements */
            .print-preview-overlay,
            .print-preview-toolbar,
            .print-preview-paper,
            .no-print {
              display: none !important;
            }

            /* Show and position the print area */
            .order-print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 5mm !important;
              background: white !important;
            }

            /* Force A4 Landscape */
            @page {
              size: A4 landscape;
              margin: 0;
            }
          }

          /* Screen Styles (Overlay) */
          .print-preview-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.8);
            z-index: 50;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 20px;
            overflow-y: auto;
          }
          .print-preview-toolbar {
            background: white;
            padding: 10px 20px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: 100%;
            max-width: 1123px; /* A4 width roughly */
            margin-bottom: 20px;
          }
          .print-preview-paper {
            background: white;
            width: 100%;
            max-width: 297mm; /* A4 Landscape width */
            min-height: 210mm;
            padding: 10mm;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            margin-bottom: 50px;
          }
        `}
      </style>

      {/* --- UI PREVIEW (Visible on Screen) --- */}
      <div className="print-preview-overlay no-print">
        <div className="print-preview-toolbar">
          <div>
            <h2 className="font-bold text-lg text-gray-800">معاينة الطباعة</h2>
            <span className="text-sm text-gray-500">#{order?.order_number}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleHtmlPrint} className="bg-green-600 hover:bg-green-700 text-white">
              <Printer className="w-4 h-4 ml-2" /> طباعة
            </Button>
            <Button onClick={handlePdfExport} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Download className="w-4 h-4 ml-2" /> PDF
            </Button>
            <Button onClick={onClose} variant="secondary">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* The visual paper on screen (used for PDF capture) */}
        <div className="print-preview-paper" ref={printPreviewRef}>
          <PrintContent 
            data={{ order, customer, salesRep, productionOrders: sortedOrders, customerProductsMap, itemsMap, totalWeight, orderDateStr, deliveryDateStr, qrUrl }} 
          />
        </div>
      </div>

      {/* --- ACTUAL PRINT AREA (Hidden on Screen, Visible on Print) --- */}
      {/* Note: We render this separately so we can apply the 'position: fixed' hack 
         without messing up the scrollable preview overlay.
      */}
      <div className="order-print-area" style={{ display: isPrinting ? 'block' : 'none' }}>
         <PrintContent 
            data={{ order, customer, salesRep, productionOrders: sortedOrders, customerProductsMap, itemsMap, totalWeight, orderDateStr, deliveryDateStr, qrUrl }} 
          />
      </div>
    </div>
  );
}

// --- Content Component (Reused for Preview and Print) ---
function PrintContent({ data }: { data: any }) {
  const { order, customer, salesRep, productionOrders, customerProductsMap, itemsMap, totalWeight, orderDateStr, deliveryDateStr, qrUrl } = data;

  // Inline styles for guaranteed print consistency
  const styles = {
    page: { width: "100%", fontFamily: "Segoe UI, Tahoma, Arial, sans-serif", direction: "rtl" as const, color: "#000", fontWeight: 600 as const },
    header: { display: "flex", borderBottom: "2px solid #1a365d", paddingBottom: "10px", marginBottom: "15px" },
    h1: { fontSize: "22px", color: "#1a365d", margin: 0, fontWeight: 800 as const },
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "12px", marginBottom: "10px", fontWeight: 600 as const },
    th: { background: "#e8f4fd", border: "1px solid #666", padding: "6px", color: "black", fontWeight: 800 as const, textAlign: "center" as const },
    td: { border: "1px solid #666", padding: "5px", textAlign: "center" as const, fontWeight: 600 as const },
    metaBox: { fontSize: "13px", textAlign: "left" as const, fontWeight: 600 as const },
    footer: { display: "flex", justifyContent: "space-between", marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px" }
  };

  return (
    <div className="print-content-root" style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <div style={{ flex: 1 }}>
          <h1 style={styles.h1}>مصنع أكياس البلاستيك الحديث</h1>
          <p style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>Modern Plastic Bags factory</p>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h2 style={{ fontSize: "18px", margin: 0, color: "#1a365d" }}>أمر تشغيل إنتاج</h2>
          <span style={{ fontSize: "12px", fontWeight: "bold" }}>PRODUCTION ORDER</span>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <div style={styles.metaBox}>
            <div><strong>رقم الطلب:</strong> #{order?.order_number}</div>
            <div><strong>التاريخ:</strong> {orderDateStr}</div>
            <div><strong>التسليم:</strong> {deliveryDateStr}</div>
          </div>
          <img src={qrUrl} alt="QR" width="70" height="70" />
        </div>
      </div>

      {/* Info Table */}
      <table style={styles.table}>
        <tbody>
          <tr>
            <td style={{ ...styles.td, background: "#f8f9fa", width: "10%" }}>العميل</td>
            <td style={{ ...styles.td, width: "35%", textAlign: "right", fontWeight: "bold" }}>
              {customer?.name_ar || customer?.name}
              <div style={{ fontSize: "10px", fontWeight: "normal" }}>{customer?.phone}</div>
            </td>
            <td style={{ ...styles.td, background: "#f8f9fa", width: "10%" }}>المندوب</td>
            <td style={{ ...styles.td, width: "25%" }}>{salesRep?.full_name || "-"}</td>
            <td style={{ ...styles.td, background: "#1a365d", color: "white", width: "10%" }}>الإجمالي</td>
            <td style={{ ...styles.td, background: "#e8f4fd", fontWeight: "bold", fontSize: "14px" }}>
              {formatNumber(totalWeight)} كجم
            </td>
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: "4%" }}>#</th>
            <th style={{ ...styles.th, width: "18%", textAlign: "right" }}>الصنف</th>
            <th style={{ ...styles.th, width: "8%" }}>المقاس</th>
            <th style={{ ...styles.th, width: "12%" }}>المواصفات</th>
            <th style={{ ...styles.th, width: "8%" }}>الخامة</th>
            <th style={{ ...styles.th, width: "6%" }}>الطباعة</th>
            <th style={{ ...styles.th, width: "10%" }}>مقاس السلندر</th>
            <th style={{ ...styles.th, width: "8%" }}>الكمية</th>
            <th style={{ ...styles.th, width: "18%" }}>ملاحظات</th>
          </tr>
        </thead>
        <tbody>
          {productionOrders.map((po: any, idx: number) => {
            const cp = customerProductsMap.get(po.customer_product_id);
            const item = cp ? itemsMap.get(cp.item_id) : undefined;
            const color = getMasterBatchInfo(cp?.master_batch_id);
            const qty = Number(po.final_quantity_kg ?? po.quantity_kg ?? 0);

            return (
              <tr key={po.id}>
                <td style={styles.td}>{idx + 1}</td>
                <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                  {item?.name_ar || item?.name || "-"}
                  <div style={{ fontSize: "10px", color: "#444", fontWeight: 600 }}>{cp?.size_caption}</div>
                </td>
                <td style={{ ...styles.td, direction: "ltr" }}>{cp?.width ? `${cp.width} cm` : "-"}</td>
                <td style={styles.td}>
                   <div style={{ direction: "ltr" }}>{cp?.thickness ? `${cp.thickness} mic` : "-"}</div>
                   <div style={{ fontSize: "10px", fontWeight: 600 }}>{color.name_ar}</div>
                </td>
                <td style={{ ...styles.td, fontWeight: 700 }}>{cp?.raw_material || "بيور"}</td>
                <td style={styles.td}>
                   {cp?.is_printed ? <span style={{color:"#16a34a", fontWeight: 800, fontSize: "16px"}}>✓</span> : <span style={{color:"#dc2626", fontWeight: 800, fontSize: "16px"}}>✗</span>}
                </td>
                <td style={{ ...styles.td, fontWeight: 700 }}>{cp?.printing_cylinder || "-"}</td>
                <td style={{ ...styles.td, fontWeight: 800, fontSize: "13px" }}>{formatNumber(qty)}</td>
                <td style={{ ...styles.td, fontSize: "10px", textAlign: "right", fontWeight: 600 }}>{po.notes || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer Notes & Signatures */}
      <div style={{ border: "1px solid #ccc", padding: "5px", marginBottom: "15px", borderRadius: "4px", minHeight: "40px" }}>
        <strong style={{ fontSize: "11px", display: "block", marginBottom: "3px" }}>ملاحظات عامة:</strong>
        <span style={{ fontSize: "11px" }}>{order?.notes || "لا توجد ملاحظات"}</span>
      </div>

      <div style={styles.footer}>
        <div style={{ textAlign: "center", width: "30%" }}>
           <div style={{ fontSize: "11px", marginBottom: "30px" }}>مدير الإنتاج</div>
           <div style={{ borderTop: "1px solid #000", width: "60%", margin: "0 auto" }}></div>
        </div>
        <div style={{ textAlign: "center", width: "30%" }}>
           <div style={{ fontSize: "11px", marginBottom: "30px" }}>مسؤول الجودة</div>
           <div style={{ borderTop: "1px solid #000", width: "60%", margin: "0 auto" }}></div>
        </div>
        <div style={{ textAlign: "center", width: "30%" }}>
           <div style={{ fontSize: "11px", marginBottom: "30px" }}>أمين المستودع</div>
           <div style={{ borderTop: "1px solid #000", width: "60%", margin: "0 auto" }}></div>
        </div>
      </div>

      <div style={{ textAlign: "center", marginTop: "10px", fontSize: "9px", color: "#888" }}>
        SYSTEM GENERATED | {new Date().toLocaleString('en-GB')}
      </div>
    </div>
  );
}