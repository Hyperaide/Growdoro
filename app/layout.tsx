import type { Metadata } from "next";
import { Geist, Geist_Mono, Gowun_Batang, Tiny5, Barlow } from "next/font/google";
import "./globals.css";

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
  weight: ["400", "700"],
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${gowunBatang.variable} ${tiny5.variable} ${barlow.variable} antialiased`}
      >
        {children}

        <div className="flex flex-col absolute bottom-4 left-4">
          <h1 className="text-2xl font-bold font-barlow uppercase text-black/20">Growdoro</h1>
          <p className="text-xs text-black/40">An infinite garden productivity app. Built by <a href="https://www.x.com/dqnamo/" className="text-black/50">JP</a></p>
        </div>
      </body>
    </html>
  );
}
