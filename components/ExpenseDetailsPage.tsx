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
    const [tripResult, expenseResult, membersResult, splitResult] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("expenses").select("*").eq("id", expenseId).single(),
      supabase.from("trip_members").select("id,trip_id,profile_id,name,phone,upi_id,avatar_color,avatar_url,role").eq("trip_id", tripId),
      supabase.from("expense_splits").select("*").eq("expense_id", expenseId)
    ]);
    setTrip(tripResult.data);
    setExpense(expenseResult.data);
    setMembers(membersResult.data || []);
    setSplits(splitResult.data || []);
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
      <section className="card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="sectionHead">
          <div>
            <p className="kicker">{expense.category}</p>
            <h1>{expense.title}</h1>
            <p className="muted">{payer?.name || "Someone"} paid {formatMoney(Number(expense.amount), trip.currency)}</p>
          </div>
          <button className="buttonDanger" onClick={remove} type="button">Delete</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {splits.map((split) => {
            const member = members.find((item) => item.id === split.member_id);
            return (
              <div className="row" key={split.id}>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 14 }}>{member?.name}</span>
                <b style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{formatMoney(Number(split.split_amount), trip.currency)}</b>
              </div>
            );
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
