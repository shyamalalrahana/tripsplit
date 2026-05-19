"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, CreditCard } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AvatarView } from "@/components/AvatarView";
import { LoadingCard } from "@/components/LoadingCard";
import { calculateBalances, calculateSettlementDrafts, formatMoney, mergeSettlementStatus } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseSplit, Settlement, Trip, TripMember } from "@/lib/types";

const expenseListColumns = "id,trip_id,title,amount,category,paid_by_member_id,expense_date,notes,created_by";

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
    const [tripResult, membersResult, expensesResult, settlementsResult] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("trip_members").select("id,trip_id,profile_id,name,phone,upi_id,avatar_color,avatar_url,role").eq("trip_id", tripId),
      supabase.from("expenses").select(expenseListColumns).eq("trip_id", tripId),
      supabase.from("settlements").select("*").eq("trip_id", tripId)
    ]);
    const expensesData = expensesResult.data || [];
    const expenseIds = (expensesData || []).map((expense) => expense.id);
    const { data: splitsData } = expenseIds.length ? await supabase.from("expense_splits").select("*").in("expense_id", expenseIds) : { data: [] };
    setTrip(tripResult.data);
    setMembers(membersResult.data || []);
    setExpenses(expensesData as Expense[]);
    setSplits(splitsData || []);
    setSettlements(settlementsResult.data || []);
  }

  async function ensureSaved(draft: { from_member_id: string; to_member_id: string; amount: number; payment_note: string; id?: string }) {
    if (draft.id) return draft.id;
    const { data } = await supabase.from("settlements").insert({ ...draft, trip_id: tripId, status: "pending" }).select("*").single();
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
        <div>
          <p className="kicker">Settlement</p>
          <h1>Final payment plan</h1>
          <p className="muted">Scan QR to pay with any UPI app. Payment confirmation is manual for now.</p>
        </div>
      </section>
      <div className="settlementList">
        {drafts.length ? drafts.map((draft) => {
          const from = members.find((member) => member.id === draft.from_member_id);
          const to = members.find((member) => member.id === draft.to_member_id);
          const statusClass = draft.status === "settled" || draft.status === "confirmed_by_receiver" ? "receive" : draft.status === "paid_by_sender" ? "paid" : "pending";
          const statusText = draft.status === "paid_by_sender" ? "Waiting confirmation" : draft.status === "confirmed_by_receiver" ? "Settled" : draft.status;
          return (
            <article className="settlementCard" key={`${draft.from_member_id}-${draft.to_member_id}-${draft.amount}`}>
              <div className="settlementTop">
                <div className="settlementFlow">
                  <AvatarView className="settlementAvatar" name={from?.name || "From"} color={from?.avatar_color} image={from?.avatar_url} />
                  <ArrowRight size={16} />
                  <AvatarView className="settlementAvatar" name={to?.name || "To"} color={to?.avatar_color} image={to?.avatar_url} />
                </div>
                <span className={`badge ${statusClass}`}>{statusText}</span>
              </div>
              <div className="settlementMain">
                <div>
                  <h3 style={{ marginBottom: 4 }}>{from?.name} pays {to?.name}</h3>
                  <p className="muted" style={{ fontSize: 12 }}>{to?.name} should receive from {from?.name}</p>
                </div>
                <b>{formatMoney(draft.amount, trip.currency)}</b>
              </div>
              <div className="settlementActions">
                {draft.id
                  ? <Link className="button" href={`/trips/${tripId}/pay/${draft.id}`}><CreditCard size={16} /> Pay</Link>
                  : <button className="button" onClick={() => ensureSaved(draft).then((id) => id && (window.location.href = `/trips/${tripId}/pay/${id}`))} type="button"><CreditCard size={16} /> Pay</button>
                }
                <button className="buttonSecondary" onClick={() => markPaid(draft)} type="button">
                  {draft.status === "paid_by_sender" ? <Clock3 size={16} /> : <CheckCircle2 size={16} />} Paid
                </button>
              </div>
            </article>
          );
        }) : (
          <div className="card empty">
            <div><h2>You are all settled</h2><p className="muted">No payments are needed.</p></div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
