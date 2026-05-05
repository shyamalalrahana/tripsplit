import type { Metadata } from "next";
import { JoinTripPage } from "@/components/JoinTripPage";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tripsplits.in";

export function generateMetadata(): Metadata {
  return {
    title: "Join a TripSplits Trip",
    description: "Join this TripSplits group to add expenses, view balances, and settle payments.",
    openGraph: {
      title: "Join a TripSplits Trip",
      description: "Join this trip group, track shared expenses, and settle easily.",
      images: [`${appUrl}/opengraph-image`]
    },
    twitter: {
      card: "summary_large_image",
      title: "Join a TripSplits Trip",
      description: "Join this trip group, track shared expenses, and settle easily.",
      images: [`${appUrl}/opengraph-image`]
    }
  };
}

export default function Page({ params }: { params: { inviteCode: string } }) {
  return <JoinTripPage inviteCode={params.inviteCode} />;
}
