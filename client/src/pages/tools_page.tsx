import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";

type TabId =
  | "bag-weight"
  | "colors"
  | "color-mix"
  | "ink-usage"
  | "order-cost"
  | "order-cost-advanced"
  | "roll"
  | "thickness"
  | "job-time";

interface TabDef { id: TabId; labelKey: string; }

const tabDefs: TabDef[] = [
  { id: "bag-weight", labelKey: "tabs.bagWeight" },
  { id: "colors", labelKey: "tabs.colors" },
  { id: "color-mix", labelKey: "tabs.colorMix" },
  { id: "ink-usage", labelKey: "tabs.inkUsage" },
  { id: "order-cost", labelKey: "tabs.orderCost" },
  { id: "order-cost-advanced", labelKey: "tabs.orderCostAdvanced" },
  { id: "roll", labelKey: "tabs.roll" },
  { id: "thickness", labelKey: "tabs.thickness" },
  { id: "job-time", labelKey: "tabs.jobTime" },
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

  useEffect(() => { try { window.localStorage.setItem(STORAGE_KEY, active); } catch {} }, [active]);

  return (
    <div className="p-0 md:p-0 lg:p-0 max-w-7xl">
      <div className="overflow-x-auto">
        <div className="inline-flex gap-2 bg-gray-100 rounded-xl p-1 mb-6" role="tablist" aria-label="tools-tabs">
          {tabDefs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              role="tab"
              aria-selected={active === tab.id}
              className={`px-3 py-2 rounded-lg text-sm md:text-base whitespace-nowrap transition ${
                active === tab.id ? "bg-white shadow font-semibold" : "hover:bg-white/60"
              }`}
              title={t(`tools.${tab.labelKey}`)}
            >
              {t(`tools.${tab.labelKey}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6">
        {active === "bag-weight" && (
          <Card title={t("tools.bagWeight.title")}>
            <BagWeightCalculator
              onBagWeight={(g) => setSharedBagWeightG(g)}
              onDims={(d) => setSharedBagDims(d)}
            />
          </Card>
        )}

        {active === "colors" && (
          <Card title={t("tools.colors.title")}>
            <ColorTools />
          </Card>
        )}

        {active === "color-mix" && (
          <Card title={t("tools.colorMix.title")}>
            <ColorMixTools />
          </Card>
        )}

        {active === "ink-usage" && (
          <Card title={t("tools.inkUsage.title")}>
            <InkUsageCalculator sharedDims={sharedBagDims} />
          </Card>
        )}

        {active === "order-cost" && (
          <Card title={t("tools.orderCost.title")}>
            <OrderCostCalculator sharedBagWeightG={sharedBagWeightG} />
          </Card>
        )}

        {active === "order-cost-advanced" && (
          <Card title={t("tools.orderCostAdvanced.title")}>
            <OrderCostAdvanced sharedBagWeightG={sharedBagWeightG} />
          </Card>
        )}

        {active === "roll" && (
          <Card title={t("tools.roll.title")}>
            <RollTools />
          </Card>
        )}

        {active === "thickness" && (
          <Card title={t("tools.thickness.title")}>
            <ThicknessConverter />
          </Card>
        )}

        {active === "job-time" && (
          <Card title={t("tools.jobTime.title")}>
            <JobTimePlanner />
          </Card>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  const { t } = useTranslation();
  return (
    <section className="bg-white rounded-2xl shadow p-4 md:p-6 border border-gray-100" aria-label={title}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button className="text-xs px-2 py-1 rounded border hover:bg-gray-50" onClick={() => window.print()} title={t("tools.print")}>{t("tools.print")}</button>
      </div>
      <div>{children}</div>
    </section>
  );
}

// ===================== 1) حاسبة وزن الأكياس =====================

type BagType = "flat" | "side-gusset" | "table-cover";

interface BagWeightCalculatorProps {
  onBagWeight?: (gramsPerBag: number) => void;
  onDims?: (d: { widthCm: number; lengthCm: number }) => void;
}

function BagWeightCalculator({ onBagWeight, onDims }: BagWeightCalculatorProps): JSX.Element {
  const [bagType, setBagType] = useState<BagType>("flat");

  const [widthCm, setWidthCm] = useState<number>(30);
  const [lengthCm, setLengthCm] = useState<number>(40);
  const [thicknessMicron, setThicknessMicron] = useState<number>(18);
  const [layers, setLayers] = useState<number>(2);
  const [density, setDensity] = useState<number>(0.95);
  const [sideGussetCm, setSideGussetCm] = useState<number>(0);

  useEffect(() => { onDims?.({ widthCm, lengthCm }); }, [widthCm, lengthCm, onDims]);

  const result = useMemo(() => {
    const t_cm = toNumber(thicknessMicron) * 1e-4; // μm → cm
    let effWidth = toNumber(widthCm);
    if (bagType === "side-gusset") effWidth = toNumber(widthCm) + 2 * toNumber(sideGussetCm);
    const gramsPerBag = Math.max(0, effWidth * toNumber(lengthCm) * toNumber(layers) * t_cm * toNumber(density));
    const kgPer1000 = gramsPerBag; // جم/حبة == كجم/1000 حبة
    return { gramsPerBag, kgPer1000 } as const;
  }, [bagType, widthCm, lengthCm, thicknessMicron, layers, density, sideGussetCm]);

  useEffect(() => { onBagWeight?.(result.gramsPerBag || 0); }, [result.gramsPerBag, onBagWeight]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="grid gap-3">
        <LabeledSelect
          label="نوع الكيس"
          value={bagType}
          onChange={(v) => setBagType(v as BagType)}
          options={[
            { value: "flat", label: "كيس مسطح (بدون دخلات)" },
            { value: "side-gusset", label: "كيس بدخلات جانبية (سايد فولد)" },
            { value: "table-cover", label: "سفرة مسطحة" },
          ]}
          hint="اختر النوع لضبط الحسابات والمدخلات المناسبة"
        />
        <LabeledNumber label="العرض (سم) — مفرود" value={widthCm} onChange={setWidthCm} step={0.1} />
        <LabeledNumber label="الطول (سم)" value={lengthCm} onChange={setLengthCm} step={0.1} />
        <LabeledNumber label="السماكة (ميكرون)" value={thicknessMicron} onChange={setThicknessMicron} step={0.1} />
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="عدد الطبقات" value={layers} onChange={setLayers} step={1} />
          <LabeledNumber label="الكثافة g/cm³" value={density} onChange={setDensity} step={0.01} />
        </div>
        {bagType === "side-gusset" && (
          <LabeledNumber label="دخلات جانبية (سم) — لكل جانب" value={sideGussetCm} onChange={setSideGussetCm} step={0.1} />
        )}
        <p className="text-xs text-gray-500">* العرض مفرود. في حالة الدخلات الجانبية يتم إضافة (2 × الدخلات) إلى العرض المؤثر.</p>
      </div>
      <div className="grid gap-3 bg-gray-50 rounded-xl p-4">
        <Metric label="وزن الكيس (جم)" value={fmtFixed(result.gramsPerBag, 3)} />
        <Metric label="وزن 1000 كيس (كجم)" value={fmtFixed(result.kgPer1000, 3)} />
      </div>
    </div>
  );
}

// ===================== 2) أدوات الألوان (قياسية) =====================
function ColorTools(): JSX.Element {
  const [c, setC] = useState<number>(0);
  const [m, setM] = useState<number>(0);
  const [y, setY] = useState<number>(0);
  const [k, setK] = useState<number>(0);
  const rgb = useMemo(() => cmykToRgb(c, m, y, k), [c, m, y, k]);
  const hex = useMemo(() => rgbToHex(rgb.r, rgb.g, rgb.b), [rgb]);
  const [pantoneCode, setPantoneCode] = useState<string>("");
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="grid gap-3">
        <h3 className="font-semibold">تحويل CMYK → RGB/HEX</h3>
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="C %" value={c} onChange={setC} step={1} />
          <LabeledNumber label="M %" value={m} onChange={setM} step={1} />
          <LabeledNumber label="Y %" value={y} onChange={setY} step={1} />
          <LabeledNumber label="K %" value={k} onChange={setK} step={1} />
        </div>
        <div className="grid gap-2 bg-gray-50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-10 rounded border" style={{ backgroundColor: hex }} title="معاينة اللون" />
            <div className="grid text-sm">
              <span>RGB: {rgb.r}, {rgb.g}, {rgb.b}</span>
              <span>HEX: {hex}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">التحويل تقريبي وقد يختلف حسب الحبر والمادة وظروف الطباعة.</p>
        </div>
        <div className="grid gap-2 mt-3">
          <h4 className="font-semibold">مرجع Pantone (اختياري)</h4>
          <LabeledText label="كود Pantone (مثال: 186 C)" value={pantoneCode} onChange={setPantoneCode} placeholder="أدخل الكود للمرجعة الداخلية" />
          <p className="text-xs text-gray-500">لا يمكن اشتقاق CMYK دقيق من Pantone بدون جدول مرجعي معتمد.</p>
        </div>
      </div>
      <div className="grid gap-3">
        <h3 className="font-semibold">تحويل RGB → CMYK</h3>
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
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-3">
        <LabeledNumber label="R" value={r} onChange={setR} step={1} />
        <LabeledNumber label="G" value={g} onChange={setG} step={1} />
        <LabeledNumber label="B" value={b} onChange={setB} step={1} />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-16 h-10 rounded border" style={{ backgroundColor: hex }} />
        <div className="grid text-sm">
          <span>HEX: {hex}</span>
          <span>CMYK: {cmyk.c}% / {cmyk.m}% / {cmyk.y}% / {cmyk.k}%</span>
        </div>
      </div>
    </div>
  );
}

// ===================== 3) خلطات اللون (من صورة/كود) =====================
function ColorMixTools(): JSX.Element {
  const [hex, setHex] = useState<string>("#008DCB");
  const [cmyk, setCmyk] = useState<CMYK>(() => rgbToCmyk(0, 141, 203));
  const [totalInkPct, setTotalInkPct] = useState<number>(100); // مجموع نسب الخلطة المطلوب (افتراضي 100)

  // رفع صورة واستخراج ألوان مهيمنة
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
      // كوانتنزيشن بسيط: تجميع كل قناة على 8 مستويات (0..7)
      for (let i = 0; i < data.length; i += 16) { // تخطي عينات لتسريع
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const R = r >> 5, G = g >> 5, B = b >> 5; // 0..7
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
    img.onerror = () => { /* تجاهل */ };
    img.src = URL.createObjectURL(file);
  }

  // اقتراح خلطة: توزيع نسبي حسب نسب CMYK
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
    <div className="grid md:grid-cols-2 gap-4">
      <div className="grid gap-3">
        <LabeledText label="HEX" value={hex} onChange={onHexChange} placeholder="#RRGGBB" />
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="C %" value={cmyk.c} onChange={(v) => setCmyk({ ...cmyk, c: v })} step={1} />
          <LabeledNumber label="M %" value={cmyk.m} onChange={(v) => setCmyk({ ...cmyk, m: v })} step={1} />
          <LabeledNumber label="Y %" value={cmyk.y} onChange={(v) => setCmyk({ ...cmyk, y: v })} step={1} />
          <LabeledNumber label="K %" value={cmyk.k} onChange={(v) => setCmyk({ ...cmyk, k: v })} step={1} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="مجموع الخلطة المطلوب %" value={totalInkPct} onChange={setTotalInkPct} step={1} />
          <div className="flex items-end gap-2">
            <div className="w-16 h-10 rounded border" style={{ backgroundColor: hex }} />
            <span className="text-xs text-gray-600">معاينة</span>
          </div>
        </div>
        <div className="grid gap-2 bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold">اقتراح خلطة (نِسَب من إجمالي {totalInkPct}%)</h4>
          <div className="grid grid-cols-4 gap-3">
            <Metric label="C" value={`${mix.C}%`} />
            <Metric label="M" value={`${mix.M}%`} />
            <Metric label="Y" value={`${mix.Y}%`} />
            <Metric label="K" value={`${mix.K}%`} />
          </div>
          <p className="text-[11px] text-gray-500">اقتراح أولي — يلزم اختبار عملي (Drawdown) على نفس المادة والآلة.</p>
        </div>
      </div>

      <div className="grid gap-3">
        <h4 className="font-semibold">استخراج ألوان من صورة تصميم</h4>
        <input type="file" accept="image/*" onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])} />
        <canvas ref={canvasRef} className="hidden" />
        {palette.length > 0 && (
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {palette.map((p) => (
              <button key={p} className="h-10 rounded border" style={{ backgroundColor: p }} title={p} onClick={() => onHexChange(p)} />
            ))}
          </div>
        )}
        <p className="text-xs text-gray-500">انقر على أي لون من اللوحة لتحديث الخلطة المقترحة.</p>
      </div>
    </div>
  );
}

// ===================== 4) تقدير استخدام الحبر =====================
function InkUsageCalculator({ sharedDims }: { sharedDims: { widthCm: number; lengthCm: number } | null }): JSX.Element {
  const [widthCm, setWidthCm] = useState<number>(sharedDims?.widthCm ?? 30);
  const [lengthCm, setLengthCm] = useState<number>(sharedDims?.lengthCm ?? 40);
  const [printSides, setPrintSides] = useState<1 | 2>(1);
  const [coveragePct, setCoveragePct] = useState<number>(30); // نسبة التغطية على المساحة المطبوعة
  const [inkLaydownGsm, setInkLaydownGsm] = useState<number>(1.2); // جرام/م² (حسب الأنيـلوكس/الحبر)
  const [qty, setQty] = useState<number>(10000);

  useEffect(() => { if (sharedDims) { setWidthCm(sharedDims.widthCm); setLengthCm(sharedDims.lengthCm); } }, [sharedDims]);

  const result = useMemo(() => {
    // مساحة الكيس (م²) لكل وجه
    const area_m2 = (toNumber(widthCm) / 100) * (toNumber(lengthCm) / 100);
    // مساحة مطبوعة فعليًا = area * coverage * sides
    const printed_m2_per_bag = area_m2 * (toNumber(coveragePct) / 100) * toNumber(printSides);
    const total_printed_m2 = printed_m2_per_bag * toNumber(qty);
    const ink_grams = total_printed_m2 * toNumber(inkLaydownGsm);
    const ink_kg = ink_grams / 1000;
    return { printed_m2_per_bag, total_printed_m2, ink_kg } as const;
  }, [widthCm, lengthCm, printSides, coveragePct, inkLaydownGsm, qty]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="العرض (سم)" value={widthCm} onChange={setWidthCm} step={0.1} />
          <LabeledNumber label="الطول (سم)" value={lengthCm} onChange={setLengthCm} step={0.1} />
        </div>
        <LabeledSelect label="عدد الأوجه المطبوعة" value={String(printSides)} onChange={(v) => setPrintSides(Number(v) === 2 ? 2 : 1)} options={[{ value: "1", label: "وجه واحد" }, { value: "2", label: "وجهان" }]} />
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="نسبة التغطية %" value={coveragePct} onChange={setCoveragePct} step={1} />
          <LabeledNumber label="بدل الحبر (g/m²)" value={inkLaydownGsm} onChange={setInkLaydownGsm} step={0.1} />
        </div>
        <LabeledNumber label="الكمية (حبة)" value={qty} onChange={setQty} step={500} />
        <p className="text-[11px] text-gray-500">قيم g/m² تقريبية وتختلف حسب الأنيـلوكس، نوع الحبر، والسطح.</p>
      </div>
      <div className="grid gap-3 bg-gray-50 rounded-xl p-4">
        <Metric label="مساحة مطبوعة/حبة (م²)" value={fmtFixed(result.printed_m2_per_bag, 4)} />
        <Metric label="المساحة المطبوعة الكلّية (م²)" value={fmtFixed(result.total_printed_m2, 2)} />
        <Metric label="كمية الحبر (كجم)" value={fmtFixed(result.ink_kg, 2)} emphasis />
      </div>
    </div>
  );
}

// ===================== 5) تكلفة طلبية — سريع (موجود أعلاه) =====================
interface OrderCostCalculatorProps { sharedBagWeightG?: number; }
function OrderCostCalculator({ sharedBagWeightG = 0 }: OrderCostCalculatorProps): JSX.Element {
  const [qty, setQty] = useState<number>(10000);
  const [bagWeightG, setBagWeightG] = useState<number>(sharedBagWeightG || 5);
  const [useShared, setUseShared] = useState<boolean>(Boolean(sharedBagWeightG));
  const [materialPricePerKg, setMaterialPricePerKg] = useState<number>(7.0);
  const [wastePct, setWastePct] = useState<number>(4);
  const [extrusionCostPerKg, setExtrusionCostPerKg] = useState<number>(1.0);
  const [cuttingCostPer1000, setCuttingCostPer1000] = useState<number>(6.0);
  const [colors, setColors] = useState<number>(0);
  const [printCostPerColorPer1000, setPrintCostPerColorPer1000] = useState<number>(5.0);
  const [plateCost, setPlateCost] = useState<number>(0);
  const [overheadFixed, setOverheadFixed] = useState<number>(0);
  const [marginPct, setMarginPct] = useState<number>(10);
  useEffect(() => { if (useShared) setBagWeightG(sharedBagWeightG || 0); }, [sharedBagWeightG, useShared]);
  const result = useMemo(() => {
    const weightPerBagG = toNumber(bagWeightG);
    const totalWeightKg = (toNumber(qty) * weightPerBagG) / 1_000_000; // g → kg
    const materialKg = totalWeightKg * (1 + toNumber(wastePct) / 100);
    const materialCost = materialKg * toNumber(materialPricePerKg);
    const extrusionCost = materialKg * toNumber(extrusionCostPerKg);
    const cuttingCost = (toNumber(qty) / 1000) * toNumber(cuttingCostPer1000);
    const printingCost = (toNumber(qty) / 1000) * toNumber(colors) * toNumber(printCostPerColorPer1000);
    const subtotal = materialCost + extrusionCost + cuttingCost + printingCost + toNumber(plateCost) + toNumber(overheadFixed);
    const margin = subtotal * (toNumber(marginPct) / 100);
    const total = subtotal + margin;
    return { totalWeightKg, materialKg, materialCost, extrusionCost, cuttingCost, printingCost, subtotal, margin, total, unitPrice: total / Math.max(1, toNumber(qty)), pricePerKg: total / Math.max(0.000001, materialKg) } as const;
  }, [qty, bagWeightG, wastePct, materialPricePerKg, extrusionCostPerKg, cuttingCostPer1000, colors, printCostPerColorPer1000, plateCost, overheadFixed, marginPct]);
  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="grid gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="accent-black" checked={useShared} onChange={(e) => setUseShared(e.target.checked)} />
          استخدم وزن الكيس من التبويب الأول ({fmtFixed(sharedBagWeightG, 3)} جم)
        </label>
        {!useShared && (<LabeledNumber label="وزن الكيس (جم)" value={bagWeightG} onChange={setBagWeightG} step={0.01} />)}
        <LabeledNumber label="الكمية (حبة)" value={qty} onChange={setQty} step={500} />
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="سعر المادة (ر.س/كجم)" value={materialPricePerKg} onChange={setMaterialPricePerKg} step={0.1} />
          <LabeledNumber label="هالك %" value={wastePct} onChange={setWastePct} step={0.5} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="تكلفة الاكسترودر (ر.س/كجم)" value={extrusionCostPerKg} onChange={setExtrusionCostPerKg} step={0.1} />
          <LabeledNumber label="تكلفة التقطيع (ر.س/1000)" value={cuttingCostPer1000} onChange={setCuttingCostPer1000} step={0.1} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <LabeledNumber label="عدد الألوان" value={colors} onChange={setColors} step={1} />
          <LabeledNumber label="طباعة (ر.س/لون/1000)" value={printCostPerColorPer1000} onChange={setPrintCostPerColorPer1000} step={0.1} />
          <LabeledNumber label="تكلفة الكليشة/الربلات (ر.س)" value={plateCost} onChange={setPlateCost} step={1} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="مصروفات ثابتة (ر.س)" value={overheadFixed} onChange={setOverheadFixed} step={1} />
          <LabeledNumber label="هامش الربح %" value={marginPct} onChange={setMarginPct} step={0.5} />
        </div>
      </div>
      <div className="grid gap-3 bg-gray-50 rounded-xl p-4">
        <h4 className="font-semibold">النتائج</h4>
        <Metric label="الوزن الإجمالي (كجم)" value={fmtFixed(result.totalWeightKg, 3)} />
        <Metric label="وزن المادة بعد الهالك (كجم)" value={fmtFixed(result.materialKg, 3)} />
        <Divider />
        <Metric label="تكلفة المادة" value={fmtSar(result.materialCost)} />
        <Metric label="تكلفة الاكسترودر" value={fmtSar(result.extrusionCost)} />
        <Metric label="تكلفة التقطيع" value={fmtSar(result.cuttingCost)} />
        <Metric label="تكلفة الطباعة" value={fmtSar(result.printingCost)} />
        <Divider />
        <Metric label="الإجمالي قبل الربح" value={fmtSar(result.subtotal)} />
        <Metric label="الربح" value={fmtSar(result.margin)} />
        <Metric label="الإجمالي مع الربح" value={fmtSar(result.total)} emphasis />
        <Divider />
        <Metric label="سعر الحبة" value={fmtSar(result.unitPrice)} />
        <Metric label="سعر للكيلو" value={fmtSar(result.pricePerKg)} />
      </div>
    </div>
  );
}

// ===================== 6) تكلفة طلبية — متقدم (BOM) =====================
interface BomItem { name: string; pct: number; pricePerKg: number; }
interface OtherCost { name: string; type: "perKg" | "per1000" | "fixed"; value: number; }

function OrderCostAdvanced({ sharedBagWeightG = 0 }: { sharedBagWeightG?: number }): JSX.Element {
  const [qty, setQty] = useState<number>(10000);
  const [bagWeightG, setBagWeightG] = useState<number>(sharedBagWeightG || 5);
  const [useShared, setUseShared] = useState<boolean>(Boolean(sharedBagWeightG));

  // مكونات الخلطة (BOM)
  const [bom, setBom] = useState<BomItem[]>([
    { name: "HDPE Base", pct: 90, pricePerKg: 7.0 },
    { name: "Masterbatch", pct: 8, pricePerKg: 12.0 },
    { name: "Additive", pct: 2, pricePerKg: 18.0 },
  ]);

  // تكاليف أخرى متنوعة
  const [otherCosts, setOtherCosts] = useState<OtherCost[]>([
    { name: "Extrusion Energy", type: "perKg", value: 0.4 },
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
    const totalWeightKg = (toNumber(qty) * weightPerBagG) / 1_000_000; // g → kg
    const materialKg = totalWeightKg * (1 + toNumber(wastePct) / 100);

    // تكلفة المادة من الخلطة
    const materialCost = materialKg * blend.pricePerKg;

    // تكاليف أخرى
    const others = otherCosts.reduce(
      (acc, c) => {
        if (c.type === "perKg") acc.sum += materialKg * toNumber(c.value);
        else if (c.type === "per1000") acc.sum += (toNumber(qty) / 1000) * toNumber(c.value);
        else acc.sum += toNumber(c.value);
        return acc;
      },
      { sum: 0 }
    ).sum;

    // طباعة
    const printingCost = (toNumber(qty) / 1000) * toNumber(colors) * toNumber(printCostPerColorPer1000);

    const subtotal = materialCost + others + printingCost;
    const margin = subtotal * (toNumber(marginPct) / 100);
    const total = subtotal + margin;

    return {
      materialKg,
      blendPrice: blend.pricePerKg,
      materialCost,
      otherCosts: others,
      printingCost,
      subtotal,
      margin,
      total,
      unitPrice: total / Math.max(1, toNumber(qty)),
      pricePerKg: total / Math.max(0.000001, materialKg),
    } as const;
  }, [qty, bagWeightG, wastePct, blend.pricePerKg, otherCosts, colors, printCostPerColorPer1000, marginPct]);

  return (
    <div className="grid gap-6">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="grid gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="accent-black" checked={useShared} onChange={(e) => setUseShared(e.target.checked)} />
            استخدم وزن الحقيبة من التبويب الأول ({fmtFixed(sharedBagWeightG, 3)} جم)
          </label>
          {!useShared && <LabeledNumber label="وزن الحقيبة (جم)" value={bagWeightG} onChange={setBagWeightG} step={0.01} />}
          <LabeledNumber label="الكمية (حبة)" value={qty} onChange={setQty} step={500} />
          <LabeledNumber label="هالك %" value={wastePct} onChange={setWastePct} step={0.5} />
          <Divider />
          <h4 className="font-semibold">مكونات الخلطة (BOM)</h4>
          <BomTable rows={bom} setRows={setBom} />
          <p className="text-[11px] text-gray-500">يجب أن يكون مجموع النِّسَب تقريبيًا 100%، وسيتم التطبيع تلقائيًا للحساب.</p>
        </div>
        <div className="grid gap-3">
          <h4 className="font-semibold">تكاليف أخرى</h4>
          <OtherCostsTable rows={otherCosts} setRows={setOtherCosts} />
          <div className="grid grid-cols-3 gap-3">
            <LabeledNumber label="عدد الألوان" value={colors} onChange={setColors} step={1} />
            <LabeledNumber label="طباعة (ر.س/لون/1000)" value={printCostPerColorPer1000} onChange={setPrintCostPerColorPer1000} step={0.1} />
            <LabeledNumber label="هامش الربح %" value={marginPct} onChange={setMarginPct} step={0.5} />
          </div>
        </div>
      </div>

      <div className="grid gap-3 bg-gray-50 rounded-xl p-4">
        <h4 className="font-semibold">نتائج التكلفة</h4>
        <Metric label="سعر الخلطة (ر.س/كجم)" value={fmtSar(result.blendPrice)} />
        <Metric label="وزن المادة بعد الهالك (كجم)" value={fmtFixed(result.materialKg, 3)} />
        <Divider />
        <Metric label="تكلفة المادة" value={fmtSar(result.materialCost)} />
        <Metric label="تكاليف أخرى" value={fmtSar(result.otherCosts)} />
        <Metric label="تكلفة الطباعة" value={fmtSar(result.printingCost)} />
        <Divider />
        <Metric label="الإجمالي قبل الربح" value={fmtSar(result.subtotal)} />
        <Metric label="الربح" value={fmtSar(result.margin)} />
        <Metric label="الإجمالي مع الربح" value={fmtSar(result.total)} emphasis />
        <Divider />
        <Metric label="سعر الحبة" value={fmtSar(result.unitPrice)} />
        <Metric label="سعر للكيلو" value={fmtSar(result.pricePerKg)} />
      </div>
    </div>
  );
}

function BomTable({ rows, setRows }: { rows: BomItem[]; setRows: (r: BomItem[]) => void }): JSX.Element {
  function updateRow(idx: number, patch: Partial<BomItem>) {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function addRow() { setRows([...rows, { name: "New", pct: 0, pricePerKg: 0 }]); }
  function delRow(idx: number) { setRows(rows.filter((_, i) => i !== idx)); }
  return (
    <div className="grid gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <input className="col-span-5 border rounded-lg px-3 py-2" value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
          <input type="number" className="col-span-2 border rounded-lg px-3 py-2" value={r.pct} step={0.1} onChange={(e) => updateRow(i, { pct: Number(e.target.value) })} placeholder="%" />
          <input type="number" className="col-span-3 border rounded-lg px-3 py-2" value={r.pricePerKg} step={0.1} onChange={(e) => updateRow(i, { pricePerKg: Number(e.target.value) })} placeholder="ر.س/كجم" />
          <button className="col-span-2 text-xs px-2 py-2 rounded border hover:bg-gray-50" onClick={() => delRow(i)}>حذف</button>
        </div>
      ))}
      <button className="text-xs px-2 py-2 rounded border hover:bg-gray-50 w-fit" onClick={addRow}>+ إضافة مكوّن</button>
    </div>
  );
}

function OtherCostsTable({ rows, setRows }: { rows: OtherCost[]; setRows: (r: OtherCost[]) => void }): JSX.Element {
  function updateRow(idx: number, patch: Partial<OtherCost>) { setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))); }
  function addRow() { setRows([...rows, { name: "New Cost", type: "fixed", value: 0 }]); }
  function delRow(idx: number) { setRows(rows.filter((_, i) => i !== idx)); }
  return (
    <div className="grid gap-2">
      {rows.map((r, i) => (
        <div key={i} className="grid grid-cols-12 gap-2 items-end">
          <input className="col-span-5 border rounded-lg px-3 py-2" value={r.name} onChange={(e) => updateRow(i, { name: e.target.value })} />
          <select className="col-span-3 border rounded-lg px-3 py-2 bg-white" value={r.type} onChange={(e) => updateRow(i, { type: e.target.value as OtherCost["type"] })}>
            <option value="perKg">ر.س/كجم</option>
            <option value="per1000">ر.س/1000 حبة</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
          <input type="number" className="col-span-2 border rounded-lg px-3 py-2" value={r.value} step={0.1} onChange={(e) => updateRow(i, { value: Number(e.target.value) })} />
          <button className="col-span-2 text-xs px-2 py-2 rounded border hover:bg-gray-50" onClick={() => delRow(i)}>حذف</button>
        </div>
      ))}
      <button className="text-xs px-2 py-2 rounded border hover:bg-gray-50 w-fit" onClick={addRow}>+ إضافة تكلفة</button>
    </div>
  );
}

// ===================== 7) وزن/طول الرول (كما هو مع تحسينات طفيفة) =====================
function RollTools(): JSX.Element {
  const [rollWeightKg, setRollWeightKg] = useState<number>(25);
  const [coreWeightKg, setCoreWeightKg] = useState<number>(0.4);
  const [rollWidthCm, setRollWidthCm] = useState<number>(60);
  const [rollThicknessMicron, setRollThicknessMicron] = useState<number>(18);
  const [rollDensity, setRollDensity] = useState<number>(0.95);
  const netRollWeightG = Math.max(0, toNumber(rollWeightKg) - toNumber(coreWeightKg)) * 1000;
  const thicknessCm = toNumber(rollThicknessMicron) * 1e-4;
  const lengthM = useMemo(() => {
    const denom = toNumber(rollWidthCm) * thicknessCm * toNumber(rollDensity) * 100; // سم → متر
    if (denom <= 0) return 0; return netRollWeightG / denom;
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
      <div className="grid gap-3">
        <h4 className="font-semibold">من وزن الرول → الطول التقريبي</h4>
        <LabeledNumber label="وزن الرول (كجم)" value={rollWeightKg} onChange={setRollWeightKg} step={0.1} />
        <LabeledNumber label="وزن الكرتون/اللب (كجم)" value={coreWeightKg} onChange={setCoreWeightKg} step={0.01} />
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="العرض (سم)" value={rollWidthCm} onChange={setRollWidthCm} step={0.1} />
          <LabeledNumber label="السماكة (ميكرون)" value={rollThicknessMicron} onChange={setRollThicknessMicron} step={0.1} />
        </div>
        <LabeledNumber label="الكثافة g/cm³" value={rollDensity} onChange={setRollDensity} step={0.01} />
        <Divider />
        <Metric label="الطول التقريبي (متر)" value={fmtFixed(lengthM, 1)} emphasis />
      </div>
      <div className="grid gap-3">
        <h4 className="font-semibold">من الطول المطلوب → وزن الرول المطلوب</h4>
        <LabeledNumber label="الطول المطلوب (متر)" value={targetLengthM} onChange={setTargetLengthM} step={1} />
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="العرض (سم)" value={tWidthCm} onChange={setTWidthCm} step={0.1} />
          <LabeledNumber label="السماكة (ميكرون)" value={tThicknessMicron} onChange={setTThicknessMicron} step={0.1} />
        </div>
        <LabeledNumber label="الكثافة g/cm³" value={tDensity} onChange={setTDensity} step={0.01} />
        <Divider />
        <Metric label="الوزن التقريبي المطلوب (كجم)" value={fmtFixed(neededWeightKg, 2)} emphasis />
      </div>
    </div>
  );
}

// ===================== 8) تحويل السماكة =====================
function ThicknessConverter(): JSX.Element {
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
    <div className="grid md:grid-cols-3 gap-4">
      <div className="grid gap-2">
        <h4 className="font-semibold">من ميكرون</h4>
        <LabeledNumber label="ميكرون" value={micron} onChange={setMicron} step={0.1} />
        <Metric label="مم" value={fmtFixed(mm, 3)} />
        <Metric label="قيج (تقريبي)" value={fmtFixed(gauge, 1)} />
      </div>
      <div className="grid gap-2">
        <h4 className="font-semibold">من مم</h4>
        <LabeledNumber label="مم" value={mmIn} onChange={setMmIn} step={0.001} />
        <Metric label="ميكرون" value={fmtFixed(micronFromMm, 1)} />
        <Metric label="قيج (تقريبي)" value={fmtFixed(gaugeFromMm, 1)} />
      </div>
      <div className="grid gap-2">
        <h4 className="font-semibold">من قيج</h4>
        <LabeledNumber label="قيج" value={gaugeIn} onChange={setGaugeIn} step={1} />
        <Metric label="ميكرون" value={fmtFixed(micronFromGauge, 1)} />
        <Metric label="مم" value={fmtFixed(mmFromGauge, 3)} />
      </div>
    </div>
  );
}

// ===================== 9) زمن وتشغيل العملية =====================
function JobTimePlanner(): JSX.Element {
  // معطيات عامة
  const [qty, setQty] = useState<number>(10000);
  const [bagWeightG, setBagWeightG] = useState<number>(5);

  // سرعات تقديرية
  const [extrusionKgPerHr, setExtrusionKgPerHr] = useState<number>(35); // كجم/ساعة لكل خط
  const [cutBagsPerMin, setCutBagsPerMin] = useState<number>(120); // حبة/دقيقة
  const [printMPerMin, setPrintMPerMin] = useState<number>(60); // متر/دقيقة

  // أطوال إضافية للتقدير
  const [bagLengthCm, setBagLengthCm] = useState<number>(40);

  // إعدادات وتغييرات
  const [setupExtruderHr, setSetupExtruderHr] = useState<number>(0.5);
  const [setupCutterHr, setSetupCutterHr] = useState<number>(0.3);
  const [setupPrinterHr, setSetupPrinterHr] = useState<number>(0.7);
  const [colors, setColors] = useState<number>(0);
  const [changeoverPerColorMin, setChangeoverPerColorMin] = useState<number>(8);

  const result = useMemo(() => {
    const totalKg = (toNumber(qty) * toNumber(bagWeightG)) / 1000 / 1000; // كجم

    // بثق
    const extrusionHours = totalKg / Math.max(1e-6, toNumber(extrusionKgPerHr)) + toNumber(setupExtruderHr);

    // طباعة: تقريب الطول الكلي (متر)
    const totalMeters = (toNumber(qty) * (toNumber(bagLengthCm) / 100));
    const printCore = totalMeters / Math.max(1e-6, toNumber(printMPerMin)) / 60; // ساعات
    const printChangeovers = (toNumber(colors) > 0 ? (toNumber(colors) - 1) * (toNumber(changeoverPerColorMin) / 60) : 0);
    const printHours = printCore + printChangeovers + toNumber(setupPrinterHr);

    // تقطيع
    const cutCore = (toNumber(qty) / Math.max(1e-6, toNumber(cutBagsPerMin))) / 60; // ساعات
    const cutHours = cutCore + toNumber(setupCutterHr);

    const totalHours = extrusionHours + printHours + cutHours;

    return { totalKg, extrusionHours, printHours, cutHours, totalHours } as const;
  }, [qty, bagWeightG, extrusionKgPerHr, cutBagsPerMin, printMPerMin, bagLengthCm, setupExtruderHr, setupCutterHr, setupPrinterHr, colors, changeoverPerColorMin]);

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="grid gap-3">
        <LabeledNumber label="الكمية (حبة)" value={qty} onChange={setQty} step={500} />
        <LabeledNumber label="وزن الحبة (جم)" value={bagWeightG} onChange={setBagWeightG} step={0.01} />
        <Divider />
        <LabeledNumber label="سرعة البثق (كجم/ساعة)" value={extrusionKgPerHr} onChange={setExtrusionKgPerHr} step={1} />
        <LabeledNumber label="سرعة التقطيع (حبة/دقيقة)" value={cutBagsPerMin} onChange={setCutBagsPerMin} step={1} />
        <LabeledNumber label="سرعة الطباعة (م/دقيقة)" value={printMPerMin} onChange={setPrintMPerMin} step={1} />
        <LabeledNumber label="طول الحبة (سم)" value={bagLengthCm} onChange={setBagLengthCm} step={0.1} />
        <Divider />
        <LabeledNumber label="إعداد البثق (ساعة)" value={setupExtruderHr} onChange={setSetupExtruderHr} step={0.1} />
        <LabeledNumber label="إعداد التقطيع (ساعة)" value={setupCutterHr} onChange={setSetupCutterHr} step={0.1} />
        <LabeledNumber label="إعداد الطباعة (ساعة)" value={setupPrinterHr} onChange={setSetupPrinterHr} step={0.1} />
        <div className="grid grid-cols-2 gap-3">
          <LabeledNumber label="عدد الألوان" value={colors} onChange={setColors} step={1} />
          <LabeledNumber label="زمن تغيير/لون (دقيقة)" value={changeoverPerColorMin} onChange={setChangeoverPerColorMin} step={1} />
        </div>
      </div>

      <div className="grid gap-3 bg-gray-50 rounded-xl p-4">
        <Metric label="إجمالي وزن المادة (كجم)" value={fmtFixed(result.totalKg, 3)} />
        <Metric label="ساعات البثق" value={fmtFixed(result.extrusionHours, 2)} />
        <Metric label="ساعات الطباعة" value={fmtFixed(result.printHours, 2)} />
        <Metric label="ساعات التقطيع" value={fmtFixed(result.cutHours, 2)} />
        <Divider />
        <Metric label="إجمالي ساعات التشغيل" value={fmtFixed(result.totalHours, 2)} emphasis />
      </div>
    </div>
  );
}

// ===================== عناصر واجهة عامة =====================
interface LabeledNumberProps { label: string; value: number; onChange: (v: number) => void; step?: number; title?: string; }
function LabeledNumber({ label, value, onChange, step = 0.1, title }: LabeledNumberProps): JSX.Element {
  return (
    <label className="grid gap-1 text-sm" title={title}>
      <span className="text-gray-700">{label}</span>
      <input type="number" className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10" value={Number.isFinite(value) ? value : 0} step={step} onChange={(e) => onChange(toNumber(e.target.value))} />
    </label>
  );
}

interface LabeledTextProps { label: string; value: string; onChange: (v: string) => void; placeholder?: string; }
function LabeledText({ label, value, onChange, placeholder }: LabeledTextProps): JSX.Element {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-700">{label}</span>
      <input type="text" className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

interface LabeledSelectProps { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; hint?: string; }
function LabeledSelect({ label, value, onChange, options, hint }: LabeledSelectProps): JSX.Element {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-gray-700">{label}</span>
      <select className="border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-black/10" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
      </select>
      {hint && <span className="text-[11px] text-gray-500">{hint}</span>}
    </label>
  );
}

function Divider(): JSX.Element { return <div className="h-px bg-gray-200 my-1" />; }

function Metric({ label, value, hint, emphasis = false }: { label: string; value: string | number; hint?: string; emphasis?: boolean; }): JSX.Element {
  return (
    <div>
      <div className="text-gray-600 text-xs">{label}</div>
      <div className={`text-lg ${emphasis ? "font-bold" : "font-medium"}`}>{String(value)}</div>
      {hint && <div className="text-[11px] text-gray-400">{hint}</div>}
    </div>
  );
}

// ===================== دوال الألوان =====================
interface RGB { r: number; g: number; b: number }
interface CMYK { c: number; m: number; y: number; k: number }
function cmykToRgb(C: number, M: number, Y: number, K: number): RGB {
  const c = clamp01(C / 100), m = clamp01(M / 100), y = clamp01(Y / 100), k = clamp01(K / 100);
  const r = Math.round(255 * (1 - c) * (1 - k));
  const g = Math.round(255 * (1 - m) * (1 - k));
  const b = Math.round(255 * (1 - y) * (1 - k));
  return { r, g, b };
}
function rgbToCmyk(R: number, G: number, B: number): CMYK {
  const r = clamp01(R / 255), g = clamp01(G / 255), b = clamp01(B / 255);
  const k = 1 - Math.max(r, g, b);
  const c = k === 0 ? 0 : (1 - r - k) / (1 - k);
  const m = k === 0 ? 0 : (1 - g - k) / (1 - k);
  const y = k === 0 ? 0 : (1 - b - k) / (1 - k);
  return { c: Math.round(c * 100), m: Math.round(m * 100), y: Math.round(y * 100), k: Math.round(k * 100) };
}
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => clamp255(Math.round(n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function hexToRgb(hex: string): RGB {
  const h = normalizeHex(hex).slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return { r, g, b };
}
function normalizeHex(v: string): string {
  let x = v.trim();
  if (!x.startsWith("#")) x = `#${x}`;
  if (x.length === 4) { // #RGB → #RRGGBB
    x = `#${x[1]}${x[1]}${x[2]}${x[2]}${x[3]}${x[3]}`;
  }
  if (x.length !== 7) return "#000000";
  return x.toUpperCase();
}

// ===================== دوال عامة =====================
function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function clamp255(x: number): number { return Math.max(0, Math.min(255, x)); }
function toNumber(x: unknown): number { const n = typeof x === "number" ? x : Number(x); return Number.isFinite(n) ? n : 0; }
function fmtSar(v: number): string { if (!Number.isFinite(v)) return "-"; return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(v); }
function fmtFixed(v: number, d = 2): string { if (!Number.isFinite(v)) return "-"; return Number(v.toFixed(d)).toString(); }
function round(v: number, d = 2): number { return Number(v.toFixed(d)); }
