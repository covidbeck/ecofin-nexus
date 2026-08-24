"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { fetchFaq, sendCopilotMessage } from "@/lib/api";

type Message = { role: "user" | "assistant"; text: string };

export function CopilotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const faqQuery = useQuery({ queryKey: ["copilot-faq"], queryFn: fetchFaq, enabled: open });

  const ask = async (text: string) => {
    if (!text.trim() || busy) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setBusy(true);
    try {
      const response = await sendCopilotMessage(text);
      setMessages((prev) => [...prev, { role: "assistant", text: response.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Не получилось получить ответ. Попробуйте ещё раз или загляните в FAQ.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Открыть Copilot"
        className="fixed bottom-6 right-6 z-40 flex h-13 w-13 items-center justify-center rounded-full bg-lime-100 p-4 text-lg font-semibold text-emerald-950 shadow-[0_0_28px_rgba(190,242,100,0.45)] transition hover:bg-white"
      >
        {open ? "✕" : "?"}
      </button>

      {open ? (
        <div className="card fixed bottom-24 right-6 z-40 flex max-h-[70vh] w-[22rem] flex-col overflow-hidden animate-fade-in">
          <div className="border-b border-lime-100/15 bg-emerald-900/70 px-4 py-3">
            <p className="text-sm font-semibold text-lime-100">Nexus Copilot</p>
            <p className="text-xs text-emerald-100/80">
              Объясняет подтверждённые расчёты. Не считает числа и не меняет данные.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Быстрые вопросы
                </p>
                {(faqQuery.data?.items ?? []).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => ask(item.question)}
                    className="rounded-2xl border border-lime-100/20 px-3 py-2 text-left text-sm text-emerald-50 transition hover:bg-white/10"
                  >
                    {item.question}
                  </button>
                ))}
                {faqQuery.isLoading ? (
                  <p className="text-sm text-slate-400">Загружаем FAQ…</p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      message.role === "user"
                        ? "self-end bg-lime-100 text-emerald-950"
                        : "self-start bg-emerald-950/50 text-emerald-50"
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
                {busy ? <p className="text-xs text-slate-400">Copilot печатает…</p> : null}
              </div>
            )}
          </div>

          <form
            className="flex gap-2 border-t border-gray-100 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void ask(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Вопрос о ваших данных…"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-primary disabled:opacity-50"
            >
              →
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
