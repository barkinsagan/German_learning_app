import { useState, useRef, useEffect } from "react";
import { API_BASE } from "../config";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const DIFFICULTIES = ["A1", "A2", "B1", "B2"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

export function Vocabulary() {
  const [phase, setPhase] = useState<"idle" | "chat">("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("A1");
  const [messages, setMessages] = useState<Message[]>([]);
  const [wordListSnapshot, setWordListSnapshot] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function startSession() {
    setPhase("chat");
    setMessages([]);
    setWordListSnapshot("");
    setError(null);
    await callBackend([], "", difficulty);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    await callBackend(next, wordListSnapshot, difficulty);
  }

  async function callBackend(
    history: Message[],
    snapshot: string,
    diff: string
  ) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/vocabulary/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          difficulty: diff,
          count: 10,
          wordListSnapshot: snapshot || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? "Unknown error");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: json.data.reply },
      ]);
      if (json.data.wordListSnapshot) {
        setWordListSnapshot(json.data.wordListSnapshot);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function resetSession() {
    setPhase("idle");
    setMessages([]);
    setWordListSnapshot("");
    setInput("");
    setError(null);
  }

  if (phase === "idle") {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              Vokabeln — Vocabulary
            </h1>
            <p className="text-text-secondary mt-1 text-sm">
              Practice vocabulary with an AI tutor. One word at a time, with
              instant feedback.
            </p>
          </div>
        </div>

        <div className="card space-y-6">
          <div>
            <p className="text-sm font-medium text-text-primary mb-3">
              Choose your level
            </p>
            <div className="flex gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${
                    difficulty === d
                      ? "bg-accent-muted text-accent border-accent/30"
                      : "bg-surface-raised text-text-secondary border-white/10 hover:border-accent/20 hover:text-text-primary"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn-primary w-full py-3"
            onClick={startSession}
          >
            Start Practice Session
          </button>
        </div>

        <div className="card border-dashed border-white/10 space-y-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            How it works
          </p>
          <ul className="space-y-1.5 text-sm text-text-secondary">
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">1.</span>
              The tutor picks 10 random words from the database at your chosen
              level.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">2.</span>
              For each word you'll translate it and write an original German
              sentence.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent mt-0.5">3.</span>
              Get instant feedback on grammar, word order, and conjugation.
            </li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-fade-in">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Vokabeln — Vocabulary
          </h1>
          <p className="text-text-secondary mt-0.5 text-sm">
            Level {difficulty} · 10 words · AI tutor session
          </p>
        </div>
        <button className="btn-ghost text-xs py-1.5" onClick={resetSession}>
          New Session
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-accent-muted border border-accent/20 flex items-center justify-center shrink-0 text-xs font-bold text-accent">
              T
            </div>
            <div className="card py-3 px-4 max-w-xl">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="card border-error/20 bg-error/5 text-error text-sm py-3 px-4">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 pt-3 border-t border-white/5">
        <div className="flex gap-3 items-end">
          <textarea
            ref={inputRef}
            className="flex-1 bg-surface border border-white/10 rounded-lg px-4 py-3 text-sm text-text-primary resize-none focus:outline-none focus:border-accent/50 transition-colors placeholder:text-text-muted"
            rows={2}
            placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button
            className="btn-primary px-5 py-3 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={!input.trim() || loading}
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
        <p className="text-xs text-text-muted mt-2 text-center">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
          isUser
            ? "bg-surface-raised text-text-secondary"
            : "bg-accent-muted border border-accent/20 text-accent"
        }`}
      >
        {isUser ? "You" : "T"}
      </div>
      <div
        className={`card py-3 px-4 max-w-xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-surface-raised border-white/10 text-text-primary"
            : "text-text-primary"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}
