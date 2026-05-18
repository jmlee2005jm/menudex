"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function MultiSelectField({
  name,
  options,
  value: controlledValue,
  onChange,
  defaultValue = "",
  placeholder = "선택",
}: {
  name: string;
  options: string[];
  value?: string[];
  onChange?: (value: string[]) => void;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [uncontrolledSelected, setUncontrolledSelected] = useState(() =>
    parseMultiValue(defaultValue),
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = controlledValue ?? uncontrolledSelected;
  const value = useMemo(() => selected.join(","), [selected]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function toggle(option: string) {
    const nextSelected = selected.includes(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];

    if (onChange) {
      onChange(nextSelected);
      return;
    }

    setUncontrolledSelected(nextSelected);
  }

  function clearSelection() {
    if (onChange) {
      onChange([]);
      return;
    }

    setUncontrolledSelected([]);
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 border border-line bg-white px-3 text-left text-base outline-none focus:border-leaf"
      >
        <span className="flex min-w-0 flex-wrap gap-1 py-2">
          {selected.length > 0 ? (
            selected.map((item) => (
              <span
                key={item}
                className="border border-line bg-paper px-2 py-0.5 text-sm text-ink"
              >
                {item}
              </span>
            ))
          ) : (
            <span className="text-ink/45">{placeholder}</span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2 text-sm text-ink/55">
          {selected.length > 0 ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="선택 지우기"
              title="선택 지우기"
              onClick={(event) => {
                event.stopPropagation();
                clearSelection();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  clearSelection();
                }
              }}
              className="inline-grid h-6 w-6 place-items-center text-base leading-none text-ink/70"
            >
              ×
            </span>
          ) : null}
          <span>{open ? "▲" : "▼"}</span>
        </span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto overscroll-contain border border-line bg-white p-2 shadow-sm [scrollbar-gutter:stable]">
          <div className="grid min-h-full gap-1 bg-white">
            {options.map((option) => {
              const active = selected.includes(option);

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggle(option)}
                  className={`flex min-h-10 items-center justify-between px-3 text-left text-sm ${
                    active ? "bg-ink text-white" : "bg-white text-ink hover:bg-paper"
                  }`}
                >
                  <span>{option}</span>
                  {active ? <span aria-hidden="true">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function formatMultiValue(value: string | null) {
  return parseMultiValue(value ?? "").join(" · ");
}

export function parseMultiValue(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
