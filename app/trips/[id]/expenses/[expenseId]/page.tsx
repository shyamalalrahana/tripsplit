import { ExpenseDetailsPage } from "@/components/ExpenseDetailsPage";

export default function Page({ params }: { params: { id: string; expenseId: string } }) {
  return <ExpenseDetailsPage tripId={params.id} expenseId={params.expenseId} />;
}
