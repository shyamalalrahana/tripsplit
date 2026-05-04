"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AvatarView } from "@/components/AvatarView";
import { imageFileToDataUrl } from "@/lib/avatar";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
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
    const { data } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).single();
    setProfile(data);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    const form = new FormData(event.currentTarget);
    let avatarUrl = profile.avatar_url || "";
    try {
      avatarUrl = (await imageFileToDataUrl(form.get("avatar") as File | null)) || avatarUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload profile picture.");
      return;
    }
    const payload = {
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      upi_id: String(form.get("upi_id") || ""),
      avatar_color: String(form.get("avatar_color") || "#2563eb"),
      avatar_url: avatarUrl || null
    };
    const { data, error } = await supabase.from("profiles").update(payload).eq("id", profile.id).select("*").single();
    if (error) setMessage(error.message);
    else {
      setProfile(data);
      setMessage("Profile updated.");
    }
  }

  return (
    <AppShell>
      <section className="card grid">
        <div>
          <p className="kicker">Profile</p>
          <h2>Your payment profile</h2>
          <p className="muted">Your UPI ID is used to generate QR codes when friends need to pay you.</p>
        </div>
        {profile ? (
          <form className="grid2" onSubmit={save}>
            <div className="field">
              <label>Profile picture</label>
              <div className="cluster"><AvatarView className="memberAvatar" name={profile.name} color={profile.avatar_color} image={profile.avatar_url} /><input accept="image/*" name="avatar" type="file" /></div>
            </div>
            <div className="field"><label>Name</label><input name="name" defaultValue={profile.name} required /></div>
            <div className="field"><label>Phone optional</label><input name="phone" defaultValue={profile.phone || ""} /></div>
            <div className="field"><label>UPI ID optional</label><input name="upi_id" defaultValue={profile.upi_id || ""} placeholder="rahul@okicici" /></div>
            <div className="field"><label>Avatar color</label><input name="avatar_color" defaultValue={profile.avatar_color || "#2563eb"} /></div>
            <button className="button" type="submit">Save profile</button>
            {message ? <p className="muted">{message}</p> : null}
          </form>
        ) : <p>Loading...</p>}
      </section>
    </AppShell>
  );
}
