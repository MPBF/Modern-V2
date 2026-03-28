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
  const { t, i18n } = useTranslation();
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
        throw new Error(err.message || t('warehouse.errors.deleteVoucherFailed'));
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
      case "raw-material-in": return t('warehouse.voucherTypeLabels.rmIn');
      case "raw-material-out": return t('warehouse.voucherTypeLabels.rmOut');
      case "finished-goods-in": return t('warehouse.voucherTypeLabels.fpIn');
      case "finished-goods-out": return t('warehouse.voucherTypeLabels.fpOut');
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
        <html dir="${i18n.language === 'ar' ? 'rtl' : 'ltr'}" lang="${i18n.language}">
        <head>
          <title>${t('warehouse.print.printVoucher')} - ${voucher.voucher_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; direction: ${i18n.language === 'ar' ? 'rtl' : 'ltr'}; color: #1a1a1a; }
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
            .print-section { margin-bottom: 16px; }
            .section-title { font-weight: 700; font-size: 14px; color: #1a56db; padding: 8px 12px; background: #eff6ff; border-right: 4px solid #1a56db; border-left: 4px solid #1a56db; margin-bottom: 0; border-radius: 4px 4px 0 0; }
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

  const getGroupedVoucherDetails = (v: any) => {
    type Row = { label: string; value: string };
    type Section = { title: string; icon: string; rows: Row[] };
    const sections: Section[] = [];

    const voucherInfo: Row[] = [];
    voucherInfo.push({ label: t('warehouse.voucherDetails.voucherNumber'), value: v.voucher_number });
    voucherInfo.push({ label: t('warehouse.voucherDetails.voucherType'), value: getVoucherTypeLabel(v.voucher_type) });
    voucherInfo.push({ label: t('warehouse.voucherDetails.date'), value: new Date(v.voucher_date).toLocaleDateString() });
    if (v.receipt_time) {
      const rt = new Date(v.receipt_time);
      voucherInfo.push({ label: t('warehouse.voucherDetails.receiptTime'), value: `${rt.toLocaleDateString()} ${rt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` });
    }
    if (v.delivery_time) {
      const dt = new Date(v.delivery_time);
      voucherInfo.push({ label: t('warehouse.voucherDetails.deliveryTime'), value: `${dt.toLocaleDateString()} ${dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` });
    }
    voucherInfo.push({ label: t('warehouse.voucherDetails.status'), value: getStatusText(v.status) });
    sections.push({ title: t('warehouse.sections.voucherInfo'), icon: "📋", rows: voucherInfo });

    const itemInfo: Row[] = [];
    if (v.item_name_ar || v.item_name || v.item_id) itemInfo.push({ label: t('warehouse.voucherDetails.item'), value: v.item_name_ar || v.item_name || v.item_id });
    if (v.item_code) itemInfo.push({ label: t('warehouse.voucherDetails.itemCode'), value: v.item_code });
    if (v.barcode) itemInfo.push({ label: t('warehouse.voucherDetails.barcode'), value: v.barcode });
    if (v.batch_number) itemInfo.push({ label: t('warehouse.voucherDetails.batchNumber'), value: v.batch_number });
    if (v.location_name_ar || v.location_name || v.location_id) itemInfo.push({ label: t('warehouse.voucherDetails.location'), value: v.location_name_ar || v.location_name || v.location_id });
    if (v.expiry_date) itemInfo.push({ label: t('warehouse.voucherDetails.expiryDate'), value: new Date(v.expiry_date).toLocaleDateString() });
    if (itemInfo.length > 0) sections.push({ title: t('warehouse.sections.itemInfo'), icon: "📦", rows: itemInfo });

    const qtyInfo: Row[] = [];
    if (v.quantity) qtyInfo.push({ label: t('warehouse.voucherDetails.quantity'), value: `${parseFloat(v.quantity).toLocaleString("en-US")} ${v.unit || t('warehouse.units.kilo')}` });
    if (v.weight_kg) qtyInfo.push({ label: t('warehouse.voucherDetails.weightKg'), value: parseFloat(v.weight_kg).toLocaleString("en-US") });
    if (v.pieces_count) qtyInfo.push({ label: t('warehouse.voucherDetails.piecesCount'), value: v.pieces_count.toString() });
    if (v.unit_price) qtyInfo.push({ label: t('warehouse.voucherDetails.unitPrice'), value: parseFloat(v.unit_price).toLocaleString("en-US") });
    if (v.total_price) qtyInfo.push({ label: t('warehouse.voucherDetails.totalPrice'), value: parseFloat(v.total_price).toLocaleString("en-US") });
    if (qtyInfo.length > 0) sections.push({ title: t('warehouse.sections.quantityInfo'), icon: "⚖️", rows: qtyInfo });

    const partyInfo: Row[] = [];
    if (v.supplier_name_ar || v.supplier_name) partyInfo.push({ label: t('warehouse.voucherDetails.supplier'), value: v.supplier_name_ar || v.supplier_name });
    if (v.customer_name_ar || v.customer_name) partyInfo.push({ label: t('warehouse.voucherDetails.customer'), value: v.customer_name_ar || v.customer_name });
    if (partyInfo.length > 0) sections.push({ title: t('warehouse.sections.supplierCustomerInfo'), icon: "🏢", rows: partyInfo });

    const productionInfo: Row[] = [];
    if (v.production_order_number) productionInfo.push({ label: t('warehouse.voucherDetails.productionOrder'), value: v.production_order_number });
    if (v.from_production_line) productionInfo.push({ label: t('warehouse.voucherDetails.productionLine'), value: v.from_production_line });
    if (productionInfo.length > 0) sections.push({ title: t('warehouse.sections.productionInfo'), icon: "🏭", rows: productionInfo });

    const handoverInfo: Row[] = [];
    if (v.delivered_by) handoverInfo.push({ label: t('warehouse.voucherDetails.deliveredBy'), value: v.delivered_by });
    if (v.issued_to) handoverInfo.push({ label: t('warehouse.voucherDetails.receivedBy'), value: v.issued_to });
    if (v.to_destination) handoverInfo.push({ label: t('warehouse.voucherDetails.destination'), value: v.to_destination });
    if (handoverInfo.length > 0) sections.push({ title: t('warehouse.sections.handoverInfo'), icon: "🤝", rows: handoverInfo });

    const driverInfo: Row[] = [];
    if (v.driver_name) driverInfo.push({ label: t('warehouse.voucherDetails.driverName'), value: v.driver_name });
    if (v.driver_phone) driverInfo.push({ label: t('warehouse.voucherDetails.driverPhone'), value: v.driver_phone });
    if (v.vehicle_number) driverInfo.push({ label: t('warehouse.voucherDetails.vehicleNumber'), value: v.vehicle_number });
    if (v.delivery_address) driverInfo.push({ label: t('warehouse.voucherDetails.deliveryAddress'), value: v.delivery_address });
    if (driverInfo.length > 0) sections.push({ title: t('warehouse.sections.driverInfo'), icon: "🚛", rows: driverInfo });

    return sections;
  };

  const getFlatVoucherDetails = (v: any) => {
    return getGroupedVoucherDetails(v).flatMap(s => s.rows);
  };

  const renderPrintContent = (v: any) => {
    const sections = getGroupedVoucherDetails(v);
    let printItems: any[] = [];
    try { if (v.items) printItems = JSON.parse(v.items); } catch {}

    return (
      <div className="voucher-print">
        <div className="header">
          <img src={FactoryLogoPath} alt={t('warehouse.print.factoryLogo')} />
          <div className="header-center">
            <h1>{t('warehouse.print.factoryName')}</h1>
            <h2>{getTypeTitleLabel()}</h2>
          </div>
          <div className="header-left">
            <div>{v.voucher_number}</div>
            <div>{new Date(v.voucher_date).toLocaleDateString()}</div>
          </div>
        </div>

        {sections.map((section, si) => (
          <div key={si} className="print-section">
            <div className="section-title">{section.icon} {section.title}</div>
            <table className="details-table">
              <tbody>
                {section.rows.map((row, ri) => (
                  <tr key={ri}>
                    <td style={{ fontWeight: 600, width: "35%", backgroundColor: '#f8fafc' }}>{row.label}</td>
                    <td style={{ width: "65%" }}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        {printItems.length > 0 && (
          <div className="print-section">
            <div className="section-title">{t('warehouse.voucherDetails.receivedOrdersTitle')} ({printItems.length})</div>
            <table className="details-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center' }}>{t('warehouse.voucherDetails.productionOrder')}</th>
                  <th style={{ textAlign: 'center' }}>{t('warehouse.voucherDetails.orderNumber')}</th>
                  <th style={{ textAlign: 'center' }}>{t('warehouse.voucherDetails.customer')}</th>
                  <th style={{ textAlign: 'center' }}>{t('warehouse.delivery.product')}</th>
                  <th style={{ textAlign: 'center' }}>{t('warehouse.voucherDetails.weightKg')}</th>
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
                  <td colSpan={4} style={{ textAlign: 'center' }}>{t('warehouse.voucherDetails.total')}</td>
                  <td style={{ textAlign: 'center' }}>{printItems.reduce((s: number, it: any) => s + parseFloat(String(it.weight_kg || 0)), 0).toLocaleString("en-US")}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {v.notes && (
          <div className="notes-section">
            <div className="notes-label">{t('warehouse.voucherDetails.notes')}:</div>
            <div>{v.notes}</div>
          </div>
        )}

        <div className="signatures">
          <div className="sig-box">
            <div className="sig-line">{t('warehouse.print.warehouseKeeper')}</div>
          </div>
          <div className="sig-box">
            <div className="sig-line">{t('warehouse.print.receiver')}</div>
          </div>
          <div className="sig-box">
            <div className="sig-line">{t('warehouse.print.manager')}</div>
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
            <>
              <div className="hidden sm:block">
                <Table className="min-w-[700px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.voucherNumber')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.type')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.date')}</TableHead>
                      {(type === "raw-material-in" || type === "raw-material-out") && <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.item')}</TableHead>}
                      {type === "raw-material-in" && <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.supplier')}</TableHead>}
                      {type === "raw-material-out" && <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.destination')}</TableHead>}
                      <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.quantity')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.status')}</TableHead>
                      <TableHead className="text-center whitespace-nowrap">{t('warehouse.vouchers.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vouchers.map((voucher: any) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="text-center font-medium">{voucher.voucher_number}</TableCell>
                        <TableCell className="text-center">{getVoucherTypeLabel(voucher.voucher_type)}</TableCell>
                        <TableCell className="text-center">{new Date(voucher.voucher_date).toLocaleDateString("en-US")}</TableCell>
                        {(type === "raw-material-in" || type === "raw-material-out") && <TableCell className="text-center text-sm">{voucher.item_name_ar || voucher.item_name || voucher.item_id}</TableCell>}
                        {type === "raw-material-in" && <TableCell className="text-center text-sm">{voucher.supplier_name_ar || voucher.supplier_name || '-'}</TableCell>}
                        {type === "raw-material-out" && <TableCell className="text-center text-sm">{voucher.to_destination || voucher.production_order_number || '-'}</TableCell>}
                        <TableCell className="text-center">{parseFloat(voucher.quantity || 0).toLocaleString("en-US")} {voucher.unit || t('warehouse.units.kilo')}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex gap-1 justify-center">
                            <Button variant="ghost" size="sm" onClick={() => handleView(voucher)} title={t('warehouse.actions.viewVoucher')}><Eye className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handlePrint(voucher)} title={t('warehouse.actions.printVoucher')}><Printer className="h-4 w-4" /></Button>
                            {(type === "finished-goods-in" || type === "finished-goods-out" || type === "raw-material-in" || type === "raw-material-out") && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-4 w-4" /></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>{t('warehouse.vouchers.confirmDeleteTitle')}</AlertDialogTitle>
                                    <AlertDialogDescription>{t('warehouse.vouchers.confirmDeleteDesc', { number: voucher.voucher_number })}</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="gap-2">
                                    <AlertDialogCancel>{t('warehouse.buttons.cancel')}</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteMutation.mutate(voucher.id)} className="bg-red-600 hover:bg-red-700">{deleteMutation.isPending ? t('common.processing') : t('warehouse.vouchers.confirmDelete')}</AlertDialogAction>
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
              </div>
              <div className="sm:hidden space-y-3">
                {vouchers.map((voucher: any) => (
                  <div key={voucher.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm">{voucher.voucher_number}</span>
                      {getStatusBadge(voucher.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.vouchers.type')}:</span><span>{getVoucherTypeLabel(voucher.voucher_type)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.vouchers.date')}:</span><span>{new Date(voucher.voucher_date).toLocaleDateString("en-US")}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.vouchers.quantity')}:</span><span className="font-medium">{parseFloat(voucher.quantity || 0).toLocaleString("en-US")} {voucher.unit || t('warehouse.units.kilo')}</span></div>
                      {(type === "raw-material-in" || type === "raw-material-out") && <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.vouchers.item')}:</span><span>{voucher.item_name_ar || voucher.item_name || voucher.item_id}</span></div>}
                      {type === "raw-material-in" && <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.vouchers.supplier')}:</span><span>{voucher.supplier_name_ar || voucher.supplier_name || '-'}</span></div>}
                      {type === "raw-material-out" && <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.vouchers.destination')}:</span><span>{voucher.to_destination || voucher.production_order_number || '-'}</span></div>}
                    </div>
                    <div className="flex gap-1 pt-1 border-t">
                      <Button variant="ghost" size="sm" onClick={() => handleView(voucher)} className="flex-1 text-xs"><Eye className="h-3 w-3 ml-1" />{t('warehouse.actions.view')}</Button>
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(voucher)} className="flex-1 text-xs"><Printer className="h-3 w-3 ml-1" />{t('warehouse.actions.print')}</Button>
                      {(type === "finished-goods-in" || type === "finished-goods-out" || type === "raw-material-in" || type === "raw-material-out") && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="flex-1 text-xs text-red-500"><Trash2 className="h-3 w-3 ml-1" />{t('warehouse.actions.delete')}</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="w-[95vw] sm:w-full">
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('warehouse.vouchers.confirmDeleteTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>{t('warehouse.vouchers.confirmDeleteDesc', { number: voucher.voucher_number })}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2">
                              <AlertDialogCancel>{t('warehouse.buttons.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMutation.mutate(voucher.id)} className="bg-red-600 hover:bg-red-700">{deleteMutation.isPending ? t('common.processing') : t('warehouse.vouchers.confirmDelete')}</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewVoucher} onOpenChange={(open) => { if (!open) setViewVoucher(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto w-[95vw] sm:w-full" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getIcon()}
              <span>{getTypeTitleLabel()} - {viewVoucher?.voucher_number}</span>
            </DialogTitle>
          </DialogHeader>

          {viewVoucher && (
            <div className="space-y-3">
              {getGroupedVoucherDetails(viewVoucher).map((section, si) => (
                <div key={si} className="border rounded-lg overflow-hidden dark:border-gray-700">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border-b dark:border-gray-700">
                    <span className="text-sm">{section.icon}</span>
                    <span className="font-semibold text-xs sm:text-sm text-blue-800 dark:text-blue-200">{section.title}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
                    {section.rows.map((row, ri) => (
                      <div key={ri} className="flex gap-2 px-3 py-2 border-b dark:border-gray-700 last:border-b-0">
                        <span className="font-semibold text-gray-500 dark:text-gray-400 min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm">{row.label}:</span>
                        <span className="text-xs sm:text-sm font-medium">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {(() => {
                let parsedItems: any[] = [];
                try { if (viewVoucher.items) parsedItems = JSON.parse(viewVoucher.items); } catch {}
                if (parsedItems.length <= 0) return null;
                return (
                  <div className="border rounded-lg overflow-hidden dark:border-gray-700">
                    <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border-b dark:border-gray-700">
                      <span className="font-semibold text-xs sm:text-sm text-blue-800 dark:text-blue-200">{t('warehouse.voucherDetails.receivedOrdersTitle')} ({parsedItems.length})</span>
                    </div>
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-xs sm:text-sm min-w-[400px]">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="py-2 px-3 text-center font-medium">{t('warehouse.voucherDetails.productionOrder')}</th>
                            <th className="py-2 px-3 text-center font-medium">{t('warehouse.voucherDetails.orderNumber')}</th>
                            <th className="py-2 px-3 text-center font-medium">{t('warehouse.voucherDetails.customer')}</th>
                            <th className="py-2 px-3 text-center font-medium">{t('warehouse.delivery.product')}</th>
                            <th className="py-2 px-3 text-center font-medium">{t('warehouse.voucherDetails.weightKg')}</th>
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
                            <td className="py-2 px-3 text-center" colSpan={4}>{t('warehouse.voucherDetails.total')}</td>
                            <td className="py-2 px-3 text-center">{parsedItems.reduce((s: number, it: any) => s + parseFloat(String(it.weight_kg || 0)), 0).toLocaleString("en-US")}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="sm:hidden space-y-2 p-2">
                      {parsedItems.map((item: any, idx: number) => (
                        <div key={idx} className="border rounded-lg p-3 bg-white dark:bg-gray-900 dark:border-gray-700 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs">{item.production_order_number || `PO-${item.production_order_id}`}</span>
                            <span className="text-xs text-muted-foreground">{item.order_number || '-'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t('warehouse.voucherDetails.customer')}:</span>
                            <span>{item.customer_name || '-'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t('warehouse.delivery.product')}:</span>
                            <span>{item.product_description || '-'}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{t('warehouse.voucherDetails.weightKg')}:</span>
                            <span className="font-semibold">{parseFloat(String(item.weight_kg || 0)).toLocaleString("en-US")}</span>
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-2 flex justify-between items-center px-2 dark:border-gray-700">
                        <span className="font-semibold text-xs">{t('warehouse.voucherDetails.total')}</span>
                        <span className="font-bold text-xs">{parsedItems.reduce((s: number, it: any) => s + parseFloat(String(it.weight_kg || 0)), 0).toLocaleString("en-US")} {t('warehouse.delivery.kg')}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {viewVoucher.notes && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm mb-1">{t('warehouse.voucherDetails.notes')}:</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">{viewVoucher.notes}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={() => setViewVoucher(null)}>
                  <X className="h-4 w-4 ml-1" />
                  {t('warehouse.actions.close')}
                </Button>
                <Button onClick={() => handlePrint(viewVoucher)}>
                  <Printer className="h-4 w-4 ml-1" />
                  {t('warehouse.actions.print')}
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
