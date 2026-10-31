import { useMemo, useState } from 'react';
import { ArrowDownUp, BarChart3, Download, Trophy } from 'lucide-react';
import type { DayCounters, Stats } from '../lib/api';
import { channelLabel, type Rep, type TrackedLink } from '../shared/tracking';
import { toCsv } from './panels';

const fa = (n: number) => n.toLocaleString('fa-IR');
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪` : '—');

/** Guest actions that show real interest (beyond just opening the page). */
const ACTIONS = ['gcal', 'ics', 'map', 'boothMap', 'contact', 'vcard', 'share'];

type Range = '7' | '14' | '30' | 'all';
type GroupBy = 'link' | 'rep' | 'channel' | 'source';

interface Row {
  key: string;
  label: string;
  sub: string;
  view: number;
  unique: number;
  enter: number;
  actions: number;
  rsvp: number;
  checkin: number;
}

function sum(perDay: Record<string, DayCounters> | undefined, days: Set<string> | null, type: string): number {
  if (!perDay) return 0;
  let n = 0;
  for (const [day, c] of Object.entries(perDay)) if (!days || days.has(day)) n += c[type] ?? 0;
  return n;
}

function downloadCsv(name: string, text: string) {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Engagement dashboard: summary, funnel, per link / rep / channel / source table,
 * UTM sources and daily trend. Used by admins (whole invitation) and reps (own links).
 */
export default function Dashboard({
  stats,
  links = [],
  reps = [],
  eventDates,
  scope = 'admin',
  trackingEnabled = false,
}: {
  stats: Stats;
  links?: TrackedLink[];
  reps?: Rep[] | { id: string; name: string }[];
  eventDates?: { start: string; end: string };
  scope?: 'admin' | 'rep';
  trackingEnabled?: boolean;
}) {
  const [range, setRange] = useState<Range>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('link');
  const [sort, setSort] = useState<{ col: keyof Row | 'conv'; desc: boolean }>({ col: 'unique', desc: true });
  const [selected, setSelected] = useState<string>('');

  const allDays = useMemo(() => Object.keys(stats.days).sort(), [stats]);
  const daySet = useMemo(() => {
    if (range === 'all') return null;
    const n = Number(range);
    const from = new Date(Date.now() - (n - 1) * 86_400_000).toISOString().slice(0, 10);
    return new Set(allDays.filter(d => d >= from));
  }, [range, allDays]);

  // ---- summary (scope: admin = whole invitation, rep = only their links)
  const total = (type: string) => (scope === 'rep' ? Object.values(stats.links).reduce((n, perDay) => n + sum(perDay, daySet, type), 0) : sum(stats.days, daySet, type));
  const views = total('view');
  const unique = scope === 'rep' ? total('linkUnique') : total('unique');
  const enter = total('enter');
  const details = total('details');
  const actions = ACTIONS.reduce((n, a) => n + total(a), 0);
  const rsvp = total('rsvp');
  const checkin = total('checkin');
  const walkin = scope === 'rep' ? 0 : total('walkin');

  // ---- per-link rows, then grouped
  const repName = (id: string) => reps.find(r => r.id === id)?.name || '';
  const linkRows: (Row & { repId: string; channel: string; referral: boolean })[] = useMemo(() => {
    const keys = new Set([...Object.keys(stats.links), ...links.map(l => l.code)]);
    return [...keys].map(key => {
      const referral = key.endsWith('+ref');
      const code = referral ? key.slice(0, -4) : key;
      const link = links.find(l => l.code === code);
      const per = stats.links[key];
      const base = code === '_' ? 'لینک اصلی (بدون کد)' : link?.label || code;
      return {
        key,
        label: referral ? `${base} — ارجاع` : base,
        sub: code === '_' ? '' : `/${code}${link && !link.active ? ' — غیرفعال' : ''}`,
        repId: link?.repId ?? '',
        channel: code === '_' ? '' : (link?.channel ?? ''),
        referral,
        view: sum(per, daySet, 'view'),
        unique: sum(per, daySet, 'linkUnique'),
        enter: sum(per, daySet, 'enter'),
        actions: ACTIONS.reduce((n, a) => n + sum(per, daySet, a), 0),
        rsvp: sum(per, daySet, 'rsvp'),
        checkin: sum(per, daySet, 'checkin'),
      };
    });
  }, [stats, links, daySet]);

  const rows: Row[] = useMemo(() => {
    if (groupBy === 'link') return linkRows;
    const groups = new Map<string, Row>();
    for (const r of linkRows) {
      const [key, label] =
        groupBy === 'rep'
          ? [r.repId || '-', r.repId ? repName(r.repId) || 'کارشناس حذف‌شده' : 'بدون کارشناس (شرکت)']
          : groupBy === 'channel'
            ? [r.channel || '-', r.channel ? channelLabel(r.channel) : 'لینک اصلی']
            : [r.referral ? 'ref' : 'direct', r.referral ? 'ارجاع (اشتراک مهمانان)' : 'مستقیم از لینک'];
      const g = groups.get(key) ?? { key, label, sub: '', view: 0, unique: 0, enter: 0, actions: 0, rsvp: 0, checkin: 0 };
      g.view += r.view;
      g.unique += r.unique;
      g.enter += r.enter;
      g.actions += r.actions;
      g.rsvp += r.rsvp;
      g.checkin += r.checkin;
      groups.set(key, g);
    }
    return [...groups.values()];
  }, [linkRows, groupBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const conv = (r: Row) => (r.unique ? r.rsvp / r.unique : 0);
  const sorted = [...rows].sort((a, b) => {
    const va = sort.col === 'conv' ? conv(a) : (a[sort.col] as number | string);
    const vb = sort.col === 'conv' ? conv(b) : (b[sort.col] as number | string);
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fa');
    return sort.desc ? -cmp : cmp;
  });
  // Best conversion among rows with enough visitors to mean something.
  const best = rows.filter(r => r.unique >= 5).sort((a, b) => conv(b) - conv(a))[0];

  // ---- daily trend (whole scope, or the selected row when grouping by link)
  const trendDays = (daySet ? allDays.filter(d => daySet.has(d)) : allDays).slice(-30);
  const trendOf = (day: string) => {
    if (selected && groupBy === 'link') return stats.links[selected]?.[day]?.view ?? 0;
    if (scope === 'rep') return Object.values(stats.links).reduce((n, per) => n + (per[day]?.view ?? 0), 0);
    return stats.days[day]?.view ?? 0;
  };
  const max = Math.max(1, ...trendDays.map(trendOf));
  const inEvent = (d: string) => !!eventDates?.start && d >= eventDates.start && d <= (eventDates.end || eventDates.start);

  const utmRows = Object.entries(stats.utm || {}).map(([k, c]) => ({ k, view: c.view ?? 0, unique: c.linkUnique ?? 0, rsvp: c.rsvp ?? 0 }));

  if (!views && !rsvp && linkRows.every(r => !r.view)) {
    return (
      <p className="text-sm text-slate-400 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" /> هنوز بازدیدی ثبت نشده است.
      </p>
    );
  }

  const header = (col: keyof Row | 'conv', label: string) => (
    <th className="p-2 font-bold whitespace-nowrap">
      <button onClick={() => setSort(s => ({ col, desc: s.col === col ? !s.desc : true }))} className={`inline-flex items-center gap-1 ${sort.col === col ? 'text-(color:--ad-ink)' : ''}`}>
        {label}
        <ArrowDownUp className="w-3 h-3 opacity-50" />
      </button>
    </th>
  );

  const funnel: [string, number][] = [
    ['بازدید', views],
    ['بازدیدکننده یکتا', unique],
    ['ورود به دعوتنامه', enter],
    ['مشاهده زمان و مکان', details],
    ['اقدام (تقویم، مسیر، تماس…)', actions],
    ['اعلام حضور', rsvp],
    ...(checkin ? ([['حضور در غرفه', checkin]] as [string, number][]) : []),
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-1.5">
        {(['7', '14', '30', 'all'] as Range[]).map(r => (
          <button key={r} onClick={() => setRange(r)} className={`rounded-full px-3 py-1 text-xs font-bold ${range === r ? 'btn-ink' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {r === 'all' ? 'همه' : `${fa(Number(r))} روز اخیر`}
          </button>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {[
          ['بازدید', fa(views)],
          ['بازدیدکننده یکتا', fa(unique)],
          ['اقدام‌ها', fa(actions)],
          ['اعلام حضور', fa(rsvp)],
          ['نرخ تبدیل (حضور ÷ یکتا)', pct(rsvp, unique)],
          ['نرخ ورود', pct(enter, unique)],
          ...(checkin || walkin
            ? [
                ['حضور واقعی در غرفه', fa(checkin)],
                ['نرخ آمدن (غرفه ÷ اعلام حضور)', pct(checkin, rsvp)],
                ['بدون اعلام قبلی', fa(walkin)],
              ]
            : []),
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 p-3">
            <p className="text-xl font-black text-slate-900 tabular-nums">{value}</p>
            <p className="text-[11px] font-bold text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="space-y-1.5">
        <p className="text-xs font-black text-slate-600">قیف تعامل</p>
        {funnel.map(([label, n]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-44 shrink-0 font-bold text-slate-600">{label}</span>
            <div className="flex-1 h-5 rounded-lg bg-slate-100 overflow-hidden">
              <div className="h-full rounded-lg btn-ad" style={{ width: `${(n / Math.max(1, views)) * 100}%` }} />
            </div>
            <span className="w-24 shrink-0 tabular-nums font-bold text-slate-700">
              {fa(n)} <span className="text-slate-400 font-medium">{label === 'بازدید' ? '' : pct(n, unique)}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Per link / rep / channel / source */}
      {(trackingEnabled || scope === 'rep') && linkRows.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-xs font-black text-slate-600 ml-2">مقایسه بر اساس</p>
            {(
              [
                ['link', 'لینک'],
                ['rep', 'کارشناس'],
                ['channel', 'کانال'],
                ['source', 'مستقیم / ارجاع'],
              ] as [GroupBy, string][]
            )
              .filter(([g]) => scope === 'admin' || g !== 'rep')
              .map(([g, label]) => (
                <button
                  key={g}
                  onClick={() => {
                    setGroupBy(g);
                    setSelected('');
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-bold ${groupBy === g ? 'btn-ad text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {label}
                </button>
              ))}
            <span className="flex-1" />
            <button
              onClick={() =>
                downloadCsv(
                  `report-${groupBy}.csv`,
                  toCsv([
                    ['عنوان', 'کد', 'بازدید', 'یکتا', 'ورود', 'اقدام', 'اعلام حضور', 'حضور در غرفه', 'نرخ تبدیل'],
                    ...sorted.map(r => [r.label, r.sub, r.view, r.unique, r.enter, r.actions, r.rsvp, r.checkin, r.unique ? `${((r.rsvp / r.unique) * 100).toFixed(1)}%` : '']),
                  ]),
                )
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 text-xs font-bold px-3 py-1.5"
            >
              <Download className="w-3.5 h-3.5" /> اکسل
            </button>
          </div>
          {best && rows.length > 1 && (
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> بهترین نرخ تبدیل: {best.label} ({pct(best.rsvp, best.unique)})
            </p>
          )}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-right">
                <tr>
                  {header('label', 'عنوان')}
                  {header('view', 'بازدید')}
                  {header('unique', 'یکتا')}
                  {header('enter', 'ورود')}
                  {header('actions', 'اقدام')}
                  {header('rsvp', 'اعلام')}
                  {header('checkin', 'غرفه')}
                  {header('conv', 'تبدیل')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr
                    key={r.key}
                    onClick={() => groupBy === 'link' && setSelected(s => (s === r.key ? '' : r.key))}
                    className={`border-t border-slate-100 tabular-nums ${groupBy === 'link' ? 'cursor-pointer hover:bg-slate-50' : ''} ${selected === r.key ? 'bg-(color:--ad-ink)/10' : ''} ${best?.key === r.key ? 'font-bold' : ''}`}
                  >
                    <td className="p-2 text-right">
                      <p className="font-bold text-slate-800">{r.label}</p>
                      {r.sub && (
                        <p className="text-[10px] text-slate-400" dir="ltr">
                          {r.sub}
                        </p>
                      )}
                    </td>
                    <td className="p-2">{fa(r.view)}</td>
                    <td className="p-2">{fa(r.unique)}</td>
                    <td className="p-2">{fa(r.enter)}</td>
                    <td className="p-2">{fa(r.actions)}</td>
                    <td className="p-2">{fa(r.rsvp)}</td>
                    <td className="p-2">{fa(r.checkin)}</td>
                    <td className="p-2 font-bold text-slate-800">{pct(r.rsvp, r.unique)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {groupBy === 'link' && <p className="text-[11px] text-slate-400">برای دیدن نمودار روزانه یک لینک، روی ردیف آن کلیک کنید.</p>}
        </div>
      )}

      {/* UTM */}
      {utmRows.length > 0 && scope === 'admin' && (
        <div className="space-y-2">
          <p className="text-xs font-black text-slate-600">منابع UTM (افزوده‌شده توسط پنل پیامک یا ابزار تبلیغاتی)</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 text-right">
                <tr>
                  <th className="p-2">منبع / کمپین</th>
                  <th className="p-2">بازدید</th>
                  <th className="p-2">یکتا</th>
                  <th className="p-2">حضور</th>
                </tr>
              </thead>
              <tbody>
                {utmRows.map(u => (
                  <tr key={u.k} className="border-t border-slate-100 tabular-nums">
                    <td className="p-2 text-right" dir="ltr">
                      {u.k}
                    </td>
                    <td className="p-2">{fa(u.view)}</td>
                    <td className="p-2">{fa(u.unique)}</td>
                    <td className="p-2">{fa(u.rsvp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Daily trend */}
      {trendDays.length > 0 && (
        <div>
          <p className="text-xs font-black text-slate-600 mb-2">
            بازدید روزانه {selected ? `— ${linkRows.find(r => r.key === selected)?.label}` : ''}
            {eventDates?.start && <span className="font-medium text-slate-400"> (ستون‌های سبز: روزهای برگزاری)</span>}
          </p>
          <div className="flex items-end gap-1 h-28" dir="ltr">
            {trendDays.map(d => (
              <div key={d} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d}: ${trendOf(d)}`}>
                <span className="text-[9px] text-slate-500 tabular-nums">{trendOf(d) ? fa(trendOf(d)) : ''}</span>
                <div className={`w-full rounded-t ${inEvent(d) ? 'bg-emerald-400' : 'btn-ad'}`} style={{ height: `${(trendOf(d) / max) * 80}px` }} />
                <span className="text-[9px] text-slate-400 truncate">{new Date(`${d}T12:00:00Z`).toLocaleDateString('fa-IR', { day: 'numeric', month: 'numeric' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
