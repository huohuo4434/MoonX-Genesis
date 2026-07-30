import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef, useId } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  hint?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, hint, id, rows = 4, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const hintId = hint || error ? `${textareaId}-hint` : undefined;

    return (
      <div className="w-full">
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error}
          aria-describedby={hintId}
          className={cn(
            "w-full resize-y rounded-md border border-input bg-surface px-3 py-2 text-body-sm text-foreground placeholder:text-foreground-tertiary transition-colors",
            "focus-ring focus-visible:border-primary/50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-danger/50 focus-visible:ring-danger/50",
            className
          )}
          {...props}
        />
        {(hint || error) && (
          <p id={hintId} className={cn("mt-1.5 text-caption", error ? "text-danger" : "text-foreground-tertiary")}>
            {error ?? hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
