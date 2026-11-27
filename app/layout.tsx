import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import ProximityEffects from "@/components/proximity-effects";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://andrasdenes.com"),
  title: "András Dénes | Trombonist",
  description: "András Dénes – Hungarian trombonist based in Budapest. Principal trombone of Alba Regia Symphony Orchestra, member of Óbudai Danubia Orchestra. Bookings and inquiries welcome.",
  icons: {
    icon: [
      { url: "/favicon-circle.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon-circle.svg",
    apple: "/favicon-circle.svg",
  },
  openGraph: {
    title: "András Dénes | Trombonist",
    description: "Hungarian trombonist based in Budapest. Principal trombone of Alba Regia Symphony Orchestra, member of Óbudai Danubia Orchestra.",
    url: "https://andrasdenes.com",
    siteName: "András Dénes",
    images: [
      {
        url: "/og-rec.jpg",
        width: 1200,
        height: 630,
        alt: "Recording session – András Dénes, trombonist and recording engineer",
      },
    ],
    locale: "hu_HU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "András Dénes | Trombonist",
    description: "Hungarian trombonist based in Budapest. Principal trombone of Alba Regia Symphony Orchestra.",
    images: ["/og-rec.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hu" className="dark">
      <head>
        {/* Prefetch all pages for instant navigation */}
        <link rel="prefetch" href="/" />
        <link rel="prefetch" href="/cv" />
        <link rel="prefetch" href="/media" />
        <link rel="prefetch" href="/contact" />
        <link rel="prefetch" href="/art" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "András Dénes",
              "alternateName": "Dénes András",
              "jobTitle": "Trombonist",
              "url": "https://andrasdenes.com",
              "image": "https://andrasdenes.com/profile.jpeg",
              "email": "contact@andrasdenes.com",
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Budapest",
                "addressCountry": "HU",
              },
              "alumniOf": {
                "@type": "CollegeOrUniversity",
                "name": "Franz Liszt Academy of Music",
                "url": "https://lfze.hu",
              },
              "memberOf": [
                {
                  "@type": "PerformingGroup",
                  "name": "Alba Regia Symphony Orchestra",
                  "url": "https://www.arso.hu",
                },
                {
                  "@type": "PerformingGroup",
                  "name": "Óbudai Danubia Orchestra",
                  "url": "https://utazenehez.hu",
                },
              ],
              "sameAs": [
                "https://instagram.com/andras.trombone",
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <ProximityEffects />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
