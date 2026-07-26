/**
 * Centralized icon library. Every icon used anywhere in the app should be
 * imported from here — never inline a one-off `<svg>` in a feature
 * component. This keeps stroke widths, sizing, and viewBoxes consistent,
 * and makes the whole set easy to audit or swap later.
 *
 * Icons are generic UI glyphs only. Product/marketing-specific icons
 * (logos, illustrations) should be added only once the pages that need
 * them are being built.
 */
import { forwardRef, type SVGAttributes } from "react";

export interface IconProps extends SVGAttributes<SVGSVGElement> {
  size?: number;
}

/** Factory so every icon shares identical prop handling, ref forwarding, and defaults. */
function createIcon(displayName: string, viewBox: string, path: React.ReactNode) {
  const Icon = forwardRef<SVGSVGElement, IconProps>(({ size = 16, ...props }, ref) => (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      {path}
    </svg>
  ));
  Icon.displayName = displayName;
  return Icon;
}

const stroke = { stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const ChevronDownIcon = createIcon(
  "ChevronDownIcon",
  "0 0 16 16",
  <path d="M4 6L8 10L12 6" {...stroke} />
);

export const ChevronUpIcon = createIcon(
  "ChevronUpIcon",
  "0 0 16 16",
  <path d="M4 10L8 6L12 10" {...stroke} />
);

export const ChevronLeftIcon = createIcon(
  "ChevronLeftIcon",
  "0 0 16 16",
  <path d="M10 4L6 8L10 12" {...stroke} />
);

export const ChevronRightIcon = createIcon(
  "ChevronRightIcon",
  "0 0 16 16",
  <path d="M6 4L10 8L6 12" {...stroke} />
);

export const ChevronsUpDownIcon = createIcon(
  "ChevronsUpDownIcon",
  "0 0 16 16",
  <path d="M5 6.5L8 3.5L11 6.5M5 9.5L8 12.5L11 9.5" {...stroke} />
);

export const ArrowRightIcon = createIcon(
  "ArrowRightIcon",
  "0 0 16 16",
  <path d="M3 8H13M13 8L9 4M13 8L9 12" {...stroke} />
);

export const ArrowLeftIcon = createIcon(
  "ArrowLeftIcon",
  "0 0 16 16",
  <path d="M13 8H3M3 8L7 4M3 8L7 12" {...stroke} />
);

export const ArrowUpRightIcon = createIcon(
  "ArrowUpRightIcon",
  "0 0 16 16",
  <path d="M5 11L11 5M11 5H6M11 5V10" {...stroke} />
);

export const TrendingUpIcon = createIcon(
  "TrendingUpIcon",
  "0 0 16 16",
  <path d="M2 11L6.5 6.5L9.5 9.5L14 5M14 5H10M14 5V9" {...stroke} />
);

export const TrendingDownIcon = createIcon(
  "TrendingDownIcon",
  "0 0 16 16",
  <path d="M2 5L6.5 9.5L9.5 6.5L14 11M14 11H10M14 11V7" {...stroke} />
);

export const CheckIcon = createIcon(
  "CheckIcon",
  "0 0 16 16",
  <path d="M3 8L6.5 11.5L13 5" {...stroke} />
);

export const MinusIcon = createIcon("MinusIcon", "0 0 16 16", <path d="M3 8H13" {...stroke} />);

export const PlusIcon = createIcon(
  "PlusIcon",
  "0 0 16 16",
  <path d="M8 3V13M3 8H13" {...stroke} />
);

export const CloseIcon = createIcon(
  "CloseIcon",
  "0 0 16 16",
  <path d="M4 4L12 12M12 4L4 12" {...stroke} />
);

export const MenuIcon = createIcon(
  "MenuIcon",
  "0 0 24 24",
  <path d="M4 7H20M4 12H20M4 17H20" {...stroke} />
);

export const MoreHorizontalIcon = createIcon(
  "MoreHorizontalIcon",
  "0 0 16 16",
  <path
    d="M3.5 8a.5.5 0 11-1 0 .5.5 0 011 0zM8.5 8a.5.5 0 11-1 0 .5.5 0 011 0zM13.5 8a.5.5 0 11-1 0 .5.5 0 011 0z"
    fill="currentColor"
  />
);

export const SearchIcon = createIcon(
  "SearchIcon",
  "0 0 16 16",
  <path d="M11 11L14 14M12.5 7.25a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" {...stroke} />
);

export const AlertTriangleIcon = createIcon(
  "AlertTriangleIcon",
  "0 0 16 16",
  <path
    d="M8 6v2.5M8 11h.007M7.12 2.6L1.4 12.4a1 1 0 00.87 1.5h11.46a1 1 0 00.87-1.5L8.88 2.6a1 1 0 00-1.76 0z"
    {...stroke}
  />
);

export const InfoIcon = createIcon(
  "InfoIcon",
  "0 0 16 16",
  <path d="M8 7.25v4M8 5.25h.007M14.5 8A6.5 6.5 0 111.5 8a6.5 6.5 0 0113 0z" {...stroke} />
);

export const ExternalLinkIcon = createIcon(
  "ExternalLinkIcon",
  "0 0 14 14",
  <path
    d="M5 2H2V12H12V9M8 2H12V6M12 2L6 8"
    stroke="currentColor"
    strokeWidth={1.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

export const CircleIcon = createIcon(
  "CircleIcon",
  "0 0 16 16",
  <circle cx="8" cy="8" r="4" fill="currentColor" />
);

export const StarIcon = createIcon(
  "StarIcon",
  "0 0 16 16",
  <path
    d="M8 1.5l1.98 4.26 4.52.53-3.4 3.16.9 4.55L8 11.9l-4 2.1.9-4.55-3.4-3.16 4.52-.53L8 1.5z"
    fill="currentColor"
  />
);

export const ShieldIcon = createIcon(
  "ShieldIcon",
  "0 0 16 16",
  <path d="M8 1.5l5 2v4c0 3.5-2.1 6-5 7-2.9-1-5-3.5-5-7v-4l5-2z" {...stroke} />
);

export const LayersIcon = createIcon(
  "LayersIcon",
  "0 0 16 16",
  <path
    d="M8 2L14 5.5L8 9L2 5.5L8 2zM2 9.5L8 13L14 9.5M2 7.5L8 11L14 7.5"
    {...stroke}
  />
);

export const FileTextIcon = createIcon(
  "FileTextIcon",
  "0 0 16 16",
  <path
    d="M4 1.5h5.5L13 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2.5a1 1 0 011-1zM9 1.5V5h4M5.5 8.5h5M5.5 11h5"
    {...stroke}
  />
);

export const GitBranchIcon = createIcon(
  "GitBranchIcon",
  "0 0 16 16",
  <path
    d="M4 2.5v7.5M4 10a2 2 0 102 2h4a2 2 0 002-2V6.5M12 6.5a2 2 0 100-4 2 2 0 000 4zM4 4.5a2 2 0 100-4 2 2 0 000 4z"
    {...stroke}
  />
);

export const GlobeIcon = createIcon(
  "GlobeIcon",
  "0 0 16 16",
  <path
    d="M14.5 8A6.5 6.5 0 111.5 8a6.5 6.5 0 0113 0zM1.5 8h13M8 1.5c1.7 1.8 2.7 4 2.7 6.5s-1 4.7-2.7 6.5c-1.7-1.8-2.7-4-2.7-6.5S6.3 3.3 8 1.5z"
    {...stroke}
  />
);

export const RefreshIcon = createIcon(
  "RefreshIcon",
  "0 0 16 16",
  <path
    d="M13.5 8A5.5 5.5 0 013 10.2M2.5 8A5.5 5.5 0 0113 5.8M2.5 3.5v2.7h2.7M13.5 12.5v-2.7h-2.7"
    {...stroke}
  />
);

export const SpinnerIcon = createIcon(
  "SpinnerIcon",
  "0 0 24 24",
  <>
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </>
);
