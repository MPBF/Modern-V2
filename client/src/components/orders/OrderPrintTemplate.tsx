
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

interface OrderPrintTemplateProps {
  order: any;
  customer: any;
  productionOrders: any[];
  customerProducts: any[];
  items: any[];
  onClose: () => void;
}

const masterBatchColors = [
  { id: "PT-111111", name_ar: "أبيض", color: "#FFFFFF", textColor: "#000000" },
  { id: "PT-000000", name_ar: "أسود", color: "#000000", textColor: "#FFFFFF" },
  { id: "PT-160060", name_ar: "تيراكوتا", color: "#CC4E3A", textColor: "#FFFFFF" },
  { id: "PT-160061", name_ar: "بني قهوة", color: "#4B2E2B", textColor: "#FFFFFF" },
  { id: "PT-160055", name_ar: "بني شوكولا", color: "#7B3F00", textColor: "#FFFFFF" },
  { id: "PT-102004", name_ar: "فضي داكن", color: "#6E6E6E", textColor: "#000000" },
  { id: "PT-101008", name_ar: "ذهبي", color: "#D4AF37", textColor: "#000000" },
  { id: "PT-150245", name_ar: "أخضر فستقي", color: "#93C572", textColor: "#000000" },
  { id: "PT-150086", name_ar: "أخضر فاتح", color: "#90EE90", textColor: "#000000" },
  { id: "PT-170028", name_ar: "رمادي فاتح", color: "#B0B0B0", textColor: "#000000" },
  { id: "PT-180361", name_ar: "وردي داكن", color: "#D81B60", textColor: "#FFFFFF" },
  { id: "PT-180374", name_ar: "وردي باستيل", color: "#FFB6C1", textColor: "#000000" },
  { id: "PT-180375", name_ar: "وردي فاتح", color: "#F4C2C2", textColor: "#000000" },
  { id: "PT-140079", name_ar: "أزرق فاتح", color: "#66B2FF", textColor: "#000000" },
  { id: "PT-140340", name_ar: "أزرق داكن", color: "#0033A0", textColor: "#FFFFFF" },
  { id: "PT-140352", name_ar: "أزرق صافي", color: "#0057FF", textColor: "#FFFFFF" },
  { id: "PT-140080", name_ar: "بنفسجي أفريقي", color: "#B284BE", textColor: "#000000" },
  { id: "PT-140114", name_ar: "بنفسجي ملكي", color: "#613399", textColor: "#FFFFFF" },
  { id: "PT-120074", name_ar: "عاجي داكن", color: "#E2DCC8", textColor: "#000000" },
  { id: "PT-130232-A", name_ar: "أصفر دوار الشمس", color: "#FFDA03", textColor: "#000000" },
  { id: "PT-130112", name_ar: "أصفر ليموني", color: "#FFF44F", textColor: "#000000" },
  { id: "PT-130231", name_ar: "أصفر", color: "#FFD000", textColor: "#000000" },
  { id: "PT-130232-B", name_ar: "أصفر ذهبي", color: "#FFC000", textColor: "#000000" },
  { id: "PT-180370", name_ar: "برتقالي 805", color: "#FF7A00", textColor: "#FFFFFF" },
  { id: "PT-180363", name_ar: "برتقالي 801", color: "#FF5A1F", textColor: "#FFFFFF" },
  { id: "PT-180122", name_ar: "أحمر طماطمي", color: "#E53935", textColor: "#FFFFFF" },
  { id: "PT-MIX", name_ar: "مخلوط", color: "#E2DCC8", textColor: "#000000" },
  { id: "PT-CLEAR", name_ar: "شفاف", color: "#E2DCC8", textColor: "#000000" },
];

const getMasterBatchInfo = (id: string) => {
  if (!id) return { name_ar: "غير محدد", color: "#E2DCC8", textColor: "#000000" };
  return masterBatchColors.find(c => c.id === id) || { name_ar: id, color: "#E2DCC8", textColor: "#000000" };
};

export default function OrderPrintTemplate({
  order,
  customer,
  productionOrders,
  customerProducts,
  items,
  onClose,
}: OrderPrintTemplateProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const salesRep = users?.find(u => u.id === customer?.sales_rep_id);

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
        const qrUrl = await QRCode.toDataURL(qrData, { width: 120, margin: 1 });
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error("خطأ في إنشاء رمز QR:", error);
      }
    };
    generateQRCode();
  }, [order, customer]);

  const handlePrint = () => window.print();

  const customerProductsMap = new Map(customerProducts.map(cp => [cp.id, cp]));
  const itemsMap = new Map(items.map(i => [i.id, i]));

  const orderProductionOrders = productionOrders.filter(po => po.order_id === order.id);

  return (
    <>
      <div className="no-print fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-[95vw] max-h-[95vh] overflow-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10">
            <h2 className="text-xl font-bold text-gray-800">معاينة طباعة الطلب</h2>
            <div className="flex gap-3">
              <button onClick={handlePrint} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                طباعة
              </button>
              <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
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
                customerProductsMap={customerProductsMap}
                itemsMap={itemsMap}
                qrCodeUrl={qrCodeUrl}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0; }
          body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-area { display: block !important; visibility: visible !important; position: static !important; }
        }
        .print-area { display: none; }
        @media screen { .print-area { display: none; } }
      `}</style>

      <div className="print-area">
        <PrintContent
          order={order}
          customer={customer}
          salesRep={salesRep}
          orderProductionOrders={orderProductionOrders}
          customerProductsMap={customerProductsMap}
          itemsMap={itemsMap}
          qrCodeUrl={qrCodeUrl}
        />
      </div>
    </>
  );
}

function PrintContent({ order, customer, salesRep, orderProductionOrders, customerProductsMap, itemsMap, qrCodeUrl }: any) {
  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      waiting: "قيد الانتظار",
      for_production: "جاهز للإنتاج",
      in_production: "قيد الإنتاج",
      completed: "مكتمل",
      cancelled: "ملغي",
      on_hold: "معلق",
      pending: "معلق",
    };
    return map[status] || status;
  };

  const totalRequiredQty = orderProductionOrders.reduce((sum: number, po: any) => sum + parseFloat(po.final_quantity_kg || po.quantity_kg || 0), 0);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", direction: "rtl", padding: "12mm", background: "#fff" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8mm", paddingBottom: "6mm", borderBottom: "3px solid #1e40af" }}>
        <div style={{ display: "flex", gap: "6mm", alignItems: "center" }}>
          {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" style={{ width: "28mm", height: "28mm", border: "1px solid #e2e8f0", padding: "1mm", borderRadius: "4px" }} />}
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "900", color: "#1e40af", margin: "0 0 2mm 0", letterSpacing: "-0.5px" }}>أمر تشغيل إنتاج</h1>
            <div style={{ display: "flex", gap: "4mm", alignItems: "center" }}>
              <span style={{ fontSize: "18px", fontWeight: "bold", background: "#f1f5f9", padding: "1mm 4mm", borderRadius: "6px", border: "1px solid #e2e8f0" }}>#{order.order_number}</span>
              <span style={{ fontSize: "14px", color: "#64748b", fontWeight: "600" }}>تاريخ الطلب: {format(new Date(order.created_at), "yyyy/MM/dd")}</span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontSize: "22px", fontWeight: "900", color: "#1e40af" }}>مصنع الرواد للبلاستيك</div>
          <div style={{ fontSize: "14px", color: "#64748b", fontWeight: "bold", marginTop: "1mm" }}>AL-RAWAD PLASTIC FACTORY</div>
        </div>
      </div>

      {/* Info Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "4mm", marginBottom: "8mm" }}>
        <div style={{ background: "#f8fafc", padding: "4mm", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", marginBottom: "1mm" }}>بيانات العميل</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#1e293b" }}>{customer?.name_ar || "-"}</div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "1mm" }}>{customer?.name || "-"}</div>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e40af", marginTop: "2mm" }}>كود العميل: {customer?.customer_code || "-"}</div>
        </div>
        <div style={{ background: "#f8fafc", padding: "4mm", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", marginBottom: "1mm" }}>تفاصيل الإدارة</div>
          <div style={{ fontSize: "15px", fontWeight: "700" }}>المندوب: <span style={{ color: "#1e40af" }}>{salesRep?.full_name || "-"}</span></div>
          <div style={{ fontSize: "15px", fontWeight: "700", marginTop: "2mm" }}>رقم الدرج: <span style={{ color: "#1e40af" }}>{customer?.drawer_code || "-"}</span></div>
        </div>
        <div style={{ background: "#f8fafc", padding: "4mm", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
          <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "bold", marginBottom: "1mm" }}>حالة الطلب</div>
          <div style={{ display: "inline-block", padding: "1.5mm 4mm", borderRadius: "6px", background: "#dcfce7", color: "#166534", fontWeight: "bold", fontSize: "14px" }}>
            {getStatusText(order.status)}
          </div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2mm", fontWeight: "600" }}>إجمالي الكمية: {totalRequiredQty.toFixed(2)} كجم</div>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#f1f5f9" }}>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "40px" }}>#</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "right" }}>المنتج</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "80px" }}>المقاس</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "60px" }}>العرض</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "60px" }}>الطول</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "60px" }}>السماكة</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "100px" }}>اللون</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "100px" }}>التخريم</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "60px" }}>طباعة</th>
            <th style={{ border: "1px solid #e2e8f0", padding: "8px", width: "80px" }}>الكمية</th>
          </tr>
        </thead>
        <tbody>
          {orderProductionOrders.map((po: any, index: number) => {
            const customerProduct = customerProductsMap.get(po.customer_product_id);
            const item = itemsMap.get(customerProduct?.item_id);
            const colorInfo = getMasterBatchInfo(customerProduct?.master_batch_id);
            return (
              <tr key={po.id}>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{index + 1}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px" }}>{item?.name_ar || "-"}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.size_caption || "-"}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.width || "-"}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.cutting_length_cm || "-"}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.thickness || "-"}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>
                  <span style={{ background: colorInfo.color, color: colorInfo.textColor, padding: "1mm 2mm", borderRadius: "4px", fontSize: "11px", border: "1px solid #eee" }}>
                    {colorInfo.name_ar}
                  </span>
                </td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.punching || "-"}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center" }}>{customerProduct?.is_printed ? "نعم" : "لا"}</td>
                <td style={{ border: "1px solid #e2e8f0", padding: "8px", textAlign: "center", fontWeight: "bold" }}>{parseFloat(String(po.final_quantity_kg || po.quantity_kg || 0)).toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: "#f8fafc", fontWeight: "bold" }}>
            <td colSpan={9} style={{ border: "1px solid #e2e8f0", padding: "10px", textAlign: "left" }}>الإجمالي الكلي</td>
            <td style={{ border: "1px solid #e2e8f0", padding: "10px", textAlign: "center", color: "#1e40af", fontSize: "15px" }}>{totalRequiredQty.toFixed(2)} كجم</td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "auto", paddingTop: "8mm", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#64748b" }}>
        <div>طبع بواسطة: {salesRep?.full_name || "النظام"}</div>
        <div>تاريخ الطباعة: {format(new Date(), "yyyy/MM/dd HH:mm")}</div>
        <div style={{ fontWeight: "bold" }}>صفحة 1 من 1</div>
      </div>
    </div>
  );
}
