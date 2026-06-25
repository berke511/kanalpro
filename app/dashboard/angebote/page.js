'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';

const statusConfig = {
  entwurf:    { label: 'Entwurf',    cls: 'bg-gray-100 text-gray-600'   },
  gesendet:   { label: 'Gesendet',   cls: 'bg-blue-50 text-blue-700'    },
  angenommen: { label: 'Angenommen', cls: 'bg-green-50 text-green-700'  },
  abgelehnt:  { label: 'Abgelehnt',  cls: 'bg-red-50 text-red-600'      },
};

function fmt(n) { return n.toFixed(2).replace('.', ',') + ' €'; }

export default function Angebote() {
  const router = useRouter();
  const [angebote, setAngebote] = useState([]);
  const [laden, setLaden]       = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('angebote')
        .select('*, kunden(name, adresse, email)')
        .order('erstellt_am', { ascending: false });
      setAngebote(data ?? []);
      setLaden(false);
      // Logo laden
      const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (member) {
        const { data: co } = await supabase.from('companies').select('logo_url').eq('id', member.company_id).single();
        setLogoUrl(co?.logo_url ?? null);
      }
    }
    load().catch(() => setLaden(false));
  }, []);

  function calcBrutto(a) {
    const netto = (a.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + (a.steuersatz ?? 19) / 100);
  }

  return (
    <div>

      {/* ── Angebote-Tab ── */}
      (
        laden ? (
          <p className="text-gray-400 text-sm">Wird geladen…</p>
        ) : angebote.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-7 h-7 text-gray-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">Noch keine Angebote</p>
            <p className="text-xs text-gray-400 mt-1">Erstelle dein erstes Angebot.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Nummer</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Betrag (brutto)</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {angebote.map(a => {
                  const cfg = statusConfig[a.status] ?? statusConfig.entwurf;
                  return (
                    <tr
                      key={a.id}
                      onClick={() => router.push(`/dashboard/angebote/${a.id}`)}
                      className="hover:bg-gray-50 transition cursor-pointer"
                    >
                      <td className="px-5 py-3 font-mono font-medium text-gray-900">{a.angebotsnummer ?? '–'}</td>
                      <td className="px-5 py-3 text-gray-500">{a.kunden?.name ?? '–'}</td>
                      <td className="px-5 py-3 text-gray-500">{a.datum ? new Date(a.datum).toLocaleDateString('de-DE') : '–'}</td>
                      <td className="px-5 py-3 font-medium text-gray-900">{fmt(calcBrutto(a))}</td>
                      <td className="px-5 py-3"><span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>{cfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
          )

    </div>
  );
}
