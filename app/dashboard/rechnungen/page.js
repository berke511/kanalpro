'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PlanGate from '@/components/PlanGate';
import { Receipt, Search, X, ExternalLink } from 'lucide-react';
import {
  PageHeader, FilterBar, FilterButton,
  Table, TableRow, TableCell, TableSkeleton, TableCheckbox, TableActions,
  EmptyState, RechnungBadge, PrimaryButton, SecondaryButton,
} from '@/components/ui/KanalProUI';

// Geplante Spalten-Konfiguration (noch nicht funktional â vorbereitet fuer PX-004)
// const COLUMN_CONFIG = [
//   { key: 'nummer',  label: 'Nummer',         sortable: true,  visible: true },
//   { key: 'kunde',   label: 'Kunde',           sortable: true,  visible: true },
//   { key: 'datum',   label: 'Datum',           sortable: true,  visible: true },
//   { key: 'betrag',  label: 'Betrag (brutto)', sortable: true,  visible: true },
//   { key: 'status',  label: 'Status',          sortable: false, visible: true },
// ];

const statusConfig = {
  entwurf:  { label: 'Entwurf',  cls: 'bg-gray-100 text-gray-600'  },
  gesendet: { label: 'Gesendet', cls: 'bg-blue-50 text-blue-700'   },
  bezahlt:  { label: 'Bezahlt',  cls: 'bg-green-50 text-green-700' },
};

const STATUS_FILTER = [
  { key: 'alle',     label: 'Alle'     },
  { key: 'entwurf',  label: 'Entwurf'  },
  { key: 'gesendet', label: 'Gesendet' },
  { key: 'bezahlt',  label: 'Bezahlt'  },
];

const firmaFelder = [
  { section: 'Firmendaten', items: [
    { name: 'firmenname',   label: 'Firmenname',    placeholder: 'Mustermann Rohrreinigung GmbH' },
    { name: 'adresse',      label: 'Adresse',       placeholder: 'Musterstrasse 1, 40000 Duesseldorf' },
    { name: 'telefon',      label: 'Telefon',       placeholder: '0211 123456' },
    { name: 'email',        label: 'E-Mail',        placeholder: 'info@musterfirma.de' },
  ]},
  { section: 'Steuerdaten', items: [
    { name: 'steuernummer', label: 'Steuernummer',  placeholder: '123/456/78901' },
    { name: 'ust_id',       label: 'USt-IdNr.',     placeholder: 'DE123456789' },
  ]},
  { section: 'Bankverbindung', items: [
    { name: 'iban', label: 'IBAN', placeholder: 'DE00 0000 0000 0000 0000 00' },
    { name: 'bic',  label: 'BIC',  placeholder: 'DEUTDEDB' },
    { name: 'bank', label: 'Bank', placeholder: 'Deutsche Bank' },
  ]},
];

export default function Rechnungen() {
  const router = useRouter();
  const [tab, setTab] = useState('liste');
  const [rechnungen, setRechnungen] = useState([]);
  const [laden, setLaden] = useState(true);
  const [statusFilter, setStatusFilter] = useState('alle');
  const [suche, setSuche] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [firma, setFirma] = useState({ firmenname:'', adresse:'', telefon:'', email:'', steuernummer:'', ust_id:'', iban:'', bic:'', bank:'' });
  const [gespeichert, setGespeichert] = useState(false);
  const [fehler, setFehler] = useState('');
  const [keinFirmaFehler, setKeinFirmaFehler] = useState('');

  // Logo
  const [myMember, setMyMember]     = useState(null);
  const [logoUrl, setLogoUrl]       = useState(null);
  const [logoLaden, setLogoLaden]   = useState(false);
  const [logoStatus, setLogoStatus] = useState('');
  const [logoError, setLogoError]   = useState('');
  const logoInputRef                = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: memberData } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      const companyId = memberData?.company_id;

      if (!companyId) {
        setKeinFirmaFehler('Dein Benutzer ist keinem Unternehmen zugeordnet.');
        setLaden(false);
        return;
      }

      const [{ data: rech }, { data: einst }] = await Promise.all([
        supabase.from('rechnungen').select('*, kunden(name)').eq('company_id', companyId).order('erstellt_am', { ascending: false }),
        supabase.from('einstellungen').select('*').eq('company_id', companyId).single(),
      ]);
      setRechnungen(rech ?? []);
      if (einst) setFirma(einst);

      const { data: member } = await supabase
        .from('company_members')
        .select('*, companies(id, logo_url)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      if (member) {
        setMyMember(member);
        setLogoUrl(member.companies?.logo_url ?? null);
      }

      setLaden(false);
    }
    load();
  }, []);

  function brutto(r) {
    const netto = (r.positionen ?? []).reduce((s, p) => s + p.menge * p.preis, 0);
    return netto * (1 + r.steuersatz / 100);
  }

  async function handleFirmaSpeichern(e) {
    e.preventDefault(); setFehler(''); setGespeichert(false);
    const { data: { user } } = await supabase.auth.getUser();
    const companyId = myMember?.company_id;
    const { error } = await supabase.from('einstellungen').upsert(
      { ...firma, user_id: user.id, company_id: companyId },
      { onConflict: 'user_id' }
    );
    if (error) { setFehler('Fehler beim Speichern: ' + error.message); }
    else { setGespeichert(true); setTimeout(() => setGespeichert(false), 3000); }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
    if (!ALLOWED.includes(file.type)) { setLogoError('Nur JPG, PNG, SVG oder WebP erlaubt.'); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError('Datei zu gross (max. 2 MB).'); return; }
    setLogoError(''); setLogoStatus(''); setLogoLaden(true);
    try {
      const companyId = myMember?.company_id;
      if (!companyId) throw new Error('Keine Firma gefunden.');
      const ext = file.type === 'image/svg+xml' ? 'svg' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${companyId}/logo.${ext}`;
      const { error: upErr } = await supabase.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('logos').getPublicUrl(path);
      const newUrl = urlData.publicUrl + '?t=' + Date.now();
      const { error: dbErr } = await supabase.from('companies').update({ logo_url: urlData.publicUrl }).eq('id', companyId);
      if (dbErr) throw dbErr;
      setLogoUrl(newUrl);
      setLogoStatus('Logo erfolgreich gespeichert!');
    } catch (err) {
      setLogoError('Fehler beim Upload: ' + (err.message ?? 'Unbekannt'));
    }
    setLogoLaden(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function handleLogoEntfernen() {
    if (!confirm('Logo wirklich entfernen?')) return;
    setLogoError(''); setLogoStatus(''); setLogoLaden(true);
    try {
      const companyId = myMember?.company_id;
      await supabase.from('companies').update({ logo_url: null }).eq('id', companyId);
      setLogoUrl(null);
      setLogoStatus('Logo entfernt.');
    } catch (err) {
      setLogoError('Fehler beim Entfernen.');
    }
    setLogoLaden(false);
  }

  // Filter-Logik
  const gefiltert = rechnungen.filter(r => {
    if (statusFilter !== 'alle' && r.status !== statusFilter) return false;
    if (suche) {
      const s = suche.toLowerCase();
      const treffer =
        (r.rechnungsnummer ?? '').toLowerCase().includes(s) ||
        (r.kunden?.name ?? '').toLowerCase().includes(s);
      if (!treffer) return false;
    }
    return true;
  });

  // Massenauswahl
  const alleGewaehlt = gefiltert.length > 0 && gefiltert.every(r => selectedIds.has(r.id));
  const teilGewaehlt = gefiltert.some(r => selectedIds.has(r.id)) && !alleGewaehlt;

  function toggleAlle() {
    if (alleGewaehlt) {
      setSelectedIds(prev => { const n = new Set(prev); gefiltert.forEach(r => n.delete(r.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); gefiltert.forEach(r => n.add(r.id)); return n; });
    }
  }

  function toggleEiner(id) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  return (
    <PlanGate feature="rechnungen">
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Rechnungen</h1>
        {tab === 'liste' && (
          <Link href="/dashboard/rechnungen/neu">
      <PrimaryButton>+ Neue Rechnung</PrimaryButton>
    </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {[{ key: 'liste', label: 'Rechnungen' }, { key: 'firmendaten', label: 'Firmendaten' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'liste' && (
        <div className="space-y-4">
          {/* Suchleiste + StatusFilter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative max-w-xs w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={suche}
                onChange={e => setSuche(e.target.value)}
                placeholder="Suchen..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              {suche && (
                <button onClick={() => setSuche('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <FilterBar>
              {STATUS_FILTER.map(f => (
                <FilterButton key={f.key} label={f.label} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)} />
              ))}
            </FilterBar>
          </div>

          {/* Bulk-Action-Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl text-sm">
              <span className="font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} ausgewaehlt</span>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-blue-500 hover:text-blue-700 underline">
                Auswahl aufheben
              </button>
              <div className="ml-auto flex gap-2">
                <SecondaryButton className="text-xs">Exportieren</SecondaryButton>              </div>
            </div>
          )}

          {/* Inhalt */}
          {laden ? (
            <TableSkeleton rows={5} cols={5} />
          ) : keinFirmaFehler ? (
            <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{keinFirmaFehler}</div>
          ) : gefiltert.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <EmptyState
                icon={Receipt}
                title={rechnungen.length === 0 ? 'Noch keine Rechnungen' : 'Keine Rechnungen gefunden'}
                description={rechnungen.length === 0 ? 'Erstelle deine erste Rechnung.' : 'Versuche andere Filter oder Suchbegriffe.'}
                action={rechnungen.length === 0 ? () => router.push('/dashboard/rechnungen/neu') : undefined}
                actionLabel="Neue Rechnung"
              />
            </div>
          ) : (
            <>
              {/* Desktop-Tabelle */}
              <div className="hidden md:block">
                <Table headers={['', 'Nummer', 'Kunde', 'Datum', 'Betrag (brutto)', 'Status', '']}>
                  <tr className="bg-transparent">
                    <td className="pl-3 pr-0 py-1 w-10">
                      <TableCheckbox checked={alleGewaehlt} indeterminate={teilGewaehlt} onChange={toggleAlle} />
                    </td>
                    <td colSpan={6} />
                  </tr>
                  {gefiltert.map(r => {
                    const cfg = statusConfig[r.status] ?? statusConfig.entwurf;
                    const isSelected = selectedIds.has(r.id);
                    return (
                      <TableRow
                        key={r.id}
                        onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}
                        className={isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                      >
                        <TableCell className="pl-3 pr-0 w-10">
                          <div onClick={e => { e.stopPropagation(); toggleEiner(r.id); }}>
                            <TableCheckbox checked={isSelected} onChange={() => toggleEiner(r.id)} />
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-gray-900 dark:text-white">
                          {r.rechnungsnummer}
                        </TableCell>
                        <TableCell>{r.kunden?.name ?? '—'}</TableCell>
                        <TableCell>
                          {r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '—'}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          {brutto(r).toFixed(2).replace('.', ',')} &euro;
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-md text-xs font-medium ${cfg.cls}`}>{cfg.label}</span>
                        </TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <TableActions>
                            <Link href={`/dashboard/rechnungen/${r.id}`} onClick={e => e.stopPropagation()}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition">
                              <ExternalLink size={14} />
                            </Link>
                          </TableActions>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Table>
              </div>

              {/* Mobile Card-Ansicht */}
              <div className="md:hidden space-y-3">
                {gefiltert.map(r => {
                  const cfg = statusConfig[r.status] ?? statusConfig.entwurf;
                  return (
                    <div
                      key={r.id}
                      onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 cursor-pointer hover:border-blue-100 transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-mono font-semibold text-gray-900 dark:text-white">{r.rechnungsnummer}</p>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{r.kunden?.name ?? '—'}</p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs text-gray-400">{r.datum ? new Date(r.datum).toLocaleDateString('de-DE') : '—'}</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {brutto(r).toFixed(2).replace('.', ',')} &euro;
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'firmendaten' && (
        <div className="space-y-5 max-w-xl">
          <form onSubmit={handleFirmaSpeichern} className="space-y-5">
            {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">{fehler}</div>}
            {gespeichert && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg font-medium">Erfolgreich gespeichert!</div>}
            {firmaFelder.map(section => (
              <div key={section.section} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-blue-600">{section.section}</h2>
                {section.items.map(f => (
                  <div key={f.name}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
                    <input type="text" value={firma[f.name] || ''} onChange={e => setFirma({ ...firma, [f.name]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                ))}
              </div>
            ))}
            <div>
              <PrimaryButton type="submit">Firmendaten speichern</PrimaryButton>              <p className="text-xs text-gray-400 mt-3">Diese Daten erscheinen automatisch auf deinen Rechnungs-PDFs.</p>
            </div>
          </form>

          {/* Firmenlogo */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-blue-600 mb-4">Firmenlogo</h2>
            {logoUrl ? (
              <div className="mb-3 flex items-center gap-4">
                <div className="w-28 h-16 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-700 flex items-center justify-center">
                  <img src={logoUrl} alt="Firmenlogo" className="max-w-full max-h-full object-contain p-1" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <PrimaryButton onClick={()=>logoInputRef.current?.click()} disabled={logoLaden}>
                    Logo ersetzen
                  </PrimaryButton>
                  <button type="button" onClick={handleLogoEntfernen} disabled={logoLaden}
                    className="px-3.5 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition">
                    Logo entfernen
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-3">
                <div onClick={() => logoInputRef.current?.click()}
                  className="cursor-pointer w-full border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50/30 transition">
                  <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  </svg>
                  <p className="text-sm text-gray-500 font-medium">Logo hochladen</p>
                  <p className="text-xs text-gray-400">JPG, PNG, SVG oder WebP &middot; max. 2 MB</p>
                </div>
              </div>
            )}
            <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
            {logoLaden && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                Wird hochgeladen...
              </div>
            )}
            {logoStatus && !logoLaden && <p className="text-sm text-green-600">{logoStatus}</p>}
            {logoError && <p className="text-sm text-red-600">{logoError}</p>}
            <p className="text-xs text-gray-400 mt-4">Das Logo erscheint automatisch auf deinen Rechnungs- und Angebots-PDFs.</p>
          </div>
        </div>
      )}
    </div>
    </PlanGate>
  );
}
