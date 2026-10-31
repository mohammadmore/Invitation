import { useEffect, useRef, useState } from 'react';
import { toGregorian, toJalaali, jalaaliMonthLength } from 'jalaali-js';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
const WEEKDAY_NAMES = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
const fa = (n: number) => n.toLocaleString('fa-IR', { useGrouping: false });

const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (gy: number, gm: number, gd: number) => `${gy}-${pad(gm)}-${pad(gd)}`;

function parseIso(iso: string) {
  const [gy, gm, gd] = iso.split('-').map(Number);
  return { gy, gm, gd };
}

function jalaliOf(iso: string) {
  const { gy, gm, gd } = parseIso(iso);
  return toJalaali(gy, gm, gd);
}

function todayIso() {
  // Today's date in Tehran, regardless of the device time zone.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(new Date());
}

/** Human label, e.g. "سه‌شنبه ۱ مهر ۱۴۰۵". */
export function jalaliLabel(iso: string): string {
  if (!iso) return '';
  const { jy, jm, jd } = jalaliOf(iso);
  const { gy, gm, gd } = parseIso(iso);
  const weekday = WEEKDAY_NAMES[new Date(Date.UTC(gy, gm - 1, gd)).getUTCDay()];
  return `${weekday} ${fa(jd)} ${MONTHS[jm - 1]} ${fa(jy)}`;
}

/** Date picker in the Persian (Jalali) calendar; value/onChange use Gregorian YYYY-MM-DD. */
export default function JalaliDatePicker({ value, onChange, min, placeholder = 'انتخاب تاریخ', invalid }: { value: string; onChange: (iso: string) => void; min?: string; placeholder?: string; invalid?: boolean }) {
  const [open, setOpen] = useState(false);
  const initial = jalaliOf(value || (min && min > todayIso() ? min : todayIso()));
  const [view, setView] = useState({ jy: initial.jy, jm: initial.jm });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const j = jalaliOf(value || (min && min > todayIso() ? min : todayIso()));
    setView({ jy: j.jy, jm: j.jm });
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const shift = (delta: number) =>
    setView(v => {
      const idx = v.jy * 12 + (v.jm - 1) + delta;
      return { jy: Math.floor(idx / 12), jm: (idx % 12) + 1 };
    });

  const days = jalaaliMonthLength(view.jy, view.jm);
  const first = toGregorian(view.jy, view.jm, 1);
  const lead = (new Date(Date.UTC(first.gy, first.gm - 1, first.gd)).getUTCDay() + 1) % 7; // Saturday-first
  const today = todayIso();

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-2 rounded-xl border bg-white px-3.5 py-2.5 text-right outline-none transition focus:ring-4 focus:ring-sky-500/15 ${invalid ? 'border-rose-400' : 'border-slate-300 focus:border-sky-500'}`}
      >
        <CalendarDays className="w-4 h-4 text-slate-400 shrink-0" />
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>{value ? jalaliLabel(value) : placeholder}</span>
      </button>

      {open && (
        <div className="absolute z-40 mt-2 w-72 right-0 bg-white rounded-2xl border border-slate-200 shadow-2xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="ماه قبل">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="font-black text-sm text-slate-800">
              {MONTHS[view.jm - 1]} {fa(view.jy)}
            </span>
            <button type="button" onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-slate-100" aria-label="ماه بعد">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map(w => (
              <span key={w} className="text-[11px] font-bold text-slate-400 py-1">
                {w}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const g = toGregorian(view.jy, view.jm, i + 1);
              const iso = toIso(g.gy, g.gm, g.gd);
              const disabled = !!min && iso < min;
              const selected = iso === value;
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={`h-9 rounded-lg text-sm font-bold transition ${selected ? 'bg-sky-500 text-white' : iso === today ? 'ring-1 ring-sky-400 text-sky-700' : 'text-slate-700 hover:bg-slate-100'} disabled:text-slate-300 disabled:hover:bg-transparent`}
                >
                  {fa(i + 1)}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                const j = jalaliOf(today);
                setView({ jy: j.jy, jm: j.jm });
              }}
              className="text-xs font-bold text-sky-600 hover:underline"
            >
              امروز
            </button>
            {value && <span className="text-[11px] text-slate-400" dir="ltr">{value}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
