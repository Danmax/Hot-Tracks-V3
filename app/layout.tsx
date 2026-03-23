import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hot Tracks Tournament Tracker",
  description: "Phase 1 MVP shell for Hot Wheels event operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
