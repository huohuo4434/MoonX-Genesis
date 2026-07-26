"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "@/components/icons";
import { forwardRef, HTMLAttributes } from "react";

const Dropdown = DropdownMenuPrimitive.Root;
const DropdownTrigger = DropdownMenuPrimitive.Trigger;
const DropdownGroup = DropdownMenuPrimitive.Group;
const DropdownSub = DropdownMenuPrimitive.Sub;
const DropdownRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownSubTrigger = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-body-sm outline-none",
      "focus:bg-muted data-[state=open]:bg-muted",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon size={14} className="ml-auto text-foreground-tertiary" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownSubTrigger.displayName = "DropdownSubTrigger";

const DropdownSubContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border/10 bg-popover p-1 text-popover-foreground shadow-elevated",
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      className
    )}
    {...props}
  />
));
DropdownSubContent.displayName = "DropdownSubContent";

const DropdownContent = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[10rem] overflow-hidden rounded-md border border-border/10 bg-popover p-1 text-popover-foreground shadow-elevated",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownContent.displayName = "DropdownContent";

const DropdownItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean; destructive?: boolean }
>(({ className, inset, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-body-sm outline-none transition-colors",
      "focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      destructive ? "text-danger focus:text-danger" : "text-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownItem.displayName = "DropdownItem";

const DropdownCheckboxItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    checked={checked}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body-sm text-foreground outline-none",
      "focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-primary">
      <DropdownMenuPrimitive.ItemIndicator>
        <CheckIcon size={13} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownCheckboxItem.displayName = "DropdownCheckboxItem";

const DropdownRadioItem = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-body-sm text-foreground outline-none",
      "focus:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center text-primary">
      <DropdownMenuPrimitive.ItemIndicator>
        <CircleIcon size={8} />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownRadioItem.displayName = "DropdownRadioItem";

const DropdownLabel = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-caption text-foreground-tertiary", inset && "pl-8", className)}
    {...props}
  />
));
DropdownLabel.displayName = "DropdownLabel";

const DropdownSeparator = forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("-mx-1 my-1 h-px bg-border/10", className)} {...props} />
));
DropdownSeparator.displayName = "DropdownSeparator";

function DropdownShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("ml-auto text-caption text-foreground-tertiary", className)} {...props} />
  );
}

export {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownCheckboxItem,
  DropdownRadioItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownShortcut,
  DropdownGroup,
  DropdownSub,
  DropdownSubTrigger,
  DropdownSubContent,
  DropdownRadioGroup,
};
