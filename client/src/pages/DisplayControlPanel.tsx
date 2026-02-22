import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  Plus,
  Trash2,
  Edit,
  Monitor,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Package,
  Factory,
  Megaphone,
  BookOpen,
  Bell,
  ExternalLink,
  Eye,
  GripVertical,
  Clock,
  Table2,
  ImageIcon,
  Users,
  Trophy,
  Upload,
  Loader2,
} from "lucide-react";

interface SlideData {
  id: number;
  title: string;
  slide_type: string;
  content: any;
  duration_seconds: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

function useSlideTypes() {
  const { t } = useTranslation();
  return [
    { value: "production_stats", label: t('display.types.production_stats'), icon: BarChart3, description: t('display.types.production_statsDesc') },
    { value: "recent_production", label: t('display.types.recent_production'), icon: Package, description: t('display.types.recent_productionDesc') },
    { value: "latest_rolls", label: t('display.types.latest_rolls'), icon: Factory, description: t('display.types.latest_rollsDesc') },
    { value: "announcement", label: t('display.types.announcement'), icon: Megaphone, description: t('display.types.announcementDesc') },
    { value: "instructions", label: t('display.types.instructions'), icon: BookOpen, description: t('display.types.instructionsDesc') },
    { value: "notification", label: t('display.types.notification'), icon: Bell, description: t('display.types.notificationDesc') },
    { value: "custom_table", label: t('display.types.custom_table'), icon: Table2, description: t('display.types.custom_tableDesc') },
    { value: "image", label: t('display.types.image'), icon: ImageIcon, description: t('display.types.imageDesc') },
    { value: "attendance", label: t('display.types.attendance'), icon: Users, description: t('display.types.attendanceDesc') },
    { value: "top_producers", label: t('display.types.top_producers'), icon: Trophy, description: t('display.types.top_producersDesc') },
  ];
}

function useColors() {
  const { t } = useTranslation();
  return [
    { value: "blue", label: t('display.colors.blue'), class: "bg-blue-500" },
    { value: "red", label: t('display.colors.red'), class: "bg-red-500" },
    { value: "green", label: t('display.colors.green'), class: "bg-green-500" },
    { value: "yellow", label: t('display.colors.yellow'), class: "bg-yellow-500" },
    { value: "purple", label: t('display.colors.purple'), class: "bg-purple-500" },
  ];
}

function useIcons() {
  const { t } = useTranslation();
  return [
    { value: "announcement", label: t('display.icons.announcement') },
    { value: "warning", label: t('display.icons.warning') },
    { value: "info", label: t('display.icons.info') },
    { value: "notification", label: t('display.icons.notification') },
  ];
}

function SlideForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: SlideData;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const SLIDE_TYPES = useSlideTypes();
  const COLORS = useColors();
  const ICONS = useIcons();

  const [title, setTitle] = useState(initialData?.title || "");
  const [slideType, setSlideType] = useState(initialData?.slide_type || "");
  const [durationSeconds, setDurationSeconds] = useState(initialData?.duration_seconds || 10);
  const [contentTitle, setContentTitle] = useState(initialData?.content?.title || "");
  const [contentMessage, setContentMessage] = useState(initialData?.content?.message || "");
  const [contentFooter, setContentFooter] = useState(initialData?.content?.footer || "");
  const [contentColor, setContentColor] = useState(initialData?.content?.color || "blue");
  const [contentIcon, setContentIcon] = useState(initialData?.content?.icon || "announcement");
  const [instructionItems, setInstructionItems] = useState<string[]>(initialData?.content?.items || [""]);

  const [tableName, setTableName] = useState(initialData?.content?.tableName || "");
  const [tableColumns, setTableColumns] = useState<string[]>(initialData?.content?.columns || [""]);
  const [tableRows, setTableRows] = useState<string[][]>(initialData?.content?.rows || [[""]]);
  const [headerColor, setHeaderColor] = useState(initialData?.content?.headerColor || "blue");

  const [imageUrl, setImageUrl] = useState(initialData?.content?.url || "");
  const [imageCaption, setImageCaption] = useState(initialData?.content?.caption || "");
  const [imageFit, setImageFit] = useState<"contain" | "cover">(initialData?.content?.fit || "contain");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [topPeriod, setTopPeriod] = useState(initialData?.content?.period || "today");
  const [topStage, setTopStage] = useState(initialData?.content?.stage || "all");

  const handleSubmit = () => {
    if (!title || !slideType) return;
    let content: any = null;
    if (slideType === "announcement" || slideType === "notification") {
      content = { title: contentTitle, message: contentMessage, footer: contentFooter, color: contentColor, icon: contentIcon };
    } else if (slideType === "instructions") {
      content = { items: instructionItems.filter(i => i.trim()) };
    } else if (slideType === "custom_table") {
      content = { tableName, headerColor, columns: tableColumns.filter(c => c.trim()), rows: tableRows };
    } else if (slideType === "image") {
      content = { url: imageUrl, caption: imageCaption || undefined, fit: imageFit };
    } else if (slideType === "top_producers") {
      content = { period: topPeriod, stage: topStage };
    }
    onSubmit({ title, slide_type: slideType, duration_seconds: durationSeconds, content });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/display/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setImageUrl(data.url);
      }
    } catch {
    } finally {
      setUploading(false);
    }
  };

  const addTableColumn = () => {
    setTableColumns([...tableColumns, ""]);
    setTableRows(tableRows.map(row => [...row, ""]));
  };

  const removeTableColumn = (idx: number) => {
    if (tableColumns.length <= 1) return;
    setTableColumns(tableColumns.filter((_, i) => i !== idx));
    setTableRows(tableRows.map(row => row.filter((_, i) => i !== idx)));
  };

  const addTableRow = () => {
    setTableRows([...tableRows, new Array(tableColumns.length).fill("")]);
  };

  const removeTableRow = (idx: number) => {
    if (tableRows.length <= 1) return;
    setTableRows(tableRows.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('display.slideTitle')}</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>{t('display.duration')}</Label>
          <Input type="number" min={3} max={120} value={durationSeconds} onChange={e => setDurationSeconds(Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('display.slideType')}</Label>
        <div className="grid grid-cols-2 gap-3">
          {SLIDE_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setSlideType(type.value)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-right ${
                  slideType === type.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${slideType === type.value ? "text-blue-600" : "text-gray-400"}`} />
                <div>
                  <div className="font-bold text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {(slideType === "announcement" || slideType === "notification") && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">{t('display.announcement_form.content')}</h4>
          <div className="space-y-2">
            <Label>{t('display.announcement_form.mainTitle')}</Label>
            <Input value={contentTitle} onChange={e => setContentTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t('display.announcement_form.messageText')}</Label>
            <Textarea
              value={contentMessage}
              onChange={e => setContentMessage(e.target.value)}
              placeholder={t('display.announcement_form.writeMessage')}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('display.announcement_form.footer')}</Label>
            <Input value={contentFooter} onChange={e => setContentFooter(e.target.value)} placeholder={t('display.announcement_form.footerExample')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('display.announcement_form.bgColor')}</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setContentColor(c.value)}
                    className={`w-10 h-10 rounded-lg ${c.class} transition-all ${contentColor === c.value ? "ring-4 ring-offset-2 ring-blue-400 scale-110" : "opacity-60 hover:opacity-100"}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('display.announcement_form.icon')}</Label>
              <Select value={contentIcon} onValueChange={setContentIcon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICONS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {slideType === "instructions" && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">{t('display.instructions_form.title')}</h4>
          {instructionItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                {i + 1}
              </span>
              <Input
                value={item}
                onChange={e => {
                  const newItems = [...instructionItems];
                  newItems[i] = e.target.value;
                  setInstructionItems(newItems);
                }}
                placeholder={`${t('display.instructions_form.itemPlaceholder')} ${i + 1}`}
              />
              {instructionItems.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setInstructionItems(instructionItems.filter((_, idx) => idx !== i))}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setInstructionItems([...instructionItems, ""])}>
            <Plus className="w-4 h-4 ml-2" />
            {t('display.instructions_form.addItem')}
          </Button>
        </div>
      )}

      {slideType === "custom_table" && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">{t('display.table_form.title')}</h4>
          <div className="space-y-2">
            <Label>{t('display.table_form.tableName')}</Label>
            <Input value={tableName} onChange={e => setTableName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('display.table_form.columns')}</Label>
            {tableColumns.map((col, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  value={col}
                  onChange={e => {
                    const newCols = [...tableColumns];
                    newCols[i] = e.target.value;
                    setTableColumns(newCols);
                  }}
                  placeholder={`${t('display.table_form.columnName')} ${i + 1}`}
                />
                {tableColumns.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeTableColumn(i)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addTableColumn}>
              <Plus className="w-4 h-4 ml-2" />
              {t('display.table_form.addColumn')}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t('display.table_form.rows')}</Label>
            {tableRows.map((row, ri) => (
              <div key={ri} className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                  {ri + 1}
                </span>
                {row.map((cell, ci) => (
                  <Input
                    key={ci}
                    value={cell}
                    onChange={e => {
                      const newRows = tableRows.map(r => [...r]);
                      newRows[ri][ci] = e.target.value;
                      setTableRows(newRows);
                    }}
                    placeholder={tableColumns[ci] || `${ci + 1}`}
                    className="flex-1"
                  />
                ))}
                {tableRows.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => removeTableRow(ri)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addTableRow}>
              <Plus className="w-4 h-4 ml-2" />
              {t('display.table_form.addRow')}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>{t('display.table_form.headerColor')}</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setHeaderColor(c.value)}
                  className={`w-10 h-10 rounded-lg ${c.class} transition-all ${headerColor === c.value ? "ring-4 ring-offset-2 ring-blue-400 scale-110" : "opacity-60 hover:opacity-100"}`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {slideType === "image" && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">{t('display.image_form.title')}</h4>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                  {t('display.image_form.uploading')}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 ml-2" />
                  {t('display.image_form.upload')}
                </>
              )}
            </Button>
          </div>

          {imageUrl && (
            <div className="space-y-2">
              <img src={imageUrl} alt="preview" className="max-h-48 rounded-lg border object-contain" />
              <div className="text-xs text-gray-500 truncate">{imageUrl}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('display.image_form.caption')}</Label>
            <Input value={imageCaption} onChange={e => setImageCaption(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>{t('display.image_form.fit')}</Label>
            <Select value={imageFit} onValueChange={(v: "contain" | "cover") => setImageFit(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="contain">{t('display.image_form.contain')}</SelectItem>
                <SelectItem value="cover">{t('display.image_form.cover')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {slideType === "attendance" && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">{t('display.attendance_slide.title')}</h4>
          <p className="text-sm text-gray-500">{t('display.types.attendanceDesc')}</p>
        </div>
      )}

      {slideType === "top_producers" && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">{t('display.top_producers_slide.title')}</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('display.top_producers_slide.period')}</Label>
              <Select value={topPeriod} onValueChange={setTopPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t('display.top_producers_slide.today')}</SelectItem>
                  <SelectItem value="week">{t('display.top_producers_slide.week')}</SelectItem>
                  <SelectItem value="month">{t('display.top_producers_slide.month')}</SelectItem>
                  <SelectItem value="all">{t('display.top_producers_slide.allTime')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('display.top_producers_slide.section')}</Label>
              <Select value={topStage} onValueChange={setTopStage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('display.top_producers_slide.allSections')}</SelectItem>
                  <SelectItem value="film">{t('display.top_producers_slide.film')}</SelectItem>
                  <SelectItem value="printing">{t('display.top_producers_slide.printing')}</SelectItem>
                  <SelectItem value="cutting">{t('display.top_producers_slide.cutting')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>{t('display.cancel')}</Button>
        <Button onClick={handleSubmit} disabled={!title || !slideType}>
          {initialData ? t('display.update') : t('display.add')} {t('display.theSlide')}
        </Button>
      </div>
    </div>
  );
}

export default function DisplayControlPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<SlideData | null>(null);
  const SLIDE_TYPES = useSlideTypes();

  const { data: slides = [], isLoading } = useQuery<SlideData[]>({
    queryKey: ["/api/display/slides"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/display/slides", { method: "POST", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
      toast({ title: t('display.created') });
      setDialogOpen(false);
    },
    onError: () => toast({ title: t('display.createError'), variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest(`/api/display/slides/${id}`, { method: "PUT", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
      toast({ title: t('display.updated') });
      setDialogOpen(false);
      setEditingSlide(null);
    },
    onError: () => toast({ title: t('display.updateError'), variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/display/slides/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
      toast({ title: t('display.deleted') });
    },
    onError: () => toast({ title: t('display.deleteError'), variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const res = await apiRequest(`/api/display/slides/${id}`, { method: "PUT", body: JSON.stringify({ is_active }) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (slideOrders: { id: number; sort_order: number }[]) => {
      const res = await apiRequest("/api/display/slides/reorder", { method: "PUT", body: JSON.stringify({ slideOrders }) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
    },
  });

  const moveSlide = (index: number, direction: "up" | "down") => {
    const newSlides = [...slides];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;
    [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];
    const orders = newSlides.map((s, i) => ({ id: s.id, sort_order: i }));
    moveMutation.mutate(orders);
  };

  const handleSubmit = (data: any) => {
    if (editingSlide) {
      updateMutation.mutate({ id: editingSlide.id, data });
    } else {
      createMutation.mutate({ ...data, sort_order: slides.length });
    }
  };

  const openEdit = (slide: SlideData) => {
    setEditingSlide(slide);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingSlide(null);
    setDialogOpen(true);
  };

  const getSlideTypeInfo = (type: string) => SLIDE_TYPES.find(t => t.value === type);

  return (
    <PageLayout title={t('display.controlPanel')} description={t('display.manageSlidesDesc')}>
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{t('display.manageSlides')}</h2>
            <p className="text-gray-500 mt-1">{t('display.manageSlidesDesc')}</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/display-screen" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Monitor className="w-4 h-4 ml-2" />
                {t('display.openDisplay')}
                <ExternalLink className="w-3 h-3 mr-2" />
              </Button>
            </a>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSlide(null); }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="w-4 h-4 ml-2" />
                  {t('display.addSlide')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSlide ? t('display.editSlide') : t('display.addSlide')}</DialogTitle>
                  <DialogDescription>
                    {editingSlide ? 'تعديل بيانات الشريحة الحالية' : 'إضافة شريحة عرض جديدة للشاشة'}
                  </DialogDescription>
                </DialogHeader>
                <SlideForm
                  initialData={editingSlide || undefined}
                  onSubmit={handleSubmit}
                  onCancel={() => { setDialogOpen(false); setEditingSlide(null); }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : slides.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Monitor className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-500 mb-2">{t('display.noSlides')}</h3>
              <p className="text-gray-400 mb-6">{t('display.noSlidesDesc')}</p>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 ml-2" />
                {t('display.addFirstSlide')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, index) => {
              const typeInfo = getSlideTypeInfo(slide.slide_type);
              const Icon = typeInfo?.icon || Monitor;
              return (
                <Card key={slide.id} className={`transition-all ${!slide.is_active ? "opacity-50" : ""}`}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveSlide(index, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <GripVertical className="w-4 h-4 text-gray-300 mx-auto" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveSlide(index, "down")}
                          disabled={index === slides.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{slide.title}</h3>
                          <Badge variant="secondary" className="text-xs">{typeInfo?.label || slide.slide_type}</Badge>
                        </div>
                        {slide.content?.message && (
                          <p className="text-sm text-gray-500 truncate mt-1">{slide.content.message}</p>
                        )}
                        {slide.content?.items && (
                          <p className="text-sm text-gray-500 mt-1">{slide.content.items.length} {t('display.instructions_form.itemPlaceholder')}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{slide.duration_seconds}s</span>
                      </div>

                      <Switch
                        checked={slide.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: slide.id, is_active: checked })}
                      />

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(slide)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            if (confirm(t('display.deleteConfirm'))) {
                              deleteMutation.mutate(slide.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-blue-900 dark:text-blue-100">{t('display.tips')}</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                  <li>{t('display.tip1')}</li>
                  <li>{t('display.tip2')}</li>
                  <li>{t('display.tip3')}</li>
                  <li>{t('display.tip4')}</li>
                  <li>{t('display.tip5')}</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
