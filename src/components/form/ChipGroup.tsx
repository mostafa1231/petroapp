"use client";

import { useRef, type KeyboardEvent } from "react";

interface Props<T extends string> {
  id: string;
  label: string;
  options: readonly T[];
  labels: (o: T) => string;
  value: T | T[] | undefined;
  onChange: (v: T | T[]) => void;
  onBlur?: () => void;
  multiple?: boolean;
  error?: string;
  hint?: string;
  columns?: 2 | 3 | "3fixed";
  name: string;
  hideLabel?: boolean;
}

/**
 * Single-select chips are a WAI-ARIA radiogroup (roving tabindex, arrow
 * keys mirrored for RTL); multi-select chips are a group of checkboxes.
 */
export function ChipGroup<T extends string>({
  id,
  label,
  options,
  labels,
  value,
  onChange,
  onBlur,
  multiple,
  error,
  hint,
  columns = 3,
  name,
  hideLabel,
}: Props<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = (o: T) => (multiple ? Array.isArray(value) && value.includes(o) : value === o);
  const activeIndex = Math.max(
    0,
    options.findIndex((o) => selected(o)),
  );
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  function pick(o: T) {
    if (multiple) {
      const cur = Array.isArray(value) ? value : [];
      onChange(cur.includes(o) ? cur.filter((v) => v !== o) : [...cur, o]);
    } else {
      onChange(o);
    }
  }

  function onKey(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (multiple) return;
    const rtl = document.documentElement.dir === "rtl";
    const fwd = ["ArrowDown", rtl ? "ArrowLeft" : "ArrowRight"];
    const back = ["ArrowUp", rtl ? "ArrowRight" : "ArrowLeft"];
    let next = -1;
    if (fwd.includes(e.key)) next = (i + 1) % options.length;
    else if (back.includes(e.key)) next = (i - 1 + options.length) % options.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    if (next >= 0) {
      e.preventDefault();
      refs.current[next]?.focus();
      onChange(options[next]);
    }
  }

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset className="min-w-0" data-field={name}>
      <legend id={`${id}-label`} className={hideLabel ? "sr-only" : "field-label"}>
        {label}
      </legend>
      {hint && (
        <p id={hintId} className="-mt-1 mb-2 text-sm text-muted">
          {hint}
        </p>
      )}
      <div
        role={multiple ? "group" : "radiogroup"}
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={`grid gap-2 ${columns === 2 ? "grid-cols-2" : columns === "3fixed" ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-3"}`}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) onBlur?.();
        }}
      >
        {options.map((o, i) => {
          const on = selected(o);
          return (
            <button
              key={o}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role={multiple ? "checkbox" : "radio"}
              aria-checked={on}
              tabIndex={multiple ? 0 : i === activeIndex ? 0 : -1}
              className={`chip text-[0.95rem] ${columns === "3fixed" ? "whitespace-nowrap !px-1" : ""}`}
              data-value={o}
              onClick={() => pick(o)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <bdi>{labels(o)}</bdi>
            </button>
          );
        })}
      </div>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}
