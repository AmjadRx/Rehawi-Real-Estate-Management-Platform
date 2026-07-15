import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Rehawi Estates",
    template: "%s · Rehawi Estates",
  },
  description: "Private family real-estate portfolio management.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "Rehawi Estates",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={locale.startsWith("ar") ? "rtl" : "ltr"}
      suppressHydrationWarning
    >
      <head>
        {/* Dark mode before first paint. A stored choice (theme toggle)
            wins; otherwise the OS setting applies and is followed live. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=window.matchMedia("(prefers-color-scheme: dark)");var apply=function(){var t=null;try{t=localStorage.getItem("theme")}catch(e){}document.documentElement.classList.toggle("dark",t?t==="dark":m.matches)};apply();m.addEventListener("change",apply);window.addEventListener("storage",apply)}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
