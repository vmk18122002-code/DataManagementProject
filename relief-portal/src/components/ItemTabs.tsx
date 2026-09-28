"use client";

import { BookOpen, Shirt, UtensilsCrossed } from "lucide-react";
import { ITEM_KEYS, ITEMS, ItemKey } from "@/lib/data";
import { cx } from "./ui";

export const ITEM_ICON: Record<ItemKey, React.ReactNode> = {
  food: <UtensilsCrossed size={16} />,
  clothes: <Shirt size={16} />,
  books: <BookOpen size={16} />,
};

export function ItemTabs({ value, onChange }: { value: ItemKey; onChange: (k: ItemKey) => void }) {
  return (
    <div className="scroll-thin inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-white p-1" role="tablist">
      {ITEM_KEYS.map((k) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cx("inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-sm transition-colors",
            value === k ? "bg-brand-600 font-medium text-white" : "text-ink-soft hover:bg-gray-50")}
        >
          {ITEM_ICON[k]}
          {ITEMS[k].label}
        </button>
      ))}
    </div>
  );
}
