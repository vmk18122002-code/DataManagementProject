import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { AppStateProvider } from "@/lib/store";
import "./globals.css";

const rubik = Rubik({ variable: "--font-rubik", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReliefHub",
  description: "Donation, allocation and disaster relief coordination for Sri Lanka",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${rubik.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  );
}
