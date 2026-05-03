"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Profile, Trip } from "@/lib/types";

export function JoinTripPage({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, [inviteCode]);

  async function load() {
    const { data: tripData } = await supabase.from("trips").select("*").eq("invite_code", inviteCode).single();
    setTrip(tripData);
    const { data: auth } = await supabase.auth.getUser();
    if (auth.user) {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).single();
      setProfile(data);
    }
  }

  async function join(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!trip) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || profile?.name || "").trim();
    if (!name) {
      setMessage("Enter your name to join.");
      return;
    }
    const { data, error } = await supabase.from("trip_members").insert({
      trip_id: trip.id,
      profile_id: profile?.id || null,
      name,
      phone: String(form.get("phone") || profile?.phone || ""),
      upi_id: String(form.get("upi_id") || profile?.upi_id || ""),
      avatar_color: String(form.get("avatar_color") || profile?.avatar_color || "#2563eb"),
      role: profile ? "member" : "guest"
    }).select("*").single();
    if (error) {
      setMessage(error.message);
      return;
    }
    router.push(`/trips/${data.trip_id}`);
  }

  return (
    <main className="page">
      <section className="heroGrid">
        <div className="cardSoft">
          <p className="kicker">Trip invite</p>
          <h1>{trip ? `Join ${trip.name}` : "Join trip"}</h1>
          <p className="muted">Join with your name. Login is recommended, but guests can join easily for MVP.</p>
          {!profile ? <Link className="buttonSecondary" href="/login">Login or sign up</Link> : null}
        </div>
        <form className="card grid" onSubmit={join}>
          <h2>Your trip profile</h2>
          <div className="field"><label>Name</label><input name="name" defaultValue={profile?.name || ""} required /></div>
          <div className="field"><label>Phone optional</label><input name="phone" defaultValue={profile?.phone || ""} /></div>
          <div className="field"><label>UPI ID optional</label><input name="upi_id" defaultValue={profile?.upi_id || ""} placeholder="aju@okaxis" /></div>
          <div className="field"><label>Avatar color</label><input name="avatar_color" defaultValue={profile?.avatar_color || "#2563eb"} /></div>
          {message ? <p className="muted">{message}</p> : null}
          <button className="button" type="submit">Join trip</button>
        </form>
      </section>
    </main>
  );
}
