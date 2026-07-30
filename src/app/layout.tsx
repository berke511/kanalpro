import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KanalPro – Software für Rohr-, Kanal- und Industrieservice",
  description:
    "KanalPro digitalisiert Kundenverwaltung, Auftragsmanagement, Einsatzplanung und Abrechnung für Unternehmen der Rohr-, Kanal- und Industrieservicebranche.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
