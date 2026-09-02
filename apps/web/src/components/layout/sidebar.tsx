"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Logo } from "@/components/brand/logo";
import {
  IconHome,
  IconList,
  IconLogout,
  IconNewAnalysis,
  IconSettings,
  IconShield,
} from "@/components/icons";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Overview", icon: IconHome },
  { href: "/upload", label: "New analysis", icon: IconNewAnalysis },
  { href: "/analyses", label: "Analyses", icon: IconList },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createBrowserSupabaseClient();
    await supabase?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {nav.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-yaqeen-50 text-yaqeen-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        >
          <IconLogout className="h-5 w-5" />
          Sign out
        </button>
      </div>
      <div className="flex items-start gap-2 px-5 pb-5 text-xs leading-snug text-slate-400">
        <IconShield className="mt-0.5 h-4 w-4 shrink-0" />
        Always confirm receipt independently
      </div>
    </aside>
  );
}
