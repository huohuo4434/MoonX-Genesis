import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "./Spinner";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 focus-ring disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-surface text-foreground hover:bg-surface/70 border border-border/10",
        ghost: "text-foreground-secondary hover:text-foreground hover:bg-muted",
        outline: "border border-border/10 text-foreground hover:border-primary/50 hover:bg-primary/5",
        danger: "bg-danger text-white hover:bg-danger/90",
        link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 px-3 text-body-sm gap-1.5",
        md: "h-10 px-4 text-body-sm",
        lg: "h-11 px-6 text-body",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Show a loading spinner and disable interaction. */
  isLoading?: boolean;
  /** Render the child element directly (e.g. a router `Link`) instead of a `<button>`, keeping all styling. */
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, isLoading = false, disabled, asChild = false, children, ...props },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        disabled={asChild ? undefined : disabled || isLoading}
        aria-busy={isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {/* `Slot` requires exactly one child, so the spinner can only be
            injected when rendering a real `<button>`. */}
        {asChild ? children : (
          <>
            {isLoading && <Spinner size={14} />}
            {children}
          </>
        )}
      </Comp>
    );
  }
);

Button.displayName = "Button";

export { Button };
