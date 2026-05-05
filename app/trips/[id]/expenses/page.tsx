import { ExpenseListPage } from "@/components/ExpenseListPage";

export default function Page({ params }: { params: { id: string } }) {
  return <ExpenseListPage tripId={params.id} />;
}
