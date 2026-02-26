import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Badge } from "./ui/badge";
import { Checkbox } from "./ui/checkbox";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { PERMISSIONS, PERMISSION_CATEGORIES } from "../../../shared/permissions";
import { Plus, Edit, Trash2, Shield, Check, X } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

const CATEGORY_TRANSLATION_MAP: Record<string, string> = {
  'عام': 'general',
  'الطلبات': 'orders',
  'الإنتاج': 'production',
  'الصيانة': 'maintenance',
  'الجودة': 'quality',
  'المخزون': 'inventory',
  'المستخدمين': 'users',
  'الموارد البشرية': 'hr',
  'التقارير': 'reports',
  'المراقبة': 'monitoring',
  'التكامل': 'integration',
  'الوكيل الذكي': 'aiAgent',
  'محاكاة المصنع': 'factorySimulation',
  'شاشة العرض': 'displayScreen',
  'التعريفات': 'definitions',
  'النظام': 'system',
};

export default function RoleManagementTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newRole, setNewRole] = useState({
    name: "",
    name_ar: "",
    permissions: [] as string[],
  });

  const [editingRole, setEditingRole] = useState<any | null>(null);
  const [viewingRole, setViewingRole] = useState<any | null>(null);

  // Use permissions from centralized registry
  const availablePermissions = PERMISSIONS;

  // Fetch roles
  const { data: roles = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: any) => {
      return await apiRequest("/api/roles", {
        method: "POST",
        body: JSON.stringify(roleData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setNewRole({ name: "", name_ar: "", permissions: [] });
      toast({
        title: t("roles.createSuccess"),
        description: t("roles.createSuccessDescription"),
      });
    },
    onError: () => {
      toast({
        title: t("roles.createError"),
        description: t("roles.createErrorDescription"),
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, roleData }: { id: number; roleData: any }) => {
      return await apiRequest(`/api/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(roleData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setEditingRole(null);
      toast({
        title: t("roles.updateSuccess"),
        description: t("roles.updateSuccessDescription"),
      });
    },
    onError: () => {
      toast({
        title: t("roles.updateError"),
        description: t("roles.updateErrorDescription"),
        variant: "destructive",
      });
    },
  });

  // Delete role mutation
  const deleteRoleMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/roles/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      toast({
        title: t("roles.deleteSuccess"),
        description: t("roles.deleteSuccessDescription"),
      });
    },
    onError: () => {
      toast({
        title: t("roles.deleteError"),
        description: t("roles.deleteErrorDescription"),
        variant: "destructive",
      });
    },
  });

  const handleCreateRole = () => {
    if (!newRole.name || !newRole.name_ar) {
      toast({
        title: t("roles.missingData"),
        description: t("roles.missingDataDescription"),
        variant: "destructive",
      });
      return;
    }

    createRoleMutation.mutate(newRole);
  };

  const getCategoryTranslation = (category: string) => {
    const key = CATEGORY_TRANSLATION_MAP[category];
    return key ? t(`roles.categories.${key}`) : category;
  };

  const handleUpdateRole = () => {
    if (editingRole) {
      updateRoleMutation.mutate({
        id: editingRole.id,
        roleData: editingRole,
      });
    }
  };

  const handlePermissionChange = (
    permissionId: string,
    checked: boolean,
    isEditing = false,
  ) => {
    if (isEditing && editingRole) {
      setEditingRole({
        ...editingRole,
        permissions: checked
          ? [...editingRole.permissions, permissionId]
          : editingRole.permissions.filter((p: string) => p !== permissionId),
      });
    } else {
      setNewRole({
        ...newRole,
        permissions: checked
          ? [...newRole.permissions, permissionId]
          : newRole.permissions.filter((p) => p !== permissionId),
      });
    }
  };

  const handleCategoryToggle = (category: string, isEditing = false) => {
    const categoryPermissions = availablePermissions
      .filter(p => p.category === category)
      .map(p => p.id);
    
    const currentPermissions = isEditing ? editingRole?.permissions || [] : newRole.permissions;
    const allSelected = categoryPermissions.every(p => currentPermissions.includes(p));

    if (isEditing && editingRole) {
      if (allSelected) {
        // Remove all category permissions
        setEditingRole({
          ...editingRole,
          permissions: editingRole.permissions.filter(
            (p: string) => !categoryPermissions.includes(p as any)
          ),
        });
      } else {
        // Add all category permissions
        const newPermissions = Array.from(new Set([...editingRole.permissions, ...categoryPermissions]));
        setEditingRole({
          ...editingRole,
          permissions: newPermissions,
        });
      }
    } else {
      if (allSelected) {
        // Remove all category permissions
        setNewRole({
          ...newRole,
          permissions: newRole.permissions.filter(p => !categoryPermissions.includes(p as any)),
        });
      } else {
        // Add all category permissions
        const newPermissions = Array.from(new Set([...newRole.permissions, ...categoryPermissions]));
        setNewRole({
          ...newRole,
          permissions: newPermissions,
        });
      }
    }
  };

  const getCategoryPermissionCount = (category: string, permissions: string[]) => {
    const categoryPermissions = availablePermissions
      .filter(p => p.category === category)
      .map(p => p.id);
    const selectedCount = categoryPermissions.filter(p => permissions.includes(p)).length;
    return { selected: selectedCount, total: categoryPermissions.length };
  };

  const PermissionsEditor = ({ permissions, isEditing }: { permissions: string[], isEditing: boolean }) => (
    <Accordion type="multiple" className="w-full">
      {PERMISSION_CATEGORIES.map((category) => {
        const categoryPermissions = availablePermissions.filter(p => p.category === category);
        if (categoryPermissions.length === 0) return null;
        
        const counts = getCategoryPermissionCount(category, permissions);
        const allSelected = counts.selected === counts.total;
        const someSelected = counts.selected > 0 && counts.selected < counts.total;

        return (
          <AccordionItem key={category} value={category}>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    const checkbox = el.querySelector('input');
                    if (checkbox) {
                      (checkbox as HTMLInputElement).indeterminate = someSelected;
                    }
                  }
                }}
                onCheckedChange={(checked) => {
                  handleCategoryToggle(category, isEditing);
                }}
                data-testid={`checkbox-category-${category}`}
              />
              <AccordionTrigger className="hover:no-underline flex-1">
                <div className="flex items-center gap-3 w-full">
                  <span className="font-medium">{getCategoryTranslation(category)}</span>
                  <Badge variant={counts.selected > 0 ? "default" : "outline"} className="mr-auto">
                    {counts.selected} / {counts.total}
                  </Badge>
                </div>
              </AccordionTrigger>
            </div>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 pr-6">
                {categoryPermissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="flex items-start space-x-2 space-x-reverse p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`${isEditing ? 'edit' : 'new'}-${permission.id}`}
                      checked={permissions.includes(permission.id)}
                      onCheckedChange={(checked) =>
                        handlePermissionChange(permission.id, checked as boolean, isEditing)
                      }
                      data-testid={`checkbox-permission-${permission.id}`}
                    />
                    <div className="flex-1 space-y-1">
                      <label
                        htmlFor={`${isEditing ? 'edit' : 'new'}-${permission.id}`}
                        className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {permission.name_ar}
                      </label>
                      {permission.description && (
                        <p className="text-xs text-muted-foreground">
                          {permission.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );

  if (isLoading) {
    return <div className="text-center py-8">{t("roles.loadingRoles")}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("roles.totalRoles")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("roles.totalPermissions")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PERMISSIONS.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("roles.permissionCategories")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{PERMISSION_CATEGORIES.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Role Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            {t("roles.addRole")}
          </CardTitle>
          <CardDescription>
            {t("roles.addRoleDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">{t("roles.roleNameEn")}</Label>
              <Input
                id="roleName"
                value={newRole.name}
                onChange={(e) =>
                  setNewRole({ ...newRole, name: e.target.value })
                }
                placeholder={t("roles.roleNameEnPlaceholder")}
                data-testid="input-role-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleNameAr">{t("roles.roleNameAr")}</Label>
              <Input
                id="roleNameAr"
                value={newRole.name_ar}
                onChange={(e) =>
                  setNewRole({ ...newRole, name_ar: e.target.value })
                }
                placeholder={t("roles.roleNameArPlaceholder")}
                data-testid="input-role-name-ar"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("roles.permissions")} ({newRole.permissions.length} {t("roles.selectedPermissions")})</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setNewRole({
                      ...newRole,
                      permissions: availablePermissions.map((p) => p.id),
                    })
                  }
                  data-testid="button-select-all-new"
                >
                  {t("roles.selectAll")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setNewRole({
                      ...newRole,
                      permissions: [],
                    })
                  }
                  data-testid="button-clear-all-new"
                >
                  {t("roles.clearAll")}
                </Button>
              </div>
            </div>
            <PermissionsEditor permissions={newRole.permissions} isEditing={false} />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreateRole}
              disabled={createRoleMutation.isPending}
              className="flex items-center gap-2"
              data-testid="button-create-role"
            >
              {createRoleMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t("roles.adding")}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  {t("roles.addRoleButton")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t("roles.existingRoles")}
          </CardTitle>
          <CardDescription>
            {t("roles.existingRolesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("roles.roleNumber")}</TableHead>
                <TableHead>{t("roles.roleName")}</TableHead>
                <TableHead>{t("roles.arabicName")}</TableHead>
                <TableHead>{t("roles.permissions")}</TableHead>
                <TableHead>{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(roles as any[]).map((role: any) => (
                <TableRow key={role.id} data-testid={`row-role-${role.id}`}>
                  <TableCell>{role.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{role.name}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{role.name_ar}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {role.permissions?.length || 0} {t("roles.permissionCount")}
                      </Badge>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setViewingRole(role)}
                            className="h-8 px-2 text-xs"
                            data-testid={`button-view-permissions-${role.id}`}
                          >
                            {t("roles.viewDetails")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{t("roles.rolePermissions")}: {role.name_ar}</DialogTitle>
                            <DialogDescription>
                              {t("roles.rolePermissionsDescription")} ({role.permissions?.length || 0} {t("roles.permissionCount")})
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            {PERMISSION_CATEGORIES.map((category) => {
                              const categoryPerms = availablePermissions
                                .filter(p => p.category === category && role.permissions?.includes(p.id));
                              if (categoryPerms.length === 0) return null;
                              
                              return (
                                <div key={category} className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{getCategoryTranslation(category)}</h4>
                                    <Badge variant="outline">{categoryPerms.length}</Badge>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pr-4">
                                    {categoryPerms.map((perm) => (
                                      <div key={perm.id} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                                        <Check className="w-4 h-4 text-green-600" />
                                        <span>{perm.name_ar}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingRole({ ...role })}
                        className="flex items-center gap-1"
                        data-testid={`button-edit-role-${role.id}`}
                      >
                        <Edit className="w-3 h-3" />
                        {t("common.edit")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm(`${t("roles.confirmDelete")} "${role.name_ar}"?`)) {
                            deleteRoleMutation.mutate(role.id);
                          }
                        }}
                        disabled={deleteRoleMutation.isPending}
                        className="flex items-center gap-1"
                        data-testid={`button-delete-role-${role.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                        {t("common.delete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {(roles as any[]).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t("roles.noRoles")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      {editingRole && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t("roles.editRole")}: {editingRole.name_ar}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditingRole(null)}
                data-testid="button-cancel-edit"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              {t("roles.editRoleDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editRoleName">{t("roles.roleNameEn")}</Label>
                <Input
                  id="editRoleName"
                  value={editingRole.name}
                  onChange={(e) =>
                    setEditingRole({
                      ...editingRole,
                      name: e.target.value,
                    })
                  }
                  data-testid="input-edit-role-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRoleNameAr">{t("roles.roleNameAr")}</Label>
                <Input
                  id="editRoleNameAr"
                  value={editingRole.name_ar}
                  onChange={(e) =>
                    setEditingRole({
                      ...editingRole,
                      name_ar: e.target.value,
                    })
                  }
                  data-testid="input-edit-role-name-ar"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("roles.permissions")} ({editingRole.permissions?.length || 0} {t("roles.selectedPermissions")})</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditingRole({
                        ...editingRole,
                        permissions: availablePermissions.map((p) => p.id),
                      })
                    }
                    data-testid="button-select-all-edit"
                  >
                    {t("roles.selectAll")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditingRole({
                        ...editingRole,
                        permissions: [],
                      })
                    }
                    data-testid="button-clear-all-edit"
                  >
                    {t("roles.clearAll")}
                  </Button>
                </div>
              </div>
              <PermissionsEditor permissions={editingRole.permissions || []} isEditing={true} />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingRole(null)}
                data-testid="button-cancel-edit-bottom"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleUpdateRole}
                disabled={updateRoleMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-save-role"
              >
                {updateRoleMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t("roles.saving")}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {t("roles.saveChanges")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
