import { Badge } from "@/components/ui/badge";
import { formatFunctionalUnit } from "@/lib/tenant-email/format-unit";
import type { TenantEmail, TenantEmailContactType } from "@/types/tenant-email";
import { cn } from "@/lib/utils";

type UnitBadgeProps = {
  entry: Pick<TenantEmail, "floor" | "departmentNumber" | "letter">;
  className?: string;
};

export function UnitBadge({ entry, className }: UnitBadgeProps) {
  return (
    <Badge variant="secondary" className={cn("font-normal", className)}>
      {formatFunctionalUnit(entry)}
    </Badge>
  );
}

const contactTypeLabels: Record<TenantEmailContactType, string> = {
  propietario: "Propietario",
  inquilino: "Inquilino",
};

type ContactTypeBadgeProps = {
  contactType: TenantEmailContactType;
  className?: string;
};

export function ContactTypeBadge({ contactType, className }: ContactTypeBadgeProps) {
  return (
    <Badge
      variant={contactType === "propietario" ? "outline" : "secondary"}
      className={cn("font-normal", className)}
    >
      {contactTypeLabels[contactType]}
    </Badge>
  );
}
