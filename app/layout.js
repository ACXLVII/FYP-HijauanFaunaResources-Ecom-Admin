import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata = {
  title: "Admin Hijauan Fauna",
  description: "For admin only.",
  icons: {
    icon: '/HFRlogo.png',
    shortcut: '/HFRlogo.png',
    apple: '/HFRlogo.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full bg-white">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}>
        {children}
      </body>
    </html>
  );
}