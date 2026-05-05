import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TripSplits",
  description: "Split trip expenses, invite friends, and settle with UPI QR payments.",
  applicationName: "TripSplits",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TripSplits"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: "/app-icon.svg",
    apple: "/app-icon.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6c63ff"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `
    try {
      const savedTheme = localStorage.getItem("tripsplits-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.dataset.theme = savedTheme || (prefersDark ? "dark" : "light");
    } catch (error) {
      document.documentElement.dataset.theme = "light";
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={plusJakarta.className}>{children}</body>
    </html>
  );
}
