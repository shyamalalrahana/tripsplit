"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { imageFileToDataUrl } from "@/lib/avatar";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";

export function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    const result =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password, options: { data: { name } } })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
      setLoading(false);
      return;
    }

    if (mode === "signup" && result.data.user) {
      const form = new FormData(event.currentTarget as HTMLFormElement);
      let avatarUrl = "";
      try {
        avatarUrl = await imageFileToDataUrl(form.get("avatar") as File | null);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not upload profile picture.");
        setLoading(false);
        return;
      }
      await supabase.from("profiles").upsert({
        user_id: result.data.user.id,
        email,
        name: name || email.split("@")[0],
        avatar_color: "#2563eb",
        avatar_url: avatarUrl || null
      }, { onConflict: "user_id" });
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="page">
      <section className="heroGrid">
        <div className="cardSoft">
          <Image className="authLogo" src="/tripsplits-logo.png" alt="TripSplits.in" width={620} height={150} priority />
          <p className="kicker">Trip money, finally clear</p>
          <h1>Split trips with friends and settle by UPI QR</h1>
          <p className="muted">
            Create a trip group, invite friends, track who paid, and show the simplest payment plan.
            Payment confirmation is manual for now.
          </p>
        </div>
        <form className="card grid" onSubmit={submit}>
          <div>
            <p className="kicker">{mode === "login" ? "Welcome back" : "Create account"}</p>
            <h2>{mode === "login" ? "Login" : "Sign up"}</h2>
          </div>
          {!hasSupabaseEnv() ? (
            <div className="badge pending">Add Supabase env vars before login works</div>
          ) : null}
          {mode === "signup" ? (
            <>
              <div className="field">
                <label>Name</label>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Rahul" />
              </div>
              <div className="field">
                <label>Profile picture optional</label>
                <input accept="image/*" name="avatar" type="file" />
              </div>
            </>
          ) : null}
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} />
          </div>
          {message ? <p className="muted">{message}</p> : null}
          <button className="button" disabled={loading} type="submit">
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
          </button>
          <button className="buttonSecondary" type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
