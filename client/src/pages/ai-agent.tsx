import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Bot, Send, FileText, Loader2, Download, History, User, Paperclip, X, Image, FileSpreadsheet, File, Mic, MicOff, Square } from "lucide-react";
import type { Quote } from "../../../shared/schema";

// Function to render text with clickable links (supports both raw URLs and Markdown links)
function renderTextWithLinks(text: string) {
  const parts: { type: 'text' | 'link'; content: string; label?: string }[] = [];
  
  // Combined regex for Markdown links [text](url) and raw URLs
  const combinedRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>"{}|\\^`[\]]+?)(?=[)\],.:;!?\s]|$)/g;
  let lastIndex = 0;
  let match;
  
  while ((match = combinedRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    
    if (match[1] && match[2]) {
      // Markdown link: [label](url)
      parts.push({ type: 'link', content: match[2], label: match[1] });
      lastIndex = match.index + match[0].length;
    } else if (match[3]) {
      // Raw URL
      parts.push({ type: 'link', content: match[3] });
      lastIndex = match.index + match[3].length;
    }
  }
  
  // Add remaining text
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
          className="text-blue-500 hover:text-blue-600 underline break-all inline-flex items-center gap-1"
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
  fileInfo?: {
    filename: string;
    mimetype: string;
    size: number;
  };
}

function ChatPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Radix: لازم ref على Viewport نفسه
  const viewportRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ذكي: فقط لو المستخدم قريب من أسفل
  const shouldAutoScrollRef = useRef(true);
  const handleViewportScrollCapture = () => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 150;
  };

  const scrollToBottomIfNeeded = () => {
    const el = viewportRef.current;
    if (!el) return;
    if (shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottomIfNeeded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Abort controller لمنع تداخل الطلبات
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // ====== التسجيل الصوتي ======
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ملاحظة: عندك في السيرفر 25MB، لكن هنا 10MB. خليهم متطابقين (اختيارياً)
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: t("aiAgent.chat.error"),
        description: t("aiAgent.chat.fileSizeError"),
        variant: "destructive",
      });
      return;
    }
    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimetype.includes("spreadsheet") || mimetype.includes("excel"))
      return <FileSpreadsheet className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} ${t("aiAgent.fileUpload.bytes")}`;
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(1)} ${t("aiAgent.fileUpload.kb")}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t("aiAgent.fileUpload.mb")}`;
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/ai-agent/transcribe", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.error) {
        toast({
          title: t("aiAgent.voice.error"),
          description: result.error,
          variant: "destructive",
        });
      } else if (result.text) {
        setInput((prev) => prev + (prev ? " " : "") + result.text);
        toast({
          title: t("aiAgent.voice.success"),
          description: t("aiAgent.voice.transcribed"),
        });
      }
    } catch {
      toast({
        title: t("aiAgent.voice.error"),
        description: t("aiAgent.voice.transcriptionError"),
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // fallback mimeType
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = candidates.find((m) => {
        try {
          return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m);
        } catch {
          return false;
        }
      });

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        if (recordingTimerRef.current) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }

        const audioBlob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        if (audioBlob.size > 0) await transcribeAudio(audioBlob);

        setRecordingDuration(0);
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: t("aiAgent.voice.error"),
        description: t("aiAgent.voice.microphoneError"),
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // ====== الإرسال ======
  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    // ألغِ أي طلب سابق (مهم جداً مع SSE/stream)
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let messageContent = input.trim();
    let fileContent = "";
    let fileInfo: Message["fileInfo"] | undefined;

    // 1) رفع الملف (اختياري)
    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadResponse = await fetch("/api/ai-agent/upload", {
          method: "POST",
          body: formData,
          signal: abortRef.current.signal,
        });

        const uploadResult = await uploadResponse.json();
        if (uploadResult.error) {
          toast({
            title: t("aiAgent.chat.error"),
            description: uploadResult.error,
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        fileContent = `\n\n[${t("aiAgent.chat.fileContent")} "${uploadResult.filename}":\n${uploadResult.content}]`;
        fileInfo = {
          filename: uploadResult.filename,
          mimetype: uploadResult.mimetype,
          size: uploadResult.size,
        };

        clearFile();
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          toast({
            title: t("aiAgent.chat.error"),
            description: t("aiAgent.chat.uploadError"),
            variant: "destructive",
          });
        }
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const fullContent = messageContent + fileContent;

    // 2) أضف رسالة المستخدم + placeholder للمساعد (حتى يظهر “يكتب”)
    const userMessage: Message = {
      role: "user",
      content: messageContent || `${t("aiAgent.chat.sentFile")} ${fileInfo?.filename}`,
      fileInfo,
    };

    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);

    try {
      const messagesForApi = [
        ...messagesRef.current.map((m) => ({ role: m.role, content: m.content })), // تجاهل fileInfo في السياق
        { role: "user" as const, content: fullContent },
      ];

      const response = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForApi }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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
              toast({
                title: t("aiAgent.chat.error"),
                description: data.error,
                variant: "destructive",
              });
              continue;
            }

            // السيرفر عندك يرسل content كامل مرة واحدة غالباً
            if (typeof data.content === "string") {
              finalContent = data.content;

              setMessages((prev) => {
                if (!prev.length) return prev;
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return [...prev.slice(0, -1), { ...last, content: finalContent }];
                }
                return [...prev, { role: "assistant", content: finalContent }];
              });
            }

            if (data.done) {
              // انتهى
            }
          } catch {
            // تجاهل أسطر غير صالحة
          }
        }
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast({
          title: t("aiAgent.chat.error"),
          description: t("errors.somethingWentWrong"),
          variant: "destructive",
        });
      }
      // لو فشل الطلب اكتب رسالة خطأ مكان placeholder
      setMessages((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) {
          return [...prev.slice(0, -1), { ...last, content: t("errors.somethingWentWrong") }];
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
      scrollToBottomIfNeeded();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[600px]">
      <ScrollArea
        viewportRef={viewportRef}
        className="flex-1"
      >
        <div
          className="p-4 space-y-4"
          onScrollCapture={handleViewportScrollCapture}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">{t("aiAgent.chat.welcome")}</p>
              <p className="text-sm mt-2">{t("aiAgent.chat.canHelpWith")}</p>
              <ul className="text-sm mt-2 space-y-1 text-center">
                <li>• {t("aiAgent.chat.helpItems.orders")}</li>
                <li>• {t("aiAgent.chat.helpItems.production")}</li>
                <li>• {t("aiAgent.chat.helpItems.quotes")}</li>
                <li>• {t("aiAgent.chat.helpItems.whatsapp")}</li>
                <li>• {t("aiAgent.chat.helpItems.files")}</li>
              </ul>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {msg.fileInfo && (
                      <div className="flex items-center gap-2 mb-2 p-2 rounded bg-black/10 dark:bg-white/10">
                        {getFileIcon(msg.fileInfo.mimetype)}
                        <span className="text-xs font-medium">{msg.fileInfo.filename}</span>
                        <span className="text-xs opacity-70">
                          ({formatFileSize(msg.fileInfo.size)})
                        </span>
                      </div>
                    )}

                    <div className="whitespace-pre-wrap text-sm">
                      {renderTextWithLinks(msg.content)}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <Separator />

      {selectedFile && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
            {getFileIcon(selectedFile.type)}
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(selectedFile.size)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">
              {t("aiAgent.voice.recording")}
            </span>
            <span className="text-sm text-red-600 dark:text-red-400 font-mono">
              {formatDuration(recordingDuration)}
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
              onClick={stopRecording}
            >
              <Square className="h-4 w-4 mr-1" />
              {t("aiAgent.voice.stop")}
            </Button>
          </div>
        </div>
      )}

      <div className="p-4 flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,.txt,.csv,.xlsx,.xls,.pdf,audio/*"
          className="hidden"
        />

        <Button
          variant="outline"
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploading || isRecording || isTranscribing}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </Button>

        <Button
          variant={isRecording ? "destructive" : "outline"}
          size="icon"
          className="h-[60px] w-[60px] shrink-0"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isLoading || isUploading || isTranscribing}
        >
          {isTranscribing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-5 w-5" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isTranscribing ? t("aiAgent.voice.transcribing") : t("aiAgent.chat.placeholder")
          }
          className="min-h-[60px] resize-none"
          disabled={isLoading || isRecording || isTranscribing}
        />

        <Button
          onClick={sendMessage}
          disabled={(!input.trim() && !selectedFile) || isLoading || isRecording || isTranscribing}
          size="icon"
          className="h-[60px] w-[60px]"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
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
    return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(Number(amount));
  };

  const handleDownloadPdf = async (quoteId: number) => {
    window.open(`/api/quotes/${quoteId}/pdf`, "_blank");
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
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <FileText className="h-16 w-16 mb-4 opacity-50" />
        <p>{t("aiAgent.quotes.noQuotes")}</p>
        <p className="text-sm mt-2">{t("aiAgent.chat.useConversation")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4 p-4">
        {quotes.map(quote => (
          <Card key={quote.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{quote.document_number}</CardTitle>
                <Badge variant={quote.status === "draft" ? "secondary" : "default"}>
                  {quote.status === "draft" ? t("aiAgent.quotes.draft") : quote.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">{t("aiAgent.quotes.customer")}: </span>
                  <span className="font-medium">{quote.customer_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("aiAgent.quotes.date")}: </span>
                  <span>{formatDate(quote.quote_date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("aiAgent.quotes.taxNumber")}: </span>
                  <span className="font-mono">{quote.tax_number}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">{t("aiAgent.quotes.total")}: </span>
                  <span className="font-bold text-primary">{formatCurrency(quote.total_with_tax)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(quote.id)}>
                  <Download className="h-4 w-4 ml-1" />
                  {t("aiAgent.quotes.download")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function AiAgentPage() {
  const { t } = useTranslation();

  return (
    <PageLayout
      title={t("aiAgent.title")}
      description={t("aiAgent.description")}
    >
      <div className="container mx-auto py-6 px-4">
        <Tabs defaultValue="chat" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="chat" className="gap-2">
              <Bot className="h-4 w-4" />
              {t("aiAgent.tabs.chat")}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              {t("aiAgent.tabs.quotesHistory")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  {t("aiAgent.chat.chatWithAgent")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChatPanel />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t("aiAgent.quotes.recentQuotes")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <QuotesHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}
