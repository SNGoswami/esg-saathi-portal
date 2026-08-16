"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { formatDisplayName } from "@/modules/platform/display/displayName";
import {
  clearAiAdvisorSession,
  readAiAdvisorSession,
  writeAiAdvisorSession,
} from "@/modules/ai-advisor/api/sessionCache";
import {
  getAiAdvisorQuota,
  sendAiAdvisorMessage,
  type AdvisorMessage,
  type AiAdvisorQuota,
} from "@/modules/ai-advisor/api/aiAdvisorApi";
import AdvisorFormattedContent from "@/modules/ai-advisor/ui/AdvisorFormattedContent";
import { useToastOnValue } from "@/modules/dashboard/hooks/useToastOnValue";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";

const STARTERS = [
  "What should I prioritize for BRSR readiness this quarter?",
  "How can I improve my environmental pillar score?",
  "What documents do I need before an ESG assessment?",
  "Explain E, S, and G in simple terms for my business.",
];

function buildWelcomeMessage(firstName: string, remaining: number): AdvisorMessage {
  return {
    role: "model",
    content: `Hi ${firstName}, I'm your ESGSaathi AI Advisor. Ask me about BRSR readiness, Lighthouse scores, or practical next steps for your business.\n\nYou have **${remaining}** questions left today.`,
  };
}

export default function AiAdvisorView() {
  const confirm = useConfirm();
  const { user } = useAuth();
  const displayName = formatDisplayName(user);
  const firstName = displayName.split(" ")[0] || "there";
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState("");
  const [quota, setQuota] = useState<AiAdvisorQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [error, setError] = useState("");

  useToastOnValue(error, "error");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshQuota = useCallback(async () => {
    try {
      const q = await getAiAdvisorQuota();
      setQuota(q);
      return q;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setBooting(false);
      return;
    }
    const cached = readAiAdvisorSession(user.id);
    if (cached?.messages?.length) {
      setMessages(cached.messages);
      if (cached.quota) setQuota(cached.quota);
    }
    setSessionReady(true);
    refreshQuota().finally(() => setBooting(false));
  }, [user?.id, refreshQuota]);

  useEffect(() => {
    if (!sessionReady || booting || !user?.id) return;
    if (messages.length > 0) return;
    const remaining = quota?.remaining ?? 5;
    setMessages([buildWelcomeMessage(firstName, remaining)]);
  }, [sessionReady, booting, user?.id, messages.length, firstName, quota?.remaining]);

  useEffect(() => {
    if (!sessionReady || !user?.id || messages.length === 0) return;
    writeAiAdvisorSession(user.id, {
      messages,
      quota,
      updatedAt: new Date().toISOString(),
    });
  }, [messages, quota, sessionReady, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function clearConversation() {
    if (!user?.id) return;
    if (messages.some((m) => m.role === "user")) {
      const ok = await confirm({
        title: "Clear conversation?",
        description: "Your chat history for this session will be removed from this browser.",
        confirmLabel: "Clear",
        destructive: true,
      });
      if (!ok) return;
    }
    clearAiAdvisorSession(user.id);
    const remaining = quota?.remaining ?? 5;
    setMessages([buildWelcomeMessage(firstName, remaining)]);
    setError("");
    setInput("");
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (quota && quota.remaining <= 0) {
      setError("Daily limit reached. You can ask more questions tomorrow.");
      return;
    }

    setError("");
    setInput("");
    const userMsg: AdvisorMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const apiHistory = messages.filter((m, i) => !(i === 0 && m.role === "model"));
      const res = await sendAiAdvisorMessage(trimmed, apiHistory);
      setMessages((prev) => [...prev, { role: "model", content: res.reply }]);
      setQuota({
        used: res.questionsUsed,
        limit: res.dailyLimit,
        remaining: res.questionsRemaining,
      });
    } catch (err) {
      setMessages((prev) => prev.slice(0, -1));
      setError(err instanceof Error ? err.message : "Could not reach AI Advisor");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  const remaining = quota?.remaining ?? (booting ? "…" : 0);
  const limit = quota?.limit ?? 5;
  const canSend = !loading && (typeof remaining === "number" ? remaining > 0 : true);
  const hasUserMessages = messages.some((m) => m.role === "user");
  const showStarters = !hasUserMessages && !loading;

  return (
    <div className="dash-content">
      <div className="card card--elevated dash-advisor__intro">
        <div className="dash-advisor__intro-head">
          <div className="dash-advisor__intro-copy">
            <p className="dash-advisor__intro-title">AI Advisor</p>
            <p className="dash-advisor__intro-desc">
              Personalized ESG guidance powered by Gemini. Up to {limit} questions per day; chat is
              saved for this browser session until you close the tab or clear the conversation.
            </p>
          </div>
          <div className="dash-advisor__quota" title="Questions remaining today">
            <span className="dash-advisor__quota-value">{booting ? "…" : remaining}</span>
            <span className="dash-advisor__quota-label">/ {limit} today</span>
          </div>
        </div>
        {hasUserMessages && (
          <button
            type="button"
            className="btn-ghost"
            style={{ marginTop: 10, padding: "6px 12px", fontSize: 12 }}
            onClick={() => void clearConversation()}
          >
            Clear conversation
          </button>
        )}
      </div>

      <div className="card card--elevated dash-advisor__chat-card">
        <div ref={scrollRef} className="dash-advisor__messages">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`dash-advisor__row dash-advisor__row--${m.role}`}
            >
              {m.role === "model" && (
                <span className="dash-advisor__avatar" aria-hidden="true">
                  <i className="ti ti-leaf" />
                </span>
              )}
              <div className={`dash-advisor__bubble dash-advisor__bubble--${m.role}`}>
                {m.role === "model" ? (
                  <AdvisorFormattedContent content={m.content} />
                ) : (
                  <p className="dash-advisor__para">{m.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="dash-advisor__row dash-advisor__row--model">
              <span className="dash-advisor__avatar" aria-hidden="true">
                <i className="ti ti-leaf" />
              </span>
              <div className="dash-advisor__bubble dash-advisor__bubble--model dash-advisor__typing">
                <span className="dash-advisor__dots">
                  <span />
                  <span />
                  <span />
                </span>
                Thinking…
              </div>
            </div>
          )}
        </div>

        {showStarters && (
          <div className="dash-advisor__starters">
            <p className="dash-advisor__starters-label">Suggested questions</p>
            <div className="dash-advisor__starters-grid">
              {STARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  className="dash-advisor__starter"
                  disabled={!canSend}
                  onClick={() => sendMessage(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <form
          className="dash-advisor__composer"
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
        >
          <textarea
            ref={inputRef}
            className="dash-input dash-advisor__textarea"
            placeholder={
              canSend ? "Ask about ESG, BRSR, or your assessment…" : "Daily limit reached"
            }
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            disabled={!canSend}
            maxLength={2000}
          />
          <button
            type="submit"
            className="btn-primary dash-advisor__send"
            disabled={!canSend || !input.trim()}
            aria-label="Send message"
          >
            <i className="ti ti-send" aria-hidden="true" />
          </button>
        </form>
      </div>

      <div
        className="card"
        style={{ padding: 14, fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.55 }}
      >
        <p style={{ fontWeight: 600, color: "var(--color-text)", marginBottom: 6 }}>Tips</p>
        <p>Be specific about your sector and goals for more tailored answers.</p>
        <p style={{ marginTop: 4 }}>
          Chat history is stored in this browser session only, it is not sent to other devices.
        </p>
        <p style={{ marginTop: 4 }}>
          Daily quota resets at midnight IST. Remaining today:{" "}
          <strong style={{ color: "var(--color-primary)" }}>
            {booting ? "…" : remaining}
          </strong>
          .
        </p>
      </div>
    </div>
  );
}
