import { useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../../print.css";
import factoryLogo from "../../../../attached_assets/MPBF11_1769101097739.png";

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
  plate_drawer_code?: string;
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
  cutting_length_cm?: number | string;
  thickness?: number | string;
  raw_material?: string;
  is_printed?: boolean;
  master_batch_id?: string;
  print_colors?: string;
  printing_cylinder?: string;
  handle_type?: string;
  punching?: string;
  unit_weight_gram?: number | string;
  notes?: string;
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

interface MasterBatchColor {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  hex_color: string;
  text_color?: string;
  brand?: string;
  aliases?: string;
  is_active?: boolean;
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

/** ✅ عنوان عربي فوق وإنجليزي تحت + خط أكبر/أعرض */
function Label2Lines({ ar, en }: { ar: string; en: string }) {
  return (
    <div style={{ lineHeight: 1.1 }}>
      <div style={{ fontSize: "12px", fontWeight: 900 }}>{ar}</div>
      <div style={{ fontSize: "12px", fontWeight: 800, opacity: 0.9 }}>{en}</div>
    </div>
  );
}

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

  const { data: masterBatchColors = [] } = useQuery<MasterBatchColor[]>({
    queryKey: ["/api/master-batch-colors"],
    staleTime: Infinity,
  });

  const getMasterBatchInfo = useCallback((code?: string) => {
    if (!code) return { name_ar: "غير محدد", name_en: "-", hex: "#CCCCCC" };
    const normalizedCode = code.toUpperCase().trim();
    const found = masterBatchColors.find((c) => {
      if (!c || !c.code) return false;
      if (c.code.toUpperCase() === normalizedCode) return true;
      if (c.aliases) {
        const aliasArr = c.aliases.split(",").map((a) => a.trim().toUpperCase());
        return aliasArr.includes(normalizedCode);
      }
      return false;
    });
    if (found) {
      let hex = found.hex_color;
      if (hex === "transparent" || !hex) {
        hex = "#E0E0E0";
      }
      return { name_ar: found.name_ar, name_en: found.name_en || found.name_ar, hex };
    }
    return { name_ar: code, name_en: "", hex: "#CCCCCC" };
  }, [masterBatchColors]);

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
    if (!customer?.sales_rep_id || !users?.length) return undefined;
    const repId = String(customer.sales_rep_id);
    return users.find((u) => String(u.id) === repId);
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
    // رابط طباعة الطلب مباشرة
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const printUrl = `${baseUrl}/orders?print=${order?.id}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      printUrl
    )}&color=000000`;
  }, [order?.id]);

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
    const margin = 2;
    const imgWidth = pageWidth - margin * 2;
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
            @page { size: A4 landscape; margin: 2mm; }
            * { box-sizing: border-box; }
            body { margin: 0; padding: 20px; font-family: 'Times New Roman', Times, serif; direction: rtl; font-weight: 900; font-size: 15px; background: white; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 12px; font-weight: 900; font-family: 'Times New Roman', Times, serif; }
            th { background: #e8f4fd; border: 2px solid #444; padding: 10px; font-weight: 900; text-align: center; font-size: 14px; font-family: 'Times New Roman', Times, serif; }
            td { border: 2px solid #444; padding: 8px; text-align: center; font-weight: 900; font-size: 14px; font-family: 'Times New Roman', Times, serif; }
            img { max-width: 100%; }
            .header { display: flex; border-bottom: 3px solid #1a365d; padding-bottom: 12px; margin-bottom: 18px; }
            .header > div { flex: 1; }
            h1 { font-size: 30px; color: #1a365d; margin: 0; font-weight: 900; font-family: 'Times New Roman', Times, serif; }
            .print-btn { position: fixed; top: 10px; left: 10px; padding: 12px 24px; background: #16a34a; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
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
    /** ✅ الجديد: تكبير الخط + جعله عريض */
    page: {
      width: "100%",
      fontFamily: "'Times New Roman', Times, serif",
      direction: "rtl" as const,
      color: "#000",
      fontWeight: 900 as const,
      fontSize: "15px",
      padding: "10px",
    },
    header: { display: "flex", borderBottom: "3px solid #1a365d", paddingBottom: "10px", marginBottom: "16px" },

    /** ✅ تكبير العنوان */
    h1: {
      fontSize: "25px",
      color: "#1a365d",
      margin: 0,
      fontWeight: 900 as const,
      fontFamily: "'Times New Roman', Times, serif",
    },

    /** ✅ تكبير الجداول */
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      fontSize: "14px",
      marginBottom: "12px",
      fontWeight: 900 as const,
      fontFamily: "'Times New Roman', Times, serif",
    },

    th: {
      background: "#e8f4fd",
      border: "2px solid #444",
      padding: "10px",
      color: "black",
      fontWeight: 900 as const,
      textAlign: "center" as const,
      fontSize: "14px",
      fontFamily: "'Times New Roman', Times, serif",
    },

    td: {
      border: "2px solid #444",
      padding: "8px",
      textAlign: "center" as const,
      fontWeight: 900 as const,
      fontSize: "14px",
      fontFamily: "'Times New Roman', Times, serif",
    },

    metaBox: { fontSize: "14px", textAlign: "left" as const, fontWeight: 900 as const, fontFamily: "'Times New Roman', Times, serif" },

    footer: { display: "flex", justifyContent: "space-between", marginTop: "20px", borderTop: "2px solid #ccc", paddingTop: "12px" },
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

      <div className="order-print-container" style={{ position: "fixed", left: "-9999px", top: 0, width: "297mm", background: "white" }}>
        <div className="order-print-area" ref={printContainerRef} style={styles.page}>
          <div style={styles.header}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "12px" }}>
              <img src={factoryLogo} alt="Factory Logo" style={{ width: "70px", height: "70px", objectFit: "contain" }} />
              <div>
                <h1 style={styles.h1}>مصنع أكياس البلاستيك الحديث</h1>
                <p style={{ margin: "2px 0", fontSize: "16px", color: "#666", fontWeight: 800 }}>Modern Plastic Bags Factory</p>
              </div>
            </div>

            <div style={{ flex: 1, textAlign: "center" }}>
              <h2 style={{ fontSize: "20px", margin: 0, color: "#1a365d", fontWeight: 900 }}>أمر تشغيل إنتاج</h2>
              <span style={{ fontSize: "13px", fontWeight: 800 }}>PRODUCTION ORDER</span>
            </div>

            <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <div style={styles.metaBox}>
                <div>
                  <strong>رقم الطلب:</strong> #{order?.order_number}
                </div>
                <div>
                  <strong>التاريخ:</strong> {orderDateStr}
                </div>
                <div>
                  <strong>التسليم:</strong> {deliveryDateStr}
                </div>
              </div>
              <img src={qrUrl} alt="QR" width="75" height="75" />
            </div>
          </div>

          <table style={styles.table}>
            <tbody>
              <tr>
                <td style={{ ...styles.td, background: "#f8f9fa", width: "8%" }}>
                  <Label2Lines ar="العميل" en="Customer" />
                </td>

                <td style={{ ...styles.td, width: "22%", textAlign: "right", fontWeight: 950 }}>
                  {customer?.name_ar || "-"}
                  <div style={{ fontSize: "16px", fontWeight: 900, color: "#333", marginTop: "2px" }}>
                    {customer?.name || customer?.commercial_name || ""}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 700, color: "#666" }}>{customer?.phone || ""}</div>
                </td>

                <td style={{ ...styles.td, background: "#f8f9fa", width: "6%" }}>
                  <Label2Lines ar="الدرج" en="Drawer" />
                </td>

                <td style={{ ...styles.td, width: "6%", fontWeight: 900, fontSize: "16px" }}>{customer?.plate_drawer_code || "-"}</td>

                <td style={{ ...styles.td, background: "#f8f9fa", width: "6%" }}>
                  <Label2Lines ar="المندوب" en="Sales Rep" />
                </td>

                <td style={{ ...styles.td, width: "13%", fontWeight: 900 }}>{salesRep?.full_name || "-"}</td>

                <td style={{ ...styles.td, background: "#f8f9fa", width: "6%" }}>
                  <Label2Lines ar="الحالة" en="Status" />
                </td>

                <td style={{ ...styles.td, width: "8%", fontWeight: 900 }}>{order?.status || "-"}</td>

                <td style={{ ...styles.td, background: "#1a365d", color: "white", width: "7%", fontWeight: 900 }}>
                  <Label2Lines ar="الإجمالي" en="Total" />
                </td>

                <td style={{ ...styles.td, background: "#e8f4fd", fontWeight: 900, fontSize: "20px" }}>
                  {formatNumber(totalWeight)} كجم
                </td>
              </tr>
            </tbody>
          </table>

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "3%" }}>
                  <Label2Lines ar="#" en="#" />
                </th>
                <th style={{ ...styles.th, width: "14%" }}>
                  <Label2Lines ar="الصنف" en="Product" />
                </th>
                <th style={{ ...styles.th, width: "8%" }}>
                  <Label2Lines ar="العرض" en="Size" />
                </th>
                <th style={{ ...styles.th, width: "6%" }}>
                  <Label2Lines ar="الطول" en="Length" />
                </th>
                <th style={{ ...styles.th, width: "6%" }}>
                  <Label2Lines ar="السماكة" en="Thickness" />
                </th>
                <th style={{ ...styles.th, width: "8%" }}>
                  <Label2Lines ar="المادة الخام" en="Material" />
                </th>
                <th style={{ ...styles.th, width: "8%" }}>
                  <Label2Lines ar="اللون" en="Color" />
                </th>
                <th style={{ ...styles.th, width: "5%" }}>
                  <Label2Lines ar="الطباعة" en="Print" />
                </th>
                <th style={{ ...styles.th, width: "8%" }}>
                  <Label2Lines ar="السلندر" en="Cylinder" />
                </th>
                <th style={{ ...styles.th, width: "8%" }}>
                  <Label2Lines ar="التخريم" en="Handle" />
                </th>
                <th style={{ ...styles.th, width: "8%" }}>
                  <Label2Lines ar="الكمية" en="Qty (kg)" />
                </th>
                <th style={{ ...styles.th, width: "12%" }}>
                  <Label2Lines ar="ملاحظات" en="Notes" />
                </th>
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

                    <td style={{ ...styles.td, textAlign: "center", fontWeight: 900 }}>
                      {item?.name_ar || item?.name || "-"}
                      <div style={{ fontSize: "15px", color: "#555", fontWeight: 800 }}>{cp?.size_caption}</div>
                    </td>

                    <td style={{ ...styles.td, direction: "ltr", fontWeight: 900 }}>{cp?.width ? `${cp.width} cm` : "-"}</td>
                    <td style={{ ...styles.td, direction: "ltr", fontWeight: 900 }}>{cp?.cutting_length_cm ? `${cp.cutting_length_cm} cm` : "-"}</td>
                    <td style={{ ...styles.td, direction: "ltr", fontWeight: 900 }}>{cp?.thickness ? `${cp.thickness} mic` : "-"}</td>
                    <td style={{ ...styles.td, fontWeight: 900 }}>{cp?.raw_material || "بيور"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                        <div 
                          style={{ 
                            width: "18px", 
                            height: "18px", 
                            borderRadius: "50%", 
                            backgroundColor: color.hex, 
                            border: "2px solid #333",
                            flexShrink: 0
                          }} 
                        />
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 900, fontSize: "13px" }}>{color.name_ar}</div>
                          <div style={{ fontSize: "11px", color: "#666", direction: "ltr" }}>{cp?.master_batch_id || "-"}</div>
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      {cp?.is_printed ? (
                        <span style={{ color: "#16a34a", fontWeight: 900, fontSize: "22px" }}>✓</span>
                      ) : (
                        <span style={{ color: "#dc2626", fontWeight: 900, fontSize: "22px" }}>✗</span>
                      )}
                    </td>

                    <td style={styles.td}>
                      {cp?.printing_cylinder && cp.printing_cylinder !== "بدون" ? (
                        <span style={{ fontWeight: 900 }}>{cp.printing_cylinder}</span>
                      ) : (
                        <span style={{ color: "#dc2626", fontWeight: 900, fontSize: "22px" }}>✗</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      {(cp?.punching || cp?.handle_type) && (cp?.punching !== "بدون" && cp?.handle_type !== "بدون") ? (
                        <span style={{ fontWeight: 900 }}>{cp?.punching || cp?.handle_type}</span>
                      ) : (
                        <span style={{ color: "#dc2626", fontWeight: 900, fontSize: "22px" }}>✗</span>
                      )}
                    </td>
                    <td style={{ ...styles.td, fontWeight: 900, fontSize: "18px" }}>{formatNumber(qty)}</td>
                    <td style={{ ...styles.td, fontSize: "13px", textAlign: "right", fontWeight: 900 }}>{cp?.notes || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div style={{ border: "2px solid #ccc", padding: "12px", marginBottom: "15px", borderRadius: "4px", minHeight: "50px", fontFamily: "'Times New Roman', Times, serif", fontWeight: 900 }}>
            <strong style={{ fontSize: "14px", display: "block", marginBottom: "5px", fontWeight: 900 }}>ملاحظات عامة / General Notes:</strong>
            <span style={{ fontSize: "14px", fontWeight: 900 }}>{order?.notes || "لا توجد ملاحظات"}</span>
          </div>

          <div style={styles.footer}>
            <div style={{ textAlign: "center", width: "30%", fontFamily: "'Times New Roman', Times, serif", fontWeight: 900 }}>
              <div style={{ fontSize: "14px", marginBottom: "30px", fontWeight: 900 }}>مدير الإنتاج / Production Manager</div>
              <div style={{ borderTop: "2px solid #000", width: "60%", margin: "0 auto" }}></div>
            </div>

            <div style={{ textAlign: "center", width: "30%", fontFamily: "'Times New Roman', Times, serif", fontWeight: 900 }}>
              <div style={{ fontSize: "14px", marginBottom: "30px", fontWeight: 900 }}>مسؤول الجودة / Quality Manager</div>
              <div style={{ borderTop: "2px solid #000", width: "60%", margin: "0 auto" }}></div>
            </div>

            <div style={{ textAlign: "center", width: "30%", fontFamily: "'Times New Roman', Times, serif", fontWeight: 900 }}>
              <div style={{ fontSize: "14px", marginBottom: "30px", fontWeight: 900 }}>أمين المستودع / Warehouse Keeper</div>
              <div style={{ borderTop: "2px solid #000", width: "60%", margin: "0 auto" }}></div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "10px", fontSize: "10px", color: "#888", fontWeight: 800 }}>
            SYSTEM GENERATED | {new Date().toLocaleString("en-GB")}
          </div>
        </div>
      </div>
    </>
  );
}
