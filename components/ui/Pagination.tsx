import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "@/components/icons";
import { HTMLAttributes } from "react";

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "onChange"> {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  /** How many page numbers to show on each side of the current page. */
  siblingCount?: number;
}

/** Builds a compact page list with `"ellipsis"` markers, e.g. [1, "ellipsis", 4, 5, 6, "ellipsis", 20]. */
function buildPageList(current: number, total: number, siblingCount: number): (number | "ellipsis")[] {
  const totalVisible = siblingCount * 2 + 5; // first + last + current + 2 ellipses
  if (total <= totalVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const left = Math.max(current - siblingCount, 2);
  const right = Math.min(current + siblingCount, total - 1);

  const pages: (number | "ellipsis")[] = [1];
  if (left > 2) pages.push("ellipsis");
  for (let page = left; page <= right; page++) pages.push(page);
  if (right < total - 1) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onChange,
  siblingCount = 1,
  className,
  ...props
}: PaginationProps) {
  if (totalPages <= 1) return null;
  const pages = buildPageList(currentPage, totalPages, siblingCount);

  const buttonBase =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-2 text-body-sm transition-colors focus-ring disabled:opacity-40 disabled:pointer-events-none";

  return (
    <nav aria-label="Pagination" className={cn("flex items-center gap-1", className)} {...props}>
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => onChange(currentPage - 1)}
        className={cn(buttonBase, "text-foreground-secondary hover:bg-muted hover:text-foreground")}
      >
        <ChevronLeftIcon size={16} />
      </button>

      {pages.map((page, index) =>
        page === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden="true"
            className="inline-flex h-9 w-9 items-center justify-center text-foreground-tertiary"
          >
            <MoreHorizontalIcon size={16} />
          </span>
        ) : (
          <button
            key={page}
            type="button"
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => onChange(page)}
            className={cn(
              buttonBase,
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : "text-foreground-secondary hover:bg-muted hover:text-foreground"
            )}
          >
            {page}
          </button>
        )
      )}

      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage >= totalPages}
        onClick={() => onChange(currentPage + 1)}
        className={cn(buttonBase, "text-foreground-secondary hover:bg-muted hover:text-foreground")}
      >
        <ChevronRightIcon size={16} />
      </button>
    </nav>
  );
}
