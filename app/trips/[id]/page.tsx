import type { Metadata } from "next";
import { TripDashboardPage } from "@/components/TripDashboardPage";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tripsplits.in";

export function generateMetadata(): Metadata {
  return {
    title: "TripSplits Trip Link",
    description: "Open this TripSplits group to view expenses, balances, settlements, and UPI QR payments.",
    openGraph: {
      title: "TripSplits Trip Link",
      description: "Open this trip group, add expenses, and settle with friends.",
      images: [`${appUrl}/opengraph-image`]
    },
    twitter: {
      card: "summary_large_image",
      title: "TripSplits Trip Link",
      description: "Open this trip group, add expenses, and settle with friends.",
      images: [`${appUrl}/opengraph-image`]
    }
  };
}

export default function Page({ params }: { params: { id: string } }) {
  return <TripDashboardPage tripId={params.id} />;
}
