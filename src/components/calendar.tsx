"use client";

import { useState } from "react";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// Selectable year list (recent first).
const NOW_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: NOW_YEAR + 1 - 1920 + 1 }, (_, i) => NOW_YEAR + 1 - i);

// Always render six weeks so the grid height never changes between months.
const CELL_COUNT = 42;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Monday-first offset for the 1st of the month (0 = Monday … 6 = Sunday).
function firstOffset(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}


export interface CalendarProps {
  value: Date | null;
  onSelect: (date: Date) => void;
}

export function Calendar({ value, onSelect }: CalendarProps) {
  const today = new Date();
  const initial = value ?? today;
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });

  const total = daysInMonth(view.year, view.month);
  const offset = firstOffset(view.year, view.month);
  const cells: (number | null)[] = Array.from({ length: CELL_COUNT }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= total ? day : null;
  });

  return (
    <div className="cal" aria-label="pick a date">
      <div className="cal__head">
        <select
          className="cal__select"
          value={view.month}
          onChange={(e) => setView((v) => ({ ...v, month: Number(e.target.value) }))}
          aria-label="month"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select
          className="cal__select"
          value={view.year}
          onChange={(e) => setView((v) => ({ ...v, year: Number(e.target.value) }))}
          aria-label="year"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      <div className="cal__grid">
        {cells.map((day, i) => {
          if (day === null) return <span key={i} className="cal__day cal__day--empty" />;
          const date = new Date(view.year, view.month, day);
          const selected = value ? sameDay(date, value) : false;
          return (
            <button
              key={i}
              type="button"
              className={`cal__day${selected ? " cal__day--selected" : ""}`}
              onClick={() => onSelect(date)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
