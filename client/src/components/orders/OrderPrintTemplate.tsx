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
        .print-only-content {
          display: none;
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only-content {
            display: block !important;
          }
        }
      `}</style>

      <div className="print-only-content">
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
    <div style={{ fontFamily: "Arial, sans-serif", direction: "rtl", padding: "12mm", background: "#fff" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8mm", paddingBottom: "6mm", borderBottom: "3px solid #1e40af" }}>
        
        {/* Right: Logo & Company */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "70px", height: "70px", background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="45" height="45" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 7L12 3L4 7M20 7L12 11M20 7V17L12 21M12 11L4 7M12 11V21M4 7V17L12 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "bold", color: "#1e40af", margin: 0 }}>مصنع مودرن للبلاستيك</h1>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "2px 0 0 0" }}>Modern Plastic Bags Factory</p>
          </div>
        </div>

        {/* Center: Order Title */}
        <div style={{ textAlign: "center" }}>
          <div style={{ background: "#1e40af", color: "#fff", padding: "10px 40px", borderRadius: "8px", marginBottom: "6px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>طلب عميل</h2>
            <p style={{ fontSize: "11px", margin: "2px 0 0 0", opacity: 0.9 }}>Customer Order</p>
          </div>
          <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e40af" }}>
            #{order.order_number}
          </div>
        </div>

        {/* Left: QR Code */}
        <div style={{ textAlign: "center" }}>
          {qrCodeUrl && <img src={qrCodeUrl} alt="QR" style={{ width: "80px", height: "80px", border: "2px solid #e5e7eb", borderRadius: "8px" }} />}
          <p style={{ fontSize: "9px", color: "#64748b", margin: "4px 0 0 0" }}>امسح للتفاصيل</p>
        </div>
      </div>

      {/* Customer Info Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "10px", marginBottom: "8mm" }}>
        
        {/* Customer Name */}
        <div style={{ gridColumn: "span 2", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "10px", color: "#0369a1", marginBottom: "4px", fontWeight: "600" }}>اسم العميل / Customer Name</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#0c4a6e" }}>{customer?.name_ar || "-"}</div>
          <div style={{ fontSize: "12px", color: "#0369a1" }}>{customer?.name || "-"}</div>
        </div>

        {/* Customer Code */}
        <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "10px", color: "#92400e", marginBottom: "4px", fontWeight: "600" }}>رقم العميل</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#78350f" }}>{customer?.customer_code || customer?.id || "-"}</div>
        </div>

        {/* Drawer Code */}
        <div style={{ background: "#fce7f3", border: "1px solid #f9a8d4", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "10px", color: "#9d174d", marginBottom: "4px", fontWeight: "600" }}>رقم الدرج</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#831843" }}>{customer?.plate_drawer_code || "-"}</div>
        </div>

        {/* Sales Rep */}
        <div style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "10px", color: "#166534", marginBottom: "4px", fontWeight: "600" }}>المندوب</div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#14532d" }}>{salesRep?.full_name || salesRep?.display_name || salesRep?.username || "-"}</div>
        </div>

        {/* Date */}
        <div style={{ background: "#f3e8ff", border: "1px solid #d8b4fe", borderRadius: "8px", padding: "12px" }}>
          <div style={{ fontSize: "10px", color: "#7c3aed", marginBottom: "4px", fontWeight: "600" }}>التاريخ</div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#5b21b6" }}>
            {order.created_at ? format(new Date(order.created_at), "yyyy/MM/dd") : "-"}
          </div>
        </div>
      </div>

      {/* Additional Info Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px", marginBottom: "8mm" }}>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>تاريخ التسليم:</span>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>{order.delivery_date ? format(new Date(order.delivery_date), "yyyy/MM/dd") : "-"}</span>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>الهاتف:</span>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>{customer?.phone || "-"}</span>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>المدينة:</span>
          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>{customer?.city || "-"}</span>
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "#64748b" }}>الحالة:</span>
          <span style={{ fontSize: "11px", fontWeight: "bold", color: "#fff", background: "#1e40af", padding: "2px 10px", borderRadius: "12px" }}>{getStatusText(order.status)}</span>
        </div>
      </div>

      {/* Production Orders Table */}
      <div style={{ marginBottom: "6mm" }}>
        <div style={{ background: "#1e40af", color: "#fff", padding: "8px 16px", borderRadius: "8px 8px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "14px", fontWeight: "bold", margin: 0 }}>أوامر الإنتاج - Production Orders</h3>
          <span style={{ fontSize: "12px", background: "rgba(255,255,255,0.2)", padding: "2px 12px", borderRadius: "12px" }}>{orderProductionOrders.length} أمر</span>
        </div>
        
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", border: "1px solid #e2e8f0" }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "3%" }}>#</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "9%" }}>رقم الأمر</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "14%" }}>المنتج</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "10%" }}>المقاس</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "6%" }}>العرض</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "6%" }}>الطول</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "6%" }}>السماكة</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "8%" }}>اللون</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "8%" }}>التخريم</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "5%" }}>طباعة</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "8%" }}>الكمية (كجم)</th>
              <th style={{ border: "1px solid #e2e8f0", padding: "8px 6px", fontWeight: "bold", color: "#334155", width: "17%" }}>ملاحظات</th>
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
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center", fontWeight: "bold" }}>{index + 1}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center", fontWeight: "600", color: "#1e40af" }}>{po.production_order_number}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px" }}>{item?.name_ar || item?.name || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center" }}>{customerProduct?.size_caption || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center" }}>{customerProduct?.width || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center" }}>{customerProduct?.cutting_length_cm ? `${customerProduct.cutting_length_cm} سم` : "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center" }}>{customerProduct?.thickness || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center" }}>
                    <span style={{ 
                      background: colorInfo.color, 
                      color: colorInfo.textColor, 
                      padding: "2px 8px", 
                      borderRadius: "4px",
                      fontSize: "9px",
                      border: colorInfo.color === "#FFFFFF" ? "1px solid #ccc" : "none"
                    }}>
                      {colorInfo.name_ar}
                    </span>
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center", fontSize: "9px" }}>{customerProduct?.punching || "-"}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center" }}>
                    {customerProduct?.is_printed ? (
                      <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓ نعم</span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>لا</span>
                    )}
                  </td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", textAlign: "center", fontWeight: "bold" }}>{requiredQty.toFixed(2)}</td>
                  <td style={{ border: "1px solid #e2e8f0", padding: "6px", fontSize: "9px", color: "#64748b" }}>{po.notes || "-"}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background: "#1e40af", color: "#fff" }}>
              <td colSpan={10} style={{ border: "1px solid #1e40af", padding: "8px", fontWeight: "bold", textAlign: "left" }}>المجموع الإجمالي:</td>
              <td style={{ border: "1px solid #1e40af", padding: "8px", textAlign: "center", fontWeight: "bold" }}>{totalRequiredQty.toFixed(2)}</td>
              <td style={{ border: "1px solid #1e40af", padding: "8px" }}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {order.notes && (
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "6px", padding: "10px 16px", marginBottom: "6mm" }}>
          <span style={{ fontWeight: "bold", color: "#92400e" }}>ملاحظات: </span>
          <span style={{ color: "#78350f" }}>{order.notes}</span>
        </div>
      )}

      {/* Footer with Signatures */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", paddingTop: "6mm", borderTop: "2px solid #e2e8f0" }}>
        <div style={{ display: "flex", gap: "30px" }}>
          {["الإعداد", "المراجعة", "المندوب", "الإدارة"].map((label) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{ width: "90px", height: "40px", borderBottom: "2px solid #334155", marginBottom: "4px" }}></div>
              <span style={{ fontSize: "10px", color: "#64748b" }}>{label}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "left", fontSize: "9px", color: "#94a3b8" }}>
          <div>طُبع في: {format(new Date(), "yyyy/MM/dd - HH:mm")}</div>
          <div>نظام إدارة الإنتاج - Modern PBF</div>
        </div>
      </div>
    </div>
  );
}
