"use client";

import { Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PasswordVisibilityToggleProps = {
  visible: boolean;
  onToggle: () => void;
  className?: string;
};

/**
 * Instant password show/hide control: no transition-all lag, and
 * mousedown preventDefault keeps the input focused.
 */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
  className,
}: PasswordVisibilityToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(
        "absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground transition-none",
        className,
      )}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onToggle}
    >
      {visible ? <EyeOff /> : <Eye />}
    </Button>
  );
}
