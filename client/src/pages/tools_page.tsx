import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { 
  Scale, Palette, Droplets, Calculator, FileSpreadsheet, 
  Ruler, Clock, Printer, ChevronLeft, ChevronRight,
  Package, PaintBucket, Barcode
} from "lucide-react";
import JsBarcode from "jsbarcode";

type TabId =
  | "bag-weight"
  | "colors"
  | "color-mix"
  | "ink-usage"
  | "order-cost"
  | "order-cost-advanced"
  | "roll"
  | "thickness"
  | "job-time"
  | "barcode";

interface TabDef { 
  id: TabId; 
  labelKey: string; 
  descriptionKey: string;
  icon: typeof Scale;
}

const tabDefs: TabDef[] = [
  { id: "bag-weight", labelKey: "tools.tabs.bagWeight", descriptionKey: "tools.tabs.bagWeightDesc", icon: Scale },
  { id: "colors", labelKey: "tools.tabs.colors", descriptionKey: "tools.tabs.colorsDesc", icon: Palette },
  { id: "color-mix", labelKey: "tools.tabs.colorMix", descriptionKey: "tools.tabs.colorMixDesc", icon: PaintBucket },
  { id: "ink-usage", labelKey: "tools.tabs.inkUsage", descriptionKey: "tools.tabs.inkUsageDesc", icon: Droplets },
  { id: "order-cost", labelKey: "tools.tabs.orderCost", descriptionKey: "tools.tabs.orderCostDesc", icon: Calculator },
  { id: "order-cost-advanced", labelKey: "tools.tabs.orderCostAdvanced", descriptionKey: "tools.tabs.orderCostAdvancedDesc", icon: FileSpreadsheet },
  { id: "roll", labelKey: "tools.tabs.roll", descriptionKey: "tools.tabs.rollDesc", icon: Package },
  { id: "thickness", labelKey: "tools.tabs.thickness", descriptionKey: "tools.tabs.thicknessDesc", icon: Ruler },
  { id: "job-time", labelKey: "tools.tabs.jobTime", descriptionKey: "tools.tabs.jobTimeDesc", icon: Clock },
  { id: "barcode", labelKey: "tools.tabs.barcode", descriptionKey: "tools.tabs.barcodeDesc", icon: Barcode },
];

export default function ToolsPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <PageLayout title={t("tools.title")} description={t("tools.description")}>
      <ToolsContent />
    </PageLayout>
  );
}

function ToolsContent(): JSX.Element {
  const { t } = useTranslation();
  const STORAGE_KEY = "mpbf_tools_active_tab";
  const [active, setActive] = useState<TabId>(() => {
    const saved = (typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)) as TabId | null;
    return saved ?? "bag-weight";
  });
  const [sharedBagWeightG, setSharedBagWeightG] = useState<number>(0);
  const [sharedBagDims, setSharedBagDims] = useState<{ widthCm: number; lengthCm: number } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const bagWeightPrintRef = useRef<(() => void) | null>(null);

  useEffect(() => { 
    try { window.localStorage.setItem(STORAGE_KEY, active); } catch {} 
  }, [active]);

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = 200;
      tabsRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const activeTab = tabDefs.find(tab => tab.id === active);
  const ActiveIcon = activeTab?.icon || Scale;

  return (
    <div className="space-y-4 pb-24 md:pb-6">
      {/* Mobile: Horizontal Scrollable Tabs */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-slate-900/80 shadow-md rounded-full h-8 w-8 md:hidden"
          onClick={() => scrollTabs('right')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 dark:bg-slate-900/80 shadow-md rounded-full h-8 w-8 md:hidden"
          onClick={() => scrollTabs('left')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div 
          ref={tabsRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide px-8 md:px-0 pb-2 md:flex-wrap md:overflow-visible"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabDefs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                  whitespace-nowrap transition-all duration-200 flex-shrink-0
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                    : 'bg-white dark:bg-slate-800 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                  }
                `}
              >
                <Icon className="h-4 w-4" />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tool Header */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20 border-primary/20">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary text-primary-foreground">
            <ActiveIcon className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{activeTab ? t(activeTab.labelKey) : ""}</h2>
            <p className="text-sm text-muted-foreground">{activeTab ? t(activeTab.descriptionKey) : ""}</p>
          </div>
          <Button variant="outline" size="sm" className="mr-auto" onClick={() => {
            if (active === "bag-weight" && bagWeightPrintRef.current) {
              bagWeightPrintRef.current();
            } else {
              window.print();
            }
          }}>
            <Printer className="h-4 w-4 ml-2" />
            {t("common.print")}
          </Button>
        </CardContent>
      </Card>

      {/* Tool Content */}
      <Card>
        <CardContent className="p-4 md:p-6">
          {active === "bag-weight" && (
            <BagWeightCalculator
              onBagWeight={(g) => setSharedBagWeightG(g)}
              onDims={(d) => setSharedBagDims(d)}
              onPrintRef={(fn) => { bagWeightPrintRef.current = fn; }}
            />
          )}
          {active === "colors" && <ColorTools />}
          {active === "color-mix" && <ColorMixTools />}
          {active === "ink-usage" && <InkUsageCalculator sharedDims={sharedBagDims} />}
          {active === "order-cost" && <OrderCostCalculator sharedBagWeightG={sharedBagWeightG} />}
          {active === "order-cost-advanced" && <OrderCostAdvanced sharedBagWeightG={sharedBagWeightG} />}
          {active === "roll" && <RollTools />}
          {active === "thickness" && <ThicknessConverter />}
          {active === "job-time" && <JobTimePlanner />}
          {active === "barcode" && <BarcodeGenerator />}
        </CardContent>
      </Card>
    </div>
  );
}

// ===================== Shared Components =====================

interface InputFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  hint?: string;
}

function InputField({ label, value, onChange, step = 0.1, suffix, hint }: InputFieldProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={Number.isFinite(value) ? value : 0}
          step={step}
          onChange={(e) => onChange(toNumber(e.target.value))}
          className="pl-3 pr-12"
        />
        {suffix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function TextField({ label, value, onChange, placeholder }: TextFieldProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}

function SelectField({ label, value, onChange, options, hint }: SelectFieldProps): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

interface ResultCardProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function ResultCard({ label, value, highlight }: ResultCardProps): JSX.Element {
  return (
    <div className={`p-3 rounded-lg ${highlight ? 'bg-primary/10 border-2 border-primary' : 'bg-slate-50 dark:bg-slate-800'}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}

// ===================== 1) حاسبة وزن الأكياس =====================

type BagType = "flat" | "side-gusset" | "table-cover";

interface BagWeightRecord {
  id: string;
  createdAt: string;
  bagType: BagType;
  widthCm: number;
  lengthCm: number;
  sideGussetCm: number;
  thicknessMicron: number;
  layers: number;
  density: number;
  gramsPerBag: number;
  bagsPerKg: number;
  areaM2: number;
}

const BAG_HISTORY_KEY = "mpbf_bag_weight_history";

function useBagWeightHistory() {
  const [history, setHistory] = useState<BagWeightRecord[]>(() => {
    try {
      const saved = localStorage.getItem(BAG_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const addRecord = (record: Omit<BagWeightRecord, "id" | "createdAt">) => {
    const newRecord: BagWeightRecord = {
      ...record,
      id: Date.now().toString(),
      createdAt: new Date().toLocaleString("ar-SA"),
    };
    const updated = [newRecord, ...history].slice(0, 10);
    setHistory(updated);
    try { localStorage.setItem(BAG_HISTORY_KEY, JSON.stringify(updated)); } catch {}
  };

  const clearHistory = () => {
    setHistory([]);
    try { localStorage.removeItem(BAG_HISTORY_KEY); } catch {}
  };

  const deleteRecord = (id: string) => {
    const updated = history.filter(r => r.id !== id);
    setHistory(updated);
    try { localStorage.setItem(BAG_HISTORY_KEY, JSON.stringify(updated)); } catch {}
  };

  return { history, addRecord, clearHistory, deleteRecord };
}

function FlatBagSvg({ className, label }: { className?: string; label: string }): JSX.Element {
  return (
    <svg viewBox="0 0 120 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="100" height="140" rx="4" className="fill-blue-100 dark:fill-blue-900/30 stroke-blue-500" strokeWidth="2" />
      <line x1="10" y1="30" x2="110" y2="30" className="stroke-blue-400" strokeWidth="1" strokeDasharray="4 2" />
      <text x="60" y="90" textAnchor="middle" className="fill-blue-600 dark:fill-blue-400 text-[10px] font-medium">{label}</text>
      <path d="M25 50 L35 60 L25 70" className="stroke-blue-400" strokeWidth="1.5" fill="none" />
      <path d="M95 50 L85 60 L95 70" className="stroke-blue-400" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function SideGussetBagSvg({ className, label }: { className?: string; label: string }): JSX.Element {
  return (
    <svg viewBox="0 0 120 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10 L25 25 L25 135 L10 150 L10 10 Z" className="fill-green-200 dark:fill-green-900/40 stroke-green-500" strokeWidth="2" />
      <rect x="25" y="10" width="70" height="140" className="fill-green-100 dark:fill-green-900/30 stroke-green-500" strokeWidth="2" />
      <path d="M95 10 L110 25 L110 135 L95 150 L95 10 Z" className="fill-green-200 dark:fill-green-900/40 stroke-green-500" strokeWidth="2" />
      <line x1="25" y1="30" x2="95" y2="30" className="stroke-green-400" strokeWidth="1" strokeDasharray="4 2" />
      <text x="60" y="90" textAnchor="middle" className="fill-green-600 dark:fill-green-400 text-[10px] font-medium">{label}</text>
      <path d="M15 60 L22 70 L15 80" className="stroke-green-500" strokeWidth="1.5" fill="none" />
      <path d="M105 60 L98 70 L105 80" className="stroke-green-500" strokeWidth="1.5" fill="none" />
    </svg>
  );
}

function TableCoverSvg({ className, label }: { className?: string; label: string }): JSX.Element {
  return (
    <svg viewBox="0 0 160 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="80" cy="50" rx="70" ry="40" className="fill-purple-100 dark:fill-purple-900/30 stroke-purple-500" strokeWidth="2" />
      <ellipse cx="80" cy="50" rx="50" ry="28" className="stroke-purple-300 dark:stroke-purple-600" strokeWidth="1" strokeDasharray="4 2" fill="none" />
      <text x="80" y="55" textAnchor="middle" className="fill-purple-600 dark:fill-purple-400 text-[10px] font-medium">{label}</text>
    </svg>
  );
}

function BagTypeSvg({ type, className, label }: { type: BagType; className?: string; label: string }): JSX.Element {
  switch (type) {
    case "flat": return <FlatBagSvg className={className} label={label} />;
    case "side-gusset": return <SideGussetBagSvg className={className} label={label} />;
    case "table-cover": return <TableCoverSvg className={className} label={label} />;
  }
}

interface BagWeightCalculatorProps {
  onBagWeight?: (gramsPerBag: number) => void;
  onPrintRef?: (fn: () => void) => void;
  onDims?: (d: { widthCm: number; lengthCm: number }) => void;
}

function BagWeightCalculator({ onBagWeight, onDims, onPrintRef }: BagWeightCalculatorProps): JSX.Element {
  const { t } = useTranslation();
  const [bagType, setBagType] = useState<BagType>("flat");
  const [widthCm, setWidthCm] = useState<number>(30);
  const [lengthCm, setLengthCm] = useState<number>(40);
  const [thicknessMicron, setThicknessMicron] = useState<number>(18);
  const [layers, setLayers] = useState<number>(2);
  const [density, setDensity] = useState<number>(0.95);
  const [sideGussetCm, setSideGussetCm] = useState<number>(0);
  const { history, addRecord, clearHistory, deleteRecord } = useBagWeightHistory();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { onDims?.({ widthCm, lengthCm }); }, [widthCm, lengthCm, onDims]);

  const result = useMemo(() => {
    const t_cm = toNumber(thicknessMicron) * 1e-4;
    let effWidth = toNumber(widthCm);
    if (bagType === "side-gusset") effWidth = toNumber(widthCm) + 2 * toNumber(sideGussetCm);
    const gramsPerBag = Math.max(0, effWidth * toNumber(lengthCm) * toNumber(layers) * t_cm * toNumber(density));
    const bagsPerKg = gramsPerBag > 0 ? 1000 / gramsPerBag : 0;
    const areaM2 = (effWidth / 100) * (toNumber(lengthCm) / 100);
    return { gramsPerBag, bagsPerKg, areaM2 } as const;
  }, [bagType, widthCm, lengthCm, thicknessMicron, layers, density, sideGussetCm]);

  useEffect(() => { onBagWeight?.(result.gramsPerBag || 0); }, [result.gramsPerBag, onBagWeight]);

  const handleSaveRecord = () => {
    addRecord({
      bagType, widthCm, lengthCm, sideGussetCm, thicknessMicron, layers, density,
      gramsPerBag: result.gramsPerBag, bagsPerKg: result.bagsPerKg, areaM2: result.areaM2,
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === history.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(history.map(r => r.id)));
  };

  const selectedRecords = history.filter(r => selectedIds.has(r.id));
  const getBagTypeLabel = (type: BagType) => {
    switch (type) {
      case "flat": return t("tools.bagWeight.flat");
      case "side-gusset": return t("tools.bagWeight.sideGusset");
      case "table-cover": return t("tools.bagWeight.tableCover");
    }
  };

  const directPrint = (records: BagWeightRecord[]) => {
    if (records.length === 0) return;
    const isAr = document.documentElement.dir === "rtl";
    const dir = isAr ? "rtl" : "ltr";
    const rows = records.map(r => `
      <tr>
        <td>${getBagTypeLabel(r.bagType)}</td>
        <td>${r.widthCm} × ${r.lengthCm}</td>
        <td>${r.thicknessMicron} μm</td>
        <td>${r.layers}</td>
        <td>${r.density}</td>
        ${r.bagType === "side-gusset" ? `<td>${r.sideGussetCm}</td>` : `<td>-</td>`}
        <td style="font-weight:bold;color:#1a365d">${fmtFixed(r.gramsPerBag, 3)}</td>
        <td>${fmtFixed(r.bagsPerKg, 1)}</td>
        <td>${fmtFixed(r.areaM2, 4)}</td>
        <td style="font-size:11px;color:#888">${r.createdAt || ""}</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html dir="${dir}" lang="${isAr ? "ar" : "en"}">
<head>
<meta charset="UTF-8">
<title>${t("tools.bagWeight.printTitle")}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Tahoma,sans-serif;padding:20mm 15mm;background:#fff;color:#333;direction:${dir}}
  h1{text-align:center;font-size:22px;color:#1a365d;margin-bottom:6px}
  .subtitle{text-align:center;font-size:13px;color:#666;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#1a365d;color:#fff;padding:8px 6px;border:1px solid #ccc;white-space:nowrap}
  td{padding:7px 6px;border:1px solid #ddd;text-align:center}
  tbody tr:nth-child(even){background:#f5f7fa}
  .footer{margin-top:20px;text-align:center;font-size:10px;color:#aaa}
  @media print{@page{size:A4 landscape;margin:10mm}}
</style>
</head>
<body>
  <h1>${t("tools.bagWeight.printTitle")}</h1>
  <p class="subtitle">${new Date().toLocaleDateString(isAr ? "ar-SA" : "en-US", { year:"numeric", month:"long", day:"numeric" })} — ${records.length > 1 ? records.length + " " + (isAr ? "سجل" : "records") : ""}</p>
  <table>
    <thead>
      <tr>
        <th>${t("tools.bagWeight.type")}</th>
        <th>${t("tools.bagWeight.dimensions")}</th>
        <th>${t("tools.bagWeight.thickness")}</th>
        <th>${t("tools.bagWeight.layers")}</th>
        <th>${t("tools.bagWeight.density")}</th>
        <th>${isAr ? "الحاشية" : "Gusset"}</th>
        <th>${t("tools.bagWeight.weightPerBag")}</th>
        <th>${t("tools.bagWeight.bagsPerKg")}</th>
        <th>${t("tools.bagWeight.area")}</th>
        <th>${isAr ? "التاريخ" : "Date"}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">${isAr ? "مصنع الأكياس البلاستيكية — نظام إدارة الإنتاج" : "Plastic Bag Factory — Production Management System"}</div>
</body>
</html>`;
    const w = window.open("", "_blank", "width=900,height=600");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const handlePrintSelected = () => {
    if (selectedIds.size === 0) return;
    directPrint(selectedRecords);
  };

  const handlePrintCurrent = () => {
    const currentRecord: BagWeightRecord = {
      id: "current",
      createdAt: new Date().toLocaleString(document.documentElement.dir === "rtl" ? "ar-SA" : "en-US"),
      bagType, widthCm, lengthCm, sideGussetCm, thicknessMicron, layers, density,
      gramsPerBag: result.gramsPerBag, bagsPerKg: result.bagsPerKg, areaM2: result.areaM2,
    };
    directPrint([currentRecord]);
  };

  useEffect(() => { onPrintRef?.(handlePrintCurrent); });

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-4">
              <SelectField
                label={t("tools.bagWeight.type")}
                value={bagType}
                onChange={(v) => setBagType(v as BagType)}
                options={[
                  { value: "flat", label: t("tools.bagWeight.flatFull") },
                  { value: "side-gusset", label: t("tools.bagWeight.sideGusset") },
                  { value: "table-cover", label: t("tools.bagWeight.tableCover") },
                ]}
              />
              <div className="grid grid-cols-2 gap-3">
                <InputField label={t("tools.bagWeight.width")} value={widthCm} onChange={setWidthCm} suffix={t("tools.common.cm")} />
                <InputField label={t("tools.bagWeight.length")} value={lengthCm} onChange={setLengthCm} suffix={t("tools.common.cm")} />
              </div>
              <InputField label={t("tools.bagWeight.thickness")} value={thicknessMicron} onChange={setThicknessMicron} suffix="μm" />
              <div className="grid grid-cols-2 gap-3">
                <InputField label={t("tools.bagWeight.layers")} value={layers} onChange={setLayers} step={1} />
                <InputField label={t("tools.bagWeight.density")} value={density} onChange={setDensity} step={0.01} suffix="g/cm³" />
              </div>
              {bagType === "side-gusset" && (
                <InputField label={t("tools.bagWeight.gusset")} value={sideGussetCm} onChange={setSideGussetCm} suffix={t("tools.common.cm")} hint={t("tools.bagWeight.perSide")} />
              )}
            </div>
            <div className="hidden md:block w-32 flex-shrink-0">
              <BagTypeSvg type={bagType} className="w-full h-auto transition-all duration-300" label={getBagTypeLabel(bagType) || ""} />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="md:hidden flex justify-center mb-4">
            <BagTypeSvg type={bagType} className="w-24 h-auto" label={getBagTypeLabel(bagType) || ""} />
          </div>
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {t("tools.bagWeight.results")}
          </h3>
          <div className="grid gap-3">
            <ResultCard label={t("tools.bagWeight.weightPerBag")} value={`${fmtFixed(result.gramsPerBag, 3)} ${t("tools.common.gram")}`} highlight />
            <ResultCard label={t("tools.bagWeight.bagsPerKg")} value={`${fmtFixed(result.bagsPerKg, 1)} ${t("tools.common.bag")}`} />
            <ResultCard label={t("tools.bagWeight.area")} value={`${fmtFixed(result.areaM2, 4)} ${t("tools.common.sqm")}`} />
          </div>
          <Button onClick={handleSaveRecord} className="w-full">
            <Scale className="h-4 w-4 ml-2" />
            {t("tools.bagWeight.saveRecord")}
          </Button>
        </div>
      </div>

      {history.length > 0 && (
        <Card className="print:hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{t("tools.bagWeight.history")} ({history.length})</CardTitle>
              <div className="flex gap-2">
                {selectedIds.size > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrintSelected}>
                    <Printer className="h-4 w-4 ml-1" />
                    {t("tools.bagWeight.printSelected")} ({selectedIds.size})
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={clearHistory} className="text-destructive">
                  {t("tools.bagWeight.clearHistory")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer pb-2 border-b">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={selectedIds.size === history.length && history.length > 0}
                  onChange={toggleSelectAll}
                />
                <span className="font-medium">{t("tools.bagWeight.selectAll")}</span>
              </label>
              {history.map((record) => (
                <div
                  key={record.id}
                  className={`p-3 rounded-lg border transition-colors ${selectedIds.has(record.id) ? 'bg-primary/5 border-primary' : 'bg-slate-50 dark:bg-slate-800 border-transparent'}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="rounded mt-1"
                      checked={selectedIds.has(record.id)}
                      onChange={() => toggleSelect(record.id)}
                    />
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("tools.bagWeight.type")}:</span>
                        <span className="mr-1 font-medium">{getBagTypeLabel(record.bagType)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("tools.bagWeight.dimensions")}:</span>
                        <span className="mr-1">{record.widthCm}×{record.lengthCm} {t("tools.common.cm")}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("tools.bagWeight.weight")}:</span>
                        <span className="mr-1 font-bold text-primary">{fmtFixed(record.gramsPerBag, 3)} {t("tools.common.gram")}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("tools.bagWeight.bagsPerKg")}:</span>
                        <span className="mr-1">{fmtFixed(record.bagsPerKg, 1)}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteRecord(record.id)}>×</Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mr-6">{record.createdAt}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

// ===================== 2) أدوات الألوان =====================

function ColorTools(): JSX.Element {
  const { t } = useTranslation();
  const [c, setC] = useState<number>(0);
  const [m, setM] = useState<number>(0);
  const [y, setY] = useState<number>(0);
  const [k, setK] = useState<number>(0);
  const rgb = useMemo(() => cmykToRgb(c, m, y, k), [c, m, y, k]);
  const hex = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b), [rgb]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          {t("tools.colors.cmykToRgb")}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Cyan %" value={c} onChange={setC} step={1} suffix="%" />
          <InputField label="Magenta %" value={m} onChange={setM} step={1} suffix="%" />
          <InputField label="Yellow %" value={y} onChange={setY} step={1} suffix="%" />
          <InputField label="Key %" value={k} onChange={setK} step={1} suffix="%" />
        </div>
        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="w-20 h-20 rounded-xl border-2 shadow-inner" style={{ backgroundColor: hex }} />
          <div className="space-y-1">
            <p className="text-sm"><span className="text-muted-foreground">RGB:</span> {rgb.r}, {rgb.g}, {rgb.b}</p>
            <p className="text-sm"><span className="text-muted-foreground">HEX:</span> <Badge variant="outline">{hex}</Badge></p>
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          {t("tools.colors.rgbToCmyk")}
        </h3>
        <RgbToCmykWidget />
      </div>
    </div>
  );
}

function RgbToCmykWidget(): JSX.Element {
  const [r, setR] = useState<number>(255);
  const [g, setG] = useState<number>(255);
  const [b, setB] = useState<number>(255);
  const cmyk = useMemo(() => rgbToCmyk(r, g, b), [r, g, b]);
  const hex = useMemo(() => rgbToHex(r, g, b), [r, g, b]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <InputField label="R" value={r} onChange={setR} step={1} />
        <InputField label="G" value={g} onChange={setG} step={1} />
        <InputField label="B" value={b} onChange={setB} step={1} />
      </div>
      <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <div className="w-20 h-20 rounded-xl border-2 shadow-inner" style={{ backgroundColor: hex }} />
        <div className="space-y-1">
          <p className="text-sm"><span className="text-muted-foreground">HEX:</span> <Badge variant="outline">{hex}</Badge></p>
          <p className="text-sm"><span className="text-muted-foreground">CMYK:</span> {cmyk.c}% / {cmyk.m}% / {cmyk.y}% / {cmyk.k}%</p>
        </div>
      </div>
    </div>
  );
}

// ===================== 3) خلطات اللون =====================

function ColorMixTools(): JSX.Element {
  const { t } = useTranslation();
  const [hex, setHex] = useState<string>("#008DCB");
  const [cmyk, setCmyk] = useState<CMYK>(() => rgbToCmyk(0, 141, 203));
  const [totalInkPct, setTotalInkPct] = useState<number>(100);
  const [palette, setPalette] = useState<string[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function onHexChange(v: string) {
    const clean = normalizeHex(v);
    setHex(clean);
    const { r, g, b } = hexToRgb(clean);
    setCmyk(rgbToCmyk(r, g, b));
  }

  function handleImageUpload(file: File) {
    const img = new Image();
    img.onload = () => {
      const cvs = canvasRef.current ?? document.createElement("canvas");
      const ctx = cvs.getContext("2d");
      if (!ctx) return;
      const W = 240, H = Math.max(120, Math.floor((img.height / img.width) * 240));
      cvs.width = W; cvs.height = H;
      ctx.drawImage(img, 0, 0, W, H);
      const data = ctx.getImageData(0, 0, W, H).data;
      const buckets: Record<string, number> = {};
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const R = r >> 5, G = g >> 5, B = b >> 5;
        const key = `${R}-${G}-${B}`;
        buckets[key] = (buckets[key] || 0) + 1;
      }
      const entries = Object.entries(buckets).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const pal = entries.map(([k]) => {
        const [R, G, B] = k.split("-").map((n) => Number(n));
        return rgbToHex(R * 32 + 16, G * 32 + 16, B * 32 + 16);
      });
      setPalette(pal);
      if (pal[0]) onHexChange(pal[0]);
    };
    img.src = URL.createObjectURL(file);
  }

  const mix = useMemo(() => {
    const total = Math.max(1, cmyk.c + cmyk.m + cmyk.y + cmyk.k);
    const factor = totalInkPct / total;
    return {
      C: round(cmyk.c * factor, 1),
      M: round(cmyk.m * factor, 1),
      Y: round(cmyk.y * factor, 1),
      K: round(cmyk.k * factor, 1),
    };
  }, [cmyk, totalInkPct]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <TextField label={t("tools.colorMix.hexCode")} value={hex} onChange={onHexChange} placeholder="#RRGGBB" />
        <div className="grid grid-cols-2 gap-3">
          <InputField label="C %" value={cmyk.c} onChange={(v) => setCmyk({ ...cmyk, c: v })} step={1} />
          <InputField label="M %" value={cmyk.m} onChange={(v) => setCmyk({ ...cmyk, m: v })} step={1} />
          <InputField label="Y %" value={cmyk.y} onChange={(v) => setCmyk({ ...cmyk, y: v })} step={1} />
          <InputField label="K %" value={cmyk.k} onChange={(v) => setCmyk({ ...cmyk, k: v })} step={1} />
        </div>
        <InputField label={t("tools.colorMix.mixTotal")} value={totalInkPct} onChange={setTotalInkPct} step={1} suffix="%" />
        
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-xl border-2" style={{ backgroundColor: hex }} />
            <div>
              <p className="font-semibold">{t("tools.colorMix.suggestedMix")}</p>
              <p className="text-sm text-muted-foreground">{t("tools.colorMix.fromTotal")} {totalInkPct}%</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <ResultCard label="C" value={`${mix.C}%`} />
            <ResultCard label="M" value={`${mix.M}%`} />
            <ResultCard label="Y" value={`${mix.Y}%`} />
            <ResultCard label="K" value={`${mix.K}%`} />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">{t("tools.colorMix.extractColors")}</h3>
        <div className="border-2 border-dashed rounded-xl p-6 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
            className="hidden"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <PaintBucket className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("tools.colorMix.clickToUpload")}</p>
          </label>
        </div>
        <canvas ref={canvasRef} className="hidden" />
        {palette.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("tools.colorMix.extractedColors")}</p>
            <div className="grid grid-cols-6 gap-2">
              {palette.map((p) => (
                <button
                  key={p}
                  className="aspect-square rounded-lg border-2 hover:scale-110 transition-transform"
                  style={{ backgroundColor: p }}
                  title={p}
                  onClick={() => onHexChange(p)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== 4) استهلاك الحبر =====================

function InkUsageCalculator({ sharedDims }: { sharedDims: { widthCm: number; lengthCm: number } | null }): JSX.Element {
  const { t } = useTranslation();
  const [widthCm, setWidthCm] = useState<number>(sharedDims?.widthCm ?? 30);
  const [lengthCm, setLengthCm] = useState<number>(sharedDims?.lengthCm ?? 40);
  const [printSides, setPrintSides] = useState<string>("1");
  const [coveragePct, setCoveragePct] = useState<number>(30);
  const [inkLaydownGsm, setInkLaydownGsm] = useState<number>(1.2);
  const [qty, setQty] = useState<number>(10000);

  useEffect(() => { 
    if (sharedDims) { 
      setWidthCm(sharedDims.widthCm); 
      setLengthCm(sharedDims.lengthCm); 
    } 
  }, [sharedDims]);

  const result = useMemo(() => {
    const area_m2 = (toNumber(widthCm) / 100) * (toNumber(lengthCm) / 100);
    const printed_m2_per_bag = area_m2 * (toNumber(coveragePct) / 100) * Number(printSides);
    const total_printed_m2 = printed_m2_per_bag * toNumber(qty);
    const ink_grams = total_printed_m2 * toNumber(inkLaydownGsm);
    const ink_kg = ink_grams / 1000;
    return { printed_m2_per_bag, total_printed_m2, ink_kg } as const;
  }, [widthCm, lengthCm, printSides, coveragePct, inkLaydownGsm, qty]);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.bagWeight.width")} value={widthCm} onChange={setWidthCm} suffix={t("tools.common.cm")} />
          <InputField label={t("tools.bagWeight.length")} value={lengthCm} onChange={setLengthCm} suffix={t("tools.common.cm")} />
        </div>
        <SelectField
          label={t("tools.inkUsage.printSides")}
          value={printSides}
          onChange={setPrintSides}
          options={[
            { value: "1", label: t("tools.inkUsage.oneSide") },
            { value: "2", label: t("tools.inkUsage.twoSides") },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.inkUsage.coverage")} value={coveragePct} onChange={setCoveragePct} step={1} suffix="%" />
          <InputField label={t("tools.inkUsage.inkLaydown")} value={inkLaydownGsm} onChange={setInkLaydownGsm} suffix="g/m²" />
        </div>
        <InputField label={t("tools.inkUsage.quantity")} value={qty} onChange={setQty} step={500} suffix={t("tools.common.piece")} />
      </div>
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          {t("tools.inkUsage.results")}
        </h3>
        <div className="grid gap-3">
          <ResultCard label={t("tools.inkUsage.printedAreaPerBag")} value={`${fmtFixed(result.printed_m2_per_bag, 4)} ${t("tools.common.sqm")}`} />
          <ResultCard label={t("tools.inkUsage.totalArea")} value={`${fmtFixed(result.total_printed_m2, 2)} ${t("tools.common.sqm")}`} />
          <ResultCard label={t("tools.inkUsage.inkRequired")} value={`${fmtFixed(result.ink_kg, 2)} ${t("tools.common.kg")}`} highlight />
        </div>
      </div>
    </div>
  );
}

// ===================== 5) تكلفة سريعة =====================

function OrderCostCalculator({ sharedBagWeightG = 0 }: { sharedBagWeightG?: number }): JSX.Element {
  const { t } = useTranslation();
  const [qty, setQty] = useState<number>(10000);
  const [bagWeightG, setBagWeightG] = useState<number>(sharedBagWeightG || 5);
  const [useShared, setUseShared] = useState<boolean>(Boolean(sharedBagWeightG));
  const [materialPricePerKg, setMaterialPricePerKg] = useState<number>(7.0);
  const [wastePct, setWastePct] = useState<number>(4);
  const [extrusionCostPerKg, setExtrusionCostPerKg] = useState<number>(1.0);
  const [cuttingCostPer1000, setCuttingCostPer1000] = useState<number>(6.0);
  const [colors, setColors] = useState<number>(0);
  const [printCostPerColorPer1000, setPrintCostPerColorPer1000] = useState<number>(5.0);
  const [marginPct, setMarginPct] = useState<number>(10);

  useEffect(() => { if (useShared) setBagWeightG(sharedBagWeightG || 0); }, [sharedBagWeightG, useShared]);

  const result = useMemo(() => {
    const weightPerBagG = toNumber(bagWeightG);
    const totalWeightKg = (toNumber(qty) * weightPerBagG) / 1_000_000;
    const materialKg = totalWeightKg * (1 + toNumber(wastePct) / 100);
    const materialCost = materialKg * toNumber(materialPricePerKg);
    const extrusionCost = materialKg * toNumber(extrusionCostPerKg);
    const cuttingCost = (toNumber(qty) / 1000) * toNumber(cuttingCostPer1000);
    const printingCost = (toNumber(qty) / 1000) * toNumber(colors) * toNumber(printCostPerColorPer1000);
    const subtotal = materialCost + extrusionCost + cuttingCost + printingCost;
    const margin = subtotal * (toNumber(marginPct) / 100);
    const total = subtotal + margin;
    return {
      materialKg, materialCost, extrusionCost, cuttingCost, printingCost,
      subtotal, margin, total,
      unitPrice: total / Math.max(1, toNumber(qty)),
      pricePerKg: total / Math.max(0.000001, materialKg)
    } as const;
  }, [qty, bagWeightG, wastePct, materialPricePerKg, extrusionCostPerKg, cuttingCostPer1000, colors, printCostPerColorPer1000, marginPct]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={useShared}
            onChange={(e) => setUseShared(e.target.checked)}
          />
          {t("tools.orderCost.useBagWeight")} ({fmtFixed(sharedBagWeightG, 3)} {t("tools.common.gram")})
        </label>
        {!useShared && <InputField label={t("tools.orderCost.bagWeight")} value={bagWeightG} onChange={setBagWeightG} suffix={t("tools.common.gram")} />}
        <InputField label={t("tools.orderCost.quantity")} value={qty} onChange={setQty} step={500} suffix={t("tools.common.piece")} />
        
        <Separator />
        
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.orderCost.materialPrice")} value={materialPricePerKg} onChange={setMaterialPricePerKg} suffix={t("tools.common.sarPerKg")} />
          <InputField label={t("tools.orderCost.wastePct")} value={wastePct} onChange={setWastePct} suffix="%" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.orderCost.extrusionCost")} value={extrusionCostPerKg} onChange={setExtrusionCostPerKg} suffix={t("tools.common.sarPerKg")} />
          <InputField label={t("tools.orderCost.cuttingCost")} value={cuttingCostPer1000} onChange={setCuttingCostPer1000} suffix={t("tools.orderCostAdvanced.per1000")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.orderCost.colorsCount")} value={colors} onChange={setColors} step={1} />
          <InputField label={t("tools.orderCost.printingCost")} value={printCostPerColorPer1000} onChange={setPrintCostPerColorPer1000} suffix={t("tools.common.sarPerColor")} />
        </div>
        <InputField label={t("tools.orderCost.profitMargin")} value={marginPct} onChange={setMarginPct} suffix="%" />
      </div>
      
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          {t("tools.orderCost.results")}
        </h3>
        <div className="grid gap-2">
          <ResultCard label={t("tools.orderCost.materialWeight")} value={`${fmtFixed(result.materialKg, 2)} ${t("tools.common.kg")}`} />
          <ResultCard label={t("tools.orderCost.materialCostResult")} value={`${fmtFixed(result.materialCost, 2)} ${t("tools.common.sar")}`} />
          <ResultCard label={t("tools.orderCost.extrusionCostResult")} value={`${fmtFixed(result.extrusionCost, 2)} ${t("tools.common.sar")}`} />
          <ResultCard label={t("tools.orderCost.cuttingCostResult")} value={`${fmtFixed(result.cuttingCost, 2)} ${t("tools.common.sar")}`} />
          {colors > 0 && <ResultCard label={t("tools.orderCost.printingCostResult")} value={`${fmtFixed(result.printingCost, 2)} ${t("tools.common.sar")}`} />}
        </div>
        <Separator />
        <div className="grid gap-2">
          <ResultCard label={t("tools.orderCost.subtotal")} value={`${fmtFixed(result.subtotal, 2)} ${t("tools.common.sar")}`} />
          <ResultCard label={t("tools.orderCost.profit")} value={`${fmtFixed(result.margin, 2)} ${t("tools.common.sar")}`} />
          <ResultCard label={t("tools.orderCost.total")} value={`${fmtFixed(result.total, 2)} ${t("tools.common.sar")}`} highlight />
        </div>
        <Separator />
        <div className="grid grid-cols-2 gap-2">
          <ResultCard label={t("tools.orderCost.unitPrice")} value={`${fmtFixed(result.unitPrice, 2)} ${t("tools.common.sar")}`} />
          <ResultCard label={t("tools.orderCost.pricePerKg")} value={`${fmtFixed(result.pricePerKg, 2)} ${t("tools.common.sar")}`} />
        </div>
      </div>
    </div>
  );
}

// ===================== 6) تكلفة متقدمة =====================

interface BomItem { name: string; pct: number; pricePerKg: number; }
interface OtherCost { name: string; type: "perKg" | "per1000" | "fixed"; value: number; }

function OrderCostAdvanced({ sharedBagWeightG = 0 }: { sharedBagWeightG?: number }): JSX.Element {
  const { t } = useTranslation();
  const [qty, setQty] = useState<number>(10000);
  const [bagWeightG, setBagWeightG] = useState<number>(sharedBagWeightG || 5);
  const [useShared, setUseShared] = useState<boolean>(Boolean(sharedBagWeightG));
  const [bom, setBom] = useState<BomItem[]>([
    { name: "HDPE Base", pct: 90, pricePerKg: 7.0 },
    { name: "Masterbatch", pct: 8, pricePerKg: 12.0 },
    { name: "Additive", pct: 2, pricePerKg: 18.0 },
  ]);
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([
    { name: "Energy Cost", type: "perKg", value: 0.4 },
    { name: "Cutting", type: "per1000", value: 6.0 },
    { name: "Setup", type: "fixed", value: 50 },
  ]);
  const [wastePct, setWastePct] = useState<number>(4);
  const [colors, setColors] = useState<number>(0);
  const [printCostPerColorPer1000, setPrintCostPerColorPer1000] = useState<number>(5.0);
  const [marginPct, setMarginPct] = useState<number>(10);

  useEffect(() => { if (useShared) setBagWeightG(sharedBagWeightG || 0); }, [sharedBagWeightG, useShared]);

  const blend = useMemo(() => {
    const totalPct = Math.max(1, bom.reduce((s, r) => s + toNumber(r.pct), 0));
    const norm = bom.map((r) => ({ ...r, weight: r.pct / totalPct }));
    const pricePerKg = norm.reduce((sum, r) => sum + r.weight * toNumber(r.pricePerKg), 0);
    return { pricePerKg } as const;
  }, [bom]);

  const result = useMemo(() => {
    const weightPerBagG = toNumber(bagWeightG);
    const totalWeightKg = (toNumber(qty) * weightPerBagG) / 1_000_000;
    const materialKg = totalWeightKg * (1 + toNumber(wastePct) / 100);
    const materialCost = materialKg * blend.pricePerKg;
    const others = otherCosts.reduce((acc, c) => {
      if (c.type === "perKg") acc.sum += materialKg * toNumber(c.value);
      else if (c.type === "per1000") acc.sum += (toNumber(qty) / 1000) * toNumber(c.value);
      else acc.sum += toNumber(c.value);
      return acc;
    }, { sum: 0 }).sum;
    const printingCost = (toNumber(qty) / 1000) * toNumber(colors) * toNumber(printCostPerColorPer1000);
    const subtotal = materialCost + others + printingCost;
    const margin = subtotal * (toNumber(marginPct) / 100);
    const total = subtotal + margin;
    return {
      materialKg, blendPrice: blend.pricePerKg, materialCost, otherCosts: others,
      printingCost, subtotal, margin, total,
      unitPrice: total / Math.max(1, toNumber(qty)),
      pricePerKg: total / Math.max(0.000001, materialKg),
    } as const;
  }, [qty, bagWeightG, wastePct, blend.pricePerKg, otherCosts, colors, printCostPerColorPer1000, marginPct]);

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" className="rounded" checked={useShared} onChange={(e) => setUseShared(e.target.checked)} />
            {t("tools.orderCost.useBagWeight")}
          </label>
          {!useShared && <InputField label={t("tools.orderCost.bagWeight")} value={bagWeightG} onChange={setBagWeightG} suffix={t("tools.common.gram")} />}
          <InputField label={t("tools.orderCost.quantity")} value={qty} onChange={setQty} step={500} suffix={t("tools.common.piece")} />
          <InputField label={t("tools.orderCost.wastePct")} value={wastePct} onChange={setWastePct} suffix="%" />
          
          <Separator />
          
          <h4 className="font-semibold">{t("tools.orderCostAdvanced.bomComponents")}</h4>
          <BomTable rows={bom} setRows={setBom} />
        </div>
        
        <div className="space-y-4">
          <h4 className="font-semibold">{t("tools.orderCostAdvanced.otherCosts")}</h4>
          <OtherCostsTable rows={otherCosts} setRows={setOtherCosts} />
          
          <Separator />
          
          <div className="grid grid-cols-2 gap-3">
            <InputField label={t("tools.orderCost.colorsCount")} value={colors} onChange={setColors} step={1} />
            <InputField label={t("tools.orderCost.printingCost")} value={printCostPerColorPer1000} onChange={setPrintCostPerColorPer1000} suffix={t("tools.common.sarPerColor")} />
          </div>
          <InputField label={t("tools.orderCost.profitMargin")} value={marginPct} onChange={setMarginPct} suffix="%" />
        </div>
      </div>

      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          {t("tools.orderCostAdvanced.costResults")}
        </h4>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ResultCard label={t("tools.orderCostAdvanced.blendPrice")} value={`${fmtFixed(result.blendPrice, 2)} ${t("tools.common.sarPerKg")}`} />
          <ResultCard label={t("tools.orderCostAdvanced.materialWeight")} value={`${fmtFixed(result.materialKg, 2)} ${t("tools.common.kg")}`} />
          <ResultCard label={t("tools.orderCostAdvanced.materialCost")} value={`${fmtFixed(result.materialCost, 2)} ${t("tools.common.sar")}`} />
          <ResultCard label={t("tools.orderCostAdvanced.otherCostsResult")} value={`${fmtFixed(result.otherCosts, 2)} ${t("tools.common.sar")}`} />
        </div>
        <Separator className="my-4" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ResultCard label={t("tools.orderCost.subtotal")} value={`${fmtFixed(result.subtotal, 2)} ${t("tools.common.sar")}`} />
          <ResultCard label={t("tools.orderCost.profit")} value={`${fmtFixed(result.margin, 2)} ${t("tools.common.sar")}`} />
          <ResultCard label={t("tools.orderCost.total")} value={`${fmtFixed(result.total, 2)} ${t("tools.common.sar")}`} highlight />
          <ResultCard label={t("tools.orderCost.unitPrice")} value={`${fmtFixed(result.unitPrice, 2)} ${t("tools.common.sar")}`} />
        </div>
      </div>
    </div>
  );
}

function BomTable({ rows, setRows }: { rows: BomItem[]; setRows: (r: BomItem[]) => void }): JSX.Element {
  const { t } = useTranslation();
  const updateRow = (idx: number, patch: Partial<BomItem>) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () => setRows([...rows, { name: t("tools.orderCostAdvanced.newComponent"), pct: 0, pricePerKg: 0 }]);
  const delRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <Input className="col-span-5" value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} placeholder={t("tools.orderCostAdvanced.name")} />
          <Input type="number" className="col-span-2" value={r.pct} step={0.1} onChange={(e) => updateRow(i, { pct: Number(e.target.value) })} placeholder="%" />
          <Input type="number" className="col-span-3" value={r.pricePerKg} step={0.1} onChange={(e) => updateRow(i, { pricePerKg: Number(e.target.value) })} placeholder={t("tools.orderCostAdvanced.price")} />
          <Button variant="ghost" size="sm" className="col-span-2 text-destructive" onClick={() => delRow(i)}>{t("tools.orderCostAdvanced.delete")}</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRow}>{t("tools.orderCostAdvanced.addComponent")}</Button>
    </div>
  );
}

function OtherCostsTable({ rows, setRows }: { rows: OtherCost[]; setRows: (r: OtherCost[]) => void }): JSX.Element {
  const { t } = useTranslation();
  const updateRow = (idx: number, patch: Partial<OtherCost>) => setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () => setRows([...rows, { name: t("tools.orderCostAdvanced.newCost"), type: "fixed", value: 0 }]);
  const delRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));

  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-center">
          <Input className="col-span-4" value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
          <Select value={r.type} onValueChange={(v) => updateRow(i, { type: v as OtherCost["type"] })}>
            <SelectTrigger className="col-span-3">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="perKg">{t("tools.orderCostAdvanced.perKg")}</SelectItem>
              <SelectItem value="per1000">{t("tools.orderCostAdvanced.per1000")}</SelectItem>
              <SelectItem value="fixed">{t("tools.orderCostAdvanced.fixed")}</SelectItem>
            </SelectContent>
          </Select>
          <Input type="number" className="col-span-3" value={r.value} step={0.1} onChange={(e) => updateRow(i, { value: Number(e.target.value) })} />
          <Button variant="ghost" size="sm" className="col-span-2 text-destructive" onClick={() => delRow(i)}>{t("tools.orderCostAdvanced.delete")}</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={addRow}>{t("tools.orderCostAdvanced.addCost")}</Button>
    </div>
  );
}

// ===================== 7) أدوات الرول =====================

function RollTools(): JSX.Element {
  const { t } = useTranslation();
  const [rollWeightKg, setRollWeightKg] = useState<number>(25);
  const [coreWeightKg, setCoreWeightKg] = useState<number>(0.4);
  const [rollWidthCm, setRollWidthCm] = useState<number>(60);
  const [rollThicknessMicron, setRollThicknessMicron] = useState<number>(18);
  const [rollDensity, setRollDensity] = useState<number>(0.95);

  const netRollWeightG = Math.max(0, toNumber(rollWeightKg) - toNumber(coreWeightKg)) * 1000;
  const thicknessCm = toNumber(rollThicknessMicron) * 1e-4;

  const lengthM = useMemo(() => {
    const denom = toNumber(rollWidthCm) * thicknessCm * toNumber(rollDensity) * 100;
    if (denom <= 0) return 0;
    return netRollWeightG / denom;
  }, [netRollWeightG, rollWidthCm, thicknessCm, rollDensity]);

  const [targetLengthM, setTargetLengthM] = useState<number>(1000);
  const [tWidthCm, setTWidthCm] = useState<number>(60);
  const [tThicknessMicron, setTThicknessMicron] = useState<number>(18);
  const [tDensity, setTDensity] = useState<number>(0.95);
  const tThicknessCm = toNumber(tThicknessMicron) * 1e-4;

  const neededWeightKg = useMemo(() => {
    const grams = toNumber(tWidthCm) * tThicknessCm * toNumber(targetLengthM) * 100 * toNumber(tDensity);
    return grams / 1000;
  }, [targetLengthM, tWidthCm, tThicknessCm, tDensity]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {t("tools.roll.weightToLength")}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.roll.rollWeight")} value={rollWeightKg} onChange={setRollWeightKg} suffix={t("tools.common.kg")} />
          <InputField label={t("tools.roll.coreWeight")} value={coreWeightKg} onChange={setCoreWeightKg} suffix={t("tools.common.kg")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.roll.width")} value={rollWidthCm} onChange={setRollWidthCm} suffix={t("tools.common.cm")} />
          <InputField label={t("tools.roll.thickness")} value={rollThicknessMicron} onChange={setRollThicknessMicron} suffix="μm" />
        </div>
        <InputField label={t("tools.roll.density")} value={rollDensity} onChange={setRollDensity} suffix="g/cm³" />
        <ResultCard label={t("tools.roll.estimatedLength")} value={`${fmtFixed(lengthM, 1)} ${t("tools.common.meter")}`} highlight />
      </div>
      
      <div className="space-y-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          {t("tools.roll.lengthToWeight")}
        </h4>
        <InputField label={t("tools.roll.targetLength")} value={targetLengthM} onChange={setTargetLengthM} suffix={t("tools.common.meter")} />
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.roll.width")} value={tWidthCm} onChange={setTWidthCm} suffix={t("tools.common.cm")} />
          <InputField label={t("tools.roll.thickness")} value={tThicknessMicron} onChange={setTThicknessMicron} suffix="μm" />
        </div>
        <InputField label={t("tools.roll.density")} value={tDensity} onChange={setTDensity} suffix="g/cm³" />
        <ResultCard label={t("tools.roll.requiredWeight")} value={`${fmtFixed(neededWeightKg, 2)} ${t("tools.common.kg")}`} highlight />
      </div>
    </div>
  );
}

// ===================== 8) تحويل السماكة =====================

function ThicknessConverter(): JSX.Element {
  const { t } = useTranslation();
  const [micron, setMicron] = useState<number>(20);
  const mm = useMemo(() => toNumber(micron) / 1000, [micron]);
  const gauge = useMemo(() => toNumber(micron) * 4, [micron]);

  const [mmIn, setMmIn] = useState<number>(0.02);
  const micronFromMm = useMemo(() => toNumber(mmIn) * 1000, [mmIn]);
  const gaugeFromMm = useMemo(() => micronFromMm * 4, [micronFromMm]);

  const [gaugeIn, setGaugeIn] = useState<number>(80);
  const micronFromGauge = useMemo(() => toNumber(gaugeIn) * 0.25, [gaugeIn]);
  const mmFromGauge = useMemo(() => micronFromGauge / 1000, [micronFromGauge]);

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <h4 className="font-semibold flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          {t("tools.thickness.fromMicron")}
        </h4>
        <InputField label={t("tools.thickness.micron")} value={micron} onChange={setMicron} suffix="μm" />
        <div className="grid gap-2">
          <ResultCard label={t("tools.thickness.mm")} value={fmtFixed(mm, 4)} />
          <ResultCard label={t("tools.thickness.gauge")} value={fmtFixed(gauge, 1)} />
        </div>
      </div>
      
      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <h4 className="font-semibold flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          {t("tools.thickness.fromMm")}
        </h4>
        <InputField label={t("tools.thickness.mm")} value={mmIn} onChange={setMmIn} step={0.001} suffix="mm" />
        <div className="grid gap-2">
          <ResultCard label={t("tools.thickness.micron")} value={fmtFixed(micronFromMm, 1)} />
          <ResultCard label={t("tools.thickness.gauge")} value={fmtFixed(gaugeFromMm, 1)} />
        </div>
      </div>
      
      <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
        <h4 className="font-semibold flex items-center gap-2">
          <Ruler className="h-5 w-5 text-primary" />
          {t("tools.thickness.fromGauge")}
        </h4>
        <InputField label={t("tools.thickness.gauge")} value={gaugeIn} onChange={setGaugeIn} step={1} />
        <div className="grid gap-2">
          <ResultCard label={t("tools.thickness.micron")} value={fmtFixed(micronFromGauge, 1)} />
          <ResultCard label={t("tools.thickness.mm")} value={fmtFixed(mmFromGauge, 4)} />
        </div>
      </div>
    </div>
  );
}

// ===================== 9) زمن التشغيل =====================

function JobTimePlanner(): JSX.Element {
  const { t } = useTranslation();
  const [qty, setQty] = useState<number>(10000);
  const [bagWeightG, setBagWeightG] = useState<number>(5);
  const [extrusionKgPerHr, setExtrusionKgPerHr] = useState<number>(35);
  const [cutBagsPerMin, setCutBagsPerMin] = useState<number>(120);
  const [printMPerMin, setPrintMPerMin] = useState<number>(60);
  const [bagLengthCm, setBagLengthCm] = useState<number>(40);
  const [setupExtruderHr, setSetupExtruderHr] = useState<number>(0.5);
  const [setupCutterHr, setSetupCutterHr] = useState<number>(0.3);
  const [setupPrinterHr, setSetupPrinterHr] = useState<number>(0.7);
  const [colors, setColors] = useState<number>(0);
  const [changeoverPerColorMin, setChangeoverPerColorMin] = useState<number>(8);

  const result = useMemo(() => {
    const totalKg = (toNumber(qty) * toNumber(bagWeightG)) / 1000 / 1000;
    const extrusionHours = totalKg / Math.max(1e-6, toNumber(extrusionKgPerHr)) + toNumber(setupExtruderHr);
    const totalMeters = (toNumber(qty) * (toNumber(bagLengthCm) / 100));
    const printCore = totalMeters / Math.max(1e-6, toNumber(printMPerMin)) / 60;
    const printChangeovers = (toNumber(colors) > 0 ? (toNumber(colors) - 1) * (toNumber(changeoverPerColorMin) / 60) : 0);
    const printHours = printCore + printChangeovers + toNumber(setupPrinterHr);
    const cutCore = (toNumber(qty) / Math.max(1e-6, toNumber(cutBagsPerMin))) / 60;
    const cutHours = cutCore + toNumber(setupCutterHr);
    const totalHours = extrusionHours + printHours + cutHours;
    return { totalKg, extrusionHours, printHours, cutHours, totalHours } as const;
  }, [qty, bagWeightG, extrusionKgPerHr, cutBagsPerMin, printMPerMin, bagLengthCm, setupExtruderHr, setupCutterHr, setupPrinterHr, colors, changeoverPerColorMin]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.jobTime.quantity")} value={qty} onChange={setQty} step={500} suffix={t("tools.common.piece")} />
          <InputField label={t("tools.jobTime.bagWeight")} value={bagWeightG} onChange={setBagWeightG} suffix={t("tools.common.gram")} />
        </div>
        
        <Separator />
        <h4 className="font-semibold text-sm text-muted-foreground">{t("tools.jobTime.productionSpeeds")}</h4>
        
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.jobTime.extrusionSpeed")} value={extrusionKgPerHr} onChange={setExtrusionKgPerHr} suffix={t("tools.common.kgPerHour")} />
          <InputField label={t("tools.jobTime.cuttingSpeed")} value={cutBagsPerMin} onChange={setCutBagsPerMin} suffix={t("tools.common.piecesPerMin")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.jobTime.printingSpeed")} value={printMPerMin} onChange={setPrintMPerMin} suffix={t("tools.common.metersPerMin")} />
          <InputField label={t("tools.jobTime.bagLength")} value={bagLengthCm} onChange={setBagLengthCm} suffix={t("tools.common.cm")} />
        </div>
        
        <Separator />
        <h4 className="font-semibold text-sm text-muted-foreground">{t("tools.jobTime.setupTimes")}</h4>
        
        <div className="grid grid-cols-3 gap-3">
          <InputField label={t("tools.jobTime.extrusionSetup")} value={setupExtruderHr} onChange={setSetupExtruderHr} suffix={t("tools.common.hour")} />
          <InputField label={t("tools.jobTime.cuttingSetup")} value={setupCutterHr} onChange={setSetupCutterHr} suffix={t("tools.common.hour")} />
          <InputField label={t("tools.jobTime.printingSetup")} value={setupPrinterHr} onChange={setSetupPrinterHr} suffix={t("tools.common.hour")} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label={t("tools.jobTime.colorsCount")} value={colors} onChange={setColors} step={1} />
          <InputField label={t("tools.jobTime.colorChangeTime")} value={changeoverPerColorMin} onChange={setChangeoverPerColorMin} suffix={t("tools.common.minute")} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          {t("tools.jobTime.timeEstimate")}
        </h3>
        <div className="grid gap-3">
          <ResultCard label={t("tools.jobTime.materialWeight")} value={`${fmtFixed(result.totalKg, 2)} ${t("tools.common.kg")}`} />
          <ResultCard label={t("tools.jobTime.extrusionHours")} value={`${fmtFixed(result.extrusionHours, 2)} ${t("tools.common.hour")}`} />
          <ResultCard label={t("tools.jobTime.printingHours")} value={`${fmtFixed(result.printHours, 2)} ${t("tools.common.hour")}`} />
          <ResultCard label={t("tools.jobTime.cuttingHours")} value={`${fmtFixed(result.cutHours, 2)} ${t("tools.common.hour")}`} />
        </div>
        <Separator />
        <ResultCard label={t("tools.jobTime.totalHours")} value={`${fmtFixed(result.totalHours, 2)} ${t("tools.common.hour")}`} highlight />
        <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          {t("tools.jobTime.note")}
        </p>
      </div>
    </div>
  );
}

// ===================== Barcode Generator =====================

type BarcodeFormat = "CODE128" | "EAN13" | "EAN8" | "CODE39" | "ITF14";
type BarcodeSize = "small" | "medium" | "large" | "xlarge" | "label50x25" | "label55x40" | "label100x150";

interface BarcodeSizeData {
  width: number;
  height: number;
  fontSize: number;
  displayWidth: number;
  displayHeight: number;
  printWidthMm: number;
  printHeightMm: number;
}

const barcodeSizeData: Record<BarcodeSize, BarcodeSizeData> = {
  small: { width: 2, height: 30, fontSize: 10, displayWidth: 150, displayHeight: 50, printWidthMm: 38, printHeightMm: 13 },
  medium: { width: 2.5, height: 50, fontSize: 12, displayWidth: 200, displayHeight: 70, printWidthMm: 50, printHeightMm: 25 },
  large: { width: 3, height: 80, fontSize: 14, displayWidth: 280, displayHeight: 100, printWidthMm: 70, printHeightMm: 35 },
  xlarge: { width: 4, height: 100, fontSize: 16, displayWidth: 350, displayHeight: 130, printWidthMm: 90, printHeightMm: 50 },
  label50x25: { width: 2.5, height: 45, fontSize: 11, displayWidth: 189, displayHeight: 94, printWidthMm: 50, printHeightMm: 25 },
  label55x40: { width: 3, height: 70, fontSize: 12, displayWidth: 208, displayHeight: 151, printWidthMm: 55, printHeightMm: 40 },
  label100x150: { width: 4, height: 200, fontSize: 18, displayWidth: 378, displayHeight: 567, printWidthMm: 100, printHeightMm: 150 },
};

const barcodeFormatValues: BarcodeFormat[] = ["CODE128", "EAN13", "EAN8", "CODE39", "ITF14"];

function BarcodeGenerator(): JSX.Element {
  const { t } = useTranslation();
  const [barcodeValue, setBarcodeValue] = useState<string>("1234567890");
  const [format, setFormat] = useState<BarcodeFormat>("CODE128");
  const [size, setSize] = useState<BarcodeSize>("medium");
  const [showText, setShowText] = useState<boolean>(true);
  const [customText, setCustomText] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [error, setError] = useState<string>("");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && barcodeValue) {
      try {
        const sizeConfig = barcodeSizeData[size];
        JsBarcode(svgRef.current, barcodeValue, {
          format,
          width: sizeConfig.width,
          height: sizeConfig.height,
          displayValue: showText,
          fontSize: sizeConfig.fontSize,
          margin: 10,
          background: "#ffffff",
          lineColor: "#000000",
        });
        setError("");
      } catch (err: any) {
        setError(t("tools.barcode.invalidValue"));
      }
    }
  }, [barcodeValue, format, size, showText, t]);

  const handlePrint = () => {
    if (!svgRef.current || error) return;
    
    const svgData = new XMLSerializer().serializeToString(svgRef.current);
    const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
    
    const sizeConfig = barcodeSizeData[size];
    const labelWidthMm = sizeConfig.printWidthMm;
    const labelHeightMm = sizeConfig.printHeightMm;
    
    const barcodeItems = Array(quantity).fill(null).map(() => 
      `<div class="barcode-item">
        <img src="${dataUrl}" style="max-width:100%;max-height:${customText ? '75%' : '90%'};object-fit:contain;" />
        ${customText ? `<div class="custom-text">${customText}</div>` : ''}
      </div>`
    ).join("");

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <title>${t("tools.barcode.printTitle")}</title>
          <style>
            @page {
              size: ${labelWidthMm}mm ${labelHeightMm}mm;
              margin: 0;
            }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 0;
            }
            .barcode-item { 
              width: ${labelWidthMm}mm;
              height: ${labelHeightMm}mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              page-break-after: always;
              padding: 1mm;
            }
            .barcode-item:last-child { page-break-after: auto; }
            .custom-text {
              font-size: ${Math.max(8, Math.floor(labelHeightMm / 8))}px;
              font-weight: bold;
              text-align: center;
              margin-top: 1mm;
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            }
            @media screen {
              body { padding: 10px; text-align: center; }
              .barcode-item { 
                border: 1px dashed #ccc; 
                margin: 5px auto;
                display: inline-flex;
              }
              .no-print { margin-bottom: 5px; }
            }
            @media print { 
              .no-print { display: none !important; } 
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print">
            <button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer;margin-bottom:10px;">
              ${t("tools.barcode.printNow")}
            </button>
            <p style="color:#666;font-size:14px;">${t("tools.barcode.labelSize")}: ${labelWidthMm}×${labelHeightMm} ${t("common.mm") || "مم"}</p>
          </div>
          ${barcodeItems}
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Barcode className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">{t("tools.barcode.title")}</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("tools.barcode.value")}</Label>
            <Input
              value={barcodeValue}
              onChange={(e) => setBarcodeValue(e.target.value)}
              placeholder={t("tools.barcode.valuePlaceholder")}
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label>{t("tools.barcode.format")}</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as BarcodeFormat)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {barcodeFormatValues.map((f) => (
                  <SelectItem key={f} value={f}>
                    <span className="font-medium">{t(`tools.barcode.formats.${f}`)}</span>
                    <span className="text-xs text-muted-foreground mr-2">({t(`tools.barcode.formats.${f}Hint`)})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("tools.barcode.size")}</Label>
            <Select value={size} onValueChange={(v) => setSize(v as BarcodeSize)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(barcodeSizeData) as BarcodeSize[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`tools.barcode.sizes.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showText"
                checked={showText}
                onChange={(e) => setShowText(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="showText" className="cursor-pointer">
                {t("tools.barcode.showText")}
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("tools.barcode.customText")}</Label>
            <Input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder={t("tools.barcode.customTextPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("tools.barcode.quantity")}</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={(e) => setQuantity(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
            />
          </div>

          <Button onClick={handlePrint} disabled={!!error || !barcodeValue} className="w-full">
            <Printer className="h-4 w-4 ml-2" />
            {t("tools.barcode.print")} ({quantity} {t("tools.barcode.copies")})
          </Button>
        </div>

        <div className="space-y-4">
          <Label>{t("tools.barcode.preview")}</Label>
          <div className="border rounded-lg p-6 bg-white flex items-center justify-center min-h-[200px]">
            {error ? (
              <div className="text-red-500 text-center">
                <p>{error}</p>
                <p className="text-xs mt-2">{t("tools.barcode.checkFormat")}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <svg ref={svgRef}></svg>
                {customText && (
                  <p className="mt-2 font-bold text-sm">{customText}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <h4 className="font-medium text-sm mb-2">{t("tools.barcode.tips")}</h4>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>{t("tools.barcode.tip1")}</li>
              <li>{t("tools.barcode.tip2")}</li>
              <li>{t("tools.barcode.tip3")}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===================== Utility Functions =====================

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

function fmtFixed(v: number, d: number): string {
  return toNumber(v).toFixed(d);
}

interface CMYK { c: number; m: number; y: number; k: number; }

function cmykToRgb(c: number, m: number, y: number, k: number): { r: number; g: number; b: number } {
  const C = toNumber(c) / 100, M = toNumber(m) / 100, Y = toNumber(y) / 100, K = toNumber(k) / 100;
  const r = Math.round(255 * (1 - C) * (1 - K));
  const g = Math.round(255 * (1 - M) * (1 - K));
  const b = Math.round(255 * (1 - Y) * (1 - K));
  return { r, g, b };
}

function rgbToCmyk(r: number, g: number, b: number): CMYK {
  const R = toNumber(r) / 255, G = toNumber(g) / 255, B = toNumber(b) / 255;
  const K = 1 - Math.max(R, G, B);
  if (K === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const C = (1 - R - K) / (1 - K);
  const M = (1 - G - K) / (1 - K);
  const Y = (1 - B - K) / (1 - K);
  return { c: Math.round(C * 100), m: Math.round(M * 100), y: Math.round(Y * 100), k: Math.round(K * 100) };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function normalizeHex(v: string): string {
  let h = v.trim().toUpperCase();
  if (!h.startsWith("#")) h = "#" + h;
  if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  return h.slice(0, 7);
}
