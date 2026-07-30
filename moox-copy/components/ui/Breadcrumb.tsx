import { cn } from "@/lib/utils";
import { ChevronRightIcon } from "@/components/icons";
import { Fragment, HTMLAttributes } from "react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps extends HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  /** Render prop so consumers can plug in their own router `Link`. Defaults to a plain anchor. */
  renderLink?: (item: BreadcrumbItem, index: number) => React.ReactNode;
}

export function Breadcrumb({ items, renderLink, className, ...props }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center", className)} {...props}>
      <ol className="flex items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={`${item.label}-${index}`}>
              <li className="flex items-center gap-1.5">
                {item.href && !isLast ? (
                  renderLink ? (
                    renderLink(item, index)
                  ) : (
                    <a
                      href={item.href}
                      className="text-body-sm text-foreground-secondary transition-colors hover:text-foreground focus-ring rounded-sm"
                    >
                      {item.label}
                    </a>
                  )
                ) : (
                  <span
                    aria-current={isLast ? "page" : undefined}
                    className={cn(
                      "text-body-sm",
                      isLast ? "font-medium text-foreground" : "text-foreground-secondary"
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && (
                <ChevronRightIcon size={14} className="text-foreground-tertiary" aria-hidden="true" />
              )}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
