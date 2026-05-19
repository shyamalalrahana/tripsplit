"use client";

import { ArrowLeft, CalendarRange, Coins, ImageIcon, MapPinned, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export function CreateTripPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const thumbLetter = nameDraft.trim().slice(0, 1).toUpperCase() || "T";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      router.push("/login");
      return;
    }
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).single();
    if (!profile) {
      setSaving(false);
      alert("Could not load your profile. Try refreshing the page.");
      return;
    }

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
      setSaving(false);
      return;
    }
    await supabase.from("trip_members").insert({
      trip_id: trip.id,
      profile_id: profile.id,
      name: profile.name,
      phone: profile.phone,
      upi_id: profile.upi_id,
      avatar_color: profile.avatar_color,
      avatar_url: profile.avatar_url,
      role: "owner"
    });
    router.push(`/trips/${trip.id}`);
  }

  return (
    <AppShell>
      <div className="createTripWrap">
        <div className="createTripGrid">
          <aside className="createTripHero" aria-labelledby="create-trip-title">
            <Link className="createTripBack" href="/">
              <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
              Back to trips
            </Link>
            <p className="kicker">New trip</p>
            <h1 id="create-trip-title">Spin up a trip in minutes</h1>
            <p className="createTripHeroLead">
              You will be the owner, invite friends with one link, and keep splits, balances, and UPI-friendly summaries in one place.
            </p>
            <div className="createTripThumb" aria-hidden>
              <span>{thumbLetter}</span>
            </div>
            <ul className="createTripList">
              <li>
                <span className="createTripListIcon" aria-hidden>
                  <Users size={18} />
                </span>
                <div>
                  <strong>Members & invites</strong>
                  <p className="createTripListHint">Share a link; everyone joins with their profile and UPI id.</p>
                </div>
              </li>
              <li>
                <span className="createTripListIcon" aria-hidden>
                  <Sparkles size={18} />
                </span>
                <div>
                  <strong>Smart summaries</strong>
                  <p className="createTripListHint">Log expenses as you go; balances and settlements stay clear.</p>
                </div>
              </li>
            </ul>
          </aside>

          <div className="card createTripFormShell">
            <form className="createTripForm" onSubmit={submit}>
              <header className="createTripFormHeader">
                <h2>Trip details</h2>
                <p className="muted createTripFormIntro">Only the trip name is required. You can refine dates, currency, and cover art anytime.</p>
              </header>

              <section className="createTripSection" aria-labelledby="create-basics">
                <div className="createTripSectionHead">
                  <span className="createTripSectionIcon">
                    <MapPinned size={20} />
                  </span>
                  <div>
                    <h3 id="create-basics">Basics</h3>
                    <p className="muted">What should we call this trip, and where are you headed?</p>
                  </div>
                </div>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="trip-name">Trip name</label>
                    <input
                      autoComplete="off"
                      id="trip-name"
                      name="name"
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Wayanad weekend"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="trip-destination">Destination</label>
                    <input id="trip-destination" name="destination" placeholder="Wayanad, Kerala" />
                  </div>
                </div>
              </section>

              <section className="createTripSection" aria-labelledby="create-schedule">
                <div className="createTripSectionHead">
                  <span className="createTripSectionIcon">
                    <CalendarRange size={20} />
                  </span>
                  <div>
                    <h3 id="create-schedule">Schedule</h3>
                    <p className="muted">Optional — helps everyone see when you are travelling together.</p>
                  </div>
                </div>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="trip-start">Start date</label>
                    <input id="trip-start" name="start_date" type="date" />
                  </div>
                  <div className="field">
                    <label htmlFor="trip-end">End date</label>
                    <input id="trip-end" name="end_date" type="date" />
                  </div>
                </div>
              </section>

              <section className="createTripSection" aria-labelledby="create-money">
                <div className="createTripSectionHead">
                  <span className="createTripSectionIcon">
                    <Coins size={20} />
                  </span>
                  <div>
                    <h3 id="create-money">Money & cover</h3>
                    <p className="muted">Pick a default currency for new expenses. Add a hero image if you have a link.</p>
                  </div>
                </div>
                <div className="grid2">
                  <div className="field">
                    <label htmlFor="trip-currency">Currency</label>
                    <select defaultValue="INR" id="trip-currency" name="currency">
                      <option>INR</option>
                      <option>USD</option>
                      <option>EUR</option>
                      <option>AED</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="trip-cover">
                      <span className="createTripLabelRow">
                        <ImageIcon size={15} aria-hidden />
                        Cover image URL
                      </span>
                    </label>
                    <input id="trip-cover" name="trip_image_url" placeholder="https://example.com/cover.jpg" type="url" />
                    <p className="createTripFieldHint">Optional. Paste a public image link for the trip card thumbnail.</p>
                  </div>
                </div>
              </section>

              <div className="createTripFooter">
                <Link className="buttonSecondary" href="/">
                  Cancel
                </Link>
                <button aria-busy={saving} className="button" disabled={saving} type="submit">
                  {saving ? "Creating trip…" : "Create trip"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
