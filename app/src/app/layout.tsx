// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SimulationProvider } from "@/context/SimulationContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MIPS Pipeline Viewer",
  description: "Interactive visualizer for the 5-stage MIPS pipeline",
  themeColor: "#0f172a",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "MIPS Pipeline Viewer",
    description:
      "Step through MIPS instructions and watch hazards, stalls & forwarding in real time.",
    url: "https://your-domain.dev",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "MIPS Pipeline Viewer screenshot",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white antialiased`}
      >
        <SimulationProvider>
          {/* main wrapper to center content & keep max-width */}
          <main className="flex flex-col min-h-screen">{children}</main>
        </SimulationProvider>

        {/* global toaster (notifications) */}
        <Toaster />
      </body>
    </html>
  );
}
