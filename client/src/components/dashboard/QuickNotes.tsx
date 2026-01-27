import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Plus,
  AlertCircle,
  Package,
  Palette,
  FileText,
  DollarSign,
  Truck,
  Phone,
  MoreHorizontal,
  Trash2,
  Eye,
  Paperclip,
} from "lucide-react";
import { useAuth } from "../../hooks/use-auth";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface QuickNote {
  id: number;
  content: string;
  note_type: string;
  priority: string;
  created_by: number;
  assigned_to: number;
  is_read: boolean;
  created_at: string;
  creator_name: string;
  assignee_name: string;
  attachments?: any[];
}

const noteTypeConfig = {
  order: { label: "طلبية", icon: Package, color: "bg-blue-100 text-blue-700 border-blue-300" },
  design: { label: "تصميم", icon: Palette, color: "bg-purple-100 text-purple-700 border-purple-300" },
  statement: { label: "كشف حساب", icon: FileText, color: "bg-green-100 text-green-700 border-green-300" },
  quote: { label: "عرض أسعار", icon: DollarSign, color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
  delivery: { label: "توصيل", icon: Truck, color: "bg-orange-100 text-orange-700 border-orange-300" },
  call_customer: { label: "الاتصال بعميل", icon: Phone, color: "bg-pink-100 text-pink-700 border-pink-300" },
  other: { label: "أخرى", icon: MoreHorizontal, color: "bg-gray-100 text-gray-700 border-gray-300" },
};

const priorityConfig = {
  low: { label: "منخفضة", color: "bg-gray-50 border-gray-200" },
  normal: { label: "عادية", color: "bg-blue-50 border-blue-200" },
  high: { label: "عالية", color: "bg-orange-50 border-orange-200" },
  urgent: { label: "عاجلة", color: "bg-red-50 border-red-300 shadow-md" },
};

export default function QuickNotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNote, setNewNote] = useState({
    content: "",
    note_type: "other",
    priority: "normal",
    assigned_to: 0,
  });

  // Update assigned_to when user is loaded
  useEffect(() => {
    if (user?.id && newNote.assigned_to === 0) {
      setNewNote(prev => ({ ...prev, assigned_to: user.id }));
    }
  }, [user?.id, newNote.assigned_to]);

  // Fetch quick notes for current user
  const { data: notes = [], isLoading } = useQuery<QuickNote[]>({
    queryKey: ["/api/quick-notes"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      return await apiRequest("/api/quick-notes", {
        method: "POST",
        body: JSON.stringify(noteData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      toast({
        title: "تم إنشاء الملاحظة",
        description: "تم إضافة الملاحظة بنجاح",
      });
      setIsModalOpen(false);
      setNewNote({
        content: "",
        note_type: "other",
        priority: "normal",
        assigned_to: user?.id || 0,
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل إنشاء الملاحظة",
        variant: "destructive",
      });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return await apiRequest(`/api/quick-notes/${noteId}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: number) => {
      return await apiRequest(`/api/quick-notes/${noteId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      toast({
        title: "تم الحذف",
        description: "تم حذف الملاحظة بنجاح",
      });
    },
  });

  const handleCreateNote = () => {
    if (!newNote.content.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال محتوى الملاحظة",
        variant: "destructive",
      });
      return;
    }

    createNoteMutation.mutate(newNote);
  };

  // Filter notes assigned to current user and unread notes
  const userNotes = notes.filter(
    (note) => note.assigned_to === user?.id || note.created_by === user?.id
  );
  const unreadNotes = userNotes.filter((note) => !note.is_read);

  return (
    <Card className="shadow-lg" data-testid="card-quick-notes">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg font-bold">ملاحظات سريعة</CardTitle>
          {unreadNotes.length > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {unreadNotes.length}
            </span>
          )}
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" data-testid="button-add-note">
              <Plus className="w-4 h-4" />
              إضافة ملاحظة
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>إضافة ملاحظة جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>نوع الملاحظة</Label>
                <Select
                  value={newNote.note_type}
                  onValueChange={(value) =>
                    setNewNote({ ...newNote, note_type: value })
                  }
                >
                  <SelectTrigger data-testid="select-note-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(noteTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <config.icon className="w-4 h-4" />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>الأولوية</Label>
                <Select
                  value={newNote.priority}
                  onValueChange={(value) =>
                    setNewNote({ ...newNote, priority: value })
                  }
                >
                  <SelectTrigger data-testid="select-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>تعيين إلى</Label>
                <Select
                  value={newNote.assigned_to.toString()}
                  onValueChange={(value) =>
                    setNewNote({ ...newNote, assigned_to: parseInt(value) })
                  }
                >
                  <SelectTrigger data-testid="select-assigned-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {users
                      .filter((u: any) => ![3, 4, 5].includes(u.section_id))
                      .map((u: any) => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.display_name || u.username}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>المحتوى</Label>
                <Textarea
                  value={newNote.content}
                  onChange={(e) =>
                    setNewNote({ ...newNote, content: e.target.value })
                  }
                  placeholder="اكتب ملاحظتك هنا..."
                  className="min-h-[100px]"
                  data-testid="textarea-note-content"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  data-testid="button-cancel"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleCreateNote}
                  disabled={createNoteMutation.isPending}
                  data-testid="button-save-note"
                >
                  {createNoteMutation.isPending ? "جاري الحفظ..." : "حفظ"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="space-y-3 max-h-[500px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">جاري التحميل...</div>
        ) : userNotes.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            لا توجد ملاحظات حالياً
          </div>
        ) : (
          userNotes.map((note) => {
            const typeConfig = noteTypeConfig[note.note_type as keyof typeof noteTypeConfig] || noteTypeConfig.other;
            const priorityStyle = priorityConfig[note.priority as keyof typeof priorityConfig] || priorityConfig.normal;
            const Icon = typeConfig.icon;

            return (
              <div
                key={note.id}
                className={`p-4 rounded-lg border-2 ${priorityStyle.color} ${!note.is_read ? "ring-2 ring-blue-400" : ""}`}
                data-testid={`note-${note.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100">
                        {typeConfig.label}
                      </span>
                      {!note.is_read && (
                        <span className="text-xs font-bold text-blue-600">
                          جديد
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-900 mb-2 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span>من: {note.creator_name}</span>
                      <span>•</span>
                      <span>إلى: {note.assignee_name}</span>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                          locale: ar,
                        })}
                      </span>
                      {note.attachments && note.attachments.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Paperclip className="w-3 h-3" />
                            {note.attachments.length}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {!note.is_read && note.assigned_to === user?.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsReadMutation.mutate(note.id)}
                        data-testid={`button-mark-read-${note.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {(note.created_by === user?.id || user?.role_id === 1) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNoteMutation.mutate(note.id)}
                        data-testid={`button-delete-${note.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
