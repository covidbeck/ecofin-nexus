"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ApiError, fetchFaq, sendChatMessage } from "@/lib/api";
import type { FaqItem } from "@/lib/types";

type Message = {
  id: number;
  author: "user" | "assistant";
  text: string;
};

// Quick prompts from the UI spec, matched against the FAQ ids served by the API.
const QUICK_PROMPT_IDS = ["savings", "ecology", "esg_damu"] as const;
const QUICK_PROMPT_LABELS: Record<string, string> = {
  savings: "Сколько я сэкономлю?",
  ecology: "Как мы помогаем экологии РК?",
  esg_damu: "Что такое ESG-отчет для Даму?",
};

const GREETING =
  "Здравствуйте! Я виртуальный консультант Nexus. Спросите про экономию, экологию или ESG-отчёт для фонда «Даму».";

const FALLBACK_REPLY =
  "Сейчас не получилось обратиться к ассистенту. Попробуйте ещё раз чуть позже.";

export function AiFaqWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, author: "assistant", text: GREETING },
  ]);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const faqQuery = useQuery({
    queryKey: ["faq"],
    queryFn: fetchFaq,
    enabled: isOpen,
    staleTime: Infinity,
    retry: 0,
  });

  const appendMessage = (author: Message["author"], text: string) => {
    setMessages((current) => [...current, { id: nextId.current++, author, text }]);
  };

  const chatMutation = useMutation({
    mutationKey: ["chat"],
    mutationFn: sendChatMessage,
    onSuccess: (data) => appendMessage("assistant", data?.reply ?? FALLBACK_REPLY),
    onError: (error: unknown) =>
      appendMessage(
        "assistant",
        error instanceof ApiError || error instanceof Error ? error.message : FALLBACK_REPLY,
      ),
  });

  useEffect(() => {
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isOpen, chatMutation.isPending]);

  const faqItems = faqQuery.data?.items ?? [];
  const quickPrompts: FaqItem[] = QUICK_PROMPT_IDS.map((id) => {
    const match = faqItems.find((item) => item?.id === id);
    return {
      id,
      question: QUICK_PROMPT_LABELS[id],
      answer: match?.answer ?? "",
    };
  });

  const handleQuickPrompt = (item: FaqItem) => {
    appendMessage("user", item.question);
    if (item.answer) {
      appendMessage("assistant", item.answer);
      return;
    }
    chatMutation.mutate(item.question);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = input.trim();
    if (!message || chatMutation.isPending) return;
    appendMessage("user", message);
    setInput("");
    chatMutation.mutate(message);
  };

  return (
    <>
      {isOpen ? (
        <div className="glass-strong fixed right-4 bottom-24 z-50 flex h-[30rem] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl shadow-2xl shadow-black/50 sm:right-6">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/20 text-sm font-semibold text-accent-400 ring-1 ring-accent-400/30">
                AI
              </span>
              <div>
                <p className="text-sm font-medium text-white">Nexus AI Ассистент</p>
                <p className="text-[11px] text-emerald-100/50">Отвечает за пару секунд</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Закрыть чат"
              className="text-emerald-100/50 transition hover:text-white"
            >
              ✕
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.author === "user" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    message.author === "user"
                      ? "bg-accent-500 text-nexus-950"
                      : "bg-white/8 text-emerald-50 ring-1 ring-white/10"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            ))}
            {chatMutation.isPending ? (
              <div className="flex justify-start">
                <p className="rounded-2xl bg-white/8 px-4 py-2.5 text-sm text-emerald-100/50 ring-1 ring-white/10">
                  Печатает…
                </p>
              </div>
            ) : null}
          </div>

          <div className="border-t border-white/10 px-5 py-4">
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={chatMutation.isPending}
                  onClick={() => handleQuickPrompt(item)}
                  className="rounded-full border border-accent-400/25 bg-accent-500/10 px-3 py-1.5 text-[11px] text-accent-400 transition hover:bg-accent-500/20 disabled:opacity-50"
                >
                  {item.question}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                maxLength={1000}
                placeholder="Задайте свой вопрос…"
                aria-label="Сообщение ассистенту"
                className="flex-1 rounded-full border border-white/10 bg-nexus-950/60 px-4 py-2.5 text-sm text-white placeholder:text-emerald-100/30 focus:border-accent-400/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={chatMutation.isPending || input.trim().length === 0}
                aria-label="Отправить сообщение"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500 text-nexus-950 transition hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                →
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label={isOpen ? "Закрыть Nexus AI Ассистент" : "Открыть Nexus AI Ассистент"}
        aria-expanded={isOpen}
        className="fixed right-4 bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent-500 text-2xl font-semibold text-nexus-950 shadow-xl shadow-accent-500/30 transition hover:scale-105 hover:bg-accent-400 sm:right-6"
      >
        {isOpen ? "✕" : "?"}
      </button>
    </>
  );
}
