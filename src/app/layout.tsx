import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const sans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const description =
  "Playable status for PlayStation 3, 4, and 5 games across RPCS3, shadPS4, fpPS4, SharpEmu, KytyPS5, and the AnyPS5 porting layer.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "PlayableYet",
    template: "%s · PlayableYet",
  },
  description,
  openGraph: {
    title: "PlayableYet",
    description,
    siteName: "PlayableYet",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "PlayableYet",
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} dark h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div id="content" className="flex-1">
          {children}
        </div>
        <SiteFooter />
      </body>
    </html>
  );
}
