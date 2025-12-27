import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";

// 1. تعريف الأنواع لضمان عدم ظهور أخطاء TypeScript
interface OrderPrintTemplateProps {
  order: any;
  customer: any;
  productionOrders: any[];
  customerProducts: any[];
  items: any[];
  onClose: () => void;
}

// 2. دوال مساعدة
const masterBatchColors = [
  { id: "PT-111111", name_ar: "أبيض" },
  { id: "PT-000000", name_ar: "أسود" },
  { id: "PT-CLEAR", name_ar: "شفاف" },
];

const getMasterBatchInfo = (id: string) => {
  return masterBatchColors.find(c => c.id === id) || { name_ar: "غير محدد" };
};

// 3. المكون الأساسي
export default function OrderPrintTemplate({
  order,
  customer,
  productionOrders,
  customerProducts,
  items,
  onClose,
}: OrderPrintTemplateProps) {

  // استدعاء المستخدمين (للمندوب)
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  const salesRep = users?.find((u: any) => u.id === customer?.sales_rep_id);

  // تجهيز البيانات
  const customerProductsMap = new Map(customerProducts?.map(cp => [cp.id, cp]) || []);
  const itemsMap = new Map(items?.map(i => [i.id, i]) || []);
  const filteredOrders = productionOrders?.filter(po => po.order_id === order.id) || [];

  return (
    <>
      <style>{`
        /* تنسيق العرض على الكمبيوتر (المعاينة) */
        #print-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(31, 41, 55, 0.9);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          padding: 40px;
          overflow-y: auto;
        }

        .preview-actions {
          width: 297mm;
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          background: white;
          padding: 15px 25px;
          border-radius: 8px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .paper-sheet {
          background: white;
          width: 297mm;
          min-height: 210mm;
          padding: 20mm;
          box-sizing: border-box;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border-radius: 2px;
        }

        /* تنسيق الطباعة النهائي للورقة */
        @media print {
          body * {
            visibility: hidden;
          }
          #actual-print-content, #actual-print-content * {
            visibility: visible !important;
          }
          #actual-print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            display: block !important;
          }
          #print-modal-overlay {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 0;
          }
        }

        #actual-print-content {
          display: none;
        }
      `}</style>

      {/* واجهة المعاينة على الشاشة */}
      <div id="print-modal-overlay">
        <div className="preview-actions">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#111827' }}>أمر تشغيل إنتاج [cite: 1]</h2>
            <span style={{ background: '#E5E7EB', padding: '4px 12px', borderRadius: '4px', fontWeight: 'bold' }}>
               #{order.order_number} [cite: 2]
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => window.print()} 
              style={{ background: '#2563EB', color: 'white', border: 'none', padding: '10px 30px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              طباعة الورقة
            </button>
            <button 
              onClick={onClose} 
              style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', padding: '10px 20px', borderRadius: '6px', cursor: 'pointer' }}
            >
              إغلاق المعاينة
            </button>
          </div>
        </div>

        <div className="paper-sheet">
          <PrintBody 
            order={order} 
            customer={customer} 
            salesRep={salesRep} 
            filteredOrders={filteredOrders}
            customerProductsMap={customerProductsMap}
            itemsMap={itemsMap}
          />
        </div>
      </div>

      {/* المحتوى الفعلي الذي يرسل للطابعة فقط */}
      <div id="actual-print-content">
        <div style={{ padding: '15mm' }}>
          <PrintBody 
            order={order} 
            customer={customer} 
            salesRep={salesRep} 
            filteredOrders={filteredOrders}
            customerProductsMap={customerProductsMap}
            itemsMap={itemsMap}
          />
        </div>
      </div>
    </>
  );
}

// مكون المحتوى الفعلي
function PrintBody({ order, customer, salesRep, filteredOrders, customerProductsMap, itemsMap }: any) {

  // حساب الإجمالي مع التأكد من النوع
  const totalWeight = filteredOrders.reduce((sum: number, po: any) => {
    return sum + Number(po.final_quantity_kg || po.quantity_kg || 0);
  }, 0); 

  return (
    <div style={{ direction: "rtl", fontFamily: "Arial, sans-serif", width: "100%" }}>
      {/* الترويسة العليا */}
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "4px solid #1e40af", paddingBottom: "15px", marginBottom: "30px" }}>
        <div>
          <h1 style={{ margin: 0, color: "#1e40af", fontSize: "32px", fontWeight: "900" }}>أمر تشغيل إنتاج [cite: 1]</h1>
          <div style={{ fontSize: "18px", marginTop: "5px" }}>رقم الطلب: <b>#{order.order_number} [cite: 2]</b></div>
        </div>
        <div style={{ textAlign: "left" }}>
          <h2 style={{ margin: 0, color: "#1e40af", fontSize: "26px" }}>مصنع الرواد للبلاستيك [cite: 3]</h2>
          <div style={{ marginTop: "5px", fontWeight: "bold" }}>تاريخ: {order.created_at ? format(new Date(order.created_at), "yyyy/MM/dd") : "2025/12/03"} [cite: 5]</div>
        </div>
      </div>

      {/* بيانات العميل */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "20px", marginBottom: "30px" }}>
        <div style={{ border: "2px solid #000", padding: "15px", borderRadius: "8px" }}>
          <div style={{ fontSize: "13px", color: "#666", marginBottom: "5px" }}>العميل: [cite: 4]</div>
          <div style={{ fontSize: "20px", fontWeight: "bold" }}>{customer?.name_ar || "2000 مركز"} [cite: 4]</div>
        </div>
        <div style={{ border: "2px solid #000", padding: "15px", borderRadius: "8px" }}>
          <div style={{ fontSize: "13px", color: "#666", marginBottom: "5px" }}>المندوب:</div>
          <div style={{ fontSize: "18px" }}>{salesRep?.full_name || "المناديب"} [cite: 4]</div>
        </div>
        <div style={{ border: "2px solid #1e40af", padding: "15px", borderRadius: "8px", backgroundColor: "#f0f7ff" }}>
          <div style={{ fontSize: "13px", color: "#1e40af", marginBottom: "5px" }}>إجمالي الكمية: [cite: 4]</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e40af" }}>{totalWeight.toFixed(2)} كجم </div>
        </div>
      </div>

      {/* جدول الأصناف */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "40px" }}>
        <thead>
          <tr style={{ backgroundColor: "#1e40af", color: "white" }}>
            <th style={{ border: "1px solid #000", padding: "12px", fontSize: "16px" }}># [cite: 6]</th>
            <th style={{ border: "1px solid #000", padding: "12px", fontSize: "16px", textAlign: "right" }}>الصنف [cite: 15]</th>
            <th style={{ border: "1px solid #000", padding: "12px", fontSize: "16px" }}>المقاس [cite: 7]</th>
            <th style={{ border: "1px solid #000", padding: "12px", fontSize: "16px" }}>العرض [cite: 8]</th>
            <th style={{ border: "1px solid #000", padding: "12px", fontSize: "16px" }}>اللون [cite: 10]</th>
            <th style={{ border: "1px solid #000", padding: "12px", fontSize: "16px" }}>الكمية [cite: 11]</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((po: any, index: number) => {
            const cp = customerProductsMap.get(po.customer_product_id);
            const item = itemsMap.get(cp?.item_id);
            const color = getMasterBatchInfo(cp?.master_batch_id);
            const qty = Number(po.final_quantity_kg || po.quantity_kg || 0);
            return (
              <tr key={po.id}>
                <td style={{ border: "1px solid #000", padding: "12px", textAlign: "center", fontWeight: "bold" }}>{index + 1} [cite: 6]</td>
                <td style={{ border: "1px solid #000", padding: "12px", fontSize: "16px", fontWeight: "bold" }}>{item?.name_ar || "أكياس - 1 - LD"} [cite: 15]</td>
                <td style={{ border: "1px solid #000", padding: "12px", textAlign: "center" }}>{cp?.size_caption || "82X0"} [cite: 7]</td>
                <td style={{ border: "1px solid #000", padding: "12px", textAlign: "center" }}>{cp?.width || "82.00"} [cite: 8]</td>
                <td style={{ border: "1px solid #000", padding: "12px", textAlign: "center" }}>{color.name_ar || "شفاف"} [cite: 10]</td>
                <td style={{ border: "1px solid #000", padding: "12px", textAlign: "center", fontSize: "18px", fontWeight: "bold" }}>{qty.toFixed(2)} [cite: 11]</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* منطقة التواقيع */}
      <div style={{ marginTop: "auto", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "40px", textAlign: "center" }}>
        <div style={{ borderTop: "2px solid #000", paddingTop: "10px", fontWeight: "bold", fontSize: "16px" }}>توقيع الإنتاج [cite: 12]</div>
        <div style={{ borderTop: "2px solid #000", paddingTop: "10px", fontWeight: "bold", fontSize: "16px" }}>توقيع الجودة [cite: 13]</div>
        <div style={{ borderTop: "2px solid #000", paddingTop: "10px", fontWeight: "bold", fontSize: "16px" }}>استلام المستودع [cite: 14]</div>
      </div>
    </div>
  );
}