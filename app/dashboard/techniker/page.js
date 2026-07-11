'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import {
  Clock, MapPin, Phone, FileText, CheckCircle,
  AlertTriangle, ChevronRight, Truck, User, RefreshCw, Calendar,
} from 'lucide-react';
import { KpiCard, StatusBadge, PrioritaetBadge, NotdienstBadge, EmptyState } from '@/components/ui/KanalProUI';

// ── Hilfsfunktionen ──────────────────────────────────────────────────────────

function heute() {
  return new Date().toISOString().split('T')[0];
}

function fmtUhrzeit(t) {
  if (!t) return '—';
  return String(t).slice(0, 5);
}

function buildMapsUrl(adresse) {
  if (!adresse) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(adresse)}`;
}

// ── Einsatz-Karte ─────────────────────────────────────────────────────────────

function EinsatzKarte({ auftrag, hatNaechsten, onNaechster }) {
  const router = useRouter();

  const kunde = auftrag.kunden;
  const einsatzort = auftrag.adresse ?? kunde?.adresse ?? '';
  const telefon = kunde?.telefon ?? '';
  const mapsUrl = buildMapsUrl(einsatzort);
  const abgeschl = auftrag.status === 'abgeschlossen';

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
          <PrioritaetBadge prioritaet={auftrag.prioritaet?.toLowerCase()} />
          {auftrag.notdienst && <NotdienstBadge />}
        </div>
        <StatusBadge status={auftrag.status} />
      </div>

      {/* Kundeninfo */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center gap-2">
          <User size={13} className="text-gray-400 shrink-0" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {kunde?.name ?? '—'}
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

      {/* Nächster Einsatz Button */}
      {abgeschl && hatNaechsten && (
        <div className="border-t border-gray-50 dark:border-gray-800 px-4 py-3">
          <button
            onClick={onNaechster}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition min-h-[44px]">
            <ChevronRight size={16} />
            Nächsten Einsatz öffnen
          </button>
        </div>
      )}
    </div>
  );
}

// ── Lade-Skeleton ─────────────────────────────────────────────────────────────

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

// ── Hauptseite ────────────────────────────────────────────────────────────────

export default function TechnikerDashboard() {
  const router = useRouter();
  const [laden, setLaden] = useState(true);
  const [fehler, setFehler] = useState('');
  const [vorname, setVorname] = useState('');
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

  // KPI-Werte
  const gesamt   = auftraege.length;
  const offen    = auftraege.filter(a => a.status === 'offen' || a.status === 'in_bearbeitung').length;
  const abgeschl = auftraege.filter(a => a.status === 'abgeschlossen').length;
  const notdienste = auftraege.filter(a => a.notdienst === true || a.prioritaet === 'notfall').length;

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
                ? 'Wird geladen…'
                : gesamt === 0
                  ? 'Keine Einsätze heute geplant'
                  : `${gesamt} Einsatz${gesamt !== 1 ? 'ätze' : ''} heute`}
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

        {/* KPI-Karten — Design System KpiCard */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Einsätze heute"  value={gesamt}    icon={Truck}          color="blue"   loading={laden} />
          <KpiCard label="Noch offen"      value={offen}     icon={Clock}          color="yellow" loading={laden} />
          <KpiCard label="Abgeschlossen"   value={abgeschl}  icon={CheckCircle}    color="green"  loading={laden} />
          <KpiCard label="Notdienste"      value={notdienste} icon={AlertTriangle} color="red"    loading={laden} />
        </div>

        {/* Lade-Skeleton */}
        {laden && <Skeleton />}

        {/* Leer-Zustand */}
        {!laden && !fehler && gesamt === 0 && (
          <EmptyState
            icon={Truck}
            title="Keine Einsätze heute"
            description="Dir wurden heute keine Aufträge zugewiesen."
          />
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
