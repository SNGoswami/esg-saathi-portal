"use client";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useMemo, useState, type ReactNode } from "react";

export type DataTableColumnMeta = {
  mobileLabel?: string;
  columnClass?: string;
};

export type DataTableProps<T> = {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  tableClassName?: string;
  wrapClassName?: string;
  searchPlaceholder?: string;
  emptyMessage?: ReactNode;
  emptyFilteredMessage?: ReactNode;
  loading?: boolean;
  loadingMessage?: string;
  pageSize?: number;
  showSearch?: boolean;
  toolbarExtra?: ReactNode;
  getRowId?: (row: T) => string;
};

function columnClassName(meta: unknown, columnId: string): string | undefined {
  const custom = (meta as DataTableColumnMeta | undefined)?.columnClass;
  if (custom) return custom;
  if (columnId === "action" || columnId === "actions") return "reports-hub__col-action";
  if (columnId === "date") return "reports-hub__col-date";
  if (columnId === "report") return "reports-hub__col-report";
  return undefined;
}

export function SortableHeader<T>({
  column,
  label,
}: {
  column: Column<T, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="dash-table-sort"
      onClick={column.getToggleSortingHandler()}
      aria-label={`Sort by ${label}${sorted ? `, ${sorted}` : ""}`}
    >
      <span>{label}</span>
      <span className="dash-table-sort__icon" aria-hidden="true">
        {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
      </span>
    </button>
  );
}

export function DataTable<T>({
  data,
  columns,
  tableClassName = "dash-data-table",
  wrapClassName = "dash-data-table-wrap",
  searchPlaceholder = "Search…",
  emptyMessage = "No results.",
  emptyFilteredMessage,
  loading = false,
  loadingMessage = "Loading…",
  pageSize,
  showSearch = true,
  toolbarExtra,
  getRowId,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const paginationEnabled = pageSize != null && pageSize > 0;

  // TanStack Table returns callback refs that React Compiler cannot memoize safely.
  // eslint-disable-next-line react-hooks/incompatible-library -- useReactTable
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(paginationEnabled
      ? {
          getPaginationRowModel: getPaginationRowModel(),
          initialState: { pagination: { pageSize } },
        }
      : {}),
    getRowId,
    globalFilterFn: "includesString",
  });

  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const showToolbar = showSearch || paginationEnabled || toolbarExtra;

  const toolbar = showToolbar ? (
    <div className="dash-table-toolbar">
      <div className="dash-table-toolbar__controls">
        {showSearch && (
          <label className="dash-table-toolbar__search">
            <span className="sr-only">Search table</span>
            <i className="ti ti-search dash-table-toolbar__search-icon" aria-hidden="true" />
            <input
              type="search"
              className="dash-input dash-table-toolbar__input"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                if (paginationEnabled) table.setPageIndex(0);
              }}
            />
          </label>
        )}
        {toolbarExtra}
      </div>
      {showSearch && (
        <span className="dash-table-toolbar__count">
          {filteredCount} row{filteredCount === 1 ? "" : "s"}
        </span>
      )}
    </div>
  ) : null;

  const body = useMemo(() => {
    if (loading && rows.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length} className="dash-table-empty">
              {loadingMessage}
            </td>
          </tr>
        </tbody>
      );
    }

    if (!loading && rows.length === 0) {
      const message =
        data.length > 0 && globalFilter.trim()
          ? (emptyFilteredMessage ?? emptyMessage)
          : emptyMessage;
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length} className="dash-table-empty">
              {message}
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => {
              const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
              const mobileLabel =
                meta?.mobileLabel ??
                (typeof cell.column.columnDef.header === "string" ? cell.column.columnDef.header : "");
              const colClass = columnClassName(meta, cell.column.id);
              return (
                <td
                  key={cell.id}
                  data-label={mobileLabel}
                  className={
                    colClass
                      ? cell.column.id === "action" || cell.column.id === "actions"
                        ? `dash-table__action ${colClass}`
                        : colClass
                      : undefined
                  }
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    );
  }, [loading, rows, columns.length, loadingMessage, emptyMessage, emptyFilteredMessage, data.length, globalFilter]);

  return (
    <div className="dash-table-shell">
      {toolbar}
      <div className={wrapClassName}>
        <table className={tableClassName}>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const colClass = columnClassName(header.column.columnDef.meta, header.column.id);
                  return (
                  <th
                    key={header.id}
                    className={colClass}
                    aria-hidden={
                      (header.column.id === "actions" || header.column.id === "action") &&
                      !header.column.columnDef.header
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          {body}
        </table>
      </div>
      {paginationEnabled && rows.length > 0 && (
        <div className="dash-table-pagination">
          <span className="dash-table-pagination__info">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="dash-table-pagination__actions">
            <button
              type="button"
              className="btn-ghost"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-ghost"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
