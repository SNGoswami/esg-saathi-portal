"use client";

import { useEffect, useState } from "react";
import { DashboardModalOverlay } from "@/modules/dashboard/components/DashboardModalOverlay";
import type { DemoMeeting, MeetingDecision } from "@/modules/admin/api/adminApi";

type CompleteMeetingModalProps = {
  meeting: DemoMeeting | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: { conclusion: string; decision: MeetingDecision }) => Promise<void>;
};

export default function CompleteMeetingModal({
  meeting,
  submitting,
  onClose,
  onSubmit,
}: CompleteMeetingModalProps) {
  const [conclusion, setConclusion] = useState("");
  const [decision, setDecision] = useState<MeetingDecision>("DEFER");

  useEffect(() => {
    if (!meeting) {
      setConclusion("");
      setDecision("DEFER");
    }
  }, [meeting]);

  if (!meeting) return null;

  const canDecide = meeting.accountStatus === "PENDING";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!conclusion.trim()) return;
    await onSubmit({ conclusion: conclusion.trim(), decision: canDecide ? decision : "DEFER" });
  }

  return (
    <DashboardModalOverlay open center={false} top onBackdropClick={onClose}>
      <form
        className="dash-modal dash-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-demo-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="dash-admin-reply__head">
          <div>
            <p id="complete-demo-title" className="dash-modal__title">
              Record demo conclusion
            </p>
            <p className="dash-modal__desc">
              {meeting.userName} · {meeting.userEmail}
            </p>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <label className="dash-label" style={{ marginTop: "0.75rem" }}>
          What was the outcome?
        </label>
        <textarea
          className="dash-input dash-advisor__textarea"
          rows={4}
          required
          placeholder="Interest, questions, next steps…"
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
        />

        {canDecide ? (
          <>
            <p className="dash-label" style={{ marginTop: "0.75rem" }}>
              Access decision
            </p>
            <div className="dash-meeting-decisions">
              {(
                [
                  { id: "DEFER", label: "Decide later", hint: "Keep pending" },
                  { id: "APPROVE", label: "Approve", hint: "Grant portal login" },
                  { id: "REJECT", label: "Reject", hint: "Block login" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`dash-meeting-decisions__btn${decision === option.id ? " is-active" : ""}${option.id === "REJECT" ? " is-danger" : ""}${option.id === "APPROVE" ? " is-success" : ""}`}
                  onClick={() => setDecision(option.id)}
                >
                  <strong>{option.label}</strong>
                  <span className="dash-muted">{option.hint}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="dash-muted" style={{ marginTop: "0.75rem" }}>
            This account is already {meeting.accountStatus?.toLowerCase()}. The conclusion will be saved without
            changing access.
          </p>
        )}

        <div className="dash-form-actions" style={{ marginTop: "1rem", justifyContent: "flex-end" }}>
          <button type="button" className="btn-ghost btn-sm" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary btn-sm" disabled={submitting || !conclusion.trim()}>
            {submitting
              ? "Saving…"
              : decision === "APPROVE"
                ? "Save and approve"
                : decision === "REJECT"
                  ? "Save and reject"
                  : "Save conclusion"}
          </button>
        </div>
      </form>
    </DashboardModalOverlay>
  );
}
