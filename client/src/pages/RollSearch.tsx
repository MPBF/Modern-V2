import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from 'react-i18next';
import PageLayout from "../components/layout/PageLayout";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { ScrollArea } from "../components/ui/scroll-area";
import { Skeleton } from "../components/ui/skeleton";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { cn } from "../lib/utils";
import { useToast } from "../hooks/use-toast";
import {
  Search,
  ScanLine,
  Filter,
  CalendarIcon,
  Package,
  X,
  Film,
  PrinterIcon,
  Scissors,
  CheckCircle,
  Clock,
  QrCode,
  RefreshCw,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import RollDetailsCard from "../components/production/RollDetailsCard";
import { queryClient } from "../lib/queryClient";
import * as XLSX from "xlsx";

interface RollSearchResult {
  roll_id: number;
  roll_number: string;
  roll_seq: number;
  qr_code_text: string;
  qr_png_base64?: string;
  stage: string;
  weight_kg: string;
  cut_weight_total_kg?: string;
  waste_kg?: string;
  created_at: string;
  printed_at?: string;
  cut_completed_at?: string;
  production_order_id: number;
  production_order_number: string;
  order_id: number;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_name_ar?: string;
  item_name?: string;
  item_name_ar?: string;
  size_caption?: string;
  raw_material?: string;
  color?: string;
  punching?: string;
  film_machine_name?: string;
  printing_machine_name?: string;
  cutting_machine_name?: string;
  created_by_name?: string;
  printed_by_name?: string;
  cut_by_name?: string;
}

interface SearchFilters {
  stage?: string;
  startDate?: Date;
  endDate?: Date;
  machineId?: string;
  operatorId?: number;
  minWeight?: number;
  maxWeight?: number;
  productionOrderId?: number;
  orderId?: number;
}

export default function RollSearch() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedRollId, setSelectedRollId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");

  useEffect(() => {
    const history = localStorage.getItem("rollSearchHistory");
    if (history) {
      setSearchHistory(JSON.parse(history).slice(0, 10));
    }
  }, []);

  const saveToHistory = (query: string) => {
    if (query.trim()) {
      const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem("rollSearchHistory", JSON.stringify(newHistory));
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      if (searchQuery) saveToHistory(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "f") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.append("q", debouncedQuery);
    if (filters.stage) params.append("stage", filters.stage);
    if (filters.startDate) params.append("start_date", format(filters.startDate, "yyyy-MM-dd"));
    if (filters.endDate) params.append("end_date", format(filters.endDate, "yyyy-MM-dd"));
    if (filters.machineId) params.append("machine_id", filters.machineId);
    if (filters.operatorId) params.append("operator_id", filters.operatorId.toString());
    if (filters.minWeight) params.append("min_weight", filters.minWeight.toString());
    if (filters.maxWeight) params.append("max_weight", filters.maxWeight.toString());
    if (filters.productionOrderId) params.append("production_order_id", filters.productionOrderId.toString());
    if (filters.orderId) params.append("order_id", filters.orderId.toString());
    return params.toString();
  };

  const { data: searchResults = [], isLoading: isSearching } = useQuery<RollSearchResult[]>({
    queryKey: ["/api/rolls/search", buildQueryParams()],
    enabled: debouncedQuery.length > 0 || Object.keys(filters).length > 0,
  });

  const searchByBarcodeMutation = useMutation({
    mutationFn: async (barcode: string) => {
      const response = await fetch(`/api/rolls/search-by-barcode/${barcode}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('system.search.barcodeSearchError'));
      }
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedRollId(data.roll_id);
      toast({
        title: t('system.search.rollFoundSuccess'),
        description: `${t('system.search.rollNumber')}: ${data.roll_number}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('system.search.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const exportToExcel = () => {
    if (!searchResults || searchResults.length === 0) {
      toast({
        title: t('system.search.noDataToExport'),
        variant: "destructive",
      });
      return;
    }

    const data = searchResults.map((roll: RollSearchResult) => ({
      [t('system.search.rollNumber')]: roll.roll_number,
      [t('system.search.productionOrder')]: roll.production_order_number,
      [t('system.search.orderNumber')]: roll.order_number,
      [t('orders.customer')]: roll.customer_name_ar || roll.customer_name,
      [t('production.product')]: roll.item_name_ar || roll.item_name || "-",
      [t('production.specifications')]: roll.size_caption || "-",
      [t('system.search.stage')]: getStageLabel(roll.stage),
      [t('system.search.weight')]: roll.weight_kg,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('system.search.searchResults'));
    XLSX.writeFile(wb, `roll_search_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`);

    toast({
      title: t('system.search.exportSuccess'),
      description: t('system.search.exportSuccessDesc', { count: searchResults.length }),
    });
  };

  const getStageLabel = (stage: string) => {
    const stageKey = stage as 'film' | 'printing' | 'cutting' | 'done';
    return t(`system.search.stages.${stageKey}`, stage);
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "film": return <Film className="h-4 w-4" />;
      case "printing": return <PrinterIcon className="h-4 w-4" />;
      case "cutting": return <Scissors className="h-4 w-4" />;
      case "done": return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case "film": return "default";
      case "printing": return "secondary";
      case "cutting": return "warning";
      case "done": return "success";
      default: return "default";
    }
  };

  const handleBarcodeScan = () => {
    if (barcodeInput.trim()) {
      searchByBarcodeMutation.mutate(barcodeInput.trim());
      setBarcodeInput("");
    }
  };

  return (
    <PageLayout title={t('system.search.title')} description={t('system.search.description')}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <Tabs defaultValue="text" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text" data-testid="tab-text-search">
                    <Search className="h-4 w-4 ml-2" />
                    {t('system.search.textSearch')}
                  </TabsTrigger>
                  <TabsTrigger value="barcode" data-testid="tab-barcode-search">
                    <ScanLine className="h-4 w-4 ml-2" />
                    {t('system.search.barcodeSearch')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="search-input"
                      type="text"
                      placeholder={t('system.search.placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10 text-lg h-12"
                      data-testid="input-search"
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSearchQuery("")}
                        className="absolute left-2 top-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {searchHistory.length > 0 && !searchQuery && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">{t('system.search.recentSearches')}</Label>
                      <div className="flex flex-wrap gap-2">
                        {searchHistory.map((query, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80"
                            onClick={() => setSearchQuery(query)}
                          >
                            <Clock className="h-3 w-3 ml-1" />
                            {query}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      data-testid="button-toggle-filters"
                    >
                      <Filter className="h-4 w-4 ml-2" />
                      {t('system.search.advancedFilters')}
                      {Object.keys(filters).length > 0 && (
                        <Badge className="mr-2" variant="secondary">
                          {Object.keys(filters).length}
                        </Badge>
                      )}
                    </Button>

                    {Object.keys(filters).length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFilters({})}
                        data-testid="button-clear-filters"
                      >
                        {t('system.search.clearFilters')}
                      </Button>
                    )}
                  </div>

                  {showFilters && (
                    <Card className="p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{t('system.search.stage')}</Label>
                          <Select
                            value={filters.stage || "all"}
                            onValueChange={(value) => setFilters({ ...filters, stage: value === "all" ? undefined : value })}
                          >
                            <SelectTrigger data-testid="select-stage-filter">
                              <SelectValue placeholder={t('system.search.allStages')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">{t('system.search.allStages')}</SelectItem>
                              <SelectItem value="film">{t('system.search.stages.film')}</SelectItem>
                              <SelectItem value="printing">{t('system.search.stages.printing')}</SelectItem>
                              <SelectItem value="cutting">{t('system.search.stages.cutting')}</SelectItem>
                              <SelectItem value="done">{t('system.search.stages.done')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{t('system.search.fromDate')}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-right",
                                  !filters.startDate && "text-muted-foreground"
                                )}
                                data-testid="button-start-date"
                              >
                                <CalendarIcon className="ml-2 h-4 w-4" />
                                {filters.startDate ? format(filters.startDate, "PPP", { locale: ar }) : t('system.search.selectDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={filters.startDate}
                                onSelect={(date) => setFilters({ ...filters, startDate: date || undefined })}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label>{t('system.search.toDate')}</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-right",
                                  !filters.endDate && "text-muted-foreground"
                                )}
                                data-testid="button-end-date"
                              >
                                <CalendarIcon className="ml-2 h-4 w-4" />
                                {filters.endDate ? format(filters.endDate, "PPP", { locale: ar }) : t('system.search.selectDate')}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={filters.endDate}
                                onSelect={(date) => setFilters({ ...filters, endDate: date || undefined })}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label>{t('system.search.minWeight')}</Label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={filters.minWeight || ""}
                            onChange={(e) => setFilters({ ...filters, minWeight: e.target.value ? parseFloat(e.target.value) : undefined })}
                            data-testid="input-min-weight"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>{t('system.search.maxWeight')}</Label>
                          <Input
                            type="number"
                            placeholder="1000"
                            value={filters.maxWeight || ""}
                            onChange={(e) => setFilters({ ...filters, maxWeight: e.target.value ? parseFloat(e.target.value) : undefined })}
                            data-testid="input-max-weight"
                          />
                        </div>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="barcode" className="space-y-4">
                  <div className="text-center space-y-4">
                    <QrCode className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {t('system.search.scanBarcodeDesc')}
                    </p>
                    <div className="flex gap-2 max-w-md mx-auto">
                      <Input
                        type="text"
                        placeholder={t('system.search.enterBarcodeNumber')}
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && handleBarcodeScan()}
                        className="text-lg h-12"
                        data-testid="input-barcode"
                      />
                      <Button
                        onClick={handleBarcodeScan}
                        disabled={!barcodeInput.trim() || searchByBarcodeMutation.isPending}
                        data-testid="button-scan"
                      >
                        {searchByBarcodeMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <ScanLine className="h-4 w-4" />
                        )}
                        {t('system.search.scan')}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="mt-6">
                {isSearching ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className="h-24" />
                    ))}
                  </div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">
                        {t('system.search.searchResults')} ({searchResults.length})
                      </h3>
                      <Button variant="outline" size="sm" onClick={exportToExcel} data-testid="button-export">
                        <Download className="h-4 w-4 ml-2" />
                        {t('system.search.exportExcel')}
                      </Button>
                    </div>
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-3">
                        {searchResults.map((roll: RollSearchResult) => (
                          <Card
                            key={roll.roll_id}
                            className={cn(
                              "p-4 cursor-pointer hover:shadow-md transition-shadow",
                              selectedRollId === roll.roll_id && "ring-2 ring-primary"
                            )}
                            onClick={() => setSelectedRollId(roll.roll_id)}
                            data-testid={`card-roll-${roll.roll_id}`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded">
                                    <Package className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-lg">{roll.roll_number}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {roll.customer_name_ar || roll.customer_name}
                                    </p>
                                  </div>
                                </div>
                                <Badge variant={getStageColor(roll.stage) as any}>
                                  {getStageIcon(roll.stage)}
                                  {getStageLabel(roll.stage)}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-muted-foreground">{t('system.search.productionOrder')}</p>
                                  <p className="font-medium">{roll.production_order_number}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t('system.search.orderNumber')}</p>
                                  <p className="font-medium">{roll.order_number}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t('system.search.weight')}</p>
                                  <p className="font-medium">{roll.weight_kg} {t('common.kg')}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">{t('system.search.createdAt')}</p>
                                  <p className="font-medium">
                                    {format(new Date(roll.created_at), "yyyy-MM-dd", { locale: ar })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : debouncedQuery || Object.keys(filters).length > 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">{t('system.search.noResults')}</h3>
                    <p className="text-muted-foreground">{t('system.search.noResultsDesc')}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          </div>

          <div className="lg:col-span-1">
            {selectedRollId && (
              <Card className="p-4 sticky top-4">
                <h3 className="font-semibold mb-4">{t('system.search.rollDetails')}</h3>
                <RollDetailsCard rollId={selectedRollId} />
              </Card>
            )}
          </div>
      </div>
    </PageLayout>
  );
}
