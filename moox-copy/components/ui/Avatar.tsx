"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full bg-muted text-foreground-secondary",
  {
    variants: {
      size: {
        sm: "h-7 w-7 text-caption",
        md: "h-9 w-9 text-body-sm",
        lg: "h-12 w-12 text-body",
      },
    },
    defaultVariants: { size: "md" },
  }
);

export interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  /** Shown while the image loads or if it fails — typically initials. */
  fallback: string;
}

const Avatar = forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, size, src, alt = "", fallback, ...props }, ref) => (
    <AvatarPrimitive.Root ref={ref} className={cn(avatarVariants({ size }), className)} {...props}>
      {src && <AvatarPrimitive.Image src={src} alt={alt} className="h-full w-full object-cover" />}
      <AvatarPrimitive.Fallback
        className="flex h-full w-full items-center justify-center font-medium"
        delayMs={src ? 400 : 0}
      >
        {fallback}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
);
Avatar.displayName = "Avatar";

export { Avatar, avatarVariants };
