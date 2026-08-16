"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/modules/platform/auth/AuthContext";
import { normalizeRole } from "@/modules/platform/rbac/roles";
import { CalculatorPage, CalculatorPanel } from "@/modules/calculators/ui/CalculatorLayout";
import {
  FAQ_CATEGORIES,
  filterFaqs,
  faqsForRole,
  type FaqCategoryId,
  type FaqItem,
} from "@/modules/help/faqContent";
import FaqVisualGuide from "@/modules/help/ui/FaqVisualGuide";

function FaqAccordionItem({
  item,
  open,
  onToggle,
}: {
  item: FaqItem;
  open: boolean;
  onToggle: () => void;
}) {
  const categoryMeta = FAQ_CATEGORIES.find((c) => c.id === item.category);
  const categoryLabel = categoryMeta?.label ?? item.category;

  return (
    <article className={`faq-item${open ? " faq-item--open" : ""}`}>
      <button
        type="button"
        className="faq-item__trigger"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="faq-item__trigger-main">
          {categoryMeta ? (
            <span className="faq-item__icon" aria-hidden="true">
              <i className={`ti ti-${categoryMeta.icon}`} />
            </span>
          ) : null}
          <span className="faq-item__question">{item.question}</span>
        </span>
        <span className="faq-item__chevron" aria-hidden="true">
          <i className={`ti ti-chevron-${open ? "up" : "down"}`} />
        </span>
      </button>
      {open && (
        <div className="faq-item__body">
          <span className="faq-item__category">{categoryLabel}</span>
          <p className="faq-item__answer">{item.answer}</p>
        </div>
      )}
    </article>
  );
}

export default function FaqView({
  onNavigateView,
}: {
  onNavigateView?: (view: string) => void;
}) {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);
  const roleFaqs = useMemo(() => faqsForRole(role), [role]);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategoryId | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const visibleCategories = useMemo(() => {
    const ids = new Set(roleFaqs.map((f) => f.category));
    return FAQ_CATEGORIES.filter((c) => ids.has(c.id));
  }, [roleFaqs]);

  const showVisualGuide = !query.trim();

  const filtered = useMemo(
    () => filterFaqs(roleFaqs, query, category),
    [roleFaqs, query, category],
  );

  const grouped = useMemo(() => {
    if (category !== "all" || query.trim()) return null;
    return visibleCategories
      .map((cat) => ({
        ...cat,
        items: roleFaqs.filter((f) => f.category === cat.id),
      }))
      .filter((g) => g.items.length > 0);
  }, [category, query, visibleCategories, roleFaqs]);

  function handleToggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="faq-page-root" data-view="faq">
      <CalculatorPage>
        {showVisualGuide ? (
          <FaqVisualGuide role={role} onNavigateView={onNavigateView} />
        ) : null}

        <section className="faq-page__search-bar" aria-label="Search help">
          <div className="faq-page__search-row">
            <label className="faq-page__search">
              <i className="ti ti-search" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpenId(null);
                }}
                placeholder="Search questions…"
                aria-label="Search frequently asked questions"
              />
              {query && (
                <button
                  type="button"
                  className="faq-page__search-clear"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              )}
            </label>
            <p
              className="faq-page__result-count"
              aria-live="polite"
              title={`${filtered.length} question${filtered.length !== 1 ? "s" : ""}`}
            >
              {filtered.length}
            </p>
          </div>

          <div className="faq-page__chips-wrap">
            <div className="faq-page__chips" role="tablist" aria-label="Frequently asked questions categories">
            <button
              type="button"
              role="tab"
              aria-selected={category === "all"}
              className={`faq-page__chip${category === "all" ? " faq-page__chip--active" : ""}`}
              onClick={() => {
                setCategory("all");
                setOpenId(null);
              }}
            >
              All topics
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={category === cat.id}
                className={`faq-page__chip${category === cat.id ? " faq-page__chip--active" : ""}`}
                onClick={() => {
                  setCategory(cat.id);
                  setOpenId(null);
                }}
              >
                <i className={`ti ti-${cat.icon}`} aria-hidden="true" />
                {cat.label}
              </button>
            ))}
            </div>
          </div>
        </section>

        {filtered.length === 0 ? (
          <CalculatorPanel title="No matches">
            <div className="faq-page__empty">
              <i className="ti ti-help-off" aria-hidden="true" />
              <p>Nothing matched your search. Try a shorter keyword or pick another topic.</p>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
              >
                Clear filters
              </button>
            </div>
          </CalculatorPanel>
        ) : grouped ? (
          grouped.map((group) => (
            <CalculatorPanel
              key={group.id}
              title={group.label}
              subtitle={`${group.items.length} question${group.items.length !== 1 ? "s" : ""}`}
            >
              <div className="faq-page__list">
                {group.items.map((item) => (
                  <FaqAccordionItem
                    key={item.id}
                    item={item}
                    open={openId === item.id}
                    onToggle={() => handleToggle(item.id)}
                  />
                ))}
              </div>
            </CalculatorPanel>
          ))
        ) : (
          <CalculatorPanel
            title={category === "all" ? "Results" : visibleCategories.find((c) => c.id === category)?.label ?? "Results"}
            subtitle="Tap a question to expand the answer."
          >
            <div className="faq-page__list">
              {filtered.map((item) => (
                <FaqAccordionItem
                  key={item.id}
                  item={item}
                  open={openId === item.id}
                  onToggle={() => handleToggle(item.id)}
                />
              ))}
            </div>
          </CalculatorPanel>
        )}

        <section className="faq-page__cta card card--elevated">
          <div className="faq-page__cta-accent" aria-hidden="true" />
          <div className="faq-page__cta-content">
            <p className="faq-page__cta-eyebrow">Still need help?</p>
            <h2 className="faq-page__cta-title">Talk to ESGSaathi</h2>
            <p className="faq-page__cta-desc">
              Use AI Advisor for tailored guidance on your workspace, or reach our team through the contact page.
            </p>
            <div className="faq-page__cta-actions">
              {onNavigateView ? (
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => onNavigateView("ai-advisor")}
                >
                  <i className="ti ti-sparkles" aria-hidden="true" />
                  Open AI Advisor
                </button>
              ) : null}
              <Link href="/contact" className="btn-ghost btn-sm">
                <i className="ti ti-mail" aria-hidden="true" />
                Contact us
              </Link>
              {onNavigateView ? (
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => onNavigateView("settings")}
                >
                  <i className="ti ti-settings" aria-hidden="true" />
                  Account settings
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </CalculatorPage>
    </div>
  );
}
