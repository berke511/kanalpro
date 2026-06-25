'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PlanGate from '@/components/PlanGate';

const statusConfig = {
  entwurf:  { label: 'Entwurf',  cls: 'bg-gray-100 text-gray-600'   },
  gesendet: { label: 'Gesendet', cls: 'bg-blue-50 text-blue-700'    },
  bezahlt:  { label: 'Bezahlt',  cls: 'bg-green-50 text-green-700'  },
  mahnung:  { label: 'Mahnung',  cls: 'bg-orange-50 text-orange-600'},
};

function brutto(r) {
  const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
  return netto * (1 + r.steuersatz / 100);
}

function getMahnLabel(stufe) {
  if (stufe === 0) return 'Zahlungserinnerung';
  if (stufe === 1) return '1. Mahnung';
  if (stufe === 2) return '2. Mahnung';
  return null; // 3 = alle Stufen ausgeschöpft
}

function buildBriefText(r, firma, stufe) {
  const betrag    = brutto(r).toFixed(2).replace('.', ',');
  const faelligStr = r.faellig_am ? new Date(r.faellig_am).toLocaleDateString('de-DE') : '–';
  const datumStr   = r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–';
  const heute      = new Date().toLocaleDateString('de-DE');
  const fn         = firma?.firmaname ?? '';
  const adresse    = [fn, firma?.strasse, [firma?.plz, firma?.ort].filter(Boolean).join(' ')].filter(Boolean).join('\n');
  const frist14    = new Date(Date.now() + 14 * 86400000).toLocaleDateString('de-DE');
  const frist7     = new Date(Date.now() +  7 * 86400000).toLocaleDateString('de-DE');
  const header     = adresse ? `${adresse}\n\n${heute}\n\n` : `${heute}\n\n`;

  if (stufe === 0) return (
    `${header}` +
    `Zahlungserinnerung – Rechnung ${r.rechnungsnummer}\n\n` +
    `Sehr geehrte Damen und Herren,\n\n` +
    `vermutlich ist es in Ihrem Geschäftsalltag untergegangen. Wir möchten Sie daher freundlich an ` +
    `die offene Rechnung Nr. ${r.rechnungsnummer} vom ${datumStr} erinnern.\n\n` +
    `Offener Betrag:    ${betrag} €\n` +
    `Fälligkeitsdatum:  ${faelligStr}\n\n` +
    `Wir bitten Sie, den Betrag bis zum ${frist14} auf unser Konto zu überweisen. ` +
    `Sollte sich die Zahlung mit diesem Schreiben gekreuzt haben, betrachten Sie es bitte als gegenstandslos.\n\n` +
    `Mit freundlichen Grüßen\n${fn}`
  );

  if (stufe === 1) return (
    `${header}` +
    `1. Mahnung – Rechnung ${r.rechnungsnummer}\n\n` +
    `Sehr geehrte Damen und Herren,\n\n` +
    `trotz unserer Zahlungserinnerung ist die Rechnung Nr. ${r.rechnungsnummer} über ${betrag} € ` +
    `(fällig am ${faelligStr}) bis heute nicht beglichen worden.\n\n` +
    `Wir fordern Sie auf, den ausstehenden Betrag bis spätestens ${frist14} zu überweisen.\n\n` +
    `Sollte bis dahin kein Zahlungseingang bei uns eingehen, behalten wir uns weitere Maßnahmen vor.\n\n` +
    `Mit freundlichen Grüßen\n${fn}`
  );

  if (stufe === 2) return (
    `${header}` +
    `2. Mahnung – Rechnung ${r.rechnungsnummer}\n\n` +
    `Sehr geehrte Damen und Herren,\n\n` +
    `obwohl wir Sie bereits mit einer Zahlungserinnerung und einer 1. Mahnung auf die offene Rechnung ` +
    `Nr. ${r.rechnungsnummer} über ${betrag} € (fällig am ${faelligStr}) hingewiesen haben, ` +
    `ist bislang kein Zahlungseingang bei uns eingegangen.\n\n` +
    `Wir setzen Ihnen eine letzte Zahlungsfrist bis zum ${frist7}. ` +
    `Sollte bis zu diesem Datum keine Zahlung erfolgen, sehen wir uns gezwungen, ` +
    `einen Rechtsanwalt einzuschalten und gerichtliche Schritte einzuleiten.\n\n` +
    `Mit freundlichen Grüßen\n${fn}`
  );

  return '';
}

async function generatePDF(text, rechnungsnummer, label) {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(text, 175);
  doc.text(lines, 17, 20);
  doc.save(`${label.replace(/[\s.]/g, '_')}_${rechnungsnummer}.pdf`);
}

function MahnungModal({ rechnung, firma, onClose, onSaved }) {
  const stufe = rechnung.mahnstufe ?? 0;
  const label = getMahnLabel(stufe);
  const [text, setText] = useState(() => buildBriefText(rechnung, firma, stufe));
  const [saving, setSaving] = useState(false);

  async function handle(mode) {
    setSaving(true);
    const newStufe = stufe + 1;
    await supabase.from('rechnungen').update({ mahnstufe: newStufe, status: 'mahnung' }).eq('id', rechnung.id);

    if (mode === 'email') {
      const betreff = encodeURIComponent(`${label} – Rechnung ${rechnung.rechnungsnummer}`);
      const body    = encodeURIComponent(text);
      const email   = rechnung.kunden?.email ?? '';
      window.open(`mailto:${email}?subject=${betreff}&body=${body}`, '_blank');
    } else {
      await generatePDF(text, rechnung.rechnungsnummer, label);
    }

    onSaved(rechnung.id, newStufe);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{label}</h2>
            <p className="text-sm text-gray-400">Rechnung {rechnung.rechnungsnummer} · {rechnung.kunden?.name ?? '–'}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mahnstufen-Indikator */}
        <div className="flex items-center gap-2 px-6 pt-4">
          {['Zahlungserinnerung', '1. Mahnung', '2. Mahnung'].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition ${
                i === stufe
                  ? 'bg-orange-50 border-orange-300 text-orange-700'
                  : i < stufe
                  ? 'bg-gray-100 border-gray-200 text-gray-400'
                  : 'bg-white border-gray-200 text-gray-400'
              }`}>
                {i < stufe && (
                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {s}
              </div>
              {i < 2 && <span className="text-gray-300 text-xs">→</span>}
            </div>
          ))}
        </div>

        {/* Brieftext */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <p className="text-xs text-gray-400 mb-2">Brieftext — vor dem Versand anpassen:</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full h-64 border border-gray-200 rounded-xl p-4 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-600 px-3 py-2 transition">
            Abbrechen
          </button>
          <div className="flex-1" />
          <button
            disabled={saving}
            onClick={() => handle('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Als PDF
          </button>
          <button
            disabled={saving}
            onClick={() => handle('email')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Per E-Mail
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Rechnungen() {
  const router = useRouter();
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden]           = useState(true);
  const [firma, setFirma]           = useState(null);
  const [mahnModal, setMahnModal]   = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      const [{ data: rech }, { data: einst }] = await Promise.all([
        supabase.from('rechnungen')
          .select('*, kunden(name, email)')
          .eq('user_id', user.id)
          .order('erstellt_am', { ascending: false }),
        supabase.from('einstellungen')
          .select('firmaname, strasse, plz, ort')
          .eq('user_id', user.id)
          .single(),
      ]);
      setRechnungen(rech ?? []);
      setFirma(einst ?? null);
      setLaden(false);
    }
    load();
  }, []);

  const heute = new Date();
  heute.setHours(0, 0, 0, 0);

  function isOverdue(r) {
    return r.status !== 'bezahlt' && r.faellig_am && new Date(r.faellig_am) < heute;
  }

  function handleMahnungSaved(id, newStufe) {
    setRechnungen(prev =>
      prev.map(r => r.id === id ? { ...r, mahnstufe: newStufe, status: 'mahnung' } : r)
    );
  }

  return (
    <PlanGate feature="rechnungen">
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Rechnungen</h1>
          <Link href="/dashboard/rechnungen/neu"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition text-sm">
            + Neue Rechnung
          </Link>
        </div>

        {laden ? (
          <p className="text-gray-400">Wird geladen...</p>
        ) : rechnungen.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Noch keine Rechnungen</p>
            <p className="text-sm mt-1">Erstelle deine erste Rechnung.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Nummer</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Kunde</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Datum</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Betrag</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rechnungen.map(r => {
                  const cfg     = statusConfig[r.status] ?? statusConfig.entwurf;
                  const overdue = isOverdue(r);
                  const stufe   = r.mahnstufe ?? 0;
                  const mahnLabel = getMahnLabel(stufe);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-mono font-medium text-gray-900 cursor-pointer"
                          onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}>
                        {r.rechnungsnummer}
                      </td>
                      <td className="px-5 py-3 text-gray-500 cursor-pointer"
                          onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}>
                        {r.kunden?.name ?? '–'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 cursor-pointer"
                          onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}>
                        {r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '–'}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900 cursor-pointer"
                          onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}>
                        {brutto(r).toFixed(2).replace('.', ',')} €
                      </td>
                      <td className="px-5 py-3 cursor-pointer"
                          onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>
                            {cfg.label}
                          </span>
                          {overdue && (
                            <span className="text-xs text-red-500 font-medium">überfällig</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        {overdue && mahnLabel && (
                          <button
                            onClick={() => setMahnModal(r)}
                            className="text-xs px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg font-medium hover:bg-orange-100 transition"
                          >
                            {mahnLabel} →
                          </button>
                        )}
                        {overdue && !mahnLabel && (
                          <span className="text-xs text-gray-400 italic">Alle Mahnungen versendet</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {mahnModal && (
          <MahnungModal
            rechnung={mahnModal}
            firma={firma}
            onClose={() => setMahnModal(null)}
            onSaved={handleMahnungSaved}
          />
        )}
      </div>
    </PlanGate>
  );
}
