"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/icons";
import { cva, type VariantProps } from "class-variance-authority";
import { ReactNode } from "react";
import { DialogOverlay, DialogPortal } from "./Dialog";

const modalContentVariants = cva(
  "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border/10 bg-card shadow-elevated",
  {
    variants: {
      size: {
        sm: "w-full max-w-sm",
        md: "w-full max-w-lg",
        lg: "w-full max-w-2xl",
        xl: "w-full max-w-4xl",
        full: "h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface ModalProps extends VariantProps<typeof modalContentVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
  /** Accessible name for screen readers. Visually hidden unless `titleIsVisible` is set. */
  title: string;
  /** Render `title` as a visible heading instead of a screen-reader-only label. */
  titleIsVisible?: boolean;
  hideClose?: boolean;
}

/**
 * Free-form modal overlay for content that doesn't fit the structured
 * `Dialog` header/footer shape (custom layouts, embedded forms, media).
 * Built on the same Radix Dialog primitive, so focus trapping, scroll
 * locking, and escape-to-close behave identically to `Dialog`.
 */
export function Modal({
  open,
  onOpenChange,
  children,
  className,
  size,
  title,
  titleIsVisible = false,
  hideClose = false,
}: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          className={cn(
            modalContentVariants({ size }),
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            className
          )}
        >
          <DialogPrimitive.Title className={cn("text-h3 text-foreground", !titleIsVisible && "sr-only")}>
            {title}
          </DialogPrimitive.Title>
          {children}
          {!hideClose && (
            <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-foreground-tertiary transition-colors hover:text-foreground focus-ring">
              <CloseIcon size={16} />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
