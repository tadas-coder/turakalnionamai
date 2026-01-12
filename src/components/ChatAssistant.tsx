import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, X, Send, Bot, User, Loader2, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface DocumentInfo {
  name: string;
  content: string;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-assistant`;

export function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedDocument, setUploadedDocument] = useState<DocumentInfo | null>(null);
  const [isParsingDocument, setIsParsingDocument] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Listen for custom event to open chat assistant
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };
    window.addEventListener("openChatAssistant", handleOpenChat);
    return () => window.removeEventListener("openChatAssistant", handleOpenChat);
  }, []);

  // Parse document content
  const parseDocument = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Handle text files directly
    if (fileType.startsWith("text/") || fileName.endsWith(".txt") || fileName.endsWith(".md")) {
      return await file.text();
    }

    // Handle JSON files
    if (fileType === "application/json" || fileName.endsWith(".json")) {
      const text = await file.text();
      try {
        const parsed = JSON.parse(text);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return text;
      }
    }

    // For other files (PDF, DOCX), we'll use a simple text extraction approach
    if (fileType === "application/pdf" || fileName.endsWith(".pdf")) {
      throw new Error("PDF failų skaitymas reikalauja papildomo apdorojimo. Prašome įkelti tekstinį failą (.txt, .md).");
    }

    // Try reading as text for other file types
    try {
      return await file.text();
    } catch {
      throw new Error("Nepavyko perskaityti failo turinio.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 1MB for text content)
    if (file.size > 1024 * 1024) {
      toast.error("Failas per didelis. Maksimalus dydis: 1MB");
      return;
    }

    setIsParsingDocument(true);
    try {
      const content = await parseDocument(file);
      setUploadedDocument({
        name: file.name,
        content: content,
      });
      toast.success(`Dokumentas "${file.name}" įkeltas sėkmingai!`);
      
      // Add system message about the document
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `📄 Dokumentas "${file.name}" įkeltas. Dabar galite užduoti klausimus apie jo turinį!`
      }]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nepavyko įkelti dokumento");
    } finally {
      setIsParsingDocument(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeDocument = () => {
    setUploadedDocument(null);
    setMessages(prev => [...prev, {
      role: "assistant",
      content: "📄 Dokumentas pašalintas. Galite įkelti naują dokumentą arba tęsti pokalbį."
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    let assistantContent = "";

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          documentContent: uploadedDocument?.content || null,
          documentName: uploadedDocument?.name || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Nepavyko gauti atsakymo");
      }

      if (!response.body) {
        throw new Error("Nėra atsakymo srauto");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                return updated;
              });
            }
          } catch {
            // Incomplete JSON, wait for more data
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast.error(error instanceof Error ? error.message : "Klaida siunčiant žinutę");
      // Remove the empty assistant message if there was an error
      if (!assistantContent) {
        setMessages((prev) => prev.slice(0, -1));
      }
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
    <>
      {/* Floating button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl z-50 bg-primary hover:bg-primary/90 border-4 border-primary-foreground/20 transition-all duration-200 hover:scale-105"
        size="icon"
      >
        {isOpen ? <X className="h-7 w-7" /> : <MessageCircle className="h-7 w-7" />}
      </Button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,.csv,.xml"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Chat window */}
      {isOpen && (
        <Card className="fixed bottom-24 right-6 w-[360px] max-w-[calc(100vw-3rem)] h-[550px] max-h-[calc(100vh-8rem)] shadow-2xl z-50 flex flex-col animate-fade-in">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5 text-primary" />
              Virtualus asistentas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Document upload indicator */}
            {uploadedDocument && (
              <div className="px-4 py-2 bg-primary/5 border-b flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {uploadedDocument.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={removeDocument}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            )}
            
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-6">
                  <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">Sveiki! Kaip galiu padėti?</p>
                  <p className="text-xs mt-2 mb-4">Klauskite apie namo valdymą, pranešimus, sąskaitas ir kt.</p>
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <FileText className="h-3 w-3" />
                      Įkelti dokumentą
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      {message.role === "assistant" && (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {message.content || (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                      </div>
                      {message.role === "user" && (
                        <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || isParsingDocument}
                  title="Įkelti dokumentą"
                  className="flex-shrink-0"
                >
                  {isParsingDocument ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </Button>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Rašykite klausimą..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button onClick={sendMessage} disabled={isLoading || !input.trim()} size="icon">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}