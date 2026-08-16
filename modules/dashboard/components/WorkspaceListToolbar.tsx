"use client";

type WorkspaceListToolbarProps = {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  resultCount?: number;
  totalCount?: number;
};

export default function WorkspaceListToolbar({
  search = "",
  onSearchChange,
  searchPlaceholder = "Search…",
  resultCount,
  totalCount,
}: WorkspaceListToolbarProps) {
  if (!onSearchChange) return null;

  const showCount =
    resultCount != null && totalCount != null && totalCount > 0 && search.trim().length > 0;

  return (
    <div className="workspace-list-toolbar">
      <label className="workspace-list-toolbar__search">
        <span className="sr-only">{searchPlaceholder}</span>
        <i className="ti ti-search workspace-list-toolbar__icon" aria-hidden="true" />
        <input
          type="search"
          className="dash-input workspace-list-toolbar__input"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
      {showCount && (
        <span className="workspace-list-toolbar__count">
          {resultCount} of {totalCount}
        </span>
      )}
    </div>
  );
}
