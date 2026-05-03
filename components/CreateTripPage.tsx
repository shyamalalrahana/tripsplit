"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export function CreateTripPage() {
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      router.push("/login");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).single();
    if (!profile) return;

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        name: String(form.get("name")),
        destination: String(form.get("destination") || ""),
        currency: String(form.get("currency") || "INR"),
        start_date: String(form.get("start_date") || ""),
        end_date: String(form.get("end_date") || ""),
        trip_image_url: String(form.get("trip_image_url") || ""),
        created_by: profile.id
      })
      .select("*")
      .single();
    if (error || !trip) {
      alert(error?.message || "Could not create trip");
      return;
    }
    await supabase.from("trip_members").insert({
      trip_id: trip.id,
      profile_id: profile.id,
      name: profile.name,
      phone: profile.phone,
      upi_id: profile.upi_id,
      avatar_color: profile.avatar_color,
      role: "owner"
    });
    router.push(`/trips/${trip.id}`);
  }

  return (
    <AppShell>
      <form className="card grid" onSubmit={submit}>
        <div>
          <p className="kicker">New trip</p>
          <h2>Create trip group</h2>
          <p className="muted">You will become the owner/admin and can share an invite link with friends.</p>
        </div>
        <div className="grid2">
          <div className="field"><label>Trip name</label><input name="name" placeholder="Wayanad Trip" required /></div>
          <div className="field"><label>Destination</label><input name="destination" placeholder="Wayanad" /></div>
          <div className="field"><label>Start date</label><input name="start_date" type="date" /></div>
          <div className="field"><label>End date</label><input name="end_date" type="date" /></div>
          <div className="field"><label>Currency</label><select name="currency" defaultValue="INR"><option>INR</option><option>USD</option><option>EUR</option><option>AED</option></select></div>
          <div className="field"><label>Trip image URL optional</label><input name="trip_image_url" /></div>
        </div>
        <button className="button" type="submit">Create trip</button>
      </form>
    </AppShell>
  );
}
