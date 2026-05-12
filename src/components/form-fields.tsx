"use client";

import { useMemo, useState } from "react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function Field({
  label,
  children,
  required = false,
  error,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink/70">
        {label}
        {required ? <span className="ml-1 text-leaf">필수</span> : null}
      </span>
      <div className="mt-1">{children}</div>
      {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="min-h-11 w-full border border-line bg-white px-3 text-base outline-none focus:border-leaf"
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-28 w-full border border-line bg-white px-3 py-2 text-base outline-none focus:border-leaf"
    />
  );
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDateValue(value?: string) {
  const fallback = new Date();
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return {
      year: fallback.getFullYear(),
      month: fallback.getMonth() + 1,
      day: fallback.getDate(),
    };
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

export function DateSelectInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  const initial = parseDateValue(defaultValue);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(
    () => Array.from({ length: 11 }, (_, index) => currentYear - 5 + index),
    [currentYear],
  );
  const dayCount = daysInMonth(year, month);
  const safeDay = Math.min(day, dayCount);
  const value = `${year}-${String(month).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;

  return (
    <div className="grid grid-cols-[1fr_0.8fr_0.8fr] gap-2">
      <input type="hidden" name={name} value={value} />
      <select
        name={`${name}Year`}
        value={year}
        onChange={(event) => setYear(Number(event.target.value))}
        className="min-h-11 border border-line bg-white px-3 text-base outline-none focus:border-leaf"
      >
        {yearOptions.map((year) => (
          <option key={year} value={year}>
            {year}년
          </option>
        ))}
      </select>
      <select
        name={`${name}Month`}
        value={month}
        onChange={(event) => {
          const nextMonth = Number(event.target.value);
          setMonth(nextMonth);
          setDay((currentDay) => Math.min(currentDay, daysInMonth(year, nextMonth)));
        }}
        className="min-h-11 border border-line bg-white px-3 text-base outline-none focus:border-leaf"
      >
        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
          <option key={month} value={month}>
            {month}월
          </option>
        ))}
      </select>
      <select
        name={`${name}Day`}
        value={safeDay}
        onChange={(event) => setDay(Number(event.target.value))}
        className="min-h-11 border border-line bg-white px-3 text-base outline-none focus:border-leaf"
      >
        {Array.from({ length: dayCount }, (_, index) => index + 1).map((day) => (
          <option key={day} value={day}>
            {day}일
          </option>
        ))}
      </select>
    </div>
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="min-h-11 w-full border border-line bg-white px-3 text-base outline-none focus:border-leaf"
    />
  );
}

export function SubmitButton({
  children,
  disabled = false,
}: {
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center bg-ink px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-ink/35"
    >
      {children}
    </button>
  );
}
