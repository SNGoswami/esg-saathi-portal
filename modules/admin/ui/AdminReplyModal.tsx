"use client";

import { useEffect, useState } from "react";
import type { AdminContact } from "@/modules/admin/api/adminApi";
import { sendAdminContactReply } from "@/modules/admin/api/adminApi";
import { DashboardModalOverlay } from "@/modules/dashboard/components/DashboardModalOverlay";
import { useToast } from "@/modules/dashboard/components/ToastProvider";
import { useConfirm } from "@/modules/dashboard/components/ConfirmProvider";

type AdminReplyModalProps = {
  contact: AdminContact | null;
  onClose: () => void;
  onSent: (id: number) => void;
};

export default function AdminReplyModal({
  contact,
  onClose,
  onSent,
}: AdminReplyModalProps) {
  const toast = useToast();
  const confirm = useConfirm();
  const [replyMessage, setReplyMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!contact) {
      setReplyMessage("");
      setSent(false);
    }
  }, [contact]);

  if (!contact) return null;

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(contact!.email);
      toast.success("Email copied to clipboard");
    } catch {
      toast.error("Failed to copy email");
    }
  }

  async function handleSend() {
    if (!replyMessage.trim() || !contact) return;

    const ok = await confirm({
      title: "Send reply?",
      description: (
        <>
          Your message will be emailed to <strong>{contact.email}</strong> with subject &ldquo;Re:{" "}
          {contact.subject}&rdquo;.
        </>
      ),
      confirmLabel: "Send reply",
    });
    if (!ok) return;

    setSending(true);
    try {
      await sendAdminContactReply({
        contactId: contact.id,
        to: contact.email,
        subject: `Re: ${contact.subject}`,
        message: replyMessage.trim(),
      });
      setSent(true);
      onSent(contact.id);
      toast.success("Reply sent successfully");
      setTimeout(onClose, 1000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  return (
    <DashboardModalOverlay open center={false} top onBackdropClick={onClose}>
      <div
        className="dash-modal dash-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-reply-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dash-admin-reply__head">
          <div>
            <p id="admin-reply-title" className="dash-modal__title">
              Reply to {contact.name}
            </p>
            <p className="dash-modal__desc">{contact.email}</p>
          </div>
          <div className="dash-form-actions" style={{ margin: 0 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={copyEmail}>
              Copy email
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="dash-admin-reply__original">
          <p className="dash-score-card__label">{contact.subject}</p>
          <p className="dash-muted" style={{ marginTop: 8, whiteSpace: "pre-wrap", maxHeight: 140, overflowY: "auto" }}>
            {contact.message}
          </p>
        </div>

        <label className="dash-label" style={{ marginTop: "0.875rem" }}>
          Your reply
        </label>
        <textarea
          className="dash-input dash-advisor__textarea"
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          placeholder="Write your reply… (Ctrl+Enter to send)"
          rows={6}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              void handleSend();
            }
          }}
        />

        <div className="dash-form-actions" style={{ marginTop: "0.875rem" }}>
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={sending || sent || !replyMessage.trim()}
            onClick={() => void handleSend()}
          >
            {sent ? "Sent" : sending ? "Sending…" : "Send reply"}
          </button>
          <button type="button" className="btn-ghost btn-sm" disabled={sending} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </DashboardModalOverlay>
  );
}
