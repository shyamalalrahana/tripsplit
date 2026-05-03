import { SettlementsPage } from "@/components/SettlementsPage";

export default function Page({ params }: { params: { id: string } }) {
  return <SettlementsPage tripId={params.id} />;
}
