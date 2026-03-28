import { useState } from "react";
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      if (!response.ok) throw new Error(t('warehouse.errors.exportFailed'));
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: t('warehouse.reports.exportSuccess') });
    } catch (error) {
      toast({ title: t('warehouse.reports.exportError'), variant: "destructive" });
    }
  };

  const handleDownloadTemplate = async (type: string) => {
    try {
      const response = await fetch(`/api/warehouse/template/${type}`);
      if (!response.ok) throw new Error(t('warehouse.errors.templateFailed'));
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({ title: t('warehouse.reports.templateDownloaded') });
    } catch (error) {
      toast({ title: t('warehouse.reports.templateDownloadError'), variant: "destructive" });
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({ title: t('warehouse.reports.selectFile'), variant: "destructive" });
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
        toast({ title: result.message || t('warehouse.reports.importError'), variant: "destructive" });
      }
    } catch (error) {
      toast({ title: t('warehouse.reports.importError'), variant: "destructive" });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 sm:inline-flex sm:flex-nowrap sm:h-10">
          <TabsTrigger value="summary" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3">{t('warehouse.reports.summary')}</TabsTrigger>
          <TabsTrigger value="stock" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3">{t('warehouse.reports.balances')}</TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3">{t('warehouse.reports.alerts')}</TabsTrigger>
          <TabsTrigger value="movements" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3">{t('warehouse.reports.movements')}</TabsTrigger>
          <TabsTrigger value="import-export" className="text-xs px-2 py-1.5 sm:text-sm sm:px-3">{t('warehouse.reports.importExport')}</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          {summaryLoading ? (
            <div className="text-center py-8 text-muted-foreground">{t('warehouse.loading')}</div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('warehouse.reports.totalItems')}</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(summary as any)?.totalItems || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('warehouse.reports.totalSuppliers')}</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{(summary as any)?.totalSuppliers || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('warehouse.reports.itemsBelowMin')}</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">{(summary as any)?.lowStockItems || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('warehouse.reports.inventoryValue')}</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Number((summary as any)?.totalInventoryValue || 0).toLocaleString("en-US")} {t('warehouse.currency')}
                </div>
              </CardContent>
            </Card>
          </div>
          )}
        </TabsContent>

        <TabsContent value="stock">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-base">{t('warehouse.reports.currentBalancesReport')}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handleExport("items")} className="w-full sm:w-auto">
                <Download className="h-4 w-4 ml-2" />
                {t('warehouse.reports.exportExcel')}
              </Button>
            </CardHeader>
            <CardContent>
              {stockLoading ? (
                <div className="text-center py-8 text-muted-foreground">{t('warehouse.loading')}</div>
              ) : (
              <>
                <div className="hidden sm:block">
                  <Table className="min-w-[800px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.code')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.labels.item')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.classification')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.labels.unit')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.currentBalance')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.minLimit')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.status')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.value')}</TableHead>
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
                            <Badge variant={item.stock_status === "low" ? "destructive" : item.stock_status === "high" ? "outline" : "default"}>
                              {item.stock_status === "low" ? t('warehouse.reports.statusLow') : item.stock_status === "high" ? t('warehouse.reports.statusHigh') : t('warehouse.reports.statusNormal')}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{Number(item.total_value || 0).toLocaleString("en-US")} {t('warehouse.currency')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="sm:hidden space-y-3">
                  {(stockLevels as any[])?.map((item: any) => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-sm">{item.name_ar}</span>
                          <span className="text-xs text-gray-500 mr-2">({item.code})</span>
                        </div>
                        <Badge variant={item.stock_status === "low" ? "destructive" : item.stock_status === "high" ? "outline" : "default"}>
                          {item.stock_status === "low" ? t('warehouse.reports.statusLow') : item.stock_status === "high" ? t('warehouse.reports.statusHigh') : t('warehouse.reports.statusNormal')}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.reports.classification')}:</span><span>{item.category}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.labels.unit')}:</span><span>{item.unit}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.reports.currentBalance')}:</span><span className="font-bold">{item.current_stock}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.reports.minLimit')}:</span><span>{item.min_stock}</span></div>
                        <div className="flex justify-between col-span-2"><span className="text-gray-500">{t('warehouse.reports.value')}:</span><span className="font-medium">{Number(item.total_value || 0).toLocaleString("en-US")} {t('warehouse.currency')}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                {t('warehouse.reports.inventoryAlerts')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(alerts as any[])?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t('warehouse.reports.noAlerts')}
                </div>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table className="min-w-[500px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">{t('warehouse.reports.code')}</TableHead>
                          <TableHead className="whitespace-nowrap">{t('warehouse.labels.item')}</TableHead>
                          <TableHead className="whitespace-nowrap">{t('warehouse.reports.currentBalance')}</TableHead>
                          <TableHead className="whitespace-nowrap">{t('warehouse.reports.minLimit')}</TableHead>
                          <TableHead className="whitespace-nowrap">{t('warehouse.reports.shortage')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(alerts as any[])?.map((item: any) => (
                          <TableRow key={item.id} className="bg-red-50 dark:bg-red-950">
                            <TableCell>{item.code}</TableCell>
                            <TableCell>{item.name_ar}</TableCell>
                            <TableCell className="text-red-600 font-bold">{item.current_stock}</TableCell>
                            <TableCell>{item.min_stock}</TableCell>
                            <TableCell><Badge variant="destructive">{item.shortage}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="sm:hidden space-y-2">
                    {(alerts as any[])?.map((item: any) => (
                      <div key={item.id} className="border border-red-200 rounded-lg p-3 bg-red-50 dark:bg-red-950 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-sm">{item.name_ar}</span>
                            <span className="text-xs text-gray-500 mr-2">({item.code})</span>
                          </div>
                          <Badge variant="destructive">{t('warehouse.reports.shortage')}: {item.shortage}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 text-xs">
                          <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.reports.currentBalance')}:</span><span className="text-red-600 font-bold">{item.current_stock}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.reports.minLimit')}:</span><span>{item.min_stock}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements">
          <Card>
            <CardHeader>
              <CardTitle>{t('warehouse.reports.movementsReport')}</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
                <div className="flex-1">
                  <Label className="text-xs sm:text-sm">{t('warehouse.reports.fromDate')}</Label>
                  <Input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs sm:text-sm">{t('warehouse.reports.toDate')}</Label>
                  <Input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={() => refetchMovements()} className="w-full sm:w-auto">
                    <RefreshCw className="h-4 w-4 ml-2" />
                    {t('warehouse.reports.refresh')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <>
                <div className="hidden sm:block">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.dateColumn')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.labels.item')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.movementType')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.labels.quantity')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.reports.reference')}</TableHead>
                        <TableHead className="whitespace-nowrap">{t('warehouse.labels.notes')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(movements as any[])?.map((mov: any) => (
                        <TableRow key={mov.id}>
                          <TableCell className="whitespace-nowrap">{new Date(mov.created_at).toLocaleDateString("en-US")}</TableCell>
                          <TableCell>{mov.item_name || mov.item_code}</TableCell>
                          <TableCell>
                            <Badge variant={mov.movement_type === "in" ? "default" : "secondary"}>
                              {mov.movement_type === "in" ? <><TrendingUp className="h-3 w-3 ml-1" /> {t('warehouse.movementTypes.in')}</> : <><TrendingDown className="h-3 w-3 ml-1" /> {t('warehouse.movementTypes.out')}</>}
                            </Badge>
                          </TableCell>
                          <TableCell>{mov.quantity}</TableCell>
                          <TableCell className="whitespace-nowrap">{mov.reference_type} - {mov.reference_id}</TableCell>
                          <TableCell>{mov.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="sm:hidden space-y-3">
                  {(movements as any[])?.map((mov: any) => (
                    <div key={mov.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">{mov.item_name || mov.item_code}</span>
                        <Badge variant={mov.movement_type === "in" ? "default" : "secondary"}>
                          {mov.movement_type === "in" ? <><TrendingUp className="h-3 w-3 ml-1" /> {t('warehouse.movementTypes.in')}</> : <><TrendingDown className="h-3 w-3 ml-1" /> {t('warehouse.movementTypes.out')}</>}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.reports.dateColumn')}:</span><span>{new Date(mov.created_at).toLocaleDateString("en-US")}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">{t('warehouse.labels.quantity')}:</span><span className="font-bold">{mov.quantity}</span></div>
                        <div className="flex justify-between col-span-2"><span className="text-gray-500">{t('warehouse.reports.reference')}:</span><span>{mov.reference_type} - {mov.reference_id}</span></div>
                        {mov.notes && <div className="flex justify-between col-span-2"><span className="text-gray-500">{t('warehouse.labels.notes')}:</span><span>{mov.notes}</span></div>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {t('warehouse.reports.exportData')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button className="w-full" variant="outline" onClick={() => handleExport("items")}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  {t('warehouse.reports.exportItems')}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => handleExport("suppliers")}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  {t('warehouse.reports.exportSuppliers')}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => handleExport("vouchers/raw-material-in")}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  {t('warehouse.reports.exportRawMaterialInVouchers')}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => handleExport("vouchers/raw-material-out")}>
                  <FileSpreadsheet className="h-4 w-4 ml-2" />
                  {t('warehouse.reports.exportRawMaterialOutVouchers')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {t('warehouse.reports.importData')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('warehouse.reports.dataType')}</Label>
                  <Select value={importType} onValueChange={setImportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opening-balance">{t('warehouse.reports.openingBalances')}</SelectItem>
                      <SelectItem value="suppliers">{t('warehouse.reports.suppliers')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>{t('warehouse.reports.excelFile')}</Label>
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
                    {isImporting ? t('warehouse.reports.importing') : t('warehouse.reports.import')}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => handleDownloadTemplate(importType)}
                  >
                    {t('warehouse.reports.downloadTemplate')}
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
