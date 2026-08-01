"use client";

import { useState } from "react";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];
const WEEKDAYS = ["mo", "tu", "we", "th", "fr", "sa", "su"]; // Monday-first

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

  const shiftMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.year, v.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const total = daysInMonth(view.year, view.month);
  const offset = firstOffset(view.year, view.month);
  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  return (
    <div className="cal" aria-label="pick a date">
      <div className="cal__head">
        <button
          type="button"
          className="cal__nav"
          onClick={() => shiftMonth(-1)}
          aria-label="previous month"
        >
          ‹
        </button>
        <span className="cal__title">
          {MONTHS[view.month]} {view.year}
        </span>
        <button
          type="button"
          className="cal__nav"
          onClick={() => shiftMonth(1)}
          aria-label="next month"
        >
          ›
        </button>
      </div>

      <div className="cal__grid cal__weekdays" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d} className="cal__weekday">
            {d}
          </span>
        ))}
      </div>

      <div className="cal__grid">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} className="cal__day cal__day--empty" />;
          const date = new Date(view.year, view.month, day);
          const selected = value ? sameDay(date, value) : false;
          const isToday = sameDay(date, today);
          return (
            <button
              key={day}
              type="button"
              className={`cal__day${selected ? " cal__day--selected" : ""}${
                isToday && !selected ? " cal__day--today" : ""
              }`}
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
