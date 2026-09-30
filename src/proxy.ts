import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// ---------------------------------------------------------------------
// Aufbauphase / Wartungsmodus
// ---------------------------------------------------------------------
// Solange MAINTENANCE_MODE aktiv ist, sehen ALLE Besucher (auch bereits
// eingeloggte) nur noch die Hinweisseite unter /wartung - Login,
// Registrierung und das komplette Dashboard sind währenddessen nicht
// erreichbar. Ausgenommen sind lediglich /impressum und /datenschutz
// (Impressumspflicht nach § 5 TMG gilt unabhängig vom Seitenstatus).
//
// Umschalten ohne Code-Änderung: in Vercel unter Project Settings ->
// Environment Variables die Variable MAINTENANCE_MODE auf "false" setzen
// und neu deployen - dann läuft die Seite wieder normal.
//
// Vorschau für's Team während der Aufbauphase: die Seite einmal mit
// ?preview=<TOKEN> aufrufen (Standard-Token unten, per Env-Var
// MAINTENANCE_BYPASS_TOKEN überschreibbar). Das setzt für den eigenen
// Browser ein 30 Tage gültiges Cookie, das die Sperre umgeht.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE !== "false";
const MAINTENANCE_BYPASS_TOKEN = process.env.MAINTENANCE_BYPASS_TOKEN || "kanalpro-vorschau-2026";
const MAINTENANCE_BYPASS_COOKIE = "kp_bypass";
const MAINTENANCE_ALLOWLIST = ["/wartung", "/impressum", "/datenschutz"];

function isMaintenanceExempt(pathname: string) {
  return MAINTENANCE_ALLOWLIST.includes(pathname) || pathname.startsWith("/_next");
}

// Next.js 16 renamed `middleware.ts` to `proxy.ts`. This runs on every
// request to (optionally) gate the site behind the maintenance page, then
// to refresh the Supabase session and guard the dashboard routes.
export async function proxy(request: NextRequest) {
  if (MAINTENANCE_MODE) {
    const { pathname, searchParams } = request.nextUrl;

    if (!isMaintenanceExempt(pathname)) {
      const previewToken = searchParams.get("preview");
      const hasBypassCookie = request.cookies.get(MAINTENANCE_BYPASS_COOKIE)?.value === MAINTENANCE_BYPASS_TOKEN;

      if (previewToken === MAINTENANCE_BYPASS_TOKEN) {
        // Token per Link mitgegeben: Cookie setzen und ohne Query-Param
        // weiterleiten, damit die URL sauber bleibt.
        const url = request.nextUrl.clone();
        url.searchParams.delete("preview");
        const redirectResponse = NextResponse.redirect(url);
        redirectResponse.cookies.set(MAINTENANCE_BYPASS_COOKIE, MAINTENANCE_BYPASS_TOKEN, {
          maxAge: 60 * 60 * 24 * 30,
          httpOnly: true,
          sameSite: "lax",
          secure: true,
        });
        return redirectResponse;
      }

      if (!hasBypassCookie) {
        const url = request.nextUrl.clone();
        url.pathname = "/wartung";
        url.search = "";
        return NextResponse.rewrite(url);
      }
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
