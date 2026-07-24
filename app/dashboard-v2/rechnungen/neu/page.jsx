'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/lib/supabase';
import PlanGate from '@/components/PlanGate';
import Page from '@/components/ui/v2/Page';
import Button from '@/components/ui/v2/Button';
import Input from '@/components/ui/v2/Input';
import Card from '@/components/ui/v2/Card';

function fmtEuro(n) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

function calcNetto(positionen) {
  return (positionen || []).reduce(
    (s, p) => s + (Number(p.menge) || 0) * (Number(p.preis) || 0),
    0
  );
}

async function genRechnungsnummer(companyId) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const { count } = await supabase
    .from('rechnungen')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);
  const n = String((count || 0) + 1).padStart(4, '0');
  return `RE-${yyyy}${mm}-${n}`;
}

async function loadJsPdf() {
  if (window.jspdf) return;
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });
}

function NeuFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auftragIdParam = searchParams.get('auftrag_id');

  const [laden, setLaden] = useState(true);
  const [speichern, setSpeichern] = useState(false);
  const [pdfLaden, setPdfLaden] = useState(false);
  const [fehler, setFehler] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [kunden, setKunden] = useState([]);

  const [form, setForm] = useState({
    kunde_id: '',
    auftrag_id: auftragIdParam || '',
    datum: new Date().toISOString().slice(0, 10),
    faellig_am: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    leistungsdatum: '',
    steuersatz: 19,
    skonto: '',
    notizen: '',
    bemerkungen: '',
    positionen: [{ beschreibung: '', menge: 1, einheit: 'Stk.', preis: 0 }],
  });

  useEffect(() => { init(); }, []);

  async function init() {
    setLaden(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: member } = await supabase
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (!member?.company_id) { setLaden(false); return; }
    setCompanyId(member.company_id);

    const { data: kundenData } = await supabase
      .from('kunden')
      .select('id, name')
      .eq('company_id', member.company_id)
      .order('name');
    setKunden(kundenData || []);

    // Prefill aus Auftrag
    if (auftragIdParam) {
      const { data: auftrag } = await supabase
        .from('auftraege')
        .select('*, kunden(id, name)')
        .eq('id', auftragIdParam)
        .maybeSingle();
      if (auftrag) {
        const positionen = auftrag.positionen?.length
          ? auftrag.positionen
          : [{ beschreibung: auftrag.titel || 'Dienstleistung', menge: 1, einheit: 'Stk.', preis: 0 }];
        setForm(f => ({
          ...f,
          kunde_id: auftrag.kunde_id || '',
          auftrag_id: auftragIdParam,
          positionen,
        }));
      }
    }

    setLaden(false);
  }

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function setPosField(idx, key, val) {
    setForm(f => {
      const neu = [...f.positionen];
      neu[idx] = { ...neu[idx], [key]: val };
      return { ...f, positionen: neu };
    });
  }

  function addPos() {
    setForm(f => ({
      ...f,
      positionen: [...f.positionen, { beschreibung: '', menge: 1, einheit: 'Stk.', preis: 0 }],
    }));
  }

  function removePos(idx) {
    setForm(f => ({ ...f, positionen: f.positionen.filter((_, i) => i !== idx) }));
  }

  const netto = calcNetto(form.positionen);
  const mwst = netto * (Number(form.steuersatz) || 19) / 100;
  const brutto = netto + mwst;

  async function handleSpeichern(e) {
    e.preventDefault();
    if (!form.kunde_id) { setFehler('Bitte einen Kunden auswählen.'); return; }
    setFehler('');
    setSpeichern(true);
    try {
      const nr = await genRechnungsnummer(companyId);
      const { data, error } = await supabase.from('rechnungen').insert({
        company_id: companyId,
        kunde_id: form.kunde_id,
        auftrag_id: form.auftrag_id || null,
        rechnungsnummer: nr,
        datum: form.datum,
        faellig_am: form.faellig_am,
        leistungsdatum: form.leistungsdatum || null,
        steuersatz: Number(form.steuersatz) || 19,
        skonto: form.skonto ? Number(form.skonto) : null,
        notizen: form.notizen || null,
        bemerkungen: form.bemerkungen || null,
        positionen: form.positionen,
        status: 'entwurf',
      }).select().single();
      if (error) throw error;
      router.push('/dashboard-v2/rechnungen/' + data.id);
    } catch (err) {
      setFehler(err.message || 'Fehler beim Speichern.');
      setSpeichern(false);
    }
  }

  async function handlePdfVorschau() {
    if (!form.kunde_id) { setFehler('Bitte einen Kunden auswählen.'); return; }
    setPdfLaden(true);
    try {
      await loadJsPdf();
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const kunde = kunden.find(k => k.id === form.kunde_id);

      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('RECHNUNG', 14, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Vorschau (Entwurf)', 14, 28);

      doc.setFontSize(11);
      doc.text('An:', 14, 44);
      doc.setFont('helvetica', 'bold');
      doc.text(kunde?.name || '—', 14, 50);
      doc.setFont('helvetica', 'normal');

      doc.text('Datum: ' + form.datum, 130, 44);
      doc.text('Fällig: ' + form.faellig_am, 130, 50);

      const rows = form.positionen.map(p => [
        p.beschreibung || '',
        String(p.menge || 0),
        p.einheit || '',
        fmtEuro(Number(p.preis) || 0),
        fmtEuro((Number(p.menge) || 0) * (Number(p.preis) || 0)),
      ]);

      doc.autoTable({
        startY: 65,
        head: [['Beschreibung', 'Menge', 'Einheit', 'Einzelpreis', 'Gesamt']],
        body: rows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] },
      });

      const finalY = doc.lastAutoTable.finalY + 10;
      doc.text('Netto: ' + fmtEuro(netto), 130, finalY);
      doc.text('MwSt. ' + form.steuersatz + '%: ' + fmtEuro(mwst), 130, finalY + 6);
      doc.setFont('helvetica', 'bold');
      doc.text('Brutto: ' + fmtEuro(brutto), 130, finalY + 14);

      doc.save('rechnung-vorschau.pdf');
    } catch (err) {
      setFehler('PDF-Fehler: ' + err.message);
    }
    setPdfLaden(false);
  }

  if (laden) {
    return (
      <Page>
        <Page.Header><Page.Title>Neue Rechnung</Page.Title></Page.Header>
        <Page.Content>
          <div className="animate-pulse space-y-4">
            <div className="h-48 rounded-xl bg-gray-100" />
            <div className="h-64 rounded-xl bg-gray-100" />
          </div>
        </Page.Content>
      </Page>
    );
  }

  return (
    <PlanGate feature="rechnungen">
      <Page>
        <Page.Header>
          <Page.Title>Neue Rechnung</Page.Title>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => router.back()}>Abbrechen</Button>
            <Button variant="secondary" onClick={handlePdfVorschau} loading={pdfLaden}>
              PDF-Vorschau
            </Button>
            <Button variant="primary" onClick={handleSpeichern} loading={speichern}>
              Speichern
            </Button>
          </div>
        </Page.Header>
        <Page.Content>
          {fehler && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {fehler}
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Linke Spalte — Hauptformular */}
            <div className="lg:col-span-2 space-y-6">
              {/* Kunde & Auftrag */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Empfänger</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kunde *</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.kunde_id}
                      onChange={e => setField('kunde_id', e.target.value)}
                    >
                      <option value="">— Kunde wählen —</option>
                      {kunden.map(k => (
                        <option key={k.id} value={k.id}>{k.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Auftrag-ID (optional)</label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.auftrag_id}
                      onChange={e => setField('auftrag_id', e.target.value)}
                      placeholder="z.B. AUF-123"
                    />
                  </div>
                </div>
              </div>

              {/* Positionen */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Positionen</h2>
                <div className="space-y-3">
                  {/* Header */}
                  <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-1">
                    <div className="col-span-5">Beschreibung</div>
                    <div className="col-span-2 text-center">Menge</div>
                    <div className="col-span-2">Einheit</div>
                    <div className="col-span-2 text-right">Preis</div>
                    <div className="col-span-1"></div>
                  </div>
                  {form.positionen.map((pos, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-12 sm:col-span-5">
                        <input
                          type="text"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Beschreibung"
                          value={pos.beschreibung}
                          onChange={e => setPosField(idx, 'beschreibung', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={pos.menge}
                          onChange={e => setPosField(idx, 'menge', e.target.value)}
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-2">
                        <select
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={pos.einheit}
                          onChange={e => setPosField(idx, 'einheit', e.target.value)}
                        >
                          {['Stk.', 'h', 'm', 'm²', 'm³', 'kg', 'l', 'pauschal'].map(e => (
                            <option key={e} value={e}>{e}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0,00"
                          value={pos.preis}
                          onChange={e => setPosField(idx, 'preis', e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {form.positionen.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePos(idx)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6l-1 14H6L5 6" />
                              <path d="M10 11v6M14 11v6" />
                              <path d="M9 6V4h6v2" />
                            </svg>
                          </button>
                        )}
                      </div>
                      {/* Zeilensumme */}
                      <div className="col-span-12 sm:hidden text-right text-xs text-gray-500">
                        {fmtEuro((Number(pos.menge) || 0) * (Number(pos.preis) || 0))}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addPos}
                  className="mt-4 flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  Position hinzufügen
                </button>
              </div>

              {/* Notizen */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Notizen & Bemerkungen</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interne Notiz</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nur intern sichtbar..."
                      value={form.notizen}
                      onChange={e => setField('notizen', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bemerkungen (auf PDF)</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Erscheint auf der Rechnung..."
                      value={form.bemerkungen}
                      onChange={e => setField('bemerkungen', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rechte Spalte — Einstellungen & Summen */}
            <div className="space-y-6">
              {/* Daten */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Daten</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsdatum</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.datum}
                      onChange={e => setField('datum', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fälligkeitsdatum</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.faellig_am}
                      onChange={e => setField('faellig_am', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Leistungsdatum</label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.leistungsdatum}
                      onChange={e => setField('leistungsdatum', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Steuer */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Steuer & Skonto</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MwSt. (%)</label>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.steuersatz}
                      onChange={e => setField('steuersatz', e.target.value)}
                    >
                      <option value={19}>19% (Standard)</option>
                      <option value={7}>7% (Ermäßigt)</option>
                      <option value={0}>0% (Steuerfrei)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Skonto (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="z.B. 2"
                      value={form.skonto}
                      onChange={e => setField('skonto', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Summen */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">Summe</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Netto</span>
                    <span>{fmtEuro(netto)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>MwSt. {form.steuersatz}%</span>
                    <span>{fmtEuro(mwst)}</span>
                  </div>
                  {form.skonto && Number(form.skonto) > 0 && (
                    <div className="flex justify-between text-green-600 text-xs">
                      <span>Skonto {form.skonto}%</span>
                      <span>- {fmtEuro(netto * Number(form.skonto) / 100)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-300">
                    <span>Brutto</span>
                    <span>{fmtEuro(brutto)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Page.Content>
      </Page>
    </PlanGate>
  );
}

export default function NeuRechnungPage() {
  return (
    <Suspense fallback={
      <Page>
        <Page.Header><Page.Title>Neue Rechnung</Page.Title></Page.Header>
        <Page.Content>
          <div className="animate-pulse space-y-4">
            <div className="h-48 rounded-xl bg-gray-100" />
            <div className="h-64 rounded-xl bg-gray-100" />
          </div>
        </Page.Content>
      </Page>
    }>
      <NeuFormInner />
    </Suspense>
  );
}
