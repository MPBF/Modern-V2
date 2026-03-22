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
import { Eye, Printer, Package, ArrowDownToLine, ArrowUpFromLine, Trash2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface VouchersListProps {
  type: "raw-material-in" | "raw-material-out" | "finished-goods-in" | "finished-goods-out";
  title: string;
  onView?: (voucher: any) => void;
}

export function VouchersList({ type, title, onView }: VouchersListProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
                        onClick={() => onView?.(voucher)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {type === "finished-goods-in" && (
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
  );
}

export default VouchersList;
