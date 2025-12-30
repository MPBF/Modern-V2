
import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "../../print.css";

// ========================
// Types
// ========================
interface Order {
  id: string;
  order_number: string | number;
  created_at?: string | Date;
  notes?: string;
}

interface Customer {
  id: string;
  name_ar?: string;
  name?: string;
  sales_rep_id?: string;
}

interface ProductionOrder {
  id: string;
  order_id: string;
  customer_product_id: string;
  quantity_kg?: number | string;
  final_quantity_kg?: number | string;
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
}

// ========================
// Constants & Helpers
// ========================
const masterBatchColors: Array<{ id: string; name_ar: string; name_en?: string }> = [
  { id: "PT-111111", name_ar: "أبيض", name_en: "White" },
  { id: "PT-000000", name_ar: "أسود", name_en: "Black" },
  { id: "PT-CLEAR", name_ar: "شفاف", name_en: "Clear" },
];

const getMasterBatchInfo = (id?: string) => {
  if (!id) return { name_ar: "غير محدد", name_en: "Not specified" };
  return masterBatchColors.find((c) => c.id === id) ?? { name_ar: "غير محدد", name_en: "Not specified" };
};

// عربي قياسي للأرقام
const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
  new Intl.NumberFormat("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2, ...options }).format(value);

// عربي قياسي للتاريخ (بدون الاعتماد على date-fns)
const formatDate = (date: Date) =>
  new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("ar-EG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

// ========================
// Component
// ========================
export default function OrderPrintTemplate({
  order,
  customer,
  productionOrders,
  customerProducts,
  items,
  onClose,
}: OrderPrintTemplateProps) {
  // لاحظ: يفضّل تعريف queryFn هنا؛ إن كانت API جاهزة لديك أضفها.
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
    // queryFn: () => fetch("/api/users").then((res) => res.json()),
    staleTime: 5 * 60 * 1000,
  });

  const [isPrinting, setIsPrinting] = useState(false);
  const printContentRef = useRef<HTMLDivElement>(null);

  // ثبّت المراجع لتجنب race conditions وقت الطباعة
  const customerProductsMap = useMemo(
    () => new Map(customerProducts?.map((cp) => [cp.id, cp]) || []),
    [customerProducts]
  );

  const itemsMap = useMemo(() => new Map(items?.map((i) => [i.id, i]) || []), [items]);

  const filteredOrders = useMemo(
    () => productionOrders?.filter((po) => po.order_id === order?.id) || [],
    [productionOrders, order?.id]
  );

  // ترتيب ثابت بحسب id أو رقم الصنف لتجنب تغيّر الجدول بين عرض/طباعة
  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));
  }, [filteredOrders]);

  const salesRep = useMemo(() => {
    return users?.find((u) => u.id === customer?.sales_rep_id);
  }, [users, customer?.sales_rep_id]);

  const canPrint = Boolean(order?.id) && Boolean(customer?.id) && sortedOrders.length > 0;

  const handlePrint = useCallback(async () => {
    if (!canPrint || isPrinting || !printContentRef.current) return;
    setIsPrinting(true);

    try {
      // انتظر الخطوط (لو مدعومة)
      try {
        if ((document as any)?.fonts?.ready) {
          await (document as any).fonts.ready;
        }
      } catch {
        // تجاهل الخطأ
      }

      // انتظر إطارين رسم لضمان اكتمال DOM
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

      // التقاط المحتوى كصورة بجودة عالية
      const canvas = await html2canvas(printContentRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // إنشاء PDF بحجم A4 أفقي
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // أبعاد A4 أفقي بالملم
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;

      // حساب النسبة للعرض فقط (للحفاظ على التناسب)
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const widthRatio = contentWidth / imgWidth;
      const scaledWidth = contentWidth;
      const scaledHeight = imgHeight * widthRatio;

      // إذا كان المحتوى أطول من صفحة واحدة، نقسمه على صفحات متعددة
      const pageContentHeight = contentHeight; // ارتفاع المحتوى في كل صفحة بالملم
      const totalPages = Math.ceil(scaledHeight / pageContentHeight);

      // ارتفاع جزء الصورة المقابل لكل صفحة
      const sourcePageHeight = (pageContentHeight / widthRatio);

      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
        }

        // إنشاء canvas مؤقت لجزء من الصورة
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        const remainingHeight = canvas.height - page * sourcePageHeight;
        tempCanvas.height = Math.min(sourcePageHeight, remainingHeight);
        
        const ctx = tempCanvas.getContext("2d");
        if (ctx) {
          // رسم الجزء المطلوب من الصورة الأصلية
          ctx.drawImage(
            canvas,
            0,
            page * sourcePageHeight,
            canvas.width,
            tempCanvas.height,
            0,
            0,
            canvas.width,
            tempCanvas.height
          );

          const imgData = tempCanvas.toDataURL("image/png");
          const thisPageHeight = Math.min(pageContentHeight, scaledHeight - page * pageContentHeight);
          
          // إضافة الصورة مع توسيط أفقي
          const x = margin;
          const y = margin;
          pdf.addImage(imgData, "PNG", x, y, scaledWidth, thisPageHeight);
        }
      }

      // تحميل الملف
      const fileName = `أمر_تشغيل_${order?.order_number || "غير_محدد"}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error("خطأ في تصدير PDF:", error);
    } finally {
      setIsPrinting(false);
    }
  }, [canPrint, isPrinting, order?.order_number]);

  useEffect(() => {
    const onAfterPrint = () => {
      // يمكنك تفعيل الإغلاق التلقائي إذا رغبت:
      // onClose();
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [onClose]);

  // تاريخ الطلب
  const orderDateStr = useMemo(() => {
    const d =
      order?.created_at instanceof Date
        ? order.created_at
        : order?.created_at
        ? new Date(order.created_at)
        : new Date();
    return formatDate(d);
    // إن رغبت باستخدام date-fns:
    // return format(d, "yyyy/MM/dd", { locale: ar });
  }, [order?.created_at]);

  // إجمالي الوزن
  const totalWeight = useMemo(() => {
    return sortedOrders.reduce((sum, po) => {
      const raw =
        po.final_quantity_kg !== undefined && po.final_quantity_kg !== null
          ? Number(po.final_quantity_kg)
          : Number(po.quantity_kg ?? 0);
      return sum + (isFinite(raw) ? raw : 0);
    }, 0);
  }, [sortedOrders]);

  return (
    <>
      {/* ضمان A4 أفقي حتى لو لم تُحمّل print.css لأي سبب */}
      <style>
        {`
          @page { size: A4 landscape; margin: 10mm 15mm; }
        `}
      </style>

      {/* شريط أدوات المعاينة */}
      <div className="print-preview-overlay no-print" role="region" aria-label="معاينة الطباعة">
        <div className="print-preview-toolbar">
          <div className="print-preview-toolbar-title">
            <h2>أمر تشغيل إنتاج</h2>
            <span>#{order?.order_number ?? "-"}</span>
          </div>

          <div className="print-preview-toolbar-actions">
            <button
              onClick={handlePrint}
              className="print-preview-btn-print"
              data-testid="button-print-order"
              disabled={!canPrint || isPrinting}
              title={
                !canPrint
                  ? "البيانات غير مكتملة للتصدير"
                  : isPrinting
                  ? "جاري تصدير PDF..."
                  : "تصدير PDF"
              }
              aria-label="تصدير أمر التشغيل كـ PDF"
              style={!canPrint ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              {isPrinting ? "جاري التصدير..." : "تصدير PDF"}
            </button>

            <button
              onClick={onClose}
              className="print-preview-btn-close"
              data-testid="button-close-print-preview"
              aria-label="إغلاق المعاينة"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* معاينة الورقة على الشاشة */}
        <div className="print-preview-paper" ref={printContentRef}>
          <PrintContent
            order={order}
            customer={customer}
            salesRep={salesRep}
            productionOrders={sortedOrders}
            customerProductsMap={customerProductsMap}
            itemsMap={itemsMap}
            totalWeight={totalWeight}
            orderDateStr={orderDateStr}
          />
        </div>
      </div>

      {/* المحتوى الفعلي للطباعة - مخفي على الشاشة ويظهر فقط عند الطباعة */}
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
        />
      </div>
    </>
  );
}

interface PrintContentProps {
  order: Order | null | undefined;
  customer: Customer | null | undefined;
  salesRep: User | undefined;
  productionOrders: ProductionOrder[];
  customerProductsMap: Map<string, CustomerProduct>;
  itemsMap: Map<string, Item>;
  totalWeight: number;
  orderDateStr: string;
}

function PrintContent({
  order,
  customer,
  salesRep,
  productionOrders,
  customerProductsMap,
  itemsMap,
  totalWeight,
  orderDateStr,
}: PrintContentProps) {
  return (
    <div className="print-page">
      {/* الترويسة */}
      <div className="print-header">
        <div className="print-header-right">
          <h1 className="print-title">أمر تشغيل إنتاج</h1>
          <div className="print-order-number">#{order?.order_number ?? "-"}</div>
        </div>

        <div className="print-header-center">
          <h2 className="print-company">مصنع الرواد للبلاستيك</h2>
          <p className="print-subtitle">Al-Rowad Plastic Factory</p>
        </div>

        <div className="print-header-left">
          <div className="print-date">تاريخ: {orderDateStr}</div>
        </div>
      </div>

      {/* بيانات العميل والطلب */}
      <div className="print-info-grid">
        <div className="print-info-box">
          <div className="print-info-label">العميل</div>
          <div className="print-info-value">{customer?.name_ar || customer?.name || "غير محدد"}</div>
        </div>

        <div className="print-info-box">
          <div className="print-info-label">المندوب</div>
          <div className="print-info-value">{salesRep?.full_name || "غير محدد"}</div>
        </div>

        <div className="print-info-box highlight">
          <div className="print-info-label">إجمالي الكمية</div>
          <div className="print-info-value large">{formatNumber(totalWeight)} كجم</div>
        </div>
      </div>

      {/* جدول الأصناف */}
      <div className="print-section print-avoid-break">
        <h3 className="print-section-title">تفاصيل الأصناف ({productionOrders.length} صنف)</h3>

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
            {productionOrders.map((po, index) => {
              const cp = customerProductsMap.get(po.customer_product_id);
              const item = cp ? itemsMap.get(cp.item_id) : undefined;
              const color = getMasterBatchInfo(cp?.master_batch_id);

              const qtyRaw =
                po.final_quantity_kg !== undefined && po.final_quantity_kg !== null
                  ? Number(po.final_quantity_kg)
                  : Number(po.quantity_kg ?? 0);
              const qty = isFinite(qtyRaw) ? qtyRaw : 0;

              return (
                <tr key={po.id}>
                  <td className="text-center font-bold">{index + 1}</td>
                  <td className="font-bold">{item?.name_ar || item?.name || "غير محدد"}</td>
                  <td className="text-center">{cp?.size_caption || "-"}</td>
                  <td className="text-center">{cp?.width ?? "-"}</td>
                  <td className="text-center">{cp?.thickness ?? "-"}</td>
                  <td className="text-center">{color.name_ar}</td>
                  <td className="text-center">{cp?.raw_material || "-"}</td>
                  <td className="text-center">
                    <span
                      className={
                        cp?.is_printed ? "print-badge print-badge-success" : "print-badge print-badge-info"
                      }
                    >
                      {cp?.is_printed ? "نعم" : "لا"}
                    </span>
                  </td>
                  <td className="text-center font-bold">{formatNumber(qty)}</td>
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
                <strong>{formatNumber(totalWeight)} كجم</strong>
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
        <p>هذا المستند تم إنشاؤه إلكترونياً بتاريخ {formatDateTime(new Date())}</p>
        <p>نظام إدارة الإنتاج - Factory IQ</p>
      </div>
    </div>
  );
}
