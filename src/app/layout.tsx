import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Health/Fitness Dashboard",
  description: "Personal Health/Fitness Dashboard",
};

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/activities", label: "Activities" },
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
      </body>
    </html>
  );
}
