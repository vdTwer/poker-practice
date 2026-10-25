import { useSyncExternalStore } from 'react';

// Per-browser progress (word counts, best scores). Kept in localStorage until slice 4
// adds a real progress store; every access is guarded so private windows still work.

type Listener = () => void;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress just isn't remembered */
  }
}

function createStore<T>(key: string, fallback: T) {
  let state = read(key, fallback);
  const listeners = new Set<Listener>();
  return {
    get: () => state,
    set(next: T) {
      state = next;
      write(key, next);
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

// --- Words: "jargon fades in" ---------------------------------------------------
// A word's plain explanation shows next to it until it has been used correctly 3 times.

export const LEARNED_AFTER = 3;
const words = createStore<Record<string, number>>('pp.words.v1', {});

export function useWordCounts() {
  return useSyncExternalStore(words.subscribe, words.get, words.get);
}

export function creditWord(term: string, delta = 1) {
  const k = term.toLowerCase();
  const cur = words.get();
  words.set({ ...cur, [k]: Math.max(0, (cur[k] ?? 0) + delta) });
}

/** A missed word loses its "learned" status so its explanation comes back. */
export function missWord(term: string) {
  const k = term.toLowerCase();
  const cur = words.get();
  words.set({ ...cur, [k]: Math.min(cur[k] ?? 0, LEARNED_AFTER - 1) });
}

// --- Drill scores -------------------------------------------------------------------

export interface DrillScore { right: number; total: number; best: number }
const scores = createStore<Record<string, DrillScore>>('pp.drills.v1', {});

export function useDrillScores() {
  return useSyncExternalStore(scores.subscribe, scores.get, scores.get);
}

export function recordDrill(id: string, correct: boolean, streak: number) {
  const cur = scores.get();
  const s = cur[id] ?? { right: 0, total: 0, best: 0 };
  scores.set({ ...cur, [id]: { right: s.right + (correct ? 1 : 0), total: s.total + 1, best: Math.max(s.best, streak) } });
}
