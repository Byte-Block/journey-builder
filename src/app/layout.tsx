import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { JotaiProvider } from "@/state/JotaiProvider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Journey Builder",
  description: "Avantos Journey Builder — prefill UI for upstream form fields.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>
        <JotaiProvider>
          <ErrorBoundary>{children}</ErrorBoundary>
        </JotaiProvider>
      </body>
    </html>
  );
}
