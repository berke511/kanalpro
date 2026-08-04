import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions sind standardmäßig auf 1 MB Request-Body begrenzt (siehe
  // Vercel-Fehlerprotokoll "Body exceeded 1 MB limit" auf /kunden/[id]).
  // Kunden- und Auftragsdokumente/-fotos (z. B. direkt vom Smartphone) sind
  // damit faktisch unbenutzbar, da schon ein einzelnes Foto oft mehrere MB
  // groß ist. Auf 10 MB angehoben, damit Dokument-/Foto-Uploads im
  // Kundenprofil sowie im Auftrags-Assistenten (Schritt "Dokumente")
  // realistisch funktionieren.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
