// src/components/AiChat.jsx
import { useState } from "react";
import { MessageCircle, Send, X, Bot, Loader2 } from "lucide-react";
import { AI } from "../services/api";

export default function AiChat() {
  const [open, setOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! Ask about your loans: try 'How many active loans?'" },
  ]);

  const ask = async () => {
    const text = q.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setQ("");
    setLoading(true);
    try {
      const res = await AI.ask(text);
      const answer = res?.answer || "No answer.";
      setMessages((m) => [...m, { role: "bot", text: answer }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "Server error. Is backend running at /api/ai/query/ ?" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-white shadow-lg hover:bg-blue-500"
        >
          <MessageCircle size={18} /> AI
        </button>
      ) : (
        <div className="w-[340px] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-2">
            <div className="flex items-center gap-2 text-sm text-neutral-300">
              <Bot size={16} /> LoanX AI
            </div>
            <button className="text-neutral-400 hover:text-white" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-y-auto p-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 ${
                  m.role === "user"
                    ? "ml-auto max-w-[80%] bg-blue-600 text-white"
                    : "mr-auto max-w-[90%] bg-neutral-900 text-neutral-200"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="mr-auto flex max-w-[90%] items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-neutral-200">
                <Loader2 className="animate-spin" size={16} /> thinking...
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-neutral-800 p-2">
            <input
              className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm outline-none"
              placeholder="Ask about customers, loans, payments…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
            />
            <button
              onClick={ask}
              className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-500"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}