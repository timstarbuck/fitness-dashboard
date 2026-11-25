import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "../components/shared/footer";
import "./globals.css";

const SITE_URL = "https://fitness.starguyonline.com";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Health & Fitness Dashboard",
    template: "%s | Health & Fitness",
  },
  description:
    "Tim Starbuck's personal health and fitness dashboard — training, recovery, sleep, and wellness trends synced from Garmin Connect.",
  openGraph: {
    title: "Health & Fitness Dashboard",
    description:
      "Tim Starbuck's personal health and fitness dashboard — training, recovery, sleep, and wellness trends synced from Garmin Connect.",
    url: "/",
    siteName: "Health & Fitness Dashboard",
    type: "website",
  },
  twitter: {
    card: "summary",
  },
  robots: {
    // Personal health data — keep the dashboard out of search indexes.
    index: false,
  },
};

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activities", label: "Activities" },
  { href: "/recovery", label: "Recovery" },
  { href: "/analytics", label: "Analytics" },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b bg-card">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-8 px-6 py-4">
            <Link href="/dashboard" className="text-lg font-bold tracking-tight text-forest">
              Health and Fitness
            </Link>
            <nav className="flex gap-4 text-sm">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
