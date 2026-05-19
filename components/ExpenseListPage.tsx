"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { LoadingCard } from "@/components/LoadingCard";
import { formatMoney } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Expense, Trip, TripMember } from "@/lib/types";

const expenseListColumns = "id,trip_id,title,amount,category,paid_by_member_id,expense_date,notes,created_by";

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

export function ExpenseListPage({ tripId }: { tripId: string }) {
  const searchParams = useSearchParams();
  const selectedCategory = searchParams.get("category") || "All";
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    const [tripResult, membersResult, expensesResult] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("trip_members").select("id,trip_id,profile_id,name,phone,upi_id,avatar_color,avatar_url,role").eq("trip_id", tripId),
      supabase.from("expenses").select(expenseListColumns).eq("trip_id", tripId).order("expense_date", { ascending: false })
    ]);
    setTrip(tripResult.data);
    setMembers(membersResult.data || []);
    setExpenses((expensesResult.data || []) as Expense[]);
  }

  if (!trip) return <AppShell tripId={tripId}><LoadingCard label="Loading expenses" /></AppShell>;

  const availableCategories = Array.from(new Set(expenses.map((expense) => expense.category))).filter(Boolean);
  const categories = ["All", ...availableCategories];
  const filteredExpenses = selectedCategory === "All" ? expenses : expenses.filter((expense) => expense.category === selectedCategory);
  const filteredTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  return (
    <AppShell tripId={tripId}>
      <section className="sectionHead">
        <div>
          <p className="kicker">Expenses</p>
          <h1>All expenses</h1>
          <p className="muted">Every shared trip cost in one clean list.</p>
        </div>
        <Link className="button" href={`/trips/${tripId}/expenses/new`}><Plus size={16} /> Add Expense</Link>
      </section>

      {/* Filter panel */}
      <div className="expenseFilterPanel">
        <div>
          <p className="muted">{selectedCategory === "All" ? "Showing every category" : `Showing ${selectedCategory} expenses`}</p>
          <b>{formatMoney(filteredTotal, trip.currency)}</b>
        </div>
        <div className="categoryFilterRail" aria-label="Filter expenses by category">
          {categories.map((category) => {
            const visual = category === "All" ? { icon: "✨", tone: "sky" } : categoryImages[category] || categoryImages.Other;
            const isActive = selectedCategory === category;
            const href = category === "All" ? `/trips/${tripId}/expenses` : `/trips/${tripId}/expenses?category=${encodeURIComponent(category)}`;
            return (
              <Link className={`categoryFilterChip ${isActive ? "active" : ""}`} href={href} key={category}>
                <span className={`expenseCategoryImage small ${visual.tone}`} aria-hidden="true">{visual.icon}</span>
                <span>{category}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="recentExpenseRows">
        {filteredExpenses.length ? filteredExpenses.map((expense) => {
          const payer = members.find((member) => member.id === expense.paid_by_member_id);
          const visual = categoryImages[expense.category] || categoryImages.Other;
          return (
            <Link className="recentExpenseRow" href={`/trips/${tripId}/expenses/${expense.id}`} key={expense.id}>
              <span className={`expenseCategoryImage ${visual.tone}`} aria-hidden="true">{visual.icon}</span>
              <span className="recentExpenseCopy">
                <strong>{expense.title}</strong>
                <small>Paid by {payer?.name || "Someone"} · {formatExpenseDate(expense.expense_date)}</small>
              </span>
              <span className="recentExpenseMoney">
                <b>{formatMoney(Number(expense.amount), trip.currency)}</b>
                <small>{expense.category}</small>
              </span>
            </Link>
          );
        }) : (
          <div className="card empty">
            <div>
              <h3>No expenses found</h3>
              <p className="muted">{selectedCategory === "All" ? "Add your first trip expense." : `No ${selectedCategory} expenses yet.`}</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
