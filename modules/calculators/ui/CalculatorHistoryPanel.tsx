"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { ReactNode } from "react";
import { DataTable, SortableHeader } from "@/modules/dashboard/components/DataTable";
import { formatReportTakenAt } from "@/modules/reports/domain/formatReportDate";
import { CalculatorField } from "@/modules/calculators/ui/CalculatorLayout";
import { FiscalYearSelect } from "@/modules/calculators/ui/FiscalYearSelect";

export function CalculatorHistoryPanel<T extends { id: string }>({
  data,
  columns,
  loading,
  loadingMessage = "Loading history…",
  searchPlaceholder = "Search…",
  emptyMessage,
  emptyFilteredMessage,
  summaryLabel,
  fiscalYear,
  onFiscalYearChange,
  toolbarExtra,
  tableClassName = "reports-hub__table calc-history-table",
  pageSize = 12,
  error,
}: {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  loading?: boolean;
  loadingMessage?: string;
  searchPlaceholder?: string;
  emptyMessage: ReactNode;
  emptyFilteredMessage?: ReactNode;
  summaryLabel?: string;
  fiscalYear?: string;
  onFiscalYearChange?: (fy: string) => void;
  toolbarExtra?: ReactNode;
  tableClassName?: string;
  pageSize?: number;
  error?: string;
}) {
  const fyFilter =
    fiscalYear != null && onFiscalYearChange ? (
      <div className="dash-table-toolbar__filter">
        <CalculatorField label="Fiscal year">
          <FiscalYearSelect value={fiscalYear} onChange={onFiscalYearChange} />
        </CalculatorField>
      </div>
    ) : null;

  return (
    <div className="reports-hub">
      {error && (
        <p className="isf-workbench-error" role="alert">
          {error}
        </p>
      )}

      {!loading && summaryLabel && <p className="reports-hub__summary">{summaryLabel}</p>}

      <section className="reports-hub__panel card card--elevated">
        <DataTable
          data={data}
          columns={columns}
          getRowId={(row) => row.id}
          tableClassName={tableClassName}
          wrapClassName="reports-hub__table-wrap"
          searchPlaceholder={searchPlaceholder}
          showSearch={data.length > 3}
          loading={loading}
          loadingMessage={loadingMessage}
          emptyMessage={emptyMessage}
          emptyFilteredMessage={emptyFilteredMessage}
          pageSize={pageSize}
          toolbarExtra={
            fyFilter || toolbarExtra ? (
              <>
                {fyFilter}
                {toolbarExtra}
              </>
            ) : undefined
          }
        />
      </section>
    </div>
  );
}

export function calcHistoryEmptyMessage(title: string, hint: string): ReactNode {
  return (
    <>
      <p style={{ margin: 0, fontWeight: 600, color: "var(--color-text-heading)" }}>{title}</p>
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem" }}>{hint}</p>
    </>
  );
}

export const calcHistoryEmptyFilteredMessage: ReactNode = calcHistoryEmptyMessage(
  "No matching records",
  "Try a different search term.",
);

export function calcHistoryReportColumn<T>({
  showClientPicker,
  clientHeader = "Client",
  calculationHeader = "Calculation",
  getClientName,
  getFiscalYear,
  getSubtitle,
  getTitle,
  getMeta,
}: {
  showClientPicker: boolean;
  clientHeader?: string;
  calculationHeader?: string;
  getClientName: (row: T) => string | undefined | null;
  getFiscalYear: (row: T) => string | undefined | null;
  getSubtitle: (row: T) => string;
  getTitle?: (row: T) => string;
  getMeta?: (row: T) => string;
}): ColumnDef<T, unknown> {
  return {
    id: "report",
    accessorFn: (row) =>
      `${getTitle?.(row) ?? getClientName(row) ?? ""} ${getFiscalYear(row) ?? ""} ${getMeta?.(row) ?? getSubtitle(row)}`.trim(),
    header: ({ column }) => (
      <SortableHeader column={column} label={showClientPicker ? clientHeader : calculationHeader} />
    ),
    cell: ({ row }) => (
      <div>
        <p className="reports-hub__report-title">
          {getTitle
            ? getTitle(row.original)
            : showClientPicker
              ? getClientName(row.original) ?? "—"
              : `FY ${getFiscalYear(row.original) ?? "—"}`}
        </p>
        <p className="reports-hub__meta">
          {getMeta
            ? getMeta(row.original)
            : showClientPicker
              ? `FY ${getFiscalYear(row.original) ?? "—"}`
              : getSubtitle(row.original)}
        </p>
      </div>
    ),
    meta: {
      mobileLabel: showClientPicker ? clientHeader : calculationHeader,
      columnClass: "calc-history-col-report",
    },
  };
}

export function calcHistoryTextColumn<T>({
  id,
  label,
  getValue,
  titleClassName = "reports-hub__report-title",
  columnClass,
}: {
  id: string;
  label: string;
  getValue: (row: T) => string;
  titleClassName?: string;
  columnClass?: string;
}): ColumnDef<T, unknown> {
  return {
    id,
    accessorFn: (row) => getValue(row),
    header: ({ column }) => <SortableHeader column={column} label={label} />,
    cell: ({ row }) => <p className={titleClassName}>{getValue(row.original)}</p>,
    meta: { mobileLabel: label, columnClass },
  };
}

export function calcHistoryMetricColumn<T>({
  id,
  label,
  getValue,
  format = defaultFmt,
}: {
  id: string;
  label: string;
  getValue: (row: T) => number | undefined | null;
  format?: (value: number | undefined | null) => string;
}): ColumnDef<T, unknown> {
  return {
    id,
    accessorFn: (row) => getValue(row) ?? 0,
    header: ({ column }) => <SortableHeader column={column} label={label} />,
    cell: ({ row }) => <span className="calc-history-metric">{format(getValue(row.original))}</span>,
    meta: { mobileLabel: label, columnClass: "calc-history-col-metric" },
  };
}

export function calcHistoryDateColumn<T>({
  label = "Saved",
  getIso,
}: {
  label?: string;
  getIso: (row: T) => string | undefined | null;
}): ColumnDef<T, unknown> {
  return {
    id: "date",
    accessorFn: (row) => {
      const { date, time } = formatReportTakenAt(getIso(row));
      return `${date} ${time}`;
    },
    header: ({ column }) => <SortableHeader column={column} label={label} />,
    cell: ({ row }) => {
      const iso = getIso(row.original);
      if (!iso) return <span className="reports-hub__date">—</span>;
      const { date, time } = formatReportTakenAt(iso);
      return (
        <div className="reports-hub__date-cell">
          <time dateTime={iso} className="reports-hub__date">
            {date}
          </time>
          <time className="reports-hub__time">{time}</time>
        </div>
      );
    },
    meta: { mobileLabel: label, columnClass: "reports-hub__col-date" },
  };
}

export function calcHistoryActionColumn<T>({
  buttonLabel = "View report",
  onAction,
}: {
  buttonLabel?: string;
  onAction: (row: T) => void;
}): ColumnDef<T, unknown> {
  return {
    id: "action",
    enableSorting: false,
    header: () => "Action",
    cell: ({ row }) => (
      <button
        type="button"
        className="btn-primary reports-hub__view-btn"
        onClick={() => onAction(row.original)}
      >
        {buttonLabel}
      </button>
    ),
    meta: { mobileLabel: "Action", columnClass: "reports-hub__col-action" },
  };
}

function defaultFmt(n?: number | null): string {
  if (n == null || !Number.isFinite(n)) return "-";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
}
