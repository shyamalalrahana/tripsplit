import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tripsplits.in";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "TripSplits",
  description: "Split trip expenses, invite friends, and settle with UPI QR payments.",
  applicationName: "TripSplits",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TripSplits"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: "/app-icon.svg",
    apple: "/app-icon.svg"
  },
  openGraph: {
    type: "website",
    siteName: "TripSplits",
    title: "TripSplits - Split trip expenses without confusion",
    description: "Create a trip, invite friends, track who paid, and settle with one clear summary.",
    url: appUrl,
    images: [
      {
        url: `${appUrl}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "TripSplits trip money manager"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "TripSplits - Split trip expenses without confusion",
    description: "Create a trip, invite friends, track who paid, and settle with one clear summary.",
    images: [`${appUrl}/opengraph-image`]
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1020"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `
    try {
      const savedTheme = localStorage.getItem("tripsplits-theme");
      document.documentElement.dataset.theme = savedTheme || "dark";
    } catch (error) {
      document.documentElement.dataset.theme = "dark";
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${poppins.className} tripsplit-canvas`}>{children}</body>
    </html>
  );
}
