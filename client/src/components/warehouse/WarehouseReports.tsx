import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  AlertTriangle, 
  Package, 
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";

export function WarehouseReports() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("summary");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState("opening-balance");
  const [isImporting, setIsImporting] = useState(false);

  const { data: summary, refetch: refetchSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/warehouse/reports/summary"],
  });

  const { data: stockLevels, refetch: refetchStock, isLoading: stockLoading } = useQuery({
    queryKey: ["/api/warehouse/reports/stock-levels"],
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["/api/warehouse/reports/alerts"],
  });

  const buildMovementsUrl = () => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return `/api/warehouse/reports/movements${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const { data: movements, refetch: refetchMovements, isLoading: movementsLoading } = useQuery({
    queryKey: ["/api/warehouse/reports/movements", startDate, endDate],
    queryFn: async () => {
      const response = await fetch(buildMovementsUrl());
      if (!response.ok) throw new Error("Failed to fetch movements");
      return response.json();
    },
    enabled: activeTab === "movements",
  });

  const handleExport = async (type: string) => {
    try {
      const response = await fetch(`/api/warehouse/export/${type}`);
      if (!response.ok) throw new Error("فشل التصدير");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "تم التصدير بنجاح" });
    } catch (error) {
      toast({ title: "خطأ في التصدير", variant: "destructive" });
    }
  };

  const handleDownloadTemplate = async (type: string) => {
    try {
      const response = await fetch(`/api/warehouse/template/${type}`);
      if (!response.ok) throw new Error("فشل تحميل القالب");
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: "تم تحميل القالب بنجاح" });
    } catch (error) {
      toast({ title: "خطأ في تحميل القالب", variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({ title: "الرجاء اختيار ملف", variant: "destructive" });
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      
      const response = await fetch(`/api/warehouse/import/${importType}`, {
        method: "POST",
        body: formData,
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({ title: result.message });
        setImportFile(null);
        refetchSummary();
        refetchStock();
      } else {
        toast({ title: result.message || "خطأ في الاستيراد", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "خطأ في الاستيراد", variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">الملخص</TabsTrigger>
          <TabsTrigger value="stock">الأرصدة</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
          <TabsTrigger value="movements">الحركات</TabsTrigger>
          <TabsTrigger value="import-export">استيراد/تصدير</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {summaryLoading ? (
            <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الأصناف</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(summary as any)?.totalItems || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الموردين</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(summary as any)?.totalSuppliers || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">أصناف تحت الحد الأدنى</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{(summary as any)?.lowStockItems || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">قيمة المخزون</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number((summary as any)?.totalInventoryValue || 0).toLocaleString()} ر.س
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تقرير الأرصدة الحالية</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport("items")}>
                <Download className="h-4 w-4 ml-2" />
                تصدير Excel
              </Button>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الكود</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead>التصنيف</TableHead>
                    <TableHead>الوحدة</TableHead>
                    <TableHead>الرصيد الحالي</TableHead>
                    <TableHead>الحد الأدنى</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>القيمة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stockLevels as any[])?.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.code}</TableCell>
                      <TableCell>{item.name_ar}</TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.current_stock}</TableCell>
                      <TableCell>{item.min_stock}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.stock_status === "low" ? "destructive" : 
                          item.stock_status === "high" ? "outline" : "default"
                        }>
                          {item.stock_status === "low" ? "منخفض" : 
                           item.stock_status === "high" ? "مرتفع" : "طبيعي"}
                        </Badge>
                      </TableCell>
                      <TableCell>{Number(item.total_value || 0).toLocaleString()} ر.س</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                تنبيهات المخزون
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(alerts as any[])?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  لا توجد تنبيهات - جميع الأصناف فوق الحد الأدنى
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الكود</TableHead>
                      <TableHead>الصنف</TableHead>
                      <TableHead>الرصيد الحالي</TableHead>
                      <TableHead>الحد الأدنى</TableHead>
                      <TableHead>النقص</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(alerts as any[])?.map((item: any) => (
                      <TableRow key={item.id} className="bg-red-50 dark:bg-red-950">
                        <TableCell>{item.code}</TableCell>
                        <TableCell>{item.name_ar}</TableCell>
                        <TableCell className="text-red-600 font-bold">{item.current_stock}</TableCell>
                        <TableCell>{item.min_stock}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{item.shortage}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>تقرير حركات المخزون</CardTitle>
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <Label>من تاريخ</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                </div>
                <div className="flex-1">
                  <Label>إلى تاريخ</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => refetchMovements()}>
                    <RefreshCw className="h-4 w-4 ml-2" />
                    تحديث
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>الصنف</TableHead>
                    <TableHead>نوع الحركة</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead>ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(movements as any[])?.map((mov: any) => (
                    <TableRow key={mov.id}>
                      <TableCell>
                        {new Date(mov.created_at).toLocaleDateString("ar-SA")}
                      </TableCell>
                      <TableCell>{mov.item_name || mov.item_code}</TableCell>
                      <TableCell>
                        <Badge variant={mov.movement_type === "in" ? "default" : "secondary"}>
                          {mov.movement_type === "in" ? (
                            <><TrendingUp className="h-3 w-3 ml-1" /> إدخال</>
                          ) : (
                            <><TrendingDown className="h-3 w-3 ml-1" /> إخراج</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{mov.quantity}</TableCell>
                      <TableCell>{mov.reference_type} - {mov.reference_id}</TableCell>
                      <TableCell>{mov.notes}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  تصدير البيانات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" variant="outline" onClick={() => handleExport("items")}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  تصدير الأصناف
                </Button>
                <Button className="w-full" variant="outline" onClick={() => handleExport("suppliers")}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  تصدير الموردين
                </Button>
                <Button className="w-full" variant="outline" onClick={() => handleExport("vouchers/raw-material-in")}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  تصدير سندات إدخال المواد الخام
                </Button>
                <Button className="w-full" variant="outline" onClick={() => handleExport("vouchers/raw-material-out")}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  تصدير سندات إخراج المواد الخام
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  استيراد البيانات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>نوع البيانات</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening-balance">أرصدة افتتاحية</SelectItem>
                      <SelectItem value="suppliers">موردين</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>ملف Excel</Label>
                  <Input 
                    type="file" 
                    accept=".xlsx,.xls"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleImport}
                    disabled={!importFile || isImporting}
                  >
                    {isImporting ? "جاري الاستيراد..." : "استيراد"}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleDownloadTemplate(importType)}
                  >
                    تحميل قالب
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
