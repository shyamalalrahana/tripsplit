"use client";

import { useEffect, useState } from "react";
import { ReceiptText, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LoadingCard } from "@/components/LoadingCard";
import { calculateBalances, formatMoney } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseSplit, Trip, TripMember } from "@/lib/types";

const expenseListColumns = "id,trip_id,title,amount,category,paid_by_member_id,expense_date,notes,created_by";

export function BalancesPage({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    const [tripResult, membersResult, expensesResult] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("trip_members").select("id,trip_id,profile_id,name,phone,upi_id,avatar_color,avatar_url,role").eq("trip_id", tripId),
      supabase.from("expenses").select(expenseListColumns).eq("trip_id", tripId)
    ]);
    const expensesData = expensesResult.data || [];
    const expenseIds = (expensesData || []).map((expense) => expense.id);
    const { data: splitsData } = expenseIds.length ? await supabase.from("expense_splits").select("*").in("expense_id", expenseIds) : { data: [] };
    setTrip(tripResult.data);
    setMembers(membersResult.data || []);
    setExpenses(expensesData as Expense[]);
    setSplits(splitsData || []);
  }

  if (!trip) return <AppShell tripId={tripId}><LoadingCard label="Loading balances" /></AppShell>;
  const balances = calculateBalances(members, expenses, splits);

  return (
    <AppShell tripId={tripId}>
      <section className="sectionHead">
        <div><p className="kicker">Balances</p><h1>Who owes what</h1><p className="muted">Positive means receive money. Negative means pay money.</p></div>
      </section>
      <div className="balanceList">
        {balances.map((item) => (
          <article className="card balanceCard" key={item.member.id}>
            <div className="balanceMain">
              <div className="balancePerson">
                <span className="avatar balanceAvatar" style={{ background: item.member.avatar_color || "#2563eb" }}>{item.member.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <h3>{item.member.name}</h3>
                  <span className={`badge ${item.balance > 0 ? "receive" : item.balance < 0 ? "owe" : "settled"}`}>{item.balance > 0 ? "Receive" : item.balance < 0 ? "Owes" : "Settled"}</span>
                </div>
              </div>
              <strong className={`balanceAmount ${item.balance > 0 ? "positive" : item.balance < 0 ? "negative" : ""}`}>
                {item.balance < 0 ? "-" : ""}{formatMoney(Math.abs(item.balance), trip.currency)}
              </strong>
            </div>
            <div className="balanceMiniGrid">
              <span><ReceiptText size={14} /> Paid <b>{formatMoney(item.paid, trip.currency)}</b></span>
              <span><Users size={14} /> Share <b>{formatMoney(item.share, trip.currency)}</b></span>
            </div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
