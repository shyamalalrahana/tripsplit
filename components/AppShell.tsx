"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Plus, ReceiptText, Scale, UserRound, Users, WalletCards } from "lucide-react";
import { AvatarView } from "@/components/AvatarView";
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export function AppShell({
  children,
  tripId
}: {
  children: React.ReactNode;
  tripId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,user_id,name,email,phone,upi_id,avatar_color,avatar_url")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    setProfile(data);
  }

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
          <Image className="brandLogo" src="/tripsplits-logo.png" alt="TripSplits.in" width={620} height={150} priority />
          <span className="brandFallback">
            <span className="brandTitle">TripSplits</span>
            <span className="brandSub">Trip Money Manager</span>
          </span>
        </Link>
        <div className="topActions">
          <ThemeToggle />
          <div className="profileMenu">
            <button className="profileButton" onClick={() => setMenuOpen((open) => !open)} type="button" aria-expanded={menuOpen} aria-label="Open profile menu">
              <AvatarView className="profileButtonAvatar" name={profile?.name || "User"} color={profile?.avatar_color} image={profile?.avatar_url} />
              <span className="profileButtonText">
                <strong>{profile?.name || "Profile"}</strong>
                <small>Account</small>
              </span>
            </button>
            {menuOpen ? (
              <div className="profileDropdown">
                <Link className="profileDropdownItem" href="/profile" onClick={() => setMenuOpen(false)}>
                  <UserRound size={17} />
                  <span>Profile</span>
                </Link>
                <button className="profileDropdownItem dangerText" onClick={logout} type="button">
                  <LogOut size={17} />
                  <span>Logout</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <main className="page">{children}</main>
      {tripId ? (
        <nav className="bottomNav" aria-label="Trip navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === `/trips/${tripId}` ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link aria-current={isActive ? "page" : undefined} className={isActive ? "active" : ""} href={item.href} key={item.href}>
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
