import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTED = [
  "What are the most dangerous areas reported in the last 7 days?",
  "Which crime category is rising fastest?",
  "I'm walking home alone at 10pm in HSR Layout. What should I watch for?",
  "Summarise all vehicle thefts and look for a common modus operandi.",
];

const Sentinel = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    setInput("");

    const userMsg: Msg = { role: "user", content };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const { data: incidents } = await supabase
        .from("incidents")
        .select("title,category,severity,description,city,area,occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(80);

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sentinel-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          incidents: incidents ?? [],
        }),
      });

      if (resp.status === 429) { toast.error("Rate limit. Wait a moment."); setLoading(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted."); setLoading(false); return; }
      if (!resp.ok || !resp.body) throw new Error("AI gateway error");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantSoFar = "";
      let done = false;

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
          }
          return [...prev, { role: "assistant", content: assistantSoFar }];
        });
      };

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Sentinel offline");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 container py-6 md:py-8 max-w-4xl flex flex-col animate-fade-in">
        <div className="mb-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary mb-1">// sentinel.ai</div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            Sentinel <Sparkles className="h-5 w-5 text-primary text-glow" />
          </h1>
          <p className="text-sm text-muted-foreground">
            Unfiltered crime intelligence analyst. Trained on Bharatiya Nyaya Sanhita 2023, briefed on live citizen signals.
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 panel p-5 overflow-y-auto space-y-4 min-h-[400px] max-h-[60vh]">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Ask me anything about the live signal feed:</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {SUGGESTED.map((s) => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left text-sm p-3 border border-border rounded-md hover:bg-surface-elevated hover:border-primary/40 transition-all">
                    <Sparkles className="h-3 w-3 text-primary inline-block mr-1.5" />{s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-md px-4 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary/15 text-foreground border border-primary/30"
                  : "bg-surface-elevated border border-border"
              }`}>
                {m.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-1.5 prose-strong:text-primary">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-2 items-center text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Sentinel is thinking…
            </div>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-4 flex gap-2">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask Sentinel… (Shift+Enter = newline)"
            className="resize-none min-h-[52px] font-mono text-sm" rows={1} />
          <Button type="submit" disabled={loading || !input.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary-glow shadow-glow self-stretch px-5">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </main>
    </div>
  );
};

export default Sentinel;
