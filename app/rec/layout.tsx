import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recording – András Dénes | Trombonist",
  description: "Professional recording sessions for musicians. András Dénes offers high-quality audio recording services for auditions, competitions, and portfolios.",
  openGraph: {
    title: "Recording – András Dénes | Trombonist",
    description: "Professional recording sessions for musicians.",
    url: "https://andrasdenes.com/rec",
    images: [
      {
        url: "/og-rec.jpg",
        width: 1200,
        height: 630,
        alt: "Recording session – musicians in a wood-panelled studio with microphones and camera",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Recording – András Dénes | Trombonist",
    description: "Professional recording sessions for musicians.",
    images: ["/og-rec.jpg"],
  },
};

export default function RecLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
