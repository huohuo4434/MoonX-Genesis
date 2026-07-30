/**
 * Foundational, cross-cutting types shared across the app.
 *
 * Domain entities (Forecast, Asset, Opportunity, etc.) should be defined
 * next to the feature that owns them once that feature is built, not
 * here — keep this file limited to generic building blocks.
 */
import type { ReactNode } from "react";

/** Base props every component that accepts custom styling should extend. */
export interface BaseComponentProps {
  className?: string;
  children?: ReactNode;
}

/** Standard shape for a paginated API response. */
export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
}

/** Standard shape for a successful or failed API result (discriminated union). */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/** Common async UI state for data-fetching components/hooks. */
export type AsyncStatus = "idle" | "loading" | "success" | "error";

/** A generic key/label pair, useful for selects, tabs, and nav items. */
export interface Option<TValue extends string = string> {
  label: string;
  value: TValue;
}

/** SEO metadata shape used to build Next.js `Metadata` objects consistently. */
export interface SeoProps {
  title: string;
  description: string;
  path?: string;
  imageUrl?: string;
}
