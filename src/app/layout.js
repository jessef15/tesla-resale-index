import { Syne, IBM_Plex_Mono } from "next/font/google";

const syne = Syne({ subsets: ["latin"], variable: "--font-syne", weight: ["400","600","700","800"] });
const mono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400","500"] });

export const metadata = {
  title: "Tesla Resale Index — Live CPO Pricing Tracker",
  description: "Track used Tesla Model 3, Y, S, X, and Cybertruck resale prices in real time. Updated daily from Tesla's certified pre-owned inventory.",
  openGraph: {
    title: "Tesla Resale Index",
    description: "Live used Tesla pricing data. Updated daily.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tesla Resale Index",
    description: "Live used Tesla pricing data. Updated daily.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${syne.variable} ${mono.variable}`}>
      <body style={{ margin: 0, background: "#050D1A" }}>{children}</body>
    </html>
  );
}
