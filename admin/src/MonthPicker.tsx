import { monthLabel, shiftMonth, thisMonth } from './data';

export function MonthPicker({ month, onChange, max = thisMonth() }: {
  month: string;
  onChange: (month: string) => void;
  max?: string;
}) {
  return (
    <div className="month-picker">
      <button className="icon-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month">‹</button>
      <input
        className="input"
        type="month"
        value={month}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        aria-label="Month"
      />
      <button className="icon-btn" disabled={month >= max} onClick={() => onChange(shiftMonth(month, 1))} aria-label="Next month">›</button>
      <strong className="hide-sm">{monthLabel(month)}</strong>
    </div>
  );
}
