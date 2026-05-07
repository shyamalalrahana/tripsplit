"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AvatarView } from "@/components/AvatarView";
import { AppShell } from "@/components/AppShell";
import { LoadingCard } from "@/components/LoadingCard";
import { imageFileToDataUrl } from "@/lib/avatar";
import { buildExpenseSplits, validateSplits } from "@/lib/expense";
import { supabase } from "@/lib/supabase";
import type { Trip, TripMember } from "@/lib/types";

const categories = ["Food", "Petrol", "Hotel", "Tickets", "Shopping", "Parking", "Other"];

function splitEmoji(index: number, selected: boolean) {
  if (selected) return "✅";
  const icons = ["🙂", "🧳", "🚗", "🍽️", "🏨", "🎒", "🌿", "☕"];
  return icons[index % icons.length];
}

export function AddExpensePage({ tripId }: { tripId: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [splitType, setSplitType] = useState<"equal" | "custom" | "percentage">("equal");
  const [selected, setSelected] = useState<string[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, number>>({});
  const [message, setMessage] = useState("");
  const [receiptPreview, setReceiptPreview] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    const [tripResult, membersResult] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("trip_members").select("*").eq("trip_id", tripId).order("joined_at")
    ]);
    setTrip(tripResult.data);
    setMembers(membersResult.data || []);
    setSelected((membersResult.data || []).map((member) => member.id));
  }

  const splitHint = useMemo(() => {
    if (splitType === "equal") return "TripSplits will divide this expense equally among selected members.";
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
    let receiptUrl = receiptPreview;
    try {
      receiptUrl = (await imageFileToDataUrl(form.get("receipt") as File | null)) || receiptUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload receipt photo.");
      setSaving(false);
      return;
    }
    const amount = Number(form.get("amount") || 0);
    const splits = buildExpenseSplits({ amount, splitType, selectedMemberIds: selected, customValues, members });
    const validation = validateSplits(amount, splitType, splits);
    if (validation) {
      setMessage(validation);
      setSaving(false);
      return;
    }
    const expensePayload = {
      trip_id: tripId,
      title: String(form.get("title")),
      amount,
      category: String(form.get("category")),
      paid_by_member_id: String(form.get("paid_by_member_id")),
      expense_date: String(form.get("expense_date")),
      notes: String(form.get("notes") || ""),
      receipt_url: receiptUrl || ""
    };
    const rpcResult = await supabase.rpc("add_trip_expense", {
      expense_input: expensePayload,
      split_input: splits
    });
    if (rpcResult.error) {
      if (rpcResult.error.message.includes("Could not find the function")) {
        const { data: auth } = await supabase.auth.getUser();
        const { data: profile } = auth.user ? await supabase.from("profiles").select("id").eq("user_id", auth.user.id).single() : { data: null };
        const { data: expense, error } = await supabase.from("expenses").insert({ ...expensePayload, created_by: profile?.id || null }).select("*").single();
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
      } else {
        setMessage(rpcResult.error.message || "Could not save expense.");
        setSaving(false);
        return;
      }
    }
    router.replace(`/trips/${tripId}`);
    router.refresh();
  }

  async function previewReceipt(event: React.ChangeEvent<HTMLInputElement>) {
    setMessage("");
    try {
      const image = await imageFileToDataUrl(event.target.files?.[0] || null);
      if (image) setReceiptPreview(image);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload receipt photo.");
    }
  }

  if (!trip) return <AppShell tripId={tripId}><LoadingCard label="Loading expense form" /></AppShell>;

  return (
    <AppShell tripId={tripId}>
      <form className="card grid" onSubmit={submit}>
        <div><p className="kicker">Manual expense</p><h1>Add expense</h1><p className="muted">Rahul paid for Petrol. Select who shared it and TripSplits will calculate balances.</p></div>
        <div className="grid2">
          <div className="field"><label>Expense title</label><input name="title" placeholder="Petrol" required /></div>
          <div className="field"><label>Amount</label><input name="amount" type="number" min="0.01" step="0.01" required /></div>
          <div className="field"><label>Category</label><select name="category">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div className="field"><label>Paid by</label><select name="paid_by_member_id">{members.map((member) => <option value={member.id} key={member.id}>{member.name}</option>)}</select></div>
          <div className="field"><label>Date and time</label><input name="expense_date" type="datetime-local" defaultValue={new Date().toISOString().slice(0, 16)} /></div>
          <div className="field"><label>Split type</label><select value={splitType} onChange={(event) => setSplitType(event.target.value as typeof splitType)}><option value="equal">Equal split</option><option value="custom">Custom amount</option><option value="percentage">Percentage split</option></select></div>
        </div>

        <div className="splitPanel grid">
          <div className="splitPanelHeader">
            <div>
              <h3>Split members</h3>
              <p className="muted">{splitHint}</p>
            </div>
            <span>{selected.length}/{members.length}</span>
          </div>
          <div className="splitMemberGrid">
            {members.map((member, index) => {
              const isSelected = selected.includes(member.id);
              return (
                <label className={`splitMemberOption ${isSelected ? "selected" : ""}`} key={member.id}>
                  <input
                    className="splitCheckbox"
                    checked={isSelected}
                    onChange={(event) => setSelected(event.target.checked ? [...selected, member.id] : selected.filter((id) => id !== member.id))}
                    type="checkbox"
                  />
                  <span className="splitCheckMark" aria-hidden="true" />
                  <span className="splitEmoji" aria-hidden="true">{splitEmoji(index, isSelected)}</span>
                  <AvatarView className="splitAvatar" name={member.name} color={member.avatar_color} image={member.avatar_url} />
                  <span className="splitMemberText">
                    <strong>{member.name}</strong>
                    <small>{isSelected ? "Included in split" : "Tap to include"}</small>
                  </span>
                  {splitType !== "equal" ? (
                    <input
                      className="splitValue"
                      min="0"
                      onChange={(event) => setCustomValues({ ...customValues, [member.id]: Number(event.target.value || 0) })}
                      placeholder={splitType === "percentage" ? "%" : trip.currency}
                      step="0.01"
                      type="number"
                    />
                  ) : null}
                </label>
              );
            })}
          </div>
        </div>

        <div className="field"><label>Notes optional</label><textarea name="notes" placeholder="Rahul paid for Petrol" /></div>
        <div className="receiptUpload">
          <div>
            <h3>Receipt photo optional</h3>
            <p className="muted">Take a photo or choose an image from your gallery.</p>
            <label className="buttonSecondary receiptUploadButton">
              {receiptPreview ? "Change receipt photo" : "Add receipt photo"}
              <input accept="image/*" capture="environment" name="receipt" onChange={previewReceipt} type="file" />
            </label>
          </div>
          {receiptPreview ? <img alt="Receipt preview" className="receiptPreview" src={receiptPreview} /> : <div className="receiptPlaceholder">Receipt</div>}
        </div>
        {message ? <p className="badge pending">{message}</p> : null}
        <button className="button" disabled={saving} type="submit">{saving ? "Saving..." : "Save expense"}</button>
      </form>
    </AppShell>
  );
}
