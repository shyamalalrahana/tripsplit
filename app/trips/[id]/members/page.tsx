import { MembersPage } from "@/components/MembersPage";

export default function Page({ params }: { params: { id: string } }) {
  return <MembersPage tripId={params.id} />;
}
