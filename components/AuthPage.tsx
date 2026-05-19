"use client";

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
    <main style={{ minHeight: "100vh", background: "var(--bg-stage)", backgroundAttachment: "fixed", position: "relative", overflow: "hidden" }}>
      {/* Aurora blobs */}
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: -120, left: -80, width: 320, height: 320, background: "radial-gradient(circle, rgba(91,140,255,.55), transparent 70%)", filter: "blur(20px)" }} />
        <div style={{ position: "absolute", bottom: -160, right: -100, width: 360, height: 360, background: "radial-gradient(circle, rgba(181,123,255,.45), transparent 70%)", filter: "blur(20px)" }} />
      </div>

      {/* Theme toggle floating */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 30 }}>
        <ThemeToggle />
      </div>

      {/* Cover hero band */}
      <div style={{ position: "relative", height: 300, overflow: "hidden", marginBottom: -56 }}>
        {/* Aurora gradient cover */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #1A2240 0%, #2A6CFF 40%, #B57BFF 70%, #FF6BC9 100%)" }}>
          <div style={{ position: "absolute", top: 38, right: 50, width: 64, height: 64, borderRadius: 999, background: "radial-gradient(circle, #FFC55B 0%, #FF8A5B 60%, transparent 75%)", filter: "blur(2px)" }} />
        </div>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(5,7,13,0) 40%, rgba(5,7,13,.65) 80%, var(--ink-1) 100%)" }} />
        {/* Wordmark */}
        <div style={{ position: "absolute", top: 20, left: 22, display: "flex", alignItems: "center", gap: 10, zIndex: 5 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: "var(--g-aurora)", display: "grid", placeItems: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,.4), 0 8px 20px -4px rgba(91,140,255,.45)" }}>
            <span style={{ fontSize: 18 }}>✈️</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "#F4F6FF", letterSpacing: "-0.02em" }}>TripSplits</span>
        </div>
        {/* Headline */}
        <div style={{ position: "absolute", left: 22, right: 22, bottom: 72, color: "#F4F6FF", zIndex: 5 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", opacity: .8, marginBottom: 8 }}>Trip money, clear</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Split trips with friends.<br />Settle by UPI QR.
          </div>
        </div>
      </div>

      {/* Form card lifts over the cover */}
      <div style={{ position: "relative", zIndex: 4, maxWidth: 480, margin: "0 auto", padding: "0 16px 48px" }}>
        <form onSubmit={submit} style={{ background: "var(--g-card-glass)", border: "1px solid var(--line)", borderRadius: 32, padding: 22, boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 24px 60px -20px rgba(0,0,0,.55)", backdropFilter: "blur(24px) saturate(140%)", WebkitBackdropFilter: "blur(24px) saturate(140%)" }}>
          {/* Segmented login/signup switcher */}
          <div style={{ display: "flex", padding: 4, background: "var(--glass)", border: "1px solid rgba(255,255,255,.08)", borderRadius: 999, gap: 2, marginBottom: 18 }}>
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  background: mode === m ? "linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,.08))" : "transparent",
                  border: mode === m ? "1px solid rgba(255,255,255,.12)" : "1px solid transparent",
                  color: mode === m ? "var(--fg-1)" : "var(--fg-2)",
                  borderRadius: 999,
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  fontSize: 12.5,
                  cursor: "pointer",
                  transition: "all 240ms"
                }}
              >
                {m === "login" ? "Login" : "Sign up"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!hasSupabaseEnv() && (
              <div className="badge pending">Add Supabase env vars before login works</div>
            )}
            {mode === "signup" && (
              <>
                <div className="field">
                  <label>Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul" />
                </div>
                <div className="field">
                  <label>Profile picture (optional)</label>
                  <input accept="image/*" name="avatar" type="file" />
                </div>
              </>
            )}
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>
            {message && (
              <p style={{ color: "var(--accent-orange)", fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 600 }}>{message}</p>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            <button className="button" disabled={loading} type="submit" style={{ width: "100%" }}>
              {loading ? "Please wait..." : mode === "login" ? "Login to your trips" : "Create account"}
            </button>
          </div>

          <div style={{ marginTop: 16, textAlign: "center", color: "var(--fg-2)", fontSize: 12, fontWeight: 500, lineHeight: 1.55 }}>
            {mode === "login" ? "New to TripSplits?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              type="button"
              style={{ background: "transparent", border: 0, color: "var(--accent-blue)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
            >
              {mode === "login" ? "Create an account →" : "Login →"}
            </button>
          </div>
        </form>

        <p style={{ textAlign: "center", color: "var(--fg-3)", fontSize: 11, fontWeight: 500, padding: "16px 32px 0", lineHeight: 1.5 }}>
          UPI QR payments work with GPay, PhonePe, Paytm, BHIM — any UPI app.
        </p>
      </div>
    </main>
  );
}
