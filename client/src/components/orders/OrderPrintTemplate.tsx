import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface OrderPrintTemplateProps {
  order: any;
  customer: any;
  productionOrders: any[];
  customerProducts: any[];
  items: any[];
  categories: any[];
  onClose: () => void;
}

const masterBatchColors = [
  { id: "PT-111111", name: "White", name_ar: "أبيض", color: "#FFFFFF", textColor: "#000000" },
  { id: "PT-000000", name: "Black", name_ar: "أسود", color: "#000000", textColor: "#FFFFFF" },
  { id: "PT-160060", name: "Terracotta", name_ar: "تيراكوتا", color: "#CC4E3A", textColor: "#FFFFFF" },
  { id: "PT-160061", name: "Coffee Brown", name_ar: "بني قهوة", color: "#4B2E2B", textColor: "#FFFFFF" },
  { id: "PT-160055", name: "Chocolate", name_ar: "بني شوكولا", color: "#7B3F00", textColor: "#FFFFFF" },
  { id: "PT-102004", name: "Dark Silver", name_ar: "فضي داكن", color: "#6E6E6E", textColor: "#000000" },
  { id: "PT-101008", name: "Gold", name_ar: "ذهبي", color: "#D4AF37", textColor: "#000000" },
  { id: "PT-150245", name: "Pistachio Green", name_ar: "أخضر فستقي", color: "#93C572", textColor: "#000000" },
  { id: "PT-150086", name: "Light Green", name_ar: "أخضر فاتح", color: "#90EE90", textColor: "#000000" },
  { id: "PT-170028", name: "Light Grey", name_ar: "رمادي فاتح", color: "#B0B0B0", textColor: "#000000" },
  { id: "PT-180361", name: "Dark Pink", name_ar: "وردي داكن", color: "#D81B60", textColor: "#FFFFFF" },
  { id: "PT-180374", name: "Pastel Pink", name_ar: "وردي باستيل", color: "#FFB6C1", textColor: "#000000" },
  { id: "PT-180375", name: "Baby Pink", name_ar: "وردي فاتح", color: "#F4C2C2", textColor: "#000000" },
  { id: "PT-140079", name: "Light Blue", name_ar: "أزرق فاتح", color: "#66B2FF", textColor: "#000000" },
  { id: "PT-140340", name: "Dark Blue", name_ar: "أزرق داكن", color: "#0033A0", textColor: "#FFFFFF" },
  { id: "PT-140352", name: "Pure Blue", name_ar: "أزرق صافي", color: "#0057FF", textColor: "#FFFFFF" },
  { id: "PT-140080", name: "African Violet", name_ar: "بنفسجي أفريقي", color: "#B284BE", textColor: "#000000" },
  { id: "PT-140114", name: "Royal Purple", name_ar: "بنفسجي ملكي", color: "#613399", textColor: "#FFFFFF" },
  { id: "PT-120074", name: "Dark Ivory", name_ar: "عاجي داكن", color: "#E2DCC8", textColor: "#000000" },
  { id: "PT-130232-A", name: "Sunflower Yellow", name_ar: "أصفر دوار الشمس", color: "#FFDA03", textColor: "#000000" },
  { id: "PT-130112", name: "Lemon Yellow", name_ar: "أصفر ليموني", color: "#FFF44F", textColor: "#000000" },
  { id: "PT-130231", name: "Yellow", name_ar: "أصفر", color: "#FFD000", textColor: "#000000" },
  { id: "PT-130232-B", name: "Golden Yellow", name_ar: "أصفر ذهبي", color: "#FFC000", textColor: "#000000" },
  { id: "PT-180370", name: "Orange", name_ar: "برتقالي 805", color: "#FF7A00", textColor: "#FFFFFF" },
  { id: "PT-180363", name: "Orange", name_ar: "برتقالي 801", color: "#FF5A1F", textColor: "#FFFFFF" },
  { id: "PT-180122", name: "Tomato Red", name_ar: "أحمر طماطمي", color: "#E53935", textColor: "#FFFFFF" },
  { id: "PT-MIX", name: "MIX", name_ar: "مخلوط", color: "#E2DCC8", textColor: "#000000" },
  { id: "PT-CLEAR", name: "CLEAR", name_ar: "شفاف", color: "#E2DCC8", textColor: "#000000" },
];

const getMasterBatchInfo = (masterBatchId: string) => {
  if (!masterBatchId) return { name_ar: "غير محدد", color: "#E2DCC8", textColor: "#000000" };
  const color = masterBatchColors.find((c) => c.id === masterBatchId);
  return color || { name_ar: masterBatchId, color: "#E2DCC8", textColor: "#000000" };
};

export default function OrderPrintTemplate({
  order,
  customer,
  productionOrders,
  customerProducts,
  items,
  categories,
  onClose,
}: OrderPrintTemplateProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const salesRep = users?.find((u: any) => u.id === customer?.sales_rep_id);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const qrData = JSON.stringify({
          type: "order",
          order_id: order.id,
          order_number: order.order_number,
          customer: customer?.name_ar || customer?.name,
          date: order.created_at,
        });
        const qrUrl = await QRCode.toDataURL(qrData, {
          width: 120,
          margin: 1,
          errorCorrectionLevel: "M",
        });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error("خطأ في إنشاء رمز QR:", error);
      }
    };
    generateQRCode();
  }, [order, customer]);

  const handlePrint = () => {
    window.print();
  };

  const orderProductionOrders = productionOrders.filter(
    (po: any) => po.order_id === order.id
  );

  return (
    <>
      <div className="no-print fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-[95vw] max-h-[95vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <h2 className="text-xl font-bold text-gray-800">معاينة طباعة الطلب</h2>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
                data-testid="button-print-order"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                طباعة
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                data-testid="button-close-print"
              >
                إغلاق
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden" style={{ width: "297mm", minHeight: "200mm" }}>
              <PrintContent
                order={order}
                customer={customer}
                salesRep={salesRep}
                orderProductionOrders={orderProductionOrders}
                customerProducts={customerProducts}
                items={items}
                qrCodeUrl={qrCodeUrl}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media screen {
          .print-only {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-only, .print-only * {
            visibility: visible !important;
            display: block !important;
          }
          .print-only {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="print-only">
        <PrintContent
          order={order}
          customer={customer}
          salesRep={salesRep}
          orderProductionOrders={orderProductionOrders}
          customerProducts={customerProducts}
          items={items}
          qrCodeUrl={qrCodeUrl}
        />
      </div>
    </>
  );
}

function PrintContent({
  order,
  customer,
  salesRep,
  orderProductionOrders,
  customerProducts,
  items,
  qrCodeUrl,
}: any) {
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      waiting: "قيد الانتظار",
      for_production: "جاهز للإنتاج",
      in_production: "قيد الإنتاج",
      completed: "مكتمل",
      cancelled: "ملغي",
      on_hold: "معلق",
      pending: "معلق",
    };
    return statusMap[status] || status;
  };

  const totalRequiredQty = orderProductionOrders.reduce(
    (sum: number, po: any) => sum + parseFloat(po.final_quantity_kg || po.quantity_kg || 0), 0
  );

  return (
    <div style={{ 
      fontFamily: "Arial, sans-serif", 
      direction: "rtl", 
      padding: "10mm", 
      background: "#fff",
      width: "297mm",
      margin: "0 auto",
      boxSizing: "border-box",
      minHeight: "210mm"
    }}>
      
      {/* Header */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "8mm", 
        paddingBottom: "5mm", 
        borderBottom: "3px solid #1e40af" 
      }}>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="QR Code" style={{ width: "35mm", height: "35mm" }} />
          )}
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e40af", margin: "0 0 5px 0" }}>أمر تشغيل إنتاج</h1>
            <p style={{ fontSize: "18px", color: "#64748b", margin: 0 }}>رقم الطلب: <span style={{ fontWeight: "bold", color: "#1e293b" }}>{order.order_number}</span></p>
          </div>
        </div>
        
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "16px", color: "#64748b", marginBottom: "5px" }}>التاريخ: {format(new Date(order.created_at), "yyyy/MM/dd")}</div>
          <div style={{ 
            background: "#eff6ff", 
            color: "#1e40af", 
            padding: "5px 15px", 
            borderRadius: "8px", 
            fontSize: "14px", 
            fontWeight: "bold",
            display: "inline-block"
          }}>
            {getStatusText(order.status)}
          </div>
        </div>
      </div>

      {/* Customer Info Grid */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr", 
        gap: "15px", 
        marginBottom: "8mm",
        padding: "15px",
        background: "#f8fafc",
        borderRadius: "10px",
        border: "1px solid #e2e8f0"
      }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "3px" }}>العميل (عربي):</label>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>{customer?.name_ar || "-"}</div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "3px" }}>العميل (English):</label>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>{customer?.name || "-"}</div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "3px" }}>كود العميل:</label>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>{customer?.customer_code || "-"}</div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "3px" }}>رقم الدرج:</label>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>{customer?.plate_drawer_code || "-"}</div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "3px" }}>مندوب المبيعات:</label>
          <div style={{ fontWeight: "bold", fontSize: "18px" }}>{salesRep?.name || "-"}</div>
        </div>
        <div>
          <label style={{ display: "block", fontSize: "12px", color: "#64748b", marginBottom: "3px" }}>ملاحظات الطلب:</label>
          <div style={{ fontWeight: "normal", fontSize: "16px" }}>{order.notes || "لا يوجد"}</div>
        </div>
      </div>

      {/* Production Orders Table */}
      <div style={{ marginBottom: "10mm" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>#</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>رقم الأمر</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>المنتج</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>المقاس</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>العرض</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>الطول</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>السماكة</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>اللون</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>التخريم</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>طباعة</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>الكمية (كجم)</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px", fontWeight: "bold", color: "#334155" }}>ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {orderProductionOrders.map((po: any, index: number) => {
              const customerProduct = customerProducts.find((cp: any) => cp.id === po.customer_product_id);
              const item = items.find((i: any) => i.id === customerProduct?.item_id);
              const colorInfo = getMasterBatchInfo(customerProduct?.master_batch_id);
              
              const requiredQty = parseFloat(po.final_quantity_kg || po.quantity_kg || 0);

              return (
                <tr key={po.id} style={{ background: index % 2 === 0 ? "#fff" : "#f8fafc" }}>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{index + 1}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center", fontWeight: "bold", color: "#1e40af" }}>{po.production_order_number}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>{item?.name_ar || item?.name || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.size_caption || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.width || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.cutting_length_cm ? `${customerProduct.cutting_length_cm} سم` : "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.thickness || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>
                    <span style={{ 
                      background: colorInfo.color, 
                      color: colorInfo.textColor, 
                      padding: "2px 8px", 
                      borderRadius: "4px",
                      fontSize: "12px",
                      border: colorInfo.color === "#FFFFFF" ? "1px solid #ccc" : "none"
                    }}>
                      {colorInfo.name_ar}
                    </span>
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.punching || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>
                    {customerProduct?.is_printed ? "نعم" : "لا"}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center", fontWeight: "bold" }}>{requiredQty.toFixed(2)}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "8px", fontSize: "12px", color: "#64748b" }}>{po.notes || "-"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "#1e40af", color: "#fff" }}>
              <td colSpan={10} style={{ border: "1px solid #1e40af", padding: "10px", fontWeight: "bold", textAlign: "left", fontSize: "16px" }}>المجموع الإجمالي:</td>
              <td style={{ border: "1px solid #1e40af", padding: "10px", textAlign: "center", fontWeight: "bold", fontSize: "16px" }}>{totalRequiredQty.toFixed(2)}</td>
              <td style={{ border: "1px solid #1e40af", padding: "10px" }}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer / Signatures */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 1fr 1fr 1fr", 
        gap: "30px",
        marginTop: "15mm",
        borderTop: "2px solid #e2e8f0",
        paddingTop: "10mm"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "20mm" }}>إعداد / مندوب المبيعات</div>
          <div style={{ borderTop: "1px dashed #64748b", width: "80%", margin: "0 auto" }}></div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "20mm" }}>مدير المبيعات</div>
          <div style={{ borderTop: "1px dashed #64748b", width: "80%", margin: "0 auto" }}></div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "20mm" }}>مدير الإنتاج</div>
          <div style={{ borderTop: "1px dashed #64748b", width: "80%", margin: "0 auto" }}></div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "20mm" }}>المدير العام</div>
          <div style={{ borderTop: "1px dashed #64748b", width: "80%", margin: "0 auto" }}></div>
        </div>
      </div>
    </div>
  );
}
