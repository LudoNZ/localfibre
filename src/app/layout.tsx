import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Local Fibre | Community Sewing & Zero-Waste Textiles, Aotearoa",
  description: "Connecting community through sewing, creativity, and zero-waste practice in Aotearoa.",
  keywords: ["sewing", "zero-waste", "sustainability", "textiles", "Aotearoa", "New Zealand", "community", "craft", "mending"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
