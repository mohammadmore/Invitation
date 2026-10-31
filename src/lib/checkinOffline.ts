// Offline storage for the booth check-in page: last guest list, queue of not-yet-sent
// operations and sync problems, per invitation, in localStorage (survives reloads and
// the phone going to sleep).

import type { CheckinGuest } from '../shared/checkin';

export interface CheckinOp {
  opId: string;
  type: 'scan' | 'walkin' | 'undo';
  ticket?: string;
  rsvpId?: string;
  name?: string;
  phone?: string;
  org?: string;
  count?: number;
  staff: string;
  at: string;
  /** Recorded while offline (result was only checked against the local list) */
  offline?: boolean;
}

export interface Problem {
  opId: string;
  at: string;
  code: string;
  staff: string;
}

interface Snapshot {
  info: { company: string; event: string; timezone: string; theme?: { primary: string; accent: string } };
  guests: CheckinGuest[];
  savedAt: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full: the queue is small, the list may be skipped */
  }
}

export function offlineStore(id: string) {
  return {
    loadData: () => read<Snapshot | null>(`checkin-data:${id}`, null),
    saveData: (s: Snapshot) => write(`checkin-data:${id}`, s),
    loadQueue: () => read<CheckinOp[]>(`checkin-queue:${id}`, []),
    saveQueue: (q: CheckinOp[]) => write(`checkin-queue:${id}`, q),
    loadProblems: () => read<Problem[]>(`checkin-problems:${id}`, []),
    saveProblems: (p: Problem[]) => write(`checkin-problems:${id}`, p),
  };
}

export const newOpId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
