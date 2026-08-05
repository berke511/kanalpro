import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateProfile } from "@/lib/supabase/profile";
import { hasFullAccess } from "@/lib/roles";
import { syncExpiryReminders, syncFleetReminders } from "@/lib/notifications";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import type { NotificationItem } from "@/components/dashboard/NotificationBell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOrCreateProfile(supabase, user);

  if (!profile) {
    redirect("/login?error=Profil+konnte+nicht+geladen+werden");
  }

  // Ablauf-Erinnerungen für Qualifikationen/Dokumente: KanalPro hat keinen
  // eigenen Cron-Job, daher übernimmt der nächste Seitenaufruf einer
  // Owner/Admin/Geschäftsführer-Rolle das Nachziehen (siehe
  // src/lib/notifications.ts) – läuft bei jeder Navigation mit, ist aber
  // dank reminder_sent_at in der Regel ein No-Op.
  if (hasFullAccess(profile.role)) {
    await syncExpiryReminders(supabase, profile.company_id);
    await syncFleetReminders(supabase, profile.company_id);
  }

  const { data: notificationRows } = await supabase
    .from("notifications")
    .select("id, title, body, link, created_at")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const notifications: NotificationItem[] = (notificationRows ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    link: n.link,
    createdAt: n.created_at,
  }));

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Topbar
          companyName={profile.companies?.name ?? "KanalPro"}
          userName={profile.full_name}
          notifications={notifications}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
