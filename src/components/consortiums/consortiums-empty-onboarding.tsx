import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

const ONBOARDING_STEPS = [
  {
    number: "01",
    title: "Datos del edificio",
    description: "Nombre y ubicación. Dos campos y listo.",
  },
  {
    number: "02",
    title: "Unidades y emails",
    description: "Cargá inquilinos cuando quieras, no es bloqueante.",
  },
  {
    number: "03",
    title: "Enviar expensas",
    description: "El flujo mensual aparece apenas tengas el consorcio.",
  },
] as const;

type ConsortiumsEmptyOnboardingProps = {
  userName: string;
  onCreate: () => void;
};

export function ConsortiumsEmptyOnboarding({
  userName,
  onCreate,
}: ConsortiumsEmptyOnboardingProps) {
  return (
    <div className="relative mx-auto flex w-full max-w-[880px] flex-col px-4 py-16 sm:px-6 sm:py-20">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
        Primer paso
      </p>
      <h1
        id="page-title"
        className="mt-3 max-w-[18ch] text-balance text-[2rem] font-semibold leading-[1.1] tracking-[-0.04em] text-foreground sm:text-[2.375rem]"
      >
        Creá tu primer consorcio
      </h1>
      <p className="mt-4 max-w-md text-pretty text-[16px] leading-relaxed text-[oklch(0.38_0.02_250)]">
        Hola {userName}. Sin un consorcio no hay unidades ni envíos. Arrancá acá; el resto del panel
        se enciende después.
      </p>

      <section
        className="mt-10 rounded-lg border border-border bg-card p-6 shadow-card sm:p-8"
        aria-label="Empezar"
      >
        <Button
          type="button"
          variant="default"
          className="group h-12 w-full gap-2.5 rounded-lg px-6 text-[15px] font-semibold sm:h-[3.25rem] sm:text-base"
          onClick={onCreate}
        >
          <Plus
            className="size-5 transition-transform duration-200 group-hover:rotate-90 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
            aria-hidden="true"
          />
          Agregar nuevo consorcio
        </Button>

        <ol className="mt-8 grid gap-4 sm:grid-cols-3 sm:gap-5">
          {ONBOARDING_STEPS.map((step) => (
            <li key={step.number} className="min-w-0">
              <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                {step.number}
              </p>
              <p className="mt-1.5 text-sm font-semibold tracking-tight">{step.title}</p>
              <p className="mt-1 text-[13px] leading-snug text-muted-foreground">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Podés agregar más consorcios después desde esta misma pantalla.
      </p>
    </div>
  );
}
