import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import {
  Bot, Send, FileText, Loader2, Download, History, User, Paperclip,
  X, Image, FileSpreadsheet, File, Mic, MicOff, Square, Sparkles,
  MessageCircle, Calculator, Package, Cpu, Users, BarChart3, ChevronDown
} from "lucide-react";
import type { Quote } from "../../../shared/schema";

function renderTextWithLinks(text: string) {
  const parts: { type: 'text' | 'link'; content: string; label?: string }[] = [];
  const combinedRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>"{}|\\^`[\]]+?)(?=[)\],.:;!?\s]|$)/g;
  let lastIndex = 0;
  let match;
  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    if (match[1] && match[2]) {
      parts.push({ type: 'link', content: match[2], label: match[1] });
      lastIndex = match.index + match[0].length;
    } else if (match[3]) {
      parts.push({ type: 'link', content: match[3] });
      lastIndex = match.index + match[3].length;
    }
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return parts.map((part, index) => {
    if (part.type === 'link') {
      return (
        <a
          key={index}
          href={part.content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline break-all inline-flex items-center gap-1 font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {part.label || part.content}
        </a>
      );
    }
    return <span key={index}>{part.content}</span>;
  });
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  fileInfo?: {
    filename: string;
    mimetype: string;
    size: number;
  };
}

const QUICK_SUGGESTIONS = [
  { icon: Package, text: "حساب عدد الأكياس", query: "أريد حساب عدد الأكياس بناء على الأبعاد والوزن" },
  { icon: Calculator, text: "تكلفة الكليشهات", query: "احسب لي تكلفة الكليشهات الطباعية" },
  { icon: FileText, text: "إنشاء عرض سعر", query: "أريد إنشاء عرض سعر جديد" },
  { icon: BarChart3, text: "حالة الإنتاج", query: "ما هو ملخص الإنتاج الحالي؟" },
  { icon: Cpu, text: "حالة المكائن", query: "ما هي حالة مكائن المصنع؟" },
  { icon: Users, text: "قائمة العملاء", query: "أعطني قائمة العملاء النشطين" },
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"
          style={{ animationDelay: `${delay}ms`, animationDuration: "1.2s" }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg, getFileIcon, formatFileSize }: {
  msg: Message;
  getFileIcon: (mimetype: string) => JSX.Element;
  formatFileSize: (bytes: number) => string;
}) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex gap-2.5 md:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}>
      <div
        className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-md ring-2 ${
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground ring-primary/20"
            : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-emerald-500/20"
        }`}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={`flex flex-col gap-1 max-w-[85%] md:max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-3 shadow-sm ${
            isUser
              ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-sm"
              : "bg-card border border-border/60 rounded-tl-sm dark:bg-card/90"
          }`}
        >
          {msg.fileInfo && (
            <div className={`flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg ${
              isUser ? "bg-white/15" : "bg-muted"
            }`}>
              {getFileIcon(msg.fileInfo.mimetype)}
              <span className="text-xs font-medium truncate max-w-[150px]">{msg.fileInfo.filename}</span>
              <span className="text-xs opacity-60">({formatFileSize(msg.fileInfo.size)})</span>
            </div>
          )}
          {msg.content ? (
            <div className="whitespace-pre-wrap text-sm md:text-[0.9rem] leading-relaxed" dir="auto">
              {renderTextWithLinks(msg.content)}
            </div>
          ) : (
            <TypingIndicator />
          )}
        </div>
        {msg.timestamp && (
          <span className={`text-[10px] text-muted-foreground px-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? "text-right" : "text-left"}`}>
            {msg.timestamp.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}

function ChatPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isLoading && !isRecording && !isTranscribing) {
      textareaRef.current?.focus();
    }
  }, [isLoading, isRecording, isTranscribing]);

  const handleViewportScrollCapture = () => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 150;
    setShowScrollBtn(distanceFromBottom > 300);
  };

  const scrollToBottom = () => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  const scrollToBottomIfNeeded = () => {
    if (shouldAutoScrollRef.current) scrollToBottom();
  };

  useEffect(() => { scrollToBottomIfNeeded(); }, [messages]);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => { return () => abortRef.current?.abort(); }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return <Image className="h-4 w-4 text-blue-500" />;
    if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
    return <File className="h-4 w-4 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast({ title: t("aiAgent.chat.error"), description: t("aiAgent.chat.fileSizeError"), variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const response = await fetch("/api/ai-agent/transcribe", { method: "POST", body: formData });
      const result = await response.json();
      if (result.error) {
        toast({ title: t("aiAgent.voice.error"), description: result.error, variant: "destructive" });
      } else if (result.text) {
        setInput((prev) => prev + (prev ? " " : "") + result.text);
        toast({ title: t("aiAgent.voice.success"), description: t("aiAgent.voice.transcribed") });
      }
    } catch {
      toast({ title: t("aiAgent.voice.error"), description: t("aiAgent.voice.transcriptionError"), variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = candidates.find((m) => {
        try { return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m); } catch { return false; }
      });
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) { window.clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        const audioBlob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        if (audioBlob.size > 0) await transcribeAudio(audioBlob);
        setRecordingDuration(0);
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = window.setInterval(() => { setRecordingDuration((prev) => prev + 1); }, 1000);
    } catch {
      toast({ title: t("aiAgent.voice.error"), description: t("aiAgent.voice.microphoneError"), variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sendMessage = async (overrideInput?: string) => {
    const messageText = overrideInput ?? input;
    if ((!messageText.trim() && !selectedFile) || isLoading) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let messageContent = messageText.trim();
    let fileContent = "";
    let fileInfo: Message["fileInfo"] | undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadResponse = await fetch("/api/ai-agent/upload", { method: "POST", body: formData, signal: abortRef.current.signal });
        const uploadResult = await uploadResponse.json();
        if (uploadResult.error) {
          toast({ title: t("aiAgent.chat.error"), description: uploadResult.error, variant: "destructive" });
          setIsUploading(false);
          return;
        }
        fileContent = `\n\n[${t("aiAgent.chat.fileContent")} "${uploadResult.filename}":\n${uploadResult.content}]`;
        fileInfo = { filename: uploadResult.filename, mimetype: uploadResult.mimetype, size: uploadResult.size };
        clearFile();
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          toast({ title: t("aiAgent.chat.error"), description: t("aiAgent.chat.uploadError"), variant: "destructive" });
        }
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const fullContent = messageContent + fileContent;
    const now = new Date();
    const userMessage: Message = {
      role: "user",
      content: messageContent || `${t("aiAgent.chat.sentFile")} ${fileInfo?.filename}`,
      fileInfo,
      timestamp: now,
    };
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "", timestamp: new Date() }]);
    setInput("");
    setIsLoading(true);
    setTimeout(() => { textareaRef.current?.focus(); }, 100);

    try {
      const messagesForApi = [
        ...messagesRef.current.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: fullContent },
      ];
      const response = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForApi }),
        signal: abortRef.current.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const data = JSON.parse(raw);
            if (data.error) {
              toast({ title: t("aiAgent.chat.error"), description: data.error, variant: "destructive" });
              continue;
            }
            if (typeof data.content === "string") {
              finalContent = data.content;
              setMessages((prev) => {
                if (!prev.length) return prev;
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, content: finalContent }];
                return [...prev, { role: "assistant", content: finalContent }];
              });
            }
          } catch {}
        }
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast({ title: t("aiAgent.chat.error"), description: t("errors.somethingWentWrong"), variant: "destructive" });
      }
      setMessages((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) return [...prev.slice(0, -1), { ...last, content: t("errors.somethingWentWrong") }];
        return prev;
      });
    } finally {
      setIsLoading(false);
      scrollToBottomIfNeeded();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleSuggestionClick = (query: string) => {
    setInput(query);
    sendMessage(query);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] md:h-[calc(100vh-210px)] min-h-[450px] relative">
      <ScrollArea viewportRef={viewportRef} className="flex-1">
        <div
          className="p-3 md:p-5 space-y-4 md:space-y-5"
          dir="ltr"
          onScrollCapture={handleViewportScrollCapture}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 md:py-14 text-muted-foreground" dir="rtl">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-emerald-500/10 flex items-center justify-center mb-5 shadow-lg">
                <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-primary" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-foreground mb-1.5">
                {t("aiAgent.chat.welcome")}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm px-4">
                {t("aiAgent.chat.canHelpWith")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg px-2">
                {QUICK_SUGGESTIONS.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(item.query)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-primary/10 hover:border-primary/30 border border-border/40 transition-all duration-200 cursor-pointer text-center group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center group-hover:bg-primary/10 transition-colors shadow-sm">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-foreground/80 leading-tight">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-5 max-w-4xl mx-auto">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  msg={msg}
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {showScrollBtn && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-24 right-4 md:bottom-28 md:right-6 z-10 w-8 h-8 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all"
        >
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {selectedFile && (
        <div className="px-3 md:px-5 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/20 max-w-4xl mx-auto">
            {getFileIcon(selectedFile.type)}
            <span className="text-sm flex-1 truncate font-medium">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{formatFileSize(selectedFile.size)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 hover:bg-destructive/10 hover:text-destructive rounded-lg" onClick={clearFile}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="px-3 md:px-5 pt-2 border-t border-border/40">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 max-w-4xl mx-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">{t("aiAgent.voice.recording")}</span>
            <span className="text-sm text-red-600 dark:text-red-400 font-mono tabular-nums">{formatDuration(recordingDuration)}</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg px-3"
              onClick={stopRecording}
            >
              <Square className="h-3 w-3 mr-1 fill-current" />
              {t("aiAgent.voice.stop")}
            </Button>
          </div>
        </div>
      )}

      <div className="p-3 md:p-4 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 shadow-[0_-1px_0_0_hsl(var(--border)/0.4)]">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,.txt,.csv,.xlsx,.xls,.pdf,audio/*"
          className="hidden"
        />
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading || isRecording || isTranscribing}
              title="إرفاق ملف"
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </Button>
            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              className={`h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl transition-colors ${!isRecording ? 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isUploading || isTranscribing}
              title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
            >
              {isTranscribing ? <Loader2 className="h-5 w-5 animate-spin" /> : isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isTranscribing
                  ? t("aiAgent.voice.transcribing")
                  : isRecording
                  ? t("aiAgent.voice.recording")
                  : t("aiAgent.chat.placeholder")
              }
              dir="auto"
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-2 border-border/50 focus:border-primary/60 text-sm md:text-base pr-4 pl-4 py-3 bg-background transition-colors"
              disabled={isLoading || isRecording || isTranscribing}
              autoFocus
            />
          </div>

          <Button
            onClick={() => sendMessage()}
            disabled={(!input.trim() && !selectedFile) || isLoading || isRecording || isTranscribing}
            size="icon"
            className="h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl shadow-md transition-all hover:shadow-lg disabled:opacity-50"
            title="إرسال"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuotesHistory() {
  const { t } = useTranslation();
  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("ar-SA");
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount)) + " ر.س";
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      draft: { label: "مسودة", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
      sent: { label: "مُرسل", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
      approved: { label: "موافق عليه", className: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
      rejected: { label: "مرفوض", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
    };
    const s = map[status] || { label: status, className: "bg-gray-100 text-gray-700" };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.className}`}>{s.label}</span>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quotes?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground" dir="rtl">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 opacity-40" />
        </div>
        <p className="font-semibold text-base">{t("aiAgent.quotes.noQuotes")}</p>
        <p className="text-sm mt-2 text-center max-w-xs">{t("aiAgent.chat.useConversation")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-280px)] min-h-[400px]">
      <div className="space-y-3 p-3 md:p-5" dir="rtl">
        {quotes.map(quote => (
          <div
            key={quote.id}
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-border/50 bg-card hover:shadow-md hover:border-primary/20 transition-all duration-200"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm" dir="ltr">{quote.document_number}</span>
                  {getStatusBadge(quote.status || "draft")}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{quote.customer_name}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{formatDate(quote.quote_date || quote.created_at || new Date())}</p>
                <p className="font-bold text-primary text-sm" dir="ltr">{formatCurrency(quote.total_with_tax)}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg text-xs h-8 px-3 flex-shrink-0 hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, "_blank")}
              >
                <Download className="h-3 w-3 mr-1" />
                {t("aiAgent.quotes.download")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function AiAgentPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");

  return (
    <PageLayout
      title={t("aiAgent.title")}
      description={t("aiAgent.description")}
    >
      <div className="max-w-5xl mx-auto" dir="rtl">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === "chat"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            {t("aiAgent.tabs.chat")}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 sm:flex-none justify-center sm:justify-start ${
              activeTab === "history"
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-4 w-4" />
            {t("aiAgent.tabs.quotesHistory")}
          </button>
        </div>

        <div className="border border-border/50 rounded-2xl overflow-hidden shadow-sm bg-card">
          {activeTab === "chat" ? (
            <ChatPanel />
          ) : (
            <QuotesHistory />
          )}
        </div>
      </div>
    </PageLayout>
  );
}
