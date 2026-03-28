import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  ScanBarcode, Package, ArrowDownToLine, ArrowUpFromLine,
  ClipboardList, Camera, CameraOff, Search,
  ChevronRight, AlertTriangle, CheckCircle, XCircle,
  Keyboard, RotateCcw, Box, Truck, Plus, ArrowLeft, Home,
  Warehouse as WarehouseIcon
} from "lucide-react";

type MobileView = "dashboard" | "scanner" | "inventory" | "voucher" | "count";

export default function WarehouseMobile() {
  const [currentView, setCurrentView] = useState<MobileView>("dashboard");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {currentView === "dashboard" && <MobileDashboard onNavigate={setCurrentView} />}
      {currentView === "scanner" && <MobileScanner onBack={() => setCurrentView("dashboard")} />}
      {currentView === "inventory" && <MobileInventory onBack={() => setCurrentView("dashboard")} />}
      {currentView === "voucher" && <MobileVoucherCreate onBack={() => setCurrentView("dashboard")} />}
      {currentView === "count" && <MobileInventoryCount onBack={() => setCurrentView("dashboard")} />}
    </div>
  );
}

function MobileHeader({ title, onBack, rightAction }: { title: string; onBack?: () => void; rightAction?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-30 bg-blue-600 text-white px-4 py-3 flex items-center gap-3 shadow-lg">
      {onBack && (
        <button onClick={onBack} className="p-1 hover:bg-blue-700 rounded-lg transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <h1 className="text-lg font-bold flex-1">{title}</h1>
      {rightAction}
    </div>
  );
}

function MobileDashboard({ onNavigate }: { onNavigate: (view: MobileView) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: alerts } = useQuery<any[]>({
    queryKey: ["/api/warehouse/reports/alerts"],
  });

  const { data: recentVouchers } = useQuery<any[]>({
    queryKey: ["/api/warehouse/vouchers/raw-material-in"],
  });

  const quickActions = [
    { id: "scanner" as MobileView, icon: ScanBarcode, label: t('warehouse.mobile.scanBarcode'), desc: t('warehouse.mobile.scanBarcodeDesc'), color: "bg-blue-500", hoverColor: "hover:bg-blue-600" },
    { id: "inventory" as MobileView, icon: Package, label: t('warehouse.mobile.quickInventory'), desc: t('warehouse.mobile.quickInventoryDesc'), color: "bg-green-500", hoverColor: "hover:bg-green-600" },
    { id: "voucher" as MobileView, icon: ClipboardList, label: t('warehouse.mobile.createVoucher'), desc: t('warehouse.mobile.createVoucherDesc'), color: "bg-orange-500", hoverColor: "hover:bg-orange-600" },
    { id: "count" as MobileView, icon: Box, label: t('warehouse.mobile.inventoryCount'), desc: t('warehouse.mobile.inventoryCountDesc'), color: "bg-purple-500", hoverColor: "hover:bg-purple-600" },
  ];

  return (
    <div className="pb-20">
      <a
        href="/"
        className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-gray-900 text-white text-xs py-1.5 hover:bg-gray-800 transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span>{t('header.mobile.backToDesktop', 'العودة للنسخة الكاملة')}</span>
      </a>
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <WarehouseIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t('warehouse.mobile.title')}</h1>
            <p className="text-blue-200 text-sm">{t('warehouse.mobile.subtitle')}</p>
          </div>
        </div>
        {user && (
          <p className="text-blue-100 text-sm">{user.full_name || user.username}</p>
        )}
      </div>

      <div className="px-4 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => onNavigate(action.id)}
                className={`${action.color} ${action.hoverColor} text-white rounded-xl p-4 text-start shadow-lg transition-all active:scale-95`}
              >
                <Icon className="h-8 w-8 mb-2 opacity-90" />
                <div className="font-bold text-sm">{action.label}</div>
                <div className="text-xs opacity-80 mt-1">{action.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="font-bold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            {t('warehouse.mobile.stockAlerts')}
          </h2>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert: any, i: number) => (
              <div key={i} className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.item_name_ar || alert.item_name}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {t('warehouse.mobile.lowStock')}: {alert.current_quantity} / {alert.minimum_quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recentVouchers && recentVouchers.length > 0 && (
        <div className="px-4 mt-6">
          <h2 className="font-bold text-sm mb-2 flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-500" />
            {t('warehouse.mobile.recentVouchers')}
          </h2>
          <div className="space-y-2">
            {(recentVouchers as any[]).slice(0, 5).map((v: any) => (
              <div key={v.id} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{v.voucher_number}</span>
                    <Badge variant={v.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                      {v.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{new Date(v.voucher_date).toLocaleDateString()}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MobileScanner({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<any>(null);

  const lookupBarcode = async (barcode: string) => {
    setScanError(null);
    setScanResult(null);
    try {
      const response = await apiRequest(`/api/warehouse/barcode-lookup/${encodeURIComponent(barcode)}`);
      const data = await response.json();
      setScanResult(data);
    } catch {
      setScanError(t('warehouse.mobile.scanner.noResult'));
    }
  };

  const startScanner = useCallback(async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!scannerRef.current) return;

      const scannerId = "mobile-barcode-scanner";
      scannerRef.current.id = scannerId;

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText: string) => {
          html5QrCode.stop().catch(() => {});
          setIsScanning(false);
          lookupBarcode(decodedText);
        },
        () => {}
      );
      setIsScanning(true);
      setScanError(null);
    } catch (err: any) {
      setScanError(t('warehouse.mobile.scanner.cameraError'));
      setIsScanning(false);
    }
  }, [t]);

  const stopScanner = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch {}
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const handleManualSearch = () => {
    if (barcodeInput.trim()) {
      lookupBarcode(barcodeInput.trim());
    }
  };

  const handleScanAgain = () => {
    setScanResult(null);
    setScanError(null);
    setBarcodeInput("");
    if (!manualMode) {
      startScanner();
    }
  };

  return (
    <div className="pb-20">
      <MobileHeader title={t('warehouse.mobile.scanner.title')} onBack={() => { stopScanner(); onBack(); }} />

      <div className="px-4 pt-4 space-y-4">
        <div className="flex gap-2">
          <Button
            variant={!manualMode ? "default" : "outline"}
            size="sm"
            onClick={() => { setManualMode(false); stopScanner(); }}
            className="flex-1"
          >
            <Camera className="h-4 w-4 ml-1" />
            {t('warehouse.mobile.scanner.startCamera')}
          </Button>
          <Button
            variant={manualMode ? "default" : "outline"}
            size="sm"
            onClick={() => { setManualMode(true); stopScanner(); }}
            className="flex-1"
          >
            <Keyboard className="h-4 w-4 ml-1" />
            {t('warehouse.mobile.scanner.manualEntry')}
          </Button>
        </div>

        {!manualMode && !scanResult && !scanError && (
          <div className="space-y-3">
            <div
              ref={scannerRef}
              className="w-full aspect-[4/3] bg-black rounded-xl overflow-hidden relative"
            >
              {!isScanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-3">
                  <Camera className="h-12 w-12 opacity-50" />
                  <Button onClick={startScanner} variant="secondary" size="sm">
                    {t('warehouse.mobile.scanner.startCamera')}
                  </Button>
                </div>
              )}
            </div>
            {isScanning && (
              <div className="flex gap-2">
                <Button onClick={stopScanner} variant="destructive" size="sm" className="flex-1">
                  <CameraOff className="h-4 w-4 ml-1" />
                  {t('warehouse.mobile.scanner.stopCamera')}
                </Button>
              </div>
            )}
          </div>
        )}

        {manualMode && !scanResult && !scanError && (
          <div className="space-y-3">
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-3">
              <Input
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder={t('warehouse.mobile.scanner.enterBarcode')}
                className="text-center text-lg font-mono"
                onKeyDown={(e) => e.key === "Enter" && handleManualSearch()}
                autoFocus
              />
              <Button onClick={handleManualSearch} className="w-full" disabled={!barcodeInput.trim()}>
                <Search className="h-4 w-4 ml-1" />
                {t('warehouse.mobile.scanner.search')}
              </Button>
            </div>
          </div>
        )}

        {scanError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <XCircle className="h-5 w-5" />
              <span className="font-bold text-sm">{scanError}</span>
            </div>
            <Button onClick={handleScanAgain} variant="outline" className="w-full">
              <RotateCcw className="h-4 w-4 ml-1" />
              {t('warehouse.mobile.scanner.scanAgain')}
            </Button>
          </div>
        )}

        {scanResult && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-bold text-sm">{t('warehouse.mobile.scanner.itemFound')}</span>
            </div>

            <div className="space-y-2">
              {scanResult.item_name_ar && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('warehouse.mobile.scanner.itemName')}:</span>
                  <span className="font-medium">{scanResult.item_name_ar || scanResult.item_name}</span>
                </div>
              )}
              {scanResult.item_code && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('warehouse.mobile.scanner.itemCode')}:</span>
                  <span className="font-mono">{scanResult.item_code}</span>
                </div>
              )}
              {scanResult.barcode && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('warehouse.voucherDetails.barcode')}:</span>
                  <span className="font-mono">{scanResult.barcode}</span>
                </div>
              )}
              {scanResult.category && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('warehouse.mobile.scanner.category')}:</span>
                  <span>{scanResult.category}</span>
                </div>
              )}
              {scanResult.current_stock !== undefined && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{t('warehouse.mobile.scanner.currentStock')}:</span>
                  <span className="font-bold text-lg">{parseFloat(scanResult.current_stock).toLocaleString()} {scanResult.unit || ''}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleScanAgain} variant="outline" className="flex-1">
                <RotateCcw className="h-4 w-4 ml-1" />
                {t('warehouse.mobile.scanner.scanAgain')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileInventory({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState("all");

  const { data: items, isLoading } = useQuery<any[]>({
    queryKey: ["/api/items"],
  });

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const stockMap = new Map<number, number>();
  if (inventory) {
    (inventory as any[]).forEach((inv: any) => {
      stockMap.set(inv.item_id, parseFloat(inv.quantity || 0));
    });
  }

  const filteredItems = (items || []).filter((item: any) => {
    const matchesSearch = !searchQuery ||
      (item.name_ar || "").includes(searchQuery) ||
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.code || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = category === "all" || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-20">
      <MobileHeader title={t('warehouse.mobile.inventory.title')} onBack={onBack} />

      <div className="px-4 pt-4 space-y-3">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('warehouse.mobile.inventory.searchItems')}
          className="bg-white dark:bg-gray-900"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { val: "all", label: t('warehouse.mobile.inventory.allCategories') },
            { val: "raw_material", label: t('warehouse.mobile.inventory.rawMaterials') },
            { val: "finished_good", label: t('warehouse.mobile.inventory.finishedGoods') },
          ].map((cat) => (
            <Button
              key={cat.val}
              variant={category === cat.val ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat.val)}
              className="whitespace-nowrap"
            >
              {cat.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t('warehouse.mobile.inventory.noItems')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item: any) => {
              const stock = stockMap.get(item.id) || 0;
              const isLow = item.minimum_quantity && stock < parseFloat(item.minimum_quantity);
              const isOut = stock <= 0;

              return (
                <div key={item.id} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.name_ar || item.name}</p>
                      {item.code && <p className="text-xs text-gray-500 font-mono">{item.code}</p>}
                    </div>
                    <Badge variant={isOut ? "destructive" : isLow ? "secondary" : "default"} className="shrink-0 text-xs">
                      {isOut ? t('warehouse.mobile.inventory.outOfStock') : isLow ? t('warehouse.mobile.inventory.belowMinimum') : t('warehouse.mobile.inventory.inStock')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">{stock.toLocaleString()}</span>
                    <span className="text-xs text-gray-500">{item.unit || t('warehouse.units.kilo')}</span>
                  </div>
                  {(item.minimum_quantity || item.maximum_quantity) && (
                    <div className="flex gap-4 text-xs text-gray-500">
                      {item.minimum_quantity && <span>{t('warehouse.mobile.inventory.minLevel')}: {item.minimum_quantity}</span>}
                      {item.maximum_quantity && <span>{t('warehouse.mobile.inventory.maxLevel')}: {item.maximum_quantity}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function MobileVoucherCreate({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [voucherType, setVoucherType] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("كيلو");
  const [supplierId, setSupplierId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  const { data: items } = useQuery<any[]>({ queryKey: ["/api/items"] });
  const { data: suppliers } = useQuery<any[]>({ queryKey: ["/api/suppliers"] });
  const { data: locations } = useQuery<any[]>({ queryKey: ["/api/locations"] });

  const typeToEndpoint: Record<string, string> = {
    "raw-material-in": "/api/warehouse/vouchers/raw-material-in",
    "raw-material-out": "/api/warehouse/vouchers/raw-material-out",
    "finished-goods-in": "/api/warehouse/vouchers/finished-goods-in",
    "finished-goods-out": "/api/warehouse/vouchers/finished-goods-out",
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = typeToEndpoint[voucherType!];
      const res = await apiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('warehouse.mobile.voucher.success') });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/vouchers"] });
      setSelectedItemId("");
      setQuantity("");
      setNotes("");
      setSupplierId("");
      setLocationId("");
      setBarcodeInput("");
    },
    onError: (err: any) => {
      toast({ title: t('warehouse.toast.error'), description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = async () => {
    if (!voucherType || !quantity) return;

    try {
      const nextNumRes = await apiRequest(`/api/warehouse/vouchers/next-number/${voucherType}`);
      const { next_number } = await nextNumRes.json();

      const data: any = {
        voucher_number: next_number,
        voucher_type: voucherType.includes("raw") ? (voucherType === "raw-material-in" ? "purchase" : "production_issue") : (voucherType === "finished-goods-in" ? "production_receipt" : "customer_delivery"),
        voucher_date: new Date().toISOString().split("T")[0],
        item_id: selectedItemId || undefined,
        quantity,
        unit,
        notes,
        supplier_id: supplierId || undefined,
        location_id: locationId || undefined,
        status: "completed",
        created_by: user?.id,
      };

      createMutation.mutate(data);
    } catch (err: any) {
      toast({ title: t('warehouse.toast.error'), description: err.message, variant: "destructive" });
    }
  };

  const handleBarcodeLookup = async () => {
    if (!barcodeInput.trim()) return;
    try {
      const res = await apiRequest(`/api/warehouse/barcode-lookup/${encodeURIComponent(barcodeInput)}`);
      const data = await res.json();
      if (data.id) {
        setSelectedItemId(String(data.id));
        toast({ title: t('warehouse.mobile.scanner.itemFound'), description: data.name_ar || data.name });
      }
    } catch {
      toast({ title: t('warehouse.mobile.scanner.noResult'), variant: "destructive" });
    }
    setBarcodeInput("");
  };

  const voucherTypes = [
    { id: "raw-material-in", icon: ArrowDownToLine, label: t('warehouse.mobile.voucher.rawMaterialIn'), color: "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" },
    { id: "raw-material-out", icon: ArrowUpFromLine, label: t('warehouse.mobile.voucher.rawMaterialOut'), color: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" },
    { id: "finished-goods-in", icon: Package, label: t('warehouse.mobile.voucher.finishedGoodsIn'), color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" },
    { id: "finished-goods-out", icon: Truck, label: t('warehouse.mobile.voucher.finishedGoodsOut'), color: "text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800" },
  ];

  return (
    <div className="pb-20">
      <MobileHeader title={t('warehouse.mobile.voucher.title')} onBack={onBack} />

      <div className="px-4 pt-4 space-y-4">
        {!voucherType ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 font-medium">{t('warehouse.mobile.voucher.selectType')}</p>
            {voucherTypes.map((vt) => {
              const Icon = vt.icon;
              return (
                <button
                  key={vt.id}
                  onClick={() => setVoucherType(vt.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.98] ${vt.color}`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-bold text-sm">{vt.label}</span>
                  <ChevronRight className="h-4 w-4 mr-auto opacity-50" />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-4">
            <button onClick={() => setVoucherType(null)} className="text-sm text-blue-600 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              {t('warehouse.mobile.voucher.selectType')}
            </button>

            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder={t('warehouse.mobile.voucher.scanToAdd')}
                  className="flex-1 font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleBarcodeLookup()}
                />
                <Button onClick={handleBarcodeLookup} size="icon" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('warehouse.mobile.voucher.selectItem')}</label>
                <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('warehouse.mobile.voucher.selectItem')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(items || []).map((item: any) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name_ar || item.name} {item.code ? `(${item.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('warehouse.mobile.voucher.enterQuantity')}</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder={t('warehouse.mobile.voucher.enterQuantity')}
                    className="flex-1"
                  />
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="كيلو">{t('warehouse.units.kilo')}</SelectItem>
                      <SelectItem value="قطعة">{t('warehouse.units.piece')}</SelectItem>
                      <SelectItem value="بندل">{t('warehouse.units.bundle')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {voucherType === "raw-material-in" && suppliers && (
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">{t('warehouse.mobile.voucher.selectSupplier')}</label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('warehouse.mobile.voucher.selectSupplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(suppliers as any[]).map((s: any) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name_ar || s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('warehouse.mobile.voucher.selectLocation')}</label>
                <Select value={locationId} onValueChange={setLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('warehouse.mobile.voucher.selectLocation')} />
                  </SelectTrigger>
                  <SelectContent>
                    {(locations || []).map((loc: any) => (
                      <SelectItem key={loc.id} value={String(loc.id)}>
                        {loc.name_ar || loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">{t('warehouse.voucherDetails.notes')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[60px] p-2 border rounded-lg text-sm dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!quantity || createMutation.isPending}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {createMutation.isPending ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full ml-2" />
                ) : (
                  <Plus className="h-4 w-4 ml-1" />
                )}
                {t('warehouse.mobile.voucher.submit')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileInventoryCount({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [countId, setCountId] = useState<number | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scannedItems, setScannedItems] = useState<any[]>([]);
  const [currentItem, setCurrentItem] = useState<any>(null);
  const [actualQty, setActualQty] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const createCountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("/api/warehouse/inventory-counts", {
        method: "POST",
        body: JSON.stringify({
          count_date: new Date().toISOString().split("T")[0],
          created_by: user?.id,
          status: "in_progress",
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCountId(data.id);
      toast({ title: t('warehouse.mobile.count.inProgress') });
    },
    onError: (err: any) => {
      toast({ title: t('warehouse.toast.error'), description: err.message, variant: "destructive" });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/warehouse/inventory-counts/${countId}/items`, {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      setScannedItems(prev => [...prev, { ...currentItem, actual_qty: actualQty }]);
      setCurrentItem(null);
      setActualQty("");
      setBarcodeInput("");
      inputRef.current?.focus();
    },
    onError: (err: any) => {
      toast({ title: t('warehouse.toast.error'), description: err.message, variant: "destructive" });
    },
  });

  const completeCountMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/warehouse/inventory-counts/${countId}/complete`, {
        method: "POST",
        body: "{}",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('warehouse.toast.savedSuccess') });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/inventory-counts"] });
      setCountId(null);
      setScannedItems([]);
    },
    onError: (err: any) => {
      toast({ title: t('warehouse.toast.error'), description: err.message, variant: "destructive" });
    },
  });

  const handleBarcodeScan = async () => {
    if (!barcodeInput.trim()) return;
    try {
      const res = await apiRequest(`/api/warehouse/barcode-lookup/${encodeURIComponent(barcodeInput.trim())}`);
      const data = await res.json();
      setCurrentItem(data);
    } catch {
      toast({ title: t('warehouse.mobile.scanner.noResult'), variant: "destructive" });
      setBarcodeInput("");
    }
  };

  const handleAddItem = () => {
    if (!currentItem || !actualQty || !countId) return;
    addItemMutation.mutate({
      item_id: currentItem.id,
      actual_quantity: parseFloat(actualQty),
      system_quantity: currentItem.current_stock || 0,
    });
  };

  return (
    <div className="pb-20">
      <MobileHeader
        title={t('warehouse.mobile.count.title')}
        onBack={onBack}
        rightAction={countId ? (
          <Badge variant="secondary" className="bg-white/20 text-white">
            {t('warehouse.mobile.count.itemsScanned')}: {scannedItems.length}
          </Badge>
        ) : undefined}
      />

      <div className="px-4 pt-4 space-y-4">
        {!countId ? (
          <div className="text-center py-12 space-y-4">
            <Box className="h-16 w-16 mx-auto text-purple-400 opacity-50" />
            <p className="text-gray-500 text-sm">{t('warehouse.mobile.count.title')}</p>
            <Button
              onClick={() => createCountMutation.mutate()}
              disabled={createCountMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="h-4 w-4 ml-1" />
              {t('warehouse.mobile.count.startNew')}
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder={t('warehouse.mobile.count.scanItem')}
                  className="flex-1 font-mono"
                  onKeyDown={(e) => e.key === "Enter" && handleBarcodeScan()}
                  autoFocus
                />
                <Button onClick={handleBarcodeScan} size="icon" variant="outline">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {currentItem && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-3">
                  <div>
                    <p className="font-bold text-sm">{currentItem.name_ar || currentItem.name}</p>
                    {currentItem.code && <p className="text-xs text-gray-500 font-mono">{currentItem.code}</p>}
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span>{t('warehouse.mobile.count.systemQuantity')}: <strong>{currentItem.current_stock || 0}</strong></span>
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">{t('warehouse.mobile.count.actualQuantity')}</label>
                    <Input
                      type="number"
                      step="0.001"
                      value={actualQty}
                      onChange={(e) => setActualQty(e.target.value)}
                      placeholder={t('warehouse.mobile.count.actualQuantity')}
                      autoFocus
                    />
                  </div>
                  <Button onClick={handleAddItem} disabled={!actualQty || addItemMutation.isPending} className="w-full">
                    <Plus className="h-4 w-4 ml-1" />
                    {addItemMutation.isPending ? "..." : t('warehouse.mobile.count.scanItem')}
                  </Button>
                </div>
              )}
            </div>

            {scannedItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-bold text-sm">{t('warehouse.mobile.count.itemsScanned')} ({scannedItems.length})</h3>
                {scannedItems.map((item, i) => {
                  const diff = parseFloat(item.actual_qty) - (item.current_stock || 0);
                  return (
                    <div key={i} className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-lg p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name_ar || item.name}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                          <span>{t('warehouse.mobile.count.systemQuantity')}: {item.current_stock || 0}</span>
                          <span>{t('warehouse.mobile.count.actualQuantity')}: {item.actual_qty}</span>
                        </div>
                      </div>
                      <Badge variant={diff === 0 ? "default" : "destructive"} className="text-xs">
                        {diff > 0 ? `+${diff}` : diff}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            <Button
              onClick={() => completeCountMutation.mutate()}
              disabled={scannedItems.length === 0 || completeCountMutation.isPending}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 ml-1" />
              {t('warehouse.mobile.count.completeCount')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
