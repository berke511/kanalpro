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


export default function AngeboteEmailVersand() {
  const router = useRouter();
  const [tab, setTab]           = useState('angebote');
  const [angebote, setAngebote] = useState([]);
  const [laden, setLaden]       = useState(true);
  const [emailSelectedId,  setEmailSelectedId]  = useState('');
  const [emailEmpfaenger,  setEmailEmpfaenger]  = useState('');
  const [emailBetreff,     setEmailBetreff]     = useState('');
  const [emailNachricht,   setEmailNachricht]   = useState('');

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


  // Auto-fill E-Mail-Felder beim Auswählen eines Angebots
  useEffect(() => {
    const a = angebote.find(x => x.id === emailSelectedId);
    if (!a) {
      setEmailEmpfaenger('');
      setEmailBetreff('');
      setEmailNachricht('');
      return;
    }
    const nr     = a.angebotsnummer ?? '–';
    const netto  = (a.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    const brutto = netto * (1 + (a.steuersatz ?? 19) / 100);
    const betrag = brutto.toFixed(2).replace('.', ',') + ' €';
    setEmailEmpfaenger(a.kunden?.email ?? '');
    setEmailBetreff(`Ihr Angebot Nr. ${nr} von KanalPro`);
    setEmailNachricht(
      `Sehr geehrte Damen und Herren,\n\n` +
      `vielen Dank für Ihr Interesse an unseren Leistungen.\n\n` +
      `anbei erhalten Sie unser Angebot Nr. ${nr} über ${betrag} (brutto inkl. MwSt.).\n\n` +
      `Wir würden uns freuen, Ihnen mit diesem Angebot weiterhelfen zu dürfen. ` +
      `Bei Rückfragen stehen wir Ihnen jederzeit gerne zur Verfügung.\n\n` +
      `Mit freundlichen Grüßen\nIhr KanalPro-Team`
    );
  }, [emailSelectedId, angebote]);

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
        <div className="max-w-xl space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900">Angebot per E-Mail versenden</h2>
                <p className="text-xs text-gray-400 mt-0.5">Wähle ein Angebot aus — Betreff und Text werden automatisch vorausgefüllt.</p>
              </div>
            </div>

            {laden ? (
              <p className="text-gray-400 text-sm">Angebote werden geladen…</p>
            ) : angebote.length === 0 ? (
              <p className="text-sm text-gray-500">Keine Angebote vorhanden. <Link href="/dashboard/angebote/neu" className="text-blue-600 hover:underline">Neues Angebot erstellen →</Link></p>
            ) : (
              <>
                {/* Angebot-Auswahl */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Angebot auswählen</label>
                  <select
                    value={emailSelectedId}
                    onChange={e => setEmailSelectedId(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">— Angebot wählen —</option>
                    {angebote.map(a => (
                      <option key={a.id} value={a.id}>
                        {(a.angebotsnummer ?? '–') + (a.kunden?.name ? ' · ' + a.kunden.name : '') + (a.datum ? ' · ' + new Date(a.datum).toLocaleDateString('de-DE') : '')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Empfänger */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Empfänger-E-Mail
                    {emailSelectedId && !angebote.find(a => a.id === emailSelectedId)?.kunden?.email && (
                      <span className="ml-2 text-xs text-amber-500 font-normal">Keine E-Mail beim Kunden hinterlegt</span>
                    )}
                  </label>
                  <input
                    type="email"
                    value={emailEmpfaenger}
                    onChange={e => setEmailEmpfaenger(e.target.value)}
                    placeholder="kunde@beispiel.de"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Betreff */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Betreff</label>
                  <input
                    type="text"
                    value={emailBetreff}
                    onChange={e => setEmailBetreff(e.target.value)}
                    placeholder="Ihr Angebot Nr. … von KanalPro"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Nachricht */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nachricht</label>
                  <textarea
                    value={emailNachricht}
                    onChange={e => setEmailNachricht(e.target.value)}
                    rows={9}
                    placeholder="E-Mail-Text…"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                {/* Hinweis PDF */}
                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                  </svg>
                  <p className="text-xs text-amber-700">
                    Das Angebot wird <strong>nicht automatisch angehängt</strong>. Exportiere es zuerst unter <strong>PDF-Export</strong> als PDF-Datei und hänge es manuell in deinem E-Mail-Programm an.
                  </p>
                </div>

                {/* Senden-Button */}
                <button
                  onClick={handleMailto}
                  disabled={!emailSelectedId || !emailEmpfaenger.trim()}
                  className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 active:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                  E-Mail-Programm öffnen
                </button>
              </>
            )}
          </div>
        </div>
    </div>
  );
}
