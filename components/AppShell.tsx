"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Plus, ReceiptText, Scale, Users, WalletCards } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function AppShell({
  children,
  tripId
}: {
  children: React.ReactNode;
  tripId?: string;
}) {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const nav = tripId
    ? [
        { href: `/trips/${tripId}`, label: "Trip", icon: WalletCards },
        { href: `/trips/${tripId}/members`, label: "Members", icon: Users },
        { href: `/trips/${tripId}/expenses/new`, label: "Add", icon: Plus },
        { href: `/trips/${tripId}/balances`, label: "Balances", icon: Scale },
        { href: `/trips/${tripId}/settlements`, label: "Settle", icon: ReceiptText }
      ]
    : [];

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brandMark">TS</span>
          <span>
            <span className="brandTitle">TripSplit</span>
            <span className="brandSub">Trip Money Manager</span>
          </span>
        </Link>
        <div className="cluster">
          <Link className="buttonSecondary" href="/profile">Profile</Link>
          <button className="buttonSecondary" onClick={logout} type="button">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </header>
      <main className="page">{children}</main>
      {tripId ? (
        <nav className="bottomNav" aria-label="Trip navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link href={item.href} key={item.href}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
