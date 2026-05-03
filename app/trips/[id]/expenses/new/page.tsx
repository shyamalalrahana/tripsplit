import { AddExpensePage } from "@/components/AddExpensePage";

export default function Page({ params }: { params: { id: string } }) {
  return <AddExpensePage tripId={params.id} />;
}
