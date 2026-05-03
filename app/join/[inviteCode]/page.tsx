import { JoinTripPage } from "@/components/JoinTripPage";

export default function Page({ params }: { params: { inviteCode: string } }) {
  return <JoinTripPage inviteCode={params.inviteCode} />;
}
