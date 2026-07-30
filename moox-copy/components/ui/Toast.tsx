"use client";

import * as ToastPrimitive from "@radix-ui/react-toast";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { CloseIcon } from "@/components/icons";
import { forwardRef, useCallback, useEffect, useState, type ReactNode } from "react";

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border p-4 shadow-elevated",
  {
    variants: {
      variant: {
        default: "border-border/10 bg-card text-foreground",
        success: "border-success/20 bg-card text-foreground",
        warning: "border-warning/20 bg-card text-foreground",
        danger: "border-danger/20 bg-card text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

const ToastRoot = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Root> & VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => (
  <ToastPrimitive.Root
    ref={ref}
    className={cn(
      toastVariants({ variant }),
      "data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full data-[swipe=end]:animate-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 sm:data-[state=open]:slide-in-from-bottom-full",
      className
    )}
    {...props}
  />
));
ToastRoot.displayName = "ToastRoot";

const ToastViewport = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4 outline-none",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = "ToastViewport";

const ToastTitle = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Title ref={ref} className={cn("text-body-sm font-medium", className)} {...props} />
));
ToastTitle.displayName = "ToastTitle";

const ToastDescription = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Description
    ref={ref}
    className={cn("text-caption text-foreground-secondary", className)}
    {...props}
  />
));
ToastDescription.displayName = "ToastDescription";

const ToastClose = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-sm text-foreground-tertiary opacity-0 transition-opacity hover:text-foreground focus-ring group-hover:opacity-100",
      className
    )}
    {...props}
  >
    <CloseIcon size={14} />
  </ToastPrimitive.Close>
));
ToastClose.displayName = "ToastClose";

const ToastAction = forwardRef<
  React.ElementRef<typeof ToastPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Action
    ref={ref}
    className={cn(
      "shrink-0 rounded-md border border-border/10 bg-transparent px-2.5 py-1 text-caption font-medium transition-colors hover:bg-muted focus-ring",
      className
    )}
    {...props}
  />
));
ToastAction.displayName = "ToastAction";

/* --------------------------------------------------------------------- */
/* Imperative toast() API — a minimal module-level store so `toast()` can */
/* be called from event handlers anywhere, not just inside components.   */
/* --------------------------------------------------------------------- */

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: VariantProps<typeof toastVariants>["variant"];
  action?: ReactNode;
  durationMs?: number;
}

interface ToastRecord extends ToastOptions {
  id: string;
}

type Listener = (toasts: ToastRecord[]) => void;

let toasts: ToastRecord[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(options: ToastOptions) {
  const id = crypto.randomUUID();
  toasts = [...toasts, { id, durationMs: 5000, ...options }];
  emit();
  return { id, dismiss: () => dismissToast(id) };
}

/** Subscribes a component to the current toast queue. Used internally by `ToastProvider`. */
export function useToastStore() {
  const [state, setState] = useState<ToastRecord[]>(toasts);

  useEffect(() => {
    listeners.add(setState);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const dismiss = useCallback((id: string) => dismissToast(id), []);

  return { toasts: state, dismiss };
}

/** Mount once near the root of the app. Renders every active toast. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { toasts: activeToasts, dismiss } = useToastStore();

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {children}
      {activeToasts.map(({ id, title, description, variant, action, durationMs }) => (
        <ToastRoot
          key={id}
          variant={variant}
          duration={durationMs}
          onOpenChange={(open) => !open && dismiss(id)}
        >
          <div className="flex-1">
            <ToastTitle>{title}</ToastTitle>
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </ToastRoot>
      ))}
      <ToastViewport />
    </ToastPrimitive.Provider>
  );
}

export { ToastRoot, ToastViewport, ToastTitle, ToastDescription, ToastClose, ToastAction, toastVariants };
