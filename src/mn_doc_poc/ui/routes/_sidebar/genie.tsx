import { createFileRoute } from "@tanstack/react-router";
import { useGenieAsk } from "@/lib/api";
import { usePersona } from "@/lib/persona-context";
import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Send, Zap, Database, Clock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/_sidebar/genie")({
  component: GeniePage,
});

const PERSONA_CONTEXT: Record<string, {
  title: string;
  description: string;
  suggestions: string[];
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
}> = {
  consumer: {
    title: "Genie — Facility Assistant",
    description: "Ask questions about clients and programs at your assigned facility. Your view is scoped to Facility A with PII protections applied.",
    badge: "Facility A Scope",
    badgeVariant: "outline",
    suggestions: [
      "How many clients are in Reintegration at Facility A?",
      "Which programs have the highest completion rates?",
      "What is the average risk score for clients in my facility?",
      "How many incidents occurred this month?",
    ],
  },
  super_viewer: {
    title: "Genie — Commissioner View",
    description: "Cross-facility analytics with full PII access. You can query any client record, facility, or system-wide metric.",
    badge: "PII Unlocked",
    badgeVariant: "destructive",
    suggestions: [
      "Show me recidivism rates across all facilities",
      "Which clients have the highest risk scores system-wide?",
      "Compare program outcomes between facilities",
      "What is the overall SLA compliance for data pipelines?",
    ],
  },
  engineer: {
    title: "Genie — Data Engineering Assistant",
    description: "Query pipeline health, data quality metrics, and Delta Lake lineage. PII is masked — focus is on infrastructure and data flows.",
    badge: "Pipeline Access",
    badgeVariant: "secondary",
    suggestions: [
      "What is the current pipeline health status?",
      "Show me error counts for Bronze ingestion tables",
      "Which Silver tables have the highest latency?",
      "How many records were processed today?",
    ],
  },
  domain_advisor: {
    title: "Genie — Governance Assistant",
    description: "Explore Unity Catalog policies, data lineage, and compliance settings. You have governance access across all facilities.",
    badge: "Governance Access",
    badgeVariant: "secondary",
    suggestions: [
      "Which tables have PII masking policies applied?",
      "Show me the data lineage for the client risk model",
      "What are the current row-level security policies?",
      "Which columns are classified as sensitive?",
    ],
  },
  analyst: {
    title: "Genie — Analytics Assistant",
    description: "Deep-dive into program effectiveness, risk models, and population trends. MLflow model metrics and Gold layer tables are available.",
    badge: "Analytics Access",
    badgeVariant: "secondary",
    suggestions: [
      "Which rehabilitation programs reduce recidivism most?",
      "Show me the risk score distribution by facility",
      "What factors correlate with successful reintegration?",
      "How has the high-risk population trended over the last 6 months?",
    ],
  },
};

type Message =
  | { role: "user"; text: string }
  | { role: "genie"; answer: string; sources: { table: string; rows_scanned: number }[]; suggested_followups: string[]; execution_time_ms: number; confidence: number; access_note: string; animating: boolean };

export default function GeniePage() {
  const { persona } = usePersona();
  const ctx = PERSONA_CONTEXT[persona] ?? PERSONA_CONTEXT.consumer;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [displayedText, setDisplayedText] = useState<Record<number, string>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useGenieAsk();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayedText]);

  function typewriter(text: string, msgIndex: number) {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayedText(prev => ({ ...prev, [msgIndex]: text.slice(0, i) }));
      if (i >= text.length) {
        clearInterval(interval);
        setMessages(prev => prev.map((m, idx) =>
          idx === msgIndex && m.role === "genie" ? { ...m, animating: false } : m
        ));
      }
    }, 12);
  }

  function submit(question: string) {
    if (!question.trim()) return;
    const userMsg: Message = { role: "user", text: question };
    setMessages(prev => [...prev, userMsg]);
    setInput("");

    mutation.mutate(
      { question, persona },
      {
        onSuccess: (resp) => {
          const d = resp.data;
          const genieMsg: Message = {
            role: "genie",
            answer: d.answer,
            sources: d.sources,
            suggested_followups: d.suggested_followups,
            execution_time_ms: d.execution_time_ms,
            confidence: d.confidence,
            access_note: d.access_note,
            animating: true,
          };
          setMessages(prev => {
            const newMsgs = [...prev, genieMsg];
            const idx = newMsgs.length - 1;
            setTimeout(() => typewriter(d.answer, idx), 50);
            return newMsgs;
          });
        },
      }
    );
  }

  const isLoading = mutation.isPending;
  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-2rem)] p-4 gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot size={20} className="text-primary" />
            <h1 className="text-lg font-semibold">{ctx.title}</h1>
            <Badge variant={ctx.badgeVariant} className="text-[10px] h-4 px-1.5">{ctx.badge}</Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xl">{ctx.description}</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {!hasMessages && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {ctx.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="text-left text-xs p-3 rounded-lg border border-border bg-muted/50 hover:bg-muted hover:border-primary/30 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end">
                <div className="flex items-start gap-2 max-w-[75%]">
                  <div className="bg-primary text-primary-foreground text-sm px-3 py-2 rounded-2xl rounded-tr-sm">
                    {msg.text}
                  </div>
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={12} />
                  </div>
                </div>
              </div>
            );
          }

          const shown = msg.animating ? (displayedText[i] ?? "") : msg.answer;

          return (
            <div key={i} className="flex justify-start">
              <div className="flex items-start gap-2 max-w-[85%]">
                <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot size={12} className="text-orange-600 dark:text-orange-400" />
                </div>
                <div className="space-y-2 flex-1">
                  <Card className="border-orange-200/60 dark:border-orange-900/40">
                    <CardContent className="p-3">
                      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:text-sm prose-headings:font-semibold prose-headings:my-1 prose-code:text-xs prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-strong:font-semibold">
                        <Markdown remarkPlugins={[remarkGfm]} components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2">
                              <table className="w-full text-xs border-collapse">{children}</table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border border-border bg-muted px-2 py-1 text-left font-semibold">{children}</th>
                          ),
                          td: ({ children }) => (
                            <td className="border border-border px-2 py-1">{children}</td>
                          ),
                        }}>{shown}</Markdown>
                        {msg.animating && (
                          <span className="inline-block w-1 h-3.5 bg-primary ml-0.5 animate-pulse align-text-bottom" />
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {!msg.animating && (
                    <>
                      {/* Metadata row */}
                      <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground px-1">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {msg.execution_time_ms}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap size={10} />
                          {Math.round(msg.confidence * 100)}% confidence
                        </span>
                        <span className="flex items-center gap-1">
                          <Database size={10} />
                          {msg.sources.length} table{msg.sources.length !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Sources */}
                      {msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-1">
                          {msg.sources.map((src) => (
                            <span key={src.table} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">
                              {src.table} ({src.rows_scanned.toLocaleString()} rows)
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Access note */}
                      {msg.access_note && (
                        <div className="flex items-start gap-1.5 px-1">
                          <ShieldCheck size={10} className="text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-[10px] text-muted-foreground">{msg.access_note}</span>
                        </div>
                      )}

                      {/* Follow-up suggestions */}
                      {msg.suggested_followups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 px-1 pt-1">
                          {msg.suggested_followups.map((q) => (
                            <button
                              key={q}
                              onClick={() => submit(q)}
                              className="text-[11px] px-2 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center">
                <Bot size={12} className="text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex gap-1 px-3 py-2 rounded-2xl bg-muted">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="flex gap-2 items-center border border-border rounded-xl px-3 py-2 bg-background focus-within:border-primary/50 transition-colors">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(input); } }}
          placeholder="Ask Genie a question…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          disabled={isLoading}
        />
        <button
          onClick={() => submit(input)}
          disabled={isLoading || !input.trim()}
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
            input.trim() && !isLoading
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}
