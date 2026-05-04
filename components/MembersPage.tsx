"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
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
    setMessage("");
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("trip_members").update({
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      upi_id: String(form.get("upi_id") || ""),
      avatar_color: String(form.get("avatar_color") || "#2563eb")
    }).eq("id", member.id);
    if (error) {
      setMessage(error.message);
      return;
    }
    setEditingMemberId(null);
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

  if (!trip) return <AppShell tripId={tripId}><div className="card">Loading members...</div></AppShell>;
  const balances = calculateBalances(members, expenses, splits);

  return (
    <AppShell tripId={tripId}>
      <section className="sectionHead">
        <div><p className="kicker">Members</p><h1>Trip members</h1><p className="muted">Edit friend profiles, add UPI IDs, or remove members before expenses are added.</p></div>
      </section>
      {message ? <p className="badge pending">{message}</p> : null}
      <div className="grid2">
        {members.map((member) => {
          const balance = balances.find((item) => item.member.id === member.id);
          const isEditing = editingMemberId === member.id;
          return (
            <form className="card grid" onSubmit={(event) => updateMember(event, member)} key={member.id}>
              <div className="row">
                <div className="cluster">
                  <span className="avatar" style={{ background: member.avatar_color || "#2563eb" }}>{member.name.slice(0, 2).toUpperCase()}</span>
                  <div><h3>{member.name}</h3><p className="muted">{member.role}</p></div>
                </div>
                <span className={`badge ${(balance?.balance || 0) > 0 ? "receive" : (balance?.balance || 0) < 0 ? "owe" : "settled"}`}>
                  {formatMoney(Math.abs(balance?.balance || 0), trip.currency)}
                </span>
              </div>
              {isEditing ? (
                <>
                  <div className="grid2">
                    <div className="field"><label>Name</label><input name="name" defaultValue={member.name} required /></div>
                    <div className="field"><label>Phone</label><input name="phone" defaultValue={member.phone || ""} /></div>
                    <div className="field"><label>UPI ID</label><input name="upi_id" defaultValue={member.upi_id || ""} placeholder="name@bank" /></div>
                    <div className="field"><label>Avatar color</label><input name="avatar_color" defaultValue={member.avatar_color || "#2563eb"} /></div>
                  </div>
                  <div className="cluster">
                    <button className="button" type="submit">Save profile</button>
                    <button className="buttonSecondary" onClick={() => setEditingMemberId(null)} type="button">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid2">
                    <div><p className="muted">Phone</p><b>{member.phone || "Not added"}</b></div>
                    <div><p className="muted">UPI ID</p><b>{member.upi_id || "Not added"}</b></div>
                    <div><p className="muted">Paid</p><b>{formatMoney(balance?.paid || 0, trip.currency)}</b></div>
                    <div><p className="muted">Share</p><b>{formatMoney(balance?.share || 0, trip.currency)}</b></div>
                  </div>
                  <div className="cluster">
                    <button className="buttonSecondary" onClick={() => setEditingMemberId(member.id)} type="button">Edit profile</button>
                    <button className="buttonDanger" onClick={() => deleteMember(member)} type="button">Delete member</button>
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
