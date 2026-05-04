"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import type { Profile, Trip } from "@/lib/types";

export function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = "/login";
      return;
    }

    let { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).single();
    if (!profileData) {
      const fallback = {
        user_id: auth.user.id,
        email: auth.user.email,
        name: auth.user.user_metadata?.name || auth.user.email?.split("@")[0] || "TripSplit user",
        avatar_color: "#2563eb"
      };
      const inserted = await supabase.from("profiles").upsert(fallback, { onConflict: "user_id" }).select("*").single();
      profileData = inserted.data;
    }
    setProfile(profileData);

    const { data: memberships } = await supabase
      .from("trip_members")
      .select("trip_id")
      .eq("profile_id", profileData.id);
    const tripIds = (memberships || []).map((item) => item.trip_id);
    if (tripIds.length) {
      const { data } = await supabase.from("trips").select("*").in("id", tripIds).order("created_at", { ascending: false });
      setTrips(data || []);
    }
    setLoading(false);
  }

  return (
    <AppShell>
      <section className="sectionHead">
        <div>
          <p className="kicker">Dashboard</p>
          <h1>Hello, {profile?.name || "traveller"}</h1>
          <p className="muted">Create trip groups, invite friends, and settle cleanly with UPI QR support.</p>
        </div>
        <Link className="button" href="/trips/new">Create your first trip</Link>
      </section>

      <div className="grid">
        {loading ? <div className="card">Loading trips...</div> : null}
        {!loading && !trips.length ? (
          <div className="card empty">
            <div>
              <h2>Create your first trip</h2>
              <p className="muted">Start with a trip name, destination, currency, and invite link.</p>
              <Link className="button" href="/trips/new">Create trip</Link>
            </div>
          </div>
        ) : null}
        {trips.map((trip) => (
          <Link className="card row" href={`/trips/${trip.id}`} key={trip.id}>
            <div>
              <h3>{trip.name}</h3>
              <p className="muted">{trip.destination || "No destination"} · {trip.currency}</p>
            </div>
            <span className="badge paid">Open</span>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
