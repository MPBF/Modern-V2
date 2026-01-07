import { useEffect, useState } from "react";
import { format } from "date-fns";
import "../../print.css";

interface ProductionOrderPrintTemplateProps {
  productionOrder: any;
  order: any;
  customer: any;
  customerProduct: any;
  item: any;
  machine: any;
  operator: any;
  rolls: any[];
  onClose: () => void;
}

export default function ProductionOrderPrintTemplate({
  productionOrder,
  order,
  customer,
  customerProduct,
  item,
  machine,
  operator,
  rolls,
  onClose,
}: ProductionOrderPrintTemplateProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const qrData = JSON.stringify({
          type: "production_order",
          production_order_id: productionOrder.id,
          production_order_number: productionOrder.production_order_number,
          order_number: order?.order_number,
          customer: customer?.name_ar || customer?.name,
          date: productionOrder.created_at,
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
  }, [productionOrder, order, customer]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "معلق",
      active: "نشط",
      completed: "مكتمل",
      cancelled: "ملغي",
    };
    return statusMap[status] || status;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "completed": return "print-badge print-badge-success";
      case "active": return "print-badge print-badge-info";
      case "cancelled": return "print-badge print-badge-danger";
      default: return "print-badge print-badge-warning";
    }
  };

  const getRollStageText = (stage: string) => {
    const stageMap: Record<string, string> = {
      film: "تفليم",
      printing: "طباعة",
      cutting: "تقطيع",
      done: "جاهز",
    };
    return stageMap[stage] || stage;
  };

  const totalRolls = rolls.length;
  const completedRolls = rolls.filter((r: any) => r.stage === "done").length;
  const totalWeight = rolls.reduce(
    (sum: number, r: any) => sum + parseFloat(r.weight_kg || 0),
    0
  );
  const progressPercentage =
    productionOrder.quantity_kg > 0
      ? (totalWeight / productionOrder.quantity_kg) * 100
      : 0;

  return (
    <div className="production-print-container">
      {/* Scoped print styles for this component */}
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
            .production-print-area {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 5mm !important;
              background: white !important;
            }

            @page {
              size: A4 landscape;
              margin: 0;
            }
          }
        `}
      </style>

      {/* شريط أدوات المعاينة */}
      <div className="print-preview-overlay no-print">
        <div className="print-preview-toolbar">
          <div className="print-preview-toolbar-title">
            <h2>أمر إنتاج</h2>
            <span>#{productionOrder.production_order_number}</span>
          </div>
          <div className="print-preview-toolbar-actions">
            <button 
              onClick={handlePrint} 
              className="print-preview-btn-print"
              data-testid="button-print-production-order"
            >
              طباعة
            </button>
            <button 
              onClick={onClose} 
              className="print-preview-btn-close"
              data-testid="button-close-print"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* معاينة الورقة على الشاشة */}
        <div className="print-preview-paper">
          <PrintContentInner
            productionOrder={productionOrder}
            order={order}
            customer={customer}
            customerProduct={customerProduct}
            item={item}
            qrCodeUrl={qrCodeUrl}
            totalRolls={totalRolls}
            completedRolls={completedRolls}
            totalWeight={totalWeight}
            progressPercentage={progressPercentage}
            getStatusText={getStatusText}
            getStatusBadgeClass={getStatusBadgeClass}
            getRollStageText={getRollStageText}
            rolls={rolls}
          />
        </div>
      </div>

      {/* المحتوى الفعلي للطباعة - مخفي على الشاشة ويظهر فقط عند الطباعة */}
      <div className="production-print-area">
        <PrintContentInner
          productionOrder={productionOrder}
          order={order}
          customer={customer}
          customerProduct={customerProduct}
          item={item}
          qrCodeUrl={qrCodeUrl}
          totalRolls={totalRolls}
          completedRolls={completedRolls}
          totalWeight={totalWeight}
          progressPercentage={progressPercentage}
          getStatusText={getStatusText}
          getStatusBadgeClass={getStatusBadgeClass}
          getRollStageText={getRollStageText}
          rolls={rolls}
        />
      </div>
    </div>
  );
}

function PrintContentInner({
  productionOrder,
  order,
  customer,
  customerProduct,
  item,
  qrCodeUrl,
  totalRolls,
  completedRolls,
  totalWeight,
  progressPercentage,
  getStatusText,
  getStatusBadgeClass,
  getRollStageText,
  rolls,
}: any) {
  return (
    <div className="print-page">
      {/* الترويسة */}
      <div className="print-header">
        <div className="print-header-right">
          <h1 className="print-title">أمر إنتاج</h1>
          <p className="print-subtitle">Production Order</p>
          <div className="print-order-number">#{productionOrder.production_order_number}</div>
        </div>
        <div className="print-header-center">
          <h2 className="print-company"> مصنع أكياس البلاستيك الحديث</h2>
          <p className="print-subtitle">Modern Plastic Bags factory </p>
        </div>
        <div className="print-header-left">
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt="QR Code" className="print-qr" />
          )}
        </div>
      </div>

      {/* معلومات أمر الإنتاج */}
      <div className="print-info-grid">
        <div className="print-info-box">
          <div className="print-info-label">رقم الطلب</div>
          <div className="print-info-value">{order?.order_number || "غير محدد"}</div>
        </div>
        <div className="print-info-box">
          <div className="print-info-label">العميل</div>
          <div className="print-info-value">{customer?.name_ar || customer?.name || "غير محدد"}</div>
        </div>
        <div className="print-info-box">
          <div className="print-info-label">الحالة</div>
          <div className="print-info-value">
            <span className={getStatusBadgeClass(productionOrder.status)}>
              {getStatusText(productionOrder.status)}
            </span>
          </div>
        </div>
        <div className="print-info-box">
          <div className="print-info-label">تاريخ الإنشاء</div>
          <div className="print-info-value">
            {productionOrder.created_at
              ? format(new Date(productionOrder.created_at), "dd/MM/yyyy")
              : "غير محدد"}
          </div>
        </div>
        <div className="print-info-box highlight">
          <div className="print-info-label">الكمية المطلوبة</div>
          <div className="print-info-value large">
            {parseFloat(productionOrder.quantity_kg || 0).toFixed(2)} كجم
          </div>
        </div>
        <div className="print-info-box">
          <div className="print-info-label">نسبة الإنجاز</div>
          <div className="print-info-value">{progressPercentage.toFixed(1)}%</div>
        </div>
      </div>

      {/* مواصفات المنتج */}
      <div className="print-section print-avoid-break">
        <h3 className="print-section-title">مواصفات المنتج</h3>
        <div className="print-specs-grid">
          <div className="print-specs-item">
            <strong>اسم الصنف:</strong>
            {item?.name_ar || item?.name || "غير محدد"}
          </div>
          <div className="print-specs-item">
            <strong>المقاس:</strong>
            {customerProduct?.size_caption || "غير محدد"}
          </div>
          <div className="print-specs-item">
            <strong>العرض:</strong>
            {customerProduct?.width || "غير محدد"} سم
          </div>
          <div className="print-specs-item">
            <strong>السماكة:</strong>
            {customerProduct?.thickness || "غير محدد"} مايكرون
          </div>
          <div className="print-specs-item">
            <strong>الدخلات يمين:</strong>
            {customerProduct?.right_facing || "غير محدد"} سم
          </div>
          <div className="print-specs-item">
            <strong>الدخلات يسار:</strong>
            {customerProduct?.left_facing || "غير محدد"} سم
          </div>
          <div className="print-specs-item">
            <strong>طول القص:</strong>
            {customerProduct?.cutting_length_cm || "غير محدد"} سم
          </div>
          <div className="print-specs-item">
            <strong>الخامة:</strong>
            {customerProduct?.raw_material || "غير محدد"}
          </div>
          <div className="print-specs-item">
            <strong>سلندر الطباعة:</strong>
            {customerProduct?.printing_cylinder || "غير محدد"}
          </div>
          <div className="print-specs-item">
            <strong>الطباعة:</strong>
            {customerProduct?.is_printed ? "نعم" : "لا"}
          </div>
          <div className="print-specs-item">
            <strong>التخريم:</strong>
            {customerProduct?.punching || "غير محدد"}
          </div>
          <div className="print-specs-item">
            <strong>وحدة القطع:</strong>
            {customerProduct?.cutting_unit || "غير محدد"}
          </div>
        </div>
      </div>

      {/* إحصائيات الإنتاج */}
      <div className="print-section print-avoid-break">
        <h3 className="print-section-title">إحصائيات الإنتاج</h3>
        <div className="print-stats-row">
          <div className="print-stat-card">
            <div className="print-stat-label">إجمالي الرولات</div>
            <div className="print-stat-value">{totalRolls}</div>
          </div>
          <div className="print-stat-card">
            <div className="print-stat-label">الرولات المكتملة</div>
            <div className="print-stat-value">{completedRolls}</div>
          </div>
          <div className="print-stat-card">
            <div className="print-stat-label">الوزن المنتج</div>
            <div className="print-stat-value">{totalWeight.toFixed(2)} كجم</div>
          </div>
          <div className="print-stat-card">
            <div className="print-stat-label">نسبة الاكتمال</div>
            <div className="print-stat-value">{progressPercentage.toFixed(1)}%</div>
          </div>
        </div>

        <div className="print-progress-container">
          <div
            className="print-progress-bar"
            style={{ width: `${Math.min(progressPercentage, 100)}%` }}
          >
            {progressPercentage > 10 && `${progressPercentage.toFixed(1)}%`}
          </div>
        </div>
      </div>

      {/* جدول الرولات */}
      {rolls.length > 0 && (
        <div className="print-section print-avoid-break">
          <h3 className="print-section-title">سجل الإنتاج - الرولات ({totalRolls})</h3>
          <table className="print-table">
            <thead>
              <tr>
                <th>#</th>
                <th>رقم الرول</th>
                <th>الوزن (كجم)</th>
                <th>المرحلة</th>
                <th>تاريخ الإنشاء</th>
                <th>ملاحظات</th>
              </tr>
            </thead>
            <tbody>
              {rolls.map((roll: any, index: number) => (
                <tr key={roll.id}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center font-bold">{roll.roll_number}</td>
                  <td className="text-center">{parseFloat(roll.weight_kg || 0).toFixed(2)}</td>
                  <td className="text-center">
                    <span
                      className={
                        roll.stage === "done"
                          ? "print-badge print-badge-success"
                          : "print-badge print-badge-warning"
                      }
                    >
                      {getRollStageText(roll.stage)}
                    </span>
                  </td>
                  <td className="text-center">
                    {roll.created_at
                      ? format(new Date(roll.created_at), "dd/MM/yyyy HH:mm")
                      : "-"}
                  </td>
                  <td>{roll.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2} style={{ textAlign: "left" }}>
                  <strong>المجموع:</strong>
                </td>
                <td colSpan={4}>
                  <strong>{totalWeight.toFixed(2)} كجم</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ملاحظات */}
      {productionOrder.notes && (
        <div className="print-notes print-avoid-break">
          <div className="print-notes-title">ملاحظات:</div>
          <div className="print-notes-content">{productionOrder.notes}</div>
        </div>
      )}

      {/* التوقيعات */}
      <div className="print-signatures print-avoid-break">
        <div className="print-signature-box">
          <div className="print-signature-line"></div>
          <div className="print-signature-label">مسؤول الإنتاج</div>
        </div>
        <div className="print-signature-box">
          <div className="print-signature-line"></div>
          <div className="print-signature-label">مشرف القسم</div>
        </div>
        <div className="print-signature-box">
          <div className="print-signature-line"></div>
          <div className="print-signature-label">مدير الإنتاج</div>
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
