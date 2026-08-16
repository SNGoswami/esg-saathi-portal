"use client";

import { useEffect, useState } from "react";
import { DashboardModalOverlay } from "@/modules/dashboard/components/DashboardModalOverlay";
import { useToast } from "@/modules/dashboard/components/ToastProvider";

type FormState = { name: string; email: string; subject: string; message: string };
type Status = "idle" | "sending";

const SUBJECT_LIMIT = 50;
const MESSAGE_LIMIT = 400;

const emptyForm: FormState = { name: "", email: "", subject: "", message: "" };

const baseInputClass =
  "w-full rounded-[var(--radius-sm)] px-3.5 py-2.5 text-sm outline-none " +
  "bg-[var(--color-surface)] border border-[var(--color-border)] " +
  "text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] " +
  "transition-[border-color,box-shadow] duration-200 " +
  "focus:border-[var(--brand-500)] focus:ring-[3px] focus:ring-[var(--brand-focus-ring)]";

export default function ContactToastForm({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && status !== "sending") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, status]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setStatus("idle");
    }
  }, [open]);

  const isValid =
    form.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) &&
    form.subject.trim().length > 0 &&
    form.message.trim().length > 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    if (name === "subject" && value.length > SUBJECT_LIMIT) return;
    if (name === "message" && value.length > MESSAGE_LIMIT) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || status === "sending") return;

    setStatus("sending");
    try {
      const dbRes = await fetch("/api/database/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const dbResult = (await dbRes.json()) as { error?: string };
      if (!dbRes.ok) {
        toast.error(dbResult.error || "Something went wrong");
        setStatus("idle");
        return;
      }

      const web3FormData = new FormData();
      web3FormData.append("access_key", process.env.NEXT_PUBLIC_WEB3FORMS_KEY || "");
      web3FormData.append("name", form.name);
      web3FormData.append("email", form.email);
      web3FormData.append("subject", form.subject);
      web3FormData.append("message", form.message);
      await fetch("https://api.web3forms.com/submit", { method: "POST", body: web3FormData });

      toast.success("Message sent. We'll get back to you soon.");
      onClose();
    } catch {
      toast.error("Network error. Try again.");
      setStatus("idle");
    }
  }

  if (!open) return null;

  return (
    <DashboardModalOverlay open top center={false} onBackdropClick={status === "sending" ? undefined : onClose}>
      <div
        className="dash-modal dash-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-toast-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="contact-toast-title" className="dash-modal__title">
              Get in Touch
            </h2>
            <p className="dash-modal__desc">Questions about your portal login or account? Send us a note.</p>
          </div>
          <button
            type="button"
            className="dash-confirm__close"
            aria-label="Close"
            disabled={status === "sending"}
            onClick={onClose}
          >
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            name="name"
            placeholder="Your name"
            value={form.name}
            onChange={handleChange}
            className={baseInputClass}
            autoComplete="name"
          />
          <input
            name="email"
            type="email"
            placeholder="you@company.com"
            value={form.email}
            onChange={handleChange}
            className={baseInputClass}
            autoComplete="email"
          />
          <input
            name="subject"
            placeholder="Subject"
            maxLength={SUBJECT_LIMIT}
            value={form.subject}
            onChange={handleChange}
            className={baseInputClass}
          />
          <textarea
            name="message"
            placeholder="How can we help?"
            maxLength={MESSAGE_LIMIT}
            rows={4}
            value={form.message}
            onChange={handleChange}
            className={`${baseInputClass} resize-y min-h-[6.5rem]`}
          />
          <div className="dash-modal__actions">
            <button type="button" className="btn-ghost" disabled={status === "sending"} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!isValid || status === "sending"}>
              {status === "sending" ? "Sending…" : "Send message"}
            </button>
          </div>
        </form>
      </div>
    </DashboardModalOverlay>
  );
}
