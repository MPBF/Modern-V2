import { useQuery } from "@tanstack/react-query";
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
import { Eye, Printer, Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";

interface VouchersListProps {
  type: "raw-material-in" | "raw-material-out" | "finished-goods-in" | "finished-goods-out";
  title: string;
  onView?: (voucher: any) => void;
}

export function VouchersList({ type, title, onView }: VouchersListProps) {
  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: [`/api/warehouse/vouchers/${type}`],
    queryFn: async () => {
      const response = await fetch(`/api/warehouse/vouchers/${type}`);
      if (!response.ok) throw new Error("فشل في جلب السندات");
      return response.json();
    },
  });

  const getVoucherTypeLabel = (voucherType: string) => {
    const labels: Record<string, string> = {
      purchase: "شراء",
      opening_balance: "رصيد افتتاحي",
      return: "مرتجع",
      production_transfer: "تحويل للإنتاج",
      return_to_supplier: "إرجاع للمورد",
      adjustment: "تسوية",
      production_receipt: "استلام إنتاج",
      customer_return: "مرتجع عميل",
      customer_delivery: "تسليم عميل",
      sample: "عينة",
    };
    return labels[voucherType] || voucherType;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">مكتمل</Badge>;
      case "draft":
        return <Badge className="bg-yellow-100 text-yellow-800">مسودة</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">ملغي</Badge>;
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
          <p className="mt-2 text-gray-500">جاري التحميل...</p>
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
            لا توجد سندات بعد
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم السند</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الكمية</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher: any) => (
                <TableRow key={voucher.id}>
                  <TableCell className="font-medium">
                    {voucher.voucher_number}
                  </TableCell>
                  <TableCell>
                    {getVoucherTypeLabel(voucher.voucher_type)}
                  </TableCell>
                  <TableCell>
                    {new Date(voucher.voucher_date).toLocaleDateString("ar-SA")}
                  </TableCell>
                  <TableCell>
                    {parseFloat(voucher.quantity || 0).toLocaleString()} {voucher.unit || "كيلو"}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(voucher.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
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
