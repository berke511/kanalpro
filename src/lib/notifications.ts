import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Stößt public.sync_expiry_reminders() an (SECURITY DEFINER, siehe
 * supabase/migrations/0020_mitarbeiterverwaltung.sql): erzeugt
 * Benachrichtigungen für Qualifikationen/Dokumente, die in den nächsten
 * 30 Tagen ablaufen und noch keine Erinnerung erhalten haben.
 *
 * KanalPro hat (noch) keinen echten Cron-Job – statt eines separaten
 * Hintergrundprozesses übernimmt der nächste Seitenaufruf einer
 * Owner/Admin/Geschäftsführer-Rolle diese Aufgabe opportunistisch. Da die
 * SQL-Funktion pro Datensatz `reminder_sent_at` setzt, ist ein Aufruf bei
 * jedem Seitenaufruf günstig (meist 0 neue Treffer) und idempotent.
 * Fehler werden bewusst verschluckt, damit ein Problem beim
 * Erinnerungs-Sync niemals den eigentlichen Seitenaufruf blockiert.
 */
export async function syncExpiryReminders(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<void> {
  try {
    await supabase.rpc("sync_expiry_reminders", { p_company_id: companyId });
  } catch {
    // Erinnerungen sind ein Komfortfeature – ein Fehlschlag hier darf nie
    // die eigentliche Seite zum Absturz bringen.
  }
}

/**
 * Stößt public.sync_fleet_reminders() an (SECURITY DEFINER, siehe
 * supabase/migrations/0022_fahrzeugverwaltung.sql): erzeugt
 * Benachrichtigungen für Fahrzeuge/Maschinen, bei denen TÜV, UVV, Wartung,
 * Versicherung, Leasing-Ende oder ein Dokument in den nächsten 30 Tagen
 * fällig werden. Gleiches Opportunistisch-bei-jedem-Seitenaufruf-Muster wie
 * syncExpiryReminders() oben.
 */
export async function syncFleetReminders(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<void> {
  try {
    await supabase.rpc("sync_fleet_reminders", { p_company_id: companyId });
  } catch {
    // Erinnerungen sind ein Komfortfeature – ein Fehlschlag hier darf nie
    // die eigentliche Seite zum Absturz bringen.
  }
}

/**
 * Stößt public.sync_low_stock_reminders() an (SECURITY DEFINER, siehe
 * supabase/migrations/0023_materialverwaltung.sql): erzeugt
 * Benachrichtigungen für Materialien, deren Bestand den Mindestbestand
 * erreicht oder unterschritten hat und die noch keine Erinnerung erhalten
 * haben. Gleiches Opportunistisch-bei-jedem-Seitenaufruf-Muster wie
 * syncExpiryReminders()/syncFleetReminders() oben.
 */
export async function syncLowStockReminders(
  supabase: SupabaseClient<Database>,
  companyId: string,
): Promise<void> {
  try {
    await supabase.rpc("sync_low_stock_reminders", { p_company_id: companyId });
  } catch {
    // Erinnerungen sind ein Komfortfeature – ein Fehlschlag hier darf nie
    // die eigentliche Seite zum Absturz bringen.
  }
}
