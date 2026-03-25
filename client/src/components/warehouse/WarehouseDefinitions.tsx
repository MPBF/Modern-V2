import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from 'react-i18next';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useToast } from "../../hooks/use-toast";
import { Plus, Edit, Trash2, Building2, Package, Scale, Boxes } from "lucide-react";

function SuppliersTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const supplierSchema = z.object({
    name: z.string().min(1, t('warehouse.validation.nameEnRequired')),
    name_ar: z.string().min(1, t('warehouse.validation.nameArRequired')),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    address: z.string().optional(),
    contact_person: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      name_ar: "",
      phone: "",
      email: "",
      address: "",
      contact_person: "",
    },
  });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await fetch("/api/suppliers");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.data || [];
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/suppliers/${editingItem.id}` : "/api/suppliers";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("فشل في الحفظ");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: t('warehouse.toast.savedSuccess') });
      setIsOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: () => {
      toast({ title: t('warehouse.toast.saveError'), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/suppliers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في الحذف");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: t('warehouse.toast.deletedSuccess') });
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      name: item.name || "",
      name_ar: item.name_ar || "",
      phone: item.phone || "",
      email: item.email || "",
      address: item.address || "",
      contact_person: item.contact_person || "",
    });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset();
    setIsOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('warehouse.definitions.suppliers')}
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 ml-2" />
                {t('warehouse.definitions.addSupplier')}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{editingItem ? t('warehouse.definitions.editSupplier') : t('warehouse.definitions.addNewSupplier')}</DialogTitle>
                <DialogDescription className="sr-only">{t('warehouse.definitions.supplierFormDesc')}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.nameEn')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.nameAr')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.phone')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" dir="ltr" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.email')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" dir="ltr" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouse.definitions.contactPerson')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouse.definitions.address')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t('warehouse.buttons.cancel')}</Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? t('warehouse.buttons.saving') : t('warehouse.buttons.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">{t('warehouse.loading')}</div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t('warehouse.definitions.noSuppliers')}</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t('warehouse.definitions.name')}</TableHead>
                <TableHead className="text-right">{t('warehouse.definitions.phone')}</TableHead>
                <TableHead className="text-right">{t('warehouse.definitions.contactPerson')}</TableHead>
                <TableHead className="text-right">{t('warehouse.definitions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier: any) => (
                <TableRow key={supplier.id}>
                  <TableCell>{supplier.name_ar || supplier.name}</TableCell>
                  <TableCell dir="ltr">{supplier.phone || "-"}</TableCell>
                  <TableCell>{supplier.contact_person || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(supplier)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(supplier.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ItemsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const itemSchema = z.object({
    category_id: z.string().min(1, t('warehouse.validation.mainCategoryRequired')),
    code: z.string().min(1, t('warehouse.validation.codeRequired')),
    name: z.string().min(1, t('warehouse.validation.nameEnRequired')),
    name_ar: z.string().min(1, t('warehouse.validation.nameArRequired')),
    unit: z.string().default("كيلو"),
    min_stock: z.string().optional(),
    barcode: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      category_id: "",
      code: "",
      name: "",
      name_ar: "",
      unit: "كيلو",
      min_stock: "",
      barcode: "",
    },
  });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const res = await fetch("/api/items");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/items/${editingItem.id}` : "/api/items";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("فشل في الحفظ");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: t('warehouse.toast.savedSuccess') });
      setIsOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: () => {
      toast({ title: t('warehouse.toast.saveError'), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في الحذف");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: t('warehouse.toast.deletedSuccess') });
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      category_id: item.category_id || "",
      code: item.code || "",
      name: item.name || "",
      name_ar: item.name_ar || "",
      unit: item.unit || "كيلو",
      min_stock: item.min_stock?.toString() || "",
      barcode: item.barcode || "",
    });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset();
    setIsOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t('warehouse.definitions.items')}
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 ml-2" />
                {t('warehouse.definitions.addItem')}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{editingItem ? t('warehouse.definitions.editItem') : t('warehouse.definitions.addNewItem')}</DialogTitle>
                <DialogDescription className="sr-only">{t('warehouse.definitions.itemFormDesc')}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouse.definitions.mainCategory')} *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('warehouse.definitions.selectMainCategory')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category: any) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name_ar || category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouse.definitions.code')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.nameEn')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.nameAr')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.labels.unit')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="min_stock"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.minStock')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="barcode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('warehouse.labels.barcode')}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t('warehouse.buttons.cancel')}</Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? t('warehouse.buttons.saving') : t('warehouse.buttons.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">{t('warehouse.loading')}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t('warehouse.definitions.noItems')}</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t('warehouse.definitions.code')}</TableHead>
                <TableHead className="text-right">{t('warehouse.definitions.name')}</TableHead>
                <TableHead className="text-right">{t('warehouse.labels.unit')}</TableHead>
                <TableHead className="text-right">{t('warehouse.labels.barcode')}</TableHead>
                <TableHead className="text-right">{t('warehouse.definitions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.slice(0, 50).map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.name_ar || item.name}</TableCell>
                  <TableCell>{item.unit || "-"}</TableCell>
                  <TableCell dir="ltr">{item.barcode || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
        {items.length > 50 && (
          <p className="text-sm text-gray-500 mt-2 text-center">
            {t('warehouse.definitions.showingFirst50', { total: items.length })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UnitsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const unitSchema = z.object({
    name: z.string().min(1, t('warehouse.validation.nameEnRequired')),
    name_ar: z.string().min(1, t('warehouse.validation.nameArRequired')),
    symbol: z.string().min(1, t('warehouse.validation.symbolRequired')),
    conversion_factor: z.string().default("1"),
  });

  const form = useForm({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: "",
      name_ar: "",
      symbol: "",
      conversion_factor: "1",
    },
  });

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["/api/units"],
    queryFn: async () => {
      const res = await fetch("/api/units");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/units/${editingItem.id}` : "/api/units";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("فشل في الحفظ");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: t('warehouse.toast.savedSuccess') });
      setIsOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: () => {
      toast({ title: t('warehouse.toast.saveError'), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/units/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في الحذف");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/units"] });
      toast({ title: t('warehouse.toast.deletedSuccess') });
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      name: item.name || "",
      name_ar: item.name_ar || "",
      symbol: item.symbol || "",
      conversion_factor: item.conversion_factor?.toString() || "1",
    });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset();
    setIsOpen(true);
  };

  const defaultUnits = [
    { id: "default-1", name: "Kilogram", name_ar: "كيلو", symbol: "كغ" },
    { id: "default-2", name: "Ton", name_ar: "طن", symbol: "طن" },
    { id: "default-3", name: "Piece", name_ar: "قطعة", symbol: "قط" },
    { id: "default-4", name: "Bundle", name_ar: "بندل", symbol: "بند" },
    { id: "default-5", name: "Meter", name_ar: "متر", symbol: "م" },
    { id: "default-6", name: "Roll", name_ar: "رول", symbol: "رول" },
  ];

  const allUnits = units.length > 0 ? units : defaultUnits;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            {t('warehouse.definitions.units')}
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 ml-2" />
                {t('warehouse.definitions.addUnit')}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{editingItem ? t('warehouse.definitions.editUnit') : t('warehouse.definitions.addNewUnit')}</DialogTitle>
                <DialogDescription className="sr-only">{t('warehouse.definitions.unitFormDesc')}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.nameEn')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.nameAr')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="symbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.symbol')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="conversion_factor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.conversionFactor')}</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" step="0.001" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t('warehouse.buttons.cancel')}</Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? t('warehouse.buttons.saving') : t('warehouse.buttons.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">{t('warehouse.loading')}</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t('warehouse.definitions.name')}</TableHead>
                <TableHead className="text-right">{t('warehouse.definitions.symbol')}</TableHead>
                <TableHead className="text-right">{t('warehouse.definitions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allUnits.map((unit: any) => (
                <TableRow key={unit.id}>
                  <TableCell>{unit.name_ar || unit.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{unit.symbol}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(unit)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!unit.id.toString().startsWith("default") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(unit.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoriesTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const categorySchema = z.object({
    name: z.string().min(1, t('warehouse.validation.nameEnRequired')),
    name_ar: z.string().min(1, t('warehouse.validation.nameArRequired')),
    type: z.enum(["raw_material", "finished_goods"]).default("raw_material"),
  });

  const form = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      name_ar: "",
      type: "raw_material" as const,
    },
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["/api/material-groups"],
    queryFn: async () => {
      const res = await fetch("/api/material-groups");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem ? `/api/material-groups/${editingItem.id}` : "/api/material-groups";
      const method = editingItem ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("فشل في الحفظ");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/material-groups"] });
      toast({ title: t('warehouse.toast.savedSuccess') });
      setIsOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: () => {
      toast({ title: t('warehouse.toast.saveError'), variant: "destructive" });
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    form.reset({
      name: item.name || "",
      name_ar: item.name_ar || "",
      type: item.type || "raw_material",
    });
    setIsOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.reset();
    setIsOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            {t('warehouse.definitions.materialGroups')}
          </CardTitle>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 ml-2" />
                {t('warehouse.definitions.addGroup')}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle>{editingItem ? t('warehouse.definitions.editGroup') : t('warehouse.definitions.addNewGroup')}</DialogTitle>
                <DialogDescription className="sr-only">{t('warehouse.definitions.groupFormDesc')}</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.nameEn')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('warehouse.definitions.nameAr')}</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>{t('warehouse.buttons.cancel')}</Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? t('warehouse.buttons.saving') : t('warehouse.buttons.save')}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">{t('warehouse.loading')}</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-8 text-gray-500">{t('warehouse.definitions.noGroups')}</div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t('warehouse.definitions.name')}</TableHead>
                <TableHead className="text-right">{t('warehouse.definitions.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((cat: any) => (
                <TableRow key={cat.id}>
                  <TableCell>{cat.name_ar || cat.name}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(cat)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WarehouseDefinitions() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <Tabs defaultValue="suppliers" className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="inline-flex w-auto min-w-full">
            <TabsTrigger value="suppliers" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0">
              <Building2 className="h-4 w-4 shrink-0" />
              {t('warehouse.definitions.suppliers')}
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0">
              <Package className="h-4 w-4 shrink-0" />
              {t('warehouse.definitions.items')}
            </TabsTrigger>
            <TabsTrigger value="units" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0">
              <Scale className="h-4 w-4 shrink-0" />
              {t('warehouse.definitions.units')}
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1 text-xs sm:text-sm px-2 sm:px-3 shrink-0">
              <Boxes className="h-4 w-4 shrink-0" />
              {t('warehouse.definitions.groups')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>
        <TabsContent value="items">
          <ItemsTab />
        </TabsContent>
        <TabsContent value="units">
          <UnitsTab />
        </TabsContent>
        <TabsContent value="categories">
          <CategoriesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default WarehouseDefinitions;
