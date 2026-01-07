import { useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
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
  priority?: string;
}

interface Customer {
  id: string;
  name_ar?: string;
  name?: string;
  sales_rep_id?: string;
  phone?: string;
  commercial_name?: string;
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
  length?: number | string;
  thickness?: number | string;
  raw_material?: string;
  is_printed?: boolean;
  master_batch_id?: string;
  print_colors?: string;
  printing_cylinder?: string;
  handle_type?: string;
  unit_weight_gram?: number | string;
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

  const hasAutoTriggered = useRef(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

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
    const qrData = [
      `رقم الطلب: ${order?.order_number || '-'}`,
      `العميل: ${customer?.name_ar || customer?.name || '-'}`,
      `التاريخ: ${orderDateStr}`,
      `التسليم: ${deliveryDateStr}`,
      `الإجمالي: ${totalWeight.toFixed(2)} كجم`,
      `المندوب: ${salesRep?.full_name || '-'}`,
    ].join('\n');
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}&color=000000`;
  }, [order?.order_number, customer, orderDateStr, deliveryDateStr, totalWeight, salesRep]);

  const handleDirectPrint = useCallback(async () => {
    if (!canPrint) return;
    await new Promise((r) => setTimeout(r, 200));
    window.print();
    setTimeout(onClose, 500);
  }, [canPrint, onClose]);

  const handleDirectPdf = useCallback(async () => {
    if (!canPrint) return;
    const element = printContainerRef.current;
    if (!element) return;
    
    await new Promise((r) => setTimeout(r, 300));
    
    const canvas = await html2canvas(element, {
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
    const margin = 5;
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imgWidth, imgHeight);
    pdf.save(`أمر_تشغيل_${order?.order_number || "new"}.pdf`);
    onClose();
  }, [canPrint, order?.order_number, onClose]);

  const handleStandalone = useCallback(() => {
    const element = printContainerRef.current;
    if (!element) return;
    
    const newWindow = window.open("", "_blank");
    if (!newWindow) return;

    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>أمر تشغيل #${order?.order_number}</title>
          <style>
            @page { size: A4 landscape; margin: 5mm; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 20px; font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; font-weight: 600; background: white; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px; }
            th { background: #e8f4fd; border: 1px solid #666; padding: 8px; font-weight: 800; text-align: center; }
            td { border: 1px solid #666; padding: 6px; text-align: center; font-weight: 600; }
            img { max-width: 100%; }
            .header { display: flex; border-bottom: 2px solid #1a365d; padding-bottom: 10px; margin-bottom: 15px; }
            .header > div { flex: 1; }
            h1 { font-size: 22px; color: #1a365d; margin: 0; font-weight: 800; }
            .print-btn { position: fixed; top: 10px; left: 10px; padding: 10px 20px; background: #16a34a; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; font-weight: bold; }
            .print-btn:hover { background: #15803d; }
            @media print { .print-btn { display: none; } }
          </style>
        </head>
        <body>
          <button class="print-btn" onclick="window.print()">🖨️ طباعة</button>
          ${element.innerHTML}
        </body>
      </html>
    `);
    newWindow.document.close();
    onClose();
  }, [order?.order_number, onClose]);

  useEffect(() => {
    if (hasAutoTriggered.current || !canPrint) return;
    hasAutoTriggered.current = true;

    const delay = 400;
    if (mode === "html") {
      setTimeout(handleDirectPrint, delay);
    } else if (mode === "pdf") {
      setTimeout(handleDirectPdf, delay);
    } else if (mode === "standalone") {
      setTimeout(handleStandalone, delay);
    }
  }, [mode, canPrint, handleDirectPrint, handleDirectPdf, handleStandalone]);

  const styles = {
    page: { width: "100%", fontFamily: "Segoe UI, Tahoma, Arial, sans-serif", direction: "rtl" as const, color: "#000", fontWeight: 600 as const, padding: "10px" },
    header: { display: "flex", borderBottom: "2px solid #1a365d", paddingBottom: "10px", marginBottom: "15px" },
    h1: { fontSize: "22px", color: "#1a365d", margin: 0, fontWeight: 800 as const },
    table: { width: "100%", borderCollapse: "collapse" as const, fontSize: "11px", marginBottom: "10px", fontWeight: 600 as const },
    th: { background: "#e8f4fd", border: "1px solid #666", padding: "6px", color: "black", fontWeight: 800 as const, textAlign: "center" as const },
    td: { border: "1px solid #666", padding: "5px", textAlign: "center" as const, fontWeight: 600 as const },
    metaBox: { fontSize: "12px", textAlign: "left" as const, fontWeight: 600 as const },
    footer: { display: "flex", justifyContent: "space-between", marginTop: "20px", borderTop: "1px solid #ccc", paddingTop: "10px" }
  };

  return (
    <>
      <style>
        {`
          @media print {
            body > *:not(.order-print-container) { display: none !important; }
            .order-print-container { display: block !important; position: static !important; left: auto !important; }
            .order-print-area { position: static !important; left: auto !important; }
            @page { size: A4 landscape; margin: 5mm; }
          }
        `}
      </style>
      
      <div className="order-print-container" style={{ position: 'fixed', left: '-9999px', top: 0, width: '297mm', background: 'white' }}>
        <div className="order-print-area" ref={printContainerRef} style={styles.page}>
          
          <div style={styles.header}>
            <div style={{ flex: 1 }}>
              <h1 style={styles.h1}>مصنع أكياس البلاستيك الحديث</h1>
              <p style={{ margin: "2px 0", fontSize: "12px", color: "#666" }}>Modern Plastic Bags Factory</p>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <h2 style={{ fontSize: "18px", margin: 0, color: "#1a365d", fontWeight: 800 }}>أمر تشغيل إنتاج</h2>
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

          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={{ ...styles.td, background: "#f8f9fa", width: "8%" }}>العميل</td>
                <td style={{ ...styles.td, width: "25%", textAlign: "right", fontWeight: 700 }}>
                  {customer?.name_ar || "-"}
                  <div style={{ fontSize: "10px", fontWeight: 600, color: "#444" }}>{customer?.name || customer?.commercial_name || ""}</div>
                  <div style={{ fontSize: "9px", fontWeight: 500, color: "#666" }}>{customer?.phone || ""}</div>
                </td>
                <td style={{ ...styles.td, background: "#f8f9fa", width: "8%" }}>المندوب</td>
                <td style={{ ...styles.td, width: "15%" }}>{salesRep?.full_name || "-"}</td>
                <td style={{ ...styles.td, background: "#f8f9fa", width: "8%" }}>الحالة</td>
                <td style={{ ...styles.td, width: "10%" }}>{order?.status || "-"}</td>
                <td style={{ ...styles.td, background: "#1a365d", color: "white", width: "8%" }}>الإجمالي</td>
                <td style={{ ...styles.td, background: "#e8f4fd", fontWeight: 800, fontSize: "13px" }}>
                  {formatNumber(totalWeight)} كجم
                </td>
              </tr>
            </tbody>
          </table>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "3%" }}>#</th>
                <th style={{ ...styles.th, width: "14%", textAlign: "right" }}>الصنف</th>
                <th style={{ ...styles.th, width: "8%" }}>المقاس (عرض)</th>
                <th style={{ ...styles.th, width: "6%" }}>الطول</th>
                <th style={{ ...styles.th, width: "6%" }}>السماكة</th>
                <th style={{ ...styles.th, width: "8%" }}>الخامة</th>
                <th style={{ ...styles.th, width: "8%" }}>اللون</th>
                <th style={{ ...styles.th, width: "5%" }}>الطباعة</th>
                <th style={{ ...styles.th, width: "8%" }}>السلندر</th>
                <th style={{ ...styles.th, width: "8%" }}>اليد</th>
                <th style={{ ...styles.th, width: "8%" }}>الكمية (كجم)</th>
                <th style={{ ...styles.th, width: "12%" }}>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((po: ProductionOrder, idx: number) => {
                const cp = customerProductsMap.get(po.customer_product_id);
                const item = cp ? itemsMap.get(cp.item_id) : undefined;
                const color = getMasterBatchInfo(cp?.master_batch_id);
                const qty = Number(po.final_quantity_kg ?? po.quantity_kg ?? 0);

                return (
                  <tr key={po.id}>
                    <td style={styles.td}>{idx + 1}</td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>
                      {item?.name_ar || item?.name || "-"}
                      <div style={{ fontSize: "9px", color: "#555", fontWeight: 500 }}>{cp?.size_caption}</div>
                    </td>
                    <td style={{ ...styles.td, direction: "ltr" }}>{cp?.width ? `${cp.width} cm` : "-"}</td>
                    <td style={{ ...styles.td, direction: "ltr" }}>{cp?.length ? `${cp.length} cm` : "-"}</td>
                    <td style={{ ...styles.td, direction: "ltr" }}>{cp?.thickness ? `${cp.thickness} mic` : "-"}</td>
                    <td style={{ ...styles.td, fontWeight: 700 }}>{cp?.raw_material || "بيور"}</td>
                    <td style={styles.td}>
                      <div>{color.name_ar}</div>
                      <div style={{ fontSize: "9px", color: "#666" }}>{color.name_en}</div>
                    </td>
                    <td style={styles.td}>
                      {cp?.is_printed 
                        ? <span style={{color:"#16a34a", fontWeight: 800, fontSize: "16px"}}>✓</span> 
                        : <span style={{color:"#dc2626", fontWeight: 800, fontSize: "16px"}}>✗</span>}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 600 }}>{cp?.printing_cylinder || "-"}</td>
                    <td style={{ ...styles.td, fontSize: "10px" }}>{cp?.handle_type || "-"}</td>
                    <td style={{ ...styles.td, fontWeight: 800, fontSize: "12px" }}>{formatNumber(qty)}</td>
                    <td style={{ ...styles.td, fontSize: "9px", textAlign: "right", fontWeight: 500 }}>{po.notes || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ border: "1px solid #ccc", padding: "8px", marginBottom: "15px", borderRadius: "4px", minHeight: "40px" }}>
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
      </div>
    </>
  );
}
