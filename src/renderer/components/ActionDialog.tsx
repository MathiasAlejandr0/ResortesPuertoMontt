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
  preventAutoClose?: boolean
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
  preventAutoClose = false,
}: ActionDialogProps) {
  // Wrapper para onOpenChange que previene el cierre automático si preventAutoClose está activo
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    // Si preventAutoClose está activo y se intenta cerrar
    if (preventAutoClose && !newOpen) {
      // No permitir cerrar automáticamente
      // El cierre solo será posible cuando el usuario haga clic explícitamente en X o botón Cancelar
      // Los handlers onInteractOutside y onEscapeKeyDown previenen el cierre automático
      return;
    }
    onOpenChange(newOpen);
  }, [preventAutoClose, onOpenChange]);

  // Listener para el evento personalizado de cierre explícito (Dialog)
  React.useEffect(() => {
    if (preventAutoClose && variant === "modal") {
      const handleDialogCloseRequest = () => {
        onOpenChange(false);
      };
      window.addEventListener('dialog-close-request', handleDialogCloseRequest);
      return () => {
        window.removeEventListener('dialog-close-request', handleDialogCloseRequest);
      };
    }
  }, [preventAutoClose, variant, onOpenChange]);

  // Listener para el evento personalizado de cierre explícito (Sheet)
  React.useEffect(() => {
    if (preventAutoClose && variant === "slide-over") {
      const handleSheetCloseRequest = () => {
        onOpenChange(false);
      };
      window.addEventListener('sheet-close-request', handleSheetCloseRequest);
      return () => {
        window.removeEventListener('sheet-close-request', handleSheetCloseRequest);
      };
    }
  }, [preventAutoClose, variant, onOpenChange]);

  if (variant === "slide-over") {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent 
          side="right" 
          className={cn(
            "w-full sm:max-w-2xl overflow-y-auto",
            size === "xl" && "sm:max-w-4xl",
            size === "full" && "sm:max-w-[95vw]",
            className
          )}
          preventAutoClose={preventAutoClose}
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          sizeClasses[size],
          "max-h-[90vh] overflow-y-auto",
          className
        )}
        preventAutoClose={preventAutoClose}
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
