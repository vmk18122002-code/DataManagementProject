"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
        <path d="M16 3 4 8v8c0 7 5.2 11.6 12 13 6.8-1.4 12-6 12-13V8L16 3Z" className="fill-brand-600" />
        <path d="M16 22.5s-6-3.6-6-7.6a3.3 3.3 0 0 1 6-1.9 3.3 3.3 0 0 1 6 1.9c0 4-6 7.6-6 7.6Z" fill="#fff" />
      </svg>
      <span className="text-2xl font-bold tracking-tight text-brand-700">
        Relief<span className="text-ink">Hub</span>
      </span>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-ink-soft">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "", title, action }: {
  children: React.ReactNode; className?: string; title?: string; action?: React.ReactNode;
}) {
  return (
    <section className={cx("rounded-xl border border-line bg-white", className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-semibold text-ink">{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary: "border border-line bg-white text-ink hover:bg-gray-50 disabled:text-ink-muted",
  danger: "bg-danger-600 text-white hover:bg-danger-700 disabled:opacity-50",
  ghost: "text-brand-700 hover:bg-brand-50",
};
export function Button({ variant = "primary", size = "md", className = "", ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return (
    <button
      {...p}
      className={cx("inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5", BTN[variant], className)}
    />
  );
}

type Tone = "brand" | "gray" | "red" | "amber" | "blue" | "green";
const TONE: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  gray: "bg-gray-50 text-ink-soft ring-gray-200",
  red: "bg-danger-50 text-danger-700 ring-danger-100",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-sky-50 text-sky-800 ring-sky-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};
export function Badge({ tone = "gray", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONE[tone], className)}>
      {children}
    </span>
  );
}

export function LevelBadge({ level }: { level: string }) {
  const tone: Tone = level === "Critical" ? "red" : level === "High" ? "amber" : level === "Medium" ? "blue" : "gray";
  return <Badge tone={tone}>{level}</Badge>;
}

export function StatusBadge({ status }: { status: string }) {
  const tone: Tone =
    status === "Reached area" ? "green"
    : status === "Dispatched to area" ? "blue"
    : status === "Delivered" ? "green" : status === "Picked up" ? "blue" : status === "Collector assigned" ? "brand"
      : status === "Allocated" ? "amber" : status === "Confirmed" ? "red" : status === "Dismissed" ? "gray" : "gray";
  return <Badge tone={tone}>{status}</Badge>;
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-muted">{hint}</span>}
    </label>
  );
}

const INPUT = "rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 leading-6 text-ink placeholder:text-ink-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";
// full width unless the caller sets its own width (w-auto, w-44, ...)
const field = (extra: string, className?: string) => cx(INPUT, extra, /(^|\s)w-/.test(className ?? "") ? "" : "w-full", className);
export const Input = (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={field("", p.className)} />;
export const Textarea = (p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={field("", p.className)} />;
export const Select = (p: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={field(/(^|\s)h-/.test(p.className ?? "") ? "pr-8" : "h-[46px] pr-8", p.className)} />
);

export function Table({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cx("scroll-thin overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={cx("whitespace-nowrap bg-gray-50 px-4 py-3 text-xs font-semibold text-ink", className)}>{children}</th>
);
export const Td = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <td className={cx("border-t border-line px-4 py-3 align-middle text-ink-soft", className)}>{children}</td>
);

export function StatCard({ label, value, hint, icon, tone = "brand" }: {
  label: string; value: React.ReactNode; hint?: string; icon?: React.ReactNode; tone?: "brand" | "red";
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-soft">{label}</p>
        {icon && (
          <span className={cx("rounded-lg p-2", tone === "red" ? "bg-danger-50 text-danger-700" : "bg-brand-50 text-brand-700")}>{icon}</span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

/* limit-usage meter: track + fill, value shown as text beside it */
export function Meter({ pct, label }: { pct: number; label?: string }) {
  const color = pct >= 100 ? "bg-danger-600" : pct >= 80 ? "bg-amber-500" : "bg-brand-500";
  return (
    <div className="flex min-w-[120px] items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className={cx("h-full rounded-full", color)} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-ink-soft">{label ?? `${pct}%`}</span>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <p className="px-4 py-10 text-center text-ink-muted">{text}</p>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-ink-muted hover:bg-gray-100" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
