import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Eye, Printer, Package, ArrowDownToLine, ArrowUpFromLine, Trash2, X } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import FactoryLogoPath from "../../../../attached_assets/MPBF11_factory_logo.webp";

interface VouchersListProps {
  type: "raw-material-in" | "raw-material-out" | "finished-goods-in" | "finished-goods-out";
  title: string;
  onView?: (voucher: any) => void;
}

export function VouchersList({ type, title, onView }: VouchersListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewVoucher, setViewVoucher] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: rawData, isLoading } = useQuery<any>({
    queryKey: ["/api/warehouse/vouchers", type],
  });
  const vouchers: any[] = Array.isArray(rawData) ? rawData : (rawData?.data ?? []);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/warehouse/vouchers/${type}/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "فشل في حذف السند");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers", type] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/production-hall"] });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/delivery-hall"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: t('warehouse.vouchers.deleteSuccess'), description: t('warehouse.vouchers.deleteSuccessDesc') });
    },
    onError: (error: any) => {
      toast({ title: t('warehouse.toast.error'), description: error.message, variant: "destructive" });
    },
  });

  const getVoucherTypeLabel = (voucherType: string) => {
    const labels: Record<string, string> = {
      purchase: t('warehouse.voucherTypes.purchase'),
      opening_balance: t('warehouse.voucherTypes.openingBalance'),
      return: t('warehouse.voucherTypes.return'),
      production_transfer: t('warehouse.voucherTypes.productionTransfer'),
      return_to_supplier: t('warehouse.voucherTypes.returnToSupplier'),
      adjustment: t('warehouse.voucherTypes.adjustment'),
      production_receipt: t('warehouse.voucherTypes.productionReceipt'),
      customer_return: t('warehouse.voucherTypes.customerReturn'),
      customer_delivery: t('warehouse.voucherTypes.customerDelivery'),
      sample: t('warehouse.voucherTypes.sample'),
    };
    return labels[voucherType] || voucherType;
  };

  const getTypeTitleLabel = () => {
    switch (type) {
      case "raw-material-in": return "سند إدخال مواد خام";
      case "raw-material-out": return "سند إخراج مواد خام";
      case "finished-goods-in": return "سند استلام مواد تامة";
      case "finished-goods-out": return "سند تسليم مواد تامة";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">{t('warehouse.status.completed')}</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800">{t('warehouse.status.draft')}</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">{t('warehouse.status.cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed": return t('warehouse.status.completed');
      case "draft": return t('warehouse.status.draft');
      case "cancelled": return t('warehouse.status.cancelled');
      default: return status;
    }
  };

  const getIcon = () => {
    switch (type) {
      case "raw-material-in":
        return <ArrowDownToLine className="h-5 w-5 text-green-600" />;
      case "raw-material-out":
        return <ArrowUpFromLine className="h-5 w-5 text-red-600" />;
      case "finished-goods-in":
        return <Package className="h-5 w-5 text-blue-600" />;
      case "finished-goods-out":
        return <Package className="h-5 w-5 text-orange-600" />;
    }
  };

  const handleView = (voucher: any) => {
    if (onView) {
      onView(voucher);
    } else {
      setViewVoucher(voucher);
    }
  };

  const handlePrint = (voucher: any) => {
    setViewVoucher(voucher);
    setTimeout(() => {
      const content = printRef.current;
      if (!content) return;
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;
      printWindow.document.write(`
        <html dir="rtl" lang="ar">
        <head>
          <title>طباعة سند - ${voucher.voucher_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; direction: rtl; color: #1a1a1a; }
            .voucher-print { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #1a56db; padding-bottom: 16px; margin-bottom: 20px; }
            .header img { width: 80px; height: 80px; object-fit: contain; }
            .header-center { text-align: center; flex: 1; }
            .header-center h1 { font-size: 20px; color: #1a56db; margin-bottom: 4px; }
            .header-center h2 { font-size: 16px; color: #555; }
            .header-left { text-align: left; font-size: 13px; color: #666; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .info-item { display: flex; gap: 8px; }
            .info-label { font-weight: 700; color: #374151; min-width: 100px; }
            .info-value { color: #1a1a1a; }
            .details-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            .details-table th { background: #1a56db; color: white; padding: 10px 12px; text-align: center; font-size: 14px; }
            .details-table td { padding: 10px 12px; border: 1px solid #e2e8f0; text-align: center; font-size: 14px; }
            .details-table tr:nth-child(even) { background: #f8fafc; }
            .notes-section { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
            .notes-label { font-weight: 700; color: #92400e; margin-bottom: 4px; }
            .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
            .sig-box { text-align: center; min-width: 150px; }
            .sig-line { border-top: 1px solid #999; margin-top: 50px; padding-top: 4px; font-size: 13px; color: #666; }
            @media print { body { padding: 10px; } .voucher-print { max-width: 100%; } }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
    }, 200);
  };

  const renderVoucherDetails = (v: any) => {
    const rows: { label: string; value: string }[] = [];

    rows.push({ label: "رقم السند", value: v.voucher_number });
    rows.push({ label: "نوع السند", value: getVoucherTypeLabel(v.voucher_type) });
    rows.push({ label: "التاريخ", value: new Date(v.voucher_date).toLocaleDateString("ar-SA") });
    if (v.receipt_time) {
      const rt = new Date(v.receipt_time);
      rows.push({ label: "وقت الاستلام", value: `${rt.toLocaleDateString("ar-SA")} ${rt.toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}` });
    }
    if (v.delivery_time) {
      const dt = new Date(v.delivery_time);
      rows.push({ label: "وقت التسليم", value: `${dt.toLocaleDateString("ar-SA")} ${dt.toLocaleTimeString("ar-SA", { hour: '2-digit', minute: '2-digit' })}` });
    }
    rows.push({ label: "الحالة", value: getStatusText(v.status) });

    if (v.quantity) {
      rows.push({ label: "الكمية", value: `${parseFloat(v.quantity).toLocaleString("en-US")} ${v.unit || "كيلو"}` });
    }
    if (v.weight_kg) {
      rows.push({ label: "الوزن (كجم)", value: parseFloat(v.weight_kg).toLocaleString("en-US") });
    }
    if (v.pieces_count) {
      rows.push({ label: "عدد القطع", value: v.pieces_count.toString() });
    }
    if (v.unit_price) {
      rows.push({ label: "سعر الوحدة", value: parseFloat(v.unit_price).toLocaleString("en-US") });
    }
    if (v.total_price) {
      rows.push({ label: "السعر الإجمالي", value: parseFloat(v.total_price).toLocaleString("en-US") });
    }
    if (v.batch_number) {
      rows.push({ label: "رقم الدفعة", value: v.batch_number });
    }
    if (v.barcode) {
      rows.push({ label: "الباركود", value: v.barcode });
    }
    if (v.supplier_name_ar || v.supplier_name) {
      rows.push({ label: "المورد", value: v.supplier_name_ar || v.supplier_name });
    }
    if (v.customer_name_ar || v.customer_name) {
      rows.push({ label: "العميل", value: v.customer_name_ar || v.customer_name });
    }
    if (v.item_name_ar || v.item_name || v.item_id) {
      rows.push({ label: "الصنف", value: v.item_name_ar || v.item_name || v.item_id });
    }
    if (v.item_code) {
      rows.push({ label: "كود الصنف", value: v.item_code });
    }
    if (v.location_name_ar || v.location_name || v.location_id) {
      rows.push({ label: "الموقع", value: v.location_name_ar || v.location_name || v.location_id });
    }
    if (v.production_order_number) {
      rows.push({ label: "أمر الإنتاج", value: v.production_order_number });
    }
    if (v.from_production_line) {
      rows.push({ label: "خط الإنتاج", value: v.from_production_line });
    }
    if (v.delivered_by) {
      rows.push({ label: "المُسلّم", value: v.delivered_by });
    }
    if (v.issued_to) {
      rows.push({ label: "المستلم", value: v.issued_to });
    }
    if (v.to_destination) {
      rows.push({ label: "الجهة المستلمة", value: v.to_destination });
    }
    if (v.driver_name) {
      rows.push({ label: "اسم السائق", value: v.driver_name });
    }
    if (v.driver_phone) {
      rows.push({ label: "هاتف السائق", value: v.driver_phone });
    }
    if (v.vehicle_number) {
      rows.push({ label: "رقم المركبة", value: v.vehicle_number });
    }
    if (v.delivery_address) {
      rows.push({ label: "عنوان التسليم", value: v.delivery_address });
    }
    if (v.expiry_date) {
      rows.push({ label: "تاريخ الانتهاء", value: new Date(v.expiry_date).toLocaleDateString("ar-SA") });
    }

    return rows;
  };

  const renderPrintContent = (v: any) => {
    const details = renderVoucherDetails(v);
    let printItems: any[] = [];
    try { if (v.items) printItems = JSON.parse(v.items); } catch {}

    return (
      <div className="voucher-print">
        <div className="header">
          <img src={FactoryLogoPath} alt="شعار المصنع" />
          <div className="header-center">
            <h1>مصنع الأكياس البلاستيكية الحديثة</h1>
            <h2>{getTypeTitleLabel()}</h2>
          </div>
          <div className="header-left">
            <div>{v.voucher_number}</div>
            <div>{new Date(v.voucher_date).toLocaleDateString("ar-SA")}</div>
          </div>
        </div>

        <table className="details-table">
          <thead>
            <tr>
              <th style={{ width: "40%" }}>البيان</th>
              <th style={{ width: "60%" }}>القيمة</th>
            </tr>
          </thead>
          <tbody>
            {details.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{row.label}</td>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {printItems.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '8px', borderBottom: '2px solid #333', paddingBottom: '4px' }}>
              أوامر الإنتاج المستلمة ({printItems.length})
            </div>
            <table className="details-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>أمر الإنتاج</th>
                  <th style={{ textAlign: 'center' }}>رقم الطلب</th>
                  <th style={{ textAlign: 'center' }}>العميل</th>
                  <th style={{ textAlign: 'center' }}>المنتج</th>
                  <th style={{ textAlign: 'center' }}>الوزن (كجم)</th>
                </tr>
              </thead>
              <tbody>
                {printItems.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, textAlign: 'center' }}>{item.production_order_number || `PO-${item.production_order_id}`}</td>
                    <td style={{ textAlign: 'center' }}>{item.order_number || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{item.customer_name || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{item.product_description || '-'}</td>
                    <td style={{ textAlign: 'center' }}>{parseFloat(String(item.weight_kg || 0)).toLocaleString("en-US")}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700, backgroundColor: '#f0f0f0' }}>
                  <td colSpan={4} style={{ textAlign: 'center' }}>الإجمالي</td>
                  <td style={{ textAlign: 'center' }}>{printItems.reduce((s: number, it: any) => s + parseFloat(String(it.weight_kg || 0)), 0).toLocaleString("en-US")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {v.notes && (
          <div className="notes-section">
            <div className="notes-label">ملاحظات:</div>
            <div>{v.notes}</div>
          </div>
        )}

        <div className="signatures">
          <div className="sig-box">
            <div className="sig-line">أمين المستودع</div>
          </div>
          <div className="sig-box">
            <div className="sig-line">المستلم</div>
          </div>
          <div className="sig-box">
            <div className="sig-line">المدير</div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-gray-500">{t('warehouse.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            {getIcon()}
            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {vouchers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('warehouse.vouchers.noVouchers')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">{t('warehouse.vouchers.voucherNumber')}</TableHead>
                  <TableHead className="text-center">{t('warehouse.vouchers.type')}</TableHead>
                  <TableHead className="text-center">{t('warehouse.vouchers.date')}</TableHead>
                  {(type === "raw-material-in" || type === "raw-material-out") && (
                    <TableHead className="text-center">الصنف</TableHead>
                  )}
                  {type === "raw-material-in" && (
                    <TableHead className="text-center">المورد</TableHead>
                  )}
                  {type === "raw-material-out" && (
                    <TableHead className="text-center">الجهة</TableHead>
                  )}
                  <TableHead className="text-center">{t('warehouse.vouchers.quantity')}</TableHead>
                  <TableHead className="text-center">{t('warehouse.vouchers.status')}</TableHead>
                  <TableHead className="text-center">{t('warehouse.vouchers.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher: any) => (
                  <TableRow key={voucher.id}>
                    <TableCell className="text-center font-medium">
                      {voucher.voucher_number}
                    </TableCell>
                    <TableCell className="text-center">
                      {getVoucherTypeLabel(voucher.voucher_type)}
                    </TableCell>
                    <TableCell className="text-center">
                      {new Date(voucher.voucher_date).toLocaleDateString("en-US")}
                    </TableCell>
                    {(type === "raw-material-in" || type === "raw-material-out") && (
                      <TableCell className="text-center text-sm">
                        {voucher.item_name_ar || voucher.item_name || voucher.item_id}
                      </TableCell>
                    )}
                    {type === "raw-material-in" && (
                      <TableCell className="text-center text-sm">
                        {voucher.supplier_name_ar || voucher.supplier_name || '-'}
                      </TableCell>
                    )}
                    {type === "raw-material-out" && (
                      <TableCell className="text-center text-sm">
                        {voucher.to_destination || voucher.production_order_number || '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      {parseFloat(voucher.quantity || 0).toLocaleString("en-US")} {voucher.unit || t('warehouse.units.kilo')}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(voucher.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(voucher)}
                          title="عرض السند"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrint(voucher)}
                          title="طباعة السند"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {(type === "finished-goods-in" || type === "finished-goods-out" || type === "raw-material-in" || type === "raw-material-out") && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t('warehouse.vouchers.confirmDeleteTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t('warehouse.vouchers.confirmDeleteDesc', { number: voucher.voucher_number })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="gap-2">
                                <AlertDialogCancel>{t('warehouse.buttons.cancel')}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(voucher.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {deleteMutation.isPending ? t('common.processing') : t('warehouse.vouchers.confirmDelete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewVoucher} onOpenChange={(open) => { if (!open) setViewVoucher(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getIcon()}
              <span>{getTypeTitleLabel()} - {viewVoucher?.voucher_number}</span>
            </DialogTitle>
          </DialogHeader>

          {viewVoucher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {renderVoucherDetails(viewVoucher).map((row, i) => (
                  <div key={i} className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="font-semibold text-gray-600 dark:text-gray-400 min-w-[90px] text-sm">{row.label}:</span>
                    <span className="text-sm">{row.value}</span>
                  </div>
                ))}
              </div>

              {(() => {
                let parsedItems: any[] = [];
                try { if (viewVoucher.items) parsedItems = JSON.parse(viewVoucher.items); } catch {}
                if (parsedItems.length <= 0) return null;
                return (
                  <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                    <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2">
                      <span className="font-semibold text-sm text-blue-800 dark:text-blue-200">أوامر الإنتاج المستلمة ({parsedItems.length})</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="py-2 px-3 text-center font-medium">أمر الإنتاج</th>
                          <th className="py-2 px-3 text-center font-medium">رقم الطلب</th>
                          <th className="py-2 px-3 text-center font-medium">العميل</th>
                          <th className="py-2 px-3 text-center font-medium">المنتج</th>
                          <th className="py-2 px-3 text-center font-medium">الوزن (كجم)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedItems.map((item: any, idx: number) => (
                          <tr key={idx} className="border-t dark:border-gray-700">
                            <td className="py-2 px-3 text-center font-medium">{item.production_order_number || `PO-${item.production_order_id}`}</td>
                            <td className="py-2 px-3 text-center">{item.order_number || '-'}</td>
                            <td className="py-2 px-3 text-center">{item.customer_name || '-'}</td>
                            <td className="py-2 px-3 text-center">{item.product_description || '-'}</td>
                            <td className="py-2 px-3 text-center">{parseFloat(String(item.weight_kg || 0)).toLocaleString("en-US")}</td>
                          </tr>
                        ))}
                        <tr className="border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-semibold">
                          <td className="py-2 px-3 text-center" colSpan={4}>الإجمالي</td>
                          <td className="py-2 px-3 text-center">{parsedItems.reduce((s: number, it: any) => s + parseFloat(String(it.weight_kg || 0)), 0).toLocaleString("en-US")}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {viewVoucher.notes && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm mb-1">ملاحظات:</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{viewVoucher.notes}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setViewVoucher(null)}>
                  <X className="h-4 w-4 ml-1" />
                  إغلاق
                </Button>
                <Button onClick={() => handlePrint(viewVoucher)}>
                  <Printer className="h-4 w-4 ml-1" />
                  طباعة
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div style={{ display: "none" }}>
        <div ref={printRef}>
          {viewVoucher && renderPrintContent(viewVoucher)}
        </div>
      </div>
    </>
  );
}

export default VouchersList;
