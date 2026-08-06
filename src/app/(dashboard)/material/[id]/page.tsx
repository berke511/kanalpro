import { redirect } from "next/navigation";

// Die frühere eigenständige Detailseite wurde durch das rechte Detailpanel
// auf /material (Panel-URL-Parameter-Muster, siehe page.tsx) ersetzt –
// analog zu /fahrzeuge/[id]. Alte Links/Lesezeichen leiten weiter.
export default async function MaterialDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/material?panel=${id}`);
}
