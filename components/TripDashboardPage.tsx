"use client";

import Link from "next/link";
import { Copy, Pencil, Plus, Share2, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
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
  currentProfileId: string | null;
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
  const router = useRouter();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [message, setMessage] = useState("");
  const [editingTrip, setEditingTrip] = useState(false);
  const [savingTrip, setSavingTrip] = useState(false);
  const [deletingTrip, setDeletingTrip] = useState(false);

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
        currentMemberId: currentMember?.id || null,
        currentProfileId: profile?.id || null
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

  async function updateTrip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bundle || savingTrip) return;
    setSavingTrip(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      destination: String(form.get("destination") || "").trim(),
      start_date: String(form.get("start_date") || "") || null,
      end_date: String(form.get("end_date") || "") || null,
      currency: String(form.get("currency") || "INR"),
      trip_image_url: String(form.get("trip_image_url") || "").trim()
    };
    const { data, error } = await supabase.from("trips").update(payload).eq("id", tripId).select("*").single();
    setSavingTrip(false);
    if (error || !data) {
      setMessage(error?.message || "Could not update trip.");
      return;
    }
    setBundle({ ...bundle, trip: data });
    setEditingTrip(false);
    setMessage("Trip details updated.");
  }

  async function deleteTrip() {
    if (!bundle || deletingTrip) return;
    const confirmed = window.confirm(`Delete "${bundle.trip.name}"? This removes members, expenses, splits, and settlements.`);
    if (!confirmed) return;
    setDeletingTrip(true);
    const { error } = await supabase.from("trips").delete().eq("id", tripId);
    setDeletingTrip(false);
    if (error) {
      setMessage(error.message || "Could not delete trip.");
      return;
    }
    router.push("/");
  }

  if (!bundle) return <AppShell tripId={tripId}><div className="card">Loading trip...</div></AppShell>;

  const balances = calculateBalances(bundle.members, bundle.expenses, bundle.splits);
  const total = bundle.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const settlementDrafts = calculateSettlementDrafts(balances, bundle.trip.name);
  const receivers = balances.filter((item) => item.balance > 0.01);
  const payers = balances.filter((item) => item.balance < -0.01);
  const isTripOwner = Boolean(bundle.currentProfileId && bundle.trip.created_by === bundle.currentProfileId);
  const categoryTotals = bundle.expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount || 0);
    return acc;
  }, {});
  const categoryChart = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount, visual: categoryImages[category] || categoryImages.Other }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const graphStops = categoryChart.length
    ? categoryChart.reduce<{ stops: string[]; cursor: number }>((acc, item, index) => {
        const colors = ["#6c63ff", "#22c55e", "#f97316", "#06b6d4", "#ec4899"];
        const start = acc.cursor;
        const end = start + (item.amount / total) * 100;
        acc.stops.push(`${colors[index]} ${start}% ${end}%`);
        acc.cursor = end;
        return acc;
      }, { stops: [], cursor: 0 }).stops.join(", ")
    : "#eef2f7 0% 100%";
  const topCategory = categoryChart[0];

  return (
    <AppShell tripId={tripId}>
      <section className="cardSoft sectionHead">
        <div>
          <p className="kicker">{bundle.trip.destination || "Trip group"}</p>
          <h1>{bundle.trip.name}</h1>
          <p className="muted">Share expenses with friends and settle by UPI QR. Payment confirmation is manual for now.</p>
        </div>
        <div className="cluster">
          {isTripOwner ? (
            <>
              <button className="buttonSecondary" onClick={() => setEditingTrip(true)} type="button"><Pencil size={16} /> Edit Trip</button>
              <button className="buttonDanger" disabled={deletingTrip} onClick={deleteTrip} type="button"><Trash2 size={16} /> {deletingTrip ? "Deleting..." : "Delete"}</button>
            </>
          ) : null}
          <button className="buttonSecondary" onClick={copyInvite} type="button"><Share2 size={16} /> Share Trip</button>
          <Link className="button" href={`/trips/${tripId}/expenses/new`}><Plus size={16} /> Add Expense</Link>
        </div>
      </section>

      {editingTrip ? (
        <section className="card tripEditPanel">
          <div className="sectionHead">
            <div>
              <p className="kicker">Owner tools</p>
              <h2>Edit trip details</h2>
            </div>
            <button className="iconButton" onClick={() => setEditingTrip(false)} type="button" aria-label="Close edit trip"><X size={18} /></button>
          </div>
          <form className="grid" onSubmit={updateTrip}>
            <div className="grid2">
              <div className="field"><label>Trip name</label><input name="name" defaultValue={bundle.trip.name} required /></div>
              <div className="field"><label>Destination</label><input name="destination" defaultValue={bundle.trip.destination || ""} /></div>
              <div className="field"><label>Start date</label><input name="start_date" type="date" defaultValue={bundle.trip.start_date || ""} /></div>
              <div className="field"><label>End date</label><input name="end_date" type="date" defaultValue={bundle.trip.end_date || ""} /></div>
              <div className="field"><label>Currency</label><select name="currency" defaultValue={bundle.trip.currency}><option>INR</option><option>USD</option><option>EUR</option><option>AED</option></select></div>
              <div className="field"><label>Trip image URL optional</label><input name="trip_image_url" defaultValue={bundle.trip.trip_image_url || ""} /></div>
            </div>
            <button className="button" disabled={savingTrip} type="submit">{savingTrip ? "Saving..." : "Save trip"}</button>
          </form>
        </section>
      ) : null}

      {message ? <p className="badge paid">{message}</p> : null}

      <section className="stats">
        <div className="card stat"><span className="muted">Total expense</span><b>{formatMoney(total, bundle.trip.currency)}</b></div>
        <div className="card stat"><span className="muted">Members</span><b>{bundle.members.length}</b></div>
        <div className="card stat"><span className="muted">Should receive</span><b>{receivers.length}</b></div>
        <div className="card stat"><span className="muted">Need to pay</span><b>{payers.length}</b></div>
      </section>

      <section className="twoCol" style={{ marginTop: 16 }}>
        <div className="grid">
          <div className="card expenseInsightCard">
            <div className="recentExpensesHeader">
              <h2>Expense Graph</h2>
              <Link href={`/trips/${tripId}/expenses/new`}>Add</Link>
            </div>
            {bundle.expenses.length ? (
              <div className="expenseInsight">
                <div className="expenseDonut" style={{ background: `conic-gradient(${graphStops})` }}>
                  <div>
                    <span>Total</span>
                    <b>{formatMoney(total, bundle.trip.currency)}</b>
                  </div>
                </div>
                <div className="expenseLegend">
                  {categoryChart.map((item, index) => (
                    <div className="expenseLegendItem" key={item.category}>
                      <span className={`expenseCategoryImage small ${item.visual.tone}`} aria-hidden="true">{item.visual.icon}</span>
                      <span><strong>{item.category}</strong><small>{Math.round((item.amount / total) * 100)}% of trip spend</small></span>
                      <b>{formatMoney(item.amount, bundle.trip.currency)}</b>
                    </div>
                  ))}
                  {topCategory ? <p className="graphMicrocopy">{topCategory.visual.icon} Most money went to {topCategory.category.toLowerCase()}.</p> : null}
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
