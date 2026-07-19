"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
};

export type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** When false, only one value can be selected. */
  multiple?: boolean;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  noResultsMessage?: string;
  selectedEmptyMessage?: string;
  listLabel?: string;
  id?: string;
  filterOption?: (option: SearchableSelectOption, query: string) => boolean;
  getAutocompleteText?: (option: SearchableSelectOption, query: string) => string | null;
  "aria-invalid"?: boolean | "true" | "false";
  "aria-describedby"?: string;
};

function defaultFilterOption(option: SearchableSelectOption, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  if (option.label.toLowerCase().startsWith(normalizedQuery)) {
    return true;
  }

  if (option.description?.toLowerCase().startsWith(normalizedQuery)) {
    return true;
  }

  return (option.keywords ?? []).some((keyword) =>
    keyword.toLowerCase().startsWith(normalizedQuery),
  );
}

function defaultAutocompleteText(
  option: SearchableSelectOption,
  query: string,
): string | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  if (option.label.toLowerCase().startsWith(normalizedQuery)) {
    return option.label;
  }

  if (option.description?.toLowerCase().startsWith(normalizedQuery)) {
    return option.description;
  }

  const keywordMatch = (option.keywords ?? []).find((keyword) =>
    keyword.toLowerCase().startsWith(normalizedQuery),
  );

  return keywordMatch ?? null;
}

function SearchableSelect({
  options,
  value,
  onChange,
  multiple = false,
  loading = false,
  disabled = false,
  placeholder = "Buscar…",
  emptyMessage = "No hay opciones disponibles.",
  loadingMessage = "Cargando…",
  noResultsMessage = "No hay resultados para esa búsqueda.",
  selectedEmptyMessage = "Ninguna opción seleccionada",
  listLabel = "Opciones",
  id,
  filterOption = defaultFilterOption,
  getAutocompleteText = defaultAutocompleteText,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: SearchableSelectProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedSet = useMemo(() => new Set(value), [value]);

  const optionsByValue = useMemo(() => {
    return new Map(options.map((option) => [option.value, option]));
  }, [options]);

  const filteredOptions = useMemo(() => {
    const query = filter.trim();

    if (!query) {
      return options;
    }

    return options.filter((option) => filterOption(option, query));
  }, [filter, filterOption, options]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        closeDropdown();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const isDisabled = disabled || loading;
  const isInvalid = ariaInvalid === true || ariaInvalid === "true";

  function closeDropdown() {
    setOpen(false);
    setFilter("");
  }

  function openDropdown() {
    if (isDisabled) {
      return;
    }

    setOpen(true);
  }

  function toggleDropdown() {
    if (isDisabled) {
      return;
    }

    if (open) {
      closeDropdown();
      return;
    }

    openDropdown();
    inputRef.current?.focus();
  }

  function applyAutocomplete(typed: string) {
    const query = typed.trim();
    if (!query) {
      setFilter(typed);
      return;
    }

    const match = options.find((option) => filterOption(option, query));
    if (!match) {
      setFilter(typed);
      return;
    }

    const completion = getAutocompleteText(match, query);
    if (!completion || completion.length <= typed.length) {
      setFilter(typed);
      return;
    }

    if (!completion.toLowerCase().startsWith(typed.toLowerCase())) {
      setFilter(typed);
      return;
    }

    const filled = `${typed}${completion.slice(typed.length)}`;
    setFilter(filled);

    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      input.setSelectionRange(typed.length, filled.length);
    });
  }

  function handleFilterChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    const isDeleting = next.length < filter.length;

    setOpen(true);

    if (!multiple && value.length > 0) {
      onChange([]);
    }

    if (isDeleting || !next.trim()) {
      setFilter(next);
      return;
    }

    applyAutocomplete(next);
  }

  function areAllSelected(selectedValues: string[]) {
    return (
      options.length > 0 && options.every((option) => selectedValues.includes(option.value))
    );
  }

  function selectValue(optionValue: string, selectOptions?: { closeAfter?: boolean }) {
    if (multiple) {
      const next = selectedSet.has(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue];

      onChange(next);
      setFilter("");

      if (selectOptions?.closeAfter || areAllSelected(next)) {
        closeDropdown();
        return;
      }

      inputRef.current?.focus();
      return;
    }

    onChange([optionValue]);
    closeDropdown();
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (filter.trim() && filteredOptions[0]) {
        selectValue(filteredOptions[0].value, { closeAfter: true });
        return;
      }

      closeDropdown();
      return;
    }

    if (event.key !== "Tab" && event.key !== "ArrowRight") {
      return;
    }

    const input = inputRef.current;
    if (!input || !filter) {
      return;
    }

    const hasSuggestionSelected =
      input.selectionStart !== null &&
      input.selectionEnd !== null &&
      input.selectionStart < input.selectionEnd &&
      input.selectionEnd === filter.length;

    if (hasSuggestionSelected) {
      event.preventDefault();
      input.setSelectionRange(filter.length, filter.length);
    }
  }

  function removeValue(optionValue: string) {
    onChange(value.filter((item) => item !== optionValue));
  }

  const inputValue = (() => {
    if (open || multiple) {
      return filter;
    }

    return value[0] ?? "";
  })();

  const resolvedPlaceholder = loading ? loadingMessage : placeholder;

  return (
    <div ref={rootRef} className="grid gap-2">
      <div className="relative">
        <div
          className={cn(
            "flex h-9 w-full items-center gap-1.5 rounded-md border border-input bg-transparent px-2.5 shadow-xs transition-[color,box-shadow]",
            "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
            isDisabled && "cursor-not-allowed opacity-50",
            isInvalid && "border-destructive focus-within:ring-destructive/20",
          )}
        >
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-autocomplete="both"
            aria-invalid={isInvalid || undefined}
            aria-describedby={ariaDescribedBy}
            disabled={isDisabled}
            value={inputValue}
            placeholder={resolvedPlaceholder}
            onFocus={openDropdown}
            onChange={handleFilterChange}
            onKeyDown={handleInputKeyDown}
            className="h-7 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground selection:bg-muted selection:text-muted-foreground disabled:cursor-not-allowed"
          />

          <button
            type="button"
            tabIndex={-1}
            aria-label={open ? "Cerrar listado" : "Abrir listado"}
            disabled={isDisabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleDropdown();
            }}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none"
          >
            <ChevronDown
              className={cn("size-4 transition-transform", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>

        {open ? (
          <div
            id={listboxId}
            className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            <ul className="max-h-52 overflow-y-auto p-1" aria-label={listLabel}>
              {loading ? (
                <li className="px-2 py-3 text-sm text-muted-foreground">{loadingMessage}</li>
              ) : filteredOptions.length === 0 ? (
                <li className="px-2 py-3 text-sm text-muted-foreground">
                  {options.length === 0 ? emptyMessage : noResultsMessage}
                </li>
              ) : (
                filteredOptions.map((option) => {
                  const selected = selectedSet.has(option.value);

                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => selectValue(option.value)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors",
                          selected
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-4 shrink-0 items-center justify-center border border-input",
                            multiple ? "rounded-sm" : "rounded-full",
                            selected && "border-primary bg-primary text-primary-foreground",
                          )}
                        >
                          {selected ? <Check className="size-3" aria-hidden="true" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{option.label}</span>
                          {option.description ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>

      {multiple ? (
        <div className="h-28 w-full overflow-y-auto rounded-md border border-border/70 bg-muted/20 p-1.5">
          {value.length === 0 ? (
            <p className="px-1 py-1 text-xs text-muted-foreground">{selectedEmptyMessage}</p>
          ) : (
            <ul className="flex w-full flex-wrap gap-1.5">
              {value.slice(0, 10).map((optionValue) => {
                const option = optionsByValue.get(optionValue);

                return (
                  <li
                    key={optionValue}
                    className="inline-flex max-w-[calc(50%-0.1875rem)] items-center gap-0.5 rounded-md border border-border/70 bg-muted/40 py-0.5 pr-0.5 pl-1.5 text-xs text-muted-foreground"
                  >
                    <span className="min-w-0 truncate">
                      <span className="text-foreground">{option?.label ?? optionValue}</span>
                      {option?.description ? (
                        <span className="text-muted-foreground"> · {option.description}</span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      aria-label={`Quitar ${option?.label ?? optionValue}`}
                      disabled={isDisabled}
                      onClick={() => removeValue(optionValue)}
                      className="inline-flex size-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground disabled:pointer-events-none"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
              {value.length > 10 ? (
                <li className="inline-flex items-center px-1 text-xs text-muted-foreground">
                  +{value.length - 10} más
                </li>
              ) : null}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

export { SearchableSelect };
