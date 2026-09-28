"use client";

/*
  Client-side app state shared by all portals (stands in for the backend).
  Mode is remembered in localStorage so switching portals keeps Disaster Mode on.
*/
import { createContext, useContext, useMemo, useState, useSyncExternalStore } from "react";
import {
  AFFECTED, ALERTS, Alert, DONATIONS, Donation, FieldFeedback, LIMIT_ADJUSTMENTS, LimitAdjustment, Mode,
} from "./data";

interface AppState {
  mode: Mode;
  activateDisaster: () => void;
  deactivateDisaster: () => void;
  alerts: Alert[];
  setAlertStatus: (id: string, status: Alert["status"]) => void;
  confirmedAreas: Set<string>;
  setConfirmedAreas: (s: Set<string>) => void;
  donations: Donation[];
  addDonation: (d: Donation) => void;
  updateDonation: (id: string, patch: Partial<Donation>) => void;
  adjustments: LimitAdjustment[];
  addAdjustment: (a: LimitAdjustment) => void;
  feedback: FieldFeedback[];
  addFeedback: (f: FieldFeedback) => void;
}

const Ctx = createContext<AppState | null>(null);
const ALL_AFFECTED = new Set(AFFECTED.map((a) => `${a.district}|${a.ds}`));
const NONE = new Set<string>();

// Mode lives in a tiny external store backed by localStorage (falls back to memory if storage is blocked).
const MODE_KEY = "reliefhub-mode";
let memoryMode: Mode | null = null;
const listeners = new Set<() => void>();
function readMode(): Mode {
  if (memoryMode) return memoryMode;
  try {
    return localStorage.getItem(MODE_KEY) === "disaster" ? "disaster" : "normal";
  } catch {
    return "normal";
  }
}
function writeMode(m: Mode) {
  memoryMode = m;
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {}
  listeners.forEach((l) => l());
}
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const mode = useSyncExternalStore(subscribe, readMode, () => "normal" as Mode);
  const [alerts, setAlerts] = useState(ALERTS);
  // null = default: every predicted area is confirmed while in Disaster Mode
  const [confirmedOverride, setConfirmedOverride] = useState<Set<string> | null>(null);
  const confirmedAreas = confirmedOverride ?? (mode === "disaster" ? ALL_AFFECTED : NONE);
  const [donations, setDonations] = useState(DONATIONS);
  const [adjustments, setAdjustments] = useState(LIMIT_ADJUSTMENTS);
  const [feedback, setFeedback] = useState<FieldFeedback[]>([]);

  const value = useMemo<AppState>(() => ({
    mode,
    activateDisaster: () => writeMode("disaster"),
    deactivateDisaster: () => {
      writeMode("normal");
      setConfirmedOverride(null);
    },
    alerts,
    setAlertStatus: (id, status) => setAlerts((a) => a.map((x) => (x.id === id ? { ...x, status } : x))),
    confirmedAreas,
    setConfirmedAreas: (s) => setConfirmedOverride(s),
    donations,
    addDonation: (d) => setDonations((l) => [d, ...l]),
    updateDonation: (id, patch) => setDonations((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x))),
    adjustments,
    addAdjustment: (a) => setAdjustments((l) => [a, ...l]),
    feedback,
    addFeedback: (f) => setFeedback((l) => [f, ...l]),
  }), [mode, alerts, confirmedAreas, donations, adjustments, feedback]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp must be used inside AppStateProvider");
  return v;
}
