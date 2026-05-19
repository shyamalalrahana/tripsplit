"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { imageFileToDataUrl } from "@/lib/avatar";
import { hasSupabaseEnv, supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";

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
        avatar_color: "#5B8CFF",
        avatar_url: avatarUrl || null
      }, { onConflict: "user_id" });
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="page">
      <section className="heroGrid">
        {/* ── Hero panel ── */}
        <div className="cardSoft" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="authHeroTop">
            <Image
              className="authLogo"
              src="/tripsplits-logo.png"
              alt="TripSplits.in"
              width={620}
              height={150}
              priority
            />
            <ThemeToggle />
          </div>
          <p className="kicker">Trip money, clear</p>
          <h1>Split trips with friends. Settle by UPI&nbsp;QR.</h1>
          <p className="muted">
            Create a trip group, invite friends, track who paid, and get the simplest payment plan.
            Confirm payments manually — no bank access needed.
          </p>

          {/* Decorative stat pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            {[
              { label: "No bank access", color: "var(--tint-green)",  fg: "var(--accent-green)"  },
              { label: "UPI QR settle",  color: "var(--tint-blue)",   fg: "var(--accent-blue)"   },
              { label: "INR · USD · EUR",color: "var(--tint-purple)", fg: "var(--accent-purple)" },
            ].map((p) => (
              <span key={p.label} style={{
                padding: "5px 12px", borderRadius: 999,
                background: p.color, color: p.fg,
                fontSize: 12, fontWeight: 600,
                border: "1px solid " + p.color,
              }}>{p.label}</span>
            ))}
          </div>
        </div>

        {/* ── Auth form ── */}
        <form className="card grid" onSubmit={submit} style={{ gap: 16 }}>
          <div>
            <p className="kicker">{mode === "login" ? "Welcome back" : "Create account"}</p>
            <h2 style={{ marginTop: 4 }}>{mode === "login" ? "Login" : "Sign up"}</h2>
          </div>

          {!hasSupabaseEnv() ? (
            <div className="badge pending">Add Supabase env vars before login works</div>
          ) : null}

          {mode === "signup" ? (
            <>
              <div className="field">
                <label>Name</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Rahul"
                />
              </div>
              <div className="field">
                <label>Profile picture (optional)</label>
                <input accept="image/*" name="avatar" type="file" />
              </div>
            </>
          ) : null}

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@email.com"
              required
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {message ? (
            <p className="muted" style={{ color: "var(--accent-orange)" }}>{message}</p>
          ) : null}

          <button className="button" disabled={loading} type="submit">
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login to your trips"
              : "Create account"}
          </button>

          <button
            className="buttonSecondary"
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login"
              ? "New to TripSplits? Create an account"
              : "Already have an account? Login"}
          </button>

          <p style={{ textAlign: "center", color: "var(--fg-3)", fontSize: 11, fontWeight: 500, lineHeight: 1.5 }}>
            UPI QR payments work with GPay, PhonePe, Paytm, BHIM — any UPI app.
          </p>
        </form>
      </section>
    </main>
  );
}
