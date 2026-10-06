import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import { Sky } from "@/components/art/Sky";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { SHOW_TITLE } from "@/lib/legal";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  title: "DCDS · le jeu des conteneurs",
  description: `Jeu en ligne entre amis inspiré de « ${SHOW_TITLE} ». Choisis ton conteneur, bluffe, échange… et repars avec le meilleur lot.`,
};

export const viewport: Viewport = {
  themeColor: "#2c5fdc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={fredoka.variable}>
      <body className="min-h-dvh antialiased">
        <Sky />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
