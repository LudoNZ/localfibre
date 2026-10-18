import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import InstallPrompt from "@/components/ui/InstallPrompt";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Local Fibre | Community Sewing & Zero-Waste Textiles, Aotearoa",
  description: "Connecting community through sewing, creativity, and zero-waste practice in Aotearoa.",
  keywords: ["sewing", "zero-waste", "sustainability", "textiles", "Aotearoa", "New Zealand", "community", "craft", "mending"],
  applicationName: "Local Fibre",
  appleWebApp: {
    capable: true,
    title: "Local Fibre",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#7f340b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.variable}>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <InstallPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}
