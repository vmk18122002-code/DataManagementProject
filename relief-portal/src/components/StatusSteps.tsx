import { Check } from "lucide-react";
import { DonationStatus, STATUS_FLOW } from "@/lib/data";
import { cx } from "./ui";

export function StatusSteps({ status }: { status: DonationStatus }) {
  const at = STATUS_FLOW.indexOf(status);
  return (
    <ol className="flex w-full items-start">
      {STATUS_FLOW.map((s, i) => {
        const done = i <= at;
        return (
          <li key={s} className="relative flex flex-1 flex-col items-center text-center">
            {i > 0 && <span className={cx("absolute right-1/2 top-3.5 h-0.5 w-full", i <= at ? "bg-brand-500" : "bg-gray-200")} />}
            <span className={cx("relative z-10 grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-medium",
              done ? "border-brand-600 bg-brand-600 text-white" : "border-gray-300 bg-white text-ink-muted",
              i === at && "ring-4 ring-brand-100")}>
              {done ? <Check size={14} /> : i + 1}
            </span>
            <span className={cx("mt-2 px-1 text-xs", done ? "font-medium text-ink" : "text-ink-muted")}>{s}</span>
          </li>
        );
      })}
    </ol>
  );
}
