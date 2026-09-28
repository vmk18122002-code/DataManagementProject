"use client";

import { useState } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { Mode } from "@/lib/data";
import { useApp } from "@/lib/store";
import { Button, Modal, cx } from "./ui";

/* Mode panel for the disaster portal: status + Normal / Disaster switch (asks before switching) */
export function ModeCard() {
  const { mode, activateDisaster, deactivateDisaster } = useApp();
  const [pending, setPending] = useState<Mode | null>(null);
  const on = mode === "disaster";

  return (
    <>
      <div className={cx("mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5",
        on ? "border-danger-100 bg-danger-50" : "border-brand-200 bg-brand-50/50")}>
        <div className="flex items-center gap-3">
          <span className={cx("grid h-11 w-11 place-items-center rounded-full text-white", on ? "bg-danger-600" : "bg-brand-600")}>
            {on ? <ShieldAlert size={22} /> : <ShieldCheck size={22} />}
          </span>
          <div>
            <p className="font-semibold text-ink">{on ? "Disaster Mode is ACTIVE" : "System is in Normal Mode"}</p>
            <p className="text-sm text-ink-soft">
              {on ? "Affected areas are prioritised and their limits are raised."
                : "Normal limits and priorities. Switch to Disaster Mode when a disaster is confirmed."}
            </p>
          </div>
        </div>

        <div className="inline-flex rounded-lg border border-line bg-white p-1" role="group" aria-label="System mode">
          <button
            type="button"
            aria-pressed={!on}
            onClick={() => on && setPending("normal")}
            className={cx("inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              !on ? "bg-brand-600 text-white" : "text-ink-soft hover:bg-gray-50")}
          >
            <ShieldCheck size={16} /> Normal mode
          </button>
          <button
            type="button"
            aria-pressed={on}
            onClick={() => !on && setPending("disaster")}
            className={cx("inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              on ? "bg-danger-600 text-white" : "text-ink-soft hover:bg-gray-50")}
          >
            <ShieldAlert size={16} /> Disaster mode
          </button>
        </div>
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)}
        title={pending === "disaster" ? "Switch to Disaster Mode?" : "Switch back to Normal Mode?"}>
        <p className="text-ink-soft">
          {pending === "disaster"
            ? "All portals will show Disaster Mode. Affected DS divisions move to the top of every list and their limits are raised."
            : "Disaster priorities and raised limits will be removed from every portal. Only do this when the emergency is over."}
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button>
          <Button
            variant={pending === "disaster" ? "danger" : "primary"}
            onClick={() => {
              if (pending === "disaster") activateDisaster();
              else deactivateDisaster();
              setPending(null);
            }}
          >
            {pending === "disaster" ? "Yes, Disaster mode" : "Yes, Normal mode"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
