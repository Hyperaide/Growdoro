import type { Metadata } from "next";
import { Geist, Geist_Mono, Gowun_Batang, Tiny5, Barlow, Varela_Round } from "next/font/google";
import "./globals.css";
import AuthContextProvider from "./contexts/auth-context";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-sky-100">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${gowunBatang.variable} ${tiny5.variable} ${barlow.variable} ${varelaRound.variable} antialiased`}
      >
        <AuthContextProvider>
          {children}
        </AuthContextProvider>

        <div className="flex flex-col absolute bottom-4 left-4 pointer-events-none">
          <h1 className="text-lg md:text-2xl font-bold font-barlow uppercase text-black/20">Growdoro</h1>
          <p className="text-[10px] md:text-xs text-black/40">An infinite garden productivity app. Built by <a href="https://www.x.com/dqnamo/" className="text-black/50 pointer-events-auto">JP</a></p>
        </div>
      </body>
    </html>
  );
}
