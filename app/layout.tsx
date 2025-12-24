import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Gowun_Batang,
  Tiny5,
  Barlow,
  Varela_Round,
} from "next/font/google";
import "./globals.css";
import AuthContextProvider from "./contexts/auth-context";
import { ThemeContextProvider } from "./contexts/theme-context";
import NightModeOverlay from "./components/NightModeOverlay";
import WebAnalytics from "./components/WebAnalytics";
import { headers } from "next/headers";

const varelaRound = Varela_Round({
  variable: "--font-varela-round",
  subsets: ["latin"],
  weight: ["400"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gowunBatang = Gowun_Batang({
  variable: "--font-gowun-batang",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const tiny5 = Tiny5({
  variable: "--font-tiny5",
  subsets: ["latin"],
  weight: ["400"],
});

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Growdoro",
  description: "Gamified pomodoro timer.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();

  const geo = {
    country: headersList.get("x-vercel-ip-country") || undefined,
    city: headersList.get("x-vercel-ip-city") || undefined,
    region: headersList.get("x-vercel-ip-country-region") || undefined,
    postalCode: headersList.get("x-vercel-ip-postal-code") || undefined,
    latitude: headersList.get("x-vercel-ip-latitude") || undefined,
    longitude: headersList.get("x-vercel-ip-longitude") || undefined,
  };

  return (
    <html
      lang="en"
      className="bg-sky-100 dark:bg-slate-950 transition-colors duration-500"
    >
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${gowunBatang.variable} ${tiny5.variable} ${barlow.variable} ${varelaRound.variable} antialiased font-sans transition-colors duration-500`}
      >
        <ThemeContextProvider>
          <AuthContextProvider>{children}</AuthContextProvider>
          <NightModeOverlay />
        </ThemeContextProvider>
        <WebAnalytics
          country={geo.country}
          city={geo.city}
          region={geo.region}
          postal_code={geo.postalCode}
          latitude={geo.latitude}
          longitude={geo.longitude}
        />
      </body>
    </html>
  );
}
