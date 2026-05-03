import { PaymentPage } from "@/components/PaymentPage";

export default function Page({ params }: { params: { id: string; settlementId: string } }) {
  return <PaymentPage tripId={params.id} settlementId={params.settlementId} />;
}
