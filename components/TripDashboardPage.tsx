"use client";

import Link from "next/link";
import { Copy, Plus, Share2, TrendingDown, TrendingUp, Users, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingCard } from "@/components/LoadingCard";
import { calculateBalances, calculateSettlementDrafts, formatMoney } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseSplit, Settlement, Trip, TripMember } from "@/lib/types";

type Bundle = {
  trip: Trip;
  members: TripMember[];
  expenses: Expense[];
  splits: ExpenseSplit[];
  settlements: Settlement[];
  currentMemberId: string | null;
};

const categoryImages: Record<string, { icon: string; tone: string }> = {
  Food: { icon: "🍽️", tone: "mint" },
  Petrol: { icon: "⛽", tone: "sun" },
  Hotel: { icon: "🏨", tone: "peach" },
  Tickets: { icon: "🎟️", tone: "violet" },
  Shopping: { icon: "🛍️", tone: "rose" },
  Parking: { icon: "🅿️", tone: "sky" },
  Other: { icon: "🧾", tone: "slate" }
};

function formatExpenseDate(date: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));
}

export function TripDashboardPage({ tripId }: { tripId: string }) {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    const { data: trip } = await supabase.from("trips").select("*").eq("id", tripId).single();
    const { data: members } = await supabase.from("trip_members").select("*").eq("trip_id", tripId).order("joined_at");
    const { data: expenses } = await supabase.from("expenses").select("*").eq("trip_id", tripId).order("expense_date", { ascending: false });
    const expenseIds = (expenses || []).map((expense) => expense.id);
    const { data: splits } = expenseIds.length
      ? await supabase.from("expense_splits").select("*").in("expense_id", expenseIds)
      : { data: [] as ExpenseSplit[] };
    const { data: settlements } = await supabase.from("settlements").select("*").eq("trip_id", tripId);
    const { data: auth } = await supabase.auth.getUser();
    const { data: profile } = auth.user ? await supabase.from("profiles").select("id").eq("user_id", auth.user.id).maybeSingle() : { data: null };
    const currentMember = profile ? (members || []).find((member) => member.profile_id === profile.id) : null;
    if (trip) {
      setBundle({
        trip,
        members: members || [],
        expenses: expenses || [],
        splits: splits || [],
        settlements: settlements || [],
        currentMemberId: currentMember?.id || null
      });
    }
  }

  async function copyInvite() {
    if (!bundle) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const url = `${appUrl}/join/${bundle.trip.invite_code}`;
    await navigator.clipboard.writeText(url);
    setMessage("Invite link copied. Share this link with your friends.");
  }

  if (!bundle) return <AppShell tripId={tripId}><LoadingCard label="Loading trip" /></AppShell>;

  const balances = calculateBalances(bundle.members, bundle.expenses, bundle.splits);
  const total = bundle.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const settlementDrafts = calculateSettlementDrafts(balances, bundle.trip.name);
  const receivers = balances.filter((item) => item.balance > 0.01);
  const payers = balances.filter((item) => item.balance < -0.01);
  const categoryTotals = bundle.expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});
  const categoryChart = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount, visual: categoryImages[category] || categoryImages.Other }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const maxCategoryAmount = Math.max(...categoryChart.map((item) => item.amount), 1);

  return (
    <AppShell tripId={tripId}>
      <section className="cardSoft tripHero">
        <div>
          <p className="kicker">{bundle.trip.destination || "Trip group"}</p>
          <h1>{bundle.trip.name}</h1>
          <p className="muted">Share expenses with friends and settle by UPI QR. Payment confirmation is manual for now.</p>
        </div>
        <div className="tripHeroActions">
          <button className="buttonSecondary" onClick={copyInvite} type="button"><Share2 size={16} /> Share Trip</button>
          <Link className="button" href={`/trips/${tripId}/expenses/new`}><Plus size={16} /> Add Expense</Link>
        </div>
      </section>

      {message ? <p className="badge paid">{message}</p> : null}

      <section className="stats">
        <div className="card stat">
          <span className="statHeader"><span className="muted">Total expense</span><span className="statIcon blue"><WalletCards size={18} /></span></span>
          <b>{formatMoney(total, bundle.trip.currency)}</b>
        </div>
        <div className="card stat">
          <span className="statHeader"><span className="muted">Members</span><span className="statIcon violet"><Users size={18} /></span></span>
          <b>{bundle.members.length}</b>
        </div>
        <div className="card stat">
          <span className="statHeader"><span className="muted">Should receive</span><span className="statIcon green"><TrendingUp size={18} /></span></span>
          <b>{receivers.length}</b>
        </div>
        <div className="card stat">
          <span className="statHeader"><span className="muted">Need to pay</span><span className="statIcon orange"><TrendingDown size={18} /></span></span>
          <b>{payers.length}</b>
        </div>
      </section>

      <section className="twoCol" style={{ marginTop: 16 }}>
        <div className="grid">
          <div className="card expenseInsightCard">
            <div className="recentExpensesHeader">
              <h2>Spending</h2>
              <Link href={`/trips/${tripId}/expenses/new`}>Add</Link>
            </div>
            {bundle.expenses.length ? (
              <div className="simpleExpenseGraph">
                <div className="simpleGraphTotal">
                  <span className="muted">Total spent</span>
                  <b>{formatMoney(total, bundle.trip.currency)}</b>
                </div>
                <div className="simpleGraphRows">
                  {categoryChart.map((item, index) => (
                    <div className="simpleGraphRow" key={item.category}>
                      <div className="simpleGraphMeta">
                        <span><span aria-hidden="true">{item.visual.icon}</span>{item.category}</span>
                        <b>{formatMoney(item.amount, bundle.trip.currency)}</b>
                      </div>
                      <div className="simpleGraphTrack" aria-hidden="true">
                        <div className={`simpleGraphFill tone${(index % 5) + 1}`} style={{ width: `${Math.max(8, (item.amount / maxCategoryAmount) * 100)}%` }} />
                      </div>
                      <small>{Math.round((item.amount / total) * 100)}% of total</small>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="empty"><div><h3>No graph yet</h3><p className="muted">Add expenses to see the trip spending graph.</p></div></div>}
          </div>
          <div className="card recentExpensesCard">
            <div className="recentExpensesHeader">
              <h2>Recent Expenses</h2>
              <Link href={`/trips/${tripId}/expenses/new`}>All</Link>
            </div>
            {bundle.expenses.length ? (
              <div className="recentExpenseRows">
                {bundle.expenses.slice(0, 5).map((expense) => {
                    const payer = bundle.members.find((member) => member.id === expense.paid_by_member_id);
                    const isPaidByCurrentMember = Boolean(bundle.currentMemberId && expense.paid_by_member_id === bundle.currentMemberId);
                    const currentSplit = bundle.currentMemberId
                      ? bundle.splits.find((split) => split.expense_id === expense.id && split.member_id === bundle.currentMemberId)
                      : null;
                    const sharedCount = bundle.splits.filter((split) => split.expense_id === expense.id).length;
                    const visual = categoryImages[expense.category] || categoryImages.Other;
                    return (
                      <Link className="recentExpenseRow" href={`/trips/${tripId}/expenses/${expense.id}`} key={expense.id}>
                        <span className={`expenseCategoryImage ${visual.tone}`} aria-hidden="true">{visual.icon}</span>
                        <span className="recentExpenseCopy">
                          <strong>{expense.title}</strong>
                          <small>Paid by {isPaidByCurrentMember ? "You" : payer?.name || "Someone"} · {formatExpenseDate(expense.expense_date)}</small>
                        </span>
                        <span className="recentExpenseMoney">
                          <b>{formatMoney(Number(expense.amount), bundle.trip.currency)}</b>
                          <small className={isPaidByCurrentMember ? "paidText" : ""}>
                            {isPaidByCurrentMember
                              ? "You paid"
                              : currentSplit
                                ? `Your share ${formatMoney(Number(currentSplit.split_amount), bundle.trip.currency)}`
                                : `Shared with ${sharedCount}`}
                          </small>
                        </span>
                      </Link>
                    );
                  })}
              </div>
            ) : <div className="empty"><div><h3>No expenses yet</h3><p className="muted">Add your first trip expense.</p></div></div>}
          </div>
        </div>
        <aside className="grid">
          <div className="card">
            <h2>Who owes money</h2>
            <div className="grid">
              {payers.length ? payers.map((item) => <div className="row" key={item.member.id}><span>{item.member.name}</span><span className="badge owe">owes {formatMoney(Math.abs(item.balance), bundle.trip.currency)}</span></div>) : <p className="muted">You are all settled.</p>}
            </div>
          </div>
          <div className="card">
            <h2>Settlement plan</h2>
            <div className="grid">
              {settlementDrafts.length ? settlementDrafts.map((draft) => {
                const from = bundle.members.find((member) => member.id === draft.from_member_id);
                const to = bundle.members.find((member) => member.id === draft.to_member_id);
                return <p className="muted" key={`${draft.from_member_id}-${draft.to_member_id}-${draft.amount}`}>{from?.name} owes {to?.name} {formatMoney(draft.amount, bundle.trip.currency)}</p>;
              }) : <p className="muted">No payments needed.</p>}
            </div>
          </div>
          <button className="buttonSecondary" onClick={copyInvite} type="button"><Copy size={16} /> Copy invite link</button>
        </aside>
      </section>
    </AppShell>
  );
}
