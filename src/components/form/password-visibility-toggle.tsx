"use client";

import * as React from "react";
import { Eye } from "lucide-react";

import { cn } from "@/lib/utils";

type PasswordVisibilityToggleProps = {
  visible: boolean;
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
};

/**
 * Password show/hide control.
 * Keeps a stable Eye icon and only animates the slash (no Eye ↔ EyeOff swap).
 * Toggles on pointerdown so a press is never lost to remounts / mouseup drift.
 */
export function PasswordVisibilityToggle({
  visible,
  onToggle,
  className,
  disabled = false,
}: PasswordVisibilityToggleProps) {
  const toggledByPointerRef = React.useRef(false);

  return (
    <button
      type="button"
      disabled={disabled}
      tabIndex={0}
      aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      aria-pressed={visible}
      className={cn(
        "absolute top-1/2 right-1 flex size-8 -translate-y-1/2 items-center justify-center rounded-[min(var(--radius-md),10px)] text-muted-foreground outline-none select-none",
        "hover:bg-muted hover:text-foreground",
        "focus-visible:border focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0) return;
        // Keep the password input focused; toggle immediately so mouseup drift can't drop the click.
        event.preventDefault();
        toggledByPointerRef.current = true;
        onToggle();
      }}
      onClick={() => {
        // Keyboard (Enter/Space) synthesizes click without a prior pointerdown toggle.
        if (toggledByPointerRef.current) {
          toggledByPointerRef.current = false;
          return;
        }
        if (disabled) return;
        onToggle();
      }}
    >
      <span className="relative inline-flex size-4 items-center justify-center" aria-hidden>
        <Eye className="size-4" strokeWidth={2} />
        <span
          className={cn(
            "absolute top-1/2 left-[-12%] h-[1.5px] w-[124%] origin-center -translate-y-1/2 rotate-[-40deg] rounded-full bg-current",
            "transition-transform duration-150 ease-out motion-reduce:transition-none",
            visible ? "scale-x-100" : "scale-x-0",
          )}
        />
      </span>
    </button>
  );
}
