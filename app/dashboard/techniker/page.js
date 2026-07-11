'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import {
  Clock, MapPin, Phone, FileText, CheckCircle,
  AlertTriangle, ChevronRight, Truck, User, RefreshCw, Calendar,
} from 'lucide-react';

/* âââ Hilfsfunktionen ââââââââââââââââââââââââââââââââââââââââââ */

function heute() {
  return new Date().toISOString().split('T')[0];
}

function fmtUhrzeit(t) {
  if (!t) return 'â';
  return String(t).slice(0, 5);
}

function buildMapsUrl(adresse) {
  if (!adresse) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
}

/* âââ Farb-Konfiguration âââââââââââââââââââââââââââââââââââââââ */

const PRIO = {
  notfall: { label: 'Notfall', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
  hoch:    { label: 'Hoch',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  normal:  { label: 'Normal',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  niedrig: { label: 'Niedrig', cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
};

const STAT = {
  offen:          { label: 'Offen',          cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' },
  in_bearbeitung: { label: 'In Bearbeitung', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  abgeschlossen:  { label: 'Abgeschlossen',  cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
};

/* âââ KPI-Karte ââââââââââââââââââââââââââââââââââââââââââââââââ */

function KpiKarte({ label, wert, icon: Icon, farbe, laden }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${farbe}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">
          {laden
            ? <span className="inline-block w-7 h-6 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            : wert}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">{label}</div>
      </div>
    </div>
  );
}

/* âââ Einsatz-Karte ââââââââââââââââââââââââââââââââââââââââââââ */

function EinsatzKarte({ auftrag, hatNaechsten, onNaechster }) {
  const router = useRouter();

  const prio      = PRIO[auftrag.prioritaet?.toLowerCase()] ?? PRIO.normal;
  const stat      = STAT[auftrag.status] ?? STAT.offen;
  const kunde     = auftrag.kunden;
  const einsatzort = auftrag.adresse ?? kunde?.adresse ?? '';
  const telefon   = kunde?.telefon ?? '';
  const mapsUrl   = buildMapsUrl(einsatzort);
  const abgeschl  = auftrag.status === 'abgeschlossen';

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 overflow-hidden
      ${abgeschl ? 'border-green-100 dark:border-green-900/40 opacity-80' : 'border-gray-100 shadow-sm'}`}>

      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-gray-100 shrink-0">
            <Clock size={14} className="text-gray-400 shrink-0" />
            {fmtUhrzeit(auftrag.uhrzeit)}
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${prio.cls}`}>
            {prio.label}
          </span>
          {auftrag.notdienst && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-600 text-white">
              Notdienst
            </span>
          )}
        </div>
        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${stat.cls}`}>
          {stat.label}
        </span>
      </div>

      {/* Kundeninfo */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <User size={13} className="text-gray-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {kunde?.name ?? 'â'}
          </span>
        </div>
        {(auftrag.titel || auftrag.beschreibung) && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 ml-5">
            {auftrag.titel || auftrag.beschreibung}
          </p>
        )}
        {einsatzort && (
          <div className="flex items-start gap-1.5 ml-0.5">
            <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
            <span className="text-sm text-gray-500 dark:text-gray-400">{einsatzort}</span>
          </div>
        )}
      </div>

      {/* Aktions-Buttons: Auftrag + Einsatzbericht */}
      <div className="border-t border-gray-50 dark:border-gray-800 grid grid-cols-2 divide-x divide-gray-50 dark:divide-gray-800">
        <button
          onClick={() => router.push(`/dashboard/auftraege/${auftrag.id}`)}
          className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition min-h-[44px]">
          <FileText size={15} />
          Auftrag
        </button>
        <button
          onClick={() => router.push(`/dashboard/auftraege/einsatzbericht?id=${auftrag.id}`)}
          className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition min-h-[44px]">
          <FileText size={15} />
          Einsatzbericht
        </button>
      </div>

      {/* Aktions-Buttons: Navigation + Anrufen */}
      {(mapsUrl || telefon) && (
        <div className={`border-t border-gray-50 dark:border-gray-800 grid divide-x divide-gray-50 dark:divide-gray-800
          ${mapsUrl && telefon ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition min-h-[44px]">
              <MapPin size={15} />
              Navigation
            </a>
          )}
          {telefon && (
            <a
              href={`tel:${telefon}`}
              className="flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition min-h-[44px]">
              <Phone size={15} />
              Anrufen
            </a>
          )}
        </div>
      )}

      {/* NÃ¤chster Einsatz Button */}
      {abgeschl && hatNaechsten && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-4 py-3">
          <button
            onClick={onNaechster}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition min-h-[44px]">
            <ChevronRight size={16} />
            NÃ¤chsten Einsatz Ã¶ffnen
          </button>
        </div>
      )}
    </div>
  );
}

/* âââ Lade-Skeleton ââââââââââââââââââââââââââââââââââââââââââââ */

function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 animate-pulse">
          <div className="flex gap-2 mb-3">
            <div className="h-5 w-10 bg-gray-100 dark:bg-gray-800 rounded-full" />
            <div className="h-5 w-16 bg-gray-100 dark:bg-gray-800 rounded-full" />
          </div>
          <div className="h-4 w-2/3 bg-gray-100 dark:bg-gray-800 rounded mb-2" />
          <div className="h-4 w-1/2 bg-gray-100 dark:bg-gray-800 rounded" />
        </div>
      ))}
    </div>
  );
}

/* âââ Hauptseite âââââââââââââââââââââââââââââââââââââââââââââââ */

export default function TechnikerDashboard() {
  const router = useRouter();
  const [laden, setLaden]       = useState(true);
  const [fehler, setFehler]     = useState('');
  const [vorname, setVorname]   = useState('');
  const [auftraege, setAuftraege] = useState([]);

  const ladeDaten = useCallback(async () => {
    setLaden(true);
    setFehler('');
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !user) { router.push('/login'); return; }

      const { data: member } = await supabase
        .from('company_members')
        .select('company_id, vorname, nachname')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!member) {
        setFehler('Kein aktiver Firmenzugang gefunden.');
        setLaden(false);
        return;
      }

      setVorname(member.vorname ?? '');

      const { data, error } = await supabase
        .from('auftraege')
        .select('id, titel, beschreibung, status, datum, uhrzeit, prioritaet, notdienst, adresse, kunden(name, telefon, adresse)')
        .eq('techniker_id', user.id)
        .eq('datum', heute())
        .eq('company_id', member.company_id)
        .order('uhrzeit', { ascending: true, nullsFirst: false });

      if (error) throw error;
      setAuftraege(data ?? []);
    } catch (e) {
      setFehler(e.message ?? 'Fehler beim Laden der Daten');
    }
    setLaden(false);
  }, [router]);

  useEffect(() => { ladeDaten(); }, [ladeDaten]);

  /* KPI-Werte */
  const gesamt     = auftraege.length;
  const offen      = auftraege.filter(a => a.status === 'offen' || a.status === 'in_bearbeitung').length;
  const abgeschl   = auftraege.filter(a => a.status === 'abgeschlossen').length;
  const notdienste = auftraege.filter(a => a.notdienst === true || a.prioritaet === 'notfall').length;

  /* NÃ¤chsten offenen Einsatz Ã¶ffnen */
  function oeffneNaechsten(vonIdx) {
    for (let i = vonIdx + 1; i < auftraege.length; i++) {
      if (auftraege[i].status !== 'abgeschlossen') {
        router.push(`/dashboard/auftraege/${auftraege[i].id}`);
        return;
      }
    }
  }

  const datumText = new Date().toLocaleDateString('de-DE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-12">

      {/* Sticky Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-5 pb-4 sticky top-0 z-20">
        <div className="max-w-xl mx-auto flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mb-1">
              <Calendar size={11} />
              <span>{datumText}</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {vorname ? `Hallo, ${vorname}` : 'Mein heutiger Tag'}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {laden
                ? 'Wird geladenâ¦'
                : gesamt === 0
                  ? 'Keine EinsÃ¤tze heute geplant'
                  : `${gesamt} Einsatz${gesamt !== 1 ? 'Ã¤tze' : ''} heute`}
            </p>
          </div>
          <button
            onClick={ladeDaten}
            aria-label="Aktualisieren"
            className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0">
            <RefreshCw size={16} className={laden ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5 space-y-5">

        {/* Fehlermeldung */}
        {fehler && (
          <div className="flex items-start gap-2.5 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>{fehler}</span>
          </div>
        )}

        {/* KPI-Karten */}
        <div className="grid grid-cols-2 gap-3">
          <KpiKarte
            label="EinsÃ¤tze heute"
            wert={gesamt}
            icon={Truck}
            farbe="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
            laden={laden}
          />
          <KpiKarte
            label="Noch offen"
            wert={offen}
            icon={Clock}
            farbe="bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400"
            laden={laden}
          />
          <KpiKarte
            label="Abgeschlossen"
            wert={abgeschl}
            icon={CheckCircle}
            farbe="bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            laden={laden}
          />
          <KpiKarte
            label="Notdienste"
            wert={notdienste}
            icon={AlertTriangle}
            farbe="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
            laden={laden}
          />
        </div>

        {/* Lade-Skeleton */}
        {laden && <Skeleton />}

        {/* Leer-Zustand */}
        {!laden && !fehler && gesamt === 0 && (
          <div className="text-center py-16">
            <Truck size={40} className="mx-auto mb-3 text-gray-200 dark:text-gray-700" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">Keine EinsÃ¤tze heute</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Dir wurden heute keine AuftrÃ¤ge zugewiesen.
            </p>
          </div>
        )}

        {/* Einsatzliste */}
        {!laden && gesamt > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Tagesplan
            </h2>
            {auftraege.map((a, idx) => {
              const hatNaechsten =
                a.status === 'abgeschlossen' &&
                auftraege.slice(idx + 1).some(n => n.status !== 'abgeschlossen');
              return (
                <EinsatzKarte
                  key={a.id}
                  auftrag={a}
                  hatNaechsten={hatNaechsten}
                  onNaechster={() => oeffneNaechsten(idx)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
