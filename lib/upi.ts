export function buildUpiLink(input: {
  upiId: string;
  receiverName: string;
  amount: number;
  currency: string;
  note: string;
}) {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.receiverName,
    am: String(input.amount),
    cu: input.currency || "INR",
    tn: input.note
  });
  return `upi://pay?${params.toString()}`;
}
