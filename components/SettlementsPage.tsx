"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingCard } from "@/components/LoadingCard";
import { calculateBalances, calculateSettlementDrafts, formatMoney, mergeSettlementStatus } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseSplit, Settlement, Trip, TripMember } from "@/lib/types";

export function SettlementsPage({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    const { data: tripData } = await supabase.from("trips").select("*").eq("id", tripId).single();
    const { data: membersData } = await supabase.from("trip_members").select("*").eq("trip_id", tripId);
    const { data: expensesData } = await supabase.from("expenses").select("*").eq("trip_id", tripId);
    const expenseIds = (expensesData || []).map((expense) => expense.id);
    const { data: splitsData } = expenseIds.length ? await supabase.from("expense_splits").select("*").in("expense_id", expenseIds) : { data: [] };
    const { data: settlementsData } = await supabase.from("settlements").select("*").eq("trip_id", tripId);
    setTrip(tripData);
    setMembers(membersData || []);
    setExpenses(expensesData || []);
    setSplits(splitsData || []);
    setSettlements(settlementsData || []);
  }

  async function ensureSaved(draft: { from_member_id: string; to_member_id: string; amount: number; payment_note: string; id?: string }) {
    if (draft.id) return draft.id;
    const { data } = await supabase.from("settlements").insert({ ...draft, trip_id: tripId, status: "pending" }).select("*").single();
    await load();
    return data?.id;
  }

  async function markPaid(draft: { from_member_id: string; to_member_id: string; amount: number; payment_note: string; id?: string }) {
    const id = await ensureSaved(draft);
    if (!id) return;
    await supabase.from("settlements").update({ status: "paid_by_sender", paid_at: new Date().toISOString() }).eq("id", id);
    load();
  }

  if (!trip) return <AppShell tripId={tripId}><LoadingCard label="Loading settlement" /></AppShell>;
  const balances = calculateBalances(members, expenses, splits);
  const drafts = mergeSettlementStatus(calculateSettlementDrafts(balances, trip.name), settlements);

  return (
    <AppShell tripId={tripId}>
      <section className="sectionHead">
        <div><p className="kicker">Settlement</p><h1>Final payment plan</h1><p className="muted">Scan QR to pay with any UPI app. Payment confirmation is manual for now.</p></div>
      </section>
      <div className="grid">
        {drafts.length ? drafts.map((draft) => {
          const from = members.find((member) => member.id === draft.from_member_id);
          const to = members.find((member) => member.id === draft.to_member_id);
          const statusClass = draft.status === "settled" || draft.status === "confirmed_by_receiver" ? "receive" : draft.status === "paid_by_sender" ? "paid" : "pending";
          return (
            <article className="card grid" key={`${draft.from_member_id}-${draft.to_member_id}-${draft.amount}`}>
              <div className="row">
                <div><h3>{from?.name} pays {to?.name}</h3><p className="muted">Aju owes Rahul {formatMoney(draft.amount, trip.currency)}</p></div>
                <span className={`badge ${statusClass}`}>{draft.status === "paid_by_sender" ? "Waiting for receiver confirmation" : draft.status}</span>
              </div>
              <h2>{formatMoney(draft.amount, trip.currency)}</h2>
              <div className="cluster">
                {draft.id ? <Link className="button" href={`/trips/${tripId}/pay/${draft.id}`}>Pay Now</Link> : <button className="button" onClick={() => ensureSaved(draft).then((id) => id && (window.location.href = `/trips/${tripId}/pay/${id}`))} type="button">Pay Now</button>}
                <button className="buttonSecondary" onClick={() => markPaid(draft)} type="button">I have paid</button>
              </div>
            </article>
          );
        }) : <div className="card empty"><div><h2>You are all settled</h2><p className="muted">No payments are needed.</p></div></div>}
      </div>
    </AppShell>
  );
}
