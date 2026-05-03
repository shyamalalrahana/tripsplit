import { BalancesPage } from "@/components/BalancesPage";

export default function Page({ params }: { params: { id: string } }) {
  return <BalancesPage tripId={params.id} />;
}
