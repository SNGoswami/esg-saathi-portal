"use client";

import type { RoleKey } from "@/modules/platform/rbac/roles";
import { CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import { journeyStepsForRole, quickLinksForRole } from "@/modules/help/faqVisualGuides";

export default function FaqVisualGuide({
  role,
  onNavigateView,
}: {
  role: RoleKey;
  onNavigateView?: (view: string) => void;
}) {
  const steps = journeyStepsForRole(role);
  const quickLinks = quickLinksForRole(role);

  return (
    <div className="faq-guide">
      <CalculatorPanel
        title="Visual guide"
        subtitle="Follow the steps, then jump to any tool."
      >
        <ol className="faq-guide__journey" aria-label="ESG workspace journey">
          {steps.map((step, index) => (
            <li key={`${step.title}-${step.step}`} className="faq-guide__journey-item">
              <div className="faq-guide__journey-card">
                <span className="faq-guide__journey-num" aria-hidden="true">
                  {step.step}
                </span>
                <span className="faq-guide__journey-icon" aria-hidden="true">
                  <i className={`ti ti-${step.icon}`} />
                </span>
                <div className="faq-guide__journey-text">
                  <p className="faq-guide__journey-title">{step.title}</p>
                  <p className="faq-guide__journey-desc">{step.description}</p>
                  {onNavigateView && step.view ? (
                    <button
                      type="button"
                      className="faq-guide__journey-link"
                      onClick={() => onNavigateView(step.view!)}
                    >
                      Open
                      <i className="ti ti-arrow-right" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>
              {index < steps.length - 1 ? (
                <span className="faq-guide__journey-connector" aria-hidden="true">
                  <span className="faq-guide__journey-ray faq-guide__journey-ray--down" />
                  <span className="faq-guide__journey-ray faq-guide__journey-ray--right" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>

        {onNavigateView ? (
          <div className="faq-guide__quick">
            <p className="faq-guide__quick-label">Quick access</p>
            <div className="faq-guide__quick-row" aria-label="Quick access tools">
              {quickLinks.map((link) => (
                <button
                  key={link.view}
                  type="button"
                  className="faq-guide__quick-card"
                  onClick={() => onNavigateView(link.view)}
                  title={link.description}
                >
                  <span
                    className="faq-guide__quick-icon"
                    style={{ background: `${link.accent}18`, color: link.accent }}
                    aria-hidden="true"
                  >
                    <i className={`ti ti-${link.icon}`} />
                  </span>
                  <span className="faq-guide__quick-title">{link.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </CalculatorPanel>
    </div>
  );
}
