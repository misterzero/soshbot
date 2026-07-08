import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "soshbot",
  description: "Event booking and social media automation for small venues",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <span className="logo">⚓ soshbot</span>
          <nav className="site-nav">
            <Link href="/">Dashboard</Link>
            <Link href="/entertainers">Entertainers</Link>
            <Link href="/review">Review</Link>
            <Link href="/sources">Feeds</Link>
          </nav>
          <span className="venue-name">The Rusty Anchor Taproom</span>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
