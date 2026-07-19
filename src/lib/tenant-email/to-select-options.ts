import {
  formatFunctionalUnit,
  sortTenantEmailsByUnit,
} from "@/lib/tenant-email/format-unit";
import type { TenantEmail } from "@/types/tenant-email";

/** Generic select option shape (compatible with SearchableSelect). */
export type TenantEmailSelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

/** Map tenant emails to searchable-select options (sorted by unit). */
export function tenantEmailsToSelectOptions(
  entries: TenantEmail[],
): TenantEmailSelectOption[] {
  return sortTenantEmailsByUnit(entries).map((entry) => {
    const unitLabel = formatFunctionalUnit(entry);
    const keywords = [entry.floor, entry.departmentNumber, entry.letter].filter(
      (value): value is string => Boolean(value),
    );

    return {
      value: entry.email,
      label: entry.email,
      description: unitLabel === "—" ? undefined : unitLabel,
      keywords,
    };
  });
}
