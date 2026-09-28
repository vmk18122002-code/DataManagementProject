"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, HandHeart, LayoutDashboard, Siren, Truck } from "lucide-react";
import { Button, Field, Input, Logo, cx } from "@/components/ui";

const ROLES = [
  { key: "donor", label: "Donor", icon: HandHeart, email: "nimal@example.com" },
  { key: "coordinator", label: "Coordinator", icon: LayoutDashboard, email: "coordinator@reliefhub.lk" },
  { key: "disaster", label: "Disaster officer", icon: Siren, email: "dmc-desk@reliefhub.lk" },
  { key: "collector", label: "Collector", icon: Truck, email: "kasun@redcross.example" },
] as const;

export default function Login() {
  const router = useRouter();
  const [role, setRole] = useState<(typeof ROLES)[number]["key"]>("donor");
  const [show, setShow] = useState(false);
  const current = ROLES.find((r) => r.key === role)!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10">
      <div className="w-full max-w-[520px] rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgba(0,0,0,0.08)] sm:p-10">
        <Logo className="justify-center" />
        <h1 className="mt-6 text-center text-2xl font-semibold text-ink sm:text-[32px]">Sign in to Your Account</h1>

        <div className="mt-8">
          <p className="mb-2 text-sm font-medium text-ink">I am a</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ROLES.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={cx("flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm transition-colors",
                  role === r.key ? "border-brand-600 bg-brand-50 font-medium text-brand-700" : "border-line text-ink-soft hover:bg-gray-50")}
              >
                <r.icon size={20} />
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/${role}`);
          }}
        >
          <Field label="Email Address">
            <Input type="email" placeholder={current.email} defaultValue={current.email} key={role} />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input type={show ? "text" : "password"} placeholder="Enter your password" defaultValue="demo1234" className="pr-11" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted"
                aria-label={show ? "Hide password" : "Show password"}>
                {show ? <Eye size={20} /> : <EyeOff size={20} />}
              </button>
            </div>
          </Field>
          <p className="text-center">
            <a href="#" className="text-brand-700 hover:underline">Forgot your password?</a>
          </p>
          <Button type="submit" className="w-full py-3 text-base">Sign in</Button>
          {role === "donor" && (
            <p className="text-center text-sm text-ink-soft">
              New donor? <a href="#" className="font-medium text-brand-700 hover:underline">Create an account</a>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
