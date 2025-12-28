import React, { useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import "../../print.css";

interface OrderPrintTemplateProps {
  order: any;
  customer: any;
  productionOrders: any[];
  customerProducts: any[];
  items: any[];
  onClose: () => void;
}

const masterBatchColors = [
  { id: "PT-111111", name_ar: "أبيض" },
  { id: "PT-000000", name_ar: "أسود" },
  { id: "PT-CLEAR", name_ar: "شفاف" },
];

const getMasterBatchInfo = (id: string) => {
  return masterBatchColors.find((c) => c.id === id) || { name_ar: "غير محدد" };
};

export default function OrderPrintTemplate({
  order,
  customer,
  productionOrders,
  customerProducts,
  items,
  onClose,
}: OrderPrintTemplateProps) {
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // ثبّت المراجع لتجنب race conditions وقت الطباعة
  const customerProductsMap = useMemo(
    () => new Map(customerProducts?.map((cp) => [cp.id, cp]) || []),
    [customerProducts]
  );

  const itemsMap = useMemo(
    () => new Map(items?.map((i) => [i.id, i]) || []),
    [items]
  );

  const filteredOrders = useMemo(
    () => productionOrders?.filter((po) => po.order_id === order?.id) || [],
    [productionOrders, order?.id]
  );

  const salesRep = useMemo(() => {
    return users?.find((u: any) => u.id === customer?.sales_rep_id);
  }, [users, customer?.sales_rep_id]);

  const canPrint = Boolean(order?.id) && Boolean(customer?.id);

  const handlePrint = useCallback(async () => {
    if (!canPrint) return;

    // انتظر الخطوط (لو مدعومة) ثم إطارين رسم لضمان اكتمال الـ DOM قبل الطباعة
    try {
      // بعض المتصفحات لا تدعم document.fonts
      // @ts-ignore
      if (document?.fonts?.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
    } catch {
      // ignore
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    window.print();
  }, [canPrint]);

  // اختياري: بعد انتهاء الطباعة، أبقِ المستخدم في شاشة المعاينة (لا نغلق تلقائياً)
  useEffect(() => {
    const onAfterPrint = () => {
      // يمكنك تفعيل الإغلاق التلقائي إذا رغبت:
      // onClose();
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [onClose]);

  return (
    <>
      {/* ضمان A4 أفقي حتى لو لم تُحمّل print.css لأي سبب */}
      <style>
        {`
          @page { size: A4 landscape; margin: 10mm 15mm; }
        `}
      </style>

      {/* شريط أدوات المعاينة */}
      <div className="print-preview-overlay no-print">
        <div className="print-preview-toolbar">
          <div className="print-preview-toolbar-title">
            <h2>أمر تشغيل إنتاج</h2>
            <span>#{order?.order_number}</span>
          </div>

          <div className="print-preview-toolbar-actions">
            <button
              onClick={handlePrint}
              className="print-preview-btn-print"
              data-testid="button-print-order"
              disabled={!canPrint}
              title={!canPrint ? "البيانات غير مكتملة للطباعة" : "طباعة"}
              style={!canPrint ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              طباعة
            </button>

            <button
              onClick={onClose}
              className="print-preview-btn-close"
              data-testid="button-close-print-preview"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* معاينة الورقة على الشاشة */}
        <div className="print-preview-paper">
          <PrintContentInner
            order={order}
            customer={customer}
            salesRep={salesRep}
            filteredOrders={filteredOrders}
            customerProductsMap={customerProductsMap}
            itemsMap={itemsMap}
          />
        </div>
      </div>

      {/* المحتوى الفعلي للطباعة - مخفي على الشاشة ويظهر فقط عند الطباعة */}
      <div className="print-area">
        <PrintContentInner
          order={order}
          customer={customer}
          salesRep={salesRep}
          filteredOrders={filteredOrders}
          customerProductsMap={customerProductsMap}
          itemsMap={itemsMap}
        />
      </div>
    </>
  );
}

interface PrintContentProps {
  order: any;
  customer: any;
  salesRep: any;
  filteredOrders: any[];
  customerProductsMap: Map<any, any>;
  itemsMap: Map<any, any>;
}

function PrintContentInner({
  order,
  customer,
  salesRep,
  filteredOrders,
  customerProductsMap,
  itemsMap,
}: PrintContentProps) {
  const totalWeight = useMemo(() => {
    return filteredOrders.reduce((sum: number, po: any) => {
      return sum + Number(po.final_quantity_kg || po.quantity_kg || 0);
    }, 0);
  }, [filteredOrders]);

  const orderDate = useMemo(() => {
    return order?.created_at
      ? format(new Date(order.created_at), "yyyy/MM/dd")
      : format(new Date(), "yyyy/MM/dd");
  }, [order?.created_at]);

  return (
    <div className="print-page">
      {/* الترويسة */}
      <div className="print-header">
        <div className="print-header-right">
          <h1 className="print-title">أمر تشغيل إنتاج</h1>
          <div className="print-order-number">#{order?.order_number}</div>
        </div>

        <div className="print-header-center">
          <h2 className="print-company">مصنع الرواد للبلاستيك</h2>
          <p className="print-subtitle">Al-Rowad Plastic Factory</p>
        </div>

        <div className="print-header-left">
          <div className="print-date">تاريخ: {orderDate}</div>
        </div>
      </div>

      {/* بيانات العميل والطلب */}
      <div className="print-info-grid">
        <div className="print-info-box">
          <div className="print-info-label">العميل</div>
          <div className="print-info-value">
            {customer?.name_ar || customer?.name || "غير محدد"}
          </div>
        </div>

        <div className="print-info-box">
          <div className="print-info-label">المندوب</div>
          <div className="print-info-value">{salesRep?.full_name || "غير محدد"}</div>
        </div>

        <div className="print-info-box highlight">
          <div className="print-info-label">إجمالي الكمية</div>
          <div className="print-info-value large">{totalWeight.toFixed(2)} كجم</div>
        </div>
      </div>

      {/* جدول الأصناف */}
      <div className="print-section print-avoid-break">
        <h3 className="print-section-title">
          تفاصيل الأصناف ({filteredOrders.length} صنف)
        </h3>

        <table className="print-table">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>#</th>
              <th style={{ width: "25%" }}>الصنف</th>
              <th style={{ width: "12%" }}>المقاس</th>
              <th style={{ width: "10%" }}>العرض (سم)</th>
              <th style={{ width: "10%" }}>السماكة</th>
              <th style={{ width: "10%" }}>اللون</th>
              <th style={{ width: "10%" }}>الخامة</th>
              <th style={{ width: "8%" }}>الطباعة</th>
              <th style={{ width: "10%" }}>الكمية (كجم)</th>
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
                  <td className="text-center font-bold">{index + 1}</td>
                  <td className="font-bold">
                    {item?.name_ar || item?.name || "غير محدد"}
                  </td>
                  <td className="text-center">{cp?.size_caption || "-"}</td>
                  <td className="text-center">{cp?.width || "-"}</td>
                  <td className="text-center">{cp?.thickness || "-"}</td>
                  <td className="text-center">{color.name_ar}</td>
                  <td className="text-center">{cp?.raw_material || "-"}</td>
                  <td className="text-center">
                    <span
                      className={
                        cp?.is_printed
                          ? "print-badge print-badge-success"
                          : "print-badge print-badge-info"
                      }
                    >
                      {cp?.is_printed ? "نعم" : "لا"}
                    </span>
                  </td>
                  <td className="text-center font-bold">{qty.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={8} style={{ textAlign: "left" }}>
                <strong>إجمالي الكمية:</strong>
              </td>
              <td className="text-center">
                <strong>{totalWeight.toFixed(2)} كجم</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ملاحظات الطلب */}
      {order?.notes && (
        <div className="print-notes print-avoid-break">
          <div className="print-notes-title">ملاحظات الطلب:</div>
          <div className="print-notes-content">{order.notes}</div>
        </div>
      )}

      {/* التوقيعات */}
      <div className="print-signatures print-avoid-break">
        <div className="print-signature-box">
          <div className="print-signature-line"></div>
          <div className="print-signature-label">توقيع الإنتاج</div>
        </div>

        <div className="print-signature-box">
          <div className="print-signature-line"></div>
          <div className="print-signature-label">توقيع الجودة</div>
        </div>

        <div className="print-signature-box">
          <div className="print-signature-line"></div>
          <div className="print-signature-label">استلام المستودع</div>
        </div>
      </div>

      {/* التذييل */}
      <div className="print-footer">
        <p>هذا المستند تم إنشاؤه إلكترونياً بتاريخ {format(new Date(), "dd/MM/yyyy - HH:mm")}</p>
        <p>نظام إدارة الإنتاج - Factory IQ</p>
      </div>
    </div>
  );
}

const PrintContent = PrintContentInner;
