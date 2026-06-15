import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "@/styles.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--loaded-inter",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--loaded-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LeadCraft AI — Cold Pitches That Book Meetings",
  description: "LeadCraft AI generates hyper-personalised cold email, WhatsApp, and LinkedIn pitches in under 5 seconds. Built for freelancers and agencies.",
  authors: [{ name: "Yesp Studio" }],
  robots: "index, follow",
  openGraph: {
    siteName: "LeadCraft AI",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "LeadCraft AI — AI-powered cold pitch generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@yespstudio",
    images: ["/og-image.png"],
  },
};

const SOFTWARE_APP_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LeadCraft AI",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "AI-powered cold pitch generator for freelancers and agencies. Generate personalised email, WhatsApp, and LinkedIn pitches in under 5 seconds.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  author: {
    "@type": "Organization",
    name: "Yesp Studio",
    email: "hello@yespstudio.com",
    url: "https://yespstudio.com",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APP_JSON_LD) }}
        />
      </head>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
