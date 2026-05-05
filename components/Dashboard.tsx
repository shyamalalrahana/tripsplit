"use client";

import Link from "next/link";
import { ExternalLink, Pencil, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingCard } from "@/components/LoadingCard";
import { supabase } from "@/lib/supabase";
import type { Profile, Trip } from "@/lib/types";

export function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTripId, setEditingTripId] = useState("");
  const [savingTripId, setSavingTripId] = useState("");
  const [deletingTripId, setDeletingTripId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = "/login";
      return;
    }

    let { data: profileData } = await supabase
      .from("profiles")
      .select("id,user_id,name,email,phone,upi_id,avatar_color,avatar_url")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!profileData) {
      const fallback = {
        user_id: auth.user.id,
        email: auth.user.email,
        name: auth.user.user_metadata?.name || auth.user.email?.split("@")[0] || "TripSplits user",
        avatar_color: "#2563eb"
      };
      const inserted = await supabase.from("profiles").upsert(fallback, { onConflict: "user_id" }).select("*").single();
      profileData = inserted.data;
    }
    if (!profileData) {
      setLoading(false);
      return;
    }
    setProfile(profileData);

    const { data: memberships } = await supabase
      .from("trip_members")
      .select("trip_id")
      .eq("profile_id", profileData.id);
    const tripIds = (memberships || []).map((item) => item.trip_id);
    if (tripIds.length) {
      const { data } = await supabase
        .from("trips")
        .select("id,name,destination,currency,start_date,end_date,trip_image_url,created_by,invite_code")
        .in("id", tripIds)
        .order("created_at", { ascending: false });
      setTrips(data || []);
    } else {
      setTrips([]);
    }
    setLoading(false);
  }

  async function updateTrip(event: React.FormEvent<HTMLFormElement>, trip: Trip) {
    event.preventDefault();
    if (savingTripId) return;
    setSavingTripId(trip.id);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      destination: String(form.get("destination") || "").trim(),
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
      currency: String(form.get("currency") || "INR"),
      trip_image_url: String(form.get("trip_image_url") || "").trim()
    };
    const { data, error } = await supabase.from("trips").update(payload).eq("id", trip.id).select("*").single();
    setSavingTripId("");
    if (error || !data) {
      setMessage(error?.message || "Could not update trip.");
      return;
    }
    setTrips((current) => current.map((item) => (item.id === trip.id ? data : item)));
    setEditingTripId("");
    setMessage("Trip details updated.");
  }

  async function deleteTrip(trip: Trip) {
    if (deletingTripId) return;
    const confirmed = window.confirm(`Delete "${trip.name}"? This removes members, expenses, splits, and settlements.`);
    if (!confirmed) return;
    setDeletingTripId(trip.id);
    setMessage("");
    const { error } = await supabase.from("trips").delete().eq("id", trip.id);
    setDeletingTripId("");
    if (error) {
      setMessage(error.message || "Could not delete trip.");
      return;
    }
    setTrips((current) => current.filter((item) => item.id !== trip.id));
    setMessage("Trip deleted.");
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

      {message ? <p className="badge paid">{message}</p> : null}

      <div className="grid">
        {loading ? <LoadingCard label="Loading trips" /> : null}
        {!loading && !trips.length ? (
          <div className="card empty">
            <div>
              <h2>Create your first trip</h2>
              <p className="muted">Start with a trip name, destination, currency, and invite link.</p>
              <Link className="button" href="/trips/new">Create trip</Link>
            </div>
          </div>
        ) : null}
        <div className="tripList">
          {trips.map((trip) => {
            const canManage = Boolean(profile?.id && trip.created_by === profile.id);
            const isEditing = editingTripId === trip.id;
            return (
              <article className="card tripListCard" key={trip.id}>
                <div className="tripListMain">
                  <Link className="tripListOpen" href={`/trips/${trip.id}`}>
                    <div className="tripThumb">{trip.destination?.slice(0, 2).toUpperCase() || "TS"}</div>
                    <div>
                      <h3>{trip.name}</h3>
                      <p className="muted">{trip.destination || "No destination"} · {trip.currency}</p>
                    </div>
                  </Link>
                  <div className={`tripListActions ${canManage ? "" : "single"}`}>
                    {canManage ? (
                      <>
                        <button className="iconButton" onClick={() => setEditingTripId(isEditing ? "" : trip.id)} type="button" aria-label={`Edit ${trip.name}`}>
                          {isEditing ? <X size={17} /> : <Pencil size={17} />}
                        </button>
                        <button className="iconButton dangerIcon" disabled={deletingTripId === trip.id} onClick={() => deleteTrip(trip)} type="button" aria-label={`Delete ${trip.name}`}>
                          <Trash2 size={17} />
                        </button>
                      </>
                    ) : null}
                    <Link className="buttonSecondary tripOpenButton" href={`/trips/${trip.id}`}><ExternalLink size={16} /> Open</Link>
                  </div>
                </div>
                {isEditing ? (
                  <form className="tripInlineEdit" onSubmit={(event) => updateTrip(event, trip)}>
                    <div className="grid2">
                      <div className="field"><label>Trip name</label><input name="name" defaultValue={trip.name} required /></div>
                      <div className="field"><label>Destination</label><input name="destination" defaultValue={trip.destination || ""} /></div>
                      <div className="field"><label>Start date</label><input name="start_date" type="date" defaultValue={trip.start_date || ""} /></div>
                      <div className="field"><label>End date</label><input name="end_date" type="date" defaultValue={trip.end_date || ""} /></div>
                      <div className="field"><label>Currency</label><select name="currency" defaultValue={trip.currency}><option>INR</option><option>USD</option><option>EUR</option><option>AED</option></select></div>
                      <div className="field"><label>Trip image URL optional</label><input name="trip_image_url" defaultValue={trip.trip_image_url || ""} /></div>
                    </div>
                    <button className="button" disabled={savingTripId === trip.id} type="submit">{savingTripId === trip.id ? "Saving..." : "Save trip"}</button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
