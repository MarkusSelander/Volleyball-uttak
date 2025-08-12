import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap", // Prevent FOIT (flash of invisible text)
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false, // Don't preload mono font
});

export const metadata: Metadata = {
  title: "Volleyball Uttak - Lagadministrasjon",
  description:
    "Administrer volleyball lag og spillere på en enkel og effektiv måte",
  keywords: ["volleyball", "lag", "spillere", "administrasjon", "uttak"],
  authors: [{ name: "Volleyball Uttak Team" }],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <head>
        {/* Preload critical resources for better LCP */}
        <link
          rel="preload"
          href="/ntnui-logo.png"
          as="image"
          type="image/png"
        />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin=""
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/* DNS prefetch for better performance */}
        <link rel="dns-prefetch" href="//vercel.com" />
        <link rel="dns-prefetch" href="//vitals.vercel-insights.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
