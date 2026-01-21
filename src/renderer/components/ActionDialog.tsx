import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet"
import { X } from "lucide-react"
import { cn } from "../utils/cn"

interface ActionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  variant?: "modal" | "slide-over"
  size?: "sm" | "md" | "lg" | "xl" | "full"
  className?: string
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw]",
}

export function ActionDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  variant = "modal",
  size = "lg",
  className,
}: ActionDialogProps) {
  if (variant === "slide-over") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          side="right" 
          className={cn(
            "w-full sm:max-w-2xl overflow-y-auto",
            size === "xl" && "sm:max-w-4xl",
            size === "full" && "sm:max-w-[95vw]",
            className
          )}
        >
          {(title || description) && (
            <SheetHeader className="mb-6">
              {title && <SheetTitle className="text-2xl">{title}</SheetTitle>}
              {description && (
                <SheetDescription className="text-base">
                  {description}
                </SheetDescription>
              )}
            </SheetHeader>
          )}
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          sizeClasses[size],
          "max-h-[90vh] overflow-y-auto",
          className
        )}
      >
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle className="text-2xl">{title}</DialogTitle>}
            {description && (
              <DialogDescription className="text-base">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  )
}
