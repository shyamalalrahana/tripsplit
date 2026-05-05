"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AvatarView } from "@/components/AvatarView";
import { LoadingCard } from "@/components/LoadingCard";
import { imageFileToDataUrl, isMissingAvatarColumnError } from "@/lib/avatar";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
    setSaving(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      upi_id: String(form.get("upi_id") || ""),
      avatar_color: String(form.get("avatar_color") || "#2563eb"),
      avatar_url: avatarPreview || profile.avatar_url || null
    };
    const { data, error } = await supabase.from("profiles").update(payload).eq("id", profile.id).select("*").single();
    if (error) {
      if (isMissingAvatarColumnError(error)) {
        const fallbackPayload = {
          name: payload.name,
          phone: payload.phone,
          upi_id: payload.upi_id,
          avatar_color: payload.avatar_color
        };
        const fallback = await supabase.from("profiles").update(fallbackPayload).eq("id", profile.id).select("*").single();
        if (fallback.error) {
          setMessage(fallback.error.message);
        } else {
          setProfile({ ...fallback.data, avatar_url: profile.avatar_url });
          setMessage("Profile saved. To save photos too, run the avatar_url SQL in Supabase.");
        }
        setSaving(false);
        return;
      }
      setMessage(error.message);
      setSaving(false);
      return;
    }
    setProfile(data);
    setAvatarPreview("");
    setMessage("Profile updated.");
    setSaving(false);
  }

  async function previewAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    setMessage("");
    try {
      const image = await imageFileToDataUrl(event.target.files?.[0] || null);
      if (image) setAvatarPreview(image);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload profile picture.");
    }
  }

  return (
    <AppShell>
      <section className="profileCard grid">
        <div>
          <p className="kicker">Profile</p>
          <h2>Your payment profile</h2>
          <p className="muted">Your UPI ID is used to generate QR codes when friends need to pay you.</p>
        </div>
        {profile ? (
          <form className="profileForm" onSubmit={save}>
            <div className="profilePhotoPanel">
              <AvatarView className="profilePhotoLarge" name={profile.name} color={profile.avatar_color} image={avatarPreview || profile.avatar_url} />
              <div>
                <h3>{profile.name}</h3>
                <p className="muted">Upload a clear photo so friends can recognize you in trip groups.</p>
                <label className="buttonSecondary profileUploadButton">
                  Change photo
                  <input accept="image/*" name="avatar" onChange={previewAvatar} type="file" />
                </label>
              </div>
            </div>
            <div className="profileFields">
              <div className="field"><label>Name</label><input name="name" defaultValue={profile.name} required /></div>
              <div className="field"><label>Phone optional</label><input name="phone" defaultValue={profile.phone || ""} /></div>
              <div className="field"><label>UPI ID optional</label><input name="upi_id" defaultValue={profile.upi_id || ""} placeholder="rahul@okicici" /></div>
              <div className="field"><label>Fallback avatar color</label><input name="avatar_color" defaultValue={profile.avatar_color || "#2563eb"} /></div>
            </div>
            <button className="button" disabled={saving} type="submit">{saving ? "Saving..." : "Save profile"}</button>
            {message ? <p className="profileMessage">{message}</p> : null}
          </form>
        ) : <LoadingCard label="Loading profile" />}
      </section>
    </AppShell>
  );
}
