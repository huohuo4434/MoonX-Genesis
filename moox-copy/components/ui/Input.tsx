import { cn } from "@/lib/utils";
import { InputHTMLAttributes, ReactNode, forwardRef, useId } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Icon rendered inside the left edge of the field. */
  leadingIcon?: ReactNode;
  /** Icon rendered inside the right edge of the field. */
  trailingIcon?: ReactNode;
  /** Error message — sets `aria-invalid` and renders red helper text. */
  error?: string;
  /** Helper text shown below the field when there is no error. */
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leadingIcon, trailingIcon, error, hint, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hintId = hint || error ? `${inputId}-hint` : undefined;

    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leadingIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center text-foreground-tertiary">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={hintId}
            className={cn(
              "h-10 w-full rounded-md border border-input bg-surface px-3 text-body-sm text-foreground placeholder:text-foreground-tertiary transition-colors",
              "focus-ring focus-visible:border-primary/50",
              "disabled:cursor-not-allowed disabled:opacity-50",
              leadingIcon && "pl-9",
              trailingIcon && "pr-9",
              error && "border-danger/50 focus-visible:ring-danger/50",
              className
            )}
            {...props}
          />
          {trailingIcon && (
            <span className="absolute right-3 flex items-center text-foreground-tertiary">
              {trailingIcon}
            </span>
          )}
        </div>
        {(hint || error) && (
          <p id={hintId} className={cn("mt-1.5 text-caption", error ? "text-danger" : "text-foreground-tertiary")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
