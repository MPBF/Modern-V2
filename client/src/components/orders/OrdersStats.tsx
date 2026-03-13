import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Package, Clock } from "lucide-react";

interface OrdersStatsProps {
  orders: any[];
  productionOrders: any[];
}

export default function OrdersStats({
  orders,
  productionOrders,
}: OrdersStatsProps) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProdOrders = Array.isArray(productionOrders) ? productionOrders : [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeOrders.length}</div>
          <p className="text-xs text-muted-foreground">طلب</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">أوامر الإنتاج</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{safeProdOrders.length}</div>
          <p className="text-xs text-muted-foreground">أمر إنتاج</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">قيد التنفيذ</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">
            {safeProdOrders.filter((po: any) => po.status === "in_progress").length}
          </div>
          <p className="text-xs text-muted-foreground">أمر قيد التنفيذ</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مكتملة</CardTitle>
          <Package className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {safeProdOrders.filter((po: any) => po.status === "completed").length}
          </div>
          <p className="text-xs text-muted-foreground">أمر مكتمل</p>
        </CardContent>
      </Card>
    </div>
  );
}
