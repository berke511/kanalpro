'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import supabase from '@/lib/supabase';
import TabNav from '@/components/ui/TabNav';

/* ════════════════════════════════════════════════════════════════
   KONFIGURATION
════════════════════════════════════════════════════════════════ */

const AUFTRAG_STATUS_CFG = {
  'Neu':           { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  'Geplant':       { bg: 'bg-cyan-50',   text: 'text-cyan-700',   dot: 'bg-cyan-500'   },
  'Notdienst':     { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  'Zugewiesen':    { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  'In Arbeit':     { bg: 'bg-amber-50',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  'Abgeschlossen': { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
  'Storniert':     { bg: 'bg-red-50',    text: 'text-red-600',    dot: 'bg-red-400'    },
  offen:           { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-400' },
  in_bearbeitung:  { bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  abgeschlossen:   { bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500'  },
};

const RECHNUNG_STATUS_CFG = {
  entwurf:  { label: 'Entwurf',  bg: 'bg-gray-100',    text: 'text-gray-600'   },
  gesendet: { label: 'Gesendet', bg: 'bg-blue-50',     text: 'text-blue-700'   },
  bezahlt:  { label: 'Bezahlt',  bg: 'bg-green-50',    text: 'text-green-700'  },
  mahnung:  { label: 'Mahnung',  bg: 'bg-orange-50',   text: 'text-orange-600' },
};

const FOTO_KAT_CFG = {
  vorher:   { label: 'Vorher',   bg: 'bg-blue-100',   text: 'text-blue-700'   },
  nachher:  { label: 'Nachher',  bg: 'bg-green-100',  text: 'text-green-700'  },
  schaden:  { label: 'Schaden',  bg: 'bg-red-100',    text: 'text-red-700'    },
  sonstige: { label: 'Sonstige', bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

/* ════════════════════════════════════════════════════════════════
   HILFSFUNKTIONEN
════════════════════════════════════════════════════════════════ */

function Svg({ d, cls = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
      strokeWidth={1.5} stroke="currentColor" className={cls} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

function fmtDatum(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtBetrag(positionen, steuersatz) {
  if (!Array.isArray(positionen)) return '—';
  const netto = positionen.reduce((s, p) => s + (p.menge ?? 0) * (p.preis ?? 0), 0);
  const brutto = netto * (1 + (steuersatz ?? 19) / 100);
  return brutto.toFixed(2).replace('.', ',') + ' €';
}

function anzeigeName(form) {
  if (!form) return '—';
  return form.kundentyp === 'firma' && form.firmenname ? form.firmenname : (form.name ?? '—');
}

function technikerName(auftrag) {
  const mitarbeiter = auftrag.auftrag_mitarbeiter ?? [];
  if (mitarbeiter.length === 0) return '—';
  return mitarbeiter.map(r => {
    const m = r.mitarbeiter ?? r;
    return [m.vorname, m.nachname].filter(Boolean).join(' ');
  }).join(', ');
}

function statusCfg(status) {
  return AUFTRAG_STATUS_CFG[status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' };
}

/* ════════════════════════════════════════════════════════════════
   UI-ATOME
════════════════════════════════════════════════════════════════ */

function StatusBadge({ status, cfgMap }) {
  const c = (cfgMap ?? AUFTRAG_STATUS_CFG)[status] ?? { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', label: status };
  const label = c.label ?? status;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
    </span>
  );
}

function Karte({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function KarteHeader({ icon, title, badge, action, badgeVariant = 'blue' }) {
  const vars = { blue: 'bg-blue-50 text-blue-500', green: 'bg-green-50 text-green-600', purple: 'bg-purple-50 text-purple-500', amber: 'bg-amber-50 text-amber-600', gray: 'bg-gray-100 text-gray-500' };
  return (
    <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-2.5">
      {icon && (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${vars[badgeVariant] ?? vars.blue}`}>
          <Svg d={icon} cls="w-3.5 h-3.5" />
        </div>
      )}
      <span className="text-sm font-semibold text-gray-900 flex-1">{title}</span>
      {badge !== undefined && (
        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100 font-medium">
          {badge}
        </span>
      )}
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function EmptyState({ icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
        <Svg d={icon} cls="w-5 h-5 text-gray-300" />
      </div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {text && <p className="text-xs text-gray-400">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function inp() {
  return 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white';
}

/* ════════════════════════════════════════════════════════════════
   KUNDENKOPF
════════════════════════════════════════════════════════════════ */

function Kundenkopf({ form, auftraege, rechnungen, objekte }) {
  const name = anzeigeName(form);
  const offeneRechnungen = rechnungen.filter(r => r.status !== 'bezahlt').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Avatar / Initialen */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-md">
          {(name[0] ?? '?').toUpperCase()}
        </div>

        {/* Name + Badges */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{name}</h1>
          {form.kundentyp === 'firma' && form.name && (
            <p className="text-sm text-gray-400 mt-0.5">Ansprechpartner: {form.name}</p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${
              form.kundentyp === 'firma' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600'
            }`}>
              <Svg d={form.kundentyp === 'firma'
                ? 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21'
                : 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'
              } cls="w-3 h-3" />
              {form.kundentyp === 'firma' ? 'Firmenkunde' : 'Privatkunde'}
            </span>
            {form.ist_vertragskunde && (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-50 text-blue-700">Vertrag</span>
            )}
            {form.ist_wartungskunde && (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-50 text-orange-700">Wartung</span>
            )}
            {offeneRechnungen > 0 && (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-50 text-red-600">
                {offeneRechnungen} offene {offeneRechnungen === 1 ? 'Rechnung' : 'Rechnungen'}
              </span>
            )}
          </div>
        </div>

        {/* Kontakt */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {form.telefon && (
            <a href={`tel:${form.telefon}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition">
              <Svg d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" cls="w-3.5 h-3.5 text-gray-400 shrink-0" />
              {form.telefon}
            </a>
          )}
          {form.email && (
            <a href={`mailto:${form.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition">
              <Svg d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" cls="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span className="truncate max-w-[180px]">{form.email}</span>
            </a>
          )}
        </div>
      </div>

      {/* KPI-Leiste */}
      <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-gray-50">
        {[
          { label: 'Aufträge', value: auftraege.length, icon: 'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z', color: 'text-blue-500 bg-blue-50' },
          { label: 'Rechnungen', value: rechnungen.length, icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z', color: 'text-green-500 bg-green-50' },
          { label: 'Einsatzorte', value: objekte.length, icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z', color: 'text-purple-500 bg-purple-50' },
        ].map(k => (
          <div key={k.label} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2 ${k.color}`}>
              <Svg d={k.icon} cls="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB: STAMMDATEN
════════════════════════════════════════════════════════════════ */

function StammdatenTab({ form, handleChange, handleSave, speichern, erfolg, fehler, loeschen, loeschenBestaetigt, handleDelete, setLoeschen, setLoeschenBestaetigt }) {
  return (
    <Karte>
      <KarteHeader icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" title="Stammdaten bearbeiten" badgeVariant="blue" />
      <div className="p-6">
        <form onSubmit={handleSave} className="space-y-5">
          {fehler && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl border border-red-100">{fehler}</div>}
          {erfolg && <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl border border-green-100">Gespeichert</div>}

          {/* Kundentyp */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Kundentyp</label>
            <div className="flex gap-3">
              {[{ value: 'privat', label: 'Privatperson' }, { value: 'firma', label: 'Firmenkunde' }].map(opt => (
                <label key={opt.value} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition ${
                  form.kundentyp === opt.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                  <input type="radio" name="kundentyp" value={opt.value} checked={form.kundentyp === opt.value} onChange={handleChange} className="hidden" />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={form.kundentyp === 'firma' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                {form.kundentyp === 'firma' ? 'Ansprechpartner *' : 'Name *'}
              </label>
              <input type="text" name="name" required value={form.name} onChange={handleChange} className={inp()} />
            </div>
            {form.kundentyp === 'firma' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Firmenname</label>
                <input type="text" name="firmenname" value={form.firmenname} onChange={handleChange} className={inp()} />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Telefon</label>
              <input type="tel" name="telefon" value={form.telefon} onChange={handleChange} className={inp()} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">E-Mail</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} className={inp()} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Adresse (Einsatzort)</label>
            <input type="text" name="adresse" value={form.adresse} onChange={handleChange} className={inp()} />
          </div>

          {/* Rechnungsadresse */}
          <div>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" name="rechnungsadresse_abweichend" checked={form.rechnungsadresse_abweichend} onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">Rechnungsadresse weicht von Einsatzort ab</span>
            </label>
            {form.rechnungsadresse_abweichend && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Rechnungsadresse</p>
                <input type="text" name="rechnung_strasse" value={form.rechnung_strasse} onChange={handleChange}
                  placeholder="Straße und Hausnummer" className={inp()} />
                <div className="grid grid-cols-3 gap-3">
                  <input type="text" name="rechnung_plz" value={form.rechnung_plz} onChange={handleChange}
                    placeholder="PLZ" className={inp()} />
                  <input type="text" name="rechnung_ort" value={form.rechnung_ort} onChange={handleChange}
                    placeholder="Ort" className="col-span-2 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-6 pt-1">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" name="ist_vertragskunde" checked={form.ist_vertragskunde} onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">Vertragskunde</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input type="checkbox" name="ist_wartungskunde" checked={form.ist_wartungskunde} onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              <span className="text-sm font-medium text-gray-700">Wartungskunde</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Notizen</label>
            <textarea name="notizen" value={form.notizen} onChange={handleChange} rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white" />
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-gray-50">
            <button type="submit" disabled={speichern}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-60 text-sm">
              {speichern ? 'Wird gespeichert…' : 'Speichern'}
            </button>
            {!loeschen ? (
              <button type="button" onClick={() => setLoeschen(true)}
                className="ml-auto px-4 py-2.5 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition">
                Löschen
              </button>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">Wirklich löschen?</span>
                <button type="button" onClick={handleDelete}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${loeschenBestaetigt ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                  {loeschenBestaetigt ? 'Endgültig löschen' : 'Ja, löschen'}
                </button>
                <button type="button" onClick={() => { setLoeschen(false); setLoeschenBestaetigt(false); }}
                  className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition">
                  Abbrechen
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB: ANSPRECHPARTNER
════════════════════════════════════════════════════════════════ */

function AnsprechpartnerTab({ form }) {
  const felder = [
    { label: 'Name / Ansprechpartner', value: form.name, icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
    { label: 'Telefon', value: form.telefon, href: form.telefon ? `tel:${form.telefon}` : null, icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z' },
    { label: 'E-Mail', value: form.email, href: form.email ? `mailto:${form.email}` : null, icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
    { label: 'Adresse', value: form.adresse, icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z' },
  ];

  return (
    <Karte>
      <KarteHeader icon="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" title="Ansprechpartner & Kontakt" badgeVariant="purple" />
      <div className="p-6 space-y-4">
        {felder.map(f => (
          <div key={f.label} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
              <Svg d={f.icon} cls="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{f.label}</p>
              {f.value ? (
                f.href ? (
                  <a href={f.href} className="text-sm font-medium text-blue-600 hover:underline">{f.value}</a>
                ) : (
                  <p className="text-sm font-medium text-gray-900">{f.value}</p>
                )
              ) : (
                <p className="text-sm text-gray-300 italic">Nicht angegeben</p>
              )}
            </div>
          </div>
        ))}

        {form.kundentyp === 'firma' && form.rechnungsadresse_abweichend && (
          <div className="mt-2 p-4 rounded-xl border border-blue-100 bg-blue-50">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Rechnungsadresse</p>
            <p className="text-sm text-gray-700">
              {[form.rechnung_strasse, [form.rechnung_plz, form.rechnung_ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}
            </p>
          </div>
        )}

        {form.notizen && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Notizen</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{form.notizen}</p>
          </div>
        )}
      </div>
    </Karte>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB: EINSATZORTE
════════════════════════════════════════════════════════════════ */

function EinsatzorteTab({ kundeId, objekte, setObjekte }) {
  const [neuesObjekt, setNeuesObjekt] = useState({ bezeichnung: '', adresse: '' });
  const [hinzufuegen, setHinzufuegen] = useState(false);

  async function addObjekt() {
    if (!neuesObjekt.bezeichnung.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single();
    const { data } = await supabase.from('objekte').insert({
      bezeichnung: neuesObjekt.bezeichnung,
      adresse: neuesObjekt.adresse || null,
      kunde_id: kundeId,
      user_id: user.id,
      company_id: member?.company_id ?? null,
    }).select().single();
    if (data) {
      setObjekte(prev => [...prev, data]);
      setNeuesObjekt({ bezeichnung: '', adresse: '' });
      setHinzufuegen(false);
    }
  }

  async function deleteObjekt(oid) {
    await supabase.from('objekte').delete().eq('id', oid);
    setObjekte(prev => prev.filter(o => o.id !== oid));
  }

  return (
    <div className="space-y-3">
      {objekte.length === 0 && !hinzufuegen && (
        <EmptyState
          icon="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
          title="Keine Einsatzorte erfasst"
          text="Füge Immobilien oder Einsatzorte dieses Kunden hinzu."
        />
      )}

      {objekte.map(o => (
        <div key={o.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start justify-between group hover:border-blue-200 transition shadow-sm">
          <Link href={`/dashboard/kunden/${kundeId}/objekte/${o.id}`} className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
              <Svg d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" cls="w-4 h-4 text-purple-500" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm group-hover:text-blue-600 transition">{o.bezeichnung}</p>
              {o.adresse && <p className="text-gray-400 text-xs mt-0.5">{o.adresse}</p>}
              <p className="text-xs text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition">Digitaler Zwilling →</p>
            </div>
          </Link>
          <button onClick={() => deleteObjekt(o.id)}
            className="text-gray-300 hover:text-red-500 transition text-xs px-2 py-1 rounded ml-4 shrink-0">
            Entfernen
          </button>
        </div>
      ))}

      {hinzufuegen ? (
        <div className="bg-white rounded-xl border border-blue-100 p-4 space-y-3 shadow-sm">
          <p className="text-sm font-semibold text-gray-700">Neuen Einsatzort hinzufügen</p>
          <input type="text" value={neuesObjekt.bezeichnung}
            onChange={e => setNeuesObjekt(p => ({ ...p, bezeichnung: e.target.value }))}
            placeholder="Bezeichnung (z. B. Betriebsgelände Nord)"
            className={inp()} />
          <input type="text" value={neuesObjekt.adresse}
            onChange={e => setNeuesObjekt(p => ({ ...p, adresse: e.target.value }))}
            placeholder="Adresse (optional)"
            className={inp()} />
          <div className="flex gap-2">
            <button onClick={addObjekt}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
              Hinzufügen
            </button>
            <button onClick={() => { setHinzufuegen(false); setNeuesObjekt({ bezeichnung: '', adresse: '' }); }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition">
              Abbrechen
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setHinzufuegen(true)}
          className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-blue-300 hover:text-blue-600 transition bg-white">
          + Einsatzort hinzufügen
        </button>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB: AUFTRÄGE
════════════════════════════════════════════════════════════════ */

function AuftraegeTab({ auftraege, router }) {
  const [suche, setSuche] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterZeitraum, setFilterZeitraum] = useState('');

  const gefiltert = useMemo(() => {
    let liste = [...auftraege];

    if (suche.trim()) {
      const q = suche.toLowerCase();
      liste = liste.filter(a =>
        (a.nummer ?? '').toLowerCase().includes(q) ||
        (a.typ ?? '').toLowerCase().includes(q) ||
        (a.adresse ?? '').toLowerCase().includes(q) ||
        (a.einsatzort_strasse ?? '').toLowerCase().includes(q) ||
        (a.beschreibung ?? '').toLowerCase().includes(q)
      );
    }

    if (filterStatus) {
      liste = liste.filter(a => a.status === filterStatus);
    }

    if (filterZeitraum) {
      const now = new Date();
      const seit = new Date();
      if (filterZeitraum === '30') seit.setDate(now.getDate() - 30);
      else if (filterZeitraum === '90') seit.setDate(now.getDate() - 90);
      else if (filterZeitraum === '365') seit.setDate(now.getDate() - 365);
      liste = liste.filter(a => {
        const d = a.einsatzdatum ?? a.datum ?? a.created_at;
        return d && new Date(d) >= seit;
      });
    }

    return liste.sort((a, b) => {
      const da = new Date(a.einsatzdatum ?? a.datum ?? a.created_at ?? 0);
      const db = new Date(b.einsatzdatum ?? b.datum ?? b.created_at ?? 0);
      return db - da;
    });
  }, [auftraege, suche, filterStatus, filterZeitraum]);

  const alleStatus = [...new Set(auftraege.map(a => a.status).filter(Boolean))];

  return (
    <div className="space-y-4">
      {/* Such- & Filterleiste */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Svg d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803 7.5 7.5 0 0016.803 15.803z" cls="w-4 h-4 text-gray-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={suche}
            onChange={e => setSuche(e.target.value)}
            placeholder="Auftragsnummer, Auftragsart, Einsatzort…"
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Alle Status</option>
          {alleStatus.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterZeitraum} onChange={e => setFilterZeitraum(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Alle Zeiträume</option>
          <option value="30">Letzte 30 Tage</option>
          <option value="90">Letzte 90 Tage</option>
          <option value="365">Letztes Jahr</option>
        </select>
      </div>

      {gefiltert.length === 0 ? (
        <EmptyState
          icon="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z"
          title={suche || filterStatus || filterZeitraum ? 'Keine Aufträge gefunden' : 'Noch keine Aufträge für diesen Kunden'}
          text={suche || filterStatus || filterZeitraum ? 'Versuche andere Filter.' : ''}
        />
      ) : (
        <Karte>
          <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">{gefiltert.length} {gefiltert.length === 1 ? 'Auftrag' : 'Aufträge'}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Auftrag</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Auftragsart</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Techniker</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gefiltert.map(a => {
                  const cfg = statusCfg(a.status);
                  const einsatzort = [a.einsatzort_strasse, a.einsatzort_ort].filter(Boolean).join(', ') || a.adresse || '';
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => router.push(`/dashboard/auftraege/${a.id}`)}>
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900 text-sm">{a.nummer ?? a.titel ?? `#${a.id?.slice(0, 8)}`}</p>
                        {einsatzort && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{einsatzort}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                        {fmtDatum(a.einsatzdatum ?? a.datum)}
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">
                        {a.typ ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 hidden md:table-cell">
                        <span className="text-xs">{technikerName(a)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {a.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/dashboard/auftraege/${a.id}`); }}
                          className="text-xs px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 border border-gray-100 transition font-medium">
                          Öffnen →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Karte>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB: HISTORIE (Timeline)
════════════════════════════════════════════════════════════════ */

function HistorieTab({ auftraege, rechnungen }) {
  const ereignisse = useMemo(() => {
    const liste = [];

    auftraege.forEach(a => {
      const nummer = a.nummer ?? a.titel ?? `#${a.id?.slice(0, 8)}`;

      if (a.created_at) {
        liste.push({
          datum: a.created_at,
          typ: 'auftrag_erstellt',
          titel: 'Auftrag erstellt',
          beschreibung: a.typ ?? '',
          nummer,
          status: a.status,
          id: a.id,
          icon: 'M12 4.5v15m7.5-7.5h-15',
          color: 'text-blue-600 bg-blue-50 border-blue-100',
        });
      }

      if (a.einsatzdatum && ['Geplant', 'Zugewiesen', 'In Arbeit', 'Abgeschlossen'].includes(a.status)) {
        liste.push({
          datum: a.einsatzdatum,
          typ: 'einsatz_geplant',
          titel: 'Einsatz geplant',
          beschreibung: a.typ ?? '',
          nummer,
          status: a.status,
          id: a.id,
          icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
          color: 'text-cyan-600 bg-cyan-50 border-cyan-100',
        });
      }

      if (['In Arbeit', 'Abgeschlossen'].includes(a.status) && a.einsatzdatum) {
        liste.push({
          datum: a.einsatzdatum + 'T12:00:00',
          typ: 'einsatz_durchgefuehrt',
          titel: 'Einsatz durchgeführt',
          beschreibung: a.typ ?? '',
          nummer,
          status: a.status,
          id: a.id,
          icon: 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z',
          color: 'text-amber-600 bg-amber-50 border-amber-100',
        });
      }

      if (a.status === 'Abgeschlossen') {
        liste.push({
          datum: a.einsatzdatum ? a.einsatzdatum + 'T18:00:00' : a.created_at,
          typ: 'auftrag_abgeschlossen',
          titel: 'Auftrag abgeschlossen',
          beschreibung: a.typ ?? '',
          nummer,
          status: 'Abgeschlossen',
          id: a.id,
          icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          color: 'text-green-600 bg-green-50 border-green-100',
        });
      }
    });

    rechnungen.forEach(r => {
      if (r.datum) {
        liste.push({
          datum: r.datum,
          typ: 'rechnung_erstellt',
          titel: 'Rechnung erstellt',
          beschreibung: r.rechnungsnummer ?? '',
          nummer: r.rechnungsnummer ?? '',
          status: r.status,
          id: r.id,
          rechnungId: r.id,
          icon: 'M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z',
          color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
        });
      }
      if (r.bezahlt_am) {
        liste.push({
          datum: r.bezahlt_am,
          typ: 'rechnung_bezahlt',
          titel: 'Rechnung bezahlt',
          beschreibung: r.rechnungsnummer ?? '',
          nummer: r.rechnungsnummer ?? '',
          status: 'bezahlt',
          id: r.id,
          rechnungId: r.id,
          icon: 'M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        });
      }
    });

    return liste.sort((a, b) => new Date(b.datum) - new Date(a.datum));
  }, [auftraege, rechnungen]);

  if (ereignisse.length === 0) {
    return (
      <EmptyState
        icon="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
        title="Noch keine Historie"
        text="Erstelle Aufträge und Rechnungen, um die Kundenhistorie aufzubauen."
      />
    );
  }

  return (
    <div className="relative">
      {/* Vertikale Timeline-Linie */}
      <div className="absolute left-[22px] top-4 bottom-4 w-px bg-gray-100" />

      <div className="space-y-4">
        {ereignisse.map((e, i) => (
          <div key={`${e.typ}-${e.id}-${i}`} className="relative flex items-start gap-4 pl-1">
            {/* Icon-Kreis */}
            <div className={`relative z-10 w-11 h-11 rounded-full border-2 flex items-center justify-center shrink-0 ${e.color}`}>
              <Svg d={e.icon} cls="w-4 h-4" />
            </div>

            {/* Inhalt */}
            <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-gray-200 transition">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{e.titel}</p>
                  {e.beschreibung && e.beschreibung !== e.nummer && (
                    <p className="text-xs text-gray-500 mt-0.5">{e.beschreibung}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400 whitespace-nowrap">{fmtDatum(e.datum)}</p>
                  {e.status && (
                    <span className={`inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      (AUFTRAG_STATUS_CFG[e.status] ?? RECHNUNG_STATUS_CFG[e.status] ?? { bg: 'bg-gray-50', text: 'text-gray-500' }).bg
                    } ${
                      (AUFTRAG_STATUS_CFG[e.status] ?? RECHNUNG_STATUS_CFG[e.status] ?? { bg: 'bg-gray-50', text: 'text-gray-500' }).text
                    }`}>
                      {(RECHNUNG_STATUS_CFG[e.status] ?? {}).label ?? e.status}
                    </span>
                  )}
                </div>
              </div>
              {e.nummer && (
                <p className="text-[10px] text-gray-400 mt-2 font-mono">
                  {e.rechnungId ? 'Rechnung' : 'Auftrag'}: {e.nummer}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB: RECHNUNGEN
════════════════════════════════════════════════════════════════ */

function RechnungenTab({ rechnungen, router }) {
  const [filterStatus, setFilterStatus] = useState('');
  const heute = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  const gefiltert = useMemo(() => {
    let liste = [...rechnungen];
    if (filterStatus) liste = liste.filter(r => r.status === filterStatus);
    return liste.sort((a, b) => new Date(b.erstellt_am ?? b.datum ?? 0) - new Date(a.erstellt_am ?? a.datum ?? 0));
  }, [rechnungen, filterStatus]);

  const offenBetrag = useMemo(() =>
    rechnungen.filter(r => r.status !== 'bezahlt').reduce((s, r) => {
      const netto = (r.positionen ?? []).reduce((x, p) => x + (p.menge ?? 0) * (p.preis ?? 0), 0);
      return s + netto * (1 + (r.steuersatz ?? 19) / 100);
    }, 0), [rechnungen]);

  if (rechnungen.length === 0) {
    return (
      <EmptyState
        icon="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
        title="Keine Rechnungen"
        text="Noch keine Rechnungen für diesen Kunden vorhanden."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Zusammenfassung */}
      {offenBetrag > 0 && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
            <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-orange-700">Offener Betrag</p>
            <p className="text-xs text-orange-500">{offenBetrag.toFixed(2).replace('.', ',')} € noch nicht bezahlt</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex justify-end">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
          <option value="">Alle Status</option>
          {Object.entries(RECHNUNG_STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      <Karte>
        <div className="px-5 py-3 border-b border-gray-50">
          <span className="text-xs text-gray-400 font-medium">{gefiltert.length} {gefiltert.length === 1 ? 'Rechnung' : 'Rechnungen'}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nummer</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Datum</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Betrag</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {gefiltert.map(r => {
                const cfg = RECHNUNG_STATUS_CFG[r.status] ?? RECHNUNG_STATUS_CFG.entwurf;
                const isOverdue = r.status !== 'bezahlt' && r.faellig_am && new Date(r.faellig_am) < heute;
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => router.push(`/dashboard/rechnungen/${r.id}`)}>
                    <td className="px-5 py-3.5 font-mono font-semibold text-gray-900">
                      {r.rechnungsnummer ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      {fmtDatum(r.datum ?? r.erstellt_am)}
                    </td>
                    <td className="px-5 py-3.5 font-semibold text-gray-900">
                      {fmtBetrag(r.positionen, r.steuersatz)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                          {cfg.label}
                        </span>
                        {isOverdue && <span className="text-xs text-red-500 font-medium">überfällig</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); router.push(`/dashboard/rechnungen/${r.id}`); }}
                        className="text-xs px-3 py-1.5 bg-gray-50 text-gray-500 rounded-lg hover:bg-blue-50 hover:text-blue-600 border border-gray-100 transition font-medium">
                        Öffnen →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Karte>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   TAB: DOKUMENTE (Fotos + Einsatzdokumentation)
════════════════════════════════════════════════════════════════ */

function DokumenteTab({ auftraege, companyId }) {
  const [fotos, setFotos]             = useState([]);
  const [dokumentationen, setDoks]    = useState([]);
  const [laden, setLaden]             = useState(true);
  const [fotoVorschau, setFotoVorschau] = useState(null);
  const [fotoFilter, setFotoFilter]   = useState('');

  useEffect(() => {
    async function load() {
      if (auftraege.length === 0) { setLaden(false); return; }
      const ids = auftraege.map(a => a.id);

      const [{ data: fDaten }, { data: dDaten }] = await Promise.all([
        supabase.from('einsatz_fotos').select('*').in('auftrag_id', ids).order('erstellt_at', { ascending: false }),
        supabase.from('einsatz_dokumentation').select('*').in('auftrag_id', ids),
      ]);

      setFotos(fDaten ?? []);
      setDoks(dDaten ?? []);
      setLaden(false);
    }
    load();
  }, [auftraege]);

  const gefilterteFotos = useMemo(() => {
    if (!fotoFilter) return fotos;
    return fotos.filter(f => f.kategorie === fotoFilter);
  }, [fotos, fotoFilter]);

  // Auftrags-Lookup für Auftragsnummer
  const auftragMap = useMemo(() => {
    const m = {};
    auftraege.forEach(a => { m[a.id] = a; });
    return m;
  }, [auftraege]);

  if (laden) {
    return (
      <div className="flex items-center justify-center py-16">
        <Svg d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" cls="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  const hatDaten = fotos.length > 0 || dokumentationen.length > 0;

  if (!hatDaten) {
    return (
      <EmptyState
        icon="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        title="Noch keine Dokumente"
        text="Fotos und Dokumentationen werden hier angezeigt, sobald Einsätze abgeschlossen sind."
      />
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Einsatzdokumentation ── */}
      {dokumentationen.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Svg d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" cls="w-4 h-4 text-blue-500" />
            Einsatzdokumentation ({dokumentationen.length})
          </h3>
          {dokumentationen.map(dok => {
            const a = auftragMap[dok.auftrag_id];
            const felder = [
              { label: 'Durchgeführte Arbeiten', value: dok.durchgefuehrte_arbeiten },
              { label: 'Schadensbeschreibung', value: dok.schaden_beschreibung },
              { label: 'Maßnahmen', value: dok.massnahmen },
              { label: 'Empfehlungen', value: dok.empfehlungen },
              { label: 'Interne Notizen', value: dok.interne_notizen, intern: true },
            ].filter(f => f.value);

            return (
              <Karte key={dok.id}>
                <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {a ? (a.nummer ?? a.titel ?? `Auftrag ${a.id?.slice(0, 8)}`) : 'Unbekannter Auftrag'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a?.typ ?? ''} {a?.einsatzdatum ? `· ${fmtDatum(a.einsatzdatum)}` : ''}
                    </p>
                  </div>
                  {dok.unterschrift_base64 && (
                    <span className="text-xs px-2 py-1 bg-green-50 text-green-700 rounded-lg font-medium border border-green-100">
                      Unterschrift vorhanden
                    </span>
                  )}
                </div>
                <div className="p-5 space-y-4">
                  {felder.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">Keine Dokumentation erfasst.</p>
                  ) : (
                    felder.map(f => (
                      <div key={f.label} className={`p-3.5 rounded-xl ${f.intern ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
                        <p className={`text-[10px] font-semibold uppercase tracking-wide mb-1.5 ${f.intern ? 'text-amber-600' : 'text-gray-400'}`}>
                          {f.label}{f.intern ? ' (intern)' : ''}
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{f.value}</p>
                      </div>
                    ))
                  )}

                  {/* Arbeitszeiten */}
                  {(dok.arbeit_start || dok.arbeit_ende) && (
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <Svg d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-blue-500 shrink-0" />
                      <div className="text-sm text-blue-700">
                        <span className="font-semibold">Arbeitszeit: </span>
                        {dok.arbeit_start ? new Date(dok.arbeit_start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        {' – '}
                        {dok.arbeit_ende ? new Date(dok.arbeit_ende).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                        {dok.arbeit_start && dok.arbeit_ende && (() => {
                          const min = Math.round((new Date(dok.arbeit_ende) - new Date(dok.arbeit_start)) / 60000);
                          const h = Math.floor(Math.abs(min) / 60);
                          const m = Math.abs(min) % 60;
                          return <span className="text-blue-500 ml-2 text-xs">({h}h {m}min)</span>;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </Karte>
            );
          })}
        </div>
      )}

      {/* ── Fotogalerie ── */}
      {fotos.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Svg d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" cls="w-4 h-4 text-blue-500" />
              Fotos ({fotos.length})
            </h3>
            <select value={fotoFilter} onChange={e => setFotoFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Alle Kategorien</option>
              {Object.entries(FOTO_KAT_CFG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gefilterteFotos.map(foto => {
              const a = auftragMap[foto.auftrag_id];
              const kat = FOTO_KAT_CFG[foto.kategorie] ?? { label: foto.kategorie ?? 'Sonstige', bg: 'bg-gray-100', text: 'text-gray-600' };
              return (
                <div key={foto.id} className="group cursor-pointer" onClick={() => setFotoVorschau(foto)}>
                  <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100 hover:border-blue-200 transition shadow-sm">
                    {foto.url ? (
                      <img
                        src={foto.url}
                        alt={foto.dateiname ?? 'Foto'}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Svg d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" cls="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${kat.bg} ${kat.text}`}>
                        {kat.label}
                      </span>
                    </div>
                  </div>
                  {a && (
                    <p className="text-[10px] text-gray-400 mt-1 truncate px-0.5">
                      {a.nummer ?? a.titel ?? `Auftrag ${a.id?.slice(0, 8)}`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Foto-Vorschau Modal */}
      {fotoVorschau && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setFotoVorschau(null)}>
          <div className="relative max-w-3xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setFotoVorschau(null)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition">
              <Svg d="M6 18L18 6M6 6l12 12" cls="w-4 h-4 text-white" />
            </button>
            {fotoVorschau.url && (
              <img src={fotoVorschau.url} alt={fotoVorschau.dateiname ?? 'Foto'}
                className="w-full max-h-[80vh] object-contain rounded-2xl" />
            )}
            <div className="mt-2 flex items-center gap-2">
              {(() => {
                const kat = FOTO_KAT_CFG[fotoVorschau.kategorie];
                return kat ? (
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${kat.bg} ${kat.text}`}>{kat.label}</span>
                ) : null;
              })()}
              <span className="text-xs text-gray-400">{fmtDatum(fotoVorschau.erstellt_at)}</span>
              {fotoVorschau.dateiname && <span className="text-xs text-gray-400 truncate">{fotoVorschau.dateiname}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   HAUPTKOMPONENTE
════════════════════════════════════════════════════════════════ */

const BERECHTIGTE_ROLLEN = ['inhaber', 'administrator', 'buero', 'disponent'];

const TABS = [
  { key: 'uebersicht',      label: 'Übersicht'       },
  { key: 'stammdaten',      label: 'Stammdaten'      },
  { key: 'ansprechpartner', label: 'Ansprechpartner' },
  { key: 'einsatzorte',     label: 'Einsatzorte'     },
  { key: 'auftraege',       label: 'Aufträge'        },
  { key: 'historie',        label: 'Historie'        },
  { key: 'rechnungen',      label: 'Rechnungen'      },
  { key: 'dokumente',       label: 'Dokumente'       },
];

export default function KundeDetail() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  // Stammdaten
  const [form, setForm] = useState({
    name: '', telefon: '', email: '', adresse: '', notizen: '',
    kundentyp: 'privat', firmenname: '',
    rechnungsadresse_abweichend: false,
    rechnung_strasse: '', rechnung_plz: '', rechnung_ort: '',
    ist_vertragskunde: false, ist_wartungskunde: false,
  });

  // Daten
  const [auftraege, setAuftraege]   = useState([]);
  const [objekte, setObjekte]       = useState([]);
  const [rechnungen, setRechnungen] = useState([]);
  const [companyId, setCompanyId]   = useState(null);

  // UI
  const [tab, setTab]                         = useState('uebersicht');
  const [laden, setLaden]                     = useState(true);
  const [zugriff, setZugriff]                 = useState(true);
  const [speichern, setSpeichern]             = useState(false);
  const [erfolg, setErfolg]                   = useState(false);
  const [fehler, setFehler]                   = useState('');
  const [loeschen, setLoeschen]               = useState(false);
  const [loeschenBestaetigt, setLoeschenBestaetigt] = useState(false);

  const ladeDaten = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id, rolle')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!member) { setZugriff(false); setLaden(false); return; }
      if (!BERECHTIGTE_ROLLEN.includes(member.rolle)) { setZugriff(false); setLaden(false); return; }

      const cId = member.company_id;
      setCompanyId(cId);

      // Parallele Abfragen
      const [
        { data: k },
        { data: a },
        { data: o },
        { data: r },
      ] = await Promise.all([
        supabase.from('kunden').select('*').eq('id', id).single(),
        supabase.from('auftraege')
          .select('*, auftrag_mitarbeiter(mitarbeiter:mitarbeiter_id(vorname, nachname))')
          .eq('kunde_id', id)
          .eq('company_id', cId)
          .order('einsatzdatum', { ascending: false, nullsFirst: false }),
        supabase.from('objekte').select('*').eq('kunde_id', id).order('erstellt_am'),
        supabase.from('rechnungen').select('*').eq('kunde_id', id).order('erstellt_am', { ascending: false }),
      ]);

      if (!k) { router.push('/dashboard/kunden'); return; }

      setForm({
        name:                     k.name                     ?? '',
        telefon:                  k.telefon                  ?? '',
        email:                    k.email                    ?? '',
        adresse:                  k.adresse                  ?? '',
        notizen:                  k.notizen                  ?? '',
        kundentyp:                k.kundentyp                ?? 'privat',
        firmenname:               k.firmenname               ?? '',
        rechnungsadresse_abweichend: k.rechnungsadresse_abweichend ?? false,
        rechnung_strasse:         k.rechnung_strasse         ?? '',
        rechnung_plz:             k.rechnung_plz             ?? '',
        rechnung_ort:             k.rechnung_ort             ?? '',
        ist_vertragskunde:        k.ist_vertragskunde        ?? false,
        ist_wartungskunde:        k.ist_wartungskunde        ?? false,
      });

      setAuftraege(a ?? []);
      setObjekte(o ?? []);
      setRechnungen(r ?? []);
      setLaden(false);
    } catch {
      setLaden(false);
    }
  }, [id, router]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSpeichern(true);
    setFehler('');
    const { error } = await supabase.from('kunden').update({
      name:                     form.name,
      telefon:                  form.telefon  || null,
      email:                    form.email    || null,
      adresse:                  form.adresse  || null,
      notizen:                  form.notizen  || null,
      kundentyp:                form.kundentyp,
      firmenname:               form.kundentyp === 'firma' ? (form.firmenname || null) : null,
      rechnungsadresse_abweichend: form.rechnungsadresse_abweichend,
      rechnung_strasse:         form.rechnungsadresse_abweichend ? (form.rechnung_strasse || null) : null,
      rechnung_plz:             form.rechnungsadresse_abweichend ? (form.rechnung_plz || null) : null,
      rechnung_ort:             form.rechnungsadresse_abweichend ? (form.rechnung_ort || null) : null,
      ist_vertragskunde:        form.ist_vertragskunde,
      ist_wartungskunde:        form.ist_wartungskunde,
    }).eq('id', id);
    if (error) setFehler('Fehler beim Speichern.');
    else { setErfolg(true); setTimeout(() => setErfolg(false), 3000); }
    setSpeichern(false);
  }

  async function handleDelete() {
    if (!loeschenBestaetigt) { setLoeschenBestaetigt(true); return; }
    await supabase.from('kunden').delete().eq('id', id);
    router.push('/dashboard/kunden');
  }

  /* ── Zustände ── */
  if (laden) {
    return (
      <div className="space-y-5 max-w-5xl animate-pulse">
        <div className="h-10 w-48 bg-gray-100 rounded-xl" />
        <div className="h-48 bg-gray-100 rounded-2xl" />
        <div className="h-10 bg-gray-100 rounded-xl w-2/3" />
        <div className="h-64 bg-gray-100 rounded-2xl" />
      </div>
    );
  }

  if (!zugriff) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
          <Svg d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" cls="w-6 h-6 text-red-400" />
        </div>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Kein Zugriff</h2>
        <p className="text-sm text-gray-400 mb-5">Du hast keine Berechtigung, die vollständige Kundenakte einzusehen.</p>
        <button onClick={() => router.push('/dashboard/kunden')}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition">
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  const tabLabel = (key) => {
    if (key === 'einsatzorte') return `Einsatzorte (${objekte.length})`;
    if (key === 'auftraege')   return `Aufträge (${auftraege.length})`;
    if (key === 'rechnungen')  return `Rechnungen (${rechnungen.length})`;
    return TABS.find(t => t.key === key)?.label ?? key;
  };

  return (
    <div className="max-w-5xl pb-10 space-y-0">
      {/* Zurück-Link */}
      <div className="mb-4">
        <Link href="/dashboard/kunden" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition">
          <Svg d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" cls="w-4 h-4" />
          Zurück zur Kundenliste
        </Link>
      </div>

      {/* Kundenkopf */}
      <Kundenkopf
        form={form}
        auftraege={auftraege}
        rechnungen={rechnungen}
        objekte={objekte}
      />

      {/* Tab-Leiste */}
      <TabNav
        id="kunden-tabs"
        tabs={TABS.map(t => ({ id: t.key, label: tabLabel(t.key) }))}
        activeTab={tab}
        onChange={setTab}
        className="mb-5"
      />

      {/* Tab-Inhalte */}
      {tab === 'uebersicht' && (
        <div className="space-y-5">
          {/* ── Kunden-Zusammenfassung ── */}
          <Karte>
            <KarteHeader icon="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" title="Kunden-Zusammenfassung" badgeVariant="blue" />
            <div className="px-5 py-5 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${form.kundentyp === 'firma' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-600'}`}>
                  <Svg d={form.kundentyp === 'firma' ? 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' : 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z'} cls="w-3 h-3" />
                  {form.kundentyp === 'firma' ? 'Firmenkunde' : 'Privatkunde'}
                </span>
                {form.ist_vertragskunde && <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-50 text-blue-700">Vertragskunde</span>}
                {form.ist_wartungskunde && <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-50 text-orange-700">Wartungskunde</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Name / Ansprechpartner', value: form.name, icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
                  (form.kundentyp === 'firma' && form.firmenname) ? { label: 'Firmenname', value: form.firmenname, icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21' } : null,
                  form.telefon ? { label: 'Telefon', value: form.telefon, href: `tel:${form.telefon}`, icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z' } : null,
                  form.email ? { label: 'E-Mail', value: form.email, href: `mailto:${form.email}`, icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' } : null,
                  form.adresse ? { label: 'Adresse', value: form.adresse, icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z' } : null,
                ].filter(Boolean).map(f => (
                  <div key={f.label} className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                      <Svg d={f.icon} cls="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{f.label}</p>
                      {f.href ? (
                        <a href={f.href} className="text-sm font-medium text-blue-600 hover:underline truncate block">{f.value}</a>
                      ) : (
                        <p className="text-sm font-medium text-gray-900">{f.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {form.rechnungsadresse_abweichend && (form.rechnung_strasse || form.rechnung_plz || form.rechnung_ort) && (
                <div className="p-4 rounded-xl border border-blue-100 bg-blue-50">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1.5">Rechnungsadresse</p>
                  <p className="text-sm text-gray-700">
                    {[form.rechnung_strasse, [form.rechnung_plz, form.rechnung_ort].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              )}
              {form.notizen && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1.5">Notizen</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{form.notizen}</p>
                </div>
              )}
            </div>
          </Karte>

          {/* ── Nächster Schritt ── */}
          {(() => {
            const hatOffeneRechnungen = rechnungen.some(r => r.status !== 'bezahlt');
            let step = null;
            if (!form.telefon && !form.email) {
              step = { title: 'Kontaktdaten ergänzen', btnLabel: 'Stammdaten bearbeiten', onBtn: () => setTab('stammdaten') };
            } else if (auftraege.length === 0) {
              step = { title: 'Ersten Auftrag anlegen', btnLabel: 'Auftrag erstellen', onBtn: () => router.push(`/dashboard/auftraege/neu?kunde=${id}`) };
            } else if (hatOffeneRechnungen) {
              step = { title: 'Offene Rechnungen prüfen', btnLabel: 'Rechnungen öffnen', onBtn: () => setTab('rechnungen') };
            }
            return (
              <Karte>
                <KarteHeader icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" title="Nächster Schritt" badgeVariant={step ? 'blue' : 'green'} />
                <div className="px-5 py-5">
                  {step ? (
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                          <Svg d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" cls="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                      </div>
                      <button onClick={step.onBtn} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition shrink-0">
                        {step.btnLabel}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                        <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">Kundenakte vollständig</p>
                        <p className="text-sm text-gray-400 mt-0.5">Für diesen Kunden sind aktuell keine nächsten Schritte erforderlich.</p>
                      </div>
                    </div>
                  )}
                </div>
              </Karte>
            );
          })()}

          {/* ── Warnhinweise ── */}
          {(() => {
            const warnungen = [];
            if (!form.telefon) warnungen.push('Telefonnummer fehlt.');
            if (!form.email) warnungen.push('E-Mail-Adresse fehlt.');
            if (objekte.length === 0) warnungen.push('Keine Einsatzorte vorhanden.');
            if (rechnungen.some(r => r.status !== 'bezahlt')) warnungen.push('Offene Rechnungen vorhanden.');
            if (auftraege.length === 0) warnungen.push('Kunde hat noch keinen Auftrag.');
            return (
              <Karte>
                <KarteHeader icon="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" title="Warnhinweise" badgeVariant={warnungen.length > 0 ? 'amber' : 'green'} />
                <div className="px-5 py-5">
                  {warnungen.length === 0 ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                        <Svg d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" cls="w-4 h-4 text-green-500" />
                      </div>
                      <p className="text-sm text-gray-500">Keine offenen Warnhinweise</p>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {warnungen.map((w, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                            <Svg d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" cls="w-3 h-3 text-amber-500" />
                          </div>
                          <p className="text-sm text-gray-700">{w}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Karte>
            );
          })()}


          {/* ── Kunden-Kennzahlen ── */}
          {(() => {
            const auftraegeGesamt = auftraege.length;
            const auftraegeAbgeschlossen = auftraege.filter(a => a.status === 'Abgeschlossen').length;
            const rechnungenGesamt = rechnungen.length;
            const offenerBetrag = rechnungen
              .filter(r => r.status !== 'bezahlt')
              .reduce((sum, r) => {
                if (!Array.isArray(r.positionen)) return sum;
                const netto = r.positionen.reduce((s, p) => s + (p.menge ?? 0) * (p.preis ?? 0), 0);
                return sum + netto * (1 + ((r.steuersatz ?? 19) / 100));
              }, 0);
            const einsatzorte = objekte.length;
            const kennzahlen = [
              { label: 'Aufträge gesamt',  value: String(auftraegeGesamt) },
              { label: 'Abgeschlossen',    value: String(auftraegeAbgeschlossen) },
              { label: 'Rechnungen gesamt', value: String(rechnungenGesamt) },
              { label: 'Offener Betrag',   value: offenerBetrag.toFixed(2).replace('.', ',') + ' €', small: true },
              { label: 'Einsatzorte',      value: String(einsatzorte) },
            ];
            return (
              <Karte>
                <KarteHeader icon="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" title="Kunden-Kennzahlen" badgeVariant="blue" />
                <div className="px-5 py-5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {kennzahlen.map(k => (
                      <div key={k.label} className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 border border-gray-100 text-center">
                        <span className={`font-bold text-gray-800 ${k.small ? 'text-base' : 'text-2xl'}`}>{k.value}</span>
                        <span className="text-xs text-gray-500 mt-1">{k.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Karte>
            );
          })()}
        </div>
      )}
      {tab === 'stammdaten' && (
        <StammdatenTab
          form={form}
          handleChange={handleChange}
          handleSave={handleSave}
          speichern={speichern}
          erfolg={erfolg}
          fehler={fehler}
          loeschen={loeschen}
          loeschenBestaetigt={loeschenBestaetigt}
          handleDelete={handleDelete}
          setLoeschen={setLoeschen}
          setLoeschenBestaetigt={setLoeschenBestaetigt}
        />
      )}

      {tab === 'ansprechpartner' && (
        <AnsprechpartnerTab form={form} />
      )}

      {tab === 'einsatzorte' && (
        <EinsatzorteTab
          kundeId={id}
          objekte={objekte}
          setObjekte={setObjekte}
        />
      )}

      {tab === 'auftraege' && (
        <AuftraegeTab auftraege={auftraege} router={router} />
      )}

      {tab === 'historie' && (
        <HistorieTab auftraege={auftraege} rechnungen={rechnungen} />
      )}

      {tab === 'rechnungen' && (
        <RechnungenTab rechnungen={rechnungen} router={router} />
      )}

      {tab === 'dokumente' && (
        <DokumenteTab auftraege={auftraege} companyId={companyId} />
      )}
    </div>
  );
}
