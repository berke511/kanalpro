'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

export default function Vorlagen() {
  const router = useRouter();
  const [vorlagen, setVorlagen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [companyId, setCompanyId] = useState(null);
  const [userId, setUserId] = useState(null);
  const [erstellenId, setErstellenId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: member } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!member) { setLaden(false); return; }
      setCompanyId(member.company_id);
      const { data } = await supabase
        .from('angebot_vorlagen')
        .select('*')
        .eq('company_id', member.company_id)
        .order('erstellt_am', { ascending: false });
      setVorlagen(data ?? []);
      setLaden(false);
    }
    load().catch(() => setLaden(false));
  }, []);

  async function angebotErstellen(v) {
    if (!companyId || !userId) return;
    setErstellenId(v.id);
    const { count } = await supabase
      .from('angebote')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId);
    const nr = `AN-${new Date().getFullYear()}-${String((count ?? 0) + 1).padStart(3, '0')}`;
    const { error } = await supabase.from('angebote').insert({
      user_id: userId,
      company_id: companyId,
      angebotsnummer: nr,
      datum: new Date().toISOString().split('T')[0],
      steuersatz: v.steuersatz,
      positionen: v.positionen,
      status: 'entwurf',
      notizen: v.notizen || null,
    });
    setErstellenId(null);
    if (!error) router.push('/dashboard/angebote');
  }

  async function loeschen(id) {
    if (!confirm('Vorlage wirklich löschen?')) return;
    await supabase.from('angebot_vorlagen').delete().eq('id', id);
    setVorlagen(vs => vs.filter(x => x.id !== id));
  }

  const netto = (v) =>
    (v.positionen ?? []).reduce((s, p) => s + (p.menge ?? 0) * (p.preis ?? 0), 0);
  const fmt = (val) => val.toFixed(2).replace('.', ',') + ' €';

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Link
            href="/dashboard/angebote"
            className="px-4 py-1.5 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 transition"
          >
            Angebote
          </Link>
          <span className="px-4 py-1.5 rounded-md text-sm font-medium bg-white text-gray-900 shadow-sm cursor-default">
            Vorlagen
          </span>
        </div>
        <Link
          href="/dashboard/angebote/neu"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm"
        >
          + Neues Angebot
        </Link>
      </div>

      {laden ? (
        <p className="text-gray-400 text-sm">Wird geladen…</p>
      ) : vorlagen.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">Noch keine Vorlagen</p>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Speichere ein Angebot als Vorlage über den Button<br />
            &quot;Als Vorlage speichern&quot; beim Erstellen eines Angebots.
          </p>
          <Link
            href="/dashboard/angebote/neu"
            className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Angebot erstellen
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {vorlagen.map(v => {
            const n = netto(v);
            const brutto = n * (1 + (v.steuersatz ?? 19) / 100);
            const posCount = (v.positionen ?? []).length;
            return (
              <div
                key={v.id}
                className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{v.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {posCount} Position{posCount !== 1 ? 'en' : ''} · MwSt. {v.steuersatz} % · Gesamt {fmt(brutto)}
                  </p>
                  {v.notizen && (
                    <p className="text-xs text-gray-400 mt-1 truncate italic">{v.notizen}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => angebotErstellen(v)}
                    disabled={erstellenId === v.id}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {erstellenId === v.id ? 'Wird erstellt…' : 'Angebot erstellen'}
                  </button>
                  <button
                    onClick={() => loeschen(v.id)}
                    className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg hover:bg-red-50 hover:text-red-600 transition"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
