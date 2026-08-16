import type { Metadata } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import "./globals.css";
import "./feedback.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { FeedbackProvider } from "@/modules/platform/feedback/FeedbackProvider";

const TABLER_ICONS =
  "https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ESGSaathi Portal",
    template: "%s | ESGSaathi Portal",
  },
  description:
    "ESG assessment, BRSR reporting, and AI-powered sustainability insights designed for Indian businesses. Join the waitlist.",
  metadataBase: new URL("https://esgsaathi.in"),
  openGraph: {
    siteName: "ESGSaathi",
    type: "website",
    locale: "en_IN",
    url: "https://esgsaathi.in",
    title: "ESGSaathi",
    description:
      "ESG assessment, BRSR reporting, and AI-powered sustainability insights designed for Indian businesses.",
    images: [{ url: "/logoC.png", width: 1200, height: 630, alt: "ESGSaathi" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ESGSaathi",
    description:
      "ESG assessment, BRSR reporting, and AI-powered sustainability insights designed for Indian businesses.",
    images: ["/logoC.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <link rel="stylesheet" href={TABLER_ICONS} />
        <Script
          id="cookieyes"
          src="https://cdn-cookieyes.com/client_data/72ed1f4eed4004859612d49a48f1dc7a/script.js"
          strategy="beforeInteractive"
        />

        <Script id="google-consent-defaults" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              ad_storage:              'denied',
              analytics_storage:       'denied',
              functionality_storage:   'denied',
              personalization_storage: 'denied',
              security_storage:        'granted',
              wait_for_update:         500
            });
          `}
        </Script>

        <ThemeProvider>
          <FeedbackProvider>{children}</FeedbackProvider>
        </ThemeProvider>

        <ScrollToTopButton />

        {/* Google Analytics */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}