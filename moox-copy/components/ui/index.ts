/**
 * Barrel for every generic UI primitive. Import from "@/components/ui"
 * rather than deep-importing individual files so primitives can be
 * refactored internally without touching call sites.
 */

// Typography
export { Heading } from "./Heading";
export type { HeadingProps, HeadingSize } from "./Heading";
export { Text } from "./Text";
export type { TextProps, TextVariant, TextColor } from "./Text";

// Layout
export { Container } from "./Container";
export type { ContainerProps } from "./Container";
export { Section } from "./Section";
export type { SectionProps } from "./Section";
export { Divider } from "./Divider";
export type { DividerProps } from "./Divider";

// Buttons & form controls
export { Button, buttonVariants } from "./Button";
export type { ButtonProps } from "./Button";
export { Input } from "./Input";
export type { InputProps } from "./Input";
export { Textarea } from "./Textarea";
export type { TextareaProps } from "./Textarea";
export { Checkbox } from "./Checkbox";
export type { CheckboxProps } from "./Checkbox";
export { Switch } from "./Switch";
export type { SwitchProps } from "./Switch";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from "./Select";

// Overlays
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./Tabs";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./Tooltip";
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
} from "./Dropdown";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./Dialog";
export { Modal } from "./Modal";
export type { ModalProps } from "./Modal";
export {
  ToastProvider,
  toast,
  useToastStore,
  ToastRoot,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
} from "./Toast";
export type { ToastOptions } from "./Toast";

// Data display & feedback
export { Badge, badgeVariants } from "./Badge";
export type { BadgeProps } from "./Badge";
export { Avatar, avatarVariants } from "./Avatar";
export type { AvatarProps } from "./Avatar";
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./Card";
export type { CardProps } from "./Card";
export { StatCard } from "./StatCard";
export type { StatCardProps } from "./StatCard";
export { EmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";
export { Skeleton } from "./Skeleton";
export type { SkeletonProps } from "./Skeleton";
export { Progress } from "./Progress";
export type { ProgressProps } from "./Progress";
export { Spinner } from "./Spinner";
export type { SpinnerProps } from "./Spinner";

// Navigation
export { Breadcrumb } from "./Breadcrumb";
export type { BreadcrumbProps, BreadcrumbItem } from "./Breadcrumb";
export { Pagination } from "./Pagination";
export type { PaginationProps } from "./Pagination";
