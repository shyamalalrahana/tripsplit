"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AvatarView } from "@/components/AvatarView";
import { LoadingCard } from "@/components/LoadingCard";
import { imageFileToDataUrl } from "@/lib/avatar";
import { calculateBalances, formatMoney } from "@/lib/calculations";
import { supabase } from "@/lib/supabase";
import type { Expense, ExpenseSplit, Trip, TripMember } from "@/lib/types";

const expenseListColumns = "id,trip_id,title,amount,category,paid_by_member_id,expense_date,notes,created_by";

export function MembersPage({ tripId }: { tripId: string }) {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [tripId]);

  async function load() {
    const [tripResult, membersResult, expensesResult, authResult] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).single(),
      supabase.from("trip_members").select("*").eq("trip_id", tripId).order("joined_at"),
      supabase.from("expenses").select(expenseListColumns).eq("trip_id", tripId),
      supabase.auth.getUser()
    ]);
    const { data: profile } = authResult.data.user
      ? await supabase.from("profiles").select("id").eq("user_id", authResult.data.user.id).maybeSingle()
      : { data: null };
    const expensesData = expensesResult.data || [];
    const expenseIds = (expensesData || []).map((expense) => expense.id);
    const { data: splitsData } = expenseIds.length ? await supabase.from("expense_splits").select("*").in("expense_id", expenseIds) : { data: [] };
    setTrip(tripResult.data);
    setMembers(membersResult.data || []);
    setExpenses(expensesData as Expense[]);
    setSplits(splitsData || []);
    setCurrentProfileId(profile?.id || null);
  }

  async function updateMember(event: React.FormEvent<HTMLFormElement>, member: TripMember) {
    event.preventDefault();
    if (!trip || trip.created_by !== currentProfileId) {
      setMessage("Only the trip creator can edit members.");
      return;
    }
    if (savingMemberId) return;
    setMessage("");
    setSavingMemberId(member.id);
    const form = new FormData(event.currentTarget);
    let avatarUrl = member.avatar_url || "";
    try {
      avatarUrl = (await imageFileToDataUrl(form.get("avatar") as File | null)) || avatarUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload profile picture.");
      setSavingMemberId(null);
      return;
    }
    const payload = {
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      avatar_color: String(form.get("avatar_color") || "#2563eb"),
      avatar_url: avatarUrl || null
    };
    const { error } = await supabase.rpc("update_trip_member_profile", {
      member_id_input: member.id,
      profile_input: payload
    });
    if (error) {
      setMessage(error.message);
      setSavingMemberId(null);
      return;
    }
    setMembers((current) => current.map((item) => (item.id === member.id ? { ...item, ...payload } : item)));
    setMessage(`${payload.name} profile updated.`);
    setEditingMemberId(null);
    setSavingMemberId(null);
    load();
  }

  async function deleteMember(member: TripMember) {
    setMessage("");
    if (!trip || trip.created_by !== currentProfileId) {
      setMessage("Only the trip creator can delete members.");
      return;
    }
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
    const { error } = await supabase.rpc("delete_trip_member_as_creator", {
      member_id_input: member.id
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    load();
  }

  if (!trip) return <AppShell tripId={tripId}><LoadingCard label="Loading members" /></AppShell>;
  const balances = calculateBalances(members, expenses, splits);
  const canManageMembers = Boolean(currentProfileId && trip.created_by === currentProfileId);

  return (
    <AppShell tripId={tripId}>
      <section className="sectionHead">
        <div><p className="kicker">Members</p><h1>Trip members</h1><p className="muted">{canManageMembers ? "Edit or remove unused members from this trip." : "View who joined this trip and each person’s balance."}</p></div>
      </section>
      {message ? <p className="badge pending">{message}</p> : null}
      <div className="grid2">
        {members.map((member) => {
          const balance = balances.find((item) => item.member.id === member.id);
          const isEditing = editingMemberId === member.id;
          const balanceStatus = (balance?.balance || 0) > 0 ? "receive" : (balance?.balance || 0) < 0 ? "owe" : "settled";
          return (
            <form className="memberCard grid" onSubmit={(event) => updateMember(event, member)} key={member.id}>
              <div className="memberHero">
                <AvatarView className="memberAvatar" name={member.name} color={member.avatar_color} image={member.avatar_url} />
                <div>
                  <h3>{member.name}</h3>
                  <p className="muted">{member.role === "owner" ? "Trip owner" : member.role === "guest" ? "Joined by invite" : "Trip member"}</p>
                </div>
                <span className={`badge ${balanceStatus}`}>
                  {formatMoney(Math.abs(balance?.balance || 0), trip.currency)}
                </span>
              </div>
              {isEditing ? (
                <>
                  <div className="grid2">
                    <div className="field"><label>Profile picture</label><input accept="image/*" name="avatar" type="file" /></div>
                    <div className="field"><label>Name</label><input name="name" defaultValue={member.name} required /></div>
                    <div className="field"><label>Phone</label><input name="phone" defaultValue={member.phone || ""} /></div>
                    <div className="field"><label>Avatar color</label><input name="avatar_color" defaultValue={member.avatar_color || "#2563eb"} /></div>
                  </div>
                  <div className="cluster">
                    <button className="button" disabled={savingMemberId === member.id} type="submit">{savingMemberId === member.id ? "Saving..." : "Save profile"}</button>
                    <button className="buttonSecondary" onClick={() => setEditingMemberId(null)} type="button">Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="memberMeta">
                    <div><p className="muted">Phone</p><b>{member.phone || "Not added"}</b></div>
                    <div><p className="muted">Paid</p><b>{formatMoney(balance?.paid || 0, trip.currency)}</b></div>
                    <div><p className="muted">Share</p><b>{formatMoney(balance?.share || 0, trip.currency)}</b></div>
                  </div>
                  {canManageMembers ? (
                    <div className="cluster memberActions">
                      <button className="buttonSecondary" onClick={() => setEditingMemberId(member.id)} type="button"><Pencil size={16} /> Edit</button>
                      <button className="buttonDanger" onClick={() => deleteMember(member)} type="button"><Trash2 size={16} /> Delete</button>
                    </div>
                  ) : null}
                </>
              )}
            </form>
          );
        })}
      </div>
    </AppShell>
  );
}
