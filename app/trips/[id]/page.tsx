import { TripDashboardPage } from "@/components/TripDashboardPage";

export default function Page({ params }: { params: { id: string } }) {
  return <TripDashboardPage tripId={params.id} />;
}
