import Image from "next/image";
import Link from "next/link";
import { currentBerlinYear } from "@/lib/date";

export const metadata = {
  title: "Wir befinden uns im Aufbau – KanalPro",
  robots: { index: false, follow: false },
};

// Öffentliche Hinweisseite für die Aufbauphase. Wird von src/proxy.ts für
// alle Besucher angezeigt, solange MAINTENANCE_MODE dort aktiv ist - siehe
// Kommentar dort für Details zum Umschalten und zum Vorschau-Zugang.
export default function WartungPage() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="px-6 py-6">
        <Image src="/logo.svg" alt="KanalPro" width={349} height={214} className="h-9 w-auto" priority />
      </header>

      <main className="flex flex-1 items-center justify-center px-6">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3a63ff] via-[#3151e6] to-[#5b3ec9] text-white shadow-lg shadow-brand/25">
            <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden="true">
              <path
                d="M4 21V9l8-5 8 5v12M4 21h16M4 21v-6a2 2 0 0 1 2-2h1m10 8v-6a2 2 0 0 0-2-2h-1m-4-4v4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Wir befinden uns im Aufbau
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-muted">
            KanalPro wird gerade für den Start vorbereitet. In Kürze sind wir
            mit unserer Plattform für die Rohr-, Kanal- und
            Industrieservicebranche wieder für Sie erreichbar.
          </p>

          <p className="mt-6 text-sm text-muted">
            Fragen in der Zwischenzeit?{" "}
            <a href="mailto:info@kanalpro.de" className="font-medium text-brand hover:text-brand-dark">
              info@kanalpro.de
            </a>
          </p>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-2">
        <div className="flex items-center justify-center gap-4">
          <Link href="/impressum" className="hover:text-foreground">
            Impressum
          </Link>
          <Link href="/datenschutz" className="hover:text-foreground">
            Datenschutz
          </Link>
        </div>
        <p className="mt-2">© {currentBerlinYear()} KanalPro</p>
      </footer>
    </div>
  );
}
