import { redirect } from "next/navigation";

// Die volle Detailseite wurde durch das rechte Detailpanel auf /fahrzeuge
// ersetzt (gleiches Muster wie /mitarbeiter). Alte Links/Lesezeichen auf
// /fahrzeuge/[id] werden auf das Panel umgeleitet, damit nichts ins Leere
// läuft.
export default async function FleetItemDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/fahrzeuge?panel=${id}`);
}
