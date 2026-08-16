"use client";

export type WorkspaceBreadcrumbItem = {
  label: string;
  onClick?: () => void;
};

export function WorkspaceBreadcrumb({ items }: { items: WorkspaceBreadcrumbItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav className="workspace-breadcrumb" aria-label="Breadcrumb">
      <ol className="workspace-breadcrumb__list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="workspace-breadcrumb__item">
              {item.onClick && !isLast ? (
                <button type="button" className="workspace-breadcrumb__link" onClick={item.onClick}>
                  {item.label}
                </button>
              ) : (
                <span className="workspace-breadcrumb__current" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && (
                <span className="workspace-breadcrumb__sep" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
