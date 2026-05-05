"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingCard } from "@/components/LoadingCard";
import { formatMoney } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseSplit, Trip, TripMember } from "@/lib/types";

export function ExpenseDetailsPage({ tripId, expenseId }: { tripId: string; expenseId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);

  useEffect(() => {
    load();
  }, [tripId, expenseId]);

  async function load() {
    const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).single();
    const { data: expenseData } = await supabase.from("expenses").select("*").eq("id", expenseId).single();
    const { data: membersData } = await supabase.from("trip_members").select("*").eq("trip_id", tripId);
    const { data: splitData } = await supabase.from("expense_splits").select("*").eq("expense_id", expenseId);
    setTrip(tripData);
    setExpense(expenseData);
    setMembers(membersData || []);
    setSplits(splitData || []);
  }

  async function remove() {
    if (!confirm("Delete this expense? Balances will update immediately.")) return;
    await supabase.from("expenses").delete().eq("id", expenseId);
    await supabase.from("settlements").delete().eq("trip_id", tripId);
    window.location.href = `/trips/${tripId}`;
  }

  if (!trip || !expense) return <AppShell tripId={tripId}><LoadingCard label="Loading expense" /></AppShell>;
  const payer = members.find((member) => member.id === expense.paid_by_member_id);

  return (
    <AppShell tripId={tripId}>
      <section className="card grid">
        <div className="sectionHead">
          <div><p className="kicker">{expense.category}</p><h1>{expense.title}</h1><p className="muted">{payer?.name || "Someone"} paid {formatMoney(Number(expense.amount), trip.currency)}</p></div>
          <button className="buttonDanger" onClick={remove} type="button">Delete</button>
        </div>
        <div className="grid">
          {splits.map((split) => {
            const member = members.find((item) => item.id === split.member_id);
            return <div className="card row" key={split.id}><span>{member?.name}</span><b>{formatMoney(Number(split.split_amount), trip.currency)}</b></div>;
          })}
        </div>
        {expense.receipt_url ? (
          <div className="receiptDetail">
            <h3>Receipt photo</h3>
            <img alt={`${expense.title} receipt`} src={expense.receipt_url} />
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
