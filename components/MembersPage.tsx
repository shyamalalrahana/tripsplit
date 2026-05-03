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
    const form = new FormData(event.currentTarget);
    await supabase.from("trip_members").update({
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      upi_id: String(form.get("upi_id") || ""),
      avatar_color: String(form.get("avatar_color") || "#2563eb")
    }).eq("id", member.id);
    load();
  }

  if (!trip) return <AppShell tripId={tripId}><div className="card">Loading members...</div></AppShell>;
  const balances = calculateBalances(members, expenses, splits);

  return (
    <AppShell tripId={tripId}>
      <section className="sectionHead">
        <div><p className="kicker">Members</p><h1>Trip members</h1><p className="muted">Add UPI IDs so QR payments can be generated for settlements.</p></div>
      </section>
      <div className="grid2">
        {members.map((member) => {
          const balance = balances.find((item) => item.member.id === member.id);
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
              <div className="grid2">
                <div className="field"><label>Name</label><input name="name" defaultValue={member.name} required /></div>
                <div className="field"><label>Phone</label><input name="phone" defaultValue={member.phone || ""} /></div>
                <div className="field"><label>UPI ID</label><input name="upi_id" defaultValue={member.upi_id || ""} placeholder="name@bank" /></div>
                <div className="field"><label>Avatar color</label><input name="avatar_color" defaultValue={member.avatar_color || "#2563eb"} /></div>
              </div>
              <button className="buttonSecondary" type="submit">Save member</button>
            </form>
          );
        })}
      </div>
    </AppShell>
  );
}
