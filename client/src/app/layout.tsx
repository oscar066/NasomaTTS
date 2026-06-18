import type { Metadata } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./components/sessionProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | Me Nasoma",
    default: "Me Nasoma — Turn Any Document Into Audio",
  },
  description:
    "AI-powered text-to-speech that transforms any PDF or document into natural, lifelike audio. Upload once, listen anywhere — commute, exercise, or relax.",
  keywords: [
    "text to speech",
    "PDF reader",
    "audio documents",
    "TTS",
    "document audio",
    "listen to PDF",
    "AI audio",
    "accessibility",
    "Me Nasoma",
  ],
  authors: [{ name: "Me Nasoma" }],
  creator: "Me Nasoma",
  publisher: "Me Nasoma",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "Me Nasoma — Turn Any Document Into Audio",
    description:
      "Upload any PDF or document and listen to it in natural, lifelike audio. Perfect for commuters, students, and anyone on the go.",
    url: "https://me-nasoma.com",
    siteName: "Me Nasoma",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "https://me-nasoma.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "Me Nasoma — Turn Any Document Into Audio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Me Nasoma — Turn Any Document Into Audio",
    description: "Transform your documents into natural audio. Listen anywhere, anytime.",
    creator: "@menasoma",
    images: ["https://me-nasoma.com/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192.png",   sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png",   sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: "/favicon-32.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
