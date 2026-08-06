import { redirect } from "next/navigation";

export default async function BerichtDetailRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/berichte?panel=${id}`);
}
