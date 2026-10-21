import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/context/AuthContext";
import InstallPrompt from "@/components/ui/InstallPrompt";
import NotificationPrompt from "@/components/ui/NotificationPrompt";
import promptStyles from "@/components/ui/InstallPrompt.module.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Variable font: the SOFT and WONK axes give headings their rounded 70s feel
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.localfibre.co.nz"),
  title: "Local Fibre | Community Sewing, Mending & Machine Repair, West Auckland",
  description:
    "Local Fibre brings West Auckland together to sew, mend and repair, and rehomes donated sewing machines through its Sewing Machine Repair Programme.",
  openGraph: {
    siteName: "Local Fibre",
    locale: "en_NZ",
    type: "website",
  },
  keywords: ["sewing", "zero-waste", "sustainability", "textiles", "Aotearoa", "New Zealand", "community", "craft", "mending", "sewing machine repair", "West Auckland"],
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
    <html lang="en-NZ" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <div className={promptStyles.stack}>
            <NotificationPrompt />
            <InstallPrompt />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
