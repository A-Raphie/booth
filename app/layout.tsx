import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-archivo",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Booth — the director is listening",
  description:
    "Read your voiceover script out loud. A real-time AI director cuts your flubs, calls retakes, and prints the clean master. Built on the AssemblyAI Voice Agent API.",
  metadataBase: new URL("https://booth-delta.vercel.app"),
  openGraph: {
    title: "Booth — the director is listening",
    description:
      "Read your VO script out loud. An AI director cuts your flubs live and prints the clean master.",
    images: ["/og.png"],
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
