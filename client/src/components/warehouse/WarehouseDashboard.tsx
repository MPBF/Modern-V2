import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  ClipboardCheck,
} from "lucide-react";

export function WarehouseDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["/api/warehouse/vouchers/stats"],
    queryFn: async () => {
      const res = await fetch("/api/warehouse/vouchers/stats");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: inventoryStats } = useQuery({
    queryKey: ["/api/inventory/stats"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/stats");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const cards = [
    {
      title: "سندات إدخال مواد خام",
      value: stats?.raw_material_in || 0,
      icon: ArrowDownToLine,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "سندات إخراج مواد خام",
      value: stats?.raw_material_out || 0,
      icon: ArrowUpFromLine,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "سندات استلام مواد تامة",
      value: stats?.finished_goods_in || 0,
      icon: Package,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "سندات إخراج مواد تامة",
      value: stats?.finished_goods_out || 0,
      icon: Boxes,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "إجمالي الأصناف",
      value: inventoryStats?.totalItems || 0,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "أصناف منخفضة",
      value: inventoryStats?.lowStockItems || 0,
      icon: ClipboardCheck,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-gray-600">
              {card.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${card.bgColor}`}>
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.color}`}>
              {card.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default WarehouseDashboard;
