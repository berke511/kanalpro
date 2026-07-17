'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/roles';
import { PageHeader, PrimaryButton } from '@/components/ui/KanalProUI';

export default function MitarbeiterPage() {
  const router = useRouter();
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!member) { setLoading(false); return; }

      const { data } = await supabase
        .from('mitarbeiter')
        .select('*')
        .eq('company_id', member.company_id)
        .order('nachname', { ascending: true });

      setMitarbeiter(data ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  return (
    <div>
      <PageHeader
        title="Mitarbeiter"
        subtitle="Verwalte dein Team"
        action={
          <Link href="/dashboard/mitarbeiter/neu">
            <PrimaryButton className="gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Neuer Mitarbeiter
            </PrimaryButton>
          </Link>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gray-400 text-sm">Lädt…</p>
        </div>
      ) : mitarbeiter.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-gray-300 mb-3">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
          </svg>
          <p className="text-gray-400 text-sm">Noch keine Mitarbeiter angelegt.</p>
          <Link href="/dashboard/mitarbeiter/neu" className="mt-3 text-blue-600 text-sm font-medium hover:underline">
            Ersten Mitarbeiter anlegen
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mitarbeiter.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/mitarbeiter/${m.id}`}
              className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-sm transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                  {(m.vorname?.[0] ?? '?').toUpperCase()}{(m.nachname?.[0] ?? '').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition">
                    {m.vorname} {m.nachname}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{m.position || '—'}</p>
                </div>
              </div>
              {m.rolle && (
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium mb-2 ${ROLE_COLORS[m.rolle]}`}>
                  {ROLE_LABELS[m.rolle]}
                </span>
              )}
              {m.email && (
                <p className="text-xs text-gray-500 truncate">{m.email}</p>
              )}
              {m.telefon && (
                <p className="text-xs text-gray-400 truncate">{m.telefon}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
