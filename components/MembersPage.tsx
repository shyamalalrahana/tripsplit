"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AvatarView } from "@/components/AvatarView";
import { LoadingCard } from "@/components/LoadingCard";
import { imageFileToDataUrl } from "@/lib/avatar";
import { calculateBalances, formatMoney } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseSplit, Trip, TripMember } from "@/lib/types";

export function MembersPage({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).single();
    const { data: membersData } = await supabase.from("trip_members").select("*").eq("trip_id", tripId).order("joined_at");
    const { data: expensesData } = await supabase.from("expenses").select("*").eq("trip_id", tripId);
    const expenseIds = (expensesData || []).map((expense) => expense.id);
    const { data: splitsData } = expenseIds.length ? await supabase.from("expense_splits").select("*").in("expense_id", expenseIds) : { data: [] };
    setTrip(tripData);
    setMembers(membersData || []);
    setExpenses(expensesData || []);
    setSplits(splitsData || []);
  }

  async function updateMember(event: React.FormEvent<HTMLFormElement>, member: TripMember) {
    event.preventDefault();
    if (savingMemberId) return;
    setMessage("");
    setSavingMemberId(member.id);
    const form = new FormData(event.currentTarget);
    let avatarUrl = member.avatar_url || "";
    try {
      avatarUrl = (await imageFileToDataUrl(form.get("avatar") as File | null)) || avatarUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload profile picture.");
      setSavingMemberId(null);
      return;
    }
    const payload = {
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      avatar_color: String(form.get("avatar_color") || "#2563eb"),
      avatar_url: avatarUrl || null
    };
    const { error } = await supabase.from("trip_members").update(payload).eq("id", member.id);
    if (error) {
      setMessage(error.message);
      setSavingMemberId(null);
      return;
    }
    setMembers((current) => current.map((item) => (item.id === member.id ? { ...item, ...payload } : item)));
    setMessage(`${payload.name} profile updated.`);
    setEditingMemberId(null);
    setSavingMemberId(null);
    load();
  }

  async function deleteMember(member: TripMember) {
    setMessage("");
    if (member.role === "owner") {
      setMessage("Trip owner cannot be removed from the members page.");
      return;
    }
    const usedInExpenses = expenses.some((expense) => expense.paid_by_member_id === member.id);
    const usedInSplits = splits.some((split) => split.member_id === member.id);
    if (usedInExpenses || usedInSplits) {
      setMessage(`${member.name} is already used in expenses. Delete or edit those expenses first.`);
      return;
    }
    if (!confirm(`Delete ${member.name} from this trip?`)) return;
    const { error } = await supabase.from("trip_members").delete().eq("id", member.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    load();
  }

  if (!trip) return <AppShell tripId={tripId}><LoadingCard label="Loading members" /></AppShell>;
  const balances = calculateBalances(members, expenses, splits);

  return (
    <AppShell tripId={tripId}>
      <section className="sectionHead">
        <div><p className="kicker">Members</p><h1>Trip members</h1><p className="muted">Manage your trip crew, update names and phone numbers, and remove unused members.</p></div>
      </section>
      {message ? <p className="badge pending">{message}</p> : null}
      <div className="grid2">
        {members.map((member) => {
          const balance = balances.find((item) => item.member.id === member.id);
          const isEditing = editingMemberId === member.id;
          const balanceStatus = (balance?.balance || 0) > 0 ? "receive" : (balance?.balance || 0) < 0 ? "owe" : "settled";
          return (
            <form className="memberCard grid" onSubmit={(event) => updateMember(event, member)} key={member.id}>
              <div className="memberHero">
                <AvatarView className="memberAvatar" name={member.name} color={member.avatar_color} image={member.avatar_url} />
                <div>
                  <h3>{member.name}</h3>
                  <p className="muted">{member.role === "owner" ? "Trip owner" : member.role === "guest" ? "Joined by invite" : "Trip member"}</p>
                </div>
                <span className={`badge ${balanceStatus}`}>
                  {formatMoney(Math.abs(balance?.balance || 0), trip.currency)}
                </span>
              </div>
              {isEditing ? (
                <>
                  <div className="grid2">
                    <div className="field"><label>Profile picture</label><input accept="image/*" name="avatar" type="file" /></div>
                    <div className="field"><label>Name</label><input name="name" defaultValue={member.name} required /></div>
                    <div className="field"><label>Phone</label><input name="phone" defaultValue={member.phone || ""} /></div>
                    <div className="field"><label>Avatar color</label><input name="avatar_color" defaultValue={member.avatar_color || "#2563eb"} /></div>
                  </div>
                  <div className="cluster">
                    <button className="button" disabled={savingMemberId === member.id} type="submit">{savingMemberId === member.id ? "Saving..." : "Save profile"}</button>
                    <button className="buttonSecondary" onClick={() => setEditingMemberId(null)} type="button">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="memberMeta">
                    <div><p className="muted">Phone</p><b>{member.phone || "Not added"}</b></div>
                    <div><p className="muted">Paid</p><b>{formatMoney(balance?.paid || 0, trip.currency)}</b></div>
                    <div><p className="muted">Share</p><b>{formatMoney(balance?.share || 0, trip.currency)}</b></div>
                  </div>
                  <div className="cluster">
                    <button className="buttonSecondary" onClick={() => setEditingMemberId(member.id)} type="button"><Pencil size={16} /> Edit</button>
                    <button className="buttonDanger" onClick={() => deleteMember(member)} type="button"><Trash2 size={16} /> Delete</button>
                  </div>
                </>
              )}
            </form>
          );
        })}
      </div>
    </AppShell>
  );
}
