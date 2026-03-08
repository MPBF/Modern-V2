import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import {
  BarChart3, Cog, ScrollText, UserCheck, StickyNote, Zap,
  Package, FileText, Clock, ShoppingCart, Activity, Wrench,
  GripVertical, RotateCcw,
} from "lucide-react";
import {
  WIDGET_REGISTRY,
  getAvailableWidgets,
  getDefaultDashboardConfig,
  type WidgetMeta,
} from "../../lib/dashboard-widgets";

const ICON_MAP: Record<string, any> = {
  BarChart3, Cog, ScrollText, UserCheck, StickyNote, Zap,
  Package, FileText, Clock, ShoppingCart, Activity, Wrench,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentWidgets: string[];
  onSave: (widgets: string[]) => void;
  userPermissions?: string[];
  userRoleId?: number;
}

export default function DashboardCustomizer({
  open,
  onOpenChange,
  currentWidgets,
  onSave,
  userPermissions,
  userRoleId,
}: Props) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [selectedWidgets, setSelectedWidgets] = useState<string[]>(currentWidgets);

  useEffect(() => {
    if (open) {
      setSelectedWidgets(currentWidgets);
    }
  }, [open, currentWidgets]);

  const availableWidgets = getAvailableWidgets(userPermissions);
  const isAdmin = userPermissions?.includes("admin") || userRoleId === 1;
  const allWidgets = isAdmin ? Object.values(WIDGET_REGISTRY) : availableWidgets;

  const categories = [...new Set(allWidgets.map((w) => w.category))];

  const toggleWidget = (widgetId: string) => {
    setSelectedWidgets((prev) =>
      prev.includes(widgetId)
        ? prev.filter((id) => id !== widgetId)
        : [...prev, widgetId]
    );
  };

  const moveWidget = (widgetId: string, direction: "up" | "down") => {
    setSelectedWidgets((prev) => {
      const idx = prev.indexOf(widgetId);
      if (idx === -1) return prev;
      const newArr = [...prev];
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= newArr.length) return prev;
      [newArr[idx], newArr[targetIdx]] = [newArr[targetIdx], newArr[idx]];
      return newArr;
    });
  };

  const resetToDefaults = () => {
    const defaults = getDefaultDashboardConfig(userPermissions, userRoleId);
    setSelectedWidgets(defaults.widgets);
  };

  const handleSave = () => {
    onSave(selectedWidgets);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cog className="w-5 h-5" />
            {isArabic ? "تخصيص لوحة التحكم" : "Customize Dashboard"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? "اختر العناصر التي تريد عرضها في لوحة التحكم"
                : "Choose which widgets to display on your dashboard"}
            </p>
            <Button variant="outline" size="sm" onClick={resetToDefaults} className="gap-1">
              <RotateCcw className="w-3.5 h-3.5" />
              {isArabic ? "استعادة الافتراضي" : "Reset"}
            </Button>
          </div>

          {selectedWidgets.length > 0 && (
            <div className="border rounded-lg p-3 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {isArabic ? "الترتيب الحالي (اسحب لإعادة الترتيب)" : "Current Order"}
              </p>
              <div className="space-y-1">
                {selectedWidgets.map((wId, idx) => {
                  const widget = WIDGET_REGISTRY[wId];
                  if (!widget) return null;
                  const Icon = ICON_MAP[widget.icon] || BarChart3;
                  return (
                    <div
                      key={wId}
                      className="flex items-center gap-2 p-2 rounded bg-background border text-sm"
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="flex-1 truncate">
                        {isArabic ? widget.name_ar : widget.name}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveWidget(wId, "up")}
                          disabled={idx === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => moveWidget(wId, "down")}
                          disabled={idx === selectedWidgets.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {categories.map((category) => {
            const categoryWidgets = allWidgets.filter((w) => w.category === category);
            const catAr = categoryWidgets[0]?.category_ar || category;
            return (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                  {isArabic ? catAr : category}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categoryWidgets.map((widget) => {
                    const isSelected = selectedWidgets.includes(widget.id);
                    const Icon = ICON_MAP[widget.icon] || BarChart3;
                    return (
                      <div
                        key={widget.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => toggleWidget(widget.id)}
                      >
                        <Icon
                          className={`w-5 h-5 flex-shrink-0 ${
                            isSelected ? "text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {isArabic ? widget.name_ar : widget.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {isArabic ? widget.description_ar : widget.description}
                          </p>
                        </div>
                        <Switch
                          checked={isSelected}
                          onCheckedChange={() => toggleWidget(widget.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-4">
          <Badge variant="secondary" className="mr-auto">
            {selectedWidgets.length} {isArabic ? "عنصر محدد" : "selected"}
          </Badge>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isArabic ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave}>
            {isArabic ? "حفظ" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
