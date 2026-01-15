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
import { Bot, Send, FileText, Loader2, Download, History, User, Paperclip, X, Image, FileSpreadsheet, File } from "lucide-react";
import type { Quote } from "../../../shared/schema";

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
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: t("aiAgent.chat.error"), description: t("aiAgent.chat.fileSizeError"), variant: "destructive" });
        return;
      }
      setSelectedFile(file);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) return <FileSpreadsheet className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} ${t("aiAgent.fileUpload.bytes")}`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t("aiAgent.fileUpload.kb")}`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} ${t("aiAgent.fileUpload.mb")}`;
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    let messageContent = input.trim();
    let fileContent = "";
    let fileInfo: Message["fileInfo"] | undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        
        const uploadResponse = await fetch("/api/ai-agent/upload", {
          method: "POST",
          body: formData,
        });
        
        const uploadResult = await uploadResponse.json();
        if (uploadResult.error) {
          toast({ title: t("aiAgent.chat.error"), description: uploadResult.error, variant: "destructive" });
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
      } catch (error) {
        toast({ title: t("aiAgent.chat.error"), description: t("aiAgent.chat.uploadError"), variant: "destructive" });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const fullContent = messageContent + fileContent;
    const userMessage: Message = { 
      role: "user", 
      content: messageContent || `${t("aiAgent.chat.sentFile")} ${fileInfo?.filename}`,
      fileInfo 
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const messagesForApi = [...messages, { role: "user" as const, content: fullContent }];
      const response = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForApi }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === "assistant") {
                    return [...prev.slice(0, -1), { ...last, content: data.content }];
                  }
                  return [...prev, { role: "assistant", content: data.content }];
                });
              }
              if (data.error) {
                toast({ title: t("aiAgent.chat.error"), description: data.error, variant: "destructive" });
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      toast({ title: t("aiAgent.chat.error"), description: t("errors.somethingWentWrong"), variant: "destructive" });
    } finally {
      setIsLoading(false);
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
      <ScrollArea ref={scrollRef} className="flex-1 p-4 space-y-4">
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
              <div key={idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {msg.fileInfo && (
                    <div className="flex items-center gap-2 mb-2 p-2 rounded bg-black/10 dark:bg-white/10">
                      {getFileIcon(msg.fileInfo.mimetype)}
                      <span className="text-xs font-medium">{msg.fileInfo.filename}</span>
                      <span className="text-xs opacity-70">({formatFileSize(msg.fileInfo.size)})</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
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
      </ScrollArea>
      <Separator />
      {selectedFile && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted">
            {getFileIcon(selectedFile.type)}
            <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={clearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      <div className="p-4 flex gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,.txt,.csv,.xlsx,.xls,.pdf"
          className="hidden"
        />
        <Button 
          variant="outline" 
          size="icon" 
          className="h-[60px] w-[60px] shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading || isUploading}
        >
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
        </Button>
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("aiAgent.chat.placeholder")}
          className="min-h-[60px] resize-none"
          disabled={isLoading}
        />
        <Button onClick={sendMessage} disabled={(!input.trim() && !selectedFile) || isLoading} size="icon" className="h-[60px] w-[60px]">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
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
