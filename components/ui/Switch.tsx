"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export type SwitchProps = React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>;

const Switch = forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors",
        "bg-muted data-[state=checked]:bg-primary",
        "focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-soft ring-0 transition-transform",
          "translate-x-0.5 data-[state=checked]:translate-x-[18px]"
        )}
      />
    </SwitchPrimitive.Root>
  )
);
Switch.displayName = "Switch";

export { Switch };
