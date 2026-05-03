import type { Expense, ExpenseSplit, Settlement, TripMember } from "./types";

export type MemberBalance = {
  member: TripMember;
  paid: number;
  share: number;
  balance: number;
};

export type SettlementDraft = {
  from_member_id: string;
  to_member_id: string;
  amount: number;
  payment_note: string;
};

export function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function formatMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2
  }).format(Number(amount || 0));
}

export function calculateBalances(members: TripMember[], expenses: Expense[], splits: ExpenseSplit[]): MemberBalance[] {
  const balances = new Map<string, MemberBalance>();
  members.forEach((member) => {
    balances.set(member.id, { member, paid: 0, share: 0, balance: 0 });
  });

  expenses.forEach((expense) => {
    const payer = balances.get(expense.paid_by_member_id);
    if (payer) payer.paid += Number(expense.amount || 0);
  });

  splits.forEach((split) => {
    const member = balances.get(split.member_id);
    if (member) member.share += Number(split.split_amount || 0);
  });

  return [...balances.values()].map((item) => ({
    ...item,
    paid: roundMoney(item.paid),
    share: roundMoney(item.share),
    balance: roundMoney(item.paid - item.share)
  }));
}

export function calculateSettlementDrafts(
  balances: MemberBalance[],
  tripName: string
): SettlementDraft[] {
  const debtors = balances
    .filter((item) => item.balance < -0.01)
    .map((item) => ({ id: item.member.id, amount: roundMoney(Math.abs(item.balance)) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = balances
    .filter((item) => item.balance > 0.01)
    .map((item) => ({ id: item.member.id, amount: roundMoney(item.balance) }))
    .sort((a, b) => b.amount - a.amount);

  const result: SettlementDraft[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = roundMoney(Math.min(debtors[i].amount, creditors[j].amount));
    if (amount > 0.01) {
      result.push({
        from_member_id: debtors[i].id,
        to_member_id: creditors[j].id,
        amount,
        payment_note: `TripSplit payment - ${tripName}`
      });
    }
    debtors[i].amount = roundMoney(debtors[i].amount - amount);
    creditors[j].amount = roundMoney(creditors[j].amount - amount);
    if (debtors[i].amount <= 0.01) i += 1;
    if (creditors[j].amount <= 0.01) j += 1;
  }
  return result;
}

export function mergeSettlementStatus(drafts: SettlementDraft[], existing: Settlement[]) {
  return drafts.map((draft) => {
    const saved = existing.find(
      (item) =>
        item.from_member_id === draft.from_member_id &&
        item.to_member_id === draft.to_member_id &&
        roundMoney(Number(item.amount)) === draft.amount
    );
    return {
      ...draft,
      id: saved?.id,
      status: saved?.status || "pending",
      paid_at: saved?.paid_at || null,
      confirmed_at: saved?.confirmed_at || null
    };
  });
}
