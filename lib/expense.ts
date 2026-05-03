import type { TripMember } from "./types";
import { roundMoney } from "./calculations";

export type SplitInput = {
  member_id: string;
  split_amount: number;
  split_percentage: number | null;
  split_type: "equal" | "custom" | "percentage";
};

export function buildExpenseSplits(input: {
  amount: number;
  splitType: "equal" | "custom" | "percentage";
  selectedMemberIds: string[];
  customValues: Record<string, number>;
  members: TripMember[];
}): SplitInput[] {
  const selected = input.selectedMemberIds.filter((id) => input.members.some((member) => member.id === id));
  if (!selected.length) return [];

  if (input.splitType === "custom") {
    return selected.map((memberId) => ({
      member_id: memberId,
      split_amount: roundMoney(Number(input.customValues[memberId] || 0)),
      split_percentage: null,
      split_type: "custom"
    }));
  }

  if (input.splitType === "percentage") {
    return selected.map((memberId) => {
      const percentage = Number(input.customValues[memberId] || 0);
      return {
        member_id: memberId,
        split_amount: roundMoney((input.amount * percentage) / 100),
        split_percentage: percentage,
        split_type: "percentage"
      };
    });
  }

  const share = roundMoney(input.amount / selected.length);
  const splits = selected.map((memberId) => ({
    member_id: memberId,
    split_amount: share,
    split_percentage: null,
    split_type: "equal" as const
  }));
  const drift = roundMoney(input.amount - splits.reduce((sum, split) => sum + split.split_amount, 0));
  if (splits[0]) splits[0].split_amount = roundMoney(splits[0].split_amount + drift);
  return splits;
}

export function validateSplits(amount: number, splitType: "equal" | "custom" | "percentage", splits: SplitInput[]) {
  if (!splits.length) return "Select at least one member to split with.";
  if (splitType === "custom") {
    const total = roundMoney(splits.reduce((sum, split) => sum + split.split_amount, 0));
    if (Math.abs(total - amount) > 0.01) return "Custom split amounts must add up to the expense amount.";
  }
  if (splitType === "percentage") {
    const total = roundMoney(splits.reduce((sum, split) => sum + Number(split.split_percentage || 0), 0));
    if (Math.abs(total - 100) > 0.01) return "Percentage split must add up to 100%.";
  }
  return "";
}
