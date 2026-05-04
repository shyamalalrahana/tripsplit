"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { buildExpenseSplits, validateSplits } from "@/lib/expense";
import { supabase } from "@/lib/supabase";
import type { Trip, TripMember } from "@/lib/types";

const categories = ["Food", "Petrol", "Hotel", "Tickets", "Shopping", "Parking", "Other"];

export function AddExpensePage({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [splitType, setSplitType] = useState<"equal" | "custom" | "percentage">("equal");
  const [selected, setSelected] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).single();
    const { data: membersData } = await supabase.from("trip_members").select("*").eq("trip_id", tripId).order("joined_at");
    setTrip(tripData);
    setMembers(membersData || []);
    setSelected((membersData || []).map((member) => member.id));
  }

  const splitHint = useMemo(() => {
    if (splitType === "equal") return "TripSplit will divide this expense equally among selected members.";
    if (splitType === "custom") return "Enter the exact amount each selected member should pay.";
    return "Enter percentages for selected members. Total should be 100%.";
  }, [splitType]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    if (!trip) return;
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("amount") || 0);
    const splits = buildExpenseSplits({ amount, splitType, selectedMemberIds: selected, customValues, members });
    const validation = validateSplits(amount, splitType, splits);
    if (validation) {
      setMessage(validation);
      setSaving(false);
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    const { data: profile } = auth.user ? await supabase.from("profiles").select("*").eq("user_id", auth.user.id).single() : { data: null };
    const { data: expense, error } = await supabase.from("expenses").insert({
      trip_id: tripId,
      title: String(form.get("title")),
      amount,
      category: String(form.get("category")),
      paid_by_member_id: String(form.get("paid_by_member_id")),
      expense_date: String(form.get("expense_date")),
      notes: String(form.get("notes") || ""),
      receipt_url: String(form.get("receipt_url") || ""),
      created_by: profile?.id || null
    }).select("*").single();
    if (error || !expense) {
      setMessage(error?.message || "Could not save expense.");
      setSaving(false);
      return;
    }
    const splitResult = await supabase.from("expense_splits").insert(splits.map((split) => ({ ...split, expense_id: expense.id })));
    if (splitResult.error) {
      setMessage(splitResult.error.message);
      setSaving(false);
      return;
    }
    await supabase.from("settlements").delete().eq("trip_id", tripId);
    router.push(`/trips/${tripId}`);
  }

  if (!trip) return <AppShell tripId={tripId}><div className="card">Loading expense form...</div></AppShell>;

  return (
    <AppShell tripId={tripId}>
      <form className="card grid" onSubmit={submit}>
        <div><p className="kicker">Manual expense</p><h1>Add expense</h1><p className="muted">Rahul paid for Petrol. Select who shared it and TripSplit will calculate balances.</p></div>
        <div className="grid2">
          <div className="field"><label>Expense title</label><input name="title" placeholder="Petrol" required /></div>
          <div className="field"><label>Amount</label><input name="amount" type="number" min="0.01" step="0.01" required /></div>
          <div className="field"><label>Category</label><select name="category">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="field"><label>Paid by</label><select name="paid_by_member_id">{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></div>
          <div className="field"><label>Date and time</label><input name="expense_date" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} /></div>
          <div className="field"><label>Split type</label><select value={splitType} onChange={(event) => setSplitType(event.target.value as typeof splitType)}><option value="equal">Equal split</option><option value="custom">Custom amount</option><option value="percentage">Percentage split</option></select></div>
        </div>

        <div className="card grid">
          <h3>Split between selected members</h3>
          <p className="muted">{splitHint}</p>
          <div className="grid2">
            {members.map((member) => (
              <label className="card cluster" key={member.id}>
                <input
                  checked={selected.includes(member.id)}
                  onChange={(event) => setSelected(event.target.checked ? [...selected, member.id] : selected.filter((id) => id !== member.id))}
                  type="checkbox"
                />
                <span>{member.name}</span>
                {splitType !== "equal" ? (
                  <input
                    min="0"
                    onChange={(event) => setCustomValues({ ...customValues, [member.id]: Number(event.target.value || 0) })}
                    placeholder={splitType === "percentage" ? "%" : trip.currency}
                    step="0.01"
                    type="number"
                  />
                ) : null}
              </label>
            ))}
          </div>
        </div>

        <div className="field"><label>Notes optional</label><textarea name="notes" placeholder="Rahul paid for Petrol" /></div>
        <div className="field"><label>Receipt image URL optional</label><input name="receipt_url" /></div>
        {message ? <p className="badge pending">{message}</p> : null}
        <button className="button" disabled={saving} type="submit">{saving ? "Saving..." : "Save expense"}</button>
      </form>
    </AppShell>
  );
}
