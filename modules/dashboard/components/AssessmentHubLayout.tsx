"use client";

import { useMemo, type ReactNode } from "react";

export type AssessmentHubStatus = "not_started" | "in_progress" | "completed";
export type AssessmentHubStatusFilter = "all" | AssessmentHubStatus;

export type AssessmentHubItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  status: AssessmentHubStatus;
  statusLabel: string;
  metricLabel: string;
  metricValue?: string | null;
  progressPct?: number | null;
  actionLabel: string;
  actionVariant?: "primary" | "ghost";
  actionDisabled?: boolean;
  onAction: () => void;
};

export type AssessmentHubStats = {
  completed: number;
  inProgress: number;
  notStarted: number;
};

const STATUS_FILTERS: { id: AssessmentHubStatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "not_started", label: "Not started" },
  { id: "in_progress", label: "In progress" },
  { id: "completed", label: "Completed" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function statusChipClass(status: AssessmentHubStatus): string {
  if (status === "completed") return "dash-chip dash-chip--success";
  if (status === "in_progress") return "dash-chip dash-chip--warning";
  return "dash-chip";
}

function AssessmentCard({ item, featured }: { item: AssessmentHubItem; featured?: boolean }) {
  return (
    <article className={`assessment-card${featured ? " assessment-card--featured" : ""}`}>
      <div className="assessment-card__head">
        <span className="assessment-card__avatar" aria-hidden="true">
          {initials(item.title)}
        </span>
        <div className="assessment-card__titles">
          <h3 className="assessment-card__title">{item.title}</h3>
          {item.subtitle ? <p className="assessment-card__subtitle">{item.subtitle}</p> : null}
        </div>
        <span className={statusChipClass(item.status)}>{item.statusLabel}</span>
      </div>

      <div className="assessment-card__metric">
        <span className="assessment-card__metric-label">{item.metricLabel}</span>
        {item.progressPct != null && item.progressPct >= 0 ? (
          <div className="assessment-card__progress" role="presentation">
            <div
              className="assessment-card__progress-bar"
              style={{ width: `${Math.min(100, Math.max(0, item.progressPct))}%` }}
            />
          </div>
        ) : null}
        <span className="assessment-card__metric-value">{item.metricValue ?? "—"}</span>
      </div>

      <button
        type="button"
        className={item.actionVariant === "ghost" ? "btn-ghost assessment-card__action" : "btn-primary assessment-card__action"}
        disabled={item.actionDisabled}
        onClick={item.onAction}
      >
        {item.actionLabel}
      </button>
    </article>
  );
}

export function AssessmentHubLayout({
  description,
  stats,
  items,
  loading = false,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showInProgressFilter = true,
  showSearch = true,
  onRefresh,
  emptyTitle = "Nothing here yet",
  emptyDescription,
  filteredEmptyTitle = "No matches",
  filteredEmptyDescription = "Try a different search or filter.",
  footer,
  featuredLayout = false,
}: {
  description?: string;
  stats: AssessmentHubStats;
  items: AssessmentHubItem[];
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: AssessmentHubStatusFilter;
  onStatusFilterChange: (filter: AssessmentHubStatusFilter) => void;
  showInProgressFilter?: boolean;
  showSearch?: boolean;
  onRefresh?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  filteredEmptyTitle?: string;
  filteredEmptyDescription?: string;
  footer?: ReactNode;
  featuredLayout?: boolean;
}) {
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      const haystack = `${item.title} ${item.subtitle ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, statusFilter]);

  const visibleFilters = STATUS_FILTERS.filter(
    (f) => showInProgressFilter || f.id !== "in_progress",
  );

  const isFiltered = search.trim().length > 0 || statusFilter !== "all";
  const showEmpty = !loading && filteredItems.length === 0;
  const showGrid = !loading && filteredItems.length > 0;

  return (
    <div className="assessment-hub">
      {description ? <p className="assessment-hub__desc">{description}</p> : null}

      <div
        className={`assessment-hub__stats${showInProgressFilter ? "" : " assessment-hub__stats--compact"}`}
        aria-label="Assessment summary"
      >
        <div className="assessment-hub__stat assessment-hub__stat--done">
          <span className="assessment-hub__stat-value">{stats.completed}</span>
          <span className="assessment-hub__stat-label">Completed</span>
        </div>
        {showInProgressFilter && (
          <div className="assessment-hub__stat assessment-hub__stat--progress">
            <span className="assessment-hub__stat-value">{stats.inProgress}</span>
            <span className="assessment-hub__stat-label">In progress</span>
          </div>
        )}
        <div className="assessment-hub__stat assessment-hub__stat--pending">
          <span className="assessment-hub__stat-value">{stats.notStarted}</span>
          <span className="assessment-hub__stat-label">Not started</span>
        </div>
      </div>

      <section className="assessment-hub__panel card card--elevated">
        <div className="assessment-hub__toolbar">
          <div className="assessment-hub__toolbar-row">
            {showSearch && (
              <label className="assessment-hub__search">
                <span className="sr-only">Search assessments</span>
                <i className="ti ti-search assessment-hub__search-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="dash-input assessment-hub__search-input"
                  placeholder="Search clients…"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </label>
            )}

            <div className="assessment-hub__filters" role="group" aria-label="Filter by status">
              {visibleFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  className={`assessment-hub__filter${statusFilter === filter.id ? " assessment-hub__filter--active" : ""}`}
                  aria-pressed={statusFilter === filter.id}
                  onClick={() => onStatusFilterChange(filter.id)}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {onRefresh && (
              <button
                type="button"
                className="assessment-hub__refresh btn-ghost"
                onClick={onRefresh}
                aria-label="Refresh assessments"
                title="Refresh"
              >
                <i className="ti ti-refresh" aria-hidden="true" />
              </button>
            )}
          </div>

          {!loading && (
            <p className="assessment-hub__summary">
              {filteredItems.length} of {items.length} client{items.length === 1 ? "" : "s"}
              {statusFilter !== "all" ? ` · ${visibleFilters.find((f) => f.id === statusFilter)?.label}` : ""}
            </p>
          )}
        </div>

        {loading && (
          <p className="assessment-hub__loading dash-muted">Loading assessments…</p>
        )}

        {showEmpty && (
          <div className="assessment-hub__empty">
            <div className="assessment-hub__empty-icon" aria-hidden="true">
              <i className="ti ti-clipboard-list" />
            </div>
            <p className="assessment-hub__empty-title">
              {isFiltered ? filteredEmptyTitle : emptyTitle}
            </p>
            <p className="assessment-hub__empty-text">
              {isFiltered ? filteredEmptyDescription : emptyDescription}
            </p>
          </div>
        )}

        {showGrid && featuredLayout && filteredItems.length === 1 && (
          <div className="assessment-hub__featured">
            <AssessmentCard item={filteredItems[0]} featured />
          </div>
        )}

        {showGrid && !(featuredLayout && filteredItems.length === 1) && (
          <div className="assessment-hub__grid">
            {filteredItems.map((item) => (
              <AssessmentCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {footer ? <div className="assessment-hub__footer">{footer}</div> : null}
    </div>
  );
}
